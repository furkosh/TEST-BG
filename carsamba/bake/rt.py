"""Small CPU ray tracer (numba) that bakes the sets of KAPIDAKİ SURET.

Boxes, ellipsoids, cylinders and convex polyhedra in a stackless BVH; procedural and atlas materials,
alpha cut-outs, translucent layers (lace curtains, glass); directional / point / rectangular area lights
with soft shadows, ambient occlusion, volumetric light shafts. Each light writes into its own output
group so the renderer can animate lights (flicker, fade) by blending the groups.
"""
import math
import numpy as np
from numba import njit, prange

INF = 1e30
# ---- primitive record ----
P_TYPE, P_MAT, P_LAYER, P_FLAG, P_CX, P_CY, P_CZ, P_HX, P_HY, P_HZ, P_COS, P_SIN, P_E0, P_E1, P_E2, P_E3 = range(16)
NPF = 16
T_OBB, T_ELL, T_CYL, T_POLY, T_HF = 0, 1, 2, 3, 4
FL_NOSHADOW, FL_NOCAM, FL_TRANS = 1, 2, 4
# ---- material record ----
(M_TYPE, M_R, M_G, M_B, M_AX, M_AY, M_AW, M_AH, M_SU, M_SV, M_UVM, M_CUT, M_OPA, M_SHIN, M_SPEC,
 M_ER, M_EG, M_EB, M_NA, M_NS, M_PA, M_PB, M_PC, M_TRL, M_R2, M_G2, M_B2, M_BUMP) = range(28)
NMF = 32
MT_FLAT, MT_ATLAS, MT_PLANKS, MT_WOOD, MT_FOLDS, MT_RADIATOR, MT_TILES, MT_ASPHALT, MT_PLASTER, MT_QUILT, MT_STUCCO, MT_VORONOI = range(12)
# ---- light record ----
(L_TYPE, L_R, L_G, L_B, L_X, L_Y, L_Z, L_UX, L_UY, L_UZ, L_VX, L_VY, L_VZ, L_RAD, L_NS, L_GRP, L_VOL, L_RANGE,
 L_V0X, L_V0Y, L_V0Z, L_V1X, L_V1Y, L_V1Z, L_VSTEP, L_SPEC, L_VGRP) = range(27)
NLF = 32
LT_DIR, LT_POINT, LT_RECT = 0, 1, 2


# ------------------------------------------------------------------ random / noise
@njit(cache=True, fastmath=True)
def hrand(a, b, c):
    h = (a * 374761393 + b * 668265263 + c * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return h / 4294967296.0


@njit(cache=True, fastmath=True)
def vnoise3(x, y, z, s):
    xi, yi, zi = math.floor(x), math.floor(y), math.floor(z)
    xf, yf, zf = x - xi, y - yi, z - zi
    u, v, w = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf), zf * zf * (3 - 2 * zf)
    xi, yi, zi = int(xi), int(yi), int(zi)
    c000 = hrand(xi + s * 7919, yi, zi); c100 = hrand(xi + 1 + s * 7919, yi, zi)
    c010 = hrand(xi + s * 7919, yi + 1, zi); c110 = hrand(xi + 1 + s * 7919, yi + 1, zi)
    c001 = hrand(xi + s * 7919, yi, zi + 1); c101 = hrand(xi + 1 + s * 7919, yi, zi + 1)
    c011 = hrand(xi + s * 7919, yi + 1, zi + 1); c111 = hrand(xi + 1 + s * 7919, yi + 1, zi + 1)
    x00 = c000 + (c100 - c000) * u; x10 = c010 + (c110 - c010) * u
    x01 = c001 + (c101 - c001) * u; x11 = c011 + (c111 - c011) * u
    y0 = x00 + (x10 - x00) * v; y1 = x01 + (x11 - x01) * v
    return y0 + (y1 - y0) * w


@njit(cache=True, fastmath=True)
def fbm3(x, y, z, octs, s):
    a, f, tot, nrm = 0.5, 1.0, 0.0, 0.0
    for k in range(octs):
        tot += a * vnoise3(x * f, y * f, z * f, s + k * 13)
        nrm += a; a *= 0.5; f *= 2.03
    return tot / nrm


# ------------------------------------------------------------------ intersection
@njit(cache=True, fastmath=True)
def hf_h(HF, ax, ay, aw, ah, hx, hz, x, z):
    u = (x + hx) / (2 * hx) * (aw - 1)
    v = (z + hz) / (2 * hz) * (ah - 1)
    u = min(max(u, 0.0), aw - 1.001); v = min(max(v, 0.0), ah - 1.001)
    x0, y0 = int(u), int(v)
    fx, fy = u - x0, v - y0
    X, Y = int(ax) + x0, int(ay) + y0
    return (HF[Y, X] * (1 - fx) + HF[Y, X + 1] * fx) * (1 - fy) + (HF[Y + 1, X] * (1 - fx) + HF[Y + 1, X + 1] * fx) * fy


