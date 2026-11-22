// The narrator, full body: ~40, light beard, old brown coat, dark trousers, leather boots, an oil lantern.
// Skeleton in metres (screen-like axes: +x = the way he faces, y down, ground at 0). Side, back and front views.
'use strict';
const FIG = {
  coat: [104, 72, 46], coatDk: [56, 38, 26], trou: [44, 44, 50], boot: [62, 40, 26], skin: [176, 140, 116], hair: [22, 18, 16],
};
let FIGBUF = null, FIGX = null;
function buildFigure() { FIGBUF = makeCanvas(W, H); FIGX = FIGBUF.getContext('2d'); }

function ik(a, b, l1, l2, bend) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const dm = Math.min(d, l1 + l2 - 1e-4); if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; }
  const base = Math.atan2(dy, dx), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1), -1, 1));
  const ang = base + bend * al;
  return [[a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1], [a[0] + dx, a[1] + dy]];
}
const V = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

// gait foot target: u in 0..1 (stance first, then swing)
function footAt(u, S, lift, duty = 0.6) {
  u = ((u % 1) + 1) % 1;
  if (u < duty) return [lerp(S / 2, -S / 2, u / duty), 0];
  const k = (u - duty) / (1 - duty);
  return [lerp(-S / 2, S / 2, smooth(k)), -lift * Math.sin(Math.PI * k)];
}

