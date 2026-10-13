// LEIZEEN DEIA: EGUNA ETA GAUA (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_gaua.js http://127.0.0.1:8091/games/leizeak.html
// Ilunabarra → gaua (herritarrak etxera, plazako txalaparta bakarrik) → Kattalin → eguzkilorea (iraganean,
// egunez) → EGUZKILORE erritmoa (ilunabarra / egunsentia) → Gauekoren itzalak (ez herrian; egunsentian
// hautsi) → arima-argiak eta Kattalinen saria → leizean, erritmoak itzalak zorabiatzen ditu.
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
  /* gordetako partida: lehen leizea amaituta (cliff) → denbora ibiltzen da */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'kattalin');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia');
    s.hearts = 1;
    s.tod = 0.7;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 10 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const tp = (x, y, z) => ev(([x, y, z]) => { const g = __game; g.teleport(x, z, y); for (let i = 0; i < 6; i++) g.tick(1 / 120); }, [x, y, z]);
  const until = async (f, maxTicks = 3000, a) => { for (let i = 0; i < maxTicks; i += 60) { if (await ev(f, a)) return true; await T(60); } return !!(await ev(f, a)); };
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const toPhase = (ph) => ev((ph) => { const g = __game; if (g.phase() !== ph) g.switchPhase(); for (let i = 0; i < 200; i++) g.tick(1 / 120); }, ph);
  const talk = async (id) => { await ev((id) => { const g = __game, N = g.NPCS.find((n) => n.id === id); g.teleport(N.x + 1.2, N.z, N.y || 0); for (let i = 0; i < 4; i++) g.tick(1 / 120); g.talkTo(N); }, id); const c = await ev(() => !!__game.cinematicState()); await skip(); return c; };
  /* txalaparta: deia entzun eta erantzun (tick-ekin) */
  const answer = async () => {
    const got = await until(() => __game.TXALA.call && __game.TXALA.call.phase === 'answer', 2400);
    const seq = await ev(() => __game.TXALA.call && __game.TXALA.call.seq);
    if (!got || !seq) return false;
    for (const s of seq) { await ev((s) => __game.txalaHit(s), s); await T(24); }
    await T(120);
    await skip();
    return !(await ev(() => __game.TXALA.on));
  };
  const play = async (seq) => { await ev(() => __game.txalaOpen()); for (const s of seq) { await ev((s) => __game.txalaHit(s), s); await T(24); } await T(120); };
  const state = () => ev(() => ({ tod: +__game.saved.tod.toFixed(3), k: +__game.DAY.k.toFixed(2), away: __game.NPCS.filter((n) => n.away).map((n) => n.id) }));

  /* 1 · ilunabarra → gaua: bandera, herritarrak etxera, plazako txalaparta bakarrik */
  await tp(0, 0, 36);
  const dusk = await until(() => __game.DAY.k > 0.5, 6000 * 6);
  let st = await state();
  ok(dusk && (await flag('gaua')), 'ilunabarra iritsi da: GAUA (bandera)', S(st));
  ok(await ev(() => document.getElementById('phaseName').textContent.includes('☾')), 'HUDa: ilargia (☾)');
  const home = await until(() => Object.keys(__game.NIGHT_HOME).every((id) => __game.NPCS.find((n) => n.id === id).away), 120 * 60);
  st = await state();
  ok(home, 'herritarrak etxera joan dira', S(st));
  ok(await ev(() => !__game.NPCS.find((n) => n.id === 'maddi').g.visible && __game.NPCS.find((n) => n.id === 'irati').g.visible), 'Maddi etxean; Iratiren oihartzuna plazan');
  const g0 = await ev(() => __game.DAY.ghostSeq);
  await T(120 * 8);
  ok((await ev(() => __game.DAY.ghostSeq)) > g0, 'plazako txalapartak bakarrik jotzen du gauez');
  ok(await ev(() => __game.DAY.halo && __game.DAY.halo.visible && __game.DAY.lampHalo.visible), 'leihoak eta farolak piztuta');

  /* 2 · Kattalin gauez → eguzkilorea bilatu */
  ok(await talk('kattalin'), 'Kattalinekin hitz egin (gauez atarian)');
  ok(await flag('eguzkilore-bila'), 'eginkizuna: eguzkilorea');
  /* gauez ez da ikusten; egunez eta iraganean bai */
  await toPhase(0);
  await tp(40, 9, -56);
  await T(60);
  ok(!(await flag('eguzkilorea')), 'gauez eguzkilorea itxita (ez da agertzen)');
  await ev(() => { __game.saved.tod = 0.42; });
  await T(240);
  await skip();
  ok(await flag('eguzkilorea'), 'iraganean eta egunez: EGUZKILOREA bilduta');

  /* 3 · Kattalin → EGUZKILORE erritmoa */
  await toPhase(1);
  await talk('kattalin');
  ok(await answer(), 'Kattaliren deiari erantzun');
  ok(await ev(() => __game.saved.rhythms.includes('eguzkilore')), 'EGUZKILORE erritmoa ikasita');
  ok(await flag('arimak'), 'arima-argien eginkizuna irekita');

  /* 4 · EGUZKILORE egunez → ilunabarra (denbora-jauzia) */
  await tp(-60, 0, 8);
  await ev(() => { __game.saved.tod = 0.45; });
  await T(10);
  await play(['R', 'R', 'L', 'L']);
  await until(() => __game.DAY.skip < 0, 1200);
  st = await state();
  ok(st.tod > 0.79 && st.tod < 0.83 && st.k > 0.95, 'EGUZKILORE egunez: ilunabarrera eta gaua', S(st));

  /* 5 · Gauekoren itzalak zelaietan (lurraren gainean, ez herrian) */
  const foe = await until(() => __game.ENEMIES.some((e) => e.night && e.state !== 'dead'), 120 * 16);
  const fs = await ev(() => { const g = __game, e = g.ENEMIES.find((q) => q.night); return e ? { terrain: e.terrain, x: +e.x.toFixed(1), z: +e.z.toFixed(1), y: +e.y.toFixed(2), gy: +g.gy(e.x, e.z).toFixed(2) } : null; });
  ok(foe && fs && fs.terrain, 'Gauekoren itzal bat agertu da zelaietan', S(fs));
  await T(240);
  const fy = await ev(() => { const g = __game, e = g.ENEMIES.find((q) => q.night && q.state !== 'dead'); return e ? Math.abs(e.y - g.gy(e.x, e.z)) : 0; });
  ok(fy < 0.3, 'itzala lurraren gainean ibiltzen da', fy.toFixed(2));
  await ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.night && e.state !== 'dead') g.killEnemy(e); });
  await T(30);
  ok(await ev(() => __game.ENEMIES.filter((e) => e.night).every((e) => e.looted)), 'garaituta: txanponak utzi ditu');
  /* herrira ez dira sartzen */
  const edge = await ev(() => {
    const g = __game;
    g.teleport(0, 20, 0);
    const e = g.spawnEnemy('grunt', -1, 0, -6, g.gy(0, -6));
    Object.assign(e, { night: true, terrain: true });
    for (let i = 0; i < 120 * 8; i++) g.tick(1 / 120);
    const r = { z: +e.z.toFixed(1), d: +Math.hypot(e.x, e.z - 38).toFixed(1) };
    g.killEnemy(e);
    return r;
  });
  ok(edge.d > 39.5, 'itzalak herriaren mugan gelditzen dira', S(edge));

  /* 6 · arima-argiak: gauez bildu (hiru) */
  for (const id of ['mendebaldea', 'ekialdea', 'harrespila']) {
    await ev((id) => { const g = __game, W = g.DAY.wisps.find((w) => w.id === id); g.teleport(W.x, W.z, W.y + 1); }, id);
    await T(120);
  }
  const ar = await ev(() => [...__game.saved.arimak]);
  ok(ar.length === 3, 'hiru arima-argi bilduta', S(ar));
  const pot0 = await ev(() => __game.saved.potions || 0);
  await talk('kattalin');
  ok((await flag('arimak3')) && (await ev(() => __game.saved.potions || 0)) === pot0 + 1, 'Kattalin: hiru argizaiola → sendabelar-botila');

  /* 7 · EGUZKILORE gauez → egunsentia: itzalak hautsi, herritarrak itzuli */
  await tp(-60, 0, 8);
  await until(() => __game.ENEMIES.some((e) => e.night && e.state !== 'dead'), 120 * 16);
  await play(['R', 'R', 'L', 'L']);
  await until(() => __game.DAY.skip < 0, 1200);
  st = await state();
  ok(st.tod > 0.29 && st.tod < 0.32 && st.k < 0.05, 'EGUZKILORE gauez: egunsentia', S(st));
  ok(await ev(() => __game.ENEMIES.filter((e) => e.night).every((e) => e.state === 'dead')), 'egunsentian itzalak hautsi dira');
  const back = await until(() => __game.NPCS.every((n) => !n.away && !n.back), 120 * 40);
  ok(back, 'herritarrak goizean itzuli dira', S(await state()));

  /* 8 · leizean: ez dago eguzkirik, baina erritmoak itzalak zorabiatzen ditu */
  await ev(() => { const g = __game; g.enterZone('leizea', { x: 600, y: 0, z: 2, a: Math.PI }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  const tod0 = await ev(() => __game.saved.tod);
  await ev(() => { const g = __game; const e = g.spawnEnemy('grunt', -1, 604, 0, 0); e.state = 'chase'; });
  await play(['R', 'R', 'L', 'L']);
  const stun = await ev(() => __game.ENEMIES.some((e) => e.state !== 'dead' && e.stun > 0.5));
  ok(stun && Math.abs((await ev(() => __game.saved.tod)) - tod0) < 0.002, 'leizean EGUZKILORE: itzalak zorabiatuta, ordua ez da aldatzen');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
