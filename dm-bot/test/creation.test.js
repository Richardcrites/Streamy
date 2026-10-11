import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-creation-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENROUTER_API_KEY;

const store = await import("../src/store.js");
const character = await import("../src/handlers/character.js");

// A fake Discord interaction that records what the bot shows.
function fake(userId, extra = {}) {
  const seen = { modal: null, shown: [], posted: [] };
  const i = {
    user: { id: userId, username: "tester" }, guildId: "g", seen,
    options: { getString: () => null },
    reply: async (m) => seen.shown.push(m), update: async (m) => seen.shown.push(m),
    editReply: async (m) => seen.shown.push(m), deferUpdate: async () => {}, deferReply: async () => {},
    followUp: async (m) => seen.posted.push(m), showModal: async (m) => { seen.modal = m.toJSON(); },
    isMessageComponent: () => true,
    ...extra,
  };
  return i;
}
const buttons = (msg) => msg.components.flatMap((r) => r.toJSON().components).map((c) => c.custom_id);

test("players can type their own background (no pick list needed), and their story is kept", async () => {
  const g = store.guild(`create-${Math.random()}`);
  const start = fake("u1");
  await character.create(start, g);
  assert.ok(buttons(start.seen.shown[0]).includes("cc:bg"), "step 1 offers 'Write my own background'");

  const bgButton = fake("u1");
  await character.onBackground(bgButton, g);
  assert.equal(bgButton.seen.modal.custom_id, "cc:bgm");

  const story = "Tomothy was the funniest man on the Lorville munitions line. He did five minutes every shift change about the Imperator's hair, until a manager filmed it. Now he can't get a booking anywhere in Stanton.";
  const modal = fake("u1", { fields: { getTextInputValue: (k) => ({ who: "failed comedian from Lorville", story })[k] } });
  await character.onBackgroundWritten(modal, g);
  assert.match(modal.seen.shown[0].embeds[0].toJSON().description, /Failed comedian from Lorville/);

  await character.onPronouns(fake("u1"), g, "he");
  const named = fake("u1");
  await character.onNamePicked(named, g, 0);

  const c = store.activeCharacter(g, "u1");
  assert.ok(c, "the character was created without a separate story step (they wrote it already)");
  assert.equal(c.origin, "Failed comedian from Lorville");
  assert.equal(c.originId, "hurston_worker", "closest preset, used behind the scenes");
  assert.ok(c.story.join("\n\n").includes(story), "their story is kept word for word");
  assert.ok(c.hooks.every((h) => !/Hurston Dynamics still holds/.test(h.text)), "no preset hook contradicts their background");
  assert.ok(named.seen.posted.length, "the dossier was posted");
});

test("a background with no recognisable place falls back to the neutral spacer base", async () => {
  const { inferOrigin } = await import("../src/engine/backstory.js");
  assert.equal(inferOrigin("just someone with a ship and a bad attitude"), "drifter");
  assert.equal(inferOrigin("ex-Navy medic who deserted"), "navy_veteran");
});

test("a dossier never goes over Discord's 6000-character embed limit", async () => {
  const { dossierEmbed, embedSize } = await import("../src/comms.js");
  const long = "word ".repeat(1000);
  const char = { name: "Long Story", origin: "x", pronouns: "he", home: "y", citizenship: "none", story: [long, long], seed: long, writtenStory: null,
    hooks: Array.from({ length: 4 }, () => ({ status: "open", text: "h".repeat(250) })), conditions: [], renown: {}, titles: [], relationships: [] };
  assert.ok(embedSize(dossierEmbed(char, { full: true })) <= 6000);
});

test("hooks are unique to each character and grow out of their own words", async () => {
  const story = await import("../src/engine/story.js");
  const g = store.guild(`hooks-${Math.random()}`);
  const made = [];
  for (let i = 0; i < 12; i++) {
    const c = story.buildCharacter(g, { ownerId: `u${i}`, originId: i % 2 ? "drifter" : "pyro_outlaw", career: null, name: `Pilot${i} Person${i}`, pronouns: "they",
      background: i % 2 ? `spacer number ${i}` : null });
    g.characters[c.id] = c;
    made.push(c);
  }
  const texts = made.flatMap((c) => c.hooks.map((h) => h.text));
  assert.equal(new Set(texts).size, texts.length, "no hook is repeated on the server");
  // Strip names: even the sentence shapes don't repeat (who + what).
  const shapes = made.flatMap((c) => c.hooks.map((h) => h.text.split(". ")[0].replace(/^[^,]+, /, "").replace(/Pilot\d+/g, "X")));
  assert.ok(new Set(shapes).size >= shapes.length - 2, "who-and-what combinations are spread out");
  for (const c of made) assert.notEqual(c.hooks[0].type, c.hooks[1].type);
  // One character never gets the same kind of person twice, even with only one role fitting their words.
  const roleOf = (t) => t.split(". ")[0].replace(/^[^,]+, /, "").split(",")[0];
  for (let i = 0; i < 6; i++) {
    const dex = story.buildCharacter(g, { ownerId: `d${i}`, originId: "drifter", career: null, name: `Dex${i} Harlan`, pronouns: "they", background: "card sharp and gambler" });
    g.characters[dex.id] = dex;
    assert.notEqual(roleOf(dex.hooks[0].text), roleOf(dex.hooks[1].text), dex.hooks.map((h) => h.text).join(" | "));
  }

  const comic = story.buildCharacter(g, { ownerId: "z", originId: "hurston_worker", career: null, name: "Tomothy Fulari", pronouns: "he",
    background: "failed comedian from Lorville", seed: "Tomothy did stand-up on the munitions line until a joke about the Imperator got him fired." });
  assert.ok(comic.hooks.some((h) => /show|routine|heckler|talent agent|club/.test(h.text)), comic.hooks.map((h) => h.text).join(" | "));
});

test("the AI's rewritten hooks are used only if they keep the same person", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const ai = await import(`../src/ai.js?hooks=${Date.now()}`);
  const char = { name: "RJ Oressian", pronouns: "he", origin: "x", home: "y", story: ["s"], hooks: [{ type: "enemy", npcId: "n1", text: "old one" }, { type: "debt", npcId: "n2", text: "old two" }] };
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ paragraphs: ["Story."], hooks: ["Ada Vance still hunts RJ for the Checkmate job.", "Some stranger wants money."] }) } }] }));
  await ai.narrateOrigin(char, [], { n1: "Ada Vance", n2: "Bo Kerr" });
  assert.equal(char.hooks[0].text, "Ada Vance still hunts RJ for the Checkmate job.");
  assert.equal(char.hooks[1].text, "old two", "a rewrite that loses the named person is ignored");
  delete process.env.OPENROUTER_API_KEY;
});
