  /* ==================================================================
     HERENSUGEAREN HAITZULOA · seigarren leizea (diseinu propioa) — sua, laba eta argia
     Hodeien beste aldean, SUGE-MENDIA: haren barruan, Herensugea, zazpi burukoa.
     Odeiren hodei zuriak (zeruko ortzadarraren muturrean) eramaten zaitu hara.
       H1 Suge-mendiaren ahoa .. SUTONDOA; sare beltza iparrean (SUAk erretzen du);
                                 sabaiko arrakala: argi-zutabe bat… zertarako?
       H2 Laba-arroila ......... ORAINEAN laba gogortuta (lurrazala) erdiko harkaitzera;
                                 IRAGANEAN beroa gora (haize-zutabea): ENARAz ertz garaira.
                                 Mendebaldean, apal garai bat (arnasa-zatia). Saguzarrak.
       H3 Saguzarren habia ..... borroka → GILTZA TXIKIA; bigarren SUTONDOA; ekialdean barrak
                                 (kristal urrea atzean); iparrean ate handia
       H4 Ispilu-zainaren gela . etsai ertaina → EGUZKI-ISPILUA; kristal zuria (saria)
       H5 Ispiluen aretoa ...... bi ispilu-harri BIRATU; sare beltza EGUZKIAz erre, gero
                                 ILARGIAz kristal urdina → barrak (iparrean)
       H6 Kristalen gela ....... hiru kristal (urrea, urdina, zuria): denak piztuta → GILTZA NAGUSIA
       H7 Herensugearen habia .. HERENSUGEA, zazpi buru: begietara argia → burua lurrera →
                                 eztarriko itzal-harria jo
     ================================================================== */
  const SGX = 2400,
    SGY = 6;
  const DGH = {
    id: "herensuge",
    num: "06",
    entry: { x: SGX, y: 0, z: 8.5, a: PI },
    exitArch: { x: SGX, z: 12.2 },
    /* irteera: Odeiren hodeia zain (zeruan, ortzadarraren muturrean) */
    exitZone: "zerua",
    exitTo: () => ({ x: ZE(4.2), y: 0, z: 6.2, a: 0, cp: true }),
    bigKey: "giltzanagusia-herensuge",
    bigKeyText: "Herensugearen habiara daraman ate handia irekitzen du.",
    bossDoor: "hC-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ff8a3a", "#ffc890"],
    tint: "#d6a58a",
    fog: [11, 66],
  };
  const HZ = { lava: [], bats: {}, cloud: null, cloudT: 0, seenCloud: false };

  /* ------------------------------ eraikigaiak ------------------------------ */
  let LAVA_TEX = null;
  /* laba: Voronoi mosaikoa (ertzetan errepikatzen da) — plaka ilunak eta arrakala distiratsuak.
     IRAGANEAN distira handiz (dena urtuta), ORAINEAN gutxiagoz (plakak gogortuta) */
  function lavaTexture() {
    if (LAVA_TEX) return LAVA_TEX;
    const N = 128,
      c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d"),
      img = g.createImageData(N, N);
    let sd = 11;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const pts = [];
    for (let i = 0; i < 26; i++) pts.push([rnd() * N, rnd() * N, rnd()]);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let d1 = 1e9,
          d2 = 1e9,
          v = 0;
        for (const [px, py, pv] of pts) {
          let dx = Math.abs(x - px),
            dy = Math.abs(y - py);
          dx = Math.min(dx, N - dx);
          dy = Math.min(dy, N - dy);
          const d = dx * dx + dy * dy;
          if (d < d1) (d2 = d1), (d1 = d), (v = pv);
          else if (d < d2) d2 = d;
        }
        const edge = Math.sqrt(d2) - Math.sqrt(d1),
          crack = Math.max(0, 1 - edge / 3.2),
          plate = 0.3 + v * 0.16 + Math.max(0, 1 - Math.sqrt(d1) / 14) * 0.12,
          k = Math.min(1, plate + crack * 0.85),
          i = (y * N + x) * 4;
        img.data[i] = 255 * Math.min(1, k * 1.25);
        img.data[i + 1] = 255 * Math.pow(k, 1.9) * 0.9;
        img.data[i + 2] = 255 * Math.pow(k, 4) * 0.5;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    LAVA_TEX = new T.CanvasTexture(c);
    LAVA_TEX.wrapS = LAVA_TEX.wrapT = T.RepeatWrapping;
    return LAVA_TEX;
  }
  /* laba-putzua: ukitzean, erre (azken lur segurura) */
  function lavaPool(x, z, w, d, y) {
    const tex = lavaTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(w / 11, d / 11);
    const mat = new T.MeshStandardMaterial({ color: "#2a0602", emissive: new T.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 1.5, roughness: 0.6 });
    const geo = new T.PlaneGeometry(w, d);
    geo.rotateX(-PI / 2);
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    BP.add(m);
    /* distira (argi errealak zuzi bezala: hurbilenek argia hartzen dute) */
    for (let i = 0; i < Math.max(1, Math.round(w / 14)); i++) {
      const gx = x - w / 2 + (i + 0.5) * (w / Math.max(1, Math.round(w / 14))),
        fl = glow(gx, y + 0.8, z, "#ff6a1a", 9);
      DGH.torches.push({ x: gx, y: y + 1.6, z, fl, ph: gx, side: null });
    }
    const L0 = { x, z, w, d, y, m, mat, tex };
    HZ.lava.push(L0);
    return L0;
  }
  /* lurrazala (ORAINEAN): laba gogortua, harri beltza arrakala gorriekin */
  function crust(x, z, w, d, y = 0) {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const top = new T.Mesh(new T.BoxGeometry(w, 0.5, d), new T.MeshStandardMaterial({ color: "#2b2522", roughness: 0.95, flatShading: true, emissive: new T.Color("#ff4a12"), emissiveIntensity: 0.18 }));
    top.position.y = -0.25;
    top.receiveShadow = true;
    g.add(top);
    for (let i = 0; i < 4; i++) {
      const crack = new T.Mesh(new T.BoxGeometry(w * (0.3 + (i % 2) * 0.3), 0.04, 0.08), material("#ff6a1a", 2.2));
      crack.position.set((i - 1.5) * w * 0.12, 0.01, (i - 1.5) * d * 0.22);
      crack.rotation.y = i * 0.9;
      g.add(crack);
    }
    const ghost = new T.Mesh(new T.BoxGeometry(w, 0.5, d), new T.MeshBasicMaterial({ color: "#88dded", wireframe: true, transparent: true, opacity: 0.16 }));
    ghost.position.set(x, y - 0.25, z);
    BP.add(ghost);
    const p = { x, z, y, bottom: y - 0.5, w, d, phase: 1, m: g, ghost, safe: false };
    platforms.push(p);
    phaseObjects.push(p);
    return p;
  }
  /* herensugearen altxorra: txanpon-pilak */
  function hoard(x, z, y, n, r = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + x,
        d = r * Math.sqrt((i + 0.5) / n);
      bprop(i % 3 ? "coin_stack_small" : "coin", x + Math.cos(a) * d, y, z + Math.sin(a) * d, DS * (0.7 + (i % 4) * 0.12), a);
    }
    glow(x, y + 0.4, z, "#ffd36a", 2.2 + r);
  }
  /* sutako marka beltzak lurrean */
  function scorch(x, z, y, r) {
    const m = new T.Mesh(new T.CircleGeometry(r, 18), new T.MeshBasicMaterial({ color: "#000000", map: glowTexture, transparent: true, opacity: 0.55, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(x, y + 0.03, z);
    BP.add(m);
  }
  /* herensuge baten garezurra (hezurra, apaingarria) */
  function dragonSkull(x, z, y, rot, s = 1) {
    const g = new T.Group(),
      bone = material("#e0d4ba");
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    BP.add(g);
    const parts = [
      [new T.BoxGeometry(1.5, 1.1, 2.1), 0, 0.7, 0],
      [new T.BoxGeometry(1.0, 0.55, 1.6), 0, 0.5, 1.7],
      [new T.BoxGeometry(1.1, 0.25, 2.2), 0, 0.12, 1.2],
    ];
    for (const [geo, px, py, pz] of parts) {
      const m = new T.Mesh(geo, bone);
      m.position.set(px, py, pz);
      m.castShadow = true;
      g.add(m);
    }
    for (const sx of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(0.22, 1.5, 6), bone);
      horn.position.set(sx * 0.5, 1.5, -0.7);
      horn.rotation.x = -0.9;
      horn.rotation.z = sx * -0.3;
      g.add(horn);
      const eye = new T.Mesh(new T.CircleGeometry(0.22, 8), material("#120a08"));
      eye.position.set(sx * 0.76, 0.85, 0.4);
      eye.rotation.y = sx * PI / 2;
      g.add(eye);
    }
    for (let i = 0; i < 5; i++) {
      const tooth = new T.Mesh(new T.ConeGeometry(0.07, 0.3, 4), bone);
      tooth.position.set(-0.4 + i * 0.2, 0.1, 2.3);
      tooth.rotation.x = PI;
      g.add(tooth);
    }
    solids.push({ x, z, r: 1.3 * s, h: 1.6 * s, y, pillar: true });
    return g;
  }

  /* ================================ GELAK ================================ */
  function buildHerensuge() {
    dungeonBegin(DGH);
    const E = (x) => SGX + x;
    /* ---- H1: Suge-mendiaren ahoa ---- */
    room("H1", E(0), 0, 30, 24, { area: "hA", name: "SUGE-MENDIAREN AHOA", desc: "Kea, sufrea eta urrea. Hemen, norbaitek zazpi aldiz arnasa hartzen du.", doors: { s: 0, n: 0 } });
    slab({ x: E(0), z: 15, y: 0, w: 6, d: 6, h: 1.2, mat: "dark" });
    wallBlock(E(-3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(0), 18.2, 6, 0.8, 0, 0, 7);
    const arch = obj(new T.PlaneGeometry(5, 5.6), new T.MeshBasicMaterial({ color: "#f2f6fb", transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    arch.position.set(E(0), 2.8, 17.6);
    DGH.exitGlow = arch;
    DGH.hearthA = sutondoa("hA-su", E(-9), 0, 3.5, 1.9, 1.4);
    shadowWeb({ id: "hA-sarea", x: E(0), z: -12.7, y: 0, w: 6.2, h: 6.6, rot: 0 });
    /* sabaiko arrakala: argi-zutabea (oraindik ezer islatu gabe) */
    DGH.shaftA = lightShaft({ id: "hA-argia", x: E(7), z: -3, kind: "both", r: 1.5 });
    dragonSkull(E(10), 7.5, 0, -2.4, 1.15);
    hoard(E(-10.5), -8, 0, 9, 1.9);
    hoard(E(11.5), -9, 0, 6, 1.3);
    for (const [sx, sz, sr] of [[E(-3), -5, 2.4], [E(4), 4, 1.8], [E(-6), 6.5, 1.5], [E(1), -9, 2]]) scorch(sx, sz, 0, sr);
    bprop("rubble_large", E(-12.5), 0, 9, DS * 0.8, 0.6);
    bprop("rubble_half", E(12.5), 0, -1, DS * 0.7, 1.2);
    breakable("barrel", E(-12.5), 0, -2.5);
    /* ---- H1 → H2 ---- */
    corridor(E(0), -15, 6, 6, "z");
    /* ---- H2: Laba-arroila ---- */
    room("H2", E(0), -36, 30, 36, { area: "hB", name: "LABA-ARROILA", desc: "Iraganean laba bizirik, beroa gora. Orain, lurrazal beltz bat gainean.", doors: { s: 0, n: 0 }, floors: [[E(0), -21, 30, 6]], wallH: 18 });
    lavaPool(E(0), -35, 30, 22, -1);
    /* lurrazala (ORAINEAN) erdiko harkaitzeraino */
    crust(E(-2.2), -26.4, 3.6, 4.8, 0);
    crust(E(-0.8), -30.8, 3.4, 4.8, 0);
    /* erdiko harkaitza (beti) */
    const isle = slab({ x: E(0), z: -36, y: 0, w: 6, d: 6, h: 9, area: "hB" });
    isle.slick = true;
    for (const [rx, rz] of [[E(-2.2), -38.2], [E(2.4), -34]]) bprop("rubble_half", rx, 0, rz, DS * 0.45, rx);
    /* bero-zutabea (IRAGANEAN): ENARAz ertz garaira */
    DGH.heat = updraft({ id: "hB-beroa", x: E(0.4), z: -37, r: 1.8, y0: 0, y1: 10.8, phase: 0, col: "#ffb070", power: 9.2, vent: 0.02 });
    /* iparreko ertz garaia */
    const north = slab({ x: E(0), z: -50, y: SGY, w: 30, d: 8, h: SGY + 1.2, area: "hB" });
    north.slick = true;
    /* mendebaldeko apala: arnasa-zatia */
    const shelf = slab({ x: E(-12), z: -33, y: 7.4, w: 5, d: 6, h: 3.2, area: "hB" });
    shelf.slick = true;
    chest("hB-piece", E(-12.6), 7.4, -33, PI / 2, { t: "piece", id: "herensuge" });
    hoard(E(-11.4), -35.4, 7.4, 4, 0.9);
    for (const [sx, sz] of [[E(-12), -20.5], [E(12.5), -19.5]]) bprop("rubble_large", sx, 0, sz, DS * 0.6, sx);
    /* ---- H2 → H3 (garaian) ---- */
    hallway(E(0), -57, 6, 6, "z", SGY);
    /* ---- H3: Saguzarren habia (borroka) ---- */
    room("H3", E(0), -75, 30, 30, {
      y: SGY,
      area: "hC",
      name: "SAGUZARREN HABIA",
      desc: "Sabaitik zintzilik, milaka begi. Garrasi bat, eta denak hegan.",
      doors: { s: 0, n: 0, w: 0, e: 0 },
      waves: [[["bat", -1, 3]], [["bat", -1, 2], ["grunt", 0, 2]], [["bat", -1, 2], ["brute", 1, 1], ["eye", 0, 1]]],
      diff: 1.2,
      hpK: 1.35,
      fightText: "Saguzarrak! Murgildu aurretik garrasi egiten dute: orduan, ALDARATU edo saihestu.",
      onWin: () => {
        revealChest(DGH.keyChest);
        notify(L("Giltza txiki bat agertu da habiaren erdian."), "", 4);
      },
    });
    DGH.keyChest = chest("hC-key", E(0), SGY, -75, 0, { t: "key" }, { hidden: !isCleared("H3") });
    DGH.hearthC = sutondoa("hC-su", E(-10), SGY, -84.5, 1.8, 1.6);
    DOORDEF.hCw = door("hC-w", E(-15), -75, PI / 2, SGY, "key");
    DOORDEF.hCw.room = "H3";
    DOORDEF.hCe = door("hC-e", E(15), -75, PI / 2, SGY, "bars", "H3");
    DOORDEF.hCn = door("hC-n", E(0), -90, 0, SGY, "boss");
    /* eguzki-zuloa (IRAGANEAN): izpia barren artetik kristal urrera */
    DGH.shaftC = lightShaft({ id: "hC-argia", x: E(6), z: -76.4, y: SGY, kind: "sun", r: 1.5 });
    DGH.crystalC = lightCrystal({
      id: "hC-kristala",
      x: E(18.6),
      z: -76.4,
      y: SGY,
      kind: "sun",
      latch: true,
      onLit: () => {
        openDoor(DOORDEF.hCe);
        title("BARRAK IREKI DIRA", "");
      },
    });
    for (const [sx, sz] of [[E(-11), -66], [E(11.5), -86], [E(-12), -79]]) bprop("rubble_half", sx, SGY, sz, DS * 0.6, sx);
    hoard(E(10.5), -64.5, SGY, 5, 1.1);
    coverBlock(E(-6), -70, 2.6, 1.4, 1.8, SGY, "crates");
    coverBlock(E(7), -82, 1.6, 2.6, 2.2, SGY);
    /* ---- H3 → H4 ---- */
    hallway(E(-18), -75, 6, 6, "x", SGY);
    /* ---- H4: Ispilu-zainaren gela ---- */
    room("H4", E(-36), -75, 30, 30, { y: SGY, area: "hD", name: "ISPILU-ZAINAREN GELA", desc: "Brontzezko ispilu bat, eguzki bat atzean. Zerbaitek zaintzen du.", doors: { e: 0 } });
    DGH.mirrorChest = chest("hD-ispilua", E(-36), SGY, -82, PI, { t: "item", id: "ispilua" }, { hidden: !isCleared("hD-mini") });
    DGH.shaftD = lightShaft({ id: "hD-argia", x: E(-36), z: -69, y: SGY, kind: "both", r: 1.5 });
    DGH.coinChest = chest("hD-txanponak", E(-47.5), SGY, -86, PI / 4, { t: "coins", n: 40 }, { hidden: !isCleared("hD-kristala") });
    lightCrystal({
      id: "hD-kristala",
      x: E(-47.5),
      z: -69,
      y: SGY,
      kind: "any",
      latch: true,
      onLit: () => {
        revealChest(DGH.coinChest);
        notify(L("Kristalak argia hartu du: kutxa bat agertu da hego-mendebaldean."), "", 4);
      },
    });
    hoard(E(-25), -86, SGY, 6, 1.2);
    dragonSkull(E(-26), -66, SGY, 2.2, 0.8);
    /* ---- H3 → H5 ---- */
    hallway(E(18), -75, 6, 6, "x", SGY);
    /* ---- H5: Ispiluen aretoa ---- */
    room("H5", E(36), -75, 30, 30, { y: SGY, area: "hE", name: "ISPILUEN ARETOA", desc: "Ispilu-harri zaharrak. Aurpegiak begiratzen duen norabidean bidaltzen dute argia.", doors: { w: 0, n: 0 } });
    DGH.shaftE = lightShaft({ id: "hE-argia", x: E(25), z: -64, y: SGY, kind: "both", r: 1.5 });
    DGH.mirE1 = mirrorStand({ id: "hE-m1", x: E(25), z: -85.5, y: SGY, a: PI });
    DGH.mirE2 = mirrorStand({ id: "hE-m2", x: E(47), z: -85.5, y: SGY, a: PI / 2 });
    shadowWeb({ id: "hE-sarea", x: E(47), z: -71, y: SGY, w: 6.4, h: 4.4, rot: 0 });
    DOORDEF.hEn = door("hE-n", E(36), -90, 0, SGY, "bars");
    DGH.crystalE = lightCrystal({
      id: "hE-kristala",
      x: E(47),
      z: -64.5,
      y: SGY,
      kind: "moon",
      latch: true,
      onLit: () => {
        openDoor(DOORDEF.hEn);
        title("BARRAK IREKI DIRA", "");
        notify(L("Ilargiaren argiak iparreko barrak ireki ditu."), "", 3.5);
      },
    });
    for (const [sx, sz] of [[E(34), -78], [E(40), -70]]) scorch(sx, sz, SGY, 1.6);
    hoard(E(48), -79.5, SGY, 4, 0.9);
    bprop("rubble_large", E(23.5), SGY, -76, DS * 0.6, 0.4);
    /* ---- H5 → H6 ---- */
    hallway(E(36), -93, 6, 6, "z", SGY);
    /* ---- H6: Kristalen gela ---- */
    room("H6", E(42), -111, 30, 30, { y: SGY, area: "hF", name: "KRISTALEN GELA", desc: "Hiru kristal, hiru argi. Herensugeak bere giltza hemen gordetzen du.", doors: { s: -6 } });
    DGH.shaftF = lightShaft({ id: "hF-argia", x: E(42), z: -111, y: SGY, kind: "both", r: 1.5 });
    /* iparrean zutabe bat: kristal urrea zuzenean ezin da jo */
    const col = obj(new T.CylinderGeometry(0.9, 1.1, 7, 9), stackMaterial());
    col.position.set(E(42), SGY + 3.5, -116.5);
    solids.push({ x: E(42), z: -116.5, r: 1.1, h: 7, y: SGY, pillar: true });
    DGH.mirF = [
      mirrorStand({ id: "hF-ma", x: E(34), z: -111, y: SGY, a: (3 * PI) / 2 }),
      mirrorStand({ id: "hF-mb", x: E(34), z: -122, y: SGY, a: PI }),
      mirrorStand({ id: "hF-mc", x: E(42), z: -102.5, y: SGY, a: PI }),
    ];
    shadowWeb({ id: "hF-sarea", x: E(48), z: -111, y: SGY, w: 6.4, h: 4.4, rot: PI / 2 });
    const cA = lightCrystal({ id: "hF-ka", x: E(42), z: -122, y: SGY, kind: "sun", latch: true }),
      cB = lightCrystal({ id: "hF-kb", x: E(53), z: -111, y: SGY, kind: "moon", latch: true }),
      cC = lightCrystal({ id: "hF-kc", x: E(53), z: -102.5, y: SGY, kind: "any", latch: true });
    DGH.crystalsF = [cA, cB, cC];
    crystalSet("hF-kristalak", DGH.crystalsF, () => {
      revealChest(DGH.bigChest);
      title("HIRU ARGIAK", "");
      notify(L("Hiru kristalak piztuta! Kutxa handi bat agertu da hego-mendebaldean."), "", 4.5);
    });
    DGH.bigChest = chest("hF-bigkey", E(31.5), SGY, -99.5, PI / 4, { t: "bigkey" }, { hidden: !isCleared("hF-kristalak") });
    hoard(E(54), -123, SGY, 7, 1.4);
    hoard(E(30), -124, SGY, 5, 1.1);
    /* ---- H3 → H7 ---- */
    hallway(E(0), -93, 6, 6, "z", SGY);
    /* ---- H7: Herensugearen habia ---- */
    room("H7", E(0), -117, 42, 42, { y: SGY, area: "hG", name: "HERENSUGEAREN HABIA", desc: "Urrea, kea eta zazpi arnasa. Laba-aintziran, zerbait mugitzen da.", doors: { s: 0 }, floors: [[E(0), -111, 42, 30]], wallH: 22 });
    lavaPool(E(0), -132, 42, 12, SGY - 1.4);
    /* argi-zutabeak eta estalpeak (su-arnasaren aurka) */
    DGH.shaftsH = [[-12, -104], [12, -104], [-15, -117.5], [15, -117.5]].map(([sx, sz], i) => lightShaft({ id: "hG-argia" + i, x: E(sx), z: sz, y: SGY, kind: "both", r: 1.45 }));
    /* estalpe baxuak: su-arnasatik babesten dute; ISPILUAren argia gainetik pasatzen da */
    for (const [cx, cz, w, d] of [[-7, -108.5, 2.4, 1.4], [7, -108.5, 2.4, 1.4], [-18, -110.5, 1.4, 2.4], [18, -110.5, 1.4, 2.4], [0, -116, 2.8, 1.4]]) coverBlock(E(cx), cz, w, d, 1.5, SGY);
    for (const [sx, sz, sr] of [[-4, -112, 2.6], [9, -118, 2.2], [-11, -121, 2], [3, -101, 1.6]]) scorch(E(sx), sz, SGY, sr);
    hoard(E(-17), -123, SGY, 8, 1.6);
    hoard(E(17.5), -123.5, SGY, 8, 1.6);
    DGH.bossRoom = DGH.rooms.H7;
    zbBuild();
    odeiCloudBuild();
    skyDragonBuild();
    dungeonEnd(DGH);
  }

  /* ----------------------- ODEIREN HODEIA (zeruan, Z1) ----------------------- */
  function odeiCloudBuild() {
    const g = new T.Group(),
      mat = new T.MeshStandardMaterial({ color: "#f6f9fc", emissive: new T.Color("#cfe3f5"), emissiveIntensity: 0.3, roughness: 1, flatShading: true });
    const geo = puffGeo(1.7, 7, 3.1, 0.55);
    const puffs = new T.Mesh(geo, mat);
    puffs.castShadow = true;
    g.add(puffs);
    /* aurpegi txikia (Odei, lasai) */
    for (const sx of [-1, 1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), material("#3a4660"));
      eye.position.set(sx * 0.42, 0.25, 1.55);
      g.add(eye);
    }
    const mouth = new T.Mesh(new T.TorusGeometry(0.18, 0.04, 5, 10, PI), material("#3a4660"));
    mouth.position.set(0, -0.05, 1.6);
    mouth.rotation.z = PI;
    g.add(mouth);
    g.position.set(ZE(7.2), 1.1, 3.6);
    g.visible = false;
    ZONES.zerua.group.add(g);
    HZ.cloud = g;
  }
  function odeiCloudNear() {
    if (ZONE.cur !== "zerua" || !HZ.cloud || !HZ.cloud.visible) return null;
    if (Math.hypot(P.x - HZ.cloud.position.x, P.z - HZ.cloud.position.z) > 3.4 || P.y > 3) return null;
    return { kind: "talk", label: L("HODEIA"), fn: odeiCloudRide };
  }
  function odeiCloudRide() {
    const go = () => {
      SND.whoosh();
      title("SUGE-MENDIA", "");
      enterZone("herensuge", { ...DGH.entry, cp: true });
    };
    if (HZ.seenCloud || flag("suge-mendia")) return go();
    HZ.seenCloud = true;
    const c = HZ.cloud.position;
    say(
      [
        ["ODEI", "Sorgin. Nire zati txiki bat utzi dizut hemen: hodei zuri bat, euri-usaina duena.", "", c.x, c.z, c.y],
        ["ODEI", "Hodeien beste aldean, SUGE-MENDIA. Haren barruan, Herensugea: zazpi buru, zazpi su. Argiak bakarrik ikaratzen ditu haren begiak.", "", c.x, c.z, c.y],
        ["AMAIUR", "Eraman nazazu, beraz. Argia aurkituko dut.", "", P.x, P.z, P.y],
      ],
      () => {
        flagSet("suge-mendia");
        go();
      },
    );
  }
  function odeiCloudUpdate(dt) {
    if (!HZ.cloud) return;
    HZ.cloud.visible = flag("odei");
    if (!HZ.cloud.visible || ZONE.cur !== "zerua") return;
    HZ.cloudT += dt;
    HZ.cloud.position.y = 1.1 + Math.sin(HZ.cloudT * 1.3) * 0.18;
    const fa = Math.atan2(P.x - HZ.cloud.position.x, P.z - HZ.cloud.position.z);
    HZ.cloud.rotation.y += Math.atan2(Math.sin(fa - HZ.cloud.rotation.y), Math.cos(fa - HZ.cloud.rotation.y)) * Math.min(1, dt * 2);
    if (Math.random() < dt * 3) fxBurst(HZ.cloud.position.x + (Math.random() - 0.5) * 2.4, HZ.cloud.position.y - 0.8, HZ.cloud.position.z + (Math.random() - 0.5) * 2, { n: 1, speed: 0.1, up: -3, life: 0.8, size: 0.07, color: "#bfe6ff", grav: 5 });
  }

  /* ------------------------------ eguneratzea ------------------------------ */
  /* saguzar-taldea gune batean (behin bisita bakoitzean) */
  function batsOnce(key, n, x, z, y, R) {
    if (HZ.bats[key] || ROOM.fight || cinematic) return;
    HZ.bats[key] = true;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.6,
        e = spawnEnemy("bat", -1, x + Math.cos(a) * 3.2, z + Math.sin(a) * 2.4, y);
      e.room = R;
      e.K = 1.1;
    }
    SND.screech();
    notifyOnce("saguzarrak", L("Saguzarrak! Murgildu aurretik garrasi egiten dute. Argiak (ISPILUA) lurrera botatzen ditu."), "");
  }
  function lavaUpdate(dt) {
    for (const L0 of HZ.lava) {
      if (L0.m.parent !== ZONES[ZONE.cur].group) continue;
      L0.tex.offset.x += dt * 0.012;
      L0.tex.offset.y += dt * 0.02;
      L0.mat.emissiveIntensity = mix(L0.mat.emissiveIntensity, phase ? 0.78 : 1.45, 1 - Math.exp(-dt * 3)) + Math.sin(time * 2 + L0.x) * 0.02;
      if (Math.random() < dt * 4 * (phase ? 0.4 : 1)) fxBurst(L0.x + (Math.random() - 0.5) * L0.w, L0.y + 0.1, L0.z + (Math.random() - 0.5) * L0.d, { n: 3, speed: 1.2, up: 3, life: 0.7, size: 0.18, color: "#ffb347", grav: 7 });
      /* ukitu: erre */
      if (!respawnTimer && Math.abs(P.x - L0.x) < L0.w / 2 && Math.abs(P.z - L0.z) < L0.d / 2 && P.y < L0.y + 0.2) {
        fxBurst(P.x, L0.y + 0.3, P.z, { n: 30, speed: 4, up: 5, life: 0.8, size: 0.4, color: "#ff7a2a", grav: -1 });
        SND.flame();
        haptic(40);
        notifyOnce("laba", L("Laba! Iraganean bizirik dago; orainean, lurrazal gogorra bakarrik ibiltzeko."), "");
        fall();
      }
    }
  }
  DGH.update = (dt) => {
    hearthsUpdate(dt);
    lavaUpdate(dt);
    const R = DGH.rooms;
    /* argi-zutabea ispilurik gabe: pista */
    const S = shaftAt(P.x, P.z, P.y);
    if (S && shaftLight(S) && !saved.items.includes("ispilua") && P.grounded) notifyOnce("argia-ispilurik-gabe", L("Argi-zutabe bat sabaiko arrakala batetik. Zerbaitek islatu beharko luke… ispilu batek, agian."), "");
    /* H2: ertz garaira iristean, saguzarrak */
    if (ROOM.cur === R.H2 && P.grounded && P.y > SGY - 0.5 && P.z < -46.5) batsOnce("hB", 2, R.H2.x + 4, -50, SGY, R.H2);
    /* H6: kristalak piztu gabe → saguzarrak */
    if (ROOM.cur === R.H6 && P.grounded && !isCleared("hF-kristalak") && Math.abs(P.z - R.H6.z) < 11) batsOnce("hF", 2, R.H6.x - 6, R.H6.z - 6, SGY, R.H6);
    /* H4: ispilu-zaina */
    const R4 = R.H4;
    if (R4 && !MINI.e && !ROOM.fight && !cinematic && ROOM.cur === R4 && !isCleared("hD-mini") && P.grounded && P.y > SGY - 1 && Math.abs(P.x - R4.x) < R4.w / 2 - 3 && Math.abs(P.z - R4.z) < R4.d / 2 - 3)
      miniBegin(
        R4,
        {
          name: "ISPILU-ZAINA",
          clearId: "hD-mini",
          hp: 40,
          scale: 1.7,
          K: 1.25,
          tint: "#d8b87a",
          add: [["bat", -1, 2]],
          hint: "Ispiluaren zaindaria! Ezkutuak garaia aldatzen du: begiratu begien koloreari. Saguzarrak: murgiltzean, ALDARATU.",
          onDead: () => {
            revealChest(DGH.mirrorChest);
            notify(L("Kutxa bat agertu da gelaren iparrean."), "", 4);
          },
        },
        R4.x,
        R4.z - 4,
      );
    zbUpdate(dt);
  };
  DGH.objective = () => {
    const R = DGH.rooms,
      has = (k) => saved.items.includes(k);
    if (!isCleared("hA-sarea")) return ["Sare beltz batek iparreko pasabidea ixten du. SUA: INDARRA kargatu eta askatu.", [R.H1.x, -11.4, 0]];
    if (!isCleared("H3")) {
      if (ROOM.cur === R.H2 && P.y < SGY - 1) return phase ? ["Lurrazala (ORAINEAN) erdiko harkaitzeraino. Han, IRAGANERA: beroa gora.", [R.H2.x, -36, 0]] : ["Bero-zutabea (IRAGANEAN): jauzi bikoitza eta eutsi JAUZIari → ENARA, iparreko ertzera.", [R.H2.x, -37, 0]];
      return ["Iparrera: saguzarren habia.", [R.H3.x, R.H3.z, SGY]];
    }
    if (!has("ispilua")) {
      if (!saved.doors.includes("hC-w") && !(saved.keyz.herensuge > 0)) return ["Giltza txikia: habiaren erdiko kutxa.", [R.H3.x, R.H3.z, SGY]];
      if (!saved.doors.includes("hC-w")) return ["Mendebaldeko atea: giltza txikia.", [R.H3.x - 13.6, R.H3.z, SGY]];
      return isCleared("hD-mini") ? ["Ispilu-zainaren kutxa ireki.", [R.H4.x, -82, SGY]] : ["Mendebaldean: ispilu-zainaren gela.", [R.H4.x, R.H4.z, SGY]];
    }
    if (!saved.doors.includes("hC-e")) return ["Habiako eguzki-zuloa (IRAGANEAN): ISPILUA, barren artetik kristal urrera.", [DGH.shaftC.x, DGH.shaftC.z, SGY]];
    if (!saved.doors.includes("hE-n")) return ["Ispiluen aretoa: ispilu-harriak BIRATU. Sarea EGUZKIAz, kristal urdina ILARGIAz.", [DGH.shaftE.x, DGH.shaftE.z, SGY]];
    if (!has(DGH.bigKey)) return isCleared("hF-kristalak") ? ["Giltza nagusiaren kutxa.", [DGH.bigChest.x, DGH.bigChest.z, SGY]] : ["Kristalen gela: hiru kristalak piztu (urrea, urdina, zuria).", [DGH.shaftF.x, DGH.shaftF.z, SGY]];
    if (!flag("herensugea")) return saved.doors.includes(DGH.bossDoor) ? ["Herensugearen habia. Argia begietara.", [R.H7.x, R.H7.z + 10, SGY]] : ["Habiako ate handia (iparrean): giltza nagusia.", [R.H3.x, R.H3.z - 13, SGY]];
    return ["Irten haitzulotik: Odeiren hodeia zain.", [DGH.exitArch.x, DGH.exitArch.z, 0]];
  };

  /* ============================ HERENSUGEA (H7) ============================
     Laba-aintziran gorputz erraldoia, zazpi lepo. Buruak txandaka esnatzen dira:
     · HOZKA: atzera bildu eta oldartu → ALDARATU (sakatu une zehatzean) → burua lurrera.
     · SU-ARNASA: arnasa hartu, gero sua alde batetik bestera → ESTALPEAN ezkutatu.
     · SU-BOLAK: parabolan → EZKUTUA (INDARRA kargatzen): itzuli → burua lurrera.
     · ARGIA begietara (ISPILUA, argi-zutabe batean): urrea → EGUZKIA, urdina → ILARGIA.
     Burua lurrean: eztarriko ITZAL-HARRIA agerian → SORGINKERIA. Azken burua (erdikoa):
     begi bat urrea eta bestea urdina — biak itxi behar dira, bata bestearen atzetik.
     ========================================================================= */
  const ZB = { g: null, body: null, wings: [], neckIM: null, spikeIM: null, heads: [], state: "sleep", t: 0, round: 0, seenIntro: false, x: 0, y: 0, z: 0, atkCd: 2, focus: null, marks: [], fires: [], breathCone: null, flash: 0, stats: { light: 0, parry: 0, reflect: 0 } };
  const ZB_SEG = 20,
    ZB_SPK = [3, 7, 11, 15],
    HEAD_HP = 6,
    FINAL_HP = 10;
  const ZB_ROUNDS = [[1, 5], [0, 6], [2, 4], [3]];
  const ZB_EYE = ["sun", "moon", "sun", "both", "moon", "sun", "moon"];
  const EYE_COL = { sun: "#ffc933", moon: "#6fd0ff" };
  const ZV = new T.Vector3(),
    ZM = new T.Matrix4(),
    ZQ = new T.Quaternion(),
    ZS = new T.Vector3(),
    ZC = new T.Color();
  const ZB_UP = new T.Vector3(0, 1, 0);
  function zbBuild() {
    const R = DGH.bossRoom;
    ZB.x = R.x;
    ZB.z = -131.5;
    ZB.y = SGY - 1.6;
    const g = new T.Group();
    g.position.set(ZB.x, ZB.y, ZB.z);
    BP.add(g);
    ZB.g = g;
    const scale = new T.MeshStandardMaterial({ color: "#5c1d18", roughness: 0.5, metalness: 0.18, flatShading: true, emissive: new T.Color("#2a0603"), emissiveIntensity: 0.4 });
    ZB.mat = scale;
    /* gorputza: muino ezkatatsua labatik ateratzen */
    const body = new T.Mesh(new T.SphereGeometry(5, 18, 12), scale);
    body.scale.set(1.35, 0.72, 1.0);
    body.position.y = 0.6;
    body.castShadow = true;
    g.add(body);
    ZB.body = body;
    const belly = new T.Mesh(new T.SphereGeometry(3.4, 14, 10), material("#b0703a", 0.1));
    belly.scale.set(1.3, 0.5, 0.7);
    belly.position.set(0, 0.4, 2.8);
    g.add(belly);
    /* bizkarreko hezur-plakak */
    for (let i = 0; i < 9; i++) {
      const k = i / 8,
        plate = new T.Mesh(new T.ConeGeometry(0.55 - Math.abs(k - 0.4) * 0.4, 1.8 - Math.abs(k - 0.4) * 1.2, 4), material("#2a0e0c"));
      plate.position.set(0, 3.5 - Math.abs(k - 0.35) * 2.2, -4 + k * 6.5);
      plate.rotation.x = -0.35;
      g.add(plate);
    }
    /* hegoak tolestuta (erroretan zabaltzen dira apur bat) */
    const ws = new T.Shape();
    ws.moveTo(0, 0);
    ws.lineTo(1.2, 5.6);
    ws.lineTo(3.4, 6.4);
    ws.quadraticCurveTo(4.2, 4, 6.8, 3.4);
    ws.quadraticCurveTo(5.2, 2.2, 5.6, 0.6);
    ws.quadraticCurveTo(3.6, 0.6, 3.2, -0.6);
    ws.quadraticCurveTo(1.6, 0.4, 0, 0);
    const wingGeo = new T.ShapeGeometry(ws);
    const wingMat = new T.MeshStandardMaterial({ color: "#3d1512", roughness: 0.8, side: T.DoubleSide, emissive: new T.Color("#4a0c06"), emissiveIntensity: 0.35 });
    for (const sx of [-1, 1]) {
      const pivot = new T.Group();
      pivot.position.set(sx * 3.6, 2.4, -0.8);
      const w = new T.Mesh(wingGeo, wingMat);
      w.scale.set(sx, 1, 1);
      w.rotation.y = sx * -0.25;
      w.castShadow = true;
      pivot.add(w);
      pivot.rotation.set(-0.5, sx * 0.4, sx * -0.35);
      g.add(pivot);
      ZB.wings.push(pivot);
    }
    /* buztana labaren azalean */
    for (let i = 0; i < 7; i++) {
      const tail = new T.Mesh(new T.SphereGeometry(1.2 - i * 0.14, 9, 7), scale);
      tail.position.set(Math.sin(i * 0.7) * 2.5 + 3, 0.2 - i * 0.05, -4.5 - i * 1.2);
      g.add(tail);
    }
    /* lepoak (instantziak) eta arantzak */
    ZB.neckIM = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), scale.clone(), 7 * ZB_SEG);
    ZB.neckIM.castShadow = true;
    ZB.neckIM.frustumCulled = false;
    BP.add(ZB.neckIM);
    ZB.spikeIM = new T.InstancedMesh(new T.ConeGeometry(0.22, 0.8, 4), material("#2a0e0c"), 7 * ZB_SPK.length);
    ZB.spikeIM.frustumCulled = false;
    BP.add(ZB.spikeIM);
    for (let i = 0; i < 7 * ZB_SEG; i++) ZB.neckIM.setColorAt(i, ZC.set("#ffffff"));
    /* buruak */
    for (let i = 0; i < 7; i++) ZB.heads.push(zbHead(i));
    /* su-arnasaren konoa (buru bakoitzak berea erabiltzen du txandaka) */
    const cg = new T.ConeGeometry(1, 1, 18, 1, true);
    cg.translate(0, -0.5, 0);
    cg.rotateX(-PI / 2);
    ZB.breathCone = new T.Mesh(cg, new T.MeshBasicMaterial({ color: "#ff7a2a", transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ZB.breathCone.renderOrder = 7;
    BP.add(ZB.breathCone);
    zbPoseAll(0);
    if (flag("herensugea")) zbFreed(true);
  }
  function zbHead(i) {
    const ang = (i - 3) * 0.33,
      dir = new T.Vector3(Math.sin(ang), 0, Math.cos(ang)),
      anchor = new T.Vector3(ZB.x + dir.x * 3.4, ZB.y + 2.6, ZB.z + dir.z * 2.6),
      kind = ZB_EYE[i],
      big = i === 3;
    const mat = new T.MeshStandardMaterial({ color: "#6a221c", roughness: 0.5, metalness: 0.18, flatShading: true, emissive: new T.Color("#2a0603"), emissiveIntensity: 0.4 });
    const g = new T.Group(),
      s = big ? 1.55 : 1.25;
    g.scale.setScalar(s);
    BP.add(g);
    const add = (geo, x, y, z, m = mat) => {
      const o = new T.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      g.add(o);
      return o;
    };
    add(new T.BoxGeometry(1.15, 0.85, 1.5), 0, 0.12, 0.1);
    add(new T.BoxGeometry(0.82, 0.48, 1.1), 0, 0.02, 1.3);
    const bone = material("#efe4cc");
    for (let k = 0; k < 4; k++) add(new T.ConeGeometry(0.06, 0.26, 4), -0.3 + k * 0.2, -0.3, 1.7, bone).rotation.x = PI;
    const jaw = new T.Group();
    jaw.position.set(0, -0.28, -0.1);
    g.add(jaw);
    const jm = new T.Mesh(new T.BoxGeometry(0.86, 0.22, 1.85), mat);
    jm.position.set(0, -0.08, 0.95);
    jm.castShadow = true;
    jaw.add(jm);
    for (let k = 0; k < 4; k++) {
      const t = new T.Mesh(new T.ConeGeometry(0.05, 0.22, 4), bone);
      t.position.set(-0.27 + k * 0.18, 0.1, 1.7);
      jaw.add(t);
    }
    for (const sx of [-1, 1]) {
      const horn = add(new T.ConeGeometry(0.15, 1.0, 6), sx * 0.38, 0.65, -0.45, material("#2a1a14"));
      horn.rotation.set(-1.05, 0, sx * -0.35);
    }
    for (let k = 0; k < 3; k++) add(new T.ConeGeometry(0.1, 0.45, 4), 0, 0.62, 0.3 - k * 0.4, material("#2a0e0c")).rotation.x = -0.5;
    /* begiak: urrea (eguzkia) edo urdina (ilargia); erdikoak bat eta bat */
    const eyes = [];
    for (const sx of [-1, 1]) {
      const ek = kind === "both" ? (sx < 0 ? "sun" : "moon") : kind;
      const em = new T.MeshStandardMaterial({ color: EYE_COL[ek], emissive: new T.Color(EYE_COL[ek]), emissiveIntensity: 1.6, roughness: 0.3 });
      const eye = add(new T.SphereGeometry(0.14, 10, 8), sx * 0.5, 0.25, 0.55, em);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: EYE_COL[ek], transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
      halo.position.copy(eye.position);
      halo.scale.setScalar(0.8);
      g.add(halo);
      eyes.push({ m: eye, mat: em, halo, kind: ek, shut: 0 });
    }
    /* eztarriko itzal-harria (puntu ahula, buruak lurrean daudenean) */
    const crystal = add(new T.OctahedronGeometry(0.3, 0), 0, -0.62, 0.35, new T.MeshStandardMaterial({ color: "#b04dff", emissive: new T.Color("#9a3dff"), emissiveIntensity: 2, roughness: 0.2 }));
    crystal.visible = false;
    const nose = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff8a2a", transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    nose.position.set(0, 0.1, 1.95);
    nose.scale.setScalar(1.4);
    g.add(nose);
    const H = {
      i,
      g,
      mat,
      jaw,
      eyes,
      crystal,
      nose,
      kind,
      big,
      s,
      ang,
      dir,
      anchor,
      pos: anchor.clone(),
      look: new T.Vector3(),
      state: "sleep",
      t: 0,
      hp: big ? FINAL_HP : HEAD_HP,
      max: big ? FINAL_HP : HEAD_HP,
      light: 0,
      sunT: 0,
      moonT: 0,
      open: 0,
      flash: 0,
      last: -9,
      x: 0,
      y: 0,
      z: 0,
      H: 1,
      D: { mass: 99, r: 1.2 },
      atk0: -1e9,
      parried: 0,
      stun: 0,
      vx: 0,
      vz: 0,
      lunge: null,
      breathA: 0,
      downAt: null,
      dead: 0,
    };
    return H;
  }
  const zbAwake = (H) => H.state !== "sleep" && H.state !== "dead" && H.state !== "rise" && H.state !== "down" && H.state !== "gone";
  /* buruaren etxeko puntua (zain dagoenean) */
  function zbHome(H, out) {
    const reach = H.big ? 10 : 8.6 + (Math.abs(H.i - 3) === 3 ? 1.2 : 0),
      lift = H.big ? 5.2 : 4.2 + (H.i % 2) * 0.8;
    return out.set(H.anchor.x + H.dir.x * reach + Math.sin(time * 0.9 + H.i * 1.7) * 0.8, SGY + lift + Math.sin(time * 1.3 + H.i) * 0.45, H.anchor.z + H.dir.z * reach + Math.cos(time * 0.7 + H.i) * 0.6);
  }
  /* lepoa: bezier kubikoa (aingura → burua), S itxurako */
  function zbNeck(H) {
    const A = H.anchor,
      B = H.pos,
      dx = B.x - A.x,
      dz = B.z - A.z,
      d = Math.hypot(dx, dz) || 1,
      ux = dx / d,
      uz = dz / d,
      down = H.state === "down" || H.state === "dead" || H.state === "gone";
    const c1x = A.x + ux * d * 0.25,
      c1y = A.y + (down ? 2.2 : 4.2),
      c1z = A.z + uz * d * 0.25,
      c2x = B.x - ux * Math.min(3.2, d * 0.4),
      c2y = B.y + (down ? 2.4 : 2.2),
      c2z = B.z - uz * Math.min(3.2, d * 0.4);
    const pts = [];
    for (let k = 0; k < ZB_SEG; k++) {
      const t = k / (ZB_SEG - 1),
        u = 1 - t,
        x = u * u * u * A.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * B.x,
        y = u * u * u * A.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * B.y,
        z = u * u * u * A.z + 3 * u * u * t * c1z + 3 * u * t * t * c2z + t * t * t * B.z;
      pts.push([x, y, z]);
    }
    return pts;
  }
  function zbPoseAll(dt) {
    let si = 0;
    for (const H of ZB.heads) {
      const pts = zbNeck(H),
        gone = H.state === "gone";
      for (let k = 0; k < ZB_SEG; k++) {
        const [x, y, z] = pts[k],
          r = (H.big ? 1.12 : 0.95) * (1 - (k / ZB_SEG) * 0.4) * (gone ? 0.0001 : 1);
        ZS.set(r, r * 0.9, r);
        ZM.compose(ZV.set(x, y, z), ZQ.identity(), ZS);
        ZB.neckIM.setMatrixAt(H.i * ZB_SEG + k, ZM);
        ZB.neckIM.setColorAt(H.i * ZB_SEG + k, ZC.set(H.state === "dead" ? "#6b6460" : H.flash > 0 ? "#ffd0c0" : "#ffffff"));
      }
      for (const [j, k] of ZB_SPK.entries()) {
        const [x, y, z] = pts[k],
          [x2, y2, z2] = pts[Math.min(ZB_SEG - 1, k + 1)],
          r = (H.big ? 1.12 : 0.95) * (1 - (k / ZB_SEG) * 0.4);
        ZV.set(x2 - x, y2 - y, z2 - z).normalize();
        /* arantza: lepoaren "goialdean", atzera begira */
        ZQ.setFromUnitVectors(ZB_UP, ZS.set(-ZV.x * 0.6, 1, -ZV.z * 0.6).normalize());
        ZS.setScalar(gone ? 0.0001 : 1);
        ZM.compose(ZV.set(x, y + r * 0.95, z), ZQ, ZS);
        ZB.spikeIM.setMatrixAt(si++, ZM);
      }
      H.g.position.copy(H.pos);
      H.g.visible = !gone;
      /* begirada */
      const lx = H.look.x - H.pos.x,
        lz = H.look.z - H.pos.z,
        ly = H.look.y - H.pos.y;
      H.g.rotation.order = "YXZ";
      H.g.rotation.y = Math.atan2(lx, lz);
      H.g.rotation.x = -Math.atan2(ly, Math.hypot(lx, lz)) * 0.8;
      H.jaw.rotation.x = H.open * 0.75;
      H.x = H.pos.x;
      H.y = H.pos.y - 1;
      H.z = H.pos.z;
    }
    ZB.neckIM.instanceMatrix.needsUpdate = true;
    if (ZB.neckIM.instanceColor) ZB.neckIM.instanceColor.needsUpdate = true;
    ZB.spikeIM.instanceMatrix.needsUpdate = true;
  }
  /* buruaren ahoa (munduan) */
  function zbMouth(H, out) {
    const a = H.g.rotation.y,
      p = -H.g.rotation.x;
    return out.set(H.pos.x + Math.sin(a) * Math.cos(p) * 1.9 * H.s, H.pos.y + Math.sin(p) * 1.9 * H.s - 0.1, H.pos.z + Math.cos(a) * Math.cos(p) * 1.9 * H.s);
  }
  function zbEyesVisual(H, dt) {
    const sleeping = H.state === "sleep" || H.state === "dead" || H.state === "gone";
    for (const E of H.eyes) {
      const shut = sleeping || H.state === "down" || (E.kind === "sun" ? H.sunT > 0 : H.moonT > 0) || (!H.big && H.light > 0.05 && Math.sin(time * 30) > 0);
      E.shut = mix(E.shut, shut ? 1 : 0, 1 - Math.exp(-dt * 14));
      E.m.scale.set(1, Math.max(0.08, 1 - E.shut), 1);
      E.mat.emissiveIntensity = (1 - E.shut) * (1.6 + (H.state === "breath_wind" ? Math.sin(time * 20) * 0.6 : 0));
      E.halo.material.opacity = (1 - E.shut) * 0.6;
    }
  }
  /* ------------------------------ borroka ------------------------------ */
  function zbStart() {
    if (BOSS.on || flag("herensugea") || !ZB.g) return;
    const R = DGH.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "zazpi";
    BOSS.weakR = 1.7;
    ZB.state = "intro";
    ZB.t = 0;
    ZB.round = -1;
    ZB.atkCd = 2.4;
    const fight = () => {
      ZB.state = "fight";
      ZB.t = 0;
      title("HERENSUGEA", "");
      SND.roar();
      shake(0.6);
      bossBar("HERENSUGEA", 1);
      zbRound(0);
      notify(L("Begi urreak: EGUZKIA (IRAGANA). Begi urdinak: ILARGIA (ORAINA). Argi-zutabe batean, ISPILUA begietara!"), "", 7);
    };
    if (ZB.seenIntro) return fight();
    ZB.seenIntro = true;
    say(
      [
        ["· · ·", "Laba-aintziratik, gorputz erraldoi bat altxatu da. Zazpi lepo. Zazpi buru, lotan… oraingoz.", "", ZB.x, ZB.z, SGY + 4],
        ["HERENSUGEA", "ZAZPI GARA. ZAZPI AHO, ZAZPI SU. GAUEKOREN ZAZPI EGIA.", "", ZB.x, ZB.z + 6, SGY + 6],
        ["AMAIUR", "Zazpi buru, eta bihotz bakarra. Argia ekarri dut, Herensuge: eguzkia eta ilargia.", "", P.x, P.z, P.y],
        ["HERENSUGEA", "ARGIA? HEMEN EZ DA EGUNIK, EZ GAURIK. ERRE ZAITEZ!", "", ZB.x, ZB.z + 6, SGY + 6],
      ],
      fight,
    );
  }
  function zbRound(n) {
    ZB.round = n;
    for (const i of ZB_ROUNDS[n]) {
      const H = ZB.heads[i];
      H.state = "rise";
      H.t = 0;
      H.hp = H.max;
      H.light = H.sunT = H.moonT = 0;
    }
    ZB.atkCd = 2.6;
    SND.roar();
    shake(0.45);
    if (n === 1) {
      for (const [sx, sz] of [[-10, -110], [10, -112]]) {
        const e = spawnEnemy("bat", -1, ZB.x + sx, sz, SGY);
        e.room = DGH.bossRoom;
        e.K = 1.1;
      }
      notify(L("Bi buru gehiago! Eta saguzarrak: argiak lurrera botatzen ditu."), "", 4);
    } else if (n === 2) notify(L("Haserre dago: su-euria sabaitik! Begiratu lurreko zirkuluei."), "", 4);
    else if (n === 3) {
      title("ZAZPIGARREN BURUA", "");
      notify(L("Erdiko burua: begi bat urrea, bestea urdina. EGUZKIA eta ILARGIA, bata bestearen atzetik!"), "", 7);
      for (const [sx, sz] of [[-12, -106], [12, -106]]) {
        const e = spawnEnemy("bat", -1, ZB.x + sx, sz, SGY);
        e.room = DGH.bossRoom;
      }
    }
  }
  function zbTotal() {
    let n = 0;
    for (const H of ZB.heads) if (H.state !== "dead" && H.state !== "gone") n += Math.max(0, H.hp);
    return n / (6 * HEAD_HP + FINAL_HP);
  }
  /* burua lurrera: eztarria agerian (argia, ALDARATU edo itzulitako su-bola) */
  function zbDown(H, dur, why) {
    if (!zbAwake(H) && H.state !== "rise") return;
    H.state = "down";
    H.t = 0;
    H.dur = dur;
    H.light = 0;
    H.open = 0.9;
    const R = DGH.bossRoom;
    /* lurrean, Amaiurren aldera (gelaren zoruan) */
    const tx = clamp(mix(H.pos.x, P.x, 0.35), R.x - 17, R.x + 17),
      tz = clamp(Math.max(H.pos.z, mix(H.pos.z, P.z, 0.35)), -122.5, -100);
    H.downAt = new T.Vector3(tx, SGY + 0.85 * H.s, tz);
    ZB.stats[why] = (ZB.stats[why] || 0) + 1;
    SND.roar();
    shake(0.35);
    fxBurst(H.pos.x, H.pos.y, H.pos.z, { n: 20, speed: 4, up: 2, life: 0.6, size: 0.3, color: why === "light" ? "#fff3c4" : "#ffffff", grav: 3 });
    title(why === "light" ? "ITSUTUTA!" : why === "parry" ? "ALDARATUA!" : "ZORABIATUTA!", "");
    notifyOnce("zb-down", L("Burua lurrean! Eztarrian, itzal-harri morea: SORGINKERIA (edo INDARRA)!"), "");
  }
  function zbDownHead() {
    let best = null,
      bd = 1e9;
    for (const H of ZB.heads) {
      if (H.state !== "down" || H.t < 0.35) continue;
      const d = Math.hypot(H.pos.x - P.x, H.pos.z - P.z);
      if (d < bd) (bd = d), (best = H);
    }
    return best;
  }
  function zbHit(n) {
    const H = zbDownHead();
    if (!H) return;
    H.hp -= n;
    H.flash = 0.25;
    H.crystal.getWorldPosition(ZV);
    FB.bossHit(ZV.x, ZV.y, ZV.z);
    damageNumber({ x: ZV.x, y: ZV.y, z: ZV.z, H: 0.5 }, n);
    bossBar("HERENSUGEA", zbTotal());
    if (H.hp > 0) return;
    /* burua itzali: harri bihurtu */
    H.state = "dead";
    H.t = 0;
    H.crystal.visible = false;
    H.mat.color.set("#6b6460");
    H.mat.emissive.set("#000000");
    SND.roar();
    SND.crumble();
    shake(0.6);
    slowmo = 0.6;
    fxBurst(H.pos.x, H.pos.y + 0.5, H.pos.z, { n: 50, speed: 6, up: 3, life: 1.1, size: 0.4, color: "#7a2fd6", grav: 1.5 });
    fxBurst(H.pos.x, H.pos.y + 0.5, H.pos.z, { n: 30, speed: 3, up: 4, life: 1.4, size: 0.35, color: "#9a948c", grav: 4 });
    if (ZB_ROUNDS[ZB.round].every((i) => ZB.heads[i].state === "dead")) {
      if (ZB.round >= ZB_ROUNDS.length - 1) return zbDefeat();
      ZB.state = "roar";
      ZB.t = 0;
      for (const M of ZB.marks) M.m.parent && M.m.parent.remove(M.m);
      ZB.marks.length = 0;
      title(["BI BURU ITZALITA", "LAU BURU ITZALITA", "SEI BURU ITZALITA"][ZB.round] || "", "");
    }
  }
  /* ---- erasoak ---- */
  function zbPickAttack() {
    const free = ZB.heads.filter((H) => H.state === "idle");
    if (!free.length) return;
    const busy = ZB.heads.filter((H) => H.state.startsWith("bite") || H.state.startsWith("breath") || H.state === "spit").length;
    if (busy >= (ZB.round >= 2 ? 2 : 1)) return;
    free.sort((a, b) => a.last - b.last);
    const H = free[0],
      d = Math.hypot(P.x - H.anchor.x, P.z - H.anchor.z),
      breathing = ZB.heads.some((o) => o.state.startsWith("breath")),
      r = Math.random();
    H.last = time;
    H.t = 0;
    ZB.focus = H;
    if (d < 15.5 && r < 0.5) {
      H.state = "bite_wind";
      H.atk0 = time;
      SND.screech && SND.screech();
    } else if (!breathing && r < 0.8) {
      H.state = "breath_wind";
      SND.wind(1.4);
    } else H.state = "spit";
  }
  function zbCovered(x0, z0, x1, z1) {
    const dx = x1 - x0,
      dz = z1 - z0,
      d = Math.hypot(dx, dz) || 1;
    for (const s of solids) {
      if (s.h < 1.5 || s.y + s.h < SGY + 1.2 || s.noBeam) continue;
      if (rayCircle(x0, z0, dx / d, dz / d, s.x, s.z, s.r, d) >= 0) return true;
    }
    return false;
  }
  function zbFireball(H, n = 1) {
    zbMouth(H, ZV);
    for (let k = 0; k < n; k++) {
      const tx = P.x + (k ? (Math.random() - 0.5) * 6 : 0),
        tz = P.z + (k ? (Math.random() - 0.5) * 6 : 0),
        dx = tx - ZV.x,
        dz = tz - ZV.z,
        td = Math.hypot(dx, dz),
        T0 = clamp(td / 11, 0.7, 1.5);
      const m = new T.Mesh(new T.IcosahedronGeometry(0.55, 1), new T.MeshBasicMaterial({ color: "#ffb347" }));
      const fl = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff6a1a", transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
      fl.scale.setScalar(2.6);
      m.add(fl);
      m.position.copy(ZV);
      scene.add(m);
      SHOTS.push({ m, x: ZV.x, z: ZV.z, y: ZV.y, vx: dx / T0, vz: dz / T0, sp: td / T0, t: 0, era: 2, rock: true, fire: true, floor: SGY, vy: (SGY + 0.5 - ZV.y + 0.5 * 16 * T0 * T0) / T0, onLand: (s) => zbFirePatch(s.x, s.z, 1.5, 2.4) });
    }
    SND.flame();
  }
  /* sua lurrean (denbora gutxi) */
  function zbFirePatch(x, z, r, life) {
    if (Math.abs(x - DGH.bossRoom.x) > 21 || z < -126 || z > -96) return;
    const m = new T.Mesh(new T.CircleGeometry(r, 20), new T.MeshBasicMaterial({ color: "#ff6a1a", map: glowTexture, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(x, SGY + 0.05, z);
    ZONES[DGH.id].group.add(m);
    ZB.fires.push({ x, z, r, t: 0, life, m });
  }
  /* su-euria: zirkulua lurrean (abisua) → su-bola goitik */
  function zbRainMark(x, z) {
    const m = new T.Mesh(new T.RingGeometry(1.5, 1.8, 24), new T.MeshBasicMaterial({ color: "#ff8a2a", transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(x, SGY + 0.06, z);
    ZONES[DGH.id].group.add(m);
    ZB.marks.push({ x, z, t: 0, fuse: 1.3, m });
  }
  function zbHeadUpdate(H, dt) {
    H.t += dt;
    H.flash = Math.max(0, H.flash - dt);
    H.sunT = Math.max(0, H.sunT - dt);
    H.moonT = Math.max(0, H.moonT - dt);
    if (H.lightT !== undefined) H.lightT += dt;
    if (!(H.lightT < 0.25)) H.light = Math.max(0, H.light - dt * 0.8);
    const home = zbHome(H, ZS.set(0, 0, 0)),
      ease = (k) => 1 - Math.exp(-dt * k);
    H.look.set(P.x, P.y + 1.2, P.z);
    let open = 0.05;
    switch (H.state) {
      case "sleep": {
        /* gorputzaren gainean kiribilduta */
        H.pos.lerp(ZV.set(H.anchor.x + H.dir.x * 2.2, H.anchor.y + 0.4, H.anchor.z + H.dir.z * 1.6 + 0.5), ease(3));
        H.look.set(H.pos.x + H.dir.x, H.pos.y - 0.5, H.pos.z + H.dir.z);
        break;
      }
      case "rise": {
        H.pos.lerp(home, ease(2.2));
        open = H.t < 1.4 ? Math.sin(H.t * 4) * 0.4 + 0.4 : 0.2;
        if (H.t > 1.8) (H.state = "idle"), (H.t = 0);
        break;
      }
      case "idle":
        H.pos.lerp(home, ease(2.5));
        open = 0.1 + Math.sin(time * 2 + H.i) * 0.05;
        break;
      case "bite_wind": {
        /* atzera bildu, burua altxatuta: abisua */
        const back = ZV.set(home.x - H.dir.x * 2.4, home.y + 1.4, home.z - H.dir.z * 2.4);
        H.pos.lerp(back, ease(5));
        open = Math.min(1, H.t * 1.8);
        H.flash = Math.sin(time * 26) > 0 ? 0.05 : 0;
        if (H.t > 0.75) {
          H.state = "bite";
          H.t = 0;
          H.lunge = new T.Vector3(P.x, P.y + 1.1, P.z);
          SND.whoosh();
        }
        break;
      }
      case "bite": {
        H.look.copy(H.lunge);
        H.pos.lerp(H.lunge, ease(11));
        open = H.t < 0.2 ? 1 : 0;
        if (H.t < 0.36 && Math.hypot(H.pos.x - P.x, H.pos.z - P.z) < 1.8 * H.s && Math.abs(H.pos.y - (P.y + 1.1)) < 1.9) {
          H.parried = 0;
          meleeHit(H, 1);
          if (H.parried > 0) {
            H.parried = 0;
            zbDown(H, 3.6, "parry");
            break;
          }
        }
        if (H.t > 0.42) {
          H.state = "bite_rec";
          H.t = 0;
          SND.thud(0.7);
          fxBurst(H.pos.x, SGY + 0.2, H.pos.z, { n: 14, speed: 3, up: 2, life: 0.5, size: 0.3, color: "#8a7a6a", grav: 8 });
        }
        break;
      }
      case "bite_rec":
        H.look.copy(H.lunge);
        if (H.t > 0.6) H.pos.lerp(home, ease(2.2));
        if (H.t > 1.4) (H.state = "idle"), (H.t = 0);
        break;
      case "breath_wind": {
        /* arnasa hartu: burua gora, sudur-zuloak gori */
        H.pos.lerp(ZV.set(home.x, home.y + 1.6, home.z), ease(4));
        open = 0.25;
        H.nose.material.opacity = Math.min(1, H.t * 1.2);
        if (H.t > 1.05) {
          H.state = "breath";
          H.t = 0;
          H.breathA = Math.atan2(P.x - H.pos.x, P.z - H.pos.z) - 0.75;
          SND.breath();
        }
        break;
      }
      case "breath": {
        const k = H.t / 1.7,
          a = H.breathA + k * 1.5;
        /* aurrera makurtuta */
        H.pos.lerp(ZV.set(home.x + H.dir.x * 2.5, home.y - 1, home.z + H.dir.z * 2.5), ease(2.5));
        H.look.set(H.pos.x + Math.sin(a) * 10, SGY + 0.6, H.pos.z + Math.cos(a) * 10);
        open = 1;
        H.nose.material.opacity = 0.9;
        zbMouth(H, ZV);
        const C = ZB.breathCone,
          len = 17;
        C.visible = true;
        C.position.copy(ZV);
        C.lookAt(ZV.x + Math.sin(a) * len, SGY + 0.4, ZV.z + Math.cos(a) * len);
        C.scale.set(2.6, 2.6, len);
        C.material.opacity = 0.32 + Math.sin(time * 40) * 0.06;
        if (frame % 2 === 0) fxBurst(ZV.x, ZV.y, ZV.z, { n: 5, speed: 17, dir: [Math.sin(a), Math.cos(a)], cone: 0.32, up: -1.2, life: 0.8, size: 0.7, color: Math.random() < 0.5 ? "#ff7a2a" : "#ffd166", grav: -1.5, drag: 0.8 });
        /* jo: konoaren barruan, estalpean ez bada */
        const pa = Math.atan2(P.x - ZV.x, P.z - ZV.z),
          pd = Math.hypot(P.x - ZV.x, P.z - ZV.z),
          da = Math.abs(Math.atan2(Math.sin(pa - a), Math.cos(pa - a)));
        if (pd < len && da < 0.17 + 1.1 / Math.max(2, pd) && P.y < SGY + 2.6 && !zbCovered(ZV.x, ZV.z, P.x, P.z)) playerHit(1, ZV.x, ZV.z);
        if (H.t > 1.7) {
          H.state = "idle";
          H.t = 0;
          C.visible = false;
          C.material.opacity = 0;
          H.nose.material.opacity = 0;
          if (ZB.round >= 1) zbFirePatch(H.pos.x + Math.sin(a) * 6, H.pos.z + Math.cos(a) * 6, 1.3, 1.6);
        }
        break;
      }
      case "spit": {
        H.pos.lerp(ZV.set(home.x, home.y + 0.6, home.z), ease(4));
        open = H.t > 0.5 && H.t < 0.8 ? 1 : 0.3;
        H.nose.material.opacity = Math.min(0.8, H.t);
        if (H.t > 0.55 && !H.spat) {
          H.spat = true;
          zbFireball(H, ZB.round >= 2 ? 2 : 1);
          coach("shield-fire", "J", "Su-bola: mantendu J (EZKUTUA) → itzuli burura!", "", "attackBtn", "Su-bola: mantendu SORGINKERIA (EZKUTUA) → itzuli!", "");
        }
        if (H.t > 1.2) {
          H.spat = false;
          H.state = "idle";
          H.t = 0;
          H.nose.material.opacity = 0;
        }
        break;
      }
      case "down": {
        H.pos.lerp(H.downAt, ease(6));
        H.look.set(H.pos.x + H.dir.x * 2, SGY + 0.4, H.pos.z + H.dir.z * 2);
        open = 0.6 + Math.sin(time * 3) * 0.1;
        H.crystal.visible = true;
        H.crystal.rotation.y += dt * 3;
        H.crystal.material.emissiveIntensity = 2 + Math.sin(time * 12) * 0.6 + H.flash * 6;
        if (Math.random() < dt * 4) fxBurst(H.pos.x, H.pos.y + 1.2, H.pos.z, { n: 1, speed: 0.6, up: 1, life: 0.6, size: 0.18, color: "#fff1a8", grav: -1 });
        if (H.t > H.dur) {
          H.state = "idle";
          H.t = 0;
          H.crystal.visible = false;
          H.sunT = H.moonT = 0;
          SND.roar();
        }
        break;
      }
      case "dead": {
        /* harri bihurtuta, labara erortzen */
        H.pos.lerp(ZV.set(H.anchor.x + H.dir.x * 5.5, SGY - 1.6, H.anchor.z + H.dir.z * 4.5), ease(1.2));
        H.look.set(H.pos.x + H.dir.x, SGY - 3, H.pos.z + H.dir.z);
        open = 0.4;
        break;
      }
    }
    H.open = mix(H.open, open, ease(10));
    zbEyesVisual(H, dt);
    H.mat.emissive.set(H.state === "dead" ? "#000000" : H.flash > 0.04 ? "#ffffff" : H.light > 0.05 ? "#ffe9a8" : "#2a0603");
    H.mat.emissiveIntensity = H.state === "dead" ? 0 : H.flash > 0.04 ? 1.4 : H.light > 0.05 ? 0.3 + H.light * 1.2 : 0.4;
  }
  function zbUpdate(dt) {
    if (!ZB.g || ZONE.cur !== "herensuge") return;
    const R = DGH.bossRoom;
    /* gorputza arnasan, hegoak */
    const br = Math.sin(time * 1.1) * 0.04;
    ZB.body.scale.set(1.35 + br, 0.72 + br, 1);
    for (const [k, w] of ZB.wings.entries()) w.rotation.z = (k ? -1 : 1) * (0.35 + (ZB.state === "roar" ? Math.sin(time * 9) * 0.25 + 0.4 : Math.sin(time * 0.8) * 0.04));
    if (ZB.state === "freed") {
      zbFreedUpdate(dt);
      zbPoseAll(dt);
      return;
    }
    for (const H of ZB.heads) zbHeadUpdate(H, BOSS.on && !cinematic ? dt : dt * 0.5);
    zbPoseAll(dt);
    if (ZB.state === "sleep") {
      const open = saved.doors.includes(DGH.bossDoor);
      if (open && ROOM.cur === R && P.grounded && !cinematic && P.z < -99.5 && P.y > SGY - 1) zbStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    ZB.t += dt;
    /* sua lurrean */
    for (let i = ZB.fires.length - 1; i >= 0; i--) {
      const F = ZB.fires[i];
      F.t += dt;
      F.m.material.opacity = 0.75 * (1 - F.t / F.life) + Math.sin(time * 20 + i) * 0.08;
      if (Math.random() < dt * 8) fxBurst(F.x + (Math.random() - 0.5) * F.r, SGY + 0.2, F.z + (Math.random() - 0.5) * F.r, { n: 1, speed: 0.6, up: 2.4, life: 0.5, size: 0.26, color: "#ff8a2a", grav: -2 });
      if (Math.hypot(P.x - F.x, P.z - F.z) < F.r * 0.85 && P.y < SGY + 0.9) playerHit(1, F.x, F.z);
      if (F.t > F.life) {
        F.m.parent && F.m.parent.remove(F.m);
        ZB.fires.splice(i, 1);
      }
    }
    /* su-euria */
    for (let i = ZB.marks.length - 1; i >= 0; i--) {
      const M = ZB.marks[i];
      M.t += dt;
      M.m.material.opacity = 0.4 + 0.4 * Math.abs(Math.sin(time * 12));
      M.m.scale.setScalar(1 + (1 - M.t / M.fuse) * 0.4);
      if (M.t > M.fuse - 0.35 && !M.fell) {
        M.fell = true;
        fxBurst(M.x, SGY + 9, M.z, { n: 14, speed: 1, up: -16, life: 0.4, size: 0.6, color: "#ffb347", grav: 30 });
      }
      if (M.t >= M.fuse) {
        fxBurst(M.x, SGY + 0.4, M.z, { n: 26, speed: 5, up: 3.5, life: 0.7, size: 0.4, color: "#ff7a2a", grav: -1 });
        SND.flame();
        if (Math.hypot(P.x - M.x, P.z - M.z) < 1.9 && P.y < SGY + 1.6) playerHit(1, M.x, M.z);
        zbFirePatch(M.x, M.z, 1.3, 1.8);
        M.m.parent && M.m.parent.remove(M.m);
        ZB.marks.splice(i, 1);
      }
    }
    if (ZB.state === "roar") {
      if (ZB.t > 2.4) {
        ZB.state = "fight";
        ZB.t = 0;
        zbRound(ZB.round + 1);
      }
      return;
    }
    /* erasoak */
    ZB.atkCd -= dt;
    if (ZB.atkCd <= 0) {
      zbPickAttack();
      ZB.atkCd = Math.max(1.1, 2.3 - ZB.round * 0.35) + Math.random() * 0.6;
    }
    if (ZB.round >= 2 && Math.random() < dt * (ZB.round >= 3 ? 0.55 : 0.4)) {
      const x = clamp(P.x + (Math.random() - 0.5) * 9, R.x - 18, R.x + 18),
        z = clamp(P.z + (Math.random() - 0.5) * 9, -123, -99);
      zbRainMark(x, z);
    }
    /* Amaiur labatik gertu (gorputzaren kontra): bultzatu */
    if (P.z < -124 && P.y > SGY - 0.5) P.vz += 18 * dt;
  }
  BOSSK.zazpi = {
    vulnerable: () => !!zbDownHead(),
    weak: () => {
      const H = zbDownHead();
      if (!H) return null;
      H.crystal.getWorldPosition(ZV);
      return { x: ZV.x, y: ZV.y, z: ZV.z };
    },
    center: () => {
      const H = ZB.focus && ZB.focus.state !== "dead" ? ZB.focus : ZB.heads.find(zbAwake);
      return H ? { x: H.pos.x, y: H.pos.y, z: H.pos.z, h: 40, r: 2.6 } : { x: ZB.x, y: SGY, z: ZB.z, h: 40, r: 5 };
    },
    hit: (n) => zbHit(n),
    /* itzulitako su-bola: burua zorabiatu */
    stagger: () => {
      const H = ZB.focus && zbAwake(ZB.focus) ? ZB.focus : ZB.heads.find(zbAwake);
      if (H) zbDown(H, 3.6, "reflect");
    },
    /* EGUZKI-ISPILUA: buruen begiak */
    beamHit: (x, y, z, dx, dz, maxD) => {
      let best = null;
      for (const H of ZB.heads) {
        if (!zbAwake(H)) continue;
        const t = rayCircle(x, z, dx, dz, H.pos.x, H.pos.z, 1.5 * H.s, best ? best.t : maxD);
        if (t >= 0 && (!best || t < best.t)) best = { t, y: H.pos.y + 0.25, H, on: (kind, dt) => zbLight(H, kind, dt) };
      }
      return best;
    },
    beamAim: () => ZB.heads.filter(zbAwake).map((H) => ({ x: H.pos.x, z: H.pos.z })),
  };
  function zbLight(H, kind, dt) {
    if (!zbAwake(H)) return;
    H.lightT = 0;
    if (H.kind === "both") {
      if (kind === "sun") H.sunT = Math.max(H.sunT, 3.5);
      else H.moonT = Math.max(H.moonT, 3.5);
      H.light = 0.3;
      if (H.sunT > 0 && H.moonT > 0) {
        ZB.stats.light++;
        return zbDown(H, 5, "light");
      }
      notifyOnce("zb-both-" + kind, kind === "sun" ? L("Begi urrea itxi da! Orain, ILARGIA begi urdinera: ORAINERA, azkar!") : L("Begi urdina itxi da! Orain, EGUZKIA begi urrera: IRAGANERA, azkar!"), "");
      return;
    }
    if (H.kind !== kind) {
      notifyOnce("zb-wrong-" + H.kind, H.kind === "sun" ? L("Buru horren begiak urreak dira: EGUZKIA behar dute (IRAGANA).") : L("Buru horren begiak urdinak dira: ILARGIA behar dute (ORAINA)."), "");
      return;
    }
    /* argia jasotzen: erasoa eten */
    if (H.state === "bite_wind" || H.state === "breath_wind" || H.state === "spit") {
      H.state = "idle";
      H.t = 0;
      H.nose.material.opacity = 0;
    }
    H.light += dt / 0.55;
    if (frame % 3 === 0) fxBurst(H.pos.x, H.pos.y + 0.3, H.pos.z, { n: 2, speed: 2, up: 1, life: 0.3, size: 0.16, color: EYE_COL[kind], grav: 1 });
    if (H.light >= 1) {
      ZB.stats.light++;
      zbDown(H, 4.6, "light");
    }
  }
  function zbDefeat() {
    BOSS.dead = true;
    ZB.state = "freed";
    ZB.t = 0;
    for (const M of ZB.marks) M.m.parent && M.m.parent.remove(M.m);
    ZB.marks.length = 0;
    for (const F of ZB.fires) F.m.parent && F.m.parent.remove(F.m);
    ZB.fires.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ZB.breathCone.visible = false;
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    const C = ZB.heads[3];
    say(
      [
        ["· · ·", "Sei buruak errauts bihurtu dira, eta haizeak eraman ditu. Bat bakarra geratu da, begi urrezkoekin.", "", C.pos.x, C.pos.z, C.pos.y],
        ["HERENSUGEA", "…Zazpi buru. Gauekok sei gezur jarri zizkidan lepoan. Sei ahotsek oihu egiten zuten, eta nirea ez zen entzuten.", "", C.pos.x, C.pos.z, C.pos.y],
        ["AMAIUR", "Orain zurea bakarrik entzuten da. Lamien putzuan, herensuge gazte bat ikusi nuen, izotzetan…", "", P.x, P.z, P.y],
        ["HERENSUGEA", "Nire alaba. Ur sakonetara ihes egin zuen: sentitzen dut, bizirik dago. Eskerrik asko, sorgin. Hartu nire suaren bihotza.", "", C.pos.x, C.pos.z, C.pos.y],
        ["HERENSUGEA", "Eta entzun: Inguma ez da hemen bizi, ezta inon ere. Ametsetan sartzen da. Gaur gauean, lo egiten duzunean… kontuz.", "", C.pos.x, C.pos.z, C.pos.y],
      ],
      () => {
        zbFreed();
        saved.hearts = Math.max(saved.hearts, 6);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("herensugea");
        persist();
        itemGet("bihotza", L("HERENSUGEAREN BIHOTZA"), L("Arnasa bat gehiago. Su epela, ez erretzen duena: etxeko sutondoarena bezala."), () => {
          title("HERENSUGEA ASKE", "");
          say([["HERENSUGEA", "Igo nire lepora, sorgin. Hodeien gainetik, zure herrira eramango zaitut.", "", C.pos.x, C.pos.z, C.pos.y]], zbFlightHome);
        });
      },
    );
  }
  /* askatuta: buru bakarra, urrezkoa */
  function zbFreed(instant) {
    BOSS.on = false;
    ZB.state = "freed";
    for (const H of ZB.heads) {
      if (H.i === 3) {
        H.state = "free";
        H.mat.color.set("#c98a2e");
        H.mat.emissive.set("#5a3008");
        H.crystal.visible = false;
        for (const E of H.eyes) {
          E.mat.color.set("#ffd76a");
          E.mat.emissive.set("#ffd76a");
          E.halo.material.color.set("#ffd76a");
          E.shut = 0;
        }
        if (instant) H.pos.set(H.anchor.x, SGY + 6, H.anchor.z + 6);
      } else {
        H.state = "gone";
        if (!instant) for (let k = 0; k < 3; k++) fxBurst(H.pos.x, H.pos.y, H.pos.z, { n: 30, speed: 3, up: 3 + k, life: 1.6, size: 0.4, color: k % 2 ? "#4a4440" : "#ffb347", grav: -0.8 });
      }
    }
    ZB.mat.color.set("#a8682a");
    ZB.neckIM.material.color.set("#a8682a");
    zbPoseAll(0);
  }
  function zbFreedUpdate(dt) {
    const H = ZB.heads[3];
    H.pos.lerp(ZV.set(H.anchor.x, SGY + 6 + Math.sin(time * 0.8) * 0.3, H.anchor.z + 6.5), 1 - Math.exp(-dt * 1.2));
    H.look.set(P.x, P.y + 1.4, P.z);
    H.open = mix(H.open, 0.05, 1 - Math.exp(-dt * 4));
    for (const E of H.eyes) {
      E.m.scale.set(1, 1, 1);
      E.mat.emissiveIntensity = 1.4;
      E.halo.material.opacity = 0.55;
    }
    H.mat.emissiveIntensity = 0.35;
  }
  /* Herensugearen hegaldia: herrira */
  function zbFlightHome() {
    title("HERENSUGEAREN HEGALDIA", "");
    SND.whoosh();
    enterZone("ibarra", { x: 4.5, y: 0, z: 36, a: PI, cp: true });
    setTimeout(() => notify(L("Herensugeak herrira ekarri zaitu, hodeien gainetik. Irati zain dago plazan."), "", 6), 900);
  }
  /* ---- haranean: Herensugea askatuta, zeruan hegan (noizean behin) ---- */
  const SKYD = { g: null, wings: [], t: 0 };
  function skyDragonBuild() {
    const g = new T.Group(),
      gold = new T.MeshStandardMaterial({ color: "#c98a2e", roughness: 0.45, metalness: 0.35, emissive: new T.Color("#5a3008"), emissiveIntensity: 0.4, flatShading: true });
    /* gorputza eta lepoa/buztana (bola-katea) */
    for (let i = 0; i < 16; i++) {
      const k = i / 15,
        r = 1.6 * Math.sin(Math.min(1, k * 1.25) * PI) + 0.35,
        b = new T.Mesh(new T.IcosahedronGeometry(r, 1), gold);
      b.position.set(0, 0, 12 - i * 1.9);
      g.add(b);
    }
    const head = new T.Mesh(new T.BoxGeometry(1.4, 1.1, 2.6), gold);
    head.position.set(0, 0.3, 14.2);
    g.add(head);
    for (const sx of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(0.2, 1.3, 5), material("#3a2a1a"));
      horn.position.set(sx * 0.45, 1, 13.4);
      horn.rotation.x = -1;
      g.add(horn);
      const pivot = new T.Group();
      pivot.position.set(sx * 1.4, 0.6, 4);
      const ws = new T.Shape();
      ws.moveTo(0, 0);
      ws.lineTo(4, 2.5);
      ws.lineTo(13, 1);
      ws.quadraticCurveTo(9, -1.5, 9.5, -4.5);
      ws.quadraticCurveTo(6, -3, 4.5, -5.5);
      ws.quadraticCurveTo(2.5, -3, 0, -3);
      const w = new T.Mesh(new T.ShapeGeometry(ws), new T.MeshStandardMaterial({ color: "#a8682a", side: T.DoubleSide, roughness: 0.7, emissive: new T.Color("#4a2808"), emissiveIntensity: 0.35 }));
      w.rotation.x = PI / 2;
      w.scale.set(sx, 1, 1);
      pivot.add(w);
      g.add(pivot);
      SKYD.wings.push(pivot);
    }
    g.visible = false;
    ZONES.ibarra.group.add(g);
    SKYD.g = g;
  }
  function skyDragonUpdate(dt) {
    if (!SKYD.g) return;
    const on = ZONE.cur === "ibarra" && saved.flags.includes("herensugea");
    SKYD.g.visible = on;
    if (!on) return;
    SKYD.t += dt;
    /* zirkulu handia haranaren gainean (minutu batean), uhin txiki batekin */
    const a = SKYD.t * 0.1,
      x = Math.cos(a) * 150,
      z = -40 + Math.sin(a) * 110,
      y = 78 + Math.sin(SKYD.t * 0.4) * 6;
    SKYD.g.position.set(x, y, z);
    const vx = -Math.sin(a) * 150,
      vz = Math.cos(a) * 110;
    SKYD.g.rotation.set(0, Math.atan2(vx, vz), 0);
    SKYD.g.rotation.z = -0.25;
    const f = Math.sin(SKYD.t * 2.6) * 0.45;
    SKYD.wings[0].rotation.z = f;
    SKYD.wings[1].rotation.z = -f;
  }
  /* bossReset-etik (bizitzak amaituta) */
  function zbReset() {
    if (!(BOSS.on && BOSS.kind === "zazpi" && !BOSS.dead)) return;
    BOSS.on = false;
    ZB.state = "sleep";
    ZB.t = 0;
    ZB.round = -1;
    ZB.focus = null;
    for (const M of ZB.marks) M.m.parent && M.m.parent.remove(M.m);
    ZB.marks.length = 0;
    for (const F of ZB.fires) F.m.parent && F.m.parent.remove(F.m);
    ZB.fires.length = 0;
    ZB.breathCone.visible = false;
    for (const H of ZB.heads) {
      Object.assign(H, { state: "sleep", t: 0, hp: H.max, light: 0, sunT: 0, moonT: 0, spat: false });
      H.crystal.visible = false;
      H.nose.material.opacity = 0;
      H.mat.color.set("#6a221c");
    }
    bossBar(null);
  }
