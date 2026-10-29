"""Procedural sci-fi score generator (original, royalty-free).

Usage: score.py <sections.json> <out.wav>

sections.json is a list of {"dur": seconds, "mode": ...}, mode one of:
  playful  light, bouncy plucks in a major key, for banter and comedy
  calm     soft major-seventh pads, for quiet beats
  mystery  dark pad, sparse bells, no drums, for the fixer and reveals
  ambient  neutral minor pad
  tension  pulsing bass, low kick
  action   full drums, driving bass
  outro    resolving progression with arpeggio
Sections share one tempo so they butt together cleanly; transitions get an equal-power
crossfade, and every section is brought to the same loudness so the mix alone sets its level.
"""
import json
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
BPM = 96
BEAT = 60 / BPM
rng = np.random.default_rng(7)  # fixed seed: same score every run


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


PROGRESSIONS = {
    # (root midi, chord intervals) per bar, A minor
    "ambient": [(57, [0, 3, 7, 14]), (53, [0, 4, 7, 14]), (48, [0, 4, 7, 11]), (55, [0, 4, 7, 9])],
    "tension": [(57, [0, 3, 7, 10]), (53, [0, 4, 7, 11]), (50, [0, 3, 7, 10]), (52, [0, 4, 7, 10])],
    "action": [(57, [0, 3, 7, 12]), (53, [0, 4, 7, 12]), (48, [0, 4, 7, 12]), (55, [0, 4, 7, 12])],
    "outro": [(53, [0, 4, 7, 11]), (48, [0, 4, 7, 14]), (55, [0, 2, 7, 12]), (57, [0, 3, 7, 14])],
    # C major I-vi-IV-V
    "playful": [(48, [0, 4, 7, 12]), (57, [0, 3, 7, 12]), (53, [0, 4, 7, 12]), (55, [0, 4, 7, 10])],
    # Fmaj7 - Cmaj9 - Am7 - Gsus
    "calm": [(53, [0, 4, 7, 11]), (48, [0, 4, 7, 14]), (57, [0, 3, 7, 10]), (55, [0, 5, 7, 12])],
    # D minor drone with shifting colour
    "mystery": [(50, [0, 3, 7, 14]), (50, [0, 3, 8, 14]), (46, [0, 4, 7, 14]), (49, [0, 4, 7, 10])],
}
MELODY = {  # scale steps (semitones above the bar's root) the plucks and bells choose from
    "playful": [0, 2, 4, 7, 9, 12, 14],
    "mystery": [0, 3, 7, 10, 14, 15],
    "calm": [0, 4, 7, 11, 14],
}


def saw(freq, n, detune_cents=0.0):
    f = freq * 2 ** (detune_cents / 1200)
    phase = (np.arange(n) * f / SR + rng.random()) % 1.0
    return 2 * phase - 1


def lowpass(x, cutoff, order=2):
    sos = butter(order, min(cutoff, SR / 2 - 100) / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, x)


def highpass(x, cutoff, order=2):
    sos = butter(order, cutoff / (SR / 2), btype="high", output="sos")
    return sosfilt(sos, x)


def envelope(n, attack, release):
    env = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    if a:
        env[:a] = np.linspace(0, 1, a)
    if r:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def pad(root, chord, n, brightness):
    out = np.zeros(n)
    for iv in chord:
        f = hz(root + iv - 12)
        out += saw(f, n, -7) + saw(f, n, 7) + 0.5 * saw(f / 2, n)
    t = np.arange(n) / SR
    sweep = brightness * (1 + 0.35 * np.sin(2 * np.pi * t / (8 * BEAT)))
    # Piecewise filter to fake a slow cutoff sweep.
    seg = SR // 4
    res = np.zeros(n)
    for i in range(0, n, seg):
        res[i : i + seg] = lowpass(out[max(0, i - 2048) : i + seg], sweep[i])[-len(out[i : i + seg]) :]
    return res * envelope(n, 0.8, 1.2) / (len(chord) * 2.5)


