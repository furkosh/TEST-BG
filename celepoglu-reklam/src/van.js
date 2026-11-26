// Beyaz yüksek tavanlı 19+1 minibüs modeli (prosedürel). Ön +x, üst +y, sağ taraf +z.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, roundRect, blobTexture } from './util.js';
import { drawLogo, logoAspect, RED, BLACK } from './logo.js';

const BT = 0.06; // bevel
const HALF = 0.97 + BT; // yan yüzey z
export const VAN = { length: 6.76, wheelR: 0.37, frontAxle: 2.35, rearAxle: -1.98, halfWidth: HALF };

function bodyPath(p) {
  // p: {moveTo, lineTo, absarc, quadraticCurveTo} uyumlu (THREE.Shape ya da canvas adaptörü)
  p.moveTo(-3.30, 0.42);
  p.lineTo(-2.43, 0.42);
  p.absarc(-1.98, 0.42, 0.45, Math.PI, 0, true);
  p.lineTo(1.90, 0.42);
  p.absarc(2.35, 0.42, 0.45, Math.PI, 0, true);
  p.lineTo(3.30, 0.42);
  p.quadraticCurveTo(3.40, 0.44, 3.40, 0.60);
  p.lineTo(3.37, 1.10);
  p.quadraticCurveTo(3.35, 1.24, 3.12, 1.27);
  p.lineTo(2.62, 1.38);
  p.quadraticCurveTo(2.56, 1.40, 2.52, 1.45);
  p.lineTo(1.78, 2.38);
  p.quadraticCurveTo(1.62, 2.62, 1.20, 2.68);
  p.lineTo(-3.18, 2.70);
  p.quadraticCurveTo(-3.35, 2.70, -3.35, 2.55);
  p.lineTo(-3.35, 0.55);
  p.quadraticCurveTo(-3.35, 0.42, -3.30, 0.42);
}

// --- Kaplama (livery) canvas'ı ---
const X0 = -3.42, X1 = 3.46, Y0 = 0.38, Y1 = 2.76, PPM = 620;
const CW = Math.round((X1 - X0) * PPM), CH = Math.round((Y1 - Y0) * PPM);

function liveryCanvas(side, { clearDoor = false } = {}) {
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');
  const X = (x) => side === 'right' ? (x - X0) * PPM : (X1 - x) * PPM;
  const Y = (y) => (Y1 - y) * PPM;
  // gövde siluetine kırp
  ctx.save();
  ctx.beginPath();
  bodyPath({
    moveTo: (x, y) => ctx.moveTo(X(x), Y(y)), lineTo: (x, y) => ctx.lineTo(X(x), Y(y)),
    quadraticCurveTo: (a, b, x, y) => ctx.quadraticCurveTo(X(a), Y(b), X(x), Y(y)),
    absarc: (cx, cy, r, a0, a1, cw) => {
      const n = 24; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ctx.lineTo(X(cx + Math.cos(a) * r), Y(cy + Math.sin(a) * r)); }
    },
  });
  ctx.closePath(); ctx.clip();
  const pt = (x, y) => [X(x), Y(y)];
  // arka bölümde logodaki kavisle uyumlu kırmızı / siyah kavisler
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(...pt(-0.95, 0.46));
  ctx.quadraticCurveTo(...pt(-2.4, 0.50), ...pt(-3.40, 1.00));
  ctx.lineTo(...pt(-3.40, 1.45));
  ctx.quadraticCurveTo(...pt(-2.5, 0.85), ...pt(-0.95, 0.46));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.moveTo(...pt(-1.10, 0.50));
  ctx.quadraticCurveTo(...pt(-2.55, 0.93), ...pt(-3.40, 1.53));
  ctx.lineTo(...pt(-3.40, 1.61));
  ctx.quadraticCurveTo(...pt(-2.58, 0.99), ...pt(-1.10, 0.50));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(...pt(-1.25, 0.56));
  ctx.quadraticCurveTo(...pt(-2.62, 1.04), ...pt(-3.40, 1.68));
  ctx.lineTo(...pt(-3.40, 1.72));
  ctx.quadraticCurveTo(...pt(-2.64, 1.07), ...pt(-1.25, 0.56));
  ctx.closePath(); ctx.fill();
  // ana logo (firma logosu, büyük)
  const lxa = -1.32, lxb = 1.68, ltop = 1.49;
  const lhM = (lxb - lxa) / logoAspect();
  drawLogo(ctx, Math.min(X(lxa), X(lxb)), Y(ltop), lhM * PPM, 'light');
  ctx.textAlign = 'center';
  // web adresi (arka bölüm)
  ctx.font = `700 ${0.105 * PPM}px Montserrat`; ctx.letterSpacing = `${0.01 * PPM}px`;
  ctx.fillStyle = BLACK;
  ctx.fillText('www.celepogluturizm.com', (X(-3.1) + X(-1.35)) / 2, Y(1.30));
  ctx.textAlign = 'left';
  // kapı fugaları
  ctx.strokeStyle = 'rgba(60,62,66,0.85)'; ctx.lineWidth = 0.008 * PPM;
  const line = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(...pt(x0, y0)); ctx.lineTo(...pt(x1, y1)); ctx.stroke(); };
  line(1.44, 0.47, 1.44, 2.40); // ön kapı arka kenarı
  line(2.52, 1.42, 2.58, 0.92);
  const handle = (x, y) => { ctx.fillStyle = '#3a3c40'; roundRect(ctx, Math.min(X(x), X(x + 0.16)), Y(y + 0.03), 0.16 * PPM, 0.045 * PPM, 0.02 * PPM); ctx.fill(); };
  handle(1.50, 1.30);
  if (side === 'right') {
    if (clearDoor) {
      ctx.clearRect(Math.min(X(0.30), X(1.40)), Y(2.44), 1.10 * PPM, (2.44 - 0.47) * PPM);
    } else {
      line(0.30, 0.47, 0.30, 2.44); line(1.40, 0.47, 1.40, 2.44); line(0.30, 0.47, 1.40, 0.47);
      handle(0.36, 1.28);
    }
  }
  ctx.restore();
  return c;
}

