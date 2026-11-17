// HARRI · Harrizko bihotza — abiarazlea: errendatzailea, kalitatea, egoera-makina (izenburua → zinema → jokoa ↔ geldiunea → amaiera),
// gidoi-korrutinak, berragertzea, gordetzea eta proba-kakoa (?test: irakurtzeko soilik).
import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { GameAudio } from './audio.js';
import { Input } from './input.js';
import { Physics } from './physics.js';
import { buildWorld, ground } from './world.js';
import { buildProps } from './props.js';
import { loadCharacters } from './models.js';
import { Stones } from './stones.js';
import { Player } from './player.js';
import { Girl, Boar, Figures } from './npc.js';
import { GameCamera } from './camera.js';
import { HUD } from './hud.js';
import { FX } from './fx.js';
import { Level, loadSave, clearSave } from './level.js';
import { CHECKPOINTS, FLOWERS } from './layout.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
let gfx = params.get('gfx'); try { gfx = gfx ?? localStorage.getItem('harri-gfx'); } catch { } gfx = gfx || 'auto';
const mobile = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
const low = gfx === 'lite' || gfx === '0' || (gfx === 'auto' && mobile);
const Q = { terrainStep: low ? 1.1 : .8, trees: low ? 140 : 260, grass: low ? 2200 : 5000, flowers: low ? 380 : 900, ferns: low ? 90 : 200, shadows: gfx !== '0', shadowSize: low ? 1024 : 2048, dpr: Math.min(devicePixelRatio || 1, low ? 1.5 : 2) };

const SKIES = {
  dawn: { top: 0x47578a, mid: 0xeea172, bot: 0xf6c992, sun: 0xffb27a, sunI: 1.7, hemi: .7, fog: 0xe4bfa6 },
  day: { top: 0x5f9fd8, mid: 0xa9d3ee, bot: 0xe9d9b8, sun: 0xfff0d6, sunI: 2.5, hemi: 1.05, fog: 0xcfdde3 },
  dusk: { top: 0x3d4d7e, mid: 0xf2a668, bot: 0xf7d29a, sun: 0xffb070, sunI: 1.9, hemi: .82, fog: 0xe9c3a3 },
};

