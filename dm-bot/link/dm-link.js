// DM Link: run this on your own PC while you play. It reads Star Citizen's Game.log (read-only,
// like Stelliverse and other companion tools), picks out story events (contracts, injuries,
// CrimeStat, locations, ships…), and posts them to your server's game-feed channel, where the DM
// bot records them on your character. Only those events are sent, never the raw log.
//
// Start it with link.bat (Windows) or: node link/dm-link.js
// Options: --replay (send events already in the current log), --dry-run (print, don't send)

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createParser, describe } from "./parse.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = process.env.DM_LINK_CONFIG || path.join(HERE, "link.json");
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const FLUSH_MS = 4000;

const COMMON_PATHS = ["C", "D", "E", "F", "G"].flatMap((d) => [
  `${d}:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log`,
  `${d}:\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log`,
  `${d}:\\RSI\\StarCitizen\\LIVE\\Game.log`,
  `${d}:\\Games\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log`,
  `${d}:\\StarCitizen\\LIVE\\Game.log`,
]);

function decodeCode(code) {
  try {
    const data = JSON.parse(Buffer.from(code.trim(), "base64url").toString("utf8"));
    if (/^https?:\/\//.test(data.u || "") && data.d) return data;
  } catch {
    // fall through
  }
  return null;
}

async function setup() {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    // first run
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!decodeCode(config.code || "")) {
    console.log("\nFirst-time setup. In Discord, type /link and copy the code it gives you.");
    for (;;) {
      const code = (await rl.question("Paste your link code and press Enter: ")).trim();
      if (decodeCode(code)) {
        config.code = code;
        break;
      }
      console.log("That code doesn't look right. Copy the whole thing from /link and try again.");
    }
  }
  if (!config.logPath || !fs.existsSync(config.logPath)) {
    const found = COMMON_PATHS.find((p) => fs.existsSync(p));
    if (found) {
      config.logPath = found;
      console.log(`Found your Game.log: ${found}`);
    } else {
      for (;;) {
        let p = (await rl.question("Where is Star Citizen installed? Paste the LIVE folder path (e.g. E:\\RSI\\StarCitizen\\LIVE): ")).trim().replace(/^"|"$/g, "");
        if (!p.toLowerCase().endsWith("game.log")) p = path.join(p, "Game.log");
        if (fs.existsSync(p)) {
          config.logPath = p;
          break;
        }
        console.log(`No Game.log at ${p}. Start the game once, or check the folder.`);
      }
    }
  }
  rl.close();
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
  return { ...config, ...decodeCode(config.code) };
}

// ── Sending ──────────────────────────────────────────────────────────────────
let queue = [];
let earned = 0;
let handle = null;

async function post(url, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${url}?wait=true`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch((err) => ({ ok: false, status: 0, err }));
    if (res.ok) return true;
    if (res.status === 429) {
      const wait = Number((await res.json().catch(() => ({}))).retry_after || 2);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (res.status === 404 || res.status === 401) {
      console.error("❌ Discord rejected the link (the game-feed webhook was deleted or changed). Get a new code with /link, then delete link.json and restart.");
      return false;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  console.error("⚠️ Couldn't reach Discord. Events from the last few seconds were skipped.");
  return false;
}

async function flush(cfg) {
  const events = queue.splice(0, 10);
  if (earned) {
    events.push({ type: "earned", amount: earned, at: new Date().toISOString() });
    earned = 0;
  }
  if (!events.length) return;
  const lines = events.map(describe);
  for (const l of lines) console.log(`  → ${l}`);
  if (DRY) return;
  await post(cfg.u, {
    username: `DM Link · ${handle || "pilot"}`.slice(0, 80),
    allowed_mentions: { parse: [] },
    embeds: [{
      description: lines.join("\n").slice(0, 4000),
      color: 0x4aa3df,
      footer: { text: `DMLINK:${JSON.stringify({ v: 1, d: cfg.d, h: handle, events })}`.slice(0, 2048) },
    }],
  });
}

function enqueue(e) {
  if (e.type === "earned") earned += e.amount;
  else queue.push(e);
}

// ── Following the log ────────────────────────────────────────────────────────
async function main() {
  console.log("🛰️  DM Link for Star Citizen. Reads Game.log, sends story events to Discord.");
  const cfg = await setup();
  console.log(`Watching ${cfg.logPath}${DRY ? " (dry run: nothing is sent)" : ""}. Leave this window open while you play.\n`);

  let parse = createParser();
  let pos = args.has("--replay") ? 0 : fs.statSync(cfg.logPath).size;
  let leftover = "";

  const read = () => {
    let size;
    try {
      size = fs.statSync(cfg.logPath).size;
    } catch {
      return; // the game is rotating the log; try again next tick
    }
    if (size < pos) {
      // The game started a new session and replaced Game.log.
      console.log("🔄 New game session detected.");
      pos = 0;
      leftover = "";
      parse = createParser();
    }
    if (size === pos) return;
    const fd = fs.openSync(cfg.logPath, "r");
    const buf = Buffer.alloc(Math.min(size - pos, 8 * 1024 * 1024));
    fs.readSync(fd, buf, 0, buf.length, pos);
    fs.closeSync(fd);
    pos += buf.length;
    const lines = (leftover + buf.toString("utf8")).split(/\r?\n/);
    leftover = lines.pop();
    for (const line of lines) {
      const e = parse(line);
      if (!e) continue;
      handle ??= line.match(/Player\[([^\]]+)\]|channel '.+? : ([^']+)'/)?.slice(1).find(Boolean) || null;
      enqueue(e);
    }
  };

  setInterval(read, 1000);
  for (;;) {
    await new Promise((r) => setTimeout(r, FLUSH_MS));
    while (queue.length || earned) await flush(cfg);
  }
}

main().catch((err) => {
  console.error("DM Link stopped:", err.message);
  process.exit(1);
});
