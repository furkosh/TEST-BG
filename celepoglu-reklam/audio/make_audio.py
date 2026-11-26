#!/usr/bin/env python3
"""Celepoğlu Taşımacılık reklam filmi – ses miksajı.
Seslendirme (ElevenLabs) + prosedürel orkestral müzik + ses efektleri -> audio/mix.wav (48 kHz, stereo, 60 sn)
"""
import subprocess, os, numpy as np

SR = 48000
DUR = 60.0
N = int(DUR * SR)
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
rng = np.random.default_rng(7)


def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def place(buf, x, t, gain=1.0, fade_in=0.0, fade_out=0.0):
    x = x.copy()
    if x.ndim == 1: x = np.stack([x, x], 1)
    n = len(x)
    if fade_in > 0:
        k = min(n, int(fade_in * SR)); x[:k] *= np.linspace(0, 1, k)[:, None]
    if fade_out > 0:
        k = min(n, int(fade_out * SR)); x[n - k:] *= np.linspace(1, 0, k)[:, None]
    i0 = int(round(t * SR))
    if i0 < 0: x = x[-i0:]; i0 = 0
    i1 = min(len(buf), i0 + len(x))
    if i1 > i0: buf[i0:i1] += x[:i1 - i0] * gain


def fft_filter(x, lo=None, hi=None, sr=SR):
    """Yumuşak geçişli FFT bant filtresi (mono ya da stereo)."""
    n = len(x); nf = 1 << int(np.ceil(np.log2(n + 1)))
    X = np.fft.rfft(x, nf, axis=0)
    f = np.fft.rfftfreq(nf, 1 / sr)
    g = np.ones_like(f)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if x.ndim == 2: g = g[:, None]
    return np.fft.irfft(X * g, nf, axis=0)[:n]


def convolve(x, ir):
    n = len(x) + len(ir) - 1; nf = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[:len(x)]


