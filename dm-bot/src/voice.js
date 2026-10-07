// The DM's spoken voice. The bot joins the voice channel you're in and reads briefings,
// transmissions, twists and finales aloud. It only speaks; it doesn't listen.
//
// Text-to-speech providers:
//   - ElevenLabs, if ELEVENLABS_API_KEY is set (best quality; ELEVENLABS_VOICE_ID picks the voice)
//   - otherwise Microsoft Edge's free online voices (no key needed; /dm-admin voice-name picks one)

import { Readable } from "node:stream";
import {
  joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, entersState,
  AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior,
} from "@discordjs/voice";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const EDGE_VOICES = {
  "en-US-ChristopherNeural": "Christopher (US, deep and steady)",
  "en-US-GuyNeural": "Guy (US, newsreader)",
  "en-US-EricNeural": "Eric (US, calm)",
  "en-US-RogerNeural": "Roger (US, older)",
  "en-US-SteffanNeural": "Steffan (US, gravelly)",
  "en-GB-RyanNeural": "Ryan (UK, dry)",
  "en-GB-ThomasNeural": "Thomas (UK, formal)",
  "en-AU-WilliamNeural": "William (Australian)",
  "en-US-AriaNeural": "Aria (US, confident)",
  "en-US-JennyNeural": "Jenny (US, warm)",
  "en-GB-SoniaNeural": "Sonia (UK, crisp)",
};
export const DEFAULT_EDGE_VOICE = "en-US-ChristopherNeural";

const IDLE_LEAVE_MS = 15 * 60 * 1000;
const state = new Map(); // guildId -> { player, queue: Promise, lastText, idleTimer }

export const ttsLabel = () => (process.env.ELEVENLABS_API_KEY?.trim() ? "ElevenLabs" : "free Edge voice");

// ── Text → speech ────────────────────────────────────────────────────────────
// Discord markdown, emoji and mentions read badly aloud; strip them.
export function speakable(text) {
  return String(text || "")
    .replace(/<a?:\w+:\d+>/g, "")
    .replace(/<[@#][!&]?\d+>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`~>|#]/g, "")
    .replace(/\p{Extended_Pictographic}|️/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Split into chunks the TTS services handle comfortably, on paragraph/sentence boundaries.
// firstMax: a smaller limit for the very first chunk, so speech starts quickly.
export function chunk(text, max = 900, firstMax = max) {
  const out = [];
  for (const para of text.split(/\n+/)) {
    let current = "";
    for (const sentence of para.match(/[^.!?]+[.!?]*\s*/g) || [para]) {
      const limit = out.length ? max : firstMax;
      if ((current + sentence).length > limit && current) {
        out.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) out.push(current.trim());
  }
  return out;
}

const escapeSsml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function synthEdge(text, voice) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice || DEFAULT_EDGE_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeSsml(text), { rate: "-4%", pitch: "-4%" });
    const parts = [];
    for await (const part of audioStream) parts.push(part);
    return Buffer.concat(parts);
  } finally {
    tts.close?.();
  }
}

async function synthElevenLabs(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "pNInz6obpgDQGcFmaJgB"; // "Adam", a stock deep voice
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY.trim(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function synthesize(text, voice) {
  return process.env.ELEVENLABS_API_KEY?.trim() ? synthElevenLabs(text) : synthEdge(text, voice);
}

// ── Voice channel playback ───────────────────────────────────────────────────
function guildState(guildId) {
  if (!state.has(guildId)) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    player.on("error", (err) => console.warn("[voice] playback error:", err.message));
    state.set(guildId, { player, queue: Promise.resolve(), lastText: null, idleTimer: null });
  }
  return state.get(guildId);
}

export async function join(channel) {
  let connection = getVoiceConnection(channel.guild.id);
  if (!connection || connection.joinConfig.channelId !== channel.id) {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Moved between channels or a brief network blip: wait for it to reconnect.
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
      }
    });
  }
  await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  connection.subscribe(guildState(channel.guild.id).player);
  return connection;
}

export function leave(guildId) {
  const s = state.get(guildId);
  if (s) {
    clearTimeout(s.idleTimer);
    s.player.stop(true);
  }
  getVoiceConnection(guildId)?.destroy();
}

export const isConnected = (guildId) => Boolean(getVoiceConnection(guildId));

// Queue text to be spoken in `channel`. Lines are spoken in order, never over each other.
export function say(channel, text, voice) {
  const s = guildState(channel.guild.id);
  const clean = speakable(text);
  if (!clean) return s.queue;
  s.lastText = clean;
  s.queue = s.queue
    .then(async () => {
      await join(channel);
      clearTimeout(s.idleTimer);
      // Synthesize the next chunk while the current one plays.
      // The first chunk is short, so the DM starts talking within a second or two.
      const parts = chunk(clean, 900, 240);
      const prepare = (i) => {
        const p = synthesize(parts[i], voice);
        p.catch(() => {}); // a failure is handled when it's awaited; never an unhandled rejection
        return p;
      };
      let next = prepare(0);
      for (let i = 0; i < parts.length; i++) {
        const audio = await next;
        if (i + 1 < parts.length) next = prepare(i + 1);
        await playToEnd(s.player, audio);
      }
    })
    .catch((err) => console.warn(`[voice] couldn't speak (${ttsLabel()}):`, err.message))
    .finally(() => {
      clearTimeout(s.idleTimer);
      s.idleTimer = setTimeout(() => leave(channel.guild.id), IDLE_LEAVE_MS);
    });
  return s.queue;
}

// Resolves when the clip has finished (the player goes idle), however short it is.
function playToEnd(player, audio) {
  return new Promise((resolve) => {
    const timeout = setTimeout(done, 10 * 60_000);
    function done() {
      clearTimeout(timeout);
      player.off(AudioPlayerStatus.Idle, done);
      player.off("error", done);
      resolve();
    }
    player.on(AudioPlayerStatus.Idle, done);
    player.on("error", done);
    player.play(createAudioResource(Readable.from(audio)));
  });
}

export const lastSpoken = (guildId) => state.get(guildId)?.lastText || null;

// Speak for an interaction: in the caller's voice channel, or wherever the bot already is.
export function narrate(interaction, g, text) {
  if (g.settings.voice === false) return;
  const channel = interaction.member?.voice?.channel ||
    (isConnected(interaction.guildId) ? interaction.guild.channels.cache.get(getVoiceConnection(interaction.guildId).joinConfig.channelId) : null);
  if (!channel) return;
  say(channel, text, g.settings.voiceName).catch(() => {});
}

// Speak only if the DM is already in a voice channel in this guild (used for scribe confirmations).
export function sayIfConnected(guild, g, text) {
  if (g.settings.voice === false || !guild || !isConnected(guild.id)) return;
  const channel = guild.channels.cache.get(getVoiceConnection(guild.id).joinConfig.channelId);
  if (channel) say(channel, text, g.settings.voiceName).catch(() => {});
}
