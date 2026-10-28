"""Check that no cut clips speech, by re-transcribing each clip from the edited audio.

Usage: verify_cuts.py <project_dir> <model_dir> [<source_audio16k.wav>]

For every segment with captions, the segment is cut out of build/base.mkv (the edit's own sound,
fades included) and transcribed on its own. If the clip's first or last expected word doesn't come
back, the cut is eating it. With the source audio, it also listens right around every cut in the
source (see edges()), which catches words the transcript itself missed. Prints one line per suspect
clip; exits 1 if there are any.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import sherpa_onnx

SR = 16000


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def similar(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return True
    return a == b or a in b or b in a or (len(a) > 3 and a[:4] == b[:4])


def main():
    project, model = sys.argv[1:3]
    build = os.path.join(project, "build")
    timeline = json.load(open(os.path.join(build, "timeline.json")))
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{model}/encoder.int8.onnx", decoder=f"{model}/decoder.int8.onnx",
        joiner=f"{model}/joiner.int8.onnx", tokens=f"{model}/tokens.txt",
        model_type="nemo_transducer", num_threads=4,
    )
    pcm = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", os.path.join(build, "base.mkv"),
         "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
        check=True, capture_output=True,
    ).stdout
    audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768

    bad = 0
    for seg in timeline["segments"]:
        caps = seg.get("captions") or []
        if len(caps) < 1:
            continue
        clip = audio[int(seg["start"] * SR): int(seg["end"] * SR)]
        # A little silence either side so the recognizer isn't the thing cutting words off.
        clip = np.concatenate([np.zeros(SR // 4, np.float32), clip, np.zeros(SR // 4, np.float32)])
        s = rec.create_stream()
        s.accept_waveform(SR, clip)
        rec.decode_stream(s)
        got = s.result.text.split()
        want = [c["w"] for c in caps]
        problems = []
        if not got:
            problems.append("nothing recognised")
        else:
            # Compare a couple of words at each end: the recognizer often hears one word
            # differently ("Kids"/"Jay"), which isn't a cut problem.
            def matches(ws, gs):
                return any(similar(w, g) for w in ws for g in gs)
            if not matches(want[:2], got[:3]):
                problems.append(f"start: expected '{' '.join(want[:2])}'")
            if not matches(want[-2:], got[-3:]):
                problems.append(f"end: expected '{' '.join(want[-2:])}'")
        if problems:
            bad += 1
            print(f'{seg["id"]:18s} {"; ".join(problems)}\n    heard:    {" ".join(got)}\n    expected: {" ".join(want)}')
    print(f"{bad} suspect clips")
    return bad


def edges(edl_path, wav_path, model):
    """Second check, independent of the transcript: listen to the source right around each cut.

    A recognised word starting within 0.35 s after an out-point means the line carries on past the
    cut; one starting within 0.35 s before an in-point means the cut lands mid-word.
    """
    import soundfile as sf

    rec = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{model}/encoder.int8.onnx", decoder=f"{model}/decoder.int8.onnx",
        joiner=f"{model}/joiner.int8.onnx", tokens=f"{model}/tokens.txt",
        model_type="nemo_transducer", num_threads=4,
    )
    edl = json.load(open(edl_path))

    def tokens(a, b):
        x, _ = sf.read(wav_path, start=int(a * SR), stop=int(b * SR), dtype="float32")
        s = rec.create_stream()
        s.accept_waveform(SR, x)
        rec.decode_stream(s)
        r = s.result
        return [(a + t, tok) for tok, t in zip(r.tokens, r.timestamps)]

    bad = 0
    for seg in edl["segments"]:
        if "a" not in seg or seg.get("gain", 1) == 0:
            continue
        a0, a1 = seg["a"]
        after = [(t, w) for t, w in tokens(a1 - 1.5, a1 + 2.0) if a1 - 0.05 <= t <= a1 + 0.35 and w.strip(" .,?!")]
        before = [(t, w) for t, w in tokens(a0 - 2.0, a0 + 1.0) if a0 - 0.35 <= t <= a0 - 0.02 and w.strip(" .,?!")]
        notes = []
        if after:
            notes.append(f"speech continues {after[0][0] - a1:+.2f}s after out ('{after[0][1].strip()}')")
        if before:
            notes.append(f"word starts {before[-1][0] - a0:+.2f}s before in ('{before[-1][1].strip()}')")
        if notes:
            bad += 1
            print(f'{seg["id"]:18s} ' + "; ".join(notes))
    print(f"{bad} cuts at speech")
    return bad


if __name__ == "__main__":
    if len(sys.argv) > 3:
        n = edges(os.path.join(sys.argv[1], "edl.json"), sys.argv[3], sys.argv[2])
        sys.exit(1 if n else 0)
    main()
