// Mundua: lurra (altuera-funtzio analitikoa + sare-mesh-a), ura, zerua, argiak, mendiak, landaredia eta mugak.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STREAM, CLIFF_Z, PLATEAU_Y, PLATEAU_X, CHASM, ISLAND, PATH, FLAT } from './layout.js';
import { PALETTE, mat, makeSky } from './textures.js';

// ── zarata
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function fbm(x, y, o = 4) { let f = 0, a = .5, s = 0; for (let i = 0; i < o; i++) { f += a * vnoise(x, y); s += a; x *= 2.03; y *= 2.01; a *= .5; } return f / s; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rectDist(x, z, r) { const dx = Math.max(r[0] - x, 0, x - r[1]), dz = Math.max(r[2] - z, 0, z - r[3]); return Math.hypot(dx, dz); }
export function pathDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1]; const vx = bx - ax, vz = bz - az; const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}

// ── Altuera-funtzioa (talka eta errendatzea biak hemendik)
export function ground(x, z) {
  // Santutegiko lautada, amildegia eta irla
  if (z < CLIFF_Z) {
    const ax = Math.abs(x);
    if (z < ISLAND.z0) return PLATEAU_Y + 2 + (ISLAND.z0 - z) * 2.2 + fbm(x * .2, z * .2) * 3;     // atzeko mendia
    if (ax >= PLATEAU_X) return PLATEAU_Y + 1.5 + (ax - PLATEAU_X) * 2.0 + fbm(x * .15, z * .15) * 4; // alboko mendiak
    if (z >= CHASM.z1) return PLATEAU_Y;
    if (z >= CHASM.z0) return CHASM.bottom;
    if (x >= ISLAND.x0 && x < ISLAND.x1) return PLATEAU_Y;
    return CHASM.bottom;
  }
  // Erreka (arro sakona, ertz bertikalak)
  if (z >= STREAM.z0 && z < STREAM.z1 && x > STREAM.x0 && x < STREAM.x1) return STREAM.bed;
  let flatK = 1; for (const r of FLAT) flatK = Math.min(flatK, sstep(0, 5, rectDist(x, z, r)));
  const pd = pathDist(x, z); flatK *= sstep(1.5, 6, pd) * .7 + .3;
  let h = ((fbm(x * .07, z * .07) - .5) * 1.4 + (fbm(x * .23 + 7, z * .23) - .5) * .35) * flatK;
  // Inguruko muinoak (haranaren ertzak)
  const ax = Math.abs(x);
  const edge = z > 37 ? 17 : z > 16 ? 23 : z > 10 ? 30 : 17;
  if (ax > edge) h += Math.pow(ax - edge, 1.15) * .32 * (0.75 + fbm(x * .1, z * .1) * .6);
  if (z > 90) h += Math.pow(z - 90, 1.15) * .45;
  return h;
}
export const inStream = (x, z) => z >= STREAM.z0 && z < STREAM.z1 && x > STREAM.x0 && x < STREAM.x1;
export const inChasm = (x, z) => z < CLIFF_Z && z >= ISLAND.z0 && Math.abs(x) < PLATEAU_X && ground(x, z) <= CHASM.bottom + .01;

