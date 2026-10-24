// LEIZEEN DEIA: OROITZAPENAK eta azken atala (ANBOTO) — bot-a, ?test kakoekin.
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_anboto.js http://127.0.0.1:8091/games/leizeak.html [pantaila-argazkien-karpeta]
// 1 · zazpi oroitzapenak (plano guztiak benetako begiztan, azkar aurreratuta): banderak eta egunkaria.
// 2 · Inguma ondoren: plazan Irati → suzko bola → ANBOTO (gailurra) → duelua harrizko txalapartan:
//     lau eta bost kolpe (Amaiur bakarrik) eta zazpi kolpe BI AHOTSEZ (Amaiurrek ◀, Iratik ▶ berez);
//     huts egitean, berriro galdezka → amaiera eta epilogoa → haranean, Irati bizirik (mamurik gabe).
const { launch } = require('./_browser');
(async () => {
  const [url, shots] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg, extra = '') => { console.log((c ? 'OK   ' : 'HUTS ') + msg + (extra !== '' ? '  ' + extra : '')); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  /* gordetako partida: zazpi leizeak amaituta, zazpigarren argia berde */
  await ev(() => {
    localStorage.clear();
    const s = __game.saved;
    s.flags.push('intro', 'irati1', 'atea', 'leizea', 'basajaun', 'cliff', 'ardiak', 'lamia', 'irati-lamia', 'lepoa', 'tartalo', 'irati-tartalo', 'jentil', 'jentilatea', 'errolan', 'irati-errolan', 'ortzadarra', 'odei', 'irati-odei', 'sutondoa', 'etxea', 'kattalin', 'txomin', 'herensugea', 'irati-herensuge', 'inguma-ametsa', 'seaska', 'seaska-kanta', 'inguma', 'irati-inguma');
    s.rhythms.push('esnatu', 'entzun', 'ortzi', 'eguzkilore', 'seaska');
    s.items.push('makilak', 'katea', 'adarra', 'sugarra', 'tximistarria', 'enara', 'ispilua');
    s.hearts = 7;
    s.tod = 0.4;
  });
  await ev((hd) => { __game.renderer.setPixelRatio(hd ? 1 : 0.25); __game.renderer.shadowMap.enabled = hd; }, !!shots);
  await ev(() => document.getElementById('play').click());
  await page.waitForTimeout(400);
  await ev(() => { __game.endScene(); window.__hold = true; __game.DAY.freeze = true; });

  const T = (n = 1) => ev((n) => { const g = __game; for (let i = 0; i < n; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } }, n);
  const skipScenes = () => ev(() => { const g = __game; for (let i = 0; i < 16 && g.cinematicState(); i++) g.endScene(); });
  /* zinema benetako begiztan, plano bakoitza berehala amaituta (on/tick guztiak exekutatzeko) */
  const playFilm = async (max = 40) => {
    let n = 0;
    await ev(() => { window.__hold = false; });
    for (let k = 0; k < 400 && (await ev(() => __game.FILM.on)); k++) {
      const i = await ev(() => { const F = __game.FILM; if (F.on && F.sh) { F.t = Math.max(F.t, F.sh.d + 0.01); F.vOn = true; F.vEnd = 0; } return F.i; });
      n = Math.max(n, i + 1);
      await page.waitForTimeout(60);
      if (n > max) break;
    }
    await ev(() => { window.__hold = true; });
    return n;
  };
  const shot = async (name) => { if (!shots) return; await ev(() => { for (let i = 0; i < 2; i++) __game.draw(); }); await page.screenshot({ path: `${shots}/${name}.png` }); };
  const flag = (k) => ev((k) => __game.saved.flags.includes(k), k);

  /* ---------------- 1 · oroitzapenak ---------------- */
  for (let i = 0; i < 7; i++) {
    const started = await ev((i) => __game.oroitPlay(i), i);
    ok(started, 'oroitzapena ' + (i + 1) + ' hasi da');
    ok(await ev(() => document.body.classList.contains('oroit')), '  sepia (body.oroit)');
    const n = await playFilm();
    ok(n >= 3, '  planoak: ' + n);
    ok(await flag('oroit-' + (i + 1)), '  bandera oroit-' + (i + 1));
    ok(!(await ev(() => document.body.classList.contains('oroit'))), '  sepia kenduta');
  }
  const log = await ev(() => __game.oroitLog());
  ok(/OROITZAPENAK · 7 \/ 7/.test(log) && /AHIZPAK/.test(log), 'egunkarian zazpi oroitzapen');
  /* Iturralden: oroigarrien apala → GOGORATU (eszena haranean, gero etxera itzuli) */
  await ev(() => { const g = __game; g.homeEnter(); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  ok(await ev(() => __game.ZONE.cur === 'etxea'), 'Iturralden');
  await ev(() => __game.homeMementos());
  const labels = await ev(() => [...document.querySelectorAll('#choices button')].map((b) => b.textContent));
  ok(labels.filter((t) => /GOGORATU/.test(t)).length === 7, 'apalean: zazpi GOGORATU', labels.join(' | '));
  await ev(() => [...document.querySelectorAll('#choices button')].find((b) => /GOGORATU · III/.test(b.textContent)).click());
  await page.waitForTimeout(100);
  ok(await ev(() => __game.FILM.on && __game.ZONE.cur === 'ibarra'), 'oroitzapena berriro (haranean)');
  await playFilm();
  ok(await ev(() => __game.ZONE.cur === 'etxea' && !__game.FILM.on), 'etxera itzulita');
  await ev(() => { const g = __game; g.teleport(g.DGE.exitArch.x, g.DGE.exitArch.z + 3.6, 0); for (let i = 0; i < 240; i++) { g.tick(1 / 120); g.zoneFadeUpdate(1 / 120); } });
  ok(await ev(() => __game.ZONE.cur === 'ibarra'), 'kanpora (haranera)');

  /* ---------------- 2 · plazan Irati → Anbotora ---------------- */
  let obj = await ev(() => __game.objective());
  ok(/Anbotora/.test(obj[0]), 'helburua: Anbotora', obj[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.4, N.z + 1.2, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); });
  ok(!!(await ev(() => __game.cinematicState())), 'Iratiren eszena (suzko bola)');
  await skipScenes();
  ok(await ev(() => __game.FILM.on), 'hegaldiaren zinema');
  await playFilm();
  await T(4);
  ok(await ev(() => __game.ZONE.cur === 'anboto'), 'ANBOTO zona', await ev(() => __game.ZONE.cur));
  /* (playFilm-ek iritsierako zinema ere jotzen du: Gaueko agertu eta "Galdetu, Gaueko") */
  await playFilm();
  await T(10);
  ok(await ev(() => __game.AN.stage === 'duel'), 'duelua prest', await ev(() => __game.AN.stage));
  obj = await ev(() => __game.objective());
  ok(/ERANTZUN/.test(obj[0]), 'helburua: ERANTZUN', obj[0]);
  await shot('anboto_gailurra');
  /* gailurrean ibili (plataforma ondo) */
  const st = await ev(() => { const g = __game; return { y: g.P.y, gr: g.P.grounded, z: g.P.z }; });
  ok(st.gr && Math.abs(st.y) < 0.3, 'gailurrean zutik', JSON.stringify(st));

  /* ---------------- 3 · duelua ---------------- */
  const toTx = () => ev(() => { const g = __game; g.teleport(g.AN.tx.x, g.AN.tx.z + 2, 0); g.P.angle = Math.PI; for (let i = 0; i < 8; i++) g.tick(1 / 120); const a = g.actionHere(); return a ? a.kind + ':' + a.label : null; });
  ok((await toTx()) === 'txala:ERANTZUN', 'txalapartan: ERANTZUN');
  const answer = (opts = {}) => ev((opts) => {
    const g = __game;
    for (let i = 0; i < 2400 && !(g.TXALA.call && g.TXALA.call.phase === 'answer'); i++) g.tick(1 / 120);
    const C = g.TXALA.call;
    if (!C) return { err: 'deirik ez' };
    const seq = C.seq.slice();
    if (opts.wrong) { g.txalaHit(seq[0] === 'L' ? 'R' : 'L'); for (let i = 0; i < 30; i++) g.tick(1 / 120); return { seq: seq.join(''), phase: C.phase }; }
    for (let k = 0; k < seq.length; k++) {
      if (C.duet && seq[k] === 'R') { for (let i = 0; i < 90 && C.i <= k; i++) g.tick(1 / 120); continue; }
      g.txalaHit(seq[k]);
      for (let i = 0; i < 20; i++) g.tick(1 / 120);
    }
    for (let i = 0; i < 120; i++) g.tick(1 / 120);
    return { seq: seq.join(''), duet: !!C.duet, success: !!C.success, on: g.TXALA.on };
  }, opts);
  await ev(() => __game.interact());
  ok(await ev(() => __game.TXALA.on && /GAUEKOREN DEIA · I/.test(document.getElementById('txTitle').textContent)), 'lehen deia (Gaueko)');
  let r = await answer({ wrong: true });
  ok(r.phase === 'wait' || r.phase === 'listen', 'huts egin → berriro galdezka', JSON.stringify(r));
  r = await answer();
  ok(r.seq === 'LRRL' && !r.on, 'I: erantzuna ondo', JSON.stringify(r));
  ok(await ev(() => __game.AN.round === 1 && __game.AN.lit === 2), 'bi zutarri piztuta');
  await playFilm();
  await T(80);
  ok(await ev(() => __game.TXALA.on), 'bigarren deia berez');
  r = await answer();
  ok(r.seq === 'RLLRL' && !r.on, 'II: erantzuna ondo', JSON.stringify(r));
  ok(await ev(() => __game.AN.round === 2 && __game.AN.lit === 4), 'lau zutarri piztuta');
  await playFilm();
  await T(80);
  ok(await ev(() => __game.TXALA.on && __game.TXALA.call && __game.TXALA.call.duet), 'hirugarrena: BI AHOTSEZ');
  ok(await ev(() => document.querySelectorAll('#txSeq i.ir').length === 4), 'Iratiren kolpeak markatuta (▶ ×4)');
  r = await answer();
  ok(r.seq === 'LRLRRLR' && !r.on, 'III: bi ahotsez ondo', JSON.stringify(r));
  ok(await ev(() => __game.AN.lit === 7 && __game.AN.stage === 'end'), 'zazpi zutarriak; amaiera');
  await shot('anboto_amaiera');
  /* ---------------- 4 · amaiera eta epilogoa ---------------- */
  const nShots = await playFilm(30);
  ok(nShots >= 12, 'amaierako zinema (planoak: ' + nShots + ')');
  await T(10);
  ok(await flag('anboto'), 'bandera: anboto');
  ok(await ev(() => __game.ZONE.cur === 'ibarra'), 'haranean berriro');
  ok(await ev(() => { const N = __game.NPCS.find((n) => n.id === 'irati'); let solid = true; N.root.traverse((m) => { if (m.isMesh && m.material.transparent) solid = false; }); return solid && N.body; }), 'Irati bizirik (mamurik gabe)');
  obj = await ev(() => __game.objective());
  ok(/Harana zurea/.test(obj[0]), 'helburua: harana zurea', obj[0]);
  await ev(() => { const g = __game, N = g.NPCS.find((n) => n.id === 'irati'); g.teleport(N.x + 1.4, N.z + 1.2, 0); for (let i = 0; i < 6; i++) g.tick(1 / 120); g.talkTo(N); });
  const said = await ev(() => document.getElementById('cineText') ? document.getElementById('cineText').textContent : '');
  ok(await ev(() => !!__game.cinematicState()), 'Iratirekin hitz egin (amaieraren ondoren)', said.slice(0, 60));
  await skipScenes();
  await shot('epilogoa');

  if (errs.length) { console.log('ERROREAK:\n' + errs.slice(0, 8).join('\n')); fails += errs.length; } else console.log('ERRORERIK EZ');
  console.log(fails ? 'HUTSAK: ' + fails : 'DENA ONDO');
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
