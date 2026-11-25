"""Bake a named view of the house and export layers for the renderer.
usage: python3 bake_view.py <view> [scale] [--final]
  scale: resolution factor relative to 1080x1920 (previews 0.5; finals 1.25+)
outputs (final): render/bg/<view>.jpg (static lights), <view>_lamp.jpg (additive street-lamp layer),
                 optional depth-of-field variants, and projected anchor points in render/bg/anchors.json"""
import sys, json, time, os, math
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from rt import *
import house as Hs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'render', 'bg')
PREV_DIR = '/tmp/claude-0/-home-user-TEST-BG/6153618c-d421-5e64-a986-ffee99bbbbd7/scratchpad/bake'


def tonemap(x, exposure=1.0):
    x = np.maximum(x * exposure, 0)
    y = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
    y = np.clip(y, 0, 1)
    return np.where(y <= 0.0031308, y * 12.92, 1.055 * np.power(np.maximum(y, 1e-8), 1 / 2.4) - 0.055)


import sets as St


def build(parts, lights, q, **kw):
    S = Hs.new_scene()
    St.extra_materials(S)
    for fn in parts:
        fn(S)
    lights(S, q)
    S.build()
    return S


def bedroom_night(q, **kw):
    S = Hs.new_scene(); St.extra_materials(S)
    Hs.bedroom(S, people=kw.get('people', True), double_proxy=kw.get('double_proxy', False)); Hs.corridor(S); Hs.exterior(S)
    Hs.night_lights(S, q=q, vol=kw.get('vol', True))
    S.build()
    return S


NIGHT_LAYERS = dict(base=[0, 2, 3, 4, 5], lamp=[1, 6], vol=[5, 6])
EXT_NIGHT = dict(base=[0, 3, 4], lamp=[1, 2], vol=[])
DAY_LAYERS = dict(base=[0, 3, 4], vol=[])
ANCH_BED = {
    'headW': Hs.HEAD_W, 'headH': Hs.HEAD_H,
    'dbl_feet': Hs.DOUBLE_AT, 'dbl_head': (Hs.DOUBLE_AT[0], 1.68, Hs.DOUBLE_AT[2]),
    'door_tl': (4.0, 2.05, 2.45), 'door_tr': (4.0, 2.05, 3.35), 'door_bl': (4.0, 0.0, 2.45), 'door_br': (4.0, 0.0, 3.35),
    'win_c': (0.0, 1.6, 1.65), 'win_top': (0.0, 2.28, 1.65), 'sit_head': (1.5, 1.52, 2.74), 'sit_hips': (1.5, 0.66, 2.7),
}
ANCH_COR = {'kdoor_tl': (4.32, 2.05, -3.1), 'kdoor_tr': (5.18, 2.05, -3.1), 'kdoor_bl': (4.32, 0.0, -3.1), 'kdoor_br': (5.18, 0.0, -3.1),
            'bdoor_c': (4.08, 1.0, 2.9), 'fdoor_c': (4.75, 1.05, 4.3), 'wife_dawn': (4.75, 1.56, 3.65), 'wall_l': (5.34, 1.2, 1.0), 'wall_r': (4.16, 1.2, 1.0)}
ANCH_EXT = {'win_bed': (-0.25, 1.6, 1.65), 'win_liv': (7.3, 1.55, 4.55), 'fdoor': (4.75, 1.05, 4.55), 'fdoor_tl': (4.3, 2.1, 4.44), 'fdoor_br': (5.2, 0.0, 4.44),
            'gate': (4.75, -0.45, 7.58), 'lamp_side': Hs.LAMP, 'lamp_front': (8.25, 5.98, 8.9), 'car': (2.0, -0.62, 9.6), 'walk': (4.75, -0.45, 6.6), 'tree': (-2.6, 3.0, -2.6)}
ANCH_TABLE = {'wife': (7.5, 1.22, 1.08), 'husb': (8.18, 1.26, 1.08), 'mil': (7.05, 1.2, 2.78), 'lamp': St.LAMP_TABLE, 'table_c': (7.5, 0.76, 1.85)}

import town as Tn


def town_scene(q):
    S, mx = Tn.build_town(q)
    return S


