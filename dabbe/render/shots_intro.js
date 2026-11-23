// 12 s intro: "Dâbbetü'l-Arz… İslam inancında kıyamet alametlerinden biri olarak kabul edilen ve yerden çıkacağı bildirilen canlıyı ifade eder."
'use strict';
const E = window.TL.events;

function grade(ctx, t, o = {}) {
  tint(ctx, '#2a1a10', o.cold ?? 0.25, 'soft-light');
  vignette(ctx, o.vig ?? 0.85, 0.28);
}
// red name with a light glitch, upper third (clear of the subtitles)
function nameCard(ctx, t, a, y = 520, size = 112) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a) * (Math.abs(n1(t * 23, 4)) > 0.82 ? 0.6 : 1);
  ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gx = Math.abs(n1(t * 7, 9)) > 0.8 ? n1(t * 50, 3) * 10 : 0;
  ctx.shadowColor = 'rgba(227,20,28,0.7)'; ctx.shadowBlur = 40; ctx.fillStyle = '#c40d16'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 + gx, y);
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.35; ctx.fillStyle = '#4fd2ff'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 - gx - 4, y);
  ctx.restore();
}
// documentary label chip
function infoCard(ctx, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const y = 330, w = 760, x = (W - w) / 2;
  ctx.fillStyle = 'rgba(6,6,8,0.72)'; ctx.fillRect(x, y, w, 128);
  ctx.fillStyle = '#c40d16'; ctx.fillRect(x, y, 8, 128);
  ctx.font = '700 30px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(220,210,200,0.75)'; ctx.textBaseline = 'middle';
  ctx.fillText('İSLAM İNANCINDA', x + 36, y + 40);
  ctx.font = '900 46px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = '#f2ece4'; ctx.fillText('KIYAMET ALAMETİ', x + 36, y + 88);
  ctx.restore();
}

let SHOTS = [
  { a: 0, b: 3.0, fin: 0.7, f: (ctx, t) => {
    drawEarth(ctx, t, { zoom: 1.0 + t * 0.015, panY: t * 6, dust: 0.3 });
    nameCard(ctx, t, smooth(seg(t, E.name, E.name + 0.4)) * (1 - smooth(seg(t, 2.6, 3.0))));
    grade(ctx, t);
  } },
  { a: 3.0, b: 6.0, x: 0.35, f: (ctx, t) => {
    const st = seg(t, 4.2, 6.0);
    drawEarth(ctx, t, { zoom: 1.05 + (t - 3) * 0.02, panY: 18 + t * 6, stones: st, shake: st * 0.06, dust: 0.4 + st * 0.4 });
    infoCard(ctx, t, smooth(seg(t, E.card, E.card + 0.4)) * (1 - smooth(seg(t, 5.6, 6.0))));
    grade(ctx, t);
  } },
  { a: 6.0, b: 10.75, f: (ctx, t) => {
    const k = easeOut(seg(t, E.crack, E.crack + 0.9)), z = 1.1 + (t - 6) * 0.07;
    const sh = t > E.shake ? 0.9 : 0.06 + 0.1 * seg(t, E.tremor, 10);
    ctx.save(); ctx.translate(W / 2, 1180); ctx.scale(z, z); ctx.translate(-W / 2, -1180);
    drawEarth(ctx, t, { zoom: 1.2, panY: 50, stones: 1, under: { k: smooth(seg(t, 6.0, 6.8)) * (1 - k * 0.6), x: lerp(200, 560, seg(t, 6, 7.4)), y: 1230 }, crackOpen: k, eyes: smooth(seg(t, E.eyes, E.eyes + 0.45)), shake: sh, dust: 0.9 });
    ctx.restore();
    grade(ctx, t, { vig: 0.9 });
  } },
  { a: 10.75, b: 12.0, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    nameCard(ctx, t, smooth(seg(t, E.title[0], E.title[0] + 0.2)) * (1 - smooth(seg(t, 11.65, 11.95))), 920, 118);
  } },
];
