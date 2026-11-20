// Scene 2: winter mountain village at night (pre-rendered parallax layers + live snow, wind, candle window).
'use strict';
const VIL = { S: 1.25, WW: 1080, WH: 2700, layers: {} };
const MOON = [770, 330];
const HOME = { x: 600, y: 2080, w: 210, h: 150, win: [708, 2104, 46, 54] };  // narrator's house (world coords)

function vilLayer(draw) {
  const c = makeCanvas(VIL.WW * VIL.S, VIL.WH * VIL.S), x = c.getContext('2d');
  x.scale(VIL.S, VIL.S); draw(x); return c;
}

function ridge(seed, y0, amp, rough, n = 90) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -40 + (VIL.WW + 80) * i / n;
    const v = fbm(i / n * rough, 0.3, 5, seed);
    pts.push([x, y0 - (v - 0.35) * amp - Math.sin(i / n * Math.PI) * amp * 0.25]);
  }
  return pts;
}

function drawMountains(x, seed, y0, amp, rough, base, snow, snowAmt) {
  // per-pixel mountain: couloirs (gullies), snow fields lit from the moon side, darker lower slopes
  const pts = ridge(seed, y0, amp, rough);
  const R = 0.5, w = Math.ceil(VIL.WW * R), top = Math.floor((y0 - amp * 1.1) * R), hh = Math.ceil(amp * 2.6 * R);
  const c = makeCanvas(w, hh), cx = c.getContext('2d'), img = cx.createImageData(w, hh), d = img.data;
  const ridgeAt = (wx) => { const f = (wx + 40) / (VIL.WW + 80) * (pts.length - 1), i = clamp(Math.floor(f), 0, pts.length - 2), u = f - i; return lerp(pts[i][1], pts[i + 1][1], u); };
  const rb = [base[0], base[1], base[2]];
  for (let i = 0; i < w; i++) {
    const wx = i / R, ry = ridgeAt(wx), slope = (ridgeAt(wx + 6) - ridgeAt(wx - 6)) / 12;
    for (let j = 0; j < hh; j++) {
      const wy = top / R + j / R, dd = wy - ry, k = (j * w + i) * 4;
      if (dd < -1) { d[k + 3] = 0; continue; }
      const warp = fbm(wx / 180, dd / 160, 3, seed + 5) * 140;
      const ph = (wx + warp - dd * 0.45) / 34;
      const gully = Math.sin(ph), litG = 0.5 + 0.5 * Math.cos(ph);
      const n = fbm(wx / 55, wy / 30, 4, seed + 9);
      const snowM = smooth(clamp((n * 0.9 + gully * 0.25 + 0.2 - dd / (amp * 2.2) - 0.25) * 3));
      const lit = clamp(0.35 + litG * 0.5 - slope * 0.8) * clamp(1 - dd / (amp * 2.4));
      const rock = 0.6 + n * 0.5;
      let r = rb[0] * rock, g = rb[1] * rock, b = rb[2] * rock;
      r = lerp(r, snow[0] * (0.25 + 0.75 * lit), snowM * snowAmt);
      g = lerp(g, snow[1] * (0.25 + 0.75 * lit), snowM * snowAmt);
      b = lerp(b, snow[2] * (0.25 + 0.75 * lit), snowM * snowAmt);
      const fade = clamp(dd / (amp * 2.2)); r = lerp(r, 6, fade); g = lerp(g, 9, fade); b = lerp(b, 15, fade);
      d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255 * clamp(dd + 1);
    }
  }
  cx.putImageData(img, 0, 0);
  x.drawImage(c, 0, top / R, VIL.WW, hh / R);
  x.fillStyle = 'rgb(6,9,15)'; x.fillRect(0, top / R + hh / R - 2, VIL.WW, VIL.WH);
  x.strokeStyle = col(snow, snowAmt * 0.35); x.lineWidth = 1.2; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
}

