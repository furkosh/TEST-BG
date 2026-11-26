// Stilize insan figürleri + basit iskelet animasyonu (yürüme, el sallama, çömelme, oturma)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const matCache = new Map();
function mat(color, rough = 0.85, extra = {}) {
  const k = color + '|' + rough + JSON.stringify(extra);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
  return matCache.get(k);
}
const capCache = new Map();
function cap(r, len) {
  const k = r.toFixed(3) + '|' + len.toFixed(3);
  if (!capCache.has(k)) { const g = new THREE.CapsuleGeometry(r, len, 6, 14); g.translate(0, -len / 2 - r * 0.2, 0); capCache.set(k, g); }
  return capCache.get(k);
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }

export const SKIN = [0xd9a98a, 0xc68f6e, 0xe3b89c, 0xb98264, 0xd2a07f];
export const HAIR = [0x2a1d16, 0x3b2a1e, 0x1a1412, 0x5a3e2a, 0x6b4a30];

export function makePerson(o = {}) {
  const h = o.h ?? 1.75;
  const kid = !!o.kid;
  const s = h / 1.75;
  const headS = kid ? 1.22 : 1.0;
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.53 * h; root.add(hips);
  const skin = mat(o.skin ?? SKIN[0], 0.6);
  const shirt = mat(o.shirt ?? 0xffffff, 0.85);
  const pants = mat(o.pants ?? 0x2b3040, 0.85);
  const shoe = mat(o.shoes ?? 0x111111, 0.5);
  const jacket = o.jacket != null ? mat(o.jacket, 0.7) : null;
  const sleeve = jacket ?? (o.sleeves === 'short' ? skin : shirt);

  const legs = [];
  for (const side of [1, -1]) {
    const leg = new THREE.Group(); leg.position.set(0, 0, side * 0.09 * s); hips.add(leg);
    const thigh = mesh(cap(0.072 * s, 0.20 * h), o.shorts ? pants : pants); leg.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.245 * h; leg.add(knee);
    const shinMat = o.shorts || o.skirtShort ? skin : pants;
    const shin = mesh(cap(0.056 * s, 0.205 * h), shinMat); knee.add(shin);
    const ankle = new THREE.Group(); ankle.position.y = -0.255 * h; knee.add(ankle);
    const foot = mesh(new RoundedBoxGeometry(0.25 * s, 0.075 * s, 0.10 * s, 2, 0.03 * s), shoe); foot.position.set(0.05 * s, -0.01, 0); ankle.add(foot);
    legs.push({ leg, knee, thigh, shin });
    if (o.dress) { leg.visible = true; thigh.visible = false; }
  }
  // gövde
  const spine = new THREE.Group(); hips.add(spine);
  const torsoMat = jacket ?? (o.vest ? shirt : shirt);
  const torso = mesh(new THREE.CapsuleGeometry(0.155 * s, 0.25 * h, 6, 16), torsoMat);
  torso.scale.set(0.72, 1, 1); torso.position.y = 0.16 * h; spine.add(torso);
  const pelvis = mesh(new THREE.CapsuleGeometry(0.15 * s, 0.04 * h, 6, 16), o.dress ? mat(o.dress, 0.7) : pants);
  pelvis.scale.set(0.72, 1, 1); pelvis.position.y = 0.0; spine.add(pelvis);
  if (o.dress) {
    const pts = [[0.15, 0.02], [0.17, -0.1], [0.22, -0.3], [0.27, -0.5], [0.29, -0.52]].map(([r, y]) => new THREE.Vector2(r * s, y * h));
    const skirt = mesh(new THREE.LatheGeometry(pts, 24), mat(o.dress, 0.7, { side: THREE.DoubleSide })); skirt.scale.set(0.85, 1, 1); spine.add(skirt);
  }
  if (jacket && o.shirtFront !== false) {
    const sf = mesh(new THREE.PlaneGeometry(0.11 * s, 0.22 * h), shirt); sf.rotation.y = Math.PI / 2; sf.position.set(0.114 * s, 0.30 * h, 0); spine.add(sf);
    if (o.tie != null) { const tie = mesh(new THREE.BoxGeometry(0.01, 0.18 * h, 0.035 * s), mat(o.tie, 0.5)); tie.position.set(0.118 * s, 0.29 * h, 0); spine.add(tie); }
  }
  if (o.vest != null) {
    const v = mesh(new THREE.CapsuleGeometry(0.163 * s, 0.22 * h, 6, 16), mat(o.vest, 0.6, { emissive: o.vest, emissiveIntensity: 0.08 }));
    v.scale.set(0.74, 1, 1); v.position.y = 0.17 * h; spine.add(v);
    for (const y of [0.10, 0.20]) {
      const band = mesh(new THREE.CylinderGeometry(0.166 * s, 0.166 * s, 0.035 * h, 20, 1, true), mat(0xdfe3e6, 0.25, { metalness: 0.6 }));
      band.scale.set(0.745, 1, 1); band.position.y = y * h; spine.add(band);
    }
  }
  if (o.backpack != null) {
    const bp = mesh(new RoundedBoxGeometry(0.13 * s, 0.30 * h, 0.27 * s, 3, 0.04 * s), mat(o.backpack, 0.75));
    bp.position.set(-0.16 * s, 0.19 * h, 0); spine.add(bp);
    const flap = mesh(new RoundedBoxGeometry(0.05 * s, 0.10 * h, 0.22 * s, 2, 0.02 * s), mat(new THREE.Color(o.backpack).multiplyScalar(0.7).getHex(), 0.7));
    flap.position.set(-0.235 * s, 0.14 * h, 0); spine.add(flap);
  }
  // boyun ve kafa
  const neck = mesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.07 * h, 12), skin); neck.position.y = 0.335 * h; spine.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.40 * h + (kid ? 0.01 : 0); spine.add(headG);
  const head = mesh(new THREE.SphereGeometry(0.105 * s * headS, 24, 18), skin); head.scale.set(1.0, 1.18, 0.92); headG.add(head);
  const nose = mesh(new THREE.SphereGeometry(0.018 * s * headS, 10, 8), skin); nose.position.set(0.1 * s * headS, -0.005, 0); headG.add(nose);
  for (const sz of [1, -1]) { const ear = mesh(new THREE.SphereGeometry(0.022 * s * headS, 8, 6), skin); ear.scale.set(0.6, 1, 0.5); ear.position.set(-0.005, 0, sz * 0.098 * s * headS); headG.add(ear); }
  const hairMat = mat(o.hair ?? HAIR[0], 0.75);
  if (o.hairStyle !== 'none') {
    const hc = mesh(new THREE.SphereGeometry(0.112 * s * headS, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hc.scale.set(1.04, 1.2, 0.98); hc.rotation.z = 0.35; hc.position.set(-0.012, 0.015, 0); headG.add(hc);
    if (o.hairStyle === 'long') { const lh = mesh(new THREE.CapsuleGeometry(0.085 * s * headS, 0.16 * h, 4, 12), hairMat); lh.scale.set(0.6, 1, 1.15); lh.position.set(-0.07 * s, -0.08 * h, 0); headG.add(lh); }
    if (o.hairStyle === 'bun') { const b = mesh(new THREE.SphereGeometry(0.05 * s, 12, 10), hairMat); b.position.set(-0.10 * s, 0.06 * s, 0); headG.add(b); }
    if (o.hairStyle === 'pony') { const b = mesh(new THREE.CapsuleGeometry(0.035 * s, 0.12 * h, 4, 10), hairMat); b.position.set(-0.12 * s, -0.02, 0); b.rotation.z = -0.3; headG.add(b); }
  }
  if (o.helmet != null) {
    const hm = mesh(new THREE.SphereGeometry(0.125 * s, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.helmet, 0.35));
    hm.scale.set(1.08, 0.95, 1.0); hm.position.y = 0.035; headG.add(hm);
    const brim = mesh(new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.01, 24), mat(o.helmet, 0.35)); brim.scale.set(1.15, 1, 1); brim.position.set(0.02, 0.035, 0); headG.add(brim);
  }
  if (o.cap != null) {
    const c = mesh(new THREE.SphereGeometry(0.115 * s * headS, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.cap, 0.7)); c.position.y = 0.03; headG.add(c);
    const v = mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.008, 16, 1, false, -Math.PI / 2, Math.PI), mat(o.cap, 0.7)); v.position.set(0.09 * s * headS, 0.035, 0); headG.add(v);
  }
  // kollar
  const arms = [];
  for (const side of [1, -1]) {
    const arm = new THREE.Group(); arm.position.set(0, 0.295 * h, side * 0.185 * s); spine.add(arm);
    const up = mesh(cap(0.05 * s, 0.14 * h), sleeve); arm.add(up);
    const elbow = new THREE.Group(); elbow.position.y = -0.175 * h; arm.add(elbow);
    const fore = mesh(cap(0.043 * s, 0.13 * h), o.sleeves === 'short' ? skin : sleeve); elbow.add(fore);
    const hand = mesh(new THREE.SphereGeometry(0.045 * s, 12, 10), skin); hand.scale.set(0.8, 1.15, 0.55); hand.position.y = -0.175 * h; elbow.add(hand);
    arms.push({ arm, elbow, hand });
  }
  root.traverse(m => { if (m.isMesh) m.frustumCulled = true; });
  const P = { root, hips, spine, legs, arms, headG, h, s,
    // poz: { walk: faz (radyan) ve genlik, wave, crouch, sit, lean, armFwd }
    pose(p = {}) {
      const amp = p.amp ?? 1;
      const ph = p.walk ?? 0;
      const sw = Math.sin(ph) * amp;
      hips.position.y = 0.53 * h + (p.walk !== undefined ? 0.012 * h * Math.abs(Math.cos(ph)) * amp : 0);
      hips.rotation.set(0, 0, 0); spine.rotation.set(0, 0, -0.04 * amp); headG.rotation.set(0, p.look ?? 0, 0);
      // bacaklar
      legs[0].leg.rotation.set(0, 0, 0.42 * sw); legs[1].leg.rotation.set(0, 0, -0.42 * sw);
      legs[0].knee.rotation.set(0, 0, -0.55 * amp * Math.max(0, Math.sin(ph - 1.1)) - 0.05);
      legs[1].knee.rotation.set(0, 0, -0.55 * amp * Math.max(0, Math.sin(ph + Math.PI - 1.1)) - 0.05);
      // kollar
      arms[0].arm.rotation.set(0.10, 0, -0.32 * sw); arms[1].arm.rotation.set(-0.10, 0, 0.32 * sw);
      arms[0].elbow.rotation.set(0, 0, 0.25 + 0.15 * amp); arms[1].elbow.rotation.set(0, 0, 0.25 + 0.15 * amp);
      if (p.wave) { // sağ kol (+z) el sallama
        const w = p.wave; const a = arms[0];
        a.arm.rotation.set(-2.35 * w, 0, 0.35 * w); a.elbow.rotation.set(-0.35 * w * Math.sin(p.waveT * 9) - 0.2 * w, 0, 0.3 * w);
      }
      if (p.welcome) { const a = arms[0]; const w = p.welcome; a.arm.rotation.set(-0.55 * w, 0, 0.95 * w); a.elbow.rotation.set(0, 0, 0.25); }
      if (p.hold) { for (const a of arms) a.elbow.rotation.set(0, 0, 1.3 * p.hold); }
      if (p.crouch) {
        const c = p.crouch;
        hips.position.y = THREE.MathUtils.lerp(0.53 * h, 0.27 * h, c);
        legs[0].leg.rotation.set(0, 0, 1.45 * c); legs[1].leg.rotation.set(0.1 * c, 0, 1.25 * c);
        legs[0].knee.rotation.set(0, 0, -2.35 * c); legs[1].knee.rotation.set(0, 0, -2.0 * c);
        spine.rotation.set(0, 0, -0.45 * c);
        arms[0].arm.rotation.set(0.15, 0, 1.25 * c); arms[0].elbow.rotation.set(0, 0, 0.35 * c);
        arms[1].arm.rotation.set(-0.15, 0, 0.6 * c); arms[1].elbow.rotation.set(0, 0, 0.9 * c);
        headG.rotation.set(0, 0, -0.3 * c);
      }
      if (p.sit) {
        hips.position.y = p.seatH ?? 0.45;
        legs[0].leg.rotation.set(0, 0, 1.5); legs[1].leg.rotation.set(0, 0, 1.5);
        legs[0].knee.rotation.set(0, 0, -1.5); legs[1].knee.rotation.set(0, 0, -1.5);
        spine.rotation.set(0, 0, 0.08);
        arms[0].arm.rotation.set(0.1, 0, 0.35); arms[1].arm.rotation.set(-0.1, 0, 0.35);
        arms[0].elbow.rotation.set(0, 0, 0.9); arms[1].elbow.rotation.set(0, 0, 0.9);
      }
      if (p.lean) spine.rotation.z += p.lean;
    },
  };
  P.pose({});
  return P;
}

// Bir yol üzerinde yürüyen figürü konumlandır: from -> to (x,z), hız m/s, t: geçen süre
export function walkAlong(P, from, to, t, speed = 1.3, stride = 1.45) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const L = Math.hypot(dx, dz); const d = Math.min(L, Math.max(0, t * speed));
  const k = d / L;
  P.root.position.x = from[0] + dx * k; P.root.position.z = from[1] + dz * k;
  P.root.rotation.y = Math.atan2(-dz, dx);
  const moving = d < L && t > 0;
  const fade = Math.min(1, (L - d) / 0.4);
  P.pose({ walk: d / stride * Math.PI * 2 * 0.5 * 2, amp: moving ? Math.min(1, fade, t * 3) : 0 });
  return d >= L;
}
