// CELEPOĞLU TAŞIMACILIK – 60 sn reklam filmi: sahne kurgusu ve zaman çizelgesi
import * as THREE from 'three';
import { createEngine, buildGround, buildMountains } from './engine.js';
import { buildVan, VAN } from './van.js';
import { buildTown, buildOSB, buildVenue, buildCountry, buildHighway } from './world.js';
import { buildCabin, buildCockpit, buildBuckle } from './interior.js';
import { makePerson, walkAlong, SKIN, HAIR } from './people.js';
import { lerp, clamp, smooth, smoother, easeInOut, easeOut, easeIn, range, rng } from './util.js';
import { setupOverlay, updateOverlay } from './overlay.js';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = Math.round(W * 9 / 16);
export const FPS = 60, DURATION = 60;

if (document.readyState !== 'complete') await new Promise(r => addEventListener('load', r));
await Promise.all(['500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Montserrat`, 'ABCÇĞİÖŞÜabcçğıöşü')));
for (const w of ['500', '700', '800', '900']) if (!document.fonts.check(`${w} 40px Montserrat`, 'CELEPOĞLU')) console.error('FONT YÜKLENEMEDİ', w);
await document.fonts.load('600 40px "Playfair Display"', 'GRAND SALON');

const E = createEngine(W, H, { samples: +(q.get('ms') ?? 0), shadow: 2048, fxaa: true });
const { scene, camera } = E;
setupOverlay(W, H);

// --- dünya ---
const ground = buildGround(); scene.add(ground);
const mountains = buildMountains(); scene.add(mountains);
const Z = { town: buildTown(), osb: buildOSB(), venue: buildVenue(), country: buildCountry(), highway: buildHighway(),
  cabinSchool: buildCabin('school'), cabinVip: buildCabin('vip'), cockpit: buildCockpit(), buckle: buildBuckle() };
for (const k in Z) scene.add(Z[k]);
const INTERIOR = new Set(['cabinSchool', 'cabinVip', 'cockpit', 'buckle']);
function show(zone) {
  for (const k in Z) Z[k].visible = k === zone;
  const out = !INTERIOR.has(zone);
  ground.visible = out; mountains.visible = out;
}
const van = buildVan(); scene.add(van.group);

// --- insanlar ---
const R = rng(77);
function person(o) { const p = makePerson(o); return p; }
// servis durağı: öğrenciler, veliler, rehber personel
const kidsDef = [
  { h: 1.28, shirt: 0xd8141c, pants: 0x2b3a55, backpack: 0x2f6fd0, hair: HAIR[0], hairStyle: 'short', skin: SKIN[0] },
  { h: 1.34, shirt: 0xffffff, pants: 0x2b3040, backpack: 0xe0482a, hair: HAIR[3], hairStyle: 'pony', skin: SKIN[2] },
  { h: 1.22, shirt: 0x6fa0d8, pants: 0x34405a, backpack: 0xf2b134, hair: HAIR[1], hairStyle: 'short', skin: SKIN[1] },
  { h: 1.38, shirt: 0xf2efe6, pants: 0x2a2f3a, backpack: 0x2f9a6a, hair: HAIR[4], hairStyle: 'long', skin: SKIN[4] },
];
const kids = kidsDef.map(d => person({ ...d, kid: true, sleeves: 'long' }));
const mom = person({ h: 1.66, shirt: 0xc9a27a, pants: 0x3b3f4a, hair: HAIR[3], hairStyle: 'long', skin: SKIN[2], jacket: 0x8a6c55, shirtFront: false });
const dad = person({ h: 1.80, shirt: 0xdfe6ee, pants: 0x2d3340, hair: HAIR[0], skin: SKIN[1], jacket: 0x2f3b4c, shirtFront: true });
const hostess = person({ h: 1.68, shirt: 0xffffff, pants: 0x15161a, jacket: 0xb3121a, hair: HAIR[1], hairStyle: 'bun', skin: SKIN[0] });
for (const p of [...kids, mom, dad, hostess]) Z.town.add(p.root);
// OSB işçileri
const workers = [];
for (let i = 0; i < 6; i++) {
  const w = person({ h: 1.70 + R() * 0.14, shirt: [0x2f4a6e, 0x3a3f47, 0x29466b][i % 3], pants: 0x1f2b3d, vest: i % 2 ? 0xff7a00 : 0xd8f000, helmet: i % 3 === 0 ? 0xffffff : null, hair: HAIR[i % 5], skin: SKIN[(i + 1) % 5], cap: i % 3 === 1 ? 0x1f2b3d : null });
  workers.push(w); Z.osb.add(w.root);
}
// VIP yolcular ve sürücü
const vipP = [
  person({ h: 1.82, jacket: 0x16181c, shirt: 0xffffff, pants: 0x16181c, tie: 0x6b0f14, hair: HAIR[0], skin: SKIN[1] }),
  person({ h: 1.68, dress: 0x7a0f17, shirt: 0x7a0f17, pants: 0x7a0f17, hair: HAIR[0], hairStyle: 'long', skin: SKIN[2], sleeves: 'long' }),
  person({ h: 1.78, jacket: 0x2a2f3a, shirt: 0xf2f2f2, pants: 0x2a2f3a, tie: 0x1c2f55, hair: HAIR[2], skin: SKIN[0] }),
  person({ h: 1.64, dress: 0x101214, shirt: 0x101214, pants: 0x101214, hair: HAIR[3], hairStyle: 'bun', skin: SKIN[4], sleeves: 'long' }),
];
const vipDriver = person({ h: 1.80, jacket: 0x0e0f12, shirt: 0xffffff, pants: 0x0e0f12, tie: 0xb3121a, hair: HAIR[0], skin: SKIN[1] });
for (const p of [...vipP, vipDriver]) Z.venue.add(p.root);
// Sürücü (kontrol)
const driver = person({ h: 1.78, shirt: 0xffffff, pants: 0x15161a, tie: 0xb3121a, jacket: null, hair: HAIR[0], skin: SKIN[3], sleeves: 'short' });
Z.highway.add(driver.root);
// Kabinde oturan öğrenciler
const seated = [];
{
  const seats = Z.cabinSchool.userData.seats;
  const pick = [0, 1, 2, 3, 5, 6, 8, 9, 10, 11, 13];
  pick.forEach((si, i) => {
    const d = kidsDef[i % 4];
    const p = person({ ...d, kid: true, h: d.h - 0.02 * (i % 3), backpack: null, shirt: [0xd8141c, 0xffffff, 0x6fa0d8, 0xf2efe6, 0x2f6e4a][i % 5], hair: HAIR[i % 5], skin: SKIN[i % 5] });
    const s = seats[si];
    p.root.position.set(s.position.x - 0.02, 0, s.position.z); p.pose({ sit: true, seatH: 0.56 });
    // kemer
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }));
    belt.position.set(0.095 * p.s, 0.2 * p.h, 0); belt.rotation.set(0.75, 0, 0); p.spine.add(belt);
    Z.cabinSchool.add(p.root); seated.push(p);
  });
}

