"""The family's old single-storey house in Ereğli: bedroom, corridor, front door, yard and street.
One model for every interior / exterior view keeps all sets consistent.

Coordinates (metres): bedroom x 0..4.0, z 0..3.6, floor y = 0, ceiling 2.7. Window on the left (street-side) wall x = 0,
door on the right wall x = 4.0 to the corridor (x 4.15..5.35). The husband sleeps on the door side, the wife by the window.
"""
import math
import numpy as np
from rt import *
from tex import build_atlas

BED = dict(x0=1.0, x1=2.8, z0=1.5, z1=3.6)
WIN = dict(z0=0.95, z1=2.35, y0=0.92, y1=2.28)
DOOR = dict(z0=2.45, z1=3.35, h=2.05, x=4.0, hinge_z=3.33)
HEAD_W = (1.52, 0.80, 3.17)       # wife's head on the pillow (face up)
HEAD_H = (2.27, 0.82, 3.14)       # husband's head (lying on his left side, facing her)
DOUBLE_AT = (4.55, 0.0, 2.92)     # where the double stands in the corridor, framed by the door
LAMP = (-10.6, 3.15, -1.25)       # sodium lamp on the wall of the house across the side street


def _gauss2(X, Z, cx, cz, sx, sz):
    return np.exp(-(((X - cx) / sx) ** 2 + ((Z - cz) / sz) ** 2) / 2)


def blanket_heights(people=True, res=150, seed=3):
    wife = people in (True, 'both')
    husband = people in (True, 'both', 'husband')
    """quilt surface over the bed: x 1.0..2.8, z 1.52..2.98 (rows = z, cols = x); world y values"""
    from scipy.ndimage import gaussian_filter
    x = np.linspace(BED['x0'], BED['x1'], int((BED['x1'] - BED['x0']) * res))
    z = np.linspace(1.52, 2.98, int(1.46 * res))
    X, Z = np.meshgrid(x, z)
    base = 0.64
    Hh = np.full(X.shape, base)
    if husband:
        # wife on her back (x ~ 1.5): chest, hips, legs, feet  (sitting up: legs + bunched blanket at the waist)
        w = np.zeros_like(X)
        prof = [(2.76, 0.13, 0.19, 0.22), (2.45, 0.105, 0.17, 0.2), (2.17, 0.115, 0.18, 0.17)] if wife else [(2.5, 0.16, 0.24, 0.12), (2.3, 0.1, 0.2, 0.16)]
        for (cz, amp, sx, sz) in prof:
            w = np.maximum(w, amp * _gauss2(X, Z, 1.5, cz, sx, sz))
        for lx in (1.43, 1.58):
            w = np.maximum(w, 0.075 * _gauss2(X, Z, lx, 1.9, 0.08, 0.24))
            w = np.maximum(w, 0.085 * _gauss2(X, Z, lx + (lx - 1.5) * 0.4, 1.64, 0.06, 0.06))
        # husband on his left side facing her (x ~ 2.3): shoulder, waist, hip, bent knees toward -x
        hb = np.zeros_like(X)
        for (cx, cz, amp, sx, sz) in [(2.33, 2.78, 0.2, 0.15, 0.17), (2.35, 2.5, 0.15, 0.14, 0.17), (2.37, 2.22, 0.19, 0.16, 0.16),
                                      (2.22, 1.98, 0.12, 0.15, 0.13), (2.12, 1.84, 0.09, 0.1, 0.11), (2.26, 1.72, 0.07, 0.09, 0.09)]:
            hb = np.maximum(hb, amp * _gauss2(X, Z, cx, cz, sx, sz))
        Hh = base + np.maximum(w, hb)
        # fabric drapes: blur the max of the bodies (tension), keep peaks
        Hh = np.maximum(gaussian_filter(Hh, 5.0), Hh - 0.02)
    # folds: diagonal ridges, stronger between the bodies and toward the foot
    r = np.random.default_rng(seed)
    folds = np.zeros_like(X)
    for k in range(9):
        a = r.uniform(-0.9, 0.9) + (np.pi / 2 if k % 3 == 0 else 0)
        f = r.uniform(9, 16)
        ph = r.uniform(0, 6.28)
        cx, cz = r.uniform(1.3, 2.5), r.uniform(1.6, 2.7)
        env = _gauss2(X, Z, cx, cz, 0.25, 0.35)
        folds += env * np.sin((np.cos(a) * X + np.sin(a) * Z) * f + ph) * r.uniform(0.003, 0.007)
    Hh = Hh + gaussian_filter(folds, 2.0)
    # settle the outer border to the flat quilt level so the side drapes meet it
    edge = np.minimum.reduce([(X - BED['x0']) / 0.05, (BED['x1'] - X) / 0.05, (Z - 1.52) / 0.05, np.ones_like(X) * 1])
    edge = np.clip(edge, 0, 1)
    Hh = base + (Hh - base) * edge
    return Hh


