// Shared helpers: math, noise, canvas utilities, post-processing and word-by-word subtitles.
'use strict';
const W = 1080, H = 1920;

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 progress of t inside [a,b]
const smooth = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeOutBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, s + i * 31); n += amp; amp *= 0.5; f *= 2.03; }
  return sum / n;
}
// periodic (tileable) value noise / fbm with lattice period P
function pnoise(x, y, P, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (k) => ((k % P) + P) % P;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s), c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function pfbm(x, y, P, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { sum += amp * pnoise(x * f, y * f, P * f, s + i * 31); n += amp; amp *= 0.5; f *= 2; }
  return sum / n;
}
// smooth 1D noise in [-1,1]
const n1 = (t, s = 0) => vnoise(t, 0.5, s) * 2 - 1;
const fn1 = (t, s = 0) => (fbm(t, 0.5, 3, s) * 2 - 1);

// ---------- canvas ----------
function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h);
  return c;
}
function rgba(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function col(c, a = 1) { return rgba(c[0], c[1], c[2], a); }

function radial(ctx, x, y, r, stops, op) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.save(); if (op) ctx.globalCompositeOperation = op;
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function radialEllipse(ctx, x, y, rx, ry, stops, op, rot = 0) {
  ctx.save(); if (op) ctx.globalCompositeOperation = op;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ry, 0, TAU); ctx.fill(); ctx.restore();
}
function linGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function poly(ctx, pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
// Catmull-Rom spline through points -> bezier path
function spline(ctx, pts, closed = false, k = 0.5, move = true) {
  const n = pts.length; if (n < 2) return;
  const P = (i) => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1) | 0];
  if (move) ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * k / 3, c1y = p1[1] + (p2[1] - p0[1]) * k / 3;
    const c2x = p2[0] - (p3[0] - p1[0]) * k / 3, c2y = p2[1] - (p3[1] - p1[1]) * k / 3;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
