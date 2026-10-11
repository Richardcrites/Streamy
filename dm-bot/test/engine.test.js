import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-test-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;

const store = await import("../src/store.js");
const { ORIGINS, CAREERS, CAMPAIGN_GOALS } = await import("../src/lore/data.js");
const story = await import("../src/engine/story.js");
const { commands } = await import("../src/commands.js");

const unfilled = (s) => /\{[A-Za-z0-9_']+\}/.test(s);

test("name suggestions fit every origin", () => {
  for (const id of Object.keys(ORIGINS)) {
    const names = story.suggestNames(id, 6);
    assert.equal(names.length, 6, id);
    for (const n of names) assert.ok(n.length <= 80, n);
  }
});

test("every origin x career x pronoun builds a complete character", () => {
  const g = store.guild("t1");
  for (const originId of Object.keys(ORIGINS)) {
    for (const career of Object.keys(CAREERS)) {
      for (const pronouns of ["she", "he", "they"]) {
        const c = story.buildCharacter(g, { ownerId: "u", originId, career, name: "Test Pilot", pronouns, seed: "I fly." });
        assert.equal(c.hooks.length, 2);
        for (const p of [...c.story, ...c.hooks.map((h) => h.text)]) {
          assert.ok(!unfilled(p), `${originId}: ${p}`);
          // Catch pronoun/verb agreement slips like "he fly" or "she haven't".
          assert.ok(!/\b(he|she|He|She) (fly|have|haven't|are|were|do|don't|keep|work|remember)\b/.test(p), `${originId}/${pronouns}: ${p}`);
          assert.ok(!/\b(they|They) (flies|has|hasn't|is|was|does|keeps|works)\b/.test(p), `${originId}/${pronouns}: ${p}`);
        }
        // The full name appears once; after that the story uses the short name.
        assert.equal(c.story.join(" ").split("Test Pilot").length - 1, 1, originId);
      }
    }
  }
});

test("a solo campaign runs all acts to a finale and resolves the hook", () => {
  const g = store.guild("t2");
  for (const goalId of Object.keys(CAMPAIGN_GOALS)) {
    const c = story.buildCharacter(g, { ownerId: "u", originId: "levski_born", career: "hauler", name: "Ilia Dragan", pronouns: "they" });
    g.characters[c.id] = c;
    const camp = story.buildCampaign(g, { goalId, characters: [c], ownerId: "u", scope: "solo" });
    assert.ok(!unfilled(camp.title) && !unfilled(camp.endGoal), camp.title);
    for (let i = 0; i < camp.acts.length; i++) {
      const ch = story.buildChapter(g, camp, [c]);
      assert.equal(ch.objectives.length, 1);
      assert.equal(ch.choices.length, 3);
      for (const s of [ch.transmission.text, ch.briefing, ch.rpPrompt, ...ch.objectives.map((o) => o.text), ...ch.choices.map((x) => x.outcome)]) {
        assert.ok(!unfilled(s), `${goalId} act ${i}: ${s}`);
      }
      camp.chapters.push(ch);
      camp.tones.push(["honor", "pragmatic", "ruthless"][i % 3]);
      camp.actIndex++;
    }
    const fin = story.buildFinale(g, camp);
    assert.ok(fin.awardTitle && !unfilled(fin.text) && !unfilled(fin.setup), fin.text);
  }
});

test("org campaigns give each crew member their own objective", () => {
  const g = store.guild("t3");
  const crew = ["pilot", "miner", "medic"].map((career, i) =>
    story.buildCharacter(g, { ownerId: `u${i}`, originId: "pyro_outlaw", career, name: `Crew ${i}`, pronouns: "he" }));
  const camp = story.buildCampaign(g, { goalId: "rise", characters: crew, ownerId: "u0", scope: "org", orgId: "o" });
  const ch = story.buildChapter(g, camp, crew);
  assert.deepEqual(ch.objectives.map((o) => o.characterName), ["Crew 0", "Crew 1", "Crew 2"]);
});

test("short names use callsign or first name", () => {
  assert.equal(story.shortName('Rook "Flare" Vance'), "Flare");
  assert.equal(story.shortName("RJ Oressian"), "RJ");
  assert.equal(story.shortName("Kehl'Varo of House Vael"), "Kehl'Varo");
});

test("crossovers find links between characters", () => {
  const g = store.guild("t4");
  const a = story.buildCharacter(g, { ownerId: "a", originId: "tevarin", career: "pilot", name: "Kehl'Varo of House Vael", pronouns: "she" });
  const b = story.buildCharacter(g, { ownerId: "b", originId: "banu_trader", career: "smuggler", name: "Soren Dray", pronouns: "he" });
  for (let i = 0; i < 50; i++) {
    const y = story.buildCrossover(g, a, b);
    for (const o of y.objectives) assert.ok(!unfilled(o.text), o.text);
  }
  const x = story.buildCrossover(g, a, b);
  assert.ok(x.links.length > 0, "both are hostile to XenoThreat");
  assert.equal(x.objectives.length, 2);
  assert.ok(!unfilled(x.text));
});

test("slash command definitions build", () => {
  assert.ok(commands.length >= 9);
  for (const c of commands) assert.match(c.name, /^[a-z-]{1,32}$/);
});


test("missions: objectives for everyone, crossings, rules, no scripted scenes, no unfilled text", async () => {
  const { MISSION_TYPES } = await import("../src/lore/data.js");
  const g = store.guild("t5");
  const crew = ["smuggler", "pilot"].map((career, i) => {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: i ? "navy_veteran" : "pyro_outlaw", career, name: i ? "Mara Calder" : "RJ Oressian", pronouns: "they" });
    g.characters[c.id] = c;
    return c;
  });
  for (const type of Array(15).fill([...Object.keys(MISSION_TYPES), undefined]).flat()) {
    const m = story.buildMission(g, crew, type);
    assert.equal(m.objectives.length, 2);
    assert.ok(m.crossings.length >= 1, "the crew's stories must cross");
    assert.ok(m.rules.length >= 2);
    assert.match(m.anchor.contract, /\*\*(Mercenary|Investigation|Bounty Hunter|Search|ECN|Hauling|Delivery)\*\*|salvage contract/, m.anchor.contract);
    assert.match(m.anchor.share, /Share/);
    assert.ok(m.rendezvous && !unfilled(m.anchor.standIn), m.anchor.standIn);
    assert.equal(m.opening, undefined);
    assert.equal(m.rpPrompts, undefined);
    for (const s of [m.title, m.briefing, m.stakes, m.twist, ...m.crossings, ...m.rules, ...m.objectives.map((o) => o.text), story.missionEpilogue(m, true)]) {
      assert.ok(!unfilled(s), `${type}: ${s}`);
    }
  }
});

test("NPC names are never reused, and recent ones never even nearly", async () => {
  const names = await import("../src/engine/names.js");
  const g = { usedNames: ["Ysolde Pike"], characters: { x: { name: "RJ Oressian" } } };
  const made = Array.from({ length: 300 }, () => names.freshName(g));
  assert.equal(new Set(made).size, made.length, "no full name repeats");
  const window = made.slice(0, 79);
  for (let i = 0; i < window.length; i++) {
    assert.ok(!names.similar(names.firstName(window[i]), "Ysolde"), window[i]);
    for (let j = i + 1; j < window.length; j++) {
      assert.ok(!names.similar(names.firstName(window[i]), names.firstName(window[j])), `${window[i]} ~ ${window[j]}`);
    }
  }
  assert.ok(made.every((n) => !names.similar(names.lastName(n), "Oressian")), "no accidental kin with players");
  assert.ok(names.similar("Ysolda", "Ysolde") && names.similar("Pike", "Pyke") && !names.similar("Pike", "Vance"));
});

test("similar surnames become family, with an NPC or another player", () => {
  const g = store.guild(`t6-${Math.random()}`);
  let rj;
  do rj = story.buildCharacter(g, { ownerId: "a", originId: "pyro_outlaw", career: "smuggler", name: "RJ Oressian", pronouns: "he" });
  while (!rj.hooks.some((h) => h.type === "enemy"));
  g.characters[rj.id] = rj;
  const enemyHook = rj.hooks.find((h) => h.type === "enemy");
  enemyHook.thread = "headhunters"; // composed hooks pick their thread from where the NPC is
  const enemy = g.npcs[enemyHook.npcId];
  enemy.name = "Ysolde Pike";
  const yp = story.buildCharacter(g, { ownerId: "b", originId: "navy_veteran", career: "pilot", name: "Ysloda Pyke", pronouns: "she" });
  g.characters[yp.id] = yp;
  const ties = story.linkKin(g, yp);
  assert.ok(ties.some((t) => t.with === "Ysolde Pike"), JSON.stringify(ties));
  assert.ok(yp.hooks.some((h) => h.type === "kin" && h.npcId === enemy.id));
  assert.equal(story.linkKin(g, yp).length, 0, "links are only made once");
  const sib = story.buildCharacter(g, { ownerId: "c", originId: "levski_born", career: "medic", name: "Tess Pike", pronouns: "they" });
  g.characters[sib.id] = sib;
  story.linkKin(g, sib);
  assert.ok(yp.hooks.some((h) => h.kinCharId === sib.id), "player-player kin is linked both ways");
  assert.ok(ties.find((t) => t.with === "Ysolde Pike").text.includes("the Headhunters"), "kin keeps the NPC's existing side");
  for (let i = 0; i < 30; i++) {
    const both = story.buildMission(g, [rj, yp], "bounty");
    assert.ok(both.crossings.some((c) => c.startsWith("Ysolde Pike is in both your stories")), both.crossings.join(" | "));
    assert.ok(!both.crossings.some((c) => /Ysolde Pike and Ysolde Pike/.test(c)));
  }
  const m = story.buildMission(g, [yp, sib], "rescue");
  assert.ok(m.crossings.some((c) => /Blood says family/.test(c)), m.crossings.join(" | "));
});

test("scrapping a mission rolls the server back to exactly how it was", () => {
  const g = store.guild("t7");
  const crew = [["a", "RJ Oressian", "pyro_outlaw"], ["b", "Mara Calder", "navy_veteran"]].map(([u, n, o]) => {
    const c = story.buildCharacter(g, { ownerId: u, originId: o, career: "pilot", name: n, pronouns: "he" });
    g.characters[c.id] = c;
    return c;
  });
  story.buildMission(g, crew, "heist"); // an earlier mission that stays
  g.missions = {};
  const before = JSON.stringify({ npcs: g.npcs, names: g.usedNames, links: g.npcLinks, titles: g.usedTitles, journals: crew.map((c) => c.journal) });
  const snap = story.snapshot(g);
  const m = story.buildMission(g, crew, "bounty");
  m.created = story.createdSince(g, snap);
  g.missions[m.id] = m;
  for (const c of crew) store.addJournal(c, { kind: "mission", text: `Took the job "${m.title}" from Relay.` });
  assert.ok(m.created.npcIds.length + m.created.titles.length > 0);
  story.rollbackMission(g, m);
  const after = JSON.stringify({ npcs: g.npcs, names: g.usedNames, links: g.npcLinks, titles: g.usedTitles, journals: crew.map((c) => c.journal) });
  assert.equal(after, before);
  assert.equal(g.missions[m.id], undefined);
});

test("stops: the d20 decides how many, crew damage forces one, places are real and never repeat", () => {
  const healthy = [{ name: "RJ", conditions: [] }];
  const damaged = [{ name: "RJ", conditions: [{ status: "active", kind: "ship" }] }];
  for (let i = 0; i < 300; i++) {
    for (const system of ["Stanton", "Pyro", "Nyx"]) {
      const a = story.rollStops(healthy, system);
      assert.ok(a.roadRoll >= 1 && a.roadRoll <= 20);
      assert.equal(a.stops.length, a.roadRoll <= 4 ? 2 : a.roadRoll <= 19 ? 1 : 0, `roll ${a.roadRoll}`);
      const b = story.rollStops(damaged, system);
      assert.ok(b.stops.some((s) => s.forced && /RJ's ship/.test(s.reason)), "damage forces a stop");
      for (const s of [...a.stops, ...b.stops]) assert.ok(s.place && s.reason && s.action && s.need && !unfilled(s.reason));
      assert.equal(new Set(b.stops.map((s) => s.place)).size, b.stops.length, "no repeated stop");
    }
  }
});

test("dice expressions", () => {
  const r = story.rollDice("3d6+2");
  assert.equal(r.rolls.length, 3);
  assert.ok(r.total >= 5 && r.total <= 20);
  assert.equal(story.rollDice("d20").rolls.length, 1);
  assert.equal(story.rollDice("banana"), null);
});

test("every story fragment and hook reads right with every pronoun", async () => {
  const { ORIGINS } = await import("../src/lore/data.js");
  const { fill } = await import("../src/engine/util.js");
  for (const [id, o] of Object.entries(ORIGINS)) {
    for (const pr of ["he", "she", "they"]) {
      for (const t of [...o.openings, ...o.turns, ...o.nows, ...o.hooks.map((h) => h.text)]) {
        const p = fill(t, { name: "Test Pilot", short: "Test", surname: "Pilot", relic: "Relic", npc: "Someone Else" }, pr);
        assert.ok(!unfilled(p), `${id}: ${p}`);
        assert.ok(!/\b(he|she|He|She) (fly|have|haven't|are|were|do|don't|keep|work|remember|realise|realize)\b/.test(p), `${id}/${pr}: ${p}`);
        assert.ok(!/\b(they|They) (flies|has|hasn't|is|was|does|doesn't|keeps|works)\b/.test(p), `${id}/${pr}: ${p}`);
      }
    }
  }
});

test("characters with the same origin get different lives and different hooks", () => {
  const g = store.guild("t8");
  const made = [];
  for (let i = 0; i < 9; i++) {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: "pyro_outlaw", career: "bounty", name: `Pilot${i} Person${i}`, pronouns: "he" });
    g.characters[c.id] = c;
    made.push(c);
  }
  // Nine Pyro outlaws, nine different lives: no family, childhood or turning point is reused, and no two
  // stories share more than one sentence (names masked, so "RJ grew up…" and "Mira grew up…" count as the same).
  for (const pool of ["family", "child", "turn"]) {
    const counts = Object.entries(g.storyUse).filter(([k]) => k.startsWith(`${pool}:`)).map(([, n]) => n);
    assert.ok(Math.max(...counts) === 1, `${pool} pieces repeat: ${counts}`);
  }
  const masked = (c) => new Set(c.story.join(" ").replaceAll(c.name, "X").replaceAll(c.name.split(" ")[0], "X").split(/(?<=[.!?])\s+/).filter((x) => x.length > 30));
  for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) {
    const a = masked(made[i]);
    const shared = [...masked(made[j])].filter((x) => a.has(x));
    assert.ok(shared.length <= 1, `stories ${i} and ${j} share: ${shared.join(" | ")}`);
  }
  for (const c of made) assert.notEqual(c.hooks[0].type, c.hooks[1].type);
  const hookUse = {};
  for (const c of made) for (const k of c.hookKeys) hookUse[k] = (hookUse[k] || 0) + 1;
  assert.ok(Object.keys(hookUse).length >= 4, `hooks are spread out: ${JSON.stringify(hookUse)}`);
});

test("crew roles: never doubled, preferences win, stories steer, and roles rotate", async () => {
  const { CREW_ROLES } = await import("../src/lore/data.js");
  const g = store.guild(`roles-${Math.random()}`);
  const mk = (owner, originId, name, extra = {}) => {
    const c = story.buildCharacter(g, { ownerId: owner, originId, career: null, name, pronouns: "he" });
    Object.assign(c, extra);
    g.characters[c.id] = c;
    return c;
  };
  const rj = mk("a", "pyro_outlaw", "RJ Oressian", { preferredRole: "pilot" });
  const xo = mk("b", "navy_veteran", 'Jace "XO" Calder');
  const crew = [rj, xo, ...["c", "d", "e", "f", "g", "h", "i", "j"].map((u, i) => mk(u, "pyro_outlaw", `Merc${i} Gun${i}`, { career: "marine" }))];
  for (let i = 0; i < 50; i++) {
    const roles = story.assignRoles(crew, "heist");
    assert.equal(new Set(roles.map((r) => r.role)).size, crew.length, "ten crew, ten different roles");
    assert.equal(roles[0].role, "pilot", "a chosen role always wins");
    for (const r of roles) assert.ok(CREW_ROLES[r.role] && r.why);
  }
  let xoAsXo = 0;
  for (let i = 0; i < 50; i++) if (story.assignRoles([rj, xo], "smuggle")[1].role === "xo") xoAsXo++;
  assert.ok(xoAsXo >= 45, `a character called XO should usually be the XO (${xoAsXo}/50)`);
  xo.roleHistory = [{ role: "xo" }, { role: "xo" }];
  let rotated = 0;
  for (let i = 0; i < 50; i++) if (story.assignRoles([rj, xo], "smuggle")[1].role !== "xo") rotated++;
  assert.ok(rotated > 0, "after two missions as XO, they sometimes try something else");
});

test("missions record roles, and scrapping one erases them", () => {
  const g = store.guild(`roles2-${Math.random()}`);
  const crew = ["a", "b", "c"].map((u, i) => {
    const c = story.buildCharacter(g, { ownerId: u, originId: "pyro_outlaw", career: null, name: `Crew${i} Name${i}`, pronouns: "they" });
    g.characters[c.id] = c;
    return c;
  });
  const m = story.buildMission(g, crew, "rescue");
  assert.equal(new Set(m.objectives.map((o) => o.role)).size, 3);
  for (const o of m.objectives) (g.characters[o.characterId].roleHistory ??= []).push({ missionId: m.id, role: o.role });
  g.missions = { [m.id]: m };
  story.rollbackMission(g, m);
  for (const c of crew) assert.equal(c.roleHistory.length, 0);
});

test("campaign chapters hand different crew members different activities when they can", () => {
  const g = store.guild(`ch-${Math.random()}`);
  const crew = ["a", "b"].map((u, i) => {
    const c = story.buildCharacter(g, { ownerId: u, originId: "pyro_outlaw", career: null, name: `Pal${i} Friend${i}`, pronouns: "they" });
    g.characters[c.id] = c;
    return c;
  });
  for (let i = 0; i < 40; i++) {
    const camp = story.buildCampaign(g, { goalId: "uncover", characters: crew, ownerId: "a", scope: "org" });
    const ch = story.buildChapter(g, camp, crew);
    assert.notEqual(ch.objectives[0].activity, ch.objectives[1].activity);
  }
});

test("custom roles: created, found by name, only given to people who chose them or fit them, removable", async () => {
  const roles = await import("../src/engine/roles.js");
  const g = store.guild(`custom-${Math.random()}`);
  const key = roles.addCustomRole(g, { label: "Information Broker", job: "Buys intel and talks the crew out of trouble.", emoji: "🕵️", createdBy: "a" });
  assert.equal(key, "c:information-broker");
  assert.equal(roles.findRole(g, "information broker"), key);
  assert.equal(roles.findRole(g, "Pilot"), "pilot");
  assert.equal(roles.findRole(g, "Bartender"), null);
  const mk = (u, name, extra = {}) => {
    const c = story.buildCharacter(g, { ownerId: u, originId: "terran_noble", career: null, name, pronouns: "she" });
    Object.assign(c, extra);
    g.characters[c.id] = c;
    return c;
  };
  const broker = mk("a", "Vera Lane", { preferredRole: key });
  const twin = mk("b", "Ivy Lane", { preferredRole: key });
  const fan = mk("c", "Nell Moss", { seed: "an information broker who sells secrets" });
  const plain = mk("d", "Ora Pike");
  for (let i = 0; i < 40; i++) {
    const r = story.assignRoles([broker, twin, fan, plain], "heist", g.customRoles);
    assert.equal(new Set(r.map((x) => x.role)).size, 4, "custom roles are never doubled either");
    assert.ok(r.filter((x) => x.role === key).length === 1);
    assert.notEqual(r[3].role, key, "nobody gets a custom role they didn't pick or fit");
  }
  const m = story.buildMission(g, [broker], "heist");
  assert.equal(m.objectives[0].roleLabel, "Information Broker");
  assert.equal(m.objectives[0].roleEmoji, "🕵️");
  assert.ok(roles.removeCustomRole(g, key));
  assert.equal(broker.preferredRole, null);
});

test("Pyro stops and objectives use real, named places", async () => {
  const { PYRO_POIS, PYRO_STATIONS, poiLabel } = await import("../src/lore/pyro.js");
  const { STOP_PLACES, LOCATIONS } = await import("../src/lore/data.js");
  assert.ok(PYRO_POIS.length >= 40 && PYRO_STATIONS.length >= 10);
  for (const p of PYRO_POIS) {
    assert.match(p.body, /^(Pyro I|Monox|Bloom|Pyro IV|Ignis|Vatra|Adir|Fairo|Fuego|Vuur|Terminus)$/, p.name);
    assert.ok(["hostile", "friendly", "resupply", "wreck"].includes(p.kind), p.name);
    const label = poiLabel(p);
    assert.ok((label.match(/\(/g) || []).length === 1, `one bracket pair: ${label}`);
  }
  for (const s of STOP_PLACES.Pyro) assert.doesNotMatch(s.place, /^an? (derelict|gang|cave|abandoned|wreck)/i, `exact names only: ${s.place}`);
  for (let i = 0; i < 200; i++) {
    const r = story.rollStops([{ name: "RJ", conditions: [{ status: "active", kind: "ship" }] }], "Pyro");
    const repair = r.stops.find((x) => x.forced);
    assert.match(repair.place, /Station|Exchange|Refueling|Supplies|Gaslight|Endgame|Nest|Daughters|Patch City|Orbituary|trading post|Chawla's Beach|Seer's Canyon|Prophet's Peak|Arid Reach|Frigid Knot|Canard View/, `repairs happen where there are services: ${repair.place}`);
  }
  assert.ok(LOCATIONS.Pyro.places.some((p) => p.name.startsWith("Carver's Ridge")));
});

test("a written story is kept word for word; the DM only adds what fits and what's missing", async () => {
  const g = store.guild(`written-${Math.random()}`);
  const text = "Tomothy was the funniest man on the Lorville munitions line. He did five minutes every shift change, mostly about the Imperator's hair, until a manager filmed it and sent it to the wrong people. Now he can't get a booking anywhere in Stanton.";
  const c = story.buildCharacter(g, { ownerId: "u", originId: "hurston_worker", career: null, name: "Tomothy Fulari", pronouns: "he", seed: text });
  assert.equal(c.writtenStory, text);
  assert.ok(c.story.join("\n\n").includes(text), "every word they wrote is there");
  const extra = c.story.join(" ").replace(text, "");
  assert.ok(!/crack shot|temper that runs hotter|sold his family out/.test(extra), `additions fit a comedian: ${extra}`);
  // Only real gaps are filled: they named Lorville, so no second birthplace is invented.
  assert.ok(!/comes from|was born in/.test(extra));
  const { coveredTopics } = await import("../src/engine/backstory.js");
  assert.deepEqual(coveredTopics("My father flew a Cutlass and I want revenge someday").family, true);
});
