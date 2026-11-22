// YALMAVUZ: ~3 m, gaunt humanoid with SEVEN heads on long necks rising from the shoulders.
// Pale wrinkled skin, long arms and nails, every head a different face with long, matted black hair. Heads move independently.
'use strict';
const YM = {
  skin: [176, 172, 158], sh: [36, 34, 32], hi: [228, 226, 214], eye: [226, 232, 226], hair: [8, 8, 10],
  // per head: root x on the shoulders, raised head offset from the shoulder centre (m), face type, hair length (face units), tilt bias
  heads: [
    { rx: -0.34, to: [-0.66, -0.36], type: 2, hl: 330, tb: -0.35 },
    { rx: -0.22, to: [-0.42, -0.7], type: 1, hl: 300, tb: 0.15 },
    { rx: -0.1, to: [-0.2, -0.46], type: 3, hl: 380, tb: -0.12 },
    { rx: 0.0, to: [0.03, -0.8], type: 0, hl: 440, tb: 0.06 },
    { rx: 0.11, to: [0.26, -0.56], type: 5, hl: 360, tb: 0.22 },
    { rx: 0.23, to: [0.46, -0.76], type: 6, hl: 340, tb: -0.18 },
    { rx: 0.35, to: [0.68, -0.34], type: 4, hl: 320, tb: 0.34 },
  ],
};
let YBUF = null, YX = null;
function buildYalmavuz() {
  YBUF = makeCanvas(W, H); YX = YBUF.getContext('2d');
  Object.assign(CR, { skin: [150, 146, 134], sh: [30, 28, 26], hi: [222, 220, 208], nail: [14, 12, 10] });
  YM.tex = noiseCanvas(256, 256, 10, 5, 717, (v, i, j) => {
    const wr = Math.abs(Math.sin(j * 0.22 + fbm(i / 30, j / 30, 3, 4) * 9)) < 0.08 ? 50 : 0;   // wrinkle lines
    const vein = Math.abs(fbm(i / 50, j / 50, 4, 19) - 0.5) < 0.01 ? 40 : 0;
    const g = 165 + (v - 0.5) * 110 - wr - vein;
    return [g, g * 0.98, g * 0.93, 255];
  });
  const r = mulberry32(707);
  CR.skinTex = YM.tex;
  YM.hairS = YM.heads.map(() => Array.from({ length: 46 }, (_, i) => ({ a: Math.PI * (i / 45), lf: 0.55 + r() * 0.55, w: 1.5 + r() * 3.2, sd: r() * 100, front: r() < 0.16, kink: r() })));
}

