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
    const out = ZONES[ZONE.cur].outdoor;
    sky.visible = sea.visible = out;
    if (ATMO.dust) ATMO.dust.visible = out;
    for (const b of birds) b.visible = out;
    if (out) {
      scene.fog.near = 130;
      scene.fog.far = 560;
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
      const k = kinds[i % kinds.length],
        single = k.startsWith("tree_single");
      const th = single ? 5 + wr() * 2.5 : 7 + wr() * 4,
        m = model(k, x, y, z, th, wr() * TAU);
      plants.push(m);
      occluder(m, x, y, z, single ? 1 : 2.4, th);
      if (single) solids.push({ x, z, r: 0.45, h: 6, y, pillar: true });
      else solids.push({ x, z, r: 1.9, h: 6, y, pillar: true });
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
  /* haraneko guneak kokapenaren arabera (HUDaren izena eta deskribapena) */
  function hubArea(x, z, y) {
    if (Math.hypot(x - HUB.cave.x, z - HUB.cave.z) < 14 && y > 3) return "ataria";
    if (y > 7.5 && Math.hypot(x - 46, z + 64) < 17) return "harrespila";
    if (y > 3.5 && ((x + 6) / 43) ** 2 + ((z + 112) / 31) ** 2 < 1) return "basoa";
    if (z < -30) return "iparra";
    if (z > 63) return "portua";
    if (z > 10 && Math.abs(x) < 46) return "herria";
    return "zelaiak";
  }

  /* ------------------------------ IBARRA ------------------------------ */
  /* Haran zabala bi lautadatan (hegoa: herria eta zelaiak · iparra: larreak, harrespila eta basoa),
     ibaiak bereizita eta zubi batek lotuta. Terrazak lautaden gainean. */
  const HUB = { gate: null, stairs: [], stones: [], sheep: [], pen: { x: -31, z: -6 }, cave: { x: -6, z: -139, y: 5 }, barrels: [] };
  /* arrapala A→B eta lurreratzeko xafla B-tik haratago (terrazaren ertza altuera osoan gurutzatzeko) */
  function rampUp(ax, az, ay, bx, bz, by, w, area, land = 4) {
    ramp(ax, az, ay, bx, bz, by, w, area);
    const len = Math.hypot(bx - ax, bz - az),
      ux = (bx - ax) / len,
      uz = (bz - az) / len;
    slab({ x: bx + (ux * land) / 2, z: bz + (uz * land) / 2, y: by, w, d: land, rot: Math.atan2(ux, uz), h: 0.6, mat: "path", area });
  }
  function buildIbarra() {
    zoneBuild("ibarra");
    /* lautadak eta terrazak */
    plateau({ x: 0, z: 22, y: 0, rx: 80, rz: 44, area: "herria" });
    plateau({ x: 0, z: -95, y: 0, rx: 95, rz: 60, area: "iparra" });
    plateau({ x: 46, z: -64, y: 9, rx: 15, rz: 15, area: "harrespila" });
    plateau({ x: -6, z: -112, y: 5, rx: 42, rz: 30, area: "basoa" });
    /* mugak: lautadetatik ezin da itsasora erori (portuko kaian izan ezik) */
    BOUNDS.push({ x: 0, z: 22, rx: 80, rz: 44, k: 0.96, gaps: [[PI / 2, 0.03], [-PI / 2, 0.035]] }, { x: 0, z: -95, rx: 95, rz: 60, k: 0.96, gaps: [[PI / 2, 0.035]] });
    /* ibaia eta zubia (arku leuna) */
    waterSheet(0, -28.5, 260, 16, -1.2);
    ramp(0, -19, 0, 0, -28.5, 1.1, 5, "herria", material("#8a6a48"));
    ramp(0, -28.5, 1.1, 0, -38, 0, 5, "iparra", material("#8a6a48"));
    for (const s of [-1, 1]) {
      for (let k = 0; k < 7; k++) box(s * 2.45, 1.0 + Math.sin((k / 6) * PI) * 1.1, -20 - k * 2.8, 0.18, 0.9, 0.18, "#5d4632");
      wallBlock(s * 2.6, -28.5, 0.3, 19, 0, 0, 2.2);
    }
    /* ur-jauzia ekialdeko mendixkatik ibaira */
    const ft = fallTexture();
    ft.repeat.set(2, 1.4);
    const fall = obj(new T.PlaneGeometry(10, 16), new T.MeshBasicMaterial({ map: ft, color: "#cdeef5", transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
    fall.position.set(101, 6.5, -28.5);
    fall.rotation.y = -PI / 2;
    fall.castShadow = false;
    ATMO.falls.push(fall);
    mountain(114, -28, 24, 36, 1.2, 0.8);

    /* ---- HERRIA ---- */
    const plaza = obj(new T.CircleGeometry(10, 40), new T.MeshStandardMaterial({ color: "#d9d2bc", map: pathTexture, roughness: 0.92 }));
    plaza.rotation.x = -PI / 2;
    plaza.position.set(0, 0.03, 36);
    plaza.castShadow = false;
    walkway(0, 46, 0, 62, 0, 3.4);
    walkway(0, 26, 0, -19, 0, 3.2);
    walkway(-9, 36, -24, 36, 0, 3);
    walkway(9, 38, 24, 42, 0, 3);
    /* eliza eta frontoia (euskal herri baten bihotza) */
    model("building_church_red", -20, 0, 22, 14, 0.6);
    /* frontoia: horma zuria, harrizko oinarria eta goiko erlaitza, txapa gorria eta bi pilastra */
    box(-32, 4.6, 37, 1.4, 9.2, 15, material("#ece6d6"));
    box(-32, 0.6, 37, 1.6, 1.2, 15.2, material("#8c877a"));
    box(-32, 9.35, 37, 1.8, 0.5, 15.6, material("#6d6b62"));
    box(-31.27, 1.55, 37, 0.06, 0.2, 15, material("#a8332a", 0.2));
    for (const pz of [29.3, 44.7]) box(-32, 4.8, pz, 1.9, 9.6, 0.7, material("#d9d2c0"));
    wallBlock(-32, 37, 1.4, 15, 0, 0, 10);
    const court = obj(new T.PlaneGeometry(11, 15), material("#5d8a6a"));
    court.rotation.x = -PI / 2;
    court.position.set(-26, 0.04, 37);
    court.castShadow = false;
    for (const zz of [31, 37, 43]) box(-31.2, 0.06, zz, 0.12, 0.02, 0.6, "#ffffff");
    /* etxeak (zuria eta gorria) */
    for (const [hx, hz, hh, ha, k] of [
      [17, 22, 7, -0.6, "A"], [28, 31, 8, -1.3, "B"], [14, 56, 7, 2.7, "A"], [-12, 55, 8, 3.0, "B"], [-27, 50, 7, 2.3, "A"],
      [33, 47, 6.5, -2.2, "A"], [-38, 22, 7.5, 1.2, "B"], [40, 18, 7, -1.0, "B"],
    ])
      model("building_home_" + k + "_red", hx, 0, hz, hh, ha);
    model("building_blacksmith_red", 25, 0, 43, 7.5, -1.9);
    model("building_tavern_red", 2, 0, 58, 9, PI);
    model("building_well_red", 9, 0, 35, 3.2, 0.3);
    model("building_watermill_red", 60, -1.2, -17, 9, -1.5);
    /* txalaparta plazan (Pello eta Peio) */
    TXALA.spots.push(txalapartaMesh(0, 0, 30.5, 0, "herria"));
    /* merkatua eta apaingarriak */
    model("tent", -10, 0, 28, 3.4, 0.4);
    model("tent", 13, 0, 29, 3, -0.3);
    for (const [bx, bz] of [[-12, 31], [-11, 32.6], [15, 32], [21, 40], [-20, 41], [30, 38], [-28, 44], [24, 25]]) HUB.barrels.push(breakable("barrel", bx, 0, bz));
    for (const [bx, bz] of [[-13.6, 29.5], [15.2, 30.2], [22.6, 39.4], [-20, 30]]) HUB.barrels.push(breakable("crate_A_big", bx, 0, bz));
    model("flag_red", 4, 0, 25, 4.2, 0.2);
    model("wheelbarrow", 19, 0, 36, 1.5, 0.8);
    model("sack", 12, 0, 27, 0.8, 0.5);
    /* PORTUA: kaia egurrezkoa eta txalupa */
    slab({ x: 0, z: 72, y: 0.3, w: 4, d: 16, h: 0.5, mat: "wood", area: "portua" });
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) box(s * 2.1, -3.8, 66 + k * 4.3, 0.35, 8, 0.35, "#5d4632");
    for (const s of [-1, 1]) wallBlock(s * 2.2, 72, 0.25, 16, 0, 0.3, 1.2);
    wallBlock(0, 80.2, 4.4, 0.4, 0, 0.3, 1.2);
    harborBoat(6.5, 76);
    /* ---- ZELAIAK ---- */
    for (let i = 0; i < 6; i++) model("fence_wood_straight", HUB.pen.x - 6 + i * 2.3, 0, HUB.pen.z + 5, 1.3, PI / 2);
    for (let i = 0; i < 4; i++) model("fence_wood_straight", HUB.pen.x - 7.2, 0, HUB.pen.z + 4 - i * 2.3, 1.3, 0);
    for (let i = 0; i < 4; i++) model("fence_wood_straight", HUB.pen.x + 7.2, 0, HUB.pen.z + 4 - i * 2.3, 1.3, 0);
    model("resource_lumber", 22, 0, 2, 1.4, 0.4);
    model("resource_lumber", 27, 0, -7, 1.4, 1.2);
    model("tent", 24, 0, -2, 2.6, 0.9);
    trees(36, 4, 0, 14, 10, undefined, [[0, 0, 7]]);
    trees(-48, 10, 0, 12, 8);
    trees(52, 40, 0, 12, 7);
    trees(-56, 44, 0, 10, 6);
    /* ---- IPAR-LARREAK ---- */
    walkway(0, -38, -20, -70, 0, 3);
    walkway(4, -40, 30, -64, 0, 3);
    trees(-46, -56, 0, 14, 9);
    trees(10, -78, 0, 8, 4, undefined, [[-6, -84, 6]]);
    trees(70, -96, 0, 14, 9);
    /* harrespilaren eskailera: jentil-harriak (ESNATU erritmoarekin altxatzen dira) */
    for (let i = 0; i < 5; i++) HUB.stairs.push(jentilStone(15 + i * 3.1, -64, 0, (i + 1) * 1.72, 2.6, 2.8, "iparra"));
    /* harrespila: zutarri biribila */
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU,
        x = 46 + Math.cos(a) * 9,
        z = -64 + Math.sin(a) * 9;
      const m = box(x, 9 + 1.6, z, 1.1, 3.2 + (i % 3) * 0.6, 0.8, rockMaterial());
      m.rotation.y = a;
      m.rotation.z = (i % 2 ? 1 : -1) * 0.05;
      solids.push({ x, z, r: 0.75, h: 4, y: 9, pillar: true });
    }
    /* ---- BASOA ---- */
    rampUp(-26, -72, 0, -26, -84.5, 5, 6, "iparra");
    trees(-6, -112, 38, 44, undefined, [[-6, -112, 7], [-26, -88, 6], [-6, -134, 7], [-14, -100, 4], [-6, -122, 4]]);
    walkway(-26, -88, -6, -134, 5, 3);
    /* leizearen ataria: harkaitz-horma, arkua eta jentil-atea */
    /* harkaitz-hormak (harri-zutabe zakarrak) eta mendia atzean; horma ikusezina talkarako */
    mountain(-6, -182, 38, 70, 0.3, 0.55);
    solids.push({ x: -6, z: -182, r: 34, h: 80, y: -9, pillar: true });
    wallBlock(-6, -143, 60, 4, 0, 5, 30, false);
    for (const [sx, sz, sh, seed] of [[-31, -147, 20, 2], [-24, -149, 27, 5], [-17, -146, 24, 7], [5, -146, 23, 1], [12, -149, 28, 4], [19, -146, 19, 8], [-6, -151, 30, 3], [-14, -153, 34, 6], [2, -153, 32, 9]]) {
      seaStack(sx, sz, sh, seed);
      solids.push({ x: sx, z: sz, r: 4.2, h: sh + 12, y: -9, pillar: true });
    }
    box(-10.5, 5 + 4, -140, 2.2, 8, 2.6, material("#56544c"));
    box(-1.5, 5 + 4, -140, 2.2, 8, 2.6, material("#56544c"));
    box(-6, 5 + 8.6, -140, 11.2, 1.6, 2.6, material("#4c4a43"));
    solids.push({ x: -10.5, z: -140, r: 1.4, h: 9, y: 5, pillar: true }, { x: -1.5, z: -140, r: 1.4, h: 9, y: 5, pillar: true });
    const mouth = obj(new T.PlaneGeometry(7, 8), new T.MeshBasicMaterial({ color: "#05080a" }));
    mouth.position.set(-6, 9, -141.2);
    mouth.castShadow = false;
    HUB.gate = jentilStone(-6, -138.4, 5, 5, 6.6, 1.6, "ataria", true);
    /* ---- atzeko planoa: mendiak, Anboto eta hodeiak ---- */
    for (const [mx, mz, mh, mr, sl] of [
      [-175, -140, 85, 70, 0.6], [-120, -245, 115, 90, 0.55], [-30, -335, 175, 120, 0.5], [70, -270, 120, 95, 0.55], [165, -175, 95, 75, 0.6],
      [205, -45, 70, 60, 0.66], [-205, -25, 62, 55, 0.7], [-150, 40, 34, 45, 2], [140, 45, 30, 40, 2], [-60, -230, 70, 55, 0.62], [120, -215, 80, 60, 0.6],
    ])
      mountain(mx, mz, mr, mh, mx * 0.013 + mz * 0.007, sl);
    for (let i = 0; i < 9; i++) {
      const c = model(i % 2 ? "cloud_big" : "cloud_small", -200 + i * 52, 70 + (i % 3) * 12, -240 + (i % 4) * 40, 14 + (i % 3) * 5, i);
      c.traverse((n) => n.isMesh && ((n.castShadow = false), (n.material = n.material.clone()), (n.material.transparent = true), (n.material.opacity = 0.85)));
      CLOUDS.push(c);
    }
    /* ardiak (Joanesen misioa) */
    for (const [i, [sx, sy, sz]] of [[40, 0, -12], [-62, 0, -74], [-22, 5, -122]].entries()) {
      const home = saved.sheep.includes(i);
      const m = sheepMesh(home ? HUB.pen.x - 3 + i * 3 : sx, home ? 0 : sy, home ? HUB.pen.z : sz, i);
      HUB.sheep.push({ i, m, x: m.position.x, z: m.position.z, y: m.position.y, home, follow: false, t: i });
    }
    ZONES.ibarra.spawn = { x: -6, y: 0, z: 44 };
  }
  const CLOUDS = [];
  /* txalupa portuan (OIHARTZUN-eko belaontzien antzekoa, geldirik) */
  function harborBoat(x, z) {
    const hull = new T.Shape();
    hull.moveTo(-2.7, 0.9);
    hull.lineTo(2.9, 0.9);
    hull.lineTo(2.1, -0.4);
    hull.lineTo(-2.2, -0.4);
    hull.closePath();
    const g = new T.Group();
    const hg = new T.ExtrudeGeometry(hull, { depth: 1.7, bevelEnabled: false });
    hg.translate(0, 0, -0.85);
    g.add(new T.Mesh(hg, material("#7a4f32")));
    const mast = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 5, 5), material("#5a3c26"));
    mast.position.set(0, 3.2, 0);
    g.add(mast);
    g.scale.setScalar(1.3);
    g.position.set(x, -8.3, z);
    g.rotation.y = PI / 2;
    (BP || scene).add(g);
    HUB.boat = g;
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
  function breakAt(x, y, z, r) {
    for (const B of BREAKABLES) {
      if (B.broken || B.buildZone !== ZONES[ZONE.cur].group) continue;
      if (Math.hypot(B.x - x, B.z - z) < r + B.r && Math.abs(y - (B.y + 0.8)) < 2) {
        B.broken = true;
        B.m.visible = false;
        B.solid.r = 0;
        fxBurst(B.x, B.y + 0.8, B.z, { n: 18, speed: 4, up: 3, life: 0.7, size: 0.28, color: "#b8956a", grav: 9 });
        SND.crumble();
        dropLoot(B.x, B.y, B.z, B.kind === "barrel" ? 3 : 2);
        return true;
      }
    }
    return false;
  }
  function hubUpdate(dt) {
    stonesUpdate(dt);
    watersUpdate(dt);
    for (const [i, c] of CLOUDS.entries()) c.position.x += dt * (0.6 + (i % 3) * 0.3) * (1 - phaseBlend * 0.85);
    if (HUB.boat) {
      HUB.boat.position.y = -8.3 + Math.sin(time * 1.1) * 0.12 * (1 - phaseBlend);
      HUB.boat.rotation.z = Math.sin(time * 0.8) * 0.04 * (1 - phaseBlend);
    }
    sheepUpdate(dt);
    /* leizearen ahoa: atea irekita badago, sartu */
    if (ZONE.cur === "ibarra" && HUB.gate && HUB.gate.p.off && !ZONE.pending && Math.hypot(P.x - HUB.cave.x, P.z - HUB.cave.z) < 2.4 && P.y > 4)
      enterZone("leizea", { ...DUNGEON.entry, cp: true });
  }
