"""Score, mix and master the cut, then mux it with the rendered picture.

Usage: mix.py <project_dir> <rendered_picture.mp4> <final.mp4> [music.wav]

- Score: if no music file is given, tools/score.py composes one whose sections follow the EDL's
  "music" cues (a cue holds until the next one), so the music changes with the story.
- Dialogue: the cut's own sound, levelled so quiet in-game voice chat sits with the streamer's mic.
- Music level is set per segment, not ducked: well under the voices while people talk, a little
  higher in fights, up front on b-roll and cards. Levels ramp smoothly between segments.
  A segment can set "music_level" itself; music "none" silences it.
- Everything is mastered to -14 LUFS (YouTube).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


MIN_SECTION = 8.0  # seconds; only very short cues are folded into their neighbours

# Music level (linear gain on a score normalised to -20 dBFS RMS) under people talking, by mood.
UNDER_DIALOGUE = {"playful": 0.10, "calm": 0.10, "ambient": 0.10, "mystery": 0.13,
                  "tension": 0.12, "action": 0.18, "outro": 0.15, "none": 0.0}
TRANSMISSION = 0.17   # under the fixer's messages (b-roll with a voice)
NO_DIALOGUE = 0.55    # b-roll, title and cards
RAMP = 0.8            # seconds to move between levels


def music_sections(timeline):
    """One score section per music cue. A cue starts a new section even when the mood repeats,
    and repeated moods get a new variant, so no stretch of the score loops the same idea."""
    sections, mode, used = [], "ambient", {}
    for seg in timeline["segments"]:
        cue = seg.get("music")
        dur = seg["end"] - seg["start"]
        if cue is None and sections:
            sections[-1]["dur"] += dur
            continue
        mode = cue or mode
        sections.append({"mode": mode, "dur": dur, "variant": used.get(mode, 0)})
        used[mode] = used.get(mode, 0) + 1
    merged = []
    for sec in sections:
        if merged and (sec["dur"] < MIN_SECTION or merged[-1]["dur"] < MIN_SECTION):
            # Keep the mood of whichever part is longer.
            if sec["dur"] > merged[-1]["dur"]:
                merged[-1]["mode"] = sec["mode"]
            merged[-1]["dur"] += sec["dur"]
        else:
            merged.append(dict(sec))
    return merged


def music_levels(timeline, n, sr):
    """Per-sample gain for the score, following each segment's role and mood."""
    import numpy as np

    rate = 100
    steps = np.zeros(int(timeline["duration"] * rate) + 1)
    mode = "ambient"
    for seg in timeline["segments"]:
        mode = seg.get("music", mode)
        talking = bool(seg.get("captions") or seg.get("speech"))
        if "music_level" in seg:
            level = seg["music_level"]
        elif mode == "none":
            level = 0.0
        elif seg.get("tag") == "transmission":
            level = TRANSMISSION
        elif talking:
            level = UNDER_DIALOGUE.get(mode, 0.1)
        else:
            level = NO_DIALOGUE
        steps[int(seg["start"] * rate): int(seg["end"] * rate) + 1] = level
    k = int(RAMP * rate)
    smooth = np.convolve(np.pad(steps, k, mode="edge"), np.ones(k) / k, mode="same")[k:-k]
    return np.interp(np.arange(n) / sr, np.arange(len(smooth)) / rate, smooth)


def main():
    project, picture, final = sys.argv[1:4]
    build = os.path.join(project, "build")
    timeline = json.load(open(os.path.join(build, "timeline.json")))

    if len(sys.argv) > 4:
        music = sys.argv[4]
    else:
        music = os.path.join(build, "score.wav")
        spec = os.path.join(build, "score_sections.json")
        json.dump(music_sections(timeline), open(spec, "w"), indent=1)
        subprocess.run([sys.executable, "-I", os.path.join(HERE, "score.py"), spec, music], check=True)

    # Apply the level automation to the score.
    import numpy as np
    import soundfile as sf

    score, sr = sf.read(music, dtype="float32", always_2d=True)
    score *= music_levels(timeline, len(score), sr)[:, None].astype(np.float32)
    levelled = os.path.join(build, "score_levelled.wav")
    sf.write(levelled, score, sr, subtype="PCM_24")
    music = levelled

    graph = (
        # Dialogue: gentle high-pass, level out speakers over a ~10 s window (fast leveling pumps the
        # game noise between lines). The score arrives already levelled.
        "[0:a]highpass=f=80,dynaudnorm=f=500:g=21:p=0.9:m=6[dlg];"
        "[1:a]aresample=48000[mus];"
        "[dlg][mus]amix=inputs=2:duration=first:normalize=0,"
        "loudnorm=I=-14:TP=-1.0:LRA=11:linear=false,aresample=48000[out]"
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-i", os.path.join(build, "base.mkv"), "-i", music,
         "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s16le", os.path.join(build, "mix.wav")],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-i", picture, "-i", os.path.join(build, "mix.wav"),
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
         "-shortest", "-movflags", "+faststart", final],
        check=True,
    )
    print("wrote", final)


if __name__ == "__main__":
    main()
