"""15 s outro: tighten the narration (shorter pauses + gentle tempo), map Scribe word timings
through the edit, and write data/timeline_outro.json + render/timeline_outro.js.
Also writes audio/build/outro_voice.wav (the edited narration, 48 kHz stereo).
"""
import json, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 15.0
VOICE_START = 0.15
VOICE_END_TARGET = 13.50          # leaves a silent beat, the jumpscare and a black tail
JUMP = [13.85, 14.55]             # jumpscare window
SRC = "audio/raw/outro_a.mp3"

# Scribe word timings for audio/raw/outro_a.mp3 (tags removed)
WORDS = [["Peki,", 0.16, 0.72], ["siz", 0.96, 1.2], ["daha", 1.24, 1.36], ["önce", 1.44, 1.76], ["Enkebit'i", 1.84, 2.32],
         ["duydunuz", 2.36, 2.8], ["mu?", 2.88, 3.2], ["Ya", 3.58, 3.6], ["da", 3.68, 3.76], ["bir", 3.8, 3.84], ["gece,", 3.92, 4.64],
         ["karanlık", 4.68, 5.12], ["odanızda", 5.16, 5.52], ["onunla", 5.6, 6.0], ["birebir", 6.08, 6.4], ["karşılaşsaydınız…", 6.48, 8.0],
         ["ne", 8.04, 8.08], ["yapardınız?", 8.16, 9.04], ["Belki", 9.48, 9.6], ["de", 9.68, 9.76], ["şu", 9.8, 9.88], ["an", 9.92, 10.0],
         ["yalnız", 10.08, 10.4], ["olduğunuzu", 10.48, 10.88], ["düşünüyorsunuz.", 10.96, 12.24], ["Ama", 12.28, 12.4],
         ["unutmayın…", 12.48, 13.52], ["Bazı", 13.6, 13.76], ["efsaneler,", 13.84, 14.8], ["siz", 14.84, 15.04],
         ["gözlerinizi", 15.08, 15.6], ["kapattığınızda", 15.68, 16.32], ["başlar.", 16.4, 17.12]]
RED = {"enkebiti", "karşılaşsaydınız", "yalnız", "gözlerinizi", "kapattığınızda", "başlar"}


def load(rel):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


x = load(SRC)
env = np.convolve(np.abs(x).mean(1), np.ones(int(0.01 * SR)) / int(0.01 * SR), "same")
loud = env > 10 ** (-38 / 20)
# pauses = silent runs >= 0.2 s inside the speech
idx = np.where(loud)[0]
s0, s1 = idx[0] / SR, idx[-1] / SR
pauses, run = [], None
for i in range(idx[0], idx[-1]):
    if not loud[i] and run is None:
        run = i
    elif loud[i] and run is not None:
        if (i - run) / SR >= 0.2:
            pauses.append([run / SR, i / SR])
        run = None
# only shorten silences that end where a word begins (never inside whispered words);
# keep a beat proportional to the punctuation before it
def target_for(b):
    nxt = min(WORDS, key=lambda w: abs(w[1] - b))
    if abs(nxt[1] - b) > 0.12:
        return None
    prev = WORDS[max(0, WORDS.index(nxt) - 1)][0]
    return 0.30 if prev.endswith("…") else 0.24 if prev[-1] in "?." else 0.15
print("speech", round(s0, 2), round(s1, 2), "pauses", [(round(a, 2), round(b, 2)) for a, b in pauses])

# build the cut list (keep segments) on the original timeline
keep, cur = [], max(0, s0 - 0.05)
for k, (a, b) in enumerate(pauses):
    tgt = target_for(b)
    if tgt is not None and b - a > tgt:
        keep.append([cur, a + tgt / 2]); cur = b - tgt / 2
keep.append([cur, s1 + 0.18])


def mapt(t):
    """original time -> time after the cuts"""
    out = 0.0
    for a, b in keep:
        if t <= a:
            return out
        if t <= b:
            return out + (t - a)
        out += b - a
    return out


xf = int(0.01 * SR)
pieces = []
for a, b in keep:
    p = x[int(a * SR): int(b * SR)].copy()
    p[:xf] *= np.linspace(0, 1, xf)[:, None]; p[-xf:] *= np.linspace(1, 0, xf)[:, None]
    pieces.append(p)
cutv = np.concatenate(pieces)
cut_len = len(cutv) / SR
tempo = cut_len / (VOICE_END_TARGET - VOICE_START)
os.makedirs(os.path.join(ROOT, "audio", "build"), exist_ok=True)
outp = os.path.join(ROOT, "audio", "build", "outro_voice.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-af", f"atempo={tempo:.4f}",
                "-c:a", "pcm_f32le", outp], input=cutv.astype(np.float32).tobytes(), check=True)
print(f"cut length {cut_len:.2f}s -> tempo x{tempo:.3f}")

norm = lambda w: re.sub(r"[^\wçğıöşüâî]", "", w.lower())
words = []
for text, a, b in WORDS:
    st, en = VOICE_START + mapt(a) / tempo, VOICE_START + mapt(b) / tempo
    words.append({"text": text, "start": round(st, 3), "end": round(en, 3), "clip": "outro", "red": norm(text) in RED, "creature": False})
for i, w in enumerate(words):
    nxt = words[i + 1]["start"] if i + 1 < len(words) else JUMP[0]
    w["show_until"] = round(min(nxt, w["end"] + 0.45, JUMP[0] - 0.1), 3)
W = {norm(w["text"]): w for w in words}
ev = {
    "o2_eyes": W["birebir"]["start"],
    "o3_hand": W["belki"]["start"] - 0.2,
    "o4_start": W["ama"]["start"] - 0.25,
    "lids": [W["gözlerinizi"]["start"] - 0.1, words[-1]["end"]],
    "silence": [words[-1]["end"], JUMP[0]],
    "jump": JUMP, "title": [JUMP[1] + 0.08, DUR],
}
tl = {"duration": DUR, "fps": 24, "width": 1080, "height": 1920, "voice": {"file": "audio/build/outro_voice.wav", "start": VOICE_START},
      "events": ev, "words": words, "tempo": round(tempo, 4)}
json.dump(tl, open(os.path.join(ROOT, "data", "timeline_outro.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
with open(os.path.join(ROOT, "render", "timeline_outro.js"), "w", encoding="utf-8") as f:
    f.write("// Generated by scripts/build_outro_timeline.py - do not edit by hand\nwindow.TL = " + json.dumps(tl, ensure_ascii=False) + ";\n")
for w in words:
    print(f'{w["start"]:6.2f}-{w["end"]:6.2f} {"*" if w["red"] else " "} {w["text"]}')
print("events", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in ev.items()})
