// Optional AI narrator. With an OPENROUTER_API_KEY (any model on openrouter.ai) or an
// ANTHROPIC_API_KEY (Claude directly), the DM's prose (origin stories, transmissions, chapter
// briefings, finales) is rewritten by the model using the full lore codex and the stored story
// so far. The engine's structure (objectives, places, hooks) stays fixed so quests remain
// playable. If no key is set or a call fails, the procedural text is used.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const LORE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lore");

let client = null;
let systemPrompt = null;

// An OpenRouter key (sk-or-…) pasted into ANTHROPIC_API_KEY is a common mix-up: route it to OpenRouter.
if (!process.env.OPENROUTER_API_KEY && process.env.ANTHROPIC_API_KEY?.trim().startsWith("sk-or-")) {
  process.env.OPENROUTER_API_KEY = process.env.ANTHROPIC_API_KEY.trim();
  delete process.env.ANTHROPIC_API_KEY;
}

const provider = () =>
  process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : process.env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : null;

export const aiEnabled = () => provider() !== null;

export const aiLabel = () =>
  ({ openrouter: `OpenRouter (${OPENROUTER_MODEL})`, anthropic: `Claude (${MODEL})` })[provider()] || "built-in lore engine";

function getClient() {
  client ??= new Anthropic();
  return client;
}

function loadLore() {
  try {
    return fs.readdirSync(LORE_DIR)
      .filter((f) => f.endsWith(".md") && f !== "sources.md")
      .sort()
      .map((f) => `<lore_file name="${f}">\n${fs.readFileSync(path.join(LORE_DIR, f), "utf8")}\n</lore_file>`)
      .join("\n\n");
  } catch {
    return "";
  }
}

function getSystem() {
  systemPrompt ??= [
    {
      type: "text",
      text:
        "You are the Game Master for a Star Citizen roleplay community. The current in-universe year is 2956. " +
        "You write in-character transmissions, origin stories, chapter briefings and finales that players act out " +
        "inside the real game. Stay consistent with the canon lore below and with the story so far you are given. " +
        "Never invent game mechanics, locations or mission types beyond those in the structure you are handed. " +
        "Write vivid, grounded sci-fi prose in short paragraphs that read well in Discord. Keep NPC names and facts " +
        "from the input exactly as given. Use the pronouns given for each character.\n\n" +
        loadLore(),
      cache_control: { type: "ephemeral" },
    },
  ];
  return systemPrompt;
}

// Returns parsed JSON matching `schema`, or null if AI is off or the call fails.
async function generate(task, payload, schema) {
  const which = provider();
  if (!which) return null;
  const prompt = `${task}\n\n<input>\n${JSON.stringify(payload, null, 2)}\n</input>`;
  try {
    const out = which === "openrouter" ? await viaOpenRouter(prompt, schema) : await viaAnthropic(prompt, schema);
    return matchesSchema(out, schema) ? out : null;
  } catch (err) {
    const where = which === "openrouter" ? "OpenRouter" : "Anthropic";
    if (err.status === 401) console.warn(`[ai] ${where} rejected the API key (401). Check the key in your .env file. Using built-in text for now.`);
    else if (err instanceof Anthropic.APIError) console.warn(`[ai] Anthropic call failed: ${err.status} ${err.message}`);
    else console.warn(`[ai] ${where} call failed:`, err.message);
    return null;
  }
}

async function viaAnthropic(prompt, schema) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: getSystem(),
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  const text = response.content.find((b) => b.type === "text")?.text;
  return text ? JSON.parse(text) : null;
}

