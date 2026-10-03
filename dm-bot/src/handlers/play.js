import { EmbedBuilder, MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CAMPAIGN_GOALS, NEWS, CURRENT_PATCH, CURRENT_YEAR, GAME_RULES } from "../lore/data.js";
import { buildCampaign, buildChapter, buildFinale, buildCrossover, rollDice } from "../engine/story.js";
import { pickN } from "../engine/util.js";
import { narrateChapter, narrateFinale, aiEnabled, aiLabel } from "../ai.js";
import * as store from "../store.js";
import { chapterMessage, transmissionEmbed, broadcast, COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";
import { canonText, archiveCampaign } from "../engine/records.js";
import { parseAndApply } from "./records.js";

const ephemeral = MessageFlags.Ephemeral;
const RENOWN = { honor: "Trust", pragmatic: "Connections", ruthless: "Fear" };

const requireChar = async (interaction, g) => {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) await interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  return char;
};

const campaignChars = (g, campaign) => campaign.characterIds.map((id) => g.characters[id]).filter(Boolean);
const currentChapter = (campaign) => campaign.chapters.find((c) => c.status === "active") || null;

// ── Chapters ─────────────────────────────────────────────────────────────────
async function startChapter(interaction, g, campaign) {
  const chars = campaignChars(g, campaign);
  const chapter = buildChapter(g, campaign, chars);
  const ai = await narrateChapter({ campaign, chapter, characters: chars, worldLog: g.worldLog, canon: canonText(g) });
  if (ai) {
    chapter.title = `Act ${campaign.actIndex + 1}: ${ai.title}`;
    chapter.transmission.text = ai.transmission;
    chapter.briefing = ai.briefing;
    chapter.rpPrompt = ai.rp_prompt;
    ai.objective_flavour?.forEach((f, i) => { if (chapter.objectives[i]) chapter.objectives[i].flavour = f; });
    ai.choices?.slice(0, 3).forEach((c, i) => {
      chapter.choices[i].label = clip(c.label, 80);
      chapter.choices[i].outcome = c.outcome;
    });
  }
  campaign.chapters.push(chapter);
  store.save();
  return chapter;
}

async function postChapter(interaction, g, campaign, chapter) {
  const chars = campaignChars(g, campaign);
  voice.narrate(interaction, g, `${chapter.title}. Incoming transmission from ${chapter.transmission.from}. ${chapter.transmission.text}`);
  await broadcast(interaction, g, {
    content: chars.map((c) => `<@${c.ownerId}>`).join(" "),
    ...chapterMessage(campaign, chapter),
    userIds: chars.map((c) => c.ownerId),
  });
}

// ── /campaign ────────────────────────────────────────────────────────────────
export async function campaignStart(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  if (store.activeCampaignFor(g, char.id)) return interaction.reply({ content: "You're already in a campaign. See `/campaign status`.", flags: ephemeral });

  const goalId = interaction.options.getString("goal");
  const scope = interaction.options.getString("scope") || "solo";
  let characters = [char];
  let org = null;
  if (scope === "org") {
    org = store.orgOf(g, interaction.user.id);
    if (!org) return interaction.reply({ content: "You're not in an org. Use `/org create` or `/org join`, or start a solo campaign.", flags: ephemeral });
    const others = org.members
      .filter((id) => id !== interaction.user.id)
      .map((id) => store.activeCharacter(g, id))
      .filter((c) => c && !store.activeCampaignFor(g, c.id));
    characters = [char, ...others];
  }

  await interaction.deferReply();
  const campaign = buildCampaign(g, { goalId, characters, ownerId: interaction.user.id, scope, orgId: org?.id });
  g.campaigns[campaign.id] = campaign;
  for (const c of characters) store.addJournal(c, { kind: "campaign", text: `Joined the campaign "${campaign.title}". Goal: ${campaign.endGoal}` });
  store.logWorld(g, `${org ? `[${org.tag}] ` : ""}${characters.map((c) => c.name).join(", ")} began "${campaign.title}".`);
  const chapter = await startChapter(interaction, g, campaign);

  const goal = CAMPAIGN_GOALS[goalId];
  const intro = new EmbedBuilder()
    .setColor(COLORS.chapter)
    .setAuthor({ name: `${goal.emoji} NEW CAMPAIGN · ${scope === "org" ? `Org: ${org.name}` : "Solo"}` })
    .setTitle(campaign.title)
    .setDescription(`**End goal:** ${campaign.endGoal}`)
    .addFields(
      { name: "Crew", value: characters.map((c) => `${c.name} (<@${c.ownerId}>)`).join("\n") },
      { name: "Acts", value: campaign.acts.map((a, i) => `${i + 1}. ${a.title}`).join("\n") + `\n${campaign.acts.length + 1}. Finale`, inline: true },
      { name: "System", value: campaign.vars.system, inline: true },
    );
  await interaction.editReply({ embeds: [intro] });
  await postChapter(interaction, g, campaign, chapter);
}

