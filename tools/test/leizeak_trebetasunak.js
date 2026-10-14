// LEIZEEN DEIA: trebetasun berriak (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_trebetasunak.js http://127.0.0.1:8091/games/leizeak.html
// ALDARATU: kolpea iristean sakatu → desbideratu (zauririk ez, etsaia zorabiatuta, kalte bikoitza);
// segidan sakatuz (zalaparta) ez du balio; EZKUTUA altxatuta kolpea geldiarazten da (karga galduta);
// zezenaren oldarraldia aldaratuta → zorabiatuta.
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
    s.items.push('katea');
    s.tod = 0.4;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const S = (p) => JSON.stringify(p);

  /* ---------------- ALDARATU ---------------- */
  /* Basajaunen leizeko itzalen gela (garbituta): Amaiur iparrera begira, etsaia aurrean */
  await ev(() => { const g = __game; g.saved.cleared.push('D'); g.enterZone('leizea', { x: 600, y: 0, z: -74, a: Math.PI }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  const duel = (type, opts = {}) => ev(([type, opts]) => {
    const g = __game;
    g.magicReset();
    for (const e of g.ENEMIES) g.killEnemy(e);
    for (let i = 0; i < 300; i++) g.tick(1 / 120);
    g.teleport(600, -74, 0);
    g.P.angle = Math.PI;
    g.P.hp = g.P.maxHp;
    const e = g.spawnEnemy(type, -1, 600, -74 - (opts.d || 2.4), 0);
    e.state = 'chase';
    e.t = 1;
    e.cd = 0;
    window.__e = e;
    return e.hp;
  }, [type, opts]);
  /* etsaiaren egoera arte (gehienez n tick) */
  const until = (st, n = 600) => ev(([st, n]) => { const g = __game, e = window.__e; for (let i = 0; i < n && e.state !== st; i++) g.tick(1 / 120); return e.state; }, [st, n]);
  const info = () => ev(() => { const g = __game, e = window.__e; return { hp: g.P.hp, max: g.P.maxHp, st: e.state, ehp: e.hp, par: +(e.parried || 0).toFixed(2), stun: +e.stun.toFixed(2), n: g.GUARD.n, blocks: g.GUARD.blocks }; });

  /* 1 · une zehatzean: ezpatadunaren jauzia aldaratu */
  await duel('grunt');
  ok((await until('lunge')) === 'lunge', 'ezpataduna erasoan (jauzia)');
  await ev(() => __game.attack());
  await T(60);
  let r = await info();
  ok(r.hp === r.max && r.n === 1, 'ALDARATUA: zauririk ez', S(r));
  ok(r.par > 0 && r.stun > 0, 'etsaia zorabiatuta', S(r));
  const dmg2 = await ev(() => { const g = __game, e = window.__e; e.era = -1; e.hp = e.max = 9; g.hitEnemy(e, 1, 0, -1); return { h0: 9, h1: e.hp }; });
  ok(dmg2.h1 === dmg2.h0 - 2, 'zorabiatuta: kalte bikoitza', S(dmg2));

  /* 2 · zalaparta: segidan sakatzeak ez du babesten (bigarrenak leihoa ixten du) */
  await duel('grunt');
  ok((await until('lunge')) === 'lunge', 'bigarren ezpataduna erasoan');
  await ev(() => __game.attack());
  await T(4);
  await ev(() => __game.attack());
  await T(60);
  r = await info();
  ok(r.hp === r.max - 1 && r.n === 1, 'zalaparta: kolpea jaso (ALDARATU ez)', S(r));

  /* 3 · EZKUTUA altxatuta: kolpea geldiarazi, karga galduta */
  await ev(() => { __game.ATK.hold = true; });
  await duel('grunt', { d: 3.2 });
  await ev(() => { __game.ATK.hold = true; });
  await T(70);
  const ch = await ev(() => ({ charging: __game.MAG.charging, charge: +__game.MAG.charge.toFixed(2) }));
  ok(ch.charging && ch.charge > 0.12, 'EZKUTUA altxatuta (INDARRA kargatzen)', S(ch));
  await until('lunge', 400);
  await T(40);
  r = await info();
  const after = await ev(() => +__game.MAG.charge.toFixed(2));
  ok(r.hp === r.max && r.blocks === 1, 'EZKUTUA: kolpea geldiarazita', S(r));
  ok(after < 0.5, 'karga galduta', after);
  await ev(() => { __game.ATK.hold = false; });
  await T(5);

  /* 4 · zezenaren oldarraldia aldaratu → zorabiatuta */
  await duel('brute', { d: 7 });
  ok((await until('charge', 900)) === 'charge', 'zezena oldarka');
  const hitAt = await ev(() => { const g = __game, e = window.__e; for (let i = 0; i < 240; i++) { if (Math.hypot(e.x - g.P.x, e.z - g.P.z) < e.D.r + 1.6) return i; g.tick(1 / 120); } return -1; });
  ok(hitAt >= 0, 'zezena hurbil', hitAt);
  await ev(() => __game.attack());
  await T(40);
  r = await info();
  ok(r.hp === r.max && r.st === 'stun', 'zezena aldaratuta: zorabiatuta', S(r));


  /* ---------------- HEURA ---------------- */
  /* proba-horma: 4.5 m-ko harri-blokea, hegoaldeko aldea heuraz (iraganean bizirik) */
  await ev(() => {
    const g = __game;
    for (const e of g.ENEMIES) g.killEnemy(e);
    g.zoneBuild('leizea');
    const p = g.slab({ x: 600, z: -84, y: 4.5, w: 8, d: 4, h: 4.5 });
    window.__ivy = g.ivySide(p, 's', 0, { phase: 0 });
    g.zoneActivate('leizea');
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
  });
  const setEra = (want) => ev((want) => { const g = __game; for (let k = 0; k < 3 && g.phase() !== want; k++) { for (let i = 0; i < 200; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 60; i++) g.tick(1 / 120); } return g.phase(); }, want);
  /* iparrera bultzatu (munduan): kameraren angelua kontuan */
  const pushNorth = (n) => ev((n) => { const g = __game; g.input.x = 0.557; g.input.z = -0.83; for (let i = 0; i < n; i++) g.tick(1 / 120); g.input.x = 0; g.input.z = 0; return { climb: !!g.P.climb, y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2) }; }, n);
  const stick = (x, z, n) => ev(([x, z, n]) => { const g = __game; g.input.x = x; g.input.z = z; for (let i = 0; i < n; i++) g.tick(1 / 120); g.input.x = 0; g.input.z = 0; return { climb: !!g.P.climb, y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), gr: g.P.grounded }; }, [x, z, n]);
  const back = () => ev(() => { const g = __game; g.climbDrop(); g.teleport(600, -79.5, 0); g.P.angle = Math.PI; for (let i = 0; i < 30; i++) g.tick(1 / 120); });

  ok((await setEra(0)) === 0, 'IRAGANA (heura bizirik)');
  await back();
  let c = await pushNorth(40);
  ok(c.climb, 'hormaren kontra bultzatu → heldu', S(c));
  c = await stick(0, -1, 60);
  ok(c.climb && c.y > 1.5, 'gora igotzen', S(c));
  c = await ev(() => { const g = __game; g.input.z = -1; for (let i = 0; i < 300 && g.P.climb; i++) g.tick(1 / 120); g.input.z = 0; for (let i = 0; i < 60; i++) g.tick(1 / 120); return { climb: !!g.P.climb, y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), gr: g.P.grounded }; });
  ok(!c.climb && c.gr && Math.abs(c.y - 4.5) < 0.1 && c.z < -82, 'goian: ertzera igo', S(c));

  /* jauzia gora (helduta) eta atzera jauzi */
  await back();
  await pushNorth(40);
  const hop = await ev(() => { const g = __game, y0 = g.P.y; g.input.z = -1; g.jump(); for (let i = 0; i < 30; i++) g.tick(1 / 120); g.input.z = 0; return { climb: !!g.P.climb, dy: +(g.P.y - y0).toFixed(2) }; });
  ok(hop.climb && hop.dy > 1.6, 'JAUZI gora: helduta jarraitu', S(hop));
  const off = await ev(() => { const g = __game, z0 = g.P.z; g.input.z = 1; g.jump(); for (let i = 0; i < 40; i++) g.tick(1 / 120); g.input.z = 0; return { climb: !!g.P.climb, dz: +(g.P.z - z0).toFixed(2) }; });
  ok(!off.climb && off.dz > 1, 'JAUZI atzera: hormatik askatu', S(off));
  await ev(() => { for (let i = 0; i < 240; i++) __game.tick(1 / 120); });

  /* garaia aldatu igotzen ari zarela → heura izoztu → erori */
  await back();
  await pushNorth(40);
  await stick(0, -1, 50);
  await ev(() => { const g = __game; for (let i = 0; i < 200 && g.state().phaseCooldown > 0; i++) g.tick(1 / 120); g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  c = await ev(() => ({ climb: !!__game.P.climb, ph: __game.phase() }));
  ok(!c.climb && c.ph === 1, 'ORAINA: heura izoztuta → erori', S(c));

  /* orainean ezin da heldu */
  await ev(() => { for (let i = 0; i < 240; i++) __game.tick(1 / 120); });
  await back();
  c = await pushNorth(60);
  ok(!c.climb && c.y < 0.5, 'orainean ezin da heldu (izoztuta)', S(c));


  /* ---------------- TXIMISTARRIA ---------------- */
  await ev(() => {
    const g = __game;
    g.climbDrop();
    g.saved.items.push('tximistarria', 'adarra');
    g.TXB.n = 3;
    g.zoneBuild('leizea');
    window.__crack = g.crackWall('t-crack', 608, -70, 6, 1.2, 4);
    g.zoneActivate('leizea');
    g.teleport(608, -64.5, 0);
    g.P.angle = Math.PI;
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
  });
  /* sorginkeriak ez du apurtzen */
  await ev(() => { const g = __game; for (let k = 0; k < 4; k++) { g.MAG.cd = 0; g.attack(); for (let i = 0; i < 30; i++) g.tick(1 / 120); } });
  ok(!(await ev(() => __game.isCleared('t-crack'))), 'harri arrakalatua: sorginkeriak ez du apurtzen');
  /* jaurti → 1.7 s → trumoia → apurtuta */
  let bx = await ev(() => { const g = __game; g.P.angle = Math.PI; g.bombThrow(); return { n: g.TXB.n, live: g.TXB.list.length }; });
  ok(bx.n === 2 && bx.live === 1, 'TXIMISTARRIA jaurtita (karga bat gutxiago)', S(bx));
  await T(230);
  bx = await ev(() => ({ cleared: __game.isCleared('t-crack'), live: __game.TXB.list.length, off: !!__game.platforms?.length }));
  ok(bx.cleared && bx.live === 0, 'trumoia: harri arrakalatua apurtuta', S(bx));
  const pass = await ev(() => { const g = __game; g.input.z = -1; g.input.x = 0.6; for (let i = 0; i < 150; i++) g.tick(1 / 120); g.input.z = 0; g.input.x = 0; return +g.P.z.toFixed(1); });
  ok(pass < -71.5, 'bidea zabalik (hormaz bestaldera)', pass);
  await T(380);
  ok((await ev(() => __game.TXB.n)) === 3, 'kargak berez bete dira');
  /* etsaiak: garaiaren ezkutua gorabehera zauritu eta zorabiatu */
  const eb = await ev(() => {
    const g = __game;
    g.teleport(600, -66, 0);
    const e = g.spawnEnemy('grunt', 1 - g.phase(), 600, -72, 0);
    e.state = 'chase';
    e.hp = e.max = 9;
    for (let i = 0; i < 2; i++) g.tick(1 / 120);
    g.bombExplode(e.x, 0.3, e.z + 0.5);
    return { hp: e.hp, stun: +e.stun.toFixed(2) };
  });
  ok(eb.hp <= 6 && eb.stun > 1, 'itzala zaurituta eta zorabiatuta (ezkutua gorabehera)', S(eb));
  /* Amaiur ere, hurbilegi */
  const self = await ev(() => { const g = __game; for (let i = 0; i < 200; i++) g.tick(1 / 120); g.P.hp = g.P.maxHp; g.bombExplode(g.P.x + 1, g.P.y, g.P.z); return { hp: g.P.hp, max: g.P.maxHp }; });
  ok(self.hp === self.max - 1, 'hurbilegi: Amaiur zaurituta', S(self));
  /* HAIZE-ADARRAk lurreko harria bultzatzen du */
  const blow = await ev(() => {
    const g = __game;
    for (let i = 0; i < 260; i++) g.tick(1 / 120);
    g.teleport(596, -66, 0);
    g.P.angle = Math.PI / 2;
    g.input.x = 0; g.input.z = 0;
    g.bombThrow();
    for (let i = 0; i < 100; i++) g.tick(1 / 120);
    const b = g.TXB.list[0];
    if (!b) return null;
    const x0 = b.x;
    g.WIND.cd = 0;
    g.P.angle = Math.atan2(b.x - g.P.x, b.z - g.P.z);
    g.hornBlow();
    for (let i = 0; i < 40; i++) g.tick(1 / 120);
    return { dx: +(b.x - x0).toFixed(2) };
  });
  ok(blow && Math.abs(blow.dx) > 1.5, 'ADARRA: tximistarria bultzatuta', S(blow));
  await T(200);

  /* ---------------- KANPAIAK ---------------- */
  await ev(() => {
    const g = __game;
    g.zoneBuild('leizea');
    g.RUNE_SETS.push({ id: 't-bells', zone: 't-test', kind: 'kanpaia', time: 6, runes: [[594, 3.6, -88, -1], [606, 3.6, -88, -1]], onSolve: () => (window.__bells = true) });
    g.buildRunePuzzles('t-test');
    g.zoneActivate('leizea');
    g.teleport(600, -74, 0);
    g.P.angle = Math.PI;
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
  });
  await ev(() => { const g = __game; g.MAG.cd = 0; g.attack(); for (let i = 0; i < 70; i++) g.tick(1 / 120); });
  const k1 = await ev(() => __game.RUNES.filter((r) => r.set && r.set.D.id === 't-bells' && r.lit).length);
  ok(k1 === 1, 'lehen kanpaia jota (izpia)', k1);
  await ev(() => { const g = __game; g.MAG.cd = 0; g.attack(); for (let i = 0; i < 70; i++) g.tick(1 / 120); });
  ok(await ev(() => !!window.__bells), 'bi kanpaiak batera: ebatzita');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
