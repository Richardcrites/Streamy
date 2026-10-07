// Registers the slash commands with Discord (start.bat runs this every launch; it only uploads when
// the commands changed):
//   npm run deploy
// With GUILD_ID set, commands appear on that server instantly. Without it they're global
// (every server the bot is in), which can take up to an hour to show up.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env (see README).");
  process.exit(1);
}

// Skip the upload when nothing changed since the last one (faster start, and Discord limits how often
// commands can be re-registered). `npm run deploy -- --force` always uploads.
const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
const hash = crypto.createHash("sha256").update(JSON.stringify({ route, commands })).digest("hex");
const STAMP = path.resolve("data", ".commands-registered");
let last = null;
try {
  // Re-upload at least daily anyway, in case the bot was removed and re-invited (which can drop commands).
  if (Date.now() - fs.statSync(STAMP).mtimeMs < 24 * 60 * 60 * 1000) last = fs.readFileSync(STAMP, "utf8").trim();
} catch {
  // first run
}
if (last === hash && !process.argv.includes("--force")) {
  console.log(`Slash commands are up to date (${commands.length}).`);
} else {
  const rest = new REST().setToken(DISCORD_TOKEN);
  await rest.put(route, { body: commands });
  fs.mkdirSync(path.dirname(STAMP), { recursive: true });
  fs.writeFileSync(STAMP, hash);
  console.log(`Registered ${commands.length} commands ${GUILD_ID ? `on server ${GUILD_ID}` : "globally"}.`);
}