// tapered "ink" stroke along a polyline: width profile w(t)
function inkStroke(ctx, pts, w0, w1 = w0, taper = true) {
  const n = pts.length; if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1);
    let w = lerp(w0, w1, u); if (taper) w *= Math.sin(Math.PI * clamp(u * 0.9 + 0.05)) ** 0.6;
    L.push([pts[i][0] - dy * w / 2, pts[i][1] + dx * w / 2]); R.push([pts[i][0] + dy * w / 2, pts[i][1] - dx * w / 2]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fill();
}
function bezPts(p0, p1, p2, p3, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, mt = 1 - t;
    out.push([mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
              mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

// noise texture canvas (grayscale or mapped via fn(v,x,y) -> [r,g,b,a])
function noiseCanvas(w, h, scale, oct, seed, fn) {
  const c = makeCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = fbm(i / scale, j / scale, oct, seed), k = (j * w + i) * 4;
    const o = fn(v, i, j);
    d[k] = o[0]; d[k + 1] = o[1]; d[k + 2] = o[2]; d[k + 3] = o[3];
  }
  x.putImageData(img, 0, 0); return c;
}

// ---------- shared textures ----------
const TEX = {};
function buildSharedTextures() {
  // film grain frames (half res, upscaled when drawn)
  TEX.grain = [];
  for (let f = 0; f < 6; f++) {
    const c = makeCanvas(540, 960), x = c.getContext('2d'), img = x.createImageData(540, 960), d = img.data;
    const r = mulberry32(1000 + f);
    for (let k = 0; k < d.length; k += 4) { const v = (r() + r() + r()) / 3 * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
    x.putImageData(img, 0, 0); TEX.grain.push(c);
  }
  // soft fog (tileable-ish, low res)
  TEX.fog = (() => {
    const c = makeCanvas(256, 256), x = c.getContext('2d'), img = x.createImageData(256, 256), d = img.data;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const v = pfbm(i / 64, j / 64, 4, 5, 77), a = clamp((v - 0.4) * 2.2), k = (j * 256 + i) * 4;
      d[k] = 200; d[k + 1] = 215; d[k + 2] = 235; d[k + 3] = a * 255;
    }
    x.putImageData(img, 0, 0); return c;
  })();
  // painterly paper mottling for a hand-made look
  TEX.paper = noiseCanvas(270, 480, 22, 5, 5, (v) => { const g = 128 + (v - 0.5) * 120; return [g, g, g, 255]; });
  // plaster wall
  TEX.plaster = noiseCanvas(540, 540, 40, 6, 21, (v, i, j) => {
    const fine = hash2(i, j, 9) * 18; const g = 150 + (v - 0.5) * 90 + fine;
    return [g * 0.93, g * 0.95, g, 255];
  });
  // wood grain (horizontal streaks)
  TEX.wood = noiseCanvas(512, 256, 1, 1, 3, (v, i, j) => {
    const s = fbm(i / 160, j / 6, 4, 13), k = fbm(i / 40, j / 40, 3, 17);
    const g = 90 + (s - 0.5) * 110 + (k - 0.5) * 40 + Math.sin(j * 0.9 + s * 9) * 8;
    return [g * 1.05, g * 0.92, g * 0.8, 255];
  });
}

// ---------- post ----------
function drawFog(ctx, t, alpha, speed = 20, scale = 4, seed = 0, y0 = 0, y1 = H) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true;
  const s = 256 * scale, ox = ((t * speed + seed * 300) % s + s) % s;
  for (let x = -ox; x < W; x += s) for (let y = y0 - ((seed * 120) % s); y < y1; y += s) ctx.drawImage(TEX.fog, x, y, s, s);
  ctx.restore();
}
function vignette(ctx, strength = 0.7, inner = 0.35, cx = W / 2, cy = H / 2) {
  const r = Math.hypot(W, H) * 0.55;
  const g = ctx.createRadialGradient(cx, cy, r * inner, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function grain(ctx, t, amount = 0.14) {
  const f = Math.floor(t * 24) % TEX.grain.length;
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount;
  const ox = (Math.floor(t * 24) * 37) % 60, oy = (Math.floor(t * 24) * 53) % 60;
  ctx.drawImage(TEX.grain[f], -ox, -oy, W + 120, H + 120);
  ctx.restore();
}
function paperTexture(ctx, amount = 0.1) {
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = amount;
  ctx.drawImage(TEX.paper, 0, 0, W, H); ctx.restore();
}
function tint(ctx, color, alpha, op = 'soft-light') {
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function fillBlack(ctx, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// handheld camera: returns small offsets/rotation from layered noise
function handheld(t, amp = 1, seed = 0) {
  return {
    x: (fn1(t * 0.35, seed + 1) * 9 + n1(t * 2.1, seed + 2) * 1.5) * amp,
    y: (fn1(t * 0.3, seed + 3) * 9 + n1(t * 2.3, seed + 4) * 1.5) * amp,
    r: fn1(t * 0.25, seed + 5) * 0.004 * amp,
  };
}
// apply a camera: focus point (fx,fy) placed at screen centre, zoom z, plus handheld shake
function camera(ctx, fx, fy, z, shake, sx = W / 2, sy = H / 2) {
  ctx.translate(sx + (shake ? shake.x : 0), sy + (shake ? shake.y : 0));
  if (shake) ctx.rotate(shake.r);
  ctx.scale(z, z); ctx.translate(-fx, -fy);
}

// dust motes floating inside a light shaft
function dustMotes(ctx, t, n, region, seed, alpha = 0.5, size = 2.2) {
  const r = mulberry32(seed);
  ctx.save(); ctx.fillStyle = '#dbe6f3';
  for (let i = 0; i < n; i++) {
    const bx = r(), by = r(), sp = 0.3 + r() * 0.7, ph = r() * 100;
    const x = region.x + ((bx * region.w + Math.sin(t * 0.3 * sp + ph) * 30 + t * 6 * sp) % region.w);
    const y = region.y + ((by * region.h + t * 9 * sp + Math.cos(t * 0.2 + ph) * 20) % region.h);
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * sp * 1.7 + ph));
    const inShaft = region.mask ? region.mask(x, y) : 1;
    if (inShaft <= 0) continue;
    ctx.globalAlpha = alpha * tw * inShaft; ctx.beginPath(); ctx.arc(x, y, size * (0.5 + r()), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------- subtitles ----------
const SUB_Y = 1300;                  // lower-middle safe area (clear of Reels/TikTok bottom UI and right rail)
const SUB_MAXW = 900;
function subtitleText(w) {
  return w.red ? w.text.toLocaleUpperCase('tr-TR') : w.text;
}
function drawSubtitles(ctx, t) {
  const words = window.TL.words;
  let cur = null;
  for (const w of words) { if (t >= w.start && t < w.show_until) { cur = w; break; } }
  if (!cur) return;
  const txt = subtitleText(cur);
  const age = t - cur.start;
  const pop = 0.9 + 0.1 * easeOutBack(clamp(age / 0.16), 1.2);    // very slight grow-in
  let size = 92;
  ctx.save();
  ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`;
  let tw = ctx.measureText(txt).width;
  if (tw > SUB_MAXW) { size = Math.floor(size * SUB_MAXW / tw); ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`; tw = ctx.measureText(txt).width; }
  let jx = 0, jy = 0;
  if (cur.creature) { jx = n1(t * 40, 3) * 3; jy = n1(t * 37, 4) * 3; }
  ctx.translate(W / 2 + jx, SUB_Y + jy); ctx.scale(pop, pop);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = clamp(age / 0.06);
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  // soft drop shadow for legibility on bright frames
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  ctx.lineWidth = 11; ctx.strokeStyle = '#000'; ctx.strokeText(txt, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = cur.red ? '#e3141c' : '#ffffff';
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}
