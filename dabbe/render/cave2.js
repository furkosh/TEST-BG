// Cave interior, second pass: rock rings with stalactites and rubble, true darkness outside the flashlight,
// dust in the beam, wet glints, the eyes far down the tunnel.
'use strict';
function caveRing2(i) {
  const pts = [], n = 30;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + k / n * Math.PI;
    const r = 2.3 + 0.6 * (vnoise(k * 0.6, i * 0.8, 31) - 0.5) * 2 + 0.3 * (vnoise(k * 2.1, i * 1.6, 32) - 0.5) * 2;
    pts.push([Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.92 - 0.15]);
  }
  pts.push([2.6, 1.3]); pts.push([-2.6, 1.3]);
  return pts;
}
// o: {t, z, spot:[x,y], spotR, I, from:[x,y] (beam origin on screen), eyes, eyesDepth, debris, floor, dust, shake, ambient}
function drawCave2(ctx, t, o = {}) {
  const f = 900, zc = o.z || 0, sh = o.shake || 0, I = o.I ?? 1;
  const q = quake(t, sh), ox = W / 2 + q.x, oy = H * 0.47 + q.y;
  const curve = (d) => Math.sin(d * 0.11) * 1.5 + Math.sin(d * 0.31) * 0.4;
  const spot = o.spot || [W / 2, H / 2], sR = o.spotR || 520;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const glints = [], lips = [];
  for (let i = 44; i >= 0; i--) {
    const depth = i * 0.85 - (zc % 0.85), dz = depth + 0.45; if (dz < 0.4) continue;
    const id = i + Math.floor(zc / 0.85), ring = caveRing2(id);
    const cxo = (curve(i * 0.85 + zc) - curve(zc)) * f / dz, sc = f / dz;
    const P = ring.map(([x, y]) => [ox + cxo + x * sc, oy + y * sc]);
    const fall = 1 / (1 + 0.035 * dz * dz);
    ctx.save();
    ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); ctx.moveTo(P[0][0], P[0][1]); for (const p of P) ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.clip('evenodd');
    const b = 40 + 150 * fall;
    ctx.fillStyle = `rgb(${b * 1.0},${b * 0.92},${b * 0.82})`; ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(GR.rock, ox + cxo - 3.2 * sc, oy - 3 * sc, 6.4 * sc, 5.2 * sc);
    ctx.globalCompositeOperation = 'source-over';
    // the ring's lip: deep shadow just behind it, a lit ridge on it
    ctx.filter = `blur(${Math.max(2, 0.15 * sc)}px)`; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = Math.max(5, 0.6 * sc);
    poly(ctx, P.slice(0, -2), false); ctx.stroke(); ctx.filter = 'none';
    ctx.restore();
    ctx.strokeStyle = `rgba(230,215,190,${0.3 * fall})`; ctx.lineWidth = Math.max(1, 0.035 * sc); poly(ctx, P.slice(0, -2), false); ctx.stroke();
    lips.push([P.slice(0, -2), fall, sc]);
    // stalactites hanging from the roof of this ring
    const rr = mulberry32(id * 13 + 7);
    for (let k = 6; k < 25; k++) {
      if (rr() > 0.32) continue;
      const a = P[k], b2 = P[k + 1], len = (0.25 + rr() * 0.7) * sc, tip = [(a[0] + b2[0]) / 2 + (rr() - 0.5) * 0.1 * sc, (a[1] + b2[1]) / 2 + len];
      ctx.fillStyle = `rgb(${b * 0.55},${b * 0.5},${b * 0.45})`; poly(ctx, [a, b2, tip]); ctx.fill();
      ctx.strokeStyle = `rgba(235,225,205,${0.5 * fall})`; ctx.lineWidth = Math.max(1, 0.015 * sc); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      if (rr() < 0.4) glints.push([tip[0], tip[1], fall, rr() * 10]);                          // a drop of water on the tip
    }
    // rubble along the floor edge
    const fy = P[P.length - 1][1];
    for (let k = 0; k < 6; k++) {
      const x = ox + cxo + (rr() - 0.5) * 4.8 * sc, s = (0.08 + rr() * 0.25) * sc;
      ctx.fillStyle = `rgb(${b * 0.6},${b * 0.55},${b * 0.5})`; ctx.beginPath(); ctx.ellipse(x, fy, s, s * 0.6, rr(), Math.PI, TAU); ctx.fill();
      if (rr() < 0.3) glints.push([x, fy - s * 0.4, fall, rr() * 10]);
    }
  }
  // floor cracks splitting open
  if (o.floor > 0) {
    ctx.save(); ctx.strokeStyle = '#030201'; ctx.lineCap = 'round';
    const r = mulberry32(12);
    for (let k = 0; k < 10; k++) {
      let x = ox + (r() - 0.5) * 700, y = H + 20, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      ctx.lineWidth = 4 + r() * 14 * o.floor; ctx.beginPath(); ctx.moveTo(x, y);
      const n = Math.floor(14 * o.floor);
      for (let s = 0; s < n; s++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 46; y += Math.sin(a) * 34 * (1 - s / 16); ctx.lineTo(x, Math.max(oy + 1.3 * f / 3.2, y)); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // light: only where the flashlight falls
  const from = o.from || [W * 0.72, H * 1.05];
  applyLightMap(ctx, o.ambient || [30, 30, 36], [
    { spot: [spot[0], spot[1], sR * 1.25], col: [255, 238, 205], I: I },
    { cone: [from[0], from[1], spot[0], spot[1], 30, sR * 0.55], col: [255, 238, 205], I: I * 0.55 },
    { spot: [from[0], from[1] - 120, 620], col: [150, 132, 112], I: I * 0.6 },
  ]);
  // cold night light leaking in from the mouth behind the camera catches the edge of every rock ring
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.lineCap = 'round';
  for (const [pts, fl, sc] of lips) { ctx.strokeStyle = `rgba(120,140,175,${0.1 * fl * (o.mouthLight ?? 1)})`; ctx.lineWidth = Math.max(1, 0.03 * sc); poly(ctx, pts, false); ctx.stroke(); }
  ctx.restore();
  // emissive: water glints that catch the beam, dust in the beam, haze
  for (const [x, y, fl, ph] of glints) {
    const lit = Math.exp(-((x - spot[0]) ** 2 + (y - spot[1]) ** 2) / (sR * sR * 0.5)) * I;
    if (lit < 0.05) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + ph);
    ctx.fillStyle = `rgba(255,250,235,${0.8 * lit * tw})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + 2 * fl, 0, TAU); ctx.fill();
  }
  if (o.debris > 0) {
    const r = mulberry32(44);
    for (let i = 0; i < 60; i++) {
      const per = 0.6 + r() * 0.8, ph = ((t + r() * 9) % per) / per, x = r() * W, s = 3 + r() * 14;
      if (r() > o.debris) continue;
      const y = -40 + ph * ph * (H + 80), lit = Math.exp(-((x - spot[0]) ** 2 + (y - spot[1]) ** 2) / (sR * sR)) * I;
      ctx.fillStyle = `rgba(${30 + 190 * lit},${26 + 170 * lit},${22 + 150 * lit},0.95)`; ctx.fillRect(x, y, s, s * 0.8);
    }
  }
  beamDust(ctx, t, from[0], from[1], spot[0], spot[1], sR * 0.5, 140 + (o.dust || 0) * 200, 0.7 * I * (0.6 + (o.dust || 0)), 7);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(26px)';
  const dx = spot[0] - from[0], dy = spot[1] - from[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  ctx.fillStyle = linGrad(ctx, from[0], from[1], spot[0], spot[1], [[0, `rgba(255,240,215,${0.18 * I})`], [1, `rgba(255,240,215,${0.05 * I})`]]);
  poly(ctx, [[from[0] + nx * 20, from[1] + ny * 20], [spot[0] + nx * sR * 0.5, spot[1] + ny * sR * 0.5], [spot[0] - nx * sR * 0.5, spot[1] - ny * sR * 0.5], [from[0] - nx * 20, from[1] - ny * 20]]); ctx.fill();
  ctx.restore();
  if (o.dust > 0) { drawFog(ctx, t, 0.08 * o.dust, 24, 3, 5); }
  if (o.eyes > 0) {                                                       // far down the tunnel, in total darkness
    const ed = o.eyesDepth || 18, es = f / ed, ex = ox + (curve(ed + zc) - curve(zc)) * f / ed, ey = oy - 0.5 * es;
    dabbeEyes2(ctx, ex, ey, 0.09 * es * (o.eyeScale || 1), o.eyes, 1, t);
  }
}
