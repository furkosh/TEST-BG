// ENKEBİT: ~2.20 m, emaciated humanoid, arms hanging below the knees, crooked neck, head tilted,
// long black nails, pale almost colourless eyes. Skeleton-driven so every shot keeps the same proportions.
'use strict';
const CR = {
  skin: [74, 80, 90], sh: [8, 9, 12], hi: [150, 162, 178], rim: [150, 175, 210], nail: [6, 6, 8], eye: [214, 218, 220],
};
function buildCreature() {
  const r = mulberry32(666);
  CR.skinTex = noiseCanvas(256, 256, 18, 5, 616, (v, i, j) => {
    const vein = Math.abs(fbm(i / 40, j / 40, 4, 9) - 0.5) < 0.012 ? 60 : 0;
    const g = 110 + (v - 0.5) * 120 - vein;
    return [g * 0.95, g, g * 1.06, 255];
  });
  CR.spots = Array.from({ length: 60 }, () => [r(), r(), r()]);
}

// standing pose joints (feet at y=0, height ~880 px at scale 1). Lean/tilt animatable.
function crPose(name, k = 0, t = 0) {
  const tw = (s) => n1(t * 1.7, s) * 0.5 + (Math.abs(n1(t * 0.9, s + 3)) > 0.85 ? n1(t * 9, s) * 2 : 0);   // irregular twitches
  if (name === 'stand') {
    return {
      head: [52 + tw(1) * 6, -808], neckTop: [34, -770], neckBase: [10, -712], shL: [-68, -700], shR: [78, -694],
      chest: [4, -610], pelvis: [0, -392], elL: [-96, -470 + tw(2) * 4], elR: [104, -462], wrL: [-92, -232 + tw(3) * 5], wrR: [100, -222],
      hipL: [-34, -386], hipR: [36, -386], knL: [-44, -196], knR: [46, -192], anL: [-42, -22], anR: [46, -22], toL: [-82, 0], toR: [86, 0],
      tilt: -0.62 + tw(4) * 0.04,
    };
  }
  if (name === 'rise') {
    // k: 0 crouched behind the footboard -> 1 standing upright (bones unfolding)
    const s = crPose('stand', 0, t), c = crPose('crouch', 0, t);
    const o = {};
    for (const key of Object.keys(s)) o[key] = Array.isArray(s[key]) ? [lerp(c[key][0], s[key][0], k), lerp(c[key][1], s[key][1], k)] : lerp(c[key], s[key], k);
    return o;
  }
  if (name === 'crouch') {
    return {
      head: [70, -430], neckTop: [50, -400], neckBase: [24, -350], shL: [-60, -340], shR: [86, -330],
      chest: [10, -280], pelvis: [-10, -150], elL: [-120, -170], elR: [140, -160], wrL: [-110, -20], wrR: [130, -10],
      hipL: [-40, -150], hipR: [30, -150], knL: [-90, -300], knR: [90, -300], anL: [-60, -20], anR: [70, -20], toL: [-100, 0], toR: [110, 0],
      tilt: -0.9,
    };
  }
  return crPose('stand', 0, t);
}

function limb(path, a, b, w1, w2) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  // clockwise like the joint arcs/ellipses so the union fills with the nonzero rule (no holes at joints)
  path.moveTo(a[0] - nx * w1 / 2, a[1] - ny * w1 / 2);
  path.lineTo(b[0] - nx * w2 / 2, b[1] - ny * w2 / 2);
  path.lineTo(b[0] + nx * w2 / 2, b[1] + ny * w2 / 2);
  path.lineTo(a[0] + nx * w1 / 2, a[1] + ny * w1 / 2);
  path.closePath();
  path.moveTo(b[0] + w2 / 2, b[1]); path.arc(b[0], b[1], w2 / 2, 0, TAU);
  path.moveTo(a[0] + w1 / 2, a[1]); path.arc(a[0], a[1], w1 / 2, 0, TAU);
}

