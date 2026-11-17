// HUD-a (DOM): bizia, harriak, helburua, aginduak, mezuak, azpitituluak eta zinema-barrak. Testu guztiak euskaraz.
const $ = id => document.getElementById(id);
export class HUD {
  constructor() {
    this.el = { hud: $('hud'), hearts: [...$('hearts').children], stones: [...$('stones').children], obj: $('objective'), prompt: $('prompt'), toast: $('toast'), energy: $('energy'), hints: $('hints'), bars: $('bars'), cap: $('caption'), who: document.querySelector('#caption .who'), what: document.querySelector('#caption .what'), cartela: $('cartela'), fade: $('fade'), dbg: $('dbg') };
    this._toastT = 0; this._capT = 0; this._prompt = ''; this._obj = '';
    this.setHints();
  }
  show(on) { this.el.hud.classList.toggle('on', on); }
  setHearts(n) { this.el.hearts.forEach((h, i) => h.classList.toggle('off', i >= n)); }
  setStones(count, carrying) { this.el.stones.forEach((s, i) => { s.className = 'stone-slot' + (i < count ? ' rock' : ''); }); this.el.stones[2].classList.toggle('block', !!carrying); if (carrying) this.el.stones[2].classList.add('rock'); }
  setObjective(t, extra = '') { const s = t + (extra ? `<br><small style="opacity:.75;font-family:var(--ui-font);font-size:12px;letter-spacing:.08em">${extra}</small>` : ''); if (s !== this._obj) { this._obj = s; this.el.obj.innerHTML = s; } }
  setPrompt(t) { if (t === this._prompt) return; this._prompt = t; this.el.prompt.textContent = t || ''; this.el.prompt.classList.toggle('on', !!t); }
  setEnergy(p) { this.el.energy.style.setProperty('--p', p.toFixed(3)); }
  toast(t, dur = 2.4) { this.el.toast.textContent = t; this.el.toast.classList.add('on'); this._toastT = dur; }
  say(who, what, dur = 3) { this.el.who.textContent = who || ''; this.el.what.textContent = what; this.el.cap.classList.add('on'); this._capT = dur; }
  hideSay() { this.el.cap.classList.remove('on'); this._capT = 0; }
  bars(on) { this.el.bars.classList.toggle('on', on); }
  cartela(t) { this.el.cartela.textContent = t || ''; this.el.cartela.classList.toggle('on', !!t); }
  fade(black) { this.el.fade.classList.toggle('off', !black); }
  setHints(touch = false) {
    this.el.hints.innerHTML = [['WASD', 'mugitu'], ['Sagua', 'kamera (arrastatu)'], ['Zuriunea', 'jauzi (bikoitza airean)'], ['Shift', 'bultzada'], ['E', 'hartu / desmuntatu'], ['F / klik', 'jaurti (sakatuta: apuntatu)'], ['R', 'eraiki eta lotu'], ['X', 'blokea utzi'], ['Esc', 'gelditu'], ['H', 'laguntza']].map(([k, v]) => `<div><kbd>${k}</kbd>${v}</div>`).join('');
  }
  hintsFade(on) { this.el.hints.style.opacity = on ? '1' : '0'; this.el.hints.style.transition = 'opacity 1s'; }
  update(dt) {
    if (this._toastT > 0) { this._toastT -= dt; if (this._toastT <= 0) this.el.toast.classList.remove('on'); }
    if (this._capT > 0) { this._capT -= dt; if (this._capT <= 0) this.el.cap.classList.remove('on'); }
  }
}
