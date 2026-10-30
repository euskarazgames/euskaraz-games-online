// LEIZEEN DEIA: FISIKA (Jolt Physics), ?test kakoekin, tick-ak eskuz.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_fisika.js http://127.0.0.1:8091/games/leizeak.html
// Jolt beranduago kargatzen da → mundu estatikoa (haranekoa, garai bakoitzekoa) → upela bultzatu (Amaiur ez
// da sartzen) → apurtu: zatiak erori eta desagertu → harri biribila aldapan behera (azpian txanponak) →
// harri-kuboa zutabera bultzatu, gainera igo eta kutxara → eztanda → garaia eta zona aldatzean.
const { launch } = require('./_browser');
(async () => {
  const [url] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
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
  await ev(() => {
    const s = __game.saved;
    s.flags.push('giroa', 'intro', 'irati1', 'prologoa');
    __game.renderer.setPixelRatio(0.25);
    __game.renderer.shadowMap.enabled = false;
  });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });
  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const tp = (x, z, y) => ev(([x, z, y]) => { const g = __game; g.teleport(x, z, y ?? g.gy(x, z)); g.P.vx = g.P.vz = 0; }, [x, z, y]);
  /* munduko norabidean ibili (makila kameraren biraketatik) n tick */
  const walk = (dx, dz, n) => ev(([dx, dz, n]) => { const g = __game; for (let i = 0; i < n; i++) { g.input.x = 0.83 * dx - 0.557 * dz; g.input.z = 0.557 * dx + 0.83 * dz; g.tick(1 / 120); } g.input.x = g.input.z = 0; }, [dx, dz, n]);

  /* 1 · Jolt beranduago: mundu estatikoa */
  await ev(() => __game.physLoad());
  const st = await ev(() => { const P = __game.PHYS; return { ok: P.ok, cur: P.cur, ms: P.ms, items: P.items.length, bodies: P.items.filter((I) => I.body).length }; });
  ok(st.ok && st.cur && st.cur.startsWith('ibarra:') && st.bodies >= 8, 'Jolt kargatuta: haraneko mundua eta gorputzak', S(st));

  /* 2 · upela bultzatu: mugitzen da, Amaiur ez da barruan sartzen */
  const push = await ev(() => {
    const g = __game, B = g.HUB.barrels[0], I = B.item, x0 = I.x, z0 = I.z;
    g.teleport(I.x + 2.2, I.z, g.gy(I.x + 2.2, I.z));
    let minD = 99;
    for (let i = 0; i < 240; i++) {
      g.input.x = 0.83 * -1; g.input.z = 0.557 * -1;
      g.tick(1 / 120);
      minD = Math.min(minD, Math.hypot(g.P.x - I.x, g.P.z - I.z));
    }
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    return { moved: +Math.hypot(I.x - x0, I.z - z0).toFixed(2), minD: +minD.toFixed(2), solid: +Math.hypot(B.solid.x - I.x, B.solid.z - I.z).toFixed(3), hit: +Math.hypot(B.x - I.x, B.z - I.z).toFixed(3) };
  });
  ok(push.moved > 0.8, 'upela bultzatuta', S(push));
  ok(push.minD > 0.85 && push.solid < 0.01 && push.hit < 0.01, 'Amaiur ez da upelean sartzen; talka eta kolpea upelarekin', S(push));

  /* 3 · apurtu: zatiak (fisika) erori, lurrean geratu eta desagertu */
  const deb = await ev(() => {
    const g = __game, B = g.HUB.barrels[1];
    g.teleport(B.x + 1.6, B.z, g.gy(B.x + 1.6, B.z));
    g.breakOne(B);
    const n0 = g.PHYS.frags.length;
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    const low = g.PHYS.frags.filter((F) => F.m.position.y < g.gy(F.m.position.x, F.m.position.z) - 0.35).length;
    for (let i = 0; i < 120 * 4; i++) g.tick(1 / 120);
    return { n0, low, left: g.PHYS.frags.length, body: !!B.item.body };
  });
  ok(deb.n0 >= 8 && deb.low === 0, 'apurtzean zatiak, lurraren gainean', S(deb));
  ok(deb.left === 0 && !deb.body, 'zatiak desagertu; upelaren gorputza kenduta', S(deb));

  /* 4 · harri biribila: bultzatu → aldapan behera; azpian txanponak */
  const rock = await ev(() => {
    const g = __game, I = g.PHYS.items.find((I) => I.kind === 'boulder' && I.hidden), loot0 = g.LOOT ? g.LOOT.length : 0;
    /* aldapaz gora jarri eta behera bultzatu (gradientearen kontra) */
    const e = 1.5, gx = (g.gy(I.x + e, I.z) - g.gy(I.x - e, I.z)) / (2 * e), gz = (g.gy(I.x, I.z + e) - g.gy(I.x, I.z - e)) / (2 * e), gl = Math.hypot(gx, gz), ux = -gx / gl, uz = -gz / gl;
    g.teleport(I.x - ux * 2.4, I.z - uz * 2.4, g.gy(I.x - ux * 2.4, I.z - uz * 2.4));
    let loot = 0;
    for (let i = 0; i < 90; i++) {
      g.input.x = 0.83 * ux - 0.557 * uz; g.input.z = 0.557 * ux + 0.83 * uz; g.tick(1 / 120);
      if (!loot && g.saved.flags.includes('harri-azpian')) loot = g.LOOT.length - loot0;
    }
    g.input.x = g.input.z = 0;
    g.teleport(I.x - ux * 8, I.z - uz * 8, g.gy(I.x - ux * 8, I.z - uz * 8));
    let maxSp = 0;
    for (let i = 0; i < 120 * 4; i++) {
      g.tick(1 / 120);
      const v = g.PHYS.bi.GetLinearVelocity(I.body.GetID());
      maxSp = Math.max(maxSp, Math.hypot(v.GetX(), v.GetZ()));
      if (!loot && g.saved.flags.includes('harri-azpian')) loot = g.LOOT.length - loot0;
    }
    return { dist: +Math.hypot(I.x - I.x0, I.z - I.z0).toFixed(1), maxSp: +maxSp.toFixed(1), flag: g.saved.flags.includes('harri-azpian'), loot, onGround: +(I.y - g.gy(I.x, I.z)).toFixed(2) };
  });
  ok(rock.dist > 3 && rock.maxSp > 1.5, 'harri biribila aldapan behera', S(rock));
  ok(rock.flag && rock.loot >= 5, 'harriaren azpian txanponak', S(rock));
  ok(Math.abs(rock.onGround) < 0.6, 'harria lurraren gainean (ez barruan, ez airean)', S(rock));

  /* 5a · kuborik gabe: jauzi bikoitzak ez du zutabearen gaina hartzen (hormako jauzirik ez: labaina) */
  const noCube = await ev(() => {
    const g = __game, H = g.HARRI, mv = (ux, uz) => { g.input.x = 0.83 * ux - 0.557 * uz; g.input.z = 0.557 * ux + 0.83 * uz; };
    g.teleport(H.px + 2.6, H.pz, g.gy(H.px + 2.6, H.pz));
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    let maxY = -99;
    g.setJumpHeld(true);
    for (let k = 0; k < 3; k++) {
      g.jump();
      for (let i = 0; i < 40; i++) { mv(-1, 0); g.tick(1 / 120); maxY = Math.max(maxY, g.P.y); }
    }
    for (let i = 0; i < 120; i++) { mv(-1, 0); g.tick(1 / 120); maxY = Math.max(maxY, g.P.y); }
    g.setJumpHeld(false);
    g.input.x = g.input.z = 0;
    return { maxY: +(maxY - g.gy(H.px, H.pz)).toFixed(2), onTop: g.P.y > g.gy(H.px, H.pz) + 5.3 };
  });
  ok(!noCube.onTop, 'kuborik gabe: zutabearen gaina ezin', S(noCube));

  /* 5 · harri-kuboa: aurpegiz aurpegi bultzatu (x, gero z) zutaberaino, gainera igo eta kutxara */
  const cube = await ev(() => {
    const g = __game, I = g.PHYS.items.find((I) => I.kind === 'block'), H = g.HARRI, d0 = Math.hypot(H.px - I.x, H.pz - I.z);
    const mv = (ux, uz) => { g.input.x = 0.83 * ux - 0.557 * uz; g.input.z = 0.557 * ux + 0.83 * uz; };
    /* aurpegi baten atzean jarri eta zuzen bultzatu, helburura arte */
    const pushAxis = (ax, az, done) => {
      g.teleport(I.x - ax * 1.35, I.z - az * 1.35, g.gy(I.x - ax * 1.35, I.z - az * 1.35));
      for (let i = 0; i < 120 * 5 && !done(); i++) {
        /* kuboaren erdigunearen lerroan mantendu (alboetara ez irristatu) */
        const side = ax ? I.z - g.P.z : I.x - g.P.x;
        mv(ax + (az ? side * 1.2 : 0), az + (ax ? side * 1.2 : 0));
        g.tick(1 / 120);
      }
      g.input.x = g.input.z = 0;
      for (let i = 0; i < 60; i++) g.tick(1 / 120);
    };
    pushAxis(1, 0, () => I.x > H.px - 2.75);
    pushAxis(0, -1, () => I.z < H.pz + 0.9);
    const d1 = Math.hypot(H.px - I.x, H.pz - I.z);
    /* gainera: kuboaren gainean (plataforma) */
    g.teleport(I.x, I.z, I.y + I.K.h + 0.6);
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    const onTop = Math.abs(g.P.y - (I.y + I.K.h)) < 0.15 && g.P.grounded;
    /* zutaberantz jauzi bikoitza (eutsita) */
    const ex = H.px - g.P.x, ez = H.pz - g.P.z, el = Math.hypot(ex, ez);
    g.setJumpHeld(true);
    g.jump();
    for (let i = 0; i < 120 * 1.6; i++) {
      if (i === 40) g.jump();
      if (Math.hypot(H.px - g.P.x, H.pz - g.P.z) > 0.5) mv(ex / el, ez / el);
      else g.input.x = g.input.z = 0;
      g.tick(1 / 120);
      if (g.P.grounded && i > 60) break;
    }
    g.setJumpHeld(false);
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    const top = g.gy(H.px, H.pz) + 5.6, C = g.chestNear && g.chestNear();
    return { d0: +d0.toFixed(1), d1: +d1.toFixed(1), onTop, py: +g.P.y.toFixed(2), top: +top.toFixed(2), chest: C ? C.id : null };
  });
  ok(cube.d1 < cube.d0 - 2 && cube.d1 < 3.3, 'harri-kuboa zutaberaino bultzatuta', S(cube));
  ok(cube.onTop, 'kuboaren gainean egon daiteke', S(cube));
  ok(Math.abs(cube.py - cube.top) < 0.2 && cube.chest === 'harri-kuboa', 'kubotik zutabera: kutxa', S(cube));

  /* 6 · eztanda: inguruko gorputzak hegan */
  const blast = await ev(() => {
    const g = __game, B = g.HUB.barrels[2], I = B.item;
    g.teleport(I.x + 8, I.z, g.gy(I.x + 8, I.z));
    const n = g.physBlast(I.x - 1.5, I.y + 0.3, I.z, 6);
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    const v = g.PHYS.bi.GetLinearVelocity(I.body.GetID());
    return { n, v: +Math.hypot(v.GetX(), v.GetY(), v.GetZ()).toFixed(1) };
  });
  ok(blast.n >= 1 && blast.v > 2, 'eztanda: upela hegan', S(blast));

  /* 7 · garaia aldatu: beste mundu estatikoa; leizera eta itzuli */
  const ph = await ev(() => { const g = __game, a = g.PHYS.cur; g.phaseCooldown = 0; g.switchPhase(); for (let i = 0; i < 30; i++) g.tick(1 / 120); return { a, b: g.PHYS.cur }; });
  ok(ph.a !== ph.b && ph.b.startsWith('ibarra:'), 'garaia: mundu estatikoa trukatuta', S(ph));
  const zone = await ev(() => {
    const g = __game, I = g.HUB.barrels[3].item, at = [+I.x.toFixed(2), +I.z.toFixed(2)];
    g.enterZone('leizea', g.DGS.leizea.entry, true);
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    const inside = { cur: g.PHYS.cur, valleyBodies: g.PHYS.items.filter((J) => J.zone === 'ibarra' && J.body).length };
    g.enterZone('ibarra', { x: 0, y: 0, z: 41 }, true);
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    return { inside, back: g.PHYS.cur, same: Math.hypot(I.x - at[0], I.z - at[1]) < 0.3, body: !!I.body };
  });
  ok(zone.inside.cur.startsWith('leizea:') && zone.inside.valleyBodies === 0, 'leizean: haraneko gorputzak kanpo', S(zone.inside));
  ok(zone.back.startsWith('ibarra:') && zone.same && zone.body, 'harana: upelak bere lekuan, berriro', S(zone));

  ok(errs.length === 0, 'errorerik ez', errs.slice(0, 3).join(' | '));
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
