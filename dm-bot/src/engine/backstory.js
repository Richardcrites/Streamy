// Origin stories. The player's own written story is canon: it is kept as written, and the DM only adds
// what it leaves out (where they're from, who raised them, their first ship, what they want now).
// With no written story, one is assembled from many small pieces and told through one of several
// frames. Pieces already used on the server are avoided, and no sentence is reused from another
// character's story, so no two characters read alike.

import {
  ORIGIN_BITS, FAMILY, CHILDHOOD, TURNS, SHIPS, SHIP_HOW, SKILLS, FLAWS, MEMENTOS, WANTS, SECRETS,
  RUMOUR_INTROS, OBJECT_INTROS, NOW_LINES, RECORD_NOTES, TRAITS, traitsFromText,
} from "../lore/backstory.js";
import { fill, pick, pickN } from "./util.js";

// What a written story already covers, so the DM doesn't add a second family or a second first ship.
const TOPICS = {
  place: /\b(born|grew up|raised (in|on)|from (the )?[A-Z]|home(world| town)?|lorville|orison|area ?18|new babbage|levski|terra|ruin station|pyro|nyx|stanton)\b/i,
  family: /\b(mother|father|mom|mum|dad|parents?|sister|brother|sibling|family|grand(ma|pa|mother|father)|uncle|aunt|orphan)\b/i,
  childhood: /\b(kid|child(hood)?|young|teen|school|grew up|as a boy|as a girl)\b/i,
  ship: /\b(ship|aurora|mustang|cutlass|avenger|freelancer|constellation|gladius|arrow|pisces|nomad|prospector|vulture|titan|hull|cockpit)\b/i,
  turn: /\b(until|then|one day|after|when|everything changed|that's when|but)\b/i,
  want: /\b(wants?|dreams?|hopes?|goal|plans? to|looking for|searching for|trying to|needs? to|someday)\b/i,
};
export const coveredTopics = (text) => Object.fromEntries(Object.entries(TOPICS).map(([k, re]) => [k, re.test(text || "")]));

// ── Piece choice: favour pieces that fit the player's words, avoid ones used on this server ──
function chooser(g, tags) {
  g.storyUse ??= {};
  const used = [];
  // fitOnly: around a written story, only add a piece that fits the player's own words (else nothing).
  const choose = (pool, poolKey, { fitOnly = false } = {}) => {
    const scored = pool.map((item, i) => {
      const it = typeof item === "string" ? { text: item, tags: [] } : item;
      const fit = (it.tags || []).filter((t) => tags.includes(t)).length;
      const uses = g.storyUse[`${poolKey}:${i}`] || 0;
      return { it, key: `${poolKey}:${i}`, fit, score: fit * 3 - uses * 10 + Math.random() * 2 };
    }).filter((x) => !fitOnly || x.fit > 0).sort((a, b) => b.score - a.score);
    if (!scored.length) return null;
    used.push(scored[0].key);
    return scored[0].it.text;
  };
  return { choose, used };
}

const sentences = (text) => (text.match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim()).filter((s) => s.length > 30);

// How many sentences this story shares word-for-word with other characters' stories.
function overlap(story, others) {
  const mine = new Set(story.flatMap(sentences));
  return others.flatMap((o) => (o.story || []).flatMap(sentences)).filter((s) => mine.has(s)).length;
}

// ── The player's written story ───────────────────────────────────────────────
export function writtenParagraphs(text) {
  return String(text || "").split(/\n\s*\n/).map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
}

// A "written story" long enough to be the story, not just a one-line idea.
export const isWrittenStory = (text) => String(text || "").trim().length >= 160 || /[.!?]\s+\S.*[.!?]/.test(String(text || "").trim());

// ── Build ────────────────────────────────────────────────────────────────────
// seedLine: turns a short one-line idea into a paragraph (story.js's seedParagraph).
export function buildBackstory(g, { name, short, pronouns, originId, origin, written, seedLine, others = [] }) {
  const bits = ORIGIN_BITS[originId] || Object.values(ORIGIN_BITS)[0];
  const fromWords = traitsFromText(written || seedLine || "");
  let best = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    // A composed story gets a coherent core: the themes in the player's idea, topped up to two at random,
    // so its pieces belong to one life instead of five.
    const tags = written ? fromWords : [...fromWords, ...pickN(Object.keys(TRAITS).filter((t) => !fromWords.includes(t)), Math.max(0, 2 - fromWords.length))];
    const { choose, used } = chooser(g, tags);
    const story = isWrittenStory(written)
      ? aroundWritten({ choose, bits, name, short, pronouns, written })
      : composed({ choose, bits, name, short, pronouns, origin, seedLine, tags });
    const score = overlap(story, others);
    if (!best || score < best.score) best = { story, used, score };
    if (score === 0) break;
  }
  for (const key of best.used) g.storyUse[key] = (g.storyUse[key] || 0) + 1;
  return best.story;
}