class Game {
  constructor() {
    this.canvas = $('gl'); this.state = 'boot'; this.time = 0; this.scripts = []; this.skip = false; this.fps = 60; this._fpsAcc = 0; this._fpsN = 0; this.dpr = Q.dpr; this.q = Q;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !low, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr); this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = Q.shadows; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(58, 1, .1, 1200);
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.fx?.setScale(h * this.renderer.getPixelRatio()); }
  async init() {
    const L = $('loading'); const step = t => { L.textContent = t; };
    step('TESTURAK…'); this.T = makeTextures(gfx === '0' ? '0' : gfx === 'proc' ? 'proc' : 'auto');
    this.audio = new GameAudio(); this.input = new Input(this.canvas); this.hud = new HUD(); this.hud.setHints(this.input.touch);
    this.input.onAnyInput = () => this.audio.unlock();
    this.phys = new Physics(ground);
    step('MUNDUA…'); await new Promise(r => setTimeout(r, 0));
    this.world = buildWorld(this.scene, this.T, Q, this.phys);
    this.props = buildProps(this.scene, this.T, Q, this.phys, this.world.rocks);
    this.world.rocks.build(this.scene, Q.shadows);
    this.fx = new FX(this.scene); this.resize();
    step('PERTSONAIAK…'); const chars = await loadCharacters(this.T, p => step(`PERTSONAIAK… ${Math.round(p * 100)}%`)); this.chars = chars;
    this.player = new Player(this, chars.harri); this.girl = new Girl(this, chars.neska); this.boar = new Boar(this, chars.basurdea); this.figures = new Figures(this);
    this.cam = new GameCamera(this.camera, this.phys); this.stones = new Stones(this); this.level = new Level(this, this.props);
    this.level.start(null); this.setSky('dawn', 0);
    // Lehen errendatzea (shader-ak konpilatu) pantaila beltzik gabe
    this.cam.shot([-14, 14, 98], [0, 2, 40], 0); this.renderer.compile(this.scene, this.camera); this.renderer.render(this.scene, this.camera);
    // Interfazea
    const save = loadSave(); $('btnContinue').hidden = !(save && save.cp && save.cp !== 'A' && !save.flags?.end);
    $('btnStart').onclick = () => this.newGame(true); $('btnContinue').onclick = () => this.continueGame();
    $('btnResume').onclick = () => this.pause(false); $('btnRestart').onclick = () => { this.pause(false); this.newGame(false); };
    $('btnAgain').onclick = () => { $('end').classList.remove('on'); this.newGame(false); };
    $('btnBack').onclick = () => { try { if (window.top !== window) window.top.location.href = '/'; else location.href = '/'; } catch { location.href = '/'; } };
    $('mute').onclick = () => { this.audio.unlock(); $('mute').textContent = this.audio.toggleMute() ? '×' : '♪'; };
    $('mute').textContent = this.audio.muted ? '×' : '♪';
    $('skip').onclick = () => { this.skip = true; };
    step(''); L.textContent = TEST ? 'PREST' : ''; this.state = 'title'; this.hud.fade(false);
    this.last = performance.now(); requestAnimationFrame(t => this.loop(t));
    if (TEST) this._testHook();
  }
  newGame(intro) {
    this.audio.unlock(); clearSave(); $('title').classList.add('off'); this.scripts = []; this.skip = false;
    this.level.start(null); this.fx.clear();
    if (intro) { this.state = 'cine'; document.body.classList.add('cine'); this.hud.fade(true); setTimeout(() => this.hud.fade(false), 50); this.run(this.level.sceneIntro(), () => { this.state = 'play'; document.body.classList.remove('cine'); }); }
    else { this.setSky('day', 0); this.state = 'play'; this.hud.show(true); this.hud.bars(false); this.cam.endCine(this.player); this.cam.snapBehind(Math.PI); this.level.updateObjective(); this.girl.walk([[2.5, 70], [1.5, 60], [0, 52], [-2.5, 42]], 2.9); }
  }
  continueGame() {
    this.audio.unlock(); const save = loadSave(); $('title').classList.add('off'); this.scripts = []; this.skip = false;
    this.level.start(save); this.setSky('day', 0); this.fx.clear(); this.state = 'play'; this.hud.show(true); this.cam.endCine(this.player); this.hud.toast('Kontrol-puntutik jarraitzen', 2);
  }
  pause(on) {
    if (on && this.state === 'play') { this.state = 'pause'; $('pause').classList.add('on'); $('pauseInfo').textContent = `Loreak: ${this.level.flowers.size}/${FLOWERS.length} · Denbora: ${fmt(this.level.time)}`; }
    else if (!on && this.state === 'pause') { this.state = 'play'; $('pause').classList.remove('on'); this.last = performance.now(); }
  }
  enterCine() { this.state = 'cine'; document.body.classList.add('cine'); this.hud.bars(true); this.player.frozen = true; this.stones.showArc(null, null, false); this.player.aiming = false; this.hud.setPrompt(''); }
  exitCine() { this.state = 'play'; document.body.classList.remove('cine'); this.hud.bars(false); this.hud.show(true); this.player.frozen = false; this.cam.endCine(this.player); this.skip = false; }
  finish() {
    this.state = 'end'; document.body.classList.remove('cine'); this.hud.bars(false);
    const n = this.level.flowers.size, stars = 1 + (n === FLOWERS.length ? 1 : 0) + (this.level.falls === 0 ? 1 : 0);
    $('endStars').textContent = '★ '.repeat(stars) + '☆ '.repeat(3 - stars);
    $('endInfo').textContent = `Denbora: ${fmt(this.level.time)} · Haraneko loreak: ${n}/${FLOWERS.length} · Erorketak: ${this.level.falls}. Harrik lehen zubia eraiki du eta santutegia ireki da. Bidea luzea da oraindik.`;
    $('end').classList.add('on');
  }
  emit(name, data) { this.level.onEvent(name, data); }
  actors() { const a = [this.player]; if (this.girl.visible) a.push(this.girl); if (this.boar.alive && this.boar.state !== 'sleep') a.push(this.boar); return a; }
  run(gen, done) { this.scripts.push({ it: gen, wait: 0, promise: null, ready: true, done }); }
  _runScripts(dt) {
    for (let k = this.scripts.length - 1; k >= 0; k--) {
      const s = this.scripts[k];
      if (this.skip) { s.wait = 0; this.girl.path.length && this._finishGirl(); }
      if (s.promise && !s.ready) continue;
      if (s.wait > 0) { s.wait -= dt; continue; }
      let guard = 0;
      while (guard++ < 50) {
        const r = s.it.next(); if (r.done) { this.scripts.splice(k, 1); s.done?.(); break; }
        if (r.value && typeof r.value.then === 'function') { s.ready = false; s.promise = r.value; r.value.then(() => { s.ready = true; }); if (this.skip) this._finishGirl(); break; }
        s.wait = this.skip ? 0 : (r.value || 0); s.promise = null; if (s.wait > 0) break;
      }
    }
    if (this.skip && !this.scripts.length) this.skip = false;
  }
  _finishGirl() { const G = this.girl; if (!G.path.length) return; const last = G.path[G.path.length - 1]; G.pos.x = last.x; G.pos.z = last.z; G.path = []; G.mode = 'idle'; const r = G.done; G.done = null; r?.(); }
  setSky(name, dur = 0) { const to = SKIES[name]; this._sky = { from: this._skyNow ? { ...this._skyNow } : { ...to }, to, t: 0, dur: Math.max(.001, dur) }; if (dur <= 0) this._applySky(1); }
  _applySky(u) {
    const S = this._sky, c = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), u), n = (a, b) => a + (b - a) * u; const f = S.from, t = S.to;
    const U = this.world.sky.material.uniforms; U.top.value.copy(c(f.top, t.top)); U.mid.value.copy(c(f.mid, t.mid)); U.bot.value.copy(c(f.bot, t.bot));
    this.world.sun.color.copy(c(f.sun, t.sun)); this.world.sun.intensity = n(f.sunI, t.sunI); this.world.hemi.intensity = n(f.hemi, t.hemi); this.scene.fog.color.copy(c(f.fog, t.fog));
    this._skyNow = { top: U.top.value.getHex(), mid: U.mid.value.getHex(), bot: U.bot.value.getHex(), sun: this.world.sun.color.getHex(), sunI: this.world.sun.intensity, hemi: this.world.hemi.intensity, fog: this.scene.fog.color.getHex() };
  }
  respawn(reason) {
    if (this._respawning) return; this._respawning = true; this.level.falls++;
    const S = this.stones; if (S.carry) { const b = S.carry; S.carry = null; S._respawnBlock(b, .3); }
    this.hud.fade(true); this.player.frozen = true;
    setTimeout(() => {
      const c = CHECKPOINTS[this.level.cp]; this.player.reset(new THREE.Vector3(c.x, c.y, c.z), c.yaw); this.cam.snapBehind(c.yaw); this.cam.endCine(this.player);
      this.player.hearts = 3; this.hud.setHearts(3); if (this.boar.alive && this.boar.state !== 'sleep') this.boar.reset(true);
      this.hud.fade(false); this._respawning = false; this.player.frozen = this.state !== 'play';
      this.hud.toast(reason === 'ura' ? 'Plof! Harri ez da igerilaria.' : reason === 'kaltea' ? 'Harri berriro zutik!' : 'Kontrol-puntura itzuli zara', 2);
    }, 650);
  }
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    const raw = Math.max(0, (now - this.last) / 1000); let dt = Math.min(.1, raw); this.last = now;
    this._fpsAcc += raw; this._fpsN++; if (this._fpsAcc > 1) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; this._adapt(); }
    const I = this.input; I.poll();
    if (I.pressed('mute')) { $('mute').textContent = this.audio.toggleMute() ? '×' : '♪'; }
    if (I.pressed('pause')) { if (this.state === 'play') this.pause(true); else if (this.state === 'pause') this.pause(false); }
    if (I.pressed('skip') && this.state === 'cine') this.skip = true;
    if (I.pressed('help')) { this._help = !this._help; this.hud.hintsFade(this._help); }
    if (this.state === 'play' && this.level.time > 35 && this._help === undefined) { this._help = false; this.hud.hintsFade(false); }
    if (this.state === 'pause' || this.state === 'boot') { I.endFrame(); return; }
    this.time += dt;
    if (this._sky && this._sky.t < 1) { this._sky.t = Math.min(1, this._sky.t + dt / this._sky.dur); this._applySky(this._sky.t); }
    this._runScripts(dt);
    const playing = this.state === 'play';
    if (playing || this.state === 'cine') {
      this.player.update(dt, playing ? I : NULL_INPUT, this.cam);
      this.girl.update(dt); this.boar.update(dt, this.player); this.figures.update(dt);
      this.stones.update(dt); this.level.update(dt);
      this.props.gate.update(dt); this.props.target.update(dt); this.props.seal.update(dt);
      if (Math.random() < dt * 6) this.fx.emit(this.props.fire.clone().setY(this.props.fire.y + .3), { n: 1, color: 0x8a8580, spread: .3, up: 1.4, life: 3.5, size: .5, grav: -.4, drag: .3, alpha: .45 });
      this.props.ember.material.color.setHSL(.06, 1, .5 + Math.sin(this.time * 7) * .06);
    }
    this.cam.update(dt, this.player, playing ? I : NULL_INPUT); this.cam.aim = this.player.aiming;
    this.fx.update(dt); this.hud.update(dt);
    if (playing) {
      this.hud.setPrompt(this.player.prompt || ''); this.hud.setStones(this.stones.inv.count, !!this.stones.carry); this.hud.setEnergy(1 - this.player.dashCd / .9);
      document.body.classList.toggle('carry', !!this.stones.carry);
    }
    this.world.update(dt, this.time, this.camera.position, this.player.pos);
    this.renderer.render(this.scene, this.camera);
    if (TEST) $('dbg').textContent = `fps ${this.fps.toFixed(0)} · ${this.state} · ${this.level.cp} · ${this.player.pos.x.toFixed(1)},${this.player.pos.y.toFixed(1)},${this.player.pos.z.toFixed(1)}`;
    I.endFrame();
  }
  _adapt() {
    if (this.state !== 'play') return; this._lowN = this.fps < 40 ? (this._lowN || 0) + 1 : 0;
    if (this._lowN >= 3 && this.dpr > 1) { this.dpr = Math.max(1, this.dpr - .25); this.renderer.setPixelRatio(this.dpr); this.resize(); this._lowN = 0; }
    else if (this._lowN >= 3 && this.renderer.shadowMap.enabled && this.fps < 28) { this.renderer.shadowMap.enabled = false; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); this._lowN = 0; }
  }
  _testHook() {
    document.body.classList.add('test');
    const g = this; const v = p => p && { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) };
    // Irakurtzeko soilik: bot-ek egoera ikusten dute, baina kontrol publikoen bidez jokatzen dute.
    window.__harri = Object.freeze({
      snapshot() {
        return JSON.parse(JSON.stringify({
          state: g.state, cp: g.level.cp, section: g.level.section, flags: g.level.flags, fps: g.fps, time: g.level.time, falls: g.level.falls, flowers: [...g.level.flowers],
          player: { pos: v(g.player.pos), yaw: g.player.yaw, onGround: g.player.onGround, hearts: g.player.hearts, inv: g.stones.inv.count, carry: g.stones.carry?.id || null, aiming: g.player.aiming, prompt: g.player.prompt },
          cam: { yaw: g.cam.yaw, pitch: g.cam.pitch }, ghost: g.stones.ghostState && { ...g.stones.ghostState },
          rocks: g.stones.rocks.map(r => ({ id: r.id, state: r.state, pos: v(r.body.pos) })), blocks: g.stones.blocks.map(b => ({ id: b.id, state: b.state, pos: v(b.pos), cell: b.cell })),
          targets: g.level.targets().map(t => ({ kind: t.kind, pos: v(t.pos) })), girl: { pos: v(g.girl.pos), mode: g.girl.mode }, boar: { state: g.boar.state, pos: v(g.boar.pos) },
          flowersLeft: g.level.flowerItems.map(f => ({ id: f.id, pos: v(f.m.position) })), drawCalls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles,
        }));
      },
    });
  }
}
const NULL_INPUT = { move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, pressed: () => false, down: () => false, released: new Set(), touch: false };
function fmt(s) { s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

const game = new Game();
game.init().catch(e => { console.error(e); $('loading').textContent = 'ERROREA: ' + (e?.message || e); });
