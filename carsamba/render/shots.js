// ÇARŞAMBA KARISI — 30 s viral intro, shot list. Each shot: {a, b, f(ctx, t, lt, u), x: dissolve-in, fin, fout}.
'use strict';
const E = window.TL.events;
const at = (k, i = 0) => (Array.isArray(E[k]) ? E[k][i] : E[k]);

// ---------- helpers ----------
const WHEEL3 = [52.6, 0.5, 2.0], WHEEL_R = 0.26;
function mirrorX(ctx, x, fn) { ctx.save(); ctx.translate(2 * x, 0); ctx.scale(-1, 1); const r = fn(); ctx.restore(); return r; }
const NIGHT = { bloom: 0.3, tint: '#0b1d33', tintA: 0.5, dark: '#a9b6d2', vig: 0.9, vin: 0.24 };
function nightSky(ctx, t, plate, cam, hzPlate = 1200, o = {}) {
  const [, hy] = toCanvas(plate, [0, hzPlate], cam);
  drawNightSky(ctx, t, Object.assign({ horizon: hy, moonX: W * 0.66, moonY: Math.max(110, hy - 640), ridge: false, wind: 18 }, o));
}
function runBob(t, f = 2.7) { return { y: Math.abs(Math.sin(t * Math.PI * f)), x: Math.sin(t * Math.PI * f), r: Math.sin(t * Math.PI * f) * 0.035 }; }
function shakeAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, r: (a.r || 0) + (b.r || 0) }; }
function jolt(t, times, amp = 22, d = 0.18) {
  let x = 0, y = 0, r = 0;
  for (const k of times) { const p = pulse(t, k, d); if (p > 0) { x += n1(t * 60, k * 7) * amp * p; y += (n1(t * 55, k * 3) * 0.6 + 0.6) * amp * p; r += n1(t * 40, k) * 0.01 * p; } }
  return { x, y, r };
}
function zoomBlur(ctx, cx, cy, amt, n = 4) {
  if (amt <= 0.002) return;
  const c = makeCanvasCached('zb', W, H), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 1; i <= n; i++) { const k = 1 + amt * i / n; ctx.globalAlpha = 0.55 / (i + 1); ctx.drawImage(c, cx - cx * k, cy - cy * k, W * k, H * k); }
  ctx.restore();
}
function glitch(ctx, t, amt) {
  if (amt <= 0) return;
  const c = makeCanvasCached('gl', W, H), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const r = mulberry32(Math.floor(t * 24) * 13 + 5);
  for (let i = 0; i < 9 * amt; i++) { const y = r() * H, h = 20 + r() * 120, dx = (r() - 0.5) * 140 * amt; ctx.drawImage(c, 0, y, W, h, dx, y, W, h); }
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35 * amt;
  ctx.drawImage(c, 10 * amt, 0); ctx.fillStyle = 'rgba(255,0,0,0.25)'; ctx.globalCompositeOperation = 'multiply';
  ctx.restore();
}
function flash(ctx, col, a, op = 'source-over') { if (a <= 0) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = op; ctx.globalAlpha = clamp(a); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function tagHalk(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.9; ctx.font = '700 30px Inter, "DejaVu Sans", sans-serif'; ctx.textBaseline = 'middle';
  const txt = 'HALK ANLATISI · CANLANDIRMA', w = ctx.measureText(txt).width + 32;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(48, 150, w, 54); ctx.fillStyle = '#c40d16'; ctx.fillRect(48, 150, 6, 54);
  ctx.fillStyle = '#ece6de'; ctx.fillText(txt, 68, 178); ctx.restore();
}
function bigTitle(ctx, t, a, text) {
  if (a <= 0) return;
  const fl = Math.abs(n1(t * 31, 4)) > 0.75 ? 0.55 : 1;
  ctx.save(); ctx.globalAlpha = clamp(a) * fl; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = 128; ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`;
  const lines = text.split(' ');
  const mw = Math.max(...lines.map((l) => ctx.measureText(l).width)); if (mw > 960) { size = Math.floor(size * 960 / mw); ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`; }
  const sc = 1.08 - 0.08 * easeOut(clamp(a));
  ctx.translate(W / 2, 760); ctx.scale(sc, sc);
  lines.forEach((l, i) => {
    const y = (i - (lines.length - 1) / 2) * size * 1.02, gx = Math.abs(n1(t * 9 + i, 9)) > 0.7 ? n1(t * 70, 3 + i) * 12 : 0;
    ctx.shadowColor = 'rgba(227,20,28,0.8)'; ctx.shadowBlur = 50; ctx.fillStyle = '#c40d16'; ctx.fillText(l, gx, y);
    ctx.shadowBlur = 0; ctx.globalAlpha *= 0.5; ctx.fillStyle = '#ffd0d0'; ctx.fillText(l, gx - 4, y - 2); ctx.globalAlpha /= 0.5;
  });
  ctx.restore();
}
function dust(ctx, t, n, a, region, speed = 1, seed = 3) {
  const r = mulberry32(seed);
  ctx.save(); ctx.fillStyle = '#cbbfae';
  for (let i = 0; i < n; i++) {
    const sp = (0.3 + r()) * speed, ph = r() * 100;
    const x = region.x + ((r() * region.w + t * 60 * sp + Math.sin(t * 0.7 + ph) * 40) % region.w + region.w) % region.w;
    const y = region.y + ((r() * region.h + Math.cos(t * 0.5 + ph) * 30 - t * 15 * sp) % region.h + region.h) % region.h;
    ctx.globalAlpha = a * (0.3 + 0.7 * Math.abs(Math.sin(t * sp + ph))); ctx.beginPath(); ctx.arc(x, y, 1 + r() * 2.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function birds(ctx, t, a) {
  const r = mulberry32(12);
  ctx.save(); ctx.strokeStyle = `rgba(30,18,22,${a})`; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = ((r() * W + t * (60 + r() * 40)) % (W + 200)) - 100, y = 220 + r() * 380 + Math.sin(t * 1.3 + i) * 10, s = 7 + r() * 6, f = Math.sin(t * 9 + i * 2) * 0.6;
    ctx.beginPath(); ctx.moveTo(x - s, y - s * f); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - s * f); ctx.stroke();
  }
  ctx.restore();
}
// creature dart positions in the chase: snaps between spots (inhuman speed)
function dartPos(t, t0, spots, hold) {
  const k = Math.max(0, (t - t0) / hold), i = Math.min(spots.length - 1, Math.floor(k)), f = k - Math.floor(k);
  const a = spots[i], b = spots[Math.min(spots.length - 1, i + 1)], mv = smooth(clamp((f - 0.78) / 0.22));
  return { p: [lerp(a[0], b[0], mv), lerp(a[1], b[1], mv)], moving: mv > 0 && mv < 1, d: [b[0] - a[0], b[1] - a[1]] };
}

let SHOTS = [
  // ======================= S1: the chase (0 - 4.1) =======================
  { a: 0, b: at('low'), f: (ctx, t, lt, u) => {
    const P = 'street_run', bob = runBob(t);
    const cam = camLerp({ cx: 690, cy: 1160, zoom: 1.32 }, { cx: 680, cy: 1150, zoom: 1.18 }, u, (x) => x);
    cam.shake = shakeAdd(handheld(t, 2.4, 4), { x: bob.x * 7, y: bob.y * 12, r: bob.r * 0.2 });
    nightSky(ctx, t, P, cam);
    bgDrawBlur(ctx, P, cam, { lamp: lampFlicker(t, 3, 0.3) * 1.05 }, 3.5);
    // the thing behind her, darting from side to side down the street
    const dp = dartPos(t, 0, [[1.5, -6.5], [0.85, -5.2], [1.75, -3.9], [0.9, -2.6], [1.45, -1.2]], 0.29);
    const [cx_, cy_, cs] = place('street_run', P, cam, [dp.p[0], 1.62, dp.p[1]]);
    if (dp.moving) { const [qx, qy] = place('street_run', P, cam, [dp.p[0] - dp.d[0] * 0.25, 1.62, dp.p[1] - dp.d[1] * 0.25]); creatureStreak(ctx, cx_, cy_, cs, cx_ - qx, cy_ - qy, { n: 5, blur: 4, t, keyGain: 1.6, rimGain: 2 }); }
    else blurred(ctx, 2.5, (g) => creature(g, cx_, cy_, cs, { full: true, t, keyGain: 1.6, rimGain: 2 }));
    // her: running toward the camera, screaming
    const gz = 4.0 - 0.9, gy = 1.47 + bob.y * 0.022;
    const [gx, gyy, gs] = place('street_run', P, cam, [0.12 + bob.x * 0.015, gy, gz]);
    const scream = lt < 0.95 ? 1.5 : 0.7 + 0.2 * Math.sin(t * 9);
    blurred(ctx, 1.6, (g) => kiz(g, gx, gyy, gs, { long: true, rig: 'moonV', rot: bob.r, mouth: scream, wide: 1, raise: 1, knit: 0.5, look: [lt > 0.9 ? -0.7 : 0, 0], keyGain: 1.1, rimGain: 1.2, t }));
    drawFog(ctx, t, 0.05, 50, 4, 1, H * 0.55, H);
    grade(ctx, NIGHT);
  } },
  { a: at('low'), b: at('crash'), f: (ctx, t, lt, u) => {
    const P = 'creature_low';
    const cam = camLerp({ cx: 640, cy: 1380, zoom: 1.12 }, { cx: 660, cy: 1340, zoom: 1.2 }, u);
    cam.shake = handheld(t, 2.0, 7);
    nightSky(ctx, t, P, cam, 900);
    bgDraw(ctx, P, cam, { lamp: lampFlicker(t, 3, 0.6) * 1.1 });
    // the creature closing in by jumps: frames skip, it is suddenly nearer each time
    const k = Math.min(3, Math.floor(lt / 0.3)), zs = [-8, -5.2, -2.9, -1.0], xs = [-0.2, 0.9, 0.1, 0.55];
    const [cx_, cy_, cs] = place('creature_low', P, cam, [xs[k], 1.62, zs[k]]);
    const pop = pulse(lt, k * 0.3, 0.12);
    blurred(ctx, k === 3 ? 4 : 2, (g) => creature(g, cx_ + n1(t * 40, 2) * 6 * pop, cy_, cs, { full: true, t, keyGain: 1.6, rimGain: 2.2 }));
    flash(ctx, 'rgba(255,255,255,1)', pop * 0.18, 'screen');
    // she flees past the low camera (foreground blur)
    if (lt < 0.32) { const e = lt / 0.32; blurred(ctx, 14, (g) => kizBack(g, lerp(560, -380, e), 1020, 1.9, { rig: 'moonV', keyGain: 0.6 })); }
    drawFog(ctx, t, 0.07, 70, 4, 2, H * 0.6, H);
    grade(ctx, NIGHT);
  } },
  { a: at('crash'), b: at('door'), f: (ctx, t, lt, u) => {
    // crash zoom into her screaming face
    const P = 'street_run', bob = runBob(t, 2.9);
    const cam = { cx: 700, cy: 1150, zoom: 1.5 }; cam.shake = shakeAdd(handheld(t, 3.2, 11), { x: bob.x * 9, y: bob.y * 14, r: 0 });
    nightSky(ctx, t, P, cam);
    bgDrawBlur(ctx, P, cam, { lamp: lampFlicker(t, 3, 0.5) * 1.1 }, 9);
    const zk = 1 + 1.9 * Math.pow(clamp((lt - 0.08) / 1.38), 2.2);
    const base = 0.95, s = base * zk;
    const fx = W / 2 + bob.x * 10 + cam.shake.x, fy = 940 + (1 - zk) * -260 + bob.y * 18 + cam.shake.y;
    const mouth = 0.6 + 0.9 * smooth(seg(lt, 0.6, 0.9));
    kiz(ctx, fx, fy, s, { long: true, rig: 'moonV', rot: bob.r * 0.5, mouth, wide: 1, raise: 1, knit: 0.7, look: [0.1, -0.1], pupil: 0.2, keyGain: 1.15, rimGain: 1.3, wet: 0.8, tears: 0.4, t });
    zoomBlur(ctx, W / 2, 900, 0.06 * smooth(seg(lt, 0.4, 1.4)));
    grade(ctx, NIGHT);
    flash(ctx, '#fff', pulse(t, at('hit1') - 0.02, 0.1) * 0.85, 'screen');
  } },

  // ======================= S2: the door (4.1 - 9.6) =======================
  { a: at('door'), b: at('front'), f: (ctx, t, lt, u) => {
    // over her shoulder: the door jolts under her fists, dust drops from the lintel
    const P = 'door_pov';
    const d0 = proj3('door_pov', [-2.04, 1.25, -4.33]);
    const cam = camLerp({ cx: d0[0] + 40, cy: d0[1] + 80, zoom: 1.9 }, { cx: d0[0] + 30, cy: d0[1] + 60, zoom: 2.05 }, u);
    cam.shake = shakeAdd(handheld(t, 1.4, 9), jolt(t, E.pounds, 14, 0.16));
    nightSky(ctx, t, P, cam, 1150);
    const lk = lampFlicker(t, 5, 0.4);
    bgDraw(ctx, P, cam, { lamp: lk });
    let pu = 0; for (const k of E.pounds) pu = Math.max(pu, pulse(t, k, 0.22));
    // re-draw the door leaf shifted a few pixels on each blow
    const q = (z, y) => toCanvas(P, proj3('door_pov', [-2.03, y, z]), cam);
    const a = q(-4.88, 2.15), b = q(-3.78, 2.15), c = q(-3.78, 0), d = q(-4.88, 0);
    ctx.save(); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.clip();
    bgDraw(ctx, P, Object.assign({}, cam, { shake: shakeAdd(cam.shake, { x: -pu * 7, y: pu * 2, r: 0 }) }), { lamp: lk });
    ctx.fillStyle = `rgba(0,0,0,${0.15 * pu})`; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    dust(ctx, t, 40, 0.45 * clamp(pu + 0.25), { x: Math.min(a[0], d[0]) - 40, y: a[1] - 60, w: Math.abs(b[0] - a[0]) + 80, h: Math.abs(d[1] - a[1]) }, 0.4, 9);
    // her head and shoulders, out of focus in the foreground, lurching with each blow
    blurred(ctx, 7, (g) => kizBack(g, W * 0.3 + pu * 26, 1260 - pu * 18, 1.55, { long: true, rig: 'lantern', keyGain: 0.35, rimGain: 1.4 }));
    grade(ctx, NIGHT);
  } },
  { a: at('front'), b: at('black2'), f: (ctx, t, lt, u) => {
    // facing her from the door: the street behind her, then the thing is right behind her
    const P = 'street_run';
    const push = smooth(seg(t, at('steps_stop'), at('scare')));
    const cam = { cx: 640, cy: 1140, zoom: 1.4 + 0.12 * push };
    cam.shake = shakeAdd(handheld(t, 1.0 + (t > at('scare') ? 6 : 0), 13), jolt(t, E.pounds.filter((k) => k > at('front')), 18, 0.18));
    nightSky(ctx, t, P, cam);
    const lampK = lampFlicker(t, 8, t > at('appear') ? 0.8 : 0.2);
    bgDrawBlur(ctx, P, cam, { lamp: lampK }, 8);
    const stop = smooth(seg(t, at('steps_stop'), at('steps_stop') + 0.4));
    const turn = smooth(seg(t, at('steps_stop') + 0.35, at('appear') + 0.3));
    // the creature right behind her (over her left shoulder) — pops in on one frame
    const [hx, hy, hs] = place('street_run', P, cam, [0.22 - turn * 0.03, 1.5, 4.0 - 0.72]);
    const lunge = easeIn(clamp((t - at('scare')) / 0.14));
    if (t >= at('appear')) {
      const [qx, qy, qs] = place('street_run', P, cam, [0.62, 1.58, 4.0 - 1.25]);
      const s2 = lerp(qs, hs * 2.7, lunge), x2 = lerp(qx, W * 0.5, lunge), y2 = lerp(qy, 980, lunge);
      if (lunge < 0.999) blurred(ctx, lerp(3, 0, lunge), (g) => creature(g, x2, y2, s2, { long: true, rig: 'lantern', t, keyGain: 0.6, rimGain: 1.6, eye: 1 }));
    }
    // her
    const pu = E.pounds.reduce((m, k) => Math.max(m, k > at('front') ? pulse(t, k, 0.25) : 0), 0);
    if (lunge < 0.6) kiz(ctx, hx, hy + pu * 14, hs * (1 + pu * 0.03), {
      long: true, rig: 'moonV', rot: turn * 0.07, mouth: lerp(0.35, 0.15, stop) + 0.6 * smooth(seg(t, at('scare') - 0.1, at('scare'))),
      wide: 0.6 + 0.4 * stop, raise: 0.6 + 0.4 * stop, knit: 0.5, look: [-0.95 * turn, 0.05], pupil: 0.25, keyGain: 1.0, rimGain: 0.9 * lampK + 0.2, wet: 0.6, t,
    });
    if (t >= at('scare')) {
      const sc = lunge;
      creature(ctx, lerp(W * 0.42, W * 0.5, sc), lerp(1000, 980, sc), lerp(hs * 1.4, hs * 3.1, sc), { long: true, rig: 'lantern', t, keyGain: 0.6, rimGain: 1.6, eye: 1 });
      flash(ctx, '#fff', pulse(t, at('scare'), 0.08) * 0.9, 'screen');
      flash(ctx, '#9a0008', (t - at('scare')) * 2.2, 'multiply');
    }
    breathVapour(ctx, t, hx + 10, hy + 160 * hs, 1.6, 1, 0.12 * (1 - push * 0.5), hs * 1.2);
    grade(ctx, NIGHT);
    glitch(ctx, t, t > at('scare') ? 1 : 0);
  } },
  { a: at('black2'), b: at('far'), f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },
  { a: at('far'), b: at('village'), fout: 0.12, f: (ctx, t, lt, u) => {
    // and then it just stands there, far down the street under the lantern
    const P = 'street_run';
    const cam = camLerp({ cx: 760, cy: 1150, zoom: 1.6 }, { cx: 770, cy: 1140, zoom: 1.85 }, u, (x) => x);
    cam.shake = handheld(t, 0.8, 21);
    nightSky(ctx, t, P, cam);
    const lk = lampFlicker(t, 2, 0.9);
    bgDraw(ctx, P, cam, { lamp: lk });
    const [cx_, cy_, cs] = place('street_run', P, cam, [0.95, 1.62, -6.4]);
    creature(ctx, cx_, cy_, cs, { full: true, t, keyGain: 0.5 + 0.6 * lk, rimGain: 1.6, eye: 0.6 });
    drawFog(ctx, t, 0.08, 20, 5, 3, H * 0.45, H);
    grade(ctx, NIGHT);
  } },

  // ======================= S3: origin of the legend (9.6 - 15.6) =======================
  { a: at('village'), b: at('dusk'), fin: 0.15, f: (ctx, t, lt, u) => {
    const P = 'village_sunset';
    const cam = camLerp({ cx: 675, cy: 1240, zoom: 1.0 }, { cx: 690, cy: 1220, zoom: 1.1 }, u, (x) => x);
    const [, hy] = toCanvas(P, [0, 965], cam);
    drawSunsetSky(ctx, t, { horizon: hy, sunX: W * 0.16, sunY: hy - 70, ridgeH: 150 });
    bgDraw(ctx, P, cam);
    for (const [px, py] of [[520, 1060], [905, 1110], [300, 1290], [1130, 1210]]) { const [sx, sy, sc] = toCanvas(P, [px, py], cam); smoke(ctx, sx, sy, t + px, 0.5, sc * 0.9); }
    birds(ctx, t, 0.75);
    grade(ctx, { bloom: 0.42, tint: '#4a1e08', tintA: 0.22, vig: 0.78, vin: 0.3 });
    const ca = smooth(seg(t, at('card', 0), at('card', 0) + 0.35)) * (1 - smooth(seg(t, at('card', 1) - 0.3, at('card', 1))));
    cardLabel(ctx, ca, 'EGE’NİN ESKİ KÖYLERİ', 'TİRE · ÖDEMİŞ · BAYINDIR', 300);
  } },
  { a: at('dusk'), b: at('windows'), x: 0.25, f: (ctx, t, lt, u) => {
    const P = 'dusk_street';
    const cam = camLerp({ cx: 690, cy: 1220, zoom: 1.12 }, { cx: 680, cy: 1210, zoom: 1.2 }, u);
    cam.shake = handheld(t, 0.7, 31);
    const [, hy] = toCanvas(P, [0, 1180], cam);
    drawDuskSky(ctx, t, { horizon: hy });
    bgDraw(ctx, P, cam, { lamp: 0.7 });
    // a door on the right is pulled shut (doorway glow, then the leaf swings home)
    const close = smooth(seg(t, at('door3'), at('door3') + 0.45));
    if (close < 1) {
      const dz = -0.51, x = 2.04, q = (z, y) => toCanvas(P, proj3('dusk_street', [x, y, z]), cam);
      const a = q(dz - 0.55, 2.15), b = q(dz + 0.55, 2.15), c = q(dz + 0.55, 0), d = q(dz - 0.55, 0);
      ctx.save(); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
      ctx.fillStyle = linGrad(ctx, 0, a[1], 0, d[1], [[0, '#1a0d06'], [0.6, '#6a3a18'], [1, '#c0742e']]); ctx.globalAlpha = 1 - close * 0.0; ctx.fill(); ctx.restore();
      doorLeaf(ctx, 'dusk_street', P, cam, { hinge: [x, dz + 0.55], dir: [0, -1], width: 1.1, height: 2.15, angle: 1.35 * (1 - close), swing: 1, color: '#3b2a1f', shade: (uu, ang) => 0.55 - ang * 0.2 });
    }
    // villagers hurrying home before dark
    const walkers = [[-0.55, 2.2, 1.7, 1, 1, 0], [0.75, 0.8, 1.9, 0, 0, 1.2], [0.05, -2.6, 1.6, 1, 0, 2.1], [0.3, -2.9, 1.15, 1, 0, 2.6]];
    const list = walkers.map(([x, z0, sp, woman, basket, ph]) => ({ x, z: z0 - sp * lt, woman, basket, ph })).sort((a, b) => a.z - b.z);
    for (const w of list) {
      const p = proj3('dusk_street', [w.x, 0, w.z]); if (p[2] < 0.5) continue;
      const [sx, sy] = toCanvas(P, p, cam), hp = window.CAMS.dusk_street.f / p[2] * (w.woman && w.ph > 2.5 ? 1.15 : 1.66) * bgScale(P, cam.zoom);
      villager(ctx, sx, sy, hp, t, { woman: w.woman, basket: w.basket, ph: w.ph, rate: 10 });
    }
    grade(ctx, { bloom: 0.36, tint: '#2a1a3a', tintA: 0.3, vig: 0.85 });
    tagHalk(ctx, smooth(seg(t, at('dusk'), at('dusk') + 0.3)));
  } },
  { a: at('windows'), b: at('tilt'), f: (ctx, t, lt, u) => {
    // closer on the facades: curtains drawn, lamps put out, the street empties; a gust on "gazabından"
    const P = 'dusk_street';
    const cam = camLerp({ cx: 520, cy: 760, zoom: 2.0 }, { cx: 600, cy: 1050, zoom: 1.7 }, u);
    cam.shake = shakeAdd(handheld(t, 0.8, 41), { x: 0, y: 0, r: 0 });
    const [, hy] = toCanvas(P, [0, 1180], cam);
    drawDuskSky(ctx, t, { horizon: hy });
    const gust = smooth(seg(t, at('lightsout', 0) - 0.2, at('lightsout', 0) + 0.3)) * (1 - smooth(seg(t, at('lightsout', 1), at('lightsout', 1) + 0.6)));
    bgDraw(ctx, P, cam, { lamp: 0.7 * (1 - 0.6 * gust * Math.abs(n1(t * 20, 4))) });
    const wins = [[-1, -0.2, 0], [-1, 2.88, 0.12], [1, -1.11, 0.25], [1, 1.22, 0.05], [-1, -3.42, 0.32], [1, -6.02, 0.18]];
    for (const [sd, zc, dl] of wins) {
      const x = sd * 1.535, q = (z, y) => toCanvas(P, proj3('dusk_street', [x, y, z]), cam);
      const tl = q(zc - 0.42, 4.75), tr = q(zc + 0.42, 4.75), br = q(zc + 0.42, 3.45), bl = q(zc - 0.42, 3.45);
      const cur = smooth(seg(t, at('lightsout', 0) + dl - 0.5, at('lightsout', 0) + dl)), off = smooth(seg(t, at('lightsout', 0) + dl, at('lightsout', 0) + dl + 0.25));
      ctx.save(); ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.clip();
      const xa = Math.min(tl[0], bl[0]), xb = Math.max(tr[0], br[0]), ya = Math.min(tl[1], tr[1]), yb = Math.max(bl[1], br[1]);
      // curtain sliding across from one side (dim cloth), then the room light goes out
      ctx.fillStyle = `rgba(70,40,24,${0.85})`; ctx.fillRect(xa, ya, (xb - xa) * cur, yb - ya);
      ctx.fillStyle = `rgba(8,6,10,${off * 0.92})`; ctx.fillRect(xa, ya, xb - xa, yb - ya);
      ctx.restore();
    }
    windLeaves(ctx, t, Math.round(26 * gust), 0.8 * gust, 'rgba(30,22,18,0.95)', 5);
    dust(ctx, t, 60, 0.5 * gust, { x: 0, y: H * 0.45, w: W, h: H * 0.55 }, 4, 7);
    grade(ctx, { bloom: 0.34, tint: '#22183a', tintA: 0.34, vig: 0.9 });
    tagHalk(ctx, 1 - smooth(seg(t, at('tilt') - 0.3, at('tilt'))));
  } },

  // ======================= S4: the creature (15.6 - 21.6) =======================
  { a: at('tilt'), b: at('tilt2'), fin: 0.1, f: (ctx, t, lt, u) => {
    // low on the cobbles: from her bare feet slowly upwards
    const P = 'creature_low', cp = [0.12, 0, 0.25];
    const feet = proj3('creature_low', cp), knee = proj3('creature_low', [cp[0], 0.85, cp[2]]);
    const cam = { cx: feet[0] + 20, cy: lerp(feet[1] - 120, knee[1] + 60, easeInOut(u)), zoom: 2.05 };
    cam.shake = handheld(t, 0.6, 51);
    nightSky(ctx, t, P, cam, 900);
    bgDraw(ctx, P, cam, { lamp: lampFlicker(t, 9, 0.5) });
    const [hx, hy, hs] = place('creature_low', P, cam, [cp[0], 1.62, cp[2]]);
    const [fx, fy] = place('creature_low', P, cam, cp);
    radialEllipse(ctx, fx, fy + 6, 260 * hs * 2.2, 50 * hs * 2.2, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
    // feet anchored to the ground point: scale from the head depth, then shift so the soles touch the cobbles
    const s = hs * 1.0, y0 = fy - 3100 * s;
    creature(ctx, fx, y0, s, { full: true, t, keyGain: 0.85, rimGain: 1.5, eye: 0 });
    drawFog(ctx, t, 0.12, 40, 3, 4, H * 0.55, H);
    grade(ctx, NIGHT);
  } },
  { a: at('tilt2'), b: at('empty'), f: (ctx, t, lt, u) => {
    // second angle: waist to chin… then it is past the camera before we see the face
    const P = 'street_run', cp = [-0.1, 0, 1.25];
    const hip = proj3('street_run', [cp[0], 0.95, cp[2]]), chin = proj3('street_run', [cp[0], 1.5, cp[2]]);
    const rush = clamp((t - at('rush')) / 0.26);
    const cam = { cx: hip[0] + 10, cy: lerp(hip[1], chin[1] + 40, easeInOut(clamp((t - at('tilt2')) / (at('rush') - at('tilt2'))))), zoom: 2.25 };
    cam.shake = shakeAdd(handheld(t, 0.6, 61), { x: n1(t * 50, 3) * 26 * pulse(t, at('rush') + 0.1, 0.5), y: n1(t * 47, 4) * 20 * pulse(t, at('rush') + 0.1, 0.5), r: 0 });
    nightSky(ctx, t, P, cam);
    bgDrawBlur(ctx, P, cam, { lamp: lampFlicker(t, 11, 0.4) }, 4);
    const [fx, fy, fs] = place('street_run', P, cam, cp);
    const [hx, hy, hs] = place('street_run', P, cam, [cp[0], 1.62, cp[2]]);
    if (rush <= 0) creature(ctx, fx, fy - 3100 * hs, hs, { full: true, rig: 'lantern', t, keyGain: 0.4, rimGain: 1.5, eye: 0 });
    else if (rush < 1) {
      const e = easeIn(rush), x = lerp(fx, fx + W * 1.6, e), s = hs * (1 + 1.6 * e);
      creatureStreak(ctx, x, fy - 3100 * s, s, W * 0.9, -40, { n: 7, blur: 10 + e * 12, t, eye: 0, keyGain: 0.4 });
    }
    dust(ctx, t, 50, 0.6 * pulse(t, at('rush') + 0.12, 1.2), { x: 0, y: H * 0.3, w: W, h: H * 0.7 }, 6, 11);
    grade(ctx, NIGHT);
    flash(ctx, '#fff', pulse(t, at('rush') + 0.05, 0.08) * 0.35, 'screen');
  } },
  { a: at('empty'), b: at('room'), fout: 0.15, f: (ctx, t, lt, u) => {
    // the empty street after its passage; dust settling, lantern swinging — title on its name
    const P = 'street_run';
    const cam = camLerp({ cx: 700, cy: 1170, zoom: 1.25 }, { cx: 690, cy: 1160, zoom: 1.4 }, u);
    cam.shake = shakeAdd(handheld(t, 0.9, 71), { x: n1(t * 30, 5) * 20 * Math.exp(-lt * 3), y: n1(t * 26, 6) * 14 * Math.exp(-lt * 3), r: 0 });
    nightSky(ctx, t, P, cam);
    const swing = 0.75 + 0.25 * Math.sin(t * 5.5) * Math.exp(-lt * 0.8);
    bgDraw(ctx, P, cam, { lamp: swing * lampFlicker(t, 13, 0.3) });
    dust(ctx, t, 70, 0.5 * Math.exp(-lt * 0.9), { x: 0, y: H * 0.35, w: W, h: H * 0.65 }, 2.5, 13);
    windLeaves(ctx, t, 8, 0.4 * Math.exp(-lt), 'rgba(40,32,24,0.9)', 8);
    drawFog(ctx, t, 0.07, 30, 4, 5, H * 0.45, H);
    grade(ctx, NIGHT);
    const ta = (t >= at('title', 0) && t < at('title', 1)) ? smooth(seg(t, at('title', 0), at('title', 0) + 0.12)) * (1 - smooth(seg(t, at('title', 1) - 0.12, at('title', 1)))) : 0;
    if (ta > 0) { flash(ctx, '#000', 0.45 * ta); bigTitle(ctx, t, ta, 'ÇARŞAMBA KARISI'); }
    flash(ctx, '#fff', pulse(t, at('title', 0), 0.08) * 0.3, 'screen');
  } },

  // ======================= S5: the woman at the spinning wheel (21.6 - 26.45) =======================
  { a: at('room'), b: at('spindle'), fin: 0.12, f: (ctx, t, lt, u) => {
    const P = 'room_spin', lamp = lampFlicker(t, 21, 0) * (0.92 + 0.08 * n1(t * 9, 4));
    const cam = camLerp({ cx: 700, cy: 1230, zoom: 1.28 }, { cx: 720, cy: 1210, zoom: 1.4 }, u);
    cam.shake = handheld(t, 0.5, 81);
    bgDraw(ctx, P, cam, { lamp: lamp * 0.62 });
    // the figure behind the window (appears, slides a little, stays)
    const wq = [[52.6, 2.0], [53.5, 2.0], [53.5, 1.0], [52.6, 1.0]].map(([x, y]) => toCanvas(P, proj3('room_spin', [x, y, 4.36]), cam));
    const fa = smooth(seg(t, at('silhouette'), at('silhouette') + 0.25));
    windowFigure(ctx, wq, fa * 0.92, t, 0.25 * (1 - fa));
    const [gx, gy, gs] = place('room_spin', P, cam, [52.3, 1.0, 2.4]);
    kiz(ctx, gx, gy, gs, { long: true, rig: 'oilL', mouth: 0.05, wide: 0, open: 0.72, look: [0.35, 0.8], keyGain: 0.9 * lamp, rimGain: 0.6, t });
    const [wx, wy, ws] = place('room_spin', P, cam, WHEEL3);
    mirrorX(ctx, wx, () => spinningWheel(ctx, wx, wy, WHEEL_R / 0.000525 * ws, t * 5.2, { lightX: wx + 400, k: 0.75 * lamp, speed: 1 }));
    grade(ctx, { bloom: 0.34, tint: '#14182a', tintA: 0.3, dark: '#8a8aa6', vig: 0.92, vin: 0.22 });
    tagHalk(ctx, smooth(seg(t, at('room'), at('room') + 0.3)) * (1 - smooth(seg(t, at('spindle') - 0.3, at('spindle')))));
  } },
  { a: at('spindle'), b: at('react'), f: (ctx, t, lt, u) => {
    // close on the spindle: the thread catches fire by itself
    const P = 'room_spin', lamp = lampFlicker(t, 21, 0);
    const wp = proj3('room_spin', WHEEL3), Rp = WHEEL_R * window.CAMS.room_spin.f / wp[2];
    const cam = camLerp({ cx: wp[0] + Rp * 1.25, cy: wp[1] - Rp * 0.35, zoom: 2.3 }, { cx: wp[0] + Rp * 1.35, cy: wp[1] - Rp * 0.4, zoom: 2.55 }, u);
    cam.shake = shakeAdd(handheld(t, 0.6, 91), jolt(t, [at('fire')], 20, 0.3));
    bgDrawBlur(ctx, P, cam, { lamp: lamp * 0.6 }, 6);
    const [wx, wy, ws] = place('room_spin', P, cam, WHEEL3);
    const R = WHEEL_R / 0.000525 * ws;
    const fire = seg(t, at('fire'), at('fire') + 0.2);
    const sp0 = mirrorX(ctx, wx, () => spinningWheel(ctx, wx, wy, R, t * 5.2 * (1 - 0.7 * fire), { lightX: wx + R * 4, k: 0.9 * lamp + fire * 0.8, speed: 1 - fire }));
    const sp = { spindle: [2 * wx - sp0.spindle[0], sp0.spindle[1]], tip: [2 * wx - sp0.tip[0], sp0.tip[1]] };
    // the thread from the spindle tip up to her hand (out of frame, upper left)
    const pts = []; for (let i = 0; i <= 24; i++) { const v = i / 24; pts.push([lerp(sp.tip[0], sp.tip[0] - R * 2.2, v) + Math.sin(v * 9 + t * 3) * 3, lerp(sp.tip[1], sp.tip[1] - R * 2.6, v)]); }
    ctx.strokeStyle = 'rgba(220,206,176,0.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    if (t >= at('fire')) {
      fireAlong(ctx, pts, clamp((t - at('fire')) / 0.18), t, 1, 0);
      fireAlong(ctx, [sp.spindle, [sp.spindle[0] + 2, sp.spindle[1] - 2]], 1, t, 1, smooth(seg(t, at('fire'), at('fire') + 0.12)) * (R / 250));
      flash(ctx, 'rgba(255,150,60,1)', 0.28 * pulse(t, at('fire'), 0.4) + 0.12, 'screen');
    }
    grade(ctx, { bloom: 0.5, tint: '#14182a', tintA: 0.22, dark: '#9a96a8', vig: 0.92 });
  } },
  { a: at('react'), b: at('bolt'), f: (ctx, t, lt, u) => {
    // her face in the firelight, recoiling
    const P = 'room_spin', fl = 1.4 + 0.5 * Math.abs(n1(t * 14, 3));
    const cam = { cx: 600, cy: 1150, zoom: 2.4 }; cam.shake = shakeAdd(handheld(t, 1.4, 93), jolt(t, [at('react')], 26, 0.3));
    bgDrawBlur(ctx, P, cam, { lamp: fl * 0.5 }, 10);
    const rec = easeOut(clamp(lt / 0.3));
    kiz(ctx, W * 0.5 - rec * 30, 1010 + rec * 20, 2.05 - rec * 0.12, { rig: 'oilL', mouth: 0.7 * rec, wide: 1, raise: 1, knit: 0.4, look: [-0.5, 0.3], pupil: 0.2, keyGain: fl, rimGain: 0.5, wet: 0.7, t, rot: -0.04 * rec });
    flash(ctx, 'rgba(255,120,40,1)', 0.1 + 0.08 * n1(t * 20, 2), 'screen');
    grade(ctx, { bloom: 0.45, tint: '#1a1220', tintA: 0.2, dark: '#a49cac', vig: 0.9 });
  } },
  { a: at('bolt'), b: at('eyes'), f: (ctx, t, lt, u) => {
    // the bolt on the door moves by itself
    const P = 'room_door', lamp = lampFlicker(t, 21, 0.6);
    const b0 = proj3('room_door', [54.5, 1.05, 1.44]);
    const cam = camLerp({ cx: b0[0] - 60, cy: b0[1] + 120, zoom: 1.55 }, { cx: b0[0] - 10, cy: b0[1] + 40, zoom: 2.05 }, u);
    cam.shake = handheld(t, 0.5, 95);
    bgDraw(ctx, P, cam, { lamp: lamp * 1.1 });
    // moonlight under the door with the shadow of feet passing outside
    const g0 = toCanvas(P, proj3('room_door', [54.52, 0.012, 1.3]), cam), g1 = toCanvas(P, proj3('room_door', [54.52, 0.012, 2.25]), cam);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = linGrad(ctx, 0, g0[1] - 6, 0, g0[1] + 4, [[0, 'rgba(120,150,200,0)'], [1, 'rgba(140,170,220,0.7)']]); ctx.fillRect(g0[0], g0[1] - 6, g1[0] - g0[0], 10);
    ctx.restore();
    const sh = smooth(seg(t, at('rattle', 0) - 0.3, at('rattle', 1) + 0.4));
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; for (const k of [0, 1]) { const x = lerp(g0[0], g1[0], clamp(0.2 + sh * 0.5 + k * 0.18)); ctx.fillRect(x - 18, g0[1] - 6, 30, 10); }
    const rattle = t > at('rattle', 0) && t < at('rattle', 1) ? n1(t * 70, 3) * 0.012 : 0;
    const open = smooth(seg(t, at('rattle', 1), at('rattle', 1) + 0.35));
    doorBolt(ctx, P, cam, open, rattle, lamp);
    grade(ctx, { bloom: 0.34, tint: '#14182a', tintA: 0.25, vig: 0.92 });
  } },

  // ======================= S6: three knocks (26.45 - 30) =======================
  { a: at('eyes'), b: at('black'), f: (ctx, t, lt, u) => {
    const P = 'room_spin', lampDie = 1 - 0.65 * smooth(seg(t, 28.9, 29.6));
    const lamp = lampFlicker(t, 21, 0.2) * lampDie;
    const jl = jolt(t, E.knocks, 18, 0.2);
    const cam = { cx: 560, cy: 1120, zoom: 2.6 }; cam.shake = shakeAdd(handheld(t, 0.5, 97), jl);
    bgDrawBlur(ctx, P, cam, { lamp }, 12);
    const s = lerp(6.0, 6.7, u);
    const blink = Math.max(...E.knocks.map((k) => pulse(t, k + 0.02, 0.16)));
    const toDoor = smooth(seg(t, E.knocks[0], E.knocks[0] + 0.25));
    kiz(ctx, W / 2 + jl.x - toDoor * 60, 860 + 56 * s + jl.y, s, {
      outfit: null, rig: 'oilF', mouth: 0.1 + 0.1 * smooth(seg(t, at('voice'), at('voice') + 0.4)), wide: 1.3 + 0.3 * toDoor, raise: 1, knit: 0.6,
      open: 1 - blink * 0.85, look: [0.85 * toDoor, 0.05], pupil: 0.18, keyGain: 0.8 * lamp, rimGain: 0.5, wet: 0.9, tears: 0.25 * smooth(seg(t, 27.6, 29)), t, k: 4,
    });
    desaturate(ctx, 0.3);
    grade(ctx, { bloom: 0.3, tint: '#141826', tintA: 0.3, dark: '#a8a4b4', vig: 0.95, vin: 0.2 });
    flash(ctx, '#000', 0.25 * smooth(seg(t, at('voice'), at('black'))));
  } },
  { a: at('black'), b: 30.01, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },
];

window.SUBHIDE = (t) => t >= at('title', 0) && t < at('title', 1);
