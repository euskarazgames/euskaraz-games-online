// ERAIKI / LOTU / DESMUNTATU: blokeen sarea eta euskarri-ebazlea (logika hutsa, three.js gabe → unit probak Node-n).
// Gelaxka (i,j,k): x∈[i,i+1], y∈[k,k+1], z∈[j,j+1]. Bloke bakoitzak id egonkorra du.
// Euskarria (dist): 0 = lurraren edo beste bloke euskarridun baten gainean; 1 = lur naturalari alboz lotuta (ainguratua);
// d+1 = d distantziako bloke bati alboz lotuta. MAX_CANTILEVER baino handiagoa → ez dago euskarririk (erori egiten da).
export const MAX_CANTILEVER = 2;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const key = (i, j, k) => i + ',' + j + ',' + k;

export class BuildGrid {
  /** env: { groundTop(i,j) → zutabeko lur/estatikoaren goiko altuera; solidCell(i,j,k) → gelaxka lur naturalak betetzen du } */
  constructor(env) { this.env = env; this.cells = new Map(); this.byId = new Map(); }
  has(i, j, k) { return this.cells.has(key(i, j, k)); }
  get(i, j, k) { return this.cells.get(key(i, j, k)); }
  list() { return [...this.cells.values()]; }
  clear() { this.cells.clear(); this.byId.clear(); }
  rests(i, j, k) { const g = this.env.groundTop(i, j); return Math.abs(g - k) <= 0.06; }
  anchored(i, j, k) { for (const [di, dj] of N4) if (this.env.solidCell(i + di, j + dj, k)) return true; return false; }
  /** Euskarri-mapa: key → dist (Infinity = euskarririk ez). extra: kontuan hartzeko bloke gehigarria {i,j,k}. without: kanpoan uzteko gakoa. */
  supportMap(extra = null, without = null) {
    const cells = new Map(this.cells); if (without) cells.delete(without); if (extra) cells.set(key(extra.i, extra.j, extra.k), { ...extra, id: '__new' });
    const dist = new Map(); for (const k of cells.keys()) dist.set(k, Infinity);
    // Iterazioa egonkortu arte (multzo txikiak: < 100 bloke)
    for (let it = 0; it < 64; it++) {
      let changed = false;
      for (const [kk, c] of cells) {
        let d = dist.get(kk);
        if (this.rests(c.i, c.j, c.k)) d = Math.min(d, 0);
        const below = key(c.i, c.j, c.k - 1); if (cells.has(below)) d = Math.min(d, dist.get(below));
        if (this.anchored(c.i, c.j, c.k)) d = Math.min(d, 1);
        for (const [di, dj] of N4) { const nk = key(c.i + di, c.j + dj, c.k); if (cells.has(nk)) d = Math.min(d, dist.get(nk) + 1); }
        if (d < dist.get(kk)) { dist.set(kk, d); changed = true; }
      }
      if (!changed) break;
    }
    return dist;
  }
  /** Bloke berria (i,j,k)-n jar daiteke? {ok, reason, dist, joins} */
  canPlace(i, j, k) {
    if (this.has(i, j, k)) return { ok: false, reason: 'beteta' };
    if (this.env.solidCell(i, j, k)) return { ok: false, reason: 'lurra' };
    if (this.env.groundTop(i, j) > k + 0.06) return { ok: false, reason: 'lurra' };
    const d = this.supportMap({ i, j, k }).get(key(i, j, k));
    if (!(d <= MAX_CANTILEVER)) return { ok: false, reason: 'euskarririk ez', dist: d };
    return { ok: true, dist: d, joins: this.joinsOf(i, j, k) };
  }
  /** Alboko eta goi/beheko bloke eta lur naturalarekiko loturak (LOTU) */
  joinsOf(i, j, k) {
    const out = [];
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const n = this.get(i + di, j + dj, k + dk);
      if (n) out.push({ type: 'bloke', id: n.id, di, dj, dk });
      else if (dk === 0 && this.env.solidCell(i + di, j + dj, k)) out.push({ type: 'lurra', di, dj, dk });
    }
    return out;
  }
  place(id, i, j, k) {
    const r = this.canPlace(i, j, k); if (!r.ok) return r;
    if (this.byId.has(id)) return { ok: false, reason: 'bikoiztua' };   // id egonkorra: bloke bat ezin da bi aldiz egon
    const c = { id, i, j, k }; this.cells.set(key(i, j, k), c); this.byId.set(id, c);
    return { ok: true, joins: r.joins, dist: r.dist };
  }
  /** DESMUNTATU: blokea kendu; euskarririk gabe geratzen direnak ere askatu (inoiz ez dira galtzen: deitzaileari itzultzen zaizkio). */
  remove(i, j, k) {
    const kk = key(i, j, k), c = this.cells.get(kk); if (!c) return { removed: null, dropped: [] };
    this.cells.delete(kk); this.byId.delete(c.id);
    const dropped = []; let again = true;
    while (again) {
      again = false; const dist = this.supportMap();
      for (const [k2, d] of dist) if (!(d <= MAX_CANTILEVER)) { const b = this.cells.get(k2); this.cells.delete(k2); this.byId.delete(b.id); dropped.push(b); again = true; }
    }
    return { removed: c, dropped };
  }
  /** Egiturak (lotutako osagaiak, union-find) */
  structures() {
    const parent = new Map(); const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const k of this.cells.keys()) parent.set(k, k);
    for (const c of this.cells.values()) for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) { const nk = key(c.i + di, c.j + dj, c.k + dk); if (parent.has(nk)) { const a = find(key(c.i, c.j, c.k)), b = find(nk); if (a !== b) parent.set(a, b); } }
    const groups = new Map(); for (const [k, c] of this.cells) { const r = find(k); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); }
    return [...groups.values()];
  }
  /** Bide zapalgarria: k mailako blokeen bidez, `from` multzoko gelaxka batetik `to` multzokora (4-auzokideak). */
  walkable(k, fromSet, toSet) {
    const seen = new Set(), q = [];
    for (const c of this.cells.values()) if (c.k === k && fromSet(c.i, c.j)) { q.push(c); seen.add(key(c.i, c.j, c.k)); }
    while (q.length) { const c = q.shift(); if (toSet(c.i, c.j)) return true; for (const [di, dj] of N4) { const nk = key(c.i + di, c.j + dj, k); if (!seen.has(nk) && this.cells.has(nk)) { seen.add(nk); q.push(this.cells.get(nk)); } } }
    return false;
  }
  snapshot() { return this.list().map(c => ({ ...c })); }
}

// Inbentarioa: harri txikiak (gehienez 3), id bakoitza behin bakarrik.
export class Inventory {
  constructor(max = 3) { this.max = max; this.ids = []; }
  get count() { return this.ids.length; }
  add(id) { if (this.ids.length >= this.max || this.ids.includes(id)) return false; this.ids.push(id); return true; }
  take() { return this.ids.pop() ?? null; }
  has(id) { return this.ids.includes(id); }
  clear() { this.ids.length = 0; }
}
