// Baked set images (ray-traced in bake/): loading, camera framing (pan / zoom over a high-resolution plate),
// additive street-lamp layer, depth-of-field variants, and projection of anchors for placing the characters.
'use strict';
const BGS = {};
const BG_FILES = {
  aerial: ['aerial.png', 'aerial_lamp.jpg'],
  ext_side_n: ['ext_side_n.png', 'ext_side_n_lamp.jpg'], ext_win_n: ['ext_win_n.png', 'ext_win_n_lamp.jpg'],
  bed_wide: ['bed_wide.jpg', 'bed_wide_lamp.jpg'], bed_door: ['bed_door.jpg', 'bed_door_lamp.jpg'],
  bed_door_near: ['bed_door_near.jpg', 'bed_door_near_lamp.jpg'], bed_door_far: ['bed_door_far.jpg', 'bed_door_far_lamp.jpg'],
  bed_door_dbl: ['bed_door_dbl.jpg', 'bed_door_dbl_lamp.jpg'], bed_door_dbl_near: ['bed_door_dbl_near.jpg', 'bed_door_dbl_near_lamp.jpg'], bed_door_dbl_far: ['bed_door_dbl_far.jpg', 'bed_door_dbl_far_lamp.jpg'],
  pillow_top: ['pillow_top.jpg', 'pillow_top_lamp.jpg'], bed_sit: ['bed_sit.jpg', 'bed_sit_lamp.jpg'],
  corridor_n: ['corridor_n.jpg'], kitchen_n: ['kitchen_n.jpg'], corridor_dawn: ['corridor_dawn.jpg'], corridor_dawn_back: ['corridor_dawn_back.jpg'],
  bed_dawn: ['bed_dawn.jpg'], window_day: ['window_day.jpg'], ext_front_dawn: ['ext_front_dawn.png'], ext_front_day: ['ext_front_day.png'],
  frontdoor_in: ['frontdoor_in.jpg'], table_n: ['table_n.jpg'],
};
function loadImg(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
async function loadBGs() {
  const jobs = [];
  for (const [name, files] of Object.entries(BG_FILES)) {
    jobs.push((async () => {
      const [a, b] = await Promise.all(files.map((f) => loadImg('bg/' + f)));
      if (a) BGS[name] = { img: a, lamp: b || null, view: name.replace(/_(near|far)$/, '') };
    })());
  }
  await Promise.all(jobs);
}
// camera over a plate: (cx, cy) plate pixel at the frame centre, zoom 1 = plate width fits the frame width
function bgScale(name, zoom) { const B = BGS[name]; return B ? W / B.img.width * zoom : 1; }
function bgDraw(ctx, name, cam, o = {}) {
  const B = BGS[name]; if (!B) { ctx.fillStyle = '#300'; ctx.fillRect(0, 0, W, H); return; }
  const s = bgScale(name, cam.zoom), sh = cam.shake || { x: 0, y: 0, r: 0 };
  ctx.save();
  ctx.translate(W / 2 + sh.x, H / 2 + sh.y); ctx.rotate(sh.r || 0); ctx.scale(s, s); ctx.translate(-cam.cx, -cam.cy);
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.drawImage(B.img, 0, 0);
  if ((o.gain || 1) > 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (o.alpha ?? 1) * clamp(o.gain - 1); ctx.drawImage(B.img, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = o.alpha ?? 1; }
  const lg = o.lamp ?? 1;
  if (B.lamp && lg > 0.003) {
    ctx.globalCompositeOperation = 'lighter';
    for (let r = lg; r > 0.003; r -= 1) { ctx.globalAlpha = (o.alpha ?? 1) * Math.min(1, r); ctx.drawImage(B.lamp, 0, 0); }
  }
  ctx.restore();
}
// 3D anchor points (metres, same as bake/bake_view.py) projected through the view camera
const ANCH3D = {
  headW: [1.52, 0.80, 3.17], headH: [2.27, 0.82, 3.14], dbl_feet: [4.55, 0.0, 2.92], dbl_head: [4.55, 1.68, 2.92],
  door_tl: [4.0, 2.05, 2.45], door_tr: [4.0, 2.05, 3.35], door_bl: [4.0, 0.0, 2.45], door_br: [4.0, 0.0, 3.35],
  sit_head: [1.5, 1.52, 2.74], sit_hips: [1.5, 0.66, 2.7], sit_win: [0.62, 1.2, 2.02],
  kdoor_tl: [4.32, 2.05, -3.1], kdoor_tr: [5.18, 2.05, -3.1], kdoor_bl: [4.32, 0.0, -3.1], kdoor_br: [5.18, 0.0, -3.1],
  bdoor_c: [4.08, 1.0, 2.9], fdoor_c: [4.75, 1.05, 4.3], wife_dawn: [4.75, 1.56, 3.65], wall_l: [5.34, 1.2, 1.0], wall_r: [4.16, 1.2, 1.0],
  win_bed: [-0.25, 1.6, 1.65], win_liv: [7.3, 1.55, 4.55], fdoor: [4.75, 1.05, 4.55], gate: [4.75, -0.45, 7.58], walk: [4.75, -0.45, 6.6],
  wife_gate: [4.75, 1.11, 8.3], wife_door: [4.62, 1.56, 5.15],
  wife: [7.5, 1.22, 1.08], husb: [8.18, 1.26, 1.08], mil: [7.05, 1.2, 2.78], table_c: [7.5, 0.76, 1.85],
  house: [4.75, 1.5, -0.8], roof: [4.75, 4.4, -0.85], tree: [-2.6, 3.0, -2.6],
};
function anc(view, key) { return proj3(view, ANCH3D[key]); }
// plate point -> canvas point under a camera
function toCanvas(name, p, cam) {
  const s = bgScale(name, cam.zoom), sh = cam.shake || { x: 0, y: 0, r: 0 };
  let x = (p[0] - cam.cx) * s, y = (p[1] - cam.cy) * s;
  const c = Math.cos(sh.r || 0), sn = Math.sin(sh.r || 0);
  return [W / 2 + sh.x + x * c - y * sn, H / 2 + sh.y + x * sn + y * c, s];
}
// canvas pixels per face unit (1 unit = 1/19.05 cm) for something at the anchor's depth
function faceScaleAt(view, key, name, cam, depthAdj = 0) {
  const C = window.CAMS[view], p = anc(view, key);
  return C.f / (p[2] + depthAdj) * 0.0105 / 20 * bgScale(name, cam.zoom);
}
// interpolate a camera between keys {cx, cy, zoom} with an easing
function camLerp(a, b, u, ease = easeInOut) {
  const k = ease(clamp(u));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), zoom: lerp(a.zoom, b.zoom, k) };
}
// plate centre helper
function plateC(name) { const B = BGS[name]; return B ? { cx: B.img.width / 2, cy: B.img.height / 2, zoom: 1 } : { cx: 540, cy: 960, zoom: 1 }; }
