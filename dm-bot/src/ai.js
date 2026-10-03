// Optional AI narrator. With an OPENROUTER_API_KEY (any model on openrouter.ai) or an
// ANTHROPIC_API_KEY (Claude directly), the DM's prose (origin stories, transmissions, briefings,
// missions, finales) is written by the model using the full lore codex and the stored story so far.
// The engine's structure (objectives, places, hooks) stays fixed so quests remain playable.
// If no key is set or a call fails, the procedural text is used.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const LORE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lore");

let client = null;
let loreText = null;

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

// The stable part of every prompt: GM rules + the whole lore codex. It's sent first and marked
// cacheable, so repeated calls (especially live chat) only pay full price for it occasionally.
function lore() {
  if (loreText !== null) return loreText;
  let files = "";
  try {
    files = fs.readdirSync(LORE_DIR)
      .filter((f) => f.endsWith(".md") && f !== "sources.md")
      .sort()
      .map((f) => `<lore_file name="${f}">\n${fs.readFileSync(path.join(LORE_DIR, f), "utf8")}\n</lore_file>`)
      .join("\n\n");
  } catch {
    // Lore folder missing: the GM still works, just with less canon to draw on.
  }
  loreText =
    "You are the Game Master for a Star Citizen roleplay community. The current in-universe year is 2956. " +
    "You write in-character transmissions, origin stories, missions and scenes that players act out inside the " +
    "real game. Stay consistent with the canon lore below and with the story so far you are given. Never invent " +
    "game mechanics, locations or mission types beyond those in the structure you are handed. Keep NPC names and " +
    "facts from the input exactly as given. Use the pronouns given for each character.\n\n" + files;
  return loreText;
}

// ── Transport ────────────────────────────────────────────────────────────────
// system: [stableText, variableText]. messages: [{role: "user"|"assistant", content}].
async function complete({ system, messages, schema, maxTokens = 4000 }) {
  return provider() === "openrouter"
    ? openRouter({ system, messages, schema, maxTokens })
    : anthropic({ system, messages, schema });
}

async function anthropic({ system, messages, schema }) {
  const blocks = [{ type: "text", text: system[0], cache_control: { type: "ephemeral" } }];
  if (system[1]) blocks.push({ type: "text", text: system[1] });
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: schema ? { effort: "medium", format: { type: "json_schema", schema } } : { effort: "medium" },
    system: blocks,
    messages,
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim() || null;
}

// OpenRouter speaks the OpenAI chat-completions format. First attempt: cacheable system block and
// structured output. Models/providers that reject either get a plain retry (schema in the prompt).
async function openRouter({ system, messages, schema, maxTokens }) {
  const request = async (fancy) => {
    const sys = fancy
      ? [{ type: "text", text: system[0], cache_control: { type: "ephemeral" } }, ...(system[1] ? [{ type: "text", text: system[1] }] : [])]
      : system.filter(Boolean).join("\n\n");
    const msgs = messages.map((m) => ({ ...m }));
    if (schema && !fancy) {
      const last = msgs[msgs.length - 1];
      last.content += `\n\nReply with only a JSON object (no code fences, no commentary) matching this JSON schema:\n${JSON.stringify(schema)}`;
    }
    const body = { model: OPENROUTER_MODEL, max_tokens: maxTokens, messages: [{ role: "system", content: sys }, ...msgs] };
    if (schema && fancy) body.response_format = { type: "json_schema", json_schema: { name: "dm_output", strict: true, schema } };
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
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
    return choice.message?.content?.trim() || null;
  };
  try {
    return await request(true);
  } catch (err) {
    if (err.status === 400 || err.status === 422) return request(false);
    throw err;
  }
}

function logFailure(what, err) {
  const where = provider() === "openrouter" ? "OpenRouter" : "Anthropic";
  if (err.status === 401) console.warn(`[ai] ${where} rejected the API key (401). Check the key in your .env file. Using built-in text for now.`);
  else console.warn(`[ai] ${what} failed (${where}):`, err.status ?? "", err.message);
}

