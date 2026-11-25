"""An old Aegean village (Tire / Ödemiş / Bayındır type): cobbled street between two-storey Ottoman houses with
overhanging upper floors (cumba), rubble-stone ground floors, lime-washed or ochre upper floors, wooden shutters,
heavy double doors, hipped tile roofs, an old street lantern, a plane tree and a distant minaret.
Plus the interior of a village room (lime walls, beamed ceiling, sedir, oil lamp, window with bars, plank door)."""
import math
import numpy as np
from rt import *
from tex import build_atlas

STREET_W = 2.1
LANTERN = (1.42, 2.95, -7.0)
ROOM = dict(x0=50.0, x1=54.5, z0=0.0, z1=4.2, h=2.9)
OIL_LAMP = (51.75, 0.82, 2.55)                  # on a low stand beside her
ROOM_WIN = dict(x0=52.6, x1=53.5, y0=1.0, y1=2.0)   # window in the back wall (z = z1)
ROOM_DOOR = dict(z0=1.3, z1=2.25, h=1.95)        # door in the right wall (x = x1)


def materials(S):
    S.mat('cobble', MT_VORONOI, (118, 110, 98), color2=(52, 48, 42), pa=6.5, pb=1.0, pc=0.07, noise=0.15, nscale=3, shin=30, spec=0.2)
    S.mat('rubble', MT_VORONOI, (132, 120, 100), color2=(176, 168, 150), pa=3.2, pb=1.6, pc=0.06, noise=0.2, nscale=2)
    S.mat('lime', MT_STUCCO, (226, 222, 210), color2=(188, 180, 162), noise=0.22, nscale=1.4)
    S.mat('ochre', MT_STUCCO, (204, 170, 116), color2=(170, 140, 98), noise=0.22, nscale=1.4)
    S.mat('paleblue', MT_STUCCO, (170, 186, 196), color2=(140, 150, 158), noise=0.22, nscale=1.4)
    S.mat('pink', MT_STUCCO, (206, 168, 150), color2=(170, 140, 126), noise=0.22, nscale=1.4)
    S.mat('timber', MT_WOOD, (92, 64, 44), noise=0.1, nscale=4)
    S.mat('oldwood', MT_WOOD, (84, 62, 46), noise=0.25, nscale=3, shin=10, spec=0.1)
    S.mat('shutter', MT_WOOD, (70, 84, 66), noise=0.2, nscale=3)
    S.mat('shutter2', MT_WOOD, (96, 60, 42), noise=0.2, nscale=3)
    S.mat('darkwin', MT_FLAT, (14, 14, 16), shin=60, spec=0.4)
    S.mat('litwin', MT_FLAT, (70, 48, 22), emit=(1.1, 0.62, 0.22))
    S.mat('roof', MT_TILES, (146, 72, 48), color2=(84, 80, 56), pa=0.33, pb=0.21)
    S.mat('iron', MT_FLAT, (34, 32, 30), shin=30, spec=0.3)
    S.mat('bulb', MT_FLAT, (255, 210, 150), emit=(8.0, 5.0, 2.2))
    S.mat('bark', MT_PLASTER, (70, 62, 52), noise=0.4, nscale=6)
    S.mat('leaves', MT_ATLAS, (255, 255, 255), tex='foliage', su=1.1, sv=1.1, uvm=1, cut=1)
    S.mat('ground', MT_ASPHALT, (82, 74, 60), noise=0.2, nscale=2)
    S.mat('minaret', MT_PLASTER, (200, 196, 186), noise=0.1, nscale=2)
    # interior
    S.mat('wall_in', MT_STUCCO, (214, 206, 188), color2=(176, 164, 140), noise=0.25, nscale=1.6)
    S.mat('beam', MT_WOOD, (70, 48, 32), noise=0.15, nscale=3)
    S.mat('planks', MT_PLANKS, (96, 70, 48), color2=(116, 84, 56), pa=0.22, pb=2.2)
    S.mat('kilim', MT_ATLAS, (255, 255, 255), tex='kilim', noise=0.12, nscale=9)
    S.mat('cushion', MT_ATLAS, (255, 255, 255), tex='bedspread', su=3.0, sv=3.0, uvm=1)
    S.mat('copper', MT_FLAT, (170, 96, 58), shin=60, spec=0.9)
    S.mat('lampglass', MT_FLAT, (255, 220, 160), emit=(6.0, 3.8, 1.6))
    S.mat('nightsky', MT_FLAT, (20, 26, 40), emit=(0.05, 0.07, 0.12))


