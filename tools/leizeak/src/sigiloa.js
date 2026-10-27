  /* ==================================================================
     SIGILOA · Gauekoren itzal-zaindariak (diseinu propioa; sigilu-jokoen ideia orokorrak, gure eran)
     · ZAINDARIA: itzal bat kriseilu batekin. Bide bat egiten du (puntuz puntu) eta geldialdietan
       inguruari begiratzen dio. Haren argi-konoa lurrean ikusten da (hormek mozten dute): barruan
       bazaude, susmoa hazten da (?) — beteta: IKUSI ZAITU (!) eta ALARMA.
     · ALARMA: ALERTA (zaindariak ehizan, itzal gehiago lurretik) → IHESA (bilatzen) → ZAINTZA
       (begirada zabalagoa) → lasai. Ikusten ez zaituzten bitartean, kontagailua jaisten da.
     · OIHARTZUN-RADARRA: Iratiren oihartzunak zaindariak eta haien begiradak erakusten ditu
       (goiko eskuinean). Alarman, Gauekoren zaratak itsutzen du.
     · TOK-TOK: makilaz hormari jo → hurbileko zaindariak hotsera datoz (bidea libre).
       LOTARAZI: zaindari baten atzean, oharkabean → lo (une batez).
       ITZAL-ZOKOAK: ilunpean, geldi edo astiro, ia ez zaituzte ikusten. Korrika: hotsa.
     · BEGI-HARRIAK: Gauekoren harrizko begi finkoak, biraka (ezin dira lotarazi).
     · ARGI-HARIAK: orainaren izotz-hariak; ukituz gero, alarma. Iraganean ez daude.
     ================================================================== */
  const SIG_ALERT = 14,
    SIG_EVADE = 10,
    SIG_CAUTION = 12;
  const SIG = { zone: null, guards: [], eyes: [], threads: [], hides: [], defs: [], phase: 0, t: 0, last: null, alarms: 0, sleeps: 0, knocks: 0, knockCd: 0, noiseCd: 0, walls: [], circles: [], rT: 0, ping: 0, warned: 0, cv: null };
  /* zaindariak (eta haien hezurdura) ez dira lasai dauden bitartean borroka-musika/irakaspenetan sartzen */
  function sigCalm(e) {
    return e.type === "zaindari" && SIG.phase !== 1;
  }
  /* ------------------------------ ikusmena: hormak ------------------------------ */
  /* gunearen hormak (LOS): horma-plataformak (garaiak) eta zutabeak; ateak irekita daudenean ez */
  function sigWallsCollect() {
    SIG.walls = platforms.filter((s) => s.wall && !s.bars && s.y - (s.bottom ?? s.y - 2) > 1.4);
    SIG.circles = solids.filter((o) => o.pillar && o.r >= 0.6 && o.h >= 2);
  }
  function rayRect(s, ox, oz, dx, dz, maxT) {
    if (s.off) return maxT;
    const c = Math.cos(s.rot || 0),
      n = Math.sin(s.rot || 0),
      [lx, lz] = local(s, ox, oz),
      ux = dx * c - dz * n,
      uz = dx * n + dz * c;
    let t0 = 0,
      t1 = maxT;
    for (const [p, u, h] of [
      [lx, ux, s.w / 2],
      [lz, uz, s.d / 2],
    ]) {
      if (Math.abs(u) < 1e-9) {
        if (p < -h || p > h) return maxT;
        continue;
      }
      let a = (-h - p) / u,
        b = (h - p) / u;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return maxT;
    }
    return t0 > 0 ? t0 : maxT;
  }
  /* izpia (xz): lehen oztoporaino zenbat (gehienez maxT) */
  function sigRay(ox, oz, dx, dz, maxT) {
    let t = maxT;
    for (const s of SIG.walls) {
      if (Math.abs(s.x - ox) > t + (s.w + s.d) * 0.5 + 1 || Math.abs(s.z - oz) > t + (s.w + s.d) * 0.5 + 1) continue;
      t = Math.min(t, rayRect(s, ox, oz, dx, dz, t));
    }
    for (const o of SIG.circles) {
      const fx = o.x - ox,
        fz = o.z - oz,
        b = fx * dx + fz * dz;
      if (b < 0 || b - o.r > t) continue;
      const q = fx * fx + fz * fz - b * b;
      if (q > o.r * o.r) continue;
      t = Math.min(t, b - Math.sqrt(o.r * o.r - q));
    }
    return Math.max(0, t);
  }
  /* Amaiur ezkutuan: itzal-zoko batean eta astiro (korrika edo erasoan, ez) */
  function sigHidden() {
    if (Math.hypot(P.vx, P.vz) > 4.5 || MAG.charging || ATK.t < 0.4) return false;
    return SIG.hides.some((h) => Math.hypot(P.x - h.x, P.z - h.z) < h.r);
  }
  /* ------------------------------ zaindaria ------------------------------ */
  let SIG_TEX = null;
  function sigTextures() {
    if (SIG_TEX) return SIG_TEX;
    /* konoa: erdian argi, ertzean itzaltzen */
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d"),
      gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.75, "#ffffffaa");
    gr.addColorStop(1, "#ffffff00");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    const mk = (ch, col) => {
      const m = document.createElement("canvas");
      m.width = m.height = 64;
      const x = m.getContext("2d");
      x.font = "900 54px Georgia";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.lineWidth = 7;
      x.strokeStyle = "#140c08";
      x.strokeText(ch, 32, 35);
      x.fillStyle = col;
      x.fillText(ch, 32, 35);
      return new T.CanvasTexture(m);
    };
    SIG_TEX = { cone: new T.CanvasTexture(c), q: mk("?", "#ffd36a"), x: mk("!", "#ff4a3a"), z: mk("z", "#bfe0ff") };
    return SIG_TEX;
  }
  const SIG_N = 16;
  function sigCone(parent) {
    const geo = new T.BufferGeometry(),
      pos = new Float32Array((SIG_N + 2) * 3),
      uv = new Float32Array((SIG_N + 2) * 2),
      idx = [];
    for (let i = 0; i < SIG_N; i++) idx.push(0, i + 1, i + 2);
    geo.setAttribute("position", new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute("uv", new T.BufferAttribute(uv, 2).setUsage(T.DynamicDrawUsage));
    geo.setIndex(idx);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: "#ffd36a", map: sigTextures().cone, transparent: true, opacity: 0.38, depthWrite: false, side: T.DoubleSide, fog: false }));
    m.frustumCulled = false;
    m.renderOrder = 2;
    parent.add(m);
    /* ertza: konoaren forma irakurgarri lur argian ere */
    const eg = new T.BufferGeometry();
    eg.setAttribute("position", new T.BufferAttribute(new Float32Array((SIG_N + 3) * 3), 3).setUsage(T.DynamicDrawUsage));
    const edge = new T.LineLoop(eg, new T.LineBasicMaterial({ color: "#ffd36a", transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
    edge.frustumCulled = false;
    edge.renderOrder = 3;
    m.add(edge);
    m.userData.edge = edge;
    return m;
  }
  /* konoaren kolorea (eta ertzarena) */
  function sigConeColor(m, col, op) {
    m.material.color.set(col);
    m.material.opacity = op;
    m.userData.edge.material.color.set(col);
    m.userData.edge.material.opacity = Math.min(1, op * 2);
  }
  /* konoaren erpinak: lurrean (gurasoa: auraren plano etzana — x lokala = x, y lokala = −z),
     izpi bakoitza lehen hormaraino */
  function sigConeSet(m, ox, oz, dir, fov, range) {
    const pos = m.geometry.attributes.position,
      uv = m.geometry.attributes.uv;
    pos.setXYZ(0, 0, 0, 0.03);
    uv.setXY(0, 0.5, 0.5);
    const ep = m.userData.edge.geometry.attributes.position;
    ep.setXYZ(0, 0, 0, 0.04);
    for (let i = 0; i <= SIG_N; i++) {
      const a = dir - fov + (2 * fov * i) / SIG_N,
        dx = Math.sin(a),
        dz = Math.cos(a),
        r = sigRay(ox, oz, dx, dz, range);
      pos.setXYZ(i + 1, dx * r, -dz * r, 0.03);
      ep.setXYZ(i + 1, dx * r, -dz * r, 0.04);
      uv.setXY(i + 1, 0.5 + (dx * r) / (2 * range), 0.5 - (dz * r) / (2 * range));
    }
    ep.setXYZ(SIG_N + 2, 0, 0, 0.04);
    pos.needsUpdate = uv.needsUpdate = ep.needsUpdate = true;
  }
  function zainMake(def, temp) {
    const D = EN_DEF.zaindari,
      M = enemyMesh("zaindari", -1),
      y = def.y || 0,
      e = { type: "zaindari", era: -1, x: def.x, z: def.z, y, vx: 0, vz: 0, hp: D.hp, max: D.hp, state: "look", t: 0, cd: 1, dir: def.a ?? 0, flash: 0, stun: 0, hitT: 0, blinkCd: 99, room: def.room || null, K: 1, H: D.H, ...M, D };
    e.g.position.set(e.x, y, e.z);
    e.g.rotation.y = e.dir;
    e.spawnLen = 0;
    /* Gauekoren itzala: gorputz iluna, urrezko begiak eta kriseilua */
    e.body.color.set("#6d7594");
    if (e.rigid) e.rigid.color.set("#6d7594");
    e.eye.color.set("#ffcf7a");
    if (e.shine) e.shine.material.color.set("#ffcf7a");
    e.aura.material.color.set("#9fd8ff");
    const lamp = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffd79a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    lamp.scale.setScalar(1.5);
    lamp.position.set(0.5, 1.3, 0.55);
    e.g.add(lamp);
    const T0 = sigTextures(),
      mark = new T.Sprite(new T.SpriteMaterial({ map: T0.q, transparent: true, depthTest: false, opacity: 0 }));
    mark.scale.setScalar(1.15);
    mark.position.y = 3.25;
    mark.renderOrder = 10;
    e.g.add(mark);
    e.zain = { def, temp: !!temp, mode: "patrol", i: 0, wait: 0, sus: 0, target: null, lookDir: e.dir, lookBase: e.dir, lookT: 0, modeT: 0, sleepT: 0, see: 0, seeNow: false, cone: sigCone(e.aura), mark, markK: "", markT: 0, lamp, range: def.range || 9.5, fov: def.fov || 0.62, coneT: Math.random() * 0.05 };
    ENEMIES.push(e);
    SIG.guards.push(e);
    enAnim(e, "Idle_Combat", 0.7);
    return e;
  }
  /* BEGI-HARRIA: zutabe bat urrezko begi batekin, biraka */
  function sigEye(def) {
    const g = new T.Group();
    g.position.set(def.x, def.y || 0, def.z);
    BP.add(g);
    const col = obj(new T.CylinderGeometry(0.55, 0.75, 3.2, 7), rockMaterial(), g);
    col.position.y = 1.6;
    const head = obj(new T.DodecahedronGeometry(0.75, 0), rockMaterial(), g);
    head.position.y = 3.5;
    const eye = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffcf7a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
    eye.scale.set(1.3, 0.55, 1);
    eye.position.y = 3.55;
    g.add(eye);
    const flat = new T.Group();
    flat.rotation.x = -PI / 2;
    flat.position.set(def.x, (def.y || 0) + 0.05, def.z);
    BP.add(flat);
    const E = { ...def, g, head, eye, cone: sigCone(flat), dir: def.base, sus: 0, range: def.range || 11, fov: def.fov || 0.32 };
    solids.push({ x: def.x, z: def.z, r: 0.75, h: 4, y: def.y || 0, pillar: true });
    SIG.eyes.push(E);
    return E;
  }
  /* ARGI-HARIA: izotz-hari bat bi hormen artean (orainean bakarrik) */
  function sigThread(ax, az, bx, bz, y) {
    const len = Math.hypot(bx - ax, bz - az),
      m = obj(new T.CylinderGeometry(0.035, 0.035, len, 5), new T.MeshBasicMaterial({ color: "#bff6ff", transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set((ax + bx) / 2, y, (az + bz) / 2);
    /* zilindroaren ardatza (Y) etzanda, A→B norabidean */
    m.rotation.order = "YXZ";
    m.rotation.set(PI / 2, Math.atan2(bx - ax, bz - az), 0);
    m.castShadow = false;
    /* altuera irakurgarri goitik ere: haren itzala lurrean (azpian) eta izotz-kristal bat muturretan */
    const h = Math.atan2(bx - ax, bz - az),
      floor = obj(new T.PlaneGeometry(0.3, len), new T.MeshBasicMaterial({ color: "#06121c", transparent: true, opacity: 0.55, depthWrite: false }));
    floor.position.set((ax + bx) / 2, 0.045, (az + bz) / 2);
    floor.rotation.order = "YXZ";
    floor.rotation.set(-PI / 2, h, 0);
    floor.castShadow = false;
    const parts = [m, floor];
    for (const [x, z] of [[ax, az], [bx, bz]]) {
      const c = obj(new T.OctahedronGeometry(0.26, 0), new T.MeshBasicMaterial({ color: "#dffaff" }));
      c.position.set(x, y, z);
      c.scale.set(1, 1.5, 1);
      c.castShadow = false;
      parts.push(c);
    }
    const th = { ax, az, bx, bz, y, m, parts };
    SIG.threads.push(th);
    return th;
  }
  /* ------------------------------ gunea ------------------------------ */
  /* gunean sartzean: zaindariak sortu (enterZone-k etsaiak garbitzen ditu) eta hormak bildu */
  function sigStart(zone, defs) {
    SIG.zone = zone;
    SIG.defs = defs;
    sigWallsCollect();
    sigReset();
    $("radar").hidden = false;
    $("map").classList.add("sig");
    document.body.classList.add("sig");
  }
  function sigStop() {
    if (!SIG.zone) return;
    SIG.zone = null;
    /* etsaiak enterZone-k garbitzen ditu */
    SIG.guards.length = 0;
    SIG.phase = 0;
    $("radar").hidden = true;
    $("sigBanner").hidden = true;
    $("map").classList.remove("sig");
    document.body.classList.remove("sig");
  }
  /* zaindariak beren bideetara (hasieran eta kontrol-puntura itzultzean) */
  function sigReset() {
    for (const e of SIG.guards)
      if (ENEMIES.includes(e)) {
        removeEnemy(e);
        ENEMIES.splice(ENEMIES.indexOf(e), 1);
      }
    SIG.guards.length = 0;
    SIG.phase = 0;
    SIG.t = 0;
    SIG.last = null;
    for (const d of SIG.defs) if (!(d.flag && saved.flags.includes(d.flag))) zainMake(d);
    for (const E of SIG.eyes) E.sus = 0;
    $("sigBanner").hidden = true;
  }
  function sigRespawn() {
    if (SIG.zone && ZONE.cur === SIG.zone) sigReset();
  }
  /* ------------------------------ alarma ------------------------------ */
  function sigSpotted(e, x = P.x, z = P.z) {
    const fresh = SIG.phase !== 1;
    SIG.phase = 1;
    SIG.t = SIG_ALERT;
    SIG.last = { x, z };
    if (e && e.zain) {
      e.zain.markK = "x";
      e.zain.markT = 1.6;
    }
    for (const g of SIG.guards) {
      const Z = g.zain;
      if (!Z || g.state === "dead" || Z.mode === "sleep" || Z.mode === "wake") continue;
      if (Z.mode !== "hunt") Object.assign(Z, { mode: "hunt", lookT: 0, lookBase: g.dir, modeT: 0 });
    }
    if (!fresh) return;
    SIG.alarms++;
    SND.stinger(true);
    SND.static(0.6);
    shake(0.2);
    haptic(40);
    /* Gaueko: lehen alarman eta, gero, txandaka */
    if (SIG.alarms % 2 === 1) voicePlay(SIG.alarms === 1 ? "hp_g1" : "pro_g4");
    if (SIG.alarms === 1) notify("IKUSI ZAITUZTE! Ezkutatu eta itxaron: begiratzen ez dizuten bitartean, alarma jaisten da.", "", 4);
    sigReinforce();
  }
  /* indargarriak: bi itzal lurretik, Amaiurren gelan (8-11 m-ra) */
  function sigReinforce() {
    const R = ROOM.cur && ROOM.cur.zone === ZONE.cur ? ROOM.cur : null;
    let n = 0;
    for (let k = 0; k < 24 && n < 2; k++) {
      const a = (k / 24) * TAU + 0.4,
        r = 8 + (k % 3) * 1.5,
        x = P.x + Math.cos(a) * r,
        z = P.z + Math.sin(a) * r;
      if (R && (Math.abs(x - R.x) > R.w / 2 - 2 || Math.abs(z - R.z) > R.d / 2 - 2)) continue;
      if (SIG.walls.some((s) => contains(s, x, z, 0.9)) || solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1)) continue;
      if (!support(x, z, P.y + 1)) continue;
      const e = zainMake({ x, z, y: P.y, a: Math.atan2(P.x - x, P.z - z), path: [[x, z, 2]], room: R, range: 10 }, true);
      Object.assign(e.zain, { mode: "wake" });
      e.state = "wake";
      e.t = 0;
      fxRing(x, P.y + 0.05, z, "#6d28c9", 2.4, 0.6);
      fxBurst(x, P.y + 0.3, z, { n: 18, speed: 2.5, up: 3, life: 0.8, size: 0.32, color: "#1a1030", grav: 2 });
      n++;
    }
  }
  /* removeEnemy-tik: konoaren geometriak, ertza, kriseilua eta ikurra (konoaren materiala aurarekin doa) */
  function zainDispose(e) {
    const Z = e.zain,
      c = Z.cone;
    c.geometry.dispose();
    c.userData.edge.geometry.dispose();
    c.userData.edge.material.dispose();
    Z.lamp.material.dispose();
    Z.mark.material.dispose();
  }
  function sigVanish(e) {
    fxBurst(e.x, e.y + 0.8, e.z, { n: 22, speed: 1.6, up: 1.4, life: 0.9, size: 0.34, color: "#1a1030", grav: -1.2 });
    fxRing(e.x, e.y + 0.05, e.z, "#6d28c9", 1.8, 0.45);
    removeEnemy(e);
    const i = ENEMIES.indexOf(e);
    if (i >= 0) ENEMIES.splice(i, 1);
    const j = SIG.guards.indexOf(e);
    if (j >= 0) SIG.guards.splice(j, 1);
  }
  /* zarata: hurbileko zaindariak (lasai edo susmoz) hotsera */
  function sigNoise(x, z, r) {
    for (const e of SIG.guards) {
      const Z = e.zain;
      if (!Z || e.state === "dead" || Z.mode === "sleep" || Z.mode === "wake" || Z.mode === "hunt") continue;
      if (Math.hypot(e.x - x, e.z - z) > r) continue;
      Object.assign(Z, { mode: "suspect", target: { x, z }, lookT: 0, modeT: 0, markK: "q", markT: 1.4 });
      Z.sus = Math.max(Z.sus, 0.36);
    }
  }
  function sigKnock() {
    if (SIG.knockCd > 0) return;
    SIG.knockCd = 1.4;
    SIG.knocks++;
    SND.tok("L", true, 0.9);
    setTimeout(() => SND.tok("L", true, 0.8), 170);
    fxRing(P.x, P.y + 1, P.z, "#ffe0a8", 2.2, 0.35);
    sigNoise(P.x, P.z, 9.5);
    coachDone("tok");
  }
  function sigSleep(e) {
    const Z = e.zain;
    if (!Z || Z.mode === "sleep") return;
    Object.assign(Z, { mode: "sleep", sleepT: 45, sus: 0, markK: "z", markT: 99 });
    e.state = "sleep";
    e.t = 0;
    e.vx = e.vz = 0;
    SIG.sleeps++;
    SND.chime();
    fxBurst(e.x, e.y + 1.6, e.z, { n: 18, speed: 1.2, up: 1.5, life: 1.4, size: 0.3, color: "#bfe0ff", grav: -0.5 });
    animate("Spellcast_Raise");
    coachDone("lotarazi");
  }
  /* ------------------------------ ekintzak ------------------------------ */
  function sigActionNear() {
    if (!SIG.zone || ZONE.cur !== SIG.zone || !P.grounded) return null;
    for (const e of SIG.guards) {
      const Z = e.zain;
      if (!Z || e.state === "dead" || Z.mode === "sleep" || Z.mode === "wake" || Z.mode === "hunt" || e.state === "wind" || e.state === "lunge") continue;
      const dx = P.x - e.x,
        dz = P.z - e.z;
      if (Math.hypot(dx, dz) > 2.4 || Math.abs(P.y - e.y) > 1.2) continue;
      /* atzetik (begiradaren kontrako aldean) eta oraindik ikusi gabe */
      if (angDiff(Math.atan2(dx, dz), Z.lookDir) > 1.75 && Z.sus < 0.7) return { kind: "attack", label: L("LOTARAZI"), fn: () => sigSleep(e) };
    }
    if (SIG.phase === 1 || SIG.knockCd > 0) return null;
    for (const s of SIG.walls) {
      if (s.off || Math.abs(s.x - P.x) > s.w + s.d || Math.abs(s.z - P.z) > s.w + s.d) continue;
      const [lx, lz] = local(s, P.x, P.z);
      if (Math.max(Math.abs(lx) - s.w / 2, Math.abs(lz) - s.d / 2) < 1.15) return { kind: "txala", label: L("TOK-TOK"), fn: sigKnock };
    }
    return null;
  }
  /* ------------------------------ AI (combat.js-eko enemyUpdate-tik) ------------------------------ */
  /* itzultzen du: [abiadura, norabidea x, z] */
  function zainAI(e, dt, d, ux, uz) {
    const Z = e.zain;
    if (!Z) return [0, 0, 0];
    Z.modeT += dt;
    /* jo dutenean: esnatu eta alarma */
    if (e.hitT > 0 && Z.mode !== "hunt") {
      if (Z.mode === "sleep" || Z.mode === "wake") Z.mode = "patrol";
      sigSpotted(e);
    }
    /* erasoa (ehizan) */
    if (e.state === "stun") {
      if (e.t > 1.2) (e.state = "chase"), (e.t = 0);
      return [0, 0, 0];
    }
    if (e.state === "wind") {
      e.dir = Z.lookDir = Math.atan2(e.lx, e.lz);
      if (e.t > 0.5) (e.state = "lunge"), (e.t = 0);
      return [0, 0, 0];
    }
    if (e.state === "lunge") {
      e.vx = e.lx * 10;
      e.vz = e.lz * 10;
      if (d < e.D.r + 0.55 && Math.abs(P.y - e.y) < 1.4) meleeHit(e, e.D.dmg);
      if (e.t > 0.22) (e.state = "recover"), (e.t = 0);
      return [0, 0, 0];
    }
    if (e.state === "recover") {
      if (e.t > 0.6) (e.state = "chase"), (e.t = 0);
      return [0, 0, 0];
    }
    const go = (tx, tz, sp) => {
      const dx = tx - e.x,
        dz = tz - e.z;
      e.state = "chase";
      e.dir = Z.lookDir = Math.atan2(dx, dz);
      return [sp, dx, dz];
    };
    const look = (amp, rate) => {
      e.state = "look";
      Z.lookT += dt;
      Z.lookDir = Z.lookBase + Math.sin(Z.lookT * rate) * amp;
      e.dir = Z.lookDir;
      return [0, 0, 0];
    };
    const arrive = (tx, tz) => Math.hypot(tx - e.x, tz - e.z) < 0.6;
    const path = Z.def.path;
    switch (Z.mode) {
      case "sleep":
        e.state = "sleep";
        Z.sleepT -= dt;
        if (Z.sleepT <= 0) {
          Z.mode = "wake";
          e.state = "wake";
          e.t = 0;
          Z.markK = "";
        }
        return [0, 0, 0];
      case "wake":
        e.state = "wake";
        if (e.t > 1.3) {
          e.t = 0;
          if (Z.temp || SIG.phase === 1) Object.assign(Z, { mode: "hunt", lookT: 0, lookBase: e.dir, modeT: 0 });
          else Object.assign(Z, { mode: "suspect", target: { x: e.x, z: e.z }, lookT: 0, lookBase: e.dir, modeT: 0, markK: "q", markT: 2 });
        }
        return [0, 0, 0];
      case "patrol": {
        if (Z.wait > 0) {
          Z.wait -= dt;
          return look(0.85, 1.25);
        }
        const p = path[Z.i % path.length];
        if (arrive(p[0], p[1])) {
          Z.wait = p[2] ?? 2;
          Z.lookBase = p[3] ?? e.dir;
          Z.lookT = 0;
          Z.i = (Z.i + 1) % path.length;
          return [0, 0, 0];
        }
        return go(p[0], p[1], SIG.phase === 3 ? 2.4 : 1.9);
      }
      case "suspect": {
        const T0 = Z.target || { x: e.x, z: e.z };
        if (!arrive(T0.x, T0.z) && Z.modeT < 7) return go(T0.x, T0.z, 2.7);
        if (Z.lookT === 0) Z.lookBase = e.dir;
        const r = look(1.1, 1.6);
        if (Z.lookT > 3.4) Object.assign(Z, { mode: "return", modeT: 0, markK: "" });
        return r;
      }
      case "return": {
        /* bideko punturik hurbilenera, gero ohiko bidea */
        let bi = 0,
          bd = 1e9;
        path.forEach((p, i) => {
          const dd = Math.hypot(p[0] - e.x, p[1] - e.z);
          if (dd < bd) (bd = dd), (bi = i);
        });
        if (bd < 0.6 || Z.modeT > 12) {
          Object.assign(Z, { mode: "patrol", i: bi, wait: 0.6, lookT: 0, lookBase: e.dir });
          return [0, 0, 0];
        }
        return go(path[bi][0], path[bi][1], 2.2);
      }
      case "hunt": {
        if (Z.seeNow) {
          if (d < 2.4 && Math.abs(P.y - e.y) < 1.4 && e.t > 0.25) {
            e.state = "wind";
            e.t = 0;
            e.lx = ux;
            e.lz = uz;
            e.atk0 = time;
            SND.screech && SND.screech();
            return [0, 0, 0];
          }
          return go(P.x, P.z, 4.3);
        }
        const L0 = SIG.last || { x: e.x, z: e.z };
        if (!arrive(L0.x, L0.z) && Z.modeT < 9) return go(L0.x, L0.z, 4);
        if (Z.lookT === 0) Z.lookBase = e.dir;
        return look(1.3, 2);
      }
      case "search": {
        if (!Z.target || arrive(Z.target.x, Z.target.z) || Z.modeT > 5) {
          if (Z.wait > 0) {
            Z.wait -= dt;
            return look(0.9, 1.8);
          }
          const L0 = SIG.last || { x: e.x, z: e.z },
            a = Math.random() * TAU,
            r = 2 + Math.random() * 5.5;
          Z.target = { x: L0.x + Math.cos(a) * r, z: L0.z + Math.sin(a) * r };
          Z.modeT = 0;
          Z.wait = 1.4;
          Z.lookT = 0;
          Z.lookBase = e.dir;
          return [0, 0, 0];
        }
        return go(Z.target.x, Z.target.z, 3);
      }
    }
    return [0, 0, 0];
  }
  /* hormetatik kanpora (zaindariak ez dira hormetan sartzen; irristatu) */
  function sigWallPush(nx, nz, r) {
    for (const s of SIG.walls) {
      if (s.off || Math.abs(s.x - nx) > s.w + s.d + r || Math.abs(s.z - nz) > s.w + s.d + r) continue;
      const [lx, lz] = local(s, nx, nz),
        hx = s.w / 2 + r,
        hz = s.d / 2 + r;
      if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) continue;
      const c = Math.cos(s.rot || 0),
        n = Math.sin(s.rot || 0);
      let ax = lx,
        az = lz;
      if (hx - Math.abs(lx) < hz - Math.abs(lz)) ax = Math.sign(lx || 1) * hx;
      else az = Math.sign(lz || 1) * hz;
      nx = s.x + ax * c + az * n;
      nz = s.z - ax * n + az * c;
    }
    return [nx, nz];
  }
  /* ------------------------------ eguneraketa ------------------------------ */
  function sigUpdate(dt) {
    if (!SIG.zone) return;
    if (ZONE.cur !== SIG.zone) return sigStop();
    SIG.knockCd = Math.max(0, SIG.knockCd - dt);
    SIG.noiseCd = Math.max(0, SIG.noiseCd - dt);
    /* korrika edo bultzadan: hotsa */
    const sp = Math.hypot(P.vx, P.vz);
    if (P.grounded && sp > 9 && SIG.noiseCd <= 0) {
      SIG.noiseCd = 0.35;
      sigNoise(P.x, P.z, P.dashT > 0 ? 5.5 : 6.5);
    }
    let anySee = false;
    for (let i = SIG.guards.length - 1; i >= 0; i--) {
      const e = SIG.guards[i],
        Z = e.zain;
      if (!ENEMIES.includes(e)) {
        SIG.guards.splice(i, 1);
        continue;
      }
      if (e.state === "dead") {
        Z.cone.visible = false;
        Z.mark.material.opacity = 0;
        continue;
      }
      /* begirada */
      const awake = Z.mode !== "sleep" && Z.mode !== "wake",
        hunt = Z.mode === "hunt",
        dx = P.x - e.x,
        dz = P.z - e.z,
        d = Math.hypot(dx, dz) || 1;
      let see = 0;
      if (awake && !respawnTimer && started && Math.abs(P.y - e.y) < 3) {
        const R = Z.range * (SIG.phase === 3 ? 1.2 : 1) * (hunt ? 1.25 : 1) * (sigHidden() ? 0.28 : 1),
          near = d < (hunt ? 5 : 1.6);
        if (d < R && (near || angDiff(Math.atan2(dx, dz), Z.lookDir) < Z.fov * (hunt ? 1.3 : 1)) && sigRay(e.x, e.z, dx / d, dz / d, d) > d - 0.35) see = 1 - (0.6 * d) / R;
      }
      Z.seeNow = see > 0;
      if (see > 0 && hunt) anySee = true;
      if (see > 0 && !hunt && awake) {
        /* LAGUNTZA moduan, susmoa astiroago */
        Z.sus += dt * (0.95 + 1.9 * see) * (SIG.phase === 3 || SIG.phase === 2 ? 1.4 : 1) * (saved.assist ? 0.6 : 1);
        if (Z.sus >= 1) {
          sigSpotted(e);
          anySee = true;
        } else if (Z.sus > 0.35 && (Z.mode === "patrol" || Z.mode === "return")) Object.assign(Z, { mode: "suspect", target: { x: P.x, z: P.z }, lookT: 0, modeT: 0, markK: "q", markT: 1.6 });
        else if (Z.mode === "suspect") Z.target = { x: P.x, z: P.z };
      } else Z.sus = Math.max(0, Z.sus - dt * 0.3);
      /* konoa (20 Hz inguru, mailakatuta) */
      Z.coneT -= dt;
      Z.cone.visible = awake;
      if (awake && Z.coneT <= 0) {
        Z.coneT = 0.05;
        sigConeSet(Z.cone, e.x, e.z, Z.lookDir, Z.fov * (hunt ? 1.3 : 1), Z.range * (hunt ? 1.25 : 1) * (SIG.phase === 3 ? 1.2 : 1));
      }
      /* kriseiluaren argia: lasai horixka, susmoz laranja, ehizan gorria */
      const col = hunt ? "#ff3a2a" : Z.mode === "suspect" || Z.sus > 0.2 ? "#ff9a1a" : "#ffd36a";
      sigConeColor(Z.cone, col, hunt ? 0.5 : 0.42 + Z.sus * 0.1);
      Z.lamp.material.color.set(hunt ? "#ff8a6a" : "#ffd79a");
      /* ikurra buruaren gainean (?, !, z) */
      Z.markT -= dt;
      const want = Z.markK && (Z.markT > 0 || Z.mode === "suspect" || Z.mode === "sleep") ? 1 : 0;
      if (Z.markK) Z.mark.material.map = sigTextures()[Z.markK];
      Z.mark.material.opacity = mix(Z.mark.material.opacity, want, 1 - Math.exp(-dt * 10));
      Z.mark.position.y = Z.mode === "sleep" ? 1.2 + Math.sin(time * 2) * 0.15 : 3.25 + Math.max(0, Z.markT - 1) * 0.6;
    }
    /* begi-harriak */
    for (const E of SIG.eyes) {
      E.dir = E.base + Math.sin(time * (E.sp || 0.45) + (E.ph || 0)) * (E.sweep || 0.9);
      E.head.rotation.y = E.dir;
      const dx = P.x - E.x,
        dz = P.z - E.z,
        d = Math.hypot(dx, dz) || 1;
      const see = !respawnTimer && Math.abs(P.y - (E.y || 0)) < 3 && d < E.range * (sigHidden() ? 0.3 : 1) && angDiff(Math.atan2(dx, dz), E.dir) < E.fov && sigRay(E.x, E.z, dx / d, dz / d, d) > d - 0.35;
      /* mugatuta: luzaroan ikusi ondoren ere, ihesaldian ez du alarma berriz piztu behar ikusi gabe */
      E.sus = see ? Math.min(1.2, E.sus + dt * 2.2 * (saved.assist ? 0.6 : 1)) : Math.max(0, E.sus - dt * 0.5);
      if (E.sus >= 1 && SIG.phase !== 1) sigSpotted(null);
      if (see && SIG.phase === 1) anySee = true;
      sigConeSet(E.cone, E.x, E.z, E.dir, E.fov, E.range);
      /* begi-harria: urrezko begirada estua (Gaueko), ikusten bazaitu gorri */
      sigConeColor(E.cone, E.sus > 0.05 ? "#ff3a2a" : "#ffe9a0", 0.3 + E.sus * 0.25);
      E.eye.material.color.set(E.sus > 0.05 ? "#ff6a3a" : "#ffcf7a");
    }
    /* argi-hariak (orainean bakarrik) */
    for (const th of SIG.threads) {
      const on = phase === 1;
      for (const o of th.parts) o.visible = on;
      if (!on) continue;
      th.m.material.opacity = 0.65 + Math.sin(time * 9 + th.ax) * 0.25;
      const vx = th.bx - th.ax,
        vz = th.bz - th.az,
        L2 = vx * vx + vz * vz,
        k = clamp(((P.x - th.ax) * vx + (P.z - th.az) * vz) / L2, 0, 1),
        dd = Math.hypot(th.ax + vx * k - P.x, th.az + vz * k - P.z);
      if (dd < 0.38 && P.y < th.y + 0.25 && P.y > th.y - 1.6 && SIG.phase !== 1) {
        fxBurst(P.x, th.y, P.z, { n: 20, speed: 3, life: 0.5, size: 0.25, color: "#bff6ff", grav: 1 });
        sigSpotted(null);
      }
    }
    /* faseak */
    if (SIG.phase === 1) {
      if (anySee) {
        SIG.t = SIG_ALERT;
        SIG.last = { x: P.x, z: P.z };
      } else SIG.t -= dt;
      if (SIG.t <= 0) {
        SIG.phase = 2;
        SIG.t = SIG_EVADE;
        for (const e of SIG.guards) if (e.zain.mode === "hunt") Object.assign(e.zain, { mode: "search", target: null, modeT: 0, wait: 0 });
      }
    } else if (SIG.phase === 2) {
      SIG.t -= dt;
      if (SIG.t <= 0) {
        SIG.phase = 3;
        SIG.t = SIG_CAUTION;
        for (const e of SIG.guards) if (e.zain.mode === "search") Object.assign(e.zain, { mode: "return", modeT: 0, markK: "" });
        /* indargarriak itzalera itzultzen dira (ez da hilketa: ez kolperik, ez saririk) */
        for (const e of SIG.guards.filter((g) => g.zain.temp && g.state !== "dead")) sigVanish(e);
      }
    } else if (SIG.phase === 3) {
      SIG.t -= dt;
      if (SIG.t <= 0) SIG.phase = 0;
    }
    /* bannerra */
    const B = $("sigBanner");
    B.hidden = !SIG.phase;
    if (SIG.phase) {
      B.className = "p" + SIG.phase;
      B.textContent = ["", "ALERTA", "IHESA", "ZAINTZA"][SIG.phase] + "  " + Math.max(0, SIG.t).toFixed(1);
    }
    SIG.rT -= dt;
    if (SIG.rT <= 0) {
      SIG.rT = 1 / 15;
      sigRadar();
    }
  }
  /* ------------------------------ OIHARTZUN-RADARRA ------------------------------ */
  function sigRadar() {
    const cv = $("radar");
    if (!cv || cv.hidden) return;
    const c = cv.getContext("2d"),
      W = cv.width,
      H2 = W / 2,
      S = H2 / 24,
      /* kameraren norabidean (lehen pertsonan: begiradarena) */
      az = BEGI.k > 0.5 ? BEGI.yaw + PI : CAM_AZ + (CAM.yawS || 0),
      ca = Math.cos(az),
      sa = Math.sin(az),
      X = (x, z) => H2 + ((x - P.x) * ca - (z - P.z) * sa) * S,
      Y = (x, z) => H2 + ((x - P.x) * sa + (z - P.z) * ca) * S;
    c.clearRect(0, 0, W, W);
    c.save();
    c.beginPath();
    c.arc(H2, H2, H2 - 1, 0, TAU);
    c.clip();
    c.fillStyle = "#061a1cdd";
    c.fillRect(0, 0, W, W);
    if (SIG.phase === 1) {
      /* Gauekoren zarata: radarra itsu */
      for (let i = 0; i < 260; i++) {
        c.fillStyle = Math.random() < 0.5 ? "#2a3a3a" : "#0f1d1e";
        c.fillRect(Math.random() * W, Math.random() * W, 3, 2);
      }
      c.fillStyle = "#ff8a6a";
      c.font = "bold 13px system-ui";
      c.textAlign = "center";
      c.fillText("OIHARTZUNIK EZ", H2, H2 + 4);
      c.restore();
      return;
    }
    /* oihartzun-uhina (txalapartaren taupada) */
    SIG.ping = (SIG.ping + 1 / 15 / 1.6) % 1;
    c.strokeStyle = `rgba(127,227,201,${0.5 * (1 - SIG.ping)})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(H2, H2, SIG.ping * H2, 0, TAU);
    c.stroke();
    /* hormak */
    c.fillStyle = "#3f6e6a";
    for (const s of SIG.walls) {
      if (s.off || Math.hypot(s.x - P.x, s.z - P.z) > 40 + (s.w + s.d) / 2) continue;
      const cr = Math.cos(s.rot || 0),
        sr = Math.sin(s.rot || 0),
        pts = [
          [-s.w / 2, -s.d / 2],
          [s.w / 2, -s.d / 2],
          [s.w / 2, s.d / 2],
          [-s.w / 2, s.d / 2],
        ].map(([lx, lz]) => [s.x + lx * cr + lz * sr, s.z - lx * sr + lz * cr]);
      c.beginPath();
      pts.forEach(([x, z], i) => (i ? c.lineTo(X(x, z), Y(x, z)) : c.moveTo(X(x, z), Y(x, z))));
      c.closePath();
      c.fill();
    }
    /* begiradak eta zaindariak */
    const wedge = (x, z, dir, fov, r, col) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(X(x, z), Y(x, z));
      for (let i = 0; i <= 8; i++) {
        const a = dir - fov + (2 * fov * i) / 8;
        c.lineTo(X(x + Math.sin(a) * r, z + Math.cos(a) * r), Y(x + Math.sin(a) * r, z + Math.cos(a) * r));
      }
      c.closePath();
      c.fill();
    };
    for (const e of SIG.guards) {
      if (e.state === "dead") continue;
      const Z = e.zain,
        asleep = Z.mode === "sleep" || Z.mode === "wake";
      if (!asleep) wedge(e.x, e.z, Z.lookDir, Z.fov, Z.range, Z.mode === "suspect" ? "#ff9a1a50" : "#ffd36a3a");
      c.fillStyle = asleep ? "#7f9fbf" : Z.mode === "suspect" ? "#ffd36a" : "#ff5a4a";
      c.beginPath();
      c.arc(X(e.x, e.z), Y(e.x, e.z), 4, 0, TAU);
      c.fill();
    }
    for (const E of SIG.eyes) {
      wedge(E.x, E.z, E.dir, E.fov, E.range, "#ffcf7a40");
      c.fillStyle = "#ffcf7a";
      c.fillRect(X(E.x, E.z) - 3, Y(E.x, E.z) - 3, 6, 6);
    }
    /* Amaiur */
    const pa = P.angle,
      fx = Math.sin(pa),
      fz = Math.cos(pa);
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.moveTo(X(P.x + fx * 1.4, P.z + fz * 1.4), Y(P.x + fx * 1.4, P.z + fz * 1.4));
    c.lineTo(X(P.x - fx * 0.7 + fz * 0.8, P.z - fz * 0.7 - fx * 0.8), Y(P.x - fx * 0.7 + fz * 0.8, P.z - fz * 0.7 - fx * 0.8));
    c.lineTo(X(P.x - fx * 0.7 - fz * 0.8, P.z - fz * 0.7 + fx * 0.8), Y(P.x - fx * 0.7 - fz * 0.8, P.z - fz * 0.7 + fx * 0.8));
    c.closePath();
    c.fill();
    c.restore();
    c.strokeStyle = "#7fe3c9aa";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(H2, H2, H2 - 1.5, 0, TAU);
    c.stroke();
  }
