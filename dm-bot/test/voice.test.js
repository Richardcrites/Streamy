import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";
import { createAudioResource } from "@discordjs/voice";
import { speakable, chunk } from "../src/voice.js";

test("markdown, emoji, mentions and links are removed before speaking", () => {
  assert.equal(
    speakable("📡 **Relay:** *Listen up*, <@123> spacers! See https://x.y 🔥\n\n> Move."),
    "Relay: Listen up, spacers! See\nMove.",
  );
});

test("long text is split on sentence boundaries", () => {
  const text = "One sentence here. ".repeat(120);
  const parts = chunk(text, 300);
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(p.length <= 300 && /\.$/.test(p), p);
  assert.equal(parts.join(" ").replace(/\s+/g, " "), text.trim().replace(/\s+/g, " "));
});

test("an mp3 (what the TTS returns) transcodes into Discord voice packets", async () => {
  const mp3 = execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=1", "-f", "mp3", "pipe:1"]);
  const resource = createAudioResource(Readable.from(mp3));
  const packets = [];
  await new Promise((resolve, reject) => {
    resource.playStream.on("data", (p) => packets.push(p));
    resource.playStream.on("end", resolve);
    resource.playStream.on("error", reject);
  });
  assert.ok(packets.length >= 40, `got ${packets.length} opus packets`); // ~50 x 20ms frames per second
});
