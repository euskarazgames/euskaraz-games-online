  /* ==================================================================
     BASAJAUNEN LEIZEA · lehen leizea (diseinu propioa)
       A Sarrera ........ bi sutegi: SORGINKERIAz biak batera piztu → barrak
       B Garaien amildegia  garai bateko plataformak (aldatu garaia airean)
       C Kaxen gela ....... kaxak pilatu ertz altura → GILTZA TXIKIA
       D Itzalen gela ..... borroka (ateak itxi) → ekialdea eta mendebaldea ireki
       E Oihartzunen gela . iluna: harri-danborra (ENTZUN) eta ezkutuko plataformak
       F Zaindariaren gela  etsai ertaina → SUGAARREN KATEA
       G Sugearen putzua .. katea eraztunetara → GILTZA NAGUSIA
       I Basajaunen bihotza etsai nagusia (boss.js)
     Piezak (KayKit Dungeon, CC0) InstancedMesh bidez: dei gutxi mugikorrean.
     ================================================================== */
  const DX = 600,
    DS = 1.5;
  const DUNGEON = {
    id: "leizea",
    num: "01",
    entry: { x: DX, y: 0, z: 8.5, a: PI },
    exitArch: { x: DX, z: 12.2 },
    exitTo: () => ({ x: HUB.cave.x, y: 5, z: HUB.cave.z + 5, a: 0, cp: true }),
    bigKey: "giltzanagusia",
    bossDoor: "dD-n",
    lights: [],
    torches: [],
    drum: null,
    rooms: {},
    torchCol: ["#ffb36b", "#a9d8ff"],
    fog: [10, 62],
  };
  /* leize guztien erregistroa (zona → datuak); BDG: eraikitzen ari den leizea */
  const DGS = { leizea: DUNGEON };
  let BDG = DUNGEON;
  function dungeonBegin(DG) {
    DGS[DG.id] = DG;
    BDG = DG;
    zoneBuild(DG.id);
  }
  /* sortak bildu, argi mugikorrak eta lehendik irekitako ateak */
  function dungeonEnd(DG) {
    batchFlush();
    for (let i = 0; i < 2; i++) {
      const l = new T.PointLight(DG.torchCol[0], 0, 22, 1.6);
      BP.add(l);
      DG.lights.push(l);
    }
    for (const id of saved.doors) {
      const D = DOORS.find((d) => d.id === id);
      if (D) openDoor(D, true);
    }
  }
  const DOORDEF = {};
  /* ---- piezen sortak (instantziak) ----
     Hormak alde bakoitzeko sorta batean (material propioarekin): kamera eta Amaiurren artean
     dagoen horma gardendu egiten da (wallsFade), zuzien suarekin batera. */
  const BATCH = new Map();
  const WALLS = { cur: null, sides: [] };
  const QY = new T.Quaternion();
  function sideBegin(ax, az, bx, bz) {
    WALLS.cur = { ax, az, bx, bz, items: new Map(), mats: [], k: 0, group: BP };
    WALLS.sides.push(WALLS.cur);
    return WALLS.cur;
  }
  function sideEnd() {
    WALLS.cur = null;
  }
  function bprop(name, x, y, z, s = DS, rot = 0) {
    if (!PROP[name]) return;
    const m = new T.Matrix4().compose(new T.Vector3(x, y, z), QY.setFromAxisAngle(UP_AXIS, rot).clone(), new T.Vector3(s, s, s));
    const B = WALLS.cur ? WALLS.cur.items : BATCH;
    if (!B.has(name)) B.set(name, []);
    B.get(name).push(m);
  }
  function instFlush(map, own) {
    for (const [name, list] of map) {
      const base = PROP[name];
      base.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(base.matrixWorld).invert();
      base.traverse((n) => {
        if (!n.isMesh) return;
        const local = new T.Matrix4().multiplyMatrices(inv, n.matrixWorld),
          mat = own || BDG.tint ? n.material.clone() : n.material,
          im = new T.InstancedMesh(n.geometry, mat, list.length),
          t = new T.Matrix4();
        if (BDG.tint) mat.color.multiply(new T.Color(BDG.tint));
        if (own) own.push(mat);
        list.forEach((M, i) => im.setMatrixAt(i, t.multiplyMatrices(M, local)));
        im.castShadow = false;
        im.receiveShadow = true;
        BP.add(im);
      });
    }
    map.clear();
  }
  function batchFlush() {
    instFlush(BATCH, null);
    for (const S of WALLS.sides) if (S.items.size) instFlush(S.items, S.mats);
  }
  /* bi zuzenki gurutzatzen dira (xz planoan)? */
  function segCross(ax, az, bx, bz, cx, cz, dx, dz) {
    const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
    if (Math.abs(den) < 1e-9) return false;
    const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den,
      u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
    return t > 0 && t < 1 && u > -0.04 && u < 1.04;
  }
  function wallsFade(dt, tx, tz) {
    const cx = camera.position.x,
      cz = camera.position.z,
      grp = ZONES[ZONE.cur].group,
      kk = 1 - Math.exp(-dt * 10);
    for (const S of WALLS.sides) {
      if (S.group !== grp) continue;
      const want = segCross(cx, cz, tx, tz, S.ax, S.az, S.bx, S.bz) ? 1 : 0;
      if (S.k === want) continue;
      S.k = Math.abs(S.k - want) < 0.01 ? want : mix(S.k, want, kk);
      for (const m of S.mats) {
        const o0 = m.userData.op0 ?? (m.userData.op0 = m.opacity);
        m.transparent = S.k > 0.01 || o0 < 1;
        m.opacity = o0 * (1 - 0.82 * S.k);
        m.depthWrite = S.k < 0.3 && o0 >= 1;
      }
    }
  }
  /* ---- gela bat: zorua, hormak (ateen hutsuneekin), zuziak ---- */
  /* doors: { n|s|e|w: offset (gelaren erditik, metroetan) } — hutsunea 6 m */
  function room(id, x, z, w, d, opts = {}) {
    const y = opts.y || 0;
    const R = { id, x, z, w, d, y, zone: BDG.id, area: opts.area, waves: opts.waves, diff: opts.diff, hpK: opts.hpK, fightText: opts.fightText, fog: opts.fog, onWin: opts.onWin, sides: {} };
    ROOMS.push(R);
    BDG.rooms[id] = R;
    if (opts.area) ROOMS_AREA[opts.area] = [opts.name, opts.desc || ""];
    /* zorua: zatika (amildegiak utzi) */
    for (const f of opts.floors || [[x, z, w, d]]) {
      const [fx, fz, fw, fd] = f;
      /* lauzen azpian: ikusgaia apur bat beherago (z-fighting-ik ez) */
      slab({ x: fx, z: fz, y, w: fw, d: fd, h: 1.2, mat: "dark", area: opts.area }).m.position.y -= 0.12;
      for (let ix = 0; ix < Math.round(fw / 6); ix++)
        for (let iz = 0; iz < Math.round(fd / 6); iz++) {
          const tx = fx - fw / 2 + 3 + ix * 6,
            tz = fz - fd / 2 + 3 + iz * 6;
          bprop((ix * 7 + iz * 3 + Math.round(x)) % 5 === 0 ? "floor_tile_large_rocks" : "floor_tile_large", tx, y - 0.075, tz, DS, ((ix + iz) % 4) * (PI / 2));
        }
    }
    /* hormak: alde bakoitza bere sortan (gardentzeko) eta talka-blokeak hutsuneen bi aldeetan */
    /* wallH: talka-hormen altuera (ertz garaiak dituzten geletan, gainetik ibiltzerik ez) */
    const doors = opts.doors || {},
      wallH = opts.wallH || 7;
    const SIDES = {
      n: { len: w, at: (o) => [x + o, z - d / 2], rot: 0, seg: [x - w / 2, z - d / 2, x + w / 2, z - d / 2], col: (a, b) => wallBlock(x + (a + b) / 2, z - d / 2, b - a, 1.6, 0, y, wallH) },
      s: { len: w, at: (o) => [x + o, z + d / 2], rot: PI, seg: [x - w / 2, z + d / 2, x + w / 2, z + d / 2], col: (a, b) => wallBlock(x + (a + b) / 2, z + d / 2, b - a, 1.6, 0, y, wallH) },
      e: { len: d, at: (o) => [x + w / 2, z + o], rot: -PI / 2, seg: [x + w / 2, z - d / 2, x + w / 2, z + d / 2], col: (a, b) => wallBlock(x + w / 2, z + (a + b) / 2, 1.6, b - a, 0, y, wallH) },
      w: { len: d, at: (o) => [x - w / 2, z + o], rot: PI / 2, seg: [x - w / 2, z - d / 2, x - w / 2, z + d / 2], col: (a, b) => wallBlock(x - w / 2, z + (a + b) / 2, 1.6, b - a, 0, y, wallH) },
    };
    for (const key of ["n", "s", "e", "w"]) {
      const S = SIDES[key],
        gap = doors[key],
        n = Math.round(S.len / 6);
      R.sides[key] = sideBegin(...S.seg);
      for (let i = 0; i < n; i++) {
        const off = -S.len / 2 + 3 + i * 6;
        if (gap !== undefined && Math.abs(off - gap) < 0.1) continue;
        const [px, pz] = S.at(off);
        bprop(key === "n" && i % 2 === 0 ? "wall_pillar" : "wall", px, y, pz, DS, S.rot);
      }
      sideEnd();
      const segs = gap === undefined ? [[-S.len / 2, S.len / 2]] : [[-S.len / 2, gap - 3], [gap + 3, S.len / 2]];
      for (const [a, b] of segs) if (b - a > 0.1) S.col(a, b);
    }
    for (const [cx, cz] of [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]]) bprop("pillar", cx, y, cz, DS * 0.9, 0);
    /* zuziak: iparreko eta hegoko hormetan (hegokoak bere hormarekin gardentzen dira) */
    for (const s of [-1, 1])
      for (const k of [-0.3, 0.3]) {
        const tx = x + k * w,
          tz = z + (s * d) / 2 - s * 0.8,
          key = s < 0 ? "n" : "s";
        if (doors[key] !== undefined && Math.abs(k * w - doors[key]) < 4) continue;
        torch(tx, y + 3.6, tz, s < 0 ? 0 : PI, R.sides[key]);
      }
    return R;
  }
  function torch(x, y, z, rot, side) {
    const prev = WALLS.cur;
    WALLS.cur = side || null;
    bprop("torch_mounted", x, y - 0.6, z, DS * 0.9, rot);
    WALLS.cur = prev;
    const fx = x + Math.sin(rot) * 0.55,
      fz = z + Math.cos(rot) * 0.55;
    const fl = glow(fx, y + 0.35, fz, BDG.torchCol[0], 2.4);
    BDG.torches.push({ x: fx, y: y + 0.35, z: fz, fl, ph: Math.random() * 10, side });
  }
  /* korridorea: zorua eta bi horma (bakoitza bere sortan) */
  function corridor(x, z, w, d, axis) {
    slab({ x, z, y: 0, w, d, h: 1.2, mat: "dark", area: null }).m.position.y -= 0.12;
    if (axis === "z") {
      const n = Math.round(d / 6);
      for (let i = 0; i < n; i++) bprop("floor_dirt_large", x, -0.075, z - d / 2 + 3 + i * 6, DS, 0);
      for (const s of [-1, 1]) {
        sideBegin(x + (s * w) / 2, z - d / 2, x + (s * w) / 2, z + d / 2);
        for (let i = 0; i < n; i++) bprop("wall", x + (s * w) / 2, 0, z - d / 2 + 3 + i * 6, DS, (s * -PI) / 2);
        sideEnd();
        wallBlock(x + (s * w) / 2, z, 1.6, d, 0, 0, 7);
      }
    } else {
      const n = Math.round(w / 6);
      for (let i = 0; i < n; i++) bprop("floor_dirt_large", x - w / 2 + 3 + i * 6, -0.075, z, DS, 0);
      for (const s of [-1, 1]) {
        sideBegin(x - w / 2, z + (s * d) / 2, x + w / 2, z + (s * d) / 2);
        for (let i = 0; i < n; i++) bprop("wall", x - w / 2 + 3 + i * 6, 0, z + (s * d) / 2, DS, s < 0 ? 0 : PI);
        sideEnd();
        wallBlock(x, z + (s * d) / 2, w, 1.6, 0, 0, 7);
      }
    }
  }
  /* zutabe garaia (eraztunarentzat): gaina plataforma */
  function ringPillar(x, z, top, ringY) {
    bprop("pillar", x, 0, z, DS, 0);
    const col = obj(new T.CylinderGeometry(1.2, 1.4, top + 9, 10), rockMaterial());
    col.position.set(x, (top - 9) / 2, z);
    platforms.push({ x, z, y: top, bottom: -9, w: 2.6, d: 2.6, phase: -1, safe: true, slick: true });
    return serpentRing(x, ringY, z, 0);
  }
  /* ezkutuko plataforma (ENTZUN-ek agerian uzten du) */
  function hiddenSlab(x, z, y, w, d) {
    const m = obj(new T.BoxGeometry(w, 0.5, d), new T.MeshStandardMaterial({ color: "#bff6ff", emissive: new T.Color("#5fb8d6"), emissiveIntensity: 0.8, transparent: true, opacity: 0, roughness: 0.4 }));
    m.position.set(x, y - 0.25, z);
    m.visible = false;
    const p = { x, z, y, bottom: y - 0.5, w, d, phase: -1, hidden: true, off: true, m, safe: false };
    platforms.push(p);
    return p;
  }

  function buildDungeon() {
    dungeonBegin(DUNGEON);
    const E = (x) => DX + x;
    /* ---- A: Sarrera ---- */
    room("A", E(0), 0, 24, 24, { area: "dA", name: "LEIZEAREN SARRERA", desc: "Bi sutegi itzalita. Iparreko barrak itxita.", doors: { n: 0, s: 0 } });
    slab({ x: E(0), z: 15, y: 0, w: 6, d: 6, h: 1.2, mat: "dark" });
    wallBlock(E(-3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(0), 18.2, 6, 0.8, 0, 0, 7);
    const arch = obj(new T.PlaneGeometry(5, 5.6), new T.MeshBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    arch.position.set(E(0), 2.8, 17.6);
    DUNGEON.exitGlow = arch;
    RUNE_SETS.push({
      id: "dA-fire",
      zone: "leizea",
      kind: "fire",
      time: 10,
      runes: [[E(-6), 1.6, -5, -1], [E(6), 1.6, -5, -1]],
      hint: "Bi sutegi itzalita. Piztu biak SORGINKERIArekin, elkarren segidan!",
      onSolve: () => {
        openDoor(DOORDEF.Abars);
        title("BARRAK IREKI DIRA", "");
      },
    });
    for (const [bx, bz] of [[E(-9), 8], [E(9), 7], [E(-8.5), -9]]) breakable("barrel", bx, 0, bz);
    bprop("banner_patternA_green", E(-5), 0, -11.2, DS * 0.8, 0);
    bprop("banner_patternA_green", E(5), 0, -11.2, DS * 0.8, 0);
    bprop("rubble_half", E(7), 0, 9, DS * 0.6, 0.4);
    /* ---- A→B ---- */
    corridor(E(0), -15, 6, 6, "z");
    DOORDEF.Abars = door("dA-n", E(0), -12, 0, 0, "bars");
    /* ---- B: Garaien amildegia ---- */
    room("B", E(0), -36, 30, 36, {
      area: "dB",
      name: "GARAIEN AMILDEGIA",
      desc: "Plataformak garai batean bakarrik daude. Aldatu garaia airean.",
      doors: { s: 0, w: 9, n: 0 },
      floors: [[E(0), -24, 30, 12], [E(0), -48, 30, 12]],
    });
    /* iragana → oraina → iragana: garaia airean aldatu behar da */
    bridge(E(-4), -33, 0, 5, 4, 0);
    bridge(E(4), -37.5, 0, 5, 4, 1);
    bridge(E(-3), -42, 0, 5, 4, 0);
    for (const [px, pz] of [[E(-12), -21], [E(12), -21], [E(-12), -51], [E(12), -51]]) {
      bprop("column", px, 0, pz, DS * 1.4, 0);
      solids.push({ x: px, z: pz, r: 0.8, h: 3, y: 0, pillar: true });
    }
    for (let i = 0; i < 5; i++) bprop("rubble_half", E(-12 + i * 6), -9, -36, DS * 0.7, i);
    /* ---- B→C ---- */
    corridor(E(-19.5), -27, 9, 6, "x");
    /* ---- C: Kaxen gela ---- */
    room("C", E(-36), -36, 24, 24, { area: "dC", name: "KAXEN GELA", desc: "Ertz altuegia jauzi egiteko. Kaxak, berriz…", doors: { e: 9 } });
    const ledge = slab({ x: E(-36), z: -45, y: 6.2, w: 24, d: 6, h: 6.2, mat: "dark", area: "dC" });
    ledge.slick = true;
    chest("dC-key", E(-36), 6.2, -45.5, 0, { t: "key" });
    PUZZLE_DEFS.push({
      id: "dC-craft",
      zone: "leizea",
      area: { x: E(-36), z: -33, y: 0, w: 22, d: 16 },
      goal: ledge,
      supports: [ledge],
      crates: [[E(-42), -28], [E(-30), -28], [E(-36), -31]],
      planks: [],
      ghost: [[E(-36), -40.4, 1], [E(-36), -40.4, 2], [E(-36), -40.4, 3]],
    });
    /* ---- B→D ---- */
    corridor(E(0), -58.5, 6, 9, "z");
    DOORDEF.Bkey = door("dB-n", E(0), -54, 0, 0, "key");
    /* ---- D: Itzalen gela (borroka) ---- */
    room("D", E(0), -78, 30, 30, {
      area: "dD",
      name: "ITZALEN GELA",
      desc: "",
      doors: { s: 0, e: 12, w: 0, n: 0 },
      waves: [[["grunt", -1, 3]], [["grunt", 0, 2], ["grunt", 1, 2]], [["eye", -1, 1], ["grunt", -1, 2], ["brute", 1, 1]]],
      diff: 1,
      hpK: 1.2,
      fightText: "Basajaunen itzalak! Kolore bakoitza bere garaian zauritzen da.",
      onWin: () => {
        openDoor(DOORDEF.De);
        openDoor(DOORDEF.Dw);
        notify(L("Ekialdeko eta mendebaldeko barrak ireki dira."), "", 4);
      },
    });
    for (const [px, pz] of [[E(-6), -72], [E(6), -72], [E(-6), -84], [E(6), -84]]) {
      bprop("pillar_decorated", px, 0, pz, DS * 0.9, 0);
      solids.push({ x: px, z: pz, r: 1.3, h: 6, y: 0, pillar: true });
    }
    /* estalpeak: kutxa-pilak iparraldean (proiektiletatik babesteko) eta ezkutuko zorroa */
    coverBlock(E(-9.5), -88.5, 2.6, 1.4, 1.8, 0, "crates");
    coverBlock(E(9.5), -88.5, 2.6, 1.4, 1.8, 0, "crates");
    pouch("dD-zorroa", E(9.5), 0, -90.2, 12);
    DOORDEF.De = door("dD-e", E(15), -66, PI / 2, 0, "bars", "D");
    DOORDEF.Dw = door("dD-w", E(-15), -78, PI / 2, 0, "bars", "D");
    DOORDEF.Dn = door("dD-n", E(0), -93, 0, 0, "boss");
    DOORDEF.Bkey.room = "D";
    /* ---- D→E ---- */
    corridor(E(18), -66, 6, 6, "x");
    /* ---- E: Oihartzunen gela (iluna) ---- */
    room("E", E(36), -78, 30, 30, {
      area: "dE",
      name: "OIHARTZUNEN GELA",
      desc: "Ilun dago. Harri-danbor batek zerbait dio…",
      doors: { w: 12, n: 0 },
      floors: [[E(36), -66.5, 30, 7], [E(36), -89.5, 30, 7]],
      fog: [4, 30],
    });
    for (const [hx, hz] of [[E(28), -73.5], [E(33), -77.5], [E(38), -81.5], [E(43), -84.6]]) hiddenSlab(hx, hz, 0, 3.2, 3.2);
    DUNGEON.drum = { x: E(36), z: -66.5, y: 0 };
    const drum = obj(new T.CylinderGeometry(1.3, 1.5, 1.6, 14), rockMaterial());
    drum.position.set(E(36), 0.8, -66.5);
    const skin = obj(new T.CircleGeometry(1.25, 20), material("#c9a27a"));
    skin.rotation.x = -PI / 2;
    skin.position.set(E(36), 1.62, -66.5);
    DUNGEON.drumSkin = skin;
    solids.push({ x: E(36), z: -66.5, r: 1.5, h: 1.6, y: 0, pillar: true });
    chest("dE-piece", E(48), 0, -65.5, -PI / 2, { t: "piece", id: "leizea" }, { hidden: true });
    ringPillar(E(26), -78, 2.4, 4.8);
    serpentRing(E(36), 4.2, -91.6, 0);
    serpentRing(E(36), 4.2, -64.4, PI);
    /* ---- E→F ---- */
    corridor(E(36), -99, 6, 12, "z");
    /* ---- F: Zaindariaren gela ---- */
    room("F", E(36), -120, 30, 30, { area: "dF", name: "ZAINDARIAREN GELA", desc: "", doors: { s: 0 } });
    for (const [px, pz] of [[E(26), -110], [E(46), -110], [E(26), -130], [E(46), -130]]) {
      bprop("column", px, 0, pz, DS * 1.4, 0);
      solids.push({ x: px, z: pz, r: 0.8, h: 3, y: 0, pillar: true });
    }
    DUNGEON.chainChest = chest("dF-katea", E(36), 0, -124, 0, { t: "item", id: "katea" }, { hidden: !saved.cleared.includes("dF-boss") });
    /* ---- D→G ---- */
    corridor(E(-18), -78, 6, 6, "x");
    /* ---- G: Sugearen putzua ---- */
    room("G", E(-36), -78, 30, 30, {
      area: "dG",
      name: "SUGEAREN PUTZUA",
      desc: "Putzu sakona. Suge-eraztunak zutabeen gainean.",
      doors: { e: 0 },
      floors: [[E(-25.5), -78, 9, 30], [E(-46.5), -78, 9, 30]],
    });
    ringPillar(E(-36), -72, 2.6, 5.2);
    serpentRing(E(-50.6), 4.6, -84, PI / 2);
    serpentRing(E(-21.4), 4.6, -72, -PI / 2);
    chest("dG-bigkey", E(-47), 0, -86, PI / 2, { t: "bigkey" });
    /* ---- D→I ---- */
    corridor(E(0), -100.5, 6, 15, "z");
    /* ---- I: Basajaunen bihotza ---- */
    room("I", E(0), -126, 36, 36, { area: "dI", name: "BASAJAUNEN BIHOTZA", desc: "", doors: { s: 0 } });
    const tree = model("trees_A_large", E(0), 0, -140.5, 16, 0.4);
    void tree;
    solids.push({ x: E(0), z: -140.5, r: 5.5, h: 12, y: 0, pillar: true });
    for (let i = 0; i < 10; i++) bprop("rubble_half", E(-16 + (i % 5) * 8), 0, i < 5 ? -110 : -142, DS * 0.45, i);
    DUNGEON.bossRoom = DUNGEON.rooms.I;
    dungeonEnd(DUNGEON);
  }
  /* leizean ESNATU: leize bakoitzak bere erantzuna (bestela ezer ez) */
  function dungeonWake() {
    const DG = DGS[ZONE.cur];
    return DG && DG.wake ? DG.wake() : 0;
  }
  function dungeonUpdate(dt) {
    const DG = DGS[ZONE.cur];
    if (!DG) return;
    /* zuziak dir-dir, eta gertuko bi zuziek argi errealak */
    let near = DG.torches.map((t) => [Math.hypot(t.x - P.x, t.z - P.z), t]).sort((a, b) => a[0] - b[0]);
    for (const [i, l] of DG.lights.entries()) {
      const t = near[i] && near[i][1];
      if (!t) continue;
      l.position.set(t.x, t.y, t.z);
      l.intensity = (1.5 + Math.sin(time * 9 + t.ph) * 0.18 + Math.sin(time * 23 + t.ph) * 0.1) * (phaseBlend > 0.5 ? 0.75 : 1.05);
      l.color.set(phaseBlend > 0.5 ? DG.torchCol[1] : DG.torchCol[0]);
    }
    for (const t of DG.torches) {
      t.fl.material.opacity = 0.55 + Math.sin(time * 11 + t.ph) * 0.12;
      t.fl.visible = !t.side || t.side.k < 0.5;
    }
    if (DG.exitGlow) DG.exitGlow.material.opacity = 0.25 + Math.sin(time * 2) * 0.1;
    /* gelaren lainoa (gela ilunak) */
    const R = ROOM.cur && ROOM.cur.zone === DG.id ? ROOM.cur : null,
      f = R && R.fog ? R.fog : DG.fog,
      /* kamera urrunago badago (bertikalean, etsai nagusiarekin): lainoa ere urrunago, Amaiurren ingurua ikus dadin */
      far = Math.max(0, camera.position.distanceTo(hero.position) - 26);
    if (!ZONES[DG.id].outdoor) {
      scene.fog.near = mix(scene.fog.near, f[0] + far, 1 - Math.exp(-dt * 2));
      scene.fog.far = mix(scene.fog.far, f[1] + far, 1 - Math.exp(-dt * 2));
    }
    if (DG.update) DG.update(dt);
    /* irteera: hegoko arkua → haranera (edo DG.exitZone: Suge-mendia → zerua) */
    if (!ZONE.pending && Math.hypot(P.x - DG.exitArch.x, P.z - (DG.exitArch.z + 3.6)) < 2.2) enterZone(DG.exitZone || "ibarra", DG.exitTo());
    /* harri-danborra: hurbil eta ENTZUN ez badaki → deia */
    if (DG === DUNGEON && DUNGEON.drumSkin) DUNGEON.drumSkin.position.y = 1.62 + Math.max(0, Math.sin(time * 4.8)) * 0.04;
  }
  function drumNear() {
    return ZONE.cur === "leizea" && DUNGEON.drum && Math.hypot(P.x - DUNGEON.drum.x, P.z - DUNGEON.drum.z) < 3.6;
  }
  function drumTalk() {
    if (!saved.rhythms.includes("entzun"))
      say(
        [
          ["HARRI-DANBORRA", "…Tok. Tok-tok. Nor dabil nire isiltasunean?", "", DUNGEON.drum.x, DUNGEON.drum.z - 2, 0],
          ["HARRI-DANBORRA", "Putzuak bidea ezkutatzen du. Entzuten dakienak bakarrik ikusten du.", "", DUNGEON.drum.x, DUNGEON.drum.z - 2, 0],
        ],
        () => txalaLearn("entzun", "HARRI-DANBORRA", () => notify(L("Jo ENTZUN putzuaren ondoan: ezkutuko harriak agertuko dira."), "", 4)),
      );
    else say([["HARRI-DANBORRA", "Entzun. Oihartzunak bidea ezagutzen du.", "", DUNGEON.drum.x, DUNGEON.drum.z - 2, 0]]);
  }
