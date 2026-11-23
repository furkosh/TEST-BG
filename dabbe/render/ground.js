// Cracked earth (S1, S9), the descent into the ground (S9) and the cave tunnel (S4-S7).
'use strict';
const GR = {};
function buildGround() {
  // dry cracked clay: Voronoi plates with dark gaps and curled, lighter rims
  const N = 1024, cell = 74, c = makeCanvas(N, N), x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  const G = Math.ceil(N / cell), seeds = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) seeds.push([(i + 0.15 + hash2(i, j, 1) * 0.7) * cell, (j + 0.15 + hash2(i, j, 2) * 0.7) * cell, hash2(i, j, 3)]);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const gi = Math.floor(px / cell), gj = Math.floor(py / cell); let d1 = 1e9, d2 = 1e9, sv = 0;
    for (let jj = gj - 1; jj <= gj + 1; jj++) for (let ii = gi - 1; ii <= gi + 1; ii++) {
      const s = seeds[(((jj % G) + G) % G) * G + (((ii % G) + G) % G)]; if (!s) continue;
      const sx = s[0] + (ii - (((ii % G) + G) % G)) * cell, sy = s[1] + (jj - (((jj % G) + G) % G)) * cell;
      const dd = Math.hypot(px - sx, py - sy); if (dd < d1) { d2 = d1; d1 = dd; sv = s[2]; } else if (dd < d2) d2 = dd;
    }
    const e = d2 - d1, k = (py * N + px) * 4, f = fbm(px / 40, py / 40, 4, 17);
    let g = 120 + sv * 30 + (f - 0.5) * 70 - Math.max(0, 14 - e) * 2.2;
    if (e < 3.2 + f * 2) g = 18 + e * 3;
    d[k] = g * 1.05; d[k + 1] = g * 0.88; d[k + 2] = g * 0.7; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); GR.clay = c;
  GR.soil = noiseCanvas(256, 512, 1, 1, 66, (v, i, j) => {
    const band = Math.sin(j / 18 + fbm(i / 50, j / 50, 3, 4) * 4) * 0.5 + 0.5, f = fbm(i / 12, j / 12, 4, 9);
    const g = 50 + band * 40 + (f - 0.5) * 60 + (hash2(i >> 2, j >> 2, 3) > 0.94 ? 50 : 0);
    return [g * 0.95, g * 0.82, g * 0.66, 255];
  });
  const r = mulberry32(17);
  GR.stones = Array.from({ length: 26 }, () => ({ x: 120 + r() * 840, y: 600 + r() * 1100, s: 10 + r() * 30, a: r() * TAU, t0: r(), seed: Math.floor(r() * 1e4) }));
  GR.rock = noiseCanvas(512, 512, 1, 1, 71, (v, i, j) => {
    const f = fbm(i / 26, j / 26, 5, 3), cr = Math.abs(fbm(i / 60, j / 30, 4, 6) - 0.5) < 0.015 ? 60 : 0, st = Math.sin(j / 9 + f * 5) * 12;
    const g = 110 + (f - 0.5) * 120 - cr + st; return [g, g * 0.94, g * 0.85, 255];
  });
}

