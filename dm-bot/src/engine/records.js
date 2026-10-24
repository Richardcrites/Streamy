// Persistent consequences and history: character conditions (injuries, ship damage, warrants…),
// server canon (lore the players created), and the story archive. Pure functions, no Discord.

import { eventLine } from "./journey.js";
import { newId } from "../store.js";
import { similar, firstName, lastName } from "./names.js";
import { shortName } from "./story.js";

export const CONDITION_KINDS = {
  injury: { label: "Injury", emoji: "🩸" },
  ship: { label: "Ship", emoji: "🚀" },
  legal: { label: "Legal", emoji: "⚖️" },
  other: { label: "Other", emoji: "📌" },
  buff: { label: "Buff", emoji: "✨" },
  debuff: { label: "Debuff", emoji: "🔻" },
};

// What lifts a buff or debuff. The bot lifts it itself when that happens (a job reported done, a med bed or
// repair seen by DM Link, or the DM saying the crew rested).
export const LIFTS = ["rest", "repair", "job", "medical", "time"];
export const SEVERITY = { minor: "minor", major: "major", critical: "critical" };

const DEFAULT_CLEARS = {
  injury: "Treatment in a med bay or med bed.",
  ship: "Repairs at a station or landing zone.",
  legal: "Pay the fine, clear the CrimeStat, or lie low until it blows over.",
  other: "Deal with it in play.",
  buff: "Wears off after the next job.",
  debuff: "Rest, repair or finish a job.",
};

// ── Conditions ───────────────────────────────────────────────────────────────
// effect: for buffs and debuffs, what the player acts out in game ("half throttle even when the HUD says full").
// lifts: which of LIFTS ends it.
export function addCondition(char, { kind = "other", text, severity = "minor", clears = "", effect = null, lifts = null }) {
  char.conditions ??= [];
  const k = CONDITION_KINDS[kind] ? kind : "other";
  const c = {
    id: newId(),
    kind: k,
    text: text.trim(),
    severity: SEVERITY[severity] || "minor",
    clears: clears?.trim() || DEFAULT_CLEARS[k],
    since: new Date().toISOString(),
    status: "active",
    ...(effect ? { effect: effect.trim() } : {}),
    ...(lifts && LIFTS.includes(lifts) ? { lifts } : {}),
  };
  char.conditions.push(c);
  return c;
}

// Lift every buff/debuff (and anything else marked with `lifts`) that this event ends. Returns what was lifted.
export function liftOn(char, event) {
  const lifted = [];
  for (const c of activeConditions(char)) {
    const ends = c.lifts === event || (event === "job" && c.kind === "buff" && !c.lifts);
    if (ends) lifted.push(clearCondition(char, c.id, event));
  }
  return lifted.filter(Boolean);
}

// ── Lockouts: factions that won't work with you, places you can't show your face ──
export function addLockout(char, { kind, name, reason }) {
  char.lockouts ??= [];
  const n = String(name || "").trim();
  if (!n || char.lockouts.some((l) => l.status === "active" && l.name.toLowerCase() === n.toLowerCase())) return null;
  const l = { id: newId(), kind: kind === "place" ? "place" : "faction", name: n, reason: String(reason || "").trim(), since: new Date().toISOString(), status: "active" };
  char.lockouts.push(l);
  return l;
}
export const activeLockouts = (char) => (char.lockouts || []).filter((l) => l.status === "active");
export function liftLockout(char, name) {
  const l = activeLockouts(char).find((x) => x.name.toLowerCase() === String(name).trim().toLowerCase());
  if (l) {
    l.status = "lifted";
    l.liftedAt = new Date().toISOString();
  }
  return l || null;
}
export const lockoutLine = (l) => l.kind === "place" ? `🚫 **${l.name}** is off limits${l.reason ? `: ${l.reason}` : ""}.` : `🚫 **${l.name}** won't offer you work${l.reason ? `: ${l.reason}` : ""}.`;

export const activeConditions = (char) => (char.conditions || []).filter((c) => c.status === "active");

export function clearCondition(char, id, how = "") {
  const c = (char.conditions || []).find((x) => x.id === id && x.status === "active");
  if (!c) return null;
  c.status = "cleared";
  c.clearedAt = new Date().toISOString();
  c.clearedHow = how;
  return c;
}

export function conditionLine(c) {
  const k = CONDITION_KINDS[c.kind] || CONDITION_KINDS.other;
  return `${k.emoji} **${c.text}**${c.severity !== "minor" ? ` (${c.severity})` : ""}.${c.effect ? ` 🎮 ${c.effect}` : ""} *Clears: ${c.clears}*`;
}

