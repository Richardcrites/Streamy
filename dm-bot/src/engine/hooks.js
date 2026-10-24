// Story hooks written like the first lines of a sci-fi novel chapter (lore/hooks.js): one of many sentence
// shapes, filled with real Star Citizen places, events, ships, objects and factions. Shapes that fit the
// player's own words come first; every shape and detail already used on the server is avoided; a hook's
// exact wording never repeats, and one character never gets the same shape or place twice.

import { HOOK_TYPES, HOOK_TEMPLATES, HOOK_PLACES, HOOK_EVENTS, HOOK_SHIPS, HOOK_OBJECTS, HOOK_FACTIONS } from "../lore/hooks.js";
import { fill } from "./util.js";

// Traits that make one kind of hook more likely.
const TYPE_TRAITS = { enemy: ["vengeance", "criminal"], debt: ["debt", "gambler", "fallen_rich"], lost: ["lost_family", "survivor", "runaway"], secret: ["haunted", "tinkerer", "criminal"], oath: ["loyal", "faith", "ex_military"] };

// Least-used item of a list (fit to the player's words first when tags are given), skipping `exclude` keys.
function leastUsed(g, list, key, tags = [], exclude = new Set()) {
  g.hookUse ??= {};
  let scored = list.map((item, i) => {
    const it = typeof item === "string" ? { text: item, tags: [] } : item;
    const fit = (it.tags || []).filter((t) => tags.includes(t)).length;
    return { it, k: `${key}:${i}`, fit, score: fit * 12 - (g.hookUse[`${key}:${i}`] || 0) * 10 + Math.random() * 2 };
  }).filter((x) => !exclude.has(x.k));
  if (!scored.length) return null;
  return scored.sort((a, b) => b.score - a.score)[0];
}

// Pick hook types: ones the player's words lean toward first, never two of the same kind.
// A type with a sentence shape written for the player's traits (a comedian's heckler) is favoured too.
export function pickHookTypes(tags, count, exclude = []) {
  const fitsShape = (t) => HOOK_TEMPLATES[t].some((x) => (x.tags || []).some((tag) => tags.includes(tag)));
  return HOOK_TYPES.filter((t) => !exclude.includes(t))
    .map((t) => ({ t, s: TYPE_TRAITS[t].filter((x) => tags.includes(x)).length * 2 + (fitsShape(t) ? 3 : 0) + Math.random() * 2 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.t);
}

// One hook. Returns { type, text, thread }.
// avoid: keys already used by this character's other hooks (filled in as hooks are made).
export function composeHook(g, { type, short, pronouns, tags = [], npcName, taken = new Set(), avoid = new Set() }) {
  let made = null;
  for (let attempt = 0; attempt < 8 && !made; attempt++) {
    const shape = leastUsed(g, HOOK_TEMPLATES[type], `shape:${type}`, tags, avoid);
    const t = shape.it.text;
    const picks = [shape];
    const slot = (name, list, key) => {
      if (!t.includes(`{${name}}`)) return null;
      const p = leastUsed(g, list, key, [], avoid);
      picks.push(p);
      return p.it;
    };
    const place = slot("place", HOOK_PLACES, "place");
    const event = slot("event", HOOK_EVENTS, "event");
    const ship = slot("ship", HOOK_SHIPS, "ship");
    const object = slot("object", HOOK_OBJECTS, "object");
    const faction = slot("faction", HOOK_FACTIONS, "faction") || (t.includes("{Faction}") ? (picks.push(leastUsed(g, HOOK_FACTIONS, "faction", [], avoid)), picks.at(-1).it) : null);
    if (!ship && t.includes("{ship_name}")) picks.push(...[leastUsed(g, HOOK_SHIPS, "ship", [], avoid)].filter(Boolean));
    const shipText = ship || picks.find((p) => p.k.startsWith("ship:"))?.it;
    const vars = {
      short, npc: npcName, place: place?.text, event: event?.text, object: object?.text,
      ship: shipText?.text, ship_name: shipText?.text.replace(/^(a|an) /, ""),
      faction: faction?.text, Faction: faction?.text && faction.text[0].toUpperCase() + faction.text.slice(1),
    };
    // Every sentence starts with a capital, whatever lands there ("the Advocacy would kill for it").
    const text = fill(t, vars, pronouns).replace(/(^|[.!?]["”]?\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
    if (taken.has(text) && attempt < 7) continue;
    for (const p of picks) {
      g.hookUse[p.k] = (g.hookUse[p.k] || 0) + 1;
      avoid.add(p.k);
    }
    made = { type, text, thread: place?.thread || event?.thread || "headhunters" };
  }
  return made;
}

export const allHookTexts = (g) => new Set(Object.values(g.characters || {}).flatMap((c) => (c.hooks || []).map((h) => h.text)));
