// LEIZEEN DEIA: HERRIA (etxe-izenak, ATEA JO, Amaiurren etxea), KOLPEAK (kolpe sendoak) eta ESTALPEAK.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_herria.js http://127.0.0.1:8091/games/leizeak.html
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
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'lamia', 'tartalo', 'mikel-ok', 'andere', 'ardiak');
    s.rhythms.push('esnatu', 'entzun');
    s.tod = 0.4;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 12 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const S = (p) => JSON.stringify(p);
  const atDoor = (id) => ev((id) => { const g = __game, H = g.HOUSE.list.find((h) => h.id === id); g.teleport(H.x, H.z, H.y); for (let i = 0; i < 6; i++) g.tick(1 / 120); const a = g.actionHere(); return a ? a.label : null; }, id);
  /* knock: ekintza, erantzunaren zain (0.52 s), eszena */
  const knock = async (id) => {
    const lab = await atDoor(id);
    await ev(() => __game.interact());
    await page.waitForTimeout(650);
    const r = await ev(() => { const c = __game.cinematicState(); return { cine: !!c, who: c ? document.getElementById('cineWho').textContent : null, note: document.getElementById('subtitle').textContent }; });
    await skip();
    await T(10);
    return { lab, ...r };
  };

  /* 1 · etxeak: izenak eta ateak */
  const houses = await ev(() => __game.HOUSE.list.map((h) => h.id));
  ok(houses.length === 11, 'hamaika etxe izenarekin', S(houses));
  ok((await atDoor('okinenea')) === 'ATEA JO · OKINENEA', 'atearen aurrean: ATEA JO · OKINENEA');
  /* 2 · egunez: Okinenea → ogi beroa (arnasa) */
  await ev(() => { __game.P.hp = 2; });
  let r = await knock('okinenea');
  const hp = await ev(() => [__game.P.hp, __game.P.maxHp]);
  ok(r.cine && r.who === 'MAITEREN SENARRA' && hp[0] === hp[1], 'egunez Okinenea: ogi beroa → arnasa beteta (Maite plazan)', S({ r, hp }));
  /* egunez Pello eta Peio plazan: inor ez */
  r = await knock('pellonea');
  ok(!r.cine && /plazan/.test(r.note), 'egunez Pellonea: inor ez (plazan daude)', S(r));
  /* 3 · Goikoetxea: amonaren sendabelar-botila, behin */
  const pot0 = await ev(() => __game.saved.potions || 0);
  r = await knock('goikoetxea');
  await skip();
  const pot1 = await ev(() => __game.saved.potions || 0);
  r = await knock('goikoetxea');
  const pot2 = await ev(() => __game.saved.potions || 0);
  ok(pot1 === pot0 + 1 && pot2 === pot1, 'Goikoetxea: sendabelar-botila behin bakarrik', S({ pot0, pot1, pot2 }));
  /* 4 · Mendieta: hiru zaindari askatuta → familia itzuli, 30 txanpon behin */
  const c0 = await ev(() => __game.saved.coins);
  r = await knock('mendieta');
  await skip();
  const c1 = await ev(() => __game.saved.coins);
  ok(r.cine && c1 === c0 + 30, 'Mendieta: familia itzuli da (+30 txanpon)', S({ r, c0, c1 }));
  /* 5 · gauez: bikiak etxean → Peioren txistea */
  /* gaua: erlojua ibiltzen (gaueko logikak clockRuns behar du) */
  await ev(() => { const g = __game; g.saved.tod = 0.88; g.DAY.freeze = false; for (let i = 0; i < 20; i++) g.tick(1 / 120); g.npcsNightStart(); for (let i = 0; i < 10; i++) g.tick(1 / 120); });
  r = await knock('pellonea');
  ok(r.cine && r.who === 'PEIO', 'gauez Pellonea: Peiok erantzun', S(r));
  r = await knock('belarrenea');
  ok(!r.cine && /elizan/.test(r.note), 'gauez Belarrenea: Kattalin elizan', S(r));

  await ev(() => { __game.DAY.freeze = true; __game.resume(); });
  /* 6 · ITURRALDE: barrura sartu */
  ok((await atDoor('iturralde')) === 'SARTU · ITURRALDE', 'Amaiurren etxea: SARTU');
  await ev(() => __game.interact());
  await T(120);
  let st = await ev(() => ({ zone: __game.ZONE.cur, chapter: document.getElementById('chapter').textContent, keys: document.getElementById('keyBox').hidden }));
  ok(st.zone === 'etxea' && st.chapter === 'ETXEA' && st.keys, 'barruan: ITURRALDE (HUD: ETXEA, giltzarik ez)', S(st));
  await skip();
  /* sutondoa: atseden eta kontrol-puntua */
  await ev(() => { const g = __game; g.P.hp = 1; g.teleport(2100 - 3.2, -2.0, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const hearth = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  st = await ev(() => ({ hp: __game.P.hp, max: __game.P.maxHp, cp: __game.saved.cp && __game.saved.cp.zone }));
  ok(hearth === 'ATSEDEN' && st.hp === st.max && st.cp === 'etxea', 'etxeko sutondoa: atseden, kontrol-puntua etxean', S({ hearth, st }));
  /* ohea: egunsentira arte */
  await ev(() => { const g = __game; g.teleport(2100 - 4.0, 2.0, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const bed = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  await page.click('#choices button:first-child');
  st = await ev(() => ({ tod: +__game.saved.tod.toFixed(2), night: __game.DAY.k > 0.5 }));
  ok(/OHEA/.test(bed || '') && st.tod === 0.28 && !st.night, 'ohea: lo egin egunsentira arte', S({ bed, st }));
  /* oroitzapenak: hiru zaindari (basajaun, lamia, tartalo) */
  await ev(() => { const g = __game; g.teleport(2100 + 3.4, -3.2, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const mem = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  st = await ev(() => ({ title: document.getElementById('title').textContent, vis: __game.DGE.mementos.filter((m) => m.g.visible && m.kind !== '?').length }));
  await page.click('#choices button:first-child');
  ok(mem === 'OROITZAPENAK' && /3 \/ 7/.test(st.title) && st.vis === 3, 'oroitzapenen apala: 3 / 7 (hiru oroigarri ikusgai)', S({ mem, st }));
  /* Iratiren txokoa */
  await ev(() => { const g = __game; g.teleport(2100 + 4.0, -0.6, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const ir = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  const irc = await ev(() => !!__game.cinematicState());
  await skip();
  ok(ir === 'IRATIREN TXOKOA' && irc, 'Iratiren txokoa (oroitzapena)', S({ ir, irc }));
  /* irteera: atetik kanpora → haranera, etxearen aurrean */
  await ev(() => { const g = __game; g.teleport(2100, 4.0, 0); g.input.x = 0.83 * 0 - 0.557 * 1; g.input.z = 0.557 * 0 + 0.83 * 1; for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } g.input.x = g.input.z = 0; for (let i = 0; i < 90; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  st = await ev(() => { const g = __game, H = g.HOUSE.home; return { zone: g.ZONE.cur, d: +Math.hypot(g.P.x - H.x, g.P.z - H.z).toFixed(2) }; });
  ok(st.zone === 'ibarra' && st.d < 3, 'irteera: etxearen atearen aurrean', S(st));

  /* 7 · KOLPEAK: distira, zapalketa, bultzada; puxika bezala lehertu */
  await ev(() => { const g = __game; g.saved.cleared.push('D'); g.enterZone('leizea', { x: 600, y: 0, z: -74, a: Math.PI }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  const hit = await ev(() => {
    const g = __game;
    g.teleport(600, -74, 0);
    const e = g.spawnEnemy('grunt', -1, 600, -78, 0);
    for (let i = 0; i < 200; i++) g.tick(1 / 120);
    e.hp = e.max = 6;
    e.vx = e.vz = 0;
    g.hitEnemy(e, 1, 0, -1);
    const a = { flash: +e.flash.toFixed(2), punch: +e.punch.toFixed(2), vz: +e.vz.toFixed(2), hp: e.hp };
    g.tick(1 / 120);
    a.scaleY = +e.g.scale.y.toFixed(3);
    a.gS = e.gS;
    for (let i = 0; i < 40; i++) g.tick(1 / 120);
    a.after = +e.g.scale.y.toFixed(3);
    e.hp = 1;
    g.hitEnemy(e, 2, 0, -1);
    a.dead = e.state;
    a.pop = +e.pop.toFixed(2);
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    a.popScale = +(e.g.scale.x / e.gS).toFixed(3);
    for (let i = 0; i < 12; i++) g.tick(1 / 120);
    a.popDone = e.pop <= 0;
    return a;
  });
  ok(hit.flash > 0 && hit.punch > 0 && hit.vz < -1 && hit.hp === 5, 'kolpea: distira, zapalketa eta atzera bultzada', S(hit));
  ok(hit.scaleY < hit.gS && Math.abs(hit.after - hit.gS) < 1e-3, 'zapalketa: zapaldu eta itzuli', S(hit));
  ok(hit.dead === 'dead' && hit.pop > 0 && hit.popScale > 1.05 && hit.popDone, 'heriotza: puztu eta lehertu (puxika)', S(hit));

  /* 8 · ESTALPEAK: kutxek proiektilak geldiarazi; ezkutuko zorroa */
  const cover = await ev(() => {
    const g = __game;
    for (const e of g.ENEMIES) g.killEnemy(e);
    for (let i = 0; i < 300; i++) g.tick(1 / 120);
    /* Amaiur kutxen atzean (iparrean), itzal-begia hegoan: proiektila kutxaren kontra */
    g.teleport(609.5, -90.6, 0);
    const e = g.spawnEnemy('eye', -1, 609.5, -82, 0);
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    e.state = 'hover';
    const hp0 = g.P.hp;
    let shot = 0, max = 0;
    for (let i = 0; i < 120 * 6; i++) { g.P.hp = Math.max(g.P.hp, hp0); g.tick(1 / 120); max = Math.max(max, g.SHOTS.length); }
    const hits = hp0 - g.P.hp;
    return { hits, max, coins: g.saved.coins, got: g.POUCHES.find((p) => p.id === 'dD-zorroa').got };
  });
  ok(cover.max > 0 && cover.hits === 0, 'estalpea: kutxek itzalaren proiektilak geldiarazi', S(cover));
  ok(cover.got, 'kutxen atzean: ezkutuko zorroa (txanponak)', S(cover));

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