def reverb(x, decay=2.4, wet=0.25, pre=0.02, bright=6000):
    L = int(decay * 1.3 * SR)
    t = np.arange(L) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(L) * np.exp(-t * 6.9 / decay)
        ir = fft_filter(ir, lo=180, hi=bright)
        ir[: int(pre * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = convolve(x[:, ch], ir)
    return x * (1 - wet) + out * wet * 1.6


def midi(m): return 440.0 * 2 ** ((m - 69) / 12)


def pan(x, p):
    p = np.clip(p, -1, 1); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


# ------------------------------------------------- enstrümanlar
def piano(f, dur, vel=0.5):
    L = int((dur + 2.2) * SR); t = np.arange(L) / SR
    y = np.zeros(L)
    B = 0.0004
    for k in range(1, 11):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 16000: break
        a = vel / k ** 1.25 * (1.0 if k > 1 else 1.2)
        y += a * np.sin(2 * np.pi * fk * t + rng.random() * 6.28) * np.exp(-t * (0.55 + 0.38 * k) * (f / 260) ** 0.35)
    att = np.minimum(1, t / 0.004)
    rel = np.where(t > dur, np.exp(-(t - dur) * 5.0), 1.0)
    ham = rng.standard_normal(L) * np.exp(-t * 180) * 0.04 * vel
    return (y * att * rel + ham) * 0.6


def saw_add(f, t, nh=24, detune=0.0):
    y = np.zeros_like(t); ph = rng.random() * 6.28
    vib = 1 + 0.0022 * np.sin(2 * np.pi * 5.3 * t + ph) * np.minimum(1, t / 0.6)
    phase = 2 * np.pi * f * (1 + detune) * np.cumsum(vib) / SR
    for k in range(1, nh + 1):
        if f * k > 12000: break
        y += np.sin(k * phase + ph * k) / k
    return y


def strings(f, dur, vel=0.3, attack=0.35, release=0.6, voices=4):
    L = int((dur + release + 0.1) * SR); t = np.arange(L) / SR
    y = np.zeros(L)
    for v in range(voices):
        d = (v - (voices - 1) / 2) * 0.0035
        y += saw_add(f, t, nh=int(min(28, 9000 / f)), detune=d)
    y /= voices
    env = np.minimum(1, t / attack) ** 1.5
    env *= np.where(t > dur, np.exp(-(t - dur) * 4.5 / release), 1.0)
    return y * env * vel


def stacc(f, vel=0.3):
    L = int(0.45 * SR); t = np.arange(L) / SR
    y = (saw_add(f, t, nh=int(min(22, 8000 / f))) + saw_add(f, t, nh=int(min(22, 8000 / f)), detune=0.004)) / 2
    env = np.minimum(1, t / 0.008) * np.exp(-t * 9)
    return y * env * vel


def bass(f, dur, vel=0.5):
    L = int((dur + 0.3) * SR); t = np.arange(L) / SR
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 1.2) * np.where(t > dur, np.exp(-(t - dur) * 20), 1)
    return y * env * vel


def kick(vel=0.8):
    L = int(0.6 * SR); t = np.arange(L) / SR
    f = 46 + 110 * np.exp(-t * 32)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    y += fft_filter(rng.standard_normal(L), lo=1500, hi=6000) * np.exp(-t * 250) * 0.25
    return np.tanh(y * 1.4) * vel


def timpani(f, vel=0.6):
    L = int(2.2 * SR); t = np.arange(L) / SR
    y = np.zeros(L)
    for r, a, d in [(1, 1, 1.6), (1.5, 0.5, 2.2), (1.98, 0.35, 2.8), (2.44, 0.2, 3.5)]:
        y += a * np.sin(2 * np.pi * f * r * (1 + 0.02 * np.exp(-t * 8)) * t) * np.exp(-t * d)
    y += fft_filter(rng.standard_normal(L), lo=80, hi=900) * np.exp(-t * 30) * 0.5
    return y * np.minimum(1, t / 0.003) * vel


def crash(vel=0.4, decay=2.8):
    L = int((decay + 0.5) * SR); t = np.arange(L) / SR
    y = fft_filter(rng.standard_normal((L, 2)), lo=3500, hi=15000) * np.exp(-t * 3.0 / decay)[:, None]
    return y * np.minimum(1, t / 0.002)[:, None] * vel


def boom(vel=1.0):
    L = int(4.5 * SR); t = np.arange(L) / SR
    f = 30 + 34 * np.exp(-t * 3.5)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    y = np.tanh(y * 2.2) * 0.8
    y += fft_filter(rng.standard_normal(L), lo=30, hi=400) * np.exp(-t * 4) * 0.6
    y += fft_filter(rng.standard_normal(L), lo=2000, hi=9000) * np.exp(-t * 40) * 0.3
    return y * vel


def riser(dur, vel=0.4):
    L = int(dur * SR); t = np.arange(L) / SR
    c = crash(1.0, decay=dur)[:L][::-1]
    sweep = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t / dur * 2.5)) / SR) * (t / dur) ** 2 * 0.25
    env = (t / dur) ** 2.2
    return (c * env[:, None] * 0.8 + pan(sweep, 0)) * vel


def whoosh(dur=0.8, vel=0.35, peak=0.7):
    L = int(dur * SR); t = np.arange(L) / SR
    n = rng.standard_normal(L)
    lo = fft_filter(n, lo=300, hi=1500); hi = fft_filter(n, lo=1500, hi=7000)
    k = t / dur
    env = np.where(k < peak, (k / peak) ** 2.5, np.exp(-(k - peak) / (1 - peak) * 5))
    y = lo * env + hi * env ** 2 * 0.7
    p = np.linspace(-0.7, 0.7, L)
    a = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(a), y * np.sin(a)], 1) * vel


def bird(f0=3200, vel=0.05):
    L = int(0.18 * SR); t = np.arange(L) / SR
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 18 * t)) * (1 + 0.4 * t / 0.18)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18) ** 2
    return y * vel


