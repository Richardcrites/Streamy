# Video editing stack

Tooling for creating, animating, editing and rendering Streamy videos.

| Folder | Tool | What it's for |
| --- | --- | --- |
| `hyperframes/` | [HyperFrames](https://hyperframes.heygen.com) 0.8.210 + GSAP 3.14.2 | Videos written as HTML/CSS with seekable GSAP timelines |
| `remotion/` | [Remotion](https://www.remotion.dev) 4.0.539 + React 19 | Videos written as React components |
| (system) | FFmpeg 6.1 | Editing, joining, audio mixing, overlays, transcoding |

Requirements: Node.js 22 or newer, and `ffmpeg`/`ffprobe` on `PATH`.

## Setup

```bash
cd hyperframes && npm install && npx hyperframes browser ensure
cd ../remotion && npm install && npx remotion browser ensure
```

`npm install` in `hyperframes/` also copies GSAP into `assets/vendor/`, so compositions render
without reaching a CDN. `npx hyperframes doctor` reports what's missing on a machine.

## Everyday commands

```bash
# HyperFrames
cd hyperframes
npm run dev        # Studio preview in the browser
npm run check      # lint + runtime + layout + contrast checks
npm run snapshot   # PNG frames at 1s, 3s, 5s
npm run render     # -> renders/streamy-intro.mp4

# Remotion
cd remotion
npm run dev        # Remotion Studio
npm run typecheck
npm run still      # -> renders/still.png
npm run render     # -> renders/streamy-intro.mp4
```

## Verifying the whole stack

```bash
./verify.sh
```

This renders both sample compositions, then uses FFmpeg to crossfade them together, add a music
bed and a text overlay, normalise loudness, transcode to WebM and pull frame grabs. Everything
lands in `renders/`.

## When the Chrome download is blocked

Remotion downloads its Chrome Headless Shell from `remotion.media`. If your network blocks
that host, point Remotion at any compatible `chrome-headless-shell` binary, such as the one
HyperFrames downloads:

```bash
export REMOTION_BROWSER_EXECUTABLE=$(ls ~/.cache/hyperframes/chrome/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell)
```

## Optional extras

`npx hyperframes doctor` also lists optional features: `whisper-cpp` for transcription and
captions, Kokoro (`pip install kokoro-onnx soundfile`) for local text-to-speech, and MusicGen for
generated music. Install them only if you need them.

## Turning a stream VOD into an episode

`tools/` holds a pipeline that cuts a long recording into a finished, story-driven episode.
Each episode lives in `projects/<name>/edl.json`, an edit decision list of source time ranges.

```bash
# One-time: Python deps and speech models (models come from GitHub releases)
python3 -m venv ~/venv && ~/venv/bin/pip install -r tools/requirements.txt
mkdir -p ~/models && cd ~/models
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
tar xjf sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2

# 1. Transcribe the VOD (word-level timestamps)
ffmpeg -i vod.mp4 -vn -ac 1 -ar 16000 audio16k.wav
~/venv/bin/python tools/transcribe.py ~/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8 \
  ~/models/silero_vad.onnx audio16k.wav transcript.jsonl

# 2. Find moments: word timings for a range, to set precise cut points
python3 tools/words.py transcript.jsonl 1096 1115

# 3. Render: cut + grade, overlays, score, mix, master
PYTHON=~/venv/bin/python projects/render.sh projects/the-hollows n1=vod.mp4,transcript.jsonl
# -> projects/the-hollows/build/final.mp4
```

What each stage does:

| Tool | Job |
| --- | --- |
| `tools/cut.py` | Frame-accurate cuts from the EDL, one consistent grade with a 2.39:1 matte, J-cut b-roll with dissolves, fades; writes `timeline.json` with captions remapped to output time. Segments are cached by content, so re-runs only rebuild what changed. |
| `tools/compose.py` + `overlay.html` | HyperFrames composition: title, act cards, word-by-word animated captions in the bottom matte, location tags, lower thirds, transmission styling, end card. `--range A,B` previews a slice. |
| `tools/score.py` | Original, royalty-free procedural score whose sections follow the EDL's `music` cues (`ambient`, `tension`, `action`, `outro`). |
| `tools/mix.py` | Levels dialogue, sidechain-ducks the score under it, masters to -14 LUFS, muxes with the picture. Pass a licensed track as the 4th argument to use it instead of the generated score. |

EDL segment fields: `a` (sound range, and picture unless `v` is given), `v` (b-roll picture ranges),
`card` (`title` / `act` / `end`), `label` / `heading` / `sub` (card text), `gain`, `fade_in` / `fade_out`,
`music`, `loc` (location tag), `lower` (name tag), `tag: "transmission"`, `src` (which recording).
`captions.fix` corrects misheard words (game names, call signs).
