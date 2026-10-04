// /mission: a one-shot mission briefing in the DM's voice. The bot posts it once and stays quiet
// while the crew plays it out (in game and in voice chat). Afterwards someone clicks complete or
// failed, the DM reveals the twist and writes an epilogue, and everyone's journal is updated.

import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from "discord.js";
import { DEFAULT_PERSONA, CREW_ROLES } from "../lore/data.js";
import { buildMission, missionEpilogue, snapshot, createdSince, rollbackMission, roadRollLabel } from "../engine/story.js";
import { narrateMission, narrateMissionEnd } from "../ai.js";
import * as store from "../store.js";
import { broadcast, COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";
import { activeConditions, conditionLine, canonText, archiveMission, archiveSaga } from "../engine/records.js";
import { parseAndApply } from "./records.js";
import { activeSaga, sagaBeat, sagaForAI, resolveSagaBeat, ensureTidbits, threatBar, leadLines } from "../engine/saga.js";

const ephemeral = MessageFlags.Ephemeral;
// Ten built-in crew roles; past that people share roles.
const MAX_CREW = 10;
export const persona = (g) => g.settings.persona || DEFAULT_PERSONA;
const personaName = (g) => persona(g).match(/"([^"]+)"/)?.[1] || "The DM";

export async function start(interaction, g) {
  const lead = store.activeCharacter(g, interaction.user.id);
  if (!lead) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });

  const crew = [lead];
  const add = (userId) => {
    const c = store.activeCharacter(g, userId);
    if (c && !crew.includes(c) && crew.length < MAX_CREW) crew.push(c);
  };
  for (let i = 1; i <= 7; i++) {
    const user = interaction.options.getUser(`with${i}`);
    if (user) add(user.id);
  }
  // "voice: true" brings everyone in the caller's voice channel who has a character.
  if (interaction.options.getBoolean?.("voice")) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) return interaction.reply({ content: "Join a voice channel first (or leave `voice` off and pick people with `with1`–`with7`).", flags: ephemeral });
    for (const member of channel.members.values()) if (!member.user.bot) add(member.id);
  }
  await interaction.deferReply();
  const { mission, message } = await createMission(g, crew, interaction.options.getString("type"), interaction.user.id);
  await interaction.editReply(message);
  voice.narrate(interaction, g, `${mission.title}. ${mission.briefing} ${mission.crossings.join(" ")} ${mission.stakes}` +
    (mission.stops?.length ? ` And you won't make it in one go. ${mission.stops.map((st, i) => `Stop ${i + 1}: ${st.place}, because ${st.reason}.`).join(" ")}` : ""));
}