function bareTree(x, bx, by, h, seed, colr) {
  const r = mulberry32(seed);
  x.strokeStyle = colr; x.lineCap = 'round';
  const branch = (px, py, ang, len, w, d) => {
    const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
    x.lineWidth = w; x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(ang + 0.2) * len * 0.5, py + Math.sin(ang + 0.2) * len * 0.5, ex, ey); x.stroke();
    if (d <= 0 || len < 4) return;
    const k = 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < k; i++) branch(ex, ey, ang + (r() - 0.5) * 0.7, len * (0.62 + r() * 0.2), w * 0.66, d - 1);
  };
  // poplar: tall, narrow crown
  branch(bx, by, -Math.PI / 2 + (r() - 0.5) * 0.05, h * 0.42, h * 0.035, 6);
}

function drawHouse(x, hx, hy, w, h, seed, o = {}) {
  const r = mulberry32(seed);
  const side = w * (0.28 + r() * 0.1), roofH = h * (0.42 + r() * 0.15), flat = o.flat;
  const wall = o.wall || [26, 32, 44], lit = [62, 76, 98];
  // moon shadow cast on the snow (moon is upper right)
  x.fillStyle = 'rgba(4,8,18,0.42)';
  poly(x, [[hx, hy + h], [hx + w + side, hy + h - side * 0.35], [hx + w + side - 70, hy + h + 30], [hx - 70, hy + h + 34]]); x.fill();
  // right side wall (moon lit)
  poly(x, [[hx + w, hy], [hx + w + side, hy - side * 0.35], [hx + w + side, hy + h - side * 0.35], [hx + w, hy + h]]);
  x.fillStyle = col(lit); x.fill();
  // front wall
  x.fillStyle = col(wall); x.fillRect(hx, hy, w, h);
  // stone texture
  x.save(); x.beginPath(); x.rect(hx, hy, w, h); x.clip();
  for (let i = 0; i < w * h / 160; i++) {
    const sx = hx + r() * w, sy = hy + r() * h, sw = 6 + r() * 12, sh = 4 + r() * 6, v = r() * 14 - 7;
    x.fillStyle = col([wall[0] + v, wall[1] + v, wall[2] + v], 0.9); x.beginPath(); x.ellipse(sx, sy, sw / 2, sh / 2, 0, 0, TAU); x.fill();
  }
  x.fillStyle = linGrad(x, 0, hy, 0, hy + h, [[0, 'rgba(120,140,170,0.10)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
  x.fillRect(hx, hy, w, h);
  x.restore();
  x.save(); x.beginPath(); x.rect(hx + w, hy - side, side, h + side); x.clip();
  for (let i = 0; i < side * h / 160; i++) {
    const sx = hx + w + r() * side, sy = hy - side * 0.35 + r() * h, v = r() * 16 - 8;
    x.fillStyle = col([lit[0] + v, lit[1] + v, lit[2] + v], 0.8); x.beginPath(); x.ellipse(sx, sy, 3 + r() * 5, 2 + r() * 3, 0, 0, TAU); x.fill();
  }
  x.restore();
  // snow drift at the base
  x.fillStyle = 'rgba(150,172,200,0.55)';
  x.beginPath(); x.moveTo(hx - 8, hy + h + 2); x.quadraticCurveTo(hx + w * 0.5, hy + h - 10, hx + w + side + 8, hy + h - side * 0.35 + 2); x.lineTo(hx + w + side + 8, hy + h + 8); x.lineTo(hx - 8, hy + h + 8); x.fill();
  // roof
  if (flat) {
    // flat earthen roof (eastern Anatolia) with thick snow
    poly(x, [[hx - 6, hy], [hx + w + 6, hy], [hx + w + side + 6, hy - side * 0.35], [hx + side - 6, hy - side * 0.35]]);
    x.fillStyle = '#9db1c7'; x.fill();
    x.fillStyle = '#c7d6e6'; x.fillRect(hx - 6, hy - 6, w + 12, 7);
  } else {
    const peak = [hx + w / 2 + side * 0.5, hy - roofH];
    poly(x, [[hx - 10, hy + 2], [hx + w + 10, hy + 2], [peak[0] + w / 2 + 12, peak[1] + 2 - side * 0.0], [peak[0] - 2, peak[1]]]);
    // simple pitched: front slope polygon + side gable
    x.fillStyle = '#1c2431'; x.fill();
    poly(x, [[hx - 10, hy + 2], [peak[0] - 2, peak[1]], [hx + w + 10, hy + 2]]); x.fillStyle = '#141b26'; x.fill();
    // snow on roof
    x.fillStyle = '#aebfd3';
    poly(x, [[hx - 12, hy - 2], [peak[0] - 2, peak[1] - 4], [hx + w + 12, hy - 2], [hx + w + 6, hy + 5], [peak[0] - 2, peak[1] + 6], [hx - 6, hy + 5]]); x.fill();
    // icicles
    x.fillStyle = 'rgba(190,210,232,0.55)';
    for (let i = 0; i < w / 12; i++) { const ix = hx + 4 + r() * (w - 8), il = 2 + r() * 7; poly(x, [[ix - 0.8, hy + 4], [ix + 0.8, hy + 4], [ix, hy + 4 + il]]); x.fill(); }
  }
  // chimney
  if (r() < 0.7) {
    const cx = hx + w * (0.2 + r() * 0.5), cy = hy - (flat ? 18 : roofH * 0.6);
    x.fillStyle = '#18202b'; x.fillRect(cx, cy - 20, 12, 26); x.fillStyle = '#b9cadc'; x.fillRect(cx - 2, cy - 23, 16, 4);
  }
  // windows (dark - everyone asleep, power cut)
  const nw = o.windows ?? (w > 90 ? 2 : 1);
  for (let i = 0; i < nw; i++) {
    const wx = hx + w * (nw === 1 ? 0.6 : 0.2 + i * 0.45), wy = hy + h * 0.3, ww = Math.min(26, w * 0.18), wh = ww * 1.15;
    x.fillStyle = '#05080d'; x.fillRect(wx, wy, ww, wh);
    x.strokeStyle = '#2a3342'; x.lineWidth = 2; x.strokeRect(wx, wy, ww, wh);
    x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.stroke();
    x.fillStyle = 'rgba(150,175,205,0.12)'; x.fillRect(wx + ww * 0.55, wy + 2, ww * 0.4, wh * 0.4);
    x.fillStyle = '#aebfd3'; x.fillRect(wx - 2, wy - 3, ww + 4, 3);
  }
  // door
  if (o.door !== false) {
    const dx = hx + w * (nw === 1 ? 0.18 : 0.62) - (nw === 1 ? 0 : 0), dw = Math.min(30, w * 0.2), dh = h * 0.62;
    if (nw === 1 || w > 90) {
      x.fillStyle = '#20180f'; x.fillRect(dx, hy + h - dh, dw, dh);
      x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1;
      for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(dx + dw * k / 4, hy + h - dh); x.lineTo(dx + dw * k / 4, hy + h); x.stroke(); }
    }
  }
}

function drawPole(x, px, py, h) {
  x.strokeStyle = '#0b0f15'; x.lineWidth = 5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 2, py - h); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.moveTo(px - 18, py - h + 12); x.lineTo(px + 22, py - h + 10); x.stroke();
  // dead street lamp arm
  x.lineWidth = 3; x.beginPath(); x.moveTo(px + 2, py - h + 30); x.quadraticCurveTo(px + 30, py - h + 18, px + 42, py - h + 30); x.stroke();
  x.fillStyle = '#121821'; x.beginPath(); x.ellipse(px + 42, py - h + 33, 9, 5, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(160,180,205,0.25)'; x.beginPath(); x.ellipse(px + 42, py - h + 36, 5, 2, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(190,208,228,0.6)'; x.fillRect(px - 18, py - h + 9, 40, 2);
}
function wire(x, a, b, sag) {
  x.strokeStyle = 'rgba(8,10,14,0.85)'; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag, b[0], b[1]); x.stroke();
}

function drawMosque(x, mx, my) {
  // small village mosque with one minaret
  x.fillStyle = '#1b2330'; x.fillRect(mx, my - 70, 120, 70);
  x.fillStyle = '#3a4a60'; x.fillRect(mx + 120, my - 80, 30, 80);
  x.fillStyle = '#9fb2c8'; x.beginPath(); x.ellipse(mx + 60, my - 70, 52, 34, 0, Math.PI, TAU); x.fill();
  x.fillStyle = '#16202c'; x.beginPath(); x.ellipse(mx + 52, my - 72, 46, 28, 0, Math.PI, TAU); x.fill();
  // minaret
  const bx = mx + 150;
  x.fillStyle = '#17202b'; x.fillRect(bx, my - 300, 22, 300);
  x.fillStyle = '#4b5d75'; x.fillRect(bx + 15, my - 300, 7, 300);
  x.fillStyle = '#1b2531'; x.fillRect(bx - 8, my - 230, 38, 10);
  x.fillStyle = '#9fb2c8'; x.fillRect(bx - 8, my - 233, 38, 3);
  x.fillStyle = '#121921'; poly(x, [[bx - 3, my - 300], [bx + 11, my - 372], [bx + 25, my - 300]]); x.fill();
  x.fillStyle = '#8fa2b8'; poly(x, [[bx + 11, my - 372], [bx + 25, my - 300], [bx + 18, my - 300]]); x.fill();
  x.strokeStyle = '#7f93aa'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx + 11, my - 372); x.lineTo(bx + 11, my - 386); x.stroke();
  x.beginPath(); x.arc(bx + 12, my - 392, 6, 0.6, TAU - 0.6); x.stroke();
}