def pillow_heights(cx, dent=None, res=180):
    """pillow on the mattress (top 0.60): x cx +- 0.36, z 3.04..3.44; dent = (x, z) of the head"""
    from scipy.ndimage import gaussian_filter
    x = np.linspace(cx - 0.36, cx + 0.36, int(0.72 * res))
    z = np.linspace(3.04, 3.44, int(0.40 * res))
    X, Z = np.meshgrid(x, z)
    u, v = (X - cx) / 0.36, (Z - 3.24) / 0.2
    p = 3.2
    d = np.clip(1 - (np.abs(u) ** p + np.abs(v) ** p), 0, 1) ** (1 / p)
    Hh = 0.595 + 0.15 * d ** 0.75
    if dent is not None:
        Hh -= 0.055 * _gauss2(X, Z, dent[0], dent[1], 0.085, 0.09) * (d > 0.2)
    r = np.random.default_rng(int(cx * 100))
    wr = np.zeros_like(X)
    for k in range(6):
        a = r.uniform(0, np.pi)
        wr += np.sin((np.cos(a) * X + np.sin(a) * Z) * r.uniform(30, 60) + r.uniform(0, 6)) * 0.002
    Hh += gaussian_filter(wr, 1.5) * d
    return Hh


def wall_x(S, x0, x1, z0, z1, y0, y1, holes, mat, layer=1):
    """wall slab spanning z with rectangular holes [(z0,z1,y0,y1)]"""
    holes = sorted(holes)
    zc = z0
    for hz0, hz1, hy0, hy1 in holes:
        if hz0 > zc:
            S.box((x0, y0, zc), (x1, y1, hz0), mat, layer)
        if hy0 > y0:
            S.box((x0, y0, hz0), (x1, hy0, hz1), mat, layer)
        if hy1 < y1:
            S.box((x0, hy1, hz0), (x1, y1, hz1), mat, layer)
        zc = hz1
    if zc < z1:
        S.box((x0, y0, zc), (x1, y1, z1), mat, layer)


def wall_z(S, z0, z1, x0, x1, y0, y1, holes, mat, layer=1):
    holes = sorted(holes)
    xc = x0
    for hx0, hx1, hy0, hy1 in holes:
        if hx0 > xc:
            S.box((xc, y0, z0), (hx0, y1, z1), mat, layer)
        if hy0 > y0:
            S.box((hx0, y0, z0), (hx1, hy0, z1), mat, layer)
        if hy1 < y1:
            S.box((hx0, hy1, z0), (hx1, y1, z1), mat, layer)
        xc = hx1
    if xc < x1:
        S.box((xc, y0, z0), (x1, y1, z1), mat, layer)


