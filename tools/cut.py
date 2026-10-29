"""Cut an EDL out of a long source recording into graded segments, then join them.

Usage: cut.py <project_dir> <name>=<video>,<transcript.jsonl> [<name>=<video>,<transcript.jsonl> ...]

Each EDL segment picks its recording with "src": "<name>" (default: the first one given).

Reads <project_dir>/edl.json and writes into <project_dir>/build/:
  segments/NNN.mkv   graded 1080p30 H.264 + PCM, one per EDL segment
  base.mkv           all segments joined (hard cuts; fades are baked into segments)
  timeline.json      output-time layout: segments, act spans, captions, lower thirds

EDL segment fields:
  a        [in, out] source range for sound (and picture, unless "v" is given)
  v        [[in, out], ...] picture ranges (b-roll); joined with short dissolves
  card     "act" | "end" -> black frame for an overlay card (needs "dur")
  gain     sound gain (default 1)
  fade_in / fade_out   seconds of fade from/to black (picture and sound)
"""
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from words import load_words  # noqa: E402

FPS = 30
SR = 48000
DISSOLVE = 0.5
GRADE = (
    "crop=1920:804:0:138,"
    "eq=gamma=1.18:contrast=1.08:saturation=1.15,"
    "colorbalance=rs=-0.07:bs=0.08:rm=0.02:bm=-0.02:rh=0.07:gh=0.02:bh=-0.06,"
    "curves=master='0/0.01 0.1/0.11 0.4/0.48 0.8/0.87 1/0.97',"
    "vignette=angle=PI/7,"
    "pad=1920:1080:0:138:black"
)
VCODEC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-g", "30", "-bf", "0"]
ACODEC = ["-c:a", "pcm_s16le", "-ar", str(SR), "-ac", "2"]


def seg_duration(seg):
    if "card" in seg and "v" not in seg:
        d = seg["dur"]
    elif "a" in seg:
        d = seg["a"][1] - seg["a"][0]
    else:
        d = sum(b - a for a, b in seg["v"])
    frames = round(d * FPS)
    return frames, frames / FPS


def build_segment(seg, src, out_path, frames):
    dur = frames / FPS
    fi, fo = seg.get("fade_in", 0), seg.get("fade_out", 0)
    gain = seg.get("gain", 1.0)
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    vf_tail = f"fps={FPS},trim=end_frame={frames},setpts=PTS-STARTPTS"
    if fi:
        vf_tail += f",fade=t=in:st=0:d={fi}"
    if fo:
        vf_tail += f",fade=t=out:st={dur - fo:.3f}:d={fo}"
    vf_tail += ",format=yuv420p"

    if "card" in seg and "v" not in seg:
        cmd += ["-f", "lavfi", "-i", f"color=black:s=1920x1080:r={FPS}:d={dur}"]
        cmd += ["-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=stereo"]
        fc = f"[0:v]{vf_tail}[v];[1:a]atrim=end_sample={round(dur * SR)}[a]"
    else:
        ranges = seg.get("v") or [seg["a"]]
        ranges = [list(r) for r in ranges]
        # Dissolves eat (n-1)*DISSOLVE seconds, and the sound may run longer than the picture
        # ranges were sized for; stretch the last shot so the picture always covers the sound.
        need = dur + DISSOLVE * (len(ranges) - 1) + 0.2
        have = sum(b - a for a, b in ranges)
        ranges[-1][1] += max(0.2, need - have)
        for a, b in ranges:
            cmd += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", src]
        a_src = seg.get("a") or seg["v"][0]
        cmd += ["-ss", f"{a_src[0]:.3f}", "-t", f"{dur + 0.5:.3f}", "-i", src]
        n = len(ranges)
        parts = [f"[{i}:v]fps={FPS},{GRADE},settb=AVTB[g{i}]" for i in range(n)]
        last = "g0"
        offset = 0.0
        for i in range(1, n):
            offset += ranges[i - 1][1] - ranges[i - 1][0] - DISSOLVE
            parts.append(f"[{last}][g{i}]xfade=transition=fade:duration={DISSOLVE}:offset={offset:.3f}[x{i}]")
            last = f"x{i}"
        parts.append(f"[{last}]{vf_tail}[v]")
        # Short edge fades even on hard cuts, so a cut over game noise lands softly instead of clicking.
        ai, ao = max(fi, 0.05), max(fo, 0.10)
        afade = f"afade=t=in:d={ai},afade=t=out:st={dur - ao:.3f}:d={ao}"
        parts.append(
            f"[{n}:a]aresample={SR},pan=stereo|c0=c0|c1=c1,volume={gain},"
            f"apad,atrim=end_sample={round(dur * SR)},{afade}[a]"
        )
        fc = ";".join(parts)
    cmd += ["-filter_complex", fc, "-map", "[v]", "-map", "[a]", *VCODEC, *ACODEC, out_path]
    subprocess.run(cmd, check=True)
    return out_path


