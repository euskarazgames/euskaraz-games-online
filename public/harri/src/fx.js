// Partikulak (hautsa, ur-zipriztinak, distirak, harri-zatiak) eta efektu txikiak (eraztunak).
import * as THREE from 'three';
const MAX = 900;
export class FX {
  constructor(scene) {
    this.scene = scene;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3); this.size = new Float32Array(MAX); this.alpha = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3); this.life = new Float32Array(MAX); this.max = new Float32Array(MAX); this.grav = new Float32Array(MAX); this.drag = new Float32Array(MAX); this.size0 = new Float32Array(MAX);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: { scale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d); if (r > 0.25) discard; gl_FragColor = vec4(vC, vA * smoothstep(0.25, 0.08, r)); }`
    });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    this.n = 0; this.cursor = 0; this.rings = [];
    for (let i = 0; i < MAX; i++) this.alpha[i] = 0;
  }
  setScale(h) { this.points.material.uniforms.scale.value = h * .9; }
  emit(p, o = {}) {
    const n = o.n ?? 10, c = new THREE.Color(o.color ?? 0xd8c8a8), spread = o.spread ?? 2, up = o.up ?? 2, life = o.life ?? .8, size = o.size ?? .18;
    for (let k = 0; k < n; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % MAX;
      const a = Math.random() * Math.PI * 2, s = Math.random() * spread;
      this.pos[i * 3] = p.x + (Math.random() - .5) * (o.jitter ?? .3); this.pos[i * 3 + 1] = p.y + Math.random() * (o.jy ?? .1); this.pos[i * 3 + 2] = p.z + (Math.random() - .5) * (o.jitter ?? .3);
      this.vel[i * 3] = Math.cos(a) * s + (o.vx ?? 0); this.vel[i * 3 + 1] = up * (.5 + Math.random() * .8); this.vel[i * 3 + 2] = Math.sin(a) * s + (o.vz ?? 0);
      const v = 1 + (Math.random() - .5) * (o.cvar ?? .2); this.col[i * 3] = c.r * v; this.col[i * 3 + 1] = c.g * v; this.col[i * 3 + 2] = c.b * v;
      this.life[i] = this.max[i] = life * (.6 + Math.random() * .6); this.size0[i] = size * (.6 + Math.random() * .8); this.grav[i] = o.grav ?? 9; this.drag[i] = o.drag ?? 1.5; this.alpha[i] = o.alpha ?? 1;
    }
  }
  dust(p, n = 10) { this.emit(p, { n, color: 0xcbb898, spread: 1.6, up: 1.4, life: .7, size: .22, grav: 2, drag: 3, alpha: .7 }); }
  splash(p) { this.emit(p, { n: 26, color: 0xd8eef8, spread: 2.2, up: 5, life: .9, size: .16, grav: 16, drag: .5 }); this.ring(p, 0xffffff, 1.6, .6); }
  sparkle(p, color = 0xffd36b, n = 18) { this.emit(p, { n, color, spread: 2.6, up: 2.5, life: 1.0, size: .14, grav: -1, drag: 2, jy: .6, alpha: 1 }); }
  chips(p, n = 10) { this.emit(p, { n, color: 0x9c8b76, spread: 2.5, up: 4, life: .7, size: .1, grav: 18, drag: .3 }); }
  ring(p, color = 0xffd36b, r = 2, dur = .5) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + .05, p.z); this.scene.add(m); this.rings.push({ m, t: 0, dur, r });
  }
  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; } continue; }
      this.life[i] -= dt; const t = Math.max(0, this.life[i] / this.max[i]);
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 2] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.size0[i] * (.5 + .5 * t); this.alpha[i] = Math.min(1, t * 2.5) * (this.alpha[i] > 0 ? 1 : 0);
      if (this.life[i] <= 0) this.alpha[i] = 0;
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = g.attributes.alpha.needsUpdate = true;
    for (let k = this.rings.length - 1; k >= 0; k--) {
      const r = this.rings[k]; r.t += dt; const u = r.t / r.dur; const s = .2 + u * r.r; r.m.scale.set(s, s, s); r.m.material.opacity = .8 * (1 - u);
      if (u >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.rings.splice(k, 1); }
    }
  }
  clear() { for (let i = 0; i < MAX; i++) { this.life[i] = 0; this.alpha[i] = 0; } for (const r of this.rings) this.scene.remove(r.m); this.rings.length = 0; }
}
