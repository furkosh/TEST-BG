"""ÇARŞAMBA KARISI – 30 s intro soundtrack: narrator + the muffled voice behind the door, night / village / room
ambience, Foley (scream, running feet, fists on a door, the creature's rush, spinning wheel, fire, bolt, three knocks),
a synthesised score (drone, dissonant cluster, braams, risers, heartbeats) and hard silences: the black after the first
scare, and everything but the room cut away from the first knock on.
Writes out/mix_raw.wav (loudness normalisation happens in build_video.sh)."""
import json, os, subprocess, wave
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 30.0
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
ev = lambda k, i=0: EV[k][i] if isinstance(EV[k], list) else EV[k]
t = np.arange(N) / SR


def place(track, clip, t0, g=0.0, fin=0.01, fout=0.05):
    clip = clip.copy() * db(g)
    a, b = int(fin * SR), int(fout * SR)
    if a: clip[:a] *= np.linspace(0, 1, a)[:, None]
    if b: clip[-b:] *= np.linspace(1, 0, b)[:, None]
    s = int(t0 * SR)
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


def loopto(x, n):
    reps = int(np.ceil(n / len(x))) + 1
    return np.concatenate([x if i % 2 == 0 else x[::-1] for i in range(reps)])[:n]


def curve(K):
    return np.interp(t, [k[0] for k in K], [k[1] for k in K]).astype(np.float32)


voice = np.zeros((N, 2), np.float32); sfx = np.zeros((N, 2), np.float32)
amb = np.zeros((N, 2), np.float32); music = np.zeros((N, 2), np.float32)

def level(x, target=-20, amount=0.65, maxup=14):
    # gentle speech leveller: rides whispered phrase ends up toward the line's level
    k = int(0.08 * SR)
    env = np.sqrt(signal.fftconvolve((x ** 2).mean(1), np.ones(k) / k, "same").clip(1e-10))
    gdb = np.clip((target - 20 * np.log10(env + 1e-9)) * amount, -6, maxup)
    gdb[env < db(-55)] = 0
    g = db(signal.fftconvolve(gdb, np.ones(k) / k, "same"))
    return (x * g[:, None]).astype(np.float32)


# ---------------- voices ----------------
for k, c in CL.items():
    v = load(c["file"])
    v = level(norm(v, -20), -20)
    if c["voice"] == "creature":
        v = reverb(norm(v, -22), 0.9, 0.2, 2200, 4)              # behind the door: dull, boxy, close
    else:
        v = reverb(norm(filt(v, "highpass", 80, 2), -19), 0.9, 0.07, 4500, 3)
    place(voice, v, c["start"], 0, 0.004, 0.08)

# ---------------- ambience ----------------
wind, wind2 = filt(load(S + "wind.mp3"), "lowpass", 3200), filt(load(S + "wind_2.mp3"), "lowpass", 2400)
place(amb, loopto(wind, int(8.3 * SR)), 0.0, -14, 0.05, 0.02)                          # night street (S1-S2), cut at the black
place(amb, loopto(wind, int(0.9 * SR)), ev("far"), -15, 0.1, 0.1)
dusk = load(S + "dusk.mp3")
place(amb, cut(dusk, 0.6, 6.6), ev("village"), -12, 0.25, 0.4)                          # village at sunset / dusk
place(amb, loopto(wind2, int(6.2 * SR)), ev("tilt") - 0.2, -13, 0.4, 0.3)               # the creature's street
place(amb, filt(loopto(wind2, int(4.9 * SR)), "lowpass", 700), ev("room"), -20, 0.3, 0.2)  # wind outside the room
place(amb, filt(loopto(wind2, int(3.3 * SR)), "lowpass", 500), ev("eyes"), -30, 0.05, 0.4)  # only the room tone stays

# ---------------- Foley ----------------
scream, run, rush, pound, knocks = (load(S + f + ".mp3") for f in ("scream", "run", "rush", "pound", "knocks"))
place(sfx, cut(scream, 0.42, 2.3), 0.0, -3, 0.0, 0.5)                                    # first frame: her scream
place(sfx, filt(cut(run, 0.55, 4.7), "highpass", 90), 0.0, -6, 0.02, 0.3)                # her running feet
place(sfx, filt(cut(run, 5.0, 7.5), "lowpass", 2600), ev("door"), -15, 0.4, 0.0)        # its steps coming… that stop dead
sfx[int(ev("steps_stop") * SR):int((ev("steps_stop") + 0.02) * SR)] *= np.linspace(1, 0, int(0.02 * SR))[:, None]
place(sfx, cut(rush, 7.6, 8.5), 0.62, -14, 0.05, 0.2)                                    # darting shapes behind her
place(sfx, cut(rush, 3.1, 3.7), ev("low") + 0.28, -12, 0.02, 0.15)
place(sfx, cut(rush, 4.1, 4.7), ev("low") + 0.58, -10, 0.02, 0.15)
place(sfx, cut(rush, 5.0, 5.6), ev("low") + 0.88, -8, 0.02, 0.15)
whoosh = load(S + "whoosh.mp3")
place(sfx, cut(whoosh, 0.6, 1.8), ev("hit1") - 0.69, -2, 0.02, 0.2)                     # crash zoom
segs = [1.43, 1.93, 2.39, 4.49, 2.9, 4.03]                                                # single blows on the door
for k, tk in enumerate(EV["pounds"]):
    s0 = segs[k % len(segs)]
    place(sfx, cut(pound, s0 - 0.02, s0 + 0.32), tk - 0.02, -2 if k < 4 else -5, 0.0, 0.08)
