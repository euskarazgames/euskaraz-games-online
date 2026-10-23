// LEIZEEN DEIA: zazpigarren atala, AMETSA eta INGUMA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_ametsa.js http://127.0.0.1:8091/games/leizeak.html [pantaila-argazkien-karpeta]
// Herensugearen ondoren: etxean lo → lehen amets gaiztoa → Irati (SEASKA-KANTA) → hiru bertso (Kattalin, Txomin,
// jentil zaharra gauez) → SEASKA eta IZAR-HAUTSA → AMETSERA → izar-plataformak hutsunean → izar-eskailerak
// (giltza) → ENTZUN (ezkutuko harriak) → mamuen sukaldea → ate-zainak → dei faltsua eta amets-gaiztoa →
// SEASKA sehaskan (giltza nagusia) → INGUMA (izarrak itzuli, murgiltzea, hautsa; hiru Inguma eta ENTZUN;
// ohean eserita, SEASKA eta kalte bikoitza) → esnatu → zazpigarren argia berde.
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
  /* gordetako partida: sei leize amaituta, Iratiren seigarren eszena ikusita */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo', 'jentil', 'jentilatea', 'errolan', 'irati-errolan', 'ortzadarra', 'odei', 'irati-odei', 'sutondoa', 'etxea', 'kattalin', 'txomin', 'herensugea', 'irati-herensuge');
    s.rhythms.push('esnatu', 'entzun', 'ortzi', 'eguzkilore');
    s.items.push('makilak', 'katea', 'giltzanagusia', 'adarra', 'orrazia', 'giltzanagusia-lamia', 'sugarra', 'giltzanagusia-tartalo', 'tximistarria', 'giltzanagusia-jentil', 'enara', 'giltzanagusia-zerua', 'ispilua', 'giltzanagusia-herensuge');
    s.hearts = 6;
    s.tod = 0.4;
  });
  await ev((hd) => { __game.renderer.setPixelRatio(hd ? 1 : 0.25); __game.renderer.shadowMap.enabled = hd; }, !!shots);
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  /* laguntzaileak */
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 6; k++) { if (g.FILM.on) g.filmSkip(); for (let i = 0; i < 12 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } if (g.RING.on) g.deiaAnswer(true); } });
  const tp = (x, y, z) => ev(([x, y, z]) => { const g = __game; g.teleport(x, z, y); for (let i = 0; i < 6; i++) g.tick(1 / 120); }, [x, y, z]);
  const walk = (dx, dz, secs) => ev(([dx, dz, secs]) => {
    const g = __game, n = Math.hypot(dx, dz) || 1;
    dx /= n; dz /= n;
    g.input.x = 0.83 * dx - 0.557 * dz;
    g.input.z = 0.557 * dx + 0.83 * dz;
    for (let i = 0; i < Math.round(secs * 120); i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 12; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, gr: g.P.grounded };
  }, [dx, dz, secs]);
  const face = (a) => ev((a) => { const g = __game; g.P.angle = a; g.hero.rotation.y = a; }, a);
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const doorOpen = (k) => ev((k) => __game.saved.doors.includes(k), k);
  const AE = (x) => 2700 + x;
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a ? a.kind + ':' + a.label : null; }); await T(30); await skip(); await T(10); return a; };
  const killAll = () => ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
  const talk = async (id) => { await ev((id) => { const g = __game, N = g.NPCS.find((n) => n.id === id); g.teleport(N.x + 1.4, N.z + 1.2, N.y || 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); }, id); await T(4); };
  /* txalaparta-deia: entzun eta errepikatu (txalaLearn) */
  const answerCall = () => ev(() => {
    const g = __game;
    for (let i = 0; i < 2400 && !(g.TXALA.call && g.TXALA.call.phase === 'answer'); i++) g.tick(1 / 120);
    const seq = g.TXALA.call ? g.TXALA.call.seq.slice() : [];
    for (const s of seq) { g.txalaHit(s); for (let i = 0; i < 20; i++) g.tick(1 / 120); }
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    return seq.join('');
  });
  const shot = async (n) => { if (!shots) return; await ev(() => { for (let i = 0; i < 2; i++) __game.draw(); }); await page.screenshot({ path: `${shots}/${n}.png` }); };
  /* hautsa bota (aurrera, angelu batean) eta hegaldia amaitu arte itxaron */
  const dust = async (a) => { if (a !== undefined) await face(a); await ev(() => { __game.HAUTS.cd = 0; __game.dustThrow(); }); await T(70); };
  const N_ = Math.PI;

  /* ---------------- 1 · lehen amets gaiztoa (etxean lo) ---------------- */
  let obj = await ev(() => __game.objective());
  ok(/lo egin/.test(obj[0]), 'helburua: Iturralden lo egin', obj[0]);
  await ev(() => { const g = __game; g.homeEnter(); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  await skip();
  await ev(() => { const g = __game; g.teleport(g.DGE.bed.x + 1.6, g.DGE.bed.z, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  obj = await ev(() => __game.objective());
  ok(/Ohean lo egin/.test(obj[0]), 'etxean: helburua ohea', obj[0]);
  let a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  await page.click('#choices button:first-child');
  await T(10);
  const nightmare = await ev(() => !!__game.cinematicState());
  await skip();
  ok(/OHEA/.test(a || '') && nightmare && (await flag('inguma-ametsa')), 'ohea → lehen amets gaiztoa (Inguma)', S({ a, nightmare }));
  await ev(() => { const g = __game; g.enterZone('ibarra', { x: 0, y: 0, z: 44, a: Math.PI }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  await skip();

  /* ---------------- 2 · Irati: seaska-kanta (hiru bertso) ---------------- */
  await talk('irati');
  const v1 = await ev(() => { const c = __game.cinematicState(); return c ? c.n : -1; });
  await skip();
  ok(await flag('seaska'), 'Irati: SEASKA-KANTA (hiru bertso bilatu)', S({ v1 }));
  obj = await ev(() => __game.objective());
  ok(/bertsoak \(0\/3\): Kattalin/.test(obj[0]), 'helburua: bertsoak 0/3 (Kattalin)', obj[0]);
  await talk('kattalin');
  await skip();
  ok(await flag('bertso-belar'), 'Kattalin: LURREAN BELARRAK');
  await talk('txomin');
  await skip();
  ok(await flag('bertso-hare'), 'Txomin: ITSASOAN HAREAK');
  /* jentil zaharra: egunez ez (izarrik gabe) */
  /* (DAY.k orduaren arabera kalkulatzen da: ordua aldatu) */
  const setTod = (t) => ev((t) => { const g = __game; g.saved.tod = t; g.DAY.freeze = false; for (let i = 0; i < 4; i++) g.tick(1 / 120); g.DAY.freeze = true; return +g.DAY.k.toFixed(2); }, t);
  await setTod(0.4);
  await talk('jentil');
  await skip();
  ok(!(await flag('bertso-izar')), 'jentil zaharra egunez: "gauez etorri"');
  const kN = await setTod(0.95);
  await talk('jentil');
  await skip();
  ok(await flag('bertso-izar'), 'jentil zaharra gauez: ZERUAN IZARRAK', S({ kN }));
  ok((await ev(() => __game.bertsoCount())) === 3, 'hiru bertsoak');
  await setTod(0.4);
  /* Irati: SEASKA erritmoa → hauts-zorroa → abisua */
  await talk('irati');
  await ev(() => { const g = __game; for (let i = 0; i < 12 && g.cinematicState(); i++) g.endScene(); });
  const seq = await answerCall();
  await skip();
  await T(30);
  await skip();
  await T(30);
  await skip();
  let st = await ev(() => ({ r: __game.saved.rhythms.includes('seaska'), dust: __game.saved.items.includes('hautsa'), kanta: __game.saved.flags.includes('seaska-kanta') }));
  ok(seq === 'LRLRL' && st.r && st.dust && st.kanta, 'SEASKA ikasita (◀ ▶ ◀ ▶ ◀), IZAR-HAUTSA eta Iratiren abisua', S({ seq, st }));
  /* SEASKA ametsetik kanpo: inguruko itzalak lokartu */
  st = await ev(() => {
    const g = __game;
    g.teleport(10, 30, 0);
    const e = g.spawnEnemy('grunt', 1, 14, 30, 0);
    for (let i = 0; i < 160; i++) g.tick(1 / 120);
    g.rhythmEffect('seaska');
    const stun = +e.stun.toFixed(2);
    g.killEnemy(e);
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    return { stun };
  });
  ok(st.stun >= 3, 'SEASKA: itzalak lokartzen dira', S(st));
  /* IZAR-HAUTSA: etsaia KONTATZEN */
  st = await ev(() => {
    const g = __game;
    g.teleport(10, 30, 0);
    g.P.angle = 0;
    const e = g.spawnEnemy('grunt', 1, 10, 34, 0);
    for (let i = 0; i < 160; i++) g.tick(1 / 120);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    const r = { counting: +(e.counting || 0).toFixed(2), n: e.countN || 0, stun: +e.stun.toFixed(2) };
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    r.n2 = e.countN || 0;
    g.killEnemy(e);
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    return r;
  });
  ok(st.counting > 2 && st.stun > 0 && st.n2 > st.n, 'IZAR-HAUTSA: etsaia kontatzen (geldi, zenbakiak)', S(st));

  /* ---------------- 3 · AMETSERA ---------------- */
  await ev(() => { const g = __game; g.homeEnter(); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  await skip();
  await ev(() => { const g = __game; g.teleport(g.DGE.bed.x + 1.6, g.DGE.bed.z, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); });
  obj = await ev(() => __game.objective());
  ok(/AMETSERA/.test(obj[0]), 'etxean: helburua AMETSERA', obj[0]);
  a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a && a.label; });
  const choice = await ev(() => document.querySelector('#choices button') && document.querySelector('#choices button').textContent);
  await page.click('#choices button:first-child');
  await page.waitForTimeout(150);
  await T(10);
  const filmOn = await ev(() => __game.FILM.on);
  await shot('ametsa-0-ohea');
  await skip();
  await T(60);
  st = await ev(() => { const g = __game; return { zone: g.ZONE.cur, x: +g.P.x.toFixed(1), z: +g.P.z.toFixed(1), night: g.DAY.k, flag: g.saved.flags.includes('ametsa') }; });
  ok(choice === 'AMETSERA' && filmOn && st.zone === 'ametsa' && Math.abs(st.x - AE(0)) < 1 && st.flag, 'ohea → AMETSERA (zinema) → ametsa', S({ choice, filmOn, st }));
  st = await ev(() => { const g = __game, c = g.scene.fog.color; return { k: g.DAY.k, fog: [c.r, c.g, c.b].map((v) => +v.toFixed(3)), sea: g.ZONES.ametsa.sky }; });
  ok(st.k === 1 && st.fog[2] > st.fog[1], 'ametsaren itxura: beti gaua, laino morea', S(st));
  await shot('ametsa-1-ohe-uhartea');

  /* ---------------- 4 · M1 → M2: izar-plataformak hutsunean ---------------- */
  await tp(AE(0), 0, -10.6);
  await T(20);
  const ctx = await ev(() => { __game.ctxUpdate && __game.ctxUpdate(); return __game.dustUseful(); });
  ok(ctx, 'IZARRAK botoia: izar-lainoaren ertzean');
  let p;
  for (let k = 0; k < 4; k++) {
    await dust(N_);
    p = await walk(0, -1, 0.3);
  }
  p = await walk(0, -1, 1.2);
  const plats = await ev(() => __game.HAUTS.plats.length);
  ok(p.z < -22.5 && p.y > -0.5 && p.room === 'M2', 'izar-plataformak: hutsunea zeharkatuta (M2)', S({ p, plats }));
  await shot('ametsa-2-izar-plataformak');
  /* izar-eskailerak: jauzia, eta airean hautsa oinen azpian */
  await tp(AE(4.5), 0, -35.5);
  st = await ev(() => {
    const g = __game, ys = [];
    for (let step = 0; step < 6 && g.P.y < 8.5; step++) {
      g.jump();
      for (let i = 0; i < 24; i++) g.tick(1 / 120);
      g.jump();
      for (let i = 0; i < 300 && g.P.vy > 0; i++) g.tick(1 / 120);
      g.HAUTS.cd = 0;
      g.dustThrow();
      for (let i = 0; i < 200 && !g.P.grounded; i++) g.tick(1 / 120);
      ys.push(+g.P.y.toFixed(2));
    }
    return { ys, y: +g.P.y.toFixed(2) };
  });
  ok(st.y > 8.3, 'izar-eskailerak: uharte garaira igota', S(st));
  await tp(AE(6.8), 9, -37.6);
  await face(N_);
  a = await open();
  ok(/IREKI/.test(a || '') && (await ev(() => __game.saved.keyz.ametsa > 0)), 'giltza txikia (goiko uhartetxoa)', a);
  /* ENTZUN: ezkutuko harriak → arnasa-zatia */
  await tp(AE(-8), 0, -32);
  await ev(() => __game.rhythmEffect('entzun'));
  await T(30);
  st = await ev(() => __game.platforms.filter((s) => s.hidden && s.revealed).length);
  ok(st >= 3, 'ENTZUN: ezkutuko harriak agerian', st);
  await tp(AE(-25), 2.2, -35.4);
  await face(N_);
  a = await open();
  ok(/IREKI/.test(a || '') && (await ev(() => __game.saved.pieces.includes('ametsa'))), 'arnasa-zatia (mendebaldeko uhartetxoa)', a);
  /* giltza txikiko atea */
  await tp(AE(0), 0, -42.5);
  await face(N_);
  a = await open();
  await T(120);
  ok(await doorOpen('aB-n'), 'giltza txikiko atea irekita', a);

  /* ---------------- 5 · M3: mamuen sukaldea ---------------- */
  await tp(AE(0), 0, -54);
  p = await walk(0, -1, 0.6);
  await T(120);
  st = await ev(() => { const g = __game; return { fight: g.state().fight, n: g.ENEMIES.filter((e) => e.state !== 'dead').length, types: [...new Set(g.ENEMIES.map((e) => e.type))] }; });
  ok(st.fight === 'M3' && st.types.includes('mamua'), 'mamuen sukaldea: borroka (mamuak)', S(st));
  /* mamua kontatzen (hautsa) */
  st = await ev(() => {
    const g = __game, e = g.ENEMIES.find((e) => e.type === 'mamua' && e.state !== 'dead' && e.state !== 'spawn') || g.ENEMIES.find((e) => e.type === 'mamua');
    if (!e) return { counting: -1 };
    for (let i = 0; i < 200 && e.state === 'spawn'; i++) g.tick(1 / 120);
    g.teleport(e.x, e.z + 3, 0);
    g.P.angle = Math.atan2(e.x - g.P.x, e.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 70; i++) g.tick(1 / 120);
    return { counting: +(e.counting || 0).toFixed(2) };
  });
  ok(st.counting > 1, 'mamua kontatzen (IZAR-HAUTSA)', S(st));
  for (let k = 0; k < 8 && (await ev(() => !!__game.ROOM.fight)); k++) { await killAll(); await T(360); }
  await skip();
  ok(await cleared('M3'), 'mamuen sukaldea garbituta');
  await T(240);
  ok(await doorOpen('aC-n'), 'iparreko barrak irekita');

  /* ---------------- 6 · M4: ate-zainak eta izar-lainoa ---------------- */
  await tp(AE(0), 0, -76.5);
  p = await walk(0, -1, 0.6);
  ok(p.z > -79.8, 'lehen ate-zaina: pasabidea itxita', S(p));
  await dust(N_);
  st = await ev(() => __game.DUST_GATES.map((G) => +G.t.toFixed(1)));
  await T(60);
  p = await walk(0, -1, 0.42);
  ok(st[0] > 5 && p.z < -82 && p.z > -84 && p.y > -0.3, 'ate-zainak kontatzen → pasa', S({ st, p }));
  for (let k = 0; k < 4; k++) {
    await dust(N_);
    p = await walk(0, -1, 0.3);
  }
  p = await walk(0, -1, 0.8);
  ok(p.z < -92.5 && p.y > -0.5, 'izar-lainoa: bigarren zubira', S(p));
  await tp(AE(0), 0, -94.5);
  await dust(N_);
  p = await walk(0, -1, 1.6);
  ok(p.z < -100, 'bigarren ate-zaina: pasa', S(p));
  await shot('ametsa-3-ate-zainak');

  /* ---------------- 7 · M5: dei faltsua, amets-gaiztoa, SEASKA sehaskan ---------------- */
  await tp(AE(0), 0, -106);
  await T(60);
  const ring = await ev(() => __game.RING.on);
  await ev(() => __game.deiaAnswer(true));
  await T(10);
  const callWho = await ev(() => { const c = __game.cinematicState(); return c ? document.getElementById('cineName') && document.getElementById('cineName').textContent : null; });
  await skip();
  ok(ring && (await flag('ametsa-deia')), 'dei faltsua ("Irati"?) erantzunda', S({ ring, callWho }));
  await tp(AE(0), 0, -113);
  await T(120);
  await skip();
  st = await ev(() => { const g = __game; return { mini: !!g.MINI.e, type: g.MINI.e && g.MINI.e.type }; });
  ok(st.mini && st.type === 'mamua', 'AMETS-GAIZTOA (mamu erraldoia)', S(st));
  for (let k = 0; k < 8 && (await ev(() => !!__game.MINI.e || !!__game.ROOM.fight)); k++) { await ev(() => { const g = __game; if (g.MINI.e) g.MINI.e.hp = 0, g.killEnemy(g.MINI.e); }); await killAll(); await T(120); await page.waitForTimeout(1100); await T(120); await skip(); }
  ok(await cleared('aE-mini'), 'amets-gaiztoa garaituta');
  await tp(AE(4), 0, -112);
  await ev(() => __game.rhythmEffect('seaska'));
  await T(240);
  ok(await cleared('aD-seaska'), 'SEASKA sehaskaren ondoan: sehaska geldi');
  st = await ev(() => { const C = __game.DGA.bigChest; return { x: C.x, z: C.z, vis: C.m.visible }; });
  await tp(st.x + 1.3, 0, st.z + 1.3);
  await face(Math.atan2(-1.3, -1.3));
  a = await open();
  ok(/IREKI/.test(a || '') && (await ev(() => __game.saved.items.includes('giltzanagusia-ametsa'))), 'giltza nagusia (sehaskaren ondoan)', S({ a, st }));
  await tp(AE(0), 0, -123.5);
  await face(N_);
  a = await open();
  await T(160);
  ok(await doorOpen('aE-n'), 'ate handia irekita', a);

  /* ---------------- 8 · INGUMA ---------------- */
  await tp(AE(0), 0, -140);
  await T(60);
  const intro = await ev(() => !!__game.cinematicState());
  await shot('ametsa-4-inguma-sarrera');
  await skip();
  await T(10);
  st = await ev(() => { const g = __game; return { on: g.BOSS.on, kind: g.BOSS.kind, state: g.ING.state, phase: g.ING.phase }; });
  ok(intro && st.on && st.kind === 'inguma' && st.state === 'float', 'INGUMA: sarrera eta borroka', S(st));
  /* 1. fasea: izar-euria */
  st = await ev(() => { const g = __game; let n = 0; for (let i = 0; i < 400 && !n; i++) { g.tick(1 / 120); n = g.SHOTS.filter((s) => s.star).length; } return { n, y: +g.ING.y.toFixed(1) }; });
  ok(st.n >= 3 && st.y > 5, 'izar-euria (hiru izar, goitik)', S(st));
  /* izarra itzuli (EZKUTUA) → zorabiatuta */
  st = await ev(() => {
    const g = __game;
    g.P.hp = g.P.maxHp;
    g.ATK.hold = true;
    for (let i = 0; i < 160 && !(g.MAG.charging && g.MAG.charge > 0.3); i++) g.tick(1 / 120);
    const s = g.SHOTS.find((s) => s.star && !s.back);
    if (!s) { g.ATK.hold = false; return { none: true }; }
    s.x = g.P.x + Math.sin(g.P.angle) * 1.0; s.z = g.P.z + Math.cos(g.P.angle) * 1.0; s.y = g.P.y + 1.1; s.t = 1;
    for (let i = 0; i < 3; i++) g.tick(1 / 120);
    const back = !!s.back, charging = g.MAG.charging;
    g.ATK.hold = false;
    let state = g.ING.state;
    for (let i = 0; i < 360 && state !== 'stagger'; i++) { g.tick(1 / 120); state = g.ING.state; g.P.hp = g.P.maxHp; }
    return { back, charging, state };
  });
  ok(st.back && st.state === 'stagger', 'EZKUTUA: izarra itzuli → Inguma zorabiatuta', S(st));
  /* zorabiatuta, behera → hautsa → KONTATZEN */
  st = await ev(() => {
    const g = __game, I = g.ING;
    for (let i = 0; i < 160; i++) { g.tick(1 / 120); g.P.hp = g.P.maxHp; }
    g.teleport(I.x, I.z + 4, 0);
    for (let i = 0; i < 4; i++) g.tick(1 / 120);
    g.P.angle = Math.atan2(I.x - g.P.x, I.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    return { state: I.state, y: +I.y.toFixed(1), vul: g.BOSS.vulnerable() };
  });
  ok(st.state === 'count' && st.vul, 'IZAR-HAUTSA: Inguma kontatzen (zaurgarri)', S(st));
  st = await ev(() => { const g = __game, I = g.ING, hp0 = I.hp; g.BOSS.hit(3); g.BOSS.hit(3); g.BOSS.hit(3); return { hp0, hp: I.hp, phase: I.phase }; });
  ok(st.hp < st.hp0, 'kontatzen ari dela: kolpeak', S(st));
  /* murgiltzea: itzala, behera, nekatuta */
  st = await ev(() => {
    const g = __game, I = g.ING, seen = new Set();
    for (let i = 0; i < 2400 && I.state !== 'tired'; i++) { g.tick(1 / 120); seen.add(I.state); g.P.hp = g.P.maxHp; }
    return { seen: [...seen], state: I.state, y: +I.y.toFixed(1) };
  });
  ok(st.seen.includes('diveWind') && st.seen.includes('dive') && st.state === 'tired', 'murgiltzea (itzala) → nekatuta behean', S(st));
  st = await ev(() => {
    const g = __game, I = g.ING;
    g.teleport(I.x, I.z + 4, 0);
    g.P.angle = Math.atan2(I.x - g.P.x, I.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    const s0 = I.state;
    for (let k = 0; k < 6 && I.phase === 1; k++) g.BOSS.hit(3);
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    return { s0, phase: I.phase, state: I.state, fakes: g.ING.fakes.filter((F) => F.g.visible).length, grass: I.grass.length };
  });
  ok(st.s0 === 'count' && st.phase === 2 && st.state === 'float2' && st.fakes === 2 && st.grass >= 6, '2. fasea: hiru Inguma eta amets-belarrak', S(st));
  await shot('ametsa-5-hiru-inguma');
  /* fijazioak ez du benetakoa salatzen; ENTZUN → bai */
  st = await ev(() => {
    const g = __game;
    const before = g.BOSS.noLock();
    g.rhythmEffect('entzun');
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    return { before, after: g.BOSS.noLock(), reveal: g.ING.reveal };
  });
  ok(st.before && !st.after && st.reveal > 0.5, 'ENTZUN: benetako Inguma agerian (fijazioa posible)', S(st));
  /* faltsua: hautsa → mamu */
  st = await ev(() => {
    const g = __game, F = g.ING.fakes.find((F) => F.g.visible);
    const n0 = g.ENEMIES.filter((e) => e.state !== 'dead' && e.type === 'mamua').length;
    g.teleport(F.x, F.z + 3.5, 0);
    g.P.angle = Math.atan2(F.x - g.P.x, F.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    return { alive: F.alive, mamuak: g.ENEMIES.filter((e) => e.state !== 'dead' && e.type === 'mamua').length - n0 };
  });
  ok(!st.alive && st.mamuak >= 1, 'Inguma faltsua: hautsarekin mamu bihurtu', S(st));
  await killAll();
  /* amets-belarrak: ORAINEAN mina, IRAGANEAN ez */
  st = await ev(() => {
    const g = __game, G = g.ING.grass[0];
    /* aurreko kolpearen ukiezintasuna igaro arte (belarretatik urrun) */
    g.teleport(g.ING.bed.x, g.ING.bed.z + 4, 0);
    for (let i = 0; i < 150; i++) { g.tick(1 / 120); g.P.hp = g.P.maxHp; }
    for (const s of g.SHOTS.slice()) s.t = 99;
    const hp0 = g.P.hp;
    g.teleport(G.x, G.z, 0);
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    return { era: g.phase(), hurt: hp0 - g.P.hp };
  });
  ok(st.era === 1 && st.hurt >= 1, 'amets-belarrak: ORAINEAN mina', S(st));
  await ev(() => { __game.P.hp = __game.P.maxHp; });
  /* benetakoa: hautsa → kontatzen → 3. fasea */
  st = await ev(() => {
    const g = __game, I = g.ING;
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    g.P.hp = g.P.maxHp;
    g.teleport(I.x + 0.5, I.z + 3.5, 0);
    for (let i = 0; i < 4; i++) g.tick(1 / 120);
    g.P.angle = Math.atan2(I.x - g.P.x, I.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    const s0 = I.state;
    for (let k = 0; k < 6 && I.phase === 2; k++) g.BOSS.hit(3);
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    return { s0, phase: I.phase, state: I.state, scale: +I.scale.toFixed(2), grass: I.grass.length };
  });
  ok(st.s0 === 'count' && st.phase === 3 && st.state === 'sit' && st.grass === 0, '3. fasea: ohean eserita (amesgaiztoa)', S(st));
  /* hare-haizea eta amesgaiztoaren neurgailua */
  st = await ev(() => {
    const g = __game, I = g.ING;
    g.teleport(I.bed.x + 3, I.bed.z + 4, 0);
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    return { wx: +g.P.wx.toFixed(2), wz: +g.P.wz.toFixed(2), crush: +I.crush.toFixed(2), vig: document.getElementById('vignette').style.boxShadow.length > 0 };
  });
  ok(Math.hypot(st.wx, st.wz) > 0.5 && st.crush > 0.1 && st.vig, 'hare-haizea (bultzaka) eta binjeta morea', S(st));
  await shot('ametsa-6-ohean');
  /* SEASKA → lokartu → hautsa → kalte bikoitza */
  st = await ev(() => {
    const g = __game, I = g.ING;
    g.rhythmEffect('seaska');
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    const lull = I.state;
    g.teleport(I.x, I.z + 3.5, 0);
    g.P.angle = Math.atan2(I.x - g.P.x, I.z - g.P.z);
    g.HAUTS.cd = 0;
    g.dustThrow();
    for (let i = 0; i < 80; i++) g.tick(1 / 120);
    const count = I.state, hp0 = I.hp;
    g.BOSS.hit(1);
    return { lull, count, dmg: hp0 - I.hp, wind: Math.hypot(g.P.wx, g.P.wz) };
  });
  ok(st.lull === 'lull' && st.count === 'count' && st.dmg === 2 && st.wind === 0, 'SEASKA: lokartuta → hautsa → kalte bikoitza', S(st));
  /* azken kolpeak → garaituta */
  await ev(() => { const g = __game; for (let k = 0; k < 10 && !g.BOSS.dead; k++) g.BOSS.hit(3); });
  await T(30);
  const defeated = await ev(() => __game.BOSS.dead && __game.saved.flags.includes('inguma'));
  await shot('ametsa-7-inguma-garaituta');
  await skip();
  await T(60);
  await skip();
  await T(60);
  await skip();
  await T(60);
  st = await ev(() => { const g = __game; return { zone: g.ZONE.cur, hearts: g.saved.hearts, boss: g.BOSS.on, tod: +g.saved.tod.toFixed(2) }; });
  ok(defeated && st.zone === 'etxea' && st.hearts >= 7 && !st.boss, 'Inguma garaituta → esnatu (Iturralde, egunsentia)', S(st));
  obj = await ev(() => __game.objective());
  ok(/kanpora/.test(obj[0]), 'helburua: kanpora irten', obj[0]);

  /* ---------------- 9 · zazpigarren argia ---------------- */
  await ev(() => { const g = __game; g.enterZone('ibarra', { x: 28, y: 0, z: 34, a: 0 }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  await page.waitForTimeout(1700);
  await T(10);
  const fin = await ev(() => !!__game.cinematicState());
  const turn = await ev(() => __game.ZAZPI.turnTo);
  await skip();
  ok(fin && turn === 7 && (await flag('irati-inguma')), 'Anboto: zazpigarren argia berde, Gaueko eta Irati (amaiera)', S({ fin, turn }));
  /* oroitzapena */
  ok(await ev(() => __game.DGE.mementos ? __game.DGE.mementos.filter((m) => m.kind === 'zorroa').length === 1 : true), 'oroitzapena: amonaren hauts-zorroa');

  /* hutsera erori → azken lur segurua */
  await ev(() => { const g = __game; g.enterZone('ametsa', { x: 2700, y: 0, z: 5.5, a: Math.PI, cp: true }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  await tp(AE(0), 0, -9);
  p = await walk(0, -1, 2.5);
  p = await walk(0, 0.0001, 3);
  ok(p.zone === 'ametsa' && p.y > -1 && p.z > -12, 'hutsera erorita: azken lur segurura', S(p));

  ok(errs.length === 0, 'errorerik ez', errs.slice(0, 5).join('\n'));
  console.log(fails ? `\n${fails} HUTS` : '\nDENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