// Their story, kept as written, with only the missing pieces added around it.
function aroundWritten({ choose, bits, name, short, pronouns, written }) {
  const has = coveredTopics(written);
  const paras = writtenParagraphs(written);
  const length = written.length;
  const vars = { name, short };
  const f = (t, extra = {}) => fill(fill(t, { ...vars, ...extra }, pronouns), vars, pronouns);
  const firstPerson = /^(i|i'm|i've|my)\b/i.test(paras[0]);
  const namesThem = paras.join(" ").toLowerCase().includes(name.toLowerCase()) || paras.join(" ").toLowerCase().includes(short.toLowerCase());

  const out = [];
  // Where they're from, if they didn't say; and the full name once, if their text never uses it.
  if (!has.place) out.push(f(`${firstPerson || !namesThem ? "{name}" : "{short}"} comes from ${pick(bits.places)}, ${pick(bits.details)}.`));
  else if (!namesThem || firstPerson) out.push(f("This is {name}'s story."));
  out.push(...(firstPerson ? [`In ${short}'s own words: "${paras[0]}"`, ...paras.slice(1).map((p) => `"${p}"`)] : paras));

  // Fill gaps, more for a short story, less for a long one. Never retell what they already wrote.
  // Only pieces that fit their words are added, so nothing contradicts or flattens what they wrote.
  const room = length > 1200 ? 1 : length > 500 ? 2 : 3;
  const fit = { fitOnly: true };
  const adds = [];
  const family = !has.family && choose(FAMILY, "family", fit);
  if (family && adds.length < room) adds.push(f(family));
  const how = !has.ship && choose(SHIP_HOW, "shiphow", fit);
  if (how && adds.length < room) adds.push(f(`${short}'s first ship was ${choose(SHIPS, "ship")}, ${how}.`));
  const skill = choose(SKILLS, "skill", fit);
  const flaw = choose(FLAWS, "flaw", fit);
  if (adds.length < room && (skill || flaw)) adds.push(f(skill && flaw ? `${short} is ${skill}. The problem is ${flaw}.` : skill ? `${short} is ${skill}.` : `${short}'s problem is ${flaw}.`));
  const memento = choose(MEMENTOS, "memento", fit);
  if (memento && adds.length < room) adds.push(f(`${short} still carries ${memento}.`));
  if (adds.length) out.push(adds.join(" "));
  const want = !has.want && choose(WANTS, "want", fit);
  if (want) out.push(f(pick(NOW_LINES), { want: f(want) }));
  return out;
}

// "in New Babbage" but "on Ruin Station", "on a freighter".
const at = (place) => (/^(the hold|the cargo decks)/i.test(place) ? "in" : /(station|yacht|freighter|ship|souli)\b/i.test(place) ? "on" : "in");

// No written story: assemble one from pieces, told through one of five frames.
function composed({ choose, bits, name, short, pronouns, origin, seedLine, tags }) {
  const vars = { name, short };
  const f = (t, extra = {}) => fill(fill(t, { ...vars, ...extra }, pronouns), vars, pronouns);
  const place = pick(bits.places);
  const detail = pick(bits.details);
  const family = f(choose(FAMILY, "family"));
  const childhood = f(choose(CHILDHOOD, "child"));
  const turn = f(choose(TURNS, "turn"));
  const ship = f(`${short}'s first ship was ${choose(SHIPS, "ship")}, ${choose(SHIP_HOW, "shiphow")}.`);
  const traits = f(`${short} is ${choose(SKILLS, "skill")}. The problem is ${choose(FLAWS, "flaw")}.`);
  // Mementos and secrets only appear when they belong to this life (a ticket stub needs a performer).
  const memento = f(choose(MEMENTOS, "memento", { fitOnly: true }) || "a scrap of hull plating with a name scratched into it");
  const want = f(choose(WANTS, "want"));
  const secret = f(choose(SECRETS, "secret", { fitOnly: true }) || SECRETS[0].text);
  const now = f(pick(NOW_LINES), { want });
  const seed = seedLine || null;
  const frames = [
    // Chronological.
    () => [f(`{name} was born ${at(place)} ${place}, ${detail}.`) + ` ${family}`, ...(seed ? [seed] : []), `${childhood} ${turn}`, `${ship} ${traits}`, `${f(`${short} still carries`)} ${memento}. ${now}`],
    // In the middle of things, then back to the start.
    () => [f(`Right now {name} wants ${want}.`) + f(" It didn't start that way."), f(`It started ${at(place)} ${place}, ${detail}.`) + ` ${family} ${childhood}`, ...(seed ? [seed] : []), turn, `${traits} ${f("What {short} won't say out loud:")} ${secret}.`],
    // What people say.
    () => [f(pick(RUMOUR_INTROS), { hangout: pick(bits.hangouts) }), f(`{name} grew up ${at(place)} ${place}. `) + family, ...(seed ? [seed] : []), turn, f(`What everyone agrees on: ${short} is ${choose(SKILLS, "skill")}, and carries ${memento}.`), now],
    // Three objects.
    () => [f(pick(OBJECT_INTROS)), f(`The first is ${memento}. It goes back to ${place}, and to {name}'s family: `) + family, ...(seed ? [seed] : []), f("The second is the ship. ") + ship + " " + turn, f(`The third is a promise ${short} made to {themselves}: ${want}.`).replace("{themselves}", "no one in particular") + ` ${traits}`],
    // An official record, and what it leaves out.
    () => [f(`CITIZEN RECORD (excerpt). Name: {name}. Origin: ${origin}. Place of birth: ${place}. Notes: ${pick(RECORD_NOTES)}.`), f("The record leaves out everything that matters. ") + `${family} ${childhood}`, ...(seed ? [seed] : []), turn, `${traits} ${now}`],
  ];
  return pick(frames)().map((p) => p.trim()).filter(Boolean);
}
