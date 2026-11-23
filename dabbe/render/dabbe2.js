// DÂBBETÜ'L-ARZ, second design pass: relief-lit sprites (face, body, forelimb) built from height fields.
// Same proportions everywhere: ~4 m, earth-caked stone hide, long forelimbs, a face split by deep fissures, pale amber eyes.
'use strict';
const DB2 = {};
const DLIGHTS = {
  up:   { dir: [0.12, 0.85, 0.5], col: [1.3, 1.16, 0.96] },          // flashlight lying on the ground in front of it
  rim:  { dir: [-0.82, -0.5, -0.28], col: [0.62, 0.78, 1.0], pow: 1.6, shadow: false },   // cold moon from behind, upper left
  top:  { dir: [-0.25, -0.75, 0.6], col: [1.0, 0.98, 0.95] },        // soft overhead (dawn / fill)
  side: { dir: [0.85, 0.05, 0.52], col: [1.25, 1.12, 0.95] },        // flashlight from the right side
};
const STONE = [92, 84, 74], SOIL = [44, 34, 26], DUST = [128, 120, 106];

function rockAlbedo(x, y, crack, low, id) {
  const v = fbm(x * 3, y * 3, 3, 29), soil = clamp(crack * 1.2 + low + (fbm(x * 1.2, y * 1.2, 3, 31) - 0.55) * 1.6);
  let c = mix(STONE, SOIL, soil); c = mix(c, DUST, clamp((id - 0.72) * 3) * (1 - soil) * 0.6);
  const k = 0.82 + v * 0.36; return [c[0] * k, c[1] * k, c[2] * k];
}
// shared surface detail: plates, cracks, deep fissures, roughness (coordinates in "units")
function rockDetail(x, y, sc = 1) {
  const wx = x + (fbm(x * 1.3, y * 1.3, 2, 51) - 0.5) * 0.4, wy = y + (fbm(x * 1.3 + 5, y * 1.3, 2, 52) - 0.5) * 0.4;
  const [d1, d2, id] = cellN(wx * 4.2 * sc, wy * 4.2 * sc, 61);
  const crack = sstep(0.045, 0.0, d2 - d1) * (0.4 + 0.6 * hash2(Math.floor(id * 977), 1, 3));
  const f1 = sstep(0.02, 0.0, Math.abs(fbm(x * 1.4 * sc + 3, y * 4.4 * sc, 3, 41) - 0.5));
  const f2 = sstep(0.012, 0.0, Math.abs(fbm(x * 4.2 * sc, y * 1.3 * sc + 7, 3, 43) - 0.5));
  const rough = (fbm(x * 16 * sc, y * 16 * sc, 4, 7) - 0.5) + (fbm(x * 40 * sc, y * 40 * sc, 2, 8) - 0.5) * 0.5;
  return { dz: -0.045 * crack + (id - 0.5) * 0.05 - 0.2 * f1 - 0.1 * f2 + rough * 0.045, crack: Math.max(crack * 0.6, f1, f2 * 0.8), id };
}