@njit(cache=True, fastmath=True)
def isect(P, PL, HF, i, ox, oy, oz, dx, dy, dz, tmin, tmax):
    """returns t, face, nx, ny, nz (world normal), lx, ly, lz (local hit)"""
    typ = int(P[i, P_TYPE])
    c, s = P[i, P_COS], P[i, P_SIN]
    if typ == T_POLY:
        t0, t1, kk = tmin, tmax, -1
        st, cnt = int(P[i, P_E0]), int(P[i, P_E1])
        for k in range(st, st + cnt):
            nx, ny, nz, d = PL[k, 0], PL[k, 1], PL[k, 2], PL[k, 3]
            den = nx * dx + ny * dy + nz * dz
            dist = d - (nx * ox + ny * oy + nz * oz)
            if abs(den) < 1e-12:
                if dist < 0:
                    return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
                continue
            t = dist / den
            if den < 0:
                if t > t0:
                    t0 = t; kk = k
            else:
                if t < t1:
                    t1 = t
            if t0 > t1:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if kk < 0 or t0 <= tmin:
            return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        px, py, pz = ox + dx * t0, oy + dy * t0, oz + dz * t0
        return t0, kk - st, PL[kk, 0], PL[kk, 1], PL[kk, 2], px, py, pz
    # local frame (yaw about +y)
    ax_, ay_, az_ = ox - P[i, P_CX], oy - P[i, P_CY], oz - P[i, P_CZ]
    lox, loy, loz = c * ax_ - s * az_, ay_, s * ax_ + c * az_
    ldx, ldy, ldz = c * dx - s * dz, dy, s * dx + c * dz
    hx, hy, hz = P[i, P_HX], P[i, P_HY], P[i, P_HZ]
    if typ == T_HF:
        # slab test against the local box, then march the height field
        t0, t1, face = tmin, tmax, -1
        for a in range(3):
            o = lox if a == 0 else (loy if a == 1 else loz)
            d = ldx if a == 0 else (ldy if a == 1 else ldz)
            hh = hx if a == 0 else (hy if a == 1 else hz)
            if abs(d) < 1e-12:
                if o < -hh or o > hh:
                    return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
                continue
            ta, tb = (-hh - o) / d, (hh - o) / d
            fa = a * 2 + (0 if d > 0 else 1)
            if ta > tb:
                ta, tb = tb, ta
            if ta > t0:
                t0 = ta; face = fa
            if tb < t1:
                t1 = tb
            if t0 > t1:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ax, ay, aw, ah = P[i, P_E0], P[i, P_E1], P[i, P_E2], P[i, P_E3]
        cell = min(2 * hx / aw, 2 * hz / ah)
        step = max(cell * 0.6, 0.003)
        x, z = lox + ldx * t0, loz + ldz * t0
        dprev = loy + ldy * t0 - hf_h(HF, ax, ay, aw, ah, hx, hz, x, z)
        if dprev < 0:
            if face < 0:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            # entered through a side wall below the surface: solid skirt
            lnx = -1.0 if face == 0 else (1.0 if face == 1 else 0.0)
            lnz = -1.0 if face == 4 else (1.0 if face == 5 else 0.0)
            lny = -1.0 if face == 2 else (1.0 if face == 3 else 0.0)
            return t0, face, c * lnx + s * lnz, lny, -s * lnx + c * lnz, lox + ldx * t0, loy + ldy * t0, loz + ldz * t0
        tp = t0
        nst = int((t1 - t0) / step) + 1
        if nst > 900:
            nst = 900; step = (t1 - t0) / 900
        for k in range(1, nst + 1):
            t = min(t0 + step * k, t1)
            x, z = lox + ldx * t, loz + ldz * t
            dcur = loy + ldy * t - hf_h(HF, ax, ay, aw, ah, hx, hz, x, z)
            if dcur < 0:
                lo_, hi_ = tp, t
                for it in range(7):
                    mid = 0.5 * (lo_ + hi_)
                    xm, zm = lox + ldx * mid, loz + ldz * mid
                    if loy + ldy * mid - hf_h(HF, ax, ay, aw, ah, hx, hz, xm, zm) < 0:
                        hi_ = mid
                    else:
                        lo_ = mid
                th = hi_
                if th <= tmin:
                    return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
                xh, zh = lox + ldx * th, loz + ldz * th
                e = cell
                gx = (hf_h(HF, ax, ay, aw, ah, hx, hz, xh + e, zh) - hf_h(HF, ax, ay, aw, ah, hx, hz, xh - e, zh)) / (2 * e)
                gz = (hf_h(HF, ax, ay, aw, ah, hx, hz, xh, zh + e) - hf_h(HF, ax, ay, aw, ah, hx, hz, xh, zh - e)) / (2 * e)
                nl = math.sqrt(gx * gx + 1 + gz * gz)
                lnx, lny, lnz = -gx / nl, 1.0 / nl, -gz / nl
                return th, 6, c * lnx + s * lnz, lny, -s * lnx + c * lnz, xh, loy + ldy * th, zh
            tp = t
            if t >= t1:
                break
        return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    if typ == T_OBB:
        t0, t1, face = tmin, tmax, -1
        # x slab
        if abs(ldx) < 1e-12:
            if lox < -hx or lox > hx:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        else:
            inv = 1.0 / ldx
            ta, tb = (-hx - lox) * inv, (hx - lox) * inv
            fa = 0 if ldx > 0 else 1
            if ta > tb:
                ta, tb = tb, ta
            if ta > t0:
                t0 = ta; face = fa
            if tb < t1:
                t1 = tb
            if t0 > t1:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if abs(ldy) < 1e-12:
            if loy < -hy or loy > hy:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        else:
            inv = 1.0 / ldy
            ta, tb = (-hy - loy) * inv, (hy - loy) * inv
            fa = 2 if ldy > 0 else 3
            if ta > tb:
                ta, tb = tb, ta
            if ta > t0:
                t0 = ta; face = fa
            if tb < t1:
                t1 = tb
            if t0 > t1:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if abs(ldz) < 1e-12:
            if loz < -hz or loz > hz:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        else:
            inv = 1.0 / ldz
            ta, tb = (-hz - loz) * inv, (hz - loz) * inv
            fa = 4 if ldz > 0 else 5
            if ta > tb:
                ta, tb = tb, ta
            if ta > t0:
                t0 = ta; face = fa
            if tb < t1:
                t1 = tb
            if t0 > t1:
                return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        if face < 0 or t0 <= tmin:
            return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        lnx, lny, lnz = 0.0, 0.0, 0.0
        if face == 0: lnx = -1.0
        elif face == 1: lnx = 1.0
        elif face == 2: lny = -1.0
        elif face == 3: lny = 1.0
        elif face == 4: lnz = -1.0
        else: lnz = 1.0
        hxl, hyl, hzl = lox + ldx * t0, loy + ldy * t0, loz + ldz * t0
        return t0, face, c * lnx + s * lnz, lny, -s * lnx + c * lnz, hxl, hyl, hzl
    if typ == T_ELL:
        sx, sy, sz = lox / hx, loy / hy, loz / hz
        qx, qy, qz = ldx / hx, ldy / hy, ldz / hz
        a = qx * qx + qy * qy + qz * qz
        b = 2 * (sx * qx + sy * qy + sz * qz)
        cc = sx * sx + sy * sy + sz * sz - 1
        disc = b * b - 4 * a * cc
        if disc < 0:
            return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        sq = math.sqrt(disc)
        t = (-b - sq) / (2 * a)
        if t <= tmin:
            t = (-b + sq) / (2 * a)
        if t <= tmin or t >= tmax:
            return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        hxl, hyl, hzl = lox + ldx * t, loy + ldy * t, loz + ldz * t
        lnx, lny, lnz = hxl / (hx * hx), hyl / (hy * hy), hzl / (hz * hz)
        nn = math.sqrt(lnx * lnx + lny * lny + lnz * lnz) + 1e-12
        lnx /= nn; lny /= nn; lnz /= nn
        return t, 0, c * lnx + s * lnz, lny, -s * lnx + c * lnz, hxl, hyl, hzl
    # vertical cylinder: radius hx, half height hy
    r = hx
    best, face = INF, 0
    a = ldx * ldx + ldz * ldz
    if a > 1e-12:
        b = 2 * (lox * ldx + loz * ldz)
        cc = lox * lox + loz * loz - r * r
        disc = b * b - 4 * a * cc
        if disc >= 0:
            sq = math.sqrt(disc)
            for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
                if t > tmin and t < tmax and t < best:
                    yy = loy + ldy * t
                    if yy >= -hy and yy <= hy:
                        best = t; face = 0
    if abs(ldy) > 1e-12:
        for sg in (-1.0, 1.0):
            t = (sg * hy - loy) / ldy
            if t > tmin and t < tmax and t < best:
                xx, zz = lox + ldx * t, loz + ldz * t
                if xx * xx + zz * zz <= r * r:
                    best = t; face = 2 if sg < 0 else 3
    if best >= INF:
        return INF, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    hxl, hyl, hzl = lox + ldx * best, loy + ldy * best, loz + ldz * best
    if face == 0:
        lnx, lny, lnz = hxl / r, 0.0, hzl / r
    elif face == 2:
        lnx, lny, lnz = 0.0, -1.0, 0.0
    else:
        lnx, lny, lnz = 0.0, 1.0, 0.0
    return best, face, c * lnx + s * lnz, lny, -s * lnx + c * lnz, hxl, hyl, hzl


@njit(cache=True, fastmath=True)
def face_uv(P, i, face, lx, ly, lz, nx, ny, nz):
    """(u, v) in metres on the face, plus the face size; v points up on walls."""
    typ = int(P[i, P_TYPE])
    hx, hy, hz = P[i, P_HX], P[i, P_HY], P[i, P_HZ]
    if typ == T_OBB:
        if face == 0: return hz - lz, ly + hy, 2 * hz, 2 * hy
        if face == 1: return lz + hz, ly + hy, 2 * hz, 2 * hy
        if face == 4: return lx + hx, ly + hy, 2 * hx, 2 * hy
        if face == 5: return hx - lx, ly + hy, 2 * hx, 2 * hy
        return lx + hx, hz - lz, 2 * hx, 2 * hz
    if typ == T_HF:
        return lx + hx, lz + hz, 2 * hx, 2 * hz
    if typ == T_ELL:
        ang = math.atan2(lz, lx)
        return (ang + math.pi) * hx, ly + hy, 2 * math.pi * hx, 2 * hy
    if typ == T_CYL:
        ang = math.atan2(lz, lx)
        if face == 0:
            return (ang + math.pi) * hx, ly + hy, 2 * math.pi * hx, 2 * hy
        return lx + hx, lz + hx, 2 * hx, 2 * hx
    # polyhedron: planar projection by dominant normal axis (world coordinates)
    ax, ay, az = abs(nx), abs(ny), abs(nz)
    if ay >= ax and ay >= az:
        return lx, lz, 1.0, 1.0
    if ax >= az:
        return -lz if nx < 0 else lz, ly, 1.0, 1.0
    return lx if nz < 0 else -lx, ly, 1.0, 1.0


