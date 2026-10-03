// Conditions (/status), server canon (/lore), the story archive (/archive), and the scribe channel:
// one player types quick updates during play, and the DM turns them into records with no commands.

import {
  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, MessageFlags,
} from "discord.js";
import * as store from "../store.js";
import { COLORS, clip } from "../comms.js";
import {
  CONDITION_KINDS, addCondition, activeConditions, clearCondition, conditionLine, findCharacter,
  addCanon, archiveExport,
} from "../engine/records.js";
import { parseScribe, aiEnabled } from "../ai.js";
import * as voice from "../voice.js";
import { answer, answerEmbed } from "./ask.js";

const ephemeral = MessageFlags.Ephemeral;

// ── Applying updates (shared by the scribe channel and mission/chapter reports) ──
export function applyUpdates(g, characters, parsed, { mission = null } = {}) {
  const lines = [];
  const unknown = new Set();
  for (const u of parsed.updates || []) {
    const char = findCharacter(characters, u.character);
    if (!char) {
      if (u.character) unknown.add(u.character);
      continue;
    }
    const short = char.name;
    if (CONDITION_KINDS[u.kind]) {
      const c = addCondition(char, { kind: u.kind, text: u.text, severity: u.severity || "minor", clears: u.clears });
      store.addJournal(char, { kind: "condition", text: `${CONDITION_KINDS[c.kind].label}: ${c.text}.` });
      lines.push(`${CONDITION_KINDS[c.kind].emoji} **${short}**: ${c.text}${c.severity !== "minor" ? ` (${c.severity})` : ""}. *Clears: ${c.clears}*`);
    } else if (u.kind === "clear") {
      const target = activeConditions(char).find((c) => c.id === u.condition_id) ||
        activeConditions(char).find((c) => u.text && c.text.toLowerCase().includes(u.text.toLowerCase().split(" ")[0]));
      const c = target && clearCondition(char, target.id, u.text);
      if (c) {
        store.addJournal(char, { kind: "condition", text: `Recovered: ${c.text}.` });
        lines.push(`✅ **${short}**: ${c.text} is resolved.`);
      }
    } else if (u.kind === "location" && u.text) {
      char.location = u.text;
      store.addJournal(char, { kind: "travel", text: `Now at ${u.text}.` });
      lines.push(`📍 **${short}** → ${u.text}`);
    } else if (u.text) {
      store.addJournal(char, { kind: "log", text: u.text });
      lines.push(`📝 **${short}**: ${u.text}`);
    }
  }
  for (const l of parsed.lore || []) {
    if (addCanon(g, l, "scribe")) lines.push(`📜 Canon: ${l}`);
  }
  if (mission && parsed.summary) (mission.scribe ??= []).push(parsed.summary);
  store.save();
  return { lines, unknown: [...unknown] };
}

// Characters the scribe is most likely talking about: everyone's active character.
const activeChars = (g) => Object.values(g.activeChar).map((id) => g.characters[id]).filter(Boolean);
const latestMission = (g) => Object.values(g.missions || {}).filter((m) => m.status === "active").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

export async function parseAndApply(g, text, author, { mission = latestMission(g) } = {}) {
  const chars = activeChars(g);
  const parsed = await parseScribe({
    text,
    author,
    missionTitle: mission?.title,
    characters: chars.map((c) => ({
      name: c.name,
      also_called: c.name.split(/\s+/)[0],
      active_conditions: activeConditions(c).map((x) => ({ condition_id: x.id, kind: x.kind, text: x.text })),
    })),
  });
  if (!parsed) return null;
  return { parsed, ...applyUpdates(g, chars, parsed, { mission }) };
}

// ── Scribe channel: plain messages, no commands ──────────────────────────────
export async function onScribeMessage(message, g) {
  const text = message.content?.trim();
  if (!text || text.startsWith("((") || text.startsWith("//")) return;
  const authorChar = store.activeCharacter(g, message.author.id);
  const author = authorChar ? `${message.member?.displayName ?? message.author.username} (plays ${authorChar.name})` : message.author.username;

  // "?" in front means it's a question for the DM, not an update.
  if (text.startsWith("?")) {
    const question = text.slice(1).trim();
    if (!question) return;
    await message.channel.sendTyping().catch(() => {});
    const reply = await answer(g, { question, userId: message.author.id, askerName: message.member?.displayName ?? message.author.username });
    await message.reply({ embeds: [answerEmbed(g, question, reply)], allowedMentions: { repliedUser: false } }).catch(() => {});
    voice.sayIfConnected(message.guild, g, reply);
    return;
  }

  if (!aiEnabled()) {
    // Without AI we can't parse, but nothing is lost: it goes into the field log and journal.
    const mission = latestMission(g);
    if (mission) (mission.scribe ??= []).push(text);
    if (authorChar) store.addJournal(authorChar, { kind: "log", text });
    store.save();
    return message.react("📝").catch(() => {});
  }

  await message.channel.sendTyping().catch(() => {});
  const result = await parseAndApply(g, text, author);
  if (!result) return message.react("⚠️").catch(() => {});
  if (!result.lines.length) {
    return message.react(result.unknown.length ? "❓" : "👍").catch(() => {});
  }
  await message.react("✅").catch(() => {});
  const embed = new EmbedBuilder().setColor(COLORS.outcome).setDescription(clip(result.lines.join("\n"), 4000));
  if (result.unknown.length) embed.setFooter({ text: `Couldn't match: ${result.unknown.join(", ")}. Do they have a character?` });
  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
  if (result.parsed.summary) voice.sayIfConnected(message.guild, g, result.parsed.summary);
}