def materials(S):
    S.mat('plaster', MT_PLASTER, (206, 190, 170), noise=0.10, nscale=1.3)
    S.mat('plaster_c', MT_PLASTER, (204, 200, 192), noise=0.08, nscale=1.1)      # corridor
    S.mat('ceiling', MT_PLASTER, (222, 220, 214), noise=0.06, nscale=0.8)
    S.mat('wallpaper', MT_ATLAS, (255, 255, 255), tex='wallpaper', su=2.2, sv=2.2, uvm=1, noise=0.05, nscale=2)
    S.mat('trim', MT_FLAT, (236, 234, 228), noise=0.04, nscale=4, shin=30, spec=0.15)
    S.mat('floor', MT_PLANKS, (128, 90, 58), color2=(156, 112, 72), pa=0.19, pb=1.28, shin=40, spec=0.25)
    S.mat('kilim', MT_ATLAS, (255, 255, 255), tex='kilim', noise=0.12, nscale=9)
    S.mat('walnut', MT_WOOD, (104, 66, 42), shin=30, spec=0.2, noise=0.05, nscale=3)
    S.mat('veneer_door', MT_ATLAS, (255, 255, 255), tex='door', shin=25, spec=0.18)
    S.mat('doorwood', MT_WOOD, (150, 102, 64), shin=25, spec=0.18)
    S.mat('wardrobe', MT_ATLAS, (255, 255, 255), tex='wardrobe', shin=25, spec=0.15)
    S.mat('wardrobe_m', MT_ATLAS, (255, 255, 255), tex='wardrobe_m', shin=80, spec=0.6)
    S.mat('metal', MT_FLAT, (170, 166, 156), shin=60, spec=0.8)
    S.mat('blackmetal', MT_FLAT, (30, 30, 32), shin=30, spec=0.3)
    S.mat('quilt', MT_QUILT, (255, 255, 255), tex='bedspread', su=4.6, sv=4.6, uvm=1, pa=5.0, shin=12, spec=0.1)
    S.mat('sheet', MT_FLAT, (226, 222, 212), noise=0.08, nscale=10)
    S.mat('pillow', MT_ATLAS, (250, 246, 236), tex='pillow', su=3.0, sv=3.0, uvm=1)
    S.mat('radiator', MT_RADIATOR, (228, 228, 224), pa=22.0, shin=30, spec=0.3)
    S.mat('pvc', MT_FLAT, (232, 232, 228), noise=0.03, nscale=5, shin=50, spec=0.35)
    S.mat('marble', MT_PLASTER, (222, 216, 206), noise=0.18, nscale=6, shin=60, spec=0.4)
    S.mat('glass', MT_FLAT, (200, 210, 220), opa=0.1, shin=200, spec=2.0)
    S.mat('lace', MT_ATLAS, (255, 255, 255), tex='lace', su=2.3, sv=2.3, uvm=1, opa=0.82, trl=0.85)
    S.mat('drape', MT_FOLDS, (58, 84, 90), pa=26.0, bump=0.55, noise=0.08, nscale=6)
    S.mat('lampshade', MT_FLAT, (214, 200, 170), noise=0.05, nscale=8, trl=0.6)
    S.mat('ceramic', MT_FLAT, (90, 110, 120), shin=60, spec=0.6)
    S.mat('print', MT_ATLAS, (255, 255, 255), tex='print', shin=40, spec=0.2)
    S.mat('clock', MT_ATLAS, (255, 255, 255), tex='clock', cut=1, shin=60, spec=0.4)
    S.mat('phone', MT_FLAT, (18, 18, 20), shin=120, spec=1.0)
    S.mat('proxy', MT_FLAT, (60, 50, 45))
    # exterior
    S.mat('stucco', MT_STUCCO, (196, 176, 146), color2=(168, 150, 124), noise=0.25, nscale=1.6)
    S.mat('ground', MT_ASPHALT, (66, 60, 52), noise=0.1, nscale=2)
    S.mat('asphalt', MT_ASPHALT, (52, 52, 54), shin=20, spec=0.15)
    S.mat('roof', MT_TILES, (150, 70, 46), color2=(86, 82, 58), pa=0.33, pb=0.21)
    S.mat('bark', MT_PLASTER, (62, 54, 46), noise=0.4, nscale=6)
    S.mat('leaves', MT_ATLAS, (255, 255, 255), tex='foliage', su=1.4, sv=1.4, uvm=1, cut=1)
    S.mat('bulb', MT_FLAT, (255, 200, 140), emit=(9.0, 5.2, 2.0))
    S.mat('concrete', MT_PLASTER, (150, 146, 138), noise=0.3, nscale=2)
    S.mat('litwin', MT_FLAT, (40, 30, 20), emit=(0.35, 0.22, 0.10))