VIEWS = {
    'aerial': dict(sky=True, scene=town_scene, pos=(-62.0, 58.0, 70.0), target=(4.0, 0.0, -2.0), fov=56, groups=5,
                   layers=dict(base=[0, 3, 4], lamp=[1, 2], vol=[]), exposure=1.6, fog=(0.006, (0.012, 0.018, 0.035)), anchors={'house': (4.75, 1.5, -0.8), 'win_bed': (-0.25, 1.6, 1.65), 'roof': (4.75, 4.4, -0.85)}),
    'bed_wide': dict(scene=bedroom_night, pos=(0.62, 2.55, 0.55), target=(2.55, 0.45, 2.85), fov=60, groups=7, layers=NIGHT_LAYERS, exposure=1.8, anchors=ANCH_BED),
    'bed_door': dict(scene=bedroom_night, pos=(1.42, 1.02, 3.08), target=(4.6, 1.12, 2.88), fov=44, groups=7, layers=NIGHT_LAYERS, exposure=1.8, anchors=ANCH_BED,
                     dof=[('near', 0.9, 12.0, 0.0), ('far', 3.1, 0.0, 14.0)], dof_split=1.6),
    # top-down over the wife's pillow (screen-up = headboard)
    'pillow_top': dict(scene=lambda q: bedroom_night(q, vol=False), pos=(1.56, 1.82, 3.08), target=(1.56, 0.7, 3.08), up=(0, 0, 1), fov=30, groups=7, layers=NIGHT_LAYERS, exposure=1.1, anchors=ANCH_BED),
    # from the foot of the bed: the wife sits up, husband asleep, dark doorway right
    'bed_sit': dict(scene=lambda q: bedroom_night(q, people='husband'), pos=(1.75, 1.28, 0.75), target=(1.75, 1.05, 3.0), fov=48, groups=7, layers=NIGHT_LAYERS, exposure=1.9, anchors=ANCH_BED),
    # the double's shadow proxy present (for the doorway shots)
    'bed_door_dbl': dict(scene=lambda q: bedroom_night(q, double_proxy=True), pos=(1.42, 1.02, 3.08), target=(4.6, 1.12, 2.88), fov=44, groups=7, layers=NIGHT_LAYERS, exposure=1.8, anchors=ANCH_BED,
                         dof=[('near', 0.9, 12.0, 0.0), ('far', 3.1, 0.0, 14.0)], dof_split=1.6),
    # corridor at night from the front-door end toward the kitchen door
    'corridor_n': dict(scene=lambda q: build([lambda S: Hs.bedroom(S), lambda S: Hs.corridor(S), St.kitchen, St.living, lambda S: St.ext_house(S), St.yard], St.lights_corridor_night, q),
                       pos=(4.75, 1.55, 4.05), target=(4.75, 1.15, -3.0), fov=50, groups=5, layers=dict(base=[0, 1, 2, 3, 4], vol=[]), exposure=2.4, anchors=ANCH_COR),
    # close on the kitchen door (leaf drawn live)
    'kitchen_n': dict(scene=lambda q: build([lambda S: Hs.bedroom(S), lambda S: Hs.corridor(S, kitchen_leaf=False), St.kitchen, St.living, lambda S: St.ext_house(S), St.yard], St.lights_corridor_night, q),
                      pos=(4.72, 1.4, -0.7), target=(4.75, 1.0, -3.1), fov=46, groups=5, layers=dict(base=[0, 1, 2, 3, 4], vol=[]), exposure=3.6, anchors=ANCH_COR),
    # corridor at dawn toward the open front door with suitcases (the wife stands there, drawn live)
    'corridor_dawn': dict(scene=lambda q: build([lambda S: Hs.bedroom(S, people='none'), lambda S: Hs.corridor(S, front_leaf=False), St.kitchen, St.living, lambda S: St.ext_house(S, front_door_open=True), St.yard, lambda S: St.suitcases(S, 'corridor')], lambda S, q: St.lights_corridor_day(S, 'dawn', q), q),
                          pos=(4.75, 1.55, 1.55), target=(4.75, 1.4, 4.4), fov=44, groups=5, layers=DAY_LAYERS, exposure=2.0, anchors=ANCH_COR),
    'corridor_dawn_back': dict(scene=lambda q: build([lambda S: Hs.bedroom(S, people='none'), lambda S: Hs.corridor(S, front_leaf=False), St.kitchen, St.living, lambda S: St.ext_house(S, front_door_open=True), St.yard, lambda S: St.suitcases(S, 'corridor')], lambda S, q: St.lights_corridor_day(S, 'dawn', q), q),
                               pos=(4.75, 1.6, 3.6), target=(4.75, 1.2, -3.0), fov=48, groups=5, layers=DAY_LAYERS, exposure=1.7, anchors=ANCH_COR),
    # dawn bedroom: open suitcase on the made bed
    'bed_dawn': dict(scene=lambda q: build([lambda S: Hs.bedroom(S, people='none', heads=False), lambda S: Hs.corridor(S), lambda S: Hs.exterior(S), lambda S: St.suitcases(S, 'bed')], lambda S, q: St.lights_bedroom_day(S, 'dawn', q), q),
                     pos=(2.95, 1.75, 0.85), target=(1.75, 0.62, 2.45), fov=50, groups=5, layers=DAY_LAYERS, exposure=1.7, anchors=ANCH_BED),
    # tired at the window by day: seen from outside through the glass (curtains open)
    'window_day': dict(scene=lambda q: build([lambda S: Hs.bedroom(S, people='none', heads=False, curtains='open'), lambda S: Hs.corridor(S), lambda S: St.ext_house(S), St.yard], lambda S, q: (St.lights_bedroom_day(S, 'day', q), St.lights_ext_day(S, 'overcast', q)), q),
                       pos=(-1.55, 1.3, 1.45), target=(0.6, 1.15, 1.68), fov=40, groups=5, layers=DAY_LAYERS, exposure=1.25, anchors=dict(ANCH_BED, sit_win=(0.62, 1.2, 1.66))),
    # exterior night: side street toward the bedroom window (push-in) and the window close
    'ext_side_n': dict(sky=True, scene=lambda q: build([lambda S: Hs.bedroom(S), lambda S: Hs.corridor(S), lambda S: St.ext_house(S), St.yard], St.lights_ext_night, q),
                       pos=(-8.3, 1.7, 8.6), target=(-1.6, 1.45, 0.9), fov=52, groups=5, layers=EXT_NIGHT, exposure=1.6, anchors=ANCH_EXT),
    'ext_win_n': dict(sky=True, scene=lambda q: build([lambda S: Hs.bedroom(S), lambda S: Hs.corridor(S), lambda S: St.ext_house(S), St.yard], St.lights_ext_night, q),
                      pos=(-2.6, 1.55, 2.6), target=(-0.25, 1.6, 1.65), fov=40, groups=5, layers=EXT_NIGHT, exposure=1.6, anchors=ANCH_EXT),
    # exterior dawn / overcast from across the front street
    'ext_front_dawn': dict(sky=True, scene=lambda q: build([lambda S: Hs.bedroom(S, people='none'), lambda S: Hs.corridor(S), St.living, lambda S: St.ext_house(S, living_lit=True), St.yard], lambda S, q: St.lights_ext_day(S, 'dawn', q), q),
                           pos=(1.6, 1.62, 10.9), target=(4.0, 1.15, 4.6), fov=54, groups=5, layers=DAY_LAYERS, exposure=1.6, anchors=ANCH_EXT),
    'ext_front_day': dict(sky=True, scene=lambda q: build([lambda S: Hs.bedroom(S, people='none'), lambda S: Hs.corridor(S), St.living, lambda S: St.ext_house(S), St.yard], lambda S, q: St.lights_ext_day(S, 'overcast', q), q),
                          pos=(5.5, 1.62, 10.6), target=(4.7, 1.0, 4.6), fov=52, groups=5, layers=DAY_LAYERS, exposure=1.15, anchors=ANCH_EXT),
    # through the open front door into the dark corridor (overcast)
    'frontdoor_in': dict(scene=lambda q: build([lambda S: Hs.bedroom(S, people='none'), lambda S: Hs.corridor(S, front_leaf=False), St.kitchen, St.living, lambda S: St.ext_house(S, front_door_open=True), St.yard], lambda S, q: (St.lights_corridor_day(S, 'overcast', q), St.lights_ext_day(S, 'overcast', q)), q),
                         pos=(4.75, 1.62, 6.1), target=(4.75, 1.15, 0.0), fov=46, groups=5, layers=DAY_LAYERS, exposure=1.15, anchors=ANCH_EXT),
    # the family table under the hanging lamp
    'table_n': dict(scene=lambda q: build([St.living, lambda S: St.ext_house(S)], St.lights_table, q),
                    pos=(7.45, 1.62, 3.95), target=(7.5, 0.95, 1.2), fov=52, groups=5, layers=dict(base=[0, 3, 4], vol=[]), exposure=0.8, anchors=ANCH_TABLE),
}