// ── Lurraren mesh-a: erpin-koloreak (belarra, bidea, harria maldetan) + xehetasun-testura
function buildTerrain(T, q) {
  const X0 = -64, X1 = 64, Z0 = -66, Z1 = 104, step = q.terrainStep;
  const nx = Math.round((X1 - X0) / step) + 1, nz = Math.round((Z1 - Z0) / step) + 1;
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  const cGrass = new THREE.Color(0x86a84a), cGrass2 = new THREE.Color(0xa7b95a), cDirt = new THREE.Color(0xa58457), cRock = new THREE.Color(0x9a8c78), cDark = new THREE.Color(0x5f6e3a), cBed = new THREE.Color(0x6b5f4c);
  const c = new THREE.Color();
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const x = X0 + ix * step, z = Z0 + iz * step, k = iz * nx + ix;
    const y = ground(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / 4; uv[k * 2 + 1] = z / 4;
    const e = .6, sl = Math.max(Math.abs(ground(x + e, z) - ground(x - e, z)), Math.abs(ground(x, z + e) - ground(x, z - e))) / (2 * e);
    const n = fbm(x * .15 + 3, z * .15);
    c.copy(cGrass).lerp(cGrass2, n).lerp(cDark, Math.max(0, .5 - n) * .5);
    const pd = pathDist(x, z); const pk = 1 - sstep(1.2, 2.6 + n, pd); if (pk > 0 && z > -30) c.lerp(cDirt, pk * .85);
    if (sl > 1.3 || y < -1) c.lerp(y < -1 ? cBed : cRock, Math.min(1, (sl - 1.1) * .6 + (y < -1 ? 1 : 0)));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const idx = []; for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) { const a = iz * nx + ix, b = a + 1, d = a + nx, e2 = d + 1; idx.push(a, d, b, b, d, e2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
  if (T.enabled) { m.map = detailTexture(); }
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.name = 'lurra'; return mesh;
}
function detailTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; const n = fbm(x / S * 16, y / S * 16, 4); const blades = hash2(x * 7, y * 3) * .25; const v = 205 + (n - .5) * 80 + blades * 60; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v)); img.data[i + 3] = 255; }
  // Wrap: fbm ez da periodikoa; ertzak nahastu
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ── Harkaitz-geometria bariazioak (instantziatuak)
export function rockGeo(seed, detail = 1, flat = .25) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const v = new THREE.Vector3();
  const planes = []; let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 6; i++) planes.push([new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(), .72 + rnd() * .2]);
  planes.push([new THREE.Vector3(0, -1, 0), .5]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); v.multiplyScalar(1 + (vnoise(v.x * 2 + seed, v.y * 2 + v.z * 1.7) - .5) * flat);
    for (const [n, d] of planes) { const dd = v.dot(n); if (dd > d) v.addScaledVector(n, -(dd - d)); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
export class RockScatter {
  constructor(T, n = 5, material) { this.geos = Array.from({ length: n }, (_, i) => rockGeo(i + 1)); this.items = Array.from({ length: n }, () => []); this.mat = material || mat(T, 'rock', 0xb0a08c, { roughness: .95 }); }
  add(x, y, z, sx, sy, sz, ry = 0, v = null) { const k = v ?? Math.floor(Math.abs(Math.sin(x * 12.9 + z * 78.2)) * this.geos.length) % this.geos.length; this.items[k].push([x, y, z, sx, sy, sz, ry]); }
  build(scene, shadows = true) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    this.items.forEach((arr, k) => {
      if (!arr.length) return; const im = new THREE.InstancedMesh(this.geos[k], this.mat, arr.length);
      arr.forEach(([x, y, z, sx, sy, sz, ry], i) => { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); im.setMatrixAt(i, m4); const t = .85 + Math.abs(Math.sin(x * 3.1 + z)) * .25; im.setColorAt(i, new THREE.Color(t, t * .98, t * .94)); });
      im.castShadow = shadows; im.receiveShadow = true; scene.add(im);
    });
  }
}

