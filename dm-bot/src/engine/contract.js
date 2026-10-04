// Contract-first missions: the crew pulls a real contract in game and tells the DM what it is and where.
// That contract and place are the spine of the mission. The story is written around what the contract
// really is (a bounty stays a bounty, a cargo run stays cargo), and the DM may add one optional extra.

import { PYRO_POIS, PYRO_STATIONS } from "../lore/pyro.js";
import { fill, pick } from "./util.js";

// What a contract is, from its name. Order matters: the first match wins.
export const CONTRACT_KINDS = [
  { key: "rescue", re: /ecn|beacon|distress|emergency|rescue/i, type: "rescue", activity: "rescue", label: "a rescue",
    standIns: ["Whoever is in trouble there is one of {target}'s people. Whoever caused it works for {antagonist}."] },
  { key: "search", re: /search|missing|locate|find|lost/i, type: "rescue", activity: "rescue", label: "a search",
    standIns: ["The person you're looking for is {target}, or someone who knows where {target} is.", "The missing person was last seen with {antagonist}'s people. Find them before {antagonist} does."] },
  { key: "investigate", re: /dossier|investigat|onyx|facility|research|intel|data|evidence|smuggler/i, type: "heist", activity: "investigate", label: "an investigation",
    standIns: ["What you recover there is the evidence against {antagonist}.", "{target} needs what's in that place. {antagonist} wants it buried."] },
  { key: "defend", re: /defen[cd]|protect|occupant|hold|guard|repel/i, type: "defense", activity: "fps", label: "a defence",
    standIns: ["The people you're defending are {target}'s. The attackers work for {antagonist}.", "That site matters to {target}. {antagonist} wants it, and is sending people to take it."] },
  { key: "delivery", re: /deliver|package|courier/i, type: "smuggle", activity: "delivery", label: "a delivery",
    standIns: ["The package is {target}'s, and {antagonist} would kill to know what's inside.", "The package is a message for {target}. Don't let {antagonist}'s people near it."] },
  { key: "haul", re: /haul|cargo|freight|supply|supplies|transport|\bscu\b|resupply/i, type: "smuggle", activity: "haul", label: "a cargo run",
    standIns: ["The cargo is {target}'s, under a legal manifest. Whoever comes for it works for {antagonist}.", "Somewhere in that cargo is something {antagonist} wants back. {target} is counting on it arriving."] },
  { key: "salvage", re: /salvag|wreck|derelict|scrap|hull/i, type: "salvage", activity: "salvage", label: "a salvage job",
    standIns: ["The wreck is tied to {target}. What you strip from it tells the story.", "That wreck was {antagonist}'s. Its black box is the clue."] },
  { key: "mining", re: /\bmin(e|ing)|prospect|\bore\b|rock|sadaryx|quantainium/i, type: "salvage", activity: "mining", label: "a mining job",
    standIns: ["{target} needs what's in that rock. {antagonist} says it's theirs."] },
  { key: "recover", re: /recover|retrieve|collect|steal|acquire/i, type: "heist", activity: "fps", label: "a recovery",
    standIns: ["What you recover is what {target} needs. {antagonist} wants it first.", "The item is {antagonist}'s leverage. Take it, and they lose their grip on {target}."] },
  { key: "bounty", re: /bounty|hunt\b|\b(vlrt|lrt|mrt|hrt|vhrt|ert)\b|target|kill|eliminate|assassinat|wanted/i, type: "bounty", activity: "bounty", label: "a bounty",
    standIns: ["The target is {antagonist}, or {antagonist}'s right hand. The kill or capture is the story.", "Whoever's on that bounty knows where {target} is. Get what's on them."] },
  { key: "clear", re: /clear|retake|assault|outpost|bunker|platform|call to arms|destroy|raid|attack/i, type: "heist", activity: "fps", label: "a clear-out",
    standIns: ["The site belongs to {antagonist}. What you find inside once it's clear is what you came for.", "{target}'s people were taken there. Clear it and see who's still alive."] },
  { key: "other", re: /.*/, type: null, activity: "fps", label: "a job",
    standIns: ["Whatever this job turns out to be, {antagonist}'s people are somewhere in it, and {target} needs it done."] },
];

export const classifyContract = (title) => CONTRACT_KINDS.find((k) => k.re.test(title || "")) || CONTRACT_KINDS.at(-1);

// Which system a location is in, from the names players type ("Bloom", "Rat's Nest", "Daymar"...).
const SYSTEM_WORDS = {
  Stanton: /stanton|hurston|crusader|arccorp|microtech|lorville|orison|area ?18|new babbage|daymar|yela|cellin|aberdeen|arial|\bita\b|magda|calliope|clio|euterpe|wala|lyria|grim ?hex|everus|seraphim|baijini|tressler|onyx|kinga|selo|dasi/i,
  Pyro: new RegExp(["pyro", "monox", "bloom", "terminus", "ignis", "vatra", "adir", "fairo", "fuego", "lazarus", "farro", "pyam",
    ...[...PYRO_POIS, ...PYRO_STATIONS].map((p) => p.name.replace(/^the /i, ""))].map((w) => w.replace(/[.*+?^${}()|[\]\\']/g, ".?")).join("|"), "i"),
  Nyx: /\bnyx\b|levski|delamar|glaciem|keeger|\bqv\b|breaker station|extraction station/i,
};
export const systemOf = (text) => Object.keys(SYSTEM_WORDS).find((s) => SYSTEM_WORDS[s].test(text || "")) || null;

// The one optional extra the DM can add to a pulled contract. Everything in it is doable on site.
const ADDONS = [
  { not: ["search"], text: "🔎 **Find someone:** while you're there, look for {target}. Any NPC you meet, rescue or find on the site can be them: decide out loud." },
  { not: ["delivery", "haul"], text: "📦 **Bring something back:** take one datapad, crate, keycard or piece of loot off the site. That's {target}'s proof, so whoever carries it has to get out alive." },
  { not: [], text: "🗣️ **RP meet:** before you hand the job in, one of you plays {target} in voice. Everyone else gets one question for them." },
  { not: ["bounty"], text: "➕ **Stack a contract:** if a **Bounty Hunter** or **Search** contract shows up in the same system, take it too. In the story, it's {antagonist}'s people." },
  { not: [], text: "🎲 **Complication:** halfway through, roll a d20. On 1–8, {antagonist}'s people show up: whoever's closest to the exit holds them off." },
];

export function pulledAnchor(kind, { title, location }, vars) {
  return {
    contract: `**${title}** (the contract you pulled)`,
    where: location || null,
    standIn: fill(pick(kind.standIns), vars),
    pulled: true,
  };
}

export function pickAddon(kind, vars) {
  return fill(pick(ADDONS.filter((a) => !a.not.includes(kind.key))).text, vars);
}
