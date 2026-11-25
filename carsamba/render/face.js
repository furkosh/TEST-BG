// Faces of ÇARŞAMBA KARISI (renderer shared with KAPIDAKİ SURET), lit per pixel.
// Geometry: the MediaPipe canonical face mesh (Apache-2.0, Loop-subdivided; facemesh.js) deformed per identity
// (wife / husband / the double) and expression (smile, open mouth), rasterised into a height + normal map and joined to
// an analytic skull, neck and ears. Albedo is painted from anatomical landmarks (lips, nostrils, lids, stubble, mole).
// Hair: coverage shapes + a flow field + line-integral-convolution strands, anisotropic sheen.
// Shading: wrapped key light with a warm terminator, soft cast shadows marched through the height map, ambient
// occlusion, fill and rim; layers cached per identity / rig / expression. Eyes, brows, tears, open mouth drawn live.
'use strict';
const FACECACHE = new Map();
const FS = 19.05;                         // face units per cm (eyes end up at x = +-60, y = -56)

const IDS = {
  wife: { fem: 1, k: 2.6, skin: [212, 170, 144], lip: [164, 92, 92], hairCol: [58, 41, 32], hair: 'down', browCol: [38, 27, 21], iris: [82, 52, 33], neckW: 50, mole: true },
  husband: { fem: 0, k: 2.6, skin: [194, 150, 122], lip: [146, 96, 90], hairCol: [24, 21, 20], hair: 'short', browCol: [22, 19, 18], iris: [64, 43, 29], neckW: 62, beard: 1 },
};
IDS.double = Object.assign({}, IDS.husband, { skin: [184, 152, 136], lip: [128, 92, 92], pale: 1 });
IDS.mil = Object.assign({}, IDS.wife, { skin: [196, 156, 132], hairCol: [52, 56, 80], hair: 'scarf', mole: false, tiredBase: 1 });
// the young village woman: sun-tanned skin, chestnut hair loose to the waist
IDS.kiz = { fem: 1, k: 2.6, skin: [208, 160, 128], lip: [158, 84, 82], hairCol: [74, 44, 27], hair: 'down', browCol: [44, 29, 19], iris: [74, 48, 28], neckW: 47 };
// Çarşamba Karısı: ashen skin, long tangled grey-black hair hanging over the face
IDS.carsamba = { fem: 1, k: 2.6, skin: [146, 142, 136], lip: [96, 82, 84], hairCol: [36, 34, 33], hair: 'wild', browCol: [30, 28, 27], iris: [196, 198, 186], neckW: 44, pale: 1 };

// light rigs in face space: x right, y down, z toward the viewer
const RIGS = {
  moonL:   { key: { dir: [-0.74, 0.37, 0.56], col: [0.66, 0.8, 1.04], wrap: 0.25, spec: 0.25 }, fill: { dir: [0.5, -0.2, 0.8], col: [0.07, 0.085, 0.12] }, amb: [0.03, 0.036, 0.05], rim: null },
  lampF:   { key: { dir: [0.33, -0.15, 0.93], col: [1.2, 0.76, 0.42], wrap: 0.2, spec: 0.3 }, fill: { dir: [-0.3, -0.2, 0.9], col: [0.04, 0.05, 0.07] }, amb: [0.016, 0.018, 0.026], rim: { dir: [-0.92, -0.2, -0.3], col: [0.3, 0.36, 0.46] } },
  moonSide:{ key: { dir: [0.56, 0.41, 0.74], col: [0.56, 0.68, 0.92], wrap: 0.28, spec: 0.2 }, fill: { dir: [0.5, 0.25, 0.8], col: [0.1, 0.075, 0.055] }, amb: [0.026, 0.03, 0.042], rim: null },
  moonSit: { key: { dir: [-0.78, -0.25, 0.58], col: [0.62, 0.76, 1.0], wrap: 0.25, spec: 0.25 }, fill: { dir: [0.6, 0.1, 0.8], col: [0.05, 0.05, 0.065] }, amb: [0.024, 0.028, 0.04], rim: { dir: [0.9, -0.3, -0.3], col: [0.22, 0.15, 0.09] } },
  dayR:    { key: { dir: [0.72, -0.32, 0.62], col: [0.98, 1.0, 1.04], wrap: 0.45, spec: 0.14 }, fill: { dir: [-0.5, -0.2, 0.85], col: [0.24, 0.24, 0.26] }, amb: [0.09, 0.095, 0.105], rim: null },
  dawnBack: { key: { dir: [0.2, -0.3, 0.9], col: [0.28, 0.31, 0.4], wrap: 0.5, spec: 0.1 }, fill: { dir: [-0.4, 0.2, 0.8], col: [0.06, 0.065, 0.08] }, amb: [0.03, 0.033, 0.04], rim: { dir: [0.1, -0.5, -0.86], col: [0.95, 1.0, 1.15] } },
  overBack: { key: { dir: [0.15, -0.3, 0.9], col: [0.42, 0.43, 0.45], wrap: 0.5, spec: 0.1 }, fill: { dir: [-0.4, 0.2, 0.8], col: [0.08, 0.08, 0.085] }, amb: [0.04, 0.04, 0.045], rim: { dir: [0.1, -0.5, -0.86], col: [1.0, 1.02, 1.05] } },
  backDay: { key: { dir: [0.2, -0.5, 0.84], col: [0.75, 0.77, 0.8], wrap: 0.5, spec: 0.08 }, fill: { dir: [-0.5, 0.0, 0.85], col: [0.16, 0.16, 0.17] }, amb: [0.08, 0.08, 0.085], rim: null },
  lampBack: { key: { dir: [0.0, -0.5, -0.86], col: [1.1, 0.82, 0.55], wrap: 0.3, spec: 0.1 }, fill: { dir: [0.2, 0.0, 0.95], col: [0.03, 0.03, 0.04] }, amb: [0.012, 0.012, 0.016], rim: null },
  dayF:    { key: { dir: [0.18, -0.4, 0.9], col: [0.88, 0.9, 0.96], wrap: 0.5, spec: 0.12 }, fill: { dir: [-0.6, 0.2, 0.7], col: [0.13, 0.13, 0.14] }, amb: [0.07, 0.075, 0.085], rim: null },
  lampTop: { key: { dir: [0.05, -0.55, 0.83], col: [1.05, 0.86, 0.66], wrap: 0.35, spec: 0.16 }, fill: { dir: [-0.4, 0.3, 0.85], col: [0.07, 0.065, 0.07] }, amb: [0.028, 0.026, 0.03], rim: null },
  // village night: lantern warm from the upper right, moon cold rim from behind-left
  lantern: { key: { dir: [0.55, -0.42, 0.72], col: [1.25, 0.78, 0.4], wrap: 0.22, spec: 0.3 }, fill: { dir: [-0.5, -0.3, 0.8], col: [0.05, 0.065, 0.1] }, amb: [0.016, 0.02, 0.03], rim: { dir: [-0.85, -0.35, -0.4], col: [0.42, 0.52, 0.72] } },
  // moonlight from the upper left, faint warm bounce
  moonV: { key: { dir: [-0.6, -0.5, 0.62], col: [0.6, 0.74, 1.0], wrap: 0.25, spec: 0.22 }, fill: { dir: [0.6, 0.2, 0.75], col: [0.08, 0.06, 0.045] }, amb: [0.024, 0.03, 0.045], rim: { dir: [0.9, -0.3, -0.3], col: [0.5, 0.36, 0.2] } },
  // oil lamp low on her right, moonlit window behind
  oilR: { key: { dir: [0.62, 0.22, 0.75], col: [1.3, 0.74, 0.36], wrap: 0.3, spec: 0.26 }, fill: { dir: [-0.6, -0.3, 0.7], col: [0.045, 0.06, 0.1] }, amb: [0.018, 0.017, 0.022], rim: { dir: [-0.6, -0.5, -0.6], col: [0.3, 0.38, 0.55] } },
  oilF: { key: { dir: [-0.34, 0.06, 0.94], col: [1.2, 0.72, 0.38], wrap: 0.3, spec: 0.24 }, fill: { dir: [0.6, -0.3, 0.7], col: [0.05, 0.065, 0.1] }, amb: [0.02, 0.019, 0.024], rim: { dir: [0.6, -0.5, -0.6], col: [0.3, 0.38, 0.55] } },
  oilL: { key: { dir: [-0.62, 0.22, 0.75], col: [1.3, 0.74, 0.36], wrap: 0.3, spec: 0.26 }, fill: { dir: [0.6, -0.3, 0.7], col: [0.045, 0.06, 0.1] }, amb: [0.018, 0.017, 0.022], rim: { dir: [0.6, -0.5, -0.6], col: [0.3, 0.38, 0.55] } },
  // the creature: hard cold top light, the face sinks into shadow under the hair
  moonTop: { key: { dir: [0.12, -0.86, 0.48], col: [0.62, 0.72, 0.96], wrap: 0.15, spec: 0.12 }, fill: { dir: [0.0, 0.3, 0.95], col: [0.02, 0.024, 0.032] }, amb: [0.012, 0.014, 0.02], rim: { dir: [0.2, -0.4, -0.9], col: [0.5, 0.6, 0.82] } },
};

