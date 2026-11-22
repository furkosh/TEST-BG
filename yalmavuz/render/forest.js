// YALMAVUZ forest world: trees, ground litter, sky, fog and a lantern light model, seen through a pinhole camera.
// World units are metres (X right, Y up, Z forward). Every shot places a camera in this one world.
'use strict';
const FOREST = {};
const FOG_COL = [30, 44, 52];        // cold blue-green haze
const MOON_COL = [150, 176, 206];
const LANT_COL = [255, 168, 88];
const BARK = [92, 86, 76];           // bark albedo
const CLEAR = { x: pathX(40), z: 40 };   // the clearing where he meets it (S3-S5)

function pathX(z) { return Math.sin(z * 0.06) * 3 + Math.sin(z * 0.17) * 1.2; }

function makeTree(x, z, rad, r, h) {
  h = h || 15 + r() * 14;
  const kinks = Array.from({ length: 8 }, () => (r() - 0.5) * rad * 0.9);
  const br = [];
  const nb = 3 + Math.floor(r() * 5);
  for (let i = 0; i < nb; i++) {
    const v0 = h * (0.28 + r() * 0.62), side = r() < 0.5 ? -1 : 1, len = (1.4 + r() * 3.6) * (0.5 + rad / 0.35);
    let a = side > 0 ? -(0.25 + r() * 0.9) : Math.PI + (0.25 + r() * 0.9);      // angle in the X/Y plane (up is -)
    const pts = [[side * rad * 0.6, v0, (r() - 0.5) * rad]]; let u = pts[0][0], v = v0, w = pts[0][2];
    for (let k = 0; k < 5; k++) { a += (r() - 0.5) * 0.7; u += Math.cos(a) * len / 5; v -= Math.sin(a) * len / 5; w += (r() - 0.5) * 0.5; pts.push([u, v, w]); }
    br.push({ pts, w0: rad * (0.35 + r() * 0.25), w1: 0.015 });
    if (r() < 0.7) {   // a twig off the branch
      const j = 1 + Math.floor(r() * 3), p = pts[j]; let a2 = a + (r() - 0.5) * 1.6, uu = p[0], vv = p[1], ww = p[2];
      const tw = [[uu, vv, ww]];
      for (let k = 0; k < 3; k++) { a2 += (r() - 0.5) * 0.8; uu += Math.cos(a2) * len * 0.12; vv -= Math.sin(a2) * len * 0.12; tw.push([uu, vv, ww]); }
      br.push({ pts: tw, w0: rad * 0.12, w1: 0.01 });
    }
  }
  // broken stubs low on the trunk
  if (r() < 0.6) { const v0 = 2 + r() * 5, side = r() < 0.5 ? -1 : 1; br.push({ pts: [[side * rad * 0.7, v0, 0], [side * (rad + 0.2 + r() * 0.25), v0 + 0.25 + r() * 0.3, 0]], w0: rad * 0.22, w1: rad * 0.05 }); }
  return { x, z, rad, h, kinks, br, lean: (r() - 0.5) * 0.03, seed: Math.floor(r() * 1e6), moss: r() };
}

