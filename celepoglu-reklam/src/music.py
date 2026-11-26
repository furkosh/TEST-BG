#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Celepoğlu Taşımacılık – 60 sn sinematik kurumsal müzik (tamamen sentezlenmiş, telifsiz).

80 BPM, 4/4, ölçü = 3 sn. Ölçü başları t = -1 + 3n → 38, 41, 44, 47, 50 sn'deki
sert kesmeler ve 54.5 sn'deki logo vuruşu ritme oturur.

Yapı:
  0–7    hafif piyano (gün doğumu)
  7–18   piyano + yaylı pad + bas
  18–38  ritmik yaylı ostinato, yumuşak davul, yükseliş
  38–50  tam orkestral doku, timpani vuruşları, yükselen gerilim
  50–54  büyük çözülme akoru → sessizleşme
  54.5–60 logo akoru (Re majör add9) ve kapanış
"""
import os
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
DUR = 60.0
N = int(SR * DUR)
BEAT = 0.75
BAR = 3.0
BAR0 = -1.0
rng = np.random.default_rng(11)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def bar_t(n, beat=0.0):
    return BAR0 + n * BAR + beat * BEAT


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N + SR * 4), np.float32)

    def add(self, sig, t, pan=0.0, gain=1.0):
        i = int(round(t * SR))
        if sig.ndim == 1:
            l = np.cos((pan + 1) * np.pi / 4)
            r = np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l * 1.414, sig * r * 1.414])
        j0 = max(0, i)
        s0 = j0 - i
        j1 = min(self.x.shape[1], i + sig.shape[1])
        if j1 <= j0:
            return
        self.x[:, j0:j1] += sig[:, s0:s0 + (j1 - j0)] * gain


def lp(sig, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return sosfilt(sos, sig, axis=-1).astype(np.float32)


def hp(sig, fc, order=2):
    sos = butter(order, fc, 'high', fs=SR, output='sos')
    return sosfilt(sos, sig, axis=-1).astype(np.float32)


def bp(sig, f1, f2, order=2):
    sos = butter(order, [f1, f2], 'band', fs=SR, output='sos')
    return sosfilt(sos, sig, axis=-1).astype(np.float32)


def blep_saw(freq_t, phase0=0.0):
    """Band sınırlı (polyBLEP) testere dalga; freq_t: anlık frekans dizisi."""
    dt = freq_t / SR
    p = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * p - 1
    m1 = p < dt
    t1 = p[m1] / dt[m1]
    y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = p > 1 - dt
    t2 = (p[m2] - 1) / dt[m2]
    y[m2] -= t2 * t2 + t2 + t2 + 1
    return y.astype(np.float32)


# --------------------------------------------------------------------------- enstrümanlar
def piano(m, dur=3.2, vel=0.6):
    f = hz(m)
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros(n, np.float32)
    B = 0.00032
    bright = np.clip(vel, 0.2, 1.0)
    for h in range(1, 13):
        fh = h * f * np.sqrt(1 + B * h * h)
        if fh > 15000:
            break
        amp = (1.0 / h ** (1.55 - 0.5 * bright)) * (0.9 if h > 1 else 1.0)
        dec = (0.55 + 0.42 * h) * (f / 262.0) ** 0.45
        for det in (-0.7, 0.7):
            fd = fh * 2 ** (det / 1200)
            out += amp * 0.5 * np.sin(2 * np.pi * fd * t + rng.random() * 6.28) * np.exp(-t * dec)
    att = 1 - np.exp(-t / 0.0025)
    rel = np.clip((dur - t) / 0.25, 0, 1)
    ham = lp(rng.standard_normal(n).astype(np.float32), 2500) * np.exp(-t / 0.006) * 0.08
    return (out * att * rel + ham) * vel * 0.32


def strings(m, dur, vel=0.5, attack=0.7, release=1.4, cutoff=2600, stacc=False):
    f = hz(m)
    total = dur + release
    n = int(total * SR)
    t = np.arange(n, dtype=np.float32) / SR
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t + rng.random() * 6) * np.clip((t - 0.35) / 0.6, 0, 1)
    L = np.zeros(n, np.float32)
    Rr = np.zeros(n, np.float32)
    dets = (-11, -5, 0, 5, 11)
    for i, c in enumerate(dets):
        s = blep_saw(f * 2 ** (c / 1200) * vib, rng.random())
        if i % 2 == 0:
            L += s
        else:
            Rr += s
        if c == 0:
            L += s * 0.5
            Rr += s * 0.5
    if stacc:
        env = (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.16)
    else:
        env = np.clip(t / attack, 0, 1) ** 1.5
        env *= np.where(t > dur, np.exp(-(t - dur) / (release / 4)), 1.0)
    sig = np.vstack([L, Rr]) * env * vel * 0.11
    return lp(sig, cutoff, 2)


def bass(m, dur, vel=0.7):
    f = hz(m)
    n = int((dur + 0.4) * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = (1 - np.exp(-t / 0.03)) * np.where(t > dur, np.exp(-(t - dur) / 0.12), 1.0)
    return np.tanh(s * 1.2) * env * vel * 0.30


def kick(vel=0.7):
    n = int(0.6 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.22)
    click = hp(rng.standard_normal(n).astype(np.float32), 2000) * np.exp(-t / 0.004) * 0.15
    return (s + click) * vel * 0.55


def timpani(m=38, vel=0.9):
    f = hz(m)
    n = int(3.2 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    fe = f * (1 + 0.12 * np.exp(-t / 0.06))
    ph = 2 * np.pi * np.cumsum(fe) / SR
    s = np.sin(ph) * np.exp(-t / 1.1) + 0.5 * np.sin(1.504 * ph) * np.exp(-t / 0.7) \
        + 0.28 * np.sin(1.742 * ph) * np.exp(-t / 0.5) + 0.18 * np.sin(2.0 * ph) * np.exp(-t / 0.4)
    noise = lp(rng.standard_normal(n).astype(np.float32), 900) * np.exp(-t / 0.05) * 0.6
    return (s + noise) * vel * 0.5


def sub_boom(vel=1.0, dur=3.0):
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = 36 + 60 * np.exp(-t / 0.09)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 1.6) * np.exp(-t / 0.9) * vel * 0.6


def cymbal(dur=3.0, vel=0.5, rev=False):
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = hp(rng.standard_normal((2, n)).astype(np.float32), 5000)
    s += 0.5 * bp(rng.standard_normal((2, n)).astype(np.float32), 3000, 9000)
    env = np.exp(-t / (dur / 3.5))
    if rev:
        env = env[::-1] ** 1.5
    return s * env * vel * 0.12


def shaker(vel=0.3):
    n = int(0.12 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = bp(rng.standard_normal(n).astype(np.float32), 5000, 11000) * (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.035)
    return s * vel * 0.25


def snare(vel=0.5):
    n = int(0.35 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.5
    nz = bp(rng.standard_normal(n).astype(np.float32), 1500, 9000) * np.exp(-t / 0.11)
    return (body + nz) * vel * 0.3


def riser(dur=3.0, vel=0.6):
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros((2, n), np.float32)
    noise = rng.standard_normal((2, n)).astype(np.float32)
    chunk = int(0.05 * SR)
    for c0 in range(0, n, chunk):
        c1 = min(n, c0 + chunk)
        fc = 250 * (40 ** (c0 / n))
        out[:, c0:c1] = bp(noise[:, max(0, c0 - 2048):c1], fc, min(fc * 2.5, 20000), 2)[:, -(c1 - c0):]
    env = (t / dur) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(110 * 4 ** (t / dur)) / SR) * 0.25
    return (out + tone) * env * vel * 0.5


def reverb_ir(rt60=2.6, pre=0.022):
    n = int((rt60 + pre) * SR)
    t = np.arange(n, dtype=np.float32) / SR
    ir = rng.standard_normal((2, n)).astype(np.float32) * np.exp(-6.91 * t / rt60)
    ir = lp(ir, 5200, 1)
    ir[:, :int(pre * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    return ir


# --------------------------------------------------------------------------- aranjman
CH = {
    'Bm': dict(bass=35, pad=[54, 59, 62, 66], arp=[59, 62, 66, 71], ost=[47, 54]),
    'G': dict(bass=31, pad=[55, 59, 62, 67], arp=[59, 62, 67, 71], ost=[43, 50]),
    'D': dict(bass=38, pad=[54, 57, 62, 66], arp=[57, 62, 66, 69], ost=[50, 57]),
    'A': dict(bass=33, pad=[52, 57, 61, 64], arp=[57, 61, 64, 69], ost=[45, 52]),
}
PROG = ['Bm', 'G', 'D', 'A']


def build():
    dry = Bus()       # kuru (perküsyon, bas)
    wet = Bus()       # reverb'e giden
    ARP_IDX = [0, 1, 2, 3, 2, 1, 2, 3]

    # açılış: tek piyano akoru (gün doğumu)
    for i, m in enumerate([47, 54, 59, 62, 66]):
        wet.add(piano(m, 4.5, 0.42), 0.25 + i * 0.09, pan=-0.3 + i * 0.15)

    for n in range(0, 17):                 # ölçüler: -1 … 50
        t0 = bar_t(n)
        ch = CH[PROG[n % 4]] if n < 16 else CH['A']
        # bölüm yoğunlukları
        if t0 < 7:
            sec = 0
        elif t0 < 17:
            sec = 1
        elif t0 < 37:
            sec = 2
        else:
            sec = 3
        if t0 + BAR <= 0.5:
            continue
        # piyano arpej (8'lik)
        if t0 >= 1.5:
            vel_base = [0.34, 0.40, 0.46, 0.52][sec]
            for e in range(8):
                te = t0 + e * BEAT / 2
                m = ch['arp'][ARP_IDX[e]] + (12 if (sec == 3 and e % 2 == 1) else 0)
                acc = 1.15 if e % 4 == 0 else 1.0
                wet.add(piano(m, 2.2, vel_base * acc), te, pan=0.25 * np.sin(e))
        # yaylı pad
        if sec >= 1:
            pv = [0, 0.32, 0.42, 0.58][sec] * (0.6 if t0 < 9 else 1.0)
            cut = [0, 2200, 2800, 3800][sec]
            for i, m in enumerate(ch['pad']):
                wet.add(strings(m, BAR + 0.05, pv, attack=0.9 if sec == 1 else 0.5, cutoff=cut), t0,
                        pan=-0.4 + i * 0.27)
            if sec == 3:   # üst oktav
                for i, m in enumerate(ch['pad'][1:]):
                    wet.add(strings(m + 12, BAR + 0.05, 0.22, attack=0.4, cutoff=5200), t0, pan=0.3 - i * 0.3)
        # bas
        if t0 >= 7.5:
            bv = [0, 0.45, 0.6, 0.75][sec]
            dry.add(bass(ch['bass'], BAR - 0.05, bv), t0)
        # ostinato (spiccato yaylılar)
        if sec >= 2:
            sv = 0.38 if sec == 2 else 0.52
            steps = 8 if sec == 2 else 16
            for e in range(steps):
                te = t0 + e * BAR / steps
                m = ch['ost'][e % 2] + (12 if (e // 2) % 2 else 0)
                acc = 1.25 if e % (steps // 4) == 0 else 0.9
                wet.add(strings(m, 0.12, sv * acc, release=0.25, cutoff=4200, stacc=True), te,
                        pan=-0.5 if e % 2 else 0.5, gain=0.9)
        # davul
        if sec >= 2:
            for b in range(4):
                tb = t0 + b * BEAT
                if b in (0, 2):
                    dry.add(kick(0.55 if sec == 2 else 0.8), tb)
                if sec == 2 and t0 >= 26:
                    dry.add(shaker(0.5), tb + BEAT / 2, pan=0.35)
                if sec == 3:
                    dry.add(shaker(0.6), tb + BEAT / 2, pan=0.35)
                    if b in (1, 3):
                        wet.add(snare(0.38), tb, pan=-0.1)
        if sec == 3:
            dry.add(timpani(38, 1.0), t0)
            wet.add(timpani(38, 0.45), t0)

    # 47–50: yükselen gerilim + trampet rulosu
    wet.add(riser(3.0, 0.9), 47.0)
    for i in range(24):
        ts = 48.2 + i * (1.8 / 24)
        wet.add(snare(0.12 + 0.5 * i / 24), ts, pan=0.1)
    wet.add(cymbal(1.8, 0.8, rev=True), 48.2)

    # 50: büyük çözülme (Re majör)
    t50 = 50.0
    dry.add(sub_boom(1.0, 3.2), t50)
    dry.add(timpani(38, 1.2), t50)
    wet.add(timpani(26, 0.8), t50)
    wet.add(cymbal(4.0, 1.0), t50)
    for i, m in enumerate([50, 54, 57, 62, 66, 69]):
        wet.add(strings(m, 2.6, 0.55, attack=0.12, release=1.2, cutoff=4200), t50, pan=-0.5 + i * 0.2)
    for i, m in enumerate([62, 66, 69, 74]):
        wet.add(piano(m, 4.0, 0.6), t50 + i * 0.03, pan=-0.2 + i * 0.13)
    dry.add(bass(38, 2.6, 0.8), t50)

    # 53–54.5: ters zil emişi (logo öncesi)
    wet.add(cymbal(1.5, 1.1, rev=True), 53.0)

    # 54.5: logo akoru (Re majör add9) ve parıltı
    t55 = 54.5
    for i, m in enumerate([38, 50, 57, 62, 64, 66, 69]):
        wet.add(strings(m, 4.4, 0.45 if m > 40 else 0.3, attack=0.35, release=1.8, cutoff=3600), t55,
                pan=-0.45 + i * 0.15)
    dry.add(bass(26, 4.2, 0.55), t55)
    for i, m in enumerate([74, 78, 81, 86]):
        wet.add(piano(m, 3.5, 0.38), t55 + 0.35 + i * 0.22, pan=-0.3 + i * 0.2)
    wet.add(piano(62, 5.0, 0.5), t55)
    wet.add(piano(50, 5.0, 0.45), t55)

    ir = reverb_ir()
    w = wet.x[:, :N + SR * 3]
    rev = np.vstack([fftconvolve(w[0], ir[0])[:w.shape[1]], fftconvolve(w[1], ir[1])[:w.shape[1]]])
    mix = dry.x[:, :w.shape[1]] + w * 0.78 + rev.astype(np.float32) * 0.42
    mix = hp(mix, 28, 2)
    mix = mix[:, :N]
    # bölüm dinamiği (kurgunun nefes alması için)
    t = np.arange(N) / SR
    g = np.ones(N, np.float32)
    g *= np.clip(t / 0.25, 0, 1)
    g *= np.where((t > 53.4) & (t < 54.5), 1 - 0.75 * np.clip((t - 53.4) / 0.4, 0, 1), 1.0)
    g *= np.clip((60.0 - t) / 1.4, 0, 1) ** 1.3
    mix *= g
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.1) / np.tanh(1.1) * 0.89
    return mix


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'audio', 'muzik.wav')
    mix = build()
    wavfile.write(out, SR, mix.T.astype(np.float32))
    print('müzik:', out, mix.shape)


if __name__ == '__main__':
    main()
