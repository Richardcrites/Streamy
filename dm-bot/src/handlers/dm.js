// The DM channel: players report what happened in game ("took the bounty, ship got shot up, landed at
// Ruin"), and the DM narrates what follows, by the rules in lore/dmrules.js. He remembers the recent turns,
// buffs and debuffs (with what you act out and what lifts them), faction and place lockouts, open
// mysteries, and which backstory memories he has already revealed.

import { EmbedBuilder, MessageFlags } from "discord.js";
import * as store from "../store.js";
import { COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";
import { dmTurn, aiEnabled } from "../ai.js";
import { persona } from "./mission.js";
import { addCondition, activeConditions, clearCondition, liftOn, addLockout, liftLockout, activeLockouts, CONDITION_KINDS } from "../engine/records.js";
import { activeSaga, sagaBeat, sagaForAI } from "../engine/saga.js";
import { shortName } from "../engine/story.js";
import { DEBUFFS, BUFFS, RANDOM_EVENTS, NEXT_PROMPTS, LIFT_WORDS } from "../lore/dmrules.js";
import { pick } from "../engine/util.js";

const ephemeral = MessageFlags.Ephemeral;
const personaName = (g) => persona(g).match(/"([^"]+)"/)?.[1] || "The DM";
const LIFT_LABEL = { rest: "Rest", repair: "Repairs", medical: "Medical treatment", job: "Finishing a job", time: "Time" };

// Turns for one character are taken in order, never two at once.
const queues = new Map();
function queued(key, fn) {
  const next = (queues.get(key) || Promise.resolve()).then(fn, fn);
  queues.set(key, next.catch(() => {}));
  return next;
}

// ── Entry points ─────────────────────────────────────────────────────────────
export async function onDmMessage(message, g) {
  const text = message.content?.trim();
  if (!text || text.startsWith("((") || text.startsWith("//")) return;
  const char = store.activeCharacter(g, message.author.id);
  if (!char) return message.reply({ content: "Make a character first with `/character create`, then tell me what happened.", allowedMentions: { repliedUser: false } }).catch(() => {});
  await message.channel.sendTyping().catch(() => {});
  const turn = await queued(char.id, () => takeTurn(g, char, text));
  await message.reply({ embeds: [turn.embed], allowedMentions: { repliedUser: false } }).catch(() => {});
  voice.sayIfConnected(message.guild, g, turn.spoken);
}

// /dm report: the same, for servers where the bot can't read messages.
export async function report(interaction, g) {
  const char = store.activeCharacter(g, interaction.user.id);
  if (!char) return interaction.reply({ content: "Make a character first with `/character create`.", flags: ephemeral });
  const text = interaction.options.getString("what").trim();
  await interaction.deferReply();
  const turn = await queued(char.id, () => takeTurn(g, char, text));
  await interaction.editReply({ content: `> ${clip(text, 300)}`, embeds: [turn.embed] });
  voice.narrate(interaction, g, turn.spoken);
}

// ── One turn ─────────────────────────────────────────────────────────────────
export async function takeTurn(g, char, report) {
  const context = buildContext(g, char);
  let out = aiEnabled() ? await dmTurn({ report, persona: persona(g), character: context.character, context: context.rest }) : null;
  const ai = Boolean(out);
  if (!out) out = builtInTurn(char, report);
  const changes = applyTurn(g, char, report, out);
  store.save();
  return { embed: turnEmbed(g, char, out, changes, ai), spoken: spokenTurn(out), out, changes };
}

