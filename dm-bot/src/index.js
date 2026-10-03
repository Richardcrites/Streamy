import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import * as store from "./store.js";
import * as character from "./handlers/character.js";
import * as play from "./handlers/play.js";
import { aiEnabled } from "./ai.js";

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env (see README).");
  process.exit(1);
}

store.load();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Star Citizen DM online as ${c.user.tag}. Narration: ${aiEnabled() ? "Claude AI + lore engine" : "built-in lore engine"}.`);
});

async function route(interaction) {
  const g = store.guild(interaction.guildId);

  if (interaction.isChatInputCommand()) {
    const sub = interaction.options.getSubcommand(false);
    switch (interaction.commandName) {
      case "character":
        if (sub === "create") return character.create(interaction, g);
        if (sub === "sheet") return character.sheet(interaction, g);
        if (sub === "story") return character.sheet(interaction, g, { full: true });
        if (sub === "list") return character.list(interaction, g);
        if (sub === "backstory") return character.backstory(interaction, g);
        if (sub === "delete") return character.remove(interaction, g);
        if (sub === "switch") return character.switchChar(interaction, g);
        if (sub === "location") return character.location(interaction, g);
        break;
      case "log": return character.log(interaction, g);
      case "journal": return character.journal(interaction, g);
      case "campaign":
        if (sub === "start") return play.campaignStart(interaction, g);
        if (sub === "status") return play.campaignStatus(interaction, g);
        if (sub === "join") return play.campaignJoin(interaction, g);
        if (sub === "abandon") return play.campaignAbandon(interaction, g);
        break;
      case "story":
        if (sub === "next") return play.storyNext(interaction, g);
        if (sub === "crossover") return play.crossover(interaction, g);
        break;
      case "org": return play.org(interaction, g, sub);
      case "comms": return play.comms(interaction, g, sub);
      case "dm-admin": return play.admin(interaction, g, sub);
      case "dm-help": return play.help(interaction);
    }
    return;
  }

  // Buttons, menus and modals carry their routing in customId: "<kind>:<args…>".
  const [kind, ...args] = (interaction.customId || "").split(":");
  if (kind === "cc") {
    const [action, value] = args;
    if (action === "origin") return character.onOrigin(interaction, g);
    if (action === "career") return character.onCareer(interaction, g);
    if (action === "pr") return character.onPronouns(interaction, g, value);
    if (action === "name") return character.onNamePicked(interaction, g, Number(value));
    if (action === "reroll") return character.onReroll(interaction, g);
    if (action === "custom") return character.onCustom(interaction, g);
    if (action === "modal") return character.onCustomName(interaction, g);
    if (action === "bs") return character.onBackstory(interaction, g);
  }
  if (kind === "ch") return play.onChoice(interaction, g, args[0], args[1], Number(args[2]));
  if (kind === "chm") return play.onReport(interaction, g, args[0], args[1], Number(args[2]));
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guildId) {
    if (interaction.isRepliable()) await interaction.reply({ content: "Use me inside a server, not in DMs.", flags: MessageFlags.Ephemeral }).catch(() => {});
    return;
  }
  try {
    await route(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: "⚠️ Something went wrong on the DM's side. Try again.", flags: MessageFlags.Ephemeral };
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  }
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    store.saveNow();
    process.exit(0);
  });
}

client.login(process.env.DISCORD_TOKEN);
