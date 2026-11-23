// DÂBBETÜ'L-ARZ outdoor world: the stone village (z < -4), the forest path, the abandoned quarry with its cave (z ~ 52-80).
// Everything sits in the same metre-based world as forest.js and is drawn through the same cameras.
'use strict';
const WORLD = {};
const QZ = 74;                        // quarry wall (cave mouth) depth
const CAVE = { x: 0, z: QZ, w: 4.2, h: 3.6 };

function buildWorld() {
  CAVE.x = pathX(QZ);
  const r = mulberry32(919);
  // stone texture: rough fieldstones with mortar
  WORLD.stone = noiseCanvas(256, 256, 1, 1, 33, (v, i, j) => {
    const cx = Math.floor(i / 22 + (Math.floor(j / 16) % 2) * 0.5), cy = Math.floor(j / 16);
    const fx = (i / 22 + (cy % 2) * 0.5) % 1, fy = (j / 16) % 1, edge = Math.min(fx, 1 - fx, fy * 1.4, (1 - fy) * 1.4);
    const base = 120 + hash2(cx, cy, 3) * 60 + (fbm(i / 9, j / 9, 3, 5) - 0.5) * 50;
    const g = edge < 0.07 ? 40 : base;
    return [g, g * 0.96, g * 0.9, 255];
  });
  // quarry rock face: layered strata, fractures
  WORLD.rock = noiseCanvas(512, 512, 1, 1, 44, (v, i, j) => {
    const st = Math.sin(j / 7 + fbm(i / 60, j / 60, 3, 2) * 6) * 0.5 + 0.5, f = fbm(i / 24, j / 24, 5, 7);
    let g = 95 + st * 40 + (f - 0.5) * 90;
    if (Math.abs(fbm(i / 40, j / 90, 4, 9) - 0.5) < 0.012) g -= 60;
    return [g * 1.0, g * 0.95, g * 0.86, 255];
  });
  // houses of the village: [x, z, w, d, h, rot-free], one or two windows lit
  WORLD.houses = [];
  for (let k = 0; k < 34; k++) {
    const z = -8 - r() * 52, x = pathX(z) + (r() < 0.5 ? -1 : 1) * (3.2 + r() * 14);
    if (WORLD.houses.some((h) => Math.abs(h.x - x) < 6 && Math.abs(h.z - z) < 6)) continue;
    WORLD.houses.push({ x, z, w: 4 + r() * 3, d: 4 + r() * 2, h: 2.6 + r() * 1.6, roof: 0.6 + r() * 0.9, flat: r() < 0.45, lit: r() < 0.2 ? 0.5 + r() * 0.5 : 0, chimney: r() < 0.7, balcony: r() < 0.3, seed: Math.floor(r() * 1e5) });
  }
  // boulders on the quarry floor and cracks in the ground in front of it
  WORLD.boulders = Array.from({ length: 40 }, () => { const z = 54 + r() * 18; return { x: pathX(z) + (r() - 0.5) * 30, z, s: 0.3 + r() * 1.4, seed: Math.floor(r() * 1e5) }; })
    .filter((b) => Math.abs(b.x - pathX(b.z)) > 2.2);
  WORLD.cracks = [];
  for (let k = 0; k < 7; k++) {
    let x = pathX(66) + (r() - 0.5) * 4, z = 64 + r() * 7, a = Math.PI / 2 + (r() - 0.5) * 1.2;
    const pts = [[x, z]];
    for (let i = 0; i < 14; i++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 0.5; z -= Math.abs(Math.sin(a)) * 0.6; pts.push([x, z]); }
    WORLD.cracks.push({ pts, w: 0.05 + r() * 0.08, t0: r() });
  }
  WORLD.drops = Array.from({ length: 900 }, () => [r(), r(), r(), r()]);
  WORLD.lamps = [-12, -27, -43].map((z) => ({ x: pathX(z) + 2.4, z, seed: z }));
  WORLD.minaret = { x: pathX(-36) - 11, z: -36 };
}

