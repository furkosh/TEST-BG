// 12 s intro: "Dâbbetü'l-Arz… İslam inancında kıyamet alametlerinden biri olarak kabul edilen ve yerden çıkacağı bildirilen canlıyı ifade eder."
'use strict';
const E = window.TL.events;

// red name with a faint glitch, upper third (clear of the subtitles)
function nameCard(ctx, t, a, y = 560, size = 112, sub = '') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a) * (Math.abs(n1(t * 23, 4)) > 0.86 ? 0.65 : 1);
  ctx.font = `900 ${size}px Inter, "DejaVu Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gx = Math.abs(n1(t * 7, 9)) > 0.82 ? n1(t * 50, 3) * 9 : 0;
  ctx.shadowColor = 'rgba(227,20,28,0.75)'; ctx.shadowBlur = 44; ctx.fillStyle = '#c40d16'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 + gx, y);
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.25; ctx.fillStyle = '#ff6a6a'; ctx.fillText("DÂBBETÜ'L-ARZ", W / 2 - gx - 3, y + 2);
  if (sub) { ctx.globalAlpha = clamp(a) * 0.85; ctx.font = '700 38px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = '#d8d0c6'; ctx.fillText(sub, W / 2, y + 100); }
  ctx.restore();
}
// documentary lower-third style label, placed high on the frame
function infoCard(ctx, t, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const y = 300, w = 780, x = (W - w) / 2, slide = (1 - a) * 40;
  ctx.fillStyle = 'rgba(5,6,8,0.78)'; ctx.fillRect(x - slide, y, w, 136);
  ctx.fillStyle = '#c40d16'; ctx.fillRect(x - slide, y, 9, 136);
  ctx.font = '700 31px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = 'rgba(220,210,200,0.8)'; ctx.textBaseline = 'middle';
  ctx.fillText('İSLAM İNANCINDA', x + 38 - slide, y + 42);
  ctx.font = '900 50px Inter, "DejaVu Sans", sans-serif'; ctx.fillStyle = '#f2ece4'; ctx.fillText('KIYAMET ALAMETİ', x + 38 - slide, y + 94);
  ctx.restore();
}

let SHOTS = [
  { a: 0, b: 2.9, fin: 0.8, f: (ctx, t) => {
    drawEarth2(ctx, t, { zoom: 1.0 + t * 0.025, panY: t * 10, panX: t * 6, moon: 1.05, dust: 0.3, shake: 0.03 + 0.05 * seg(t, 0, 2.9) });
    nameCard(ctx, t, smooth(seg(t, E.name, E.name + 0.35)) * (1 - smooth(seg(t, 2.55, 2.9))));
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 2.9, b: 6.2, x: 0.35, f: (ctx, t) => {
    // the mountains, the village below and the old quarry under a storm
    const u = (t - 2.9) / 3.3;
    const cam = mkCam({ x: pathX(-30) + 7 - u * 2, y: 17 - u * 2, z: -62 + u * 5, yaw: 0.1, pitch: 0.16, f: 1150 });
    const lt = pulse(t, 3.6, 0.5) + pulse(t, 3.85, 0.35) * 0.7 + pulse(t, 5.3, 0.45) * 0.5;
    frame(ctx, t, cam, { village: true, quarry: true, amb: 0.22 + lt * 0.25, fog: 0.12, fogDist: 80, far: 120, lights: 0.9, lightning: lt, lightX: 0.7, treeFilter: (T) => T.z > 24 });
    infoCard(ctx, t, smooth(seg(t, E.card, E.card + 0.4)) * (1 - smooth(seg(t, 5.85, 6.2))));
    grade(ctx, t);
  } },
  { a: 6.2, b: 8.5, x: 0.3, f: (ctx, t) => {
    const k = smooth(seg(t, 6.2, 7.0)), ck = easeOut(seg(t, E.crack, E.crack + 0.8));
    drawEarth2(ctx, t, { zoom: 1.15 + (t - 6.2) * 0.06, panY: 60 + (t - 6.2) * 10, panX: 40, moon: 1.0, stones: seg(t, 6.2, 7.4), bulge: { k: k * (1 - ck * 0.5), x: lerp(180, 560, seg(t, 6.2, 7.4)), y: 1230 }, crackOpen: ck * 1.3, shake: 0.12 + 0.35 * pulse(t, E.crack, 0.9), dust: 0.6 + ck * 0.5 });
    grade(ctx, t, { warm: true, cold: 0.2 });
  } },
  { a: 8.5, b: 10.75, f: (ctx, t) => {
    const z = 1.35 + (t - 8.5) * 0.12, sh = t > E.shake ? 1.3 : 0.14;
    ctx.save(); ctx.translate(W / 2, 1180); ctx.scale(z, z); ctx.translate(-W / 2, -1180);
    drawEarth2(ctx, t, { zoom: 1.25, panY: 83, panX: 40, moon: 0.95, stones: 1, crackOpen: 1.35, face: smooth(seg(t, 8.5, 9.4)), eyes: smooth(seg(t, E.eyes, E.eyes + 0.7)), eyeGlow: 1.1, shake: sh, dust: 0.9 });
    ctx.restore();
    grade(ctx, t, { warm: true, cold: 0.2, vig: 0.93, bloom: 0.42 });
  } },
  { a: 10.75, b: 12.0, f: (ctx, t) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    nameCard(ctx, t, smooth(seg(t, E.title[0], E.title[0] + 0.2)) * (1 - smooth(seg(t, 11.65, 11.95))), 900, 118, 'TOPRAĞIN ALTINDAN GELEN SES');
  } },
];