def bedroom(S, door_open=98.0, double_proxy=False, heads=True, people=True, layer_fg=1, curtains='night', bedroom_door=True):
    W0, D0, H0 = 4.0, 3.6, 2.7
    # shell
    S.box((-0.25, -0.45, -3.2), (5.5, 0.0, 4.55), 'floor')                           # house floor slab (interior finish)
    S.box((-0.25, H0, -0.25), (5.5, H0 + 0.25, D0 + 0.25), 'ceiling')
    wall_x(S, -0.25, 0.0, -0.25, D0 + 0.25, -0.45, H0, [(WIN['z0'], WIN['z1'], WIN['y0'], WIN['y1'])], 'plaster')
    wall_z(S, -0.25, 0.0, 0.0, W0, 0.0, H0, [], 'plaster')
    wall_z(S, D0, D0 + 0.25, 0.0, W0 + 0.15, 0.0, H0, [], 'wallpaper')
    wall_x(S, W0, W0 + 0.15, 0.0, D0, 0.0, H0, [(DOOR['z0'], DOOR['z1'], 0.0, DOOR['h'])], 'plaster')
    # crown moulding + skirting
    for (a, b) in [((0, H0 - 0.07, 0), (0.06, H0, D0)), ((W0 - 0.06, H0 - 0.07, 0), (W0, H0, D0)),
                   ((0, H0 - 0.07, 0), (W0, H0, 0.06)), ((0, H0 - 0.07, D0 - 0.06), (W0, H0, D0))]:
        S.box(a, b, 'trim')
    for (a, b) in [((0, 0, 0), (0.015, 0.08, WIN['z0'] - 0.1)), ((0, 0, WIN['z1'] + 0.1), (0.015, 0.08, D0)),
                   ((0, 0, D0 - 0.015), (W0, 0.08, D0)), ((W0 - 0.015, 0, 0), (W0, 0.08, DOOR['z0'] - 0.07))]:
        S.box(a, b, 'trim')
    # ---- window (PVC, two sashes) ----
    z0, z1, y0, y1 = WIN['z0'], WIN['z1'], WIN['y0'], WIN['y1']
    fx0, fx1, fw = -0.17, -0.09, 0.065
    S.box((fx0, y0, z0), (fx1, y0 + fw, z1), 'pvc'); S.box((fx0, y1 - fw, z0), (fx1, y1, z1), 'pvc')
    S.box((fx0, y0, z0), (fx1, y1, z0 + fw), 'pvc'); S.box((fx0, y0, z1 - fw), (fx1, y1, z1), 'pvc')
    zm = (z0 + z1) / 2
    S.box((fx0, y0, zm - 0.04), (fx1, y1, zm + 0.04), 'pvc')
    for (a, b) in [(z0 + fw, zm - 0.04), (zm + 0.04, z1 - fw)]:
        sw = 0.045
        S.box((fx0 + 0.01, y0 + fw, a), (fx1 + 0.012, y0 + fw + sw, b), 'pvc'); S.box((fx0 + 0.01, y1 - fw - sw, a), (fx1 + 0.012, y1 - fw, b), 'pvc')
        S.box((fx0 + 0.01, y0 + fw, a), (fx1 + 0.012, y1 - fw, a + sw), 'pvc'); S.box((fx0 + 0.01, y0 + fw, b - sw), (fx1 + 0.012, y1 - fw, b), 'pvc')
        S.box((-0.135, y0 + fw + sw, a + sw), (-0.125, y1 - fw - sw, b - sw), 'glass', flags=FL_TRANS)
    S.box((fx1 + 0.012, 1.45, zm + 0.07), (fx1 + 0.04, 1.62, zm + 0.1), 'pvc')            # handle
    S.box((-0.1, y0 - 0.03, z0 - 0.06), (0.05, y0, z1 + 0.06), 'marble')                 # sill
    # radiator under the window
    S.box((0.035, 0.14, z0 + 0.08), (0.125, 0.76, z1 - 0.08), 'radiator')
    # curtains: accordion lace + two heavy drapes + rail
    S.box((0.07, 2.57, z0 - 0.45), (0.11, 2.61, z1 + 0.45), 'metal')
    for (za, zb, n) in ([(z0 - 0.3, zm - 0.12, 7), (zm + 0.22, z1 + 0.3, 7)] if curtains == 'night' else [(z0 - 0.5, z0 + 0.12, 6), (z1 - 0.12, z1 + 0.5, 6)]):
        pw = (zb - za) / n
        for k in range(n):
            yaw = 0.34 if k % 2 == 0 else -0.34
            cz = za + pw * (k + 0.5)
            S.obb((0.2, (0.86 + 2.56) / 2, cz), (0.003, (2.56 - 0.86) / 2, pw / 2 / math.cos(0.34)), yaw, 'lace', flags=FL_TRANS)
    S.box((0.1, 0.04, z0 - 0.62), (0.3, 2.58, z0 - 0.22), 'drape')
    S.box((0.1, 0.04, z1 + 0.22), (0.3, 2.58, z1 + 0.62), 'drape')
    # ---- bed ----
    bx0, bx1, bz0, bz1 = BED['x0'], BED['x1'], BED['z0'], BED['z1']
    S.box((bx0, 0, bz1 - 0.1), (bx1, 1.1, bz1), 'walnut')
    S.box((bx0 - 0.03, 1.1, bz1 - 0.13), (bx1 + 0.03, 1.16, bz1 + 0.01), 'walnut')
    S.box((bx0 + 0.25, 1.16, bz1 - 0.1), (bx1 - 0.25, 1.24, bz1), 'walnut')
    S.box((bx0, 0, bz0), (bx1, 0.55, bz0 + 0.07), 'walnut')
    S.box((bx0, 0.15, bz0 + 0.07), (bx0 + 0.06, 0.42, bz1 - 0.1), 'walnut')
    S.box((bx1 - 0.06, 0.15, bz0 + 0.07), (bx1, 0.42, bz1 - 0.1), 'walnut')
    S.box((bx0 + 0.06, 0.36, bz0 + 0.07), (bx1 - 0.06, 0.6, bz1 - 0.1), 'sheet')
    S.box((bx0 + 0.03, 0.56, bz0 + 0.05), (bx1 - 0.03, 0.6, 2.96), 'quilt')
    S.hf(blanket_heights(people if people != 'none' else False), ((bx0 + bx1) / 2, (1.52 + 2.98) / 2), ((bx1 - bx0) / 2, 0.73), 0.56, 'quilt')
    S.box((bx0 - 0.0, 0.28, bz0 + 0.05), (bx0 + 0.03, 0.64, 2.96), 'quilt')
    S.box((bx1 - 0.03, 0.28, bz0 + 0.05), (bx1 + 0.0, 0.64, 2.96), 'quilt')
    S.box((bx0, 0.28, bz0 + 0.04), (bx1, 0.64, bz0 + 0.07), 'quilt')
    S.box((bx0 + 0.04, 0.6, 2.93), (bx1 - 0.04, 0.665, 3.03), 'sheet')                     # folded sheet edge
    S.hf(pillow_heights(1.52, (HEAD_W[0], HEAD_W[2]) if heads and people in (True, 'both') else None), (1.52, 3.24), (0.36, 0.2), 0.58, 'pillow')
    S.hf(pillow_heights(2.28, (HEAD_H[0], HEAD_H[2]) if heads and people in (True, 'both', 'husband') else None), (2.28, 3.24), (0.36, 0.2), 0.58, 'pillow')
    if heads and people in (True, 'both'):
        S.ell(HEAD_W, (0.078, 0.1, 0.11), 'proxy', flags=FL_NOCAM)
    if heads and people in (True, 'both', 'husband'):
        S.ell(HEAD_H, (0.1, 0.09, 0.11), 'proxy', flags=FL_NOCAM)
    if people == 'husband':      # the wife sitting up against the headboard (shadow caster only)
        S.ell((1.5, 1.05, 2.72), (0.2, 0.4, 0.13), 'proxy', flags=FL_NOCAM)
        S.ell((1.5, 1.6, 2.74), (0.09, 0.12, 0.1), 'proxy', flags=FL_NOCAM)
    if double_proxy:
        S.ell((DOUBLE_AT[0], 1.0, DOUBLE_AT[2]), (0.14, 0.55, 0.24), 'proxy', flags=FL_NOCAM)
        S.ell((DOUBLE_AT[0], 1.65, DOUBLE_AT[2]), (0.1, 0.13, 0.09), 'proxy', flags=FL_NOCAM)
    # nightstands + lamps
    for (x0, x1) in [(0.45, 0.93)]:
        S.box((x0, 0.04, 3.12), (x1, 0.55, 3.58), 'walnut')
        S.box((x0 + 0.03, 0.36, 3.115), (x1 - 0.03, 0.365, 3.12), 'blackmetal')
        S.box((x0 + 0.2, 0.44, 3.105), (x1 - 0.2, 0.455, 3.115), 'metal')
        cx = (x0 + x1) / 2
        S.cyl(cx, 3.36, 0.06, 0.55, 0.76, 'ceramic')
        S.cyl(cx, 3.36, 0.14, 0.76, 0.98, 'lampshade')
    # wall clock + framed print
    S.obb((0.7, 1.75, D0 - 0.012), (0.16, 0.16, 0.012), 0.0, 'clock')
    S.box((1.45, 1.42, D0 - 0.025), (2.35, 2.0, D0), 'print')
    # wardrobe on the right wall (front part)
    S.box((3.42, 0.0, 0.1), (W0, 2.28, 1.5), 'walnut')
    for k, (a, b) in enumerate([(0.12, 0.81), (0.81, 1.48)]):
        S.box((3.405, 0.06, a + 0.005), (3.42, 2.22, b - 0.005), 'wardrobe_m' if k == 0 else 'wardrobe')
        S.box((3.38, 1.0, b - 0.06 if k == 0 else a + 0.045), (3.405, 1.22, (b - 0.045) if k == 0 else a + 0.06), 'metal')
    # ---- door to the corridor ----
    dz0, dz1, dh = DOOR['z0'], DOOR['z1'], DOOR['h']
    S.box((W0, 0, dz0), (W0 + 0.15, dh, dz0 + 0.04), 'doorwood'); S.box((W0, 0, dz1 - 0.04), (W0 + 0.15, dh, dz1), 'doorwood')
    S.box((W0, dh - 0.04, dz0), (W0 + 0.15, dh, dz1), 'doorwood')
    S.box((W0 - 0.015, 0, dz0 - 0.07), (W0, dh + 0.07, dz0), 'doorwood'); S.box((W0 - 0.015, 0, dz1), (W0, dh + 0.07, dz1 + 0.07), 'doorwood')
    S.box((W0 - 0.015, dh, dz0 - 0.07), (W0, dh + 0.07, dz1 + 0.07), 'doorwood')
    th = math.radians(door_open)
    hz = DOOR['hinge_z']
    c = (W0 - 0.02 - 0.43 * math.sin(th), 1.0, hz - 0.43 * math.cos(th))
    S.obb(c, (0.02, 1.0, 0.43), th, 'veneer_door')
    fe = (W0 - 0.02 - 0.80 * math.sin(th), hz - 0.80 * math.cos(th))
    for sd in (-1, 1):
        nx, nz = math.cos(th) * sd, -math.sin(th) * sd
        S.obb((fe[0] + nx * 0.05, 1.0, fe[1] + nz * 0.05), (0.012, 0.012, 0.06), th, 'metal')
    S.box((W0 - 0.012, 1.18, dz0 - 0.22), (W0, 1.26, dz0 - 0.15), 'trim')                 # light switch
    return S


