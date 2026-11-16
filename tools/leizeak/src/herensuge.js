  /* ==================================================================
     ZEZEN-HARPEA · seigarren leizea (diseinu propioa) — sua, laba eta argia
     Hodeien beste aldean, eguzkiaren leizea: haren barruan, ZEZENGORRI, altxorraren zaindaria.
     Odeiren hodei zuriak (zeruko ortzadarraren muturrean) eramaten zaitu hara.
       H1 Leizearen ahoa ....... SUTONDOA; sare beltza iparrean (SUAk erretzen du);
                                 sabaiko arrakala: argi-zutabe bat… zertarako?
       H2 Laba-arroila ......... NEGUAN laba gogortuta (lurrazala) erdiko harkaitzera;
                                 UDAN beroa gora (haize-zutabea): ENARAz ertz garaira.
                                 Mendebaldean, apal garai bat (arnasa-zatia). Saguzarrak.
       H3 Saguzarren habia ..... borroka → GILTZA TXIKIA; bigarren SUTONDOA; ekialdean barrak
                                 (kristal urrea atzean); iparrean ate handia
       H4 Ispilu-zainaren gela . etsai ertaina → EGUZKI-ISPILUA; kristal zuria (saria)
       H5 Ispiluen aretoa ...... bi ispilu-harri BIRATU; sare beltza EGUZKIAz erre, gero
                                 ILARGIAz kristal urdina → barrak (iparrean)
       H6 Kristalen gela ....... hiru kristal (urrea, urdina, zuria): denak piztuta → GILTZA NAGUSIA
       H7 Altxortegia .......... ZEZENGORRI: begietara argia → itsu, hormaren kontra → lurrera →
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
    bigKeyText: "Zezengorriren altxortegira daraman ate handia irekitzen du.",
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
     UDAN distira handiz (dena urtuta), NEGUAN gutxiagoz (plakak gogortuta) */
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
  /* lurrazala (NEGUAN): laba gogortua, harri beltza arrakala gorriekin */
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
    room("H1", E(0), 0, 30, 24, { area: "hA", name: "ZEZEN-HARPEAREN AHOA", desc: "Kea, sufrea eta urrea. Hemen, norbaitek arnasa sakon hartzen du, zezen batek bezala.", doors: { s: 0, n: 0 } });
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
    room("H2", E(0), -36, 30, 36, { area: "hB", name: "LABA-ARROILA", desc: "Udan laba bizirik, beroa gora. Neguan, lurrazal beltz bat gainean.", doors: { s: 0, n: 0 }, floors: [[E(0), -21, 30, 6]], wallH: 18 });
    lavaPool(E(0), -35, 30, 22, -1);
    /* lurrazala (NEGUAN) erdiko harkaitzeraino */
    crust(E(-2.2), -26.4, 3.6, 4.8, 0);
    crust(E(-0.8), -30.8, 3.4, 4.8, 0);
    /* erdiko harkaitza (beti) */
    const isle = slab({ x: E(0), z: -36, y: 0, w: 6, d: 6, h: 9, area: "hB" });
    isle.slick = true;
    for (const [rx, rz] of [[E(-2.2), -38.2], [E(2.4), -34]]) bprop("rubble_half", rx, 0, rz, DS * 0.45, rx);
    /* bero-zutabea (UDAN): ENARAz ertz garaira */
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
    /* eguzki-zuloa (UDAN): izpia barren artetik kristal urrera */
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
    room("H6", E(42), -111, 30, 30, { y: SGY, area: "hF", name: "KRISTALEN GELA", desc: "Hiru kristal, hiru argi. Zezengorrik bere giltza hemen gordetzen du.", doors: { s: -6 } });
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
    room("H7", E(0), -117, 42, 42, { y: SGY, area: "hG", name: "ZEZENGORRIREN ALTXORTEGIA", desc: "Urrea, kea eta arnasa bero bat. Altxor-pilen artean, zerbait mugitzen da.", doors: { s: 0 }, floors: [[E(0), -111, 42, 30]], wallH: 22 });
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
      title("ZEZEN-HARPEA", "");
      enterZone("herensuge", { ...DGH.entry, cp: true });
    };
    if (HZ.seenCloud || flag("suge-mendia")) return go();
    HZ.seenCloud = true;
    const c = HZ.cloud.position;
    say(
      [
        ["EATE", "Sorgin. Nire zati txiki bat utzi dizut hemen: hodei zuri bat, euri-usaina duena.", "", c.x, c.z, c.y],
        ["EATE", "Hodeien beste aldean, ZEZEN-HARPEA, eguzkiaren leizea. Haren barruan, Zezengorri: sua botatzen du sudurretik. Eguzkiak bakarrik itsutzen ditu haren begiak.", "", c.x, c.z, c.y],
        ["AMAIUR", "Eraman nazazu, beraz. Eguzkia aurkituko dut.", "", P.x, P.z, P.y],
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
        notifyOnce("laba", L("Laba! Udan bizirik dago; neguan, lurrazal gogorra bakarrik ibiltzeko."), "");
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
          hint: "Ispiluaren zaindaria! Ezkutuak urtaroa aldatzen du: begiratu begien koloreari. Saguzarrak: murgiltzean, ALDARATU.",
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
      if (ROOM.cur === R.H2 && P.y < SGY - 1) return phase ? ["Lurrazala (NEGUAN) erdiko harkaitzeraino. Han, UDARA: beroa gora.", [R.H2.x, -36, 0]] : ["Bero-zutabea (UDAN): jauzi bikoitza eta eutsi JAUZIari → ENARA, iparreko ertzera.", [R.H2.x, -37, 0]];
      return ["Iparrera: saguzarren habia.", [R.H3.x, R.H3.z, SGY]];
    }
    if (!has("ispilua")) {
      if (!saved.doors.includes("hC-w") && !(saved.keyz.herensuge > 0)) return ["Giltza txikia: habiaren erdiko kutxa.", [R.H3.x, R.H3.z, SGY]];
      if (!saved.doors.includes("hC-w")) return ["Mendebaldeko atea: giltza txikia.", [R.H3.x - 13.6, R.H3.z, SGY]];
      return isCleared("hD-mini") ? ["Ispilu-zainaren kutxa ireki.", [R.H4.x, -82, SGY]] : ["Mendebaldean: ispilu-zainaren gela.", [R.H4.x, R.H4.z, SGY]];
    }
    if (!saved.doors.includes("hC-e")) return ["Habiako eguzki-zuloa (UDAN): ISPILUA, barren artetik kristal urrera.", [DGH.shaftC.x, DGH.shaftC.z, SGY]];
    if (!saved.doors.includes("hE-n")) return ["Ispiluen aretoa: ispilu-harriak BIRATU. Sarea EGUZKIAz, kristal urdina ILARGIAz.", [DGH.shaftE.x, DGH.shaftE.z, SGY]];
    if (!has(DGH.bigKey)) return isCleared("hF-kristalak") ? ["Giltza nagusiaren kutxa.", [DGH.bigChest.x, DGH.bigChest.z, SGY]] : ["Kristalen gela: hiru kristalak piztu (urrea, urdina, zuria).", [DGH.shaftF.x, DGH.shaftF.z, SGY]];
    if (!flag("herensugea")) return saved.doors.includes(DGH.bossDoor) ? ["Zezengorriren altxortegia. Argia begietara.", [R.H7.x, R.H7.z + 10, SGY]] : ["Altxortegiko ate handia (iparrean): giltza nagusia.", [R.H3.x, R.H3.z - 13, SGY]];
    return ["Irten leizetik: Eateren hodei zuria zain.", [DGH.exitArch.x, DGH.exitArch.z, 0]];
  };

  /* ============================ ZEZENGORRI (H7) ============================
     Zezen gorri erraldoia, leizeko altxorraren zaindaria (euskal mitologia: sua botatzen du).
     Mikelatsek itzal bat jarri dio begietan. Erasoak:
     · ERASOA: hankaz lurra arrastatu (abisua), gero korrika zuzen → saihestu (BULTZADA). Estalpe
       edo horma baten kontra jotzen badu, zorabiatuta (TXINGARRA agerian).
     · SU-ARNASA: arnasa hartu, gero sua aurrera → ESTALPEAN ezkutatu.
     · SU-BOLAK: parabolan → EZKUTUA (INDARRA kargatzen): itzuli → zorabiatuta.
     · BEGIAK: urreak → EGUZKIA (UDA), urdinak → ILARGIA (NEGUA): argi-zutabe batean, ISPILUA
       begietara → itsu: korrika itsuan, hormaren kontra → lurrera; bekokiko TXINGARRA → SORGINKERIA.
     Hiru txanda: I begi urreak, II begi urdinak, III bat urrea eta bestea urdina (biak, segidan).
     Barne-IDak (ZB, zb*, herensugea bandera) bere horretan; BOSS.kind = "zezen".
     ========================================================================= */
  const ZB = { g: null, body: null, head: null, legs: [], tail: null, eyes: [], ember: null, nose: null, heads: [], state: "sleep", t: 0, round: -1, seenIntro: false, x: 0, y: 0, z: 0, a: PI, atkCd: 2, hp: 0, max: 6, light: 0, sunT: 0, moonT: 0, stun: 0, run: null, marks: [], fires: [], breathCone: null, breathT: 0, flash: 0, gallop: 0, stats: { light: 0, parry: 0, reflect: 0, crash: 0 } };
  const ZB_HP = [6, 6, 10];
  const ZB_EYE = ["sun", "moon", "both"];
  const EYE_COL = { sun: "#ffc933", moon: "#6fd0ff" };
  const ZV = new T.Vector3();
  const ZB_R = 2.1;
  function zbBuild() {
    const R = DGH.bossRoom;
    ZB.x = R.x;
    ZB.z = -121.5;
    ZB.y = SGY;
    ZB.a = 0;
    const g = new T.Group();
    g.position.set(ZB.x, ZB.y, ZB.z);
    BP.add(g);
    ZB.g = g;
    const hide = new T.MeshStandardMaterial({ color: "#8a1f14", roughness: 0.6, metalness: 0.05, flatShading: true, emissive: new T.Color("#2a0603"), emissiveIntensity: 0.45 }),
      dark = new T.MeshStandardMaterial({ color: "#3a0c08", roughness: 0.7, flatShading: true }),
      horn = new T.MeshStandardMaterial({ color: "#efe2c4", roughness: 0.45, flatShading: true }),
      hoof = material("#1a0d08");
    ZB.mat = hide;
    const add = (geo, m, x, y, z, parent = g) => {
      const o = new T.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      parent.add(o);
      return o;
    };
    /* gorputza: enborra, konkorra (sorbaldak) eta sabela */
    const body = add(new T.SphereGeometry(1, 16, 12), hide, 0, 2.2, 0);
    body.scale.set(1.55, 1.15, 2.6);
    ZB.body = body;
    add(new T.SphereGeometry(1.25, 14, 10), hide, 0, 3.0, 1.2).scale.set(1.15, 0.9, 1.05);
    /* hankak (pibotak sorbaldetan/aldaketan): lauhazka eta lurrera tolestu */
    for (const [lx, lz] of [[-0.85, 1.7], [0.85, 1.7], [-0.85, -1.7], [0.85, -1.7]]) {
      const pv = new T.Group();
      pv.position.set(lx, 1.9, lz);
      g.add(pv);
      const up = add(new T.CylinderGeometry(0.36, 0.28, 1.2, 8), hide, 0, -0.6, 0, pv),
        lo = add(new T.CylinderGeometry(0.26, 0.22, 0.9, 8), dark, 0, -1.55, 0, pv);
      add(new T.CylinderGeometry(0.28, 0.3, 0.22, 8), hoof, 0, -2.05, 0, pv);
      ZB.legs.push({ pv, up, lo, front: lz > 0, side: lx > 0 ? 1 : -1 });
    }
    /* buztana */
    const tp = new T.Group();
    tp.position.set(0, 2.9, -2.5);
    g.add(tp);
    add(new T.CylinderGeometry(0.06, 0.1, 1.8, 6), hide, 0, -0.9, -0.2, tp).rotation.x = 0.25;
    add(new T.SphereGeometry(0.22, 8, 6), dark, 0, -1.85, -0.45, tp);
    ZB.tail = tp;
    /* burua (pibota lepoan): muturra, adarrak, begiak, sudur-zuloak eta bekokiko txingarra */
    const head = new T.Group();
    head.position.set(0, 3.0, 2.7);
    g.add(head);
    ZB.head = head;
    add(new T.BoxGeometry(1.5, 1.3, 1.7), hide, 0, 0, 0.6, head);
    add(new T.BoxGeometry(1.15, 0.85, 0.9), dark, 0, -0.3, 1.6, head);
    for (const s of [-1, 1]) {
      const hp = new T.Group();
      hp.position.set(s * 0.72, 0.45, 0.55);
      head.add(hp);
      const h1 = add(new T.CylinderGeometry(0.14, 0.22, 1.1, 7), horn, s * 0.45, 0.15, 0, hp);
      h1.rotation.z = s * -1.25;
      const h2 = add(new T.ConeGeometry(0.14, 0.9, 7), horn, s * 0.95, 0.6, 0.35, hp);
      h2.rotation.set(0.6, 0, s * -0.35);
      const ear = add(new T.ConeGeometry(0.16, 0.5, 5), hide, s * 0.85, 0.05, 0.25, head);
      ear.rotation.z = s * 1.9;
    }
    for (const s of [-1, 1]) {
      const em = new T.MeshStandardMaterial({ color: "#ffc933", emissive: new T.Color("#ffc933"), emissiveIntensity: 1.4 }),
        e = add(new T.SphereGeometry(0.15, 10, 8), em, s * 0.6, 0.15, 1.2, head),
        halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffc933", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.45 }));
      halo.position.copy(e.position);
      halo.scale.setScalar(1.1);
      head.add(halo);
      ZB.eyes.push({ m: e, mat: em, halo, side: s });
    }
    ZB.nose = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff7a2a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    ZB.nose.position.set(0, -0.35, 2.15);
    ZB.nose.scale.setScalar(1.6);
    head.add(ZB.nose);
    ZB.ember = add(new T.IcosahedronGeometry(0.32, 1), new T.MeshStandardMaterial({ color: "#ff9a3a", emissive: new T.Color("#ff6a1a"), emissiveIntensity: 2 }), 0, 0.72, 1.0, head);
    ZB.ember.visible = false;
    /* su-arnasaren konoa */
    const cg = new T.ConeGeometry(1, 1, 18, 1, true);
    cg.translate(0, -0.5, 0);
    cg.rotateX(-PI / 2);
    ZB.breathCone = new T.Mesh(cg, new T.MeshBasicMaterial({ color: "#ff7a2a", transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ZB.breathCone.renderOrder = 7;
    ZB.breathCone.visible = false;
    BP.add(ZB.breathCone);
    ZB.solid = { x: ZB.x, z: ZB.z, r: 1.9, h: 3.4, y: SGY, pillar: true, mov: true };
    solids.push(ZB.solid);
    zbEyes();
    if (flag("herensugea")) zbFreed(true);
  }
  /* begien kolorea txandaren arabera (III: ezkerra urrea, eskuina urdina) */
  function zbEyes() {
    const k = ZB_EYE[Math.max(0, ZB.round)] || "sun";
    for (const E of ZB.eyes) {
      const c = k === "both" ? (E.side < 0 ? EYE_COL.sun : EYE_COL.moon) : EYE_COL[k];
      E.mat.color.set(c);
      E.mat.emissive.set(c);
      E.halo.material.color.set(c);
    }
  }
  const zbAwake = () => ZB.state === "idle" || ZB.state === "paw" || ZB.state === "breath" || ZB.state === "spit";
  /* buruaren mundu-posizioa (ahoa / begiak) */
  function zbHeadPos(out) {
    ZB.head.updateWorldMatrix(true, false);
    return out.set(0, 0, 1.4).applyMatrix4(ZB.head.matrixWorld);
  }
  function zbStart() {
    if (BOSS.on || flag("herensugea") || !ZB.g) return;
    const R = DGH.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "zezen";
    BOSS.weakR = 1.6;
    ZB.state = "intro";
    ZB.t = 0;
    ZB.round = -1;
    ZB.atkCd = 2.4;
    const fight = () => {
      ZB.state = "idle";
      ZB.t = 0;
      title("ZEZENGORRI", "");
      SND.roar();
      shake(0.6);
      zbRound(0);
      notify(L("Begi urreak: EGUZKIA (UDA). Argi-zutabe batean, ISPILUA begietara: itsututa, hormaren kontra joko du. Erasoan, saihestu (BULTZADA)!"), "", 7);
    };
    if (ZB.seenIntro) return fight();
    ZB.seenIntro = true;
    say(
      [
        ["· · ·", "Altxor-pilen artean, zezen gorri erraldoi bat altxatu da. Sudurretik, kea; begietan, itzal bat.", "", ZB.x, ZB.z, SGY + 3],
        ["ZEZENGORRI", "NIRE ALTXORRA. NIRE SUA. MIKELATSEN TXINGARRA. INOR EZ DA HURBILDUKO.", "", ZB.x, ZB.z, SGY + 4],
        ["AMAIUR", "Altxorra ez da zurea, Zezengorri, ezta txingarra ere. Eguzkia ekarri dut.", "", P.x, P.z, P.y],
        ["ZEZENGORRI", "EGUZKIA? HEMEN EZ DA EGUNIK, EZ GAURIK. ERRE ZAITEZ!", "", ZB.x, ZB.z, SGY + 4],
      ],
      fight,
    );
  }
  function zbRound(n) {
    ZB.round = n;
    ZB.hp = ZB.max = ZB_HP[n];
    ZB.light = ZB.sunT = ZB.moonT = 0;
    zbEyes();
    bossBar("ZEZENGORRI", zbTotal());
    if (n === 1) notify(L("Begiak urdin bihurtu zaizkio! Orain: ILARGIA (NEGUA), argi-zutabe batean."), "", 6);
    if (n === 2) notify(L("Begi bat urrea eta bestea urdina: EGUZKIA eta ILARGIA, bata bestearen atzetik!"), "", 6);
  }
  function zbTotal() {
    return clamp((3 - Math.max(0, ZB.round) - 1 + Math.max(0, ZB.hp) / ZB.max) / 3, 0, 1);
  }
  /* lurrera: TXINGARRA agerian (SORGINKERIA) */
  function zbDown(why, dur) {
    if (typeof why === "number") [why, dur] = [dur, why];
    ZB.state = "down";
    ZB.stun = dur || 4.6;
    ZB.run = null;
    ZB.light = ZB.sunT = ZB.moonT = 0;
    ZB.breathCone.visible = false;
    ZB.nose.material.opacity = 0;
    ZB.ember.visible = true;
    SND.thud();
    shake(why === "crash" ? 0.7 : 0.4);
    fxBurst(ZB.x, SGY + 0.4, ZB.z, { n: 40, speed: 5, up: 3, life: 0.9, size: 0.45, color: "#d6a58a", grav: 6 });
    if (why === "crash") ZB.stats.crash++;
    notifyOnce("zb-down", L("Lurrean! Bekokiko TXINGARRA agerian: SORGINKERIA!"), "");
  }
  function zbHit(n) {
    if (ZB.state !== "down") return;
    ZB.hp -= n;
    ZB.flash = 1;
    SND.hit ? SND.hit(1) : SND.thud();
    fxBurst(ZB.x, SGY + 3.4, ZB.z, { n: 16, speed: 3, up: 2, life: 0.5, size: 0.3, color: "#ffb347", grav: 3 });
    bossBar("ZEZENGORRI", zbTotal());
    if (ZB.hp > 0) return;
    if (ZB.round < 2) {
      ZB.state = "idle";
      ZB.ember.visible = false;
      ZB.atkCd = 2.2;
      SND.roar();
      return zbRound(ZB.round + 1);
    }
    zbDefeat();
  }
  /* EGUZKI-ISPILUA begietara (ispilua.js, beamHit-etik) */
  function zbLight(kind, dt) {
    if (!zbAwake()) return;
    const need = ZB_EYE[ZB.round];
    if (need === "both") {
      if (kind === "sun") ZB.sunT = Math.max(ZB.sunT, 3.5);
      else ZB.moonT = Math.max(ZB.moonT, 3.5);
      if (ZB.sunT > 0 && ZB.moonT > 0) {
        ZB.stats.light++;
        return zbBlind();
      }
      notifyOnce("zb-both-" + kind, kind === "sun" ? L("Begi urrea itsutu da! Orain, ILARGIA begi urdinera: NEGURA, azkar!") : L("Begi urdina itsutu da! Orain, EGUZKIA begi urrera: UDARA, azkar!"), "");
      return;
    }
    if (need !== kind) {
      notifyOnce("zb-wrong-" + need, need === "sun" ? L("Haren begiak urreak dira: EGUZKIA behar dute (UDA).") : L("Haren begiak urdinak dira: ILARGIA behar dute (NEGUA)."), "");
      return;
    }
    /* argia jasotzen: erasoa eten */
    if (ZB.state === "breath" || ZB.state === "spit") {
      ZB.state = "idle";
      ZB.breathCone.visible = false;
      ZB.nose.material.opacity = 0;
    }
    ZB.light += dt / 0.55;
    if (frame % 3 === 0) fxBurst(ZB.x, SGY + 3.2, ZB.z, { n: 2, speed: 2, up: 1, life: 0.3, size: 0.16, color: EYE_COL[kind], grav: 1 });
    if (ZB.light >= 1) {
      ZB.stats.light++;
      zbBlind();
    }
  }
  /* itsu: korrika itsuan, hormaren edo estalpe baten kontra */
  function zbBlind() {
    ZB.state = "blind";
    ZB.t = 0;
    ZB.light = ZB.sunT = ZB.moonT = 0;
    const a = Math.atan2(P.x - ZB.x, P.z - ZB.z) + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.8);
    ZB.run = { dx: Math.sin(a), dz: Math.cos(a), sp: 13, blind: true, d: 0 };
    ZB.a = a;
    SND.roar();
    notify(L("Itsututa! Korrika itsuan…"), "", 2.4);
  }
  /* oldarraldia: abisua (hankaz arrastatu), gero zuzen */
  function zbCharge() {
    const a = Math.atan2(P.x - ZB.x, P.z - ZB.z);
    ZB.a = a;
    ZB.run = { dx: Math.sin(a), dz: Math.cos(a), sp: 15, blind: false, d: 0, hit: false };
    ZB.state = "charge";
    ZB.t = 0;
    SND.roar();
  }
  /* estalpeak eta hormak: korrikan, aurrean? */
  function zbBlocked(x, z) {
    const R = DGH.bossRoom;
    if (x < R.x - 19 || x > R.x + 19 || z < -124.5 || z > -97.5) return true;
    for (const s of solids) {
      if (s === ZB.solid || s.h < 1.2 || s.y + s.h < SGY + 1 || Math.abs(s.x - R.x) > 22 || s.z > -94 || s.z < -128) continue;
      if (Math.hypot(x - s.x, z - s.z) < s.r + ZB_R * 0.8) return true;
    }
    return false;
  }
  function zbCovered(x0, z0, x1, z1) {
    const dx = x1 - x0,
      dz = z1 - z0,
      d = Math.hypot(dx, dz) || 1;
    for (const s of solids) {
      if (s === ZB.solid || s.h < 1.5 || s.y + s.h < SGY + 1.2 || s.noBeam) continue;
      if (rayCircle(x0, z0, dx / d, dz / d, s.x, s.z, s.r, d) >= 0) return true;
    }
    return false;
  }
  function zbFireball(n = 1) {
    zbHeadPos(ZV);
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
  function zbPickAttack() {
    const d = Math.hypot(P.x - ZB.x, P.z - ZB.z),
      r = Math.random();
    if (d > 8 && r < 0.55) {
      ZB.state = "paw";
      ZB.t = 0;
      return;
    }
    if (d < 9 && r < 0.6) {
      ZB.state = "breath";
      ZB.t = 0;
      ZB.breathT = 0;
      return;
    }
    ZB.state = "spit";
    ZB.t = 0;
  }
  /* jarrera: hankak, burua eta buztana (prozedurazkoa) */
  function zbPose(dt) {
    const run = ZB.state === "charge" || ZB.state === "blind",
      down = ZB.state === "down" || ZB.state === "freed";
    ZB.gallop += dt * (run ? 11 : 0);
    for (const Lg of ZB.legs) {
      let r = 0;
      if (run) r = Math.sin(ZB.gallop + (Lg.front ? 0 : PI) + (Lg.side > 0 ? 0.6 : 0)) * 0.75;
      else if (ZB.state === "paw" && Lg.front && Lg.side > 0) r = -0.4 + Math.sin(ZB.t * 14) * 0.5;
      Lg.pv.rotation.x = mix(Lg.pv.rotation.x, down ? (Lg.front ? -1.35 : 1.35) : r, 1 - Math.exp(-dt * 10));
    }
    const lowY = down ? -1.45 : run ? 0.15 * Math.abs(Math.sin(ZB.gallop)) : Math.sin(time * 1.4) * 0.04;
    ZB.g.position.y = mix(ZB.g.position.y, SGY + lowY, 1 - Math.exp(-dt * 8));
    const hx = ZB.state === "breath" ? -0.25 : run || ZB.state === "paw" ? 0.45 : down ? 0.35 : Math.sin(time * 0.9) * 0.06;
    ZB.head.rotation.x = mix(ZB.head.rotation.x, hx, 1 - Math.exp(-dt * 8));
    ZB.head.rotation.y = ZB.state === "blind" ? Math.sin(time * 18) * 0.25 : mix(ZB.head.rotation.y, 0, 1 - Math.exp(-dt * 6));
    ZB.tail.rotation.z = Math.sin(time * (run ? 9 : 2.2)) * 0.4;
    for (const E of ZB.eyes) E.halo.material.opacity = ZB.state === "blind" ? 0.15 + Math.random() * 0.5 : down ? 0.1 : 0.45 + ZB.light * 0.5;
    ZB.mat.emissiveIntensity = 0.45 + ZB.flash * 1.2;
    ZB.ember.material.emissiveIntensity = 1.6 + Math.sin(time * 8) * 0.5;
    ZB.g.rotation.y = mix(ZB.g.rotation.y, ZB.a, 1 - Math.exp(-dt * (run ? 20 : 4)));
  }
  function zbUpdate(dt) {
    if (!ZB.g || ZONE.cur !== "herensuge") return;
    const R = DGH.bossRoom;
    ZB.flash = Math.max(0, ZB.flash - dt * 3);
    if (ZB.state === "freed") {
      zbFreedUpdate(dt);
      zbPose(dt);
      return;
    }
    zbPose(dt);
    if (ZB.state === "sleep") {
      const open = saved.doors.includes(DGH.bossDoor);
      if (open && ROOM.cur === R && P.grounded && !cinematic && P.z < -99.5 && P.y > SGY - 1) zbStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    ZB.t += dt;
    ZB.sunT = Math.max(0, ZB.sunT - dt);
    ZB.moonT = Math.max(0, ZB.moonT - dt);
    ZB.light = Math.max(0, ZB.light - dt * 0.35);
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
    const want = Math.atan2(P.x - ZB.x, P.z - ZB.z);
    if (ZB.state === "idle") {
      ZB.a += Math.atan2(Math.sin(want - ZB.a), Math.cos(want - ZB.a)) * Math.min(1, dt * 2.2);
      ZB.atkCd -= dt;
      if (ZB.atkCd <= 0) zbPickAttack();
    } else if (ZB.state === "paw") {
      ZB.a += Math.atan2(Math.sin(want - ZB.a), Math.cos(want - ZB.a)) * Math.min(1, dt * 3);
      ZB.nose.material.opacity = 0.5 + Math.sin(time * 20) * 0.3;
      if (Math.random() < dt * 14) fxBurst(ZB.x + Math.sin(ZB.a + 0.6) * 1.6, SGY + 0.2, ZB.z + Math.cos(ZB.a + 0.6) * 1.6, { n: 3, speed: 1.6, up: 1.4, life: 0.6, size: 0.35, color: "#c8a080", grav: 2 });
      if (ZB.t > 1.15) {
        ZB.nose.material.opacity = 0;
        zbCharge();
      }
    } else if (ZB.state === "charge" || ZB.state === "blind") {
      const Rn = ZB.run,
        step = Rn.sp * dt,
        nx = ZB.x + Rn.dx * step,
        nz = ZB.z + Rn.dz * step;
      if (zbBlocked(nx + Rn.dx * 1.2, nz + Rn.dz * 1.2)) {
        /* talka: itsu bazegoen (edo estalpe/harri bat), lurrera; bestela, gelditu eta biratu */
        ZB.a = Math.atan2(Rn.dx, Rn.dz);
        if (Rn.blind) zbDown("crash", 4.6);
        else if (ZB.round >= 0 && Math.random() < 0.45) zbDown("crash", 2.6);
        else {
          ZB.state = "idle";
          ZB.atkCd = 1.4;
          shake(0.3);
          SND.thud();
        }
      } else {
        ZB.x = nx;
        ZB.z = nz;
        Rn.d += step;
        if (!Rn.hit && Math.hypot(P.x - ZB.x, P.z - ZB.z) < ZB_R + 0.3 && P.y < SGY + 2.2) {
          Rn.hit = true;
          playerHit(1, ZB.x, ZB.z);
        }
        if (Math.random() < dt * 20) fxBurst(ZB.x - Rn.dx * 2, SGY + 0.2, ZB.z - Rn.dz * 2, { n: 2, speed: 1.4, up: 1, life: 0.5, size: 0.4, color: "#c8a080", grav: 2 });
        if (!Rn.blind && Rn.d > 30) {
          ZB.state = "idle";
          ZB.atkCd = 1.6;
        }
      }
    } else if (ZB.state === "breath") {
      zbHeadPos(ZV);
      ZB.breathT += dt;
      ZB.nose.material.opacity = Math.min(1, ZB.breathT * 1.5);
      if (ZB.breathT > 0.8) {
        /* sua: konoa aurrera, apur bat jokalariarengana biratuz */
        ZB.a += Math.atan2(Math.sin(want - ZB.a), Math.cos(want - ZB.a)) * Math.min(1, dt * 0.9);
        const C = ZB.breathCone,
          len = 10,
          ang = 0.36;
        C.visible = true;
        C.position.copy(ZV);
        C.rotation.set(0, ZB.a, 0);
        C.scale.set(Math.tan(ang) * len, Math.tan(ang) * len * 0.6, len);
        C.material.opacity = 0.55 + Math.sin(time * 30) * 0.15;
        if (Math.random() < dt * 30) fxBurst(ZV.x + Math.sin(ZB.a) * 3, ZV.y - 0.5, ZV.z + Math.cos(ZB.a) * 3, { n: 3, speed: 6, up: 0.5, life: 0.5, size: 0.4, color: "#ff8a2a", grav: -1 });
        const dx = P.x - ZV.x,
          dz = P.z - ZV.z,
          d = Math.hypot(dx, dz),
          off = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - ZB.a), Math.cos(Math.atan2(dx, dz) - ZB.a)));
        if (d < len && off < ang && P.y < SGY + 2 && !zbCovered(ZV.x, ZV.z, P.x, P.z)) playerHit(1, ZV.x, ZV.z);
      }
      if (ZB.breathT > 2.5) {
        ZB.breathCone.visible = false;
        ZB.nose.material.opacity = 0;
        ZB.state = "idle";
        ZB.atkCd = 1.8;
      }
    } else if (ZB.state === "spit") {
      ZB.a += Math.atan2(Math.sin(want - ZB.a), Math.cos(want - ZB.a)) * Math.min(1, dt * 3);
      ZB.nose.material.opacity = Math.min(1, ZB.t * 2);
      if (ZB.t > 0.7 && !ZB.spat) {
        ZB.spat = true;
        zbFireball(ZB.round === 2 ? 3 : 1 + (ZB.round > 0 ? 1 : 0));
      }
      if (ZB.t > 1.3) {
        ZB.spat = false;
        ZB.nose.material.opacity = 0;
        ZB.state = "idle";
        ZB.atkCd = 1.6 + Math.random();
      }
    } else if (ZB.state === "down") {
      ZB.stun -= dt;
      if (ZB.stun <= 0) {
        ZB.state = "idle";
        ZB.ember.visible = false;
        ZB.atkCd = 1.4;
        SND.roar();
      }
    }
    ZB.solid.x = ZB.x;
    ZB.solid.z = ZB.z;
    ZB.g.position.x = ZB.x;
    ZB.g.position.z = ZB.z;
  }
  BOSSK.zezen = {
    vulnerable: () => ZB.state === "down",
    weak: () => {
      ZB.ember.getWorldPosition(ZV);
      return { x: ZV.x, y: ZV.y, z: ZV.z };
    },
    center: () => ({ x: ZB.x, y: SGY, z: ZB.z, h: 4.2, r: 2.6 }),
    hit: (n) => zbHit(n),
    /* itzulitako su-bola: zorabiatu */
    stagger: () => {
      if (!zbAwake()) return;
      ZB.stats.reflect++;
      zbDown("reflect", 3.6);
    },
    /* EGUZKI-ISPILUA: begiak (buruaren inguruan) */
    beamHit: (x, y, z, dx, dz, maxD) => {
      if (!zbAwake()) return null;
      zbHeadPos(ZV);
      const t = rayCircle(x, z, dx, dz, ZV.x, ZV.z, 1.7, maxD);
      return t >= 0 ? { t, y: ZV.y, on: (kind, dt) => zbLight(kind, dt) } : null;
    },
    beamAim: () => (zbAwake() ? [{ x: ZB.x + Math.sin(ZB.a) * 2.6, z: ZB.z + Math.cos(ZB.a) * 2.6 }] : []),
  };
  function zbDefeat() {
    BOSS.dead = true;
    ZB.state = "freed";
    ZB.t = 0;
    for (const F of ZB.fires) F.m.parent && F.m.parent.remove(F.m);
    ZB.fires.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ZB.breathCone.visible = false;
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    say(
      [
        ["· · ·", "Begietatik itzal bat atera zaio, ke beltz bat bezala, eta altxor-pilen artean desagertu da.", "", ZB.x, ZB.z, SGY + 3],
        ["ZEZENGORRI", "…Begiak. Argia. Mikelatsek itzal bat jarri zidan begietan, eta sua besterik ez nuen ikusten.", "", ZB.x, ZB.z, SGY + 3],
        ["AMAIUR", "Sei txingar itzulita. Bat falta da.", "", P.x, P.z, P.y],
        ["ZEZENGORRI", "Nire leizeko altxorra ez da urrea, sorgin: eguzkiaren oroitzapena da. Hartu nire suaren bihotza.", "", ZB.x, ZB.z, SGY + 3],
        ["ZEZENGORRI", "Eta entzun: Akerbeltz ez da leize honetan bizi. Akelarrean bizi da, sorginen ametsetan. Gaur gauean, lo egiten duzunean… kontuz.", "", ZB.x, ZB.z, SGY + 3],
      ],
      () => {
        zbFreed();
        saved.hearts = Math.max(saved.hearts, 6);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("herensugea");
        persist();
        itemGet("bihotza", L("ZEZENGORRIREN BIHOTZA"), L("Arnasa bat gehiago. Su epela, ez erretzen duena: etxeko sutondoarena bezala."), () => {
          title("ZEZENGORRI ASKE", "");
          say([["ZEZENGORRI", "Eateren hodei zuriak herrira eramango zaitu, sorgin. Zoaz.", "", ZB.x, ZB.z, SGY + 3]], zbFlightHome);
        });
      },
    );
  }
  /* askatuta: lasai, etzanda, begi urre epelak */
  function zbFreed(instant) {
    BOSS.on = false;
    ZB.state = "freed";
    ZB.ember.visible = false;
    ZB.round = 0;
    zbEyes();
    if (instant) {
      ZB.x = DGH.bossRoom.x;
      ZB.z = -121.5;
      ZB.a = 0;
      ZB.g.position.set(ZB.x, SGY, ZB.z);
    }
  }
  function zbFreedUpdate(dt) {
    ZB.a += Math.atan2(Math.sin(Math.atan2(P.x - ZB.x, P.z - ZB.z) - ZB.a), Math.cos(Math.atan2(P.x - ZB.x, P.z - ZB.z) - ZB.a)) * Math.min(1, dt * 0.8);
    for (const E of ZB.eyes) E.halo.material.opacity = 0.35;
    ZB.solid.x = ZB.x;
    ZB.solid.z = ZB.z;
  }
  /* Eateren hodei zuria: herrira */
  function zbFlightHome() {
    title("HODEI ZURIA", "");
    SND.whoosh();
    enterZone("ibarra", { x: 4.5, y: 0, z: 36, a: PI, cp: true });
    setTimeout(() => notify(L("Hodei zuri batek herrira ekarri zaitu, Ortziaren gainetik. Atarrabi zain dago plazan."), "", 6), 900);
  }
  /* (lehengo bertsioan, herensugea haranaren gainean hegan: aurrekuelan ez dago) */
  function skyDragonBuild() {}
  function skyDragonUpdate() {}
  /* bossReset-etik (bizitzak amaituta) */
  function zbReset() {
    if (!(BOSS.on && BOSS.kind === "zezen" && !BOSS.dead)) return;
    BOSS.on = false;
    ZB.state = "sleep";
    ZB.t = 0;
    ZB.round = -1;
    ZB.run = null;
    ZB.x = DGH.bossRoom.x;
    ZB.z = -121.5;
    ZB.a = 0;
    for (const F of ZB.fires) F.m.parent && F.m.parent.remove(F.m);
    ZB.fires.length = 0;
    ZB.breathCone.visible = false;
    ZB.ember.visible = false;
    ZB.nose.material.opacity = 0;
    zbEyes();
    bossBar(null);
  }