def bell(f, vel=0.15):
    L = int(1.6 * SR); t = np.arange(L) / SR
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 3), (2.76, 0.4, 6), (5.4, 0.2, 10)])
    return y * np.minimum(1, t / 0.002) * vel


def click(vel=0.5):
    L = int(0.12 * SR); t = np.arange(L) / SR
    y = fft_filter(rng.standard_normal(L), lo=1800, hi=8000) * (np.exp(-t * 400) + 0.8 * np.exp(-np.maximum(0, t - 0.035) * 500) * (t > 0.035))
    y += np.sin(2 * np.pi * 3300 * t) * np.exp(-t * 60) * 0.25 * (t > 0.035)
    return y * vel


# ------------------------------------------------- müzik
BPM = 96; BEAT = 60 / BPM; BAR = BEAT * 4  # 2.5 sn
# akorlar (MIDI): D, A/C#, Bm, G   -- build: Bm, G, D, A
CH = {'D': [50, 57, 62, 66, 69], 'A/C#': [49, 57, 61, 64, 69], 'Bm': [47, 54, 59, 62, 66], 'G': [43, 55, 59, 62, 67], 'A': [45, 52, 57, 61, 64], 'Em': [40, 52, 55, 59, 64]}
PROG = ['D', 'A/C#', 'Bm', 'G'] * 4 + ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A']
music = {k: np.zeros((N + 6 * SR, 2)) for k in ['piano', 'str', 'stacc', 'bass', 'perc', 'fx']}


def add(stem, x, t, p=0.0, g=1.0):
    if x.ndim == 1: x = pan(x, p)
    place(music[stem], x, t, g)


for b, chn in enumerate(PROG[:22]):
    t0 = b * BAR
    if t0 >= 55.0: break
    c = CH[chn]
    # dinamik eğrisi
    if b <= 2: dyn = 0.45 + 0.05 * b
    elif b <= 6: dyn = 0.6
    elif b <= 10: dyn = 0.7
    elif b <= 14: dyn = 0.68
    elif b <= 19: dyn = 0.75 + (b - 15) * 0.06
    else: dyn = 0.8
    # piyano
    if b <= 2:
        for i, m in enumerate([c[2], c[3], c[4], c[3]]):
            add('piano', piano(midi(m + 12), BEAT * 1.6, 0.30 + 0.05 * (i == 0)), t0 + i * BEAT, p=-0.2 + 0.1 * i)
        add('piano', piano(midi(c[0]), BAR, 0.3), t0, p=-0.3)
    elif b <= 19:
        pat = [c[1], c[2], c[3], c[4], c[3] + 12, c[4], c[3], c[2]]
        for i, m in enumerate(pat):
            v = 0.24 + 0.06 * (i % 4 == 0)
            if b >= 11 and b <= 14: v *= 0.9
            add('piano', piano(midi(m + 12), BEAT * 0.9, v * (0.8 if b >= 15 else 1)), t0 + i * BEAT / 2, p=-0.35 + 0.1 * (i % 8))
        if b in (11, 12, 13, 14):  # zarif melodi
            mel = {11: [78, 76], 12: [76, 73], 13: [74, 78], 14: [79, 78]}[b]
            add('piano', piano(midi(mel[0]), BEAT * 1.8, 0.32), t0, p=0.2)
            add('piano', piano(midi(mel[1]), BEAT * 1.8, 0.28), t0 + 2 * BEAT, p=0.2)
    # yaylılar (legato)
    if b >= 1:
        sv = 0.10 if b <= 6 else (0.13 if b <= 14 else 0.16 + (b - 15) * 0.03)
        for m in c[1:5]:
            add('str', strings(midi(m), BAR, sv * dyn, attack=0.5 if b <= 14 else 0.25), t0, p=(m - 60) / 30)
        add('str', strings(midi(c[0] - 12 if c[0] > 45 else c[0]), BAR, sv * 1.1 * dyn, attack=0.4), t0, p=-0.1)
        if b >= 15:
            add('str', strings(midi(c[4] + 12), BAR, 0.06 + (b - 15) * 0.02, attack=0.3), t0, p=0.3)
    # staccato ostinato
    if 7 <= b <= 19 and not (11 <= b <= 12):
        for i in range(8):
            m = [c[1], c[2], c[1], c[3], c[1], c[2], c[1], c[4]][i]
            add('stacc', stacc(midi(m), 0.16 * dyn), t0 + i * BEAT / 2, p=0.25 * (1 if i % 2 else -1))
    # bas
    if b >= 3:
        if b <= 6: add('bass', bass(midi(c[0] - 12 if c[0] > 40 else c[0]), BAR * 0.95, 0.35), t0)
        else:
            for i in range(8 if b >= 15 else 4):
                step = BAR / (8 if b >= 15 else 4)
                add('bass', bass(midi(c[0] - 12 if c[0] > 40 else c[0]), step * 0.85, 0.32 + 0.04 * (i == 0)), t0 + i * step)
    # perküsyon
    if 7 <= b <= 10:
        for i in (0, 2): add('perc', kick(0.45), t0 + i * BEAT)
    if 11 <= b <= 14:
        add('perc', kick(0.35), t0)
    if 15 <= b <= 19:
        for i in range(4): add('perc', kick(0.5 + (b - 15) * 0.05), t0 + i * BEAT)
        add('perc', timpani(midi(c[0] - 12 if c[0] > 40 else c[0]), 0.45), t0)
        add('perc', timpani(midi(c[0] - 12 if c[0] > 40 else c[0]), 0.3), t0 + 2 * BEAT)
    if b == 19:  # timpani rulosu
        for i in range(16): add('perc', timpani(midi(45), 0.12 + i * 0.02), t0 + 2 * BEAT + i * BEAT / 8)