@njit(cache=True, fastmath=True)
def atlas(ATL, ax, ay, aw, ah, u, v, wrap):
    """bilinear sample; u,v in [0,1] (v up); returns r,g,b,a"""
    if wrap:
        u = u - math.floor(u); v = v - math.floor(v)
    else:
        u = min(max(u, 0.0), 1.0); v = min(max(v, 0.0), 1.0)
    x = ax + u * (aw - 1); y = ay + (1 - v) * (ah - 1)
    x0, y0 = int(x), int(y)
    x1, y1 = min(x0 + 1, int(ax + aw - 1)), min(y0 + 1, int(ay + ah - 1))
    fx, fy = x - x0, y - y0
    r = (ATL[y0, x0, 0] * (1 - fx) + ATL[y0, x1, 0] * fx) * (1 - fy) + (ATL[y1, x0, 0] * (1 - fx) + ATL[y1, x1, 0] * fx) * fy
    g = (ATL[y0, x0, 1] * (1 - fx) + ATL[y0, x1, 1] * fx) * (1 - fy) + (ATL[y1, x0, 1] * (1 - fx) + ATL[y1, x1, 1] * fx) * fy
    b = (ATL[y0, x0, 2] * (1 - fx) + ATL[y0, x1, 2] * fx) * (1 - fy) + (ATL[y1, x0, 2] * (1 - fx) + ATL[y1, x1, 2] * fx) * fy
    a = (ATL[y0, x0, 3] * (1 - fx) + ATL[y0, x1, 3] * fx) * (1 - fy) + (ATL[y1, x0, 3] * (1 - fx) + ATL[y1, x1, 3] * fx) * fy
    return r, g, b, a


@njit(cache=True, fastmath=True)
def mat_uv(P, MT, i, face, lx, ly, lz, nx, ny, nz):
    m = int(P[i, P_MAT])
    u, v, uw, vh = face_uv(P, i, face, lx, ly, lz, nx, ny, nz)
    if MT[m, M_UVM] == 0:       # stretch over the face
        return u / uw * MT[m, M_SU], v / vh * MT[m, M_SV]
    return u * MT[m, M_SU], v * MT[m, M_SV]


@njit(cache=True, fastmath=True)
def mat_alpha(P, MT, ATL, i, face, lx, ly, lz, nx, ny, nz):
    m = int(P[i, P_MAT])
    if MT[m, M_AW] <= 0:
        return 1.0
    u, v = mat_uv(P, MT, i, face, lx, ly, lz, nx, ny, nz)
    _, _, _, a = atlas(ATL, MT[m, M_AX], MT[m, M_AY], MT[m, M_AW], MT[m, M_AH], u, v, MT[m, M_UVM] != 0)
    return a


@njit(cache=True, fastmath=True)
def closest(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, tmin, tmax, lmask):
    """closest opaque, camera-visible hit"""
    best, bi, bface = tmax, -1, 0
    bnx, bny, bnz, blx, bly, blz = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    idx = 1.0 / dx if abs(dx) > 1e-12 else 1e12
    idy = 1.0 / dy if abs(dy) > 1e-12 else 1e12
    idz = 1.0 / dz if abs(dz) > 1e-12 else 1e12
    n = 0
    nn = BN.shape[0]
    while n >= 0 and n < nn:
        t1 = (BN[n, 0] - ox) * idx; t2 = (BN[n, 3] - ox) * idx
        tn, tf = min(t1, t2), max(t1, t2)
        t1 = (BN[n, 1] - oy) * idy; t2 = (BN[n, 4] - oy) * idy
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        t1 = (BN[n, 2] - oz) * idz; t2 = (BN[n, 5] - oz) * idz
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        if tf >= max(tn, tmin) and tn <= best:
            cnt = int(BN[n, 7])
            if cnt > 0:
                st = int(BN[n, 6])
                for q in range(st, st + cnt):
                    i = BI[q]
                    fl = int(P[i, P_FLAG])
                    if (fl & FL_NOCAM) or (fl & FL_TRANS):
                        continue
                    if (int(P[i, P_LAYER]) & lmask) == 0:
                        continue
                    t, face, nx, ny, nz, lx, ly, lz = isect(P, PL, HF, i, ox, oy, oz, dx, dy, dz, tmin, best)
                    if t < best:
                        m = int(P[i, P_MAT])
                        if MT[m, M_CUT] > 0:
                            if mat_alpha(P, MT, ATL, i, face, lx, ly, lz, nx, ny, nz) < 0.5:
                                continue
                        best, bi, bface = t, i, face
                        bnx, bny, bnz, blx, bly, blz = nx, ny, nz, lx, ly, lz
                n = int(BN[n, 8])
            else:
                n += 1
        else:
            n = int(BN[n, 8])
    return best, bi, bface, bnx, bny, bnz, blx, bly, blz


@njit(cache=True, fastmath=True)
def transmit(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, tmax):
    """shadow ray transmittance (0 = blocked); translucent prims attenuate"""
    T = 1.0
    idx = 1.0 / dx if abs(dx) > 1e-12 else 1e12
    idy = 1.0 / dy if abs(dy) > 1e-12 else 1e12
    idz = 1.0 / dz if abs(dz) > 1e-12 else 1e12
    n = 0
    nn = BN.shape[0]
    while n >= 0 and n < nn:
        t1 = (BN[n, 0] - ox) * idx; t2 = (BN[n, 3] - ox) * idx
        tn, tf = min(t1, t2), max(t1, t2)
        t1 = (BN[n, 1] - oy) * idy; t2 = (BN[n, 4] - oy) * idy
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        t1 = (BN[n, 2] - oz) * idz; t2 = (BN[n, 5] - oz) * idz
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        if tf >= max(tn, 1e-4) and tn <= tmax:
            cnt = int(BN[n, 7])
            if cnt > 0:
                st = int(BN[n, 6])
                for q in range(st, st + cnt):
                    i = BI[q]
                    fl = int(P[i, P_FLAG])
                    if fl & FL_NOSHADOW:
                        continue
                    t, face, nx, ny, nz, lx, ly, lz = isect(P, PL, HF, i, ox, oy, oz, dx, dy, dz, 1e-4, tmax)
                    if t < tmax:
                        m = int(P[i, P_MAT])
                        if fl & FL_TRANS:
                            a = MT[m, M_OPA] * mat_alpha(P, MT, ATL, i, face, lx, ly, lz, nx, ny, nz)
                            T *= (1 - a)
                            if T < 0.01:
                                return 0.0
                            continue
                        if MT[m, M_CUT] > 0:
                            if mat_alpha(P, MT, ATL, i, face, lx, ly, lz, nx, ny, nz) < 0.5:
                                continue
                        return 0.0
                n = int(BN[n, 8])
            else:
                n += 1
        else:
            n = int(BN[n, 8])
    return T


