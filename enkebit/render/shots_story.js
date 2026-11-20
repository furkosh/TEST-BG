// 30 s Instagram Story: folklore facts about Enkebit + teaser for the 12:00 Reels. Same art, voice and subtitles.
'use strict';
const SE = window.TL.events;
const SB = makeCanvas(W, H), SX = SB.getContext('2d');
const sh2 = (t, k) => hash2(Math.floor(t * 24), k, 313);
const GOLD = ['#f6d77a', '#d4a52a', '#8a6414'];

// --- shared: golden fez (drawn in head-local space: crown of the skull at y=-168) ---
function drawFez(ctx, s, glow, t) {
  ctx.save(); ctx.translate(0, -160 * s); ctx.rotate(0.08);
  if (glow > 0) radial(ctx, 0, -30 * s, 150 * s, [[0, `rgba(255,205,90,${0.35 * glow})`], [1, 'rgba(255,180,60,0)']], 'lighter');
  ctx.fillStyle = linGrad(ctx, -40 * s, 0, 40 * s, 0, [[0, GOLD[2]], [0.35, GOLD[0]], [0.6, GOLD[1]], [1, GOLD[2]]]);
  ctx.beginPath(); ctx.moveTo(-40 * s, 0); ctx.lineTo(40 * s, 0); ctx.lineTo(30 * s, -58 * s); ctx.lineTo(-30 * s, -58 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,190,0.55)'; ctx.fillRect(-30 * s, -58 * s, 60 * s, 4 * s);
  ctx.strokeStyle = 'rgba(80,55,10,0.7)'; ctx.lineWidth = 2 * s;
  for (let k = 0; k < 5; k++) { const y = -8 * s - k * 11 * s; ctx.beginPath(); ctx.moveTo(-38 * s + k * 2 * s, y); ctx.lineTo(38 * s - k * 2 * s, y); ctx.stroke(); }
  // tassel
  ctx.strokeStyle = '#120c06'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(0, -58 * s); ctx.quadraticCurveTo(26 * s, -60 * s, 34 * s + n1(t * 2, 4) * 3 * s, -20 * s); ctx.stroke();
  ctx.fillStyle = '#120c06'; ctx.beginPath(); ctx.ellipse(35 * s, -14 * s, 5 * s, 10 * s, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// --- 1: the village, slow tilt down from the moon ---
function storyVillage(ctx, t) {
  const a = easeInOut(seg(t, 0, 4.7));
  const fx = lerp(620, 640, a), fy = lerp(700, 1900, a), z = lerp(1.05, 1.2, a), sh = handheld(t, 0.6, 301);
  const L = VIL.layers;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const layer = (img, pf, ox = 0) => { ctx.save(); camera(ctx, fx + ox, 950 + (fy - 950) * pf, z, sh); ctx.drawImage(img, 0, 0, VIL.WW, VIL.WH); ctx.restore(); };
  layer(L.sky, 0.35); layer(L.clouds, 0.4, -t * 6); layer(L.far, 0.55);
  drawFog(ctx, t, 0.10, 14, 3.5, 1, 0, H);
  layer(L.mid, 0.75); layer(L.village, 1.0);
  ctx.save(); camera(ctx, fx, fy, z, sh); drawHomeHouse(ctx, t, 0); ctx.restore();
  drawFog(ctx, t, 0.16, 30, 4.5, 3, 0, H);
  drawSnow(ctx, t, 1, 1);
  tint(ctx, '#1d3557', 0.35, 'soft-light'); vignette(ctx, 0.75, 0.3);
}

// --- 2: "Enkebit." smash to a glitching red title with eyes behind it ---
function storyTitle(ctx, t) {
  const p = t - SE.title[0];
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const x of [470, 610]) radial(ctx, x, 780, 30, [[0, `rgba(230,236,240,${0.8 * clamp(p * 3)})`], [0.3, 'rgba(200,212,220,0.3)'], [1, 'rgba(200,210,220,0)']]);
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.clearRect(0, 0, W, H);
  SX.textAlign = 'center'; SX.textBaseline = 'middle'; SX.font = '900 190px Inter, sans-serif';
  SX.shadowColor = 'rgba(220,0,0,0.7)'; SX.shadowBlur = 50; SX.fillStyle = '#d0141c';
  const sc = 1.25 - 0.25 * easeOut(clamp(p / 0.3));
  SX.save(); SX.translate(540, 980); SX.scale(sc, sc); SX.fillText('ENKEBİT', 0, 0); SX.restore();
  const off = 4 + 20 * (1 - clamp(p / 0.5)) * sh2(t, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(SB, off, 0); ctx.drawImage(SB, -off, 2); ctx.restore();
  ctx.drawImage(SB, 0, 0);
  for (let i = 0; i < 5; i++) { const y = 860 + sh2(t, 10 + i) * 240, h = 10 + sh2(t, 20 + i) * 40; ctx.drawImage(SB, 0, y, W, h, (sh2(t, 30 + i) - 0.5) * 120 * (1 - clamp(p)), y, W, h); }
  if (p < 0.05) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, W, H); }
}

