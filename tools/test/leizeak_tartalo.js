// LEIZEEN DEIA: TARTALOREN KOBA hasieratik amaierara (bot-a, ?test kakoekin, tick-ak eskuz).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_tartalo.js http://127.0.0.1:8091/games/leizeak.html
// Lepoa → sutegiak → ardi-korta (borroka) → begiaren gela (ezkutuka, giltza) → burruntziaren sutegia
// (zaindaria, SUGAR-IZPIA) → hesia erre → izotza urtu → galdara garaia → lau galdarak (giltza nagusia)
// → Tartalo (galdarak piztu → itsutu → begia jo, hiru aldiz) → irteera → helburua: Irati.
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
  /* gordetako partida: bigarren leizea amaituta eta lepoa irekita */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa');
    s.rhythms.push('esnatu', 'entzun');
    s.items.push('katea', 'giltzanagusia', 'adarra', 'orrazia', 'giltzanagusia-lamia');
    s.hearts = 2;
  });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; });

  /* laguntzaileak */
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skip = () => ev(() => { const g = __game; for (let k = 0; k < 4; k++) { for (let i = 0; i < 10 && g.cinematicState(); i++) g.endScene(); if (g.GET.on) { g.GET.t = 9; g.itemGetClose(); } } });
  const tp = (x, y, z) => ev(([x, y, z]) => { const g = __game; g.teleport(x, z, y); for (let i = 0; i < 6; i++) g.tick(1 / 120); }, [x, y, z]);
  const walk = (dx, dz, secs, run = false) => ev(([dx, dz, secs, run]) => {
    const g = __game, n = Math.hypot(dx, dz) || 1;
    dx /= n; dz /= n;
    g.input.x = 0.83 * dx - 0.557 * dz;
    g.input.z = 0.557 * dx + 0.83 * dz;
    g.input.keys.ShiftLeft = run;
    for (let i = 0; i < Math.round(secs * 120); i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    g.input.x = g.input.z = 0;
    g.input.keys.ShiftLeft = false;
    for (let i = 0; i < 12; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); }
    return { x: +g.P.x.toFixed(2), y: +g.P.y.toFixed(2), z: +g.P.z.toFixed(2), zone: g.ZONE.cur, room: g.state().room, hp: g.P.hp, resp: g.state().respawnTimer };
  }, [dx, dz, secs, run]);
  const goTo = async (x, z, run = false) => { const c = await ev(() => [__game.P.x, __game.P.z]); const d = Math.hypot(x - c[0], z - c[1]); return walk(x - c[0], z - c[1], d / (run ? 12.8 : 7.7), run); };
  const route = async (pts) => { let p; for (const [x, z] of pts) p = await goTo(x, z); return p; };
  const face = (a) => ev((a) => { __game.P.angle = a; __game.hero.rotation.y = a; }, a);
  const faceTo = (x, z) => ev(([x, z]) => { const g = __game, a = Math.atan2(x - g.P.x, z - g.P.z); g.P.angle = a; g.hero.rotation.y = a; }, [x, z]);
  /* INDARRA: kargatu eta askatu (SUGAR-IZPIA, BURRUNTZI GORIA badu) */
  /* botoiari eutsi (0.3 s → kargatzen hasi, 0.7 s → beteta) eta askatu */
  const fire = async (secs = 1.1) => { await ev(() => { __game.MAG.cd = 0; __game.ATK.hold = true; }); await T(Math.round(secs * 120)); await ev(() => { __game.ATK.hold = false; }); await T(80); };
  const until = async (f, maxTicks = 3000, a) => { for (let i = 0; i < maxTicks; i += 20) { if (await ev(f, a)) return true; await T(20); } return false; };
  const S = (p) => JSON.stringify(p);
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);
  const cleared = (k) => ev((k) => __game.isCleared(k), k);
  const E = (x) => 1200 + x;
  /* ekin (E): ekintzarik ez badago, ez sakatu (bestela boterearen menua irekitzen da) */
  const open = async () => { const a = await ev(() => { const a = __game.actionHere(); if (a) __game.interact(); return a ? a.kind : null; }); await T(30); await skip(); await T(10); return a; };

  /* 0 · haranean: helburua Tartaloren koba; lepotik kobaren ahora */
  const obj0 = await ev(() => __game.objective());
  ok(/TARTALOREN KOBA/.test(obj0[0]), 'haraneko helburua: Tartaloren koba', obj0[0]);
  await tp(-74.6, 9.4, -103);
  let p = await route([[-74.6, -108], [-70, -116], [-70, -124]]);
  ok(p.y > 11 && p.zone === 'ibarra', 'lepoaren gainean (haize-errotaren atetik)', S(p));
  p = await goTo(-70, -129.5);
  await T(120);
  p = await ev(() => ({ zone: __game.ZONE.cur, x: __game.P.x, z: __game.P.z }));
  ok(p.zone === 'tartalo', 'kobaren ahotik → TARTALOREN KOBA', S(p));
  await skip();

  /* 1 · T1: bi sutegiak SORGINKERIAz (elkarren segidan) → barrak */
  await tp(E(0), 0, 2);
  await faceTo(E(-7), -6);
  await ev(() => { __game.MAG.cd = 0; __game.attack(); });
  await T(50);
  await faceTo(E(7), -6);
  await ev(() => { __game.MAG.cd = 0; __game.attack(); });
  await T(90);
  ok(await cleared('tA-fire'), 'T1: bi sutegiak piztuta');
  await T(120);
  p = await route([[E(0), -8], [E(0), -14], [E(0), -20], [E(0), -28]]);
  ok(p.room === 'T2' && p.z < -25, 'barrak irekita → ardi-korta', S(p));

  /* 2 · T2: borroka → mendebaldeko barrak; izotzeko kutxa itxita */
  await T(200);
  ok((await ev(() => __game.state().fight)) === 'T2', 'ardi-korta: borroka hasi');
  for (let w = 0; w < 6 && (await ev(() => !!__game.state().fight)); w++) {
    await ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
    await T(400);
  }
  ok(await cleared('T2'), 'ardi-korta garbituta');
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('tB-w')), 'mendebaldeko barrak irekita');
  await route([[E(-6), -42], [E(-8.9), -47.9]]);
  const frozen = await ev(() => { const g = __game, C = g.CHESTS.find((c) => c.id === 'tB-piece'); return { near: +Math.hypot(g.P.x - C.x, g.P.z - C.z).toFixed(2), act: g.actionHere() ? g.actionHere().kind : null }; });
  await open();
  ok(frozen.act === 'locked' && !(await ev(() => __game.saved.chests.includes('tB-piece'))) && !(await ev(() => __game.state().paused)), 'izotzeko kutxa: oraindik ezin ireki (pista)', S(frozen));

  /* 3 · T3: begiaren gela — ikusi → sarrerara; ezkutuka → giltza */
  p = await route([[E(-8), -39], [E(-14), -39], [E(-19), -39]]);
  /* begiaren aurrean jarri: harrapatu → sarrerara */
  const caught = await ev(() => {
    const g = __game, Eo = g.EYE, ox = Eo.cone.position.x, oz = Eo.cone.position.z, a = Eo.a;
    g.teleport(ox + Math.sin(a) * 12, oz + Math.cos(a) * 12, 0);
    const R = g.DGT.rooms.T3;
    for (let i = 0; i < 240; i++) {
      /* begirada jarraitu (estalgirik gabeko lekuan) */
      if (i % 20 === 0 && g.P.x < R.x + R.w / 2 - 2) { const b = Eo.a; g.teleport(ox + Math.sin(b) * 12, oz + Math.cos(b) * 12, 0); }
      g.tick(1 / 120);
      if (g.P.x > R.x + R.w / 2 - 0.8) return { ok: true, x: g.P.x, z: g.P.z };
    }
    return { ok: false, x: g.P.x, z: g.P.z, alert: Eo.alert };
  });
  ok(caught.ok, 'Tartaloren begiak ikusi → sarrerara itzuli', S(caught));
  await T(260);
  /* ezkutuka: harrien itzaletan, begirada urruntzen denean bakarrik mugitu */
  const sneak = async (groups) => {
    for (const pts of groups) {
      let safe = false;
      for (let tries = 0; tries < 160 && !safe; tries++) {
        safe = await ev((pts) => {
          const g = __game, Eo = g.EYE, R = g.DGT.rooms.T3, ox = Eo.cone.position.x, oz = Eo.cone.position.z;
          g.eyeOccluders();
          let px = g.P.x, pz = g.P.z, t = Eo.t;
          for (const [x, z] of pts) {
            const d = Math.hypot(x - px, z - pz), dur = d / 7.7 + 0.15;
            for (let k = 0; k <= 10; k++) {
              const f = k / 10, qx = px + (x - px) * f, qz = pz + (z - pz) * f, tt = t + dur * f + 0.35;
              for (const lag of [0, 0.35]) {
                const a = Math.max(-0.95, Math.min(0.95, 1.3 * Math.sin((tt - lag) * 0.42)));
                const dx = qx - ox, dz = qz - oz, dd = Math.hypot(dx, dz) || 1, ang = Math.atan2(dx, dz);
                if (qx > R.x + R.w / 2 - 0.8) continue;
                if (Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a))) < Eo.half + 0.14 && dd < g.eyeRay(ox, oz, dx / dd, dz / dd, R) + 0.6) return false;
              }
            }
            px = x;
            pz = z;
            t += dur;
          }
          return true;
        }, pts);
        if (!safe) await T(24);
      }
      for (const [x, z] of pts) await goTo(x, z);
    }
    return ev(() => ({ x: +__game.P.x.toFixed(2), z: +__game.P.z.toFixed(2) }));
  };
  const S1 = [E(-25.1), -43.7], S3 = [E(-28.76), -50.6], S4 = [E(-42.75), -53.6], CORNER = [E(-42.6), -60.6];
  p = await sneak([[[E(-21.6), -39], S1], [[E(-23.2), -47.5], S3], [S4], [[E(-43.4), -56.5], CORNER]]);
  ok(Math.hypot(p.x - CORNER[0], p.z - CORNER[1]) < 1.2, 'ezkutuka iparraldeko izkinaraino (harrapatu gabe)', S(p));
  /* izkina: begiradak ez du inoiz ikusten (bira oso bat) */
  const watch = await ev(() => { const g = __game, x0 = g.P.x; for (let i = 0; i < 120 * 16; i++) { g.tick(1 / 120); if (Math.abs(g.P.x - x0) > 3) return false; } return true; });
  ok(watch, 'izkina segurua: begirada osoan ez da ikusten');
  await open();
  ok((await ev(() => __game.keysHere())) === 1, 'GILTZA TXIKIA (begiaren gelan)');
  p = await sneak([[[E(-43.4), -56.5], S4], [S3], [[E(-23.2), -47.5], S1], [[E(-21.6), -39], [E(-18), -39]]]);
  ok(p.x > E(-20), 'ezkutuka sarrerara itzuli', S(p));

  /* 4 · T2 iparreko atea (giltza) → T4 zaindaria → BURRUNTZI GORIA */
  await route([[E(-10), -39], [E(0), -45], [E(0), -51.5]]);
  await face(Math.PI);
  await open();
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('tB-n')), 'ardi-kortako iparreko atea irekita (giltza)');
  p = await route([[E(0), -57], [E(0), -63], [E(0), -69]]);
  await T(60);
  ok(await ev(() => !!__game.MINI.e), 'BURRUNTZI-ZAINA: zaindaria esnatu', S(p));
  await ev(() => { const g = __game; for (const e of g.ENEMIES) if (e.state !== 'dead') g.killEnemy(e); });
  await T(30);
  await page.waitForTimeout(1300);
  await T(60);
  ok(await cleared('tD-mini'), 'zaindaria garaituta');
  await route([[E(0), -72.2]]);
  await open();
  ok(await ev(() => __game.saved.items.includes('sugarra')), 'BURRUNTZI GORIA (SUGAR-IZPIA) eskuratuta');
  ok(await ev(() => __game.hasFire()), 'INDARRA orain sua da');

  /* 5 · T2: hesia erre; izotzeko kutxa urtu */
  await route([[E(0), -62], [E(0), -50], [E(8), -39]]);
  await face(Math.PI / 2);
  await fire();
  ok(await cleared('tB-hesia'), 'ekialdeko hesia erre da (SUA)');
  await route([[E(-4), -44]]);
  await faceTo(E(-11.4), -50.4);
  await fire();
  ok(await cleared('tB-ice'), 'kutxaren izotza urtu da');
  p = await route([[E(-10.2), -49]]);
  const act = await open();
  ok(await ev(() => __game.saved.pieces.includes('tartalo')), 'izotzeko kutxa: ARNASA-ZATIA', S({ p, act }));

  /* 6 · T5: Gauekoren izotz-horma → galdara garaia → barrak */
  p = await route([[E(4), -39], [E(12), -39], [E(19), -39], [E(26.6), -39]]);
  ok(p.room === 'T5' || p.x > E(22), 'izotz-hesiaren gelan', S(p));
  p = await goTo(E(34), -39);
  ok(p.x < E(29.6), 'izotz-hormak geldiarazten du', S(p));
  await face(Math.PI / 2);
  await fire();
  ok(await cleared('tE-ice'), 'Gauekoren izotz-horma urtu da');
  p = await route([[E(33), -40], [E(38), -44]]);
  ok(p.x > E(36), 'izotza zeharkatu', S(p));
  await fire();
  ok(await cleared('tE-galdara'), 'galdara garaia piztuta (SUA urrutitik)');
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('tE-n')), 'iparreko barrak irekita');

  /* 7 · T6: lau galdarak batera → giltza nagusia */
  p = await route([[E(37.2), -50], [E(37.2), -57], [E(37.2), -64], [E(37.2), -72]]);
  ok(p.room === 'T6', 'galdaren gelan', S(p));
  for (let k = 0; k < 4; k++) await fire(1.05);
  await T(60);
  ok(await cleared('tF-galdarak'), 'lau galdarak piztuta (denak batera)');
  p = await route([[E(37.2), -75.6]]);
  await open();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia-tartalo')), 'GILTZA NAGUSIA (tartalo)');

  /* 8 · T4 ate handia → T7 Tartalo */
  p = await route([[E(37.2), -64], [E(37.2), -56], [E(37.2), -46], [E(26), -39], [E(16), -39], [E(8), -39], [E(0), -48], [E(0), -60], [E(0), -76], [E(0), -90.5]]);
  await face(Math.PI);
  await open();
  await T(150);
  ok(await ev(() => __game.saved.doors.includes('tD-n')), 'ate handia irekita (giltza nagusia)');
  p = await route([[E(0), -96], [E(0), -100], [E(0), -105]]);
  await T(80);
  ok(await ev(() => __game.BOSS.on && __game.BOSS.kind === 'tartalo'), 'Tartalo: borroka hasi', S(p));
  await skip();
  await T(60);
  const SPOTS = [[E(0), -117], [E(-4), -117], [E(4), -117], [E(0), -113], [E(0), -121]];
  for (let round = 0; round < 3; round++) {
    /* lau galdarak SUArekin (urrutitik: INDARRA) */
    let blind = false;
    for (let k = 0; k < 14 && !blind; k++) {
      await ev((SP) => {
        const g = __game, T0 = g.TART;
        let best = SP[0], bd = -1;
        for (const s of SP) { const d = Math.hypot(s[0] - T0.x, s[1] - T0.z); if (d > bd) { bd = d; best = s; } }
        g.teleport(best[0], best[1], 0);
        g.P.hp = g.P.maxHp;
      }, SPOTS);
      await fire(1.05);
      await ev(() => { __game.P.hp = __game.P.maxHp; });
      blind = await ev(() => __game.TART.state === 'blind');
    }
    const vul = await until(() => __game.BOSS.vulnerable(), 400);
    ok(blind && vul, `${round + 1}. txanda: lau galdarak piztuta → itsututa, begia agerian`);
    await ev(() => { const g = __game; if (!g.LOCK.target) g.lockToggle(); });
    const hp1 = await ev(() => __game.TART.hp + __game.TART.rounds * 100);
    for (let k = 0; k < 20 && (await ev(() => __game.BOSS.vulnerable())); k++) {
      await ev(() => { __game.MAG.cd = 0; __game.attack(); __game.P.hp = __game.P.maxHp; });
      await T(30);
    }
    const hp2 = await ev(() => __game.TART.hp + __game.TART.rounds * 100);
    ok(hp2 < hp1, `${round + 1}. txanda: begia jota`, `${hp1} → ${hp2}`);
    await ev(() => { const g = __game; if (g.LOCK.target) g.lockToggle(); });
    if (round < 2) await until(() => __game.TART.state === 'idle', 900);
  }
  await until(() => !!__game.cinematicState(), 600);
  await skip();
  await skip();
  ok(await flag('tartalo'), 'Tartalo askatuta (bandera)');
  ok((await ev(() => __game.saved.hearts)) >= 3, 'TARTALOREN BIHOTZA (arnasa bat gehiago)');

  /* 9 · irteera → lepora; helburua: Irati */
  await tp(E(0), 0, 13);
  p = await walk(0, 1, 0.8);
  await T(120);
  p = await ev(() => ({ zone: __game.ZONE.cur, x: +__game.P.x.toFixed(1), y: +__game.P.y.toFixed(1), z: +__game.P.z.toFixed(1) }));
  ok(p.zone === 'ibarra' && p.y > 10, 'kobatik irten → lepoan', S(p));
  const obj1 = await ev(() => __game.objective());
  ok(/Irati/i.test(obj1[0]), 'helburua: Iratirekin hitz egin', obj1[0]);
  /* 10 · herrian: Irati → amaierako eszena (zazpi argi zeruan) */
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.2, N.z, N.y || 0); for (let i = 0; i < 20; i++) g.tick(1 / 120); g.talkTo(N); });
  const cine = await ev(() => !!__game.cinematicState());
  await skip();
  await T(60);
  ok(cine && (await flag('irati-tartalo')), 'Irati: amaierako eszena (JARRAITZEKO…)');
  const obj2 = await ev(() => __game.objective());
  ok(/Harana zurea/.test(obj2[0]), 'helburua: harana libre', obj2[0]);

  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  console.log(fails ? `${fails} HUTS` : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
