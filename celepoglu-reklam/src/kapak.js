// Reels kapağını (kapak.html, 1080x1920) PNG olarak kaydeder: node src/kapak.js <çıktı.png>
// Önce arka plan: node src/still.js out/kapak/zemin 2160 3840 <ayarlar.json> ve 1080x1920'ye küçültme (README).
const { chromium } = require('playwright'); const start = require('./server');
(async () => {
  const out = process.argv[2] || 'out/kapak/reels_kapak.png';
  const srv = await start(8791);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('http://localhost:8791/kapak.html', { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (const w of ['600', '700', '800']) await document.fonts.load(`${w} 40px Montserrat`, 'YOLUNUZ GÜVENLE BİZİMLE ÖĞRENCİ İZMİR');
  });
  const ok = await p.evaluate(() => ['600', '700', '800'].every(w => document.fonts.check(`${w} 40px Montserrat`, 'GÜVENLE')));
  if (!ok) console.error('FONT YÜKLENEMEDİ');
  await p.screenshot({ path: out });
  console.log('kaydedildi', out);
  await b.close(); srv.close();
})();
