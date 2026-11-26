// Serbest kameralı tek kareler (afiş, Reels kapağı): node src/still.js <çıktı_öneki> <genişlik> <yükseklik> <ayarlar.json>
// ayarlar.json: [{ "name": "a", "pos": [x,y,z], "look": [x,y,z], "fov": 50, "sky": {...}, "dof": {"a": 3, "max": 8} }, ...]
const { chromium } = require('playwright'); const start = require('./server'); const fs = require('fs');
(async () => {
  const [prefix, w, h, file] = process.argv.slice(2); const W = +w, H = +h;
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  const srv = await start(8790);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('PAGE', m.text().slice(0, 300)); });
  await p.goto(`http://localhost:8790/film.html?w=${W}&h=${H}`);
  await p.waitForFunction('window.ready', null, { timeout: 300000 });
  for (const o of list) {
    const t0 = Date.now();
    await p.evaluate(o => window.renderStill(o), o);
    await p.screenshot({ path: `${prefix}_${o.name}.png` });
    console.log(o.name, Date.now() - t0, 'ms');
  }
  await b.close(); srv.close();
})();