place(sfx, cut(rush, 7.5, 8.9), ev("rush") - 0.4, 0, 0.05, 0.3)                          # it passes the camera
fire, wheel, bolt = load(S + "fire.mp3"), load(S + "wheel.mp3"), load(S + "bolt.mp3")
place(sfx, filt(cut(wheel, 0.1, 3.1), "lowpass", 5000), ev("room"), -13, 0.2, 0.25)       # the spinning wheel
place(sfx, cut(fire, 0.45, 1.25), ev("fire") - 0.1, -1, 0.01, 0.12)                        # thread bursts into flame
place(sfx, cut(fire, 1.6, 3.2), ev("react") - 0.02, -10, 0.05, 0.12)
place(sfx, reverb(cut(bolt, 1.2, 3.9), 0.6, 0.15, 4000, 5), ev("rattle", 0) - 0.09, -3, 0.0, 0.3)
for k, s0 in enumerate([1.15, 2.23, 3.66]):                                               # three knocks, dry and close
    kn = cut(knocks, s0 - 0.01, s0 + 0.32); kn = reverb(kn / np.abs(kn).max() * 0.9, 0.5, 0.18, 3500, 6 + k)
    place(sfx, kn, EV["knocks"][k] - 0.01, -3 if k < 2 else -1, 0.0, 0.1)
b1, b3, gasp = load(S + "breath_1.mp3"), load(S + "breath_3.mp3"), load(S + "gasp.mp3")
place(sfx, filt(cut(b1, 0.3, 1.5), "lowpass", 6000), ev("crash") + 0.05, -9, 0.05, 0.3)   # panting in the close-up
place(sfx, filt(cut(b3, 0.2, 1.1), "lowpass", 5000), ev("steps_stop") + 0.15, -11, 0.1, 0.3)  # holding her breath
place(sfx, cut(gasp, 0.0, 0.9), ev("appear") - 0.05, -9, 0.0, 0.2)
place(sfx, cut(gasp, 0.0, 0.8), ev("react") - 0.05, -10, 0.0, 0.2)
wh = filt(load(S + "whispers.mp3"), "highpass", 300)
place(sfx, reverb(cut(wh, 1.0, 4.2), 1.4, 0.4, 3500, 9), ev("tilt") + 0.2, -16, 0.6, 0.6)
place(sfx, reverb(cut(wh, 6.0, 7.2), 1.0, 0.35, 3500, 10), ev("silhouette") - 0.1, -14, 0.2, 0.4)
h2, h3, scare = load(S + "hit_2.mp3"), load(S + "hit_3.mp3"), load(S + "scare.mp3")
place(sfx, cut(h3, 0.1, 1.2), ev("hit1") - 0.05, -6, 0.0, 0.3)
place(sfx, cut(scare, 0.0, 0.32), ev("scare"), 2, 0.0, 0.03)                             # the scare… cut short by the black
place(sfx, cut(h2, 0.38, 0.7), ev("scare") - 0.02, 0, 0.0, 0.02)
place(sfx, cut(h3, 0.1, 1.6), ev("title", 0) - 0.05, -5, 0.0, 0.4)
place(sfx, cut(h2, 0.38, 1.6), ev("fire") - 0.02, -9, 0.0, 0.4)

# ---------------- score ----------------
dr = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f, a in [(36.7, 0.5), (36.9, 0.4), (55.0, 0.25), (73.4, 0.12), (77.8, 0.1)]).astype(np.float32)
KD = [(0, 0.9), (4.1, 0.6), (6.45, 0.9), (8.29, 1.0), (8.3, 0), (8.75, 0.3), (9.6, 0.25), (12.0, 0.35), (15.6, 0.7), (18.8, 1.0), (19.3, 0.5),
      (21.6, 0.45), (24.3, 0.7), (26.54, 0.9), (26.55, 0), (30, 0)]
mono = dr * curve(KD) * 0.3
music[:, 0] += mono; music[:, 1] += np.roll(mono, int(0.011 * SR))
cl = sum(((2 * ((f * t + ph) % 1) - 1) * a) for f, a, ph in [(98.0, 0.4, 0.1), (103.8, 0.35, 0.4), (146.8, 0.3, 0.7), (155.6, 0.25, 0.2), (207.7, 0.15, 0.5)]).astype(np.float32)
lfo = (0.5 + 0.5 * np.sin(2 * np.pi * 0.12 * t)).astype(np.float32)
clp = signal.sosfilt(signal.butter(2, 900, btype="lowpass", fs=SR, output="sos"), cl).astype(np.float32) * (0.4 + 0.6 * lfo)
KC = [(0, 0.5), (4.1, 0.3), (6.45, 0.6), (8.29, 0.9), (8.3, 0), (9.6, 0.1), (13.8, 0.3), (15.6, 0.5), (18.8, 0.8), (19.3, 0.3), (21.6, 0.3), (25.0, 0.6),
      (26.54, 0.85), (26.55, 0), (30, 0)]
