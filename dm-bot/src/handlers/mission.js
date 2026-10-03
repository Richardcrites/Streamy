// /mission: a one-shot mission briefing in the DM's voice. The bot posts it once and stays quiet
// while the crew plays it out (in game and in voice chat). Afterwards someone clicks complete or
// failed, the DM reveals the twist and writes an epilogue, and everyone's journal is updated.

import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from "discord.js";
import { DEFAULT_PERSONA } from "../lore/data.js";
import { buildMission, missionEpilogue, snapshot, createdSince, rollbackMission } from "../engine/story.js";
import { narrateMission, narrateMissionEnd } from "../ai.js";
import * as store from "../store.js";
import { broadcast, COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";
import { activeConditions, conditionLine, canonText, archiveMission } from "../engine/records.js";
import { parseAndApply } from "./records.js";

const ephemeral = MessageFlags.Ephemeral;
export const persona = (g) => g.settings.persona || DEFAULT_PERSONA;
const personaName = (g) => persona(g).match(/"([^"]+)"/)?.[1] || "The DM";

export async function start(interaction, g) {
  const lead = store.activeCharacter(g, interaction.user.id);
  if (!lead) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });

  const crew = [lead];
  for (const opt of ["with1", "with2", "with3"]) {
    const user = interaction.options.getUser(opt);
    const c = user && store.activeCharacter(g, user.id);
    if (c && !crew.includes(c)) crew.push(c);
  }
  await interaction.deferReply();
  const { mission, message } = await createMission(g, crew, interaction.options.getString("type"), interaction.user.id);
  await interaction.editReply(message);
  voice.narrate(interaction, g, `${mission.title}. ${mission.briefing} ${mission.crossings.join(" ")} ${mission.stakes}`);
}

async function createMission(g, crew, type, ownerId) {
  g.missions ??= {};
  const snap = snapshot(g);
  const mission = buildMission(g, crew, type);
  mission.requestedType = type || null;
  const ai = await narrateMission({ mission, characters: crew, worldLog: g.worldLog, persona: persona(g), canon: canonText(g) });
  if (ai) {
    mission.title = ai.title;
    mission.briefing = ai.briefing;
    mission.crossings = [ai.crossing];
    mission.stakes = ai.stakes;
    mission.twist = ai.twist;
    ai.objective_flavour.forEach((f, i) => { if (mission.objectives[i]) mission.objectives[i].flavour = f; });
  }
  mission.created = createdSince(g, snap);
  mission.ownerId = ownerId;
  g.missions[mission.id] = mission;
  for (const c of crew) store.addJournal(c, { kind: "mission", text: `Took the job "${mission.title}" from ${personaName(g)}.` });
  store.save();
  return { mission, message: missionMessage(g, mission, crew) };
}

