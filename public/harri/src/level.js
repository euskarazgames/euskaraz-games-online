// 1. MUNDUAREN gidoia: atalak (A–E), helburuak, neskaren lerroak (euskaraz), 01–12 binetak zinema gisa, bildumagarriak,
// kontrol-puntuak eta gordetzea (sariak ez dira bikoizten: id bakoitza multzo batean).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHECKPOINTS, FLOWERS, CELL, STREAM, PALISADE_Z, PLATEAU_Y, CLIFF_Z } from './layout.js';
import { ground } from './world.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SAVE_KEY = 'harri-gorde-v1';
export const NESKA = 'NESKA', HARRI = 'HARRI';

export function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.v === 1 ? s : null; } catch { return null; } }
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { } }

export class Level {
  constructor(game, props) {
    this.g = game; this.P = props; this.flowerItems = [];
    const fm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d0, emissiveIntensity: .35, roughness: .5 });
    const cm = new THREE.MeshStandardMaterial({ color: 0xf2c23a, emissive: 0x8a5a00, emissiveIntensity: .4, roughness: .5 });
    this.flowerGeo = (() => { const parts = []; for (let i = 0; i < 10; i++) { const p = new THREE.SphereGeometry(.16, 8, 5); p.scale(1.25, .22, .42); p.translate(.2, 0, 0); p.rotateY(-i / 10 * 6.283); parts.push(p); } const pet = mergeGeometries(parts); const c = new THREE.SphereGeometry(.1, 10, 8); c.scale(1, .6, 1); c.translate(0, .03, 0); const g = new THREE.Group(); g.add(new THREE.Mesh(pet, fm), new THREE.Mesh(c, cm)); return g; })();
    this.glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  }
  // ── Egoera berria edo gordetakoa
  start(save) {
    const g = this.g;
    this.flags = { gate: false, bridge: false, bridgeGone: false, firstJoin: false, boar: false, boarStun: false, menhirs: [false, false, false], seal: false, end: false, missLaugh: false, armorHint: false, carryHint: false, plateau: false, figuresC: false, ...(save?.flags || {}) };
    this.cp = save?.cp || 'A'; this.flowers = new Set(save?.flowers || []); this.falls = save?.falls || 0; this.time = save?.time || 0; this.section = this.cp;
    this.hints = {}; this.said = new Set();
    // Mundu-egoera berreraiki (ez gehitu: lehenengo garbitu)
    this.P.gate.reset(); this.P.target.reset(); this.P.seal.reset(); this.P.menhirs.forEach(m => m.reset());
    if (this.flags.gate) { this.P.gate.openNow(); this.P.gate.t = 1; this.P.gate.update(0); this.P.target.hit = true; this.P.target.t = 1; }
    this.flags.menhirs.forEach((on, i) => on && this.P.menhirs[i].light()); this.P.seal.charge(this.flags.menhirs.filter(Boolean).length);
    if (this.flags.seal) { this.P.seal.openNow(); this.P.seal.t = 1; this.P.seal.update(0); }
    g.stones.spawnAll({ placed: save?.placed || [] });
    this._spawnFlowers();
    const c = CHECKPOINTS[this.cp]; g.player.reset(V(c.x, c.y, c.z), c.yaw); g.cam.snapBehind(c.yaw); g.player.hearts = 3; g.hud.setHearts(3);
    g.boar.reset(this.cp === 'D', this.flags.boar);
    g.figures.group.visible = false;
    this._placeGirl();
    this.updateObjective();
  }
  _spawnFlowers() {
    for (const f of this.flowerItems) this.g.scene.remove(f.m); this.flowerItems = [];
    for (const [id, x, y, z] of FLOWERS) { if (this.flowers.has(id)) continue; const m = this.flowerGeo.clone(); const yy = y > 0 ? y : ground(x, z); m.position.set(x, yy + .7, z); const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(1.6, 1.6, 1); m.add(glow); this.g.scene.add(m); this.flowerItems.push({ id, m, base: yy + .7 }); }
  }
  _placeGirl() {
    const G = this.g.girl, f = this.flags; G.visible = true; G.look = this.g.player.pos; G.setMode('idle');
    const at = { A: [3.5, 74.5], B: [-2.5, 42], C: [-4, 18.5], C2: [-3, 6], D: P2(this.P.hide), E: [-5, -10.5], E2: [-5, -10.5], E3: [-5, -10.5] }[this.cp];
    function P2(v) { return [v.x, v.z]; }
    if (this.cp === 'D') G.setMode('hide');
    G.teleport(V(at[0], ground(at[0], at[1]), at[1]), Math.PI);
  }
  save() {
    const s = { v: 1, cp: this.cp, flags: this.flags, flowers: [...this.flowers], placed: this.g.stones.snapshot(), falls: this.falls, time: this.time };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { }
  }
  checkpoint(cp) { if (this.cp === cp) return; this.cp = cp; this.section = cp; this.save(); this.g.hud.toast('Kontrol-puntua gordeta', 1.4); }
  // ── Helburuak (HUD)
  updateObjective() {
    const f = this.flags, n = this.flowers.size, lit = f.menhirs.filter(Boolean).length; let o = '';
    if (!f.gate) o = this.section === 'A' ? 'Jarraitu neskari kastrorantz' : 'Jaurti harri bat ituari: soka ateari lotuta dago';
    else if (!f.bridge) o = this.g.player.pos.z > 22 ? 'Zeharkatu kastroa errekaraino' : 'Eraiki zubi bat errekaren gainean (3 bloke)';
    else if (!f.bridgeGone) o = 'Desmuntatu zubia, inork jarrai ez diezazuen';
    else if (!f.boar) o = f.boarStun ? 'Orain! Jaurti harri bat basurde zorabiatuari' : 'Uxatu basurdea: jarri bloke bat haren bidean';
    else if (!f.plateau) o = 'Igo goi-lautadara: eraiki zutabe bat (2 bloke)';
    else if (lit < 3) o = `Piztu zutarriak harriak jaurtiz (${lit}/3)`;
    else if (!f.end) o = 'Sartu santutegian';
    this.g.hud.setObjective(o, `✿ Haraneko loreak ${n}/${FLOWERS.length}`);
  }
  // ── Helburu aktiboak (apuntatze-laguntzarako eta talketarako)
  targets() {
    const out = [], f = this.flags;
    if (!f.gate) out.push({ kind: 'itua', pos: this.P.target.center, r: this.P.target.r });
    if (this.section >= 'E' || f.boar) this.P.menhirs.forEach((m, i) => { if (!m.lit) out.push({ kind: 'zutarria', i, pos: m.pos, r: m.r }); });
    const b = this.g.boar; if (b.alive && b.state !== 'sleep') out.push({ kind: 'basurdea', pos: b.head(), r: .8 });
    return out;
  }
  onTargetHit(t, rock) {
    const g = this.g, f = this.flags;
    if (t.kind === 'itua' && !f.gate) {
      f.gate = true; this.P.target.hit = true; g.audio.play('ding'); g.fx.sparkle(t.pos, 0xffd36b, 24); g.fx.ring(t.pos, 0xffd36b, 2, .6);
      this.g.run(this.sceneGate());
    } else if (t.kind === 'zutarria' && !f.menhirs[t.i]) {
      f.menhirs[t.i] = true; this.P.menhirs[t.i].light(); const lit = f.menhirs.filter(Boolean).length; this.P.seal.charge(lit);
      g.audio.play('seal'); g.fx.sparkle(t.pos, 0xffc86a, 30); g.fx.ring(t.pos, 0xffc86a, 2.4, .7); g.player.setExpr('joy', 1.5);
      g.hud.toast(`Zutarria piztuta (${lit}/3)`, 2);
      if (lit === 2 && !f.menhirs[2]) this.say(NESKA, 'Hirugarrena irlan dago, hormaren atzean. Zubi bat beharko duzu!', 4, 'irla');
      if (lit === 3) this.g.run(this.sceneSeal());
      this.save(); this.updateObjective();
    } else if (t.kind === 'basurdea') g.boar.onRock(rock);
  }
  say(who, what, dur = 3, once = null) { if (once) { if (this.said.has(once)) return; this.said.add(once); } this.g.hud.say(who, what, dur); }
  hint(key, text, dur = 3.5) { if (this.hints[key]) return; this.hints[key] = true; this.g.hud.toast(text, dur); }
  // ── Gertaerak
  onEvent(name, d) {
    const g = this.g, f = this.flags, T = g.input.touch;
    if (name === 'harria-hartu') this.hint('jaurti', T ? 'Eutsi JAURTI apuntatzeko, askatu jaurtitzeko' : 'Eutsi F (edo klik) apuntatzeko eta askatu jaurtitzeko', 3.5);
    if (name === 'harria-lurrean' && !f.gate && this.section !== 'A' && !f.missLaugh) { f.missLaugh = true; g.girl.setMode('cheer'); setTimeout(() => g.girl.mode === 'cheer' && g.girl.setMode('idle'), 1200); this.say(NESKA, 'Hi, hi! Berriro, Harri!', 2.5); g.player.setExpr('surprised', 1.2); }
    if (name === 'harria-uretan' && f.gate && !f.bridge) this.say(NESKA, 'Plof! Hori ez da zubia, Harri…', 2.5, 'plof');
    if (name === 'eraiki' && f.gate && !f.bridge && !f.firstJoin && d.joins.some(j => j.type === 'lurra')) { f.firstJoin = true; this.say(NESKA, 'Hori da!', 2.2); g.girl.setMode('cheer'); setTimeout(() => g.girl.mode === 'cheer' && g.girl.setMode('idle'), 1300); }
    if (name === 'eraiki' || name === 'desmuntatu') this._checkBridge();
    if (name === 'basurdea-blindatua' && d >= 1) { if (!f.armorHint) { f.armorHint = true; this.say(NESKA, 'Aurretik ez dio ezer egiten! Jarri bloke bat bere bidean: talka egingo du!', 4.5); } }
    if (name === 'basurdea-talka' && !f.boar) { f.boarStun = true; this.say(NESKA, 'Zorabiatuta dago! Orain, jaurti harri bat!', 3, 'stun'); this.updateObjective(); }
    if (name === 'basurdea-ihes' && !f.boar) { f.boar = true; g.audio.play('chime'); this.say(NESKA, 'Badoa! Eskerrik asko, Harri!', 3); g.girl.setMode('cheer'); setTimeout(() => this.g.run(this.sceneToCliff()), 1500); this.updateObjective(); }
  }
  _bridgeWalkable() { const j0 = Math.floor(STREAM.z1 / CELL.z) - 1, j1 = Math.floor(STREAM.z0 / CELL.z); return this.g.stones.grid.walkable(-1, (i, j) => j === j0, (i, j) => j === j1); }
  _bridgePath() {
    const grid = this.g.stones.grid, j0 = Math.floor(STREAM.z1 / CELL.z) - 1, j1 = Math.floor(STREAM.z0 / CELL.z);
    const start = grid.list().filter(c => c.k === -1 && c.j === j0); const prev = new Map(), q = [...start]; start.forEach(c => prev.set(c, null)); let end = null;
    while (q.length) { const c = q.shift(); if (c.j === j1) { end = c; break; } for (const [di, dj] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const n = grid.get(c.i + di, c.j + dj, -1); if (n && !prev.has(n)) { prev.set(n, c); q.push(n); } } }
    const cells = []; for (let c = end; c; c = prev.get(c)) cells.unshift(c); return cells.map(c => [c.i * CELL.x + 1, c.j * CELL.z + 1]);
  }
  _checkBridge() {
    const f = this.flags; if (!f.gate) return;
    if (!f.bridge && this._bridgeWalkable()) { f.bridge = true; this.g.audio.play('krak', { delay: .35 }); this.g.run(this.sceneBridge()); }
    else if (f.bridge && !f.bridgeGone && !this._bridgeWalkable()) {
      if (this.g.player.pos.z < STREAM.z0) { f.bridgeGone = true; this.g.run(this.sceneBridgeGone()); }
      else this.say(NESKA, 'Harri, ni beste aldean nago! Eraiki berriro zubia eta desegin hemendik.', 4.5, 'okerreko-ertza');
    }
    this.updateObjective();
  }
  // ── Fotogramako egiaztapenak
  update(dt) {
    const g = this.g, f = this.flags, p = g.player.pos;
    if (g.state === 'play') this.time += dt;
    // Loreak
    const t = performance.now() / 1000;
    for (let k = this.flowerItems.length - 1; k >= 0; k--) { const it = this.flowerItems[k]; it.m.rotation.y = t * 1.2; it.m.position.y = it.base + Math.sin(t * 2 + k) * .12;
      if (g.state === 'play' && Math.hypot(p.x - it.m.position.x, p.z - it.m.position.z) < 1.1 && Math.abs(p.y + .7 - it.m.position.y) < 1.4) { this.flowers.add(it.id); g.scene.remove(it.m); this.flowerItems.splice(k, 1); g.audio.play('chime'); g.fx.sparkle(it.m.position, 0xffffff, 20); g.hud.toast(`✿ Haraneko lorea (${this.flowers.size}/${FLOWERS.length})`, 2); g.player.setExpr('joy', 1.2); this.save(); this.updateObjective(); } }
    if (g.state !== 'play') return;
    // A → B
    if (this.section === 'A') {
      if (p.z < 71 && p.z > 66) this.hint('log', g.input.touch ? 'JAUZI: enborraren gainetik' : 'Zuriunea: jauzi (luzeago sakatuta, gorago)');
      if (p.z < 57 && p.z > 50 && p.x > 1) this.hint('ledge', g.input.touch ? 'Jauzi bikoitza: sakatu JAUZI berriro airean' : 'Jauzi bikoitza: sakatu zuriunea berriro airean');
      if (p.z < 50) { this.checkpoint('B'); this.say(NESKA, 'Atea itxita dago… Ikusten duzu itua? Bere soka ateari lotuta dago.', 5); this.hint('hartu', g.input.touch ? 'HARTU: harriak jaso (gehienez 3)' : 'E: harriak hartu (gehienez 3)', 4); this.updateObjective(); }
    }
    // B → C (atea zeharkatu)
    if (f.gate && (this.cp === 'B' || this.cp === 'A') && p.z < PALISADE_Z - 1) { this.checkpoint('C'); this.updateObjective(); }
    if (f.gate && !f.bridge && p.z < 22 && !f.figuresC) {
      f.figuresC = true; this.say(NESKA, 'Erreka… Ezin dut igerian egin.', 3);
      setTimeout(() => { if (!this.flags.bridge) { this.g.figures.show([0, 46], [1, 33], 40); this.say(NESKA, 'Datoz! Azkar, Harri! Blokeekin zubi bat…', 4); this.g.audio.play('dum', { vol: .4 }); } }, 3800);
      this.hint('blokeak', g.input.touch ? 'HARTU bloke bat, begiratu errekari eta sakatu ERAIKI' : 'E: blokea hartu · begiratu errekari · R: eraiki eta lotu', 5);
      this.updateObjective();
    }
    if (g.stones.carry && !f.carryHint) { f.carryHint = true; this.g.hud.toast('Mamu berdea: hemen eraiki daiteke. Gorria: ez dago euskarririk (lotu ertz edo bloke bati).', 5); }
    // D: basurdea esnatu
    if (f.bridgeGone && !f.boar && g.boar.state === 'sleep' && p.z < 6) { g.boar.reset(true); this.checkpoint('D'); this.say(NESKA, 'Basurde bat! Kontuz, Harri!', 3); g.girl.walk([[P2(this.P.hide)[0] + 1, 7.5], P2(this.P.hide)], 3.6).then(() => g.girl.setMode('hide')); this.updateObjective(); }
    function P2(v) { return [v.x, v.z]; }
    // E: goi-lautada
    if (f.boar && !f.plateau && p.y > PLATEAU_Y - .2 && p.z < CLIFF_Z) { f.plateau = true; this.checkpoint('E2'); g.audio.play('chime'); this.say(NESKA, 'Ederki! Hiru zutarri zahar daude: piztu itzazu harriekin!', 4.5); this.updateObjective(); }
    if (f.plateau && p.z < -35 && this.cp === 'E2') this.checkpoint('E3');
    // Santutegiko atea
    if (f.seal && !f.end && p.distanceTo(this.P.seal.door) < 2.4) { f.end = true; this.g.run(this.sceneEnd()); }
  }

  // ═════════════════════════════ ZINEMAK (gidoia) ═════════════════════════════
  *sceneIntro() {
    const g = this.g, C = g.cam, H = g.hud, Gl = g.girl, P = g.player;
    g.setSky('dawn'); H.bars(true); H.show(false); P.frozen = true; P.curl = 1; P.setExpr('sleep', 99); P.sleep = 1;
    P.reset(V(2, 0, 78), Math.PI); P.frozen = true; P.curl = 1;
    Gl.teleport(V(-6, 0, 92), Math.PI * .8);
    // 01 · Plano orokorra / egunsentia
    C.shot([-14, 14, 98], [0, 2, 40], 0); C.shot([-8, 11, 92], [0, 1.5, 30], 6);
    H.fade(false); yield 1.2; H.cartela('Duela negu asko…'); yield 3.2; H.cartela(''); yield .8;
    // 02 · Ihesa: neska iratzeen artean, zuziak atzean
    g.figures.show([-4, 99], [-2, 95], 12);
    C.shot([4, 2.2, 86], [-4, 1, 92], 0); Gl.walk([[-3, 86], [0, 81], [1.4, 79.6]], 3.8); yield 1.2; H.say(NESKA, 'Ama…', 2.4); yield 2.3;
    // 03 · Aurkikuntza: harri biribila sustraien artean
    C.shot([3.2, 1.0, 75.6], [2, .6, 78], 0); C.shot([3.0, .9, 76.2], [2, .6, 78], 2.5); g.audio.play('tok', { vol: .5 }); H.say('', '— krak —', 1.6); yield 2.4;
    // 04 · Ahotsa
    Gl.look = P.pos; Gl.setMode('reach'); C.shot([4.6, 1.4, 77.4], [1.8, .8, 78.6], 0); C.shot([4.2, 1.3, 77.6], [1.8, .8, 78.6], 3); H.say(NESKA, 'Harri… lagundu, mesedez.', 3.4); yield 3.6;
    // 05 · Taupada
    C.shot([2.6, 1.0, 76.3], [2, .7, 78], 0); g.audio.play('dum'); g.fx.sparkle(V(2, .9, 77.7), 0xffb35a, 10); H.say('', '— dum… dum… —', 2.2); g.cam.shake = .2; yield 1.0; g.audio.play('dum', { vol: .8 }); g.fx.sparkle(V(2, .9, 77.7), 0xffb35a, 14); yield 1.6;
    // 06 · Begiak irekitzen dira
    C.shot([2, 1.25, 76.5], [2, 1.05, 78], 0); P.sleep = 0; P.setExpr('surprised', 3); yield .6; H.say(HARRI, '…?', 2.2); yield 2.4;
    // 07 · Altxatu eta eskuei begiratu
    Gl.setMode('scared'); C.shot([5, .9, 74.5], [2, 1.2, 78], 0); C.shot([5.6, 1.1, 74], [2, 1.4, 78], 3.5); P.standUp = 1; yield 2.2; Gl.setMode('idle'); H.say(NESKA, 'Kaixo, Harri.', 2.6); P.setExpr('joy', 2.5); yield 2.8;
    g.figures.hide();
    // Jokoa
    H.bars(false); g.setSky('day', 6); P.frozen = false; P.curl = 0; P.standUp = 0; C.endCine(P); C.snapBehind(Math.PI); H.show(true);
    Gl.walk([[2.5, 70], [1.5, 60], [0, 52], [-2.5, 42]], 2.9).then(() => { Gl.look = P.pos; });
    this.say(NESKA, 'Etorri! Kastroa hor dago!', 2.6);
    this.hint('mugitu', g.input.touch ? 'Ezkerreko hatza: mugitu · Eskuinekoa: kamera' : 'WASD: mugitu · Sagua arrastatu: kamera', 4.5);
    this.updateObjective(); this.save();
  }
  *sceneGate() {
    const g = this.g, C = g.cam, H = g.hud;
    g.enterCine(); yield .2;
    C.shot([g.player.pos.x + 3, 3.5, g.player.pos.z + 3], [2, 3.2, 35], 0); C.shot([6, 3, 44], [0, 2.5, PALISADE_Z], 1.6); yield .6;
    this.P.gate.openNow(); g.audio.play('chime'); g.audio.play('thud', { delay: .5 }); yield 1.8;
    H.say(NESKA, 'Bikain! Atea ireki da!', 2.2); yield 1.0;
    g.exitCine();
    g.girl.walk([[0, 40], [0, 36], [-1, 30], [0, 23], [-4, 18.5]], 2.8).then(() => { g.girl.look = g.player.pos; });
    setTimeout(() => this.say(NESKA, 'Denak santutegira joan dira… Ama ere bai, ziur.', 3.6), 6500);
    this.updateObjective(); this.save();
  }
  *sceneBridge() {
    const g = this.g, C = g.cam, H = g.hud, Gl = g.girl, P = g.player;
    yield .5; g.enterCine();
    const path = this._bridgePath(); if (!path.length) { g.exitCine(); return; }
    const near = path[0], far = path[path.length - 1];
    // 11 · Pasabidea: neska korrika beste aldera, Harrik eusten dio
    P.reset(V(near[0] + 1.6, 0, near[1] + 2.4), Math.PI); P.frozen = true; P.setExpr('determined', 3);
    C.shot([near[0] + 7, 3.2, (near[1] + far[1]) / 2 + 2], [near[0], 0, (near[1] + far[1]) / 2], 0);
    Gl.teleport(V(near[0] - .5, 0, near[1] + 3.5), Math.PI);
    yield Gl.walk([[near[0], near[1] + 2.2], ...path.map(p => [p[0], p[1]]), [far[0], far[1] - 3]], 4.2);
    // Harri ere pasatzen da
    P.reset(V(far[0] + 1.4, 0, far[1] - 2.6), Math.PI); P.frozen = true;
    // 12 · Promesa: eskua bular leunean, margarita kopetan
    Gl.teleport(V(far[0] + .2, 0, far[1] - 3.6), 0); Gl.look = P.pos; Gl.setMode('reach'); P.yaw = Math.PI; P.root.rotation.y = P.yaw;
    C.shot([far[0] + 3.2, 1.6, far[1] - 4.6], [far[0] + .8, 1.1, far[1] - 3], 0); C.shot([far[0] + 2.8, 1.5, far[1] - 4.2], [far[0] + .8, 1.15, far[1] - 3], 4);
    yield 1.0; H.say(NESKA, 'Eskerrik asko.', 2.8); P.setExpr('joy', 4); g.fx.sparkle(V(far[0] + 1.4, 1.9, far[1] - 2.6), 0xffffff, 12); yield 3.2;
    Gl.setMode('idle');
    // Arriskua: zuziak beste ertzera iristen dira
    g.figures.show([0, 30], [near[0], 20.5], 6); C.shot([far[0] - 3, 3, far[1] - 6], [near[0], 1.5, 20], 1.4); yield 1.6;
    H.say(NESKA, 'Zubia! Desegin ezazu, jarrai ez diezaguten!', 3.4); Gl.setMode('scared'); yield 2.2;
    g.exitCine(); P.frozen = false; Gl.setMode('idle'); this.checkpoint('C2'); this.updateObjective();
    this.hint('desmuntatu', g.input.touch ? 'Begiratu zubiko bloke bati eta sakatu HARTU desmuntatzeko' : 'Begiratu zubiko bloke bati eta sakatu E desmuntatzeko', 5);
  }
  *sceneBridgeGone() {
    const g = this.g; yield .4;
    this.say(NESKA, 'Ez dira pasatuko. Goazen santutegira!', 3.2); g.figures.hide(); this.checkpoint('C2'); this.updateObjective(); this.save();
  }
  *sceneToCliff() {
    const g = this.g; g.girl.setMode('idle'); yield .4;
    g.girl.walk([[-6, 0], [-5, -10.5]], 3).then(() => { g.girl.look = g.player.pos; this.say(NESKA, 'Santutegia goian dago, baina harmaila zaharrak eroriak daude…', 4); });
    this.checkpoint('E'); this.updateObjective();
  }
  *sceneSeal() {
    const g = this.g, C = g.cam, H = g.hud; yield .8; g.enterCine();
    C.shot([4, PLATEAU_Y + 3, -38], [0, PLATEAU_Y + 1.6, -46.5], 0); C.shot([2.5, PLATEAU_Y + 2.4, -40], [0, PLATEAU_Y + 1.6, -46.5], 3); yield .8;
    g.audio.play('dum'); g.cam.shake = .3; yield 1; this.P.seal.openNow(); this.flags.seal = true; g.audio.play('chime'); g.fx.sparkle(V(0, PLATEAU_Y + 1.6, -45.5), 0xffd36b, 40); yield 2.4;
    g.exitCine(); this.say(NESKA, 'Zigilua ireki da! Sartu, Harri!', 3); this.updateObjective(); this.save();
  }
  *sceneEnd() {
    const g = this.g, C = g.cam, H = g.hud, Gl = g.girl, P = g.player; g.enterCine();
    const d = this.P.seal.door; P.reset(V(d.x + .9, d.y, d.z + 2.2), Math.PI); P.frozen = true;
    Gl.teleport(V(d.x - 1, d.y, d.z + 3), Math.PI); Gl.visible = true;
    C.shot([d.x + 4, d.y + 2.2, d.z + 7], [d.x, d.y + 1.4, d.z], 0); C.shot([d.x + 3, d.y + 1.8, d.z + 5.5], [d.x, d.y + 1.4, d.z], 4);
    yield .6; g.setSky('dusk', 5); H.say(NESKA, 'Ama!', 2); yield .4; yield Gl.walk([[d.x - .2, d.z + .4]], 3.6);
    Gl.look = P.pos; yield .6; H.say(NESKA, 'Harri, zatoz! Hau ere zure etxea da.', 3.6); P.setExpr('joy', 6); yield 3.8;
    Gl.walk([[d.x, d.z - 1.5]], 2).then(() => { Gl.visible = false; });
    C.shot([d.x + 9, d.y + 7, d.z + 16], [d.x, d.y + 1.5, d.z], 5); yield 2.5;
    H.cartela('1. MUNDUA OSATUTA'); g.audio.play('chime'); yield 3;
    H.cartela(''); this.flags.end = true; this.save(); g.finish();
  }
}