@njit(cache=True, fastmath=True)
def gather_trans(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, tmax, lmask, out_t, out_i, out_f, out_l):
    """translucent camera-visible hits before tmax (unsorted), returns count (max 4)"""
    cntf = 0
    idx = 1.0 / dx if abs(dx) > 1e-12 else 1e12
    idy = 1.0 / dy if abs(dy) > 1e-12 else 1e12
    idz = 1.0 / dz if abs(dz) > 1e-12 else 1e12
    n = 0
    nn = BN.shape[0]
    while n >= 0 and n < nn:
        t1 = (BN[n, 0] - ox) * idx; t2 = (BN[n, 3] - ox) * idx
        tn, tf = min(t1, t2), max(t1, t2)
        t1 = (BN[n, 1] - oy) * idy; t2 = (BN[n, 4] - oy) * idy
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        t1 = (BN[n, 2] - oz) * idz; t2 = (BN[n, 5] - oz) * idz
        tn, tf = max(tn, min(t1, t2)), min(tf, max(t1, t2))
        if tf >= max(tn, 1e-4) and tn <= tmax:
            cnt = int(BN[n, 7])
            if cnt > 0:
                st = int(BN[n, 6])
                for q in range(st, st + cnt):
                    i = BI[q]
                    fl = int(P[i, P_FLAG])
                    if (fl & FL_TRANS) == 0 or (fl & FL_NOCAM):
                        continue
                    if (int(P[i, P_LAYER]) & lmask) == 0:
                        continue
                    t, face, nx, ny, nz, lx, ly, lz = isect(P, PL, HF, i, ox, oy, oz, dx, dy, dz, 1e-4, tmax)
                    if t < tmax and cntf < 4:
                        out_t[cntf] = t; out_i[cntf] = i; out_f[cntf] = face
                        out_l[cntf, 0] = nx; out_l[cntf, 1] = ny; out_l[cntf, 2] = nz
                        out_l[cntf, 3] = lx; out_l[cntf, 4] = ly; out_l[cntf, 5] = lz
                        cntf += 1
                n = int(BN[n, 8])
            else:
                n += 1
        else:
            n = int(BN[n, 8])
    return cntf


# ------------------------------------------------------------------ materials
@njit(cache=True, fastmath=True)
def shade(P, MT, ATL, i, face, lx, ly, lz, px, py, pz, nx, ny, nz):
    """albedo rgb, perturbed normal, shininess, specular, emission rgb"""
    m = int(P[i, P_MAT])
    typ = int(MT[m, M_TYPE])
    r, g, b = MT[m, M_R], MT[m, M_G], MT[m, M_B]
    na, ns = MT[m, M_NA], MT[m, M_NS]
    u, v = mat_uv(P, MT, i, face, lx, ly, lz, nx, ny, nz)
    k = 1.0
    if typ == MT_ATLAS:
        tr, tg, tb, ta = atlas(ATL, MT[m, M_AX], MT[m, M_AY], MT[m, M_AW], MT[m, M_AH], u, v, MT[m, M_UVM] != 0)
        r *= tr; g *= tg; b *= tb
    elif typ == MT_PLANKS:
        # laminate planks along world x: width PA, length PB
        wpl, lpl = MT[m, M_PA], MT[m, M_PB]
        row = math.floor(pz / wpl)
        off = hrand(int(row), 3, m) * lpl
        col_ = math.floor((px + off) / lpl)
        hv = hrand(int(row), int(col_), 11)
        fx = (px + off) / lpl - col_
        fz = pz / wpl - row
        grain = fbm3(px * 1.5, pz * 40, hv * 10, 4, 5)
        k = 0.78 + hv * 0.32 + (grain - 0.5) * 0.35
        if fz < 0.025 or fz > 0.975 or fx < 0.004 or fx > 0.996:
            k *= 0.45
        r2, g2, b2 = MT[m, M_R2], MT[m, M_G2], MT[m, M_B2]
        t = hv
        r, g, b = r + (r2 - r) * t, g + (g2 - g) * t, b + (b2 - b) * t
    elif typ == MT_WOOD:
        # veneer grain along u
        gr = fbm3(u * 2.0, v * 30.0, 0.5, 4, m + 3)
        ring = math.sin((v * 55.0 + gr * 9.0)) * 0.5 + 0.5
        k = 0.8 + (gr - 0.5) * 0.4 + ring * 0.12
    elif typ == MT_FOLDS:
        # heavy drape: vertical folds (albedo + normal tilt)
        fq = MT[m, M_PA]
        ph = u * fq + fbm3(u * 2, v * 0.6, 0.0, 3, m) * 3.0
        sn = math.sin(ph)
        k = 0.72 + 0.28 * (sn * 0.5 + 0.5)
        # tilt normal sideways (in the face plane: use world xz tangent approx)
        tx, tz = -nz, nx
        tl = math.sqrt(tx * tx + tz * tz) + 1e-9
        tilt = math.cos(ph) * MT[m, M_BUMP]
        nx += tx / tl * tilt; nz += tz / tl * tilt
    elif typ == MT_RADIATOR:
        fin = (u * MT[m, M_PA]) % 1.0
        k = 0.65 + 0.35 * math.sin(fin * math.pi)
        tx, tz = -nz, nx
        tl = math.sqrt(tx * tx + tz * tz) + 1e-9
        tilt = math.cos(fin * math.pi) * 0.6
        nx += tx / tl * tilt; nz += tz / tl * tilt
    elif typ == MT_TILES:
        # clay roof tiles: rows along v, wavy columns along u
        rowh, colw = MT[m, M_PA], MT[m, M_PB]
        row = math.floor(v / rowh)
        fu = (u / colw + (row % 2) * 0.5)
        cu = math.floor(fu)
        hv = hrand(int(row), int(cu), 21)
        fr = v / rowh - row
        wave = math.sin((fu - cu) * math.pi * 2)
        k = (0.75 + hv * 0.35) * (0.55 + 0.45 * (0.5 + 0.5 * wave)) * (0.6 + 0.4 * fr)
        r2, g2, b2 = MT[m, M_R2], MT[m, M_G2], MT[m, M_B2]
        moss = fbm3(px * 0.7, py * 0.7, pz * 0.7, 3, 9)
        t = min(max((moss - 0.55) * 3.0, 0.0), 1.0)
        r, g, b = r + (r2 - r) * t, g + (g2 - g) * t, b + (b2 - b) * t
    elif typ == MT_ASPHALT:
        a1 = fbm3(px * 0.4, pz * 0.4, 0.0, 4, 31)
        a2 = hrand(int(px * 90), int(pz * 90), 7)
        k = 0.75 + (a1 - 0.5) * 0.5 + (a2 - 0.5) * 0.18
    elif typ == MT_PLASTER or typ == MT_STUCCO:
        sc = ns if ns > 0 else 1.0
        a1 = fbm3(px * sc, py * sc, pz * sc, 5, m * 3 + 1)
        a2 = fbm3(px * sc * 7, py * sc * 7, pz * sc * 7, 2, m * 3 + 2)
        k = 1.0 + (a1 - 0.5) * na + (a2 - 0.5) * na * 0.4
        if typ == MT_STUCCO:
            # weathered exterior: darker streaks below windows / near the ground, patches
            st = fbm3(px * 0.6, py * 3.0, pz * 0.6, 3, 41)
            k *= 0.85 + 0.3 * st
            dirt = min(max(1.0 - py * 1.2, 0.0), 1.0)
            k *= 1.0 - dirt * 0.25
            r2, g2, b2 = MT[m, M_R2], MT[m, M_G2], MT[m, M_B2]
            pch = fbm3(px * 0.35, py * 0.35, pz * 0.35, 4, 43)
            t = min(max((pch - 0.5) * 2.5, 0.0), 1.0)
            r, g, b = r + (r2 - r) * t, g + (g2 - g) * t, b + (b2 - b) * t
    elif typ == MT_QUILT:
        # quilted bedspread: diamond stitching + atlas pattern if present
        if MT[m, M_AW] > 0:
            tr, tg, tb, ta = atlas(ATL, MT[m, M_AX], MT[m, M_AY], MT[m, M_AW], MT[m, M_AH], u, v, True)
            r *= tr; g *= tg; b *= tb
        q = MT[m, M_PA]
        d1 = ((px + pz) * q) % 1.0
        d2 = ((px - pz) * q) % 1.0
        st = min(min(d1, 1 - d1), min(d2, 1 - d2))
        k = 0.82 + 0.18 * min(st * 8.0, 1.0)
    elif typ == MT_VORONOI:
        # cobbles / rubble stone: cells with mortar joints, rounded tops, per-stone tint
        sc = MT[m, M_PA]
        if abs(ny) > 0.7:
            X, Z = px * sc, pz * sc
        else:
            X, Z = u * sc, v * sc * MT[m, M_PB]
        xi, zi = math.floor(X), math.floor(Z)
        d1, d2, bfx, bfz, bid = 9.0, 9.0, 0.0, 0.0, 0.0
        for dj in range(-1, 2):
            for di in range(-1, 2):
                cx, cz = int(xi) + di, int(zi) + dj
                fx = cx + 0.15 + 0.7 * hrand(cx, cz, 71)
                fz = cz + 0.15 + 0.7 * hrand(cx, cz, 72)
                d = (X - fx) ** 2 + (Z - fz) ** 2
                if d < d1:
                    d2 = d1; d1 = d; bfx = fx; bfz = fz; bid = hrand(cx, cz, 73)
                elif d < d2:
                    d2 = d
        edge = math.sqrt(d2) - math.sqrt(d1)
        jw = MT[m, M_PC]
        r2, g2, b2 = MT[m, M_R2], MT[m, M_G2], MT[m, M_B2]
        if edge < jw:
            t = edge / jw
            r, g, b = r2 + (r - r2) * t * 0.3, g2 + (g - g2) * t * 0.3, b2 + (b - b2) * t * 0.3
            k = 0.55 + 0.45 * t
        else:
            k = 0.72 + 0.5 * bid + (fbm3(px * 9, py * 9, pz * 9, 2, 5) - 0.5) * 0.3
            tl = 0.35 * min(1.0, (edge - jw) * 3.0)
            ddx, ddz = (X - bfx), (Z - bfz)
            if abs(ny) > 0.7:
                nx += ddx * tl; nz += ddz * tl
            else:
                tx, tz = -nz, nx
                tlen = math.sqrt(tx * tx + tz * tz) + 1e-9
                nx += tx / tlen * ddx * tl; nz += tz / tlen * ddx * tl; ny += ddz * tl
    if na > 0 and typ != MT_PLASTER and typ != MT_STUCCO:
        k *= 1.0 + (fbm3(px * ns, py * ns, pz * ns, 3, m) - 0.5) * na
    r *= k; g *= k; b *= k
    nl = math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-12
    return r, g, b, nx / nl, ny / nl, nz / nl, MT[m, M_SHIN], MT[m, M_SPEC], MT[m, M_ER], MT[m, M_EG], MT[m, M_EB]