# 37.5'te crash, 50'de büyük akor
add('perc', crash(0.35), 37.5)
add('perc', crash(0.45), 50.0)
for m in [38, 50, 57, 62, 66, 69, 74]:
    add('str', strings(midi(m), 5.0, 0.11, attack=0.08, release=1.2), 50.0, p=(m - 60) / 30)
add('perc', timpani(midi(38), 0.7), 50.0)
add('piano', piano(midi(62), 3.0, 0.35), 50.0); add('piano', piano(midi(66), 3.0, 0.3), 50.0); add('piano', piano(midi(69), 3.0, 0.3), 50.0)
# 52.5'te yumuşak geçiş akoru (G)
for m in [43, 55, 59, 62, 67]:
    add('str', strings(midi(m), 3.0, 0.08, attack=0.6, release=0.8), 52.5, p=(m - 60) / 30)
# riser -> logo vuruşu 55.75
HIT = 55.75
add('fx', riser(2.2, 0.45), HIT - 2.2)
add('fx', boom(1.0), HIT)
add('perc', crash(0.6, 4.0), HIT)
add('perc', timpani(midi(38), 0.9), HIT)
for m in [26, 38, 50, 57, 62, 66, 69, 74, 78]:
    add('str', strings(midi(m), 3.6, 0.12 if m > 30 else 0.18, attack=0.03, release=1.6), HIT, p=(m - 60) / 30)
for m in [62, 66, 69, 74]:
    add('piano', piano(midi(m), 3.5, 0.35), HIT + 0.02)

# stem işleme
music['str'] = fft_filter(music['str'], lo=60, hi=5200)
music['stacc'] = fft_filter(music['stacc'], lo=120, hi=6500)
music['bass'] = fft_filter(music['bass'], hi=900)
mus = (music['piano'] * 0.9 + music['str'] * 1.0 + music['stacc'] * 0.8 + music['bass'] * 0.9 + music['perc'] * 0.9)
mus = reverb(mus, decay=2.6, wet=0.30)
mus += music['fx']
mus = mus[:N]

