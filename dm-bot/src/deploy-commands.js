// Registers the slash commands with Discord. Run once after setup, and again after commands change:
//   npm run deploy
// With GUILD_ID set, commands appear on that server instantly. Without it they're global
// (every server the bot is in), which can take up to an hour to show up.
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env (see README).");
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);
const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
await rest.put(route, { body: commands });
console.log(`Registered ${commands.length} commands ${GUILD_ID ? `on server ${GUILD_ID}` : "globally"}.`);
