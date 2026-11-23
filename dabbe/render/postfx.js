// Light maps (true darkness outside the flashlight), bloom, dust motes in a beam, breath vapour, lens dirt.
'use strict';
let LMC = null, LMX = null, BLC = null, BLX = null;
function ensureFx() {
  if (!LMC) { LMC = makeCanvas(W / 2, H / 2); LMX = LMC.getContext('2d'); BLC = makeCanvas(W / 8, H / 8); BLX = BLC.getContext('2d'); }
}
// multiply the frame by a light map: ambient + spots + cones (screen space)
// lights: {spot:[x,y,r], col:[r,g,b], I} or {cone:[x0,y0,x1,y1,w0,w1], col, I}
function applyLightMap(ctx, ambient, lights) {
  ensureFx();
  const g = LMX; g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgb(${ambient[0]},${ambient[1]},${ambient[2]})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const c = L.col || [255, 240, 210], I = L.I ?? 1;
    if (L.spot) {
      const [x, y, r] = L.spot, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, I)})`); gr.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${0.55 * Math.min(1, I)})`);
      gr.addColorStop(0.7, `rgba(${c[0]},${c[1]},${c[2]},${0.15 * Math.min(1, I)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (L.cone) {
      const [x0, y0, x1, y1, w0, w1] = L.cone, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      g.save(); g.filter = 'blur(30px)';
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.5 * Math.min(1, I)})`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},${0.12 * Math.min(1, I)})`);
      g.fillStyle = gr; poly(g, [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]]); g.fill();
      g.restore();
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LMC, 0, 0, W, H); ctx.restore();
}
function bloom(ctx, k = 0.35) {
  ensureFx();
  BLX.setTransform(1, 0, 0, 1, 0, 0); BLX.globalCompositeOperation = 'source-over'; BLX.filter = 'blur(2px)';
  BLX.drawImage(ctx.canvas, 0, 0, W / 8, H / 8); BLX.filter = 'none';
  // keep only the bright parts (crush the rest towards black)
  BLX.globalCompositeOperation = 'multiply'; BLX.drawImage(BLC, 0, 0); BLX.drawImage(BLC, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(BLC, 0, 0, W, H); ctx.globalAlpha = k * 0.6; ctx.filter = 'blur(18px)'; ctx.drawImage(BLC, 0, 0, W, H); ctx.restore();
}
// dust motes drifting inside a beam from (x0,y0) to (x1,y1)
function beamDust(ctx, t, x0, y0, x1, y1, wdt, n, I, seed = 3) {
  const r = mulberry32(seed), dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const u = (r() + t * (0.02 + r() * 0.03)) % 1, v = (r() - 0.5) * 2, sw = u * wdt;
    const x = x0 + dx * u + nx * v * sw + Math.sin(t * (0.5 + r()) + i) * 6, y = y0 + dy * u + ny * v * sw + Math.cos(t * (0.4 + r()) + i) * 6;
    const a = I * (1 - Math.abs(v)) * (0.25 + 0.75 * r()) * (1 - u * 0.6) * (0.5 + 0.5 * Math.sin(t * 3 + i));
    if (a <= 0.02) continue;
    ctx.fillStyle = `rgba(255,240,215,${a * 0.8})`; const s = 1 + r() * 2.5; ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}
// cold breath: soft puffs from the mouth (x,y), drifting
function breathVapour(ctx, t, x, y, rate, dir = 1, a = 0.3, scale = 1) {
  for (let k = 0; k < 3; k++) {
    const ph = ((t * rate + k / 3) % 1), age = ph;
    if (age > 0.85) continue;
    const px = x + dir * age * 90 * scale, py = y - age * 50 * scale, rr = (20 + age * 110) * scale;
    radial(ctx, px, py, rr, [[0, `rgba(200,212,230,${a * (1 - age) * 0.55})`], [1, 'rgba(200,212,230,0)']], 'screen');
  }
}
// raindrops sliding on the lens
function lensDrops(ctx, t, a = 0.5) {
  const r = mulberry32(55);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y0 = r() * H, sp = 10 + r() * 60, y = (y0 + t * sp) % (H + 100) - 50, s = 6 + r() * 16;
    ctx.globalAlpha = a * (0.4 + r() * 0.6);
    ctx.fillStyle = 'rgba(200,215,235,0.10)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.8, s, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,240,255,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, s * 0.8, s, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  }
  ctx.restore();
}
// slow, heavy camera shake from the ground (low-frequency) + fine rattle
function quake(t, a) { return { x: (n1(t * 6, 1) * 14 + n1(t * 31, 2) * 5) * a, y: (n1(t * 5, 3) * 12 + n1(t * 29, 4) * 5) * a, r: n1(t * 4, 5) * 0.006 * a }; }
