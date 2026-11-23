"""DÂBBETÜ'L-ARZ soundtrack (135 s): narration, the creature's voice from under the ground, rain, quarry and cave Foley,
synthesised score that cuts out completely while it speaks. Writes out/mix_raw.wav (loudness normalisation in build_video.sh)."""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 135.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline.json"), encoding="utf-8"))
EV, CL = TL["events"], TL["clips"]
rng = np.random.default_rng(11)
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


def peak_t(x):
    k = int(0.01 * SR)
    return float(np.argmax(signal.fftconvolve(np.abs(x).mean(1), np.ones(k) / k, "same"))) / SR


def creature(rel, level=-17, wet=0.42):
    """very deep, slow voice that seems to come from the ground all around"""
    lo = load(rel, "asetrate=48000*0.74,aresample=48000,atempo=1.17")
    sub = load(rel, "asetrate=48000*0.5,aresample=48000,atempo=1.17")
    L = min(len(lo), len(sub)); lo, sub = lo[:L], sub[:L]
    env = signal.fftconvolve(np.abs(lo).mean(1), np.ones(int(0.05 * SR)) / (0.05 * SR), "same").astype(np.float32)
    t = np.arange(L) / SR
    rumble = (np.sin(2 * np.pi * 38 * t) * 0.6 + filt(rng.standard_normal((L, 1)).astype(np.float32), "lowpass", 90, 2)[:, 0] * 3) * env * 4
    y = lo * 0.8 + np.tanh(sub * 4) * 0.35 + np.stack([rumble, rumble], 1) * 0.5
    y = filt(filt(y, "highpass", 28, 2), "lowpass", 5000, 2)
    y[:, 0] = np.roll(y[:, 0], int(0.017 * SR)); y[:, 1] = np.roll(y[:, 1], int(0.006 * SR))     # wide, no clear direction
    return reverb(norm(y, level), 3.2, wet, 1800, 21)


voice = np.zeros((N, 2), np.float32); cre = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)

# ---------------- narration ----------------
for k, c in CL.items():
    if c["creature"]: continue
    v = norm(filt(load(c["file"]), "highpass", 75, 2), -20)
    place(voice, reverb(v, 0.9, 0.1, 3500, 3), c["start"], 0, 0.005, 0.1)
place(cre, creature(CL["c1"]["file"], -22, 0.6), CL["c1"]["start"], 0, 0.01, 1.0)      # from deep inside the cave
place(cre, creature(CL["c2"]["file"], -16, 0.42), CL["c2"]["start"], 0, 0.01, 1.5)
place(cre, creature(CL["c1b"]["file"], -19, 0.5), CL["c1b"]["start"], 0, 0.01, 0.8)

# ---------------- ambience ----------------
rain = filt(load(S + "rain.mp3"), "lowpass", 9000, 2)
rl = np.concatenate([rain, rain[::-1], rain, rain[::-1]])
for a, b, g in [(14.6, 22.0, -10), (22.0, 26.8, -16), (28.4, 45.2, -11), (45.2, 59.6, -24), (59.6, 81.6, -14), (89.6, 101.6, -12)]:
    place(amb, cut(rl, a % 30, a % 30 + (b - a)), a, g, 0.4, 0.02 if b == 81.6 else 0.3)
cave = load(S + "cave.mp3")
place(amb, cut(cave, 0, 14.4), 45.2, -8, 0.3, 0.4)
dogs = load(S + "dogs.mp3")
place(sfx, reverb(filt(cut(dogs, 0, 5.8), "lowpass", 4000), 1.5, 0.35, 3000, 4), 15.6, -10, 0.3, 0.02)    # they all stop at once

