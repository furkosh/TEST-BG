// Skies behind the exterior plates: night (moon behind moving clouds, a few stars, Taurus ridges on the horizon),
// blue-hour dawn, flat overcast. Cloud layers are tileable noise textures scrolled by the wind.
'use strict';
const SKY = {};
function buildSky() {
  // cloud texture (tileable), alpha = density
  const mk = (sz, cell, seed, lo, hi) => {
    const c = makeCanvas(sz, sz), x = c.getContext('2d'), img = x.createImageData(sz, sz), d = img.data;
    for (let j = 0; j < sz; j++) for (let i = 0; i < sz; i++) {
      const v = pfbm(i / cell, j / cell, sz / cell, 5, seed), a = clamp((v - lo) / (hi - lo)), k = (j * sz + i) * 4;
      d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; d[k + 3] = a * 255;
    }
    x.putImageData(img, 0, 0); return c;
  };
  SKY.cloudA = mk(512, 96, 11, 0.42, 0.78);
  SKY.cloudB = mk(512, 64, 23, 0.48, 0.82);
  const r = mulberry32(99); SKY.stars = Array.from({ length: 140 }, () => [r() * W, r() * H * 0.5, r() * 1.4 + 0.3, r() * 6]);
  // mountain ridge profile (Bolkar / Aydos ranges south of Ereğli)
  SKY.ridge = [];
  for (let i = 0; i <= 120; i++) { const x = i / 120; SKY.ridge.push([x, 0.55 * fbm(x * 4.2, 0.3, 4, 5) + 0.45 * Math.pow(Math.abs(Math.sin(x * 7.3 + 1.1)), 1.6) * fbm(x * 9, 1.1, 3, 6)]); }
}
// scrolling cloud layer tinted by col, lit from (mx,my) by a soft halo
function cloudLayer(ctx, t, tex, y0, y1, speed, scale, alpha, col) {
  const s = 512 * scale, ox = ((t * speed) % s + s) % s;
  const c = makeCanvasCached('cloudtint', W, H), g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
  for (let x = -ox; x < W; x += s) for (let y = y0; y < y1; y += s) g.drawImage(tex, x, y, s, s);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(c, 0, 0); ctx.restore();
}
const CANVAS_CACHE = {};
function makeCanvasCached(key, w, h) { let c = CANVAS_CACHE[key]; if (!c || c.width !== w || c.height !== h) c = CANVAS_CACHE[key] = makeCanvas(w, h); return c; }

function drawNightSky(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.42;
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, hz + 200, [[0, '#03050a'], [0.55, '#0a1120'], [1, '#18233a']]); ctx.fillRect(0, 0, W, H);
  // stars through the gaps
  ctx.save();
  for (const [x, y, s, ph] of SKY.stars) { if (y > hz - 40) continue; ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 1.3 + ph)); ctx.fillStyle = '#cfd8ea'; ctx.fillRect(x + (o.panX || 0) * 0.1, y, s, s); }
  ctx.restore();
  // moon + halo
  const mx = o.moonX ?? W * 0.78, my = o.moonY ?? H * 0.12, mr = o.moonR ?? 34;
  radial(ctx, mx, my, mr * 9, [[0, 'rgba(150,170,210,0.28)'], [0.25, 'rgba(110,130,175,0.12)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.save(); ctx.fillStyle = '#e8eef7'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(160,170,190,0.35)'; for (const [dx, dy, rr] of [[-8, -6, 9], [10, 8, 6], [4, -12, 5], [-12, 10, 4]]) { ctx.beginPath(); ctx.arc(mx + dx, my + dy, rr, 0, TAU); ctx.fill(); }
  ctx.restore();
  // clouds drifting across the moon (lit edges near it)
  const wind = o.wind ?? 14;
  cloudLayer(ctx, t, SKY.cloudA, -200, hz + 100, wind, 2.2, 0.85, '#0c1220');
  cloudLayer(ctx, t + 40, SKY.cloudB, -100, hz, wind * 1.7, 1.5, 0.7, '#141c2e');
  radial(ctx, mx, my, mr * 5, [[0, 'rgba(190,205,235,0.22)'], [1, 'rgba(0,0,0,0)']], 'screen');
  if (o.ridge !== false) {
    // distant ridges with faint moonlit snow
    const ry = hz, rh = o.ridgeH ?? 90;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, ry + 20);
    for (const [x, v] of SKY.ridge) ctx.lineTo(x * W, ry - v * rh);
    ctx.lineTo(W, ry + 20); ctx.closePath();
    ctx.fillStyle = linGrad(ctx, 0, ry - rh, 0, ry + 10, [[0, '#2a3346'], [0.35, '#1a2233'], [1, '#121827']]); ctx.fill();
    ctx.restore();
  }
}
function drawDawnSky(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.45;
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, hz + 100, [[0, '#2a3654'], [0.5, '#5d6d8f'], [0.85, '#a9a3b4'], [1, '#c9b2a8']]); ctx.fillRect(0, 0, W, H);
  cloudLayer(ctx, t, SKY.cloudA, -300, hz + 100, 6, 2.6, 0.55, '#4a5574');
  cloudLayer(ctx, t + 20, SKY.cloudB, -200, hz, 9, 1.8, 0.35, '#8a8ba2');
}
function drawOvercastSky(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.45;
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, hz + 100, [[0, '#7d838c'], [0.6, '#a2a7ae'], [1, '#bcbfc3']]); ctx.fillRect(0, 0, W, H);
  cloudLayer(ctx, t, SKY.cloudA, -300, hz + 100, 8, 2.8, 0.5, '#6e747d');
  cloudLayer(ctx, t + 20, SKY.cloudB, -200, hz, 12, 1.9, 0.35, '#8f949b');
}

