// Mailako objektuak: palisada eta atea, itua (soka atearekin lotuta: mekanismoa irakurgarria), etxolak, sua,
// tutorialeko oztopoak, menhirrak (harri-kopak), santutegiko zigilu-atea eta hormatxoa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './textures.js';
import { ground, RockScatter } from './world.js';
import { PALISADE_Z, GATE_HALF, PALISADE_H, PLATEAU_Y } from './layout.js';

function box(phys, x0, y0, z0, x1, y1, z1, tag = 'static') { return phys.addBox({ x: x0, y: y0, z: z0 }, { x: x1, y: y1, z: z1 }, tag); }

export function buildProps(scene, T, q, phys, rocksScatter) {
  const P = {};
  const woodM = mat(T, 'wood', 0x8a6040, { roughness: .9 });
  const darkWoodM = mat(T, 'wood', 0x5e3f28, { roughness: .9 });
  const thatchM = mat(T, 'thatch', 0xc9a45a, { roughness: 1 });
  const stoneM = mat(T, 'rock', 0xb3a38e, { roughness: .95 });
  const mossTopM = new THREE.MeshStandardMaterial({ color: 0x7ea044, roughness: 1 });
  const rocks = rocksScatter;

  // ── Palisada (enborrak instantziatuta) + atea
  const logs = [];
  const addLogLine = (x0, z0, x1, z1, skip) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / .44); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (skip && skip(x, z)) continue; logs.push([x, z, PALISADE_H + (Math.sin(i * 7.3) * .25)]); } };
  addLogLine(-23, PALISADE_Z, 23, PALISADE_Z, (x) => Math.abs(x) < GATE_HALF + .2);
  addLogLine(-23, PALISADE_Z, -23, 18); addLogLine(23, PALISADE_Z, 23, 18);
  const logG = mergeGeometries([new THREE.CylinderGeometry(.22, .24, 1, 7).translate(0, .5, 0), new THREE.ConeGeometry(.22, .45, 7).translate(0, 1.2, 0)].map(g => g.toNonIndexed()));
  const logIM = new THREE.InstancedMesh(logG, woodM, logs.length); const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion();
  logs.forEach(([x, z, h], i) => { const y = ground(x, z) - .3; qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7); m4.compose(new THREE.Vector3(x, y, z), qq, new THREE.Vector3(1, h, 1)); logIM.setMatrixAt(i, m4); });
  logIM.castShadow = q.shadows; logIM.receiveShadow = true; scene.add(logIM);
  for (const [x0, x1] of [[-23, -GATE_HALF], [GATE_HALF, 23]]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .18, .14), darkWoodM); beam.position.set((x0 + x1) / 2, 2.1, PALISADE_Z + .25); scene.add(beam); }
  box(phys, -23.5, -1, PALISADE_Z - .4, -GATE_HALF, PALISADE_H, PALISADE_Z + .4); box(phys, GATE_HALF, -1, PALISADE_Z - .4, 23.5, PALISADE_H, PALISADE_Z + .4);
  box(phys, -23.4, -1, 18, -22.6, PALISADE_H, PALISADE_Z); box(phys, 22.6, -1, 18, 23.4, PALISADE_H, PALISADE_Z);
  // Ate-zutoinak eta habea
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.32, .36, 4.6, 8), darkWoodM); p.position.set(sx * (GATE_HALF + .3), 2.2, PALISADE_Z); p.castShadow = true; scene.add(p); box(phys, sx * (GATE_HALF + .3) - .35, -1, PALISADE_Z - .35, sx * (GATE_HALF + .3) + .35, 4.5, PALISADE_Z + .35); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 + 1.4, .4, .5), darkWoodM); lintel.position.set(0, 4.2, PALISADE_Z); lintel.castShadow = true; scene.add(lintel);
  const gate = new THREE.Group(); { const parts = []; for (let i = 0; i < 8; i++) parts.push(new THREE.CylinderGeometry(.2, .2, 3.5, 7).translate(-GATE_HALF + .21 + i * .42, 1.75, 0)); const lg = new THREE.Mesh(mergeGeometries(parts), woodM); lg.castShadow = true; gate.add(lg); }
  for (const y of [.8, 2.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2, .2, .12), darkWoodM); b.position.set(0, y, .2); gate.add(b); }
  gate.position.set(0, 0, PALISADE_Z); scene.add(gate);
  const gateBox = box(phys, -GATE_HALF, -1, PALISADE_Z - .4, GATE_HALF, 3.4, PALISADE_Z + .4, 'gate');
  P.gate = { group: gate, box: gateBox, open: false, t: 0, openNow() { this.open = true; }, update(dt) { if (!this.open) return; this.t = Math.min(1, this.t + dt / 1.6); const u = this.t * this.t * (3 - 2 * this.t); gate.position.y = u * 3.4; if (this.t > .5) gateBox.solid = false; }, reset() { this.open = false; this.t = 0; gate.position.y = 0; gateBox.solid = true; } };

  // ── Itua: lastozko diskoa zutoin altu batean, soka atearen gainera (mekanismoa ikusgai)
  const TX = 4.6, TZ = 33.6, TY = 4.7;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, TY + .3, 8), darkWoodM); post.position.set(TX, (TY + .3) / 2, TZ - .25); post.castShadow = true; scene.add(post);
  box(phys, TX - .25, -1, TZ - .5, TX + .25, TY - .7, TZ);
  const target = new THREE.Group(); target.position.set(TX, TY, TZ);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .16, 24), thatchM); disc.rotation.x = Math.PI / 2; target.add(disc);
  for (const [r, c] of [[.55, 0x8a4a2a], [.38, 0xe9d7b0], [.2, 0xf0b24a]]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .18, 24), new THREE.MeshStandardMaterial({ color: c, roughness: .9, emissive: c === 0xf0b24a ? 0x7a4a00 : 0 })); ring.rotation.x = Math.PI / 2; ring.position.z = .01 + (r < .4 ? .01 : 0); target.add(ring); }
  target.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(target);
  // soka: itutik ate-habearen gainera
  const ropeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(TX, TY + .2, TZ - .1), new THREE.Vector3(TX * .55, TY + .9, (TZ + PALISADE_Z) / 2), new THREE.Vector3(0, 4.45, PALISADE_Z)]);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 24, .035, 5), new THREE.MeshStandardMaterial({ color: 0x9c8155, roughness: 1 })); scene.add(rope);
  P.target = { group: target, center: new THREE.Vector3(TX, TY, TZ + .08), r: .8, hit: false, t: 0, update(dt) { if (this.hit && this.t < 1) { this.t = Math.min(1, this.t + dt / .8); target.rotation.x = -Math.sin(this.t * Math.PI) * .6; } }, reset() { this.hit = false; this.t = 0; target.rotation.x = 0; } };

  // ── Kastroa: etxola biribilak (harrizko horma + lastozko teilatu konikoa), sua, egur-pilak, buztinezko ontziak
  const hutWallG = new THREE.CylinderGeometry(2.4, 2.5, 1.9, 18, 1, true); const hutRoofG = new THREE.ConeGeometry(3.1, 2.8, 18);
  const doorM = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
  for (const [x, z, ry] of [[-11, 31, .8], [-14, 22.5, 1.4], [11, 32.5, -.9], [13.5, 23.5, -1.5], [-6, 25, .3]]) {
    const y = ground(x, z); const w = new THREE.Mesh(hutWallG, stoneM); w.position.set(x, y + .95, z); w.castShadow = w.receiveShadow = true; w.material.side = THREE.DoubleSide; scene.add(w);
    const r = new THREE.Mesh(hutRoofG, thatchM); r.position.set(x, y + 1.9 + 1.4, z); r.castShadow = true; scene.add(r);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), doorM); d.position.set(x + Math.sin(ry) * 2.52, y + .75, z + Math.cos(ry) * 2.52); d.rotation.y = ry; scene.add(d);
    box(phys, x - 2.2, -1, z - 2.2, x + 2.2, 4.5, z + 2.2, 'hut');
  }
  const FX_ = 5, FZ = 27; P.fire = new THREE.Vector3(FX_, ground(FX_, FZ) + .3, FZ);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; rocks.add(FX_ + Math.cos(a) * .9, ground(FX_, FZ) + .1, FZ + Math.sin(a) * .9, .28, .22, .25, a); }
  const ember = new THREE.Mesh(new THREE.CircleGeometry(.65, 16), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); ember.rotation.x = -Math.PI / 2; ember.position.set(FX_, ground(FX_, FZ) + .05, FZ); scene.add(ember); P.ember = ember;
  box(phys, FX_ - 1, -1, FZ - 1, FX_ + 1, .35, FZ + 1);
  const potG = new THREE.LatheGeometry([[0, 0], [.22, .02], [.32, .25], [.28, .5], [.18, .62], [.2, .7]].map(([x, y]) => new THREE.Vector2(x, y)), 12); const potM = new THREE.MeshStandardMaterial({ color: 0x9a5a38, roughness: .9 });
  for (const [x, z] of [[-8.3, 29], [-8.8, 29.7], [9.2, 30.5], [10.4, 21.2], [-11.5, 20.5]]) { const p = new THREE.Mesh(potG, potM); p.position.set(x, ground(x, z), z); p.castShadow = true; scene.add(p); }
  const pileG = new THREE.CylinderGeometry(.16, .16, 1.6, 6); pileG.rotateZ(Math.PI / 2);
  { const parts = []; for (const [x, z] of [[8, 36], [-15.5, 28]]) for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) parts.push(pileG.clone().translate(x, ground(x, z) + .16 + r * .28, z + (c - (3 - r) / 2) * .33)); const pile = new THREE.Mesh(mergeGeometries(parts), woodM); pile.castShadow = true; scene.add(pile); }

  // ── A: tutorialeko oztopoak (enborra, harri-terraza, jauzi bikoitzeko ertza)
  const log = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, 17.2, 10), darkWoodM); log.rotation.z = Math.PI / 2; log.position.set(0, .38, 70); log.castShadow = log.receiveShadow = true; scene.add(log);
  box(phys, -8.6, -1, 69.5, 8.6, .78, 70.5, 'log');
  const terr = { x0: -8.6, x1: 8.6, z0: 58, z1: 63.5, h: 1.2 };
  const tM = new THREE.Mesh(new THREE.BoxGeometry(terr.x1 - terr.x0, terr.h + 1, terr.z1 - terr.z0), stoneM); tM.position.set(0, (terr.h - 1) / 2, (terr.z0 + terr.z1) / 2); tM.receiveShadow = tM.castShadow = true; scene.add(tM);
  const tTop = new THREE.Mesh(new THREE.PlaneGeometry(terr.x1 - terr.x0, terr.z1 - terr.z0), mossTopM); tTop.rotation.x = -Math.PI / 2; tTop.position.set(0, terr.h + .01, (terr.z0 + terr.z1) / 2); tTop.receiveShadow = true; scene.add(tTop);
  box(phys, terr.x0, -1, terr.z0, terr.x1, terr.h, terr.z1, 'terrace');
  for (let x = terr.x0; x <= terr.x1; x += 1.3) { rocks.add(x, .5, terr.z1 + .1, .75, .7, .4, Math.sin(x)); rocks.add(x + .5, .5, terr.z0 - .1, .75, .7, .4, Math.cos(x)); }
  const ledge = { x0: 4, x1: 7, z0: 52, z1: 55, h: 2.2 };
  const lM = new THREE.Mesh(new THREE.BoxGeometry(3, ledge.h + 1, 3), stoneM); lM.position.set(5.5, (ledge.h - 1) / 2, 53.5); lM.castShadow = lM.receiveShadow = true; scene.add(lM);
  const lTop = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mossTopM); lTop.rotation.x = -Math.PI / 2; lTop.position.set(5.5, ledge.h + .01, 53.5); scene.add(lTop);
  box(phys, ledge.x0, -1, ledge.z0, ledge.x1, ledge.h, ledge.z1, 'ledge');
  for (let k = 0; k < 6; k++) rocks.add(4 + (k % 3) * 1.5, .6 + Math.floor(k / 3) * 1.1, 51.9, .7, .65, .4, k);

  // ── Harkaitz handiak (talkarekin): neskaren ezkutalekua eta lore-harkaitzak
  const boulder = (x, z, w, h, d) => { const y = ground(x, z); rocks.add(x, y + h * .42, z, w * .62, h * .62, d * .62, x); box(phys, x - w / 2 + .15, -1, z - d / 2 + .15, x + w / 2 - .15, y + h, z + d / 2 - .15, 'boulder'); };
  boulder(-10, 4.5, 3.4, 2.6, 2.8); P.hide = new THREE.Vector3(-11.2, 0, 6.6);
  boulder(-13.5, 41.5, 2.2, 1.6, 2.2); boulder(12.5, 1.5, 2.4, 2.4, 2.4); boulder(9, -8, 2.2, 1.4, 2); boulder(-7, -4, 1.8, 1.1, 1.6);

  // ── Santutegia: menhirrak (harri-kopak), zutabe-harkaitza, hormatxoa eta zigilu-atea
  const menhirG = (() => { const g = new THREE.CylinderGeometry(.42, .55, 2.2, 7, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + Math.sin(y * 3 + i) * .06)); p.setZ(i, p.getZ(i) * .75); } g.translate(0, 1.1, 0); g.computeVertexNormals(); return g; })();
  const cupOffM = () => new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: .7, emissive: 0x000000 });
  const pillar = { x0: 6.5, x1: 9.5, z0: -25.5, z1: -22.5, h: 3.5 };
  const pM = new THREE.Mesh(new THREE.BoxGeometry(3, pillar.h + .2, 3), stoneM); pM.position.set(8, PLATEAU_Y + pillar.h / 2 - .1, -24); pM.castShadow = pM.receiveShadow = true; scene.add(pM);
  const pTop = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mossTopM); pTop.rotation.x = -Math.PI / 2; pTop.position.set(8, PLATEAU_Y + pillar.h + .01, -24); scene.add(pTop);
  for (let y = PLATEAU_Y + .5; y < PLATEAU_Y + pillar.h; y += 1.1) for (const [x, z, sx, sz] of [[6.4, -24, .35, 1.1], [9.6, -24, .35, 1.1], [8, -22.4, 1.1, .35], [8, -25.6, 1.1, .35]]) rocks.add(x, y, z, sx * 1.1, .7, sz * 1.1, y);
  box(phys, pillar.x0, -1, pillar.z0, pillar.x1, PLATEAU_Y + pillar.h, pillar.z1, 'pillar');
  P.menhirs = [];
  for (const [x, y, z] of [[-7, PLATEAU_Y, -21], [8, PLATEAU_Y + pillar.h, -24], [0, PLATEAU_Y, -40.5]]) {
    const m = new THREE.Mesh(menhirG, stoneM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    // zirkulu kontzentrikoak zizelkatuta (ikur abstraktua, ez lauburua)
    for (const r of [.16, .28]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .025, 6, 24), new THREE.MeshStandardMaterial({ color: 0x7a6a56, roughness: 1 })); t.position.set(x, y + 1.25, z + .34); scene.add(t); }
    const cupM = cupOffM(); const cup = new THREE.Mesh(new THREE.CylinderGeometry(.42, .3, .32, 12), cupM); cup.position.set(x, y + 2.32, z); cup.castShadow = true; scene.add(cup);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffc86a, transparent: true, opacity: 0 })); glow.position.set(x, y + 2.55, z); scene.add(glow);
    box(phys, x - .45, -1, z - .4, x + .45, y + 2.45, z + .4, 'menhir');
    P.menhirs.push({ pos: new THREE.Vector3(x, y + 2.5, z), r: .75, lit: false, cupM, glow, light() { this.lit = true; cupM.emissive.setHex(0xd88a1a); cupM.emissiveIntensity = 1.4; glow.material.opacity = .85; }, reset() { this.lit = false; cupM.emissive.setHex(0); glow.material.opacity = 0; } });
  }
  // Irlako hormatxoa (3. menhirra ezkutatzen du)
  const wallM = new THREE.Mesh(new THREE.BoxGeometry(10, 2.9, .7), stoneM); wallM.position.set(0, PLATEAU_Y + 1.45, -36.9); wallM.castShadow = wallM.receiveShadow = true; scene.add(wallM);
  for (let x = -4.6; x <= 4.6; x += 1.15) rocks.add(x, PLATEAU_Y + 2.9, -36.9, .7, .35, .5, x);
  box(phys, -5, -1, -37.25, 5, PLATEAU_Y + 2.9, -36.55, 'wall');
  // Zigilu-atea: trikuharri-itxurako markoa + harri biribila (eraztun kontzentrikoak)
  const SZ = -46.7, SY = PLATEAU_Y;
  for (const sx of [-1, 1]) { const u = new THREE.Mesh(new THREE.BoxGeometry(.9, 3.6, 1), stoneM); u.position.set(sx * 1.85, SY + 1.8, SZ); u.castShadow = true; scene.add(u); box(phys, sx * 1.85 - .45, -1, SZ - .5, sx * 1.85 + .45, SY + 3.6, SZ + .5); }
  const lin = new THREE.Mesh(new THREE.BoxGeometry(5, .8, 1.3), stoneM); lin.position.set(0, SY + 4, SZ); lin.castShadow = true; scene.add(lin);
  const sealG = new THREE.Group(); const sealStone = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .5, 28), stoneM); sealStone.rotation.x = Math.PI / 2; sealG.add(sealStone);
  const ringM = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: .9, emissive: 0x000000 });
  for (const r of [.35, .75, 1.15]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .05, 6, 36), ringM); t.position.z = .26; sealG.add(t); }
  sealG.position.set(0, SY + 1.5, SZ + .55); sealG.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(sealG);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.2), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })); inner.position.set(0, SY + 1.6, SZ - .1); scene.add(inner);
  const sealBox = box(phys, -1.5, -1, SZ + .2, 1.5, SY + 3.2, SZ + .9, 'seal');
  P.seal = { group: sealG, ringM, inner, box: sealBox, open: false, t: 0, door: new THREE.Vector3(0, SY, SZ + 1.2), charge(n) { ringM.emissive.setHex(n > 0 ? 0xc07a10 : 0); ringM.emissiveIntensity = n / 3 * 1.4; }, openNow() { this.open = true; }, update(dt) { if (!this.open) return; this.t = Math.min(1, this.t + dt / 2.2); sealG.position.x = this.t * 3.0; sealG.rotation.z = -this.t * 2.4; inner.material.color.setRGB(.16 + this.t * .84, .1 + this.t * .72, .06 + this.t * .4); if (this.t > .6) sealBox.solid = false; }, reset() { this.open = false; this.t = 0; sealG.position.x = 0; sealG.rotation.z = 0; inner.material.color.setHex(0x2a1a10); sealBox.solid = true; this.charge(0); } };
  return P;
}
