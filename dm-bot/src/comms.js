// Formatting and delivery of in-character "comms": transmissions, chapter briefings, news.
// Story posts go to the server's comms channel (set with /comms channel) and, if enabled,
// are DMed to every player involved, so they arrive like incoming comms in the game.

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { CREW_ROLES } from "./lore/data.js";

export const COLORS = { transmission: 0xf5a623, dossier: 0x4aa3df, chapter: 0x7b61ff, outcome: 0x3ecf8e, finale: 0xe5484d, news: 0x8892a6 };

export const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || "");

const TONE_STYLE = { honor: ButtonStyle.Success, pragmatic: ButtonStyle.Primary, ruthless: ButtonStyle.Danger };
const TONE_EMOJI = { honor: "🕊️", pragmatic: "🤝", ruthless: "🔥" };

export function dossierEmbed(char, { full = false } = {}) {
  const e = new EmbedBuilder()
    .setColor(COLORS.dossier)
    .setAuthor({ name: "CITIZEN DOSSIER" })
    .setTitle(char.name)
    .setDescription(clip(full ? char.story.join("\n\n") : char.story[0], 4000))
    .addFields(
      { name: "Origin", value: char.origin, inline: true },
      { name: "Crew role", value: char.preferredRole ? `${char.preferredRoleEmoji || CREW_ROLES[char.preferredRole]?.emoji || "⭐"} ${char.preferredRoleLabel || CREW_ROLES[char.preferredRole]?.label || "Custom"}` : "Auto (fits the story)", inline: true },
      { name: "Pronouns", value: char.pronounsLabel || char.pronouns, inline: true },
      { name: "Home", value: char.home, inline: true },
      { name: "Last known location", value: `${char.location || "Unknown"}${char.ship ? `\nShip: ${char.ship}` : ""}`, inline: true },
      { name: "Status", value: { citizen: "UEE citizen", civilian: "UEE civilian (no vote)", none: "Outside UEE law" }[char.citizenship] || char.citizenship, inline: true },
    );
  if (char.seed) e.addFields({ name: "Concept", value: clip(char.seed, 1024) });
  const hooks = char.hooks.map((h) => `${h.status === "open" ? "◻️" : "✅"} ${h.text}`).join("\n");
  if (hooks) e.addFields({ name: "Story hooks", value: clip(hooks, 1024) });
  const conds = (char.conditions || []).filter((c) => c.status === "active");
  if (conds.length) e.addFields({ name: "Condition", value: clip(conds.map((c) => `${{ injury: "🩸", ship: "🚀", legal: "⚖️" }[c.kind] || "📌"} ${c.text}`).join("\n"), 1024) });
  const renown = Object.entries(char.renown || {}).map(([k, v]) => `${k}: ${v}`).join(" · ");
  if (renown) e.addFields({ name: "Renown", value: renown, inline: true });
  if (char.titles?.length) e.addFields({ name: "Titles", value: char.titles.join(", "), inline: true });
  if (char.relationships?.length) e.addFields({ name: "Connections", value: clip(char.relationships.map((r) => `• ${r.name}: ${r.note}`).join("\n"), 1024) });
  return e;
}

export function transmissionEmbed({ from, title, text, color = COLORS.transmission, footer }) {
  const e = new EmbedBuilder().setColor(color).setAuthor({ name: `📡 INCOMING TRANSMISSION · ${from}` }).setDescription(clip(text, 4000));
  if (title) e.setTitle(title);
  if (footer) e.setFooter({ text: footer });
  return e;
}

export function chapterMessage(campaign, chapter) {
  const tx = transmissionEmbed({ from: chapter.transmission.from, title: `${campaign.title}`, text: chapter.transmission.text });
  const brief = new EmbedBuilder()
    .setColor(COLORS.chapter)
    .setTitle(chapter.title)
    .setDescription(clip(chapter.briefing, 2000))
    .addFields(
      ...chapter.objectives.map((o) => ({
        name: `🎮 In-game objective: ${o.characterName}`,
        value: clip(o.flavour ? `${o.text}\n*${o.flavour}*` : o.text, 1024),
      })),
      { name: "🎭 Roleplay prompt", value: clip(chapter.rpPrompt, 1024) },
      { name: "When you're done", value: "Play it out in game, then pick how your crew handled it below. Your choices shape the ending." },
    )
    .setFooter({ text: `Campaign goal: ${clip(campaign.endGoal, 200)}` });
  const row = new ActionRowBuilder().addComponents(
    chapter.choices.map((c, i) =>
      new ButtonBuilder()
        .setCustomId(`ch:${campaign.id}:${chapter.id}:${i}`)
        .setLabel(clip(c.label, 80))
        .setEmoji(TONE_EMOJI[c.tone])
        .setStyle(TONE_STYLE[c.tone]),
    ),
  );
  return { embeds: [tx, brief], components: [row] };
}

// Post to the comms channel (or the current channel), and DM the involved players.
export async function broadcast(interaction, g, { content, embeds, components = [], userIds = [] }) {
  let posted = null;
  const channelId = g.settings.commsChannelId;
  if (channelId) {
    try {
      const channel = await interaction.client.channels.fetch(channelId);
      posted = await channel.send({ content, embeds, components });
    } catch (err) {
      console.warn("[comms] could not post to comms channel:", err.message);
    }
  }
  if (!posted) posted = await interaction.followUp({ content, embeds, components });

  if (g.settings.dmPlayers) {
    for (const userId of new Set(userIds)) {
      try {
        const user = await interaction.client.users.fetch(userId);
        await user.send({ content: `📡 Comms from **${interaction.guild?.name ?? "your server"}**`, embeds });
      } catch {
        // DMs closed — the channel post is enough.
      }
    }
  }
  return posted;
}