// low sun over the Aegean hills: warm gradient, sun disc with haze, two ranges of hills, thin clouds lit from below
function drawSunsetSky(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.45, sx = o.sunX ?? W * 0.2, sy = o.sunY ?? hz - 60;
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, hz + 60, [[0, '#2b2340'], [0.35, '#6b3f4e'], [0.7, '#c4603a'], [0.9, '#f0a04a'], [1, '#ffd08a']]); ctx.fillRect(0, 0, W, H);
  radial(ctx, sx, sy, 520, [[0, 'rgba(255,214,150,0.75)'], [0.2, 'rgba(255,160,90,0.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.fillStyle = '#fff1d0'; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, TAU); ctx.fill();
  cloudLayer(ctx, t, SKY.cloudB, -100, hz - 120, 5, 2.2, 0.45, '#8a4a52');
  cloudLayer(ctx, t + 30, SKY.cloudA, hz - 380, hz - 40, 7, 1.6, 0.3, '#e9905c');
  const ridge = (y0, hh, seed, c0, c1) => {
    ctx.beginPath(); ctx.moveTo(0, y0 + 40);
    for (let i = 0; i <= 80; i++) { const x = i / 80; ctx.lineTo(x * W, y0 - hh * (0.55 * fbm(x * 3.1 + seed, 0.7, 4, seed) + 0.45 * Math.abs(Math.sin(x * 4.2 + seed)) * fbm(x * 8, 2.1, 3, seed + 1))); }
    ctx.lineTo(W, y0 + 40); ctx.closePath(); ctx.fillStyle = linGrad(ctx, 0, y0 - hh, 0, y0 + 40, [[0, c0], [1, c1]]); ctx.fill();
  };
  ridge(hz + 6, o.ridgeH ?? 170, 3, '#7a4a5a', '#5a3848');
  ridge(hz + 22, (o.ridgeH ?? 170) * 0.55, 7, '#4a2c38', '#38222c');
}
// the street sky at dusk: deep blue above, a last orange band low down
function drawDuskSky(ctx, t, o = {}) {
  const hz = o.horizon ?? H * 0.5;
  ctx.fillStyle = linGrad(ctx, 0, 0, 0, hz + 80, [[0, '#141a33'], [0.45, '#3a3552'], [0.8, '#a2584a'], [1, '#e08a52']]); ctx.fillRect(0, 0, W, H);
  cloudLayer(ctx, t, SKY.cloudA, -200, hz, 10, 2.0, 0.5, '#2a2338');
  ctx.save();
  for (const [x, y, s2, ph] of SKY.stars) { if (y > hz * 0.5) continue; ctx.globalAlpha = 0.15 + 0.2 * Math.abs(Math.sin(t * 1.3 + ph)); ctx.fillStyle = '#cfd8ea'; ctx.fillRect(x, y, s2, s2); }
  ctx.restore();
}