function buildForest() {
  const r = mulberry32(4242);
  const trees = [];
  const C = 3.3;
  for (let gz = -70; gz < 130; gz += C) for (let gx = -80; gx < 80; gx += C) {
    if (r() < 0.12) continue;
    const x = gx + r() * C, z = gz + r() * C;
    if (Math.abs(x - pathX(z)) < 1.7) continue;                                    // the trodden path
    if (Math.hypot(x - CLEAR.x, z - CLEAR.z) < 5.2) continue;                      // the clearing
    if (Math.hypot(x - CLEAR.x + 3.4, z - CLEAR.z - 11) < 2.4) continue;
    if (Math.abs(x - pathX(102)) < 6 && Math.abs(z - 103) < 5) continue;          // the cabin
    const b = r();
    trees.push(makeTree(x, z, 0.12 + b * b * 0.36, r));
  }
  // set pieces around the clearing: the old tree it hides behind, the far tree with the hair
  FOREST.hideTree = makeTree(CLEAR.x + 2.4, CLEAR.z + 6.2, 0.62, mulberry32(77), 24);
  FOREST.hairTree = makeTree(CLEAR.x - 3.4, CLEAR.z + 11, 0.42, mulberry32(78), 22);
  trees.push(FOREST.hideTree, FOREST.hairTree);
  FOREST.trees = trees;
  // ground litter near the path and clearing
  const g = [];
  for (let i = 0; i < 5200; i++) {
    const z = -20 + r() * 130, x = pathX(z) + (r() - 0.5) * 34;
    const k = r();
    g.push({ x, z, type: k < 0.55 ? 0 : k < 0.75 ? 1 : k < 0.9 ? 2 : 3, s: 0.5 + r(), a: r() * TAU, c: r() });
  }
  FOREST.ground = g;
  // bark: vertical streaks and cracks
  FOREST.bark = noiseCanvas(96, 512, 1, 1, 9, (v, i, j) => {
    const s = fbm(i / 5, j / 70, 4, 31), c = fbm(i / 12, j / 20, 3, 37);
    let g2 = 150 + (s - 0.5) * 210 + (c - 0.5) * 60;
    if (Math.abs(s - 0.5) < 0.03) g2 -= 70;
    return [g2, g2 * 0.96, g2 * 0.9, 255];
  });
  // soil / leaf litter tile for the ground plane
  FOREST.soil = noiseCanvas(256, 256, 14, 5, 55, (v, i, j) => {
    const l = hash2(i >> 1, j >> 1, 5) > 0.82 ? 30 : 0;
    const g2 = 70 + (v - 0.5) * 90 + l;
    return [g2 * 0.95, g2 * 0.9, g2 * 0.7, 255];
  });
  FOREST.cloud = noiseCanvas(512, 256, 60, 5, 91, (v) => { const a = clamp((v - 0.42) * 2.4); return [70, 82, 96, a * 255]; });
}

// ---------- camera ----------
// cam: {x, y, z, yaw (rad, + turns right), pitch (rad, + looks down), f (px), cx, cy (screen centre), roll}
function mkCam(o) { return Object.assign({ x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0, f: 1150, cx: W / 2, cy: H / 2, roll: 0 }, o); }
function lookAt(o, target) {
  const dx = target[0] - o.x, dy = target[1] - o.y, dz = target[2] - o.z;
  return Object.assign(o, { yaw: Math.atan2(dx, dz), pitch: Math.atan2(-dy, Math.hypot(dx, dz)) });
}
function proj(cam, X, Y, Z) {
  const dx = X - cam.x, dy = Y - cam.y, dz = Z - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = dy * cp + z1 * sp, z2 = -dy * sp + z1 * cp;
  const s = cam.f / Math.max(z2, 0.05);
  return [cam.cx + x1 * s, cam.cy - y2 * s, z2, s];
}
const fogK = (z, dist) => 1 - Math.exp(-Math.max(0, z) / dist);

// lantern light at a world point: returns 0..~1.6
function lanternAt(L, X, Y, Z) {
  if (!L || L.I <= 0) return 0;
  const d2 = (X - L.x) ** 2 + (Y - L.y) ** 2 * 0.6 + (Z - L.z) ** 2;
  return L.I / (1 + d2 / (L.r * L.r));
}
function lightCol(alb, amb, li, fogF) {
  const c = [alb[0] / 255 * (MOON_COL[0] * amb + LANT_COL[0] * li), alb[1] / 255 * (MOON_COL[1] * amb + LANT_COL[1] * li), alb[2] / 255 * (MOON_COL[2] * amb + LANT_COL[2] * li)];
  return mix(c, FOG_COL, fogF);
}