function faceFn(w) {
  const S = w / 2;
  return (i, j) => {
    const y = (j - S * 1.1) / S, x = (i - S) / S + 0.035 * Math.sin(y * 3.1 + 0.5);
    const edge = (fbm(x * 5, y * 5, 3, 13) - 0.5) * (0.12 + 0.3 * sstep(-0.4, -1.0, y));
    const a = 0.72 + 0.12 * sstep(-0.3, 0.6, y) - 0.16 * sstep(0.78, 1.1, y), b = y < 0 ? 1.02 : 1.1;
    const r = Math.pow(Math.abs(x) / a, 2.6) + Math.pow(Math.abs(y) / b, 2.2) + edge;
    if (r > 1.05) return [0, 0, 0, 0, 0];
    let z = Math.sqrt(Math.max(0, 1 - Math.min(1, r))) * 0.85;
    const ax = Math.abs(x), g = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / sx - (dy * dy) / sy);
    const by = -0.3 + 0.16 * x * x;
    z += 0.34 * Math.exp(-((y - by) ** 2) / 0.005) * sstep(0.85, 0.2, ax);                 // heavy, overhanging brow
    z -= 0.08 * Math.exp(-((y - by - 0.07) ** 2) / 0.0015) * sstep(0.8, 0.2, ax);
    z += 0.22 * sstep(-0.55, -1.0, y) * (fbm(x * 5, y * 5, 3, 17) - 0.35);                 // crown of rock outcrops
    z -= 0.78 * g(ax - 0.29, y + 0.14, 0.02, 0.011);                                         // deep eye sockets
    z += 0.06 * g(ax - 0.3, y - 0.02, 0.02, 0.002);
    z += 0.2 * g(ax - 0.5, y - 0.06, 0.022, 0.012);                                          // cheekbones
    z -= 0.2 * g(ax - 0.42, y - 0.34, 0.016, 0.022);                                         // hollow cheeks
    z += 0.13 * g(x, y + 0.02, 0.006, 0.045);                                                // bridge of the nose
    z -= 0.32 * g(ax - 0.075, y - 0.17, 0.0008, 0.004);                                      // nostril slits
    const my = 0.46 + 0.12 * x * x + (fbm(x * 6, 9, 2, 81) - 0.5) * 0.05, mw = 0.0004 + 0.0012 * fbm(x * 9, 3, 2, 82);
    z -= 0.34 * Math.exp(-((y - my) ** 2) / mw) * sstep(0.62, 0.3, ax);                  // mouth: a sealed seam
    z += 0.08 * Math.exp(-((y - my) ** 2) / 0.012) * sstep(0.62, 0.2, ax);
    z += 0.16 * g(x, y - 0.82, 0.07, 0.025);                                                 // heavy chin
    z -= 0.12 * g(ax - 0.66, y + 0.3, 0.01, 0.03);                                           // sunken temples
    // three deep fissures that split the face
    const fiss = (d, w) => sstep(w, 0, Math.abs(d));
    const w1 = 0.016 + 0.012 * fbm(y * 6, 1, 2, 71), w2 = 0.012 + 0.01 * fbm(y * 7, 2, 2, 72), w3 = 0.01 + 0.008 * fbm(x * 7, 3, 2, 73);
    const F1 = fiss(x - (-0.13 + 0.07 * Math.sin(y * 4.1 + 1) + 0.03 * fbm(y * 9, 4, 2, 74)), w1) * sstep(-1.0, -0.9, y) * sstep(1.0, 0.85, y);
    const F2 = fiss(x - (0.4 + 0.05 * Math.sin(y * 5.3) + 0.03 * fbm(y * 9, 5, 2, 75)), w2) * sstep(-0.95, -0.8, y) * sstep(0.35, 0.15, y);
    const F3 = fiss(y - (-0.64 + 0.05 * Math.sin(x * 7) + 0.02 * fbm(x * 9, 6, 2, 76)), w3) * sstep(-0.75, -0.6, x) * sstep(0.55, 0.4, x);
    const FF = Math.max(F1, F2, F3);
    z -= 0.42 * FF;
    const D = rockDetail(x, y, 1);
    z += D.dz;
    const low = clamp(0.3 - z) * 1.5 + sstep(0.6, 1.0, y) * 0.3;
    let c = rockAlbedo(x, y, Math.max(D.crack, FF), low, D.id);
    if (FF > 0.5) c = mix(c, [10, 8, 7], (FF - 0.5) * 1.8);
    return [z * S * 0.42, sstep(1.05, 0.96, r), c[0], c[1], c[2]];
  };
}

