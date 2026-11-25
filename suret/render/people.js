// The family placed in the baked sets: anchors give the plate position and depth of heads / feet, so faces and
// bodies follow every camera move. Rigs match the set's lights (moon from the window, sodium band through the lace).
'use strict';
// wife lying on her back, seen from above (pillow_top): face upright, hair fanned on the pillow, neck under the sheet
function wifeOnPillow(ctx, plate, cam, o = {}) {
  const p = anc('pillow_top', 'headW');
  const s = faceScaleAt('pillow_top', 'headW', plate, cam, -0.1) * (o.breath || 1);
  const [X, Y] = toCanvas(plate, [p[0] + 6, p[1] + 70], cam);
  const [, Yc] = toCanvas(plate, [0, 1352], cam);
  ctx.save(); ctx.beginPath(); ctx.rect(0, -H, W, Yc + H); ctx.clip();
  drawFace(ctx, 'wife', X, Y, s, o.rot || 0, Object.assign({ rig: 'moonL', hair: 'pillow', outfit: 'nightgown', k: o.k || 1.7, keyGain: 0.62, fillGain: 1.25 }, o));
  ctx.restore();
  sheetFold(ctx, X, Y + 205 * s, s, o.t || 0);
}
// husband asleep on his side facing the camera in the bed_door view (forehead to screen-left)
function husbandOnPillow(ctx, plate, cam, o = {}) {
  const p = anc('bed_door', 'headH');
  const s = faceScaleAt('bed_door', 'headH', plate, cam, -0.08);
  const [X, Y] = toCanvas(plate, [p[0] - 10, p[1] + 30], cam);
  const draw = (g) => drawFace(g, 'husband', X, Y, s * (o.breath || 1), -Math.PI / 2 + 0.08, Object.assign({ rig: 'moonSide', open: 0, k: 1.6, keyGain: 0.45, fillGain: 1.6 }, o));
  ctx.save();
  // the quilt over his shoulder covers the neck: clip to the pillow side of the quilt edge
  const [qx] = toCanvas(plate, [640, 0], cam);
  ctx.beginPath(); ctx.rect(-W, -H, qx + W, 3 * H); ctx.clip();
  if (o.blur) blurred(ctx, o.blur, draw); else draw(ctx);
  ctx.restore();
}
// the double, standing in the doorway (bed_door / bed_door_dbl plates)
function doubleInDoor(ctx, plate, cam, o = {}) {
  const view = 'bed_door';
  const eye = anc(view, 'dbl_head');
  const s = faceScaleAt(view, 'dbl_head', plate, cam);
  const [X, Y] = toCanvas(plate, eye, cam);
  const close = s > 0.45;
  const draw = (g) => {
    g.save();
    if (!close) {    // keep him inside the door opening (the jambs are in front)
      const tl = toCanvas(plate, anc(view, 'door_tr'), cam), br = toCanvas(plate, anc(view, 'door_bl'), cam);
      g.beginPath(); g.rect(Math.min(tl[0], br[0]) + 4, tl[1], Math.abs(br[0] - tl[0]) - 8, H * 2); g.clip();
    }
    drawFace(g, 'double', X + (o.dx || 0) * s, Y + 56 * s, s, o.rot || 0, Object.assign({
      rig: 'lampF', open: 1, pupil: 0.75, outfit: 'tshirt', full: !close, k: close ? 1.6 : 0.9,
      keyMask: laceMask(1180, o.laceX || 300, o.laceY || -200, [o.bandTop ?? -48]), keyGain: 0.5, fillGain: 0.7, rimGain: 1.1,
    }, o));
    g.restore();
  };
  if (o.blur) blurred(ctx, o.blur, draw); else draw(ctx);
}
// tiny sleeping heads in the wide shot (bed_wide)
function coupleWide(ctx, plate, cam, o = {}) {
  for (const [key, id, rot, extra] of [['headW', 'wife', -2.25, { hair: 'pillow', rig: 'moonL' }], ['headH', 'husband', -2.6, { rig: 'moonSide', keyGain: 0.4 }]]) {
    const p = anc('bed_wide', key), s = faceScaleAt('bed_wide', key, plate, cam, -0.1);
    const [X, Y] = toCanvas(plate, p, cam);
    ctx.save(); ctx.translate(X, Y); ctx.scale(1, 0.72); ctx.translate(-X, -Y);
    drawFace(ctx, id, X, Y, s, rot, Object.assign({ open: o.open ?? 0, k: 0.7, fillGain: 1.3 }, extra, key === 'headW' ? (o.wife || {}) : {}));
    ctx.restore();
  }
}

