// LEIZEEN DEIA: HERENSUGEAREN HAITZULOA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_herensuge.js http://127.0.0.1:8091/games/leizeak.html [pantaila-argazkien-karpeta]
// Zerua: Odeiren hodeia → SUGE-MENDIA → sare beltza (SUA) → laba-arroila (lurrazala ORAINEAN, bero-zutabea
// IRAGANEAN, ENARA) → saguzarrak → habia (borroka, giltza, sutondoa) → ispilu-zaina (EGUZKI-ISPILUA) →
// eguzki-zuloa (barrak) → ispiluen aretoa (BIRATU, sarea EGUZKIAz, kristala ILARGIAz) → kristalen gela
// (giltza nagusia) → HERENSUGEA (argia begietara, ALDARATU, su-bola itzuli, estalpea, azken burua bi argiekin)
// → herensugearen hegaldia herrira → Irati: seigarren argia → etxean lo: Inguma.
const { launch } = require('./_browser');
(async () => {
  const [url, shots] = process.argv.slice(2);
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
  /* gordetako partida: bost leize amaituta, Iratiren bosgarren eszena ikusita */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('giroa', 'intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo', 'jentil', 'jentilatea', 'errolan', 'irati-errolan', 'ortzadarra', 'odei', 'irati-odei', 'sutondoa', 'etxea');
    s.rhythms.push('esnatu', 'entzun', 'ortzi');
    s.items.push('katea', 'giltzanagusia', 'adarra', 'orrazia', 'giltzanagusia-lamia', 'sugarra', 'giltzanagusia-tartalo', 'tximistarria', 'giltzanagusia-jentil', 'enara', 'giltzanagusia-zerua');
    s.hearts = 5;
    s.tod = 0.4;
  });
  await ev((hd) => { __game.renderer.setPixelRatio(hd ? 1 : 0.25); __game.renderer.shadowMap.enabled = hd; }, !!shots);
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; window.E = (x) => 2400 + x; });

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
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, gr: g.P.grounded };
  }, [dx, dz, secs, run]);
  const goTo = async (x, z, run = false) => { const c = await ev(() => [__game.P.x, __game.P.z]); const d = Math.hypot(x - c[0], z - c[1]); return walk(x - c[0], z - c[1], d / (run ? 12.8 : 7.7), run); };
  const route = async (pts) => { let p; for (const [x, z] of pts) p = await goTo(x, z); return p; };
  const faceTo = (x, z) => ev(([x, z]) => { const g = __game, a = Math.atan2(x - g.P.x, z - g.P.z); g.P.angle = a; g.hero.rotation.y = a; }, [x, z]);
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const doorOpen = (k) => ev((k) => __game.saved.doors.includes(k), k);
  const E = (x) => 2400 + x;
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a ? a.kind : null; }); await T(30); await skip(); await T(10); return a; };
  const act = () => ev(() => { const a = __game.actionHere(); return a ? a.kind + ':' + a.label : null; });
  const era = (want) => ev((want) => { const g = __game; for (let k = 0; k < 3 && g.phase() !== want; k++) { for (let i = 0; i < 240 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); } return g.phase(); }, want);
  const killAll = () => ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
  const fire = async (secs = 1.1) => { await ev(() => { __game.MAG.cd = 0; __game.ATK.hold = true; }); await T(Math.round(secs * 120)); await ev(() => { __game.ATK.hold = false; }); await T(90); };
  const shot = async (n) => { if (!shots) return; await ev(() => { for (let i = 0; i < 2; i++) __game.draw(); }); await page.screenshot({ path: `${shots}/${n}.png` }); };
  /* planeatu: jauzi bikoitza eta eutsi; plan: [[dx, dz, ticks, stopY, stopGround], ...] */
  const glide = (plan) => ev((plan) => {
    const g = __game, inp = (dx, dz) => { const n = Math.hypot(dx, dz); if (!n) { g.input.x = g.input.z = 0; return; } dx /= n; dz /= n; g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; };
    const log = { glided: false, maxY: g.P.y, lifted: false };
    g.setJumpHeld(true);
    inp(plan[0][0], plan[0][1]);
    g.jump();
    for (let i = 0; i < 26; i++) g.tick(1 / 120);
    g.jump();
    let t = 0;
    for (const [dx, dz, n, stopY, stopGround] of plan) {
      inp(dx, dz);
      for (let i = 0; i < n; i++) {
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
  /* EGUZKI-ISPILUA: argi-zutabean geldi, helburura begira, eutsi SORGINKERIAri */
  const shine = (sx, sy, sz, tx, tz, secs = 1.6) => ev(([sx, sy, sz, tx, tz, secs]) => {
    const g = __game;
    g.teleport(sx, sz, sy);
    for (let i = 0; i < 12; i++) g.tick(1 / 120);
    const a = Math.atan2(tx - g.P.x, tz - g.P.z);
    g.P.angle = a;
    g.hero.rotation.y = a;
    g.MAG.cd = 0;
    g.ATK.hold = true;
    let raised = false, hops = 0, endK = null;
    for (let i = 0; i < Math.round(secs * 120); i++) {
      g.tick(1 / 120);
      if (g.MIR.on) raised = true;
      if (g.MIR.end) endK = g.MIR.end.k;
    }
    const kind = g.MIR.kind;
    g.ATK.hold = false;
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    return { raised, endK, kind, down: !g.MIR.on, x: +g.P.x.toFixed(1), z: +g.P.z.toFixed(1) };
  }, [sx, sy, sz, tx, tz, secs]);
  const turn = async (M, n) => { for (let k = 0; k < n; k++) { await ev((id) => { const g = __game, M = g.MIRRORS.find((m) => m.id === id); g.teleport(M.x + 1.4, M.z + 0.6, M.y); for (let i = 0; i < 6; i++) g.tick(1 / 120); const a = g.actionHere(); if (a && a.kind === 'turn') a.fn(); }, M); await T(20); } return ev((id) => +__game.MIRRORS.find((m) => m.id === id).a.toFixed(3), M); };

  /* 0 · haranean: helburua → zerua, Odeiren hodeia */
  let o = await ev(() => __game.objective());
  ok(/Odeiren hodei/.test(o[0]) && /SUGE-MENDIRA/.test(o[0]), 'haraneko helburua: Odeiren hodeia, SUGE-MENDIRA', o[0]);
  await ev(() => { __game.enterZone('zerua', { x: 1800, y: 0, z: 4, a: 0, cp: true }, true); });
  await T(40);
  await skip();
  await T(10);
  o = await ev(() => __game.objective());
  ok(/hodei zuria/.test(o[0]), 'zeruko helburua: Odeiren hodei zuria', o[0]);
  const cloud = await ev(() => { const g = __game; return g.HZ.cloud && g.HZ.cloud.visible ? [g.HZ.cloud.position.x, g.HZ.cloud.position.z] : null; });
  ok(!!cloud, 'Odeiren hodeia ikusgai (Z1)', S(cloud));
  await tp(cloud[0] - 1.6, 0, cloud[1] + 1.2);
  ok((await act()) === 'talk:HODEIA', 'hodeiaren ondoan: HODEIA');
  await shot('01_hodeia');
  await ev(() => __game.interact());
  await T(10);
  await skip();
  await T(80);
  let st = await ev(() => ({ zone: __game.ZONE.cur, x: +__game.P.x.toFixed(1), z: +__game.P.z.toFixed(1), cp: __game.saved.cp && __game.saved.cp.zone }));
  ok(st.zone === 'herensuge' && st.cp === 'herensuge' && (await flag('suge-mendia')), 'hodeiak SUGE-MENDIRA eraman (Odeiren hitzak, kontrol-puntua)', S(st));

  /* 1 · Suge-mendiaren ahoa: sutondoa, sare beltza (SUA) */
  await ev(() => { const g = __game; g.P.hp = 2; g.teleport(E(-9) + 1.9, 3.5 + 1.4, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const hearth = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  st = await ev(() => ({ hp: __game.P.hp, max: __game.P.maxHp }));
  ok(hearth === 'ATSEDEN' && st.hp === st.max, 'sutondoa: atseden (arnasa beteta)', S(st));
  await skip();
  o = await ev(() => __game.objective());
  ok(/Sare beltz/.test(o[0]), 'helburua: sare beltza (SUA)', o[0]);
  /* sorginkeria arrunta: ez du erretzen */
  await tp(E(0), 0, -7);
  await faceTo(E(0), -13);
  await ev(() => { __game.MAG.cd = 0; __game.attack(); });
  await T(90);
  ok(!(await cleared('hA-sarea')), 'sorginkeria arruntak ez du sarea erretzen');
  await faceTo(E(0), -13);
  await fire(1.2);
  ok(await cleared('hA-sarea'), 'SUGAR-IZPIA (INDARRA): sare beltza erre');
  /* argi-zutabea ispilurik gabe: ezer ez */
  await tp(E(7), 0, -3);
  await ev(() => { __game.MAG.cd = 0; __game.ATK.hold = true; });
  await T(70);
  st = await ev(() => ({ mir: __game.MIR.on, charging: __game.MAG.charging }));
  await ev(() => { __game.ATK.hold = false; });
  await T(60);
  ok(!st.mir && st.charging, 'argi-zutabea ispilurik gabe: INDARRA (ez ispilua)', S(st));
  /* irteera (hegoan) → zerua; hodeiak berriro (eszenarik gabe) */
  await tp(E(0), 0, 14);
  await walk(0, 1, 0.5);
  await T(100);
  await skip();
  st = await ev(() => ({ zone: __game.ZONE.cur, x: +__game.P.x.toFixed(1), z: +__game.P.z.toFixed(1) }));
  ok(st.zone === 'zerua' && Math.abs(st.x - 1804.2) < 2, 'irteera: zerura, Odeiren hodeiaren ondora', S(st));
  await tp(cloud[0] - 1.6, 0, cloud[1] + 1.2);
  await ev(() => __game.interact());
  await T(80);
  ok((await ev(() => __game.ZONE.cur)) === 'herensuge' && !(await ev(() => __game.cinematicState())), 'hodeia berriro: zuzenean SUGE-MENDIRA');

  /* 2 · Laba-arroila */
  let p = await route([[E(0), -10], [E(0), -19.5]]);
  ok(p.room === 'H2' && p.gr, 'laba-arroila (hegoko ertza)', S(p));
  ok((await era(1)) === 1, 'ORAINA: lurrazala');
  await shot('02_arroila_oraina');
  /* laba ukitu: erre (azken lur segurura, arnasa bat galduta) */
  st = await ev(() => __game.P.hp);
  await tp(E(6), 0, -21.5);
  p = await walk(0, -1, 0.9);
  await T(160);
  const lava = await ev(() => ({ hp: __game.P.hp, z: +__game.P.z.toFixed(1), y: +__game.P.y.toFixed(1) }));
  ok(lava.hp === st - 1 && lava.z > -24.5 && lava.y > -0.5, 'laba ukituta: erre, ertzera itzuli (arnasa bat)', S({ st, lava }));
  await ev(() => { __game.P.hp = __game.P.maxHp; });
  p = await route([[E(-2.2), -21.5], [E(-2.2), -26.5], [E(-0.8), -30.8], [E(0), -34.6]]);
  ok(p.room === 'H2' && Math.abs(p.y) < 0.2 && p.gr, 'lurrazaletik erdiko harkaitzera', S(p));
  ok((await era(0)) === 0, 'IRAGANA: lurrazala urtuta, beroa gora');
  st = await ev(() => ({ y: +__game.P.y.toFixed(2), gr: __game.P.grounded, draft: __game.updraftAt(__game.P.x, __game.P.y + 1, -37) > 0 }));
  ok(st.gr && Math.abs(st.y) < 0.2 && st.draft, 'harkaitzean (IRAGANA): bero-zutabea bizirik', S(st));
  await tp(E(0.4), 0, -36.8);
  p = await glide([[0, 0, 900, 10.2], [0, -1, 700, null, true]]);
  ok(p.glided && p.lifted && p.maxY > 9.5, 'bero-zutabeak gora (ENARA)', S(p));
  ok(p.gr && Math.abs(p.y - 6) < 0.3 && p.z < -46.5, 'iparreko ertz garaian (6 m)', S(p));
  await T(150);
  const bats = await ev(() => __game.ENEMIES.filter((e) => e.type === 'bat' && e.state !== 'dead').length);
  ok(bats >= 2, 'SAGUZARRAK ertzean (bi)', bats);
  /* saguzarra: hover → garrasia → murgildu */
  const dive = await ev(() => { const g = __game, b = g.ENEMIES.find((e) => e.type === 'bat'); let seen = new Set(); for (let i = 0; i < 900 && !seen.has('lunge'); i++) { g.tick(1 / 120); seen.add(b.state); } return [...seen]; });
  ok(dive.includes('hover') && dive.includes('wind') && dive.includes('lunge'), 'saguzarra: zain → garrasia → murgildu', S(dive));
  await shot('03_saguzarrak');
  await killAll();
  await T(60);
  await ev(() => { __game.P.hp = __game.P.maxHp; });

  /* 3 · Saguzarren habia: borroka → giltza; sutondoa */
  p = await route([[E(0), -56], [E(0), -66]]);
  await T(60);
  st = await ev(() => __game.state().fight);
  ok(st === 'H3', 'habia: borroka hasi', S(p));
  for (let k = 0; k < 14 && !(await cleared('H3')); k++) { await killAll(); await T(220); }
  ok(await cleared('H3'), 'habia garbituta (hiru olatu)');
  await tp(E(0), 6, -73.4);
  await faceTo(E(0), -75);
  await open();
  ok((await ev(() => __game.saved.keyz.herensuge)) === 1, 'GILTZA TXIKIA habian');
  await ev(() => { const g = __game; g.P.hp = 1; g.teleport(E(-10) + 1.8, -84.5 + 1.6, 6); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const hearthC = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  await skip();
  st = await ev(() => ({ hp: __game.P.hp, max: __game.P.maxHp, cp: __game.saved.cp }));
  ok(hearthC === 'ATSEDEN' && st.hp === st.max && Math.abs(st.cp.y - 6) < 0.1, 'bigarren sutondoa (habian)', S(st));
  /* barrak (ekialdean): oraindik ez */
  await tp(E(11), 6, -75);
  p = await walk(1, 0, 1.2);
  ok(p.x < E(14.6), 'ekialdeko barrak itxita', S(p));

  /* 4 · Ispilu-zaina → EGUZKI-ISPILUA */
  await tp(E(-11.5), 6, -75);
  await faceTo(E(-15), -75);
  const kd = await open();
  ok(kd === 'door' && (await doorOpen('hC-w')), 'mendebaldeko atea: giltza txikia', kd);
  p = await route([[E(-20), -75], [E(-30), -75]]);
  await T(80);
  ok(await ev(() => !!__game.MINI.e), 'ISPILU-ZAINA esnatu', S(p));
  await killAll();
  await T(30);
  await page.waitForTimeout(1300);
  await T(60);
  await killAll();
  await T(60);
  ok(await cleared('hD-mini'), 'ispilu-zaina garaituta');
  await tp(E(-36), 6, -80.2);
  await faceTo(E(-36), -82);
  await open();
  ok(await ev(() => __game.saved.items.includes('ispilua')), 'EGUZKI-ISPILUA eskuratuta');
  /* kristal zuria: edozein argi */
  let sh = await shine(E(-36), 6, -69, E(-47.5), -69, 1.8);
  ok(sh.raised && sh.endK === 'crystal' && (await cleared('hD-kristala')), 'ISPILUA: argi-zutabean altxatu, izpia kristal zurira', S(sh));
  ok(sh.down, 'askatu: ispilua jaitsi', S(sh));
  await tp(E(-47.5), 6, -84.5);
  await faceTo(E(-47.5), -86);
  await open();
  ok((await ev(() => __game.saved.chests.includes('hD-txanponak'))), 'kristalaren saria: txanpon-kutxa');
  /* argitik kanpo: INDARRA (ez ispilua) */
  await tp(E(-30), 6, -78);
  await ev(() => { __game.MAG.cd = 0; __game.ATK.hold = true; });
  await T(70);
  st = await ev(() => ({ mir: __game.MIR.on, charging: __game.MAG.charging }));
  await ev(() => { __game.ATK.hold = false; });
  await T(60);
  ok(!st.mir && st.charging, 'argitik kanpo: INDARRA, ez ispilua', S(st));

  /* 5 · Habiako eguzki-zuloa (IRAGANA) → barrak */
  ok((await era(1)) === 1, 'ORAINA');
  sh = await shine(E(6), 6, -76.4, E(18.6), -76.4, 1.0);
  ok(!sh.raised, 'eguzki-zuloa ORAINEAN: argirik ez, ispilurik ez', S(sh));
  ok((await era(0)) === 0, 'IRAGANA');
  sh = await shine(E(6), 6, -76.4, E(18.6), -76.4, 1.8);
  ok(sh.raised && sh.kind === 'sun' && sh.endK === 'crystal' && (await doorOpen('hC-e')), 'EGUZKIA barren artetik kristal urrera: barrak ireki', S(sh));
  await shot('04_eguzki_zuloa');

  /* 6 · Ispiluen aretoa */
  p = await route([[E(15), -75], [E(24), -75]]);
  ok(p.room === 'H5', 'ispiluen aretoa', S(p));
  sh = await shine(E(25), 6, -64, E(25), -85.5, 1.4);
  ok(sh.raised && sh.endK === 'back', 'ispilu-harria atzetik: argiak ez du zeharkatzen', S(sh));
  const a1 = await turn('hE-m1', 2), a2 = await turn('hE-m2', 2);
  ok(Math.abs(a1 - Math.PI / 2) < 0.01 && Math.abs(a2) < 0.01, 'BIRATU: bi ispilu-harri (ekialdera, hegoalderantz)', S([a1, a2]));
  ok((await era(1)) === 1, 'ORAINA');
  sh = await shine(E(25), 6, -64, E(25), -85.5, 1.4);
  ok(sh.endK === 'web' && !(await cleared('hE-sarea')), 'ILARGIAk ez du sare beltza erretzen', S(sh));
  ok((await era(0)) === 0, 'IRAGANA');
  sh = await shine(E(25), 6, -64, E(25), -85.5, 2.0);
  ok(await cleared('hE-sarea'), 'EGUZKIA bi ispilutan: sare beltza erre', S(sh));
  sh = await shine(E(25), 6, -64, E(25), -85.5, 1.4);
  ok(sh.endK === 'crystal' && !(await doorOpen('hE-n')), 'EGUZKIAk ez du kristal urdina pizten', S(sh));
  ok((await era(1)) === 1, 'ORAINA');
  sh = await shine(E(25), 6, -64, E(25), -85.5, 1.8);
  ok(sh.kind === 'moon' && sh.endK === 'crystal' && (await doorOpen('hE-n')), 'ILARGIA → kristal urdina: iparreko barrak ireki', S(sh));
  await ev(() => { const g = __game; g.teleport(E(25), -64, 6); for (let i = 0; i < 10; i++) g.tick(1 / 120); g.P.angle = Math.PI; g.MAG.cd = 0; g.ATK.hold = true; for (let i = 0; i < 80; i++) g.tick(1 / 120); });
  await shot('05_ispiluak');
  await ev(() => { __game.ATK.hold = false; });
  await T(30);

  /* 7 · Kristalen gela → giltza nagusia */
  p = await route([[E(36), -88], [E(36), -101]]);
  await T(140);
  ok(p.room === 'H6', 'kristalen gela', S(p));
  const batsF = await ev(() => __game.ENEMIES.filter((e) => e.type === 'bat' && e.state !== 'dead').length);
  ok(batsF >= 2, 'saguzarrak kristalen gelan', batsF);
  /* argiak saguzarra lurrera botatzen du */
  const stun = await ev(() => {
    const g = __game, b = g.ENEMIES.find((e) => e.type === 'bat' && e.state !== 'dead');
    for (const e of g.ENEMIES) if (e !== b && e.state !== 'dead') g.killEnemy(e);
    b.x = E(46); b.z = -111; b.state = 'hover'; b.cd = 9;
    function E(x) { return 2400 + x; }
    g.teleport(E(42), -111, 6);
    for (let i = 0; i < 10; i++) g.tick(1 / 120);
    g.P.angle = Math.PI / 2;
    g.ATK.hold = true;
    let stunned = 0, low = 9;
    for (let i = 0; i < 160; i++) { b.x = E(46); b.z = -111; g.tick(1 / 120); if (b.stun > 0) stunned++; low = Math.min(low, b.fly); }
    g.ATK.hold = false;
    for (let i = 0; i < 20; i++) g.tick(1 / 120);
    return { stunned, low: +low.toFixed(2) };
  });
  ok(stun.stunned > 40 && stun.low < 0.9, 'izpiak saguzarra zorabiatu (lurrera)', S(stun));
  await killAll();
  await T(30);
  const ta = await turn('hF-ma', 2), tb = await turn('hF-mb', 2), tc = await turn('hF-mc', 2);
  ok(Math.abs(ta - Math.PI) < 0.01 && Math.abs(tb - Math.PI / 2) < 0.01 && Math.abs(tc - Math.PI / 2) < 0.01, 'hiru ispilu-harriak biratuta', S([ta, tb, tc]));
  ok((await era(0)) === 0, 'IRAGANA');
  sh = await shine(E(42), 6, -111, E(34), -111, 1.6);
  ok(await cleared('hF-ka'), 'kristal urrea (EGUZKIA, bi ispilu)', S(sh));
  sh = await shine(E(42), 6, -111, E(53), -111, 1.6);
  ok(await cleared('hF-sarea'), 'sare beltza erre (ekialdean)', S(sh));
  sh = await shine(E(42), 6, -111, E(42), -102.5, 1.6);
  ok(await cleared('hF-kc'), 'kristal zuria (ispilu batekin)', S(sh));
  ok(!(await cleared('hF-kristalak')), 'oraindik ez: kristal urdina falta');
  ok((await era(1)) === 1, 'ORAINA');
  sh = await shine(E(42), 6, -111, E(53), -111, 1.6);
  ok((await cleared('hF-kb')) && (await cleared('hF-kristalak')), 'kristal urdina (ILARGIA): hiru argiak!', S(sh));
  await T(30);
  await skip();
  await tp(E(31.5) + 1.2, 6, -99.5 + 1.2);
  await faceTo(E(31.5), -99.5);
  await open();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia-herensuge')), 'GILTZA NAGUSIA (kristalen gela)');

  /* 8 · HERENSUGEA */
  await tp(E(0), 6, -87.2);
  await faceTo(E(0), -90);
  const bd = await open();
  ok(bd === 'door' && (await doorOpen('hC-n')), 'ate handia: giltza nagusia', bd);
  o = await ev(() => __game.objective());
  ok(/habia/i.test(o[0]), 'helburua: Herensugearen habia', o[0]);
  ok(await ev(() => { const g = __game; g.P.hp = g.P.maxHp; return true; }), '');
  p = await route([[E(0), -94], [E(0), -101.5]]);
  await T(60);
  ok((await ev(() => __game.cinematicState())) || (await ev(() => __game.BOSS.on)), 'habian: HERENSUGEA esnatu (eszena)', S(p));
  await skip();
  await T(30);
  st = await ev(() => ({ on: __game.BOSS.on, kind: __game.BOSS.kind, round: __game.ZB.round, states: __game.ZB.heads.map((H) => H.state) }));
  ok(st.on && st.kind === 'zazpi' && st.round === 0 && st.states[1] === 'rise' && st.states[5] === 'rise' && st.states[3] === 'sleep', 'borroka: bi buru esnatu (1 eta 5)', S(st));
  await T(260);
  /* erasoak gelditu (probetarako) */
  const calm = () => ev(() => { const g = __game; g.ZB.atkCd = 99; for (const H of g.ZB.heads) if (H.state.startsWith('bite') || H.state.startsWith('breath') || H.state === 'spit') { H.state = 'idle'; H.t = 0; } g.ZB.breathCone.visible = false; for (const s of g.SHOTS) g.scene.remove(s.m); g.SHOTS.length = 0; });
  await calm();
  await shot('06_herensugea');
  /* a · ILARGIA begi urdinetara (1. burua) */
  ok((await era(1)) === 1, 'ORAINA (ilargia)');
  await calm();
  const beamHead = (i, shaft, secs) => ev(([i, shaft, secs]) => {
    const g = __game, H = g.ZB.heads[i], S0 = g.SHAFTS.find((s) => s.id === 'hG-argia' + shaft);
    g.teleport(S0.x, S0.z, 6);
    for (let k = 0; k < 10; k++) g.tick(1 / 120);
    g.ZB.atkCd = 99;
    const a = Math.atan2(H.pos.x - g.P.x, H.pos.z - g.P.z);
    g.P.angle = a;
    g.ATK.hold = true;
    let maxL = 0, endK = null;
    for (let k = 0; k < Math.round(secs * 120) && H.state !== 'down'; k++) { g.ZB.atkCd = 99; g.tick(1 / 120); maxL = Math.max(maxL, H.light); if (g.MIR.end) endK = g.MIR.end.k; }
    g.ATK.hold = false;
    for (let k = 0; k < 20; k++) g.tick(1 / 120);
    return { state: H.state, maxL: +maxL.toFixed(2), endK, mir: g.MIR.kind };
  }, [i, shaft, secs]);
  let bh = await beamHead(1, 0, 2.5);
  ok(bh.state === 'down' && bh.endK === 'boss', 'ILARGIA begi urdinetara: burua lurrera', S(bh));
  /* eztarriko itzal-harria: SORGINKERIA */
  const bolts = await ev(() => {
    const g = __game, H = g.ZB.heads[1];
    g.teleport(H.pos.x + 3, H.pos.z + 4, 6);
    for (let k = 0; k < 30; k++) g.tick(1 / 120);
    const hp0 = H.hp;
    for (let n = 0; n < 4; n++) { g.MAG.cd = 0; g.attack(); for (let k = 0; k < 60; k++) { g.ZB.atkCd = 99; g.tick(1 / 120); } }
    return { hp0, hp: H.hp, vul: g.BOSS.vulnerable() };
  });
  ok(bolts.hp < bolts.hp0, 'SORGINKERIA eztarriko itzal-harrian (zauritu)', S(bolts));
  await ev(() => { const g = __game, H = g.ZB.heads[1]; if (H.state !== 'down') g.zbDown(H, 4, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); for (let k = 0; k < 10; k++) g.tick(1 / 120); });
  ok((await ev(() => __game.ZB.heads[1].state)) === 'dead', 'lehen burua itzalita');
  /* b · okerreko argia: ezer ez (5. burua, urrea, ILARGIArekin) */
  await calm();
  bh = await beamHead(5, 1, 1.4);
  ok(bh.state !== 'down' && bh.maxL === 0, 'ILARGIAk ez ditu begi urreak itxi', S(bh));
  /* c · ALDARATU hozka (5. burua) */
  await calm();
  const parry = await ev(() => {
    const g = __game, H = g.ZB.heads[5];
    g.P.hp = g.P.maxHp;
    g.teleport(H.pos.x - 2, H.pos.z + 7, 6);
    for (let k = 0; k < 20; k++) { g.ZB.atkCd = 99; g.tick(1 / 120); }
    H.state = 'bite_wind'; H.t = 0; H.atk0 = g.time ? g.time() : 0;
    g.ZB.focus = H;
    let pressed = false, hp0 = g.P.hp;
    for (let k = 0; k < 400 && H.state !== 'down' && H.state !== 'bite_rec'; k++) {
      g.ZB.atkCd = 99;
      g.P.angle = Math.atan2(H.pos.x - g.P.x, H.pos.z - g.P.z);
      if (H.state === 'bite' && !pressed && Math.hypot(H.pos.x - g.P.x, H.pos.z - g.P.z) < 4.5) { g.guardPress(); pressed = true; }
      g.tick(1 / 120);
    }
    return { state: H.state, pressed, hp0, hp: g.P.hp, parry: g.ZB.stats.parry || 0 };
  });
  ok(parry.state === 'down' && parry.parry >= 1 && parry.hp === parry.hp0, 'ALDARATU hozka: burua lurrera (zauririk gabe)', S(parry));
  await ev(() => { const g = __game, H = g.ZB.heads[5]; if (H.state !== 'down') g.zbDown(H, 4, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); });
  await T(30);
  st = await ev(() => ({ state: __game.ZB.state, title: document.getElementById('chapterTitle').textContent }));
  ok(st.state === 'roar', 'bi buru itzalita: orroa', S(st));
  await T(320);
  st = await ev(() => ({ round: __game.ZB.round, states: __game.ZB.heads.map((H) => H.state), bats: __game.ENEMIES.filter((e) => e.type === 'bat' && e.state !== 'dead').length }));
  ok(st.round === 1 && st.bats >= 2, 'bigarren txanda: 0. eta 6. buruak, saguzarrak', S(st));
  await killAll();
  await T(240);
  /* d · su-bola itzuli (EZKUTUA) → burua zorabiatu (0. burua) */
  await calm();
  const refl = await ev(() => {
    const g = __game, H = g.ZB.heads[0];
    g.P.hp = g.P.maxHp;
    g.teleport(2400 - 5, -111, 6);
    for (let k = 0; k < 20; k++) { g.ZB.atkCd = 99; g.tick(1 / 120); }
    g.P.angle = Math.atan2(H.pos.x - g.P.x, H.pos.z - g.P.z);
    H.state = 'spit'; H.t = 0; H.spat = false; g.ZB.focus = H;
    g.MAG.cd = 0; g.ATK.hold = true;
    let back = false;
    for (let k = 0; k < 500 && H.state !== 'down'; k++) {
      g.ZB.atkCd = 99;
      g.P.angle = Math.atan2(H.pos.x - g.P.x, H.pos.z - g.P.z);
      g.tick(1 / 120);
      if (g.SHOTS.some((s) => s.back)) back = true;
    }
    g.ATK.hold = false;
    for (let k = 0; k < 20; k++) g.tick(1 / 120);
    return { state: H.state, back, reflect: g.ZB.stats.reflect || 0, hp: g.P.hp };
  });
  ok(refl.back && refl.state === 'down' && refl.reflect >= 1, 'EZKUTUA: su-bola itzuli → burua zorabiatuta', S(refl));
  await ev(() => { const g = __game, H = g.ZB.heads[0]; if (H.state !== 'down') g.zbDown(H, 4, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); });
  /* e · su-arnasa: estalpean ez, agerian bai (6. burua) */
  await calm();
  const breath = (x, z) => ev(([x, z]) => {
    const g = __game, H = g.ZB.heads[6];
    g.P.hp = g.P.maxHp;
    g.teleport(x, z, 6);
    for (let k = 0; k < 140; k++) { g.ZB.atkCd = 99; g.tick(1 / 120); }
    H.state = 'breath_wind'; H.t = 0;
    const hp0 = g.P.hp;
    let saw = false;
    for (let k = 0; k < 500 && (H.state === 'breath_wind' || H.state === 'breath'); k++) { g.ZB.atkCd = 99; g.teleport(x, z, 6); g.tick(1 / 120); if (g.ZB.breathCone.visible) saw = true; }
    return { hp0, hp: g.P.hp, saw };
  }, [x, z]);
  const covered = await breath(E(7), -106.6);
  ok(covered.saw && covered.hp === covered.hp0, 'su-arnasa: estalpearen atzean, salbu', S(covered));
  await T(150);
  const openB = await breath(E(13), -110);
  ok(openB.saw && openB.hp < openB.hp0, 'su-arnasa: agerian, erre', S(openB));
  await ev(() => { const g = __game; g.P.hp = g.P.maxHp; });
  await ev(() => { const g = __game, H = g.ZB.heads[6]; g.zbDown(H, 4, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); });
  await T(360);
  await killAll();
  st = await ev(() => ({ round: __game.ZB.round }));
  ok(st.round === 2, 'hirugarren txanda (2. eta 4. buruak, su-euria)', S(st));
  const rain = await ev(() => { const g = __game; let n = 0; for (let k = 0; k < 900; k++) { g.ZB.atkCd = 99; g.P.hp = g.P.maxHp; g.tick(1 / 120); n = Math.max(n, g.ZB.marks.length); } return n; });
  ok(rain >= 1, 'su-euria: zirkuluak lurrean', rain);
  await ev(() => { const g = __game; for (const i of [2, 4]) { const H = g.ZB.heads[i]; g.zbDown(H, 4, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); for (let k = 0; k < 10; k++) g.tick(1 / 120); } });
  await T(380);
  await killAll();
  st = await ev(() => ({ round: __game.ZB.round, s3: __game.ZB.heads[3].state }));
  ok(st.round === 3 && (st.s3 === 'idle' || st.s3 === 'rise'), 'azken burua (erdikoa) esna', S(st));
  await T(120);
  /* f · azken burua: EGUZKIA eta ILARGIA, bata bestearen atzetik */
  await calm();
  ok((await era(0)) === 0, 'IRAGANA');
  bh = await beamHead(3, 2, 1.2);
  st = await ev(() => ({ state: __game.ZB.heads[3].state, sun: __game.ZB.heads[3].sunT > 0, moon: __game.ZB.heads[3].moonT > 0 }));
  ok(st.sun && !st.moon && st.state !== 'down', 'EGUZKIA: begi urrea itxita (oraindik zutik)', S({ bh, st }));
  await ev(() => { const g = __game; for (let k = 0; k < 240 && g.state().phaseCooldown > 0; k++) g.tick(1 / 120); g.switchPhase(); for (let k = 0; k < 20; k++) g.tick(1 / 120); });
  bh = await beamHead(3, 2, 1.6);
  ok(bh.state === 'down', 'ILARGIA berehala: begi biak itxita → azken burua lurrera', S(bh));
  await ev(() => { const g = __game, H = g.ZB.heads[3]; if (H.state !== 'down') g.zbDown(H, 5, 'light'); for (let k = 0; k < 60; k++) g.tick(1 / 120); g.zbHit(H.hp); });
  await T(30);
  ok(await ev(() => __game.BOSS.dead && __game.cinematicState()), 'HERENSUGEA garaituta (eszena)');
  await shot('07_askatuta');
  await skip();
  await T(30);
  await skip();
  await T(120);
  await skip();
  await T(120);
  st = await ev(() => ({ zone: __game.ZONE.cur, flag: __game.saved.flags.includes('herensugea'), hearts: __game.saved.hearts, max: __game.P.maxHp, heads: __game.ZB.heads.map((H) => H.state) }));
  ok(st.flag && st.hearts >= 6, 'HERENSUGEA aske: bandera, arnasa bat gehiago', S(st));
  ok(st.zone === 'ibarra', 'herensugearen hegaldia: herrira', S(st));
  ok(st.heads.filter((h) => h === 'gone').length === 6 && st.heads[3] === 'free', 'sei buruak errauts, bat bakarra aske', S(st.heads));

  /* 9 · herrian: Irati → seigarren argia; etxean lo → Inguma */
  o = await ev(() => __game.objective());
  ok(/Irati/.test(o[0]), 'helburua: Iratiri kontatu', o[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.2, N.z + 1.2, N.y || 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); });
  await T(30);
  ok(await ev(() => __game.ZAZPI.turnTo === 6), 'Iratiren eszena: seigarren argia berde');
  await skip();
  await T(60);
  ok(await flag('irati-herensuge'), 'irati-herensuge');
  await ev(() => { const g = __game; g.enterZone('etxea', { ...g.DGE.entry }, true); for (let i = 0; i < 20; i++) g.tick(1 / 120); });
  await skip();
  await ev(() => { const g = __game; g.teleport(2100 - 4.0, 2.0, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  const bed = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  await page.click('#choices button:first-child');
  await T(10);
  st = await ev(() => ({ cine: !!__game.cinematicState(), flag: __game.saved.flags.includes('inguma-ametsa') }));
  ok(/OHEA/.test(bed || '') && st.cine && st.flag, 'etxean lo: Ingumaren ametsa', S({ bed, st }));
  await skip();
  await T(30);
  const mem = await ev(() => __game.DGE.mementos.find((m) => m.flag === 'herensugea').g.visible);
  ok(mem, 'oroitzapenen apala: herensuge-ezkata');

  ok(errs.length === 0, 'errorerik ez', errs.slice(0, 5).join('\n'));
  console.log(fails ? `\n${fails} HUTS` : '\nDENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
