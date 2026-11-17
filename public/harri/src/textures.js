// Testura prozeduralak (canvas) eta aukerako fal.ai testurak (assets/tex/*.jpg).
// ?gfx=0 → kolore lauak bakarrik. Testurarik gabe ere jokoak funtzionatu behar du.
import * as THREE from 'three';

function hash(x, y, s = 0) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647 >>> 1); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, y, s = 0) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); const u = smooth(xf), v = smooth(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s = 0, oct = 4) { let f = 0, amp = .5, sum = 0; for (let i = 0; i < oct; i++) { f += amp * noise(x, y, s + i * 17); sum += amp; x *= 2.03; y *= 2.01; amp *= .5; } return f / sum; }

function canvasTex(size, fn, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = (y * size + x) * 4; const [r, gg, b] = fn(x / size, y / size, x, y); d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t;
}
const clamp = (v, a = 0, b = 255) => v < a ? a : v > b ? b : v;
const mix = (a, b, t) => a + (b - a) * t;

export const PALETTE = {
  rock: 0x9c8b76, rockDark: 0x6e604f, moss: 0x7a9d3f, grass: 0x8bb04d, dirt: 0x8a6a48, wood: 0x6e4a2c, thatch: 0xb8964e,
  water: 0x3f7fa8, sky: 0x9ec8ea, fog: 0xc7d7df, amber: 0xf0b24a, daisy: 0xfff8e6, stoneBlock: 0xb0a08a, seal: 0xffcf5a,
};

export function makeTextures(gfx) {
  const T = { enabled: gfx !== '0' };
  if (!T.enabled) return T;
  const S = 256;
  // Harria: granito epela, arrakalak eta likenak
  T.rock = canvasTex(S, (u, v, x, y) => {
    const n = fbm(u * 6, v * 6, 1, 5), crack = Math.pow(Math.abs(noise(u * 9, v * 9, 7) - .5) * 2, .35);
    const l = 120 + n * 90 - (1 - crack) * 55 + (hash(x, y, 3) - .5) * 18;
    const lich = fbm(u * 14, v * 14, 11, 3) > .62 ? 1 : 0;
    return [clamp(l * 1.05 + lich * 10), clamp(l * .93 + lich * 30), clamp(l * .78)];
  }, { repeat: [2, 2] });
  // Goroldioa
  T.moss = canvasTex(S, (u, v, x, y) => { const n = fbm(u * 10, v * 10, 21, 5), g = 95 + n * 110 + (hash(x, y, 5) - .5) * 30; return [clamp(g * .62), clamp(g), clamp(g * .3)]; }, { repeat: [3, 3] });
  // Belarra: orban eta lore-puntuak
  T.grass = canvasTex(S, (u, v, x, y) => { const n = fbm(u * 8, v * 8, 31, 5), m = fbm(u * 2.5, v * 2.5, 41, 2); const g = 110 + n * 95 + (m - .5) * 50 + (hash(x, y, 9) - .5) * 26; const fl = hash(x >> 2, y >> 2, 77) > .995 ? 1 : 0; return [clamp(g * .68 + fl * 120), clamp(g * 1.02 + fl * 110), clamp(g * .32 + fl * 110)]; }, { repeat: [40, 40] });
  // Lurra / bidea
  T.dirt = canvasTex(S, (u, v, x, y) => { const n = fbm(u * 7, v * 7, 51, 4); const l = 120 + n * 70 + (hash(x, y, 13) - .5) * 24; return [clamp(l * 1.0), clamp(l * .76), clamp(l * .52)]; }, { repeat: [20, 20] });
  // Egurra
  T.wood = canvasTex(S, (u, v, x, y) => { const ring = Math.sin((u * 4 + fbm(u * 3, v * 1.5, 61, 3) * 1.2) * Math.PI * 2) * .5 + .5; const l = 95 + ring * 45 + (hash(x, y, 17) - .5) * 20; return [clamp(l * 1.0), clamp(l * .66), clamp(l * .42)]; }, { repeat: [1, 3] });
  // Lastoa (etxolak)
  T.thatch = canvasTex(S, (u, v, x, y) => { const s = Math.abs(Math.sin(v * 140 + noise(u * 20, v * 2, 71) * 3)); const l = 130 + s * 60 + (hash(x, y, 19) - .5) * 30; return [clamp(l * 1.1), clamp(l * .86), clamp(l * .45)]; }, { repeat: [4, 2] });
  // Ura (normal gisa erabiltzen da, lineala)
  T.water = canvasTex(S, (u, v) => { const n = fbm(u * 5, v * 5, 81, 4), m = fbm(u * 11 + 3, v * 11, 91, 3); return [128 + (n - .5) * 90, 128 + (m - .5) * 90, 230]; }, { repeat: [6, 6], srgb: false });
  // Harrizko blokea: ertz landuak
  T.block = canvasTex(S, (u, v, x, y) => { const e = Math.min(u, 1 - u, v, 1 - v); const edge = e < .06 ? .72 : 1; const n = fbm(u * 5, v * 5, 101, 4); const l = (135 + n * 70 + (hash(x, y, 23) - .5) * 16) * edge; return [clamp(l * 1.04), clamp(l * .94), clamp(l * .8)]; }, { repeat: [1, 1] });
  // Aukerako fal.ai testurak: badaude, prozeduralen gainean kargatzen dira (errorerik gabe bestela).
  if (gfx !== 'proc') {
    const loader = new THREE.TextureLoader();
    for (const name of ['rock', 'moss', 'grass', 'dirt', 'block', 'thatch', 'wood']) {
      loader.load(`./assets/tex/${name}.jpg`, tex => {
        const old = T[name]; if (!old) return;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.copy(old.repeat); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        for (const m of T.users?.[name] || []) { m.map = tex; m.needsUpdate = true; }
        T[name] = tex;
      }, undefined, () => { /* ez dago: prozedurala mantendu */ });
    }
  }
  T.users = {};
  return T;
}

// Material laguntzailea: testura badago erabili, bestela kolore laua.
export function mat(T, name, color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? .92, metalness: 0, flatShading: !!opts.flat, ...('transparent' in opts ? { transparent: opts.transparent, opacity: opts.opacity } : {}) });
  if (T.enabled && T[name]) { m.map = T[name]; (T.users[name] ||= []).push(m); if (opts.repeat) { m.map = T[name].clone(); m.map.repeat.set(opts.repeat[0], opts.repeat[1]); m.map.needsUpdate = true; } }
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  return m;
}

// Zeru-kupula: gradiente epela + eguzki-distira (shader merkea)
export function makeSky() {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x5f9fd8) }, mid: { value: new THREE.Color(0xa9d3ee) }, bot: { value: new THREE.Color(0xe9d9b8) }, sun: { value: new THREE.Vector3(.35, .45, -.82).normalize() } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top, mid, bot, sun;
      void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 c = h < 0.18 ? mix(bot, mid, smoothstep(-0.2, 0.18, h)) : mix(mid, top, smoothstep(0.18, 1.0, h));
      float s = max(dot(vP, sun), 0.0); c += vec3(1.0, 0.85, 0.6) * (pow(s, 180.0) * 1.2 + pow(s, 8.0) * 0.18); gl_FragColor = vec4(c, 1.0); }`
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = -10; return mesh;
}
