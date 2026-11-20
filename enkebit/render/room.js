// The bedroom of an old Anatolian village house: pre-rendered sets (night / morning) + live props.
'use strict';
const ROOM = { S: 2 };
// wide side view geometry (world coords = screen coords at zoom 1)
const RW = {
  wallBase: 1560, ceil: 230,
  win: [690, 470, 240, 330],
  head: [150, 1010, 66, 690],       // headboard x,y,w,h (posts reach the floor)
  foot: [902, 1170, 52, 530],
  rail: [205, 1440, 700, 58],       // side rail
  mattressTop: 1335, legBottom: 1700,
  stool: [36, 1440, 112, 262],
};

// ---------- textures ----------
function buildKilim(w, h, seed, pal) {
  const c = makeCanvas(w, h), x = c.getContext('2d'), r = mulberry32(seed);
  x.fillStyle = pal[0]; x.fillRect(0, 0, w, h);
  const band = (y, hh, colr) => { x.fillStyle = colr; x.fillRect(0, y, w, hh); };
  // border stripes
  band(0, 26, pal[2]); band(26, 8, pal[3]); band(h - 34, 8, pal[3]); band(h - 26, 26, pal[2]);
  // rows of lozenges (göl) and hooked "elibelinde" motifs
  const rows = Math.floor((h - 80) / 120);
  for (let i = 0; i < rows; i++) {
    const cy = 60 + i * 120 + 60;
    for (let k = 0; k < Math.ceil(w / 150) + 1; k++) {
      const cx = (i % 2 ? 75 : 0) + k * 150;
      const s = 52;
      x.fillStyle = pal[1]; poly(x, [[cx, cy - s], [cx + s * 0.9, cy], [cx, cy + s], [cx - s * 0.9, cy]]); x.fill();
      x.fillStyle = pal[3]; poly(x, [[cx, cy - s * 0.6], [cx + s * 0.55, cy], [cx, cy + s * 0.6], [cx - s * 0.55, cy]]); x.fill();
      x.fillStyle = pal[2]; poly(x, [[cx, cy - s * 0.28], [cx + s * 0.26, cy], [cx, cy + s * 0.28], [cx - s * 0.26, cy]]); x.fill();
      // hooks
      x.strokeStyle = pal[1]; x.lineWidth = 7;
      for (const sgn of [-1, 1]) {
        x.beginPath(); x.moveTo(cx + sgn * s * 0.9, cy); x.lineTo(cx + sgn * s * 1.2, cy); x.lineTo(cx + sgn * s * 1.2, cy - 18); x.stroke();
        x.beginPath(); x.moveTo(cx + sgn * s * 1.2, cy); x.lineTo(cx + sgn * s * 1.2, cy + 18); x.stroke();
      }
    }
    band(cy + 64, 6, pal[3]);
  }
  // wear, weave lines and dirt
  x.globalAlpha = 0.18;
  for (let yy = 0; yy < h; yy += 3) { x.fillStyle = yy % 6 ? '#000' : '#fff'; x.fillRect(0, yy, w, 1); }
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.5; x.drawImage(TEX.plaster, 0, 0, w, h);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  return c;
}

