// Render motoru: renderer, post-prodüksiyon, gökyüzü/ortam, ışıklar, zemin, dağlar
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { canvasTex, fbm, noise2, rng, noiseFill } from './util.js';

export function createEngine(W, H, opt = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.5;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  document.getElementById('stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 22000);
  scene.fog = new THREE.FogExp2(0xbfcad6, 0.00012);

  // gökyüzü
  const sky = new Sky(); sky.scale.setScalar(16000); scene.add(sky);
  const envScene = new THREE.Scene(); const envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envCache = new Map();

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(opt.shadow ?? 2048, opt.shadow ?? 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x5a4a3a, 0.6); scene.add(hemi);

  // post
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: opt.samples ?? 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(W, H);
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.6, 0.92); if (opt.bloom !== false) { composer.addPass(bloom); bloom.setSize(Math.round(W / 2), Math.round(H / 2)); }
  composer.addPass(new OutputPass());
  if (opt.fxaa) { const fx = new ShaderPass(FXAAShader); fx.uniforms.resolution.value.set(1 / W, 1 / H); composer.addPass(fx); }
  const grade = new ShaderPass(GradeShader); grade.uniforms.uRes.value.set(W, H); composer.addPass(grade);

  const sunDir = new THREE.Vector3();
  function setSky(p) {
    const el = THREE.MathUtils.degToRad(p.sunElev), az = THREE.MathUtils.degToRad(p.sunAz);
    sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    for (const s of [sky, envSky]) {
      const u = s.material.uniforms;
      u.turbidity.value = p.turbidity ?? 6; u.rayleigh.value = p.rayleigh ?? 2;
      u.mieCoefficient.value = p.mie ?? 0.005; u.mieDirectionalG.value = p.mieG ?? 0.8;
      u.sunPosition.value.copy(sunDir);
    }
    const key = [Math.round(p.sunElev * 2) / 2, p.sunAz, p.turbidity, p.rayleigh, p.mie, p.mieG].join('|');
    if (!envCache.has(key)) {
      if (envCache.size >= 6) { const k0 = envCache.keys().next().value; envCache.get(k0).dispose(); envCache.delete(k0); }
      envCache.set(key, pmrem.fromScene(envScene, 0, 0.1, 2000).texture);
    }
    scene.environment = envCache.get(key);
    scene.environmentIntensity = p.envInt ?? 1;
    sun.color.set(p.sunColor ?? 0xffffff); sun.intensity = p.sunInt ?? 3;
    hemi.color.set(p.hemiSky ?? 0xbcd2ff); hemi.groundColor.set(p.hemiGround ?? 0x5a4a3a); hemi.intensity = p.hemiInt ?? 0.6;
    scene.fog.color.set(p.fog ?? 0xbfcad6); scene.fog.density = p.fogDensity ?? 0.00012;
    renderer.toneMappingExposure = p.exposure ?? 0.5;
    bloom.strength = p.bloom ?? 0.35; bloom.threshold = p.bloomThr ?? 0.92; bloom.radius = p.bloomRad ?? 0.6;
    sky.visible = p.skyVisible !== false;
    if (p.background !== undefined) scene.background = new THREE.Color(p.background); else scene.background = null;
    const g = grade.uniforms;
    g.uTemp.value = p.temp ?? 0; g.uTint.value = p.tint ?? 0; g.uSat.value = p.sat ?? 1; g.uContrast.value = p.contrast ?? 1;
    g.uLift.value.set(...(p.lift ?? [0, 0, 0])); g.uGain.value.set(...(p.gain ?? [1, 1, 1]));
    g.uVignette.value = p.vignette ?? 0.35; g.uFlare.value = p.flare ?? 0;
  }
  // güneşi odak noktasına göre konumlandır (gölge kamerası)
  function aimSun(target, size = 40, dist = 300) {
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(sunDir, dist);
    const c = sun.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 1; c.far = dist * 2 + size * 2; c.updateProjectionMatrix();
  }
  const _v = new THREE.Vector3();
  function render(frame, extras = {}) {
    const g = grade.uniforms;
    g.uFrame.value = frame;
    g.uFade.value = extras.fade ?? 0; g.uFlash.value = extras.flash ?? 0;
    // güneşin ekran konumu (lens flare)
    _v.copy(camera.position).addScaledVector(sunDir, 5000).project(camera);
    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
    const facing = camDir.dot(sunDir);
    g.uSunPos.value.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5);
    const off = Math.max(0, Math.abs(_v.x) - 1, Math.abs(_v.y) - 1);
    g.uSunVis.value = facing > 0 ? (extras.sunVis ?? 1) * Math.min(1, facing * 3) * Math.max(0, 1 - off * 2.5) : 0;
    composer.render();
  }
  return { renderer, scene, camera, sky, sun, hemi, composer, bloom, grade, setSky, aimSun, render, sunDir };
}

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2() }, uFrame: { value: 0 },
    uTemp: { value: 0 }, uTint: { value: 0 }, uSat: { value: 1 }, uContrast: { value: 1 },
    uLift: { value: new THREE.Vector3() }, uGain: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.35 }, uFade: { value: 0 }, uFlash: { value: 0 },
    uSunPos: { value: new THREE.Vector2(0.5, 0.5) }, uSunVis: { value: 0 }, uFlare: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFrame;
    uniform float uTemp, uTint, uSat, uContrast, uVignette, uFade, uFlash, uSunVis, uFlare;
    uniform vec3 uLift, uGain; uniform vec2 uSunPos;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    vec3 flare(vec2 uv){
      if (uSunVis <= 0.0 || uFlare <= 0.0) return vec3(0.0);
      vec2 asp = vec2(uRes.x/uRes.y, 1.0);
      vec2 s = uSunPos; vec2 c = vec2(0.5);
      vec3 col = vec3(0.0);
      float d = length((uv - s)*asp);
      col += vec3(1.0,0.75,0.45) * exp(-d*7.0) * 0.55;
      col += vec3(1.0,0.85,0.6) * exp(-d*28.0) * 0.6;
      // anamorfik çizgi
      float st = exp(-abs(uv.y - s.y)*260.0) * exp(-abs(uv.x - s.x)*2.2);
      col += vec3(1.0,0.7,0.45) * st * 0.35;
      // hayaletler
      vec2 dir = c - s;
      float ks[5]; ks[0]=0.45; ks[1]=0.8; ks[2]=1.25; ks[3]=1.6; ks[4]=2.1;
      float rs[5]; rs[0]=0.035; rs[1]=0.06; rs[2]=0.025; rs[3]=0.09; rs[4]=0.05;
      vec3 cs[5]; cs[0]=vec3(1.0,0.6,0.3); cs[1]=vec3(0.4,0.8,1.0); cs[2]=vec3(1.0,0.9,0.5); cs[3]=vec3(0.5,1.0,0.6); cs[4]=vec3(1.0,0.5,0.7);
      for (int i=0;i<5;i++){
        vec2 p = s + dir*ks[i]*2.0;
        float g = length((uv-p)*asp);
        float disc = smoothstep(rs[i], rs[i]*0.7, g);
        col += cs[i] * disc * 0.06;
      }
      // halo
      float hd = length((uv - c)*asp - normalize((s - c)*asp)*0.38);
      col += vec3(1.0,0.8,0.6) * smoothstep(0.06, 0.0, abs(length((uv-s)*asp) - 0.42)) * 0.04;
      return col * uSunVis * uFlare;
    }
    void main(){
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      // hafif kromatik sapma (kenarlarda)
      float ca = 0.0012 * dot(cc, cc) * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv - cc*ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + cc*ca).b;
      col += flare(uv);
      // renk sıcaklığı / ton
      col *= vec3(1.0 + uTemp*0.10, 1.0 + uTint*0.05, 1.0 - uTemp*0.10);
      // lift / gain
      col = uLift + col * (uGain - uLift);
      // kontrast (S eğrisi)
      col = clamp(col, 0.0, 1.0);
      col = mix(vec3(0.5), col, uContrast);
      col = mix(col, col*col*(3.0-2.0*col), (uContrast-1.0)*0.6);
      // doygunluk
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSat);
      // vinyet
      float v = smoothstep(0.85, 0.2, length(cc*vec2(1.0, 0.85))*1.15);
      col *= mix(1.0 - uVignette, 1.0, v);
      // film greni
      float n = hash(uv*uRes + fract(uFrame*0.6180339)*vec2(91.7, 53.3)) - 0.5;
      col += n * 0.022;
      col = mix(col, vec3(1.0, 0.93, 0.82), uFlash);
      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
    }`,
};

// Zemin: büyük düzlem + makro renk (vertex color) + detay doku
export function buildGround(seed = 3) {
  const size = 9000, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; const colors = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(0x6f7a3e), c2 = new THREE.Color(0x9a8a55), c3 = new THREE.Color(0x4f6232), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm(x * 0.0021, z * 0.0021, 4), m = fbm(x * 0.009 + 9, z * 0.009, 3);
    tmp.copy(c1).lerp(c2, THREE.MathUtils.clamp(n * 0.9 + 0.45, 0, 1)).lerp(c3, THREE.MathUtils.clamp(m * 0.8, 0, 0.6));
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const detail = canvasTex(512, 512, (ctx, w, h) => {
    const r = rng(seed);
    noiseFill(ctx, w, h, (x, y) => { const n = 0.75 + 0.25 * (noise2(x * 0.05, y * 0.05) * 0.5 + 0.5) + (r() - 0.5) * 0.25; const v = Math.max(0, Math.min(255, n * 220)); return [v, v * 0.98, v * 0.9]; });
  }, { repeat: true });
  detail.repeat.set(size / 6, size / 6);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 1 });
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.name = 'ground';
  return m;
}

// Vadiyi çevreleyen dağlar
export function buildMountains() {
  const rings = 70, segs = 360;
  const r0 = 2400, r1 = 9000;
  const verts = [], cols = [], idx = [];
  const low = new THREE.Color(0x4a5a34), mid = new THREE.Color(0x5e5a44), high = new THREE.Color(0x7c7464), tmp = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const rr = r0 + (r1 - r0) * Math.pow(i / rings, 1.3);
    for (let j = 0; j < segs; j++) {
      const a = j / segs * Math.PI * 2;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const ridge = 1 - Math.abs(noise2(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + rr * 0.00018));
      const base = (fbm(x * 0.00028, z * 0.00028, 5) * 0.5 + 0.5);
      const fall = THREE.MathUtils.smoothstep(rr, r0 + 400, r0 + 3600);
      let h = (base * 850 + ridge * ridge * 380) * fall;
      h *= 0.75 + 0.5 * (Math.sin(a * 1.0 + 1.2) * 0.5 + 0.5);
      verts.push(x, h - 2, z);
      const t = THREE.MathUtils.clamp(h / 1300, 0, 1);
      tmp.copy(low).lerp(mid, Math.min(1, t * 1.6)).lerp(high, Math.max(0, t - 0.55) * 1.8);
      const nn = fbm(x * 0.004, z * 0.004, 3) * 0.12; tmp.offsetHSL(0, 0, nn);
      cols.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * segs + j, b = i * segs + (j + 1) % segs, c = (i + 1) * segs + j, d = (i + 1) * segs + (j + 1) % segs;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }));
  m.name = 'mountains';
  return m;
}
