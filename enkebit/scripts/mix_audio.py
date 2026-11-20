"""Build the 120 s soundtrack: narration + creature voice + SFX + synthesized drone/heartbeat.

Reads data/timeline.json for narration placement and sync events; writes out/mix_raw.wav.
Final loudness normalisation happens in scripts/build_video.sh (ffmpeg loudnorm).
"""
import json, os, subprocess
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 120.0
N = int(DUR * SR)
TL = json.load(open(os.path.join(ROOT, "data", "timeline.json"), encoding="utf-8"))
EV = TL["events"]
rng = np.random.default_rng(7)


def load(rel, ffilter=None):
    """Decode any audio file to float32 stereo @48k (optionally through an ffmpeg filter)."""
    cmd = ["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel)]
    if ffilter:
        cmd += ["-af", ffilter]
    cmd += ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-9)


def fade(x, fin=0.01, fout=0.05):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)[:, None]
    if b > 0:
        x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x


def place(track, clip, t, gain_db=0.0, fin=0.01, fout=0.05, pan=0.0):
    s = int(t * SR)
    if s >= len(track):
        return
    clip = fade(clip, fin, fout) * db(gain_db)
    if pan:
        clip = clip * np.array([np.sqrt(1 - max(0, pan)), np.sqrt(1 + min(0, pan))])[None, :] * np.sqrt(2) / 1.0
    e = min(len(track), s + len(clip))
    track[s:e] += clip[: e - s]


def cut(x, a, b):
    return x[int(a * SR): int(b * SR)]


def filt(x, kind, f, order=4):
    sos = signal.butter(order, f, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)


def reverb(x, secs=1.8, wet=0.25, dark=4000, seed=1):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = r.standard_normal((n, 2)).astype(np.float32) * np.exp(-np.linspace(0, 7, n))[:, None]
    ir = filt(ir, "lowpass", dark, 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x) + n] for c in range(2)], axis=1).astype(np.float32)
    out = np.zeros_like(y)
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


def envelope(x, win=0.005):
    m = np.abs(x).mean(axis=1)
    k = int(win * SR)
    return np.convolve(m, np.ones(k) / k, mode="same")


def onsets(x, thresh_ratio=0.35, min_gap=0.25):
    env = envelope(x)
    thr = env.max() * thresh_ratio
    idx, last = [], -10
    for i in np.where((env[1:] >= thr) & (env[:-1] < thr))[0]:
        if (i - last) / SR > min_gap:
            idx.append(i)
            last = i
    return [i / SR for i in idx]


def peak_time(x):
    return float(np.argmax(envelope(x, 0.01))) / SR


def autom(points):
    """piecewise-linear gain automation over the whole timeline: [(t, gain), ...]"""
    ts = np.array([p[0] for p in points]); gs = np.array([p[1] for p in points])
    return np.interp(np.arange(N) / SR, ts, gs).astype(np.float32)


voice = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
music = np.zeros((N, 2), np.float32)

# ---------------------------------------------------------------- narration
for key, c in TL["clips"].items():
    if key == "cr":
        continue
    x = load(c["file"])
    x = filt(x, "highpass", 75, 2)
    x *= db(-20) / rms(x)                       # consistent level across takes
    place(voice, x, c["start"], 0, 0.005, 0.08)
voice = reverb(voice, 0.9, 0.10, 3500, 3)[:N]   # small dry village room

# ---------------------------------------------------------------- creature voice "Gözlerini kapatma."
cr = TL["clips"]["cr"]
low = load(cr["file"], "asetrate=48000*0.76,aresample=48000,atempo=1.3158")   # ~ -4.7 st, same duration
mid = load(cr["file"])
high = load(cr["file"], "asetrate=48000*1.22,aresample=48000,atempo=0.8197")  # forked upper layer
L = min(len(low), len(mid), len(high))
low, mid, high = low[:L], mid[:L], high[:L]
lowd = np.tanh(low * 6.0) * 0.5                                   # gritty, broken
crv = lowd * 1.0 + np.roll(mid, int(0.012 * SR), axis=0) * 0.45 + high * 0.18
crv = filt(filt(crv, "highpass", 110, 2), "lowpass", 6500, 2)
crv[:, 0] = np.roll(crv[:, 0], int(0.004 * SR))                   # slight width, very close to the ear
crv *= db(-17) / rms(crv)
crv = reverb(crv, 1.4, 0.22, 2500, 9)
place(voice, crv, cr["start"], 0, 0.01, 0.4)

