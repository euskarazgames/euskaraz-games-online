// LEIZEEN DEIA: POTTOKA (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_pottoka.js http://127.0.0.1:8091/games/leizeak.html
// Beltxa basati (ihes) → Joanes: POTTOKA erritmoa → deitu (lauhazka dator) → igo (E) → zaldiz: abiadura,
// jauzi luzea, bultzadarik ez → jaitsi (E) → leizera sartzean berez jaitsi (pottoka haranean geratzen da).
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
    s.flags.push('intro', 'irati1', 'ardiak', 'ardiak-saria');
    s.rhythms.push('esnatu');
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
  const pony = () => ev(() => { const g = __game, p = g.POTT; return { st: p.state, x: +p.x.toFixed(1), z: +p.z.toFixed(1), d: +Math.hypot(g.P.x - p.x, g.P.z - p.z).toFixed(1), riding: !!g.P.riding }; });

  /* 1 · basati: hurbiltzean ihes */
  let p = await pony();
  ok(p.st === 'wild', 'Beltxa basati ipar-larreetan', S(p));
  await ev(() => { const g = __game; g.teleport(g.POTT.x + 4, g.POTT.z, g.POTT.y); });
  await T(240);
  p = await pony();
  ok(p.d > 6.5, 'hurbiltzean ihes egiten du', S(p));
  ok(await ev(() => { const a = __game.actionHere(); return !a || a.kind !== 'pony'; }), 'basati: ezin da igo');

  /* 2 · Joanes: POTTOKA erritmoa */
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'joanes'); g.teleport(N.x + 1.2, N.z, N.y || 0); for (let i = 0; i < 4; i++) g.tick(1 / 120); g.talkTo(N); });
  await skip();
  ok(await answer(), 'Joanesen deiari erantzun');
  ok(await ev(() => __game.saved.rhythms.includes('pottoka')), 'POTTOKA erritmoa ikasita');
  p = await pony();
  ok(p.st === 'idle', 'Beltxa ez da basati jada', S(p));

  /* 3 · deitu urrunetik → lauhazka dator */
  await tp(-6, 0, 30);
  await play(['L', 'R', 'L', 'L']);
  ok((await pony()).st === 'come', 'POTTOKA: Beltxa dator');
  const came = await until(() => __game.POTT.state === 'idle' && Math.hypot(__game.P.x - __game.POTT.x, __game.P.z - __game.POTT.z) < 3, 120 * 30);
  p = await pony();
  ok(came, 'Beltxa iritsi da', S(p));

  /* 4 · igo (E) → zaldiz */
  await ev(() => { const g = __game; g.teleport(g.POTT.x + 1.6, g.POTT.z, g.POTT.y); for (let i = 0; i < 4; i++) g.tick(1 / 120); });
  const act = await ev(() => { const a = __game.actionHere(); return a ? a.kind + ':' + a.label : null; });
  ok(act === 'pony:IGO', 'ekintza: IGO', act);
  await ev(() => __game.interact());
  await T(10);
  ok((await pony()).riding, 'zaldiz');
  const run = await ev(() => {
    const g = __game;
    g.input.keys.ShiftLeft = true;
    g.input.z = -1;
    const x0 = g.P.x, z0 = g.P.z;
    for (let i = 0; i < 360; i++) g.tick(1 / 120);
    g.input.z = 0;
    g.input.keys.ShiftLeft = false;
    return { sp: +Math.hypot(g.P.vx, g.P.vz).toFixed(1), d: +Math.hypot(g.P.x - x0, g.P.z - z0).toFixed(1) };
  });
  ok(run.sp > 15 && run.d > 30 && run.d < 60, 'lauhazka: azkarra (eta ez gehiegi)', S(run));
  const jmp = await ev(() => { const g = __game; for (let i = 0; i < 240 && !g.P.grounded; i++) g.tick(1 / 120); g.jump(); g.tick(1 / 120); g.tick(1 / 120); const vy = g.P.vy; g.jump(); g.tick(1 / 120); return { vy: +vy.toFixed(1), vy2: +g.P.vy.toFixed(1), jumps: g.P.jumps }; });
  ok(jmp.vy > 10 && jmp.vy2 < jmp.vy, 'jauzi luzea (jauzi bikoitzik ez)', S(jmp));
  await T(240);
  ok(await ev(() => { const g = __game; g.P.dashReady = true; g.dash(); return g.P.dashT <= 0; }), 'zaldiz ez dago bultzadarik');

  /* 5 · jaitsi (E) */
  await T(120);
  const act2 = await ev(() => { const a = __game.actionHere(); return a ? a.kind + ':' + a.label : null; });
  ok(act2 === 'pony:JAITSI', 'ekintza: JAITSI', act2);
  await ev(() => __game.interact());
  await T(30);
  p = await pony();
  ok(!p.riding && p.st === 'idle' && p.d < 2.5, 'jaitsita; Beltxa ondoan zain', S(p));
  ok(await ev(() => !!__game.saved.ponyAt), 'Beltxaren lekua gordeta');

  /* 6 · leizera zaldiz → berez jaitsi; pottoka haranean */
  await ev(() => __game.ponyMount());
  await ev(() => { const g = __game; g.enterZone('leizea', { x: 600, y: 0, z: 2, a: Math.PI }, true); for (let i = 0; i < 30; i++) g.tick(1 / 120); });
  const inCave = await ev(() => ({ riding: !!__game.P.riding, zone: __game.ZONE.cur, vis: __game.POTT.g.parent.visible }));
  ok(!inCave.riding && inCave.zone === 'leizea' && !inCave.vis, 'leizean: oinez (Beltxa kanpoan)', S(inCave));
  await play(['L', 'R', 'L', 'L']);
  ok((await pony()).st !== 'come', 'leizean ez da etortzen');

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
