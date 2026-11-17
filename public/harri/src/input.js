// Sarrera bateratua: teklatua, sagua (arrastatu / pointer lock), ukipena (joystick flotatzailea + botoiak), gamepad-a.
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'grab', KeyF: 'throw', KeyQ: 'build', KeyR: 'build', KeyX: 'drop', Escape: 'pause', KeyP: 'pause', KeyM: 'mute', Enter: 'skip', KeyH: 'help',
};
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.held = new Set(); this.edges = new Set(); this.released = new Set();
    this.move = { x: 0, y: 0 }; this.look = { dx: 0, dy: 0 }; this.touch = false; this.pointerLocked = false; this.enabled = true;
    this.lookSens = 1; try { this.lookSens = +localStorage.getItem('harri-look') || 1; } catch { }
    this.onAnyInput = null; this._gpPrev = {};
    window.addEventListener('keydown', e => { if (e.repeat) return; const a = KEYMAP[e.code]; if (!a) return; if (!['pause', 'mute'].includes(a) && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); this._press(a); });
    window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) this._release(a); });
    window.addEventListener('blur', () => { this.held.clear(); this.move.x = this.move.y = 0; });
    // Sagua: arrastatu kamera mugitzeko; mahaigainean klik bikoitzak pointer lock-a (aukerakoa)
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return this._touchDown(e);
      dragging = true; lx = e.clientX; ly = e.clientY; canvas.focus(); this.onAnyInput?.();
      if (e.button === 0 && !this.pointerLocked && this.enabled) this._press('throw');
    });
    window.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return this._touchMove(e);
      if (this.pointerLocked) { this.look.dx += e.movementX * .0025 * this.lookSens; this.look.dy += e.movementY * .0025 * this.lookSens; return; }
      if (!dragging) return; this.look.dx += (e.clientX - lx) * .005 * this.lookSens; this.look.dy += (e.clientY - ly) * .005 * this.lookSens; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('pointerup', e => { if (e.pointerType === 'touch') return this._touchUp(e); dragging = false; this._release('throw'); });
    window.addEventListener('pointercancel', e => { if (e.pointerType === 'touch') this._touchUp(e); dragging = false; });
    canvas.addEventListener('dblclick', () => { if (!this.touch) canvas.requestPointerLock?.(); });
    document.addEventListener('pointerlockchange', () => { this.pointerLocked = document.pointerLockElement === canvas; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    // Ukipena
    this._stick = { id: null, ox: 0, oy: 0 }; this._lookT = { id: null, x: 0, y: 0 };
    this.stickEl = document.getElementById('stickL');
    for (const b of document.querySelectorAll('.tbtn')) {
      const act = b.dataset.act;
      const down = e => { e.preventDefault(); e.stopPropagation(); b.classList.add('pressed'); this._press(act); try { b.setPointerCapture(e.pointerId); } catch { } };
      const up = e => { e.preventDefault(); e.stopPropagation(); b.classList.remove('pressed'); this._release(act); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    const ui = document.getElementById('ui');
    for (const t of ['touchstart', 'touchmove', 'touchend']) ui.addEventListener(t, e => { if (e.target.closest('.btn,button,#mute')) return; if (e.cancelable) e.preventDefault(); }, { passive: false });
    window.addEventListener('touchstart', () => this.setTouch(true), { passive: true, once: true });
    if (window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches) this.setTouch(true);
  }
  setTouch(on) { this.touch = on; document.body.classList.toggle('touch', on); }
  _press(a) { if (!this.held.has(a)) { this.held.add(a); this.edges.add(a); } this.onAnyInput?.(); }
  _release(a) { if (this.held.has(a)) { this.held.delete(a); this.released.add(a); } }
  _touchDown(e) {
    this.setTouch(true); this.onAnyInput?.(); if (e.target.closest('.tbtn,.btn,button')) return;
    const half = e.clientX < window.innerWidth * .5;
    if (half && this._stick.id === null) { this._stick.id = e.pointerId; this._stick.ox = e.clientX; this._stick.oy = e.clientY; this.stickEl.style.left = e.clientX + 'px'; this.stickEl.style.top = e.clientY + 'px'; this.stickEl.classList.add('on'); this.stickEl.firstElementChild.style.transform = 'translate(-50%,-50%)'; }
    else if (!half && this._lookT.id === null) { this._lookT.id = e.pointerId; this._lookT.x = e.clientX; this._lookT.y = e.clientY; }
  }
  _touchMove(e) {
    if (e.pointerId === this._stick.id) { let dx = e.clientX - this._stick.ox, dy = e.clientY - this._stick.oy; const R = 48, len = Math.hypot(dx, dy); if (len > R) { this._stick.ox += dx * (1 - R / len); this._stick.oy += dy * (1 - R / len); dx *= R / len; dy *= R / len; this.stickEl.style.left = this._stick.ox + 'px'; this.stickEl.style.top = this._stick.oy + 'px'; } const dead = 6, m = Math.max(0, (Math.hypot(dx, dy) - dead)) / (R - dead); const ang = Math.atan2(dy, dx); this.move.x = Math.cos(ang) * Math.min(1, m); this.move.y = -Math.sin(ang) * Math.min(1, m); this.stickEl.firstElementChild.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; }
    else if (e.pointerId === this._lookT.id) { this.look.dx += (e.clientX - this._lookT.x) * .007 * this.lookSens; this.look.dy += (e.clientY - this._lookT.y) * .007 * this.lookSens; this._lookT.x = e.clientX; this._lookT.y = e.clientY; }
  }
  _touchUp(e) {
    if (e.pointerId === this._stick.id) { this._stick.id = null; this.move.x = this.move.y = 0; this.stickEl.classList.remove('on'); }
    if (e.pointerId === this._lookT.id) this._lookT.id = null;
  }
  down(a) { return this.held.has(a); }
  pressed(a) { return this.edges.has(a); }
  consume(a) { this.edges.delete(a); }
  // Fotograma bakoitzaren hasieran: teklatua eta gamepad-a mugimenduan nahastu
  poll() {
    let kx = 0, ky = 0; if (this.held.has('left')) kx -= 1; if (this.held.has('right')) kx += 1; if (this.held.has('up')) ky += 1; if (this.held.has('down')) ky -= 1;
    if (this._stick.id === null) { const l = Math.hypot(kx, ky) || 1; this.move.x = kx / l; this.move.y = ky / l; }
    const gps = navigator.getGamepads ? navigator.getGamepads() : []; const gp = gps && [...gps].find(g => g && g.connected);
    if (gp) {
      const dz = v => Math.abs(v) < .18 ? 0 : v; const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
      if (ax || ay) { this.move.x = ax; this.move.y = -ay; }
      this.look.dx += dz(gp.axes[2] || 0) * .06 * this.lookSens; this.look.dy += dz(gp.axes[3] || 0) * .05 * this.lookSens;
      const map = { 0: 'jump', 1: 'dash', 2: 'grab', 3: 'throw', 4: 'drop', 5: 'build', 6: 'build', 7: 'throw', 8: 'skip', 9: 'pause' };
      for (const [i, a] of Object.entries(map)) { const on = !!gp.buttons[i]?.pressed; if (on && !this._gpPrev[i]) this._press(a); if (!on && this._gpPrev[i]) this._release(a); this._gpPrev[i] = on; }
    }
  }
  // Fotogramaren amaieran: ertzak garbitu
  endFrame() { this.edges.clear(); this.released.clear(); this.look.dx = 0; this.look.dy = 0; }
}