# ---------------------------------------------------------------- SFX
S = "audio/sfx_raw/"
# Scene 1: nails on wood, reverse whoosh + impact on the lunge
scr = load(S + "scratch_4.mp3")
place(sfx, cut(scr, 0.0, 3.2), EV["s1_scratch"], -3, 0.05, 0.6)
hit = load(S + "hit_1.mp3")
pk = peak_time(hit)
place(sfx, hit, EV["s1_black"] - pk - 0.02, -6, 0.0, 0.8)
place(sfx, filt(load(S + "breath_3.mp3"), "lowpass", 3000), 2.2, -10, 0.2, 0.5)

# Scene 2: winter wind through the village, distant dog
wind = load(S + "wind_3.mp3")
place(sfx, cut(wind, 0, 16.5), 9.6, -4, 1.0, 1.4)
dog = load(S + "dog_1.mp3")
place(sfx, reverb(filt(dog, "lowpass", 3500), 2.5, 0.35, 3000, 4), 14.2, -9, 0.1, 1.0, pan=-0.3)
# interior: wind muffled through the walls for the rest of the night
wind2 = filt(np.concatenate([load(S + "wind_1.mp3"), load(S + "wind_4.mp3"), load(S + "wind_2.mp3"), load(S + "wind_1.mp3")]), "lowpass", 900)
place(sfx, cut(wind2, 0, 75.5), 25.0, -10, 1.0, 1.5)

# Scene 3: candle out, bed creak, three knocks, scratching, breath at the ear
cdl = load(S + "candle_1.mp3")
place(sfx, cdl, EV["s3_candle_out"] - peak_time(cdl) + 0.02, -2, 0.0, 0.3)
crk = load(S + "creak_2.mp3")
place(sfx, cut(crk, 0, 2.6), 27.6, -8, 0.1, 0.6)
kn = load(S + "knock_4.mp3")
ons = [0.68, 1.14, 1.62]                        # envelope peaks of the three separate knocks in this take
for i, t in enumerate(EV["knocks"]):
    p = ons[i]
    one = cut(kn, p - 0.06, p + 0.36)
    place(sfx, one, t - 0.04, 1 + [5.3, 0.0, 2.7][i], 0.002, 0.12)   # equalise the three knocks
scr2 = load(S + "scratch_2.mp3")
place(sfx, cut(scr2, 0.5, 3.8), EV["s3_scratch"][0], -4, 0.1, 0.5)
br = load(S + "breath_2.mp3")
place(sfx, br, EV["s3_breath"] - 0.15, -2, 0.02, 0.5, pan=0.45)

# Scene 4: suppressed scream, blanket pressing down, bones unfolding
place(sfx, load(S + "moan_2.mp3"), EV["s4_moan"], -9, 0.05, 0.5)
place(sfx, load(S + "blanket_1.mp3"), EV["s4_blanket"], -2, 0.1, 0.6)
bon = load(S + "bones_3.mp3")
place(sfx, bon, EV["s4_rise"][0] + 0.2, -6, 0.1, 0.6)

# Scene 5: bony steps, joints cracking, climbing onto the bed, settling on the chest
place(sfx, cut(load(S + "steps_2.mp3"), 0, 4.6), 60.1, -5, 0.1, 0.5)
place(sfx, cut(load(S + "bones_2.mp3"), 0, 3.5), 66.9, -9, 0.05, 0.5)
place(sfx, cut(load(S + "bones_1.mp3"), 0, 2.5), EV["s5_climb"], -7, 0.02, 0.4)
place(sfx, cut(load(S + "blanket_3.mp3"), 0, 5.0), 72.4, -3, 0.1, 0.8)
crb = filt(load(S + "breath_1.mp3"), "lowpass", 4000)
place(sfx, crb, 75.3, -8, 0.1, 0.6)
place(sfx, crb, 78.0, -8, 0.1, 0.6)