export async function campaignStatus(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  const campaign = store.activeCampaignFor(g, char.id);
  if (!campaign) return interaction.reply({ content: "No active campaign. Start one with `/campaign start`.", flags: ephemeral });
  const acts = campaign.acts.map((a, i) => {
    const ch = campaign.chapters.find((c) => c.act === i);
    const mark = i < campaign.actIndex ? "✅" : i === campaign.actIndex ? "▶️" : "▫️";
    return `${mark} **${a.title}**${ch?.result ? `: ${ch.result.label}` : ""}`;
  });
  const embed = new EmbedBuilder()
    .setColor(COLORS.chapter)
    .setTitle(campaign.title)
    .setDescription(`**End goal:** ${campaign.endGoal}\n\n${acts.join("\n")}\n▫️ Finale`)
    .addFields({ name: "Crew", value: campaignChars(g, campaign).map((c) => c.name).join(", ") })
    .setFooter({ text: "Use /story next to see the current chapter." });
  await interaction.reply({ embeds: [embed] });
}

export async function campaignJoin(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  if (store.activeCampaignFor(g, char.id)) return interaction.reply({ content: "You're already in a campaign.", flags: ephemeral });
  const org = store.orgOf(g, interaction.user.id);
  const campaign = org && Object.values(g.campaigns).find((c) => c.status === "active" && c.orgId === org.id);
  if (!campaign) return interaction.reply({ content: "Your org has no active campaign.", flags: ephemeral });
  campaign.characterIds.push(char.id);
  store.addJournal(char, { kind: "campaign", text: `Joined the campaign "${campaign.title}".` });
  store.save();
  await interaction.reply({ content: `**${char.name}** joins **${campaign.title}**. You'll get your own objectives from the next chapter on.` });
}

export async function campaignAbandon(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  const campaign = store.activeCampaignFor(g, char.id);
  if (!campaign) return interaction.reply({ content: "No active campaign.", flags: ephemeral });
  if (campaign.ownerId !== interaction.user.id) return interaction.reply({ content: "Only the player who started the campaign can abandon it.", flags: ephemeral });
  campaign.status = "abandoned";
  store.logWorld(g, `"${campaign.title}" was abandoned unfinished.`);
  store.save();
  await interaction.reply({ content: `**${campaign.title}** has been abandoned. Its threads stay open for future stories.` });
}

// ── /story next ──────────────────────────────────────────────────────────────
export async function storyNext(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  const campaign = store.activeCampaignFor(g, char.id);
  if (!campaign) return interaction.reply({ content: "No active campaign. Start one with `/campaign start`.", flags: ephemeral });
  await interaction.deferReply({ flags: ephemeral });
  let chapter = currentChapter(campaign);
  if (!chapter) chapter = await startChapter(interaction, g, campaign);
  await interaction.editReply({ content: `📡 ${chapter.title} has been transmitted.` });
  await postChapter(interaction, g, campaign, chapter);
}

