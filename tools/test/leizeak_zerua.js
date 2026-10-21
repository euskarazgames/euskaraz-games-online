// LEIZEEN DEIA: JENTILEN ZERUA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_zerua.js http://127.0.0.1:8091/games/leizeak.html
// Jentil zaharra (ORTZI) → harrespila: ortzadarra → zerua (sutondoa) → hodei-zubiak (garaia airean) →
// lainoa (HAIZE-ADARRA, arnasa-zatia) → zeruko plaza (borroka, giltza) → haize-errota (igogailua, atea) →
// hodei-zaina (ENARA) → haize-zutabea (planeatu) → dorrea (kanpaiak, heura, giltza nagusia) → habia →
// ekaitz-hesia (ate handia) → ODEI (kanpaiak, planeatu bihotzera, adarra) → ortzadarra → Irati: bosgarren argia.
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
  /* gordetako partida: lau leize amaituta, Iratiren laugarren eszena ikusita */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo', 'jentil', 'jentilatea', 'errolan', 'irati-errolan');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia', 'adarra', 'orrazia', 'giltzanagusia-lamia', 'sugarra', 'giltzanagusia-tartalo', 'tximistarria', 'giltzanagusia-jentil');
    s.hearts = 4;
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
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, area: g.AREA.cur };
  }, [dx, dz, secs, run]);
  const goTo = async (x, z, run = false) => { const c = await ev(() => [__game.P.x, __game.P.z]); const d = Math.hypot(x - c[0], z - c[1]); return walk(x - c[0], z - c[1], d / (run ? 12.8 : 7.7), run); };
  const route = async (pts) => { let p; for (const [x, z] of pts) p = await goTo(x, z); return p; };
  const faceTo = (x, z) => ev(([x, z]) => { const g = __game, a = Math.atan2(x - g.P.x, z - g.P.z); g.P.angle = a; g.hero.rotation.y = a; }, [x, z]);
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const E = (x) => 1800 + x;
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a ? a.kind : null; }); await T(30); await skip(); await T(10); return a; };
  const act = () => ev(() => { const a = __game.actionHere(); return a ? a.kind + ':' + a.label : null; });
  const era = (want) => ev((want) => { const g = __game; for (let k = 0; k < 3 && g.phase() !== want; k++) { for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); } return g.phase(); }, want);
  const play = async (seq) => { await ev(() => __game.txalaOpen()); for (const s of seq) { await ev((s) => __game.txalaHit(s), s); await T(24); } await T(120); await skip(); };
  const killAll = () => ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
  const climbUp = (maxTicks = 1200) => ev((maxTicks) => {
    const g = __game;
    g.input.x = 0.557; g.input.z = -0.83;
    let i = 0;
    for (; i < 60 && !g.P.climb; i++) g.tick(1 / 120);
    const grabbed = !!g.P.climb;
    g.input.x = 0; g.input.z = -1;
    for (; i < maxTicks && g.P.climb; i++) g.tick(1 / 120);
    g.input.z = 0;
    for (let k = 0; k < 60; k++) g.tick(1 / 120);
    return { grabbed, y: +g.P.y.toFixed(2), gr: g.P.grounded, x: +g.P.x.toFixed(2), z: +g.P.z.toFixed(2) };
  }, maxTicks);
  /* planeatu: jauzi bikoitza eta eutsi; plan: [[dx, dz, ticks, stopY, stopGround, {xGte, xLte, zGte, zLte, drop}], ...] */
  const glide = (plan) => ev((plan) => {
    const g = __game, inp = (dx, dz) => { const n = Math.hypot(dx, dz); if (!n) { g.input.x = g.input.z = 0; return; } dx /= n; dz /= n; g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; };
    const log = { glided: false, maxY: g.P.y, lifted: false };
    g.setJumpHeld(true);
    inp(plan[0][0], plan[0][1]);
    g.jump();
    for (let i = 0; i < 26; i++) g.tick(1 / 120);
    g.jump();
    let t = 0;
    for (const [dx, dz, n, stopY, stopGround, o = {}] of plan) {
      inp(dx, dz);
      if (o.drop) g.setJumpHeld(false);
      for (let i = 0; i < n; i++) {
        if ((o.xGte !== undefined && g.P.x >= o.xGte) || (o.xLte !== undefined && g.P.x <= o.xLte) || (o.zGte !== undefined && g.P.z >= o.zGte) || (o.zLte !== undefined && g.P.z <= o.zLte)) break;
        g.tick(1 / 120);
        t++;
        if (g.P.glide) log.glided = true;
        if (g.GLIDE.lift > 0 && g.P.glide) log.lifted = true;
        log.maxY = Math.max(log.maxY, g.P.y);
        if (stopY !== undefined && stopY !== null && g.P.y >= stopY) break;
        if (stopGround && g.P.grounded && i > 30) break;
      }
    }
    g.setJumpHeld(false);
    inp(0, 0);
    for (let i = 0; i < 40; i++) g.tick(1 / 120);
    return { ...log, maxY: +log.maxY.toFixed(2), x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), gr: g.P.grounded, room: g.state().room, hp: g.P.hp, t };
  }, plan);

  /* 0 · haranean: jentil zaharrak ORTZI irakatsi */
  const obj0 = await ev(() => __game.objective());
  ok(/jentil zaharra/.test(obj0[0]), 'haraneko helburua: harrespilako jentil zaharra', obj0[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'jentil'); g.teleport(N.x + 1.6, N.z + 1.2, 9); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); });
  await ev(() => { const g = __game; for (let i = 0; i < 12 && g.cinematicState(); i++) g.endScene(); });
  /* deia: entzun eta errepikatu */
  const learned = await ev(() => {
    const g = __game;
    for (let i = 0; i < 1200 && !(g.TXALA.call && g.TXALA.call.phase === 'answer'); i++) g.tick(1 / 120);
    const seq = g.TXALA.call ? g.TXALA.call.seq.slice() : [];
    for (const s of seq) { g.txalaHit(s); for (let i = 0; i < 20; i++) g.tick(1 / 120); }
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    return seq.join('');
  });
  await skip();
  ok(await ev(() => __game.saved.rhythms.includes('ortzi')), 'ORTZI ikasita (jentil zaharra)', learned);
  /* harrespilaren erdian: ORTZI → ortzadarra */
  await tp(44.5, 9, -61.5);
  await play(['L', 'R', 'R', 'L', 'R']);
  ok(await flag('ortzadarra'), 'ORTZI: ortzadarra jaio da');
  await T(360);
  ok(await ev(() => __game.ORZ.t >= 1 && !__game.ORZ.p.off), 'ortzadarra osorik (oinez ibil daiteke)');
  /* ortzadarretik gora → zerua */
  await tp(46, 9, -73.6);
  let p = await ev(() => {
    const g = __game, A = g.ORZ.A, d = g.ORZ.dir;
    const wx = A.x + d.x * 21, wz = A.z + d.z * 21;
    const dx = wx - g.P.x, dz = wz - g.P.z, n = Math.hypot(dx, dz);
    g.input.x = 0.83 * (dx / n) - 0.557 * (dz / n);
    g.input.z = 0.557 * (dx / n) + 0.83 * (dz / n);
    let maxY = 0;
    for (let i = 0; i < 480 && g.ZONE.cur === 'ibarra'; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); maxY = Math.max(maxY, g.P.y); }
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 150; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    return { zone: g.ZONE.cur, maxY: +maxY.toFixed(2), x: +g.P.x.toFixed(1), y: +g.P.y.toFixed(1), z: +g.P.z.toFixed(1) };
  });
  ok(p.zone === 'zerua' && p.maxY > 14, 'ortzadarretik gora → JENTILEN ZERUA', S(p));
  await T(30);
  const cine = await ev(() => !!__game.cinematicState());
  await skip();
  ok(cine && (await flag('zerua')), 'iritsiera-eszena (hodeien gainean)');

  /* 1 · Z1: sutondoa */
  await tp(E(-4.2), 0, 3.6);
  await faceTo(E(-5.5), 2.5);
  ok((await act()) === 'hearth:ATSEDEN', 'Z1 sutondoa: ATSEDEN');
  await ev(() => { __game.P.hp = 2; });
  await open();
  p = await ev(() => ({ hp: __game.P.hp, max: __game.P.maxHp, cp: __game.saved.cp }));
  ok(p.hp === p.max && p.cp && p.cp.zone === 'zerua', 'atsedena: arnasa beteta, kontrol-puntua zeruan', S(p));

  /* 2 · hodei-zubiak: iraganeko hodeitik oraineko hodeira (garaia airean) */
  ok((await era(0)) === 0, 'IRAGANA');
  await tp(E(-1.5), 0, -24.8);
  p = await ev(() => ({ gr: __game.P.grounded, cloud: !!(__game.P.platform && __game.P.platform.cloud), y: __game.P.y }));
  ok(p.gr && p.cloud, 'iraganean: hodeia trinkoa (gainean zutik)', S(p));
  p = await ev(() => {
    const g = __game, ax = 1800 - 1.5, az = -24.8, bx = 1800 + 2.6, bz = -30.8;
    const dx = bx - ax, dz = bz - az, n = Math.hypot(dx, dz);
    g.teleport(ax + (dx / n) * 1.2, az + (dz / n) * 1.2, 0);
    g.input.x = 0.83 * (dx / n) - 0.557 * (dz / n);
    g.input.z = 0.557 * (dx / n) + 0.83 * (dz / n);
    g.jump();
    for (let i = 0; i < 24; i++) g.tick(1 / 120);
    for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120);
    g.switchPhase();
    let landed = null;
    for (let i = 0; i < 160; i++) { g.tick(1 / 120); if (g.P.grounded && g.P.platform) { landed = g.P.platform; break; } }
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 20; i++) g.tick(1 / 120);
    return { phase: g.phase(), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), on: landed ? landed.phase : null, cloud: !!(landed && landed.cloud) };
  });
  ok(p.phase === 1 && p.cloud && p.on === 1, 'jauzian garaia aldatu → oraineko ekaitz-hodeira', S(p));
  /* oraineko hodeitik iraganera jaitsiz gero: erori */
  ok((await era(0)) === 0, 'iraganera aldatu hodei-gris gainean');
  await T(80);
  p = await ev(() => ({ y: +__game.P.y.toFixed(2), gr: __game.P.grounded, rt: __game.state().respawnTimer }));
  ok(p.y < 0 || p.rt > 0 || !p.gr, 'oraineko hodeia iraganean ez dago: erori', S(p));
  await T(200);

  /* 3 · lainoa: HAIZE-ADARRA → hodei-harri ezkutuak → arnasa-zatia */
  await tp(E(1.4), 0.5, -43);
  await faceTo(E(13), -34.5);
  await ev(() => __game.hornBlow());
  await T(60);
  ok(await cleared('zB-laino'), 'lainoa uxatuta (HAIZE-ADARRA)');
  p = await ev(() => __game.platforms.filter((s) => s.cloud && s.reveal).map((s) => !s.off));
  ok(p.length === 2 && p.every(Boolean), 'bi hodei-harri agertu dira', S(p));
  await tp(E(19.5), 2.2, -36.6);
  await faceTo(E(19), -37.8);
  await open();
  ok(await ev(() => __game.saved.pieces.includes('zerua')), 'ARNASA-ZATIA (lainoaren atzean)');

  /* 4 · zeruko plaza: borroka → giltza */
  ok((await era(1)) === 1, 'ORAINA');
  await tp(E(0), 0, -52);
  p = await route([[E(0), -56], [E(0), -60]]);
  await T(120);
  ok((await ev(() => __game.state().fight)) === 'Z3', 'zeruko plaza: borroka hasi', S(p));
  for (let w = 0; w < 6 && (await ev(() => !!__game.state().fight)); w++) {
    await killAll();
    await T(400);
  }
  ok(await cleared('Z3'), 'plaza garbituta');
  await T(100);
  await tp(E(0), 0, -60.3);
  await faceTo(E(0), -62);
  await open();
  ok((await ev(() => __game.keysHere())) === 1, 'GILTZA TXIKIA (plaza)');
  /* sutondoa plazan */
  await tp(E(-7.0), 0, -54.6);
  await faceTo(E(-8.4), -53.2);
  ok((await act()) === 'hearth:ATSEDEN', 'plazako sutondoa: ATSEDEN');

  /* 5 · haize-errota → igogailua → giltza txikiko atea */
  p = await route([[E(10), -62], [E(18), -62], [E(26), -62], [E(31), -66]]);
  ok(p.room === 'Z4', 'haize-errotaren uhartean', S(p));
  await tp(E(34), 0, -73.2);
  p = await ev(() => ({ lift: !!(__game.P.platform && __game.P.platform.lift), y: __game.P.y }));
  ok(p.lift, 'igogailuaren gainean', S(p));
  await faceTo(E(39), -66.15);
  await ev(() => __game.hornBlow());
  p = await ev(() => { const g = __game; let maxY = 0; for (let i = 0; i < 700; i++) { g.tick(1 / 120); maxY = Math.max(maxY, g.P.y); if (g.P.y > 8.98) break; } return { y: +g.P.y.toFixed(2), maxY: +maxY.toFixed(2), spin: +g.ZR.mill.spin.toFixed(2), lift: +g.ZR.lift.y.toFixed(2) }; });
  ok(p.y > 8.9, 'errota biraka → igogailua gora (9 m)', S(p));
  p = await route([[E(34), -78], [E(34), -82.6]]);
  ok(Math.abs(p.y - 9) < 0.2, 'goiko ertzean', S(p));
  await faceTo(E(34), -84.3);
  await open();
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('zD-n')), 'giltza txikiko atea irekita');

  /* 6 · hodei-zaina → ENARAREN HEGOAK */
  p = await route([[E(34), -88], [E(34), -94], [E(34), -100]]);
  await T(80);
  ok(await ev(() => !!__game.MINI.e), 'HODEI-ZAINA esnatu', S(p));
  await killAll();
  await T(30);
  await page.waitForTimeout(1300);
  await T(60);
  ok(await cleared('zE-mini'), 'hodei-zaina garaituta');
  await tp(E(34), 9, -98.7);
  await faceTo(E(34), -97);
  await open();
  ok(await ev(() => __game.saved.items.includes('enara')), 'ENARAREN HEGOAK eskuratuta');
  /* planeatu: Z5-etik behera, plazara */
  await tp(E(30), 9, -93.5);
  await T(40);
  p = await glide([[-0.75, 0.66, 900, null, true]]);
  ok(p.glided && p.room === 'Z3' && p.y < 0.5 && p.gr, 'ENARA: planeatuz hodei-zainaren harritik plazara', S(p));

  /* 7 · haize-zutabea (ORAINEAN) → tximista-dorrea */
  ok((await era(1)) === 1, 'ORAINA (haize-zutabea bizirik)');
  await tp(E(-10.6), 0, -62);
  await T(40);
  p = await glide([[-1, 0, 130, null], [0, 0, 700, 18.6], [-1, 0.05, 700, null, true]]);
  ok(p.glided && p.lifted && p.maxY > 17, 'haize-zutabeak gora eraman (planeatzen)', S(p));
  ok(p.room === 'Z6' && Math.abs(p.y - 14) < 0.3 && p.gr, 'tximista-dorrearen uhartean (14 m)', S(p));

  /* 8 · hiru ekaitz-kanpaia (bat orainean) → dorrea (heura) → giltza nagusia */
  await tp(E(-46), 14, -58.5);
  const bells = await ev(() => {
    const g = __game, set = g.RUNE_PUZ.find((s) => s.D.id === 'zF-bells'), log = [];
    for (const R of set.list) {
      const a = Math.atan2(R.x - g.P.x, R.z - g.P.z);
      g.P.angle = a;
      g.MAG.cd = 0;
      g.attack();
      for (let i = 0; i < 70; i++) g.tick(1 / 120);
      log.push(set.list.filter((r) => r.lit).length);
    }
    return { log, solved: set.solved };
  });
  ok(bells.solved && (await cleared('zF-bells')), 'hiru kanpaiak batera → kutxa dorrearen gainean', S(bells));
  ok((await era(0)) === 0, 'IRAGANA (heura bizirik)');
  await tp(E(-46), 14, -60.9);
  p = await climbUp(1500);
  ok(p.grabbed && Math.abs(p.y - 23) < 0.2, 'dorrearen gailurrean (23 m)', S(p));
  await tp(E(-46), 23, -63.3);
  await faceTo(E(-46), -64.8);
  await open();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia-zerua')), 'GILTZA NAGUSIA (dorrearen gainean)');
  /* dorretik plazara planeatuz */
  await tp(E(-36.5), 14, -62);
  p = await glide([[1, 0, 1600, null, true, { xGte: E(-4) }], [0, 0, 600, null, true, { drop: true }]]);
  ok(p.glided && p.room === 'Z3' && p.gr, 'dorretik plazara planeatuz', S(p));

  /* 9 · enaren habia: Z4-ko haize-zutabea (orainean) → uhartetxoa → arnasa-zatia */
  ok((await era(1)) === 1, 'ORAINA (habiako haize-zutabea)');
  await tp(E(41.5), 0, -57.5);
  await T(40);
  p = await glide([[1, 0.55, 50, null], [0, 0, 700, 14.6], [0.3, 1, 900, null, true, { zGte: -35.5 }], [0, 0, 400, null, true, { drop: true }]]);
  ok(p.lifted && p.gr && Math.abs(p.y - 6) < 0.3, 'enaren habia (planeatuz)', S(p));
  await tp(E(52.5), 6, -35.2);
  await faceTo(E(52.5), -33.5);
  await open();
  ok(await ev(() => __game.saved.pieces.includes('habia')), 'ARNASA-ZATIA (enaren habia)');

  /* 10 · zeruko eskailerak → ekaitz-hesia → ate handia */
  await tp(E(0), 0, -70);
  p = await route([[E(0), -74], [E(0), -82], [E(0), -89], [E(0), -93], [E(0), -100], [E(0), -108], [E(0), -111.6]]);
  ok(Math.abs(p.y - 18) < 0.5, 'eskaileretan gora (18 m)', S(p));
  /* hesia: barrura ezin (planeatuz ere) */
  p = await ev(() => {
    const g = __game, Z = g.Z7;
    g.teleport(Z.x + 24, Z.z, Z.y + 8);
    g.P.vy = -1;
    g.P.jumps = 2;
    g.setJumpHeld(true);
    g.input.x = -0.83; g.input.z = 0.557;
    let minD = 99;
    for (let i = 0; i < 360; i++) { g.tick(1 / 120); minD = Math.min(minD, Math.hypot(g.P.x - Z.x, g.P.z - Z.z)); }
    g.setJumpHeld(false);
    g.input.x = g.input.z = 0;
    return { minD: +minD.toFixed(2), glide: !!g.P.glide };
  });
  ok(p.minD > 17.4, 'ekaitz-hesiak atzera bota (planeatuz)', S(p));
  await tp(E(0), 18, -111);
  await T(30);
  await tp(E(0), 18, -111.6);
  await faceTo(E(0), -113.7);
  await open();
  await T(160);
  ok(await ev(() => __game.saved.doors.includes('zG-n')), 'ate handia irekita (giltza nagusia)');
  await T(200);
  ok(await ev(() => __game.ZR.barrier.k < 0.2), 'ekaitz-hesia desagertzen');

  /* 11 · ODEI */
  p = await route([[E(0), -117], [E(0), -122], [E(0), -125]]);
  await T(60);
  ok(await ev(() => __game.BOSS.on && __game.BOSS.kind === 'odei'), 'ODEI: borroka hasi', S(p));
  await skip();
  await T(30);
  const fight = await ev(() => {
    const g = __game, O = g.ODEI, Z = g.Z7, log = [];
    let ticks = 0, hornDone = false, gliding = false, atkT = 0;
    const tk = (n = 1) => { for (let i = 0; i < n; i++) { g.tick(1 / 120); ticks++; } };
    const inp = (dx, dz) => { const n = Math.hypot(dx, dz); if (!n) { g.input.x = g.input.z = 0; return; } dx /= n; dz /= n; g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; };
    while (ticks < 120 * 300 && !g.saved.flags.includes('odei') && O.state !== 'freed') {
      g.P.hp = g.P.maxHp;
      if (g.cinematicState()) { g.endScene(); tk(); continue; }
      for (const e of g.ENEMIES) if (e.state !== 'dead' && e.state !== 'spawn') g.killEnemy(e);
      const st = O.state;
      /* haize-bolada: adarra haren kontra (behin) */
      if ((st === 'inhale' || st === 'gust') && !hornDone && g.P.grounded) {
        g.P.angle = Math.atan2(O.x - g.P.x, O.z - g.P.z);
        g.hornBlow();
        hornDone = O.stats.horn > 0;
        log.push('horn:' + O.stats.horn);
        tk(10);
        continue;
      }
      if (st === 'open') {
        /* hurbileneko haize-zulora, gero planeatu gora eta erasotu */
        if (!gliding) {
          let best = null, bd = 1e9;
          for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2, vx = Z.x + Math.cos(a) * 7.5, vz = Z.z + Math.sin(a) * 7.5, d = Math.hypot(vx - g.P.x, vz - g.P.z); if (d < bd) { bd = d; best = [vx, vz]; } }
          g.teleport(best[0], best[1], Z.y);
          tk(4);
          if (O.t < 1.0) { tk(2); continue; }
          g.setJumpHeld(true);
          inp(0, 0);
          g.jump();
          tk(26);
          g.jump();
          gliding = true;
          log.push('glide@' + O.t.toFixed(1));
        }
        tk(2);
        if (g.BOSS.vulnerable() && ticks - atkT > 22) {
          g.MAG.cd = 0;
          g.attack();
          atkT = ticks;
        }
        continue;
      }
      if (gliding) {
        g.setJumpHeld(false);
        gliding = false;
        for (let i = 0; i < 600 && !g.P.grounded; i++) tk();
      }
      /* kanpaiak: argitu gabeak, garaia egokituz */
      const set = g.RUNE_PUZ.find((s) => s.D.id === 'zG-bells');
      /* lehenik haize-bolada bat ikusi (adarra probatzeko), gero kanpaiak */
      if ((st === 'storm' || st === 'bolts' || st === 'hail') && set && !set.solved && (hornDone || ticks > 120 * 45)) {
        const R = set.list.find((r) => !r.lit);
        if (R) {
          if (R.era !== -1 && g.phase() !== R.era) {
            for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) tk();
            g.switchPhase();
            tk(10);
          }
          const dx = Z.x - R.x, dz = Z.z - R.z, d = Math.hypot(dx, dz);
          g.teleport(R.x + (dx / d) * 4, R.z + (dz / d) * 4, Z.y);
          g.P.angle = Math.atan2(R.x - g.P.x, R.z - g.P.z);
          g.MAG.cd = 0;
          g.attack();
          tk(36);
          continue;
        }
      }
      tk(3);
    }
    g.setJumpHeld(false);
    inp(0, 0);
    return { ticks, state: O.state, rounds: O.rounds, stats: O.stats, log: log.slice(-10), flag: g.saved.flags.includes('odei') };
  });
  ok(fight.stats.horn > 0, 'ODEI: haize-bolada HAIZE-ADARRAz geldiarazita', S(fight.stats));
  ok(fight.stats.glide > 0, 'ODEI: bihotza planeatzen jota (haize-zuloak)', S(fight.stats));
  ok(fight.stats.rounds === 3, 'ODEI: hiru txanda', S({ rounds: fight.stats.rounds, state: fight.state, ticks: fight.ticks, log: fight.log }));
  await skip();
  await T(60);
  await skip();
  ok(await flag('odei'), 'ODEI ASKE');
  ok(await ev(() => __game.saved.hearts >= 5), 'ODEIREN BIHOTZA: arnasa bat gehiago');
  const objZ = await ev(() => __game.objective());
  ok(/ortzadarr/.test(objZ[0]), 'helburua: ortzadarretik itzuli', objZ[0]);

  /* 12 · ortzadarretik behera → harana → Irati: bosgarren argia */
  await tp(E(0), 0, 9);
  p = await route([[E(0), 14], [E(0), 19.5]]);
  await T(160);
  ok((await ev(() => __game.ZONE.cur)) === 'ibarra', 'ortzadarretik behera → harrespila', S(p));
  const obj1 = await ev(() => __game.objective());
  ok(/Odei/.test(obj1[0]), 'helburua: Iratiri Odeiren berri eman', obj1[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.2, N.z, N.y || 0); for (let i = 0; i < 4; i++) g.tick(1 / 120); g.talkTo(N); });
  const green = await ev(() => {
    const g = __game;
    for (let k = 0; k < 20 && g.cinematicState() && g.cinematicState().n < 2; k++) { g.nextShot(); g.step(1 / 30, false); }
    for (let k = 0; k < 150 && g.cinematicState() && g.ZAZPI.green < 5; k++) g.step(1 / 30, false);
    return g.ZAZPI.green;
  });
  ok(green === 5, 'zazpi argiak: bosgarrena berde (Odei aske)', green);
  await skip();
  ok(await flag('irati-odei'), 'Irati: Odeiren berria (amaiera)');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
