// /saga: the server's long story. Start one, check where it stands, hear the recap, see your own
// secrets, and tell the DM about real contracts so every job you take has a purpose.

import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import * as store from "../store.js";
import { broadcast, COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";
import {
  activeSaga, createSaga, ensureTidbits, nextLead, threatBar, leadLines, sagaRecapText, noteContract, sagaBeat,
} from "../engine/saga.js";
import { jobEmbed } from "./feed.js";
import { archiveSaga } from "../engine/records.js";
import { SIDE_JOBS_PER_TIDBIT } from "../lore/sagas.js";

const ephemeral = MessageFlags.Ephemeral;
const noSaga = "No saga is running. Start one with `/saga start`.";

export async function command(interaction, g, sub) {
  if (sub === "start") return start(interaction, g);
  if (sub === "status") return status(interaction, g);
  if (sub === "recap") return recap(interaction, g);
  if (sub === "secrets") return secrets(interaction, g);
  if (sub === "job") return job(interaction, g);
  if (sub === "end") return end(interaction, g);
}

async function start(interaction, g) {
  if (activeSaga(g)) return interaction.reply({ content: `**${g.saga.title}** is still running. Finish it, or an admin can \`/saga end\` it.`, flags: ephemeral });
  const characters = Object.values(g.characters);
  if (!characters.length) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const saga = createSaga(g, characters, interaction.options.getString("story"));
  g.saga = saga;
  store.logWorld(g, `Something is stirring across ${saga.systems.join(" and ")}. People are starting to say a name: ${saga.shadow}.`);
  store.save();

  const lead = nextLead(saga);
  const embed = new EmbedBuilder()
    .setColor(COLORS.finale)
    .setAuthor({ name: `🧭 A NEW SAGA · SEASON ${saga.season}` })
    .setTitle(saga.title)
    .setDescription(clip(saga.premise, 4000))
    .addFields(
      { name: "How it works", value: "Every `/mission` now carries the saga forward, to a real place in the game. Pull it off and you find a clue; fail and **" + saga.shadow + "** gains ground. Two clues finish an act. After five acts comes the finale, and the truth about how you're all connected.\n\nAny contract you take in game counts too: DM Link notes it automatically, or tell me with `/saga job`." },
      { name: `Act 1: ${saga.acts[0].name}`, value: saga.acts[0].goal },
      { name: "🧭 First lead", value: clip(leadLines(lead).join("\n"), 1024) },
      { name: "🧩 Your own secrets", value: "Every character has secrets tied to this story, hidden in places you can actually go. `/saga secrets` shows what you've found, and where to look next." },
      { name: "☠️ Threat", value: threatBar(saga.threat) },
    );
  if (saga.lieutenant.tiedTo) embed.addFields({ name: "Someone you know", value: `${saga.lieutenant.name}, from ${saga.lieutenant.tiedTo}'s past, is mixed up in this.` });
  await interaction.reply({ embeds: [embed] });
  voice.narrate(interaction, g, `A new story begins. ${saga.title}. ${saga.premise}`);
}

function statusEmbed(g, saga) {
  const lead = nextLead(saga);
  const beat = sagaBeat(saga);
  const found = saga.leads.filter((l) => l.found);
  const acts = saga.acts.map((a, i) => {
    const n = saga.leads.filter((l) => l.act === i && l.found).length;
    const mark = n === 2 ? "✅" : i === saga.act ? "▶️" : "◻️";
    return `${mark} Act ${i + 1}: ${a.name}`;
  });
  const e = new EmbedBuilder()
    .setColor(COLORS.chapter)
    .setAuthor({ name: `🧭 SAGA · SEASON ${saga.season}` })
    .setTitle(saga.title)
    .setDescription(clip(`${saga.premise}\n\n${acts.join("\n")}`, 4000))
    .addFields(
      { name: `🔓 Clues found (${found.length}/${saga.leads.length})`, value: clip(found.map((l) => `• ${l.text}`).join("\n") || "None yet.", 1024) },
      lead
        ? { name: beat.kind === "counterstrike" ? "⚠️ Next mission: counterstrike" : `🧭 Next lead (act ${lead.act + 1}: ${saga.acts[lead.act].name})`, value: clip((beat.kind === "counterstrike" ? leadLines(beat.play) : leadLines(lead)).join("\n"), 1024) }
        : { name: "💥 The finale is ready", value: clip(`${saga.finale}\n${leadLines(saga.finalePlay).join("\n")}`, 1024) },
      { name: `☠️ ${saga.shadow}'s threat`, value: threatBar(saga.threat) },
    );
  const jobs = saga.jobs.filter((j) => j.stage === "complete").slice(-5);
  if (jobs.length) e.addFields({ name: "📄 Recent jobs", value: clip(jobs.map((j) => `${j.isLead ? "🧭" : "•"} ${j.character}: ${j.title}`).join("\n"), 1024) });
  return e;
}

async function status(interaction, g) {
  const saga = activeSaga(g);
  if (!saga) {
    const last = g.sagaHistory?.at(-1);
    return interaction.reply({ content: last ? `${noSaga} Last time: **${last.title}** (${last.outcome}).` : noSaga, flags: ephemeral });
  }
  await interaction.reply({ embeds: [statusEmbed(g, saga)] });
}

async function recap(interaction, g) {
  const saga = activeSaga(g);
  if (!saga) return interaction.reply({ content: noSaga, flags: ephemeral });
  const text = sagaRecapText(saga);
  await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.transmission).setAuthor({ name: "📡 PREVIOUSLY…" }).setTitle(saga.title).setDescription(clip(text, 4000))] });
  voice.narrate(interaction, g, text);
}

