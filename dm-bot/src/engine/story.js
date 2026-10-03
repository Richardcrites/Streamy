// The procedural Game Master. Every function here works offline, using only the lore data.
// When the Claude API is configured, ai.js rewrites the *prose* of these results; the
// structure (objectives, locations, hooks, choices) always comes from here, so quests
// stay grounded in content that actually exists in the game.

import {
  ORIGINS, NAME_POOLS, NPC_POOL, RELICS, LOCATIONS, CARGO, ORES, EVIDENCE,
  OBJECTIVES, ACTIVITY_TAGS, CAMPAIGN_GOALS, THREADS, CAREERS, MISSION_TYPES, MISSION_TWISTS,
} from "../lore/data.js";
import { pick, pickN, randInt, fill } from "./util.js";
import { newId } from "../store.js";

const PLAYABLE_SYSTEMS = Object.keys(LOCATIONS);

// ── Names ────────────────────────────────────────────────────────────────────
export function suggestNames(originId, count = 6) {
  const pool = NAME_POOLS[ORIGINS[originId]?.names] || NAME_POOLS.common;
  const names = new Set();
  let guard = 0;
  while (names.size < count && guard++ < 100) {
    let name = `${pick(pool.first)} ${pick(pool.last)}`;
    if (pool.callsigns && Math.random() < 0.5) {
      const [first, ...rest] = name.split(" ");
      name = `${first} "${pick(pool.callsigns)}" ${rest.join(" ")}`;
    }
    names.add(name);
  }
  return [...names];
}

// ── NPCs: persisted so they recur across stories ─────────────────────────────
export function createNpc(g, role, extra = {}) {
  const npc = {
    id: newId(),
    name: `${pick(NPC_POOL.first)} ${pick(NPC_POOL.last)}`,
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
  const surname = name.replace(/".*?"\s*/, "").split(" ").slice(-1)[0];
  const relic = pick(RELICS);
  const npcA = createNpc(g);
  const npcB = createNpc(g);
  const vars = { name, short: shortName(name), surname, home: origin.home, relic, npc: npcA.name, npc2: npcB.name };

  const hooks = origin.hooks.map((h, i) => ({
    id: newId(),
    type: h.type,
    text: fill(h.text, vars, pronouns),
    thread: h.thread,
    npcId: i === 0 ? npcA.id : npcB.id,
    status: "open",
  }));
  npcA.role = roleForHook(hooks[0].type);
  npcB.role = roleForHook(hooks[1].type);

  // The player's seed isn't pasted into the story (it rarely fits the template). It's stored,
  // the AI narrator weaves it in, and players can write their own with /character backstory.
  const story = origin.story.map((p) => fill(p, vars, pronouns));

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
    hooks,
    renown: {},
    relationships: [],
    titles: [],
    journal: [],
    createdAt: new Date().toISOString(),
  };
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

export function buildObjective(campaign, char, activities) {
  const careerActs = CAREERS[char.career]?.activities || [];
  const preferred = activities.filter((a) => careerActs.includes(a));
  const activity = pick(preferred.length ? preferred : activities);
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

  const objectives = characters.map((c) => buildObjective(campaign, c, act.activities));
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

// ── One-shot missions ────────────────────────────────────────────────────────
export function buildMission(g, characters, typeId) {
  const type = MISSION_TYPES[typeId] || pick(Object.values(MISSION_TYPES));
  const lead = characters[0];
  const located = PLAYABLE_SYSTEMS.find((s) => lead.location?.includes(s));
  const system = located || (PLAYABLE_SYSTEMS.includes(lead.system) ? lead.system : pick(PLAYABLE_SYSTEMS));
  const patron = createNpc(g, pick(NPC_POOL.roles));
  const antagonist = createNpc(g, "antagonist");
  const vars = { patron: patron.name, antagonist: antagonist.name, system };
  const fake = { vars };
  const objectives = characters.map((c) => buildObjective(fake, c, type.activities));
  const hook = fill(pick(type.hooks), vars);
  return {
    id: newId(),
    type: Object.keys(MISSION_TYPES).find((k) => MISSION_TYPES[k] === type),
    typeLabel: type.label,
    emoji: type.emoji,
    title: `${type.label}: ${pick(["Dead Signal", "Cold Lanes", "The Quiet Job", "Ashes in the Black", "Last Light", "Burn Notice", "Static", "Blind Jump"])}`,
    system,
    patron: patron.name,
    antagonist: antagonist.name,
    objectives,
    briefing:
      `Listen up, spacers. ${hook} The job's in ${system}. Pay is good, questions are expensive, and I'd keep one eye on ${antagonist.name}. ` +
      "Something about this one doesn't sit right with me.",
    twist: fill(pick(MISSION_TWISTS), vars),
    opening: `The comms line goes quiet. Somewhere in ${system}, ${antagonist.name} is already moving. What does the crew do first?`,
    rpPrompts: [
      `Decide as a crew: do you trust ${patron.name}? Say it in character.`,
      "Halfway through, something goes wrong. Whoever is closest to it describes what they see.",
    ],
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
