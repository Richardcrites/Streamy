// The long story. One active saga per server; missions and real contracts carry its threads.
// - Each saga has ten LEADS: real in-game activities. Playing one out (a /mission that carries it, or a
//   matching contract completed in game) reveals its clue. Failure raises the villain's threat.
// - Two leads finish an act. When every lead is found, the next mission is the finale.
// - Each character has personal TIDBITS (secrets from their own past, findable at real places). They're
//   revealed as the crew finds leads and finishes side jobs, and the last one hints at the BOND: the big
//   reveal at the finale that ties the whole crew together.
// State only changes when a mission is reported or a contract is completed, so scrapping a mission undoes nothing.

import { SAGAS, SAGA_ACT_LEADS, SAGA_THREAT_START, SAGA_THREAT_MAX, SIDE_JOBS_PER_TIDBIT } from "../lore/sagas.js";
import { fill, pick } from "./util.js";
import { createNpc, shortName } from "./story.js";
import { newId } from "../store.js";

const ALIASES = ["the Curator", "the Archivist", "the Ferryman", "the Quiet Partner", "the Gardener", "the Cartographer", "Mister Lantern", "the Widow", "the Auditor", "the Saint"];
const now = () => new Date().toISOString();

export const activeSaga = (g) => (g.saga?.status === "active" ? g.saga : null);
export const sagaTemplate = (saga) => SAGAS.find((t) => t.id === saga.templateId);

// A character's enemy NPC becomes the villain's lieutenant, so the long story is personal.
function pickLieutenant(g, characters) {
  const enemies = characters.flatMap((c) => (c.hooks || []).filter((h) => h.status === "open" && h.npcId && ["enemy", "debt"].includes(h.type)).map((h) => ({ c, npc: g.npcs[h.npcId] })))
    .filter((x) => x.npc);
  if (enemies.length) {
    const e = pick(enemies);
    return { name: e.npc.name, npcId: e.npc.id, tiedTo: e.c.name, tiedToId: e.c.id };
  }
  const npc = createNpc(g, "the villain's lieutenant");
  return { name: npc.name, npcId: npc.id, tiedTo: null, tiedToId: null };
}

const fillLead = (l, vars) => ({
  system: l.system, activity: l.activity,
  where: fill(l.where, vars), contract: fill(l.contract, vars), find: fill(l.find, vars), text: fill(l.text, vars),
});

export function createSaga(g, characters, templateId = null) {
  const used = new Set((g.sagaHistory || []).map((s) => s.templateId));
  const choices = SAGAS.filter((s) => !used.has(s.id));
  const t = SAGAS.find((s) => s.id === templateId) || pick(choices.length ? choices : SAGAS);
  const villain = createNpc(g, "the hidden villain");
  const lieutenant = pickLieutenant(g, characters);
  const vars = { shadow: pick(ALIASES), truename: villain.name, lieutenant: lieutenant.name };
  const saga = {
    id: newId(),
    templateId: t.id,
    season: (g.sagaHistory || []).length + 1,
    title: t.title,
    thread: t.thread,
    systems: t.systems,
    shadow: vars.shadow,
    truename: villain.name,
    villainNpcId: villain.id,
    lieutenant,
    premise: fill(t.premise, vars),
    truth: fill(t.truth, vars),
    acts: t.acts.map((a) => ({ name: a.name, goal: fill(a.goal, vars) })),
    leads: t.leads.map((l, i) => ({ id: i, act: Math.floor(i / SAGA_ACT_LEADS), ...fillLead(l, vars), found: null })),
    finale: fill(t.finale, vars),
    finalePlay: { system: t.finalePlay.system, where: fill(t.finalePlay.where, vars), contract: fill(t.finalePlay.contract, vars), activity: t.finalePlay.activity },
    act: 0,
    threat: SAGA_THREAT_START,
    tidbits: {},
    sideJobs: {},
    jobs: [],
    timeline: [{ at: now(), text: `The saga "${t.title}" began.` }],
    status: "active",
    createdAt: now(),
  };
  for (const c of characters) ensureTidbits(g, saga, c);
  return saga;
}