// ---------- sky ----------
function drawSky(ctx, cam, o) {
  const dark = o.skyDark || 0, t = o.t || 0;
  const hz = proj(cam, cam.x + Math.sin(cam.yaw) * 1e4, cam.y, cam.z + Math.cos(cam.yaw) * 1e4)[1];
  ctx.fillStyle = linGrad(ctx, 0, hz - 1600, 0, hz + 40, [[0, col(mix([10, 14, 24], [3, 4, 7], dark))], [0.7, col(mix([22, 34, 46], [6, 9, 13], dark))], [1, col(mix([44, 60, 68], [12, 16, 20], dark))]]);
  ctx.fillRect(0, 0, W, H);
  if (o.moon !== false) {
    // moon: fixed direction in the world (high, slightly left of the path direction)
    const az = o.moonAz ?? -0.35, el = o.moonEl ?? 0.62;
    const M = proj(cam, cam.x + Math.sin(az) * Math.cos(el) * 1e4, cam.y + Math.sin(el) * 1e4, cam.z + Math.cos(az) * Math.cos(el) * 1e4);
    if (M[2] > 0) {
      const ma = 1 - dark * 0.75;
      radial(ctx, M[0], M[1], 520, [[0, `rgba(170,190,215,${0.32 * ma})`], [0.25, `rgba(110,135,165,${0.12 * ma})`], [1, 'rgba(60,80,110,0)']], 'screen');
      ctx.save(); ctx.globalAlpha = ma; ctx.fillStyle = '#dfe7ef'; ctx.beginPath(); ctx.arc(M[0], M[1], 46, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35 * ma; ctx.drawImage(TEX.plaster, M[0] - 46, M[1] - 46, 92, 92); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.restore();
      FOREST.moonScreen = M;
    }
  }
  // drifting clouds (more and darker when the sky closes)
  ctx.save(); ctx.globalAlpha = 0.55 + dark * 0.45;
  const cw = 2400, ox = ((t * 14 + (o.cloudOff || 0)) % cw + cw) % cw;
  for (let x = -ox; x < W; x += cw) { ctx.drawImage(FOREST.cloud, x, hz - 1500, cw, 1100); }
  if (dark > 0) { ctx.globalAlpha = dark * 0.8; for (let x = -ox * 1.3 % cw; x < W; x += cw) ctx.drawImage(FOREST.cloud, x - 300, hz - 1300, cw, 1200); }
  ctx.restore();
  return hz;
}

// ---------- ground ----------
function drawGround(ctx, cam, o, hz) {
  const L = o.lantern, t = o.t || 0, amb = o.amb ?? 0.16, fd = o.fogDist || 26;
  const top = Math.max(-10, hz);
  ctx.fillStyle = linGrad(ctx, 0, top, 0, H, [[0, col(FOG_COL)], [0.06, col(mix([16, 20, 16], FOG_COL, 0.6))], [0.4, col([14, 17, 14])], [1, col([20, 22, 17])]]);
  ctx.fillRect(0, top, W, H - top);
  // soil texture in perspective bands
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
  for (let k = 0; k < 10; k++) {
    const z0 = 1 + k * k * 0.6, z1 = 1 + (k + 1) * (k + 1) * 0.6;
    const a = proj(cam, cam.x, 0, cam.z + z0), b = proj(cam, cam.x, 0, cam.z + z1);
    if (a[2] <= 0) continue;
    const y0 = Math.min(a[1], H + 50), y1 = b[1];
    if (y1 >= y0) continue;
    const sz = 256 * a[3] / 150;
    for (let x = -((t * 0) % sz) - sz; x < W + sz; x += sz) ctx.drawImage(FOREST.soil, x + (cam.x * a[3]) % sz, y1, sz, y0 - y1);
  }
  ctx.restore();
  // lantern pool on the ground
  if (L && L.I > 0) {
    const c = proj(cam, L.x, 0, L.z), e = proj(cam, L.x + L.r * 2.2, 0, L.z), f = proj(cam, L.x, 0, L.z + L.r * 2.2);
    if (c[2] > 0) {
      const rx = Math.abs(e[0] - c[0]) || 1, ry = Math.max(8, Math.abs(f[1] - c[1]) || 1);
      radialEllipse(ctx, c[0], c[1], rx * 1.4, ry * 1.4, [[0, `rgba(255,160,80,${0.26 * L.I})`], [0.25, `rgba(220,120,55,${0.12 * L.I})`], [0.6, `rgba(140,70,30,${0.07 * L.I})`], [1, 'rgba(0,0,0,0)']], 'screen');
    }
  }
  // litter: leaves, twigs, ferns, stones
  for (const g of FOREST.ground) {
    const p = proj(cam, g.x, 0, g.z);
    if (p[2] < 1.6 || p[2] > 34 || p[0] < -200 || p[0] > W + 200 || p[1] > H + 100) continue;
    const li = lanternAt(L, g.x, 0, g.z), ff = fogK(p[2], fd), s = p[3];
    const alb = g.type === 0 ? [80 + g.c * 50, 66 + g.c * 24, 44] : g.type === 1 ? [90, 76, 60] : g.type === 2 ? [60, 90, 56] : [110, 112, 108];
    const c = lightCol(alb, amb * 0.8, li, ff);
    ctx.fillStyle = col(c, 1); ctx.strokeStyle = col(c, 1);
    const sq = clamp(Math.abs(Math.sin(cam.pitch + Math.atan2(cam.y, p[2]))) + 0.15, 0.15, 1);
    if (g.type === 0) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.06 * s * g.s, 0.06 * s * g.s * sq, g.a, 0, TAU); ctx.fill(); }
    else if (g.type === 1) { ctx.lineWidth = Math.max(0.6, 0.012 * s); ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(g.a) * 0.25 * s * g.s, p[1] - Math.sin(g.a) * 0.25 * s * g.s * sq); ctx.lineTo(p[0] + Math.cos(g.a) * 0.25 * s * g.s, p[1] + Math.sin(g.a) * 0.25 * s * g.s * sq); ctx.stroke(); }
    else if (g.type === 2) {
      ctx.lineWidth = Math.max(0.7, 0.014 * s);
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45 + Math.sin(t * 0.8 + g.a) * 0.05, L2 = 0.32 * s * g.s; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + Math.cos(a) * L2 * 0.6, p[1] + Math.sin(a) * L2 * 0.8, p[0] + Math.cos(a) * L2 * 1.1, p[1] + Math.sin(a) * L2 * 0.6 + L2 * 0.2); ctx.stroke(); }
    } else { ctx.beginPath(); ctx.ellipse(p[0], p[1] - 0.03 * s, 0.12 * s * g.s, 0.07 * s * g.s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = col(mix(c, [0, 0, 0], 0.5)); ctx.beginPath(); ctx.ellipse(p[0], p[1] - 0.01 * s, 0.12 * s * g.s, 0.03 * s * g.s, 0, 0, Math.PI); ctx.fill(); }
  }
  // trunk shadows thrown by the lantern
  if (L && L.I > 0.05) {
    for (const T of FOREST.trees) {
      const dx = T.x - L.x, dz = T.z - L.z, d = Math.hypot(dx, dz);
      if (d > 7 || d < 0.3) continue;
      const ux = dx / d, uz = dz / d, nx = -uz * T.rad, nz = ux * T.rad, len = 4 + 6 / (d + 0.5);
      const pts = [[T.x + nx, T.z + nz], [T.x + nx * 1.6 + ux * len, T.z + nz * 1.6 + uz * len], [T.x - nx * 1.6 + ux * len, T.z - nz * 1.6 + uz * len], [T.x - nx, T.z - nz]].map(([x, z]) => proj(cam, x, 0, z));
      if (pts.some((p) => p[2] < 0.3)) continue;
      ctx.fillStyle = linGrad(ctx, pts[0][0], pts[0][1], (pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2, [[0, `rgba(0,0,0,${0.55 * Math.min(1, L.I)})`], [1, 'rgba(0,0,0,0)']]);
      poly(ctx, pts); ctx.fill();
    }
  }
}

