// DÂBBETÜ'L-ARZ shot list. Each shot paints the full frame for absolute time t.
'use strict';
const E = window.TL.events;
const BG = makeCanvas(W, H), BGX = BG.getContext('2d');
const MZ = 70.4;                                       // where Mehmet stops in front of the cave
const MX = () => CAVE.x;
const pulse = (t, k, d = 0.3) => { const x = t - k; return x >= 0 && x < d ? Math.exp(-x * 10) : 0; };
const speaking = (clip, t) => TL.words.some((w) => w.clip === clip && t >= w.start - 0.04 && t < w.end);

function grade(ctx, t, o = {}) {
  tint(ctx, o.warm ? '#2a1a10' : '#0e2234', o.cold ?? 0.35, 'soft-light');
  tint(ctx, '#05101a', o.crush ?? 0.1, 'multiply');
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = o.day ? 'rgba(150,150,160,0.2)' : `rgba(52,60,76,${o.lift ?? 0.1})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  vignette(ctx, o.vig ?? 0.82, o.vin ?? 0.28);
}
function flashFlicker(t) { return 0.96 + 0.04 * n1(t * 9, 4) - (Math.abs(n1(t * 2.3, 5)) > 0.93 ? 0.3 : 0); }
// flashlight held by Mehmet at world (X,Z), aimed at world target
function flashlight(X, Z, target, I = 1, y = 1.2, fwd = 0.35) {
  const dz = target[2] - Z >= 0 ? 1 : -1, L = { x: X + 0.15, y, z: Z + fwd * dz, I, r: 3.2, cos: 0.9 };
  const dx = target[0] - L.x, dy = target[1] - L.y, dd = target[2] - L.z, n = Math.hypot(dx, dy, dd) || 1;
  L.dir = [dx / n, dy / n, dd / n];
  return L;
}
function worldActors(o = {}) {
  const A = [];
  if (o.village) for (const Hs of WORLD.houses) A.push(houseActor(Hs, o));
  if (o.quarry) { A.push(quarryActor(o)); for (const B of WORLD.boulders) if (!o.noBoulders || Math.abs(B.x - CAVE.x) > 5) A.push(boulderActor(B, o)); }
  if (o.cracks) A.push(cracksActor(o.cracks));
  return A;
}
function frame(ctx, t, cam, o) {
  const actors = (o.actors || []).concat(worldActors(o));
  renderForest(ctx, cam, Object.assign({ t, fog: 0.1, skyDark: 0.55, moonEl: 0.5, afterSky: (c, cm) => drawMountains(c, cm, o) }, o, { actors, amb: (o.amb ?? 0.15) * (o.day ? 1.4 : 2.8) }));
  // beam from the screen position of the flashlight
  if (o.beam && o.beamOut && o.beamOut.screen) {
    const L = o.lantern, tg = proj(cam, L.x + L.dir[0] * 9, L.y + L.dir[1] * 9, L.z + L.dir[2] * 9);
    if (tg[2] > 0.2) drawBeam(ctx, o.beamOut.screen, [tg[0], tg[1]], L.I * (o.beam || 1) * 1.8, o.beamW || 300);
  }
  if (o.rain !== 0) drawRain(ctx, t, o.rain ?? 0.7);
}
function manFlash(X, Z, J, o, L, cam) {
  const out = {};
  // screen angle of the flashlight: from the hand towards the beam target
  const a = proj(cam, L.x, L.y, L.z), b = proj(cam, L.x + L.dir[0] * 3, L.y + L.dir[1] * 3, L.z + L.dir[2] * 3);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return { out, actor: manActor(X, Z, J, Object.assign({ out, flash: { ang, I: L.I }, li: 0.5, amb: 0.22 }, o)) };
}

let SHOTS = [
  // ---------------- 1: the herald of the end ----------------
  { a: 0, b: 1.6, f: (ctx, t) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); drawDisclaimer(ctx, smooth(seg(t, 0.1, 0.45)) * (1 - smooth(seg(t, 1.25, 1.6)))); } },
  { a: 1.6, b: 8.0, fin: 0.9, f: (ctx, t) => {
    const st = seg(t, E.s1_stones, E.s1_stones + 2.6);
    drawEarth(ctx, t, { zoom: 1 + (t - 1.6) * 0.012, panY: (t - 1.6) * 6, stones: st, shake: st > 0 ? 0.08 : 0, dust: st });
    grade(ctx, t, { warm: true, cold: 0.25 });
  } },
  { a: 8.0, b: 11.2, f: (ctx, t) => {
    const k = smooth(seg(t, 8.0, 9.2));
    drawEarth(ctx, t, { zoom: 1.1 + (t - 8) * 0.02, panY: 38 + (t - 8) * 6, stones: 1, under: { k, x: lerp(120, 880, seg(t, 8.0, 11.2)), y: 1250 }, shake: 0.12 * k, dust: 0.8 });
    grade(ctx, t, { warm: true, cold: 0.25 });
  } },
  { a: 11.2, b: 14.1, f: (ctx, t) => {
    const k = easeOut(seg(t, 11.2, 12.2)), sh = t > E.s1_shake ? 1 : 0.15 * k;
    ctx.save(); const z = 1.25 + (t - 11.2) * 0.06; ctx.translate(W / 2, 1180); ctx.scale(z, z); ctx.translate(-W / 2, -1180);
    drawEarth(ctx, t, { zoom: 1.2, panY: 58, stones: 1, crackOpen: k, eyes: smooth(seg(t, E.s1_eyes + 0.6, E.s1_eyes + 1.1)), shake: sh, dust: 1 });
    ctx.restore();
    grade(ctx, t, { warm: true, cold: 0.25, vig: 0.9 });
  } },
  { a: 14.1, b: 14.6, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },

  // ---------------- 2: the sound from beneath ----------------
  { a: 14.6, b: 19.5, fin: 0.5, f: (ctx, t) => {
    const z = -64 + (t - 14.6) * 2.4;
    const cam = mkCam({ x: pathX(z) + 3, y: 15, z, yaw: -0.05, pitch: 0.5, f: 1150 });
    frame(ctx, t, cam, { village: true, amb: 0.32, fog: 0.12, fogDist: 70, lights: 0.8, far: 90, treeFilter: () => false });
    grade(ctx, t);
  } },
  { a: 19.5, b: 22.0, f: (ctx, t) => {
    const cam = mkCam({ x: pathX(-8) + 1.5, y: 6, z: -12 + (t - 19.5) * 0.3, yaw: 0.0, pitch: -0.02, f: 1700 });
    frame(ctx, t, cam, { village: true, quarry: true, amb: 0.28, fog: 0.1, fogDist: 70, far: 95, treeFilter: (T) => T.z > 46 });
    // a slope gives way at the quarry: a slow plume of dust
    const q = proj(cam, CAVE.x - 6, 8, QZ), k = seg(t, E.s2_slide, E.s2_slide + 2.4);
    if (q[2] > 0 && k > 0) for (let i = 0; i < 14; i++) { const u = clamp(k * 1.3 - i * 0.04); radial(ctx, q[0] + (i - 7) * 6 + u * 40, q[1] + 60 - u * 120 * (0.5 + hash2(i, 1, 2)), 30 + u * 90, [[0, `rgba(120,116,110,${0.35 * (1 - u * 0.6)})`], [1, 'rgba(0,0,0,0)']]); }
    grade(ctx, t);
  } },
  { a: 22.0, b: 24.6, f: (ctx, t) => {
    drawWindowShot(ctx, t, { z: 1 + (t - 22) * 0.03, look: [-0.5 + Math.sin(t * 0.8) * 0.15, 0.15], raise: 0.3 });
    drawRain(ctx, t, 0.6); grade(ctx, t, { cold: 0.25 });
  } },
  { a: 24.6, b: 26.8, f: (ctx, t) => {
    drawGlassShot(ctx, t, { tremble: smooth(seg(t, 24.8, 25.8)), z: 1 + (t - 24.6) * 0.04 });
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 26.8, b: 28.4, f: (ctx, t) => {
    const k = smooth(seg(t, 26.8, 27.4));
    drawFloorShot(ctx, t, { k, shake: pulse(t, E.s2_boom, 0.8) * 0.8 + k * 0.1 });
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.9 });
  } },

  // ---------------- 3: the abandoned quarry ----------------
  { a: 28.4, b: 31.8, fin: 0.4, f: (ctx, t) => {
    const z = 60.5 + (t - 28.4) * 0.8, mx = pathX(z), tg = [mx + 0.4, 0, z + 7];
    const cam = lookAt(mkCam({ x: mx - 2.2, y: 3.2, z: z - 6.5 }), [mx + 0.5, 1.6, z + 6]);
    const L = flashlight(mx, z, tg, flashFlicker(t));
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.6 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], beam: 1, beamOut: m.out, amb: 0.15 });
    grade(ctx, t);
  } },
  { a: 31.8, b: 34.4, f: (ctx, t) => {
    const z = 60.5 + (t - 28.4) * 0.8, mx = pathX(z), tg = [mx + 0.2, 0, z + 5];
    const cam = lookAt(mkCam({ x: mx + 0.6, y: 0.45, z: z - 3.4 }), [mx, 1.5, z + 3]);
    const L = flashlight(mx, z, tg, flashFlicker(t));
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.6, bias: -1 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: smooth(seg(t, 32.0, 34.4)) * 0.7, dust: 0, t }, beam: 1, beamOut: m.out, amb: 0.15 });
    grade(ctx, t);
  } },
  { a: 34.4, b: 37.0, f: (ctx, t) => {
    const z = 60.5 + (t - 28.4) * 0.8, mx = pathX(z), cz = 66.5;
    const cam = lookAt(mkCam({ x: mx - 2.6, y: 0.3, z: cz - 0.6 }), [mx + 1, 0.1, cz + 0.4]);
    const L = flashlight(mx, z, [mx + 0.3, 0, z + 3.5], flashFlicker(t));
    const m = manFlash(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.0 }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 0.75, dust: smooth(seg(t, 34.4, 35.2)), t }, amb: 0.15, fog: 0.22 });
    grade(ctx, t);
  } },
  { a: 37.0, b: 41.9, f: (ctx, t) => {
    const stop = smooth(seg(t, 37.0, 38.2)), z = lerp(60.5 + (37 - 28.4) * 0.8, MZ, stop), mx = MX();
    const aim = smooth(seg(t, 37.2, 38.0)), tg = [CAVE.x + Math.sin(t * 0.7) * 0.3 * (1 - aim), lerp(0, 1.4, aim), QZ];
    const cam = lookAt(mkCam({ x: mx - 1.3, y: 1.9, z: z - 3.0 + (t > E.s3_name ? (t - E.s3_name) * 0.4 : 0) }), [CAVE.x, 1.5, QZ]);
    const L = flashlight(mx, z, tg, flashFlicker(t), 1.3);
    const m = manFlash(mx, z, null, { t, view: 'back', walking: stop < 1, ph: t * 4.0, handR: [0.3, -1.25] }, L, cam);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 0.75, dust: 0.4, t }, beam: 1, beamOut: m.out, lightInCave: { x: 0 }, amb: 0.14 });
    grade(ctx, t, { vig: 0.88 });
  } },

  // ---------------- 4: breath beneath the ground ----------------
  { a: 41.9, b: 43.2, f: (ctx, t) => {
    const mx = MX();
    const cam = lookAt(mkCam({ x: mx + 0.4, y: 1.3, z: QZ - 0.4 }), [mx, 1.35, MZ]);
    const L = flashlight(mx, MZ, [mx, 1.3, QZ + 4], 0.9);
    const m = manFlash(mx, MZ, null, { t, view: 'front', wide: true, li: 0.9, handR: [0.28, -1.22], amb: 0.3 }, L, cam);
    frame(ctx, t, cam, { quarry: true, actors: [m.actor], amb: 0.16, fog: 0.2 });
    // the cave's rim frames the shot (we are inside, looking out)
    ctx.fillStyle = '#020202'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.ellipse(W / 2, 1150, 470, 820, 0, 0, TAU); ctx.fill('evenodd');
    grade(ctx, t, { vig: 0.9 });
  } },
  { a: 43.2, b: 45.2, f: (ctx, t) => {
    ctx.fillStyle = '#040506'; ctx.fillRect(0, 0, W, H);
    const tr = { x: n1(t * 18, 1) * 4, y: n1(t * 16, 2) * 4 };
    drawManBust(ctx, 540 + tr.x, 1180 + tr.y, 2.7 + (t - 43.2) * 0.12, { t, light: 'flash', look: [0, -0.05], open: 1, wide: 1, raise: 1, pupil: 0.65 + 0.2 * seg(t, 43.2, 45), sweat: 0.6 });
    drawRain(ctx, t, 0.3); grade(ctx, t, { vig: 0.95 });
  } },
  { a: 45.2, b: 47.6, f: (ctx, t) => {
    const u = (t - 45.2) / 2.4, spot = [540 + Math.sin(u * 4.2) * 330, 900 + Math.cos(u * 3.1) * 220];
    drawCave(ctx, t, { z: 0.4 + u * 0.4, spot, spotI: flashFlicker(t) });
    grade(ctx, t, { warm: true, cold: 0.15 });
  } },
  { a: 47.6, b: 50.3, f: (ctx, t) => {
    const br = Math.max(0, Math.sin((t - E.s4_breath) * 1.4));
    drawCave(ctx, t, { z: 0.9 - br * 0.12, spot: [560, 980], spotI: flashFlicker(t), dust: 0.5 + br * 0.8, debris: smooth(seg(t, E.s4_rocks, E.s4_rocks + 0.6)), shake: 0.05 + 0.12 * pulse(t, E.s4_rocks, 1.2) });
    grade(ctx, t, { warm: true, cold: 0.15 });
  } },
  { a: 50.3, b: 52.6, f: (ctx, t) => {
    drawCave(ctx, t, { z: 1.0 + (t - 50.3) * 0.15, spot: [540, 1250], spotI: 0.5 * flashFlicker(t), eyes: smooth(seg(t, 50.5, 51.1)), eyesDepth: 16, dust: 0.6, debris: 0.3 });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.92 });
  } },
  { a: 52.6, b: 53.9, f: (ctx, t) => {
    const mx = MX(), k = smooth(seg(t, 52.7, 53.2));
    const cam = mkCam({ x: mx - 3.1, y: 0.8, z: MZ + 0.4, yaw: Math.PI / 2, pitch: -0.04 });
    const J = manPose('fall', 0, { k: k * 0.22 });
    const L = flashlight(mx, MZ, [mx, 0.4, MZ + 4], flashFlicker(t));
    const m = manFlash(mx, MZ, J, { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], wide: true }, L, cam);
    const sh = 0.4 * k;
    ctx.save(); ctx.translate(n1(t * 40, 1) * 30 * sh, n1(t * 36, 2) * 30 * sh + k * 18);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 1, dust: 1, t }, beam: 0.8, beamOut: m.out, amb: 0.15 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 53.9, b: 55.2, f: (ctx, t) => {
    const u = easeIn(seg(t, 53.9, 55.2));
    drawCave(ctx, t, { z: 1.2 + u * 14, spot: [540, 900], spotI: 0.6, eyes: 0.6 + u * 0.4, eyesDepth: 17.5 - u * 2, dust: 0.5, shake: 0.15 });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.2 * u; ctx.filter = 'blur(12px)'; ctx.drawImage(ctx.canvas, -30, -60, W + 60, H + 120); ctx.restore();
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95 });
  } },

  // ---------------- 5: the earth splits ----------------
  { a: 55.2, b: 57.8, f: (ctx, t) => {
    drawCave(ctx, t, { z: 2 + (t - 55.2) * 0.5, spot: [520, 1450], spotI: 0.8 * flashFlicker(t), floor: smooth(seg(t, 55.3, 57.6)), dust: 0.4 + seg(t, 56.5, 57.8), shake: 0.12 });
    grade(ctx, t, { warm: true, cold: 0.15 });
  } },
  { a: 57.8, b: 59.6, f: (ctx, t) => {
    drawCave(BGX, t, { z: 4, spot: [500, 1300], spotI: 0.35, floor: 1, dust: 0.3, shake: 0 });
    ctx.drawImage(BG, 0, 0); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    const k = easeOut(seg(t, E.s5_limb, E.s5_limb + 0.9)), sh = pulse(t, E.s5_limb + 0.85, 0.8);
    ctx.save(); ctx.translate(n1(t * 40, 1) * 34 * sh, n1(t * 37, 2) * 34 * sh);
    drawDabbeLimb(ctx, 600, 1500, 360, { t, k, burst: seg(t, E.s5_limb, E.s5_limb + 1.4), light: { x: 330, y: 1500, I: 1.1 } });
    ctx.restore();
    drawFog(ctx, t, 0.14 * smooth(seg(t, 57.8, 58.6)), 30, 3, 9);
    grade(ctx, t, { warm: true, cold: 0.15 });
  } },
  { a: 59.6, b: 61.0, f: (ctx, t) => {
    const mx = MX(), k = seg(t, 59.65, 60.25);
    const cam = mkCam({ x: mx - 3.0, y: 0.8, z: MZ + 0.6, yaw: Math.PI / 2, pitch: -0.05 });
    const J = manPose('fall', 0, { k: 0.22 + 0.78 * k });
    const L = flashlight(mx + 0.4 - k * 0.2, MZ + 0.4 * (1 - k), [mx, 2 - k * 1.6, QZ], flashFlicker(t), lerp(1.2, 0.15, k));
    const m = manFlash(mx, MZ, J, { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], wide: true, noLantern: k > 0.6 }, L, cam);
    const sh = pulse(t, 60.25, 0.5);
    ctx.save(); ctx.translate(n1(t * 40, 1) * 26 * sh, n1(t * 36, 2) * 26 * sh);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [m.actor], cracks: { open: 1, dust: 1, t }, amb: 0.14, fog: 0.3 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 61.0, b: 66.4, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 1.1, y: 0.3, z: MZ - 2.2 + (t - 61) * 0.12 }), [CAVE.x + 0.2, 2.6, QZ]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.9, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const J = manPose('fall', 0, { k: 1 });
    const man = manActor(mx, MZ, J, { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.3, amb: 0.22, noLantern: true, wide: true });
    const k = smooth(seg(t, E.s5_rise, 65.6));
    const dab = { x: CAVE.x, z: QZ + 0.6, bias: 2, draw: (c2, cm) => {
      const p = proj(cm, CAVE.x, 0, QZ + 0.6), lp = proj(cm, L.x, L.y, L.z);
      drawDabbe(c2, p[0], p[1], p[3], { t, rise: 0.25 + 0.75 * k, headLower: 0.15, eyes: smooth(seg(t, 64.5, 65.5)), light: { x: lp[0], y: lp[1], I: 1.2, R: 4.2 }, amb: 0.16, dust: 1, ground: p[1] });
    } };
    const sh = 0.06 + 0.1 * (1 - k);
    ctx.save(); ctx.translate(n1(t * 30, 1) * 22 * sh, n1(t * 28, 2) * 22 * sh);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man, dab], cracks: { open: 1, dust: 1, t }, amb: 0.12, fog: 0.3 });
    ctx.restore();
    grade(ctx, t, { vig: 0.88 });
  } },
  { a: 66.4, b: 69.6, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    const k = easeInOut(seg(t, 66.4, 69.0)), s = lerp(700, 1500, k);
    drawDabbeFace(ctx, 540, 980 + k * 180, s, { t, eyes: 1, light: { x: 300, y: 1900, I: 1.0, R: 1.8 }, reveal: 0.35 + k * 0.1, amb: 0.12 });
    drawFog(ctx, t, 0.12, 18, 4, 3);
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95 });
  } },

  // ---------------- 6: it speaks ----------------
  { a: 69.6, b: 71.6, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    drawDabbeFace(ctx, 600, 1050, 1300, { t, eyes: 1, light: { x: 260, y: 1700, I: 0.9, R: 1.6 }, reveal: 0.22 + seg(t, 69.6, 71.6) * 0.15, revealX: -0.3, amb: 0.1 });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.95 });
  } },
  { a: 71.6, b: 73.6, f: (ctx, t) => {
    const mx = MX(), cam = mkCam({ x: mx - 3.4, y: 0.7, z: MZ + 1.6, yaw: Math.PI / 2 + 0.25, pitch: -0.12 });
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.9, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manActor(mx, MZ, manPose('fall', 0, { k: 1, breath: Math.sin(t * 6) }), { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.35, amb: 0.24, noLantern: true, wide: true });
    const dab = { x: CAVE.x, z: QZ + 0.6, bias: 2, draw: (c2, cm) => { const p = proj(cm, CAVE.x, 0, QZ + 0.6), lp = proj(cm, L.x, L.y, L.z); drawDabbe(c2, p[0], p[1], p[3], { t, headLower: 0.2, light: { x: lp[0], y: lp[1], I: 0.8, R: 3.0 }, amb: 0.12, dust: 0.5 }); } };
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man, dab], amb: 0.12, fog: 0.26, rain: 0.5 });
    grade(ctx, t);
  } },
  { a: 73.6, b: 75.9, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 1.2, y: 0.3, z: MZ - 2.6 }), [CAVE.x, 2.4, QZ]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: flashFlicker(t) * 0.9, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manActor(mx, MZ, manPose('fall', 0, { k: 1 }), { t, flip: true, li: 0.3, amb: 0.22, noLantern: true });
    const lw = easeInOut(seg(t, 73.8, 75.7));
    const dab = { x: CAVE.x, z: QZ + 0.6, bias: 2, draw: (c2, cm) => { const p = proj(cm, CAVE.x, 0, QZ + 0.6), lp = proj(cm, L.x, L.y, L.z); drawDabbe(c2, p[0], p[1], p[3], { t, headLower: 0.2 + lw * 0.8, light: { x: lp[0], y: lp[1], I: 1.15, R: 4.2 }, amb: 0.16, dust: 0.4 }); } };
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man, dab], amb: 0.12, fog: 0.26, rain: 0.5 });
    grade(ctx, t, { vig: 0.88 });
  } },
  { a: 75.9, b: 78.2, f: (ctx, t) => {
    ctx.fillStyle = '#020203'; ctx.fillRect(0, 0, W, H);
    drawDabbeFace(ctx, 540, 1000, 1180 + (t - 75.9) * 40, { t, eyes: 1, light: { x: 420, y: 1750, I: 1.0, R: 1.7 }, reveal: 0.55, amb: 0.12 });
    grade(ctx, t, { warm: true, cold: 0.15, vig: 0.93 });
  } },
  { a: 78.2, b: 82.4, f: (ctx, t) => {
    ctx.fillStyle = '#040506'; ctx.fillRect(0, 0, W, H);
    const tr = { x: n1(t * 20, 1) * 3, y: n1(t * 18, 2) * 3 };
    drawManBust(ctx, 540 + tr.x, 1150 + tr.y, 2.4 + (t - 78.2) * 0.1, { t, light: 'flash', look: [0, -0.35], open: 1, wide: 1, raise: 1, pupil: 0.85, sweat: 1, mouth: 0.15 });
    grade(ctx, t, { vig: 0.95 });
  } },
  { a: 82.4, b: 89.6, f: (ctx, t) => {
    const mx = MX(), cam = lookAt(mkCam({ x: mx - 6.2 + (t - 82.4) * 0.2, y: 1.0, z: MZ + 1.2 }), [mx + 0.4, 1.9, MZ + 1.5]);
    const L = { x: mx + 0.5, y: 0.15, z: MZ + 0.3, I: 0.8, r: 3.2, cos: 0.88, dir: [0, 0.35, 0.94] };
    const man = manActor(mx, MZ, manPose('fall', 0, { k: 1 }), { t, flip: proj(cam, mx, 1, MZ + 1)[0] < proj(cam, mx, 1, MZ)[0], li: 0.4, amb: 0.24, noLantern: true, wide: true });
    const sp = speaking('c2', t) ? 1 : 0;
    const dab = { x: CAVE.x, z: QZ - 0.6, bias: 2, draw: (c2, cm) => { const p = proj(cm, CAVE.x, 0, QZ - 0.6), lp = proj(cm, L.x, L.y, L.z); drawDabbe(c2, p[0], p[1], p[3], { t, headLower: 1, eyes: 0.8 + 0.2 * sp, light: { x: lp[0], y: lp[1], I: 1.15, R: 4.2 }, amb: 0.16, dust: 0.3 + 0.4 * sp }); } };
    const sh = 0.05 * sp;
    ctx.save(); ctx.translate(n1(t * 34, 1) * 14 * sh, n1(t * 31, 2) * 14 * sh);
    frame(ctx, t, cam, { quarry: true, lantern: L, actors: [man, dab], amb: 0.12, fog: 0.26, rain: 0.35 });
    ctx.restore();
    grade(ctx, t, { vig: 0.9 });
  } },

  // ---------------- 7: escape ----------------
  { a: 89.6, b: 92.4, f: (ctx, t) => {
    const mx = MX(), gk = seg(t, 89.65, 90.4), z = MZ - (t > 90.4 ? (t - 90.4) * 4.2 : 0);
    const cam = mkCam({ x: mx - 3.4, y: 1.0, z: z - 0.2 - (t > 90.4 ? 0 : 0), yaw: Math.PI / 2, pitch: -0.05 });
    const J = gk < 1 ? manPose('getup', 0, { k: gk }) : manPose('run', t * 9.5);
    const man = manActor(mx, z, J, { t, flip: proj(cam, mx, 1, z - 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.24, noLantern: true, wide: true, flap: 1 });
    const fallR = { x: mx + 2, z: z + 3, draw: (c2, cm) => { for (let i = 0; i < 9; i++) { const ft = t - 90.8 - i * 0.18; if (ft < 0) continue; const y = 9 - 4.9 * ft * ft; if (y < 0.2) continue; const p = proj(cm, mx + 1 + (i % 3), y, z + 2.5 + i * 0.6); c2.fillStyle = '#3a342c'; c2.beginPath(); c2.ellipse(p[0], p[1], 0.3 * p[3], 0.24 * p[3], i, 0, TAU); c2.fill(); } } };
    frame(ctx, t, cam, { quarry: true, actors: [man, fallR], amb: 0.15, fog: 0.22 });
    grade(ctx, t);
  } },
  { a: 92.4, b: 95.0, f: (ctx, t) => {
    const z = MZ - 8 - (t - 92.4) * 4.2, mx = pathX(z);
    const cam = lookAt(mkCam({ x: mx + 0.8, y: 0.6, z: z - 4.5 - (t - 92.4) * 3.6 }), [mx, 1.5, z + 6]);
    const ph = t * 9.5, a = Math.sin(ph);
    const man = manActor(mx, z, null, { t, view: 'front', walking: true, ph, li: 0, amb: 0.24, noLantern: true, wide: true, mouth: 0.6, handL: [-0.26 - a * 0.05, -1.05 + a * 0.18], handR: [0.3, -1.05 - a * 0.15] });
    const rk = smooth(seg(t, E.s7_rocks, E.s7_rocks + 0.8));
    const slab = { x: CAVE.x, z: QZ - 1, bias: -0.5, draw: (c2, cm) => { for (let i = 0; i < 7; i++) { const ft = t - E.s7_rocks - i * 0.12; if (ft < 0) continue; const y = Math.max(0.4, 10 - 4.9 * ft * ft * 1.4); const p = proj(cm, CAVE.x - 3 + i, y, QZ - 1.2); c2.fillStyle = '#2e2924'; c2.beginPath(); c2.ellipse(p[0], p[1], 0.6 * p[3], 0.45 * p[3], i, 0, TAU); c2.fill(); } } };
    ctx.save(); ctx.translate(n1(t * 30, 1) * 8, n1(t * 26, 2) * 8 + Math.abs(Math.sin(t * 9.5)) * 6);
    frame(ctx, t, cam, { quarry: true, actors: [man, slab], cracks: { open: 1, dust: rk, t }, amb: 0.15, fog: 0.24 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 95.0, b: 97.0, f: (ctx, t) => {
    const z = 44 - (t - 95) * 4.6, mx = pathX(z);
    const cam = mkCam({ x: mx - 3.8, y: 1.0, z: z - 0.3, yaw: Math.PI / 2, pitch: -0.06 });
    const J = manPose('run', t * 9.5);
    const man = manActor(mx, z, J, { t, flip: proj(cam, mx, 1, z - 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.24, noLantern: true, wide: true, flap: 1 });
    ctx.save(); ctx.translate(n1(t * 30, 3) * 6, n1(t * 26, 4) * 6);
    frame(ctx, t, cam, { actors: [man], amb: 0.15, fog: 0.16 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 97.0, b: 99.3, f: (ctx, t) => {
    const z = 2.0, mx = pathX(z), st = smooth(seg(t, 97.0, 97.8));
    const cam = lookAt(mkCam({ x: mx + 0.6, y: 1.7, z: z + 5 }), [mx - 0.5, 2.2, -30]);
    const man = manActor(mx, z + (1 - st) * 1.5, null, { t, view: 'back', walking: st < 1, ph: t * 9, li: 0, amb: 0.24, noLantern: true, sway: Math.sin(t * 5) * 0.5, handL: [-0.32, -0.8], handR: [0.32, -0.8] });
    frame(ctx, t, cam, { village: true, actors: [man], lights: 1.3, amb: 0.17, fog: 0.16, far: 95 });
    grade(ctx, t);
  } },
  { a: 99.3, b: 101.6, fout: 0.5, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: CAVE.x - 1, y: 2.0, z: QZ - 16 + (t - 99.3) * 0.4 }), [CAVE.x, 2.6, QZ]);
    frame(ctx, t, cam, { quarry: true, amb: 0.16, fog: 0.2, rain: 0.5 });
    grade(ctx, t);
  } },

  // ---------------- 8: the last sign ----------------
  { a: 101.6, b: 104.0, fin: 0.5, f: (ctx, t) => {
    const z = -52 + (t - 101.6) * 1.6;
    const cam = mkCam({ x: pathX(z) + 2, y: 8, z, yaw: 0.05, pitch: 0.28 });
    frame(ctx, t, cam, { village: true, day: 0.55, amb: 0.35, fog: 0.22, lights: 0, rain: 0, far: 90 });
    tint(ctx, '#c8b0a0', 0.12, 'soft-light'); grade(ctx, t, { cold: 0.2, crush: 0.04, vig: 0.55, day: 1 });
  } },
  { a: 104.0, b: 105.6, f: (ctx, t) => {
    const z = 62 + (t - 104) * 1.0, mx = pathX(z);
    const cam = lookAt(mkCam({ x: mx - 1.2, y: 1.8, z: z - 5 }), [mx + 0.3, 1.4, z + 8]);
    const man = manActor(mx, z, null, { t, view: 'back', walking: true, ph: t * 4.4, li: 0, amb: 0.55, noLantern: true });
    frame(ctx, t, cam, { quarry: true, sealed: true, day: 0.55, actors: [man], amb: 0.38, fog: 0.2, rain: 0 });
    grade(ctx, t, { cold: 0.2, crush: 0.04, vig: 0.55, day: 1 });
  } },
  { a: 105.6, b: 107.8, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: CAVE.x + 1.5, y: 1.6, z: QZ - 9 + (t - 105.6) * 0.5 }), [CAVE.x, 1.8, QZ]);
    const man = manActor(MX() + 0.6, QZ - 4.5, null, { t, view: 'back', li: 0, amb: 0.55, noLantern: true, headTilt: Math.sin(t) * 0.05 });
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, day: 0.55, actors: [man], amb: 0.38, fog: 0.2, rain: 0 });
    grade(ctx, t, { cold: 0.2, crush: 0.04, vig: 0.55, day: 1 });
  } },
  { a: 107.8, b: 111.0, f: (ctx, t) => {
    const u = easeInOut(seg(t, 107.8, 111));
    const cam = lookAt(mkCam({ x: CAVE.x - 1.6, y: lerp(2.2, 1.0, u), z: QZ - 17 + u * 4 }), [CAVE.x, 0, QZ - 9 + u * 2]);
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, noBoulders: true, day: 0.55, amb: 0.38, fog: 0.16, rain: 0 });
    grade(ctx, t, { cold: 0.2, crush: 0.04, vig: 0.6, day: 1 });
  } },
  { a: 111.0, b: 117.4, f: (ctx, t) => {
    const k = seg(t, 111.1, 112.4), z = QZ - 9.5, mx = CAVE.x - 1.1;
    const cam = lookAt(mkCam({ x: mx - 2.6 + (t - 111) * 0.12, y: 0.7, z: z + 0.2 }), [mx + 0.3, 0.6, z]);
    const voice = t > E.s8_voice ? 1 : 0;
    const man = manActor(mx, z, manPose('kneel', 0, { k }), { t, flip: proj(cam, mx, 1, z + 1)[0] < proj(cam, mx, 1, z)[0], li: 0, amb: 0.55, noLantern: true, wide: voice > 0 });
    const sh = voice * 0.06;
    ctx.save(); ctx.translate(n1(t * 34, 1) * 14 * sh, n1(t * 31, 2) * 14 * sh);
    frame(ctx, t, cam, { quarry: true, sealed: true, tracks: 1, day: 0.55, actors: [man], amb: 0.38, fog: 0.2, rain: 0 });
    if (voice) { const r = mulberry32(3); for (let i = 0; i < 90; i++) { const x = r() * W, by = 1300 + r() * 600, hop = Math.abs(Math.sin(t * 24 + i)) * 20 * r(); ctx.fillStyle = 'rgba(120,104,86,0.8)'; ctx.fillRect(x, by - hop, 3, 3); } }
    ctx.restore();
    grade(ctx, t, { cold: 0.2, crush: 0.04, vig: 0.6, day: 1 });
  } },
  { a: 117.4, b: 120.0, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },

  // ---------------- 9: to the viewer ----------------
  { a: 120.0, b: 122.4, fin: 0.8, f: (ctx, t) => {
    drawEarth(ctx, t, { zoom: 1.1 + (t - 120) * 0.05, panY: 300 + (t - 120) * 10, dust: 0.3 });
    grade(ctx, t, { warm: true, cold: 0.25, vig: 0.9 });
  } },
  { a: 122.4, b: 125.8, x: 0.4, f: (ctx, t) => {
    drawUnderground(ctx, t, { depth: easeIn(seg(t, 122.4, 125.8)) });
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.95 });
  } },
  { a: 125.8, b: 128.0, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    dabbeEyes(ctx, 540, 1000, 300, smooth(seg(t, 126.0, 126.8)) * 0.75, t, 1.3);
  } },
  { a: 128.0, b: 132.4, fout: 1.3, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const s = 300 + (t - 128) * 14;
    drawDabbe(ctx, 540, 1700, s, { t, headLower: 0.35, eyes: 0.75, amb: 0.06, silhouette: [6, 5, 4, 0.9], alpha: smooth(seg(t, 128, 129.6)) * 0.9 });
    dabbeEyes(ctx, 540, 1700 + (-2.95 + 0.35 * 1.15) * s - 0.08 * s, 0.45 * s, 0.75, t, 1.1);
    drawFog(ctx, t, 0.06, 10, 4, 6);
  } },
  { a: 132.4, b: 135.0, f: (ctx, t) => { drawTitle(ctx, t, smooth(seg(t, E.title[0], E.title[0] + 0.25)) * (1 - smooth(seg(t, 134.5, 134.95)))); } },
];
