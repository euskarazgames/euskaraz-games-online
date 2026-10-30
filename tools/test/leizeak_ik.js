// LEIZEEN DEIA: IK (begirada eta oinak), ?test kakoekin, tick-ak eskuz.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_ik.js http://127.0.0.1:8091/games/leizeak.html
// Herritarra alboan → Amaiurrek burua biratzen du (mugaraino) eta herritarrak Amaiurri begiratzen dio →
// maila (hankaren % 40) oin baten azpian → oin hori igotzen da, bestea maldari jarraituz → behin eta berriz
// marraztuta ez da metatzen → jauzian eta korrika ez (pisua 0) → IK itzalita, jarrera berdina.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 480, height: 300 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const S = (o) => JSON.stringify(o);

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.saved.flags.push('intro', 'irati1', 'prologoa'); __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => {
    __game.endScene(); window.__hold = true; __game.DAY.freeze = true;
    const g = __game, T = THREE, R = g.IK.hero;
    window.__yaw = (R) => { const f = R.fwd.clone().applyQuaternion(R.head.getWorldQuaternion(new T.Quaternion())); f.applyQuaternion(R.root.getWorldQuaternion(new T.Quaternion()).invert()); return +(Math.atan2(f.x, f.z) * 180 / Math.PI).toFixed(1); };
    window.__feet = () => R.legs.map((L) => +L.ft.getWorldPosition(new T.Vector3()).y.toFixed(3));
    window.__run = (n) => { for (let i = 0; i < n; i++) { g.tick(1 / 120); if (i % 4 === 0) g.draw(); } g.draw(); };
  });

  const rigs = await ev(() => { const g = __game; return { n: g.IK.rigs.length, hero: !!g.IK.hero, legs: !!(g.IK.hero && g.IK.hero.legs), npcs: g.NPCS.filter((N) => N.ik).length }; });
  ok(rigs.hero && rigs.legs && rigs.npcs >= 5, 'IK: Amaiur (burua, bularra, hankak) eta herritarrak', S(rigs));

  /* 1 · begirada: herritarra 90°-ra ezkerrean */
  const look = await ev(() => {
    const g = __game, R = g.IK.hero, N = g.NPCS.find((n) => n.g && n.g.visible && !n.route) || g.NPCS[0], x = N.x + Math.cos(0.6) * 2.6, z = N.z + Math.sin(0.6) * 2.6;
    const at = () => { g.teleport(x, z, g.gy(x, z)); g.P.angle = Math.atan2(N.x - x, N.z - z) + Math.PI / 2; g.hero.rotation.y = g.P.angle; };
    g.IK.on = false; at(); __run(90); const off = __yaw(R);
    g.IK.on = true; at(); __run(90); const on = __yaw(R), npc = __yaw(N.ik);
    /* herritarrak Amaiurri: haren norabidea herritarraren espazioan */
    const d = new THREE.Vector3(g.P.x - N.x, 0, g.P.z - N.z).applyQuaternion(N.ik.root.getWorldQuaternion(new THREE.Quaternion()).invert());
    return { off, on, w: +R.w.toFixed(2), npc, npcWant: +(Math.atan2(d.x, d.z) * 180 / Math.PI).toFixed(1), npcW: +N.ik.w.toFixed(2), id: N.id };
  });
  ok(Math.abs(look.off) < 12 && look.on > 50 && look.on < 70, 'Amaiur: burua herritarrari (mugaraino, 65°)', S(look));
  ok(look.npcW > 0.5 && Math.abs(look.npc - Math.max(-65, Math.min(65, look.npcWant))) < 25, 'herritarrak Amaiurri begiratzen dio', S(look));

  /* 2 · oinak: maila (hankaren % 40) ezkerreko oinaren azpian */
  const feet = await ev(() => {
    const g = __game, bx = 8, bz = -60, y0 = g.gy(bx, bz);
    const at = () => { g.teleport(bx, bz, y0); g.P.angle = 0; g.hero.rotation.y = 0; g.P.vx = g.P.vz = 0; };
    g.IK.on = false; at(); __run(90); const off = __feet();
    /* maila ezkerreko oinaren azpian (oinaren benetako lekuan; pertsonaiaren tamainaren arabera) */
    const lf = g.IK.hero.legs[0].ft.getWorldPosition(new THREE.Vector3()), rf = g.IK.hero.legs[1].ft.getWorldPosition(new THREE.Vector3());
    /* mailaren altuera: hankaren luzeraren % 40 (pertsonaia txikiaren hanka ~25 cm) */
    const R = g.IK.hero, legLen = R.legs[0].up.getWorldPosition(new THREE.Vector3()).distanceTo(R.legs[0].lo.getWorldPosition(new THREE.Vector3())) + R.legs[0].lo.getWorldPosition(new THREE.Vector3()).distanceTo(lf);
    window.__stepH = +(0.4 * legLen).toFixed(3);
    /* barruko ertza bi oinen artean (eskuineko oinetik urrun); support()-ek 7 cm-ko ertza kentzen du */
    const sep = Math.hypot(lf.x - rf.x, lf.z - rf.z), ux = (lf.x - rf.x) / sep;
    g.ZONES.ibarra.platforms.push((window.__step = { x: lf.x + ux * 0.3 * sep, z: lf.z, y: y0 + window.__stepH, bottom: y0 - 0.5, w: 1.2 * sep, d: 0.7, rot: 0, phase: -1, safe: true }));
    g.IK.on = true; at(); __run(90); const on = __feet(), hip = g.IK.hero.hips.position.y;
    /* behin eta berriz marraztuta (animaziorik gabe): ez da metatzen */
    for (let i = 0; i < 30; i++) g.draw();
    const again = __feet(), hip2 = g.IK.hero.hips.position.y;
    return { off, on, again, hip: +hip.toFixed(4), hip2: +hip2.toFixed(4), stepH: window.__stepH, gL: +(y0 + window.__stepH).toFixed(3) };
  });
  ok(feet.on[0] - feet.off[0] > 0.7 * feet.stepH, 'oina mailara igo da (hankaren % 40)', S(feet));
  ok(Math.abs(feet.on[1] - feet.off[1]) < 0.15, 'beste oina maldari jarraituz', S(feet));
  ok(Math.abs(feet.again[0] - feet.on[0]) < 0.005 && Math.abs(feet.hip2 - feet.hip) < 0.001, 'behin eta berriz marraztuta: ez da metatzen', S(feet));

  /* 3 · jauzian eta korrika: oinen IK-rik ez */
  const air = await ev(() => {
    const g = __game, R = g.IK.hero;
    g.setJumpHeld(true); g.jump();
    for (let i = 0; i < 40; i++) { g.tick(1 / 120); g.draw(); }
    g.setJumpHeld(false);
    const wfAir = +R.wf.toFixed(2);
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    for (let i = 0; i < 90; i++) { g.input.x = 0.83; g.input.z = 0.557; g.tick(1 / 120); g.draw(); }
    g.input.x = g.input.z = 0;
    return { wfAir, wfRun: +R.wf.toFixed(2), grounded: g.P.grounded };
  });
  ok(air.wfAir < 0.2 && air.wfRun < 0.2, 'jauzian eta korrika: oinak animazioari utzita', S(air));
  await ev(() => { const s = window.__step, L = __game.ZONES.ibarra.platforms; L.splice(L.indexOf(s), 1); });

  ok(errs.length === 0, 'errorerik ez', errs.slice(0, 3).join(' | '));
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
