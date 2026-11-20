// 15 s outro: the narrator turns to the viewer, tension climbs, eyes close... jumpscare.
'use strict';
const OE = window.TL.events;
const OW = {};
for (const w of window.TL.words) OW[w.text.toLocaleLowerCase('tr-TR').replace(/[^\wçğıöşüâî']/g, '')] = w.start;
const Q2 = OW['ya'], Q3 = OE.o3_hand, Q4 = OE.o4_start;
const JB = makeCanvas(W, H), JX = JB.getContext('2d');          // jumpscare layer
const TB = makeCanvas(W, H), TX = TB.getContext('2d');          // tinted copies for the RGB split
const fhash = (t, k) => hash2(Math.floor(t * 24), k, 99);       // per-frame random (deterministic)

// --- 1: the empty bed in the moonlight ---------------------------------------------------
function outroEmptyBed(ctx, t) {
  const p = easeInOut(seg(t, 0, Q2 + 0.3));
  ctx.save(); camera(ctx, lerp(560, 520, p), lerp(1000, 1230, p), lerp(1.05, 1.5, p), handheld(t, 0.5, 201));
  ctx.drawImage(ROOM.wideNight, 0, 0, W, H);
  drawWindowOutside(ctx, RW.win, t + 120, 'night');
  drawWindowMullions(ctx, RW.win, 1);
  drawBlanketWide(ctx, t, { breathAmp: 0 });               // rumpled, nobody under it
  drawCandle(ctx, 92, RW.stool[1] - 42, t, 0, 1.0);
  const [wx, wy, ww] = RW.win;
  moonShaft(ctx, [[wx, wy], [wx + ww, wy], [wx + ww - 120, 1720], [wx - 520, 1700]], 0.2);
  dustMotes(ctx, t, 60, { x: 200, y: 500, w: 760, h: 1200 }, 15, 0.45, 2.0);
  ctx.restore();
  coldGrade(ctx, 0.35, 0.8, 0.25);
}

// --- 2: "your" dark room: pale eyes open in the corner by the door ------------------------
function outroCorner(ctx, t) {
  const p = easeInOut(seg(t, Q2, Q3 + 0.2)), sh = handheld(t, 0.45, 211);
  drawPovBase(ctx, t, 'night', lerp(1.3, 1.75, p), sh, [lerp(520, 440, p), lerp(760, 700, p)]);
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); camera(ctx, lerp(520, 440, p), lerp(760, 700, p), lerp(1.3, 1.75, p), sh);
  // the corner between the wall and the door frame swallowed by darkness
  radialEllipse(ctx, 470, 760, 230, 560, [[0, 'rgba(0,0,0,0.95)'], [0.7, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]);
  const e = smooth(seg(t, OE.o2_eyes, OE.o2_eyes + 0.7));
  const blink = (t > OE.o2_eyes + 1.4 && t < OE.o2_eyes + 1.55) ? 0.1 : 1;
  // a barely visible tall shape, its head tilting on "ne yapardınız?"
  const J = crPose('stand', 0, t); J.tilt += -0.25 * smooth(seg(t, OW['ne'] || 6.5, (OW['ne'] || 6.5) + 0.8));
  ctx.save(); ctx.globalAlpha = 0.55 * e; ctx.translate(470, 1170); ctx.scale(0.62, 0.62);
  drawCreatureBody(ctx, J, { t, rimDir: [1, -0.2], rimA: 0.18, fill: [4, 4, 6] });
  ctx.restore();
  const hm = new DOMMatrix().translate(470, 1170).scale(0.62).translate(J.neckTop[0], J.neckTop[1]).rotate(J.tilt * 180 / Math.PI);
  for (const [px, py] of [[-19, -88], [19, -86]]) {
    const q = hm.transformPoint(new DOMPoint(px, py));
    ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1, e * blink);
    radial(ctx, 0, 0, 16, [[0, `rgba(225,232,236,${0.95 * e})`], [0.35, `rgba(200,212,220,${0.35 * e})`], [1, 'rgba(200,210,220,0)']]);
    ctx.restore();
  }
  ctx.restore();
  drawFog(ctx, t, 0.08, 10, 4, 7, 0, H);
  coldGrade(ctx, 0.35, 0.95, 0.15);
}

// --- 3: "you think you are alone": a long hand creeps over the edge of the screen -----------
function outroHand(ctx, t) {
  const p = seg(t, Q3, Q4);
  drawPovBase(ctx, t, 'night', 1.9, handheld(t, 0.6, 221), [700, 900]);
  ctx.save(); ctx.filter = 'blur(6px)'; ctx.globalAlpha = 0.6; ctx.drawImage(CANVAS, 0, 0); ctx.restore();   // shallow focus
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
  // as if over the viewer's shoulder: fingers slide down from the top-right corner, nails tapping
  const k = easeOut(seg(t, Q3, Q3 + 1.4));
  const tap = Math.max(0, Math.sin((t - Q3) * 9)) * 0.08 * smooth(seg(t, Q3 + 0.8, Q3 + 1.2));
  ctx.save(); ctx.translate(lerp(1300, 960, k), lerp(-420, 60, k)); ctx.rotate(2.05);
  drawCreatureHandClose(ctx, { s: 2.1, t, curl: 0.3 + tap + 0.15 * k, light: [0.9, 0.2], seed: 77 });
  ctx.restore();
  ctx.save(); ctx.translate(lerp(1300, 960, k), lerp(-420, 60, k)); ctx.rotate(2.05);
  radialEllipse(ctx, 330, 0, 420, 160, [[0, 'rgba(140,165,205,0.16)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.restore();
  // breath fog creeping from the same side
  breathPuffs(ctx, t, 980, 360, Q3 + 1.1, 1.6, [-0.7, 0.4], 1.1);
  coldGrade(ctx, 0.3, 0.85, 0.2);
}

// --- 4: lying in bed, looking at the ceiling; eyelids close... something is up there -------
function lidClose(t) {
  const half = (c, d, a) => a * Math.sin(Math.PI * seg(t, c, c + d));
  const final = easeInOut(seg(t, OE.lids[0], OE.lids[1] - 0.15));
  return clamp(Math.max(half(Q4 + 0.6, 0.7, 0.45), half(Q4 + 1.6, 0.8, 0.65), final));
}
function drawCeiling(ctx, t) {
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
  // planks converging slightly (looking straight up), two round beams across
  for (let i = -2; i < 16; i++) {
    const x0 = i * 90 - 60, x1 = x0 + 86;
    ctx.fillStyle = col([20 + (i % 3) * 3, 16 + (i % 2) * 3, 13]); poly(ctx, [[x0 + 30, 0], [x1 + 30, 0], [x1 - 30, H], [x0 - 30, H]]); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.translate(x0, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(TEX.wood, 0, -86, H, 86); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 30, 0); ctx.lineTo(x0 - 30, H); ctx.stroke();
  }
  for (const by of [520, 1380]) {
    ctx.fillStyle = linGrad(ctx, 0, by - 70, 0, by + 70, [[0, '#0c0907'], [0.45, '#3a2d22'], [1, '#090706']]);
    ctx.fillRect(-20, by - 70, W + 40, 140);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.7; ctx.drawImage(TEX.wood, -20, by - 70, W + 40, 140); ctx.restore();
  }
  // pale moonlight patch thrown on the ceiling by the window
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(30px)'; ctx.fillStyle = 'rgba(120,150,195,0.25)';
  poly(ctx, [[600, 980], [1100, 900], [1100, 1500], [720, 1420]]); ctx.fill(); ctx.restore();
}
function outroCeiling(ctx, t) {
  const p = seg(t, Q4, OE.lids[1]);
  ctx.save(); camera(ctx, 540, 960, lerp(1.0, 1.15, p), handheld(t, 0.35, 231));
  drawCeiling(ctx, t);
  // clinging to the ceiling directly above, limbs spread like a spider; only noticeable at the very end
  const vis = smooth(seg(t, Q4 + 1.2, OE.lids[1] - 0.2));
  if (vis > 0) {
    const J = {
      head: [0, -520], neckTop: [0, -470], neckBase: [0, -420], shL: [-80, -400], shR: [80, -400], chest: [0, -330], pelvis: [0, -160],
      elL: [-260, -520], elR: [260, -520], wrL: [-380, -700], wrR: [380, -700], hipL: [-50, -150], hipR: [50, -150],
      knL: [-260, -60], knR: [260, -60], anL: [-330, 160], anR: [330, 160], toL: [-360, 230], toR: [360, 230], tilt: Math.PI + 0.3 + n1(t, 3) * 0.05,
    };
    ctx.save(); ctx.globalAlpha = vis * 0.85; ctx.translate(560, 1300); ctx.scale(0.95, 0.95);
    drawCreatureBody(ctx, J, { t, rimDir: [1, 0.3], rimA: 0.25, fill: [5, 5, 7], curlL: 0.7, curlR: 0.7 });
    ctx.restore();
    const hm = new DOMMatrix().translate(560, 1300).scale(0.95).translate(J.neckTop[0], J.neckTop[1]).rotate(J.tilt * 180 / Math.PI);
    for (const [px, py] of [[-19, -88], [19, -86]]) { const q = hm.transformPoint(new DOMPoint(px, py)); radial(ctx, q.x, q.y, 14, [[0, `rgba(225,232,236,${0.9 * vis})`], [1, 'rgba(200,210,220,0)']]); }
  }
  ctx.restore();
  coldGrade(ctx, 0.35, 0.9, 0.2);
  // the viewer's eyelids closing (light bleeding red through the lids at the edges)
  const c = lidClose(t);
  if (c > 0) {
    const yt = lerp(-60, 990, c), yb = lerp(H + 60, 930, c);
    ctx.save(); ctx.filter = 'blur(14px)';
    ctx.fillStyle = 'rgba(40,6,6,0.9)';
    ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(W + 40, -40); ctx.lineTo(W + 40, yt - 260); ctx.quadraticCurveTo(540, yt + 120, -40, yt - 260); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, H + 40); ctx.lineTo(W + 40, H + 40); ctx.lineTo(W + 40, yb + 240); ctx.quadraticCurveTo(540, yb - 110, -40, yb + 240); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(W + 40, -40); ctx.lineTo(W + 40, yt - 300); ctx.quadraticCurveTo(540, yt + 60, -40, yt - 300); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, H + 40); ctx.lineTo(W + 40, H + 40); ctx.lineTo(W + 40, yb + 280); ctx.quadraticCurveTo(540, yb - 50, -40, yb + 280); ctx.fill();
    // eyelashes along the closing edge
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const u = i / 27, x = lerp(60, 1020, u), y = yt - 300 + (1 - (2 * u - 1) ** 2) * 180 * (yt + 60 - (yt - 300)) / 360;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (u - 0.5) * 30, y + 30, x + (u - 0.5) * 60, y + 46); ctx.stroke();
    }
    fillBlack(ctx, smooth(seg(c, 0.85, 1)));
  }
}

// --- 5: silence in the dark, two eyes right in front of you... JUMPSCARE ----------------------
function outroDark(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const e = smooth(seg(t, OE.silence[0] + 0.15, OE.jump[0]));
  if (e > 0) for (const x of [470, 610]) {
    radial(ctx, x, 900, 26, [[0, `rgba(230,236,240,${0.95 * e})`], [0.3, `rgba(200,212,220,${0.35 * e})`], [1, 'rgba(200,210,220,0)']]);
    ctx.fillStyle = `rgba(10,10,10,${e})`; ctx.beginPath(); ctx.arc(x, 900, 2.5, 0, TAU); ctx.fill();
  }
}
function drawJumpFace(x, t, js) {
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  x.fillStyle = '#050405'; x.fillRect(0, 0, W, H);
  radial(x, 540, 900, 1000, [[0, 'rgba(90,100,115,0.55)'], [1, 'rgba(0,0,0,0)']]);       // flash-lit from the front
  const s = lerp(9.0, 12.5, easeOut(clamp(js / 0.35)));
  const jx = (fhash(t, 1) - 0.5) * 70 * (1 - js), jy = (fhash(t, 2) - 0.5) * 70 * (1 - js), jr = (fhash(t, 3) - 0.5) * 0.14;
  x.save(); x.translate(540 + jx, 1520 + jy + js * 120); x.rotate(-0.12 + jr);
  drawCreatureFace(x, { s, dark: 0.18, eyes: 1, mouth: lerp(1.2, 1.9, clamp(js / 0.2)), light: [0.55, 0.1], neck: false });
  x.restore();
}
function outroJump(ctx, t) {
  const js = t - OE.jump[0], dur = OE.jump[1] - OE.jump[0];
  drawJumpFace(JX, t, js);
  ctx.drawImage(JB, 0, 0);
  // chromatic aberration: red and cyan copies pushed apart
  const off = 10 + 30 * (1 - js / dur) * fhash(t, 4);
  for (const [colr, dx] of [['#ff0000', off], ['#00ffff', -off]]) {
    TX.setTransform(1, 0, 0, 1, 0, 0); TX.globalCompositeOperation = 'source-over'; TX.globalAlpha = 1;
    TX.drawImage(JB, 0, 0); TX.globalCompositeOperation = 'multiply'; TX.fillStyle = colr; TX.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(TB, dx, (fhash(t, 5) - 0.5) * 12); ctx.restore();
  }
  // horizontal glitch tears
  TX.setTransform(1, 0, 0, 1, 0, 0); TX.globalCompositeOperation = 'source-over'; TX.drawImage(CANVAS, 0, 0);
  for (let i = 0; i < 7; i++) {
    const y = fhash(t, 10 + i) * H, h = 20 + fhash(t, 20 + i) * 110, dx = (fhash(t, 30 + i) - 0.5) * 160;
    ctx.drawImage(TB, 0, y, W, h, dx, y, W, h);
  }
  // white flash on impact, one inverted frame, blood-red edges
  if (js < 0.05) { ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(0, 0, W, H); }
  if (js > 0.29 && js < 0.33) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const g = ctx.createRadialGradient(540, 960, 300, 540, 960, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(110,0,0,0.75)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function outroTitle(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const p = seg(t, OE.title[0], OE.title[0] + 0.12);
  if (p <= 0) return;
  const on = fhash(t, 7) > 0.18 ? 1 : 0.25;
  ctx.save(); ctx.globalAlpha = p * on; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(200,0,0,0.7)'; ctx.shadowBlur = 40; ctx.fillStyle = '#c4161c';
  ctx.font = '900 170px Inter, sans-serif'; ctx.fillText('ENKEBİT', 540 + (fhash(t, 8) - 0.5) * 10, 940);
  ctx.restore();
}

SHOTS = [
  { a: 0.0, b: Q2, f: outroEmptyBed, fin: 0.45 },
  { a: Q2, b: Q3, f: outroCorner, x: 0.3 },
  { a: Q3, b: Q4, f: outroHand },
  { a: Q4, b: OE.silence[0] + 0.05, f: outroCeiling, x: 0.3 },
  { a: OE.silence[0] + 0.05, b: OE.jump[0], f: outroDark },
  { a: OE.jump[0], b: OE.jump[1], f: outroJump },
  { a: OE.jump[1], b: 15.01, f: outroTitle },
];