// the folded sheet edge drawn over her shoulders (soft curve, moonlit from the left)
function sheetFold(ctx, X, Y, s, t) {
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
  const edge = (k) => { ctx.moveTo(-900, 40 + k); ctx.bezierCurveTo(-420, -30 + k, -230, -70 + k, 0, -62 + k); ctx.bezierCurveTo(230, -70 + k, 420, -30 + k, 900, 40 + k); };
  // shadow it casts on the neck / gown
  ctx.beginPath(); edge(-26); ctx.lineTo(900, 400); ctx.lineTo(-900, 400); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.filter = 'blur(10px)'; ctx.fill(); ctx.filter = 'none';
  ctx.beginPath(); edge(0); ctx.lineTo(900, 400); ctx.lineTo(-900, 400); ctx.closePath();
  ctx.fillStyle = linGrad(ctx, -600, 0, 600, 0, [[0, '#7c8aa2'], [0.45, '#55607a'], [1, '#262c3a']]); ctx.fill();
  ctx.fillStyle = linGrad(ctx, 0, -70, 0, 120, [[0, 'rgba(255,255,255,0.18)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.5)']]); ctx.fill();
  ctx.strokeStyle = 'rgba(210,220,240,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); edge(2); ctx.stroke();
  for (let k = 0; k < 5; k++) { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-500 + k * 230, 30); ctx.quadraticCurveTo(-470 + k * 230, 140, -520 + k * 240, 300); ctx.stroke(); }
  ctx.restore();
}
// wife sitting up in bed (bed_sit plate), blanket bunched at her waist
function wifeSitting(ctx, plate, cam, o = {}) {
  const view = 'bed_sit', p = anc(view, 'sit_head'), hip = anc(view, 'sit_hips');
  const s = faceScaleAt(view, 'sit_head', plate, cam);
  const [X, Y] = toCanvas(plate, p, cam), [, Yh] = toCanvas(plate, hip, cam);
  ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, 3 * W, Yh - 40 * s + H); ctx.clip();
  drawFace(ctx, 'wife', X + (o.dx || 0) * s, Y + (56 + (o.dy || 0)) * s, s, o.rot || 0, Object.assign({ rig: 'moonSit', hair: 'down', outfit: 'nightgown', k: 1.5, keyGain: 0.7, fillGain: 1.2, rimGain: 0.6 }, o));
  ctx.restore();
}
// a bust placed by an eye anchor (any view), with optional clip rectangle
function bustAt(ctx, id, view, key, plate, cam, o = {}) {
  const p = anc(view, key), s = faceScaleAt(view, key, plate, cam, o.depthAdj || 0);
  const [X, Y] = toCanvas(plate, p, cam);
  const draw = (g) => {
    g.save();
    if (o.clip) { g.beginPath(); g.rect(o.clip[0], o.clip[1], o.clip[2], o.clip[3]); g.clip(); }
    drawFace(g, id, X + (o.dx || 0) * s, Y + (56 + (o.dy || 0)) * s, s * (o.sc || 1), o.rot || 0, o);
    g.restore();
  };
  if (o.blur) blurred(ctx, o.blur, draw); else draw(ctx);
  return [X, Y, s];
}
// a big screen-space portrait (close-ups over a blurred plate)
function portrait(ctx, id, x, y, s, o = {}) { drawFace(ctx, id, x, y, s, o.rot || 0, o); }
// white sedan (side view) for the departure
function sedan(ctx, x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
  const body = () => { ctx.beginPath(); ctx.moveTo(-230, 0); ctx.lineTo(-228, -52); ctx.bezierCurveTo(-220, -70, -190, -74, -150, -76); ctx.lineTo(-95, -80); ctx.bezierCurveTo(-70, -118, -40, -132, 10, -134); ctx.lineTo(70, -134); ctx.bezierCurveTo(110, -132, 140, -110, 165, -82); ctx.lineTo(215, -76); ctx.bezierCurveTo(232, -70, 238, -50, 236, -20); ctx.lineTo(232, 0); ctx.closePath(); };
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.filter = 'blur(8px)'; ctx.beginPath(); ctx.ellipse(0, 6, 250, 14, 0, 0, TAU); ctx.fill(); ctx.filter = 'none';
  body(); ctx.fillStyle = o.col || '#c9ccd0'; ctx.fill();
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = linGrad(ctx, 0, -134, 0, 0, [[0, 'rgba(255,255,255,0.35)'], [0.45, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0.45)']]); ctx.fillRect(-240, -140, 480, 140);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-226, -44); ctx.lineTo(234, -46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -80); ctx.lineTo(-12, -4); ctx.moveTo(110, -80); ctx.lineTo(108, -6); ctx.stroke();
  ctx.restore();
  // glass
  ctx.fillStyle = 'rgba(30,36,46,0.92)';
  ctx.beginPath(); ctx.moveTo(-82, -82); ctx.bezierCurveTo(-62, -112, -38, -124, 6, -126); ctx.lineTo(4, -82); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, -126); ctx.lineTo(66, -126); ctx.bezierCurveTo(100, -124, 124, -106, 146, -84); ctx.lineTo(14, -82); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(160,175,200,0.18)'; ctx.fillRect(-60, -118, 40, 30);
  // lights
  radial(ctx, -226, -40, 34, [[0, 'rgba(255,40,30,0.95)'], [0.3, 'rgba(255,30,20,0.5)'], [1, 'rgba(255,0,0,0)']], 'screen');
  ctx.fillStyle = '#ff3a2a'; ctx.fillRect(-232, -48, 10, 16);
  radial(ctx, 236, -40, 30, [[0, 'rgba(255,245,220,0.9)'], [1, 'rgba(255,240,200,0)']], 'screen');
  // wheels
  for (const wx of [-140, 150]) {
    ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.arc(wx, -2, 36, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6d7076'; ctx.beginPath(); ctx.arc(wx, -2, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b2d31'; ctx.lineWidth = 3; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + t * (o.spin || 0); ctx.beginPath(); ctx.moveTo(wx, -2); ctx.lineTo(wx + Math.cos(a) * 17, -2 + Math.sin(a) * 17); ctx.stroke(); }
  }
  ctx.restore();
}
// generic local newspaper page (no real masthead): headline, photo of the house, grey text columns
function newspaper(ctx, x, y, s, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const w = 760, h = 1080;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.filter = 'blur(18px)'; ctx.fillRect(-w / 2 + 14, -h / 2 + 20, w, h); ctx.filter = 'none';
  ctx.fillStyle = '#d9d2c3'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = linGrad(ctx, -w / 2, 0, w / 2, 0, [[0, 'rgba(120,100,70,0.18)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(90,80,60,0.22)']]); ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#1c1a17'; ctx.textBaseline = 'top';
  ctx.font = '900 64px "DejaVu Serif", serif'; ctx.textAlign = 'center'; ctx.fillText(o.mast || 'YEREL HABER', 0, -h / 2 + 30);
  ctx.fillRect(-w / 2 + 30, -h / 2 + 108, w - 60, 4); ctx.fillRect(-w / 2 + 30, -h / 2 + 150, w - 60, 2);
  ctx.font = '600 20px "DejaVu Sans", sans-serif'; ctx.fillText(o.date || 'KONYA · 2016', 0, -h / 2 + 120);
  ctx.textAlign = 'left';
  ctx.font = '900 58px "DejaVu Sans", sans-serif';
  (o.head || ["EREĞLİ'DE", 'KORKUTAN İDDİA']).forEach((l, i) => ctx.fillText(l, -w / 2 + 34, -h / 2 + 176 + i * 64));
  ctx.font = 'italic 600 28px "DejaVu Serif", serif'; ctx.fillStyle = '#3a342c';
  (o.sub || ["“Gece uyandığımda kapıda eşimin", 'benzerini gördüm”']).forEach((l, i) => ctx.fillText(l, -w / 2 + 34, -h / 2 + 318 + i * 36));
  // photo of the house (grey halftone of the overcast plate)
  const ph = o.photo;
  const px = -w / 2 + 34, py = -h / 2 + 410, pw = 430, phh = 300;
  ctx.fillStyle = '#555'; ctx.fillRect(px, py, pw, phh);
  if (ph) { ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, phh); ctx.clip(); ctx.filter = 'grayscale(1) contrast(1.2) brightness(0.9)'; ctx.drawImage(ph, ph.width * 0.15, ph.height * 0.3, ph.width * 0.7, ph.width * 0.49, px, py, pw, phh); ctx.filter = 'none'; ctx.restore(); }
  ctx.fillStyle = '#3a342c'; ctx.font = '500 18px "DejaVu Sans", sans-serif'; ctx.fillText(o.caption || 'Ailenin terk ettiği ev', px, py + phh + 8);
  // text columns as grey lines (unreadable)
  ctx.fillStyle = 'rgba(40,36,30,0.55)';
  const r = mulberry32(o.seed || 3);
  for (let c = 0; c < 3; c++) for (let l = 0; l < 22; l++) {
    const cx = (c === 0 ? px + pw + 24 : -w / 2 + 34 + (c - 1) * 360), cy = (c === 0 ? py + l * 14 : py + phh + 46 + l * 14);
    const cw = c === 0 ? w / 2 - pw - 54 + 330 - 330 + 216 : 330;
    if (c === 0 && l > 20) continue;
    if (c > 0 && cy > h / 2 - 30) continue;
    ctx.fillRect(cx, cy, cw * (l % 7 === 6 ? 0.55 : 0.92 + r() * 0.08), 6);
  }
  ctx.restore();
}

