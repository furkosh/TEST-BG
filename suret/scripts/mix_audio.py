"""KAPIDAKİ SURET soundtrack (120 s): narrator + the wife's testimony, night ambience and Foley, a synthesised score
(drone, dissonant cluster, rising high tone, heartbeats, stings, a sad pad for the departure) and total silence at the end.
Writes out/mix_raw.wav (loudness normalisation happens in build_video.sh)."""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 120.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline.json"), encoding="utf-8"))
EV, CL = TL["events"], TL["clips"]
rng = np.random.default_rng(5)
S = "audio/sfx_raw/"


def load(rel, ff=None):
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)] + (["-af", ff] if ff else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


db = lambda x: 10 ** (x / 20)
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-9)
cut = lambda x, a, b: x[int(a * SR): int(b * SR)]
filt = lambda x, k, f, o=4: signal.sosfilt(signal.butter(o, f, btype=k, fs=SR, output="sos"), x, axis=0).astype(np.float32)
norm = lambda x, d: x * (db(d) / rms(x))
ev = lambda k, i=0: EV[k][i] if isinstance(EV[k], list) else EV[k]


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


def loopto(x, n):
    reps = int(np.ceil(n / len(x))) + 1
    y = np.concatenate([x if i % 2 == 0 else x[::-1] for i in range(reps)])
    return y[:n]


voice = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32)
amb = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)
t = np.arange(N) / SR

# ---------------- voices ----------------
for k, c in CL.items():
    v = norm(filt(load(c["file"]), "highpass", 80, 2), -20)
    if c["voice"] == "wife":
        v = reverb(v, 0.7, 0.12, 3800, 3)                     # small room, close and intimate
    else:
        v = reverb(v, 1.1, 0.08, 4200, 4)
    place(voice, v, c["start"], 0, 0.005, 0.12)

