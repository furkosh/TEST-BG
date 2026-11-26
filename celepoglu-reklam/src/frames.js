// Belirli saniyelerden önizleme kareleri: node src/frames.js out_prefix 1.5,8.2,... [width]
const {chromium}=require('playwright');const start=require('./server');
(async()=>{const [prefix,list,w]=process.argv.slice(2);const W=+(w||960),H=Math.round(W*9/16);
const srv=await start(8769);const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:W,height:H}});p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('PAGE',m.type(),m.text().slice(0,1500))});p.on('pageerror',e=>console.log('PAGEERR',e.message,e.stack&&e.stack.slice(0,400)));
let t0=Date.now();await p.goto(`http://localhost:8769/film.html?w=${W}`);await p.waitForFunction('window.ready',null,{timeout:300000});console.log('load',Date.now()-t0);
for(const s of list.split(',')){t0=Date.now();const f=Math.round(parseFloat(s)*60);await p.evaluate(f=>window.renderAt(f),f);await p.screenshot({path:`${prefix}_${s}.jpg`,type:'jpeg',quality:88});console.log(s,Date.now()-t0,'ms');}
await b.close();srv.close();})();
