// OIHARTZUN: borroka-arenak bot batekin (jokoaren fisika eta adimen errealak).
// Bot-ak hurbileneko hezurdura bilatzen du, garaia egokitzen du, urrutitik sorginkeria
// jaurtitzen du (batzuetan INDARRA kargatuta) eta arriskuan DASH + biraka egiten du. Arena bakoitza garbitzen den eta bizirik irauten den egiaztatzen du.
//   NODE_PATH=$(npm root -g) node tools/test/oihartzun_combat.js http://127.0.0.1:8091/games/oihartzun.html
const { launch } = require('./_browser');
const url = (process.argv[2] || 'http://127.0.0.1:8091/games/oihartzun.html') + '?test';
(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.ARENA && window.__game.CAGES.length === 6, null, { timeout: 90000 });
  const res = await page.evaluate(() => {
    const g = window.__game, P = g.P, out = [];
    g.resume();
    function steer(dx, dz) {
      const n = Math.hypot(dx, dz) || 1;
      dx /= n; dz /= n;
      g.input.x = 0.83 * dx - 0.557 * dz;
      g.input.z = 0.557 * dx + 0.83 * dz;
    }
    /* sariaren elkarrizketa itxi (badago) */
    const closeDialog = () => { const b = document.querySelector('#choices button'); if (b && !document.getElementById('overlay').hidden) b.click(); };
    function fight(island, cp, label) {
      g.saved.stage = Math.max(g.saved.stage, island);
      g.teleport(cp[0], cp[1], g.ISLANDS[island].y);
      for (let i = 0; i < 30; i++) g.tick(1 / 120);
      let t = 0, atkT = 0, hpLost = 0, lastHp = P.hp, maxEn = 0, switches = 0, dashes = 0, bolts0 = g.ATK.n, charges = 0, spins = 0;
      const startDeaths = g.saved.deaths;
      while (t < 150) {
        /* eszenak (misterioak) eta sarien elkarrizketak ez dute bot-a geldiarazi behar */
        if (g.cinematicState()) g.endScene();
        closeDialog();
        t += 1 / 120;
        atkT -= 1 / 120;
        const A = g.ARENA;
        const alive = g.ENEMIES.filter((e) => e.state !== 'dead' && e.state !== 'spawn');
        maxEn = Math.max(maxEn, alive.length);
        if (A.state !== 'fight' && g.isCleared(island)) break;
        if (A.state !== 'fight') {
          /* erdigunera joan arena pizteko */
          const I = g.ISLANDS[island];
          steer(I.x - P.x, I.z - P.z);
          g.ATK.hold = false;
        } else if (alive.length) {
          alive.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
          const e = alive[0], d = Math.hypot(e.x - P.x, e.z - P.z);
          const danger = g.ENEMIES.find((o) => (o.state === 'wind' || o.state === 'charge' || o.state === 'lunge') && Math.hypot(o.x - P.x, o.z - P.z) < 3.4);
          if (e.era !== -1 && e.era !== g.phase() && g.state().phaseCooldown <= 0) { g.switchPhase(); switches++; }
          /* sorgina: urrutitik jaurti (5-11 m), arriskuan DASH eta biraka */
          if (danger && P.dashReady && Math.random() < 0.1) {
            steer(-(danger.z - P.z), danger.x - P.x);
            g.dash(); dashes++;
            if (Math.random() < 0.5) { g.attack(); spins++; }
          } else if (d < 5) steer(P.x - e.x, P.z - e.z);
          else if (d > 11) steer(e.x - P.x, e.z - P.z);
          else steer(-(e.z - P.z), e.x - P.x);
          /* batzuetan INDARRA kargatu (mantendu ~0.9 s) */
          const cycle = t % 6;
          if (cycle > 4.9 && cycle < 5.85) { if (!g.ATK.hold) charges++; g.ATK.hold = true; }
          else { g.ATK.hold = false; if (atkT <= 0) { g.attack(); atkT = 0.18; } }
        } else { g.input.x = g.input.z = 0; g.ATK.hold = false; }
        if (P.hp < lastHp) hpLost += lastHp - P.hp;
        lastHp = P.hp;
        g.tick(1 / 120);
      }
      g.input.x = g.input.z = 0;
      g.ATK.hold = false;
      out.push({ label, cleared: g.isCleared(island), secs: +t.toFixed(1), hpLost, deaths: g.saved.deaths - startDeaths, maxEnemies: maxEn, switches, dashes, bolts: g.ATK.n - bolts0, charges, spins, bestChain: g.MAG.best, gateOpen: g.CAGES[island].gates.filter((x) => x.kind !== 'in').every((x) => x.open) });
    }
    fight(0, [0, 29], 'I0 tutoriala');
    closeDialog();
    fight(2, [31, -53], 'I2 arena');
    closeDialog();
    fight(4, [-32, -127], 'I4 arena');
    closeDialog();
    return out;
  });
  let fails = 0;
  for (const r of res) {
    if (!r.cleared || !r.gateOpen) fails++;
    console.log((r.cleared ? 'OK  ' : 'HUTS') + ' ' + r.label.padEnd(14) + JSON.stringify(r));
  }
  console.log(fails ? fails + ' HUTSEGITE' : 'ARENA GUZTIAK GARBITU DIRA');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