# ------------------------------------------------------------------ lighting
@njit(cache=True, fastmath=True)
def basis(nx, ny, nz):
    if abs(nx) > 0.9:
        ax, ay, az = 0.0, 1.0, 0.0
    else:
        ax, ay, az = 1.0, 0.0, 0.0
    tx, ty, tz = ay * nz - az * ny, az * nx - ax * nz, ax * ny - ay * nx
    tl = math.sqrt(tx * tx + ty * ty + tz * tz)
    tx /= tl; ty /= tl; tz /= tl
    bx, by, bz = ny * tz - nz * ty, nz * tx - nx * tz, nx * ty - ny * tx
    return tx, ty, tz, bx, by, bz


@njit(cache=True, fastmath=True)
def light_at(P, PL, HF, MT, ATL, BN, BI, LT, k, px, py, pz, nx, ny, nz, vx, vy, vz, shin, spec, twosided, trl, pix, seed):
    """irradiance (diffuse) rgb and specular rgb from light k at point p"""
    typ = int(LT[k, L_TYPE])
    ns = max(1, int(LT[k, L_NS]))
    cr, cg, cb = LT[k, L_R], LT[k, L_G], LT[k, L_B]
    acc, sacc = 0.0, 0.0
    r1 = hrand(pix, k * 7 + 1, seed); r2 = hrand(pix, k * 7 + 2, seed)
    for s in range(ns):
        u1 = ((s + 0.5) / ns + r1) % 1.0
        u2 = (s * 0.61803398875 + r2) % 1.0
        dist = INF
        if typ == LT_DIR:
            lx, ly, lz = LT[k, L_X], LT[k, L_Y], LT[k, L_Z]
            tx, ty, tz, bx, by, bz = basis(lx, ly, lz)
            rr = LT[k, L_RAD] * math.sqrt(u1); ph = 6.2831853 * u2
            dx = lx + (tx * math.cos(ph) + bx * math.sin(ph)) * rr
            dy = ly + (ty * math.cos(ph) + by * math.sin(ph)) * rr
            dz = lz + (tz * math.cos(ph) + bz * math.sin(ph)) * rr
            dl = math.sqrt(dx * dx + dy * dy + dz * dz)
            dx /= dl; dy /= dl; dz /= dl
            fall = 1.0
        elif typ == LT_POINT:
            # sample a disc of radius RAD facing p
            cx, cy, cz = LT[k, L_X], LT[k, L_Y], LT[k, L_Z]
            wx, wy, wz = cx - px, cy - py, cz - pz
            wl = math.sqrt(wx * wx + wy * wy + wz * wz) + 1e-9
            wx /= wl; wy /= wl; wz /= wl
            tx, ty, tz, bx, by, bz = basis(wx, wy, wz)
            rr = LT[k, L_RAD] * math.sqrt(u1); ph = 6.2831853 * u2
            qx = cx + (tx * math.cos(ph) + bx * math.sin(ph)) * rr
            qy = cy + (ty * math.cos(ph) + by * math.sin(ph)) * rr
            qz = cz + (tz * math.cos(ph) + bz * math.sin(ph)) * rr
            dx, dy, dz = qx - px, qy - py, qz - pz
            dist = math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
            dx /= dist; dy /= dist; dz /= dist
            rng = LT[k, L_RANGE]
            win = 1.0
            if rng > 0:
                q = dist / rng
                win = max(0.0, 1.0 - q * q * q * q)
                win *= win
            if win <= 0:
                continue
            fall = win / (dist * dist + 0.05)
        else:
            # rectangle (window / sky light): corner + u + v, emitting toward -(u x v)
            ux, uy, uz = LT[k, L_UX], LT[k, L_UY], LT[k, L_UZ]
            wx, wy, wz = LT[k, L_VX], LT[k, L_VY], LT[k, L_VZ]
            qx = LT[k, L_X] + ux * u1 + wx * u2
            qy = LT[k, L_Y] + uy * u1 + wy * u2
            qz = LT[k, L_Z] + uz * u1 + wz * u2
            lnx, lny, lnz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
            area = math.sqrt(lnx * lnx + lny * lny + lnz * lnz) + 1e-12
            lnx /= area; lny /= area; lnz /= area
            dx, dy, dz = qx - px, qy - py, qz - pz
            dist = math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
            dx /= dist; dy /= dist; dz /= dist
            cl = lnx * dx + lny * dy + lnz * dz          # light faces -n: p sees the front if dot(n, p->q) > 0
            if cl <= 0:
                continue
            fall = cl * area / (dist * dist + 0.02) / 3.14159
        cs = nx * dx + ny * dy + nz * dz
        side = 1.0
        if cs <= 0:
            if twosided == 0:
                continue
            cs = -cs; side = trl
            ox, oy, oz = px - nx * 2e-3, py - ny * 2e-3, pz - nz * 2e-3
        else:
            ox, oy, oz = px + nx * 2e-3, py + ny * 2e-3, pz + nz * 2e-3
        T = transmit(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, dist - 1e-3 if dist < INF else INF)
        if T <= 0:
            continue
        acc += cs * T * fall * side
        if spec > 0 and side == 1.0:
            hx_, hy_, hz_ = dx + vx, dy + vy, dz + vz
            hl = math.sqrt(hx_ * hx_ + hy_ * hy_ + hz_ * hz_) + 1e-9
            nh = max(0.0, (nx * hx_ + ny * hy_ + nz * hz_) / hl)
            sacc += T * fall * (nh ** shin) * (shin + 2) / 8.0
    inv = 1.0 / ns
    sp = spec * LT[k, L_SPEC] * inv * sacc
    return cr * acc * inv, cg * acc * inv, cb * acc * inv, cr * sp, cg * sp, cb * sp