// ── Personal tidbits ─────────────────────────────────────────────────────────
// Every character gets two secrets from the saga's list (the least-used ones) and the bond hint last.
export function ensureTidbits(g, saga, char) {
  saga.tidbits ??= {};
  if (saga.tidbits[char.id]) return saga.tidbits[char.id];
  const t = sagaTemplate(saga);
  if (!t?.tidbits) return [];
  const counts = t.tidbits.map((_, i) => Object.values(saga.tidbits).filter((list) => list.some((x) => x.key === i)).length);
  const order = t.tidbits.map((_, i) => i).sort((a, b) => counts[a] - counts[b] || Math.random() - 0.5).slice(0, 2);
  const hookNpc = (char.hooks || []).map((h) => g.npcs?.[h.npcId]).find(Boolean);
  const vars = {
    name: char.name, short: shortName(char.name), home: char.home || "home", origin: char.origin,
    npc: hookNpc?.name || "an old friend", shadow: saga.shadow, lieutenant: saga.lieutenant.name,
  };
  const make = (tb, key) => ({ key, text: fill(tb.text, vars, char.pronouns), find: fill(tb.find, vars, char.pronouns), revealed: null });
  saga.tidbits[char.id] = [...order.map((i) => make(t.tidbits[i], i)), make(t.bondHint, "bond")];
  return saga.tidbits[char.id];
}

// Reveals the next hidden tidbit for one of these characters (whoever has found the fewest).
function revealTidbit(g, saga, chars, how) {
  const candidates = chars.map((c) => ({ c, list: ensureTidbits(g, saga, c) }))
    .filter((x) => x.list.some((t) => !t.revealed))
    .sort((a, b) => a.list.filter((t) => t.revealed).length - b.list.filter((t) => t.revealed).length || Math.random() - 0.5);
  if (!candidates.length) return null;
  const { c, list } = candidates[0];
  const tb = list.find((t) => !t.revealed);
  tb.revealed = { at: now(), how };
  saga.timeline.push({ at: now(), text: `Something about ${c.name} came out: ${tb.text}` });
  return { characterId: c.id, character: c.name, text: tb.text, bond: tb.key === "bond" };
}

export const nextTidbit = (saga, charId) => (saga.tidbits[charId] || []).find((t) => !t.revealed) || null;

// ── Leads and beats ──────────────────────────────────────────────────────────
export const nextLead = (saga) => saga.leads.find((l) => !l.found) || null;
export const finaleReady = (saga) => !nextLead(saga);
export const threatBar = (n) => `${"🟥".repeat(n)}${"⬛".repeat(Math.max(0, SAGA_THREAT_MAX - n))} ${n}/${SAGA_THREAT_MAX}`;

// What a new mission carries: the next lead, a counterstrike when threat is maxed, or the finale.
export function sagaBeat(saga) {
  if (!saga) return null;
  if (finaleReady(saga)) return { kind: "finale", act: saga.acts.length - 1, text: saga.finale, play: saga.finalePlay };
  const lead = nextLead(saga);
  if (saga.threat >= SAGA_THREAT_MAX) {
    return {
      kind: "counterstrike", act: saga.act, text: `${saga.shadow} strikes back. Hold the line, or lose what you've found.`,
      play: { system: lead.system, where: `wherever ${saga.shadow}'s people catch you in ${lead.system}`, contract: `A **Mercenary** or **Bounty Hunter** ship-combat contract in ${lead.system}: the targets are ${saga.shadow}'s people. Win it and the leads stay safe`, activity: "combat" },
    };
  }
  return { kind: "lead", act: lead.act, leadId: lead.id, text: lead.text, play: { system: lead.system, where: lead.where, contract: lead.contract, find: lead.find, activity: lead.activity } };
}

