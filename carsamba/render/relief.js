// Relief sprites: procedural height fields turned into lit, painted textures (per-pixel normals, ambient occlusion,
// albedo). Built once per page; at runtime the lighting passes are blended additively so a light can move or flicker.
'use strict';

// cellular noise: distance to the nearest and second nearest feature point, id of the nearest cell
function cellN(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j;
    const px = cx + hash2(cx, cy, seed), py = cy + hash2(cx, cy, seed + 1);
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < d1) { d2 = d1; d1 = d; id = hash2(cx, cy, seed + 2); } else if (d < d2) d2 = d;
  }
  return [Math.sqrt(d1), Math.sqrt(d2), id];
}
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let j = 0; j < h; j++) {
    let s = 0; const row = j * w;
    for (let i = -r; i <= r; i++) s += src[row + clamp(i, 0, w - 1)];
    for (let i = 0; i < w; i++) { tmp[row + i] = s / n; s += src[row + Math.min(w - 1, i + r + 1)] - src[row + Math.max(0, i - r)]; }
  }
  for (let i = 0; i < w; i++) {
    let s = 0;
    for (let j = -r; j <= r; j++) s += tmp[clamp(j, 0, h - 1) * w + i];
    for (let j = 0; j < h; j++) { out[j * w + i] = s / n; s += tmp[Math.min(h - 1, j + r + 1) * w + i] - tmp[Math.max(0, j - r) * w + i]; }
  }
  return out;
}

// fn(x, y) in sprite pixels -> [height (px), mask 0..1, r, g, b]
// lights: {name: {dir:[x,y,z] towards the light (y down, z to the viewer), col:[r,g,b], wrap}}
function buildRelief(w, h, fn, lights, o = {}) {
  const N = w * h, Z = new Float32Array(N), M = new Float32Array(N), A = new Float32Array(N * 3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const r = fn(i, j), k = j * w + i;
    Z[k] = r[0]; M[k] = r[1]; A[k * 3] = r[2]; A[k * 3 + 1] = r[3]; A[k * 3 + 2] = r[4];
  }
  const B1 = boxBlur(Z, w, h, o.ao1 || 4), B2 = boxBlur(Z, w, h, o.ao2 || 16);
  const bump = o.bump || 1, out = {};
  const mk = (name, shade) => {
    const c = makeCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i; if (M[k] <= 0) continue;
      let nx = -(Z[k + 1] - Z[k - 1]) * 0.5 * bump, ny = -(Z[k + w] - Z[k - w]) * 0.5 * bump, nz = 1;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const ao = clamp(1 - Math.max(0, B1[k] - Z[k]) * (o.aoK1 || 0.06) - Math.max(0, B2[k] - Z[k]) * (o.aoK2 || 0.02), 0.08, 1);
      const s = shade(nx, ny, nz, ao, k);
      d[k * 4] = clamp(A[k * 3] * s[0], 0, 255); d[k * 4 + 1] = clamp(A[k * 3 + 1] * s[1], 0, 255); d[k * 4 + 2] = clamp(A[k * 3 + 2] * s[2], 0, 255);
      d[k * 4 + 3] = M[k] * 255;
    }
    x.putImageData(img, 0, 0); out[name] = c;
  };
  mk('base', (nx, ny, nz, ao) => [ao, ao, ao]);
  for (const [name, L] of Object.entries(lights)) {
    const l = Math.hypot(...L.dir), lx = L.dir[0] / l, ly = L.dir[1] / l, lz = L.dir[2] / l, wr = L.wrap || 0;
    // cast shadows: march the height field towards the light
    let SH = null;
    if (L.shadow !== false && Math.hypot(lx, ly) > 0.05) {
      SH = new Float32Array(N);
      const pl = Math.hypot(lx, ly), sx = lx / pl, sy = ly / pl, slope = lz / pl, soft = o.soft || 6;
      const steps = []; for (let k = 1; k <= 26; k++) steps.push(1.5 + k * k * 0.42);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k0 = j * w + i; if (M[k0] <= 0) continue;
        const z0 = Z[k0]; let occ = 0;
        for (const d of steps) {
          const qi = (i + sx * d) | 0, qj = (j + sy * d) | 0;
          if (qi < 0 || qj < 0 || qi >= w || qj >= h) break;
          const q = qj * w + qi; if (M[q] <= 0) continue;
          const e = (Z[q] - z0 - d * slope) / soft; if (e > occ) { occ = e; if (occ >= 1) break; }
        }
        SH[k0] = clamp(occ);
      }
    }
    mk(name, (nx, ny, nz, ao, k) => {
      const nd = (nx * lx + ny * ly + nz * lz + wr) / (1 + wr);
      const dd = Math.max(0, nd) ** (L.pow || 1) * (L.ao === false ? 1 : ao) * (SH ? 1 - SH[k] * (L.shade ?? 0.92) : 1);
      return [dd * L.col[0], dd * L.col[1], dd * L.col[2]];
    });
  }
  out.w = w; out.h = h;
  return out;
}

// draw a relief sprite lit by the chosen passes into ctx (current transform), at sprite-pixel rect (dx,dy,dw,dh)
// passes: [['base', 0.25], ['up', 0.9], ['rim', 0.5]]
const RLBUF = { c: null };
function drawRelief(ctx, R, dx, dy, dw, dh, passes, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // opaque dark silhouette first, then add each light pass on top of it
  ctx.drawImage(R.sil || (R.sil = silhouetteOf(R.base, o.silCol || [4, 4, 5])), dx, dy, dw, dh);
  ctx.globalCompositeOperation = 'lighter';
  for (const [name, k, fall] of passes) {
    if (k <= 0.003 || !R[name]) continue;
    let src = R[name];
    if (fall) {                                   // light falls off around a point given in sprite pixels
      if (!RLBUF.c) { RLBUF.c = makeCanvas(1100, 1300); RLBUF.x = RLBUF.c.getContext('2d'); }
      const b = RLBUF.x; b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, R.w, R.h);
      b.drawImage(src, 0, 0); b.globalCompositeOperation = 'destination-in';
      const g = b.createRadialGradient(fall[0], fall[1], 0, fall[0], fall[1], fall[2]);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = g; b.fillRect(0, 0, R.w, R.h); b.globalCompositeOperation = 'source-over';
      src = RLBUF.c;
    }
    const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * Math.min(1, k);
    if (fall) ctx.drawImage(src, 0, 0, R.w, R.h, dx, dy, dw, dh); else ctx.drawImage(src, dx, dy, dw, dh);
    if (k > 1) { ctx.globalAlpha = a0 * Math.min(1, k - 1); if (fall) ctx.drawImage(src, 0, 0, R.w, R.h, dx, dy, dw, dh); else ctx.drawImage(src, dx, dy, dw, dh); }
    ctx.globalAlpha = a0;
  }
  ctx.restore();
}
function silhouetteOf(c, col) {
  const s = makeCanvas(c.width, c.height), x = s.getContext('2d');
  x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(0, 0, s.width, s.height);
  return s;
}
