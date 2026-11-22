// Frame renderer: drives index.html in headless Chromium and writes JPEG frames.
// usage: node render_frames.cjs frames <outDir> [from] [to] [workers]
//        node render_frames.cjs stills <outDir> t1 t2 ...
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const url = 'file://' + path.join(here, process.env.PAGE || 'index.html');   // PAGE=outro.html for the 15 s outro
const [mode, outDir, ...rest] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}

(async () => {
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
if (mode === 'stills') {
  const page = await openPage(browser);
  for (const ts of rest) {
    const t = parseFloat(ts);
    const data = await page.evaluate((t) => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
    fs.writeFileSync(path.join(outDir, `still_${t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('still', t);
  }
} else {
  const fps = 24;
  const from = parseInt(rest[0] ?? '0'), to = parseInt(rest[1] ?? String(135 * fps)), workers = parseInt(rest[2] ?? '4');
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const page = await openPage(browser);
    for (let f = from + k; f < to; f += workers) {
      const file = path.join(outDir, `f_${String(f).padStart(5, '0')}.jpg`);
      if (fs.existsSync(file)) { done++; continue; }
      const data = await page.evaluate((t) => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, f / fps);
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      done++;
      if (done % 48 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${to - from} frames, ${(done / el).toFixed(2)} fps, eta ${((to - from - done) / (done / el) / 60).toFixed(1)} min`);
      }
    }
  }));
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
}
await browser.close();
})();