// ── Choice buttons → report modal → resolve ─────────────────────────────────
export async function onChoice(interaction, g, campaignId, chapterId, idx) {
  const campaign = g.campaigns[campaignId];
  const chapter = campaign?.chapters.find((c) => c.id === chapterId);
  if (!campaign || !chapter || chapter.status !== "active") return interaction.reply({ content: "That chapter is already resolved.", flags: ephemeral });
  const mine = campaignChars(g, campaign).some((c) => c.ownerId === interaction.user.id);
  if (!mine) return interaction.reply({ content: "Only the crew in this campaign can make this call.", flags: ephemeral });
  const choice = chapter.choices[idx];
  const modal = new ModalBuilder()
    .setCustomId(`chm:${campaignId}:${chapterId}:${idx}`)
    .setTitle(clip(`Report: ${choice.label}`, 45))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("notes").setLabel("What happened in game? (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(800),
    ));
  await interaction.showModal(modal);
}

export async function onReport(interaction, g, campaignId, chapterId, idx) {
  const campaign = g.campaigns[campaignId];
  const chapter = campaign?.chapters.find((c) => c.id === chapterId);
  if (!campaign || !chapter || chapter.status !== "active") return interaction.reply({ content: "That chapter is already resolved.", flags: ephemeral });
  await interaction.deferUpdate();

  const choice = chapter.choices[idx];
  const notes = interaction.fields.getTextInputValue("notes")?.trim() || null;
  const decider = store.activeCharacter(g, interaction.user.id);
  chapter.status = "done";
  chapter.result = { tone: choice.tone, label: choice.label, outcome: choice.outcome, by: interaction.user.id, notes };
  campaign.tones.push(choice.tone);
  if (notes) await parseAndApply(g, notes, interaction.user.username, { mission: null });

  const chars = campaignChars(g, campaign);
  for (const c of chars) {
    c.renown[RENOWN[choice.tone]] = (c.renown[RENOWN[choice.tone]] || 0) + 1;
    store.addJournal(c, { kind: "chapter", text: `${chapter.title}: ${choice.label}. ${choice.outcome}${notes ? ` (${notes})` : ""}` });
  }
  campaign.actIndex++;
  store.save();

  await interaction.editReply({ components: [] }).catch(() => {});
  const outcome = transmissionEmbed({
    from: "DM",
    title: `${chapter.title}: ${choice.label}`,
    text: `${choice.outcome}${notes ? `\n\n**From the field (${decider?.name ?? "crew"}):** ${notes}` : ""}`,
    color: COLORS.outcome,
    footer: campaign.actIndex < campaign.acts.length ? "Use /story next when your crew is ready for the next act." : "The finale is coming…",
  });
  await broadcast(interaction, g, { embeds: [outcome], userIds: [] });

  if (campaign.actIndex >= campaign.acts.length) await runFinale(interaction, g, campaign);
}

async function runFinale(interaction, g, campaign) {
  const chars = campaignChars(g, campaign);
  const finale = buildFinale(g, campaign);
  const ai = await narrateFinale({ campaign, finale, characters: chars });
  if (ai) {
    finale.text = ai.finale;
    finale.epilogue = ai.epilogue;
  }
  campaign.status = "complete";
  campaign.finale = finale;
  const hookOwner = g.characters[campaign.hookOwnerId];
  const hook = hookOwner?.hooks.find((h) => h.id === campaign.hookId);
  if (hook) hook.status = "resolved";
  for (const c of chars) {
    if (!c.titles.includes(finale.awardTitle)) c.titles.push(finale.awardTitle);
    store.addJournal(c, { kind: "finale", text: `Completed "${campaign.title}" with ${finale.label}. Earned the title "${finale.awardTitle}".` });
  }
  store.logWorld(g, `${chars.map((c) => c.name).join(", ")} completed "${campaign.title}" with ${finale.label.toLowerCase()}.`);
  archiveCampaign(g, campaign, chars);
  store.save();

  const embed = new EmbedBuilder()
    .setColor(COLORS.finale)
    .setAuthor({ name: "🏁 FINALE" })
    .setTitle(finale.title)
    .setDescription(clip(`*${finale.setup}*\n\n${finale.text}`, 4000))
    .addFields(
      { name: "Epilogue", value: clip(finale.epilogue, 1024) },
      { name: "Title earned", value: `**${finale.awardTitle}**: ${chars.map((c) => c.name).join(", ")}` },
    )
    .setFooter({ text: "This story is now in the world log. Start your next one with /campaign start." });
  voice.narrate(interaction, g, `${finale.title}. ${finale.setup} ${finale.text}`);
  await broadcast(interaction, g, { content: chars.map((c) => `<@${c.ownerId}>`).join(" "), embeds: [embed], userIds: chars.map((c) => c.ownerId) });
}

