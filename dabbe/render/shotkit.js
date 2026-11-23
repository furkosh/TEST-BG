// Shared camera/lighting helpers for the main film and the intro.
'use strict';
const BG = makeCanvas(W, H), BGX = BG.getContext('2d');
const MZ = 70.4, MX = () => CAVE.x;
const pulse = (t, k, d = 0.3) => { const x = t - k; return x >= 0 && x < d ? Math.exp(-x * 10) : 0; };
const speaking = (clip, t) => TL.words.some((w) => w.clip === clip && t >= w.start - 0.04 && t < w.end);

function grade(ctx, t, o = {}) {
  if (o.bloom !== 0) bloom(ctx, o.bloom ?? 0.32);
  tint(ctx, o.warm ? '#2a1a10' : (o.day ? '#46505e' : '#0c2236'), o.cold ?? 0.4, 'soft-light');
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = o.day ? 'rgba(120,124,134,0.12)' : `rgba(30,38,52,${o.lift ?? 0.12})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  vignette(ctx, o.vig ?? 0.85, o.vin ?? 0.26);
}
function flashFlicker(t, shaky = 0) { return 0.95 + 0.05 * n1(t * 9, 4) - (Math.abs(n1(t * 2.3, 5)) > 0.94 ? 0.35 : 0) - shaky * Math.abs(n1(t * 17, 6)) * 0.2; }
// flashlight held by Mehmet at world (X,Z), aimed at a world target; tremble shakes the aim
function flashlight(X, Z, target, I = 1, y = 1.2, fwd = 0.35, tremble = 0, t = 0) {
  const dz = target[2] - Z >= 0 ? 1 : -1, L = { x: X + 0.15, y, z: Z + fwd * dz, I, r: 3.2, cos: 0.9 };
  const tx = target[0] + tremble * n1(t * 13, 7) * 0.25, ty = target[1] + tremble * n1(t * 11, 8) * 0.2;
  const dx = tx - L.x, dy = ty - L.y, dd = target[2] - L.z, n = Math.hypot(dx, dy, dd) || 1;
  L.dir = [dx / n, dy / n, dd / n];
  return L;
}
function worldActors(o = {}) {
  const A = [];
  if (o.village) { for (const Hs of WORLD.houses) A.push(houseActor(Hs, o)); for (const Lp of WORLD.lamps) A.push(lampActor(Lp, o)); A.push(minaretActor(o)); }
  if (o.quarry) { A.push(quarryActor(o)); A.push(railsActor(o)); for (const B of WORLD.boulders) if (!o.noBoulders || Math.abs(B.x - CAVE.x) > 5) A.push(boulderActor(B, o)); }
  if (o.cracks) A.push(cracksActor(o.cracks));
  return A;
}
// one outdoor frame: world + beam + rain lit by every light in shot
function frame(ctx, t, cam, o) {
  o.lampScreens = [];
  const ambE = (o.amb ?? 0.15) * (o.day ? 1.5 : 3.0);
  const actors = (o.actors || []).concat(worldActors(Object.assign({}, o, { amb: ambE * 0.42 })));
  const hz = renderForest(ctx, cam, Object.assign({ t, fog: 0.12, skyDark: 0.45, afterSky: (c, cm) => drawMountains(c, cm, o) }, o, { actors, amb: (o.amb ?? 0.15) * (o.day ? 1.5 : 3.0) }));
  const lights = o.lampScreens.slice();
  if (o.beam && o.beamOut && o.beamOut.screen && o.lantern) {
    const L = o.lantern, tg = proj(cam, L.x + L.dir[0] * 9, L.y + L.dir[1] * 9, L.z + L.dir[2] * 9);
    if (tg[2] > 0.2) {
      const p0 = o.beamOut.screen, I = L.I * (o.beam || 1);
      drawBeam(ctx, p0, [tg[0], tg[1]], I * 1.9, o.beamW || 300);
      beamDust(ctx, t, p0[0], p0[1], tg[0], tg[1], (o.beamW || 300) * 0.8, 90, 0.8 * I, 5);
      lights.push([lerp(p0[0], tg[0], 0.35), lerp(p0[1], tg[1], 0.35), 330, I], [p0[0], p0[1], 140, I]);
    }
  }
  if (o.breath && o.beamOut && o.beamOut.head) { const [hx, hy, s] = o.beamOut.head; breathVapour(ctx, t, hx + s * 0.1 * (o.breathDir || 1), hy + s * 0.05, o.breath, o.breathDir || 1, 0.35, s / 400); }
  if (o.rain !== 0) { drawRain(ctx, t, o.rain ?? 0.75, 0.18, lights); if (o.splash !== 0) rainSplashes(ctx, t, Math.max(hz + 200, H * 0.62), 0.6 * (o.rain ?? 0.75)); }
  return hz;
}
function manFlash(X, Z, J, o, L, cam) {
  const out = {};
  const a = proj(cam, L.x, L.y, L.z), b = proj(cam, L.x + L.dir[0] * 3, L.y + L.dir[1] * 3, L.z + L.dir[2] * 3);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return { out, actor: manActor(X, Z, J, Object.assign({ out, flash: { ang, I: L.I }, li: 0.5, amb: 0.3 }, o)) };
}
function manPlain(X, Z, J, o) { const out = {}; return { out, actor: manActor(X, Z, J, Object.assign({ out }, o)) }; }
// dark foreground rocks / grass at the frame edges, moving faster than the scene (parallax)
function foreground(ctx, t, camX, o = {}) {
  const r = mulberry32(o.seed || 9);
  ctx.save(); ctx.fillStyle = '#030405';
  for (let i = 0; i < 5; i++) {
    const x = ((r() * 1600 - camX * 260 * (1 + i * 0.2)) % 1600 + 1600) % 1600 - 260, y = H - 40 - r() * 160, w2 = 160 + r() * 300, h2 = 70 + r() * 170;
    ctx.filter = 'blur(6px)'; ctx.beginPath(); ctx.ellipse(x, y + h2 * 0.3, w2, h2, 0, Math.PI, TAU); ctx.fill();
    ctx.filter = 'none'; ctx.strokeStyle = '#030405'; ctx.lineWidth = 3;
    for (let g = 0; g < 9; g++) { const gx = x - w2 * 0.7 + r() * w2 * 1.4; ctx.beginPath(); ctx.moveTo(gx, y); ctx.quadraticCurveTo(gx + n1(t * 0.8 + g, i) * 14, y - h2 * 0.6, gx + 10 + n1(t * 0.7 + g, i + 3) * 18, y - h2 * (0.9 + r() * 0.6)); ctx.stroke(); }
  }
  ctx.restore();
}
// the creature as a world actor at the cave mouth
function dabbeActor(X, Z, o) {
  return { x: X, z: Z, bias: o.bias ?? 2, draw: (ctx, cam) => {
    const p = proj(cam, X, 0, Z); if (p[2] < 0.3) return;
    let upX = 0;
    if (o.lantern) { const lp = proj(cam, o.lantern.x, o.lantern.y, o.lantern.z); upX = clamp((lp[0] - p[0]) / (p[3] * 5.6), -0.4, 0.4); }
    drawDabbeBody2(ctx, p[0], p[1], p[3], Object.assign({}, o, { upX, groundY: o.ground ? p[1] : undefined }));
    if (o.dust > 0) dustCloud(ctx, p[0], p[1], p[3], o.dust, o.t || 0);
  } };
}

