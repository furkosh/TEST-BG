"""YALMAVUZ soundtrack (135 s): narration, the creature's borrowed voices, directional whispers, forest, Foley,
synthesised score with hard cuts to silence. Writes out/mix_raw.wav (loudness normalisation in build_video.sh)."""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 135.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline.json"), encoding="utf-8"))
EV, CL = TL["events"], TL["clips"]
rng = np.random.default_rng(7)
S = "audio/sfx_raw/"


def load(rel, ff=None):
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)] + (["-af", ff] if ff else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


db = lambda x: 10 ** (x / 20)
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9)
cut = lambda x, a, b: x[int(a * SR): int(b * SR)]
filt = lambda x, k, f, o=4: signal.sosfilt(signal.butter(o, f, btype=k, fs=SR, output="sos"), x, axis=0).astype(np.float32)
norm = lambda x, d: x * (db(d) / rms(x))


def place(track, clip, t, g=0.0, fin=0.01, fout=0.05):
    clip = clip.copy() * db(g)
    a, b = int(fin * SR), int(fout * SR)
    if a: clip[:a] *= np.linspace(0, 1, a)[:, None]
    if b: clip[-b:] *= np.linspace(1, 0, b)[:, None]
    s = int(t * SR)
    if s < 0: clip = clip[-s:]; s = 0
    e = min(N, s + len(clip))
    if s < N: track[s:e] += clip[: e - s]


def reverb(x, secs, wet, dark, seed):
    r = np.random.default_rng(seed); n = int(secs * SR)
    ir = filt(r.standard_normal((n, 2)).astype(np.float32) * np.exp(-np.linspace(0, 7, n))[:, None], "lowpass", dark, 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1).astype(np.float32)
    out = np.zeros_like(y); out[: len(x)] += x * (1 - wet); out += y * wet
    return out


def pan(x, p):                       # p -1 (left) .. 1 (right), constant power, plus a small interaural delay
    m = x.mean(1); a = (p + 1) * np.pi / 4
    l, r = m * np.cos(a), m * np.sin(a); d = int(abs(p) * 0.0006 * SR)
    if p > 0: l = np.roll(l, d)
    elif p < 0: r = np.roll(r, d)
    return np.stack([l, r], 1).astype(np.float32)


def autopan(x, rate, phase=0.0):
    t = np.arange(len(x)) / SR; m = x.mean(1); a = (np.sin(2 * np.pi * rate * t + phase) + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], 1).astype(np.float32)


def peak_t(x):
    k = int(0.01 * SR)
    return float(np.argmax(np.convolve(np.abs(x).mean(1), np.ones(k) / k, "same"))) / SR


def mimic(rel, stage, cut_to=None):
    """the creature speaking in the mother's voice: natural -> doubled -> inhuman"""
    v = load(rel)
    if cut_to: v = v[: int(cut_to * SR)]
    if stage == 0:
        y = filt(filt(v, "highpass", 180, 2), "lowpass", 5200, 2)
        return reverb(norm(y, -24), 2.2, 0.38, 3200, 1)
    lo = load(rel, "asetrate=48000*0.78,aresample=48000,atempo=1.282"); hi = load(rel, "asetrate=48000*1.18,aresample=48000,atempo=0.847")
    L = min(len(v), len(lo), len(hi)); v, lo, hi = v[:L], lo[:L], hi[:L]
    if stage == 1:
        y = v + np.roll(v, int(0.018 * SR), 0) * 0.55 + lo * 0.25
    elif stage == 2:
        y = v * 0.8 + np.tanh(lo * 5) * 0.45 + hi * 0.15 + np.roll(v, int(0.03 * SR), 0) * 0.4
    else:
        w = filt(v, "highpass", 900, 2)                          # breathy whisper layer
        y = np.tanh(lo * 7) * 0.6 + np.roll(v, int(0.012 * SR), 0) * 0.4 + hi * 0.25 + w * 0.5
    y = filt(filt(y, "highpass", 100, 2), "lowpass", 7000, 2)
    y[:, 0] = np.roll(y[:, 0], int(0.004 * SR))
    return reverb(norm(y, -19), 1.6, 0.25 + 0.05 * stage, 2600, 2 + stage)