# ------------------------------------------------- seslendirme
vo_src = load(os.path.join(SRC, 'vo_take1.mp3'))
VO_SEG = [  # (kaynak başlangıç, bitiş, filmdeki zaman)
    (0.00, 3.42, 1.25),     # Her yolculuk, bir güven hikâyesiyle başlar.
    (4.70, 11.05, 8.05),    # Kimi zaman ... çocuklarımızı ...
    (11.92, 19.03, 19.0),   # Kimi zaman ... çalışanlarımızı ...
    (19.90, 26.03, 29.15),  # Özel yolculuklarınızda ...
    (26.90, 34.12, 38.3),   # Modern araçlarımız ... yanınızdayız.
    (35.00, 39.25, 45.85),  # Çünkü biz, sadece yolcu değil... sorumluluk taşıyoruz.
    (40.28, 45.58, 51.15),  # Celepoğlu Taşımacılık. Güvenle başlayan ...
    (46.28, 48.64, 56.95),  # Yolunuz, güvenle bizimle.
]
vo = np.zeros((N, 2))
for a, b_, t in VO_SEG:
    seg = vo_src[int(a * SR):int(b_ * SR)]
    place(vo, seg, t, 1.0, fade_in=0.02, fade_out=0.06)
vo = fft_filter(vo, lo=75)
vo_peak = np.max(np.abs(vo)); vo *= 0.70 / vo_peak
vo_room = reverb(vo, decay=0.6, wet=0.08, bright=9000)

# ------------------------------------------------- ses efektleri
sfx = np.zeros((N + 2 * SR, 2))
eng = load(os.path.join(SRC, 'sfx', 'engine3.mp3'))  # 14 sn, tepe ~6 sn
eng2 = load(os.path.join(SRC, 'sfx', 'engine2.mp3'))
kids = load(os.path.join(SRC, 'sfx', 'kids3.mp3'))
door = load(os.path.join(SRC, 'sfx', 'door2.mp3'))
birds = [load(os.path.join(SRC, 'sfx', f'birds{i}.mp3')) for i in (1, 2, 3)]
E = lambda a, b_: eng[int(a * SR):int(b_ * SR)]
# Sahne 1: kuşlar + uzaktan gelen motor
for i in range(26):
    tt = 0.3 + rng.random() * 6.4
    place(sfx, pan(bird(2600 + rng.random() * 2200, 0.035 + rng.random() * 0.03), rng.uniform(-0.8, 0.8)), tt)
for i, tt in enumerate([0.6, 2.4, 4.3, 5.8]):
    place(sfx, birds[i % 3], tt, 0.35, fade_in=0.05, fade_out=0.2)