function roundedShape(x0, y0, x1, y1, r) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

let MATS;
function mats() {
  if (MATS) return MATS;
  const treadTex = canvasTex(2048, 256, (ctx, w, h) => {
    ctx.fillStyle = '#888'; ctx.fillRect(0, 0, w, h);
    const n = 72;
    for (let i = 0; i < n; i++) {
      const x = i * w / n;
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(x + 3, h * 0.31, w / n * 0.62, h * 0.17);
      ctx.fillRect(x + 3 + w / n * 0.3, h * 0.52, w / n * 0.62, h * 0.17);
      ctx.fillStyle = '#333'; ctx.fillRect(x, h * 0.485, w / n, h * 0.03);
    }
  }, { srgb: false, repeat: true });
  MATS = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xdedfdd, roughness: 0.34, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.0 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.62, metalness: 0.0 }),
    blackGloss: new THREE.MeshPhysicalMaterial({ color: 0x0c0d0f, roughness: 0.25, clearcoat: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x07090c, roughness: 0.04, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02, envMapIntensity: 1.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.07 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xd2d6da, metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide }),
    tire: new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: 0.88, bumpMap: treadTex, bumpScale: 2.0, side: THREE.DoubleSide }),
    lampHousing: new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, metalness: 0.6, roughness: 0.12, clearcoat: 1 }),
    drl: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4 }),
    beam: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 0 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x5a0000, emissive: 0xff1208, emissiveIntensity: 0.6, roughness: 0.2 }),
    amber: new THREE.MeshStandardMaterial({ color: 0x8a5000, emissive: 0xff8a00, emissiveIntensity: 0.0, roughness: 0.2 }),
    oval: new THREE.MeshPhysicalMaterial({ color: 0x163a8c, metalness: 0.3, roughness: 0.18, clearcoat: 1 }),
    liner: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.9, side: THREE.DoubleSide }),
  };
  return MATS;
}

function decalMat(tex, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, depthWrite: false, ...extra });
}