# ---------------- Foley ----------------
rum = load(S + "rumble.mp3")
place(sfx, filt(rum, "lowpass", 300), 0.0, 0, 0.8, 0.02)                               # the first second: deep tremor (cut at the black)
sfx[int(13.95 * SR): int(14.6 * SR)] *= 0
place(sfx, filt(cut(rum, 3, 10), "lowpass", 250), 19.4, -4, 0.5, 1.0)
place(sfx, filt(cut(rum, 6, 9), "lowpass", 200), 26.7, 2, 0.05, 0.8)                  # the boom under the house
place(sfx, filt(cut(rum, 0, 8), "lowpass", 260), 31.8, -6, 1.0, 1.0)
place(sfx, filt(cut(rum, 4, 13), "lowpass", 220), 52.4, 0, 0.1, 1.0)
place(sfx, filt(cut(rum, 0, 15), "lowpass", 240), 120.0, -3, 1.0, 1.0)
crack = load(S + "crack.mp3")
place(sfx, cut(crack, 0, 4), EV["s1_stones"] - 0.1, -4, 0.02, 0.6)
place(sfx, cut(crack, 3, 7), EV["s3_cracks"], -8, 0.05, 0.6)
place(sfx, cut(crack, 0, 3), EV["s4_sink"] - 0.05, -2, 0.0, 0.5)
place(sfx, crack, EV["s5_crack"], -2, 0.0, 0.6)
place(sfx, cut(crack, 0, 2.5), 12.0, -6, 0.0, 0.4)
glass = load(S + "glass.mp3")
place(sfx, cut(glass, 0, 2.4), 24.7, -2, 0.05, 0.4)
grav = load(S + "gravel.mp3")
place(sfx, cut(grav, 0, 9.6), 28.4, -6, 0.3, 0.6)
fl = load(S + "flash.mp3")
place(sfx, cut(fl, 0, 0.8), 28.5, -6, 0.0, 0.1)
place(sfx, cut(fl, 0.8, 3.0), 59.8, -4, 0.0, 0.3)
br = load(S + "breath.mp3")
place(sfx, cut(br, 0, 4.0), EV["s4_breath"], 0, 0.3, 0.6)
place(sfx, cut(br, 4, 9.6), 61.4, -2, 0.4, 0.8)
place(sfx, cut(br, 0, 8.0), 70.2, -4, 0.4, 0.02)
rf = load(S + "rockfall.mp3")
place(sfx, reverb(cut(rf, 0, 3.5), 1.5, 0.3, 3000, 7), EV["s4_rocks"], -2, 0.0, 0.5)
place(sfx, cut(rf, 0, 4), 90.8, -2, 0.0, 0.5)
place(sfx, cut(rf, 1, 5), EV["s7_rocks"], -4, 0.0, 0.8)
sp = load(S + "split.mp3")
place(sfx, sp, EV["s5_limb"] - peak_t(sp) + 0.85, 2, 0.0, 0.8)
place(sfx, cut(sp, 2, 9.5), EV["s5_rise"], -2, 0.3, 1.2)
run = load(S + "run.mp3")
place(sfx, cut(run, 0, 7.4), 89.7, -2, 0.1, 0.4)
mb1, mb3, gasp = load(S + "breath_1.mp3"), load(S + "breath_3.mp3"), load(S + "gasp_1.mp3")
place(sfx, filt(mb1, "lowpass", 4500), 42.0, -8, 0.1, 0.5)
place(sfx, gasp, EV["s5_fall"] - 0.05, -4, 0.01, 0.4)
place(sfx, filt(mb3, "lowpass", 4000), 97.2, -4, 0.2, 0.6)                              # panting at the village edge
place(sfx, filt(mb1, "lowpass", 4000), 111.5, -12, 0.3, 0.6)

# ---------------- score ----------------
t = np.arange(N) / SR
dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(32.7, 0.5), (32.9, 0.4), (49.0, 0.28), (65.4, 0.14), (69.3, 0.12)]).astype(np.float32)
K = [(0, 0), (0.4, 0.5), (11.2, 0.7), (13.3, 0.95), (13.95, 0.95), (14.0, 0), (14.6, 0), (15.2, 0.35), (26.6, 0.5), (28.4, 0.4), (37.0, 0.55), (41.9, 0.7),
     (50.2, 0.8), (55.2, 0.7), (61.0, 0.85), (66.4, 1.0), (69.6, 0.8), (81.5, 0.9), (81.6, 0), (89.55, 0), (89.6, 0.8), (95.0, 0.6), (99.3, 0.35),
     (101.6, 0.25), (104.0, 0.3), (115.5, 0.5), (117.35, 0.6), (117.4, 0), (120.0, 0), (120.5, 0.35), (125.8, 0.5), (131.0, 0.6), (132.3, 0.7), (132.4, 0), (135, 0)]
