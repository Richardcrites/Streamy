// Story hooks built from parts (lore/hooks.js): who the NPC is to the character, what they're doing now,
// and where. Parts that fit the player's own words are preferred, parts already used on the server are
// avoided, and a hook's exact wording is never repeated, so every character's hooks are their own.

import { HOOK_TYPES, HOOK_ROLES, HOOK_EVENTS, HOOK_PLACES, HOOK_WHERE } from "../lore/hooks.js";
import { fill, pick } from "./util.js";

// Traits that make one kind of hook more likely.
const TYPE_TRAITS = { enemy: ["vengeance", "criminal"], debt: ["debt", "gambler", "fallen_rich"], lost: ["lost_family", "survivor", "runaway"], secret: ["haunted", "tinkerer", "criminal"], oath: ["loyal", "faith", "ex_military"] };

// When the player's words fit some parts, only those are considered (least used first); the who + what +
// where combination keeps the whole hook unique even when a fitting part has been used before.
function leastUsed(g, list, key, tags = [], exclude = new Set()) {
  g.hookUse ??= {};
  let scored = list.map((item, i) => {
    const it = typeof item === "string" ? { text: item, tags: [] } : item;
    const fit = (it.tags || []).filter((t) => tags.includes(t)).length;
    return { it, k: `${key}:${i}`, fit, score: fit - (g.hookUse[`${key}:${i}`] || 0) * 10 + Math.random() * 2 };
  });
  scored = scored.filter((x) => !exclude.has(x.k));
  if (scored.some((x) => x.fit > 0)) scored = scored.filter((x) => x.fit > 0);
  return scored.sort((a, b) => b.score - a.score)[0];
}

// Pick hook types: ones the player's words lean toward first, never two of the same kind.
export function pickHookTypes(tags, count, exclude = []) {
  const scored = HOOK_TYPES.filter((t) => !exclude.includes(t))
    .map((t) => ({ t, s: TYPE_TRAITS[t].filter((x) => tags.includes(x)).length * 2 + Math.random() * 2 }))
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, count).map((x) => x.t);
}

// One hook. Returns { type, text, thread, keys } (keys are recorded as used once the character is saved).
// avoid: role/place keys already used by this character's other hooks (filled in as hooks are made).
export function composeHook(g, { type, short, pronouns, tags = [], npcName, taken = new Set(), avoid = new Set() }) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const role = leastUsed(g, HOOK_ROLES, "role", tags, avoid);
    const event = leastUsed(g, HOOK_EVENTS[type], `event:${type}`);
    const place = leastUsed(g, HOOK_PLACES, "place", [], avoid);
    const where = pick(HOOK_WHERE[type]);
    const vars = { short, npc: npcName, place: place.it.text };
    const text = fill(`${npcName}, ${role.it.text}, ${event.it.text}. ${where}`, vars, pronouns);
    if (!taken.has(text) || attempt === 7) {
      for (const k of [role.k, event.k, place.k]) g.hookUse[k] = (g.hookUse[k] || 0) + 1;
      avoid.add(role.k);
      avoid.add(place.k);
      return { type, text, thread: place.it.thread };
    }
  }
}

export const allHookTexts = (g) => new Set(Object.values(g.characters || {}).flatMap((c) => (c.hooks || []).map((h) => h.text)));