// ---------- trees ----------
function drawTree(ctx, cam, T, o) {
  const L = o.lantern, amb = o.amb ?? 0.16, fd = o.fogDist || 26;
  const hs = [0, 0.35, 1.0, 2.2, 4, 7, 11, 16, T.h];
  const P = [];
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i]; if (h > T.h) break;
    const k = T.kinks[Math.min(i, 7)];
    const sk = o.shake ? o.shake(T, h) : 0;
    const p = proj(cam, T.x + T.lean * h + (i > 1 ? k : 0) + sk, h, T.z);
    if (p[2] < 0.25) { if (P.length) break; else continue; }
    const wr = T.rad * (i === 0 ? 1.7 : i === 1 ? 1.25 : 1) * lerp(1, 0.45, h / T.h);
    P.push([p[0], p[1], wr * p[3], p[2], h]);
  }
  if (P.length < 2) return;
  const zc = P[0][3], ff = fogK(zc, fd);
  const minX = Math.min(...P.map((p) => p[0] - p[2])), maxX = Math.max(...P.map((p) => p[0] + p[2]));
  if (maxX < -50 || minX > W + 50) return;
  const li = lanternAt(L, T.x, L ? L.y : 1, T.z);
  // trunk outline
  const path = new Path2D();
  path.moveTo(P[0][0] - P[0][2], P[0][1]);
  for (let i = 1; i < P.length; i++) path.lineTo(P[i][0] - P[i][2], P[i][1]);
  for (let i = P.length - 1; i >= 0; i--) path.lineTo(P[i][0] + P[i][2], P[i][1]);
  path.closePath();
  const dark = lightCol(BARK, amb * 0.35, li * 0.12, ff), lit = lightCol(BARK, amb * 0.9, li, ff);
  let side = 1;
  if (L) { const lp = proj(cam, L.x, L.y, L.z); side = lp[0] > (P[1][0]) ? 1 : -1; if (lp[2] < 0) side = 0; }
  const w0 = P[1][2], x0 = P[1][0];
  if (li > 0.02 && side !== 0) {
    ctx.fillStyle = linGrad(ctx, x0 - side * w0, 0, x0 + side * w0, 0, [[0, col(dark)], [0.55, col(mix(dark, lit, 0.45))], [0.85, col(lit)], [1, col(mix(lit, dark, 0.3))]]);
  } else {
    ctx.fillStyle = linGrad(ctx, x0 - w0, 0, x0 + w0, 0, [[0, col(lightCol(BARK, amb * 0.8, 0, ff))], [0.35, col(dark)], [1, col(mix(dark, [0, 0, 0], 0.3))]]);
  }
  ctx.fill(path);
  // lantern light falls off up the trunk
  if (li > 0.02 && L) {
    const ly = proj(cam, T.x, L.y, T.z)[1], up = proj(cam, T.x, L.y + 4, T.z)[1], dn = proj(cam, T.x, Math.max(0, L.y - 3), T.z)[1];
    ctx.save(); ctx.clip(path);
    const g = ctx.createLinearGradient(0, up, 0, dn);
    const da = `rgba(${dark[0] | 0},${dark[1] | 0},${dark[2] | 0},`;
    g.addColorStop(0, da + '0.95)'); g.addColorStop(clamp((ly - up) / (dn - up + 1e-3)) * 0.7, da + '0)'); g.addColorStop(1, da + '0.2)');
    ctx.fillStyle = g; ctx.fillRect(minX - 5, Math.min(up, P[P.length - 1][1]) - 4000, maxX - minX + 10, 8000);
    ctx.fillStyle = da + '0.95)'; ctx.fillRect(minX - 5, -4000, maxX - minX + 10, up + 4000);
    ctx.restore();
  }
  // bark texture on near trunks
  if (w0 > 10 && ff < 0.8) {
    ctx.save(); ctx.clip(path); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.75 * (1 - ff);
    const top = P[P.length - 1][1], bot = P[0][1];
    ctx.drawImage(FOREST.bark, x0 - w0 * 1.1, top, w0 * 2.2, bot - top);
    ctx.restore();
    // moss on the shaded root flare
    if (T.moss > 0.5) { ctx.save(); ctx.clip(path); ctx.fillStyle = col(lightCol([70, 96, 54], amb * 0.7, li * 0.6, ff), 0.5); ctx.fillRect(x0 - w0 * 1.5, P[1][1] - w0 * 1.2, w0 * 3, P[0][1] - P[1][1] + w0 * 1.2); ctx.restore(); }
  }
  // cold moon rim on the left edge
  ctx.strokeStyle = col(mix(MOON_COL, FOG_COL, ff), (0.18 + amb * 0.5) * (1 - ff * 0.7)); ctx.lineWidth = Math.max(1, w0 * 0.08);
  ctx.beginPath(); ctx.moveTo(P[0][0] - P[0][2] + 1, P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0] - P[i][2] + 1, P[i][1]); ctx.stroke();
  // branches
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bc = col(mix(dark, [0, 0, 0], 0.15));
  ctx.strokeStyle = bc;
  for (const b of T.br) {
    let prev = null; const n = b.pts.length;
    for (let i = 0; i < n; i++) {
      const [u, v, w] = b.pts[i];
      const p = proj(cam, T.x + u + T.lean * v + (o.shake ? o.shake(T, v) : 0), v, T.z + w);
      if (p[2] < 0.3) { prev = null; continue; }
      if (prev) { ctx.lineWidth = Math.max(0.6, lerp(b.w0, b.w1, i / (n - 1)) * 2 * p[3]); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
      prev = p;
    }
  }
}

