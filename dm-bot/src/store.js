// Persistent storage: a single JSON file, written atomically (write temp file, then rename).
// Plenty for a Discord community's characters and campaigns, and needs no database setup.
// Data is partitioned per Discord server (guild), so one bot can serve many communities.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_FILE = process.env.DATA_FILE || path.resolve("data", "db.json");

let db = { guilds: {} };
let saveTimer = null;

export function load() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    db = { guilds: {} };
  }
  return db;
}

export function saveNow() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}

export function newId() {
  return crypto.randomBytes(4).toString("hex");
}

export function guild(guildId) {
  db.guilds[guildId] ??= {
    settings: { commsChannelId: null, dmPlayers: true },
    characters: {},
    activeChar: {},
    campaigns: {},
    orgs: {},
    npcs: {},
    drafts: {},
    worldLog: [],
  };
  return db.guilds[guildId];
}

// ── Characters ───────────────────────────────────────────────────────────────
export function activeCharacter(g, userId) {
  const id = g.activeChar[userId];
  return id ? g.characters[id] : null;
}

export function charactersOf(g, userId) {
  return Object.values(g.characters).filter((c) => c.ownerId === userId);
}

export function addJournal(char, entry) {
  char.journal.push({ at: new Date().toISOString(), ...entry });
  if (char.journal.length > 200) char.journal.splice(0, char.journal.length - 200);
}

// ── Orgs ─────────────────────────────────────────────────────────────────────
export function orgOf(g, userId) {
  return Object.values(g.orgs).find((o) => o.members.includes(userId)) || null;
}

export function findOrg(g, nameOrTag) {
  const q = nameOrTag.trim().toLowerCase();
  return Object.values(g.orgs).find((o) => o.name.toLowerCase() === q || o.tag.toLowerCase() === q) || null;
}

// ── Campaigns ────────────────────────────────────────────────────────────────
export function activeCampaignFor(g, charId) {
  return Object.values(g.campaigns).find((c) => c.status === "active" && c.characterIds.includes(charId)) || null;
}

// ── World log: shared history that links everyone's stories together ─────────
export function logWorld(g, text) {
  g.worldLog.push({ at: new Date().toISOString(), text });
  if (g.worldLog.length > 100) g.worldLog.splice(0, g.worldLog.length - 100);
}
