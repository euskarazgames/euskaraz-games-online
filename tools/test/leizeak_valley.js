// LEIZEEN DEIA: haraneko lurraren proba (fisika, mugak, ibaia eta bideak), ?test kakoekin.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_valley.js http://127.0.0.1:8091/games/leizeak.html
// Jokoaren begizta geldirik (__hold) eta tick-ak eskuz: emaitza berdina makina azkar zein motelean.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; __game.saved.flags.push('intro'); });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });

  /* laguntzaileak: munduko norabidean ibili (makila kameraren biraketatik), garaia, teleport */
  const setup = (phase, x, y, z) => ev(([phase, x, y, z]) => {
    const g = __game;
    g.input.x = g.input.z = 0;
    for (const k in g.input.keys) g.input.keys[k] = false;
    if (g.phase() !== phase) { g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); }
    g.teleport(x, z, y === null ? g.gy(x, z) : y);
    g.P.hp = g.P.maxHp;
    for (let i = 0; i < 12; i++) g.tick(1 / 120);
  }, [phase, x, y, z]);
  const walk = (dx, dz, secs, run = false) => ev(([dx, dz, secs, run]) => {
    const g = __game, n = Math.hypot(dx, dz) || 1;
    dx /= n; dz /= n;
    g.input.x = 0.83 * dx - 0.557 * dz;
    g.input.z = 0.557 * dx + 0.83 * dz;
    g.input.keys.ShiftLeft = run;
    for (let i = 0; i < Math.round(secs * 120); i++) g.tick(1 / 120);
    g.input.x = g.input.z = 0;
    g.input.keys.ShiftLeft = false;
    for (let i = 0; i < 20; i++) g.tick(1 / 120);
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), area: g.state().area, zone: g.ZONE.cur, hp: g.P.hp, resp: g.state().respawnTimer };
  }, [dx, dz, secs, run]);
  /* bide bat puntuz puntu */
  const route = async (pts, run = false) => {
    let p;
    for (const [x, z] of pts) {
      const cur = await ev(() => [__game.P.x, __game.P.z]);
      const d = Math.hypot(x - cur[0], z - cur[1]);
      p = await walk(x - cur[0], z - cur[1], d / (run ? 12.8 : 7.7));
    }
    return p;
  };
  const S = (p) => JSON.stringify(p);

  /* 1 · basoko lur-ezponda: oinez igo */
  await setup(1, -26, 0, -64);
  let p = await walk(0, -1, 4);
  ok(p.y > 4.8 && p.area === 'basoa', 'basoko ezpondan gora → basoa (y≈5)', S(p));
  /* 2 · lepoa: atea saihestu nahian (ezpondaren alboetatik, lurretik) → ezin */
  for (const [sx, sz, dx, dz] of [[-84, -103, 1, 0], [-64, -103, -1, 0], [-74.6, -112, 0, 1]]) {
    await setup(1, sx, null, sz);
    p = await walk(dx, dz, 3);
    ok(p.y < 9, `atea saihestu ezin (${sx},${sz})`, S(p));
  }
  /* 3 · lepoko bidea atera arte (atea itxita) */
  await setup(1, -36, 0, -95.3);
  p = await route([[-44, -98.3], [-52, -100.9], [-56.4, -101.3], [-64, -99.8], [-71.4, -98.4], [-74.4, -99], [-74.6, -104]]);
  ok(p.y > 9 && p.z > -102.4, 'lepoko bidea: haize-errotaren ateraino (itxita)', S(p));
  /* 4 · atea irekita: lepoaren gainera */
  await ev(() => { const g = __game; g.flagSet('lepoa'); for (let i = 0; i < 400; i++) g.tick(1 / 120); });
  p = await walk(0, -1, 2.5);
  ok(p.y > 11.8 && p.z < -106, 'atea irekita: lepoaren gainean (y≈12)', S(p));
  /* 5 · portuko eskailera: kairaino */
  await setup(1, -5.6, 0, 60.4);
  p = await walk(14, 13, 2.55);
  ok(p.y < -6.6 && p.y > -7.5 && p.z > 72, 'portuko eskaileran behera → kaia', S(p));
  /* 6 · itsaslabarra: ezin da erori */
  await setup(1, 30, 0, 52);
  p = await walk(0, 1, 3);
  ok(p.y > -0.5 && p.z < 64, 'itsaslabarraren ertzean gelditu', S(p));
  /* 7 · iraganean ibaia: ertzean gelditu, ez ito */
  await setup(0, 12, 0, -12);
  p = await walk(0, -1, 3);
  ok(!p.resp && p.y > -1.7 && p.z > -22.5, 'iraganean: ur-ertzean gelditu', S(p));
  /* 8 · orainean ibaia izoztuta: zeharkatu */
  await setup(1, 12, 0, -12);
  p = await walk(0, -1, 4.2);
  ok(p.z < -38 && p.y > -1.3, 'orainean: izotzaren gainetik ibaia zeharkatu', S(p));
  /* 9 · iraganean uretara erori → korronteak eraman (bizitza bat) */
  await setup(1, 12, 0, -12);
  await ev(() => { const g = __game; for (let i = 0; i < 60; i++) g.tick(1 / 120); });
  await setup(0, 12, -1.2, -26);
  p = await ev(() => { const g = __game; for (let i = 0; i < 200; i++) g.tick(1 / 120); return { x: g.P.x, y: g.P.y, z: g.P.z, hp: g.P.hp, max: g.P.maxHp }; });
  ok(p.hp === p.max - 1 && p.z > -22, 'iraganean uretan → itzuli lur seguru batera (-1 arnasa)', S(p));
  /* 10 · leize-zuloa: ertzean gelditu */
  await setup(1, -78, -1.2, -31);
  p = await walk(-1, 0, 3);
  ok(p.x > -89.8 && p.y > -1.5 && !p.resp, 'leize-zuloaren ertzean gelditu', S(p));
  ok(p.area === 'zuloa', 'gunea: LEIZE-ZULOA', S(p));
  /* 11 · ekialdeko muinoak: muga */
  await setup(1, 72, 0, 0);
  p = await walk(1, 0, 3);
  ok(p.x < 83 && p.x > 76, 'ekialdeko muinoetan muga', S(p));
  /* 12 · ur-jauzia: iraganean atzean pasabidea, orainean izotz-gortina */
  await setup(1, 93, -0.9, -28.5);
  p = await walk(1, 0, 1.6);
  ok(p.x < 98.2, 'orainean: izotz-gortinak geldiarazi', S(p));
  await setup(0, 93, -0.9, -28.5);
  p = await walk(1, 0, 1.6);
  ok(p.x > 99.4 || p.zone !== 'ibarra', 'iraganean: ur-jauziaren atzera pasa', S(p));
  /* 13 · lurra eta oinak: hainbat puntutan P.y = gy */
  const diff = await ev(() => {
    const g = __game, out = [];
    for (const [x, z] of [[20, 10], [-40, -5], [30, -60], [-60, -80], [60, -100], [-20, 50]]) {
      g.teleport(x, z, 0);
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      out.push(+(g.P.y - g.topY(g.P.platform, g.P.x, g.P.z)).toFixed(3));
    }
    return out;
  });
  ok(diff.every((d) => Math.abs(d) < 0.02), 'oinak lurrean (P.y = lurraren altuera)', S(diff));

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
