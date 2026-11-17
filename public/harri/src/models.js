// Pertsonaien modeloak: GLB (Blender, tools/harri/blender/harri_eraiki.py) + artikulazioen "rig"-a.
// GLB-ak huts egiten badu, primitiboekin eraikitako ordezko modeloa (izen berdinekin) erabiltzen da.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const load = url => new Promise((res, rej) => loader.load(url, g => res(g.scene), undefined, rej));

export class Rig {
  constructor(root, names) {
    this.root = root; this.j = {};
    for (const n of names) {
      const o = root.getObjectByName(n);
      if (o) this.j[n] = { o, q0: o.quaternion.clone(), p0: o.position.clone(), s0: o.scale.clone() };
    }
    this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._q = new THREE.Quaternion();
  }
  rot(n, x = 0, y = 0, z = 0) { const j = this.j[n]; if (!j) return; this._e.set(x, y, z); this._q.setFromEuler(this._e); j.o.quaternion.copy(j.q0).multiply(this._q); }
  off(n, x = 0, y = 0, z = 0) { const j = this.j[n]; if (!j) return; j.o.position.set(j.p0.x + x, j.p0.y + y, j.p0.z + z); }
  scl(n, x = 1, y = 1, z = 1) { const j = this.j[n]; if (!j) return; j.o.scale.set(j.s0.x * x, j.s0.y * y, j.s0.z * z); }
}

function prepare(scene, T, opts = {}) {
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = !!opts.receive;
    const m = o.material; if (!m) return;
    m.roughness = Math.max(m.roughness ?? .9, .45); m.metalness = 0;
  });
  return scene;
}

// ── Ordezko modeloak (GLB gabe ere jokoak funtziona dezan)
function blob(r, color, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true })); m.scale.set(sx, sy, sz); m.castShadow = true; return m; }
function node(name, parent, x, y, z) { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; }
function fallbackHarri() {
  const R = 0xa8957c, root = new THREE.Group(); root.name = 'harri';
  const hips = node('hips', root, 0, .44, 0), torso = node('torso', hips, 0, .12, 0), head = node('head', torso, 0, .52, 0);
  torso.add(Object.assign(blob(.38, R, 1, .75, .8), { position: new THREE.Vector3(0, .2, 0) }));
  head.add(Object.assign(blob(.36, R, 1.05, .85, .95), { position: new THREE.Vector3(0, .07, 0) }));
  head.add(Object.assign(blob(.34, 0x6f9a33, 1.05, .4, .95), { position: new THREE.Vector3(0, .3, -.02) }));
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const e = node('eye_' + s, head, sx * .135, .11, .285); e.add(blob(.08, 0xf7f1e6, 1, 1.2, .5)); const ir = blob(.05, 0xd98a22, 1, 1.1, .4); ir.position.z = .03; e.add(ir);
    node('brow_' + s, head, sx * .14, .21, .3).add(blob(.09, 0x8f7d67, 1.2, .5, .5));
    const ua = node('upperarm_' + s, torso, sx * .43, .42, 0); ua.add(blob(.19, R)); const fa = node('forearm_' + s, ua, sx * .07, -.28, 0); fa.add(Object.assign(blob(.15, R), { position: new THREE.Vector3(0, -.12, 0) }));
    node('hand_' + s, fa, 0, -.24, 0).add(Object.assign(blob(.15, R), { position: new THREE.Vector3(0, -.1, 0) }));
    const th = node('thigh_' + s, hips, sx * .17, -.04, 0); th.add(Object.assign(blob(.15, R), { position: new THREE.Vector3(0, -.06, 0) }));
    const sh = node('shin_' + s, th, 0, -.18, 0); sh.add(Object.assign(blob(.13, R), { position: new THREE.Vector3(0, -.06, 0) }));
    node('foot_' + s, sh, 0, -.14, 0).add(Object.assign(blob(.15, R, 1, .55, 1.3), { position: new THREE.Vector3(0, 0, .05) }));
  }
  const mouth = node('mouth', head, 0, -.02, .31); mouth.add(blob(.1, 0x4a1d12, 1.2, .6, .3));
  return root;
}
function fallbackNeska() {
  const root = new THREE.Group(); root.name = 'neska';
  const hips = node('hips', root, 0, .42, 0), torso = node('torso', hips, 0, .04, 0), head = node('head', torso, 0, .42, 0);
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(.12, .23, .46, 10), new THREE.MeshStandardMaterial({ color: 0xa4562c, roughness: .95 })); tun.position.y = .17; tun.castShadow = true; torso.add(tun);
  head.add(Object.assign(blob(.15, 0xe2ab84), { position: new THREE.Vector3(0, .12, 0) })); head.add(Object.assign(blob(.16, 0x3b2416, 1, 1, 1), { position: new THREE.Vector3(0, .15, -.02) }));
  for (const [s, sx] of [['L', 1], ['R', -1]]) { node('arm_' + s, torso, sx * .15, .37, 0).add(Object.assign(blob(.05, 0xa4562c, 1, 3.5, 1), { position: new THREE.Vector3(0, -.15, 0) })); node('leg_' + s, hips, sx * .08, 0, 0).add(Object.assign(blob(.06, 0xb9a27c, 1, 3.2, 1), { position: new THREE.Vector3(0, -.2, 0) })); }
  return root;
}
function fallbackBasurdea() {
  const root = new THREE.Group(); root.name = 'basurdea';
  const body = node('body', root, 0, .5, 0); body.add(Object.assign(blob(.4, 0x5b4130, .9, .8, 1.5), { position: new THREE.Vector3(0, .08, -.05) }));
  const head = node('head', body, 0, .08, .5); head.add(Object.assign(blob(.25, 0x5b4130, 1, .9, 1.2), { position: new THREE.Vector3(0, -.06, .16) }));
  for (const [n, x, z] of [['leg_FL', .17, .32], ['leg_FR', -.17, .32], ['leg_BL', .17, -.38], ['leg_BR', -.17, -.38]]) node(n, body, x, -.12, z).add(Object.assign(blob(.08, 0x3a281d, 1, 2.2, 1), { position: new THREE.Vector3(0, -.17, 0) }));
  return root;
}

export const HARRI_JOINTS = ['hips', 'torso', 'head', 'eye_L', 'eye_R', 'brow_L', 'brow_R', 'mouth', 'upperarm_L', 'upperarm_R', 'forearm_L', 'forearm_R', 'hand_L', 'hand_R', 'thigh_L', 'thigh_R', 'shin_L', 'shin_R', 'foot_L', 'foot_R'];
export const NESKA_JOINTS = ['hips', 'torso', 'head', 'arm_L', 'arm_R', 'leg_L', 'leg_R'];
export const BOAR_JOINTS = ['body', 'head', 'leg_FL', 'leg_FR', 'leg_BL', 'leg_BR'];

export async function loadCharacters(T, onProgress) {
  const out = {};
  const jobs = [['harri', './assets/harri.glb', fallbackHarri], ['neska', './assets/neska.glb', fallbackNeska], ['basurdea', './assets/basurdea.glb', fallbackBasurdea]];
  let done = 0;
  await Promise.all(jobs.map(async ([name, url, fb]) => {
    let scene, fromGlb = true;
    try { scene = await load(url); } catch (e) { console.warn('GLB ezin kargatu, ordezkoa:', url, e?.message); scene = fb(); fromGlb = false; }
    out[name] = { scene: prepare(scene, T), fromGlb };
    onProgress?.(++done / jobs.length);
  }));
  return out;
}
