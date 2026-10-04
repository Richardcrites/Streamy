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
// Optional comma-separated backups, tried by OpenRouter when the main model fails or comes back empty.
const OPENROUTER_FALLBACKS = (process.env.OPENROUTER_FALLBACK_MODELS || "").split(",").map((m) => m.trim()).filter(Boolean);
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
async function complete({ system, messages, schema, maxTokens = 8000 }) {
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
  // fancy = cacheable system block + structured output. plain = one system string, schema in the prompt.
  const request = async (fancy, tokens) => {
    const sys = fancy
      ? [{ type: "text", text: system[0], cache_control: { type: "ephemeral" } }, ...(system[1] ? [{ type: "text", text: system[1] }] : [])]
      : system.filter(Boolean).join("\n\n");
    const msgs = messages.map((m) => ({ ...m }));
    if (schema && !fancy) {
      const last = msgs[msgs.length - 1];
      last.content += `\n\nReply with only a JSON object (no code fences, no commentary) matching this JSON schema:\n${JSON.stringify(schema)}`;
    }
    const body = { model: OPENROUTER_MODEL, max_tokens: tokens, messages: [{ role: "system", content: sys }, ...msgs] };
    // On the retry, let OpenRouter fall through to the backup models.
    if (!fancy && OPENROUTER_FALLBACKS.length) body.models = [OPENROUTER_MODEL, ...OPENROUTER_FALLBACKS].slice(0, 3);
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
    const raw = choice?.message?.content;
    // Some providers return content as an array of parts.
    const text = (Array.isArray(raw) ? raw.map((p) => p?.text ?? "").join("") : raw ?? "").trim();
    return {
      text: choice?.finish_reason === "length" ? "" : text,
      why: `model ${json.model ?? OPENROUTER_MODEL}, finish "${choice?.finish_reason ?? choice?.native_finish_reason ?? "none"}"` +
        (choice?.message?.reasoning ? ", it spent its answer on reasoning" : "") +
        (json.error ? `, error: ${json.error.message ?? JSON.stringify(json.error)}` : ""),
    };
  };

  let first;
  try {
    first = await request(true, maxTokens);
  } catch (err) {
    if (err.status !== 400 && err.status !== 422) throw err;
    first = { text: "", why: `rejected the request format (${err.status})` };
  }
  if (first.text) return first.text;
  // Empty or cut off: retry once in plain mode with more room.
  console.warn(`[ai] OpenRouter gave an empty answer (${first.why}). Retrying in simple mode…`);
  const second = await request(false, Math.min(maxTokens * 2, 16000));
  if (!second.text) console.warn(`[ai] Still empty (${second.why}). Set OPENROUTER_MODEL in .env to a specific model (see README).`);
  return second.text || null;
}

function logFailure(what, err) {
  const where = provider() === "openrouter" ? "OpenRouter" : "Anthropic";
  if (err.status === 401) console.warn(`[ai] ${where} rejected the API key (401). Check the key in your .env file. Using built-in text for now.`);
  else console.warn(`[ai] ${what} failed (${where}):`, err.status ?? "", err.message);
}

// Returns parsed JSON matching `schema`, or null if AI is off or the call fails.
async function generate(task, payload, schema, extraSystem = "", { lenient = false, allowEmpty = [] } = {}) {
  if (!aiEnabled()) return null;
  try {
    const text = await complete({
      system: [lore(), extraSystem],
      messages: [{ role: "user", content: `${task}\n\n<input>\n${JSON.stringify(payload, null, 2)}\n</input>` }],
      schema,
    });
    const out = parseJson(text);
    if (matchesSchema(out, schema, lenient, allowEmpty)) return out;
    console.warn(`[ai] ${task.slice(0, 40)}… the model's answer was ${text ? "missing fields" : "empty"}; using built-in text. Try a different OPENROUTER_MODEL if this keeps happening.`);
    return null;
  } catch (err) {
    logFailure(task.slice(0, 40), err);
    return null;
  }
}

