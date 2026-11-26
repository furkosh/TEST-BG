// Tüm kareleri JPEG olarak render eder (kaldığı yerden devam edebilir).
// node src/render.js <outDir> <width> <workerIndex> <workerCount> [fromFrame] [toFrame]
const {chromium}=require('playwright');const start=require('./server');const fs=require('fs');const path=require('path');
(async()=>{const [out,w,wi,wn,from,to]=process.argv.slice(2);const W=+w,H=Math.round(W*9/16),I=+wi,N=+wn;
fs.mkdirSync(out,{recursive:true});
const srv=await start(8800+I);const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:W,height:H}});p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('PAGE',m.text().slice(0,300))});
await p.goto(`http://localhost:${8800+I}/film.html?w=${W}`);await p.waitForFunction('window.ready',null,{timeout:300000});
const total=Math.round(await p.evaluate('window.duration*window.fps'));const F0=+(from||0),F1=+(to||total);
const CH=30;let n=0;const t0=Date.now();
for(let f=F0;f<F1;f++){ if(Math.floor(f/CH)%N!==I)continue; const fn=path.join(out,`f${String(f).padStart(5,'0')}.jpg`); if(fs.existsSync(fn))continue;
  await p.evaluate(f=>window.renderAt(f),f); await p.screenshot({path:fn+'.tmp',type:'jpeg',quality:94}); fs.renameSync(fn+'.tmp',fn); n++;
  if(n%60===0)console.log(`w${I} frame ${f} | ${n} kare | ${((Date.now()-t0)/n/1000).toFixed(2)} sn/kare`);}
console.log(`w${I} bitti: ${n} kare, ${((Date.now()-t0)/1000/60).toFixed(1)} dk`);await b.close();srv.close();})();
