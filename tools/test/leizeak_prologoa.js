// LEIZEEN DEIA: hitzaurrea ("OIHARTZUNA") hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_prologoa.js http://127.0.0.1:8091/games/leizeak.html [argazki-karpeta]
// Zinema (letterbox, errotuluak) → Iturralde: oihartzun-harriaren deia (hurbildu eta ERANTZUN) → SORGINKERIA
// sutondoan → ganbara (jauzi bakarrak ez du balio; JAUZI BIKOITZA bai) → Iratiren makilak → atea izoztuta
// orainean, IRAGANEAN zabalik → kalea: Gauekoren begiek harrapatu (atera itzuli), BULTZADAn ez → plaza:
// hiru itzal (bi urdin, bat urre) → egunsentia, Irati eta izenburua → intro, irati1; tresnak libre.
const { launch } = require('./_browser');
(async () => {
  const [url, shots] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const wait = (ms) => page.waitForTimeout(ms);
  const S = (o) => JSON.stringify(o);
  const shot = async (n) => { if (shots) { await ev(() => __game.draw()); await page.screenshot({ path: `${shots}/${n}.png` }); } };
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skipScenes = async () => { for (let i = 0; i < 12; i++) { if (!(await ev(() => !!__game.cinematicState()))) break; await ev(() => __game.endScene()); await wait(60); } };
  const closeGet = async () => { for (let i = 0; i < 20; i++) { if (!(await ev(() => __game.GET.on))) return; await ev(() => { __game.GET.t = 9; __game.itemGetClose(); }); await wait(80); } };
  /* munduko norabidea → sarrera (kamera lehenetsia) */
  const walk = (dx, dz, n) => ev(([dx, dz, n]) => { const g = __game; for (let i = 0; i < n; i++) { g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } g.input.x = g.input.z = 0; }, [dx, dz, n]);
  const tp = (x, z, y = 0, a) => ev(([x, z, y, a]) => { const g = __game; g.teleport(x, z, y); if (a !== undefined) { g.P.angle = a; g.hero.rotation.y = a; } g.P.vx = g.P.vz = 0; g.CAM.pos = null; }, [x, z, y, a]);
  const flags = () => ev(() => [...__game.saved.flags]);
  const st = () => ev(() => { const g = __game; return { zone: g.ZONE.cur, x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), phase: g.phase(), ring: g.RING.on, film: g.FILM.on, cine: !!g.cinematicState(), pro: g.PRO.on, can: { ...g.PRO.can } }; });

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.renderer.setPixelRatio(0.5); __game.renderer.shadowMap.enabled = false; });
  ok((await page.textContent('#play')).includes('DEIARI ERANTZUN'), 'partida berria: DEIARI ERANTZUN');
  await page.click('#play');
  await wait(1500);

  /* 0 · zinema */
  let s = await st();
  ok(s.film && s.pro, 'hasierako zinema (letterbox) eta hitzaurrea martxan', S(s));
  ok(await ev(() => document.getElementById('film').classList.contains('on') && !document.getElementById('film').hidden), 'letterbox-a agerian');
  for (let i = 0; i < 60 && !/IBARRA HARANA/.test(await page.textContent('#filmCap')); i++) await wait(250);
  const cap = await page.textContent('#filmCap');
  ok(/IBARRA/.test(cap), 'kokapen-errotulua makinaz idazten', cap.replace(/\n/g, ' / '));
  await shot('p00_zinema');
  ok(await ev(() => __game.PRO.can.phase === false && __game.PRO.can.dash === false && __game.PRO.can.lock === false), 'tresnak oraindik ikasi gabe (garaia, bultzada, finkatu)');
  await ev(() => __game.filmSkip());
  await wait(300);
  await ev(() => { window.__hold = true; __game.DAY.freeze = true; });
  s = await st();
  ok(s.zone === 'etxea' && !s.film && s.ring, 'Iturralden esnatu; oihartzun-harriak deitzen du', S(s));
  ok((await flags()).includes('pro-0'), 'pro-0 bandera');
  ok(await ev(() => document.body.classList.contains('pro-nophase') && document.body.classList.contains('pro-nodash')), 'botoiak ezkutatuta (ALDATU, BULTZADA)');
  const ph0 = await ev(() => __game.phase());
  await ev(() => __game.switchPhase());
  await T(30);
  ok((await ev(() => __game.phase())) === ph0, 'GARAIA ez dabil oraindik');

  /* 1 · mugitu harriraino eta erantzun */
  ok((await ev(() => (__game.actionHere() || {}).label)) !== 'ERANTZUN', 'urrunetik ezin da erantzun (HURBILDU)');
  const stone = await ev(() => ({ x: __game.PRO.stone.x, z: __game.PRO.stone.z }));
  await tp(stone.x + 0.4, stone.z + 1.7, 0, Math.PI);
  await T(10);
  ok((await ev(() => (__game.actionHere() || {}).label)) === 'ERANTZUN', 'harriaren ondoan: ERANTZUN');
  await ev(() => __game.interact());
  await wait(200);
  ok(await ev(() => !!__game.cinematicState() && document.getElementById('cinema').classList.contains('deia')), 'OIHARTZUN-DEIA (deien larruazala)');
  ok((await page.textContent('#cineTag')).includes('OIHARTZUN-DEIA'), 'deiaren etiketa', await page.textContent('#cineTag'));
  await shot('p01_deia');
  await skipScenes();
  ok((await flags()).includes('pro-deia'), 'pro-deia bandera');

  /* 2 · SORGINKERIA: sutondoa piztu */
  const H = await ev(() => ({ x: __game.DGE.hearth.x, z: __game.DGE.hearth.z }));
  ok(await ev(() => __game.HEARTHS.find((h) => h === __game.DGE.hearth).unlit === true), 'sutondoa itzalita');
  await tp(H.x + 1.2, H.z + 4.2, 0, Math.atan2(-1.2, -4.2));
  for (let i = 0; i < 12 && !(await flags()).includes('pro-sua'); i++) { await ev(() => __game.attack()); await T(90); }
  ok((await flags()).includes('pro-sua'), 'sutondoa piztuta SORGINKERIArekin');
  ok(await ev(() => !__game.DGE.hearth.unlit), 'sua agerian');
  await wait(1300);
  ok(await ev(() => !!__game.cinematicState()), 'Iratik ganbara aipatzen du');
  await skipScenes();

  /* 3 · ganbara: jauzi bakarra ez, bikoitza bai */
  const C = await ev(() => ({ x: __game.PRO.chest.x, z: __game.PRO.chest.z, y: __game.PRO.chest.y }));
  await tp(C.x - 1.4, C.z + 2.3, 0, Math.PI);
  await T(20);
  let maxY = await ev(() => { const g = __game; g.jump(); let m = 0; for (let i = 0; i < 160; i++) { g.input.x = 0.557; g.input.z = -0.83; g.tick(1 / 120); m = Math.max(m, g.P.y); } g.input.x = g.input.z = 0; return { m, y: g.P.y }; });
  ok(maxY.y < 1 && maxY.m < 3.4, 'jauzi bakarrarekin ez da ganbarara iristen', S(maxY));
  await tp(C.x - 1.4, C.z + 2.3, 0, Math.PI);
  await T(20);
  maxY = await ev(() => { const g = __game; g.jump(); for (let i = 0; i < 34; i++) g.tick(1 / 120); g.jump(); for (let i = 0; i < 240; i++) { g.input.x = 0.557; g.input.z = -0.83; g.tick(1 / 120); } g.input.x = g.input.z = 0; return { y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2) }; });
  ok(Math.abs(maxY.y - 3.6) < 0.15, 'JAUZI BIKOITZA: ganbaran', S(maxY));
  await tp(C.x - 0.3, C.z + 1.0, C.y, Math.PI);
  await T(10);
  ok((await ev(() => (__game.actionHere() || {}).label)) === 'IREKI', 'Iratiren kutxa: IREKI');
  await ev(() => __game.interact());
  await wait(200);
  ok(await ev(() => __game.GET.on), 'IRATIREN MAKILAK (une berezia)');
  await shot('p02_makilak');
  await closeGet();
  await wait(200);
  ok(await ev(() => document.getElementById('cinema').classList.contains('deia')), 'bigarren deia');
  let sawIntrusion = false;
  for (let i = 0; i < 6; i++) {
    if (await ev(() => document.getElementById('cinema').classList.contains('intrusion'))) { sawIntrusion = true; break; }
    await ev(() => { const g = __game; g.nextShot(); g.step(1 / 60, false); g.nextShot(); g.step(1 / 60, false); });
  }
  ok(sawIntrusion, 'Gauekok deia zulatzen du (interferentzia)');
  await skipScenes();
  ok((await flags()).includes('pro-makilak') && (await ev(() => __game.saved.items.includes('makilak'))), 'makilak eskuan');
  ok(await ev(() => __game.PRO.can.phase && !__game.PRO.can.dash), 'GARAIA ikasita (bultzada ez oraindik)');

  /* 4 · atea: orainean izotza, iraganean zabalik */
  await tp(await ev(() => __game.DGE.exitArch.x), 2.6, 0, 0);
  await walk(0, 1, 240);
  s = await st();
  ok(s.zone === 'etxea' && s.z <= 4.4, 'orainean izotzak atea ixten du', S(s));
  await ev(() => __game.switchPhase());
  await T(40);
  ok((await ev(() => __game.phase())) === 0, 'IRAGANA (uda)');
  await walk(0, 1, 420);
  await T(120);
  s = await st();
  ok(s.zone === 'ibarra', 'irten: Ibarra, gaua', S(s));
  await T(10);
  ok((await flags()).includes('pro-atea') && (await ev(() => __game.PRO.can.dash)), 'pro-atea; BULTZADA libre');
  await ev(() => { if (__game.phase() !== 1) __game.switchPhase(); });
  await T(40);
  ok(await ev(() => __game.NPCS.filter((n) => n.g.visible).length === 0), 'gauez, herritarrak etxean');
  ok(await ev(() => __game.PRO.beams.length === 3 && __game.PRO.beams.every((b) => b.spot.visible)), 'Gauekoren hiru begirada kalean');
  await wait(900);
  if (await ev(() => __game.RING.on)) { await ev(() => __game.deiaAnswer(true)); await wait(100); await skipScenes(); }
  await shot('p03_kalea');

  /* 5 · begiradak: harrapatuta → atera; BULTZADAn → ez */
  const B0 = await ev(() => { const b = __game.PRO.beams[0]; return { x: b.x, z: b.z }; });
  await tp(B0.x, B0.z);
  await T(2);
  ok(await ev(() => __game.PRO.catchT > 0), 'begiradak harrapatu: IKUSI ZAITU');
  ok(!(await ev(() => document.getElementById('beamAlert').hidden)), 'alerta agerian');
  await T(230);
  const door = await ev(() => { const S = __game.HOUSE.home; return { x: S.x + S.fx * 1.6, z: S.z + S.fz * 1.6 }; });
  s = await st();
  ok(Math.hypot(s.x - door.x, s.z - door.z) < 1, 'atera itzulita', S(s));
  const dashSafe = await ev(() => { const g = __game, b = g.PRO.beams[1]; g.teleport(b.x + 2.5, b.z, 0); g.P.angle = -Math.PI / 2; g.dash(); let caught = false; for (let i = 0; i < 20; i++) { const bb = g.PRO.beams[1]; g.P.x = bb.x; g.P.z = bb.z; g.tick(1 / 120); caught = caught || g.PRO.catchT > 0; if (g.P.dashT <= 0) break; } return { caught, dashT: g.P.dashT }; });
  ok(!dashSafe.caught, 'BULTZADAn begiradak ez du ikusten', S(dashSafe));
  await T(240);
  await tp(2.4, 31.8, 0, -Math.PI / 2);
  await T(4);
  ok((await flags()).includes('pro-kalea'), 'plazara iritsita (pro-kalea)');
  await wait(200);
  await skipScenes();

  /* 6 · plaza: hiru itzal, bat urre-begiduna (iragana) */
  const foes = await ev(() => __game.ENEMIES.filter((e) => e.pro).map((e) => e.era));
  ok(foes.length === 3 && foes.filter((e) => e === 0).length === 1, 'hiru itzal (bat iraganekoa)', S(foes));
  ok(await ev(() => __game.PRO.can.lock), 'FINKATU libre');
  await shot('p04_plaza');
  await ev(() => { for (const e of __game.ENEMIES) if (e.pro) __game.killEnemy(e); });
  await T(30);
  ok((await flags()).includes('pro-plaza'), 'plaza garbituta');
  await wait(1300);
  ok(await ev(() => __game.FILM.on), 'egunsentiko zinema');
  await ev(() => { window.__hold = false; });
  await wait(2500);
  await shot('p05_egunsentia');
  await ev(() => { window.__hold = true; __game.filmSkip(); });
  await wait(200);
  ok(await ev(() => !!__game.cinematicState()), 'Irati plazan (aurrez aurre)');
  ok(await ev(() => __game.NPCS.find((n) => n.id === 'irati').g.visible), 'Iratiren oihartzuna agerian');
  await skipScenes();
  ok(await ev(() => __game.FILM.on), 'izenburua (LEIZEEN DEIA)');
  ok((await page.textContent('#filmTitleBig')) === 'LEIZEEN DEIA', 'izenburu-txartela');
  await ev(() => __game.filmSkip());
  await wait(200);
  const fl = await flags();
  ok(['intro', 'irati1', 'prologoa'].every((k) => fl.includes(k)), 'intro, irati1, prologoa');
  ok(await ev(() => !__game.PRO.on && __game.PRO.can.phase && __game.PRO.can.dash && __game.PRO.can.lock), 'hitzaurrea amaituta; tresna guztiak libre');
  ok(await ev(() => !document.body.classList.contains('pro-nophase')), 'botoiak berriro agerian');
  ok((await ev(() => __game.objective()[0])).includes('Pello'), 'hurrengo helburua: bikiak', await ev(() => __game.objective()[0]));
  await ev(() => { window.__hold = false; });
  await wait(1500);
  ok(await ev(() => __game.NPCS.filter((n) => n.g.visible).length >= 3), 'herritarrak kalera');

  /* leize baten lehen sarrera: kokapen-errotulua eta Iratiren deia (Gauekok zulatua) */
  await ev(() => { window.__calls = true; __game.enterZone('tartalo', __game.DGS.tartalo.entry, true); });
  for (let i = 0; i < 40 && !(await ev(() => __game.RING.on)); i++) await wait(150);
  ok(await ev(() => __game.RING.on), 'TARTALOREN KOBA: deia jotzen (lehen sarrera)');
  ok(/TARTALO/.test(await page.textContent('#locCap')), 'kokapen-errotulua', JSON.stringify(await page.textContent('#locCap')));
  await ev(() => __game.deiaAnswer(true));
  await wait(150);
  ok(await ev(() => !!__game.cinematicState() && document.getElementById('cinema').classList.contains('deia')), 'leizeko deia irekita');
  await skipScenes();
  ok((await flags()).includes('deia-tartalo'), 'deia behin bakarrik (deia-tartalo)');
  await ev(() => { window.__calls = false; __game.enterZone('ibarra', { x: 0, y: 0, z: 36 }, true); });
  await wait(300);

  /* menutik: DEITU · IRATI */
  await ev(() => __game.iratiCall());
  await wait(200);
  ok(await ev(() => !!__game.cinematicState() && document.getElementById('cinema').classList.contains('deia')), 'DEITU · IRATI (menutik)');
  await skipScenes();

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `HUTSAK: ${fails}` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