// Called when a mission carrying a saga beat is reported, or a lead's contract is completed in game.
// chars: the characters involved. Returns what changed, for the epilogue.
export function resolveSagaBeat(g, saga, beat, { success, missionTitle, chars = [] }) {
  const out = { revealed: null, actDone: null, threat: saga.threat, finale: false, counterstrike: false, tidbit: null, bond: null };
  const who = chars.map((c) => c.name).join(", ") || "the crew";
  const log = (text) => saga.timeline.push({ at: now(), text });

  if (beat.kind === "finale") {
    saga.status = "complete";
    saga.outcome = success ? "won" : "lost";
    out.finale = true;
    out.bond = bondText(g, saga);
    log(`${who} faced ${saga.truename} in "${missionTitle}" and ${success ? "won" : "lost"}.`);
    g.sagaHistory = [...(g.sagaHistory || []), { id: saga.id, templateId: saga.templateId, title: saga.title, outcome: saga.outcome, truename: saga.truename, endedAt: now() }];
    return out;
  }
  if (beat.kind === "counterstrike") {
    out.counterstrike = true;
    if (success) {
      saga.threat = 6;
      log(`${who} held off ${saga.shadow}'s counterstrike in "${missionTitle}".`);
    } else {
      // The villain claws back the latest lead.
      const last = [...saga.leads].reverse().find((l) => l.found);
      if (last) last.found = null;
      saga.act = nextLead(saga)?.act ?? saga.act;
      saga.threat = 7;
      log(`${saga.shadow}'s counterstrike hit hard in "${missionTitle}". A lead went cold.`);
    }
    out.threat = saga.threat;
    return out;
  }

  const lead = saga.leads.find((l) => l.id === beat.leadId && !l.found) || nextLead(saga);
  if (success && lead) {
    lead.found = { at: now(), by: who, mission: missionTitle };
    saga.threat = Math.max(0, saga.threat - 1);
    out.revealed = lead.text;
    log(`Lead found in "${missionTitle}": ${lead.text}`);
    out.tidbit = revealTidbit(g, saga, chars, `found with a lead in "${missionTitle}"`);
    if (saga.leads.filter((l) => l.act === saga.act).every((l) => l.found)) {
      out.actDone = saga.acts[saga.act].name;
      log(`Act ${saga.act + 1}, "${saga.acts[saga.act].name}", is done.`);
      saga.act = Math.min(saga.act + 1, saga.acts.length - 1);
    }
  } else {
    saga.threat = Math.min(SAGA_THREAT_MAX, saga.threat + 2);
    log(`${saga.shadow} gained ground while ${who} failed "${missionTitle}".`);
  }
  out.threat = saga.threat;
  return out;
}

// The big reveal, naming the whole crew: everyone with tidbits in this saga.
export function bondText(g, saga) {
  const names = Object.keys(saga.tidbits).map((id) => g.characters?.[id]?.name).filter(Boolean);
  const crew = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] || "all of you";
  return fill(sagaTemplate(saga).bond, { crew, truename: saga.truename, shadow: saga.shadow, lieutenant: saga.lieutenant.name });
}

// ── Real contracts: every job gets a purpose ─────────────────────────────────
const TABS = [
  ["Bounty Hunter", /bounty|hunt\b|kill|eliminate|target/i],
  ["Investigation", /dossier|investigat|onyx|facility|research|intel/i],
  ["Search", /search|missing|locate|find/i],
  ["Delivery", /deliver|package|courier/i],
  ["Hauling", /haul|cargo|freight|supply|supplies|transport/i],
  ["salvage", /salvag|wreck|derelict/i],
  ["Mercenary", /defend|retake|clear|assault|platform|outpost|bunker|call to arms|protect|escort|merc/i],
];
export const contractTab = (title) => TABS.find(([, re]) => re.test(title || ""))?.[0] || "other";

export const leadMatches = (saga, title) => {
  const lead = nextLead(saga);
  if (!lead || !title) return false;
  const re = sagaTemplate(saga).leads[lead.id].match;
  return Boolean(re && re.test(title));
};