# Scene 6: only heartbeat, breath and nails (music almost gone)
place(sfx, cut(load(S + "scratch_3.mp3"), 0.8, 3.2), 84.3, -14, 0.2, 0.6)
place(sfx, filt(load(S + "breath_4.mp3"), "lowpass", 5000), 89.6, -9, 0.2, 0.4, pan=0.4)
place(sfx, cut(load(S + "scratch_1.mp3"), 0.4, 5.0), EV["s6_trace"][0] + 0.3, -8, 0.4, 0.8)

# Scene 7: sudden wake-up gasp, morning ambience, steps to the mirror
gsp = load(S + "gasp_3.mp3")
gp = onsets(gsp, 0.3)[0] if onsets(gsp, 0.3) else 0.0
place(sfx, cut(gsp, max(0, gp - 0.05), gp + 6.5), EV["s7_gasp"] - 0.02, -4, 0.005, 1.5)
mor = load(S + "morning_2.mp3")
place(sfx, cut(mor, 0, 18.0), 100.6, -8, 0.3, 1.0)
place(sfx, cut(load(S + "creak_3.mp3"), 1.0, 4.5), 108.4, -10, 0.2, 0.6)

# Scene 8: a final single scrape very close, then absolute silence
fin = load(S + "scratch_4.mp3")
place(sfx, cut(fin, 0.2, 0.95), EV["final_scrape"], 2, 0.005, 0.25)

# ---------------------------------------------------------------- synthesized score
t = np.arange(N) / SR
# low drone: detuned fundamentals with slow beating + filtered brown noise
dr = np.zeros(N, np.float32)
for f, a in [(36.7, 0.5), (36.95, 0.4), (55.0, 0.32), (73.4, 0.18), (110.3, 0.06)]:
    dr += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)).astype(np.float32)
brown = np.cumsum(rng.standard_normal(N)).astype(np.float32)
brown = filt(brown[:, None], "bandpass", [30, 260], 2)[:, 0]
brown /= np.abs(brown).max()
dr = dr * 0.6 + brown * 0.5
# dissonant upper cluster (enters after 60 s)
cl = np.zeros(N, np.float32)
for f in [233.1, 246.9, 261.6, 622.3]:
    cl += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)).astype(np.float32) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t + f))
cl /= 4
# thin high glass tone with tremolo
hi = (np.sin(2 * np.pi * 1244.5 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t))).astype(np.float32)

g_dr = autom([(0, 0), (0.6, 0.45), (9.4, 0.7), (9.5, 0.0), (10.2, 0.0), (12, 0.3), (25, 0.35), (33, 0.45), (42, 0.55),
              (60, 0.75), (72, 0.85), (79.5, 0.9), (80.6, 0.07), (99.8, 0.05), (100.5, 0.0), (101.5, 0.0), (104, 0.15),
              (112, 0.25), (116.3, 0.6), (118.5, 0.85), (118.56, 0.0), (120, 0.0)])
g_cl = autom([(0, 0), (52, 0.0), (60, 0.25), (72, 0.45), (79.5, 0.6), (80.4, 0.0), (113, 0.0), (116.3, 0.25), (118.5, 0.55), (118.56, 0), (120, 0)])
g_hi = autom([(0, 0), (3, 0.0), (5, 0.05), (9.4, 0.08), (9.5, 0), (40, 0), (44, 0.04), (60, 0.0), (66.8, 0.05), (70, 0.0),
              (98.6, 0.0), (99.2, 0.06), (100.4, 0.0), (116.3, 0.0), (117.0, 0.05), (118.55, 0.08), (118.56, 0), (120, 0)])
