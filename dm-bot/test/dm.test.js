import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(os.tmpdir(), `scdm-dm-${process.pid}.json`);
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENROUTER_API_KEY;

const store = await import("../src/store.js");
const story = await import("../src/engine/story.js");
const dm = await import("../src/handlers/dm.js");
const rec = await import("../src/engine/records.js");

function char(g) {
  const c = story.buildCharacter(g, { ownerId: "u1", originId: "pyro_outlaw", career: null, name: "RJ Oressian", pronouns: "he", seed: "RJ grew up running cargo out of Ruin Station for his uncle, until the Headhunters burned the ship." });
  g.characters[c.id] = c;
  g.activeChar.u1 = c.id;
  return c;
}

test("buffs and debuffs need an in-game effect, and are lifted by what the player reports", () => {
  const g = store.guild(`dm-${Math.random()}`);
  const c = char(g);
  const changes = dm.applyTurn(g, c, "took the bounty, ate some street food at Ruin", {
    narration: "The food fights back.", next_prompt: "What next?",
    buffs_debuffs: [
      { kind: "debuff", text: "Bad food", effect: "No sprinting until you've rested.", lifts: "rest" },
      { kind: "buff", text: "Feels lucky", effect: "", lifts: "job" }, // no in-game effect: ignored
    ],
  });
  assert.equal(changes.added.length, 1);
  assert.equal(rec.activeConditions(c)[0].effect, "No sprinting until you've rested.");
  const later = dm.applyTurn(g, c, "logged out in the bed at Ruin and slept it off", { narration: "Morning.", next_prompt: "Next?" });
  assert.equal(later.lifted.length, 1, "resting lifts a rest debuff");
  assert.equal(rec.activeConditions(c).length, 0);
});

test("consequences, threads, memories and job offers are remembered; payouts are never stated", () => {
  const g = store.guild(`dm2-${Math.random()}`);
  const c = char(g);
  const out = {
    narration: "Hurston's people pay you 25,000 aUEC to forget it.", next_prompt: "Where to?",
    faction_changes: [{ name: "Hurston Dynamics", change: "locked", reason: "you worked for their rival" }],
    place_changes: [{ place: "Lorville", change: "off_limits", reason: "a body in a hangar" }],
    new_threads: ["Who paid the Headhunters to burn the ship?"],
    flashback: "The smell of burning coolant. His uncle's hand on his shoulder.",
    mission_type: "salvage", mission_where: "the Derelict Outpost on Fuego", mission_why: "The ship's black box went there.", armor: "medium armor", item_to_buy: "a tractor beam",
  };
  dm.applyTurn(g, c, "turned in the cargo", out);
  assert.doesNotMatch(out.narration, /aUEC|25,000/);
  assert.equal(rec.activeLockouts(c).length, 2);
  assert.equal(c.threads[0].text, "Who paid the Headhunters to burn the ship?");
  assert.equal(c.memories.length, 1);
  assert.equal(c.dmOffer.type, "salvage");
  const ctx = dm.buildContext(g, c);
  assert.deepEqual(ctx.character.memories_already_revealed, ["The smell of burning coolant. His uncle's hand on his shoulder."]);
  assert.equal(ctx.rest.recent_turns.length, 1);
  const embed = dm.turnEmbed(g, c, out, { added: [], lifted: [], lockouts: rec.activeLockouts(c), unlocked: [], threads: [] }, true).toJSON();
  assert.ok(embed.fields.some((f) => /A job: salvage/.test(f.name) && /tractor beam/.test(f.value) && /Medium armor/i.test(f.value)));
  assert.match(embed.description, /Where to\?/, "every turn ends with what's next");
});

test("the AI DM gets the rules, the backstory and the memory, and its answer is applied", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const g = store.guild(`dm3-${Math.random()}`);
  const c = char(g);
  let sent;
  globalThis.fetch = async (u, o) => {
    sent = JSON.parse(o.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      narration: "The hangar lights flicker as you land. Someone has scratched a symbol into your landing gear.",
      next_prompt: "Do you report it, or go looking?", random_event: "", intel: "", flashback: "",
      mission_type: "", mission_where: "", mission_why: "", armor: "", item_to_buy: "",
      buffs_debuffs: [{ kind: "debuff", text: "Damaged landing gear", effect: "Land gently: no hard landings until repaired.", lifts: "repair" }],
      lifted: [], faction_changes: [], place_changes: [], new_threads: ["Who marked the landing gear?"], resolved_threads: [],
    }) } }] }));
  };
  const turn = await dm.takeTurn(g, c, "landed at Checkmate after the bounty");
  const system = JSON.stringify(sent.messages[0].content);
  assert.match(system, /Never repeat back what the player just said/);
  assert.match(system, /mission TYPES only/);
  assert.match(sent.messages.at(-1).content, /Ruin Station for his uncle/, "the backstory goes to the DM");
  assert.equal(rec.activeConditions(c)[0].text, "Damaged landing gear");
  assert.match(turn.embed.toJSON().description, /Do you report it/);
  assert.match(turn.spoken, /hangar lights/);
  delete process.env.OPENROUTER_API_KEY;
});

test("without AI, the built-in DM still keeps the report and sometimes rolls an effect you can act out", () => {
  const g = store.guild(`dm4-${Math.random()}`);
  const c = char(g);
  const out = dm.builtInTurn(c, "did a salvage job", () => 0.05);
  assert.equal(out.buffs_debuffs[0].kind, "debuff");
  assert.ok(out.buffs_debuffs[0].effect.length > 10);
  assert.ok(out.next_prompt.endsWith("?"));
  dm.applyTurn(g, c, "did a salvage job", out);
  assert.equal(c.dmLog.length, 1);
});