# ---------------- ambience ----------------
wind = filt(load(S + "wind.mp3"), "lowpass", 3500)
wind2 = filt(load(S + "wind_2.mp3"), "lowpass", 2600)
place(amb, loopto(wind, int(18.4 * SR)), 0.0, -8, 0.8, 0.02)             # cold wind over the town, cut at the black
place(amb, filt(loopto(wind2, int(14.5 * SR)), "lowpass", 900), 20.0, -22, 1.0, 0.6)   # wind behind the bedroom window
place(amb, filt(loopto(wind2, int(14 * SR)), "lowpass", 800), 34.5, -24, 0.5, 0.5)
place(amb, filt(loopto(wind, int(4.5 * SR)), "lowpass", 1200), 58.0, -24, 0.6, 0.5)     # daytime outside the window
place(amb, filt(loopto(wind2, int(14 * SR)), "lowpass", 2000), 62.5, -21, 1.0, 1.0)     # dawn
place(amb, filt(loopto(wind, int(6 * SR)), "lowpass", 1800), 76.5, -18, 0.8, 0.8)       # overcast return
place(amb, filt(loopto(wind2, int(16.8 * SR)), "lowpass", 700), 101.5, -24, 2.0, 0.02)  # the same night, cut at the scare
clock = load(S + "clock.mp3")
place(sfx, loopto(filt(clock, "highpass", 300), int(14.5 * SR)), 20.0, -15, 0.5, 0.8)
place(sfx, loopto(filt(clock, "highpass", 300), int(14 * SR)), 34.5, -19, 0.3, 0.6)
place(sfx, loopto(filt(clock, "highpass", 300), int(16.85 * SR)), 101.5, -16, 1.0, 0.02)
place(sfx, loopto(filt(clock, "lowpass", 3000), int(6.0 * SR)), 89.5, -24, 0.5, 1.0)  # clock at the table, far
# ---------------- Foley ----------------
b1, b3, gasp = load(S + "breath_1.mp3"), load(S + "breath_3.mp3"), load(S + "gasp.mp3")
place(sfx, filt(b1, "lowpass", 5000), 22.2, -12, 0.3, 0.6)                 # her breathing after waking
place(sfx, filt(b3, "lowpass", 4500), 32.3, -10, 0.2, 0.6)
place(sfx, filt(b1, "lowpass", 4000), 43.3, -8, 0.05, 0.6)                 # the scream that never comes
cr = load(S + "creak_4.mp3")
place(sfx, reverb(cut(cr, 0, 2.6), 1.2, 0.3, 3000, 7), ev("reveal2") - 0.25, -6, 0.02, 0.5)
place(sfx, reverb(cut(cr, 3.0, 5.4), 1.2, 0.3, 3000, 8), 33.2, -10, 0.02, 0.5)
sheets = load(S + "sheets.mp3")
place(sfx, cut(sheets, 0, 2.2), ev("situp4") - 0.15, -6, 0.0, 0.5)
place(sfx, gasp, ev("situp4") - peak_t(gasp) + 0.05, -4, 0.0, 0.5)
wh = filt(load(S + "whispers.mp3"), "highpass", 250)
place(sfx, reverb(cut(wh, 2, 7.5), 1.8, 0.4, 3500, 9), 51.8, -11, 0.8, 1.0)
steps = load(S + "steps.mp3")
place(sfx, reverb(filt(cut(steps, 0, 3.2), "lowpass", 2500), 1.5, 0.35, 2500, 10), 52.4, -12, 0.3, 0.6)
door = load(S + "door.mp3")
place(sfx, reverb(cut(door, 0, 5.4), 1.5, 0.3, 3000, 11), ev("kopen4", 0) - 0.2, -4, 0.05, 0.8)
pack = load(S + "pack.mp3")
place(sfx, cut(pack, 0, 3.6), 62.6, -9, 0.2, 0.6)
car = load(S + "car.mp3")
place(sfx, filt(cut(car, 0, 6.5), "lowpass", 6000), ev("car5") - 0.6, -7, 0.3, 2.0)
fd = load(S + "frontdoor.mp3")
place(sfx, cut(fd, 0, 3.5), ev("dopen6", 0) - 0.6, -5, 0.02, 0.8)
place(sfx, filt(b3, "lowpass", 3000), 83.0, -10, 0.4, 0.8)                 # muffled breathing
place(sfx, gasp, ev("open6") - peak_t(gasp) + 0.05, -8, 0.0, 0.4)
paper = load(S + "paper.mp3")
place(sfx, cut(paper, 0, 1.8), ev("news7") - 0.1, -8, 0.02, 0.4)
place(sfx, cut(paper, 1.8, 3.6), ev("news7b") - 0.15, -8, 0.02, 0.4)
h2, h3, scare = load(S + "hit_2.mp3"), load(S + "hit_3.mp3"), load(S + "scare.mp3")
place(sfx, h2, ev("black1") - peak_t(h2), -2, 0.0, 0.6)                    # cut to black at the end of the intro
place(sfx, h3, ev("flash6") - peak_t(h3), -6, 0.0, 0.6)                    # memory flash
place(sfx, scare, ev("scare8") - peak_t(scare) + 0.04, 0, 0.0, 0.05)
place(sfx, h3, ev("scare8") - peak_t(h3) + 0.02, -2, 0.0, 0.05)

# ---------------- score ----------------
def gain_curve(K):
    return np.interp(t, [k[0] for k in K], [k[1] for k in K]).astype(np.float32)


dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(36.7, 0.5), (36.9, 0.4), (55.0, 0.25), (73.4, 0.12), (77.8, 0.1)]).astype(np.float32)
KD = [(0, 0), (0.5, 0.45), (9.5, 0.6), (15.5, 0.9), (18.3, 1.0), (18.35, 0), (20.0, 0), (21.0, 0.4), (26.3, 0.6), (32.0, 0.5), (34.5, 0.55), (38.5, 0.8),
      (46.3, 0.9), (47.55, 1.0), (47.6, 0), (48.6, 0), (49.1, 0.7), (58.0, 0.55), (62.5, 0.2), (76.5, 0.3), (80.4, 0.6), (85.3, 0.9), (89.5, 0.5),
      (95.0, 0.35), (101.5, 0.3), (110.0, 0.6), (113.6, 0.85), (117.85, 1.0), (117.9, 0), (120, 0)]
