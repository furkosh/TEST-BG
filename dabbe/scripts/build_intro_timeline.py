"""Timeline for the 12 s intro: one narrated sentence about Dâbbetü'l-Arz, word-by-word subtitles."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR, OFF = 12.0, 0.8
W = [["Dâbbetü'l-Arz…", 0.24, 1.84], ["İslam", 2.16, 2.48], ["inancında", 2.56, 3.2], ["kıyamet", 3.28, 3.6], ["alametlerinden", 3.68, 4.56],
     ["biri", 4.64, 4.8], ["olarak", 4.88, 5.12], ["kabul", 5.2, 5.44], ["edilen", 5.52, 6.16], ["ve", 6.24, 6.32], ["yerden", 6.4, 6.8],
     ["çıkacağı", 6.84, 7.2], ["bildirilen", 7.28, 7.76], ["canlıyı", 7.84, 8.24], ["ifade", 8.36, 8.64], ["eder.", 8.72, 9.28]]
RED = {"dâbbetülarz", "kıyamet", "yerden", "canlıyı"}
norm = lambda w: re.sub(r"[^\wçğıöşüâî]", "", w.lower())
words = [{"text": t, "start": round(OFF + s, 3), "end": round(OFF + e, 3), "clip": "intro", "red": norm(t) in RED, "creature": False} for t, s, e in W]
for i, w in enumerate(words):
    nxt = words[i + 1]["start"] if i + 1 < len(words) else DUR
    w["show_until"] = round(min(nxt, w["end"] + 0.45), 3)
EV = {"name": OFF + 0.24, "card": OFF + 2.0, "tremor": OFF + 5.2, "crack": OFF + 6.4, "eyes": OFF + 7.84, "shake": 10.2, "black": 10.75, "title": [10.95, 11.85]}
tl = {"duration": DUR, "fps": 24, "voice": {"file": "audio/raw/intro.mp3", "start": OFF}, "events": EV, "words": words}
json.dump(tl, open(os.path.join(ROOT, "data", "timeline_intro.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, "render", "timeline_intro.js"), "w", encoding="utf-8").write("window.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
print(len(words), "words; last ends", words[-1]["end"])