// ---------- one head (face units: chin at 0,0, crown at -168, half-width ~48) ----------
// o: {yaw (-1.5..1.5), eyes 0..1, mouth 0..1 (speech), light:[lx,ly] (-1..1), t, dark, hair (0..1), seed, glow:[] (collects eye points)}
function yHeadShape(P, type) {
  const sx = type === 1 ? 1.12 : type === 0 ? 0.94 : type === 3 ? 0.98 : 1, sy = type === 1 ? 0.86 : type === 3 ? 1.12 : 1;
  crHeadPath(P, 1);
  return [sx, sy];
}
function drawYHead(g, type, o = {}) {
  const t = o.t || 0, yaw = o.yaw || 0, cy = Math.cos(yaw), sy = Math.sin(yaw), seed = o.seed || type;
  const ea = o.eyes ?? 1, mo = o.mouth || 0, light = o.light || [0.6, -0.4];
  const fx = (x, d = 0) => x * cy + sy * (34 + d);                     // fake 3-D turn: features slide around the skull
  const vis = clamp(1.6 - Math.abs(yaw) * 1.1);                        // how much of the face is visible
  const hairK = o.hair ?? 1, hl = (YM.heads.find((h) => h.type === type) || { hl: 400 }).hl * (o.hairLen || 1);
  const strands = YM.hairS[YM.heads.findIndex((h) => h.type === type)] || YM.hairS[0];
  const swayX = (k, s2) => n1(t * 0.5 + s2, 3) * 18 * k + n1(t * 1.3 + s2, 5) * 6 * k;
  g.save();
  const sxy = type === 1 ? [1.14, 0.86] : type === 0 ? [0.93, 1.02] : type === 3 ? [0.98, 1.1] : type === 2 ? [1.02, 0.98] : [1, 1];
  g.scale(sxy[0], sxy[1]);
  // hair behind the head: a matted mass
  if (hairK > 0) {
    g.fillStyle = col(YM.hair, 0.97 * hairK);
    g.beginPath(); g.moveTo(-50, -120);
    g.bezierCurveTo(-60, -200, 60, -200, 50, -120);
    g.bezierCurveTo(64 + swayX(1, seed), 20, 58 + swayX(1.3, seed + 1), hl * 0.6, 34 + swayX(2, seed + 2), hl);
    for (let k = 0; k <= 8; k++) g.lineTo(40 - k * 10 + swayX(2, seed + k), hl - (k % 2) * 40 - hash2(k, seed, 1) * 50);
    g.bezierCurveTo(-58 + swayX(1.3, seed + 4), hl * 0.6, -64 + swayX(1, seed + 5), 20, -50, -120);
    g.fill();
  }
  // skull
  const P = new Path2D(); crHeadPath(P, 1);
  g.fillStyle = col(YM.skin); g.fill(P);
  g.save(); g.clip(P);
  g.globalCompositeOperation = 'multiply'; g.drawImage(YM.tex, -70 + yaw * 20, -180, 140, 200); g.globalCompositeOperation = 'source-over';
  // form shading from the light direction
  const lx = light[0], ly = light[1];
  g.fillStyle = linGrad(g, lx * 70, -84 + ly * 90, -lx * 70, -84 - ly * 90, [[0, col(YM.hi, 0.35)], [0.4, col(YM.sh, 0.05)], [0.75, col(YM.sh, 0.6)], [1, col(YM.sh, 0.92)]]);
  g.fillRect(-80, -190, 160, 200);
  // turned away: the far side darkens and the face slides off
  if (Math.abs(yaw) > 0.05) { g.fillStyle = linGrad(g, -sy * 60, 0, sy * 60, 0, [[0, 'rgba(0,0,0,0.75)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(-80, -190, 160, 200); }
  if (vis > 0) {
    g.globalAlpha = vis;
    // sockets, cheek hollows, temples
    const sockR = type === 1 ? 17 : type === 5 ? 15 : 13;
    for (const ex of [-1, 1]) {
      radialEllipse(g, fx(ex * 21), -86, sockR + 6, sockR + 2, [[0, col(YM.sh, 0.95)], [0.55, col(YM.sh, 0.7)], [1, col(YM.sh, 0)]]);
      radialEllipse(g, fx(ex * 30), -46, 12, 22, [[0, col(YM.sh, 0.55)], [1, col(YM.sh, 0)]]);
      radialEllipse(g, fx(ex * 42, -10), -114, 10, 20, [[0, col(YM.sh, 0.4)], [1, col(YM.sh, 0)]]);
    }
    // wrinkles: forehead, crow's feet, nasolabial
    g.strokeStyle = col(YM.sh, type === 2 || type === 0 ? 0.6 : 0.35); g.lineWidth = 1.3; g.lineCap = 'round';
    for (let k = 0; k < (type === 2 ? 6 : 3); k++) { g.beginPath(); g.moveTo(fx(-32), -124 - k * 7); g.quadraticCurveTo(fx(0), -130 - k * 8 + (k % 2) * 3, fx(32), -124 - k * 7); g.stroke(); }
    for (const ex of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(fx(ex * 34), -90 + k * 5); g.lineTo(fx(ex * 44), -94 + k * 9); g.stroke(); }
    g.lineWidth = 2; for (const ex of [-1, 1]) { g.beginPath(); g.moveTo(fx(ex * 10), -54); g.quadraticCurveTo(fx(ex * 26), -38, fx(ex * 25), -20); g.stroke(); }
    // nose
    g.fillStyle = col(YM.sh, 0.9); g.beginPath(); g.ellipse(fx(-5), -57, 2.4, 4, 0.3, 0, TAU); g.ellipse(fx(5), -57, 2.4, 4, -0.3, 0, TAU); g.fill();
    g.strokeStyle = col(YM.hi, 0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(fx(1), -96); g.lineTo(fx(2), -64); g.stroke();
    // mouth by type
    g.fillStyle = '#050405'; g.strokeStyle = col(YM.sh, 0.9); g.lineWidth = 1.5;
    if (type === 0) {                  // the mother: thin, sorrowful lips that move when she speaks
      const m = mo * (0.5 + 0.5 * Math.abs(Math.sin(t * 17)));
      g.fillStyle = col([110, 84, 84]); g.beginPath(); g.moveTo(fx(-15), -30); g.quadraticCurveTo(fx(0), -34 + m * 2, fx(15), -30); g.quadraticCurveTo(fx(0), -26 + m * 12, fx(-15), -30); g.fill();
      g.fillStyle = '#060405'; g.beginPath(); g.ellipse(fx(0), -30 + m * 4, 11, 0.6 + m * 6, 0, 0, TAU); g.fill();
      g.strokeStyle = col(YM.sh, 0.7); g.beginPath(); g.moveTo(fx(-17), -29); g.lineTo(fx(-21), -24); g.moveTo(fx(17), -29); g.lineTo(fx(21), -24); g.stroke();
    } else if (type === 1) {           // child: a small round open mouth
      g.beginPath(); g.ellipse(fx(0), -32, 6 + mo * 3, 7 + mo * 5, 0, 0, TAU); g.fill();
    } else if (type === 2) {           // old man: sunken toothless mouth, wisps of beard
      g.beginPath(); g.moveTo(fx(-18), -30); g.quadraticCurveTo(fx(0), -24 - mo * 4, fx(18), -30); g.quadraticCurveTo(fx(0), -20 + mo * 8, fx(-18), -30); g.fill();
      g.strokeStyle = 'rgba(190,188,180,0.55)'; g.lineWidth = 1;
      for (let k = 0; k < 18; k++) { const x0 = fx(-22 + k * 2.6); g.beginPath(); g.moveTo(x0, -18); g.quadraticCurveTo(x0 + n1(t + k, 7) * 4, 10, x0 + n1(t * 0.7 + k, 8) * 8, 40 + hash2(k, 2, 2) * 30); g.stroke(); }
    } else if (type === 3) {           // unhinged jaw: a long black hole
      const j = 0.7 + mo * 0.3 + Math.sin(t * 0.9 + seed) * 0.05;
      g.beginPath(); g.ellipse(fx(0), -22 + 10 * j, 15, 22 * j, 0, 0, TAU); g.fill();
      g.strokeStyle = col(YM.sh, 0.8); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(fx(k * 6), -40); g.lineTo(fx(k * 6), -44); g.stroke(); }
    } else if (type === 4) {           // lips sewn shut
      g.strokeStyle = '#0a0808'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx(-20), -30); g.quadraticCurveTo(fx(0), -27, fx(20), -30); g.stroke();
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(30,24,20,0.95)'; for (let k = 0; k < 8; k++) { const x0 = fx(-17 + k * 4.8); g.beginPath(); g.moveTo(x0 - 1, -36); g.lineTo(x0 + 1, -23); g.stroke(); }
    } else if (type === 5) {           // ear-to-ear grin full of teeth
      g.beginPath(); g.moveTo(fx(-34), -44); g.quadraticCurveTo(fx(0), -14 + mo * 6, fx(34), -44); g.quadraticCurveTo(fx(0), -30, fx(-34), -44); g.fill();
      g.fillStyle = 'rgba(214,206,180,0.9)'; for (let k = 0; k < 16; k++) { const u = k / 15, x0 = fx(-30 + u * 60), y0 = -40 + Math.sin(u * Math.PI) * 10; g.beginPath(); g.moveTo(x0 - 1.8, y0); g.lineTo(x0 + 1.8, y0); g.lineTo(x0, y0 + 5 + Math.sin(u * Math.PI) * 3); g.fill(); }
    } else {                           // weeping: black tears and a downturned mouth
      g.beginPath(); g.moveTo(fx(-18), -26); g.quadraticCurveTo(fx(0), -36, fx(18), -26); g.quadraticCurveTo(fx(0), -31, fx(-18), -26); g.fill();
      g.strokeStyle = 'rgba(6,5,6,0.85)'; g.lineWidth = 3; for (const ex of [-1, 1]) { g.beginPath(); g.moveTo(fx(ex * 21), -80); g.bezierCurveTo(fx(ex * 23), -60, fx(ex * 19), -40, fx(ex * 22), -6); g.stroke(); }
    }
    g.globalAlpha = 1;
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.2; g.stroke(P);
  // pale eyes, deep in the sockets
  if (vis > 0.05 && ea > 0) {
    const er = type === 1 ? [7.5, 6] : type === 5 ? [7, 5] : [6, 3.6];
    for (const ex of [-1, 1]) {
      const cx = fx(ex * 21) + (o.look ? o.look[0] * 2 : 0), cy2 = -86 + (o.look ? o.look[1] * 2 : 0);
      g.fillStyle = col(YM.eye, 0.95 * ea * vis); g.beginPath(); g.ellipse(cx, cy2, er[0] * Math.max(0.3, cy), er[1], 0, 0, TAU); g.fill();
      g.fillStyle = `rgba(150,160,150,${0.5 * ea * vis})`; g.beginPath(); g.arc(cx, cy2, er[1] * 0.6, 0, TAU); g.fill();
      g.fillStyle = `rgba(0,0,0,${0.95 * ea * vis})`; g.beginPath(); g.arc(cx, cy2, 1.1, 0, TAU); g.fill();
      g.fillStyle = `rgba(0,0,0,${0.55 * vis})`; g.beginPath(); g.ellipse(cx, cy2 - er[1] * 0.8, er[0] * 1.1, 2, 0, 0, TAU); g.fill();
      if (o.glow) { const m = g.getTransform(), p = m.transformPoint(new DOMPoint(cx, cy2)); o.glow.push([p.x, p.y, Math.hypot(m.a, m.b) * 14, ea * vis]); }
    }
  }
  // scalp: matted hair over the crown with a ragged centre parting
  if (hairK > 0) {
    const px = sy * 26;
    g.fillStyle = col(YM.hair, hairK);
    g.beginPath(); g.moveTo(-49, -96);
    g.bezierCurveTo(-56, -150, -30, -176, px, -172); g.bezierCurveTo(30, -176, 56, -150, 49, -96);
    g.bezierCurveTo(46, -112, 36, -124, 26 + px * 0.3, -134); g.quadraticCurveTo(px + 6, -150, px, -158 + Math.abs(sy) * 20); g.quadraticCurveTo(px - 6, -150, -26 + px * 0.3, -134);
    g.bezierCurveTo(-36, -124, -46, -112, -49, -96); g.fill();
  }
  // strands in front: fall from the crown, parting around the face
  if (hairK > 0) {
    g.lineCap = 'round';
    for (const s of strands) {
      const ca = Math.cos(s.a), side = ca < 0 ? -1 : 1;
      const rx = ca * 46, ry = -96 - Math.sin(s.a) * 70;
      const cover = s.front ? clamp(0.25 + Math.abs(yaw) * 0.6) : 0;
      const part = side * (24 + 18 * (1 - Math.abs(ca))) * (1 - cover * 0.8) + sy * 40 * (1 - Math.abs(ca));
      const L = hl * s.lf, k = s.sd;
      const x1 = rx + part * 0.8 + swayX(0.5, k), x2 = rx * 1.15 + part + swayX(1.2, k + 1), x3 = rx * 1.3 + part * 0.9 + swayX(2.2, k + 2);
      g.strokeStyle = s.kink > 0.85 ? 'rgba(52,56,64,0.6)' : col(YM.hair, 0.92 * hairK);
      g.lineWidth = s.w; g.beginPath(); g.moveTo(rx, ry);
      g.bezierCurveTo(x1, ry + 40, x2, ry + L * 0.45, x3, ry + L);
      g.stroke();
    }
  }
  g.restore();
}

// ---------- body ----------
// pose o: {step (phase, walking), lean, crouch, armL, armR (hand targets, metres), heads:[{k (raise 0..1), yaw, eyes, mouth, look}], t}
function yPose(o = {}) {
  const t = o.t || 0, lean = o.lean ?? 0.18, ph = o.step ?? 0, walk = o.walking ? 1 : 0;
  const J = {};
  const bob = walk * Math.abs(Math.sin(ph)) * 0.05;
  J.hip = [0, -1.5 + bob + (o.crouch || 0) * 0.5];
  J.sh = [Math.sin(lean) * 1.0, J.hip[1] - Math.cos(lean) * 1.0];
  J.chest = lerp2(J.hip, J.sh, 0.62);
  const S = 0.5 * walk;
  for (const sd of [-1, 1]) {
    const u = sd * Math.sin(ph) * S;
    const foot = [sd * 0.22 + u * 0.2, -0.05 - Math.max(0, Math.cos(ph) * sd) * 0.18 * walk];
    const [kn, an] = ik([J.hip[0] + sd * 0.15, J.hip[1]], foot, 0.8, 0.76, sd > 0 ? -1 : 1);
    J['kn' + (sd < 0 ? 'L' : 'R')] = kn; J['an' + (sd < 0 ? 'L' : 'R')] = an; J['hp' + (sd < 0 ? 'L' : 'R')] = [J.hip[0] + sd * 0.15, J.hip[1]];
  }
  J.shL = [J.sh[0] - 0.46, J.sh[1] + 0.08]; J.shR = [J.sh[0] + 0.46, J.sh[1] + 0.06];
  const tw = (s) => n1(t * 1.1, s) * 0.04;
  const hl = o.armL || [J.shL[0] - 0.22 + tw(1), -0.72 + tw(2)], hr = o.armR || [J.shR[0] + 0.24 + tw(3), -0.7 + tw(4)];
  [J.elL, J.haL] = ik(J.shL, hl, 0.78, 0.74, 1); [J.elR, J.haR] = ik(J.shR, hr, 0.78, 0.74, -1);
  return J;
}

function drawYalmavuzBody(g, J, o = {}) {
  const t = o.t || 0;
  const P = new Path2D();
  // legs
  for (const sd of ['L', 'R']) { limb(P, J['hp' + sd], J['kn' + sd], 0.17, 0.1); limb(P, J['kn' + sd], J['an' + sd], 0.11, 0.07); P.moveTo(J['kn' + sd][0] + 0.07, J['kn' + sd][1]); P.arc(J['kn' + sd][0], J['kn' + sd][1], 0.07, 0, TAU); }
  // feet: long bony toes
  for (const sd of ['L', 'R']) { const a = J['an' + sd], s2 = sd === 'L' ? -1 : 1; limb(P, a, [a[0] + s2 * 0.05, a[1] + 0.05], 0.08, 0.1); for (let k = 0; k < 4; k++) limb(P, [a[0] + s2 * 0.04 + (k - 1.5) * 0.03, a[1] + 0.05], [a[0] + s2 * 0.08 + (k - 1.5) * 0.05, a[1] + 0.09], 0.03, 0.02); }
  // torso: narrow hips, cage of ribs, hunched wide shoulders
  P.moveTo(J.hip[0] - 0.17, J.hip[1] + 0.05);
  P.bezierCurveTo(J.hip[0] - 0.1, J.hip[1] - 0.3, J.chest[0] - 0.34, J.chest[1] + 0.05, J.shL[0] + 0.02, J.shL[1] - 0.02);
  P.bezierCurveTo(J.shL[0] + 0.15, J.sh[1] - 0.14, J.shR[0] - 0.15, J.sh[1] - 0.14, J.shR[0] - 0.02, J.shR[1] - 0.02);
  P.bezierCurveTo(J.chest[0] + 0.34, J.chest[1] + 0.05, J.hip[0] + 0.1, J.hip[1] - 0.3, J.hip[0] + 0.17, J.hip[1] + 0.05);
  P.closePath();
  // arms
  for (const sd of ['L', 'R']) { limb(P, J['sh' + sd], J['el' + sd], 0.12, 0.08); limb(P, J['el' + sd], J['ha' + sd], 0.08, 0.06); P.moveTo(J['el' + sd][0] + 0.05, J['el' + sd][1]); P.arc(J['el' + sd][0], J['el' + sd][1], 0.05, 0, TAU); }
  // hands: long fingers hanging down
  const tips = [];
  for (const sd of ['L', 'R']) {
    const w = J['ha' + sd], e = J['el' + sd], ang = Math.atan2(w[1] - e[1], w[0] - e[0]);
    const tt = handPath(P, w, ang, 0.0018, (o.curl ?? 0.25), t, sd === 'L' ? 3 : 8);
    tips.push(...tt);
  }
  g.fillStyle = col(YM.skin); g.fill(P);
  g.save(); g.clip(P);
  g.globalCompositeOperation = 'multiply'; g.drawImage(YM.tex, -1.2, -3.1, 2.4, 3.2); g.globalCompositeOperation = 'source-over';
  const lx = (o.light || [0.5, -0.3])[0];
  g.fillStyle = linGrad(g, lx * 0.9, 0, -lx * 0.9, 0, [[0, col(YM.hi, 0.25)], [0.45, col(YM.sh, 0.2)], [1, col(YM.sh, 0.9)]]); g.fillRect(-2, -3.5, 4, 3.6);
  // ribs, sternum, collarbones, knee knobs
  g.strokeStyle = col(YM.sh, 0.4); g.lineWidth = 0.02; g.filter = 'blur(1px)';
  for (let i = 0; i < 7; i++) { const c = lerp2(J.sh, J.hip, 0.16 + i * 0.07), w2 = 0.24 - i * 0.016 + (i > 4 ? -0.03 : 0); g.beginPath(); g.moveTo(c[0] - w2, c[1] + 0.03); g.quadraticCurveTo(c[0], c[1] - 0.05, c[0] + w2, c[1] + 0.03); g.stroke(); }
  g.strokeStyle = col(YM.hi, 0.14); g.lineWidth = 0.012;
  for (let i = 0; i < 7; i++) { const c = lerp2(J.sh, J.hip, 0.15 + i * 0.07), w2 = 0.23 - i * 0.016; g.beginPath(); g.moveTo(c[0] - w2, c[1] + 0.02); g.quadraticCurveTo(c[0], c[1] - 0.06, c[0] + w2, c[1] + 0.02); g.stroke(); }
  g.strokeStyle = col(YM.sh, 0.8); g.lineWidth = 0.02; g.beginPath(); g.moveTo(J.shL[0] + 0.05, J.shL[1] + 0.04); g.quadraticCurveTo(J.sh[0], J.sh[1] + 0.1, J.shR[0] - 0.05, J.shR[1] + 0.04); g.stroke();
  g.filter = 'none';
  radialEllipse(g, J.hip[0], J.hip[1] - 0.2, 0.22, 0.3, [[0, col(YM.sh, 0.7)], [1, col(YM.sh, 0)]]);
  radialEllipse(g, J.sh[0], J.sh[1] + 0.25, 0.5, 0.2, [[0, col(YM.sh, 0.5)], [1, col(YM.sh, 0)]]);
  g.fillStyle = linGrad(g, 0, J.sh[1] - 0.2, 0, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.75)']]); g.fillRect(-2, -3.5, 4, 3.6);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.008; g.stroke(P);
  for (const [x, y, a] of tips) drawNail(g, x, y, a, 0.0026, 0.3);
}

// full creature at screen (x, y = feet) with scale s px/m. o: {heads:[...], t, light, lightPos:[sx,sy], li, amb, silhouette:[r,g,b,a], glow (eye glow strength), fog}
function drawYalmavuz(ctx, x, y, s, o = {}) {
  const t = o.t || 0, J = yPose(o), g = YX;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  const glow = [];
  const roots = YM.heads.map((h, i) => [J.sh[0] + h.rx * 1.15, J.sh[1] + Math.abs(h.rx) * 0.16 + 0.02]);
  const heads = o.heads || [];
  const order = [0, 6, 1, 5, 2, 4, 3];
  const H2 = YM.heads.map((h, i) => {
    const st = heads[i] || {}, k = st.k ?? 1;
    const wx = n1(t * (0.3 + i * 0.06), 50 + i) * 0.08 + n1(t * 2.2, 60 + i) * 0.012 * (st.twitch ?? 1), wy = n1(t * (0.27 + i * 0.05), 90 + i) * 0.05;
    const base = roots[i];
    const up = [J.sh[0] + h.to[0] * 1.15 + wx + (st.dx || 0), J.sh[1] + h.to[1] + wy + (st.dy || 0)];
    const down = [base[0] + h.to[0] * 0.3, base[1] + 0.3];                      // slumped behind the shoulders
    const kk = smooth(clamp(k));
    const tip = [lerp(down[0], up[0], kk), lerp(down[1], up[1], kk)];
    const ang = Math.atan2(tip[0] - base[0], base[1] - tip[1]);
    const bend = (i % 2 ? 1 : -1) * 0.07;
    const mid = [lerp(base[0], tip[0], 0.45) + Math.cos(ang) * bend, lerp(base[1], tip[1], 0.55) + Math.sin(ang) * bend];
    return { i, base, mid, tip, ang, st, h, k };
  });
  // heads that are not up yet hang behind the body
  const drawNeckHead = (q) => {
    const N = new Path2D();
    limb(N, q.base, q.mid, 0.1, 0.07); limb(N, q.mid, q.tip, 0.07, 0.06);
    g.fillStyle = col(YM.skin); g.fill(N);
    g.save(); g.clip(N); g.globalCompositeOperation = 'multiply'; g.drawImage(YM.tex, q.base[0] - 0.3, q.tip[1] - 0.1, 0.6, 0.8); g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(30,28,26,0.35)'; g.fill(N);
    g.strokeStyle = col(YM.sh, 0.7); g.lineWidth = 0.008; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(q.base[0] - 0.02 + k * 0.02, q.base[1]); g.quadraticCurveTo(q.mid[0] + (k - 1) * 0.02, q.mid[1], q.tip[0] + (k - 1) * 0.015, q.tip[1]); g.stroke(); }
    g.restore();
    g.save(); g.translate(q.tip[0], q.tip[1] + 0.02); g.rotate(q.ang * 0.35 + q.h.tb * 0.5 + n1(t * 0.8, 80 + q.i) * 0.14 + (q.st.tilt || 0)); const hs = 0.35 / 168; g.scale(hs, hs);
    drawYHead(g, q.h.type, { t, yaw: q.st.yaw ?? 0, eyes: (q.st.eyes ?? 1) * (o.eyes ?? 1), mouth: q.st.mouth || 0, light: o.light, seed: q.i * 7, glow, look: q.st.look, hairLen: o.hairLen });
    g.restore();
  };
  const back = H2.filter((q) => q.k < 0.5), front = H2.filter((q) => q.k >= 0.5);
  for (const i of order) { const q = back.find((b) => b.i === i); if (q) drawNeckHead(q); }
  drawYalmavuzBody(g, J, o);
  for (const i of order) { const q = front.find((b) => b.i === i); if (q) drawNeckHead(q); }
  g.restore();
  // light on the creature
  const amb = o.amb ?? 0.22;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(4,6,10,${clamp(0.8 - amb)})`; g.fillRect(0, 0, W, H);
  if (o.li > 0 && o.lightPos) {
    const [lx, ly] = o.lightPos, R = (o.lightR || 1.7) * s;
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, R);
    gr.addColorStop(0, `rgba(255,186,120,${0.55 * Math.min(1, o.li)})`); gr.addColorStop(0.4, `rgba(190,120,70,${0.25 * Math.min(1, o.li)})`); gr.addColorStop(1, 'rgba(90,50,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'overlay'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-atop';
  }
  if (o.moonRim) { g.fillStyle = linGrad(g, x - 1.2 * s, 0, x + 1.2 * s, 0, [[0, `rgba(150,176,206,${o.moonRim})`], [0.3, 'rgba(150,176,206,0)'], [1, 'rgba(150,176,206,0)']]); g.fillRect(0, 0, W, H); }
  if (o.silhouette) { g.fillStyle = col(o.silhouette, o.silhouette[3] ?? 0.95); g.fillRect(0, 0, W, H); }
  if (o.fog) { g.fillStyle = col(FOG_COL, o.fog); g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.drawImage(YBUF, 0, 0); ctx.restore();
  // eye glow over the darkness
  const ga = o.glow ?? 0.6;
  if (ga > 0) for (const [ex, ey, r, a] of glow) {
    radial(ctx, ex, ey, r * 2.2, [[0, `rgba(225,235,225,${0.55 * ga * a})`], [0.3, `rgba(190,210,200,${0.18 * ga * a})`], [1, 'rgba(150,170,160,0)']], 'screen');
    ctx.fillStyle = `rgba(236,242,232,${0.9 * ga * a * (o.silhouette ? 1 : 0.4)})`; ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, r * 0.32), 0, TAU); ctx.fill();
  }
  return { glow, J };
}

function yActor(X, Z, o) {
  return {
    x: X, z: Z, bias: o.bias || 0,
    draw: (ctx, cam) => {
      const p = proj(cam, X, 0, Z); if (p[2] < 0.3) return;
      const ff = fogK(p[2], o.fogDist || 26);
      let lightPos = o.lightPos;
      if (o.lantern && o.lantern.I > 0) { const lp = proj(cam, o.lantern.x, o.lantern.y, o.lantern.z); lightPos = [lp[0], lp[1]]; }
      const li = o.lantern ? lanternAt(o.lantern, X, 1.5, Z) * 1.4 : 0;
      drawYalmavuz(ctx, p[0], p[1], p[3], Object.assign({}, o, { fog: (o.fog || 0) + ff * 0.8, lightPos, li: o.li ?? li }));
    },
  };
}
