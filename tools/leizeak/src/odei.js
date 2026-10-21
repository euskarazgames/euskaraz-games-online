  /* ==================================================================
     ODEI · trumoiaren hodeia (bosgarren zaindaria), Gauekok gaiztotua
     Ekaitz-hodei erraldoia arenaren gainean, begi zuriak eta aho beltza. Erasoak:
     · TXIMISTAK: lurrean zirkuluak (abisua) → tximista. BULTZADA edo atera; airean,
       planeatzen, ez zaitu jotzen.
     · KAZKABARRA: izotz-harriak zerutik (itzalak lurrean).
     · HAIZE-BOLADA: arnasa hartu → putz: ertzera bultzatzen zaitu. HAIZE-ADARRAz kontra!
     Herriek kanpaiak jotzen zituzten ekaitzak uxatzeko: lau EKAITZ-KANPAIAK elkarren segidan
     → hodeia urratu, bihotza (ekaitz-harria) agerian, goian; haize-zuloak piztu: ENARAz
     gora eta SORGINKERIA bihotzera (lurretik urrunegi dago). Hiru txanda; txanda bakoitzean
     kanpai gehiago garai batean bakarrik.
     ================================================================== */
  const ODEI = { g: null, puffs: [], eyes: [], mouth: null, core: null, coreGlow: null, weakGlow: null, light: null, x: 0, y: 0, z: 0, a: 0, state: "sleep", t: 0, rounds: 3, hp: 6, step: 0, marks: [], hail: [], open: 0, vents: false, seenIntro: false, flash: 0, cough: 0, cx: 0, cz: 0, stats: { rounds: 0, glide: 0, horn: 0 } };
  const ODEI_HP = 6,
    ODEI_HOVER = 10,
    ODEI_UP = 21,
    OV = new T.Vector3();
  const ODEI_ERAS = [[-1, -1, -1, -1], [-1, 1, -1, -1], [0, -1, 1, -1]];
  function odeiBuild() {
    const g = new T.Group();
    BP.add(g);
    /* hodei-bolak (banan-banan: agerian daudenean barreiatzen dira) */
    const mat = new T.MeshStandardMaterial({ color: "#1d2030", emissive: new T.Color("#120d22"), emissiveIntensity: 0.6, roughness: 1, envMapIntensity: 0.22, flatShading: true, transparent: true, opacity: 1 });
    let sd = 5;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    /* bolak oskol batean (aurrealdea librea: aurpegia), gehi aurpegiko bola handia */
    const parts = [[new T.Vector3(0, 0.3, 2.6), 3.4]];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + rnd() * 0.3;
      if (Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < 0.55 && i % 3) continue;
      const rr = i % 4 === 0 ? 2.2 : 4.6 + rnd() * 2,
        y = (rnd() - 0.45) * 3.4;
      parts.push([new T.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr * 0.85 - 0.6), 2.4 + rnd() * 1.7]);
    }
    for (const [base, s] of parts) {
      const m = new T.Mesh(new T.IcosahedronGeometry(s, 1), mat);
      m.position.copy(base);
      m.scale.y = 0.74;
      m.castShadow = true;
      g.add(m);
      ODEI.puffs.push({ m, base, ph: rnd() * TAU });
    }
    /* aurpegia: begi haserreak (zuri-urdinak, bekain ilunekin) eta aho beltz zabala, aurreko bolaren gainean */
    const browMat = new T.MeshBasicMaterial({ color: "#0d0b16" });
    for (const s of [-1, 1]) {
      const e = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#bfe9ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      e.scale.set(3.2, 1.9, 1);
      e.position.set(s * 1.35, 1.3, 5.75);
      const c = new T.Mesh(new T.SphereGeometry(0.42, 12, 8), new T.MeshBasicMaterial({ color: "#f4fbff" }));
      c.scale.set(1.25, 0.8, 0.5);
      c.position.set(s * 1.35, 1.3, 5.7);
      const brow = new T.Mesh(new T.BoxGeometry(1.5, 0.32, 0.3), browMat);
      brow.position.set(s * 1.35, 2.0, 5.55);
      brow.rotation.z = -s * 0.42;
      g.add(e, c, brow);
      ODEI.eyes.push(e, c, brow);
    }
    const mouth = new T.Mesh(new T.CircleGeometry(1.3, 20), new T.MeshBasicMaterial({ color: "#07060c", side: T.DoubleSide }));
    mouth.position.set(0, -0.7, 5.72);
    mouth.scale.set(1.5, 0.25, 1);
    g.add(mouth);
    ODEI.mouth = mouth;
    /* bihotza: ekaitz-harria (Gauekoren itzala) */
    const core = new T.Mesh(new T.OctahedronGeometry(1.1, 0), new T.MeshStandardMaterial({ color: "#2a1840", emissive: new T.Color("#a24bff"), emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }));
    g.add(core);
    const coreGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7a2cff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    coreGlow.scale.setScalar(6);
    core.add(coreGlow);
    /* nahasketa arrunta (ez gehigarria): zeru argiaren gainean ere morea */
    const weak = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#8e3dff", transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    weak.scale.setScalar(4.6);
    weak.renderOrder = 12;
    BP.add(weak);
    const light = new T.PointLight("#b9c8ff", 0.8, 40, 1.4);
    g.add(light);
    Object.assign(ODEI, { g, core, coreGlow, weakGlow: weak, light, mat });
    odeiHome();
    /* haize-zuloak arenan (agerian dagoenean bakarrik) */
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      updraft({ x: Z7.x + Math.cos(a) * 7.5, z: Z7.z + Math.sin(a) * 7.5, r: 2.3, y0: Z7.y, y1: Z7.y + 19.5, power: 9.5, vent: Z7.y + 0.02, live: () => ODEI.vents, id: "zG-u" + i, col: "#e9dcff" });
    }
    /* lau ekaitz-kanpaia (diagonaletan) */
    RUNE_SETS.push({
      id: "zG-bells",
      zone: "zerua",
      kind: "kanpaia",
      time: 7,
      runes: [0, 1, 2, 3].map((i) => {
        const a = PI / 4 + (i * PI) / 2;
        return [Z7.x + Math.cos(a) * 12.6, Z7.y + 3.6, Z7.z + Math.sin(a) * 12.6, -1];
      }),
      when: () => odeiBellsLive(),
      onSolve: () => odeiOpen(),
    });
    /* haize-boladaren aurka: HAIZE-ADARRA */
    ODEI.wind = windable({ x: Z7.x, y: Z7.y + ODEI_HOVER, z: Z7.z, r: 5, dy: 30, range: 26, live: () => ODEI.state === "inhale" || ODEI.state === "gust", gust: () => odeiHornCounter() });
    if (saved.flags.includes("odei")) odeiFreed(true);
  }
  function odeiHome() {
    ODEI.x = Z7.x;
    ODEI.z = Z7.z - 6;
    ODEI.y = Z7.y + ODEI_HOVER + 3;
    ODEI.a = 0;
    if (ODEI.g) {
      ODEI.g.position.set(ODEI.x, ODEI.y, ODEI.z);
      ODEI.g.rotation.y = 0;
    }
  }
  const odeiStormy = () => ["storm", "bolts", "hail", "inhale", "gust"].includes(ODEI.state);
  const odeiBellsLive = () => BOSS.on && BOSS.kind === "odei" && odeiStormy() && !cinematic;
  /* txanda bakoitzean kanpaien garaiak (koloreak eta "live") */
  function odeiBellsArm() {
    const set = RUNE_PUZ.find((s) => s.D.id === "zG-bells");
    if (!set) return;
    set.solved = false;
    const i0 = saved.cleared.indexOf("zG-bells");
    if (i0 >= 0) saved.cleared.splice(i0, 1);
    const eras = ODEI_ERAS[clamp(3 - ODEI.rounds, 0, 2)];
    set.D.time = ODEI.rounds === 1 ? 8 : 7;
    set.list.forEach((R, i) => {
      R.era = eras[i];
      R.lit = false;
      R.t = 0;
      runeTimer(R, 0);
      const col = R.era < 0 ? "#ffcf7a" : ERA_COL[R.era];
      R.stone.material.emissive.set(col);
      R.halo.material.color.set(col);
      R.ghost.material.color.set(col);
      R.live = () => !set.solved && set.group === ZONES[ZONE.cur].group && (R.era === -1 || R.era === phase) && odeiBellsLive();
    });
  }
  function odeiStart() {
    if (BOSS.on || saved.flags.includes("odei") || !ODEI.g) return;
    const R = DGZ.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "odei";
    BOSS.weakR = 1.9;
    Object.assign(ODEI, { state: "intro", t: 0, hp: ODEI_HP, rounds: 3, step: 0, open: 0, vents: false });
    odeiHome();
    const fight = () => {
      ODEI.state = "storm";
      ODEI.t = 0;
      odeiBellsArm();
      title("ODEI", "");
      SND.roar();
      SND.thunder && SND.thunder();
      shake(0.5);
      bossBar("ODEI", 1);
      notify(L("Jo lau EKAITZ-KANPAIAK SORGINKERIAz, elkarren segidan: kanpaiek hodeia urratzen dute!"), "", 7);
    };
    if (ODEI.seenIntro) return fight();
    ODEI.seenIntro = true;
    say(
      [
        ["ODEI", "Kanpaiak… Herriek kanpaiak jotzen zituzten nire ekaitzak uxatzeko. Hemen ez dago kanpai-jolerik, sorgin.", "", ODEI.x, ODEI.z, ODEI.y - 2],
        ["AMAIUR", "Badago. Eta badakit zure izena: Odei, trumoiaren hodeia. Lehen euria ekartzen zenuen.", "", P.x, P.z, P.y],
        ["ODEI", "GAUEKOREN TRUMOIA NAIZ ORAIN! KAZKABARRA, TXIMISTA, HAIZEA… ERORI ZAITEZ HODEIETATIK!", "", ODEI.x, ODEI.z, ODEI.y - 2],
      ],
      fight,
    );
  }
  /* kanpaiak: hodeia urratu → bihotza agerian (goian) */
  function odeiOpen() {
    if (!odeiStormy()) return;
    ODEI.state = "open";
    ODEI.t = 0;
    ODEI.vents = true;
    ODEI.gustK = 0;
    P.wx = P.wz = 0;
    for (const M of ODEI.marks) M.m.parent && M.m.parent.remove(M.m);
    ODEI.marks.length = 0;
    SND.roar();
    shake(0.55);
    slowmo = Math.max(slowmo, 0.35);
    title("HODEIA URRATUTA!", "");
    notify(L("Kanpaiek hodeia urratu dute! Bihotza agerian, goian: haize-zuloetatik gora ENARAz, eta SORGINKERIA!"), "", 5);
    coach("glide-odei", "␣", "Haize-zuloan: jauzi bikoitza eta eutsi ␣ (ENARA)", "", "jumpBtn", "Haize-zuloan: JAUZI bikoitza eta eutsi", "");
  }
  function odeiClose(hurt) {
    ODEI.state = hurt ? "roar" : "storm";
    ODEI.t = 0;
    ODEI.vents = false;
    odeiBellsArm();
    if (!hurt) notify(L("Hodeia berriro itxi da… Kanpaiak, berriro!"), "", 3);
  }
  /* SORGINKERIA bihotzean */
  function odeiHit(n) {
    if (!BOSS.vulnerable()) return;
    ODEI.hp -= n;
    if (!P.grounded) ODEI.stats.glide++;
    const w = BOSS.weak();
    FB.bossHit(w.x, w.y, w.z);
    damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.5 }, n);
    ODEI.flash = 0.25;
    bossBar("ODEI", (ODEI.rounds - 1 + Math.max(0, ODEI.hp) / ODEI_HP) / 3);
    if (ODEI.hp > 0) return;
    ODEI.rounds--;
    ODEI.stats.rounds++;
    ODEI.hp = ODEI_HP;
    if (ODEI.rounds <= 0) return odeiDefeat();
    SND.roar();
    shake(0.7);
    slowmo = 0.5;
    odeiClose(true);
    notify(ODEI.rounds === 2 ? L("Haserre dago! Kanpai bat ORAINEAN bakarrik ikusten da orain…") : L("Azken aldia! Kanpaiak garai bietan banatuta: IRAGANA eta ORAINA!"), "", 4.5);
  }
  /* HAIZE-ADARRA haize-boladaren kontra */
  function odeiHornCounter() {
    if (ODEI.state !== "inhale" && ODEI.state !== "gust") return;
    ODEI.state = "storm";
    ODEI.t = 0.3;
    ODEI.cough = 1;
    ODEI.stats.horn++;
    P.wx = P.wz = 0;
    SND.whoosh();
    shake(0.3);
    fxBurst(ODEI.x, ODEI.y - 1, ODEI.z, { n: 40, speed: 6, up: 1, life: 0.9, size: 0.6, color: "#d8dde8", grav: -0.5 });
    notify(L("Haizea haizearen kontra! Bolada geldiarazi duzu."), "", 2.6);
  }
  /* lurreko marka (tximista edo kazkabarra) */
  function odeiMark(x, z, r, col, fuse, kind) {
    const m = new T.Mesh(new T.RingGeometry(r * 0.82, r, 28), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
    m.rotation.x = -PI / 2;
    m.position.set(x, Z7.y + 0.06, z);
    m.renderOrder = 3;
    const fill = new T.Mesh(new T.CircleGeometry(r * 0.8, 24), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false }));
    fill.rotation.x = -PI / 2;
    fill.position.set(x, Z7.y + 0.05, z);
    fill.renderOrder = 3;
    ZONES.zerua.group.add(m, fill);
    const M = { m, fill, x, z, r, t: 0, fuse, kind };
    m.userData.fill = fill;
    ODEI.marks.push(M);
    return M;
  }
  function odeiStrike(M) {
    /* tximista: hodeitik lurrera (zigi-zaga) */
    const grp = ZONES.zerua.group,
      g = new T.Group(),
      mat = new T.MeshBasicMaterial({ color: "#eef6ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    let px = ODEI.x + (Math.random() - 0.5) * 3,
      py = ODEI.y - 2,
      pz = ODEI.z + (Math.random() - 0.5) * 3;
    for (let i = 0; i < 10; i++) {
      const k = (i + 1) / 10,
        nx = i === 9 ? M.x : mix(px, M.x, k) + (Math.random() - 0.5) * 2.2 * (1 - k),
        ny = mix(ODEI.y - 2, Z7.y, k),
        nz = i === 9 ? M.z : mix(pz, M.z, k) + (Math.random() - 0.5) * 2.2 * (1 - k),
        len = Math.hypot(nx - px, ny - py, nz - pz),
        seg = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, len, 4, 1, true), mat);
      seg.position.set((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2);
      seg.lookAt(nx, ny, nz);
      seg.rotateX(PI / 2);
      g.add(seg);
      [px, py, pz] = [nx, ny, nz];
    }
    grp.add(g);
    TXB.fx.push({ kind: "bolt", m: g, t: 0, life: 0.25 });
    const glowS = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#d9eeff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    glowS.position.set(M.x, Z7.y + 1, M.z);
    glowS.scale.setScalar(8);
    grp.add(glowS);
    TXB.fx.push({ kind: "glow", m: glowS, t: 0, life: 0.35, s: 8 });
    ODEI.flash = Math.max(ODEI.flash, 0.3);
    SND.thunder ? SND.thunder() : SND.thud();
    shake(0.22);
    fxBurst(M.x, Z7.y + 0.4, M.z, { n: 18, speed: 5, up: 3, life: 0.5, size: 0.3, color: "#e6f4ff", grav: 6 });
    if (Math.hypot(P.x - M.x, P.z - M.z) < M.r + 0.3 && P.y < Z7.y + 2.6 && !P.glide) playerHit(1, M.x, M.z);
  }
  function odeiHailDrop(M) {
    const m = new T.Mesh(new T.IcosahedronGeometry(0.42, 0), new T.MeshStandardMaterial({ color: "#e8f4ff", emissive: new T.Color("#9fd2ff"), emissiveIntensity: 0.5, roughness: 0.2, transparent: true, opacity: 0.9 }));
    m.position.set(M.x, Z7.y + 14, M.z);
    ZONES.zerua.group.add(m);
    M.stone = m;
  }
  function odeiUpdateZone(dt) {
    if (!ODEI.g) return;
    const R = DGZ.bossRoom;
    /* ikusmena: bolak arnasan, begiak, ahoa, bihotza */
    const op = ODEI.state === "open" ? Math.min(1, ODEI.t * 1.6) : Math.max(0, (ODEI.open || 0) - dt * 1.4);
    ODEI.open = op;
    const swell = ODEI.state === "inhale" ? Math.min(1, ODEI.t / 1.2) * 0.35 : ODEI.state === "gust" ? 0.2 : 0;
    for (const p of ODEI.puffs) {
      const k = 1 + op * 1.4 + swell;
      p.m.position.set(p.base.x * k + Math.sin(time * 0.9 + p.ph) * 0.3, p.base.y * (1 + op * 0.8) + Math.sin(time * 1.3 + p.ph) * 0.25, p.base.z * k);
    }
    ODEI.mat.opacity = ODEI.state === "freed" ? 0.9 : 1 - op * 0.55;
    ODEI.mat.transparent = ODEI.mat.opacity < 1;
    ODEI.flash = Math.max(0, ODEI.flash - dt);
    ODEI.cough = Math.max(0, ODEI.cough - dt);
    const fl = ODEI.state === "freed" ? 0 : ODEI.flash > 0 || Math.random() < dt * 0.6 ? 1 : 0;
    ODEI.light.intensity = 0.25 + fl * 3.2 + op * 1.5;
    ODEI.mat.emissiveIntensity = ODEI.state === "freed" ? 0.25 : 0.55 + fl * 1.6;
    ODEI.mat.emissive.set(fl && ODEI.state !== "freed" ? "#3a3480" : ODEI.state === "freed" ? "#cfe3f5" : "#120d22");
    ODEI.mouth.scale.y = mix(ODEI.mouth.scale.y, ODEI.state === "inhale" ? 1.1 : ODEI.state === "gust" ? 0.8 : ODEI.cough > 0 ? 0.6 + Math.sin(time * 30) * 0.3 : 0.25, 1 - Math.exp(-dt * 8));
    for (const e of ODEI.eyes) e.visible = op < 0.6 && !(ODEI.state === "freed" && e.isMesh && e.geometry.type === "BoxGeometry");
    const vul = BOSSK.odei.vulnerable();
    ODEI.core.material.emissiveIntensity = op > 0.3 ? (vul ? 3 : 1.6) + Math.sin(time * 10) * 0.4 : 0.6;
    ODEI.coreGlow.material.opacity = op * (0.6 + Math.sin(time * 10) * 0.2);
    ODEI.core.rotation.y += dt * 2;
    ODEI.core.scale.setScalar(1 + op * 0.5 + (ODEI.flash > 0.1 && op > 0.5 ? 0.3 : 0));
    ODEI.weakGlow.visible = op > 0.5;
    if (ODEI.weakGlow.visible) {
      ODEI.core.getWorldPosition(OV);
      ODEI.weakGlow.position.copy(OV);
      ODEI.weakGlow.material.opacity = (vul ? 0.75 : 0.35) + Math.sin(time * 10) * 0.2;
    }
    if (ODEI.state === "freed") {
      ODEI.y = mix(ODEI.y, Z7.y + 12, 1 - Math.exp(-dt * 0.5));
      ODEI.g.position.set(ODEI.x, ODEI.y + Math.sin(time * 0.7) * 0.4, ODEI.z);
      const fa = Math.atan2(P.x - ODEI.x, P.z - ODEI.z);
      ODEI.g.rotation.y += Math.atan2(Math.sin(fa - ODEI.g.rotation.y), Math.cos(fa - ODEI.g.rotation.y)) * Math.min(1, dt * 1.5);
      if (Math.random() < dt * 6) fxBurst(ODEI.x + (Math.random() - 0.5) * 8, ODEI.y - 2, ODEI.z + (Math.random() - 0.5) * 6, { n: 1, speed: 0.2, up: -5, life: 1.1, size: 0.1, color: "#bfe6ff", grav: 6 });
      return;
    }
    if (ODEI.state === "sleep") {
      ODEI.g.position.set(ODEI.x, ODEI.y + Math.sin(time * 0.8) * 0.5, ODEI.z);
      const open = saved.doors.includes(DGZ.bossDoor);
      if (open && ROOM.cur === R && P.grounded && !cinematic && Math.hypot(P.x - Z7.x, P.z - Z7.z) < Z7.r - 4 && P.y > Z7.y - 1) odeiStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    ODEI.t += dt;
    const rage = 3 - ODEI.rounds,
      dx = P.x - ODEI.x,
      dz = P.z - ODEI.z,
      face = Math.atan2(dx, dz);
    ODEI.a += Math.atan2(Math.sin(face - ODEI.a), Math.cos(face - ODEI.a)) * Math.min(1, dt * 1.6);
    /* mugimendua: arenaren gainean biraka (agerian: erdian, goian) */
    let tx, ty, tz;
    if (ODEI.state === "open") {
      tx = Z7.x;
      tz = Z7.z;
      ty = Z7.y + ODEI_UP;
    } else {
      const w = time * (0.22 + rage * 0.05);
      tx = Z7.x + Math.cos(w) * 5;
      tz = Z7.z + Math.sin(w) * 5;
      ty = Z7.y + ODEI_HOVER + Math.sin(time * 0.8) * 0.6;
    }
    const k = 1 - Math.exp(-dt * (ODEI.state === "open" ? 1.8 : 0.9));
    ODEI.x = mix(ODEI.x, tx, k);
    ODEI.y = mix(ODEI.y, ty, k);
    ODEI.z = mix(ODEI.z, tz, k);
    ODEI.g.position.set(ODEI.x, ODEI.y, ODEI.z);
    ODEI.g.rotation.y = ODEI.a;
    ODEI.wind.x = ODEI.x;
    ODEI.wind.y = ODEI.y;
    ODEI.wind.z = ODEI.z;
    BOSS.lockable.x = ODEI.x;
    BOSS.lockable.y = ODEI.y;
    BOSS.lockable.z = ODEI.z;
    switch (ODEI.state) {
      case "storm": {
        P.wx = P.wz = 0;
        if (ODEI.t > 2.1 - rage * 0.35) {
          ODEI.step++;
          const seq = ["bolts", "hail", "bolts", rage > 0 ? "inhale" : "hail", "bolts", "inhale"];
          ODEI.state = seq[ODEI.step % seq.length];
          ODEI.t = 0;
          if (ODEI.state === "bolts") {
            const n = 3 + rage;
            odeiMark(P.x, P.z, 1.9, "#bfe3ff", 1.15, "bolt");
            for (let i = 1; i < n; i++) {
              const a = Math.random() * TAU,
                d = 3 + Math.random() * 5;
              let mx = P.x + Math.cos(a) * d,
                mz = P.z + Math.sin(a) * d;
              const rr = Math.hypot(mx - Z7.x, mz - Z7.z);
              if (rr > Z7.r - 2) {
                mx = Z7.x + ((mx - Z7.x) / rr) * (Z7.r - 2);
                mz = Z7.z + ((mz - Z7.z) / rr) * (Z7.r - 2);
              }
              odeiMark(mx, mz, 1.9, "#bfe3ff", 1.15 + i * 0.12, "bolt");
            }
            SND.crackle && SND.crackle();
          } else if (ODEI.state === "inhale") notifyOnce("odei-inhale", L("Arnasa hartzen ari da… HAIZE-ADARRA prest: putz egin haren kontra!"), "");
        }
        break;
      }
      case "bolts":
        if (ODEI.t > 1.9) (ODEI.state = "storm"), (ODEI.t = 0);
        break;
      case "hail": {
        const n = 9 + rage * 3,
          due = Math.floor(Math.min(1, ODEI.t / 1.6) * n);
        while ((ODEI.hailN || 0) < due) {
          ODEI.hailN = (ODEI.hailN || 0) + 1;
          const a = Math.random() * TAU,
            d = Math.random() * 5.5;
          let mx = P.x + Math.cos(a) * d + P.vx * 0.5,
            mz = P.z + Math.sin(a) * d + P.vz * 0.5;
          const rr = Math.hypot(mx - Z7.x, mz - Z7.z);
          if (rr > Z7.r - 1) {
            mx = Z7.x + ((mx - Z7.x) / rr) * (Z7.r - 1);
            mz = Z7.z + ((mz - Z7.z) / rr) * (Z7.r - 1);
          }
          odeiHailDrop(odeiMark(mx, mz, 0.95, "#e8f4ff", 0.95, "hail"));
        }
        if (ODEI.t > 2.4) {
          ODEI.state = "storm";
          ODEI.t = 0;
          ODEI.hailN = 0;
        }
        break;
      }
      case "inhale":
        if (Math.random() < dt * 40) {
          const a = Math.random() * TAU;
          fxBurst(ODEI.x + Math.cos(a) * 9, ODEI.y - 1 + (Math.random() - 0.5) * 4, ODEI.z + Math.sin(a) * 9, { n: 1, speed: 0.5, life: 0.6, size: 0.3, color: "#e9eef7", grav: 0 });
        }
        if (ODEI.t > 1.3) {
          ODEI.state = "gust";
          ODEI.t = 0;
          SND.whoosh();
          shake(0.25);
        }
        break;
      case "gust": {
        /* haizea Amaiurrengana, arenaren ertzerantz */
        const gx = P.x - ODEI.x,
          gz = P.z - ODEI.z,
          gd = Math.hypot(gx, gz) || 1,
          push = (P.glide ? 9.5 : 7) * (1 + rage * 0.12);
        P.wx = (gx / gd) * push;
        P.wz = (gz / gd) * push;
        if (Math.random() < dt * 30) {
          const s = Math.random() * 2 - 1;
          fxBurst(P.x - (gx / gd) * 6 + (gz / gd) * s * 4, P.y + 0.5 + Math.random() * 2, P.z - (gz / gd) * 6 - (gx / gd) * s * 4, { n: 1, speed: 12, life: 0.5, size: 0.2, color: "#f2f6ff", grav: 0, drag: 0 });
        }
        if (ODEI.t > 1.9) {
          P.wx = P.wz = 0;
          ODEI.state = "storm";
          ODEI.t = 0;
        }
        break;
      }
      case "open": {
        if (ODEI.t > 0.9 && P.grounded && Math.random() < dt * 0.6) notifyOnce("odei-high", L("Bihotza urrunegi dago lurretik: haize-zulo batean, jauzi bikoitza eta eutsi JAUZIari!"), "");
        if (ODEI.t > 10 + (ODEI.rounds === 1 ? 2 : 0)) odeiClose(false);
        break;
      }
      case "roar": {
        P.wx = P.wz = 0;
        if (ODEI.t > 0.4 && !ODEI.added) {
          ODEI.added = true;
          spawnWave(ODEI.rounds === 2 ? [["eye", -1, 2]] : [["eye", 0, 1], ["eye", 1, 1], ["grunt", -1, 1]], R);
        }
        if (ODEI.t > 2.2) {
          ODEI.added = false;
          ODEI.state = "storm";
          ODEI.t = 0;
        }
        break;
      }
    }
    /* markak: abisua → tximista / kazkabarra */
    for (let i = ODEI.marks.length - 1; i >= 0; i--) {
      const M = ODEI.marks[i];
      M.t += dt;
      const f = clamp(M.t / M.fuse, 0, 1);
      M.m.material.opacity = 0.35 + 0.45 * Math.abs(Math.sin(time * (8 + f * 14)));
      M.fill.material.opacity = f * 0.32;
      M.fill.scale.setScalar(Math.max(0.05, f));
      if (M.stone) M.stone.position.y = mix(Z7.y + 14, Z7.y + 0.3, f * f);
      if (M.t >= M.fuse) {
        if (M.kind === "bolt") odeiStrike(M);
        else {
          fxBurst(M.x, Z7.y + 0.4, M.z, { n: 12, speed: 3.5, up: 2, life: 0.45, size: 0.22, color: "#e8f4ff", grav: 8 });
          SND.clang && SND.clang(0.6);
          if (Math.hypot(P.x - M.x, P.z - M.z) < M.r + 0.35 && P.y < Z7.y + 1.9) playerHit(1, M.x, M.z);
          if (M.stone) M.stone.parent && M.stone.parent.remove(M.stone);
        }
        M.m.parent && M.m.parent.remove(M.m);
        M.fill.parent && M.fill.parent.remove(M.fill);
        ODEI.marks.splice(i, 1);
      }
    }
  }
  BOSSK.odei = {
    /* bihotza agerian eta Amaiur airean, goian (lurretik urrunegi) */
    vulnerable: () => ODEI.state === "open" && ODEI.t > 1 && P.y > Z7.y + 9,
    weak: () => {
      ODEI.core.getWorldPosition(OV);
      return { x: OV.x, y: OV.y, z: OV.z };
    },
    center: () => ({ x: ODEI.x, y: Z7.y, z: ODEI.z, h: Math.max(4, ODEI.y - Z7.y), r: 5 }),
    hit: (n) => odeiHit(n),
  };
  function odeiDefeat() {
    BOSS.dead = true;
    ODEI.state = "freed";
    ODEI.vents = false;
    P.wx = P.wz = 0;
    for (const M of ODEI.marks) {
      M.m.parent && M.m.parent.remove(M.m);
      M.fill.parent && M.fill.parent.remove(M.fill);
      if (M.stone) M.stone.parent && M.stone.parent.remove(M.stone);
    }
    ODEI.marks.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    say(
      [
        ["· · ·", "Hodei beltza zabaldu da, eta haren erdian itzal bat apurtu da, kristal bat bezala. Hodei zuri bat geratu da, euri-usaina zeramala.", "", ODEI.x, ODEI.z, ODEI.y - 2],
        ["ODEI", "…Arnasa. Lurrari euria eman nahi nion, ez harria. Gauekok trumoia sartu zidan bihotzean.", "", ODEI.x, ODEI.z, ODEI.y - 2],
        ["AMAIUR", "Bost zaindari askatuta. Bi falta dira. Non daude?", "", P.x, P.z, P.y],
        ["ODEI", "Hodeien beste aldean: suzko suge zahar bat, Herensugea, hegan; eta amets gaiztoen jauna, Inguma. Biak Gauekoren menpe.", "", ODEI.x, ODEI.z, ODEI.y - 2],
        ["ODEI", "Eta Anboton, Mari bera, ahotsik gabe. Hartu nire bihotza, sorgin: euriak ere badaki itzultzen.", "", ODEI.x, ODEI.z, ODEI.y - 2],
      ],
      () => {
        odeiFreed();
        saved.hearts = Math.max(saved.hearts, 5);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("odei");
        persist();
        itemGet("bihotza", L("ODEIREN BIHOTZA"), L("Arnasa bat gehiago. Hodeiek euri goxoa ekarriko dute berriro."), () => {
          title("ODEI ASKE", "");
          notify(L("Ekaitz-hesia desagertu da. Itzuli ortzadarretik (hegoan): herrian, Irati zain."), "", 6);
          hud();
        });
      },
    );
  }
  function odeiFreed(instant) {
    BOSS.on = false;
    ODEI.state = "freed";
    ODEI.vents = false;
    if (!ODEI.g) return;
    ODEI.mat.color.set("#f4f7fb");
    ODEI.mat.emissive.set("#cfe3f5");
    ODEI.mat.emissiveIntensity = 0.25;
    ODEI.mat.envMapIntensity = 1;
    ODEI.mat.flatShading = false;
    ODEI.mat.needsUpdate = true;
    for (const e of ODEI.eyes) if (e.isMesh && e.geometry.type === "BoxGeometry") e.visible = false;
    ODEI.core.visible = false;
    ODEI.weakGlow.visible = false;
    ODEI.mouth.scale.y = 0.15;
    for (const e of ODEI.eyes) e.visible = true;
    ODEI.light.color.set("#fff2d8");
    if (instant) {
      ODEI.x = Z7.x;
      ODEI.z = Z7.z - 4;
      ODEI.y = Z7.y + 12;
      ODEI.g.position.set(ODEI.x, ODEI.y, ODEI.z);
    } else fxRing(ODEI.x, Z7.y + 0.2, ODEI.z, "#9dffc4", 18, 1.4);
  }
  /* bossReset-etik (bizitzak amaituta) */
  function odeiReset() {
    if (BOSS.on && BOSS.kind === "odei" && !BOSS.dead) {
      BOSS.on = false;
      for (const M of ODEI.marks) {
        M.m.parent && M.m.parent.remove(M.m);
        M.fill.parent && M.fill.parent.remove(M.fill);
        if (M.stone) M.stone.parent && M.stone.parent.remove(M.stone);
      }
      ODEI.marks.length = 0;
      Object.assign(ODEI, { state: "sleep", t: 0, vents: false, open: 0 });
      P.wx = P.wz = 0;
      odeiHome();
      bossBar(null);
    }
  }