// ── /story crossover ─────────────────────────────────────────────────────────
export async function crossover(interaction, g) {
  const char = await requireChar(interaction, g);
  if (!char) return;
  const other = interaction.options.getUser("player");
  const otherChar = store.activeCharacter(g, other.id);
  if (other.id === interaction.user.id) return interaction.reply({ content: "Pick another player.", flags: ephemeral });
  if (!otherChar) return interaction.reply({ content: `${other.username} doesn't have a character yet.`, flags: ephemeral });

  await interaction.deferReply();
  const x = buildCrossover(g, char, otherChar);
  char.relationships.push({ charId: otherChar.id, name: otherChar.name, note: `crossed paths via ${x.from}` });
  otherChar.relationships.push({ charId: char.id, name: char.name, note: `crossed paths via ${x.from}` });
  for (const c of [char, otherChar]) store.addJournal(c, { kind: "crossover", text: x.title });
  store.logWorld(g, `${char.name} and ${otherChar.name} crossed paths.`);
  store.save();

  const embed = transmissionEmbed({ from: x.from, title: x.title, text: x.text })
    .addFields(
      ...x.objectives.map((o) => ({ name: `🎮 ${o.characterName}`, value: clip(o.text, 1024) })),
      { name: "🎭 Roleplay prompt", value: x.rpPrompt },
    );
  await interaction.editReply({ content: `<@${interaction.user.id}> 🤝 <@${other.id}>`, embeds: [embed] });
  if (g.settings.dmPlayers) {
    for (const u of [interaction.user, other]) u.send({ embeds: [embed] }).catch(() => {});
  }
}

// ── /org ─────────────────────────────────────────────────────────────────────
export async function org(interaction, g, sub) {
  const uid = interaction.user.id;
  const mine = store.orgOf(g, uid);

  if (sub === "create") {
    if (mine) return interaction.reply({ content: `You're already in **${mine.name}**. Leave it first.`, flags: ephemeral });
    const name = interaction.options.getString("name").trim();
    const tag = interaction.options.getString("tag").trim().toUpperCase();
    if (store.findOrg(g, name) || store.findOrg(g, tag)) return interaction.reply({ content: "An org with that name or tag already exists.", flags: ephemeral });
    const o = { id: store.newId(), name, tag, leaderId: uid, members: [uid], relations: {}, createdAt: new Date().toISOString() };
    g.orgs[o.id] = o;
    store.logWorld(g, `A new org was founded: ${name} [${tag}].`);
    store.save();
    return interaction.reply({ content: `🏴 **${name} [${tag}]** is founded. Others can join with \`/org join ${tag}\`.` });
  }
  if (sub === "join") {
    if (mine) return interaction.reply({ content: `You're already in **${mine.name}**.`, flags: ephemeral });
    const o = store.findOrg(g, interaction.options.getString("org"));
    if (!o) return interaction.reply({ content: "No org by that name or tag. See `/org list`.", flags: ephemeral });
    o.members.push(uid);
    store.save();
    return interaction.reply({ content: `<@${uid}> joined **${o.name} [${o.tag}]**.` });
  }
  if (sub === "leave") {
    if (!mine) return interaction.reply({ content: "You're not in an org.", flags: ephemeral });
    mine.members = mine.members.filter((m) => m !== uid);
    if (!mine.members.length) delete g.orgs[mine.id];
    else if (mine.leaderId === uid) mine.leaderId = mine.members[0];
    store.save();
    return interaction.reply({ content: `You left **${mine.name}**.`, flags: ephemeral });
  }
  if (sub === "list") {
    const orgs = Object.values(g.orgs);
    if (!orgs.length) return interaction.reply({ content: "No orgs yet. Found one with `/org create`.", flags: ephemeral });
    return interaction.reply({ content: orgs.map((o) => `🏴 **${o.name} [${o.tag}]**: ${o.members.length} member(s)`).join("\n") });
  }
  if (sub === "info") {
    const q = interaction.options.getString("org");
    const o = q ? store.findOrg(g, q) : mine;
    if (!o) return interaction.reply({ content: "Org not found.", flags: ephemeral });
    const members = o.members.map((m) => {
      const c = store.activeCharacter(g, m);
      return `${m === o.leaderId ? "👑" : "•"} <@${m}>${c ? `, as ${c.name}` : ""}`;
    });
    const relations = Object.entries(o.relations).map(([id, s]) => `${{ ally: "🤝", rival: "⚔️", neutral: "➖" }[s]} ${g.orgs[id]?.name ?? "a disbanded org"}`);
    const camp = Object.values(g.campaigns).find((c) => c.status === "active" && c.orgId === o.id);
    const embed = new EmbedBuilder().setColor(COLORS.dossier).setTitle(`${o.name} [${o.tag}]`)
      .addFields({ name: "Members", value: members.join("\n") || "—" });
    if (relations.length) embed.addFields({ name: "Relations", value: relations.join("\n") });
    if (camp) embed.addFields({ name: "Active campaign", value: camp.title });
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === "relation") {
    if (!mine || mine.leaderId !== uid) return interaction.reply({ content: "Only an org leader can set relations.", flags: ephemeral });
    const other = store.findOrg(g, interaction.options.getString("org"));
    if (!other || other.id === mine.id) return interaction.reply({ content: "Org not found.", flags: ephemeral });
    const stance = interaction.options.getString("stance");
    mine.relations[other.id] = stance;
    const words = { ally: "declared an alliance with", rival: "declared a rivalry with", neutral: "is now neutral toward" }[stance];
    store.logWorld(g, `${mine.name} [${mine.tag}] ${words} ${other.name} [${other.tag}].`);
    store.save();
    return interaction.reply({ content: `📜 **${mine.name}** ${words} **${other.name}**. It's in the world log now.` });
  }
}

