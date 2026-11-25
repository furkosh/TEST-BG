"""Extra sets around the house model: exterior shell with hipped roof, yard and streets, kitchen, living room with
the family table, suitcases, and the lighting presets (night / dawn / overcast / lamp-lit table)."""
import math
import numpy as np
from rt import *
import house as Hs

FRONT_DOOR = dict(x0=4.3, x1=5.2, z=4.42, h=2.1)
LIV_WIN = dict(x0=6.6, x1=8.0, y0=0.9, y1=2.2)
TABLE = dict(x0=6.75, x1=8.25, z0=1.35, z1=2.35, y=0.76)
LAMP_TABLE = (7.5, 1.72, 1.85)


def extra_materials(S):
    S.mat('plinth', MT_PLASTER, (120, 112, 100), noise=0.35, nscale=3)
    S.mat('doorsteel', MT_FLAT, (70, 48, 34), noise=0.06, nscale=6, shin=40, spec=0.3)
    S.mat('darkglass', MT_FLAT, (20, 24, 30), opa=0.55, shin=300, spec=2.5)
    S.mat('interior_dark', MT_FLAT, (14, 14, 16))
    S.mat('grass', MT_ASPHALT, (58, 66, 44), noise=0.2, nscale=3)
    S.mat('curb', MT_PLASTER, (150, 148, 140), noise=0.2, nscale=4)
    S.mat('sidewalk', MT_PLANKS, (128, 124, 118), color2=(140, 136, 128), pa=0.3, pb=0.3)
    S.mat('dish', MT_FLAT, (210, 210, 206), shin=20, spec=0.3)
    S.mat('solar', MT_FLAT, (30, 40, 60), shin=120, spec=1.2)
    S.mat('tank', MT_FLAT, (190, 190, 186), shin=40, spec=0.5)
    S.mat('gutter', MT_FLAT, (150, 150, 146), shin=40, spec=0.4)
    S.mat('suitcase', MT_FLAT, (40, 52, 74), noise=0.08, nscale=10, shin=30, spec=0.3)
    S.mat('suitcase2', MT_FLAT, (96, 32, 34), noise=0.08, nscale=10, shin=30, spec=0.3)
    S.mat('cloth1', MT_FOLDS, (190, 182, 170), pa=40, bump=0.3)
    S.mat('cloth2', MT_FOLDS, (70, 86, 110), pa=40, bump=0.3)
    S.mat('cloth3', MT_FOLDS, (150, 60, 60), pa=40, bump=0.3)
    S.mat('tablecloth', MT_ATLAS, (250, 248, 240), tex='lace', su=4.0, sv=4.0, uvm=1)
    S.mat('teaglass', MT_FLAT, (150, 60, 20), opa=0.55, shin=200, spec=1.5)
    S.mat('saucer', MT_FLAT, (230, 230, 226), shin=80, spec=0.8)
    S.mat('shade_lit', MT_FLAT, (230, 200, 150), emit=(1.2, 0.85, 0.45))
    S.mat('sofa', MT_FOLDS, (96, 78, 64), pa=18, bump=0.25, noise=0.1, nscale=6)
    S.mat('cabinet', MT_WOOD, (88, 58, 38), shin=40, spec=0.3)
    S.mat('fridge', MT_FLAT, (200, 200, 196), shin=50, spec=0.5)
    S.mat('tile_k', MT_PLANKS, (190, 186, 176), color2=(200, 196, 186), pa=0.3, pb=0.3, shin=60, spec=0.4)
    S.mat('headscarf', MT_FLAT, (80, 70, 90))
    S.mat('window_sky_day', MT_FLAT, (200, 210, 220), emit=(1.4, 1.5, 1.6))
    S.mat('nightwin', MT_FLAT, (20, 24, 30), emit=(0.05, 0.07, 0.12))
    S.mat('gate', MT_ATLAS, (255, 255, 255), tex='gate', su=1.0, sv=1.0, cut=1)
    S.mat('lace_liv', MT_ATLAS, (255, 255, 255), tex='lace', su=2.3, sv=2.3, uvm=1, opa=0.8, trl=0.85)