// MediaPipe landmark index lists
const LM = {
  eyeR_up: [33, 246, 161, 160, 159, 158, 157, 173, 133], eyeR_lo: [33, 7, 163, 144, 145, 153, 154, 155, 133],
  eyeL_up: [263, 466, 388, 387, 386, 385, 384, 398, 362], eyeL_lo: [263, 249, 390, 373, 374, 380, 381, 382, 362],
  browR_up: [70, 63, 105, 66, 107], browR_lo: [46, 53, 52, 65, 55], browL_up: [300, 293, 334, 296, 336], browL_lo: [276, 283, 282, 295, 285],
  lipOU: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], lipOL: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  lipIU: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308], lipIL: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
  jaw: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454],
};
const Gs = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2) * 0.5);
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- mesh
let MESH0 = null;
function meshBase() {
  if (MESH0) return MESH0;
  const M = window.FACEMESH, n = M.v.length / 3, V = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    V[i * 3] = M.v[i * 3] * FS; V[i * 3 + 1] = -(M.v[i * 3 + 1] - 2.62) * FS - 56; V[i * 3 + 2] = (M.v[i * 3 + 2] + 3.0) * FS;
  }
  MESH0 = { V, F: M.f, n };
  return MESH0;
}
// identity + expression deformation; returns a new vertex array
function meshDeform(I, ex) {
  const B = meshBase(), V = new Float32Array(B.V), n = B.n, f = I.fem;
  const s = ex.smile || 0, mo = ex.mouth || 0;
  const ym = (B.V[13 * 3 + 1] + B.V[14 * 3 + 1]) / 2;        // mouth line
  for (let i = 0; i < n; i++) {
    let X = V[i * 3], Y = V[i * 3 + 1], Z = V[i * 3 + 2];
    const aX = Math.abs(X);
    // close the canonical mouth (lips meet on the mouth line)
    const dyM = Y - ym, near = Math.exp(-(dyM * dyM) / (2 * 7 * 7)) * (1 - sst(40, 54, aX));
    Y -= Math.sign(dyM) * Math.min(Math.abs(dyM), 4.4) * near;
    if (f) {
      if (Y > 20) X *= 1 - 0.065 * sst(20, 170, Y);
      if (Y > 80) Y = 80 + (Y - 80) * 0.96;
      const wn = Gs(X, Y, 0, 0, 22, 55); X *= 1 - 0.1 * wn; Z -= 9 * Gs(X, Y, 0, 8, 16, 30);
      Z += 3.5 * Gs(X, Y, 0, 77, 40, 11);
      Z -= 3 * Gs(aX, Y, 55, -100, 50, 14);
      Z += 4 * Gs(aX, Y, 72, 22, 34, 30);
    } else {
      if (Y > 20) X *= 1 + 0.025 * sst(20, 140, Y);
      if (Y > 120) Y += 5 * sst(120, 170, Y);
      Z -= 4 * Gs(aX, Y, 80, 40, 34, 34);
      const wn = Gs(X, Y, 0, 0, 24, 55); X *= 1 + 0.07 * wn; Z += 6 * Gs(X, Y, 0, 10, 18, 30);
      Z += 6 * Gs(aX, Y, 52, -98, 50, 14);
      Z -= 3 * Gs(aX, Y, 86, 46, 30, 30);
      Z -= 1.5 * Gs(X, Y, 0, 77, 40, 12);
    }
    // smile: corners up and out, cheeks lift
    if (s > 0) {
      const wc = Gs(aX, Y, 47, ym, 17, 13);
      Y -= 14 * s * wc; X += Math.sign(X) * 8 * s * wc;
      const wu = sst(0, 47, aX) * Math.exp(-((Y - ym) ** 2) / (2 * 9 * 9)) * (1 - sst(48, 60, aX));
      Y -= 3 * s * wu * wu;
      const wk = Gs(aX, Y, 70, 34, 26, 24); Z += 5 * s * wk; Y -= 3 * s * wk;
    }
    // open mouth: lower lip, chin and jaw drop
    if (mo > 0 && Y > ym - 1) {
      const w = sst(ym - 1, ym + 6, Y) * Math.exp(-(X * X) / (2 * 95 * 95));
      Y += mo * 22 * w; Z -= mo * 4 * w;
    }
    V[i * 3] = X; V[i * 3 + 1] = Y; V[i * 3 + 2] = Z;
  }
  return V;
}
function lmPts(V, idx) { return idx.map((i) => [V[i * 3], V[i * 3 + 1]]); }

// ---------------------------------------------------------------- bake helpers
function pushPull(H, M, w, h) {
  // fill holes of a masked field smoothly (pyramid push-pull)
  const levels = [{ H: Float32Array.from(H, (v, i) => v * M[i]), M: Float32Array.from(M), w, h }];
  while (levels[levels.length - 1].w > 8 && levels[levels.length - 1].h > 8) {
    const L = levels[levels.length - 1], w2 = Math.ceil(L.w / 2), h2 = Math.ceil(L.h / 2);
    const H2 = new Float32Array(w2 * h2), M2 = new Float32Array(w2 * h2);
    for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) { const q = (j >> 1) * w2 + (i >> 1); H2[q] += L.H[j * L.w + i]; M2[q] += L.M[j * L.w + i]; }
    for (let q = 0; q < w2 * h2; q++) { if (M2[q] > 0) { H2[q] /= M2[q]; M2[q] = Math.min(1, M2[q]); H2[q] *= M2[q]; } }
    levels.push({ H: H2, M: M2, w: w2, h: h2 });
  }
  // normalise the coarsest level
  { const L = levels[levels.length - 1]; for (let q = 0; q < L.w * L.h; q++) if (L.M[q] > 0) { L.H[q] /= L.M[q]; L.M[q] = 1; } }
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], U = levels[l + 1];
    for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
      const q = j * L.w + i, m = L.M[q];
      const u = (i + 0.5) / 2 - 0.5, v = (j + 0.5) / 2 - 0.5, i0 = clamp(Math.floor(u), 0, U.w - 1), j0 = clamp(Math.floor(v), 0, U.h - 1);
      const i1 = Math.min(U.w - 1, i0 + 1), j1 = Math.min(U.h - 1, j0 + 1), fu = clamp(u - i0), fv = clamp(v - j0);
      const up = (U.H[j0 * U.w + i0] * (1 - fu) + U.H[j0 * U.w + i1] * fu) * (1 - fv) + (U.H[j1 * U.w + i0] * (1 - fu) + U.H[j1 * U.w + i1] * fu) * fv;
      L.H[q] = L.H[q] + up * (1 - m);           // L.H is premultiplied by m
      L.M[q] = 1;
    }
  }
  return levels[0].H;
}
function paintMask(w, h, k, X0, Y0, fn, blur = 0) {
  const c = makeCanvas(w, h), x = c.getContext('2d');
  if (blur) x.filter = `blur(${blur}px)`;
  x.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
  fn(x);
  return x.getImageData(0, 0, w, h).data;
}
function pathPts(x, pts, close = true) { x.beginPath(); spline(x, pts, close, 0.5, true); }

