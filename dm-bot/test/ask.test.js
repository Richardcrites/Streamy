import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-ask-${process.pid}.json`);
const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const data = await import("../src/lore/data.js");
const ask = await import("../src/handlers/ask.js");

function setup() {
  const g = store.guild(`a${Math.random()}`);
  const crew = [["a", "RJ Oressian", "smuggler"], ["b", "Mara Calder", "pilot"]].map(([u, n, career]) => {
    const c = story.buildCharacter(g, { ownerId: u, originId: "pyro_outlaw", career, name: n, pronouns: "they" });
    g.characters[c.id] = c;
    g.activeChar[u] = c.id;
    return c;
  });
  const m = story.buildMission(g, crew, "smuggle");
  g.missions = { [m.id]: m };
  return { g, m };
}

test("every objective type has contract guidance", () => {
  for (const activity of Object.keys(data.OBJECTIVES)) assert.ok(data.CONTRACT_GUIDE[activity], activity);
});

test("without AI, 'what contract do we take?' is answered from the current mission", async () => {
  delete process.env.OPENROUTER_API_KEY;
  const { g, m } = setup();
  const text = await ask.answer(g, { question: "what contract do we take for this?", userId: "a", askerName: "Rich" });
  for (const o of m.objectives) assert.ok(text.includes(o.characterName), text);
  assert.match(text, /mobiGlas|No contract/);
});

test("with AI, the question goes to the DM with mission, guide and persona; the twist stays secret", async () => {
  process.env.OPENROUTER_API_KEY = "k";
  const { g, m } = setup();
  let system;
  let user;
  globalThis.fetch = async (u, o) => {
    const b = JSON.parse(o.body);
    system = JSON.stringify(b.messages[0].content);
    user = b.messages.at(-1).content;
    return new Response(JSON.stringify({ choices: [{ message: { content: "Take a Delivery contract out of Checkmate, spacer." } }] }));
  };
  const text = await ask.answer(g, { question: "what contract do we take for this?", userId: "a", askerName: "Rich" });
  assert.equal(text, "Take a Delivery contract out of Checkmate, spacer.");
  assert.equal(user, "what contract do we take for this?");
  assert.ok(system.includes(m.title) && system.includes("CONTRACT GUIDE") && system.includes("Relay"));
  assert.ok(!system.includes(m.twist), "the twist must not be sent with questions");
});
