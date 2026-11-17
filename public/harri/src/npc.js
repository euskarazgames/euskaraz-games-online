// Neska (bide-puntu gidoidunak: ez da inoiz IA akatsengatik harrapatuta geratzen), basurdea (ingeniaritza-borroka)
// eta urrutiko zuzi-irudiak (tentsioa, borrokarik gabe).
import * as THREE from 'three';
import { Rig, NESKA_JOINTS, BOAR_JOINTS } from './models.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export class Girl {
  constructor(game, model) {
    this.g = game; this.root = new THREE.Group(); this.root.add(model.scene); game.scene.add(this.root);
    this.rig = new Rig(model.scene, NESKA_JOINTS); this.pos = V(); this.yaw = 0; this.path = []; this.speed = 2.6; this.mode = 'idle'; this.phase = 0; this.look = null; this.done = null; this.visible = true;
  }
  teleport(p, yaw = this.yaw) { this.pos.copy(p); this.yaw = yaw; this.path = []; this.mode = 'idle'; this._snap(); }
  walk(points, speed = 2.6) { this.path = points.map(p => V(p[0], 0, p[1])); this.speed = speed; this.mode = 'walk'; return new Promise(res => { this.done = res; }); }
  setMode(m) { this.mode = m; this.path = []; }
  _snap() { const f = this.g.phys.floorUnder(this.pos.x, this.pos.z, this.pos.y + .8, .2); if (isFinite(f.y)) this.pos.y += (f.y - this.pos.y) * .5; this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; }
  update(dt) {
    this.root.visible = this.visible; if (!this.visible) return;
    let moving = false;
    if (this.path.length) {
      const tgt = this.path[0]; const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < .15) { this.path.shift(); if (!this.path.length) { this.mode = 'idle'; const r = this.done; this.done = null; r?.(); } }
      else { const st = Math.min(d, this.speed * dt); this.pos.x += dx / d * st; this.pos.z += dz / d * st; this.yaw = lerpA(this.yaw, Math.atan2(dx, dz), Math.min(1, dt * 10)); moving = true; }
    } else if (this.look) { const dx = this.look.x - this.pos.x, dz = this.look.z - this.pos.z; if (Math.hypot(dx, dz) > .5) this.yaw = lerpA(this.yaw, Math.atan2(dx, dz), Math.min(1, dt * 4)); }
    const f = this.g.phys.floorUnder(this.pos.x, this.pos.z, this.pos.y + .8, .15); if (isFinite(f.y)) this.pos.y += (f.y - this.pos.y) * Math.min(1, dt * 14);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    // Animazioa
    const R = this.rig, t = performance.now() / 1000;
    const run = this.speed > 3.2;
    if (moving) this.phase += dt * this.speed * (run ? 3.0 : 3.6);
    const s = Math.sin(this.phase), a = moving ? (run ? .85 : .5) : 0;
    let lean = moving ? (run ? -.25 : -.06) : 0, hy = Math.abs(s) * .04 * (moving ? 1 : 0), armL = -s * a * .9, armR = s * a * .9, armZ = .1;
    if (this.mode === 'hide') { lean = .3; hy = -.16; armL = -1.3; armR = -1.3; }
    if (this.mode === 'cheer') { hy = Math.abs(Math.sin(t * 7)) * .18; armL = -2.8; armR = -2.8; armZ = .4; }
    if (this.mode === 'scared') { lean = .12; armL = -1.0 + Math.sin(t * 20) * .05; armR = -1.0; }
    if (this.mode === 'reach') { armL = -1.5; armR = -.2; lean = -.1; }
    if (!moving && this.mode === 'idle') { hy = Math.sin(t * 2) * .01; armL = Math.sin(t * 1.3) * .05; armR = -armL; }
    R.off('hips', 0, hy, 0); R.rot('torso', lean, 0, 0);
    R.rot('leg_L', s * a, 0, 0); R.rot('leg_R', -s * a, 0, 0);
    R.rot('arm_L', armL, 0, armZ); R.rot('arm_R', armR, 0, -armZ);
    R.rot('head', this.mode === 'hide' ? .3 : 0, 0, 0);
  }
}

