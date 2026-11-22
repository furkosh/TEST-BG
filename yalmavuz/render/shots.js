// YALMAVUZ shot list. Each shot paints the full frame for absolute time t.
'use strict';
const E = window.TL.events;
const BG = makeCanvas(W, H), BGX = BG.getContext('2d');
const M = { x: CLEAR.x, z: CLEAR.z };                       // where he stands in the clearing (S3-S5)
const HT = () => FOREST.hideTree;
const CRP = () => ({ x: FOREST.hideTree.x - 1.3, z: FOREST.hideTree.z + 0.9 });   // creature once out of hiding

const pulse = (t, k, d = 0.25) => { const x = t - k; return x >= 0 && x < d ? Math.exp(-x * 12) : 0; };
const pulses = (t, ks, d) => ks.reduce((a, k) => a + pulse(t, k, d), 0);
function lantI(t, dip = 0) {
  let v = 0.94 + 0.06 * n1(t * 7.3, 11) + 0.03 * n1(t * 23, 12);
  if (dip) v *= 1 - dip * clamp(0.5 + 0.5 * n1(t * 31, 13)) * (Math.abs(n1(t * 9, 14)) > 0.3 ? 1 : 0.2);
  return v;
}
function grade(ctx, t, o = {}) {
  tint(ctx, '#0f2a36', o.cold ?? 0.35, 'soft-light');
  tint(ctx, '#06121a', o.crush ?? 0.18, 'multiply');
  vignette(ctx, o.vig ?? 0.82, o.vin ?? 0.28);
}
function flipFor(cam, X, Z, dx, dz) { return proj(cam, X + dx, 0.9, Z + dz)[0] < proj(cam, X, 0.9, Z)[0]; }
function walkZ(t) { return 40 - (19.0 - Math.min(t, 19.0)) * 1.1; }
function lanternLight(X, Y, Z, I, r = 2.8) { return { x: X, y: Y, z: Z, I, r }; }
// a forest frame with the narrator in it
function forestFrame(ctx, t, cam, o) {
  renderForest(ctx, cam, Object.assign({ t, amb: 0.17, fog: 0.16 }, o));
  if (o.lantern && o.glowL) drawLanternGlow(ctx, cam, o.lantern, t);
}
// pale faces that flicker between the trees for an instant
function ghostFace(X, Y, Z, type, a, t, o = {}) {
  return {
    x: X, z: Z, draw: (ctx, cam) => {
      if (a <= 0) return;
      const p = proj(cam, X, Y, Z); if (p[2] < 0.3) return;
      const glow = [];
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p[0], p[1]); const k = 0.3 * (o.scale || 1) * p[3] / 168; ctx.scale(k, k);
      drawYHead(ctx, type, { t, yaw: o.yaw || 0, eyes: 1, light: [0.3, -0.5], glow, hairLen: o.hairLen || 0.8 });
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore();
      fillBlackRegion(ctx, p[0], p[1] - 0.15 * p[3], 0.5 * p[3], 0.45 * a * (o.dark ?? 1));
      for (const [ex, ey, r, ea] of glow) radial(ctx, ex, ey, r * 2, [[0, `rgba(230,238,228,${0.5 * a * ea})`], [1, 'rgba(0,0,0,0)']], 'screen');
    },
  };
}
function fillBlackRegion(ctx, x, y, r, a) { radial(ctx, x, y, r, [[0, `rgba(0,0,0,${a * 0.3})`], [1, `rgba(0,0,0,${a})`]]); }
// headsets for the creature
const allUp = (o = {}) => YM.heads.map(() => Object.assign({ k: 1, yaw: 0 }, o));
// the bony hand curled around the old tree (world actor)
function handOnTree(t, L, a) {
  const T = FOREST.hideTree, X = T.x - T.rad * 0.95, Y = 2.25, Z = T.z - 0.12;
  return {
    x: X, z: Z - 0.2, draw: (ctx, cam) => {
      if (a <= 0) return;
      const p = proj(cam, X, Y, Z); if (p[2] < 0.3) return;
      const s = 0.42 * p[3] / 240;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p[0], p[1]); ctx.rotate(-0.25 + n1(t * 0.8, 3) * 0.04);
      drawCreatureHandClose(ctx, { s, t, curl: 0.55 + n1(t * 1.4, 8) * 0.1, light: [0.15, 0.2], seed: 4 });
      ctx.restore();
      const li = lanternAt(L, X, Y, Z);
      radial(ctx, p[0] + 0.1 * p[3], p[1], 0.5 * p[3], [[0, `rgba(0,0,0,${clamp(0.55 - li * 0.4)})`], [1, 'rgba(0,0,0,0)']]);
    },
  };
}

