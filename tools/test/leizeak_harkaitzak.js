// LEIZEEN DEIA: harkaitzak eta herriko tresnak solidoak (Amaiur ez da sartzen), harkaitz txikien gailurrean
// eta ondoetan egon daiteke, hesien gainetik jauzi, uhartetxoak eskura eta leizeen sarrerak libre.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_harkaitzak.js http://127.0.0.1:8091/games/leizeak.html
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

  /* formak orrian: zirkulua, kaxa biratua edo harkaitza (ingerada erradiala) */
  await ev(() => {
    window.__inside = (B, x, z, m) => {
      if (B.rad) {
        const dx = x - B.x, dz = z - B.z, N = B.rad.length, f = ((((Math.atan2(dz, dx) / (2 * Math.PI)) * N) % N) + N) % N, i = Math.floor(f);
        return Math.hypot(dx, dz) < B.rad[i] + (B.rad[(i + 1) % N] - B.rad[i]) * (f - i) + m;
      }
      if (B.r) return Math.hypot(x - B.x, z - B.z) < B.r + m;
      const c = Math.cos(B.rot), n = Math.sin(B.rot), ex = x - B.x, ez = z - B.z, lx = ex * c - ez * n, lz = ex * n + ez * c;
      return Math.abs(lx) < B.w / 2 + m && Math.abs(lz) < B.d / 2 + m;
    };
    window.__walk = (dx, dz) => { __game.input.x = 0.83 * dx - 0.557 * dz; __game.input.z = 0.557 * dx + 0.83 * dz; };
  });

  /* 1 · harkaitzak: forma kopurua eta lau aldetatik hurbildu (inoiz ez barruan, ertzeraino iritsi) */
  const info = await ev(() => {
    const all = __game.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes);
    return { rocks: all.filter((B) => B.rad).length, boxes: all.filter((B) => !B.rad && !B.r).length };
  });
  ok(info.rocks >= 60, 'haraneko harkaitzek ingerada dute (zutabeak, arroila, ur-jauzia, leizeen ateak, KayKit)', S(info));
  const res = await ev(() => {
    const g = __game, all = g.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes), rocks = g.ZONES.ibarra.solids.filter((o) => o.shapes && o.shapes[0].rad);
    const out = { tries: 0, deep: [], reached: 0, skipped: 0 };
    for (const [si, o] of rocks.entries()) {
      const B = o.shapes[0], top = o.y + o.h;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const sx = B.x + dx * (B.rmax + 2.4), sz = B.z + dz * (B.rmax + 2.4);
        /* haranetik kanpo, ibaian edo beste forma baten barruan: saltatu */
        if (g.walkSD(sx, sz) < 1 || g.riverW(sx, sz) < 1.5 || all.some((Q) => __inside(Q, sx, sz, 0.6))) { out.skipped++; continue; }
        g.teleport(sx, sz, g.gy(sx, sz));
        g.P.vx = g.P.vz = 0;
        for (let i = 0; i < 6; i++) g.tick(1 / 120);
        out.tries++;
        for (let i = 0; i < 200; i++) {
          const tx = B.x - g.P.x, tz = B.z - g.P.z, L = Math.hypot(tx, tz) || 1;
          __walk(tx / L, tz / L);
          g.tick(1 / 120);
          /* harkaitzaren gainean edo gailurrera igotzen (urrats-muga 0.32 m) ez da sartzea */
          if (__inside(B, g.P.x, g.P.z, 0.2) && g.P.y < top - 0.35) { out.deep.push([si, +g.P.x.toFixed(2), +g.P.z.toFixed(2), +g.P.y.toFixed(2), +top.toFixed(2)]); break; }
        }
        g.input.x = g.input.z = 0;
        if (__inside(B, g.P.x, g.P.z, 0.6) || g.P.y >= top - 0.35) out.reached++;
      }
    }
    return out;
  });
  ok(res.tries >= 40, 'hurbilketak (haranaren barrutik)', res.tries + ' (saltatuak ' + res.skipped + ')');
  ok(res.deep.length === 0, 'Amaiur ez da inoiz harkaitzetan sartzen', S(res.deep.slice(0, 5)));
  ok(res.reached >= res.tries * 0.6, 'harkaitzaren ertzeraino iristen da', res.reached + '/' + res.tries);

  /* 2 · KayKit harkaitz txikiak: gailurrean egon daiteke (goitik erorita) */
  const crown = await ev(() => {
    const g = __game, out = [];
    for (const p of g.ZONES.ibarra.platforms.filter((q) => q.rx && q.bottom !== undefined && q.safe && q.rx < 2 && Math.abs(q.rx - q.rz) < 1e-6)) {
      const rock = g.ZONES.ibarra.solids.find((o) => o.shapes && o.shapes[0].rad && Math.hypot(o.x - p.x, o.z - p.z) < 0.01);
      if (!rock) continue;
      g.teleport(p.x, p.z, p.y + 1.5);
      g.P.grounded = false;
      for (let i = 0; i < 180; i++) g.tick(1 / 120);
      out.push({ dy: +(g.P.y - p.y).toFixed(2), d: +Math.hypot(g.P.x - p.x, g.P.z - p.z).toFixed(2), gr: g.P.grounded });
    }
    return out;
  });
  ok(crown.length >= 8 && crown.every((c) => Math.abs(c.dy) < 0.05 && c.d < 0.5 && c.gr), 'harkaitz txikien gailurrean zutik', S(crown.slice(0, 4)) + ' ×' + crown.length);

  /* 3 · ondoak: gainean zutik; hesia: ezin da zeharkatu, baina gainetik jauzi daiteke */
  const fence = await ev(() => {
    const g = __game, out = {};
    const stump = g.ZONES.ibarra.platforms.find((p) => p.w && Math.abs(p.x - 18) < 1 && Math.abs(p.z + 4) < 1);
    if (stump) {
      g.teleport(stump.x, stump.z, stump.y + 1);
      g.P.grounded = false;
      for (let i = 0; i < 120; i++) g.tick(1 / 120);
      out.stump = { dy: +(g.P.y - stump.y).toFixed(2), gr: g.P.grounded };
    }
    /* artegiaren hegoko hesia (z = pen.z + 5): hegotik iparrera */
    const pen = g.HUB.pen, fz = pen.z + 5;
    g.teleport(pen.x, fz + 3, g.gy(pen.x, fz + 3));
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    for (let i = 0; i < 180; i++) { __walk(0, -1); g.tick(1 / 120); }
    g.input.x = g.input.z = 0;
    out.blocked = +(g.P.z - fz).toFixed(2);
    /* jauzi: hesiaren gainetik */
    g.teleport(pen.x, fz + 2.2, g.gy(pen.x, fz + 2.2));
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    g.setJumpHeld(true);
    g.jump();
    for (let i = 0; i < 150; i++) { __walk(0, -1); g.tick(1 / 120); }
    g.setJumpHeld(false);
    g.input.x = g.input.z = 0;
    for (let i = 0; i < 60; i++) g.tick(1 / 120);
    out.over = +(g.P.z - fz).toFixed(2);
    return out;
  });
  ok(fence.stump && Math.abs(fence.stump.dy) < 0.05 && fence.stump.gr, 'ondoaren gainean zutik', S(fence.stump));
  ok(fence.blocked > 0.2, 'artegiko hesia solidoa (ez da zeharkatzen)', S(fence));
  ok(fence.over < -0.3, 'hesiaren gainetik jauzi daiteke', S(fence));

  /* 4 · uhartetxoak (izotzean): gainean egon daiteke (harkaitzak ez du kanporatzen) */
  const islets = await ev(() => {
    const g = __game;
    if (g.phase() !== 1) g.switchPhase();
    for (let i = 0; i < 40; i++) g.tick(1 / 120);
    const out = [];
    for (const [x, z, y] of [[-50, -28.5, -0.4], [26.5, 101.5, -7.3]]) {
      g.teleport(x + 0.8, z, y + 0.6);
      g.P.grounded = false;
      for (let i = 0; i < 160; i++) g.tick(1 / 120);
      out.push({ dy: +(g.P.y - y).toFixed(2), d: +Math.hypot(g.P.x - x, g.P.z - z).toFixed(2), gr: g.P.grounded });
    }
    return out;
  });
  ok(islets.every((o) => Math.abs(o.dy) < 0.05 && o.d < 1.6 && o.gr), 'ibaiko eta badiako uhartetxoetan zutik', S(islets));

  /* 5 · NPCak, ibilbideak, ateak, kutxak eta burdin-harriak ez daude forma berrien barruan */
  const pts = await ev(() => {
    const g = __game, shapes = g.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes), bad = [];
    for (const N of g.NPCS) {
      if (N.zone && N.zone !== 'ibarra') continue;
      if (shapes.some((B) => __inside(B, N.x, N.z, 0.2))) bad.push('npc ' + N.id);
      if (N.route) for (let k = 0; k < N.route.length; k++) {
        const [ax, az] = N.route[k], [bx, bz] = N.route[(k + 1) % N.route.length];
        for (let t = 0; t <= 1; t += 0.05) if (shapes.some((B) => __inside(B, ax + (bx - ax) * t, az + (bz - az) * t, 0.4))) { bad.push('bidea ' + N.id); break; }
      }
    }
    for (const H of g.HOUSE.list) if (shapes.some((B) => __inside(B, H.x, H.z, 0.25))) bad.push('atea ' + H.id);
    for (const C of g.CHESTS) if (C.zoneGroup === g.ZONES.ibarra.group && shapes.some((B) => __inside(B, C.x, C.z, 0.6))) bad.push('kutxa ' + C.id);
    for (const B of g.BREAKABLES) if (B.buildZone === g.ZONES.ibarra.group && shapes.some((Q) => __inside(Q, B.x, B.z, 0.3))) bad.push('hausgarria ' + B.kind);
    const tops = g.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes.map((B) => [B, o.y + o.h]));
    for (const E of g.ECHOES) if (tops.some(([B, t]) => E.y < t - 0.25 && __inside(B, E.x, E.z, 0.4))) bad.push('oihartzun-harria ' + E.id);
    return { bad, n: shapes.length };
  });
  ok(pts.bad.length === 0, 'NPCak, ibilbideak, ateak, kutxak eta harriak libre', S(pts));

  /* 6 · leizeen sarrerak oraindik eskura: LAMIEN LEIZEA ur-jauziaren atzean (iraganean), eta Basajaunen eta
     Tartaloren ateetan harkaitzik ez */
  const gates = await ev(() => {
    const g = __game, shapes = g.ZONES.ibarra.solids.filter((o) => o.shapes).flatMap((o) => o.shapes.map((B) => [B, o.y + o.h]));
    const blocked = (x, z, y) => shapes.filter(([B, t]) => y < t - 0.25 && __inside(B, x, z, 0.3)).length;
    return { basajaun: blocked(g.HUB.cave.x, g.HUB.cave.z, g.HUB.cave.y), tartalo: blocked(g.HUB.tartalo.x, g.HUB.tartalo.z, g.HUB.tartalo.y), lamia: blocked(g.HUB.lamia.x + 0.6, g.HUB.lamia.z, g.HUB.lamia.y) };
  });
  ok(gates.basajaun === 0 && gates.tartalo === 0 && gates.lamia === 0, 'leizeen ateetan harkaitzik ez (Basajaun, Tartalo, Lamia)', S(gates));
  const lamia = await ev(() => {
    const g = __game;
    if (!g.DGS.lamia) return { skip: true };
    if (g.phase() !== 0) g.switchPhase();
    for (let i = 0; i < 40; i++) g.tick(1 / 120);
    g.teleport(93, -28.5, -0.9);
    for (let i = 0; i < 6; i++) g.tick(1 / 120);
    for (let i = 0; i < 400 && g.ZONE.cur === 'ibarra' && !g.ZONE.pending; i++) { __walk(1, 0); g.tick(1 / 120); }
    g.input.x = g.input.z = 0;
    /* zona-aldaketa beltzera urtzean gertatzen da (fotogramaka) */
    for (let i = 0; i < 120 && g.ZONE.cur === 'ibarra'; i++) { g.zoneFadeUpdate(1 / 30); g.tick(1 / 120); }
    return { zone: g.ZONE.cur, x: +g.P.x.toFixed(2) };
  });
  ok(lamia.skip || lamia.zone === 'lamia', 'LAMIEN LEIZEAra sartzen da (ur-jauziaren atzetik, iraganean)', S(lamia));

  console.log(errs.length ? 'ERROREAK:\n' + errs.slice(0, 5).join('\n') : 'ERRORERIK EZ');
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
