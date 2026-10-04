import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
} from "discord.js";
import { ORIGINS } from "../lore/data.js";
import { allRoles, roleInfo, findRole, addCustomRole, removeCustomRole } from "../engine/roles.js";
import { PermissionFlagsBits } from "discord.js";
import { PRONOUNS } from "../engine/util.js";
import { suggestNames, buildCharacter, linkKin, seedParagraph, shortName } from "../engine/story.js";
import { narrateOrigin, aiEnabled, aiLabel } from "../ai.js";
import { activeSaga, ensureTidbits } from "../engine/saga.js";
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
    embeds: [step("Step 1 of 3: Where are you from?", "Your origin sets your home, your loyalties and the old wounds your stories will pull on.")],
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: ephemeral,
  });
}

export async function onOrigin(interaction, g) {
  const draft = g.drafts[interaction.user.id];
  if (!draft) return expired(interaction);
  draft.originId = interaction.values[0];
  store.save();
  const row = new ActionRowBuilder().addComponents(
    Object.entries(PRONOUNS).map(([k, p]) => new ButtonBuilder().setCustomId(`cc:pr:${k}`).setLabel(p.label).setStyle(ButtonStyle.Secondary)),
  );
  await interaction.update({
    embeds: [step("Step 2 of 3: Pronouns", `**${ORIGINS[draft.originId].label}**. How should the story refer to your character?`)],
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
    embeds: [step("Step 3 of 3: Choose a name", `Names that fit a **${ORIGINS[draft.originId].label}**. Pick one, roll new ones, or type your own.`)],
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

  const char = buildCharacter(g, { ownerId: interaction.user.id, originId: draft.originId, career: null, name, pronouns: draft.pronouns, seed: draft.seed });
  char.pronounsLabel = PRONOUNS[char.pronouns].label;
  // Other characters' stories (same origin first), so the AI doesn't hand out the same life twice.
  const others = Object.values(g.characters)
    .sort((x, y) => (y.originId === char.originId) - (x.originId === char.originId))
    .slice(0, 8)
    .map((c) => `${c.name}: ${c.story.join(" ").slice(0, 400)}`);
  const prose = await narrateOrigin(char, others);
  if (prose) char.story = prose;
  const fallback = !prose && aiEnabled();

  g.characters[char.id] = char;
  g.activeChar[interaction.user.id] = char.id;
  const kin = linkKin(g, char);
  // A saga is running: the newcomer has secrets in it too.
  if (activeSaga(g)) ensureTidbits(g, g.saga, char);
  delete g.drafts[interaction.user.id];
  store.addJournal(char, { kind: "origin", text: `${char.name} entered the 'Verse: ${char.origin}.` });
  store.logWorld(g, `${char.name} (${char.origin}) arrived in the 'Verse.`);
  for (const k of kin) store.logWorld(g, `Rumour has it ${char.name} and ${k.with} are blood: ${k.relation}s.`);
  store.save();

  await interaction.editReply({
    embeds: [step(`${char.name} is ready`, "Your dossier has been posted. Next: `/campaign start` for a full story arc, or `/story crossover` to link up with another player." +
      (fallback ? `\n\n⚠️ The AI (${aiLabel()}) didn't answer, so this is the built-in story with your description worked in. Once the model is fixed, \`/character retell\` rewrites it.` : ""))],
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
  await interaction.reply({ content: chars.map((c) => `${c.id === active ? "▶️" : "▫️"} **${c.name}**: ${c.origin}${c.preferredRole ? `, prefers ${roleInfo(g, c.preferredRole)?.label ?? "a removed role"}` : ""}`).join("\n"), flags: ephemeral });
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

// ── /character retell: the DM rewrites the origin story ─────────────────────
export async function retell(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const description = interaction.options.getString("description");
  await interaction.deferReply({ flags: ephemeral });
  const oldSeed = char.seed;
  if (description) char.seed = description;
  const others = Object.values(g.characters).filter((c) => c.id !== char.id).slice(0, 8).map((c) => `${c.name}: ${c.story.join(" ").slice(0, 400)}`);
  const prose = await narrateOrigin(char, others);
  if (prose) {
    char.story = prose;
  } else {
    // No AI (or it failed): swap the description paragraph in the built-in story.
    const vars = { name: char.name, short: shortName(char.name) };
    const oldPara = oldSeed ? char.story.findIndex((p) => p.includes(oldSeed.trim().replace(/[.!\s]+$/, "").slice(1, 30))) : -1;
    const para = seedParagraph(char.seed, vars, char.pronouns);
    if (para && oldPara >= 0) char.story[oldPara] = para;
    else if (para && !char.story.includes(para)) char.story.splice(1, 0, para);
  }
  char.customStory = false;
  store.addJournal(char, { kind: "origin", text: "Their origin story was retold." });
  store.save();
  const note = prose ? "The DM rewrote your story." : aiEnabled()
    ? `⚠️ The AI (${aiLabel()}) didn't answer, so your description was worked into the built-in story. Try a different \`OPENROUTER_MODEL\` (see the README).`
    : "No AI key is set, so your description was worked into the built-in story.";
  await interaction.editReply({ content: note, embeds: [dossierEmbed(char, { full: true })] });
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

// ── /character role: pick a role, type a new one, or auto ────────────────────
function applyRole(g, char, key) {
  char.preferredRole = key;
  const r = key ? roleInfo(g, key) : null;
  char.preferredRoleLabel = r?.label ?? null;
  char.preferredRoleEmoji = r?.emoji ?? null;
  store.save();
  return r
    ? `${r.emoji} **${char.name}** will be the crew's **${r.label}** whenever possible. (If two people pick the same role, one of them gets their next-best fit.)`
    : `**${char.name}** will get roles that fit their story, and rotate so they try new things.`;
}

export async function setRole(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const typed = interaction.options.getString("role").trim();
  if (typed.toLowerCase() === "auto") return interaction.reply({ content: applyRole(g, char, null), flags: ephemeral });
  const name = typed.startsWith("new:") ? typed.slice(4).trim() : typed;
  const key = findRole(g, name);
  if (key) return interaction.reply({ content: applyRole(g, char, key), flags: ephemeral });

  // A role that doesn't exist yet: ask what the job is, then create it for the whole server.
  const label = name.slice(0, 40);
  if (label.length < 2) return interaction.reply({ content: "Give the role a name, e.g. `Information Broker`.", flags: ephemeral });
  g.drafts[`role:${interaction.user.id}`] = { label };
  store.save();
  await interaction.showModal(
    new ModalBuilder().setCustomId("cr:new").setTitle(clip(`New role: ${label}`, 45)).addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("job").setLabel("What does this role do on a job?").setStyle(TextInputStyle.Paragraph)
          .setRequired(true).setMinLength(10).setMaxLength(300).setPlaceholder("e.g. Works the comms and contacts, buys intel, and talks the crew out of trouble."),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("emoji").setLabel("Emoji (optional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(8).setPlaceholder("🕵️"),
      ),
    ),
  );
}

export async function onNewRole(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  const draft = g.drafts[`role:${interaction.user.id}`];
  if (!char || !draft) return interaction.reply({ content: "That expired. Run `/character role` again.", flags: ephemeral });
  delete g.drafts[`role:${interaction.user.id}`];
  const key = addCustomRole(g, {
    label: draft.label,
    job: interaction.fields.getTextInputValue("job"),
    emoji: interaction.fields.getTextInputValue("emoji"),
    createdBy: interaction.user.id,
  });
  const r = roleInfo(g, key);
  store.logWorld(g, `A new crew role exists on this server: ${r.label}.`);
  await interaction.reply({ content: `✨ New role created: ${r.emoji} **${r.label}**: ${r.job}\n${applyRole(g, char, key)}\nOthers can pick it too.`, flags: ephemeral });
}

// Suggestions while typing: auto, built-in roles, this server's custom roles, and "create new".
export async function roleAutocomplete(interaction, g, { customOnly = false } = {}) {
  const typed = (interaction.options.getFocused() || "").trim();
  const q = typed.toLowerCase();
  const roles = Object.entries(allRoles(g)).filter(([, r]) => !customOnly || r.custom);
  const options = [
    ...(customOnly ? [] : [{ name: "🎲 Auto (fit my story, rotate)", value: "auto" }]),
    ...roles.map(([k, r]) => ({ name: `${r.emoji} ${r.label}${r.custom ? " (custom)" : ""}`, value: k })),
  ].filter((o) => !q || o.name.toLowerCase().includes(q));
  if (!customOnly && typed && !findRole(g, typed)) {
    const create = { name: clip(`✨ New role: "${typed}"`, 100), value: `new:${typed}`.slice(0, 100) };
    // Existing matches first; "create new" goes last unless nothing matches.
    if (options.some((o) => o.value !== "auto")) options.splice(24, 0, create);
    else options.unshift(create);
  }
  await interaction.respond(options.slice(0, 25));
}

// ── /crew-roles ──────────────────────────────────────────────────────────────
export async function crewRoles(interaction, g, sub) {
  if (sub === "remove") {
    const key = interaction.options.getString("role");
    const r = g.customRoles?.[key];
    if (!r) return interaction.reply({ content: "That isn't a custom role on this server.", flags: ephemeral });
    const admin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (r.createdBy !== interaction.user.id && !admin) return interaction.reply({ content: "Only the player who created it, or a server admin, can remove it.", flags: ephemeral });
    removeCustomRole(g, key);
    store.save();
    return interaction.reply({ content: `🗑️ Removed the custom role **${r.label}**. Anyone who preferred it is back on Auto.`, flags: ephemeral });
  }
  const lines = Object.values(allRoles(g)).map((r) => `${r.emoji} **${r.label}**${r.custom ? " *(custom)*" : ""}: ${r.job}`);
  const embed = new EmbedBuilder().setColor(COLORS.dossier).setTitle("🎭 Crew roles").setDescription(clip(lines.join("\n"), 4000))
    .setFooter({ text: "Make your own: /character role, then type a new name." });
  return interaction.reply({ embeds: [embed] });
}