def new_scene():
    S = Scene()
    A, rects = build_atlas()
    S.set_atlas(A, rects)
    materials(S)
    return S


def hip_roof(S, x0, x1, z0, z1, ye, slope=0.5, mat='roof', over=0.5):
    x0 -= over; x1 += over; z0 -= over; z1 += over
    top = ye + min(x1 - x0, z1 - z0) / 2 * slope + 0.01
    pl = [((0, ye, z1), (0, 1 / slope, 1)), ((0, ye, z0), (0, 1 / slope, -1)), ((x0, ye, 0), (-1, 1 / slope, 0)), ((x1, ye, 0), (1, 1 / slope, 0)), ((0, ye, 0), (0, -1, 0))]
    S.poly_pts(pl, mat, (x0, ye, z0, x1, top, z1))


def ottoman_house(S, side, z0, z1, upper='lime', lit=(), door=True, rng=None, depth=7.0):
    """side -1: left of the street (facade faces +x), +1: right (facade faces -x)"""
    fx = side * STREET_W                      # ground-floor facade plane
    ox = side * (STREET_W - 0.55)             # overhanging upper floor
    back = side * (STREET_W + depth)
    lo, hi = (min(fx, back), max(fx, back))
    S.box((lo, -0.05, z0), (hi, 2.85, z1), 'rubble')
    ulo, uhi = (min(ox, back), max(ox, back))
    S.box((ulo, 2.85, z0 + 0.05), (uhi, 5.4, z1 - 0.05), upper)
    S.box((ulo - 0.04 * (side < 0), 2.78, z0), (uhi + 0.04 * (side > 0), 2.98, z1), 'timber')     # floor beam
    for zz in np.linspace(z0 + 0.5, z1 - 0.5, 3):                                                  # brackets
        bx = side * (STREET_W - 0.3)
        S.box((min(bx, fx) - 0.06, 2.2, zz - 0.07), (max(bx, fx) + 0.06, 2.8, zz + 0.07), 'timber')
    hip_roof(S, min(ox, back), max(ox, back), z0 + 0.05, z1 - 0.05, 5.4, slope=0.45, over=0.55)
    face = ox - side * 0.01
    # upper windows with shutters
    nw = 2 if (z1 - z0) < 6.5 else 3
    for k in range(nw):
        zc = z0 + (k + 0.5) * (z1 - z0) / nw
        lit_ = k in lit
        S.box((face - 0.02, 3.45, zc - 0.42), (face + 0.02, 4.75, zc + 0.42), 'litwin' if lit_ else 'darkwin', flags=FL_NOSHADOW)
        S.box((face - 0.05, 3.38, zc - 0.5), (face + 0.05, 3.45, zc + 0.5), 'timber')
        S.box((face - 0.05, 4.75, zc - 0.5), (face + 0.05, 4.82, zc + 0.5), 'timber')
        for sd in (-1, 1):   # open shutters against the wall
            S.box((face - 0.03, 3.45, zc + sd * 0.45 - 0.2 + sd * 0.25), (face + 0.03, 4.75, zc + sd * 0.45 + 0.2 + sd * 0.25), 'shutter' if (rng is None or rng.random() < 0.6) else 'shutter2')
    # heavy double door + small barred window on the ground floor
    if door:
        dz = (z0 + z1) / 2 + 0.6
        fface = fx - side * 0.01
        S.box((fface - 0.08, 0.0, dz - 0.7), (fface + 0.08, 2.35, dz + 0.7), 'rubble')
        S.box((fface - side * 0.06 - 0.03, 0.0, dz - 0.55), (fface - side * 0.06 + 0.03, 2.15, dz + 0.55), 'oldwood')
        S.box((fface - side * 0.1 - 0.01, 1.05, dz - 0.03), (fface - side * 0.1 + 0.01, 1.2, dz + 0.03), 'iron')
        wz = z0 + 0.9
        S.box((fface - 0.02, 1.2, wz - 0.3), (fface + 0.02, 1.85, wz + 0.3), 'darkwin', flags=FL_NOSHADOW)
        for q in range(4):
            S.box((fface - side * 0.04 - 0.012, 1.2, wz - 0.24 + q * 0.16), (fface - side * 0.04 + 0.012, 1.85, wz - 0.22 + q * 0.16), 'iron')