// ── /comms ───────────────────────────────────────────────────────────────────
export async function comms(interaction, g, sub) {
  if (sub === "news") {
    const local = g.worldLog.slice(-4).reverse().map((w) => `• ${w.text}`);
    const embed = new EmbedBuilder()
      .setColor(COLORS.news)
      .setAuthor({ name: `📰 GALACTIC NEWS NETWORK · ${new Date().toISOString().slice(5, 10)}-${CURRENT_YEAR}` })
      .setDescription(pickN(NEWS, 3).map((n) => `• ${n}`).join("\n\n"));
    if (local.length) embed.addFields({ name: "Local spectrum chatter (your server)", value: clip(local.join("\n"), 1024) });
    return interaction.reply({ embeds: [embed] });
  }

  const char = await requireChar(interaction, g);
  if (!char) return;
  const message = interaction.options.getString("message");

  if (sub === "send") {
    const to = interaction.options.getUser("to");
    const toChar = store.activeCharacter(g, to.id);
    const embed = transmissionEmbed({ from: char.name, title: toChar ? `To: ${toChar.name}` : undefined, text: message, footer: `Sent from ${char.location || "somewhere in the 'Verse"}` });
    store.addJournal(char, { kind: "comms", text: `Sent comms to ${toChar?.name ?? to.username}: ${clip(message, 120)}` });
    if (toChar) store.addJournal(toChar, { kind: "comms", text: `Received comms from ${char.name}: ${clip(message, 120)}` });
    store.save();
    let delivered = true;
    await to.send({ content: `📡 Comms from **${char.name}** (<@${interaction.user.id}>) on **${interaction.guild.name}**`, embeds: [embed] }).catch(() => { delivered = false; });
    return interaction.reply({ content: delivered ? `📡 Transmission sent to <@${to.id}>.` : `<@${to.id}>, incoming transmission:`, embeds: delivered ? [] : [embed], flags: delivered ? ephemeral : undefined });
  }

  if (sub === "broadcast") {
    const o = store.orgOf(g, interaction.user.id);
    if (!o) return interaction.reply({ content: "You need to be in an org to broadcast.", flags: ephemeral });
    await interaction.deferReply({ flags: ephemeral });
    const embed = transmissionEmbed({ from: `${char.name} [${o.tag}]`, title: `${o.name} all-hands`, text: message });
    for (const m of o.members) {
      if (m === interaction.user.id) continue;
      const user = await interaction.client.users.fetch(m).catch(() => null);
      await user?.send({ embeds: [embed] }).catch(() => {});
    }
    return interaction.editReply({ content: `📡 Broadcast sent to ${o.members.length - 1} member(s) of ${o.name}.` });
  }
}