# ------------------------------------------------------------------ exterior shell
def ext_house(S, front_door_open=False, living_lit=False):
    # side wall (street side, x = -0.25..0) with the bedroom window and a small kitchen window
    Hs.wall_x(S, -0.27, -0.02, -6.25, 4.57, -0.45, 2.95, [(Hs.WIN['z0'], Hs.WIN['z1'], Hs.WIN['y0'], Hs.WIN['y1']), (-5.0, -4.1, 1.05, 2.0)], 'stucco')
    # front wall with the front door and the living-room window
    Hs.wall_z(S, 4.3, 4.55, -0.25, 9.75, -0.45, 2.95, [(FRONT_DOOR['x0'], FRONT_DOOR['x1'], 0.0, FRONT_DOOR['h']), (LIV_WIN['x0'], LIV_WIN['x1'], LIV_WIN['y0'], LIV_WIN['y1']), (1.4, 2.6, 0.95, 2.15)], 'stucco')
    S.box((9.5, -0.45, -6.25), (9.75, 2.95, 4.55), 'stucco')
    S.box((-0.25, -0.45, -6.25), (9.75, 2.95, -6.0), 'stucco')
    S.box((-0.25, 2.7, -6.25), (9.75, 2.95, 4.55), 'ceiling')
    # plinth band
    S.box((-0.29, -0.45, -6.29), (-0.25, 0.12, 4.59), 'plinth'); S.box((-0.29, -0.45, 4.55), (9.79, 0.12, 4.59), 'plinth')
    # hipped roof (slope 0.5), eaves 0.4 m out
    x0, x1, z0, z1, ye = -0.65, 10.15, -6.65, 4.95, 2.95
    pl = [((0, ye, z1), (0, 2, 1)), ((0, ye, z0), (0, 2, -1)), ((x0, ye, 0), (-1, 2, 0)), ((x1, ye, 0), (1, 2, 0)), ((0, ye, 0), (0, -1, 0))]
    S.poly_pts(pl, 'roof', (x0, ye, z0, x1, ye + 3.0, z1))
    S.box((x0, ye - 0.12, z1 - 0.06), (x1, ye - 0.02, z1 + 0.04), 'gutter')
    S.box((x0 - 0.04, ye - 0.12, z0), (x0 + 0.06, ye - 0.02, z1), 'gutter')
    # chimney, satellite dish, solar water heater (panels + tank) on the roof
    S.box((7.6, 3.4, -2.2), (8.1, 4.75, -1.7), 'plinth')
    S.ell((2.6, 4.05, 2.6), (0.05, 0.38, 0.38), 'dish', yaw=0.6)
    S.cyl(2.65, 2.6, 0.02, 3.6, 4.0, 'gutter')
    for px in (5.0, 6.05):
        c = np.array([px, 4.15, 0.6]); n = np.array([0.0, 0.8, 0.6]); n /= np.linalg.norm(n)
        t = np.array([0.0, -0.6, 0.8])
        planes = [(c + n * 0.02, n), (c - n * 0.02, -n), (c + np.array([0.48, 0, 0]), (1, 0, 0)), (c - np.array([0.48, 0, 0]), (-1, 0, 0)), (c + t * 0.95, t), (c - t * 0.95, -t)]
        S.poly_pts(planes, 'solar', (px - 0.5, 3.4, -0.2, px + 0.5, 4.9, 1.4))
    S.ell((5.55, 4.95, 0.05), (1.05, 0.22, 0.22), 'tank')
    # window frames (outside) + dark glass
    def win_frame_x(z0, z1, y0, y1, glass=True):
        S.box((-0.33, y0 - 0.05, z0 - 0.04), (-0.2, y0, z1 + 0.04), 'marble')
        if glass:
            S.box((-0.19, y0, z0), (-0.17, y1, z1), 'darkglass', flags=FL_TRANS | FL_NOSHADOW)
    win_frame_x(-5.0, -4.1, 1.05, 2.0)
    S.box((-0.25, 1.05, -5.0), (-0.05, 2.0, -4.1), 'interior_dark', flags=FL_NOSHADOW)
    def win_frame_z(x0_, x1_, y0, y1, lit):
        S.box((x0_ - 0.04, y0 - 0.05, 4.55), (x1_ + 0.04, y0, 4.68), 'marble')
        for (a, b) in [((x0_, y0, 4.44), (x1_, y0 + 0.065, 4.52)), ((x0_, y1 - 0.065, 4.44), (x1_, y1, 4.52)), ((x0_, y0, 4.44), (x0_ + 0.065, y1, 4.52)), ((x1_ - 0.065, y0, 4.44), (x1_, y1, 4.52)), (((x0_ + x1_) / 2 - 0.04, y0, 4.44), ((x0_ + x1_) / 2 + 0.04, y1, 4.52))]:
            S.box(a, b, 'pvc')
        S.box((x0_, y0, 4.47), (x1_, y1, 4.49), 'darkglass', flags=FL_TRANS | FL_NOSHADOW)
        S.box((x0_, y0, 4.3), (x1_, y1, 4.32), 'litwin' if lit else 'interior_dark', flags=FL_NOSHADOW)
    win_frame_z(LIV_WIN['x0'], LIV_WIN['x1'], LIV_WIN['y0'], LIV_WIN['y1'], living_lit)
    win_frame_z(1.4, 2.6, 0.95, 2.15, False)
    # front door (steel, brown) with frame and steps
    fx0, fx1 = FRONT_DOOR['x0'], FRONT_DOOR['x1']
    S.box((fx0 - 0.06, 0, 4.42), (fx0, 2.16, 4.6), 'doorsteel'); S.box((fx1, 0, 4.42), (fx1 + 0.06, 2.16, 4.6), 'doorsteel')
    S.box((fx0 - 0.06, 2.1, 4.42), (fx1 + 0.06, 2.16, 4.6), 'doorsteel')
    if not front_door_open:
        S.box((fx0, 0, 4.44), (fx1, 2.1, 4.5), 'doorsteel')
        S.box((fx0 + 0.25, 1.35, 4.5), (fx1 - 0.25, 1.8, 4.515), 'darkglass', flags=FL_TRANS)
        S.box((fx1 - 0.14, 1.0, 4.5), (fx1 - 0.06, 1.04, 4.56), 'metal')
    S.box((fx0 - 0.3, -0.45, 4.55), (fx1 + 0.3, -0.22, 5.35), 'concrete')
    S.box((fx0 - 0.3, -0.22, 4.55), (fx1 + 0.3, 0.0, 4.95), 'concrete')
    # small canopy over the door
    S.box((fx0 - 0.4, 2.35, 4.55), (fx1 + 0.4, 2.42, 5.25), 'concrete')