g = np.interp(t, [k[0] for k in K], [k[1] for k in K]).astype(np.float32)
mono = dr * g * 0.32
music[:, 0] += mono; music[:, 1] += np.roll(mono, int(0.011 * SR))


def braam(dur=3.0, f0=41.2, drive=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * (2 * ((f * tt + rng.random()) % 1) - 1) for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35), (f0 * 4.76, 0.2)])
    x = (np.tanh(drive * x / 3) * np.exp(-tt * 1.1) * np.minimum(1, tt / 0.02))[:, None].astype(np.float32)
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-tt * 6)[:, None] * 0.6)[:, 0]
    y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)


for bt, f0, gdb in [(EV["s1_eyes"] + 0.6, 36.7, -4), (EV["s4_eyes"] + 0.2, 32.7, -5), (EV["s5_limb"] + 0.85, 36.7, -3), (EV["s5_rise"], 30.9, -4), (EV["s5_eyes"], 32.7, -5), (EV["title"][0], 36.7, -2)]:
    place(music, braam(3.2, f0), bt, gdb, 0.0, 0.8)


def beat():
    n = int(0.42 * SR); tt = np.arange(n) / SR; d = int(0.16 * SR)
    x = np.sin(2 * np.pi * 58 * tt) * np.exp(-tt * 28); x[d:] += 0.7 * np.sin(2 * np.pi * 72 * tt[: n - d]) * np.exp(-tt[: n - d] * 34)
    x = filt(np.stack([x, x], 1).astype(np.float32), "lowpass", 220, 2)
    return x / np.abs(x).max()


hb = beat()
for a, b, bpm0, bpm1, g0, g1 in [(36.8, 45.0, 86, 126, -10, -3), (76.0, 81.55, 120, 140, -6, -2), (122.0, 131.0, 60, 70, -10, -8)]:
    tc = a
    while tc < b - 0.2:
        u = (tc - a) / (b - a); place(sfx, hb, tc, g0 + (g1 - g0) * u, 0, 0.05); tc += 60 / (bpm0 + (bpm1 - bpm0) * u)
place(sfx, filt(cut(br, 0, 6), "lowpass", 1200), 126.5, -6, 0.5, 1.0)                  # breath echoing in the dark


# ---------------- second pass: thunder, wind, string-like cluster, reverse swells, heavy steps ----------------
wind = filt(load(S + "wind_2.mp3"), "lowpass", 2500)
wl = np.concatenate([wind, wind[::-1], wind, wind[::-1], wind])
for a, b, g in [(14.6, 22.0, -15), (28.4, 45.2, -16), (59.6, 81.6, -18), (89.6, 101.6, -15), (101.6, 117.4, -22)]:
    place(amb, cut(wl, (a * 0.7) % 20, (a * 0.7) % 20 + (b - a)), a, g, 0.6, 0.02 if b == 81.6 else 0.6)


def thunder(t0, g=0.0, seed=0):
    rr = np.random.default_rng(seed); n = int(5.5 * SR); tt = np.arange(n) / SR
    body = filt(rr.standard_normal((n, 2)).astype(np.float32), "lowpass", 160, 2) * (np.minimum(1, tt / 0.35) * np.exp(-tt * 0.7))[:, None] * 2.5
    crackle = filt(rr.standard_normal((n, 2)).astype(np.float32), "bandpass", [500, 3000], 2) * (np.exp(-tt * 3.5) * (rr.random(n) > 0.995))[:, None] * 6
    place(amb, reverb((body + crackle).astype(np.float32), 2.5, 0.5, 1200, 30 + seed), t0, g, 0.05, 1.0)