// --- yardımcılar ---
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function hand(t, a = 1, f = 1) { // el kamerası titreşimi
  return V3(Math.sin(t * 1.3 * f + 1) * 0.6 + Math.sin(t * 2.9 * f) * 0.3, Math.sin(t * 1.7 * f + 2) * 0.5 + Math.sin(t * 3.7 * f) * 0.2, Math.sin(t * 1.1 * f + 4) * 0.5).multiplyScalar(a);
}
function cam(pos, look, fov = 35, up = null) {
  camera.position.copy(pos); camera.fov = fov; camera.up.set(0, 1, 0); if (up) camera.up.copy(up);
  camera.lookAt(look); camera.updateProjectionMatrix();
}
// yavaşlayarak durma: stop zamanında hız 0, ivme a
function decelS(t, tStop, sStop, a) { if (t >= tStop) return sStop; const d = tStop - t; return sStop - 0.5 * a * d * d; }
function placeVan(x, z, heading, s, extra = {}) {
  van.group.position.set(x, 0, z); van.group.rotation.set(0, heading, 0);
  van.update({ s, steer: 0, door: 0, lights: 0, brake: 0, pitch: 0, roll: 0, drl: 4, ...extra });
}

// --- ışık ön ayarları ---
const P = {
  dawn: { sunElev: 2.5, sunAz: 100, turbidity: 9, rayleigh: 2.6, mie: 0.006, mieG: 0.88, sunColor: 0xffa860, sunInt: 2.4, hemiSky: 0xa8b8dc, hemiGround: 0x6a5240, hemiInt: 1.1, fog: 0xd2ad8c, fogDensity: 0.00018, exposure: 0.5, envInt: 1.0, temp: 0.35, sat: 1.06, contrast: 1.06, flare: 1.0, bloom: 0.45, bloomThr: 0.85, lift: [0.015, 0.01, 0.02] },
  morning: { sunElev: 24, sunAz: 28, turbidity: 4, rayleigh: 1.6, mie: 0.004, mieG: 0.8, sunColor: 0xffe6c8, sunInt: 2.2, hemiSky: 0xbfd2f2, hemiGround: 0x7a6a56, hemiInt: 1.15, fog: 0xc9d6e2, fogDensity: 0.00014, exposure: 0.36, envInt: 1.0, temp: 0.2, sat: 1.04, contrast: 1.05, flare: 0.3, bloom: 0.3, bloomThr: 0.9 },
  industrial: { sunElev: 36, sunAz: 22, turbidity: 3.5, rayleigh: 1.3, mie: 0.004, mieG: 0.8, sunColor: 0xfff1de, sunInt: 2.3, hemiSky: 0xbccde8, hemiGround: 0x6f6a62, hemiInt: 1.15, fog: 0xc6d3df, fogDensity: 0.00013, exposure: 0.33, envInt: 1.0, temp: -0.05, sat: 1.0, contrast: 1.1, flare: 0.0, bloom: 0.25, bloomThr: 0.92 },
  golden: { sunElev: 7, sunAz: -78, turbidity: 7, rayleigh: 2.4, mie: 0.006, mieG: 0.86, sunColor: 0xffb46a, sunInt: 2.5, hemiSky: 0xa8b6d4, hemiGround: 0x6c5844, hemiInt: 1.05, fog: 0xd8b48e, fogDensity: 0.00018, exposure: 0.44, envInt: 1.0, temp: 0.45, sat: 1.08, contrast: 1.08, flare: 0.8, bloom: 0.45, bloomThr: 0.82 },
  sunset: { sunElev: 3.2, sunAz: -95, turbidity: 10, rayleigh: 3.0, mie: 0.007, mieG: 0.9, sunColor: 0xff9a4a, sunInt: 2.7, hemiSky: 0x97a6c8, hemiGround: 0x5a4636, hemiInt: 1.0, fog: 0xd49a72, fogDensity: 0.0002, exposure: 0.5, envInt: 1.0, temp: 0.55, sat: 1.1, contrast: 1.1, flare: 1.1, bloom: 0.5, bloomThr: 0.8, lift: [0.02, 0.008, 0.012] },
  interiorDay: { sunElev: 28, sunAz: 15, turbidity: 3, rayleigh: 1.5, mie: 0.004, mieG: 0.8, sunColor: 0xfff0dc, sunInt: 3.2, hemiSky: 0xf2efe8, hemiGround: 0x6a6460, hemiInt: 0.9, fog: 0x000000, fogDensity: 0, exposure: 0.55, envInt: 0.6, skyVisible: false, background: 0x101214, temp: 0.15, sat: 1.0, contrast: 1.06, flare: 0, bloom: 0.35, bloomThr: 0.85 },
  interiorVip: { sunElev: 14, sunAz: 40, turbidity: 6, rayleigh: 2.2, mie: 0.005, mieG: 0.85, sunColor: 0xffb36a, sunInt: 3.0, hemiSky: 0xb09080, hemiGround: 0x3a2a26, hemiInt: 1.1, fog: 0x000000, fogDensity: 0, exposure: 0.8, envInt: 0.5, skyVisible: false, background: 0x0c0a09, temp: 0.4, sat: 1.08, contrast: 1.1, flare: 0, bloom: 0.55, bloomThr: 0.75 },
  macro: { sunElev: 18, sunAz: -60, turbidity: 6, rayleigh: 2, mie: 0.005, mieG: 0.85, sunColor: 0xffc58a, sunInt: 3.2, hemiSky: 0x8a8e98, hemiGround: 0x3a3430, hemiInt: 0.9, fog: 0x000000, fogDensity: 0, exposure: 0.6, envInt: 0.7, skyVisible: false, background: 0x0a0b0d, temp: 0.3, sat: 1.05, contrast: 1.12, flare: 0, bloom: 0.5, bloomThr: 0.8 },
};