@njit(cache=True, fastmath=True)
def ambient_occ(P, PL, HF, MT, ATL, BN, BI, px, py, pz, nx, ny, nz, nsamp, dist, pix, seed):
    if nsamp <= 0:
        return 1.0
    tx, ty, tz, bx, by, bz = basis(nx, ny, nz)
    occ = 0.0
    r1 = hrand(pix, 91, seed); r2 = hrand(pix, 92, seed)
    ox, oy, oz = px + nx * 2e-3, py + ny * 2e-3, pz + nz * 2e-3
    for s in range(nsamp):
        u1 = ((s + 0.5) / nsamp + r1) % 1.0
        u2 = (s * 0.61803398875 + r2) % 1.0
        rr = math.sqrt(u1); ph = 6.2831853 * u2
        a, b = rr * math.cos(ph), rr * math.sin(ph)
        c = math.sqrt(max(0.0, 1 - u1))
        dx, dy, dz = tx * a + bx * b + nx * c, ty * a + by * b + ny * c, tz * a + bz * b + nz * c
        T = transmit(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, dist)
        occ += 1.0 - T
    return 1.0 - occ / nsamp


@njit(cache=True, fastmath=True)
def surface(P, PL, HF, MT, ATL, BN, BI, LT, AMB, i, face, nx, ny, nz, lx, ly, lz, px, py, pz, dx, dy, dz, pix, seed, acc, w, ngr):
    """adds w * (lit colour of the hit) into acc[group, 3]"""
    r, g, b, nx, ny, nz, shin, spec, er, eg, eb = shade(P, MT, ATL, i, face, lx, ly, lz, px, py, pz, nx, ny, nz)
    m = int(P[i, P_MAT])
    twos = 0
    trl = MT[m, M_TRL]
    if nx * dx + ny * dy + nz * dz > 0:     # seen from the back (thin / translucent)
        nx, ny, nz = -nx, -ny, -nz
    if trl > 0:
        twos = 1
    vx, vy, vz = -dx, -dy, -dz
    for k in range(LT.shape[0]):
        grp = int(LT[k, L_GRP])
        ir, ig, ib, sr, sg, sb = light_at(P, PL, HF, MT, ATL, BN, BI, LT, k, px, py, pz, nx, ny, nz, vx, vy, vz, shin, spec, twos, trl, pix, seed)
        acc[grp, 0] += w * (r * ir + sr); acc[grp, 1] += w * (g * ig + sg); acc[grp, 2] += w * (b * ib + sb)
    ag = int(AMB[8])
    if ag >= 0:
        ao = ambient_occ(P, PL, HF, MT, ATL, BN, BI, px, py, pz, nx, ny, nz, int(AMB[7]), AMB[6], pix, seed)
        up = 0.5 + 0.5 * ny
        ar = AMB[0] * up + AMB[3] * (1 - up); agc = AMB[1] * up + AMB[4] * (1 - up); ab = AMB[2] * up + AMB[5] * (1 - up)
        acc[ag, 0] += w * r * ar * ao; acc[ag, 1] += w * g * agc * ao; acc[ag, 2] += w * b * ab * ao
    eg_ = int(AMB[9])
    if eg_ >= 0:
        acc[eg_, 0] += w * er; acc[eg_, 1] += w * eg; acc[eg_, 2] += w * eb


@njit(cache=True, fastmath=True)
def volume(P, PL, HF, MT, ATL, BN, BI, LT, k, ox, oy, oz, dx, dy, dz, thit, pix, seed):
    """in-scattered light along the camera ray inside the light's volume box"""
    v0x, v0y, v0z, v1x, v1y, v1z = LT[k, L_V0X], LT[k, L_V0Y], LT[k, L_V0Z], LT[k, L_V1X], LT[k, L_V1Y], LT[k, L_V1Z]
    tn, tf = 0.0, thit
    for a in range(3):
        o = ox if a == 0 else (oy if a == 1 else oz)
        d = dx if a == 0 else (dy if a == 1 else dz)
        lo = v0x if a == 0 else (v0y if a == 1 else v0z)
        hi = v1x if a == 0 else (v1y if a == 1 else v1z)
        if abs(d) < 1e-12:
            if o < lo or o > hi:
                return 0.0, 0.0, 0.0
        else:
            t1, t2 = (lo - o) / d, (hi - o) / d
            if t1 > t2:
                t1, t2 = t2, t1
            tn = max(tn, t1); tf = min(tf, t2)
    if tf <= tn:
        return 0.0, 0.0, 0.0
    step = LT[k, L_VSTEP]
    nst = int((tf - tn) / step) + 1
    if nst > 160:
        nst = 160
    dt = (tf - tn) / nst
    jit = hrand(pix, 333 + k, seed)
    typ = int(LT[k, L_TYPE])
    acc = 0.0
    for s in range(nst):
        t = tn + (s + jit) * dt
        qx, qy, qz = ox + dx * t, oy + dy * t, oz + dz * t
        if typ == LT_DIR:
            ldx, ldy, ldz = LT[k, L_X], LT[k, L_Y], LT[k, L_Z]
            T = transmit(P, PL, HF, MT, ATL, BN, BI, qx, qy, qz, ldx, ldy, ldz, INF)
            acc += T * dt
        elif typ == LT_POINT:
            cx, cy, cz = LT[k, L_X] - qx, LT[k, L_Y] - qy, LT[k, L_Z] - qz
            dist = math.sqrt(cx * cx + cy * cy + cz * cz) + 1e-9
            T = transmit(P, PL, HF, MT, ATL, BN, BI, qx, qy, qz, cx / dist, cy / dist, cz / dist, dist - 0.05)
            rng = LT[k, L_RANGE]
            win = 1.0
            if rng > 0:
                q = dist / rng
                win = max(0.0, 1.0 - q * q * q * q); win *= win
            acc += T * dt * win / (dist * dist + 0.3)
        else:
            ux, uy, uz = LT[k, L_UX], LT[k, L_UY], LT[k, L_UZ]
            wx, wy, wz = LT[k, L_VX], LT[k, L_VY], LT[k, L_VZ]
            u1, u2 = hrand(pix, s * 3 + 1, seed + k), hrand(pix, s * 3 + 2, seed + k)
            cx = LT[k, L_X] + ux * u1 + wx * u2 - qx
            cy = LT[k, L_Y] + uy * u1 + wy * u2 - qy
            cz = LT[k, L_Z] + uz * u1 + wz * u2 - qz
            dist = math.sqrt(cx * cx + cy * cy + cz * cz) + 1e-9
            T = transmit(P, PL, HF, MT, ATL, BN, BI, qx, qy, qz, cx / dist, cy / dist, cz / dist, dist - 0.01)
            acc += T * dt / (dist * dist + 0.5)
    dn = LT[k, L_VOL]
    return LT[k, L_R] * acc * dn, LT[k, L_G] * acc * dn, LT[k, L_B] * acc * dn


