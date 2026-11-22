// Sets outside the forest world: close-up bust, the cabin (outside + inside), the room years later, title cards.
'use strict';
const SET = {};
function buildSets() {
  SET.logs = noiseCanvas(512, 256, 1, 1, 61, (v, i, j) => {
    const row = j % 64, edge = Math.min(row, 63 - row);
    const s = fbm(i / 90, j / 5, 4, 71), c = fbm(i / 25, j / 25, 3, 73);
    let g = 120 + (s - 0.5) * 120 + (c - 0.5) * 50 - (edge < 6 ? (6 - edge) * 14 : 0);
    if (edge < 2) g = 20;
    return [g * 1.02, g * 0.9, g * 0.76, 255];
  });
  SET.planks = noiseCanvas(256, 512, 1, 1, 63, (v, i, j) => {
    const col2 = i % 52, edge = Math.min(col2, 51 - col2);
    const s = fbm(i / 4, j / 90, 4, 79);
    let g = 110 + (s - 0.5) * 120 - (edge < 4 ? (4 - edge) * 18 : 0);
    if (edge < 1.5) g = 14;
    return [g * 1.02, g * 0.9, g * 0.76, 255];
  });
}

// ---------- close-up of the narrator: face + old brown coat ----------
// x,y = face centre on screen, k = scale; o passes through to drawManFace; o.coatLight [0..1]
function drawManBust(ctx, x, y, k, o = {}) {
  const L = LIGHTS[o.light || 'lantern'];
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k);
  // coat shoulders behind the head
  const cc = mix(mix(FIG.coat, L.sh, 0.35), L.base, 0.15);
  ctx.fillStyle = col(cc);
  ctx.beginPath(); ctx.moveTo(-520, 1100); ctx.bezierCurveTo(-500, 520, -420, 380, -150, 300); ctx.lineTo(150, 300); ctx.bezierCurveTo(420, 380, 500, 520, 520, 1100); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  const la = L.ang;
  ctx.fillStyle = linGrad(ctx, Math.cos(la) * 500, 0, -Math.cos(la) * 500, 0, [[0, col(L.hi, 0.18)], [0.5, col(L.sh, 0.2)], [1, col(L.sh, 0.85)]]); ctx.fillRect(-540, 280, 1080, 840);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.drawImage(TEX.plaster, -540, 280, 1080, 840); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col(L.sh, 0.6); ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-430 + i * 30, 560 + i * 40); ctx.quadraticCurveTo(-300 + i * 20, 700, -340 + i * 10, 1100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(430 - i * 30, 560 + i * 40); ctx.quadraticCurveTo(300 - i * 20, 700, 340 - i * 10, 1100); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k);
  drawManFace(ctx, Object.assign({ light: 'lantern' }, o));
  // tired eyes: dark bags
  for (const sx of [-1, 1]) radialEllipse(ctx, sx * 62, -28, 44, 16, [[0, col(L.sh, 0.4)], [1, col(L.sh, 0)]]);
  if (o.gray) {   // years later: grey in the beard and temples
    ctx.strokeStyle = 'rgba(200,198,192,0.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); for (const [px, py, l, a, al] of MAN.beard) { if (al < 0.5) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); } ctx.stroke();
    ctx.beginPath(); for (const [px, py, l, a, v] of MAN.hair) { if (v < 0.8 || Math.abs(px) < 100) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); } ctx.stroke();
  }
  // coat collar + lapels over the shirt
  ctx.fillStyle = col(mix(cc, L.sh, 0.25));
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.scale(sx, 1);
    ctx.beginPath(); ctx.moveTo(95, 250); ctx.bezierCurveTo(150, 260, 230, 300, 300, 360); ctx.lineTo(250, 700); ctx.lineTo(120, 560); ctx.bezierCurveTo(110, 450, 100, 360, 70, 300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col(L.sh, 0.7); ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  if (o.hand) {   // hand pressed over his mouth
    ctx.save(); ctx.translate(20 + (o.hand.dx || 0), 300); ctx.rotate(-0.25); ctx.scale(1.05, 1.05);
    drawHand(ctx, { light: o.light === 'dim' ? 'moon' : 'candle', curl: [0.35, 0.3, 0.3, 0.35, 0.3], tremble: o.hand.tremble ?? 0.6, t: o.t });
    ctx.restore();
  }
  ctx.restore();
}