def bass(root, n, pulse):
    t = np.arange(n) / SR
    f = hz(root - 24 if root >= 52 else root - 12)  # keep the sub above ~40 Hz
    if not pulse:
        return 0.3 * np.sin(2 * np.pi * f * t) * envelope(n, 0.05, 0.05)
    step = int(BEAT / 2 * SR)
    out = np.zeros(n)
    for i in range(0, n, step):
        m = min(step, n - i)
        tt = np.arange(m) / SR
        out[i : i + m] = (np.sin(2 * np.pi * f * tt) + 0.3 * saw(f * 2, m)) * np.exp(-tt * 9)
    return 0.55 * lowpass(out, 600)


def kick(n):
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def noise_hit(n, decay, hp):
    return highpass(rng.standard_normal(n), hp) * np.exp(-np.arange(n) / SR * decay)


def drums(n, mode):
    out = np.zeros(n)
    beat = int(BEAT * SR)
    k, s, h = kick(beat), noise_hit(beat, 18, 1200), noise_hit(beat // 2, 60, 7000)
    for b in range(0, n // beat + 1):
        i = b * beat
        if mode == "action":
            pattern = [(0, k, 0.9), (beat // 2, h, 0.15)] + ([(0, s, 0.5)] if b % 2 else [])
            if b % 4 == 3:
                pattern.append((beat // 2, k, 0.6))
        elif mode == "tension":
            pattern = [(0, k, 0.6)] if b % 2 == 0 else [(beat // 2, h, 0.08)]
        else:
            pattern = []
        for off, smp, g in pattern:
            j = i + off
            if j < n:
                m = min(len(smp), n - j)
                out[j : j + m] += g * smp[:m]
    return out


def arp(root, chord, n):
    step = int(BEAT / 4 * SR)
    notes = [root + iv + 12 for iv in chord] + [root + chord[1] + 24]
    out = np.zeros(n)
    for k, i in enumerate(range(0, n, step)):
        m = min(step, n - i)
        tt = np.arange(m) / SR
        f = hz(notes[k % len(notes)])
        out[i : i + m] = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14)
    return 0.12 * out


def pluck(freq, n, decay=9.0):
    """Short plucked note: a couple of harmonics with a fast decay."""
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)
    return tone * np.exp(-t * decay) * np.minimum(1, t * 400)


def bell(freq, n):
    """Glassy bell: inharmonic partials, long decay."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, g, d in ((1, 1, 1.6), (2.76, 0.45, 2.4), (5.4, 0.2, 3.5)):
        out += g * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * d)
    return out * np.minimum(1, t * 200)


def tick(n, decay=90):
    return highpass(rng.standard_normal(n), 5000) * np.exp(-np.arange(n) / SR * decay)


def playful_layer(root, n, steps):
    """Bouncy eighth-note plucks with rests, root-fifth bass on the beat, light ticks."""
    out = np.zeros(n)
    eighth = int(BEAT / 2 * SR)
    pattern = [1, 0, 1, 1, 0, 1, 0, 1]  # where a pluck lands within the bar
    for k, i in enumerate(range(0, n, eighth)):
        m = min(int(0.4 * SR), n - i)
        if pattern[k % 8]:
            note = root + 12 + steps[int(rng.integers(len(steps)))]
            out[i : i + m] += 0.22 * pluck(hz(note), m)
        if k % 2 == 0:  # bass on each beat, alternating root and fifth
            b = root - 12 + (7 if (k // 2) % 2 else 0)
            out[i : i + m] += 0.28 * pluck(hz(b), m, decay=6)
        if k % 2 == 1:
            tm = min(eighth, n - i)
            out[i : i + tm] += 0.05 * tick(tm)
    return out


def mystery_layer(root, n, steps):
    """Low drone plus a sparse bell every couple of beats."""
    t = np.arange(n) / SR
    out = 0.18 * np.sin(2 * np.pi * hz(root - 12) * t)
    two_beats = int(2 * BEAT * SR)
    for i in range(0, n, two_beats):
        if rng.random() < 0.6:
            m = min(int(3 * SR), n - i)
            note = root + 12 + steps[int(rng.integers(len(steps)))]
            out[i : i + m] += 0.12 * bell(hz(note), m)
    return out


def calm_layer(root, chord, n):
    """Soft quarter-note arpeggio."""
    out = np.zeros(n)
    q = int(BEAT * SR)
    notes = [root + iv + 12 for iv in chord]
    for k, i in enumerate(range(0, n, q)):
        m = min(int(1.2 * SR), n - i)
        out[i : i + m] += 0.09 * pluck(hz(notes[k % len(notes)]), m, decay=3)
    return out


VARIANT_SHIFT = [0, 5, -3, 2, -5, 3]  # semitones: each repeat of a mood moves to a new key


def render_section(dur, mode, variant=0):
    n = int(dur * SR)
    bar = int(4 * BEAT * SR)
    shift = VARIANT_SHIFT[variant % len(VARIANT_SHIFT)]
    prog = PROGRESSIONS[mode]
    prog = prog[variant % len(prog):] + prog[: variant % len(prog)]  # start somewhere else, too
    prog = [(root + shift, chord) for root, chord in prog]
    tail = int(1.2 * SR)  # pad bars overlap so chords sustain into each other
    music = np.zeros(n + tail)
    pad_gain = {"ambient": 1.0, "tension": 0.8, "action": 0.55, "outro": 0.9,
                "playful": 0.3, "calm": 0.7, "mystery": 0.75}[mode]
    bright = {"ambient": 900, "tension": 1300, "action": 2600, "outro": 1100,
              "playful": 1800, "calm": 1000, "mystery": 600}[mode]
    for bi, i in enumerate(range(0, n, bar)):
        m = min(bar, n - i)
        root, chord = prog[bi % len(prog)]
        music[i : i + m + tail] += pad_gain * highpass(pad(root, chord, m + tail, bright), 140)
        if mode == "playful":
            music[i : i + m] += playful_layer(root, m, MELODY["playful"])
        elif mode == "mystery":
            music[i : i + m] += mystery_layer(root, m, MELODY["mystery"])
        elif mode == "calm":
            music[i : i + m] += calm_layer(root, chord, m)
        else:
            music[i : i + m] += bass(root, m, pulse=mode in ("action", "tension"))
        if mode in ("action", "outro"):
            music[i : i + m] += arp(root, chord, m)
    music = music[:n]
    music += drums(n, mode)
    # Same loudness for every section: the mix, not the score, decides how loud each part is.
    return music / (np.sqrt((music**2).mean()) + 1e-9) * 0.1


def reverb(x, seconds=2.4, mix=0.25):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / seconds))
    ir = lowpass(ir, 5000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return (1 - mix) * x / (np.max(np.abs(x)) + 1e-9) + mix * wet


def main():
    sections = json.load(open(sys.argv[1]))
    xf = int(1.5 * SR)
    out = np.zeros(0)
    for sec in sections:
        part = render_section(sec["dur"] + 1.5, sec["mode"], sec.get("variant", 0))
        if len(out) == 0:
            out = part
            continue
        fade = np.linspace(0, np.pi / 2, xf)
        out[-xf:] = out[-xf:] * np.cos(fade) + part[:xf] * np.sin(fade)
        out = np.concatenate([out, part[xf:]])
    total = int(sum(s["dur"] for s in sections) * SR)
    out = out[:total]
    left = reverb(out, mix=0.28)
    right = reverb(np.roll(out, int(0.011 * SR)), mix=0.32)
    stereo = np.stack([left, right], axis=1)
    stereo *= envelope(len(stereo), 2.0, 4.0)[:, None]
    stereo /= np.max(np.abs(stereo)) + 1e-9
    stereo *= 0.89
    import soundfile as sf

    sf.write(sys.argv[2], stereo.astype(np.float32), SR, subtype="PCM_24")


if __name__ == "__main__":
    main()
