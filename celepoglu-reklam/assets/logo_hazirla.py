#!/usr/bin/env python3
"""Firma logosunu (assets/logo_orijinal.png) videoda kullanılacak iki sürüme hazırlar:
  logo_koyu_zemin.png  : orijinal renkler, şeffaf zemindeki gürültü temizlenmiş (koyu zeminler / final ekranı)
  logo_acik_zemin.png  : beyaz araç üzerinde okunabilmesi için 'CELEPOĞLU' harfleri koyu grafit (pozitif sürüm)
"""
import os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
a = np.array(Image.open(os.path.join(D, 'logo_orijinal.png')).convert('RGBA')).astype(float)
rgb, A = a[..., :3], a[..., 3]
# şeffaf zemindeki düşük opaklıklı gürültüyü temizle
A = np.where(A < 28, 0, A)
A = np.clip((A - 28) / (250 - 28), 0, 1) * 255
clean = np.dstack([rgb, A]).clip(0, 255).astype(np.uint8)
Image.fromarray(clean, 'RGBA').save(os.path.join(D, 'logo_koyu_zemin.png'))
# pozitif sürüm: yalnızca üst satırdaki açık gri harfler
mx, mn = rgb.max(-1), rgb.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
L = rgb.mean(-1)
yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
region = (yy >= 150) & (yy <= 392) & (xx >= 330)
m = region & (sat < 0.18) & (L > 90)
w = np.clip((L - 90) / 110, 0, 1)[..., None] * m[..., None]
dark = np.array([38, 41, 46], float) + (L[..., None] - 215) * 0.25
pos = rgb * (1 - w) + dark * w
pos_img = np.dstack([pos, A]).clip(0, 255).astype(np.uint8)
Image.fromarray(pos_img, 'RGBA').save(os.path.join(D, 'logo_acik_zemin.png'))
print('ok')
