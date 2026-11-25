// Baked village sets (ray-traced in bake/): loading, camera framing (pan / zoom over a high-resolution plate),
// additive street-lamp layer, depth-of-field variants, and projection of anchors for placing the characters.
'use strict';
const BGS = {};
const BG_FILES = {
  street_run: ['street_run.png', 'street_run_lamp.jpg'], door_pov: ['door_pov.png', 'door_pov_lamp.jpg'],
  creature_low: ['creature_low.png', 'creature_low_lamp.jpg'], dusk_street: ['dusk_street.png', 'dusk_street_lamp.jpg'],
  village_sunset: ['village_sunset.png'], room_spin: ['room_spin.jpg', 'room_spin_lamp.jpg'], room_door: ['room_door.jpg', 'room_door_lamp.jpg'],
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
const ANCH3D = {};
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

// place a 3D point (metres) of a view on the canvas: [x, y, px per face unit]
function place(view, plate, cam, p) {
  const q = proj3(view, p), [X, Y] = toCanvas(plate, q, cam);
  return [X, Y, window.CAMS[view].f / q[2] * 0.000525 * bgScale(plate, cam.zoom)];
}
// a plate drawn out of focus (half resolution + blur)
function bgDrawBlur(ctx, name, cam, o, px) { blurred(ctx, px, (g) => bgDraw(g, name, cam, o)); }