function makeWheel(dual, M) {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const prof = [[0.205, -0.105], [0.30, -0.119], [0.345, -0.116], [0.366, -0.10], [0.373, -0.06], [0.373, 0.06], [0.366, 0.10], [0.345, 0.116], [0.30, 0.119], [0.205, 0.105]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tireGeo = new THREE.LatheGeometry(prof, 72); tireGeo.rotateX(Math.PI / 2);
  M.tire.bumpMap.repeat.set(1, 1);
  const tire = new THREE.Mesh(tireGeo, M.tire); tire.castShadow = true; spin.add(tire);
  if (dual) { const t2 = tire.clone(); t2.position.z = -0.25; spin.add(t2); }
  // jant
  const rimProf = [[0.0, 0.035], [0.07, 0.035], [0.13, 0.02], [0.17, 0.0], [0.198, 0.02], [0.207, 0.085], [0.21, 0.10]].map(([r, y]) => new THREE.Vector2(r, dual ? y - 0.05 : y));
  const rimGeo = new THREE.LatheGeometry(rimProf, 64); rimGeo.rotateX(Math.PI / 2);
  spin.add(new THREE.Mesh(rimGeo, M.rim));
  // jant kapağı
  const capTex = canvasTex(512, 512, (ctx, w, h) => {
    const gr = ctx.createRadialGradient(w * 0.45, h * 0.4, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(0.7, '#b9bec4'); gr.addColorStop(1, '#8a9096');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#25282c';
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(i * Math.PI / 4);
      roundRect(ctx, w * 0.20, -w * 0.045, w * 0.20, w * 0.09, w * 0.03); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = '#3b4046'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.12, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9ced3'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.07, 0, 7); ctx.fill();
  });
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.19, 48), new THREE.MeshStandardMaterial({ map: capTex, metalness: 0.7, roughness: 0.3 }));
  cap.position.z = dual ? 0.03 : 0.075; spin.add(cap);
  return { g, spin };
}