// pose kinds: stand, walk, run, raise (lantern up), fall (back onto the ground, k), trip (forward, k), prone, getup (k)
function manPose(kind, ph = 0, o = {}) {
  const J = { lean: 0, headAng: 0, lantern: 'hand', look: o.look || 0 };
  let hip = [0, -0.93], fF, fB, S = 0.62, lift = 0.1;
  if (kind === 'walk' || kind === 'run') {
    const run = kind === 'run';
    S = run ? 1.25 : 0.62; lift = run ? 0.32 : 0.1;
    const u = ph / TAU;
    fF = footAt(u, S, lift, run ? 0.42 : 0.6); fB = footAt(u + 0.5, S, lift, run ? 0.42 : 0.6);
    fF[1] -= 0.08; fB[1] -= 0.08;
    hip = [run ? 0.12 : 0, -0.93 + (run ? 0.05 : 0.02) * Math.cos(2 * ph) + (run ? 0.04 : 0)];
    J.lean = run ? 0.32 + 0.04 * Math.sin(2 * ph) : 0.05;
    J.headAng = run ? -0.15 : 0;
  } else {
    fF = [0.1, -0.08]; fB = [-0.08, -0.08];
    hip = [0, -0.93 + (o.breath || 0) * 0.005];
    J.lean = o.lean || 0;
  }
  if (kind === 'fall' || kind === 'trip' || kind === 'prone' || kind === 'getup') return fallPose(kind, o.k || 0, J, o);
  J.hip = hip;
  const T = rot([0, -0.52], J.lean);
  J.sh = V(hip, T); J.neck = V(J.sh, rot([0.03, -0.1], J.lean));
  J.head = V(J.neck, rot([0.04, -0.13], J.lean * 0.6 + J.headAng));
  [J.knF, J.anF] = ik(hip, fF, 0.47, 0.45, -1); [J.knB, J.anB] = ik(hip, fB, 0.47, 0.45, -1);
  J.toF = V(J.anF, [0.19, 0.06 + Math.min(0, fF[1] + 0.08) * -0.25]); J.toB = V(J.anB, [0.19, 0.06 + Math.min(0, fB[1] + 0.08) * -0.25]);
  // arms
  if (kind === 'run') {
    const a = Math.sin(ph);
    J.haF = V(J.sh, rot([0.2 * a + 0.15, 0.42], J.lean * 0.5)); J.haB = V(J.sh, rot([-0.2 * a + 0.1, 0.4], J.lean * 0.5));
  } else if (kind === 'walk') {
    const a = Math.sin(ph);
    J.haF = V(J.sh, [0.3, 0.42 + 0.015 * Math.cos(ph * 2)]); J.haB = V(J.sh, [-0.14 * a, 0.6]);
  } else if (kind === 'raise') {
    const k = o.k ?? 1;
    J.haF = V(J.sh, [lerp(0.3, 0.52, k), lerp(0.42, -0.1, k)]); J.haB = V(J.sh, [lerp(-0.02, 0.18, k * (o.guard || 0)), lerp(0.6, 0.25, k * (o.guard || 0))]);
  } else {
    J.haF = V(J.sh, [0.3, 0.42]); J.haB = V(J.sh, [-0.02, 0.6]);
  }
  if (o.hands) Object.assign(J, o.hands(J));
  J.elF = ik(J.sh, J.haF, 0.31, 0.29, kind === 'run' ? -1 : 1)[0]; J.elB = ik(J.sh, J.haB, 0.31, 0.29, kind === 'run' ? -1 : 1)[0];
  [J.elF, J.haF] = ik(J.sh, J.haF, 0.31, 0.29, kind === 'run' ? -1 : 1); [J.elB, J.haB] = ik(J.sh, J.haB, 0.31, 0.29, kind === 'run' ? -1 : 1);
  return J;
}
function fallPose(kind, k, J, o) {
  // keyframes: A upright, B sitting back on the ground leaning on hands, C prone on the belly
  const A = { hip: [0, -0.93], sh: [0.02, -1.45], head: [0.08, -1.67], knF: [0.03, -0.5], anF: [0.1, -0.08], knB: [-0.03, -0.5], anB: [-0.08, -0.08], haF: [0.3, -1.03], haB: [-0.02, -0.85] };
  const B = { hip: [-0.35, -0.16], sh: [-0.7, -0.62], head: [-0.68, -0.86], knF: [0.05, -0.52], anF: [0.35, -0.1], knB: [0.0, -0.36], anB: [0.42, -0.06], haF: [0.0, -0.3], haB: [-0.95, -0.05] };
  const C = { hip: [-0.1, -0.16], sh: [0.42, -0.24], head: [0.66, -0.3], knF: [-0.55, -0.12], anF: [-0.98, -0.1], knB: [-0.52, -0.08], anB: [-0.96, -0.2], haF: [0.75, -0.06], haB: [0.62, -0.05] };
  const D = { hip: [-0.05, -0.55], sh: [0.3, -0.95], head: [0.45, -1.12], knF: [0.25, -0.55], anF: [0.15, -0.08], knB: [-0.45, -0.3], anB: [-0.6, -0.08], haF: [0.45, -0.15], haB: [0.1, -0.2] };
  const L2 = (P, Q, u) => { const r = {}; for (const key in P) r[key] = [lerp(P[key][0], Q[key][0], u), lerp(P[key][1], Q[key][1], u)]; return r; };
  let R;
  if (kind === 'fall') R = L2(A, B, easeInOut(k));
  else if (kind === 'trip') R = L2(Object.assign({}, A, { hip: [0.1, -0.9], sh: [0.4, -1.35], head: [0.5, -1.55], haF: [0.55, -1.1] }), C, easeIn(k) * 0.5 + k * 0.5);
  else if (kind === 'prone') R = C;
  else R = k < 0.5 ? L2(C, D, smooth(k * 2)) : L2(D, A, smooth(k * 2 - 1));
  Object.assign(J, R);
  J.neck = V(J.sh, [(J.head[0] - J.sh[0]) * 0.4, (J.head[1] - J.sh[1]) * 0.4]);
  J.lean = Math.atan2(J.sh[0] - J.hip[0], J.hip[1] - J.sh[1]);
  J.toF = V(J.anF, rot([0.19, 0.06], kind === 'prone' || kind === 'trip' ? -Math.PI / 2 * k : 0)); J.toB = V(J.anB, rot([0.19, 0.06], kind === 'prone' || kind === 'trip' ? -Math.PI / 2 * k : 0));
  [J.elF, J.haF] = ik(J.sh, J.haF, 0.31, 0.29, 1); [J.elB, J.haB] = ik(J.sh, J.haB, 0.31, 0.29, 1);
  J.headAng = 0;
  return J;
}

