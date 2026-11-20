"""Soundtrack for the 30 s Instagram Story: narration, trailer braams, clock ticks, the creature whisper.
Writes out/story_mix_raw.wav (final -14 LUFS normalisation happens in build_story.sh).
"""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 30.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline_story.json"), encoding="utf-8"))
EV = TL["events"]
rng = np.random.default_rng(30)
S = "audio/sfx_raw/"


def load(rel, ff=None):
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)] + (["-af", ff] if ff else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


db = lambda x: 10 ** (x / 20)
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9)
cut = lambda x, a, b: x[int(a * SR): int(b * SR)]
filt = lambda x, k, f, o=4: signal.sosfilt(signal.butter(o, f, btype=k, fs=SR, output="sos"), x, axis=0).astype(np.float32)


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


def braam(dur=3.0, f0=41.2, drive=2.5):
    """trailer 'braam': detuned saw cluster with a closing low-pass and soft distortion"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35), (f0 * 4.76, 0.2)]:
        x += a * (2 * ((f * t + rng.random()) % 1) - 1)
    x = (np.tanh(drive * x / 3) * np.exp(-t * 1.1) * np.minimum(1, t / 0.02))[:, None].astype(np.float32)
    # dark body + a bright brassy attack that dies away quickly
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-t * 6)[:, None] * 0.6)[:, 0]
    y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)


voice = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)

# narration (same level/room as the film)
v = filt(load(TL["voice"]["file"]), "highpass", 75, 2)
v *= db(-20) / rms(v)
place(voice, reverb(v, 0.9, 0.10, 3500, 3), TL["voice"]["start"], 0, 0.005, 0.1)

# creature whisper on the end card (same processing as in the film)
cr = TL["cr"]["file"]
low = load(cr, "asetrate=48000*0.76,aresample=48000,atempo=1.3158"); mid = load(cr); high = load(cr, "asetrate=48000*1.22,aresample=48000,atempo=0.8197")
L = min(len(low), len(mid), len(high)); low, mid, high = low[:L], mid[:L], high[:L]
crv = np.tanh(low * 6.0) * 0.5 + np.roll(mid, int(0.012 * SR), axis=0) * 0.45 + high * 0.18
crv = filt(filt(crv, "highpass", 110, 2), "lowpass", 6500, 2); crv[:, 0] = np.roll(crv[:, 0], int(0.004 * SR))
crv *= db(-17) / rms(crv)
place(voice, reverb(crv, 1.4, 0.22, 2500, 9), TL["cr"]["start"], 0, 0.01, 0.4)

# --- ambience and hits ---
place(sfx, cut(load(S + "wind_3.mp3"), 2.0, 7.0), 0.0, -6, 0.3, 0.4)
place(sfx, reverb(filt(load(S + "dog_2.mp3"), "lowpass", 3500), 2.0, 0.35, 3000, 4), 0.8, -12, 0.1, 0.6)
hit = load(S + "hit_3.mp3")
place(sfx, hit, EV["title"][0] + 0.05 - peak_t(hit), -2, 0.0, 0.5)                      # "Enkebit." smash
place(sfx, filt(rng.standard_normal((int(0.4 * SR), 2)).astype(np.float32), "bandpass", [1500, 7000], 2) * 0.12, EV["title"][0], 0, 0.0, 0.3)
place(sfx, cut(load(S + "blanket_3.mp3"), 0.0, 2.0), 5.9, -4, 0.05, 0.4)
place(sfx, filt(load(S + "breath_1.mp3"), "lowpass", 4000), 6.4, -9, 0.1, 0.5)
place(sfx, cut(load(S + "scratch_3.mp3"), 0.8, 2.6), 8.2, -10, 0.1, 0.4)
place(sfx, cut(load(S + "bones_3.mp3"), 0.0, 2.2), EV["plate"][0] + 0.1, -10, 0.05, 0.4)
# shimmer as the golden fez appears, a dull ring for the hole
n = int(1.6 * SR); tt = np.arange(n) / SR
shim = sum(np.sin(2 * np.pi * f * tt) for f in [1318.5, 1975.5, 2637.0]) * np.exp(-tt * 2.5) / 3 * 0.12
place(sfx, np.stack([shim, np.roll(shim, 300)], 1).astype(np.float32), EV["fez"] - 0.05, 0, 0.02, 0.3)
place(sfx, np.stack([shim * 0.6, shim * 0.6], 1).astype(np.float32), EV["hole"] - 0.05, -4, 0.02, 0.3)
# the snatch: whoosh + the creature's hiss
wn = int(0.5 * SR); wh = filt(rng.standard_normal((wn, 2)).astype(np.float32), "bandpass", [400, 6000], 2) * np.sin(np.linspace(0, np.pi, wn))[:, None] ** 2 * 0.5
place(sfx, wh, EV["snatch"] - 0.1, 0, 0.0, 0.05)
place(sfx, filt(load(S + "breath_2.mp3"), "highpass", 500), EV["snatch"] + 0.05, -8, 0.01, 0.4)
# clock: ticks speeding up toward twelve, then the strike
a, tw = EV["clock"][0], EV["twelve"]
def tick(hi):
    n = int(0.03 * SR); x = filt(rng.standard_normal((n, 2)).astype(np.float32), "bandpass", [2500 if hi else 1600, 5000 if hi else 3200], 2)
    return x * np.exp(-np.linspace(0, 8, n))[:, None] * 0.5
tc, k = a, 0
while tc < tw - 0.05:
    place(sfx, tick(k % 2 == 0), tc, 0, 0.0, 0.01); k += 1
    tc += 0.5 - 0.3 * (tc - a) / (tw - a)
n = int(4.0 * SR); tt = np.arange(n) / SR                        # bell strike on twelve
bell = sum(a_ * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, a_, d in [(196, 1, 0.9), (392.6, 0.5, 1.4), (588, 0.35, 2), (987, 0.2, 3)])
place(sfx, np.stack([bell, bell], 1).astype(np.float32) * 0.25, tw, 0, 0.002, 0.8)
# riser into twelve
rn = int((tw - (tw - 1.6)) * SR); rt = np.arange(rn) / SR
riser = (filt(rng.standard_normal((rn, 1)).astype(np.float32), "highpass", 800, 2)[:, 0] * (rt / rt[-1]) ** 3 * 0.3
         + np.sin(2 * np.pi * (200 + 900 * (rt / rt[-1]) ** 2) * rt) * (rt / rt[-1]) ** 2 * 0.08).astype(np.float32)
place(sfx, np.stack([riser, riser], 1), tw - 1.6, 0, 0.0, 0.02)
place(sfx, cut(load(S + "scratch_4.mp3"), 0.2, 0.95), 29.2, -6, 0.005, 0.2)

# --- score: low drone + braams on the title, the twelve and the end card ---
t = np.arange(N) / SR
dr = sum(a_ * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a_ in [(36.7, 0.5), (36.95, 0.4), (55.0, 0.3), (73.4, 0.15)]).astype(np.float32)
g = np.interp(t, [0, 0.4, 4.5, 6, 17, 21.6, tw, tw + 0.1, 25.4, 29.6, 30], [0, 0.35, 0.4, 0.55, 0.55, 0.45, 0.7, 0.3, 0.45, 0.5, 0]).astype(np.float32)
music[:, 0] += dr * g * 0.32; music[:, 1] += np.roll(dr * g * 0.32, int(0.011 * SR))
place(music, braam(3.2, 41.2), EV["title"][0], -3, 0.0, 0.6)
place(music, braam(3.5, 36.7), tw, -1, 0.0, 0.8)
place(music, braam(4.2, 32.7, 3.0), EV["end"][0], -5, 0.0, 1.5)

mix = voice + sfx * 0.9 + music
mix[int(29.85 * SR):] *= np.linspace(1, 0, N - int(29.85 * SR))[:, None]
out = os.path.join(ROOT, "out", "story_mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "pcm_f32le", out],
               input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out, "peak", round(float(np.abs(mix).max()), 3))