voice = np.zeros((N, 2), np.float32); cre = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)

# ---------------- narration ----------------
for k, c in CL.items():
    if c["stage"] is not None: continue
    v = norm(filt(load(c["file"]), "highpass", 75, 2), -20)
    place(voice, reverb(v, 0.9, 0.1, 3500, 3), c["start"], 0, 0.005, 0.1)

# ---------------- the creature's voices ----------------
place(cre, pan(mimic(CL["m1"]["file"], 0), -0.55), CL["m1"]["start"], 0, 0.01, 0.4)              # from the trees on the left
mb = mimic(CL["m1b"]["file"], 1, CL["m1b"]["cut"])                                                  # right behind him: wide
place(cre, mb, CL["m1b"]["start"], 2, 0.01, 0.3)
place(cre, mimic(CL["m2"]["file"], 2), CL["m2"]["start"], 1, 0.01, 0.4)
place(cre, mimic(CL["m3"]["file"], 3), CL["m3"]["start"], 1, 0.01, 0.5)
place(cre, mimic(CL["m4"]["file"], 3), CL["m4"]["start"], 2, 0.01, 0.6)

# whispers: black opening, the seven voices, the chase
wh = load(S + "whispers.mp3")
place(sfx, autopan(filt(cut(wh, 0, 9.5), "highpass", 300, 2), 0.35), 0.0, -4, 0.3, 1.2)
vo = load(S + "voices.mp3")
child = load(S + "voices.mp3", "asetrate=48000*1.45,aresample=48000,atempo=0.69")
old = load(S + "voices.mp3", "asetrate=48000*0.72,aresample=48000,atempo=1.389")
place(sfx, reverb(pan(norm(cut(child, 1.0, 2.6), -24), -0.9), 1.4, 0.3, 4000, 4), EV["s4_child"], 0, 0.02, 0.3)
place(sfx, reverb(pan(norm(cut(old, 4.0, 5.8), -24), 0.9), 1.4, 0.3, 3000, 5), EV["s4_old"], 0, 0.02, 0.3)
a0, a1 = EV["s4_all"]
crowd = np.zeros((int((a1 - a0) * SR), 2), np.float32)
for i, (src, rate, ph) in enumerate([(vo, 0.4, 0), (child, 0.55, 2), (old, 0.3, 4), (wh, 0.7, 1)]):
    seg = cut(src, 2 + i, 2 + i + (a1 - a0))
    seg = np.pad(seg, ((0, max(0, len(crowd) - len(seg))), (0, 0)))[: len(crowd)]
    crowd += autopan(norm(seg, -26), rate, ph) * np.linspace(0.5, 1.2, len(crowd))[:, None]
place(sfx, reverb(crowd, 1.2, 0.3, 3500, 6), a0, 0, 0.6, 0.02)          # hard stop: all the voices cut at once
own = norm(filt(cut(load(CL["s3"]["file"]), 0.1, 1.0), "bandpass", [300, 4000], 2), -26)    # his own voice, from the forest
place(sfx, reverb(pan(own, -0.6), 2.0, 0.5, 3000, 7), 76.9, 0, 0.02, 0.3)
place(sfx, autopan(filt(cut(wh, 10, 18), "highpass", 400, 2), 0.9), 72.0, -10, 0.5, 1.0)

# ---------------- ambience ----------------
forest = filt(load(S + "forest.mp3"), "lowpass", 6000, 2)
fl = np.concatenate([forest, forest[::-1], forest, forest[::-1], forest])
for a, b, g in [(1.6, 50.7, -12), (51.7, 88.65, -12), (92.0, 95.6, -14), (119.4, 133.3, -13)]:
    place(amb, cut(fl, a % 30, a % 30 + (b - a)), a, g, 0.6, 0.08 if b in (50.7, 88.65) else 0.6)
