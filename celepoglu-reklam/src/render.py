#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Celepoğlu Taşımacılık – 60 sn kurumsal reklam filmi · görüntü render motoru.

Tek gerçek fotoğraftan (assets/arac_on.jpg) ve kurumsal logodan (assets/logo_orijinal.png)
sinematik kamera hareketleri, ışık efektleri, kurumsal tipografi ve logo finali üretir.

Kullanım:
  python3 src/render.py --width 3840 --fps 60 --workers 4 --out output/video_4k.mp4
  python3 src/render.py --width 960 --fps 30 --stills 1,5,9 --stills-dir /tmp/stills
"""
import argparse
import math
import os
import subprocess
import sys
import time

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

cv2.setNumThreads(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUR = 60.0
UP = 2            # kaynak fotoğraf ön-büyütme katsayısı
ASPECT = 2.20     # sinematik bant (letterbox) oranı

RED = np.array([0.890, 0.020, 0.035], np.float32)   # kurumsal kırmızı
WHITE = np.array([1.0, 1.0, 1.0], np.float32)


# --------------------------------------------------------------------------- yardımcılar
def asset(*p):
    return os.path.join(ROOT, 'assets', *p)


def font(name, px):
    return ImageFont.truetype(asset('fonts', name + '.ttf'), max(1, int(round(px))))


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ramp(t, t0, t1):
    if t1 <= t0:
        return 1.0 if t >= t0 else 0.0
    return clamp((t - t0) / (t1 - t0))


def ease_io(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_sine(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp(x)
    return x ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class R:
    """Çözünürlüğe bağlı global ayarlar (4K = 3840 referans)."""
    W = 3840
    H = 2160
    k = 1.0
    FPS = 60
    BAR = 0


def setup(width, fps):
    R.W = int(width)
    R.H = int(round(width * 9 / 16))
    R.k = R.W / 3840.0
    R.FPS = fps
    R.BAR = int(round((R.H - R.W / ASPECT) / 2))


# --------------------------------------------------------------------------- logo
def load_logo():
    im = Image.open(asset('logo_orijinal.png')).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb)
    arr = np.asarray(im).astype(np.float32) / 255.0
    rgb, a = arr[..., :3], arr[..., 3]
    lum = rgb.mean(2)
    sat = rgb.max(2) - rgb.min(2)
    # "CELEPOĞLU" harfleri: üst bölgede başlayan açık gri bağlantılı bileşenler
    light = ((sat < 0.15) & (lum > 0.40) & (a > 0.5)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(light, connectivity=8)
    h = arr.shape[0]
    keep = np.zeros(n, bool)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_TOP] < 0.42 * h and stats[i, cv2.CC_STAT_AREA] > 50:
            keep[i] = True
    letters = keep[lab].astype(np.uint8)
    letters = cv2.dilate(letters, np.ones((5, 5), np.uint8)).astype(bool) & (sat < 0.2) & (a > 0)
    positive = arr.copy()                       # açık zemin versiyonu (koyu harfler)
    positive[..., :3][letters] = 0.11
    return arr, positive


def resize_rgba(spr, w):
    h = int(round(spr.shape[0] * w / spr.shape[1]))
    interp = cv2.INTER_AREA if w < spr.shape[1] else cv2.INTER_CUBIC
    rgb = spr[..., :3] * spr[..., 3:4]           # premultiplied ölçekleme (kenar halesi olmasın)
    out_rgb = cv2.resize(rgb, (w, h), interpolation=interp)
    out_a = np.clip(cv2.resize(spr[..., 3], (w, h), interpolation=interp), 0, 1)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 3] = out_a
    out[..., :3] = np.where(out_a[..., None] > 1e-4, out_rgb / np.maximum(out_a[..., None], 1e-4), 0)
    return np.clip(out, 0, 1)


# --------------------------------------------------------------------------- kaynak fotoğraf
def retouch_sign(rgb, logo_pos):
    """Ön camdaki üçüncü taraf tabelayı temizleyip Celepoğlu logosunu yerleştirir."""
    x0, y0, x1, y1 = [v * UP for v in (984, 553, 1164, 600)]
    reg = rgb[y0:y1, x0:x1].astype(np.float32)
    lum = reg.mean(2)
    bg = np.percentile(lum, 80)
    mask = (lum < bg * 0.72).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    full = np.zeros(rgb.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = mask
    out = cv2.inpaint(rgb, full, 11, cv2.INPAINT_TELEA)
    out = out.copy()
    # kartın düz ışığını yumuşat (inpaint izlerini gizle)
    face = out[y0:y1, x0:x1].astype(np.float32)
    face_s = cv2.GaussianBlur(face, (0, 0), 6)
    m = cv2.GaussianBlur(full[y0:y1, x0:x1].astype(np.float32) / 255, (0, 0), 4)[..., None]
    face = face * (1 - m) + face_s * m
    # logo
    lw = int(150 * UP)
    spr = resize_rgba(logo_pos, lw)
    spr = cv2.GaussianBlur(spr, (0, 0), 0.9)
    lh = spr.shape[0]
    cx, cy = 1074 * UP, 577 * UP
    lx0, ly0 = cx - lw // 2 - x0, cy - lh // 2 - y0
    shade = np.clip(cv2.GaussianBlur(face.mean(2), (0, 0), 8) / max(bg, 1), 0.7, 1.05)[..., None]
    sub = face[ly0:ly0 + lh, lx0:lx0 + lw]
    a = spr[..., 3:4] * 0.97
    col = spr[..., :3] * 255 * shade[ly0:ly0 + lh, lx0:lx0 + lw]
    face[ly0:ly0 + lh, lx0:lx0 + lw] = sub * (1 - a) + col * a
    out[y0:y1, x0:x1] = np.clip(face, 0, 255).astype(np.uint8)
    return out


def load_source(logo_pos):
    bgr = cv2.imread(asset('arac_on.jpg'))
    bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 3, 3, 7, 21)
    big = cv2.resize(bgr, None, fx=UP, fy=UP, interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(big, (0, 0), 2.2)
    big = cv2.addWeighted(big, 1.5, blur, -0.5, 0)
    rgb = cv2.cvtColor(big, cv2.COLOR_BGR2RGB)
    return retouch_sign(rgb, logo_pos)


GRADES = {
    #          sat   contrast  lift                 gain                 gamma  shadow tint            highlight tint
    'dawn':   (1.00, 0.28, (0.020, 0.014, 0.022), (1.07, 1.00, 0.90), 1.04, (0.010, 0.000, 0.020), (0.060, 0.022, -0.040)),
    'cool':   (1.05, 0.32, (0.008, 0.012, 0.022), (1.00, 1.00, 1.03), 1.02, (0.000, 0.006, 0.020), (0.020, 0.012, 0.000)),
    'punch':  (1.10, 0.42, (0.006, 0.008, 0.016), (1.02, 1.00, 1.00), 1.00, (0.000, 0.004, 0.016), (0.030, 0.012, -0.010)),
    'sunset': (1.08, 0.34, (0.018, 0.008, 0.020), (1.10, 0.98, 0.86), 1.03, (0.014, 0.000, 0.022), (0.080, 0.030, -0.050)),
}


def grade(src_u8, name):
    sat, con, lift, gain, gam, sh, hi = GRADES[name]
    x = src_u8.astype(np.float32) / 255.0
    lum = x @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    x = lum[..., None] + (x - lum[..., None]) * sat
    lift = np.array(lift, np.float32)
    gain = np.array(gain, np.float32)
    x = lift + np.clip(x, 0, 1) * (gain - lift)
    x = np.clip(x, 0, 1) ** (1.0 / gam)
    s = x * x * (3 - 2 * x)
    x = x + (s - x) * con
    lum = (x @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    x = x + np.array(sh, np.float32) * (1 - lum) ** 2 + np.array(hi, np.float32) * lum ** 2
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)


# --------------------------------------------------------------------------- çekim listesi
# kamera: (merkez_x, merkez_y, kadraj_genişliği, rotasyon°) — orijinal fotoğraf pikselinde
HOT_L = (425, 971)     # sol far
HOT_R = (1750, 985)    # sağ far

SHOTS = [
    dict(n='1a', t0=0.0, t1=4.2, g='dawn', c0=(1475, 950, 1070, -1.0), c1=(1545, 958, 890, 0.0),
         fx=dict(flare=1.0, dust=1.0, leak='dawn')),
    dict(n='1b', t0=3.4, t1=7.3, g='dawn', c0=(1060, 690, 1260, 0.5), c1=(1058, 682, 1000, 0.0),
         fx=dict(sweep=(4.7, 6.3), dust=1.0, leak='dawn')),
    dict(n='2a', t0=7.0, t1=13.0, g='cool', c0=(985, 470, 840, 0.0), c1=(1235, 468, 790, 0.0),
         fx=dict(dust=0.6)),
    dict(n='2b', t0=12.2, t1=18.3, g='cool', c0=(1008, 760, 1500, 0.0), c1=(1008, 752, 1960, 0.0),
         fx=dict(flare=0.65)),
    dict(n='3a', t0=18.0, t1=23.6, g='cool', c0=(1050, 1150, 1100, 0.0), c1=(1050, 880, 1260, 0.0),
         fx=dict(flare=0.7, sweep=(19.2, 21.2))),
    dict(n='3b', t0=22.8, t1=28.3, g='cool', c0=(690, 720, 1350, 0.0), c1=(820, 720, 1240, 0.0),
         fx=dict(flare=0.85)),
    dict(n='4a', t0=28.0, t1=33.6, g='cool', c0=(1075, 462, 1300, 0.0), c1=(1100, 470, 1040, 0.0),
         fx=dict(dust=1.0)),
    dict(n='4b', t0=32.8, t1=38.0, g='cool', c0=(1460, 925, 1100, 0.8), c1=(1560, 940, 900, 0.0),
         fx=dict(flare=1.0, sweep=(34.4, 36.3))),
    dict(n='5a', t0=38.0, t1=41.0, g='punch', c0=(475, 930, 900, 0.0), c1=(482, 936, 790, 0.0),
         fx=dict(flare=1.0, dim=0.55)),
    dict(n='5b', t0=41.0, t1=44.0, g='punch', c0=(1150, 462, 760, 0.0), c1=(1192, 462, 680, 0.0),
         fx=dict(dim=0.60)),
    dict(n='5c', t0=44.0, t1=47.0, g='punch', c0=(1050, 1060, 1300, 0.0), c1=(1050, 1060, 1120, 0.0),
         fx=dict(dim=0.74, flare=0.8, sweep=(44.5, 46.2))),
    dict(n='5d', t0=47.0, t1=50.0, g='sunset', c0=(1008, 772, 1420, 0.0), c1=(1008, 762, 1860, 0.0),
         fx=dict(dim=0.60, flare=0.8)),
    dict(n='6a', t0=50.0, t1=54.4, g='sunset', c0=(935, 765, 1760, -1.4), c1=(1050, 758, 1900, 1.1),
         fx=dict(flare=0.95, sweep=(50.6, 52.9), leak='sunset', dust=0.7)),
]

SCENE_FLASH = [7.15, 18.15, 28.15]                 # sahne geçişi ışık patlamaları (merkez)
CUT_FLASH = [38.0, 41.0, 44.0, 47.0, 50.0]         # sert kesme flaşları

TITLES = [
    ('ÖĞRENCİ TAŞIMACILIĞI', 8.0, 17.25),
    ('PERSONEL TAŞIMACILIĞI', 19.0, 27.25),
    ('VIP VE ÖZEL ULAŞIM HİZMETLERİ', 29.0, 37.3),
]
WORDS = [
    ('GÜVEN', 38.0, 41.0),
    ('KONFOR', 41.0, 44.0),
    ('KALİTE', 44.0, 47.0),
    ('PROFESYONELLİK', 47.0, 50.0),
]
CARD_T = 54.2


# --------------------------------------------------------------------------- metin
def text_sprite(text, fnt, fill=(255, 255, 255, 255), tracking=0.0, shadow=0.0, shadow_sigma=0.0):
    asc, desc = fnt.getmetrics()
    pad = int(0.35 * (asc + desc)) + int(shadow_sigma * 3)
    if tracking == 0:
        total = fnt.getlength(text)
    else:
        widths = [fnt.getlength(c) for c in text]
        total = sum(widths) + tracking * (len(text) - 1)
    w = int(math.ceil(total)) + 2 * pad
    h = asc + desc + 2 * pad
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if tracking == 0:
        d.text((pad, pad), text, font=fnt, fill=fill)
    else:
        x = float(pad)
        for c, cw in zip(text, widths):
            d.text((x, pad), c, font=fnt, fill=fill)
            x += cw + tracking
    arr = np.asarray(img).astype(np.float32) / 255.0
    if shadow > 0:
        sa = cv2.GaussianBlur(arr[..., 3], (0, 0), max(shadow_sigma, 0.5)) * shadow
        a_t = arr[..., 3]
        a_o = a_t + sa * (1 - a_t)
        rgb = np.where(a_o[..., None] > 1e-4, arr[..., :3] * a_t[..., None] / np.maximum(a_o[..., None], 1e-4), 0)
        arr = np.dstack([rgb, a_o]).astype(np.float32)
    # ink sınırları (baseline hizası için)
    return arr, pad, asc


def comp(frame, spr, x, y, alpha=1.0, clip_x1=None, clip_x0=None):
    if alpha <= 0.001:
        return
    h, w = spr.shape[:2]
    x = int(round(x))
    y = int(round(y))
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(R.W, x + w), min(R.H, y + h)
    if clip_x1 is not None:
        x1 = min(x1, int(round(clip_x1)))
    if clip_x0 is not None:
        x0 = max(x0, int(round(clip_x0)))
    if x1 <= x0 or y1 <= y0:
        return
    s = spr[y0 - y:y1 - y, x0 - x:x1 - x]
    a = s[..., 3:4] * alpha
    region = frame[y0:y1, x0:x1]
    region *= (1 - a)
    region += s[..., :3] * a


def poly_sprite(w, h, pts, color, ss=4):
    img = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(img).polygon([(px * ss, py * ss) for px, py in pts], fill=255)
    a = np.asarray(img.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255.0
    spr = np.zeros((h, w, 4), np.float32)
    spr[..., :3] = color
    spr[..., 3] = a
    return spr


def make_lower_third(title):
    k = R.k
    fnt = font('SairaSemiCondensed_800ExtraBold', 96 * k)
    txt, pad, asc = text_sprite(title, fnt, tracking=7 * k, shadow=0.35, shadow_sigma=4 * k)
    band_h = int(round(150 * k))
    tip = int(round(78 * k))
    text_w = txt.shape[1] - 2 * pad
    body = int(round(180 * k)) + text_w + int(round(110 * k))
    w = body + tip
    pts = [(0, 0), (body, 0), (body + tip, band_h / 2), (body, band_h), (0, band_h)]
    band = poly_sprite(w, band_h, pts, RED)
    grad = np.linspace(1.08, 0.80, band_h, dtype=np.float32)[:, None, None]
    band[..., :3] = np.clip(band[..., :3] * grad, 0, 1)
    hl = int(max(1, round(3 * k)))
    band[:hl, :body, :3] = np.clip(band[:hl, :body, :3] + 0.18, 0, 1)
    lab, lpad, lasc = text_sprite('CELEPOĞLU TAŞIMACILIK', font('Saira_500Medium', 40 * k),
                                  tracking=15 * k, fill=(255, 255, 255, 240), shadow=0.45, shadow_sigma=3 * k)
    line = np.zeros((max(1, int(round(4 * k))), int(round(90 * k)), 4), np.float32)
    line[..., :3] = RED
    line[..., 3] = 1
    return dict(band=band, body=body, txt=txt, pad=pad, asc=asc, lab=lab, lpad=lpad, lasc=lasc,
                line=line, band_h=band_h, fnt_px=96 * k)


def draw_lower_third(frame, lt, t, t_in, t_out):
    if t < t_in or t > t_out + 0.6:
        return
    k = R.k
    band_y = R.H - R.BAR - int(round(110 * k)) - lt['band_h']
    full_w = lt['band'].shape[1]
    p_in = ease_out(ramp(t, t_in, t_in + 0.65))
    p_out = ease_in(ramp(t, t_out, t_out + 0.5))
    clip = full_w * p_in * (1 - p_out)
    comp(frame, lt['band'], 0, band_y, 1.0, clip_x1=clip)
    # başlık metni
    ta = ease_out(ramp(t, t_in + 0.22, t_in + 0.75)) * (1 - ease_out(ramp(t, t_out - 0.05, t_out + 0.3)))
    tx = int(180 * k) - lt['pad'] - (1 - ease_out(ramp(t, t_in + 0.22, t_in + 0.9))) * 60 * k
    ty = band_y + lt['band_h'] / 2 - lt['pad'] - lt['asc'] * 0.60
    comp(frame, lt['txt'], tx, ty, ta, clip_x1=clip)
    # üst etiket
    la = ease_out(ramp(t, t_in + 0.4, t_in + 1.0)) * (1 - ease_out(ramp(t, t_out - 0.1, t_out + 0.25)))
    lx = int(180 * k) - (1 - ease_out(ramp(t, t_in + 0.4, t_in + 1.1))) * 40 * k
    ly = band_y - int(round(34 * k)) - lt['lasc']
    comp(frame, lt['line'], lx - int(110 * k), ly + lt['lpad'] + lt['lasc'] * 0.62, la)
    comp(frame, lt['lab'], lx - lt['lpad'], ly, la)


def draw_word(frame, word, t, t0, t1):
    if t < t0 or t >= t1:
        return
    k = R.k
    size = 300 * k
    fnt = WORD_FONTS.setdefault(int(size), font('SairaSemiCondensed_800ExtraBold', size))
    base_w = sum(fnt.getlength(c) for c in word)
    n = max(1, len(word) - 1)
    tr0 = min(0.42 * size, (0.90 * R.W - base_w) / n)
    tr1 = min(0.14 * size, (0.86 * R.W - base_w) / n)
    p = ease_out(ramp(t, t0, t0 + 2.4))
    tr = lerp(tr0, tr1, p)
    spr, pad, asc = text_sprite(word, fnt, tracking=tr, shadow=0.55, shadow_sigma=10 * k)
    a = ease_out(ramp(t, t0 + 0.04, t0 + 0.4)) * (1 - ease_in(ramp(t, t1 - 0.22, t1 - 0.02)))
    cx, cy = R.W / 2, R.H / 2 - 30 * k
    x = cx - spr.shape[1] / 2
    y = cy - pad - asc * 0.62
    comp(frame, spr, x, y, a)
    # kırmızı alt çizgi
    lw = ease_out(ramp(t, t0 + 0.25, t0 + 1.0)) * 520 * k
    if lw > 1:
        lh = max(1, int(round(11 * k)))
        bar = np.zeros((lh, int(lw), 4), np.float32)
        bar[..., :3] = RED
        bar[..., 3] = 1
        comp(frame, bar, cx - lw / 2, cy + 210 * k, a)


WORD_FONTS = {}


# --------------------------------------------------------------------------- efektler
def add_gauss(frame, u, v, sx, sy, color, amp):
    """Ayrılabilir 2B gauss ışık (anamorfik far çizgisi / parıltı)."""
    if amp <= 0.001:
        return
    x0 = int(max(0, u - 4 * sx)); x1 = int(min(R.W, u + 4 * sx + 1))
    y0 = int(max(0, v - 4 * sy)); y1 = int(min(R.H, v + 4 * sy + 1))
    if x1 <= x0 or y1 <= y0:
        return
    gx = np.exp(-((np.arange(x0, x1, dtype=np.float32) - u) ** 2) / (2 * sx * sx))
    gy = np.exp(-((np.arange(y0, y1, dtype=np.float32) - v) ** 2) / (2 * sy * sy))
    g = np.outer(gy, gx) * amp
    frame[y0:y1, x0:x1] += g[..., None] * color


def fx_flare(frame, M, t, inten, seed=0):
    k = R.k
    for i, (hx, hy) in enumerate((HOT_L, HOT_R)):
        u = M[0, 0] * hx * UP + M[0, 1] * hy * UP + M[0, 2]
        v = M[1, 0] * hx * UP + M[1, 1] * hy * UP + M[1, 2]
        if u < -0.6 * R.W or u > 1.6 * R.W or v < -200 * k or v > R.H + 200 * k:
            continue
        fl = 0.90 + 0.10 * math.sin(2 * math.pi * 0.55 * t + 1.7 * i + seed)
        a = inten * fl
        add_gauss(frame, u, v, 0.30 * R.W, 5.0 * k, np.array([0.45, 0.68, 1.0], np.float32), 0.42 * a)
        add_gauss(frame, u, v, 0.11 * R.W, 2.2 * k, np.array([0.85, 0.93, 1.0], np.float32), 0.55 * a)
        add_gauss(frame, u, v, 95 * k, 95 * k, np.array([1.0, 0.92, 0.80], np.float32), 0.26 * a)
        add_gauss(frame, u, v, 26 * k, 26 * k, np.array([1.0, 1.0, 1.0], np.float32), 0.35 * a)
        # küçük lens hayaleti (ters yönde)
        gu, gv = R.W - u, R.H - v
        add_gauss(frame, gu * 0.6 + u * 0.4, gv * 0.6 + v * 0.4, 70 * k, 70 * k,
                  np.array([0.35, 0.55, 1.0], np.float32), 0.05 * a)


def fx_sweep(frame, t, t0, t1, strength=0.55, angle_deg=-24.0):
    if t < t0 or t > t1:
        return
    p = lerp(-0.2, 1.2, ease_sine(ramp(t, t0, t1)))
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    diag = abs(R.W * ca) + abs(R.H * sa)
    dmin = min(0, R.H * sa)
    pos = dmin + p * diag
    sig = 150 * R.k
    xs = np.arange(R.W, dtype=np.float32) * ca
    ys = np.arange(R.H, dtype=np.float32)[:, None] * sa
    d = xs[None, :] + ys - pos
    band = np.exp(-(d * d) / (2 * sig * sig))
    band += 0.35 * np.exp(-((d + 3.2 * sig) ** 2) / (2 * (0.5 * sig) ** 2))
    lum = frame @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    m = smoothstep(0.35, 0.85, lum)
    frame += (band * m * strength)[..., None] * np.array([1.0, 0.97, 0.92], np.float32)


LEAK_RES = (384, 216)


def fx_leak(frame, t, kind, amount):
    if amount <= 0.001:
        return
    w, h = LEAK_RES
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    canvas = np.zeros((h, w, 3), np.float32)

    def blob(cx, cy, rx, ry, col, a):
        g = np.exp(-(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2))
        canvas[...] += g[..., None] * np.array(col, np.float32) * a

    if kind == 'dawn':
        blob(0.95 + 0.04 * math.sin(t * 0.5), 0.05, 0.55, 0.45, (1.0, 0.55, 0.18), 0.55)
        blob(0.70 + 0.06 * math.sin(t * 0.3), 0.00, 0.35, 0.20, (1.0, 0.80, 0.45), 0.30)
        blob(0.05, 0.90, 0.35, 0.35, (0.90, 0.10, 0.05), 0.20)
    elif kind == 'sunset':
        blob(0.10 + 0.05 * math.sin(t * 0.4), 0.02, 0.60, 0.45, (1.0, 0.50, 0.12), 0.55)
        blob(0.95, 0.15, 0.40, 0.40, (0.95, 0.25, 0.10), 0.30)
    elif kind == 'red':
        blob(0.5, 0.5, 0.9, 0.7, (1.0, 0.12, 0.06), 0.6)
    leak = cv2.resize(canvas, (R.W, R.H), interpolation=cv2.INTER_LINEAR) * amount
    np.clip(leak, 0, 1, out=leak)
    frame[...] = 1 - (1 - np.clip(frame, 0, 1)) * (1 - leak)


class Dust:
    def __init__(self, n=70, seed=7):
        rng = np.random.default_rng(seed)
        self.p = rng.random((n, 2)).astype(np.float32)
        self.v = (rng.random((n, 2)).astype(np.float32) - 0.5) * np.array([0.012, 0.010], np.float32) \
            + np.array([0.002, -0.010], np.float32)
        self.s = (rng.random(n) ** 2 * 7 + 1.5).astype(np.float32)
        self.a = (rng.random(n) * 0.5 + 0.25).astype(np.float32)
        self.ph = rng.random(n).astype(np.float32) * 6.28

    def draw(self, frame, t, amount):
        if amount <= 0.001:
            return
        hw, hh = R.W // 4, R.H // 4
        canvas = np.zeros((hh, hw), np.float32)
        pos = (self.p + self.v * t) % 1.0
        for (x, y), s, a, ph in zip(pos, self.s, self.a, self.ph):
            tw = 0.6 + 0.4 * math.sin(t * 1.3 + ph)
            cv2.circle(canvas, (int(x * hw * 16), int(y * hh * 16)), max(1, int(s * R.k * 16 / 4)),
                       float(a * tw), -1, lineType=cv2.LINE_AA, shift=4)
        canvas = cv2.GaussianBlur(canvas, (0, 0), max(0.6, 1.2 * R.k * 2))
        big = cv2.resize(canvas, (R.W, R.H), interpolation=cv2.INTER_LINEAR)
        frame += (big * 0.22 * amount)[..., None] * np.array([1.0, 0.92, 0.80], np.float32)


def make_vignette():
    xs = np.linspace(-1, 1, R.W, dtype=np.float32)[None, :]
    ys = np.linspace(-1, 1, R.H, dtype=np.float32)[:, None]
    r = np.sqrt((xs * 1.0) ** 2 + (ys * 1.15) ** 2)
    return (1 - 0.42 * smoothstep(0.45, 1.35, r)).astype(np.float32)


def make_grain(n=6, seed=3):
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        g = rng.standard_normal((R.H // 2 + 2, R.W // 2 + 2)).astype(np.float32)
        g = cv2.resize(g, (R.W, R.H), interpolation=cv2.INTER_LINEAR)
        out.append(g.astype(np.float16))
    return out


# --------------------------------------------------------------------------- kamera
def cam_matrix(cx, cy, w, rot):
    s = R.W / (w * UP)
    th = math.radians(rot)
    a, b = s * math.cos(th), s * math.sin(th)
    X, Y = cx * UP, cy * UP
    return np.array([[a, b, R.W / 2 - a * X - b * Y],
                     [-b, a, R.H / 2 + b * X - a * Y]], np.float32)


def shot_cam(shot, t):
    p = ramp(t, shot['t0'], shot['t1'])
    e = lerp(p, ease_sine(p), 0.35)
    c0, c1 = shot['c0'], shot['c1']
    return tuple(lerp(a, b, e) for a, b in zip(c0, c1))


# --------------------------------------------------------------------------- logo kartı
class Card:
    def __init__(self, logo):
        k = R.k
        self.logo = resize_rgba(logo, int(round(2250 * k)))
        self.cy = int(round(860 * k))
        xs = np.linspace(-1, 1, R.W, dtype=np.float32)[None, :]
        ys = (np.linspace(-1, 1, R.H, dtype=np.float32)[:, None] + 0.18)
        r = np.sqrt(xs ** 2 + (ys * 1.5) ** 2)
        spot = (1 - smoothstep(0.0, 1.25, r)) ** 1.6
        self.bg = (spot[..., None] * np.array([0.155, 0.150, 0.155], np.float32)).astype(np.float32)
        a = self.logo[..., 3]
        pad = int(160 * k)
        glow = np.pad(a, pad)
        self.glow = cv2.GaussianBlur(glow, (0, 0), 55 * k)
        self.glow_pad = pad
        # metinler
        self.tag, self.tag_pad, self.tag_asc = text_sprite(
            'YOLUNUZ, GÜVENLE BİZİMLE.', font('SairaSemiCondensed_800ExtraBold', 118 * k),
            tracking=16 * k)
        cf = font('Montserrat_500Medium', 60 * k)
        self.web, self.web_pad, self.web_asc = text_sprite('www.celepogluturizm.com', cf, fill=(232, 232, 232, 255))
        self.mail, self.mail_pad, self.mail_asc = text_sprite('iletisim@celepogluturizm.com', cf, fill=(232, 232, 232, 255))
        self.city, self.city_pad, self.city_asc = text_sprite(
            'İZMİR / TİRE', font('SairaSemiCondensed_600SemiBold', 70 * k), tracking=26 * k)

    def render(self, frame, t):
        k = R.k
        frame[...] = 0
        frame += self.bg * ease_io(ramp(t, CARD_T, CARD_T + 0.9))
        # ışık izleri (kırmızı soldan, beyaz sağdan) merkezde birleşir
        hit = 54.5
        if t < hit + 0.9:
            p = ease_in(ramp(t, CARD_T - 0.15, hit))
            fade = 1 - ramp(t, hit, hit + 0.5)
            yv = self.cy + 40 * k
            for side, col in ((-1, RED * 1.4), (1, np.array([1.0, 1.0, 1.0], np.float32))):
                head = R.W / 2 + side * (1 - p) * 0.65 * R.W
                for j in range(6):   # kuyruk
                    hx = head + side * j * 0.06 * R.W * (0.4 + p)
                    add_gauss(frame, hx, yv, 0.05 * R.W * (1 + j * 0.6), 3.0 * k * (1 + j * 0.3), col,
                              0.75 * fade * (0.75 ** j))
                add_gauss(frame, head, yv, 60 * k, 22 * k, col, 0.6 * fade)
        # flaş
        fb = math.exp(-max(0.0, t - hit) / 0.22) if t >= hit else 0.0
        if fb > 0.01:
            add_gauss(frame, R.W / 2, self.cy, 0.42 * R.W, 0.16 * R.W, np.array([1.0, 0.96, 0.92], np.float32), 0.20 * fb)
            add_gauss(frame, R.W / 2, self.cy, 0.75 * R.W, 9 * k, np.array([1.0, 0.95, 0.95], np.float32), 0.6 * fb)
        # logo
        p = ramp(t, hit - 0.05, hit + 0.75)
        if p > 0:
            a = ease_out(p)
            sc = lerp(1.07, 1.0, ease_out(p)) * (1 + 0.022 * ease_sine(ramp(t, hit + 0.75, 60.0)))
            w = int(round(self.logo.shape[1] * sc))
            spr = resize_rgba(self.logo, w)
            blur = 18 * k * (1 - ease_out(p))
            if blur > 0.4:
                spr = cv2.GaussianBlur(spr, (0, 0), blur)
            # arka parıltı
            g = self.glow
            gs = cv2.resize(g, (int(g.shape[1] * sc), int(g.shape[0] * sc)), interpolation=cv2.INTER_LINEAR)
            gx = R.W / 2 - gs.shape[1] / 2
            gy = self.cy - gs.shape[0] / 2
            gspr = np.zeros(gs.shape + (4,), np.float32)
            gspr[..., :3] = np.array([0.55, 0.55, 0.58], np.float32)
            gspr[..., 3] = np.clip(gs * 0.55, 0, 1)
            comp(frame, gspr, gx, gy, a * (0.75 + 0.25 * math.sin(t * 1.6)))
            x = R.W / 2 - spr.shape[1] / 2
            y = self.cy - spr.shape[0] / 2
            # parlama (glint) – logo maskesiyle sınırlı
            if hit + 1.0 < t < hit + 2.2:
                q = ease_sine(ramp(t, hit + 1.0, hit + 2.2))
                xs = np.arange(spr.shape[1], dtype=np.float32)[None, :]
                ys = np.arange(spr.shape[0], dtype=np.float32)[:, None]
                d = xs - (lerp(-0.25, 1.25, q) * spr.shape[1]) + ys * 0.45
                band = np.exp(-(d * d) / (2 * (70 * k) ** 2))
                spr = spr.copy()
                spr[..., :3] = np.clip(spr[..., :3] + band[..., None] * 0.75, 0, 1)
            comp(frame, spr, x, y, a)
        # slogan
        ta = ease_out(ramp(t, 55.9, 56.6))
        if ta > 0:
            ty = 1395 * k + (1 - ta) * 34 * k
            comp(frame, self.tag, R.W / 2 - self.tag.shape[1] / 2, ty - self.tag_pad - self.tag_asc * 0.62, ta)
            lw = ease_out(ramp(t, 56.2, 56.9)) * 300 * k
            if lw > 1:
                bar = np.zeros((max(1, int(round(7 * k))), int(lw), 4), np.float32)
                bar[..., :3] = RED
                bar[..., 3] = 1
                comp(frame, bar, R.W / 2 - lw / 2, 1500 * k, 1.0)
        # iletişim
        ca = ease_out(ramp(t, 56.7, 57.4))
        if ca > 0:
            gap = 140 * k
            ww = self.web.shape[1] - 2 * self.web_pad
            mw = self.mail.shape[1] - 2 * self.mail_pad
            total = ww + gap + mw
            x0 = R.W / 2 - total / 2
            cy = 1612 * k + (1 - ca) * 24 * k
            comp(frame, self.web, x0 - self.web_pad, cy - self.web_pad - self.web_asc * 0.62, ca)
            comp(frame, self.mail, x0 + ww + gap - self.mail_pad, cy - self.mail_pad - self.mail_asc * 0.62, ca)
            d = max(2, int(round(12 * k)))
            dot = np.zeros((d, d, 4), np.float32)
            dot[..., :3] = RED
            dot[..., 3] = 1
            comp(frame, dot, x0 + ww + gap / 2 - d / 2, cy - d / 2 - 4 * k, ca)
        za = ease_out(ramp(t, 57.15, 57.85))
        if za > 0:
            cy = 1740 * k + (1 - za) * 24 * k
            comp(frame, self.city, R.W / 2 - self.city.shape[1] / 2, cy - self.city_pad - self.city_asc * 0.62, za)


# --------------------------------------------------------------------------- render
class Renderer:
    def __init__(self):
        t0 = time.time()
        self.logo, self.logo_pos = load_logo()
        src = load_source(self.logo_pos)
        self.src = {g: grade(src, g) for g in GRADES}
        self.vig = make_vignette()
        self.grain = make_grain()
        self.dust = Dust()
        self.card = Card(self.logo)
        self.titles = [(make_lower_third(s), a, b) for s, a, b in TITLES]
        self.buf = np.zeros((R.H, R.W, 3), np.float32)
        print(f'[render] hazırlık {time.time() - t0:.1f}s', file=sys.stderr)

    def shot_image(self, shot, t):
        cx, cy, w, rot = shot_cam(shot, t)
        M = cam_matrix(cx, cy, w, rot)
        img = cv2.warpAffine(self.src[shot['g']], M, (R.W, R.H), flags=cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REFLECT101)
        img = img.astype(np.float32) * (1.0 / 255.0)
        fx = shot['fx']
        if 'sweep' in fx:
            fx_sweep(img, t, *fx['sweep'])
        if fx.get('flare'):
            fx_flare(img, M, t, fx['flare'], seed=hash(shot['n']) % 7)
        if fx.get('dim'):
            img *= fx['dim']
        return img

    def frame(self, t, fi):
        k = R.k
        if t >= CARD_T:
            f = self.buf
            self.card.render(f, t)
            self.dust.draw(f, t, 0.5 * ease_io(ramp(t, CARD_T + 0.5, CARD_T + 1.5)))
        else:
            act = [s for s in SHOTS if s['t0'] <= t < s['t1']]
            if not act:
                act = [SHOTS[-1]]
            f = None
            for s in act:
                img = self.shot_image(s, t)
                if f is None:
                    f = img
                    w_prev = s
                else:
                    # çapraz geçiş: yeni çekimin ağırlığı
                    wgt = ease_io(ramp(t, s['t0'], w_prev['t1']))
                    f = f * (1 - wgt) + img * wgt
            # sahne bazlı efektler
            cur = act[-1]
            leak = cur['fx'].get('leak')
            if leak:
                amt = 0.30 if leak == 'dawn' else 0.32
                fx_leak(f, t, leak, amt)
            dust_amt = max(s['fx'].get('dust', 0) for s in act)
            self.dust.draw(f, t, dust_amt)
            # flaşlar
            fl = 0.0
            for c in SCENE_FLASH:
                fl += 0.26 * math.exp(-((t - c) / 0.11) ** 2)
            for c in CUT_FLASH:
                if t >= c:
                    fl += 0.38 * math.exp(-(t - c) / 0.07)
            if fl > 0.004:
                f += fl * np.array([1.0, 0.95, 0.88], np.float32)
                if fl > 0.12:
                    fx_leak(f, t, 'red', min(0.18, fl * 0.4))
            f *= self.vig[..., None]
            # açılış / kapanış kararması
            fade = ease_io(ramp(t, 0.15, 1.6)) * (1 - ease_io(ramp(t, 53.55, 54.2)))
            if fade < 0.999:
                f *= fade
            np.clip(f, 0, 1, out=f)
            # yazılar
            for lt, a, b in self.titles:
                draw_lower_third(f, lt, t, a, b)
            for wd, a, b in WORDS:
                draw_word(f, wd, t, a, b)
        # film greni + bantlar
        g = self.grain[fi % len(self.grain)]
        lum = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        amp = (0.010 + 0.014 * (1 - np.abs(lum * 2 - 1)))
        f += (g * amp)[..., None]
        if t < CARD_T and R.BAR > 0:
            f[:R.BAR] = 0
            f[R.H - R.BAR:] = 0
        np.clip(f, 0, 1, out=f)
        return (f * 255 + 0.5).astype(np.uint8)


def ffmpeg_writer(path, crf, maxrate):
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{R.W}x{R.H}', '-r', str(R.FPS), '-i', '-',
           '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-profile:v', 'high',
           '-pix_fmt', 'yuv420p', '-g', str(R.FPS), '-bf', '2',
           '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if maxrate:
        cmd += ['-maxrate', maxrate, '-bufsize', str(int(maxrate.rstrip('M')) * 2) + 'M']
    cmd += ['-an', path]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def render_range(args, f0, f1, path):
    setup(args.width, args.fps)
    r = Renderer()
    w = ffmpeg_writer(path, args.crf, args.maxrate)
    t_start = time.time()
    for fi in range(f0, f1):
        t = fi / R.FPS
        w.stdin.write(r.frame(t, fi).tobytes())
        if (fi - f0) % 120 == 0:
            el = time.time() - t_start
            done = fi - f0 + 1
            print(f'[{path.split("/")[-1]}] {done}/{f1 - f0}  {el / done:.2f}s/kare', file=sys.stderr, flush=True)
    w.stdin.close()
    w.wait()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--width', type=int, default=3840)
    ap.add_argument('--fps', type=int, default=60)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--out', default=os.path.join(ROOT, 'output', 'video_sessiz.mp4'))
    ap.add_argument('--crf', type=int, default=18)
    ap.add_argument('--maxrate', default='')
    ap.add_argument('--stills', default='')
    ap.add_argument('--stills-dir', default='/tmp/stills')
    ap.add_argument('--part', type=int, default=-1)
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--end', type=float, default=DUR)
    args = ap.parse_args()
    setup(args.width, args.fps)

    if args.stills:
        os.makedirs(args.stills_dir, exist_ok=True)
        r = Renderer()
        for s in args.stills.split(','):
            t = float(s)
            img = r.frame(t, int(t * R.FPS))
            Image.fromarray(img).save(os.path.join(args.stills_dir, f'still_{t:06.2f}.jpg'), quality=92)
        return

    n_frames = int(round((args.end - args.start) * R.FPS))
    first = int(round(args.start * R.FPS))
    if args.part >= 0:
        per = math.ceil(n_frames / args.workers)
        f0 = first + args.part * per
        f1 = min(first + n_frames, f0 + per)
        render_range(args, f0, f1, args.out + f'.part{args.part}.mp4')
        return

    # paralel parçalar
    procs = []
    for p in range(args.workers):
        cmd = [sys.executable, os.path.abspath(__file__), '--width', str(args.width), '--fps', str(args.fps),
               '--workers', str(args.workers), '--out', args.out, '--crf', str(args.crf),
               '--part', str(p), '--start', str(args.start), '--end', str(args.end)]
        if args.maxrate:
            cmd += ['--maxrate', args.maxrate]
        procs.append(subprocess.Popen(cmd))
    rc = [p.wait() for p in procs]
    if any(rc):
        sys.exit('render hatası: ' + str(rc))
    lst = args.out + '.parts.txt'
    with open(lst, 'w') as fh:
        for p in range(args.workers):
            fh.write(f"file '{os.path.abspath(args.out)}.part{p}.mp4'\n")
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                           '-c', 'copy', args.out])
    for p in range(args.workers):
        os.remove(f'{args.out}.part{p}.mp4')
    os.remove(lst)
    print('tamam:', args.out)


if __name__ == '__main__':
    main()
