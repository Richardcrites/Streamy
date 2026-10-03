// Optional Claude-powered narrator. If ANTHROPIC_API_KEY is set, the DM's prose (origin stories,
// transmissions, chapter briefings, finales) is rewritten by Claude using the full lore codex
// and the stored story so far. The engine's structure (objectives, places, hooks) stays fixed so
// quests remain playable. If the key is missing or a call fails, the procedural text is used.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const LORE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lore");

let client = null;
let systemPrompt = null;

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

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
  if (!aiEnabled()) return null;
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: getSystem(),
      messages: [{ role: "user", content: `${task}\n\n<input>\n${JSON.stringify(payload, null, 2)}\n</input>` }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.find((b) => b.type === "text")?.text;
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.warn(`[ai] ${task.slice(0, 40)}… failed: ${err.status} ${err.message}`);
    else console.warn("[ai] failed:", err.message);
    return null;
  }
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