// ── /dm-admin, /dm-help ──────────────────────────────────────────────────────
export async function admin(interaction, g, sub) {
  if (sub === "voice") {
    g.settings.voice = interaction.options.getBoolean("enabled");
    store.save();
    if (!g.settings.voice) voice.leave(interaction.guildId);
    return interaction.reply({ content: `The DM's spoken voice is now **${g.settings.voice ? "on" : "off"}**.`, flags: ephemeral });
  }
  if (sub === "voice-name") {
    g.settings.voiceName = interaction.options.getString("voice");
    store.save();
    const note = process.env.ELEVENLABS_API_KEY ? " (ElevenLabs is active, so ELEVENLABS_VOICE_ID in .env decides the voice.)" : "";
    return interaction.reply({ content: `Voice set to **${voice.EDGE_VOICES[g.settings.voiceName]}**. Try \`/voice test\`.${note}`, flags: ephemeral });
  }
  if (sub === "comms-channel") {
    const channel = interaction.options.getChannel("channel");
    g.settings.commsChannelId = channel.id;
    store.save();
    return interaction.reply({ content: `Story transmissions will be posted in <#${channel.id}>.`, flags: ephemeral });
  }
  if (sub === "dms") {
    g.settings.dmPlayers = interaction.options.getBoolean("enabled");
    store.save();
    return interaction.reply({ content: `Story DMs to players are now **${g.settings.dmPlayers ? "on" : "off"}**.`, flags: ephemeral });
  }
}

export async function help(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.dossier)
    .setTitle("Star Citizen DM: how to play")
    .setDescription(
      `Your personal Game Master for the 'Verse (year ${CURRENT_YEAR}, ${CURRENT_PATCH}).\n\n` +
      "**1. Make a character:** `/character create` (pick an origin, career, pronouns and name; the DM writes your origin story and its hooks).\n" +
      "**Quick job:** `/mission` gives your crew a one-shot mission in the DM's voice. Play it in game and in voice, then click ✅ or 💀. Don't like it? 🎲 Reroll or 🗑️ Scrap.\n" +
      "**2. Start a story:** `/campaign start` (solo or with your org). Each act gives you real **in-game objectives** and a **roleplay prompt**.\n" +
      "**3. Play it in game**, then click how your crew handled it. Your choices (🕊️ clean / 🤝 deal / 🔥 ruthless) decide the **finale**.\n" +
      "**4. Keep going:** `/story next` for the next act. `/log` to record what you did. `/character location` when you travel.\n" +
      "**Ask the DM:** `/ask what contract do we take for this?`, or start a message with `?` in the scribe channel.\n" +
      "**Dice:** `/roll` (default d20, or `2d6+1`). Missions roll a d20 for the road, which decides your forced stops.\n" +
      "**Keeping track:** `/status` shows injuries, ship damage and warrants (they carry into stories). `/lore` is your server's canon, `/archive` holds finished stories, and an admin can set a **scribe channel** where one person types quick updates during play.\n" +
      "**Voice:** join a voice channel and the DM reads briefings, twists and finales aloud. `/voice join`, `/voice test`, `/voice leave`.\n" +
      "**Link up:** `/story crossover @player` ties two characters' stories together. Orgs share campaigns (`/org`), and `/comms` sends in-character transmissions.\n" +
      "**The world remembers:** finales, rivalries and new orgs go into the world log and show up in `/comms news`.",
    )
    .setFooter({ text: aiEnabled() ? `Narration: ${aiLabel()} + lore engine` : "Narration: built-in lore engine (add an OpenRouter or Anthropic key for AI-written prose)" });
  return interaction.reply({ embeds: [embed], flags: ephemeral });
}