// clip path: the two glass panes of the bedroom window (window_day view)
function paneClip(ctx, view, cam) {
  const z0 = 0.95, z1 = 2.35, y0 = 0.92, y1 = 2.28, fw = 0.065, sw = 0.045, zm = (z0 + z1) / 2;
  ctx.beginPath();
  for (const [a, b] of [[z0 + fw + sw, zm - 0.04 - sw], [zm + 0.04 + sw, z1 - fw - sw]]) {
    const c = [[a, y0 + fw + sw], [b, y0 + fw + sw], [b, y1 - fw - sw], [a, y1 - fw - sw]].map(([z, y]) => toCanvas(view, proj3(view, [-0.13, y, z]), cam));
    ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.closePath();
  }
}
// daylight filling the open front door seen from the corridor
function doorGlow(ctx, view, cam, colr, a) {
  a *= 0.5;
  const c = [[4.3, 0.0], [5.2, 0.0], [5.2, 2.1], [4.3, 2.1]].map(([x, y]) => toCanvas(view, proj3(view, [x, y, 4.5]), cam));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a;
  ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.closePath();
  ctx.fillStyle = colr; ctx.filter = 'blur(6px)'; ctx.fill(); ctx.filter = 'none';
  const cx = (c[0][0] + c[1][0]) / 2, cy = (c[0][1] + c[2][1]) / 2;
  radial(ctx, cx, cy, Math.abs(c[1][0] - c[0][0]) * 1.6, [[0, 'rgba(180,195,220,0.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
  ctx.restore();
}
