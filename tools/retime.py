"""Re-anchor an EDL's sound ranges to a new transcript of the same recording, by matching words.

Usage: retime.py <edl.json> <old_transcript.jsonl> <new_transcript.jsonl>

Each segment's range is read against the old transcript to get the line it was meant to hold
(its first and last words). The same words are then found in the new transcript near the
expected time, and the range is reset to span them. Run snap.py afterwards to place the cuts.
Segments whose words can't be found are left alone and reported.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from words import load_words  # noqa: E402


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def drift_fix(t):
    """Old transcripts dropped 256 samples per 30 s block; map an old time to true time."""
    return t + int(t * 16000 // 479744) * 256 / 16000


def find(word, near, new, window=1.5):
    cands = [w for w in new if abs(w["s"] - near) <= window and norm(w["w"]) == norm(word["w"])]
    return min(cands, key=lambda w: abs(w["s"] - near)) if cands else None


def main():
    edl_path, old_path, new_path = sys.argv[1:4]
    old, new = load_words(old_path), load_words(new_path)
    edl = json.load(open(edl_path))
    for seg in edl["segments"]:
        if "a" not in seg:
            continue
        hand = seg.pop("a_hand", seg["a"])
        seg["a"] = hand
        inside = [w for w in old if hand[0] - 0.05 <= w["s"] < hand[1] - 0.05]
        if not inside:
            print(f'{seg["id"]:18s} no words, kept')
            continue
        f = find(inside[0], drift_fix(inside[0]["s"]), new)
        l = find(inside[-1], drift_fix(inside[-1]["s"]), new)
        if not f or not l or l["s"] < f["s"]:
            # Fall back to the timing correction alone.
            seg["a"] = [round(drift_fix(hand[0]), 2), round(drift_fix(hand[1]), 2)]
            print(f'{seg["id"]:18s} words not matched, time-corrected only')
            continue
        seg["a"] = [round(f["s"] - 0.05, 2), round(l["s"] + 0.3, 2)]
    json.dump(edl, open(edl_path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
