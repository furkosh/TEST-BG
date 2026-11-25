// Shot effects: grading, lamp flicker, projected lace light on faces, wall shadows, perspective door leaves,
// swaying tree layer, wind-blown leaves, documentary cards, title and end screen.
'use strict';
const FXIMG = {};
async function loadFx() {
  FXIMG.lace = await loadImg('bg/lace_trans.png');
  FXIMG.door = await loadImg('bg/door_tex.jpg');
  FXIMG.tree = await loadImg('bg/ext_side_n_tree.png');
}
const pulse = (t, k, d = 0.3) => { const x = t - k; return x >= 0 && x < d ? Math.exp(-x * 10) : 0; };

// ---------- grading ----------
function grade(ctx, o = {}) {
  if (o.bloom !== 0) bloom(ctx, o.bloom ?? 0.3);
  if (o.tint) tint(ctx, o.tint, o.tintA ?? 0.35, 'soft-light');
  if (o.lift) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = o.lift; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (o.dark) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = o.dark; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  vignette(ctx, o.vig ?? 0.8, o.vin ?? 0.3);
}
function desaturate(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = a; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// sodium lamp: steady with rare drop-outs and buzzing flicker bursts
function lampFlicker(t, seed = 1, burst = 0) {
  let v = 0.96 + 0.04 * n1(t * 7, seed);
  const b = Math.abs(n1(t * 0.9, seed + 3));
  if (b > 0.82 - burst * 0.4) v *= 0.35 + 0.65 * (Math.sin(t * 61 + seed) > 0.2 ? 1 : 0.15);
  return clamp(v);
}
// ---------- the lace pattern carried by the street-lamp light ----------
// maskFn for drawFace keyMask: tiles the lace transmission image in face units (scale = units per tile)
function laceMask(scale, ox = 0, oy = 0, band = null) {
  return (g, F) => {
    const im = FXIMG.lace; if (!im) { g.fillStyle = '#fff'; g.fillRect(F.X0, F.Y0, F.w / F.k, F.h / F.k); return; }
    const pat = g.createPattern(im, 'repeat');
    const m = new DOMMatrix(); m.translateSelf(ox, oy); m.scaleSelf(scale / im.width, scale / im.width);
    pat.setTransform(m);
    g.fillStyle = pat; g.fillRect(F.X0, F.Y0, F.w / F.k, F.h / F.k);
    if (band) {    // the band's upper edge (face units): no lamp light above it
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = linGrad(g, 0, band[0] - 26, 0, band[0] + 18, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(F.X0, F.Y0, F.w / F.k, band[0] + 18 - F.Y0);
      g.fillStyle = linGrad(g, 0, 330, 0, 1300, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.94)']]); g.fillRect(F.X0, 330, F.w / F.k, F.h / F.k);
      g.globalCompositeOperation = 'destination-in';
    }
  };
}
// ---------- 3D projection through a baked view's camera ----------
function proj3(view, p) {
  const C = window.CAMS[view]; const d = [p[0] - C.pos[0], p[1] - C.pos[1], p[2] - C.pos[2]];
  const z = d[0] * C.fw[0] + d[1] * C.fw[1] + d[2] * C.fw[2];
  const x = d[0] * C.rt[0] + d[1] * C.rt[1] + d[2] * C.rt[2], y = d[0] * C.up[0] + d[1] * C.up[1] + d[2] * C.up[2];
  return [C.w / 2 + x / z * C.f, C.h / 2 - y / z * C.f, z];
}
// door leaf rotating about a vertical hinge: hinge (x,z), closed direction (dx,dz) unit, width, height, angle (rad, + opens away)
function doorLeaf(ctx, view, plate, cam, o) {
  const [hx, hz] = o.hinge, [dx, dz] = o.dir, wd = o.width, ht = o.height, a = o.angle;
  const ca = Math.cos(a), sa = Math.sin(a);
  // rotate the closed direction about +y by angle a (sign picks the swing side)
  const rx = dx * ca - dz * sa * (o.swing || 1), rz = dz * ca + dx * sa * (o.swing || 1);
  const N = 36, im = o.img;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const p0 = [hx + rx * wd * u0, 0, hz + rz * wd * u0], p1 = [hx + rx * wd * u1, 0, hz + rz * wd * u1];
    const t0 = proj3(view, [p0[0], ht, p0[2]]), b0 = proj3(view, [p0[0], 0, p0[2]]), t1 = proj3(view, [p1[0], ht, p1[2]]), b1 = proj3(view, [p1[0], 0, p1[2]]);
    const [X0, Y0] = toCanvas(plate, t0, cam), [, Y0b] = toCanvas(plate, b0, cam), [X1, Y1] = toCanvas(plate, t1, cam), [, Y1b] = toCanvas(plate, b1, cam);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1 + (X1 > X0 ? 0.6 : -0.6), Y1); ctx.lineTo(X1 + (X1 > X0 ? 0.6 : -0.6), Y1b); ctx.lineTo(X0, Y0b); ctx.closePath(); ctx.clip();
    const su = o.flipTex ? 1 - u1 : u0, sw = 1 / N;
    if (im) ctx.drawImage(im, su * im.width, 0, sw * im.width, im.height, Math.min(X0, X1) - 1, Math.min(Y0, Y1), Math.abs(X1 - X0) + 2, Math.max(Y0b, Y1b) - Math.min(Y0, Y1));
    else { ctx.fillStyle = o.color || '#3a2a20'; ctx.fillRect(Math.min(X0, X1) - 1, Math.min(Y0, Y1), Math.abs(X1 - X0) + 2, Math.max(Y0b, Y1b) - Math.min(Y0, Y1)); }
    // lighting: darker as the leaf turns away from the light, plus a vertical gradient
    const shade = o.shade ? o.shade(u0, a) : 0.2;
    ctx.fillStyle = `rgba(0,0,0,${clamp(1 - shade)})`; ctx.fillRect(Math.min(X0, X1) - 1, Math.min(Y0, Y1), Math.abs(X1 - X0) + 2, Math.max(Y0b, Y1b) - Math.min(Y0, Y1));
    ctx.restore();
  }
}
// ---------- dark silhouette shadow gliding over a wall ----------
function wallShadow(ctx, x, y, s, a, stretch = 1) {
  if (a <= 0) return;
  const c = makeCanvasCached('wshadow', 360, 900), g = c.getContext('2d');
  if (!c.done) {
    g.clearRect(0, 0, 360, 900); g.filter = 'blur(14px)'; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(180, 120, 52, 64, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(120, 190); g.bezierCurveTo(40, 210, 50, 420, 70, 640); g.lineTo(110, 880); g.lineTo(250, 880); g.lineTo(290, 640); g.bezierCurveTo(310, 420, 320, 210, 240, 190); g.closePath(); g.fill();
    g.filter = 'none'; c.done = true;
  }
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a;
  ctx.translate(x, y); ctx.scale(s * stretch, s); ctx.drawImage(c, -180, -450); ctx.restore();
}
// ---------- the mulberry tree layer swaying in the wind (strip displacement) ----------
function swayLayer(ctx, im, plate, cam, t, amp, pivotY) {
  if (!im) return;
  const s = bgScale(plate, cam.zoom), N = 48, hgt = im.height;
  const sh = cam.shake || { x: 0, y: 0 };
  for (let i = 0; i < N; i++) {
    const y0 = i / N * hgt, y1 = (i + 1) / N * hgt;
    const lever = clamp((pivotY - y0) / pivotY);
    const dx = (Math.sin(t * 1.3 + y0 * 0.004) * 0.6 + Math.sin(t * 2.9 + y0 * 0.011) * 0.4 + fn1(t * 0.5, 4) * 0.8) * amp * lever * lever;
    ctx.drawImage(im, 0, y0, im.width, y1 - y0 + 1, W / 2 + sh.x + (0 - cam.cx + dx) * s, H / 2 + sh.y + (y0 - cam.cy) * s, im.width * s, (y1 - y0 + 1) * s);
  }
}
// leaves and dust blown along the street
function windLeaves(ctx, t, n, a, col = 'rgba(40,32,24,0.9)', seed = 3) {
  const r = mulberry32(seed);
  ctx.save(); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const sp = 140 + r() * 260, ph = r() * 50, y0 = r() * H;
    const x = ((r() * W + t * sp + ph * 40) % (W + 200)) - 100, y = y0 + Math.sin(t * 2 + ph) * 40 + t * 12 % 60;
    ctx.globalAlpha = a * (0.4 + r() * 0.6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (2 + r() * 5) + ph); ctx.beginPath(); ctx.ellipse(0, 0, 5 + r() * 6, 2 + r() * 3, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
// ---------- text ----------
function cardLabel(ctx, a, top, main, y = 300) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a);
  const w = 760, x = (W - w) / 2, slide = (1 - clamp(a)) * 30;
  ctx.fillStyle = 'rgba(4,5,8,0.72)'; ctx.fillRect(x - slide, y, w, 132);
  ctx.fillStyle = '#c40d16'; ctx.fillRect(x - slide, y, 8, 132);
  ctx.textBaseline = 'middle';
  ctx.font = '700 30px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(220,214,206,0.82)'; ctx.fillText(top, x + 36 - slide, y + 40);
  ctx.font = '900 50px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = '#f2ece4'; ctx.fillText(main, x + 36 - slide, y + 92);
  ctx.restore();
}
function reenactTag(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.85; ctx.font = '700 26px Inter, "DejaVu Sans", sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(48, 150, 222, 46);
  ctx.fillStyle = '#e8e2da'; ctx.fillText('CANLANDIRMA', 64, 174);
  ctx.restore();
}
function titleCard(ctx, t, a, text = 'KAPIDAKİ SURET', sub = 'KONYA EREĞLİ', y = 900) {
  if (a <= 0) return;
  const fl = Math.abs(n1(t * 23, 4)) > 0.8 ? 0.6 : 1;
  ctx.save(); ctx.globalAlpha = clamp(a) * fl;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 40px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(214,208,200,0.85)'; ctx.fillText(sub, W / 2, y - 100);
  ctx.font = '900 104px Inter, "DejaVu Sans", sans-serif';
  const gx = Math.abs(n1(t * 7, 9)) > 0.8 ? n1(t * 50, 3) * 8 : 0;
  ctx.shadowColor = 'rgba(227,20,28,0.7)'; ctx.shadowBlur = 40; ctx.fillStyle = '#c40d16'; ctx.fillText(text, W / 2 + gx, y);
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.3; ctx.fillStyle = '#ff6a6a'; ctx.fillText(text, W / 2 - gx - 3, y + 2);
  ctx.restore();
}
function endScreen(ctx, t, a) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 96px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = '#efe9e1'; ctx.fillText('HALK', W / 2, 820); ctx.fillText('EFSANELERİ', W / 2, 930);
  ctx.fillStyle = '#c40d16'; ctx.fillRect(W / 2 - 90, 1010, 180, 6);
  ctx.font = '600 28px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(200,196,190,0.85)';
  const lines = ['2016\'da Konya Ereğli\'de basına yansıyan iddialardan', 'esinlenen bir canlandırmadır. Diyaloglar ve bazı sahneler', 'dramatize edilmiştir; olayların doğaüstü bir nedene', 'dayandığı kanıtlanmamıştır.'];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 1110 + i * 40));
  ctx.restore();
}
// half-resolution blurred draw of a character (depth of field)
function blurred(ctx, px, drawFn) {
  if (px < 0.6) { drawFn(ctx); return; }
  const c = makeCanvasCached('dof', W / 2, H / 2), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W / 2, H / 2);
  g.setTransform(0.5, 0, 0, 0.5, 0, 0); drawFn(g);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${(px / 2).toFixed(1)}px)`; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