def corridor(S, night_light=True, front_leaf=True, kitchen_leaf=True):
    """corridor beyond the bedroom door (x 4.15..5.35), front door at z 4.3, kitchen door at z -3.0"""
    xa, xb = 4.15, 5.35
    wall_x(S, xb, xb + 0.15, -3.2, 4.45, 0.0, 2.7, [(1.0, 1.9, 0.0, 2.05)], 'plaster_c')     # living-room door hole
    wall_x(S, 4.0, xa, -3.2, 0.0, 0.0, 2.7, [], 'plaster_c')
    wall_x(S, 4.0, xa, 3.6, 4.45, 0.0, 2.7, [], 'plaster_c')
    wall_z(S, -3.2, -3.0, 4.0, xb + 0.15, 0.0, 2.7, [(4.32, 5.18, 0.0, 2.05)], 'plaster_c')  # kitchen door hole
    wall_z(S, 4.3, 4.55, 4.0, xb + 0.15, -0.45, 2.7, [(4.3, 5.2, 0.0, 2.1)], 'stucco')      # front door hole
    S.box((xa, 2.7, -3.2), (xb, 2.95, 4.45), 'ceiling')
    # skirting + corridor runner
    S.box((xb - 0.015, 0, -3.0), (xb, 0.08, 1.0), 'trim'); S.box((xb - 0.015, 0, 1.9), (xb, 0.08, 4.3), 'trim')
    # front door: steel-and-glass (closed) with a frosted pane
    if front_leaf:
        S.box((4.3, 0.0, 4.36), (5.2, 2.1, 4.42), 'blackmetal')
    # coat hooks + framed embroidery on the corridor wall opposite the bedroom door
    S.box((xb - 0.03, 1.35, 2.62), (xb, 1.85, 3.2), 'print')
    # kitchen door (closed in this bake)
    if kitchen_leaf:
        S.box((4.32, 0.0, -3.13), (5.18, 2.05, -3.07), 'veneer_door')
    return S


