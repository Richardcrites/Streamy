import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
} from "discord.js";
import { ORIGINS, CAREERS } from "../lore/data.js";
import { PRONOUNS } from "../engine/util.js";
import { suggestNames, buildCharacter, linkKin } from "../engine/story.js";
import { narrateOrigin } from "../ai.js";
import * as store from "../store.js";
import { dossierEmbed, broadcast, COLORS, clip } from "../comms.js";

const ephemeral = MessageFlags.Ephemeral;

const step = (title, text) => new EmbedBuilder().setColor(COLORS.dossier).setAuthor({ name: "CHARACTER CREATION" }).setTitle(title).setDescription(text);

// ── /character create → origin → career → pronouns → name → story ───────────
export async function create(interaction, g) {
  g.drafts[interaction.user.id] = { seed: interaction.options.getString("seed") || null };
  store.save();
  const menu = new StringSelectMenuBuilder()
    .setCustomId("cc:origin")
    .setPlaceholder("Choose your origin")
    .addOptions(Object.entries(ORIGINS).map(([id, o]) => ({ label: o.label, value: id, emoji: o.emoji, description: clip(o.home, 100) })));
  await interaction.reply({
    embeds: [step("Step 1 of 4: Where are you from?", "Your origin sets your home, your loyalties and the old wounds your stories will pull on.")],
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: ephemeral,
  });
}

export async function onOrigin(interaction, g) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  draft.originId = interaction.values[0];
  store.save();
  const menu = new StringSelectMenuBuilder()
    .setCustomId("cc:career")
    .setPlaceholder("Choose your career")
    .addOptions(Object.entries(CAREERS).map(([id, c]) => ({ label: c.label, value: id, emoji: c.emoji })));
  await interaction.update({
    embeds: [step("Step 2 of 4: What do you do?", `**${ORIGINS[draft.originId].label}**. Now pick a career. The DM gives you in-game objectives that fit it.`)],
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

export async function onCareer(interaction, g) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  draft.career = interaction.values[0];
  store.save();
  const row = new ActionRowBuilder().addComponents(
    Object.entries(PRONOUNS).map(([k, p]) => new ButtonBuilder().setCustomId(`cc:pr:${k}`).setLabel(p.label).setStyle(ButtonStyle.Secondary)),
  );
  await interaction.update({
    embeds: [step("Step 3 of 4: Pronouns", "How should the story refer to your character?")],
    components: [row],
  });
}

export async function onPronouns(interaction, g, key) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  draft.pronouns = key;
  store.save();
  await showNames(interaction, draft, g);
}