// hair styles: coverage outline (outer shape minus face opening) in face units
function hairShapes(style) {
  if (style === 'short') return {
    outer: [[0, -262], [-70, -255], [-128, -222], [-158, -160], [-164, -90], [-156, -36], [-144, -30], [-136, -92], [-124, -128], [-100, -150], [-56, -160], [0, -164], [56, -160], [100, -150], [124, -128], [136, -92], [144, -30], [156, -36], [164, -90], [158, -160], [128, -222], [70, -255]],
    thick: 14, part: [0, -230],
  };
  if (style === 'pillow') return {
    outer: [[0, -415], [-60, -402], [-128, -410], [-176, -372], [-238, -352], [-252, -290], [-272, -236], [-248, -170], [-262, -112], [-214, -64], [-170, -20], [-150, -6], [-138, -96], [-122, -130], [-98, -150], [-52, -160], [0, -163], [52, -160], [98, -150], [122, -130], [138, -96], [150, -6], [170, -20], [214, -64], [262, -112], [248, -170], [272, -236], [252, -290], [238, -352], [176, -372], [128, -410], [60, -402]],
    thick: 9, part: [0, -236],
  };
  if (style === 'back_tied') return {
    outer: [[0, -270], [-90, -260], [-150, -210], [-168, -120], [-160, -20], [-120, 60], [-70, 118], [0, 132], [70, 118], [120, 60], [160, -20], [168, -120], [150, -210], [90, -260]],
    thick: 12, part: [0, -240],
  };
  if (style === 'back_down') return {
    outer: [[0, -272], [-92, -262], [-152, -212], [-168, -120], [-164, -10], [-160, 120], [-158, 300], [-148, 520], [-120, 690], [-50, 718], [0, 705], [50, 718], [120, 690], [148, 520], [158, 300], [160, 120], [164, -10], [168, -120], [152, -212], [92, -262]],
    thick: 14, part: [0, -240],
  };
  if (style === 'scarf') return {
    outer: [[0, -282], [-100, -268], [-168, -210], [-186, -100], [-188, 40], [-205, 160], [-260, 250], [-330, 330], [-300, 420], [0, 440], [300, 420], [330, 330], [260, 250], [205, 160], [188, 40], [186, -100], [168, -210], [100, -268]],
    thick: 10, part: [0, -250],
  };
  if (style === 'wild') {
    // tangled hair over the whole face down to the waist, with a gap at one eye and at the mouth
    const pts = [], r = mulberry32(77);
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (1 + i / 16); pts.push([Math.cos(a) * 184 + (r() - 0.5) * 10, -104 + Math.sin(a) * 182 + (r() - 0.5) * 10]); }
    const sideX = (y) => 204 - Math.max(0, y - 60) * 0.06 + Math.sin(y * 0.02) * 10;
    for (let y = -40; y <= 880; y += 46) pts.push([sideX(y) + (r() - 0.5) * 30, y]);
    for (let x = 160; x >= -160; x -= 13) pts.push([x, 930 - Math.abs(x) * 0.6 + (r() - 0.5) * 80 + (r() < 0.4 ? 170 * r() : 0)]);
    for (let y = 880; y >= -40; y -= 46) pts.push([-sideX(y) + (r() - 0.5) * 30, y]);
    return { outer: pts, thick: 20, part: [-30, -250],
      holes: [[[-82, -96], [-62, -104], [-42, -70], [-44, -10], [-56, 40], [-70, 8], [-80, -40]], [[16, 46], [30, 40], [38, 92], [30, 128], [20, 96]]] };
  }
  if (style === 'tied') return {
    outer: [[0, -264], [-74, -256], [-132, -222], [-160, -160], [-166, -100], [-150, -70], [-136, -100], [-120, -130], [-94, -152], [-50, -162], [0, -165], [50, -162], [94, -152], [120, -130], [136, -100], [150, -70], [166, -100], [160, -160], [132, -222], [74, -256]],
    thick: 12, part: [0, -240],
  };
  // 'down': long hair with a middle part, curtains framing the face, falling past the shoulders
  return {
    outer: [[0, -266], [-82, -258], [-150, -214], [-182, -140], [-190, -40], [-192, 80], [-200, 200], [-214, 330], [-120, 336], [-92, 300], [-82, 220], [-96, 150], [-114, 80], [-124, 0], [-130, -80], [-126, -112], [-104, -140], [-62, -164], [-22, -184], [0, -196],
            [22, -184], [62, -164], [104, -140], [126, -112], [130, -80], [124, 0], [114, 80], [96, 150], [82, 220], [92, 300], [120, 336], [214, 330], [200, 200], [192, 80], [190, -40], [182, -140], [150, -214], [82, -258]],
    thick: 16, part: [0, -238],
  };
}
// strand flow direction at (x,y) for a style (unit vector, screen space)
function hairFlow(style, x, y) {
  let tx, ty;
  if (style === 'short') {
    tx = x * 0.012; ty = -1; const side = sst(110, 150, Math.abs(x));
    tx = lerp(tx, Math.sign(x) * 0.25, side); ty = lerp(ty, 1, side);
  } else if (style === 'pillow') {
    tx = x; ty = y + 236; const w = Math.sin(Math.hypot(x, y + 236) * 0.035) * 0.35; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const t2 = tx; tx += -ty * w; ty += t2 * w;
  } else if (style === 'back_tied') {
    tx = -x * 0.6; ty = 60 - y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  } else if (style === 'back_down') {
    tx = x * 0.012 + Math.sin(y * 0.02) * 0.08; ty = 1;
  } else if (style === 'scarf') {
    tx = x * 0.3; ty = 1;
  } else if (style === 'wild') {
    if (y < -150) { tx = x + 30; ty = y + 250; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; }
    else { tx = Math.sin(y * 0.021 + x * 0.035) * 0.42 + Math.sin(y * 0.052 + x * 0.011) * 0.16 + x * 0.0012; ty = 1; }
  } else if (style === 'tied') {
    tx = x; ty = y + 300; const l = Math.hypot(tx, ty) || 1; tx = -tx / l; ty = -ty / l;
  } else {
    tx = x; ty = y + 238; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const v = sst(-150, -60, y); tx = lerp(tx, Math.sign(x) * 0.12 + Math.sin(y * 0.028 + x * 0.01) * 0.12, v); ty = lerp(ty, 1, v);
  }
  const l = Math.hypot(tx, ty) || 1; return [tx / l, ty / l];
}


// ---------------------------------------------------------------- bodies (analytic sweeps, same light rig)
// proportions from the crown (y = -262): shoulders ~330, chest ~560, navel ~1070, crotch ~1450, knees ~2214, ankles ~3015
function bodyGeom(I) {
  const f = I.fem, Ws = f ? 258 : 330, xl = f ? 128 : 140;
  return {
    f, Ws,
    tw: f ? [[195, 52], [225, 120], [255, 215], [295, 270], [345, 282], [470, 268], [640, 250], [820, 222], [1000, 214], [1150, 252], [1300, 290], [1450, 300], [1530, 296]]
          : [[195, 64], [225, 140], [255, 248], [295, 316], [345, 328], [470, 322], [640, 305], [820, 286], [1000, 274], [1150, 274], [1300, 286], [1450, 292], [1530, 288]],
    td: [[195, 58], [240, 100], [300, 128], [460, 140], [700, 136], [1000, 128], [1300, 138], [1530, 128]],
    arm: (sd) => [[sd * (Ws - 8), 350], [sd * (Ws + 14), 620], [sd * (Ws + 20), 1060], [sd * (Ws + 6), 1430], [sd * Ws, 1620]],
    armR: f ? [[0, 48], [0.25, 40], [0.48, 35], [0.78, 28], [0.86, 27], [0.93, 31], [1, 24]] : [[0, 64], [0.25, 56], [0.48, 50], [0.78, 40], [0.86, 38], [0.93, 42], [1, 32]],
    leg: (sd) => [[sd * xl, 1450], [sd * (xl - 8), 1820], [sd * (xl - 24), 2214], [sd * (xl - 34), 2700], [sd * (xl - 40), 3040]],
    legR: [[0, 118], [0.3, 98], [0.5, 77], [0.72, 70], [1, 50]],
    xl,
  };
}
function outfitAt(outfit, part, x, y, u, G, sk) {
  // [r,g,b, isCloth, foldScale, inset]
  const ax = Math.abs(x), S = [sk[0], sk[1], sk[2], 0, 0, 0];
  if (part === 'foot') return S;
  if (outfit === 'tshirt') {
    if (part === 'arm') return u < 0.33 ? [62, 64, 70, 1, 1, 4] : S;
    if (part === 'leg' || y > 1180) { const n = vnoise(x * 0.05, y * 0.05, 9) - 0.5; return [52 + n * 8, 52 + n * 8, 57 + n * 8, 1, 1.4, 6]; }
    if (y < 238 - 30 * Math.min(1, (ax / 82) ** 2)) return S;
    const n = vnoise(x * 0.06, y * 0.06, 7) - 0.5; return [62 + n * 8, 64 + n * 8, 70 + n * 8, 1, 1, 3];
  }
  if (outfit === 'nightgown') {
    if (part === 'arm') return u < 0.86 ? gownPrint(x, y) : S;
    if (ax < 180 && y < 300 - 95 * Math.min(1, (ax / 170) ** 2)) return S;
    return gownPrint(x, y);
  }
  if (outfit === 'entari') {
    // printed madder-red dress (basma) under a dark wool vest with a gold-brown trim
    if (part === 'leg') return S;
    if (part === 'arm') return u < 0.9 ? basma(x, y) : S;
    if (part === 'skirt') return basma(x, y);
    if (ax < 74 && y < 268 - 26 * Math.min(1, (ax / 74) ** 2)) return S;
    const ve = 78 + Math.max(0, y - 280) * 0.06;
    if (y < 1120 && ax > ve) {
      const n = vnoise(x * 0.25, y * 0.25, 4) - 0.5;
      if (ax < ve + 11) return [150, 108, 56, 1, 0.6, 6];
      return [40 + n * 8, 32 + n * 6, 38 + n * 8, 1, 0.8, 6];
    }
    return basma(x, y);
  }
  if (outfit === 'rags') {
    // old undyed linen gone grey-brown: stains, frayed tears
    if (part === 'leg' || (part === 'arm' && u > 0.56)) return S;
    if (part !== 'skirt' && part !== 'arm' && ax < 96 && y < 300 - 40 * Math.min(1, (ax / 96) ** 2)) return S;
    const n = vnoise(x * 0.006, y * 0.005, 21), d = vnoise(x * 0.02, y * 0.012, 22), m = sst(0.45, 0.9, n) * 0.3 + sst(0.5, 0.9, d) * 0.18 + sst(2000, 2900, y) * 0.25;
    return [124 - m * 60, 118 - m * 62, 104 - m * 58, 1, 1.6, 4];
  }
  if (outfit === 'cardigan_back') { if (part === 'arm') return u < 0.86 ? knit(x, y, 1) : S; if (y < 240 && ax < 90) return S; return knit(x, y, 1); }
  if (outfit === 'mcard') { const k = knit(x, y, 1); return part === 'arm' && u > 0.86 ? S : [k[0] * 0.5 + 20, k[1] * 1.3 + 20, k[2] * 0.6 + 10, 1, 1.2, 5]; }
  if (outfit === 'cardigan') {
    if (part === 'arm') return u < 0.86 ? knit(x, y, 1) : S;
    const vopen = Math.max(0, 58 - (y - 250) * 0.17);
    if (ax < vopen) {
      if (y < 272 - 24 * Math.min(1, (ax / 72) ** 2)) return S;
      return [150, 138, 122, 1, 0.5, -6];
    }
    const k = knit(x, y, 1);
    if (ax < vopen + 14 && y > 300 && y < 1250 && ((y - 300) % 170) < 22) { k[0] *= 0.55; k[1] *= 0.55; k[2] *= 0.6; k[5] = 7; }
    return k;
  }
  return S;
}
function basma(x, y) {
  const gx = Math.floor(x / 30), gy = Math.floor(y / 30), jx = hash2(gx, gy, 7) * 16 + 7, jy = hash2(gx, gy, 8) * 16 + 7;
  const d = Math.hypot(x - gx * 30 - jx, y - gy * 30 - jy), n = vnoise(x * 0.04, y * 0.04, 3) - 0.5;
  let r = 116 + n * 10, g = 30 + n * 5, b = 36 + n * 6;
  if (d < 4.2) { const k = hash2(gx, gy, 9); if (k < 0.45) { r = 200; g = 162; b = 82; } else if (k < 0.75) { r = 214; g = 204; b = 184; } else { r = 52; g = 76; b = 54; } }
  else if (d < 6) { r *= 0.85; g *= 0.85; b *= 0.85; }
  return [r, g, b, 1, 0.9, 3];
}
function gownPrint(x, y) {
  const gx = Math.floor(x / 34), gy = Math.floor(y / 34), jx = hash2(gx, gy, 3) * 18 + 8, jy = hash2(gx, gy, 4) * 18 + 8;
  const d = Math.hypot(x - gx * 34 - jx, y - gy * 34 - jy);
  let r = 182, g = 176, b = 194;
  if (d < 4.5) { if (hash2(gx, gy, 5) < 0.5) { r = 172; g = 118; b = 138; } else { r = 118; g = 146; b = 128; } }
  else if (d < 6.5) { r -= 8; g -= 8; b -= 6; }
  return [r, g, b, 1, 0.7, 2];
}
function knit(x, y, f) {
  const rib = 0.9 + 0.1 * Math.sin(x * 1.25), n = vnoise(x * 0.3, y * 0.08, 11) - 0.5;
  return [116 * rib * (1 + n * 0.12), 40 * rib, 48 * rib, 1, 1.3, 5];
}
function crTabB(tab, y) {
  const n = tab.length;
  if (y <= tab[0][0]) return tab[0][1];
  if (y >= tab[n - 1][0]) return tab[n - 1][1];
  let i = 1; while (tab[i][0] < y) i++;
  const p0 = tab[Math.max(0, i - 2)], p1 = tab[i - 1], p2 = tab[i], p3 = tab[Math.min(n - 1, i + 1)];
  const t = (y - p1[0]) / (p2[0] - p1[0]), dy = p2[0] - p1[0];
  const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * dy, m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * dy;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}