// ---------- the whole world ----------
// o: {t, lantern:{x,y,z,I,r}, amb, fogDist, skyDark, actors:[{x,z,draw(ctx,cam)}], shake, treeFilter, fog}
function renderForest(ctx, cam, o) {
  const hz = drawSky(ctx, cam, o);
  drawGround(ctx, cam, o, hz);
  // far haze band at the horizon
  ctx.fillStyle = linGrad(ctx, 0, hz - 500, 0, hz + 120, [[0, col(FOG_COL, 0)], [0.7, col(FOG_COL, 0.55)], [1, col(FOG_COL, 0)]]);
  ctx.fillRect(0, hz - 500, W, 620);
  const items = [];
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  for (const T of FOREST.trees) {
    const dx = T.x - cam.x, dz = T.z - cam.z, z1 = dx * sy + dz * cy, x1 = dx * cy - dz * sy;
    if (z1 < -2 || z1 > (o.far || 75)) continue;
    if (Math.abs(x1) > z1 * 0.75 + 3 && z1 > 0) continue;
    if (o.treeFilter && !o.treeFilter(T)) continue;
    items.push({ d: z1, f: () => drawTree(ctx, cam, T, o) });
  }
  for (const A of o.actors || []) {
    const dx = A.x - cam.x, dz = A.z - cam.z;
    items.push({ d: dx * sy + dz * cy + (A.bias || 0), f: () => A.draw(ctx, cam) });
  }
  items.sort((a, b) => b.d - a.d);
  const fogAt = [12, 24];
  let fi = 0;
  for (const it of items) {
    while (fi < fogAt.length && it.d < fogAt[fi]) { drawFog(ctx, o.t + fi * 30, (o.fog ?? 0.12) * (fi ? 0.55 : 0.9), 10 + fi * 6, 4 + fi, fi + 3, hz - 900, hz + 500); fi++; }
    it.f();
  }
  drawFog(ctx, o.t + 77, (o.fog ?? 0.12) * 0.35, 22, 6, 9, hz - 600, hz + 300);
  return hz;
}