export function buildVan() {
  const M = mats();
  const root = new THREE.Group(); root.name = 'van';
  const body = new THREE.Group(); root.add(body);

  // gövde
  const shape = new THREE.Shape(); bodyPath(shape);
  let geo = new THREE.ExtrudeGeometry(shape, { depth: 2 * 0.97, bevelEnabled: true, bevelThickness: BT, bevelSize: BT, bevelSegments: 6, curveSegments: 40 });
  geo.translate(0, 0, -0.97);
  geo = toCreasedNormals(geo, 0.75);
  const shell = new THREE.Mesh(geo, M.paint); shell.castShadow = true; shell.receiveShadow = true; body.add(shell);

  // çamurluk iç kaplamaları
  for (const ax of [VAN.frontAxle, VAN.rearAxle]) {
    const lg = new THREE.CylinderGeometry(0.385, 0.385, 2.0, 32, 1, true, -Math.PI / 2, Math.PI);
    lg.rotateX(-Math.PI / 2);
    const l = new THREE.Mesh(lg, M.liner); l.position.set(ax, 0.42, 0); body.add(l);
  }

  // yan camlar
  const bandShapes = (side) => {
    const shapes = [];
    if (side === 'right') { shapes.push(roundedShape(-3.12, 1.55, 0.26, 2.40, 0.07)); }
    else shapes.push(roundedShape(-3.12, 1.55, 1.40, 2.40, 0.07));
    const fw = new THREE.Shape(); fw.moveTo(1.44, 1.55); fw.lineTo(2.32, 1.55); fw.lineTo(1.71, 2.32); fw.lineTo(1.44, 2.32); fw.closePath();
    shapes.push(fw);
    // B direği siyah
    shapes.push(roundedShape(1.37, 1.55, 1.48, 2.40, 0.01));
    return shapes;
  };
  for (const side of ['right', 'left']) {
    const sg = new THREE.ShapeGeometry(bandShapes(side));
    const m = new THREE.Mesh(sg, M.glass);
    m.position.z = side === 'right' ? HALF + 0.004 : -HALF - 0.004;
    if (side === 'left') m.scale.z = -1;
    body.add(m);
    // cam bölme çizgileri
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    const seamsX = side === 'right' ? [-2.05, -0.92] : [-2.05, -0.92, 0.22];
    for (const sx of seamsX) {
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.85), seamMat);
      sm.position.set(sx, 1.975, side === 'right' ? HALF + 0.006 : -HALF - 0.006);
      if (side === 'left') sm.rotation.y = Math.PI;
      body.add(sm);
    }
  }

  // kaplama
  const texR = new THREE.CanvasTexture(liveryCanvas('right', { clearDoor: true })); texR.colorSpace = THREE.SRGBColorSpace; texR.anisotropy = 16;
  const texL = new THREE.CanvasTexture(liveryCanvas('left')); texL.colorSpace = THREE.SRGBColorSpace; texL.anisotropy = 16;
  const pw = X1 - X0, ph = Y1 - Y0;
  const decR = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), decalMat(texR));
  decR.position.set((X0 + X1) / 2, (Y0 + Y1) / 2, HALF + 0.002); body.add(decR);
  const decL = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), decalMat(texL));
  decL.rotation.y = Math.PI; decL.position.set((X0 + X1) / 2, (Y0 + Y1) / 2, -HALF - 0.002); body.add(decL);

  // sürgülü kapı (sağ)
  const fullR = liveryCanvas('right');
  const dx0 = 0.30, dx1 = 1.40, dy0 = 0.47, dy1 = 2.44;
  const doorCanvas = document.createElement('canvas');
  doorCanvas.width = Math.round((dx1 - dx0) * PPM); doorCanvas.height = Math.round((dy1 - dy0) * PPM);
  doorCanvas.getContext('2d').drawImage(fullR, (dx0 - X0) * PPM, (Y1 - dy1) * PPM, doorCanvas.width, doorCanvas.height, 0, 0, doorCanvas.width, doorCanvas.height);
  const doorTex = new THREE.CanvasTexture(doorCanvas); doorTex.colorSpace = THREE.SRGBColorSpace; doorTex.anisotropy = 16;
  const door = new THREE.Group();
  const dpaint = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0, dy1 - dy0), M.paint);
  dpaint.position.set((dx0 + dx1) / 2, (dy0 + dy1) / 2, 0); door.add(dpaint);
  const ddec = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0, dy1 - dy0), decalMat(doorTex));
  ddec.position.set((dx0 + dx1) / 2, (dy0 + dy1) / 2, 0.001); door.add(ddec);
  const dglass = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(dx0 + 0.04, 1.55, dx1 - 0.03, 2.40, 0.05)), M.glass);
  dglass.position.z = 0.003; door.add(dglass);
  const dthick = new THREE.Mesh(new THREE.BoxGeometry(dx1 - dx0, dy1 - dy0, 0.04), M.paint);
  dthick.position.set((dx0 + dx1) / 2, (dy0 + dy1) / 2, -0.021); door.add(dthick);
  door.position.z = HALF + 0.0035;
  body.add(door);
  // kapı açıklığı (iç mekan)
  const holeTex = canvasTex(512, 900, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2c2f35'); g.addColorStop(0.6, '#15171b'); g.addColorStop(1, '#0d0e10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,245,225,0.55)'; ctx.fillRect(w * 0.1, h * 0.02, w * 0.8, h * 0.012);
    // koltuklar
    for (let i = 0; i < 2; i++) {
      const x = w * (0.08 + i * 0.5);
      ctx.fillStyle = '#23324a'; roundRect(ctx, x, h * 0.30, w * 0.36, h * 0.30, 18); ctx.fill();
      ctx.fillStyle = '#2d3f5c'; roundRect(ctx, x - 8, h * 0.56, w * 0.42, h * 0.08, 12); ctx.fill();
      ctx.fillStyle = RED; ctx.fillRect(x + w * 0.04, h * 0.33, w * 0.28, h * 0.02);
    }
    ctx.fillStyle = '#5b5f66'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = '#e8c21a'; ctx.fillRect(0, h * 0.86, w, h * 0.012);
    ctx.fillStyle = '#3a3d42'; ctx.fillRect(0, h * 0.70, w, h * 0.16);
  });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0 - 0.02, dy1 - dy0 - 0.02), new THREE.MeshStandardMaterial({ map: holeTex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  hole.position.set((dx0 + dx1) / 2, (dy0 + dy1) / 2, HALF + 0.001); hole.visible = false; body.add(hole);
  // basamak
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.22), M.black); step.position.set((dx0 + dx1) / 2, 0.45, HALF - 0.05); body.add(step);

  // ön cam + silecekler
  {
    const d = new THREE.Vector2(-0.74, 0.93).normalize(); const n = new THREE.Vector2(d.y, -d.x);
    const c = new THREE.Vector2(2.15, 1.915).addScaledVector(n, 0.066);
    const pts = []; const hw = 0.93, hs = 0.56;
    for (const [ss, zz] of [[-hs, -hw], [-hs, hw], [hs, hw], [hs, -hw]]) pts.push(c.x + d.x * ss, c.y + d.y * ss, zz);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
    if (g.attributes.normal.getX(0) < 0) { g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); }
    const ws = new THREE.Mesh(g, M.glass); body.add(ws);
    for (const zz of [-0.42, 0.40]) {
      const wp = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.025, 0.78, 2, 0.008), M.black);
      wp.position.set(c.x + d.x * -0.50 + n.x * 0.02, c.y + d.y * -0.50 + n.y * 0.02, zz); wp.rotation.z = 0.25; wp.rotation.y = 0.12; body.add(wp);
    }
  }
  // ön ızgara
  const grilleTex = canvasTex(1024, 384, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(w * 0.03, 0); ctx.lineTo(w * 0.97, 0); ctx.lineTo(w * 0.88, h); ctx.lineTo(w * 0.12, h); ctx.closePath();
    ctx.fillStyle = '#0d0e10'; ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 9; i++) { const y = h * (0.06 + i * 0.105); const gr = ctx.createLinearGradient(0, y, 0, y + h * 0.05); gr.addColorStop(0, '#3a3e44'); gr.addColorStop(1, '#16181b'); ctx.fillStyle = gr; ctx.fillRect(0, y, w, h * 0.05); }
    ctx.restore();
    ctx.lineWidth = 10; ctx.strokeStyle = '#2b2e33';
    ctx.beginPath(); ctx.moveTo(w * 0.03, 4); ctx.lineTo(w * 0.97, 4); ctx.lineTo(w * 0.88, h - 4); ctx.lineTo(w * 0.12, h - 4); ctx.closePath(); ctx.stroke();
  });
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.42), new THREE.MeshPhysicalMaterial({ map: grilleTex, transparent: true, roughness: 0.35, clearcoat: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  grille.rotation.y = Math.PI / 2; grille.rotation.x = 0; grille.position.set(3.452, 0.86, 0);
  grille.rotateX(0); body.add(grille);
  // oval amblem (yazısız)
  const ovalG = new THREE.CircleGeometry(1, 64); ovalG.scale(0.105, 0.043, 1);
  const oval = new THREE.Mesh(ovalG, M.oval); oval.rotation.y = Math.PI / 2; oval.position.set(3.462, 0.995, 0); body.add(oval);
  const ringG = new THREE.RingGeometry(0.92, 1.0, 64); ringG.scale(0.112, 0.048, 1);
  const ring = new THREE.Mesh(ringG, M.chrome); ring.rotation.y = Math.PI / 2; ring.position.set(3.464, 0.995, 0); body.add(ring);
  const ovalHi = new THREE.Mesh(ovalG.clone().scale(0.8, 0.45, 1), new THREE.MeshPhysicalMaterial({ color: 0x2f5bc0, transparent: true, opacity: 0.35, roughness: 0.1 }));
  ovalHi.rotation.y = Math.PI / 2; ovalHi.position.set(3.465, 1.005, 0); body.add(ovalHi);

  // farlar
  const lamps = [];
  for (const sz of [1, -1]) {
    const hs = new THREE.Shape();
    hs.moveTo(0.56, 0.93); hs.lineTo(0.95, 0.95); hs.quadraticCurveTo(1.0, 0.96, 1.0, 1.02); hs.lineTo(0.99, 1.14); hs.lineTo(0.62, 1.10); hs.quadraticCurveTo(0.56, 1.09, 0.56, 1.03); hs.closePath();
    const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 });
    hg.rotateY(-Math.PI / 2); // şekil (z,y) düzlemi -> x yönüne derinlik
    const h = new THREE.Mesh(hg, M.lampHousing);
    h.position.set(3.45, 0, 0); if (sz < 0) h.scale.z = -1;
    body.add(h);
    // LED gündüz farı (L şeklinde)
    const d1 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.016, 0.36, 2, 0.006), M.drl);
    d1.position.set(3.468, 1.105, sz * 0.80); d1.rotation.x = sz * 0.10; body.add(d1);
    const d2 = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.09, 0.016, 2, 0.006), M.drl);
    d2.position.set(3.468, 1.06, sz * 0.975); body.add(d2);
    // projektör mercekleri
    for (const lz of [0.70, 0.86]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.034, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.chrome);
      lens.rotation.z = -Math.PI / 2; lens.position.set(3.455, 1.025, sz * lz); body.add(lens);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.026, 24), M.beam); glow.rotation.y = Math.PI / 2; glow.position.set(3.49, 1.025, sz * lz); body.add(glow);
      lamps.push(glow);
    }
  }
  // ön tampon
  const fb = new THREE.Mesh(new RoundedBoxGeometry(0.30, 0.27, 2.08, 4, 0.06), M.black); fb.position.set(3.33, 0.55, 0); fb.castShadow = true; body.add(fb);
  const fbTrim = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 1.2, 2, 0.02), M.blackGloss); fbTrim.position.set(3.48, 0.60, 0); body.add(fbTrim);
  for (const sz of [1, -1]) {
    const fog = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), M.chrome); fog.rotation.y = Math.PI / 2; fog.position.set(3.483, 0.52, sz * 0.82); body.add(fog);
  }
  // plaka (ön) - marka plakası
  const plateTex = canvasTex(1040, 220, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbfb'; roundRect(ctx, 0, 0, w, h, 16); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#111'; roundRect(ctx, 4, 4, w - 8, h - 8, 14); ctx.stroke();
    ctx.fillStyle = '#1c3faa'; roundRect(ctx, 8, 8, 110, h - 16, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 60px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('TR', 63, h * 0.78);
    ctx.fillStyle = '#111'; ctx.font = '800 118px Montserrat'; ctx.fillText('CELEPOĞLU', 575, h * 0.73);
  });
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), plateMat); plate.rotation.y = Math.PI / 2; plate.position.set(3.484, 0.48, 0); body.add(plate);
  // kaput logosu
  {
    const tex = canvasTex(1400, 330, (ctx, w, h) => { const lw = drawLogo(ctx, 0, 0, h * 0.94, 'light', { measureOnly: true }); drawLogo(ctx, (w - lw) / 2, h * 0.03, h * 0.94, 'light'); });
    const g = new THREE.PlaneGeometry(0.84, 0.198);
    g.rotateY(Math.PI / 2);
    const ang = Math.atan2(0.977, 0.214);
    g.rotateZ(ang - 0);
    const m = new THREE.Mesh(g, decalMat(tex));
    // eğim: kaput normali (0.214,0.977)
    m.geometry.rotateZ(0);
    m.position.set(2.884, 1.389, 0);
    body.add(m);
  }
  // aynalar
  for (const sz of [1, -1]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.20, 2, 0.02), M.black); arm.position.set(2.18, 1.72, sz * 1.12); body.add(arm);
    const hous = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.36, 0.20, 3, 0.04), M.black); hous.position.set(2.16, 1.86, sz * 1.25); hous.castShadow = true; body.add(hous);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.30), M.chrome); mir.rotation.y = -Math.PI / 2; mir.position.set(2.10, 1.87, sz * 1.25); body.add(mir);
    const ind = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.03, 0.12, 2, 0.01), M.amber); ind.position.set(2.215, 1.78, sz * 1.27); body.add(ind);
  }
  // tavan kliması
  const ac = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.2, 1.36, 4, 0.07), new THREE.MeshPhysicalMaterial({ color: 0xe9eaeb, roughness: 0.45, clearcoat: 0.5 }));
  ac.position.set(-0.7, 2.83, 0); ac.castShadow = true; body.add(ac);
  const acGrill = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshStandardMaterial({ color: 0x9a9da1, roughness: 0.7 }));
  acGrill.rotation.x = -Math.PI / 2; acGrill.position.set(-0.7, 2.932, 0); body.add(acGrill);
  const hatch = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.06, 0.6, 2, 0.02), M.blackGloss); hatch.position.set(-2.4, 2.75, 0); body.add(hatch);
  // arka
  const rx = -3.35 - BT - 0.003;
  for (const sz of [1, -1]) {
    const rw = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(0.07, 1.62, 0.90, 2.42, 0.06)), M.glass);
    rw.rotation.y = -Math.PI / 2; rw.position.set(rx, 0, 0); if (sz < 0) rw.scale.x = -1;
    body.add(rw);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.80, 0.13, 3, 0.025), M.tail); tl.position.set(-3.40, 1.42, sz * 0.94); body.add(tl);
  }
  const hm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.04, 0.5, 2, 0.01), M.tail); hm.position.set(-3.415, 2.60, 0); body.add(hm);
  const rseam = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 2.1), new THREE.MeshStandardMaterial({ color: 0x3a3c40, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  rseam.rotation.y = -Math.PI / 2; rseam.position.set(rx, 1.55, 0); body.add(rseam);
  {
    const tex = canvasTex(1600, 520, (ctx, w, h) => {
      const lw = drawLogo(ctx, 0, 0, h * 0.62, 'light', { measureOnly: true });
      drawLogo(ctx, (w - lw) / 2, h * 0.02, h * 0.62, 'light');
      ctx.font = `700 ${h * 0.12}px Montserrat`; ctx.fillStyle = BLACK; ctx.textAlign = 'center';
      ctx.fillText('www.celepogluturizm.com', w / 2, h * 0.86);
    });
    const g = new THREE.PlaneGeometry(1.5, 0.4875); g.rotateY(-Math.PI / 2);
    const m = new THREE.Mesh(g, decalMat(tex)); m.position.set(rx - 0.001, 1.18, 0); body.add(m);
  }
  const rb = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.24, 2.06, 4, 0.05), M.black); rb.position.set(-3.38, 0.53, 0); rb.castShadow = true; body.add(rb);
  const rstep = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 1.0), M.black); rstep.position.set(-3.47, 0.44, 0); body.add(rstep);

  // tekerlekler
  const wheels = [];
  for (const [x, dual] of [[VAN.frontAxle, false], [VAN.rearAxle, true]]) {
    for (const sz of [1, -1]) {
      const w = makeWheel(dual, M);
      w.g.position.set(x, VAN.wheelR, sz * (dual ? 0.86 : 0.85));
      if (sz < 0) w.g.rotation.y = Math.PI;
      root.add(w.g);
      wheels.push({ ...w, front: !dual, side: sz });
    }
  }

  // temas gölgesi
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.4), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.9 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.renderOrder = -1; root.add(blob);

  const api = {
    group: root, body, door, hole, wheels, blob,
    state: { s: 0, steer: 0, door: 0, lights: 0, brake: 0, pitch: 0, roll: 0 },
    update(st) {
      Object.assign(this.state, st);
      const S = this.state;
      for (const w of wheels) {
        w.spin.rotation.z = (w.side > 0 ? -1 : 1) * S.s / VAN.wheelR;
        if (w.front) w.g.rotation.y = (w.side > 0 ? 0 : Math.PI) + S.steer;
      }
      // sürgülü kapı: önce dışa, sonra geriye
      const d = S.door;
      const out = Math.min(1, d / 0.25);
      const back = Math.max(0, (d - 0.15) / 0.85);
      door.position.z = HALF + 0.0035 + 0.085 * Math.sin(out * Math.PI / 2);
      door.position.x = -1.18 * (back * back * (3 - 2 * back));
      hole.visible = d > 0.001;
      M.beam.emissiveIntensity = 6 * S.lights;
      M.tail.emissiveIntensity = 0.6 + 2.4 * S.brake + 0.8 * S.lights;
      M.drl.emissiveIntensity = S.drl !== undefined ? S.drl : 4;
      body.rotation.z = S.pitch; body.rotation.x = S.roll;
    },
  };
  api.update({});
  return api;
}

// Basit iç mekan sahnesi için renkler ihraç edilir
export { mats as vanMaterials };
