import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags, OAuth2Scopes, PermissionFlagsBits } from "discord.js";
import * as store from "./store.js";
import * as character from "./handlers/character.js";
import * as play from "./handlers/play.js";
import * as mission from "./handlers/mission.js";
import * as voice from "./voice.js";
import * as records from "./handlers/records.js";
import * as saga from "./handlers/saga.js";
import * as ask from "./handlers/ask.js";
import * as feed from "./handlers/feed.js";
import { aiLabel } from "./ai.js";
import { linkKin } from "./engine/story.js";
import { registerName } from "./engine/names.js";
import { activeSaga, refreshSaga } from "./engine/saga.js";

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env (see README).");
  process.exit(1);
}

const db = store.load();
store.tidy(db);
// Tie together existing characters whose surnames match (only ever done once per pair).
for (const g of Object.values(db.guilds)) {
  // A running saga picks up fixes to its leads (e.g. content that left the game).
  if (activeSaga(g)) {
    const n = refreshSaga(g, g.saga);
    if (n) console.log(`Updated ${n} upcoming lead(s) and secret(s) in the saga "${g.saga.title}".`);
  }
  for (const x of [...Object.values(g.npcs || {}), ...Object.values(g.characters || {})]) registerName(g, x.name);
  for (const c of Object.values(g.characters || {})) {
    for (const k of linkKin(g, c)) console.log(`Family tie: ${c.name} & ${k.with} (${k.relation})`);
  }
}
store.saveNow();
// The scribe channel needs to read message text, which is a "privileged intent" that must be switched
// on in the developer portal. If it isn't, the bot still starts, just without the scribe channel.
function makeClient(withMessages) {
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
  if (withMessages) intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
  const client = new Client({ intents });
  client.once(Events.ClientReady, onReady);
  client.on(Events.InteractionCreate, onInteraction);
  if (withMessages) client.on(Events.MessageCreate, onMessage);
  return client;
}

function onReady(c) {
  console.log(`Star Citizen DM online as ${c.user.tag}. Narration: ${aiLabel()}. Voice: ${voice.ttsLabel()}.`);
  const invite = c.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
      PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.AddReactions,
    ],
  });
  console.log(`Invite / fix permissions link (open it and pick your server):\n${invite}`);
}

async function route(interaction) {
  const g = store.guild(interaction.guildId);

  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "character") return character.roleAutocomplete(interaction, g);
    if (interaction.commandName === "crew-roles") return character.roleAutocomplete(interaction, g, { customOnly: true });
    return interaction.respond([]);
  }

  if (interaction.isChatInputCommand()) {
    const sub = interaction.options.getSubcommand(false);
    switch (interaction.commandName) {
      case "character":
        if (sub === "create") return character.create(interaction, g);
        if (sub === "sheet") return character.sheet(interaction, g);
        if (sub === "story") return character.sheet(interaction, g, { full: true });
        if (sub === "list") return character.list(interaction, g);
        if (sub === "backstory") return character.backstory(interaction, g);
        if (sub === "retell") return character.retell(interaction, g);
        if (sub === "role") return character.setRole(interaction, g);
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
      case "mission": return mission.start(interaction, g);
      case "mission-cancel": return mission.cancelLatest(interaction, g);
      case "crew-roles": return character.crewRoles(interaction, g, sub);
      case "roll": return play.rollCommand(interaction, g);
      case "voice": return play.voiceCommand(interaction, g, sub);
      case "dm-admin":
        if (sub === "persona") return mission.editPersona(interaction, g);
        if (sub === "scribe-channel") return records.setScribeChannel(interaction, g);
        if (sub === "game-feed") return feed.setFeedChannel(interaction, g);
        return play.admin(interaction, g, sub);
      case "dm-help": return play.help(interaction);
      case "rp-rules": return play.rpRules(interaction);
      case "ask": return ask.ask(interaction, g);
      case "saga": return saga.command(interaction, g, sub);
      case "link": return feed.linkCode(interaction, g);
      case "status": return records.status(interaction, g, sub);
      case "lore": return records.lore(interaction, g, sub);
      case "archive": return records.archive(interaction, g, sub);
    }
    return;
  }

  // Buttons, menus and modals carry their routing in customId: "<kind>:<args…>".
  const [kind, ...args] = (interaction.customId || "").split(":");
  if (kind === "cc") {
    const [action, value] = args;
    if (action === "origin") return character.onOrigin(interaction, g);
    if (action === "bg") return character.onBackground(interaction, g);
    if (action === "bgm") return character.onBackgroundWritten(interaction, g);
    if (action === "career") return character.onCareer(interaction, g);
    if (action === "pr") return character.onPronouns(interaction, g, value);
    if (action === "name") return character.onNamePicked(interaction, g, Number(value));
    if (action === "reroll") return character.onReroll(interaction, g);
    if (action === "custom") return character.onCustom(interaction, g);
    if (action === "modal") return character.onCustomName(interaction, g);
    if (action === "bs") return character.onBackstory(interaction, g);
    if (action === "write") return character.onWrite(interaction, g);
    if (action === "story") return character.onStoryWritten(interaction, g);
    if (action === "dm") return character.onDmWrites(interaction, g);
    if (action === "restory") return character.onRestory(interaction, g, value);
    if (action === "edit") return character.backstory(interaction, g);
  }
  if (kind === "cr") return character.onNewRole(interaction, g);
  if (kind === "ms") return mission.onButton(interaction, g, args[0], args[1]);
  if (kind === "msm") return mission.onReport(interaction, g, args[0], args[1]);
  if (kind === "mn") return mission.onNextJob(interaction, g, args[0]);
  if (kind === "mnm") return mission.onNextJobModal(interaction, g, args[0]);
  if (kind === "mk") return feed.onBuildPulled(interaction, g, args[0]);
  if (kind === "mkm") return feed.onBuildPulledModal(interaction, g, args[0]);
  if (kind === "st") return records.onClearSelect(interaction, g, args[0]);
  if (kind === "persona") return mission.savePersona(interaction, g);
  if (kind === "ch") return play.onChoice(interaction, g, args[0], args[1], Number(args[2]));
  if (kind === "chm") return play.onReport(interaction, g, args[0], args[1], Number(args[2]));
}