function lmb(P, a, b, w1, w2) { limb(P, a, b, w1, w2); }

// ---------- drawing ----------
// o: {flip, view:'side'|'back'|'front', li (lantern light on him 0..1.5), lightX (screen x of light relative to body: -1 left / +1 right), amb, lantern:{I, swing}, t, fog}
function drawManFigure(ctx, x, y, s, J, o = {}) {
  const view = o.view || 'side', t = o.t || 0;
  const g = FIGX; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
  g.clearRect(0, 0, W, H);
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s);
  const lp = view === 'side' ? drawSide(g, J, o) : drawFrontBack(g, J, o, view === 'front');
  g.restore();
  // lighting on his figure: dark ambient, warm lantern pool around the lamp, cold rim
  const amb = o.amb ?? 0.2, li = o.li ?? 0;
  const lx = x + lp[0] * s * (o.flip ? -1 : 1), ly = y + lp[1] * s;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(4,6,10,${clamp(0.78 - amb)})`; g.fillRect(0, 0, W, H);
  if (li > 0) {
    const R = 0.9 * s;
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, R);
    gr.addColorStop(0, `rgba(255,170,90,${0.5 * Math.min(1, li)})`); gr.addColorStop(0.3, `rgba(200,110,50,${0.22 * Math.min(1, li)})`); gr.addColorStop(1, 'rgba(120,60,20,0)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(lx - R, ly - R, R * 2, R * 2);
    g.globalCompositeOperation = 'overlay'; g.fillStyle = gr; g.fillRect(lx - R, ly - R, R * 2, R * 2);
  }
  if (o.fog) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = col(FOG_COL, o.fog); g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.drawImage(FIGBUF, 0, 0); ctx.restore();
  // the lantern itself is drawn on top, unaffected by the darkening
  if (o.lantern && (!J || J.lantern === 'hand') && !o.noLantern) drawLantern(ctx, lx, ly, s, o.lantern, t, o.flip);
  return [lx, ly];
}

function sleevePath(P, a, b, c, w) { lmb(P, a, b, w, w * 0.9); lmb(P, b, c, w * 0.9, w * 0.75); }

function drawSide(g, J, o) {
  const C = FIG, t = o.t || 0;
  const fill = (P, c, a = 1) => { g.fillStyle = col(c, a); g.fill(P); };
  // far arm
  let P = new Path2D(); sleevePath(P, J.sh, J.elB, J.haB, 0.12); fill(P, mix(C.coat, [0, 0, 0], 0.55));
  P = new Path2D(); P.arc(J.haB[0], J.haB[1], 0.045, 0, TAU); fill(P, mix(C.skin, [0, 0, 0], 0.6));
  // far leg
  P = new Path2D(); lmb(P, J.hip, J.knB, 0.17, 0.13); lmb(P, J.knB, J.anB, 0.13, 0.1); fill(P, mix(C.trou, [0, 0, 0], 0.5));
  drawBoot(g, J.anB, J.toB, 0.5);
  // near leg
  P = new Path2D(); lmb(P, J.hip, J.knF, 0.18, 0.13); lmb(P, J.knF, J.anF, 0.13, 0.105); fill(P, C.trou);
  g.save(); g.clip(P); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(J.knF[0] - 0.05, J.knF[1] - 0.02); g.quadraticCurveTo(J.knF[0], J.knF[1] + 0.03, J.knF[0] + 0.06, J.knF[1]); g.stroke(); g.restore();
  drawBoot(g, J.anF, J.toF, 0);
  // coat: torso + skirt to the knees, following the thighs
  const kF = J.knF, kB = J.knB;
  const up = [J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]], ul = Math.hypot(up[0], up[1]) || 1, ux = up[0] / ul, uy = up[1] / ul;   // torso axis
  const nx = -uy, ny = ux;                                                                    // forward normal
  const at = (p, f, k) => [p[0] + nx * f + ux * k, p[1] + ny * f + uy * k];
  const hemF = V(lerp2(J.hip, kF, 0.95), [0.1, 0.04]), hemB = V(lerp2(J.hip, kB, 0.9), [-0.12, 0.05]);
  const flap = Math.sin(t * 9) * (o.flap || 0) * 0.06;
  P = new Path2D();
  const nk = J.neck;
  P.moveTo(nk[0] - 0.06, nk[1] - 0.01);
  P.bezierCurveTo(...at(J.sh, -0.16, 0.02), ...at(J.sh, -0.16, -0.2), ...at(J.hip, -0.15, 0.1));                 // back
  P.bezierCurveTo(...at(J.hip, -0.17, -0.05), hemB[0] - 0.04 - flap, hemB[1] - 0.15, hemB[0] - flap, hemB[1]);    // back skirt
  P.quadraticCurveTo((hemB[0] + hemF[0]) / 2, Math.max(hemB[1], hemF[1]) + 0.03, hemF[0] + flap * 0.5, hemF[1]);  // hem
  P.bezierCurveTo(hemF[0] - 0.02, hemF[1] - 0.2, ...at(J.hip, 0.15, 0.05), ...at(J.hip, 0.14, 0.18));            // front skirt
  P.bezierCurveTo(...at(J.sh, 0.16, -0.25), ...at(J.sh, 0.14, -0.02), nk[0] + 0.07, nk[1] + 0.02);                // chest
  P.closePath();
  fill(P, C.coat);
  g.save(); g.clip(P);
  // folds, belt line, worn patches
  g.strokeStyle = col(C.coatDk, 0.8); g.lineWidth = 0.014; g.lineCap = 'round';
  for (let k = 0; k < 5; k++) { const a = at(J.hip, -0.12 + k * 0.06, 0.05); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0] + 0.02 * Math.sin(t * 3 + k), a[1] + 0.25, lerp(hemB[0], hemF[0], k / 4), lerp(hemB[1], hemF[1], k / 4) - 0.02); g.stroke(); }
  const b1 = at(J.hip, -0.2, 0.12), b2 = at(J.hip, 0.2, 0.12); g.lineWidth = 0.035; g.strokeStyle = col([30, 20, 14]); g.beginPath(); g.moveTo(b1[0], b1[1]); g.lineTo(b2[0], b2[1]); g.stroke();
  g.fillStyle = linGrad(g, ...at(J.sh, -0.2, 0), ...at(J.sh, 0.2, 0), [[0, 'rgba(0,0,0,0.45)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(255,220,180,0.05)']]); g.fillRect(-2, -3, 4, 4);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.45; g.drawImage(TEX.plaster, -0.6 + J.hip[0], -1.6, 1.2, 1.4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.restore();
  // collar turned up
  P = new Path2D(); P.moveTo(nk[0] - 0.08, nk[1] + 0.04); P.lineTo(nk[0] - 0.06, nk[1] - 0.07); P.lineTo(nk[0] + 0.05, nk[1] - 0.03); P.lineTo(nk[0] + 0.08, nk[1] + 0.05); P.closePath(); fill(P, mix(C.coat, C.coatDk, 0.4));
  drawHeadSide(g, J, o);
  // near arm (lantern arm)
  P = new Path2D(); sleevePath(P, J.sh, J.elF, J.haF, 0.125); fill(P, mix(C.coat, [255, 255, 255], 0.04));
  g.save(); g.clip(P); g.strokeStyle = col(C.coatDk, 0.9); g.lineWidth = 0.012; for (let k = 0; k < 3; k++) { const p = lerp2(J.elF, J.haF, 0.2 + k * 0.25); g.beginPath(); g.arc(p[0], p[1], 0.05, 0.3, 2.4); g.stroke(); } g.restore();
  P = new Path2D(); P.ellipse(J.haF[0] + 0.02, J.haF[1], 0.05, 0.042, 0.3, 0, TAU); fill(P, C.skin);
  return lanternPos(J, o);
}
function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
function lanternPos(J, o) {
  const sw = (o.lantern && o.lantern.swing) || 0;
  return [J.haF[0] + 0.02 + Math.sin(sw) * 0.16, J.haF[1] + Math.cos(sw) * 0.16];
}

function drawBoot(g, an, to, dk) {
  const P = new Path2D();
  const d = [to[0] - an[0], to[1] - an[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const pt = (a, b) => [an[0] + u[0] * a + n[0] * b, an[1] + u[1] * a + n[1] * b];
  const p = [pt(-0.07, -0.1), pt(-0.08, 0.06), pt(0.1, 0.07), pt(0.22, 0.06), pt(0.23, 0.0), pt(0.12, -0.04), pt(0.05, -0.09)];
  P.moveTo(...p[0]); for (let i = 1; i < p.length; i++) P.lineTo(...p[i]); P.closePath();
  g.fillStyle = col(mix(FIG.boot, [0, 0, 0], dk)); g.fill(P);
  g.fillStyle = col([20, 14, 10], 1 - dk * 0.5); const so = new Path2D(); const q = [pt(-0.08, 0.05), pt(0.22, 0.05), pt(0.23, 0.075), pt(-0.08, 0.075)]; so.moveTo(...q[0]); q.slice(1).forEach((v) => so.lineTo(...v)); g.fill(so);
  g.strokeStyle = `rgba(255,210,170,${0.18 * (1 - dk)})`; g.lineWidth = 0.008; g.beginPath(); g.moveTo(...pt(0.02, -0.07)); g.quadraticCurveTo(...pt(0.14, -0.04), ...pt(0.21, 0.0)); g.stroke();
}

function drawHeadSide(g, J, o) {
  const h = J.head, a = J.lean * 0.6 + (J.headAng || 0), look = J.look || 0;
  g.save(); g.translate(h[0], h[1]); g.rotate(a);
  if (look < 0) g.scale(-1, 1);                         // head turned to look back over the shoulder
  const S = 1;
  // neck
  let P = new Path2D(); lmb(P, [-0.01, 0.06], [-0.03, 0.17], 0.09, 0.1); g.fillStyle = col(mix(FIG.skin, [0, 0, 0], 0.35)); g.fill(P);
  // skull + face profile
  P = new Path2D();
  const pts = [[-0.105, 0.02], [-0.11, -0.05], [-0.07, -0.115], [0.0, -0.135], [0.07, -0.105], [0.095, -0.06], [0.1, -0.03], [0.096, -0.015], [0.128, 0.022], [0.108, 0.034], [0.104, 0.05], [0.11, 0.064], [0.1, 0.08], [0.095, 0.1], [0.06, 0.122], [0.01, 0.118], [-0.04, 0.09], [-0.08, 0.07]];
  spline(P, pts.map(([x, y]) => [x * S, y * S]), true, 0.6);
  g.fillStyle = col(FIG.skin); g.fill(P);
  g.save(); g.clip(P);
  g.fillStyle = linGrad(g, 0.12, 0, -0.1, 0, [[0, 'rgba(255,220,190,0.15)'], [0.5, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.55)']]); g.fillRect(-0.2, -0.2, 0.4, 0.4);
  // light beard on jaw and chin
  g.fillStyle = 'rgba(28,22,20,0.72)'; g.beginPath(); g.moveTo(0.11, 0.06); g.quadraticCurveTo(0.12, 0.13, 0.04, 0.13); g.lineTo(-0.05, 0.1); g.quadraticCurveTo(-0.02, 0.04, 0.02, 0.03); g.quadraticCurveTo(0.07, 0.05, 0.11, 0.035); g.fill();
  if (o.gray) { g.fillStyle = 'rgba(170,165,160,0.35)'; for (let i = 0; i < 40; i++) g.fillRect(-0.04 + hash2(i, 1, 3) * 0.14, 0.04 + hash2(i, 2, 3) * 0.08, 0.004, 0.008); }
  // eye socket + eye
  radialEllipse(g, 0.07, -0.03, 0.03, 0.02, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
  g.fillStyle = '#e8e0d6'; g.beginPath(); g.ellipse(0.082, -0.028, 0.011, (o.wide ? 0.008 : 0.005), 0, 0, TAU); g.fill();
  g.fillStyle = '#120c08'; g.beginPath(); g.arc(0.088, -0.028, 0.004, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = 0.008; g.beginPath(); g.moveTo(0.06, -0.045); g.quadraticCurveTo(0.08, -0.052, 0.1, -0.043); g.stroke();   // brow
  g.restore();
  // ear
  g.fillStyle = col(mix(FIG.skin, [0, 0, 0], 0.25)); g.beginPath(); g.ellipse(-0.02, -0.01, 0.018, 0.03, 0.2, 0, TAU); g.fill();
  // short dark hair, a little grey at the temple
  P = new Path2D(); spline(P, [[-0.112, 0.03], [-0.118, -0.06], [-0.075, -0.125], [0.0, -0.145], [0.065, -0.118], [0.088, -0.08], [0.04, -0.09], [-0.01, -0.07], [-0.04, -0.03], [-0.06, 0.02]], true, 0.6);
  g.fillStyle = col(FIG.hair); g.fill(P);
  g.save(); g.clip(P); g.strokeStyle = 'rgba(150,140,130,0.25)'; g.lineWidth = 0.004; for (let i = 0; i < 30; i++) { const px = -0.1 + hash2(i, 3, 1) * 0.17, py = -0.13 + hash2(i, 4, 1) * 0.12; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 0.015, py + 0.02); g.stroke(); } g.restore();
  g.restore();
}

// back / front view: symmetric body, lantern in the right hand (viewer's right for back view)
function drawFrontBack(g, J, o, front) {
  const C = FIG, t = o.t || 0, ph = o.ph || 0, walk = o.walking ? 1 : 0;
  const fill = (P, c) => { g.fillStyle = col(c); g.fill(P); };
  const step = Math.sin(ph) * walk;
  const hipY = -0.93 + Math.abs(Math.cos(ph)) * 0.02 * walk;
  const sw = (o.sway || 0);
  // legs: the stepping one lifts its foot (shorter shin) and drifts up the frame (towards depth)
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, step * sd) * 0.12, back = step * sd * (front ? -0.04 : 0.04);
    const hip = [sd * 0.1 + sw * 0.02, hipY], kn = [sd * 0.11, -0.5 - lift * 0.6 + back], an = [sd * 0.11, -0.08 - lift + back];
    const P = new Path2D(); lmb(P, hip, kn, 0.17, 0.13); lmb(P, kn, an, 0.13, 0.11); fill(P, C.trou);
    const B = new Path2D(); B.ellipse(an[0] + sd * 0.01, an[1] + 0.04, 0.065, 0.06, 0, 0, TAU); B.rect(an[0] - 0.055, an[1] - 0.09, 0.11, 0.12); fill(B, C.boot);
  }
  // coat body
  const sh = [0 + sw * 0.03, -1.45], hem = -0.42;
  let P = new Path2D();
  P.moveTo(-0.07, -1.56); P.bezierCurveTo(-0.2, -1.55, -0.24, -1.5, -0.25, -1.38); P.bezierCurveTo(-0.27, -1.1, -0.24, -0.8, -0.27 - step * 0.02, hem);
  P.quadraticCurveTo(0, hem + 0.04, 0.27 - step * 0.02, hem); P.bezierCurveTo(0.24, -0.8, 0.27, -1.1, 0.25, -1.38); P.bezierCurveTo(0.24, -1.5, 0.2, -1.55, 0.07, -1.56); P.closePath();
  fill(P, C.coat);
  g.save(); g.clip(P);
  g.strokeStyle = col(C.coatDk, 0.8); g.lineWidth = 0.014; g.lineCap = 'round';
  for (let k = 0; k < 6; k++) { const xx = -0.2 + k * 0.08; g.beginPath(); g.moveTo(xx, -0.9); g.quadraticCurveTo(xx + 0.02 * Math.sin(t * 2 + k), -0.65, xx + step * 0.03, hem); g.stroke(); }
  g.fillStyle = col([30, 20, 14]); g.fillRect(-0.3, -0.98, 0.6, 0.035);
  if (front) { g.strokeStyle = col(C.coatDk); g.lineWidth = 0.012; g.beginPath(); g.moveTo(0.01, -1.5); g.lineTo(0.02, hem); g.stroke(); for (let k = 0; k < 4; k++) { g.fillStyle = '#1a120c'; g.beginPath(); g.arc(-0.03, -1.36 + k * 0.12, 0.012, 0, TAU); g.fill(); } }
  else { g.strokeStyle = col(C.coatDk); g.lineWidth = 0.012; g.beginPath(); g.moveTo(0, -0.9); g.lineTo(0, hem); g.stroke(); }
  g.fillStyle = linGrad(g, -0.3, 0, 0.3, 0, [[0, 'rgba(0,0,0,0.5)'], [0.5, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.35)']]); g.fillRect(-0.4, -1.7, 0.8, 1.4);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.45; g.drawImage(TEX.plaster, -0.4, -1.6, 0.8, 1.3); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.restore();
  // arms: left hangs/swings, right holds the lantern forward (hidden behind the body from the back)
  const armL = new Path2D(); const swing = -step * 0.06;
  const hl = o.handL || [-0.3 + swing * 0.3, -0.82 + Math.abs(swing) * 0.2];
  sleevePath(armL, [-0.22, -1.4], [-0.28, -1.12], hl, 0.12); fill(armL, mix(C.coat, [0, 0, 0], 0.1));
  const hr = o.handR || [0.3, -0.98];
  const armR = new Path2D(); sleevePath(armR, [0.22, -1.4], [0.29, -1.16], hr, 0.12); fill(armR, mix(C.coat, [0, 0, 0], 0.1));
  for (const hh of [hl, hr]) { const HP = new Path2D(); HP.ellipse(hh[0], hh[1] + 0.03, 0.045, 0.055, 0, 0, TAU); fill(HP, C.skin); }
  // head
  g.save(); g.translate(sw * 0.03 + (o.headX || 0), -1.67); g.rotate(o.headTilt || 0);
  P = new Path2D(); lmb(P, [0, 0.06], [0, 0.15], 0.1, 0.11); fill(P, mix(C.skin, [0, 0, 0], 0.3));
  const HP = new Path2D(); HP.ellipse(0, 0, 0.098, 0.125, 0, 0, TAU); fill(HP, C.skin);
  for (const sd of [-1, 1]) { const E = new Path2D(); E.ellipse(sd * 0.1, 0.005, 0.016, 0.03, 0, 0, TAU); fill(E, mix(C.skin, [0, 0, 0], 0.2)); }
  g.save(); g.clip(HP);
  if (front) {
    const lk = (o.faceLook || 0) * 0.02;
    g.fillStyle = 'rgba(28,22,20,0.7)'; g.beginPath(); g.ellipse(lk, 0.07, 0.1, 0.07, 0, 0, TAU); g.fill();           // beard
    g.fillStyle = col(FIG.skin); g.beginPath(); g.ellipse(lk, 0.055, 0.03, 0.012, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,10,10,0.8)'; g.fillRect(lk - 0.022, 0.05 + (o.mouth || 0) * 0.004, 0.044, 0.006 + (o.mouth || 0) * 0.02);
    for (const sd of [-1, 1]) {
      radialEllipse(g, sd * 0.038 + lk, -0.02, 0.026, 0.018, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
      g.fillStyle = '#e8e0d6'; g.beginPath(); g.ellipse(sd * 0.038 + lk, -0.02, 0.013, o.wide ? 0.009 : 0.006, 0, 0, TAU); g.fill();
      g.fillStyle = '#100a06'; g.beginPath(); g.arc(sd * 0.038 + lk * 1.6, -0.02, 0.0045, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = 0.008; g.beginPath(); g.moveTo(sd * 0.018 + lk, -0.045 - (o.wide ? 0.006 : 0)); g.lineTo(sd * 0.06 + lk, -0.04); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(lk, -0.02); g.lineTo(lk + 0.012, 0.025); g.lineTo(lk - 0.008, 0.028); g.fill();
    g.fillStyle = linGrad(g, -0.1, 0, 0.1, 0, [[0, 'rgba(0,0,0,0.45)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]); g.fillRect(-0.12, -0.14, 0.24, 0.28);
    // hair on top
    g.fillStyle = col(FIG.hair); g.beginPath(); g.ellipse(0, -0.1, 0.11, 0.065, 0, 0, TAU); g.fill();
  } else {
    g.fillStyle = col(FIG.hair); g.beginPath(); g.ellipse(0, -0.02, 0.11, 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,110,100,0.25)'; g.lineWidth = 0.004; for (let i = 0; i < 40; i++) { const px = -0.09 + hash2(i, 1, 4) * 0.18, py = -0.12 + hash2(i, 2, 4) * 0.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 0.02); g.stroke(); }
  }
  g.restore();
  // collar
  P = new Path2D(); P.moveTo(-0.13, 0.12); P.lineTo(-0.1, 0.04); P.lineTo(0, 0.1); P.lineTo(0.1, 0.04); P.lineTo(0.13, 0.12); P.closePath(); fill(P, mix(C.coat, C.coatDk, 0.4));
  g.restore();
  const s2 = (o.lantern && o.lantern.swing) || 0;
  return [hr[0] + Math.sin(s2) * 0.16, hr[1] + 0.02 + Math.cos(s2) * 0.16];
}

// oil lantern: brass frame, glass chimney, flame; x,y = centre of the glass
function drawLantern(ctx, x, y, s, L, t, flip) {
  const I = L.I ?? 1, sw = L.swing || 0, k = s / 1000;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-sw * (flip ? -1 : 1) * 0.5); ctx.scale(k, k);
  // bail handle
  ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -120, 52, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  // cap + base
  ctx.fillStyle = '#2a1f14'; ctx.beginPath(); ctx.moveTo(-46, -96); ctx.lineTo(46, -96); ctx.lineTo(30, -126); ctx.lineTo(-30, -126); ctx.closePath(); ctx.fill();
  ctx.fillRect(-52, 70, 104, 30);
  // glass glow
  const gl = ctx.createRadialGradient(0, 10, 4, 0, 10, 80);
  gl.addColorStop(0, `rgba(255,240,200,${0.95 * I})`); gl.addColorStop(0.35, `rgba(255,180,90,${0.8 * I})`); gl.addColorStop(1, `rgba(150,70,20,${0.55 * I})`);
  ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(-40, -96); ctx.bezierCurveTo(-62, -40, -62, 40, -42, 70); ctx.lineTo(42, 70); ctx.bezierCurveTo(62, 40, 62, -40, 40, -96); ctx.closePath(); ctx.fill();
  // flame
  const fl = 1 + n1(t * 9, 3) * 0.12;
  ctx.fillStyle = `rgba(255,250,225,${I})`; ctx.beginPath(); ctx.ellipse(0, 18 - 10 * fl, 9, 26 * fl, 0, 0, TAU); ctx.fill();
  // wire guards
  ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 6;
  for (const sx of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(sx * 44, -96); ctx.bezierCurveTo(sx * 66, -30, sx * 66, 30, sx * 46, 70); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, -10, 58, 10, 0, 0, TAU); ctx.stroke();
  ctx.restore();
  radial(ctx, x, y, 0.22 * s, [[0, `rgba(255,220,160,${0.55 * I})`], [1, 'rgba(255,150,60,0)']], 'screen');
  radial(ctx, x, y, 1.2 * s, [[0, `rgba(255,170,90,${0.16 * I})`], [0.3, `rgba(255,140,60,${0.06 * I})`], [1, 'rgba(120,50,10,0)']], 'screen');
}

// figure as a forest actor at world (X,Z)
function manActor(X, Z, J, o) {
  return {
    x: X, z: Z, bias: o.bias || 0,
    draw: (ctx, cam) => {
      const p = proj(cam, X, 0, Z); if (p[2] < 0.3) return;
      const ff = fogK(p[2], o.fogDist || 26);
      const r = drawManFigure(ctx, p[0], p[1], p[3], J, Object.assign({}, o, { fog: (o.fog || 0) + ff * 0.85 }));
      if (o.out) o.out.screen = r;
    },
  };
}
