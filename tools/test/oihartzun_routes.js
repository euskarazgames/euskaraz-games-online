// OIHARTZUN: hautazko erronken ibilbideak jokoaren fisika errealarekin egiaztatzen ditu.
// Bot batek plataformaz plataforma salto egiten du (korrika, jauzi bikoitza, garaia airean, DASH)
// eta lurreratze bakoitza egiaztatzen du. Erabili:
//   NODE_PATH=$(npm root -g) node tools/test/oihartzun_routes.js http://127.0.0.1:8091/games/oihartzun.html
const { launch } = require('./_browser');
const url = (process.argv[2] || 'http://127.0.0.1:8091/games/oihartzun.html') + '?test';
(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.ECHO && window.__game.ECHO.list.length === 3, null, { timeout: 90000 });
  const res = await page.evaluate(() => {
    const g = window.__game, P = g.P, out = [];
    g.resume();
    /* kaiolak: erronkak gaindituta (alboko ateak irekita) erronken ibilbideetarako */
    g.saved.cleared = [0, 1, 2, 3, 4];
    for (const C of g.CAGES) for (const x of C.gates) x.open = true;
    const find = (x, z, y) => g.platforms.find(s => Math.abs((s.baseX ?? s.x) - x) < 0.01 && Math.abs(s.z - z) < 0.01 && Math.abs(s.y - y) < 0.01);
    const isl = (i) => g.platforms.find(s => s.island === i);
    const islet = (i) => g.platforms.find(s => s.islet === i);
    const half = (s, dx, dz) => (s.rx ? s.rx : Math.min(Math.abs(dx) > 1e-6 ? s.w / 2 / Math.abs(dx) : 1e9, Math.abs(dz) > 1e-6 ? s.d / 2 / Math.abs(dz) : 1e9));
    /* eszenak eta elkarrizketak (misterioak, sariak) ez dute bot-a geldiarazi behar */
    function skip() {
      if (g.cinematicState()) g.endScene();
      const b = document.querySelector('#choices button');
      if (b && !document.getElementById('overlay').hidden) b.click();
    }
    function steer(dx, dz) {
      const n = Math.hypot(dx, dz) || 1;
      dx /= n; dz /= n;
      g.input.x = 0.83 * dx - 0.557 * dz;
      g.input.z = 0.557 * dx + 0.83 * dz;
    }
    /* A plataformatik B-ra: korrika, ertzean jauzi, behar bada garaia airean, jauzi bikoitza eta DASH */
    function hop(A, B, label, quick) {
      const T0 = performance.now();
      const ph = B.phase === -1 ? null : B.phase;
      if (A.phase !== -1 && g.phase() !== A.phase) g.switchPhase();
      /* faseCooldown eta lurreratzea (harri erorkorretan: berehala) */
      for (let i = 0; i < (quick ? 2 : 80); i++) g.tick(1 / 120);
      let dx = B.x - P.x, dz = B.z - P.z;
      const n = Math.hypot(dx, dz);
      const ux = dx / n, uz = dz / n;
      /* ertza: A-ren erdigunetik B-ranzko norabidean */
      const edge = half(A, ux, uz);
      g.input.keys = { ShiftLeft: true };
      let state = 'run', t = 0, jumped2 = false, dashed = false, switched = false, landedOn = null;
      for (let k = 0; k < 120 * 6; k++) {
        skip();
        t += 1 / 120;
        const tx = B.x - P.x, tz = B.z - P.z, d = Math.hypot(tx, tz);
        const over = d < half(B, tx / (d || 1), tz / (d || 1)) * 0.45;
        if (over && state !== 'run') { g.input.x = g.input.z = 0; g.input.keys = {}; } else steer(tx, tz);
        if (state === 'run') {
          const along = (P.x - A.x) * ux + (P.z - A.z) * uz;
          if (along > edge - 0.9) { g.jump(); state = 'air'; t = 0; }
        } else {
          if (ph !== null && !switched && t > 0.1 && g.phase() !== ph) { g.switchPhase(); switched = true; }
          const gap = d - half(B, tx / (d || 1), tz / (d || 1));
          const needH = B.y - P.y;
          if (!jumped2 && P.vy < 1.5 && (gap > 2.5 || needH > 0.4)) { g.jump(); jumped2 = true; }
          if (jumped2 && !dashed && P.vy < -1 && gap > 3.5 && P.dashReady) { g.dash(); dashed = true; }
          if (P.grounded && t > 0.05) { landedOn = P.platform; break; }
        }
        if (g.state().respawnTimer > 0) break;
        g.tick(1 / 120);
      }
      g.input.x = g.input.z = 0; g.input.keys = {};
      for (let i = 0; i < (quick ? 4 : 30); i++) g.tick(1 / 120);
      const ok = landedOn === B || P.platform === B;
      out.push({ label, ok, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)], jumped2, dashed, switched, ms: Math.round(performance.now() - T0) });
      return ok;
    }
    /* uharte barruko helburu altu batera igo: hurbildu, jauzi, jauzi bikoitza */
    function climb(B, label) {
      g.input.keys = {};
      for (let i = 0; i < 20; i++) g.tick(1 / 120);
      let state = 'run', t = 0, j2 = false, landed = false;
      for (let k = 0; k < 120 * 6; k++) {
        skip();
        t += 1 / 120;
        const tx = B.x - P.x, tz = B.z - P.z, d = Math.hypot(tx, tz), hw = (B.w || 2) / 2;
        if (state === 'run') {
          /* jauzi-tartea: helburuaren ertzetik 1.3 m; urrunegi bada hurbildu, gertuegi bada atzera */
          if (d - hw > 1.5) steer(tx, tz);
          else if (d - hw < 0.8) steer(-tx, -tz);
          else { steer(tx, tz); g.jump(); state = 'air'; t = 0; }
        } else {
          if (d > hw * 0.4) steer(tx, tz); else { g.input.x = g.input.z = 0; }
          if (!j2 && P.vy < 0.8) { g.jump(); j2 = true; }
          if (P.grounded && t > 0.08) { landed = P.platform === B; if (landed || P.y < B.y - 0.3) break; }
        }
        g.tick(1 / 120);
      }
      g.input.x = g.input.z = 0;
      for (let i = 0; i < 20; i++) g.tick(1 / 120);
      landed = landed || P.platform === B;
      out.push({ label, ok: landed, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)], jumped2: j2 });
      return landed;
    }
    function route(name, stage, start, chain) {
      g.saved.stage = stage;
      g.teleport(start.x, start.z, start.y);
      for (let i = 0; i < chain.length - 1; i++) if (!hop(chain[i], chain[i + 1], name + ' ' + i + '→' + (i + 1))) return false;
      return true;
    }
    const D = g.ECHO_DEFS;
    const W = (d, i) => find(d.waves[i][0], d.waves[i][1], d.waves[i][2]);
    const K = (d, i) => find(d.planks[i][0], d.planks[i][1], d.planks[i][2]);
    const I1 = isl(1), I3 = isl(3), I4 = isl(4);
    /* A: I1 → 4 olatu → uhartetxoa → 2 ohol (iragana) → I1 */
    const a = D[0];
    route('A', 1, { x: -7, z: -21, y: I1.y }, [I1, W(a, 0), W(a, 1), W(a, 2), W(a, 3), islet(0), K(a, 0), K(a, 1), I1]);
    /* B: I3 → olatua → ohola → olatua → ohola → uhartetxoa → I3 (jaitsi) */
    const b = D[1];
    route('B', 3, { x: 8, z: -103, y: I3.y }, [I3, W(b, 0), K(b, 0), W(b, 1), K(b, 1), islet(1), I3]);
    /* C: I4 → olatua → ohol mugikorra → olatua → ohola → uhartetxoa (kristala) → I4 */
    const c = D[2];
    route('C', 4, { x: -38, z: -134, y: I4.y }, [I4, W(c, 0), K(c, 0), W(c, 1), K(c, 1), islet(2), I4]);
    /* eraikuntza-puzzleak: kaxak pilatu (API) eta errunara igo jokalariaren fisikarekin */
    const C = g.CRAFT;
    function place(Z, q, x, z) {
      skip();
      C.on = true; C.zone = Z; C.held = q; C.tx = x; C.tz = z;
      for (let i = 0; i < 120; i++) { skip(); C.on = true; g.tick(1 / 120); }
      g.craftRelease();
      for (let i = 0; i < 10; i++) g.tick(1 / 120);
      g.craftExit();
    }
    function craftPuzzle(k, layout, start, label) {
      const Z = C.puzzles[k];
      g.saved.cleared = g.saved.cleared.filter((i) => i !== Z.D.island);
      Z.solved = false;
      g.saved.stage = Z.D.island;
      g.teleport(start[0], start[1], Z.I.y);
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      const pcs = C.pieces.filter((q) => q.kind === 'crate' && Math.hypot(q.home.x - Z.I.x, q.home.z - Z.I.z) < 20);
      layout.forEach(([x, z], i) => place(Z, pcs[i], Z.plat.x + x, Z.plat.z + z));
      /* eskailera: lurretik pila txikienera, gero handienera, gero errunara */
      const tops = {};
      for (const q of pcs) { const key = q.x + ',' + q.z; if (!tops[key] || q.y > tops[key].y) tops[key] = q; }
      const steps = Object.values(tops).sort((a, b) => a.y - b.y);
      const ground = g.platforms.find((s) => s.island === Z.D.island);
      let ok = true;
      for (const st of steps) { ok = climb(st, label + ' kaxa ' + st.y.toFixed(0)); if (!ok) break; }
      if (ok) ok = climb(Z.plat, label + ' erruna');
      out.push({ label: label + ' ebatzita', ok: ok && Z.solved && g.isCleared(Z.D.island), at: [Z.plat.x, Z.plat.y, Z.plat.z] });
    }
    craftPuzzle(0, [[-2, 0], [-2, 0]], [-1, -21], 'P1');
    craftPuzzle(1, [[-2.5, 0], [-2.5, 0], [-2.5, 0], [-4.5, 0], [-4.5, 0]], [-3, -90], 'P2');
    /* ORRATZA: Gauekoren erlojurako igoera osoa (kristal-harriak, erorkorrak, haizea, erruna) */
    function ascentRoute() {
      const A = g.ASC, Ls = A.list, I4 = isl(4), I5 = isl(5);
      if (g.cinematicState()) g.endScene();
      g.saved.stage = 4;
      g.saved.cleared = [0, 1, 2, 3, 4];
      for (const C of g.CAGES) for (const x of C.gates) x.open = true;
      g.teleport(-27, -135, I4.y);
      const [C0, C1, C2, C3, E1, E2, C4, S1, S2, C5, , C6, L1, L2] = Ls;
      const chain = [[I4, C0], [C0, C1], [C1, C2], [C2, C3], [C3, E1], [E1, E2], [E2, C4], [C4, S1], [S1, S2, 1], [S2, C5, 1]];
      for (const [a, b, q] of chain) if (!hop(a, b, 'ORR ' + Ls.indexOf(b), q)) return false;
      /* haizea: C5-etik korrontera, gora, eta C6-ra */
      const W = A.winds[0];
      let ok = false;
      g.input.keys = {};
      for (let k = 0; k < 120 * 8 && !ok; k++) {
        if (g.cinematicState()) g.endScene();
        if (P.y < C6.y + 1.4) steer(W.x - P.x, W.z - P.z);
        else steer(C6.x - P.x, C6.z - P.z);
        if (Math.hypot(P.x - C6.x, P.z - C6.z) < 0.6) g.input.x = g.input.z = 0;
        g.tick(1 / 120);
        ok = P.grounded && P.platform === C6;
      }
      g.input.x = g.input.z = 0;
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      out.push({ label: 'ORR haizea', ok, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)] });
      if (!ok) return false;
      /* erruna: sorginkeria (auto-helburua) */
      g.attack();
      for (let i = 0; i < 90; i++) g.tick(1 / 120);
      out.push({ label: 'ORR erruna', ok: A.rune.lit, at: [+A.rune.x.toFixed(1), +A.rune.y.toFixed(1), +A.rune.z.toFixed(1)] });
      if (!A.rune.lit) return false;
      for (const [a, b] of [[C6, L1], [L1, L2], [L2, I5]]) if (!hop(a, b, 'ORR ' + (b === I5 ? 'I5' : Ls.indexOf(b)), true)) return false;
      out.push({ label: 'ORR gailurra', ok: g.saved.stage === 5, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)], falls: A.falls });
      /* erortzea: azken kanpaian berragertu, bizitzarik galdu gabe */
      for (let i = 0; i < 4; i++) { skip(); g.tick(1 / 120); }
      g.saved.stage = 4;
      g.teleport(C4.x, C4.z, C4.y);
      for (let i = 0; i < 20; i++) g.tick(1 / 120);
      const hp0 = P.hp, f0 = A.falls;
      g.teleport(C4.x + 3.5, C4.z + 3.5, C4.y + 0.5);
      for (let i = 0; i < 240 && A.falls === f0; i++) g.tick(1 / 120);
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      out.push({ label: 'ORR erorketa', ok: A.falls === f0 + 1 && P.hp === hp0 && Math.hypot(P.x - C6.x, P.z - C6.z) < 0.5, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)] });
      return true;
    }
    ascentRoute();
    /* errun-puzzleak: garai bakoitzeko errunak sorginkeriaz piztu, denbora-mugaren barruan */
    function runePuzzle(k) {
      const S = g.RUNE_PUZ[k], I = g.ISLANDS[S.D.island];
      for (let i = 0; i < 4; i++) { skip(); g.tick(1 / 120); }
      g.saved.stage = Math.max(g.saved.stage, S.D.island);
      if (!g.saved.cleared.includes(S.D.island)) g.saved.cleared.push(S.D.island);
      g.teleport(I.x, I.z, I.y);
      for (let i = 0; i < 30; i++) { skip(); g.tick(1 / 120); }
      const t0 = performance.now();
      for (const R of S.list) {
        if (R.era !== -1 && g.phase() !== R.era) { g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); }
        /* errunari begira jarri (auto-helburua) eta jaurti */
        for (let i = 0; i < 120 * 2 && Math.hypot(R.x - P.x, R.z - P.z) > 9; i++) { skip(); steer(R.x - P.x, R.z - P.z); g.tick(1 / 120); }
        g.input.x = g.input.z = 0;
        steer(R.x - P.x, R.z - P.z); g.tick(1 / 120); g.input.x = g.input.z = 0;
        for (let tries = 0; tries < 4 && !R.lit; tries++) {
          g.attack();
          for (let i = 0; i < 40; i++) { skip(); g.tick(1 / 120); }
        }
      }
      out.push({ label: 'ERRUNAK ' + S.D.island, ok: S.solved, at: [I.x, I.y, I.z], secs: Math.round(performance.now() - t0) });
    }
    runePuzzle(0);
    runePuzzle(1);
    return { out, echoes: g.saved.echoes };
  });
  let fails = 0;
  for (const r of res.out) {
    if (!r.ok) fails++;
    console.log((r.ok ? 'OK  ' : 'HUTS') + ' ' + r.label.padEnd(8) + ' ' + JSON.stringify(r.at) + (r.switched ? ' garaia' : '') + (r.jumped2 ? ' ×2' : '') + (r.dashed ? ' dash' : ''));
  }
  console.log('kanpaiak:', JSON.stringify(res.echoes));
  console.log(fails ? fails + ' HUTSEGITE' : 'IBILBIDE GUZTIAK OSATU DAITEZKE');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
