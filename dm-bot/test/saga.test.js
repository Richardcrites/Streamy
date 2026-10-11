import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-saga-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENROUTER_API_KEY;

const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const saga = await import("../src/engine/saga.js");
const { SAGAS, SAGA_THREAT_MAX, SIDE_JOBS_PER_TIDBIT } = await import("../src/lore/sagas.js");
const feed = await import("../src/handlers/feed.js");
const { archiveSaga } = await import("../src/engine/records.js");

const unfilled = (s) => /\{[A-Za-z0-9_']+\}/.test(s);

function crew(g, n = 3) {
  const origins = ["pyro_outlaw", "navy_veteran", "levski_born", "hurston_worker"];
  return Array.from({ length: n }, (_, i) => {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: origins[i], career: null, name: ["RJ Oressian", "Mira Kade", "Tomothy Fulari", "Ash Vey"][i], pronouns: ["he", "she", "they", "he"][i] });
    g.characters[c.id] = c;
    g.activeChar[`u${i}`] = c.id;
    return c;
  });
}

test("every saga is fully playable: 10 leads with a real place, contract and match, a finale you can play", () => {
  for (const t of SAGAS) {
    assert.equal(t.leads.length, 10, t.id);
    assert.equal(t.acts.length, 5, t.id);
    for (const l of t.leads) {
      for (const k of ["system", "where", "contract", "find", "text", "activity"]) assert.ok(l[k], `${t.id} lead missing ${k}`);
      assert.ok(["Stanton", "Pyro", "Nyx"].includes(l.system), l.system);
      assert.ok(l.match instanceof RegExp, `${t.id}: ${l.where}`);
    }
    assert.ok(t.finalePlay?.contract && t.finalePlay?.where, t.id);
    assert.ok(t.tidbits.length >= 6 && t.bondHint && t.bond, t.id);
    for (const k of ["Mercenary", "Bounty Hunter", "Hauling", "other"]) assert.ok(t.sideJobs[k], `${t.id} side job ${k}`);
  }
});

test("a saga fills every placeholder, for the leads, the finale and each character's secrets", () => {
  for (const t of SAGAS) {
    const g = store.guild(`saga-fill-${t.id}-${Math.random()}`);
    const cs = crew(g);
    const s = saga.createSaga(g, cs, t.id);
    const texts = [s.premise, s.truth, s.finale, s.finalePlay.contract, ...s.acts.map((a) => a.goal), ...s.leads.flatMap((l) => [l.text, l.where, l.contract, l.find])];
    for (const c of cs) for (const tb of s.tidbits[c.id]) texts.push(tb.text, tb.find);
    texts.push(saga.bondText(g, s));
    for (const x of texts) assert.ok(!unfilled(x), `${t.id}: ${x}`);
    // Each character gets two secrets plus the bond hint, and the bond names the whole crew.
    for (const c of cs) assert.equal(s.tidbits[c.id].length, 3);
    for (const c of cs) assert.ok(saga.bondText(g, s).includes(c.name));
    for (const x of [...s.leads.map((l) => l.text), ...Object.values(s.tidbits).flat().map((tb) => tb.text)]) assert.ok(!x.includes(s.truename), `the villain's real name stays hidden: ${x}`);
  }
});

test("missions carry the next lead: its system and contract become the mission's", () => {
  const g = store.guild(`saga-mission-${Math.random()}`);
  const cs = crew(g, 2);
  const s = (g.saga = saga.createSaga(g, cs, "hyperion"));
  const beat = saga.sagaBeat(s);
  assert.equal(beat.kind, "lead");
  const m = story.buildMission(g, cs, null, { play: beat.play, sagaTitle: s.title });
  assert.equal(m.system, beat.play.system);
  assert.ok(m.anchor.contract.includes(beat.play.contract));
  assert.ok(m.anchor.standIn.includes(s.title));
  assert.equal(m.type, "heist", "an investigation lead becomes a heist-style job");
});