// o: {t, zoom, panY, under:{k, x, y}, stones (0..1), eyes, crackOpen, shake, light}
function drawEarth(ctx, t, o = {}) {
  const z = o.zoom || 1, py = o.panY || 0;
  ctx.save();
  ctx.fillStyle = '#0d0b09'; ctx.fillRect(0, 0, W, H);
  const sh = o.shake || 0; ctx.translate(n1(t * 40, 1) * 26 * sh, n1(t * 37, 2) * 26 * sh);
  // ground plane: fake perspective in horizontal bands (far at the top)
  const bands = 24;
  for (let b = 0; b < bands; b++) {
    const y0 = 300 + b * (H - 300) / bands, y1 = y0 + (H - 300) / bands + 1, u = b / bands;
    const sc = lerp(1.05, 2.2, u) * z, srcY = ((u * 900 + py) % 1024 + 1024) % 1024;
    ctx.drawImage(GR.clay, 0, srcY, 1024, 1024 / bands, W / 2 - 540 * sc, y0, 1080 * sc, y1 - y0);
  }
  // sky/horizon haze at the top
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, 640, [[0, '#06080c'], [0.55, 'rgba(14,16,20,0.95)'], [1, 'rgba(14,16,20,0)']]); ctx.fillRect(0, 0, W, 640);
  // something huge moving beneath: the plates lift, cracks widen, a dark mass shows through
  const U = o.under;
  if (U && U.k > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(40px)';
    ctx.fillStyle = `rgba(0,0,0,${0.92 * U.k})`;
    ctx.beginPath(); ctx.ellipse(U.x, U.y, 420, 190, -0.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(U.x + 330, U.y - 150, 150, 90, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(20px)';
    ctx.fillStyle = `rgba(150,130,110,${0.08 * U.k})`; ctx.beginPath(); ctx.ellipse(U.x - 60, U.y - 110, 380, 60, -0.15, 0, TAU); ctx.fill(); ctx.restore();
  }
  // a wide fissure opening (eyes appear in it)
  if (o.crackOpen > 0) {
    const k = o.crackOpen, cx = 540, cy = 1180;
    ctx.fillStyle = '#020101';
    ctx.beginPath(); ctx.moveTo(cx - 420, cy + 20);
    for (let i = 0; i <= 20; i++) { const x = cx - 420 + i * 42; ctx.lineTo(x, cy - (18 + 60 * Math.sin(i / 20 * Math.PI)) * k + n1(i * 1.3, 5) * 10); }
    for (let i = 20; i >= 0; i--) { const x = cx - 420 + i * 42; ctx.lineTo(x, cy + (12 + 40 * Math.sin(i / 20 * Math.PI)) * k + n1(i * 1.7, 6) * 8); }
    ctx.closePath(); ctx.fill();
    if (o.eyes > 0) dabbeEyes(ctx, cx, cy - 6, 300, o.eyes, t, 1.4);
  }
  // stones lifting out of the clay
  if (o.stones > 0) for (const S of GR.stones) {
    const k = clamp((o.stones - S.t0 * 0.6) * 2.5), lift = k * (20 + S.s * 1.5) + Math.abs(n1(t * 9 + S.seed, 3)) * 6 * k;
    if (k <= 0) continue;
    const r = mulberry32(S.seed), pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; pts.push([S.x + Math.cos(a + S.a) * S.s * (0.7 + r() * 0.5), S.y - lift + Math.sin(a + S.a) * S.s * 0.6 * (0.7 + r() * 0.5)]); }
    ctx.fillStyle = `rgba(0,0,0,${0.55 * k})`; ctx.beginPath(); ctx.ellipse(S.x, S.y + 4, S.s * 1.1, S.s * 0.4, 0, 0, TAU); ctx.fill();
    poly(ctx, pts); ctx.fillStyle = 'rgb(150,140,126)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = linGrad(ctx, S.x - S.s, S.y - lift - S.s, S.x + S.s, S.y - lift + S.s, [[0, 'rgba(200,200,210,0.18)'], [1, 'rgba(0,0,0,0.6)']]); ctx.fill();
    // dust trickling off
    ctx.fillStyle = `rgba(150,130,110,${0.4 * k})`; for (let i = 0; i < 5; i++) ctx.fillRect(S.x - S.s + hash2(i, S.seed, 1) * S.s * 2, S.y - lift + S.s * 0.4 + ((t * 80 + i * 13) % 30), 2, 2);
  }
  ctx.restore();
  // cold moonlight from the upper left + a dim haze of dust
  ctx.fillStyle = 'rgba(6,9,16,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = linGrad(ctx, 0, 300, W, H, [[0, 'rgba(130,150,180,0.14)'], [1, 'rgba(0,0,0,0.45)']]); ctx.fillRect(0, 0, W, H);
  if (o.dust > 0) drawFog(ctx, t, o.dust * 0.25, 14, 4, 3, 500, H);
}

// descending through the soil (S9): layers slide up past the camera
function drawUnderground(ctx, t, o = {}) {
  const d = o.depth || 0;
  ctx.fillStyle = '#060504'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = clamp(1 - d * 0.6);
  const off = (d * 2600) % 512;
  for (let y = -off - 512; y < H; y += 512) ctx.drawImage(GR.soil, 0, y, W, 512);
  ctx.fillStyle = `rgba(0,0,0,${0.55 + d * 0.3})`; ctx.fillRect(0, 0, W, H);
  // roots and stones streaming upward
  const r = mulberry32(3);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = ((r() * H - d * 3000 * (0.6 + r() * 0.8)) % H + H) % H, s = 6 + r() * 22, gq = r(); ctx.fillStyle = `rgba(${70 + gq * 50},${62 + gq * 44},${52 + gq * 36},0.6)`; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.7, r(), 0, TAU); ctx.fill(); }
  ctx.restore();
  vignette(ctx, 0.95, 0.15);
}

