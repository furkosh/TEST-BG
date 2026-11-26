#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Celepoğlu Taşımacılık – ses miksajı.

Dış ses (ElevenLabs, tek çekim) 6 cümleye bölünür ve sahne zamanlarına yerleştirilir;
müzik dış ses altında otomatik olarak kısılır (ducking), efektler eklenir,
sonuç EBU R128 uyumlu şekilde -16 LUFS / -1 dBTP'ye normalize edilir.

Kullanım:  python3 src/mix.py [cikis.wav]
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 60.0
N = int(SR * DUR)


def A(*p):
    return os.path.join(ROOT, 'audio', *p)


def load(path):
    raw = subprocess.check_output(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le',
                                   '-ac', '2', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()


def db(x):
    return 10 ** (x / 20.0)


def hp(sig, fc):
    return sosfilt(butter(2, fc, 'high', fs=SR, output='sos'), sig, axis=-1).astype(np.float32)


def place(bus, sig, t, gain_db=0.0, fade_in=0.0, fade_out=0.0, max_len=None):
    sig = sig.copy()
    if max_len is not None:
        sig = sig[:, :int(max_len * SR)]
    n = sig.shape[1]
    if fade_in > 0:
        k = min(n, int(fade_in * SR))
        sig[:, :k] *= np.linspace(0, 1, k, dtype=np.float32)
    if fade_out > 0:
        k = min(n, int(fade_out * SR))
        sig[:, n - k:] *= np.linspace(1, 0, k, dtype=np.float32)
    i = int(round(t * SR))
    j0, j1 = max(0, i), min(N, i + n)
    if j1 > j0:
        bus[:, j0:j1] += sig[:, j0 - i:j1 - i] * db(gain_db)


def peak_time(sig):
    env = np.abs(sig).max(0)
    k = int(0.02 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    return env.argmax() / SR


def onset_time(sig, thr=0.25):
    env = np.abs(sig).max(0)
    return np.argmax(env > thr * env.max()) / SR


# Dış ses: (kaynak başlangıç, kaynak bitiş, filmdeki zaman) — sessizlik tespitinden
VO_SEGMENTS = [
    (0.00, 2.85, 1.30),     # Her yolculuk, bir güven hikâyesiyle başlar.
    (4.47, 10.16, 8.30),    # Kimi zaman geleceğimiz olan çocuklarımızı …
    (10.91, 17.51, 19.20),  # Kimi zaman emeğiyle geleceği inşa eden …
    (18.27, 24.01, 29.20),  # Özel yolculuklarınızda ve organizasyonlarınızda …
    (24.43, 34.60, 38.45),  # Modern araçlarımız … sorumluluk taşıyoruz.
    (35.07, 41.87, 50.55),  # Celepoğlu Taşımacılık … Yolunuz, güvenle bizimle.
]


def build():
    vo_src = load(A('dis_ses.mp3'))
    vo_src = hp(vo_src, 75)
    vo = np.zeros((2, N), np.float32)
    for s0, s1, t in VO_SEGMENTS:
        seg = vo_src[:, int(s0 * SR):int(s1 * SR)]
        place(vo, seg, t, 0.0, fade_in=0.01, fade_out=0.06)

    music = load(A('muzik.wav'))[:, :N]
    music = np.pad(music, ((0, 0), (0, N - music.shape[1])))

    # ducking: dış ses zarfı
    env = np.abs(vo).max(0)
    win = int(0.03 * SR)
    env = np.convolve(env, np.ones(win) / win, mode='same')
    active = (env > 0.01).astype(np.float32)
    # atak 60 ms, bırakma 450 ms
    a_att, a_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.45 * SR))
    g = np.empty(N, np.float32)
    y = 0.0
    step = 64                                   # blok bazlı hızlı yaklaşım
    for i in range(0, N, step):
        x = active[i:i + step].max()
        c = a_att ** step if x > y else a_rel ** step
        y = x + (y - x) * c
        g[i:i + step] = y
    duck = 1 - g * (1 - db(-9.0))
    # müzik otomasyonu: sakin açılış ve logo sonrası müziği biraz öne al
    pts = [(0.0, 4.0), (7.0, 4.0), (8.0, 0.0), (57.3, 0.0), (57.8, 3.0), (60.0, 3.0)]
    tt = np.arange(N) / SR
    duck = duck * db(np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])).astype(np.float32)

    sfx = np.zeros((2, N), np.float32)
    S = lambda n: load(A('sfx', n))
    amb = S('sabah_ambiyans.mp3')
    place(sfx, amb, 0.0, +9.0, fade_in=1.2, fade_out=2.0, max_len=8.6)

    wh = S('gecis_whoosh.mp3')
    wh_pk = peak_time(wh)
    for tt, gdb in ((7.15, -8), (18.15, -8), (28.15, -8), (38.0, -9), (50.0, -8)):
        place(sfx, wh, tt - wh_pk, gdb)
    wh2 = S('gecis_whoosh_yumusak.mp3')
    wh2_pk = peak_time(wh2)
    for tt in (3.8, 12.6, 23.2, 33.2):
        place(sfx, wh2, tt - wh2_pk, -10)

    door = S('kapi_acilma_kapanma.mp3')
    place(sfx, door, 9.4, -7.0, fade_out=0.3)
    place(sfx, door, 30.0, -11.0, fade_out=0.3)

    eng = S('motor_gecis.mp3')
    place(sfx, eng, 21.5 - peak_time(eng), -13.0, fade_in=1.5, fade_out=2.0)
    eng2 = S('motor_gecis_2.mp3')
    place(sfx, eng2[:, int(max(0, peak_time(eng2) - 4.5) * SR):], 46.5, -15.0, fade_in=1.0, fade_out=2.5,
          max_len=7.2)

    boom = S('logo_patlama.mp3')
    place(sfx, boom[:, int(onset_time(boom) * SR):], 54.5, -2.5, fade_out=0.8)

    mix = vo * db(+5.5) + music * duck * db(-7.5) + sfx * db(-2.0)
    return mix, vo, music * duck, sfx


def loudnorm(inp, out, target=-16.0, tp=-1.0):
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', inp, '-af',
                           f'loudnorm=I={target}:TP={tp}:LRA=11:print_format=json', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:"
          f"linear=true,aresample={SR}")
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', inp, '-af', af,
                           '-c:a', 'pcm_s24le', out])


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else A('final_miks.wav')
    mix, vo, mus, sfx = build()
    pk = np.abs(mix).max()
    if pk > 0.95:
        mix *= 0.95 / pk
    tmp = out + '.tmp.wav'
    wavfile.write(tmp, SR, mix.T.astype(np.float32))
    loudnorm(tmp, out)
    os.remove(tmp)
    print('miks:', out)


if __name__ == '__main__':
    main()