def run(name, scale=0.5, final=False):
    V = VIEWS[name]
    t0 = time.time()
    q = 2.0 if final else 1.0
    S = V['scene'](q)
    w, h = int(round(1080 * scale)), int(round(1920 * scale))
    f = (w / 2) / math.tan(math.radians(V['fov'] / 2))
    cam = camera(V['pos'], V['target'], f, w, h, V.get('roll', 0.0), V.get('up', (0.0, 1.0, 0.0)))
    OUT, DEP, AL = bake(S, cam, w, h, V['groups'], seed=11 if final else 1)
    print(name, f'{w}x{h}', 'baked in', round(time.time() - t0, 1), 's', flush=True)
    L = V['layers']
    for g in L.get('vol', []):
        for c in range(3):
            OUT[g, :, :, c] = gaussian_filter(OUT[g, :, :, c], 2.5 * scale)
    ex = V['exposure']
    if V.get('fog'):
        dens, fc = V['fog']
        tr = np.exp(-np.minimum(DEP, 2000) * dens)[..., None]
        for g in range(V['groups']):
            OUT[g] *= tr
        OUT[L['base'][0]] += (1 - tr) * np.asarray(fc) * AL[..., None]
    base_lin = sum(OUT[g] for g in L['base'])
    base = tonemap(base_lin, ex)
    if not final:
        full = tonemap(base_lin + sum(OUT[g] for g in L.get('lamp', [])), ex)
        Image.fromarray((full * 255 + 0.5).astype(np.uint8)).save(os.path.join(PREV_DIR, f'{name}.png'))
        return
    os.makedirs(OUT_DIR, exist_ok=True)

    def save(img, fn):
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT_DIR, fn), quality=93)

    if V.get('sky'):
        a = np.clip(AL, 0, 1)
        rgb = np.where(a[..., None] > 1e-3, base / np.maximum(a[..., None], 1e-3) * 1.0, 0)
        rgba = np.dstack([np.clip(rgb, 0, 1), a])
        Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(OUT_DIR, f'{name}.png'))
    else:
        save(base, f'{name}.jpg')
    lamp_lin = sum(OUT[g] for g in L.get('lamp', [])) if L.get('lamp') else None
    if lamp_lin is not None:
        save(tonemap(base_lin + lamp_lin, ex) - base, f'{name}_lamp.jpg')
    # depth of field variants: (tag, focus distance m, background blur px@1x, foreground blur px@1x)
    for tag, fd, bgb, fgb in V.get('dof', []):
        split = V['dof_split']
        fg = (DEP < split).astype(np.float64)
        def blur_layer(img, m, sig):
            if sig <= 0:
                return img * m[..., None], m
            pm = np.stack([gaussian_filter(img[..., c] * m, sig) for c in range(3)], -1)
            return pm, gaussian_filter(m, sig)
        for lay, lname in [(base, ''), ((tonemap(base_lin + lamp_lin, ex) - base) if lamp_lin is not None else None, '_lamp')]:
            if lay is None:
                continue
            bpm, ba = blur_layer(lay, 1 - fg, bgb * scale)
            fpm, fa = blur_layer(lay, fg, fgb * scale)
            bcol = bpm / np.maximum(ba, 1e-4)[..., None]
            out = fpm + bcol * (1 - fa)[..., None]
            save(out, f'{name}_{tag}{lname}.jpg')
    # anchors
    ap = os.path.join(OUT_DIR, 'anchors.json')
    A = json.load(open(ap)) if os.path.exists(ap) else {}
    A[name] = {'w': w, 'h': h, 'f': f, 'pts': {k: project(cam, p) for k, p in V.get('anchors', {}).items()}}
    json.dump(A, open(ap, 'w'), indent=1)
    open(os.path.join(OUT_DIR, 'anchors.js'), 'w').write('// generated by bake/bake_view.py\nwindow.ANCHORS = ' + json.dumps(A) + ';\n')
    print(name, 'exported in', round(time.time() - t0, 1), 's')


if __name__ == '__main__':
    run(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 0.5, '--final' in sys.argv)
