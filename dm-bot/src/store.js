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
  clearTimeout(saveTimer);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  // Compact JSON: a big server's file is about a third smaller and much faster to write than pretty-printed.
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);
  backupDaily();
}

// One copy of the data per day in data/backups, the last 7 kept. A bad edit or a corrupted file never
// costs more than a day.
const BACKUPS_KEPT = 7;
let lastBackupDay = null;
function backupDaily() {
  const day = new Date().toISOString().slice(0, 10);
  if (day === lastBackupDay) return;
  try {
    const dir = path.join(path.dirname(DATA_FILE), "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `db-${day}.json`);
    if (!fs.existsSync(file)) fs.copyFileSync(DATA_FILE, file);
    const old = fs.readdirSync(dir).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0, -BACKUPS_KEPT);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
    lastBackupDay = day;
  } catch (err) {
    console.warn("[store] daily backup failed:", err.message);
  }
}

// Housekeeping on startup: drop stale drafts and expired contract offers, and slim down finished
// missions older than 30 days (their full story is kept in the archive).
const DAY = 24 * 60 * 60 * 1000;
export function tidy(data = db) {
  const now = Date.now();
  for (const g of Object.values(data.guilds || {})) {
    for (const [id, d] of Object.entries(g.drafts || {})) if (!d.at || now - d.at > DAY) delete g.drafts[id];
    for (const [id, p] of Object.entries(g.pulled || {})) if (now - p.at > 3 * 60 * 60 * 1000) delete g.pulled[id];
    for (const m of Object.values(g.missions || {})) {
      if (m.status === "active" || m.slim || now - Date.parse(m.createdAt) < 30 * DAY) continue;
      for (const k of ["briefing", "crossings", "objectives", "stops", "rules", "scribe", "notes", "epilogue", "twist", "stakes", "anchor", "addon", "created", "sagaResult"]) delete m[k];
      m.slim = true;
    }
  }
}

// ── Click locks ──────────────────────────────────────────────────────────────
// Two players pressing the same button at once (report, reroll, next job) must not run it twice.
const locks = new Set();
export function claim(key) {
  if (locks.has(key)) return false;
  locks.add(key);
  return true;
}
export const release = (key) => locks.delete(key);

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