wind = filt(load(S + "wind_2.mp3"), "lowpass", 1200)
place(amb, cut(wind, 0, 10), 88.6, -20, 0.2, 2.0)                       # muffled wind outside the cabin
place(amb, cut(wind, 0, 9.5), 109.6, -24, 1.0, 1.5)                      # years later: wind at the window

# ---------------- Foley ----------------
walk = load(S + "walk.mp3")
place(sfx, filt(cut(walk, 0, 8.6), "lowpass", 5000), 10.4, -6, 0.5, 0.2)
run = load(S + "run.mp3")
place(sfx, cut(run, 0, 10.6), 70.0, -2, 0.1, 0.05)
place(sfx, cut(run, 4, 8.0), 84.6, -2, 0.1, 0.1)
huge = load(S + "huge.mp3")
place(sfx, filt(cut(huge, 6.6, 9.5), "lowpass", 900), 4.8, -2, 0.2, 0.8)           # S1: its footsteps far away
place(sfx, filt(cut(huge, 6.6, 9.5), "lowpass", 700), 20.9, -8, 0.3, 0.8)          # S2: shadow behind the trees
place(sfx, cut(huge, 6.8, 9.2), 55.4, 0, 0.1, 0.6)                                  # S5: it steps out
place(sfx, filt(cut(huge, 6.6, 10.0), "lowpass", 800), 78.0, -4, 0.2, 0.6)         # S6: running beside him
place(sfx, cut(huge, 6.6, 10.0), 82.6, -3, 0.2, 0.8)                                # S6: approaching
cr4 = load(S + "creak_4.mp3")
place(sfx, filt(cut(cr4, 0.3, 2.3), "lowpass", 2500), EV["s5_hand"] - 0.1, -6, 0.05, 0.4)   # nails on bark
fall = load(S + "fall.mp3")
place(sfx, fall, EV["s5_fall"] + 0.6 - peak_t(fall), 0, 0.0, 0.3)
place(sfx, fall, 81.1 - peak_t(fall), 2, 0.0, 0.3)
# lantern: glass clink + metal scrape as it slides
n = int(0.8 * SR); tt = np.arange(n) / SR
clink = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in [(2350, 9), (3710, 12), (5120, 16)]) / 3 * 0.25
place(sfx, np.stack([clink, clink], 1).astype(np.float32), 81.2, 0, 0.001, 0.2)
scr = filt(rng.standard_normal((int(0.9 * SR), 2)).astype(np.float32), "bandpass", [1500, 5000], 2) * np.linspace(0.25, 0, int(0.9 * SR))[:, None]
place(sfx, scr, 81.25, 0, 0.01, 0.1)
# branches whipping his face
for bt in EV["s6_branch"]:
    wn = int(0.25 * SR); wsh = filt(rng.standard_normal((wn, 2)).astype(np.float32), "bandpass", [700, 7000], 2) * np.sin(np.linspace(0, np.pi, wn))[:, None] ** 2 * 0.5
    place(sfx, wsh, bt - 0.12, 0, 0.0, 0.02)
    sn = int(0.06 * SR); place(sfx, filt(rng.standard_normal((sn, 2)).astype(np.float32), "highpass", 2000, 2) * np.exp(-np.linspace(0, 6, sn))[:, None] * 0.6, bt, 0, 0, 0.02)
