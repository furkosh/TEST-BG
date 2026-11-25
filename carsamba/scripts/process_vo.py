"""Tighten the narration for the 30 s cut: shorten internal pauses, trim edges, time-stretch (rubberband, pitch kept),
and carry the Scribe word timings through every edit. Also builds the muffled creature line behind the door.
Output: audio/build/*.wav (48 kHz mono) and data/words.json (times relative to each processed clip)."""
import json, os, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
OUT = os.path.join(ROOT, "audio", "build")
os.makedirs(OUT, exist_ok=True)
raw = json.load(open(os.path.join(ROOT, "data", "words_raw.json"), encoding="utf-8"))
# clip -> (time-stretch factor, max kept pause, max kept pause after "...")
CFG = {"v1": (1.20, 0.10, 0.20), "v2": (1.20, 0.10, 0.18), "v3": (1.19, 0.08, 0.16), "v4": (1.21, 0.10, 0.20), "v5": (1.10, 0.10, 0.22)}


def load(path):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).copy()


def save(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s24le", path],
                   input=x.astype(np.float32).tobytes(), check=True)


def env_db(x, hop=0.005, win=0.02):
    h, w = int(hop * SR), int(win * SR)
    n = len(x) // h
    e = np.array([np.sqrt(np.mean(x[i * h:i * h + w] ** 2) + 1e-12) for i in range(n)])
    return 20 * np.log10(e + 1e-9), hop


def tighten(x, words, gap_max, gap_dots):
    """Find silent runs (energy based) and shorten them. Returns new audio and a time map (orig->new) as knots."""
    db, hop = env_db(x)
    thr = db.max() - 38
    sil = db < thr
    runs, i = [], 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            runs.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    dur = len(x) / SR
    lead = runs[0][1] if runs and runs[0][0] == 0 else 0.0
    tail = runs[-1][0] if runs and runs[-1][1] >= dur - 0.03 else dur
    segs = []  # kept (a, b) intervals of the original
    cur = max(0.0, lead - 0.03)
    for a, b in runs:
        if a <= lead or b >= tail or b - a < 0.06:
            continue
        # a pause after a word written with "..." may stay a little longer
        before = [w for w in words if w["e"] <= a + 0.25]
        mx = gap_dots if before and before[-1]["w"].endswith("...") else gap_max
        if b - a > mx:
            keep = mx
            segs.append((cur, a + keep * 0.5))
            cur = b - keep * 0.5
    segs.append((cur, min(dur, tail + 0.06)))
    fade = int(0.012 * SR)
    out, knots, t = [], [], 0.0
    for a, b in segs:
        s = x[int(a * SR):int(b * SR)].copy()
        s[:fade] *= np.linspace(0, 1, fade)
        s[-fade:] *= np.linspace(1, 0, fade)
        out.append(s)
        knots.append((a, t, b))
        t += len(s) / SR
    return np.concatenate(out), knots


def remap(tt, knots):
    for a, t0, b in knots:
        if tt <= b:
            return t0 + max(0.0, tt - a)
    a, t0, b = knots[-1]
    return t0 + (b - a)


def stretch(x, f):
    b = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", f"rubberband=tempo={f}:pitch=1:transients=crisp:detector=compound:phase=laminar:window=standard:formant=preserved",
                        "-f", "f32le", "-"], input=x.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).copy()


words_out, durs = {}, {}
for clip, (f, gm, gd) in CFG.items():
    x = load(os.path.join(ROOT, "audio", "raw", clip + ".mp3"))
    y, knots = tighten(x, raw[clip], gm, gd)
    z = stretch(y, f)
    sc = len(z) / len(y)
    ws = [{"w": w["w"], "s": round(remap(w["s"], knots) * sc, 3), "e": round(remap(w["e"], knots) * sc, 3)} for w in raw[clip]]
    save(os.path.join(OUT, clip + ".wav"), z)
    words_out[clip] = ws
    durs[clip] = round(len(z) / SR, 3)
    print(clip, f"{len(x) / SR:.2f} -> tight {len(y) / SR:.2f} -> {len(z) / SR:.2f}s", ws[0]["s"], ws[-1]["e"])

# creature line behind a closed door: low-passed, boxy, a touch slower and lower, short room tail
k = load(os.path.join(ROOT, "audio", "raw", "k1.mp3"))
db, hop = env_db(k)
on = np.where(db > db.max() - 40)[0]
k = k[max(0, int(on[0] * hop * SR) - 800):int(on[-1] * hop * SR) + 4000]
k, _ = tighten(k, [], 0.12, 0.12)
b = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", "rubberband=tempo=1.05:pitch=0.93:formant=shifted", "-f", "f32le", "-"],
                   input=k.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
k = np.frombuffer(b, np.float32).copy()
k = sosfilt(butter(4, 900, "low", fs=SR, output="sos"), k) * 1.6 + sosfilt(butter(2, [180, 420], "band", fs=SR, output="sos"), k) * 0.9
rng = np.random.default_rng(3)
n = int(0.35 * SR)
ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 9, n))
ir[0] = 6.0
k = fftconvolve(k, ir)[:len(k) + n // 2]
k = k / (np.abs(k).max() + 1e-9) * 0.7
save(os.path.join(OUT, "k1_door.wav"), k)
durs["k1_door"] = round(len(k) / SR, 3)
print("k1_door", durs["k1_door"])
json.dump({"words": words_out, "durations": durs}, open(os.path.join(ROOT, "data", "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("total VO", round(sum(durs[c] for c in CFG), 2))