// primitive volumes for the body (metres; feet/hands at y=0, top of the hump at ~-4.1)
const BODY_P = (() => {
  const P = [];
  const E = (cx, cy, rx, ry, z0, zr, tag) => P.push({ t: 'e', cx, cy, rx, ry, z0, zr, tag });
  const C = (ax, ay, bx, by, r, z0, zr, tag) => P.push({ t: 'c', ax, ay, bx, by, r, z0, zr, tag });
  E(0, -2.45, 1.55, 1.3, 0.6, 1.4); E(0, -3.3, 1.25, 0.78, 0.3, 1.1);
  for (const s of [-1, 1]) {
    E(s * 1.35, -3.0, 0.78, 0.68, 0.45, 0.95); E(s * 0.95, -0.9, 0.85, 0.78, 0.2, 0.9);
    C(s * 1.42, -2.95, s * 2.25, -1.62, 0.5, 0.95, 0.6); C(s * 2.25, -1.62, s * 1.95, -0.35, 0.43, 1.05, 0.52);
    E(s * 1.92, -0.22, 0.58, 0.26, 1.15, 0.32);
    for (let k = 0; k < 4; k++) C(s * 1.92 + (k - 1.5) * 0.26, -0.16, s * 1.92 + (k - 1.5) * 0.36, 0.12, 0.075, 1.3, 0.12, 'claw');
  }
  return P;
})();
function bodyFn(w, h, ppm, oy) {
  const roots = Array.from({ length: 14 }, (_, k) => { const r = mulberry32(300 + k); const x0 = -1.2 + k * 0.18 + r() * 0.1; const pts = [[x0, -1.35 + r() * 0.2]]; let x = x0, y = pts[0][1]; for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 0.12; y += 0.1 + r() * 0.06; pts.push([x, y]); } return pts; });
  return (i, j) => {
    const x = (i - w / 2) / ppm, y = (j - oy) / ppm;
    const nq = (fbm(x * 2.6, y * 2.6, 3, 17) - 0.5) * 0.3;
    let z = -1, tag = null, inside = 0;
    for (const p of BODY_P) {
      let q;
      if (p.t === 'e') { const dx = (x - p.cx) / p.rx, dy = (y - p.cy) / p.ry; q = dx * dx + dy * dy; }
      else { const vx = p.bx - p.ax, vy = p.by - p.ay, u = clamp(((x - p.ax) * vx + (y - p.ay) * vy) / (vx * vx + vy * vy)); const dx = x - p.ax - vx * u, dy = y - p.ay - vy * u; q = (dx * dx + dy * dy) / (p.r * p.r); }
      q += p.tag === 'claw' ? 0 : nq;
      if (q < 1) { const zz = p.z0 + p.zr * Math.sqrt(1 - q); if (zz > z) { z = zz; tag = p.tag; } inside = Math.max(inside, sstep(1, 0.9, q)); }
    }
    // roots dangling under the belly
    let root = 0;
    if (y > -1.5 && y < -0.5 && Math.abs(x) < 1.4) for (const R of roots) for (let s = 0; s < R.length - 1; s++) {
      const [ax, ay] = R[s], [bx, by] = R[s + 1], vx = bx - ax, vy = by - ay, u = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy));
      const d = Math.hypot(x - ax - vx * u, y - ay - vy * u); if (d < 0.025 * (1 - s / 7)) root = 1;
    }
    if (inside <= 0 && !root) return [0, 0, 0, 0, 0];
    if (root && inside <= 0) return [40, 1, 34, 26, 20];
    const D = rockDetail(x * 0.55, y * 0.55, 1);
    z += D.dz * 1.6;
    let c = tag === 'claw' ? [42, 38, 34] : rockAlbedo(x * 0.5, y * 0.5, D.crack, sstep(-1.6, -0.2, y) * 0.7, D.id);
    if (root) c = [36, 28, 22];
    return [z * ppm * 0.5, inside, c[0], c[1], c[2]];
  };
}
// forelimb bursting up out of the ground, fingers spread (metres; ground at y=0)
const LIMB_P = (() => {
  const P = [];
  const C = (ax, ay, bx, by, r, z0, zr, tag) => P.push({ t: 'c', ax, ay, bx, by, r, z0, zr, tag });
  C(0.25, 0.6, -0.05, -2.2, 0.46, 0.3, 0.6); C(-0.05, -2.2, -0.12, -2.75, 0.44, 0.45, 0.55);
  P.push({ t: 'e', cx: -0.12, cy: -2.85, rx: 0.56, ry: 0.42, z0: 0.5, zr: 0.45 });
  const fing = [[-0.52, -3.05, -0.95, -3.7, -0.9, -4.05], [-0.24, -3.18, -0.42, -3.95, -0.3, -4.35], [0.06, -3.18, 0.14, -3.98, 0.32, -4.32], [0.34, -3.0, 0.62, -3.68, 0.82, -3.98]];
  for (const [ax, ay, bx, by, cx, cy] of fing) { C(ax, ay, bx, by, 0.15, 0.7, 0.2); C(bx, by, cx, cy, 0.12, 0.75, 0.16); C(cx, cy, cx + (cx - bx) * 0.55, cy + (cy - by) * 0.55, 0.05, 0.85, 0.08, 'claw'); }
  C(-0.6, -2.7, -1.05, -2.95, 0.15, 0.6, 0.18); C(-1.05, -2.95, -1.25, -3.3, 0.06, 0.7, 0.08, 'claw');
  return P;
})();
function limbFn(w, h, ppm, oy) {
  return (i, j) => {
    const x = (i - w / 2) / ppm, y = (j - oy) / ppm, nq = (fbm(x * 3.2, y * 3.2, 3, 19) - 0.5) * 0.28;
    let z = -1, tag = null, inside = 0;
    for (const p of LIMB_P) {
      let q;
      if (p.t === 'e') { const dx = (x - p.cx) / p.rx, dy = (y - p.cy) / p.ry; q = dx * dx + dy * dy; }
      else { const vx = p.bx - p.ax, vy = p.by - p.ay, u = clamp(((x - p.ax) * vx + (y - p.ay) * vy) / (vx * vx + vy * vy)); const dx = x - p.ax - vx * u, dy = y - p.ay - vy * u; q = (dx * dx + dy * dy) / (p.r * p.r); }
      q += p.tag === 'claw' ? 0 : nq;
      if (q < 1) { const zz = p.z0 + p.zr * Math.sqrt(1 - q); if (zz > z) { z = zz; tag = p.tag; } inside = Math.max(inside, sstep(1, 0.88, q)); }
    }
    if (inside <= 0) return [0, 0, 0, 0, 0];
    const D = rockDetail(x * 0.9, y * 0.9, 1);
    z += D.dz * 1.2;
    const c = tag === 'claw' ? [40, 36, 32] : rockAlbedo(x, y, D.crack, sstep(-1.2, 0.3, y) * 0.9, D.id);
    return [z * ppm * 0.5, inside, c[0], c[1], c[2]];
  };
}