def yard(S, lamp_on=True):
    S.box((-30, -0.62, -30), (40, -0.45, 7.5), 'ground')
    S.box((-0.6, -0.46, 4.55), (9.9, -0.44, 7.5), 'sidewalk')
    # garden walls: side street (x -4.6) and front street (z 7.6) with a gate opening in front of the door
    S.box((-4.75, -0.45, -9), (-4.5, 1.15, 7.75), 'stucco')
    S.box((-4.75, -0.45, 7.5), (4.05, 1.15, 7.75), 'stucco')
    S.box((5.45, -0.45, 7.5), (12.0, 1.15, 7.75), 'stucco')
    S.box((4.05, -0.45, 7.56), (5.45, 1.35, 7.6), 'gate' if 'gate' in S.matnames else 'blackmetal', flags=0)
    S.box((-4.8, 1.15, -9), (-4.45, 1.21, 7.8), 'curb'); S.box((-4.8, 1.15, 7.45), (12.0, 1.21, 7.8), 'curb')
    # streets + kerbs
    S.box((-40, -0.64, -30), (-4.75, -0.62, 40), 'asphalt')
    S.box((-4.75, -0.64, 7.75), (40, -0.62, 40), 'asphalt')
    S.box((-4.75, -0.62, 7.75), (40, -0.5, 8.6), 'curb')
    # mulberry tree (side yard) and a poplar row along the front street
    S.cyl(-2.6, -2.6, 0.14, -0.45, 2.6, 'bark', layer=2)
    for (cx, cy, cz, r) in [(-2.6, 3.3, -2.6, 1.4), (-2.0, 2.9, -1.8, 0.9), (-3.1, 2.8, -3.4, 1.0), (-2.4, 4.2, -2.3, 1.0)]:
        S.ell((cx, cy, cz), (r, r * 0.8, r), 'leaves', layer=2)
    for k, px in enumerate([-8.0, 14.0, 20.0]):
        S.cyl(px, 9.4, 0.12, -0.62, 3.0, 'bark')
        S.ell((px, 6.2, 9.4), (0.9, 3.6, 0.9), 'leaves')
    # houses across the side street and across the front street
    for k, z in enumerate([-9.0, -1.5, 6.0]):
        S.box((-17.0, -0.6, z - 3.2), (-11.0, 3.2, z + 3.2), 'stucco')
        S.box((-11.02, 1.0, z - 0.6), (-11.0, 2.1, z + 0.5), 'litwin' if k == 1 else 'blackmetal')
        S.poly_pts([((0, 3.2, z + 3.6), (0, 2, 1)), ((0, 3.2, z - 3.6), (0, 2, -1)), ((-10.6, 3.2, 0), (1, 2, 0)), ((-17.4, 3.2, 0), (-1, 2, 0)), ((0, 3.2, 0), (0, -1, 0))], 'roof', (-17.4, 3.2, z - 3.6, -10.6, 5.2, z + 3.6))
    for k, x in enumerate([-6.0, 3.0, 13.0]):
        S.box((x - 3.5, -0.6, 11.5), (x + 3.5, 3.0 + (k == 1) * 3.0, 17.5), 'stucco')
        for wx in (x - 2.0, x + 1.2):
            S.box((wx, 1.0, 11.48), (wx + 1.0, 2.0, 11.5), 'litwin' if (k == 0 and wx < x) else 'blackmetal')
        top = 3.0 + (k == 1) * 3.0
        S.poly_pts([((0, top, 17.9), (0, 2, 1)), ((0, top, 11.1), (0, 2, -1)), ((x - 3.9, top, 0), (-1, 2, 0)), ((x + 3.9, top, 0), (1, 2, 0)), ((0, top, 0), (0, -1, 0))], 'roof', (x - 3.9, top, 11.1, x + 3.9, top + 2.2, 17.9))
    # the sodium lamp on the house across the side street (+ one on a pole down the front street)
    lx, ly, lz = Hs.LAMP
    S.box((-11.0, ly + 0.07, lz - 0.04), (lx + 0.05, ly + 0.13, lz + 0.04), 'blackmetal')
    S.ell((lx, ly, lz), (0.16, 0.07, 0.11), 'bulb' if lamp_on else 'blackmetal', flags=FL_NOSHADOW)
    S.cyl(9.0, 8.9, 0.09, -0.62, 6.2, 'concrete')
    S.box((8.2, 6.05, 8.85), (9.0, 6.12, 8.95), 'concrete')
    S.ell((8.25, 5.98, 8.9), (0.16, 0.07, 0.11), 'bulb' if lamp_on else 'blackmetal', flags=FL_NOSHADOW)