// ── /status ──────────────────────────────────────────────────────────────────
export async function status(interaction, g, sub) {
  const user = interaction.options.getUser("player") || interaction.user;
  const char = store.activeCharacter(g, user.id);
  if (!char) return interaction.reply({ content: `${user.id === interaction.user.id ? "You don't" : `${user.username} doesn't`} have a character yet.`, flags: ephemeral });

  if (sub === "view") {
    const active = activeConditions(char);
    const recent = (char.conditions || []).filter((c) => c.status === "cleared").slice(-3);
    const embed = new EmbedBuilder()
      .setColor(COLORS.dossier)
      .setTitle(`${char.name}: status`)
      .setDescription(active.length ? active.map(conditionLine).join("\n") : "Fit to fly. No active conditions.");
    if (recent.length) embed.addFields({ name: "Recently recovered", value: recent.map((c) => `✅ ${c.text}`).join("\n") });
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "add") {
    const c = addCondition(char, {
      kind: interaction.options.getString("type"),
      text: interaction.options.getString("condition"),
      severity: interaction.options.getString("severity") || "minor",
      clears: interaction.options.getString("clears") || "",
    });
    store.addJournal(char, { kind: "condition", text: `${CONDITION_KINDS[c.kind].label}: ${c.text}.` });
    store.save();
    return interaction.reply({ content: `${user.id === interaction.user.id ? "" : `<@${user.id}> `}${conditionLine(c)}` });
  }

  if (sub === "clear") {
    const active = activeConditions(char);
    if (!active.length) return interaction.reply({ content: `${char.name} has no active conditions.`, flags: ephemeral });
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`st:${char.id}`)
      .setPlaceholder("What's been fixed?")
      .setMinValues(1)
      .setMaxValues(active.length)
      .addOptions(active.slice(0, 25).map((c) => ({ label: clip(c.text, 100), value: c.id, emoji: CONDITION_KINDS[c.kind].emoji, description: clip(`Clears: ${c.clears}`, 100) })));
    return interaction.reply({ content: `Clear conditions for **${char.name}**:`, components: [new ActionRowBuilder().addComponents(menu)], flags: ephemeral });
  }
}

export async function onClearSelect(interaction, g, charId) {
  const char = g.characters[charId];
  if (!char) return interaction.update({ content: "Character not found.", components: [] });
  const cleared = interaction.values.map((id) => clearCondition(char, id, "cleared by player")).filter(Boolean);
  for (const c of cleared) store.addJournal(char, { kind: "condition", text: `Recovered: ${c.text}.` });
  store.save();
  await interaction.update({ content: cleared.map((c) => `✅ ${char.name}: ${c.text} is resolved.`).join("\n") || "Nothing changed.", components: [] });
}

// ── /lore ────────────────────────────────────────────────────────────────────
export async function lore(interaction, g, sub) {
  if (sub === "add") {
    const entry = addCanon(g, interaction.options.getString("fact"), interaction.user.username);
    store.save();
    return interaction.reply({ content: entry ? `📜 Added to server canon: ${entry.text}` : "That's already canon.", flags: entry ? undefined : ephemeral });
  }
  const canon = g.canon || [];
  const embed = new EmbedBuilder()
    .setColor(COLORS.news)
    .setTitle("📜 Server canon")
    .setDescription(canon.length ? clip(canon.slice(-30).map((c) => `• ${c.text}`).join("\n"), 4000) : "Nothing yet. Add with `/lore add`, or let the scribe channel pick it up.");
  return interaction.reply({ embeds: [embed] });
}

// ── /archive ─────────────────────────────────────────────────────────────────
export async function archive(interaction, g, sub) {
  const entries = g.archive || [];
  if (sub === "list") {
    const embed = new EmbedBuilder()
      .setColor(COLORS.news)
      .setTitle("📚 Story archive")
      .setDescription(entries.length
        ? clip(entries.slice(-20).reverse().map((e) => `\`${e.at.slice(0, 10)}\` ${e.kind === "campaign" ? "📖" : "📄"} **${e.title}**`).join("\n"), 4000)
        : "Nothing archived yet. Finished missions and campaigns land here automatically.");
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === "read") {
    const q = interaction.options.getString("title").toLowerCase();
    const e = [...entries].reverse().find((x) => x.title.toLowerCase().includes(q));
    if (!e) return interaction.reply({ content: "No archived story matches that title. See `/archive list`.", flags: ephemeral });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.news).setDescription(clip(e.text, 4000))] });
  }
  if (sub === "export") {
    if (!entries.length && !(g.canon || []).length) return interaction.reply({ content: "Nothing to export yet.", flags: ephemeral });
    const file = new AttachmentBuilder(Buffer.from(archiveExport(g), "utf8"), { name: "story-archive.md" });
    return interaction.reply({ content: "📚 The full archive and server canon:", files: [file] });
  }
}

export async function setScribeChannel(interaction, g) {
  const channel = interaction.options.getChannel("channel");
  g.settings.scribeChannelId = channel.id;
  store.save();
  const needsIntent = !interaction.client.options.intents.has("MessageContent");
  return interaction.reply({
    content: `✍️ Scribe channel set to <#${channel.id}>. Anything typed there becomes records: injuries, ship damage, locations, lore.` +
      (needsIntent ? "\n⚠️ One more step: in the Discord developer portal → **Bot**, turn on **Message Content Intent**, then restart the bot." : ""),
    flags: ephemeral,
  });
}