def street(S, rng, lit_windows=0.15, lit_seed=5):
    lr = np.random.default_rng(lit_seed)
    S.box((-STREET_W, -0.1, -60), (STREET_W, 0.0, 12), 'cobble')
    S.box((-200, -0.2, -200), (200, -0.1, 200), 'ground')
    uppers = ['lime', 'ochre', 'paleblue', 'pink', 'lime']
    for side in (-1, 1):
        z = 10.0
        k = 0
        while z > -48:
            ln = rng.uniform(5.2, 7.8)
            lit = tuple(i for i in range(3) if lr.random() < lit_windows)
            ottoman_house(S, side, z - ln, z - 0.15, upper=uppers[(k * 2 + (side > 0)) % len(uppers)], lit=lit, rng=rng)
            z -= ln; k += 1
    # end of the street: plane tree, and a minaret beyond the roofs
    S.cyl(0.4, -52.0, 0.55, -0.1, 4.5, 'bark')
    for (cx, cy, cz, r) in [(0.4, 8.0, -52.0, 4.5), (-2.5, 7.0, -50.5, 3.0), (3.0, 7.5, -53.5, 3.2), (0.0, 10.5, -51.0, 3.0)]:
        S.ell((cx, cy, cz), (r, r * 0.8, r), 'leaves')
    S.cyl(6.0, -78.0, 1.3, -0.1, 26.0, 'minaret')
    S.cyl(6.0, -78.0, 1.9, 19.0, 19.6, 'minaret')
    pl = []
    for k in range(8):
        a = k / 8 * math.tau
        pl.append(((6.0 + math.cos(a) * 1.25, 26.0, -78.0 + math.sin(a) * 1.25), (math.cos(a), 0.25, math.sin(a))))
    pl.append(((6.0, 26.0, -78.0), (0, -1, 0)))
    S.poly_pts(pl, 'roof', (4.6, 26.0, -79.4, 7.4, 32.0, -76.6))
    # the old lantern on a bracket
    lx, ly, lz = LANTERN
    S.box((lx, ly + 0.05, lz - 0.03), (STREET_W, ly + 0.09, lz + 0.03), 'iron')
    S.box((lx - 0.14, ly - 0.02, lz - 0.14), (lx + 0.14, ly + 0.05, lz + 0.14), 'iron')
    S.ell((lx, ly - 0.08, lz), (0.08, 0.1, 0.08), 'bulb', flags=FL_NOSHADOW)


def village_wide(S, rng):
    """a cluster of houses seen from the hillside: several short streets"""
    S.box((-300, -0.2, -300), (300, -0.1, 300), 'ground')
    uppers = ['lime', 'ochre', 'paleblue', 'pink', 'lime', 'lime']
    for gx in range(-4, 5):
        for gz in range(-6, 3):
            if rng.random() < 0.18:
                continue
            x0 = gx * 15 + rng.uniform(-2, 2); z0 = gz * 13 + rng.uniform(-2, 2)
            w, d = rng.uniform(6, 9), rng.uniform(5, 8)
            h2 = rng.random() < 0.7
            S.box((x0, -0.1, z0), (x0 + w, 2.85, z0 + d), 'rubble')
            if h2:
                S.box((x0 - 0.4, 2.85, z0 - 0.3), (x0 + w + 0.4, 5.4, z0 + d + 0.3), uppers[int(rng.integers(0, 6))])
                for k in range(3):
                    S.box((x0 + 1 + k * (w - 2) / 2 - 0.4, 3.5, z0 + d + 0.28), (x0 + 1 + k * (w - 2) / 2 + 0.4, 4.7, z0 + d + 0.32), 'litwin' if rng.random() < 0.25 else 'darkwin', flags=FL_NOSHADOW)
                hip_roof(S, x0 - 0.4, x0 + w + 0.4, z0 - 0.3, z0 + d + 0.3, 5.4, slope=0.45, over=0.5)
            else:
                hip_roof(S, x0, x0 + w, z0, z0 + d, 2.85, slope=0.45, over=0.5)
            if rng.random() < 0.5:
                tx, tz = x0 + w + 2.5, z0 + rng.uniform(0, d)
                if rng.random() < 0.5:
                    S.cyl(tx, tz, 0.18, -0.1, 3.0, 'bark'); S.ell((tx, 9.0, tz), (1.2, 6.5, 1.2), 'leaves')    # poplar
                else:
                    r = rng.uniform(2.5, 3.8); S.cyl(tx, tz, 0.3, -0.1, 3.0, 'bark'); S.ell((tx, 3.4 + r * 0.6, tz), (r, r * 0.8, r), 'leaves')
    # mosque with minaret in the middle of the village
    S.box((4, -0.1, -32), (20, 7.0, -18), 'lime')
    S.ell((12, 7.0, -25), (6.0, 5.2, 6.0), 'minaret')
    S.cyl(22.5, -19.5, 1.1, -0.1, 25.0, 'minaret'); S.cyl(22.5, -19.5, 1.7, 18.5, 19.1, 'minaret')
    pl = []
    for k in range(8):
        a = k / 8 * math.tau
        pl.append(((22.5 + math.cos(a) * 1.05, 25.0, -19.5 + math.sin(a) * 1.05), (math.cos(a), 0.25, math.sin(a))))
    pl.append(((22.5, 25.0, -19.5), (0, -1, 0)))
    S.poly_pts(pl, 'roof', (21.3, 25.0, -20.7, 23.7, 31.0, -18.3))