// Light shape check so a model that skips a field falls back to the procedural text.
function matchesSchema(value, schema, lenient = false, allowEmpty = []) {
  if (!value || typeof value !== "object") return false;
  return (schema.required || []).every((key) => {
    const type = schema.properties[key]?.type;
    const v = value[key];
    const empty = lenient || allowEmpty.includes(key);
    if (type === "string") return typeof v === "string" && (empty || v.trim().length > 0);
    if (type === "array") return Array.isArray(v) && (empty || v.length > 0);
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
  name: c.name, pronouns: c.pronouns, origin: c.origin, player_description: c.seed || undefined, preferred_crew_role: c.preferredRole || "auto",
  open_hooks: c.hooks.filter((h) => h.status === "open").map((h) => h.text),
  recent_journal: c.journal.slice(-6).map((j) => j.text),
  active_conditions: (c.conditions || []).filter((x) => x.status === "active").map((x) => `${x.kind}: ${x.text} (${x.severity}; clears: ${x.clears})`),
});

// ── Narration (one-shot JSON) ────────────────────────────────────────────────
export async function narrateOrigin(character, otherStories = []) {
  const out = await generate(
    "Write this character's origin story as 3–5 short paragraphs. If player_description is set, it is the heart of " +
      "the character and the most important instruction here: build the whole story around it, make it obvious in the " +
      "first two paragraphs, and drop anything in the draft that contradicts it (example: \"a failed comedian who made " +
      "too many UEE jokes\" means we see the act, the jokes and the night it all went wrong). The draft is only a rough " +
      "sketch of facts: write a fresh, original story, not a polish of it. Invent specific, personal details (a family " +
      "member, a first ship, a place, a habit, a scar) and a turning point that belongs to this character alone. Weave in both " +
      "hooks and end with them unresolved; later stories pull on them. Do NOT reuse the plots, events or phrasing of " +
      "the other characters' stories listed in other_characters_on_this_server. Use the full name once, then the short " +
      "name or pronouns.",
    {
      player_description: character.seed || null, name: character.name, pronouns: character.pronouns,
      origin: character.origin, home: character.home, draft: character.story, hooks: character.hooks.map((h) => h.text),
      other_characters_on_this_server: otherStories,
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

export async function narrateMission({ mission, characters, worldLog, persona, canon = [], saga = null }) {
  return generate(
    "Write this one-shot mission in the persona's voice. It is played in Star Citizen and roleplayed in voice chat, " +
      "so DO NOT script scenes, dialogue or what the players do: give them a situation, stakes and a reason to care, and " +
      "let the play happen naturally. The heart of it is how the crew's personal stories intertwine: use the crossing " +
      "facts and the characters' hooks so each player has a personal reason to be there. Hard rules: the only named " +
      "people you may mention are the crew and the names in `allowed_names`. Never invent other named characters. " +
      "The crew plays it through ONE real shared contract (shared_contract), whose destination stands in for the story's " +
      "location. Keep it exactly; never invent other contracts or mission names. Each crew member has a different crew " +
      "role (crew_roles); 'objective_flavour' is one short line per crew member, in order, saying what their role means " +
      "on THIS job, tied to their story. 'briefing' is " +
      "2 short paragraphs spoken by the persona. 'crossing' explains how the crew's stories connect: 2–4 sentences for a small crew; " +
      "for a big crew, one short sentence per crew member, so EVERY person has a personal stake and a tie to someone else on the crew. " +
      "'stakes' is 1–2 sentences. 'twist' is a secret revealed only at the end; make it land on the crossing. " +
      "If a character carries an active condition (injury, ship damage, warrant), let it matter: mention it in the briefing or stakes. " +
      "Respect server_canon: it is what has already happened on this server. " +
      "'stop_reasons' has exactly one entry per stop in stops_on_the_way, in order: a vivid, specific reason the crew " +
      "MUST stop there, tied to the story, the crossing or a character's condition (2 sentences max). Don't change the " +
      "place or the action; a stop forced by a crew condition must keep that condition as its reason. Make at least " +
      "one stop carry action or danger when it fits. If `saga` is set, this job is a chapter of the server's long story: " +
      "give it that purpose. The briefing should make clear why this place and this contract matter to the saga, tie it to " +
      "what the characters have already learned about themselves, and foreshadow (never reveal) the clue. For a finale, " +
      "the twist IS saga.this_mission.the_big_reveal, told so it lands on every character. Everything must be doable in the real game.",
    {
      persona,
      mission: { type: mission.typeLabel, system: mission.system, antagonist: mission.antagonist, person_at_the_centre: mission.target, draft_briefing: mission.briefing, draft_stakes: mission.stakes, shared_contract: mission.anchor, meet_at: mission.rendezvous, crew_roles: mission.objectives.map((o) => ({ for: o.characterName, role: o.roleLabel || o.activity, job: o.text, chosen_because: o.why })), stops_on_the_way: (mission.stops || []).map((st) => ({ place: st.place, draft_reason: st.reason, action: st.action, forced_by_crew_condition: st.forced })) },
      crossing_facts: mission.crossings,
      allowed_names: [...mission.names, ...(mission.sagaNames || [])],
      saga,
      characters: characters.map(charBrief),
      world_log: worldLog.slice(-8).map((w) => w.text),
      server_canon: canon,
    },
    obj({ title: str, briefing: str, crossing: str, objective_flavour: { type: "array", items: str }, stakes: str, twist: str, stop_reasons: { type: "array", items: str } }),
    "",
    { allowEmpty: ["stop_reasons"] },
  );
}

export async function narrateMissionEnd({ mission, success, notes, characters, persona, sagaResult = null }) {
  return generate(
    "The crew has finished this mission. Only mention the crew and the allowed names. In the persona's voice, reveal the twist (if it hasn't come out already) " +
      "and write a short epilogue (one or two paragraphs) on what it means for them. Base it on the outcome and on " +
      "the players' notes about what they actually did. Don't contradict the notes. If saga_result is set, the job moved " +
      "the server's long story: work what was revealed (the clue, a character's personal secret, or for a finale the big " +
      "reveal that ties the crew together) into the epilogue. Then write one journal line per character.",
    {
      persona,
      mission: { title: mission.title, briefing: mission.briefing, crossing: mission.crossings, twist: mission.twist, antagonist: mission.antagonist, person_at_the_centre: mission.target },
      allowed_names: [...mission.names, ...(mission.sagaNames || [])],
      outcome: success ? "success" : "failure",
      player_notes: notes || "(none)",
      saga_result: sagaResult,
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

// ── Questions: players ask the DM anything ───────────────────────────────────
export async function askDM({ question, persona, asker, mission, characters, canon, guide, rules, share, saga = null }) {
  if (!aiEnabled()) return null;
  const context =
    `${persona}\n\n` +
    "A player is asking you a question, out of game or in character. Answer in your persona's voice, briefly " +
    "(under 120 words), practically and truthfully. For 'which contract' questions, point to the mission's shared " +
    "contract first: which Contract Manager tab, what it stands in for in the story, and how to share it with the " +
    "party. Only name contract tabs and givers that appear in the contract guide; if you're not sure something exists " +
    "in the current patch, say so instead of inventing it. Don't reveal the mission's secret twist.\n\n" +
    `CONTRACT GUIDE (by objective type): ${JSON.stringify(guide)}\n` +
    `SHARING A CONTRACT: ${share}\n` +
    `GAME-AS-RP RULES: ${JSON.stringify(rules)}\n` +
    `SERVER CANON: ${JSON.stringify(canon)}\n` +
    `ASKED BY: ${asker || "a player"}\n` +
    `CURRENT MISSION: ${mission ? JSON.stringify({ title: mission.title, type: mission.typeLabel, system: mission.system, briefing: mission.briefing, crossings: mission.crossings, stakes: mission.stakes, shared_contract: mission.anchor, meet_at: mission.rendezvous, crew_roles: mission.objectives.map((o) => ({ for: o.characterName, role: o.roleLabel, job: o.text })), stops: mission.stops || [], field_log: mission.scribe || [] }) : "none"}\n` +
    `CREW: ${JSON.stringify(characters.map(charBrief))}\n` +
    `THE SAGA (the server's long story; point players to the next lead's real place and contract when they ask what to do next, never reveal hidden clues, the villain's identity or the big reveal): ${saga ? JSON.stringify(saga) : "none running"}`;
  try {
    return await complete({ system: [lore(), context], messages: [{ role: "user", content: question }], maxTokens: 800 });
  } catch (err) {
    logFailure("question", err);
    return null;
  }
}
