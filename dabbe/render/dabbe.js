// DÂBBETÜ'L-ARZ (fictional design): ~4 m, earth-caked stone hide, huge forelimbs, a face split by deep fissures,
// pale amber eyes. One parametric model for the full body, the face close-up and the emerging limb.
'use strict';
const DAB = { stone: [124, 116, 102], soil: [70, 54, 40], dark: [10, 9, 8] };
let DBUF = null, DX = null;
function buildDabbe() {
  DBUF = makeCanvas(W, H); DX = DBUF.getContext('2d');
  DAB.tex = noiseCanvas(512, 512, 1, 1, 808, (v, i, j) => {
    const f = fbm(i / 30, j / 30, 5, 3), plates = Math.abs(fbm(i / 55, j / 55, 3, 8) - 0.5) < 0.018 ? 75 : 0;
    const fine = Math.abs(fbm(i / 14, j / 14, 3, 11) - 0.5) < 0.01 ? 40 : 0;
    const soil = fbm(i / 80, j / 80, 3, 21) > 0.58 ? 1 : 0;
    let g = 130 + (f - 0.5) * 140 - plates - fine;
    return soil ? [g * 0.75, g * 0.6, g * 0.45, 255] : [g, g * 0.95, g * 0.88, 255];
  });
  const r = mulberry32(81);
  // fissures on the face (in face units: head width ~2, centre at 0)
  DAB.fiss = Array.from({ length: 16 }, () => {
    let x = (r() - 0.5) * 1.6, y = -0.7 + r() * 1.2, a = Math.PI / 2 + (r() - 0.5) * 1.6; const pts = [[x, y]];
    for (let k = 0; k < 7; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 0.09; y += Math.sin(a) * 0.09; pts.push([x, y]); }
    return { pts, w: 0.012 + r() * 0.03 };
  });
  DAB.pebbles = Array.from({ length: 80 }, () => [r(), r(), r(), r()]);
}

// rough rock outline through control points: catmull-rom + noise along the normal
function rockPath(P, pts, jag, seed, closed = true) {
  const out = [], n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let k = 0; k < 6; k++) {
      const u = k / 6, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nz = (vnoise(i * 6 + k, 0.5, seed) - 0.5) * 2 * jag + (vnoise((i * 6 + k) * 0.3, 1.5, seed + 1) - 0.5) * 2 * jag * 1.6;
      out.push([x - dy / d * nz, y + dx / d * nz]);
    }
  }
  spline(P, out, closed, 0.5);
}

function dabbePose(o = {}) {
  const t = o.t || 0, lw = o.headLower || 0, br = Math.sin(t * 0.7) * 0.03;       // slow, heavy breathing
  const J = {
    torso: [[-1.6, -1.0], [-2.0, -2.5 + br], [-1.5, -3.5 + br], [-0.6, -4.05 + br], [0.6, -4.1 + br], [1.5, -3.5 + br], [2.0, -2.5 + br], [1.6, -1.0], [0, -0.7]],
    head: [0.05 + n1(t * 0.2, 4) * 0.04, -2.95 + lw * 1.15 + br], hs: 1 + lw * 0.05,
    shL: [-1.5, -3.25 + br], shR: [1.5, -3.2 + br], elL: [-2.45, -1.85], elR: [2.4, -1.9], haL: [-1.95, -0.05], haR: [2.0, -0.05],
  };
  if (o.reach) { J.elR = [2.0, -2.4 + o.reach * 0.4]; J.haR = [1.2 + o.reach * 0.3, -0.3 - o.reach * 0.5]; }
  return J;
}