# ------------------------------------------------------------------ interiors
def kitchen(S):
    """dark kitchen behind the corridor's end door: cabinets, fridge, a window with faint night sky"""
    S.box((4.0, -0.2, -6.0), (7.2, 0.0, -3.0), 'tile_k')
    Hs.wall_z(S, -6.25, -6.0, 4.0, 7.2, 0.0, 2.7, [(5.0, 6.1, 1.05, 2.0)], 'plaster')
    S.box((3.85, 0, -6.0), (4.0, 2.7, -3.2), 'plaster'); S.box((7.2, 0, -6.0), (7.35, 2.7, -3.2), 'plaster')
    S.box((4.0, 2.7, -6.0), (7.2, 2.9, -3.2), 'ceiling')
    S.box((4.0, 0.0, -6.0), (4.6, 0.9, -4.0), 'cabinet'); S.box((4.0, 1.5, -6.0), (4.35, 2.3, -4.0), 'cabinet')
    S.box((6.5, 0.0, -5.95), (7.15, 1.85, -5.3), 'fridge')
    S.box((5.0, 1.05, -6.14), (6.1, 2.0, -6.12), 'nightwin', flags=FL_NOSHADOW)


def living(S, lamp_on=True):
    """living room (x 5.5..9.5, z 0..4.3): table with lace cloth and tea glasses under a hanging lamp"""
    S.box((5.5, -0.2, 0.0), (9.5, 0.0, 4.3), 'floor')
    Hs.wall_z(S, -0.25, 0.0, 5.35, 9.75, 0.0, 2.7, [], 'plaster')
    S.box((9.5, 0.0, 0.0), (9.75, 2.7, 4.3), 'plaster')
    S.box((5.35, 0.0, 0.0), (5.5, 2.7, 4.3), 'plaster')
    S.box((5.35, 2.7, -0.25), (9.75, 2.95, 4.55), 'ceiling')
    T = TABLE
    S.box((T['x0'], T['y'] - 0.04, T['z0']), (T['x1'], T['y'], T['z1']), 'cabinet')
    S.box((T['x0'] - 0.02, T['y'] - 0.005, T['z0'] - 0.02), (T['x1'] + 0.02, T['y'] + 0.004, T['z1'] + 0.02), 'tablecloth')
    for (lx, lz) in [(T['x0'] + 0.08, T['z0'] + 0.08), (T['x1'] - 0.08, T['z0'] + 0.08), (T['x0'] + 0.08, T['z1'] - 0.08), (T['x1'] - 0.08, T['z1'] - 0.08)]:
        S.box((lx - 0.03, 0, lz - 0.03), (lx + 0.03, T['y'] - 0.04, lz + 0.03), 'cabinet')
    # tea glasses on saucers + a sugar bowl
    for (gx, gz) in [(7.1, 1.6), (7.55, 1.55), (8.0, 1.65), (7.3, 2.1)]:
        S.cyl(gx, gz, 0.065, T['y'] + 0.004, T['y'] + 0.012, 'saucer')
        S.cyl(gx, gz, 0.028, T['y'] + 0.012, T['y'] + 0.11, 'teaglass', flags=FL_TRANS)
    S.cyl(7.75, 2.0, 0.06, T['y'], T['y'] + 0.08, 'saucer')
    # hanging lamp: cord + glass shade
    lx, ly, lz = LAMP_TABLE
    S.cyl(lx, lz, 0.006, ly + 0.15, 2.7, 'blackmetal', flags=FL_NOSHADOW)
    S.cyl(lx, lz, 0.2, ly - 0.02, ly + 0.15, 'shade_lit' if lamp_on else 'lampshade', flags=FL_NOSHADOW)
    # glass cabinet (vitrin) against the back wall, sofa on the left, framed picture
    S.box((7.9, 0.0, 0.0), (9.3, 1.9, 0.45), 'cabinet')
    S.box((5.55, 0.0, 0.5), (6.35, 0.85, 2.9), 'sofa')
    S.box((5.5, 1.3, 1.2), (5.53, 1.9, 2.2), 'print')
    # chairs (simple)
    for (cx, cz, back) in [(7.5, 1.05, -1), (8.15, 1.05, -1), (7.05, 2.75, 1)]:
        S.box((cx - 0.21, 0.44, cz - 0.21), (cx + 0.21, 0.48, cz + 0.21), 'cabinet')
        S.box((cx - 0.21, 0.48, cz + back * 0.19 - 0.02), (cx + 0.21, 1.0, cz + back * 0.19 + 0.02), 'cabinet')