// OpenRouter speaks the OpenAI chat-completions format. Structured output is requested with
// response_format; models that don't support it get the schema in the prompt instead.
async function viaOpenRouter(prompt, schema) {
  const call = async (structured) => {
    const body = {
      model: OPENROUTER_MODEL,
      max_tokens: 4000,
      messages: [
        { role: "system", content: getSystem()[0].text },
        {
          role: "user",
          content: structured
            ? prompt
            : `${prompt}\n\nReply with only a JSON object (no code fences, no commentary) matching this JSON schema:\n${JSON.stringify(schema)}`,
        },
      ],
    };
    if (structured) body.response_format = { type: "json_schema", json_schema: { name: "dm_output", strict: true, schema } };
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "Star Citizen DM Bot",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`OpenRouter ${res.status}: ${json.error?.message ?? res.statusText}`), { status: res.status });
    const choice = json.choices?.[0];
    if (!choice || choice.finish_reason === "length") return null;
    return parseJson(choice.message?.content);
  };
  try {
    return await call(true);
  } catch (err) {
    // 400/422 usually means this model doesn't support structured output: retry with the schema in the prompt.
    if (err.status === 400 || err.status === 422) return call(false);
    throw err;
  }
}

// Light shape check so a model that skips a field falls back to the procedural text.
function matchesSchema(value, schema) {
  if (!value || typeof value !== "object") return false;
  return (schema.required || []).every((key) => {
    const type = schema.properties[key]?.type;
    const v = value[key];
    if (type === "string") return typeof v === "string" && v.trim().length > 0;
    if (type === "array") return Array.isArray(v) && v.length > 0;
    return v !== undefined;
  });
}

function parseJson(text) {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? JSON.parse(cleaned.slice(start, end + 1)) : null;
}

const str = { type: "string" };
const obj = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export async function narrateOrigin(character) {
  const out = await generate(
    "Write this character's origin story as 3–5 short paragraphs. Use every fact and both hooks (the hooks are " +
      "threads that later stories will pull on, so end with them unresolved). If the player wrote a seed in their " +
      "own words, honour it.",
    {
      name: character.name, pronouns: character.pronouns, origin: character.origin, career: character.career,
      home: character.home, player_seed: character.seed, draft: character.story, hooks: character.hooks.map((h) => h.text),
    },
    obj({ paragraphs: { type: "array", items: str } }),
  );
  return out?.paragraphs?.length ? out.paragraphs : null;
}

export async function narrateChapter({ campaign, chapter, characters, worldLog }) {
  return generate(
    "Write the next chapter of this campaign. Keep every objective's activity and place exactly. You are only " +
      "writing flavour for them. The transmission is an in-character comms message from the patron NPC. " +
      "Write exactly three choices in the same order and tone (honor, pragmatic, ruthless). Each one has a short " +
      "button label (max 40 characters) and an outcome paragraph. Tie in the linked hook if there is one, and the " +
      "story so far.",
    {
      campaign: { title: campaign.title, end_goal: campaign.endGoal, act: chapter.title, beat: chapter.briefing, choices_so_far: campaign.tones },
      characters: characters.map((c) => ({ name: c.name, pronouns: c.pronouns, origin: c.origin, career: c.career, open_hooks: c.hooks.filter((h) => h.status === "open").map((h) => h.text), recent_journal: c.journal.slice(-6).map((j) => j.text) })),
      skeleton: { transmission_from: chapter.transmission.from, transmission: chapter.transmission.text, objectives: chapter.objectives.map((o) => ({ for: o.characterName, activity: o.activity, place: o.place, text: o.text })), rp_prompt: chapter.rpPrompt },
      world_log: worldLog.slice(-8).map((w) => w.text),
    },
    obj({
      title: str,
      transmission: str,
      briefing: str,
      objective_flavour: { type: "array", items: str },
      rp_prompt: str,
      choices: { type: "array", items: obj({ label: str, outcome: str }) },
    }),
  );
}

export async function narrateFinale({ campaign, finale, characters }) {
  return generate(
    "Write the finale of this campaign. The ending's tone was decided by the players' choices and must stay as given. " +
      "Write a dramatic finale scene and a short epilogue for each character.",
    {
      campaign: { title: campaign.title, end_goal: campaign.endGoal, chapters: campaign.chapters.map((c) => ({ title: c.title, outcome: c.result?.outcome })) },
      ending: finale,
      characters: characters.map((c) => ({ name: c.name, pronouns: c.pronouns, origin: c.origin })),
    },
    obj({ finale: str, epilogue: str }),
  );
}
