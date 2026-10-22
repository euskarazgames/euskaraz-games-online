  /* ==================================================================
     MUNDUA · guneak (zonak) eta IBARRA, haran nagusia
     · Zona bakoitzak bere taldea eta bere plataforma-zerrendak ditu: bakarra
       marrazten eta kalkulatzen da (haranean edo leizean).
     · Haranean bi garaiak: iragana (uda, jentilen garaia) eta oraina (negua,
       Mari isildu zenetik). Leizean argi gutxi: zuziak eta Amaiurren argia.
     · Terrazak: elipse-lautadak altuera desberdinetan, haien arteko harri-
       hormak eta arrapalak. Itsasoa hegoaldean; mendiak eta Anboto iparraldean.
     ================================================================== */
  const ZONES = {
    ibarra: { name: "IBARRA", outdoor: true, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    leizea: { name: "BASAJAUNEN LEIZEA", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    lamia: { name: "LAMIEN LEIZEA", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    tartalo: { name: "TARTALOREN KOBA", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    jentil: { name: "JENTILBARATZA", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    /* zerua: kanpoan baina itsasorik gabe (hodei-itsasoa beherago), gaurik ez */
    zerua: { name: "JENTILEN ZERUA", outdoor: true, sky: true, fallY: -16, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
    herensuge: { name: "HERENSUGEAREN HAITZULOA", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null },
  };
  const ZONE = { cur: "ibarra", fadeT: 0, pending: null };
  const AREA = { cur: "", seen: new Set() };
  const AREAS = {
    herria: ["HERRIA", "Txalapartak gauez jotzen dute, inork ukitu gabe."],
    portua: ["PORTUA", "Mari isildu zenetik, itsasoa izoztuta dago. Iraganean, txalupak ibiltzen ziren."],
    zelaiak: ["ZELAIAK", "Joanesen ardiak hemen bazkatzen ziren."],
    iparra: ["IPAR-ZELAIAK", "Ibaiaz bestaldean, harrespila zain dago."],
    harrespila: ["HARRESPILA", "Jentilen harriak. Lo daude, ez hilda."],
    basoa: ["BASOA", "Basajaunen lurra. Zuhaitzek isilik begiratzen dute."],
    ataria: ["LEIZEAREN ATARIA", "Harri handi batek ixten du sarrera."],
    ibaia: ["IBAIA", "Mari isildu zenetik ibaia izoztuta dago. Iraganean, ura bizi zen."],
    arroila: ["HARRI-ARROILA", "Ur-jauziaren isiltasuna. Izotzak hemen ere hitz egiten du."],
    urjauzia: ["UR-JAUZIA", "Izotz-gortinaren atzean, ilunpe bat. Iraganean ura erortzen zen…"],
    lepoa: ["ARTZAINEN LEPOA", "Hemendik aurrera, Tartaloren lurrak. Ardi-hezurrak bidean."],
    kaia: ["KAIA", "Txalupa izotzean harrapatuta dago."],
    badia: ["BADIA IZOZTUA", "Itsasoak ere eutsi dio arnasari."],
    zuloa: ["LEIZE-ZULOA", "Ibaia lurrak irensten du hemen. Hondotik, norbaitek kantatzen duela dirudi."],
  };
  /* zona baterako eraikitzen: taldea eta zerrendak "globalak" bihurtu */
  function zoneBuild(id) {
    const Z = ZONES[id];
    if (!Z.group) {
      Z.group = new T.Group();
      Z.group.name = "zone-" + id;
      scene.add(Z.group);
    }
    BP = Z.group;
    platforms = Z.platforms;
    phaseObjects = Z.phaseObjects;
    solids = Z.solids;
    hazards = Z.hazards;
  }
  function zoneActivate(id) {
    const Z = ZONES[id];
    ZONE.cur = id;
    for (const k in ZONES) if (ZONES[k].group) ZONES[k].group.visible = k === id;
    platforms = Z.platforms;
    phaseObjects = Z.phaseObjects;
    solids = Z.solids;
    hazards = Z.hazards;
    BP = null;
    zoneLook();
    setPhaseVisual(true);
  }
  /* gunez aldatu (leizera sartu / irten): pantaila beltzean */
  function enterZone(id, spawn, instant) {
    const go = () => {
      ponyDismount(true);
      mirrorLower();
      clearEnemies();
      if (CRAFT.on) craftExit();
      LOCK.target = null;
      zoneActivate(id);
      teleport(spawn.x, spawn.z, spawn.y);
      if (spawn.a !== undefined) P.angle = spawn.a;
      CAM.pos = null;
      saved.zone = id;
      if (spawn.cp) saved.cp = { zone: id, x: spawn.x, y: spawn.y, z: spawn.z };
      persist();
      AREA.cur = "";
      hud();
    };
    if (instant) return go();
    ZONE.pending = go;
    ZONE.fadeT = 0.001;
    clearInput();
  }
  function zoneFadeUpdate(dt) {
    const el = $("zoneFade");
    if (ZONE.fadeT <= 0) {
      if (el.style.opacity !== "0") el.style.opacity = 0;
      return;
    }
    ZONE.fadeT += dt;
    if (ZONE.pending && ZONE.fadeT > 0.38) {
      const go = ZONE.pending;
      ZONE.pending = null;
      go();
    }
    el.style.opacity = ZONE.fadeT < 0.38 ? ZONE.fadeT / 0.38 : Math.max(0, 1 - (ZONE.fadeT - 0.55) / 0.45);
    if (ZONE.fadeT > 1) ZONE.fadeT = 0;
  }
  /* argia eta lainoa zonaren arabera */
  function zoneLook() {
    const out = ZONES[ZONE.cur].outdoor,
      high = !!ZONES[ZONE.cur].sky;
    sky.visible = out;
    sea.visible = out && !high;
    /* zeruan argi gehiegi: esposizio apalagoa */
    renderer.toneMappingExposure = high ? 0.94 : 1.12;
    if (ATMO.dust) ATMO.dust.visible = out;
    for (const b of birds) b.visible = out;
    if (out) {
      scene.fog.near = high ? 180 : 130;
      scene.fog.far = high ? 950 : 560;
      playerLight.intensity = 0;
      scene.environment = (phase ? ATMO.envNow : ATMO.envPast) || null;
      ambient.color.set("#c8dfe8");
      ambient.groundColor.set("#3a4960");
    } else {
      scene.fog.near = 10;
      scene.fog.far = 62;
      playerLight.intensity = 2.2;
      /* leizean ez dago zerurik: inguruneko argirik ez (bestela dena argiegi) */
      scene.environment = null;
      ambient.color.set("#7d8fb0");
      ambient.groundColor.set("#2a2018");
    }
    sun.castShadow = true;
  }
  function enterArea(id) {
    AREA.cur = id;
    const A = AREAS[id] || ROOMS_AREA[id];
    if (!A) return;
    $("placeName").textContent = A[0];
    if (!AREA.seen.has(id)) {
      AREA.seen.add(id);
      title(A[0], A[0]);
      if (A[1]) notify(A[1], "", 4);
    }
    questCheck();
    hud();
  }
  function checkpoint() {
    const c = saved.cp;
    if (c && ZONES[c.zone]) return c;
    return { zone: "ibarra", x: -8, y: 0, z: 40 };
  }

  /* ---------------------------- eraikitzaileak ---------------------------- */
  /* elipse-lautada: harrizko hegala itsasoraino eta gaina belarrez (garaiaren arabera elurra) */
  function plateau(o) {
    const { x, z, y, rx, rz } = o,
      seed = o.seed || x * 0.13 + z * 0.07;
    const H = y + 9.5,
      geo = new T.CylinderGeometry(1, 1, 1, 48, 4),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        pz = a.getZ(i),
        py = a.getY(i),
        ang = Math.atan2(pz, px),
        edge = 1 + 0.035 * Math.sin(ang * 7 + seed) + 0.025 * Math.sin(ang * 13 + seed * 3),
        scale = 0.9 + (py + 0.5) * 0.1;
      a.setXYZ(i, px * rx * scale * edge, y - H + (py + 0.5) * H, pz * rz * scale * edge);
    }
    geo.computeVertexNormals();
    const rock = obj(geo, rockMaterial());
    rock.position.set(x, 0, z);
    rock.castShadow = false;
    const topGeo = new T.CircleGeometry(1, 64);
    topGeo.rotateX(-PI / 2);
    const tm = terrainMaterial();
    let top;
    if (tm) {
      topGeo.scale(rx, 1, rz);
      worldUV(topGeo, x, z);
      top = obj(topGeo, tm);
      top.position.set(x, y + 0.015, z);
    } else {
      const topmat = new T.MeshStandardMaterial({ color: "#b7cbd0", roughness: 0.95, map: groundTexture, bumpMap: groundTexture, bumpScale: 0.035 });
      terrainMats.push(topmat);
      top = obj(topGeo, topmat);
      top.position.set(x, y + 0.015, z);
      top.scale.set(rx, 1, rz);
    }
    top.castShadow = false;
    const p = { x, z, y, bottom: y - H, rx: rx * 0.985, rz: rz * 0.985, phase: -1, area: o.area, m: top, safe: true };
    platforms.push(p);
    return p;
  }
  /* kaxa-plataforma (biratua aukeran): harria, zura edo bidea */
  function slab(o) {
    const { x, z, y, w, d } = o,
      h = o.h ?? 1.2,
      rot = o.rot || 0;
    const mat =
      o.mat === "wood"
        ? EG && EG.has("planks")
          ? EG.material("planks", { color: "#a9865f", repeat: [w / 2, d / 2], roughness: 0.85 })
          : material("#8a6a48")
        : o.mat === "path"
          ? new T.MeshStandardMaterial({ color: "#d7d1b7", map: pathTexture, roughness: 0.9 })
          : o.mat === "dark"
            ? material("#4a4a44")
            : rockMaterial();
    const m = obj(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y - h / 2, z);
    m.rotation.y = rot;
    const p = { x, z, y, bottom: y - h, w, d, rot, phase: o.phase ?? -1, area: o.area, m, safe: o.safe !== false };
    platforms.push(p);
    return p;
  }
  /* arrapala: A (ay) → B (by), zabalera w */
  function ramp(ax, az, ay, bx, bz, by, w, area, mat) {
    const len = Math.hypot(bx - ax, bz - az),
      rot = Math.atan2(bx - ax, bz - az),
      cx = (ax + bx) / 2,
      cz = (az + bz) / 2;
    const p = { x: cx, z: cz, y: Math.max(ay, by), bottom: -9, w, d: len, rot, ramp: [ay, by], phase: -1, area, safe: true };
    /* ikusgaia: luzera bereko kaxa okertua */
    const slope = Math.atan2(by - ay, len),
      g = new T.BoxGeometry(w, 0.6, Math.hypot(len, by - ay));
    const m = obj(g, mat || new T.MeshStandardMaterial({ color: "#d7d1b7", map: pathTexture, roughness: 0.9 }));
    m.position.set(cx, (ay + by) / 2 - 0.3, cz);
    m.rotation.order = "YXZ";
    m.rotation.y = rot;
    m.rotation.x = -slope;
    p.m = m;
    platforms.push(p);
    /* azpiko harri-oinarria (behe-muturreraino) */
    const hb = Math.max(0.5, Math.min(ay, by) + 8.4),
      base = obj(new T.BoxGeometry(w * 0.96, hb, len * 0.98), rockMaterial());
    base.position.set(cx, -9 + hb / 2, cz);
    base.rotation.y = rot;
    base.castShadow = false;
    return p;
  }
  /* horma ikusezina (edo ikusgaia): goi-muga altua duen plataforma; ezin da gainera igo */
  function wallBlock(x, z, w, d, rot, y0, h, visible) {
    const p = { x, z, y: y0 + h, bottom: y0 - 1, w, d, rot: rot || 0, phase: -1, wall: true, safe: false };
    if (visible) {
      const m = obj(new T.BoxGeometry(w, h, d), visible === true ? rockMaterial() : visible);
      m.position.set(x, y0 + h / 2, z);
      m.rotation.y = rot || 0;
      p.m = m;
    }
    platforms.push(p);
    return p;
  }
  /* ibaia / urmaela: ur-gainazal animatua (EGFX-en ur-testurarekin, bestela kolore lauarekin) */
  const WATERS = [];
  function waterSheet(x, z, w, d, y) {
    const tn = rawTex("water_n", false);
    const mat = new T.MeshStandardMaterial({ color: "#2d6f7c", roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.86, normalMap: tn || null });
    if (tn) {
      tn.repeat.set(w / 9, d / 9);
      mat.normalScale.set(0.6, 0.6);
    }
    const m = obj(new T.PlaneGeometry(w, d), mat);
    m.rotation.x = -PI / 2;
    m.position.set(x, y, z);
    m.castShadow = false;
    WATERS.push({ m, tn, y });
    return m;
  }
  function watersUpdate(dt) {
    for (const W of WATERS) {
      if (W.tn) W.tn.offset.y -= dt * 0.05 * (1 - phaseBlend * 0.9);
      W.m.material.color.set(phaseBlend > 0.5 ? "#9fc3d2" : "#2d6f7c");
      W.m.material.roughness = phaseBlend > 0.5 ? 0.35 : 0.12;
    }
  }
  /* zuhaitzak, harriak eta etxeak ausazko txikiekin (hazi finkoa) */
  let wseed = 77;
  const wr = () => ((wseed = (wseed * 16807) % 2147483647) / 2147483647);
  function trees(cx, cz, y, r, n, kinds = ["trees_A_large", "trees_B_large", "trees_A_medium", "trees_B_medium", "tree_single_A", "tree_single_B"], keepOut = []) {
    for (let i = 0; i < n; i++) {
      const a = wr() * TAU,
        d = Math.sqrt(wr()) * r,
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
      /* haranean: ez itsaslabarrean, ez ibaian */
      if (y === null && !treeSpot(x, z)) continue;
      const k = kinds[i % kinds.length],
        single = k.startsWith("tree_single"),
        ty = y === null ? gy(x, z) : y;
      const th = single ? 5 + wr() * 2.5 : 7 + wr() * 4,
        m = model(k, x, ty, z, th, wr() * TAU);
      plants.push(m);
      SWAY.push({ m, ph: wr() * TAU, k: single ? 1 : 0.6 });
      occluder(m, x, ty, z, single ? 1 : 2.4, th);
      if (single) solids.push({ x, z, r: 0.45, h: 6, y: ty, pillar: true });
      else solids.push({ x, z, r: 1.9, h: 6, y: ty, pillar: true });
    }
  }
  /* ardi bat (prozedurala): artilezko gorputza, aurpegi iluna eta lau hanka */
  function sheepMesh(x, y, z, a) {
    const g = new T.Group();
    const wool = material("#f2efe6"),
      dark = material("#2c2a2a");
    const body = obj(new T.IcosahedronGeometry(0.62, 1), wool, g);
    body.scale.set(1.25, 0.95, 0.9);
    body.position.y = 0.95;
    const head = obj(new T.BoxGeometry(0.42, 0.42, 0.5), dark, g);
    head.position.set(0.85, 1.12, 0);
    const tuft = obj(new T.IcosahedronGeometry(0.22, 0), wool, g);
    tuft.position.set(0.78, 1.4, 0);
    for (const [lx, lz] of [[0.45, 0.28], [0.45, -0.28], [-0.45, 0.28], [-0.45, -0.28]]) {
      const leg = obj(new T.CylinderGeometry(0.07, 0.06, 0.6, 5), dark, g);
      leg.position.set(lx, 0.3, lz);
    }
    g.position.set(x, y, z);
    g.rotation.y = a;
    (BP || scene).add(g);
    return g;
  }

  /* mendi prozedurala (low-poly, ertz lauak): oinean belarra, gero harria eta gailurrean elurra */
  const MCOL = { grass: new T.Color("#3b5434").convertSRGBToLinear(), rock: new T.Color("#545a55").convertSRGBToLinear(), rock2: new T.Color("#62615a").convertSRGBToLinear(), snow: new T.Color("#e9eff3").convertSRGBToLinear() };
  function mountain(x, z, r, h, seed, snowLine = 0.62) {
    const geo = new T.CylinderGeometry(r * 0.12, r, h, 20, 8, true),
      a = geo.attributes.position,
      col = [];
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        py = a.getY(i),
        pz = a.getZ(i),
        ang = Math.atan2(pz, px),
        f = py / h + 0.5,
        k = 1 + 0.16 * Math.sin(ang * 3 + seed) + 0.09 * Math.sin(ang * 7 + f * 8 + seed * 2) + 0.05 * Math.sin(ang * 13 + seed * 5);
      a.setXYZ(i, px * k, py + Math.sin(ang * 5 + seed) * h * 0.035 * (1 - f) + (f > 0.98 ? h * 0.04 * Math.sin(seed * 9) : 0), pz * k);
      const sn = f + 0.07 * Math.sin(ang * 6 + seed * 3),
        c = sn > snowLine + 0.1 ? MCOL.snow : sn > 0.3 ? (Math.sin(ang * 9 + f * 14 + seed) > 0 ? MCOL.rock : MCOL.rock2) : MCOL.grass;
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const g2 = geo.toNonIndexed();
    g2.computeVertexNormals();
    const m = obj(g2, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
    m.position.set(x, -9 + h / 2, z);
    m.rotation.y = seed;
    m.castShadow = m.receiveShadow = false;
    return m;
  }
  /* kamera eta Amaiurren artean dauden etxe eta zuhaitzak gardendu (materiala lehen aldian klonatzen da) */
  const OCC = [];
  function occluder(root, x, y, z, r, h) {
    OCC.push({ root, x, y, z, r, h, k: 0, mats: null, group: BP });
  }
  function hubOcclusion(dt, tx, ty, tz) {
    const cx = camera.position.x,
      cy = camera.position.y,
      cz = camera.position.z,
      dx = tx - cx,
      dz = tz - cz,
      L2 = dx * dx + dz * dz || 1,
      grp = ZONES[ZONE.cur].group,
      kk = 1 - Math.exp(-dt * 9);
    for (const o of OCC) {
      if (o.group !== grp) continue;
      let want = 0;
      const t = ((o.x - cx) * dx + (o.z - cz) * dz) / L2;
      if (t > 0 && t < 1) {
        const qx = cx + dx * t - o.x,
          qz = cz + dz * t - o.z;
        if (qx * qx + qz * qz < (o.r + 0.9) ** 2 && cy + (ty - cy) * t < o.y + o.h) want = 1;
      }
      if (!o.mats) {
        if (!want) continue;
        o.mats = [];
        o.root.traverse((n) => {
          if (n.isMesh) {
            n.material = n.material.clone();
            o.mats.push(n.material);
          }
        });
      }
      if (o.k === want) continue;
      o.k = Math.abs(o.k - want) < 0.01 ? want : mix(o.k, want, kk);
      for (const m of o.mats) {
        m.transparent = o.k > 0.01;
        m.opacity = 1 - 0.74 * o.k;
        m.depthWrite = o.k < 0.3;
      }
    }
  }
  /* jentilen erruna (kanbas): zirkulua eta lau besoko ikurra (lauburu-kutsua, diseinu propioa) */
  let RUNE_TEX = null;
  function runeTexture() {
    if (RUNE_TEX) return RUNE_TEX;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.strokeStyle = "#fff";
    g.lineWidth = 7;
    g.lineCap = "round";
    g.beginPath();
    g.arc(64, 64, 54, 0, TAU);
    g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 2;
      g.beginPath();
      g.arc(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18, 18, a, a + PI);
      g.stroke();
    }
    g.beginPath();
    g.arc(64, 64, 5, 0, TAU);
    g.fillStyle = "#fff";
    g.fill();
    RUNE_TEX = new T.CanvasTexture(c);
    return RUNE_TEX;
  }
  /* jentil-harria: lo dagoenean lurrean etzanda; ESNATU-rekin altxatzen da (eskailera edo atea) */
  function jentilStone(x, z, y0, y1, w, d, area, isGate) {
    const g = new T.Group();
    /* harri leuna (testurarik gabe: altxatzean eskalatzen da) eta errun distiratsua */
    const m = obj(new T.BoxGeometry(w, 1, d), material(isGate ? "#5d5b53" : "#6c695f"), g);
    const rune = obj(new T.PlaneGeometry(Math.min(w, d) * 0.55, Math.min(w, d) * 0.55), new T.MeshBasicMaterial({ color: "#ffd38a", map: runeTexture(), transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending }), g);
    rune.rotation.x = -PI / 2;
    (BP || scene).add(g);
    const S = { x, z, y0, y1, w, d, g, m, rune, area, gate: !!isGate, t: 0, awake: false };
    S.p = { x, z, y: y0 + 0.3, bottom: y0 - 1.2, w, d, phase: -1, area, safe: true, stone: S };
    if (isGate) {
      /* atea: zutik dago ixteko; esnatzean lurpera jaisten da (errun handia aurrealdean) */
      S.p.y = y0 + 9;
      S.p.bottom = y0 - 1;
      S.p.wall = true;
      S.face = obj(new T.PlaneGeometry(3.6, 3.6), new T.MeshBasicMaterial({ color: "#ffd38a", map: runeTexture(), transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending }), g);
      S.face.position.set(x, y0 + 4.2, z + d / 2 + 0.03);
    }
    platforms.push(S.p);
    HUB.stones.push(S);
    /* gordetako partida: lehendik esnatuta? */
    if (saved.flags.includes(isGate ? "atea" : "eskailera")) {
      S.awake = true;
      S.t = 1;
    }
    stoneVisual(S, S.t);
    return S;
  }
  function stoneVisual(S, k) {
    if (S.gate) {
      const h = 9 * (1 - k);
      S.m.scale.set(1, Math.max(0.01, h), 1);
      S.m.position.set(S.x, S.y0 + h / 2, S.z);
      S.rune.position.set(S.x, S.y0 + h + 0.02, S.z);
      S.face.position.y = S.y0 + 4.2 - k * 9;
      S.face.visible = k < 0.5;
      S.face.material.opacity = 0.32 + 0.22 * Math.sin(time * 2.4);
      S.p.y = S.y0 + Math.max(0, h);
      S.p.off = k > 0.98;
    } else {
      const top = mix(S.y0 + 0.3, S.y1, k);
      S.m.scale.set(1, Math.max(0.3, top - S.y0 + 1.2), 1);
      S.m.position.set(S.x, (top + S.y0 - 1.2) / 2, S.z);
      S.rune.position.set(S.x, top + 0.02, S.z);
      S.p.y = top;
    }
    S.rune.material.opacity = S.awake ? 0.35 + 0.25 * Math.sin(time * 3 + S.x) : 0.12;
  }
  function stonesUpdate(dt) {
    for (const S of HUB.stones) {
      if (S.awake && S.t < 1) {
        const before = S.t;
        S.t = Math.min(1, S.t + dt * 0.7);
        if (Math.floor(before * 6) !== Math.floor(S.t * 6)) shake(0.06);
      }
      const k = S.t * S.t * (3 - 2 * S.t);
      stoneVisual(S, k);
    }
  }
  function wakeStones(near = 22) {
    let n = 0;
    for (const S of HUB.stones)
      if (!S.awake && Math.hypot(P.x - S.x, P.z - S.z) < near) {
        S.awake = true;
        n++;
        fxBurst(S.x, S.y0 + 1, S.z, { n: 30, speed: 4, up: 3, life: 1, size: 0.4, color: "#ffd38a", grav: 3 });
      }
    if (n) {
      SND.thud();
      shake(0.3);
      for (const S of HUB.stones) if (S.awake) flagSet(S.gate ? "atea" : "eskailera");
    }
    return n;
  }
  /* hautsi daitezkeen upelak eta kaxak: txanponak eta arnasa */
  const BREAKABLES = [];
  function breakable(kind, x, y, z) {
    const h = kind === "barrel" ? 1.5 : 1.25;
    const m = model(kind, x, y, z, h, x * 1.3);
    const B = { kind, x, y, z, m, hp: 1, broken: false, zone: ZONE.cur, r: 0.75, h, buildZone: BP };
    occluder(m, x, y, z, 0.7, h);
    solids.push((B.solid = { x, z, r: 0.7, h, y }));
    BREAKABLES.push(B);
    return B;
  }
  const breakHere = (B) => !B.broken && B.buildZone === ZONES[ZONE.cur].group && (B.phase === undefined || B.phase === phase);
  const breakHit = (B, x, y, z, r) => (B.hitTest ? B.hitTest(x, y, z, r) : Math.hypot(B.x - x, B.z - z) < r + B.r && Math.abs(y - (B.y + 0.8)) < 2);
  function breakOne(B) {
    B.broken = true;
    if (B.custom) return B.custom();
    B.m.visible = false;
    B.solid.r = 0;
    fxBurst(B.x, B.y + 0.8, B.z, { n: 18, speed: 4, up: 3, life: 0.7, size: 0.28, color: "#b8956a", grav: 9 });
    SND.crumble();
    if (B.onBreak) B.onBreak();
    else dropLoot(B.x, B.y, B.z, B.kind === "barrel" ? 3 : 2);
  }
  function breakAt(x, y, z, r, fire) {
    for (const B of BREAKABLES) {
      if (!breakHere(B) || !breakHit(B, x, y, z, r)) continue;
      /* egurrezko hesiak eta Gauekoren izotza: SUA bakarrik; harri arrakalatuak: TXIMISTARRIA bakarrik */
      if ((B.fireOnly && !fire) || B.bombOnly) {
        if (B.hint) notifyOnce((B.bombOnly ? "bomb-" : "fire-") + B.kind, B.hint, "");
        fxBurst(x, y, z, { n: 6, speed: 2, life: 0.3, size: 0.2, color: "#ffffff", grav: 4 });
        return B;
      }
      breakOne(B);
      return B.custom ? B : true;
    }
    return false;
  }
  /* TXIMISTARRIAren eztanda: eremuko guztiak (sua behar dutenak izan ezik) */
  function bombBreak(x, y, z, r) {
    let n = 0;
    for (const B of BREAKABLES) {
      if (!breakHere(B) || B.fireOnly || !breakHit(B, x, y, z, r)) continue;
      breakOne(B);
      n++;
    }
    return n;
  }
