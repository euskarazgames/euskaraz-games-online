// LEIZEEN DEIA: bigarren mailako eginkizunak eta misterioak (?test kakoekin).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_quests.js http://127.0.0.1:8091/games/leizeak.html
// Oihartzun-harriak (7) → Andereren etxea; sorgin-belarrak; Txominen sarea; Mikelen erronka; burdin-harriak; egunkaria.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; __game.saved.flags.push('intro'); });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });
  /* eszenak amaitu (deiak eta ondorengoak barne) */
  const skip = () => ev(() => { const g = __game; for (let i = 0; i < 8 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } for (let i = 0; i < 8 && g.cinematicState(); i++) g.endScene(); });
  const tick = (n = 30) => ev((n) => { for (let i = 0; i < n; i++) __game.tick(1 / 120); }, n);
  const goPhase = (ph) => ev((ph) => { const g = __game; if (g.phase() !== ph) { g.switchPhase(); for (let i = 0; i < 40; i++) g.tick(1 / 120); } }, ph);
  const tp = (x, y, z) => ev(([x, y, z]) => { const g = __game; g.teleport(x, z, y === null ? g.gy(x, z) : y); for (let i = 0; i < 10; i++) g.tick(1 / 120); }, [x, y, z]);
  const talk = async (id) => { await ev((id) => { const g = __game, N = g.NPCS.find((n) => n.id === id); g.teleport(N.x + 1.2, N.z, N.y); g.talkTo(N); }, id); await skip(); };
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);

  /* 1 · oihartzun-harriak: ENTZUN gabe → abisua; ENTZUN-ekin → zazpiak */
  const defs = await ev(() => __game.ECHOES.map((E) => ({ id: E.id, x: E.x, y: E.y, z: E.z, past: !!E.past })));
  ok(defs.length === 7, 'zazpi oihartzun-harri', defs.length);
  await goPhase(1);
  await tp(defs[0].x + 1.2, defs[0].y, defs[0].z);
  let a = await ev(() => { const A = __game.actionHere(); return A && A.label; });
  ok(!!a, 'harriaren ondoan ekintza bat', a);
  await ev(() => { __game.actionHere().fn(); });
  await skip();
  ok((await ev(() => __game.saved.echoes.length)) === 0, 'ENTZUN gabe: ez da entzuten');
  await ev(() => { if (!__game.saved.rhythms.includes('entzun')) __game.saved.rhythms.push('entzun'); });
  for (const D of defs) {
    await goPhase(D.past ? 0 : 1);
    await tp(D.x + 1.2, D.y, D.z);
    const r = await ev(() => { const A = __game.actionHere(); if (!A) return null; A.fn(); return A.label; });
    await skip();
    const heard = await ev((id) => __game.saved.echoes.includes(id), D.id);
    ok(heard, `oihartzuna: ${D.id}`, r || 'ekintzarik ez');
  }
  ok(await flag('andere-giltza'), 'zazpiak entzunda → andere-giltza');
  /* 2 · Andereren etxea */
  await goPhase(1);
  const hp0 = await ev(() => __game.P.maxHp);
  await tp(-36.8, null, 50.6);
  a = await ev(() => { const A = __game.actionHere(); if (!A) return null; A.fn(); return A.label; });
  await skip();
  ok(await flag('andere'), 'Andereren atea irekita', a);
  ok((await ev(() => __game.P.maxHp)) === hp0 + 1, 'arnasa bat gehiago', hp0 + ' → ' + (await ev(() => __game.P.maxHp)));
  /* 3 · sorgin-belarrak (iraganean bakarrik) */
  await talk('kattalin');
  await talk('kattalin');
  const herbs = await ev(() => __game.HERBS.map((H) => [H.x, H.y, H.z]));
  await goPhase(1);
  await tp(herbs[0][0], herbs[0][1], herbs[0][2]);
  await tick(20);
  ok((await ev(() => __game.saved.herbs.length)) === 0, 'orainean belarrik ez');
  await goPhase(0);
  for (const [x, y, z] of herbs) { await tp(x + 0.3, y, z); await tick(20); }
  ok((await ev(() => __game.saved.herbs.length)) === 3, 'hiru belarrak (iraganean)');
  await goPhase(1);
  await talk('kattalin');
  ok(await flag('belarrak-ok'), 'Kattalin: belarrak emanda');
  /* 4 · Txominen sarea (badia izoztua) */
  await talk('txomin');
  ok(await flag('txomin'), 'Txominekin hitz egin');
  await goPhase(1);
  await tp(20, -8.4, 96);
  await ev(() => { const g = __game; g.input.x = 0.83 * 6.5 - 0.557 * 5.5; g.input.z = 0.557 * 6.5 + 0.83 * 5.5; const n = Math.hypot(g.input.x, g.input.z); g.input.x /= n; g.input.z /= n; for (let i = 0; i < 160; i++) g.tick(1 / 120); g.input.jump = 0; g.input.x = g.input.z = 0; });
  await ev(() => { __game.jump(); for (let i = 0; i < 90; i++) __game.tick(1 / 120); });
  if (!(await flag('sarea'))) await tp(26.5, -7.3, 101.5);
  await tick(20);
  ok(await flag('sarea'), 'sarea uhartetxoan');
  await talk('txomin');
  ok(await flag('txomin-ok'), 'Txomin: sarea itzulita');
  /* 5 · Mikelen erronka */
  await ev(() => { const g = __game; g.teleport(-24, 36, g.gy(-24, 36)); g.mikelStart(); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  for (let k = 0; k < 12 && !(await flag('mikel-ok')); k++) {
    await ev(() => { const R = __game.QST.targets.find((t) => t.g.visible && !t.lit); if (R) R.hit(); for (let i = 0; i < 60; i++) __game.tick(1 / 120); });
    await page.waitForTimeout(380);
  }
  await skip();
  ok(await flag('mikel-ok'), 'Mikelen erronka irabazita');
  /* 6 · burdin-harriak haranean */
  const ores = await ev(() => __game.BREAKABLES.filter((B) => B.kind === 'ore' && B.zone === 'ibarra').map((B) => [B.x, B.y, B.z, B.phase]));
  ok(ores.length === 2, 'bi burdin-harri haranean', ores.length);
  for (const [x, y, z, ph] of ores) {
    await goPhase(ph === undefined ? 1 : ph);
    await tp(x + 1.4, y, z);
    await ev(([x, z]) => { const g = __game, B = g.BREAKABLES.find((B) => B.kind === 'ore' && Math.hypot(B.x - x, B.z - z) < 0.1); B.onBreak(); B.broken = true; }, [x, z]);
  }
  ok((await ev(() => __game.saved.ores.length)) === 2, 'bi burdin-harri bilduta');
  /* 7 · egunkaria */
  await ev(() => { __game.questLog(); });
  const txt = await ev(() => document.getElementById('text').textContent);
  ok(txt.includes('Oihartzun-harriak') && txt.includes('7/7'), 'egunkaria irekita (7/7)');
  await ev(() => { document.querySelector('#choices button').click(); });
  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