// --- 3/4: reused film shots (time-shifted) ---
const storyLoom = (ctx, t) => shotPovLoom(ctx, 73.6 + (t - 5.9));
const storyNeck = (ctx, t) => shotNeckReach(ctx, 82.4 + (t - 7.9));

// --- 5: a folklore plate: the silhouette with its golden fez and the hole in its right hand ---
function storyPlate(ctx, t) {
  const p = seg(t, SE.plate[0], SE.plate[1]);
  ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(TEX.plaster, 0, 0, W, H); ctx.restore();
  radial(ctx, 540, 900, 900, [[0, 'rgba(70,85,110,0.35)'], [1, 'rgba(0,0,0,0)']]);
  ctx.save(); camera(ctx, 540, 960, lerp(1.0, 1.08, p), handheld(t, 0.3, 311));
  const J = crPose('stand', 0, t);
  const bx = 560, by = 1720, bs = 1.45;
  ctx.save(); ctx.translate(bx, by); ctx.scale(bs, bs);
  drawCreatureBody(ctx, J, { t, rimDir: [1, -0.2], rimA: 0.7, skin: true, dark: 0.55, eyes: 0.8 });
  ctx.restore();
  const head = new DOMMatrix().translate(bx, by).scale(bs).translate(J.neckTop[0], J.neckTop[1]).rotate(J.tilt * 180 / Math.PI);
  const fz = smooth(seg(t, SE.fez - 0.25, SE.fez + 0.3));
  if (fz > 0) {
    ctx.save(); ctx.setTransform(ctx.getTransform().multiply(head)); ctx.globalAlpha = fz; drawFez(ctx, 1, fz, t); ctx.restore();
  }
  // its right hand (viewer's left): a hole straight through the palm
  const hp = new DOMMatrix().translate(bx, by).scale(bs).transformPoint(new DOMPoint(J.wrL[0] - 12, J.wrL[1] + 52));
  const ho = smooth(seg(t, SE.hole - 0.3, SE.hole + 0.3));
  if (ho > 0) {
    radial(ctx, hp.x, hp.y, 40, [[0, `rgba(160,190,230,${0.5 * ho})`], [1, 'rgba(160,190,230,0)']], 'screen');
    ctx.fillStyle = `rgba(190,210,240,${0.95 * ho})`; ctx.beginPath(); ctx.arc(hp.x, hp.y, 12, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(0,0,0,${0.8 * ho})`; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
  // labels with hairlines, drawn on as the narrator names them
  const fezPt = new DOMMatrix().translate(540, 960).scale(lerp(1.0, 1.08, p)).translate(-540, -960).multiply(head).transformPoint(new DOMPoint(0, -200));
  const holePt = new DOMMatrix().translate(540, 960).scale(lerp(1.0, 1.08, p)).translate(-540, -960).transformPoint(hp);
  const label = (pt, tx, ty, text, k) => {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = `rgba(227,20,28,${k})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(lerp(pt.x, tx, k), lerp(pt.y, ty, k)); ctx.stroke();
    ctx.fillStyle = `rgba(227,20,28,${k})`; ctx.beginPath(); ctx.arc(pt.x, pt.y, 7, 0, TAU); ctx.fill();
    ctx.globalAlpha = k; ctx.font = '900 46px Inter, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = tx > pt.x ? 'left' : 'right';
    ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(text, tx + (tx > pt.x ? 14 : -14), ty); ctx.fillStyle = '#fff'; ctx.fillText(text, tx + (tx > pt.x ? 14 : -14), ty);
    ctx.restore();
  };
  label(fezPt, 330, 560, 'ALTIN FES', smooth(seg(t, SE.fez, SE.fez + 0.4)));
  label(holePt, 640, 1110, 'ELİNDE DELİK', smooth(seg(t, SE.hole, SE.hole + 0.4)));
  coldGrade(ctx, 0.25, 0.8, 0.25);
}

// --- 6: a hand snatches the fez off its head ---
function storySnatch(ctx, t) {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  radial(ctx, 700, 500, 900, [[0, 'rgba(60,75,100,0.4)'], [1, 'rgba(0,0,0,0)']]);
  const g = SE.snatch, grab = smooth(seg(t, g - 0.9, g)), away = easeIn(seg(t, g + 0.05, g + 0.45));
  const jerk = t > g ? Math.exp(-(t - g) * 6) * Math.sin((t - g) * 40) * 0.08 : 0;
  ctx.save(); camera(ctx, 540, 960, 1.0, handheld(t, 0.5, 321));
  ctx.save(); ctx.translate(560, 1720); ctx.rotate(-0.35 + jerk);
  drawCreatureFace(ctx, { s: 6.2, dark: 0.55, eyes: 1, light: [0.9, 0.1], mouth: t > g ? 0.6 : 0.1, neck: true });
  // fez on the head until it is pulled away
  ctx.save(); ctx.translate(away * -260, away * -900); ctx.rotate(-away * 0.8); drawFez(ctx, 6.2, 1 - away * 0.5, t); ctx.restore();
  ctx.restore();
  // a human hand reaching in from the lower left, closing on the fez, then yanking it off-screen
  const hx = lerp(-300, 250, grab) - away * 300, hy = lerp(1500, 830, grab) - away * 900;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.75 - away * 0.4); ctx.scale(0.95, 0.95);
  drawHand(ctx, { light: 'moon', curl: [0.2, 0.25, 0.25, 0.3, 0.3].map((c) => c + grab * 0.45 * (t > g - 0.15 ? 1 : 0.3)), t, tremble: 0.3 });
  ctx.restore();
  ctx.restore();
  if (t > g && t < g + 0.06) { ctx.fillStyle = 'rgba(255,230,180,0.5)'; ctx.fillRect(0, 0, W, H); }
  coldGrade(ctx, 0.3, 0.9, 0.2);
}

