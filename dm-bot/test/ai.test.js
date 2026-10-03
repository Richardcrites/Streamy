import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENROUTER_API_KEY = "test-key";
delete process.env.ANTHROPIC_API_KEY;
const ai = await import("../src/ai.js");

const char = { name: "RJ Oressian", pronouns: "he", origin: "Pyro-Born Outlaw", career: "smuggler", home: "Ruin Station", seed: "grew up on a freighter", story: ["draft"], hooks: [{ text: "hook" }] };

test("OpenRouter: structured request, fenced JSON is parsed", async () => {
  let body;
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(opts.headers.Authorization, "Bearer test-key");
    body = JSON.parse(opts.body);
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: '```json\n{"paragraphs":["One.","Two."]}\n```' } }] }), { status: 200 });
  };
  assert.deepEqual(await ai.narrateOrigin(char), ["One.", "Two."]);
  assert.equal(body.response_format.type, "json_schema");
  assert.match(body.messages[0].content, /Game Master/);
  assert.match(ai.aiLabel(), /OpenRouter/);
});

test("OpenRouter: falls back to schema-in-prompt when structured output is rejected", async () => {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const b = JSON.parse(opts.body);
    calls.push(b);
    if (b.response_format) return new Response(JSON.stringify({ error: { message: "unsupported" } }), { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Sure! {"paragraphs":["Ok."]}' } }] }), { status: 200 });
  };
  assert.deepEqual(await ai.narrateOrigin(char), ["Ok."]);
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages[1].content, /JSON schema/);
});

test("bad or incomplete AI output falls back to the engine (null)", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"x"}' } }] }), { status: 200 });
  const out = await ai.narrateChapter({ campaign: { title: "t", endGoal: "g", tones: [] }, chapter: { title: "a", briefing: "b", transmission: { from: "f", text: "t" }, objectives: [], rpPrompt: "r" }, characters: [], worldLog: [] });
  assert.equal(out, null);
  globalThis.fetch = async () => new Response("nope", { status: 500 });
  assert.equal(await ai.narrateOrigin(char), null);
});