function limbPath(P, a, b, w1, w2, seed) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  rockPath(P, [[a[0] - nx * w1 / 2, a[1] - ny * w1 / 2], [lerp(a[0], b[0], 0.5) - nx * w1 * 0.55, lerp(a[1], b[1], 0.5) - ny * w1 * 0.55], [b[0] - nx * w2 / 2, b[1] - ny * w2 / 2],
    [b[0] + nx * w2 / 2, b[1] + ny * w2 / 2], [lerp(a[0], b[0], 0.5) + nx * w1 * 0.5, lerp(a[1], b[1], 0.5) + ny * w1 * 0.5], [a[0] + nx * w1 / 2, a[1] + ny * w1 / 2]], 0.04, seed);
}
function handRock(P, w, s, seed, splay = 0) {
  // broad stone hand planted on the ground: palm + four thick clawed fingers
  rockPath(P, [[w[0] - 0.45 * s, w[1] - 0.15], [w[0] + 0.45 * s, w[1] - 0.15], [w[0] + 0.55 * s, w[1] + 0.1], [w[0] - 0.55 * s, w[1] + 0.1]], 0.05, seed);
  const tips = [];
  for (let k = 0; k < 4; k++) {
    const fx = w[0] + (k - 1.5) * 0.28 * s, a = Math.PI / 2 + (k - 1.5) * (0.25 + splay);
    const b = [fx + Math.cos(a) * 0.15, w[1] + 0.05 + Math.sin(a) * 0.2], c = [b[0] + Math.cos(a) * 0.3 * s, w[1] + 0.12];
    limbPath(P, [fx, w[1]], b, 0.17, 0.14, seed + k); limbPath(P, b, c, 0.14, 0.06, seed + k + 9);
    tips.push(c);
  }
  return tips;
}

