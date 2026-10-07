import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scdm-runtime-"));
process.env.DATA_FILE = path.join(dir, "db.json");
delete process.env.ANTHROPIC_API_KEY;

const store = await import("../src/store.js");
const { chunk } = await import("../src/voice.js");

test("each AI task gets only the lore it needs; the scribe parser gets none", async () => {
  const ai = await import("../src/ai.js");
  assert.ok(ai.loreSize("none") < 1000, "scribe parsing sends just the GM rules");
  assert.ok(ai.loreSize("origin") < ai.loreSize("mission"));
  assert.ok(ai.loreSize("mission") < ai.loreSize("all"));
  assert.ok(ai.loreSize("all") > 20000, "the full codex is still there for open questions");
});

test("a failing model trips the breaker: built-in text right away instead of waiting", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const ai = await import(`../src/ai.js?breaker=${Date.now()}`);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ choices: [{ message: { content: "" }, finish_reason: "stop" }] }));
  };
  const char = { name: "Test Pilot", pronouns: "they", origin: "x", home: "y", story: ["s"], hooks: [] };
  for (let i = 0; i < 3; i++) assert.equal(await ai.narrateOrigin(char, []), null);
  assert.equal(ai.aiStatus(), "paused");
  const before = calls;
  assert.equal(await ai.narrateOrigin(char, []), null);
  assert.equal(calls, before, "no request is made while paused");
  ai.resetAiBreaker();
  assert.equal(ai.aiStatus(), "on");
  delete process.env.OPENROUTER_API_KEY;
});

test("the DM starts talking quickly: the first voice chunk is short", () => {
  const long = Array.from({ length: 30 }, (_, i) => `This is sentence number ${i} of a long briefing.`).join(" ");
  const parts = chunk(long, 900, 240);
  assert.ok(parts[0].length <= 240);
  assert.ok(parts.slice(1).every((p) => p.length <= 900));
  assert.equal(parts.join(" ").replace(/\s+/g, " "), long);
});

test("click locks stop a double report", () => {
  assert.equal(store.claim("mission:abc"), true);
  assert.equal(store.claim("mission:abc"), false, "second click is refused");
  store.release("mission:abc");
  assert.equal(store.claim("mission:abc"), true);
  store.release("mission:abc");
});

test("saving keeps a daily backup, and tidy slims old finished missions but never active ones", () => {
  const g = store.guild("tidy");
  const old = new Date(Date.now() - 40 * 24 * 3600e3).toISOString();
  g.missions = {
    a: { id: "a", status: "complete", createdAt: old, briefing: "long text", characterIds: ["c"], title: "Old" },
    b: { id: "b", status: "active", createdAt: old, briefing: "keep me", characterIds: ["c"], title: "Live" },
  };
  g.drafts = { u1: { at: Date.now() - 2 * 24 * 3600e3 }, u2: { at: Date.now() } };
  store.tidy();
  assert.equal(g.missions.a.briefing, undefined);
  assert.equal(g.missions.a.title, "Old");
  assert.equal(g.missions.b.briefing, "keep me");
  assert.deepEqual(Object.keys(g.drafts), ["u2"]);
  store.saveNow();
  const backups = fs.readdirSync(path.join(dir, "backups"));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /^db-\d{4}-\d{2}-\d{2}\.json$/);
});
