// Ekran yazıları ve final logo ekranı (DOM katmanı, zamana göre deterministik)
import { drawLogo } from './logo.js';
import { clamp, smooth, smoother, easeOut, range } from './util.js';

let el = {};
const TITLES = [
  { t0: 8.0, t1: 12.4, text: 'ÖĞRENCİ TAŞIMACILIĞI' },
  { t0: 18.7, t1: 23.2, text: 'PERSONEL TAŞIMACILIĞI' },
  { t0: 28.7, t1: 33.4, text: 'VIP VE ÖZEL ULAŞIM HİZMETLERİ' },
];
const WORDS = [
  { t0: 38.7, t1: 41.1, text: 'GÜVEN' },
  { t0: 41.5, t1: 43.9, text: 'KONFOR' },
  { t0: 44.3, t1: 46.7, text: 'KALİTE' },
  { t0: 47.1, t1: 49.8, text: 'PROFESYONELLİK' },
];

export function setupOverlay(W, H) {
  const css = document.createElement('style');
  css.textContent = `
  #ov{position:fixed;inset:0;pointer-events:none;font-family:Montserrat,sans-serif;color:#fff;overflow:hidden}
  #title{position:absolute;left:6.2vw;bottom:10.5vh;display:flex;align-items:stretch;gap:1.3vw}
  #title .bar{width:0.42vw;background:#d8141c;transform-origin:bottom;box-shadow:0 0 1.2vw rgba(216,20,28,.55)}
  #title .txt{display:flex;flex-direction:column;justify-content:center;gap:.55vh}
  #title .kick{font-weight:600;font-size:1.02vw;letter-spacing:.42em;opacity:.85;text-shadow:0 .15vw .6vw rgba(0,0,0,.6)}
  #title .main{font-weight:800;font-size:3.05vw;letter-spacing:.075em;line-height:1.05;text-shadow:0 .2vw 1.4vw rgba(0,0,0,.55);white-space:nowrap}
  #title .main span{display:inline-block}
  #word{position:absolute;left:0;right:0;bottom:15vh;text-align:center}
  #word .w{display:inline-block;font-weight:900;font-size:6.2vw;letter-spacing:.26em;padding-left:.26em;text-shadow:0 .3vw 2vw rgba(0,0,0,.5)}
  #word .u{margin:1.4vh auto 0;height:.32vw;background:linear-gradient(90deg,transparent,#d8141c 25%,#ff3a2a 50%,#d8141c 75%,transparent);box-shadow:0 0 1.2vw rgba(255,40,30,.7)}
  #final{position:absolute;inset:0;background:#000;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  #final .glow{position:absolute;left:50%;top:44%;width:80vw;height:40vw;transform:translate(-50%,-50%);background:radial-gradient(ellipse at center,rgba(216,20,28,.42) 0%,rgba(120,10,14,.18) 35%,rgba(0,0,0,0) 65%)}
  #final .streak{position:absolute;top:44%;height:.22vw;width:120vw;left:-10vw;transform-origin:center}
  #final .streak.r{background:linear-gradient(90deg,transparent 0%,rgba(255,40,30,0) 30%,rgba(255,60,40,.95) 50%,rgba(255,40,30,0) 70%,transparent 100%);filter:blur(.15vw)}
  #final .streak.w{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0) 35%,rgba(255,255,255,1) 50%,rgba(255,255,255,0) 65%,transparent 100%);height:.12vw}
  #final canvas{position:relative;width:58vw;height:auto}
  #final .sheen{position:absolute;left:21vw;top:30%;width:58vw;height:17vw;overflow:hidden;mix-blend-mode:screen}
  #final .sheen i{position:absolute;top:-20%;width:8vw;height:140%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg)}
  #final .tag{position:relative;margin-top:4.6vh;font-weight:800;font-size:2.15vw;letter-spacing:.34em;padding-left:.34em}
  #final .line{position:relative;margin-top:2.2vh;height:.16vw;width:30vw;background:linear-gradient(90deg,transparent,#d8141c,transparent)}
  #final .contact{position:relative;margin-top:2.6vh;font-weight:500;font-size:1.32vw;letter-spacing:.08em;color:rgba(255,255,255,.82);display:flex;gap:2.2vw;align-items:center}
  #final .contact b{width:.45vw;height:.45vw;border-radius:50%;background:#d8141c;display:inline-block}
  #final .loc{position:relative;margin-top:1.8vh;font-weight:700;font-size:1.12vw;letter-spacing:.55em;padding-left:.55em;color:#ff3b30}
  #leak{position:absolute;inset:0;mix-blend-mode:screen;opacity:0;background:radial-gradient(ellipse at 75% 30%,rgba(255,200,140,.95),rgba(255,120,60,.45) 35%,rgba(0,0,0,0) 70%)}
  `;
  document.head.appendChild(css);
  const ov = document.createElement('div'); ov.id = 'ov';
  ov.innerHTML = `
    <div id="title"><div class="bar"></div><div class="txt"><div class="kick">CELEPOĞLU TAŞIMACILIK</div><div class="main"></div></div></div>
    <div id="word"><div class="w"></div><div class="u"></div></div>
    <div id="final"><div class="glow"></div><div class="streak r"></div><div class="streak w"></div>
      <canvas></canvas><div class="sheen"><i></i></div>
      <div class="tag">YOLUNUZ, GÜVENLE BİZİMLE.</div><div class="line"></div>
      <div class="contact"><span>www.celepogluturizm.com</span><b></b><span>iletisim@celepogluturizm.com</span></div>
      <div class="loc">İZMİR / TİRE</div></div>
    <div id="leak"></div>`;
  document.body.appendChild(ov);
  el = {
    title: ov.querySelector('#title'), bar: ov.querySelector('#title .bar'), kick: ov.querySelector('#title .kick'), main: ov.querySelector('#title .main'),
    word: ov.querySelector('#word'), w: ov.querySelector('#word .w'), u: ov.querySelector('#word .u'),
    final: ov.querySelector('#final'), canvas: ov.querySelector('#final canvas'), glow: ov.querySelector('#final .glow'),
    sr: ov.querySelector('#final .streak.r'), sw: ov.querySelector('#final .streak.w'), sheen: ov.querySelector('#final .sheen i'),
    tag: ov.querySelector('#final .tag'), line: ov.querySelector('#final .line'), contact: ov.querySelector('#final .contact'), loc: ov.querySelector('#final .loc'),
    leak: ov.querySelector('#leak'),
  };
  // final logosu
  const cw = Math.round(W * 0.58), ctx0 = el.canvas.getContext('2d');
  const hgt = cw * 0.29;
  el.canvas.width = cw; el.canvas.height = Math.round(hgt);
  const lw = drawLogo(ctx0, 0, 0, hgt * 0.86, 'dark', { measureOnly: true });
  const sc = Math.min(1, (cw * 0.98) / lw);
  // arkadan aydınlatma halesi: siyah hilal koyu zeminde de okunsun
  const off = document.createElement('canvas'); off.width = cw; off.height = el.canvas.height;
  const oc = off.getContext('2d');
  oc.translate((cw - lw * sc) / 2, hgt * 0.07); oc.scale(sc, sc); drawLogo(oc, 0, 0, hgt * 0.86, 'dark');
  oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = 'source-in'; oc.fillStyle = '#e9e7e4'; oc.fillRect(0, 0, cw, off.height);
  ctx0.save(); ctx0.filter = `blur(${Math.round(cw * 0.011)}px)`; ctx0.globalAlpha = 0.5; ctx0.drawImage(off, 0, 0); ctx0.drawImage(off, 0, 0); ctx0.restore();
  ctx0.save(); ctx0.filter = `blur(${Math.round(cw * 0.003)}px)`; ctx0.globalAlpha = 0.6; ctx0.drawImage(off, 0, 0); ctx0.restore();
  ctx0.save(); ctx0.translate((cw - lw * sc) / 2, hgt * 0.07); ctx0.scale(sc, sc); drawLogo(ctx0, 0, 0, hgt * 0.86, 'dark'); ctx0.restore();
  el.lastTitle = null; el.lastWord = null;
}

