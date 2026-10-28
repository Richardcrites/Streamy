#!/usr/bin/env bash
# End-to-end smoke test for the video stack: HyperFrames render, Remotion render, and an FFmpeg
# edit pass (crossfade join, music bed, text overlay, loudness normalisation, WebM transcode,
# frame grabs). Run from anywhere: ./video/verify.sh
set -euo pipefail

cd "$(dirname "$0")"
OUT=renders
mkdir -p "$OUT"

step() { printf '\n== %s\n' "$*"; }
probe() { ffprobe -v error -show_entries stream=codec_name,width,height:format=duration -of compact "$1"; }

step "Tool versions"
node --version
ffmpeg -hide_banner -version | head -1
(cd hyperframes && npx hyperframes --version)
echo "remotion $(node -p "require('./remotion/node_modules/remotion/package.json').version")"

step "HyperFrames: check + render"
(cd hyperframes && npm run --silent check && npm run --silent render -- --quiet)
cp hyperframes/renders/streamy-intro.mp4 "$OUT/hyperframes.mp4"
probe "$OUT/hyperframes.mp4"

step "Remotion: typecheck + render"
(cd remotion && npm run --silent typecheck && npx remotion render StreamyIntro renders/streamy-intro.mp4 --log=error)
cp remotion/renders/streamy-intro.mp4 "$OUT/remotion.mp4"
probe "$OUT/remotion.mp4"

step "FFmpeg: crossfade join + music bed + text overlay + loudnorm"
ffmpeg -hide_banner -loglevel error -y \
  -i "$OUT/hyperframes.mp4" -i "$OUT/remotion.mp4" \
  -f lavfi -i "sine=frequency=220:duration=15" \
  -filter_complex "\
    [0:v]fps=30,settb=AVTB,format=yuv420p[a0];[1:v]fps=30,settb=AVTB,format=yuv420p[b0];\
    [a0][b0]xfade=transition=fade:duration=1:offset=7,format=yuv420p,\
    drawtext=text='Streamy stack OK':fontcolor=white:fontsize=36:x=w-tw-48:y=h-th-48[v];\
    [2:a]volume=0.2,afade=t=in:d=1,afade=t=out:st=14:d=1,loudnorm=I=-16:TP=-1.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -preset veryfast -c:a aac -b:a 192k -movflags +faststart \
  "$OUT/edited.mp4"
probe "$OUT/edited.mp4"

step "FFmpeg: WebM (VP9/Opus) transcode"
ffmpeg -hide_banner -loglevel error -y -i "$OUT/edited.mp4" -t 3 \
  -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 -c:a libopus "$OUT/edited.webm"
probe "$OUT/edited.webm"

step "FFmpeg: frame grabs"
for t in 2 6 10 13; do
  ffmpeg -hide_banner -loglevel error -y -ss "$t" -i "$OUT/edited.mp4" -frames:v 1 "$OUT/frame_${t}s.png"
done
ls "$OUT"/frame_*.png

step "All checks passed"
