"""Render only the parts of an episode that carry overlays, and splice them into the cut.

Usage: splice.py <project_dir> <hyperframes_bin> <out_picture.mp4>

Most of a long episode is plain graded footage: rendering all of it through a headless browser
takes hours and tens of GB of frame cache. compose.py --spans lists the stretches that carry any
overlay (title, cards, tags, transmissions); each stretch is rendered on its own, then FFmpeg lays
the rendered stretches over build/base.mkv in one encode. Frame cache is cleared after each render.
"""
import json
import os
import shutil
import subprocess
import sys

FPS = 30
HERE = os.path.dirname(os.path.abspath(__file__))


def frames(t):
    return round(t * FPS) / FPS


def main():
    project, hf_bin, out = sys.argv[1:4]
    build = os.path.join(project, "build")
    spans = json.loads(subprocess.run(
        [sys.executable, "-I", os.path.join(HERE, "compose.py"), project, "--spans"],
        check=True, capture_output=True, text=True).stdout)
    pieces = []
    for i, (a, b) in enumerate(spans):
        a, b = frames(a), frames(b)
        piece = os.path.abspath(os.path.join(build, f"overlay_{i:02d}.mp4"))
        if not os.path.exists(piece):
            subprocess.run([sys.executable, "-I", os.path.join(HERE, "compose.py"), project,
                            "--range", f"{a},{b}"], check=True)
            subprocess.run([hf_bin, "render", "--quality", "delivery", "--quiet", "--output", piece],
                           cwd=os.path.join(project, "hf"), check=True)
            shutil.rmtree("/tmp/hyperframes-extract-cache-0", ignore_errors=True)
            print(f"rendered stretch {i + 1}/{len(spans)}: {a:.1f}-{b:.1f}s", flush=True)
        pieces.append((piece, a, b))

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", os.path.join(build, "base.mkv")]
    for piece, _, _ in pieces:
        cmd += ["-i", piece]
    graph, last = [], "0:v"
    for i, (_, a, b) in enumerate(pieces, start=1):
        graph.append(f"[{i}:v]setpts=PTS+{a}/TB[p{i}]")
        graph.append(f"[{last}][p{i}]overlay=enable='between(t,{a},{b - 0.5 / FPS})':eof_action=pass[v{i}]")
        last = f"v{i}"
    cmd += ["-filter_complex", ";".join(graph), "-map", f"[{last}]", "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    # Leave the full composition in place for previewing.
    subprocess.run([sys.executable, "-I", os.path.join(HERE, "compose.py"), project], check=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