// ---------- the cabin as a forest actor (front facade faces -Z) ----------
const CABIN = { x: 0, z: 103, w: 5.2, h: 2.5, roof: 4.1 };
function cabinActor(o = {}) {
  CABIN.x = pathX(102);
  return {
    x: CABIN.x, z: CABIN.z, bias: 1.5,
    draw: (ctx, cam) => drawCabin(ctx, cam, o),
  };
}
function drawCabin(ctx, cam, o) {
  const X = CABIN.x, Z = CABIN.z, hw = CABIN.w / 2, t = o.t || 0;
  const P = (x, y, z = Z) => proj(cam, X + x, y, z);
  const a = P(-hw, 0), b = P(hw, 0), c = P(hw, CABIN.h), d = P(-hw, CABIN.h), r = P(0, CABIN.roof);
  if (a[2] < 0.3) return;
  const ff = fogK(a[2], o.fogDist || 26), amb = o.amb ?? 0.18;
  const tone = (alb, k = 1) => col(lightCol(alb, amb * k, 0, ff));
  // side wall receding (gives volume)
  const e = P(hw, 0, Z + 4.5), f = P(hw, CABIN.h, Z + 4.5), g2 = P(0.0, CABIN.roof, Z + 4.5);
  ctx.fillStyle = tone([70, 56, 44], 0.4); poly(ctx, [[b[0], b[1]], [e[0], e[1]], [f[0], f[1]], [c[0], c[1]]]); ctx.fill();
  // roof (sagging, mossy) over front and side
  ctx.fillStyle = tone([60, 66, 50], 0.7); poly(ctx, [[d[0] - (c[0] - d[0]) * 0.08, d[1] + 6], [r[0], r[1]], [g2[0], g2[1]], [f[0] + (c[0] - d[0]) * 0.08, f[1] + 4], [c[0] + (c[0] - d[0]) * 0.08, c[1] + 6]]); ctx.fill();
  ctx.fillStyle = tone([40, 40, 34], 0.5); poly(ctx, [[r[0], r[1]], [g2[0], g2[1]], [f[0] + (c[0] - d[0]) * 0.08, f[1] + 4], [c[0] + (c[0] - d[0]) * 0.08, c[1] + 6]]); ctx.fill();
  // front wall logs
  const wall = new Path2D(); wall.moveTo(a[0], a[1]); wall.lineTo(b[0], b[1]); wall.lineTo(c[0], c[1]); wall.lineTo(r[0], r[1] + (c[1] - r[1]) * 0.06); wall.lineTo(d[0], d[1]); wall.closePath();
  ctx.fillStyle = tone([120, 100, 80]); ctx.fill(wall);
  ctx.save(); ctx.clip(wall); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1 - ff * 0.8;
  ctx.drawImage(SET.logs, a[0], r[1], b[0] - a[0], a[1] - r[1]);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = linGrad(ctx, 0, r[1], 0, a[1], [[0, 'rgba(0,0,0,0.6)'], [0.4, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.5)']]); ctx.fillRect(a[0], r[1], b[0] - a[0], a[1] - r[1]);
  // moonlit shadow of the seven heads on the wall (o.shadow 0..1)
  if (o.shadow > 0) {
    ctx.save(); ctx.globalAlpha = 0.9 * o.shadow; ctx.filter = 'blur(3px)';
    const s = (b[0] - a[0]) / CABIN.w, cx = (a[0] + b[0]) / 2 + (o.shadowX || 0) * s, by = a[1];
    ctx.translate(cx, by + 0.6 * s); ctx.scale(s * 1.05, s * 0.95);
    const J = yPose({ t, lean: 0.1 });
    ctx.fillStyle = '#020203';
    const sp = new Path2D(); limb(sp, J.hip, J.sh, 0.5, 0.75); limb(sp, J.shL, J.shR, 0.25, 0.25);
    for (const sd of ['L', 'R']) { limb(sp, J['sh' + sd], J['el' + sd], 0.12, 0.08); limb(sp, J['el' + sd], J['ha' + sd], 0.08, 0.06); }
    YM.heads.forEach((h, i) => { const tip = [J.sh[0] + h.to[0] + n1(t * 0.4, 50 + i) * 0.08, J.sh[1] + h.to[1] + n1(t * 0.3, 90 + i) * 0.05]; limb(sp, [J.sh[0] + h.rx, J.sh[1]], tip, 0.09, 0.07); sp.moveTo(tip[0] + 0.13, tip[1] - 0.12); sp.ellipse(tip[0], tip[1] - 0.12, 0.13, 0.2, 0, 0, TAU); limb(sp, [tip[0], tip[1] - 0.1], [tip[0] + n1(t * 0.5, i) * 0.05, tip[1] + 0.45], 0.2, 0.12); });
    ctx.fill(sp); ctx.restore();
  }
  ctx.restore();
  // door (centre) and a dead window (left)
  const dw = 0.95, dh = 1.95, kn = o.knock || 0;
  const da = P(-dw / 2 + kn * 0.01, 0), db = P(dw / 2, 0), dc = P(dw / 2, dh), dd = P(-dw / 2 + kn * 0.01, dh);
  const door = new Path2D(); door.moveTo(da[0], da[1]); door.lineTo(db[0], db[1]); door.lineTo(dc[0], dc[1]); door.lineTo(dd[0], dd[1]); door.closePath();
  ctx.fillStyle = tone([96, 78, 60]); ctx.fill(door);
  ctx.save(); ctx.clip(door); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(SET.planks, da[0], dd[1], db[0] - da[0], da[1] - dd[1]); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(door);
  // iron straps + ring handle
  ctx.fillStyle = tone([40, 40, 44], 0.6);
  for (const hy of [0.4, 1.5]) { const p1 = P(-dw / 2, hy), p2 = P(dw * 0.35, hy + 0.08); ctx.fillRect(p1[0], p1[1], p2[0] - p1[0], Math.max(2, (p1[1] - p2[1]) * 1.2)); }
  const rh = P(dw * 0.32, 1.0); ctx.strokeStyle = tone([60, 60, 64], 0.8); ctx.lineWidth = Math.max(1.5, 0.02 * rh[3]); ctx.beginPath(); ctx.arc(rh[0], rh[1], 0.06 * rh[3], 0, TAU); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = Math.max(1.5, 0.03 * da[3]); ctx.stroke(door);
  const wa = P(-1.9, 1.0), wb = P(-1.1, 1.65);
  ctx.fillStyle = '#030405'; ctx.fillRect(wa[0], wb[1], wb[0] - wa[0], wa[1] - wb[1]);
  ctx.strokeStyle = tone([80, 66, 52], 0.6); ctx.lineWidth = Math.max(1, 0.05 * wa[3]); ctx.strokeRect(wa[0], wb[1], wb[0] - wa[0], wa[1] - wb[1]);
  ctx.beginPath(); ctx.moveTo((wa[0] + wb[0]) / 2, wb[1]); ctx.lineTo((wa[0] + wb[0]) / 2, wa[1]); ctx.stroke();
  // dust shaken loose by the knocks
  if (o.dust > 0) {
    const rr = mulberry32(Math.floor(o.dustSeed || 1));
    ctx.fillStyle = `rgba(190,190,180,${0.5 * o.dust})`;
    for (let i = 0; i < 60; i++) { const px = lerp(dd[0], dc[0], rr()), py = dd[1] + (1 - o.dust) * 200 * rr() + rr() * 30; ctx.fillRect(px, py, 2, 2); }
  }
}

// ---------- cabin interior (screen-space perspective box) ----------
// o: {t, look (0 = door wall, 1 = ceiling), z (dolly), shake, bolt (0..1), doorKick, creak}
function drawCabinInside(ctx, o = {}) {
  const t = o.t || 0, z = o.z || 1, up = o.up || 0;
  ctx.save();
  ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
  const sh = o.shake || 0;
  ctx.translate(W / 2 + n1(t * 30, 1) * sh * 14, H / 2 + n1(t * 27, 2) * sh * 14 + up * 1500); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  // vanishing box: back wall rectangle, near frame = screen edges
  const B = { x0: 230, x1: 850, y0: 560, y1: 1400 };
  const near = { x0: -260, x1: W + 260, y0: -900, y1: H + 200 };
  const wallPoly = (pts, img, alpha, dark) => {
    ctx.save(); poly(ctx, pts); ctx.clip();
    ctx.fillStyle = '#3a2e24'; ctx.fillRect(-400, -1200, W + 800, H + 1600);
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'multiply';
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    ctx.drawImage(img, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(2,3,5,${dark})`; ctx.fillRect(-400, -1200, W + 800, H + 1600);
    ctx.restore();
  };
  wallPoly([[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]], SET.logs, 1, 0.55);                          // back wall (door)
  wallPoly([[near.x0, near.y0], [B.x0, B.y0], [B.x0, B.y1], [near.x0, near.y1]], SET.logs, 1, 0.72);               // left
  wallPoly([[near.x1, near.y0], [B.x1, B.y0], [B.x1, B.y1], [near.x1, near.y1]], SET.logs, 1, 0.66);               // right
  wallPoly([[near.x0, near.y1], [B.x0, B.y1], [B.x1, B.y1], [near.x1, near.y1]], SET.planks, 1, 0.6);              // floor
  // ceiling: beams receding into black
  ctx.save(); poly(ctx, [[near.x0, near.y0], [near.x1, near.y0], [B.x1, B.y0], [B.x0, B.y0]]); ctx.clip();
  ctx.fillStyle = '#060506'; ctx.fillRect(-400, -1200, W + 800, 1800);
  for (let k = 0; k < 6; k++) {
    const u = k / 5, y0 = lerp(near.y0, B.y0, u ** 0.6), y1 = lerp(near.y0, B.y0, (u + 0.05) ** 0.6);
    const x0 = lerp(near.x0, B.x0, u ** 0.6), x1 = lerp(near.x1, B.x1, u ** 0.6);
    ctx.fillStyle = `rgba(78,60,44,${0.8 - u * 0.4})`; ctx.fillRect(x0, y0, x1 - x0, Math.max(6, y1 - y0));
  }
  ctx.strokeStyle = 'rgba(150,176,206,0.18)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(150 + k * 170, -800); ctx.lineTo(260 + k * 120, B.y0); ctx.stroke(); }
  if (o.creak > 0) { ctx.fillStyle = `rgba(170,165,150,${0.6 * o.creak})`; const rr = mulberry32(5); for (let i = 0; i < 50; i++) ctx.fillRect(200 + rr() * 680, -500 + rr() * 900 + (1 - o.creak) * 300 * rr(), 2, 3); }
  ctx.restore();
  // door in the back wall
  const D = { x0: 450, x1: 640, y0: 1000, y1: 1400 };
  ctx.save(); ctx.translate((o.doorKick || 0) * n1(t * 40, 3) * 6, 0);
  ctx.fillStyle = '#2c2219'; ctx.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(SET.planks, D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  // moonlight leaking around the door frame
  ctx.strokeStyle = `rgba(150,176,206,${0.5 + 0.1 * Math.sin(t)})`; ctx.lineWidth = 2.5; ctx.strokeRect(D.x0 - 2, D.y0 - 2, D.x1 - D.x0 + 4, D.y1 - D.y0 + 2);
  // bolt
  const bk = o.bolt ?? 1;
  ctx.fillStyle = '#16161a'; ctx.fillRect(D.x1 - 70, 1190, 90, 16); ctx.fillStyle = '#2a2a30'; ctx.fillRect(D.x1 - 60 + bk * 44, 1186, 46, 24); ctx.fillRect(D.x1 + 20, 1184, 14, 28);
  ctx.restore();
  // moon slits between logs on the walls + a small window on the right wall
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 9; k++) {
    const y = 640 + k * 85 + (k % 3) * 9, a2 = 0.12 + 0.08 * hash2(k, 1, 7);
    ctx.strokeStyle = `rgba(150,176,206,${a2})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(B.x0 + 10 + k * 30, y); ctx.lineTo(B.x0 + 120 + k * 40, y); ctx.stroke();
  }
  ctx.filter = 'blur(24px)'; ctx.fillStyle = 'rgba(120,150,190,0.16)';
  poly(ctx, [[B.x1 + 40, 760], [B.x1 + 160, 700], [B.x1 + 160, 900], [B.x1 + 40, 930]]); ctx.fill();
  poly(ctx, [[B.x1 + 60, 820], [B.x1 + 150, 800], [500, H + 100], [100, H + 100]]); ctx.globalAlpha = 0.35; ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0b0d12'; poly(ctx, [[B.x1 + 40, 760], [B.x1 + 160, 700], [B.x1 + 160, 900], [B.x1 + 40, 930]]); ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------- the room, years later ----------
// o: {t, z, eyes (0..1 per pair array), lamp}
function drawOldRoom(ctx, o = {}) {
  const t = o.t || 0, z = o.z || 1;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  // plaster wall, very dark, warm lamp from the lower right
  ctx.fillStyle = '#17130f'; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TEX.plaster, -200, -200, W + 400, H + 400); ctx.globalCompositeOperation = 'source-over';
  const fl = 1 + n1(t * 7, 2) * 0.06;
  radial(ctx, 980, 1500, 1200 * fl, [[0, 'rgba(200,120,60,0.28)'], [0.5, 'rgba(120,60,30,0.1)'], [1, 'rgba(0,0,0,0)']], 'screen');
  // window behind him (upper left): night outside, frame cross
  const Wn = { x: 120, y: 340, w: 470, h: 600 };
  ctx.fillStyle = '#05070b'; ctx.fillRect(Wn.x, Wn.y, Wn.w, Wn.h);
  ctx.save(); ctx.beginPath(); ctx.rect(Wn.x, Wn.y, Wn.w, Wn.h); ctx.clip();
  ctx.fillStyle = linGrad(ctx, 0, Wn.y, 0, Wn.y + Wn.h, [[0, '#0c1220'], [1, '#05070a']]); ctx.fillRect(Wn.x, Wn.y, Wn.w, Wn.h);
  radial(ctx, Wn.x + 380, Wn.y + 90, 160, [[0, 'rgba(150,176,206,0.25)'], [1, 'rgba(150,176,206,0)']], 'screen');
  ctx.fillStyle = '#020305';
  for (let k = 0; k < 7; k++) { const x = Wn.x + 20 + k * 70 + hash2(k, 1, 3) * 30; ctx.fillRect(x, Wn.y + 80 + hash2(k, 2, 3) * 60, 10 + hash2(k, 3, 3) * 16, Wn.h); }
  // seven pairs of pale eyes pressed close to the glass
  const ey = o.eyes || [];
  const spots = [[0.22, 0.32], [0.5, 0.22], [0.78, 0.36], [0.33, 0.55], [0.66, 0.6], [0.18, 0.78], [0.82, 0.8]];
  spots.forEach(([u, v], i) => {
    const a = ey[i] || 0; if (a <= 0) return;
    const cx = Wn.x + u * Wn.w, cy = Wn.y + v * Wn.h, s = 26 + (i % 3) * 6;
    radialEllipse(ctx, cx, cy, s * 2.2, s * 1.2, [[0, `rgba(150,160,150,${0.12 * a})`], [1, 'rgba(0,0,0,0)']], 'screen');
    for (const sx of [-1, 1]) {
      const ex = cx + sx * s * 0.62, eyy = cy + n1(t * 0.4, i) * 3;
      radial(ctx, ex, eyy, s * 0.7, [[0, `rgba(230,238,228,${0.55 * a})`], [1, 'rgba(200,210,200,0)']], 'screen');
      ctx.fillStyle = `rgba(232,238,228,${0.95 * a})`; ctx.beginPath(); ctx.ellipse(ex, eyy, s * 0.26, s * 0.16, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.arc(ex, eyy, s * 0.05, 0, TAU); ctx.fill();
    }
  });
  // glass reflection
  ctx.fillStyle = linGrad(ctx, Wn.x, Wn.y, Wn.x + Wn.w, Wn.y + Wn.h, [[0, 'rgba(255,200,150,0.05)'], [0.5, 'rgba(255,200,150,0)'], [1, 'rgba(255,200,150,0.04)']]); ctx.fillRect(Wn.x, Wn.y, Wn.w, Wn.h);
  ctx.restore();
  ctx.strokeStyle = '#1e1610'; ctx.lineWidth = 26; ctx.strokeRect(Wn.x, Wn.y, Wn.w, Wn.h);
  ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(Wn.x + Wn.w / 2, Wn.y); ctx.lineTo(Wn.x + Wn.w / 2, Wn.y + Wn.h); ctx.moveTo(Wn.x, Wn.y + Wn.h / 2); ctx.lineTo(Wn.x + Wn.w, Wn.y + Wn.h / 2); ctx.stroke();
  ctx.fillStyle = '#120d09'; ctx.fillRect(Wn.x - 30, Wn.y + Wn.h + 10, Wn.w + 60, 30);
  // him: seated, lamp-lit, older
  drawManBust(ctx, 640, 1180, 0.95, { light: 'candle', t, open: 0.85, look: [0.15, 0.2], knit: 0.4, gray: true, raise: 0.2 });
  ctx.restore();
  vignette(ctx, 0.85, 0.25);
}

// ---------- title / text ----------
function drawTitle(ctx, t, a) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (a <= 0) return;
  const fl = (Math.abs(n1(t * 23, 4)) > 0.75 ? 0.55 : 1);
  ctx.save(); ctx.globalAlpha = clamp(a) * fl;
  ctx.font = '900 150px Inter, "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(227,20,28,0.7)'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#c40d16'; ctx.fillText('YALMAVUZ', W / 2 + n1(t * 30, 2) * 3, 920);
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.4; ctx.fillStyle = '#ff2a2a'; ctx.fillText('YALMAVUZ', W / 2 + 6, 920);
  ctx.restore();
}
function drawDisclaimer(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = '600 30px Inter, "DejaVu Sans", sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(190,196,204,0.85)';
  ctx.fillText('Türk mitolojisinden esinlenen', W / 2, 360); ctx.fillText('kurgusal bir uyarlamadır.', W / 2, 402);
  ctx.restore();
}