// --- çekimler (global zaman) ---
const SHOTS = [];
function shot(t0, t1, zone, preset, fn) { SHOTS.push({ t0, t1, zone, preset, fn }); }

// ===== SAHNE 1: GÜVENLE BAŞLAYAN BİR SABAH (0–7) =====
shot(0, 3.6, 'town', 'dawn', (lt, t) => {
  const p = smoother(lt / 3.6);
  const vx = -70 + t * 9;
  placeVan(vx, 2.5, 0, vx, { lights: 1 });
  const pos = V3(lerp(-205, -120, p), lerp(62, 34, p), lerp(46, 26, p)).add(hand(t, 0.25, 0.6));
  const pitch = THREE.MathUtils.degToRad(lerp(-9, -12, p));
  const yaw = THREE.MathUtils.degToRad(lerp(-14, -6, p));
  const dir = V3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw));
  cam(pos, pos.clone().addScaledVector(dir, 300), 40);
  return { sun: { elev: 3.6 + lt * 0.3 }, focus: V3(-30, 0, 0), shadow: 180 };
});
shot(3.6, 7.0, 'town', 'dawn', (lt, t) => {
  const p = smoother(lt / 3.4);
  const vx = 30 + lt * 3.2;
  placeVan(vx, 2.5, 0, vx, { lights: 1 });
  const dist = lerp(11, 4.6, p);
  const pos = V3(vx + dist, lerp(0.85, 1.75, easeIn(p) * 0.6 + p * 0.4), 2.5 + lerp(-2.6, -0.7, p)).add(hand(t, 0.012, 1.4));
  const look = V3(vx + lerp(2.6, 3.1, p), lerp(1.25, 1.12, p), 2.5 + lerp(-0.4, 0, p));
  cam(pos, look, lerp(34, 30, p));
  return { sun: { elev: 3.4 + lt * 0.3 }, focus: V3(vx, 0, 2.5), shadow: 14, sunOverride: { flare: 0, exposure: 0.4, bloom: 0.35, bloomThr: 0.95, envInt: 0.8 } };
});