async function createMission(g, crew, type, ownerId) {
  g.missions ??= {};
  const snap = snapshot(g);
  // Every job carries the saga forward: the next lead, a counterstrike, or the finale.
  const saga = activeSaga(g);
  const beat = sagaBeat(saga);
  const mission = buildMission(g, crew, type, { play: beat?.play, sagaTitle: saga?.title });
  mission.requestedType = type || null;
  if (saga && beat) {
    for (const c of crew) ensureTidbits(g, saga, c);
    mission.saga = { id: saga.id, title: saga.title, beat };
    mission.sagaNames = [saga.shadow, saga.lieutenant.name, ...(beat.kind === "finale" ? [saga.truename] : [])];
  }
  const ai = await narrateMission({ mission, characters: crew, worldLog: g.worldLog, persona: persona(g), canon: canonText(g), saga: sagaForAI(g, saga, beat, crew) });
  if (ai) {
    // The AI rewrites why each stop happens (more vivid, tied to the story); places and actions stay as rolled.
    if (Array.isArray(ai.stop_reasons) && ai.stop_reasons.length === mission.stops?.length) {
      ai.stop_reasons.forEach((r, i) => {
        const st = mission.stops[i];
        const who = st.forcedBy?.split(/\s+/)[0];
        // A stop forced by damage or injury keeps that reason unless the AI's version still names the character.
        if (r?.trim() && (!who || r.includes(who))) st.reason = r.trim();
      });
    }
    mission.title = ai.title;
    mission.briefing = ai.briefing;
    // The AI's crossing comes first; procedural ties stay for anyone it didn't mention.
    const firstName = (n) => n.replace(/".*?"\s*/, "").split(" ")[0];
    const left = crew.filter((c) => !ai.crossing.includes(firstName(c.name)));
    mission.crossings = [ai.crossing, ...mission.crossings.filter((x) => left.some((c) => x.includes(c.name)))];
    mission.stakes = ai.stakes;
    mission.twist = ai.twist;
    ai.objective_flavour.forEach((f, i) => { if (mission.objectives[i]) mission.objectives[i].flavour = f; });
  }
  if (!ai && mission.saga) {
    const b = mission.saga.beat;
    mission.briefing += b.kind === "finale"
      ? ` This is it. ${b.text}`
      : b.kind === "counterstrike" ? ` ${b.text}`
      : ` And this one matters: it's how you find the next piece of what ${saga.shadow} is hiding. Get to ${b.play.where} and look for ${b.play.find || "anything that doesn't belong"}.`;
  }
  mission.created = createdSince(g, snap);
  for (const o of mission.objectives) {
    const c = g.characters[o.characterId];
    if (c && o.role) (c.roleHistory ??= []).push({ missionId: mission.id, role: o.role });
  }
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
      ...(mission.saga ? [{ name: `🧭 ${mission.saga.title}: ${{ lead: "a lead", counterstrike: "counterstrike", finale: "THE FINALE" }[mission.saga.beat.kind]}`, value: clip(sagaField(g, mission.saga.beat), 1024) }] : []),
      ...splitField("🧬 How your stories cross", mission.crossings),
      ...(mission.anchor ? [{
        name: "🤝 The shared contract",
        value: clip(`Take ${mission.anchor.contract}.\n**In the story:** ${mission.anchor.standIn}\n${mission.anchor.share}`, 1024),
      }] : []),
      ...(mission.rendezvous ? [{ name: "📍 Meet at", value: `${mission.rendezvous}. Party up there before anyone takes the contract.` }] : []),
      ...splitField(`🎭 Crew roles (${mission.objectives.length})`, mission.objectives.map((o) => o.roleLabel
        ? `${o.roleEmoji || CREW_ROLES[o.role]?.emoji || "⭐"} **${o.characterName}: ${o.roleLabel}** (${o.why}). ${o.flavour || o.text}`
        : `**${o.characterName}:** ${o.text}`), mission.objectives.length > 4 ? 300 : 1024),
      ...(mission.stops ? [{
        name: `🛑 Stops on the way · 🎲 d20 rolled ${mission.roadRoll}: ${roadRollLabel(mission.roadRoll)}`,
        value: clip(mission.stops.length
          ? mission.stops.map((st, i) => `**${i + 1}. ${st.place}**${st.forced ? " *(you can't skip this one)*" : ""}\n**Why:** ${st.reason}\n**What:** ${st.action} ${st.need}`).join("\n\n")
          : "No stops. Fly straight there, and enjoy it while it lasts.", 1024),
      }] : []),
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
  return { content: `${crew.map((c) => `<@${c.ownerId}>`).join(" ")} you have a job.`, embeds: fitEmbeds(embed), components: [row] };
}

// Discord caps one embed at 6000 characters and 25 fields. A big crew with AI-written text can pass that,
// so overflow fields move into a follow-on embed instead of the post failing.
const EMBED_BUDGET = 5800;
export function fitEmbeds(embed) {
  const data = embed.toJSON();
  const size = (f) => f.name.length + f.value.length;
  const head = (data.title || "").length + (data.description || "").length + (data.author?.name || "").length + (data.footer?.text || "").length;
  const first = [];
  const rest = [];
  let used = head;
  for (const f of data.fields || []) {
    if (!rest.length && used + size(f) <= EMBED_BUDGET && first.length < 25) {
      first.push(f);
      used += size(f);
    } else rest.push(f);
  }
  if (!rest.length) return [embed];
  const out = [EmbedBuilder.from({ ...data, fields: first, footer: undefined })];
  let cur = [];
  let curSize = 0;
  for (const f of rest) {
    if (cur.length && (curSize + size(f) > EMBED_BUDGET || cur.length === 25)) {
      out.push(new EmbedBuilder().setColor(data.color ?? null).addFields(cur));
      cur = [];
      curSize = 0;
    }
    cur.push(f);
    curSize += size(f);
  }
  out.push(new EmbedBuilder().setColor(data.color ?? null).addFields(cur).setFooter(data.footer));
  return out.slice(0, 10);
}