function segDist(px, py, pts) {
  let best = 1e9, bu = 0, tot = 0; const L = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const u = clamp(((px - ax) * dx + (py - ay) * dy) / L2);
    const d = Math.hypot(px - ax - dx * u, py - ay - dy * u);
    if (d < best) { best = d; bu = (acc + u * L[i]) / tot; }
    acc += L[i];
  }
  return [best, bu];
}
function smax(a, b, k) { const h = clamp(0.5 + 0.5 * (a - b) / k); return lerp(b, a, h) + k * h * (1 - h); }

// ---------------------------------------------------------------- bake
function faceKey(id, rig, ex) { return `${ex.back ? 'B' : 'F'}|${id}|${rig}|${ex.hair}|${(ex.smile || 0).toFixed(2)}|${(ex.mouth || 0).toFixed(2)}|${ex.k || ''}|${ex.tired || 0}|${ex.outfit || ''}|${ex.full ? 1 : 0}|${ex.long ? 1 : 0}`; }
function bakeFace(id, rigName, ex = {}) {
  const I = IDS[id];
  ex = Object.assign({ hair: I.hair }, ex);
  if (!ex.hair) ex.hair = I.hair;
  const key = faceKey(id, rigName, ex);
  if (FACECACHE.has(key)) { const v = FACECACHE.get(key); FACECACHE.delete(key); FACECACHE.set(key, v); return v; }
  while (FACECACHE.size >= 9) FACECACHE.delete(FACECACHE.keys().next().value);
  const R = RIGS[rigName], k = ex.k || I.k, style = ex.hair;
  const outfit = ex.outfit || null, full = !!ex.full;
  const X0 = outfit ? -440 : -270, X1 = -X0, Y0 = style === 'pillow' ? -430 : -285, Y1 = outfit ? (full ? 3170 : (ex.long ? 1450 : 820)) : 340;
  const w = Math.round((X1 - X0) * k), h = Math.round((Y1 - Y0) * k), N = w * h;
  const Vd = meshDeform(I, ex), B = meshBase(), F = ex.back ? [] : B.F;
  // ---- rasterise the mesh: height + smooth normals ----
  const HM = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), MM = new Float32Array(N);
  const vn = new Float32Array(B.n * 3);
  for (let t = 0; t < F.length; t += 3) {
    const a = F[t] * 3, b = F[t + 1] * 3, c = F[t + 2] * 3;
    const ux = Vd[b] - Vd[a], uy = Vd[b + 1] - Vd[a + 1], uz = Vd[b + 2] - Vd[a + 2], wx = Vd[c] - Vd[a], wy = Vd[c + 1] - Vd[a + 1], wz = Vd[c + 2] - Vd[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    for (const q of [a, b, c]) { vn[q] += nx; vn[q + 1] += ny; vn[q + 2] += nz; }
  }
  for (let i = 0; i < B.n; i++) { const l = Math.hypot(vn[i * 3], vn[i * 3 + 1], vn[i * 3 + 2]) || 1; vn[i * 3] /= l; vn[i * 3 + 1] /= l; vn[i * 3 + 2] /= l; }
  for (let t = 0; t < F.length; t += 3) {
    const ia = F[t], ib = F[t + 1], ic = F[t + 2];
    const ax = (Vd[ia * 3] - X0) * k, ay = (Vd[ia * 3 + 1] - Y0) * k, bx = (Vd[ib * 3] - X0) * k, by = (Vd[ib * 3 + 1] - Y0) * k, cx = (Vd[ic * 3] - X0) * k, cy = (Vd[ic * 3 + 1] - Y0) * k;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(area) < 1e-6) continue;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), i1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), j1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = i + 0.5, py = j + 0.5;
      const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area, w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area, w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      const z = w0 * Vd[ia * 3 + 2] + w1 * Vd[ib * 3 + 2] + w2 * Vd[ic * 3 + 2], q = j * w + i;
      if (z <= HM[q]) continue;
      HM[q] = z; MM[q] = 1;
      NX[q] = w0 * vn[ia * 3] + w1 * vn[ib * 3] + w2 * vn[ic * 3]; NY[q] = w0 * vn[ia * 3 + 1] + w1 * vn[ib * 3 + 1] + w2 * vn[ic * 3 + 1]; NZ[q] = w0 * vn[ia * 3 + 2] + w1 * vn[ib * 3 + 2] + w2 * vn[ic * 3 + 2];
    }
  }
  // extrapolate the face height a little beyond its border (smooth joins to skull / temples)
  const HX = pushPull(HM.map((v) => (v < -1e8 ? 0 : v)), MM, w, h);
  const MB = boxBlur(MM, w, h, Math.round(16 * k));
  // ---- albedo + masks painted from landmarks ----
  const lip = paintMask(w, h, k, X0, Y0, (x) => {
    x.fillStyle = '#fff'; x.beginPath();
    const ou = lmPts(Vd, LM.lipOU), ol = lmPts(Vd, LM.lipOL);
    spline(x, ou, false, 0.5, true); spline(x, ol.slice().reverse(), false, 0.5, false); x.closePath(); x.fill();
  }, 1.1 * k);
  const brs = I.beard ? paintMask(w, h, k, X0, Y0, (x) => {
    const pts = [[-150, -40], [-138, 20], [-112, 44], [-84, 50], [-60, 56], [-36, 54], [-16, 50], [0, 50], [16, 50], [36, 54], [60, 56], [84, 50], [112, 44], [138, 20], [150, -40], [154, 30], [140, 120], [110, 170], [60, 200], [0, 214], [-60, 200], [-110, 170], [-140, 120], [-154, 30]];
    x.fillStyle = '#fff'; pathPts(x, pts); x.fill();
    x.globalCompositeOperation = 'destination-out';
    const ou = lmPts(Vd, LM.lipOU), ol = lmPts(Vd, LM.lipOL);
    x.beginPath(); spline(x, ou, false, 0.5, true); spline(x, ol.slice().reverse(), false, 0.5, false); x.closePath(); x.fill();
  }, 7 * k) : null;
  const sty = hairShapes(style);
  const hcov = paintMask(w, h, k, X0, Y0, (x) => {
    x.fillStyle = '#fff'; pathPts(x, sty.outer); x.fill();
    if (sty.holes) { x.globalCompositeOperation = 'destination-out'; for (const hp of sty.holes) { pathPts(x, hp); x.fill(); } x.globalCompositeOperation = 'source-over'; }
  }, 2.6 * k);
  const HC = new Float32Array(N); for (let q = 0; q < N; q++) HC[q] = hcov[q * 4 + 3] / 255;
  const HCB = boxBlur(HC, w, h, Math.round(22 * k));
  // strand texture: LIC of white noise along the flow (two scales)
  const rr = mulberry32(id.length * 31 + style.length);
  const noiseA = new Float32Array(N); for (let q = 0; q < N; q++) noiseA[q] = rr();
  const noiseB = boxBlur(Float32Array.from({ length: N }, () => rr()), w, h, Math.round(2.5 * k));
  const TXa = new Float32Array(N), TYa = new Float32Array(N), LIC = new Float32Array(N);
  const LL = Math.round(9 * k);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = j * w + i; if (HC[q] <= 0.003) continue;
    const x = X0 + i / k, y = Y0 + j / k;
    const [tx, ty] = hairFlow(style, x, y); TXa[q] = tx; TYa[q] = ty;
    let sA = 0, sB = 0, cnt = 0;
    for (const dir of [1, -1]) {
      let px = i, py = j, fx = tx, fy = ty;
      for (let s = 0; s < LL; s++) {
        if ((s & 3) === 3) { const f2 = hairFlow(style, X0 + px / k, Y0 + py / k); fx = f2[0]; fy = f2[1]; }
        px += fx * dir; py += fy * dir;
        const ii = px | 0, jj = py | 0; if (ii < 0 || jj < 0 || ii >= w || jj >= h) break;
        const qq = jj * w + ii; sA += noiseA[qq]; sB += noiseB[qq]; cnt++;
      }
    }
    LIC[q] = cnt ? (sA / cnt - 0.5) * 3.2 + (sB / cnt - 0.5) * 6.0 : 0;
  }
  const BG = outfit ? bodyGeom(I) : null;
  // ---- compose height / albedo ----
  const H = new Float32Array(N), AL = new Float32Array(N * 3), MASK = new Float32Array(N), OIL = new Float32Array(N), HAIR = new Float32Array(N), BODY = new Uint8Array(N);
  const sk = I.skin, hc = I.hairCol, nw = I.neckW;
  for (let j = 0; j < h; j++) {
    const y = Y0 + (j + 0.5) / k;
    for (let i = 0; i < w; i++) {
      const x = X0 + (i + 0.5) / k, q = j * w + i, ax = Math.abs(x);
      let hs = -1;
      const ex_ = x / 152, ey_ = (y + 62) / 206, e2 = ex_ * ex_ + ey_ * ey_;
      if (e2 < 1 && y < 70) hs = 162 * Math.sqrt(1 - e2) * (1 - sst(20, 70, y) * 0.6);
      let hn = -1;
      if (y > 40) { const u = ax / (nw + Math.max(0, y - 240) * 1.1); if (u < 1) hn = 52 * Math.sqrt(1 - u * u) + 8 - Math.max(0, y - 260) * 0.2; }
      let hear = -1;
      { const eu = (ax - 158) / 15, ev = (y + 34) / 40, er = eu * eu + ev * ev; if (er < 1) hear = 46 + 12 * Math.sqrt(1 - er) - 10 * Gs(ax, y, 156, -30, 6, 18); }
      let hh, isFace = 0;
      if (MM[q] > 0) { hh = HM[q]; isFace = 1; }
      else {
        hh = Math.max(hs, hn, hear);
        if (MB[q] > 0.02 && y < 40 && hs > 0) { const wf = clamp(MB[q] * 2.2); hh = Math.max(hn, hear, lerp(hs, HX[q] - (1 - MB[q] * 2) * 26, wf)); }
      }
      const hairC = HC[q] >= 0.999 ? 1 : clamp((HC[q] - 0.5) * 2.4 + LIC[q] * (style === 'wild' ? 0.45 : 0.22) + 0.5);
      let bodyA = null;
      if (BG && y > 190) {
        let hb = -1, part = null, uu = 0;
        // torso: elliptical cross-section under the neck
        const Wt = crTabB(BG.tw, y), Dt = crTabB(BG.td, y);
        if (y < 1530 && ax < Wt) {
          let ht = Dt * Math.pow(1 - (x / Wt) ** 2, 0.45);
          ht += 7 * Gs(ax, y, 100, 262 + (ax - 100) * 0.05, 60, 7);                    // clavicles
          ht += BG.f ? 34 * Gs(ax, y, 95, 560, 78, 70) : 10 * Gs(ax, y, 110, 460, 95, 60);
          if (hn > -1) ht = smax(hn, ht, 24);
          hb = ht; part = 'torso';
        }
        for (const sd of [-1, 1]) {                                                        // arms in front of the torso sides
          const [d, u] = segDist(x, y, BG.arm(sd)), r = crTabB(BG.armR, u);
          if (d < r) {
            const ha = 72 + r * Math.sqrt(1 - (d / r) ** 2);
            if (u < 0.3 && part === 'torso') { const hm = smax(ha, hb, 34 * (1 - u / 0.3) + 2); if (ha > hb - 20) { hb = hm; part = ha > hb - 6 ? 'arm' : part; uu = u; } }
            else if (ha > hb) { hb = ha; part = 'arm'; uu = u; }
          }
        }
        if (full && (outfit === 'rags' || outfit === 'entari') && y > 950) {
          // long skirt: a widening cone from the waist, ragged hem for the creature
          const hem = outfit === 'rags' ? 2790 + (vnoise(x * 0.02, 1, 31) - 0.5) * 150 + (hash2(Math.floor(x / 26), 0, 32) < 0.3 ? 110 : 0) : 2930;
          const Wsk = lerp(222, 345, clamp((y - 950) / 1900)) + Math.sin(y * 0.004 + 1) * 10;
          if (y < hem && ax < Wsk) {
            const hk = 170 * Math.sqrt(1 - (x / Wsk) ** 2) + 62 + Math.sin(x * 0.045 + Math.sin(y * 0.002) * 2) * 12 * sst(1100, 2000, y);
            if (hk > hb) { hb = hk; part = 'skirt'; uu = 0; }
          }
        }
        if (full) for (const sd of [-1, 1]) {
          const [d, u] = segDist(x, y, BG.leg(sd)), r = crTabB(BG.legR, u) + 12;
          if (d < r) { const hl = 50 + r * Math.sqrt(1 - (d / r) ** 2); if (hl > hb) { hb = hl; part = 'leg'; uu = u; } }
          const fx = (x - sd * (BG.xl - 44)) / 56, fy = (y - 3105) / 48, fr = fx * fx + fy * fy;
          if (fr < 1) { const hf2 = 40 + 30 * Math.sqrt(1 - fr); if (hf2 > hb) { hb = hf2; part = 'foot'; } }
        }
        if (part && hb > hh - (part === 'torso' ? 0 : 0)) {
          const oa = outfitAt(outfit, part, x, y, uu, BG, sk);
          let fold = 0;
          if (oa[3]) {
            fold = (Math.sin(x * 0.065 + Math.sin(y * 0.01) * 3 + y * 0.02) * 2.2 + (vnoise(x * 0.02, y * 0.012, 13) - 0.5) * 8) * oa[4];
            if (part === 'leg') fold += Math.sin(y * 0.09 + x * 0.02) * 4 * (sst(0.75, 1, uu) + sst(0.42, 0.5, uu) * (1 - sst(0.5, 0.58, uu)));
          }
          hh = hb + fold + oa[5]; isFace = 0; bodyA = oa;
        }
      }
      if (hh < -0.5 && hairC <= 0.003) continue;
      let A0 = sk[0], A1 = sk[1], A2 = sk[2], oil = 0;
      if (hh > -0.5) {
        const bl = Gs(ax, y, 78, 16, 44, 38); A0 += 22 * bl; A1 -= 4 * bl; A2 -= 8 * bl;
        const nr = Gs(x, y, 0, 8, 22, 22); A0 += 10 * nr; A1 -= 3 * nr; A2 -= 6 * nr;
        const lid = Gs(ax, y, 60, -66, 34, 16); A0 *= 1 - 0.05 * lid; A1 *= 1 - 0.1 * lid; A2 *= 1 - 0.07 * lid;
        const bags = Gs(ax, y, 58, -36, 26, 9) * (0.07 + (ex.tired || 0) * 0.18); A0 *= 1 - bags; A1 *= 1 - bags * 1.25; A2 *= 1 - bags;
        if (hear > -1 && hear >= hh - 0.01) { A0 += 14; A1 -= 6; A2 -= 6; }
        const lm = lip[q * 4 + 3] / 255;
        if (lm > 0) { A0 = lerp(A0, I.lip[0], lm); A1 = lerp(A1, I.lip[1], lm); A2 = lerp(A2, I.lip[2], lm); }
        if (brs) { const bm = brs[q * 4 + 3] / 255 * (0.35 + 0.65 * noiseA[q] * noiseA[q]) * (1 - lm); const d = bm * 0.3; A0 = lerp(A0, 58, d); A1 = lerp(A1, 52, d); A2 = lerp(A2, 54, d); }
        if (I.mole) { const mg = Gs(x, y, 74, 34, 2.2, 2.2); A0 *= 1 - 0.5 * mg; A1 *= 1 - 0.55 * mg; A2 *= 1 - 0.55 * mg; }
        if (I.pale) { const L = (A0 + A1 + A2) / 3; A0 = lerp(A0, L, 0.25); A1 = lerp(A1, L, 0.25); A2 = lerp(A2, L * 1.04, 0.25); }
        const g1 = noiseB[q] - 0.5, g2 = vnoise(x * 0.12, y * 0.12, 5) - 0.5, gm = 1 + g1 * 0.05 + g2 * 0.03;
        A0 *= gm; A1 *= gm; A2 *= gm;
        oil = (0.25 + 0.6 * Gs(x, y, 0, -140, 70, 34) + 0.7 * Gs(x, y, 0, 0, 16, 34) + 0.4 * Gs(x, y, 0, 150, 26, 16)) * isFace + lm * 0.8;
        if (bodyA) { A0 = bodyA[0] * gm; A1 = bodyA[1] * gm; A2 = bodyA[2] * gm; oil = bodyA[3] ? 0 : 0.2; BODY[q] = bodyA[3] ? 2 : 1; }
      }
      let hr = hh;
      if (hairC > 0.003) {
        const under = Math.max(hh, 0);
        let Hh;
        if (style === 'pillow') Hh = Math.max(6 + HCB[q] * 10, hs > 0 ? hs + sty.thick * HCB[q] : 0) + LIC[q] * 0.6;
        else if (style === 'down') {
          const onSkull = hs > 0 && y < -120 ? hs : 0;
          const curtain = 30 + 70 * HCB[q] - Math.max(0, y - 150) * 0.1;
          Hh = Math.max(onSkull + sty.thick * HCB[q], curtain, (hs > 0 ? hs + 6 * HCB[q] : 0)) + LIC[q] * 0.9;
        } else if (style === 'scarf') Hh = under + 9 + HCB[q] * 6 + Math.sin(x * 0.05 + y * 0.02) * 2.5 + LIC[q] * 0.5;
        else if (style === 'back_tied') Hh = Math.max(hs, 0) + sty.thick * HCB[q] + 46 * Gs(x, y, 0, 70, 60, 46) + LIC[q] * 0.7 + 2;
        else if (style === 'back_down') Hh = Math.max(hs > 0 ? hs : 0, under) + sty.thick * HCB[q] + 34 * Math.sqrt(clamp(1 - (x / 160) ** 2)) * sst(-40, 60, y) + LIC[q] * 0.35 + 3;
        else if (style === 'wild') {
          // a curtain of hair hanging from the crown in front of the face (no nose / chin showing through)
          const yt = Math.min(0, y + 60) / 240;
          const drape = 196 * Math.sqrt(clamp(1 - (x / 230) ** 2 - yt * yt)) * (1 - 0.35 * sst(120, 600, y)) - Math.max(0, y - 600) * 0.05;
          Hh = Math.max(drape, under + 6) + sty.thick * HCB[q] + LIC[q] * 1.8;
        }
        else Hh = Math.max(hs, 0) + sty.thick * HCB[q] + LIC[q] * 0.7 + 2;
        if (hh < -0.5 || Hh >= under - 3) {
          const c = hairC, kk = clamp(0.72 + LIC[q] * (style === 'back_down' ? 0.03 : 0.06), 0.25, 1.4);
          let h0 = hc[0], h1 = hc[1], h2 = hc[2];
          if (style === 'wild') { const gr = sst(0.25, 0.95, LIC[q]) * 0.65; h0 = lerp(h0, 104, gr); h1 = lerp(h1, 102, gr); h2 = lerp(h2, 98, gr); }
          A0 = hh < -0.5 ? h0 * kk : lerp(A0, h0 * kk, c); A1 = hh < -0.5 ? h1 * kk : lerp(A1, h1 * kk, c); A2 = hh < -0.5 ? h2 * kk : lerp(A2, h2 * kk, c);
          hr = hh < -0.5 ? Hh : lerp(hh, Math.max(hh, Hh), c);
          HAIR[q] = style === 'scarf' ? 0 : c; oil *= 1 - c;
          if (style === 'scarf') { const dot = (Math.floor(x / 22) + Math.floor(y / 22)) % 2 === 0 && Gs((x % 22 + 22) % 22, (y % 22 + 22) % 22, 11, 11, 2.2, 2.2) > 0.4; if (dot) { A0 = 190; A1 = 186; A2 = 180; } BODY[q] = 2; }
          if (hh < -0.5) MASK[q] = c;
        }
      }
      if (hh > -0.5) MASK[q] = 1;
      H[q] = Math.max(hr, 0); AL[q * 3] = A0; AL[q * 3 + 1] = A1; AL[q * 3 + 2] = A2; OIL[q] = oil;
      if (!isFace || HAIR[q] > 0.3) NZ[q] = 0;
    }
  }
  // ---- light ----
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const K = nrm(R.key.dir), Fd = nrm(R.fill.dir), RM = R.rim ? nrm(R.rim.dir) : null;
  const B1 = boxBlur(H, w, h, Math.round(5 * k)), B2 = boxBlur(H, w, h, Math.round(20 * k));
  const PO = boxBlur(noiseA, w, h, 1);
  const SH = new Float32Array(N);
  {
    const pl = Math.hypot(K[0], K[1]);
    if (pl > 0.03) {
      const sx = K[0] / pl, sy = K[1] / pl, slope = K[2] / pl;
      const steps = []; for (let s = 1; s <= 30; s++) steps.push((0.8 + s * s * 0.24) * k);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const q0 = j * w + i; if (MASK[q0] <= 0) continue;
        const z0 = H[q0]; let occ = 0;
        for (const d of steps) {
          const qi = Math.round(i + sx * d), qj = Math.round(j + sy * d);
          if (qi < 0 || qj < 0 || qi >= w || qj >= h) break;
          const q = qj * w + qi; if (MASK[q] <= 0) continue;
          const e = (H[q] - z0 - (d / k) * slope) / (5 + d / k * 0.2); if (e > occ) { occ = e; if (occ >= 1) break; }
        }
        SH[q0] = clamp(occ);
      }
    }
  }
  const mk = () => { const c = makeCanvas(w, h); const x = c.getContext('2d'); return [c, x, x.createImageData(w, h)]; };
  const [cF, xF, iF] = mk(), [cK, xK, iK] = mk(), [cR, xR, iR] = mk();
  const dF = iF.data, dK = iK.data, dR = iR.data;
  const kw = R.key.wrap || 0, ksp = R.key.spec || 0;
  let Hx = K[0], Hy = K[1], Hz = K[2] + 1; { const l = Math.hypot(Hx, Hy, Hz); Hx /= l; Hy /= l; Hz /= l; }
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const q = j * w + i, mq = MASK[q]; if (mq <= 0) continue;
    let nx, ny, nz;
    if (NZ[q] > 0) { nx = NX[q]; ny = NY[q]; nz = NZ[q]; }
    else { nx = -(H[q + 1] - H[q - 1]) * 0.5 * k; ny = -(H[q + w] - H[q - w]) * 0.5 * k; nz = 1; }
    if (HAIR[q] < 0.5 && BODY[q] === 0) { nx -= (PO[q + 1] - PO[q - 1]) * 0.45; ny -= (PO[q + w] - PO[q - w]) * 0.45; }
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const ao = clamp(1 - Math.max(0, B1[q] - H[q]) * 0.05 - Math.max(0, B2[q] - H[q]) * 0.011, 0.12, 1);
    const a0 = AL[q * 3] / 255, a1 = AL[q * 3 + 1] / 255, a2 = AL[q * 3 + 2] / 255, isH = HAIR[q];
    const fd = Math.max(0, (nx * Fd[0] + ny * Fd[1] + nz * Fd[2] + 0.6) / 1.6) * (j / k + Y0 > 150 && j / k + Y0 < 330 ? Math.max(ao, 0.7) * 1.4 : ao);
    dF[q * 4] = clamp(a0 * (R.fill.col[0] * fd + R.amb[0] * ao) * 255, 0, 255);
    dF[q * 4 + 1] = clamp(a1 * (R.fill.col[1] * fd + R.amb[1] * ao) * 255, 0, 255);
    dF[q * 4 + 2] = clamp(a2 * (R.fill.col[2] * fd + R.amb[2] * ao) * 255, 0, 255);
    dF[q * 4 + 3] = mq * 255;
    const nd = nx * K[0] + ny * K[1] + nz * K[2];
    const dif = Math.max(0, (nd + kw) / (1 + kw));
    const sh = 1 - SH[q] * (j / k + Y0 > 150 && j / k + Y0 < 330 ? 0.55 : 0.9);
    const term = dif * (1 - dif) * 4 * (1 - isH) * (1 - SH[q]);
    const ak = 0.5 + 0.5 * ao;
    const kr = dif * sh * (1 + term * 0.28) * ak, kg = dif * sh * (1 - term * 0.04) * ak, kb = dif * sh * (1 - term * 0.14) * ak;
    let sp;
    if (isH > 0.3) {
      const tdh = TXa[q] * Hx + TYa[q] * Hy;
      sp = Math.pow(Math.sqrt(Math.max(0, 1 - tdh * tdh)), 22) * 0.32 * sh * isH * clamp(0.35 + LIC[q] * 0.45, 0, 1.2);
    } else sp = Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), 30) * ksp * OIL[q] * sh;
    dK[q * 4] = clamp((a0 * kr + sp) * R.key.col[0] * 255, 0, 255);
    dK[q * 4 + 1] = clamp((a1 * kg + sp) * R.key.col[1] * 255, 0, 255);
    dK[q * 4 + 2] = clamp((a2 * kb + sp) * R.key.col[2] * 255, 0, 255);
    dK[q * 4 + 3] = mq * 255;
    if (RM) {
      const rd = Math.max(0, nx * RM[0] + ny * RM[1] + nz * RM[2]), fres = Math.pow(1 - nz, 2.0), rr2 = rd * (0.3 + fres) * ao;
      dR[q * 4] = clamp(a0 * rr2 * R.rim.col[0] * 400, 0, 255); dR[q * 4 + 1] = clamp(a1 * rr2 * R.rim.col[1] * 400, 0, 255);
      dR[q * 4 + 2] = clamp(a2 * rr2 * R.rim.col[2] * 400, 0, 255); dR[q * 4 + 3] = mq * 255;
    }
  }
  xF.putImageData(iF, 0, 0); xK.putImageData(iK, 0, 0); if (RM) xR.putImageData(iR, 0, 0);
  const eyes = [[LM.eyeR_up, LM.eyeR_lo], [LM.eyeL_up, LM.eyeL_lo]].map(([u, l]) => ({ up: lmPts(Vd, u), lo: lmPts(Vd, l) }));
  const brows = [[LM.browR_up, LM.browR_lo], [LM.browL_up, LM.browL_lo]].map(([u, l]) => ({ up: lmPts(Vd, u), lo: lmPts(Vd, l) }));
  const lipsI = { up: lmPts(Vd, LM.lipIU), lo: lmPts(Vd, LM.lipIL) };
  const lightAt = (x, y) => {
    const i = clamp(Math.round((x - X0) * k), 0, w - 1), j = clamp(Math.round((y - Y0) * k), 0, h - 1), q = j * w + i;
    return { key: Math.max(0, K[2] * 0.6 + 0.4) * (1 - SH[q] * 0.95), fill: (R.fill.col[0] + R.fill.col[1] + R.fill.col[2]) / 3 + (R.amb[0] + R.amb[1] + R.amb[2]) / 3 };
  };
  const out = { w, h, k, X0, Y0, fill: cF, key: cK, rim: RM ? cR : null, eyes, brows, lipsI, eyeLight: eyes.map((e) => lightAt((e.up[0][0] + e.up[8][0]) / 2, (e.up[4][1] + e.lo[4][1]) / 2)), id, rig: rigName };
  FACECACHE.set(key, out);
  return out;
}