def exterior(S, lamp=True):
    """yard, garden wall, tree, street lamp and the houses across the side street (seen through the window)"""
    S.box((-30, -0.6, -30), (-0.25, -0.45, 30), 'ground')
    S.box((-4.75, -0.45, -8), (-4.5, 1.2, 8), 'stucco')
    S.box((-40, -0.62, -30), (-4.75, -0.6, 30), 'asphalt')
    # mulberry tree in the yard
    S.cyl(-2.6, -2.6, 0.14, -0.45, 2.6, 'bark')
    for (cx, cy, cz, r) in [(-2.6, 3.3, -2.6, 1.4), (-2.0, 2.9, -1.8, 0.9), (-3.1, 2.8, -3.4, 1.0), (-2.4, 4.2, -2.3, 1.0)]:
        S.ell((cx, cy, cz), (r, r * 0.8, r), 'leaves')
    if lamp:
        lx, ly, lz = LAMP
        S.box((-11.0, ly + 0.07, lz - 0.04), (lx + 0.05, ly + 0.13, lz + 0.04), 'blackmetal')
        S.ell((lx, ly, lz), (0.16, 0.07, 0.11), 'bulb', flags=FL_NOSHADOW)
    # houses across the street
    for k, z in enumerate([-9.0, -1.5, 6.0]):
        S.box((-17.0, -0.6, z - 3.2), (-11.0, 3.2, z + 3.2), 'stucco')
        S.box((-11.02, 1.0, z - 0.6), (-11.0, 2.1, z + 0.5), 'litwin' if k == 1 else 'blackmetal')
    return S


