  /* ==================================================================
     JENTILBARATZA · laugarren leizea (diseinu propioa) — jentilen hiri lurperatua
     Kondairak dioenez, jentilek zeruan argi bitxi bat ikusi zutenean, harri handi
     baten azpian ezkutatu ziren. Harrespilako trikuharriaren azpian, haien hiria lo dago.
       J1 Jentilen ataria ...... SUTONDOA (atseden-lekua); ekialdean ertz garaia HEURAz
                                 (iraganean); iparrean atalasea; mendebaldean lasterbidea
       J2 Kanpaien aretoa ...... hiru kanpaia sarearen atzean: urrutitik jo, denak batera
                                 (bat ORAINEAN bakarrik ikusten da) → sarea zabaldu
       J3 Harresia ............. borroka (zezenen oldarrak: ALDARATU!) → GILTZA TXIKIA;
                                 mendebaldean harri arrakalatua (gero: jauzi atalasera)
       J4 Harri-zainaren gela .. etsai ertaina → TXIMISTARRIA
       J0 Atalasea ............. ate handia; ekialdetik jauzi (lasterbidea); mendebaldean
                                 arrakala → dorrea
       J6 Jentilen dorrea ...... zutabe garaia HEURAz igo; inguruan lau kanpaia (bat harri
                                 arrakalatu baten barruan, bat ORAINEAN) → GILTZA NAGUSIA
       J5 Biltegia ............. bigarren SUTONDOA; ekialdean, atarira lasterbidea
       J7 Errolanen aretoa ..... ERROLAN, jentil iluna (beherago)
     Leize bakoitzak bezala, lasterbideek eta arrakalek bideak lotzen dituzte: "metroidvania"
     estiloko itzulerak, tresna berri bakoitzarekin.
     ================================================================== */
  const JX = 1500;
  const DGJ = {
    id: "jentil",
    num: "04",
    entry: { x: JX, y: 0, z: 11.5, a: PI },
    exitArch: { x: JX, z: 15.2 },
    exitTo: () => ({ x: 43, y: 9, z: -66.2, a: 0, cp: true }),
    bigKey: "giltzanagusia-jentil",
    bigKeyText: "Errolanen aretora daraman ate handia irekitzen du.",
    bossDoor: "jD-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ffc27a", "#cfe3ff"],
    tint: "#cbbfa8",
    fog: [11, 64],
  };
  /* ------------------------------ eraikigaiak ------------------------------ */
  /* korridore garaia (y): zorua bloke trinkoa da, hormak y-tik gora */
  function hallway(x, z, w, d, axis, y = 0) {
    const fl = slab({ x, z, y, w, d, h: y + 1.2, mat: "dark", area: null });
    fl.m.position.y -= 0.12;
    /* behetik: horma-jauzirik ez */
    if (y > 0) fl.slick = true;
    if (axis === "z") {
      const n = Math.round(d / 6);
      for (let i = 0; i < n; i++) bprop("floor_dirt_large", x, y - 0.075, z - d / 2 + 3 + i * 6, DS, 0);
      for (const s of [-1, 1]) {
        sideBegin(x + (s * w) / 2, z - d / 2, x + (s * w) / 2, z + d / 2);
        for (let i = 0; i < n; i++) bprop("wall", x + (s * w) / 2, y, z - d / 2 + 3 + i * 6, DS, (s * -PI) / 2);
        sideEnd();
        wallBlock(x + (s * w) / 2, z, 1.6, d, 0, y, 7);
      }
    } else {
      const n = Math.round(w / 6);
      for (let i = 0; i < n; i++) bprop("floor_dirt_large", x - w / 2 + 3 + i * 6, y - 0.075, z, DS, 0);
      for (const s of [-1, 1]) {
        sideBegin(x - w / 2, z + (s * d) / 2, x + w / 2, z + (s * d) / 2);
        for (let i = 0; i < n; i++) bprop("wall", x - w / 2 + 3 + i * 6, y, z + (s * d) / 2, DS, s < 0 ? 0 : PI);
        sideEnd();
        wallBlock(x, z + (s * d) / 2, w, 1.6, 0, y, 7);
      }
    }
  }
  /* jentil-irudia: harrizko erraldoi bizardun bat (sare bakarra) */
  function jentilStatue(x, z, rot, s = 1, y = 0) {
    const st = "#8f8a7d",
      dk = "#6c675d",
      moss = "#56663a",
      parts = [
        [at(new T.BoxGeometry(2.6, 0.8, 2.4), 0, 0.4, 0), dk],
        [at(new T.BoxGeometry(1.8, 3.2, 1.2), 0, 2.4, 0), st],
        [at(new T.BoxGeometry(2.5, 0.95, 1.3), 0, 4.0, 0), st],
        [at(new T.BoxGeometry(1.05, 1.15, 1.05), 0, 5.05, 0.05), st],
        [at(new T.ConeGeometry(0.6, 1.5, 6), 0, 4.15, 0.62, PI), dk],
        [at(new T.BoxGeometry(1.15, 0.3, 0.4), 0, 5.35, 0.5), dk],
        [at(new T.BoxGeometry(2.0, 0.35, 1.3), 0, 1.4, 0), moss],
      ];
    for (const sx of [-1, 1]) {
      parts.push([at(new T.BoxGeometry(0.55, 2.7, 0.65), sx * 1.45, 2.65, 0.1, 0, 0, sx * 0.07), st]);
      parts.push([at(new T.BoxGeometry(0.7, 0.55, 0.75), sx * 1.5, 1.15, 0.15), dk]);
    }
    const m = new T.Mesh(mergeColored(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }));
    m.position.set(x, y, z);
    m.rotation.y = rot;
    m.scale.setScalar(s);
    m.castShadow = m.receiveShadow = true;
    BP.add(m);
    solids.push({ x, z, r: 1.35 * s, h: 5.8 * s, y, pillar: true });
    return m;
  }
  /* ---------------- SUTONDOA: atseden-lekua (arnasa bete, kontrol-puntua) ---------------- */
  const HEARTHS = [];
  function sutondoa(id, x, y, z, ox = 1.8, oz = 1.8) {
    const g = new T.Group(),
      parts = [];
    g.position.set(x, y, z);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      parts.push([at(new T.DodecahedronGeometry(0.34, 0), Math.cos(a) * 1.1, 0.22, Math.sin(a) * 1.1, i, i * 2, 0, 1.2, 0.75, 1), i % 2 ? "#77736a" : "#8d877c"]);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      parts.push([at(new T.CylinderGeometry(0.09, 0.12, 1.25, 6), Math.cos(a) * 0.32, 0.42, Math.sin(a) * 0.32, 0.75, a, 0), "#4a3322"]);
    }
    const base = new T.Mesh(mergeColored(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }));
    base.castShadow = true;
    g.add(base);
    const flame = new T.Mesh(new T.ConeGeometry(0.42, 1.2, 7), new T.MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
    flame.position.y = 0.95;
    g.add(flame);
    const core = new T.Mesh(new T.ConeGeometry(0.22, 0.7, 6), new T.MeshBasicMaterial({ color: "#fff1c4", transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
    core.position.y = 0.75;
    g.add(core);
    const fl = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff9a3a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    fl.scale.setScalar(4.2);
    fl.position.y = 1;
    g.add(fl);
    BP.add(g);
    solids.push({ x, z, r: 1.15, h: 1.2, y, pillar: true });
    const H = { id, x, y, z, ox, oz, g, flame, core, fl, grp: BP, ph: x * 0.7 };
    HEARTHS.push(H);
    /* leizean: zuzi bezala (argi errealak hurbil daudenean) */
    if (BDG && ZONES[BDG.id] && BP === ZONES[BDG.id].group) BDG.torches.push({ x, y: y + 1.1, z, fl, ph: H.ph, side: null });
    return H;
  }
  function hearthNear() {
    return HEARTHS.find((H) => H.grp === ZONES[ZONE.cur].group && Math.hypot(P.x - H.x, P.z - H.z) < 3 && Math.abs(P.y - H.y) < 1.6);
  }
  function hearthRest(H) {
    P.hp = P.maxHp;
    TXB.n = TXB.max;
    saved.cp = { zone: ZONE.cur, x: H.x + H.ox, y: H.y, z: H.z + H.oz };
    persist();
    SND.heal();
    SND.memory();
    fxBurst(H.x, H.y + 1, H.z, { n: 30, speed: 2.5, up: 3, life: 1.1, size: 0.3, color: "#ffc27a", grav: -1.5 });
    fxRing(P.x, P.y + 0.2, P.z, "#ffd9a0", 5, 0.8);
    haptic(30);
    if (!saved.flags.includes("sutondoa")) {
      flagSet("sutondoa");
      title("SUTONDOA", "");
      notify(L("Sutondoan atseden: arnasa beteta, tximistarriak ere bai. Erortzen bazara, hemendik jarraituko duzu."), "", 6);
    } else notify(L("Atseden hartuta. Arnasa beteta; hemendik jarraituko duzu."), "", 2.6);
    hud();
  }
  function hearthsUpdate(dt) {
    for (const H of HEARTHS) {
      if (H.grp !== ZONES[ZONE.cur].group) continue;
      const f = 1 + Math.sin(time * 13 + H.ph) * 0.1 + Math.sin(time * 29 + H.ph) * 0.06;
      H.flame.scale.set(1, f, 1);
      H.core.scale.set(1, 2 - f, 1);
      H.fl.material.opacity = 0.62 + Math.sin(time * 11 + H.ph) * 0.12;
      if (Math.random() < dt * 5 && Math.hypot(P.x - H.x, P.z - H.z) < 30) fxBurst(H.x, H.y + 1.3, H.z, { n: 1, speed: 0.5, up: 2.4, life: 1.2, size: 0.12, color: "#ffb35c", grav: -1, drag: 1 });
    }
  }
  /* ---------------- LASTERBIDEAK: alde batetik bakarrik irekitzen diren barrak ---------------- */
  const SHORTCUTS = [];
  function shortcutDoor(id, x, z, rot, y, nx, nz, text) {
    const D = door(id, x, z, rot, y, "bars");
    D.oneWay = { nx, nz, text };
    /* palanka (irekitzeko aldean) */
    const lever = new T.Group(),
      post = new T.Mesh(new T.BoxGeometry(0.5, 1.3, 0.5), rockMaterial()),
      handle = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 6), material("#5a4128"));
    post.position.y = 0.65;
    handle.position.y = 1.5;
    handle.rotation.z = 0.5;
    lever.add(post, handle);
    const tx = Math.cos(rot) * 2,
      tz = -Math.sin(rot) * 2;
    lever.position.set(x + nx * 1.6 + tx, y, z + nz * 1.6 + tz);
    lever.rotation.y = rot;
    BP.add(lever);
    D.lever = handle;
    if (D.open) handle.rotation.z = -0.5;
    SHORTCUTS.push(D);
    return D;
  }
  function shortcutNear() {
    const D = SHORTCUTS.find((D) => !D.open && D.g.parent === ZONES[ZONE.cur].group && Math.hypot(P.x - D.x, P.z - D.z) < 4.4 && Math.abs(P.y - D.y) < 2);
    if (!D) return null;
    const side = (P.x - D.x) * D.oneWay.nx + (P.z - D.z) * D.oneWay.nz;
    if (side > 0)
      return {
        kind: "door",
        label: L("LASTERBIDEA"),
        fn: () => {
          openDoor(D);
          D.lever.rotation.z = -0.5;
          SND.wake();
          title("LASTERBIDEA", "");
          notify(D.oneWay.text || L("Lasterbidea irekita!"), "", 4.5);
          hud();
        },
      };
    return { kind: "locked", label: L("ITXITA"), fn: () => notify(L("Barrek ez dute sarrailarik alde honetan. Beste aldetik irekiko dira…"), "", 3) };
  }
  /* burdin-sarea (gelaren erdian): ateak erdian; hormak alboetan (z ardatzean luzea) */
  function grate(x, z, len, y, gateId) {
    const parts = [];
    for (let o = -len / 2 + 0.4; o <= len / 2 - 0.3; o += 0.75) if (Math.abs(o) > 2.9) parts.push([at(new T.CylinderGeometry(0.09, 0.09, 7.2, 5), 0, 3.6, o), "#3a4046"]);
    for (const hy of [1.2, 6.6]) parts.push([at(new T.BoxGeometry(0.2, 0.16, len), 0, hy, 0), "#2b2f33"]);
    const m = new T.Mesh(mergeColored(parts), new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.5 }));
    m.position.set(x, y, z);
    BP.add(m);
    const half = len / 2;
    wallBlock(x, z - (half + 3) / 2, 0.6, half - 3, 0, y, 7.5);
    wallBlock(x, z + (half + 3) / 2, 0.6, half - 3, 0, y, 7.5);
    return door(gateId, x, z, PI / 2, y, "bars");
  }

  /* ================================ GELAK ================================ */
  function buildJentil() {
    dungeonBegin(DGJ);
    const E = (x) => JX + x;
    /* ---- J1: Jentilen ataria ---- */
    room("J1", E(0), 0, 30, 30, { area: "jA", name: "JENTILEN ATARIA", desc: "Jentilen harri handiak. Lo daude, ez hilda.", doors: { s: 0, n: 0, e: -6, w: 0 }, wallH: 20 });
    slab({ x: E(0), z: 18, y: 0, w: 6, d: 6, h: 1.2, mat: "dark" });
    wallBlock(E(-3.4), 18, 0.8, 6, 0, 0, 7);
    wallBlock(E(3.4), 18, 0.8, 6, 0, 0, 7);
    wallBlock(E(0), 21.2, 6, 0.8, 0, 0, 7);
    const arch = obj(new T.PlaneGeometry(5, 5.6), new T.MeshBasicMaterial({ color: "#ffe9c0", transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    arch.position.set(E(0), 2.8, 20.6);
    DGJ.exitGlow = arch;
    /* ekialdeko ertza (6 m): hegoaldeko aldea heuraz (iraganean bizirik; kamerak ikusten du) */
    const ledge = slab({ x: E(10), z: -6, y: 6, w: 10, d: 18, h: 6, area: "jA" });
    ledge.slick = true;
    DGJ.ivyA = ivySide(ledge, "s", 0, { phase: 0, id: "jA-heura" });
    for (const [rx, rz] of [[E(6.5), -12.5], [E(13), -13]]) bprop("rubble_half", rx, 6, rz, DS * 0.5, rx);
    hallway(E(18), -6, 6, 6, "x", 6);
    /* atalasera (iparra) eta biltegiko lasterbidea (mendebaldea) */
    corridor(E(0), -18, 6, 6, "z");
    DOORDEF.jAw = shortcutDoor("jA-w", E(-15), 0, PI / 2, 0, -1, 0, L("Lasterbidea irekita: biltegitik atarira, bide laburra."));
    corridor(E(-21), 0, 12, 6, "x");
    DGJ.hearthA = sutondoa("jA-su", E(-9), 0, 8.5, 1.9, -1.2);
    jentilStatue(E(-10), -11.5, 0.15, 1.1);
    jentilStatue(E(4), -12, -0.1, 0.9);
    for (const [bx, bz] of [[E(-12.5), 12.5], [E(12.5), 12.5], [E(-12.5), -3]]) breakable("barrel", bx, 0, bz);
    bprop("rubble_large", E(-4.5), 0, -7, DS * 0.6, 0.5);
    bprop("banner_patternB_red", E(-6), 0, -14.2, DS * 0.8, 0);
    /* ---- J2: Kanpaien aretoa (y 6) ---- */
    room("J2", E(36), 0, 30, 30, { y: 6, area: "jB", name: "KANPAIEN ARETOA", desc: "Jentilen kanpaiak sarearen atzean. Urrutitik jo behar…", doors: { w: -6, n: 12, e: 12 } });
    DOORDEF.jBg = grate(E(40), 0, 30, 6, "jB-g");
    RUNE_SETS.push({
      id: "jB-bells",
      zone: "jentil",
      kind: "kanpaia",
      time: 7,
      runes: [[E(46), 9.6, -9, -1], [E(48), 9.6, 0, 1], [E(46), 9.6, 9, -1]],
      hint: "Hiru kanpaia sarearen atzean. Jo denak SORGINKERIAz, elkarren segidan — bat ORAINEAN bakarrik ikusten da!",
      onSolve: () => {
        openDoor(DOORDEF.jBg);
        title("SAREA ZABALDU DA", "");
      },
    });
    /* ekialdeko hutsunea: harri arrakalatuaren atzean, kutxa (TXIMISTARRIArekin itzuli) */
    crackWall("jB-crack", E(51.4), 12, 1.4, 5.9, 5.2, { y: 6 });
    slab({ x: E(54), z: 12, y: 6, w: 4.6, d: 6.2, h: 1.2, mat: "dark" });
    wallBlock(E(56.7), 12, 0.8, 6.2, 0, 6, 7, true);
    wallBlock(E(54), 8.6, 4.6, 0.8, 0, 6, 7, true);
    wallBlock(E(54), 15.4, 4.6, 0.8, 0, 6, 7, true);
    chest("jB-piece", E(54.4), 6, 12, -PI / 2, { t: "piece", id: "jentilbaratza" });
    for (const [px, pz] of [[E(26), -12], [E(26), 12]]) jentilStatue(px, pz, PI / 2, 0.75, 6);
    bprop("banner_patternA_green", E(30), 6, -14.2, DS * 0.8, 0);
    bprop("rubble_half", E(32), 6, 10, DS * 0.6, 0.8);
    breakable("barrel", E(24), 6, 2);
    hallway(E(48), -18, 6, 6, "z", 6);
    /* ---- J3: Harresia (borroka, y 6) ---- */
    room("J3", E(36), -36, 30, 30, {
      y: 6,
      area: "jC",
      name: "HARRESIA",
      desc: "Jentilen harresia. Hezurrezko zaindariak txandaka.",
      doors: { s: 12, w: 0, e: 0 },
      waves: [[["grunt", -1, 3]], [["brute", -1, 1], ["grunt", 0, 2]], [["brute", 1, 1], ["eye", -1, 1], ["grunt", 1, 1]]],
      diff: 1.2,
      hpK: 1.35,
      fightText: "Zaindariak! Kolpea iristean sakatu SORGINKERIA: ALDARATU.",
      onWin: () => {
        revealChest(DGJ.keyChest);
        notify(L("Kutxa bat agertu da harresiaren erdian."), "", 4);
      },
    });
    DGJ.keyChest = chest("jC-key", E(36), 6, -36, 0, { t: "key" }, { hidden: !isCleared("J3") });
    DOORDEF.jCe = door("jC-e", E(51), -36, PI / 2, 6, "key", "J3");
    hallway(E(54), -36, 6, 6, "x", 6);
    /* mendebaldea: arrakala → jauzi atalasera (lasterbidea) */
    crackWall("jC-crack", E(20.2), -36, 1.4, 5.9, 5.6, { y: 6, onBreak: () => notify(L("Harria apurtu da! Beherago, atalasea: jauzi, eta bide laburra izango duzu."), "", 4.5) });
    hallway(E(18), -36, 6, 6, "x", 6);
    for (const [px, pz] of [[E(28), -44], [E(44), -44], [E(28), -28], [E(44), -28]]) {
      bprop("pillar_decorated", px, 6, pz, DS * 0.9, 0);
      solids.push({ x: px, z: pz, r: 1.3, h: 6, y: 6, pillar: true });
    }
    bprop("banner_patternB_red", E(36), 6, -50.2, DS * 0.8, 0);
    /* ---- J4: Harri-zainaren gela (y 6) ---- */
    room("J4", E(72), -36, 30, 30, { y: 6, area: "jD", name: "HARRI-ZAINAREN GELA", desc: "Harrizko zaindari bat lo dago… ala ez?", doors: { w: 0 } });
    DGJ.bombChest = chest("jD-tximista", E(72), 6, -30, PI, { t: "item", id: "tximistarria" }, { hidden: !isCleared("jD-mini") });
    for (const [px, pz, r] of [[E(62), -46, 0.4], [E(82), -26, 2.6]]) jentilStatue(px, pz, r, 0.8, 6);
    for (let i = 0; i < 6; i++) {
      const st = obj(new T.DodecahedronGeometry(0.28, 0), new T.MeshStandardMaterial({ color: "#3b4250", emissive: new T.Color("#7fc8ff"), emissiveIntensity: 0.5, roughness: 0.5, flatShading: true }));
      st.position.set(E(64 + (i % 3) * 7), 6.25, -48 + Math.floor(i / 3) * 1.2);
    }
    bprop("rubble_large", E(84), 6, -48, DS * 0.6, 1.2);
    /* ---- J0: Atalasea ---- */
    room("J0", E(0), -36, 30, 30, { area: "jE", name: "ATALASEA", desc: "Ate handi bat, jentilen neurrikoa. Goian, ekaitz bat zizelkatuta.", doors: { s: 0, n: 0, e: 0, w: 0 }, wallH: 20 });
    DOORDEF.jDn = door("jD-n", E(0), -51, 0, 0, "boss");
    corridor(E(0), -54, 6, 6, "z");
    jentilStatue(E(-7.5), -47, 0, 1.25);
    jentilStatue(E(7.5), -47, 0, 1.25);
    crackWall("jE-crack", E(-15.2), -36, 1.4, 5.9, 5.6, { onBreak: () => notify(L("Harria apurtu da: mendebaldean, dorre bat."), "", 3.5) });
    corridor(E(-18), -36, 6, 6, "x");
    /* ---- J6: Jentilen dorrea ---- */
    room("J6", E(-36), -36, 30, 30, { area: "jF", name: "JENTILEN DORREA", desc: "Zutabe erraldoi bat, heuraz estalia. Inguruan, lau kanpaia.", doors: { e: 0, s: 0 }, fog: [12, 80], wallH: 20 });
    const pil = slab({ x: E(-36), z: -36, y: 12, w: 8, d: 8, h: 12, area: "jF" });
    pil.slick = true;
    DGJ.ivyF = ivySide(pil, "s", 0, { phase: 0, id: "jF-heura" });
    DGJ.bigChest = chest("jF-bigkey", E(-36), 12, -37.5, 0, { t: "bigkey" }, { hidden: !isCleared("jF-bells") });
    /* lau zutabe (8 m) kanpaiekin; bat harri arrakalatu baten barruan */
    const cols = [[-44.5, -44.5, -1], [-27.5, -44.5, -1], [-44.5, -27.5, 1], [-27.5, -27.5, -1]];
    for (const [cx, cz] of cols) {
      const c = obj(new T.CylinderGeometry(1.5, 1.8, 8, 10), stackMaterial());
      c.position.set(E(cx), 4, cz);
      c.castShadow = c.receiveShadow = true;
      solids.push({ x: E(cx), z: cz, r: 1.8, h: 8, y: 0, pillar: true });
      platforms.push({ x: E(cx), z: cz, y: 8, bottom: 0, rx: 1.6, rz: 1.6, phase: -1, safe: false, slick: true });
    }
    crackWall("jF-crack", E(-27.5), -27.5, 3.1, 3.1, 4.6, { y: 8, extra: 0.4, onBreak: () => notify(L("Harria apurtu da: barruan, laugarren kanpaia!"), "", 3.5) });
    RUNE_SETS.push({
      id: "jF-bells",
      zone: "jentil",
      kind: "kanpaia",
      time: 10,
      runes: cols.map(([cx, cz, era]) => [E(cx), 11.6, cz, era]),
      hint: "Lau kanpaia zutabeen gainean. Jo denak, elkarren segidan: goitik hobeto…",
      onSolve: () => {
        revealChest(DGJ.bigChest);
        title("KANPAIAK BATERA", "");
        notify(L("Zutabearen gainean, kutxa bat agertu da!"), "", 4);
      },
    });
    corridor(E(-36), -15, 6, 12, "z");
    /* ---- J5: Biltegia ---- */
    room("J5", E(-36), 0, 18, 18, { area: "jG", name: "BILTEGIA", desc: "Jentilen biltegia: gari-zakuak, kutxak… eta su bat.", doors: { n: 0, e: 0 } });
    DGJ.hearthG = sutondoa("jG-su", E(-40), 0, 3.5, 1.9, -1.4);
    bprop("crate_A_big", E(-42.5), 0, -6, DS * 0.9, 0.3);
    bprop("crate_B_small", E(-30), 0, 6.5, DS * 0.9, 1);
    bprop("barrel_large", E(-42.5), 0, 6.5, DS * 0.85, 0.2);
    breakable("barrel", E(-30), 0, -6);
    breakable("crate_A_big", E(-31.5), 0, -3.5);
    /* ---- J7: Errolanen aretoa ---- */
    room("J7", E(0), -78, 42, 42, { area: "jH", name: "ERROLANEN ARETOA", desc: "", doors: { s: 0 }, wallH: 20 });
    /* izkinetako zutabeak heurarekin (iraganean): uhinetatik babesteko */
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = slab({ x: E(sx * 14), z: -78 + sz * 14, y: 7, w: 3.2, d: 3.2, h: 7, area: "jH" });
      p.slick = true;
      ivySide(p, "s", 0, { phase: 0 });
    }
    for (let i = 0; i < 8; i++) bprop("rubble_half", E(-16 + (i % 4) * 10.5), 0, i < 4 ? -60 : -96, DS * 0.5, i);
    DGJ.bossRoom = DGJ.rooms.J7;
    errolanBuild();
    dungeonEnd(DGJ);
  }
  DGJ.update = (dt) => {
    hearthsUpdate(dt);
    /* harri-zainaren gela: sartzean, zaindaria esnatzen da */
    const R4 = DGJ.rooms.J4;
    if (R4 && !MINI.e && !ROOM.fight && !cinematic && ROOM.cur === R4 && !isCleared("jD-mini") && P.grounded && P.y > 5 && Math.abs(P.x - R4.x) < R4.w / 2 - 3 && Math.abs(P.z - R4.z) < R4.d / 2 - 3)
      miniBegin(
        R4,
        {
          name: "HARRI-ZAINA",
          clearId: "jD-mini",
          hp: 34,
          scale: 1.7,
          K: 1.25,
          tint: "#b9b2a2",
          add: [["grunt", -1, 2]],
          hint: "Harrizko zaindaria! Oldarka datorrenean, kolpea iristean SORGINKERIA: ALDARATU — zorabiatuta, kalte bikoitza.",
          onDead: () => {
            revealChest(DGJ.bombChest);
            notify(L("Kutxa bat agertu da gelaren hegoaldean."), "", 4);
          },
        },
        R4.x,
        R4.z - 6,
      );
  };

  /* ================================ ERROLAN (J7) ================================
     Jentilen azkena, Gauekoren ekaitz batek gaiztotua. Erasoak:
     · HARKAITZA: buru gainean altxatu (une hori: TXIMISTARRIA oinetara → harkaitza
       buruan erori → belauniko) eta gero jaurti (EZKUTUAz itzuli → belauniko);
     · UKABILKADA: lurra jo → uhinak (salto, edo heura duten zutabeetara igo);
     · ESKUKADA: aurrean, erdi-zirkuluan (une zehatzean ALDARATU → belauniko).
     Belauniko dagoenean, bularreko ekaitz-harria agerian: SORGINKERIA. Hiru txanda. */
  const ERR = { g: null, root: null, mixer: null, acts: {}, cur: "", x: 0, z: 0, a: 0, state: "sleep", t: 0, downT: 3, hp: 8, rounds: 3, step: 0, n: 0, waves: [], rock: null, core: null, coreGlow: null, eyes: [], light: null, cone: null, seenIntro: false, slam: false, swung: false, thrown: false, stats: { bomb: 0, parry: 0, reflect: 0 } };
  const ERR_HP = 8,
    ERR_SC = 5.2,
    EV = new T.Vector3();
  function errolanBuild() {
    const R = DGJ.bossRoom,
      src = models.npc_knight;
    ERR.x = R.x;
    ERR.z = R.z - 9;
    const rock = new T.Mesh(new T.DodecahedronGeometry(2, 0), rockMaterial());
    rock.castShadow = true;
    rock.visible = false;
    BP.add(rock);
    ERR.rock = rock;
    /* eskukadaren abisua: konoa lurrean */
    const cone = new T.Mesh(new T.CircleGeometry(7.5, 28, -1.5, 3), new T.MeshBasicMaterial({ color: "#ff4d6d", transparent: true, opacity: 0, depthWrite: false }));
    cone.rotation.x = -PI / 2;
    cone.renderOrder = 3;
    BP.add(cone);
    ERR.cone = cone;
    if (!src) return;
    const root = cloneSkinned(src.scene);
    root.scale.setScalar(ERR_SC);
    root.traverse((n) => {
      if (!n.isMesh) return;
      if (/Sword|Shield|Helmet|Cape/.test(n.name)) n.visible = false;
      /* harrizko erraldoia: testurarik gabe, harri-kolore laua */
      const m = new T.MeshStandardMaterial({ color: "#9a958a", roughness: 0.95, metalness: 0, flatShading: true, emissive: new T.Color("#0e0a16"), emissiveIntensity: 0.5 });
      m.skinning = !!n.isSkinnedMesh;
      n.material = m;
      n.castShadow = true;
      n.frustumCulled = false;
    });
    /* bizar luzea eta ile harritsua (buruari lotuta), begi moreak */
    const head = root.getObjectByName("head"),
      hp = [];
    hp.push([at(new T.IcosahedronGeometry(0.36, 1), 0, 0.12, 0.2, 0, 0, 0, 1.05, 1.15, 0.75), "#8f8a7f"]);
    hp.push([at(new T.ConeGeometry(0.3, 0.55, 8), 0, -0.22, 0.2, PI), "#8a857a"]);
    for (const s of [-1, 1]) hp.push([at(new T.ConeGeometry(0.14, 0.5, 6), s * 0.24, 0.02, 0.18, PI, 0, s * 0.3), "#969185"]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      hp.push([at(new T.IcosahedronGeometry(0.17 + (i % 3) * 0.04, 0), Math.sin(a) * 0.36, 0.78 + Math.cos(a * 2) * 0.05, Math.cos(a) * 0.3 - 0.06, i, i * 2, 0), "#6f6a60"]);
    }
    const hair = new T.Mesh(mergeColored(hp), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    hair.castShadow = true;
    const eyeMat = new T.MeshBasicMaterial({ color: "#c98bff" });
    for (const s of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), eyeMat);
      e.position.set(s * 0.13, 0.5, 0.42);
      ERR.eyes.push(e);
    }
    if (head) head.add(hair, ...ERR.eyes);
    /* bularreko ekaitz-harria (puntu ahula) */
    const chestB = root.getObjectByName("chest") || root.getObjectByName("spine") || root;
    const core = new T.Mesh(new T.OctahedronGeometry(0.2, 0), new T.MeshStandardMaterial({ color: "#3a2050", emissive: new T.Color("#b46bff"), emissiveIntensity: 0.4, roughness: 0.3, flatShading: true }));
    core.position.set(0, chestB === root ? 1.25 : 0.25, chestB === root ? 0.35 : 0.33);
    const coreGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#c98bff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.2 }));
    coreGlow.scale.setScalar(1.2);
    core.add(coreGlow);
    chestB.add(core);
    const g = new T.Group();
    g.add(root);
    BP.add(g);
    root.updateMatrixWorld(true);
    /* altuera: ikusgai dauden sareekin bakarrik (ezkutatutako armak eta kaskoa kanpoan) */
    const hb = new T.Box3();
    root.traverse((n) => {
      if (n.isMesh && n.visible) hb.expandByObject(n);
    });
    ERR.h = hb.isEmpty() ? 9 : hb.max.y;
    /* puntu ahula: beti ikusten den distira (agerian dagoenean) */
    const weak = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#d9a8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0 }));
    weak.scale.setScalar(3.4);
    weak.renderOrder = 12;
    BP.add(weak);
    ERR.weakGlow = weak;
    const light = new T.PointLight("#c9a8ff", 1.1, 22, 1.6);
    light.position.set(0, 12, 4);
    g.add(light);
    const mixer = new T.AnimationMixer(root),
      acts = {};
    for (const c of models.mage.animations) acts[c.name] = mixer.clipAction(c);
    if (models.skel_minion) for (const c of models.skel_minion.animations) acts[c.name] = mixer.clipAction(c);
    Object.assign(ERR, { g, root, mixer, acts, core, coreGlow, light, eyeMat });
    g.position.set(ERR.x, 0, ERR.z);
    errAnim("Idle");
    if (saved.flags.includes("errolan")) errFreed(true);
  }
  function errAnim(name, once, ts = 1) {
    const a = ERR.acts[name];
    if (!a || (ERR.cur === name && !once)) return;
    const old = ERR.acts[ERR.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.timeScale = ts;
    a.fadeIn(0.2).play();
    if (old && old !== a) old.fadeOut(0.2);
    ERR.cur = name;
  }
  function errWaveMesh() {
    const m = new T.Mesh(new T.TorusGeometry(1, 0.15, 6, 64), new T.MeshBasicMaterial({ color: "#b8ab8f", transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -PI / 2;
    ZONES.jentil.group.add(m);
    return m;
  }
  function errolanStart() {
    if (BOSS.on || saved.flags.includes("errolan") || !ERR.g) return;
    const R = DGJ.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "errolan";
    BOSS.weakR = 1.7;
    Object.assign(ERR, { state: "intro", t: 0, hp: ERR_HP, rounds: 3, step: 0, x: R.x, z: R.z - 9 });
    const fight = () => {
      ERR.state = "idle";
      ERR.t = 0;
      title("ERROLAN", "");
      SND.roar();
      shake(0.6);
      bossBar("ERROLAN", 1);
      notify(L("Harkaitza buru gainean duenean: TXIMISTARRIA oinetara! Eskukada: ALDARATU. Harkaitzak: EZKUTUA."), "", 7);
    };
    if (ERR.seenIntro) return fight();
    ERR.seenIntro = true;
    say(
      [
        ["ERROLAN", "Nork esnatzen ditu jentilak? Zeruan argi bitxi bat ikusi genuen, eta harri honen azpian sartu ginen… mende askoan.", "", ERR.x, ERR.z, 9],
        ["AMAIUR", "Ez naiz zure etsaia, Errolan. Itzal bat daramazu bularrean.", "", P.x, P.z, 0],
        ["ERROLAN", "ITZALIK EZ, SORGIN: EKAITZA! HARRIAK HEGAN, MENDIAK DARDARKA. ZAPALDUKO ZAITUT!", "", ERR.x, ERR.z, 9],
      ],
      fight,
    );
  }
  /* belauniko: bihotza (ekaitz-harria) agerian */
  function errDown(t, msg, why) {
    if (why) ERR.stats[why]++;
    ERR.state = "down";
    ERR.t = 0;
    ERR.downT = t;
    ERR.rock.visible = false;
    ERR.cone.material.opacity = 0;
    errAnim("Hit_A", true, 0.5);
    SND.roar();
    shake(0.45);
    title("BELAUNIKO!", "");
    if (msg) notify(msg, "", 3.5);
  }
  /* eskukada: aldaratu, ezkutuz geldiarazi edo zauria */
  function errSweepHit() {
    if (GUARD.safe > 0 || damageTime > 0 || respawnTimer || P.dashT > 0 || MAG.spinT < 0.3) return;
    const front = facing(ERR.x, ERR.z, 1.75);
    if (front && GUARD.win > 0 && GUARD.pressT >= (ERR.atk0 || 0)) {
      GUARD.win = 0;
      GUARD.n++;
      GUARD.safe = 0.6;
      hitStop = Math.max(hitStop, 0.15);
      slowmo = Math.max(slowmo, 0.45);
      SND.parry();
      haptic(40);
      fxRing(P.x, P.y + 1.2, P.z, "#fff1a8", 3.4, 0.4);
      fxBurst(P.x, P.y + 1.4, P.z, { n: 30, speed: 7, up: 1, life: 0.45, size: 0.32, color: "#fff1a8", grav: 2 });
      damageNumber({ x: ERR.x, y: 6.5, z: ERR.z, H: 0.5 }, L("ALDARATUA!"), "#fff1a8");
      coachDone("parry");
      errDown(3.4, L("ALDARATUA! Errolan belauniko: bihotza agerian!"), "parry");
      return;
    }
    if (front && MAG.charging && MAG.charge > 0.12) {
      GUARD.safe = 0.5;
      MAG.charge = 0;
      const dx = P.x - ERR.x,
        dz = P.z - ERR.z,
        d = Math.hypot(dx, dz) || 1;
      P.vx = (dx / d) * 13;
      P.vz = (dz / d) * 13;
      SND.clang(1.4);
      shake(0.25);
      notifyOnce("err-block", L("EZKUTUAk eutsi dio… baina une zehatzean sakatuz gero, ALDARATU!"), "");
      return;
    }
    playerHit(2, ERR.x, ERR.z);
  }
  function errolanUpdateBoss(dt) {
    if (ZONE.cur !== "jentil" || !ERR.g) return;
    ERR.mixer.update(dt);
    const R = DGJ.bossRoom,
      vul = ERR.state === "down" && ERR.t > 0.45;
    ERR.coreGlow.material.opacity = vul ? 0.8 + Math.sin(time * 10) * 0.2 : ERR.state === "freed" ? 0 : 0.18;
    ERR.core.material.emissiveIntensity = vul ? 2.8 : 0.4;
    ERR.core.scale.setScalar(vul ? 1.6 + Math.sin(time * 10) * 0.15 : 1);
    if (ERR.weakGlow) {
      ERR.weakGlow.visible = vul;
      if (vul) {
        ERR.core.getWorldPosition(EV);
        ERR.weakGlow.position.copy(EV);
        ERR.weakGlow.material.opacity = 0.55 + Math.sin(time * 10) * 0.25;
      }
    }
    if (ERR.state === "freed") {
      const fa = Math.atan2(P.x - ERR.x, P.z - ERR.z);
      ERR.g.rotation.y += Math.atan2(Math.sin(fa - ERR.g.rotation.y), Math.cos(fa - ERR.g.rotation.y)) * Math.min(1, dt * 2);
      return;
    }
    if (ERR.state === "sleep") {
      if (ROOM.cur === R && P.grounded && !cinematic && Math.abs(P.z - R.z) < R.d / 2 - 5 && Math.abs(P.x - R.x) < R.w / 2 - 3) errolanStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    ERR.t += dt;
    const dx = P.x - ERR.x,
      dz = P.z - ERR.z,
      d = Math.hypot(dx, dz) || 1,
      face = Math.atan2(dx, dz),
      rage = 3 - ERR.rounds;
    const turn = (k = 3) => (ERR.a += Math.atan2(Math.sin(face - ERR.a), Math.cos(face - ERR.a)) * Math.min(1, dt * k));
    /* gorputzaren kontra: bultzatu */
    if (d < 3.6 && P.y < 4 && ERR.state !== "down") {
      P.vx += (dx / d) * 110 * dt;
      P.vz += (dz / d) * 110 * dt;
    }
    switch (ERR.state) {
      case "idle": {
        turn();
        if (d > 9) {
          errAnim("Walking_A");
          const sp = 2.2 + rage * 0.5;
          ERR.x += (dx / d) * sp * dt;
          ERR.z += (dz / d) * sp * dt;
        } else errAnim("Idle");
        if (ERR.t > 1.6 - rage * 0.25) {
          ERR.step++;
          const seq = d < 8.5 ? ["sweep", "slam", "lift"] : ["lift", "slam", "lift", "sweep"];
          ERR.state = seq[ERR.step % seq.length];
          ERR.t = 0;
          ERR.atk0 = time;
          ERR.n = 0;
          ERR.slam = ERR.swung = ERR.thrown = false;
          if (ERR.state === "lift") {
            ERR.rock.visible = true;
            errAnim("Spellcast_Raise", true, 0.8);
            SND.crumble();
            notifyOnce("err-lift", L("Harkaitza altxatu du! TXIMISTARRIA haren oinetara, orain!"), "");
          }
        }
        break;
      }
      case "lift": {
        turn(1.2);
        const k = Math.min(1, ERR.t / 0.6);
        ERR.rock.position.set(ERR.x + Math.sin(ERR.a) * 0.8, mix(3.5, (ERR.h || 9) + 0.6, k) + Math.sin(time * 6) * 0.08, ERR.z + Math.cos(ERR.a) * 0.8);
        ERR.rock.rotation.y += dt;
        /* TXIMISTARRIAren metxak 1.7 s irauten du: leihoa nahikoa luzea */
        if (ERR.t > 3.2 - rage * 0.2) {
          ERR.state = "throw";
          ERR.t = 0;
          errAnim("Spellcast_Shoot", true, 0.9);
        }
        break;
      }
      case "throw": {
        turn(4);
        if (ERR.t > 0.35 && !ERR.thrown) {
          ERR.thrown = true;
          ERR.rock.visible = false;
          const o = ERR.rock.position,
            m = new T.Mesh(new T.DodecahedronGeometry(1.3, 0), rockMaterial());
          m.castShadow = true;
          m.position.copy(o);
          scene.add(m);
          const tx = P.x - o.x,
            tz = P.z - o.z,
            td = Math.hypot(tx, tz) || 1,
            T0 = clamp(td / 14, 0.75, 1.3);
          SHOTS.push({ m, x: o.x, z: o.z, y: o.y, vx: tx / T0, vz: tz / T0, sp: td / T0, t: 0, era: 2, rock: true, vy: (P.y + 1 - o.y + 0.5 * 16 * T0 * T0) / T0 });
          SND.shot();
          shake(0.2);
          notifyOnce("err-throw", L("Harkaitza dator! Mantendu SORGINKERIA aurrean (EZKUTUA): itzuli egingo diozu."), "");
        }
        if (ERR.t > 1.3) {
          ERR.state = "idle";
          ERR.t = 0;
        }
        break;
      }
      case "slam": {
        turn(1.5);
        const reps = 2 + (rage > 0 ? 1 : 0),
          cyc = 1.25 - rage * 0.12,
          k = Math.floor(ERR.t / cyc);
        if (k >= reps) {
          ERR.state = "idle";
          ERR.t = 0;
          break;
        }
        if (k >= ERR.n) {
          ERR.n = k + 1;
          ERR.slam = false;
          errAnim("2H_Melee_Attack_Chop", true, 0.95);
        }
        if (ERR.t - k * cyc > cyc * 0.6 && !ERR.slam) {
          ERR.slam = true;
          const fx = ERR.x + Math.sin(ERR.a) * 3.5,
            fz = ERR.z + Math.cos(ERR.a) * 3.5;
          shake(0.45);
          SND.thud();
          SND.crumble();
          fxBurst(fx, 0.4, fz, { n: 26, speed: 6, up: 3, life: 0.6, size: 0.4, color: "#9a917f", grav: 9 });
          ERR.waves.push({ x: fx, z: fz, r: 1.5, sp: 12 + rage * 2, m: errWaveMesh() });
          if (Math.hypot(P.x - fx, P.z - fz) < 2.6 && P.y < 1.5) playerHit(2, fx, fz);
        }
        break;
      }
      case "sweep": {
        if (ERR.t < 0.9) turn(2.2);
        if (ERR.t < 0.05) errAnim("Spellcast_Raise", true, 1.3);
        /* abisua lurrean (konoa) */
        ERR.cone.position.set(ERR.x, 0.07, ERR.z);
        ERR.cone.rotation.z = ERR.a - PI / 2;
        ERR.cone.material.opacity = ERR.t < 0.9 ? 0.18 + 0.22 * Math.abs(Math.sin(time * 14)) : 0;
        if (ERR.t > 0.9 && !ERR.swung) {
          ERR.swung = true;
          errAnim("2H_Melee_Attack_Spin", true, 1.3);
          SND.swing(3);
          fxBurst(ERR.x + Math.sin(ERR.a) * 4, 1.2, ERR.z + Math.cos(ERR.a) * 4, { n: 24, speed: 6, life: 0.4, size: 0.35, color: "#b8ab8f", grav: 6 });
          const fa = Math.atan2(Math.sin(face - ERR.a), Math.cos(face - ERR.a));
          if (d < 7.5 && Math.abs(fa) < 1.5 && P.y < 3) errSweepHit();
        }
        if (ERR.t > 1.7 && ERR.state === "sweep") {
          ERR.state = "idle";
          ERR.t = 0;
        }
        break;
      }
      case "down": {
        ERR.g.position.y = -1.7 * Math.min(1, ERR.t * 3);
        if (ERR.t > ERR.downT) {
          ERR.g.position.y = 0;
          ERR.state = "rise";
          ERR.t = 0;
          errAnim("Idle");
        }
        break;
      }
      case "rise":
      case "roar": {
        ERR.g.position.y = 0;
        if (ERR.t > (ERR.state === "roar" ? 1.8 : 0.6)) {
          ERR.state = "idle";
          ERR.t = 0;
        }
        break;
      }
    }
    if (ERR.state !== "sweep") ERR.cone.material.opacity = 0;
    ERR.x = clamp(ERR.x, R.x - 15, R.x + 15);
    ERR.z = clamp(ERR.z, R.z - 15, R.z + 15);
    ERR.g.position.x = ERR.x;
    ERR.g.position.z = ERR.z;
    ERR.g.rotation.y = ERR.a;
    BOSS.lockable.x = ERR.x;
    BOSS.lockable.z = ERR.z;
    BOSS.lockable.y = 0;
    for (let i = ERR.waves.length - 1; i >= 0; i--) {
      const W = ERR.waves[i];
      W.r += W.sp * dt;
      W.m.scale.setScalar(W.r);
      W.m.position.set(W.x, 0.15, W.z);
      W.m.material.opacity = clamp(1 - W.r / 30, 0, 0.9);
      const pd = Math.hypot(P.x - W.x, P.z - W.z);
      if (Math.abs(pd - W.r) < 0.7 && P.y < 0.9 && P.dashT <= 0 && !P.climb) playerHit(1, W.x, W.z);
      if (W.r > 30) {
        W.m.parent && W.m.parent.remove(W.m);
        ERR.waves.splice(i, 1);
      }
    }
  }
  BOSSK.errolan = {
    vulnerable: () => ERR.state === "down" && ERR.t > 0.45,
    weak: () => {
      ERR.core.getWorldPosition(EV);
      return { x: EV.x, y: EV.y, z: EV.z };
    },
    center: () => ({ x: ERR.x, y: 0, z: ERR.z, h: 12, r: 3.4 }),
    /* itzulitako harkaitza */
    stagger: () => {
      if (["idle", "lift", "throw", "slam", "sweep"].includes(ERR.state)) errDown(3.8, L("Harkaitza itzuli diozu! Belauniko: bihotza agerian!"), "reflect");
    },
    /* TXIMISTARRIA: harkaitza altxatuta duela, oinetan → harkaitza buruan */
    bomb: (x, y, z) => {
      const dd = Math.hypot(x - ERR.x, z - ERR.z);
      if (ERR.state === "lift" && dd < 6.5) {
        fxBurst(ERR.rock.position.x, ERR.rock.position.y, ERR.rock.position.z, { n: 50, speed: 7, up: 2, life: 1.1, size: 0.55, color: "#9a917f", grav: 10 });
        SND.crumble();
        shake(0.6);
        errDown(4.6, L("Trumoia! Harkaitza buruan erori zaio: bihotza agerian!"), "bomb");
      } else if (dd < 6 && ERR.state !== "down") notifyOnce("err-bomb-early", L("Trumoiak ez dio minik egiten… harkaitza altxatzen duenean, bai!"), "");
    },
    bombAim: () => {
      if (ERR.state !== "lift") return null;
      const dx = P.x - ERR.x,
        dz = P.z - ERR.z,
        d = Math.max(1, Math.hypot(dx, dz));
      return { x: ERR.x + (dx / d) * 2.4, y: 0, z: ERR.z + (dz / d) * 2.4 };
    },
    hit: (n) => {
      if (!BOSS.vulnerable()) return;
      ERR.hp -= n;
      const w = BOSS.weak();
      FB.bossHit(w.x, w.y, w.z);
      damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.4 }, n);
      bossBar("ERROLAN", (ERR.rounds - 1 + Math.max(0, ERR.hp) / ERR_HP) / 3);
      if (ERR.hp <= 0) {
        ERR.rounds--;
        ERR.hp = ERR_HP;
        if (ERR.rounds <= 0) return errDefeat();
        ERR.state = "roar";
        ERR.t = 0;
        ERR.g.position.y = 0;
        SND.roar();
        shake(0.7);
        slowmo = 0.5;
        errAnim("Taunt", true, 0.8);
        ERR.waves.push({ x: ERR.x, z: ERR.z, r: 2, sp: 14, m: errWaveMesh() });
        spawnWave([["grunt", -1, ERR.rounds === 2 ? 2 : 3]], DGJ.bossRoom);
        notify(ERR.rounds === 2 ? L("Haserre dago! Itzalak deitu ditu…") : L("Azken aldia! Ekaitza bera dirudi!"), "", 3);
      }
    },
  };
  function errDefeat() {
    BOSS.dead = true;
    ERR.state = "freed";
    for (const W of ERR.waves) W.m.parent && W.m.parent.remove(W.m);
    ERR.waves.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    ERR.g.position.y = 0;
    ERR.rock.visible = false;
    ERR.cone.material.opacity = 0;
    say(
      [
        ["· · ·", "Bularretik itzal bat atera zaio, ekaitz-hodei txiki bat bezala, eta harrien artean desagertu da.", "", ERR.x, ERR.z, 8],
        ["ERROLAN", "…Isiltasuna. Mende askoan lehen aldiz, ez dago trumoirik nire buruan.", "", ERR.x, ERR.z, 9],
        ["ERROLAN", "Gauekok ekaitz bat sartu zidan bularrean. Jentilen indarra bere alde nahi zuen: harriak jaurti, mendiak astindu…", "", ERR.x, ERR.z, 9],
        ["AMAIUR", "Lau zaindari askatuta. Hiru falta dira. Non daude?", "", P.x, P.z, 0],
        ["ERROLAN", "Anboton, hodeien gainean: jentilen zeruan. Haizeak eta trumoiak han dute etxea, eta Mariren sua ere hara eraman zuten.", "", ERR.x, ERR.z, 9],
        ["ERROLAN", "Gorde tximista-harria, sorgin txikia. Ekaitzak zure alde jo dezala.", "", ERR.x, ERR.z, 9],
      ],
      () => {
        errFreed();
        saved.hearts = Math.max(saved.hearts, 4);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("errolan");
        persist();
        itemGet("bihotza", L("ERROLANEN BIHOTZA"), L("Arnasa bat gehiago. Jentilen hiriak lo egin dezake berriro, lasai."), () => {
          title("ERROLAN ASKE", "");
          notify(L("Irten hegoaldeko arkutik. Herrian, Irati zain."), "", 6);
          hud();
        });
      },
    );
  }
  function errFreed(instant) {
    BOSS.on = false;
    ERR.state = "freed";
    if (!ERR.g) return;
    ERR.g.position.y = 0;
    ERR.root.traverse((n) => {
      if (n.isMesh && n.material.emissive && n.material !== ERR.core.material) {
        n.material.color.set("#b9ae98");
        n.material.emissive.set("#000000");
      }
    });
    ERR.eyeMat.color.set("#ffd27a");
    ERR.core.visible = false;
    ERR.light.color.set("#ffe2b0");
    errAnim("Idle");
    if (!instant) fxRing(ERR.x, 0.2, ERR.z, "#9dffc4", 18, 1.4);
  }
  /* bossUpdate eta bossReset-etik */
  function jentilBossUpdate(dt) {
    errolanUpdateBoss(dt);
  }
  function jentilReset() {
    if (BOSS.on && BOSS.kind === "errolan" && !BOSS.dead) {
      BOSS.on = false;
      for (const W of ERR.waves) W.m.parent && W.m.parent.remove(W.m);
      ERR.waves.length = 0;
      ERR.rock.visible = false;
      ERR.cone.material.opacity = 0;
      const R = DGJ.bossRoom;
      Object.assign(ERR, { state: "sleep", t: 0, x: R.x, z: R.z - 9, a: 0 });
      if (ERR.g) {
        ERR.g.position.set(ERR.x, 0, ERR.z);
        ERR.g.rotation.y = 0;
      }
      errAnim("Idle");
      bossBar(null);
    }
  }
  /* leizeko helburuak (HUD + markatzailea) */
  DGJ.objective = () => {
    const R = DGJ.rooms,
      it = (k) => saved.items.includes(k);
    if (!isCleared("jB-bells"))
      return ROOM.cur === R.J2 ? ["Hiru kanpaia sarearen atzean: jo denak elkarren segidan (bat ORAINEAN bakarrik ikusten da).", [R.J2.x + 11, 0, 9.6]] : ["Ekialdeko ertz garaia: HEURA, IRAGANEAN bizirik. Igo eta ekialdera.", [R.J1.x + 10, 3.6, 0]];
    if (!isCleared("J3")) return ["Harresia: jentilen zaindariak. Kolpea iristean, ALDARATU.", [R.J3.x, R.J3.z, 6]];
    if (!saved.doors.includes("jC-e") && !(saved.keyz.jentil > 0)) return ["Kutxa: harresiaren erdian.", [R.J3.x, R.J3.z, 6]];
    if (!saved.doors.includes("jC-e")) return ["Harresiaren ekialdeko atea: giltza txikia.", [R.J3.x + 13, R.J3.z, 6]];
    if (!isCleared("jD-mini")) return ["Harri-zainaren gela. Zaindaria esnatuko da.", [R.J4.x, R.J4.z, 6]];
    if (!it("tximistarria")) return ["Kutxa ireki: gelaren hegoaldean.", [R.J4.x, -30, 6]];
    if (!it(DGJ.bigKey)) {
      if (!isCleared("jE-crack")) {
        if (!isCleared("jC-crack") && ROOM.cur !== R.J0) return ["Harresiaren mendebaldeko harri arrakalatua: TXIMISTARRIA (urrun egon!). Beherago, atalasea.", [R.J3.x - 13, R.J3.z, 6]];
        return ["Atalaseko mendebaldeko harri arrakalatua: TXIMISTARRIA.", [R.J0.x - 13, R.J0.z, 0]];
      }
      if (!isCleared("jF-crack")) return ["Dorrea: igo zutabea HEURAz (iraganean); goitik, harri arrakalatua TXIMISTAz.", [R.J6.x, R.J6.z + 4.4, 0]];
      return ["Lau kanpaiak batera, zutabearen gainetik (bat ORAINEAN).", [R.J6.x, R.J6.z, 12]];
    }
    if (!saved.flags.includes("errolan")) return saved.doors.includes("jD-n") ? ["Errolan, jentil iluna. Harkaitza altxatzen duenean: TXIMISTARRIA!", [R.J7.x, R.J7.z + 14, 0]] : ["Atalaseko ate handia: giltza nagusia.", [R.J0.x, R.J0.z - 13, 0]];
    return ["Irten hegoaldeko arkutik.", [DGJ.exitArch.x, DGJ.exitArch.z, 0]];
  };

  /* ---------------- HARRESPILAKO TRIKUHARRIA: jentilen atea (haranean) ---------------- */
  const DOL = { g: null, cap: null, hole: null, glow: null, t: 0, x: 45, z: -69.5, y: 9 };
  function dolmenBuild() {
    zoneBuild("ibarra");
    const { x, y, z } = DOL,
      g = new T.Group(),
      st = stackMaterial();
    g.position.set(x, y, z);
    BP.add(g);
    for (const [px, pz, w, d] of [[-1.6, 0.1, 0.55, 3.3], [1.6, 0.1, 0.55, 3.3], [0, -1.6, 3.7, 0.55]]) {
      const s = new T.Mesh(new T.BoxGeometry(w, 2.9, d), st);
      s.position.set(px, 1.45, pz);
      s.rotation.z = px * 0.015;
      s.castShadow = s.receiveShadow = true;
      g.add(s);
    }
    const cap = new T.Mesh(new T.BoxGeometry(4.8, 0.7, 4.4), st);
    cap.castShadow = true;
    g.add(cap);
    const hole = new T.Mesh(new T.PlaneGeometry(2.3, 2.6), new T.MeshBasicMaterial({ color: "#04060a" }));
    hole.rotation.x = -PI / 2;
    hole.position.set(0, 0.05, 0.1);
    g.add(hole);
    const glowS = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffc27a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glowS.scale.setScalar(3.2);
    glowS.position.set(0, 0.6, 0.1);
    g.add(glowS);
    for (const [sx, sz] of [[-1.6, -1], [-1.6, 1.2], [1.6, -1], [1.6, 1.2], [-1, -1.6], [1, -1.6]]) solids.push({ x: x + sx, z: z + sz, r: 0.5, h: 3, y, pillar: true });
    Object.assign(DOL, { g, cap, hole, glow: glowS });
    DOL.t = saved.flags.includes("jentilatea") ? 1 : 0;
    dolmenPose(DOL.t);
  }
  function dolmenPose(k) {
    DOL.cap.position.set(0, 3.25 + k * 0.25, 0.15 - k * 2.7);
    DOL.cap.rotation.set(0.05 - k * 0.32, 0.1, -0.04);
    DOL.hole.visible = k > 0.3;
    DOL.glow.material.opacity = k * 0.55;
  }
  /* ESNATU trikuharriaren ondoan */
  function dolmenWake() {
    if (ZONE.cur !== "ibarra" || !DOL.g || Math.hypot(P.x - DOL.x, P.z - DOL.z) > 11 || P.y < 7) return 0;
    if (saved.flags.includes("jentilatea")) return 0;
    if (!saved.flags.includes("irati-tartalo")) {
      notify(L("Trikuharriak dardara egin du… baina lo jarraitzen du. Oraindik ez da bere garaia."), "", 4);
      return 1;
    }
    flagSet("jentilatea");
    DOL.t = 0.0001;
    SND.wake();
    shake(0.45);
    title("JENTILEN ATEA", "");
    notify(L("Trikuharriaren harria mugitu da: azpian, eskailerak. JENTILBARATZA."), "", 5);
    return 1;
  }
  function dolmenUpdate(dt) {
    if (!DOL.g) return;
    if (DOL.t > 0 && DOL.t < 1) {
      DOL.t = Math.min(1, DOL.t + dt * 0.45);
      dolmenPose(smooth01(DOL.t));
      if (Math.random() < dt * 18) fxBurst(DOL.x + (Math.random() - 0.5) * 4, DOL.y + 3, DOL.z - 1, { n: 2, speed: 1.5, up: 1, life: 0.8, size: 0.3, color: "#a89c86", grav: 6 });
      return;
    }
    if (DOL.t >= 1 && !ZONE.pending && !cinematic && Math.hypot(P.x - DOL.x, P.z - (DOL.z + 0.1)) < 1.6 && P.y > 8) enterZone("jentil", { ...DGJ.entry, cp: true });
  }
