// DÂBBETÜ'L-ARZ, second pass. Each shot paints the full frame for absolute time t.
'use strict';
const E = window.TL.events;
let SHOTS = [
  // ================= 1: the herald of the end =================
  { a: 0, b: 1.8, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    drawDisclaimer(ctx, smooth(seg(t, 0.1, 0.45)) * (1 - smooth(seg(t, 1.35, 1.75))));
    const k = smooth(seg(t, 0.8, 1.8));                     // a hairline crack opens in the dark
    ctx.save(); ctx.strokeStyle = `rgba(150,160,180,${0.5 * k})`; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const x = 120 + i * 28 * k; ctx[i ? 'lineTo' : 'moveTo'](x, 1180 + n1(i * 0.7, 3) * 26); } ctx.stroke(); ctx.restore();
  } },
  { a: 1.8, b: 8.0, x: 0.5, f: (ctx, t) => {
    const st = seg(t, E.s1_stones, E.s1_stones + 2.6);
    drawEarth2(ctx, t, { zoom: 1.0 + (t - 1.8) * 0.02, panY: (t - 1.8) * 9, panX: (t - 1.8) * 6, moon: 1.05, stones: st, shake: st * 0.08 + 0.02, dust: 0.25 + st * 0.5 });
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 8.0, b: 11.2, f: (ctx, t) => {
    const k = smooth(seg(t, 8.0, 9.0));
    drawEarth2(ctx, t, { zoom: 1.12 + (t - 8) * 0.03, panY: 56 + (t - 8) * 9, panX: 37 + (t - 8) * 6, moon: 1.0, stones: 1, bulge: { k, x: lerp(160, 900, seg(t, 8.0, 11.2)), y: 1260 }, shake: 0.12 + 0.12 * k, dust: 0.7 });
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 11.2, b: 14.1, f: (ctx, t) => {
    const k = easeOut(seg(t, 11.2, 12.4)), sh = t > E.s1_shake ? 1.4 : 0.2 * k, z = 1.3 + (t - 11.2) * 0.08;
    ctx.save(); ctx.translate(W / 2, 1180); ctx.scale(z, z); ctx.translate(-W / 2, -1180);
    drawEarth2(ctx, t, { zoom: 1.2, panY: 85, panX: 56, moon: 0.95, stones: 1, crackOpen: k * 1.5, face: smooth(seg(t, 11.6, 12.8)), eyes: smooth(seg(t, E.s1_eyes + 0.6, E.s1_eyes + 1.4)), shake: sh, dust: 1 });
    ctx.restore();
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.92 });
  } },
  { a: 14.1, b: 14.6, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },

  // ================= 2: the sound from beneath =================
  { a: 14.6, b: 19.5, fin: 0.5, f: (ctx, t) => {
    const z = -66 + (t - 14.6) * 2.2;
    const cam = mkCam({ x: pathX(z) + 3.5, y: 14, z, yaw: -0.06, pitch: 0.42, f: 1150 });
    const lt = pulse(t, 16.9, 0.5) + pulse(t, 17.15, 0.35) * 0.6;
    frame(ctx, t, cam, { village: true, amb: 0.24 + lt * 0.2, fog: 0.13, fogDist: 70, lights: 0.8, far: 90, treeFilter: () => false, lightning: lt, lightX: 0.75 });
    grade(ctx, t);
  } },
  { a: 19.5, b: 22.0, f: (ctx, t) => {
    const cam = mkCam({ x: pathX(-8) + 1.5, y: 7, z: -12 + (t - 19.5) * 0.25, yaw: 0.0, pitch: -0.03, f: 1750 });
    const lt = pulse(t, E.s2_slide + 0.1, 0.6) * 1.2 + pulse(t, E.s2_slide + 0.45, 0.4) * 0.7;
    frame(ctx, t, cam, { village: true, quarry: true, amb: 0.16 + lt * 0.25, fog: 0.1, fogDist: 70, far: 95, treeFilter: (T) => T.z > 46, lightning: lt, lightX: 0.55 });
    const k = seg(t, E.s2_slide, E.s2_slide + 2.2);       // a slope gives way at the quarry
    if (k > 0) {
      for (let i = 0; i < 12; i++) { const ft = (t - E.s2_slide) - i * 0.09; if (ft < 0) continue; const p = proj(cam, CAVE.x - 8 + i * 0.4, Math.max(0.3, 9 - ft * ft * 6), QZ - ft * 1.2); ctx.fillStyle = 'rgba(30,30,32,0.95)'; ctx.beginPath(); ctx.arc(p[0], p[1], 0.35 * p[3], 0, TAU); ctx.fill(); }
      const q = proj(cam, CAVE.x - 6, 6, QZ);
      for (let i = 0; i < 16; i++) { const u = clamp(k * 1.3 - i * 0.04); radial(ctx, q[0] + (i - 8) * 7 + u * 50, q[1] + 70 - u * 140 * (0.5 + hash2(i, 1, 2)), 30 + u * 100, [[0, `rgba(110,112,116,${0.32 * (1 - u * 0.6)})`], [1, 'rgba(0,0,0,0)']]); }
    }
    grade(ctx, t);
  } },
  { a: 22.0, b: 24.6, f: (ctx, t) => {
    drawWindowShot(ctx, t, { z: 1.02 + (t - 22) * 0.035, look: [-0.5 + Math.sin(t * 0.8) * 0.12, 0.12], raise: 0.35, lean: smooth(seg(t, 23.2, 24.4)) });
    drawRain(ctx, t, 0.7, 0.2, [[540, 940, 520, 0.4]]); lensDrops(ctx, t, 0.6);
    grade(ctx, t, { cold: 0.3 });
  } },
  { a: 24.6, b: 26.8, f: (ctx, t) => {
    drawGlassShot(ctx, t, { tremble: smooth(seg(t, 24.8, 25.8)), z: 1.02 + (t - 24.6) * 0.05 });
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 26.8, b: 28.4, f: (ctx, t) => {
    const k = smooth(seg(t, 26.8, 27.4));
    drawFloorShot(ctx, t, { k, shake: pulse(t, E.s2_boom, 0.9) * 0.9 + k * 0.12 });
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.9 });
  } },

  // ================= 3: the abandoned quarry =================
  { a: 28.4, b: 31.8, fin: 0.35, f: (ctx, t) => {
    const z = 59.5 + (t - 28.4) * 0.85, mx = pathX(z), tg = [mx + 0.5, 0, z + 7];
    const cam = lookAt(mkCam({ x: mx - 2.6, y: 2.4, z: z - 7.5 }), [mx + 0.6, 2.2, z + 6]);
    const L = flashlight(mx, z, tg, flashFlicker(t), 1.2, 0.35, 0.3, t);
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.6, rimA: 0.6 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], beam: 1, beamOut: m.out, amb: 0.15, breath: 0.7, breathDir: 1 });
    foreground(ctx, t, cam.z * 0.3, { seed: 3 });
    grade(ctx, t);
  } },
  { a: 31.8, b: 34.4, f: (ctx, t) => {
    const z = 59.5 + (t - 28.4) * 0.85, mx = pathX(z), tg = [mx + 0.2, 0, z + 5];
    const cam = lookAt(mkCam({ x: mx + 0.7, y: 0.4, z: z - 3.0 }), [mx, 1.6, z + 3]);
    const L = flashlight(mx, z, tg, flashFlicker(t), 1.2, 0.35, 0.3, t);
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.6, bias: -1, rimA: 0.7 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: smooth(seg(t, 32.0, 34.4)) * 0.75, dust: 0, t }, beam: 1, beamOut: m.out, amb: 0.15 });
    grade(ctx, t);
  } },
  { a: 34.4, b: 37.0, f: (ctx, t) => {
    const z = 59.5 + (t - 28.4) * 0.85, mx = pathX(z), cz = 66.5;
    const cam = lookAt(mkCam({ x: mx - 3.6, y: 0.3, z: cz - 1.2 }), [mx + 0.6, 0.35, cz + 0.8]);
    const L = flashlight(mx, z, [mx + 0.2, 0, z + 2.5], flashFlicker(t), 1.2, 0.35, 0.4, t);
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.0 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 0.8, dust: smooth(seg(t, 34.4, 35.2)), t }, amb: 0.15, fog: 0.16, beam: 0.7, beamOut: m.out });
    grade(ctx, t);
  } },
  { a: 37.0, b: 41.9, f: (ctx, t) => {
    const stop = smooth(seg(t, 37.0, 38.2)), z = lerp(59.5 + (37 - 28.4) * 0.85, MZ, stop), mx = MX();
    const aim = smooth(seg(t, 37.2, 38.0)), afterName = t > E.s3_name;
    const tg = [CAVE.x + Math.sin(t * 0.7) * 0.3 * (1 - aim), lerp(0, 1.5, aim), QZ + 2];
    const cam = lookAt(mkCam({ x: mx - 1.4, y: 1.85, z: z - 3.2 + (afterName ? (t - E.s3_name) * 0.45 : 0) }), [CAVE.x, 1.6, QZ]);
    const L = flashlight(mx, z, tg, flashFlicker(t, afterName ? 1 : 0), 1.3, 0.35, afterName ? 1.2 : 0.3, t);
    const m = manFlash(mx, z, null, { t, view: 'back', walking: stop < 1, ph: t * 4.0, handR: [0.3, -1.25], rimA: 0.7 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 0.8, dust: 0.4, t }, beam: 1, beamOut: m.out, lightInCave: { x: 0 }, amb: 0.14, breath: afterName ? 1.6 : 0.8 });
    if (afterName) { const c = proj(cam, CAVE.x, CAVE.h, QZ); for (let i = 0; i < 30; i++) { const ph = ((t * 0.6 + i * 0.13) % 1); ctx.fillStyle = `rgba(150,140,125,${0.5 * (1 - ph)})`; ctx.fillRect(c[0] + (hash2(i, 2, 3) - 0.5) * CAVE.w * c[3], c[1] + ph * 2.2 * c[3], 2, 3); } }
    grade(ctx, t, { vig: 0.9 });
  } },

  // ================= 4: breath beneath the ground =================
  { a: 41.9, b: 43.2, f: (ctx, t) => {
    const mx = MX();
    const cam = lookAt(mkCam({ x: mx + 0.35, y: 1.3, z: QZ - 0.3 }), [mx, 1.45, MZ]);
    const L = flashlight(mx, MZ, [mx, 1.3, QZ + 4], 0.9, 1.25, 0.35, 0.8, t);
    const m = manFlash(mx, MZ, null, { t, view: 'front', wide: true, li: 0.6, handR: [0.28, -1.22], amb: 0.18, rimA: 0.9, rimDir: [0, -1] }, L, cam);
    frame(ctx, t, cam, { quarry: true, actors: [m.actor], amb: 0.17, fog: 0.16, breath: 2.0, breathDir: -1, beamOut: m.out });
    if (m.out.screen) { const [fx, fy] = m.out.screen; radial(ctx, fx, fy, 420, [[0, 'rgba(255,248,230,0.5)'], [0.15, 'rgba(255,236,200,0.18)'], [1, 'rgba(0,0,0,0)']], 'screen'); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(0, fy - 3, W, 6); ctx.restore(); }
    ctx.fillStyle = '#010101'; ctx.beginPath(); ctx.rect(0, 0, W, H);
    for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, rr = 1 + 0.08 * n1(k * 0.9, 3); const px = W / 2 + Math.cos(a) * 520 * rr, py = 1180 + Math.sin(a) * 860 * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill('evenodd');
    grade(ctx, t, { vig: 0.92 });
  } },
  { a: 43.2, b: 45.2, f: (ctx, t) => {
    ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, W, H);
    const tr = { x: n1(t * 18, 1) * 4, y: n1(t * 16, 2) * 4 };
    drawManBust(ctx, 540 + tr.x, 1180 + tr.y, 2.75 + (t - 43.2) * 0.14, { t, light: 'flash', look: [0, -0.05], open: 1, wide: 1, raise: 1, pupil: 0.35 + 0.55 * smooth(seg(t, 43.4, 44.8)), sweat: 0.7 });
    breathVapour(ctx, t, 560, 1560, 1.8, 1, 0.35, 2.2);
    grade(ctx, t, { vig: 0.95 });
  } },
  { a: 45.2, b: 47.6, f: (ctx, t) => {
    const u = (t - 45.2) / 2.4, spot = [540 + Math.sin(u * 4.0) * 330, 880 + Math.cos(u * 3.1) * 230];
    drawCave2(ctx, t, { z: 0.5 + u * 0.5, spot, spotR: 470, I: flashFlicker(t), from: [W * 0.62 + n1(t * 9, 3) * 8, H * 1.05], dust: 0.3 });
    grade(ctx, t, { warm: true, cold: 0.15, bloom: 0.38 });
  } },
  { a: 47.6, b: 50.3, f: (ctx, t) => {
    const br = Math.max(0, Math.sin((t - E.s4_breath) * 1.3));
    drawCave2(ctx, t, { z: 1.0 - br * 0.15, spot: [560 + n1(t * 11, 4) * 20, 960], spotR: 460, I: flashFlicker(t, 1), from: [W * 0.6 + n1(t * 13, 3) * 14, H * 1.05], dust: 0.6 + br * 1.0, debris: smooth(seg(t, E.s4_rocks, E.s4_rocks + 0.6)), shake: 0.06 + 0.2 * pulse(t, E.s4_rocks, 1.2) });
    grade(ctx, t, { warm: true, cold: 0.15, bloom: 0.38 });
  } },
  { a: 50.3, b: 52.6, f: (ctx, t) => {
    drawCave2(ctx, t, { z: 1.1 + (t - 50.3) * 0.18, spot: [520 + n1(t * 12, 4) * 30, 1300], spotR: 400, I: 0.6 * flashFlicker(t, 1), from: [W * 0.6, H * 1.05], eyes: smooth(seg(t, 50.5, 51.4)), eyesDepth: 15, eyeScale: 1.2, dust: 0.6, debris: 0.25 });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.93, bloom: 0.42 });
  } },
  { a: 52.6, b: 53.9, f: (ctx, t) => {
    const mx = MX(), k = smooth(seg(t, 52.7, 53.2));
    const cam = mkCam({ x: mx - 3.1, y: 0.8, z: MZ + 0.4, yaw: Math.PI / 2, pitch: -0.04 });
    const J = manPose('fall', 0, { k: k * 0.22 });
    const L = flashlight(mx, MZ, [mx, 0.4 + k * 2, MZ + 4], flashFlicker(t, 1), 1.2, 0.35, 1, t);
    const m = manFlash(mx, MZ, J, { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], wide: true, rimA: 0.7 }, L, cam);
    const q = quake(t, 0.7 * k + 0.1);
    ctx.save(); ctx.translate(q.x, q.y + k * 22);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 1, dust: 1, t }, beam: 0.9, beamOut: m.out, amb: 0.15 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 53.9, b: 55.2, f: (ctx, t) => {
    const u = easeIn(seg(t, 53.9, 55.2));
    drawCave2(ctx, t, { z: 1.4 + u * 15, spot: [540, 900], spotR: 520, I: 0.55, from: [W * 0.55, H * 1.08], eyes: 0.7 + u * 0.3, eyesDepth: 17 - u * 2.5, eyeScale: 1.2 + u, dust: 0.5, shake: 0.2 });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.25 * u; ctx.filter = 'blur(14px)'; ctx.drawImage(ctx.canvas, -40, -70, W + 80, H + 140); ctx.restore();
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95 });
  } },

  // ================= 5: the earth splits =================
  { a: 55.2, b: 57.8, f: (ctx, t) => {
    drawCave2(ctx, t, { z: 2 + (t - 55.2) * 0.55, spot: [520, 1420], spotR: 520, I: 0.85 * flashFlicker(t, 1), from: [W * 0.58, H * 1.05], floor: smooth(seg(t, 55.3, 57.6)), dust: 0.4 + seg(t, 56.5, 57.8), shake: 0.15 + 0.1 * seg(t, 55.3, 57.8) });
    grade(ctx, t, { warm: true, cold: 0.15, bloom: 0.36 });
  } },
  { a: 57.8, b: 59.6, f: (ctx, t) => {
    drawCave2(BGX, t, { z: 4, spot: [500, 1350], spotR: 560, I: 0.55, from: [W * 0.5, H * 1.08], floor: 1, dust: 0.3 });
    const k = easeOut(seg(t, E.s5_limb, E.s5_limb + 1.0)), sh = pulse(t, E.s5_limb + 0.9, 0.9) + 0.15;
    const q = quake(t, sh);
    ctx.save(); ctx.translate(q.x, q.y); ctx.drawImage(BG, 0, 0);
    drawDabbeLimb2(ctx, 600, 1560, 370, { t, k, up: 1.35, rim: 0.3, amb: 0.08, rot: -0.12 });
    const r = mulberry32(99), bt = clamp(seg(t, E.s5_limb, E.s5_limb + 1.4)) * 1.4;      // clods of earth thrown up
    for (let i = 0; i < 46; i++) { const vx = (r() - 0.5) * 3, vy = -2 - r() * 4, px = 600 + vx * bt * 220, py = 1560 + (vy * bt + 4.9 * bt * bt) * 220; if (py > 1700) continue; const cc = r(); ctx.fillStyle = `rgba(${40 + cc * 40},${32 + cc * 30},${24 + cc * 20},0.95)`; const sz = 4 + r() * 30; ctx.fillRect(px, py, sz, sz * 0.8); }
    ctx.restore();
    mistBand(ctx, t, 0.5 * smooth(seg(t, 57.8, 58.8)), 900, H, 30, 4, 9);
    grade(ctx, t, { warm: true, cold: 0.15, bloom: 0.36 });
  } },
  { a: 59.6, b: 61.0, f: (ctx, t) => {
    const mx = MX(), k = seg(t, 59.65, 60.25);
    const cam = mkCam({ x: mx - 3.0, y: 0.8, z: MZ + 0.6, yaw: Math.PI / 2, pitch: -0.05 });
    const J = manPose('fall', 0, { k: 0.22 + 0.78 * k });
    const L = flashlight(mx + 0.4 - k * 0.2, MZ + 0.4 * (1 - k), [mx, 2 - k * 1.6, QZ], flashFlicker(t), lerp(1.2, 0.15, k), 0.35, 1, t);
    const m = manFlash(mx, MZ, J, { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], wide: true, noLantern: k > 0.6, rimA: 0.7 }, L, cam);
    const q = quake(t, pulse(t, 60.25, 0.6) * 1.2 + 0.1);
    ctx.save(); ctx.translate(q.x, q.y);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 1, dust: 1, t }, amb: 0.14, fog: 0.22, beam: 0.8 * (1 - k), beamOut: m.out });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 61.0, b: 66.4, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 1.0, y: 0.3, z: MZ - 2.2 + (t - 61) * 0.1 }), [CAVE.x + 0.2, 2.7, QZ]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.95, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manPlain(mx, MZ, manPose('fall', 0, { k: 1, breath: Math.sin(t * 7) }), { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.3, amb: 0.2, noLantern: true, wide: true, rimA: 0.8 });
    const k = smooth(seg(t, E.s5_rise, 65.8));
    const dab = dabbeActor(CAVE.x, QZ + 0.6, { t, rise: 0.22 + 0.78 * k, ground: true, headLower: 0.12, eyes: smooth(seg(t, 64.6, 65.6)), up: 1.6, rim: 0.75, amb: 0.1, lantern: L, dust: 1 });
    const q = quake(t, 0.14 + 0.25 * (1 - k) * k * 4);
    ctx.save(); ctx.translate(q.x, q.y);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man.actor, dab], cracks: { open: 1, dust: 1, t }, amb: 0.12, fog: 0.24 });
    ctx.restore();
    grade(ctx, t, { vig: 0.9, bloom: 0.38 });
  } },
  { a: 66.4, b: 69.6, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    const k = easeInOut(seg(t, 66.4, 69.0)), s = lerp(1150, 2300, k);
    drawDabbeFace2(ctx, 540, lerp(1060, 1200, k), s, { t, up: 1.35, rim: 0.25, amb: 0.04, dark: lerp(0.5, 0.65, k), eyes: 1 });
    mistBand(ctx, t, 0.35, 300, H, 18, 4, 3);
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95, bloom: 0.4 });
  } },

  // ================= 6: it speaks =================
  { a: 69.6, b: 71.6, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    drawDabbeFace2(ctx, 640, 1080, 1700, { t, up: 0.2, side: 1.3, rim: 0.2, amb: 0.03, dark: 0.55 - seg(t, 69.6, 71.6) * 0.1, eyes: 1, tilt: -0.05 });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95, bloom: 0.4 });
  } },
  { a: 71.6, b: 73.6, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 3.4, y: 0.6, z: MZ - 1.4 }), [mx + 0.3, 1.9, MZ + 2.6]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.9, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manPlain(mx, MZ, manPose('fall', 0, { k: 1, breath: Math.sin(t * 8) }), { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.4, amb: 0.22, noLantern: true, wide: true, rimA: 0.8 });
    const dab = dabbeActor(CAVE.x, QZ + 0.6, { t, headLower: 0.2, up: 1.5, rim: 0.7, amb: 0.1, lantern: L, dust: 0.4 });
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man.actor, dab], amb: 0.12, fog: 0.22, rain: 0.5, breath: 2.2, breathDir: 1, beamOut: man.out });
    grade(ctx, t, { bloom: 0.36 });
  } },
  { a: 73.6, b: 75.9, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 1.0, y: 0.28, z: MZ - 2.4 }), [CAVE.x, 2.5, QZ]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.95, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manPlain(mx, MZ, manPose('fall', 0, { k: 1 }), { t, flip: true, li: 0.3, amb: 0.2, noLantern: true, rimA: 0.8 });
    const lw = easeInOut(seg(t, 73.8, 75.7));
    const dab = dabbeActor(CAVE.x, QZ + 0.6, { t, headLower: 0.2 + lw * 0.8, up: 1.6, rim: 0.7, amb: 0.1, lantern: L, dust: 0.4 });
    const q = quake(t, 0.08 + 0.12 * lw);
    ctx.save(); ctx.translate(q.x, q.y);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man.actor, dab], amb: 0.12, fog: 0.22, rain: 0.5 });
    ctx.restore();
    grade(ctx, t, { vig: 0.9, bloom: 0.38 });
  } },
  { a: 75.9, b: 78.2, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    drawDabbeFace2(ctx, 540, 900, 2100 + (t - 75.9) * 50, { t, up: 1.45, rim: 0.2, amb: 0.04, dark: 0.5, eyes: 1 });
    const r = mulberry32(31); ctx.fillStyle = 'rgba(70,58,44,0.95)'; for (let i = 0; i < 26; i++) { const x = 300 + r() * 480, y = 1290 + r() * 20 - Math.abs(Math.sin(t * 20 + i)) * 4; ctx.fillRect(x, y, 3, 3); }
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.93, bloom: 0.4 });
  } },
  { a: 78.2, b: 82.4, f: (ctx, t) => {
    ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, W, H);
    const tr = { x: n1(t * 20, 1) * 3, y: n1(t * 18, 2) * 3 }, z = 2.5 + (t - 78.2) * 0.12;
    drawManBust(ctx, 540 + tr.x, 1150 + tr.y, z, { t, light: 'flash', look: [0, -0.35], open: 1, wide: 1, raise: 1, pupil: 0.95, sweat: 1, mouth: 0.15 });
    for (const sx of [-1, 1]) { const ex = 540 + tr.x + sx * 62 * z, ey = 1150 + tr.y - 62 * z; for (const k of [-1, 1]) radial(ctx, ex + k * 5 * z * 0.6, ey - 3 * z, 4 * z * 0.6, [[0, 'rgba(255,200,110,0.9)'], [1, 'rgba(255,160,60,0)']], 'screen'); }
    if (t < E.s6_silence) breathVapour(ctx, t, 560, 1640, 2.4, 1, 0.3, 2.2);
    grade(ctx, t, { vig: 0.95, bloom: 0.35 });
  } },
  { a: 82.4, b: 86.2, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 6.2 + (t - 82.4) * 0.2, y: 1.0, z: MZ + 1.2 }), [mx + 0.4, 1.9, MZ + 1.5]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: 0.85, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manPlain(mx, MZ, manPose('fall', 0, { k: 1 }), { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.45, amb: 0.22, noLantern: true, wide: true, rimA: 0.8 });
    const sp = speaking('c2', t) ? 1 : 0;
    const dab = dabbeActor(CAVE.x, QZ - 0.6, { t, headLower: 1, eyes: 1, glow: 0.8 + 0.3 * sp, up: 1.6, rim: 0.7, amb: 0.1, lantern: L, dust: 0.3 + 0.5 * sp });
    const q = quake(t, 0.05 + 0.1 * sp);
    ctx.save(); ctx.translate(q.x, q.y);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man.actor, dab], amb: 0.12, fog: 0.22, rain: 0.3, splash: 0 });
    if (sp) { for (let k = 0; k < 3; k++) { const ph = ((t * 1.3 + k / 3) % 1), c = proj(cam, CAVE.x, 0, QZ - 1.5); ctx.strokeStyle = `rgba(150,140,125,${0.25 * (1 - ph)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c[0], c[1], ph * 5 * c[3], ph * 1.2 * c[3], 0, 0, TAU); ctx.stroke(); } }
    ctx.restore();
    grade(ctx, t, { vig: 0.9, bloom: 0.38 });
  } },
  { a: 86.2, b: 89.6, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    const sp = speaking('c2', t) ? 1 : 0, k = easeInOut(seg(t, 86.2, 89.4));
    const q = quake(t, 0.04 + 0.08 * sp);
    drawDabbeFace2(ctx, 540 + q.x, 1000 + q.y, lerp(1600, 2500, k), { t, up: 1.4, rim: 0.2, amb: 0.04, dark: 0.55, eyes: 1, glow: 0.85 + 0.3 * sp });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95, bloom: 0.42 });
  } },

  // ================= 7: escape =================
  { a: 89.6, b: 92.4, f: (ctx, t) => {
    const mx = MX(), gk = seg(t, 89.65, 90.35), z = MZ - (t > 90.35 ? (t - 90.35) * 4.4 : 0);
    const cam = mkCam({ x: mx - 3.4, y: 1.0, z: z - 0.2, yaw: Math.PI / 2, pitch: -0.05 });
    const J = gk < 1 ? manPose('getup', 0, { k: gk }) : manPose('run', t * 9.5);
    const man = manPlain(mx, z, J, { t, flip: proj(cam, mx, 1, z - 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.26, noLantern: true, wide: true, flap: 1, rimA: 0.8 });
    const fallR = { x: mx + 2, z: z + 3, draw: (c2, cm) => { for (let i = 0; i < 10; i++) { const ft = t - 90.6 - i * 0.16; if (ft < 0) continue; const y = 9 - 4.9 * ft * ft; if (y < 0.25) continue; const p = proj(cm, mx + 1 + (i % 3), y, z + 2.4 + i * 0.55); c2.fillStyle = '#26221d'; c2.beginPath(); c2.ellipse(p[0], p[1], 0.32 * p[3], 0.25 * p[3], i, 0, TAU); c2.fill(); } } };
    frame(ctx, t, cam, { quarry: true, actors: [man.actor, fallR], amb: 0.15, fog: 0.2, breath: 3, breathDir: -1, beamOut: man.out });
    grade(ctx, t);
  } },
  { a: 92.4, b: 95.0, f: (ctx, t) => {
    const z = MZ - 8 - (t - 92.4) * 4.2, mx = pathX(z);
    const cam = lookAt(mkCam({ x: mx + 0.8, y: 0.6, z: z - 5.2 }), [mx, 1.5, z + 6]);
    const ph = t * 9.5, a = Math.sin(ph);
    const man = manPlain(mx, z, null, { t, view: 'front', walking: true, ph, li: 0, amb: 0.26, noLantern: true, wide: true, mouth: 0.6, handL: [-0.26 - a * 0.05, -1.05 + a * 0.18], handR: [0.3, -1.05 - a * 0.15], rimA: 0.8, rimDir: [0, -1] });
    const slab = { x: CAVE.x, z: QZ - 1, bias: -0.5, draw: (c2, cm) => { for (let i = 0; i < 8; i++) { const ft = t - E.s7_rocks - i * 0.11; if (ft < 0) continue; const y = Math.max(0.45, 10 - 4.9 * ft * ft * 1.4); const p = proj(cm, CAVE.x - 3.5 + i, y, QZ - 1.2); c2.fillStyle = '#211e1a'; c2.beginPath(); c2.ellipse(p[0], p[1], 0.65 * p[3], 0.5 * p[3], i, 0, TAU); c2.fill(); } } };
    const q = quake(t, 0.1 + 0.5 * pulse(t, E.s7_rocks + 0.9, 0.8));
    ctx.save(); ctx.translate(q.x, q.y + Math.abs(Math.sin(t * 9.5)) * 6);
    frame(ctx, t, cam, { quarry: true, actors: [man.actor, slab], cracks: { open: 1, dust: smooth(seg(t, E.s7_rocks, E.s7_rocks + 0.8)), t }, amb: 0.15, fog: 0.22, breath: 3, breathDir: 1, beamOut: man.out, treeFilter: (T) => !(T.z > cam.z - 1 && T.z < z + 2 && Math.abs(T.x - mx) < 3.5) });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 95.0, b: 97.0, f: (ctx, t) => {
    const z = 44 - (t - 95) * 4.6, mx = pathX(z);
    const cam = mkCam({ x: mx - 3.8, y: 1.0, z: z - 0.3, yaw: Math.PI / 2, pitch: -0.06 });
    const man = manPlain(mx, z, manPose('run', t * 9.5), { t, flip: proj(cam, mx, 1, z - 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.26, noLantern: true, wide: true, flap: 1, rimA: 0.8 });
    const q = quake(t, 0.12);
    ctx.save(); ctx.translate(q.x, q.y);
    frame(ctx, t, cam, { actors: [man.actor], amb: 0.15, fog: 0.16, breath: 3, breathDir: -1, beamOut: man.out });
    ctx.restore();
    foreground(ctx, t, -cam.z * 0.6, { seed: 7 });
    grade(ctx, t);
  } },
  { a: 97.0, b: 99.3, f: (ctx, t) => {
    const z = 2.0, mx = pathX(z), st = smooth(seg(t, 97.0, 97.8));
    const cam = lookAt(mkCam({ x: mx + 0.7, y: 1.75, z: z + 5 }), [mx - 0.5, 2.6, -30]);
    const man = manPlain(mx, z + (1 - st) * 1.5, null, { t, view: 'back', walking: st < 1, ph: t * 9, li: 0, amb: 0.26, noLantern: true, sway: Math.sin(t * 5) * 0.5, handL: [-0.32, -0.8], handR: [0.32, -0.8], rimA: 0.6 });
    frame(ctx, t, cam, { village: true, actors: [man.actor], lights: 1.4, amb: 0.16, fog: 0.13, far: 95, breath: 2.6, breathDir: 1, beamOut: man.out });
    grade(ctx, t);
  } },
  { a: 99.3, b: 101.6, fout: 0.5, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: CAVE.x - 1, y: 2.0, z: QZ - 16 + (t - 99.3) * 0.45 }), [CAVE.x, 2.6, QZ]);
    frame(ctx, t, cam, { quarry: true, amb: 0.15, fog: 0.18, rain: 0.55 });
    grade(ctx, t, { vig: 0.9 });
  } },

  // ================= 8: the last sign =================
  { a: 101.6, b: 104.0, fin: 0.5, f: (ctx, t) => {
    const z = -54 + (t - 101.6) * 1.6;
    const cam = mkCam({ x: pathX(z) + 2.5, y: 9, z, yaw: 0.05, pitch: 0.3 });
    frame(ctx, t, cam, { village: true, day: 0.6, amb: 0.4, fog: 0.16, fogDist: 60, lights: 0, lampI: 0, rain: 0, far: 90, treeFilter: () => false });
    grade(ctx, t, { day: 1, cold: 0.25, vig: 0.6, bloom: 0.2 });
  } },
  { a: 104.0, b: 105.6, f: (ctx, t) => {
    const z = 62 + (t - 104) * 1.0, mx = pathX(z);
    const cam = lookAt(mkCam({ x: mx - 1.2, y: 1.8, z: z - 5 }), [mx + 0.3, 1.5, z + 8]);
    const man = manPlain(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.4, li: 0, amb: 0.6, noLantern: true, rimA: 0.3, rimCol: [220, 210, 200] });
    frame(ctx, t, cam, { quarry: true, sealed: true, day: 0.6, actors: [man.actor], amb: 0.42, fog: 0.14, rain: 0 });
    grade(ctx, t, { day: 1, cold: 0.25, vig: 0.6, bloom: 0.2 });
  } },
  { a: 105.6, b: 107.8, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: CAVE.x + 1.5, y: 1.6, z: QZ - 9 + (t - 105.6) * 0.5 }), [CAVE.x, 1.8, QZ]);
    const man = manPlain(MX() + 0.6, QZ - 4.5, null, { t, view: 'back', li: 0, amb: 0.6, noLantern: true, headTilt: Math.sin(t) * 0.05, rimA: 0.3, rimCol: [220, 210, 200] });
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, day: 0.6, actors: [man.actor], amb: 0.42, fog: 0.14, rain: 0 });
    grade(ctx, t, { day: 1, cold: 0.25, vig: 0.6, bloom: 0.2 });
  } },
  { a: 107.8, b: 111.0, f: (ctx, t) => {
    const u = easeInOut(seg(t, 107.8, 111));
    const cam = lookAt(mkCam({ x: CAVE.x - 1.4, y: lerp(2.3, 1.0, u), z: QZ - 17 + u * 4 }), [CAVE.x, 0, QZ - 9 + u * 2]);
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, noBoulders: true, day: 0.6, amb: 0.42, fog: 0.12, rain: 0 });
    grade(ctx, t, { day: 1, cold: 0.25, vig: 0.65, bloom: 0.2 });
  } },
  { a: 111.0, b: 115.6, f: (ctx, t) => {
    const k = seg(t, 111.1, 112.4), z = QZ - 9.5, mx = CAVE.x - 1.1;
    const cam = lookAt(mkCam({ x: mx - 2.6 + (t - 111) * 0.15, y: 0.7, z: z + 0.2 }), [mx + 0.3, 0.6, z]);
    const man = manPlain(mx, z, manPose('kneel', 0, { k }), { t, flip: proj(cam, mx, 1, z + 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.6, noLantern: true, rimA: 0.3, rimCol: [220, 210, 200] });
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, day: 0.6, actors: [man.actor], amb: 0.42, fog: 0.12, rain: 0 });
    grade(ctx, t, { day: 1, cold: 0.25, vig: 0.65, bloom: 0.2 });
  } },
  { a: 115.6, b: 117.4, f: (ctx, t) => {
    // the same voice under the ground: his face in the grey morning, eyes snapping open
    const voice = speaking('c1b', t) ? 1 : 0, k = smooth(seg(t, 115.75, 116.05)), q = quake(t, 0.03 + 0.05 * voice);
    ctx.fillStyle = '#2a2e35'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(TEX.plaster, 0, 0, W, H); ctx.restore();
    radial(ctx, 300, 300, 1200, [[0, 'rgba(160,170,185,0.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
    drawManBust(ctx, 540 + q.x, 1080 + q.y, 1.55 + (t - 115.6) * 0.06, { t, light: 'dawn', look: [lerp(0.1, 0, k), lerp(0.55, -0.1, k)], open: lerp(0.65, 1, k), wide: k, raise: k, pupil: lerp(0.4, 0.15, k), knit: 0.3 * (1 - k), sweat: 0.4 });
    const r = mulberry32(3); for (let i = 0; i < 60; i++) { const x = r() * W, y = 1500 + r() * 420, hop = Math.abs(Math.sin(t * 26 + i)) * 20 * r() * voice; ctx.fillStyle = 'rgba(70,60,50,0.9)'; ctx.fillRect(x, y - hop, 4, 4); }
    grade(ctx, t, { day: 1, cold: 0.3, vig: 0.85, bloom: 0.15 });
  } },
  { a: 117.4, b: 120.0, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },

  // ================= 9: to the viewer =================
  { a: 120.0, b: 122.4, fin: 0.8, f: (ctx, t) => {
    drawEarth2(ctx, t, { zoom: 1.15 + (t - 120) * 0.06, panY: 200 + (t - 120) * 14, panX: 30, moon: 0.75, dust: 0.25, shake: 0.03 });
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.92 });
  } },
  { a: 122.4, b: 125.8, x: 0.45, f: (ctx, t) => {
    drawUnderground(ctx, t, { depth: easeIn(seg(t, 122.4, 125.8)) });
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.95 });
  } },
  { a: 125.8, b: 128.0, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    dabbeEyes2(ctx, 540, 1000, 40, smooth(seg(t, 126.0, 127.2)), 0.85, t);
    grade(ctx, t, { warm: true, cold: 0.1, vig: 0.95, bloom: 0.45 });
  } },
  { a: 128.0, b: 132.4, fout: 1.3, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const s = 330 + (t - 128) * 16, a = smooth(seg(t, 128, 129.8));
    drawDabbeBody2(ctx, 540, 1720, s, { t, headLower: 0.3, eyes: 1, glow: 0.85, up: 0.0, top: 0.0, rim: 0.55 * a, amb: 0.02, alpha: 0.95 });
    grade(ctx, t, { warm: true, cold: 0.1, vig: 0.95, bloom: 0.42 });
  } },
  { a: 132.4, b: 135.0, f: (ctx, t) => { drawTitle(ctx, t, smooth(seg(t, E.title[0], E.title[0] + 0.25)) * (1 - smooth(seg(t, 134.5, 134.95)))); } },
];
