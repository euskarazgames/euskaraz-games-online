// LEIZEEN DEIA: OROITZAPENAK eta azken atala (MURUMENDI, Mikelats) — bot-a, ?test kakoekin.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_anboto.js http://127.0.0.1:8091/games/leizeak.html [pantaila-argazkien-karpeta]
// 1 · zazpi oroitzapenak (plano guztiak benetako begiztan, azkar aurreratuta): banderak eta egunkaria.
// 2 · Akerbeltzen ondoren: plazan Atarrabi → Mariren suzko bola → MURUMENDI (gailurra) → MIKELATS:
//     I kazkabarra (zirkuluak lurrean; hiru zutarri → kapa erre → lurrera → jo), II itzal-armada (bi uhin,
//     UDAN zauritzen dira), III ekaitza (zazpi zutarriak → nekatuta → LO-KANTA) → amaiera eta epilogoa
//     (kaiko kanpaia izotzean) → haranean, Atarrabi ez dago plazan.
const { launch } = require('./_browser');
(async () => {
  const [url, shots] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  /* gordetako partida: zazpi leizeak amaituta, zazpigarren argia berde */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo', 'giroa', 'jentil', 'jentilatea', 'errolan', 'irati-errolan', 'ortzadarra', 'odei', 'irati-odei', 'sutondoa', 'etxea', 'kattalin', 'txomin', 'herensugea', 'irati-herensuge', 'inguma-ametsa', 'seaska', 'seaska-kanta', 'inguma', 'irati-inguma', 'harpeak');
    s.rhythms.push('esnatu', 'entzun', 'ortzi', 'eguzkilore', 'seaska');
    s.items.push('makilak', 'katea', 'adarra', 'sugarra', 'tximistarria', 'enara', 'ispilua');
    s.hearts = 7;
    s.tod = 0.4;
  });
  await ev((hd) => { __game.renderer.setPixelRatio(hd ? 1 : 0.25); __game.renderer.shadowMap.enabled = hd; }, !!shots);
  await ev(() => document.getElementById('play').click());
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skipScenes = () => ev(() => { const g = __game; for (let i = 0; i < 16 && g.cinematicState(); i++) g.endScene(); });
  /* zinema benetako begiztan, plano bakoitza berehala amaituta (on/tick guztiak exekutatzeko) */
  const playFilm = async (max = 40) => {
    let n = 0;
    await ev(() => { window.__hold = false; });
    for (let k = 0; k < 400 && (await ev(() => __game.FILM.on)); k++) {
      const i = await ev(() => { const F = __game.FILM; if (F.on && F.sh) { F.t = Math.max(F.t, F.sh.d + 0.01); F.vOn = true; F.vEnd = 0; } return F.i; });
      n = Math.max(n, i + 1);
      await page.waitForTimeout(60);
      if (n > max) break;
    }
    await ev(() => { window.__hold = true; });
    return n;
  };
  const shot = async (name) => { if (!shots) return; await ev(() => { for (let i = 0; i < 2; i++) __game.draw(); }); await page.screenshot({ path: `${shots}/${name}.png` }); };
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);

  /* ---------------- 1 · oroitzapenak ---------------- */
  for (let i = 0; i < 7; i++) {
    const started = await ev((i) => __game.oroitPlay(i), i);
    ok(started, 'oroitzapena ' + (i + 1) + ' hasi da');
    ok(await ev(() => document.body.classList.contains('oroit')), '  sepia (body.oroit)');
    const n = await playFilm();
    ok(n >= 3, '  planoak: ' + n);
    ok(await flag('oroit-' + (i + 1)), '  bandera oroit-' + (i + 1));
    ok(!(await ev(() => document.body.classList.contains('oroit'))), '  sepia kenduta');
  }
  const log = await ev(() => __game.oroitLog());
  ok(/OROITZAPENAK · 7 \/ 7/.test(log) && /ANAIAK/.test(log), 'egunkarian zazpi oroitzapen');
  /* Iturralden: oroigarrien apala → GOGORATU (eszena haranean, gero etxera itzuli) */
  await ev(() => { const g = __game; g.homeEnter(); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  ok(await ev(() => __game.ZONE.cur === 'etxea'), 'Iturralden');
  await ev(() => __game.homeMementos());
  const labels = await ev(() => [...document.querySelectorAll('#choices button')].map((b) => b.textContent));
  ok(labels.filter((t) => /GOGORATU/.test(t)).length === 7, 'apalean: zazpi GOGORATU', labels.join(' | '));
  await ev(() => [...document.querySelectorAll('#choices button')].find((b) => /GOGORATU · III/.test(b.textContent)).click());
  await page.waitForTimeout(100);
  ok(await ev(() => __game.FILM.on && __game.ZONE.cur === 'ibarra'), 'oroitzapena berriro (haranean)');
  await playFilm();
  ok(await ev(() => __game.ZONE.cur === 'etxea' && !__game.FILM.on), 'etxera itzulita');
  await ev(() => { const g = __game; g.teleport(g.DGE.exitArch.x, g.DGE.exitArch.z + 3.6, 0); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  ok(await ev(() => __game.ZONE.cur === 'ibarra'), 'kanpora (haranera)');

  /* ---------------- 2 · plazan Atarrabi → Murumendira ---------------- */
  let obj = await ev(() => __game.objective());
  ok(/Murumendira/.test(obj[0]), 'helburua: Murumendira', obj[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.4, N.z + 1.2, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); });
  ok(!!(await ev(() => __game.cinematicState())), 'Atarrabiren eszena (suzko bola)');
  await skipScenes();
  ok(await ev(() => __game.FILM.on), 'hegaldiaren zinema');
  await playFilm();
  await T(4);
  ok(await ev(() => __game.ZONE.cur === 'anboto'), 'MURUMENDI zona', await ev(() => __game.ZONE.cur));
  /* (playFilm-ek iritsierako zinema ere jotzen du: Mikelats eta amona kaiolan) */
  await playFilm();
  await T(10);
  let mk = await ev(() => ({ stage: __game.AN.stage, on: __game.MK.on, phase: __game.MK.phase, state: __game.MK.state, kind: __game.BOSS.kind, boss: __game.BOSS.on }));
  ok(mk.stage === 'fight' && mk.on && mk.phase === 1 && mk.state === 'hover' && mk.kind === 'mikelats' && mk.boss, 'MIKELATS: borroka hasita (I)', JSON.stringify(mk));
  obj = await ev(() => __game.objective());
  ok(/zutarriak/.test(obj[0]), 'helburua: zutarriak', obj[0]);
  await shot('murumendi_gailurra');
  const st = await ev(() => { const g = __game; return { y: g.P.y, gr: g.P.grounded, z: g.P.z }; });
  ok(st.gr && Math.abs(st.y) < 0.3, 'gailurrean zutik', JSON.stringify(st));

  /* ---------------- 3 · I: kazkabarra eta zutarriak ---------------- */
  const hail = await ev(() => {
    const g = __game, hp0 = g.P.hp;
    g.MK.atkCd = 0;
    g.tick(1 / 120);
    const n = g.MK.marks.length;
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    return { n, hp0, hp: g.P.hp, left: g.MK.marks.length };
  });
  ok(hail.n >= 1 && hail.left === 0, 'erasoa: zirkuluak lurrean, gero kolpea', JSON.stringify(hail));
  ok(hail.hp < hail.hp0, 'zirkuluaren barruan: zauritua', JSON.stringify(hail));
  ok(await ev(() => !__game.BOSS.vulnerable()), 'kapak babesten du (ez da zauritzen)');
  await ev(() => { const g = __game; g.P.hp = g.P.maxHp; for (const S of g.AN.stones.slice(0, 3)) S.rune.hit(); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  mk = await ev(() => ({ lit: __game.AN.lit, state: __game.MK.state, vul: __game.BOSS.vulnerable() }));
  ok(mk.lit === 3 && mk.state === 'down' && mk.vul, 'hiru zutarri → kapa erre, lurrera', JSON.stringify(mk));
  await ev(() => { const g = __game; for (let n = 0; n < 3; n++) g.BOSS.hit(1); });
  await playFilm();
  await T(20);
  /* ---------------- 4 · II: itzal-armada (UDAN zauritzen dira) ---------------- */
  mk = await ev(() => ({ phase: __game.MK.phase, state: __game.MK.state, en: __game.ENEMIES.filter((e) => e.mk && e.state !== 'dead').length, era: __game.ENEMIES.filter((e) => e.mk).map((e) => e.era) }));
  ok(mk.phase === 2 && mk.state === 'summon' && mk.en === 3 && mk.era.every((x) => x === 0), 'II: lehen uhina (hiru itzal, UDAKOAK)', JSON.stringify(mk));
  const wave = async () => ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.mk && e.state !== 'dead') g.killEnemy(e); for (let i = 0; i < 240; i++) g.tick(1 / 120); return { en: g.ENEMIES.filter((e) => e.mk && e.state !== 'dead').length, waves: g.MK.waves, state: g.MK.state }; });
  let w = await wave();
  ok(w.waves === 2 && w.en === 4, 'bigarren uhina (lau itzal)', JSON.stringify(w));
  w = await wave();
  ok(w.state === 'down', 'armada desegin → lurrera', JSON.stringify(w));
  await ev(() => { const g = __game; for (let n = 0; n < 3; n++) g.BOSS.hit(1); });
  await playFilm();
  await T(20);
  /* ---------------- 5 · III: ekaitza → nekatuta → LO-KANTA ---------------- */
  mk = await ev(() => ({ phase: __game.MK.phase, state: __game.MK.state }));
  ok(mk.phase === 3 && mk.state === 'hover', 'III: ekaitza', JSON.stringify(mk));
  await ev(() => { const g = __game; for (const S of g.AN.stones) if (!S.lit) S.rune.hit(); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  mk = await ev(() => ({ lit: __game.AN.lit, state: __game.MK.state, obj: __game.objective()[0] }));
  ok(mk.lit === 7 && mk.state === 'tired' && /LO-KANTA/.test(mk.obj), 'zazpi zutarriak → nekatuta (LO-KANTA)', JSON.stringify(mk));
  await shot('murumendi_nekatuta');
  await ev(() => { const g = __game; g.txalaOpen(); });
  for (const s of ['L', 'R', 'L', 'R', 'L']) { await ev((s) => { __game.txalaHit(s); for (let i = 0; i < 14; i++) __game.tick(1 / 120); }, s); }
  await ev(() => { window.__hold = false; });
  await page.waitForTimeout(1400);
  await ev(() => { window.__hold = true; });
  mk = await ev(() => ({ state: __game.MK.state, dead: __game.BOSS.dead, stage: __game.AN.stage, film: __game.FILM.on }));
  ok(mk.state === 'sleep' && mk.dead && mk.stage === 'end', 'LO-KANTA: Mikelats lo; amaiera', JSON.stringify(mk));
  /* ---------------- 6 · amaiera eta epilogoa ---------------- */
  const nShots = await playFilm(30);
  ok(nShots >= 12, 'amaierako zinema (planoak: ' + nShots + ')');
  await T(10);
  ok(await flag('anboto'), 'bandera: anboto');
  ok(await ev(() => __game.ZONE.cur === 'ibarra'), 'haranean berriro');
  await T(10);
  ok(await ev(() => { const N = __game.NPCS.find((n) => n.id === 'irati'); return !N.g.visible; }), 'Atarrabi Mariren ondoan geratu da (plazan ez)');
  obj = await ev(() => __game.objective());
  ok(/Harana zurea/.test(obj[0]), 'helburua: harana zurea', obj[0]);
  await shot('epilogoa');

  if (errs.length) { console.log('ERROREAK:\n' + errs.slice(0, 8).join('\n')); fails += errs.length; } else console.log('ERRORERIK EZ');
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
