// Fisika sinple eta deterministikoa: AABB estatikoak + altuera-eremua (lurra), kapsula (jokalaria, NPCak) eta gorputz dinamikoak (harriak).
export const G = 24;
const EPS = 1e-4;
export class Physics {
  constructor(groundFn) { this.groundAt = groundFn; this.boxes = []; this._id = 1; }
  addBox(min, max, tag = 'static', ref = null) { const b = { id: this._id++, min: { ...min }, max: { ...max }, tag, ref, solid: true }; this.boxes.push(b); return b; }
  removeBox(b) { const i = this.boxes.indexOf(b); if (i >= 0) this.boxes.splice(i, 1); }
  boxesIn(min, max, skip) { const out = []; for (const b of this.boxes) { if (b === skip || !b.solid) continue; if (b.max.x <= min.x || b.min.x >= max.x || b.max.y <= min.y || b.min.y >= max.y || b.max.z <= min.z || b.min.z >= max.z) continue; out.push(b); } return out; }
  // Lurra edo kutxa baten gainazala (x,z) puntuan, y-ren azpitik (jaitsiera max): {y, box}
  floorUnder(x, z, y, r = 0, maxDrop = 50) {
    let best = this.groundAt(x, z), box = null;
    if (r > 0) { for (const [ox, oz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const g = this.groundAt(x + ox * .7, z + oz * .7); if (g > best) { best = g; } } }
    for (const b of this.boxes) { if (!b.solid) continue; if (b.min.x - r > x || b.max.x + r < x || b.min.z - r > z || b.max.z + r < z) continue; if (b.max.y <= y + .05 && b.max.y > best) { best = b.max.y; box = b; } }
    if (y - best > maxDrop) return { y: -Infinity, box: null }; return { y: best, box };
  }
  // Kapsula: body = {pos (oinak), r, h, vel, onGround, ground, stepH}
  moveCapsule(body, dt) {
    const p = body.pos, v = body.vel, r = body.r, h = body.h, stepH = body.stepH ?? .55;
    // X eta Z ardatzak banan-banan, kutxen aurka
    for (const ax of ['x', 'z']) {
      const d = v[ax] * dt; if (!d) continue; p[ax] += d;
      const min = { x: p.x - r, y: p.y + .1, z: p.z - r }, max = { x: p.x + r, y: p.y + h, z: p.z + r };
      for (const b of this.boxesIn(min, max)) {
        const top = b.max.y - p.y;
        if (top <= stepH && top > 0 && body.onGround !== false) { // maila txikia: igo
          const headMin = { x: min.x, y: b.max.y + .05, z: min.z }, headMax = { x: max.x, y: b.max.y + h, z: max.z };
          if (this.boxesIn(headMin, headMax, b).length === 0) { p.y = b.max.y; continue; }
        }
        if (d > 0) p[ax] = b.min[ax] - r - EPS; else p[ax] = b.max[ax] + r + EPS; v[ax] = 0;
      }
      // Lurraren malda handiegia: horma gisa jokatu
      const g = this.groundAt(p.x, p.z); if (g - p.y > stepH && body.onGround !== false) { p[ax] -= d; v[ax] = 0; }
      else if (g - p.y > stepH && p.y + h > g) { p[ax] -= d; v[ax] = 0; }
    }
    // Y ardatza
    p.y += v.y * dt;
    const g = this.groundAt(p.x, p.z);
    body.onGround = false; body.ground = null;
    if (p.y <= g) { p.y = g; if (v.y < 0) v.y = 0; body.onGround = true; body.ground = 'lur'; }
    const min = { x: p.x - r, y: p.y, z: p.z - r }, max = { x: p.x + r, y: p.y + h, z: p.z + r };
    for (const b of this.boxesIn(min, max)) {
      const prevBottom = p.y - v.y * dt;
      if (v.y <= 0 && prevBottom >= b.max.y - .08) { p.y = b.max.y; v.y = 0; body.onGround = true; body.ground = b; }
      else if (v.y > 0 && p.y + h > b.min.y && prevBottom + h <= b.min.y + .08) { p.y = b.min.y - h - EPS; v.y = 0; }
      else { // alboko gainjartzea: kanpora bultzatu ardatz laburrenean
        const px = Math.min(max.x - b.min.x, b.max.x - min.x), pz = Math.min(max.z - b.min.z, b.max.z - min.z);
        if (px < pz) p.x += (p.x < (b.min.x + b.max.x) / 2 ? -px : px) + EPS * 2; else p.z += (p.z < (b.min.z + b.max.z) / 2 ? -pz : pz) + EPS * 2;
      }
    }
  }
  // Gorputz dinamikoa (esfera): body = {pos (zentroa), r, vel, asleep, bounce, friction, hit(box)}
  moveSphere(b, dt, opts = {}) {
    if (b.asleep) return; const v = b.vel, p = b.pos;
    v.y -= G * dt; p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    let grounded = false; const bounce = b.bounce ?? .35, fr = b.friction ?? .86;
    const g = this.groundAt(p.x, p.z);
    if (p.y - b.r < g) { p.y = g + b.r; if (v.y < 0) { if (Math.abs(v.y) > 2) opts.onBounce?.('lur', Math.abs(v.y)); v.y = -v.y * bounce; } v.x *= fr; v.z *= fr; grounded = true; }
    const min = { x: p.x - b.r, y: p.y - b.r, z: p.z - b.r }, max = { x: p.x + b.r, y: p.y + b.r, z: p.z + b.r };
    for (const bx of this.boxesIn(min, max, b.skipBox)) {
      const px = Math.min(max.x - bx.min.x, bx.max.x - min.x), py = Math.min(max.y - bx.min.y, bx.max.y - min.y), pz = Math.min(max.z - bx.min.z, bx.max.z - min.z);
      opts.onHit?.(bx);
      if (py <= px && py <= pz) { if (p.y > (bx.min.y + bx.max.y) / 2) { p.y = bx.max.y + b.r; if (v.y < 0) { if (Math.abs(v.y) > 2) opts.onBounce?.(bx, Math.abs(v.y)); v.y = -v.y * bounce; } v.x *= fr; v.z *= fr; grounded = true; } else { p.y = bx.min.y - b.r; v.y = -Math.abs(v.y) * bounce; } }
      else if (px <= pz) { const s = p.x < (bx.min.x + bx.max.x) / 2 ? -1 : 1; p.x = s < 0 ? bx.min.x - b.r : bx.max.x + b.r; if (Math.abs(v.x) > 2) opts.onBounce?.(bx, Math.abs(v.x)); v.x = -v.x * bounce; }
      else { const s = p.z < (bx.min.z + bx.max.z) / 2 ? -1 : 1; p.z = s < 0 ? bx.min.z - b.r : bx.max.z + b.r; if (Math.abs(v.z) > 2) opts.onBounce?.(bx, Math.abs(v.z)); v.z = -v.z * bounce; }
    }
    b.grounded = grounded;
    if (grounded && Math.hypot(v.x, v.y, v.z) < .25) { b.restT = (b.restT || 0) + dt; if (b.restT > .35) { b.asleep = true; v.x = v.y = v.z = 0; } } else b.restT = 0;
  }
  // Izpi sinplea lurraren aurka (kameraren talka): segmentua laginduz, lurraren gainetik dagoen azken puntua itzuli
  clampAboveGround(from, to, margin = .35, steps = 12) {
    let last = { ...to };
    for (let i = 1; i <= steps; i++) { const t = i / steps; const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t, z = from.z + (to.z - from.z) * t; const g = this.groundAt(x, z) + margin; if (y < g) { return { x, y: g, z, hit: true }; } last = { x, y, z }; }
    return { ...last, hit: false };
  }
}
