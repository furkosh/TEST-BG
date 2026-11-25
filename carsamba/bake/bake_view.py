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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'render', 'bg')
PREV_DIR = '/tmp/claude-0/-home-user-TEST-BG/6153618c-d421-5e64-a986-ffee99bbbbd7/scratchpad/cb'


def tonemap(x, exposure=1.0):
    x = np.maximum(x * exposure, 0)
    y = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
    y = np.clip(y, 0, 1)
    return np.where(y <= 0.0031308, y * 12.92, 1.055 * np.power(np.maximum(y, 1e-8), 1 / 2.4) - 0.055)


import village as Vg
import numpy as np


def street_scene(lights, lit=0.15):
    def f(q):
        S = Vg.new_scene(); Vg.street(S, np.random.default_rng(3), lit_windows=lit); lights(S, q); S.build(); return S
    return f


def wide_scene(q):
    S = Vg.new_scene(); Vg.village_wide(S, np.random.default_rng(9)); Vg.lights_wide_sunset(S, q); S.build(); return S


def room_scene(q):
    S = Vg.new_scene(); Vg.room(S); Vg.lights_room(S, q); S.build(); return S


NIGHT = dict(base=[0, 3, 4], lamp=[1], vol=[])
ROOML = dict(base=[1, 3, 4], lamp=[0], vol=[])
DAY = dict(base=[0, 1, 3, 4], vol=[])
VIEWS = {
    'street_run': dict(sky=True, scene=street_scene(Vg.lights_street_night), pos=(0.3, 1.5, 4.0), target=(0.0, 1.45, -20.0), fov=50, groups=5, layers=NIGHT, exposure=2.0),
    'door_pov': dict(sky=True, scene=street_scene(Vg.lights_street_night), pos=(1.9, 1.5, -6.0), target=(-2.1, 1.35, -3.6), fov=52, groups=5, layers=NIGHT, exposure=2.0),
    'creature_low': dict(sky=True, scene=street_scene(Vg.lights_street_night), pos=(0.55, 0.32, 2.6), target=(0.0, 1.5, -4.0), fov=52, groups=5, layers=NIGHT, exposure=2.0),
    'dusk_street': dict(sky=True, scene=street_scene(Vg.lights_street_dusk, 0.4), pos=(0.0, 1.7, 6.0), target=(0.0, 2.2, -25.0), fov=50, groups=5, layers=dict(base=[0, 3, 4], lamp=[1], vol=[]), exposure=1.0),
    'village_sunset': dict(sky=True, scene=wide_scene, pos=(-34.0, 15.0, 44.0), target=(8.0, 1.0, -14.0), fov=56, groups=5, layers=DAY, exposure=1.1),
    'room_spin': dict(scene=room_scene, pos=(52.25, 1.05, 0.85), target=(52.55, 1.0, 3.6), fov=48, groups=5, layers=ROOML, exposure=1.6),
    'room_door': dict(scene=room_scene, pos=(53.55, 1.2, 0.95), target=(54.5, 1.05, 1.78), fov=46, groups=5, layers=ROOML, exposure=1.6),
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