// long-fingered hand path (silhouette) at wrist w pointing along angle ang
function handPath(path, w, ang, s, curl, t, seed) {
  const fingers = [[-0.32, 0.8], [-0.1, 1.0], [0.08, 1.06], [0.26, 0.92], [-0.75, 0.55]];
  const palmL = 70 * s;
  const px = w[0] + Math.cos(ang) * palmL, py = w[1] + Math.sin(ang) * palmL;
  limb(path, w, [px, py], 40 * s, 54 * s);
  const tips = [];
  fingers.forEach(([da, lf], i) => {
    let a = ang + da * 0.9, x = px + Math.cos(ang + da) * 18 * s, y = py + Math.sin(ang + da) * 22 * s;
    if (i === 4) { x = w[0] + Math.cos(ang - 0.6) * 30 * s; y = w[1] + Math.sin(ang - 0.6) * 30 * s; }
    let prev = [x, y];
    const c = (curl ?? 0.15) + n1(t * 1.3, seed + i) * 0.12 + (Math.abs(n1(t * 0.7, seed + 9 + i)) > 0.8 ? n1(t * 12, seed + i) * 0.25 : 0);
    for (let k = 0; k < 3; k++) {
      a += c * 0.55;
      const L = [62, 52, 44][k] * lf * s;
      const nx = prev[0] + Math.cos(a) * L, ny = prev[1] + Math.sin(a) * L;
      limb(path, prev, [nx, ny], (16 - k * 2.6) * s, (13.5 - k * 2.8) * s);
      prev = [nx, ny];
    }
    tips.push([prev[0], prev[1], a]);
  });
  return tips;
}
function drawNail(ctx, x, y, a, s, gloss = 0.5) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col(CR.nail);
  ctx.beginPath(); ctx.moveTo(-4 * s, -4.5 * s); ctx.quadraticCurveTo(26 * s, -6 * s, 46 * s, 3 * s); ctx.quadraticCurveTo(24 * s, 2 * s, -4 * s, 4.5 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = `rgba(190,205,225,${gloss})`; ctx.lineWidth = 1.1 * s;
  ctx.beginPath(); ctx.moveTo(2 * s, -3 * s); ctx.quadraticCurveTo(24 * s, -4 * s, 40 * s, 1.5 * s); ctx.stroke();
  ctx.restore();
}

function crHeadPath(path, s = 1) {
  // gaunt hairless skull with sunken temples and a long narrow jaw (neck/chin at 0,0, crown at -166)
  const pts = [[0, -2], [-20, -10], [-33, -34], [-40, -58], [-47, -80], [-43, -104], [-49, -128], [-36, -156], [0, -168], [36, -156], [50, -128], [44, -104], [48, -80], [41, -58], [34, -34], [21, -10]];
  path.moveTo(pts[0][0] * s, pts[0][1] * s);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    path.bezierCurveTo((p1[0] + (p2[0] - p0[0]) / 6) * s, (p1[1] + (p2[1] - p0[1]) / 6) * s, (p2[0] - (p3[0] - p1[0]) / 6) * s, (p2[1] - (p3[1] - p1[1]) / 6) * s, p2[0] * s, p2[1] * s);
  }
  path.closePath();
}