function missionFor(g, char) {
  return Object.values(g.missions || {}).filter((m) => m.status === "active" && m.characterIds.includes(char.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

export function buildContext(g, char) {
  const mission = missionFor(g, char);
  const saga = activeSaga(g);
  const people = new Set();
  for (const h of char.hooks || []) if (g.npcs?.[h.npcId]) people.add(g.npcs[h.npcId].name);
  if (mission) for (const n of [...(mission.names || []), ...(mission.sagaNames || [])]) people.add(n);
  if (saga) for (const n of [saga.shadow, saga.lieutenant?.name]) if (n) people.add(n);
  return {
    character: {
      name: char.name, short_name: shortName(char.name), pronouns: char.pronouns, background: char.origin,
      backstory: clip((char.story || []).join("\n\n"), 2500),
      their_own_words: char.writtenStory ? clip(char.writtenStory, 1500) : undefined,
      hooks: (char.hooks || []).filter((h) => h.status === "open").map((h) => h.text),
      memories_already_revealed: (char.memories || []).slice(-10).map((m) => m.text),
      open_threads: (char.threads || []).filter((t) => t.status === "open").map((t) => t.text),
      active_conditions: activeConditions(char).map((c) => ({ id: c.id, kind: c.kind, text: c.text, effect: c.effect, lifts: c.lifts || c.clears })),
      lockouts: activeLockouts(char).map((l) => `${l.kind}: ${l.name}${l.reason ? ` (${l.reason})` : ""}`),
      location: char.location || "unknown", ship: char.ship || "unknown",
    },
    rest: {
      recent_turns: (char.dmLog || []).slice(-8).map((t) => ({ player: t.player, dm: t.dm })),
      known_people: [...people],
      current_mission: mission ? {
        title: mission.title, type: mission.typeLabel, system: mission.system,
        destination: mission.route?.legs.at(-1)?.to, jumps_left: mission.route ? mission.route.legs.length - mission.route.next : undefined,
        crew: mission.characterIds.map((id) => g.characters[id]?.name).filter(Boolean),
      } : null,
      saga: saga ? sagaForAI(g, saga, sagaBeat(saga), [char]) : null,
    },
  };
}

// No AI: a short, honest turn. Lift what the report says was dealt with, and now and then a buff, debuff
// or random event from the tables (all things you act out in game).
export function builtInTurn(char, report, rand = Math.random) {
  const out = { narration: "Logged. Word gets around, and the 'Verse remembers what you do.", next_prompt: pick(NEXT_PROMPTS), buffs_debuffs: [], lifted: [] };
  const r = rand();
  if (r < 0.15) out.buffs_debuffs.push({ kind: "debuff", ...pick(DEBUFFS) });
  else if (r < 0.25) out.buffs_debuffs.push({ kind: "buff", ...pick(BUFFS) });
  if (rand() < 0.2) out.random_event = pick(RANDOM_EVENTS);
  return out;
}

// Never state payouts, even if the AI slips.
const noPay = (s) => String(s || "").replace(/\b\d[\d,.]*\s?(k|m)?\s?a?UEC\b/gi, "a fair price").trim();

export function applyTurn(g, char, report, out) {
  const changes = { added: [], lifted: [], lockouts: [], unlocked: [], threads: [], resolved: [] };
  // Lifts: what the player said they did (rested, repaired, healed, finished a job), and what the DM lifted.
  for (const [event, re] of Object.entries(LIFT_WORDS)) if (re.test(report)) changes.lifted.push(...liftOn(char, event));
  for (const id of out.lifted || []) {
    const c = clearCondition(char, id, "the DM");
    if (c) changes.lifted.push(c);
  }
  for (const b of out.buffs_debuffs || []) {
    if (!b?.text?.trim() || !b?.effect?.trim()) continue; // no in-game effect, no buff
    const c = addCondition(char, { kind: b.kind === "buff" ? "buff" : "debuff", text: b.text, effect: b.effect, lifts: b.lifts, clears: `${LIFT_LABEL[b.lifts] || "Rest, repair or a finished job"} lifts it.` });
    changes.added.push(c);
  }
  for (const f of out.faction_changes || []) {
    if (f.change === "locked") { const l = addLockout(char, { kind: "faction", name: f.name, reason: f.reason }); if (l) changes.lockouts.push(l); }
    else if (liftLockout(char, f.name)) changes.unlocked.push(f.name);
  }
  for (const p of out.place_changes || []) {
    if (p.change === "off_limits") { const l = addLockout(char, { kind: "place", name: p.place, reason: p.reason }); if (l) changes.lockouts.push(l); }
    else if (liftLockout(char, p.place)) changes.unlocked.push(p.place);
  }
  char.threads ??= [];
  for (const t of out.new_threads || []) {
    if (t?.trim() && !char.threads.some((x) => x.text === t.trim())) {
      char.threads.push({ text: t.trim(), since: new Date().toISOString(), status: "open" });
      changes.threads.push(t.trim());
    }
  }
  for (const t of out.resolved_threads || []) {
    const hit = char.threads.find((x) => x.status === "open" && (x.text === t || x.text.toLowerCase().includes(String(t).toLowerCase().slice(0, 30))));
    if (hit) { hit.status = "resolved"; changes.resolved.push(hit.text); }
  }
  const open = char.threads.filter((x) => x.status === "open");
  if (open.length > 12) for (const x of open.slice(0, open.length - 12)) x.status = "faded";
  if (out.flashback?.trim()) (char.memories ??= []).push({ text: out.flashback.trim(), at: new Date().toISOString() });
  if (out.mission_type) char.dmOffer = { type: out.mission_type, where: out.mission_where, why: out.mission_why, armor: out.armor, item: out.item_to_buy, at: new Date().toISOString() };

  out.narration = noPay(out.narration);
  out.intel = noPay(out.intel);
  (char.dmLog ??= []).push({ at: new Date().toISOString(), player: clip(report, 500), dm: clip(out.narration, 800) });
  if (char.dmLog.length > 30) char.dmLog.splice(0, char.dmLog.length - 30);
  store.addJournal(char, { kind: "dm", text: clip(`${report} → ${out.narration}`, 300) });
  if (out.intel?.trim()) store.addJournal(char, { kind: "intel", text: out.intel.trim() });
  return changes;
}

export function turnEmbed(g, char, out, changes, ai) {
  const e = new EmbedBuilder()
    .setColor(COLORS.transmission)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()} · ${char.name}` })
    .setDescription(clip(`${out.narration}${out.random_event ? `\n\n*${out.random_event}*` : ""}\n\n**${out.next_prompt || "What do you do next?"}**`, 4000));
  if (out.flashback) e.addFields({ name: "🧠 A memory", value: clip(out.flashback, 1024) });
  if (out.intel) e.addFields({ name: "📄 Intel", value: clip(out.intel, 1024) });
  if (out.mission_type) {
    e.addFields({
      name: `🎯 A job: ${out.mission_type}`,
      value: clip([
        out.mission_where && `📍 ${out.mission_where}`,
        out.mission_why,
        out.armor && `🛡️ ${out.armor[0].toUpperCase()}${out.armor.slice(1)}`,
        out.item_to_buy && `🛒 Buy first: ${out.item_to_buy}`,
      ].filter(Boolean).join("\n"), 1024),
    });
  }
  const effects = [
    ...changes.added.map((c) => `${CONDITION_KINDS[c.kind].emoji} **${c.text}**: ${c.effect} *(${c.clears})*`),
    ...changes.lifted.map((c) => `✅ ${c.text} is gone.`),
  ];
  if (effects.length) e.addFields({ name: "Effects", value: clip(effects.join("\n"), 1024) });
  const standing = [
    ...changes.lockouts.map((l) => l.kind === "place" ? `🚫 **${l.name}** is off limits now${l.reason ? `: ${l.reason}` : ""}.` : `🚫 **${l.name}** won't offer you work now${l.reason ? `: ${l.reason}` : ""}.`),
    ...changes.unlocked.map((n) => `🔓 ${n} is open to you again.`),
  ];
  if (standing.length) e.addFields({ name: "Consequences", value: clip(standing.join("\n"), 1024) });
  if (changes.threads.length) e.addFields({ name: "🧵 Something to remember", value: clip(changes.threads.join("\n"), 1024) });
  if (!ai && aiEnabled()) e.setFooter({ text: "The AI didn't answer, so this is the built-in DM. Your report is saved." });
  return e;
}

const spokenTurn = (out) => [out.narration, out.random_event, out.flashback, out.mission_type && `There's ${/^[aeiou]/i.test(out.mission_type) ? "an" : "a"} ${out.mission_type} job${out.mission_where ? ` at ${out.mission_where}` : ""}.`, out.next_prompt]
  .filter(Boolean).join(" ").replace(/\*\*/g, "");

// ── /dm-admin dm-channel ─────────────────────────────────────────────────────
export async function setDmChannel(interaction, g) {
  const channel = interaction.options.getChannel("channel");
  g.settings.dmChannelId = channel.id;
  store.save();
  const needsIntent = !interaction.client.options.intents.has("MessageContent");
  return interaction.reply({
    content: `📡 DM channel set to <#${channel.id}>. Players tell the DM what happened in game there, and he narrates what follows.` +
      (needsIntent ? "\n⚠️ One more step: in the Discord developer portal → **Bot**, turn on **Message Content Intent**, then restart the bot. Until then, players can use `/dm report`." : ""),
    flags: ephemeral,
  });
}

// ── /dm threads: what the DM is keeping track of ──────────────────────────────
export async function threads(interaction, g) {
  const user = interaction.options.getUser("player") || interaction.user;
  const char = store.activeCharacter(g, user.id);
  if (!char) return interaction.reply({ content: "No character yet.", flags: ephemeral });
  const open = (char.threads || []).filter((t) => t.status === "open");
  const e = new EmbedBuilder().setColor(COLORS.dossier).setTitle(`What the DM remembers: ${char.name}`)
    .addFields(
      { name: "🧵 Open threads", value: clip(open.map((t) => `• ${t.text}`).join("\n") || "None yet.", 1024) },
      { name: "🧠 Memories revealed", value: clip((char.memories || []).slice(-5).map((m) => `• ${m.text}`).join("\n") || "None yet. They come when the moment fits.", 1024) },
    );
  const locks = activeLockouts(char);
  if (locks.length) e.addFields({ name: "🚫 Lockouts", value: clip(locks.map((l) => `${l.kind === "place" ? "Off limits" : "Won't offer work"}: **${l.name}**${l.reason ? ` (${l.reason})` : ""}`).join("\n"), 1024) });
  const effects = activeConditions(char).filter((c) => c.effect);
  if (effects.length) e.addFields({ name: "Buffs & debuffs", value: clip(effects.map((c) => `${CONDITION_KINDS[c.kind].emoji} **${c.text}**: ${c.effect}`).join("\n"), 1024) });
  if (char.dmOffer) e.addFields({ name: `🎯 Last job offered: ${char.dmOffer.type}`, value: clip([char.dmOffer.where, char.dmOffer.why, char.dmOffer.armor, char.dmOffer.item && `Buy first: ${char.dmOffer.item}`].filter(Boolean).join("\n"), 1024) });
  return interaction.reply({ embeds: [e], flags: ephemeral });
}