// perspective plank floor between yTop (far) and yBot (near), boards running toward the vanishing point
function drawPlankFloor(x, yTop, yBot, vpx, vpy, o = {}) {
  const n = o.boards || 14, spread = o.spread || 2.6, base = o.base || [52, 40, 30];
  const xAt = (k, y) => vpx + (k / n - 0.5) * W * spread * (y - vpy) / (yBot - vpy);
  for (let k = -n; k < n * 2; k++) {
    const a0 = xAt(k, yTop), a1 = xAt(k + 1, yTop), b0 = xAt(k, yBot), b1 = xAt(k + 1, yBot);
    if (Math.max(a1, b1) < -50 || Math.min(a0, b0) > W + 50) continue;
    x.save(); poly(x, [[a0, yTop], [a1, yTop], [b1, yBot], [b0, yBot]]); x.clip();
    const v = (hash2(k, 3, 7) - 0.5) * 18;
    x.fillStyle = col([base[0] + v, base[1] + v * 0.8, base[2] + v * 0.6]); x.fillRect(Math.min(a0, b0) - 5, yTop, Math.abs(b1 - b0) + Math.abs(a1 - a0) + 400, yBot - yTop);
    // grain texture (stretched along the board)
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.7;
    x.translate((a0 + b0) / 2, yTop); x.transform(1, 0, ((b0 + b1) / 2 - (a0 + a1) / 2) / (yBot - yTop), 1, 0, 0);
    x.rotate(Math.PI / 2); x.drawImage(TEX.wood, 0, -Math.abs(b1 - b0) / 2 - 2, (yBot - yTop), Math.abs(b1 - b0) + 4);
    x.restore();
    // board gap
    x.strokeStyle = 'rgba(0,0,0,0.75)'; x.lineWidth = 1 + 2.2 * (o.gapW || 1);
    x.beginPath(); x.moveTo(a0, yTop); x.lineTo(b0, yBot); x.stroke();
    // butt joints (closer together toward the far end)
    const r = mulberry32(k * 13 + 5);
    let u = r() * 0.4;
    while (u < 1) {
      const y = yTop + (yBot - yTop) * u * u;
      const xa = xAt(k, y), xb = xAt(k + 1, y);
      x.lineWidth = 1 + 1.5 * u; x.beginPath(); x.moveTo(xa, y); x.lineTo(xb, y); x.stroke();
      // nail heads
      x.fillStyle = 'rgba(10,10,12,0.8)'; x.beginPath(); x.arc(lerp(xa, xb, 0.25), y + 4 * u, 1 + 2 * u, 0, TAU); x.arc(lerp(xa, xb, 0.75), y + 4 * u, 1 + 2 * u, 0, TAU); x.fill();
      u += 0.25 + r() * 0.35;
    }
  }
  // depth shading
  x.fillStyle = linGrad(x, 0, yTop, 0, yBot, [[0, 'rgba(0,0,0,0.65)'], [0.5, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.1)']]);
  x.fillRect(0, yTop, W, yBot - yTop);
}

function drawPlasterWall(x, x0, y0, w, h, base, seed) {
  x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
  x.fillStyle = col(base); x.fillRect(x0, y0, w, h);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.55; x.drawImage(TEX.plaster, x0, y0, w, h);
  x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.6; x.drawImage(TEX.paper, x0, y0, w, h);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // cracks
  const r = mulberry32(seed);
  x.strokeStyle = 'rgba(10,12,16,0.55)';
  for (let i = 0; i < 7; i++) {
    let cx = x0 + r() * w, cy = y0 + r() * h, a = r() * TAU; x.lineWidth = 0.6 + r() * 1.2;
    x.beginPath(); x.moveTo(cx, cy);
    for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 1.1; cx += Math.cos(a) * 9; cy += Math.sin(a) * 9; x.lineTo(cx, cy); }
    x.stroke();
  }
  // water stains / soot near the ceiling
  for (let i = 0; i < 5; i++) radialEllipse(x, x0 + r() * w, y0 + r() * h * 0.4, 80 + r() * 160, 50 + r() * 80, [[0, 'rgba(30,26,20,0.18)'], [1, 'rgba(0,0,0,0)']]);
  x.restore();
}

function drawBeams(x, y1, light) {
  // dark plank ceiling with round poplar beams (typical village house)
  x.fillStyle = '#0b0908'; x.fillRect(0, 0, W, y1);
  for (let i = 0; i < 18; i++) { const yy = i * (y1 / 18); x.fillStyle = i % 2 ? 'rgba(40,32,24,0.6)' : 'rgba(26,20,15,0.6)'; x.fillRect(0, yy, W, y1 / 18 - 1); }
  for (const [by, bh] of [[40, 34], [118, 42], [196, 46]]) {
    x.fillStyle = linGrad(x, 0, by, 0, by + bh, [[0, `rgba(${70 * light},${58 * light},${46 * light},1)`], [0.4, '#2a2018'], [1, '#090706']]);
    x.fillRect(0, by, W, bh);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.6; x.drawImage(TEX.wood, 0, by, W, bh); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
  x.fillStyle = linGrad(x, 0, 0, 0, y1 + 40, [[0, 'rgba(0,0,0,0.8)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, y1 + 40);
}

function drawNazar(x, nx, ny, s = 1) {
  x.strokeStyle = 'rgba(30,25,20,0.9)'; x.lineWidth = 1.2 * s; x.beginPath(); x.moveTo(nx, ny - 40 * s); x.lineTo(nx, ny - 14 * s); x.stroke();
  radial(x, nx, ny, 15 * s, [[0, '#0b0e14'], [0.3, '#0b0e14'], [0.34, '#e8eef6'], [0.55, '#e8eef6'], [0.6, '#2a6bd6'], [0.95, '#1f4fa8'], [1, 'rgba(20,60,140,0)']]);
  x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(nx + 4 * s, ny - 5 * s, 2.2 * s, 0, TAU); x.fill();
}

function drawWindowFrame(x, rect, light) {
  const [wx, wy, ww, wh] = rect;
  // deep recess in the thick wall
  x.fillStyle = '#07090c'; x.fillRect(wx - 26, wy - 26, ww + 52, wh + 52);
  poly(x, [[wx - 26, wy + wh + 26], [wx + ww + 26, wy + wh + 26], [wx + ww, wy + wh], [wx, wy + wh]]);
  x.fillStyle = `rgba(${120 * light},${135 * light},${155 * light},1)`; x.fill();          // sill catching light
  poly(x, [[wx - 26, wy - 26], [wx, wy], [wx, wy + wh], [wx - 26, wy + wh + 26]]); x.fillStyle = '#0d1016'; x.fill();
  poly(x, [[wx + ww + 26, wy - 26], [wx + ww, wy], [wx + ww, wy + wh], [wx + ww + 26, wy + wh + 26]]); x.fillStyle = '#151a22'; x.fill();
}
function drawWindowMullions(x, rect, light) {
  const [wx, wy, ww, wh] = rect;
  x.strokeStyle = '#1d140d'; x.lineWidth = 12; x.strokeRect(wx + 4, wy + 4, ww - 8, wh - 8);
  x.lineWidth = 8; x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh * 0.42); x.lineTo(wx + ww, wy + wh * 0.42); x.stroke();
  x.strokeStyle = `rgba(${150 * light},${170 * light},${200 * light},0.35)`; x.lineWidth = 2;
  x.beginPath(); x.moveTo(wx + ww / 2 + 4, wy); x.lineTo(wx + ww / 2 + 4, wy + wh); x.stroke();
  // frost on the glass edges
  for (const [fx, fy] of [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh], [wx + ww / 2, wy + wh * 0.42]])
    radial(x, fx, fy, ww * 0.32, [[0, 'rgba(220,232,248,0.55)'], [1, 'rgba(210,225,245,0)']]);
}
// live view through the window: sky, moon glow, falling snow
function drawWindowOutside(ctx, rect, t, mode = 'night') {
  const [wx, wy, ww, wh] = rect;
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  if (mode === 'night') {
    ctx.fillStyle = linGrad(ctx, 0, wy, 0, wy + wh, [[0, '#26375a'], [1, '#4c6488']]); ctx.fillRect(wx, wy, ww, wh);
    radial(ctx, wx + ww * 0.8, wy + wh * 0.1, ww * 0.9, [[0, 'rgba(220,232,250,0.85)'], [0.3, 'rgba(150,175,215,0.35)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillStyle = '#0f1724'; ctx.beginPath(); ctx.moveTo(wx, wy + wh * 0.82); ctx.quadraticCurveTo(wx + ww * 0.5, wy + wh * 0.7, wx + ww, wy + wh * 0.86); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx, wy + wh); ctx.fill();
  } else {
    ctx.fillStyle = linGrad(ctx, 0, wy, 0, wy + wh, [[0, '#c9d6e3'], [1, '#e9eef3']]); ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#9fb0c2'; ctx.beginPath(); ctx.moveTo(wx, wy + wh * 0.78); ctx.quadraticCurveTo(wx + ww * 0.5, wy + wh * 0.66, wx + ww, wy + wh * 0.8); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx, wy + wh); ctx.fill();
  }
  const r = mulberry32(55);
  ctx.fillStyle = mode === 'night' ? 'rgba(230,238,250,0.85)' : 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 70; i++) {
    const bx = r() * ww, by = r() * wh, sp = 30 + r() * 60, s = 1 + r() * 2.5;
    const xx = wx + ((bx + t * 25 + Math.sin(t + i) * 8) % ww + ww) % ww, yy = wy + (by + t * sp) % wh;
    ctx.beginPath(); ctx.arc(xx, yy, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// moonlight shaft from the window (polygon) with soft edges
function moonShaft(ctx, pts, alpha, colr = [170, 195, 230]) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(18px)';
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
  g.addColorStop(0, col(colr, alpha)); g.addColorStop(1, col(colr, alpha * 0.25));
  ctx.fillStyle = g; poly(ctx, pts); ctx.fill(); ctx.restore();
}

function drawCandle(ctx, cx, cy, t, lit, s = 1) {
  // brass holder + short tallow candle; lit: 0..1 (flame size); after it goes out a smoke wisp rises
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = linGrad(ctx, -34, 0, 34, 0, [[0, '#3a2a14'], [0.4, '#a77d3a'], [0.6, '#5e4420'], [1, '#2a1d0e']]);
  ctx.beginPath(); ctx.ellipse(0, 40, 34, 9, 0, 0, TAU); ctx.fill();
  ctx.fillRect(-6, 14, 12, 26);
  ctx.beginPath(); ctx.ellipse(0, 14, 16, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = linGrad(ctx, -9, 0, 9, 0, [[0, '#b8a888'], [0.5, '#efe3c6'], [1, '#9a8c70']]);
  ctx.fillRect(-9, -26, 18, 40);
  ctx.fillStyle = '#d9cbb0'; ctx.beginPath(); ctx.ellipse(0, -26, 9, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(240,230,205,0.9)'; ctx.beginPath(); ctx.moveTo(5, -26); ctx.quadraticCurveTo(9, -14, 6, -4); ctx.lineTo(4, -4); ctx.quadraticCurveTo(6, -14, 3, -26); ctx.fill();
  ctx.strokeStyle = '#1a120a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0.5, -34); ctx.stroke();
  if (lit > 0.01) {
    const fl = 1 + 0.12 * n1(t * 11, 1) + 0.08 * n1(t * 23, 2), sway = n1(t * 3, 3) * 2.5 * lit;
    radial(ctx, 0, -46, 260 * lit, [[0, `rgba(255,170,80,${0.30 * lit})`], [0.3, `rgba(255,130,50,${0.12 * lit})`], [1, 'rgba(255,120,40,0)']], 'lighter');
    ctx.save(); ctx.translate(0, -34); ctx.scale(lit, lit * fl);
    ctx.fillStyle = 'rgba(255,190,90,0.85)';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.bezierCurveTo(-8, -10, sway - 2, -22, sway, -30); ctx.bezierCurveTo(sway + 2, -22, 8, -10, 6, 0); ctx.quadraticCurveTo(0, 4, -6, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,225,0.95)';
    ctx.beginPath(); ctx.moveTo(-3, -2); ctx.bezierCurveTo(-4, -9, sway * 0.5 - 1, -16, sway * 0.6, -20); ctx.bezierCurveTo(sway * 0.6 + 1, -16, 4, -9, 3, -2); ctx.fill();
    ctx.fillStyle = 'rgba(80,120,255,0.5)'; ctx.beginPath(); ctx.ellipse(0, -1, 3, 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function drawSmoke(ctx, x0, y0, age, s = 1) {
  if (age <= 0 || age > 6) return;
  ctx.save(); ctx.strokeStyle = `rgba(200,205,215,${0.35 * clamp(1 - age / 6)})`; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, yy = y0 - u * 220 * s * clamp(age / 2.5 + 0.2), xx = x0 + Math.sin(u * 7 + age * 2 + k) * 14 * u * s + n1(u * 3 + age, 7 + k) * 10 * u * s;
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- pre-rendered sets ----------
function roomLayer(w, h, S, draw) {
  const c = makeCanvas(w * S, h * S), x = c.getContext('2d'); x.scale(S, S); draw(x); return c;
}

function drawWideRoom(x, mode) {
  const night = mode === 'night', L = night ? 1 : 1.9;
  const wallC = night ? [52, 60, 74] : [150, 156, 160];
  drawPlasterWall(x, 0, 0, W, RW.wallBase, wallC, 3);
  // wall shading: darker toward ceiling/corners; window light pool
  x.fillStyle = linGrad(x, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.55)'], [0.5, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.35)']]); x.fillRect(0, 0, W, RW.wallBase);
  x.fillStyle = linGrad(x, 0, RW.ceil, 0, RW.wallBase, [[0, 'rgba(0,0,0,0.5)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(0, 0, W, RW.wallBase);
  radialEllipse(x, RW.win[0] + 120, RW.win[1] + 200, 420, 520, [[0, night ? 'rgba(120,145,185,0.22)' : 'rgba(240,244,248,0.35)'], [1, 'rgba(0,0,0,0)']]);
  // skirting (wooden baseboard)
  x.fillStyle = night ? '#120e0b' : '#3a2c20'; x.fillRect(0, RW.wallBase - 22, W, 22);
  drawBeams(x, RW.ceil, L * 0.7);
  // hanging kilim on the left part of the wall
  const k = ROOM.kilim;
  x.save(); x.translate(70, 400);
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(10, 12, 270, 430);
  x.drawImage(k, 0, 0, 270, 430);
  x.fillStyle = night ? 'rgba(10,16,30,0.55)' : 'rgba(40,40,45,0.15)'; x.fillRect(0, 0, 270, 430);
  x.strokeStyle = '#1a120b'; x.lineWidth = 7; x.beginPath(); x.moveTo(-10, -4); x.lineTo(280, -4); x.stroke();
  x.strokeStyle = night ? 'rgba(160,140,120,0.5)' : 'rgba(200,180,150,0.8)'; x.lineWidth = 2;
  for (let i = 0; i < 30; i++) { x.beginPath(); x.moveTo(6 + i * 9, 430); x.lineTo(5 + i * 9 + Math.sin(i) * 3, 448); x.stroke(); }
  x.restore();
  // shelf with a copper jug (ibrik)
  x.fillStyle = night ? '#140f0b' : '#4a3626'; x.fillRect(380, 900, 200, 14);
  x.fillStyle = night ? '#3a2416' : '#8a5530';
  x.beginPath(); x.moveTo(440, 900); x.bezierCurveTo(410, 880, 420, 830, 450, 820); x.lineTo(450, 800); x.lineTo(470, 800); x.lineTo(470, 820); x.bezierCurveTo(500, 830, 510, 880, 480, 900); x.fill();
  x.strokeStyle = x.fillStyle; x.lineWidth = 5; x.beginPath(); x.moveTo(488, 860); x.quadraticCurveTo(520, 840, 530, 805); x.stroke();
  x.fillStyle = night ? 'rgba(150,170,200,0.25)' : 'rgba(255,220,180,0.4)'; x.fillRect(470, 835, 6, 50);
  // window
  drawWindowFrame(x, RW.win, night ? 1 : 1.6);
  drawNazar(x, RW.win[0] - 50, RW.win[1] + 90, 1.1);
  // floor
  drawPlankFloor(x, RW.wallBase, H, 560, 1000, { boards: 12, spread: 2.2, base: night ? [44, 36, 30] : [100, 78, 58] });
  // bed frame (behind the man/blanket): headboard, footboard, rail, legs
  const wood = night ? [34, 26, 20] : [96, 70, 48];
  const plank = (bx, by, bw, bh, shade = 1) => {
    x.fillStyle = col([wood[0] * shade, wood[1] * shade, wood[2] * shade]); x.fillRect(bx, by, bw, bh);
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.6; x.drawImage(TEX.wood, bx, by, bw, bh); x.restore();
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(bx, by, bw, 3);
  };
  // gap under the bed: deep shadow, back legs, slats, an old wooden chest (sandık) far inside
  const gx0 = RW.head[0], gx1 = RW.foot[0] + RW.foot[2], gy0 = RW.rail[1] + 40;
  x.fillStyle = 'rgba(0,0,0,0.88)'; x.fillRect(gx0, gy0, gx1 - gx0, RW.legBottom - gy0);
  x.fillStyle = 'rgba(14,11,9,1)';
  for (const lx of [RW.head[0] + 40, RW.foot[0] - 30]) x.fillRect(lx, gy0, 18, RW.legBottom - gy0 - 40);     // back legs
  for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(20,16,12,0.9)'; x.fillRect(gx0 + 20 + i * 80, gy0, 40, 10); }
  x.fillStyle = '#0d0a08'; x.fillRect(560, 1590, 230, 80); x.fillStyle = '#16110c'; x.fillRect(560, 1590, 230, 14);
  x.fillStyle = 'rgba(80,70,60,0.25)'; x.fillRect(660, 1612, 26, 16);
  radialEllipse(x, 560, RW.legBottom - 20, 520, 80, [[0, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]);
  const [hx, hy, hw, hh] = RW.head;
  plank(hx, hy, 18, hh, 0.9); plank(hx + hw - 18, hy + 30, 18, hh - 30, 0.8);
  for (let i = 0; i < 5; i++) plank(hx + 4, hy + 60 + i * 70, hw - 8, 44, 0.75);
  x.fillStyle = col(wood, 1); x.beginPath(); x.arc(hx + 9, hy, 14, 0, TAU); x.fill();
  const [fx, fy, fw, fh] = RW.foot;
  plank(fx, fy, 16, fh, 0.95); plank(fx + fw - 16, fy + 20, 16, fh - 20, 0.85);
  for (let i = 0; i < 4; i++) plank(fx + 3, fy + 50 + i * 62, fw - 6, 40, 0.8);
  x.fillStyle = col(wood); x.beginPath(); x.arc(fx + 8, fy, 12, 0, TAU); x.fill();
  plank(RW.rail[0], RW.rail[1], RW.rail[2], RW.rail[3], 1.0);
  // front legs (turned wood) reaching the floor
  for (const lx of [RW.head[0] + 6, RW.foot[0] + 2]) {
    plank(lx, RW.rail[1] + RW.rail[3], 26, RW.legBottom - RW.rail[1] - RW.rail[3], 0.9);
    x.fillStyle = col(wood, 1); x.beginPath(); x.ellipse(lx + 13, RW.legBottom - 6, 17, 6, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.ellipse(lx + 18, RW.legBottom + 2, 40, 8, 0, 0, TAU); x.fill();
  }
  // stool for the candle
  const [sx, sy, sw, sh] = RW.stool;
  plank(sx, sy, sw, 18, 1.1); plank(sx + 10, sy + 18, 14, sh - 18, 0.8); plank(sx + sw - 24, sy + 18, 14, sh - 18, 0.7);
  // morning: soft daylight pool on the floor
  if (!night) radialEllipse(x, 640, 1720, 520, 140, [[0, 'rgba(255,250,240,0.25)'], [1, 'rgba(0,0,0,0)']]);
}

// POV from the pillow toward the foot of the bed: far wall with the bolted door
const POV = { wallBase: 1180, door: [560, 300, 300, 820], foot: [140, 1060, 800, 160] };
function drawPovRoom(x, mode) {
  const night = mode === 'night';
  drawPlasterWall(x, 0, 0, W, POV.wallBase, night ? [44, 52, 66] : [140, 146, 150], 8);
  drawBeams(x, 120, night ? 0.6 : 1.3);
  x.fillStyle = linGrad(x, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.6)']]); x.fillRect(0, 0, W, POV.wallBase);
  // wooden door with an iron bolt slid shut (locked from inside)
  const [dx, dy, dw, dh] = POV.door;
  x.fillStyle = '#050608'; x.fillRect(dx - 16, dy - 16, dw + 32, dh + 16);
  x.fillStyle = night ? '#1d150e' : '#5a4130'; x.fillRect(dx, dy, dw, dh);
  x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.7;
  for (let i = 0; i < 5; i++) { x.save(); x.translate(dx + i * dw / 5, dy); x.rotate(Math.PI / 2); x.drawImage(TEX.wood, 0, -dw / 5, dh, dw / 5); x.restore(); }
  x.restore();
  x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 3;
  for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(dx + i * dw / 5, dy); x.lineTo(dx + i * dw / 5, dy + dh); x.stroke(); }
  x.fillStyle = night ? '#2a2420' : '#5e5048';
  x.fillRect(dx, dy + 120, dw, 26); x.fillRect(dx, dy + dh - 160, dw, 26);
  // bolt (sürgü)
  x.fillStyle = night ? '#4b525c' : '#7c838d'; x.fillRect(dx - 40, dy + 430, 110, 16); x.fillRect(dx + 40, dy + 418, 22, 40);
  x.fillStyle = night ? '#2e3238' : '#565c63'; x.fillRect(dx - 52, dy + 422, 22, 32);
  x.fillStyle = 'rgba(200,215,235,0.35)'; x.fillRect(dx - 40, dy + 430, 110, 3);
  // skirting + floor
  x.fillStyle = night ? '#120e0b' : '#3a2c20'; x.fillRect(0, POV.wallBase - 18, W, 18);
  drawPlankFloor(x, POV.wallBase, H, 540, 600, { boards: 10, spread: 3, base: night ? [40, 32, 26] : [96, 74, 56] });
}

function buildRoom() {
  ROOM.kilim = buildKilim(540, 860, 12, ['#5b1f1a', '#2c3f6b', '#b08a4a', '#1d1410']);
  ROOM.blanket = buildKilim(900, 900, 44, ['#4a1c18', '#203457', '#9b7a45', '#170f0c']);
  ROOM.wideNight = roomLayer(W, H, ROOM.S, (x) => drawWideRoom(x, 'night'));
  ROOM.wideMorning = roomLayer(W, H, 1, (x) => drawWideRoom(x, 'morning'));
  ROOM.povNight = roomLayer(W, H, 1.5, (x) => drawPovRoom(x, 'night'));
  ROOM.povMorning = roomLayer(W, H, 1, (x) => drawPovRoom(x, 'morning'));
}
