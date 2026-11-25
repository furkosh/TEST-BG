"""Ereğli at night from the air: our house (same model as the close sets) in a grid of single-storey houses,
two-storey houses and apartment blocks with rooftop solar heaters and dishes, a mosque with a minaret, poplars,
parked cars and sodium street lamps."""
import math
import numpy as np
from rt import *
import house as Hs
import sets as St

LAMPS = []        # (x, y, z) of every street lamp bulb (exported for live glows)


def hip_roof(S, x0, x1, z0, z1, ye, slope=0.5, mat='roof', over=0.35):
    x0 -= over; x1 += over; z0 -= over; z1 += over
    top = ye + min(x1 - x0, z1 - z0) / 2 * slope + 0.01
    pl = [((0, ye, z1), (0, 1 / slope, 1)), ((0, ye, z0), (0, 1 / slope, -1)), ((x0, ye, 0), (-1, 1 / slope, 0)), ((x1, ye, 0), (1, 1 / slope, 0)), ((0, ye, 0), (0, -1, 0))]
    S.poly_pts(pl, mat, (x0, ye, z0, x1, top, z1))


def house_block(S, r, x0, z0, w, d, floors, kind):
    """kind: 'house' (hipped roof) or 'apt' (flat roof + roof clutter); front faces +z or -z (windows on both)"""
    h = 2.95 * floors
    wall = r.choice(['stucco', 'stucco_w', 'stucco_p', 'stucco_o'])
    S.box((x0, -0.62, z0), (x0 + w, h, z0 + d), wall)
    # windows on both long facades: dark glass, a few warm ones
    for fl in range(floors):
        yb = fl * 2.95 + 0.95
        nwin = max(1, int(w / 3.2))
        for k in range(nwin):
            wx = x0 + (k + 0.5) * w / nwin - 0.6
            for zf, sgn in ((z0 + d, 1), (z0, -1)):
                lit = r.random() < (0.07 if kind == 'house' else 0.1)
                S.box((wx, yb, zf - 0.02 if sgn > 0 else zf - 0.02), (wx + 1.2, yb + 1.15, zf + 0.02), 'litwin_t' if lit else 'darkwin')
    if kind == 'house':
        hip_roof(S, x0, x0 + w, z0, z0 + d, h, slope=r.uniform(0.42, 0.55), mat=r.choice(['roof', 'roof2', 'roof3']))
        if r.random() < 0.5:
            S.box((x0 + w * 0.7, h + 0.4, z0 + d * 0.3), (x0 + w * 0.7 + 0.5, h + 1.9, z0 + d * 0.3 + 0.5), 'plinth')
    else:
        S.box((x0 - 0.05, h, z0 - 0.05), (x0 + w + 0.05, h + 0.6, z0 + 0.15), wall)
        S.box((x0 - 0.05, h, z0 + d - 0.15), (x0 + w + 0.05, h + 0.6, z0 + d + 0.05), wall)
        S.box((x0 - 0.05, h, z0), (x0 + 0.15, h + 0.6, z0 + d), wall)
        S.box((x0 + w - 0.15, h, z0), (x0 + w + 0.05, h + 0.6, z0 + d), wall)
        # rooftop solar water heaters (tilted panel pair + tank), dishes, water tanks
        for k in range(r.integers(2, 5)):
            px, pz = x0 + r.uniform(1.5, w - 2.5), z0 + r.uniform(1.5, d - 2.0)
            c = np.array([px, h + 0.9, pz]); n = np.array([0.0, 0.8, 0.6]); n /= np.linalg.norm(n); t = np.array([0.0, -0.6, 0.8])
            planes = [(c + n * 0.03, n), (c - n * 0.03, -n), (c + np.array([0.9, 0, 0]), (1, 0, 0)), (c - np.array([0.9, 0, 0]), (-1, 0, 0)), (c + t * 0.95, t), (c - t * 0.95, -t)]
            S.poly_pts(planes, 'solar', (px - 1, h, pz - 1.2, px + 1, h + 2, pz + 1.2))
            S.ell((px, h + 1.75, pz - 0.75), (0.95, 0.22, 0.22), 'tank')
        for k in range(r.integers(1, 4)):
            S.ell((x0 + r.uniform(1, w - 1), h + 1.0, z0 + r.uniform(1, d - 1)), (0.05, 0.4, 0.4), 'dish', yaw=r.uniform(0, 3))


