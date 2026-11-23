"""Soundtrack for the 12 s intro: narration, deep tremor, cracking earth, a braam on the eyes, silence, a hit on the title."""
import json, os, subprocess
import numpy as np
from scipy import signal
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 12.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline_intro.json"), encoding="utf-8")); EV = TL["events"]
rng = np.random.default_rng(12); S = "audio/sfx_raw/"
def load(rel, ff=None):
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)] + (["-af", ff] if ff else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()
db = lambda x: 10 ** (x / 20); rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9); cut = lambda x, a, b: x[int(a * SR): int(b * SR)]
filt = lambda x, k, f, o=4: signal.sosfilt(signal.butter(o, f, btype=k, fs=SR, output="sos"), x, axis=0).astype(np.float32)
def place(track, clip, t, g=0.0, fin=0.01, fout=0.05):
    clip = clip.copy() * db(g); a, b = int(fin * SR), int(fout * SR)
    if a: clip[:a] *= np.linspace(0, 1, a)[:, None]
    if b: clip[-b:] *= np.linspace(1, 0, b)[:, None]
    s = int(t * SR); e = min(N, s + len(clip))
    if s < N: track[s:e] += clip[: e - s]
def reverb(x, secs, wet, dark, seed):
    r = np.random.default_rng(seed); n = int(secs * SR)
    ir = filt(r.standard_normal((n, 2)).astype(np.float32) * np.exp(-np.linspace(0, 7, n))[:, None], "lowpass", dark, 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1).astype(np.float32)
    out = np.zeros_like(y); out[: len(x)] += x * (1 - wet); out += y * wet; return out
def peak_t(x):
    k = int(0.01 * SR); return float(np.argmax(signal.fftconvolve(np.abs(x).mean(1), np.ones(k) / k, "same"))) / SR
def braam(dur, f0):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * (2 * ((f * tt + rng.random()) % 1) - 1) for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35)])
    x = (np.tanh(2.5 * x / 3) * np.exp(-tt * 1.1) * np.minimum(1, tt / 0.02))[:, None].astype(np.float32)
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-tt * 6)[:, None] * 0.6)[:, 0]; y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)
voice = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)
v = filt(load(TL["voice"]["file"]), "highpass", 75, 2); v *= db(-20) / rms(v)
place(voice, reverb(v, 0.9, 0.1, 3500, 3), TL["voice"]["start"], 0, 0.005, 0.1)
rum = load(S + "rumble.mp3")
place(sfx, filt(cut(rum, 0, 10.8), "lowpass", 280), 0.0, 0, 0.6, 0.03)
crack = load(S + "crack.mp3")
place(sfx, cut(crack, 0, 3), 4.9, -6, 0.02, 0.5)
place(sfx, cut(crack, 3, 7), EV["crack"] - 0.05, -2, 0.0, 0.5)
br = load(S + "breath.mp3")
place(sfx, filt(cut(br, 0, 3.0), "lowpass", 900), EV["eyes"] + 0.2, -4, 0.2, 0.5)
t = np.arange(N) / SR
dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(32.7, 0.5), (32.9, 0.4), (49.0, 0.28), (65.4, 0.14)]).astype(np.float32)
g = np.interp(t, [0, 0.4, 6.0, 10.2, 10.7, 10.75, 12], [0, 0.45, 0.6, 0.95, 0.95, 0, 0]).astype(np.float32)
music[:, 0] += dr * g * 0.32; music[:, 1] += np.roll(dr * g * 0.32, int(0.011 * SR))
place(music, braam(3.0, 36.7), EV["eyes"] + 0.1, -4, 0.0, 0.8)
hit = load(S + "hit_3.mp3"); place(sfx, hit, EV["title"][0] - peak_t(hit), -2, 0.0, 0.4)
place(music, braam(1.2, 32.7), EV["title"][0], -4, 0.0, 0.4)
mix = voice + sfx * 0.85 + music
mix[int(10.75 * SR): int(10.94 * SR)] = 0                                   # one beat of absolute silence before the title
mix[int(11.85 * SR):] *= np.linspace(1, 0, N - int(11.85 * SR))[:, None]
mix *= 0.97 / max(1.0, float(np.abs(mix).max()))
out = os.path.join(ROOT, "out", "intro_mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "pcm_f32le", out], input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out)