def night_lights(S, moon=1.0, lamp=1.0, corridor_l=1.0, vol=True, q=1.0):
    """groups: 0 moon, 1 street lamp, 2 corridor, 3 ambient+bounce, 4 emission, 5 moon shafts, 6 lamp shafts"""
    vb = ((0.0, 0.0, 0.0), (4.0, 2.7, 3.6))
    S.dir_light((-0.74, 0.56, -0.37), (160, 186, 230), 5.0 * moon, 0, soft=0.035, ns=int(10 * q), vol=0.022 if vol else 0, vbox=vb, vstep=0.06, vgroup=5)
    S.point_light((LAMP[0], LAMP[1] - 0.08, LAMP[2]), (255, 186, 128), 55.0 * lamp, 1, radius=0.14, ns=int(8 * q), rng=60.0, vol=0.02 if vol else 0, vbox=vb, vstep=0.08, vgroup=6)
    S.rect_light((4.4, 1.1, 4.29), (0.7, 0.0, 0.0), (0.0, 0.75, 0.0), (170, 150, 130), 1.3 * corridor_l, 2, ns=int(6 * q))
    # bounce from the moonlit bed / floor patch (soft fill, no volume)
    S.point_light((1.4, 1.0, 2.2), (120, 140, 175), 0.32 * moon, 3, radius=0.6, ns=4, rng=6.0)
    S.ambient((13, 16, 22), (6, 7, 9), 3, ao_samples=int(6 * q), ao_dist=0.5, emit_group=4)


def new_scene():
    S = Scene()
    A, rects = build_atlas()
    S.set_atlas(A, rects)
    materials(S)
    return S