async function secrets(interaction, g) {
  const saga = activeSaga(g);
  if (!saga) return interaction.reply({ content: noSaga, flags: ephemeral });
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Create a character first: `/character create`.", flags: ephemeral });
  const list = ensureTidbits(g, saga, char);
  store.save();
  const found = list.filter((t) => t.revealed);
  const next = list.find((t) => !t.revealed);
  const e = new EmbedBuilder()
    .setColor(COLORS.dossier)
    .setAuthor({ name: `🧩 ${saga.title.toUpperCase()}` })
    .setTitle(`What ${char.name} has learned`)
    .setDescription(clip(found.map((t) => `• ${t.text}`).join("\n") || "Nothing yet. But there's something here with your name on it.", 4000))
    .addFields({
      name: "Where to look next",
      value: next
        ? `Something about you is waiting at **${next.find}**. Find leads with your crew, or finish side jobs (any contract): every ${SIDE_JOBS_PER_TIDBIT} side jobs dig something up.`
        : "You've found everything. The rest comes out at the finale.",
    })
    .setFooter({ text: `${found.length}/${list.length} found` });
  await interaction.reply({ embeds: [e], flags: ephemeral });
}

async function job(interaction, g) {
  const saga = activeSaga(g);
  if (!saga) return interaction.reply({ content: noSaga, flags: ephemeral });
  const user = interaction.options.getUser("player") || interaction.user;
  const char = store.activeCharacter(g, user.id);
  if (!char) return interaction.reply({ content: `${user.id === interaction.user.id ? "You have" : `${user.username} has`} no character yet.`, flags: ephemeral });
  const title = interaction.options.getString("contract").trim();
  const stage = interaction.options.getString("stage");
  ensureTidbits(g, saga, char);
  const out = noteContract(g, saga, char, { title, stage });
  store.addJournal(char, { kind: "game", text: `${{ accepted: "Took", complete: "Completed", failed: "Failed" }[stage]} the contract "${title}".` });
  if (out.resolved?.revealed) store.addJournal(char, { kind: "saga", text: `Found a lead for ${saga.title}: ${out.resolved.revealed}` });
  if (out.tidbit || out.resolved?.tidbit) store.addJournal(char, { kind: "saga", text: `Learned something: ${(out.tidbit || out.resolved.tidbit).text}` });
  store.save();
  const embed = jobEmbed(g, char, [{ title, stage, ...out }])
    || new EmbedBuilder().setColor(COLORS.chapter).setDescription(`Noted: **${title}**. It wasn't the lead, so nothing changed.`);
  if (stage === "complete" && !out.isLead && !out.tidbit) {
    embed.setFooter({ text: `Side jobs for ${char.name}: ${out.sideCount}. Every ${SIDE_JOBS_PER_TIDBIT} dig up something about them. The lead is still at ${nextLead(saga)?.where || "the finale"}.` });
  }
  await broadcast(interaction, g, { embeds: [embed], userIds: [] });
  const spoken = out.resolved?.revealed ? `That's it. ${out.resolved.revealed}` : out.tidbit ? out.tidbit.text : stage === "accepted" ? out.purpose : null;
  if (spoken) voice.narrate(interaction, g, spoken);
}

async function end(interaction, g) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: "Only an admin (Manage Server) can end a saga.", flags: ephemeral });
  const saga = activeSaga(g);
  if (!saga) return interaction.reply({ content: noSaga, flags: ephemeral });
  saga.status = "abandoned";
  archiveSaga(g, saga, null);
  g.sagaHistory = [...(g.sagaHistory || []), { id: saga.id, templateId: saga.templateId, title: saga.title, outcome: "abandoned", truename: saga.truename, endedAt: new Date().toISOString() }];
  store.save();
  await interaction.reply({ content: `**${saga.title}** was abandoned. The truth stays buried: ${saga.shadow} was ${saga.truename}. Start a new one with \`/saga start\`.` });
}