export const BOAR_ZONE = { x0: -14.5, x1: 14.5, z0: -12, z1: 8.5 };
export class Boar {
  constructor(game, model) {
    this.g = game; this.root = new THREE.Group(); this.root.add(model.scene); game.scene.add(this.root);
    this.rig = new Rig(model.scene, BOAR_JOINTS); this.pos = V(); this.yaw = 0; this.r = .7;
    this.reset(false);
  }
  reset(active, gone = false) { this.pos.set(6, 0, -5); this.yaw = -Math.PI / 2; this.state = gone ? 'gone' : active ? 'patrol' : 'sleep'; this.t = 0; this.wander = null; this.dir = V(); this.travel = 0; this.armorHits = 0; this.root.visible = !gone; this.root.scale.setScalar(1); this.phase = 0; this._snap(); }
  get alive() { return this.state !== 'gone' && this.state !== 'flee'; }
  _snap() { this.pos.y = this.g.phys.groundAt(this.pos.x, this.pos.z); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; }
  inZone(p) { return p.x > BOAR_ZONE.x0 && p.x < BOAR_ZONE.x1 && p.z > BOAR_ZONE.z0 && p.z < BOAR_ZONE.z1; }
  head() { return V(this.pos.x + Math.sin(this.yaw) * .7, this.pos.y + .55, this.pos.z + Math.cos(this.yaw) * .7); }
  onRock(rock) {
    const g = this.g;
    if (this.state === 'stun') { this.state = 'flee'; this.t = 0; g.audio.play('grunt'); g.fx.sparkle(this.head(), 0xffffff, 16); g.emit('basurdea-ihes'); return; }
    if (this.state === 'gone' || this.state === 'flee') return;
    this.armorHits++; g.audio.play('tok'); g.fx.chips(this.head(), 6); this.state = 'alert'; this.t = 0; g.emit('basurdea-blindatua', this.armorHits);
  }
  update(dt, player) {
    const g = this.g; if (this.state === 'gone') { this.root.visible = false; return; }
    this.t += dt; let speed = 0;
    const toP = V(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z), dP = toP.length();
    const playerIn = this.inZone(player.pos) && g.state === 'play';
    switch (this.state) {
      case 'sleep': break;
      case 'patrol': {
        if (!this.wander || this.pos.distanceTo(this.wander) < .6 || this.t > 6) { this.t = 0; this.wander = V(BOAR_ZONE.x0 + 4 + Math.random() * (BOAR_ZONE.x1 - BOAR_ZONE.x0 - 6), 0, BOAR_ZONE.z0 + 2 + Math.random() * 12); }
        const d = V(this.wander.x - this.pos.x, 0, this.wander.z - this.pos.z); if (d.length() > .1) { d.normalize(); this.yaw = lerpA(this.yaw, Math.atan2(d.x, d.z), dt * 3); speed = 1.5; }
        if (playerIn && dP < 11.5 && player.hurtT <= 0) { this.state = 'alert'; this.t = 0; }
        break;
      }
      case 'alert': {
        this.yaw = lerpA(this.yaw, Math.atan2(toP.x, toP.z), Math.min(1, dt * 8));
        if (Math.random() < dt * 8) g.fx.dust(V(this.pos.x + Math.sin(this.yaw) * .5, this.pos.y, this.pos.z + Math.cos(this.yaw) * .5), 2);
        if (this.t < dt * 1.5) g.audio.play('grunt', { vol: .8 });
        if (this.t > 1.1) { if (!playerIn) { this.state = 'patrol'; this.t = 0; break; } this.state = 'charge'; this.t = 0; this.dir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.travel = 0; g.emit('basurdea-erasoa'); }
        break;
      }
      case 'charge': {
        speed = 10.5; this.yaw = Math.atan2(this.dir.x, this.dir.z);
        if (Math.random() < dt * 20) g.audio.play('hoof', { vol: .6 });
        if (Math.random() < dt * 25) g.fx.dust(this.pos, 2);
        if (dP < 1.15 && Math.abs(player.pos.y - this.pos.y) < 1.2) { if (player.hurt(toP.clone().normalize().add(this.dir).normalize())) { this.state = 'recover'; this.t = 0; } }
        if (this.travel > 16 || !this.inZone(this.head())) { this.state = 'recover'; this.t = 0; g.fx.dust(this.pos, 10); }
        break;
      }
      case 'stun': { if (Math.random() < dt * 6) g.fx.sparkle(V(this.pos.x, this.pos.y + 1.2, this.pos.z), 0xfff3a0, 2); if (this.t > 4.5) { this.state = 'patrol'; this.t = 0; } break; }
      case 'recover': { if (this.t > 1.3) { this.state = 'patrol'; this.t = 0; } break; }
      case 'flee': {
        const away = V(15, 0, -14).sub(this.pos); if (away.length() > .5) { away.normalize(); this.yaw = lerpA(this.yaw, Math.atan2(away.x, away.z), dt * 6); speed = 8; }
        if (this.t > 2.6) { const k = Math.max(0, 1 - (this.t - 2.6) / .6); this.root.scale.setScalar(k); if (k <= 0) { this.state = 'gone'; this.root.visible = false; } }
        break;
      }
    }
    const nSub = speed > 0 ? Math.ceil(speed * dt / .3) : 0;
    for (let sub = 0; sub < nSub && speed > 0; sub++) {
      const step = speed * dt / nSub, nx = this.pos.x + Math.sin(this.yaw) * step, nz = this.pos.z + Math.cos(this.yaw) * step;
      const hx = nx + Math.sin(this.yaw) * .55, hz = nz + Math.cos(this.yaw) * .55, gy = g.phys.groundAt(nx, nz);
      const hit = this.state !== 'flee' && g.phys.boxesIn({ x: hx - .45, y: gy + .15, z: hz - .45 }, { x: hx + .45, y: gy + .9, z: hz + .45 }).find(b => b.tag !== 'muga' || this.state === 'charge');
      if (hit && this.state === 'charge') { speed = 0; this.state = 'stun'; this.t = 0; g.audio.play('thud'); g.audio.play('stun', { delay: .1 }); g.fx.chips(this.head(), 12); g.fx.dust(this.head(), 10); g.cam.shake = .5; g.emit('basurdea-talka', hit); }
      else if (hit) { this.wander = null; }
      else if (this.state === 'flee' || this.inZone(V(nx, 0, nz))) { this.pos.x = nx; this.pos.z = nz; this.travel += step; }
      else if (this.state === 'charge') { this.state = 'recover'; this.t = 0; speed = 0; }
      else { this.wander = null; speed = 0; }
      if (hit) speed = 0;
    }
    this.pos.y = g.phys.groundAt(this.pos.x, this.pos.z);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    // Animazioa
    const R = this.rig; this.phase += dt * speed * 2.6; const s = Math.sin(this.phase), a = Math.min(1, speed / 6) * .7;
    R.rot('leg_FL', s * a, 0, 0); R.rot('leg_BR', s * a, 0, 0); R.rot('leg_FR', -s * a, 0, 0); R.rot('leg_BL', -s * a, 0, 0);
    let hx = 0, bz = 0; const t = performance.now() / 1000;
    if (this.state === 'alert') { hx = .25 + Math.sin(t * 18) * .05; R.rot('leg_FL', Math.sin(t * 14) * .5, 0, 0); }
    if (this.state === 'charge') hx = .3;
    if (this.state === 'stun') { hx = -.1; bz = Math.sin(t * 6) * .12; }
    if (this.state === 'sleep') hx = .35;
    R.rot('head', hx, this.state === 'stun' ? Math.sin(t * 5) * .3 : 0, 0); R.rot('body', 0, 0, bz);
    R.off('body', 0, Math.abs(s) * .04 * a, 0);
  }
}

