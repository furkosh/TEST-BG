"""Procedural textures for the sets (PIL + numpy): lace curtain, quilted bedspread, kilim, wallpaper,
wood-veneer doors and wardrobe, framed print, wall clock, newspaper-free. Packed into one RGBA atlas."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RNG = np.random.default_rng(7)


def smooth_noise(w, h, cell, seed=0, tile=True):
    """value noise via bicubic upscaling of a random grid (tileable when the grid wraps)"""
    r = np.random.default_rng(seed)
    gw, gh = max(2, w // cell), max(2, h // cell)
    g = r.random((gh, gw)).astype(np.float32)
    if tile:
        g = np.pad(g, 2, mode='wrap')
        im = Image.fromarray((g * 255).astype(np.uint8)).resize(((gw + 4) * cell, (gh + 4) * cell), Image.BICUBIC)
        a = np.asarray(im, np.float32)[2 * cell:2 * cell + h, 2 * cell:2 * cell + w] / 255
    else:
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        a = np.asarray(im, np.float32) / 255
    return a


def fbm2(w, h, cell, oct=4, seed=0, tile=True):
    acc, amp, n = np.zeros((h, w), np.float32), 0.5, 0
    for k in range(oct):
        c = max(2, cell >> k)
        acc += amp * smooth_noise(w, h, c, seed + k * 17, tile)
        n += amp; amp *= 0.5
    return acc / n


def lace(size=512):
    """white tulle: fine hex net + floral motifs + scalloped bands; alpha = density"""
    S = size * 2
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    # hexagonal net
    step = 14
    for y in range(-step, S + step, step):
        off = (y // step % 2) * step / 2
        for x in range(-step, S + step, step):
            cx, cy = x + off, y
            d.line([(cx, cy), (cx + step / 2, cy + step * 0.5)], fill=70, width=2)
            d.line([(cx, cy), (cx - step / 2, cy + step * 0.5)], fill=70, width=2)
    # floral motifs on a diamond grid
    g = S // 4
    for j in range(5):
        for i in range(5):
            cx, cy = i * g + (j % 2) * g / 2, j * g
            for k in range(8):
                a = k / 8 * math.tau
                px, py = cx + math.cos(a) * g * 0.16, cy + math.sin(a) * g * 0.16
                d.ellipse([px - g * 0.09, py - g * 0.09, px + g * 0.09, py + g * 0.09], fill=215)
            d.ellipse([cx - g * 0.07, cy - g * 0.07, cx + g * 0.07, cy + g * 0.07], fill=245)
            for k in range(4):
                a = k / 4 * math.tau + math.pi / 4
                x1, y1 = cx + math.cos(a) * g * 0.28, cy + math.sin(a) * g * 0.28
                x2, y2 = cx + math.cos(a) * g * 0.46, cy + math.sin(a) * g * 0.46
                d.line([(x1, y1), (x2, y2)], fill=190, width=5)
                d.ellipse([x2 - 9, y2 - 13, x2 + 9, y2 + 13], fill=200)
    # vertical scalloped bands
    for bx in (S * 0.12, S * 0.62):
        for y in range(0, S, 24):
            d.arc([bx - 18, y, bx + 18, y + 24], 270, 90, fill=230, width=4)
            d.arc([bx + 30, y + 12, bx + 66, y + 36], 90, 270, fill=230, width=4)
    m = m.filter(ImageFilter.GaussianBlur(1.2)).resize((size, size), Image.LANCZOS)
    a = np.asarray(m, np.float32) / 255
    a = np.clip(a * 1.15 + 0.06, 0, 1)
    rgb = np.ones((size, size, 3), np.float32) * np.array([0.93, 0.92, 0.88], np.float32)
    return np.dstack([rgb, a])


def damask(size, base, ink, seed=3, scale=1.0):
    """tileable symmetric floral damask"""
    S = size * 2
    im = Image.new('RGB', (S, S), tuple(base))
    d = ImageDraw.Draw(im)
    g = S // 2
    for (cx, cy) in [(0, 0), (g, g), (S, 0), (0, S), (S, S), (g, 0) if False else (g, g)]:
        for k in range(6):
            a = k / 6 * math.tau
            px, py = cx + math.cos(a) * g * 0.26 * scale, cy + math.sin(a) * g * 0.36 * scale
            d.ellipse([px - g * 0.11, py - g * 0.2, px + g * 0.11, py + g * 0.2], fill=tuple(ink))
        d.ellipse([cx - g * 0.12, cy - g * 0.12, cx + g * 0.12, cy + g * 0.12], fill=tuple(base))
        d.ellipse([cx - g * 0.06, cy - g * 0.06, cx + g * 0.06, cy + g * 0.06], fill=tuple(ink))
    # vines between motifs
    for (cx, cy) in [(g, 0), (0, g), (S, g), (g, S)]:
        for s in (-1, 1):
            pts = [(cx + s * g * 0.05 * math.sin(t * 3), cy - g * 0.45 + t * g * 0.3) for t in np.linspace(0, 3, 30)]
            d.line(pts, fill=tuple(ink), width=10)
        d.ellipse([cx - g * 0.1, cy - g * 0.16, cx + g * 0.1, cy + g * 0.16], fill=tuple(ink))
    im = im.filter(ImageFilter.GaussianBlur(1.5)).resize((size, size), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    n = fbm2(size, size, 64, 4, seed)[..., None]
    a = a * (0.9 + 0.2 * n)
    return np.dstack([a, np.ones((size, size), np.float32)])


def bedspread(size=512):
    """burgundy satin bedspread with gold floral damask (tileable)"""
    t = damask(size, (100, 28, 36), (146, 84, 62), seed=5, scale=1.0)
    return t


def wallpaper(size=512):
    return damask(size, (196, 182, 160), (178, 162, 140), seed=9, scale=0.9)


def kilim(w=512, h=768):
    """geometric Anatolian kilim: border bands + central diamonds (göz) + hooks"""
    S = 2
    im = Image.new('RGB', (w * S, h * S), (150, 38, 34))
    d = ImageDraw.Draw(im)
    W2, H2 = w * S, h * S
    navy, cream, ochre, brown, red2 = (40, 44, 78), (214, 198, 164), (192, 140, 58), (58, 34, 28), (176, 56, 44)
    # outer border bands
    d.rectangle([0, 0, W2, H2], fill=brown)
    d.rectangle([24, 24, W2 - 24, H2 - 24], fill=cream)
    d.rectangle([44, 44, W2 - 44, H2 - 44], fill=navy)
    # running-dog border motif
    for y in range(64, H2 - 64, 56):
        for x in (60, W2 - 108):
            d.polygon([(x, y), (x + 24, y + 28), (x, y + 56), (x + 48, y + 56), (x + 48, y)], fill=ochre)
    d.rectangle([116, 116, W2 - 116, H2 - 116], fill=(150, 38, 34))
    # central medallion column of diamonds
    cx = W2 / 2
    n = 4
    for k in range(n):
        cy = 116 + (H2 - 232) * (k + 0.5) / n
        R = (W2 - 232) * 0.42
        for rr, colr in [(R, navy), (R * 0.78, cream), (R * 0.6, red2), (R * 0.42, ochre), (R * 0.22, navy)]:
            d.polygon([(cx, cy - rr * 1.05), (cx + rr, cy), (cx, cy + rr * 1.05), (cx - rr, cy)], fill=colr)
        # hooks
        for s in (-1, 1):
            for q in range(3):
                hx = cx + s * (R + 10 + q * 0)
                d.polygon([(hx, cy - 30 + q * 20), (hx + s * 30, cy - 15 + q * 20), (hx, cy + q * 20)], fill=cream)
    # small ornaments in the field
    r = np.random.default_rng(4)
    for k in range(40):
        x, y = r.uniform(140, W2 - 140), r.uniform(140, H2 - 140)
        if abs(x - cx) < (W2 - 232) * 0.45:
            continue
        s = r.uniform(10, 18)
        d.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=[navy, cream, ochre][k % 3])
    im = im.filter(ImageFilter.GaussianBlur(1.0)).resize((w, h), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    # woven texture + wear
    yy = np.arange(h)[:, None]; xx = np.arange(w)[None, :]
    weave = 0.92 + 0.08 * (np.sin(yy * 1.9) * 0.5 + 0.5)
    wear = fbm2(w, h, 96, 4, 12, tile=False)
    a = a * weave[..., None] * (0.82 + 0.3 * wear[..., None])
    return np.dstack([np.clip(a, 0, 1), np.ones((h, w), np.float32)])


def wood_grain(w, h, base, dark, seed=1, horizontal=False):
    """vertical wood grain (veneer)"""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    if horizontal:
        xx, yy = yy, xx
    n1 = fbm2(w, h, 128, 4, seed, tile=False)
    n2 = fbm2(w, h, 16, 3, seed + 3, tile=False)
    n3 = fbm2(w, h, 6, 2, seed + 7, tile=False)
    rings = np.sin((xx / w * 46 + n1 * 3.2 + yy / h * 0.8) * math.pi) * 0.5 + 0.5
    t = np.clip(rings ** 4 * 0.45 + n2 * 0.25 + (n3 - 0.5) * 0.25, 0, 1)
    base, dark = np.array(base, np.float32) / 255, np.array(dark, np.float32) / 255
    rgb = base[None, None] * (1 - t[..., None]) + dark[None, None] * t[..., None]
    return rgb


def panel_door(w=256, h=576, base=(150, 102, 64), dark=(98, 60, 36)):
    """wood-veneer interior door with two raised panels (shading baked)"""
    rgb = wood_grain(w, h, base, dark, seed=21)
    sh = np.ones((h, w), np.float32)
    im = Image.new('L', (w, h), 128)
    d = ImageDraw.Draw(im)
    for (x0, y0, x1, y1) in [(34, 36, w - 34, h * 0.44), (34, h * 0.52, w - 34, h - 40)]:
        # molding: light top-left bevel, dark bottom-right
        d.rectangle([x0, y0, x1, y1], fill=112)
        d.line([(x0, y1), (x0, y0), (x1, y0)], fill=200, width=6)
        d.line([(x0, y1), (x1, y1), (x1, y0)], fill=50, width=6)
        d.rectangle([x0 + 14, y0 + 14, x1 - 14, y1 - 14], fill=138)
        d.line([(x0 + 14, y1 - 14), (x1 - 14, y1 - 14), (x1 - 14, y0 + 14)], fill=170, width=4)
        d.line([(x0 + 14, y1 - 14), (x0 + 14, y0 + 14), (x1 - 14, y0 + 14)], fill=80, width=4)
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    sh = np.asarray(im, np.float32) / 128
    rgb = np.clip(rgb * sh[..., None], 0, 1)
    return np.dstack([rgb, np.ones((h, w), np.float32)])


def wardrobe_door(w=256, h=768, mirror=False):
    rgb = wood_grain(w, h, (128, 86, 56), (84, 52, 32), seed=33)
    im = Image.new('L', (w, h), 128)
    d = ImageDraw.Draw(im)
    d.rectangle([18, 18, w - 18, h - 18], outline=90, width=5)
    d.line([(20, h - 20), (w - 20, h - 20), (w - 20, 20)], fill=175, width=3)
    im = im.filter(ImageFilter.GaussianBlur(1.0))
    sh = np.asarray(im, np.float32) / 128
    rgb = np.clip(rgb * sh[..., None], 0, 1)
    if mirror:
        y0, y1, x0, x1 = 60, h - 60, 40, w - 40
        mm = np.zeros((h, w), np.float32); mm[y0:y1, x0:x1] = 1
        mirror_col = np.array([0.08, 0.09, 0.1], np.float32)
        rgb = rgb * (1 - mm[..., None]) + mirror_col * mm[..., None]
    return np.dstack([rgb, np.ones((h, w), np.float32)])


def framed_print(w=320, h=240):
    """gilded frame around a faded landscape print (hills, poplars, sky)"""
    im = Image.new('RGB', (w, h), (150, 118, 60))
    d = ImageDraw.Draw(im)
    d.rectangle([14, 14, w - 14, h - 14], fill=(40, 34, 26))
    x0, y0, x1, y1 = 22, 22, w - 22, h - 22
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        c = (int(150 - t * 40), int(170 - t * 50), int(175 - t * 80))
        d.line([(x0, y), (x1, y)], fill=c)
    d.polygon([(x0, y1 - 60), (x0 + 90, y1 - 100), (x0 + 180, y1 - 70), (x1, y1 - 110), (x1, y1), (x0, y1)], fill=(84, 96, 62))
    d.polygon([(x0, y1 - 30), (x0 + 120, y1 - 50), (x1, y1 - 40), (x1, y1), (x0, y1)], fill=(70, 80, 46))
    for k in range(5):
        px = x0 + 40 + k * 22
        d.ellipse([px - 5, y1 - 105, px + 5, y1 - 45], fill=(46, 60, 36))
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    a = np.asarray(im, np.float32) / 255
    return np.dstack([a, np.ones((h, w), np.float32)])


def clock_face(s=256, hh=3, mm=17):
    im = Image.new('RGBA', (s * 2, s * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    S = s * 2
    d.ellipse([4, 4, S - 4, S - 4], fill=(60, 44, 30, 255))
    d.ellipse([24, 24, S - 24, S - 24], fill=(236, 230, 214, 255))
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 46)
    except Exception:
        f = ImageFont.load_default()
    c = S / 2
    for k in range(1, 13):
        a = k / 12 * math.tau - math.pi / 2
        x, y = c + math.cos(a) * S * 0.36, c + math.sin(a) * S * 0.36
        d.text((x, y), str(k), fill=(20, 18, 16, 255), font=f, anchor='mm')
    for k in range(60):
        a = k / 60 * math.tau
        r0 = S * 0.43 if k % 5 else S * 0.41
        d.line([(c + math.cos(a) * r0, c + math.sin(a) * r0), (c + math.cos(a) * S * 0.45, c + math.sin(a) * S * 0.45)], fill=(30, 28, 26, 255), width=3)
    ah = (hh + mm / 60) / 12 * math.tau - math.pi / 2
    am = mm / 60 * math.tau - math.pi / 2
    d.line([(c, c), (c + math.cos(ah) * S * 0.22, c + math.sin(ah) * S * 0.22)], fill=(16, 14, 12, 255), width=12)
    d.line([(c, c), (c + math.cos(am) * S * 0.33, c + math.sin(am) * S * 0.33)], fill=(16, 14, 12, 255), width=8)
    d.ellipse([c - 10, c - 10, c + 10, c + 10], fill=(16, 14, 12, 255))
    im = im.resize((s, s), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def pillow_cotton(size=256):
    n = fbm2(size, size, 32, 4, 41)
    yy = np.arange(size)[:, None]
    stripe = 0.96 + 0.04 * np.sin(yy * 0.8)
    v = (0.86 + 0.12 * n) * stripe
    rgb = np.dstack([v * 0.98, v * 0.97, v * 0.93])
    return np.dstack([rgb, np.ones((size, size), np.float32)])


def gate_bars(w=256, h=256):
    """iron garden gate (alpha cut-out)"""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(8, w, 26):
        d.rectangle([x, 0, x + 5, h], fill=(40, 40, 42, 255))
    d.rectangle([0, 10, w, 18], fill=(40, 40, 42, 255)); d.rectangle([0, h - 18, w, h - 10], fill=(40, 40, 42, 255))
    for x in range(8, w, 26):
        d.ellipse([x - 4, h // 2 - 8, x + 9, h // 2 + 8], outline=(40, 40, 42, 255), width=3)
    return np.asarray(im, np.float32) / 255


def foliage(size=512, seed=3):
    """leafy clumps for tree crowns (alpha cut-out, tileable)"""
    r = np.random.default_rng(seed)
    S = size * 2
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for k in range(2600):
        x, y = r.uniform(0, S), r.uniform(0, S)
        s = r.uniform(7, 15)
        a = r.uniform(0, math.pi)
        g = int(r.uniform(60, 120))
        pts = [(x + math.cos(a) * s * 1.6, y + math.sin(a) * s * 1.6), (x + math.cos(a + 1.6) * s * 0.7, y + math.sin(a + 1.6) * s * 0.7),
               (x - math.cos(a) * s * 1.6, y - math.sin(a) * s * 1.6), (x - math.cos(a + 1.6) * s * 0.7, y - math.sin(a + 1.6) * s * 0.7)]
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                d.polygon([(px + ox, py + oy) for px, py in pts], fill=(int(g * 0.55), g, int(g * 0.45), 255))
    im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def build_atlas():
    items = {
        'lace': lace(512), 'bedspread': bedspread(512), 'wallpaper': wallpaper(512), 'kilim': kilim(512, 768),
        'door': panel_door(256, 576), 'wardrobe': wardrobe_door(256, 768), 'wardrobe_m': wardrobe_door(256, 768, True),
        'print': framed_print(320, 240), 'clock': clock_face(256), 'pillow': pillow_cotton(256), 'gate': gate_bars(256, 256),
        'foliage': foliage(512),
    }
    # simple shelf packing into 2048 wide
    AW = 2048
    x = y = rowh = 0
    rects = {}
    order = sorted(items.items(), key=lambda kv: -kv[1].shape[0])
    for name, img in order:
        h, w = img.shape[:2]
        if x + w > AW:
            x = 0; y += rowh; rowh = 0
        rects[name] = (x, y, w, h)
        x += w; rowh = max(rowh, h)
    AH = y + rowh
    A = np.zeros((AH, AW, 4), np.float32)
    for name, img in items.items():
        x0, y0, w, h = rects[name]
        A[y0:y0 + h, x0:x0 + w] = img
    # textures are authored in sRGB: convert colour to linear (alpha stays)
    A[..., :3] = np.where(A[..., :3] <= 0.04045, A[..., :3] / 12.92, ((A[..., :3] + 0.055) / 1.055) ** 2.4)
    return A, rects


if __name__ == '__main__':
    A, rects = build_atlas()
    print(A.shape, rects)
    out = A.copy(); out[..., :3] = out[..., :3] ** (1 / 2.2)
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save('/tmp/claude-0/-home-user-TEST-BG/6153618c-d421-5e64-a986-ffee99bbbbd7/scratchpad/bake/atlas.png')