def suitcases(S, where='corridor'):
    if where == 'corridor':
        S.box((4.3, 0.0, 3.75), (4.75, 0.68, 4.0), 'suitcase')
        S.box((4.82, 0.0, 3.8), (5.22, 0.58, 4.02), 'suitcase2')
        S.box((4.45, 0.68, 3.84), (4.6, 0.72, 3.9), 'blackmetal')
    else:   # open suitcase on the bed
        bx, bz = 1.35, 2.15
        S.box((bx, 0.64, bz), (bx + 0.72, 0.86, bz + 0.48), 'suitcase')
        S.box((bx + 0.03, 0.66, bz + 0.03), (bx + 0.69, 0.84, bz + 0.45), 'interior_dark')
        S.obb((bx + 0.36, 0.92, bz + 0.5), (0.36, 0.25, 0.02), 0.0, 'suitcase')   # lid standing up
        for k, (m, h) in enumerate([('cloth1', 0.06), ('cloth2', 0.05), ('cloth3', 0.04)]):
            S.box((bx + 0.06 + k * 0.2, 0.66, bz + 0.06), (bx + 0.26 + k * 0.2, 0.66 + 0.12 + h, bz + 0.42), m)
        S.box((bx + 0.95, 0.64, bz - 0.1), (bx + 1.25, 0.7, bz + 0.25), 'cloth1')