// Urrutiko zuzi-irudiak: soineko ilunak, herri zehatzik gabeko ikurrik ez; ez dira borrokan sartzen.
export class Figures {
  constructor(game) {
    this.g = game; this.group = new THREE.Group(); game.scene.add(this.group); this.list = [];
    const cloak = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 }), flameM = new THREE.SpriteMaterial({ color: 0xffa040, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .42, 1.55, 8), cloak); body.position.y = .78; f.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), cloak); head.position.y = 1.7; f.add(head);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 5), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); stick.position.set(.32, 1.45, .1); stick.rotation.z = -.25; f.add(stick);
      const fl = new THREE.Sprite(flameM.clone()); fl.scale.set(.6, .8, 1); fl.position.set(.42, 2.0, .1); f.add(fl);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff8a30, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(2.6, 2.6, 1); glow.position.copy(fl.position); f.add(glow);
      this.group.add(f); this.list.push({ f, fl, glow, from: V(), to: V(), off: Math.random() * 6 });
    }
    this.group.visible = false; this.t = 0; this.dur = 1; this.alpha = 0; this.target = 0;
  }
  show(from, to, dur) { this.group.visible = true; this.t = 0; this.dur = dur; this.target = 1; this.list.forEach((o, i) => { o.from.set(from[0] + (i - 1.5) * 1.8, 0, from[1] + (i % 2) * 1.2); o.to.set(to[0] + (i - 1.5) * 1.8, 0, to[1] + (i % 2) * 1.2); }); }
  hide() { this.target = 0; }
  update(dt) {
    if (!this.group.visible) return; this.t += dt; this.alpha += (this.target - this.alpha) * Math.min(1, dt * 1.5);
    if (this.alpha < .02 && this.target === 0) { this.group.visible = false; return; }
    const u = Math.min(1, this.t / this.dur), tt = performance.now() / 1000;
    for (const o of this.list) {
      o.f.position.lerpVectors(o.from, o.to, u); o.f.position.y = this.g.phys.groundAt(o.f.position.x, o.f.position.z) + Math.abs(Math.sin(tt * 5 + o.off)) * .05 * (u < 1 ? 1 : 0);
      const d = o.to.clone().sub(o.from); o.f.rotation.y = Math.atan2(d.x, d.z);
      const fl = .85 + Math.sin(tt * 23 + o.off) * .1 + Math.sin(tt * 37) * .05; o.fl.scale.set(.6 * fl, .8 * fl, 1); o.fl.material.opacity = .95 * this.alpha; o.glow.material.opacity = .35 * this.alpha * fl;
      o.f.traverse(m => { if (m.isMesh) { m.material.transparent = true; m.material.opacity = this.alpha; } });
    }
  }
}