function buildDabbe2() {
  const t0 = performance.now();
  DB2.face = buildRelief(820, 940, faceFn(820), DLIGHTS, { bump: 1.0, ao1: 4, ao2: 22, aoK1: 0.05, aoK2: 0.018 });
  DB2.body = buildRelief(1000, 860, bodyFn(1000, 860, 170, 815), DLIGHTS, { bump: 1.0, ao1: 4, ao2: 18 });
  DB2.limb = buildRelief(640, 1260, limbFn(640, 1260, 250, 1150), DLIGHTS, { bump: 1.0, ao1: 4, ao2: 16 });
  DB2.ms = performance.now() - t0;
}

// eyes in face-sprite units: centres at x = ±0.3, y = -0.15 (unit = sprite width / 2)
function dabbeEyes2(ctx, ex, ey, r, open, glow, t) {
  if (open <= 0.01) return;
  for (const sx of [-1, 1]) {
    const x = ex + sx * r * 4.3, y = ey;
    radial(ctx, x, y, r * 7, [[0, `rgba(255,170,60,${0.28 * glow * open})`], [0.3, `rgba(200,110,30,${0.1 * glow * open})`], [1, 'rgba(0,0,0,0)']], 'screen');
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.78 * open, 0, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(x + n1(t * 0.3, sx) * r * 0.1, y, 0, x, y, r * 1.3);
    g.addColorStop(0, `rgba(255,240,196,${0.95 * glow})`); g.addColorStop(0.35, `rgba(246,200,120,${0.92 * glow})`); g.addColorStop(0.8, `rgba(170,104,40,${0.9 * glow})`); g.addColorStop(1, `rgba(60,28,8,${0.9 * glow})`);
    ctx.fillStyle = g; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();
    // heavy stone lid edge
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.78 * open, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
}

// face close-up: (x,y) = face centre on screen, s = px per sprite-unit*... (face width on screen = s)
// o: {t, up, rim, top, side (light amounts), amb, eyes (open 0..1), glow, dark (vignette 0..1), tilt}
function drawDabbeFace2(ctx, x, y, s, o = {}) {
  const R = DB2.face, k = s / R.w, t = o.t || 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt || 0); ctx.scale(k, k * (1 + Math.sin(t * 0.6) * 0.004));
  drawRelief(ctx, R, -R.w / 2, -R.w * 0.55, R.w, R.h, [['base', o.amb ?? 0.12], ['up', o.up ?? 0.9, o.upFall || [R.w * 0.5 + (o.upX || 0) * R.w, R.h * 1.05, R.h * 0.95]], ['rim', o.rim ?? 0.4], ['top', o.top ?? 0], ['side', o.side ?? 0, [R.w * 1.05, R.h * 0.5, R.w * 1.1]]]);
  ctx.restore();
  // darkness eats the edges
  if (o.dark) { const g = ctx.createRadialGradient(x, y, s * 0.15, x, y, s * (0.35 + 0.6 * (1 - o.dark))); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.97 * o.dark})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const ex = x, ey = y + (-0.15 - 0.0) * (s / 2) * Math.cos(o.tilt || 0);
  dabbeEyes2(ctx, ex, ey, s * 0.034, o.eyes ?? 1, o.glow ?? 1, t);
  // soil trickling from the fissures
  if (o.soil !== 0) { const r = mulberry32(77); ctx.fillStyle = 'rgba(70,56,42,0.85)'; for (let i = 0; i < 40; i++) { const px = x + (r() - 0.5) * s * 0.8, ph = (t * (0.2 + r() * 0.3) + r()) % 1, py = y - s * 0.3 + ph * s * 1.4, sz = 1 + r() * s * 0.006; ctx.fillRect(px, py, sz, sz * 1.4); } }
}

