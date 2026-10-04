// The game feed: each player's DM Link companion posts events from their Game.log to a channel
// through a webhook this bot created. Here we turn those events into records on the player's
// active character: injuries, CrimeStat, location, ship, contracts, the mission field log.

import { MessageFlags, PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import * as store from "../store.js";
import { addCondition, activeConditions, clearCondition } from "../engine/records.js";
import { activeSaga, noteContract, threatBar } from "../engine/saga.js";
import { COLORS, clip } from "../comms.js";
import * as voice from "../voice.js";

const ephemeral = MessageFlags.Ephemeral;
const PREFIX = "DMLINK:";

// ── Setup ────────────────────────────────────────────────────────────────────
export async function setFeedChannel(interaction, g) {
  const channel = interaction.options.getChannel("channel");
  if (channel.type !== ChannelType.GuildText) return interaction.reply({ content: "Pick a text channel.", flags: ephemeral });
  const me = interaction.guild.members.me;
  if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) {
    return interaction.reply({ content: `I need the **Manage Webhooks** permission in <#${channel.id}> to set up the game feed. Give my role that permission (Server Settings → Roles), then try again.`, flags: ephemeral });
  }
  await interaction.deferReply({ flags: ephemeral });
  const moved = Boolean(g.settings.feedWebhookId);
  if (g.settings.feedWebhookId) {
    const old = await interaction.client.fetchWebhook(g.settings.feedWebhookId).catch(() => null);
    await old?.delete("Game feed moved").catch(() => {});
  }
  const hook = await channel.createWebhook({ name: "DM Link", reason: "Game feed for the Star Citizen DM" });
  g.settings.feedChannelId = channel.id;
  g.settings.feedWebhookId = hook.id;
  g.settings.feedWebhookUrl = hook.url;
  store.save();
  const needsIntent = !interaction.client.options.intents.has("MessageContent");
  await interaction.editReply(
    `🛰️ Game feed set up in <#${channel.id}>. Each player now runs \`/link\` to get their code for the DM Link app.` +
      (needsIntent ? "\n⚠️ Also turn on **Message Content Intent** (developer portal → Bot) and restart me, or I can't read the feed." : "") +
      (moved ? "\nThe feed moved, so everyone needs a new code from `/link`." : ""),
  );
}

export async function linkCode(interaction, g) {
  if (!g.settings.feedWebhookUrl) {
    return interaction.reply({ content: "The game feed isn't set up yet. An admin needs to run `/dm-admin game-feed` first.", flags: ephemeral });
  }
  const char = store.activeCharacter(g, interaction.user.id);
  const code = Buffer.from(JSON.stringify({ u: g.settings.feedWebhookUrl, d: interaction.user.id, g: interaction.guildId })).toString("base64url");
  await interaction.reply({
    content:
      `🛰️ **DM Link: connect your game**${char ? ` (events go to **${char.name}**, your active character)` : " (make a character first with `/character create`)"}\n` +
      "1. In the bot's folder, double-click **`link.bat`**. Leave its window open while you play.\n" +
      "2. When it asks, paste this code (it's personal, so don't share it):\n" +
      `\`\`\`\n${code}\n\`\`\`` +
      "3. It finds your Game.log by itself, or asks where Star Citizen is installed.\n" +
      `From then on, contracts, injuries, CrimeStat, locations and ships show up in <#${g.settings.feedChannelId}> and on your character. It only reads the log and never touches the game.`,
    flags: ephemeral,
  });
}

// ── Incoming events ──────────────────────────────────────────────────────────
export function parseFeedMessage(message) {
  const footer = message.embeds?.[0]?.footer?.text || message.embeds?.[0]?.data?.footer?.text;
  if (!footer?.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(footer.slice(PREFIX.length));
    return Array.isArray(data.events) ? data : null;
  } catch {
    return null;
  }
}

const PART_WORDS = ["head", "torso", "left arm", "right arm", "left leg", "right leg"];
const missionFor = (g, char) => Object.values(g.missions || {})
  .filter((m) => m.status === "active" && m.characterIds.includes(char.id))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

// The shared contract counts as taken when an accepted/shared contract's title fits its Contract Manager tab.
const TAB_WORDS = { "Bounty Hunter": /bounty/i, Mercenary: /defend|retake|eliminate|clear|hitter|assault|platform|outpost|bunker|call to arms/i, Investigation: /dossier|investigat|onyx|facility|research/i, Search: /search|missing|locate|find/i, Hauling: /haul|cargo|freight|supply/i, Delivery: /deliver|package|courier/i, ECN: /ecn|emergency/i };
function matchesAnchor(mission, title) {
  const tab = mission?.anchor?.contract?.match(/\*\*([^*]+)\*\*/)?.[1];
  const re = TAB_WORDS[tab] || (/salvage/i.test(mission?.anchor?.contract || "") ? /salvag|wreck|derelict/i : null);
  return Boolean(re && re.test(title));
}

