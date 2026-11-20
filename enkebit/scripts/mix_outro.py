"""Soundtrack for the 15 s outro (narration addressed to the viewer + rising tension + jumpscare).
Writes out/outro_mix_raw.wav. Narration is levelled exactly like the main film so the two parts match.
"""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 15.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline_outro.json"), encoding="utf-8"))
EV = TL["events"]
rng = np.random.default_rng(15)
S = "audio/sfx_raw/"


def load(rel, ff=None):
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)] + (["-af", ff] if ff else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


db = lambda x: 10 ** (x / 20)
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9)
cut = lambda x, a, b: x[int(a * SR): int(b * SR)]


def filt(x, kind, f, order=4):
    return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output="sos"), x, axis=0).astype(np.float32)


def place(track, clip, t, g=0.0, fin=0.01, fout=0.05):
    clip = clip.copy() * db(g)
    a, b = int(fin * SR), int(fout * SR)
    if a: clip[:a] *= np.linspace(0, 1, a)[:, None]
    if b: clip[-b:] *= np.linspace(1, 0, b)[:, None]
    s = int(t * SR); e = min(N, s + len(clip))
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
    return float(np.argmax(np.convolve(np.abs(x).mean(1), np.ones(k) / k, "same"))) / SR


voice = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)

# narration (same level/room as the main film)
v = filt(load(TL["voice"]["file"]), "highpass", 75, 2)
v *= db(-20) / rms(v)
place(voice, reverb(v, 0.9, 0.10, 3500, 3), TL["voice"]["start"], 0, 0.005, 0.1)

Q2 = [w["start"] for w in TL["words"] if w["text"] == "Ya"][0]
# ambience + events
wind = filt(load(S + "wind_2.mp3"), "lowpass", 900)
place(sfx, cut(wind, 0, EV["silence"][0] + 0.1), 0.0, -9, 0.4, 0.15)
place(sfx, cut(load(S + "creak_4.mp3"), 0.5, 3.0), Q2 + 0.2, -9, 0.1, 0.5)
place(sfx, filt(load(S + "breath_3.mp3"), "lowpass", 3500), EV["o2_eyes"] + 0.3, -7, 0.1, 0.5)
place(sfx, cut(load(S + "bones_2.mp3"), 0.0, 1.6), EV["o2_eyes"] + 1.6, -12, 0.02, 0.4)
# nails tapping the screen edge
kn = load(S + "knock_4.mp3")
for i, p in enumerate([0.68, 1.14, 1.62]):
    tap = filt(cut(kn, p - 0.03, p + 0.18), "highpass", 1800, 2)
    place(sfx, tap, EV["o3_hand"] + 0.95 + i * 0.35, 4, 0.002, 0.06)
place(sfx, cut(load(S + "scratch_3.mp3"), 0.6, 2.4), EV["o3_hand"] + 0.2, -12, 0.2, 0.4)
place(sfx, filt(load(S + "breath_1.mp3"), "lowpass", 4500), EV["o3_hand"] + 1.0, -8, 0.1, 0.6)

# drone + heartbeat rising, then everything drops out for the silent beat
t = np.arange(N) / SR
dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(36.7, 0.5), (36.95, 0.4), (55.0, 0.3), (77.8, 0.18), (82.4, 0.18)]).astype(np.float32)
hiss = filt(rng.standard_normal((N, 1)).astype(np.float32), "bandpass", [2500, 7000], 2)[:, 0]
whine = np.sin(2 * np.pi * (900 + 600 * np.clip((t - EV["lids"][0]) / 1.8, 0, 1)) * t).astype(np.float32)
s0 = EV["silence"][0]
g_dr = np.interp(t, [0, 0.5, Q2, EV["o4_start"], s0 - 0.05, s0], [0, 0.4, 0.5, 0.7, 0.95, 0]).astype(np.float32)
g_hs = np.interp(t, [0, EV["lids"][0], s0 - 0.05, s0], [0, 0, 0.05, 0]).astype(np.float32)
g_wh = np.interp(t, [0, EV["lids"][0], s0 - 0.05, s0], [0, 0, 0.05, 0]).astype(np.float32)
mono = dr * g_dr * 0.32 + hiss * g_hs + whine * g_wh
music[:, 0] += mono; music[:, 1] += np.roll(mono, int(0.011 * SR))

def beat():
    n = int(0.42 * SR); tt = np.arange(n) / SR; d = int(0.16 * SR)
    x = np.sin(2 * np.pi * 58 * tt) * np.exp(-tt * 28); x[d:] += 0.7 * np.sin(2 * np.pi * 72 * tt[: n - d]) * np.exp(-tt[: n - d] * 34)
    x = filt(np.stack([x, x], 1).astype(np.float32), "lowpass", 220, 2)
    return x / np.abs(x).max()
hb, tc = beat(), EV["o4_start"] - 1.5
while tc < s0 - 0.35:
    u = (tc - (EV["o4_start"] - 1.5)) / (s0 - EV["o4_start"] + 1.5)
    place(sfx, hb, tc, -6 + 6 * u, 0, 0.05); tc += 60 / (78 + 70 * u)

# the silent beat: hard silence, then one tiny close breath right before the scare
sil0, sil1 = int(s0 * SR), int(EV["jump"][0] * SR)
sfx[sil0: sil1] = 0; music[sil0: sil1] = 0
place(sfx, cut(filt(load(S + "breath_4.mp3"), "lowpass", 5000), 0.0, 0.3), EV["jump"][0] - 0.28, -16, 0.02, 0.08)

# JUMPSCARE: scream + impact + distorted sub + noise burst, peaking on the first frame
j0, j1 = EV["jump"]
scr = load(S + "scream_1.mp3")
place(sfx, scr, j0 - min(0.05, peak_t(scr)) , 6, 0.0, 0.15)
place(sfx, load(S + "scream_3.mp3"), j0 + 0.02, 0, 0.0, 0.15)
hit = load(S + "hit_2.mp3")
place(sfx, hit, j0 - peak_t(hit), 4, 0.0, 0.4)
n = int(0.9 * SR); tt = np.arange(n) / SR
sub = np.tanh(3 * np.sin(2 * np.pi * (70 - 35 * tt) * tt) * np.exp(-tt * 4)).astype(np.float32)
place(sfx, np.stack([sub, sub], 1) * 0.8, j0, 0, 0.002, 0.2)
nb = filt(rng.standard_normal((int(0.25 * SR), 2)).astype(np.float32), "highpass", 1500, 2) * 0.35
place(sfx, nb, j0, 0, 0.0, 0.2)
# then silence for the title, with only a short static tick
place(sfx, filt(rng.standard_normal((int(0.06 * SR), 2)).astype(np.float32), "bandpass", [2000, 6000], 2) * 0.15, EV["title"][0], 0, 0, 0.03)

mix = voice + sfx * 0.9 + music
end = int((j1 + 0.25) * SR)
mix[end:] *= 0; mix[end - int(0.2 * SR): end] *= np.linspace(1, 0, int(0.2 * SR))[:, None]
mix[int(EV["title"][0] * SR): int((EV["title"][0] + 0.06) * SR)] += sfx[int(EV["title"][0] * SR): int((EV["title"][0] + 0.06) * SR)] * 0.9
out = os.path.join(ROOT, "out", "outro_mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "pcm_f32le", out],
               input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out, "peak", round(float(np.abs(mix).max()), 3), "voice rms dB", round(20 * np.log10(rms(voice)), 1))
