// Shot list: every shot is a function (ctx, t) that paints the full frame for absolute time t.
'use strict';
const E = window.TL.events;
const beat = (t, k, dur = 0.35, f = 70) => { const d = t - k; return d >= 0 && d < dur ? Math.exp(-d * 14) * Math.sin(d * f) : 0; };

// ======================= shared compositions =======================

// camera on the floor looking into the darkness under the bed
function drawUnderBed(ctx, t, o = {}) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // floor boards running into the dark gap
  ctx.save();
  drawPlankFloor(ctx, 930, H + 40, 540, 760, { boards: 7, spread: 3.6, base: [46, 38, 31], gapW: 1.6 });
  ctx.restore();
  // scratch marks already left on the boards
  if (o.marks) {
    ctx.save(); ctx.strokeStyle = 'rgba(205,190,170,0.55)'; ctx.lineCap = 'round';
    for (const m of o.marks) { if (m.p <= 0) continue; ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(lerp(m.x0, m.x1, m.p), lerp(m.y0, m.y1, m.p)); ctx.stroke(); }
    ctx.restore();
  }
  // moonlight strip across the near boards
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(26px)';
  ctx.fillStyle = 'rgba(120,150,195,0.33)'; poly(ctx, [[120, 1260], [760, 1150], [1140, 1520], [330, 1720]]); ctx.fill();
  ctx.restore();
  // the dark gap: everything beyond y~1000 dissolves into black
  ctx.fillStyle = linGrad(ctx, 0, 880, 0, 1260, [[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 600, W, 700);
  // bed rail + hanging blanket (top of frame)
  ctx.save();
  ctx.fillStyle = '#120d0a'; ctx.fillRect(-20, 540, W + 40, 110);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.7; ctx.drawImage(TEX.wood, -20, 540, W + 40, 110); ctx.restore();
  ctx.fillStyle = 'rgba(150,170,200,0.10)'; ctx.fillRect(-20, 540, W + 40, 4);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(W + 20, 0); ctx.lineTo(W + 20, 520);
  for (let i = 0; i <= 12; i++) { const x = W + 20 - i * (W + 40) / 12; ctx.lineTo(x, 520 + Math.sin(i * 1.7 + t * 0.6) * 8 + (i % 2) * 14); }
  ctx.closePath(); ctx.clip();
  ctx.drawImage(ROOM.blanket, -40, -200, 1160, 760);
  ctx.fillStyle = 'rgba(6,10,20,0.78)'; ctx.fillRect(-40, -200, 1160, 760);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 16;
  for (const fx of [150, 420, 700, 930]) { ctx.beginPath(); ctx.moveTo(fx, 0); ctx.quadraticCurveTo(fx + 30, 300, fx - 10, 540); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(140,125,110,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 70; i++) { const x = i * 16, y = 524 + Math.sin(i * 0.9) * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(t * 0.8 + i) * 2, y + 26); ctx.stroke(); }
  // bed legs at the frame edges
  for (const lx of [40, 960]) {
    ctx.fillStyle = '#1a130e'; ctx.fillRect(lx, 640, 70, 760);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(lx, 640); ctx.rotate(Math.PI / 2); ctx.drawImage(TEX.wood, 0, -70, 760, 70); ctx.restore();
    ctx.fillStyle = 'rgba(150,170,200,0.12)'; ctx.fillRect(lx + 52, 640, 6, 760);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.ellipse(lx + 35, 1400, 70, 16, 0, 0, TAU); ctx.fill();
  }
  dustMotes(ctx, t, 50, { x: 100, y: 900, w: 900, h: 700 }, 9, 0.35, 1.8);
}

// POV from the pillow: blanket mound, footboard, the far wall with the bolted door
function drawPovBase(ctx, t, mode = 'night', z = 1, sh = null, focus = [540, 960]) {
  ctx.save(); camera(ctx, focus[0], focus[1], z, sh);
  ctx.drawImage(mode === 'night' ? ROOM.povNight : ROOM.povMorning, 0, 0, W, H);
  ctx.restore();
}
function drawFootboardPov(ctx, mode = 'night') {
  const [fx, fy, fw, fh] = POV.foot, night = mode === 'night';
  const wood = night ? [30, 23, 18] : [96, 70, 48];
  ctx.fillStyle = col(wood); ctx.fillRect(fx, fy, fw, 46);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.7; ctx.drawImage(TEX.wood, fx, fy, fw, 46); ctx.restore();
  ctx.fillStyle = night ? 'rgba(160,185,220,0.25)' : 'rgba(255,245,230,0.35)'; ctx.fillRect(fx, fy, fw, 4);
  for (const px of [fx - 10, fx + fw - 40]) {
    ctx.fillStyle = col(wood); ctx.fillRect(px, fy - 40, 50, 460);
    ctx.fillStyle = col(wood); ctx.beginPath(); ctx.arc(px + 25, fy - 40, 27, 0, TAU); ctx.fill();
    ctx.fillStyle = night ? 'rgba(160,185,220,0.18)' : 'rgba(255,245,230,0.3)'; ctx.fillRect(px + 4, fy - 40, 6, 460);
  }
  for (let i = 0; i < 9; i++) { ctx.fillStyle = col(wood.map((v) => v * 0.85)); ctx.fillRect(fx + 60 + i * 82, fy + 46, 26, 220); }
}
function drawBlanketMound(ctx, t, o = {}) {
  const br = Math.sin(t * TAU / (o.period || 3.0)) * (o.amp ?? 12);
  const top = (o.top || 1290) - br * 0.5, press = o.press || 0;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-60, H + 20);
  ctx.bezierCurveTo(-40, top + 260, 200, top + 40 + press * 120, 420, top + 10);         // chest
  ctx.bezierCurveTo(500, top - 10, 600, top - 6, 680, top + 20);
  ctx.bezierCurveTo(760, top + 50, 820, top + 90, 1140, top + 200);
  ctx.lineTo(1140, H + 20); ctx.closePath();
  ctx.clip();
  ctx.drawImage(ROOM.blanket, -100, top - 200, 1300, 1300);
  ctx.fillStyle = o.mode === 'morning' ? 'rgba(40,36,40,0.2)' : 'rgba(6,10,22,0.7)'; ctx.fillRect(-100, top - 200, 1300, 1400);
  ctx.fillStyle = linGrad(ctx, 0, top - 20, 0, H, [[0, o.mode === 'morning' ? 'rgba(255,250,240,0.25)' : 'rgba(150,175,215,0.22)'], [0.25, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.75)']]);
  ctx.fillRect(-100, top - 200, 1300, 1400);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  for (const [a, b, c, d] of [[100, top + 300, 380, top + 80], [900, top + 260, 640, top + 60], [500, H, 560, top + 160], [250, H, 300, top + 380]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2 + 30, (b + d) / 2, c, d); ctx.stroke(); }
  if (press > 0) radialEllipse(ctx, 520, top + 140, 300 * press + 60, 140 * press + 30, [[0, `rgba(0,0,0,${0.55 * press})`], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();
}
function coldGrade(ctx, a = 0.35, v = 0.85, inner = 0.25) { tint(ctx, '#1d3557', a, 'soft-light'); vignette(ctx, v, inner); }
function breathPuffs(ctx, t, x, y, start, dur, dir = [0, -1], scale = 1) {
  const d = t - start; if (d < 0 || d > dur) return;
  for (let i = 0; i < 6; i++) {
    const k = d - i * 0.12; if (k < 0) continue;
    radial(ctx, x + dir[0] * k * 120 * scale + n1(k * 2 + i, i) * 20, y + dir[1] * k * 120 * scale, (30 + k * 90) * scale, [[0, `rgba(210,225,245,${0.16 * clamp(1 - d / dur)})`], [1, 'rgba(210,225,245,0)']]);
  }
}

// ======================= SCENE 1 =======================
function shotIntro(ctx, t) {
  const z = lerp(1.0, 1.55, easeInOut(seg(t, 2.6, 9.0)));
  const sh = handheld(t, 0.5, 2);
  ctx.save(); camera(ctx, 540, 960, z, sh);
  // scratch marks left by the nails
  const sp = seg(t, E.s1_scratch + 0.2, E.s1_scratch + 1.5);
  const marks = [0, 1, 2].map((k) => ({ x0: 470 + k * 26, y0: 1250 + k * 8, x1: 395 + k * 24, y1: 1100 + k * 6, w: 2.4, p: sp }));
  drawUnderBed(ctx, t, { marks });
  // pale eyes open in the dark
  const eo = smooth(seg(t, E.s1_eyes_open, E.s1_eyes_open + 0.6));
  const blink = (t > 6.4 && t < 6.55) ? 0.1 : 1;
  if (eo > 0) {
    ctx.save(); ctx.translate(530, 905); ctx.rotate(-0.35);
    ctx.globalAlpha = 0.16 * eo; drawCreatureFace(ctx, { s: 1.7, dark: 0.9, eyes: 0, light: [0.9, 0.1], neck: false }); ctx.globalAlpha = 1;
    ctx.restore();
    for (const [ex, ey] of [[500, 880], [566, 862]]) {
      ctx.save(); ctx.translate(ex, ey); ctx.scale(1, eo * blink);
      radial(ctx, 0, 0, 22, [[0, 'rgba(225,232,236,0.7)'], [0.3, 'rgba(205,215,222,0.25)'], [1, 'rgba(200,210,220,0)']]);
      ctx.fillStyle = 'rgba(214,220,222,0.95)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.6, -0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,20,20,0.9)'; ctx.beginPath(); ctx.arc(1, 0, 1.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  // the hand: reaches out of the dark into the moonlight and drags its nails over the boards
  const hp = seg(t, E.s1_scratch - 0.5, E.s1_scratch + 0.4), drag = smooth(seg(t, E.s1_scratch + 0.2, E.s1_scratch + 1.5));
  if (hp > 0 && t < E.s1_turn + 0.1) {
    const wx = lerp(470, 520, smooth(hp)) - drag * 70, wy = lerp(940, 1040, smooth(hp)) - drag * 120;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(1.45 - drag * 0.15);
    ctx.globalAlpha = smooth(hp);
    drawCreatureHandClose(ctx, { s: 0.75, t, curl: 0.45 + drag * 0.2, light: [0.2, 0.9], seed: 3 });
    ctx.restore();
  }
  ctx.restore();
  // sudden turn toward the camera
  const lp = seg(t, E.s1_turn, E.s1_black);
  if (lp > 0) {
    const s = lerp(2.0, 9.5, easeIn(lp));
    ctx.save(); ctx.translate(540 + n1(t * 50, 1) * 20 * lp, 1200 + 600 * easeIn(lp)); ctx.rotate(-0.5 + lp * 0.2);
    drawCreatureFace(ctx, { s, dark: 0.45, eyes: 1, mouth: lp, light: [0.8, 0.0], neck: false });
    ctx.restore();
    fillBlack(ctx, lp > 0.92 ? 1 : 0);
  }
  coldGrade(ctx, 0.35, 0.9, 0.2);
  fillBlack(ctx, 1 - smooth(seg(t, 1.0, 2.4)));
}

// ======================= SCENE 3 =======================
function shotBedroomWide(ctx, t) {
  const low = easeInOut(seg(t, 27.3, 29.35));
  let z = lerp(1.0, 2.15, low), fx = lerp(540, 600, low), fy = lerp(960, 1585, low);
  fy = Math.min(fy, H - H / 2 / z - 4); fx = clamp(fx, W / 2 / z, W - W / 2 / z);
  let sh = handheld(t, 0.7, 21);
  let jolt = 0; for (const k of E.knocks) jolt += beat(t, k);
  sh = { x: sh.x + jolt * 6, y: sh.y + jolt * 14, r: sh.r + jolt * 0.004 };
  ctx.save(); camera(ctx, fx, fy, z, sh);
  ctx.drawImage(ROOM.wideNight, 0, 0, W, H);
  drawWindowOutside(ctx, RW.win, t, 'night');
  drawWindowMullions(ctx, RW.win, 1);
  const candle = 1 - smooth(seg(t, E.s3_candle_out - 0.25, E.s3_candle_out + 0.08));
  const flick = candle > 0 ? candle * (t > E.s3_candle_out - 0.9 ? 0.75 + 0.25 * Math.abs(n1(t * 20, 4)) : 1) : 0;
  drawBlanketWide(ctx, t, {});
  drawManProfileLying(ctx, 300, RW.mattressTop - 60, 0.62, { open: 0 });
  drawCandle(ctx, 92, RW.stool[1] - 42, t, flick, 1.0);
  drawSmoke(ctx, 92, RW.stool[1] - 82, t - E.s3_candle_out, 1);
  const [wx, wy, ww] = RW.win;
  moonShaft(ctx, [[wx, wy], [wx + ww, wy], [wx + ww - 120, 1720], [wx - 520, 1700]], 0.2);
  dustMotes(ctx, t, 60, { x: 200, y: 500, w: 760, h: 1200 }, 5, 0.45, 2.0);
  for (const k of E.knocks) {
    const d = t - k; if (d < 0 || d > 2.5) continue;
    const r = mulberry32(Math.floor(k * 100));
    ctx.fillStyle = 'rgb(190,200,215)';
    for (let i = 0; i < 40; i++) { const px = 420 + r() * 380, vy = -60 - r() * 160, py = 1690 + vy * d + 140 * d * d; ctx.globalAlpha = 0.6 * clamp(1 - d / 2.5); ctx.beginPath(); ctx.arc(px + (r() - 0.5) * 60 * d, Math.min(py, 1700), 1 + r() * 2, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  tint(ctx, '#ff9a4a', 0.2 * flick, 'soft-light');
  coldGrade(ctx, 0.3, 0.7, 0.3);
}
function shotUnderBedScratch(ctx, t) {
  const z = lerp(1.25, 1.6, easeInOut(seg(t, 31.2, 34.3)));
  ctx.save(); camera(ctx, 540, 1000, z, handheld(t, 0.4, 5));
  const [a, b] = E.s3_scratch;
  const marks = [];
  for (let k = 0; k < 3; k++) marks.push({ x0: 380 + k * 30, y0: 1080 + k * 6, x1: 640 + k * 26, y1: 1030 + k * 4, w: 1.8, p: smooth(seg(t, a + k * 0.15, b - 0.8)) });
  drawUnderBed(ctx, t, { marks });
  // a nail glint moving in the dark
  const gp = seg(t, a, b);
  if (gp > 0 && gp < 1) {
    const gx = lerp(400, 660, (gp * 2.2) % 1), gy = 1040 + Math.sin(gp * 20) * 6;
    radial(ctx, gx, gy, 14, [[0, 'rgba(200,215,235,0.55)'], [1, 'rgba(200,215,235,0)']]);
  }
  ctx.restore();
  coldGrade(ctx, 0.35, 0.95, 0.15);
}
function drawPillowBg(ctx, t, L = 'moon') {
  const night = L === 'moon';
  ctx.fillStyle = night ? '#12161e' : '#8d8a84'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = night ? '#2c3442' : '#cdc8bf';
  ctx.beginPath(); ctx.moveTo(-80, 180); ctx.bezierCurveTo(200, 60, 900, 60, 1160, 200); ctx.lineTo(1180, 1500); ctx.bezierCurveTo(800, 1560, 300, 1560, -100, 1480); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.5; ctx.drawImage(TEX.paper, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.filter = 'blur(6px)';
  for (const [a, b, c, d] of [[60, 300, 260, 560], [1000, 260, 830, 560], [80, 1100, 300, 980], [1020, 1120, 800, 980], [120, 700, 230, 760], [980, 700, 860, 760]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2 + 40, (b + d) / 2, c, d); ctx.stroke(); }
  ctx.filter = 'none';
  // head resting in the pillow: soft contact shadow
  radialEllipse(ctx, 540, 760, 420, 520, [[0, 'rgba(0,0,0,0.55)'], [0.7, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();
  ctx.restore();
}
function drawChinBlanket(ctx, mode = 'moon') {
  ctx.save();
  ctx.fillStyle = '#2b1a20';
  ctx.beginPath(); ctx.moveTo(-100, 1360); ctx.bezierCurveTo(200, 1250, 860, 1260, 1200, 1360); ctx.lineTo(1200, 2300); ctx.lineTo(-100, 2300); ctx.closePath(); ctx.fill();
  ctx.clip(); ctx.globalAlpha = 0.6; ctx.drawImage(ROOM.blanket, -100, 1250, 1300, 1000); ctx.globalAlpha = 1;
  ctx.fillStyle = mode === 'moon' ? 'rgba(8,12,24,0.65)' : 'rgba(40,36,40,0.2)'; ctx.fillRect(-100, 1250, 1300, 1100);
  ctx.fillStyle = linGrad(ctx, 0, 1250, 0, 1500, [[0, 'rgba(150,175,215,0.18)'], [1, 'rgba(0,0,0,0.4)']]); ctx.fillRect(-100, 1250, 1300, 400);
  ctx.restore();
}
function shotFaceClose(ctx, t) {
  const openT = E.s3_eyes_open, br = E.s3_breath;
  let open = smooth(seg(t, openT, openT + 0.12));
  open *= 1 - 0.6 * smooth(seg(t, 37.3, 38.6)) * (1 - smooth(seg(t, br, br + 0.1)));
  const blink = (t > 36.2 && t < 36.34) ? 0.1 : 1;
  const wide = smooth(seg(t, br, br + 0.25)) * 0.9 + smooth(seg(t, openT, openT + 0.3)) * 0.3;
  let look = [n1(t * 0.9, 3) * 0.5, 0.1];
  if (t > 35.2 && t < 36.8) look = [Math.sign(n1(t * 1.6, 7)) * 0.7, 0];
  if (t > br + 0.15) look = [0.85, -0.1];
  const z = lerp(1.0, 1.4, easeInOut(seg(t, 34.6, 42.6)));
  const sh = handheld(t, 0.5, 31);
  drawPillowBg(ctx, t);
  ctx.save(); camera(ctx, 540, 820, z, sh);
  ctx.save(); ctx.translate(540, 860); ctx.scale(2.05, 2.05);
  const tr = t > br ? 1.2 : 0.3;
  ctx.translate(n1(t * 30, 1) * tr, n1(t * 27, 2) * tr);
  drawManFace(ctx, { light: 'moon', open: open * blink, wide, look, pupil: 0.35 + wide * 0.4, raise: wide * 0.8, knit: wide * 0.5, t, mouth: 0.05 + 0.1 * wide, neckScale: 0.55 });
  // hair near the ear stirred by the breath
  const d = t - br;
  if (d > 0 && d < 1.5) { ctx.strokeStyle = 'rgba(12,12,14,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { const yy = -110 + i * 5; ctx.beginPath(); ctx.moveTo(150, yy); ctx.quadraticCurveTo(162, yy - 4 + Math.sin(d * 14 + i) * 5 * (1 - d / 1.5), 170, yy + Math.sin(d * 10 + i) * 4); ctx.stroke(); } }
  ctx.restore();
  drawChinBlanket(ctx);
  breathPuffs(ctx, t, 930, 700, br - 0.05, 2.4, [-0.6, 0.3]);
  ctx.restore();
  radial(ctx, 980, 120, 1100, [[0, 'rgba(120,150,200,0.22)'], [1, 'rgba(0,0,0,0)']], 'screen');
  coldGrade(ctx, 0.3, 0.9, 0.2);
}

// ======================= SCENE 4 =======================
function shotEyeECU(ctx, t) {
  const lt = t - 42.6;
  const z = lerp(6.2, 7.4, easeInOut(seg(t, 42.6, 46.4)));
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(540 + n1(t * 26, 1) * 4, 960 + n1(t * 24, 2) * 4);
  ctx.rotate(0.05);
  ctx.scale(z, z); ctx.translate(-62, 56);
  let look = [0, 0];
  const dart = Math.floor(lt * 2.3);
  look = [n1(dart * 3.1, 4) * 0.95, n1(dart * 2.3, 5) * 0.3];
  drawManFace(ctx, { light: 'moon', open: 1, wide: 0.85, look, pupil: lerp(0.3, 1.0, smooth(seg(t, 42.8, 45.5))), raise: 0.7, knit: 0.6, t, neckScale: 0.55 });
  // wet tear line at the lower lid
  const tp = seg(t, 44.5, 46.4);
  if (tp > 0) { ctx.fillStyle = 'rgba(220,235,250,0.5)'; ctx.beginPath(); ctx.ellipse(84, -46 + tp * 30, 2.4, 3.6, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  coldGrade(ctx, 0.3, 0.95, 0.15);
}
function drawBlanketCloseBg(ctx, t, press = 0) {
  ctx.fillStyle = '#120c0e'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(ROOM.blanket, -300, -200, 1700, 1700); ctx.drawImage(ROOM.blanket, -300, 1500, 1700, 1700); ctx.restore();
  ctx.fillStyle = 'rgba(6,10,22,0.62)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 40; ctx.lineCap = 'round'; ctx.filter = 'blur(14px)';
  for (const [a, b, c, d] of [[-50, 400, 600, 700], [1100, 900, 300, 1300], [-50, 1500, 700, 1700], [800, -50, 950, 600]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 - 80, c, d); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,185,220,0.12)'; ctx.lineWidth = 18;
  for (const [a, b, c, d] of [[-50, 360, 600, 650], [1100, 860, 300, 1250]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 - 80, c, d); ctx.stroke(); }
  ctx.restore();
}
function shotHandTremble(ctx, t) {
  const lt = t - 46.4;
  drawBlanketCloseBg(ctx, t);
  const z = lerp(1.0, 1.15, easeInOut(seg(t, 46.4, 49.5)));
  ctx.save(); camera(ctx, 540, 960, z, handheld(t, 0.4, 41));
  ctx.translate(560, 1080); ctx.rotate(-0.25); ctx.scale(1.9, 1.9);
  // trying to lift the fingers, failing
  const effort = Math.max(0, Math.sin(lt * 2.4)) * smooth(seg(t, 46.8, 47.3));
  const base = [0.35, 0.4, 0.42, 0.45, 0.4].map((c, i) => c - effort * 0.25 + n1(t * 18 + i, i) * 0.05);
  ctx.translate(n1(t * 34, 1) * 1.5, n1(t * 31, 2) * 1.5);
  drawHand(ctx, { light: 'moon', curl: base, tremble: 1, t });
  ctx.restore();
  radial(ctx, 900, 200, 1100, [[0, 'rgba(120,150,200,0.2)'], [1, 'rgba(0,0,0,0)']], 'screen');
  coldGrade(ctx, 0.3, 0.9, 0.2);
}
function shotChestPress(ctx, t) {
  const p = smooth(seg(t, E.s4_blanket, 52.4));
  drawBlanketCloseBg(ctx, t);
  ctx.save(); camera(ctx, 540, 960, 1 + p * 0.08, handheld(t, 0.4, 51));
  // the invisible weight: a growing depression with radiating folds
  const cx = 560, cy = 1120;
  radialEllipse(ctx, cx, cy, 120 + p * 330, 80 + p * 220, [[0, `rgba(0,0,0,${0.75 * p})`], [0.6, `rgba(0,0,0,${0.35 * p})`], [1, 'rgba(0,0,0,0)']]);
  ctx.save(); ctx.lineCap = 'round'; ctx.filter = 'blur(4px)';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + 0.2, r0 = 60 + p * 60, r1 = 160 + p * 380;
    ctx.strokeStyle = `rgba(0,0,0,${0.55 * p})`; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7); ctx.quadraticCurveTo(cx + Math.cos(a + 0.15) * r1 * 0.6, cy + Math.sin(a + 0.15) * r1 * 0.45, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7); ctx.stroke();
    ctx.strokeStyle = `rgba(160,185,220,${0.14 * p})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0 + 12, cy + Math.sin(a) * r0 * 0.7 - 10); ctx.quadraticCurveTo(cx + Math.cos(a + 0.15) * r1 * 0.6 + 12, cy + Math.sin(a + 0.15) * r1 * 0.45 - 10, cx + Math.cos(a) * r1 + 12, cy + Math.sin(a) * r1 * 0.7 - 10); ctx.stroke();
  }
  ctx.restore();
  // his chin/mouth at the top edge: laboured breathing, vapour in the cold
  ctx.save(); ctx.translate(540, -40); ctx.scale(1.6, 1.6);
  drawManFace(ctx, { light: 'moon', open: 1, wide: 0.6, mouth: 0.3 + 0.15 * Math.sin(t * 5), t, neck: false });
  ctx.restore();
  ctx.fillStyle = '#140d10'; ctx.beginPath(); ctx.moveTo(-50, 330); ctx.bezierCurveTo(300, 200, 800, 210, 1130, 330); ctx.lineTo(1130, 420); ctx.lineTo(-50, 420); ctx.fill();
  for (let k = 0; k < 4; k++) breathPuffs(ctx, t, 540, 110, 49.6 + k * 0.8, 1.2, [0, 1], 0.8);
  ctx.restore();
  coldGrade(ctx, 0.35, 0.92, 0.18);
}
function shotPovRise(ctx, t) {
  const [a, b] = E.s4_rise;
  const k = easeInOut(seg(t, a, b));
  const sh = handheld(t, 0.45, 61);
  drawPovBase(ctx, t, 'night', 1.05, sh);
  ctx.save(); camera(ctx, 540, 960, 1.05, sh);
  // moonlight from the window on the left across the far wall
  moonShaft(ctx, [[-200, 200], [200, 150], [900, 1180], [200, 1180]], 0.22);
  // the creature rising behind the footboard (jerky, bones unfolding)
  const jerk = k + (k > 0 && k < 1 ? n1(t * 7, 3) * 0.02 : 0);
  const J = crPose('rise', clamp(jerk), t);
  // long shadow on the wall
  ctx.save(); ctx.translate(640, 1130); ctx.transform(1, 0, 0.35, 1, 0, 0); ctx.scale(1.25, 1.3); ctx.globalAlpha = 0.55;
  drawCreatureBody(ctx, J, { t, rimA: 0, fill: [2, 3, 5], detail: false }); ctx.restore();
  ctx.save(); ctx.translate(520, 1330); ctx.scale(1.12, 1.12);
  drawCreatureBody(ctx, J, { t, rimDir: [-1, -0.3], rimA: 0.6, skin: true, dark: 0.45, eyes: smooth(seg(t, 58.6, 59.6)) * 0.9 });
  ctx.restore();
  drawFootboardPov(ctx);
  drawBlanketMound(ctx, t, { amp: 16, period: 1.6 });
  ctx.restore();
  coldGrade(ctx, 0.35, 0.9, 0.22);
}

// ======================= SCENE 5 =======================
function shotFeet(ctx, t) {
  const lt = t - 60;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); camera(ctx, 540, 1000, lerp(1.0, 1.12, seg(t, 60, 64.4)), handheld(t, 0.4, 71));
  drawPlankFloor(ctx, 700, H + 60, 540, 300, { boards: 6, spread: 2.2, base: [40, 33, 27] });
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(24px)'; ctx.fillStyle = 'rgba(120,150,195,0.4)';
  poly(ctx, [[-100, 1100], [1180, 900], [1180, 1500], [-100, 1700]]); ctx.fill(); ctx.restore();
  ctx.fillStyle = linGrad(ctx, 0, 600, 0, 1100, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 600, W, 500);
  // two long feet; the right one lifts and steps forward slowly, toes curling
  const step = smooth(seg(t, 61.0, 63.4));
  const lift = Math.sin(step * Math.PI) * 140;
  ctx.save(); ctx.translate(130, 1380); ctx.scale(1.9, 1.9); drawCreatureFoot(ctx, { s: 1, t, curl: 0.15, light: [0.75, 0.1] }); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(330 + step * 200, 1460, 300, 34, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(430 + step * 230, 1250 - lift); ctx.rotate(-0.05 - Math.sin(step * Math.PI) * 0.25); ctx.scale(1.9, 1.9);
  drawCreatureFoot(ctx, { s: 1, t, curl: 0.15 + Math.sin(step * Math.PI) * 0.5, light: [0.75, 0.1] }); ctx.restore();
  ctx.restore();
  coldGrade(ctx, 0.35, 0.9, 0.2);
}
function shotHangingHands(ctx, t) {
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, W, H);
  ctx.save(); camera(ctx, 540, 960, lerp(1.0, 1.1, seg(t, 64.4, 66.8)), handheld(t, 0.4, 81));
  ctx.drawImage(ROOM.povNight, 0, -500, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  // mid-body: bony knees and the hands hanging lower than them
  const J = crPose('stand', 0, t);
  ctx.save(); ctx.translate(560, 1520); ctx.scale(2.4, 2.4);
  drawCreatureBody(ctx, J, { t, rimDir: [-1, -0.2], rimA: 0.7, skin: true, dark: 0.2, curlL: 0.25, curlR: 0.3 });
  ctx.restore();
  ctx.restore();
  coldGrade(ctx, 0.35, 0.9, 0.2);
}
function shotCreatureFace(ctx, t) {
  const lt = t - 66.8;
  ctx.fillStyle = '#020306'; ctx.fillRect(0, 0, W, H);
  radial(ctx, 860, 300, 900, [[0, 'rgba(60,80,115,0.35)'], [1, 'rgba(0,0,0,0)']]);
  // unnatural tilts: holds, then sudden small jerks
  const steps = [0, 0.9, 1.7, 2.4, 3.1];
  let tilt = -0.55;
  for (let i = 0; i < steps.length; i++) if (lt > steps[i]) tilt += (i % 2 ? -0.06 : 0.1) * smooth(seg(lt, steps[i], steps[i] + 0.08));
  const z = lerp(1, 1.12, seg(t, 66.8, 70.3));
  ctx.save(); ctx.translate(560 + n1(t * 0.8, 3) * 10, 1500); ctx.scale(z, z); ctx.rotate(tilt);
  drawCreatureFace(ctx, { s: 7.0, dark: 0.7, eyes: 1, look: [n1(t, 5), 0], light: [0.95, 0.05], mouth: 0.05 });
  ctx.restore();
  coldGrade(ctx, 0.3, 0.95, 0.15);
}
function shotPovClimb(ctx, t) {
  const p = seg(t, 70.3, 72.6), sh = handheld(t, 0.6, 91);
  drawPovBase(ctx, t, 'night', 1.05, sh);
  ctx.save(); camera(ctx, 540, 960, 1.05, sh);
  moonShaft(ctx, [[-200, 200], [200, 150], [900, 1180], [200, 1180]], 0.22);
  const J = crPose('crouch', 0, t);
  const s = lerp(1.25, 2.6, easeIn(p)), y = lerp(1080, 1500, easeIn(p));
  ctx.save(); ctx.translate(540, y); ctx.scale(s, s);
  drawCreatureBody(ctx, J, { t, rimDir: [-1, -0.3], rimA: 0.6, skin: true, dark: 0.35, eyes: 0.9, curlL: 0.6, curlR: 0.6 });
  ctx.restore();
  if (p < 0.45) drawFootboardPov(ctx);
  drawBlanketMound(ctx, t, { amp: 18, period: 1.2, press: smooth(seg(t, 72.0, 72.6)) });
  ctx.restore();
  coldGrade(ctx, 0.35, 0.9, 0.22);
}
function shotPovLoom(ctx, t) {
  const p = seg(t, 72.6, 80.0), sh = handheld(t, 0.5, 95);
  drawPovBase(ctx, t, 'night', 1.2, sh, [540, 700]);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); camera(ctx, 540, 960, 1, sh);
  // its body crouched on the chest: dark mass with rim light, arms planted on both sides
  const lower = easeInOut(p);
  ctx.fillStyle = '#07080b';
  ctx.beginPath(); ctx.moveTo(-100, H); ctx.bezierCurveTo(100, 1100, 300, 900 - lower * 80, 540, 880 - lower * 60); ctx.bezierCurveTo(780, 900 - lower * 80, 980, 1100, 1180, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,175,210,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(540 + sgn * 330, 760); ctx.rotate(sgn > 0 ? 1.9 : 1.25); ctx.scale(sgn, 1);
    drawCreatureHandClose(ctx, { s: 1.0, t, curl: 0.5, seed: 30 + sgn });
    ctx.restore();
  }
  // its face lowering toward his
  const s = lerp(4.0, 5.6, lower);
  const twitch = Math.abs(n1(t * 0.9, 8)) > 0.75 ? n1(t * 14, 9) * 0.06 : 0;
  ctx.save(); ctx.translate(600, 1250 + lower * 220); ctx.rotate(-0.55 + twitch + n1(t * 0.5, 4) * 0.05);
  drawCreatureFace(ctx, { s, dark: 0.55, eyes: 1, light: [0.9, 0.2], look: [0, 0.5], mouth: 0.1 + 0.05 * Math.sin(t * 2) });
  ctx.restore();
  breathPuffs(ctx, t, 640, 1130 + lower * 200, 75.5, 1.8, [0, 1], 1.2);
  breathPuffs(ctx, t, 640, 1130 + lower * 200, 78.2, 1.8, [0, 1], 1.2);
  ctx.restore();
  coldGrade(ctx, 0.3, 0.95, 0.15);
}

// ======================= SCENE 6 =======================
function drawNeckFrame(ctx, t, o = {}) {
  // his throat in close-up, chin tilted up (face-local transform shared by the nail positions)
  drawPillowBg(ctx, t);
  ctx.save();
  ctx.translate(540 + n1(t * 28, 1) * (o.tr || 0.8), 120 + n1(t * 25, 2) * (o.tr || 0.8));
  ctx.scale(3.6, 3.6);
  drawManFace(ctx, { light: 'moon', open: 1, wide: 0.9, t, neckScale: 1.0, scratches: o.scratch || 0, mouth: o.mouth || 0.1, sweat: 0.6 });
  ctx.restore();
}
function shotNeckReach(ctx, t) {
  const p = seg(t, 80.0, 86.4);
  ctx.save(); camera(ctx, 540, 960, lerp(1.0, 1.08, p), handheld(t, 0.3, 101));
  drawNeckFrame(ctx, t, { tr: 0.6 });
  // the hand comes in slow motion from the upper right
  const k = easeOut(seg(t, 80.2, 84.6));
  const wx = lerp(1450, 860, k), wy = lerp(-150, 560, k);
  const touch = smooth(seg(t, 84.4, 85.4));
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(2.25);
  const tips = drawCreatureHandClose(ctx, { s: 1.4, t: 80 + (t - 80) * 0.35, curl: lerp(0.05, 0.3, k), seed: 41 });
  // fingertips denting the skin once they touch
  if (touch > 0) for (const [x, y] of tips.slice(0, 4)) radialEllipse(ctx, x + 40, y, 22, 12, [[0, `rgba(0,0,0,${0.5 * touch})`], [1, 'rgba(0,0,0,0)']]);
  ctx.restore();
  ctx.restore();
  coldGrade(ctx, 0.35, 0.92, 0.2);
}
function shotTerrifiedEyes(ctx, t) {
  drawPillowBg(ctx, t);
  ctx.save();
  ctx.translate(540 + n1(t * 30, 1) * 3, 1030 + n1(t * 27, 2) * 3);
  ctx.scale(4.1, 4.1); ctx.translate(0, 56);
  const look = t < 88.2 ? [0.2, -0.2] : [0.9, -0.05];
  drawManFace(ctx, { light: 'moon', open: 1, wide: 1, look, pupil: 0.95, raise: 1, knit: 0.8, t, sweat: 1, neckScale: 0.55 });
  ctx.restore();
  // its shadow sliding over him from the right
  const sp = smooth(seg(t, 87.4, 89.6));
  ctx.fillStyle = linGrad(ctx, W, 0, W - 900 * sp, 0, [[0, `rgba(0,0,0,${0.85 * sp})`], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, H);
  coldGrade(ctx, 0.3, 0.95, 0.18);
}
function shotWhisper(ctx, t) {
  const p = seg(t, 89.6, 94.0), sh = handheld(t, 0.3, 111);
  drawPillowBg(ctx, t);
  ctx.save(); camera(ctx, 540, 960, lerp(1.05, 1.2, easeInOut(p)), sh);
  ctx.save(); ctx.translate(430 + n1(t * 30, 1) * 1.5, 900); ctx.scale(1.9, 1.9);
  drawManFace(ctx, { light: 'moon', open: 1, wide: 1, look: [0.95, -0.1], pupil: 0.95, raise: 0.9, knit: 0.9, t, sweat: 0.8, neckScale: 0.55 });
  ctx.restore();
  drawChinBlanket(ctx);
  // the creature's head beside his ear, mouth almost touching it
  const inK = easeOut(seg(t, 89.6, 90.6));
  const w0 = 90.96, w1 = 93.04;
  const syl = (t > w0 && t < w1) ? 0.35 + 0.35 * Math.abs(Math.sin((t - w0) * 9)) : 0.05;
  // its dark neck/shoulder bending in from the right so the head does not float
  ctx.save(); ctx.filter = 'blur(10px)'; ctx.fillStyle = 'rgba(4,5,8,0.92)';
  ctx.beginPath(); ctx.moveTo(lerp(1300, 900, inK), 980); ctx.bezierCurveTo(lerp(1350, 1000, inK), 1100, 1100, 1300, 1200, 1700); ctx.lineTo(1200, 900); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(lerp(1250, 905, inK), 1010); ctx.rotate(-0.42 + n1(t * 0.7, 3) * 0.03);
  drawCreatureFace(ctx, { s: 3.6, dark: 0.45, eyes: 0.95, light: [0.15, 0.2], mouth: syl, neck: false });
  ctx.restore();
  // whisper vapour on each syllable
  for (const st of [91.0, 91.6, 92.2, 92.7]) breathPuffs(ctx, t, 760, 845, st, 1.0, [-0.4, 0.3], 0.5);
  ctx.restore();
  coldGrade(ctx, 0.3, 0.97, 0.15);
}
function shotNeckTrace(ctx, t) {
  const [a, b] = E.s6_trace;
  const p = smooth(seg(t, a + 0.3, b));
  ctx.save(); camera(ctx, 540, 960, lerp(1.08, 1.25, seg(t, 94, 100.6)), handheld(t, 0.25, 121));
  drawNeckFrame(ctx, t, { tr: 1.4, mouth: 0.25 });
  // a single nail tracing across the throat, leaving a thin red line
  const nx = lerp(400, 690, p), ny = lerp(930, 880, p);
  if (p > 0) {
    ctx.strokeStyle = `rgba(150,15,20,${0.8 * clamp(p * 3)})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(400, 930); ctx.lineTo(nx, ny); ctx.stroke();
  }
  ctx.save(); ctx.translate(nx + 250, ny - 340); ctx.rotate(2.2);
  drawCreatureHandClose(ctx, { s: 1.5, t: 94 + (t - 94) * 0.3, curl: 0.55, seed: 52 });
  ctx.restore();
  ctx.restore();
  // breath stops: vision closes in and goes dark
  const dk = smooth(seg(t, 98.4, 100.3));
  coldGrade(ctx, 0.35, 0.92 + dk * 0.08, 0.2 - dk * 0.2);
  if (dk > 0) { const g = ctx.createRadialGradient(540, 940, lerp(900, 0, dk), 540, 940, lerp(1400, 300, dk)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  fillBlack(ctx, smooth(seg(t, 100.0, 100.4)));
}

// ======================= SCENE 7 =======================
function drawMorningWall(ctx) {
  drawPlasterWall(ctx, 0, 0, W, H, [158, 162, 164], 17);
  ctx.fillStyle = linGrad(ctx, 0, 0, W, 0, [[0, 'rgba(40,46,56,0.45)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(255,250,240,0.18)']]); ctx.fillRect(0, 0, W, H);
}
function shotWakeUp(ctx, t) {
  const up = easeOut(seg(t, 100.6, 101.3));
  const pant = Math.sin((t - 100.6) * 7.5) * clamp(1 - (t - 101.5) / 3) * 10;
  drawMorningWall(ctx);
  // headboard behind him
  ctx.fillStyle = '#5e4632'; for (let i = 0; i < 6; i++) ctx.fillRect(80 + i * 160, 900, 90, 1100);
  ctx.fillStyle = '#4a3626'; ctx.fillRect(40, 860, 1000, 70);
  ctx.save(); ctx.translate(540, lerp(1700, 860, up) + pant * 0.6); ctx.scale(1.55, 1.55);
  drawManFace(ctx, { light: 'morning', open: 1, wide: 0.7, mouth: 0.45 + 0.2 * Math.sin((t - 100.6) * 7.5), pupil: 0.6, raise: 0.6, knit: 0.4, t, sweat: 1, look: [n1(t * 2, 3) * 0.6, 0] });
  ctx.restore();
  // blanket fallen to his waist
  ctx.fillStyle = '#5a2a22'; ctx.beginPath(); ctx.moveTo(-50, 1600); ctx.bezierCurveTo(300, 1520, 800, 1540, 1130, 1600); ctx.lineTo(1130, H); ctx.lineTo(-50, H); ctx.fill();
  ctx.save(); ctx.clip(); ctx.globalAlpha = 0.85; ctx.drawImage(ROOM.blanket, -100, 1500, 1300, 900); ctx.restore();
  radial(ctx, 1100, 300, 1300, [[0, 'rgba(255,250,240,0.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
  tint(ctx, '#9db4c8', 0.3, 'soft-light'); vignette(ctx, 0.55, 0.35);
  // the sudden brightness
  const fl = 1 - seg(t, 100.6, 100.95);
  if (fl > 0) { ctx.fillStyle = `rgba(245,248,252,${fl})`; ctx.fillRect(0, 0, W, H); }
}
function shotEmptyRoom(ctx, t) {
  const p = easeInOut(seg(t, 103.2, 105.4));
  drawPovBase(ctx, t, 'morning', 1.35, handheld(t, 0.5, 131), [lerp(760, 330, p), 820]);
  tint(ctx, '#9db4c8', 0.28, 'soft-light'); vignette(ctx, 0.6, 0.3);
}
function shotTouchThroat(ctx, t) {
  const p = seg(t, 105.4, 108.2), lt = t - 105.4;
  drawMorningWall(ctx);
  ctx.save(); ctx.translate(540, 700); ctx.scale(2.2, 2.2);
  drawManFace(ctx, { light: 'morning', open: 1, wide: 0.3, look: [0, 0.8], pupil: 0.5, raise: 0.3, knit: 0.5, t, sweat: 0.7, mouth: 0.15 });
  // both hands come up to the throat, fingertips feeling the skin
  const L = LIGHTS.morning, h = easeOut(seg(t, 105.5, 106.3));
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1); ctx.translate(0, (1 - h) * 380);
    const fx = n1(t * 1.5, sd + 3) * 3;
    // sleeve + forearm rising from below
    ctx.fillStyle = col(L.shirt); poly(ctx, [[150, 560], [250, 560], [215, 360], [130, 380]]); ctx.fill();
    ctx.fillStyle = linGrad(ctx, 130, 0, 250, 0, [[0, col(L.sh, 0.4)], [1, col(L.sh, 0)]]); ctx.fill();
    // palm (side view against the neck)
    ctx.fillStyle = col(L.base);
    ctx.beginPath(); ctx.moveTo(132, 384); ctx.bezierCurveTo(120, 330, 104, 300, 92, 270); ctx.lineTo(150, 250); ctx.bezierCurveTo(176, 290, 200, 330, 214, 364); ctx.closePath(); ctx.fill();
    ctx.fillStyle = linGrad(ctx, 92, 0, 214, 0, [[0, col(L.sh, 0.05)], [1, col(L.sh, 0.45)]]); ctx.fill();
    // four fingers reaching onto the throat
    for (let f = 0; f < 4; f++) {
      const bx = 96 + f * 15 + fx, by = 268 - f * 6;
      const pts = bezPts([bx, by], [bx - 18, by - 30 - f * 4], [bx - 40, by - 46 - f * 6], [bx - 52 + f * 4, by - 52 - f * 10], 10);
      ctx.fillStyle = col(mix(L.base, L.sh, 0.06 + f * 0.07)); inkStroke(ctx, pts, 22 - f, 17 - f, false);
      ctx.strokeStyle = col(L.sh, 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] + 9) : ctx.moveTo(p[0], p[1] + 9)); ctx.stroke();
      const e = pts[pts.length - 1]; ctx.fillStyle = col(L.hi, 0.45); ctx.beginPath(); ctx.ellipse(e[0] + 4, e[1], 6, 8, 0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  radial(ctx, 1100, 300, 1300, [[0, 'rgba(255,250,240,0.3)'], [1, 'rgba(0,0,0,0)']], 'screen');
  tint(ctx, '#9db4c8', 0.3, 'soft-light'); vignette(ctx, 0.6, 0.3);
}
const MIRROR = { x: 330, y: 360, w: 420, h: 560 };
function drawMirrorFrame(ctx, m, inner) {
  const { x, y, w, h } = m;
  ctx.fillStyle = '#3d2a1c'; ctx.fillRect(x - 40, y - 40, w + 80, h + 80);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.8; ctx.drawImage(TEX.wood, x - 40, y - 40, w + 80, h + 80); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6; ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  ctx.strokeStyle = 'rgba(255,240,220,0.25)'; ctx.lineWidth = 3; ctx.strokeRect(x - 38, y - 38, w + 76, h + 76);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  inner();
  // aged silvering: spots and dark edges
  const r = mulberry32(5150);
  for (let i = 0; i < 26; i++) radial(ctx, x + r() * w, y + (r() < 0.5 ? r() * 0.15 : 1 - r() * 0.15) * h, 10 + r() * 40, [[0, 'rgba(30,26,20,0.55)'], [1, 'rgba(30,26,20,0)']]);
  ctx.fillStyle = 'rgba(170,190,180,0.08)'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
function drawReflectionRoom(ctx, x, y, w, h, dark = 0) {
  // what the mirror shows behind him: the dim room, the corner by the door
  ctx.fillStyle = '#5c5f62'; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.drawImage(TEX.plaster, x, y, w, h); ctx.restore();
  ctx.fillStyle = linGrad(ctx, x, 0, x + w, 0, [[0, 'rgba(255,250,240,0.25)'], [0.55, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.7)']]); ctx.fillRect(x, y, w, h);
  // doorway / dark corner on the right
  ctx.fillStyle = `rgba(8,8,10,${0.75 + dark * 0.2})`; ctx.fillRect(x + w * 0.66, y + h * 0.05, w * 0.3, h * 0.95);
  ctx.fillStyle = '#4a3626'; ctx.fillRect(x + w * 0.64, y + h * 0.04, w * 0.03, h);
}
function shotWalkToMirror(ctx, t) {
  const p = easeInOut(seg(t, 108.2, 112.0)), lt = t - 108.2;
  const bob = Math.abs(Math.sin(lt * 3.4)) * 14, sway = Math.sin(lt * 1.7);
  drawMorningWall(ctx);
  ctx.save(); camera(ctx, 540, lerp(960, 760, p), lerp(1.0, 1.55, p), handheld(t, 0.8, 141));
  drawMirrorFrame(ctx, MIRROR, () => {
    drawReflectionRoom(ctx, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h);
    ctx.save(); ctx.translate(MIRROR.x + MIRROR.w * 0.48 + sway * 4, MIRROR.y + MIRROR.h * 0.5 + lerp(80, 20, p)); ctx.scale(lerp(0.55, 0.9, p), lerp(0.55, 0.9, p));
    drawManFace(ctx, { light: 'morning', open: 1, wide: 0.3, look: [0, 0.3], t, sweat: 0.5 });
    ctx.restore();
  });
  // a nazar hanging on the frame
  drawNazar(ctx, MIRROR.x + MIRROR.w + 70, MIRROR.y + 60, 1.4);
  ctx.restore();
  // his back in the foreground, walking toward the mirror
  ctx.save(); ctx.translate(lerp(720, 660, p) + sway * 10, lerp(1240, 1330, p) + bob); ctx.scale(lerp(1.3, 1.7, p), lerp(1.3, 1.7, p));
  drawManBack(ctx, { light: 'morning', sway });
  ctx.restore();
  radial(ctx, 0, 300, 1300, [[0, 'rgba(255,250,240,0.3)'], [1, 'rgba(0,0,0,0)']], 'screen');
  tint(ctx, '#9db4c8', 0.3, 'soft-light'); vignette(ctx, 0.6, 0.3);
}

// ======================= SCENE 8 =======================
function shotMirror(ctx, t) {
  const p = seg(t, 112.0, 118.55);
  const sc = smooth(seg(t, E.s8_scratches - 0.4, E.s8_scratches + 0.8));
  const sil = smooth(seg(t, E.s8_silhouette, E.s8_silhouette + 1.6));
  const z = lerp(1.0, 1.35, easeInOut(p));
  ctx.fillStyle = '#2a2420'; ctx.fillRect(0, 0, W, H);
  ctx.save(); camera(ctx, 540, 960, z, handheld(t, 0.35, 151));
  const M = { x: 60, y: 160, w: 960, h: 1600 };
  drawMirrorFrame(ctx, M, () => {
    drawReflectionRoom(ctx, M.x, M.y, M.w, M.h, sil);
    // the silhouette standing in the dark corner behind him
    if (sil > 0) {
      ctx.save(); ctx.globalAlpha = sil; ctx.translate(M.x + M.w * 0.83, M.y + M.h * 1.02); ctx.scale(1.25, 1.25);
      drawCreatureBody(ctx, crPose('stand', 0, t), { t, rimDir: [-1, -0.2], rimA: 0.35, eyes: sil * 0.9, fill: [6, 6, 8] });
      ctx.restore();
    }
    // his reflection: chin raised to look at the throat
    const lift = smooth(seg(t, 113.0, 114.0));
    const freeze = sil > 0.5 ? 1 : 0;
    ctx.save(); ctx.translate(M.x + M.w * 0.42 + n1(t * 24, 1) * 2 * freeze, M.y + M.h * 0.42 - lift * 30); ctx.scale(2.05, 2.05); ctx.rotate(-lift * 0.08);
    drawManFace(ctx, { light: 'morning', open: 1, wide: 0.3 + 0.6 * sil, look: [lerp(0, 0.8, sil), lerp(0.7, 0.1, lift)], pupil: 0.5 + sil * 0.4, raise: sil * 0.8, t, sweat: 0.6, scratches: sc, mouth: 0.05 + sil * 0.1 });
    ctx.restore();
  });
  ctx.restore();
  radial(ctx, 0, 400, 1300, [[0, 'rgba(255,250,240,0.25)'], [1, 'rgba(0,0,0,0)']], 'screen');
  tint(ctx, '#9db4c8', 0.3, 'soft-light'); vignette(ctx, 0.7 + sil * 0.2, 0.3);
}
function shotTitle(ctx, t) {
  const p = seg(t, E.title[0], E.title[0] + 0.35);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const fl = 0.85 + 0.15 * (Math.abs(n1(t * 30, 2)) > 0.7 ? 0.2 : 1);
  ctx.save(); ctx.globalAlpha = p * fl; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(200,0,0,0.6)'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#c4161c';
  ctx.font = '900 150px Inter, sans-serif'; ctx.fillText('ENKEBİT:', 540, 860);
  ctx.font = '900 112px Inter, sans-serif'; ctx.fillText('BOĞAZ DEŞEN', 540, 1010);
  ctx.shadowBlur = 0;
  // scratched texture through the letters
  ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 2;
  const r = mulberry32(13);
  for (let i = 0; i < 60; i++) { const x = 120 + r() * 840, y = 780 + r() * 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + r() * 60, y + 10 + r() * 30); ctx.stroke(); }
  ctx.restore();
}
function shotBlack(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }

const SHOTS = [
  { a: 0.0, b: 9.45, f: shotIntro },
  { a: 9.45, b: 10.2, f: shotBlack },
  { a: 10.2, b: 25.4, f: shotVillage, fin: 1.2 },
  { a: 25.4, b: 31.2, f: shotBedroomWide, x: 0.7 },
  { a: 31.2, b: 34.3, f: shotUnderBedScratch },
  { a: 34.3, b: 42.6, f: shotFaceClose },
  { a: 42.6, b: 46.4, f: shotEyeECU },
  { a: 46.4, b: 49.5, f: shotHandTremble },
  { a: 49.5, b: 52.7, f: shotChestPress },
  { a: 52.7, b: 60.0, f: shotPovRise },
  { a: 60.0, b: 64.4, f: shotFeet },
  { a: 64.4, b: 66.8, f: shotHangingHands },
  { a: 66.8, b: 70.3, f: shotCreatureFace },
  { a: 70.3, b: 72.6, f: shotPovClimb },
  { a: 72.6, b: 80.0, f: shotPovLoom },
  { a: 80.0, b: 86.4, f: shotNeckReach },
  { a: 86.4, b: 89.6, f: shotTerrifiedEyes },
  { a: 89.6, b: 94.0, f: shotWhisper },
  { a: 94.0, b: 100.6, f: shotNeckTrace },
  { a: 100.6, b: 103.2, f: shotWakeUp },
  { a: 103.2, b: 105.4, f: shotEmptyRoom, x: 0.25 },
  { a: 105.4, b: 108.2, f: shotTouchThroat, x: 0.25 },
  { a: 108.2, b: 112.0, f: shotWalkToMirror, x: 0.3 },
  { a: 112.0, b: 118.55, f: shotMirror, x: 0.4 },
  { a: 118.55, b: 118.9, f: shotBlack },
  { a: 118.9, b: 120.01, f: shotTitle },
];