test("leads advance acts and reveal secrets; failures raise threat; counterstrike and finale", () => {
  const g = store.guild(`saga-run-${Math.random()}`);
  const cs = crew(g);
  const s = saga.createSaga(g, cs, "virgil");
  const first = saga.resolveSagaBeat(g, s, saga.sagaBeat(s), { success: true, missionTitle: "One", chars: cs });
  assert.ok(first.revealed && first.tidbit, "a found lead reveals a clue and a secret");
  assert.equal(s.act, 0);
  const second = saga.resolveSagaBeat(g, s, saga.sagaBeat(s), { success: true, missionTitle: "Two", chars: cs });
  assert.equal(second.actDone, s.acts[0].name);
  assert.equal(s.act, 1);

  // Fail until the villain counterstrikes.
  while (s.threat < SAGA_THREAT_MAX) saga.resolveSagaBeat(g, s, saga.sagaBeat(s), { success: false, missionTitle: "Bad", chars: cs });
  const strike = saga.sagaBeat(s);
  assert.equal(strike.kind, "counterstrike");
  assert.ok(strike.play.contract, "a counterstrike is playable too");
  saga.resolveSagaBeat(g, s, strike, { success: false, missionTitle: "Hit", chars: cs });
  assert.equal(s.leads.filter((l) => l.found).length, 1, "losing a counterstrike loses a lead");
  assert.equal(s.act, 0);

  for (let i = 0; i < 30 && !saga.finaleReady(s); i++) saga.resolveSagaBeat(g, s, saga.sagaBeat(s), { success: true, missionTitle: `M${i}`, chars: cs });
  const fin = saga.sagaBeat(s);
  assert.equal(fin.kind, "finale");
  assert.equal(fin.play.where, s.finalePlay.where);
  const end = saga.resolveSagaBeat(g, s, fin, { success: true, missionTitle: "The End", chars: cs });
  assert.ok(end.finale && end.bond.includes(cs[0].name));
  assert.equal(s.status, "complete");
  assert.equal(g.sagaHistory.at(-1).outcome, "won");
  const entry = archiveSaga(g, s, end.bond);
  assert.match(entry.text, /The big reveal/);
});

test("real contracts get a purpose; the lead's contract finds the clue; side jobs dig up secrets", () => {
  const g = store.guild(`saga-jobs-${Math.random()}`);
  const [c] = crew(g, 1);
  const s = (g.saga = saga.createSaga(g, [c], "hyperion"));

  const side = saga.noteContract(g, s, c, { title: "Defend Occupants", stage: "accepted" });
  assert.equal(side.isLead, false);
  assert.equal(side.tab, "Mercenary");
  assert.ok(side.purpose.includes(s.shadow), "a side job still has a purpose");

  const lead = saga.noteContract(g, s, c, { title: "Jorrit Dossier: Onyx Personnel Files", stage: "complete" });
  assert.ok(lead.isLead && lead.resolved.revealed, "the Onyx dossier contract is the first lead");
  assert.ok(s.leads[0].found);

  let tidbit = null;
  for (let i = 0; i < SIDE_JOBS_PER_TIDBIT; i++) tidbit = saga.noteContract(g, s, c, { title: "Hauling: Stanton to Pyro", stage: "complete" }).tidbit || tidbit;
  assert.ok(tidbit, "side jobs reveal a personal secret");
});

test("DM Link contract events are tied into the saga", () => {
  const g = store.guild(`saga-feed-${Math.random()}`);
  const [c] = crew(g, 1);
  g.saga = saga.createSaga(g, [c], "hyperion");
  const notes = [];
  feed.applyFeedEvents(g, c, [
    { type: "contract_accepted", title: "Jorrit Dossier: Onyx Personnel Files", at: "t" },
    { type: "contract_complete", title: "Jorrit Dossier: Onyx Personnel Files", at: "t" },
  ], notes);
  assert.equal(notes.length, 2);
  assert.ok(notes[0].isLead);
  assert.ok(notes[1].resolved?.revealed);
  assert.ok(c.journal.some((j) => /Found a lead/.test(j.text)));
  const embed = feed.jobEmbed(g, c, notes);
  assert.match(embed.data.description, /Clue found/);
});

test("the player's description is always in the built-in story", () => {
  const g = store.guild(`seed-${Math.random()}`);
  const c = story.buildCharacter(g, { ownerId: "u", originId: "terran_noble", career: null, name: "Tomothy Fulari", pronouns: "he", seed: "a failed comedian who failed due to making too many UEE jokes" });
  assert.ok(c.story.some((p) => p.includes("a failed comedian who failed due to making too many UEE jokes")));
  const v = { short: "Tomothy", name: "Tomothy Fulari" };
  assert.equal(story.seedParagraph("grew up on Terra hauling ice", v, "he"), "Tomothy grew up on Terra hauling ice.");
  assert.match(story.seedParagraph("Street racer from Lorville", v, "he"), /Tomothy was a street racer from Lorville\./);
  assert.match(story.seedParagraph("I just want to fly.", v, "he"), /own words: "I just want to fly\."/);
  assert.equal(story.seedParagraph("", v, "he"), null);
});

