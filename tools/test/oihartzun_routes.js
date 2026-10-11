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
    const find = (x, z, y) => g.platforms.find(s => Math.abs((s.baseX ?? s.x) - x) < 0.01 && Math.abs(s.z - z) < 0.01 && Math.abs(s.y - y) < 0.01);
    const isl = (i) => g.platforms.find(s => s.island === i);
    const islet = (i) => g.platforms.find(s => s.islet === i);
    const half = (s, dx, dz) => (s.rx ? s.rx : Math.min(Math.abs(dx) > 1e-6 ? s.w / 2 / Math.abs(dx) : 1e9, Math.abs(dz) > 1e-6 ? s.d / 2 / Math.abs(dz) : 1e9));
    function steer(dx, dz) {
      const n = Math.hypot(dx, dz) || 1;
      dx /= n; dz /= n;
      g.input.x = 0.83 * dx - 0.557 * dz;
      g.input.z = 0.557 * dx + 0.83 * dz;
    }
    /* A plataformatik B-ra: korrika, ertzean jauzi, behar bada garaia airean, jauzi bikoitza eta DASH */
    function hop(A, B, label) {
      const T0 = performance.now();
      const ph = B.phase === -1 ? null : B.phase;
      if (A.phase !== -1 && g.phase() !== A.phase) g.switchPhase();
      for (let i = 0; i < 80; i++) g.tick(1 / 120); /* faseCooldown eta lurreratzea */
      let dx = B.x - P.x, dz = B.z - P.z;
      const n = Math.hypot(dx, dz);
      const ux = dx / n, uz = dz / n;
      /* ertza: A-ren erdigunetik B-ranzko norabidean */
      const edge = half(A, ux, uz);
      g.input.keys = { ShiftLeft: true };
      let state = 'run', t = 0, jumped2 = false, dashed = false, switched = false, landedOn = null;
      for (let k = 0; k < 120 * 6; k++) {
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
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      const ok = landedOn === B || P.platform === B;
      out.push({ label, ok, at: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)], jumped2, dashed, switched, ms: Math.round(performance.now() - T0) });
      return ok;
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