@njit(parallel=True, fastmath=True, cache=True)
def render(Wd, Ht, CAM, P, PL, HF, MT, ATL, BN, BI, LT, AMB, lmask, ngr, seed, OUT, DEPTH, ALPHA):
    ox, oy, oz = CAM[0], CAM[1], CAM[2]
    fx, fy, fz = CAM[3], CAM[4], CAM[5]
    rx, ry, rz = CAM[6], CAM[7], CAM[8]
    ux, uy, uz = CAM[9], CAM[10], CAM[11]
    fl, ccx, ccy = CAM[12], CAM[13], CAM[14]
    for j in prange(Ht):
        acc = np.zeros((ngr, 3))
        tt = np.zeros(4); ti = np.zeros(4, np.int64); tfc = np.zeros(4, np.int64); tl = np.zeros((4, 6))
        for i in range(Wd):
            pix = j * Wd + i
            jx = hrand(pix, 5, seed) - 0.5; jy = hrand(pix, 6, seed) - 0.5
            sx = (i + 0.5 + jx * 0.5 - ccx) / fl
            sy = (j + 0.5 + jy * 0.5 - ccy) / fl
            dx, dy, dz = fx + rx * sx - ux * sy, fy + ry * sx - uy * sy, fz + rz * sx - uz * sy
            dl = math.sqrt(dx * dx + dy * dy + dz * dz)
            dx /= dl; dy /= dl; dz /= dl
            for g in range(ngr):
                acc[g, 0] = 0.0; acc[g, 1] = 0.0; acc[g, 2] = 0.0
            t, pi, face, nx, ny, nz, lx, ly, lz = closest(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, 1e-4, INF, lmask)
            nt = gather_trans(P, PL, HF, MT, ATL, BN, BI, ox, oy, oz, dx, dy, dz, t, lmask, tt, ti, tfc, tl)
            # sort translucent hits front to back
            for a in range(nt):
                for b in range(a + 1, nt):
                    if tt[b] < tt[a]:
                        tt[a], tt[b] = tt[b], tt[a]
                        ti[a], ti[b] = ti[b], ti[a]
                        tfc[a], tfc[b] = tfc[b], tfc[a]
                        for c in range(6):
                            tl[a, c], tl[b, c] = tl[b, c], tl[a, c]
            wgt = 1.0
            cover = 0.0
            for a in range(nt):
                ii = ti[a]
                m = int(P[ii, P_MAT])
                al = MT[m, M_OPA] * mat_alpha(P, MT, ATL, ii, tfc[a], tl[a, 3], tl[a, 4], tl[a, 5], tl[a, 0], tl[a, 1], tl[a, 2])
                if al <= 0.003:
                    continue
                qx, qy, qz = ox + dx * tt[a], oy + dy * tt[a], oz + dz * tt[a]
                surface(P, PL, HF, MT, ATL, BN, BI, LT, AMB, ii, tfc[a], tl[a, 0], tl[a, 1], tl[a, 2], tl[a, 3], tl[a, 4], tl[a, 5],
                        qx, qy, qz, dx, dy, dz, pix, seed, acc, wgt * al, ngr)
                cover = cover + wgt * al
                wgt *= (1 - al)
            if pi >= 0:
                px, py, pz = ox + dx * t, oy + dy * t, oz + dz * t
                surface(P, PL, HF, MT, ATL, BN, BI, LT, AMB, pi, face, nx, ny, nz, lx, ly, lz, px, py, pz, dx, dy, dz, pix, seed, acc, wgt, ngr)
                cover = 1.0
                DEPTH[j, i] = t * (dx * fx + dy * fy + dz * fz)
            else:
                DEPTH[j, i] = 1e4
            ALPHA[j, i] = cover
            # volumetric light shafts
            for k in range(LT.shape[0]):
                if LT[k, L_VOL] > 0:
                    vr, vg, vb = volume(P, PL, HF, MT, ATL, BN, BI, LT, k, ox, oy, oz, dx, dy, dz, min(t, 200.0), pix, seed)
                    gg = int(LT[k, L_VGRP])
                    acc[gg, 0] += vr; acc[gg, 1] += vg; acc[gg, 2] += vb
            for g in range(ngr):
                OUT[g, j, i, 0] = acc[g, 0]; OUT[g, j, i, 1] = acc[g, 1]; OUT[g, j, i, 2] = acc[g, 2]


# ------------------------------------------------------------------ scene building (python side)
def srgb2lin(c):
    c = np.asarray(c, np.float64)
    if c.max() > 1.0:
        c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


