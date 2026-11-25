// KAPIDAKİ SURET — shot list. Each shot: {a, b, f(ctx, t, lt, u), x: dissolve-in length, fin, fout}.
'use strict';
const E = window.TL.events;
const at = (k, i = 0) => (Array.isArray(E[k]) ? E[k][i] : E[k]);

// ---------- recurring set-ups ----------
function extNightSky(ctx, t, plate, cam, o = {}) {
  // horizon of the plate mapped through the camera
  const hzPlate = o.hz ?? 1000;
  const [, hy] = toCanvas(plate, [0, hzPlate], cam);
  drawNightSky(ctx, t, { horizon: hy, moonX: o.moonX ?? W * 0.74, moonY: o.moonY ?? Math.max(120, hy - 520), ridge: o.ridge, ridgeH: o.ridgeH, wind: 16 });
}
function pillowShot(ctx, t, cam, face, o = {}) {
  bgDraw(ctx, 'pillow_top', cam, { lamp: 0.85 });
  wifeOnPillow(ctx, 'pillow_top', cam, Object.assign({ t, breath: 1 + Math.sin(t * 1.6) * 0.004 }, face));
  grade(ctx, Object.assign({ bloom: 0.22, tint: '#0d2236', tintA: 0.35, vig: 0.9, vin: 0.25 }, o));
}
// a doorway shot from the wife's pillow: plate variant (near / far focus), husband (foreground), double (background)
function doorShot(ctx, t, cam, o = {}) {
  const focus = o.focus ?? 1;                       // 0 = husband sharp, 1 = doorway sharp
  const dbl = o.dbl ?? 0;
  const base = dbl > 0 ? 'bed_door_dbl' : 'bed_door';
  const lampK = o.lamp ?? lampFlicker(t, 2);
  if (focus >= 0.999) bgDraw(ctx, base + '_far', cam, { lamp: lampK });
  else if (focus <= 0.001) bgDraw(ctx, base + '_near', cam, { lamp: lampK });
  else { bgDraw(ctx, base + '_near', cam, { lamp: lampK }); bgDraw(ctx, base + '_far', cam, { lamp: lampK, alpha: smooth(focus) }); }
  if (dbl > 0) doubleInDoor(ctx, base + '_far', cam, Object.assign({ alpha: dbl, blur: (1 - focus) * 10, keyGain: 0.95 * lampK, t }, o.dblO || {}));
  if (o.husband !== false) husbandOnPillow(ctx, base + '_far', cam, Object.assign({ blur: focus * 16, t, breath: 1 + Math.sin(t * 1.25) * 0.006 }, o.husO || {}));
  grade(ctx, Object.assign({ bloom: 0.3, tint: '#0c2034', tintA: 0.3, vig: 0.92, vin: 0.22 }, o.grade || {}));
}
const CAMS_ = {
  doorWide: { cx: 675, cy: 1250, zoom: 1.0 },
  doorDbl: { cx: 670, cy: 1180, zoom: 1.35 },
  doorFace: { cx: 660, cy: 905, zoom: 3.6 },
};