// ===== SAHNE 2: ÖĞRENCİ TAŞIMACILIĞI (7–18) =====
const S2 = 7.0, STOP = 2.6, DOOR0 = 2.95, DOOR1 = 3.75;
const stopX = 8.0 - 0.85; // kapı ortası x=8
const kidWait = [[6.6, 6.9], [7.5, 7.4], [9.2, 6.8], [10.0, 7.5]];
const kidStart = [3.9, 4.75, 5.7, 6.65];
function townPeople(tau) {
  // tau: sahne 2 başlangıcından itibaren süre
  kids.forEach((k, i) => {
    const t0 = S2 + 0 + kidStart[i] - S2; // sahne içi başlangıç
    const w = kidWait[i];
    if (tau < kidStart[i]) {
      k.root.position.set(w[0], 0.16, w[1]); k.root.rotation.y = Math.atan2(-(3.2 - w[1]), 8 - w[0]) * 0.6 + Math.PI * -0.1 * (i % 2);
      k.pose({ look: 0.2 * Math.sin(tau * 0.7 + i) });
      k.root.visible = true;
      return;
    }
    const lt = tau - kidStart[i];
    const door = [8.0 + (i % 2 ? 0.15 : -0.15), 4.15];
    const d1 = Math.hypot(door[0] - w[0], door[1] - w[1]);
    const sp = 1.15;
    if (lt * sp < d1) { walkAlong(k, w, door, lt, sp, 1.0); k.root.position.y = 0.16 * (1 - range(lt * sp, d1 - 0.6, d1)) + 0.0; }
    else {
      const l2 = lt - d1 / sp; // basamak + içeri
      walkAlong(k, door, [door[0], 2.4], l2, 0.9, 1.0);
      k.root.position.y = lerp(0.0, 0.42, easeOut(range(l2, 0.1, 0.7)));
    }
    k.root.visible = true;
  });
  // anne el sallıyor, baba yanında
  mom.root.position.set(10.9, 0.16, 7.35); mom.root.rotation.y = Math.atan2(-(3.0 - 7.35), 8.0 - 10.9) ;
  mom.root.rotation.y = -Math.atan2(3.0 - 7.35, 8.0 - 10.9);
  const waving = range(tau, 5.4, 5.9);
  mom.pose({ wave: waving, waveT: tau });
  dad.root.position.set(11.8, 0.16, 7.8); dad.root.rotation.y = -Math.atan2(3.0 - 7.8, 7.0 - 11.8);
  dad.pose({ hold: 0.2 });
  // rehber personel kapıdan iner
  const hs = range(tau, 3.6, 4.4);
  hostess.root.visible = tau > 3.55;
  if (tau < 4.4) { walkAlong(hostess, [8.95, 2.9], [9.15, 4.6], (tau - 3.6), 2.2, 1.0); hostess.root.position.y = lerp(0.42, 0.0, easeIn(hs)); }
  else { hostess.root.position.set(9.15, 0.0, 4.6); hostess.root.rotation.y = Math.PI * 0.95; hostess.pose({ welcome: range(tau, 4.5, 5.0) * 0.8, look: 0.3 }); }
}
function vanS2(tau) {
  const s = decelS(tau, STOP, stopX, 2.6);
  const decel = tau < STOP ? 1 : 0;
  const settle = tau >= STOP ? Math.exp(-(tau - STOP) * 4) * Math.cos((tau - STOP) * 11) : 1;
  placeVan(s, 2.55, 0, s, { door: smoother(range(tau, DOOR0, DOOR1)), brake: tau > -1 ? 1 : 0, pitch: -0.012 * settle, lights: 0 });
}
shot(7.0, 9.8, 'town', 'morning', (lt, t) => {
  const tau = t - S2; vanS2(tau); townPeople(tau);
  const p = smooth(lt / 2.8);
  cam(V3(lerp(21.5, 20.0, p), 1.3, lerp(7.9, 7.7, p)).add(hand(t, 0.01)), V3(lerp(2.5, 5.8, p), 1.3, lerp(2.6, 3.6, p)), 36);
  return { focus: V3(8, 0, 4), shadow: 22 };
});
shot(9.8, 12.8, 'town', 'morning', (lt, t) => {
  const tau = t - S2; vanS2(tau); townPeople(tau);
  const p = smooth(lt / 3.0);
  cam(V3(lerp(5.0, 6.4, p), 1.5, lerp(8.3, 8.15, p)).add(hand(t, 0.01)), V3(lerp(7.4, 8.2, p), 1.25, 3.4), 47);
  return { focus: V3(8, 0, 5), shadow: 16 };
});
shot(12.8, 15.4, 'town', 'morning', (lt, t) => {
  const tau = t - S2; vanS2(tau); townPeople(tau);
  const p = smooth(lt / 2.6);
  cam(V3(lerp(1.6, 2.4, p), lerp(1.55, 1.5, p), lerp(4.7, 4.9, p)).add(hand(t, 0.008)), V3(lerp(10.0, 10.6, p), 1.3, lerp(6.2, 6.6, p)), lerp(34, 30, p));
  return { focus: V3(9, 0, 6), shadow: 12 };
});
shot(15.4, 18.0, 'cabinSchool', 'interiorDay', (lt, t) => {
  const p = smooth(lt / 2.6);
  van.group.visible = false;
  cam(V3(lerp(0.95, 0.35, p), lerp(1.42, 1.36, p), 0.13).add(hand(t, 0.005)), V3(-4.5, 0.95, lerp(-0.25, -0.05, p)), 50);
  return { focus: V3(-2, 0, 0), shadow: 5 };
});

