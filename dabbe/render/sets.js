// ---------- close-up of the narrator: face + old brown coat ----------
// x,y = face centre on screen, k = scale; o passes through to drawManFace; o.coatLight [0..1]
function drawManBust(ctx, x, y, k, o = {}) {
  const L = LIGHTS[o.light || 'lantern'];
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k);
  // coat shoulders behind the head
  const cc = mix(mix(FIG.coat, L.sh, 0.35), L.base, 0.15);
  ctx.fillStyle = col(cc);
  ctx.beginPath(); ctx.moveTo(-520, 1100); ctx.bezierCurveTo(-500, 520, -420, 380, -150, 300); ctx.lineTo(150, 300); ctx.bezierCurveTo(420, 380, 500, 520, 520, 1100); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  const la = L.ang;
  ctx.fillStyle = linGrad(ctx, Math.cos(la) * 500, 0, -Math.cos(la) * 500, 0, [[0, col(L.hi, 0.18)], [0.5, col(L.sh, 0.2)], [1, col(L.sh, 0.85)]]); ctx.fillRect(-540, 280, 1080, 840);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.6; ctx.drawImage(TEX.plaster, -540, 280, 1080, 840); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col(L.sh, 0.6); ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-430 + i * 30, 560 + i * 40); ctx.quadraticCurveTo(-300 + i * 20, 700, -340 + i * 10, 1100); ctx.stroke(); ctx.beginPath(); ctx.moveTo(430 - i * 30, 560 + i * 40); ctx.quadraticCurveTo(300 - i * 20, 700, 340 - i * 10, 1100); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k);
  drawManFace(ctx, Object.assign({ light: 'lantern' }, o));
  // tired eyes: dark bags
  for (const sx of [-1, 1]) radialEllipse(ctx, sx * 62, -28, 44, 16, [[0, col(L.sh, 0.4)], [1, col(L.sh, 0)]]);
  if (o.gray) {   // years later: grey in the beard and temples
    ctx.strokeStyle = 'rgba(200,198,192,0.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); for (const [px, py, l, a, al] of MAN.beard) { if (al < 0.5) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); } ctx.stroke();
    ctx.beginPath(); for (const [px, py, l, a, v] of MAN.hair) { if (v < 0.8 || Math.abs(px) < 100) continue; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); } ctx.stroke();
  }
  // coat collar + lapels over the shirt
  ctx.fillStyle = col(mix(cc, L.sh, 0.25));
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.scale(sx, 1);
    ctx.beginPath(); ctx.moveTo(95, 250); ctx.bezierCurveTo(150, 260, 230, 300, 300, 360); ctx.lineTo(250, 700); ctx.lineTo(120, 560); ctx.bezierCurveTo(110, 450, 100, 360, 70, 300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col(L.sh, 0.7); ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }
  if (o.hand) {   // hand pressed over his mouth
    ctx.save(); ctx.translate(20 + (o.hand.dx || 0), 300); ctx.rotate(-0.25); ctx.scale(1.05, 1.05);
    drawHand(ctx, { light: o.light === 'dim' ? 'moon' : 'candle', curl: [0.35, 0.3, 0.3, 0.35, 0.3], tremble: o.hand.tremble ?? 0.6, t: o.t });
    ctx.restore();
  }
  ctx.restore();
}

// ---------- title / text ----------
function drawTitle(ctx, t, a) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (a <= 0) return;
  const fl = (Math.abs(n1(t * 23, 4)) > 0.75 ? 0.55 : 1);
  ctx.save(); ctx.globalAlpha = clamp(a) * fl;
  ctx.font = '900 118px Inter, "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(227,20,28,0.7)'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#c40d16'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 + n1(t * 30, 2) * 3, 920);
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.4; ctx.fillStyle = '#ff2a2a'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 + 6, 920);
  ctx.restore();
}
function drawDisclaimer(ctx, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = '600 30px Inter, "DejaVu Sans", sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(190,196,204,0.85)';
  ctx.fillText('Dinî kaynaklardan esinlenen kurgusal bir anlatıdır.', W / 2, 360); ctx.fillText('Yaratığın görünüşü özgün bir yorumdur.', W / 2, 402);
  ctx.restore();
}

function buildSets() {}

