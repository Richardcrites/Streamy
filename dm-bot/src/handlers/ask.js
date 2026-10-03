// /ask (and "?" in the scribe channel): ask the DM anything. Answers in the persona's voice,
// using the current mission, the crew's conditions, server canon and the contract guide.

import { EmbedBuilder } from "discord.js";
import { CONTRACT_GUIDE, GAME_RULES } from "../lore/data.js";
import { askDM, aiEnabled } from "../ai.js";
import { canonText } from "../engine/records.js";
import * as store from "../store.js";
import { COLORS, clip } from "../comms.js";
import { persona } from "./mission.js";
import * as voice from "../voice.js";

const personaName = (g) => persona(g).match(/"([^"]+)"/)?.[1] || "The DM";

// The mission the asker is on (or the most recent active one on the server).
function currentMission(g, char) {
  const active = Object.values(g.missions || {}).filter((m) => m.status === "active").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return active.find((m) => char && m.characterIds.includes(char.id)) || active[0] || null;
}

// Without AI we can still answer the most common question: which contract fits each objective.
function offlineAnswer(question, mission) {
  if (mission && /contract|mission|take|do we|what do|where/i.test(question)) {
    return "Here's what fits your current job:\n" +
      mission.objectives.map((o) => `• **${o.characterName}** (${o.activity}): ${CONTRACT_GUIDE[o.activity] || "Play it however you like."}`).join("\n");
  }
  return "I can only answer contract questions without an AI key. Add an OpenRouter key to `.env` and I can answer anything.";
}

export async function answer(g, { question, userId, askerName }) {
  const char = store.activeCharacter(g, userId);
  const mission = currentMission(g, char);
  const crew = mission ? mission.characterIds.map((id) => g.characters[id]).filter(Boolean) : char ? [char] : [];
  const text = aiEnabled()
    ? await askDM({
      question,
      persona: persona(g),
      asker: char ? `${askerName} (plays ${char.name})` : askerName,
      mission,
      characters: crew,
      canon: canonText(g),
      guide: CONTRACT_GUIDE,
      rules: GAME_RULES.map((r) => r.text),
    })
    : null;
  return text || offlineAnswer(question, mission);
}

export function answerEmbed(g, question, text) {
  return new EmbedBuilder()
    .setColor(COLORS.transmission)
    .setAuthor({ name: `📡 ${personaName(g).toUpperCase()}` })
    .setDescription(clip(`> ${question}\n\n${text}`, 4000));
}

export async function ask(interaction, g) {
  const question = interaction.options.getString("question");
  await interaction.deferReply();
  const text = await answer(g, { question, userId: interaction.user.id, askerName: interaction.member?.displayName ?? interaction.user.username });
  await interaction.editReply({ embeds: [answerEmbed(g, question, text)] });
  voice.narrate(interaction, g, text);
}
