// LEIZEEN DEIA: HARANEKO MISTERIOAK (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_sekretuak.js http://127.0.0.1:8091/games/leizeak.html
// Sasi-habia (SUA) → harri-zutabea (KATEA) → errota zaharra (HAIZE-ADARRA): hiru arnasa-zati, egunkarian pistak.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia', 'adarra', 'tximistarria');
    s.tod = 0.4;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 10 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const tpFace = (x, z, tx, tz) => ev(([x, z, tx, tz]) => { const g = __game, s = g.support(x, z, 40), y = s ? g.topY(s, x, z) : g.gy(x, z); g.teleport(x, z, y); const a = Math.atan2(tx - x, tz - z); g.P.angle = a; g.hero.rotation.y = a; for (let i = 0; i < 6; i++) g.tick(1 / 120); return [+g.P.x.toFixed(1), +g.P.y.toFixed(1), +g.P.z.toFixed(1)]; }, [x, z, tx, tz]);
  const fire = async (secs = 1.1) => { await ev(() => { __game.MAG.cd = 0; __game.ATK.hold = true; }); await T(Math.round(secs * 120)); await ev(() => { __game.ATK.hold = false; }); await T(90); };
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a && a.kind === 'chest') __game.interact(); return a ? a.kind : null; }); await T(30); await skip(); return a; };
  const piece = (id) => ev((id) => __game.saved.pieces.includes(id), id);

  /* 1 · SASI-HABIA: ikusi → ezin ireki → sorginkeria arrunta ez → SUA bai */
  await tpFace(-62, -69, -62, -76);
  await T(30);
  ok(await flag('m-sasia'), 'sasi-habia ikusita (egunkarian)');
  await tpFace(-62, -72.9, -62, -76);
  ok((await ev(() => { const a = __game.actionHere(); return a ? a.kind : null; })) !== 'chest', 'sasien barruko kutxa: ezin da ireki');
  await fire();
  ok(!(await cleared('s-sasia')), 'INDARRA (surik gabe): sasiak ez dira erretzen');
  await ev(() => __game.saved.items.push('sugarra'));
  await fire();
  ok(await cleared('s-sasia'), 'SUGAR-IZPIA: sasiak erre dira');
  await tpFace(-62, -74, -62, -76);
  ok((await open()) === 'chest' && (await piece('sasia')), 'sasi-habiako kutxa: ARNASA-ZATIA');

  /* 2 · HARRI-ZUTABEA: ertzetik KATEA eraztunera → gailurrean kutxa */
  const bank = await ev(() => {
    const g = __game;
    for (let r = 4; r < 12; r += 0.5)
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2, x = 75 + Math.cos(a) * r, z = -24 + Math.sin(a) * r;
        if (g.riverW(x, z) > 1.2 && g.walkSD(x, z) > 1.5) return [x, z];
      }
    return null;
  });
  ok(!!bank, 'ibai-ertza aurkitu da zutabearen ondoan', S(bank));
  await tpFace(bank[0], bank[1], 75, -23.5);
  await T(30);
  ok(await flag('m-zutabea'), 'harri-zutabea ikusita');
  await ev(() => __game.chainFire());
  await T(240);
  const top = await ev(() => ({ y: +__game.P.y.toFixed(2), d: +Math.hypot(__game.P.x - 75, __game.P.z + 24).toFixed(2) }));
  ok(top.y > 6.8 && top.d < 1.5, 'KATEA: zutabearen gailurrean', S(top));
  ok((await open()) === 'chest' && (await piece('zutabea')), 'zutabeko kutxa: ARNASA-ZATIA');

  /* 3 · ERROTA ZAHARRA: HAIZE-ADARRA → ate-tranpa → kutxa */
  await tpFace(62, 21, 62, 12);
  await T(30);
  ok(await flag('m-errota'), 'errota zaharra ikusita');
  ok((await ev(() => { const a = __game.actionHere(); return a ? a.kind : null; })) !== 'chest', 'ate-tranpa itxita (kutxarik ez)');
  await ev(() => { __game.WIND.cd = 0; __game.hornBlow(); });
  await T(120);
  ok(await cleared('s-errota'), 'errota biraka: ate-tranpa irekita');
  await tpFace(62, 17.4, 62, 15.4);
  ok((await open()) === 'chest' && (await piece('errota')), 'ate-tranpako kutxa: ARNASA-ZATIA');

  /* 4 · DORRE ZAHARRA: orainean heura izoztuta; iraganean igo → gailurrean kutxa */
  const era = (want) => ev((want) => { const g = __game; for (let k = 0; k < 3 && g.phase() !== want; k++) { for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); } return g.phase(); }, want);
  const climbN = () => ev(() => {
    const g = __game;
    g.input.x = 0.557; g.input.z = -0.83;
    let i = 0;
    for (; i < 60 && !g.P.climb; i++) g.tick(1 / 120);
    const grabbed = !!g.P.climb;
    g.input.x = 0; g.input.z = -1;
    for (; i < 1200 && g.P.climb; i++) g.tick(1 / 120);
    g.input.z = 0;
    for (let k = 0; k < 60; k++) g.tick(1 / 120);
    return { grabbed, y: +g.P.y.toFixed(2), gr: g.P.grounded };
  });
  await tpFace(80, -68.2, 80, -72);
  await T(30);
  ok(await flag('m-dorrea'), 'dorre zaharra ikusita');
  ok((await era(1)) === 1, 'ORAINA');
  await tpFace(80, -68.2, 80, -72);
  let c = await climbN();
  ok(!c.grabbed, 'orainean heura izoztuta: ezin igo', S(c));
  ok((await era(0)) === 0, 'IRAGANA');
  await tpFace(80, -68.2, 80, -72);
  c = await climbN();
  const topY = await ev(() => __game.CHESTS.find((C) => C.id === 'h-dorrea').y);
  ok(c.grabbed && Math.abs(c.y - topY) < 0.15, 'dorrearen gailurrera igo (heura)', S({ c, topY }));
  await ev(([y]) => { const g = __game; g.teleport(80, -70.6, y); g.P.angle = Math.PI; for (let i = 0; i < 6; i++) g.tick(1 / 120); }, [topY]);
  ok((await open()) === 'chest' && (await piece('dorrea')), 'dorrearen gailurreko kutxa: ARNASA-ZATIA');

  /* 5 · JENTIL-HARRIA: sorginkeriak ez, TXIMISTARRIAk bai → azpian kutxa */
  await tpFace(-50, 1.5, -50, -6);
  await T(30);
  ok(await flag('m-harkaitza'), 'jentil-harria ikusita');
  await fire();
  ok(!(await cleared('s-harkaitza')), 'INDARRAk ez du apurtzen');
  await ev(() => { __game.TXB.n = 3; __game.bombThrow(); });
  await T(240);
  ok(await cleared('s-harkaitza'), 'TXIMISTARRIA: jentil-harria apurtuta');
  await tpFace(-50, -4.1, -50, -6);
  ok((await open()) === 'chest' && (await piece('harkaitza')), 'harriaren azpiko kutxa: ARNASA-ZATIA');

  /* 6 · egunkaria */
  const log = await ev(() => __game.SECRETS.filter((s) => s.done()).length);
  ok(log === 5, 'bost misterioak eginda', log);

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