// ---------- Mehmet at his window, seen from the rainy street ----------
function drawWindowShot(ctx, t, o = {}) {
  const z = o.z || 1;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  // stone wall
  for (let y = -200; y < H + 200; y += 256) for (let x = -200; x < W + 200; x += 256) ctx.drawImage(WORLD.stone, x, y, 256, 256);
  ctx.fillStyle = 'rgba(8,10,16,0.72)'; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.fillStyle = 'rgba(150,170,200,0.05)'; ctx.fillRect(-200, -200, W + 400, H + 400);
  const Wn = { x: 250, y: 560, w: 580, h: 760 };
  // inside: warm lamp-lit room, Mehmet looking out
  ctx.save(); ctx.beginPath(); ctx.rect(Wn.x, Wn.y, Wn.w, Wn.h); ctx.clip();
  ctx.fillStyle = '#1a120c'; ctx.fillRect(Wn.x, Wn.y, Wn.w, Wn.h);
  const fl = 1 + n1(t * 6, 3) * 0.05;
  radial(ctx, Wn.x + Wn.w * 0.85, Wn.y + Wn.h * 0.75, 700 * fl, [[0, 'rgba(230,150,80,0.45)'], [1, 'rgba(40,20,10,0)']], 'screen');
  drawManBust(ctx, Wn.x + Wn.w * 0.5 + (o.lean || 0) * 30, Wn.y + Wn.h * 0.52, 0.95, { t, light: 'candle', look: o.look || [-0.4, 0.1], open: 1, knit: 0.35, raise: o.raise || 0.2, wide: o.wide || 0 });
  // rain on the glass: drops and runs
  const r = mulberry32(8);
  for (let i = 0; i < 160; i++) {
    const x = Wn.x + r() * Wn.w, sp = 20 + r() * 140, y = Wn.y + ((r() * Wn.h + t * sp * (r() < 0.2 ? 1 : 0.05)) % Wn.h), s = 1.5 + r() * 4;
    ctx.fillStyle = 'rgba(200,215,235,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.8, s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - s * 0.3, y - s * 0.5, 1.2, 1.2);
  }
  ctx.fillStyle = linGrad(ctx, Wn.x, Wn.y, Wn.x + Wn.w, Wn.y + Wn.h, [[0, 'rgba(150,170,200,0.10)'], [0.5, 'rgba(150,170,200,0)'], [1, 'rgba(150,170,200,0.06)']]); ctx.fillRect(Wn.x, Wn.y, Wn.w, Wn.h);
  ctx.restore();
  // frame + mullions
  ctx.strokeStyle = '#24180f'; ctx.lineWidth = 34; ctx.strokeRect(Wn.x, Wn.y, Wn.w, Wn.h);
  ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(Wn.x + Wn.w / 2, Wn.y); ctx.lineTo(Wn.x + Wn.w / 2, Wn.y + Wn.h); ctx.moveTo(Wn.x, Wn.y + Wn.h * 0.42); ctx.lineTo(Wn.x + Wn.w, Wn.y + Wn.h * 0.42); ctx.stroke();
  ctx.fillStyle = '#16100a'; ctx.fillRect(Wn.x - 60, Wn.y + Wn.h + 14, Wn.w + 120, 40);
  radialEllipse(ctx, Wn.x + Wn.w / 2, Wn.y + Wn.h + 300, 520, 200, [[0, 'rgba(230,150,80,0.12)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.restore();
}

// ---------- the glass of water on the table ----------
function drawGlassShot(ctx, t, o = {}) {
  const k = o.tremble || 0, z = o.z || 1;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = '#0d0907'; ctx.fillRect(-100, -100, W + 200, H + 200);
  radial(ctx, 900, 500, 1100, [[0, 'rgba(210,130,70,0.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
  // table top in perspective
  ctx.save(); poly(ctx, [[-200, 1050], [W + 200, 1050], [W + 400, H + 100], [-400, H + 100]]); ctx.clip();
  ctx.fillStyle = '#3b2717'; ctx.fillRect(-400, 1000, W + 800, 1000);
  for (let b = 0; b < 12; b++) { const y0 = 1050 + b * 75, sc = 1 + b * 0.25; ctx.globalAlpha = 0.85; ctx.drawImage(TEX.wood, 0, (b * 40) % 200, 512, 40, W / 2 - 700 * sc, y0, 1400 * sc, 76); }
  ctx.globalAlpha = 1; ctx.fillStyle = linGrad(ctx, 0, 1050, 0, H, [[0, 'rgba(0,0,0,0.65)'], [1, 'rgba(0,0,0,0.2)']]); ctx.fillRect(-400, 1000, W + 800, 1000);
  radialEllipse(ctx, 760, 1300, 700, 300, [[0, 'rgba(230,150,80,0.25)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.restore();
  // the glass
  const jx = n1(t * 38, 1) * 5 * k + n1(t * 61, 2) * 2 * k, cx = 520 + jx, top = 640, bot = 1320, rw = 190, rb = 160;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(cx + 40, bot + 10, rb * 1.3, 34, 0, 0, TAU); ctx.fill();
  const wl = top + 220 + n1(t * 20, 4) * 4 * k;
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - rw, top); ctx.lineTo(cx - rb, bot); ctx.ellipse(cx, bot, rb, 30, 0, Math.PI, 0, true); ctx.lineTo(cx + rw, top); ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(120,140,150,0.12)'; ctx.fillRect(cx - rw, wl, rw * 2, bot - wl + 40);
  ctx.fillStyle = linGrad(ctx, cx - rw, 0, cx + rw, 0, [[0, 'rgba(255,220,180,0.0)'], [0.15, 'rgba(255,220,180,0.25)'], [0.3, 'rgba(255,220,180,0.03)'], [0.85, 'rgba(255,220,180,0.18)'], [1, 'rgba(255,220,180,0)']]); ctx.fillRect(cx - rw, top, rw * 2, bot - top + 40);
  ctx.restore();
  // water surface with ripple rings
  const rwl = lerp(rw, rb, (wl - top) / (bot - top));
  ctx.fillStyle = 'rgba(170,180,185,0.28)'; ctx.beginPath(); ctx.ellipse(cx, wl, rwl, 34, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,200,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const ph = ((t * 2.4 + i / 5) % 1); if (k <= 0.02) break; ctx.globalAlpha = (1 - ph) * k; ctx.beginPath(); ctx.ellipse(cx, wl, rwl * ph, 34 * ph, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,235,210,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, top, rw, 36, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - rw, top); ctx.lineTo(cx - rb, bot); ctx.moveTo(cx + rw, top); ctx.lineTo(cx + rb, bot); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, bot, rb, 30, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}

// ---------- low over the floor of the house: something under it ----------
function drawFloorShot(ctx, t, o = {}) {
  const k = o.k || 0, sh = o.shake || 0;
  ctx.save(); ctx.translate(n1(t * 40, 1) * 14 * sh, n1(t * 35, 2) * 14 * sh);
  ctx.fillStyle = '#0c0907'; ctx.fillRect(-50, -50, W + 100, H + 100);
  // back wall (plaster) and the floor running away from the lens
  ctx.drawImage(TEX.plaster, -50, -50, W + 100, 900); ctx.fillStyle = 'rgba(12,9,7,0.82)'; ctx.fillRect(-50, -50, W + 100, 900);
  for (let b = 0; b < 16; b++) { const y0 = 850 + b * b * 4.6, h = 9 + b * 9.2, sc = 0.6 + b * 0.18; ctx.drawImage(TEX.wood, 0, (b * 31) % 220, 512, 30, W / 2 - 700 * sc, y0, 1400 * sc, h + 1); }
  ctx.fillStyle = linGrad(ctx, 0, 850, 0, H, [[0, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0.35)']]); ctx.fillRect(-50, 850, W + 100, H);
  // a swinging oil lamp throws a moving pool of light
  const sw = Math.sin(t * 2.2) * 0.35 * (0.3 + k);
  const lx = 540 + Math.sin(sw) * 420, ly = 260 + Math.cos(sw) * 60;
  ctx.strokeStyle = '#0a0806'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(540, -50); ctx.lineTo(lx, ly); ctx.stroke();
  radial(ctx, lx, ly, 900, [[0, 'rgba(230,150,80,0.3)'], [1, 'rgba(0,0,0,0)']], 'screen');
  radialEllipse(ctx, lx, 1400, 700, 260, [[0, 'rgba(230,150,80,0.25)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.fillStyle = 'rgba(255,200,130,0.9)'; ctx.beginPath(); ctx.ellipse(lx, ly, 22, 30, 0, 0, TAU); ctx.fill();
  // dust jumping off the boards
  const r = mulberry32(4);
  for (let i = 0; i < 120; i++) { const x = r() * W, by = 900 + r() * 1000, hop = Math.abs(Math.sin(t * 22 + i)) * 26 * k * r(); ctx.fillStyle = `rgba(200,170,130,${0.5 * k})`; ctx.fillRect(x, by - hop, 2.5, 2.5); }
  ctx.restore();
}
