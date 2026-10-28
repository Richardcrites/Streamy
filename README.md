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
