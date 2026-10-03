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
  const g = store.guild("t6");
  const rj = story.buildCharacter(g, { ownerId: "a", originId: "pyro_outlaw", career: "smuggler", name: "RJ Oressian", pronouns: "he" });
  g.characters[rj.id] = rj;
  const enemy = g.npcs[rj.hooks[0].npcId];
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
  const g = store.guild("t6");
  const rj = story.buildCharacter(g, { ownerId: "a", originId: "pyro_outlaw", career: "smuggler", name: "RJ Oressian", pronouns: "he" });
  g.characters[rj.id] = rj;
  const enemy = g.npcs[rj.hooks[0].npcId];
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
