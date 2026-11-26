// İç mekân setleri: yolcu kabini (öğrenci / VIP), sürücü kokpiti, emniyet kemeri tokası
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, roundRect } from './util.js';
import { drawEmblem, drawLogo, RED } from './logo.js';

const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
function sh(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

function fabricTex(base, stripe) {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    if (stripe) { ctx.fillStyle = stripe; for (let y = 40; y < h; y += 120) ctx.fillRect(0, y, w, 10); }
  }, { repeat: true });
}

function seat(variant) {
  const g = new THREE.Group();
  const vip = variant === 'vip';
  const cover = vip ? new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.42, clearcoat: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0x333333) })
    : std(0xffffff, 0.9, { map: fabricTex('#2b3342', 'rgba(216,20,28,0.55)') });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.14, 0.46, 4, 0.05), cover); base.position.set(0, 0.47, 0); g.add(base);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.70, 0.46, 4, 0.05), cover); back.position.set(-0.24, 0.86, 0); back.rotation.z = 0.14; g.add(back);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.18, 0.34, 4, 0.05), cover); head.position.set(-0.31, 1.30, 0); head.rotation.z = 0.14; g.add(head);
  const accent = new THREE.Mesh(new RoundedBoxGeometry(0.02, vip ? 0.62 : 0.06, vip ? 0.012 : 0.44, 2, 0.005), std(vip ? 0xd8141c : 0xd8141c, 0.5));
  accent.position.set(-0.17, vip ? 0.86 : 1.14, vip ? 0.18 : 0); accent.rotation.z = 0.14; g.add(accent);
  if (vip) { const a2 = accent.clone(); a2.position.z = -0.18; g.add(a2); }
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.3), std(0x2a2b2e, 0.5, { metalness: 0.6 })); leg.position.set(0, 0.2, 0); g.add(leg);
  // kemer (çapraz)
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.62, 0.045), std(0x111111, 0.7)); belt.position.set(-0.165, 0.86, 0.06); belt.rotation.set(0.62, 0, 0.14); g.add(belt);
  const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.08, 0.04, 2, 0.01), std(0x1a1a1a, 0.4)); buckle.position.set(0.05, 0.56, -0.25); g.add(buckle);
  if (vip) { const arm = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.06, 0.06, 2, 0.02), cover); arm.position.set(-0.02, 0.68, 0.24); g.add(arm); }
  g.userData.belt = belt;
  return sh(g);
}