// ===== SAHNE 3: PERSONEL TAŞIMACILIĞI (18–28) =====
const S3 = 18.0;
const wStart = [[58.6, 23.5], [57.2, 25.5], [59.4, 27.2], [56.8, 29.5], [58.9, 31.0], [57.6, 33.0]];
function workersAt(tau) {
  workers.forEach((w, i) => {
    const start = wStart[i];
    const door = [58.0 + (i % 2 ? 0.15 : -0.15), 7.0];
    const delay = i * 0.55 - 0.8;
    const lt = tau - delay;
    if (lt < 0) { w.root.position.set(start[0], 0, start[1]); w.root.rotation.y = -Math.PI / 2; w.pose({}); w.root.visible = true; return; }
    const d1 = Math.hypot(door[0] - start[0], door[1] - start[1]);
    const sp = 1.45;
    if (lt * sp < d1) { walkAlong(w, start, door, lt, sp, 1.5); w.root.position.y = 0; }
    else { const l2 = lt - d1 / sp; walkAlong(w, door, [door[0], 5.4], l2, 1.0, 1.2); w.root.position.y = lerp(0, 0.42, easeOut(range(l2, 0.05, 0.6))); }
    w.root.visible = true;
  });
}
shot(18.0, 21.0, 'osb', 'industrial', (lt, t) => {
  const tau = t - S3;
  placeVan(57.15, 5.25, 0, 57.15, { door: 1 });
  workersAt(tau + 2.2);
  const p = smooth(lt / 3);
  cam(V3(lerp(75, 73, p), lerp(1.9, 1.8, p), lerp(15.5, 14.5, p)).add(hand(t, 0.015)), V3(lerp(55.5, 56.5, p), 1.7, lerp(8.0, 8.8, p)), 40);
  return { focus: V3(58, 0, 10), shadow: 30 };
});
function vanS3(t) { // 21'den sonra sürüş
  const tau = t - 21.0;
  const v = 11.5; const s = 70 + tau * v + 0.5 * 0.6 * tau * tau;
  return s;
}
shot(21.0, 24.6, 'osb', 'industrial', (lt, t) => {
  const s = vanS3(t);
  placeVan(s, 5.25, 0, s);
  workersAt(30);
  const p = smoother(lt / 3.6);
  const h = lerp(46, 30, p);
  const ang = lerp(0.0, 0.55, p);
  const pos = V3(s + lerp(-6, 6, p), h, 5.25 + Math.sin(ang) * h * 0.8);
  cam(pos, V3(s + 2.5, 0, 5.25), 38, V3(0, 0, -1));
  return { focus: V3(s, 0, 5), shadow: 60 };
});
shot(24.6, 28.0, 'osb', 'industrial', (lt, t) => {
  const s = vanS3(t);
  placeVan(s, 5.25, 0, s);
  workersAt(30);
  const p = smooth(lt / 3.4);
  cam(V3(s + lerp(-1.2, 0.9, p), lerp(1.3, 1.6, p), 13.4).add(hand(t, 0.03, 1.5)), V3(s + lerp(-0.6, 0.6, p), 1.35, 5.25), 36);
  return { focus: V3(s, 0, 5.25), shadow: 18 };
});

