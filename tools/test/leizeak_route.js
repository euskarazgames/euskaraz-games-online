// LEIZEEN DEIA: bide nagusia hasieratik amaierara (bot-a, ?test kakoekin).
// Erabili: NODE_PATH=$(npm root -g) node tools/test/leizeak_route.js http://127.0.0.1:8091/games/leizeak.html [argazki-karpeta]
// Urrats bakoitzean egoera egiaztatzen du: elkarrizketak, txalaparta (deia eta erantzuna), jentil-atea,
// leizeko gelak (sutegiak, zubiak ESNATUz, kaxak, borroka, ENTZUN, zaindaria, katea, giltza nagusia) eta etsai nagusia.
const { launch } = require('./_browser');
(async () => {
  const [url, shots] = process.argv.slice(2);
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0;
  const ok = (c, msg) => { console.log((c ? 'OK   ' : 'HUTS ') + msg); if (!c) fails++; };
  const ev = (f, a) => page.evaluate(f, a);
  const wait = (ms) => page.waitForTimeout(ms);
  /* baldintza bete arte itxaron (render motelean jokoaren erlojua erreala baino motelagoa da) */
  /* denbora errealean itxaron: makina kargatuta (jokoa ~0.1×) ere bai */
  const until = async (f, ms = 45000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return true; await wait(120); } return false; };
  const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png` }); };
  /* eszena osoa saltatu (eta ondorengo eszenak ere) */
  const skipScenes = async () => { for (let i = 0; i < 6; i++) { if (!(await ev(() => !!__game.cinematicState()))) break; await ev(() => __game.endScene()); await wait(120); } };
  const closeGet = async () => { for (let i = 0; i < 20; i++) { if (!(await ev(() => __game.GET.on))) return; await ev(() => { __game.GET.t = 9; __game.itemGetClose(); }); await wait(150); } };
  /* txalaparta-deia: entzun eta erantzun */
  const answerCall = async () => {
    await until(() => __game.TXALA.call && __game.TXALA.call.phase === 'answer', 30000);
    const seq = await ev(() => __game.TXALA.call && __game.TXALA.call.seq);
    if (!seq) return false;
    for (const s of seq) { await ev((s) => __game.txalaHit(s), s); await wait(150); }
    return await until(() => !__game.TXALA.on, 20000);
  };
  const tp = (x, y, z, a = Math.PI) => ev(([x, y, z, a]) => { const g = __game; g.teleport(x, z, y); g.P.angle = a; g.hero.rotation.y = a; g.CAM.pos = null; }, [x, y, z, a]);
  const flags = () => ev(() => [...__game.saved.flags]);

  await page.goto(url + (url.includes('?') ? '&' : '?') + 'test', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  /* render arinagoa (GPU gabeko makinetan jokoaren erlojua ez dadin gehiegi moteldu) */
  await ev(() => { __game.renderer.setPixelRatio(0.5); __game.renderer.shadowMap.enabled = false; });
  await page.click('#play');
  await wait(600);
  /* hitzaurrea (zinema eta erronkak) leizeak_prologoa.js-ek egiaztatzen du; hemen saltatu */
  ok(await ev(() => __game.FILM.on && __game.PRO.on), 'hasierako zinema (hitzaurrea)');
  await ev(() => __game.prologueSkip());
  await skipScenes();
  ok((await flags()).includes('intro'), 'intro bandera');

  /* 1 · Irati */
  await tp(0, 0, 38.6, 0);
  await wait(300);
  ok((await ev(() => __game.actionHere() && __game.actionHere().label)) === 'HITZ EGIN', 'Iratiren ondoan: HITZ EGIN');
  await ev(() => __game.interact());
  await wait(300);
  await shot('01_irati');
  await skipScenes();
  ok((await flags()).includes('irati1'), 'Iratirekin hitz egin');

  /* 2 · bikiak: ESNATU ikasi */
  await tp(0, 0, 26.2, 0);
  await wait(300);
  await ev(() => __game.interact());
  await wait(300);
  await skipScenes();
  ok(await ev(() => __game.TXALA.on && !!__game.TXALA.call), 'txalaparta-deia irekita');
  await shot('02_txala');
  ok(await answerCall(), 'deiari erantzun');
  ok(await until(() => __game.GET.on), 'ERRITMO BERRIA (une berezia)');
  await shot('03_get');
  await closeGet();
  await skipScenes();
  ok(await ev(() => __game.saved.rhythms.includes('esnatu')), 'ESNATU ikasita');

  /* 3 · harrespilako eskailera eta jentil zaharra (ENTZUN + zatia) */
  await tp(20, 0, -64, Math.PI / 2);
  await ev(() => __game.txalaOpen());
  for (const s of ['L', 'L', 'R']) { await ev((s) => __game.txalaHit(s), s); await wait(120); }
  ok(await until(() => __game.HUB.stairs.every((S) => S.awake && S.t > 0.99), 30000), 'eskailera esnatuta');
  ok(await ev(() => { const s = __game.support(27.4, -64, 20); return s && Math.abs(s.y - 8.6) < 0.3; }), 'azken harria harrespilaren altueran');
  await tp(43, 9, -64, Math.PI / 2);
  await wait(300);
  await ev(() => __game.interact());
  await wait(300);
  await skipScenes();
  if (await ev(() => __game.TXALA.on)) ok(await answerCall(), 'ENTZUN ikasi (jentila)');
  await closeGet();
  await skipScenes();
  await closeGet();
  ok(await ev(() => __game.saved.rhythms.includes('entzun') && __game.saved.pieces.includes('harrespila')), 'ENTZUN eta arnasa-zatia');

  /* 4 · leizearen atea */
  await tp(-6, 5, -131, Math.PI);
  await wait(200);
  ok((await ev(() => __game.actionHere() && __game.actionHere().label)) === 'ESNATU', 'atearen ondoan: ESNATU');
  await ev(() => __game.txalaOpen());
  for (const s of ['L', 'L', 'R']) { await ev((s) => __game.txalaHit(s), s); await wait(120); }
  ok(await until(() => __game.saved.flags.includes('atea') && __game.HUB.gate.p.off, 30000), 'atea irekita');
  await shot('04_gate');
  await tp(-6, 5, -137.6, Math.PI);
  ok(await until(() => __game.ZONE.cur === 'leizea' && !__game.ZONE.pending), 'leizean sartuta');
  await wait(600);
  await shot('05_leizea');

  /* 5 · A: sutegiak */
  await tp(600, 0, 0, Math.PI);
  for (let i = 0; i < 30 && !(await ev(() => __game.isCleared('dA-fire'))); i++) { await ev(() => { __game.P.angle = Math.PI; __game.attack(); }); await wait(350); }
  ok(await ev(() => __game.isCleared('dA-fire')), 'bi sutegiak piztuta');
  ok(await until(() => __game.DOORS.find((d) => d.id === 'dA-n').p.off), 'A-ko barrak irekita');

  /* 6 · B: harrizko zubiak lo (garairik ez lehen ekitaldian) → ESNATU → altxatuta */
  ok(await ev(() => { const g = __game; return [0, 1].every((ph) => !g.support(596, -33, 0.5, ph) && !g.support(604, -37.5, 0.5, ph) && !g.support(597, -42, 0.5, ph)); }), 'B: zubiak lo (euskarririk ez)');
  await tp(600, 0, -25, Math.PI);
  await wait(300);
  ok(await ev(() => __game.state().room === 'B'), 'B gelan');
  await ev(() => __game.txalaOpen());
  for (const s of ['L', 'L', 'R']) { await ev((s) => __game.txalaHit(s), s); await wait(120); }
  ok(await until(() => __game.saved.flags.includes('dB-esnatu')), 'ESNATU: zubiak esnatzen');
  await wait(1600);
  ok(await ev(() => { const g = __game; return !!g.support(596, -33, 0.5, 1) && !!g.support(604, -37.5, 0.5, 1) && !!g.support(597, -42, 0.5, 1); }), 'B: hiru zubiak altxatuta (orainean)');
  ok(await ev(() => !__game.canPhase() && __game.phase() === 1), 'garaiak itxita (bihurgunearen arte)');

  /* 7 · C: giltza txikia (ertz garaian) */
  await tp(564, 6.2, -44, Math.PI);
  await wait(400);
  ok((await ev(() => __game.actionHere() && __game.actionHere().label)) === 'IREKI', 'C: kutxa ireki');
  await ev(() => __game.interact());
  await wait(200);
  await closeGet();
  ok((await ev(() => __game.saved.keyz.leizea)) === 1, 'giltza txikia');

  /* 8 · B iparreko atea */
  await tp(600, 0, -50.5, Math.PI);
  await wait(300);
  ok((await ev(() => __game.actionHere() && __game.actionHere().label)) === 'ATEA', 'B: atea');
  await ev(() => __game.interact());
  ok(await until(() => __game.saved.doors.includes('dB-n') && __game.saved.keyz.leizea === 0 && __game.DOORS.find((d) => d.id === 'dB-n').p.off), 'atea giltzarekin irekita');

  /* 9 · D: borroka */
  await tp(600, 0, -70, Math.PI);
  ok(await until(() => __game.state().fight === 'D' && __game.ENEMIES.some((e) => e.state !== 'spawn')), 'D: borroka hasi');
  await shot('06_fight');
  for (let w = 0; w < 120 && (await ev(() => __game.state().fight)); w++) {
    await wait(250);
    await ev(() => { for (const e of __game.ENEMIES) if (e.state !== 'dead' && e.state !== 'spawn') __game.killEnemy(e); });
  }
  ok(await until(() => __game.isCleared('D')), 'D garbituta');
  await until(() => __game.DOORS.find((d) => d.id === 'dD-e').p.off);
  ok(await ev(() => __game.saved.doors.includes('dD-e') && __game.saved.doors.includes('dD-w')), 'ekialdeko eta mendebaldeko barrak');

  /* 10 · E: harri-danborra eta ENTZUN */
  await tp(636, 0, -68.5, Math.PI);
  await wait(300);
  ok((await ev(() => __game.actionHere() && __game.actionHere().label)) === 'ENTZUN', 'E: harri-danborra');
  await ev(() => __game.interact());
  await wait(300);
  await skipScenes();
  await tp(628, 0, -68.5, Math.PI);
  await ev(() => __game.txalaOpen());
  for (const s of ['R', 'L', 'R', 'R']) { await ev((s) => __game.txalaHit(s), s); await wait(120); }
  ok(await until(() => __game.platforms.filter((s) => s.hidden && !s.off).length === 4), 'ENTZUN: ezkutuko lau harriak agerian');
  await shot('07_echo');
  ok(await ev(() => __game.CHESTS.find((c) => c.id === 'dE-piece').m.visible), 'ezkutuko kutxa agerian');
  await tp(648, 0, -67, Math.PI / 2);
  await wait(300);
  await ev(() => __game.interact());
  await closeGet();
  ok(await ev(() => __game.saved.pieces.includes('leizea')), 'arnasa-zatia (E)');

  /* 11 · F: zaindaria → katea */
  await tp(636, 0, -112, Math.PI);
  ok(await until(() => !!__game.MINI.e && __game.MINI.e.state !== 'spawn'), 'F: zaindaria');
  await shot('08_mini');
  await ev(() => __game.MINI.e && __game.killEnemy(__game.MINI.e));
  ok(await until(() => __game.isCleared('dF-boss')), 'zaindaria garaituta');
  await tp(636, 0, -121.5, Math.PI);
  await wait(300);
  await ev(() => __game.interact());
  ok(await until(() => __game.GET.on), 'SUGAARREN KATEA');
  await shot('09_katea');
  await closeGet();
  ok(await ev(() => __game.saved.items.includes('katea')), 'katea eskuratuta');

  /* 12 · G: katea eraztunetara → giltza nagusia */
  await tp(576, 0, -72, -Math.PI / 2);
  await wait(300);
  const c1 = await ev(() => { const t = __game.chainCandidates()[0]; return t && t.kind + ':' + Math.round(t.x) + ',' + Math.round(t.z); });
  ok(c1 && c1.startsWith('ring'), 'G: lehen helburua eraztun bat (' + c1 + ')');
  await ev(() => __game.chainFire());
  await until(() => __game.CHAIN.state === 'idle' && __game.P.grounded, 15000);
  const onP = await ev(() => [__game.P.x, __game.P.y, __game.P.z].map((v) => +v.toFixed(1)));
  ok(Math.abs(onP[0] - 564) < 2.5 && onP[1] > 2 && Math.abs(onP[2] + 72) < 2.5, 'zutabearen gainean: ' + onP);
  await shot('10_chain');
  await ev(() => { __game.P.angle = Math.atan2(549.4 - 564, -84 + 72); });
  await ev(() => __game.chainFire());
  await until(() => __game.CHAIN.state === 'idle' && __game.P.grounded, 15000);
  const onW = await ev(() => [__game.P.x, __game.P.y, __game.P.z].map((v) => +v.toFixed(1)));
  ok(onW[0] < 558 && onW[1] < 1 && onW[1] > -0.5, 'mendebaldeko ertzean: ' + onW);
  await tp(553, 0, -86, -Math.PI / 2);
  await wait(300);
  await ev(() => __game.interact());
  await closeGet();
  ok(await ev(() => __game.saved.items.includes('giltzanagusia')), 'GILTZA NAGUSIA');

  /* 13 · ate handia eta Basajaun */
  await tp(600, 0, -89.5, Math.PI);
  await wait(300);
  await ev(() => __game.interact());
  ok(await until(() => __game.saved.doors.includes('dD-n') && __game.DOORS.find((d) => d.id === 'dD-n').p.off), 'ate handia irekita');
  await tp(600, 0, -118, Math.PI);
  ok(await until(() => !!__game.cinematicState()), 'Basajaun: sarrera-eszena');
  await skipScenes();
  ok(await ev(() => __game.BOSS.on && __game.BJ.state !== 'sleep'), 'borroka hasita');
  await wait(2500);
  await shot('11_boss');
  for (let plate = 0; plate < 3; plate++) {
    await until(() => __game.CHAIN.state === 'idle');
    await ev(() => { __game.BJ.state = 'tired'; __game.BJ.t = 0.1; });
    await tp(600, 0, -116, Math.PI);
    await ev(() => { __game.P.angle = Math.PI; });
    await ev(() => __game.chainFire());
    ok(await until(() => __game.BJ.state === 'open', 10000), 'plaka ' + (plate + 1) + ': katea → bihotza agerian');
    if (plate === 0) await shot('12_heart');
    for (let i = 0; i < 12 && (await ev(() => __game.BOSS.vulnerable())); i++) { await ev(() => __game.BOSS.hit(1)); await wait(60); }
  }
  ok(await until(() => __game.BOSS.dead), 'Basajaun garaituta');
  await skipScenes();
  await closeGet();
  await skipScenes();
  ok((await flags()).includes('basajaun'), 'basajaun bandera');
  ok(await ev(() => __game.P.maxHp >= 6), 'bihotza: arnasa gehiago (' + (await ev(() => __game.P.maxHp)) + ')');

  /* 14 · irten eta amaiera */
  await tp(600, 0, 14, 0);
  ok(await until(() => __game.ZONE.cur === 'ibarra' && !__game.ZONE.pending), 'haranera itzuli');
  await wait(500);
  await tp(0, 0, 38.6, 0);
  await wait(300);
  await ev(() => __game.interact());
  await until(() => !!__game.cinematicState());
  await wait(2500);
  await shot('13_mari');
  await skipScenes();
  ok((await flags()).includes('cliff'), 'amaierako eszena (Mariren sua)');
  console.log('helburua:', JSON.stringify(await ev(() => __game.objective())));
  console.log('denbora:', await ev(() => Math.round(__game.saved.playTime)), 's · hildakoak:', await ev(() => __game.saved.deaths));
  console.log(errs.length ? errs.join('\n') : 'ERRORERIK EZ');
  await browser.close();
  process.exit(fails || errs.length ? 1 : 0);
})();
