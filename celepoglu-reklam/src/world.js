// Mekânlar: Tire şehir merkezi, servis durağı, OSB, davet mekânı, zeytinlik yolu, gün batımı yolu
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, rng, fbm, noise2, noiseFill, roundRect } from './util.js';
import { drawEmblem, drawLogo, RED } from './logo.js';

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
function shadowy(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }

// ---------- dokular ----------
let _asphalt;
function asphaltTex() {
  if (_asphalt) return _asphalt;
  _asphalt = canvasTex(512, 512, (ctx, w, h) => {
    const r = rng(7);
    noiseFill(ctx, w, h, (x, y) => { const n = 0.82 + 0.10 * noise2(x * 0.02, y * 0.02) + (r() - 0.5) * 0.28; const v = 58 * n; return [v, v * 1.01, v * 1.04]; });
  }, { repeat: true });
  return _asphalt;
}
// yol çizgileri dokusu: genişlik w metre, tekrar boyu 12 m
function roadMarkTex(lanes, edge = true, dashed = true, double = false) {
  return canvasTex(512, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(240,240,232,0.92)';
    const lw = w * 0.018;
    if (edge) { ctx.fillRect(w * 0.025, 0, lw, h); ctx.fillRect(w * 0.975 - lw, 0, lw, h); }
    for (let i = 1; i < lanes; i++) {
      const x = w * i / lanes - lw / 2;
      if (double && i === lanes / 2) { ctx.fillRect(x - lw, 0, lw * 0.9, h); ctx.fillRect(x + lw, 0, lw * 0.9, h); }
      else if (dashed) ctx.fillRect(x, 0, lw, h * 0.45);
      else ctx.fillRect(x, 0, lw, h);
    }
  }, { repeat: true });
}

export function makeRoad(length, width, { lanes = 2, edge = true, dashed = true, double = false, markRepeat = 12 } = {}) {
  const g = new THREE.Group();
  const asp = asphaltTex().clone(); asp.needsUpdate = true; asp.repeat.set(width / 4, length / 4);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshStandardMaterial({ map: asp, roughness: 0.86, color: 0xffffff }));
  base.rotation.x = -Math.PI / 2; base.receiveShadow = true; g.add(base);
  const mt = roadMarkTex(lanes, edge, dashed, double); mt.repeat.set(1, length / markRepeat);
  const marks = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshStandardMaterial({ map: mt, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  marks.rotation.x = -Math.PI / 2; marks.position.y = 0.005; marks.receiveShadow = true; g.add(marks);
  g.position.y = 0.02;
  return g;
}

// eğri yol şeridi
export function makeRoadRibbon(curve, width, { segments = 400, lanes = 2, double = false } = {}) {
  const L = curve.getLength();
  const pos = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), tng = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments; curve.getPointAt(u, p); curve.getTangentAt(u, tng);
    side.crossVectors(tng, up).normalize();
    for (const s of [-1, 1]) { pos.push(p.x + side.x * s * width / 2, p.y + 0.02, p.z + side.z * s * width / 2); uv.push((s + 1) / 2, u * L); }
    if (i < segments) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  // normal yukarı baksın
  const n = geo.attributes.normal; if (n.getY(0) < 0) { idx.reverse(); geo.setIndex(idx); geo.computeVertexNormals(); }
  const g = new THREE.Group();
  const asp = asphaltTex().clone(); asp.needsUpdate = true; asp.repeat.set(width / 4, 1 / 4);
  const base = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: asp, roughness: 0.86 })); base.receiveShadow = true; g.add(base);
  const mt = roadMarkTex(lanes, true, true, double); mt.repeat.set(1, 1 / 12);
  const marks = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: mt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  marks.receiveShadow = true; g.add(marks);
  return g;
}

