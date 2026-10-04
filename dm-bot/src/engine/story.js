// The procedural Game Master. Every function here works offline, using only the lore data.
// When the Claude API is configured, ai.js rewrites the *prose* of these results; the
// structure (objectives, locations, hooks, choices) always comes from here, so quests
// stay grounded in content that actually exists in the game.

import { classifyContract, systemOf, pulledAnchor, pickAddon } from "./contract.js";
import {
  ORIGINS, NAME_POOLS, NPC_POOL, RELICS, LOCATIONS, CARGO, ORES, EVIDENCE,
  OBJECTIVES, ACTIVITY_TAGS, CAMPAIGN_GOALS, THREADS, CAREERS, MISSION_TYPES, MISSION_TWISTS,
  GAME_RULES, NPC_LINKS, KIN_RELATIONS, SIDES, MISSION_STAKES, TITLE_WORDS,
  ANCHORS, RENDEZVOUS, SHARE_HOW, CREW_ROLES, ORIGIN_ROLES, ROLE_WORDS, CAREER_TO_ROLE, MISSION_NEEDS, STOP_PLACES, STOP_REASONS, STOP_ACTIONS, STOP_NEEDS,
} from "../lore/data.js";
import { pick, pickN, randInt, fill } from "./util.js";
import { freshName, registerName, isTaken, similar, lastName } from "./names.js";
import { customRoleWords } from "./roles.js";
import { newId } from "../store.js";

const PLAYABLE_SYSTEMS = Object.keys(LOCATIONS);

// ── Names ────────────────────────────────────────────────────────────────────
export function suggestNames(originId, count = 6, g = null) {
  const pool = NAME_POOLS[ORIGINS[originId]?.names] || NAME_POOLS.common;
  const names = new Set();
  let guard = 0;
  while (names.size < count && guard++ < 300) {
    let name = `${pick(pool.first)} ${pick(pool.last)}`;
    if (pool.callsigns && Math.random() < 0.5) {
      const [first, ...rest] = name.split(" ");
      name = `${first} "${pick(pool.callsigns)}" ${rest.join(" ")}`;
    }
    if (g && guard < 250 && isTaken(g, name)) continue;
    names.add(name);
  }
  return [...names];
}

// ── NPCs: persisted so they recur across stories ─────────────────────────────
export function createNpc(g, role, extra = {}) {
  const npc = {
    id: newId(),
    name: freshName(g),
    role: role || pick(NPC_POOL.roles),
    ...extra,
  };
  g.npcs[npc.id] = npc;
  return npc;
}

const npcName = (g, id) => g.npcs[id]?.name || "someone";

// ── Origin story ─────────────────────────────────────────────────────────────
export function buildCharacter(g, { ownerId, originId, career, name, pronouns, seed }) {
  const origin = ORIGINS[originId];
  registerName(g, name);
  const surname = name.replace(/".*?"\s*/, "").split(" ").slice(-1)[0];
  const relic = pick(RELICS);
  const vars = { name, short: shortName(name), surname, home: origin.home, relic };

  // Other characters on this server with the same origin: avoid giving them the same life.
  const siblings = Object.values(g.characters || {}).filter((c) => c.originId === originId);
  const usedBeats = new Set(siblings.map((c) => (c.storyBeats || []).join("-")));
  const beatsUsed = (part, i) => siblings.filter((c) => c.storyBeats?.[part] === i).length;
  const leastUsed = (list, part) => {
    const counts = list.map((_, i) => beatsUsed(part, i));
    const min = Math.min(...counts);
    return pick(list.map((_, i) => i).filter((i) => counts[i] === min));
  };
  let beats = [leastUsed(origin.openings, 0), leastUsed(origin.turns, 1), leastUsed(origin.nows, 2)];
  for (let tries = 0; usedBeats.has(beats.join("-")) && tries < 20; tries++) {
    beats = [randInt(0, origin.openings.length - 1), randInt(0, origin.turns.length - 1), randInt(0, origin.nows.length - 1)];
  }

  // Two hooks of different types, preferring ones no same-origin character already has.
  const hookUse = origin.hooks.map((_, i) => siblings.filter((c) => (c.hookKeys || []).includes(i)).length);
  const order = origin.hooks.map((_, i) => i).sort((a, b) => hookUse[a] - hookUse[b] || Math.random() - 0.5);
  const chosen = [];
  for (const i of order) {
    if (chosen.length < 2 && !chosen.some((j) => origin.hooks[j].type === origin.hooks[i].type)) chosen.push(i);
  }

  const hooks = chosen.map((i) => {
    const h = origin.hooks[i];
    const npc = createNpc(g, roleForHook(h.type));
    return { id: newId(), type: h.type, text: fill(h.text, { ...vars, npc: npc.name }, pronouns), thread: h.thread, npcId: npc.id, status: "open" };
  });

  // The player's description is the heart of the character: the AI builds the story around it, and
  // the built-in text gives it its own paragraph right after the opening.
  const story = [origin.openings[beats[0]], origin.turns[beats[1]], origin.nows[beats[2]]].map((p) => fill(p, vars, pronouns));
  const seedPara = seedParagraph(seed, vars, pronouns);
  if (seedPara) story.splice(1, 0, seedPara);

  return {
    id: newId(),
    ownerId,
    name,
    pronouns,
    originId,
    origin: origin.label,
    career,
    home: origin.home,
    system: origin.system,
    location: null,
    citizenship: origin.citizenship,
    ties: origin.ties,
    seed: seed || null,
    story,
    storyBeats: beats,
    hookKeys: chosen,
    hooks,
    renown: {},
    relationships: [],
    titles: [],
    journal: [],
    createdAt: new Date().toISOString(),
  };
}

