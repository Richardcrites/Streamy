"""Build an EDL from whole scenes, keeping each scene's natural pacing.

Usage: scenes.py <scenes.json> <transcript.jsonl> <edl.json>

scenes.json holds the episode as an ordered list of entries:
  {"card": ...}                            passed through unchanged (title / act / note / end)
  {"id", "act", "a": [in, out], ...}       a scene: one continuous stretch of the recording
Scenes play as they happened. The only thing removed is dead air: any pause longer than
MAX_PAUSE seconds (no speech heard by the voice detector) is shortened to KEEP_PAUSE, split
evenly either side, so conversations keep their rhythm and jokes keep their beat.
A scene with "v" (b-roll picture) or "keep_pauses": true is never split.
Every other field ("music", "loc", "fade_in", ...) is carried onto the scene's first segment
("fade_out" onto its last).
"""
import json
import sys

MAX_PAUSE = 3.0
KEEP_PAUSE = 1.2


def speech_regions(transcript):
    return [(r["start"], r["end"]) for r in map(json.loads, open(transcript))]


def split(a0, a1, regions):
    """Sub-ranges of [a0, a1] with long pauses squeezed down."""
    inside = [(max(s, a0), min(e, a1)) for s, e in regions if e > a0 and s < a1]
    cuts = []
    prev_end = a0
    for s, e in inside:
        if s - prev_end > MAX_PAUSE:
            cuts.append((prev_end + KEEP_PAUSE / 2, s - KEEP_PAUSE / 2))
        prev_end = max(prev_end, e)
    if a1 - prev_end > MAX_PAUSE:
        cuts.append((prev_end + KEEP_PAUSE / 2, a1))
    pieces, start = [], a0
    for c0, c1 in cuts:
        if c0 - start > 0.3:
            pieces.append([round(start, 2), round(c0, 2)])
        start = c1
    if a1 - start > 0.3:
        pieces.append([round(start, 2), round(a1, 2)])
    return pieces or [[a0, a1]]


def resolve(sc, regions):
    """Scenes may name their first and last spoken line by its start time ("from"/"to", seconds)
    instead of giving "a": pad out from those lines, but never into the lines either side."""
    if "a" in sc or "from" not in sc:
        return
    starts = [s for s, _ in regions]
    i = min(range(len(regions)), key=lambda k: abs(starts[k] - sc["from"]))
    j = min(range(len(regions)), key=lambda k: abs(starts[k] - sc["to"]))
    a0 = regions[i][0] - 0.4
    a1 = regions[j][1] + 0.6
    if i > 0:
        a0 = max(a0, regions[i - 1][1] + 0.1)
    if j + 1 < len(regions):
        a1 = min(a1, regions[j + 1][0] - 0.1)
    sc["a"] = [round(a0, 2), round(a1, 2)]
    del sc["from"], sc["to"]


def main():
    scenes_path, transcript, out_path = sys.argv[1:4]
    spec = json.load(open(scenes_path))
    regions = speech_regions(transcript)
    segments = []
    for sc in spec["scenes"]:
        resolve(sc, regions)
        if "card" in sc or "a" not in sc:
            segments.append(sc)
            continue
        if "v" in sc or sc.get("keep_pauses"):
            pieces = [sc["a"]]
        else:
            pieces = split(sc["a"][0], sc["a"][1], regions)
        carry = {k: v for k, v in sc.items() if k not in ("id", "a", "fade_out", "keep_pauses")}
        for i, p in enumerate(pieces):
            seg = {"id": sc["id"] if len(pieces) == 1 else f'{sc["id"]}-{i + 1}', "a": p, "snap": False}
            if i == 0:
                seg.update(carry)
            else:
                seg.update({k: carry[k] for k in ("act", "src", "gain") if k in carry})
            if i == len(pieces) - 1 and "fade_out" in sc:
                seg["fade_out"] = sc["fade_out"]
            segments.append(seg)
    edl = {k: v for k, v in spec.items() if k != "scenes"}
    edl["segments"] = segments
    json.dump(edl, open(out_path, "w"), indent=1, ensure_ascii=False)
    total = sum(s["a"][1] - s["a"][0] for s in segments if "a" in s and "v" not in s)
    print(f"{len(segments)} segments, ~{total / 60:.1f} min of scene audio")


if __name__ == "__main__":
    main()