// ── Zuhaitzak, belarra, loreak, iratzeak (InstancedMesh)
function colorGeo(g, color, jitter = .08, seed = 1) { const n = g.attributes.position.count, c = new Float32Array(n * 3), base = new THREE.Color(color); for (let i = 0; i < n; i++) { const k = 1 + (hash2(i * 7 + seed, seed * 13) - .5) * jitter * 2; c[i * 3] = base.r * k; c[i * 3 + 1] = base.g * k; c[i * 3 + 2] = base.b * k; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (g.index) { const ng = g.toNonIndexed(); return ng; } return g; }
function treeGeo(kind) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(.18, .32, 2.6, 7); trunk.translate(0, 1.3, 0); parts.push(colorGeo(trunk, 0x6e4a2c, .1, 1));
  if (kind === 0) { // haritza: koroa biribila
    for (const [x, y, z, r, c] of [[0, 3.4, 0, 1.7, 0x5f8f34], [1.0, 3.0, .4, 1.15, 0x6c9b3a], [-.9, 3.1, -.3, 1.2, 0x557f2e], [.2, 4.3, -.2, 1.15, 0x77a843], [-.3, 2.8, .9, .95, 0x5b8a33]]) {
      const s = new THREE.IcosahedronGeometry(r, 0); s.scale(1.1, 1, 1.1); s.translate(x, y, z); parts.push(colorGeo(s, c, .12, x * 10 + 3));
    }
  } else if (kind === 1) { // pagoa: luzeagoa
    trunk.scale(1, 1.3, 1);
    for (const [x, y, z, r, c] of [[0, 4.2, 0, 1.4, 0x4f8a3c], [.6, 3.4, .3, 1.1, 0x5d9845], [-.6, 3.5, -.3, 1.1, 0x4a7f38], [0, 5.1, 0, 1.0, 0x66a04d]]) {
      const s = new THREE.IcosahedronGeometry(r, 0); s.scale(1.1, 1, 1.1); s.translate(x, y, z); parts.push(colorGeo(s, c, .12, y * 10));
    }
  } else { // izeia/pinua: konoak
    for (const [y, r, h] of [[2.0, 1.6, 2.4], [3.3, 1.25, 2.1], [4.5, .85, 1.8]]) { const s = new THREE.ConeGeometry(r, h, 8); s.translate(0, y, 0); parts.push(colorGeo(s, 0x3f6e3a, .12, y * 7)); }
  }
  return mergeGeometries(parts.map(g => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(k)) ng.deleteAttribute(k); ng.computeVertexNormals(); return ng; }));
}
function grassGeo() {
  const parts = [];
  for (let b = 0; b < 5; b++) {
    const a = b / 5 * Math.PI * 2 + b, h = .26 + (b % 3) * .07, w = .045; const g = new THREE.BufferGeometry();
    const lean = .12; const cx = Math.cos(a) * .06, cz = Math.sin(a) * .06;
    const v = new Float32Array([cx - w * Math.sin(a), 0, cz + w * Math.cos(a), cx + w * Math.sin(a), 0, cz - w * Math.cos(a), cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([.26, .38, .12, .26, .38, .12, .52, .68, .25]), 3)); g.computeVertexNormals(); parts.push(g);
  }
  const m = mergeGeometries(parts); const n = m.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); return m;
}
function daisyGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.PlaneGeometry(.09, .03); p.translate(.05, 0, 0); p.rotateX(-Math.PI / 2); p.rotateY(i / 6 * Math.PI * 2); p.translate(0, .22, 0); parts.push(colorGeo(p, 0xfffaf0, .02, i)); }
  const c = new THREE.OctahedronGeometry(.028, 0); c.translate(0, .225, 0); parts.push(colorGeo(c, 0xf2c23a, .05, 9));
  const st = new THREE.CylinderGeometry(.006, .008, .22, 3); st.translate(0, .11, 0); parts.push(colorGeo(st, 0x5c8a2e, .05, 4));
  return mergeGeometries(parts.map(g => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(k)) ng.deleteAttribute(k); return ng; }));
}
function fernGeo() {
  const parts = [];
  for (let i = 0; i < 7; i++) { const p = new THREE.PlaneGeometry(.22, .9, 1, 3); const pp = p.attributes.position; for (let k = 0; k < pp.count; k++) { const y = pp.getY(k) + .45; pp.setXYZ(k, pp.getX(k) * (1 - y * .7), y, -y * y * .45); } p.rotateY(i / 7 * Math.PI * 2); parts.push(colorGeo(p, 0x4d7f2f, .15, i)); }
  return mergeGeometries(parts.map(g => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(k)) ng.deleteAttribute(k); ng.computeVertexNormals(); return ng; }));
}
function windMaterial(base, uniforms) {
  base.onBeforeCompile = sh => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float sway = sin(uTime * 1.7 + wp.x * .35 + wp.z * .27) * .5 + sin(uTime * 3.1 + wp.x * .9) * .2;
        transformed.x += sway * position.y * .22; transformed.z += sway * position.y * .1;
      #endif`);
  };
  return base;
}
function scatter(count, rng, accept) { const out = []; let tries = 0; while (out.length < count && tries < count * 30) { tries++; const p = accept(rng); if (p) out.push(p); } return out; }