// ---------- bina cephesi materyali (instanced, yerel koordinatlı pencere deseni) ----------
function facadeTex(kind) {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const r = rng(kind === 'factory' ? 5 : 11);
    if (kind === 'factory') {
      for (let x = 0; x < w; x += 16) { ctx.fillStyle = x % 32 ? '#e9ecef' : '#cfd4d9'; ctx.fillRect(x, 0, 8, h); }
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(0, h * 0.93, w, h * 0.07);
      return;
    }
    noiseFill(ctx, w, h, (x, y) => { const v = 238 + (r() - 0.5) * 14; return [v, v, v * 0.99]; });
    // pencere
    const wx = w * 0.28, wy = h * 0.26, ww = w * 0.44, wh = h * 0.50;
    ctx.fillStyle = '#d9d6d0'; ctx.fillRect(wx - 10, wy - 10, ww + 20, wh + 26);
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#5e7389'); g.addColorStop(1, '#2b3846');
    ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#eeeeea'; ctx.fillRect(wx + ww / 2 - 4, wy, 8, wh); ctx.fillRect(wx, wy + wh * 0.35, ww, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + ww * 0.3, wy); ctx.lineTo(wx, wy + wh * 0.5); ctx.fill();
    ctx.fillStyle = '#bdb8b0'; ctx.fillRect(wx - 16, wy + wh + 8, ww + 32, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, h - 10, w, 10);
  }, { repeat: true });
}
function facadeMaterial(kind = 'house', cell = [3.2, 3.0]) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const tex = facadeTex(kind);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.facadeMap = { value: tex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vLN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 isc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLP = (position + vec3(0.5)) * isc; vLN = normal;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D facadeMap; varying vec3 vLP; varying vec3 vLN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (abs(vLN.y) > 0.5) { diffuseColor.rgb *= vec3(0.80, 0.78, 0.75); }
        else { vec2 fuv = abs(vLN.x) > 0.5 ? vLP.zy : vLP.xy; diffuseColor.rgb *= texture2D(facadeMap, fuv / vec2(${cell[0].toFixed(2)}, ${cell[1].toFixed(2)})).rgb; diffuseColor.rgb *= mix(0.58, 1.0, smoothstep(0.0, 2.8, vLP.y)); }`);
  };
  return m;
}

function instanced(geo, material, list, { color = null, cast = true } = {}) {
  const im = new THREE.InstancedMesh(geo, material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((it, i) => {
    e.set(0, it.ry || 0, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...it.s));
    im.setMatrixAt(i, m);
    if (it.c !== undefined) im.setColorAt(i, new THREE.Color(it.c));
  });
  im.castShadow = cast; im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

// yapraklı taç materyali: dünya koordinatlı gürültü ile yaprak kümeleri, ışık-gölge kırılımı, taç altı karartma
let _fol;
function foliageMaterial() {
  if (_fol) return _fol;
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFP; varying float vLY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vFP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vLY = position.y;');
    const noise = `
      float fh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float fn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFP; varying float vLY;' + noise)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        vec3 nq = vec3(fn3(vFP * 3.1), fn3(vFP * 3.1 + 11.7), fn3(vFP * 3.1 + 5.3)) - 0.5;
        normal = normalize(normal + nq * 1.25);`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float fl = fn3(vFP * 1.6) * 0.55 + fn3(vFP * 4.7) * 0.45;
        diffuseColor.rgb *= (0.50 + 0.85 * fl) * mix(0.55, 1.05, smoothstep(-0.9, 0.7, vLY));`);
  };
  _fol = m; return m;
}

// ağaçlar
function trees(list, { kind = 'round' } = {}) {
  const g = new THREE.Group();
  const trunks = [], crowns = [], cyp = [], olives = [];
  for (const t of list) {
    if (t.kind === 'cypress') { trunks.push({ p: [t.x, 0.6, t.z], s: [0.25, 1.2, 0.25] }); cyp.push({ p: [t.x, t.h * 0.55, t.z], s: [t.r, t.h, t.r], c: t.c ?? 0x2f4a2a }); }
    else if (t.kind === 'olive') { trunks.push({ p: [t.x, 0.8, t.z], s: [0.35, 1.6, 0.35] }); olives.push({ p: [t.x, 2.3 * t.k, t.z], s: [2.0 * t.k, 1.45 * t.k, 2.0 * t.k], ry: t.ry ?? 0, c: t.c ?? 0x7d8a5f }); }
    else { trunks.push({ p: [t.x, t.h * 0.3, t.z], s: [0.3, t.h * 0.6, 0.3] }); crowns.push({ p: [t.x, t.h * 0.72, t.z], s: [t.r, t.r * 1.05, t.r], ry: t.ry ?? 0, c: t.c ?? 0x4c6b34 }); }
  }
  const trunkG = new THREE.CylinderGeometry(0.5, 0.7, 1, 5);
  if (trunks.length) g.add(instanced(trunkG, lam(0x5a4636), trunks));
  const makeCrown = (detail) => {
    let cg = new THREE.IcosahedronGeometry(1, detail);
    cg.deleteAttribute('normal'); cg.deleteAttribute('uv'); cg = mergeVertices(cg);
    const p = cg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + noise2(x * 2.1, y * 2.1 + z) * 0.20 + noise2(x * 5.3 + 3, z * 5.3 - y) * 0.07; p.setXYZ(i, x * k, y * k, z * k); }
    cg.computeVertexNormals(); return cg;
  };
  const fol = foliageMaterial();
  if (crowns.length) g.add(instanced(makeCrown(2), fol, crowns));
  if (olives.length) { g.add(instanced(makeCrown(1), fol, olives)); }
  const cypG = new THREE.SphereGeometry(1, 14, 12); cypG.scale(0.5, 0.5, 0.5);
  if (cyp.length) g.add(instanced(cypG, fol, cyp));
  return g;
}

