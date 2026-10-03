import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import { CAMPAIGN_GOALS, LOCATIONS, MISSION_TYPES, CREW_ROLES } from "./lore/data.js";
import { EDGE_VOICES } from "./voice.js";

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
    .addSubcommand((s) => s.setName("role").setDescription("Your preferred crew role on missions (or auto: fit your story and rotate)")
      .addStringOption((o) => o.setName("role").setDescription("Role").setRequired(true)
        .addChoices({ name: "🎲 Auto (fit my story, rotate)", value: "auto" }, ...Object.entries(CREW_ROLES).map(([k, r]) => ({ name: `${r.emoji} ${r.label}`, value: k })))))
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
    .setName("mission")
    .setDescription("Get a one-shot mission from the DM to play in game and in voice")
    .addStringOption((o) => o.setName("type").setDescription("Kind of job (default: surprise me)")
      .addChoices(...Object.entries(MISSION_TYPES).map(([k, v]) => ({ name: `${v.emoji} ${v.label}`, value: k }))))
    .addUserOption((o) => o.setName("with1").setDescription("Crew member"))
    .addUserOption((o) => o.setName("with2").setDescription("Crew member"))
    .addUserOption((o) => o.setName("with3").setDescription("Crew member")),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll dice for the story, e.g. 1d20 or 2d6+1")
    .addStringOption((o) => o.setName("dice").setDescription("Dice to roll (default 1d20)").setMaxLength(20))
    .addStringOption((o) => o.setName("for").setDescription("What's riding on it, e.g. finding a way past the guards").setMaxLength(200)),

  new SlashCommandBuilder()
    .setName("mission-cancel")
    .setDescription("Scrap your current mission, as if it never happened"),

  new SlashCommandBuilder()
    .setName("voice")
    .setDescription("The DM's spoken voice in your voice channel")
    .addSubcommand((s) => s.setName("join").setDescription("DM joins your voice channel"))
    .addSubcommand((s) => s.setName("leave").setDescription("DM leaves voice"))
    .addSubcommand((s) => s.setName("replay").setDescription("Say the last thing again"))
    .addSubcommand((s) => s.setName("test").setDescription("Hear the DM's voice")),

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
    .addSubcommand((s) => s.setName("persona").setDescription("Change the DM's name and personality"))
    .addSubcommand((s) => s.setName("scribe-channel").setDescription("Channel where a scribe types quick updates during play")
      .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName("voice").setDescription("Turn the DM's spoken voice on or off")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true)))
    .addSubcommand((s) => s.setName("voice-name").setDescription("Choose the DM's voice (free voices)")
      .addStringOption((o) => o.setName("voice").setDescription("Voice").setRequired(true)
        .addChoices(...Object.entries(EDGE_VOICES).map(([value, name]) => ({ name, value })))))
    .addSubcommand((s) => s.setName("dms").setDescription("DM story transmissions to players?")
      .addBooleanOption((o) => o.setName("enabled").setDescription("On or off").setRequired(true))),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Injuries, ship damage and other conditions your character carries")
    .addSubcommand((s) => s.setName("view").setDescription("See a character's conditions")
      .addUserOption((o) => o.setName("player").setDescription("Whose (default: yours)")))
    .addSubcommand((s) => s.setName("add").setDescription("Add a condition")
      .addStringOption((o) => o.setName("condition").setDescription("e.g. Hull breached, must land at the nearest planet").setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName("type").setDescription("Kind").setRequired(true)
        .addChoices({ name: "🩸 Injury", value: "injury" }, { name: "🚀 Ship", value: "ship" }, { name: "⚖️ Legal", value: "legal" }, { name: "📌 Other", value: "other" }))
      .addStringOption((o) => o.setName("severity").setDescription("How bad")
        .addChoices({ name: "Minor", value: "minor" }, { name: "Major", value: "major" }, { name: "Critical", value: "critical" }))
      .addStringOption((o) => o.setName("clears").setDescription("How it gets fixed in game, e.g. repair at a station").setMaxLength(150))
      .addUserOption((o) => o.setName("player").setDescription("Whose (default: yours)")))
    .addSubcommand((s) => s.setName("clear").setDescription("Mark conditions as fixed")
      .addUserOption((o) => o.setName("player").setDescription("Whose (default: yours)"))),

  new SlashCommandBuilder()
    .setName("lore")
    .setDescription("Server canon: lore your group has created")
    .addSubcommand((s) => s.setName("add").setDescription("Make something canon")
      .addStringOption((o) => o.setName("fact").setDescription("e.g. Ysolde Pike keeps a safehouse under Patch City").setRequired(true).setMaxLength(500)))
    .addSubcommand((s) => s.setName("list").setDescription("Show server canon")),

  new SlashCommandBuilder()
    .setName("archive")
    .setDescription("Finished stories")
    .addSubcommand((s) => s.setName("list").setDescription("List archived stories"))
    .addSubcommand((s) => s.setName("read").setDescription("Read an archived story")
      .addStringOption((o) => o.setName("title").setDescription("Part of the title").setRequired(true)))
    .addSubcommand((s) => s.setName("export").setDescription("Download the whole archive as a file")),

  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the DM anything, e.g. what contract do we take for this?")
    .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true).setMaxLength(500)),

  new SlashCommandBuilder().setName("rp-rules").setDescription("How the game's bugs and limits become part of the story"),

  new SlashCommandBuilder().setName("dm-help").setDescription("How to use the Star Citizen DM"),
].map((c) => c.toJSON());