export function buildWorld(scene, T, q, phys) {
  const uniforms = { uTime: { value: 0 } };
  let seed = 1234; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const W = { uniforms, update: null, sky: null, water: [] };
  // Zerua eta lainoa
  const sky = makeSky(); scene.add(sky); W.sky = sky;
  scene.fog = new THREE.Fog(0xcfdde3, 55, 230); scene.background = new THREE.Color(0xa9d3ee);
  // Argiak
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x6b5a3a, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.5); sun.position.set(30, 48, 22); sun.castShadow = q.shadows;
  if (q.shadows) { sun.shadow.mapSize.set(q.shadowSize, q.shadowSize); const s = sun.shadow.camera; s.left = -26; s.right = 26; s.top = 26; s.bottom = -26; s.near = 1; s.far = 140; sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; }
  scene.add(sun); scene.add(sun.target); W.sun = sun; W.hemi = hemi;
  // Lurra
  const terrain = buildTerrain(T, q); scene.add(terrain); W.terrain = terrain;
  // Ura: erreka
  const wm = new THREE.MeshStandardMaterial({ color: 0x4a93b5, roughness: .12, metalness: .05, transparent: true, opacity: .84 });
  if (T.enabled && T.water) { wm.normalMap = T.water; wm.normalScale.set(.6, .6); }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(STREAM.x1 - STREAM.x0 + 30, STREAM.z1 - STREAM.z0, 1, 1), wm);
  water.rotation.x = -Math.PI / 2; water.position.set(0, STREAM.water, (STREAM.z0 + STREAM.z1) / 2); water.receiveShadow = true; scene.add(water); W.water.push(water);
  // Ur-aparra ertzetan
  const foamM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false });
  for (const z of [STREAM.z0 + .15, STREAM.z1 - .15]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(STREAM.x1 - STREAM.x0, .35), foamM); f.rotation.x = -Math.PI / 2; f.position.set(0, STREAM.water + .02, z); scene.add(f); }
  // Amildegiko lainoa
  const mistM = new THREE.MeshBasicMaterial({ color: 0xe8f0f2, transparent: true, opacity: .55, depthWrite: false });
  for (let i = 0; i < 3; i++) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(PLATEAU_X * 2, CHASM.z1 - CHASM.z0), mistM); mm.rotation.x = -Math.PI / 2; mm.position.set(0, CHASM.bottom + 1 + i * 1.3, (CHASM.z0 + CHASM.z1) / 2); scene.add(mm); }
  for (const [x0, x1] of [[-PLATEAU_X, ISLAND.x0], [ISLAND.x1, PLATEAU_X]]) for (let i = 0; i < 2; i++) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, ISLAND.z1 - ISLAND.z0), mistM); mm.rotation.x = -Math.PI / 2; mm.position.set((x0 + x1) / 2, CHASM.bottom + 1 + i * 1.5, (ISLAND.z0 + ISLAND.z1) / 2); scene.add(mm); }

  // Urrutiko mendiak (geruzak, elurrezko tontorrak)
  const mtM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, fog: true });
  const mts = [];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + rng() * .2, R = 170 + rng() * 80, h = 45 + rng() * 70, r = 45 + rng() * 40;
    const g = new THREE.ConeGeometry(r, h, 7, 3); const p = g.attributes.position; const cc = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) { const y = p.getY(k) + h / 2; p.setX(k, p.getX(k) * (1 + (rng() - .5) * .25)); p.setZ(k, p.getZ(k) * (1 + (rng() - .5) * .25)); const t = y / h; const snow = t > .72; const col = snow ? [.95, .96, 1] : t > .45 ? [.47, .55, .58] : [.36, .48, .4]; cc.set(col, k * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); g.translate(Math.sin(a) * R, h / 2 - 8, Math.cos(a) * R + 10); mts.push(g.toNonIndexed());
  }
  const mtMesh = new THREE.Mesh(mergeGeometries(mts.map(g => { g.deleteAttribute('uv'); g.computeVertexNormals(); return g; })), mtM); scene.add(mtMesh);
  // Hodeiak
  const cloudTex = (() => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d'); for (let i = 0; i < 14; i++) { const x = 20 + Math.random() * 88, y = 22 + Math.random() * 20, r = 12 + Math.random() * 16; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const clouds = []; for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .85, depthWrite: false, fog: false })); s.scale.set(70 + rng() * 40, 26 + rng() * 10, 1); s.position.set((rng() - .5) * 400, 70 + rng() * 40, (rng() - .5) * 400); scene.add(s); clouds.push(s); }

  // Landaredia
  const treeM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true });
  const treeGeos = [treeGeo(0), treeGeo(1), treeGeo(2)]; const treeLists = [[], [], []];
  const nearPlay = (x, z) => pathDist(x, z) < 5.5;
  const okTree = (x, z) => {
    if (Math.abs(x) > 58 || z < -60 || z > 100) return false;
    if (z < CLIFF_Z + 1 && Math.abs(x) < PLATEAU_X + 2) return false;
    if (z > STREAM.z0 - 2 && z < STREAM.z1 + 1.5 && Math.abs(x) < STREAM.x1) return false;
    if (z > 15 && z < 38.5 && Math.abs(x) < 23) return false; // kastroa barrutik
    if (z > 36 && z < 48 && Math.abs(x) < 16) return false;
    if (z > -16 && z < 10 && Math.abs(x) < 15) return false;
    if (nearPlay(x, z)) return false;
    return true;
  };
  // Basoa hasieran (dentsoa korridorearen inguruan) + haraneko ertzak
  for (const p of scatter(q.trees, rng, r => { const z = -60 + r() * 160, x = (r() - .5) * 116; if (!okTree(x, z)) return null; const dz = z > 44 ? 1 : Math.abs(x) > 16 ? .9 : .4; if (r() > dz) return null; return [x, z]; })) {
    const kind = p[1] > 40 ? (rng() < .5 ? 0 : 1) : (rng() < .45 ? 2 : rng() < .5 ? 0 : 1); treeLists[kind].push(p);
  }
  // Hasierako korridorearen ertzak: zuhaitz-hesiak
  for (let z = 48; z < 92; z += 2.6) for (const sx of [-1, 1]) { const x = sx * (9 + rng() * 3); if (okTree(x, z)) treeLists[rng() < .5 ? 0 : 1].push([x, z + rng()]); }
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), eu = new THREE.Euler(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
  treeLists.forEach((list, k) => {
    const im = new THREE.InstancedMesh(treeGeos[k], treeM, list.length); im.castShadow = q.shadows; im.receiveShadow = false;
    list.forEach(([x, z], i) => { const s = .85 + rng() * .55; eu.set(0, rng() * 6.28, 0); qq.setFromEuler(eu); vp.set(x, ground(x, z) - .1, z); vs.set(s, s * (.9 + rng() * .3), s); m4.compose(vp, qq, vs); im.setMatrixAt(i, m4); if (Math.abs(x) < 20 && z > -14) phys.addBox({ x: x - .35, y: ground(x, z) - 1, z: z - .35 }, { x: x + .35, y: ground(x, z) + 4, z: z + .35 }, 'tree'); });
    scene.add(im);
  });
  // Belarra
  const grassM = windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), uniforms);
  const gpos = scatter(q.grass, rng, r => { const x = (r() - .5) * 90, z = -14 + r() * 106; if (inStream(x, z) || z < -13) return null; if (pathDist(x, z) < 1.6) return null; const h = ground(x, z); if (h > 6) return null; return [x, h, z]; });
  // Goi-lautada eta irla ere belartsuak
  for (const p of scatter(Math.floor(q.grass * .12), rng, r => { const x = (r() - .5) * 22, z = -14 - r() * 32; const h = ground(x, z); if (Math.abs(h - PLATEAU_Y) > .01) return null; if (Math.abs(x) < 1.5) return null; return [x, h, z]; })) gpos.push(p);
  const grass = new THREE.InstancedMesh(grassGeo(), grassM, gpos.length);
  gpos.forEach(([x, y, z], i) => { const s = .6 + rng() * .6; eu.set(0, rng() * 6.28, 0); qq.setFromEuler(eu); m4.compose(vp.set(x, y, z), qq, vs.set(s, s * (.8 + rng() * .6), s)); grass.setMatrixAt(i, m4); });
  grass.receiveShadow = true; scene.add(grass);
  // Margaritak (apaingarriak)
  const daisyM = windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: THREE.DoubleSide }), uniforms);
  const dpos = scatter(q.flowers, rng, r => { const x = (r() - .5) * 70, z = -45 + r() * 135; if (inStream(x, z)) return null; if (pathDist(x, z) < 1.4) return null; const h = ground(x, z); if (h > 6 || h < -1) return null; if (fbm(x * .3, z * .3) < .5) return null; return [x, h, z]; });
  const daisies = new THREE.InstancedMesh(daisyGeo(), daisyM, dpos.length);
  dpos.forEach(([x, y, z], i) => { const s = .9 + rng() * .8; eu.set(0, rng() * 6.28, 0); qq.setFromEuler(eu); m4.compose(vp.set(x, y, z), qq, vs.set(s, s, s)); daisies.setMatrixAt(i, m4); });
  scene.add(daisies);
  // Iratzeak basoan
  const fernM = windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }), uniforms);
  const fpos = scatter(q.ferns, rng, r => { const x = (r() - .5) * 40, z = 40 + r() * 55; if (pathDist(x, z) < 2.5) return null; return [x, ground(x, z), z]; });
  const ferns = new THREE.InstancedMesh(fernGeo(), fernM, fpos.length);
  fpos.forEach(([x, y, z], i) => { const s = .8 + rng() * .9; eu.set(0, rng() * 6.28, 0); qq.setFromEuler(eu); m4.compose(vp.set(x, y, z), qq, vs.set(s, s, s)); ferns.setMatrixAt(i, m4); });
  scene.add(ferns);

  // Harkaitzak: ertzak, itsaslabarrak eta sakabanatuak
  const rocks = new RockScatter(T, 6);
  for (let x = STREAM.x0 + 1; x < STREAM.x1; x += 1.25 + rng() * .5) for (const [z, dz] of [[STREAM.z0, -1], [STREAM.z1, 1]]) {
    const s = .45 + rng() * .4; rocks.add(x, -.55 + rng() * .2, z + dz * (.1 + rng() * .3), s * 1.2, s, s * 1.1, rng() * 6);
    if (rng() < .5) rocks.add(x + .5, -1.4, z - dz * .2, s * 1.5, s * 1.3, s, rng() * 6);
  }
  // Santutegiko itsaslabarraren aurpegia eta amildegiko hormak
  for (let x = -PLATEAU_X; x <= PLATEAU_X; x += 1.6 + rng() * .4) {
    for (let y = .4; y < PLATEAU_Y; y += 1.3) { const s = .8 + rng() * .35; rocks.add(x, y, CLIFF_Z + .15 + rng() * .25, s * 1.2, s * .9, s * .5, rng() * .4); }
    for (let y = CHASM.bottom + 1; y < PLATEAU_Y; y += 1.5) { const s = .9 + rng() * .4; rocks.add(x, y, CHASM.z1 - .2, s * 1.2, s, s * .5, rng() * .4); if (x < ISLAND.x0 - .5 || x > ISLAND.x1 + .5) continue; rocks.add(x, y, CHASM.z0 + .2, s * 1.2, s, s * .5, rng() * .4); }
  }
  for (let z = ISLAND.z1; z > ISLAND.z0; z -= 1.6) for (let y = CHASM.bottom + 1; y < PLATEAU_Y; y += 1.5) for (const x of [ISLAND.x0 - .2, ISLAND.x1 + .2]) { const s = .9 + rng() * .4; rocks.add(x, y, z, s * .5, s, s * 1.2, 0); }
  for (let i = 0; i < 60; i++) { const x = (rng() - .5) * 80, z = -10 + rng() * 100; if (!okTree(x, z) || inStream(x, z)) continue; const s = .3 + rng() * .7; rocks.add(x, ground(x, z) + s * .2, z, s * 1.3, s, s * 1.1, rng() * 6); }
  W.rocks = rocks;

  // Mugak (ikusezinak): haranetik irten ez dadin
  const wall = (x0, z0, x1, z1) => { const b = phys.addBox({ x: Math.min(x0, x1) - .3, y: -20, z: Math.min(z0, z1) - .3 }, { x: Math.max(x0, x1) + .3, y: 40, z: Math.max(z0, z1) + .3 }, 'muga'); b.noCam = true; return b; };
  wall(-8.5, 50, -8.5, 92); wall(8.5, 50, 8.5, 92); wall(-8.5, 92, 8.5, 92);
  wall(-17, 37, -17, 50); wall(17, 37, 17, 50); wall(-17, 50, -8.5, 50); wall(8.5, 50, 17, 50);
  wall(-23, 16, -23, 38); wall(23, 16, 23, 38);
  wall(-31, 10, -31, 20); wall(31, 10, 31, 20); wall(-31, 20, -23, 20); wall(23, 20, 31, 20);
  wall(-17, -14, -17, 10); wall(17, -14, 17, 10); wall(-31, 10, -17, 10); wall(17, 10, 31, 10);
  wall(-PLATEAU_X, -48, -PLATEAU_X, -14); wall(PLATEAU_X, -48, PLATEAU_X, -14); wall(-PLATEAU_X, -48.5, PLATEAU_X, -48.5);

  W.update = (dt, t, camPos, target) => {
    uniforms.uTime.value = t;
    if (wm.normalMap) { wm.normalMap.offset.x = t * .05; wm.normalMap.offset.y = t * .02; }
    sky.position.copy(camPos);
    if (q.shadows && target) { sun.position.set(target.x + 30, target.y + 48, target.z + 22); sun.target.position.copy(target); }
    for (const c of clouds) { c.position.x += dt * 1.2; if (c.position.x > 220) c.position.x = -220; }
  };
  return W;
}
