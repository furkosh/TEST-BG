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
    WORLD.houses.push({ x, z, w: 4 + r() * 3, d: 4 + r() * 2, h: 2.6 + r() * 1.6, roof: 0.6 + r() * 0.9, lit: r() < 0.18 ? 0.5 + r() * 0.5 : 0, seed: Math.floor(r() * 1e5) });
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
}

// ---------- rain (screen space, three depths) ----------
function drawRain(ctx, t, a = 1, wind = 0.18) {
  if (a <= 0) return;
  ctx.save(); ctx.lineCap = 'round';
  for (const [bx, by, d, ph] of WORLD.drops) {
    const z = 0.3 + d * 0.7, sp = 1900 * z, len = 30 + 60 * z;
    const y = ((by * H + t * sp + ph * 3000) % (H + 200)) - 100, x = ((bx * (W + 400) + y * wind) % (W + 400)) - 200;
    ctx.strokeStyle = `rgba(190,205,225,${a * (0.05 + 0.16 * z)})`; ctx.lineWidth = 0.6 + 1.4 * z;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * wind, y + len); ctx.stroke();
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
  face(rb, [70, 60, 56], 0.5); face(rf, [86, 70, 62], 0.8);
  // rain-wet roof sheen
  poly(ctx, rf.map((p) => [p[0], p[1]])); ctx.fillStyle = `rgba(150,170,200,${0.06 * (1 - ff)})`; ctx.fill();
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
  // flashlight pool on the wall
  if (L && L.I > 0) {
    const tg = (QZ - L.z) / Math.max(0.1, L.dir ? L.dir[2] : 1);
    const hx = L.x + (L.dir ? L.dir[0] : 0) * tg, hy = L.y + (L.dir ? L.dir[1] : 0) * tg;
    const hp = proj(cam, hx, hy, QZ), rr = proj(cam, hx + 1.4, hy, QZ);
    if (hp[2] > 0) radial(ctx, hp[0], hp[1], Math.abs(rr[0] - hp[0]) * 1.6, [[0, `rgba(255,240,210,${0.4 * L.I})`], [0.5, `rgba(230,220,190,${0.12 * L.I})`], [1, 'rgba(0,0,0,0)']], 'screen');
  }
  ctx.restore();
  // the cave mouth (or the rubble that sealed it)
  const mouth = [];
  for (let k = 0; k <= 24; k++) { const a = Math.PI * k / 24, jag = 0.15 * n1(k * 1.7, 4); mouth.push(proj(cam, CAVE.x - Math.cos(a) * (CAVE.w / 2 + jag), Math.sin(a) * (CAVE.h + jag) , QZ - 0.05)); }
  poly(ctx, mouth.map((p) => [p[0], p[1]]));
  if (o.sealed) {
    ctx.fillStyle = col(mix(lightCol([120, 108, 92], amb + day * 0.7, 0, 0), FOG_COL, ff * 0.6)); ctx.fill();
    ctx.save(); ctx.clip(); const r = mulberry32(5);
    for (let i = 0; i < 70; i++) { const p = proj(cam, CAVE.x + (r() - 0.5) * CAVE.w, r() * CAVE.h, QZ - 0.3); const s = (0.2 + r() * 0.45) * p[3]; const gq = r(); ctx.fillStyle = col(lightCol([100 + gq * 50, 92 + gq * 44, 80 + gq * 36], amb * 2.2 + day * 0.7, 0, ff * 0.5)); ctx.beginPath(); ctx.ellipse(p[0], p[1], s, s * 0.7, r(), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); }
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
// giant prints: three-toed, sunk into the mud, leading out of the sealed cave
function drawTracks(ctx, cam, a, amb) {
  for (let k = 0; k < 7; k++) {
    const z = QZ - 1.5 - k * 2.4, x = CAVE.x + (k % 2 ? 1.1 : -1.1) + n1(k, 3) * 0.3;
    const c = proj(cam, x, 0, z); if (c[2] < 0.4) continue;
    const e = proj(cam, x + 0.8, 0, z), f = proj(cam, x, 0, z + 1.2);
    const rx = Math.abs(e[0] - c[0]), ry = Math.abs(f[1] - c[1]);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = col(lightCol([40, 32, 26], amb, 0, 0)); ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, TAU); ctx.fill();
    for (const tx of [-0.7, 0, 0.7]) { ctx.beginPath(); ctx.ellipse(c[0] + tx * rx * 0.9, c[1] - ry * 1.2, rx * 0.22, ry * 0.5, tx * 0.4, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = col(lightCol([170, 150, 120], amb, 0, 0), 0.5); ctx.lineWidth = Math.max(1, rx * 0.06); ctx.beginPath(); ctx.ellipse(c[0], c[1] - ry * 0.1, rx * 1.05, ry * 1.05, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }
}
function boulderActor(B, o) {
  return { x: B.x, z: B.z, draw: (ctx, cam) => {
    const p = proj(cam, B.x, 0, B.z); if (p[2] < 0.4) return;
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