// ===== SAHNE 4: VIP VE ÖZEL TAŞIMACILIK (28–38) =====
const S4 = 28.0;
function vipAt(tau) {
  const starts = [[-0.45, 23.0], [0.45, 23.6], [-0.4, 25.4], [0.4, 26.0]];
  vipP.forEach((pp, i) => {
    const st = starts[i];
    const door = [0.0 + (i % 2 ? 0.18 : -0.18), 4.25];
    const delay = i * 0.75;
    const lt = tau - delay + 6.4;
    const d1 = Math.hypot(door[0] - st[0], door[1] - st[1]);
    const sp = 1.25;
    if (lt < 0) { pp.root.position.set(st[0], 0.2, st[1]); pp.root.rotation.y = -Math.PI / 2; pp.pose({}); return; }
    if (lt * sp < d1) { walkAlong(pp, st, door, lt, sp, 1.4); pp.root.position.y = 0.2 * (1 - range(st[1] - (pp.root.position.z), st[1] - 5.2, st[1] - 4.6)); pp.root.position.y = pp.root.position.z > 4.6 ? 0.23 : 0.0; }
    else { const l2 = lt - d1 / sp; walkAlong(pp, door, [door[0], 2.8], l2, 0.9, 1.2); pp.root.position.y = lerp(0, 0.42, easeOut(range(l2, 0.05, 0.6))); }
  });
  vipDriver.root.position.set(1.75, 0.0, 4.55); vipDriver.root.rotation.y = Math.PI * 0.80;
  vipDriver.pose({ welcome: 0.55 + 0.25 * smooth(range(tau, 0.2, 0.9)) });
}
shot(28.0, 31.2, 'venue', 'golden', (lt, t) => {
  const tau = t - S4;
  placeVan(-0.85, 2.4, 0, 0, { door: 1 });
  vipAt(tau);
  const p = smooth(lt / 3.2);
  cam(V3(lerp(1.0, 0.7, p), lerp(1.8, 1.7, p), lerp(25.0, 23.6, p)).add(hand(t, 0.01)), V3(lerp(-0.3, -0.7, p), 1.15, 3.6), 32);
  return { focus: V3(0, 0, 10), shadow: 22 };
});
shot(31.2, 34.2, 'cabinVip', 'interiorVip', (lt, t) => {
  van.group.visible = false;
  const p = smooth(lt / 3.0);
  cam(V3(lerp(0.85, 0.15, p), lerp(1.45, 1.38, p), lerp(0.30, 0.18, p)).add(hand(t, 0.004)), V3(-3.6, 0.82, lerp(-0.75, -0.45, p)), 48);
  return { focus: V3(-2, 0, 0), shadow: 5 };
});
const curve = Z.country.userData.curve; const CL = curve.getLength();
function countryVan(t) {
  const u0 = 0.40; const s = u0 * CL + (t - 34.2) * 15;
  const u = s / CL; const p = curve.getPointAt(u), tg = curve.getTangentAt(u);
  const side = V3(-tg.z, 0, tg.x); // sağ
  const pos = p.clone().addScaledVector(side, 2.1);
  const heading = Math.atan2(-tg.z, tg.x);
  // direksiyon: eğrilik
  const tg2 = curve.getTangentAt(Math.min(1, u + 0.004));
  const steer = clamp(Math.atan2(-(tg2.z), tg2.x) - heading, -0.3, 0.3) * 2.5;
  placeVan(pos.x, pos.z, heading, s, { steer, roll: -steer * 0.03 });
  return { pos, tg, side, heading };
}
shot(34.2, 38.0, 'country', 'golden', (lt, t) => {
  const { pos, tg, side } = countryVan(t);
  const p = smoother(lt / 3.8);
  const back = lerp(26, 11, p), up = lerp(16, 3.2, p), right = lerp(-10, 7.5, p);
  const cpos = pos.clone().addScaledVector(tg, -back).addScaledVector(side, right); cpos.y = up;
  cam(cpos.add(hand(t, 0.05, 0.8)), pos.clone().add(V3(0, 1.3, 0)).addScaledVector(tg, 2), lerp(40, 34, p));
  return { focus: pos, shadow: 30, sunOverride: { sunAz: -50, sunElev: 13 } };
});

