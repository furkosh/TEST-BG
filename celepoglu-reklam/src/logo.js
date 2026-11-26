// Celepoğlu Taşımacılık logosu: firmanın kendi logo dosyası kullanılır (assets/).
//  - 'dark'  : orijinal renkler (koyu zeminler, final ekranı, kokpit ekranı)
//  - 'light' : 'CELEPOĞLU' harfleri koyu grafit (beyaz araç gövdesi üzerinde okunabilirlik için)
// Logo dosyaları assets/logo_hazirla.py ile assets/logo_orijinal.png'den üretilir.
export const RED = '#e60000';
export const BLACK = '#111214';

const IMGS = {};
export async function loadLogos(base = '/assets/') {
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  IMGS.dark = await load(base + 'logo_koyu_zemin.png');
  IMGS.light = await load(base + 'logo_acik_zemin.png');
}
export function logoAspect() { const im = IMGS.dark; return im ? im.naturalWidth / im.naturalHeight : 3.46; }

// (x, y) sol-üst köşe, h yükseklik. Genişliği döndürür.
export function drawLogo(ctx, x, y, h, theme = 'light', { measureOnly = false } = {}) {
  const w = h * logoAspect();
  if (measureOnly) return w;
  const im = theme === 'light' ? IMGS.light : IMGS.dark;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, x, y, w, h);
  ctx.restore();
  return w;
}

// Küçük uygulamalar (koltuk başlığı, kokpit ekranı): logoyu (cx, cy) merkezli, 2r genişliğe sığdırır.
export function drawEmblem(ctx, cx, cy, r, { theme = 'dark' } = {}) {
  const w = 2 * r, h = w / logoAspect();
  drawLogo(ctx, cx - w / 2, cy - h / 2, h, theme);
}