test("missions take a crew of 8: unique roles and everyone tied into the story", () => {
  const g = store.guild(`crew8-${Math.random()}`);
  const origins = ["pyro_outlaw", "navy_veteran", "levski_born", "hurston_worker", "terran_noble", "tevarin", "microtech_engineer", "banu_trader"];
  const cs = origins.map((originId, i) => {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId, career: null, name: story.suggestNames(originId, 1, g)[0], pronouns: "they" });
    g.characters[c.id] = c;
    return c;
  });
  for (let run = 0; run < 10; run++) {
    const m = story.buildMission(g, cs, null);
    assert.equal(m.objectives.length, 8);
    assert.equal(new Set(m.objectives.map((o) => o.role)).size, 8, "nobody shares a role");
    for (const c of cs) assert.ok(m.crossings.some((x) => x.includes(c.name)), `${c.name} is tied into the story`);
  }
  // Past the 10 built-in roles, people double up instead of being left out.
  const more = [...cs, ...cs.slice(0, 4).map((c, i) => ({ ...c, id: `extra${i}`, name: `Extra ${i}` }))];
  assert.ok(story.assignRoles(more, "heist").every(Boolean));
});

test("an oversized mission post splits into several embeds instead of failing", async () => {
  const { EmbedBuilder } = await import("discord.js");
  const { fitEmbeds } = await import("../src/handlers/mission.js");
  const e = new EmbedBuilder().setTitle("Big").setDescription("x".repeat(3000)).setFooter({ text: "footer" })
    .addFields(Array.from({ length: 12 }, (_, i) => ({ name: `F${i}`, value: "y".repeat(1000) })));
  const out = fitEmbeds(e).map((x) => x.toJSON());
  assert.ok(out.length >= 3);
  for (const x of out) {
    const n = (x.title || "").length + (x.description || "").length + (x.footer?.text || "").length + (x.fields || []).reduce((s, f) => s + f.name.length + f.value.length, 0);
    assert.ok(n <= 6000, `embed is ${n}`);
  }
  assert.equal(out.flatMap((x) => x.fields || []).length, 12, "no field is lost");
  assert.equal(out.at(-1).footer.text, "footer");
});

test("after a mission the DM says what's next: the next lead, loose threads and what to fix first", async () => {
  const { whatsNext } = await import("../src/handlers/mission.js");
  const g = store.guild(`next-${Math.random()}`);
  const cs = crew(g, 2);
  cs[0].conditions = [{ id: "a", kind: "ship", text: "Hull breach", status: "active", severity: "major", clears: "repair" }];
  const m = story.buildMission(g, cs, "heist");

  const plain = whatsNext(g, m, cs, false, null);
  assert.ok(plain.lines.some((l) => l.includes(m.antagonist)), "a failed job leaves the antagonist as a loose thread");
  assert.ok(plain.lines.some((l) => /saga start/.test(l)));
  assert.ok(plain.lines.some((l) => /Hull breach/.test(l)), "conditions to fix before the next job");

  const s = (g.saga = saga.createSaga(g, cs, "embers"));
  saga.resolveSagaBeat(g, s, saga.sagaBeat(s), { success: true, missionTitle: "x", chars: cs });
  const withSaga = whatsNext(g, m, cs, true, null);
  assert.ok(withSaga.lines.some((l) => l.includes(s.leads[1].where)), "points at the next lead's real place");
  assert.ok(withSaga.teaser && withSaga.spoken);
});

test("no lead, secret or finale sends players to content that left the game", () => {
  const gone = /hunt frontier fighters|frontier fighter (hideout|cache)|citizens for prosperity servers/i;
  for (const t of SAGAS) {
    for (const x of [...t.leads.flatMap((l) => [l.where, l.contract, l.find]), ...t.tidbits.map((tb) => tb.find), t.bondHint.find, t.finalePlay.contract, t.finalePlay.where]) {
      assert.ok(!gone.test(x), `${t.id}: ${x}`);
    }
  }
});

test("a running saga picks up fixed leads, but found clues and revealed secrets stay as they were", () => {
  const g = store.guild(`refresh-${Math.random()}`);
  const cs = crew(g, 2);
  const s = (g.saga = saga.createSaga(g, cs, "embers"));
  // Pretend this saga was saved by an older version: lead 0 found, lead 1 pointing at old content.
  s.leads[0].found = { at: "t", by: "x", mission: "m" };
  s.leads[0].where = "a Frontier Fighter hideout in Pyro";
  s.leads[1].where = "a Citizens for Prosperity site in Pyro";
  s.leads[1].contract = "The **Mercenary** contract **Clear Citizens for Prosperity Servers**";
  const tb = s.tidbits[cs[0].id][0];
  tb.find = "a Frontier Fighter cache datapad (Pyro)";
  const n = saga.refreshSaga(g, s);
  assert.ok(n >= 2);
  assert.equal(s.leads[0].where, "a Frontier Fighter hideout in Pyro", "a found clue is history");
  assert.match(s.leads[1].where, /Orbituary/);
  assert.ok(!/Frontier Fighter cache/.test(tb.find));
  assert.equal(saga.refreshSaga(g, s), 0, "nothing left to change");
});