// Lines spread over as many fields as they need (Discord caps a field at 1024 characters).
// perLine trims each line so a big crew still fits in one message.
function splitField(name, lines, perLine = 1024) {
  const fields = [];
  let cur = [];
  for (const raw of lines.filter(Boolean)) {
    const line = clip(raw, perLine);
    if (cur.length && [...cur, line].join("\n").length > 1024) {
      fields.push(cur);
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length) fields.push(cur);
  return fields.map((f, i) => ({ name: i ? `${name} (cont.)` : name, value: f.join("\n") }));
}

function sagaField(g, beat) {
  const saga = g.saga;
  const why = beat.kind === "finale" ? "Every lead is found. This is where it ends."
    : beat.kind === "counterstrike" ? beat.text
    : `Act ${beat.act + 1}, ${saga.acts[beat.act].name}: ${saga.acts[beat.act].goal}`;
  return [why, ...leadLines(beat.play), `☠️ ${saga.shadow}'s threat: ${threatBar(saga.threat)}`].join("\n");
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
  // The long story moves: a lead found (and maybe a personal secret), threat raised, or the finale's big reveal.
  const saga = mission.saga && g.saga?.id === mission.saga.id && activeSaga(g);
  const sagaOut = saga ? resolveSagaBeat(g, saga, mission.saga.beat, { success, missionTitle: mission.title, chars: crew }) : null;
  if (sagaOut) mission.sagaResult = sagaOut;
  const ai = await narrateMissionEnd({ mission, success, notes, characters: crew, persona: persona(g), sagaResult: sagaOut && sagaSummary(sagaOut) });
  mission.epilogue = ai?.epilogue || missionEpilogue(mission, success);
  mission.notes = notes;

  for (const c of crew) {
    const line = ai?.journal.find((j) => j.name === c.name)?.entry;
    store.addJournal(c, { kind: "mission", text: line || `${success ? "Completed" : "Failed"} "${mission.title}".${notes ? ` ${notes}` : ""}` });
    if (success) c.renown["Jobs done"] = (c.renown["Jobs done"] || 0) + 1;
  }
  store.logWorld(g, `${crew.map((c) => c.name).join(", ")} ${success ? "pulled off" : "failed"} "${mission.title}".`);
  archiveMission(g, mission, crew);
  if (sagaOut?.finale) {
    archiveSaga(g, saga, sagaOut.bond);
    store.logWorld(g, `${saga.title} is over. ${saga.shadow} was ${saga.truename}, and ${crew.map((c) => c.name).join(", ")} ${success ? "brought them down" : "couldn't stop them"}.`);
  }
  store.save();

  await interaction.editReply({ components: [] }).catch(() => {});
  const embed = new EmbedBuilder()
    .setColor(success ? COLORS.outcome : COLORS.finale)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${success ? "JOB DONE" : "JOB FAILED"}` })
    .setTitle(clip(mission.title, 250))
    .setDescription(clip(`${mission.epilogue}${notes ? `\n\n**Crew report:** ${notes}` : ""}`, 4000))
    .setFooter({ text: "Archived (/archive) and logged to everyone's journal. Run /mission for the next job." });
  if (recorded?.lines.length) embed.addFields({ name: "📝 Recorded", value: clip(recorded.lines.join("\n"), 1024) });
  if (sagaOut) embed.addFields(...sagaFields(g, sagaOut));
  voice.narrate(interaction, g, `${mission.epilogue}${sagaOut ? ` ${sagaSpoken(g, sagaOut)}` : ""}`);
  await broadcast(interaction, g, { embeds: [embed], userIds: [] });
}

// ── Saga results, for the AI, the embed and the voice ────────────────────────
const sagaSummary = (o) => ({
  clue_found: o.revealed, act_finished: o.actDone, personal_secret: o.tidbit && `${o.tidbit.character}: ${o.tidbit.text}`,
  threat_now: o.threat, counterstrike: o.counterstrike || undefined, finale: o.finale || undefined, big_reveal: o.bond,
});

export function sagaFields(g, o) {
  const saga = g.saga;
  const fields = [];
  if (o.finale) {
    fields.push({ name: `🧭 ${saga.title}: the end (${saga.outcome})`, value: clip(`**The truth:** ${saga.truth}`, 1024) });
    fields.push({ name: "💥 The big reveal", value: clip(o.bond, 1024) });
    return fields;
  }
  const lines = [];
  if (o.revealed) lines.push(`🔓 **Clue found:** ${o.revealed}`);
  if (o.actDone) lines.push(`🎬 **Act done:** ${o.actDone}. Next: act ${saga.act + 1}, ${saga.acts[saga.act].name}.`);
  if (o.counterstrike) lines.push(o.threat <= 6 ? "🛡️ You held off the counterstrike." : "💔 The counterstrike hit. A lead went cold.");
  if (!o.revealed && !o.counterstrike) lines.push(`${saga.shadow} gained ground.`);
  lines.push(`☠️ Threat: ${threatBar(o.threat)}`);
  fields.push({ name: `🧭 ${saga.title}`, value: clip(lines.join("\n"), 1024) });
  if (o.tidbit) fields.push({ name: `🧩 Something about ${o.tidbit.character}`, value: clip(`${o.tidbit.text}${o.tidbit.bond ? "\n*This one is bigger than one person.*" : ""}`, 1024) });
  return fields;
}

export function sagaSpoken(g, o) {
  if (o.finale) return `And now you know the truth. ${o.bond}`;
  return [o.revealed && `Here's what you found: ${o.revealed}`, o.actDone && `That closes a chapter: ${o.actDone}.`, o.tidbit && `And ${o.tidbit.text}`].filter(Boolean).join(" ");
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