mono = dr * gain_curve(KD) * 0.3
music[:, 0] += mono; music[:, 1] += np.roll(mono, int(0.011 * SR))
# dissonant cluster (detuned saws, breathing low-pass)
cl = sum(((2 * ((f * t + ph) % 1) - 1) * a) for f, a, ph in [(98.0, 0.4, 0.1), (103.8, 0.35, 0.4), (146.8, 0.3, 0.7), (155.6, 0.25, 0.2), (207.7, 0.15, 0.5)]).astype(np.float32)
lfo = (0.5 + 0.5 * np.sin(2 * np.pi * 0.06 * t)).astype(np.float32)
clp = signal.sosfilt(signal.butter(2, 850, btype="lowpass", fs=SR, output="sos"), cl).astype(np.float32) * (0.4 + 0.6 * lfo)
KC = [(0, 0), (3, 0.15), (12, 0.35), (18.3, 0.6), (18.35, 0), (26.0, 0), (27.2, 0.35), (34.5, 0.3), (40.8, 0.7), (47.55, 0.9), (47.6, 0), (49.1, 0.4),
      (58.0, 0.2), (62.5, 0.0), (77.0, 0.0), (82.9, 0.4), (87.6, 0.6), (89.5, 0.3), (99.0, 0.1), (101.5, 0.1), (113.6, 0.5), (117.85, 0.9), (117.9, 0), (120, 0)]
cls = clp * gain_curve(KC) * 0.05
music[:, 0] += cls; music[:, 1] += np.roll(cls, int(0.017 * SR))
# thin high tone rising while the likeness is in the doorway (and at the end)
def hightone(a, b, f0, f1, g):
    n = int((b - a) * SR); tt = np.arange(n) / SR; u = tt / (b - a)
    f = f0 + (f1 - f0) * u ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (u ** 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 6.5 * tt))
    y = np.stack([x, np.roll(x, 90)], 1).astype(np.float32)
    place(music, y, a, g, 0.2, 0.03)


hightone(38.5, 42.7, 2400, 5200, -30)
hightone(113.6, 117.88, 2200, 6200, -28)
hightone(27.2, 32.0, 3100, 3600, -36)


def braam(dur=3.0, f0=41.2, drive=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * (2 * ((f * tt + rng.random()) % 1) - 1) for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35), (f0 * 4.76, 0.2)])
    x = (np.tanh(drive * x / 3) * np.exp(-tt * 1.1) * np.minimum(1, tt / 0.02))[:, None].astype(np.float32)
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-tt * 6)[:, None] * 0.6)[:, 0]
    y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)


for bt, f0, gdb in [(ev("title", 0), 36.7, -4), (ev("reveal2"), 32.7, -9), (ev("smile3", 0) + 0.1, 30.9, -5), (ev("situp4"), 36.7, -9), (ev("shadow5", 0), 32.7, -10)]:
    place(music, braam(3.2, f0), bt, gdb, 0.0, 0.8)


def beat():
    n = int(0.42 * SR); tt = np.arange(n) / SR; d = int(0.16 * SR)
    x = np.sin(2 * np.pi * 56 * tt) * np.exp(-tt * 28); x[d:] += 0.7 * np.sin(2 * np.pi * 70 * tt[: n - d]) * np.exp(-tt[: n - d] * 34)
    x = filt(np.stack([x, x], 1).astype(np.float32), "lowpass", 220, 2)
    return x / np.abs(x).max()