def build_captions(seg, t0, words, fixes, only_after):
    if "a" not in seg or seg.get("gain", 1) == 0:
        return []
    a0, a1 = seg["a"]
    picked = [w for w in words if a0 <= w["s"] < a1 - 0.05]
    out, prev = [], ""
    for w in picked:
        text = w["w"]
        if text in fixes:
            need = only_after.get(fixes[text])
            if need is None or prev in need:
                text = fixes[text]
        prev = w["w"]
        if not text:  # a fix can drop a misheard word entirely
            continue
        out.append({"w": text, "s": round(t0 + w["s"] - a0, 3), "e": round(t0 + min(w["e"], a1) - a0, 3)})
    if "caption" in seg:
        # Hand-written caption text: keep the transcript's word timing when the word count
        # matches, otherwise spread the words evenly over the spoken part of the clip.
        text = seg["caption"].split()
        if len(text) == len(out):
            out = [dict(w, w=t) for w, t in zip(out, text)]
        else:
            s = out[0]["s"] if out else t0 + 0.1
            e = (out[-1]["e"] if out else t0 + a1 - a0 - 0.3)
            e = max(e, t0 + a1 - a0 - 0.35)
            step = (e - s) / max(len(text), 1)
            out = [{"w": t, "s": round(s + i * step, 3), "e": round(s + (i + 1) * step, 3)} for i, t in enumerate(text)]
    return out


def main():
    project = sys.argv[1]
    sources = {}
    for arg in sys.argv[2:]:
        name, paths = arg.split("=", 1)
        video, transcript = paths.split(",")
        sources[name] = (video, load_words(transcript))
    default_src = next(iter(sources))
    edl = json.load(open(os.path.join(project, "edl.json")))
    build = os.path.join(project, "build")
    os.makedirs(os.path.join(build, "segments"), exist_ok=True)
    captions_on = edl.get("captions", {}).get("enabled", True)
    fixes = edl.get("captions", {}).get("fix", {})
    only_after = edl.get("captions", {}).get("fix_only_after", {})

    jobs, layout, t = [], [], 0.0
    for seg in edl["segments"]:
        frames, dur = seg_duration(seg)
        video, words = sources[seg.get("src", default_src)]
        # Name segments by what they contain, so re-runs only rebuild segments that changed.
        key = json.dumps([seg, video, GRADE, FPS], sort_keys=True)
        path = os.path.join(build, "segments", hashlib.sha1(key.encode()).hexdigest()[:16] + ".mkv")
        jobs.append((seg, path, frames, video))
        entry = {k: v for k, v in seg.items() if k not in ("a", "v")}
        entry.update(start=round(t, 3), end=round(t + dur, 3))
        entry["captions"] = build_captions(seg, t, words, fixes, only_after) if captions_on else []
        entry["speech"] = "a" in seg and seg.get("gain", 1) != 0
        if "lower" in seg:
            entry["lower"] = dict(seg["lower"], at=round(t + seg["lower"]["at"] - seg["a"][0], 3))
        layout.append(entry)
        t += dur

    with ThreadPoolExecutor(max_workers=4) as pool:
        todo, seen = [], set()
        for j in jobs:  # identical segments share one file; build it once
            if not os.path.exists(j[1]) and j[1] not in seen:
                seen.add(j[1])
                todo.append(j)
        for done in pool.map(lambda j: build_segment(j[0], j[3], j[1] + ".tmp.mkv", j[2]), todo):
            os.replace(done, done[: -len(".tmp.mkv")])
            print("built", os.path.basename(done), flush=True)
    print(f"{len(jobs) - len(todo)} segments reused from cache")

    listing = os.path.join(build, "segments.txt")
    with open(listing, "w") as f:
        for _, path, _, _ in jobs:
            f.write(f"file '{os.path.abspath(path)}'\n")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing,
         "-c", "copy", os.path.join(build, "base.mkv")],
        check=True,
    )

    acts = []
    for e in layout:
        if not acts or acts[-1]["act"] != e["act"]:
            acts.append({"act": e["act"], "start": e["start"], "end": e["end"]})
        acts[-1]["end"] = e["end"]
    json.dump({"duration": round(t, 3), "fps": FPS, "segments": layout, "acts": acts},
              open(os.path.join(build, "timeline.json"), "w"), indent=1)
    print(f"total {t:.2f}s ({t / 60:.2f} min), {len(layout)} segments")


if __name__ == "__main__":
    main()
