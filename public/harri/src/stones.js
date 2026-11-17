// Harri-sistema: harri txikiak (HARTU / JAURTI), harrizko blokeak (HARTU / ERAIKI+LOTU / DESMUNTATU / UTZI),
// eraikuntza-mamua, lotura-josturak eta berragertzea (ezer ez da betiko galtzen → ez dago softlock-ik).
import * as THREE from 'three';
import { BuildGrid, Inventory } from './grid.js';
import { CELL, ROCKS, BLOCKS, THROW_V, STREAM } from './layout.js';
import { ground, inStream, inChasm, rockGeo } from './world.js';
import { mat } from './textures.js';
import { G } from './physics.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function solveLaunch(from, to, v, g = G) {
  const dx = to.x - from.x, dz = to.z - from.z, dy = to.y - from.y, d = Math.hypot(dx, dz); if (d < .01) return null;
  const v2 = v * v, disc = v2 * v2 - g * (g * d * d + 2 * dy * v2); if (disc < 0) return null;
  const ang = Math.atan((v2 - Math.sqrt(disc)) / (g * d));
  return V(dx / d * Math.cos(ang) * v, Math.sin(ang) * v, dz / d * Math.cos(ang) * v);
}

export class Stones {
  constructor(game) {
    this.g = game; const { scene, T, phys } = game;
    this.inv = new Inventory(3); this.rocks = []; this.blocks = []; this.carry = null; this.seams = []; this.respawns = [];
    // Eraikuntza-sarea: lurraren altuera gelaxkaren lau ertz + erdian
    const samples = (i, j) => { const x0 = i * CELL.x, z0 = j * CELL.z, e = .2; return [[x0 + e, z0 + e], [x0 + CELL.x - e, z0 + e], [x0 + e, z0 + CELL.z - e], [x0 + CELL.x - e, z0 + CELL.z - e], [x0 + CELL.x / 2, z0 + CELL.z / 2]].map(([x, z]) => ground(x, z)); };
    this.env = { groundTop: (i, j) => Math.max(...samples(i, j)), solidCell: (i, j, k) => Math.min(...samples(i, j)) >= k + 1 - .01, tolUp: .35, tolDown: .3 };
    this.grid = new BuildGrid(this.env);
    // Geometriak eta materialak
    this.rockGeo = rockGeo(11, 1, .3); this.rockMat = mat(T, 'rock', 0xb9a891, { roughness: .9 });
    const bg = new THREE.BoxGeometry(CELL.x - .04, CELL.y - .02, CELL.z - .04, 4, 2, 4); const bp = bg.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); const e = (Math.abs(x) > .95 ? 1 : 0) + (Math.abs(y) > .48 ? 1 : 0) + (Math.abs(z) > .95 ? 1 : 0); if (e >= 2) { const k = .93; bp.setXYZ(i, x * (Math.abs(x) > .95 ? k : 1) + Math.sin(i * 3.1) * .02, y * (Math.abs(y) > .48 ? .9 : 1), z * (Math.abs(z) > .95 ? k : 1) + Math.cos(i * 2.3) * .02); } }
    bg.computeVertexNormals(); this.blockGeo = bg;
    this.blockMat = mat(T, 'block', 0xc0b19b, { roughness: .9 });
    const mossM = new THREE.MeshStandardMaterial({ color: 0x7ea044, roughness: 1 }); this.mossG = new THREE.BoxGeometry(.9, .06, .7); this.mossM = mossM;
    // Mamua
    this.ghost = new THREE.Mesh(new THREE.BoxGeometry(CELL.x, CELL.y, CELL.z), new THREE.MeshBasicMaterial({ color: 0x8cff8c, transparent: true, opacity: .32, depthWrite: false }));
    this.ghostEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL.x, CELL.y, CELL.z)), new THREE.LineBasicMaterial({ color: 0xd8ffd8, transparent: true, opacity: .9 }));
    this.ghost.add(this.ghostEdge); this.ghost.visible = false; this.ghost.renderOrder = 4; scene.add(this.ghost);
    this.sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL.x + .08, CELL.y + .08, CELL.z + .08)), new THREE.LineBasicMaterial({ color: 0xffb35a })); this.sel.visible = false; scene.add(this.sel);
    // Ibilbide-aurreikuspena (jaurtiketa)
    this.arcN = 48; this.arc = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.arcN * 3), 3)), new THREE.PointsMaterial({ color: 0xfff3c4, size: .14, transparent: true, opacity: .95, depthWrite: false }));
    this.arc.visible = false; this.arc.frustumCulled = false; scene.add(this.arc);
    this.land = new THREE.Mesh(new THREE.RingGeometry(.25, .36, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide })); this.land.rotation.x = -Math.PI / 2; this.land.visible = false; scene.add(this.land);
    this.ghostState = null; this.aimSol = null;
  }
  // ── Sortu / berrabiarazi (berrabiaraztean dena bere lekura: ez da ezer bikoizten)
  spawnAll(state = {}) {
    this.clearAll();
    for (const [id, x, z, y0] of ROCKS) { const y = (y0 ?? ground(x, z)); this._rock(id, V(x, y + .22, z)); }
    for (const [id, i, j, k] of BLOCKS) this._block(id, { i, j, k });
    // Gordetako egoera: kokatutako blokeak (berrezarri) — id bakoitza behin
    for (const c of state.placed || []) { const b = this.blocks.find(b => b.id === c.id); if (b && this.grid.canPlace(c.i, c.j, c.k).ok) { this._setLoose(b, false); this._placeAt(b, c.i, c.j, c.k, true); } }
  }
  clearAll() {
    for (const r of this.rocks) this.g.scene.remove(r.mesh); for (const b of this.blocks) { this.g.scene.remove(b.mesh); if (b.box) this.g.phys.removeBox(b.box); }
    for (const s of this.seams) this.g.scene.remove(s.m);
    this.rocks = []; this.blocks = []; this.seams = []; this.respawns = []; this.carry = null; this.inv.clear(); this.grid.clear();
    this.ghost.visible = this.sel.visible = this.arc.visible = this.land.visible = false;
  }
  _rock(id, home) {
    const m = new THREE.Mesh(this.rockGeo, this.rockMat); m.scale.setScalar(.24); m.castShadow = true; m.position.copy(home); this.g.scene.add(m);
    const r = { id, home: home.clone(), mesh: m, state: 'world', body: { pos: home.clone(), vel: V(), r: .22, asleep: true, bounce: .3, friction: .7 } }; this.rocks.push(r); return r;
  }
  _block(id, home) {
    const m = new THREE.Mesh(this.blockGeo, this.blockMat); m.castShadow = m.receiveShadow = true;
    const moss = new THREE.Mesh(this.mossG, this.mossM); moss.position.set(-.3 + (id.length % 3) * .3, .5, .2); m.add(moss);
    this.g.scene.add(m);
    const b = { id, home: { ...home }, mesh: m, state: 'loose', box: null, cell: null, pos: V() }; this.blocks.push(b);
    this._putLoose(b, V(home.i * CELL.x + 1, home.k, home.j * CELL.z + 1)); return b;
  }
  _setBox(b, center) { if (b.box) this.g.phys.removeBox(b.box); b.box = this.g.phys.addBox({ x: center.x - CELL.x / 2 + .02, y: center.y - .5, z: center.z - CELL.z / 2 + .02 }, { x: center.x + CELL.x / 2 - .02, y: center.y + .5, z: center.z + CELL.z / 2 - .02 }, 'block', b); }
  _putLoose(b, bottom) { b.state = 'loose'; b.cell = null; b.pos.set(bottom.x, bottom.y + .5, bottom.z); b.mesh.position.copy(b.pos); b.mesh.rotation.set(0, 0, 0); this._setBox(b, b.pos); }
  _setLoose(b, keepBox) { if (!keepBox && b.box) { this.g.phys.removeBox(b.box); b.box = null; } }
  _placeAt(b, i, j, k, silent) {
    const r = this.grid.place(b.id, i, j, k); if (!r.ok) return r;
    b.state = 'placed'; b.cell = { i, j, k }; b.pos.set(i * CELL.x + 1, k + .5, j * CELL.z + 1);
    b.from = silent ? null : b.mesh.position.clone(); b.tw = silent ? 1 : 0; if (silent) b.mesh.position.copy(b.pos);
    b.mesh.rotation.set(0, 0, 0); this._setBox(b, b.pos); return r;
  }
  homeOf(b) { return V(b.home.i * CELL.x + 1, b.home.k, b.home.j * CELL.z + 1); }
  // ── Kontsultak
  playerCell(p) { return { i: Math.floor(p.x / CELL.x), j: Math.floor(p.z / CELL.z) }; }
  frontCell(p, yaw) {
    const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const me = this.playerCell(p);
    for (const d of [2.1, 2.6, 3.2]) { const q = p.clone().addScaledVector(f, d); const c = this.playerCell(q); if (c.i !== me.i || c.j !== me.j) return c; }
    return this.playerCell(p.clone().addScaledVector(f, 3.2));
  }
  nearestRock(p) { let best = null, bd = 1.7; for (const r of this.rocks) { if (r.state !== 'world') continue; const d = Math.hypot(r.body.pos.x - p.x, r.body.pos.z - p.z); if (d < bd && Math.abs(r.body.pos.y - p.y - .4) < 1.4) { bd = d; best = r; } } return best; }
  nearestLoose(p) { let best = null, bd = 2.3; for (const b of this.blocks) { if (b.state !== 'loose') continue; const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z); if (d < bd && b.pos.y - .5 > p.y - 1.3 && b.pos.y - .5 < p.y + .9) { bd = d; best = b; } } return best; }
  /** DESMUNTATU helburua: aurreko zutabeko goiko blokea (oinetatik behera 3 maila edo gora 1) */
  unbuildTarget(p, yaw) {
    const c = this.frontCell(p, yaw), feet = Math.round(p.y);
    for (let k = feet + 1; k >= feet - 4; k--) { const cell = this.grid.get(c.i, c.j, k); if (cell) return this.blocks.find(b => b.id === cell.id); }
    const me = this.playerCell(p); // azpian dagoena (zubi gainean zaudenean) ez
    return null;
  }
  /** Mamuaren gelaxka eta baliozkotasuna */
  ghostFor(p, yaw) {
    const c = this.frontCell(p, yaw), feet = Math.round(p.y);
    let top = null; for (let k = feet + 1; k >= feet - 3; k--) if (this.grid.has(c.i, c.j, k)) { top = k; break; }
    const g = this.env.groundTop(c.i, c.j); let k;
    if (top !== null) k = top + 1;
    else if (g < feet - 1.5) k = feet - 1;          // hutsunea: zubia, gainazala oinekin berdin
    else k = Math.max(Math.round(g), feet - 1);
    const res = { i: c.i, j: c.j, k, ok: false, reason: '' };
    if (k > feet + 1) { res.reason = 'altuegi'; return res; }
    if (k < feet - 3) { res.reason = 'beheregi'; return res; }
    const r = this.grid.canPlace(c.i, c.j, k);
    if (!r.ok) { res.reason = r.reason === 'euskarririk ez' ? 'Ez dago euskarririk: lotu ertz edo bloke bati' : r.reason === 'lurra' ? 'Lurra bidean' : 'Beteta'; return res; }
    const min = { x: c.i * CELL.x + .08, y: k + .05, z: c.j * CELL.z + .08 }, max = { x: (c.i + 1) * CELL.x - .08, y: k + .95, z: (c.j + 1) * CELL.z - .08 };
    for (const b of this.g.phys.boxesIn(min, max)) if (b.tag !== 'muga' || true) { if (b.tag === 'block' && b.ref?.state === 'placed') continue; res.reason = 'Oztopo bat dago'; return res; }
    for (const a of this.g.actors()) { if (a.pos.x + .4 > min.x && a.pos.x - .4 < max.x && a.pos.z + .4 > min.z && a.pos.z - .4 < max.z && a.pos.y < max.y && a.pos.y + 1.4 > min.y) { res.reason = a.isPlayer ? 'Harri bera bidean' : 'Norbait bidean'; return res; } }
    res.ok = true; res.joins = r.joins; res.dist = r.dist; return res;
  }
  // ── Ekintzak
  pickRock(r) { if (!this.inv.add(r.id)) return false; r.state = 'held'; r.mesh.visible = false; r.body.asleep = true; this.g.audio.play('pick'); this.g.fx.dust(r.body.pos, 4); this.g.emit('harria-hartu', r); return true; }
  pickBlock(b) {
    if (this.carry) return false;
    if (b.state === 'placed') { // DESMUNTATU
      const { removed, dropped } = this.grid.remove(b.cell.i, b.cell.j, b.cell.k); if (!removed) return false;
      this.g.fx.chips(b.pos, 10); this.g.audio.play('tok');
      for (const d of dropped) { const ob = this.blocks.find(x => x.id === d.id); this._dropSafe(ob); }
      if (dropped.length) this.g.hud.toast('Euskarririk gabeko blokeak askatu dira (ez dira galdu)');
      this.g.emit('desmuntatu', b);
    }
    if (b.box) { this.g.phys.removeBox(b.box); b.box = null; }
    b.state = 'held'; b.cell = null; this.carry = b; this.g.audio.play('grunt'); return true;
  }
  /** Askatutako blokea jokalariaren ondoko leku seguru batera (inoiz ez urera) */
  _dropSafe(b) {
    const p = this.g.player.pos; const cand = [];
    for (let r = 2.4; r <= 6; r += 1.2) for (let a = 0; a < 12; a++) { const x = p.x + Math.cos(a / 12 * 6.283) * r, z = p.z + Math.sin(a / 12 * 6.283) * r; if (inStream(x, z) || inChasm(x, z)) continue; const f = this.g.phys.floorUnder(x, z, p.y + 1.2, .9); if (!isFinite(f.y) || Math.abs(f.y - p.y) > .8) continue; const min = { x: x - .95, y: f.y + .05, z: z - .95 }, max = { x: x + .95, y: f.y + .95, z: z + .95 }; if (this.g.phys.boxesIn(min, max).length) continue; cand.push([x, f.y, z]); }
    if (!cand.length) { this._respawnBlock(b, 0); return; }
    const [x, y, z] = cand[0]; this._putLoose(b, V(x, y, z)); this.g.fx.dust(V(x, y, z), 8);
  }
  dropCarry() {
    const b = this.carry; if (!b) return; const p = this.g.player.pos, yaw = this.g.player.yaw;
    const x = p.x + Math.sin(yaw) * 2.0, z = p.z + Math.cos(yaw) * 2.0; this.carry = null;
    const f = this.g.phys.floorUnder(x, z, p.y + 1.2, .9);
    const min = { x: x - .95, y: f.y + .05, z: z - .95 }, max = { x: x + .95, y: f.y + .95, z: z + .95 };
    if (!isFinite(f.y) || inStream(x, z) || inChasm(x, z) || f.y < p.y - 1.4) { this.g.audio.play(inStream(x, z) ? 'plof' : 'thud'); if (inStream(x, z)) this.g.fx.splash(V(x, STREAM.water, z)); this._respawnBlock(b, 1.5); return; }
    if (this.g.phys.boxesIn(min, max).length) { this._dropSafe(b); return; }
    this._putLoose(b, V(x, f.y, z)); this.g.audio.play('thud'); this.g.fx.dust(V(x, f.y, z), 10);
  }
  _respawnBlock(b, delay) { b.state = 'gone'; b.mesh.visible = false; if (b.box) { this.g.phys.removeBox(b.box); b.box = null; } this.respawns.push({ b, t: delay }); }
  place() {
    const b = this.carry, gs = this.ghostState; if (!b || !gs || !gs.ok) return null;
    this.carry = null; const r = this._placeAt(b, gs.i, gs.j, gs.k, false);
    if (!r.ok) { this.carry = b; return null; }
    // LOTU: josturak distiratu eta soinuak
    const c = b.pos; let n = 0;
    for (const j of r.joins) { const s = new THREE.Mesh(new THREE.PlaneGeometry(j.dk ? CELL.x * .9 : (j.di ? CELL.z * .9 : CELL.x * .9), .9), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      s.position.set(c.x + j.di * CELL.x / 2, c.y + j.dk * .5, c.z + j.dj * CELL.z / 2); if (j.di) s.rotation.y = Math.PI / 2; if (j.dk) { s.rotation.x = Math.PI / 2; s.scale.set(1, CELL.z / .9 * .9, 1); }
      this.g.scene.add(s); this.seams.push({ m: s, t: 0, delay: n * .09 }); this.g.audio.play('tok', { delay: .12 + n * .1 }); n++; }
    this.g.fx.sparkle(V(c.x, c.y + .5, c.z), 0xffd36b, 14); this.g.cam.shake = .25;
    this.g.emit('eraiki', { b, joins: r.joins });
    return r;
  }
  throwRock(from, vel) {
    const id = this.inv.take(); if (!id) return false; const r = this.rocks.find(x => x.id === id);
    r.state = 'flying'; r.mesh.visible = true; r.body.pos.copy(from); r.body.vel.copy(vel); r.body.asleep = false; r.body.restT = 0; r.prev = from.clone(); r.t = 0; r.hitSomething = false;
    this.g.audio.play('whoosh'); this.g.emit('jaurti', r); return true;
  }
  /** Apuntatzea: helburu aktiboetako bat konoan badago, haren aurkako jaurtiketa fisikoa kalkulatu (ez da magikoki aktibatzen) */
  aim(from, dir) {
    let best = null, bestA = .4;
    for (const t of this.g.level.targets()) {
      const to = t.pos.clone().sub(from); const d = to.length(); if (d > 30 || d < 1) continue;
      const h = V(to.x, 0, to.z).normalize(), hd = V(dir.x, 0, dir.z).normalize(); const a = Math.acos(Math.min(1, h.dot(hd)));
      if (a < bestA) { const sol = solveLaunch(from, t.pos, THROW_V); if (sol) { bestA = a; best = { t, vel: sol }; } }
    }
    if (best) return { vel: best.vel, target: best.t };
    const d = dir.clone(); d.y = Math.max(-.2, d.y) + .2; d.normalize(); return { vel: d.multiplyScalar(THROW_V), target: null };
  }
  showArc(from, vel, on) {
    this.arc.visible = this.land.visible = on; if (!on) return;
    const a = this.arc.geometry.attributes.position; const p = from.clone(), v = vel.clone(); let landed = false;
    for (let i = 0; i < this.arcN; i++) {
      if (!landed) for (let s = 0; s < 3; s++) { v.y -= G * .012; p.addScaledVector(v, .012); const gy = this.g.phys.floorUnder(p.x, p.z, p.y + .1).y; if (p.y < gy) { p.y = gy; landed = true; break; } if (this.g.phys.boxesIn({ x: p.x - .1, y: p.y - .1, z: p.z - .1 }, { x: p.x + .1, y: p.y + .1, z: p.z + .1 }).length) { landed = true; break; } }
      a.setXYZ(i, p.x, p.y, p.z);
    }
    a.needsUpdate = true; this.land.position.set(p.x, p.y + .05, p.z);
  }
  // ── Fotograma
  update(dt) {
    const g = this.g, P = g.player;
    // Harri hegalariak
    for (const r of this.rocks) {
      if (r.state !== 'flying') { if (r.state === 'world' && !r.body.asleep) { g.phys.moveSphere(r.body, dt); r.mesh.position.copy(r.body.pos); } continue; }
      r.prev.copy(r.body.pos); r.t += dt;
      const sub = Math.ceil(dt / (1 / 120)), onB = { onBounce: (what, sp) => { if (sp > 3) { g.audio.play('tok', { vol: Math.min(1, sp / 12) }); g.fx.chips(r.body.pos, 4); } if (!r.hitSomething) { r.hitSomething = true; g.emit('harria-lurrean', r); } } };
      for (let k = 0; k < sub && !r.body.asleep; k++) g.phys.moveSphere(r.body, dt / sub, onB);
      r.mesh.position.copy(r.body.pos); r.mesh.rotation.x += dt * 9; r.mesh.rotation.z += dt * 6;
      // Helburuekiko talka (segmentua-esfera)
      for (const t of g.level.targets()) {
        const seg = r.body.pos.clone().sub(r.prev), w = t.pos.clone().sub(r.prev); const L2 = seg.lengthSq(); const u = L2 > 0 ? Math.max(0, Math.min(1, w.dot(seg) / L2)) : 0; const cpt = r.prev.clone().addScaledVector(seg, u);
        if (cpt.distanceTo(t.pos) < t.r + r.body.r) { g.level.onTargetHit(t, r); r.body.vel.multiplyScalar(-.25); r.body.vel.y = 2; r.hitSomething = true; break; }
      }
      if (inStream(r.body.pos.x, r.body.pos.z) && r.body.pos.y < STREAM.water + .1) { g.audio.play('plof'); g.fx.splash(V(r.body.pos.x, STREAM.water, r.body.pos.z)); g.emit('harria-uretan', r); this._rockGone(r, 1.2); continue; }
      if (r.body.pos.y < -6 || r.t > 12) { this._rockGone(r, 1); continue; }
      if (r.body.asleep) { r.state = 'world'; }
    }
    // Berragertzeak (etxera itzuli, leku librea badago)
    for (let k = this.respawns.length - 1; k >= 0; k--) {
      const s = this.respawns[k]; s.t -= dt; if (s.t > 0) continue;
      if (s.r) { const r = s.r; r.state = 'world'; r.body.pos.copy(r.home); r.body.vel.set(0, 0, 0); r.body.asleep = true; r.mesh.visible = true; r.mesh.position.copy(r.home); g.fx.dust(r.home, 6); this.respawns.splice(k, 1); }
      else { const b = s.b, h = this.homeOf(b); const min = { x: h.x - .95, y: h.y + .05, z: h.z - .95 }, max = { x: h.x + .95, y: h.y + .95, z: h.z + .95 }; if (g.phys.boxesIn(min, max).length || g.actors().some(a => Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 1.4)) { s.t = .5; continue; } b.mesh.visible = true; this._putLoose(b, h); g.fx.dust(h, 12); g.audio.play('thud', { vol: .5 }); this.respawns.splice(k, 1); }
    }
    // Eramandako blokea buruaren gainean
    if (this.carry) { const b = this.carry; b.mesh.visible = true; const hp = P.carryAnchor(); b.mesh.position.lerp(hp, Math.min(1, dt * 18)); b.mesh.rotation.y = P.yaw; }
    // Kokatze-animazioa
    for (const b of this.blocks) if (b.state === 'placed' && b.tw < 1) { b.tw = Math.min(1, b.tw + dt / .22); const u = 1 - Math.pow(1 - b.tw, 3); b.mesh.position.lerpVectors(b.from, b.pos, u); if (b.tw >= 1) { b.mesh.position.copy(b.pos); g.fx.dust(V(b.pos.x, b.pos.y - .5, b.pos.z), 8); } }
    // Josturak
    for (let k = this.seams.length - 1; k >= 0; k--) { const s = this.seams[k]; if (s.delay > 0) { s.delay -= dt; s.m.material.opacity = 0; continue; } s.t += dt; s.m.material.opacity = Math.max(0, 1 - s.t / 1.4) * (.7 + .3 * Math.sin(s.t * 30)); if (s.t > 1.4) { g.scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); this.seams.splice(k, 1); } }
    // Mamua / hautapena
    this.ghost.visible = this.sel.visible = false; this.ghostState = null;
    if (g.state === 'play' && this.carry) {
      const gs = this.ghostFor(P.pos, P.yaw); this.ghostState = gs;
      this.ghost.visible = true; this.ghost.position.set(gs.i * CELL.x + 1, gs.k + .5, gs.j * CELL.z + 1);
      const col = gs.ok ? 0x8cff8c : 0xff7a6a; this.ghost.material.color.setHex(col); this.ghostEdge.material.color.setHex(gs.ok ? 0xe0ffe0 : 0xffd0c8);
      this.ghost.material.opacity = .22 + Math.sin(performance.now() / 180) * .08;
    }
  }
  _rockGone(r, delay) { r.state = 'gone'; r.mesh.visible = false; r.body.asleep = true; this.respawns.push({ r, t: delay }); }
  snapshot() { return this.blocks.filter(b => b.state === 'placed').map(b => ({ id: b.id, ...b.cell })); }
}
