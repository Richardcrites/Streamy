import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import { CAMPAIGN_GOALS, LOCATIONS } from "./lore/data.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("character")
    .setDescription("Create and manage your Star Citizen character")
    .addSubcommand((s) => s.setName("create").setDescription("Create a new character: origin, name, story")
      .addStringOption((o) => o.setName("seed").setDescription("Optional: describe your character idea in your own words").setMaxLength(400)))
    .addSubcommand((s) => s.setName("sheet").setDescription("Show a character dossier")
      .addUserOption((o) => o.setName("player").setDescription("Whose character (default: yours)")))
    .addSubcommand((s) => s.setName("story").setDescription("Read the full origin story")
      .addUserOption((o) => o.setName("player").setDescription("Whose character (default: yours)")))
    .addSubcommand((s) => s.setName("backstory").setDescription("Write or edit your active character's backstory in your own words"))
    .addSubcommand((s) => s.setName("delete").setDescription("Delete one of your characters")
      .addStringOption((o) => o.setName("name").setDescription("Character name").setRequired(true)))
    .addSubcommand((s) => s.setName("list").setDescription("List your characters"))
    .addSubcommand((s) => s.setName("switch").setDescription("Switch your active character")
      .addStringOption((o) => o.setName("name").setDescription("Character name").setRequired(true)))
    .addSubcommand((s) => s.setName("location").setDescription("Update where your character is in the 'Verse")
      .addStringOption((o) => o.setName("system").setDescription("Star system").setRequired(true)
        .addChoices(...Object.keys(LOCATIONS).map((s) => ({ name: s, value: s }))))
      .addStringOption((o) => o.setName("place").setDescription("Where exactly (e.g. Levski, GrimHEX, a Daymar outpost)").setMaxLength(100))),

  new SlashCommandBuilder()
    .setName("log")
    .setDescription("Log something your character did in game (feeds the story)")
    .addStringOption((o) => o.setName("entry").setDescription("e.g. Delivered 32 SCU of medical supplies to Levski").setRequired(true).setMaxLength(500)),

  new SlashCommandBuilder()
    .setName("journal")
    .setDescription("Read a character's recent journal")
    .addUserOption((o) => o.setName("player").setDescription("Whose character (default: yours)")),

  new SlashCommandBuilder()
    .setName("campaign")
    .setDescription("Campaigns: multi-act stories with an end goal")
    .addSubcommand((s) => s.setName("start").setDescription("Start a new campaign")
      .addStringOption((o) => o.setName("goal").setDescription("What kind of story").setRequired(true)
        .addChoices(...Object.entries(CAMPAIGN_GOALS).map(([k, v]) => ({ name: v.label, value: k }))))
      .addStringOption((o) => o.setName("scope").setDescription("Just you, or your whole org")
        .addChoices({ name: "Solo", value: "solo" }, { name: "Org / crew", value: "org" })))
    .addSubcommand((s) => s.setName("status").setDescription("Show your current campaign"))
    .addSubcommand((s) => s.setName("join").setDescription("Join your org's active campaign"))
    .addSubcommand((s) => s.setName("abandon").setDescription("Abandon your current campaign (campaign owner only)")),

  new SlashCommandBuilder()
    .setName("story")
    .setDescription("Story chapters and crossovers")
    .addSubcommand((s) => s.setName("next").setDescription("Get your current chapter, or the next one"))
    .addSubcommand((s) => s.setName("crossover").setDescription("Link your character's story with another player's")
      .addUserOption((o) => o.setName("player").setDescription("The other player").setRequired(true))),

  new SlashCommandBuilder()
    .setName("org")
    .setDescription("Orgs: groups of players that share campaigns and comms")
    .addSubcommand((s) => s.setName("create").setDescription("Found a new org")
      .addStringOption((o) => o.setName("name").setDescription("Org name").setRequired(true).setMaxLength(50))
      .addStringOption((o) => o.setName("tag").setDescription("Short tag, e.g. RJCO").setRequired(true).setMaxLength(8)))
    .addSubcommand((s) => s.setName("join").setDescription("Join an org")
      .addStringOption((o) => o.setName("org").setDescription("Org name or tag").setRequired(true)))
    .addSubcommand((s) => s.setName("leave").setDescription("Leave your org"))
    .addSubcommand((s) => s.setName("info").setDescription("Show an org")
      .addStringOption((o) => o.setName("org").setDescription("Org name or tag (default: yours)")))
    .addSubcommand((s) => s.setName("list").setDescription("List all orgs on this server"))
    .addSubcommand((s) => s.setName("relation").setDescription("Set your org's stance toward another org (leader only)")
      .addStringOption((o) => o.setName("org").setDescription("The other org's name or tag").setRequired(true))
      .addStringOption((o) => o.setName("stance").setDescription("Stance").setRequired(true)
        .addChoices({ name: "Allied", value: "ally" }, { name: "Rival", value: "rival" }, { name: "Neutral", value: "neutral" }))),

  new SlashCommandBuilder()
    .setName("comms")
    .setDescription("In-character comms")
    .addSubcommand((s) => s.setName("send").setDescription("Send an in-character transmission to another player")
      .addUserOption((o) => o.setName("to").setDescription("Recipient").setRequired(true))
      .addStringOption((o) => o.setName("message").setDescription("What your character says").setRequired(true).setMaxLength(1500)))
    .addSubcommand((s) => s.setName("broadcast").setDescription("Transmit to your whole org")
      .addStringOption((o) => o.setName("message").setDescription("What your character says").setRequired(true).setMaxLength(1500)))
    .addSubcommand((s) => s.setName("news").setDescription("Galactic news bulletin, including what players have done")),

  new SlashCommandBuilder()
    .setName("dm-admin")
    .setDescription("Server settings for the DM bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("comms-channel").setDescription("Channel where story transmissions are posted")
      .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName("dms").setDescription("DM story transmissions to players?")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true))),

  new SlashCommandBuilder().setName("dm-help").setDescription("How to use the Star Citizen DM"),
].map((c) => c.toJSON());