async function onMessage(message) {
  if (!message.guildId) return;
  const g = store.guild(message.guildId);
  // Game events from players' DM Link apps arrive through our own webhook.
  if (message.webhookId && message.webhookId === g.settings.feedWebhookId) {
    return feed.onFeedMessage(message, g).catch((err) => console.error("[feed]", err));
  }
  if (message.author.bot) return;
  if (message.channelId !== g.settings.scribeChannelId) return;
  try {
    await records.onScribeMessage(message, g);
  } catch (err) {
    console.error("[scribe]", err);
    message.react("⚠️").catch(() => {});
  }
}

async function onInteraction(interaction) {
  if (!interaction.guildId) {
    if (interaction.isRepliable()) await interaction.reply({ content: "Use me inside a server, not in DMs.", flags: MessageFlags.Ephemeral }).catch(() => {});
    return;
  }
  try {
    await route(interaction);
  } catch (err) {
    // Say which command or button failed, so the error in this window can be matched to what someone clicked.
    const what = interaction.commandName ? `/${interaction.commandName} ${interaction.options?.getSubcommand?.(false) || ""}`.trim() : interaction.customId;
    console.error(`[bot] ${what} failed:`, err);
    const reason = String(err?.rawError?.message || err?.message || err).split("\n")[0].slice(0, 180);
    const msg = { content: `⚠️ Something went wrong on the DM's side (${what}): ${reason}. Try again, and if it keeps happening, send this message to whoever runs the bot.`, flags: MessageFlags.Ephemeral };
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  }
}

// Save on every way the bot can stop, including closing the window on Windows (SIGHUP / SIGBREAK).
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => {
    store.saveNow();
    process.exit(0);
  });
}
// One bad promise anywhere (a dropped voice connection, a Discord hiccup) must never take the bot down.
process.on("unhandledRejection", (err) => console.error("[bot] unhandled error (the bot keeps running):", err?.message ?? err));
process.on("uncaughtException", (err) => {
  console.error("[bot] unexpected error (the bot keeps running):", err?.stack ?? err);
  try { store.saveNow(); } catch { /* keep going */ }
});

const first = makeClient(true);
try {
  await first.login(process.env.DISCORD_TOKEN);
} catch (err) {
  if (!/disallowed intents/i.test(err.message)) throw err;
  first.destroy();
  console.warn(
    "⚠️ The scribe channel is off: turn on 'Message Content Intent' in the Discord developer portal → Bot, then restart.\n" +
      "   Everything else works normally.",
  );
  await makeClient(false).login(process.env.DISCORD_TOKEN);
}