// ===== SAHNE 5: GÜVEN VE PROFESYONELLİK (38–50) =====
const PARK = V3(0, 0, -21);
shot(38.0, 40.4, 'highway', 'sunset', (lt, t) => {
  placeVan(PARK.x, PARK.z, Math.PI, 0, { lights: 0 });
  driver.root.position.set(-2.05, 0, -19.15); driver.root.rotation.y = Math.PI / 2 + 0.25;
  driver.pose({ crouch: 1 });
  driver.arms[0].elbow.rotation.z = 0.35 + 0.08 * Math.sin(t * 2.5);
  const p = smooth(lt / 2.4);
  cam(V3(lerp(-4.6, -4.0, p), lerp(0.55, 0.62, p), lerp(-17.0, -17.4, p)).add(hand(t, 0.006)), V3(-2.35, 0.48, -19.95), lerp(34, 30, p));
  return { focus: V3(-2, 0, -20), shadow: 8, sunOverride: { sunElev: 9 } };
});
shot(40.4, 41.6, 'highway', 'sunset', (lt, t) => {
  placeVan(PARK.x, PARK.z, Math.PI, 0, { drl: 6 * smooth(range(lt, 0.2, 0.55)), lights: 0.9 * smooth(range(lt, 0.45, 0.8)) });
  driver.root.visible = false;
  const p = smooth(lt / 1.2);
  cam(V3(lerp(-4.15, -3.95, p), 1.13, lerp(-19.0, -19.25, p)).add(hand(t, 0.003)), V3(-3.45, 1.04, -20.15), 30);
  return { focus: V3(-3, 0, -20), shadow: 6, sunOverride: { sunElev: 5, sunAz: -31, flare: 0, exposure: 0.34, bloom: 0.45, bloomThr: 0.97, envInt: 0.7 } };
});
shot(41.6, 42.9, 'cockpit', 'macro', (lt, t) => {
  van.group.visible = false;
  const nd = Z.cockpit.userData.needles;
  const sweep = Math.sin(Math.PI * clamp(lt / 1.1)) ;
  for (const n of nd) n.rotation.set(0, 0, 0);
  // ibre: kadran düzleminde dönüş (x ekseni etrafında) – kadran -x yönüne bakar
  nd[0].rotation.set(-2.36 + 4.2 * sweep, 0, 0); nd[1].rotation.set(-2.36 + 4.4 * sweep, 0, 0);
  const p = smooth(lt / 1.3);
  cam(V3(lerp(-0.50, -0.42, p), lerp(1.36, 1.33, p), lerp(-0.22, -0.27, p)), V3(0.12, 1.11, -0.43), 36);
  return { focus: V3(0, 1, -0.4), shadow: 2 };
});
shot(42.9, 44.2, 'buckle', 'macro', (lt, t) => {
  van.group.visible = false;
  const { tongue, housing } = Z.buckle.userData;
  const a = V3(-Math.sin(0.45), Math.cos(0.45), 0);
  const d = lerp(0.30, 0.088, easeInOut(range(lt, 0.1, 0.78)));
  const click = range(lt, 0.78, 0.86);
  tongue.position.copy(housing.position).addScaledVector(a, d - 0.004 * Math.sin(click * Math.PI));
  tongue.rotation.set(0, 0, 0.45);
  const p = smooth(lt / 1.3);
  cam(V3(lerp(0.12, 0.08, p), lerp(0.30, 0.27, p), lerp(0.52, 0.46, p)), V3(-0.15, 0.17, 0.18), 34);
  return { focus: V3(-0.1, 0.1, 0.1), shadow: 1 };
});
function hwVan(t, t0, x0, v) { const s = x0 - (t - t0) * v; placeVan(s, -3.0, Math.PI, -s, { lights: 0.9 }); return s; }
shot(44.2, 47.2, 'highway', 'sunset', (lt, t) => {
  driver.root.visible = false;
  const s = hwVan(t, 44.2, 260, 16);
  const p = smooth(lt / 3.0);
  cam(V3(s - lerp(13, 9.5, p), lerp(0.75, 1.0, p), -3.0 + lerp(2.2, 1.2, p)).add(hand(t, 0.03, 1.2)), V3(s - 1.0, 1.2, -3.0), 30);
  return { focus: V3(s, 0, -3), shadow: 16 };
});
shot(47.2, 50.0, 'highway', 'sunset', (lt, t) => {
  const s = hwVan(t, 44.2, 260, 16);
  const p = smoother(lt / 2.8);
  const ang = lerp(-1.25, -0.25, p);
  const r = lerp(8.5, 11, p);
  const c = V3(s, 0, -3.0);
  cam(V3(c.x + Math.cos(ang) * r * 1.0 + lerp(0, 6, p), lerp(1.2, 1.9, p), c.z + Math.sin(ang) * r).add(hand(t, 0.03, 1.2)), V3(s - lerp(1, 6, p), 1.3, -3.0), 34);
  return { focus: c, shadow: 18 };
});

