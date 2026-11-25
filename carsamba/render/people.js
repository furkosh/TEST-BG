// ÇARŞAMBA KARISI — characters and props: the young woman, the creature (bust / full body / speed streak),
// villagers hurrying home, the spinning wheel, burning thread, the door bolt, a figure behind the window.
'use strict';
const kq = (s) => (s > 1.5 ? 2.6 : s > 0.85 ? 1.6 : 1.0);         // bake resolution for an on-screen scale

// ---------------------------------------------------------------- the young woman
function kiz(ctx, x, y, s, o = {}) {
  drawFace(ctx, 'kiz', x, y, s, o.rot || 0, Object.assign({ rig: 'lantern', outfit: 'entari', k: o.k || kq(s) }, o));
}
function kizBack(ctx, x, y, s, o = {}) {
  drawFace(ctx, 'kiz', x, y, s, o.rot || 0, Object.assign({ rig: 'lantern', outfit: 'entari', hair: 'back_down', back: true, k: o.k || kq(s) }, o));
}
// raised forearms + fists seen from behind (pounding on a door); u: 0 = arm back, 1 = fist on the door
function poundingArms(ctx, x, y, s, u, side, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const sh = [side * 205, 330], fist = [side * (120 + 30 * (1 - u)), -40 - 120 * u], elb = [side * 285, 150 - 40 * u];
  ctx.fillStyle = o.sleeve || '#3a1418';
  ctx.beginPath(); ctx.moveTo(sh[0] - side * 70, sh[1]); ctx.quadraticCurveTo(elb[0] + side * 40, elb[1] + 40, elb[0] + side * 30, elb[1]);
  ctx.lineTo(fist[0] + side * 34, fist[1] + 30); ctx.lineTo(fist[0] - side * 30, fist[1] + 46); ctx.quadraticCurveTo(elb[0] - side * 40, elb[1] - 10, sh[0] - side * 130, sh[1] - 20); ctx.closePath(); ctx.fill();
  // rim of lamplight on the sleeve
  ctx.strokeStyle = o.rim || 'rgba(255,170,90,0.35)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(elb[0] + side * 30, elb[1]); ctx.lineTo(fist[0] + side * 34, fist[1] + 30); ctx.stroke();
  // fist
  ctx.fillStyle = o.skin || '#5a3a2c';
  ctx.beginPath(); ctx.ellipse(fist[0], fist[1], 44, 52, side * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,180,110,0.25)'; ctx.beginPath(); ctx.ellipse(fist[0] + side * 14, fist[1] - 12, 22, 26, side * 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the creature
function creature(ctx, x, y, s, o = {}) {
  const full = !!o.full;
  drawFace(ctx, 'carsamba', x, y, s, o.rot || 0, Object.assign({ rig: 'moonTop', outfit: 'rags', full, features: false, k: o.k || (full ? (s > 0.6 ? 1.0 : 0.6) : kq(s)) }, o));
  if ((o.eye ?? 1) > 0) creatureEye(ctx, x, y, s, o.rot || 0, (o.eye ?? 1) * (o.alpha ?? 1), o.t || 0);
}
// one pale eye in the gap of the hair
function creatureEye(ctx, x, y, s, rot, a, t) {
  if (s < 0.12) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = clamp(a);
  const ex = -61, ey = -56;
  ctx.fillStyle = 'rgba(8,6,6,0.85)'; ctx.beginPath(); ctx.ellipse(ex, ey, 15, 9, 0.05, 0, TAU); ctx.fill();
  const ig = ctx.createRadialGradient(ex + 1, ey, 0.5, ex + 1, ey, 8);
  ig.addColorStop(0, '#0b0b0b'); ig.addColorStop(0.3, '#c9ccc0'); ig.addColorStop(0.85, '#9da196'); ig.addColorStop(1, 'rgba(40,40,40,0)');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + 1, ey, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + 1, ey, 1.6, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(235,240,255,${0.8 + 0.2 * Math.sin(t * 9)})`; ctx.beginPath(); ctx.arc(ex + 3.5, ey - 2.5, 1.3, 0, TAU); ctx.fill();
  ctx.restore();
}
// the creature moving at inhuman speed: a ghost trail of the full figure, smeared
function creatureStreak(ctx, x, y, s, dx, dy, o = {}) {
  const n = o.n ?? 6;
  blurred(ctx, o.blur ?? 6, (g) => {
    for (let i = n - 1; i >= 0; i--) {
      const u = i / n;
      creature(g, x - dx * u, y - dy * u, s, { full: true, alpha: (o.alpha ?? 1) * (i === 0 ? 1 : 0.42 * (1 - u)), eye: i === 0 ? (o.eye ?? 0.8) : 0, t: o.t, keyGain: o.keyGain, rimGain: o.rimGain });
    }
  });
}
// hair-edged silhouette standing behind a window (clipped to the pane)
function windowFigure(ctx, quad, a, t, slide = 0) {
  if (a <= 0) return;
  const [tl, tr, br, bl] = quad;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.clip();
  const w = tr[0] - tl[0], h = bl[1] - tl[1], cx = lerp(tl[0], tr[0], 0.42 + slide), cy = tl[1] + h * 0.5;
  ctx.globalAlpha = a; ctx.filter = `blur(${Math.max(1, w * 0.012).toFixed(1)}px)`; ctx.fillStyle = '#05060a';
  ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.06, w * 0.17, h * 0.2, 0, 0, TAU); ctx.fill();                // head
  ctx.beginPath(); ctx.moveTo(cx - w * 0.36, bl[1] + 4); ctx.quadraticCurveTo(cx - w * 0.3, cy + h * 0.12, cx - w * 0.12, cy + h * 0.1);
  ctx.lineTo(cx + w * 0.12, cy + h * 0.1); ctx.quadraticCurveTo(cx + w * 0.3, cy + h * 0.12, cx + w * 0.36, bl[1] + 4); ctx.closePath(); ctx.fill();
  // tangled hair strands falling past the shoulders
  ctx.filter = 'none'; ctx.strokeStyle = 'rgba(5,6,10,0.9)'; ctx.lineWidth = Math.max(1, w * 0.008);
  const r = mulberry32(31);
  for (let i = 0; i < 40; i++) {
    const sx = cx + (r() - 0.5) * w * 0.34, sy = cy - h * 0.2 + r() * h * 0.1, l = h * (0.3 + r() * 0.35), sw = Math.sin(t * 2 + i) * w * 0.01;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + (r() - 0.5) * w * 0.2, sy + l * 0.4, sx + (r() - 0.5) * w * 0.25 + sw, sy + l * 0.7, sx + (r() - 0.5) * w * 0.3 + sw, sy + l); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- villagers (dusk silhouettes, walking away)
function villager(ctx, x, y, hp, t, o = {}) {
  const k = hp / 170, ph = t * (o.rate || 9) + (o.ph || 0), bob = Math.abs(Math.sin(ph)) * 3 * k, sw = Math.sin(ph);
  ctx.save(); ctx.translate(x, y - bob); ctx.scale(k, k);
  ctx.fillStyle = o.col || 'rgba(14,11,14,0.96)';
  // legs (scissoring), long skirt for women
  if (o.woman) {
    ctx.beginPath(); ctx.moveTo(-17, -88); ctx.lineTo(17, -88); ctx.lineTo(24 + sw * 4, -6); ctx.lineTo(-24 - sw * 4, -6); ctx.closePath(); ctx.fill();
    ctx.fillRect(-12 + sw * 7, -8, 9, 8); ctx.fillRect(4 - sw * 7, -8, 9, 8);
  } else {
    ctx.save(); ctx.translate(-6, -86); ctx.rotate(sw * 0.35); ctx.fillRect(-6, 0, 12, 86); ctx.restore();
    ctx.save(); ctx.translate(6, -86); ctx.rotate(-sw * 0.35); ctx.fillRect(-6, 0, 12, 86); ctx.restore();
  }
  // torso, arms swinging, head (scarf / cap)
  ctx.beginPath(); ctx.moveTo(-19, -140); ctx.quadraticCurveTo(-23, -110, -17, -84); ctx.lineTo(17, -84); ctx.quadraticCurveTo(23, -110, 19, -140); ctx.closePath(); ctx.fill();
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 18, -136); ctx.rotate(-sd * 0.05 + sw * sd * 0.3); ctx.fillRect(-4.5, 0, 9, 52); ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(0, -152, 11, 13, 0, 0, TAU); ctx.fill();
  if (o.woman) { ctx.beginPath(); ctx.moveTo(-14, -160); ctx.quadraticCurveTo(0, -176, 14, -160); ctx.lineTo(19, -128); ctx.lineTo(-19, -128); ctx.closePath(); ctx.fill(); }
  else { ctx.fillRect(-13, -167, 26, 8); }
  if (o.basket) { ctx.beginPath(); ctx.ellipse(26, -96, 15, 10, 0, 0, TAU); ctx.fill(); }
  // warm rim from the low sun behind them
  ctx.strokeStyle = o.rim || 'rgba(255,150,80,0.35)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(0, -152, 11, 13, 0, -1.9, -0.4); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- spinning wheel (çıkrık)
// (x,y) wheel hub, R radius in px, ang rotation, light: {x,y} screen pos of the oil lamp, k: 0..1 brightness
function spinningWheel(ctx, x, y, R, ang, o = {}) {
  const lx = o.lightX ?? x - R * 3, lk = o.k ?? 1, blurSp = o.speed || 0;
  ctx.save();
  const wood = (a) => `rgba(${(92 * a) | 0},${(60 * a) | 0},${(36 * a) | 0},1)`;
  const side = clamp((x - lx) / (R * 4) + 0.5);
  // stand: two legs and the base beam
  ctx.strokeStyle = wood(0.55 * lk); ctx.lineWidth = R * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - R * 0.55, y + R * 1.35); ctx.moveTo(x, y); ctx.lineTo(x + R * 0.45, y + R * 1.35); ctx.stroke();
  ctx.lineWidth = R * 0.09; ctx.beginPath(); ctx.moveTo(x - R * 1.9, y + R * 1.35); ctx.lineTo(x + R * 0.7, y + R * 1.35); ctx.stroke();
  // spindle holder on the left with the yarn cop
  const sx = x - R * 1.75, sy = y + R * 0.55;
  ctx.lineWidth = R * 0.06; ctx.beginPath(); ctx.moveTo(sx, y + R * 1.35); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,30,22,1)'; ctx.lineWidth = R * 0.025; ctx.beginPath(); ctx.moveTo(sx - R * 0.45, sy); ctx.lineTo(sx + R * 0.25, sy); ctx.stroke();
  ctx.fillStyle = linGrad(ctx, 0, sy - R * 0.1, 0, sy + R * 0.1, [[0, `rgba(${226 * lk | 0},${214 * lk | 0},${186 * lk | 0},1)`], [1, `rgba(${120 * lk | 0},${108 * lk | 0},${90 * lk | 0},1)`]]);
  ctx.beginPath(); ctx.ellipse(sx - R * 0.16, sy, R * 0.2, R * 0.1, 0, 0, TAU); ctx.fill();               // the cop of spun thread
  // drive band from wheel rim to the spindle whorl
  ctx.strokeStyle = `rgba(${200 * lk | 0},${186 * lk | 0},${160 * lk | 0},0.55)`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - R * 0.2, y - R * 0.98); ctx.lineTo(sx + R * 0.12, sy - R * 0.04); ctx.moveTo(x - R * 0.2, y + R * 0.98); ctx.lineTo(sx + R * 0.12, sy + R * 0.04); ctx.stroke();
  // rim (seen slightly from the side: ellipse), spokes with motion blur, hub
  const ry = R, rx = R * 0.86;
  ctx.lineWidth = R * 0.075; ctx.strokeStyle = wood(0.75 * lk); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = R * 0.03; ctx.strokeStyle = `rgba(${255 * lk | 0},${170 * lk | 0},${90 * lk | 0},${0.35 * side})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
  const reps = blurSp > 0.5 ? 5 : 1;
  for (let rr = 0; rr < reps; rr++) {
    ctx.globalAlpha = reps > 1 ? 0.32 : 1;
    ctx.strokeStyle = wood(0.62 * lk); ctx.lineWidth = R * 0.035;
    for (let k = 0; k < 10; k++) {
      const a = ang - rr * blurSp * 0.06 + k / 10 * TAU;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rx * 0.12, y + Math.sin(a) * ry * 0.12); ctx.lineTo(x + Math.cos(a) * rx * 0.97, y + Math.sin(a) * ry * 0.97); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = wood(0.9 * lk); ctx.beginPath(); ctx.arc(x, y, R * 0.11, 0, TAU); ctx.fill();
  // crank handle
  const ca = ang * 1.0;
  ctx.strokeStyle = wood(0.8 * lk); ctx.lineWidth = R * 0.06;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ca) * R * 0.32, y + Math.sin(ca) * R * 0.32); ctx.stroke();
  ctx.restore();
  return { spindle: [sx - R * 0.16, sy], tip: [sx - R * 0.45, sy] };
}
// flame front running along a polyline (fraction prog), the burnt part glowing, then a flare at the end
function fireAlong(ctx, pts, prog, t, a = 1, flare = 0) {
  if (a <= 0) return;
  const n = pts.length - 1, upto = prog * n;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i <= Math.min(n, Math.floor(upto)); i++) {
    const [px, py] = pts[i], age = upto - i, f = 0.6 + 0.4 * n1(t * 18 + i, 3);
    const hgt = (14 + 26 * Math.exp(-age * 0.25)) * f * a;
    radialEllipse(ctx, px, py - hgt * 0.5, hgt * 0.45, hgt, [[0, `rgba(255,230,160,${0.55 * a})`], [0.4, `rgba(255,140,40,${0.35 * a})`], [1, 'rgba(120,20,0,0)']]);
  }
  if (flare > 0) {
    const [ex, ey] = pts[Math.min(n, Math.floor(upto))];
    const fr = 120 * flare * (0.85 + 0.15 * n1(t * 20, 5));
    radialEllipse(ctx, ex, ey - fr * 0.4, fr * 0.6, fr, [[0, `rgba(255,240,190,${0.9 * a})`], [0.35, `rgba(255,150,50,${0.6 * a})`], [1, 'rgba(120,20,0,0)']]);
    // flame tongues
    for (let k = 0; k < 7; k++) {
      const ph = t * 6 + k * 1.7, w = fr * 0.16, hh = fr * (0.8 + 0.5 * Math.abs(n1(ph, k)));
      const bx = ex + (k - 3) * w * 0.7 + n1(ph * 1.3, k + 9) * w * 0.4;
      ctx.fillStyle = `rgba(255,${150 + k * 10},60,${0.35 * a})`;
      ctx.beginPath(); ctx.moveTo(bx - w, ey); ctx.quadraticCurveTo(bx - w * 0.6 + n1(ph, 1) * w, ey - hh * 0.6, bx + n1(ph * 2, 2) * w * 0.8, ey - hh);
      ctx.quadraticCurveTo(bx + w * 0.6, ey - hh * 0.5, bx + w, ey); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  // sparks
  const r = mulberry32(7);
  ctx.fillStyle = 'rgba(255,200,120,0.9)';
  for (let i = 0; i < 26 * a; i++) {
    const p = pts[Math.floor(r() * Math.max(1, Math.min(n, upto)))], life = (t * (0.8 + r()) + r()) % 1;
    ctx.globalAlpha = (1 - life) * a; ctx.fillRect(p[0] + (r() - 0.5) * 30 + n1(t * 3 + i, i) * 20, p[1] - life * 140, 2.2, 2.2);
  }
  ctx.restore();
}
// smoke wisps rising from a point
function smoke(ctx, x, y, t, a, sc = 1) {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const life = (t * 0.35 + i / 6) % 1, px = x + n1(t * 0.6 + i, i) * 40 * sc + life * 30 * sc, py = y - life * 260 * sc;
    ctx.globalAlpha = a * (1 - life) * 0.35; ctx.fillStyle = '#6d6a66';
    ctx.filter = `blur(${(6 + life * 16) * sc}px)`; ctx.beginPath(); ctx.arc(px, py, (14 + life * 50) * sc, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the door bolt (room_door view)
// open: 0 = shot home in the keeper, 1 = drawn back; jit: rattle offset (m)
function doorBolt(ctx, plate, cam, open, jit, light = 1) {
  const X = 54.505, y = 1.05;
  const P = (z, yy) => toCanvas(plate, proj3('room_door', [X, yy, z]), cam);
  const z0 = 1.2 + open * 0.16 + jit, z1 = z0 + 0.34;
  const quad = (za, zb, ya, yb, fill) => { const a = P(za, ya), b = P(zb, ya), c = P(zb, yb), d = P(za, yb); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
  const L = (v) => `rgba(${(22 + 120 * v * light) | 0},${(21 + 92 * v * light) | 0},${(22 + 70 * v * light) | 0},1)`;
  // back plate, keeper on the frame, staples, bar, knob
  quad(1.12, 1.27, y - 0.06, y + 0.06, L(0.12));
  quad(1.36, 1.68, y - 0.035, y + 0.035, L(0.18));
  quad(z0, z1, y - 0.014, y + 0.014, L(0.55));
  quad(z0, z1, y + 0.006, y + 0.014, L(0.95));
  for (const zs of [1.42, 1.6]) quad(zs, zs + 0.03, y - 0.026, y + 0.026, L(0.32));
  const kz = z0 + 0.2, a = P(kz, y), b = P(kz, y - 0.09);
  ctx.strokeStyle = L(0.6); ctx.lineWidth = Math.max(2, Math.abs(a[0] - P(kz + 0.02, y)[0])); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}
