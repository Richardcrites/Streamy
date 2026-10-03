// /mission: a one-shot mission briefing in the DM's voice. The bot posts it once and stays quiet
// while the crew plays it out (in game and in voice chat). Afterwards someone clicks complete or
// failed, the DM reveals the twist and writes an epilogue, and everyone's journal is updated.

import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from "discord.js";
import { DEFAULT_PERSONA } from "../lore/data.js";
import { buildMission, missionEpilogue } from "../engine/story.js";
import { narrateMission, narrateMissionEnd } from "../ai.js";
import * as store from "../store.js";
import { broadcast, COLORS, clip } from "../comms.js";

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

  g.missions ??= {};
  const mission = buildMission(g, crew, interaction.options.getString("type"));
  const ai = await narrateMission({ mission, characters: crew, worldLog: g.worldLog, persona: persona(g) });
  if (ai) {
    mission.title = ai.title;
    mission.briefing = ai.briefing;
    mission.twist = ai.twist;
    mission.opening = ai.opening_scene;
    mission.rpPrompts = ai.rp_prompts;
    ai.objective_flavour.forEach((f, i) => { if (mission.objectives[i]) mission.objectives[i].flavour = f; });
  }
  mission.ownerId = interaction.user.id;
  g.missions[mission.id] = mission;
  for (const c of crew) store.addJournal(c, { kind: "mission", text: `Took the job "${mission.title}" from ${personaName(g)}.` });
  store.save();

  const embed = new EmbedBuilder()
    .setColor(COLORS.transmission)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${mission.emoji} ${mission.typeLabel.toUpperCase()} · ${mission.system}` })
    .setTitle(clip(mission.title, 250))
    .setDescription(clip(mission.briefing, 3000))
    .addFields(
      ...mission.objectives.map((o) => ({
        name: `🎮 ${o.characterName}`,
        value: clip(o.flavour ? `${o.text}\n*${o.flavour}*` : o.text, 1024),
      })),
      { name: "🎬 Opening scene", value: clip(mission.opening, 1024) },
      { name: "🎭 In voice", value: clip(mission.rpPrompts.map((p) => `• ${p}`).join("\n"), 1024) },
    )
    .setFooter({ text: "Play it out in game and in voice. When you're done, report how it went." });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ms:${mission.id}:win`).setLabel("Mission complete").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ms:${mission.id}:fail`).setLabel("Mission failed").setEmoji("💀").setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ content: `${crew.map((c) => `<@${c.ownerId}>`).join(" ")} you have a job.`, embeds: [embed], components: [row] });
}

export async function onButton(interaction, g, missionId, result) {
  const mission = g.missions?.[missionId];
  if (!mission || mission.status !== "active") return interaction.reply({ content: "That mission is already over.", flags: ephemeral });
  const isCrew = mission.characterIds.some((id) => g.characters[id]?.ownerId === interaction.user.id);
  if (!isCrew) return interaction.reply({ content: "Only the crew on this job can report it.", flags: ephemeral });
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
  const ai = await narrateMissionEnd({ mission, success, notes, characters: crew, persona: persona(g) });
  mission.epilogue = ai?.epilogue || missionEpilogue(mission, success);
  mission.notes = notes;

  for (const c of crew) {
    const line = ai?.journal.find((j) => j.name === c.name)?.entry;
    store.addJournal(c, { kind: "mission", text: line || `${success ? "Completed" : "Failed"} "${mission.title}".${notes ? ` ${notes}` : ""}` });
    if (success) c.renown["Jobs done"] = (c.renown["Jobs done"] || 0) + 1;
  }
  store.logWorld(g, `${crew.map((c) => c.name).join(", ")} ${success ? "pulled off" : "failed"} "${mission.title}".`);
  store.save();

  await interaction.editReply({ components: [] }).catch(() => {});
  const embed = new EmbedBuilder()
    .setColor(success ? COLORS.outcome : COLORS.finale)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${success ? "JOB DONE" : "JOB FAILED"}` })
    .setTitle(clip(mission.title, 250))
    .setDescription(clip(`${mission.epilogue}${notes ? `\n\n**Crew report:** ${notes}` : ""}`, 4000))
    .setFooter({ text: "Logged to everyone's journal. Run /mission for the next job." });
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