// Returns parsed JSON matching `schema`, or null if AI is off or the call fails.
async function generate(task, payload, schema, extraSystem = "", { lenient = false } = {}) {
  if (!aiEnabled()) return null;
  try {
    const text = await complete({
      system: [lore(), extraSystem],
      messages: [{ role: "user", content: `${task}\n\n<input>\n${JSON.stringify(payload, null, 2)}\n</input>` }],
      schema,
    });
    const out = parseJson(text);
    if (matchesSchema(out, schema, lenient)) return out;
    console.warn(`[ai] ${task.slice(0, 40)}… the model's answer was ${text ? "missing fields" : "empty"}; using built-in text. Try a different OPENROUTER_MODEL if this keeps happening.`);
    return null;
  } catch (err) {
    logFailure(task.slice(0, 40), err);
    return null;
  }
}

// Light shape check so a model that skips a field falls back to the procedural text.
function matchesSchema(value, schema, lenient = false) {
  if (!value || typeof value !== "object") return false;
  return (schema.required || []).every((key) => {
    const type = schema.properties[key]?.type;
    const v = value[key];
    if (type === "string") return typeof v === "string" && (lenient || v.trim().length > 0);
    if (type === "array") return Array.isArray(v) && (lenient || v.length > 0);
    return v !== undefined;
  });
}

