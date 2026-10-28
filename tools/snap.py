"""Move EDL cut points so cuts never clip speech.

Usage: snap.py <edl.json> <name>=<audio16k.wav>,<transcript.jsonl> [...]

The transcript only times when words start, so a hand-picked out-point easily lands while the
last word is still sounding. The transcript does record where the voice-activity detector heard
speech start and stop, and those boundaries are acoustic, so cuts are anchored to them:

  out-point  If the clip's last word ends a run of speech, cut just after that run ends.
             If someone keeps talking, cut as late as possible before their next word.
  in-point   If the clip's first word starts a run of speech, cut just before that run starts.
             Otherwise cut in the quietest gap after the previous word, as late as possible.

The EDL is rewritten in place; the original times are kept as "a_hand" so the change is reviewable.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from words import load_words  # noqa: E402

HOP = 0.01
PAD_AFTER = 0.22   # after the detector says speech stopped
PAD_BEFORE = 0.15  # before the detector says speech started
GAP = 0.07         # never closer than this to a word that isn't in the clip


def envelope(path):
    x, sr = sf.read(path, dtype="float32")
    hop = int(HOP * sr)
    n = len(x) // hop
    frames = x[: n * hop].reshape(n, hop)
    db = 10 * np.log10((frames**2).mean(axis=1) + 1e-10)
    return np.convolve(db, np.ones(6) / 6, mode="same")


def regions(transcript):
    return [(r["start"], r["end"]) for r in map(json.loads, open(transcript))]


def region_of(t, regs):
    for a, b in regs:
        if a - 0.05 <= t <= b:
            return (a, b)
    return None


def quietest_late(env, lo, hi):
    """Latest point in [lo, hi] within 2 dB of the quietest one."""
    i, j = int(lo / HOP), int(hi / HOP)
    if j <= i:
        return round(hi, 2)
    win = env[i:j]
    k = np.where(win <= win.min() + 2.0)[0][-1]
    return round(lo + k * HOP, 2)


def snap_segment(a0, a1, env, words, regs):
    inside = [w for w in words if a0 - 0.05 <= w["s"] < a1 - 0.05]
    if not inside:
        return a0, a1
    first, last = inside[0], inside[-1]
    before = [w for w in words if w["s"] < first["s"]]
    after = [w for w in words if w["s"] > last["s"]]
    prev_w = before[-1] if before else None
    next_w = after[0] if after else None

    r_last = region_of(last["s"], regs)
    if next_w and r_last and region_of(next_w["s"], regs) == r_last:
        out = next_w["s"] - GAP                       # someone keeps talking: stop right before them
    else:
        out = (r_last[1] if r_last else last["s"] + 0.6) + PAD_AFTER
        if next_w:
            out = min(out, next_w["s"] - GAP)
    # The detector can hear laughter or crosstalk as speech and run long; never hang on more than
    # ~0.9 s past where the last word could plausibly have finished.
    letters = sum(c.isalpha() for c in last["w"])
    out = min(out, last["s"] + min(max(0.075 * letters, 0.3), 1.0) + 0.9)
    out = max(out, last["s"] + 0.25)

    r_first = region_of(first["s"], regs)
    if prev_w and r_first and region_of(prev_w["s"], regs) == r_first:
        new_in = quietest_late(env, prev_w["s"] + 0.25, first["s"] - 0.03)
    else:
        new_in = (r_first[0] if r_first else first["s"]) - PAD_BEFORE
        if prev_w:
            prev_r = region_of(prev_w["s"], regs)
            new_in = max(new_in, (prev_r[1] if prev_r else prev_w["s"] + 0.4) + 0.05)
    new_in = min(max(new_in, first["s"] - 0.5), first["s"] - 0.03)
    return round(new_in, 2), round(max(out, new_in + 0.3), 2)


def main():
    edl_path = sys.argv[1]
    sources = {}
    for arg in sys.argv[2:]:
        name, paths = arg.split("=", 1)
        wav, transcript = paths.split(",")
        sources[name] = (envelope(wav), load_words(transcript), regions(transcript))
    default_src = next(iter(sources))
    edl = json.load(open(edl_path))
    for seg in edl["segments"]:
        if "a" not in seg or seg.get("gain", 1) == 0 or seg.get("snap") is False:
            continue  # "snap": false marks a cut placed by hand
        env, words, regs = sources[seg.get("src", default_src)]
        hand = seg.get("a_hand", seg["a"])
        seg["a_hand"] = hand
        seg["a"] = list(snap_segment(hand[0], hand[1], env, words, regs))
        d0, d1 = seg["a"][0] - hand[0], seg["a"][1] - hand[1]
        print(f'{seg["id"]:18s} in {d0:+.2f}s  out {d1:+.2f}s')
    json.dump(edl, open(edl_path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