// full-body figure with moon rim light; o: {rimDir:[x,y], rimA, eyes, t, skin(bool), fill, curlL, curlR}
function crBodyPath(J, o, t) {
  const P = new Path2D();
  // rib cage + waist + pelvis
  const rc = [(J.neckBase[0] + J.chest[0]) / 2, (J.neckBase[1] + J.chest[1]) / 2 + 10];
  P.ellipse(rc[0], rc[1], 52, 92, Math.atan2(J.chest[0] - J.neckBase[0], J.neckBase[1] - J.chest[1]), 0, TAU); P.closePath();
  limb(P, J.chest, J.pelvis, 58, 40);
  P.ellipse(J.pelvis[0], J.pelvis[1] + 6, 46, 30, 0, 0, TAU); P.closePath();
  limb(P, J.shL, J.shR, 34, 34);
  limb(P, J.neckBase, J.neckTop, 30, 24);
  limb(P, J.shL, J.elL, 32, 22); limb(P, J.elL, J.wrL, 24, 17);
  limb(P, J.shR, J.elR, 32, 22); limb(P, J.elR, J.wrR, 24, 17);
  limb(P, J.hipL, J.knL, 38, 28); limb(P, J.knL, J.anL, 26, 17); limb(P, J.anL, J.toL, 24, 12);
  limb(P, J.hipR, J.knR, 38, 28); limb(P, J.knR, J.anR, 26, 17); limb(P, J.anR, J.toR, 24, 12);
  for (const k of [J.knL, J.knR]) { P.moveTo(k[0] + 18, k[1]); P.arc(k[0], k[1], 18, 0, TAU); }
  for (const k of [J.elL, J.elR]) { P.moveTo(k[0] + 14, k[1]); P.arc(k[0], k[1], 14, 0, TAU); }
  const angL = Math.atan2(J.wrL[1] - J.elL[1], J.wrL[0] - J.elL[0]), angR = Math.atan2(J.wrR[1] - J.elR[1], J.wrR[0] - J.elR[0]);
  const tips = handPath(P, J.wrL, angL, 0.95, o.curlL, t, 11).concat(handPath(P, J.wrR, angR, 0.95, o.curlR, t, 22));
  const HP = new Path2D(); crHeadPath(HP, 1);
  P.addPath(HP, new DOMMatrix().translate(J.neckTop[0], J.neckTop[1]).rotate(J.tilt * 180 / Math.PI));
  return { P, tips };
}
function drawCreatureBody(ctx, J, o = {}) {
  const t = o.t || 0, rim = o.rimDir || [1, -0.3], rimA = o.rimA ?? 0.8;
  const { P, tips } = crBodyPath(J, o, t);
  ctx.save();
  if (rimA > 0) { ctx.save(); ctx.translate(rim[0] * 3.5, rim[1] * 3.5); ctx.fillStyle = col(CR.rim, rimA); ctx.fill(P); ctx.restore(); }
  if (o.skin) {
    crSkinFill(ctx, P, [rim[0] > 0 ? 0.9 : 0.1, 0.2], -260, -1000, 520, 1040);
    ctx.save(); ctx.clip(P);
    ctx.fillStyle = linGrad(ctx, rim[0] * 200, -500, -rim[0] * 200, -400, [[0, 'rgba(0,0,0,0.15)'], [0.5, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0.9)']]);
    ctx.fillRect(-300, -1000, 600, 1040);
    ctx.fillStyle = `rgba(0,0,0,${o.dark ?? 0.25})`; ctx.fillRect(-300, -1000, 600, 1040);
    // ribs + sternum + hip bones catching light
    ctx.strokeStyle = col(CR.hi, 0.22); ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const y = J.neckBase[1] + 36 + i * 19, cx = lerp(J.neckBase[0], J.chest[0], i / 7); ctx.beginPath(); ctx.moveTo(cx - 44, y + 8); ctx.quadraticCurveTo(cx, y - 6, cx + 44, y + 8); ctx.stroke(); }
    ctx.strokeStyle = col(CR.sh, 0.6); ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const y = J.neckBase[1] + 46 + i * 19, cx = lerp(J.neckBase[0], J.chest[0], i / 7); ctx.beginPath(); ctx.moveTo(cx - 44, y + 8); ctx.quadraticCurveTo(cx, y - 6, cx + 44, y + 8); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke(P);
  } else {
    ctx.fillStyle = col(o.fill || [10, 11, 14]); ctx.fill(P);
  }
  for (const [x, y, a] of tips) drawNail(ctx, x, y, a, 0.9, 0.35);
  if (o.eyes) {
    const ex = new DOMMatrix().translate(J.neckTop[0], J.neckTop[1]).rotate(J.tilt * 180 / Math.PI);
    for (const [px, py] of [[-19, -88], [19, -86]]) {
      const p = ex.transformPoint(new DOMPoint(px, py));
      radial(ctx, p.x, p.y, 11, [[0, `rgba(225,232,236,${0.9 * o.eyes})`], [0.35, `rgba(200,212,220,${0.3 * o.eyes})`], [1, 'rgba(200,210,220,0)']]);
    }
  }
  ctx.restore();
}

// ---------- close-ups ----------
function crSkinFill(ctx, path, light, x0, y0, w, h) {
  ctx.save(); ctx.clip(path);
  ctx.fillStyle = col(CR.skin); ctx.fillRect(x0, y0, w, h);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(CR.skinTex, x0, y0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = linGrad(ctx, x0 + w * light[0], y0 + h * light[1], x0 + w * (1 - light[0]), y0 + h * (1 - light[1]), [[0, col(CR.hi, 0.35)], [0.45, col(CR.sh, 0.2)], [1, col(CR.sh, 0.95)]]);
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
}

// large detailed hand: wrist at (0,0) pointing +x; curl per finger; scale s
function drawCreatureHandClose(ctx, o = {}) {
  const s = o.s || 1, t = o.t || 0, curl = o.curl ?? 0.2;
  const P = new Path2D();
  const tips = handPath(P, [0, 0], 0, s, curl, t, o.seed || 5);
  // forearm
  limb(P, [-420 * s, 30 * s], [0, 0], 46 * s, 30 * s);
  crSkinFill(ctx, P, o.light || [0.7, 0.1], -460 * s, -260 * s, 900 * s, 520 * s);
  ctx.save(); ctx.clip(P);
  // knuckles + wrinkles + tendons
  ctx.strokeStyle = col(CR.sh, 0.55); ctx.lineWidth = 1.6 * s;
  for (let i = 0; i < 40; i++) { const x = -300 * s + hash2(i, 1, 3) * 360 * s, y = -20 * s + hash2(i, 2, 3) * 40 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6 * s, y + 3 * s, x + 12 * s, y + 1 * s); ctx.stroke(); }
  ctx.strokeStyle = col(CR.hi, 0.18); ctx.lineWidth = 5 * s;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-120 * s, (k - 1.5) * 6 * s); ctx.quadraticCurveTo(10 * s, (k - 1.5) * 10 * s, 70 * s, (k - 1.5) * 18 * s); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5 * s; ctx.stroke(P);
  for (const [x, y, a] of tips) drawNail(ctx, x, y, a, s * 1.35, 0.6);
  return tips;
}