// ===== SAHNE 6: KURUMSAL FİNAL (50–60) =====
shot(50.0, 60.0, 'highway', 'sunset', (lt, t) => {
  driver.root.visible = false;
  placeVan(PARK.x, PARK.z, Math.PI, 0, { lights: 0.8 });
  const p = easeInOut(clamp(lt / 5.6));
  const phi = THREE.MathUtils.degToRad(lerp(150, -30, p));
  const r = lerp(9.6, 10.8, p);
  const c = V3(PARK.x, 1.15, PARK.z);
  cam(V3(c.x + Math.cos(phi) * r, lerp(1.45, 2.1, p), c.z + Math.sin(phi) * r), c.clone().add(V3(lerp(-0.6, 0.4, p), 0, 0)), 36);
  return { focus: V3(PARK.x, 0, PARK.z), shadow: 12, sunOverride: { sunElev: 2.6 } };
});

// --- kare render ---
let lastPreset = null;
function setup(t) {
  const s = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  show(s.zone);
  van.group.visible = true;
  for (const p of [hostess]) p.root.visible = true;
  driver.root.visible = true;
  const r = s.fn(t - s.t0, t) || {};
  const preset = { ...P[s.preset] };
  if (r.sun) preset.sunElev = r.sun.elev;
  if (r.sunOverride) Object.assign(preset, r.sunOverride);
  E.setSky(preset);
  E.aimSun(r.focus || V3(0, 0, 0), r.shadow || 30, Math.max(60, (r.shadow || 30) * 3));
  return s;
}
window.renderAt = (frame) => {
  const t = frame / FPS;
  setup(t);
  // geçişler
  const cuts = [7.0, 18.0, 28.0, 38.0, 50.0];
  let flash = 0; for (const c of cuts) flash = Math.max(flash, Math.max(0, 1 - Math.abs(t - c) / 0.22) * 0.55);
  let fade = 0;
  if (t < 1.4) fade = 1 - smooth(t / 1.4);
  if (t > 55.0) fade = smooth((t - 55.0) / 0.75);
  E.render(frame, { fade, flash });
  updateOverlay(t);
};
window.duration = DURATION; window.fps = FPS;
window.ready = true;
