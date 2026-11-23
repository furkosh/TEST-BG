// The narrator: ~35 y/o Anatolian villager, short black hair, light beard, off-white cotton undershirt.
// One parametric model (front face, lying profile, hand, back view) keeps him identical in every shot.
'use strict';
const MAN = {};
const LIGHTS = {
  moon:    { base: [112, 122, 138], sh: [22, 27, 38], hi: [190, 205, 225], lip: [92, 86, 98], shirt: [120, 130, 145], ang: -0.75 },
  morning: { base: [178, 156, 140], sh: [70, 58, 54], hi: [232, 220, 206], lip: [150, 104, 98], shirt: [200, 196, 186], ang: -0.6 },
  flash:   { base: [150, 138, 124], sh: [14, 14, 17], hi: [246, 240, 228], lip: [120, 84, 80], shirt: [120, 110, 100], ang: 1.15 },
  dawn:    { base: [150, 140, 134], sh: [40, 42, 52], hi: [210, 214, 226], lip: [130, 96, 96], shirt: [140, 140, 146], ang: -0.9 },
  lantern: { base: [172, 122, 88], sh: [26, 16, 12], hi: [255, 204, 146], lip: [140, 80, 64], shirt: [150, 120, 92], ang: 0.95 },
  dim:     { base: [96, 104, 118], sh: [12, 15, 22], hi: [170, 188, 212], lip: [80, 74, 84], shirt: [90, 96, 108], ang: -2.2 },
  candle:  { base: [168, 118, 84], sh: [40, 22, 16], hi: [255, 205, 150], lip: [130, 70, 56], shirt: [190, 150, 110], ang: -2.4 },
};

// ---------- geometry (face-local units: face ~300 wide, chin at y=165) ----------
function headPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -238);
  ctx.bezierCurveTo(92, -240, 146, -196, 150, -128);
  ctx.bezierCurveTo(154, -82, 160, -40, 152, 2);
  ctx.bezierCurveTo(147, 42, 138, 72, 122, 100);
  ctx.bezierCurveTo(100, 134, 72, 158, 36, 167);
  ctx.bezierCurveTo(14, 172, -14, 172, -36, 167);
  ctx.bezierCurveTo(-72, 158, -100, 134, -122, 100);
  ctx.bezierCurveTo(-138, 72, -147, 42, -152, 2);
  ctx.bezierCurveTo(-160, -40, -154, -82, -150, -128);
  ctx.bezierCurveTo(-146, -196, -92, -240, 0, -238);
  ctx.closePath();
}
function beardPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-150, -38);
  ctx.bezierCurveTo(-140, 0, -128, 30, -112, 54);          // cheek line down
  ctx.bezierCurveTo(-90, 40, -70, 46, -56, 70);
  ctx.bezierCurveTo(-44, 66, -30, 62, -16, 64);             // moustache top
  ctx.bezierCurveTo(-6, 60, 6, 60, 16, 64);
  ctx.bezierCurveTo(30, 62, 44, 66, 56, 70);
  ctx.bezierCurveTo(70, 46, 90, 40, 112, 54);
  ctx.bezierCurveTo(128, 30, 140, 0, 150, -38);
  ctx.lineTo(156, 0);
  ctx.bezierCurveTo(147, 42, 138, 72, 122, 100);
  ctx.bezierCurveTo(100, 134, 72, 158, 36, 167);
  ctx.bezierCurveTo(14, 172, -14, 172, -36, 167);
  ctx.bezierCurveTo(-72, 158, -100, 134, -122, 100);
  ctx.bezierCurveTo(-138, 72, -147, 42, -156, 0);
  ctx.closePath();
}
function hairPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-154, -70);
  ctx.bezierCurveTo(-160, -130, -150, -205, -96, -238);
  ctx.bezierCurveTo(-40, -262, 50, -262, 100, -236);
  ctx.bezierCurveTo(150, -205, 162, -130, 154, -70);
  ctx.lineTo(146, -72);
  ctx.bezierCurveTo(144, -110, 138, -150, 118, -170);       // temple recess
  ctx.bezierCurveTo(90, -178, 60, -188, 30, -186);
  ctx.bezierCurveTo(10, -184, -10, -184, -30, -186);
  ctx.bezierCurveTo(-60, -188, -90, -178, -118, -170);
  ctx.bezierCurveTo(-138, -150, -144, -110, -146, -72);
  ctx.closePath();
}

function buildMan() {
  const c = makeCanvas(400, 500), x = c.getContext('2d');
  const r = mulberry32(2024);
  x.translate(200, 280);
  // beard stipple
  MAN.beard = [];
  beardPath(x);
  for (let i = 0; i < 9000 && MAN.beard.length < 3400; i++) {
    const px = (r() - 0.5) * 320, py = -60 + r() * 240;
    if (!x.isPointInPath(px + 200, py + 280)) continue;
    // keep a clean gap around the lips
    if (Math.abs(px) < 50 && py > 74 && py < 106) continue;
    const dens = clamp(0.35 + (py + 40) / 200 + (Math.abs(px) < 60 && py < 74 ? 0.3 : 0));
    if (r() > dens) continue;
    const ang = Math.PI / 2 + (px / 160) * 0.6 + (r() - 0.5) * 0.6;
    MAN.beard.push([px, py, 3 + r() * 5, ang, 0.25 + r() * 0.45]);
  }
  // hair strands
  MAN.hair = [];
  for (let i = 0; i < 1400; i++) {
    const a = r() * Math.PI, rr = 150 + r() * 95;
    const px = Math.cos(a) * -rr * 0.98, py = -40 - Math.sin(a) * rr * 0.9;
    MAN.hair.push([px, py, 6 + r() * 10, a - Math.PI / 2 + (r() - 0.5) * 0.8, r()]);
  }
  MAN.brow = [];
  for (let i = 0; i < 260; i++) MAN.brow.push([r(), (r() - 0.5), r(), r()]);
}