function missionMessage(g, mission, crew) {
  const carrying = crew.flatMap((c) => activeConditions(c).map((x) => `**${c.name}:** ${conditionLine(x)}`));
  const embed = new EmbedBuilder()
    .setColor(COLORS.transmission)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${mission.emoji} ${mission.typeLabel.toUpperCase()} · ${mission.system}` })
    .setTitle(clip(mission.title, 250))
    .setDescription(clip(mission.briefing, 3000))
    .addFields(
      ...(mission.crossings.length ? [{ name: "🧬 How your stories cross", value: clip(mission.crossings.join("\n"), 1024) }] : []),
      ...(mission.anchor ? [{
        name: "🤝 The shared contract",
        value: clip(`Take ${mission.anchor.contract}.\n**In the story:** ${mission.anchor.standIn}\n${mission.anchor.share}`, 1024),
      }] : []),
      ...(mission.rendezvous ? [{ name: "📍 Meet at", value: `${mission.rendezvous}. Party up there before anyone takes the contract.` }] : []),
      {
        name: "🎭 Roles",
        value: clip(mission.objectives.map((o) => `**${o.characterName}:** ${o.text}${o.flavour ? ` *${o.flavour}*` : ""}`).join("\n"), 1024),
      },
      ...(carrying.length ? [{ name: "🩹 Carrying into this job", value: clip(carrying.join("\n"), 1024) }] : []),
      { name: "⚖️ Stakes", value: clip(mission.stakes, 1024) },
      { name: "🎲 If the game fights back", value: clip(mission.rules.map((r) => `• ${r}`).join("\n"), 1024) },
    )
    .setFooter({ text: "No script. Play it in game and in voice, let it happen, then report how it went. Don't like it? Reroll or scrap it." });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ms:${mission.id}:win`).setLabel("Mission complete").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ms:${mission.id}:fail`).setLabel("Mission failed").setEmoji("💀").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ms:${mission.id}:reroll`).setLabel("Reroll").setEmoji("🎲").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ms:${mission.id}:scrap`).setLabel("Scrap").setEmoji("🗑️").setStyle(ButtonStyle.Secondary),
  );
  return { content: `${crew.map((c) => `<@${c.ownerId}>`).join(" ")} you have a job.`, embeds: [embed], components: [row] };
}

// ── Scrap / reroll: undo the mission as if it never happened ──────────────────
async function scrapOrReroll(interaction, g, mission, reroll) {
  await interaction.deferUpdate();
  const crew = mission.characterIds.map((id) => g.characters[id]).filter(Boolean);
  const title = mission.title;
  rollbackMission(g, mission);
  store.save();
  if (!reroll || !crew.length) {
    return interaction.editReply({ content: `🗑️ *"${title}" was scrapped. It never happened.*`, embeds: [], components: [] });
  }
  const { mission: fresh, message } = await createMission(g, crew, mission.requestedType, mission.ownerId);
  await interaction.editReply(message);
  voice.narrate(interaction, g, `Scratch that. ${fresh.title}. ${fresh.briefing}`);
}

export async function cancelLatest(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  const mission = Object.values(g.missions || {})
    .filter((m) => m.status === "active" && char && m.characterIds.includes(char.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!mission) return interaction.reply({ content: "You have no active mission to cancel.", flags: ephemeral });
  rollbackMission(g, mission);
  store.save();
  return interaction.reply({ content: `🗑️ *"${mission.title}" was scrapped. It never happened.* (Its post's buttons won't do anything now.)` });
}

export async function onButton(interaction, g, missionId, result) {
  const mission = g.missions?.[missionId];
  if (!mission || mission.status !== "active") return interaction.reply({ content: "That mission is already over (or was scrapped).", flags: ephemeral });
  const isCrew = mission.characterIds.some((id) => g.characters[id]?.ownerId === interaction.user.id);
  if (!isCrew) return interaction.reply({ content: "Only the crew on this job can report it.", flags: ephemeral });
  if (result === "scrap" || result === "reroll") return scrapOrReroll(interaction, g, mission, result === "reroll");
  await interaction.showModal(
    new ModalBuilder()
      .setCustomId(`msm:${missionId}:${result}`)
      .setTitle(result === "win" ? "Mission complete" : "Mission failed")
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("notes").setLabel("What happened? (the DM uses this)").setStyle(TextInputStyle.Paragraph)
          .setRequired(false).setMaxLength(1000).setPlaceholder("e.g. We spared the pilot, blew the cargo, and RJ shot Pike's lieutenant."),
      )),
  );
}

export async function onReport(interaction, g, missionId, result) {
  const mission = g.missions?.[missionId];
  if (!mission || mission.status !== "active") return interaction.reply({ content: "That mission is already over.", flags: ephemeral });
  await interaction.deferUpdate();
  const success = result === "win";
  const notes = interaction.fields.getTextInputValue("notes")?.trim() || null;
  const crew = mission.characterIds.map((id) => g.characters[id]).filter(Boolean);

  mission.status = success ? "complete" : "failed";
  // The report notes go through the scribe parser too, so injuries and damage are recorded automatically.
  const recorded = notes ? await parseAndApply(g, notes, interaction.user.username, { mission }) : null;
  const ai = await narrateMissionEnd({ mission, success, notes, characters: crew, persona: persona(g) });
  mission.epilogue = ai?.epilogue || missionEpilogue(mission, success);
  mission.notes = notes;

  for (const c of crew) {
    const line = ai?.journal.find((j) => j.name === c.name)?.entry;
    store.addJournal(c, { kind: "mission", text: line || `${success ? "Completed" : "Failed"} "${mission.title}".${notes ? ` ${notes}` : ""}` });
    if (success) c.renown["Jobs done"] = (c.renown["Jobs done"] || 0) + 1;
  }
  store.logWorld(g, `${crew.map((c) => c.name).join(", ")} ${success ? "pulled off" : "failed"} "${mission.title}".`);
  archiveMission(g, mission, crew);
  store.save();

  await interaction.editReply({ components: [] }).catch(() => {});
  const embed = new EmbedBuilder()
    .setColor(success ? COLORS.outcome : COLORS.finale)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${success ? "JOB DONE" : "JOB FAILED"}` })
    .setTitle(clip(mission.title, 250))
    .setDescription(clip(`${mission.epilogue}${notes ? `\n\n**Crew report:** ${notes}` : ""}`, 4000))
    .setFooter({ text: "Archived (/archive) and logged to everyone's journal. Run /mission for the next job." });
  if (recorded?.lines.length) embed.addFields({ name: "📝 Recorded", value: clip(recorded.lines.join("\n"), 1024) });
  voice.narrate(interaction, g, mission.epilogue);
  await broadcast(interaction, g, { embeds: [embed], userIds: [] });
}

// ── /dm-admin persona ────────────────────────────────────────────────────────
export async function editPersona(interaction, g) {
  await interaction.showModal(
    new ModalBuilder().setCustomId("persona").setTitle("The DM's personality").addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("text").setLabel("Who is your DM? Put their name in \"quotes\".")
          .setStyle(TextInputStyle.Paragraph).setMinLength(30).setMaxLength(1500).setRequired(true).setValue(persona(g)),
      ),
    ),
  );
}

export async function savePersona(interaction, g) {
  g.settings.persona = interaction.fields.getTextInputValue("text").trim();
  store.save();
  await interaction.reply({ content: `Saved. Your DM is now **${personaName(g)}**. New missions use this voice.`, flags: ephemeral });
}