// Kabin: koridor x boyunca, ön +x. sağ duvar +z
export function buildCabin(variant = 'school') {
  const G = new THREE.Group(); G.name = 'cabin-' + variant;
  const vip = variant === 'vip';
  const L = 6.2, Wd = 1.95, Hh = 2.0;
  const floorTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = vip ? '#3b2a1e' : '#3c3f44'; ctx.fillRect(0, 0, w, h);
    if (vip) { for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(0,0,0,${0.12 + (i % 3) * 0.05})`; ctx.fillRect(0, i * 32, w, 2); } }
    else for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, 8, 3); }
  }, { repeat: true });
  floorTex.repeat.set(8, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), std(0xffffff, vip ? 0.35 : 0.8, { map: floorTex })); floor.rotation.x = -Math.PI / 2; floor.position.set(-L / 2 + 0.6, 0, 0); G.add(floor);
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.42), std(vip ? 0x5a1014 : 0x2c2f33, 0.9)); aisle.rotation.x = -Math.PI / 2; aisle.position.set(-L / 2 + 0.6, 0.002, 0.12); G.add(aisle);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), std(vip ? 0x1b1b1d : 0xd7d8d6, 0.8)); ceil.rotation.x = Math.PI / 2; ceil.position.set(-L / 2 + 0.6, Hh, 0); G.add(ceil);
  // tavan led şeritleri
  const ledMat = new THREE.MeshBasicMaterial({ color: vip ? 0xff5a3c : 0xfff6e8 });
  for (const z of [-0.55, 0.62]) { const led = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.4, 0.04), ledMat); led.rotation.x = Math.PI / 2; led.position.set(-L / 2 + 0.6, Hh - 0.01, z); G.add(led); }
  // klima kanalları
  for (const sz of [1, -1]) {
    const duct = new THREE.Mesh(new RoundedBoxGeometry(L, 0.16, 0.30, 3, 0.05), std(vip ? 0x232325 : 0xc9cac8, 0.6)); duct.position.set(-L / 2 + 0.6, Hh - 0.14, sz * 0.78); G.add(sh(duct));
    for (let x = 0.3; x > -L + 0.8; x -= 0.78) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), std(0x555555, 0.4)); v.position.set(x, Hh - 0.225, sz * 0.75); G.add(v); }
  }
  // yan duvarlar (pencere boşluklu)
  const wallMat = std(vip ? 0x262628 : 0xe4e4e2, 0.75);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: canvasTex(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, vip ? '#ffd9a8' : '#eaf3ff'); g.addColorStop(0.55, vip ? '#ffb36b' : '#f8fbff'); g.addColorStop(1, vip ? '#8a6a48' : '#c9d6c2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }) });
  const winY0 = 0.95, winY1 = 1.68;
  for (const sz of [1, -1]) {
    const z = sz * Wd / 2;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(L, winY0, 0.06), wallMat); lower.position.set(-L / 2 + 0.6, winY0 / 2, z); G.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(L, Hh - winY1, 0.06), wallMat); upper.position.set(-L / 2 + 0.6, (Hh + winY1) / 2, z); G.add(upper);
    for (let x = 0.6; x > -L + 0.6; x -= 1.12) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, winY1 - winY0, 0.08), wallMat); p.position.set(x, (winY0 + winY1) / 2, z); G.add(p); }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(L, winY1 - winY0), winMat); win.position.set(-L / 2 + 0.6, (winY0 + winY1) / 2, z + sz * 0.05); win.rotation.y = sz > 0 ? Math.PI : 0; win.castShadow = false; G.add(win);
    if (vip) { // ambiyans led
      const amb = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.025), new THREE.MeshBasicMaterial({ color: 0xff3a2a })); amb.position.set(-L / 2 + 0.6, winY0 - 0.04, z - sz * 0.035); amb.rotation.y = sz > 0 ? Math.PI : 0; G.add(amb);
    }
  }
  sh(G);
  G.children.forEach(c => { if (c.material === winMat) { c.castShadow = false; c.receiveShadow = false; } });
  // arka duvar
  const back = new THREE.Mesh(new THREE.PlaneGeometry(Wd, Hh), wallMat); back.position.set(-L + 0.6, Hh / 2, 0); back.rotation.y = Math.PI / 2; G.add(back);
  const bwin = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), winMat); bwin.position.set(-L + 0.62, 1.4, 0); bwin.rotation.y = Math.PI / 2; G.add(bwin);
  // koltuklar 2+1
  const seats = [];
  for (let i = 0; i < 6; i++) {
    const x = 0.1 - i * 0.86;
    for (const z of vip ? [-0.55, 0.70] : [-0.70, -0.24, 0.66]) {
      const s = seat(variant); s.position.set(x, 0, z); G.add(s); seats.push(s);
    }
  }
  // VIP: masa / perde
  if (vip) {
    const logoTex = canvasTex(512, 512, (ctx, w, h) => { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h); drawEmblem(ctx, w / 2, h / 2, w * 0.38); });
    for (const s of seats) { const hr = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.4 })); hr.position.set(-0.385, 1.31, 0); hr.rotation.set(0, -Math.PI / 2, 0); hr.rotateX(0); s.add(hr); }
  }
  G.userData.seats = seats;
  return G;
}

// Kokpit: direksiyon + gösterge paneli
export function buildCockpit() {
  const G = new THREE.Group(); G.name = 'cockpit';
  const dash = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.35, 2.0, 5, 0.12), std(0x1d1e20, 0.7)); dash.position.set(0.55, 1.0, 0); G.add(dash);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(0.30, 0.12, 0.55, 4, 0.05), std(0x161718, 0.6)); hood.position.set(0.25, 1.22, -0.42); G.add(hood);
  // gösterge kadranları
  const dialTex = canvasTex(1024, 400, (ctx, w, h) => {
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, w, h);
    const dial = (cx, cy, r, max, step, label, red) => {
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r); g.addColorStop(0, '#11151b'); g.addColorStop(1, '#05070a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c9d3dd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, 7); ctx.stroke();
      for (let v = 0; v <= max; v += step / 2) {
        const a = Math.PI * 0.75 + (v / max) * Math.PI * 1.5; const major = v % step === 0;
        ctx.strokeStyle = red && v >= red ? '#ff2a2a' : '#e8eef4'; ctx.lineWidth = major ? 5 : 2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * (major ? 0.80 : 0.86), cy + Math.sin(a) * r * (major ? 0.80 : 0.86)); ctx.lineTo(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93); ctx.stroke();
        if (major) { ctx.fillStyle = '#e8eef4'; ctx.font = `600 ${r * 0.13}px Montserrat`; ctx.textAlign = 'center'; ctx.fillText(String(v), cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66 + r * 0.045); }
      }
      ctx.fillStyle = '#8a96a3'; ctx.font = `500 ${r * 0.1}px Montserrat`; ctx.fillText(label, cx, cy + r * 0.45);
    };
    dial(200, 200, 180, 7, 1, 'x1000 rpm', 5);
    dial(824, 200, 180, 180, 20, 'km/h');
    // orta ekran
    ctx.fillStyle = '#0b1118'; roundRect(ctx, 400, 60, 224, 280, 16); ctx.fill();
    drawEmblem(ctx, 512, 160, 56);
    ctx.fillStyle = '#e8eef4'; ctx.font = '800 26px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('CELEPOĞLU', 512, 260);
    ctx.fillStyle = '#ff3b3b'; ctx.font = '700 15px Montserrat'; ctx.fillText('İYİ YOLCULUKLAR', 512, 292);
  });
  const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.203), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: dialTex, emissiveIntensity: 2.2, roughness: 0.2 }));
  cluster.position.set(0.12, 1.12, -0.42); cluster.rotation.y = -Math.PI / 2; cluster.rotation.x = 0; G.add(cluster);
  cluster.rotateX(-0.25);
  // ibreler
  const needleMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const needles = [];
  for (const [zc] of [[-0.42 + 0.163], [-0.42 - 0.163]]) {
    const piv = new THREE.Group(); piv.position.set(0.11, 1.12, zc); G.add(piv);
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.07, 0.006), needleMat); n.position.y = 0.035; piv.add(n);
    piv.rotation.order = 'YXZ'; needles.push(piv);
  }
  // direksiyon
  const wheel = new THREE.Group(); wheel.position.set(-0.05, 1.02, -0.42); wheel.rotation.z = 0.35; G.add(wheel);
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.5, sheen: 0.5 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 20, 64), leather); rim.rotation.y = Math.PI / 2; wheel.add(rim);
  const hub = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.13, 0.17, 4, 0.03), std(0x1b1c1e, 0.5)); wheel.add(hub);
  const ovalG = new THREE.CircleGeometry(1, 48); ovalG.scale(0.035, 0.015, 1);
  const badge = new THREE.Mesh(ovalG, new THREE.MeshPhysicalMaterial({ color: 0x163a8c, roughness: 0.2, clearcoat: 1 })); badge.position.set(-0.027, 0.0, 0); badge.rotation.y = -Math.PI / 2; wheel.add(badge);
  for (const a of [0, Math.PI * 0.8, -Math.PI * 0.8]) { const sp = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.15, 0.03, 2, 0.01), std(0x202124, 0.5, { metalness: 0.3 })); sp.position.set(0, Math.cos(a) * -0.09, Math.sin(a) * 0.09); sp.rotation.x = -a; wheel.add(sp); }
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 16), std(0x161718, 0.7)); col.rotation.z = Math.PI / 2 - 0.35; col.position.set(0.15, 0.95, -0.42); G.add(col);
  // ön cam (parlak dış)
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 256, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff1d8'); g.addColorStop(0.6, '#ffd8a0'); g.addColorStop(1, '#7c6a52'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }) }));
  ws.position.set(1.1, 1.6, 0); ws.rotation.y = -Math.PI / 2; G.add(ws);
  sh(G); cluster.castShadow = false; ws.castShadow = false;
  G.userData = { needles, wheel };
  return G;
}

// Emniyet kemeri tokası yakın plan
export function buildBuckle() {
  const G = new THREE.Group(); G.name = 'buckle';
  const seatMat = std(0xffffff, 0.9, { map: fabricTex('#2b3342', null) });
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.14, 0.6, 5, 0.06), seatMat); cushion.position.set(0, 0.0, 0); G.add(cushion);
  const backr = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.7, 0.6, 5, 0.06), seatMat); backr.position.set(-0.32, 0.33, 0); backr.rotation.z = 0.12; G.add(backr);
  const housing = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.12, 0.045, 4, 0.012), std(0x0e0e10, 0.35)); housing.position.set(-0.16, 0.14, 0.18); housing.rotation.z = 0.45; G.add(housing);
  const btn = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.035, 0.03, 2, 0.005), std(0xd8141c, 0.35)); btn.position.set(-0.13, 0.16, 0.18); btn.rotation.z = 0.45; G.add(btn);
  const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.045), std(0x111111, 0.7)); anchor.position.set(-0.20, 0.06, 0.18); anchor.rotation.z = 0.45; G.add(anchor);
  // dil (hareketli)
  const tongue = new THREE.Group(); G.add(tongue);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.008, 0.07, 0.035, 2, 0.003), new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.15 })); plate.position.y = -0.035; tongue.add(plate);
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.05, 0.05, 2, 0.008), std(0x141414, 0.45)); grip.position.y = 0.02; tongue.add(grip);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.5, 0.045), std(0x1a1a1a, 0.75)); strap.position.y = 0.29; tongue.add(strap);
  sh(G);
  G.userData = { tongue, housing };
  return G;
}