// Turns the player's description into a paragraph. "a failed comedian who…" reads as who they were;
// a full sentence ("He grew up…") is used as written; first person ("I…") is quoted.
const SEED_FRAMES = [
  "Before any of that mattered, {short} was {seed}. It's the first thing people find out about {them}, and it shaped everything that came after.",
  "Ask around about {short} and you'll hear the same thing: {short} was {seed}. {They} never quite outran it, and out here, {they} stopped trying.",
  "Long before the 'Verse knew the name, {short} was {seed}. Everything since has been {their} way of living with that.",
];
const NOUN_START = /^(a|an|the|one|some|former|ex|retired|disgraced|failed|washed[- ]up)\b/i;

const SENTENCE_START = /^(he|she|they|his|her|their|it|born|raised)\b/i;
const VERB_START = /^(grew|was|is|has|had|used|spent|lost|ran|fled|left|took|made|came|went|got|gave|stole|sold|fought|flew|kept|became|never|always|still|once)\b/i;

export function seedParagraph(seed, vars, pronouns) {
  let text = (seed || "").trim().replace(/\s+/g, " ").replace(/[{}]/g, "");
  if (!text) return null;
  if (/^(i|i'm|i've|my|me)\b/i.test(text)) return fill(`In {short}'s own words: "${text.replace(/["“”]/g, "'")}"`, vars, pronouns);
  text = text.replace(/[.!\s]+$/, "");
  const nameParts = String(vars.name || "").toLowerCase().split(/[\s"]+/).filter(Boolean);
  const firstWord = text.split(" ")[0].toLowerCase().replace(/[^a-z'-]/g, "");
  // A full sentence about the character: use it as written.
  if (SENTENCE_START.test(text) || nameParts.includes(firstWord)) return `${text[0].toUpperCase()}${text.slice(1)}.`;
  text = text[0].toLowerCase() + text.slice(1);
  // "grew up on Terra…" → "Tomothy grew up on Terra…"
  if ((VERB_START.test(text) || /ed$/.test(firstWord)) && !NOUN_START.test(text)) return `${vars.short} ${text}.`;
  let phrase = text.replace(/^(was|is)\s+/i, "");
  if (!/^(a|an|the|one|some)\b/i.test(phrase)) phrase = `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
  return fill(pick(SEED_FRAMES).replace("{seed}", () => phrase), vars, pronouns);
}

// What the story calls someone after the first mention: callsign if they have one, else first name.
export function shortName(name) {
  const callsign = name.match(/"([^"]+)"/);
  if (callsign) return callsign[1];
  return name.trim().split(/\s+/)[0];
}

function roleForHook(type) {
  return { debt: "collector", enemy: "enemy", lost: "missing person", secret: "contact", oath: "sworn cause" }[type] || "contact";
}

// ── Campaigns ────────────────────────────────────────────────────────────────
// Links to the characters' open hooks: an enemy hook becomes the antagonist, other hooks
// become the person or cause the campaign revolves around.
export function buildCampaign(g, { goalId, characters, ownerId, scope, orgId }) {
  const goal = CAMPAIGN_GOALS[goalId];
  const lead = characters[0];
  const hook = pick(lead.hooks.filter((h) => h.status === "open")) || null;
  const thread = THREADS[hook?.thread] || pick(Object.values(THREADS));
  const threadKey = hook?.thread || Object.keys(THREADS).find((k) => THREADS[k] === thread);

  const system = pick(thread.systems.filter((s) => PLAYABLE_SYSTEMS.includes(s))) ||
    (PLAYABLE_SYSTEMS.includes(lead.system) ? lead.system : pick(PLAYABLE_SYSTEMS));

  const patron = createNpc(g, pick(NPC_POOL.roles));
  let antagonistName;
  let focusNpcId = null;
  if (hook?.type === "enemy") {
    antagonistName = npcName(g, hook.npcId);
  } else {
    antagonistName = `${createNpc(g, "antagonist").name} and ${pick(thread.antagonists)}`;
    focusNpcId = hook?.npcId || null;
  }
  const place = pick(LOCATIONS[system].places.filter((p) => p.tags.includes("city") || p.tags.includes("social")) || LOCATIONS[system].places).name;

  const vars = {
    patron: patron.name,
    antagonist: antagonistName,
    macguffin: pick(goal.macguffins),
    place,
    system,
    npc: focusNpcId ? npcName(g, focusNpcId) : createNpc(g, "witness").name,
  };

  return {
    id: newId(),
    goalId,
    title: fill(pick(goal.titles), vars),
    endGoal: fill(goal.endGoal, vars),
    scope,
    orgId: orgId || null,
    ownerId,
    characterIds: characters.map((c) => c.id),
    thread: threadKey,
    hookId: hook?.id || null,
    hookOwnerId: hook ? lead.id : null,
    vars,
    patronId: patron.id,
    acts: goal.acts.map((a) => ({ title: a.title, beat: fill(a.beat, vars), activities: a.activities })),
    actIndex: 0,
    chapters: [],
    tones: [],
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

// ── Chapters ─────────────────────────────────────────────────────────────────
function locationFor(system, activity) {
  const tags = ACTIVITY_TAGS[activity] || [];
  const places = LOCATIONS[system].places;
  const fits = places.filter((p) => p.tags.some((t) => tags.includes(t)));
  return pick(fits.length ? fits : places).name;
}

export function buildObjective(campaign, char, activities, avoid = new Set()) {
  const careerActs = CAREERS[char.career]?.activities || [];
  const fresh = activities.filter((a) => !avoid.has(a));
  const pool = fresh.length ? fresh : activities;
  const preferred = pool.filter((a) => careerActs.includes(a));
  const activity = pick(preferred.length ? preferred : pool);
  avoid.add(activity);
  const v = campaign.vars;
  const objVars = {
    ...v,
    npc: v.npc || v.patron || "your contact",
    antagonist: v.antagonist || "the opposition",
    place: locationFor(v.system, activity),
    qty: pick([8, 16, 24, 32, 48]),
    cargo: pick(CARGO),
    ore: pick(ORES),
    evidence: pick(EVIDENCE),
  };
  return {
    characterId: char.id,
    characterName: char.name,
    activity,
    text: fill(pick(OBJECTIVES[activity] || OBJECTIVES.rp), objVars),
    place: objVars.place,
  };
}

const TRANSMISSIONS = [
  "{lead}, it's {patron}. I don't trust these channels, so listen close. I've got work, \"{actTitle}\", and I need people who can keep their mouths shut. The reward's real, and so is the danger.",
  "This is {patron}. Things just got worse. The next job is \"{actTitle}\", and you're the only crew I know who can handle it. Don't make me regret calling.",
  "{patron} again. We're running out of time. Whatever you do next, {antagonist} will notice. Make it count.",
  "{lead}. {patron}. This is it. After this there's no going back, for any of us.",
];

const RP_PROMPTS = [
  "Before launch, each crew member says one thing they're afraid this job will cost them.",
  "Meet at a bar in {place}. One crew member doesn't trust {patron}. Argue it out in character.",
  "On the flight out, someone tells a story from their past that nobody else knew.",
  "A stranger at {place} recognises one of you. Decide who they are and what they want.",
  "After the job, hold a short debrief in character. What did you see that you won't put in the report?",
  "Someone in the crew is offered a private side deal by {antagonist}'s people. Do they tell the others?",
];

const CHOICES = {
  honor: { label: "Do it clean", tone: "honor", outcomes: [
    "You keep your word and protect who you can. It costs time, but people will remember.",
    "You take the harder road. {patron} is quietly impressed, and word spreads that your crew can be trusted.",
  ] },
  pragmatic: { label: "Cut a deal", tone: "pragmatic", outcomes: [
    "A side bargain gets it done faster. Everybody gets something, but someone now holds a marker on you.",
    "You trade information for passage. It works, but {antagonist} may hear who talked.",
  ] },
  ruthless: { label: "Whatever it takes", tone: "ruthless", outcomes: [
    "You go loud and leave wreckage behind. It works, and now people fear your name.",
    "You burn a bridge to win. {antagonist} takes a hit, but so does your reputation with the locals.",
  ] },
};

export function buildChapter(g, campaign, characters) {
  const act = campaign.acts[campaign.actIndex];
  const v = { ...campaign.vars, patron: npcName(g, campaign.patronId), lead: characters[0].name, actTitle: act.title };

  // Different activities for different crew members where the act allows it.
  const used = new Set();
  const objectives = characters.map((c) => buildObjective(campaign, c, act.activities, used));
  // Pull a participant's open hook into the briefing so personal stories surface.
  const hookChar = pick(characters.filter((c) => c.hooks.some((h) => h.status === "open"))) || null;
  const hook = hookChar ? pick(hookChar.hooks.filter((h) => h.status === "open")) : null;

  let transmission = fill(TRANSMISSIONS[Math.min(campaign.actIndex, TRANSMISSIONS.length - 1)], v);
  if (hook) transmission += ` And ${hookChar.name}? I know your story. ${hook.text} Help me, and I'll see what I can do about it.`;

  return {
    id: newId(),
    act: campaign.actIndex,
    title: `Act ${campaign.actIndex + 1}: ${act.title}`,
    transmission: { from: npcName(g, campaign.patronId), text: transmission },
    briefing: act.beat,
    objectives,
    rpPrompt: fill(pick(RP_PROMPTS), { ...v, place: objectives[0].place }),
    choices: ["honor", "pragmatic", "ruthless"].map((k) => ({
      tone: k,
      label: CHOICES[k].label,
      outcome: fill(pick(CHOICES[k].outcomes), v),
    })),
    linkedHookId: hook?.id || null,
    status: "active",
    createdAt: new Date().toISOString(),
  };
}


// ── Finale ───────────────────────────────────────────────────────────────────
const ENDINGS = {
  honor: {
    label: "The Honourable Ending",
    text: "{antagonist} is brought down, and not in the dark. You hand the proof to people who can act on it. {patron} owes you a debt that can't be repaid in credits.",
    title: "Keeper of the Word",
  },
  pragmatic: {
    label: "The Negotiated Ending",
    text: "There's no clean victory, but there is a deal. {antagonist} is finished in {system}, and you walk away richer and connected, holding favours from all the wrong people.",
    title: "The Broker",
  },
  ruthless: {
    label: "The Iron Ending",
    text: "You finish it the way the frontier finishes things. {antagonist} is gone, and so is anyone who stood with them. Nobody in {system} will cross your crew again. Nobody will forget it, either.",
    title: "The Feared",
  },
};

export function finaleTone(campaign) {
  const counts = { honor: 0, pragmatic: 0, ruthless: 0 };
  for (const t of campaign.tones) counts[t]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function buildFinale(g, campaign) {
  const tone = finaleTone(campaign);
  const ending = ENDINGS[tone];
  const goal = CAMPAIGN_GOALS[campaign.goalId];
  const v = { ...campaign.vars, patron: npcName(g, campaign.patronId) };
  return {
    tone,
    label: ending.label,
    title: `${campaign.title}: ${ending.label}`,
    setup: fill(goal.finale, v),
    text: fill(ending.text, v),
    epilogue: `This story is now part of the 'Verse. The world log records that ${campaign.title} ended in ${ending.label.toLowerCase()}.`,
    awardTitle: ending.title,
  };
}

// ── Crossovers: link two players' characters ─────────────────────────────────
export function findLinks(a, b) {
  const links = [];
  if (a.system === b.system) links.push(`both of you have roots in ${a.system}`);
  const tiesA = [...(a.ties?.friendly || []), ...(a.ties?.hostile || [])];
  for (const t of b.ties?.friendly || []) if ((a.ties?.hostile || []).includes(t)) links.push(`${b.name} is friendly with ${t}, whom ${a.name} considers an enemy`);
  for (const t of b.ties?.hostile || []) if (tiesA.includes(t)) links.push(`you both have history with ${t}`);
  const threadsA = new Set(a.hooks.map((h) => h.thread));
  for (const h of b.hooks) if (threadsA.has(h.thread)) links.push(`your personal stories both lead back to ${THREADS[h.thread]?.label || h.thread}`);
  return [...new Set(links)];
}

export function buildCrossover(g, a, b) {
  const links = findLinks(a, b);
  const go = createNpc(g, "go-between");
  const hookA = pick(a.hooks.filter((h) => h.status === "open"));
  const hookB = pick(b.hooks.filter((h) => h.status === "open"));
  const system = PLAYABLE_SYSTEMS.includes(a.system) ? a.system : PLAYABLE_SYSTEMS.includes(b.system) ? b.system : pick(PLAYABLE_SYSTEMS);
  const meet = pick(LOCATIONS[system].places.filter((p) => p.tags.includes("social"))).name;
  const fakeCampaign = { vars: { system, antagonist: "the people who want you both silent", patron: go.name } };
  const actsA = CAREERS[a.career]?.activities || ["delivery"];
  const actsB = CAREERS[b.career]?.activities || ["escort"];
  return {
    id: newId(),
    title: `Crossed Paths: ${a.name} & ${b.name}`,
    from: go.name,
    links,
    text:
      `${go.name}, a ${go.role}, has messages for two people who've never met: ${a.name} and ${b.name}. ` +
      (links.length ? `What connects you: ${links.join("; ")}. ` : "Fate, or someone's careful planning, has put you on the same route. ") +
      (hookA ? `${go.name} knows ${a.name}'s story: ${hookA.text} ` : "") +
      (hookB ? `And ${b.name}'s: ${hookB.text} ` : "") +
      `There's only one job, and it needs both of you.`,
    meet,
    objectives: [buildObjective(fakeCampaign, a, actsA), buildObjective(fakeCampaign, b, actsB)],
    rpPrompt: `Meet in person at ${meet}. Each of you asks the other one question about your past. Answer honestly, or don't, but remember what you said.`,
  };
}

// ── Family ties: similar surnames mean blood ────────────────────────────────
// When a character's surname matches (or nearly matches) another character's or an NPC's, they're
// family, usually on opposite sides of something. Links are stored so they're only made once.
export function linkKin(g, char) {
  g.kinLinks ??= {};
  const made = [];
  const mine = lastName(char.name);
  if (!mine) return made;
  const others = [
    ...Object.values(g.characters).filter((c) => c.id !== char.id).map((c) => ({ kind: "char", id: c.id, name: c.name, ref: c })),
    ...Object.values(g.npcs).map((n) => ({ kind: "npc", id: n.id, name: n.name, ref: n })),
  ];
  for (const o of others) {
    const key = [char.id, o.id].sort().join("|");
    if (g.kinLinks[key] || !similar(mine, lastName(o.name))) continue;
    const relation = pick(KIN_RELATIONS);
    const sides = SIDES[char.system] || SIDES.Pyro;
    const known = o.kind === "npc" ? npcSide(g, o.ref) : o.ref.kinSide || null;
    const theirSide = known || pick(sides);
    const mySide = pick(sides.filter((x) => x !== theirSide));
    const text = `${o.name} is ${char.name}'s ${relation}. ${o.name} runs with ${theirSide}, and ${shortName(char.name)}'s path keeps crossing ${mySide}. Blood says family; the 'Verse says enemies.`;
    g.kinLinks[key] = { a: char.id, b: o.id, relation, text };
    char.hooks.push({ id: newId(), type: "kin", text, thread: "kin", npcId: o.kind === "npc" ? o.id : null, kinCharId: o.kind === "char" ? o.id : null, status: "open" });
    char.relationships.push({ charId: o.kind === "char" ? o.id : null, npcId: o.kind === "npc" ? o.id : null, name: o.name, note: `${relation} (${theirSide})` });
    if (o.kind === "char") {
      const back = `${char.name} is ${o.name}'s ${relation}. ${char.name}'s path keeps crossing ${mySide}, and ${shortName(o.name)} runs with ${theirSide}. Blood says family; the 'Verse says enemies.`;
      o.ref.hooks.push({ id: newId(), type: "kin", text: back, thread: "kin", npcId: null, kinCharId: char.id, status: "open" });
      o.ref.relationships.push({ charId: char.id, name: char.name, note: `${relation} (${mySide})` });
    } else {
      o.ref.kinOf = char.id;
      o.ref.affiliation = theirSide;
    }
    made.push({ with: o.name, relation, text });
  }
  return made;
}

// The side an NPC is already on in someone's story (so family ties don't contradict it).
const THREAD_SIDES = {
  headhunters: "the Headhunters", frontier: "a Frontier Fighter cell", ninetails: "the Nine Tails", asd: "ASD's cleanup crews",
  molina: "a corrupt contractor ring", hurston: "Hurston Security", xenothreat: "XenoThreat", shattered: "the Shattered Blade",
  terra: "Earth-loyalist operatives", vanduul: "UEE Navy intelligence", vanduul_nyx: "the People's Alliance militia",
};
function npcSide(g, npc) {
  if (npc.affiliation) return npc.affiliation;
  for (const c of Object.values(g.characters)) {
    const h = c.hooks.find((x) => x.npcId === npc.id && x.type !== "kin");
    if (h && THREAD_SIDES[h.thread] && ["enemy", "debt"].includes(h.type)) return (npc.affiliation = THREAD_SIDES[h.thread]);
  }
  return null;
}

// ── Crossings: how the crew's stories intertwine ─────────────────────────────
// Kin first, then a link between NPCs from different crew members' hooks. NPC links are stored,
// so if two NPCs were rivals last mission, they're still rivals now.
function hookNpcs(g, char) {
  return char.hooks.filter((h) => h.status === "open" && h.npcId && g.npcs[h.npcId]).map((h) => ({ npc: g.npcs[h.npcId], hook: h, char }));
}

function npcLink(g, x, y) {
  g.npcLinks ??= {};
  const key = [x.id, y.id].sort().join("|");
  g.npcLinks[key] ??= fill(pick(NPC_LINKS), { x: x.name, y: y.name });
  return g.npcLinks[key];
}

export function findCrossings(g, crew) {
  const crossings = [];
  const ids = new Set(crew.map((c) => c.id));
  for (const link of Object.values(g.kinLinks || {})) {
    if (ids.has(link.a) && ids.has(link.b)) crossings.push({ kind: "kin", text: link.text });
  }
  const pools = crew.map((c) => hookNpcs(g, c));
  let focus = null;
  let foil = null;
  // Strongest link: one NPC who appears in two crew members' stories.
  const seen = new Map();
  for (const p of pools.flat()) {
    const prev = seen.get(p.npc.id);
    if (prev && prev.char.id !== p.char.id && !focus) {
      crossings.push({ kind: "shared", text: `${p.npc.name} is in both your stories. For ${prev.char.name}: ${prev.hook.text} For ${p.char.name}: ${p.hook.text}` });
      focus = prev.hook.type === "enemy" ? prev : p;
      foil = pick(pools.flat().filter((q) => q.npc.id !== p.npc.id)) || null;
    }
    seen.set(p.npc.id, prev || p);
  }
  if (!focus && crew.length > 1) {
    const [pa, pb] = pickN(pools.filter((p) => p.length), 2);
    const x = pa && pick(pa);
    const y = pb && pick(pb.filter((q) => q.npc.id !== x.npc.id));
    if (x && y) {
      crossings.push({ kind: "npc", text: `${npcLink(g, x.npc, y.npc)} ${x.npc.name} is tied to ${x.char.name}'s past; ${y.npc.name} to ${y.char.name}'s.` });
      [focus, foil] = Math.random() < 0.5 ? [x, y] : [y, x];
    }
  }
  if (!focus) {
    const all = pools.flat();
    const kinNpc = all.find((p) => p.hook.type === "kin");
    focus = kinNpc || pick(all) || null;
    foil = pick(all.filter((p) => p.npc.id !== focus?.npc.id)) || null;
    if (focus && foil) crossings.push({ kind: "npc", text: `${npcLink(g, focus.npc, foil.npc)} Both of them are part of ${focus.char.name}'s story.` });
  }
  // Big crews: everyone gets tied in. Anyone not in a crossing yet is linked to another crew member
  // through the people in their pasts, so nobody is just along for the ride.
  const inCrossing = (c) => crossings.some((x) => x.text.includes(c.name)) || [focus, foil].some((p) => p?.char.id === c.id);
  for (const c of crew) {
    if (crew.length < 3 || inCrossing(c)) continue;
    const mine = pools[crew.indexOf(c)];
    const others = crew.filter((o) => o.id !== c.id && pools[crew.indexOf(o)].length);
    const partner = pick(others.filter((o) => !inCrossing(o))) || pick(others);
    const x = pick(mine);
    const y = partner && pick(pools[crew.indexOf(partner)].filter((q) => q.npc.id !== x?.npc.id));
    if (x && y) crossings.push({ kind: "pair", text: `${npcLink(g, x.npc, y.npc)} ${x.npc.name} is from ${c.name}'s past; ${y.npc.name} from ${partner.name}'s.` });
  }
  return { crossings, focus, foil };
}

// ── One-shot missions ────────────────────────────────────────────────────────
function missionTitle(g) {
  g.usedTitles ??= [];
  for (let i = 0; i < 50; i++) {
    const t = `${pick(TITLE_WORDS.a)} ${pick(TITLE_WORDS.b)}`;
    if (!g.usedTitles.includes(t)) {
      g.usedTitles.push(t);
      return t;
    }
  }
  return `${pick(TITLE_WORDS.a)} ${pick(TITLE_WORDS.b)} ${g.usedTitles.length}`;
}

export function rulesFor(activities, n = 3) {
  const relevant = GAME_RULES.filter((r) => r.tags.some((t) => activities.includes(t)));
  const general = GAME_RULES.filter((r) => r.tags.includes("all"));
  return [...pickN(relevant, n - 1), pick(general)].filter(Boolean);
}

// What kind of mission fits a saga lead's in-game activity.
const ACTIVITY_TYPE = { investigate: "heist", fps: "heist", bounty: "bounty", combat: "defense", haul: "smuggle", delivery: "smuggle", escort: "defense", rescue: "rescue", mining: "salvage", salvage: "salvage", rp: "smuggle" };

// play (optional): a saga lead or finale ({system, where, contract, find, activity}). The mission happens
// there, through that contract, so the job moves the long story forward.
// pulled (optional): a real contract the crew already took in game ({title, location}). It becomes the
// mission's spine: its place, its kind of job, and the story is written around it.
export function buildMission(g, characters, typeId, { play = null, sagaTitle = null, pulled = null } = {}) {
  const kind = pulled ? classifyContract(pulled.title) : null;
  const typeKey = kind?.type || (MISSION_TYPES[typeId] ? typeId : play ? ACTIVITY_TYPE[play.activity] || pick(Object.keys(MISSION_TYPES)) : pick(Object.keys(MISSION_TYPES)));
  const type = MISSION_TYPES[typeKey];
  const { crossings, focus, foil } = findCrossings(g, characters);

  // The antagonist and the person at the centre come from the crew's own stories when possible.
  const pair = [focus, foil].filter(Boolean);
  const enemyFirst = [...pair.filter((p) => p.hook.type === "enemy"), ...pair.filter((p) => p.hook.type !== "enemy")];
  const antagonist = enemyFirst[0]?.npc || createNpc(g, "antagonist");
  const target = (enemyFirst[1]?.npc) || createNpc(g, pick(NPC_POOL.roles));

  const lead = characters[0];
  const threadSystems = THREADS[enemyFirst[0]?.hook.thread]?.systems?.filter((s) => PLAYABLE_SYSTEMS.includes(s)) || [];
  const located = PLAYABLE_SYSTEMS.find((s) => lead.location?.includes(s));
  const pulledSystem = pulled && (systemOf(pulled.location) || systemOf(pulled.title));
  const system = pulledSystem || (play && PLAYABLE_SYSTEMS.includes(play.system) ? play.system : null)
    || located || pick(threadSystems) || (PLAYABLE_SYSTEMS.includes(lead.system) ? lead.system : pick(PLAYABLE_SYSTEMS));

  const vars = { patron: target.name, target: target.name, antagonist: antagonist.name, system };
  // One real contract, shared with the party, anchors the job: its destination stands in for the story's place.
  // A saga lead brings its own: the real place and activity where the clue is.
  const anchorTpl = pick(ANCHORS[typeKey]);
  const anchor = pulled
    ? {
      ...pulledAnchor(kind, pulled, vars),
      ...(play ? { standIn: `${pulledAnchor(kind, pulled, vars).standIn} And this is the lead for ${sagaTitle}:${play.find ? ` the clue is ${play.find}.` : " get it done and the story moves."}` } : {}),
      share: SHARE_HOW,
      saga: Boolean(play),
    }
    : play
    ? {
      contract: `${play.contract}, at ${play.where}`,
      standIn: `This job is part of ${sagaTitle || "the long story"}.${play.find ? ` The clue is ${play.find}: get it, and the story moves.` : ""} ${fill(anchorTpl.standIn, vars)}`,
      share: SHARE_HOW,
      saga: true,
    }
    : { contract: `${anchorTpl.contract} in ${system}`, standIn: fill(anchorTpl.standIn, vars), share: SHARE_HOW };
  // Everyone gets a different crew role, based on their story (and their own pick, if they set one).
  const roles = { ...CREW_ROLES, ...(g.customRoles || {}) };
  const objectives = assignRoles(characters, typeKey, g.customRoles || {}).map(({ char, role, why }) => ({
    characterId: char.id,
    characterName: char.name,
    activity: role,
    role,
    roleLabel: roles[role].label,
    roleEmoji: roles[role].emoji,
    why,
    text: roles[role].job,
  }));
  const activities = type.activities;

  return {
    id: newId(),
    type: typeKey,
    typeLabel: type.label,
    emoji: type.emoji,
    title: missionTitle(g),
    system,
    antagonist: antagonist.name,
    target: target.name,
    patron: target.name,
    names: [antagonist.name, target.name],
    crossings: crossings.map((c) => c.text),
    anchor,
    ...(pulled ? { pulled: { title: pulled.title, location: pulled.location || null, kind: kind.key }, addon: pickAddon(kind, vars) } : {}),
    rendezvous: pick(RENDEZVOUS[system] || ["the nearest station"]),
    ...rollStops(characters, system),
    objectives,
    briefing: pulled
      ? `Spacers. You pulled ${kind.label}: "${pulled.title}"${pulled.location ? ` at ${pulled.location}` : ""}. Fine. Here's what it really is. ${anchor.standIn} Do the job the contract asks. The story's in how you do it.`
      : `Spacers. ${fill(pick(type.hooks), vars)} It's going down in ${system}. Pay's decent. The story's better.`,
    stakes: fill(pick(MISSION_STAKES[typeKey]), vars),
    rules: rulesFor(activities).map((r) => r.text),
    twist: fill(pick(MISSION_TWISTS), vars),
    characterIds: characters.map((c) => c.id),
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

export function missionEpilogue(mission, success) {
  return success
    ? `Job done. And the part I didn't tell you: ${lowerFirstWord(mission.twist)} Keep that in mind next time someone offers you easy money.`
    : `Didn't go to plan, did it? Here's what I didn't tell you: ${lowerFirstWord(mission.twist)} Lick your wounds, spacers. ${mission.antagonist} will remember your faces.`;
}

// Lower-cases only a leading article/pronoun ("The cargo…" → "the cargo…"), never a name.
function lowerFirstWord(s) {
  return /^(The|Someone|A|An)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

// ── Rolling a mission back ───────────────────────────────────────────────────
// Snapshot what exists before building a mission, so a scrapped mission can undo exactly what it
// created: its new NPCs, their names, the NPC links it invented, and its title.
export function snapshot(g) {
  return {
    npcIds: new Set(Object.keys(g.npcs)),
    linkKeys: new Set(Object.keys(g.npcLinks || {})),
    names: (g.usedNames || []).length,
    titles: (g.usedTitles || []).length,
  };
}

export function createdSince(g, snap) {
  return {
    npcIds: Object.keys(g.npcs).filter((id) => !snap.npcIds.has(id)),
    linkKeys: Object.keys(g.npcLinks || {}).filter((k) => !snap.linkKeys.has(k)),
    names: (g.usedNames || []).slice(snap.names),
    titles: (g.usedTitles || []).slice(snap.titles),
  };
}

export function rollbackMission(g, mission) {
  const made = mission.created || { npcIds: [], linkKeys: [], names: [], titles: [] };
  // Only remove NPCs nothing else has started using since.
  const inUse = new Set(Object.values(g.characters).flatMap((c) => c.hooks.map((h) => h.npcId)));
  for (const m of Object.values(g.missions || {})) if (m.id !== mission.id) for (const n of m.names || []) inUse.add(n);
  for (const id of made.npcIds) {
    const npc = g.npcs[id];
    if (npc && !inUse.has(id) && !inUse.has(npc.name)) {
      delete g.npcs[id];
      g.usedNames = (g.usedNames || []).filter((n) => n !== npc.name);
    }
  }
  for (const k of made.linkKeys) delete g.npcLinks?.[k];
  g.usedTitles = (g.usedTitles || []).filter((t) => !made.titles.includes(t));
  for (const id of mission.characterIds) {
    const c = g.characters[id];
    if (!c) continue;
    c.journal = c.journal.filter((j) => !(j.kind === "mission" && j.text.includes(`"${mission.title}"`)));
    if (c.roleHistory) c.roleHistory = c.roleHistory.filter((r) => r.missionId !== mission.id);
  }
  delete g.missions[mission.id];
}

// ── Dice and forced stops ────────────────────────────────────────────────────
export const roll = (sides) => 1 + Math.floor(Math.random() * sides);

// "2d6+1" → { total, rolls, text }. Returns null if it can't parse.
export function rollDice(expr = "d20") {
  const m = String(expr).replace(/\s+/g, "").toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return null;
  const count = Math.min(Math.max(Number(m[1] || 1), 1), 20);
  const sides = Math.min(Math.max(Number(m[2]), 2), 1000);
  const mod = Number(m[3] || 0);
  const rolls = Array.from({ length: count }, () => roll(sides));
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return { total, rolls, sides, mod, text: `${count}d${sides}${mod ? (mod > 0 ? `+${mod}` : mod) : ""}` };
}

// A d20 decides how rough the road is. Damage or injuries the crew is carrying force a stop of their own.
export function rollStops(characters, system) {
  const d20 = roll(20);
  const count = d20 <= 4 ? 2 : d20 <= 19 ? 1 : 0;
  const hostileBias = d20 <= 8;
  const places = STOP_PLACES[system] || STOP_PLACES.Stanton;
  const stops = [];

  const damaged = characters.find((c) => (c.conditions || []).some((x) => x.status === "active" && x.kind === "ship"));
  const hurt = characters.find((c) => (c.conditions || []).some((x) => x.status === "active" && x.kind === "injury"));
  // Repairs need a pad and services; healing needs somewhere safe.
  const repairs = places.filter((p) => p.kind === "resupply");
  const safe = places.filter((p) => p.kind === "friendly" || p.kind === "resupply" || p.kind === "camp");
  if (damaged) stops.push(makeStop(repairs.length ? repairs : places, fill(pick(STOP_REASONS.ship), { who: damaged.name }), "Land and patch the hull before anything else. The rest of the crew keeps watch while it's done.", damaged.name));
  if (hurt && stops.length < 2) stops.push(makeStop((safe.length ? safe : places).filter((p) => !stops.some((x) => x.place === p.place)), fill(pick(STOP_REASONS.injury), { who: hurt.name }), null, hurt.name));

  const used = new Set(stops.map((x) => x.place));
  while (stops.length < count) {
    const isHostile = (k) => k === "hostile" || k === "held";
    const wantHostile = hostileBias && !stops.some((x) => isHostile(x.kind));
    let pool = places.filter((p) => !used.has(p.place) && (!wantHostile || isHostile(p.kind)));
    if (!pool.length) pool = places.filter((p) => !used.has(p.place));
    const stop = makeStop(pool.length ? pool : places, pick(STOP_REASONS.any));
    used.add(stop.place);
    stops.push(stop);
  }
  return { roadRoll: d20, stops };
}

// `forcedBy` is the name of the character whose condition forces this stop (or null).
function makeStop(pool, reason, action = null, forcedBy = null) {
  const p = pick(pool);
  return {
    place: p.place,
    kind: p.kind,
    reason,
    action: action || fill(pick(STOP_ACTIONS[p.kind] || STOP_ACTIONS.hostile), {
      faction: p.faction ? (p.faction.endsWith("s") ? `The ${p.faction}` : p.faction) : "Someone",
      ground: p.faction ? `${p.faction.replace(/s$/, "")} ground` : "someone else's ground",
    }),
    need: pick(STOP_NEEDS),
    forced: Boolean(forcedBy),
    forcedBy,
  };
}

export function roadRollLabel(d20) {
  if (d20 <= 4) return "Rough road: two stops, and trouble at the first";
  if (d20 <= 8) return "Trouble on the way";
  if (d20 <= 19) return "One stop on the way";
  return "Clean run: the lanes are clear";
}

// ── Crew roles ───────────────────────────────────────────────────────────────
// Scores every (character, role) pair, then hands out roles greedily so nobody doubles up.
// Preferred role > words in their story/name > origin > old career; recent roles are discouraged
// (so people try new things) unless it's their chosen role. The mission's key role gets a nudge.
export function assignRoles(characters, typeKey, customRoles = {}) {
  const needs = MISSION_NEEDS[typeKey] || [];
  const pairs = [];
  for (const c of characters) {
    const text = [c.name, c.seed || "", ...(c.story || [])].join(" ");
    const recent = (c.roleHistory || []).slice(-2).map((r) => r.role);
    for (const role of [...Object.keys(CREW_ROLES), ...Object.keys(customRoles)]) {
      let score = Math.random();
      let why = "something new to try";
      if (c.preferredRole === role) { score += 20; why = "your chosen role"; }
      else if (customRoles[role]) {
        // Custom roles only go to people who chose them or whose story clearly matches them.
        if (customRoleWords(customRoles[role])?.test(text)) { score += 4; why = "it fits your story"; }
        else continue;
      } else {
        if (ROLE_WORDS[role]?.test(text)) { score += 4; why = "it fits your story"; }
        if ((ORIGIN_ROLES[c.originId] || []).includes(role)) { score += 3; if (why === "something new to try") why = `it suits a ${c.origin}`; }
        if (CAREER_TO_ROLE[c.career] === role) score += 2;
        score -= 2.5 * recent.filter((r) => r === role).length;
      }
      if (needs[0] === role) score += 2;
      else if (needs.includes(role)) score += 1;
      pairs.push({ char: c, role, score, why });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const taken = new Set();
  const done = new Map();
  for (const p of pairs) {
    if (done.has(p.char.id) || taken.has(p.role)) continue;
    taken.add(p.role);
    done.set(p.char.id, p);
  }
  // More people than roles (10 built-in): the rest double up on their best fit.
  for (const p of pairs) if (!done.has(p.char.id)) done.set(p.char.id, { ...p, why: `${p.why}, sharing the job` });
  return characters.map((c) => done.get(c.id));
}
