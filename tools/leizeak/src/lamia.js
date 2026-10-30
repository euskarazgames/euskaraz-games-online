  /* ==================================================================
     LAMIEN LEIZEA · bigarren leizea (diseinu propioa) — ura, izotza eta haizea
       Lehen ekitaldian ez dago garairik: leize honetan urak Amaiurren sorginkeriari erantzuten dio, eta
       garaien botoi berak ura esnatzen (UR BIZIA, barruko "iragana") edo izozten (IZOTZA, barruko
       "oraina") du (denbora.js). Sarrera: ur-jauziko izotz-gortina, KATEArekin erauzita.
       L1 Lamien ataria ....... ubidea: ur bizia edo izotza → izotzarekin zeharkatu
       L2 Errotaren gela ...... ubidea eta errota: gurpilak (ur biziarekin) mendebaldeko barrak
                                altxatzen ditu; iparrean giltzadun atea; ekialdean bi haize-errota
       L3 Lamien korua ........ borroka → GILTZA TXIKIA
       L5 Herensugearen putzua  etsai ertaina: azaleratzean IZOTZA → izotzak harrapatzen
                                du → buruko harribitxia jo → HAIZE-ADARRA
       L6 Balsen aintzira ..... balsa (ur biziarekin) adarraz bultzatu; ur-jauziaren atzean GILTZA
                                NAGUSIA; lainoaren azpian uhartetxo bat
       L7 Lamia Ilunaren putzua etsai nagusia: lainoa uxatu (ADARRA), igerian dagoela izoztu
                                (IZOTZA), haren koroa jo (SORGINKERIA). Hiru txanda.
     ================================================================== */
  const LX = 900,
    WATER_Y = -0.25;
  const DGL = {
    id: "lamia",
    num: "02",
    entry: { x: LX, y: 0, z: 8.5, a: PI },
    exitArch: { x: LX, z: 12.2 },
    exitTo: () => ({ x: 94.5, y: -0.9, z: -28.5, a: -PI / 2, cp: true }),
    bigKey: "giltzanagusia-lamia",
    bigKeyText: "Lamia Ilunaren putzura daraman ate handia irekitzen du.",
    bossDoor: "lD-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#6fe0ff", "#c9f4ff"],
    tint: "#a9cfd6",
    fog: [9, 54],
    pools: [],
  };
  /* ------------------------------ ura ↔ izotza ------------------------------ */
  /* iraganean ura (erori → korronteak eraman), orainean izotza (ibili, irristatu) */
  function pool(x, z, w, d, y = WATER_Y) {
    const m = waterSheet(x, z, w, d, y);
    m.renderOrder = 1;
    const ice = { x, z, y, bottom: y - 1.2, w, d, rot: 0, phase: 1, ice: true, slick: true, safe: false };
    platforms.push(ice);
    /* ertzeko harri ilunak (zoruaren azpian ez ikusteko) */
    const rim = obj(new T.BoxGeometry(w, 2.2, d), material("#1d2a2e"));
    rim.position.set(x, y - 1.25, z);
    rim.castShadow = rim.receiveShadow = false;
    const W = { x, z, w, d, y, m, ice };
    BDG.pools.push(W);
    return W;
  }
  const inPool = (W, x, z, m = 0) => Math.abs(x - W.x) < W.w / 2 - m && Math.abs(z - W.z) < W.d / 2 - m;
  /* lamia-irudia (harria, urrezko orraziarekin) */
  function lamiaStatue(x, z, rot, s = 1) {
    const g = new T.Group(),
      stone = material("#7f9092");
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    BP.add(g);
    const parts = [
      [new T.CylinderGeometry(1.1, 1.3, 0.6, 10), 0, 0.3, 0],
      [new T.ConeGeometry(0.85, 2.6, 10), 0, 1.9, 0, PI],
      [new T.CylinderGeometry(0.34, 0.5, 1.1, 8), 0, 3.6, 0],
      [new T.SphereGeometry(0.42, 12, 10), 0, 4.45, 0],
      [new T.ConeGeometry(0.52, 2.1, 10, 1, true), 0, 3.7, -0.22],
    ];
    for (const [geo, px, py, pz, rx] of parts) {
      const m = new T.Mesh(geo, stone);
      m.position.set(px, py, pz);
      if (rx) m.rotation.x = rx;
      m.castShadow = true;
      g.add(m);
    }
    const comb = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 6, 14, PI), material("#ffd36a", 0.7));
    comb.position.set(0, 4.8, 0.08);
    g.add(comb);
    solids.push({ x, z, r: 1.25 * s, h: 5, y: 0, pillar: true });
    return g;
  }
  /* kristal urdin distiratsua (apaingarria) */
  function crystal(x, y, z, s = 1, col = "#7fe9ff") {
    const m = obj(new T.OctahedronGeometry(0.5 * s, 0), new T.MeshStandardMaterial({ color: col, emissive: new T.Color(col), emissiveIntensity: 0.9, roughness: 0.2, flatShading: true }));
    m.position.set(x, y + 0.5 * s, z);
    m.scale.y = 1.8;
    m.rotation.set(0.2, x, 0.15);
    glow(x, y + 0.8 * s, z, col, 2.2 * s);
    return m;
  }
  /* errota-gurpila: iraganean biraka (ardatza z-n) */
  function waterWheel(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const wood = material("#6b4a2e"),
      dark = material("#3e2b1c");
    const axle = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 2.2, 10), dark);
    axle.rotation.x = PI / 2;
    g.add(axle);
    for (const s of [-1, 1]) {
      const rim = new T.Mesh(new T.TorusGeometry(2.9, 0.14, 6, 28), wood);
      rim.position.z = s * 0.7;
      g.add(rim);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU,
        pad = new T.Mesh(new T.BoxGeometry(0.16, 1.1, 1.6), wood),
        spoke = new T.Mesh(new T.BoxGeometry(0.12, 2.9, 0.12), dark);
      pad.position.set(Math.cos(a) * 3.1, Math.sin(a) * 3.1, 0);
      pad.rotation.z = a;
      spoke.position.set(Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0);
      spoke.rotation.z = a - PI / 2;
      g.add(pad, spoke);
    }
    g.traverse((n) => n.isMesh && (n.castShadow = true));
    return g;
  }
  /* ur-jauzi gortina: iraganean ura (pasa daiteke), orainean izotza (horma) */
  function curtain(x, z0, z1, y0, h) {
    const len = Math.abs(z1 - z0),
      cz = (z0 + z1) / 2,
      ft = fallTexture();
    ft.repeat.set(len / 3, 1.2);
    const fall = obj(new T.PlaneGeometry(len, h), new T.MeshBasicMaterial({ map: ft, color: "#cdeef5", transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
    fall.position.set(x, y0 + h / 2, cz);
    fall.rotation.y = PI / 2;
    fall.castShadow = false;
    ATMO.falls.push(fall);
    const ice = obj(new T.BoxGeometry(1, h, len), new T.MeshStandardMaterial({ color: "#cfeefa", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.8, emissive: new T.Color("#5fa8c8"), emissiveIntensity: 0.2 }));
    ice.position.set(x, y0 + h / 2, cz);
    const p = { x, z: cz, y: y0 + h, bottom: y0 - 2, w: 1.1, d: len, rot: 0, phase: 1, wall: true, safe: false, m: ice };
    platforms.push(p);
    phaseObjects.push({ m: ice, ghost: new T.Object3D(), phase: 1 });
    return { fall, ice, p };
  }

  /* ---------------------------------- balsa ---------------------------------- */
  const RAFT = { p: null, g: null, sail: null, t: 0, v: 0, ax: 0, az: 0, bx: 0, bz: 0, L: 1, y: -0.02, W: null, billow: 0 };
  function raftBuild(ax, az, bx, bz) {
    Object.assign(RAFT, { ax, az, bx, bz, L: Math.hypot(bx - ax, bz - az), t: 0, v: 0 });
    const p = { x: ax, z: az, y: RAFT.y, bottom: RAFT.y - 0.7, w: 3.2, d: 3.2, rot: 0, phase: -1, moving: true, dx: 0, dz: 0, safe: false };
    platforms.push(p);
    RAFT.p = p;
    const g = new T.Group(),
      wood = material("#8a6440"),
      rope = material("#c9b48a");
    for (let i = 0; i < 5; i++) {
      const log = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 3.3, 8), wood);
      log.rotation.x = PI / 2;
      log.position.set(-1.28 + i * 0.64, -0.28, 0);
      log.castShadow = true;
      g.add(log);
    }
    for (const s of [-1, 1]) {
      const band = new T.Mesh(new T.BoxGeometry(3.3, 0.12, 0.16), rope);
      band.position.set(0, -0.02, s * 1.1);
      g.add(band);
    }
    const mast = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 3.4, 6), material("#5a3c26"));
    mast.position.set(0, 1.7, 0.9);
    g.add(mast);
    const sail = new T.Mesh(new T.PlaneGeometry(2.4, 2.2, 6, 1), new T.MeshStandardMaterial({ color: "#e9dcc0", side: T.DoubleSide, roughness: 0.9 }));
    sail.position.set(0, 2.2, 0.95);
    g.add(sail);
    RAFT.sail = sail;
    RAFT.sail0 = Float32Array.from(sail.geometry.attributes.position.array);
    g.position.set(ax, RAFT.y, az);
    BP.add(g);
    RAFT.g = g;
    RAFT.W = windable({
      x: ax,
      y: 0,
      z: az,
      r: 1.8,
      dy: 4,
      range: 13,
      gust: (dx, dz, k) => {
        if (phase !== 0) return notify(L("Balsa izotzean harrapatuta dago. ALDATU: esnatu ura!"), "", 2.6);
        const ux = (RAFT.bx - RAFT.ax) / RAFT.L,
          uz = (RAFT.bz - RAFT.az) / RAFT.L,
          dot = dx * ux + dz * uz;
        RAFT.v = clamp(RAFT.v + dot * (4.2 + 2.6 * k), -7, 7);
        RAFT.billow = 1;
        SND.whoosh();
      },
    });
  }
  function raftUpdate(dt) {
    const p = RAFT.p;
    if (!p) return;
    p.dx = p.dz = 0;
    RAFT.billow = Math.max(0, RAFT.billow - dt * 0.8);
    /* oihala puzten da haizearekin */
    const a = RAFT.sail.geometry.attributes.position,
      b0 = RAFT.sail0;
    for (let i = 0; i < a.count; i++) {
      const x = b0[i * 3];
      a.setZ(i, b0[i * 3 + 2] - (1 - (x / 1.2) ** 2) * (0.15 + RAFT.billow * 0.55) * Math.sign(RAFT.v || 1));
    }
    a.needsUpdate = true;
    if (phase !== 0) {
      RAFT.v = 0;
      RAFT.g.position.y = RAFT.y - 0.12;
      return;
    }
    RAFT.v *= Math.exp(-dt * 0.42);
    let t = RAFT.t + (RAFT.v * dt) / RAFT.L;
    if (t <= 0 || t >= 1) {
      if (Math.abs(RAFT.v) > 1.5) {
        SND.thud();
        shake(0.12);
      }
      t = clamp(t, 0, 1);
      RAFT.v = 0;
    }
    const nx = mix(RAFT.ax, RAFT.bx, t),
      nz = mix(RAFT.az, RAFT.bz, t);
    p.dx = nx - p.x;
    p.dz = nz - p.z;
    p.x = nx;
    p.z = nz;
    RAFT.t = t;
    RAFT.W.x = nx;
    RAFT.W.z = nz;
    RAFT.g.position.set(nx, RAFT.y + Math.sin(time * 1.7) * 0.05, nz);
    RAFT.g.rotation.z = Math.sin(time * 1.3) * 0.025;
  }

  /* ------------------------------ LAMIEN LEIZEA ------------------------------ */
  function buildLamia() {
    dungeonBegin(DGL);
    const E = (x) => LX + x;
    /* ---- L1: Lamien ataria ---- */
    room("L1", E(0), 0, 24, 24, { area: "lA", name: "LAMIEN ATARIA", desc: "Ubideak ura darama… edo izotza. Hemen, urak zure sorginkeriari erantzuten dio (ALDATU).", doors: { n: 0, s: 0 }, floors: [[E(0), 7.5, 24, 9], [E(0), -7.5, 24, 9]] });
    pool(E(0), 0, 24, 6);
    slab({ x: E(0), z: 15, y: 0, w: 6, d: 6, h: 1.2, mat: "dark" });
    wallBlock(E(-3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(0), 18.2, 6, 0.8, 0, 0, 7);
    const arch = obj(new T.PlaneGeometry(5, 5.6), new T.MeshBasicMaterial({ color: "#cff4ff", transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    arch.position.set(E(0), 2.8, 17.6);
    DGL.exitGlow = arch;
    lamiaStatue(E(-8.5), -8.5, 0.5, 0.9);
    lamiaStatue(E(8.5), -8.5, -0.5, 0.9);
    for (const [cx, cz, cs] of [[E(-10), 9.5, 1.2], [E(10.4), 8, 0.9], [E(-10.5), -10.5, 1], [E(10.6), -10.4, 1.3]]) crystal(cx, 0, cz, cs);
    for (const [lx, lz] of [[E(-7), 0.5], [E(4), -1.2], [E(9), 1.4]]) model("waterlily_B", lx, WATER_Y + 0.03, lz, 0.12, lx);
    /* ---- L1→L2 ---- */
    corridor(E(0), -18, 6, 12, "z");
    /* ---- L2: Errotaren gela ---- */
    room("L2", E(0), -39, 36, 30, { area: "lB", name: "ERROTAREN GELA", desc: "Gurpilak ur biziarekin biratzen du. Izotzarekin, geldirik.", doors: { s: 0, w: -6, n: 0, e: -6 }, floors: [[E(0), -28.5, 36, 9], [E(0), -46.5, 36, 15]] });
    pool(E(0), -36, 36, 6);
    DGL.wheel = waterWheel(E(-11), 0.9, -36);
    solids.push({ x: E(-11), z: -36, r: 1.4, h: 4, y: -1, pillar: true });
    /* mendebaldeko barrak: gurpilak altxatzen ditu (iraganean bakarrik) */
    DOORDEF.lBw = door("lB-w", E(-18), -45, PI / 2, 0, "bars");
    DOORDEF.lBw.era = true;
    DOORDEF.lBn = door("lB-n", E(0), -54, 0, 0, "key");
    DOORDEF.lBe = door("lB-e", E(18), -45, PI / 2, 0, "bars");
    /* ekialdeko atea: bi haize-errota batera biraka */
    const fanCheck = () => {
      if (DOORDEF.lBe.open || !DGL.fans.every((f) => f.spin > 0.15)) return;
      openDoor(DOORDEF.lBe);
      title("HAIZEAK ATEA IREKI DU", "");
      SND.stinger(true);
    };
    DGL.fans = [fan(E(17.15), 4.2, -49.8, -PI / 2, { onSpin: fanCheck, range: 16 }), fan(E(17.15), 4.2, -40.2, -PI / 2, { onSpin: fanCheck, range: 16 })];
    oreNode(ORE_DEFS.find((d) => d.id === "lamia"), E(14), 0, -51.5);
    lamiaStatue(E(-14.5), -51, 0.6, 0.8);
    for (const [cx, cz, cs] of [[E(-16), -26.5, 1.1], [E(15.8), -26, 0.9], [E(8), -52.5, 1.2]]) crystal(cx, 0, cz, cs);
    for (const [bx, bz] of [[E(-15.5), -29], [E(14.5), -31]]) breakable("barrel", bx, 0, bz);
    /* ---- L2→L3 ---- */
    corridor(E(-21), -45, 6, 6, "x");
    /* ---- L3: Lamien korua (borroka) ---- */
    room("L3", E(-36), -45, 24, 24, {
      area: "lC",
      name: "LAMIEN KORUA",
      desc: "",
      doors: { e: 0 },
      waves: [[["eye", 0, 2]], [["grunt", 1, 2], ["eye", 1, 1]], [["brute", 0, 1], ["eye", -1, 2]]],
      diff: 1.1,
      hpK: 1.25,
      fightText: "Lamien itzalak! Urreak ur biziarekin zauritzen dira; urdinak, izotzarekin.",
      onWin: () => {
        revealChest(DGL.keyChest);
        notify(L("Kutxa bat agertu da korutik."), "", 3);
      },
    });
    DGL.keyChest = chest("lC-key", E(-36), 0, -54.5, 0, { t: "key" }, { hidden: !isCleared("L3") });
    for (const [cx, cz] of [[E(-46), -36], [E(-26), -36], [E(-46), -54]]) crystal(cx, 0, cz, 1);
    for (const [px, pz] of [[E(-42), -39], [E(-30), -39], [E(-42), -51], [E(-30), -51]]) {
      bprop("column", px, 0, pz, DS * 1.3, 0);
      solids.push({ x: px, z: pz, r: 0.8, h: 3, y: 0, pillar: true });
    }
    /* ---- L2→L5 ---- */
    corridor(E(0), -58.5, 6, 9, "z");
    /* ---- L5: Herensugearen putzua ---- */
    room("L5", E(0), -78, 30, 30, {
      area: "lD",
      name: "HERENSUGEAREN PUTZUA",
      desc: "Putzuaren hondoan zerbait mugitzen da…",
      doors: { s: 0, n: 0 },
      floors: [[E(0), -67.5, 30, 9], [E(0), -88.5, 30, 9], [E(-10.5), -78, 9, 12], [E(10.5), -78, 9, 12]],
    });
    DGL.serpPool = pool(E(0), -78, 12, 12);
    DOORDEF.lDn = door("lD-n", E(0), -93, 0, 0, "boss");
    DGL.hornChest = chest("lD-adarra", E(0), 0, -67.5, PI, { t: "item", id: "adarra" }, { hidden: !isCleared("lD-boss") });
    for (const [cx, cz] of [[E(-13), -65.5], [E(13), -65.5], [E(-13), -90.5], [E(13), -90.5]]) crystal(cx, 0, cz, 1.2);
    serpentBuild();
    /* ---- L2→L6 ---- */
    corridor(E(21), -45, 6, 6, "x");
    /* ---- L6: Balsen aintzira ---- */
    room("L6", E(39), -45, 30, 30, { area: "lE", name: "BALSEN AINTZIRA", desc: "Ur-jauzi baten atzean zerbait dir-dir…", doors: { w: 0 }, floors: [[E(27), -45, 6, 30], [E(51.5), -45, 5, 12]] });
    pool(E(42), -45, 24, 30);
    raftBuild(E(31.7), -45, E(47.3), -45);
    DGL.curtain = curtain(E(49.1), -51, -39, WATER_Y, 7);
    wallBlock(E(51.6), -51.35, 5.2, 0.7, 0, -1.6, 9, true);
    wallBlock(E(51.6), -38.65, 5.2, 0.7, 0, -1.6, 9, true);
    chest("lE-bigkey", E(52.3), 0, -45, -PI / 2, { t: "bigkey" });
    /* uhartetxoa lainoaren azpian: kutxa ezkutua (lainoa uxatzean agertzen da) */
    platforms.push({ x: E(40), z: -38.8, y: 0, bottom: -3, rx: 2, rz: 2, phase: -1, safe: true });
    const isle = obj(new T.CylinderGeometry(2.05, 2.4, 3, 12), rockMaterial());
    isle.position.set(E(40), -1.5, -38.8);
    DGL.isleChest = chest("lE-piece", E(40), 0, -38.6, PI, { t: "piece", id: "lamia" }, { hidden: true });
    mist(E(40), 0, -38, 6.5, {
      n: 18,
      op: 0.6,
      back: 12,
      range: 17,
      onClear: () => {
        if (!DGL.isleChest.m.visible) revealChest(DGL.isleChest);
      },
    });
    for (const [cx, cz, cs] of [[E(26), -32.5, 1], [E(26), -57.5, 1.2], [E(53), -40, 0.8], [E(53), -50, 0.8]]) crystal(cx, 0, cz, cs);
    for (const [lx, lz] of [[E(36), -54], [E(44), -33], [E(45), -56], [E(34), -36]]) model("waterlily_B", lx, WATER_Y + 0.03, lz, 0.12, lx);
    /* ---- L5→L7 ---- */
    corridor(E(0), -96, 6, 6, "z");
    /* ---- L7: Lamia Ilunaren putzua ---- */
    room("L7", E(0), -117, 36, 36, {
      area: "lF",
      name: "LAMIA ILUNAREN PUTZUA",
      desc: "",
      doors: { s: 0 },
      floors: [[E(0), -102, 36, 6], [E(0), -132, 36, 6], [E(-15), -117, 6, 24], [E(15), -117, 6, 24]],
    });
    DGL.bossPool = pool(E(0), -117, 24, 24);
    platforms.push({ x: E(0), z: -117, y: 0.2, bottom: -3, rx: 3.2, rz: 3.2, phase: -1, safe: false });
    const rock = obj(new T.CylinderGeometry(3.25, 3.9, 3.4, 14), rockMaterial());
    rock.position.set(E(0), -1.5, -117);
    for (const [cx, cz] of [[E(-15), -102], [E(15), -102], [E(-15), -132], [E(15), -132]]) crystal(cx, 0, cz, 1.4, "#9ff7ff");
    DGL.bossRoom = DGL.rooms.L7;
    lamiaBuild();
    dungeonEnd(DGL);
  }
  /* leize honetako eguneraketa (dungeonUpdate-tik) */
  DGL.update = (dt) => {
    watersUpdate(dt);
    raftUpdate(dt);
    /* errota: iraganean biraka; mendebaldeko barrak harekin */
    if (DGL.wheel) DGL.wheel.rotation.z += dt * 1.3 * (1 - phaseBlend);
    if (DOORDEF.lBw) DOORDEF.lBw.open = phase === 0;
    /* uretara erori (iraganean): korronteak eraman */
    if (phase === 0 && !respawnTimer)
      for (const W of DGL.pools)
        if (inPool(W, P.x, P.z) && P.y < W.y - 0.45) {
          fxBurst(P.x, W.y + 0.2, P.z, { n: 24, speed: 3, up: 3, life: 0.6, size: 0.3, color: "#d8f2ff", grav: 8 });
          SND.splash();
          fall();
          break;
        }
    /* lehen aldiz ataria iraganean: abisua */
    if (ROOM.cur === DGL.rooms.L1 && phase === 0 && P.z > 3) notifyOnce("lamia-water", L("Ura bizirik dago. ALDATU berriro, eta izoztu egingo da…"), "");
  };

  /* ============================ HERENSUGE GAZTEA (L5) ============================ */
  const SERP = { g: null, segs: [], head: null, gem: null, collar: null, ripple: null, state: "sleep", t: 0, hp: 6, rounds: 3, ex: 0, ez: 0, dx: 0, dz: 1, rise: 0, low: 0, n: 0, adds: 0, hint: 0, ref: { x: 0, z: 0, state: "alive" } };
  const SERP_HP = 6;
  function serpentBuild() {
    const g = new T.Group(),
      skin = new T.MeshStandardMaterial({ color: "#1d6a70", roughness: 0.4, metalness: 0.15, emissive: new T.Color("#04191c"), emissiveIntensity: 0.5, flatShading: true }),
      fin = material("#9fe6d6", 0.35);
    BP.add(g);
    for (let i = 0; i < 9; i++) {
      const m = new T.Mesh(new T.IcosahedronGeometry(1.35 - i * 0.06, 1), skin);
      m.castShadow = true;
      if (i % 2 === 0) {
        const f = new T.Mesh(new T.ConeGeometry(0.3, 1.1, 4), fin);
        f.position.y = 1.35 - i * 0.06;
        m.add(f);
      }
      g.add(m);
      SERP.segs.push(m);
    }
    const head = new T.Group(),
      skull = new T.Mesh(new T.BoxGeometry(1.25, 0.95, 2), skin),
      jaw = new T.Mesh(new T.BoxGeometry(1.05, 0.3, 1.6), material("#b9d6c4"));
    skull.position.z = 0.5;
    jaw.position.set(0, -0.55, 0.6);
    head.add(skull, jaw);
    for (const s of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.17, 8, 6), new T.MeshBasicMaterial({ color: "#ffe066" }));
      eye.position.set(s * 0.5, 0.25, 0.95);
      const horn = new T.Mesh(new T.ConeGeometry(0.16, 0.9, 6), material("#d9e6e0"));
      horn.position.set(s * 0.38, 0.75, -0.1);
      horn.rotation.x = -0.6;
      head.add(eye, horn);
    }
    const gem = new T.Mesh(new T.OctahedronGeometry(0.32, 0), material("#7fe9ff", 1.4));
    gem.position.set(0, 0.6, 0.55);
    head.add(gem);
    head.traverse((n) => n.isMesh && (n.castShadow = true));
    head.scale.setScalar(1.55);
    g.add(head);
    SERP.head = head;
    SERP.gem = gem;
    SERP.jaw = jaw;
    const collar = new T.Mesh(new T.TorusGeometry(1.25, 0.45, 6, 16), new T.MeshStandardMaterial({ color: "#dff6ff", roughness: 0.2, transparent: true, opacity: 0.85, flatShading: true }));
    collar.rotation.x = -PI / 2;
    collar.visible = false;
    g.add(collar);
    SERP.collar = collar;
    const ripple = new T.Mesh(new T.RingGeometry(0.8, 1.3, 32), new T.MeshBasicMaterial({ color: "#e6fbff", transparent: true, opacity: 0, depthWrite: false }));
    ripple.rotation.x = -PI / 2;
    BP.add(ripple);
    SERP.ripple = ripple;
    SERP.g = g;
    g.visible = false;
    SERP.state = isCleared("lD-boss") ? "dead" : "sleep";
  }
  /* buruaren eta lepoaren jarrera: oinarria uretan, burua kurban gora (edo izotzean etzanda) */
  const SV = new T.Vector3(),
    SV2 = new T.Vector3();
  function serpentPose() {
    const W = DGL.serpPool,
      up = SERP.rise,
      low = SERP.low,
      bx = SERP.ex - SERP.dx * 1.2,
      bz = SERP.ez - SERP.dz * 1.2,
      by = W.y - 2.6;
    /* burua: altxatuta (5 m) edo izotzean etzanda ertzaren ondoan */
    const hx = mix(SERP.ex + SERP.dx * 1.4 * up, SERP.ex + SERP.dx * 2.8, low),
      hz = mix(SERP.ez + SERP.dz * 1.4 * up, SERP.ez + SERP.dz * 2.8, low),
      hy = mix(W.y - 1.2 + 7.4 * up, 1.6, low),
      cx = mix(bx, SERP.ex, 0.6),
      cz = mix(bz, SERP.ez, 0.6),
      cy = mix(hy + 1.2, 2.6, low);
    const n = SERP.segs.length;
    for (let i = 0; i < n; i++) {
      const t = i / n,
        a = (1 - t) * (1 - t),
        b = 2 * (1 - t) * t,
        c = t * t;
      SERP.segs[i].position.set(a * bx + b * cx + c * hx, a * by + b * cy + c * hy, a * bz + b * cz + c * hz);
    }
    SERP.head.position.set(hx, hy, hz);
    /* begirada: Amaiurrengana (etzanda: aurrera) */
    const look = low > 0.5 ? SV.set(hx + SERP.dx * 3, hy - 0.4, hz + SERP.dz * 3) : SV.set(P.x, P.y + 1.2, P.z);
    SERP.head.lookAt(look);
    SERP.jaw.rotation.x = SERP.state === "spit" ? 0.25 + Math.max(0, Math.sin(SERP.t * 9)) * 0.35 : 0.1;
    SERP.collar.position.set(SERP.ex, W.y + 0.1, SERP.ez);
    SERP.ref.x = hx;
    SERP.ref.z = hz;
    SERP.hy = hy;
    BOSS.lockable.x = hx;
    BOSS.lockable.z = hz;
    BOSS.lockable.y = hy - 1;
  }
  /* azaleratzeko puntua: putzuaren ertzean, Amaiurrengandik hurbilen */
  function serpentPick() {
    const W = DGL.serpPool,
      hw = W.w / 2 - 1.3,
      px = clamp(P.x, W.x - hw, W.x + hw),
      pz = clamp(P.z, W.z - hw, W.z + hw);
    let ex = px,
      ez = pz;
    /* Amaiur barruan badago (izotzean), ertz batera */
    if (Math.abs(px - P.x) < 0.01 && Math.abs(pz - P.z) < 0.01) {
      ex = W.x + (Math.random() - 0.5) * hw * 2;
      ez = W.z + hw * (Math.random() < 0.5 ? -1 : 1);
    }
    const dx = P.x - ex,
      dz = P.z - ez,
      d = Math.hypot(dx, dz) || 1;
    Object.assign(SERP, { ex, ez, dx: dx / d, dz: dz / d });
  }
  function serpentStart() {
    const R = DGL.rooms.L5;
    if (SERP.state !== "sleep" || ROOM.fight) return;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    Object.assign(SERP, { state: "under", t: 0, hp: SERP_HP, rounds: 3, rise: 0, low: 0, adds: 0 });
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "herensugea";
    BOSS.weakR = 1.3;
    MINI.other = true;
    SERP.g.visible = true;
    serpentPick();
    SND.stinger(false);
    shake(0.4);
    title("HERENSUGE GAZTEA", "");
    notify(L("Azaleratzen denean, ALDATU: IZOTZA! Harrapatuta geratuko da!"), "", 5);
    bossBar("HERENSUGE GAZTEA", 1);
  }
  function serpentSpit() {
    const o = { x: SERP.head.position.x, y: SERP.hy - 0.2, z: SERP.head.position.z },
      dx = P.x - o.x,
      dz = P.z - o.z,
      d = Math.hypot(dx, dz) || 1;
    const m = new T.Mesh(egeo("wball", () => new T.IcosahedronGeometry(0.42, 1)), material("#8fe6ff", 0.8));
    m.position.set(o.x, o.y, o.z);
    scene.add(m);
    SHOTS.push({ m, x: o.x, z: o.z, y: o.y, vx: (dx / d) * 10, vz: (dz / d) * 10, sp: 10, t: 0, era: -1, from: SERP.ref });
    SND.drip();
    fxBurst(o.x, o.y, o.z, { n: 10, speed: 3, life: 0.4, size: 0.25, color: "#cdf4ff", grav: 6 });
  }
  function serpentFree(hard) {
    /* izotza apurtu: ezpalak eta uhina */
    SERP.collar.visible = false;
    fxBurst(SERP.ex, DGL.serpPool.y + 0.5, SERP.ez, { n: 40, speed: 7, up: 4, life: 0.8, size: 0.35, color: "#e6fbff", grav: 10 });
    SND.crumble();
    shake(0.3);
    if (hard && Math.hypot(P.x - SERP.ex, P.z - SERP.ez) < 4) playerHit(1, SERP.ex, SERP.ez);
    SERP.state = "dive";
    SERP.t = 0;
  }
  function serpentDefeat() {
    SERP.state = "die";
    SERP.t = 0;
    BOSS.dead = true;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    bossBar(null);
    SND.roar();
    slowmo = 0.8;
    shake(0.6);
  }
  function serpentUpdate(dt) {
    if (ZONE.cur !== "lamia" || !SERP.g) return;
    const R = DGL.rooms.L5,
      W = DGL.serpPool;
    if (SERP.state === "dead") return;
    if (SERP.state === "sleep") {
      if (ROOM.cur === R && P.grounded && !cinematic && !isCleared("lD-boss") && Math.abs(P.x - R.x) < R.w / 2 - 3 && Math.abs(P.z - R.z) < R.d / 2 - 3) serpentStart();
      return;
    }
    if (!BOSS.on && SERP.state !== "die") return;
    SERP.t += dt;
    SERP.gem.material.emissiveIntensity = SERP.state === "frozen" ? 2.4 + Math.sin(time * 10) * 0.6 : 1;
    const rip = SERP.ripple;
    rip.material.opacity = 0;
    switch (SERP.state) {
      case "under": {
        SERP.rise = Math.max(0, SERP.rise - dt * 3);
        SERP.low = Math.max(0, SERP.low - dt * 3);
        /* putzuaren azpian: uhin-eraztuna (iraganean) edo itzala izotzaren azpian */
        if (SERP.t < 0.05) serpentPick();
        rip.position.set(SERP.ex, W.y + 0.05, SERP.ez);
        rip.scale.setScalar(1 + (SERP.t % 0.8) * 1.5);
        rip.material.opacity = phase === 0 ? 0.6 * (1 - (SERP.t % 0.8) / 0.8) : 0.25;
        rip.material.color.set(phase === 0 ? "#e6fbff" : "#0b2a33");
        if (phase === 0 && SERP.t > 1.5) {
          SERP.state = "rise";
          SERP.t = 0;
          fxBurst(SERP.ex, W.y + 0.3, SERP.ez, { n: 30, speed: 4, up: 5, life: 0.8, size: 0.35, color: "#d8f2ff", grav: 9 });
          SND.splash();
        } else if (phase === 1) {
          /* izotzaren azpian zain: itzalek presioa egiten dute */
          SERP.hint += dt;
          if (SERP.hint > 1.5) notifyOnce("serp-ice", L("Herensugea izotzaren azpian dago. UR BIZIAREKIN azaleratzen da!"), "");
          if (SERP.t > 7 && enemiesAlive() < 2) {
            SERP.t = 0.06;
            spawnWave([["eye", 1, 1]], R);
          }
        }
        break;
      }
      case "rise":
        SERP.rise = Math.min(1, SERP.rise + dt * 1.6);
        if (SERP.rise >= 1) {
          SERP.state = "spit";
          SERP.t = 0;
          SERP.n = 0;
        }
        break;
      case "spit":
        if (SERP.n < 3 && SERP.t > 0.55 + SERP.n * 0.75) {
          SERP.n++;
          serpentSpit();
        }
        if (SERP.t > 3.1) {
          SERP.state = "dive";
          SERP.t = 0;
        }
        break;
      case "dazed":
        SERP.head.rotation.z = Math.sin(time * 12) * 0.25;
        if (SERP.t > 2.4) {
          SERP.state = "dive";
          SERP.t = 0;
        }
        break;
      case "dive":
        SERP.rise = Math.max(0, SERP.rise - dt * 2.2);
        SERP.low = Math.max(0, SERP.low - dt * 3);
        if (SERP.rise <= 0 && SERP.low <= 0) {
          SERP.state = "under";
          SERP.t = 0;
        }
        break;
      case "frozen":
        SERP.low = Math.min(1, SERP.low + dt * 2.4);
        SERP.collar.visible = true;
        if (phase === 0) serpentFree(false);
        else if (SERP.t > 6.5) serpentFree(true);
        break;
      case "die":
        SERP.low = Math.min(1, SERP.low + dt);
        SERP.g.position.y = -SERP.t * 1.4;
        if (SERP.t > 2.2) {
          SERP.state = "dead";
          SERP.g.visible = false;
          BOSS.on = false;
          MINI.other = false;
          ROOM.fight = null;
          if (!saved.cleared.includes("lD-boss")) saved.cleared.push("lD-boss");
          persist();
          SND.stinger(true);
          title("HERENSUGEA GARAITUTA", "");
          revealChest(DGL.hornChest);
          notify(L("Kutxa bat agertu da hegoaldeko pasabidean."), "", 4);
        }
        break;
    }
    /* izozte-tranpa: azaleratuta dagoela IZOTZA (barruko "oraina") */
    if (phase === 1 && (SERP.state === "rise" || SERP.state === "spit" || SERP.state === "dazed") && SERP.rise > 0.3) {
      SERP.state = "frozen";
      SERP.t = 0;
      SND.sizzle();
      fxRing(SERP.ex, W.y + 0.2, SERP.ez, "#dff6ff", 4, 0.6);
      title("IZOZTUTA!", "");
      notifyOnce("serp-frozen", L("Harrapatuta! Buruko harribitxia: SORGINKERIA!"), "");
    }
    /* itzulitako ur-bolak: zorabiatu */
    for (let i = SHOTS.length - 1; i >= 0; i--) {
      const s = SHOTS[i];
      if (!s.back || (SERP.state !== "spit" && SERP.state !== "rise")) continue;
      if (Math.hypot(s.x - SERP.ref.x, s.z - SERP.ref.z) < 1.8) {
        scene.remove(s.m);
        SHOTS.splice(i, 1);
        SERP.state = "dazed";
        SERP.t = 0;
        SND.clang();
        fxBurst(SERP.ref.x, SERP.hy, SERP.ref.z, { n: 20, speed: 4, life: 0.5, size: 0.3, color: "#ffffff", grav: 2 });
        notifyOnce("serp-dazed", L("Zorabiatuta! Orain: IZOTZA, harrapatzeko!"), "");
      }
    }
    serpentPose();
  }
  BOSSK.herensugea = {
    vulnerable: () => SERP.state === "frozen" && SERP.low > 0.7,
    weak: () => {
      SERP.gem.getWorldPosition(SV2);
      return { x: SV2.x, y: SV2.y, z: SV2.z };
    },
    center: () => ({ x: SERP.ex, y: 0, z: SERP.ez, h: 5, r: 2 }),
    hit: (n) => {
      if (!BOSS.vulnerable()) return;
      SERP.hp -= n;
      const w = BOSS.weak();
      FB.bossHit(w.x, w.y, w.z);
      damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.4 }, n);
      bossBar("HERENSUGE GAZTEA", (SERP.rounds - 1 + Math.max(0, SERP.hp) / SERP_HP) / 3);
      if (SERP.hp <= 0) {
        SERP.rounds--;
        SERP.hp = SERP_HP;
        if (SERP.rounds <= 0) return serpentDefeat();
        serpentFree(true);
        notify(SERP.rounds === 2 ? L("Izotza hautsi du! Berriro: azaleratu → IZOTZA.") : L("Azken aldia! Haserre dago."), "", 3);
      }
    },
  };

  /* ============================== LAMIA ILUNA (L7) ============================== */
  const LAM = { g: null, root: null, mixer: null, acts: {}, cur: "", x: 0, z: 0, y: 0.2, a: 0, state: "sleep", t: 0, hp: 6, rounds: 3, mist: null, cocoon: null, comb: null, fin: null, ripple: null, skirt: null, sx: 0, sz: 0, tx: 0, tz: 0, waves: [], seenIntro: false, atk: 0 };
  const LAM_HP = 6;
  function lamiaBuild() {
    const R = DGL.bossRoom,
      src = models.npc_rogue || models.npc_hooded;
    LAM.x = LAM.sx = R.x;
    LAM.z = LAM.sz = R.z;
    if (!src) return;
    const root = cloneSkinned(src.scene),
      SC = 3.1;
    root.scale.setScalar(SC);
    root.traverse((n) => {
      if (!n.isMesh) return;
      if (/Knife|Crossbow|Throwable/.test(n.name)) n.visible = false;
      const m = n.material.clone();
      m.skinning = !!n.isSkinnedMesh;
      m.color = new T.Color("#3d8792");
      m.emissive = new T.Color("#0f5866");
      m.emissiveIntensity = 0.55;
      n.material = m;
      n.castShadow = true;
      n.frustumCulled = false;
    });
    const g = new T.Group();
    g.add(root);
    BP.add(g);
    /* ur-gona (hankak ezkutatuta) eta urrezko orrazia buruan */
    const skirt = new T.Mesh(new T.ConeGeometry(1.55, 3, 16, 1, true), new T.MeshStandardMaterial({ color: "#2f97a8", transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.1, emissive: new T.Color("#0e4452"), side: T.DoubleSide }));
    skirt.position.y = 1.4;
    skirt.rotation.x = PI;
    skirt.scale.set(1, 1, 1);
    g.add(skirt);
    const comb = new T.Mesh(new T.TorusGeometry(0.5, 0.13, 6, 16, PI), material("#ffd36a", 1.3));
    const head = root.getObjectByName("head");
    if (head) {
      /* buruaren hezurra: orrazia goian, begi distiratsuak eta ile luze bustia bizkarrean */
      comb.scale.setScalar(1 / SC);
      comb.position.set(0, 0.62, -0.1);
      head.add(comb);
      for (const sx of [-1, 1]) {
        const eye = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), new T.MeshBasicMaterial({ color: "#bffcff" }));
        eye.position.set(sx * 0.12, 0.24, 0.3);
        head.add(eye);
      }
      const hairM = new T.MeshStandardMaterial({ color: "#163f47", roughness: 0.3, metalness: 0.2, emissive: new T.Color("#0a2e36"), emissiveIntensity: 0.5 });
      for (let i = 0; i < 7; i++) {
        const st = new T.Mesh(new T.ConeGeometry(0.07, 0.9 + (i % 3) * 0.18, 5), hairM);
        st.rotation.x = PI - 0.18;
        st.position.set(-0.24 + i * 0.08, -0.05 - (i % 3) * 0.05, -0.26);
        head.add(st);
      }
    } else {
      comb.position.set(0, 5.3, -0.2);
      g.add(comb);
    }
    const combGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffd36a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    combGlow.scale.setScalar(2.6);
    comb.add(combGlow);
    /* izotz-kuskua (orainean, uhartean): ukiezina */
    const cocoon = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: "#d6f4ff", transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2, flatShading: true, emissive: new T.Color("#3d8fb0"), emissiveIntensity: 0.25 }));
    cocoon.scale.set(2.4, 4.2, 2.4);
    cocoon.position.y = 3.3;
    cocoon.visible = false;
    g.add(cocoon);
    const light = new T.PointLight("#7fe9ff", 1.4, 18, 1.6);
    light.position.set(0, 6, 2);
    g.add(light);
    /* igeri: hegatsa eta uhina */
    const fin = new T.Mesh(new T.ConeGeometry(0.5, 1.6, 4), material("#2c6f7a", 0.3));
    fin.scale.set(0.4, 1, 1.4);
    fin.visible = false;
    BP.add(fin);
    const ripple = new T.Mesh(new T.RingGeometry(0.9, 1.6, 32), new T.MeshBasicMaterial({ color: "#e6fbff", transparent: true, opacity: 0, depthWrite: false }));
    ripple.rotation.x = -PI / 2;
    BP.add(ripple);
    const mixer = new T.AnimationMixer(root),
      acts = {};
    for (const c of models.mage.animations) acts[c.name] = mixer.clipAction(c);
    Object.assign(LAM, { g, root, mixer, acts, skirt, comb, combGlow, cocoon, light, fin, ripple });
    g.position.set(LAM.x, LAM.y, LAM.z);
    /* lainoa uhartearen inguruan: ADARRAk uxatzen du (iraganean, kantatzen ari denean) */
    LAM.mist = mist(R.x, 0, R.z, 4.2, {
      n: 20,
      op: 0.7,
      h: 4.5,
      back: 30,
      range: 20,
      col: "#d7f3f6",
      live: () => BOSS.on && BOSS.kind === "lamia" && LAM.state === "song" && phase === 0,
      onClear: () => lamExpose(),
    });
    lamAnim("Idle");
    if (saved.flags.includes("lamia")) lamFreed(true);
  }
  function lamAnim(name, once, ts = 1) {
    const a = LAM.acts[name];
    if (!a || (LAM.cur === name && !once)) return;
    const old = LAM.acts[LAM.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.timeScale = ts;
    a.fadeIn(0.2).play();
    if (old && old !== a) old.fadeOut(0.2);
    LAM.cur = name;
  }
  function lamiaStart() {
    if (BOSS.on || saved.flags.includes("lamia") || !LAM.g) return;
    const R = DGL.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "lamia";
    BOSS.weakR = 1.4;
    Object.assign(LAM, { state: "intro", t: 0, hp: LAM_HP, rounds: 3, x: R.x, z: R.z, atk: 0 });
    const fight = () => {
      LAM.state = phase === 0 ? "song" : "cocoon";
      LAM.t = 0;
      title("LAMIA ILUNA", "");
      SND.sing(1.2);
      bossBar("LAMIA ILUNA", 1);
      notify(L("Lainoak babesten du. HAIZE-ADARRA (V)… eta urari erne: izotzak dena geldiarazten du."), "", 6);
    };
    if (LAM.seenIntro) return fight();
    LAM.seenIntro = true;
    say(
      [
        ["LAMIA ILUNA", "Nork dakar sorgin-usaina nire putzura? Hau ez da zure ibaia, txikia.", "", R.x, R.z, 3],
        ["AMAIUR", "Orrazi hori ez da zurea. Andereren orrazia da!", "", P.x, P.z, 0],
        ["LAMIA ILUNA", "Itzalak eman zidan… eta itzalak eramango zaitu. Entzun nire kantua, eta lo egin betiko.", "", R.x, R.z, 3],
      ],
      fight,
    );
  }
  /* lainoa uxatuta: agerian, gero uretara salto (igeri Amaiurrengana) */
  function lamExpose() {
    if (LAM.state !== "song") return;
    LAM.state = "exposed";
    LAM.t = 0;
    SND.roar();
    lamAnim("Hit_A", true, 0.8);
    notifyOnce("lam-exposed", L("Lainorik gabe! Uretara salto egingo du… igerian dagoela, IZOTZA!"), "");
  }
  function lamWave() {
    const m = new T.Mesh(new T.TorusGeometry(1, 0.12, 6, 64), new T.MeshBasicMaterial({ color: "#cdf4ff", transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -PI / 2;
    ZONES.lamia.group.add(m);
    LAM.waves.push({ x: DGL.bossRoom.x, z: DGL.bossRoom.z, r: 3.4, sp: 8 + (3 - LAM.rounds) * 1.5, m });
    SND.splash();
  }
  function lamSpear(i) {
    const o = { x: LAM.x, y: 3.2, z: LAM.z },
      a = Math.atan2(P.x - o.x, P.z - o.z) + (i - 1) * 0.25,
      m = new T.Mesh(egeo("wspear", () => new T.ConeGeometry(0.22, 1.1, 6)), material("#9ff2ff", 1));
    m.rotation.x = PI / 2;
    m.position.set(o.x, o.y, o.z);
    scene.add(m);
    SHOTS.push({ m, x: o.x, z: o.z, y: o.y, vx: Math.sin(a) * 11, vz: Math.cos(a) * 11, sp: 11, t: 0, era: 2, from: LAM });
    SND.shot();
  }
  /* uretik ateratzean: izotza apurtu eta itzuli uhartera */
  function lamBurst(hard) {
    fxBurst(LAM.x, 0.4, LAM.z, { n: 46, speed: 8, up: 4, life: 0.9, size: 0.38, color: "#e6fbff", grav: 10 });
    SND.crumble();
    shake(0.4);
    if (hard && Math.hypot(P.x - LAM.x, P.z - LAM.z) < 4.2) playerHit(1, LAM.x, LAM.z);
    LAM.state = "return";
    LAM.t = 0;
    LAM.g.visible = false;
  }
  function lamiaUpdateBoss(dt) {
    if (ZONE.cur !== "lamia" || !LAM.g) return;
    LAM.mixer.update(dt);
    const R = DGL.bossRoom;
    if (LAM.state === "freed") {
      LAM.g.rotation.y += Math.atan2(Math.sin(Math.atan2(P.x - LAM.x, P.z - LAM.z) - LAM.g.rotation.y), Math.cos(Math.atan2(P.x - LAM.x, P.z - LAM.z) - LAM.g.rotation.y)) * Math.min(1, dt * 2);
      return;
    }
    if (LAM.state === "sleep") {
      LAM.g.rotation.y = Math.atan2(P.x - LAM.x, P.z - LAM.z);
      if (ROOM.cur === R && P.grounded && !cinematic && Math.abs(P.z - R.z) < R.d / 2 - 4) lamiaStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    LAM.t += dt;
    const rage = 3 - LAM.rounds;
    LAM.fin.visible = false;
    LAM.ripple.material.opacity = 0;
    LAM.combGlow.material.opacity = 0;
    LAM.cocoon.visible = false;
    switch (LAM.state) {
      case "song": {
        LAM.g.visible = true;
        LAM.g.position.set(R.x, 0.2, R.z);
        LAM.x = R.x;
        LAM.z = R.z;
        LAM.g.rotation.y = Math.atan2(P.x - R.x, P.z - R.z);
        lamAnim("Spellcasting");
        if (phase === 1) {
          LAM.state = "cocoon";
          LAM.t = 0;
          break;
        }
        LAM.atk -= dt;
        if (LAM.atk <= 0) {
          LAM.atk = 3.2 - rage * 0.5;
          LAM.n = (LAM.n || 0) + 1;
          if (LAM.n % 2) {
            lamWave();
            if (rage >= 1) setTimeout(() => LAM.state === "song" && lamWave(), 700);
          } else for (let i = 0; i < 3; i++) setTimeout(() => LAM.state === "song" && lamSpear(i), i * 220);
          if (LAM.n % 3 === 0) SND.sing(0.8);
        }
        break;
      }
      case "cocoon": {
        /* orainean: izotz-kuskuan, ukiezina; itzalak bidaltzen ditu */
        LAM.cocoon.visible = true;
        lamAnim("Idle");
        notifyOnce("lam-cocoon", L("Izotzak babesten du. UR BIZIAREKIN, lainoa uxatu adarraz."), "");
        if (phase === 0) {
          LAM.state = "song";
          LAM.t = 0;
          fxBurst(R.x, 2.6, R.z, { n: 30, speed: 5, up: 3, life: 0.7, size: 0.3, color: "#e6fbff", grav: 8 });
          SND.crumble();
        } else if (LAM.t > 7 && enemiesAlive() < 2) {
          LAM.t = 0;
          spawnWave([["eye", 1, 1], ...(rage >= 1 ? [["grunt", 1, 1]] : [])], R);
        }
        break;
      }
      case "exposed": {
        LAM.g.rotation.y = Math.atan2(P.x - R.x, P.z - R.z);
        if (phase === 1) {
          /* uhartean zegoela izoztu: kuskua (ez du balio) */
          LAM.state = "cocoon";
          LAM.t = 0;
          notify(L("Goizegi! Igerian dagoela izoztu behar da."), "", 2.6);
          break;
        }
        if (LAM.t > 1.1) {
          LAM.state = "swim";
          LAM.t = 0;
          LAM.g.visible = false;
          fxBurst(R.x, 0.4, R.z, { n: 34, speed: 4, up: 5, life: 0.8, size: 0.35, color: "#d8f2ff", grav: 9 });
          SND.splash();
          /* helburua: Amaiurrengandik hurbilen dagoen ur-ertza */
          const W = DGL.bossPool,
            hw = W.w / 2 - 1.4;
          LAM.tx = clamp(P.x, W.x - hw, W.x + hw);
          LAM.tz = clamp(P.z, W.z - hw, W.z + hw);
          LAM.x = R.x;
          LAM.z = R.z;
        }
        break;
      }
      case "swim": {
        /* hegatsa urean, Amaiurrengana */
        const dx = LAM.tx - LAM.x,
          dz = LAM.tz - LAM.z,
          d = Math.hypot(dx, dz),
          sp = 4.4 + rage * 0.8;
        if (d > 0.2) {
          LAM.x += (dx / d) * Math.min(d, sp * dt);
          LAM.z += (dz / d) * Math.min(d, sp * dt);
        }
        LAM.fin.visible = true;
        LAM.fin.position.set(LAM.x, WATER_Y + 0.55, LAM.z);
        LAM.fin.rotation.y = Math.atan2(dx, dz);
        LAM.ripple.position.set(LAM.x, WATER_Y + 0.04, LAM.z);
        LAM.ripple.scale.setScalar(1 + (LAM.t % 0.6) * 1.2);
        LAM.ripple.material.opacity = 0.55 * (1 - (LAM.t % 0.6) / 0.6);
        if (phase === 1) {
          /* izoztuta! */
          LAM.state = "trapped";
          LAM.t = 0;
          LAM.g.visible = true;
          LAM.g.position.set(LAM.x, WATER_Y - 1.3, LAM.z);
          lamAnim("Hit_A", true, 0.5);
          SND.sizzle();
          fxRing(LAM.x, WATER_Y + 0.2, LAM.z, "#dff6ff", 4.5, 0.6);
          title("IZOZTUTA!", "");
          notifyOnce("lam-trapped", L("Harrapatuta! Urrezko orrazia: SORGINKERIA!"), "");
        } else if (d < 0.3) {
          LAM.state = "lunge";
          LAM.t = 0;
          LAM.g.visible = true;
          SND.roar();
        }
        break;
      }
      case "lunge": {
        /* uretik salto: hurbil badago, kolpea */
        const k = Math.min(1, LAM.t / 0.5);
        LAM.g.position.set(LAM.x, WATER_Y - 1.3 + Math.sin(k * PI) * 3.2, LAM.z);
        LAM.g.rotation.y = Math.atan2(P.x - LAM.x, P.z - LAM.z);
        if (LAM.t > 0.3 && !LAM.hitDone && Math.hypot(P.x - LAM.x, P.z - LAM.z) < 3.2 && P.y < 2) {
          LAM.hitDone = true;
          playerHit(2, LAM.x, LAM.z);
        }
        if (LAM.t > 0.9) {
          LAM.hitDone = false;
          LAM.state = "return";
          LAM.t = 0;
          LAM.g.visible = false;
          SND.splash();
        }
        break;
      }
      case "trapped": {
        LAM.g.position.set(LAM.x, WATER_Y - 1.3, LAM.z);
        LAM.g.rotation.y = Math.atan2(P.x - LAM.x, P.z - LAM.z);
        LAM.combGlow.material.opacity = 0.7 + Math.sin(time * 9) * 0.3;
        if (phase === 0) lamBurst(false);
        else if (LAM.t > 6.5) lamBurst(true);
        break;
      }
      case "return": {
        /* uhartera itzuli (igeri edo izotzaren azpitik) */
        const dx = R.x - LAM.x,
          dz = R.z - LAM.z,
          d = Math.hypot(dx, dz);
        if (phase === 0) {
          LAM.fin.visible = true;
          LAM.fin.position.set(LAM.x, WATER_Y + 0.55, LAM.z);
          LAM.fin.rotation.y = Math.atan2(dx, dz);
        }
        LAM.x += (dx / (d || 1)) * Math.min(d, 7 * dt);
        LAM.z += (dz / (d || 1)) * Math.min(d, 7 * dt);
        if (d < 0.3) {
          LAM.state = phase === 0 ? "song" : "cocoon";
          LAM.t = 0;
          LAM.atk = 1.5;
          LAM.g.visible = true;
          LAM.mist.clearT = 0;
          SND.sing(0.9);
        }
        break;
      }
      case "die": {
        LAM.g.position.y = mix(LAM.g.position.y, 0.2, 1 - Math.exp(-dt * 2));
        break;
      }
    }
    /* uhinak */
    for (let i = LAM.waves.length - 1; i >= 0; i--) {
      const Wv = LAM.waves[i];
      Wv.r += Wv.sp * dt;
      Wv.m.scale.setScalar(Wv.r);
      Wv.m.position.set(Wv.x, 0.12, Wv.z);
      Wv.m.material.opacity = clamp(1 - Wv.r / 22, 0, 0.9);
      const pd = Math.hypot(P.x - Wv.x, P.z - Wv.z);
      if (Math.abs(pd - Wv.r) < 0.7 && P.y < 0.9 && P.dashT <= 0) playerHit(1, Wv.x, Wv.z);
      if (Wv.r > 22) {
        Wv.m.parent && Wv.m.parent.remove(Wv.m);
        LAM.waves.splice(i, 1);
      }
    }
    BOSS.lockable.x = LAM.x;
    BOSS.lockable.z = LAM.z;
    BOSS.lockable.y = LAM.state === "trapped" ? -1 : 0;
  }
  BOSSK.lamia = {
    vulnerable: () => LAM.state === "trapped" && LAM.t > 0.4,
    weak: () => {
      LAM.comb.getWorldPosition(SV2);
      return { x: SV2.x, y: SV2.y, z: SV2.z };
    },
    center: () => ({ x: LAM.x, y: 0, z: LAM.z, h: 5, r: 2 }),
    hit: (n) => {
      if (!BOSS.vulnerable()) return;
      LAM.hp -= n;
      const w = BOSS.weak();
      FB.bossHit(w.x, w.y, w.z);
      damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.4 }, n);
      bossBar("LAMIA ILUNA", (LAM.rounds - 1 + Math.max(0, LAM.hp) / LAM_HP) / 3);
      if (LAM.hp <= 0) {
        LAM.rounds--;
        LAM.hp = LAM_HP;
        if (LAM.rounds <= 0) return lamDefeat();
        lamBurst(true);
        SND.roar();
        slowmo = 0.5;
        notify(LAM.rounds === 2 ? L("Orrazia pitzatu da! Berriro: lainoa, igeria, izotza.") : L("Azken aldia! Kantua gero eta indartsuagoa."), "", 3);
      }
    },
  };
  function lamDefeat() {
    BOSS.dead = true;
    LAM.state = "die";
    LAM.t = 0;
    for (const Wv of LAM.waves) Wv.m.parent && Wv.m.parent.remove(Wv.m);
    LAM.waves.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    const R = DGL.bossRoom;
    LAM.x = R.x;
    LAM.z = R.z;
    LAM.g.visible = true;
    LAM.g.position.set(R.x, -1.5, R.z);
    say(
      [
        ["· · ·", "Orrazitik itzal bat askatu da, lino beltz bat bezala, eta uretan urtu.", "", R.x, R.z, 2],
        ["LAMIA", "…Ur epela. Nire kantua berriro. Barkatu, sorgin: itzalak nire ahotsa zuen, ez nik.", "", R.x, R.z, 3],
        ["LAMIA", "Orrazi hau Andererena da. Gordetzeko eman zigun, Gauekori erlojua ixteko itun hura egin aurretik.", "", R.x, R.z, 3],
        ["AMAIUR", "Zer ixten du orrazi honek?", "", P.x, P.z, 0],
        ["LAMIA", "Mariren ilea. Mari haserre dagoenean, orrazia da bere ekaitza baretzen duen gauza bakarra. Eraman.", "", R.x, R.z, 3],
        ["LAMIA", "Eta adarra gorde: Artzainen lepoko errotak haize honen zain daude. Tartalo esnatu da…", "", R.x, R.z, 3],
      ],
      () => {
        lamFreed();
        saved.hearts = Math.max(saved.hearts, 2);
        if (!saved.items.includes("orrazia")) saved.items.push("orrazia");
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("lamia");
        persist();
        itemGet("orrazia", L("URREZKO ORRAZIA"), L("Andereren orrazia. Arnasa bat gehiago. Mariren ekaitza baretzen omen du…"), () => {
          title("LAMIA ASKE", "");
          notify(L("Irten leizetik hegoaldeko arkutik. Artzainen lepoan, haize-errota zain."), "", 6);
          hud();
        });
      },
    );
  }
  function lamFreed(instant) {
    BOSS.on = false;
    LAM.state = "freed";
    const R = DGL.bossRoom;
    LAM.x = R.x;
    LAM.z = R.z;
    LAM.g.visible = true;
    LAM.g.position.set(R.x, 0.2, R.z);
    LAM.cocoon.visible = false;
    LAM.combGlow.material.opacity = 0;
    LAM.comb.visible = false;
    LAM.root.traverse((n) => {
      if (n.isSkinnedMesh && n.material.emissive) {
        n.material.color.set("#d9eef0");
        n.material.emissive.set("#0b2a33");
      }
    });
    LAM.skirt.material.color.set("#7fd6e6");
    LAM.light.color.set("#bff6ff");
    lamAnim("Idle");
    if (!instant) fxRing(R.x, 0.3, R.z, "#9dffc4", 14, 1.4);
  }
  /* bossUpdate eta bossReset-etik */
  function lamiaUpdate(dt) {
    serpentUpdate(dt);
    lamiaUpdateBoss(dt);
  }
  function lamiaReset() {
    if (BOSS.on && BOSS.kind === "herensugea" && !BOSS.dead) {
      BOSS.on = false;
      MINI.other = false;
      Object.assign(SERP, { state: "sleep", t: 0, rise: 0, low: 0 });
      if (SERP.g) SERP.g.visible = false;
      if (SERP.collar) SERP.collar.visible = false;
      bossBar(null);
    }
    if (BOSS.on && BOSS.kind === "lamia" && !BOSS.dead) {
      BOSS.on = false;
      for (const Wv of LAM.waves) Wv.m.parent && Wv.m.parent.remove(Wv.m);
      LAM.waves.length = 0;
      const R = DGL.bossRoom;
      Object.assign(LAM, { state: "sleep", t: 0, x: R.x, z: R.z });
      if (LAM.g) {
        LAM.g.visible = true;
        LAM.g.position.set(R.x, 0.2, R.z);
        LAM.cocoon.visible = false;
        LAM.fin.visible = false;
      }
      bossBar(null);
    }
  }
  /* leizeko helburuak (HUD + markatzailea) */
  DGL.objective = () => {
    const R = DGL.rooms,
      f = (k) => saved.flags.includes(k);
    if (ROOM.cur === R.L1 && P.z > -3) return ["Ubidea: IZOTZAREKIN zeharkatzen da. Iparrera.", [R.L1.x, -6, 0]];
    if (!isCleared("L3") && (saved.keyz.lamia || 0) === 0 && !saved.doors.includes("lB-n"))
      return ROOM.cur === R.L2 && P.z > -36 ? ["Mendebaldeko barrak gurpilak altxatzen ditu (UR BIZIA). Ubidea, berriz, IZOTZAREKIN…", [R.L2.x - 12, -45, 0]] : ["Lamien korua, mendebaldean.", [R.L3.x, R.L3.z, 0]];
    if (!saved.doors.includes("lB-n")) return ["Errotaren gelako iparreko atea: giltza txikia.", [R.L2.x, -51, 0]];
    if (!isCleared("lD-boss")) return ["Herensugearen putzua. Azaleratzen denean: IZOTZA!", [R.L5.x, R.L5.z + 6, 0]];
    if (!saved.items.includes("adarra")) return ["Kutxa ireki: putzuaren hegoaldean.", [R.L5.x, -67.5, 0]];
    if (!saved.items.includes(DGL.bigKey)) return saved.doors.includes("lB-e") ? ["Aintzira: balsa UR BIZIAREKIN, adarraz bultzatu ur-jauziraino.", [R.L6.x - 6, -45, 0]] : ["Errotaren gelako ekialdeko atea: bi haize-errotari putz (ADARRA · V).", [R.L2.x + 12, -45, 0]];
    if (!f("lamia")) return saved.doors.includes("lD-n") ? ["Lamia Iluna. Lainoa uxatu, igerian dagoela izoztu.", [R.L7.x, R.L7.z + 12, 0]] : ["Herensugearen putzuko iparreko ate handia: giltza nagusia.", [R.L5.x, -90, 0]];
    return ["Irten leizetik hegoaldeko arkutik.", [DGL.exitArch.x, DGL.exitArch.z, 0]];
  };