// ---------- eye ----------
// cx,cy: eye centre; side +1 = viewer's right eye; open 0..1; wide 0..1; look [-1..1]; pupil 0..1 dilation
function drawEye(ctx, cx, cy, side, o, L) {
  const open = clamp(o.open ?? 1), wide = o.wide || 0, look = o.look || [0, 0], pupil = o.pupil ?? 0.3;
  const inner = [cx - side * 32, cy + 3], outer = [cx + side * 34, cy - 1];
  const upH = (14 + wide * 9) * open, loH = 9 + wide * 2;
  const up = (s) => { ctx.moveTo(inner[0], inner[1]); ctx.bezierCurveTo(cx - side * 18, cy - upH * 1.25, cx + side * 14, cy - upH * 1.35, outer[0], outer[1]); };
  // socket shadow + lid
  radialEllipse(ctx, cx + side * 2, cy - 4, 52, 34, [[0, col(L.sh, 0.35)], [1, col(L.sh, 0)]]);
  ctx.save();
  ctx.beginPath(); up(); ctx.bezierCurveTo(cx + side * 14, cy + loH * 1.2, cx - side * 16, cy + loH * 1.2, inner[0], inner[1]); ctx.closePath();
  if (open > 0.05) {
    ctx.save(); ctx.clip();
    const scl = mix(L.base, L.hi, 0.55);
    ctx.fillStyle = col(scl); ctx.fillRect(cx - 40, cy - 30, 80, 60);
    radialEllipse(ctx, cx, cy, 38, 18, [[0, 'rgba(0,0,0,0)'], [0.7, col(L.sh, 0.25)], [1, col(L.sh, 0.7)]]);
    // tiny veins (fear)
    if (wide > 0.3) { ctx.strokeStyle = `rgba(150,50,50,${0.25 * wide})`; ctx.lineWidth = 0.6; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(cx + side * (34 - k), cy + k - 2); ctx.quadraticCurveTo(cx + side * (24 - k * 2), cy + k * 2 - 4, cx + side * 16, cy + k - 3); ctx.stroke(); } }
    const ix = cx + look[0] * 11, iy = cy + look[1] * 5 + 1, ir = 13.5;
    const ig = ctx.createRadialGradient(ix, iy, 1, ix, iy, ir);
    const ic = L === LIGHTS.moon ? ['#1d1a19', '#3a3330', '#211b18'] : ['#2a1c12', '#4a3322', '#2a1a10'];
    ig.addColorStop(0, ic[0]); ig.addColorStop(0.55, ic[1]); ig.addColorStop(0.85, ic[2]); ig.addColorStop(1, '#0b0705');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,100,70,0.35)'; ctx.lineWidth = 0.7;
    for (let k = 0; k < 22; k++) { const a = k / 22 * TAU; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 5, iy + Math.sin(a) * 5); ctx.lineTo(ix + Math.cos(a) * 11.5, iy + Math.sin(a) * 11.5); ctx.stroke(); }
    ctx.fillStyle = '#030303'; ctx.beginPath(); ctx.arc(ix, iy, 3.5 + pupil * 5.5, 0, TAU); ctx.fill();
    // catchlight: the moonlit window
    ctx.fillStyle = 'rgba(235,242,252,0.85)'; ctx.fillRect(ix + 3, iy - 6, 3, 3.5);
    ctx.fillStyle = 'rgba(235,242,252,0.35)'; ctx.beginPath(); ctx.arc(ix - 5, iy + 6, 1.4, 0, TAU); ctx.fill();
    // upper lid shadow on the eyeball
    ctx.fillStyle = linGrad(ctx, 0, cy - upH * 1.3, 0, cy + 2, [[0, col(L.sh, 0.85)], [0.6, col(L.sh, 0.15)], [1, col(L.sh, 0)]]);
    ctx.fillRect(cx - 40, cy - 30, 80, 32);
    // wet line on the lower lid
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(inner[0] + side * 6, inner[1] + 2); ctx.bezierCurveTo(cx - side * 14, cy + loH * 1.05, cx + side * 12, cy + loH * 1.05, outer[0] - side * 4, outer[1] + 1); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // upper lid edge + lashes
  ctx.fillStyle = 'rgba(8,8,10,0.92)';
  const lp = bezPts(inner, [cx - side * 18, cy - upH * 1.25], [cx + side * 14, cy - upH * 1.35], outer, 14);
  inkStroke(ctx, lp, 2.2, 4.2, true);
  ctx.strokeStyle = 'rgba(8,8,10,0.8)'; ctx.lineWidth = 1.1;
  for (let k = 3; k < lp.length - 1; k++) {
    const [px, py] = lp[k]; const dirx = side * (0.3 + k / lp.length * 0.9), diry = open > 0.2 ? -1 : 0.6;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + dirx * 3, py + diry * 4, px + dirx * 6, py + diry * 6); ctx.stroke();
  }
  // lid crease / fold
  ctx.strokeStyle = col(L.sh, 0.55); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(inner[0] + side * 4, inner[1] - 8); ctx.bezierCurveTo(cx - side * 14, cy - 22 - wide * 6, cx + side * 16, cy - 24 - wide * 6, outer[0] + side * 3, outer[1] - 9); ctx.stroke();
  // lower lid + under-eye bag
  ctx.strokeStyle = col(L.sh, 0.5); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(inner[0], inner[1]); ctx.bezierCurveTo(cx - side * 16, cy + loH * 1.2, cx + side * 14, cy + loH * 1.2, outer[0], outer[1]); ctx.stroke();
  ctx.strokeStyle = col(L.sh, 0.25); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(cx - side * 22, cy + 18); ctx.quadraticCurveTo(cx, cy + 26, cx + side * 24, cy + 16); ctx.stroke();
}

