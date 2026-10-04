// Crew roles: the built-in ones plus custom roles a server creates. Custom role keys start with
// "c:" so they can never collide with a built-in key.

import { CREW_ROLES } from "../lore/data.js";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function allRoles(g) {
  return { ...CREW_ROLES, ...(g?.customRoles || {}) };
}

export function roleInfo(g, key) {
  return allRoles(g)[key] || null;
}

// Find a role by key or by its name, ignoring case ("information broker" → c:information-broker).
export function findRole(g, text) {
  if (!text) return null;
  const roles = allRoles(g);
  if (roles[text]) return text;
  const q = text.trim().toLowerCase();
  return Object.keys(roles).find((k) => roles[k].label.toLowerCase() === q) || null;
}

export function addCustomRole(g, { label, job, emoji, createdBy }) {
  g.customRoles ??= {};
  const clean = label.trim().slice(0, 40);
  const key = `c:${slug(clean)}`;
  g.customRoles[key] = {
    label: clean,
    job: job.trim().slice(0, 300),
    emoji: (emoji || "").trim().slice(0, 8) || "⭐",
    custom: true,
    createdBy,
  };
  return key;
}

export function removeCustomRole(g, key) {
  if (!g.customRoles?.[key]) return false;
  delete g.customRoles[key];
  for (const c of Object.values(g.characters || {})) if (c.preferredRole === key) c.preferredRole = null;
  return true;
}

// Custom roles match a story by the meaningful words in their name ("Information Broker" → informat|broker).
export function customRoleWords(role) {
  const words = role.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
  return words.length ? new RegExp(`\\b(${words.map((w) => w.slice(0, Math.max(4, w.length - 2))).join("|")})\\w*`, "i") : null;
}
