// Frame compositor: picks the active shot(s) for time t, handles transitions, post-processing and subtitles.
'use strict';
const CANVAS = document.getElementById('c');
const CTX = CANVAS.getContext('2d');
const BUF = makeCanvas(W, H), BCTX = BUF.getContext('2d');

window.ready = (async () => {
  await document.fonts.load('900 92px Inter');
  buildSharedTextures();
  buildMan(); buildCreature(); buildForest(); buildFigure(); buildWorld(); buildGround(); buildDabbe(); buildSets();
  return true;
})();

function resetCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none'; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.imageSmoothingEnabled = true;
}
function drawShot(ctx, s, t) {
  resetCtx(ctx); ctx.save();
  s.f(ctx, t, t - s.a, clamp((t - s.a) / (s.b - s.a)));
  ctx.restore(); resetCtx(ctx);
}

window.renderFrame = (t) => {
  const ctx = CTX; resetCtx(ctx);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b);
  if (i >= 0) {
    const s = SHOTS[i];
    const x = s.x || 0;                                  // crossfade length from the previous shot
    if (x > 0 && i > 0 && t < s.a + x) {
      drawShot(ctx, SHOTS[i - 1], t);
      drawShot(BCTX, s, t);
      ctx.globalAlpha = smooth(seg(t, s.a, s.a + x)); ctx.drawImage(BUF, 0, 0); resetCtx(ctx);
    } else drawShot(ctx, s, t);
    if (s.fin) fillBlack(ctx, 1 - smooth(seg(t, s.a, s.a + s.fin)));      // fade in from black
    if (s.fout) fillBlack(ctx, smooth(seg(t, s.b - s.fout, s.b)));        // fade out to black
  }
  paperTexture(ctx, 0.08);
  grain(ctx, t, 0.2);
  if (window.OVERLAY) { resetCtx(ctx); window.OVERLAY(ctx, t); resetCtx(ctx); }   // story info cards
  drawSubtitles(ctx, t);
};