// creature face close-up: chin at (0,0); o: {s, light:[lx,ly], mouth, eyes, look, dark, neck}
function drawCreatureFace(ctx, o = {}) {
  const s = o.s || 1, mo = o.mouth || 0, lx = (o.light || [0.85, 0.15])[0] > 0.5 ? 1 : -1;
  const P = new Path2D(); crHeadPath(P, s);
  if (o.neck !== false) limb(P, [0, -4 * s], [-6 * s, 130 * s], 44 * s, 58 * s);
  crSkinFill(ctx, P, o.light || [0.85, 0.15], -70 * s, -180 * s, 140 * s, 330 * s);
  ctx.save(); ctx.clip(P);
  const S = (x) => x * s;
  // bone structure: temple, cheek and eye-socket hollows
  for (const sx of [-1, 1]) {
    const k = sx === lx ? 0.55 : 0.85;
    radialEllipse(ctx, S(sx * 40), S(-108), S(14), S(20), [[0, col(CR.sh, 0.6 * k)], [1, col(CR.sh, 0)]]);
    radialEllipse(ctx, S(sx * 27), S(-48), S(13), S(20), [[0, col(CR.sh, 0.85 * k)], [1, col(CR.sh, 0)]]);
    radialEllipse(ctx, S(sx * 19), S(-88), S(19), S(15), [[0, col(CR.sh, 1)], [0.6, col(CR.sh, 0.9)], [1, col(CR.sh, 0)]]);
  }
  // ridges catching the moon: brow, cheekbone, nose bridge, chin
  ctx.strokeStyle = col(CR.hi, 0.3); ctx.lineCap = 'round'; ctx.filter = `blur(${Math.max(1, s * 0.8)}px)`;
  ctx.lineWidth = S(3); ctx.beginPath(); ctx.moveTo(S(lx * 6), S(-103)); ctx.quadraticCurveTo(S(lx * 22), S(-110), S(lx * 36), S(-100)); ctx.stroke();
  ctx.lineWidth = S(4); ctx.beginPath(); ctx.moveTo(S(lx * 26), S(-70)); ctx.quadraticCurveTo(S(lx * 38), S(-68), S(lx * 44), S(-78)); ctx.stroke();
  ctx.lineWidth = S(2); ctx.beginPath(); ctx.moveTo(S(lx * 1), S(-96)); ctx.lineTo(S(lx * 3), S(-60)); ctx.stroke();
  ctx.filter = 'none';
  radialEllipse(ctx, S(lx * 6), S(-8), S(9), S(5), [[0, col(CR.hi, 0.4)], [1, col(CR.hi, 0)]]);
  // nose: two slits under a collapsed bridge
  ctx.fillStyle = col(CR.sh, 0.95); ctx.beginPath(); ctx.ellipse(S(-4), S(-56), S(1.8), S(4.5), 0.3, 0, TAU); ctx.ellipse(S(5), S(-56), S(1.8), S(4.5), -0.3, 0, TAU); ctx.fill();
  // veins on temple and skull
  ctx.strokeStyle = 'rgba(20,24,40,0.45)'; ctx.lineWidth = S(0.9);
  const r = mulberry32(31);
  for (let v = 0; v < 6; v++) { let x = S((r() - 0.5) * 70), y = S(-150 + r() * 50), a = Math.PI / 2 + (r() - 0.5); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * S(5); y += Math.sin(a) * S(5); ctx.lineTo(x, y); } ctx.stroke(); }
  // too-wide lipless mouth, cracked
  ctx.fillStyle = '#030304';
  ctx.beginPath(); ctx.moveTo(S(-24), S(-31)); ctx.quadraticCurveTo(S(0), S(-34 + mo * 4), S(24), S(-30)); ctx.quadraticCurveTo(S(0), S(-27 + mo * 16), S(-24), S(-31)); ctx.fill();
  ctx.strokeStyle = col(CR.sh, 0.7); ctx.lineWidth = S(0.8);
  for (let i = 0; i < 7; i++) { const x = S(-18 + i * 6); ctx.beginPath(); ctx.moveTo(x, S(-33)); ctx.lineTo(x + S(1), S(-38)); ctx.moveTo(x, S(-29 + mo * 8)); ctx.lineTo(x - S(1), S(-24 + mo * 8)); ctx.stroke(); }
  if (mo > 0.25) { ctx.fillStyle = `rgba(150,150,140,${0.55 * mo})`; for (let i = 0; i < 10; i++) { const x = S(-16 + i * 3.6); ctx.fillRect(x, S(-31), S(1.4), S(2 + mo * 3)); } }
  // darkness swallowing the far side of the face
  const dk = o.dark ?? 0.6;
  ctx.fillStyle = linGrad(ctx, S(lx * 50), S(-130), S(-lx * 50), S(20), [[0, 'rgba(0,0,0,0)'], [0.4, `rgba(0,0,0,${dk * 0.45})`], [1, `rgba(0,0,0,${dk})`]]);
  ctx.fillRect(S(-80), S(-190), S(160), S(340));
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = S(0.8); ctx.stroke(P);
  // pale, almost colourless eyes deep in the sockets
  const ea = o.eyes ?? 1, look = o.look || [0, 0];
  for (const ex of [-19, 19]) {
    const cx = S(ex + look[0] * 1.5), cy = S(-88 + look[1] * 1.5);
    ctx.fillStyle = `rgba(196,202,204,${0.92 * ea})`; ctx.beginPath(); ctx.ellipse(cx, cy, S(5.6), S(3.2), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(160,168,172,${0.6 * ea})`; ctx.beginPath(); ctx.arc(cx, cy, S(2.4), 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(8,8,8,${0.9 * ea})`; ctx.beginPath(); ctx.arc(cx, cy, S(0.7), 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(0,0,0,${0.5 * ea})`; ctx.beginPath(); ctx.ellipse(cx, cy - S(2.4), S(6), S(1.6), 0, 0, TAU); ctx.fill();
    radial(ctx, cx, cy, S(10), [[0, `rgba(220,230,236,${0.15 * ea})`], [1, 'rgba(220,230,236,0)']], 'screen');
  }
}

// bony foot close-up: ankle at (0,0), toes pointing +x; curl 0..1
function drawCreatureFoot(ctx, o = {}) {
  const s = o.s || 1, t = o.t || 0, curl = o.curl || 0;
  const S = (v) => v * s;
  const P = new Path2D();
  // organic outline: thin shin -> knobbly ankle -> long high-arched foot
  P.moveTo(S(-52), S(-440));
  P.bezierCurveTo(S(-46), S(-300), S(-40), S(-120), S(-30), S(-40));     // back of the shin / achilles
  P.bezierCurveTo(S(-48), S(-10), S(-54), S(30), S(-26), S(44));          // heel
  P.bezierCurveTo(S(30), S(52), S(110), S(46), S(165), S(40));             // sole
  P.bezierCurveTo(S(175), S(20), S(170), S(-6), S(150), S(-14));           // ball of the foot
  P.bezierCurveTo(S(100), S(-26), S(40), S(-40), S(18), S(-70));           // high arch / instep
  P.bezierCurveTo(S(8), S(-160), S(0), S(-320), S(4), S(-440));            // front of the shin
  P.closePath();
  const tips = [];
  for (let i = 0; i < 5; i++) {
    let a = 0.12 + i * 0.07, prev = [S(150 - i * 7), S(-10 + i * 11)];
    const c = curl + n1(t * 1.5, 40 + i) * 0.08;
    for (let k = 0; k < 3; k++) {
      a += c * 0.5;
      const L = [46, 34, 26][k] * (1 - i * 0.13) * s;
      const nx = prev[0] + Math.cos(a) * L, ny = prev[1] + Math.sin(a) * L;
      limb(P, prev, [nx, ny], (21 - k * 3.5 - i * 1.4) * s, (16 - k * 3.5 - i * 1.4) * s); prev = [nx, ny];
    }
    tips.push([prev[0], prev[1], a]);
  }
  crSkinFill(ctx, P, o.light || [0.8, 0.0], S(-120), S(-460), S(440), S(540));
  ctx.save(); ctx.clip(P);
  // tendons on the top of the foot, shin bone ridge, ankle knob, heel shadow
  ctx.strokeStyle = col(CR.hi, 0.22); ctx.lineWidth = S(4); ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(S(22 + k * 4), S(-62 + k * 4)); ctx.quadraticCurveTo(S(80), S(-30 + k * 7), S(148), S(-8 + k * 9)); ctx.stroke(); }
  ctx.strokeStyle = col(CR.hi, 0.18); ctx.lineWidth = S(6); ctx.beginPath(); ctx.moveTo(S(2), S(-430)); ctx.quadraticCurveTo(S(-4), S(-250), S(12), S(-90)); ctx.stroke();
  radialEllipse(ctx, S(-14), S(-28), S(16), S(13), [[0, col(CR.hi, 0.45)], [1, col(CR.hi, 0)]]);
  radialEllipse(ctx, S(40), S(40), S(90), S(18), [[0, col(CR.sh, 0.6)], [1, col(CR.sh, 0)]]);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = S(1.4); ctx.stroke(P);
  for (const [x, y, a] of tips) drawNail(ctx, x, y, a, s * 0.7, 0.45);
}