// lantern glow sprite (after everything): bloom around the flame
function drawLanternGlow(ctx, cam, L, t) {
  if (!L || L.I <= 0) return;
  const p = proj(cam, L.x, L.y, L.z); if (p[2] < 0.2) return;
  const s = p[3];
  radial(ctx, p[0], p[1], 2.6 * s, [[0, `rgba(255,190,120,${0.3 * L.I})`], [0.15, `rgba(255,150,70,${0.14 * L.I})`], [1, 'rgba(120,50,10,0)']], 'screen');
  radial(ctx, p[0], p[1], 0.35 * s, [[0, `rgba(255,236,190,${0.8 * L.I})`], [1, 'rgba(255,170,80,0)']], 'screen');
}
// light-shafts of moonlight through the canopy
function moonShafts(ctx, t, a = 0.08, seed = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(30px)';
  const r = mulberry32(seed);
  for (let i = 0; i < 4; i++) {
    const x = r() * W * 1.2 - 100, w = 60 + r() * 120, k = a * (0.6 + 0.4 * Math.sin(t * 0.3 + i));
    ctx.fillStyle = `rgba(150,175,205,${k})`;
    poly(ctx, [[x, -50], [x + w, -50], [x + w + 520, H + 50], [x + 520 - w * 0.5, H + 50]]); ctx.fill();
  }
  ctx.restore();
}