class Scene:
    def __init__(self):
        self.prims, self.planes, self.aabbs, self.mats, self.lights = [], [], [], [], []
        self.matnames = {}
        self.atlas = None
        self.atlas_rects = {}
        self.amb = [0, 0, 0, 0, 0, 0, 0.6, 0, -1, -1]
        self.hfs = []

    # ---- materials ----
    def mat(self, name, typ=MT_FLAT, color=(200, 200, 200), tex=None, su=1.0, sv=1.0, uvm=0, cut=0, opa=1.0, shin=8.0, spec=0.0,
            emit=(0, 0, 0), noise=0.0, nscale=1.0, pa=0.0, pb=0.0, pc=0.0, trl=0.0, color2=None, bump=0.0, lin=False):
        rec = np.zeros(NMF)
        rec[M_TYPE] = typ
        rec[M_R:M_B + 1] = color if lin else srgb2lin(color)
        rec[M_R2:M_B2 + 1] = (color2 if lin else srgb2lin(color2)) if color2 is not None else rec[M_R:M_B + 1]
        if tex is not None:
            ax, ay, aw, ah = self.atlas_rects[tex]
            rec[M_AX], rec[M_AY], rec[M_AW], rec[M_AH] = ax, ay, aw, ah
        rec[M_SU], rec[M_SV], rec[M_UVM], rec[M_CUT], rec[M_OPA] = su, sv, uvm, cut, opa
        rec[M_SHIN], rec[M_SPEC] = shin, spec
        rec[M_ER:M_EB + 1] = emit
        rec[M_NA], rec[M_NS], rec[M_PA], rec[M_PB], rec[M_PC], rec[M_TRL], rec[M_BUMP] = noise, nscale, pa, pb, pc, trl, bump
        self.matnames[name] = len(self.mats)
        self.mats.append(rec)
        return self.matnames[name]

    def M(self, name):
        return self.matnames[name] if isinstance(name, str) else name

    def set_atlas(self, img, rects):
        self.atlas = img.astype(np.float32)
        self.atlas_rects = rects

    # ---- primitives ----
    def _add(self, typ, mat, c, h, yaw, layer, flags, e0=0, e1=0, aabb=None):
        rec = np.zeros(NPF)
        rec[P_TYPE], rec[P_MAT], rec[P_LAYER], rec[P_FLAG] = typ, self.M(mat), layer, flags
        rec[P_CX:P_CZ + 1] = c
        rec[P_HX:P_HZ + 1] = h
        rec[P_COS], rec[P_SIN] = math.cos(yaw), math.sin(yaw)
        rec[P_E0], rec[P_E1] = e0, e1
        if aabb is None:
            # conservative world AABB of the rotated local box
            cs, sn = abs(math.cos(yaw)), abs(math.sin(yaw))
            ex = cs * h[0] + sn * h[2]
            ez = sn * h[0] + cs * h[2]
            if typ == T_CYL:
                ex = ez = h[0]
            aabb = [c[0] - ex, c[1] - h[1], c[2] - ez, c[0] + ex, c[1] + h[1], c[2] + ez]
        self.prims.append(rec)
        self.aabbs.append(aabb)
        return len(self.prims) - 1

    def box(self, mn, mx, mat, layer=1, flags=0):
        mn, mx = np.asarray(mn, float), np.asarray(mx, float)
        return self._add(T_OBB, mat, (mn + mx) / 2, (mx - mn) / 2, 0.0, layer, flags)

    def obb(self, c, h, yaw, mat, layer=1, flags=0):
        return self._add(T_OBB, mat, c, h, yaw, layer, flags)

    def ell(self, c, r, mat, yaw=0.0, layer=1, flags=0):
        return self._add(T_ELL, mat, c, r, yaw, layer, flags)

    def cyl(self, x, z, r, y0, y1, mat, layer=1, flags=0):
        return self._add(T_CYL, mat, (x, (y0 + y1) / 2, z), (r, (y1 - y0) / 2, r), 0.0, layer, flags)

    def poly(self, planes, mat, bbox, layer=1, flags=0):
        st = len(self.planes)
        for p in planes:
            n = np.asarray(p[:3], float); n = n / np.linalg.norm(n)
            self.planes.append([n[0], n[1], n[2], p[3] / np.linalg.norm(p[:3])])
        return self._add(T_POLY, mat, (0, 0, 0), (1, 1, 1), 0.0, layer, flags, st, len(planes), aabb=list(bbox))

    def poly_pts(self, planes_pts, mat, bbox, layer=1, flags=0):
        """planes given as (point, outward normal)"""
        pl = []
        for p, n in planes_pts:
            n = np.asarray(n, float)
            pl.append([n[0], n[1], n[2], float(np.dot(n, p))])
        return self.poly(pl, mat, bbox, layer, flags)

    def hf(self, heights, center_xz, half_xz, y0, mat, yaw=0.0, layer=1, flags=0):
        """height field solid: heights (rows = z, cols = x) are world y values; solid between y0 and the surface"""
        Hh = np.asarray(heights, np.float64)
        y1 = float(Hh.max()) + 0.002
        cy = (y0 + y1) / 2
        self.hfs.append(Hh - cy)
        k = len(self.hfs) - 1
        rec_i = self._add(T_HF, mat, (center_xz[0], cy, center_xz[1]), (half_xz[0], (y1 - y0) / 2, half_xz[1]), yaw, layer, flags)
        self.prims[rec_i][P_E0] = k     # resolved to atlas offsets in build()
        return rec_i

    # ---- lights ----
    def dir_light(self, d, color, power, group, soft=0.02, ns=8, vol=0.0, vbox=None, vstep=0.08, spec=1.0, vgroup=None):
        rec = np.zeros(NLF)
        d = np.asarray(d, float); d = d / np.linalg.norm(d)
        rec[L_TYPE] = LT_DIR
        rec[L_R:L_B + 1] = srgb2lin(color) * power
        rec[L_X:L_Z + 1] = d
        rec[L_RAD], rec[L_NS], rec[L_GRP], rec[L_VOL], rec[L_SPEC] = soft, ns, group, vol, spec
        if vbox is not None:
            rec[L_V0X:L_V0Z + 1] = vbox[0]; rec[L_V1X:L_V1Z + 1] = vbox[1]
        rec[L_VSTEP] = vstep
        rec[L_VGRP] = group if vgroup is None else vgroup
        self.lights.append(rec)

    def point_light(self, p, color, power, group, radius=0.05, ns=4, rng=0.0, vol=0.0, vbox=None, vstep=0.08, spec=1.0, vgroup=None):
        rec = np.zeros(NLF)
        rec[L_TYPE] = LT_POINT
        rec[L_R:L_B + 1] = srgb2lin(color) * power
        rec[L_X:L_Z + 1] = p
        rec[L_RAD], rec[L_NS], rec[L_GRP], rec[L_RANGE], rec[L_VOL], rec[L_SPEC] = radius, ns, group, rng, vol, spec
        if vbox is not None:
            rec[L_V0X:L_V0Z + 1] = vbox[0]; rec[L_V1X:L_V1Z + 1] = vbox[1]
        rec[L_VSTEP] = vstep
        rec[L_VGRP] = group if vgroup is None else vgroup
        self.lights.append(rec)

    def rect_light(self, corner, u, v, color, power, group, ns=8, vol=0.0, vbox=None, vstep=0.08, spec=0.5, vgroup=None):
        """emits toward the side where dot(u x v, p - corner) < 0 ... i.e. light reaches p when (u x v) . (q - p) > 0"""
        rec = np.zeros(NLF)
        rec[L_TYPE] = LT_RECT
        rec[L_R:L_B + 1] = srgb2lin(color) * power
        rec[L_X:L_Z + 1] = corner; rec[L_UX:L_UZ + 1] = u; rec[L_VX:L_VZ + 1] = v
        rec[L_NS], rec[L_GRP], rec[L_VOL], rec[L_SPEC] = ns, group, vol, spec
        if vbox is not None:
            rec[L_V0X:L_V0Z + 1] = vbox[0]; rec[L_V1X:L_V1Z + 1] = vbox[1]
        rec[L_VSTEP] = vstep
        rec[L_VGRP] = group if vgroup is None else vgroup
        self.lights.append(rec)

    def ambient(self, top, bottom, group, ao_samples=6, ao_dist=0.5, emit_group=-1, lin=False):
        t = np.asarray(top, float) if lin else srgb2lin(top)
        b = np.asarray(bottom, float) if lin else srgb2lin(bottom)
        self.amb = [t[0], t[1], t[2], b[0], b[1], b[2], ao_dist, ao_samples, group, emit_group]

    # ---- BVH ----
    def build(self):
        A = np.asarray(self.aabbs, float)
        n = len(A)
        nodes, right, order = [], [], []

        def rec(ids):
            me = len(nodes); nodes.append(None); right.append(-1)
            bmin, bmax = A[ids, :3].min(0), A[ids, 3:].max(0)
            if len(ids) <= 2:
                nodes[me] = [*bmin, *bmax, len(order), len(ids), -1]
                order.extend(ids.tolist())
                return me
            cen = (A[ids, :3] + A[ids, 3:]) / 2
            ax = int(np.argmax(cen.max(0) - cen.min(0)))
            ids = ids[np.argsort(cen[:, ax], kind='stable')]
            mid = len(ids) // 2
            nodes[me] = [*bmin, *bmax, 0, 0, -1]
            rec(ids[:mid])
            right[me] = rec(ids[mid:])
            return me

        rec(np.arange(n))

        # stackless traversal: miss link = next node after the subtree (left child -> right sibling)
        def fix(i, miss):
            nodes[i][8] = miss
            if nodes[i][7] == 0:
                fix(i + 1, right[i]); fix(right[i], miss)

        fix(0, -1)
        BN = np.asarray(nodes, np.float64)
        self.BN, self.BI = BN, np.asarray(order, np.int64)
        # pack height fields vertically into one array
        if self.hfs:
            Wm = max(h.shape[1] for h in self.hfs) + 1
            Ht = sum(h.shape[0] + 1 for h in self.hfs)
            HF = np.zeros((Ht, Wm), np.float64)
            y = 0
            offs = []
            for h in self.hfs:
                HF[y:y + h.shape[0], :h.shape[1]] = h
                offs.append((0, y, h.shape[1], h.shape[0]))
                y += h.shape[0] + 1
            for rec in self.prims:
                if int(rec[P_TYPE]) == T_HF:
                    ax, ay, aw, ah = offs[int(rec[P_E0])]
                    rec[P_E0], rec[P_E1], rec[P_E2], rec[P_E3] = ax, ay, aw, ah
            self.HF = HF
        else:
            self.HF = np.zeros((2, 2), np.float64)
        self.P = np.asarray(self.prims, np.float64)
        self.PL = np.asarray(self.planes if self.planes else [[0, 1, 0, 0]], np.float64)
        self.MT = np.asarray(self.mats, np.float64)
        self.LT = np.asarray(self.lights if self.lights else np.zeros((0, NLF)), np.float64).reshape(-1, NLF)
        self.AMB = np.asarray(self.amb, np.float64)
        if self.atlas is None:
            self.atlas = np.ones((2, 2, 4), np.float32)


def camera(pos, target, f_px, w, h, roll=0.0, up=(0.0, 1.0, 0.0)):
    pos, target = np.asarray(pos, float), np.asarray(target, float)
    fw = target - pos; fw /= np.linalg.norm(fw)
    up0 = np.asarray(up, float)
    rt = np.cross(up0, fw); rt /= np.linalg.norm(rt)
    up = np.cross(fw, rt)
    if roll:
        c, s = math.cos(roll), math.sin(roll)
        rt, up = rt * c + up * s, -rt * s + up * c
    return np.array([*pos, *fw, *rt, *up, f_px, w / 2, h / 2], np.float64)


def project(cam, p):
    p = np.asarray(p, float) - cam[0:3]
    fw, rt, up = cam[3:6], cam[6:9], cam[9:12]
    z = p @ fw
    return [float(cam[13] + (p @ rt) / z * cam[12]), float(cam[14] - (p @ up) / z * cam[12]), float(z)]


def bake(scene, cam, w, h, ngr, lmask=0xFFFF, seed=1):
    OUT = np.zeros((ngr, h, w, 3), np.float64)
    DEPTH = np.zeros((h, w), np.float64)
    ALPHA = np.zeros((h, w), np.float64)
    render(w, h, cam, scene.P, scene.PL, scene.HF, scene.MT, scene.atlas, scene.BN, scene.BI, scene.LT, scene.AMB, lmask, ngr, seed, OUT, DEPTH, ALPHA)
    return OUT, DEPTH, ALPHA
