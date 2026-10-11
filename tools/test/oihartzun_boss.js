// OIHARTZUN: Gauekoren erlojua (bossa) bot batekin, hodeien gaineko uhartean (y 42).
// Bot-ak uhinak saihesten ditu garaia aldatuz, laguntzaile hezurdurak sorginkeriaz garbitzen
// ditu eta nukleoa irekitzen denean izpiak jaurtitzen dizkio. Lau kolpe (nukleoaren ezkutua: hiru argi), bihurgunearen eszena
// eta amaierako erabakia egiaztatzen ditu.
//   NODE_PATH=$(npm root -g) node tools/test/oihartzun_boss.js http://127.0.0.1:8091/games/oihartzun.html
const { launch } = require('./_browser');
const url = (process.argv[2] || 'http://127.0.0.1:8091/games/oihartzun.html') + '?test';
(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.CAGES && window.__game.CAGES.length === 6, null, { timeout: 90000 });
  const r = await page.evaluate(() => {
    const g = window.__game, P = g.P, I5 = g.ISLANDS[5];
    g.resume();
    const steer = (dx, dz) => { const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n; g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; };
    let scenes = 0;
    const skip = () => {
      if (g.cinematicState()) { scenes++; g.endScene(); }
      const b = document.querySelector('#choices button');
      if (b && !document.getElementById('overlay').hidden) b.click();
    };
    g.saved.stage = 5; g.saved.cleared = [0, 1, 2, 3, 4]; g.saved.bossDone = false; g.saved.ending = null;
    g.teleport(0, -166, I5.y); g.boss.hits = 0; g.boss.state = 'tell'; g.boss.clock = 0; P.hp = P.maxHp;
    let t = 0, atkT = 0, hpMin = P.hp, maxAdds = 0, lockSeen = false;
    while (t < 120 && g.boss.state !== 'done') {
      skip();
      t += 1 / 120;
      atkT -= 1 / 120;
      lockSeen = lockSeen || g.CAGES[5].lock === 1;
      const alive = g.ENEMIES.filter((e) => e.state !== 'dead' && e.state !== 'spawn');
      maxAdds = Math.max(maxAdds, alive.length);
      /* uhina: gerturatzen ari den eraztunaren garaitik ihes egin */
      if (g.boss.state === 'wave') {
        const n = 1 + Math.min(2, g.boss.hits), speed = 15 + g.boss.hits * 2.5, d = Math.hypot(P.x, P.z + 179);
        for (let k = 0; k < n; k++) {
          const tt = g.boss.clock - k * 0.85, rr = 1 + tt * speed;
          if (tt > 0 && tt < 1.65 && rr < d + 2.2 && rr > d - 1.2 && g.phase() === (g.boss.attackPhase + k) % 2 && g.state().phaseCooldown <= 0) g.switchPhase();
        }
      }
      if (alive.length) {
        const e = alive.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
        if (e.era !== -1 && e.era !== g.phase() && g.state().phaseCooldown <= 0 && g.boss.state !== 'wave') g.switchPhase();
        const d = Math.hypot(e.x - P.x, e.z - P.z);
        if (d < 5) steer(P.x - e.x, P.z - e.z); else steer(-(e.z - P.z), e.x - P.x);
      } else steer(0 - P.x, -168 - P.z);
      if (Math.hypot(P.x, P.z + 168) < 1.2 && !alive.length) g.input.x = g.input.z = 0;
      if (atkT <= 0 && (alive.length || g.boss.state === 'open')) { g.attack(); atkT = 0.18; }
      hpMin = Math.min(hpMin, P.hp);
      g.tick(1 / 120);
    }
    /* bihurgunea (maskara) eta amaierako erabakia */
    for (let i = 0; i < 400; i++) { skip(); g.tick(1 / 120); }
    const twist = (g.saved.story || []).includes('twist');
    g.teleport(0, -175, I5.y);
    for (let i = 0; i < 20; i++) g.tick(1 / 120);
    return { boss: g.boss.state, hits: g.boss.hits, secs: +t.toFixed(1), hpMin, maxAdds, lockSeen, twist, scenes, nearEnding: !document.getElementById('prompt').hidden, y: +P.y.toFixed(1) };
  });
  const ok = r.boss === 'done' && r.hits === 4 && r.hpMin > 0 && r.lockSeen && r.twist && r.nearEnding;
  console.log((ok ? 'OK   ' : 'HUTS ') + JSON.stringify(r));
  console.log(ok ? 'BOSSA GARAITUTA' : 'BOSSA: HUTSEGITEA');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