let SHOTS = [
  // ================= S1: Ereğli at night (0 - 20) =================
  { a: 0, b: at('street'), fin: 0.8, f: (ctx, t, lt, u) => {
    const H0 = anc('aerial', 'house');
    const cam = camLerp({ cx: 675, cy: 1220, zoom: 1.0 }, { cx: lerp(675, H0[0], 0.55), cy: lerp(1220, H0[1], 0.5), zoom: 1.32 }, u, (x) => x);
    extNightSky(ctx, t, 'aerial', cam, { hz: 560, moonY: 230, ridgeH: 70 });
    bgDraw(ctx, 'aerial', cam, { lamp: 0.95 + 0.05 * n1(t * 3, 1) });
    drawFog(ctx, t, 0.05, 30, 5, 1, H * 0.2, H);
    grade(ctx, { bloom: 0.4, tint: '#0b1d33', tintA: 0.35, vig: 0.85 });
    cardLabel(ctx, smooth(seg(t, at('card', 0), at('card', 0) + 0.5)) * (1 - smooth(seg(t, at('card', 1) - 0.4, at('card', 1)))), 'KONYA', 'EREĞLİ — 2016', 260);
  } },
  { a: at('street'), b: at('window'), x: 0.5, f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 780, cy: 1500, zoom: 1.04 }, { cx: 700, cy: 1480, zoom: 1.2 }, u);
    cam.shake = handheld(t, 0.5, 3);
    extNightSky(ctx, t, 'ext_side_n', cam, { hz: 1290, moonX: W * 0.28, moonY: 300, ridge: false });
    const lk = lampFlicker(t, 5, 0.6);
    bgDraw(ctx, 'ext_side_n', cam, { lamp: lk });
    swayLayer(ctx, FXIMG.tree, 'ext_side_n', cam, t, 14, 1500);
    windLeaves(ctx, t, 14, 0.5);
    drawFog(ctx, t, 0.04, 40, 4, 2, H * 0.5, H);
    grade(ctx, { bloom: 0.38, tint: '#0b1d33', tintA: 0.3, vig: 0.88 });
  } },
  { a: at('window'), b: at('eyes1'), x: 0.4, fout: 0.25, f: (ctx, t, lt, u) => {
    const wc = anc('ext_win_n', 'win_bed');
    const cam = camLerp({ cx: 675, cy: 1180, zoom: 1.0 }, { cx: wc[0], cy: wc[1], zoom: 1.75 }, u, easeIn);
    cam.shake = handheld(t, 0.35, 5);
    extNightSky(ctx, t, 'ext_win_n', cam, { hz: -2000, ridge: false });
    bgDraw(ctx, 'ext_win_n', cam, { lamp: 0.55 * lampFlicker(t, 5, 0.6) });
    grade(ctx, { bloom: 0.35, tint: '#0b1d33', tintA: 0.35, vig: 0.92, dark: `rgba(${255 - u * 90 | 0},${255 - u * 90 | 0},${255 - u * 80 | 0},1)` });
  } },
  { a: at('eyes1'), b: at('corr1'), f: (ctx, t, lt) => {
    const op = smooth(seg(t, at('eyes1_open'), at('eyes1_open') + 0.12));
    const fp = anc('pillow_top', 'headW');
    pillowShot(ctx, t, { cx: fp[0] + 6, cy: fp[1] + 10, zoom: 4.6 + lt * 0.15, shake: handheld(t, 0.4, 7) },
      { open: op, wide: 0.9 * op, look: [0.15 + 0.6 * op, -0.1], pupil: 0.95, raise: 0.6 * op });
  } },
  { a: at('corr1'), b: at('sil'), f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 675, cy: 1180, zoom: 1.08 }, { cx: 675, cy: 1150, zoom: 1.32 }, u);
    cam.shake = handheld(t, 0.8, 9);
    bgDraw(ctx, 'corridor_n', cam, { gain: 1.9 });
    grade(ctx, { bloom: 0.25, tint: '#0c1d30', tintA: 0.4, vig: 0.95 });
  } },
  { a: at('sil'), b: at('eyes2'), f: (ctx, t, lt, u) => {
    // a figure waiting in the doorway: no face, only the outline
    const cam = camLerp({ cx: 675, cy: 1210, zoom: 1.2 }, { cx: 668, cy: 1150, zoom: 1.45 }, u);
    doorShot(ctx, t, cam, { focus: 1, dbl: 1, husband: false, dblO: { keyGain: 0.06, fillGain: 0.6, rimGain: 1.2, open: 1 }, lamp: 0.25, grade: { dark: 'rgb(170,170,180)' } });
  } },
  { a: at('eyes2'), b: at('husb1'), f: (ctx, t, lt) => {
    const fp = anc('pillow_top', 'headW');
    const dart = Math.sin(t * 9) > 0.3 ? 0.85 : 0.6;
    pillowShot(ctx, t, { cx: fp[0] + 6, cy: fp[1] + 25, zoom: 4.4, shake: handheld(t, 0.6, 8) },
      { open: 1, wide: 1, look: [dart, -0.15], pupil: 1, raise: 0.9, knit: 0.3, wet: 0.6 });
  } },
  { a: at('husb1'), b: at('black1'), f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 560, cy: 1480, zoom: 1.35 }, { cx: 545, cy: 1500, zoom: 1.5 }, u);
    doorShot(ctx, t, cam, { focus: 0, dbl: 0.7, dblO: { keyGain: 0.05, rimGain: 0.8 } });
  } },
  { a: at('black1'), b: 20.0, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    titleCard(ctx, t, smooth(seg(t, at('title', 0), at('title', 0) + 0.35)) * (1 - smooth(seg(t, at('title', 1) - 0.3, at('title', 1)))));
  } },

  // ================= S2: the first night (20 - 34.5) =================
  { a: 20.0, b: at('face2'), fin: 0.6, f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 860, cy: 1560, zoom: 1.0 }, { cx: 830, cy: 1500, zoom: 1.1 }, u, (x) => x);
    bgDraw(ctx, 'bed_wide', cam, { lamp: lampFlicker(t, 2) });
    coupleWide(ctx, 'bed_wide', cam, { open: 0 });
    grade(ctx, { bloom: 0.3, tint: '#0c2034', tintA: 0.35, vig: 0.9 });
  } },
  { a: at('face2'), b: at('door2'), f: (ctx, t, lt, u) => {
    const fp = anc('pillow_top', 'headW');
    const op = smooth(seg(t, at('open2'), at('open2') + 0.14));
    const look = t < 23.4 ? [0.1, 0] : (t < 24.3 ? [-0.5, -0.1] : [0.55, -0.2]);
    pillowShot(ctx, t, { cx: fp[0] + 30, cy: fp[1] + 120, zoom: lerp(1.15, 1.45, u) },
      { open: op, wide: 0.35 * op, look, pupil: 0.85, raise: 0.25 * op });
  } },
  { a: at('door2'), b: at('dbl2'), f: (ctx, t, lt, u) => {
    // she lifts her head: the view rises from the husband's shoulder to the doorway
    const cam = camLerp({ cx: 700, cy: 1600, zoom: 1.2 }, { cx: 670, cy: 1220, zoom: 1.22 }, u);
    const ap = smooth(seg(t, at('reveal2') - 0.2, at('reveal2') + 0.9));
    doorShot(ctx, t, cam, { focus: smooth(seg(t, 25.4, 26.4)), dbl: ap, dblO: { keyGain: 0.6 } });
  } },
  { a: at('dbl2'), b: at('dblcu2'), f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 670, cy: 1200, zoom: 1.3 }, { cx: 662, cy: 1020, zoom: 2.0 }, u);
    doorShot(ctx, t, cam, { focus: 1, dbl: 1, husband: true });
  } },
  { a: at('dblcu2'), b: at('react2'), f: (ctx, t, lt, u) => {
    const cam = { cx: 658, cy: 930, zoom: lerp(3.4, 3.8, u) };
    doorShot(ctx, t, cam, { focus: 1, dbl: 1, husband: false });
  } },
  { a: at('react2'), b: 34.5, f: (ctx, t, lt) => {
    const fp = anc('pillow_top', 'headW');
    pillowShot(ctx, t, { cx: fp[0] + 6, cy: fp[1] + 30, zoom: 3.0, shake: handheld(t, 0.5, 4) },
      { open: 1, wide: 1, look: [0.75, -0.25], pupil: 1, raise: 0.85, knit: 0.25, wet: 0.5, mouth: 0.12 + 0.04 * Math.sin(t * 14) });
  } },

  // ================= S3: the second likeness (34.5 - 48.5) =================
  { a: 34.5, b: at('husb3'), f: (ctx, t, lt) => {
    const fp = anc('pillow_top', 'headW');
    const k = smooth(seg(t, 35.5, 35.9));
    pillowShot(ctx, t, { cx: fp[0] + 6, cy: fp[1] + 35, zoom: 2.7 },
      { open: 1, wide: 0.8, look: [lerp(0.8, 0.95, k), lerp(-0.25, 0.45, k)], pupil: 1, raise: 0.7, wet: 0.5 });
  } },
  { a: at('husb3'), b: at('rack3', 1), f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 560, cy: 1380, zoom: 1.32 }, { cx: 600, cy: 1250, zoom: 1.38 }, u);
    doorShot(ctx, t, cam, { focus: smooth(seg(t, at('rack3', 0), at('rack3', 1))), dbl: 1 });
  } },
  { a: at('rack3', 1), b: at('dblcu3'), f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 600, cy: 1250, zoom: 1.38 }, { cx: 640, cy: 1080, zoom: 1.75 }, u);
    doorShot(ctx, t, cam, { focus: 1, dbl: 1 });
  } },
  { a: at('dblcu3'), b: at('scream3'), f: (ctx, t, lt, u) => {
    const sm = smooth(seg(t, at('smile3', 0), at('smile3', 1)));
    const cam = { cx: 657, cy: 920, zoom: lerp(3.8, 4.6, u) };
    doorShot(ctx, t, cam, { focus: 1, dbl: 1, husband: false, dblO: { smile: Math.round(sm * 6) / 6 * 0.8, rot: 0.04 * sm } });
  } },
  { a: at('scream3'), b: at('door3'), f: (ctx, t, lt, u) => {
    const fp = anc('pillow_top', 'headW');
    const mo = smooth(seg(t, 43.2, 44.0)) * (0.55 + 0.05 * Math.sin(t * 22));
    pillowShot(ctx, t, { cx: fp[0] + 6, cy: fp[1] + 40, zoom: lerp(2.6, 3.1, u), shake: handheld(t, 0.7, 6) },
      { open: 1, wide: 1, look: [0.8, -0.3], pupil: 1, raise: 1, knit: 0.5, mouth: mo, wet: 1, tears: smooth(seg(t, 44.5, 46)) * 0.8 });
  } },
  { a: at('door3'), b: 48.5, fout: 0.3, f: (ctx, t, lt, u) => {
    const cam = { cx: 668, cy: 1180, zoom: 1.4 };
    const fl = t < at('flick3', 0) ? lampFlicker(t, 2, 0.5) : (t < at('flick3', 1) ? (Math.sin(t * 70) > 0 ? 0.15 : 0.6) : 1);
    const gone = t >= at('flick3', 1) ? 0 : 1;
    doorShot(ctx, t, cam, { focus: 1, dbl: gone, lamp: fl, husband: true, dblO: { smile: 0.8 } });
  } },

  // ================= S4: endless nights (48.5 - 62.5) =================
  { a: 48.5, b: at('shadow4'), fin: 0.25, f: (ctx, t, lt, u) => {
    const rise = easeOut(seg(t, at('situp4') - 0.05, at('situp4') + 0.32));
    const cam = { cx: 500, cy: 1020 + (1 - rise) * 60, zoom: 2.0 + u * 0.25, shake: handheld(t, 0.4 + 1.6 * pulse(t, at('situp4'), 0.6), 11) };
    bgDraw(ctx, 'bed_sit', cam, { lamp: lampFlicker(t, 2) });
    for (let g = 0; g < 3; g++) {
      const r2 = clamp(rise - g * 0.06);
      if (g > 0 && rise > 0.98) break;
      ctx.save(); ctx.globalAlpha = g ? 0.25 : 1;
      wifeSitting(ctx, 'bed_sit', cam, { dy: (1 - r2) * 520, open: 1, wide: 0.9, look: [0.75, -0.05], pupil: 1, raise: 0.85, knit: 0.3, mouth: 0.18 + 0.1 * pulse(t, at('situp4'), 1.5), t, wet: 0.4 });
      ctx.restore();
    }
    grade(ctx, { bloom: 0.25, tint: '#0c2034', tintA: 0.35, vig: 0.9 });
  } },
  { a: at('shadow4'), b: at('kdoor4'), x: 0.3, f: (ctx, t, lt, u) => {
    const cam = { cx: 675, cy: 1200, zoom: 1.12 + u * 0.12, shake: handheld(t, 0.5, 12) };
    bgDraw(ctx, 'corridor_n', cam, { gain: 2.8 });
    // cold moonlight spilling out of the bedroom door onto the opposite wall
    const sp = [[5.35, 0.15, 2.2], [5.35, 0.15, 3.6], [5.35, 2.2, 3.9], [5.35, 2.4, 2.1]].map((p) => toCanvas('corridor_n', proj3('corridor_n', p), cam));
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(22px)'; ctx.fillStyle = 'rgba(70,92,130,0.55)';
    ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(sp[i][0], sp[i][1]); ctx.closePath(); ctx.fill(); ctx.restore();
    // a shadow with no one to cast it slides along the left wall toward the camera
    const k = easeInOut(seg(t, at('shadow4') + 0.3, at('shadow4') + 2.6));
    const p3 = [5.33, 1.0, lerp(-1.5, 3.4, k)];
    const pp = proj3('corridor_n', p3), [X, Y, sc] = toCanvas('corridor_n', pp, cam);
    wallShadow(ctx, X, Y, sc * 1300 / pp[2] / 900, 0.95 * (1 - smooth(seg(t, at('kdoor4') - 0.3, at('kdoor4')))) * smooth(seg(t, at('shadow4') + 0.2, at('shadow4') + 0.8)), 0.9);
    grade(ctx, { bloom: 0.2, tint: '#0c1d30', tintA: 0.4, vig: 0.95, lift: 'rgb(10,12,16)' });
  } },
  { a: at('kdoor4'), b: at('window4'), f: (ctx, t, lt, u) => {
    const cam = { cx: 690, cy: 1150, zoom: 1.12 + u * 0.18, shake: handheld(t, 0.3, 13) };
    bgDraw(ctx, 'kitchen_n', cam, { gain: 3.0 });
    const kp = [[4.32, 0.0, -3.25], [5.18, 0.0, -3.25], [5.18, 2.05, -3.25], [4.32, 2.05, -3.25]].map((p) => toCanvas('kitchen_n', proj3('kitchen_n', p), cam));
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(40,52,74,0.85)'; ctx.filter = 'blur(10px)';
    ctx.beginPath(); ctx.moveTo(kp[0][0], kp[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(kp[i][0], kp[i][1]); ctx.closePath(); ctx.fill(); ctx.restore();
    const op = easeInOut(seg(t, at('kopen4', 0), at('kopen4', 1))) * 0.75 + 0.02 * Math.sin(t * 3);
    doorLeaf(ctx, 'kitchen_n', 'kitchen_n', cam, { hinge: [5.18, -3.1], dir: [-1, 0], width: 0.86, height: 2.05, angle: op, swing: 1, img: FXIMG.door,
      shade: (uu, a) => 0.3 * (1 - a * 0.5) * (0.75 + 0.25 * uu) });
    grade(ctx, { bloom: 0.2, tint: '#0c1d30', tintA: 0.4, vig: 0.95, lift: 'rgb(8,10,14)' });
  } },
  { a: at('window4'), b: 62.5, x: 0.6, f: (ctx, t, lt, u) => {
    const sp = anc('window_day', 'sit_win');
    const cam = camLerp({ cx: sp[0] + 20, cy: sp[1] + 260, zoom: 1.9 }, { cx: sp[0] + 10, cy: sp[1] + 180, zoom: 2.35 }, u);
    bgDraw(ctx, 'window_day', cam);
    const blink = (t % 3.7) < 0.14 ? 0.1 : 1;
    // she sits just inside the glass (drawn under the reflections)
    ctx.save(); paneClip(ctx, 'window_day', cam); ctx.clip();
    bustAt(ctx, 'wife', 'window_day', 'sit_win', 'window_day', cam, { rig: 'dayF', hair: 'down', outfit: 'cardigan', k: 1.4, open: 0.78 * blink, look: [-0.25, 0.35], tired: 1, keyGain: 0.75, fillGain: 1.1, t });
    ctx.restore();
    // glass reflections of the overcast sky + trees
    ctx.save(); paneClip(ctx, 'window_day', cam); ctx.clip(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.3;
    ctx.fillStyle = linGrad(ctx, 0, 0, W * 0.6, H, [[0, '#b4bcc6'], [0.35, '#5a6068'], [0.6, '#2a3036'], [1, '#596069']]); ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#20262c'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(120 + k * 210, 300 + (k % 2) * 90, 120, 260, 0.2, 0, TAU); ctx.fill(); }
    ctx.restore();
    grade(ctx, { bloom: 0.15, tint: '#46505e', tintA: 0.3, vig: 0.75, dark: 'rgb(225,228,232)' });
  } },

  // ================= S5: leaving (62.5 - 76.5) =================
  { a: 62.5, b: at('look5'), x: 0.5, f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 700, cy: 1300, zoom: 1.1 }, { cx: 640, cy: 1360, zoom: 1.3 }, u);
    bgDraw(ctx, 'bed_dawn', cam, { gain: 1.5 });
    grade(ctx, { bloom: 0.2, tint: '#1a2a44', tintA: 0.35, vig: 0.85 });
  } },
  { a: at('look5'), b: at('corr5'), f: (ctx, t, lt, u) => {
    const wp = anc('corridor_dawn', 'wife_dawn');
    const cam = { cx: wp[0], cy: wp[1] + 220, zoom: 2.0 + u * 0.15 };
    bgDraw(ctx, 'corridor_dawn', cam, { gain: 1.3 });
    doorGlow(ctx, 'corridor_dawn', cam, '#9fb3d6', 0.9);
    bustAt(ctx, 'wife', 'corridor_dawn', 'wife_dawn', 'corridor_dawn', cam, { rig: 'dawnBack', hair: 'down', outfit: 'cardigan', full: true, k: 1.0, open: 0.9, look: [0.0, 0.05], tired: 1, keyGain: 1.0, rimGain: 1.0, fillGain: 1.2, t, wet: 0.5 });
    grade(ctx, { bloom: 0.35, tint: '#1a2a44', tintA: 0.3, vig: 0.85 });
  } },
  { a: at('corr5'), b: at('car5'), f: (ctx, t, lt, u) => {
    const cam = { cx: 675, cy: 1180, zoom: 1.15 + u * 0.15, shake: handheld(t, 0.4, 15) };
    bgDraw(ctx, 'corridor_dawn_back', cam, { gain: 1.7 });
    grade(ctx, { bloom: 0.2, tint: '#13223a', tintA: 0.4, vig: 0.95, dark: 'rgb(190,190,200)' });
  } },
  { a: at('car5'), b: at('win5'), x: 0.4, f: (ctx, t, lt, u) => {
    const cam = { cx: 675, cy: 1200, zoom: 1.0 + u * 0.06 };
    drawDawnSky(ctx, t, { horizon: toCanvas('ext_front_dawn', [0, 900], cam)[1] });
    bgDraw(ctx, 'ext_front_dawn', cam);
    // the loaded car pulls away: its headlights sweep over the garden wall, red tail-lights glow and fade
    const k = easeIn(seg(t, at('drive5', 0), at('drive5', 1)));
    const hx = lerp(1300, -700, k);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    radialEllipse(ctx, hx, 1450, 620, 260, [[0, `rgba(255,236,200,${0.55 * (1 - k * 0.6)})`], [0.5, 'rgba(255,226,180,0.12)'], [1, 'rgba(0,0,0,0)']]);
    radialEllipse(ctx, hx + 380, 1820, 260, 120, [[0, `rgba(255,40,30,${0.6 * (1 - k)})`], [1, 'rgba(0,0,0,0)']]);
    ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${0.55 * (1 - smooth(seg(t, at('drive5', 0), at('drive5', 0) + 0.8)))})`; ctx.fillRect(0, 1700, W, 220);
    grade(ctx, { bloom: 0.25, tint: '#1a2a44', tintA: 0.3, vig: 0.85 });
  } },
  { a: at('win5'), b: 76.5, fout: 0.4, f: (ctx, t, lt, u) => {
    const wp = anc('ext_front_dawn', 'win_liv');
    const cam = camLerp({ cx: 520, cy: 1150, zoom: 1.0 }, { cx: wp[0] + 20, cy: wp[1] + 10, zoom: 3.4 }, u, easeInOut);
    drawDawnSky(ctx, t, { horizon: toCanvas('ext_front_dawn', [0, 900], cam)[1] });
    bgDraw(ctx, 'ext_front_dawn', cam);
    // a vague figure behind the curtain of the lit window
    const a = smooth(seg(t, at('shadow5', 0), at('shadow5', 1))) * (1 - smooth(seg(t, 76.0, 76.4)) * 0.3);
    const wq = [[6.66, 0.95], [7.94, 0.95], [7.94, 2.15], [6.66, 2.15]].map(([x, y]) => toCanvas('ext_front_dawn', proj3('ext_front_dawn', [x, y, 4.5]), cam));
    const [X, Y, sc] = toCanvas('ext_front_dawn', proj3('ext_front_dawn', [7.0, 1.55, 4.1]), cam);
    ctx.save(); ctx.beginPath(); ctx.moveTo(wq[0][0], wq[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(wq[i][0], wq[i][1]); ctx.closePath(); ctx.clip();
    ctx.filter = 'blur(5px)'; ctx.globalAlpha = a * 0.42; wallShadow(ctx, X, Y + 30 * sc, sc * 0.16, 1, 0.85); ctx.restore();
    grade(ctx, { bloom: 0.3, tint: '#1a2a44', tintA: 0.3, vig: 0.9 });
  } },

  // ================= S6: back in Ereğli (76.5 - 89.5) =================
  { a: 76.5, b: at('door6'), fin: 0.6, f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 700, cy: 1250, zoom: 1.0 }, { cx: 720, cy: 1230, zoom: 1.12 }, u);
    drawOvercastSky(ctx, t, { horizon: toCanvas('ext_front_day', [0, 950], cam)[1] });
    bgDraw(ctx, 'ext_front_day', cam);
    bustAt(ctx, 'wife', 'ext_front_day', 'wife_gate', 'ext_front_day', cam, { back: true, rig: 'backDay', hair: 'back_down', outfit: 'cardigan_back', full: true, k: 0.9, t });
    grade(ctx, { bloom: 0.12, tint: '#46505e', tintA: 0.35, vig: 0.75, dark: 'rgb(214,216,220)' });
    cardLabel(ctx, smooth(seg(t, at('card6', 0), at('card6', 0) + 0.5)) * (1 - smooth(seg(t, at('card6', 1) - 0.4, at('card6', 1)))), 'EREĞLİ', 'İKİ AY SONRA', 260);
  } },
  { a: at('door6'), b: at('face6'), f: (ctx, t, lt, u) => {
    const cam = { cx: 690, cy: 1300, zoom: 1.05 + u * 0.12 };
    bgDraw(ctx, 'frontdoor_in', cam);
    const op = easeInOut(seg(t, at('dopen6', 0), at('dopen6', 1))) * 1.35;
    doorLeaf(ctx, 'frontdoor_in', 'frontdoor_in', cam, { hinge: [5.2, 4.44], dir: [-1, 0], width: 0.9, height: 2.1, angle: op, swing: 1, img: null, color: '#3d2a1e',
      shade: (uu, a) => 0.55 * (1 - a * 0.45) });
    bustAt(ctx, 'wife', 'frontdoor_in', 'wife_door', 'frontdoor_in', cam, { back: true, rig: 'backDay', hair: 'back_down', outfit: 'cardigan_back', k: 1.1, t, depthAdj: 0.0 });
    grade(ctx, { bloom: 0.12, tint: '#46505e', tintA: 0.35, vig: 0.85 });
  } },
  { a: at('face6'), b: at('flash6'), f: (ctx, t, lt, u) => {
    const wp = anc('corridor_dawn', 'wife_dawn');
    const cam = { cx: wp[0], cy: wp[1] + 70, zoom: 4.3 + u * 0.3 };
    bgDraw(ctx, 'corridor_dawn', cam, { gain: 1.3 });
    doorGlow(ctx, 'corridor_dawn', cam, '#b9bec6', 1.0);
    const cl = smooth(seg(t, at('close6', 0), at('close6', 1)));
    bustAt(ctx, 'wife', 'corridor_dawn', 'wife_dawn', 'corridor_dawn', cam, { rig: 'overBack', hair: 'down', outfit: 'cardigan', full: true, k: 1.1, open: 1 - cl * 0.98, wide: 0.6 * (1 - cl), look: [0.0, 0.05], raise: 0.6, tired: 1, keyGain: 1.0, rimGain: 0.9, fillGain: 1.25, t });
    grade(ctx, { bloom: 0.25, tint: '#3a4452', tintA: 0.35, vig: 0.85 });
  } },
  { a: at('flash6'), b: at('open6'), f: (ctx, t, lt, u) => {
    // memory: the likeness at the bedroom door, flickering
    const k = seg(t, at('flash6'), at('open6'));
    const cam = camLerp(CAMS_.doorDbl, { cx: 658, cy: 930, zoom: 3.6 }, easeIn(clamp((t - 86.2) / 1.2)));
    const fl = Math.abs(n1(t * 18, 3)) > 0.6 ? 0.35 : 1;
    doorShot(ctx, t, cam, { focus: 1, dbl: fl, husband: false, dblO: { smile: 0.6 } });
    desaturate(ctx, 0.7);
    fillBlack(ctx, 1 - fl * 0.9);
  } },
  { a: at('open6'), b: 89.5, f: (ctx, t, lt, u) => {
    const wp = anc('corridor_dawn', 'wife_dawn');
    const cam = { cx: wp[0], cy: wp[1] + 60, zoom: 4.8, shake: handheld(t, 0.6, 16) };
    bgDraw(ctx, 'corridor_dawn', cam, { gain: 1.3 });
    doorGlow(ctx, 'corridor_dawn', cam, '#b9bec6', 1.0);
    const op = smooth(seg(t, at('open6'), at('open6') + 0.12));
    bustAt(ctx, 'wife', 'corridor_dawn', 'wife_dawn', 'corridor_dawn', cam, { rig: 'overBack', hair: 'down', outfit: 'cardigan', full: true, k: 1.1, open: op, wide: 0.9, look: [0.1, -0.05], raise: 0.9, pupil: 1, tired: 1, keyGain: 1.0, rimGain: 0.9, fillGain: 1.25, wet: 1, tears: 0.7, t });
    grade(ctx, { bloom: 0.25, tint: '#3a4452', tintA: 0.35, vig: 0.88 });
  } },

  // ================= S7: asking for help (89.5 - 101.5) =================
  { a: 89.5, b: at('tears7'), x: 0.5, f: (ctx, t, lt, u) => {
    const cam = camLerp({ cx: 640, cy: 1150, zoom: 1.9 }, { cx: 620, cy: 1120, zoom: 2.1 }, u);
    bgDraw(ctx, 'table_n', cam);
    bustAt(ctx, 'husband', 'table_n', 'husb', 'table_n', cam, { rig: 'lampTop', outfit: 'tshirt', k: 0.9, open: 0.7, look: [0.5, 0.4], keyGain: 0.8, fillGain: 1.2, t, clip: [0, 0, W, toCanvas('table_n', anc('table_n', 'table_c'), cam)[1] - 60] });
    bustAt(ctx, 'wife', 'table_n', 'wife', 'table_n', cam, { rig: 'lampTop', hair: 'down', outfit: 'cardigan', k: 0.9, open: 0.6, look: [0, 0.6], tired: 1, keyGain: 0.85, fillGain: 1.2, t, clip: [0, 0, W, toCanvas('table_n', anc('table_n', 'table_c'), cam)[1] - 60] });
    grade(ctx, { bloom: 0.35, tint: '#2a1a10', tintA: 0.3, vig: 0.9, dark: 'rgb(225,220,215)' });
  } },
  { a: at('tears7'), b: at('news7'), f: (ctx, t, lt, u) => {
    const cam = { cx: 676, cy: 1060, zoom: 5.0 };
    bgDraw(ctx, 'table_n', cam);
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.globalAlpha = 0.6; ctx.drawImage(CANVAS, 0, 0); ctx.restore();
    portrait(ctx, 'wife', W / 2, 820, 2.15 + u * 0.1, { rig: 'lampTop', hair: 'down', outfit: 'cardigan', k: 2.2, open: 0.85, look: [0.05, 0.25], tired: 1, wet: 1, tears: 0.6 + u * 0.4, keyGain: 0.85, fillGain: 1.3, raise: 0.4, t });
    grade(ctx, { bloom: 0.3, tint: '#2a1a10', tintA: 0.3, vig: 0.85 });
  } },
  { a: at('news7'), b: at('face7'), x: 0.35, f: (ctx, t, lt, u) => {
    ctx.fillStyle = '#16130f'; ctx.fillRect(0, 0, W, H);
    const ph = BGS.ext_front_day ? BGS.ext_front_day.img : null;
    const k2 = smooth(seg(t, at('news7b') - 0.2, at('news7b') + 0.4));
    newspaper(ctx, 540 + u * 40, 900 - u * 60, 1.32 + u * 0.12, -0.06 + u * 0.03, { photo: ph, seed: 3 });
    newspaper(ctx, lerp(1500, 560, easeOut(k2)), lerp(1100, 1060, k2), 1.25, 0.08, { photo: ph, seed: 8, head: ['KORKAN AİLE', 'EVİNİ TERK ETTİ'], sub: ["Ereğli'deki aile yaşadıklarının", 'ardından Karaman\'a taşındı'], caption: 'Olayların yaşandığı iddia edilen ev' });
    grade(ctx, { bloom: 0.1, tint: '#2a1a10', tintA: 0.25, vig: 0.85, dark: 'rgb(200,190,175)' });
  } },
  { a: at('face7'), b: 101.5, fout: 0.3, f: (ctx, t, lt, u) => {
    const cam = { cx: 676, cy: 1060, zoom: 5.0 };
    bgDraw(ctx, 'table_n', cam);
    ctx.save(); ctx.filter = 'blur(10px)'; ctx.globalAlpha = 0.6; ctx.drawImage(CANVAS, 0, 0); ctx.restore();
    portrait(ctx, 'wife', W / 2, 840, 2.35 + u * 0.15, { rig: 'lampTop', hair: 'down', outfit: 'cardigan', k: 2.2, open: 0.8, look: [0.0, 0.1], tired: 1, wet: 1, tears: 1, keyGain: 0.8, fillGain: 1.3, raise: 0.5, t: t + 3 });
    grade(ctx, { bloom: 0.3, tint: '#2a1a10', tintA: 0.3, vig: 0.88 });
  } },

  // ================= S8: the same night again (101.5 - 120) =================
  { a: 101.5, b: at('dbl8'), fin: 0.6, f: (ctx, t, lt, u) => {
    // slow push from the sleeping couple to the dark doorway
    const d0 = anc('bed_wide', 'door_tl'), d1 = anc('bed_wide', 'door_br');
    const dc = [(d0[0] + d1[0]) / 2, (d0[1] + d1[1]) / 2];
    const cam = camLerp({ cx: 860, cy: 1560, zoom: 1.0 }, { cx: dc[0], cy: dc[1], zoom: 2.3 }, u, (x) => x * x * (3 - 2 * x));
    bgDraw(ctx, 'bed_wide', cam, { lamp: lampFlicker(t, 2) });
    coupleWide(ctx, 'bed_wide', cam, { open: 0 });
    grade(ctx, { bloom: 0.3, tint: '#0c2034', tintA: 0.35, vig: 0.92 });
  } },
  { a: at('dbl8'), b: at('cu8'), x: 0.5, f: (ctx, t, lt, u) => {
    const ap = smooth(seg(t, at('appear8', 0), at('appear8', 1)));
    const cam = camLerp({ cx: 668, cy: 1160, zoom: 1.5 }, { cx: 660, cy: 990, zoom: 2.6 }, u);
    doorShot(ctx, t, cam, { focus: 1, dbl: ap, husband: false, dblO: { smile: 0.4 } });
  } },
  { a: at('cu8'), b: at('scare8'), f: (ctx, t, lt, u) => {
    const cam = { cx: 657, cy: 915, zoom: lerp(4.0, 5.4, easeIn(u)) };
    doorShot(ctx, t, cam, { focus: 1, dbl: 1, husband: false, dblO: { smile: 0.8, rot: 0.05 } });
  } },
  { a: at('scare8'), b: at('black8'), f: (ctx, t, lt, u) => {
    // the face lunges at the lens: pale, pin-point pupils, a smile too wide; glitch and flash
    const k = easeIn(u);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const sh = handheld(t * 7, 7, 21);
    portrait(ctx, 'double', W / 2 + sh.x, 900 + sh.y, lerp(3.4, 8.5, k), { rig: 'lampF', open: 1, wide: 1.0, pupil: 0.0, smile: 1.5, mouth: 0.3, k: 2.6, keyMask: laceMask(900, 120, -260, [-20]), keyGain: 0.75, fillGain: 0.6, rimGain: 1.2, rot: 0.08, t });
    desaturate(ctx, 0.55);
    // horizontal glitch slices
    const r = mulberry32(Math.floor(t * 24));
    for (let i = 0; i < 7; i++) { const y = r() * H, hgt = 20 + r() * 90, dx = (r() - 0.5) * 140 * (1 - k * 0.5); ctx.drawImage(CANVAS, 0, y, W, hgt, dx, y, W, hgt); }
    if (u < 0.3) { ctx.fillStyle = `rgba(255,250,245,${0.55 * (1 - u / 0.3)})`; ctx.fillRect(0, 0, W, H); }
    grade(ctx, { bloom: 0.35, tint: '#1c0606', tintA: 0.45, vig: 0.95 });
  } },
  { a: at('black8'), b: 120.01, f: (ctx, t) => {
    endScreen(ctx, t, smooth(seg(t, at('end8', 0), at('end8', 0) + 0.5)));
  } },
];
window.OVERLAY = (ctx, t) => { reenactTag(ctx, smooth(seg(t, 0.4, 1.2)) * (1 - smooth(seg(t, 9.0, 10.0)))); };