// head path in head units (width ~2.0, centre 0,0); jaw at +0.6, crown at -0.75
function headPath(P, seed) {
  rockPath(P, [[-1.0, -0.2], [-0.85, -0.62], [-0.3, -0.78], [0.3, -0.8], [0.88, -0.6], [1.02, -0.18], [0.9, 0.3], [0.5, 0.62], [0, 0.7], [-0.5, 0.6], [-0.9, 0.3]], 0.03, seed);
}
function drawDabbeHeadDetail(g, o) {
  const t = o.t || 0;
  // brow ridge shadow, sockets, a fissure for a mouth, nostril crevices
  radialEllipse(g, 0, -0.18, 0.95, 0.22, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
  for (const sx of [-1, 1]) radialEllipse(g, sx * 0.36, -0.12, 0.24, 0.16, [[0, 'rgba(0,0,0,0.95)'], [0.6, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]);
  g.fillStyle = 'rgba(0,0,0,0.9)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.09, 0.16, 0.03, 0.08, sx * 0.3, 0, TAU); g.fill(); }
  g.beginPath(); g.moveTo(-0.55, 0.38); g.quadraticCurveTo(0, 0.44, 0.55, 0.37); g.lineTo(0.5, 0.4); g.quadraticCurveTo(0, 0.48, -0.5, 0.41); g.closePath(); g.fill();
  g.lineCap = 'round';
  for (const F of DAB.fiss) {
    g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = F.w; g.beginPath(); F.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.strokeStyle = 'rgba(210,200,180,0.18)'; g.lineWidth = F.w * 0.4; g.beginPath(); F.pts.forEach(([x, y], i) => (i ? g.lineTo(x + F.w, y - F.w) : g.moveTo(x + F.w, y - F.w))); g.stroke();
  }
  // soil trickling out of the fissures
  g.fillStyle = 'rgba(60,46,34,0.8)';
  for (const [a, b, c] of DAB.pebbles.slice(0, 30)) { const y = ((t * 0.3 + b) % 1) * 1.4 - 0.4; g.fillRect((a - 0.5) * 1.6, y, 0.012 + c * 0.012, 0.012 + c * 0.012); }
}

// full body; x,y = ground point under the chest, s = px per metre.
// o: {t, rise 0..1 (out of the ground), headLower, eyes, light:{x,y,I,R} (screen), amb, silhouette, dust, alpha, ground (screen y of the ground line)}
function drawDabbe(ctx, x, y, s, o = {}) {
  const t = o.t || 0, J = dabbePose(o), g = DX, rise = o.rise ?? 1;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, W, H);
  g.save(); g.translate(x, y + (1 - rise) * 4.3 * s); g.scale(s, s);
  const P = new Path2D();
  rockPath(P, J.torso, 0.12, 3);
  limbPath(P, J.shL, J.elL, 0.95, 0.75, 11); limbPath(P, J.elL, J.haL, 0.75, 0.55, 12);
  limbPath(P, J.shR, J.elR, 0.95, 0.75, 13); limbPath(P, J.elR, J.haR, 0.75, 0.55, 14);
  handRock(P, J.haL, 1, 21); handRock(P, J.haR, 1, 31);
  g.fillStyle = col(DAB.stone); g.fill(P);
  g.save(); g.clip(P);
  g.globalCompositeOperation = 'multiply'; g.drawImage(DAB.tex, -2.6, -4.3, 5.2, 4.5); g.globalCompositeOperation = 'source-over';
  g.fillStyle = linGrad(g, 0, -4.2, 0, 0, [[0, 'rgba(0,0,0,0.2)'], [0.6, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0.8)']]); g.fillRect(-3, -4.5, 6, 4.6);
  // shoulder masses and the cavity under the head
  radialEllipse(g, 0, J.head[1] + 0.6, 1.0, 0.9, [[0, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]);
  for (const sx of [-1, 1]) radialEllipse(g, sx * 1.1, -3.4, 0.6, 0.35, [[0, 'rgba(220,210,190,0.12)'], [1, 'rgba(0,0,0,0)']]);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.02; g.stroke(P);
  // head
  g.save(); g.translate(J.head[0], J.head[1]); g.scale(0.62 * J.hs, 0.62 * J.hs);
  const HP = new Path2D(); headPath(HP, 7);
  g.fillStyle = col(DAB.stone); g.fill(HP);
  g.save(); g.clip(HP); g.globalCompositeOperation = 'multiply'; g.drawImage(DAB.tex, -1.2, -1, 2.4, 2); g.globalCompositeOperation = 'source-over';
  drawDabbeHeadDetail(g, o); g.restore();
  g.restore();
  g.restore();
  // ground clip while it is still coming out of the earth
  if (o.ground !== undefined) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(0, o.ground, W, H - o.ground); }
  // lighting
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(3,4,6,${clamp(0.78 - (o.amb ?? 0.12) * 1.5)})`; g.fillRect(0, 0, W, H);
  if (o.light && o.light.I > 0) {
    const L = o.light, R = (L.R || 2.6) * s, gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, R);
    gr.addColorStop(0, `rgba(255,236,200,${0.85 * Math.min(1, L.I)})`); gr.addColorStop(0.45, `rgba(200,180,150,${0.45 * Math.min(1, L.I)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'overlay'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-atop';
  }
  if (o.silhouette) { g.fillStyle = col(o.silhouette, o.silhouette[3] ?? 0.95); g.fillRect(0, 0, W, H); }
  if (o.fog) { g.fillStyle = col(FOG_COL, o.fog); g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.drawImage(DBUF, 0, 0); ctx.restore();
  // eyes: pale amber, deep in the sockets
  const hy = y + (1 - rise) * 4.3 * s + J.head[1] * s, hx = x + J.head[0] * s;
  if ((o.eyes ?? 1) > 0 && (o.ground === undefined || hy < o.ground)) dabbeEyes(ctx, hx, hy - 0.08 * s, 0.45 * s * J.hs, o.eyes ?? 1, t, 1.1);
  // dust and falling soil
  if (o.dust > 0) dustCloud(ctx, x, (o.ground ?? y), s, o.dust, t);
  return { hx, hy };
}

function dustCloud(ctx, x, y, s, a, t) {
  for (let i = 0; i < 26; i++) {
    const ph = (t * 0.15 + i * 0.137) % 1, u = (hash2(i, 1, 9) - 0.5) * 6;
    const px = x + u * s + n1(t * 0.3 + i, 2) * 0.4 * s, py = y - ph * 3.2 * s, r = (0.6 + ph * 1.6) * s;
    radial(ctx, px, py, r, [[0, `rgba(120,108,92,${0.2 * a * (1 - ph)})`], [1, 'rgba(60,54,46,0)']]);
  }
}

// face close-up: x,y = face centre, s = px per metre (head ~1.25 m wide)
function drawDabbeFace(ctx, x, y, s, o = {}) {
  const g = DX, t = o.t || 0;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  g.save(); g.translate(x, y); g.scale(s * 0.62, s * 0.62);
  // shoulders/neck mass behind the head
  const N = new Path2D(); rockPath(N, [[-2.6, 0.2], [-1.2, -0.3], [1.2, -0.3], [2.6, 0.2], [2.8, 2.5], [-2.8, 2.5]], 0.08, 5);
  g.fillStyle = col(mix(DAB.stone, [0, 0, 0], 0.4)); g.fill(N);
  g.save(); g.clip(N); g.globalCompositeOperation = 'multiply'; g.drawImage(DAB.tex, -3, -0.5, 6, 3); g.restore();
  const HP = new Path2D(); headPath(HP, 7);
  g.fillStyle = col(DAB.stone); g.fill(HP);
  g.save(); g.clip(HP); g.globalCompositeOperation = 'multiply'; g.drawImage(DAB.tex, -1.2, -1, 2.4, 2); g.globalCompositeOperation = 'source-over';
  drawDabbeHeadDetail(g, o); g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.012; g.stroke(HP);
  g.restore();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(3,4,6,${clamp(0.74 - (o.amb ?? 0.1) * 1.5)})`; g.fillRect(0, 0, W, H);
  if (o.light && o.light.I > 0) {
    const L = o.light, R = (L.R || 1.4) * s, gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, R);
    gr.addColorStop(0, `rgba(255,236,200,${0.75 * L.I})`); gr.addColorStop(0.5, `rgba(180,160,130,${0.35 * L.I})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'overlay'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  if (o.reveal !== undefined) {   // darkness swallowing most of it
    g.globalCompositeOperation = 'source-atop';
    const rg = g.createRadialGradient(x + (o.revealX || 0) * s, y, s * 0.2, x + (o.revealX || 0) * s, y, s * (0.3 + o.reveal * 1.2));
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.92)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(DBUF, 0, 0);
  const ea = o.eyes ?? 1;
  if (ea > 0) dabbeEyes(ctx, x, y - 0.075 * s, 0.45 * s, ea * (o.glow ?? 1), t, 1.15);
}

// the forelimb tearing up out of the ground. x,y = where it breaks the surface; k = 0..1 out
function drawDabbeLimb(ctx, x, y, s, o = {}) {
  const g = DX, t = o.t || 0, k = o.k ?? 1;
  void 0;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  g.save(); g.translate(x, y); g.scale(s, s);
  const up = -2.2 * easeOut(k), ang = -0.5;
  const el = [0.3, 0.4 + up * 0.55], wr = [-0.35 + Math.sin(ang) * 0.2, up * 1.05 + 0.25 * (1 - k)];
  const P = new Path2D(); limbPath(P, [0.6, 1.2], el, 1.0, 0.8, 41); limbPath(P, el, wr, 0.8, 0.62, 42);
  const tips = [];
  // claws curling forward/down as it slams the ground
  for (let q = 0; q < 4; q++) {
    const a = -Math.PI / 2 - 0.9 + q * 0.32 + k * 0.7, b = [wr[0] + Math.cos(a) * 0.45, wr[1] + Math.sin(a) * 0.45], c = [b[0] + Math.cos(a + 0.9 * k) * 0.45, b[1] + Math.sin(a + 0.9 * k) * 0.45];
    limbPath(P, wr, b, 0.24, 0.18, 50 + q); limbPath(P, b, c, 0.18, 0.05, 60 + q); tips.push(c);
  }
  g.fillStyle = col(DAB.stone); g.fill(P);
  g.save(); g.clip(P); g.globalCompositeOperation = 'multiply'; g.drawImage(DAB.tex, -1.5, -3.2, 3, 4.6); g.globalCompositeOperation = 'source-over';
  g.fillStyle = linGrad(g, -1, 0, 1.2, 0, [[0, 'rgba(255,240,210,0.12)'], [0.5, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0.85)']]); g.fillRect(-2, -4, 4, 6);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.015; g.stroke(P);
  g.restore();
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(0, y + 2, W, H);   // still in the ground below
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(3,4,6,${0.45})`; g.fillRect(0, 0, W, H);
  if (o.light) { const L = o.light, gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, 2.2 * s); gr.addColorStop(0, `rgba(255,236,200,${0.75 * L.I})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'overlay'; g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(DBUF, 0, 0);
  // clods of earth thrown up
  const r = mulberry32(99);
  for (let i = 0; i < 40; i++) {
    const vx = (r() - 0.5) * 3, vy = -2 - r() * 4, tt = clamp((o.burst ?? 0)) * 1.4, px = x + vx * tt * s * 0.6, py = y + (vy * tt + 4.9 * tt * tt) * s * 0.6;
    if (py > y + 5) continue;
    const cc = r(); ctx.fillStyle = `rgba(${50 + cc * 40},${40 + cc * 30},${30 + cc * 20},0.95)`; const sz = (0.04 + r() * 0.12) * s; ctx.fillRect(px, py, sz, sz * 0.8);
  }
}