def room(S):
    """village room: lime walls, beamed ceiling, sedir with kilim, shelf with oil lamp, barred window, plank door"""
    x0, x1, z0, z1, h = ROOM['x0'], ROOM['x1'], ROOM['z0'], ROOM['z1'], ROOM['h']
    S.box((x0 - 0.3, -0.2, z0 - 0.3), (x1 + 0.3, 0.0, z1 + 0.3), 'planks')
    S.box((x0 - 0.3, h, z0 - 0.3), (x1 + 0.3, h + 0.2, z1 + 0.3), 'beam')
    for k in range(7):
        bx = x0 + 0.3 + k * (x1 - x0 - 0.6) / 6
        S.box((bx - 0.07, h - 0.16, z0), (bx + 0.07, h, z1), 'beam')
    S.box((x0 - 0.3, 0, z0 - 0.3), (x0, h, z1 + 0.3), 'wall_in')
    S.box((x0 - 0.3, 0, z0 - 0.3), (x1 + 0.3, h, z0), 'wall_in')
    # back wall with the window
    wx0, wx1, wy0, wy1 = ROOM_WIN['x0'], ROOM_WIN['x1'], ROOM_WIN['y0'], ROOM_WIN['y1']
    S.box((x0 - 0.3, 0, z1), (wx0, h, z1 + 0.35), 'wall_in'); S.box((wx1, 0, z1), (x1 + 0.3, h, z1 + 0.35), 'wall_in')
    S.box((wx0, 0, z1), (wx1, wy0, z1 + 0.35), 'wall_in'); S.box((wx0, wy1, z1), (wx1, h, z1 + 0.35), 'wall_in')
    S.box((wx0 - 0.06, wy0 - 0.06, z1 - 0.02), (wx1 + 0.06, wy0, z1 + 0.05), 'oldwood'); S.box((wx0 - 0.06, wy1, z1 - 0.02), (wx1 + 0.06, wy1 + 0.06, z1 + 0.05), 'oldwood')
    S.box((wx0 - 0.06, wy0, z1 - 0.02), (wx0, wy1, z1 + 0.05), 'oldwood'); S.box((wx1, wy0, z1 - 0.02), (wx1 + 0.06, wy1, z1 + 0.05), 'oldwood')
    for q in range(5):
        bx = wx0 + 0.12 + q * (wx1 - wx0 - 0.24) / 4
        S.box((bx - 0.012, wy0, z1 + 0.18), (bx + 0.012, wy1, z1 + 0.2), 'iron')
    S.box((wx0 - 0.1, wy0 - 0.2, z1 + 0.6), (wx1 + 0.6, wy1 + 0.5, z1 + 0.65), 'nightsky', flags=FL_NOSHADOW)
    S.box((wx1 + 0.02, wy0, z1 - 0.3), (wx1 + 0.05, wy1, z1 + 0.0), 'shutter2')                  # one shutter half open inside
    # right wall with the plank door
    dz0, dz1, dh = ROOM_DOOR['z0'], ROOM_DOOR['z1'], ROOM_DOOR['h']
    S.box((x1, 0, z0 - 0.3), (x1 + 0.3, h, dz0), 'wall_in'); S.box((x1, 0, dz1), (x1 + 0.3, h, z1 + 0.3), 'wall_in')
    S.box((x1, dh, dz0), (x1 + 0.3, h, dz1), 'wall_in')
    S.box((x1 - 0.02, 0, dz0 - 0.1), (x1 + 0.02, dh + 0.1, dz0), 'oldwood'); S.box((x1 - 0.02, 0, dz1), (x1 + 0.02, dh + 0.1, dz1 + 0.1), 'oldwood')
    S.box((x1 - 0.02, dh, dz0 - 0.1), (x1 + 0.02, dh + 0.1, dz1 + 0.1), 'oldwood')
    S.box((x1 + 0.02, 0, dz0), (x1 + 0.08, dh, dz1), 'oldwood')
    # sedir along the left wall with kilim and cushions
    S.box((x0, 0, z0 + 0.4), (x0 + 0.75, 0.42, z1 - 0.3), 'oldwood')
    S.box((x0 + 0.02, 0.42, z0 + 0.42), (x0 + 0.75, 0.48, z1 - 0.32), 'kilim')
    for k in range(3):
        cz = z0 + 0.9 + k * 1.0
        S.ell((x0 + 0.2, 0.68, cz), (0.12, 0.22, 0.4), 'cushion')
    S.box((x0, 0.0, z0 + 0.3), (x1, 0.012, z1 - 0.2), 'kilim')
    # shelf with the oil lamp and copper pots; wooden chest
    lx, ly, lz = OIL_LAMP
    S.box((lx - 0.2, 0, lz - 0.2), (lx + 0.2, ly - 0.08, lz + 0.2), 'oldwood')                     # low stand
    S.cyl(lx, lz, 0.06, ly - 0.08, ly - 0.02, 'copper')
    S.ell((lx, ly + 0.06, lz), (0.045, 0.09, 0.045), 'lampglass', flags=FL_NOSHADOW)
    sy = 1.5
    S.box((x0 + 0.8, sy - 0.04, z1 - 0.28), (x0 + 1.8, sy, z1), 'oldwood')                          # shelf with copper pots
    for k, px in enumerate([x0 + 1.0, x0 + 1.3, x0 + 1.6]):
        S.cyl(px, z1 - 0.14, 0.09 - k * 0.015, sy, sy + 0.18 - k * 0.03, 'copper')
    S.box((x1 - 0.9, 0, z1 - 0.55), (x1 - 0.1, 0.55, z1 - 0.05), 'oldwood')