// --- 7: the local saying as a typographic plate, lit word by word as it is spoken ---
function storyProverb(ctx, t) {
  drawPovBase(ctx, t, 'night', 1.5, handheld(t, 0.4, 331), [560, 760]);
  ctx.save(); ctx.filter = 'blur(10px)'; ctx.drawImage(CANVAS, 0, 0); ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  drawFog(ctx, t, 0.1, 12, 4, 9, 0, H);
  const lines = [['“Enkebit', 'gibi'], ['çöktün,'], ['git', 'başımdan!”']];
  const times = {}; for (const w of window.TL.words) if (!(w.text in times) && w.start > SE.proverb[0]) times[w.text] = w.start;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.font = '900 104px Inter, sans-serif'; ctx.lineJoin = 'round';
  const appear = smooth(seg(t, SE.proverb[0], SE.proverb[0] + 0.4));
  lines.forEach((ln, i) => {
    const y = 700 + i * 130, total = ln.reduce((s, w) => s + ctx.measureText(w + ' ').width, 0);
    let x = 540 - total / 2;
    for (const w of ln) {
      const st = times[w] ?? 99, on = smooth(seg(t, st - 0.05, st + 0.15));
      const red = w.includes('Enkebit');
      ctx.globalAlpha = appear * (0.28 + 0.72 * on);
      ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText(w, x, y);
      ctx.fillStyle = red ? '#e3141c' : '#fff'; ctx.fillText(w, x, y);
      x += ctx.measureText(w + ' ').width;
    }
  });
  ctx.restore();
  coldGrade(ctx, 0.25, 0.85, 0.25);
}

