// Hirugarren pertsonako kamera: orbita, jarraipen automatiko leuna, talka (lurra + kutxak), apuntatzea eta zinema-modua.
import * as THREE from 'three';
const tmp = new THREE.Vector3();
function rayAABB(o, d, len, b) {
  let tmin = 0, tmax = len;
  for (const ax of ['x', 'y', 'z']) {
    if (Math.abs(d[ax]) < 1e-6) { if (o[ax] < b.min[ax] || o[ax] > b.max[ax]) return null; continue; }
    let t1 = (b.min[ax] - o[ax]) / d[ax], t2 = (b.max[ax] - o[ax]) / d[ax]; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  return tmin;
}
export class GameCamera {
  constructor(cam, physics) {
    this.cam = cam; this.phys = physics;
    this.yaw = 0; this.pitch = .26; this.dist = 5.0; this.curDist = 5.0; this.aim = 0; this.target = new THREE.Vector3();
    this.idleLook = 0; this.cine = null; this.shake = 0; this.lookAt = new THREE.Vector3(); this.fovBase = 58;
  }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  /** Norabide 3D (apuntatzeko): kamerak begiratzen duen lekua */
  aimDir() { const d = new THREE.Vector3(); this.cam.getWorldDirection(d); return d; }
  snapBehind(heading) { this.yaw = heading + Math.PI; }
  update(dt, player, input) {
    if (this.cine) return this._cine(dt);
    const look = input.look; const manual = Math.abs(look.dx) + Math.abs(look.dy) > 1e-4;
    this.yaw -= look.dx; this.pitch = THREE.MathUtils.clamp(this.pitch + look.dy, -.35, 1.05);
    this.idleLook = manual ? 0 : this.idleLook + dt;
    // Jarraipen automatikoa: mugitzean eta kamera ukitu gabe, poliki atzera
    const sp = Math.hypot(player.vel.x, player.vel.z);
    if (this.idleLook > 1.0 && sp > 1.5 && !this.aim) {
      const mv = Math.atan2(player.vel.x, player.vel.z); const behind = mv + Math.PI;
      const fw = this.forward(); const towardCam = (player.vel.x * fw.x + player.vel.z * fw.z) / sp;
      if (towardCam > -.5) { let d = behind - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * .9 * Math.min(1, sp / 5)); }
      this.pitch += (.26 - this.pitch) * Math.min(1, dt * .4);
    }
    const aimT = this.aim ? 1 : 0; this._aimK = (this._aimK ?? 0) + (aimT - (this._aimK ?? 0)) * Math.min(1, dt * 10);
    const k = this._aimK;
    this.target.lerp(tmp.set(player.pos.x, player.pos.y + 1.25 + k * .15, player.pos.z), Math.min(1, dt * 12));
    const want = this.dist * (1 - k * .42);
    const right = this.right();
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const pivot = this.target.clone().addScaledVector(right, k * .75);
    // Talka: kutxak eta lurra
    let d = want; const dir = off.clone();
    for (const b of this.phys.boxes) { if (!b.solid || b.noCam) continue; const t = rayAABB(pivot, dir, want, b); if (t !== null && t > .2) d = Math.min(d, t - .25); }
    d = Math.max(1.2, d);
    this.curDist += (d - this.curDist) * Math.min(1, dt * (d < this.curDist ? 18 : 3));
    const p = pivot.clone().addScaledVector(dir, this.curDist);
    const g = this.phys.groundAt(p.x, p.z) + .4; if (p.y < g) p.y = g;
    this.cam.position.copy(p);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 2.5); const s = this.shake * .15; this.cam.position.x += (Math.random() - .5) * s; this.cam.position.y += (Math.random() - .5) * s; }
    this.lookAt.copy(pivot).addScaledVector(this.forward(), k * 2);
    this.cam.lookAt(this.lookAt);
    const fov = this.fovBase - k * 8; if (Math.abs(this.cam.fov - fov) > .05) { this.cam.fov += (fov - this.cam.fov) * Math.min(1, dt * 8); this.cam.updateProjectionMatrix(); }
  }
  // Zinema: {from:{pos,look}, to:{pos,look}, dur, t}
  shot(pos, look, dur = 0, ease = true) {
    const from = this.cine ? { pos: this.cam.position.clone(), look: this.cine.curLook.clone() } : { pos: this.cam.position.clone(), look: this.lookAt.clone() };
    this.cine = { from, to: { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) }, dur, t: 0, ease, curLook: from.look.clone() };
    if (dur <= 0) this._cine(0);
  }
  endCine(player) { this.cine = null; if (player) { this.target.set(player.pos.x, player.pos.y + 1.35, player.pos.z); this.curDist = this.dist; } }
  _cine(dt) {
    const c = this.cine; c.t += dt; let u = c.dur > 0 ? Math.min(1, c.t / c.dur) : 1; if (c.ease) u = u * u * (3 - 2 * u);
    this.cam.position.lerpVectors(c.from.pos, c.to.pos, u); c.curLook.lerpVectors(c.from.look, c.to.look, u); this.cam.lookAt(c.curLook);
    if (Math.abs(this.cam.fov - 50) > .05) { this.cam.fov += (50 - this.cam.fov) * Math.min(1, dt * 4); this.cam.updateProjectionMatrix(); }
  }
}