async function showNames(interaction, draft, g) {
  draft.names = suggestNames(draft.originId, 6, g);
  store.save();
  const nameButtons = draft.names.map((n, i) => new ButtonBuilder().setCustomId(`cc:name:${i}`).setLabel(clip(n, 80)).setStyle(ButtonStyle.Primary));
  await interaction.update({
    embeds: [step("Step 4 of 4: Choose a name", `Names that fit a **${ORIGINS[draft.originId].label}**. Pick one, roll new ones, or type your own.`)],
    components: [
      new ActionRowBuilder().addComponents(nameButtons.slice(0, 3)),
      new ActionRowBuilder().addComponents(nameButtons.slice(3, 6)),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("cc:reroll").setLabel("More names").setEmoji("🎲").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("cc:custom").setLabel("Type my own").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

export async function onReroll(interaction, g) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  await showNames(interaction, draft, g);
}

export async function onCustom(interaction, g) {
  if (!g.drafts[interaction.user.id]) return expired(interaction);
  const modal = new ModalBuilder().setCustomId("cc:modal").setTitle("Name your character").addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("name").setLabel("Character name").setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(40).setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

export async function onNamePicked(interaction, g, index) {
  const draft = g.drafts[interaction.user.id];
  if (!draft?.names?.[index]) return expired(interaction);
  await interaction.deferUpdate();
  await finish(interaction, g, draft, draft.names[index]);
}

export async function onCustomName(interaction, g) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  const name = interaction.fields.getTextInputValue("name").trim();
  await interaction.deferUpdate();
  await finish(interaction, g, draft, name);
}

async function finish(interaction, g, draft, name) {
  await interaction.editReply({ embeds: [step("Writing your story…", `The DM is writing ${name}'s origin.`)], components: [] });

  const char = buildCharacter(g, { ownerId: interaction.user.id, originId: draft.originId, career: draft.career, name, pronouns: draft.pronouns, seed: draft.seed });
  char.careerLabel = CAREERS[char.career].label;
  char.pronounsLabel = PRONOUNS[char.pronouns].label;
  const prose = await narrateOrigin(char);
  if (prose) char.story = prose;

  g.characters[char.id] = char;
  g.activeChar[interaction.user.id] = char.id;
  const kin = linkKin(g, char);
  delete g.drafts[interaction.user.id];
  store.addJournal(char, { kind: "origin", text: `${char.name} entered the 'Verse: ${char.origin}, ${char.careerLabel}.` });
  store.logWorld(g, `${char.name} (${char.origin}) arrived in the 'Verse.`);
  for (const k of kin) store.logWorld(g, `Rumour has it ${char.name} and ${k.with} are blood: ${k.relation}s.`);
  store.save();

  await interaction.editReply({
    embeds: [step(`${char.name} is ready`, "Your dossier has been posted. Next: `/campaign start` for a full story arc, or `/story crossover` to link up with another player.")],
    components: [],
  });
  await broadcast(interaction, g, {
    content: `🆕 <@${interaction.user.id}> has a new character.`,
    embeds: [dossierEmbed(char, { full: true })],
    userIds: [],
  });
}

async function expired(interaction) {
  const msg = { content: "That character draft expired. Run `/character create` again.", embeds: [], components: [] };
  if (interaction.isMessageComponent()) return interaction.update(msg);
  return interaction.reply({ ...msg, flags: ephemeral });
}

// ── Other /character subcommands ─────────────────────────────────────────────
function targetChar(interaction, g) {
  const user = interaction.options.getUser("player") || interaction.user;
  return { user, char: store.activeCharacter(g, user.id) };
}

export async function sheet(interaction, g, { full = false } = {}) {
  const { user, char } = targetChar(interaction, g);
  if (!char) return interaction.reply({ content: `${user.id === interaction.user.id ? "You don't" : `${user.username} doesn't`} have a character yet. Use \`/character create\`.`, flags: ephemeral });
  const embed = dossierEmbed(char, { full });
  const camp = store.activeCampaignFor(g, char.id);
  if (camp) embed.addFields({ name: "Current campaign", value: `${camp.title} (Act ${Math.min(camp.actIndex + 1, camp.acts.length)}/${camp.acts.length})` });
  await interaction.reply({ embeds: [embed] });
}

export async function list(interaction, g) {
  const chars = store.charactersOf(g, interaction.user.id);
  if (!chars.length) return interaction.reply({ content: "No characters yet. Use `/character create`.", flags: ephemeral });
  const active = g.activeChar[interaction.user.id];
  await interaction.reply({ content: chars.map((c) => `${c.id === active ? "▶️" : "▫️"} **${c.name}**: ${c.origin}, ${c.careerLabel}`).join("\n"), flags: ephemeral });
}

export async function switchChar(interaction, g) {
  const q = interaction.options.getString("name").toLowerCase();
  const char = store.charactersOf(g, interaction.user.id).find((c) => c.name.toLowerCase().includes(q));
  if (!char) return interaction.reply({ content: "No character of yours matches that name.", flags: ephemeral });
  g.activeChar[interaction.user.id] = char.id;
  store.save();
  await interaction.reply({ content: `Now playing as **${char.name}**.`, flags: ephemeral });
}

export async function location(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const system = interaction.options.getString("system");
  const place = interaction.options.getString("place");
  char.location = place ? `${place} (${system})` : system;
  store.addJournal(char, { kind: "travel", text: `Arrived at ${char.location}.` });
  store.save();
  await interaction.reply({ content: `📍 **${char.name}** is now at ${char.location}.`, flags: ephemeral });
}

export async function log(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const entry = interaction.options.getString("entry");
  store.addJournal(char, { kind: "log", text: entry });
  store.save();
  await interaction.reply({ content: `📝 Logged for **${char.name}**: ${entry}\n*The DM will weave this into upcoming chapters.*` });
}

export async function journal(interaction, g) {
  const { user, char } = targetChar(interaction, g);
  if (!char) return interaction.reply({ content: `${user.username} has no character yet.`, flags: ephemeral });
  const lines = char.journal.slice(-12).reverse().map((j) => `\`${j.at.slice(0, 10)}\` ${clip(j.text, 180)}`);
  const embed = new EmbedBuilder().setColor(COLORS.dossier).setTitle(`${char.name}'s journal`).setDescription(lines.join("\n") || "Nothing yet.");
  await interaction.reply({ embeds: [embed] });
}

// ── /character backstory: the player writes (or rewrites) the story ─────────
export async function backstory(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const input = new TextInputBuilder()
    .setCustomId("story")
    .setLabel(clip(`${char.name}'s backstory`, 45))
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(20)
    .setMaxLength(4000)
    .setRequired(true)
    .setValue(clip(char.story.join("\n\n"), 4000));
  await interaction.showModal(
    new ModalBuilder().setCustomId("cc:bs").setTitle("Your backstory").addComponents(new ActionRowBuilder().addComponents(input)),
  );
}

export async function onBackstory(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  char.story = interaction.fields.getTextInputValue("story").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  char.customStory = true;
  store.addJournal(char, { kind: "origin", text: "Rewrote their backstory." });
  store.save();
  await interaction.reply({ content: "Backstory saved. Your story hooks are unchanged, so the DM will keep pulling on them.", embeds: [dossierEmbed(char, { full: true })], flags: ephemeral });
}

export async function remove(interaction, g) {
  const q = interaction.options.getString("name").toLowerCase();
  const char = store.charactersOf(g, interaction.user.id).find((c) => c.name.toLowerCase().includes(q));
  if (!char) return interaction.reply({ content: "No character of yours matches that name.", flags: ephemeral });
  if (store.activeCampaignFor(g, char.id)) return interaction.reply({ content: `${char.name} is in an active campaign. Finish or \`/campaign abandon\` it first.`, flags: ephemeral });
  delete g.characters[char.id];
  if (g.activeChar[interaction.user.id] === char.id) {
    const next = store.charactersOf(g, interaction.user.id)[0];
    if (next) g.activeChar[interaction.user.id] = next.id;
    else delete g.activeChar[interaction.user.id];
  }
  store.save();
  await interaction.reply({ content: `**${char.name}** has been deleted.`, flags: ephemeral });
}
