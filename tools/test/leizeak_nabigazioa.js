// LEIZEEN DEIA: NABIGAZIOA (Recast & Detour), ?test kakoekin, tick-ak eskuz.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_nabigazioa.js http://127.0.0.1:8091/games/leizeak.html
// Haraneko sarea kargan → bideak ez dira solidoetan sartzen eta ibaia zubitik bakarrik zeharkatzen dute →
// pottoka ibaiaz bestaldetik zubitik dator (teletransportatu gabe) → gaueko itzal bat harkaitz baten
// inguruan → ANBOTOKO HARPEAK: zaindari bat kutxa-horma baten atzera (inguratuz). Konparazioa: sarerik gabe.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const S = (o) => JSON.stringify(o);
  const KX = 3300;

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => {
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'prologoa', 'ardiak', 'ardiak-saria');
    s.rhythms.push('esnatu', 'pottoka');
    __game.renderer.setPixelRatio(0.25);
    __game.renderer.shadowMap.enabled = false;
  });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  await ev(() => {
    window.__inside = (B, x, z, m) => {
      if (B.rad) {
        const dx = x - B.x, dz = z - B.z, N = B.rad.length, f = ((((Math.atan2(dz, dx) / (2 * Math.PI)) * N) % N) + N) % N, i = Math.floor(f);
        return Math.hypot(dx, dz) < B.rad[i] + (B.rad[(i + 1) % N] - B.rad[i]) * (f - i) + m;
      }
      if (B.r) return Math.hypot(x - B.x, z - B.z) < B.r + m;
      const c = Math.cos(B.rot), n = Math.sin(B.rot), ex = x - B.x, ez = z - B.z, lx = ex * c - ez * n, lz = ex * n + ez * c;
      return Math.abs(lx) < B.w / 2 + m && Math.abs(lz) < B.d / 2 + m;
    };
  });

  /* 1 · haraneko sarea kargan */
  const nav = await ev(() => { const N = __game.NAV, M = N.meshes.ibarra; return { ok: N.ok, ms: N.ms.ibarra, tris: M && M.tris, fails: N.fails }; });
  ok(nav.ok && nav.tris > 1000 && !nav.fails, 'Recast: haraneko nabigazio-sarea kargan', S(nav));

  /* 2 · bideak: solidoetan ez, ibaian ez (zubian bai) */
  const paths = await ev(() => {
    const g = __game, Z = g.ZONES.ibarra,
      shapes = Z.solids.filter((o) => o.pillar && o.r > 0).flatMap((o) => (o.shapes && o.shapes.length ? o.shapes : [{ x: o.x, z: o.z, r: o.r }]).map((B) => ({ B, top: (o.y ?? 0) + (o.h ?? 3) }))),
      pts = [[0, 41], [-22, 30], [24, 28], [8, 12], [0, -50], [-30, -60], [30, -70], [60, 15], [-60, 10], [-45, -20], [45, -30], [20, -100]],
      onBridge = (x, z) => Math.abs(x) < 2.7 && z < -17.5 && z > -39.5,
      out = { n: 0, cross: 0, inSolid: [], inRiver: [], none: [] };
    for (let a = 0; a < pts.length; a++)
      for (let b = a + 1; b < pts.length; b++) {
        const [ax, az] = pts[a], [bx, bz] = pts[b], p = g.navPath(ax, g.gy(ax, az), az, bx, g.gy(bx, bz), bz);
        if (!p) { out.none.push([a, b]); continue; }
        out.n++;
        let crossed = false;
        for (let i = 0; i + 1 < p.length; i++) {
          const L = Math.hypot(p[i + 1].x - p[i].x, p[i + 1].z - p[i].z), n = Math.max(1, Math.ceil(L / 0.4));
          for (let k = 0; k <= n; k++) {
            const x = p[i].x + ((p[i + 1].x - p[i].x) * k) / n, z = p[i].z + ((p[i + 1].z - p[i].z) * k) / n, y = p[i].y + ((p[i + 1].y - p[i].y) * k) / n;
            const hit = shapes.find((s) => s.top > y + 0.3 && __inside(s.B, x, z, -0.05));
            if (hit && out.inSolid.length < 6) out.inSolid.push([a, b, +x.toFixed(1), +z.toFixed(1)]);
            if (g.riverW(x, z) < -0.3) {
              if (onBridge(x, z)) crossed = true;
              else if (out.inRiver.length < 6) out.inRiver.push([a, b, +x.toFixed(1), +z.toFixed(1)]);
            }
          }
        }
        if (crossed) out.cross++;
      }
    return out;
  });
  ok(paths.n >= 50, 'bideak haranean', S({ n: paths.n, ezin: paths.none.length }));
  ok(paths.inSolid.length === 0, 'bideak ez dira solidoetan sartzen', S(paths.inSolid));
  ok(paths.inRiver.length === 0 && paths.cross >= 20, 'ibaia zubitik bakarrik', S({ zubitik: paths.cross, ibaian: paths.inRiver }));

  /* 3 · pottoka: ibaiaz bestaldetik deitu → zubitik dator (teletransportatu gabe) */
  const ponyRun = async (useNav) => {
    await ev((useNav) => {
      const g = __game, p = g.POTT;
      g.NAV.ok = useNav;
      g.clearEnemies && g.clearEnemies();
      g.teleport(0, -8, g.gy(0, -8));
      Object.assign(p, { state: 'idle', x: 14, z: -47, y: g.gy(14, -47), graze: 0, nav: null });
      g.pottokaCall();
    }, useNav);
    return ev(() => {
      const g = __game, p = g.POTT;
      let jumps = 0, minRiver = 99, t = 0, lx = p.x, lz = p.z;
      for (; t < 120 * 30; t++) {
        g.tick(1 / 120);
        if (Math.hypot(p.x - lx, p.z - lz) > 1.5) jumps++;
        lx = p.x;
        lz = p.z;
        minRiver = Math.min(minRiver, g.riverW(p.x, p.z));
        if (p.state === 'idle' && Math.hypot(g.P.x - p.x, g.P.z - p.z) < 3) break;
      }
      return { came: p.state === 'idle' && Math.hypot(g.P.x - p.x, g.P.z - p.z) < 3, s: +(t / 120).toFixed(1), jumps, minRiver: +minRiver.toFixed(2), x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
    });
  };
  const pNav = await ponyRun(true);
  ok(pNav.came && pNav.jumps === 0, 'pottoka: ibaiaz bestaldetik, zubitik dator', S(pNav));
  const pOld = await ponyRun(false);
  console.log('     (sarerik gabe: ' + S(pOld) + ')');
  await ev(() => { __game.NAV.ok = true; });

  /* 4 · gaueko itzala: harkaitz handi baten atzean → inguratu eta iritsi */
  const rock = await ev(() => {
    const g = __game;
    const r = g.ZONES.ibarra.solids.find((o) => o.shapes && o.shapes[0].rad && o.shapes[0].rmax > 1.4 && o.shapes[0].rmax < 4 && Math.hypot(o.x, o.z - 38) > 48 && o.z < 50 && g.walkSD(o.x, o.z) > 8 && g.riverW(o.x, o.z) > 8 && o.y + o.h > g.gy(o.x, o.z) + 1.5);
    return r && { x: r.x, z: r.z, R: r.shapes[0].rmax };
  });
  ok(!!rock, 'harkaitz bat zelaietan', S(rock));
  const shadowRun = async (useNav) => ev(([R, useNav]) => {
    const g = __game;
    g.NAV.ok = useNav;
    for (const e of g.ENEMIES.slice()) e.state = 'dead';
    g.ENEMIES.length = 0;
    const px = R.x, pz = R.z - R.R - 3.2, ex = R.x, ez = R.z + R.R + 2.2;
    g.teleport(px, pz, g.gy(px, pz));
    const e = g.spawnEnemy('grunt', -1, ex, ez, g.gy(ex, ez));
    Object.assign(e, { night: true, terrain: true, K: 0.9, state: 'chase', t: 0 });
    let t = 0, best = 99;
    for (; t < 120 * 8; t++) {
      g.P.hp = g.P.maxHp;
      g.tick(1 / 120);
      best = Math.min(best, Math.hypot(e.x - g.P.x, e.z - g.P.z));
      if (e.state === 'wind' || e.state === 'lunge') break;
    }
    const r = { reached: e.state === 'wind' || e.state === 'lunge', s: +(t / 120).toFixed(1), best: +best.toFixed(1) };
    e.state = 'dead';
    return r;
  }, [rock, useNav]);
  if (rock) {
    const sNav = await shadowRun(true);
    ok(sNav.reached, 'gaueko itzala: harkaitza inguratuta, iritsi', S(sNav));
    console.log('     (sarerik gabe: ' + S(await shadowRun(false)) + ')');
    await ev(() => { __game.NAV.ok = true; for (const e of __game.ENEMIES) e.state = 'dead'; });
  }

  /* 5 · ANBOTOKO HARPEAK: zaindari bat kutxa-horma baten atzera (susmoa) */
  await ev(() => { __game.saved.flags.push('inguma', 'irati-inguma'); __game.harpeakStart(); });
  for (let i = 0; i < 16; i++) {
    const on = await ev(() => __game.FILM.on || !!__game.cinematicState());
    if (!on) break;
    await ev(() => { if (__game.FILM.on) __game.filmSkip(); else __game.endScene(); });
    await page.waitForTimeout(80);
  }
  const hk = await ev(() => { const N = __game.NAV, k = Object.keys(N.meshes).filter((k) => k.startsWith('harpeak')); return { zone: __game.ZONE.cur, keys: k, ms: k.map((x) => N.ms[x]), ok: k.every((x) => N.meshes[x]) }; });
  ok(hk.zone === 'harpeak' && hk.keys.length >= 2 && hk.ok, 'harpeak: bi garaietako sareak sartzean', S(hk));
  const guardRun = async (useNav) => ev(([KX, useNav]) => {
    const g = __game, G = g.SIG.guards;
    g.NAV.ok = useNav;
    G.forEach((e) => Object.assign(e.zain, { mode: 'sleep', sleepT: 999 }));
    const e = G[1], Z = e.zain;
    /* C gela: kutxa-horma (KX-7, -64), 6 × 1.4: iparretik hegoaldera */
    g.teleport(KX + 12, -88, 0);
    e.x = KX - 7;
    e.z = -61.2;
    e.vx = e.vz = 0;
    e.nav = null;
    const tgt = { x: KX - 7, z: -67 };
    Object.assign(Z, { mode: 'suspect', target: tgt, modeT: 0, lookT: 0, sus: 0, markK: 'q', markT: 1 });
    let t = 0, best = 99;
    for (; t < 120 * 6.5; t++) {
      g.tick(1 / 120);
      Z.target = tgt;
      best = Math.min(best, Math.hypot(e.x - tgt.x, e.z - tgt.z));
      if (best < 0.6) break;
    }
    return { arrived: best < 0.6, s: +(t / 120).toFixed(1), best: +best.toFixed(2), x: +(e.x - KX).toFixed(1), z: +e.z.toFixed(1) };
  }, [KX, useNav]);
  const gNav = await guardRun(true);
  ok(gNav.arrived, 'zaindaria: kutxa-horma inguratuta, susmoaren lekura', S(gNav));
  console.log('     (sarerik gabe: ' + S(await guardRun(false)) + ')');
  await ev(() => { __game.NAV.ok = true; });

  ok(errs.length === 0, 'errorerik ez', errs.slice(0, 3).join(' | '));
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
