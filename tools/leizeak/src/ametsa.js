  /* ==================================================================
     AMETSA · zazpigarren leizea (diseinu propioa) — Amaiurren ametsa, Ingumaren etxea
     Iturralden lo egin (SEASKA-KANTA eta hauts-zorroa eskuan) → izarrez betetako hutsunea:
     Amaiurren mantak uharte bihurtuta, altzariak hegan, erloju geldituak (denbora ez da igarotzen).
       M1 Ohe-uhartea .......... iritsiera; SUTONDOA; ohe erraldoia (ESNATU: etxera itzuli);
                                 iparrean IZAR-LAINOA: hautsa bota → izar-plataforma
       M2 Izar-eskailerak ...... uharte garaia: jauzi bikoitza eta AIREAN hautsa (izar-maila) →
                                 GILTZA TXIKIA. Mendebaldean, ENTZUN: ezkutuko harriak → arnasa-zatia
       M3 Mamuen sukaldea ...... (giltza txikiko atea) borroka: MAMUAK (atzetik agertzen dira);
                                 hautsarekin KONTATZEN → kalte bikoitza. Iparrean barrak.
       M4 Ate-zainen zubia ..... bi ATE-ZAIN: hautsa → kontatzen hasten dira → pasa, amaitu aurretik;
                                 tartean, izar-lainoa
       M5 Sehaskaren uhartea ... dei faltsua ("Irati"?), AMETS-GAIZTOA (mamu erraldoia); SEASKA
                                 sehaskaren ondoan → GILTZA NAGUSIA
       M6 Ingumaren ohea ....... ate handia → INGUMA (inguma.js)
     Hutsunera eroriz gero, azken lur segurura (arnasa bat galduta).
     ================================================================== */
  const AX = 2700;
  const AE = (x) => AX + x;
  ZONES.ametsa = { name: "AMETSA", outdoor: true, sky: true, dream: true, fallY: -16, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null };
  const DGA = {
    id: "ametsa",
    num: "07",
    entry: { x: AX, y: 0, z: 5.5, a: PI },
    /* ametsetik ez dago arkurik: ohean ESNATU (M1) edo Inguma garaitu */
    exitArch: { x: AX, z: 9999 },
    exitTo: () => ({ x: DGE.bed.x + 1.8, y: 0, z: DGE.bed.z, a: PI / 2, cp: true }),
    exitZone: "etxea",
    bigKey: "giltzanagusia-ametsa",
    bigKeyText: "Ingumaren ohe-gelara daraman ate handia irekitzen du.",
    bossDoor: "aE-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#c9a8ff", "#9fb8ff"],
    fog: [70, 330],
  };
  const AM = { quilts: {}, floaters: [], clocks: [], motes: null, cradle: null, txala: null, fake: false, wakeBed: null, gates: [], revealT: 0 };

  /* ------------------------------ eraikigaiak ------------------------------ */
  /* manta-uhartea: adabakiz egindako manta (lauburu-puntadak) gainean, izar-harri iluna azpian */
  function quiltTex(seed) {
    if (AM.quilts[seed]) return AM.quilts[seed];
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d"),
      cols = ["#7a2a3a", "#3a3f7a", "#8a6a3a", "#5a2a6a", "#2f5a6a", "#6a3a2a"];
    let sd = seed * 97 + 13;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        g.fillRect(i * 64, j * 64, 64, 64);
        /* adabaki bakoitzean, lauburu edo izar txiki bat */
        g.strokeStyle = "rgba(240,220,180,0.55)";
        g.lineWidth = 3;
        const cx = i * 64 + 32,
          cy = j * 64 + 32;
        if ((i + j) % 2) {
          for (let k = 0; k < 4; k++) {
            const a = (k * PI) / 2;
            g.beginPath();
            g.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 9, a, a + PI);
            g.stroke();
          }
        } else {
          g.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * TAU - PI / 2,
              r = k % 2 ? 6 : 15;
            k ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          g.closePath();
          g.stroke();
        }
      }
    /* josturak (puntadak) adabakien artean */
    g.setLineDash([6, 6]);
    g.strokeStyle = "rgba(255,240,200,0.6)";
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64, 256);
      g.moveTo(0, i * 64);
      g.lineTo(256, i * 64);
      g.stroke();
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return (AM.quilts[seed] = t);
  }
  let DREAM_UNDER = null;
  function dreamUnderMat() {
    return (DREAM_UNDER ||= new T.MeshStandardMaterial({ color: "#1b1433", emissive: new T.Color("#2a1a55"), emissiveIntensity: 0.35, roughness: 0.9, flatShading: true }));
  }
  function dreamIsland(o) {
    const { x, z, y } = o,
      rx = o.r,
      rz = o.rz || o.r,
      depth = o.depth || rx * 1.1;
    /* azpia: kono alderantzikatua, izar-puntu txikiekin */
    const ug = new T.ConeGeometry(1, 1, 14, 3);
    ug.rotateX(PI);
    ug.translate(0, -0.5, 0);
    ug.scale(rx, depth, rz);
    const under = obj(ug, dreamUnderMat());
    under.position.set(x, y - 0.3, z);
    under.castShadow = false;
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996 + x,
        k = ((i * 37) % 26) / 26,
        r = (1 - k) * 0.95;
      pts.push(x + Math.cos(a) * rx * r, y - 0.4 - k * depth * 0.95, z + Math.sin(a) * rz * r);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    BP.add(new T.Points(pg, new T.PointsMaterial({ color: "#e9dcff", size: 0.28, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending })));
    /* goia: manta (adabakiak) */
    const geo = new T.CircleGeometry(1, 40);
    geo.rotateX(-PI / 2);
    geo.scale(rx, 1, rz);
    const tex = quiltTex(o.seed ?? Math.round(x + z)).clone();
    tex.needsUpdate = true;
    tex.repeat.set(rx / 5, rz / 5);
    const top = obj(geo, new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    top.position.set(x, y + 0.02, z);
    top.castShadow = false;
    /* ertza: manta-ertz bilbatua (zilindro irekia) */
    const rim = new T.CylinderGeometry(1, 1, 1, 40, 1, true);
    rim.scale(rx * 1.01, 0.6, rz * 1.01);
    const rm = obj(rim, new T.MeshStandardMaterial({ color: "#c9a86a", roughness: 0.9 }));
    rm.position.set(x, y - 0.28, z);
    rm.castShadow = false;
    const p = { x, z, y, bottom: y - depth * 0.5, rx: rx * 0.975, rz: rz * 0.975, phase: o.phase ?? -1, area: o.area, m: top, safe: o.safe !== false };
    platforms.push(p);
    if (o.phase !== undefined && o.phase >= 0) {
      const ghost = new T.Mesh(new T.CylinderGeometry(rx, rx * 0.6, 0.5, 20), new T.MeshBasicMaterial({ color: ERA_COL[o.phase], wireframe: true, transparent: true, opacity: 0.18 }));
      ghost.position.set(x, y - 0.25, z);
      BP.add(ghost);
      p.ghost = ghost;
      p.m = top;
      phaseObjects.push(p);
    }
    return p;
  }
  /* manta-zubia: oihal-zerrenda tenkatua (adabakiak) */
  function quiltBridge(x, z, w, d, y, area) {
    const p = slab({ x, z, y, w, d, h: 0.5, area });
    const tex = quiltTex(Math.round(x * 3 + z)).clone();
    tex.needsUpdate = true;
    tex.repeat.set(w / 4, d / 4);
    p.m.material = new T.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    return p;
  }
  /* altzari hegalariak (apaingarriak): aulkia, mahaia, kandela, liburuak */
  function floater(kind, x, y, z, s = 1, rot = 0) {
    const g = new T.Group(),
      wood = material("#6e4a2c"),
      add = (geo, mat, px, py, pz) => {
        const m = new T.Mesh(geo, mat);
        m.position.set(px, py, pz);
        m.castShadow = false;
        g.add(m);
        return m;
      };
    if (kind === "aulkia") {
      add(new T.BoxGeometry(1, 0.15, 1), wood, 0, 1, 0);
      add(new T.BoxGeometry(1, 1.2, 0.15), wood, 0, 1.6, -0.45);
      for (const [a, b] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(new T.BoxGeometry(0.12, 1, 0.12), wood, a, 0.5, b);
    } else if (kind === "mahaia") {
      add(new T.BoxGeometry(2.4, 0.15, 1.4), wood, 0, 1, 0);
      for (const [a, b] of [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]]) add(new T.BoxGeometry(0.12, 1, 0.12), wood, a, 0.5, b);
    } else if (kind === "kandela") {
      add(new T.CylinderGeometry(0.16, 0.18, 0.9, 10), material("#f4ead2"), 0, 0.45, 0);
      const fl = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffcf8a", transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      fl.position.set(0, 1.05, 0);
      fl.scale.setScalar(1.6);
      g.add(fl);
    } else if (kind === "liburuak") {
      for (let i = 0; i < 4; i++) add(new T.BoxGeometry(0.9, 0.18, 0.65), material(["#7a2a3a", "#3a3f7a", "#8a6a3a", "#2f5a6a"][i]), (i % 2) * 0.1, 0.1 + i * 0.2, 0).rotation.y = i * 0.3;
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    BP.add(g);
    AM.floaters.push({ g, y0: y, ph: x * 0.3 + z * 0.17, spin: kind === "liburuak" ? 0.3 : 0.08 });
    return g;
  }
  /* erloju geldituak (OIHARTZUN-en erlojua gogoratuz): esfera, orratzak eta zenbaki-markak */
  function stoppedClock(x, y, z, r = 1.6) {
    const g = new T.Group(),
      face = new T.Mesh(new T.CircleGeometry(r, 36), material("#efe6d2")),
      rim = new T.Mesh(new T.TorusGeometry(r, r * 0.08, 6, 36), material("#b48a3e", 0.3));
    g.add(face, rim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU,
        mk = new T.Mesh(new T.BoxGeometry(r * 0.06, r * 0.18, 0.04), material("#3a2a1a"));
      mk.position.set(Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.82, 0.02);
      mk.rotation.z = -a;
      g.add(mk);
    }
    const hand1 = new T.Mesh(new T.BoxGeometry(r * 0.07, r * 0.75, 0.05), material("#1a1410")),
      hand2 = new T.Mesh(new T.BoxGeometry(r * 0.05, r * 0.5, 0.05), material("#1a1410"));
    hand1.geometry.translate(0, r * 0.35, 0.04);
    hand2.geometry.translate(0, r * 0.22, 0.05);
    hand1.rotation.z = -2.2;
    hand2.rotation.z = -0.4;
    g.add(hand1, hand2);
    /* arrakala: erlojua hautsita */
    const crack = new T.Mesh(new T.BoxGeometry(r * 1.4, r * 0.03, 0.03), material("#6a5a4a"));
    crack.rotation.z = 0.7;
    crack.position.z = 0.03;
    g.add(crack);
    g.position.set(x, y, z);
    g.lookAt(x, y, z + 10);
    BP.add(g);
    AM.clocks.push({ g, y0: y, ph: x + z, hand1, hand2 });
    return g;
  }
  /* sehaska erraldoia (M5): kulunkan; SEASKAk geldiarazten du */
  function cradleBuild(x, y, z) {
    const g = new T.Group(),
      wood = material("#8a5a34"),
      pale = material("#e9e1cf");
    const pivot = new T.Group();
    pivot.position.y = 1.4;
    g.add(pivot);
    /* kulunkak (bi arku) */
    for (const s of [-1, 1]) {
      const rocker = new T.Mesh(new T.TorusGeometry(2.6, 0.18, 6, 24, PI * 0.5), wood);
      rocker.rotation.set(0, PI / 2, PI * 1.25);
      rocker.position.set(s * 1.6, 0.4, 0);
      pivot.add(rocker);
    }
    const box = new T.Mesh(new T.BoxGeometry(3.8, 1.4, 5.2), wood);
    box.position.y = 1.2;
    pivot.add(box);
    const sheet = new T.Mesh(new T.BoxGeometry(3.4, 0.2, 4.8), pale);
    sheet.position.y = 1.95;
    pivot.add(sheet);
    const head = new T.Mesh(new T.BoxGeometry(3.8, 2.4, 0.3), wood);
    head.position.set(0, 2.2, -2.55);
    pivot.add(head);
    /* barrutik argi bat (lo dagoen haurraren oihartzuna?) */
    const glowS = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#e6dcff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    glowS.position.y = 2.6;
    glowS.scale.setScalar(4);
    pivot.add(glowS);
    g.position.set(x, y, z);
    BP.add(g);
    solids.push({ x, z, r: 2.9, h: 3, y, pillar: true });
    AM.cradle = { g, pivot, glowS, x, y, z, calm: isCleared("aD-seaska") ? 1 : 0 };
  }

  /* ------------------------------ eraikitzea ------------------------------ */
  function buildAmetsa() {
    dungeonBegin(DGA);
    /* ---- M1: Ohe-uhartea ---- */
    skyRoom("M1", AE(0), 0, 24, 24, { area: "aA", name: "OHE-UHARTEA", desc: "Zure ohea, baina erraldoia. Inguruan, izarrak eta isiltasuna.", rx: 12 });
    dreamIsland({ x: AE(0), z: 0, y: 0, r: 12, area: "aA", seed: 1 });
    /* ohe erraldoia (ESNATU) */
    const bed = new T.Group(),
      frame = new T.Mesh(new T.BoxGeometry(5.6, 1.4, 8.4), material("#6e4a2c")),
      sheet = new T.Mesh(new T.BoxGeometry(5.2, 0.5, 7.8), material("#f2efe6")),
      blanket = new T.Mesh(new T.BoxGeometry(5.4, 0.3, 4.8), material("#a8332a")),
      pillow = new T.Mesh(new T.BoxGeometry(3.6, 0.5, 1.4), material("#fbf8f0")),
      headb = new T.Mesh(new T.BoxGeometry(5.6, 3.4, 0.4), material("#6e4a2c"));
    frame.position.y = 0.7;
    sheet.position.y = 1.6;
    blanket.position.set(0, 1.9, 1.2);
    pillow.position.set(0, 2, -2.8);
    headb.position.set(0, 1.7, -4.2);
    bed.add(frame, sheet, blanket, pillow, headb);
    bed.traverse((n) => n.isMesh && ((n.castShadow = true), (n.receiveShadow = true)));
    bed.position.set(AE(-5.5), 0, -1);
    BP.add(bed);
    solids.push({ x: AE(-5.5), z: -1, r: 2.9, h: 2, y: 0, pillar: true }, { x: AE(-5.5), z: 2.2, r: 2.6, h: 2, y: 0, pillar: true }, { x: AE(-5.5), z: -4, r: 2.6, h: 2, y: 0, pillar: true });
    AM.wakeBed = { x: AE(-5.5), z: -1 };
    DGA.hearthA = sutondoa("aA-su", AE(5.5), 0, 2.5, 1.6, 1.8);
    floater("kandela", AE(8.5), 3.4, -6, 1.6);
    floater("aulkia", AE(-11), 5, 8, 1.4, 0.6);
    stoppedClock(AE(10), 7, -12, 2.2);
    stoppedClock(AE(-14), 9, -18, 1.4);
    /* izar-lainoa: M1 → M2 (hutsunea) */
    starMist({ x: AE(0), z: -16.5, w: 9, d: 10, y0: -6, y1: 6 });
    /* ---- M2: Izar-eskailerak ---- */
    skyRoom("M2", AE(0), -31, 18, 18, { area: "aB", name: "IZAR-ESKAILERAK", desc: "Goian, uharte txiki bat. Ez dago eskailerarik… zuk egin ezean.", rx: 9 });
    dreamIsland({ x: AE(0), z: -31, y: 0, r: 9, area: "aB", seed: 2 });
    /* goiko uhartetxoa: giltza txikia (izar-eskailerak behar dira) */
    dreamIsland({ x: AE(6.5), z: -38, y: 9, r: 3.4, area: "aB", seed: 3, depth: 3 });
    starMist({ x: AE(4), z: -35, w: 10, d: 9, y0: -2, y1: 12 });
    DGA.keyChest = chest("aB-key", AE(7), 9, -38.6, PI, { t: "key" });
    stoppedClock(AE(12), 11, -42, 1.8);
    floater("liburuak", AE(-8), 6, -36, 1.4);
    /* mendebaldean: ENTZUN → ezkutuko harriak → arnasa-zatia */
    for (const [hx, hz, hy] of [[-12.5, -32, 0.6], [-16.5, -33.5, 1.4], [-20.5, -35, 2.2]]) hiddenSlab(AE(hx), hz, hy, 2.4, 2.4);
    dreamIsland({ x: AE(-25), z: -36.5, y: 2.2, r: 2.8, area: "aB", seed: 4, depth: 2.5 });
    chest("aB-piece", AE(-25), 2.2, -36.5, PI / 2, { t: "piece", id: "ametsa" });
    /* ---- M2 → M3: manta-zubia eta giltza txikiko atea ---- */
    quiltBridge(AE(0), -45.5, 4, 11, 0, "aB");
    DOORDEF.aBn = door("aB-n", AE(0), -46, 0, 0, "key");
    /* ---- M3: Mamuen sukaldea (borroka) ---- */
    skyRoom("M3", AE(0), -62, 24, 22, {
      area: "aC",
      name: "MAMUEN SUKALDEA",
      desc: "Mahai bat, aulkiak, lapikoak… eta maindireak, inor barruan ez dutela.",
      rx: 12,
      rz: 11,
      waves: [[["mamua", -1, 2]], [["mamua", -1, 2], ["grunt", 1, 1]], [["mamua", -1, 3]]],
      diff: 1.15,
      hpK: 1.3,
      fightText: "Mamuak! Desagertu eta zure atzean agertzen dira. IZAR-HAUTSA: kontatzen hasten dira — orduan, kalte bikoitza.",
      onWin: () => {
        openDoor(DOORDEF.aCn);
        notify(L("Sukaldea isildu da. Iparreko barrak irekita."), "", 4);
      },
    });
    dreamIsland({ x: AE(0), z: -62, y: 0, r: 12, rz: 11, area: "aC", seed: 5 });
    floater("mahaia", AE(-4), 0.05, -64, 1.6, 0.3);
    floater("aulkia", AE(1.5), 0.05, -67, 1.4, 2.4);
    floater("kandela", AE(-4.5), 1.7, -64, 1);
    stoppedClock(AE(-14), 8, -66, 2);
    DOORDEF.aCn = door("aC-n", AE(0), -73.5, 0, 0, "bars", "M3");
    /* ---- M4: Ate-zainen zubia ---- */
    skyRoom("M4", AE(0), -88, 10, 26, { area: "aD", name: "ATE-ZAINEN ZUBIA", desc: "Bi harrizko zaindari. Kontatzen hasten direnean, ez dute ezer ikusten." });
    quiltBridge(AE(0), -79, 4, 10, 0, "aD");
    AM.gates.push(dustGate({ x: AE(0), z: -80, y: 0, w: 4, rot: 0 }));
    /* tartean: izar-lainoa (zubirik gabe) */
    starMist({ x: AE(0), z: -88.4, w: 6, d: 10.4, y0: -6, y1: 5 });
    quiltBridge(AE(0), -97, 4, 9, 0, "aD");
    AM.gates.push(dustGate({ x: AE(0), z: -97.5, y: 0, w: 4, rot: 0 }));
    /* ---- M5: Sehaskaren uhartea ---- */
    skyRoom("M5", AE(0), -114, 22, 22, { area: "aE", name: "SEHASKAREN UHARTEA", desc: "Sehaska bat, kulunkan, inork ukitu gabe. Txalaparta bat ondoan.", rx: 11 });
    dreamIsland({ x: AE(0), z: -114, y: 0, r: 11, area: "aE", seed: 6 });
    cradleBuild(AE(0), 0, -117);
    AM.txala = txalapartaMesh(AE(5.5), 0, -110, -PI / 2, "aE");
    TXALA.spots.push(AM.txala);
    DGA.bigChest = chest("aE-bigkey", AE(-5.5), 0, -110, PI / 4, { t: "bigkey" }, { hidden: !isCleared("aD-seaska") });
    DGA.hearthE = sutondoa("aE-su", AE(-7), 0, -120.5, 1.6, 1.6);
    stoppedClock(AE(15), 10, -106, 2.6);
    floater("kandela", AE(-10), 4, -108, 1.3);
    /* ---- M5 → M6: zubia eta ate handia ---- */
    quiltBridge(AE(0), -130, 4, 10, 0, "aE");
    DOORDEF.aEn = door("aE-n", AE(0), -126, 0, 0, "boss");
    /* ---- M6: Ingumaren ohea (etsai nagusia) ---- */
    skyRoom("M6", AE(0), -152, 36, 36, { area: "aF", name: "INGUMAREN OHEA", desc: "Ohe bat hutsunearen erdian. Norbait eserita dago gainean.", rx: 17 });
    dreamIsland({ x: AE(0), z: -152, y: 0, r: 17, area: "aF", seed: 7, depth: 14 });
    DGA.bossRoom = DGA.rooms.M6;
    ingumaBuild();
    dungeonEnd(DGA);
    /* izar-motak (partikulak hutsunean) */
    const pts = [];
    for (let i = 0; i < 260; i++) {
      const a = i * 2.39996,
        r = 25 + ((i * 53) % 90),
        h = -30 + ((i * 37) % 70);
      pts.push(AE(Math.cos(a) * r), h, -75 + Math.sin(a) * r * 1.4);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    AM.motes = new T.Points(pg, new T.PointsMaterial({ color: "#f3ecff", size: 0.5, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    ZONES.ametsa.group.add(AM.motes);
  }
  /* ------------------------------ ametsaren itxura ------------------------------ */
  const DREAM_FOG = new T.Color("#1a1232"),
    DREAM_FOG_PAST = new T.Color("#2a1830");
  function dreamVisuals() {
    sun.color.set(phaseBlend > 0.5 ? "#9fb8ff" : "#d7a8ff");
    sun.intensity = 0.95;
    ambient.intensity = 0.62 * (scene.environment ? 0.7 : 1);
    ambient.color.set("#b9a8ff");
    ambient.groundColor.set("#2a1f4a");
    scene.fog.color.copy(DREAM_FOG_PAST).lerp(DREAM_FOG, phaseBlend);
    scene.fog.near = DGA.fog[0];
    scene.fog.far = DGA.fog[1];
    playerLight.intensity = 1.6;
  }

  /* ------------------------------ eguneraketa ------------------------------ */
  /* SEASKA sehaskaren ondoan (seaska.js-tik): true → kudeatuta */
  function ametsaSeaska() {
    if (BOSS.on && BOSS.kind === "inguma") return ingumaLullaby();
    const C = AM.cradle;
    if (C && !isCleared("aD-seaska") && Math.hypot(P.x - C.x, P.z - C.z) < 9) {
      saved.cleared.push("aD-seaska");
      persist();
      SND.memory();
      fxRing(C.x, 0.2, C.z, "#e6dcff", 7, 1.2);
      fxBurst(C.x, 3, C.z, { n: 50, speed: 3, up: 2, life: 1.4, size: 0.34, color: "#f3ecff", grav: -0.6 });
      title("SEHASKA GELDITU DA", "");
      AM.revealT = 0.9;
      return true;
    }
    return false;
  }
  /* dei faltsua (M5-era iristean): "Irati"… ez da bera */
  function ametsaFakeCall() {
    if (AM.fake || saved.flags.includes("ametsa-deia")) return;
    AM.fake = true;
    deiaRing("IRATI", ["c7_f1", "c7_a3", "c7_n2"], () => {
      flagSet("ametsa-deia");
      notify(L("Inguma ahotsak egiten ditu. Sehaskaren ondoan, zerbait esnatzen da…"), "", 5);
    }, 4);
  }
  DGA.update = (dt) => {
    hearthsUpdate(dt);
    ingumaUpdate(dt);
    const R = DGA.rooms;
    /* kameraren ondoan dauden apaingarriak ezkutatu (ez dezatela ikuspegia estali) */
    const camNear = (g, r) => g.position.distanceToSquared(camera.position) < r * r;
    for (const F of AM.floaters) {
      F.g.position.y = F.y0 + Math.sin(time * 0.7 + F.ph) * 0.35;
      F.g.rotation.y += dt * F.spin;
      F.g.visible = !camNear(F.g, 6);
    }
    for (const C of AM.clocks) {
      C.g.position.y = C.y0 + Math.sin(time * 0.5 + C.ph) * 0.5;
      C.g.visible = !camNear(C.g, 9);
      /* orratzak dardaraka: denbora ez da igarotzen */
      C.hand1.rotation.z = -2.2 + Math.sin(time * 9 + C.ph) * 0.02;
    }
    if (AM.motes) AM.motes.rotation.y += dt * 0.004;
    /* sehaska geldi → giltza nagusiaren kutxa agerian */
    if (AM.revealT > 0 && (AM.revealT -= dt) <= 0) {
      revealChest(DGA.bigChest);
      notify(L("Sehaska isildu da. Giltza handi bat agertu da, haren ondoan."), "", 4.5);
    }
    /* sehaska: kulunka (SEASKAren ondoren, geldi) */
    const Cr = AM.cradle;
    if (Cr) {
      Cr.calm = mix(Cr.calm, isCleared("aD-seaska") ? 1 : 0, 1 - Math.exp(-dt * 1.2));
      Cr.pivot.rotation.z = Math.sin(time * 1.3) * 0.22 * (1 - Cr.calm);
      Cr.glowS.material.opacity = 0.35 + 0.3 * (1 - Cr.calm) + Math.sin(time * 2) * 0.08;
    }
    /* M1: lehen aldiz, izar-hautsaren pista */
    if (ROOM.cur === R.M1 && P.z < -7 && P.grounded) notifyOnce("ametsa-hautsa", L("Hutsunea, eta izar-lainoa. Bota IZAR-HAUTSA lainora: izar-plataforma bat!"), "");
    /* M5: dei faltsua, gero amets-gaiztoa */
    if (ROOM.cur === R.M5 && P.grounded && P.z < -105) ametsaFakeCall();
    if (R.M5 && !MINI.e && !ROOM.fight && !cinematic && !RING.on && ROOM.cur === R.M5 && saved.flags.includes("ametsa-deia") && !isCleared("aE-mini") && P.grounded && Math.hypot(P.x - R.M5.x, P.z - R.M5.z) < 9)
      miniBegin(
        R.M5,
        {
          type: "mamua",
          name: "AMETS-GAIZTOA",
          clearId: "aE-mini",
          hp: 36,
          scale: 2.2,
          K: 1.2,
          tint: "#cbb8ff",
          add: [["mamua", -1, 2]],
          hint: "Amets-gaiztoa! Desagertu eta atzean agertzen da: IZAR-HAUTSA, eta kontatzen ari den bitartean, jo.",
          onDead: () => notify(L("Amets-gaiztoa desagertu da. Sehaska kulunkan dago oraindik… SEASKA kantatu haren ondoan."), "", 6),
        },
        R.M5.x,
        R.M5.z + 2,
      );
    /* ohean ESNATU (M1): ametsetik irten */
  };
  /* ekintzak (actionHere-tik): ESNATU ohe erraldoian */
  function ametsaActionNear() {
    if (ZONE.cur !== "ametsa" || !AM.wakeBed || BOSS.on) return null;
    /* Inguma garaituta (eta oraindik esnatu gabe, adib. partida berriz kargatuta): egunsentira */
    const done = saved.flags.includes("inguma") && !saved.flags.includes("irati-inguma");
    if (Math.hypot(P.x - AM.wakeBed.x, P.z - AM.wakeBed.z) < 4.2 && P.y < 2)
      return {
        kind: "hearth",
        label: L("ESNATU"),
        fn: () => (done ? ametsaWake() : dialog(L("AMETSA"), L("Esnatu?"), "", L("Ohean etzan eta begiak ireki: Iturraldera itzuliko zara. Ametsa zain geratuko da."), "", [[L("ESNATU"), () => setTimeout(() => enterZone("etxea", DGA.exitTo()), 0)], [L("EZ ORAIN"), () => {}]])),
      };
    return null;
  }
  DGA.objective = () => {
    const R = DGA.rooms,
      has = (k) => saved.items.includes(k);
    if (saved.flags.includes("inguma")) return ["Ametsa amaituta. Esnatu (ohe erraldoia, hegoan).", [AM.wakeBed.x, AM.wakeBed.z + 3, 0]];
    if (!saved.doors.includes("aB-n") && !(saved.keyz.ametsa > 0)) {
      if (ROOM.cur === R.M1 || P.z > -21) return ["Iparrera, hutsunearen gainetik: IZAR-HAUTSA izar-lainora (Z) → izar-plataforma.", [AE(0), -16.5, 0]];
      return ["Goiko uhartetxoa: jauzi bikoitza, eta AIREAN hautsa bota → izar-maila oinen azpian.", [AE(6.5), -38, 9]];
    }
    if (!saved.doors.includes("aB-n")) return ["Iparreko atea: giltza txikia.", [AE(0), -44, 0]];
    if (!isCleared("M3")) return ["Mamuen sukaldea: IZAR-HAUTSA → kontatzen → kalte bikoitza.", [R.M3.x, R.M3.z, 0]];
    if (!has(DGA.bigKey)) {
      if (P.z > -101) return ["Ate-zainak: hautsa bota → kontatzen hasten dira → pasa, amaitu aurretik.", [AE(0), -88, 0]];
      if (!isCleared("aE-mini") && saved.flags.includes("ametsa-deia")) return ["Sehaskaren uhartea: amets-gaiztoa.", [R.M5.x, R.M5.z, 0]];
      if (!isCleared("aD-seaska")) return ["Sehaskaren ondoan, txalaparta: SEASKA (◀ ▶ ◀ ▶ ◀).", [AM.txala.x, AM.txala.z, 0]];
      return ["Giltza nagusiaren kutxa, sehaskaren ondoan.", [DGA.bigChest.x, DGA.bigChest.z, 0]];
    }
    if (!saved.doors.includes(DGA.bossDoor)) return ["Iparrean, ate handia: giltza nagusia.", [AE(0), -124, 0]];
    return ["Ingumaren ohea.", [R.M6.x, R.M6.z + 10, 0]];
  };