# ------------------------------------------------------------------ light presets
def lights_ext_night(S, q=1.0):
    """0 moon, 1 side-street lamp, 2 front-street lamp, 3 sky ambient, 4 emission"""
    S.dir_light((-0.74, 0.56, -0.37), (150, 175, 220), 0.7, 0, soft=0.02, ns=int(4 * q))
    lx, ly, lz = Hs.LAMP
    S.point_light((lx, ly - 0.08, lz), (255, 170, 96), 14.0, 1, radius=0.14, ns=int(4 * q), rng=40.0)
    S.point_light((8.25, 5.9, 8.9), (255, 170, 96), 18.0, 2, radius=0.14, ns=int(4 * q), rng=40.0)
    S.ambient((7, 10, 18), (2, 3, 4), 3, ao_samples=int(4 * q), ao_dist=1.6, emit_group=4)


def lights_ext_day(S, kind='overcast', q=1.0):
    """0 sky key (soft sun / dawn glow), 3 sky ambient, 4 emission"""
    if kind == 'dawn':
        S.dir_light((0.6, 0.18, 0.78), (255, 190, 160), 0.25, 0, soft=0.25, ns=int(4 * q))
        S.ambient((92, 112, 150), (30, 34, 42), 3, ao_samples=int(8 * q), ao_dist=6.0, emit_group=4)
    else:
        S.dir_light((0.3, 0.9, 0.3), (220, 224, 230), 0.35, 0, soft=0.45, ns=int(4 * q))
        S.ambient((150, 156, 164), (60, 60, 58), 3, ao_samples=int(8 * q), ao_dist=6.0, emit_group=4)


def lights_corridor_night(S, q=1.0):
    """corridor: faint street light through the front-door glass, moon spill from the bedroom door"""
    S.rect_light((4.4, 1.1, 4.29), (0.7, 0.0, 0.0), (0.0, 0.75, 0.0), (170, 150, 130), 2.2, 0, ns=int(6 * q))
    S.dir_light((-0.74, 0.56, -0.37), (160, 186, 230), 5.0, 1, soft=0.035, ns=int(6 * q))
    S.point_light((1.4, 1.0, 2.2), (120, 140, 175), 0.32, 1, radius=0.6, ns=int(3 * q), rng=6.0)
    S.rect_light((5.0, 1.05, -6.11), (0.0, 0.95, 0.0), (1.1, 0.0, 0.0), (90, 110, 150), 1.2, 2, ns=int(4 * q))
    S.ambient((8, 10, 14), (3, 4, 5), 3, ao_samples=int(5 * q), ao_dist=0.5, emit_group=4)


def lights_corridor_day(S, kind='dawn', q=1.0):
    """front door open: daylight pours in from z > 4.3"""
    col = (150, 170, 210) if kind == 'dawn' else (200, 204, 210)
    S.rect_light((4.3, 0.0, 4.6), (0.9, 0.0, 0.0), (0.0, 2.1, 0.0), col, 2.6 if kind == 'dawn' else 3.2, 0, ns=int(8 * q))
    S.ambient((14, 16, 20), (6, 6, 7), 3, ao_samples=int(5 * q), ao_dist=0.6, emit_group=4)


def lights_table(S, q=1.0):
    lx, ly, lz = LAMP_TABLE
    S.point_light((lx, ly - 0.05, lz), (255, 196, 132), 1.6, 0, radius=0.12, ns=int(8 * q), rng=8.0)
    S.ambient((9, 9, 12), (4, 4, 5), 3, ao_samples=int(5 * q), ao_dist=0.6, emit_group=4)


def lights_bedroom_day(S, kind='dawn', q=1.0):
    """window sky light (rect) + soft fill"""
    z0, z1, y0, y1 = Hs.WIN['z0'], Hs.WIN['z1'], Hs.WIN['y0'], Hs.WIN['y1']
    col = (140, 165, 210) if kind == 'dawn' else (215, 220, 228)
    pw = 7.0 if kind == 'dawn' else 12.0
    S.rect_light((-0.15, y0, z0), (0.0, 0.0, z1 - z0), (0.0, y1 - y0, 0.0), col, pw, 0, ns=int(10 * q))
    S.ambient((22, 26, 34) if kind == 'dawn' else (40, 42, 46), (10, 11, 13), 3, ao_samples=int(5 * q), ao_dist=0.6, emit_group=4)