// --- 8: an old wall clock strikes twelve ---
function storyClock(ctx, t) {
  const [a] = SE.clock, tw = SE.twelve;
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
  drawPlasterWall(ctx, 0, 0, W, H, [40, 46, 58], 23);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
  const z = lerp(1.0, 1.18, easeInOut(seg(t, a, tw))) + (t > tw ? 0.04 * Math.exp(-(t - tw) * 5) : 0);
  ctx.save(); camera(ctx, 540, 900, z, handheld(t, 0.4, 341));
  const cx = 540, cy = 900, R = 330;
  radial(ctx, cx, cy, R * 1.6, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fillStyle = linGrad(ctx, cx - R, cy - R, cx + R, cy + R, [[0, '#6b4a22'], [0.5, '#3a2612'], [1, '#1c1209']]);
  ctx.beginPath(); ctx.arc(cx, cy, R + 34, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(214,170,90,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, TAU); ctx.stroke();
  ctx.fillStyle = radial ? '#c9bea5' : '#c9bea5';
  const face = ctx.createRadialGradient(cx - 60, cy - 80, 20, cx, cy, R); face.addColorStop(0, '#d8cdb3'); face.addColorStop(1, '#8a7f68');
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.drawImage(TEX.plaster, cx - R, cy - R, 2 * R, 2 * R); ctx.restore();
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  ctx.fillStyle = '#1a140c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 46px "DejaVu Serif", serif';
  roman.forEach((r, i) => { const an = i / 12 * TAU - Math.PI / 2; ctx.fillText(r, cx + Math.cos(an) * (R - 62), cy + Math.sin(an) * (R - 62)); });
  for (let i = 0; i < 60; i++) { const an = i / 60 * TAU; ctx.lineWidth = i % 5 ? 2 : 5; ctx.strokeStyle = '#1a140c'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (R - 22), cy + Math.sin(an) * (R - 22)); ctx.lineTo(cx + Math.cos(an) * (R - (i % 5 ? 32 : 40)), cy + Math.sin(an) * (R - (i % 5 ? 32 : 40))); ctx.stroke(); }
  // hands: the minute hand ticks round to 12:00 exactly on "12'de"
  const m = clamp((t - a) / (tw - a));
  const tick = Math.floor(m * 24) / 24 + (m >= 1 ? 0 : 0);
  const minA = (-10 / 60 + tick * 10 / 60) * TAU - Math.PI / 2, hourA = (-10 / 720 + tick * 10 / 720) * TAU - Math.PI / 2;
  const hand = (an, len, w, colr) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(an); ctx.fillStyle = colr; ctx.beginPath(); ctx.moveTo(-30, -w); ctx.lineTo(len, -w * 0.3); ctx.lineTo(len + 16, 0); ctx.lineTo(len, w * 0.3); ctx.lineTo(-30, w); ctx.closePath(); ctx.fill(); ctx.restore(); };
  hand(hourA, R * 0.5, 12, '#0d0905'); hand(minA, R * 0.82, 8, '#0d0905');
  ctx.fillStyle = '#b08a3a'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, TAU); ctx.fill();
  // pendulum swinging below
  const sw = Math.sin((t - a) * Math.PI * 2) * 0.25;
  ctx.save(); ctx.translate(cx, cy + R + 40); ctx.rotate(sw); ctx.fillStyle = '#2a1c0e'; ctx.fillRect(-4, 0, 8, 300);
  ctx.fillStyle = linGrad(ctx, -40, 0, 40, 0, [[0, GOLD[2]], [0.4, GOLD[0]], [1, GOLD[2]]]); ctx.beginPath(); ctx.arc(0, 320, 44, 0, TAU); ctx.fill(); ctx.restore();
  ctx.restore();
  if (t > tw) { const k = Math.exp(-(t - tw) * 2.5); tint(ctx, '#b0101a', 0.5 * k, 'soft-light'); fillBlack(ctx, 0); radial(ctx, 540, 900, 900, [[0, `rgba(200,20,30,${0.3 * k})`], [1, 'rgba(0,0,0,0)']], 'screen'); }
  coldGrade(ctx, 0.25, 0.85, 0.25);
}

