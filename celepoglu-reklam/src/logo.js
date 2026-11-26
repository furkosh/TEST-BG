// Celepoğlu Taşımacılık logo çizimi (canvas 2D). Araç kaplaması ve final ekranında aynı çizim kullanılır.
// NOT: Firmanın gerçek logosu elimizde olmadığı için kurumsal renklerde (kırmızı / beyaz / siyah) bir logo tasarlandı.
export const RED = '#d8141c';
export const RED_DARK = '#9e0a10';
export const BLACK = '#111214';

// Amblem: kırmızı disk + siyah "C" yol + beyaz şerit çizgileri + ileri ok
export function drawEmblem(ctx, cx, cy, r, { ring = true, glow = 0 } = {}) {
  ctx.save();
  if (glow > 0) { ctx.shadowColor = 'rgba(255,40,40,' + glow + ')'; ctx.shadowBlur = r * 0.6; }
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ff3b2f'); g.addColorStop(0.55, RED); g.addColorStop(1, RED_DARK);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  if (ring) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.stroke(); }
  // "C" biçimli yol
  const R = r * 0.53, a0 = 0.30 * Math.PI, a1 = 1.70 * Math.PI;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.36; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1, false); ctx.stroke();
  ctx.strokeStyle = BLACK; ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1, false); ctx.stroke();
  // şerit çizgisi
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.04;
  ctx.setLineDash([r * 0.13, r * 0.10]); ctx.beginPath(); ctx.arc(cx, cy, R, a0 + 0.08, a1 - 0.02, false); ctx.stroke();
  ctx.setLineDash([]);
  // ileri ok (yolun bittiği uçta, sağa doğru)
  const ex = cx + Math.cos(a1) * R, ey = cy + Math.sin(a1) * R;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(ex - r * 0.20, ey - r * 0.21);
  ctx.lineTo(ex + r * 0.30, ey + r * 0.06);
  ctx.lineTo(ex - r * 0.16, ey + r * 0.30);
  ctx.lineTo(ex - r * 0.04, ey + r * 0.05);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Yatay logo: amblem + CELEPOĞLU + TAŞIMACILIK. theme: 'light' (beyaz zemin) | 'dark'
// (x, y) sol-üst köşe, h toplam yükseklik. Genişliği döndürür.
export function drawLogo(ctx, x, y, h, theme = 'light', { measureOnly = false, glow = 0 } = {}) {
  const r = h / 2;
  const gap = h * 0.16;
  const tx = x + h + gap;
  const capH = h * 0.56; // CELEPOĞLU yazı boyu
  ctx.save();
  ctx.font = `900 ${capH}px Montserrat`;
  ctx.letterSpacing = `${capH * 0.02}px`;
  const w1 = ctx.measureText('CELEPOĞLU').width;
  const subH = h * 0.205;
  ctx.font = `700 ${subH}px Montserrat`;
  ctx.letterSpacing = `${subH * 0.62}px`;
  const w2 = ctx.measureText('TAŞIMACILIK').width;
  const textW = Math.max(w1 * 1.0, w2);
  const total = h + gap + textW;
  if (measureOnly) { ctx.restore(); return total; }
  drawEmblem(ctx, x + r, y + r, r, { glow });
  // CELEPOĞLU (hafif italik his için eğik)
  ctx.save();
  ctx.translate(tx, y + h * 0.60);
  ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.font = `900 ${capH}px Montserrat`;
  ctx.letterSpacing = `${capH * 0.02}px`;
  ctx.fillStyle = theme === 'light' ? BLACK : '#ffffff';
  if (glow > 0) { ctx.shadowColor = 'rgba(255,255,255,' + glow * 0.6 + ')'; ctx.shadowBlur = h * 0.25; }
  ctx.fillText('CELEPOĞLU', (textW - w1) / 2 + capH * 0.05, 0);
  ctx.restore();
  // TAŞIMACILIK + kırmızı çizgi
  ctx.font = `700 ${subH}px Montserrat`;
  ctx.letterSpacing = `${subH * 0.62}px`;
  ctx.fillStyle = theme === 'light' ? RED : '#ff2e2e';
  ctx.fillText('TAŞIMACILIK', tx + (textW - w2) / 2 + subH * 0.3, y + h * 0.98);
  ctx.fillStyle = theme === 'light' ? RED : '#ff2e2e';
  ctx.fillRect(tx, y + h * 0.67, textW, h * 0.035);
  ctx.restore();
  return total;
}
