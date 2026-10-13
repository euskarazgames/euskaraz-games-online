// LEIZEEN DEIA: LAMIEN LEIZEA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_lamia.js http://127.0.0.1:8091/games/leizeak.html
// Ur-jauzia (iraganean) → ubidea (orainean) → errota (bi garaiak) → korua (giltza) → herensugea (izoztu)
// → HAIZE-ADARRA → haize-errotak → balsa → giltza nagusia → Lamia Iluna → irteera → lepoko haize-errota.
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
  /* gordetako partida: lehen leizea amaituta (istorioa: cliff) */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia');
    s.hearts = 1;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });

  /* laguntzaileak */
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 10 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const toPhase = (ph) => ev((ph) => { const g = __game; if (g.phase() !== ph) { g.state().phaseCooldown; g.switchPhase(); } for (let i = 0; i < 30; i++) g.tick(1 / 120); }, ph);
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
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, resp: g.state().respawnTimer };
  }, [dx, dz, secs, run]);
  const goTo = async (x, z, run = false) => { const c = await ev(() => [__game.P.x, __game.P.z]); const d = Math.hypot(x - c[0], z - c[1]); return walk(x - c[0], z - c[1], d / (run ? 12.8 : 7.7), run); };
  const route = async (pts) => { let p; for (const [x, z] of pts) p = await goTo(x, z); return p; };
  const face = (a) => ev((a) => { __game.P.angle = a; __game.hero.rotation.y = a; }, a);
  const blow = async (a) => { await face(a); await ev(() => { __game.WIND.cd = 0; __game.hornBlow(); }); await T(30); };
  const until = async (f, maxTicks = 3000, a) => { for (let i = 0; i < maxTicks; i += 20) { if (await ev(f, a)) return true; await T(20); } return false; };
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);

  /* 0 · haranean: helburua ur-jauzia; ertzean IRAGANERA → leizera */
  const obj0 = await ev(() => __game.objective());
  ok(/LAMIEN LEIZEA/.test(obj0[0]), 'haraneko helburua: Lamien leizea', obj0[0]);
  await toPhase(1);
  await tp(93, -0.9, -28.5);
  let p = await walk(1, 0, 1.2);
  ok(p.zone === 'ibarra' && p.x < 98.4, 'orainean izotz-gortinak geldiarazi', S(p));
  await toPhase(0);
  p = await walk(1, 0, 1.6);
  await T(120);
  p = await ev(() => ({ zone: __game.ZONE.cur, x: __game.P.x, z: __game.P.z }));
  ok(p.zone === 'lamia', 'iraganean ur-jauziaren atzetik → LAMIEN LEIZEA', S(p));
  await skip();

  /* 1 · L1: ubidea iraganean ura (erori), orainean izotza */
  await toPhase(0);
  await tp(900, 0, 7);
  const hp0 = await ev(() => __game.P.hp);
  p = await walk(0, -1, 1.4);
  await T(80);
  p = await ev(() => ({ hp: __game.P.hp, z: __game.P.z }));
  ok(p.hp < hp0 && p.z > 2.5, 'iraganean ubidean erori → itzuli (arnasa galdu)', S(p));
  await toPhase(1);
  await ev(() => { __game.P.hp = __game.P.maxHp; });
  p = await walk(0, -1, 2.4);
  ok(p.z < -4 && p.y > -0.5, 'orainean izotzaren gainetik zeharkatu', S(p));
  p = await route([[900, -12], [900, -24], [900, -28]]);
  ok(p.room === 'L2', 'L2: errotaren gela', S(p));

  /* 2 · L2: ubidea orainean zeharkatu, mendebaldeko barrak iraganean */
  p = await route([[884, -30], [884, -45]]);
  ok(p.z < -40, 'orainean ubidea zeharkatu (iparraldera)', S(p));
  p = await goTo(880, -45);
  ok(p.x > 882, 'orainean mendebaldeko barrak itxita (gurpila izoztuta)', S(p));
  await toPhase(0);
  await T(90);
  p = await route([[876, -45], [866, -45]]);
  ok(p.room === 'L3' || p.x < 870, 'iraganean barrak altxatuta → korura', S(p));

  /* 3 · L3: borroka → giltza txikia */
  await T(200);
  let fight = await ev(() => __game.state().fight);
  ok(fight === 'L3', 'korua: borroka hasi', fight);
  for (let w = 0; w < 6 && (await ev(() => !!__game.state().fight)); w++) {
    await ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
    await T(400);
  }
  ok(await ev(() => __game.isCleared('L3')), 'korua garbituta');
  p = await ev(() => { const g = __game, C = g.CHESTS.find((c) => c.id === 'lC-key'); return C && C.m.visible; });
  ok(p, 'giltzaren kutxa agerian');
  await tp(864, 0, -52.6);
  await face(Math.PI);
  await ev(() => __game.interact());
  await skip();
  ok((await ev(() => __game.keysHere())) === 1, 'giltza txikia (leize honetakoa)');

  /* 4 · L2: iparreko atea giltzarekin */
  p = await route([[870, -45], [884, -45], [900, -51.5]]);
  await face(Math.PI);
  await ev(() => __game.interact());
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('lB-n')), 'iparreko atea irekita (giltza)');
  p = await route([[900, -56], [900, -62], [900, -66]]);
  await T(60);

  /* 5 · L5: herensugea — azaleratu (iragana) → izoztu (oraina) → harribitxia jo */
  await toPhase(0);
  await T(120);
  ok(await ev(() => __game.BOSS.on && __game.BOSS.kind === 'herensugea'), 'herensugea: borroka hasi');
  for (let round = 0; round < 3; round++) {
    await toPhase(0);
    const up = await until(() => ['spit', 'rise'].includes(__game.SERP.state) && __game.SERP.rise > 0.5, 3000);
    await toPhase(1);
    const frozen = await until(() => __game.SERP.state === 'frozen' && __game.BOSS.vulnerable(), 600);
    ok(up && frozen, `${round + 1}. txanda: azaleratu eta izoztuta`);
    /* benetako sorginkeria (helburua finkatuta) */
    await ev(() => { const g = __game; if (!g.LOCK.target) g.lockToggle(); });
    const hp1 = await ev(() => __game.SERP.hp + __game.SERP.rounds * 100);
    for (let k = 0; k < 14 && (await ev(() => __game.SERP.state === 'frozen')); k++) {
      await ev(() => { __game.MAG.cd = 0; __game.attack(); });
      await T(30);
    }
    const hp2 = await ev(() => __game.SERP.hp + __game.SERP.rounds * 100);
    ok(hp2 < hp1, `${round + 1}. txanda: sorginkeriak harribitxia jo`, `${hp1} → ${hp2}`);
    await T(60);
  }
  await until(() => __game.SERP.state === 'dead', 1200);
  ok(await ev(() => __game.isCleared('lD-boss')), 'herensugea garaituta');
  await tp(900, 0, -66);
  await face(Math.PI);
  await ev(() => __game.interact());
  await skip();
  ok(await ev(() => __game.saved.items.includes('adarra')), 'HAIZE-ADARRA eskuratuta');

  /* 6 · L2: haize-errotak → ekialdeko atea */
  p = await route([[900, -60], [900, -50], [908, -45]]);
  await blow(Math.PI / 2);
  await T(120);
  ok(await ev(() => __game.saved.doors.includes('lB-e')), 'haize-errotak biraka → ekialdeko atea irekita');

  /* 7 · L6: balsa iraganean, adarraz bultzatu → ur-jauziaren atzean giltza nagusia */
  await toPhase(0);
  p = await route([[916, -45], [926, -45], [929.2, -45]]);
  p = await walk(1, 0, 0.45);
  await T(60);
  p = await ev(() => ({ plat: __game.P.platform && __game.P.platform.moving, x: __game.P.x, y: __game.P.y }));
  ok(p.plat, 'balsaren gainean', S(p));
  for (let k = 0; k < 4 && (await ev(() => __game.RAFT.t < 0.98)); k++) {
    await blow(Math.PI / 2);
    await T(240);
  }
  p = await ev(() => ({ t: +__game.RAFT.t.toFixed(2), x: +__game.P.x.toFixed(2), onRaft: !!(__game.P.platform && __game.P.platform.moving) }));
  ok(p.t > 0.97 && p.onRaft && p.x > 944, 'balsa ur-jauziraino (Amaiur gainean)', S(p));
  p = await walk(1, 0, 1);
  ok(p.x > 949.5 && p.y > -0.2, 'iraganean ur-jauzia zeharkatu → gordelekua', S(p));
  await face(Math.PI / 2);
  await ev(() => __game.interact());
  await skip();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia-lamia')), 'GILTZA NAGUSIA (lamia)');
  /* lainoa: uhartetxoko kutxa */
  await toPhase(1);
  await tp(940, -1, -45);
  await blow(0);
  await T(60);
  ok(await ev(() => __game.CHESTS.find((c) => c.id === 'lE-piece').m.visible), 'lainoa uxatuta → uhartetxoko kutxa agerian');

  /* 8 · L5 → ate handia → L7 Lamia Iluna */
  await toPhase(1);
  p = await route([[934, -45], [926, -45], [918, -45], [906, -45], [900, -50], [900, -60], [900, -70], [900, -88], [900, -90.5]]);
  await face(Math.PI);
  await ev(() => __game.interact());
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('lD-n')), 'ate handia irekita (giltza nagusia)');
  p = await route([[900, -96], [900, -100], [900, -103]]);
  await T(80);
  await skip();
  ok(await ev(() => __game.BOSS.on && __game.BOSS.kind === 'lamia'), 'Lamia Iluna: borroka hasi');
  for (let round = 0; round < 3; round++) {
    await toPhase(0);
    await until(() => __game.LAM.state === 'song', 1200);
    await tp(900, 0, -103);
    await blow(Math.PI);
    const exp = await until(() => __game.LAM.state === 'exposed' || __game.LAM.state === 'swim', 300);
    await until(() => __game.LAM.state === 'swim' && __game.LAM.t > 0.6, 600);
    await toPhase(1);
    const tr = await until(() => __game.LAM.state === 'trapped' && __game.BOSS.vulnerable(), 300);
    ok(exp && tr, `${round + 1}. txanda: lainoa uxatu → igerian izoztu`);
    await ev(() => { const g = __game; if (!g.LOCK.target) g.lockToggle(); });
    for (let k = 0; k < 16 && (await ev(() => __game.LAM.state === 'trapped')); k++) {
      await ev(() => { __game.MAG.cd = 0; __game.attack(); });
      await T(30);
    }
    ok(await ev((r) => __game.LAM.rounds < 3 - r || __game.LAM.state === 'die' || __game.BOSS.dead, round), `${round + 1}. txanda: orrazia jota`);
    await T(120);
  }
  await until(() => !!__game.cinematicState(), 600);
  await skip();
  await skip();
  ok(await flag('lamia'), 'Lamia askatuta (bandera)');
  ok(await ev(() => __game.saved.items.includes('orrazia')), 'URREZKO ORRAZIA');

  /* 9 · irteera → haranera; lepoko haize-errota adarraz */
  await toPhase(1);
  await tp(900, 0, 13);
  p = await walk(0, 1, 0.8);
  await T(120);
  p = await ev(() => ({ zone: __game.ZONE.cur, x: +__game.P.x.toFixed(1), z: +__game.P.z.toFixed(1) }));
  ok(p.zone === 'ibarra', 'leizetik irten → haranera (ur-jauziaren ertzean)', S(p));
  const obj1 = await ev(() => __game.objective());
  ok(/lepoa|LEPOA|haize-errota/i.test(obj1[0]), 'helburua: Artzainen lepoa', obj1[0]);
  await tp(-74.6, 9.4, -99.5);
  await blow(Math.PI);
  await T(500);
  ok(await flag('lepoa'), 'lepoko haize-errota biraka → atea irekita');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