// full body: (x,y) = ground point under the chest, s = px per metre. head drawn from the face sprite.
// o: {t, rise (0..1 out of the ground), groundY, headLower 0..1, up, rim, top, side, amb, eyes, glow, alpha, sil}
function drawDabbeBody2(ctx, x, y, s, o = {}) {
  const t = o.t || 0, B = DB2.body, rise = o.rise ?? 1, br = Math.sin(t * 0.65) * 0.012;
  const ppm = 170, oy = y + (1 - rise) * 4.6 * s;
  const passes = o.sil ? [['rim', o.rim ?? 0.5]] : [['base', o.amb ?? 0.12], ['up', o.up ?? 0.9, [B.w * (0.5 + (o.upX || 0)), B.h * 1.02, B.h * 1.15]], ['rim', o.rim ?? 0.45], ['top', o.top ?? 0], ['side', o.side ?? 0]];
  ctx.save();
  if (o.groundY !== undefined) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, o.groundY + H); ctx.clip(); }
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(x, oy); ctx.scale(s / ppm, (s / ppm) * (1 + br));
  drawRelief(ctx, B, -B.w / 2, -815, B.w, B.h, passes);
  ctx.restore();
  // head: hung low between the shoulders, lowered towards the camera on cue
  const hl = o.headLower || 0, hx = x + n1(t * 0.18, 4) * 0.04 * s, hy = oy + (-2.95 + hl * 1.25 + br * 2) * s, hs = 1.25 * s * (1 + hl * 0.12);
  ctx.save();
  if (o.groundY !== undefined) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, o.groundY + H); ctx.clip(); }
  ctx.globalAlpha = o.alpha ?? 1;
  const F = DB2.face, kf = hs / F.w;
  ctx.translate(hx, hy); ctx.rotate((o.tilt || 0) + n1(t * 0.15, 9) * 0.02); ctx.scale(kf, kf);
  drawRelief(ctx, F, -F.w / 2, -F.w * 0.55, F.w, F.h, o.sil ? [['rim', (o.rim ?? 0.5) * 0.8]] : [['base', o.amb ?? 0.12], ['up', (o.up ?? 0.9) * (0.55 + hl * 0.6), [F.w * 0.5, F.h * 1.1, F.h * 1.0]], ['rim', o.rim ?? 0.45], ['top', o.top ?? 0], ['side', o.side ?? 0]]);
  ctx.restore();
  const eyY = hy + (-0.15) * hs / 2;
  if ((o.eyes ?? 1) > 0 && (o.groundY === undefined || eyY < o.groundY)) dabbeEyes2(ctx, hx, eyY, hs * 0.034, o.eyes ?? 1, (o.glow ?? 1) * (o.alpha ?? 1), t);
  return { hx, hy: eyY };
}

// forelimb close-up: (x,y) = where it breaks the ground; s = px per metre; k = 0..1 out of the ground
function drawDabbeLimb2(ctx, x, y, s, o = {}) {
  const L = DB2.limb, k = o.k ?? 1, ppm = 250, t = o.t || 0;
  ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, 3 * W, y + H + (o.below || 0)); ctx.clip();
  ctx.translate(x, y + (1 - easeOut(k)) * 4.4 * s); ctx.rotate((o.rot || 0) + n1(t * 0.5, 3) * 0.01 * k); ctx.scale(s / ppm, s / ppm);
  drawRelief(ctx, L, -L.w / 2, -1150, L.w, L.h, [['base', o.amb ?? 0.12], ['up', o.up ?? 0.9, [L.w * 0.4, L.h * 0.95, L.h * 0.85]], ['rim', o.rim ?? 0.4], ['side', o.side ?? 0]]);
  ctx.restore();
}
