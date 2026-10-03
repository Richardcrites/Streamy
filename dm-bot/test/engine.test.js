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
        for (const p of [...c.story, ...c.hooks.map((h) => h.text)]) assert.ok(!unfilled(p), `${originId}: ${p}`);
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

test("crossovers find links between characters", () => {
  const g = store.guild("t4");
  const a = story.buildCharacter(g, { ownerId: "a", originId: "tevarin", career: "pilot", name: "Kehl'Varo of House Vael", pronouns: "she" });
  const b = story.buildCharacter(g, { ownerId: "b", originId: "banu_trader", career: "smuggler", name: "Soren Dray", pronouns: "he" });
  const x = story.buildCrossover(g, a, b);
  assert.ok(x.links.length > 0, "both are hostile to XenoThreat");
  assert.equal(x.objectives.length, 2);
  assert.ok(!unfilled(x.text));
});

test("slash command definitions build", () => {
  assert.ok(commands.length >= 9);
  for (const c of commands) assert.match(c.name, /^[a-z-]{1,32}$/);
});
