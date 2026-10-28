"""Transcribe a 16 kHz mono WAV with Silero VAD + Parakeet TDT (sherpa-onnx).

Usage: transcribe.py <model_dir> <vad.onnx> <audio.wav> <out.jsonl>
Writes one JSON line per speech segment: {start, end, text, words:[{w,t}]}.
Resumable: skips segments that end before the last one already written.
"""
import json
import os
import sys
import time

import numpy as np
import sherpa_onnx
import soundfile as sf

model_dir, vad_path, wav_path, out_path = sys.argv[1:5]
SR = 16000

rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{model_dir}/encoder.int8.onnx",
    decoder=f"{model_dir}/decoder.int8.onnx",
    joiner=f"{model_dir}/joiner.int8.onnx",
    tokens=f"{model_dir}/tokens.txt",
    model_type="nemo_transducer",
    num_threads=4,
)

cfg = sherpa_onnx.VadModelConfig()
cfg.silero_vad.model = vad_path
cfg.silero_vad.min_silence_duration = 0.4
cfg.silero_vad.min_speech_duration = 0.25
cfg.silero_vad.max_speech_duration = 20
cfg.sample_rate = SR
vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=60)

resume_after = 0.0
if os.path.exists(out_path):
    with open(out_path) as f:
        for line in f:
            resume_after = max(resume_after, json.loads(line)["end"])

out = open(out_path, "a")
info = sf.info(wav_path)
total = info.frames / SR
t0 = time.time()


def flush():
    while not vad.empty():
        seg = vad.front
        start = seg.start / SR
        samples = np.asarray(seg.samples, dtype=np.float32)
        end = start + len(samples) / SR
        vad.pop()
        if end <= resume_after:
            continue
        s = rec.create_stream()
        s.accept_waveform(SR, samples)
        rec.decode_stream(s)
        r = s.result
        text = r.text.strip()
        if not text:
            continue
        words = [{"w": tok, "t": round(start + ts, 2)} for tok, ts in zip(r.tokens, r.timestamps)]
        out.write(json.dumps({"start": round(start, 2), "end": round(end, 2), "text": text, "tokens": words}) + "\n")
        out.flush()


window = 512
pos = 0
carry = np.zeros(0, dtype=np.float32)
for block in sf.blocks(wav_path, blocksize=SR * 30, dtype="float32"):
    # Feed the VAD whole 512-sample windows and carry any remainder into the next block:
    # dropping it would shift every later timestamp earlier (16 ms per 30 s block).
    block = np.concatenate([carry, block])
    usable = len(block) - len(block) % window
    for i in range(0, usable, window):
        vad.accept_waveform(block[i : i + window])
    carry = block[usable:]
    pos += usable
    flush()
    if (pos // (SR * 30)) % 20 == 0:
        el = time.time() - t0
        print(f"{pos / SR / 60:.1f}/{total / 60:.1f} min, {el / 60:.1f} min elapsed", flush=True)
vad.flush()
flush()
print("done", flush=True)