function setTitleText(text) {
  if (el.lastTitle === text) return;
  el.main.innerHTML = text.split('').map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  el.lastTitle = text;
}

export function updateOverlay(t) {
  // başlıklar
  const T = TITLES.find(x => t >= x.t0 - 0.01 && t < x.t1 + 0.6);
  if (T) {
    setTitleText(T.text);
    const a = t - T.t0, out = smooth(range(t, T.t1 - 0.1, T.t1 + 0.5));
    el.title.style.opacity = String(1 - out);
    el.title.style.transform = `translateX(${-out * 2}vw)`;
    el.bar.style.transform = `scaleY(${easeOut(range(a, 0, 0.45))})`;
    el.kick.style.opacity = String(smooth(range(a, 0.25, 0.7)));
    el.kick.style.transform = `translateY(${(1 - easeOut(range(a, 0.25, 0.8))) * 1.2}vh)`;
    const spans = el.main.children;
    for (let i = 0; i < spans.length; i++) {
      const k = easeOut(range(a, 0.3 + i * 0.028, 0.75 + i * 0.028));
      spans[i].style.opacity = String(k);
      spans[i].style.transform = `translateY(${(1 - k) * 2.2}vh)`;
      spans[i].style.filter = `blur(${(1 - k) * 0.5}vw)`;
    }
  } else el.title.style.opacity = '0';
  // kelimeler
  const Wd = WORDS.find(x => t >= x.t0 && t < x.t1);
  if (Wd) {
    if (el.lastWord !== Wd.text) { el.w.textContent = Wd.text; el.lastWord = Wd.text; }
    const a = t - Wd.t0, d = Wd.t1 - Wd.t0;
    const inn = easeOut(range(a, 0, 0.55)), out = smooth(range(a, d - 0.45, d));
    el.word.style.opacity = String(inn * (1 - out));
    el.w.style.letterSpacing = `${0.26 + (1 - inn) * 0.35 + out * 0.08}em`;
    el.w.style.filter = `blur(${(1 - inn) * 0.6 + out * 0.4}vw)`;
    el.w.style.transform = `scale(${1.06 - 0.06 * inn + out * 0.02})`;
    el.u.style.width = `${easeOut(range(a, 0.2, 0.8)) * 34}vw`;
  } else el.word.style.opacity = '0';
  // final
  const f0 = 55.45;
  if (t >= f0) {
    const a = t - f0;
    el.final.style.opacity = String(smooth(range(a, 0, 0.35)));
    const lg = easeOut(range(a, 0.35, 1.35));
    el.canvas.style.opacity = String(lg);
    el.canvas.style.transform = `scale(${1.12 - 0.12 * lg})`;
    el.canvas.style.filter = `blur(${(1 - lg) * 1.2}vw) drop-shadow(0 0 ${0.6 + 2.2 * Math.exp(-Math.max(0, a - 0.4) * 2.5)}vw rgba(255,40,30,${0.25 + 0.5 * Math.exp(-Math.max(0, a - 0.4) * 2)}))`;
    el.glow.style.opacity = String(smooth(range(a, 0.25, 0.9)) * (0.75 + 0.25 * Math.exp(-Math.max(0, a - 0.4) * 1.5)));
    const sweep = range(a, 0.05, 0.85);
    el.sr.style.opacity = String(Math.sin(Math.PI * sweep));
    el.sr.style.transform = `translateX(${(sweep - 0.5) * 110}vw) scaleY(${1 + 2 * Math.sin(Math.PI * sweep)})`;
    el.sw.style.opacity = String(Math.sin(Math.PI * sweep) * 0.9);
    el.sw.style.transform = `translateX(${(0.5 - sweep) * 110}vw)`;
    const sh = range(a, 1.5, 2.6);
    el.sheen.style.left = `${-10 + sh * 75}vw`;
    el.sheen.style.opacity = String(Math.sin(Math.PI * sh));
    const tg = easeOut(range(a, 1.3, 2.1));
    el.tag.style.opacity = String(tg); el.tag.style.letterSpacing = `${0.34 + (1 - tg) * 0.3}em`; el.tag.style.filter = `blur(${(1 - tg) * 0.4}vw)`;
    el.line.style.width = `${easeOut(range(a, 1.6, 2.5)) * 30}vw`;
    const c = easeOut(range(a, 2.1, 2.8));
    el.contact.style.opacity = String(c); el.contact.style.transform = `translateY(${(1 - c) * 1.5}vh)`;
    const l = easeOut(range(a, 2.5, 3.2));
    el.loc.style.opacity = String(l); el.loc.style.transform = `translateY(${(1 - l) * 1.5}vh)`;
  } else el.final.style.opacity = '0';
  // ışık sızıntısı (sahne geçişleri)
  const cuts = [7.0, 18.0, 28.0, 38.0, 50.0];
  let lk = 0; for (const c of cuts) lk = Math.max(lk, Math.max(0, 1 - Math.abs(t - c) / 0.35));
  el.leak.style.opacity = String(lk * 0.75);
}