place(sfx, E(0.5, 6.4), 1.1, 0.5, fade_in=1.5, fade_out=0.25)       # 1B yaklaşan araç (kesmeye kadar)
# Sahne 2: çocuk ambiyansı (döngü), fren, kapı
amb = np.concatenate([kids, kids[int(0.5 * SR):], kids[int(1.0 * SR):]])
place(sfx, amb[: int(8.6 * SR)], 7.0, 0.55, fade_in=0.15, fade_out=0.6)
place(sfx, fft_filter(amb[int(8.4 * SR): int(11.2 * SR)], hi=900), 15.3, 0.25, fade_in=0.2, fade_out=0.6)  # içeriden boğuk
place(sfx, E(6.6, 9.4), 7.0, 0.45, fade_in=0.05, fade_out=1.2)       # yavaşlayan araç
place(sfx, fft_filter(rng.standard_normal((int(0.5 * SR), 2)), lo=2500, hi=7000) * np.exp(-np.arange(int(0.5 * SR)) / SR * 6)[:, None] * 0.05, 9.5)  # fren havası
place(sfx, door, 9.9, 0.9, fade_out=0.1)
# Sahne 3: OSB ortam + sürüş
ind = fft_filter(rng.standard_normal((int(10 * SR), 2)), lo=60, hi=700) * 0.025
place(sfx, ind, 18.0, 1.0, fade_in=0.3, fade_out=0.5)
place(sfx, eng2, 20.9, 0.35, fade_in=0.05, fade_out=0.6)
place(sfx, E(4.0, 8.2), 21.0, 0.28, fade_in=0.5, fade_out=0.2)       # drone - uzak
place(sfx, E(4.6, 8.2), 24.6, 0.55, fade_in=0.08, fade_out=0.4)      # yanında takip
# Sahne 4: VIP – akşam ortamı, kır yolu
eve = fft_filter(rng.standard_normal((int(3.3 * SR), 2)), lo=100, hi=1500) * 0.012
place(sfx, eve, 28.0, 1.0, fade_in=0.2, fade_out=0.3)
for i in range(8): place(sfx, pan(bird(3800 + rng.random() * 1500, 0.02), rng.uniform(-0.6, 0.6)), 34.3 + rng.random() * 3.5)
place(sfx, E(3.0, 7.0), 34.2, 0.3, fade_in=0.3, fade_out=0.4)
# Sahne 5: far, gösterge, kemer, geçiş
place(sfx, pan(np.sin(2 * np.pi * 95 * np.arange(int(0.35 * SR)) / SR) * np.exp(-np.arange(int(0.35 * SR)) / SR * 9) * 0.25, 0), 40.62)
place(sfx, whoosh(0.5, 0.12, 0.3), 40.5)
place(sfx, pan(bell(1318.5, 0.10), -0.1), 41.72); place(sfx, pan(bell(1975.5, 0.08), 0.1), 41.86)
place(sfx, pan(click(0.6), 0.0), 42.9 + 0.79)
place(sfx, E(1.0, 9.5), 42.2, 0.75, fade_in=2.0, fade_out=1.0)      # 5E/5F geçiş, tepe ~47.2-48
# Geçiş whoosh'ları
for c in [7.0, 18.0, 28.0, 38.0, 50.0]:
    place(sfx, whoosh(0.9, 0.22, 0.72), c - 0.65)
sfx = sfx[:N]

# ------------------------------------------------- miks + ducking
env = np.sqrt(np.maximum(0, fft_filter(np.mean(vo ** 2, 1), hi=6)))
env = np.maximum(env, 0); env /= np.max(env) + 1e-9
duck = 1 - 0.62 * np.clip(env * 3.0, 0, 1)
# yumuşatma (yükselme 60ms / düşme 450ms)
d = np.empty_like(duck); a_up = np.exp(-1 / (0.45 * SR)); a_dn = np.exp(-1 / (0.06 * SR)); prev = 1.0
for i in range(0, N, 64):
    v = duck[i]; prev = a_dn * prev + (1 - a_dn) * v if v < prev else a_up * prev + (1 - a_up) * v
    d[i:i + 64] = prev
mus_g = 0.42
mix = mus * mus_g * d[:, None] + sfx * 0.9 * (0.6 + 0.4 * d[:, None]) + vo + vo_room * 0.6
act = env > 0.25
_db = lambda x: 10 * np.log10(np.mean(x[act] ** 2) + 1e-12)
print('VO aktifken  VO: %.1f dB  müzik: %.1f dB  efekt: %.1f dB' % (_db(vo), _db(mus * mus_g * d[:, None]), _db(sfx * 0.9)))
# son 0.4 sn fade-out
k = int(0.5 * SR); mix[-k:] *= np.linspace(1, 0, k)[:, None] ** 1.5
# yumuşak limitleyici
pk = np.max(np.abs(mix)); mix = mix / pk * 0.98
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
mix *= 0.89  # ~ -1 dBFS tepe
out = os.path.join(HERE, 'mix_raw.wav')
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
# ayrı stemler (düzenleme için)
for name, x in [('music', mus * mus_g), ('vo', vo), ('sfx', sfx)]:
    p = (np.clip(x / max(1e-9, np.max(np.abs(x))) * 0.9, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(HERE, f'stem_{name}.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
print('ok', out)