// ---------- cave tunnel ----------
// o: {t, z (metres travelled into the tunnel), spot:[x,y] screen, spotI, shake, eyes, eyesDepth, debris (0..1), floor (crack open 0..1), dust, exit (0 = looking in, 1 = looking out to the night)}
function caveRing(i) {
  const pts = [], n = 26;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + k / n * Math.PI;                                // upper arch
    const r = 2.2 + 0.55 * (vnoise(k * 0.7, i * 0.9, 31) - 0.5) * 2 + 0.25 * (vnoise(k * 2.3, i * 1.7, 32) - 0.5) * 2;
    pts.push([Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.95 - 0.2]);
  }
  pts.push([2.4, 1.3]); pts.push([-2.4, 1.3]);                         // flat floor at y = +1.3 (camera at 1.3 m)
  return pts;
}
function drawCave(ctx, t, o = {}) {
  const f = 900, zc = o.z || 0, sh = o.shake || 0;
  const ox = W / 2 + n1(t * 30, 1) * 20 * sh, oy = H * 0.48 + n1(t * 33, 2) * 20 * sh;
  const curve = (d) => Math.sin(d * 0.12) * 1.4;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const spot = o.spot || [W / 2, H / 2], sI = o.spotI ?? 1;
  for (let i = 40; i >= 0; i--) {
    const depth = i * 0.9 - (zc % 0.9), dz = depth + 0.4; if (dz < 0.35) continue;
    const ring = caveRing(i + Math.floor(zc / 0.9));
    const cxo = (curve(i * 0.9 + zc) - curve(zc)) * f / dz;
    const sc = f / dz, pts = ring.map(([x, y]) => [ox + cxo + x * sc, oy + y * sc]);
    const fall = 1 / (1 + 0.05 * dz * dz), lit = sI * Math.min(1.5, 4.5 / (dz + 0.8));
    ctx.save();
    ctx.beginPath(); ctx.rect(-50, -50, W + 100, H + 100); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.clip('evenodd');
    const b0 = 14 + 40 * fall;
    ctx.fillStyle = `rgb(${b0 * 1.05},${b0 * 0.95},${b0 * 0.85})`; ctx.fillRect(-50, -50, W + 100, H + 100);
    const gr = ctx.createRadialGradient(spot[0], spot[1], 0, spot[0], spot[1], 220 + 1300 / dz);
    gr.addColorStop(0, `rgba(240,226,196,${0.85 * lit})`); gr.addColorStop(0.4, `rgba(150,136,112,${0.4 * lit})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.9; ctx.drawImage(GR.rock, ox + cxo - 3 * sc, oy - 3 * sc, 6 * sc, 5 * sc);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // the lip of each rock ring: dark crevice just outside the opening, lighter ridge on it
    ctx.filter = `blur(${Math.max(2, 0.12 * sc)}px)`; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = Math.max(4, 0.5 * sc); poly(ctx, pts.slice(0, -2), false); ctx.stroke(); ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,0,${clamp(0.02 + dz / 34)})`; ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.restore();
    ctx.strokeStyle = `rgba(210,195,170,${0.35 * lit * fall})`; ctx.lineWidth = Math.max(1, 0.03 * sc); poly(ctx, pts.slice(0, -2), false); ctx.stroke();
    if (i === 30 && o.eyes > 0) {                                      // eyes far down the tunnel
      const ed = o.eyesDepth || 18, es = f / ed;
      dabbeEyes(ctx, ox + (curve(ed + zc) - curve(zc)) * f / ed, oy - 0.4 * es, 1.6 * es, o.eyes, t, 1);
    }
  }
  // floor cracks
  if (o.floor > 0) {
    ctx.save(); ctx.strokeStyle = '#020101'; ctx.lineCap = 'round';
    const r = mulberry32(12);
    for (let k = 0; k < 9; k++) {
      let x = ox + (r() - 0.5) * 600, y = H - 40, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      ctx.lineWidth = 3 + r() * 9 * o.floor; ctx.beginPath(); ctx.moveTo(x, y);
      const n = Math.floor(12 * o.floor);
      for (let s = 0; s < n; s++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 40; y += Math.sin(a) * 30 * (1 - s / 14); ctx.lineTo(x, Math.max(oy + 1.3 * f / 3, y)); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // debris falling from the roof through the beam
  if (o.debris > 0) {
    const r = mulberry32(44);
    for (let i = 0; i < 50; i++) {
      const per = 0.7 + r() * 0.8, ph = ((t + r() * 9) % per) / per, x = r() * W, s = 3 + r() * 12;
      if (r() > o.debris) continue;
      const y = -40 + ph * ph * (H + 80);
      const lit = Math.exp(-((x - spot[0]) ** 2 + (y - spot[1]) ** 2) / 2e5);
      ctx.fillStyle = `rgba(${60 + 150 * lit},${54 + 130 * lit},${46 + 110 * lit},0.95)`; ctx.fillRect(x, y, s, s * 0.8);
    }
  }
  if (o.dust > 0) { drawFog(ctx, t, 0.18 * o.dust, 26, 3, 5); drawFog(ctx, t * 1.4, 0.1 * o.dust, 40, 5, 7); }
  // beam haze through the dust
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(30px)';
  radial(ctx, spot[0], spot[1], 420, [[0, `rgba(230,220,200,${0.1 * sI})`], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();
}

// ---------- cracked earth, relief pass ----------
// curled clay plates lit by a low moon (grazing light, long crack shadows) + a warm under-light variant
function clayFn(w) {
  return (i, j) => {
    const x = i / w * 9, y = j / w * 9;
    const wx = x + (fbm(x * 0.6, y * 0.6, 2, 81) - 0.5) * 0.9, wy = y + (fbm(x * 0.6 + 4, y * 0.6, 2, 82) - 0.5) * 0.9;
    const [d1, d2, id] = cellN(wx, wy, 91);
    const e = d2 - d1;
    // plates: flat tops that curl up at the rim, deep dark gaps
    let z = 0.25 + 0.25 * sstep(0.0, 0.12, e) + 0.12 * sstep(0.25, 0.05, e) * sstep(0.02, 0.06, e) + (id - 0.5) * 0.12;
    if (e < 0.035) z = -0.6 + e * 6;
    z += (fbm(x * 6, y * 6, 3, 83) - 0.5) * 0.06 + (fbm(x * 22, y * 22, 2, 84) - 0.5) * 0.03;
    const k = 0.85 + 0.3 * fbm(x * 1.5, y * 1.5, 3, 85), gap = e < 0.035;
    const c = gap ? [20, 16, 12] : [150 * k, 126 * k, 98 * k];
    return [z * 40, 1, c[0], c[1], c[2]];
  };
}
function buildClayRelief() {
  GR.clayR = buildRelief(900, 900, clayFn(900), {
    moon: { dir: [-0.9, -0.25, 0.22], col: [0.7, 0.82, 1.05], soft: 3 },
    under: { dir: [0.2, 0.6, 0.6], col: [1.25, 1.05, 0.8], soft: 5 },
  }, { bump: 1.2, ao1: 3, ao2: 10, aoK1: 0.03, aoK2: 0.012, soft: 3 });
}
// lit clay tile (moon + optional warm under-light) cached per frame into one canvas
let CLAYC = null;
function clayTile(moon, under) {
  if (!CLAYC) CLAYC = makeCanvas(900, 900);
  const x = CLAYC.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 900, 900);
  drawRelief(x, GR.clayR, 0, 0, 900, 900, [['base', 0.1], ['moon', moon], ['under', under]]);
  return CLAYC;
}
// o: {t, zoom, panY, moon, under, bulge:{k,x,y}, crackOpen, eyes, stones, shake, dust, face (0..1 face visible in the crack)}
function drawEarth2(ctx, t, o = {}) {
  const z = o.zoom || 1, py = o.panY || 0, q = quake(t, o.shake || 0);
  const tile = clayTile(o.moon ?? 1.0, o.under ?? 0);
  ctx.save();
  ctx.fillStyle = '#07080a'; ctx.fillRect(0, 0, W, H);
  ctx.translate(q.x, q.y); ctx.translate(W / 2, H / 2); ctx.rotate(q.r); ctx.translate(-W / 2, -H / 2);
  // ground plane: tiled relief seen at a slant (uniform scale; the far part dissolves into haze)
  const y0g = o.horizon ?? 420, sc = 1.25 * z, th = 900 * sc * 0.62, tw = 900 * sc;
  const oy0 = ((py * sc * 0.62) % th + th) % th, ox0 = ((o.panX || 0) * sc % tw + tw) % tw;
  for (let y = y0g - oy0 - th; y < H + th; y += th) for (let x = -ox0 - tw; x < W + tw; x += tw) ctx.drawImage(tile, x, y, tw + 1, th + 1);
  // distance haze and the dark horizon
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, y0g + 420, [[0, '#05070b'], [0.62, 'rgba(14,19,28,1)'], [0.8, 'rgba(18,24,34,0.75)'], [1, 'rgba(18,24,34,0)']]); ctx.fillRect(-50, -50, W + 100, y0g + 470);
  // something huge moves beneath: the surface swells and darkens along its back
  const U = o.bulge;
  if (U && U.k > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'blur(50px)';
    ctx.fillStyle = `rgba(0,0,0,${0.85 * U.k})`; ctx.beginPath(); ctx.ellipse(U.x, U.y, 470, 210, -0.12, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(26px)';
    ctx.fillStyle = `rgba(140,150,170,${0.14 * U.k})`; ctx.beginPath(); ctx.ellipse(U.x - 80, U.y - 150, 420, 50, -0.12, 0, TAU); ctx.fill(); ctx.restore();
    // fresh cracks running along its back
    ctx.save(); ctx.strokeStyle = '#020101'; ctx.lineCap = 'round';
    const r = mulberry32(21);
    for (let k = 0; k < 7; k++) { let x = U.x - 380 + r() * 200, y = U.y + (r() - 0.5) * 160, a = (r() - 0.5) * 0.5; ctx.lineWidth = (2 + r() * 6) * U.k; ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 12 * U.k; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 42; y += Math.sin(a) * 18; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore();
  }
  // the wide fissure where it looks out
  if (o.crackOpen > 0) {
    const k = o.crackOpen, cx = o.cx || 540, cy = o.cy || 1180, hw = 470;
    const top = [], bot = [];
    for (let i = 0; i <= 26; i++) { const u = i / 26, x = cx - hw + u * hw * 2, s = Math.sin(u * Math.PI); top.push([x, cy - (14 + 90 * s) * k + n1(i * 1.3, 5) * 12 * s]); bot.push([x, cy + (10 + 55 * s) * k + n1(i * 1.7, 6) * 10 * s]); }
    ctx.save(); ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top) ctx.lineTo(p[0], p[1]); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
    ctx.fillStyle = '#010101'; ctx.fill(); ctx.clip();
    if (o.face > 0) {                                     // its face, far below, barely lit by moonlight through the gap
      drawDabbeFace2(ctx, cx, cy + 40, 560, { t, up: 0, rim: 0.0, top: 0.55 * o.face, amb: 0.03, eyes: 0, soil: 0 });
      ctx.fillStyle = `rgba(0,0,0,${0.5})`; ctx.fillRect(cx - hw, cy - 200, hw * 2, 400);
    }
    ctx.restore();
    // crumbling lips of the fissure, lit by the moon
    ctx.strokeStyle = 'rgba(170,180,200,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    if (o.eyes > 0) dabbeEyes2(ctx, cx, cy + 8 - 0.15 * 280 * 0, 560 * 0.034, o.eyes, o.eyeGlow ?? 1, t);
  }
  // pebbles shaken loose
  if (o.stones > 0) for (const S of GR.stones) {
    const k = clamp((o.stones - S.t0 * 0.6) * 2.5), lift = k * (14 + S.s * 1.2) + Math.abs(n1(t * 11 + S.seed, 3)) * 8 * k;
    if (k <= 0) continue;
    const r = mulberry32(S.seed), pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; pts.push([S.x + Math.cos(a + S.a) * S.s * (0.7 + r() * 0.5), S.y - lift + Math.sin(a + S.a) * S.s * 0.6 * (0.7 + r() * 0.5)]); }
    ctx.fillStyle = `rgba(0,0,0,${0.6 * k})`; ctx.beginPath(); ctx.ellipse(S.x + 8, S.y + 4, S.s * 1.2, S.s * 0.38, 0, 0, TAU); ctx.fill();
    poly(ctx, pts); ctx.fillStyle = 'rgb(62,58,53)'; ctx.fill();
    ctx.fillStyle = linGrad(ctx, S.x - S.s, S.y - lift - S.s, S.x + S.s, S.y - lift + S.s, [[0, 'rgba(150,165,190,0.3)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.75)']]); ctx.fill();
    ctx.fillStyle = `rgba(150,130,110,${0.5 * k})`; for (let i = 0; i < 5; i++) ctx.fillRect(S.x - S.s + hash2(i, S.seed, 1) * S.s * 2, S.y - lift + S.s * 0.4 + ((t * 90 + i * 13) % 34), 2, 2);
  }
  ctx.restore();
  if (o.dust > 0) { const fx = FOREST.fogTex || TEX.fog; ctx.save(); ctx.globalAlpha = o.dust * 0.22; const s = 1024, ox = (t * 18) % s; for (let x = -ox; x < W; x += s) ctx.drawImage(fx, x, o.horizon ? o.horizon : 400, s, H); ctx.restore(); }
}