function buildVillage() {
  const L = VIL.layers;
  L.sky = vilLayer((x) => {
    const g = x.createLinearGradient(0, 0, 0, 1700);
    g.addColorStop(0, '#010207'); g.addColorStop(0.45, '#060b16'); g.addColorStop(1, '#13203a');
    x.fillStyle = g; x.fillRect(0, 0, VIL.WW, VIL.WH);
    const r = mulberry32(4);
    for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(210,222,240,${0.15 + r() * 0.5})`; const s = r() < 0.06 ? 1.8 : 0.9; x.fillRect(r() * VIL.WW, r() * 1300, s, s); }
    // moon + halo
    radial(x, MOON[0], MOON[1], 520, [[0, 'rgba(150,175,215,0.32)'], [0.25, 'rgba(90,115,160,0.14)'], [1, 'rgba(0,0,0,0)']]);
    radial(x, MOON[0], MOON[1], 70, [[0, '#f2f5f8'], [0.82, '#dde4ec'], [1, 'rgba(220,228,236,0)']]);
    x.save(); x.globalAlpha = 0.18; x.fillStyle = '#7d8a9a';
    const rr = mulberry32(8); for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(MOON[0] - 30 + rr() * 50, MOON[1] - 25 + rr() * 45, 6 + rr() * 12, 0, TAU); x.fill(); }
    x.restore();
  });
  L.clouds = vilLayer((x) => {
    const c = noiseCanvas(270, 400, 50, 6, 61, (v, i, j) => {
      const a = clamp((v - 0.5) * 3.2) * clamp(1 - j / 330);
      const lit = clamp(1 - Math.hypot(i * 4 - MOON[0], j * 4 - MOON[1]) / 700);
      const g = 40 + lit * 120 + v * 30;
      return [g * 0.85, g * 0.92, g * 1.08, a * 210];
    });
    x.imageSmoothingEnabled = true; x.drawImage(c, -100, -60, VIL.WW + 200, 1700);
  });
  L.far = vilLayer((x) => drawMountains(x, 11, 1180, 330, 3.2, [24, 32, 46], [175, 196, 224], 0.85));
  L.mid = vilLayer((x) => {
    drawMountains(x, 23, 1430, 220, 4.5, [16, 22, 32], [140, 160, 188], 0.6);
    const r = mulberry32(31);
    for (let i = 0; i < 26; i++) bareTree(x, r() * VIL.WW, 1460 + r() * 120, 110 + r() * 90, 100 + i, 'rgba(6,9,14,0.9)');
  });
  L.village = vilLayer((x) => {
    // snowy slope
    const g = x.createLinearGradient(0, 1500, 0, VIL.WH);
    g.addColorStop(0, '#2b3a50'); g.addColorStop(0.5, '#3d5068'); g.addColorStop(1, '#25344a');
    x.beginPath(); x.moveTo(-40, 1600); x.bezierCurveTo(300, 1520, 700, 1570, 1120, 1500); x.lineTo(1120, VIL.WH); x.lineTo(-40, VIL.WH); x.closePath();
    x.fillStyle = g; x.fill();
    x.save(); x.clip(); x.globalAlpha = 0.35; x.globalCompositeOperation = 'overlay'; x.drawImage(TEX.plaster, 0, 1450, VIL.WW, 1300); x.restore();
    // winding dirt road (trodden snow)
    x.strokeStyle = 'rgba(18,24,34,0.55)'; x.lineWidth = 46; x.lineCap = 'round';
    x.beginPath(); x.moveTo(980, 1590); x.bezierCurveTo(600, 1700, 900, 1880, 420, 1980); x.bezierCurveTo(200, 2030, 380, 2250, 520, 2700); x.stroke();
    x.strokeStyle = 'rgba(160,180,206,0.18)'; x.lineWidth = 20; x.stroke();
    // poplars behind houses
    const r = mulberry32(57);
    for (let i = 0; i < 14; i++) bareTree(x, 40 + r() * 1000, 1640 + r() * 260, 200 + r() * 160, 300 + i, 'rgba(7,10,15,0.95)');
    drawMosque(x, 120, 1760);
    // houses (back to front)
    const houses = [
      [560, 1600, 90, 64, 1, 1], [700, 1620, 110, 70, 2, 0], [860, 1590, 80, 58, 3, 1], [380, 1640, 96, 66, 4, 0],
      [930, 1700, 120, 82, 5, 0], [300, 1800, 110, 80, 6, 1], [470, 1780, 130, 86, 7, 0], [760, 1790, 110, 78, 8, 1],
      [80, 1900, 140, 96, 9, 0], [880, 1920, 150, 100, 10, 1], [300, 2010, 150, 104, 11, 0],
    ];
    for (const [hx, hy, w, h, s, f] of houses) drawHouse(x, hx, hy, w, h, s * 13, { flat: !!f });
    // power poles with wires
    const poles = [[60, 2140, 260], [330, 1960, 210], [560, 1860, 170], [790, 1760, 140], [990, 1690, 120]];
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      wire(x, [a[0] - 16, a[1] - a[2] + 12], [b[0] - 16, b[1] - b[2] + 12], 26);
      wire(x, [a[0] + 20, a[1] - a[2] + 10], [b[0] + 20, b[1] - b[2] + 10], 30);
    }
    for (const [px, py, h] of poles) drawPole(x, px, py, h);
    // stone walls / fences
    x.strokeStyle = 'rgba(10,14,20,0.8)'; x.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const fx = 40 + i * 24, fy = 2290 + Math.sin(i * 0.4) * 10; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + 2, fy - 34); x.stroke(); }
    x.beginPath(); x.moveTo(40, 2272); for (let i = 0; i < 40; i++) x.lineTo(40 + i * 24, 2272 + Math.sin(i * 0.4) * 10); x.stroke();
  });
}

// narrator's house: drawn live (crisp when the camera pushes into its window)
function drawHomeHouse(ctx, t, glow) {
  ctx.save();
  drawHouse(ctx, HOME.x, HOME.y, HOME.w, HOME.h, 777, { windows: 0, flat: false, door: false });
  const { x: hx, y: hy, w, h } = HOME;
  // detailed stone courses on the front wall (visible in the push-in)
  const r = mulberry32(4242);
  ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, w, h); ctx.clip();
  ctx.fillStyle = '#10151d'; ctx.fillRect(hx, hy, w, h);
  for (let yy = hy; yy < hy + h; yy += 10 + r() * 3) {
    let xx = hx - r() * 10;
    while (xx < hx + w) {
      const sw = 12 + r() * 16, sh = 8 + r() * 3, v = r() * 16;
      const lit = 0.55 + 0.45 * (xx - hx) / w;
      ctx.fillStyle = rgba((28 + v) * lit + 6, (34 + v) * lit + 8, (46 + v) * lit + 12, 1);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(xx + 1, yy + 1, sw - 2, sh - 1, 3) : ctx.rect(xx + 1, yy + 1, sw - 2, sh - 1); ctx.fill();
      ctx.fillStyle = 'rgba(160,180,210,0.10)'; ctx.fillRect(xx + 2, yy + 1, sw - 4, 1.2);
      xx += sw;
    }
  }
  ctx.fillStyle = linGrad(ctx, 0, hy, 0, hy + h, [[0, 'rgba(0,0,0,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]);
  ctx.fillRect(hx, hy, w, h);
  ctx.restore();
  const [wx, wy, ww, wh] = HOME.win;
  const fl = 0.82 + 0.1 * n1(t * 7, 5) + 0.06 * n1(t * 17, 6);
  // warm spill on the wall and snow
  radialEllipse(ctx, wx + ww / 2, hy + h + 18, 110, 30, [[0, `rgba(255,170,90,${0.25 * fl})`], [1, 'rgba(255,150,70,0)']]);
  radial(ctx, wx + ww / 2, wy + wh / 2, 120, [[0, `rgba(255,160,80,${0.30 * fl})`], [1, 'rgba(255,140,60,0)']], 'lighter');
  // window recess
  ctx.fillStyle = '#06080b'; ctx.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
  const g = ctx.createRadialGradient(wx + ww * 0.42, wy + wh * 0.66, 1, wx + ww / 2, wy + wh / 2, ww * 0.9);
  g.addColorStop(0, `rgba(255,${205 + 30 * fl},${130 + 50 * glow},1)`); g.addColorStop(0.45, `rgba(${235 * fl},${125 * fl},52,1)`); g.addColorStop(1, '#2a1208');
  ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
  // lace curtain (dantel perde) half drawn on the left
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  ctx.fillStyle = 'rgba(255,236,205,0.28)';
  ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + ww * 0.42, wy); ctx.quadraticCurveTo(wx + ww * 0.2, wy + wh * 0.5, wx + ww * 0.3, wy + wh); ctx.lineTo(wx, wy + wh); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,215,0.25)'; ctx.lineWidth = 0.6;
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(wx + k * 3, wy); ctx.quadraticCurveTo(wx + k * 2 + 4, wy + wh * 0.5, wx + k * 2.6, wy + wh); ctx.stroke(); }
  // candle seen through the glass
  ctx.fillStyle = 'rgba(70,28,8,0.85)'; ctx.fillRect(wx + ww * 0.55, wy + wh * 0.68, 4, 11);
  radial(ctx, wx + ww * 0.55 + 2, wy + wh * 0.62, 9 * fl, [[0, '#fff6d8'], [0.4, 'rgba(255,210,140,0.8)'], [1, 'rgba(255,200,120,0)']]);
  // frost creeping from the corners
  for (const [fx, fy] of [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh]])
    radial(ctx, fx, fy, ww * 0.55, [[0, 'rgba(225,236,250,0.75)'], [0.55, 'rgba(210,225,245,0.25)'], [1, 'rgba(210,225,245,0)']]);
  ctx.restore();
  // wooden frame + mullions
  ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 3.5; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.45); ctx.lineTo(wx + ww, wy + wh * 0.45); ctx.stroke();
  // sill with snow
  ctx.fillStyle = '#23180f'; ctx.fillRect(wx - 7, wy + wh + 2, ww + 14, 5);
  ctx.fillStyle = '#c6d4e4'; ctx.beginPath(); ctx.ellipse(wx + ww / 2, wy + wh + 2, ww / 2 + 7, 3.5, 0, Math.PI, TAU); ctx.fill();
  if (glow > 0) radial(ctx, wx + ww / 2, wy + wh / 2, 50 + glow * 300, [[0, `rgba(255,220,170,${glow})`], [1, 'rgba(255,170,90,0)']], 'lighter');
  // rattling wooden door
  const gust = 0.5 + 0.5 * Math.max(0, n1(t * 1.3, 2));
  const dj = n1(t * 23, 9) * gust;
  ctx.save(); ctx.translate(hx + 24, hy + h);
  ctx.fillStyle = '#05070a'; ctx.fillRect(-2, -100, 46, 100);
  ctx.translate(0, 0); ctx.transform(1, 0, dj * 0.012, 1, 0, 0);
  ctx.fillStyle = '#2b1f14'; ctx.fillRect(0, -97, 42, 97);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.4;
  for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(42 * k / 5, -97); ctx.lineTo(42 * k / 5, 0); ctx.stroke(); }
  ctx.fillStyle = 'rgba(150,170,200,0.12)'; ctx.fillRect(34, -97, 8, 97);
  ctx.fillStyle = '#4a525e'; ctx.fillRect(4, -80, 34, 3); ctx.fillRect(4, -22, 34, 3); ctx.fillRect(33, -52, 4, 6);
  ctx.restore();
  // thin icicles along the eave
  const ri = mulberry32(99);
  for (let i = 0; i < 26; i++) {
    const ix = hx + 6 + ri() * (w - 12), il = 4 + ri() * 16, iw = 1 + ri() * 1.6;
    ctx.fillStyle = linGrad(ctx, ix, hy, ix + iw, hy, [[0, 'rgba(120,150,190,0.5)'], [0.5, 'rgba(230,240,252,0.9)'], [1, 'rgba(120,150,190,0.4)']]);
    ctx.beginPath(); ctx.moveTo(ix - iw, hy + 3); ctx.lineTo(ix + iw, hy + 3); ctx.lineTo(ix, hy + 3 + il); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// snow particles in screen space
function drawSnow(ctx, t, amount = 1, wind = 1) {
  const layers = [[220, 1.0, 40, 0.35], [140, 2.2, 75, 0.55], [40, 5.0, 150, 0.75]];
  ctx.save();
  layers.forEach(([n, sz, sp, a], li) => {
    const r = mulberry32(900 + li);
    for (let i = 0; i < n * amount; i++) {
      const bx = r() * (W + 200), by = r() * (H + 100), ph = r() * 50, s = sz * (0.6 + r() * 0.8);
      const gust = 60 * wind * (1 + 0.6 * fn1(t * 0.4, 33));
      const x = ((bx + t * gust * (0.6 + li * 0.3) + Math.sin(t * 1.2 + ph) * 14) % (W + 200) + (W + 200)) % (W + 200) - 100;
      const y = ((by + t * sp) % (H + 100)) - 50;
      ctx.globalAlpha = a; ctx.fillStyle = '#e4ecf6';
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
  });
  ctx.restore();
}

function shotVillage(ctx, t, lt) {
  // camera path: tilt down from the sky to the village, then push into the candle-lit window
  const a = easeInOut(seg(t, 10.2, 20.2));
  let fx = lerp(560, 640, a), fy = lerp(950, 1990, a), z = lerp(1.0, 1.18, a);
  const p = seg(t, 19.8, 25.0), pe = easeIn(p);
  const tx = HOME.win[0] + HOME.win[2] / 2, ty = HOME.win[1] + HOME.win[3] / 2;
  fx = lerp(fx, tx, smooth(p)); fy = lerp(fy, ty, smooth(p));
  z = z * Math.pow(14, pe);
  const sh = handheld(t, 0.6 * (1 - p), 12);
  const L = VIL.layers, S = VIL.S;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const layer = (img, pf, ox = 0) => {
    ctx.save();
    camera(ctx, fx + ox, 950 + (fy - 950) * pf, z, sh);
    ctx.drawImage(img, 0, 0, VIL.WW, VIL.WH);
    ctx.restore();
  };
  layer(L.sky, 0.35);
  layer(L.clouds, 0.4, -t * 6);
  layer(L.far, 0.55);
  drawFog(ctx, t, 0.10, 14, 3.5, 1, 0, H);
  layer(L.mid, 0.75);
  layer(L.village, 1.0);
  ctx.save(); camera(ctx, fx, fy, z, sh);
  drawHomeHouse(ctx, t, seg(t, 23.6, 25.2) ** 2);
  ctx.restore();
  drawFog(ctx, t, 0.16, 30, 4.5, 3, H * 0.4, H);
  drawSnow(ctx, t, 1, 1);
  // cold blue grade + vignette
  tint(ctx, '#1d3557', 0.35, 'soft-light');
  vignette(ctx, 0.75, 0.3);
  // whiteout into the room
  const wo = seg(t, 24.4, 25.4);
  if (wo > 0) { ctx.save(); ctx.globalAlpha = wo * wo; ctx.fillStyle = '#ffd7a6'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