// ======================= SHOTS =======================
let SHOTS = [
  // ---------------- 1: the legend ----------------
  { a: 0, b: 1.6, f: (ctx, t) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); drawFog(ctx, t, 0.05, 30, 5, 2); drawDisclaimer(ctx, smooth(seg(t, 0.1, 0.5)) * (1 - smooth(seg(t, 1.25, 1.6)))); } },
  { a: 1.6, b: 4.6, fin: 1.1, f: (ctx, t) => {
    const cam = mkCam({ x: CLEAR.x - 1.2, y: 1.7, z: 18 + (t - 1.6) * 0.45, yaw: 0.06, pitch: -0.07 });
    forestFrame(ctx, t, cam, { amb: 0.24, fog: 0.26 });
    moonShafts(ctx, t, 0.09, 3); grade(ctx, t);
  } },
  { a: 4.6, b: 7.4, x: 0.5, f: (ctx, t) => {
    const cam = mkCam({ x: CLEAR.x + 0.3, y: 1.15, z: 33.5 + (t - 4.6) * 0.25, yaw: 0.05, pitch: -0.14 });
    const cx = CLEAR.x + 3.2 - (t - 4.6) * 0.7;
    const cr = yActor(cx, 42.5, { t, walking: true, step: t * 2.0, heads: allUp({ twitch: 2 }), silhouette: [3, 4, 6, 0.99], glow: 0, eyes: 0, amb: 0.1, lean: 0.25, bias: -0.1 });
    const back = { x: cx, z: 44, draw: (c2, cm) => { const p = proj(cm, cx, 2, 44); radialEllipse(c2, p[0], p[1], 3.2 * p[3], 2.4 * p[3], [[0, 'rgba(120,140,160,0.35)'], [1, 'rgba(60,80,100,0)']], 'screen'); } };
    forestFrame(ctx, t, cam, { amb: 0.24, fog: 0.22, actors: [back, cr], treeFilter: (T) => !(T.z > 34 && T.z < 45 && Math.abs(T.x - cx) < 1.6) });
    moonShafts(ctx, t, 0.07, 5); grade(ctx, t);
  } },
  { a: 7.4, b: 8.75, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: CLEAR.x + 1.0, y: 1.4, z: 39.2 + (t - 7.4) * 0.35 }), [CLEAR.x + 1.1, 2.55, 45.2]);
    const heads = YM.heads.map((h, i) => ({ k: 1, yaw: 0, eyes: smooth(seg(t, E.s1_eyes + 0.05 + [3, 1, 5, 0, 4, 2, 6][i] * 0.14, E.s1_eyes + 0.2 + [3, 1, 5, 0, 4, 2, 6][i] * 0.14)), twitch: 1.5 }));
    const cr = yActor(CLEAR.x + 1.1, 45.2, { t, heads, silhouette: [4, 5, 8, 0.97], glow: 1.3, amb: 0.08, lean: 0.2 });
    forestFrame(ctx, t, cam, { amb: 0.14, fog: 0.2, actors: [cr], skyDark: 0.4, treeFilter: (T) => !(T.z > 38 && T.z < 45 && Math.abs(T.x - CLEAR.x - 1) < 1.6) });
    grade(ctx, t, { vig: 0.9 });
  } },
  { a: 8.75, b: 9.3, f: (ctx, t) => {
    ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, W, H); drawFog(ctx, t, 0.08, 20, 4, 4);
    const k = easeOut(seg(t, 8.75, 9.05)), z = 4.6 + (t - 8.75) * 1.6, glow = [];
    ctx.save(); ctx.translate(540 + n1(t * 30, 1) * 4, 1300); ctx.scale(z, z);
    drawYHead(ctx, 0, { t, yaw: 1.4 * (1 - k), eyes: 1, light: [-0.6, -0.6], glow, hairLen: 1.2 });
    ctx.restore();
    ctx.fillStyle = linGrad(ctx, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0.7)']]); ctx.fillRect(0, 0, W, H);
    for (const [ex, ey, r] of glow) radial(ctx, ex, ey, r * 2.4, [[0, 'rgba(230,238,228,0.4)'], [1, 'rgba(0,0,0,0)']], 'screen');
    grade(ctx, t, { vig: 0.95 });
  } },
  { a: 9.3, b: 10.4, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },

  // ---------------- 2: lost in the forest ----------------
  { a: 10.4, b: 14.2, fin: 0.7, f: (ctx, t) => {
    const z = walkZ(t), mx = pathX(z), L = lanternLight(mx + 0.3, 1.0, z + 0.35, lantI(t));
    const cam = lookAt(mkCam({ x: mx + 4 - (t - 10.4) * 0.4, y: 17, z: z - 9, f: 1250 }), [mx, 0, z + 1.2]);
    const man = manActor(mx, z, manPose('walk', t * 5.2), { t, view: 'back', walking: true, ph: t * 5.2, li: 1, lantern: { I: L.I, swing: Math.sin(t * 5.2) * 0.15 }, amb: 0.24 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.2, fog: 0.2, far: 60 });
    grade(ctx, t);
  } },
  { a: 14.2, b: 17.5, x: 0.4, f: (ctx, t) => {
    const z = walkZ(t), mx = pathX(z), L = lanternLight(mx + 0.25, 1.0, z + 0.35, lantI(t));
    const dk = smooth(seg(t, 14.2, 17.4));
    const cam = mkCam({ x: mx - 4.4, y: 0.42, z: z + 0.15, yaw: Math.PI / 2, pitch: -0.2, cy: 1060 });
    const J = manPose('walk', t * 5.2);
    const man = manActor(mx, z, J, { t, flip: flipFor(cam, mx, z, 0, 1), li: 1, lantern: { I: L.I, swing: Math.sin(t * 5.2) * 0.18 }, amb: 0.22 - dk * 0.08 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.2 - dk * 0.08, skyDark: dk, fog: 0.14 });
    grade(ctx, t);
  } },
  { a: 17.5, b: 20.4, x: 0.3, f: (ctx, t) => {
    const z = walkZ(t), mx = pathX(z), walking = t < E.s2_stop;
    const lift = smooth(seg(t, 19.1, 19.6));
    const L = lanternLight(mx - 0.3, 1.0 + lift * 0.35, z - 0.35, lantI(t));
    const cam = lookAt(mkCam({ x: mx + 0.5, y: 1.45, z: z + 3.6 + (walking ? 0 : (t - 19) * 0.15) }), [mx, 1.25, z]);
    const look = t > 19.2 ? Math.sin((t - 19.2) * 2.2) : 0;
    const man = manActor(mx, z, null, { t, view: 'front', walking, ph: t * 5.2, li: 1.1, lantern: { I: L.I, swing: walking ? Math.sin(t * 5.2) * 0.12 : Math.sin(t * 2) * 0.05 }, amb: 0.2, faceLook: look, headX: look * 0.02, handL: [-0.3, -0.85], handR: [0.32, -1.0 - lift * 0.3] });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.14, skyDark: 1, fog: 0.15 });
    grade(ctx, t);
  } },
  { a: 20.4, b: 22.9, f: (ctx, t) => {
    const z = 40, mx = pathX(z), L = lanternLight(mx + 0.3, 1.25, z + 0.4, lantI(t));
    const cam = mkCam({ x: mx - 0.7, y: 1.55, z: z - 5.8 + (t - 20.4) * 0.12, yaw: 0.04, pitch: 0.02 });
    const man = manActor(mx, z, null, { t, view: 'back', li: 1, lantern: { I: L.I, swing: Math.sin(t * 2) * 0.05 }, amb: 0.2, headX: Math.sin(t * 1.5) * 0.015, handR: [0.32, -1.25] });
    const sx = mx + 8 - smooth(seg(t, E.s2_shadow[0], E.s2_shadow[1])) * 15;
    const cr = yActor(sx, z + 15, { t, walking: true, step: t * 2.4, heads: allUp(), silhouette: [5, 7, 10, 0.95], glow: 0, eyes: 0, lean: 0.3 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, cr], amb: 0.14, skyDark: 1, fog: 0.2 });
    grade(ctx, t);
  } },

  // ---------------- 3: the mother's voice ----------------
  { a: 22.9, b: 25.4, f: (ctx, t) => {
    const turned = t > 23.95, k = smooth(seg(t, 24.0, 24.8));
    const cam = mkCam({ x: M.x - 3.1, y: 1.25, z: M.z + 0.2, yaw: Math.PI / 2, pitch: -0.02 });
    const J = manPose(turned ? 'raise' : 'stand', 0, { k: turned ? k : 0, breath: Math.sin(t * 3) });
    if (!turned && t > 23.3) J.look = -1;
    const L = lanternLight(M.x + (turned ? 0.1 : 0.1), 1.0 + k * 0.6, M.z + (turned ? -0.45 - k * 0.1 : 0.4), lantI(t, 0.2));
    const man = manActor(M.x, M.z, J, { t, flip: turned ? !flipFor(cam, M.x, M.z, 0, 1) : flipFor(cam, M.x, M.z, 0, 1), li: 1.1, lantern: { I: L.I, swing: turned ? (1 - k) * Math.sin(t * 9) * 0.3 : 0 }, amb: 0.2, wide: t > 23.3 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.14, skyDark: 1 });
    grade(ctx, t);
  } },
  { a: 25.4, b: 29.6, f: (ctx, t) => {
    // background: blurred forest behind his face
    const cam = mkCam({ x: M.x + 0.2, y: 1.6, z: M.z - 1.4, yaw: Math.PI + 0.3, pitch: 0 });
    renderForest(BGX, cam, { t, amb: 0.12, fog: 0.2, skyDark: 1, lantern: lanternLight(M.x, 1.4, M.z - 0.5, 0.8) });
    ctx.filter = 'blur(10px)'; ctx.drawImage(BG, 0, 0); ctx.filter = 'none';
    const k = 1.02 + (t - 25.4) * 0.025, sh = handheld(t, 0.8, 2);
    const look = [Math.sin((t - 25.4) * 0.9) * 0.7 - 0.2, 0.05];
    const ann = smooth(seg(t, 29.6, 29.9));
    drawManBust(ctx, 540 + sh.x, 900 + sh.y, k, { t, light: 'lantern', look: [lerp(look[0], -0.5, ann), look[1]], open: 1, wide: 0.3 + ann * 0.7, raise: 0.3 + ann * 0.6, knit: 0.3, pupil: 0.45, rot: sh.r });
    radial(ctx, 900, 1650, 600, [[0, `rgba(255,170,90,${0.22 * lantI(t)})`], [1, 'rgba(0,0,0,0)']], 'screen');
    grade(ctx, t, { cold: 0.2 });
  } },
  { a: 29.6, b: 34.0, f: (ctx, t) => {
    const sw = Math.sin((t - 29.6) * 1.15) * 0.55;
    const cam = lookAt(mkCam({ x: M.x - 0.75, y: 1.78, z: M.z + 2.5 }), [M.x + sw * 1.5, 1.2, M.z - 6]);
    const L = lanternLight(M.x - 0.45 + sw * 0.4, 1.6, M.z - 0.5, lantI(t), 3.4);
    const man = manActor(M.x, M.z, null, { t, view: 'back', li: 1.2, lantern: { I: L.I, swing: -sw * 0.3 }, amb: 0.22, handR: [0.42 + sw * 0.3, -1.45], handL: [-0.3, -0.9], headX: sw * 0.02, bias: -0.5 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.12, skyDark: 1, fog: 0.18 });
    // the beam searching through the fog
    const lp = proj(cam, L.x, L.y, L.z), tp = proj(cam, L.x + sw * 4, 1.6, L.z - 9);
    if (lp[2] > 0 && tp[2] > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(28px)';
      const dx = tp[0] - lp[0], dy = tp[1] - lp[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      ctx.fillStyle = linGrad(ctx, lp[0], lp[1], tp[0], tp[1], [[0, `rgba(255,170,90,${0.22 * L.I})`], [1, 'rgba(255,150,70,0)']]);
      poly(ctx, [[lp[0] + nx * 20, lp[1] + ny * 20], [tp[0] + nx * 260, tp[1] + ny * 260], [tp[0] - nx * 260, tp[1] - ny * 260], [lp[0] - nx * 20, lp[1] - ny * 20]]); ctx.fill();
      ctx.restore();
    }
    grade(ctx, t);
  } },
  { a: 34.0, b: 38.6, f: (ctx, t) => {
    const cam = lookAt(mkCam({ x: M.x + 0.6, y: 1.45, z: M.z - 4.7 + (t - 34) * 0.42 }), [M.x - 0.2, 1.4, M.z]);
    const behind = t > E.s3_behind + 0.1;
    const L = lanternLight(M.x - 0.3, 1.0, M.z - 0.4, lantI(t, behind ? 0.4 : 0));
    const man = manActor(M.x, M.z, null, { t, view: 'front', li: 1.1, lantern: { I: L.I, swing: Math.sin(t * 13) * 0.02 }, amb: 0.2, wide: true, faceLook: behind ? 0.6 : 0, handR: [0.3, -0.98] });
    const T = FOREST.hairTree, ha = smooth(seg(t, E.s3_hair, E.s3_hair + 1.6)) * (1 - smooth(seg(t, 37.4, 38.2)) * 0.6);
    const hair = ghostFace(T.x + T.rad * 0.95, 2.4, T.z + 0.35, 0, ha, t, { yaw: -1.1, hairLen: 2.4, dark: 0.35, scale: 1.6 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, hair], amb: 0.13, skyDark: 1, fog: 0.2 });
    grade(ctx, t);
  } },

  // ---------------- 4: seven voices ----------------
  { a: 38.6, b: 40.6, f: (ctx, t) => {
    const cam = mkCam({ x: M.x + 3.0, y: 0.6, z: M.z + 0.1, yaw: -Math.PI / 2, pitch: -0.12, cy: 1000 });
    const turned = t > 38.78, sh = pulse(t, 38.78, 0.5);
    const L = lanternLight(M.x, 1.05, M.z + (turned ? 0.4 : -0.4), lantI(t, t < 39.8 ? 0.85 : 0.1));
    const J = manPose('stand', 0, { breath: Math.sin(t * 5) });
    const man = manActor(M.x, M.z, J, { t, flip: turned ? flipFor(cam, M.x, M.z, 0, 1) : !flipFor(cam, M.x, M.z, 0, 1), li: 1.1 * L.I, lantern: { I: L.I, swing: turned ? Math.sin((t - 38.78) * 8) * 0.5 * Math.exp(-(t - 38.78) * 2) : 0 }, amb: 0.2, wide: true });
    ctx.save(); ctx.translate(n1(t * 40, 1) * 20 * sh, 0);
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.12, skyDark: 1 });
    ctx.restore();
    grade(ctx, t);
  } },
  ...[[40.6, 43.2, 1, 2.6, 1.1, E.s4_child], [43.2, 45.0, 2, -2.7, 1.6, E.s4_old]].map(([a, b, type, dx, hy, ev]) => ({ a, b, f: (ctx, t) => {
    const pan = smooth(seg(t, ev + 0.35, ev + 0.9)) * (1 - smooth(seg(t, b - 0.35, b)) * 0.6);
    const G = [M.x + dx, hy, M.z + 1.2];
    const cam = lookAt(mkCam({ x: M.x - 0.1, y: 1.5, z: M.z + 3.3 }), [lerp(M.x, G[0], pan * 0.8), lerp(1.3, G[1], pan), lerp(M.z, G[2], pan)]);
    const L = lanternLight(M.x - 0.3, 1.05, M.z + 0.4, lantI(t, 0.15));
    const snap = smooth(seg(t, ev + 0.05, ev + 0.25));
    const man = manActor(M.x, M.z, null, { t, view: 'front', li: 1.1, lantern: { I: L.I, swing: 0 }, amb: 0.2, wide: true, faceLook: (dx > 0 ? -1 : 1) * snap, headX: (dx > 0 ? -1 : 1) * snap * 0.02 });
    const ga = smooth(seg(t, ev + 0.7, ev + 0.9)) * (1 - smooth(seg(t, ev + 1.5, ev + 1.7)));
    const g = ghostFace(G[0], G[1], G[2], type, ga * (0.6 + 0.4 * Math.abs(n1(t * 20, 4))), t, { hairLen: 0.9, dark: 0.3, scale: 1.4 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, g], amb: 0.12, skyDark: 1, fog: 0.2 });
    grade(ctx, t);
  } })),
  { a: 45.0, b: 50.7, f: (ctx, t) => {
    const th = 0.25 + (t - 45) * 1.12, R = 3.3;
    const cam = lookAt(mkCam({ x: M.x + Math.sin(th) * R, y: 1.35, z: M.z + Math.cos(th) * R }), [M.x, 1.15, M.z]);
    const c = Math.cos(th), L = lanternLight(M.x + 0.25, 1.05, M.z + 0.35, lantI(t, 0.2));
    const look = n1(t * 1.5, 7);
    const views = [];
    const add = (view, a) => { if (a > 0.01) views.push([view, a]); };
    add('front', smooth(clamp((c - 0.35) / 0.25))); add('back', smooth(clamp((-c - 0.35) / 0.25))); add('side', 1 - smooth(clamp((Math.abs(c) - 0.35) / 0.25)));
    const actors = views.map(([view, a]) => manActor(M.x, M.z, view === 'side' ? Object.assign(manPose('stand', 0, { breath: Math.sin(t * 5) }), { look: look > 0.4 ? -1 : 0 }) : null,
      { t, view, flip: flipFor(cam, M.x, M.z, 0, 1), li: 1.1, lantern: { I: L.I, swing: Math.sin(t * 3) * 0.1 }, amb: 0.2, wide: true, faceLook: look, headX: look * 0.02, alpha: a, noLantern: a < 0.5 }));
    // whispers from every side: faces blink in and out around him
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + 0.4, ft = 45.4 + i * 0.85;
      const ga = smooth(seg(t, ft, ft + 0.12)) * (1 - smooth(seg(t, ft + 0.45, ft + 0.6)));
      actors.push(ghostFace(M.x + Math.sin(ang) * 5.5, 1.2 + (i % 3) * 0.4, M.z + Math.cos(ang) * 5.5, [1, 2, 5, 3, 6, 4][i], ga * 0.85, t, { hairLen: 0.7, dark: 0.5 }));
    }
    forestFrame(ctx, t, cam, { lantern: L, actors, amb: 0.12, skyDark: 1, fog: 0.2 });
    grade(ctx, t);
  } },
  { a: 50.7, b: 51.7, f: (ctx, t) => {
    const cam = mkCam({ x: M.x + 0.2, y: 1.6, z: M.z - 1.4, yaw: Math.PI + 0.3, pitch: 0 });
    renderForest(BGX, cam, { t, amb: 0.1, fog: 0.2, skyDark: 1, lantern: lanternLight(M.x, 1.3, M.z - 0.5, 0.7) });
    ctx.filter = 'blur(12px)'; ctx.drawImage(BG, 0, 0); ctx.filter = 'none';
    drawManBust(ctx, 540, 900, 1.18, { t, light: 'lantern', look: [0, -0.05], open: 1, wide: 1, raise: 0.9, knit: 0.2, pupil: 0.2, sweat: 0.6, mouth: 0.15 });
    radial(ctx, 860, 1700, 600, [[0, `rgba(255,170,90,${0.2 * lantI(t)})`], [1, 'rgba(0,0,0,0)']], 'screen');
    grade(ctx, t, { cold: 0.2 });
  } },

  // ---------------- 5: the reveal ----------------
  { a: 51.7, b: 53.6, f: (ctx, t) => {
    const T = HT(), k = smooth(seg(t, 51.8, 52.6));
    const cam = lookAt(mkCam({ x: M.x - 1.0, y: 1.5, z: M.z - 2.5 }), [T.x - 0.4, 1.9, T.z]);
    const L = lanternLight(M.x + 0.3, lerp(1.0, 1.85, k), M.z + 0.45, lantI(t) * lerp(0.8, 1.15, k), 3.6);
    const man = manActor(M.x, M.z, null, { t, view: 'back', li: 1.2, lantern: { I: L.I, swing: 0 }, amb: 0.2, handR: [0.32, lerp(-0.98, -1.68, k)], bias: -0.5 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, handOnTree(t, L, smooth(seg(t, E.s5_hand, E.s5_hand + 0.5)))], amb: 0.12, skyDark: 1, fog: 0.17 });
    grade(ctx, t);
  } },
  { a: 53.6, b: 55.5, f: (ctx, t) => {
    // close-up: the hand on the bark
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(FOREST.bark, -200, -200, 1500, 2400); ctx.restore();
    ctx.fillStyle = linGrad(ctx, 0, 0, W, 0, [[0, 'rgba(0,0,0,0.92)'], [0.25, 'rgba(0,0,0,0.25)'], [0.7, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0.95)']]); ctx.fillRect(0, 0, W, H);
    radial(ctx, 260, 1500, 1200, [[0, `rgba(255,160,80,${0.28 * lantI(t)})`], [1, 'rgba(0,0,0,0)']], 'screen');
    const sh = handheld(t, 1.2, 4);
    ctx.save(); ctx.translate(140 + sh.x - (t - 53.6) * 20, 980 + sh.y); ctx.rotate(-0.12);
    drawCreatureHandClose(ctx, { s: 2.8, t, curl: 0.45 + 0.25 * smooth(seg(t, 54.0, 55.0)) + n1(t * 2, 3) * 0.05, light: [0.35, 0.15], seed: 4 });
    ctx.restore();
    radial(ctx, 300, 1400, 900, [[0, 'rgba(255,150,70,0.12)'], [1, 'rgba(0,0,0,0)']], 'overlay');
    grade(ctx, t, { cold: 0.15 });
  } },
  { a: 55.5, b: 57.6, f: (ctx, t) => {
    const T = HT(), P = CRP(), k = smooth(seg(t, 55.6, 57.3));
    const cam = lookAt(mkCam({ x: M.x - 0.9, y: 0.35, z: M.z - 2.4 }), [T.x - 1.1, 1.95, T.z]);
    const L = lanternLight(M.x + 0.3, 1.85, M.z + 0.45, lantI(t), 4);
    const man = manActor(M.x + 0.5, M.z - 0.6, null, { t, view: 'back', li: 1.2, lantern: { I: L.I, swing: 0 }, amb: 0.2, handR: [0.32, -1.68] });
    const heads = YM.heads.map((h, i) => ({ k: i === 3 ? 0.3 : 0, yaw: 0.4, eyes: 0 }));
    const cr = yActor(lerp(T.x + 0.7, P.x, k), P.z, { t, walking: k > 0 && k < 1, step: t * 2.6, heads, lantern: L, amb: 0.2, lean: 0.35 - k * 0.1, glow: 0.4 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, cr], amb: 0.12, skyDark: 1, fog: 0.14 });
    grade(ctx, t);
  } },
  { a: 57.6, b: 59.6, f: (ctx, t) => {
    const P = CRP(), k = smooth(seg(t, 57.7, 58.9));
    const cam = lookAt(mkCam({ x: P.x - 0.4, y: 1.4, z: P.z - 2.6 }), [P.x + 0.1, 2.75, P.z]);
    const L = lanternLight(M.x + 0.3, 1.85, M.z + 0.45, lantI(t), 4.5);
    const heads = YM.heads.map((h, i) => ({ k: i === 3 ? lerp(0.3, 1, k) : 0, yaw: i === 3 ? lerp(0.9, 0.35, k) : 0.4, eyes: i === 3 ? k : 0, look: [-1, 0.5] }));
    const cr = yActor(P.x, P.z, { t, heads, lantern: L, amb: 0.14, lean: 0.25, glow: 0.8 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [cr], amb: 0.1, skyDark: 1, fog: 0.12 });
    grade(ctx, t);
  } },
  { a: 59.6, b: 63.5, f: (ctx, t) => {
    const P = CRP();
    const cam = lookAt(mkCam({ x: P.x - 0.6, y: 1.0, z: P.z - 4.4 + (t - 59.6) * 0.12 }), [P.x + 0.1, 2.35, P.z]);
    const L = lanternLight(M.x + 0.3, 1.85, M.z + 0.45, lantI(t), 4.5);
    const order = [2, 4, 1, 5, 0, 6];
    const heads = YM.heads.map((h, i) => {
      if (i === 3) return { k: 1, yaw: 0.35 + n1(t * 0.5, 9) * 0.3, eyes: 1, look: [-1, 0.5] };
      const j = order.indexOf(i), s0 = E.s5_heads[0] + 0.2 + j * 0.5;
      const k = smooth(seg(t, s0, s0 + 0.75));
      return { k, yaw: (i < 3 ? -1 : 1) * (0.9 - k * 0.2) + n1(t * 0.7, 20 + i) * 0.4, eyes: k, twitch: 2 };
    });
    const cr = yActor(P.x, P.z, { t, heads, lantern: L, amb: 0.14, lean: 0.25, glow: 0.8 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [cr], amb: 0.1, skyDark: 1, fog: 0.12 });
    grade(ctx, t);
  } },
  { a: 63.5, b: 66.2, f: (ctx, t) => {
    const P = CRP();
    const cam = lookAt(mkCam({ x: M.x - 0.8, y: 1.62, z: M.z - 2.2 + (t - 63.5) * 0.1 }), [P.x + 0.2, 2.2, P.z]);
    const L = lanternLight(M.x + 0.3, 1.8, M.z + 0.45, lantI(t, 0.15), 4.5);
    const man = manActor(M.x, M.z, null, { t, view: 'back', li: 1.2, lantern: { I: L.I, swing: Math.sin(t * 11) * 0.03 }, amb: 0.2, handR: [0.32, -1.6], bias: -0.5 });
    const heads = YM.heads.map((h, i) => {
      const s0 = E.s5_turn[0] + 0.1 + [3, 1, 5, 0, 4, 2, 6][i] * 0.28, k = easeInOut(seg(t, s0, s0 + 0.35));
      return { k: 1, yaw: lerp((i < 3 ? -1 : 1) * 1.0, 0, k), eyes: 1, look: [-0.4 * k, 0.6 * k], twitch: 1 - k };
    });
    const cr = yActor(P.x, P.z, { t, heads, lantern: L, amb: 0.14, lean: 0.25, glow: 1 });
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, cr], amb: 0.1, skyDark: 1, fog: 0.12 });
    grade(ctx, t);
  } },
  { a: 66.2, b: 69.0, f: (ctx, t) => {
    ctx.fillStyle = '#040506'; ctx.fillRect(0, 0, W, H);
    const sp = TL.words.filter((w) => w.clip === 'm2').some((w) => t >= w.start - 0.03 && t < w.end);
    const glow = [];
    // the other heads around, darker and out of focus
    ctx.save();
    [[-330, 820, 2, 2.4, -0.4], [380, 760, 5, 2.3, 0.4], [-420, 1500, 1, 2.6, -0.2], [430, 1480, 6, 2.5, 0.3]].forEach(([dx, y, type, s, rt]) => {
      ctx.save(); ctx.translate(540 + dx + n1(t * 0.6, type) * 20, y + n1(t * 0.5, type + 9) * 14); ctx.rotate(rt); ctx.scale(s, s);
      drawYHead(ctx, type, { t, eyes: 1, light: [-0.5, 0.6], glow, hairLen: 1 }); ctx.restore();
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
    const z = 4.4 + (t - 66.2) * 0.12;
    ctx.save(); ctx.translate(540 + n1(t * 0.7, 3) * 10, 1290); ctx.rotate(0.08 + n1(t * 0.5, 4) * 0.04); ctx.scale(z, z);
    drawYHead(ctx, 0, { t, eyes: 1, mouth: sp ? 1 : 0, light: [-0.55, 0.65], glow, hairLen: 1.3, look: [0, 0.3] });
    ctx.restore();
    radial(ctx, 200, 1800, 1100, [[0, `rgba(255,160,80,${0.25 * lantI(t)})`], [1, 'rgba(0,0,0,0)']], 'overlay');
    for (const [ex, ey, r, a] of glow) radial(ctx, ex, ey, r * 1.8, [[0, `rgba(230,238,228,${0.3 * a})`], [1, 'rgba(0,0,0,0)']], 'screen');
    grade(ctx, t, { vig: 0.9 });
  } },
  { a: 69.0, b: 70.0, f: (ctx, t) => {
    const cam = mkCam({ x: M.x - 3.2, y: 0.85, z: M.z + 0.6, yaw: Math.PI / 2, pitch: -0.05 });
    const k = seg(t, 69.05, 69.6), J = manPose('fall', 0, { k });
    const L = lanternLight(M.x + 0.2 - k * 0.3, lerp(1.0, 0.3, k), M.z + 0.5 * (1 - k) - 0.2, lantI(t, 0.4));
    const man = manActor(M.x, M.z, J, { t, flip: !flipFor(cam, M.x, M.z, 0, 1), li: 1.1, lantern: { I: L.I, swing: k * 1.2 }, amb: 0.2, wide: true });
    const sh = pulse(t, 69.6, 0.4);
    ctx.save(); ctx.translate(n1(t * 40, 1) * 26 * sh, n1(t * 37, 2) * 26 * sh);
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.12, skyDark: 1 });
    ctx.restore();
    grade(ctx, t);
  } },

  // ---------------- 6: the chase ----------------
  { a: 70.0, b: 75.6, f: (ctx, t) => {
    const z = runZ(t), mx = pathX(z);
    const cam = mkCam({ x: mx - 3.7, y: 1.0, z: z + 0.4, yaw: Math.PI / 2 - 0.04, pitch: -0.06 });
    const L = lanternLight(mx, 1.0, z + 0.3, lantI(t, 0.25));
    const hit = pulses(t, E.s6_branch, 0.4);
    const J = manPose('run', t * 9.5); J.headAng = -0.15 - hit * 0.6;
    const man = manActor(mx, z, J, { t, flip: flipFor(cam, mx, z, 0, 1), li: 1, lantern: { I: L.I, swing: Math.sin(t * 9.5) * 0.7 }, amb: 0.2, flap: 1, wide: true });
    ctx.save(); ctx.translate(n1(t * 30, 3) * 6, n1(t * 26, 4) * 6 + Math.abs(Math.sin(t * 9.5)) * 6);
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.12, skyDark: 1, fog: 0.12 });
    ctx.restore();
    foregroundBranches(ctx, t, 1, hit);
    grade(ctx, t);
  } },
  { a: 75.6, b: 78.0, f: (ctx, t) => {
    const z = runZ(t), mx = pathX(z);
    const cam = lookAt(mkCam({ x: mx + 0.4, y: 1.25, z: z + 3.4 }), [mx, 1.2, z - 2]);
    const L = lanternLight(mx + 0.3, 1.0, z - 0.2, lantI(t, 0.25));
    const ph = t * 9.5, a = Math.sin(ph);
    const man = manActor(mx, z, null, { t, view: 'front', walking: true, ph, li: 1, lantern: { I: L.I, swing: a * 0.6 }, amb: 0.2, wide: true, mouth: 0.6, handL: [-0.26 - a * 0.05, -1.05 + a * 0.18], handR: [0.3, -1.05 - a * 0.15] });
    const shk = smooth(seg(t, E.s6_shake, E.s6_shake + 0.4));
    const shake = (T, h) => (T.z < z - 2 && T.z > z - 30) ? Math.sin(t * 13 + T.seed) * 0.16 * shk * (h / T.h) * (1 + h * 0.05) : 0;
    ctx.save(); ctx.translate(n1(t * 30, 3) * 6, n1(t * 26, 4) * 6);
    forestFrame(ctx, t, cam, { lantern: L, actors: [man], amb: 0.12, skyDark: 1, fog: 0.15, shake });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 78.0, b: 80.6, f: (ctx, t) => {
    const z = runZ(t), mx = pathX(z);
    const cam = mkCam({ x: mx - 4.0, y: 1.1, z: z + 0.6, yaw: Math.PI / 2 - 0.08, pitch: -0.08 });
    const L = lanternLight(mx, 1.0, z + 0.3, lantI(t, 0.25));
    const J = manPose('run', t * 9.5);
    const man = manActor(mx, z, J, { t, flip: flipFor(cam, mx, z, 0, 1), li: 1, lantern: { I: L.I, swing: Math.sin(t * 9.5) * 0.7 }, amb: 0.2, flap: 1, wide: true });
    const cz = z - 3.5 + (t - 78) * 1.2;
    const cr = yActor(mx + 9, cz, { t, walking: true, step: t * 7, heads: allUp({ twitch: 2 }), silhouette: [4, 6, 9, 0.96], glow: 0.9, lean: 0.5 });
    ctx.save(); ctx.translate(n1(t * 30, 3) * 6, n1(t * 26, 4) * 6);
    forestFrame(ctx, t, cam, { lantern: L, actors: [man, cr], amb: 0.12, skyDark: 1, fog: 0.15 });
    ctx.restore();
    foregroundBranches(ctx, t, 0.6, 0);
    grade(ctx, t);
  } },
  { a: 80.6, b: 82.4, f: (ctx, t) => {
    const zf = runZ(E.s6_fall), mx = pathX(zf);
    const cam = mkCam({ x: mx - 3.0, y: 0.32, z: zf + 0.6, yaw: Math.PI / 2 - 0.1, pitch: -0.08, cy: 980 });
    const k = seg(t, 80.65, 81.15);
    const J = k < 1 ? manPose('trip', 0, { k }) : manPose('prone');
    const lz = zf + lerp(0.3, 2.6, easeOut(seg(t, 80.8, 81.7))), ly = 0.12 + Math.abs(Math.sin(seg(t, 80.8, 81.4) * Math.PI * 2)) * 0.25 * (1 - seg(t, 80.8, 81.4));
    const L = lanternLight(mx + 0.2, ly + 0.1, lz, lantI(t, 0.6) * (0.85 + 0.15 * Math.sin(t * 20)));
    const lam = { x: mx + 0.2, z: lz, draw: (ctx2, c2) => { const p = proj(c2, mx + 0.2, ly + 0.16, lz); drawLantern(ctx2, p[0], p[1], p[3], { I: L.I, swing: seg(t, 80.8, 81.7) * 1.4 }, t); } };
    const man = manActor(mx, zf + Math.min(1, k) * 0.2, J, { t, flip: flipFor(cam, mx, zf, 0, 1), li: 0.7, amb: 0.2, noLantern: true, wide: true });
    const sh = pulse(t, 81.1, 0.5);
    ctx.save(); ctx.translate(n1(t * 40, 1) * 30 * sh, n1(t * 37, 2) * 30 * sh);
    forestFrame(ctx, t, cam, { glowL: true, lantern: L, actors: [man, lam], amb: 0.12, skyDark: 1, fog: 0.12 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 82.4, b: 85.6, f: (ctx, t) => {
    const zf = runZ(E.s6_fall), mx = pathX(zf), lz = zf + 2.6;
    const cam = lookAt(mkCam({ x: mx - 1.6, y: 0.4, z: zf + 4.6 }), [mx + 0.2, 1.05, zf - 3]);
    const L = lanternLight(mx + 0.2, 0.22, lz, lantI(t, 0.35), 3.2);
    const lam = { x: mx + 0.2, z: lz, draw: (ctx2, c2) => { const p = proj(c2, mx + 0.2, 0.28, lz); drawLantern(ctx2, p[0], p[1], p[3], { I: L.I, swing: 1.4 }, t); } };
    const gk = seg(t, 83.7, 84.6);
    const J = t < 83.7 ? manPose('prone') : gk < 1 ? manPose('getup', 0, { k: gk }) : manPose('run', t * 9.5);
    const mz = zf + 0.2 + (gk >= 1 ? (t - 84.6) * 4 : 0);
    const man = manActor(mx, mz, J, { t, flip: flipFor(cam, mx, zf, 0, 1), li: 0.8, amb: 0.2, noLantern: true, wide: true });
    const ck = seg(t, E.s6_heads[0], E.s6_heads[1] + 0.2);
    const heads = YM.heads.map((h, i) => ({ k: 1, yaw: n1(t * 0.6, i) * 0.4, eyes: 1, twitch: 1.5 }));
    const cr = yActor(mx - 0.4, lerp(zf - 6.5, zf - 2.6, ck), { t, walking: true, step: t * 2.2, heads, lantern: L, amb: 0.1, lean: 0.45, glow: 1.1 });
    forestFrame(ctx, t, cam, { glowL: true, lantern: L, actors: [man, lam, cr], amb: 0.1, skyDark: 1, fog: 0.15 });
    grade(ctx, t);
  } },
  { a: 85.6, b: 88.6, fout: 0.15, f: (ctx, t) => {
    const z = 86 + (t - 85.6) * 3.8, mx = pathX(z);
    const cam = mkCam({ x: pathX(z - 6) - 0.5, y: 1.75, z: 82 + (t - 85.6) * 2.2, yaw: 0.02, pitch: 0.02 });
    const ph = t * 9.5;
    const man = manActor(mx, z, null, { t, view: 'back', walking: true, ph, li: 0, amb: 0.24, noLantern: true, handL: [-0.3, -1.05 + Math.sin(ph) * 0.15], handR: [0.3, -1.05 - Math.sin(ph) * 0.15] });
    forestFrame(ctx, t, cam, { actors: [man, cabinActor({ t, amb: 0.2 })], amb: 0.2, skyDark: 0.6, fog: 0.2 });
    moonShafts(ctx, t, 0.08, 7);
    grade(ctx, t);
  } },

  // ---------------- 7: the cabin door ----------------
  { a: 88.6, b: 92.0, f: (ctx, t) => {
    const sl = pulse(t, E.s7_slam, 0.6), bolt = smooth(seg(t, 90.4, 90.9));
    drawCabinInside(ctx, { t, z: 1.05, shake: sl, bolt, doorKick: sl });
    const lean = smooth(seg(t, 88.6, 89.0));
    const J = null;
    drawManFigure(ctx, 548, 1720, 560, J, { t, view: 'back', li: 0, amb: 0.3, handL: [-0.32, -1.45 + lean * 0.05], handR: [bolt < 1 ? 0.12 + bolt * 0.28 : 0.4, -1.12], headTilt: Math.sin(t * 6) * 0.03 * (1 - bolt) });
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(20px)'; ctx.fillStyle = 'rgba(120,150,190,0.08)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    grade(ctx, t, { vig: 0.9 });
  } },
  { a: 92.0, b: 95.6, f: (ctx, t) => {
    const k = easeInOut(seg(t, 92.0, 95.6));
    const cam = lookAt(mkCam({ x: CABIN.x - 0.4 + k * 0.3, y: 1.55, z: CABIN.z - 9.5 + k * 5.2 }), [CABIN.x, 1.25, CABIN.z]);
    const kn = pulses(t, E.s7_knocks, 0.3);
    const dust = Math.max(...E.s7_knocks.map((kk) => t > kk ? Math.exp(-(t - kk) * 2) : 0));
    const cab = cabinActor({ t, amb: 0.42, knock: kn * 3, dust, dustSeed: Math.floor(t * 10), shadow: smooth(seg(t, 92.6, 93.4)) * (0.8 + 0.2 * n1(t * 3, 5)), shadowX: -0.4 + n1(t * 0.5, 2) * 0.2 });
    ctx.save(); ctx.translate(n1(t * 40, 1) * 8 * kn, 0);
    forestFrame(ctx, t, cam, { actors: [cab], amb: 0.24, skyDark: 0.5, fog: 0.18, treeFilter: (T) => Math.hypot(T.x - CABIN.x, T.z - CABIN.z) > 4 });
    ctx.restore();
    grade(ctx, t);
  } },
  { a: 95.6, b: 99.6, f: (ctx, t) => {
    drawCabinInside(BGX, { t, z: 1.6 });
    ctx.filter = 'blur(8px)'; ctx.drawImage(BG, -300, -200, W * 1.4, H * 1.2); ctx.filter = 'none';
    const tr = t < E.s7_stop ? 1 : 0.3, sh = { x: n1(t * 18, 1) * 3 * tr, y: n1(t * 16, 2) * 3 * tr };
    drawManBust(ctx, 600 + sh.x, 940 + sh.y, 1.05, { t, light: 'dim', look: [-0.6, 0.1], open: 1, wide: 0.9, raise: 0.8, knit: 0.4, pupil: 0.2, sweat: 0.8, hand: { tremble: tr }, rot: -0.05 });
    // moon slit across his eyes
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(8px)'; ctx.fillStyle = 'rgba(150,176,206,0.16)'; ctx.fillRect(0, 820, W, 70); ctx.restore();
    grade(ctx, t, { vig: 0.92 });
  } },
  { a: 99.6, b: 101.9, f: (ctx, t) => {
    const up = easeInOut(seg(t, 99.8, 101.5)), cr = Math.max(0, 1 - Math.max(0, t - E.s7_creak) * 1.2) * (t > E.s7_creak ? 1 : 0);
    drawCabinInside(ctx, { t, z: 1.15, up: up * 0.55, creak: cr });
    if (up < 0.6) drawManFigure(ctx, 330, 1880 + up * 900, 640, null, { t, view: 'front', li: 0, amb: 0.3, wide: true, handL: [-0.05, -1.55], handR: [0.1, -1.5], faceLook: 0 });
    grade(ctx, t, { vig: 0.92 });
  } },
  { a: 101.9, b: 103.9, f: (ctx, t) => {
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    drawManBust(ctx, 540, 1080, 1.25, { t, light: 'dim', look: [0, -0.8], open: 1, wide: 1, raise: 1, pupil: 0.15, sweat: 1, mouth: 0.25 });
    // hair strands sinking into the frame from above
    const k = smooth(seg(t, 102.0, 103.8));
    ctx.save(); ctx.strokeStyle = 'rgba(26,28,34,0.95)'; ctx.lineCap = 'round';
    const r = mulberry32(9);
    for (let i = 0; i < 70; i++) { const x = 80 + r() * 920, L = (200 + r() * 700) * k, w = 2 + r() * 5; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, -20); ctx.bezierCurveTo(x + n1(t * 0.5 + i, 3) * 30, L * 0.4, x + n1(t * 0.6 + i, 4) * 50, L * 0.7, x + n1(t * 0.4 + i, 5) * 60, L); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, 600 * k + 100, [[0, 'rgba(0,0,0,0.95)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, 700);
    grade(ctx, t, { vig: 0.92 });
  } },

  // ---------------- 8: the ceiling, and years later ----------------
  { a: 103.9, b: 105.6, f: (ctx, t) => {
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const tr = { x: n1(t * 20, 1) * 4, y: n1(t * 18, 2) * 4 };
    drawManBust(ctx, 540 + tr.x, 1150 + tr.y, 3.0 + (t - 103.9) * 0.08, { t, light: 'dim', look: [0.1 * n1(t * 3, 5), -0.3], open: 1, wide: 1, raise: 1, pupil: 0.12, sweat: 1 });
    grade(ctx, t, { vig: 0.95 });
  } },
  { a: 105.6, b: 107.0, f: (ctx, t) => {
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const k = easeInOut(seg(t, 105.7, 106.8));
    drawManBust(ctx, 560, 1250 - k * 60, 1.35, { t, light: 'dim', look: [0, lerp(-0.2, -1, k)], open: 1, wide: 1, raise: 1, pupil: 0.15, sweat: 1, mouth: 0.3 * k, rot: 0.06 });
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, 700, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, 700);
    grade(ctx, t, { vig: 0.95 });
  } },
  { a: 107.0, b: 108.9, f: (ctx, t) => {
    drawCabinInside(ctx, { t, z: 1.0 });
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, 900, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(0, 0, W, 900);
    drawManBust(ctx, 300, 1500, 0.4, { t, light: 'dim', look: [0.3, -1], open: 1, wide: 1, raise: 1, pupil: 0.15 });
    const glow = [];
    const pos = [[150, 820, 2, -0.3], [330, 640, 1, 0.2], [520, 900, 3, -0.1], [700, 680, 0, 0.15], [860, 880, 5, 0.3], [430, 1080, 6, -0.25], [760, 1060, 4, 0.2]];
    pos.forEach(([x, y, type, rt], i) => {
      const k = easeOut(seg(t, 107.05 + i * 0.13, 107.9 + i * 0.13)), yy = lerp(-260, y, k);
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#2c2a26'; ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(x + rt * 200, -60); ctx.quadraticCurveTo(x - rt * 80, (yy - 200) / 2, x, yy - 200); ctx.stroke(); ctx.strokeStyle = 'rgba(120,118,108,0.35)'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = '#050506'; ctx.lineWidth = 70; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x + rt * 200 + 20, -60); ctx.quadraticCurveTo(x - rt * 80 + 20, (yy - 200) / 2, x + 15, yy - 230); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(x + n1(t * 0.8, i) * 10, yy); ctx.rotate(rt + n1(t * 0.9, i + 5) * 0.08); ctx.scale(1.45, 1.45);
      drawYHead(ctx, type, { t, eyes: 1, light: [0.3, 0.8], glow, hairLen: 1.2, look: [0, 1] });
      ctx.restore();
    });
    ctx.fillStyle = 'rgba(4,6,10,0.55)'; ctx.fillRect(0, 0, W, H);
    for (const [ex, ey, r, a] of glow) radial(ctx, ex, ey, r * 2.2, [[0, `rgba(230,238,228,${0.5 * a})`], [1, 'rgba(0,0,0,0)']], 'screen');
    grade(ctx, t, { vig: 0.92 });
  } },
  { a: 108.9, b: 109.6, f: (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } },
  { a: 109.6, b: 119.4, fin: 0.8, fout: 0.6, f: (ctx, t) => {
    const eyes = YM.heads.map((h, i) => smooth(seg(t, E.s8_window + i * 0.2, E.s8_window + 0.35 + i * 0.2)));
    drawOldRoom(ctx, { t, z: 1 + (t - 109.6) * 0.012, eyes });
    grade(ctx, t, { cold: 0.25 });
  } },

  // ---------------- 9: closing ----------------
  { a: 119.4, b: 127.0, fin: 1.0, f: (ctx, t) => {
    const z = 58 + (t - 119.4) * 1.0;
    const cam = mkCam({ x: pathX(z) + 0.4 + Math.sin(t * 0.3) * 0.3, y: 1.6, z, yaw: 0.04 + Math.sin(t * 0.25) * 0.05, pitch: -0.03 });
    const sa = smooth(seg(t, E.s9_shadow, E.s9_shadow + 1.5));
    const cxx = pathX(z + 15) + 1.2, czz = z + 15;
    const cr = yActor(cxx, czz, { t, heads: allUp({ yaw: 1.2, eyes: 0 }), silhouette: [3, 4, 6, 0.99], glow: 0, lean: 0.2, alpha: sa });
    const back = { x: cxx, z: czz + 2, draw: (c2, cm) => { const p = proj(cm, cxx, 2, czz + 2); radialEllipse(c2, p[0], p[1], 3.4 * p[3], 2.6 * p[3], [[0, `rgba(120,140,160,${0.35 * sa})`], [1, 'rgba(60,80,100,0)']], 'screen'); } };
    forestFrame(ctx, t, cam, { treeFilter: (T) => !(T.z > z && T.z < czz && Math.abs(T.x - cxx) < 1.5), actors: [back, cr], amb: 0.14, skyDark: 0.7, fog: 0.3 });
    moonShafts(ctx, t, 0.06, 9);
    grade(ctx, t);
  } },
  { a: 127.0, b: 133.3, fout: 1.5, f: (ctx, t) => {
    const cz = 58 + 7.6 + 17, cx = pathX(cz) + 1.2;
    const cam = lookAt(mkCam({ x: cx - 0.4, y: 1.7, z: cz - 7.5 + (t - 127) * 0.45 }), [cx + 0.1, 2.25, cz]);
    const order = [3, 1, 5, 0, 4, 2, 6];
    const heads = YM.heads.map((h, i) => { const s0 = E.s9_turn[0] + 0.2 + order.indexOf(i) * 0.6, k = easeInOut(seg(t, s0, s0 + 0.45)); return { k: 1, yaw: lerp(i < 3 ? -1.25 : i > 3 ? 1.25 : 1.1, 0, k), eyes: k, twitch: 0.5 }; });
    const cr = yActor(cx, cz, { t, heads, silhouette: [4, 6, 9, 0.93], glow: 1.3, lean: 0.2, moonRim: 0.25 });
    forestFrame(ctx, t, cam, { actors: [cr], amb: 0.12, skyDark: 0.7, fog: 0.26 });
    grade(ctx, t);
  } },
  { a: 133.3, b: 135.0, f: (ctx, t) => { drawTitle(ctx, t, smooth(seg(t, E.title[0], E.title[0] + 0.15)) * (1 - smooth(seg(t, 134.55, 134.95)))); } },
];
function runZ(t) {
  if (t < E.s6_fall) return 41 + (t - 70.0) * 3.6;
  return 41 + (E.s6_fall - 70.0) * 3.6;
}
// dark branches whipping past the lens during the chase
function foregroundBranches(ctx, t, a, hit) {
  ctx.save(); ctx.fillStyle = '#020203'; ctx.strokeStyle = '#020203'; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const per = 1.6 + i * 0.37, u = ((t + i * 0.53) % per) / per;
    const x = lerp(W + 500, -500, u), y = 300 + i * 420 + Math.sin(i * 3) * 120;
    if (a * (i % 2 ? 1 : 0.7) <= 0) continue;
    ctx.globalAlpha = 0.95 * a; ctx.filter = 'blur(10px)';
    ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(x - 400, y + 200); ctx.quadraticCurveTo(x, y - 40, x + 420, y + 60); ctx.stroke();
    ctx.lineWidth = 14; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 200 + k * 140, y + 40); ctx.lineTo(x - 140 + k * 150, y - 120 - k * 20); ctx.stroke(); }
  }
  ctx.restore();
  if (hit > 0) { ctx.save(); ctx.globalAlpha = 0.25 * hit; ctx.fillStyle = '#c8d0dc'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
