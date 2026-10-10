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
