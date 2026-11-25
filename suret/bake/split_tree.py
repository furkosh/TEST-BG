"""ext_side_n split into the set without the mulberry tree (lmask 1) and the tree alone (lmask 2) for live sway."""
import math, os, numpy as np
from PIL import Image
from rt import *
import bake_view as B
V = B.VIEWS['ext_side_n']; sc = 1.5
w, h = int(round(1080 * sc)), int(round(1920 * sc))
f = (w / 2) / math.tan(math.radians(V['fov'] / 2))
cam = camera(V['pos'], V['target'], f, w, h)
S = V['scene'](2.0)
L = V['layers']; ex = V['exposure']
for mask, fn in [(1, 'ext_side_n.png'), (2, 'ext_side_n_tree.png')]:
    OUT, DEP, AL = bake(S, cam, w, h, V['groups'], lmask=mask, seed=11)
    base = B.tonemap(sum(OUT[g] for g in L['base']) + (sum(OUT[g] for g in L['lamp']) if mask == 2 else 0), ex)
    a = np.clip(AL, 0, 1)
    rgb = np.where(a[..., None] > 1e-3, base / np.maximum(a[..., None], 1e-3), 0)
    Image.fromarray((np.dstack([np.clip(rgb, 0, 1), a]) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(B.OUT_DIR, fn))
    print('saved', fn)
