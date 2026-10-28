"""Generate the HyperFrames overlay composition for a cut timeline.

Usage: compose.py <project_dir> [--range START,END] [--overlay-only]

Reads <project_dir>/build/timeline.json and writes <project_dir>/hf/index.html, a HyperFrames
composition that plays build/base.mp4 (muted; sound is mixed separately) under titles, act
cards, animated captions, location tags, lower thirds and transmission styling.
--range renders only that slice of the timeline (for quick previews).
--overlay-only leaves the video out and makes the background transparent, for rendering the
overlays as an alpha layer that FFmpeg composites onto the cut (much faster than in-browser video).
"""
import html
import json
import os
import sys

TEMPLATE = os.path.join(os.path.dirname(__file__), "overlay.html")


def phrases(words, max_words=6, max_gap=0.55):
    out, cur = [], []
    for w in words:
        if cur and (len(cur) >= max_words or w["s"] - cur[-1]["e"] > max_gap):
            out.append(cur)
            cur = []
        cur.append(w)
        if w["w"].endswith((".", "?", "!")) and len(cur) >= 3:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    # Fold a short tail ("link.") into the line before it instead of flashing it alone.
    merged = []
    for ph in out:
        if merged and len(ph) <= 2 and len(merged[-1]) + len(ph) <= 8 and ph[0]["s"] - merged[-1][-1]["e"] <= max_gap:
            merged[-1] = merged[-1] + ph
        else:
            merged.append(ph)
    return merged


def main():
    project = sys.argv[1]
    lo, hi = 0.0, None
    if "--range" in sys.argv:
        lo, hi = map(float, sys.argv[sys.argv.index("--range") + 1].split(","))
    tl = json.load(open(os.path.join(project, "build", "timeline.json")))
    hi = tl["duration"] if hi is None else min(hi, tl["duration"])
    dur = round(hi - lo, 3)

    def clip(start, end):
        """Clamp an event to the render window, shifted to window time; None if outside."""
        s, e = max(start, lo), min(end, hi)
        return (round(s - lo, 3), round(e - s, 3)) if e - s > 0.05 else None

    events = []  # (start, dur, kind, data)
    for seg in tl["segments"]:
        span = (seg["start"], seg["end"])
        kind = seg.get("card")
        if kind in ("title", "act", "end"):
            data = {k: seg.get(k, "") for k in ("label", "heading", "sub")}
            c = clip(*span)
            if c:
                events.append((*c, kind, data))
        if seg.get("loc"):
            c = clip(span[0] + 0.3, min(span[1], span[0] + 4.5))
            if c:
                events.append((*c, "loc", {"text": seg["loc"]}))
        if seg.get("tag") == "transmission":
            c = clip(*span)
            if c:
                events.append((*c, "transmission", {}))
        if seg.get("beat"):
            c = clip(span[0] + 0.4, span[1] - 0.2)
            if c:
                events.append((*c, "beat", {"text": seg["beat"]}))
        if seg.get("lower"):
            lw = seg["lower"]
            c = clip(lw["at"] - 0.2, lw["at"] + 3.4)
            if c:
                events.append((*c, "lower", {"kicker": lw["kicker"], "name": lw["name"]}))
        caps = phrases(seg["captions"])
        for i, ph in enumerate(caps):
            start = ph[0]["s"] - 0.12
            end = ph[-1]["e"] + 0.35
            if i + 1 < len(caps):
                end = min(end, caps[i + 1][0]["s"] - 0.12)
            end = min(end, seg["end"])
            c = clip(start, end)
            if c:
                events.append((*c, "cap", {
                    "style": "tx" if seg.get("tag") == "transmission" else "",
                    "words": [{"w": w["w"], "t": round(w["s"] - lo, 3)} for w in ph],
                }))

    events.sort(key=lambda e: e[0])
    body = []
    for n, (start, length, kind, data) in enumerate(events):
        eid = f"e{n}"
        attrs = f'id="{eid}" class="clip ev {kind}" data-start="{start}" data-duration="{length}" data-track-index="{2 + n % 6}"'
        if kind == "cap":
            spans = "".join(f'<span class="w" data-t="{w["t"]}">{html.escape(w["w"])}</span> ' for w in data["words"])
            body.append(f'<div {attrs}><p class="line {data["style"]}">{spans.strip()}</p></div>')
        elif kind == "act":
            body.append(f'<div {attrs}><div class="act-inner"><div class="act-label">{html.escape(data["label"])}</div>'
                        f'<div class="act-rule"></div><h2 class="act-heading">{html.escape(data["heading"])}</h2></div></div>')
        elif kind == "title":
            body.append(f'<div {attrs}><div class="title-inner"><div class="presents">{html.escape(data["label"])}</div>'
                        f'<h1 class="title-main">{html.escape(data["heading"])}</h1><div class="title-sub">{html.escape(data["sub"])}</div></div></div>')
        elif kind == "end":
            body.append(f'<div {attrs}><div class="end-inner"><h2 class="end-heading">{html.escape(data["heading"] or "TO BE CONTINUED")}</h2>'
                        f'<div class="end-sub">{html.escape(data["sub"] or "")}</div>'
                        f'<div class="end-credit">A story told live on twitch.tv/rjreload</div></div></div>')
        elif kind == "loc":
            body.append(f'<div {attrs}><div class="loc-inner"><span class="loc-mark"></span>{html.escape(data["text"])}</div></div>')
        elif kind == "transmission":
            body.append(f'<div {attrs}><div class="tx-inner"><span class="tx-dot"></span>INCOMING TRANSMISSION · ENCRYPTED</div></div>')
        elif kind == "beat":
            body.append(f'<div {attrs}><div class="beat-inner">{html.escape(data["text"])}</div></div>')
        elif kind == "lower":
            body.append(f'<div {attrs}><div class="lower-inner"><div class="lower-kicker">{html.escape(data["kicker"])}</div>'
                        f'<div class="lower-name">{html.escape(data["name"])}</div></div></div>')

    page = open(TEMPLATE).read()
    page = page.replace("__DURATION__", str(dur)).replace("__MEDIA_START__", str(lo))
    if "--overlay-only" in sys.argv:
        start, stop = page.index("<video"), page.index("</video>") + len("</video>")
        page = page[:start] + page[stop:]
        page = page.replace("background: #000; }", "background: transparent; }", 1)
    page = page.replace("<!--EVENTS-->", "\n      ".join(body))
    out_dir = os.path.join(project, "hf")
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, "index.html"), "w").write(page)
    print(f"{len(events)} overlay events, {dur}s")


if __name__ == "__main__":
    main()