// ---------- rain (screen space, three depths). lights: [[x,y,r,I]] make nearby streaks glow ----------
function drawRain(ctx, t, a = 1, wind = 0.18, lights = null) {
  if (a <= 0) return;
  ctx.save(); ctx.lineCap = 'round';
  for (const [bx, by, d, ph] of WORLD.drops) {
    const z = 0.3 + d * 0.7, sp = 1900 * z, len = 30 + 60 * z;
    const y = ((by * H + t * sp + ph * 3000) % (H + 200)) - 100, x = ((bx * (W + 400) + y * wind) % (W + 400)) - 200;
    let g = 0;
    if (lights) for (const [lx, ly, lr, li] of lights) { const dd = ((x - lx) ** 2 + (y - ly) ** 2) / (lr * lr); if (dd < 1) g += (1 - dd) * li; }
    ctx.strokeStyle = g > 0.02 ? `rgba(255,246,225,${Math.min(0.75, a * (0.08 + 0.2 * z) + g * 0.55 * z)})` : `rgba(170,188,212,${a * (0.05 + 0.14 * z)})`;
    ctx.lineWidth = 0.6 + 1.4 * z;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * wind, y + len); ctx.stroke();
  }
  ctx.restore();
}
// splashes on the near ground (below screen y0)
function rainSplashes(ctx, t, y0, a = 0.6) {
  const r = mulberry32(17);
  ctx.save(); ctx.strokeStyle = `rgba(170,190,215,${0.35 * a})`; ctx.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) {
    const per = 0.35 + r() * 0.3, ph = ((t + r() * 5) % per) / per, x = r() * W, y = y0 + r() * (H - y0), s = (4 + r() * 10) * (0.4 + (y - y0) / (H - y0));
    if (ph > 0.6) continue;
    const k = ph / 0.6; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, y, s * k * 2, s * k * 0.5, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- mountain ridges behind everything ----------
function drawMountains(ctx, cam, o = {}) {
  const hz = proj(cam, cam.x + Math.sin(cam.yaw) * 1e4, cam.y, cam.z + Math.cos(cam.yaw) * 1e4)[1];
  const day = o.day || 0;
  for (let k = 0; k < 3; k++) {
    const par = (cam.yaw * 900 * (0.5 + k * 0.25)) + cam.x * (2 + k * 3);
    const base = hz + 30 - k * 10, amp = 520 - k * 140;
    const c = mix(mix([22, 27, 36], [30, 36, 48], k / 2), mix([92, 100, 116], [66, 74, 90], k / 2), day);
    ctx.fillStyle = col(c, 1); ctx.beginPath(); ctx.moveTo(-50, base + 50);
    for (let x = -50; x <= W + 50; x += 20) { const u = (x + par) / 900; ctx.lineTo(x, base - amp * (0.35 + 0.65 * fbm(u * (1 + k * 0.6), k * 3.1, 4, 70 + k))); }
    ctx.lineTo(W + 50, base + 50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col(FOG_COL, 0.35 - k * 0.08); ctx.fill();
  }
}

// ---------- a stone house (actor) ----------
function houseActor(Hs, o) {
  return { x: Hs.x, z: Hs.z, bias: 0, draw: (ctx, cam) => drawHouse(ctx, cam, Hs, o) };
}
function drawHouse(ctx, cam, Hs, o) {
  const { x, z, w, d, h } = Hs, hw = w / 2, hd = d / 2, amb = o.amb ?? 0.2, day = o.day || 0;
  const P = (dx, y, dz) => proj(cam, x + dx, y, z + dz);
  const c0 = P(0, 0, 0); if (c0[2] < 0.5 || c0[2] > 140) return;
  const ff = fogK(c0[2], o.fogDist || 40);
  const fr = [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, h, -hd), P(-hw, h, -hd)];            // front (faces -z)
  const sideX = cam.x > x ? hw : -hw;
  const sd = [P(sideX, 0, -hd), P(sideX, 0, hd), P(sideX, h, hd), P(sideX, h, -hd)];
  const rf = [P(-hw - 0.3, h, -hd - 0.3), P(hw + 0.3, h, -hd - 0.3), P(hw + 0.3, h + Hs.roof, 0), P(-hw - 0.3, h + Hs.roof, 0)];
  const rb = [P(-hw - 0.3, h + Hs.roof, 0), P(hw + 0.3, h + Hs.roof, 0), P(hw + 0.3, h, hd + 0.3), P(-hw - 0.3, h, hd + 0.3)];
  if ([...fr, ...sd].some((p) => p[2] < 0.2)) return;
  const tone = (alb, k) => col(mix(lightCol(alb, (amb * 2.2 + day * 0.6) * k, 0, 0), FOG_COL, ff * 0.8));
  const face = (pts, alb, k, tex) => {
    poly(ctx, pts.map((p) => [p[0], p[1]])); ctx.fillStyle = tone(alb, k); ctx.fill();
    if (tex && ff < 0.85) { ctx.save(); poly(ctx, pts.map((p) => [p[0], p[1]])); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1 - ff;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); ctx.drawImage(WORLD.stone, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); ctx.restore(); }
  };
  face(sd, [120, 112, 100], 0.55, true);
  face(fr, [140, 130, 116], 1.0, true);
  if (Hs.flat) {                                                   // flat earthen roof with a low parapet and beam ends
    const t0 = [P(-hw - 0.15, h, -hd - 0.15), P(hw + 0.15, h, -hd - 0.15), P(hw + 0.15, h, hd), P(-hw - 0.15, h, hd)];
    face(t0, [96, 84, 70], 0.75);
    const pa = [P(-hw - 0.15, h, -hd - 0.15), P(hw + 0.15, h, -hd - 0.15), P(hw + 0.15, h + 0.35, -hd - 0.15), P(-hw - 0.15, h + 0.35, -hd - 0.15)];
    face(pa, [120, 108, 94], 0.9, true);
    ctx.fillStyle = tone([40, 30, 22], 0.6);
    for (let k = 0; k < 7; k++) { const b = P(-hw + (k + 0.5) * w / 7, h - 0.15, -hd - 0.3); ctx.fillRect(b[0] - 0.06 * b[3], b[1] - 0.06 * b[3], 0.12 * b[3], 0.1 * b[3]); }
  } else {
    face(rb, [64, 46, 40], 0.5); face(rf, [92, 58, 46], 0.8);
    poly(ctx, rf.map((p) => [p[0], p[1]])); ctx.fillStyle = `rgba(150,170,200,${0.09 * (1 - ff)})`; ctx.fill();   // rain-wet tiles
    ctx.strokeStyle = tone([40, 28, 24], 0.5); ctx.lineWidth = Math.max(0.5, 0.02 * fr[0][3]);
    for (let k = 1; k < 8; k++) { const a = P(-hw - 0.3 + k * (w + 0.6) / 8, h, -hd - 0.3), b = P(-hw - 0.3 + k * (w + 0.6) / 8, h + Hs.roof, 0); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  // wooden tie-beams (hatıl) running through the stone walls
  ctx.fillStyle = tone([46, 34, 24], 0.7);
  for (const hy of [0.9, 1.95]) { if (hy > h - 0.3) continue; const a = P(-hw, hy, -hd - 0.01), b = P(hw, hy + 0.12, -hd - 0.01); poly(ctx, [[a[0], a[1]], [b[0], a[1] + (b[1] - a[1]) * 0 ], [b[0], b[1]], [a[0], b[1]]]); ctx.fill(); }
  if (Hs.balcony) {
    const a = P(-hw * 0.6, 2.2, -hd - 0.8), b = P(hw * 0.4, 2.35, -hd - 0.8), c = P(hw * 0.4, 2.2, -hd), d = P(-hw * 0.6, 2.35, -hd);
    ctx.fillStyle = tone([60, 44, 30], 0.8); ctx.fillRect(a[0], b[1], b[0] - a[0], Math.max(2, (a[1] - b[1]) * 1.5));
    ctx.strokeStyle = tone([50, 36, 24], 0.8); ctx.lineWidth = Math.max(1, 0.03 * a[3]);
    for (let k = 0; k <= 8; k++) { const x0 = lerp(a[0], b[0], k / 8); ctx.beginPath(); ctx.moveTo(x0, b[1]); ctx.lineTo(x0, b[1] - 0.8 * a[3]); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(a[0], b[1] - 0.8 * a[3]); ctx.lineTo(b[0], b[1] - 0.8 * a[3]); ctx.stroke();
  }
  if (Hs.chimney) {
    const cx = hw * 0.45, base = Hs.flat ? h : h + Hs.roof * 0.45;
    const c0 = P(cx - 0.25, base, 0.2 - (Hs.flat ? 0 : 0.6)), c1 = P(cx + 0.25, base + 1.0, 0.2 - (Hs.flat ? 0 : 0.6));
    ctx.fillStyle = tone([110, 100, 88], 0.8); ctx.fillRect(c0[0], c1[1], c1[0] - c0[0], c0[1] - c1[1]);
    // smoke from the chimney, bent by the wind
    const tt = o.t || 0, sx = (c0[0] + c1[0]) / 2, sy = c1[1], sc2 = c1[3];
    for (let k = 0; k < 6; k++) { const ph = ((tt * 0.25 + k / 6 + Hs.seed * 0.001) % 1), px = sx + ph * 2.2 * sc2 + n1(tt * 0.5 + k, Hs.seed) * 0.3 * sc2, py = sy - ph * 1.6 * sc2, rr = (0.3 + ph * 1.2) * sc2;
      radial(ctx, px, py, rr, [[0, `rgba(${mix([60, 70, 86], [150, 150, 150], o.day || 0).join(',')},${0.28 * (1 - ph) * (1 - ff)})`], [1, 'rgba(60,70,86,0)']]); }
  }
  // windows and door
  const win = (u, lit) => {
    const a = P(-hw + u * w - 0.35, 1.3, -hd - 0.01), b = P(-hw + u * w + 0.35, 2.1, -hd - 0.01);
    ctx.fillStyle = lit > 0 ? `rgba(255,180,100,${0.85 * lit * (1 - ff * 0.6)})` : tone([14, 14, 18], 0.3);
    ctx.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
    if (lit > 0) radial(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) * 3 + 1, [[0, `rgba(255,170,90,${0.25 * lit})`], [1, 'rgba(255,150,60,0)']], 'screen');
    ctx.strokeStyle = tone([40, 30, 24], 0.6); ctx.lineWidth = Math.max(1, (b[0] - a[0]) * 0.1); ctx.strokeRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
  };
  win(0.25, Hs.lit * (o.lights ?? 1)); win(0.75, 0);
  const da = P(-0.45, 0, -hd - 0.01), db = P(0.45, 1.9, -hd - 0.01);
  ctx.fillStyle = tone([50, 36, 26], 0.6); ctx.fillRect(da[0], db[1], db[0] - da[0], da[1] - db[1]);
}

// ---------- the quarry wall with the cave mouth ----------
function quarryActor(o) { return { x: CAVE.x, z: QZ, bias: 6, draw: (ctx, cam) => drawQuarry(ctx, cam, o) }; }
function drawQuarry(ctx, cam, o) {
  const t = o.t || 0, amb = o.amb ?? 0.18, L = o.lantern, day = o.day || 0;
  const pts = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40, X = CAVE.x - 30 + u * 60, Ht = 9 + 6 * fbm(u * 5, 1, 4, 12) + (Math.abs(u - 0.5) < 0.1 ? -1 : 0); pts.push([X, Ht]); }
  const top = pts.map(([X, Ht]) => proj(cam, X, Ht, QZ + Math.sin(X * 0.3) * 0.6)), bot = pts.map(([X]) => proj(cam, X, 0, QZ));
  if (bot.some((p) => p[2] < 0.3)) return;
  const ff = fogK(bot[20][2], o.fogDist || 30);
  const wall = new Path2D(); wall.moveTo(bot[0][0], bot[0][1]);
  top.forEach((p) => wall.lineTo(p[0], p[1])); for (let k = bot.length - 1; k >= 0; k--) wall.lineTo(bot[k][0], bot[k][1]); wall.closePath();
  ctx.fillStyle = col(mix(lightCol([150, 140, 124], amb * 2.4 + day * 0.7, 0, 0), FOG_COL, ff * 0.6)); ctx.fill(wall);
  ctx.save(); ctx.clip(wall);
  const minx = Math.min(...top.map((p) => p[0])), maxx = Math.max(...top.map((p) => p[0])), miny = Math.min(...top.map((p) => p[1])), maxy = bot[20][1];
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1 - ff * 0.6; ctx.drawImage(WORLD.rock, minx, miny, maxx - minx, maxy - miny);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = linGrad(ctx, 0, miny, 0, maxy, [[0, 'rgba(160,180,210,0.12)'], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]); ctx.fillRect(minx, miny, maxx - minx, maxy - miny);
  // quarry benches: stepped cuts across the face
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3;
  for (const hy of [2.6, 5.1, 7.4]) { ctx.beginPath(); for (let k = 0; k <= 40; k++) { const p = proj(cam, CAVE.x - 30 + k * 1.5, hy + Math.sin(k * 0.7) * 0.15, QZ); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,170,200,0.12)'; ctx.lineWidth = 2;
  for (const hy of [2.62, 5.12, 7.42]) { ctx.beginPath(); for (let k = 0; k <= 40; k++) { const p = proj(cam, CAVE.x - 30 + k * 1.5, hy + 0.05 + Math.sin(k * 0.7) * 0.15, QZ); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
  // flashlight pool on the wall
  if (L && L.I > 0) {
    const tg = (QZ - L.z) / Math.max(0.1, L.dir ? L.dir[2] : 1);
    const hx = L.x + (L.dir ? L.dir[0] : 0) * tg, hy = L.y + (L.dir ? L.dir[1] : 0) * tg;
    const hp = proj(cam, hx, hy, QZ), rr = proj(cam, hx + 1.4, hy, QZ);
    if (hp[2] > 0) radial(ctx, hp[0], hp[1], Math.abs(rr[0] - hp[0]) * 1.6, [[0, `rgba(255,240,210,${0.4 * L.I})`], [0.5, `rgba(230,220,190,${0.12 * L.I})`], [1, 'rgba(0,0,0,0)']], 'screen');
  }
  ctx.restore();
  // moonlit crest of the quarry wall
  ctx.strokeStyle = `rgba(160,180,210,${0.35 * (1 - ff)})`; ctx.lineWidth = 3; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  // the cave mouth (or the rubble that sealed it)
  const mouth = [];
  for (let k = 0; k <= 24; k++) { const a = Math.PI * k / 24, jag = 0.15 * n1(k * 1.7, 4); mouth.push(proj(cam, CAVE.x - Math.cos(a) * (CAVE.w / 2 + jag), Math.sin(a) * (CAVE.h + jag) , QZ - 0.05)); }
  poly(ctx, mouth.map((p) => [p[0], p[1]]));
  if (o.sealed) {
    ctx.fillStyle = col(mix(lightCol([80, 72, 62], amb * 1.6 + day * 0.45, 0, 0), FOG_COL, ff * 0.6)); ctx.fill();
    ctx.save(); ctx.clip(); const r = mulberry32(5);
    for (let i = 0; i < 70; i++) { const p = proj(cam, CAVE.x + (r() - 0.5) * CAVE.w, r() * CAVE.h, QZ - 0.3); const s = (0.2 + r() * 0.45) * p[3]; const gq = r(); ctx.fillStyle = col(lightCol([70 + gq * 40, 64 + gq * 36, 56 + gq * 30], amb * 1.6 + day * 0.45, 0, ff * 0.5)); ctx.beginPath(); ctx.ellipse(p[0], p[1], s, s * 0.7, r(), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  } else {
    const c = proj(cam, CAVE.x, CAVE.h * 0.4, QZ);
    ctx.fillStyle = '#010101'; ctx.fill();
    ctx.save(); ctx.clip();
    radial(ctx, c[0], c[1] + 30, CAVE.w * c[3] * 0.6, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(10,10,12,0.4)']]);
    if (L && L.I > 0 && o.lightInCave) radial(ctx, c[0] + (o.lightInCave.x || 0), c[1], CAVE.w * c[3] * 0.5, [[0, `rgba(160,150,130,${0.25 * L.I})`], [1, 'rgba(0,0,0,0)']], 'screen');
    // eyes in the dark
    if (o.eyes > 0) dabbeEyes(ctx, c[0], c[1] - 0.2 * c[3], c[3] * 0.42, o.eyes, t);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; poly(ctx, mouth.map((p) => [p[0], p[1]])); ctx.stroke();
  }
  // tracks in front of the sealed mouth
  if (o.tracks > 0) drawTracks(ctx, cam, o.tracks, amb + day * 0.7);
}
function dabbeEyes(ctx, x, y, sep, a, t, size = 1) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * sep / 2, r = sep * 0.09 * size;
    radial(ctx, ex, y, r * 5, [[0, `rgba(255,176,70,${0.35 * a})`], [0.3, `rgba(220,120,30,${0.12 * a})`], [1, 'rgba(0,0,0,0)']], 'screen');
    ctx.fillStyle = `rgba(255,196,110,${0.92 * a})`; ctx.beginPath(); ctx.ellipse(ex, y, r, r * 0.62, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(60,24,4,${0.9 * a})`; ctx.beginPath(); ctx.ellipse(ex, y, r * 0.16, r * 0.5, 0, 0, TAU); ctx.fill();
  }
}
// giant tracks: palm hollows with four long claw gouges, dragged furrows between them, rainwater in the hollows
function drawTracks(ctx, cam, a, amb) {
  const dark = col(lightCol([34, 28, 22], amb, 0, 0)), rim = col(lightCol([150, 136, 116], amb, 0, 0), 0.55), water = col(lightCol([120, 132, 150], amb, 0, 0), 0.6);
  const P = (x, z) => proj(cam, x, 0, z);
  const shape = (pts) => { if (pts.some((p) => p[2] < 0.4)) return false; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); return true; };
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
  for (let k = 0; k < 6; k++) {
    const side = k % 2 ? 1 : -1, z0 = QZ - 2.2 - k * 2.3, x0 = CAVE.x + side * 1.25 + n1(k, 3) * 0.25;
    // drag furrows towards the next print
    for (let f = -1; f <= 1; f++) {
      const pts = []; for (let i = 0; i <= 6; i++) { const z = z0 - 0.5 - i * 0.26, x = x0 + f * 0.28 + Math.sin(i * 0.7 + k) * 0.06; pts.push(P(x, z)); }
      if (pts.some((p) => p[2] < 0.4)) continue;
      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 0.06 * pts[4][3]); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    }
    // palm hollow (irregular) with rainwater
    const palm = []; for (let i = 0; i < 16; i++) { const an = i / 16 * TAU, rr = 1 + 0.25 * n1(i * 0.9 + k * 3, 7); palm.push(P(x0 + Math.cos(an) * 0.7 * rr, z0 + Math.sin(an) * 0.5 * rr)); }
    if (shape(palm)) { ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, 0.05 * palm[0][3]); ctx.stroke(); }
    const pool = []; for (let i = 0; i < 12; i++) { const an = i / 12 * TAU, rr = 1 + 0.2 * n1(i + k * 5, 9); pool.push(P(x0 + Math.cos(an) * 0.38 * rr, z0 + 0.05 + Math.sin(an) * 0.25 * rr)); }
    if (shape(pool)) { ctx.fillStyle = water; ctx.fill(); }
    // four claw gouges raking away from the palm (towards the sealed cave), wide at the root, tapering, slightly curved
    for (let c = 0; c < 4; c++) {
      const cx = x0 + (c - 1.5) * 0.32, bend = side * 0.12 + (c - 1.5) * 0.05;
      const g = [P(cx - 0.09, z0 + 0.42), P(cx + bend * 0.5 - 0.06, z0 + 1.0), P(cx + bend, z0 + 1.75), P(cx + bend * 0.5 + 0.06, z0 + 1.0), P(cx + 0.09, z0 + 0.42)];
      if (shape(g)) { ctx.fillStyle = dark; ctx.fill(); ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, 0.02 * g[0][3]); ctx.stroke(); }
    }
  }
  ctx.restore();
}
function boulderActor(B, o) {
  return { x: B.x, z: B.z, draw: (ctx, cam) => {
    const p = proj(cam, B.x, 0, B.z); if (p[2] < 2.2) return;
    const s = B.s * p[3], ff = fogK(p[2], o.fogDist || 30), r = mulberry32(B.seed), li = lanternAt(o.lantern, B.x, B.s * 0.5, B.z);
    const pts = []; for (let k = 0; k < 9; k++) { const a = Math.PI + Math.PI * k / 8; pts.push([p[0] + Math.cos(a) * s * (0.8 + r() * 0.4), p[1] + Math.sin(a) * s * (0.6 + r() * 0.3)]); }
    poly(ctx, pts); ctx.fillStyle = col(lightCol([120, 112, 100], (o.amb ?? 0.18) + (o.day || 0) * 0.7, li, ff)); ctx.fill();
    ctx.fillStyle = linGrad(ctx, p[0] - s, 0, p[0] + s, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); ctx.fill();
  } };
}
// ground cracks (opening k 0..1) with dust puffs
function cracksActor(o) {
  return { x: CAVE.x, z: 60, bias: 30, draw: (ctx, cam) => {
    const k = o.open || 0; if (k <= 0) return;
    for (const C of WORLD.cracks) {
      const n = Math.max(2, Math.floor(C.pts.length * clamp(k * 1.3 - C.t0 * 0.3)));
      const pp = C.pts.slice(0, n).map(([x, z]) => proj(cam, x, 0, z));
      if (pp.some((p) => p[2] < 0.3)) continue;
      ctx.fillStyle = '#050403'; inkStroke(ctx, pp.map((p) => [p[0], p[1]]), C.w * pp[0][3] * 1.6, C.w * pp[pp.length - 1][3] * 0.6, false);
      if (o.dust > 0) for (let i = 0; i < pp.length; i += 2) {
        const ph = ((o.t * 0.6 + i * 0.37 + C.t0) % 1), p = pp[i];
        radial(ctx, p[0] + n1(i + o.t, 3) * 10, p[1] - ph * 0.9 * p[3], 0.35 * p[3] * (0.5 + ph), [[0, `rgba(150,140,125,${0.22 * o.dust * (1 - ph)})`], [1, 'rgba(0,0,0,0)']]);
      }
    }
  } };
}

// ---------- street lamp on a wooden pole, swinging in the wind ----------
function lampActor(Lp, o) {
  return { x: Lp.x, z: Lp.z, draw: (ctx, cam) => {
    const t = o.t || 0, b = proj(cam, Lp.x, 0, Lp.z), tp = proj(cam, Lp.x, 5.2, Lp.z); if (b[2] < 0.5) return;
    const ff = fogK(b[2], o.fogDist || 40), s = b[3];
    ctx.strokeStyle = col(mix([30, 26, 22], FOG_COL, ff)); ctx.lineWidth = Math.max(1, 0.16 * s); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
    const arm = proj(cam, Lp.x - 0.9, 5.0, Lp.z); ctx.lineWidth = Math.max(1, 0.06 * s); ctx.beginPath(); ctx.moveTo(tp[0], tp[1] + 0.2 * s); ctx.lineTo(arm[0], arm[1]); ctx.stroke();
    const sw = Math.sin(t * 2.1 + Lp.seed) * 0.25 + n1(t * 0.8, Lp.seed) * 0.1, bx = arm[0] + Math.sin(sw) * 0.5 * s, by = arm[1] + Math.cos(sw) * 0.5 * s;
    ctx.lineWidth = Math.max(0.5, 0.015 * s); ctx.beginPath(); ctx.moveTo(arm[0], arm[1]); ctx.lineTo(bx, by); ctx.stroke();
    const I = (o.lampI ?? 1) * (Math.abs(n1(t * 6, Lp.seed)) > 0.92 ? 0.4 : 1);
    if (I <= 0) return;
    radial(ctx, bx, by, 4.5 * s, [[0, `rgba(255,190,120,${0.22 * I * (1 - ff * 0.7)})`], [0.3, `rgba(220,150,80,${0.08 * I})`], [1, 'rgba(0,0,0,0)']], 'screen');
    ctx.fillStyle = `rgba(255,226,170,${0.95 * I})`; ctx.beginPath(); ctx.ellipse(bx, by + 0.08 * s, 0.09 * s, 0.13 * s, 0, 0, TAU); ctx.fill();
    // pool on the wet ground below
    radialEllipse(ctx, bx, b[1], 3 * s, 0.9 * s, [[0, `rgba(255,190,120,${0.25 * I * (1 - ff)})`], [1, 'rgba(0,0,0,0)']], 'screen');
    if (o.lampScreens) o.lampScreens.push([bx, by, 4 * s, I]);
  } };
}
// ---------- minaret ----------
function minaretActor(o) {
  const M = WORLD.minaret;
  return { x: M.x, z: M.z, draw: (ctx, cam) => {
    const b = proj(cam, M.x, 0, M.z); if (b[2] < 1) return;
    const ff = fogK(b[2], o.fogDist || 40), s = b[3], tone = (k) => col(mix(lightCol([150, 144, 134], (o.amb ?? 0.15) * 2.2 * k + (o.day || 0) * 0.6, 0, 0), FOG_COL, ff * 0.85));
    const top = proj(cam, M.x, 19, M.z), cap = proj(cam, M.x, 22.5, M.z), sh = proj(cam, M.x, 15.5, M.z);
    ctx.fillStyle = tone(1); ctx.fillRect(b[0] - 0.75 * s, top[1], 1.5 * s, b[1] - top[1]);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b[0] + 0.15 * s, top[1], 0.6 * s, b[1] - top[1]);
    ctx.fillStyle = tone(0.85); ctx.fillRect(b[0] - 1.15 * s, sh[1] - 0.25 * s, 2.3 * s, 0.5 * s);           // balcony (şerefe)
    ctx.beginPath(); ctx.moveTo(b[0] - 0.85 * s, top[1]); ctx.lineTo(cap[0], cap[1]); ctx.lineTo(b[0] + 0.85 * s, top[1]); ctx.closePath(); ctx.fillStyle = tone(0.6); ctx.fill();
    // a single dim bulb on the balcony
    radial(ctx, b[0], sh[1], 2.5 * s, [[0, `rgba(170,210,170,${0.18 * (1 - ff * 0.5) * (1 - (o.day || 0))})`], [1, 'rgba(0,0,0,0)']], 'screen');
  } };
}
// ---------- rusted rails running into the cave, an overturned ore cart ----------
function railsActor(o) {
  return { x: CAVE.x, z: QZ - 6, bias: 20, draw: (ctx, cam) => {
    const amb = (o.amb ?? 0.15) * 2.4 + (o.day || 0) * 0.6;
    for (const sx of [-0.55, 0.55]) {
      const pts = []; for (let k = 0; k <= 20; k++) { const z = QZ + 1 - k * 1.2; pts.push(proj(cam, CAVE.x + sx + Math.sin(k * 0.2) * 0.1, 0.05, z)); }
      if (pts.some((p) => p[2] < 0.3)) continue;
      ctx.strokeStyle = col(lightCol([110, 70, 50], amb, 0, 0.1)); ctx.lineWidth = Math.max(1, 0.06 * pts[pts.length - 1][3]);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = `rgba(170,190,220,${0.25})`; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let k = 0; k < 18; k++) { const z = QZ + 1 - k * 1.2, a = proj(cam, CAVE.x - 0.8, 0.02, z), b = proj(cam, CAVE.x + 0.8, 0.02, z); if (a[2] < 0.3) continue; ctx.strokeStyle = col(lightCol([70, 54, 40], amb, 0, 0.1)); ctx.lineWidth = Math.max(1, 0.12 * a[3]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // overturned cart
    const c = proj(cam, CAVE.x + 2.6, 0, QZ - 3.5); if (c[2] < 0.4) return;
    const s = c[3]; ctx.fillStyle = col(lightCol([90, 58, 40], amb, lanternAt(o.lantern, CAVE.x + 2.6, 0.6, QZ - 3.5), fogK(c[2], 30)));
    ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(-1.2); ctx.fillRect(-0.7 * s, -1.0 * s, 1.4 * s, 0.9 * s); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-0.7 * s, -1.0 * s, 1.4 * s, 0.25 * s);
    ctx.fillStyle = '#141210'; for (const wx of [-0.45, 0.45]) { ctx.beginPath(); ctx.arc(wx * s, -0.05 * s, 0.22 * s, 0, TAU); ctx.fill(); }
    ctx.restore();
  } };
}