hb = beat()
for a, b, bpm0, bpm1, g0, g1 in [(12.0, 18.25, 70, 112, -12, -4), (36.2, 46.2, 84, 132, -10, -3), (82.9, 89.4, 58, 64, -9, -8), (110.5, 117.5, 60, 64, -12, -9)]:
    tc = a
    while tc < b - 0.2:
        u = (tc - a) / (b - a); place(sfx, hb, tc, g0 + (g1 - g0) * u, 0, 0.05); tc += 60 / (bpm0 + (bpm1 - bpm0) * u)
place(sfx, hb * 1.0, ev("black1") + 0.25, -2, 0, 0.05)                    # one beat in the black
place(sfx, hb, 117.62, 3, 0, 0.05)                                        # one strong heartbeat before the scare

# lamp buzz while the light flickers (S3 end) and the electrical drop-out
n = int(1.5 * SR); tt = np.arange(n) / SR
buzz = (np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.3 + np.sin(2 * np.pi * 200 * tt) * 0.2) * (0.6 + 0.4 * (np.sin(2 * np.pi * 9 * tt) > 0))
place(sfx, filt(np.stack([buzz, buzz], 1).astype(np.float32), "bandpass", [150, 2500], 2), 46.4, -26, 0.2, 0.05)
for k in range(5):
    place(sfx, filt(np.stack([buzz[:2400], buzz[:2400]], 1).astype(np.float32), "bandpass", [150, 2500], 2), 47.0 + k * 0.12, -20, 0.0, 0.01)

# sad pad + sparse piano for the departure (62.5 - 76.5) and the table (89.5 - 101.5)
def piano(f, dur=3.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (1.2 + h * 0.8)) for h, a in [(1, 1.0), (2, 0.4), (3, 0.18), (4, 0.08)])
    x *= np.minimum(1, tt / 0.004)
    return np.stack([x, x], 1).astype(np.float32)


notes = {'A3': 220.0, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2, 'G3': 196.0, 'E3': 164.8}
pianotrack = np.zeros((N, 2), np.float32)
for tt0, nn in [(62.8, 'A3'), (63.6, 'E4'), (64.4, 'C4'), (66.2, 'A3'), (67.0, 'D4'), (67.8, 'F4'), (69.6, 'G3'), (70.4, 'D4'), (71.2, 'C4'), (73.0, 'E3'), (73.8, 'E4'), (74.6, 'A3'),
                ((89.8), 'A3'), (90.6, 'E4'), (91.4, 'C4'), (93.6, 'F4'), (94.4, 'E4'), (96.6, 'D4'), (98.0, 'C4'), (99.6, 'A3')]:
    place(pianotrack, piano(notes[nn], 3.2), tt0, -6, 0.0, 0.4)
pianotrack = reverb(pianotrack, 2.8, 0.45, 3000, 15)[:N]
music += pianotrack * 0.22
pad = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * a for f, a in [(110.0, 0.5), (130.8, 0.35), (164.8, 0.3), (220.0, 0.15)]).astype(np.float32)
KP = [(0, 0), (62.5, 0), (64.0, 0.6), (75.5, 0.6), (76.5, 0.0), (89.5, 0.0), (90.5, 0.5), (99.0, 0.3), (101.5, 0), (120, 0)]
pads = filt(pad[:, None], "lowpass", 1200, 2)[:, 0] * gain_curve(KP) * 0.05
music[:, 0] += pads; music[:, 1] += np.roll(pads, int(0.013 * SR))

# ---------------- mix ----------------
venv = signal.fftconvolve(np.abs(voice).mean(1), np.ones(int(0.25 * SR)) / (0.25 * SR), "same").astype(np.float32)
duck = (1 - 0.35 * np.clip(venv / (venv.max() * 0.25 + 1e-9), 0, 1))[:, None]
mix = voice + sfx * 0.9 + amb * duck + music * duck * 1.0
# total silence after the scare (end screen)
s0 = int(118.35 * SR)
mix[s0:] = 0
fade = int(0.02 * SR); mix[s0 - fade:s0] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(mix * 1.1) / 1.1
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "out", "mix_raw.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("mix written", pcm.shape, "peak", float(np.abs(mix).max()))
