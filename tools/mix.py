"""Score, mix and master the cut, then mux it with the rendered picture.

Usage: mix.py <project_dir> <rendered_picture.mp4> <final.mp4> [music.wav]

- Score: if no music file is given, tools/score.py composes one whose sections follow the EDL's
  "music" cues (a cue holds until the next one), so the music changes with the story.
- Dialogue: the cut's own sound, levelled so quiet in-game voice chat sits with the streamer's mic.
- Music is sidechain-ducked under dialogue, then everything is mastered to -14 LUFS (YouTube).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def music_sections(timeline):
    sections, mode = [], "ambient"
    for seg in timeline["segments"]:
        mode = seg.get("music", mode)
        dur = seg["end"] - seg["start"]
        if sections and sections[-1]["mode"] == mode:
            sections[-1]["dur"] += dur
        else:
            sections.append({"mode": mode, "dur": dur})
    return sections


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

    graph = (
        # Dialogue: gentle high-pass, level out speakers, then split: one copy feeds the ducker.
        "[0:a]highpass=f=80,dynaudnorm=f=200:g=11:p=0.9:m=8,volume=1.0,asplit=2[dlg][key];"
        # Music: sits ~10 dB under dialogue while anyone talks, rising to ~6 dB under between lines.
        "[1:a]aresample=48000,volume=0.8[mus];"
        "[mus][key]sidechaincompress=threshold=0.05:ratio=4:attack=60:release=650:makeup=1[ducked];"
        "[dlg][ducked]amix=inputs=2:duration=first:normalize=0,"
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
