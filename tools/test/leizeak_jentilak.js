// LEIZEEN DEIA: JENTILBARATZA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_jentilak.js http://127.0.0.1:8091/games/leizeak.html
// Trikuharria (ESNATU) → ataria: SUTONDOA, lasterbidea itxita, HEURA (iraganean) → kanpaiak (bat orainean)
// → harresia (borroka, giltza) → harri-zaina (TXIMISTARRIA) → arrakalak (jauzia atalasera, dorrea) →
// dorrea: heura, harri arrakalatua eta lau kanpaia (giltza nagusia) → biltegia (sutondoa, lasterbidea)
// → ate handia → ERROLAN (tximistarria, aldaratu, harkaitza itzuli) → irteera → Irati: laugarren argia.
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
  /* gordetako partida: hiru leize amaituta, Iratiren amaiera ikusita */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('giroa', 'intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia', 'adarra', 'orrazia', 'giltzanagusia-lamia', 'sugarra', 'giltzanagusia-tartalo');
    s.hearts = 3;
    s.tod = 0.4;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  /* laguntzaileak */
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 12 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const tp = (x, y, z) => ev(([x, y, z]) => { const g = __game; g.teleport(x, z, y); for (let i = 0; i < 6; i++) g.tick(1 / 120); }, [x, y, z]);
  const walk = (dx, dz, secs, run = false) => ev(([dx, dz, secs, run]) => {
    const g = __game, n = Math.hypot(dx, dz) || 1;
    dx /= n; dz /= n;
    g.input.x = 0.83 * dx - 0.557 * dz;
    g.input.z = 0.557 * dx + 0.83 * dz;
    g.input.keys.ShiftLeft = run;
    for (let i = 0; i < Math.round(secs * 120); i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    g.input.x = g.input.z = 0;
    g.input.keys.ShiftLeft = false;
    for (let i = 0; i < 12; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, climb: !!g.P.climb };
  }, [dx, dz, secs, run]);
  const goTo = async (x, z, run = false) => { const c = await ev(() => [__game.P.x, __game.P.z]); const d = Math.hypot(x - c[0], z - c[1]); return walk(x - c[0], z - c[1], d / (run ? 12.8 : 7.7), run); };
  const route = async (pts) => { let p; for (const [x, z] of pts) p = await goTo(x, z); return p; };
  const faceTo = (x, z) => ev(([x, z]) => { const g = __game, a = Math.atan2(x - g.P.x, z - g.P.z); g.P.angle = a; g.hero.rotation.y = a; }, [x, z]);
  const until = async (f, maxTicks = 3000, a) => { for (let i = 0; i < maxTicks; i += 20) { if (await ev(f, a)) return true; await T(20); } return !!(await ev(f, a)); };
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const E = (x) => 1500 + x;
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a ? a.kind : null; }); await T(30); await skip(); await T(10); return a; };
  const act = () => ev(() => { const a = __game.actionHere(); return a ? a.kind + ':' + a.label : null; });
  const era = (want) => ev((want) => { const g = __game; for (let k = 0; k < 3 && g.phase() !== want; k++) { for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); } return g.phase(); }, want);
  const play = async (seq) => { await ev(() => __game.txalaOpen()); for (const s of seq) { await ev((s) => __game.txalaHit(s), s); await T(24); } await T(120); await skip(); };
  /* iparrera bultzatu (heura): kameraren angelua kontuan */
  const climbUp = (maxTicks = 900) => ev((maxTicks) => {
    const g = __game;
    g.input.x = 0.557; g.input.z = -0.83;
    let i = 0;
    for (; i < 60 && !g.P.climb; i++) g.tick(1 / 120);
    const grabbed = !!g.P.climb;
    g.input.x = 0; g.input.z = -1;
    for (; i < maxTicks && g.P.climb; i++) g.tick(1 / 120);
    g.input.z = 0;
    for (let k = 0; k < 60; k++) g.tick(1 / 120);
    return { grabbed, y: +g.P.y.toFixed(2), gr: g.P.grounded, climb: !!g.P.climb, x: +g.P.x.toFixed(2), z: +g.P.z.toFixed(2) };
  }, maxTicks);
  const killAll = () => ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });

  /* 0 · haranean: trikuharria ESNATU erritmoarekin */
  const obj0 = await ev(() => __game.objective());
  ok(/trikuharria/.test(obj0[0]), 'haraneko helburua: harrespilako trikuharria', obj0[0]);
  await tp(45, 9, -63.2);
  await play(['L', 'L', 'R']);
  ok(await flag('jentilatea'), 'ESNATU: trikuharria ireki da');
  await T(320);
  ok(await ev(() => __game.DOL.t >= 1), 'harria mugituta (eskailerak agerian)');
  let p = await route([[45, -66], [45, -69.6]]);
  await T(120);
  p = await ev(() => ({ zone: __game.ZONE.cur, x: +__game.P.x.toFixed(1), z: +__game.P.z.toFixed(1) }));
  ok(p.zone === 'jentil', 'trikuharriaren azpira → JENTILBARATZA', S(p));
  await skip();

  /* 1 · ataria: sutondoa, lasterbidea (alde honetatik itxita), heura */
  await tp(E(-7.2), 0, 7.0);
  await faceTo(E(-9), 8.5);
  ok((await act()) === 'hearth:ATSEDEN', 'sutondoa: ATSEDEN');
  await ev(() => { __game.P.hp = 2; });
  await open();
  p = await ev(() => ({ hp: __game.P.hp, max: __game.P.maxHp, cp: __game.saved.cp }));
  ok(p.hp === p.max && p.cp && p.cp.zone === 'jentil' && Math.abs(p.cp.x - E(-7.1)) < 0.5, 'atsedena: arnasa beteta, kontrol-puntua sutondoan', S(p));
  await tp(E(-12.5), 0, 0);
  ok((await act()) === 'locked:ITXITA', 'mendebaldeko barrak: alde honetatik ezin dira ireki');
  ok((await era(1)) === 1, 'ORAINA');
  await tp(E(10), 0, 5.2);
  p = await climbUp(200);
  ok(!p.grabbed && p.y < 0.5, 'orainean heura izoztuta: ezin igo', S(p));
  ok((await era(0)) === 0, 'IRAGANA');
  await tp(E(10), 0, 5.2);
  p = await climbUp();
  ok(p.grabbed && Math.abs(p.y - 6) < 0.1 && p.gr, 'HEURA: ertzera igo (6 m)', S(p));
  p = await route([[E(11), -2], [E(11), -6], [E(17), -6], [E(24), -6]]);
  ok(p.room === 'J2' && Math.abs(p.y - 6) < 0.2, 'ertzetik ekialdera → KANPAIEN ARETOA', S(p));

  /* 2 · kanpaiak: bi urre (iraganean) eta urdina (orainean), elkarren segidan */
  p = await goTo(E(37), 0);
  await faceTo(E(46), 0);
  await ev(() => { const g = __game; for (let k = 0; k < 2; k++) { g.MAG.cd = 0; g.attack(); for (let i = 0; i < 75; i++) g.tick(1 / 120); } });
  const lit2 = await ev(() => __game.RUNES.filter((r) => r.set && r.set.D.id === 'jB-bells' && r.lit).length);
  ok(lit2 === 2, 'bi kanpaia jota (iraganean)', lit2);
  await ev(() => { const g = __game; for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 20; i++) g.tick(1 / 120); g.MAG.cd = 0; g.attack(); for (let i = 0; i < 60; i++) g.tick(1 / 120); });
  ok(await cleared('jB-bells'), 'hirugarrena (orainean): kanpaiak batera → sarea zabaldu');
  await T(150);
  p = await route([[E(39), 0], [E(44), 0], [E(48), -6], [E(48), -14], [E(48), -20], [E(48), -26]]);
  await T(160);
  ok((await ev(() => __game.state().fight)) === 'J3', 'harresia: borroka hasi', S(p));

  /* 3 · harresia: borroka → giltza → ekialdeko atea */
  for (let w = 0; w < 6 && (await ev(() => !!__game.state().fight)); w++) {
    await killAll();
    await T(400);
  }
  ok(await cleared('J3'), 'harresia garbituta');
  await T(100);
  await tp(E(36), 6, -34.3);
  await faceTo(E(36), -36);
  await open();
  ok((await ev(() => __game.keysHere())) === 1, 'GILTZA TXIKIA (harresia)');
  p = await route([[E(44), -36], [E(48.6), -36]]);
  await faceTo(E(51), -36);
  await open();
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('jC-e')), 'ekialdeko atea irekita (giltza)');

  /* 4 · harri-zaina → TXIMISTARRIA */
  p = await route([[E(54), -36], [E(60), -36], [E(66), -36]]);
  await T(60);
  ok(await ev(() => !!__game.MINI.e), 'HARRI-ZAINA esnatu', S(p));
  await killAll();
  await T(30);
  await page.waitForTimeout(1300);
  await T(60);
  ok(await cleared('jD-mini'), 'harri-zaina garaituta');
  await tp(E(72), 6, -31.7);
  await faceTo(E(72), -30);
  await open();
  ok(await ev(() => __game.saved.items.includes('tximistarria') && __game.TXB.n === 3), 'TXIMISTARRIA eskuratuta (3 harri)');

  /* 5 · harresiko arrakala → jauzia atalasera (lasterbidea) */
  p = await route([[E(60), -36], [E(52), -36], [E(44), -36], [E(40), -32.5], [E(31), -32.5], [E(27), -36]]);
  await faceTo(E(20), -36);
  const thr = await ev(() => { const g = __game, n0 = g.TXB.n; g.bombThrow(); return { n0, n1: g.TXB.n, live: g.TXB.list.length, st: g.state(), cin: !!g.cinematicState(), get: g.GET.on, chain: g.CHAIN.state, climb: !!g.P.climb, P: [+g.P.x.toFixed(2), +g.P.y.toFixed(2), +g.P.z.toFixed(2)] }; });
  await T(240);
  ok(await cleared('jC-crack'), 'harresiko harri arrakalatua apurtuta (TXIMISTARRIA)', S(thr));
  p = await route([[E(19), -36], [E(14), -36], [E(9), -36]]);
  await T(60);
  p = await ev(() => ({ room: __game.state().room, y: +__game.P.y.toFixed(2) }));
  ok(p.room === 'J0' && p.y < 0.2, 'jauzia: atalasera (bide laburra)', S(p));

  /* 6 · atalaseko arrakala → dorrea */
  await goTo(E(-8), -36);
  await faceTo(E(-15), -36);
  await ev(() => { __game.TXB.n = 3; __game.bombThrow(); });
  await T(240);
  ok(await cleared('jE-crack'), 'atalaseko harri arrakalatua apurtuta');
  p = await route([[E(-14), -36], [E(-20), -36], [E(-26), -36], [E(-36), -27.5]]);
  ok(p.room === 'J6', 'dorrean', S(p));

  /* 7 · dorrea: heura (iraganean) → gailurra → harri arrakalatua → lau kanpaia → giltza nagusia */
  ok((await era(0)) === 0, 'IRAGANA (dorrea)');
  await tp(E(-36), 0, -30.6);
  p = await climbUp(1200);
  ok(p.grabbed && Math.abs(p.y - 12) < 0.15, 'zutabearen gailurrean (12 m)', S(p));
  await tp(E(-33.5), 12, -33.5);
  await faceTo(E(-27.5), -27.5);
  await ev(() => { __game.TXB.n = 3; __game.bombThrow(); });
  await T(240);
  ok(await cleared('jF-crack'), 'goitik: harri arrakalatua apurtuta → laugarren kanpaia');
  await T(1300);
  await tp(E(-36), 12, -36);
  const bells = await ev(() => {
    const g = __game;
    const hits = [];
    for (let k = 0; k < 3; k++) { g.MAG.cd = 0; g.attack(); for (let i = 0; i < 75; i++) g.tick(1 / 120); hits.push(g.RUNES.filter((r) => r.set && r.set.D.id === 'jF-bells' && r.lit).length); }
    for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120);
    g.switchPhase();
    for (let i = 0; i < 20; i++) g.tick(1 / 120);
    g.MAG.cd = 0;
    g.attack();
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    return hits;
  });
  ok(await cleared('jF-bells'), 'lau kanpaiak batera (hiru iraganean, bat orainean)', S(bells));
  await T(120);
  await tp(E(-36), 12, -35.6);
  await faceTo(E(-36), -37.5);
  await open();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia-jentil')), 'GILTZA NAGUSIA (dorrearen gailurrean)');

  /* 8 · biltegia: sutondoa eta lasterbidea atarira */
  await tp(E(-36), 0, -23);
  p = await route([[E(-36), -15], [E(-36), -8], [E(-36), 0]]);
  ok(p.room === 'J5', 'biltegian', S(p));
  p = await route([[E(-26), 0], [E(-18), 0]]);
  await faceTo(E(-15), 0);
  ok((await act()) === 'door:LASTERBIDEA', 'barrak: alde honetatik LASTERBIDEA');
  await open();
  await T(150);
  p = await route([[E(-10), 0], [E(-4), 0]]);
  ok(p.room === 'J1', 'lasterbidea: biltegitik atarira', S(p));

  /* 9 · ate handia → ERROLAN */
  p = await route([[E(0), -10], [E(0), -18], [E(0), -28], [E(0), -48.4]]);
  await faceTo(E(0), -51);
  await open();
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('jD-n')), 'ate handia irekita (giltza nagusia)');
  p = await route([[E(0), -54], [E(0), -60], [E(0), -64]]);
  await T(80);
  ok(await ev(() => __game.BOSS.on && __game.BOSS.kind === 'errolan'), 'ERROLAN: borroka hasi', S(p));
  await skip();
  await T(60);
  /* borroka: harkaitza altxatzean tximistarria; eskukadan aldaratu; jaurtiketan ezkutua */
  const fight = await ev(() => {
    const g = __game, ER = g.ERR, log = [];
    let ticks = 0, lastBomb = -9, parryArmed = false, shield = false;
    const tk = (n = 1) => { for (let i = 0; i < n; i++) { g.tick(1 / 120); ticks++; } };
    while (ticks < 120 * 240 && !g.saved.flags.includes('errolan') && ER.state !== 'freed') {
      g.P.hp = g.P.maxHp;
      if (g.cinematicState()) { g.endScene(); tk(); continue; }
      /* laguntzaileak (itzalak): bot-ak ez ditu kontuan hartzen */
      for (const e of g.ENEMIES) if (e.state !== 'dead' && e.state !== 'spawn') g.killEnemy(e);
      const st = ER.state, dx = g.P.x - ER.x, dz = g.P.z - ER.z, d = Math.hypot(dx, dz) || 1;
      /* lekua: aurrean, 6.5 m (eskukadarako) edo 10 m (harkaitzetarako) */
      const want = ER.stats.parry === 0 ? 6.2 : 10;
      if (st === 'idle' || st === 'lift' || st === 'roar' || st === 'rise') {
        const a = ER.a;
        const tx = ER.x + Math.sin(a) * want, tz = ER.z + Math.cos(a) * want;
        if (Math.hypot(g.P.x - tx, g.P.z - tz) > 1.5) g.teleport(tx, tz, 0);
      }
      const fa = Math.atan2(ER.x - g.P.x, ER.z - g.P.z);
      g.P.angle = fa;
      if (st === 'lift' && ER.t < 1.3 && ticks - lastBomb > 300 && g.TXB.n > 0 && ER.stats.parry > 0 && ER.stats.reflect > 0) {
        g.bombThrow();
        lastBomb = ticks;
        log.push('bomb@' + ER.t.toFixed(2));
      }
      if (st === 'sweep') {
        if (!parryArmed && ER.t > 0.8 && ER.t < 0.9) { g.attack(); parryArmed = true; log.push('parry@' + ER.t.toFixed(2)); }
      } else parryArmed = false;
      if (st === 'throw' && ER.stats.reflect === 0) { if (!shield) { g.ATK.hold = true; shield = true; } }
      else if (shield && st !== 'throw' && !g.SHOTS.some((s) => s.rock && !s.back)) { g.ATK.hold = false; shield = false; }
      if (g.BOSS.vulnerable()) {
        if (shield) { g.ATK.hold = false; shield = false; }
        if (!g.LOCK.target) g.lockToggle();
        g.MAG.cd = 0;
        g.attack();
        tk(25);
        continue;
      }
      tk(2);
    }
    g.ATK.hold = false;
    return { ticks, rounds: ER.rounds, state: ER.state, stats: ER.stats, log: log.slice(-12), flag: g.saved.flags.includes('errolan') };
  });
  ok(fight.stats.parry > 0, 'ERROLAN: eskukada aldaratuta → belauniko', S(fight.stats));
  ok(fight.stats.reflect > 0, 'ERROLAN: harkaitza itzulita (EZKUTUA) → belauniko', S(fight.stats));
  ok(fight.stats.bomb > 0, 'ERROLAN: tximistarria harkaitza altxatuta zuela → belauniko', S(fight.stats));
  await skip();
  await T(60);
  await skip();
  ok(await flag('errolan'), 'ERROLAN ASKE (hiru txanda)', S({ ticks: fight.ticks, state: fight.state, log: fight.log }));
  ok(await ev(() => __game.saved.hearts >= 4), 'ERROLANEN BIHOTZA: arnasa bat gehiago');

  /* 10 · irteera → harana → Irati: laugarren argia berde */
  await tp(E(0), 0, 10);
  p = await route([[E(0), 15.5], [E(0), 18.8]]);
  await T(140);
  ok((await ev(() => __game.ZONE.cur)) === 'ibarra', 'irteera: trikuharrira', S(p));
  const obj1 = await ev(() => __game.objective());
  ok(/Errolan/.test(obj1[0]), 'helburua: Iratiri Errolanen berri eman', obj1[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.2, N.z, N.y || 0); for (let i = 0; i < 4; i++) g.tick(1 / 120); g.talkTo(N); });
  const green = await ev(() => {
    const g = __game;
    for (let k = 0; k < 20 && g.cinematicState() && g.cinematicState().n < 2; k++) { g.nextShot(); g.step(1 / 30, false); }
    for (let k = 0; k < 150 && g.cinematicState() && g.ZAZPI.green < 4; k++) g.step(1 / 30, false);
    return g.ZAZPI.green;
  });
  ok(green === 4, 'zazpi argiak: laugarrena berde (Errolan aske)', green);
  await skip();
  ok(await flag('irati-errolan'), 'Irati: Errolanen berria (amaiera)');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
