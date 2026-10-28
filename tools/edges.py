"""Place cuts from what the recogniser hears right around them in the source.

Usage: edges.py <edl.json> <model_dir> <name>=<audio16k.wav> [...]

Run after snap.py. The speech detector's "speech started" mark lags the real onset of a voice, and
transcript timestamps can miss words, so each cut is re-placed from word onsets recognised in the
source audio around it:
  in   0.25 s before the clip's first word, but no earlier than 0.25 s after the word before it
  out  up to 0.55 s after the clip's last word starts, but always before the next word begins
Cuts are measured from the intended range ("a_hand", recorded on first run), so re-running is safe.
Segments marked "snap": false are left alone. The EDL is rewritten in place.
"""
import json
import sys

import sherpa_onnx
import soundfile as sf

SR = 16000
LEAD = 0.25      # silence kept before a line
TAIL = 0.55      # time allowed for the last word to finish
CLEAR = 0.06     # gap kept before a word that isn't ours
SLACK = 0.2      # timing disagreement allowed between the transcript and this pass


def recogniser(model):
    return sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{model}/encoder.int8.onnx", decoder=f"{model}/decoder.int8.onnx",
        joiner=f"{model}/joiner.int8.onnx", tokens=f"{model}/tokens.txt",
        model_type="nemo_transducer", num_threads=4,
    )


def heard(rec, wav, a, b):
    """Recognised word onsets, and the times of every sounded token piece, in source time."""
    x, _ = sf.read(wav, start=int(max(a, 0) * SR), stop=int(b * SR), dtype="float32")
    s = rec.create_stream()
    s.accept_waveform(SR, x)
    rec.decode_stream(s)
    onsets, pieces = [], []
    for i, (tok, t) in enumerate(zip(s.result.tokens, s.result.timestamps)):
        if not tok.strip(" .,?!-"):
            continue  # punctuation isn't sound
        t = round(max(a, 0) + t, 2)
        pieces.append(t)
        if i == 0 or tok.startswith(" "):
            onsets.append(t)
    return onsets, pieces


def word_onsets(rec, wav, a, b):
    return heard(rec, wav, a, b)[0]


def refine(seg, rec, wav):
    # Always measure from the intended range, so running this again gives the same cuts.
    a0, a1 = seg.setdefault("a_hand", list(seg["a"]))
    # In-point: words heard from 2 s before to 1 s after the current in-point.
    on = word_onsets(rec, wav, a0 - 2.0, a0 + 1.0)
    first = next((t for t in on if t >= a0 - 0.35), None)
    new_in = a0
    if first is not None:
        prev = [t for t in on if t < first - 0.05]
        new_in = first - LEAD
        if prev:
            new_in = max(new_in, prev[-1] + 0.25)
        new_in = min(new_in, first - 0.03)

    # Out-point: words heard from 1.5 s before to 2 s after the current out-point.
    on, pieces = heard(rec, wav, a1 - 1.5, a1 + 2.0)
    # The transcript and this pass can disagree by a few tenths on when a word starts, so a word
    # starting up to SLACK after the intended end still counts as ours, not as the next line.
    ours = [t for t in on if t < a1 + SLACK]
    nxt = next((t for t in on if t >= a1 + SLACK), None)
    new_out = a1
    if ours:
        # Every piece of our last word (up to the next word) must sound before the cut.
        last_piece = max(t for t in pieces if t >= ours[-1] and (nxt is None or t < nxt))
        new_out = max(a1, ours[-1] + TAIL, last_piece + 0.3)
        if nxt is not None:
            new_out = min(new_out, nxt - CLEAR)
    return round(new_in, 2), round(max(new_out, new_in + 0.3), 2)


def main():
    edl_path, model = sys.argv[1:3]
    wavs = dict(arg.split("=", 1) for arg in sys.argv[3:])
    default = next(iter(wavs))
    rec = recogniser(model)
    edl = json.load(open(edl_path))
    for seg in edl["segments"]:
        if "a" not in seg or seg.get("gain", 1) == 0 or seg.get("snap") is False:
            continue
        seg["a"] = list(refine(seg, rec, wavs[seg.get("src", default)]))
        hand = seg["a_hand"]
        print(f'{seg["id"]:18s} in {seg["a"][0] - hand[0]:+.2f}s  out {seg["a"][1] - hand[1]:+.2f}s')
    json.dump(edl, open(edl_path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