// ---------------------------------------------------------------- live features
function eyeShape(e, open, wide) {
  const sn = (i) => Math.sin(Math.PI * i / 8);
  const lo = e.lo.map(([x, y], i) => [x, y + (1.6 + wide * 1.8) * sn(i)]);
  const up = e.up.map(([x, y], i) => [x, lerp(lo[i][1] - 0.6, y - (4.2 + wide * 5) * sn(i), open)]);
  return { up, lo };
}
function drawEyeLive(ctx, I, R, L, e, side, o) {
  const open = clamp(o.open ?? 1), wide = o.wide || 0, look = o.look || [0, 0], pupil = o.pupil ?? 0.5;
  const kc = R.key.col, fc = R.fill.col;
  const lit = clamp(L.key * 0.85 + L.fill * 1.3 + 0.02, 0, 1.3);
  const lk = clamp(L.key);
  const lc = [lerp(fc[0] * 3, kc[0], lk), lerp(fc[1] * 3, kc[1], lk), lerp(fc[2] * 3, kc[2], lk)];
  const rgb = (c, m) => `rgb(${clamp(c[0] * m, 0, 255) | 0},${clamp(c[1] * m, 0, 255) | 0},${clamp(c[2] * m, 0, 255) | 0})`;
  const S = eyeShape(e, open, wide);
  const c0 = S.up[0], c1 = S.up[8];
  const cx = (c0[0] + c1[0]) / 2, cy = (e.up[4][1] + e.lo[4][1]) / 2 + 1;
  ctx.save();
  if (open > 0.03) {
    ctx.beginPath(); spline(ctx, S.up, false, 0.5, true); spline(ctx, S.lo.slice().reverse(), false, 0.5, false); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.fillStyle = rgb([214 * lc[0], 210 * lc[1], 204 * lc[2]], lit); ctx.fillRect(cx - 40, cy - 30, 80, 60);
    radialEllipse(ctx, cx, cy + 1, 30, 13, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(25,12,12,0.25)'], [1, 'rgba(12,6,6,0.8)']]);
    const ix = cx + look[0] * 10, iy = cy + look[1] * 4, ir = 11.2;
    const ic = I.iris;
    const ig = ctx.createRadialGradient(ix, iy, 0.5, ix, iy, ir);
    ig.addColorStop(0, rgb(ic, lit * 0.55)); ig.addColorStop(0.62, rgb(ic, lit * 1.35)); ig.addColorStop(0.9, rgb(ic, lit * 0.6)); ig.addColorStop(1, 'rgb(6,4,3)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.55;
    for (let q = 0; q < 28; q++) { const a = q / 28 * TAU; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 4.2, iy + Math.sin(a) * 4.2); ctx.lineTo(ix + Math.cos(a) * 10, iy + Math.sin(a) * 10); ctx.stroke(); }
    ctx.fillStyle = '#030202'; ctx.beginPath(); ctx.arc(ix, iy, 3.0 + pupil * 4.6, 0, TAU); ctx.fill();
    const topY = Math.min(...S.up.map((p) => p[1]));
    ctx.fillStyle = linGrad(ctx, 0, topY, 0, topY + 13, [[0, 'rgba(0,0,0,0.88)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(cx - 40, topY - 2, 80, 16);
    if (L.key > 0.12) {
      const kx = R.key.dir[0], ky = R.key.dir[1];
      ctx.fillStyle = `rgba(${Math.min(255, 150 + kc[0] * 100) | 0},${Math.min(255, 150 + kc[1] * 100) | 0},${Math.min(255, 150 + kc[2] * 100) | 0},${clamp(L.key * 0.95)})`;
      ctx.beginPath(); ctx.ellipse(ix + kx * 5.5, iy + ky * 5.5 - 1.5, 2.1, 2.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = `rgba(255,238,228,${0.14 + (o.wet || 0) * 0.5})`; ctx.lineWidth = 0.8 + (o.wet || 0) * 1.1;
    ctx.beginPath(); spline(ctx, S.lo.slice(1, 8), false, 0.5, true); ctx.stroke();
  }
  const lp = [];
  for (let i = 0; i < 8; i++) { const a = S.up[i], b = S.up[i + 1]; for (let s = 0; s < 3; s++) lp.push([lerp(a[0], b[0], s / 3), lerp(a[1], b[1], s / 3)]); }
  lp.push(S.up[8]);
  ctx.fillStyle = 'rgba(12,9,9,0.86)'; inkStroke(ctx, lp, 1.4, 2.8 + I.fem * 0.8, true);
  ctx.strokeStyle = `rgba(12,9,9,${0.5 + 0.3 * lit})`; ctx.lineWidth = 0.8;
  const ll = 3.5 + I.fem * 4.5, outerSign = c0[0] < c1[0] ? -1 : 1;
  for (let q = 2; q < lp.length - 2; q++) {
    const [px, py] = lp[q], u = 1 - q / (lp.length - 1);
    const dx = outerSign * (0.15 + u * 0.8), dy = open > 0.15 ? -1 : 0.9;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + dx * ll * 0.4, py + dy * ll * 0.7, px + dx * ll, py + dy * ll * (open > 0.15 ? 0.75 : 1)); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(28,16,14,${0.18 + 0.14 * open})`; ctx.lineWidth = 1.3;
  ctx.beginPath(); spline(ctx, e.up.slice(1, 8).map(([x, y], i) => [x, y - 7.5 - wide * 4 - Math.sin(Math.PI * (i + 1) / 8) * 2.5]), false, 0.5, true); ctx.stroke();
  ctx.restore();
}
function drawBrowLive(ctx, I, R, L, b, raise, knit, side) {
  const up = b.up.map(([x, y], i) => [x, y - raise * (10 - i * 1.5) + knit * 2 * (i / 4)]);
  const lo = b.lo.map(([x, y], i) => [x, y - raise * (10 - i * 1.5) + knit * 2 * (i / 4)]);
  const mid = up.map((p, i) => [(p[0] + lo[i][0]) / 2, (p[1] + lo[i][1]) / 2 + (I.fem ? -1 : 0)]);
  const lit = clamp(L.key * 0.45 + L.fill + 0.05);
  const bc = I.browCol;
  ctx.save();
  const pts = []; for (let i = 0; i < 4; i++) for (let s = 0; s < 5; s++) pts.push([lerp(mid[i][0], mid[i + 1][0], s / 5), lerp(mid[i][1], mid[i + 1][1], s / 5)]);
  pts.push(mid[4]);
  const th = I.fem ? 6.5 : 10;
  ctx.fillStyle = `rgba(${bc[0]},${bc[1]},${bc[2]},0.55)`; inkStroke(ctx, pts.slice().reverse(), th, th * 0.55, true);
  ctx.strokeStyle = `rgba(${bc[0] * 0.7 | 0},${bc[1] * 0.7 | 0},${bc[2] * 0.7 | 0},${0.45 + 0.2 * lit})`; ctx.lineWidth = 0.85;
  const r = mulberry32(side > 0 ? 5 : 6), outer = mid[0][0] < mid[4][0] ? -1 : 1;
  for (let q = 0; q < 140; q++) {
    const u = r(), i = Math.floor(u * (pts.length - 1)), [px, py] = pts[i];
    const yy = py + (r() - 0.5) * th * 0.95 * (0.5 + 0.5 * (i / pts.length));
    const dir = outer * (u < 0.3 ? 0.35 : 1);
    ctx.beginPath(); ctx.moveTo(px, yy + 1.2); ctx.lineTo(px + dir * (3.5 + r() * 4.5), yy - 1.2 - r() * (u > 0.7 ? 1.5 : 3)); ctx.stroke();
  }
  ctx.restore();
}
function drawMouthLive(ctx, F, R, L, mo) {
  if (mo <= 0.02) return;
  const up = F.lipsI.up, lo = F.lipsI.lo;
  ctx.save();
  ctx.fillStyle = '#0a0505';
  ctx.beginPath(); spline(ctx, up, false, 0.5, true); spline(ctx, lo.slice().reverse(), false, 0.5, false); ctx.closePath(); ctx.fill();
  const lit = clamp(L.key * 0.5 + L.fill + 0.04);
  ctx.save(); ctx.clip();
  ctx.fillStyle = `rgba(${196 * lit | 0},${192 * lit | 0},${184 * lit | 0},0.8)`;
  ctx.beginPath(); spline(ctx, up.slice(2, 9), false, 0.5, true); spline(ctx, up.slice(2, 9).reverse().map(([x, y]) => [x, y + 4 + mo * 2]), false, 0.5, false); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawTears(ctx, F, t, amt) {
  if (amt <= 0) return;
  ctx.save();
  F.eyes.forEach((e, si) => {
    const inner = e.up[8], side = inner[0] < 0 ? -1 : 1;
    const prog = (t * 0.1 + si * 0.37) % 1, len = 24 + prog * 110 * amt;
    const x0 = inner[0] + side * -2, y0 = inner[1] + 9;
    const pts = bezPts([x0, y0], [x0 + side * 3, y0 + len * 0.35], [x0 + side * 9, y0 + len * 0.7], [x0 + side * 12, y0 + len], 10);
    ctx.fillStyle = `rgba(255,250,245,${0.1 * amt})`; inkStroke(ctx, pts, 3.2, 2.2, false);
    ctx.fillStyle = `rgba(255,255,255,${0.32 * amt})`; inkStroke(ctx, pts.map(([a, b]) => [a + 0.9, b]), 0.8, 0.6, false);
    const [dx, dy] = pts[pts.length - 1];
    ctx.fillStyle = `rgba(16,18,24,${0.3 * amt})`; ctx.beginPath(); ctx.ellipse(dx, dy + 2, 3.2, 4.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.65 * amt})`; ctx.beginPath(); ctx.arc(dx + 0.9, dy, 1.2, 0, TAU); ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- draw
// x,y: screen position of the face origin (between the eyes, slightly below), s: px per face unit
// o: {rig, hair, smile, mouth, tired, open, openL, openR, wide, look, pupil, raise, knit, tears, wet, keyGain, fillGain, rimGain, keyMask, alpha, t}
function drawFace(ctx, id, x, y, s, rot, o = {}) {
  const I = IDS[id];
  const qz = (v) => Math.round((v || 0) * 10) / 10;
  const F = bakeFace(id, o.rig, { hair: o.hair || I.hair, smile: qz(o.smile), mouth: qz(o.mouth), k: o.k, tired: o.tired || 0, outfit: o.outfit, full: o.full, back: o.back, long: o.long });
  const R = RIGS[o.rig];
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  const A = o.alpha ?? 1; ctx.globalAlpha = A;
  const sx = F.X0, sy = F.Y0, sw = F.w / F.k, sh = F.h / F.k;
  const fg = o.fillGain ?? 1;
  ctx.drawImage(F.fill, sx, sy, sw, sh);
  ctx.globalCompositeOperation = 'lighter';
  if (fg > 1) { ctx.globalAlpha = A * clamp(fg - 1); ctx.drawImage(F.fill, sx, sy, sw, sh); }
  const kg = o.keyGain ?? 1;
  if (kg > 0.003) {
    const src = o.keyMask ? maskedLayer(F, F.key, o.keyMask) : F.key;
    for (let rep = kg; rep > 0.003; rep -= 1) { ctx.globalAlpha = A * Math.min(1, rep); ctx.drawImage(src, 0, 0, F.w, F.h, sx, sy, sw, sh); }
  }
  if (F.rim && (o.rimGain ?? 1) > 0.003) { ctx.globalAlpha = A * clamp(o.rimGain ?? 1); ctx.drawImage(F.rim, sx, sy, sw, sh); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = A;
  if (o.back || o.features === false) { ctx.restore(); return; }
  const Le = F.eyeLight.map((l) => ({ key: l.key * kg, fill: l.fill * fg }));
  drawBrowLive(ctx, I, R, Le[0], F.brows[0], o.raise || 0, o.knit || 0, -1); drawBrowLive(ctx, I, R, Le[1], F.brows[1], o.raise || 0, o.knit || 0, 1);
  drawEyeLive(ctx, I, R, Le[0], F.eyes[0], -1, { open: o.openL ?? o.open ?? 1, wide: o.wide, look: o.look, pupil: o.pupil, wet: o.wet });
  drawEyeLive(ctx, I, R, Le[1], F.eyes[1], 1, { open: o.openR ?? o.open ?? 1, wide: o.wide, look: o.look, pupil: o.pupil, wet: o.wet });
  drawMouthLive(ctx, F, R, Le[0], o.mouth || 0);
  if (o.tears) drawTears(ctx, F, o.t || 0, o.tears);
  ctx.restore();
}
let MASKBUF = null;
function maskedLayer(F, layer, maskFn) {
  if (!MASKBUF || MASKBUF.width < F.w || MASKBUF.height < F.h) MASKBUF = makeCanvas(Math.max(F.w, MASKBUF ? MASKBUF.width : 0), Math.max(F.h, MASKBUF ? MASKBUF.height : 0));
  const g = MASKBUF.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, MASKBUF.width, MASKBUF.height);
  g.drawImage(layer, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.save(); g.setTransform(F.k, 0, 0, F.k, -F.X0 * F.k, -F.Y0 * F.k); maskFn(g, F); g.restore();
  g.globalCompositeOperation = 'source-over';
  return MASKBUF;
}