place(sfx, filt(cut(wh, 3, 6), "lowpass", 3000), EV["s6_shake"], -4, 0.1, 0.6)
# trees shaking: a deep creaking groan
place(sfx, filt(cut(cr4, 0, 2.5), "lowpass", 900), EV["s6_shake"] + 0.1, -2, 0.1, 0.5)
door = load(S + "door.mp3")
place(sfx, door, EV["s7_slam"] - peak_t(door), 2, 0.0, 0.5)
n = int(0.35 * SR); tt = np.arange(n) / SR                                       # iron bolt sliding home
bolt = filt(rng.standard_normal((n, 2)).astype(np.float32), "bandpass", [1200, 4500], 2) * 0.25 * np.minimum(1, tt / 0.3)[:, None]
place(sfx, bolt, 90.45, 0, 0.01, 0.01)
ck = np.sin(2 * np.pi * 1800 * tt[: int(0.1 * SR)]) * np.exp(-tt[: int(0.1 * SR)] * 60) * 0.5
place(sfx, np.stack([ck, ck], 1).astype(np.float32) + filt(rng.standard_normal((len(ck), 2)).astype(np.float32), "highpass", 2500, 2) * 0.3, 90.88, 0, 0, 0.02)
kn = load(S + "knock.mp3"); one = cut(kn, 0.2, 0.62)
for k, kt in enumerate(EV["s7_knocks"]):
    place(sfx, reverb(one, 0.6, 0.15, 3000, 8 + k), kt - 0.08, 6, 0.002, 0.08)
ceil = load(S + "ceiling.mp3")
place(sfx, cut(ceil, 1.0, 3.2), EV["s7_creak"] - 0.4, 2, 0.05, 0.5)
place(sfx, cut(ceil, 4.6, 6.0), 106.0, -4, 0.05, 0.5)
br1, br3 = load(S + "breath_1.mp3"), load(S + "breath_3.mp3")
place(sfx, filt(br1, "lowpass", 4000), EV["s4_silence"] + 0.05, -6, 0.05, 0.4)     # his breath in the silence
place(sfx, filt(br3, "lowpass", 3500), 96.0, -10, 0.2, 0.5)                          # behind his hand
place(sfx, filt(cut(br1, 0, 2.2), "highpass", 300), 101.3, -4, 0.1, 0.4)             # its breath above him
gasp = load(S + "gasp_1.mp3")
place(sfx, gasp, EV["s5_fall"] - 0.05, -6, 0.01, 0.4)
place(sfx, gasp, 107.15, -4, 0.01, 0.3)
place(sfx, filt(load(S + "candle_2.mp3"), "lowpass", 3000), 109.8, -14, 0.5, 1.0)    # lamp hiss, years later
moan = load(S + "moan_2.mp3")
place(sfx, filt(cut(moan, 0, 3), "lowpass", 1500), 107.2, -6, 0.1, 0.4)
place(sfx, filt(cut(moan, 0, 2.5), "lowpass", 1200), EV["s8_window"] + 0.1, -12, 0.3, 0.8)

# ---------------- score ----------------
t = np.arange(N) / SR
dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(36.7, 0.5), (36.95, 0.4), (55.0, 0.3), (73.4, 0.12), (77.8, 0.14)]).astype(np.float32)
hiss = filt(rng.standard_normal((N, 1)).astype(np.float32), "bandpass", [2500, 7000], 2)[:, 0]
# drone level: from the first second, swelling at every escalation; hard cuts to silence
K = [(0, 0), (0.3, 0.45), (7.3, 0.6), (9.3, 0.7), (9.35, 0.25), (10.4, 0.35), (22.9, 0.45), (23.0, 0.2), (25.4, 0.45), (37.8, 0.6), (38.6, 0.75),
     (45.0, 0.75), (50.6, 1.0), (50.68, 0), (51.7, 0), (51.75, 0.5), (55.5, 0.75), (63.4, 0.9), (66.2, 0.6), (69.0, 0.95), (70.0, 0.8), (80.5, 0.9),
     (80.6, 0.35), (82.4, 0.8), (88.55, 0.9), (88.65, 0.3), (92.0, 0.45), (95.5, 0.6), (99.55, 0.6), (99.6, 0), (101.8, 0), (101.9, 0.55), (103.8, 0.9),
     (107.0, 1.0), (108.88, 1.0), (108.9, 0), (109.6, 0), (110.5, 0.3), (117.0, 0.45), (119.4, 0.4), (127.0, 0.6), (131.6, 0.8), (133.2, 0.9), (133.3, 0), (135, 0)]