// --- 9: end card ---
function storyEnd(ctx, t) {
  const p = t - SE.end[0];
  ctx.fillStyle = '#020204'; ctx.fillRect(0, 0, W, H);
  drawFog(ctx, t, 0.12, 14, 4, 11, 0, H);
  const ey = smooth(seg(t, SE.cr - 0.3, SE.cr + 0.3)) * (1 - smooth(seg(t, SE.cr + 2.3, SE.cr + 2.6))) * 0.9 + 0.25;
  for (const x of [470, 610]) radial(ctx, x, 470, 26, [[0, `rgba(230,236,240,${ey})`], [0.3, `rgba(200,212,220,${0.35 * ey})`], [1, 'rgba(200,210,220,0)']]);
  const on = sh2(t, 2) > 0.06 ? 1 : 0.3, a = smooth(clamp(p / 0.4));
  ctx.save(); ctx.globalAlpha = a * on; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 40px Inter, sans-serif'; ctx.letterSpacing = '10px'; ctx.fillStyle = '#d9dde3'; ctx.fillText('YENİ REELS', 545, 640);
  ctx.letterSpacing = '0px';
  ctx.shadowColor = 'rgba(200,0,0,0.6)'; ctx.shadowBlur = 40; ctx.fillStyle = '#c4161c';
  ctx.font = '900 150px Inter, sans-serif'; ctx.fillText('ENKEBİT:', 540, 790);
  ctx.font = '900 112px Inter, sans-serif'; ctx.fillText('BOĞAZ DEŞEN', 540, 930);
  ctx.shadowBlur = 0; ctx.fillStyle = '#e3141c'; ctx.fillRect(390, 1020, 300, 6);
  ctx.font = '900 120px Inter, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
  ctx.strokeText('SAAT 12:00', 540, 1120); ctx.fillText('SAAT 12:00', 540, 1120);
  ctx.restore();
  vignette(ctx, 0.8, 0.25);
}

// --- info cards (documentary lower-thirds, placed high to stay clear of story UI and subtitles) ---
window.OVERLAY = (ctx, t) => {
  for (const c of window.TL.cards) {
    if (t < c.a || t > c.b) continue;
    const k = smooth(seg(t, c.a, c.a + 0.25)) * (1 - smooth(seg(t, c.b - 0.2, c.b)));
    const x = 80 - (1 - k) * 40, y = 330;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = '#e3141c'; ctx.fillRect(x, y - 6, 8, c.text ? 132 : 56);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = '800 34px Inter, sans-serif'; ctx.letterSpacing = '6px';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#e3141c'; ctx.fillText(c.label, x + 30, y);
    ctx.letterSpacing = '0px';
    if (c.text) { ctx.font = '900 62px Inter, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(c.text, x + 30, y + 50); }
    ctx.restore();
  }
};

SHOTS = [
  { a: 0.0, b: SE.title[0], f: storyVillage, fin: 0.35 },
  { a: SE.title[0], b: SE.title[1], f: storyTitle },
  { a: 5.9, b: 7.9, f: storyLoom },
  { a: 7.9, b: SE.plate[0], f: storyNeck },
  { a: SE.plate[0], b: SE.plate[1], f: storyPlate, x: 0.25 },
  { a: SE.plate[1], b: SE.proverb[0], f: storySnatch },
  { a: SE.proverb[0], b: SE.proverb[1], f: storyProverb, x: 0.3 },
  { a: SE.clock[0], b: SE.clock[1], f: storyClock, x: 0.3 },
  { a: SE.end[0], b: 30.01, f: storyEnd },
];