function parseJson(text) {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const str = { type: "string" };
const obj = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

const charBrief = (c) => ({
  name: c.name, pronouns: c.pronouns, origin: c.origin, career: c.careerLabel || c.career,
  open_hooks: c.hooks.filter((h) => h.status === "open").map((h) => h.text),
  recent_journal: c.journal.slice(-6).map((j) => j.text),
  active_conditions: (c.conditions || []).filter((x) => x.status === "active").map((x) => `${x.kind}: ${x.text} (${x.severity}; clears: ${x.clears})`),
});

// ── Narration (one-shot JSON) ────────────────────────────────────────────────
export async function narrateOrigin(character) {
  const out = await generate(
    "Write this character's origin story as 3–5 short paragraphs. Use every fact and both hooks (the hooks are " +
      "threads that later stories will pull on, so end with them unresolved). If the player wrote a seed in their " +
      "own words, honour it. Use the full name once, then the short name or pronouns.",
    {
      name: character.name, pronouns: character.pronouns, origin: character.origin, career: character.career,
      home: character.home, player_seed: character.seed, draft: character.story, hooks: character.hooks.map((h) => h.text),
    },
    obj({ paragraphs: { type: "array", items: str } }),
  );
  return out?.paragraphs?.length ? out.paragraphs : null;
}

export async function narrateChapter({ campaign, chapter, characters, worldLog, canon = [] }) {
  return generate(
    "Write the next chapter of this campaign. Keep every objective's activity and place exactly. You are only " +
      "writing flavour for them. The transmission is an in-character comms message from the patron NPC. " +
      "Write exactly three choices in the same order and tone (honor, pragmatic, ruthless). Each one has a short " +
      "button label (max 40 characters) and an outcome paragraph. Tie in the linked hook if there is one, and the " +
      "story so far.",
    {
      campaign: { title: campaign.title, end_goal: campaign.endGoal, act: chapter.title, beat: chapter.briefing, choices_so_far: campaign.tones },
      characters: characters.map(charBrief),
      skeleton: { transmission_from: chapter.transmission.from, transmission: chapter.transmission.text, objectives: chapter.objectives.map((o) => ({ for: o.characterName, activity: o.activity, place: o.place, text: o.text })), rp_prompt: chapter.rpPrompt },
      world_log: worldLog.slice(-8).map((w) => w.text),
      server_canon: canon,
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
      campaign: { title: campaign.title, end_goal: campaign.endGoal, chapters: campaign.chapters.map((c) => ({ title: c.title, outcome: c.result?.outcome, recap: c.result?.recap })) },
      ending: finale,
      characters: characters.map((c) => ({ name: c.name, pronouns: c.pronouns, origin: c.origin })),
    },
    obj({ finale: str, epilogue: str }),
  );
}

export async function narrateMission({ mission, characters, worldLog, persona, canon = [] }) {
  return generate(
    "Write this one-shot mission in the persona's voice. It is played in Star Citizen and roleplayed in voice chat, " +
      "so DO NOT script scenes, dialogue or what the players do: give them a situation, stakes and a reason to care, and " +
      "let the play happen naturally. The heart of it is how the crew's personal stories intertwine: use the crossing " +
      "facts and the characters' hooks so each player has a personal reason to be there. Hard rules: the only named " +
      "people you may mention are the crew and the names in `allowed_names`. Never invent other named characters. " +
      "Keep every objective's activity and place exactly; you only write one line of flavour for each. 'briefing' is " +
      "2 short paragraphs spoken by the persona. 'crossing' explains in 2–4 sentences how the crew's stories connect. " +
      "'stakes' is 1–2 sentences. 'twist' is a secret revealed only at the end; make it land on the crossing. " +
      "If a character carries an active condition (injury, ship damage, warrant), let it matter: mention it in the briefing or stakes. " +
      "Respect server_canon: it is what has already happened on this server.",
    {
      persona,
      mission: { type: mission.typeLabel, system: mission.system, antagonist: mission.antagonist, person_at_the_centre: mission.target, draft_briefing: mission.briefing, draft_stakes: mission.stakes, objectives: mission.objectives.map((o) => ({ for: o.characterName, activity: o.activity, place: o.place, text: o.text })) },
      crossing_facts: mission.crossings,
      allowed_names: mission.names,
      characters: characters.map(charBrief),
      world_log: worldLog.slice(-8).map((w) => w.text),
      server_canon: canon,
    },
    obj({ title: str, briefing: str, crossing: str, objective_flavour: { type: "array", items: str }, stakes: str, twist: str }),
  );
}

export async function narrateMissionEnd({ mission, success, notes, characters, persona }) {
  return generate(
    "The crew has finished this mission. Only mention the crew and the allowed names. In the persona's voice, reveal the twist (if it hasn't come out already) " +
      "and write a short epilogue (one or two paragraphs) on what it means for them. Base it on the outcome and on " +
      "the players' notes about what they actually did. Don't contradict the notes. Then write one journal line per character.",
    {
      persona,
      mission: { title: mission.title, briefing: mission.briefing, crossing: mission.crossings, twist: mission.twist, antagonist: mission.antagonist, person_at_the_centre: mission.target },
      allowed_names: mission.names,
      outcome: success ? "success" : "failure",
      player_notes: notes || "(none)",
      characters: characters.map((c) => ({ name: c.name, pronouns: c.pronouns })),
    },
    obj({ epilogue: str, journal: { type: "array", items: obj({ name: str, entry: str }) } }),
    "",
    { lenient: true },
  );
}

// ── Scribe: turn a quick, messy play update into structured records ──────────
const KINDS = ["injury", "ship", "legal", "other", "clear", "journal", "location"];
export async function parseScribe({ text, author, characters, missionTitle }) {
  return generate(
    "A player acting as scribe typed this quick update during a Star Citizen roleplay session. Extract what changed. " +
      "kind: injury / ship (damage or limits on a ship) / legal (CrimeStat, warrants, fines) / other (a lasting " +
      "condition) / clear (an existing condition is fixed; set condition_id from the list) / journal (something a " +
      "character did worth remembering) / location (where a character now is; put the place in text). " +
      "For conditions, write a short text, a severity (minor/major/critical) and how it clears in-game " +
      "(e.g. 'land at the nearest planet and repair', 'med bed'). Use the character names exactly as listed; if the " +
      "update says 'we' or 'everyone', add an entry per character involved. 'lore' is anything new about the world " +
      "(an NPC's secret, a discovered place, a new rivalry) worth keeping as server canon; usually empty. 'summary' is " +
      "one short line, in plain words, of what you recorded. Don't invent anything that isn't in the update. Use empty " +
      "strings for fields that don't apply.",
    { update: text, typed_by: author, current_mission: missionTitle || null, characters },
    obj({
      updates: {
        type: "array",
        items: obj({ character: str, kind: { type: "string", enum: KINDS }, text: str, severity: { type: "string", enum: ["minor", "major", "critical", ""] }, clears: str, condition_id: str }),
      },
      lore: { type: "array", items: str },
      summary: str,
    }),
    "",
    { lenient: true },
  );
}