def mosque(S, cx, cz):
    S.box((cx - 9, -0.62, cz - 9), (cx + 9, 8.0, cz + 9), 'stucco_w')
    S.ell((cx, 8.0, cz), (7.2, 6.2, 7.2), 'dome')
    for (dx, dz) in [(-6.5, -6.5), (6.5, -6.5), (-6.5, 6.5), (6.5, 6.5)]:
        S.ell((cx + dx, 8.0, cz + dz), (1.6, 1.4, 1.6), 'dome')
    mx, mz = cx + 10.5, cz + 7.5
    S.box((mx - 1.4, -0.62, mz - 1.4), (mx + 1.4, 3.0, mz + 1.4), 'stucco_w')
    S.cyl(mx, mz, 1.05, 3.0, 27.0, 'stucco_w')
    S.cyl(mx, mz, 1.6, 21.0, 21.6, 'stucco_w')                    # balcony (şerefe)
    S.cyl(mx, mz, 1.45, 21.6, 21.75, 'minaret_lights', flags=FL_NOSHADOW)
    S.cyl(mx, mz, 0.85, 27.0, 29.0, 'stucco_w')
    n = 8
    pl = [((mx, 33.5, mz), (0, -1, 0))]
    pl = []
    for k in range(n):
        a = k / n * math.tau
        nx, nz = math.cos(a), math.sin(a)
        pl.append(((mx + nx * 0.95, 29.0, mz + nz * 0.95), (nx, 0.22, nz)))
    pl.append(((mx, 29.0, mz), (0, -1, 0)))
    S.poly_pts(pl, 'dome', (mx - 1.0, 29.0, mz - 1.0, mx + 1.0, 34.0, mz + 1.0))
    return (mx, 21.7, mz)


def town_materials(S):
    S.mat('stucco_w', MT_STUCCO, (214, 206, 190), color2=(184, 176, 160), noise=0.25, nscale=0.8)
    S.mat('stucco_p', MT_STUCCO, (206, 176, 160), color2=(180, 156, 140), noise=0.25, nscale=0.8)
    S.mat('stucco_o', MT_STUCCO, (204, 178, 128), color2=(176, 154, 112), noise=0.25, nscale=0.8)
    S.mat('roof2', MT_TILES, (140, 64, 44), color2=(90, 84, 60), pa=0.33, pb=0.21)
    S.mat('roof3', MT_TILES, (118, 58, 46), color2=(80, 76, 56), pa=0.33, pb=0.21)
    S.mat('darkwin', MT_FLAT, (18, 20, 24), shin=100, spec=0.6)
    S.mat('litwin_t', MT_FLAT, (60, 44, 24), emit=(0.7, 0.42, 0.16))
    S.mat('dome', MT_FLAT, (120, 126, 132), shin=60, spec=0.6, noise=0.1, nscale=1)
    S.mat('minaret_lights', MT_FLAT, (255, 230, 190), emit=(3.0, 2.4, 1.6))
    S.mat('car_body', MT_FLAT, (150, 150, 150), shin=80, spec=0.8)
    S.mat('field', MT_ASPHALT, (46, 44, 36), noise=0.25, nscale=0.2)


