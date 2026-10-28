"""Move EDL cut points onto quiet moments so cuts don't clip speech.

Usage: snap.py <edl.json> <name>=<audio16k.wav>,<transcript.jsonl> [...]

The transcript only times when words start, so a hand-picked out-point easily lands while the
last word is still sounding. For each segment with sound, this moves:
  - the in-point back to the quietest moment before its first word (never into the word before),
  - the out-point forward to the first real dip after its last word (never into the next word).
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


def envelope(path):
    x, sr = sf.read(path, dtype="float32")
    hop = int(HOP * sr)
    n = len(x) // hop
    frames = x[: n * hop].reshape(n, hop)
    db = 10 * np.log10((frames**2).mean(axis=1) + 1e-10)
    # 60 ms smoothing so single clicks don't count as quiet or loud.
    return np.convolve(db, np.ones(6) / 6, mode="same")


def quietest(env, lo, hi, prefer):
    """Time of the quietest point in [lo, hi]; among near-ties take the one nearest `prefer`."""
    i, j = int(lo / HOP), int(hi / HOP)
    if j <= i:
        return prefer
    win = env[i:j]
    floor = win.min()
    close = np.where(win <= floor + 2.0)[0]
    target = (prefer - lo) / HOP
    k = close[np.argmin(np.abs(close - target))]
    return round(lo + k * HOP, 2)


def snap_segment(seg, env, words):
    a0, a1 = seg["a"]
    inside = [w for w in words if a0 - 0.05 <= w["s"] < a1 - 0.05]
    if not inside:
        return a0, a1
    first, last = inside[0], inside[-1]
    before = [w for w in words if w["s"] < first["s"]]
    after = [w for w in words if w["s"] > last["s"]]

    # In: up to 0.6 s before the first word, but after the previous word has finished.
    lo = first["s"] - 0.6
    if before:
        lo = max(lo, before[-1]["s"] + 0.35)
    new_in = quietest(env, lo, first["s"] - 0.03, prefer=first["s"] - 0.08)

    # Out: from where the last word has surely ended (longer words take longer to say), up to
    # 0.9 s past that, stopping short of the next word.
    letters = sum(c.isalpha() for c in last["w"])
    lo = last["s"] + min(max(0.075 * letters, 0.3), 1.0)
    hi = lo + 0.9
    if after:
        hi = min(hi, after[0]["s"] - 0.04)
    new_out = quietest(env, lo, max(hi, lo + 0.05), prefer=lo)
    return new_in, max(new_out, new_in + 0.3)


def main():
    edl_path = sys.argv[1]
    sources = {}
    for arg in sys.argv[2:]:
        name, paths = arg.split("=", 1)
        wav, transcript = paths.split(",")
        sources[name] = (envelope(wav), load_words(transcript))
    default_src = next(iter(sources))
    edl = json.load(open(edl_path))
    for seg in edl["segments"]:
        if "a" not in seg or seg.get("gain", 1) == 0:
            continue
        env, words = sources[seg.get("src", default_src)]
        hand = seg.get("a_hand", seg["a"])
        seg["a_hand"] = hand
        seg["a"] = list(snap_segment(dict(seg, a=hand), env, words))
        d0, d1 = seg["a"][0] - hand[0], seg["a"][1] - hand[1]
        print(f'{seg["id"]:18s} in {d0:+.2f}s  out {d1:+.2f}s')
    json.dump(edl, open(edl_path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
