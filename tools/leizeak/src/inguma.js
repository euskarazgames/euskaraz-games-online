  /* ==================================================================
     INGUMA · zazpigarren zaindaria (diseinu propioa; euskal mitologiako amets gaiztoen izakia)
     Lo daudenen bularrean esertzen da. Herri-konjuruak dio dena kontatu behar duela lehenik:
     haren aurka, seaska-kantaren hiru bertsoak, hiru fasetan:
       1 ZERUAN IZARRAK ... goian hegan: izar-euria (EZKUTUAz itzuli → zorabiatuta) eta murgiltzea
                            (itzala lurrean: alde egin). Murgildu ondoren, nekatuta behean →
                            IZAR-HAUTSA → KONTATZEN → zauritu.
       2 LURREAN BELARRAK . amets-belarrak lurrean (ORAINEAN mina; IRAGANEAN belar hutsak) eta
                            hiru Inguma: ENTZUN (txalaparta) → benetakoa urre-distiraz → hautsa.
                            Faltsuak, jotzean, mamu bihurtzen dira.
       3 ITSASOAN HAREAK .. handitu eta ohean eseri: amesgaiztoa betetzen (hare-haizea bultzaka).
                            SEASKA (txalaparta) → lokartu eta lurrera → zauritu (hautsarekin, bikoitza).
     ================================================================== */
  const ING = { g: null, body: null, eyes: [], smile: null, arms: [], state: "sleep", t: 0, hp: 0, phase: 0, x: 0, y: 7, z: 0, ang: 0, dive: null, fakes: [], realI: 0, reveal: 0, grass: [], crush: 0, scale: 1, seenIntro: false, said: {}, shotT: 2.5, src: { x: 0, y: 0, z: 0, era: -1 }, bed: null, grassMat: null, grassGeo: null, shadow: null, meter: null, flash: 0, swap: 0, stats: { counts: 0, lull: 0 } };
  /* erretratua (elkarrizketa-panela): kaputxa morea, bi begi zurbil handi eta irribarre mehea */
  Object.assign(PORTRAITS, {
    inguma:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="i1" d="M6 120c4-34 16-62 44-70 28 8 40 36 44 70z"/>' +
      '<path class="i3" d="M22 72c0-30 12-50 28-57 16 7 28 27 28 57-8-8-18-12-28-12s-20 4-28 12z"/>' +
      '<ellipse class="i1" cx="50" cy="67" rx="17" ry="21"/>' +
      '<g class="eyes"><ellipse class="i2" cx="42" cy="62" rx="4.2" ry="6"/><ellipse class="i2" cx="58" cy="62" rx="4.2" ry="6"/></g>' +
      '<path class="mouth i2" d="M37 77q13 8 26 0q-13 3-26 0z"/>' +
      '<path class="i3" d="M30 104q-4 8-10 13M70 104q4 8 10 13M38 108q-1 6-4 10M62 108q1 6 4 10" stroke-width="2" fill="none"/></svg>',
  });
  PORTRAIT_OF.INGUMA = "inguma";
  PORTRAIT_OF["IRATI?"] = "unknown";
  const ING_HP = 10,
    ING_R = 2.4;
  /* ametseko hitzak (jokoa gelditu gabe): ahotsa eta azpititulua */
  function bark(id) {
    if (ING.said[id]) return;
    ING.said[id] = true;
    const [who, text] = voiceLine(id);
    voiceLoad(id).then(() => voicePlay(id));
    notify(who + ": " + L(text), "", 4.5);
  }
  /* --------------------------- eraikitzea --------------------------- */
  function ingumaMesh() {
    const g = new T.Group(),
      /* kopiak benetakoaren berdinak (ENTZUN edo izarrak dira seinale bakarrak) */
      cloth = new T.MeshStandardMaterial({ color: "#120a1f", emissive: new T.Color("#2a1450"), emissiveIntensity: 0.5, roughness: 0.9, side: T.DoubleSide });
    /* kapa: behealdea zarpail (uhinak), goian estua */
    const prof = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      prof.push(new T.Vector2(0.25 + Math.pow(1 - k, 1.6) * 1.6, 3.6 * k));
    }
    const geo = new T.LatheGeometry(prof, 20),
      pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i);
      if (y < 0.5) pa.setY(i, y + Math.sin(Math.atan2(pa.getZ(i), pa.getX(i)) * 7) * 0.22 * (1 - y / 0.5));
    }
    geo.computeVertexNormals();
    const body = new T.Mesh(geo, cloth);
    body.castShadow = true;
    g.add(body);
    /* burua: kaputxa iluna, bi begi zurbil handi eta irribarre mehea */
    const head = new T.Mesh(new T.SphereGeometry(0.62, 16, 12), cloth);
    head.position.y = 3.95;
    head.scale.set(1, 1.15, 1);
    g.add(head);
    const eyes = [];
    for (const s of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), new T.MeshBasicMaterial({ color: "#f3ecff" }));
      eye.position.set(s * 0.24, 4.05, 0.52);
      eye.scale.set(1, 1.35, 0.6);
      g.add(eye);
      eyes.push(eye);
    }
    const smile = new T.Mesh(new T.TorusGeometry(0.26, 0.035, 5, 14, PI * 0.9), new T.MeshBasicMaterial({ color: "#f3ecff" }));
    smile.position.set(0, 3.72, 0.55);
    smile.rotation.z = PI * 1.05;
    g.add(smile);
    /* beso luzeak eta hatz-atzaparrak */
    const arms = [];
    for (const s of [-1, 1]) {
      const pivot = new T.Group();
      pivot.position.set(s * 0.55, 3.2, 0.1);
      const arm = new T.Mesh(new T.CylinderGeometry(0.07, 0.11, 2.2, 6), cloth);
      arm.position.y = -1.1;
      pivot.add(arm);
      for (let f = -1; f <= 1; f++) {
        const claw = new T.Mesh(new T.ConeGeometry(0.04, 0.5, 4), new T.MeshBasicMaterial({ color: "#d9c8ff" }));
        claw.position.set(f * 0.08, -2.4, 0.06);
        claw.rotation.x = PI;
        pivot.add(claw);
      }
      pivot.rotation.z = s * 0.5;
      g.add(pivot);
      arms.push(pivot);
    }
    const aura = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7a5cff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.45 }));
    aura.position.y = 2.6;
    aura.scale.setScalar(7);
    g.add(aura);
    return { g, body, eyes, smile, arms, aura, cloth };
  }
  function ingumaBuild() {
    const R = DGA.bossRoom;
    /* ohea arenaren iparrean: Amaiur lo (maindirepean), sorgin-txapela burkoan */
    const bed = new T.Group(),
      frame = new T.Mesh(new T.BoxGeometry(3.4, 0.9, 5.2), material("#6e4a2c")),
      sheet = new T.Mesh(new T.BoxGeometry(3.1, 0.3, 4.9), material("#f2efe6")),
      mound = new T.Mesh(new T.SphereGeometry(1, 14, 10), material("#a8332a")),
      pillow = new T.Mesh(new T.BoxGeometry(2.2, 0.35, 0.9), material("#fbf8f0")),
      hat = new T.Mesh(new T.ConeGeometry(0.45, 1.1, 10), material("#3a3f7a")),
      brim = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.06, 16), material("#3a3f7a"));
    frame.position.y = 0.45;
    sheet.position.y = 1.0;
    mound.scale.set(1.25, 0.45, 2.1);
    mound.position.set(0, 1.15, 0.5);
    pillow.position.set(0, 1.25, -1.9);
    hat.position.set(0.2, 1.75, -1.85);
    hat.rotation.x = -0.9;
    brim.position.set(0.2, 1.5, -1.65);
    brim.rotation.x = -0.9;
    bed.add(frame, sheet, mound, pillow, hat, brim);
    bed.traverse((n) => n.isMesh && ((n.castShadow = true), (n.receiveShadow = true)));
    bed.position.set(R.x, 0, R.z - 9);
    BP.add(bed);
    solids.push({ x: R.x, z: R.z - 9, r: 2.2, h: 1.4, y: 0, pillar: true });
    ING.bed = { x: R.x, z: R.z - 9, g: bed, mound };
    const M = ingumaMesh();
    Object.assign(ING, M);
    ING.g.position.set(R.x, 7, R.z - 9);
    BP.add(ING.g);
    for (let i = 0; i < 2; i++) {
      const F = ingumaMesh();
      F.g.visible = false;
      BP.add(F.g);
      ING.fakes.push({ ...F, x: R.x, y: 3, z: R.z, alive: true, t: 0 });
    }
    /* murgiltzearen itzala lurrean */
    ING.shadow = new T.Mesh(new T.CircleGeometry(2.4, 28), new T.MeshBasicMaterial({ color: "#2a0a3a", transparent: true, opacity: 0, depthWrite: false }));
    ING.shadow.rotation.x = -PI / 2;
    ING.shadow.position.y = 0.06;
    ING.shadow.renderOrder = 3;
    BP.add(ING.shadow);
    ING.x = R.x;
    ING.z = R.z - 9;
    if (saved.flags.includes("inguma")) ING.g.visible = false;
  }
  /* --------------------------- borroka --------------------------- */
  const ingR = () => DGA.bossRoom;
  function ingumaStart() {
    if (BOSS.on || saved.flags.includes("inguma") || !ING.g) return;
    const R = ingR();
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "inguma";
    BOSS.weakR = 1.8;
    Object.assign(ING, { state: "intro", t: 0, hp: ING_HP, phase: 1, crush: 0, scale: 1, reveal: 0, swap: 0, shotT: 2.5, said: {} });
    ING.g.visible = true;
    ING.x = ING.bed.x;
    ING.z = ING.bed.z;
    ING.y = 2.4;
    const fight = () => {
      ING.state = "float";
      ING.t = 0;
      title("INGUMA", "");
      SND.roar();
      shake(0.5);
      bossBar("INGUMA", 1);
      notify(L("Goian hegan. Izarrak: EZKUTUA (eutsi SORGINKERIAri). Murgiltzean, alde egin; gero, nekatuta: IZAR-HAUTSA!"), "", 7);
    };
    if (ING.seenIntro) return fight();
    ING.seenIntro = true;
    vsay(["c7_n3", "c7_a4"], fight, { INGUMA: [ING.x, ING.z, 2.4] });
  }
  /* kontatzen hasi (IZAR-HAUTSA): zaurgarri */
  function ingumaCount(secs = 4.5) {
    ING.state = "count";
    ING.t = 0;
    ING.countT = secs;
    ING.countN = 0;
    ING.stats.counts++;
    bark("c7_n4");
    SND.wake();
    fxRing(ING.x, ING.y + 0.5, ING.z, "#d9c8ff", 4, 0.6);
  }
  function ingumaDust(tx, ty, tz) {
    if (!BOSS.on || BOSS.kind !== "inguma") return 0;
    const near = (x, y, z) => Math.hypot(x - tx, z - tz) < ING_R + 2 && Math.abs(y - ty) < 4.5;
    if (ING.phase === 2) {
      for (const F of ING.fakes) {
        if (F.alive && F.g.visible && near(F.x, F.y, F.z)) {
          fakePop(F);
          return 1;
        }
      }
    }
    if (!near(ING.x, ING.y, ING.z)) return 0;
    if (ING.state === "tired" || ING.state === "float2" || ING.state === "lull" || ING.state === "stagger") {
      ingumaCount(ING.state === "lull" ? 6 : 4.5);
      return 1;
    }
    return 0;
  }
  function ingumaHit(n) {
    if (!BOSS.vulnerable()) return;
    /* lokartuta eta kontatzen: kalte bikoitza */
    const k = ING.state === "count" && ING.lullBoth ? 2 : 1;
    ING.hp -= n * k;
    const w = BOSS.weak();
    FB.bossHit(w.x, w.y, w.z);
    damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.5 }, n * k);
    ING.flash = 0.25;
    bossBar("INGUMA", (3 - ING.phase + Math.max(0, ING.hp) / ING_HP) / 3);
    if (ING.hp > 0) return;
    if (ING.phase >= 3) return ingumaDefeat();
    ING.phase++;
    ING.hp = ING_HP;
    SND.roar();
    shake(0.7);
    slowmo = 0.5;
    if (ING.phase === 2) {
      ING.state = "float2";
      ING.t = 0;
      ING.realI = Math.floor(Math.random() * 3);
      for (const F of ING.fakes) Object.assign(F, { alive: true, t: 0 });
      grassSpawn();
      bark("c7_n5");
      notify(L("Hiru Inguma! Benetakoak bakarrik botatzen ditu izarrak — edo ENTZUN (txalaparta): urre-distira. Amets-belarrak: IRAGANEAN ez dute minik egiten."), "", 7);
    } else {
      ING.state = "sit";
      ING.t = 0;
      ING.crush = 0;
      for (const F of ING.fakes) F.g.visible = false;
      grassClear();
      notify(L("Ohean eseri da: amesgaiztoa betetzen ari da! SEASKA (◀ ▶ ◀ ▶ ◀): lokartu ezazu."), "", 7);
    }
  }
  /* SEASKA (seaska.js → ametsaSeaska-tik) */
  function ingumaLullaby() {
    if (!BOSS.on || BOSS.kind !== "inguma") return false;
    if (ING.phase < 3) {
      notify(L("Inguma barrez: «Oraindik ez, sorgin txikia!» — esna dago, hegan. Lehenik, kontatu dezala."), "", 3.5);
      return true;
    }
    if (ING.state !== "sit") return true;
    ING.state = "lull";
    ING.t = 0;
    ING.crush = Math.max(0, ING.crush - 0.4);
    ING.stats.lull++;
    bark("c7_n6");
    fxBurst(ING.x, ING.y + 2, ING.z, { n: 40, speed: 2, up: 1, life: 1.4, size: 0.3, color: "#e6dcff", grav: -0.3 });
    notify(L("Lokartzen ari da! Orain: jo (eta IZAR-HAUTSA: kalte bikoitza)."), "", 4);
    return true;
  }
  /* itzulitako izarra: zorabiatuta (hautsarentzat leihoa) */
  function ingumaStagger() {
    if (ING.phase === 3 || ING.state === "count") return;
    ING.state = "stagger";
    ING.t = 0;
    SND.clang(0.7);
    fxBurst(ING.x, ING.y + 2, ING.z, { n: 30, speed: 4, life: 0.6, size: 0.3, color: "#fff1a8", grav: 2 });
    notifyOnce("inguma-zorabiatu", L("Bere izarra itzuli zaio! Zorabiatuta: IZAR-HAUTSA orain!"), "");
  }
  /* faltsua lehertu: mamu bat */
  function fakePop(F) {
    F.alive = false;
    F.t = 0;
    F.g.visible = false;
    fxBurst(F.x, F.y + 2, F.z, { n: 30, speed: 3, life: 0.8, size: 0.35, color: "#cbb8ff", grav: -0.5 });
    SND.whoosh();
    if (ENEMIES.filter((e) => e.state !== "dead").length < 3) {
      const e = spawnEnemy("mamua", -1, F.x, F.z, 0);
      e.room = ingR();
    }
    notifyOnce("inguma-faltsua", L("Faltsua! Mamu bihurtu da. Benetakoa: ENTZUN (txalaparta)."), "");
  }
  /* amets-belarrak (2. fasea): ORAINEAN mina ematen dute */
  function grassSpawn() {
    grassClear();
    const R = ingR();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.4,
        r = 5 + (i % 3) * 3.2,
        x = R.x + Math.cos(a) * r,
        z = R.z + Math.sin(a) * r;
      const g = new T.Group();
      ING.grassMat ||= new T.MeshStandardMaterial({ color: "#2a1a3a", emissive: new T.Color("#5a2a7a"), emissiveIntensity: 0.6, roughness: 0.8 });
      ING.grassGeo ||= [0, 1, 2].map((j) => new T.ConeGeometry(0.07, 0.9 + j * 0.3, 4));
      for (let k = 0; k < 14; k++) {
        const b = new T.Mesh(ING.grassGeo[k % 3], ING.grassMat);
        const ka = k * 2.4,
          kr = 0.3 + (k % 5) * 0.32;
        b.position.set(Math.cos(ka) * kr, 0.45, Math.sin(ka) * kr);
        b.rotation.z = Math.sin(ka) * 0.3;
        g.add(b);
      }
      g.position.set(x, 0, z);
      ZONES.ametsa.group.add(g);
      ING.grass.push({ g, x, z, r: 1.9, k: 0, hurtT: 0 });
    }
  }
  function grassClear() {
    for (const G of ING.grass) G.g.parent && G.g.parent.remove(G.g);
    ING.grass.length = 0;
  }
  function ingumaDefeat() {
    BOSS.dead = true;
    ING.state = "dead";
    flagSet("inguma");
    P.wx = P.wz = 0;
    grassClear();
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    vsay(["c7_n7"], () => {
      BOSS.on = false;
      ING.g.visible = false;
      for (const F of ING.fakes) F.g.visible = false;
      saved.hearts = Math.max(saved.hearts, 7);
      updateMaxHp();
      P.hp = P.maxHp;
      persist();
      itemGet("bihotza", L("INGUMAREN KATEA, HAUTSIA"), L("Arnasa bat gehiago. Ametsak berriro zureak dira."), () => ametsaWake());
    }, { INGUMA: [ING.x, ING.z, ING.y] });
  }
  /* --------------------------- eguneraketa --------------------------- */
  function ingumaUpdate(dt) {
    if (!ING.g || ZONE.cur !== "ametsa") return;
    const R = ingR();
    /* hasi: arenan sartzean */
    if (!BOSS.on && !saved.flags.includes("inguma") && saved.doors.includes(DGA.bossDoor) && ROOM.cur === R && P.grounded && Math.hypot(P.x - R.x, P.z - R.z) < 13 && !cinematic && !FILM.on) ingumaStart();
    ING.flash = Math.max(0, ING.flash - dt);
    const live = BOSS.on && BOSS.kind === "inguma" && !BOSS.dead;
    if (!live) {
      /* lo: ohean eserita, astiro arnasa hartzen */
      if (!saved.flags.includes("inguma")) {
        ING.g.position.set(ING.bed.x, 1.3 + Math.sin(time * 1.2) * 0.05, ING.bed.z);
        ING.g.rotation.y = 0;
      }
      return;
    }
    ING.t += dt;
    const t = ING.t,
      dx = P.x - ING.x,
      dz = P.z - ING.z,
      d = Math.hypot(dx, dz) || 1;
    let ty = ING.y;
    /* --- 1. fasea: IZARRAK --- */
    if (ING.state === "float") {
      ING.ang += dt * 0.45;
      const tx = R.x + Math.cos(ING.ang) * 10,
        tz = R.z + Math.sin(ING.ang) * 10;
      ING.x = mix(ING.x, tx, 1 - Math.exp(-dt * 1.5));
      ING.z = mix(ING.z, tz, 1 - Math.exp(-dt * 1.5));
      ty = mix(ING.y, 7.5 + Math.sin(t * 1.4) * 0.6, 1 - Math.exp(-dt * 2.5));
      ING.shotT -= dt;
      if (ING.shotT <= 0) {
        ING.shotT = 2.4;
        /* izar-euria: hiru izar, haizemailean */
        const a = Math.atan2(dx, dz);
        for (const s of [-0.28, 0, 0.28]) {
          shoot(ING.src, Math.sin(a + s), Math.cos(a + s), 0.85);
          const S = SHOTS[SHOTS.length - 1];
          S.star = true;
          S.m.material = material("#fff1a8", 1.4);
        }
      }
      if (t > 7.5) {
        ING.state = "diveWind";
        ING.t = 0;
        ING.dive = { x: P.x, z: P.z };
        SND.screech && SND.screech();
      }
    } else if (ING.state === "diveWind") {
      ty = mix(ING.y, 9, 1 - Math.exp(-dt * 3));
      ING.dive.x = mix(ING.dive.x, P.x, 1 - Math.exp(-dt * 2));
      ING.dive.z = mix(ING.dive.z, P.z, 1 - Math.exp(-dt * 2));
      if (t > 1.1) {
        ING.state = "dive";
        ING.t = 0;
        ING.from = { x: ING.x, y: ING.y, z: ING.z };
      }
    } else if (ING.state === "dive") {
      const k = Math.min(1, t / 0.38);
      ING.x = mix(ING.from.x, ING.dive.x, k);
      ING.z = mix(ING.from.z, ING.dive.z, k);
      ty = mix(ING.from.y, 1, k * k);
      if (k >= 1) {
        shake(0.45);
        fxRing(ING.x, 0.15, ING.z, "#7a5cff", 4, 0.5);
        if (Math.hypot(P.x - ING.x, P.z - ING.z) < 2.4 && P.y < 2.5 && P.dashT <= 0) playerHit(1, ING.x, ING.z);
        ING.state = "tired";
        ING.t = 0;
        notifyOnce("inguma-nekatuta", L("Nekatuta, behean! IZAR-HAUTSA (Z) bota: kontatzen hasiko da."), "");
      }
    } else if (ING.state === "tired" || ING.state === "stagger") {
      /* zorabiatuta (izarra itzulita) erortzen da; nekatuta, behean arnasestuka */
      ty = mix(ING.y, 1.1, 1 - Math.exp(-dt * (ING.state === "stagger" ? 4 : 8))) + Math.sin(t * 6) * 0.02;
      if (t > (ING.state === "stagger" ? 3.4 : 2.8)) {
        ING.state = ING.phase === 1 ? "float" : "float2";
        ING.t = 0;
      }
    } else if (ING.state === "count") {
      /* kontatzen: geldi, zenbakiak buruaren gainean */
      ty = mix(ING.y, ING.phase === 3 ? 0.8 : 1.4, 1 - Math.exp(-dt * 4));
      ING.countT -= dt;
      if (Math.floor((t - dt) * 2) !== Math.floor(t * 2)) damageNumber({ x: ING.x, y: ty + 4.4, z: ING.z, H: 0.4 }, String(++ING.countN), "#d9c8ff");
      if (ING.countT <= 0) {
        ING.lullBoth = false;
        ING.state = ING.phase === 1 ? "float" : ING.phase === 2 ? "float2" : "sit";
        ING.t = 0;
        if (ING.phase === 2) ING.realI = Math.floor(Math.random() * 3);
      }
    }
    /* --- 2. fasea: BELARRAK (hiru Inguma, ENTZUN; kopiak eta belarrak egoera guztietan) --- */
    if (ING.phase === 2) {
      ING.reveal = TXALA.reveal > 0 ? 1 : Math.max(0, ING.reveal - dt * 0.5);
      ING.swap += dt;
      if (ING.swap > 7 && ING.state === "float2") {
        ING.swap = 0;
        ING.realI = (ING.realI + 1 + Math.floor(Math.random() * 2)) % 3;
        SND.whoosh();
      }
      const slots = [0, 1, 2].map((i) => {
        const a = ING.ang + (i * TAU) / 3;
        return [R.x + Math.cos(a) * 8, R.z + Math.sin(a) * 8];
      });
      if (ING.state === "float2") {
        ING.ang += dt * 0.35;
        ING.x = mix(ING.x, slots[ING.realI][0], 1 - Math.exp(-dt * 2.5));
        ING.z = mix(ING.z, slots[ING.realI][1], 1 - Math.exp(-dt * 2.5));
        ty = mix(ING.y, 3 + Math.sin(t * 1.6) * 0.4, 1 - Math.exp(-dt * 2.5));
        /* izarrak benetakoak bakarrik botatzen ditu (beste seinale bat); itzuliz gero, zorabiatuta */
        ING.shotT -= dt;
        if (ING.shotT <= 0) {
          ING.shotT = 3.2;
          const a = Math.atan2(P.x - ING.x, P.z - ING.z);
          shoot(ING.src, Math.sin(a), Math.cos(a), 0.8);
          const S = SHOTS[SHOTS.length - 1];
          S.star = true;
          S.m.material = material("#fff1a8", 1.4);
        }
      }
      let j = 0;
      for (let i = 0; i < 3; i++) {
        if (i === ING.realI) continue;
        const F = ING.fakes[j++];
        if (!F.alive) {
          F.t += dt;
          if (F.t > 6) (F.alive = true), (F.t = 0);
        }
        F.g.visible = F.alive;
        F.x = mix(F.x, slots[i][0], 1 - Math.exp(-dt * 2.5));
        F.z = mix(F.z, slots[i][1], 1 - Math.exp(-dt * 2.5));
        F.y = 3 + Math.sin(t * 1.6 + i) * 0.4;
        F.g.position.set(F.x, F.y, F.z);
        F.g.rotation.y = Math.atan2(P.x - F.x, P.z - F.z);
        F.cloth.emissive.set("#2a1450");
      }
      /* belarrak: ORAINEAN mina */
      if (ING.grassMat) ING.grassMat.emissiveIntensity = phase ? 0.6 + Math.sin(time * 4) * 0.15 : 0.04;
      for (const G of ING.grass) {
        G.k = mix(G.k, 1, 1 - Math.exp(-dt * 1.5));
        G.g.scale.setScalar(0.3 + 0.7 * G.k);
        G.hurtT = Math.max(0, G.hurtT - dt);
        if (phase === 1 && G.hurtT <= 0 && Math.hypot(P.x - G.x, P.z - G.z) < G.r && P.y < 1 && !respawnTimer) {
          G.hurtT = 1.2;
          playerHit(1, G.x, G.z);
          notifyOnce("amets-belarrak", L("Amets-belarrak! ORAINEAN mina; IRAGANEAN (uda), belar hutsak dira."), "");
        }
      }
    }
    /* --- 3. fasea: HAREAK (ohean eserita; SEASKA) --- */
    if (ING.state === "sit") {
      ING.x = mix(ING.x, ING.bed.x, 1 - Math.exp(-dt * 2));
      ING.z = mix(ING.z, ING.bed.z, 1 - Math.exp(-dt * 2));
      ty = mix(ING.y, 2.2, 1 - Math.exp(-dt * 2));
      ING.crush = Math.min(1, ING.crush + dt / 13);
      /* hare-haizea: ohetik urrun bultzaka */
      const bx = P.x - ING.bed.x,
        bz = P.z - ING.bed.z,
        bd = Math.hypot(bx, bz) || 1,
        push = bd < 9 ? 3.4 * (1 - bd / 9) + 1.2 : 0;
      P.wx = (bx / bd) * push;
      P.wz = (bz / bd) * push;
      if (Math.random() < dt * 30) fxBurst(ING.bed.x + (Math.random() - 0.5) * 8, 0.4 + Math.random() * 2, ING.bed.z + (Math.random() - 0.5) * 8, { n: 1, speed: 3, up: 0.4, life: 0.8, size: 0.14, color: "#e8d6a8", grav: 0.3, drag: 0.5 });
      if (ING.crush >= 1) {
        ING.crush = 0.35;
        playerHit(1, ING.bed.x, ING.bed.z);
        shake(0.6);
        notify(L("Amesgaiztoak estutu zaitu! SEASKA, azkar (◀ ▶ ◀ ▶ ◀)!"), "", 3);
      }
    } else if (ING.state === "lull") {
      P.wx = P.wz = 0;
      ty = mix(ING.y, 0.8, 1 - Math.exp(-dt * 3));
      ING.x = mix(ING.x, ING.bed.x + 3.2, 1 - Math.exp(-dt * 2));
      ING.z = mix(ING.z, ING.bed.z + 2.5, 1 - Math.exp(-dt * 2));
      if (Math.random() < dt * 2) damageNumber({ x: ING.x, y: ty + 4.2, z: ING.z, H: 0.4 }, "z z", "#d9c8ff");
      if (t > 7) {
        ING.state = "sit";
        ING.t = 0;
      }
    } else if (ING.phase === 3 && ING.state === "count") {
      P.wx = P.wz = 0;
      ING.lullBoth = true;
    } else if (ING.phase !== 3) {
      P.wx = P.wz = 0;
    }
    /* itxura */
    ING.y = ty;
    ING.g.position.set(ING.x, ty, ING.z);
    ING.src.x = ING.x;
    ING.src.y = ty;
    ING.src.z = ING.z;
    ING.g.rotation.y = Math.atan2(P.x - ING.x, P.z - ING.z);
    const sc = ING.phase === 3 ? 1.55 : 1;
    ING.scale = mix(ING.scale, sc, 1 - Math.exp(-dt * 2));
    ING.g.scale.setScalar(ING.scale);
    const counting = ING.state === "count",
      asleep = ING.state === "lull";
    for (const e of ING.eyes) {
      e.scale.y = asleep ? 0.15 : counting ? 0.6 + Math.abs(Math.sin(t * 8)) * 0.6 : 1.35;
      e.material.color.set(ING.phase === 2 && ING.reveal > 0.05 ? "#ffd36a" : counting ? "#c9b6ff" : "#f3ecff");
    }
    ING.cloth.emissive.set(ING.flash > 0 ? "#ffffff" : ING.phase === 2 && ING.reveal > 0.05 ? "#a07a20" : "#2a1450");
    ING.cloth.emissiveIntensity = ING.flash > 0 ? 1.8 : 0.5;
    for (const [i, A] of ING.arms.entries()) A.rotation.x = ING.state === "diveWind" ? -1.6 : ING.state === "sit" ? -0.6 + Math.sin(t * 3 + i) * 0.2 : Math.sin(t * 2 + i * 2) * 0.25;
    ING.aura.material.opacity = 0.35 + Math.sin(t * 3) * 0.1;
    /* murgiltzearen itzala */
    ING.shadow.material.opacity = ING.state === "diveWind" ? 0.25 + 0.4 * Math.min(1, t / 1.1) : 0;
    if (ING.dive) ING.shadow.position.set(ING.dive.x, 0.06, ING.dive.z);
  }
  /* amesgaiztoaren neurgailua: binjeta morea (game.js-ko binjetatik) */
  const ingumaVignette = () => (BOSS.on && BOSS.kind === "inguma" && ING.state === "sit" && ING.crush > 0.15 ? `inset 0 0 ${70 + 170 * ING.crush}px #3a0a5ab0` : "");
  /* bossReset-etik (bizitzak amaituta): ohera itzuli, lo */
  function ingumaReset() {
    if (!(BOSS.on && BOSS.kind === "inguma" && !BOSS.dead)) return;
    BOSS.on = false;
    P.wx = P.wz = 0;
    grassClear();
    for (const F of ING.fakes) (F.g.visible = false), (F.alive = true);
    Object.assign(ING, { state: "sleep", t: 0, phase: 0, crush: 0, scale: 1, dive: null, lullBoth: false });
    ING.g.scale.setScalar(1);
    ING.shadow.material.opacity = 0;
    bossBar(null);
  }
  BOSSK.inguma = {
    vulnerable: () => ING.state === "count" || ING.state === "lull",
    weak: () => ({ x: ING.x, y: ING.y + 3.9 * ING.scale, z: ING.z }),
    center: () => ({ x: ING.x, y: ING.y, z: ING.z, h: 4.5 * ING.scale, r: 2.6 }),
    hit: (n) => ingumaHit(n),
    stagger: () => ingumaStagger(),
    dust: (x, y, z) => ingumaDust(x, y, z),
    /* hiru Inguma: ENTZUN gabe, fijazioak ez du benetakoa salatzen */
    noLock: () => ING.state === "float2" && ING.reveal < 0.05,
    dustAim: () => [{ x: ING.x, y: ING.y, z: ING.z }, ...ING.fakes.filter((F) => F.alive && F.g.visible).map((F) => ({ x: F.x, y: F.y, z: F.z }))],
  };
