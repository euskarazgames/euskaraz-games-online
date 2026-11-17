// HARRI jokalaria: mugimendua (kamerarekiko), jauzi aldakorra + coyote time + input buffer, jauzi bikoitza (bertikala,
// golem astuna), bultzada (lurrean), harriak hartu/jaurti, blokeak eraman/eraiki/desmuntatu/utzi, kaltea eta animazio prozedurala.
import * as THREE from 'three';
import { Rig, HARRI_JOINTS } from './models.js';
import { G } from './physics.js';
import { inStream, inChasm } from './world.js';
import { STREAM } from './layout.js';

const TUNE = { walk: 5.4, carry: 4.0, accel: 46, decel: 60, airAccel: 11, airCap: 5.4, airCap2: 3.2, jumpV: 8.0, jump2V: 7.2, fallMul: 1.25, coyote: .12, buffer: .14, dashV: 13, dashT: .18, dashCd: .9, takeoffCap: 6.0 };
export { TUNE };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export class Player {
  constructor(game, model) {
    this.g = game; this.isPlayer = true;
    this.root = new THREE.Group(); this.model = model.scene; this.root.add(this.model); game.scene.add(this.root);
    this.rig = new Rig(this.model, HARRI_JOINTS);
    this.pos = V(); this.vel = V(); this.yaw = Math.PI; this.r = .38; this.h = 1.45; this.stepH = .55; this.onGround = true; this.ground = null;
    this.reset(V(0, 0, 0), Math.PI);
  }
  reset(p, yaw) {
    this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = yaw; this.onGround = true; this.coyote = 0; this.buf = 0; this.airJumps = 0; this.doubleUsed = false; this.jumpHeld = false; this.cut = false;
    this.dashT = 0; this.dashCd = 0; this.hearts = 3; this.inv = 0; this.hurtT = 0; this.knock = 0; this.aiming = false; this.throwT = 0; this.landT = 0;
    this.phase = 0; this.blinkT = 2; this.blink = 0; this.expr = 'happy'; this.exprT = 0; this.idleT = 0; this.stepAcc = 0; this.wasAir = false; this.fallY = p.y; this.frozen = false; this.sleep = 0; this.lookAround = 0;
    this.root.position.copy(this.pos); this.root.rotation.y = yaw;
  }
  carryAnchor() { return V(this.pos.x + Math.sin(this.yaw) * .1, this.pos.y + 2.05 - this.landT * .15, this.pos.z + Math.cos(this.yaw) * .1); }
  handPos() { const r = V(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); return V(this.pos.x - r.x * .45 + Math.sin(this.yaw) * .2, this.pos.y + 1.75, this.pos.z - r.z * .45 + Math.cos(this.yaw) * .2); }
  setExpr(e, dur = 1.5) { this.expr = e; this.exprT = dur; }
  hurt(dir) {
    if (this.hurtT > 0 || this.g.state !== 'play') return false;
    this.hearts--; this.hurtT = 1.4; this.knock = .35; this.vel.set(dir.x * 8, 5, dir.z * 8); this.onGround = false;
    this.g.audio.play('hurt'); this.g.cam.shake = .6; this.setExpr('hurt', 1); this.g.hud.setHearts(this.hearts);
    if (this.g.stones.carry) this.g.stones._dropSafe(this.g.stones.carry), this.g.stones.carry = null;
    if (this.hearts <= 0) this.g.respawn('kaltea');
    return true;
  }
  update(dt, input, cam) {
    const g = this.g, S = g.stones;
    if (this.frozen) { this.vel.x = this.vel.z = 0; this.vel.y -= G * dt; g.phys.moveCapsule(this, dt); this._anim(dt, 0); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    const carrying = !!S.carry;
    // Sarrera → nahi den norabidea (kamerarekiko)
    const f = cam.forward(), r = cam.right(); const mx = input.move.x, my = input.move.y; const wish = V(r.x * mx + f.x * my, 0, r.z * mx + f.z * my); const wl = Math.min(1, wish.length()); if (wl > 1e-3) wish.normalize();
    if (input.pressed('jump')) this.buf = TUNE.buffer; else this.buf = Math.max(0, this.buf - dt);
    if (this.onGround) { this.coyote = TUNE.coyote; this.airJumps = 0; this.doubleUsed = false; } else this.coyote = Math.max(0, this.coyote - dt);
    this.dashCd = Math.max(0, this.dashCd - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.knock = Math.max(0, this.knock - dt);
    // Apuntatzea
    const wantAim = (input.down('throw') && !carrying);
    this.aiming = wantAim && S.inv.count > 0;
    const maxSp = carrying ? TUNE.carry : this.aiming ? 2.6 : TUNE.walk;
    // Bultzada (lurrean bakarrik)
    if (input.pressed('dash')) { if (this.onGround && this.dashCd <= 0 && !carrying) { this.dashT = TUNE.dashT; this.dashCd = TUNE.dashCd; const d = wl > .1 ? wish : V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.yaw = Math.atan2(d.x, d.z); this.vel.x = d.x * TUNE.dashV; this.vel.z = d.z * TUNE.dashV; g.audio.play('dash'); g.fx.dust(this.pos, 8); this.setExpr('determined', .5); g.emit('dash'); } else if (carrying) g.hud.toast('Blokea eramaten ari zarenean ezin da bultzadarik egin', 1.6); }
    if (this.dashT > 0) { this.dashT -= dt; }
    else if (this.knock <= 0) {
      const tx = wish.x * maxSp * wl, tz = wish.z * maxSp * wl;
      if (this.onGround) { const a = wl > .05 ? TUNE.accel : TUNE.decel; this.vel.x += THREE.MathUtils.clamp(tx - this.vel.x, -a * dt, a * dt); this.vel.z += THREE.MathUtils.clamp(tz - this.vel.z, -a * dt, a * dt); }
      else { const a = TUNE.airAccel; this.vel.x += THREE.MathUtils.clamp(tx - this.vel.x, -a * dt, a * dt); this.vel.z += THREE.MathUtils.clamp(tz - this.vel.z, -a * dt, a * dt); const cap = this.doubleUsed ? TUNE.airCap2 : TUNE.airCap; const hs = Math.hypot(this.vel.x, this.vel.z); if (hs > cap && hs > this._takeoff) { const k = Math.max(cap, this._takeoff) / hs; this.vel.x *= k; this.vel.z *= k; } }
    }
    // Jauzia
    if (this.buf > 0 && (this.onGround || this.coyote > 0)) {
      this.vel.y = TUNE.jumpV * (carrying ? .9 : 1); this.buf = 0; this.coyote = 0; this.onGround = false; this.jumpHeld = true; this.cut = false;
      const hs = Math.hypot(this.vel.x, this.vel.z); if (hs > TUNE.takeoffCap) { this.vel.x *= TUNE.takeoffCap / hs; this.vel.z *= TUNE.takeoffCap / hs; } this._takeoff = Math.min(hs, TUNE.takeoffCap); this.dashT = 0;
      g.audio.play('jump'); g.fx.dust(this.pos, 6); g.emit('jauzi');
    } else if (this.buf > 0 && !this.onGround && this.coyote <= 0 && this.airJumps < 1) {
      if (carrying) { this.buf = 0; g.hud.toast('Blokearekin ezin da jauzi bikoitzik egin', 1.4); }
      else { this.vel.y = TUNE.jump2V; this.airJumps = 1; this.doubleUsed = true; this.buf = 0; this.jumpHeld = true; this.cut = false; this.vel.x *= .5; this.vel.z *= .5; this._takeoff = Math.hypot(this.vel.x, this.vel.z); g.audio.play('jump', { vol: .8 }); g.fx.ring(this.pos, 0xfff3c4, 1.2, .35); g.emit('jauzi-bikoitza'); }
    }
    if (this.jumpHeld && !input.down('jump')) { this.jumpHeld = false; if (this.vel.y > 2.5 && !this.cut) { this.vel.y *= .5; this.cut = true; } }
    this.vel.y -= G * (this.vel.y < 0 ? TUNE.fallMul : 1) * dt; if (this.vel.y < -26) this.vel.y = -26;
    // Fisika (azpi-urratsak)
    const wasGround = this.onGround; const prevVy = this.vel.y;
    const n = Math.ceil(dt / (1 / 90)); for (let i = 0; i < n; i++) g.phys.moveCapsule(this, dt / n);
    if (!wasGround && this.onGround) { const sp = -prevVy; if (sp > 6) { this.landT = Math.min(1, sp / 16); g.fx.dust(this.pos, Math.round(4 + sp)); g.audio.play('land', { vol: Math.min(1, sp / 14) }); if (sp > 13) g.cam.shake = .3; } }
    if (!this.onGround && wasGround) this.fallY = this.pos.y;
    // Begirada
    if (this.aiming) { const ay = Math.atan2(f.x, f.z); this.yaw = lerpA(this.yaw, ay, Math.min(1, dt * 16)); }
    else if (wl > .1 && this.dashT <= 0 && this.knock <= 0) { this.yaw = lerpA(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12)); }
    // Ura / amildegia
    if (inStream(this.pos.x, this.pos.z) && this.pos.y < STREAM.water - .25) { g.audio.play('plof'); g.fx.splash(V(this.pos.x, STREAM.water, this.pos.z)); g.respawn('ura'); return; }
    if ((inChasm(this.pos.x, this.pos.z) && this.pos.y < 0) || this.pos.y < -9) { g.audio.play('fail'); g.respawn('amildegia'); return; }
    // Ekintzak
    this._actions(dt, input, cam, carrying);
    this._anim(dt, wl);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
  }
  _actions(dt, input, cam, carrying) {
    const g = this.g, S = g.stones; let prompt = '';
    const T = this.g.input.touch; const K = (k, t) => T ? t : `${k} · ${t}`;
    const rock = !carrying && S.inv.count < 3 ? S.nearestRock(this.pos) : null;
    const loose = !carrying ? S.nearestLoose(this.pos) : null;
    const unb = !carrying && !rock && !loose ? S.unbuildTarget(this.pos, this.yaw) : null;
    S.sel.visible = false;
    if (unb) { S.sel.visible = true; S.sel.position.copy(unb.pos); }
    if (input.pressed('grab')) {
      if (carrying) { g.hud.toast(T ? 'ERAIKI blokea kokatzeko edo UTZI lurrean uzteko' : 'R: eraiki · X: utzi', 1.8); }
      else if (rock) { if (S.pickRock(rock)) { this.setExpr('joy', .8); } }
      else if (loose) { S.pickBlock(loose); this.setExpr('determined', 1); }
      else if (unb) { S.pickBlock(unb); this.setExpr('determined', 1); }
      else if (S.inv.count >= 3 && S.nearestRock(this.pos)) g.hud.toast('Hiru harri dituzu jada (gehienez 3)', 1.6);
    }
    if (input.pressed('build')) {
      if (carrying) { const r = S.place(); if (!r) { g.audio.play('fail'); g.hud.toast(S.ghostState?.reason || 'Hemen ezin da eraiki', 1.8); } else this.setExpr('joy', 1.2); }
      else g.hud.toast(T ? 'Lehenengo hartu bloke bat (HARTU)' : 'Lehenengo hartu bloke bat (E)', 1.6);
    }
    if (input.pressed('drop') && carrying) S.dropCarry();
    // Jaurti: sakatuta → apuntatu (ibilbidea), askatu → jaurti
    if (this.aiming) {
      const from = this.handPos(); const sol = S.aim(from, cam.aimDir()); S.showArc(from, sol.vel, true); this._aimSol = sol; this.setExpr('determined', .3);
    } else { S.showArc(null, null, false); }
    if (input.released.has('throw')) {
      if (carrying) g.hud.toast('Utzi blokea lehenengo (X)', 1.4);
      else if (S.inv.count === 0) { if (!this._noRockHint || performance.now() - this._noRockHint > 4000) { g.hud.toast(T ? 'Ez duzu harririk: hurbildu batera eta sakatu HARTU' : 'Ez duzu harririk: hurbildu batera eta sakatu E', 2.2); this._noRockHint = performance.now(); } }
      else { const from = this.handPos(); const sol = this._aimSol && this.aiming ? this._aimSol : S.aim(from, cam.aimDir()); if (S.throwRock(from, sol.vel)) { this.throwT = .3; this.yaw = Math.atan2(sol.vel.x, sol.vel.z); } }
      this.aiming = false; S.showArc(null, null, false);
    }
    if (carrying) prompt = S.ghostState?.ok ? K('R', 'ERAIKI ETA LOTU') : (S.ghostState?.reason || '') + (T ? '' : '   ·   X · UTZI');
    else if (rock) prompt = K('E', 'HARTU harria');
    else if (loose) prompt = K('E', 'HARTU blokea');
    else if (unb) prompt = K('E', 'DESMUNTATU');
    else if (this.aiming) prompt = this._aimSol?.target ? 'Askatu jaurtitzeko · helburua!' : 'Askatu jaurtitzeko';
    this.prompt = prompt;
  }
  _anim(dt, wl) {
    const R = this.rig, t = performance.now() / 1000;
    const hs = Math.hypot(this.vel.x, this.vel.z); const moving = this.onGround && hs > .4;
    const carrying = !!this.g.stones.carry;
    if (moving) { this.phase += hs * dt / 1.05 * Math.PI; this.stepAcc += hs * dt; if (this.stepAcc > 1.05) { this.stepAcc = 0; this.g.audio.play('step', { vol: .6 }); } }
    const amt = Math.min(1, hs / 5.4) * (this.onGround ? 1 : 0);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    this.landT = Math.max(0, this.landT - dt * 3.2);
    this.throwT = Math.max(0, this.throwT - dt);
    // Oinarria
    let hipsY = Math.abs(s) * .05 * amt - this.landT * .12, lean = -.1 * amt, twist = s * .07 * amt;
    let tL = -s * .65 * amt, tR = s * .65 * amt, kL = Math.max(0, c) * .8 * amt, kR = Math.max(0, -c) * .8 * amt;
    let aLx = s * .55 * amt, aRx = -s * .55 * amt, aLz = .12, aRz = -.12, fLx = -.35 * amt - .1, fRx = -.35 * amt - .1;
    if (!this.onGround) {
      const up = this.vel.y > 0;
      if (up) { tL = -.6; tR = -.2; kL = .9; kR = .5; aLx = -2.0; aRx = -2.0; aLz = .5; aRz = -.5; fLx = fRx = -.4; lean = .05; }
      else { tL = -.25; tR = .1; kL = .3; kR = .2; aLx = -.6; aRx = -.6; aLz = 1.0; aRz = -1.0; fLx = fRx = -.3; lean = -.05; }
      if (this.doubleUsed && this.vel.y > 0) { tL = -1.0; tR = -1.0; kL = 1.4; kR = 1.4; lean = .2; }
    } else if (!moving) {
      const br = Math.sin(t * 2.1); hipsY = br * .012 - this.landT * .12; this.idleT += dt;
      aLx = br * .03; aRx = -br * .03; aLz = .14; aRz = -.14;
    }
    if (this.dashT > 0) { lean = -.55; aLx = 1.3; aRx = 1.3; aLz = .3; aRz = -.3; tL = -.9; tR = .5; }
    if (carrying) { aLx = -2.85; aRx = -2.85; aLz = .32; aRz = -.32; fLx = fRx = -.55; lean = .05; }
    if (this.aiming) { aRx = 2.2; aRz = -.2; fRx = -1.2; aLx = -1.0; aLz = .5; lean = -.05; twist = -.35; }
    if (this.throwT > 0) { const u = 1 - this.throwT / .3; aRx = 2.2 - u * 3.8; fRx = -.3; twist = -.35 + u * .7; lean = -.2 * u; }
    if (this.hurtT > 1.1) { lean = .35; aLx = -1; aRx = -1; }
    // Hasierako harri bihurrituta (intro): curlK → 1 = harri biribila, 0 = zutik
    const curlT = this.curl && !this.standUp ? 1 : 0; this.curlK = (this.curlK ?? 0) + (curlT - (this.curlK ?? 0)) * Math.min(1, dt * (curlT ? 20 : 1.6));
    const ck = this.curlK;
    if (ck > .001) { const m = (a, b) => a + (b - a) * ck; hipsY = m(hipsY, -.5); lean = m(lean, 1.05); tL = m(tL, -1.7); tR = m(tR, -1.7); kL = m(kL, 2.3); kR = m(kR, 2.3); aLx = m(aLx, -.9); aRx = m(aRx, -.9); aLz = m(aLz, -.25); aRz = m(aRz, .25); fLx = m(fLx, -1.9); fRx = m(fRx, -1.9); }
    R.off('hips', 0, hipsY, 0);
    R.rot('hips', 0, twist * .5, 0);
    R.rot('torso', lean, twist, 0);
    R.rot('thigh_L', tL, 0, 0); R.rot('thigh_R', tR, 0, 0);
    R.rot('shin_L', kL, 0, 0); R.rot('shin_R', kR, 0, 0);
    R.rot('foot_L', -tL * .3 - kL * .5, 0, 0); R.rot('foot_R', -tR * .3 - kR * .5, 0, 0);
    R.rot('upperarm_L', aLx, 0, aLz); R.rot('upperarm_R', aRx, 0, aRz);
    R.rot('forearm_L', fLx, 0, 0); R.rot('forearm_R', fRx, 0, 0);
    // Burua: inguruari begiratu geldirik dagoenean
    let hy = 0, hx = 0; if (!moving && this.onGround && !carrying) { this.lookAround += dt; hy = Math.sin(this.lookAround * .5) * .35 * Math.min(1, this.idleT / 3); hx = Math.sin(this.lookAround * .31) * .06; } else this.lookAround = 0;
    if (!this.onGround) hx = this.vel.y > 0 ? -.12 : .1;
    R.rot('head', hx - lean * .4 + (this.curlK || 0) * .9, hy, 0);
    // Kliska eta adierazpenak
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = .13; this.blinkT = 2.2 + Math.random() * 3; }
    this.blink = Math.max(0, this.blink - dt);
    this.exprT -= dt; if (this.exprT <= 0) this.expr = this.sleep > 0 ? 'sleep' : 'happy';
    const E = { happy: [1, 1, 0, 0, 1], joy: [1.15, 1.25, .025, 0, 1.05], surprised: [.55, .95, .04, 0, 1.12], determined: [.95, .45, -.012, .32, .95], hurt: [.6, .5, .02, -.25, .7], sad: [.7, .3, .01, -.3, .9], sleep: [.5, .15, -.01, 0, .08] }[this.expr] || [1, 1, 0, 0, 1];
    const eyeS = this.blink > 0 ? .1 : E[4];
    R.scl('eye_L', 1, eyeS, 1); R.scl('eye_R', 1, eyeS, 1);
    R.scl('mouth', E[0], E[1], 1);
    R.off('brow_L', 0, E[2], 0); R.off('brow_R', 0, E[2], 0);
    R.rot('brow_L', 0, 0, -E[3]); R.rot('brow_R', 0, 0, E[3]);
  }
}
