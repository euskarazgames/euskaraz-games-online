// Soinu prozeduralak (Web Audio). Fitxategirik ez: dena sintetizatua, lehen ukitu/teklan desblokeatua.
export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.master = null; try { this.muted = localStorage.getItem('harri-mute') === '1'; } catch { } }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : .8; this.master.connect(this.ctx.destination); } catch { this.ctx = null; }
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : .8; try { localStorage.setItem('harri-mute', this.muted ? '1' : '0'); } catch { } return this.muted; }
  _noise(dur) { const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = this.ctx.createBufferSource(); s.buffer = b; return s; }
  _env(node, t0, a, d, peak = 1) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); node.connect(g); g.connect(this.master); return g; }
  _tone(type, f0, f1, t0, a, d, peak = .5) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + a + d); this._env(o, t0, a, d, peak); o.start(t0); o.stop(t0 + a + d + .05); }
  _burst(dur, type, f0, f1, t0, a, d, peak = .5, q = 1) { const n = this._noise(dur); const flt = this.ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f0, t0); if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t0 + a + d); flt.Q.value = q; n.connect(flt); this._env(flt, t0, a, d, peak); n.start(t0); n.stop(t0 + dur); }
  play(name, opt = {}) {
    if (!this.ctx || this.muted) return; const t = this.ctx.currentTime + (opt.delay || 0); const v = opt.vol ?? 1;
    switch (name) {
      case 'tok': this._burst(.12, 'lowpass', 900 + Math.random() * 300, 200, t, .005, .09, .5 * v, 2); this._tone('sine', 180 + Math.random() * 40, 90, t, .004, .08, .25 * v); break;
      case 'krak': this.play('tok', { vol: v }); this.play('tok', { delay: .09, vol: v * .9 }); this._burst(.25, 'bandpass', 1800, 700, t + .17, .01, .2, .45 * v, 1.2); this._tone('sine', 140, 60, t + .17, .005, .22, .35 * v); break;
      case 'plof': this._burst(.4, 'lowpass', 1400, 250, t, .01, .3, .55 * v, .7); this._tone('sine', 420, 110, t, .01, .22, .3 * v); break;
      case 'whoosh': this._burst(.35, 'bandpass', 500, 2200, t, .08, .22, .35 * v, .8); break;
      case 'dum': this._tone('sine', 70, 40, t, .01, .28, .9 * v); this._tone('sine', 68, 38, t + .42, .01, .32, .7 * v); break;
      case 'ding': for (const [f, dl, p] of [[880, 0, .35], [1320, .02, .22], [1760, .04, .12]]) this._tone('sine', f, null, t + dl, .005, .7, p * v); break;
      case 'chime': [523, 659, 784, 1047].forEach((f, i) => this._tone('triangle', f, null, t + i * .12, .01, .9, .3 * v)); break;
      case 'grunt': this._tone('sawtooth', 140, 90, t, .03, .25, .3 * v); this._burst(.3, 'lowpass', 600, 200, t, .02, .22, .35 * v); break;
      case 'hurt': this._tone('square', 300, 120, t, .01, .18, .25 * v); this._burst(.2, 'lowpass', 900, 300, t, .005, .15, .4 * v); break;
      case 'jump': this._tone('sine', 220, 440, t, .02, .12, .22 * v); break;
      case 'land': this._burst(.12, 'lowpass', 500, 150, t, .005, .1, .4 * v); break;
      case 'step': this._burst(.07, 'lowpass', 700 + Math.random() * 200, 250, t, .003, .06, .14 * v, 1.5); break;
      case 'pick': this._tone('triangle', 500, 760, t, .01, .08, .18 * v); break;
      case 'thud': this._burst(.25, 'lowpass', 400, 120, t, .005, .2, .6 * v); this._tone('sine', 90, 45, t, .005, .2, .5 * v); break;
      case 'dash': this._burst(.25, 'bandpass', 900, 3000, t, .03, .18, .3 * v, 1); break;
      case 'seal': this.play('ding', { vol: v }); this._tone('sine', 196, 392, t, .3, .9, .25 * v); break;
      case 'fail': this._tone('triangle', 330, 200, t, .01, .25, .2 * v); break;
      case 'stun': this._tone('triangle', 600, 1200, t, .05, .5, .15 * v); this._tone('triangle', 900, 1500, t + .25, .05, .5, .12 * v); break;
      case 'hoof': this._burst(.08, 'lowpass', 300, 120, t, .003, .07, .5 * v); break;
    }
  }
}