function drawBrow(ctx, side, raise, knit, L) {
  // inner end at x=side*24, outer at side*112
  const iy = -98 - raise * 16 - knit * 4, oy = -104 - raise * 6;
  const pts = bezPts([side * (22 - knit * 6), iy + 4], [side * 50, iy - 10 - raise * 4], [side * 86, oy - 12], [side * 114, oy + 4], 16);
  ctx.fillStyle = 'rgba(10,9,9,0.85)'; inkStroke(ctx, pts, 13, 6, true);
  ctx.strokeStyle = 'rgba(14,12,12,0.75)'; ctx.lineWidth = 1.2;
  for (const [u, v, a, b] of MAN.brow) {
    const i = Math.floor(u * (pts.length - 1)), [px, py] = pts[i];
    const yy = py + v * 10;
    ctx.beginPath(); ctx.moveTo(px - side * 3, yy + 2); ctx.lineTo(px + side * (5 + a * 5), yy - 2 - b * 3); ctx.stroke();
  }
  // brow ridge highlight (moon side)
  if (side > 0) { ctx.strokeStyle = col(L.hi, 0.18); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(30, -124 - raise * 10); ctx.quadraticCurveTo(70, -136 - raise * 8, 110, -122); ctx.stroke(); }
}

// ---------- full front face ----------
// o: {light, open, openL, openR, wide, look, pupil, raise, knit, mouth, sweat, scratches, t, neck}
function drawManFace(ctx, o = {}) {
  const L = LIGHTS[o.light || 'moon'], t = o.t || 0;
  ctx.save();
  // neck + shoulders (behind the head)
  if (o.neck !== false) {
    ctx.save(); if (o.neckScale) { ctx.translate(0, 120); ctx.scale(1, o.neckScale); ctx.translate(0, -120); }
    ctx.fillStyle = col(mix(L.base, L.sh, 0.45));
    ctx.beginPath(); ctx.moveTo(-82, 90); ctx.bezierCurveTo(-86, 180, -92, 250, -110, 300); ctx.lineTo(110, 300); ctx.bezierCurveTo(92, 250, 86, 180, 82, 90); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = linGrad(ctx, -90, 0, 90, 0, [[0, col(L.sh, 0.75)], [0.6, col(L.sh, 0.1)], [1, col(L.hi, 0.12)]]); ctx.fillRect(-120, 80, 240, 230);
    ctx.fillStyle = linGrad(ctx, 0, 150, 0, 210, [[0, col(L.sh, 0.85)], [1, col(L.sh, 0)]]); ctx.fillRect(-120, 140, 240, 80);  // under-jaw shadow
    // sternocleidomastoid + adam's apple
    ctx.strokeStyle = col(L.sh, 0.35); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-60, 170); ctx.quadraticCurveTo(-40, 240, -12, 296); ctx.moveTo(62, 170); ctx.quadraticCurveTo(42, 240, 14, 296); ctx.stroke();
    radialEllipse(ctx, 4, 222, 14, 18, [[0, col(L.hi, 0.18)], [1, col(L.hi, 0)]]);
    ctx.strokeStyle = col(L.sh, 0.4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(4, 222, 13, 0.4, Math.PI - 0.4); ctx.stroke();
    // stubble on the neck
    ctx.fillStyle = 'rgba(10,10,12,0.12)';
    for (let i = 0; i < 200; i++) { const a = hash2(i, 1, 5), b = hash2(i, 2, 5); ctx.fillRect(-70 + a * 140, 150 + b * 50, 1.5, 2.5); }
    // scratches: three thin red claw marks
    const sc = o.scratches || 0;
    if (sc > 0) {
      for (let k = 0; k < 3; k++) {
        const x0 = -64 + k * 22, y0 = 190 + k * 8;
        const pts = bezPts([x0, y0], [x0 + 24, y0 + 18], [x0 + 50, y0 + 36], [x0 + 76, y0 + 60], 12);
        ctx.fillStyle = `rgba(200,80,80,${0.35 * sc})`; inkStroke(ctx, pts, 8, 6, true);
        ctx.fillStyle = `rgba(120,8,12,${0.95 * sc})`; inkStroke(ctx, pts, 2.6, 2, true);
        ctx.fillStyle = `rgba(255,200,200,${0.25 * sc})`; inkStroke(ctx, pts.map(([a, b]) => [a + 1, b - 2]), 1, 1, true);
      }
    }
    ctx.restore();
    // shirt collar (round neck cotton undershirt with 3 buttons)
    ctx.fillStyle = col(L.shirt);
    ctx.beginPath(); ctx.moveTo(-260, 420); ctx.bezierCurveTo(-240, 320, -170, 290, -100, 282); ctx.quadraticCurveTo(0, 318, 100, 282);
    ctx.bezierCurveTo(170, 290, 240, 320, 260, 420); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = linGrad(ctx, -260, 0, 260, 0, [[0, col(L.sh, 0.7)], [0.55, col(L.sh, 0.05)], [1, col(L.hi, 0.15)]]); ctx.fillRect(-270, 270, 540, 160);
    ctx.strokeStyle = col(L.sh, 0.45); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-100, 284); ctx.quadraticCurveTo(0, 322, 100, 284); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(0, 420); ctx.stroke();
    for (let k = 0; k < 3; k++) { ctx.fillStyle = col(L.sh, 0.6); ctx.beginPath(); ctx.arc(-9, 330 + k * 30, 4, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = col(L.sh, 0.25); ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-200 + k * 30, 330 + k * 6); ctx.quadraticCurveTo(-150 + k * 20, 360, -120 + k * 14, 420); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  // ears
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    ctx.fillStyle = col(mix(L.base, L.sh, s > 0 ? 0.15 : 0.5));
    ctx.beginPath(); ctx.moveTo(146, -70); ctx.bezierCurveTo(176, -92, 186, -40, 176, -6); ctx.bezierCurveTo(170, 20, 160, 30, 150, 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col(L.sh, 0.6); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(156, -58); ctx.bezierCurveTo(172, -70, 176, -36, 166, -14); ctx.stroke();
    ctx.restore();
  }
  // head base + form shading
  headPath(ctx); ctx.fillStyle = col(L.base); ctx.fill();
  ctx.save(); headPath(ctx); ctx.clip();
  const la = L.ang, lx = Math.cos(la), ly = Math.sin(la);
  ctx.fillStyle = linGrad(ctx, lx * 190, ly * 190, -lx * 190, -ly * 190, [[0, col(L.hi, 0.32)], [0.3, col(L.hi, 0.04)], [0.5, col(L.sh, 0.25)], [0.7, col(L.sh, 0.75)], [1, col(L.sh, 0.96)]]);
  ctx.fillRect(-200, -260, 400, 450);
  // skin texture (pores / painterly mottling)
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5; ctx.drawImage(TEX.plaster, -180, -260, 360, 440);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  radialEllipse(ctx, 0, -30, 175, 215, [[0, col(L.sh, 0)], [0.72, col(L.sh, 0)], [1, col(L.sh, 0.55)]]);
  // forehead + cheekbone highlights, cheek hollows
  radialEllipse(ctx, 35, -150, 90, 40, [[0, col(L.hi, 0.22)], [1, col(L.hi, 0)]]);
  radialEllipse(ctx, 98, -8, 46, 26, [[0, col(L.hi, 0.3)], [1, col(L.hi, 0)]], null, -0.3);
  radialEllipse(ctx, -98, -8, 46, 26, [[0, col(L.hi, 0.06)], [1, col(L.hi, 0)]], null, 0.3);
  radialEllipse(ctx, 104, 58, 40, 50, [[0, col(L.sh, 0.25)], [1, col(L.sh, 0)]]);
  radialEllipse(ctx, -104, 58, 40, 50, [[0, col(L.sh, 0.35)], [1, col(L.sh, 0)]]);
  // forehead wrinkles when afraid
  const raise = o.raise || 0;
  if (raise > 0.1) {
    ctx.strokeStyle = col(L.sh, 0.35 * raise); ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-70, -140 - k * 14); ctx.quadraticCurveTo(0, -152 - k * 16, 70, -140 - k * 14); ctx.stroke(); }
  }
  // nose
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = col(L.sh, 0.55); ctx.beginPath();
  ctx.moveTo(-12, -62); ctx.bezierCurveTo(-18, -20, -26, 10, -30, 32); ctx.bezierCurveTo(-24, 46, -10, 48, -4, 44); ctx.bezierCurveTo(-8, 10, -8, -30, -6, -62); ctx.fill();
  ctx.strokeStyle = col(L.hi, 0.28); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(6, -58); ctx.bezierCurveTo(8, -20, 10, 4, 10, 22); ctx.stroke();
  ctx.filter = 'none';
  radialEllipse(ctx, 6, 26, 16, 12, [[0, col(L.hi, 0.35)], [1, col(L.hi, 0)]]);
  ctx.fillStyle = col(L.sh, 0.85);
  ctx.beginPath(); ctx.ellipse(-15, 42, 8, 4, 0.25, 0, TAU); ctx.ellipse(16, 42, 8, 4, -0.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = col(L.sh, 0.55); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-30, 30); ctx.bezierCurveTo(-36, 40, -30, 48, -20, 47); ctx.moveTo(30, 30); ctx.bezierCurveTo(36, 40, 30, 48, 20, 47); ctx.stroke();
  radialEllipse(ctx, 0, 56, 30, 9, [[0, col(L.sh, 0.4)], [1, col(L.sh, 0)]]);
  // nasolabial folds
  ctx.filter = 'blur(1.5px)';
  ctx.strokeStyle = col(L.sh, 0.4); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-36, 40); ctx.quadraticCurveTo(-54, 66, -56, 92); ctx.moveTo(36, 40); ctx.quadraticCurveTo(54, 66, 56, 92); ctx.stroke();
  ctx.filter = 'none';
  ctx.restore();

  // eyes
  const ol = o.openL ?? o.open ?? 1, or = o.openR ?? o.open ?? 1;
  drawEye(ctx, -62, -56, -1, { open: ol, wide: o.wide, look: o.look, pupil: o.pupil }, L);
  drawEye(ctx, 62, -56, 1, { open: or, wide: o.wide, look: o.look, pupil: o.pupil }, L);
  drawBrow(ctx, -1, raise, o.knit || 0, L); drawBrow(ctx, 1, raise, o.knit || 0, L);

  // mouth
  const mo = o.mouth || 0;
  const lipC = L.lip;
  if (mo > 0.02) {
    ctx.fillStyle = '#0a0606'; ctx.beginPath(); ctx.ellipse(0, 92 + mo * 6, 34 - mo * 6, 4 + mo * 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,200,205,0.6)'; ctx.fillRect(-16, 87 + mo * 2, 32, 3 * mo);
  }
  ctx.fillStyle = col(lipC); ctx.beginPath();
  ctx.moveTo(-48, 90); ctx.bezierCurveTo(-30, 80, -14, 76, 0, 82 - mo * 2); ctx.bezierCurveTo(14, 76, 30, 80, 48, 90);
  ctx.bezierCurveTo(30, 90 - mo * 2, 10, 90 - mo * 4, 0, 91 - mo * 4); ctx.bezierCurveTo(-10, 90 - mo * 4, -30, 90 - mo * 2, -48, 90); ctx.fill();
  ctx.fillStyle = col(mix(lipC, L.hi, 0.15)); ctx.beginPath();
  ctx.moveTo(-44, 92); ctx.bezierCurveTo(-26, 92 + mo * 18, 26, 92 + mo * 18, 44, 92); ctx.bezierCurveTo(30, 108 + mo * 18, -30, 108 + mo * 18, -44, 92); ctx.fill();
  radialEllipse(ctx, 8, 99 + mo * 14, 18, 5, [[0, col(L.hi, 0.35)], [1, col(L.hi, 0)]]);
  ctx.strokeStyle = 'rgba(12,8,8,0.8)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-48, 90); ctx.bezierCurveTo(-20, 92 - mo * 2, 20, 92 - mo * 2, 48, 90); ctx.stroke();
  radialEllipse(ctx, 0, 118 + mo * 12, 30, 9, [[0, col(L.sh, 0.4)], [1, col(L.sh, 0)]]);

  // beard (light, short)
  ctx.save(); beardPath(ctx); ctx.clip(); ctx.filter = 'blur(6px)';
  ctx.fillStyle = 'rgba(8,8,10,0.28)'; ctx.beginPath(); ctx.ellipse(0, 110, 150, 90, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(8,8,10,0.16)'; ctx.fillRect(-170, -60, 340, 240);
  ctx.restore();
  ctx.strokeStyle = 'rgba(10,9,9,0.55)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [px, py, l, a, al] of MAN.beard) { if (al < 0.45) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(10,9,9,0.3)'; ctx.beginPath();
  for (const [px, py, l, a, al] of MAN.beard) { if (al >= 0.45) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); }
  ctx.stroke();
  // moonlit tips on the beard (light side)
  ctx.strokeStyle = col(L.hi, 0.12); ctx.beginPath();
  for (const [px, py, l, a] of MAN.beard) { if (px < 40) continue; ctx.moveTo(px + 1, py - 1); ctx.lineTo(px + 1 + Math.cos(a) * l * 0.6, py - 1 + Math.sin(a) * l * 0.6); }
  ctx.stroke();

  // hair
  hairPath(ctx); ctx.fillStyle = '#0b0a0b'; ctx.fill();
  ctx.save(); hairPath(ctx); ctx.clip();
  ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (const [px, py, l, a, v] of MAN.hair) {
    const lit = clamp((px + py * -0.6 + 60) / 260);
    ctx.strokeStyle = v > 0.6 ? col(L.hi, 0.06 + lit * 0.32) : 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  // hairline softness
  ctx.save(); ctx.filter = 'blur(3px)'; ctx.strokeStyle = 'rgba(10,9,9,0.45)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-146, -72); ctx.bezierCurveTo(-144, -110, -138, -150, -118, -170); ctx.bezierCurveTo(-90, -178, -60, -188, -30, -186); ctx.bezierCurveTo(-10, -184, 10, -184, 30, -186); ctx.bezierCurveTo(60, -188, 90, -178, 118, -170); ctx.bezierCurveTo(138, -150, 144, -110, 146, -72); ctx.stroke(); ctx.restore();

  // sweat beads
  const sw = o.sweat || 0;
  if (sw > 0) {
    const rr = mulberry32(77);
    for (let i = 0; i < 18; i++) {
      const sx = -120 + rr() * 240, sy = -165 + rr() * 60 + (i % 3) * 80 * rr() + (t * 6 * rr()) % 30, s = 2 + rr() * 3;
      ctx.fillStyle = `rgba(20,24,30,${0.35 * sw})`; ctx.beginPath(); ctx.ellipse(sx, sy + 1, s, s * 1.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(230,240,255,${0.7 * sw})`; ctx.beginPath(); ctx.arc(sx + s * 0.3, sy - s * 0.3, s * 0.4, 0, TAU); ctx.fill();
    }
  }
  // fine ink contour (hand-drawn feel, slight line boil)
  const b = Math.floor(t * 12);
  ctx.save(); ctx.translate(n1(b * 1.3, 8) * 0.6, n1(b * 1.7, 9) * 0.6);
  ctx.strokeStyle = 'rgba(6,6,8,0.55)'; ctx.lineWidth = 2.2; headPath(ctx); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------- lying profile (wide shot) ----------
// drawn upright facing right, rotated so the face points up and the crown points left
function drawManProfileLying(ctx, x, y, s, o = {}) {
  const L = LIGHTS[o.light || 'moon'];
  ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); ctx.scale(s, s);
  // head silhouette (upright, facing right)
  const prof = () => {
    ctx.beginPath(); ctx.moveTo(-10, -118);
    ctx.bezierCurveTo(40, -122, 66, -90, 70, -50);      // forehead
    ctx.bezierCurveTo(72, -36, 76, -30, 74, -22);        // brow
    ctx.bezierCurveTo(80, -6, 92, 8, 94, 18);            // nose
    ctx.bezierCurveTo(90, 24, 80, 24, 74, 26);           // under nose
    ctx.bezierCurveTo(78, 34, 78, 40, 74, 46);           // lips
    ctx.bezierCurveTo(78, 52, 76, 60, 70, 70);           // chin
    ctx.bezierCurveTo(60, 84, 40, 90, 22, 92);           // jaw
    ctx.lineTo(20, 140); ctx.lineTo(-50, 140);
    ctx.bezierCurveTo(-60, 80, -100, 60, -104, 0);       // back of the head
    ctx.bezierCurveTo(-108, -70, -70, -116, -10, -118);
    ctx.closePath();
  };
  prof(); ctx.fillStyle = col(L.base); ctx.fill();
  ctx.save(); prof(); ctx.clip();
  // light from above-right in screen space = from +x (face side) in local space
  ctx.fillStyle = linGrad(ctx, 90, 0, -100, 0, [[0, col(L.hi, 0.25)], [0.45, col(L.sh, 0)], [1, col(L.sh, 0.85)]]); ctx.fillRect(-120, -130, 240, 280);
  // beard along the jaw
  ctx.fillStyle = 'rgba(8,8,10,0.45)'; ctx.beginPath(); ctx.moveTo(-30, 40); ctx.bezierCurveTo(20, 30, 60, 50, 76, 58); ctx.bezierCurveTo(70, 80, 40, 94, 10, 96); ctx.lineTo(-40, 90); ctx.fill();
  ctx.fillStyle = 'rgba(8,8,10,0.35)'; ctx.beginPath(); ctx.ellipse(66, 28, 10, 4, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
  // hair
  ctx.fillStyle = '#0b0a0b'; ctx.beginPath(); ctx.moveTo(56, -84); ctx.bezierCurveTo(30, -126, -60, -128, -96, -60); ctx.bezierCurveTo(-110, -10, -100, 30, -80, 50); ctx.bezierCurveTo(-60, 10, -40, -20, -20, -40); ctx.bezierCurveTo(0, -70, 30, -80, 56, -84); ctx.fill();
  // ear
  ctx.fillStyle = col(mix(L.base, L.sh, 0.4)); ctx.beginPath(); ctx.ellipse(-22, 6, 13, 20, 0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = col(L.sh, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-22, 6, 9, -1.2, 1.6); ctx.stroke();
  // eye (closed or open)
  const op = o.open ?? 0;
  ctx.strokeStyle = 'rgba(8,8,10,0.85)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(44, -18); ctx.quadraticCurveTo(54, -12 - op * 6, 62, -16); ctx.stroke();
  if (op > 0.2) { ctx.fillStyle = 'rgba(220,226,232,0.8)'; ctx.beginPath(); ctx.ellipse(56, -16, 4, 2.5 * op, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#100a06'; ctx.beginPath(); ctx.arc(58, -16, 2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(8,8,10,0.8)'; ctx.fillRect(40, -34, 26, 4);
  ctx.strokeStyle = 'rgba(6,6,8,0.6)'; ctx.lineWidth = 1.5; prof(); ctx.stroke();
  ctx.restore();
}

// blanket over the body in the wide side view; breath: 0..1 phase amplitude
function drawBlanketWide(ctx, t, o = {}) {
  const br = Math.sin(t * TAU / (o.breathPeriod || 4.2)) * (o.breathAmp ?? 5), press = o.press || 0;
  const top = RW.mattressTop;
  const pts = [[372, top - 30], [420, top - 78 - br], [480, top - 92 - br - press * -40], [560, top - 70], [640, top - 64], [720, top - 82], [790, top - 66], [860, top - 72], [902, top - 50]];
  const shape = () => {
    ctx.beginPath(); ctx.moveTo(360, top + 4);
    spline(ctx, pts, false, 0.5, false);
    ctx.lineTo(916, top + 10); ctx.lineTo(924, RW.rail[1] + 46); ctx.bezierCurveTo(700, RW.rail[1] + 60, 400, RW.rail[1] + 54, 340, RW.rail[1] + 40); ctx.closePath();
  };
  ctx.save(); shape(); ctx.clip();
  ctx.drawImage(ROOM.blanket, 300, top - 140, 330, 180); ctx.drawImage(ROOM.blanket, 630, top - 140, 330, 180);
  ctx.drawImage(ROOM.blanket, 300, top + 40, 330, 180); ctx.drawImage(ROOM.blanket, 630, top + 40, 330, 180);
  ctx.fillStyle = o.light === 'morning' ? 'rgba(30,30,40,0.25)' : 'rgba(8,14,28,0.72)'; ctx.fillRect(300, top - 140, 660, 360);
  // top surface lit, front face darker; folds
  ctx.fillStyle = linGrad(ctx, 0, top - 100, 0, RW.rail[1] + 60, [[0, 'rgba(160,185,220,0.18)'], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.65)']]);
  ctx.fillRect(300, top - 140, 660, 360);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 4;
  for (const [x0, x1] of [[470, 430], [600, 560], [700, 690], [830, 800]]) { ctx.beginPath(); ctx.moveTo(x0, top - 50); ctx.quadraticCurveTo(x0 - 10, top + 40, x1, RW.rail[1] + 50); ctx.stroke(); }
  ctx.restore();
  // fringe
  ctx.strokeStyle = 'rgba(150,130,110,0.45)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) { const xx = 345 + i * 8.4, yy = RW.rail[1] + 42 + Math.sin(i * 0.5) * 3 + (xx > 600 ? 8 : 0); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + Math.sin(t + i) * 1.5, yy + 14); ctx.stroke(); }
  // pillow
  ctx.fillStyle = o.light === 'morning' ? '#c9c4bb' : '#4b5466';
  ctx.beginPath(); ctx.ellipse(300, top - 26, 100, 34, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(300, top - 12, 96, 18, -0.05, 0, Math.PI); ctx.fill();
}

// ---------- hand (close-up from above, on the blanket) ----------
// fingers: array of 5 curl values 0..1 ; spread
function drawHand(ctx, o = {}) {
  const L = LIGHTS[o.light || 'moon'], curl = o.curl || [0.2, 0.25, 0.25, 0.3, 0.3], tr = o.tremble || 0, t = o.t || 0;
  ctx.save();
  // forearm + shirt sleeve
  ctx.fillStyle = col(mix(L.shirt, L.sh, 0.35), 1); ctx.beginPath(); ctx.moveTo(-250, 520); ctx.bezierCurveTo(-200, 300, -150, 230, -110, 200); ctx.lineTo(110, 230); ctx.bezierCurveTo(120, 300, 140, 400, 160, 520); ctx.closePath(); ctx.fill();
  ctx.fillStyle = linGrad(ctx, -250, 0, 160, 0, [[0, col(L.sh, 0.75)], [1, col(L.hi, 0.1)]]); ctx.fill();
  ctx.strokeStyle = col(L.sh, 0.5); ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-180 + k * 50, 520); ctx.quadraticCurveTo(-140 + k * 40, 330, -90 + k * 40, 225); ctx.stroke(); }
  // palm/back of hand
  const back = () => { ctx.beginPath(); ctx.moveTo(-105, 200); ctx.bezierCurveTo(-130, 120, -128, 30, -110, -30); ctx.bezierCurveTo(-60, -60, 40, -66, 98, -34); ctx.bezierCurveTo(118, 40, 116, 140, 100, 210); ctx.closePath(); };
  back(); ctx.fillStyle = col(L.base); ctx.fill();
  ctx.save(); back(); ctx.clip();
  ctx.fillStyle = linGrad(ctx, 120, -60, -120, 200, [[0, col(L.hi, 0.25)], [0.5, col(L.sh, 0.05)], [1, col(L.sh, 0.7)]]); ctx.fillRect(-140, -80, 280, 300);
  // tendons + veins
  ctx.strokeStyle = col(L.hi, 0.18); ctx.lineWidth = 6;
  for (let k = 0; k < 4; k++) { const fx = -66 + k * 44; ctx.beginPath(); ctx.moveTo(fx, -40); ctx.quadraticCurveTo(fx * 0.6, 80, fx * 0.3, 200); ctx.stroke(); }
  ctx.strokeStyle = col(L.sh, 0.35); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-60, 200); ctx.bezierCurveTo(-40, 120, -70, 60, -40, 0); ctx.moveTo(-40, 90); ctx.quadraticCurveTo(0, 60, 30, 20); ctx.stroke();
  ctx.restore();
  // fingers
  const bases = [[-92, -34, -0.32], [-44, -56, -0.1], [6, -60, 0.02], [52, -50, 0.14], [92, -26, 0.3]];
  const lens = [[84, 52, 42], [92, 56, 44], [86, 52, 40], [70, 44, 34], [0, 0, 0]];
  for (let f = 0; f < 4; f++) {
    const [bx, by, ba] = bases[f]; let x = bx, y = by, a = -Math.PI / 2 + ba;
    const c = clamp(curl[f] + tr * n1(t * 14 + f * 3, f) * 0.15);
    const pts = [[x, y]];
    for (let s = 0; s < 3; s++) { a += c * 0.75; const l = lens[f][s] * (1 - c * 0.35); x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
    // finger body
    for (let s = 0; s < 3; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1], w0 = 28 - s * 3.5, w1 = 25 - s * 3.5;
      const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      ctx.fillStyle = col(mix(L.base, L.sh, 0.1 + s * 0.12 + c * 0.3));
      ctx.beginPath(); ctx.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); ctx.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x1, y1, w1 / 2, 0, TAU); ctx.fill();
      // knuckle wrinkles
      ctx.strokeStyle = col(L.sh, 0.5); ctx.lineWidth = 1.5;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x0 + nx * 8 + dx / d * k * 3, y0 + ny * 8 + dy / d * k * 3); ctx.lineTo(x0 - nx * 8 + dx / d * k * 3, y0 - ny * 8 + dy / d * k * 3); ctx.stroke(); }
      ctx.strokeStyle = col(L.hi, 0.2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + nx * w0 * 0.3, y0 + ny * w0 * 0.3); ctx.lineTo(x1 + nx * w1 * 0.3, y1 + ny * w1 * 0.3); ctx.stroke();
    }
    // fingernail
    const [x2, y2] = pts[2], [x3, y3] = pts[3], na = Math.atan2(y3 - y2, x3 - x2);
    ctx.save(); ctx.translate(x3 - Math.cos(na) * 10, y3 - Math.sin(na) * 10); ctx.rotate(na);
    ctx.fillStyle = col(mix(L.hi, L.base, 0.4), 0.9); ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = col(L.sh, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  // thumb
  ctx.fillStyle = col(mix(L.base, L.sh, 0.3)); ctx.beginPath(); ctx.moveTo(-110, 60); ctx.bezierCurveTo(-170, 30, -190, -10, -186, -40); ctx.bezierCurveTo(-176, -56, -156, -50, -150, -30); ctx.bezierCurveTo(-140, 0, -120, 10, -100, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(6,6,8,0.5)'; ctx.lineWidth = 1.8; back(); ctx.stroke();
  ctx.restore();
}

// ---------- back view (walking to the mirror) ----------
function drawManBack(ctx, o = {}) {
  const L = LIGHTS[o.light || 'morning'];
  ctx.save();
  // shoulders + shirt
  ctx.fillStyle = col(L.shirt);
  ctx.beginPath(); ctx.moveTo(-330, 700); ctx.bezierCurveTo(-320, 420, -250, 330, -110, 300); ctx.lineTo(110, 300); ctx.bezierCurveTo(250, 330, 320, 420, 330, 700); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = linGrad(ctx, -330, 0, 330, 0, [[0, col(L.sh, 0.55)], [0.5, col(L.sh, 0.1)], [1, col(L.hi, 0.12)]]); ctx.fillRect(-340, 280, 680, 430);
  ctx.strokeStyle = col(L.sh, 0.35); ctx.lineWidth = 4;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-200 + k * 70, 330 + (k % 2) * 20); ctx.quadraticCurveTo(-180 + k * 70 + (o.sway || 0) * 20, 520, -210 + k * 75, 700); ctx.stroke(); }
  ctx.fillStyle = 'rgba(40,40,50,0.18)'; ctx.beginPath(); ctx.ellipse(0, 520, 140, 260, 0, 0, TAU); ctx.fill();     // sweat patch
  ctx.restore();
  // neck
  ctx.fillStyle = col(mix(L.base, L.sh, 0.35)); ctx.beginPath(); ctx.moveTo(-74, 120); ctx.bezierCurveTo(-80, 220, -90, 280, -110, 304); ctx.lineTo(110, 304); ctx.bezierCurveTo(90, 280, 80, 220, 74, 120); ctx.fill();
  ctx.fillStyle = linGrad(ctx, 0, 140, 0, 300, [[0, col(L.sh, 0.5)], [1, col(L.sh, 0.1)]]); ctx.fill();
  // ears from behind
  for (const s of [-1, 1]) { ctx.fillStyle = col(mix(L.base, L.sh, 0.25)); ctx.beginPath(); ctx.ellipse(s * 152, -20, 18, 40, s * -0.2, 0, TAU); ctx.fill(); }
  // back of the head: short black hair, neck hairline
  ctx.fillStyle = '#0b0a0b';
  ctx.beginPath(); ctx.moveTo(-150, -20); ctx.bezierCurveTo(-160, -160, -90, -240, 0, -240); ctx.bezierCurveTo(90, -240, 160, -160, 150, -20);
  ctx.bezierCurveTo(140, 60, 100, 110, 60, 128); ctx.lineTo(-60, 128); ctx.bezierCurveTo(-100, 110, -140, 60, -150, -20); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
  const r = mulberry32(31);
  for (let i = 0; i < 900; i++) { const px = (r() - 0.5) * 310, py = -240 + r() * 370, l = 6 + r() * 9; ctx.strokeStyle = r() > 0.6 ? col(L.hi, 0.12 + r() * 0.18) : 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * 4, py + l); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(10,9,9,0.5)'; for (let i = 0; i < 60; i++) { const px = -56 + i * 1.9, py = 126 + hash2(i, 2, 2) * 8; ctx.fillRect(px, py, 1.5, 4); }
  ctx.restore();
}