thunder(17.3, -6, 1); thunder(19.8, -3, 2)
# string-like dissonant cluster: detuned saws through a slowly breathing low-pass, following the tension curve
tc = np.arange(N) / SR
cl = sum(((2 * ((f * tc + ph) % 1) - 1) * a) for f, a, ph in [(110.0, 0.4, 0.1), (116.5, 0.35, 0.4), (164.8, 0.3, 0.7), (174.6, 0.25, 0.2), (233.1, 0.15, 0.5)]).astype(np.float32)
lfo = (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * tc)).astype(np.float32)
clp = signal.sosfilt(signal.butter(2, 900, btype="lowpass", fs=SR, output="sos"), cl).astype(np.float32) * (0.4 + 0.6 * lfo)
KS = [(0, 0), (2, 0.15), (11, 0.35), (13.9, 0.5), (14.0, 0), (26.5, 0), (28.4, 0.2), (39.8, 0.55), (41.9, 0.35), (50.2, 0.6), (55.2, 0.5), (61.0, 0.85),
      (66.4, 1.0), (69.6, 0.7), (81.5, 1.0), (81.6, 0), (89.6, 0), (89.65, 0.8), (95.0, 0.5), (99.3, 0.3), (101.6, 0.0), (111.0, 0.2), (115.5, 0.4),
      (117.35, 0.5), (117.4, 0), (120.5, 0), (122.0, 0.25), (128.0, 0.5), (132.3, 0.6), (132.4, 0), (135, 0)]
gs = np.interp(tc, [k[0] for k in KS], [k[1] for k in KS]).astype(np.float32)
cls = clp * gs * 0.05
music[:, 0] += cls; music[:, 1] += np.roll(cls, int(0.017 * SR))


def swell(dur=1.6, seed=0):
    rr = np.random.default_rng(seed); n = int(dur * SR); tt = np.arange(n) / SR
    x = filt(rr.standard_normal((n, 2)).astype(np.float32), "bandpass", [300, 6000], 2) * ((tt / dur) ** 3)[:, None] * 0.5
    x += np.stack([np.sin(2 * np.pi * (80 + 300 * (tt / dur) ** 2) * tt)] * 2, 1).astype(np.float32) * ((tt / dur) ** 2)[:, None] * 0.12
    return x.astype(np.float32)


for hit_t, seed in [(EV["s1_eyes"] + 0.6, 1), (EV["s4_eyes"] + 0.2, 2), (EV["s5_limb"] + 0.85, 3), (EV["s5_rise"], 4), (73.8, 5), (EV["s7_up"], 6)]:
    place(music, swell(1.6, seed), hit_t - 1.6, -6, 0.05, 0.01)
# heavy footfalls / ground blows while it rises and lowers its head
def thud(g=0.0):
    n = int(0.9 * SR); tt = np.arange(n) / SR
    x = np.tanh(3 * np.sin(2 * np.pi * (48 - 18 * tt) * tt) * np.exp(-tt * 5)).astype(np.float32)
    return np.stack([x, x], 1) * db(g)
for tb in [61.6, 62.9, 64.3, 65.4, 74.0, 75.2]:
    place(sfx, thud(-2), tb, 0, 0.002, 0.3)
    place(sfx, filt(cut(load(S + "rockfall.mp3"), 0.3, 1.6), "lowpass", 2500), tb + 0.05, -14, 0.01, 0.4)

# ---------------- bus ----------------
vg = signal.fftconvolve(np.abs(voice).mean(1), np.ones(int(0.3 * SR)) / (0.3 * SR), "same")
duck = (1 - 0.35 * np.clip(vg / (vg.max() * 0.25), 0, 1)).astype(np.float32)[:, None]
mix = voice + cre + sfx * 0.85 * duck + amb * duck + music * duck
# while it speaks: every ambient sound and the music are gone (only the narration tail and its voice)
i0, i1 = int(81.6 * SR), int(89.6 * SR)
mix[i0:i1] = voice[i0:i1] + cre[i0:i1] + sfx[i0:i1] * 0.15
for a, b in [(14.0, 14.55), (117.4, 119.9)]:
    mix[int(a * SR): int(b * SR)] = 0
mix[int(134.6 * SR):] *= np.linspace(1, 0, N - int(134.6 * SR))[:, None]
mix *= 0.97 / max(1.0, float(np.abs(mix).max()))
out = os.path.join(ROOT, "out", "mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "pcm_f32le", out], input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out, "voice rms dB", round(20 * np.log10(rms(voice)), 1))