// stage: "accepted" | "complete" | "failed". Returns what to tell the crew.
export function noteContract(g, saga, char, { title, stage }) {
  const tab = contractTab(title);
  const lead = nextLead(saga);
  const isLead = leadMatches(saga, title);
  const vars = { shadow: saga.shadow, lieutenant: saga.lieutenant.name };
  const purpose = isLead
    ? `This is the lead. ${lead.find ? `Look for ${lead.find}.` : ""}`
    : fill(sagaTemplate(saga).sideJobs[tab] || sagaTemplate(saga).sideJobs.other, vars);
  const out = { tab, isLead, purpose, resolved: null, tidbit: null, sideCount: null };
  saga.jobs.push({ at: now(), characterId: char.id, character: char.name, title, stage, tab, isLead });
  saga.jobs = saga.jobs.slice(-60);

  if (stage === "complete") {
    if (isLead) {
      out.resolved = resolveSagaBeat(g, saga, { kind: "lead", leadId: lead.id }, { success: true, missionTitle: title, chars: [char] });
    } else {
      const n = (saga.sideJobs[char.id] = (saga.sideJobs[char.id] || 0) + 1);
      out.sideCount = n;
      saga.timeline.push({ at: now(), text: `${char.name} finished a side job: ${title}.` });
      if (n % SIDE_JOBS_PER_TIDBIT === 0) out.tidbit = revealTidbit(g, saga, [char], `dug up on a side job ("${title}")`);
    }
  } else if (stage === "failed" && isLead) {
    saga.threat = Math.min(SAGA_THREAT_MAX, saga.threat + 1);
    saga.timeline.push({ at: now(), text: `${char.name} lost the lead's contract ("${title}"). ${saga.shadow} noticed.` });
  }
  return out;
}

// ── Text ─────────────────────────────────────────────────────────────────────
export const leadLines = (play) => [
  `📍 **${play.where}** (${play.system})`,
  `🎮 ${play.contract}`,
  ...(play.find ? [`🔎 The clue is ${play.find}.`] : []),
];

export function sagaRecapText(saga) {
  const found = saga.leads.filter((l) => l.found);
  const lead = nextLead(saga);
  return [
    `Previously, in ${saga.title}…`,
    saga.premise,
    ...(found.length ? [`What you know: ${found.map((l) => l.text).join(" ")}`] : ["You don't know much yet."]),
    lead ? `Now: act ${saga.act + 1}, ${saga.acts[saga.act].name}. ${saga.acts[saga.act].goal} The next lead is at ${lead.where}, in ${lead.system}.`
      : `Now: it's time to end it. ${saga.finale}`,
  ].join("\n\n");
}

// What the AI is told about the saga. The truth and the bond are only included for the finale.
export function sagaForAI(g, saga, beat, characters = []) {
  if (!saga) return null;
  return {
    title: saga.title,
    premise: saga.premise,
    villain_alias: saga.shadow,
    villain_lieutenant: saga.lieutenant.name + (saga.lieutenant.tiedTo ? ` (from ${saga.lieutenant.tiedTo}'s past)` : ""),
    current_act: `${saga.act + 1}: ${saga.acts[saga.act].name}. ${saga.acts[saga.act].goal}`,
    leads_found_so_far: saga.leads.filter((l) => l.found).map((l) => l.text),
    threat: `${saga.threat}/${SAGA_THREAT_MAX}`,
    what_each_character_has_learned_about_themselves: Object.fromEntries(characters.map((c) => [c.name, (saga.tidbits[c.id] || []).filter((t) => t.revealed).map((t) => t.text)])),
    this_mission: beat?.kind === "lead"
      ? { kind: "lead", in_game: beat.play, clue_to_hint_at_without_revealing: beat.text }
      : beat?.kind === "finale"
        ? { kind: "finale", in_game: beat.play, finale: beat.text, the_truth: saga.truth, villain_real_name: saga.truename, the_big_reveal: bondText(g, saga) }
        : beat ? { kind: "counterstrike", in_game: beat.play, what: beat.text } : null,
    rules: "Everything must be playable in the real game: the mission happens at this_mission.in_game's place, through its contract. Foreshadow, never reveal: hint at the clue and the villain alias, but never state the clue, the villain's real identity or the big reveal (except in the finale).",
  };
}