// park halindeki basit arabalar
function cars(list) {
  const g = new THREE.Group();
  const body = new RoundedBoxGeometry(4.3, 0.75, 1.8, 3, 0.18);
  const cab = new RoundedBoxGeometry(2.2, 0.6, 1.62, 3, 0.2);
  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16); wheel.rotateX(Math.PI / 2);
  const bl = [], cl = [], wl = [];
  for (const c of list) {
    const ry = c.ry || 0; const cs = Math.cos(ry), sn = Math.sin(ry);
    const at = (dx, dz) => [c.x + dx * cs + dz * sn, 0, c.z - dx * sn + dz * cs];
    bl.push({ p: [c.x, 0.68, c.z], s: [1, 1, 1], ry, c: c.c });
    const a = at(-0.25, 0); cl.push({ p: [a[0], 1.27, a[2]], s: [1, 1, 1], ry, c: 0x1c2228 });
    for (const [dx, dz] of [[1.35, 0.82], [1.35, -0.82], [-1.35, 0.82], [-1.35, -0.82]]) { const w = at(dx, dz); wl.push({ p: [w[0], 0.33, w[2]], s: [1, 1, 1], ry }); }
  }
  g.add(instanced(body, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.4 }), bl));
  g.add(instanced(cab, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.5 }), cl));
  g.add(instanced(wheel, lam(0x141414), wl));
  return g;
}

function lampPosts(list) {
  const g = new THREE.Group();
  const pole = new THREE.CylinderGeometry(0.07, 0.1, 8, 8); pole.translate(0, 4, 0);
  const arm = new THREE.BoxGeometry(1.6, 0.08, 0.08); arm.translate(0.8, 7.9, 0);
  const head = new RoundedBoxGeometry(0.6, 0.12, 0.28, 2, 0.04); head.translate(1.55, 7.85, 0);
  const pl = list.map(l => ({ p: [l.x, 0, l.z], s: [1, 1, 1], ry: l.ry || 0 }));
  g.add(instanced(pole, lam(0x5d6166), pl)); g.add(instanced(arm, lam(0x5d6166), pl)); g.add(instanced(head, lam(0x3a3d42), pl));
  return g;
}