mono = dr * g_dr * 0.32 + cl * g_cl * 0.10 + hi * g_hi * 0.12
music[:, 0] += mono
music[:, 1] += np.roll(mono, int(0.011 * SR))   # gentle width

# reverse whoosh into the intro lunge
a, b = 8.2, EV["s1_black"]
n = int((b - a) * SR)
wh = filt(rng.standard_normal((n, 2)).astype(np.float32), "bandpass", [300, 5000], 2) * np.linspace(0, 1, n)[:, None] ** 3
place(sfx, wh * 0.35, a, 0, 0.0, 0.01)

# sub boom on the final hard cut
n = int(1.6 * SR); tt = np.arange(n) / SR
boom = (np.sin(2 * np.pi * (48 - 14 * tt) * tt) * np.exp(-tt * 3.2)).astype(np.float32)
place(sfx, np.stack([boom, boom], 1) * 0.55, EV["s8_black"], 0, 0.002, 0.3)

# heartbeat: lub-dub with tempo schedule
def beat_sample():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    lub = np.sin(2 * np.pi * 58 * tt) * np.exp(-tt * 28) + 0.4 * np.sin(2 * np.pi * 115 * tt) * np.exp(-tt * 45)
    d = int(0.17 * SR)
    dub = np.zeros(n); tt2 = tt[: n - d]
    dub[d:] = 0.7 * (np.sin(2 * np.pi * 72 * tt2) * np.exp(-tt2 * 34))
    x = (lub + dub).astype(np.float32)
    x = filt(np.stack([x, x], 1), "lowpass", 220, 2)
    return x / np.abs(x).max()

hb = beat_sample()
segments = [(42.0, 60.0, 68, 108, 0.45, 0.8), (60.0, 80.0, 108, 124, 0.8, 0.9), (80.0, 99.6, 126, 138, 0.95, 1.0),
            (100.7, 105.5, 122, 84, 0.8, 0.3), (112.4, 118.5, 76, 112, 0.35, 0.85)]
for (s0, s1, b0, b1, g0, g1) in segments:
    tcur = s0
    while tcur < s1:
        u = (tcur - s0) / (s1 - s0)
        bpm = b0 + (b1 - b0) * u
        g = g0 + (g1 - g0) * u
        if 97.2 < tcur < 99.6:                 # irregular, failing near "nefes alamıyordum"
            g *= 0.6 + 0.4 * rng.random()
        place(sfx, hb, tcur, 20 * np.log10(g) - 3, 0.0, 0.05)
        tcur += 60.0 / bpm * (1.0 + (0.18 * rng.standard_normal() if 97.2 < tcur < 99.6 else 0.0))

# ear ringing as his vision fades
a, b = 98.6, 100.5
n = int((b - a) * SR); tt = np.arange(n) / SR
ring = (np.sin(2 * np.pi * 6200 * tt) * np.minimum(1, tt / 1.2) * 0.02).astype(np.float32)
place(sfx, np.stack([ring, ring], 1), a, 0, 0.3, 0.1)

# ---------------------------------------------------------------- bus mix
voice_env = envelope(voice, 0.12)
duck = 1.0 - 0.35 * np.clip(voice_env / (voice_env.max() * 0.25), 0, 1)
music *= duck[:, None]
mix = voice * 1.0 + sfx * 0.9 + music * 1.0

# absolute silence after the final scrape
silence_from = int((EV["final_scrape"] + 0.8) * SR)
tail = int(0.15 * SR)
mix[silence_from - tail: silence_from] *= np.linspace(1, 0, tail)[:, None]
mix[silence_from:] = 0
# also hard silence for the first 0.05 s
mix[: int(0.05 * SR)] = 0

peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 0.89
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
out = os.path.join(ROOT, "out", "mix_raw.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-",
                "-c:a", "pcm_s24le", out], input=mix.astype(np.float32).tobytes(), check=True)
print("wrote", out, f"{len(mix) / SR:.2f}s", "knock onsets:", [round(o, 2) for o in ons[:4]], "hit peak:", round(pk, 2))
