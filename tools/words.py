"""Word-level view of a transcript.jsonl (tokens -> words with start/end).

Usage: words.py <transcript.jsonl> <from_sec> <to_sec>
Library: load_words(path) -> [{"w", "s", "e"}]
"""
import json
import sys


def load_words(path):
    words = []
    for line in open(path):
        seg = json.loads(line)
        toks = seg["tokens"]
        cur = None
        for i, tok in enumerate(toks):
            text, t = tok["w"], tok["t"]
            if text.startswith(" ") or cur is None:
                if cur:
                    words.append(cur)
                cur = {"w": text.strip(), "s": t, "e": t}
            else:
                cur["w"] += text
            nxt = toks[i + 1]["t"] if i + 1 < len(toks) else seg["end"]
            cur["e"] = round(min(nxt, t + 0.6), 2)
        if cur:
            words.append(cur)
    return [w for w in words if w["w"]]


if __name__ == "__main__":
    lo, hi = float(sys.argv[2]), float(sys.argv[3])
    line = []
    for w in load_words(sys.argv[1]):
        if lo <= w["s"] < hi:
            line.append(f'{w["w"]}@{w["s"]:.2f}')
    print(" ".join(line))