cls = clp * curve(KC) * 0.05
music[:, 0] += cls; music[:, 1] += np.roll(cls, int(0.017 * SR))


def hightone(a, b, f0, f1, g):
    n = int((b - a) * SR); tt = np.arange(n) / SR; u = tt / (b - a)
    f = f0 + (f1 - f0) * u ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (u ** 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 6.5 * tt))
    place(music, np.stack([x, np.roll(x, 90)], 1).astype(np.float32), a, g, 0.2, 0.01)


hightone(ev("steps_stop"), ev("scare"), 2200, 5600, -28)
hightone(ev("bolt"), ev("music_cut"), 2600, 6400, -30)
hightone(ev("tilt"), ev("rush"), 1800, 3600, -34)


def braam(dur=3.0, f0=41.2, drive=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(a * (2 * ((f * tt + rng.random()) % 1) - 1) for f, a in [(f0, 1.0), (f0 * 1.005, 0.8), (f0 * 2, 0.6), (f0 * 3.01, 0.35), (f0 * 4.76, 0.2)])
    x = (np.tanh(drive * x / 3) * np.exp(-tt * 1.1) * np.minimum(1, tt / 0.015))[:, None].astype(np.float32)
    y = (filt(x, "lowpass", 900, 2) + filt(x, "bandpass", [900, 3000], 2) * np.exp(-tt * 6)[:, None] * 0.6)[:, 0]
    y /= np.abs(y).max()
    return np.stack([y, np.roll(y, int(0.008 * SR))], 1).astype(np.float32)


place(music, braam(2.2, 36.7), 0.0, -5, 0.0, 0.6)                                      # the very first frame hits
place(music, braam(1.0, 32.7), ev("scare"), -3, 0.0, 0.05)
place(music, braam(2.6, 30.9), ev("title", 0), -4, 0.0, 0.8)
place(music, braam(1.6, 36.7), ev("rush"), -8, 0.0, 0.5)


def beat():
    n = int(0.42 * SR); tt = np.arange(n) / SR; d = int(0.16 * SR)
    x = np.sin(2 * np.pi * 56 * tt) * np.exp(-tt * 28); x[d:] += 0.7 * np.sin(2 * np.pi * 70 * tt[: n - d]) * np.exp(-tt[: n - d] * 34)
    x = filt(np.stack([x, x], 1).astype(np.float32), "lowpass", 220, 2)
    return x / np.abs(x).max()


hb = beat()
for a, b, bpm0, bpm1, g0, g1 in [(ev("steps_stop") + 0.1, ev("scare") - 0.1, 76, 128, -8, -2), (ev("tilt"), ev("rush") - 0.2, 62, 90, -12, -6),
                                 (ev("voice") + 0.1, ev("black") - 0.1, 58, 66, -16, -11)]:
    tc = a
    while tc < b - 0.15:
        u = (tc - a) / (b - a); place(sfx, hb, tc, g0 + (g1 - g0) * u, 0, 0.05); tc += 60 / (bpm0 + (bpm1 - bpm0) * u)
place(sfx, hb, ev("black2") + 0.18, -3, 0, 0.05)                                         # one beat in the black

# deep, soft impact as the picture goes black and the story begins
n = int(0.9 * SR); tt = np.arange(n) / SR
sub = (np.sin(2 * np.pi * (48 - 14 * tt) * tt) * np.exp(-tt * 4.5) * np.minimum(1, tt / 0.01)).astype(np.float32)
place(sfx, np.stack([sub, sub], 1), ev("black"), -11, 0.0, 0.2)

# ---------------- mix ----------------
venv = signal.fftconvolve(np.abs(voice).mean(1), np.ones(int(0.25 * SR)) / (0.25 * SR), "same").astype(np.float32)
duck = (1 - 0.4 * np.clip(venv / (venv.max() * 0.25 + 1e-9), 0, 1))[:, None]
mix = voice + sfx * 0.9 + amb * duck + music * duck
# hard silences: the black after the scare (voice continues), and nothing but the voice/knocks after the music cut
gate = curve([(0, 1), (ev("black2") - 0.005, 1), (ev("black2"), 0), (ev("far") - 0.02, 0), (ev("far") + 0.05, 1), (30, 1)])[:, None]
mix = voice + (mix - voice) * gate
s1 = int(ev("black2") * SR); s2 = int(ev("far") * SR)
hbclip = np.zeros_like(mix); place(hbclip, hb, ev("black2") + 0.18, -3, 0, 0.05)
mix[s1:s2] += hbclip[s1:s2] * 0.9
mix = np.tanh(mix * 1.1) / 1.1
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "out", "mix_raw.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("mix written", pcm.shape, "peak", float(np.abs(mix).max()))
