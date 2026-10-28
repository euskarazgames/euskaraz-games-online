// LEIZEEN DEIA: herriko eraikinak solidoak (Amaiur ez da hormetan sartzen, teilatuan ere ez), gari-soroa
// (ertza solidoa, gainean ibil daiteke), harrizko zubia (zeharkatzen da) eta gardentasuna (etxea Amaiur
// estaltzen duenean bakarrik).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_eraikinak.js http://127.0.0.1:8091/games/leizeak.html
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
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const S = (o) => JSON.stringify(o);

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => { __game.renderer.setPixelRatio(0.25); __game.renderer.shadowMap.enabled = false; __game.saved.flags.push('intro', 'irati1', 'prologoa'); __game.saved.tod = 0.4; });
  await page.click('#play');
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  /* formak (zirkuluak eta kaxa biratuak) orrian: barruan dagoen ala ez (marjinarekin) */
  await ev(() => {
    window.__inside = (B, x, z, m) => {
      if (B.r) return Math.hypot(x - B.x, z - B.z) < B.r + m;
      const c = Math.cos(B.rot), n = Math.sin(B.rot), ex = x - B.x, ez = z - B.z, lx = ex * c - ez * n, lz = ex * n + ez * c;
      return Math.abs(lx) < B.w / 2 + m && Math.abs(lz) < B.d / 2 + m;
    };
  });

  /* 1 · eraikinak: forma bakoitzera lau aldetatik ibili (hormaren kontra 1.5 s); inoiz ez barruan */
  const shapes = await ev(() => __game.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes.map((B) => ({ ...B, y: o.y }))));
  ok(shapes.length >= 20, 'herriko eraikinek formak dituzte (hormen oinplanoa)', shapes.length);
  const big = shapes.filter((B) => !B.r && B.w * B.d > 20).length;
  ok(big >= 12, 'etxeak, eliza, taberna, errota: kaxa osoak', big);
  const res = await ev((shapes) => {
    const g = __game, out = { tries: 0, deep: [], reached: 0 };
    for (const [si, B] of shapes.entries()) {
      const dirs = B.r ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [a * Math.cos(B.rot) + b * Math.sin(B.rot), -a * Math.sin(B.rot) + b * Math.cos(B.rot)]);
      const ext = B.r ? B.r : Math.max(B.w, B.d) / 2;
      for (const [dx, dz] of dirs) {
        const sx = B.x + dx * (ext + 2.6), sz = B.z + dz * (ext + 2.6);
        /* ibaian edo beste forma baten barruan hasten bada, saltatu */
        if (g.riverW(sx, sz) < 1.5 || shapes.some((Q) => __inside(Q, sx, sz, 0.6))) continue;
        g.teleport(sx, sz, g.gy(sx, sz));
        g.P.vx = g.P.vz = 0;
        for (let i = 0; i < 6; i++) g.tick(1 / 120);
        out.tries++;
        let minD = 1e9;
        for (let i = 0; i < 180; i++) {
          const tx = B.x - g.P.x, tz = B.z - g.P.z, L = Math.hypot(tx, tz) || 1, mx = tx / L, mz = tz / L;
          g.input.x = 0.83 * mx - 0.557 * mz;
          g.input.z = 0.557 * mx + 0.83 * mz;
          g.tick(1 / 120);
          if (__inside(B, g.P.x, g.P.z, 0.2)) { out.deep.push([si, +g.P.x.toFixed(2), +g.P.z.toFixed(2)]); break; }
          minD = Math.min(minD, L);
        }
        g.input.x = g.input.z = 0;
        if (__inside(B, g.P.x, g.P.z, 0.5)) out.reached++;
      }
    }
    return out;
  }, shapes);
  ok(res.tries >= 60, 'hurbilketak (lau aldetatik)', res.tries);
  ok(res.deep.length === 0, 'Amaiur ez da inoiz hormetan sartzen', S(res.deep.slice(0, 5)));
  ok(res.reached >= res.tries * 0.6, 'hormaren ondoraino iristen da (ez da urrunean gelditzen)', res.reached + '/' + res.tries);

  /* 2 · teilatuan ezin da egon (goitik erortzean, eraikinetik kanpora irteten da) */
  const roof = await ev(() => {
    const g = __game, H = g.ZONES.ibarra.solids.find((o) => o.shapes && o.shapes[0].w > 5);
    g.teleport(H.shapes[0].x, H.shapes[0].z, H.y + H.h + 4);
    g.P.grounded = false;
    for (let i = 0; i < 240; i++) g.tick(1 / 120);
    return { onTop: g.P.y > H.y + 2, inside: __inside(H.shapes[0], g.P.x, g.P.z, 0.2), y: +(g.P.y - H.y).toFixed(2) };
  });
  ok(!roof.onTop && !roof.inside, 'teilatu ikusezinik ez: goitik erorita, etxetik kanpora', S(roof));

  /* 3 · gari-soroa: ertza solidoa; jauzi bikoitzaz gainera eta gainean ibili */
  const field = await ev(() => {
    const g = __game, F = g.ZONES.ibarra.platforms.find((p) => p.rx && Math.abs(p.x + 44) < 0.1 && Math.abs(p.z - 14) < 0.1);
    if (!F) return null;
    g.teleport(F.x + 7.5, F.z, g.gy(F.x + 7.5, F.z));
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    for (let i = 0; i < 150; i++) { g.input.x = 0.83 * -1; g.input.z = 0.557 * -1; g.tick(1 / 120); }
    const blocked = { dx: +(g.P.x - F.x).toFixed(2), y: +g.P.y.toFixed(2) };
    g.setJumpHeld(true);
    g.jump();
    for (let i = 0; i < 26; i++) { g.input.x = -0.83; g.input.z = -0.557; g.tick(1 / 120); }
    g.jump();
    /* mendebaldera, soroaren erdiraino; han makila askatu eta lurreratu */
    for (let i = 0; i < 240; i++) { const go = g.P.x - F.x > 0.5; g.input.x = go ? -0.83 : 0; g.input.z = go ? -0.557 : 0; g.tick(1 / 120); if (g.P.grounded && i > 30) break; }
    g.setJumpHeld(false);
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 30; i++) g.tick(1 / 120);
    return { blocked, top: +(F.y).toFixed(2), on: { y: +g.P.y.toFixed(2), d: +Math.hypot(g.P.x - F.x, g.P.z - F.z).toFixed(2), grounded: g.P.grounded } };
  });
  ok(field && field.blocked.dx > 3.9 + 0.1, 'gari-soroaren ertza solidoa (ez da barrura sartzen)', S(field && field.blocked));
  ok(field && Math.abs(field.on.y - field.top) < 0.05 && field.on.d < 3.9 && field.on.grounded, 'jauzi bikoitzaz soroaren gainean', S(field && field.on));

  /* 4 · harrizko zubia zeharkatzen da (hegoaldetik iparraldera) */
  const br = await ev(() => {
    const g = __game;
    g.teleport(0, -15.5, g.gy(0, -15.5));
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    let maxY = -1e9;
    for (let i = 0; i < 600 && g.P.z > -41.5; i++) { g.input.x = 0.83 * 0 - 0.557 * -1; g.input.z = 0.557 * 0 + 0.83 * -1; g.tick(1 / 120); maxY = Math.max(maxY, g.P.y); }
    g.input.x = g.input.z = 0;
    return { z: +g.P.z.toFixed(2), x: +g.P.x.toFixed(2), maxY: +maxY.toFixed(2) };
  });
  ok(br.z < -40 && br.maxY > 1, 'harrizko zubia zeharkatu (arkuaren gainetik)', S(br));
  /* eta itzuleran (iparraldetik hegoaldera), garai bietan (iraganean ibaia ura da) */
  for (const era of [1, 0]) {
    const back = await ev((era) => {
      const g = __game;
      if (g.phase() !== era) g.switchPhase();
      for (let i = 0; i < 40; i++) g.tick(1 / 120);
      g.teleport(0, -42, g.gy(0, -42));
      for (let i = 0; i < 6; i++) g.tick(1 / 120);
      for (let i = 0; i < 600 && g.P.z < -15.5; i++) { g.input.x = -0.557; g.input.z = 0.83; g.tick(1 / 120); }
      g.input.x = g.input.z = 0;
      return { z: +g.P.z.toFixed(2), x: +g.P.x.toFixed(2), era: g.phase() };
    }, era);
    ok(back.z > -16, 'zubia itzuleran (' + (era ? 'oraina' : 'iragana') + ')', S(back));
  }
  await ev(() => { if (__game.phase() !== 1) __game.switchPhase(); });

  /* 5 · NPCak, haien ibilbideak eta ateak ez daude formen barruan */
  const pts = await ev((shapes) => {
    const g = __game, bad = [];
    for (const N of g.NPCS) {
      if (N.zone && N.zone !== 'ibarra') continue;
      if (shapes.some((B) => __inside(B, N.x, N.z, 0.2))) bad.push('npc ' + N.id);
      if (N.route) for (let k = 0; k < N.route.length; k++) {
        const [ax, az] = N.route[k], [bx, bz] = N.route[(k + 1) % N.route.length];
        for (let t = 0; t <= 1; t += 0.05) if (shapes.some((B) => __inside(B, ax + (bx - ax) * t, az + (bz - az) * t, 0.4))) { bad.push('bidea ' + N.id); break; }
      }
    }
    for (const H of g.HOUSE.list) if (shapes.some((B) => __inside(B, H.x, H.z, 0.25))) bad.push('atea ' + H.id);
    return { bad, doors: g.HOUSE.list.length };
  }, shapes);
  ok(pts.bad.length === 0 && pts.doors >= 8, 'NPCak, ibilbideak eta ateak libre', S(pts));
  /* ATEA JO oraindik eskura (etxe baten atean) */
  const knock = await ev(() => { const g = __game, H = g.HOUSE.list.find((h) => !h.sealed); g.teleport(H.x, H.z, H.y); for (let i = 0; i < 6; i++) g.tick(1 / 120); const a = g.actionHere(); return a ? a.label : null; });
  ok(!!knock, 'atearen aurrean: ekintza eskura', knock);

  /* 6 · gardentasuna: etxea Amaiur estaltzen duenean bakarrik gardentzen da (atzean bai; aurrean, ez bera
     ez ondokoak) */
  const occ = await ev((shapes) => {
    const g = __game, list = g.OCC.filter((o) => o.box), out = { n: list.length, behind: 0, front: 0, bad: [] };
    const inBox = (B, x, z) => { const c = Math.cos(B.rot), n = Math.sin(B.rot), ex = x - B.x, ez = z - B.z; return Math.abs(ex * c - ez * n) < B.w / 2 && Math.abs(ex * n + ez * c) < B.d / 2; };
    const settle = () => { for (let i = 0; i < 40; i++) { g.cameraUpdate(1 / 15); g.occlusionUpdate(1 / 15); } };
    const place = (x, z) => { g.teleport(x, z, g.gy(x, z)); g.P.vx = g.P.vz = 0; for (let i = 0; i < 4; i++) g.tick(1 / 120); settle(); };
    const others = (o) => list.filter((q) => q !== o && q.k > 0.5).length;
    /* kamerarako norabidea, neurtuta */
    place(-3, 30);
    const v = [g.camera.position.x - g.P.x, g.camera.position.z - g.P.z], L = Math.hypot(v[0], v[1]), f = [v[0] / L, v[1] / L];
    for (const [i, o] of list.entries()) {
      /* atzean: etxearen erditik kameraren kontrako aldera, hormatik 0.4 m-ra (etxea erdian geratzen da) */
      const B = o.box;
      let bx = B.x, bz = B.z;
      for (let k = 0; k < 200 && shapes.some((Q) => __inside(Q, bx, bz, 0.4)); k++) { bx -= f[0] * 0.1; bz -= f[1] * 0.1; }
      if (g.riverW(bx, bz) < 1.5 || Math.hypot(bx - B.x, bz - B.z) > Math.hypot(B.w, B.d) / 2 + 1) continue;
      place(bx, bz);
      out.behind++;
      if (o.k < 0.9 || others(o)) out.bad.push(['atzean', i, +o.k.toFixed(2), others(o)]);
    }
    for (const [i, o] of list.entries()) {
      const B = o.box, c = Math.cos(B.rot), n = Math.sin(B.rot);
      let w = null;
      for (const [ax, az, h] of [[c, -n, B.w / 2], [-c, n, B.w / 2], [n, c, B.d / 2], [-n, -c, B.d / 2]]) { const sc = ax * f[0] + az * f[1]; if (!w || sc > w.sc) w = { sc, ax, az, h }; }
      /* kamerari begira dagoen hormaren aurrean, formetatik 0.35 m-ra */
      let x = B.x + w.ax * w.h, z = B.z + w.az * w.h;
      for (let k = 0; k < 40 && shapes.some((Q) => __inside(Q, x, z, 0.35)); k++) { x += w.ax * 0.1; z += w.az * 0.1; }
      for (let k = 0; k < 40 && !shapes.some((Q) => __inside(Q, x - w.ax * 0.1, z - w.az * 0.1, 0.35)); k++) { x -= w.ax * 0.1; z -= w.az * 0.1; }
      /* teilatupean (errementariaren tailerra) gardentzea zuzena da */
      if (g.riverW(x, z) < 1.5 || inBox(B, x, z)) continue;
      place(x, z);
      out.front++;
      if (o.k > 0.1 || others(o)) out.bad.push(['aurrean', i, +o.k.toFixed(2), others(o)]);
    }
    return out;
  }, shapes);
  ok(occ.n >= 12 && occ.behind >= 10 && occ.front >= 10 && occ.bad.length === 0, 'etxeak estaltzen dutenean bakarrik gardentzen dira', S(occ));

  console.log(errs.length ? 'ERROREAK:\n' + errs.slice(0, 5).join('\n') : 'ERRORERIK EZ');
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