// ── /voice ───────────────────────────────────────────────────────────────────
export async function voiceCommand(interaction, g, sub) {
  if (sub === "leave") {
    voice.leave(interaction.guildId);
    return interaction.reply({ content: "The DM has left voice.", flags: ephemeral });
  }
  const channel = interaction.member?.voice?.channel;
  if (!channel) return interaction.reply({ content: "Join a voice channel first, then try again.", flags: ephemeral });
  if (g.settings.voice === false) return interaction.reply({ content: "The DM's voice is turned off. An admin can enable it with `/dm-admin voice`.", flags: ephemeral });
  const me = interaction.guild.members.me;
  const missing = ["ViewChannel", "Connect", "Speak"].filter((p) => !channel.permissionsFor(me)?.has(p));
  if (missing.length) {
    return interaction.reply({
      content: `I'm missing **${missing.join(", ")}** in **${channel.name}**. Fix it in Server Settings → Roles → my role, or open the invite link shown in my window when I start.`,
      flags: ephemeral,
    });
  }
  await interaction.deferReply({ flags: ephemeral });
  try {
    await voice.join(channel);
  } catch (err) {
    console.warn("[voice] join failed:", err.message);
    return interaction.editReply("I couldn't join that channel. Check that I have the **Connect** and **Speak** permissions there.");
  }
  if (sub === "join") {
    return interaction.editReply(`Joined **${channel.name}**. I'll read briefings, transmissions and twists aloud. (${voice.ttsLabel()})`);
  }
  if (sub === "replay") {
    const last = voice.lastSpoken(interaction.guildId);
    if (!last) return interaction.editReply("I haven't said anything yet.");
    voice.say(channel, last, g.settings.voiceName);
    return interaction.editReply("Replaying.");
  }
  if (sub === "test") {
    voice.say(channel, "Comms check. This is your DM. Loud and clear, spacers? Good. Let's get to work.", g.settings.voiceName);
    return interaction.editReply(`Speaking now with the ${voice.ttsLabel()}. If you hear nothing, check the bot's window for a line starting with [voice].`);
  }
}

export async function rpRules(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.news)
    .setTitle("🎲 The game is part of the story")
    .setDescription(
      "Star Citizen is an alpha. Things break. Don't fight it, play it:\n\n" +
      GAME_RULES.map((r) => `• ${r.text}`).join("\n") +
      "\n\n**Failure is story too.** Report what really happened, and the DM builds on it.",
    );
  return interaction.reply({ embeds: [embed] });
}

// ── /roll ────────────────────────────────────────────────────────────────────
export async function rollCommand(interaction, g) {
  const expr = interaction.options.getString("dice") || "1d20";
  const what = interaction.options.getString("for");
  const r = rollDice(expr);
  if (!r) return interaction.reply({ content: "I can roll things like `d20`, `2d6` or `1d20+3`.", flags: ephemeral });
  const who = store.activeCharacter(g, interaction.user.id)?.name || interaction.member?.displayName || interaction.user.username;
  let verdict = "";
  if (r.sides === 20 && r.rolls.length === 1) {
    if (r.rolls[0] === 20) verdict = "**Natural 20.** It works better than anyone planned.";
    else if (r.rolls[0] === 1) verdict = "**Natural 1.** It goes wrong, loudly.";
    else if (r.total >= 15) verdict = "Clean success.";
    else if (r.total >= 10) verdict = "It works, but there's a cost. Someone decides what.";
    else verdict = "It doesn't work. Find another way.";
  }
  const embed = new EmbedBuilder()
    .setColor(COLORS.news)
    .setDescription(`🎲 **${who}** rolls ${r.text}${what ? ` to *${what}*` : ""}: ${r.rolls.length > 1 || r.mod ? `[${r.rolls.join(", ")}]${r.mod ? ` ${r.mod > 0 ? "+" : "−"} ${Math.abs(r.mod)}` : ""} = ` : ""}**${r.total}**${verdict ? `\n${verdict}` : ""}`);
  await interaction.reply({ embeds: [embed] });
  voice.sayIfConnected(interaction.guild, g, `${who} rolls ${r.total}. ${verdict.replace(/\*/g, "")}`);
}