// ── Finding characters by whatever the scribe typed ("RJ", "rj", "Oressian", "Ysloda") ──
export function findCharacter(characters, name) {
  if (!name) return null;
  const q = name.trim().toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const c of characters) {
    const full = c.name.toLowerCase();
    let score = 0;
    if (full === q) score = 100;
    else if (shortName(c.name).toLowerCase() === q) score = 90;
    else if (firstName(c.name).toLowerCase() === q || lastName(c.name).toLowerCase() === q) score = 80;
    else if (full.includes(q) && q.length >= 3) score = 60;
    else if (similar(firstName(c.name), name) || similar(lastName(c.name), name)) score = 50;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

// ── Server canon: lore the players made ──────────────────────────────────────
export function addCanon(g, text, source = "players") {
  g.canon ??= [];
  const clean = text.trim();
  if (!clean || g.canon.some((x) => x.text.toLowerCase() === clean.toLowerCase())) return null;
  const entry = { id: newId(), text: clean, source, at: new Date().toISOString() };
  g.canon.push(entry);
  return entry;
}

export const canonText = (g, n = 25) => (g.canon || []).slice(-n).map((x) => x.text);

// ── Story archive ────────────────────────────────────────────────────────────
const date = (iso) => (iso || new Date().toISOString()).slice(0, 10);

export function archiveMission(g, mission, crew) {
  g.archive ??= [];
  const lines = [
    `# ${mission.title}`,
    `*${mission.typeLabel} · ${mission.system} · ${date(mission.createdAt)} · ${mission.status === "complete" ? "Success" : "Failure"}*`,
    "",
    `**Crew:** ${crew.map((c) => c.name).join(", ")}`,
    "",
    "## The job",
    mission.briefing,
    ...(mission.crossings?.length ? ["", "## How their stories crossed", ...mission.crossings] : []),
    "",
    "## Objectives",
    ...mission.objectives.map((o) => `- **${o.characterName}:** ${o.text}`),
    ...(mission.stops?.length ? ["", `## Stops on the way (rolled ${mission.roadRoll} on a d20)`, ...mission.stops.map((st, i) => `${i + 1}. **${st.place}**: ${st.reason}. ${st.action}`)] : []),
    ...(mission.route?.events?.length ? ["", "## The road there", ...mission.route.events.map((e) => `- ${eventLine(e)}`)] : []),
    ...(mission.notes ? ["", "## What the crew reported", mission.notes] : []),
    ...(mission.scribe?.length ? ["", "## Field log", ...mission.scribe.map((s) => `- ${s}`)] : []),
    "",
    "## Ending",
    mission.epilogue || "",
    "",
    `**The twist:** ${mission.twist}`,
  ];
  return pushArchive(g, { kind: "mission", title: mission.title, characterIds: crew.map((c) => c.id), text: lines.join("\n") });
}

export function archiveCampaign(g, campaign, crew) {
  g.archive ??= [];
  const lines = [
    `# ${campaign.title}`,
    `*Campaign · ${campaign.vars?.system ?? ""} · ${date(campaign.createdAt)} → ${date()}*`,
    "",
    `**Crew:** ${crew.map((c) => c.name).join(", ")}`,
    `**Goal:** ${campaign.endGoal}`,
    "",
    ...campaign.chapters.flatMap((ch) => [
      `## ${ch.title}`,
      ch.briefing,
      ...(ch.result ? [`**The crew chose:** ${ch.result.label}. ${ch.result.outcome}`, ...(ch.result.notes ? [`*Field report:* ${ch.result.notes}`] : [])] : []),
      "",
    ]),
    `## Finale: ${campaign.finale?.label ?? ""}`,
    campaign.finale?.text ?? "",
    "",
    campaign.finale?.epilogue ?? "",
  ];
  return pushArchive(g, { kind: "campaign", title: campaign.title, characterIds: crew.map((c) => c.id), text: lines.join("\n") });
}

// A finished (or abandoned) saga, as a readable story: premise, clues in order, secrets, the reveal.
export function archiveSaga(g, saga, bond) {
  g.archive ??= [];
  const names = Object.keys(saga.tidbits || {}).map((id) => g.characters?.[id]).filter(Boolean);
  const lines = [
    `# ${saga.title}`,
    `*Saga, season ${saga.season} · ${date(saga.createdAt)} → ${date()} · ${saga.outcome || saga.status}*`,
    "",
    saga.premise,
    "",
    "## What was found",
    ...saga.leads.filter((l) => l.found).map((l) => `- **${l.where}** (${l.found.by}, "${l.found.mission}"): ${l.text}`),
    "",
    "## What they learned about themselves",
    ...names.flatMap((c) => (saga.tidbits[c.id] || []).filter((t) => t.revealed).map((t) => `- **${c.name}:** ${t.text}`)),
    "",
    "## The truth",
    saga.truth,
    ...(bond ? ["", "## The big reveal", bond] : []),
    "",
    "## Timeline",
    ...saga.timeline.map((t) => `- ${date(t.at)}: ${t.text}`),
  ];
  return pushArchive(g, { kind: "saga", title: saga.title, characterIds: names.map((c) => c.id), text: lines.join("\n") });
}

function pushArchive(g, entry) {
  const e = { id: newId(), at: new Date().toISOString(), ...entry };
  g.archive.push(e);
  return e;
}

export function archiveExport(g, entries = g.archive || []) {
  const canon = (g.canon || []).map((c) => `- ${c.text}`);
  return [
    "# Story Archive",
    "",
    ...entries.flatMap((e) => [e.text, "", "---", ""]),
    ...(canon.length ? ["# Server Canon", "", ...canon] : []),
  ].join("\n");
}