g = np.interp(t, [k[0] for k in K], [k[1] for k in K]).astype(np.float32)
gh = np.interp(t, [0, 45, 50.6, 50.68, 101.9, 103.8, 108.9, 135], [0, 0.03, 0.08, 0, 0.04, 0.08, 0, 0]).astype(np.float32)
mono = dr * g * 0.3 + hiss * gh
music[:, 0] += mono; music[:, 1] += np.roll(mono, int(0.011 * SR))


def braam(dur=3.0, f0=41.2, drive=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * (2 * ((f * tt + rng.random()) % 1) - 1) for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35), (f0 * 4.76, 0.2)])
    x = (np.tanh(drive * x / 3) * np.exp(-tt * 1.1) * np.minimum(1, tt / 0.02))[:, None].astype(np.float32)
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-tt * 6)[:, None] * 0.6)[:, 0]
    y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)


for bt, f0, gdb in [(EV["s1_eyes"], 41.2, -6), (EV["s1_turn"], 36.7, -3), (EV["s5_body"], 41.2, -5), (EV["s5_heads"][0], 36.7, -4),
                    (EV["s5_turn"][0], 32.7, -4), (CL["m2"]["start"], 36.7, -6), (82.4, 41.2, -6), (107.0, 32.7, -2), (EV["title"][0], 36.7, -2)]:
    place(music, braam(3.2, f0), bt, gdb, 0.0, 0.8)
place(music, braam(1.2, 30.9, 3.0), EV["s8_window"], -6, 0.0, 0.6)
hit = load(S + "hit_3.mp3")
place(sfx, hit, EV["s1_turn"] - peak_t(hit), -2, 0.0, 0.4)
place(sfx, hit, 107.0 - peak_t(hit), 0, 0.0, 0.4)


def beat():
    n = int(0.42 * SR); tt = np.arange(n) / SR; d = int(0.16 * SR)
    x = np.sin(2 * np.pi * 58 * tt) * np.exp(-tt * 28); x[d:] += 0.7 * np.sin(2 * np.pi * 72 * tt[: n - d]) * np.exp(-tt[: n - d] * 34)
    x = filt(np.stack([x, x], 1).astype(np.float32), "lowpass", 220, 2)
    return x / np.abs(x).max()


hb = beat()
for a, b, bpm0, bpm1, g0, g1 in [(50.7, 51.75, 110, 110, -6, -6), (95.6, 103.9, 84, 132, -10, -3), (103.9, 107.0, 130, 150, -4, -2)]:
    tc = a
    while tc < b - 0.2:
        u = (tc - a) / (b - a); place(sfx, hb, tc, lerp := g0 + (g1 - g0) * u, 0, 0.05); tc += 60 / (bpm0 + (bpm1 - bpm0) * u)

# ---------------- bus ----------------
vg = np.convolve(np.abs(voice).mean(1), np.ones(int(0.3 * SR)) / (0.3 * SR), "same")
duck = (1 - 0.35 * np.clip(vg / (vg.max() * 0.25), 0, 1)).astype(np.float32)[:, None]
mix = voice + cre + sfx * 0.85 * duck + amb * duck + music * duck
# absolute silences: the voices stop (S4), the black cut after the ceiling (S8)
for a, b, keep in [(50.68, 50.75, 0.0), (108.9, 109.55, 0.0)]:
    i0, i1 = int(a * SR), int(b * SR); mix[i0:i1] *= keep
mix[int(134.7 * SR):] *= np.linspace(1, 0, N - int(134.7 * SR))[:, None]
out = os.path.join(ROOT, "out", "mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "pcm_f32le", out], input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out, "peak", round(float(np.abs(mix).max()), 3), "voice rms dB", round(20 * np.log10(rms(voice)), 1))