// sagaNotes (optional array): filled with what each contract means for the saga, for the bot to post.
export function applyFeedEvents(g, char, events, sagaNotes = []) {
  const mission = missionFor(g, char);
  const logs = [];
  const saga = activeSaga(g);
  const sagaNote = (title, stage) => {
    if (!saga) return;
    const out = noteContract(g, saga, char, { title, stage });
    if (out.isLead && out.resolved) note(`Found a lead for ${saga.title}: ${out.resolved.revealed}`);
    if (out.tidbit) note(`Learned something about themselves: ${out.tidbit.text}`);
    sagaNotes.push({ title, stage, ...out });
  };
  const note = (text) => {
    store.addJournal(char, { kind: "game", text });
    if (mission) (mission.scribe ??= []).push(`${char.name}: ${text}`);
  };
  for (const e of events) {
    switch (e.type) {
      case "location":
      case "quantum":
        char.location = e.place;
        if (e.type === "quantum") logs.push(`travel → ${e.place}`);
        break;
      case "ship":
        char.ship = e.ship;
        break;
      case "jurisdiction":
        char.jurisdiction = e.name;
        break;
      case "contract_accepted":
      case "contract_shared": {
        note(`${e.type === "contract_shared" ? "Was shared" : "Accepted"} the contract "${e.title}".`);
        if (mission && !mission.anchorTaken && matchesAnchor(mission, e.title)) {
          mission.anchorTaken = { by: char.name, title: e.title, at: e.at };
          note(`That's the shared contract for "${mission.title}".`);
        }
        if (e.type === "contract_accepted") sagaNote(e.title, "accepted");
        break;
      }
      case "contract_complete": note(`Completed the contract "${e.title}".`); sagaNote(e.title, "complete"); break;
      case "contract_withdrawn": note(`Dropped the contract "${e.title}".`); break;
      case "contract_failed": note(`Failed the contract "${e.title}".`); sagaNote(e.title, "failed"); break;
      case "objective": if (mission) (mission.scribe ??= []).push(`${char.name}: objective done: ${e.text}`); break;
      case "crimestat": {
        const cs = activeConditions(char).find((c) => c.kind === "legal" && c.source === "crimestat");
        if (cs) {
          cs.level = (cs.level || 1) + 1;
          cs.text = `CrimeStat raised (${cs.level}× this session)`;
        } else {
          const c = addCondition(char, { kind: "legal", text: "CrimeStat raised", severity: "major", clears: "Pay it off at a security kiosk, hack it clear, or lie low at GrimHEX or Ruin Station." });
          c.source = "crimestat";
          c.level = 1;
          note("Got a CrimeStat. The law is looking for them now.");
        }
        break;
      }
      case "fined": note(`Fined ${e.amount.toLocaleString("en-US")} UEC.`); break;
      case "earned": char.earnedTotal = (char.earnedTotal || 0) + e.amount; break;
      case "injury": {
        const exists = activeConditions(char).some((c) => c.kind === "injury" && c.part === e.part);
        if (!exists) {
          const c = addCondition(char, { kind: "injury", text: `${e.label} injury: ${e.part}`, severity: e.severity, clears: `A med bed (Tier ${e.tier} treatment) or medical gel.` });
          c.part = e.part;
          c.source = "game";
        }
        break;
      }
      case "medbed": {
        const healed = activeConditions(char).filter((c) => c.kind === "injury" && (c.part ? e.parts.includes(c.part) : PART_WORDS.some((p) => e.parts.includes(p) && c.text.toLowerCase().includes(p))));
        for (const c of healed) clearCondition(char, c.id, "med bed surgery");
        if (healed.length) note(`Patched up in a med bed (${healed.map((c) => c.part || c.text).join(", ")}).`);
        break;
      }
      case "downed":
        note("Went down. Emergency services were called. (If they died and regenerated, that's an imprint echo to roleplay.)");
        break;
      default:
        break;
    }
  }
  store.save();
  return logs;
}

export async function onFeedMessage(message, g) {
  const data = parseFeedMessage(message);
  if (!data) return;
  const char = store.activeCharacter(g, data.d);
  if (!char) return message.react("❓").catch(() => {});
  const sagaNotes = [];
  applyFeedEvents(g, char, data.events, sagaNotes);
  await message.react("✅").catch(() => {});
  const embed = sagaNotes.length ? jobEmbed(g, char, sagaNotes) : null;
  if (embed) {
    await message.reply({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
    const spoken = sagaNotes.map(spokenNote).filter(Boolean).join(" ");
    if (spoken) voice.sayIfConnected(message.guild, g, spoken);
  }
}

// ── What a real contract means for the saga ─────────────────────────────────
export function jobEmbed(g, char, notes) {
  const saga = g.saga;
  const lines = notes.flatMap((n) => {
    if (n.stage === "accepted") return [`📄 **${n.title}**: ${n.isLead ? "🧭 " : ""}${n.purpose}`];
    if (n.stage === "failed") return n.isLead ? [`💀 **${n.title}** failed. That was the lead, and ${saga.shadow} noticed. Threat ${threatBar(saga.threat)}`] : [];
    const out = [];
    if (n.resolved) {
      out.push(`🔓 **${n.title}** done. **Clue found:** ${n.resolved.revealed}`);
      if (n.resolved.actDone) out.push(`🎬 Act done: ${n.resolved.actDone}.`);
      out.push(`☠️ Threat ${threatBar(n.resolved.threat)}`);
    } else {
      out.push(`✅ **${n.title}** done. Side job for ${saga.title}.`);
    }
    const tb = n.tidbit || n.resolved?.tidbit;
    if (tb) out.push(`🧩 **Something about ${tb.character}:** ${tb.text}`);
    return out;
  });
  if (!lines.length) return null;
  return new EmbedBuilder().setColor(COLORS.chapter).setAuthor({ name: `🧭 ${saga.title.toUpperCase()} · ${char.name}` }).setDescription(clip(lines.join("\n"), 4000));
}

function spokenNote(n) {
  if (n.stage === "accepted" && n.isLead) return `Good. That contract is the lead. ${n.purpose}`;
  if (n.stage === "complete" && n.resolved) return `That's it. ${n.resolved.revealed}${n.resolved.tidbit ? ` And ${n.resolved.tidbit.text}` : ""}`;
  if (n.stage === "complete" && n.tidbit) return n.tidbit.text;
  return null;
}
