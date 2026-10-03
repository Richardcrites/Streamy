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
  assert.match(JSON.stringify(body.messages[0].content), /Game Master/);
  assert.equal(body.messages[0].content[0].cache_control.type, "ephemeral");
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

test("an OpenRouter key on the ANTHROPIC_API_KEY line is routed to OpenRouter", async () => {
  delete process.env.OPENROUTER_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-or-v1-mixup";
  const fresh = await import(`../src/ai.js?mixup=${Date.now()}`);
  let auth;
  globalThis.fetch = async (url, opts) => {
    auth = opts.headers.Authorization;
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"paragraphs":["Ok."]}' } }] }), { status: 200 });
  };
  assert.deepEqual(await fresh.narrateOrigin(char), ["Ok."]);
  assert.equal(auth, "Bearer sk-or-v1-mixup");
  assert.match(fresh.aiLabel(), /OpenRouter/);
});

test("OpenRouter: an empty answer (reasoning model) is retried in simple mode with more room", async () => {
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.ANTHROPIC_API_KEY;
  const fresh = await import(`../src/ai.js?empty=${Date.now()}`);
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const b = JSON.parse(opts.body);
    calls.push(b);
    if (calls.length === 1) return new Response(JSON.stringify({ model: "some/thinker", choices: [{ finish_reason: "length", message: { content: "", reasoning: "hmm..." } }] }));
    return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: [{ type: "text", text: '{"paragraphs":["Recovered."]}' }] } }] }));
  };
  assert.deepEqual(await fresh.narrateOrigin(char), ["Recovered."]);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].max_tokens > calls[0].max_tokens, "retry gets more room");
  assert.equal(calls[1].response_format, undefined, "retry is plain mode");
  assert.equal(typeof calls[1].messages[0].content, "string");
});

test("OpenRouter: still empty after the retry falls back to built-in text", async () => {
  const fresh = await import(`../src/ai.js?empty2=${Date.now()}`);
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: null } }] }));
  assert.equal(await fresh.narrateOrigin(char), null);
});

test("mission AI rewrites stop reasons only when the count matches; zero stops is fine", async () => {
  const fresh = await import(`../src/ai.js?stops=${Date.now()}`);
  const mission = { typeLabel: "Heist", system: "Pyro", antagonist: "A", target: "B", briefing: "", stakes: "", names: ["A", "B"], crossings: [], anchor: {}, rendezvous: "Ruin Station", objectives: [], stops: [] };
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: "T", briefing: "B", crossing: "C", objective_flavour: ["x"], stakes: "S", twist: "W", stop_reasons: [] }) } }] }));
  const out = await fresh.narrateMission({ mission, characters: [], worldLog: [], persona: "p" });
  assert.equal(out?.title, "T", "an empty stop list must not throw the mission away");
});

test("origin AI is told to write something new and shown the other characters' stories", async () => {
  const fresh = await import(`../src/ai.js?origin=${Date.now()}`);
  let input;
  globalThis.fetch = async (u, o) => {
    const t = JSON.parse(o.body).messages.at(-1).content;
    input = { task: t.split("<input>")[0], data: JSON.parse(t.split("<input>")[1].split("</input>")[0]) };
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"paragraphs":["New."]}' } }] }));
  };
  await fresh.narrateOrigin(char, ["RJ Oressian: born on Ruin Station..."]);
  assert.match(input.task, /fresh, original story/);
  assert.match(input.task, /Do NOT reuse/);
  assert.deepEqual(input.data.other_characters_on_this_server, ["RJ Oressian: born on Ruin Station..."]);
});