def lights_street_night(S, q=1.0, lantern=1.0):
    """0 moon, 1 lantern, 3 ambient, 4 emission"""
    S.dir_light((-0.35, 0.75, 0.55), (150, 175, 220), 1.1, 0, soft=0.02, ns=int(4 * q))
    lx, ly, lz = LANTERN
    S.point_light((lx, ly - 0.12, lz), (255, 176, 96), 14.0 * lantern, 1, radius=0.08, ns=int(5 * q), rng=26.0)
    S.ambient((9, 12, 20), (3, 4, 6), 3, ao_samples=int(5 * q), ao_dist=1.2, emit_group=4)


def lights_street_dusk(S, q=1.0):
    S.dir_light((-0.85, 0.2, -0.45), (255, 150, 90), 1.6, 0, soft=0.03, ns=int(4 * q))
    lx, ly, lz = LANTERN
    S.point_light((lx, ly - 0.12, lz), (255, 176, 96), 8.0, 1, radius=0.08, ns=int(4 * q), rng=26.0)
    S.ambient((70, 70, 96), (34, 26, 24), 3, ao_samples=int(5 * q), ao_dist=2.5, emit_group=4)


def lights_wide_sunset(S, q=1.0):
    S.dir_light((-0.9, 0.16, -0.4), (255, 140, 80), 2.0, 0, soft=0.02, ns=int(3 * q))
    S.ambient((80, 72, 100), (36, 26, 22), 3, ao_samples=int(4 * q), ao_dist=4.0, emit_group=4)


def lights_room(S, q=1.0):
    """0 oil lamp, 1 moonlight through the window, 3 ambient, 4 emission"""
    lx, ly, lz = OIL_LAMP
    S.point_light((lx, ly + 0.06, lz), (255, 168, 90), 2.0, 0, radius=0.05, ns=int(8 * q), rng=9.0)
    S.dir_light((0.2, 0.55, 0.81), (140, 165, 210), 0.9, 1, soft=0.02, ns=int(4 * q))
    S.ambient((10, 9, 9), (4, 3, 3), 3, ao_samples=int(5 * q), ao_dist=0.6, emit_group=4)
