// LEIZEEN DEIA: borroka (FINKATU, EZKUTUA, garaien ezkutuak, INDARRA).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_combat.js http://127.0.0.1:8091/games/leizeak.html
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg) => { console.log((c ? 'OK   ' : 'HUTS ') + msg); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const wait = (ms) => page.waitForTimeout(ms);
  /* denbora errealean itxaron: makina kargatuta (jokoa ~0.1×) ere bai */
  const until = async (f, ms = 45000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f)) return true; await wait(100); } return false; };
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { localStorage.clear(); __game.saved.flags.push('giroa', 'intro'); __game.renderer.setPixelRatio(0.5); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await wait(400);
  await ev(() => __game.endScene());
  await ev(() => { __game.teleport(0, -58, 0); __game.P.angle = Math.PI; });
  ok((await ev(() => __game.phase())) === 1, 'hasieran ORAINA');

  /* FINKATU */
  await ev(() => { window.__eye = __game.spawnEnemy('eye', 1, 0, -67, 0); });
  await until(() => __eye.state !== 'spawn');
  await ev(() => __game.lockToggle());
  ok(await ev(() => __game.LOCK.target === __eye), 'FINKATU: helburua finkatuta');
  await wait(800);
  const face = await ev(() => { const a = Math.atan2(__eye.x - __game.P.x, __eye.z - __game.P.z); return Math.abs(Math.atan2(Math.sin(a - __game.P.angle), Math.cos(a - __game.P.angle))); });
  ok(face < 0.35, 'Amaiur helburuari begira (' + face.toFixed(2) + ' rad)');

  /* EZKUTUA: mantendu erasoa, proiektila itzuli */
  await ev(() => { __game.ATK.hold = true; });
  ok(await until(() => __game.MAG.charging, 5000), 'INDARRA kargatzen (ezkutua)');
  const hp0 = await ev(() => (window.__hp0 = __eye.hp));
  const refl = await until(() => __game.SHOTS.some((s) => s.back) || __eye.hp < __hp0 || __eye.state === 'dead', 25000);
  ok(refl, 'proiektila itzulita');
  ok(await until(() => __eye.hp < __hp0 || __eye.state === 'dead', 6000), 'itzulitako proiektilak etsaia zauritu (' + hp0 + ' → ' + (await ev(() => __eye.hp)) + ')');
  await ev(() => { __game.ATK.hold = false; });
  await wait(600);
  await ev(() => { if (__eye.state !== 'dead') __game.killEnemy(__eye); });

  /* garaien ezkutua: iraganeko etsaia orainean ez da zauritzen */
  await ev(() => { window.__g0 = __game.spawnEnemy('grunt', 0, 2, -64, 0); });
  await until(() => __g0.state !== 'spawn');
  await ev(() => { __game.LOCK.target = null; });
  const h1 = await ev(() => (window.__h1 = __g0.hp));
  for (let i = 0; i < 4; i++) { await ev(() => { __game.MAG.cd = 0; __game.attack(); }); await wait(250); }
  await wait(600);
  ok((await ev(() => __g0.hp)) === h1, 'IRAGANEKO itzala ez da ORAINEAN zauritzen');
  await ev(() => __game.switchPhase());
  await wait(300);
  for (let i = 0; i < 8 && (await ev(() => __g0.state !== 'dead')); i++) { await ev(() => { __game.MAG.cd = 0; __game.attack(); }); await wait(300); }
  ok(await until(() => __g0.hp < __h1 || __g0.state === 'dead', 5000), 'IRAGANEAN bai (' + h1 + ' → ' + (await ev(() => __g0.hp)) + ')');
  await ev(() => { if (__g0.state !== 'dead') __game.killEnemy(__g0); });

  /* kontaktua: jokalaria zauritu eta sendabelarra */
  await ev(() => { __game.saved.potions = 1; __game.P.hp = 1; });
  await ev(() => __game.playerHit(1, 0, -50));
  ok(await ev(() => __game.P.hp === __game.P.maxHp && __game.saved.potions === 0), 'sendabelar-botila: bizirik itzuli');
  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