def build_town(q=1.0, seed=7):
    S = Hs.new_scene()
    St.extra_materials(S)
    town_materials(S)
    r = np.random.default_rng(seed)
    St.ext_house(S); St.yard(S)
    S.box((-600, -0.7, -600), (600, -0.64, 600), 'field')
    # street grid: avenues along z every 46 m, streets along x every 34 m (our side street x ~ -7, front street z ~ 9.5)
    xs = [-7.0 + 46 * k for k in range(-5, 6)]
    zs = [9.5 + 34 * k for k in range(-7, 5)]
    for x in xs:
        S.box((x - 4.0, -0.64, -260), (x + 4.0, -0.62, 180), 'asphalt')
    for z in zs:
        S.box((-260, -0.64, z - 4.0), (260, -0.62, z + 4.0), 'asphalt')
    LAMPS.clear()
    lamp_i = 0
    for xi, x in enumerate(xs):
        for zi, z in enumerate(zs):
            # lamps along each avenue segment
            for k in range(2):
                lz = z - 8 - k * 15
                lx = x + 4.3
                S.cyl(lx, lz, 0.1, -0.62, 6.0, 'concrete')
                S.ell((lx - 0.6, 5.9, lz), (0.18, 0.07, 0.12), 'bulb', flags=FL_NOSHADOW)
                LAMPS.append((lx - 0.6, 5.85, lz))
    # blocks between streets
    mx_pos = None
    for xi in range(len(xs) - 1):
        for zi in range(len(zs) - 1):
            bx0, bx1 = xs[xi] + 4.5, xs[xi + 1] - 4.5
            bz0, bz1 = zs[zi] + 4.5, zs[zi + 1] - 4.5
            cx, cz = (bx0 + bx1) / 2, (bz0 + bz1) / 2
            if bx0 < 12 and bx1 > -5 and bz0 < 9 and bz1 > -9:
                # our block: our house is placed by ext_house/yard; fill the rest of the block
                for (hx, hz, w, d) in [(16.0, -6.0, 10, 9), (28.0, -6.0, 9, 10), (16.0, -21.0, 11, 9), (28.0, -21.0, 10, 9), (-1.0, -21.0, 10, 8)]:
                    if hx + w < bx1 and hz > bz0:
                        house_block(S, r, hx, hz, w, d, 1, 'house')
                continue
            dist = math.hypot(cx - 5, cz + 1)
            if mx_pos is None and 70 < dist < 110 and cx > 20:
                mx_pos = mosque(S, cx, cz)
                continue
            p_apt = 0.15 if dist < 60 else (0.35 if dist < 160 else 0.25)
            # split the block into lots
            nlx = int((bx1 - bx0) // 12)
            nlz = 2
            for i in range(nlx):
                for j in range(nlz):
                    lx0 = bx0 + i * (bx1 - bx0) / nlx + 1.0
                    lz0 = bz0 + j * (bz1 - bz0) / nlz + 1.5
                    lw = (bx1 - bx0) / nlx - 2.5
                    ld = (bz1 - bz0) / nlz - 6.0
                    if r.random() < 0.12:
                        continue
                    if r.random() < p_apt:
                        house_block(S, r, lx0, lz0, min(lw, 13), min(ld, 11), int(r.integers(3, 6)), 'apt')
                    else:
                        house_block(S, r, lx0 + r.uniform(0, 1.5), lz0 + r.uniform(0, 1.5), lw * r.uniform(0.55, 0.85), ld * r.uniform(0.6, 0.85), 1 if r.random() < 0.7 else 2, 'house')
                    # yard tree
                    if r.random() < 0.6:
                        tx, tz = lx0 + r.uniform(0, lw), lz0 + ld + r.uniform(0.5, 3.5)
                        rr = r.uniform(1.6, 2.8)
                        S.cyl(tx, tz, 0.15, -0.62, 1.8, 'bark')
                        S.ell((tx, 2.2 + rr * 0.7, tz), (rr, rr * 0.8, rr), 'leaves')
            # poplar row along the block's avenue side
            if r.random() < 0.5:
                for k in range(4):
                    px, pz = bx0 + 0.6, bz0 + 3 + k * (bz1 - bz0 - 6) / 3
                    S.cyl(px, pz, 0.14, -0.62, 3.0, 'bark')
                    S.ell((px, 7.5, pz), (1.0, 5.5, 1.0), 'leaves')
            # parked cars
            for k in range(r.integers(0, 3)):
                cx2 = xs[xi] + 5.5 if r.random() < 0.5 else xs[xi + 1] - 5.5
                cz2 = r.uniform(bz0 + 2, bz1 - 6)
                S.box((cx2 - 0.85, -0.62, cz2), (cx2 + 0.85, 0.55, cz2 + 4.2), 'car_body')
                S.box((cx2 - 0.78, 0.55, cz2 + 1.2), (cx2 + 0.78, 1.0, cz2 + 3.2), 'darkwin')
    # lights: moon, lamps (each bulb a short-range point light), hero lamp near our house separately
    S.dir_light((-0.74, 0.56, -0.37), (150, 175, 220), 0.55, 0, soft=0.02, ns=int(3 * q))
    for (lx, ly, lz) in LAMPS:
        S.point_light((lx, ly - 0.1, lz), (255, 160, 80), 7.0, 1, radius=0.15, ns=int(2 * q), rng=18.0)
    hx, hy, hz = Hs.LAMP
    S.point_light((hx, hy - 0.08, hz), (255, 170, 96), 9.0, 2, radius=0.14, ns=int(3 * q), rng=30.0)
    S.point_light((8.25, 5.9, 8.9), (255, 170, 96), 9.0, 2, radius=0.14, ns=int(3 * q), rng=30.0)
    if mx_pos:
        S.point_light(mx_pos, (255, 228, 180), 30.0, 1, radius=0.6, ns=int(2 * q), rng=26.0)
    S.ambient((6, 9, 16), (2, 3, 4), 3, ao_samples=int(3 * q), ao_dist=3.0, emit_group=4)
    S.build()
    print('town prims', len(S.prims), 'lamps', len(LAMPS))
    return S, mx_pos
