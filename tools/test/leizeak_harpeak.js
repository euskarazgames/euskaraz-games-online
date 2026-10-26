// LEIZEEN DEIA: kamera berria (GOITIK / ATZETIK / HORMA) eta ANBOTOKO HARPEAK (sigiloa), ?test kakoekin.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_harpeak.js http://127.0.0.1:8091/games/leizeak.html
// Jokoaren begizta geldirik (__hold) eta tick-ak eskuz: emaitza berdina makina azkar zein motelean.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const S = (o) => JSON.stringify(o);
  const KX = 3300;

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; __game.saved.flags.push('intro', 'irati1', 'prologoa'); });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const tp = (x, z, y = 0) => ev(([x, z, y]) => { const g = __game; g.teleport(x, z, y); g.P.vx = g.P.vz = 0; g.CAM.pos = null; }, [x, z, y]);
  /* munduko norabidean ibili (makila kameraren biraketatik) */
  const walk = (dx, dz, n) => ev(([dx, dz, n]) => { const g = __game; for (let i = 0; i < n; i++) { g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } g.input.x = g.input.z = 0; }, [dx, dz, n]);
  const skipFilms = async () => { for (let i = 0; i < 12; i++) { const on = await ev(() => __game.FILM.on || !!__game.cinematicState()); if (!on) break; await ev(() => { if (__game.FILM.on) __game.filmSkip(); else __game.endScene(); }); await page.waitForTimeout(80); } };
  const st = () => ev(() => { const g = __game; return { zone: g.ZONE.cur, x: +g.P.x.toFixed(2), z: +g.P.z.toFixed(2), area: g.state().area, phase: g.SIG.phase, t: +g.SIG.t.toFixed(1), guards: g.SIG.guards.length }; });
  /* zaindari bat geldi eta begira (probak kontrolatzeko); besteak lotan */
  const freeze = (i, x, z, look) => ev(([i, x, z, look]) => { const e = __game.SIG.guards[i], Z = e.zain; e.x = x; e.z = z; e.vx = e.vz = 0; Object.assign(Z, { mode: 'patrol', wait: 999, lookBase: look, lookT: 0, lookDir: look, sus: 0 }); e.dir = look; e.state = 'look'; }, [i, x, z, look]);
  const sleepAll = (except = []) => ev((except) => __game.SIG.guards.forEach((e, i) => { if (!except.includes(i)) Object.assign(e.zain, { mode: 'sleep', sleepT: 999 }); }), except);

  /* 1 · kamera: GOITIK lehenetsia (hurbilago), ATZETIK aukeran (O), gordeta */
  ok((await ev(() => __game.CAM.mode)) === 'goitik', 'kamera: GOITIK lehenetsia');
  await tp(4, 30);
  const camDist = () => ev(() => { const g = __game; for (let i = 0; i < 8; i++) g.draw(); return +g.camera.position.distanceTo(g.hero.position).toFixed(1); });
  const dG = await camDist();
  await ev(() => __game.camModeToggle());
  ok((await ev(() => __game.CAM.mode)) === 'atzetik' && (await ev(() => localStorage.getItem('leizeak-kamera'))) === 'atzetik', 'O: ATZETIK (gordeta)');
  const dA = await camDist();
  await ev(() => __game.camModeToggle());
  ok((await ev(() => __game.CAM.mode)) === 'goitik', 'berriro GOITIK');
  ok(dG < dA && dG < 30, 'GOITIK hurbilago', S({ goitik: dG, atzetik: dA }));
  const pitch = await ev(() => { const g = __game; for (let i = 0; i < 8; i++) g.draw(); const c = g.camera.position, h = g.hero.position; return +(Math.atan2(c.y - h.y, Math.hypot(c.x - h.x, c.z - h.z)) * 180 / Math.PI).toFixed(0); });
  ok(pitch > 40, 'GOITIK: goitik begira', pitch + '°');

  /* 2 · ANBOTOKO HARPEAK: plazan Irati → suzko bola → Gauekoren ekaitzak bota du, mendiaren barrutik */
  await ev(() => { __game.saved.flags.push('inguma', 'irati-inguma'); __game.teleport(0, 38, 0); });
  await ev(() => __game.anbotoStart());
  ok(await ev(() => !!__game.cinematicState()), 'Irati: Anbotora (elkarrizketa)');
  for (let i = 0; i < 12 && !(await ev(() => __game.FILM.on)); i++) { await ev(() => __game.endScene()); await page.waitForTimeout(60); }
  ok(await ev(() => __game.FILM.on), 'suzko bolaren hegaldia (zinema)');
  await ev(() => __game.filmSkip());
  await page.waitForTimeout(100);
  ok((await ev(() => __game.ZONE.cur)) === 'harpeak' && (await ev(() => __game.FILM.on)), 'ekaitza: lurreratzeko zinema, harpeetan');
  ok(!(await ev(() => __game.saved.flags.includes('harpeak'))), 'gailurra oraindik ez');
  await skipFilms();
  let s = await st();
  ok(s.zone === 'harpeak', 'ANBOTOKO HARPEAK', S(s));
  ok(s.guards === 6 && (await ev(() => __game.SIG.eyes.length)) === 2 && (await ev(() => __game.SIG.threads.length)) === 3, 'sei zaindari, bi begi-harri, hiru izotz-hari');
  ok(await ev(() => !document.getElementById('radar').hidden && document.getElementById('map').classList.contains('sig')), 'oihartzun-radarra (mapa txikiaren ordez)');
  ok(await ev(() => __game.SIG.guards.every((e) => e.zain.cone.visible)), 'argi-konoak lurrean');
  ok((await ev(() => __game.objective()[0])).length > 10, 'helburua', await ev(() => __game.objective()[0]));

  /* 3 · B gela: kontrol-puntua */
  await tp(KX, -21);
  await T(30);
  s = await st();
  ok(s.area === 'hB' && (await ev(() => __game.saved.cp && __game.saved.cp.zone === 'harpeak' && __game.saved.cp.z < -18)), 'ZAINTZA-GELA: kontrol-puntua', S(s));

  /* 4 · begirada: aurrean → susmoa → IKUSI ZAITU → ALERTA, indargarriak */
  await sleepAll([0]);
  await freeze(0, KX, -30, 0);
  await tp(KX, -24.5);
  await T(30);
  const sus = await ev(() => __game.SIG.guards[0].zain.sus);
  ok(sus > 0.1, 'susmoa hazten', sus.toFixed(2));
  await T(150);
  s = await st();
  ok(s.phase === 1, 'IKUSI ZAITU: ALERTA', S(s));
  ok(s.guards >= 8, 'indargarriak lurretik', s.guards);
  ok(await ev(() => !document.getElementById('sigBanner').hidden && document.getElementById('sigBanner').textContent.startsWith('ALERTA')), 'ALERTA bannerra', await ev(() => document.getElementById('sigBanner').textContent));
  ok(await ev(() => __game.SIG.guards.filter((e) => e.state !== 'dead').every((e) => ['hunt', 'wake', 'sleep'].includes(e.zain.mode))), 'zaindariak ehizan');

  /* 5 · ihes egin: urrun eta ikusi gabe → IHESA → ZAINTZA → lasai */
  await tp(KX, 6);
  await ev(() => { __game.P.hp = __game.P.maxHp; });
  await T(120 * 15);
  s = await st();
  ok(s.phase === 2, 'IHESA (bilatzen)', S(s));
  await T(120 * 10.5);
  s = await st();
  ok(s.phase === 3, 'ZAINTZA', S(s));
  ok((await ev(() => __game.SIG.guards.filter((e) => e.zain.temp && e.state !== 'dead').length)) === 0, 'indargarriak itzalera');
  await T(120 * 12.5);
  s = await st();
  ok(s.phase === 0 && (await ev(() => document.getElementById('sigBanner').hidden)), 'lasai berriro', S(s));

  /* 6 · itzal-zokoa: begiradaren barruan, baina ilunpean → ez zaitu ikusten */
  await ev(() => __game.sigReset());
  await sleepAll([0]);
  const hide = await ev(() => __game.SIG.hides.find((h) => h.z > -30 && h.z < -18));
  await freeze(0, hide.x, hide.z - 6, 0);
  await tp(hide.x, hide.z);
  await T(240);
  s = await st();
  ok(s.phase === 0 && (await ev(() => __game.SIG.guards[0].zain.sus)) < 0.35, 'itzal-zokoan: ikusezina', S(s));
  await tp(hide.x + 2.8, hide.z - 0.5);
  await T(150);
  ok((await ev(() => __game.SIG.phase)) === 1 || (await ev(() => __game.SIG.guards[0].zain.mode)) === 'suspect', 'itzaletik kanpo: ikusia');

  /* 7 · LOTARAZI: atzetik, oharkabean */
  await ev(() => __game.sigReset());
  await sleepAll([1]);
  await freeze(1, KX, -60, Math.PI / 2);
  await tp(KX - 1.8, -60);
  await T(4);
  let act = await ev(() => { const a = __game.actionHere(); return a && a.label; });
  ok(act === 'LOTARAZI', 'atzetik: LOTARAZI', act);
  await ev(() => __game.interact());
  await T(120);
  ok((await ev(() => __game.SIG.guards[1].zain.mode)) === 'sleep' && (await ev(() => !__game.SIG.guards[1].zain.cone.visible)), 'zaindaria lo (konorik ez)');
  ok((await ev(() => __game.SIG.sleeps)) >= 1, 'lo-kontagailua');
  await tp(KX + 1.6, -60);
  await T(4);
  act = await ev(() => { const a = __game.actionHere(); return a && a.label; });
  ok(act !== 'LOTARAZI', 'lotan dagoenari ez berriro', act);

  /* 8 · TOK-TOK: hormari jo → ate ondoko zaindaria hotsera */
  await ev(() => __game.sigReset());
  await sleepAll([2]);
  await freeze(2, KX - 6, -85.6, 0);
  await tp(KX - 13.6, -88.4);
  await T(4);
  act = await ev(() => { const a = __game.actionHere(); return a && a.label; });
  ok(act === 'TOK-TOK', 'hormaren ondoan: TOK-TOK', act);
  await ev(() => __game.interact());
  await T(10);
  const g2 = await ev(() => { const Z = __game.SIG.guards[2].zain; return { mode: Z.mode, t: Z.target && [+Z.target.x.toFixed(1), +Z.target.z.toFixed(1)] }; });
  ok(g2.mode === 'suspect' && g2.t && Math.abs(g2.t[0] - (KX - 13.6)) < 1, 'zaindaria hotsera dator', S(g2));
  await tp(KX - 1, -73);
  await T(120 * 2.5);
  const g2b = await ev(() => { const e = __game.SIG.guards[2]; return { x: +(e.x - 3300).toFixed(1), z: +e.z.toFixed(1) }; });
  ok(g2b.x < -7, 'atetik aldendu da', S(g2b));

  /* 9 · izotz-hariak: orainean alarma; iraganean bidea libre */
  await ev(() => __game.sigReset());
  await sleepAll([]);
  if ((await ev(() => __game.phase())) !== 1) await ev(() => __game.switchPhase());
  await T(30);
  await tp(KX - 6, -100.4);
  await walk(0, -1, 60);
  ok((await ev(() => __game.SIG.phase)) === 1, 'izotz-haria (orainean): alarma');
  await ev(() => __game.sigReset());
  await sleepAll([]);
  await ev(() => __game.switchPhase());
  await T(40);
  ok((await ev(() => __game.phase())) === 0, 'IRAGANA');
  await tp(KX - 6, -100.4);
  await walk(0, -1, 60);
  ok((await ev(() => __game.SIG.phase)) === 0 && (await ev(() => __game.P.z)) < -102.5, 'iraganean hariak ez daude', S(await st()));
  await ev(() => __game.switchPhase());
  await T(40);

  /* 10 · HORMA: hormari itsatsita, alboetara, eta kamera izkinaren atzera */
  await ev(() => __game.sigReset());
  await sleepAll([]);
  await tp(KX - 14, -40);
  await walk(-1, 0, 70);
  ok(await ev(() => __game.HORMA.on), 'HORMA: hormari itsatsita');
  const z0 = await ev(() => __game.P.z);
  await walk(0, -1, 90);
  const hz = await ev(() => ({ on: __game.HORMA.on, k: +__game.HORMA.k.toFixed(2), x: +(__game.P.x - 3300).toFixed(2), z: +__game.P.z.toFixed(2) }));
  ok(hz.on && hz.z < z0 - 1.2 && Math.abs(hz.x + 14.2) < 0.6, 'alboetara irristatu (hormaren kontra)', S(hz));
  ok(hz.k > 0.5, 'horma-kamera', hz.k);
  await walk(1, 0, 40);
  ok(!(await ev(() => __game.HORMA.on)), 'hormatik aldendu: askatu');
  await ev(() => { __game.CAM.wallView = false; });
  await tp(KX - 14, -40);
  await walk(-1, 0, 70);
  ok(!(await ev(() => __game.HORMA.on)), 'HORMA-IKUSPEGIA itzalita: ez itsatsi');
  await ev(() => { __game.CAM.wallView = true; });

  /* 11 · ataria: alarman atea itxita; lasai, ireki; gailurrera */
  await ev(() => __game.sigReset());
  await sleepAll([]);
  await ev(() => __game.SIG.eyes.forEach((E) => (E.range = 0.1)));
  await ev(() => __game.sigSpotted(null));
  await tp(KX, -158.5);
  await T(30);
  ok(!(await ev(() => __game.HK.gate.open)), 'alarman: atea itxita');
  await ev(() => __game.sigReset());
  await sleepAll([]);
  await T(30);
  ok(await ev(() => __game.HK.gate.open), 'lasai: atea irekita');
  await T(240);
  await walk(0, -1, 150);
  ok((await ev(() => __game.saved.flags.includes('harpeak'))) && (await ev(() => __game.FILM.on)), 'gailurrera (harpeak bandera, zinema)');
  ok((await ev(() => __game.saved.harpeak && __game.saved.harpeak.rank)) !== undefined, 'emaitza gordeta', S(await ev(() => __game.saved.harpeak)));
  await skipFilms();
  await T(60);
  s = await st();
  ok(s.zone === 'anboto', 'ANBOTOko gailurra', S(s));
  ok(await ev(() => document.getElementById('radar').hidden && !document.getElementById('map').classList.contains('sig')), 'radarra itzalita');

  /* 12 · kontrol-puntura: zaindariak bideetara */
  await ev(() => __game.enterZone('harpeak', { x: 3300, y: 0, z: -20.5, cp: true }, true));
  await T(10);
  await ev(() => __game.sigSpotted(null));
  await T(10);
  await ev(() => __game.returnCheckpoint());
  await T(10);
  s = await st();
  ok(s.phase === 0 && s.guards === 6, 'kontrol-puntura: alarma itzalita, sei zaindari', S(s));

  /* 13 · ibilbidea oinez, alarmarik gabe: bot batek zaindariei begira itxaroten du (teleportik gabe) */
  await ev(() => {
    const g = __game;
    g.saved.flags = g.saved.flags.filter((f) => f !== 'harpeak');
    g.HK.ending = false;
    g.HK.eyeC.range = 10.5;
    g.HK.eyeE.range = 12;
    if (g.phase() !== 1) g.switchPhase();
    g.teleport(3300, 5, 0);
    g.sigReset();
    g.SIG.alarms = g.SIG.sleeps = g.SIG.knocks = 0;
    g.HK.t0 = 0;
    const AD = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
    window.__ag = {
      /* posizio bat arriskutsua da zaindari edo begi-harri batek (orain edo laster) ikus badezake */
      danger(px, pz) {
        for (const e of g.SIG.guards) {
          if (e.state === 'dead') continue;
          const Z = e.zain;
          if (Z.mode === 'sleep' || Z.mode === 'wake') continue;
          const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1;
          if (d < 2.2) return e;
          if (d > Z.range + 2.4 || g.sigRay(e.x, e.z, dx / d, dz / d, d) < d - 0.4) continue;
          const a = Math.atan2(dx, dz);
          if (AD(a, Z.lookDir) < Z.fov + 0.38) return e;
          const p = Z.def.path[Z.i % Z.def.path.length], nearWp = Math.hypot(p[0] - e.x, p[1] - e.z) < 2.5;
          if ((Z.wait > 0 || nearWp) && AD(a, nearWp && Z.wait <= 0 ? p[3] ?? e.dir : Z.lookBase) < Z.fov + 1.1) return e;
        }
        for (const E of g.SIG.eyes) {
          const dx = px - E.x, dz = pz - E.z, d = Math.hypot(dx, dz) || 1;
          if (d > E.range + 2 || g.sigRay(E.x, E.z, dx / d, dz / d, d) < d - 0.4) continue;
          if (AD(Math.atan2(dx, dz), E.dir) < E.fov + 0.55) return E;
        }
        return null;
      },
      go(tx, tz, maxSec, back) {
        for (let i = 0; i < maxSec * 120; i++) {
          if (g.SIG.alarms > 0) return { ok: false, why: 'alarma', x: +g.P.x.toFixed(1), z: +g.P.z.toFixed(1) };
          /* irteera: gailurrera (zona aldatu da) */
          if (g.ZONE.cur !== 'harpeak') { g.input.x = g.input.z = 0; return { ok: true, left: true }; }
          const dx = tx - g.P.x, dz = tz - g.P.z, d = Math.hypot(dx, dz);
          if (d < 0.45) { g.input.x = g.input.z = 0; return { ok: true }; }
          const ux = dx / d, uz = dz / d, la = Math.min(d, 1.6), here = this.danger(g.P.x, g.P.z);
          let mx = 0, mz = 0;
          if (!here && !this.danger(g.P.x + ux * la, g.P.z + uz * la)) (mx = ux), (mz = uz);
          else if (here && back) {
            const bx = back[0] - g.P.x, bz = back[1] - g.P.z, bd = Math.hypot(bx, bz) || 1;
            if (bd > 0.4 && !this.danger(g.P.x + (bx / bd) * 1.2, g.P.z + (bz / bd) * 1.2)) (mx = bx / bd), (mz = bz / bd);
          }
          g.input.x = 0.83 * mx - 0.557 * mz;
          g.input.z = 0.557 * mx + 0.83 * mz;
          g.tick(1 / 120);
          g.zoneFadeUpdate(1 / 120);
          if (g.FILM.on || g.cinematicState()) { g.input.x = g.input.z = 0; if (g.FILM.on) g.filmSkip(); else g.endScene(); }
        }
        g.input.x = g.input.z = 0;
        return { ok: false, why: 'denbora', x: +g.P.x.toFixed(1), z: +g.P.z.toFixed(1) };
      },
    };
  });
  const route = [
    [KX, -10], [KX, -20], [KX - 12, -22], [KX - 12, -42], [KX + 6, -46], [KX + 6, -52], [KX + 6, -56], [KX + 13, -60], [KX + 13, -86], [KX + 13, -88.4], [KX - 2, -88.4], [KX - 6, -91.5], [KX - 6, -95], [KX - 6, -98.5],
    'IRAGANA', [KX - 13, -101], [KX - 13, -124], [KX - 6, -127], [KX - 6, -130.5], [KX - 6, -134], [KX - 12.5, -137], [KX - 12.5, -150], [KX - 3, -159], [KX, -161.5], [KX, -167],
  ];
  let prev = [KX, 5], walked = 0, bad = null;
  for (const w of route) {
    if (w === 'IRAGANA') { await ev(() => { if (__game.phase() !== 0) __game.switchPhase(); for (let i = 0; i < 30; i++) __game.tick(1 / 120); }); continue; }
    const r = await ev(([x, z, back]) => __ag.go(x, z, 90, back), [w[0], w[1], prev]);
    if (!r.ok) { bad = { at: w, ...r }; break; }
    walked++;
    prev = w;
  }
  ok(!bad && walked === route.length - 1, 'ibilbidea oinez, bost gelak', bad ? S(bad) : walked + ' puntu');
  const fin = await ev(() => ({ alarms: __game.SIG.alarms, flag: __game.saved.flags.includes('harpeak'), rank: __game.saved.harpeak && __game.saved.harpeak.rank }));
  ok(fin.alarms === 0 && fin.flag && fin.rank === 'ITZALA', 'alarmarik gabe: ITZALA', S(fin));

  console.log(errs.length ? 'ERRORE:\n' + errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