// ---------- 1) TİRE ŞEHİR MERKEZİ ----------
export function buildTown() {
  const G = new THREE.Group(); G.name = 'town';
  const r = rng(21);
  // ana cadde (x boyunca)
  const main = makeRoad(1200, 10, { lanes: 2, dashed: true }); main.rotation.y = Math.PI / 2; G.add(main);
  // kaldırımlar
  const paveTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b9b4aa'; ctx.fillRect(0, 0, w, h);
    const rr = rng(4);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 175 + rr() * 30; ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`; ctx.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  }, { repeat: true });
  for (const sz of [1, -1]) {
    const t = paveTex.clone(); t.needsUpdate = true; t.repeat.set(1200 / 1.2, 3.5 / 1.2);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(1200, 0.16, 3.5), new THREE.MeshLambertMaterial({ map: t }));
    sw.position.set(0, 0.08, sz * 6.75); sw.receiveShadow = true; G.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(1200, 0.18, 0.2), lam(0xd8d6d0)); curb.position.set(0, 0.09, sz * 5.05); curb.receiveShadow = true; G.add(curb);
  }
  // ara sokaklar
  const crossX = [];
  for (let x = -490; x <= 490; x += 70) crossX.push(x);
  for (const x of crossX) { const rd = makeRoad(600, 8, { lanes: 2, dashed: false, edge: false }); rd.position.set(x, -0.005, 0); G.add(rd); }
  const rowsZ = [-235, -165, -95, 95, 165, 235];
  for (const z of rowsZ) { const rd = makeRoad(1000, 8, { lanes: 2, dashed: false, edge: false }); rd.rotation.y = Math.PI / 2; rd.position.set(0, -0.006, z); G.add(rd); }
  // binalar
  const houses = [], roofs = [], tanks = [], panels = [];
  const blocksZ = [[8.5, 91], [99, 161], [169, 231], [-91, -8.5], [-161, -99], [-231, -169]];
  const wallCols = [0xf4f1ea, 0xefe6d6, 0xf1e2cc, 0xe8ddd0, 0xf6efe3, 0xe9d6c2, 0xdedbd3];
  for (let bi = 0; bi < crossX.length - 1; bi++) {
    const xa = crossX[bi] + 4.5, xb = crossX[bi + 1] - 4.5;
    for (const [za, zb] of blocksZ) {
      // blok çevresine binalar
      const edges = [];
      const mainFront = Math.abs(za) < 10 || Math.abs(zb) < 10;
      for (let x = xa + 0.5; x < xb - 6; ) {
        const w = 3.2 * (2 + Math.floor(r() * 3)) + 0.2;
        if (x + w > xb) break;
        const d = 9 + r() * 4;
        const floors = mainFront ? 3 + Math.floor(r() * 3) : 2 + Math.floor(r() * 3);
        edges.push([x + w / 2, za + d / 2 + 0.3, w, d, floors]);
        edges.push([x + w / 2, zb - d / 2 - 0.3, w, d, floors - (r() < 0.4 ? 1 : 0)]);
        x += w + (r() < 0.3 ? 2 + r() * 3 : 0.4);
      }
      for (const [x, z, w, d, fl] of edges) {
        const hh = fl * 3.0 + 0.4;
        houses.push({ p: [x, hh / 2, z], s: [w, hh, d], c: wallCols[Math.floor(r() * wallCols.length)] });
        if (r() < 0.55) roofs.push({ p: [x, hh + 1.1, z], s: [w * 1.06, 2.2, d * 1.06], ry: 0, c: [0xb4533a, 0xa64a33, 0xbd6244, 0x9b4430][Math.floor(r() * 4)] });
        else {
          const n = 1 + Math.floor(r() * 2);
          for (let i = 0; i < n; i++) {
            const tx = x - w / 4 + i * 2.2, tz = z + (r() - 0.5) * d * 0.4;
            tanks.push({ p: [tx, hh + 1.45, tz - 0.6], s: [1, 1, 1] });
            panels.push({ p: [tx, hh + 0.75, tz + 0.5], s: [1, 1, 1] });
          }
        }
      }
      // blok içi bahçe ağaçları
    }
  }
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  G.add(instanced(boxG, facadeMaterial('house'), houses));
  const roofG = new THREE.ConeGeometry(0.7071, 1, 4, 1); roofG.rotateY(Math.PI / 4);
  G.add(instanced(roofG, lam(0xffffff, { flatShading: true }), roofs));
  const tankG = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 12); tankG.rotateX(Math.PI / 2);
  G.add(instanced(tankG, lam(0xe8e8e8), tanks));
  const panelG = new THREE.BoxGeometry(1.9, 0.06, 1.1); panelG.rotateX(-0.6);
  G.add(instanced(panelG, new THREE.MeshStandardMaterial({ color: 0x1d2c4a, roughness: 0.25, metalness: 0.5 }), panels));
  // cami
  const stone = lam(0xe9e2d2);
  const mq = new THREE.Group(); mq.position.set(35, 0, -128);
  const baseM = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 22), stone); baseM.position.y = 5; mq.add(baseM);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 3, 16), stone); drum.position.y = 11.5; mq.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x8f979d)); dome.position.y = 13; mq.add(dome);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2.4, 8), lam(0xc9a64a)); fin.position.y = 22.8; mq.add(fin);
  const min = new THREE.Group(); min.position.set(13, 0, -10); mq.add(min);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 34, 12), stone); shaft.position.y = 17; min.add(shaft);
  const balc = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.4, 1.2, 16), stone); balc.position.y = 27; min.add(balc);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.35, 7, 12), lam(0x8f979d)); top.position.y = 37.5; min.add(top);
  G.add(shadowy(mq));
  // ağaçlar
  const tl = [];
  for (let x = -590; x < 590; x += 13) for (const sz of [1, -1]) { const rr = r(); if (sz > 0 && x > -12 && x < 34) continue; if (rr < 0.85) tl.push({ x: x + r() * 3, z: sz * 7.6, h: 6 + r() * 2, r: 2.0 + r() * 0.8, c: [0x4c6b34, 0x557538, 0x46622f][Math.floor(r() * 3)] }); }
  for (let i = 0; i < 900; i++) {
    const x = (r() - 0.5) * 1000, z = (r() - 0.5) * 520;
    if (Math.abs(z) < 12) continue;
    if (crossX.some(cx => Math.abs(x - cx) < 6) || rowsZ.some(rz => Math.abs(z - rz) < 6)) continue;
    if (r() < 0.22) tl.push({ kind: 'cypress', x, z, h: 9 + r() * 5, r: 1.6 + r() * 0.5 });
    else tl.push({ x, z, h: 5 + r() * 3, r: 1.8 + r() * 1.2, c: [0x4c6b34, 0x5b7a3c, 0x41592b, 0x6b7f45][Math.floor(r() * 4)] });
  }
  // şehir dışı zeytinlikler
  for (let i = 0; i < 800; i++) {
    const a = r() * Math.PI * 2, d = 330 + r() * 900;
    const x = Math.cos(a) * d * 1.4, z = Math.sin(a) * d;
    tl.push({ kind: 'olive', x, z, k: 0.9 + r() * 0.5, ry: r() * 6 });
  }
  G.add(trees(tl));
  // sokak lambaları
  const lp = []; for (let x = -580; x < 580; x += 26) { if (!(x > -12 && x < 34)) lp.push({ x, z: 5.4, ry: Math.PI }); lp.push({ x: x + 13, z: -5.4, ry: 0 }); }
  const lpg = lampPosts(lp.map(l => ({ ...l, ry: l.z > 0 ? -Math.PI / 2 : Math.PI / 2 }))); G.add(lpg);
  // park halindeki arabalar (ara sokaklar)
  const cl = []; const carCols = [0xd9d9d9, 0x1d1f22, 0x8a8f96, 0xa31d1d, 0x2c4a7a, 0xf2f2f2, 0x6b6f76];
  for (const z of rowsZ) for (let x = -480; x < 480; x += 6.5 + r() * 9) { if (r() < 0.55) cl.push({ x, z: z + 3.0 * (r() < 0.5 ? 1 : -1), ry: Math.PI / 2, c: carCols[Math.floor(r() * carCols.length)] }); }
  for (const x of crossX) for (let z = -280; z < 280; z += 7 + r() * 10) { if (Math.abs(z) > 15 && r() < 0.4) cl.push({ x: x + 2.9 * (r() < 0.5 ? 1 : -1), z, ry: 0, c: carCols[Math.floor(r() * carCols.length)] }); }
  // ana caddede birkaç park
  for (let x = -300; x < 300; x += 9 + r() * 14) if (Math.abs(x - 0) > 40 && r() < 0.5) cl.push({ x, z: -3.6, ry: Math.PI / 2, c: carCols[Math.floor(r() * carCols.length)] });
  G.add(cars(cl));
  // servis durağı tabelası
  const stop = new THREE.Group(); stop.position.set(13.2, 0.16, 5.6);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 10), lam(0x8d9196)); pole.position.y = 1.3; stop.add(pole);
  const signTex = canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#1f4fa3'; roundRect(ctx, 0, 0, w, h, 28); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 14; roundRect(ctx, 14, 14, w - 28, h - 28, 20); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 92px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('SERVİS', w / 2, h * 0.47);
    ctx.font = '700 64px Montserrat'; ctx.fillText('DURAĞI', w / 2, h * 0.75);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshLambertMaterial({ map: signTex, side: THREE.DoubleSide }));
  sign.position.set(0, 2.4, 0); stop.add(sign); G.add(shadowy(stop));
  // bank
  const bench = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 0.45, 2, 0.03), lam(0x7a5a3c)); bench.position.set(3.5, 0.6, 7.9); G.add(shadowy(bench));
  const bback = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.4, 0.06, 2, 0.02), lam(0x7a5a3c)); bback.position.set(3.5, 0.95, 8.15); G.add(shadowy(bback));
  return G;
}

// ---------- 2) ORGANİZE SANAYİ BÖLGESİ ----------
export function buildOSB() {
  const G = new THREE.Group(); G.name = 'osb';
  const r = rng(33);
  const main = makeRoad(1400, 14, { lanes: 4, double: true }); main.rotation.y = Math.PI / 2; G.add(main);
  for (const x of [-400, -200, 0, 200, 400]) { const rd = makeRoad(700, 9, { lanes: 2 }); rd.position.set(x, -0.005, 0); G.add(rd); }
  const conc = lam(0xb7b6b0);
  // fabrikalar
  const sheds = [], saw = [], offices = [];
  const plots = [];
  for (let x = -560; x < 560; x += 100) for (const sz of [1, -1]) for (const zz of [60, 190]) plots.push([x + 50, sz * zz]);
  for (const [cx, cz] of plots) {
    if (Math.abs(cx % 200) < 10) continue;
    if (cx === 90 && cz === 60) continue;
    const w = 70 + r() * 15, d = 55 + r() * 30, h = 10 + r() * 4;
    sheds.push({ p: [cx, h / 2, cz], s: [w, h, d], c: [0xd6dbe0, 0xc9d1d8, 0xdcdcd6, 0xbfc9d2][Math.floor(r() * 4)] });
    const n = Math.floor(d / 8);
    for (let i = 0; i < n; i++) saw.push({ p: [cx, h + 1.6, cz - d / 2 + 4 + i * 8], s: [w, 3.2, 8], c: 0x9fb0be });
    offices.push({ p: [cx - w / 2 + 10, 4, cz + Math.sign(cz) * (-d / 2 - 6)], s: [18, 8, 12], c: 0xe9eef2 });
    // otopark zemini
  }
  G.add(instanced(new THREE.BoxGeometry(1, 1, 1), facadeMaterial('factory', [4, 12]), sheds));
  const sawG = new THREE.BufferGeometry();
  {
    // testere dişi çatı profili: x boyunca uzanır, z'de 1 birim
    const v = new Float32Array([
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, // eğik yüz
      -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, // dik cam yüz
      -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5]);
    sawG.setAttribute('position', new THREE.BufferAttribute(v, 3)); sawG.computeVertexNormals();
  }
  G.add(instanced(sawG, lam(0xffffff, { side: THREE.DoubleSide }), saw));
  G.add(instanced(new THREE.BoxGeometry(1, 1, 1), facadeMaterial('house', [3.6, 3.6]), offices));
  // bacalar / silolar
  const chim = [];
  for (let i = 0; i < 9; i++) { const p = plots[Math.floor(r() * plots.length)]; chim.push({ p: [p[0] + 30, 14, p[1] + 20], s: [1.2, 28, 1.2], c: 0xc8c8c4 }); }
  G.add(instanced(new THREE.CylinderGeometry(1, 1.1, 1, 14), lam(0xffffff), chim));
  const silo = [];
  for (let i = 0; i < 6; i++) { const p = plots[Math.floor(r() * plots.length)]; for (let k = 0; k < 3; k++) silo.push({ p: [p[0] - 40, 9, p[1] + k * 7.5 - 7], s: [3.2, 18, 3.2], c: 0xdfe3e6 }); }
  G.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.35 }), silo));
  // çit
  const fence = [];
  for (const sz of [1, -1]) for (let x = -560; x < 560; x += 3) { if (Math.abs(x - 58) < 9 && sz > 0) continue; fence.push({ p: [x, 1.0, sz * 18], s: [3, 2.0, 0.05] }); }
  G.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x6d8a6a, transparent: true, opacity: 0.55, depthWrite: false }), fence, { cast: false }));
  // giriş kapısı + bariyer + güvenlik kulübesi
  const gate = new THREE.Group(); gate.position.set(58, 0, 18);
  const booth = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.8, 2.6, 2, 0.08), lam(0xeeeeee)); booth.position.set(-7, 1.4, 3); gate.add(booth);
  const bwin = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ color: 0x23303c, roughness: 0.1 })); bwin.position.set(-5.69, 1.8, 3); bwin.rotation.y = Math.PI / 2; gate.add(bwin);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7.5), new THREE.MeshLambertMaterial({ color: 0xffffff })); bar.position.set(-5.5, 1.1, 0.5); bar.rotation.x = -1.2; gate.add(bar);
  const sign = new THREE.Group(); sign.position.set(9, 0, 4); gate.add(sign);
  const sgTex = canvasTex(1024, 360, (ctx, w, h) => {
    ctx.fillStyle = '#f4f6f8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1e3d6b'; ctx.fillRect(0, 0, w, 26); ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#1e3d6b'; ctx.font = '800 92px Montserrat'; ctx.textAlign = 'center'; ctx.fillText('TİRE', w / 2, h * 0.42);
    ctx.font = '700 54px Montserrat'; ctx.fillText('ORGANİZE SANAYİ BÖLGESİ', w / 2, h * 0.72);
  });
  const sgp = new THREE.Mesh(new RoundedBoxGeometry(6, 2.1, 0.4, 2, 0.05), lam(0xdadde0)); sgp.position.y = 1.45; sign.add(sgp);
  const sgf = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 2.0), new THREE.MeshLambertMaterial({ map: sgTex })); sgf.position.set(0, 1.45, -0.21); sgf.rotation.y = Math.PI; sign.add(sgf);
  const sgf2 = sgf.clone(); sgf2.position.z = 0.21; sgf2.rotation.y = 0; sign.add(sgf2);
  G.add(shadowy(gate));
  // içerideki yol ve otopark
  const inner = makeRoad(160, 9, { lanes: 2 }); inner.position.set(58, -0.004, 98); G.add(inner);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), lam(0x6a6c6e)); lot.rotation.x = -Math.PI / 2; lot.position.set(100, 0.01, 40); lot.receiveShadow = true; G.add(lot);
  const cl = []; const carCols = [0xd9d9d9, 0x1d1f22, 0x8a8f96, 0xa31d1d, 0x2c4a7a, 0xf2f2f2];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) if (r() < 0.75) cl.push({ x: 76 + i * 5.5, z: 28 + j * 11, ry: 0, c: carCols[Math.floor(r() * carCols.length)] });
  for (let x = -500; x < 500; x += 40 + r() * 60) cl.push({ x, z: (r() < 0.5 ? 1 : -1) * 2.0 * (r() < 0.5 ? 1 : 3), ry: Math.PI / 2, c: carCols[Math.floor(r() * carCols.length)] });
  G.add(cars(cl));
  // kamyonlar
  const tr = new THREE.Group();
  for (const [x, z, ry] of [[-120, -5.0, Math.PI / 2], [240, 5.0, -Math.PI / 2], [150, 52, 0]]) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry;
    const cab = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.9, 2.5, 3, 0.15), lam(0xe6e6e6)); cab.position.set(5.2, 1.9, 0); t.add(cab);
    const box = new THREE.Mesh(new RoundedBoxGeometry(9, 3.4, 2.55, 2, 0.06), lam(0xf4f4f4)); box.position.set(-0.8, 2.25, 0); t.add(box);
    for (const wx of [5.2, -2.5, -4.0]) for (const wz of [1.1, -1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), lam(0x151515)); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.5, wz); t.add(w); }
    tr.add(t);
  }
  G.add(shadowy(tr));
  // lambalar ve ağaçlar
  const lp = []; for (let x = -560; x < 560; x += 30) { if (!(x > 30 && x < 95)) lp.push({ x, z: 8.2, ry: -Math.PI / 2 }); lp.push({ x: x + 15, z: -8.2, ry: Math.PI / 2 }); }
  G.add(lampPosts(lp));
  const tl = [];
  for (let x = -560; x < 560; x += 11) for (const sz of [1, -1]) { const ok = r() < 0.7; const xx = x + r() * 3, zz = sz * (12 + r() * 3), hh = 5 + r() * 2, rr = 1.6 + r() * 0.6; if (sz > 0 && xx > 25 && xx < 95) continue; if (ok) tl.push({ x: xx, z: zz, h: hh, r: rr, c: 0x587a3a }); }
  for (let i = 0; i < 500; i++) { const a = r() * 6.28, d = 650 + r() * 900; tl.push({ kind: 'olive', x: Math.cos(a) * d, z: Math.sin(a) * d * 0.7, k: 0.9 + r() * 0.5 }); }
  G.add(trees(tl));
  return G;
}

// ---------- 3) DAVET / OTEL GİRİŞİ (VIP) ----------
export function buildVenue() {
  const G = new THREE.Group(); G.name = 'venue';
  const r = rng(44);
  const rd = makeRoad(300, 9, { lanes: 2 }); rd.rotation.y = Math.PI / 2; G.add(rd);
  // geniş taş zemin (giriş meydanı)
  const plazaTex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#cfc6b6'; ctx.fillRect(0, 0, w, h);
    const rr = rng(9);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const v = 196 + rr() * 22; ctx.fillStyle = `rgb(${v},${v - 8},${v - 20})`; ctx.fillRect(x * 128 + 2 + (y % 2) * 64, y * 64 + 2, 124, 60); }
  }, { repeat: true });
  plazaTex.repeat.set(20, 8);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(80, 0.2, 30), new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.55 }));
  plaza.position.set(0, 0.1, 19.5); plaza.receiveShadow = true; G.add(plaza);
  // bina
  const bld = new THREE.Group(); bld.position.set(0, 0, 40);
  const winTex = canvasTex(256, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffcf8a'); g.addColorStop(1, '#ff9e45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(80,40,10,0.35)'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, 10, h); ctx.fillRect(w - 10, 0, 10, h); ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
  });
  const facade = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 22), lam(0xeae4d8)); facade.position.y = 8; bld.add(facade);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x332a20, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 1.6, roughness: 0.08, metalness: 0.2 });
  for (let i = 0; i < 12; i++) for (let fl = 0; fl < 3; fl++) {
    const x = -30 + i * 5.45; if (fl === 0 && Math.abs(x) < 7) continue;
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), glassMat); wm.position.set(x, 2.5 + fl * 5, -11.02); wm.rotation.y = Math.PI; bld.add(wm);
  }
  // giriş
  const door = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), glassMat); door.position.set(0, 2.1, -11.03); door.rotation.y = Math.PI; bld.add(door);
  const canopy = new THREE.Mesh(new RoundedBoxGeometry(16, 0.5, 9, 2, 0.1), lam(0x2a2826)); canopy.position.set(0, 5.4, -15.5); bld.add(canopy);
  const canLight = new THREE.Mesh(new THREE.PlaneGeometry(15, 0.15), new THREE.MeshBasicMaterial({ color: 0xffd7a0 })); canLight.rotation.x = Math.PI / 2; canLight.position.set(0, 5.14, -13); bld.add(canLight);
  for (const x of [-7, 7]) for (const z of [-19.5]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 20), lam(0xf2ede4)); c.position.set(x, 2.6, z); bld.add(c); }
  const name = canvasTex(1024, 160, (ctx, w, h) => { ctx.fillStyle = '#d9b77a'; ctx.font = '600 92px "Playfair Display", serif'; ctx.textAlign = 'center'; ctx.letterSpacing = '18px'; ctx.fillText('GRAND SALON', w / 2, h * 0.72); });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: name, transparent: true })); nm.position.set(0, 5.4, -20.02); nm.rotation.y = Math.PI; bld.add(nm);
  G.add(shadowy(bld));
  // kırmızı halı
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 15), std(0x8f0d12, 0.95)); carpet.position.set(0, 0.215, 21.5); carpet.receiveShadow = true; G.add(carpet);
  // saksılar, fenerler
  const pots = new THREE.Group();
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
    const z = 10 + i * 3.6;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.7, 20), std(0x22201e, 0.4)); pot.position.set(sx * 3.4, 0.55, z); pots.add(pot);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), lam(0x355a2a)); bush.position.set(sx * 3.4, 1.25, z); bush.scale.y = 1.1; pots.add(bush);
  }
  G.add(shadowy(pots));
  const tl = [];
  for (let x = -60; x <= 60; x += 7) { if (Math.abs(x) < 12) continue; tl.push({ kind: 'cypress', x, z: 31, h: 10 + r() * 3, r: 1.5 }); }
  for (let i = 0; i < 600; i++) { const x = (r() - 0.5) * 900, z = -30 - r() * 600; tl.push({ kind: r() < 0.3 ? 'cypress' : 'olive', x, z, k: 0.9 + r() * 0.4, h: 9 + r() * 4, r: 1.5 }); }
  for (let i = 0; i < 300; i++) { const x = (r() - 0.5) * 900, z = 60 + r() * 500; tl.push({ kind: 'olive', x, z, k: 0.9 + r() * 0.4 }); }
  G.add(trees(tl));
  const lp = []; for (let x = -140; x < 140; x += 22) lp.push({ x, z: -6, ry: Math.PI / 2 });
  G.add(lampPosts(lp));
  return G;
}

// ---------- 4) ZEYTİNLİKLER ARASINDA KIVRIMLI YOL ----------
export function buildCountry() {
  const G = new THREE.Group(); G.name = 'country';
  const r = rng(55);
  const pts = [];
  for (let i = 0; i <= 16; i++) { const x = -800 + i * 100; pts.push(new THREE.Vector3(x, 0, Math.sin(i * 0.9) * 38 + Math.sin(i * 0.37) * 60)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  G.add(makeRoadRibbon(curve, 8.5, { segments: 900 }));
  // zeytin ağaçları sıralar halinde
  const tl = []; const P = new THREE.Vector3();
  const samples = []; for (let i = 0; i <= 400; i++) { curve.getPointAt(i / 400, P); samples.push(P.clone()); }
  const distToRoad = (x, z) => { let m = 1e9; for (const s of samples) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  for (let x = -800; x < 800; x += 8) for (let z = -170; z < 170; z += 8) {
    const jx = x + (r() - 0.5) * 1.5, jz = z + (r() - 0.5) * 1.5;
    const dd = distToRoad(jx, jz);
    if (dd < 9) continue;
    if (r() < 0.06) continue;
    tl.push({ kind: 'olive', x: jx, z: jz, k: 0.75 + r() * 0.45, ry: r() * 6, c: [0x7d8a5f, 0x76845a, 0x87936a][Math.floor(r() * 3)] });
  }
  // yol kenarı selviler
  for (let u = 0; u < 1; u += 0.012) { curve.getPointAt(u, P); const t = curve.getTangentAt(u); const sx = -t.z, sz = t.x; if (r() < 0.6) tl.push({ kind: 'cypress', x: P.x + sx * 7.2, z: P.z + sz * 7.2, h: 9 + r() * 4, r: 1.4 }); }
  G.add(trees(tl));
  // taş duvar (yol kenarı)
  const wl = [];
  for (let u = 0; u < 1; u += 0.0025) { curve.getPointAt(u, P); const t = curve.getTangentAt(u); const ry = Math.atan2(-t.z, t.x); wl.push({ p: [P.x - t.z * -5.6, 0.35, P.z + t.x * -5.6], s: [4.2, 0.7, 0.6], ry }); }
  G.add(instanced(new RoundedBoxGeometry(1, 1, 1, 2, 0.15), lam(0xb8ad98), wl));
  G.userData.curve = curve;
  return G;
}

// ---------- 5) GÜN BATIMI YOLU (geniş, temiz) ----------
export function buildHighway() {
  const G = new THREE.Group(); G.name = 'highway';
  const r = rng(66);
  const rd = makeRoad(3000, 12, { lanes: 2, dashed: true }); rd.rotation.y = Math.PI / 2; G.add(rd);
  // banket
  for (const sz of [1, -1]) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3), lam(0x8c8273)); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.012, sz * 7.5); sh.receiveShadow = true; G.add(sh);
  }
  // geniş seyir alanı (final sahnesi için)
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ map: (() => { const t = asphaltTex().clone(); t.needsUpdate = true; t.repeat.set(15, 8); return t; })(), roughness: 0.75 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.015, -21); pad.receiveShadow = true; G.add(pad);
  // bariyer
  const gr = [];
  for (let x = -1500; x < 1500; x += 4) { if (Math.abs(x) < 35) continue; gr.push({ p: [x, 0.62, 9.3], s: [4, 0.32, 0.06] }); }
  G.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.8, roughness: 0.35 }), gr));
  const posts = []; for (let x = -1500; x < 1500; x += 4) { if (Math.abs(x) < 35) continue; posts.push({ p: [x, 0.4, 9.45], s: [0.1, 0.8, 0.1] }); }
  G.add(instanced(new THREE.BoxGeometry(1, 1, 1), lam(0x7a7e83), posts));
  // elektrik direkleri
  const pl = []; for (let x = -1500; x < 1500; x += 60) pl.push({ p: [x, 5.5, -40], s: [0.3, 11, 0.3] });
  G.add(instanced(new THREE.CylinderGeometry(0.5, 0.6, 1, 8), lam(0x5a4a3c), pl));
  const tl = [];
  for (let i = 0; i < 1800; i++) {
    const x = (r() - 0.5) * 3000, z = (r() < 0.5 ? 1 : -1) * (14 + r() * 400);
    if (z < 0 && z > -40 && Math.abs(x) < 60) continue;
    tl.push(r() < 0.25 ? { kind: 'cypress', x, z, h: 9 + r() * 5, r: 1.5 } : { kind: 'olive', x, z, k: 0.8 + r() * 0.5, ry: r() * 6 });
  }
  G.add(trees(tl));
  return G;
}
