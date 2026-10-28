#!/usr/bin/env bash
# Full pipeline for one episode: cut + grade, compose overlays, render, score + mix + master.
# Usage: projects/render.sh <project_dir> <name>=<video>,<transcript.jsonl> [...]
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=$1; shift
PY=${PYTHON:-python3}
HF=$PWD/hyperframes/node_modules/.bin/hyperframes

"$PY" tools/cut.py "$PROJECT" "$@"
mkdir -p "$PROJECT/hf/assets/vendor" "$PROJECT/hf/assets/fonts"
cp hyperframes/node_modules/gsap/dist/gsap.min.js "$PROJECT/hf/assets/vendor/"
cp tools/fonts/*.woff2 "$PROJECT/hf/assets/fonts/"
cp hyperframes/hyperframes.json "$PROJECT/hf/"
ffmpeg -hide_banner -loglevel error -y -i "$PROJECT/build/base.mkv" -map 0:v -c copy -movflags +faststart "$PROJECT/hf/assets/base.mp4"
"$PY" tools/compose.py "$PROJECT"
(cd "$PROJECT/hf" && "$HF" lint >/dev/null && "$HF" render --quality delivery --quiet --output ../build/picture.mp4)
"$PY" tools/mix.py "$PROJECT" "$PROJECT/build/picture.mp4" "$PROJECT/build/final.mp4"
