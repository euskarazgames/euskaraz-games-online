  /* ==================================================================
     JENTILEN ZERUA · bosgarren leizea (diseinu propioa) — hodeien gaineko uharteak
     Jentilak ortzadarretik igotzen ziren zerura (ORTZI erritmoa, harrespilan). Gauekok
     hiru zaindari gogorrenak hemen ditu; lehenengoa: ODEI, trumoiaren hodeia.
       Z1 Ortzadarraren muturra .. iritsiera; SUTONDOA; hegoan, ortzadarra (haranera)
       Z2 Hodei-zubiak ........... hodeiak IRAGANEAN trinkoak (garaia airean aldatu);
                                   ekialdean laino trinkoa: HAIZE-ADARRAz uxatu → arnasa-zatia
       Z3 Zeruko plaza ........... borroka → GILTZA TXIKIA; SUTONDOA; iparrean zeruko eskailerak;
                                   mendebaldean haize-zutabea (ORAINEAN)
       Z4 Haize-errota ........... HAIZE-ADARRAz errota biratu → harrizko igogailua gora
       Z5 Hodei-zainaren harria .. (giltza txikiko atea) etsai ertaina → ENARAREN HEGOAK
       Z6 Tximista-dorrea ........ ENARAz haize-zutabean gora; hiru ekaitz-kanpaia (bat
                                   ORAINEAN) → dorrea HEURAz (iraganean) → GILTZA NAGUSIA
       Z7 Ekaitzaren begia ....... ekaitz-hesia (ate handia) → ODEI (odei.js)
       Z8 Enaren habia ........... ezkutuko uhartetxoa (haize-zutabea, ORAINEAN) → arnasa-zatia
     Uharte guztiak airean: erortzean, azken lur segurura (arnasa bat galduta).
     ================================================================== */
  const SX = 1800;
  const DGZ = {
    id: "zerua",
    num: "05",
    entry: { x: SX, y: 0, z: 7.5, a: PI },
    /* ortzadarra hegoan (beherantz): irteera haranera */
    exitArch: { x: SX, z: 16.5 },
    exitTo: () => ({ x: 45.4, y: 9, z: -73.2, a: 0, cp: true }),
    bigKey: "giltzanagusia-zerua",
    bigKeyText: "Ekaitzaren begira (ekaitz-hesia) daraman ate handia irekitzen du.",
    bossDoor: "zG-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ffd9a0", "#d8ecff"],
    fog: [180, 950],
  };
  const ZR = { debris: [], birds: [], clouds: [], sea: [], lift: null, mill: null, barrier: null, gateOpen: false, seenIntro: false, nestDraft: null };
  const ZE = (x) => SX + x;
  /* boss-arena (Z7) */
  const Z7 = { x: SX, z: -131, y: 18, r: 17 };

  /* ------------------------------ eraikigaiak ------------------------------ */
  /* zeru-gela: ROOMS erregistroan (izena, borroka, mapa), hormarik gabe; rx → uharte biribila */
  function skyRoom(id, x, z, w, d, opts = {}) {
    const R = { id, x, z, w, d, y: opts.y || 0, zone: BDG.id, area: opts.area, waves: opts.waves, diff: opts.diff, hpK: opts.hpK, fightText: opts.fightText, onWin: opts.onWin, sides: {}, rx: opts.rx, rz: opts.rz || opts.rx, noClamp: !!opts.noClamp };
    ROOMS.push(R);
    BDG.rooms[id] = R;
    if (opts.area) ROOMS_AREA[opts.area] = [opts.name, opts.desc || ""];
    return R;
  }
  /* harkaitz-azpia (kono alderantzikatua): goian lurra, behean harri iluna */
  const SKY_COL = { soil: new T.Color("#6f5a44").convertSRGBToLinear(), rock: new T.Color("#6e6b64").convertSRGBToLinear(), rock2: new T.Color("#5b5953").convertSRGBToLinear(), deep: new T.Color("#3e3c3a").convertSRGBToLinear() };
  let UNDER_MAT = null;
  function underGeo(rx, rz, depth, seg, seed, square) {
    const geo = new T.CylinderGeometry(1, 0.06, 1, seg, 6, false),
      a = geo.attributes.position,
      col = [];
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        py = a.getY(i),
        pz = a.getZ(i),
        f = py + 0.5,
        ang = Math.atan2(pz, px),
        bump = f > 0.97 ? 1 : 1 + 0.13 * Math.sin(ang * 3 + seed) + 0.08 * Math.sin(ang * 7 + seed * 2.3) + 0.05 * Math.sin(ang * 13 + f * 9 + seed);
      const sx = square ? 1 / Math.SQRT1_2 : 1;
      a.setXYZ(i, px * rx * bump * sx, (f - 1) * depth + (f < 0.97 && f > 0.03 ? Math.sin(ang * 5 + seed) * depth * 0.04 : 0), pz * rz * bump * sx);
      const c = f > 0.86 ? SKY_COL.soil : f > 0.45 ? (Math.sin(ang * 9 + f * 14 + seed) > 0 ? SKY_COL.rock : SKY_COL.rock2) : SKY_COL.deep;
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    const g2 = geo.toNonIndexed();
    g2.computeVertexNormals();
    if (square) g2.rotateY(PI / 4);
    return g2;
  }
  function underMat() {
    return (UNDER_MAT ||= new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
  }
  /* harri txikiak uhartearen azpian, kulunkan (magia) */
  function debris(x, y, z, n, r, seed) {
    for (let i = 0; i < n; i++) {
      const a = seed + i * 2.4,
        d = r * (0.3 + ((i * 37) % 10) / 14),
        m = obj(new T.DodecahedronGeometry(0.5 + (i % 3) * 0.35, 0), underMat());
      if (m.geometry.index) m.geometry = m.geometry.toNonIndexed();
      const c = [];
      for (let k = 0; k < m.geometry.attributes.position.count; k++) c.push(SKY_COL.rock.r, SKY_COL.rock.g, SKY_COL.rock.b);
      m.geometry.setAttribute("color", new T.Float32BufferAttribute(c, 3));
      m.position.set(x + Math.cos(a) * d, y, z + Math.sin(a) * d);
      m.castShadow = false;
      ZR.debris.push({ m, y0: y - 1 - (i % 3) * 1.6, ph: a });
    }
  }
  /* uharte biribila: belarra (edo harria) gainean, harkaitza azpian */
  function skyIsland(o) {
    const { x, z, y } = o,
      rx = o.r,
      rz = o.rz || o.r,
      depth = o.depth || rx * 1.15,
      seed = o.seed ?? x * 0.11 + z * 0.07;
    const under = obj(underGeo(rx * 1.02, rz * 1.02, depth, 18, seed), underMat());
    under.position.set(x, y + 0.02, z);
    under.castShadow = false;
    let top;
    if (o.top === "stone") {
      const geo = new T.CircleGeometry(1, 48);
      geo.rotateX(-PI / 2);
      geo.scale(rx, 1, rz);
      worldUV(geo, x, z, 5);
      top = obj(geo, stoneFloorMat());
    } else {
      const tm = terrainMaterial(),
        geo = new T.CircleGeometry(1, 48);
      geo.rotateX(-PI / 2);
      geo.scale(rx, 1, rz);
      if (tm) worldUV(geo, x, z);
      top = obj(geo, tm || new T.MeshStandardMaterial({ color: "#8fae7c", roughness: 0.95, map: groundTexture }));
    }
    top.position.set(x, y + 0.02, z);
    top.castShadow = false;
    /* ertz-uztaia (lodiera) */
    const rimGeo = new T.CylinderGeometry(1, 1, 1, 48, 1, true);
    rimGeo.scale(rx * 1.02, 0.7, rz * 1.02);
    const rim = obj(rimGeo, o.top === "stone" ? stoneFloorMat() : material("#6f5a44"));
    rim.position.set(x, y - 0.33, z);
    rim.castShadow = false;
    if (!o.deco) debris(x, y - depth * 0.85, z, o.debris ?? 3, Math.min(rx, rz) * 0.7, seed);
    if (o.deco) return null;
    const p = { x, z, y, bottom: y - depth * 0.5, rx: rx * 0.975, rz: rz * 0.975, phase: -1, area: o.area, m: top, safe: true };
    platforms.push(p);
    return p;
  }
  let STONE_FLOOR = null;
  function stoneFloorMat() {
    if (STONE_FLOOR) return STONE_FLOOR;
    const m = EG && EG.has("cliff") ? EG.material("cliff", { color: "#8a8275", repeat: [1, 1], roughness: 0.95, normal: 0.6 }) : material("#7d776b");
    return (STONE_FLOOR = m);
  }
  /* plaza karratua: lauzak (KayKit) eta harkaitz-azpia (piramide alderantzikatua) */
  function skyPlaza(o) {
    const { x, z, y, w, d } = o,
      depth = o.depth || Math.max(w, d) * 0.7;
    const fl = slab({ x, z, y, w, d, h: 1.2, mat: "dark", area: o.area });
    fl.m.position.y -= 0.12;
    for (let ix = 0; ix < Math.round(w / 6); ix++)
      for (let iz = 0; iz < Math.round(d / 6); iz++) {
        const tx = x - w / 2 + 3 + ix * 6,
          tz = z - d / 2 + 3 + iz * 6;
        bprop((ix * 5 + iz * 3) % 4 === 0 ? "floor_tile_large_rocks" : "floor_tile_large", tx, y - 0.075, tz, DS, ((ix + iz) % 4) * (PI / 2));
      }
    const under = obj(underGeo((w / 2) * 1.04, (d / 2) * 1.04, depth, 4, x * 0.3 + z * 0.1, true), underMat());
    under.position.set(x, y - 1.25, z);
    under.castShadow = false;
    debris(x, y - depth * 0.9, z, 4, Math.min(w, d) * 0.35, x * 0.2);
    /* izkinetako zutabeak */
    if (o.columns !== false)
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = x + sx * (w / 2 - 1.2),
          cz = z + sz * (d / 2 - 1.2);
        bprop(sx + sz === 0 ? "pillar_decorated" : "column", cx, y, cz, DS * (sx + sz === 0 ? 0.8 : 1.3), 0);
        solids.push({ x: cx, z: cz, r: 0.9, h: 5, y, pillar: true });
      }
    return fl;
  }
  /* zeruko arrapala: harrizko bidea airean (azpian harri-ziria), ramp: ay → by */
  function skyRamp(ax, az, ay, bx, bz, by, w, area) {
    const len = Math.hypot(bx - ax, bz - az),
      rot = Math.atan2(bx - ax, bz - az),
      cx = (ax + bx) / 2,
      cz = (az + bz) / 2;
    const p = { x: cx, z: cz, y: Math.max(ay, by), bottom: Math.min(ay, by) - 1.2, w, d: len, rot, ramp: [ay, by], phase: -1, area, safe: true };
    const slope = Math.atan2(by - ay, len),
      L2 = Math.hypot(len, by - ay),
      m = obj(new T.BoxGeometry(w, 0.5, L2), new T.MeshStandardMaterial({ color: "#d7d1b7", map: pathTexture, roughness: 0.9 }));
    m.material.map = pathTexture.clone();
    m.material.map.needsUpdate = true;
    m.material.map.repeat.set(1, L2 / 4);
    m.position.set(cx, (ay + by) / 2 - 0.25, cz);
    m.rotation.order = "YXZ";
    m.rotation.y = rot;
    m.rotation.x = -slope;
    p.m = m;
    /* azpiko harria (ziri lodia) */
    const base = obj(new T.BoxGeometry(w * 0.9, 1.4, L2), stackMaterial());
    base.position.set(cx, (ay + by) / 2 - 1.15, cz);
    base.rotation.order = "YXZ";
    base.rotation.y = rot;
    base.rotation.x = -slope;
    base.castShadow = false;
    /* ertzetako harri txikiak */
    const n = Math.floor(L2 / 3);
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n),
        px = mix(ax, bx, t),
        pz = mix(az, bz, t),
        py = mix(ay, by, t);
      for (const s of [-1, 1]) {
        const st = obj(new T.BoxGeometry(0.32, 0.4, 0.32), rockMaterial());
        st.position.set(px + Math.cos(rot) * s * (w / 2 - 0.15), py + 0.1, pz - Math.sin(rot) * s * (w / 2 - 0.15));
        st.castShadow = false;
      }
    }
    platforms.push(p);
    return p;
  }
  /* zubi zuzena (harria): slab mehea eta ertzak */
  function skyBridge(x, z, w, d, y, area) {
    const p = slab({ x, z, y, w, d, h: 0.9, area });
    const n = Math.max(1, Math.round((w > d ? w : d) / 3));
    for (let i = 0; i <= n; i++) {
      const t = i / n - 0.5;
      for (const s of [-1, 1]) {
        const st = obj(new T.BoxGeometry(0.34, 0.5, 0.34), rockMaterial());
        if (w > d) st.position.set(x + t * w, y + 0.15, z + s * (d / 2 - 0.17));
        else st.position.set(x + s * (w / 2 - 0.17), y + 0.15, z + t * d);
        st.castShadow = false;
      }
    }
    return p;
  }
  /* hodeia: bola bigunak elkartuta (geometria bakarra) */
  function puffGeo(r, n, seed, flat = 0.55) {
    const parts = [];
    let sd = Math.round(seed * 1000) % 2147483647 || 7;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd() * 0.6,
        d = i === 0 ? 0 : r * (0.45 + rnd() * 0.45),
        s = r * (i === 0 ? 0.75 : 0.42 + rnd() * 0.3);
      const g = new T.IcosahedronGeometry(s, 1);
      g.scale(1, flat + rnd() * 0.2, 1);
      g.translate(Math.cos(a) * d, rnd() * s * 0.3, Math.sin(a) * d);
      parts.push(g);
    }
    return mergeGeos(parts);
  }
  /* hodei-harria: garai batean trinkoa (iragana: urre-zuria; oraina: ekaitz-grisa) */
  const CLOUD_MATS = {};
  function cloudMat(ph) {
    if (CLOUD_MATS[ph]) return CLOUD_MATS[ph];
    const c = ph === 0 ? "#fff1dc" : ph === 1 ? "#a9b5c8" : "#f4f7fb",
      e = ph === 0 ? "#ffd7a0" : ph === 1 ? "#5a6a86" : "#dde8f5";
    return (CLOUD_MATS[ph] = new T.MeshStandardMaterial({ color: c, emissive: new T.Color(e), emissiveIntensity: ph === 1 ? 0.18 : 0.32, roughness: 1, flatShading: false }));
  }
  /* hodei-harria: harri laua (goian, oinak hemen) hodei-bolen artean; ertzean garaiaren kolorea */
  function cloudStep(x, y, z, r, ph, opts = {}) {
    const geo = puffGeo(r * 1.05, 7, x * 0.37 + z * 0.11, 0.5);
    geo.translate(0, -0.35, 0);
    const m = new T.Group();
    m.position.set(x, y - 0.45, z);
    BP.add(m);
    const puffs = new T.Mesh(geo, cloudMat(ph));
    puffs.castShadow = ph !== 1;
    puffs.receiveShadow = true;
    m.add(puffs);
    const top = new T.Mesh(new T.CylinderGeometry(r * 0.86, r * 0.7, 0.5, 18), ph === 1 ? material("#7d8aa3") : material(ph === 0 ? "#d9c7a8" : "#c9c4ba"));
    top.position.y = 0.2;
    top.castShadow = top.receiveShadow = true;
    m.add(top);
    const ring = new T.Mesh(new T.TorusGeometry(r * 0.84, 0.06, 6, 36), material(ph === 0 ? "#ffc484" : ph === 1 ? "#9de9e9" : "#f3e6ff", 0.9));
    ring.rotation.x = PI / 2;
    ring.position.y = 0.46;
    m.add(ring);
    const gmat = new T.MeshBasicMaterial({ color: ph === 0 ? "#ffd9a0" : "#a9e9f2", transparent: true, opacity: 0.18, depthWrite: false, wireframe: true });
    const ghost = new T.Group();
    ghost.add(new T.Mesh(top.geometry, gmat), new T.Mesh(ring.geometry, gmat).rotateX(PI / 2));
    ghost.children[1].position.y = 0.46;
    ghost.position.copy(m.position);
    ghost.children[0].position.y = 0.2;
    BP.add(ghost);
    ghost.visible = false;
    const p = { x, z, y, bottom: y - 1.1, rx: r, rz: r, phase: ph, m, ghost, safe: ph === -1 && !opts.hidden, cloud: true, area: opts.area };
    if (opts.hidden) {
      p.off = true;
      m.visible = false;
      p.reveal = () => {
        p.off = false;
        p.safe = true;
        m.visible = true;
        fxBurst(x, y, z, { n: 22, speed: 2.4, up: 1.5, life: 0.9, size: 0.4, color: "#ffffff", grav: -0.5 });
      };
    } else if (ph !== -1) phaseObjects.push(p);
    platforms.push(p);
    ZR.clouds.push({ m, ghost, y0: m.position.y, ph: x * 0.3 + z });
    return p;
  }
  /* hodei-itsasoa: kanbas-testura (hodei bigunak), bi geruza mugitzen */
  function cloudSeaTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#c9d3de";
    g.fillRect(0, 0, 512, 512);
    let sd = 29;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = r() * 512,
        y = r() * 512,
        rr = 18 + r() * 70,
        l = 200 + Math.floor(r() * 55);
      for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
        gr.addColorStop(0, `rgba(${l},${l},${Math.min(255, l + 6)},0.55)`);
        gr.addColorStop(1, `rgba(${l},${l},${l},0)`);
        g.fillStyle = gr;
        g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
      }
    }
    for (let i = 0; i < 90; i++) {
      const x = r() * 512,
        y = r() * 512,
        rr = 20 + r() * 50,
        gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, "rgba(120,132,150,0.22)");
      gr.addColorStop(1, "rgba(120,132,150,0)");
      g.fillStyle = gr;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  function cloudSea() {
    const tex = cloudSeaTexture();
    for (const [y, rep, op] of [[-44, 7, 1], [-36, 4.5, 0.55]]) {
      const t = tex.clone();
      t.needsUpdate = true;
      t.repeat.set(rep, rep);
      const m = obj(new T.PlaneGeometry(2800, 2800), new T.MeshBasicMaterial({ map: t, color: "#ffffff", transparent: op < 1, opacity: op, depthWrite: op >= 1, fog: true }));
      m.rotation.x = -PI / 2;
      m.position.set(SX, y, -80);
      m.castShadow = m.receiveShadow = false;
      ZR.sea.push({ m, t, sp: op < 1 ? 0.0016 : 0.0008 });
    }
    /* hodei handiak (KayKit) uharteen inguruan eta urrunean */
    let sd = 41;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 34; i++) {
      const a = r() * TAU,
        d = 50 + r() * 260,
        x = SX + Math.cos(a) * d,
        z = -70 + Math.sin(a) * d * 0.9,
        y = -30 + r() * 26 + (d > 180 ? r() * 40 : 0);
      const c = model(i % 3 ? "cloud_big" : "cloud_small", x, y, z, 10 + r() * 16, r() * TAU);
      c.traverse((n) => n.isMesh && ((n.castShadow = false), (n.receiveShadow = false), (n.material = n.material.clone()), (n.material.transparent = true), (n.material.opacity = 0.92)));
      ZR.clouds.push({ m: c, y0: y, ph: r() * TAU, big: true });
    }
  }
  /* urrutiko uharteak eta Anboto (ekaitzaren barruan) */
  function skyScenery() {
    for (const [x, z, y, r] of [[-120, -40, 22, 14], [160, -10, 14, 18], [90, -230, 40, 22], [-170, -190, 30, 16], [40, 170, 6, 12], [-90, 120, 18, 10], [210, -140, 52, 26]]) {
      skyIsland({ x: ZE(x), z, y, r, depth: r * 1.3, deco: true });
      model(x % 2 ? "trees_A_medium" : "tree_single_B", ZE(x) + r * 0.2, y, z - r * 0.15, 6 + r * 0.25, x);
    }
    /* oinak hodei-itsasoaren azpian: harria eta elurra bakarrik ageri */
    const anb = mountain(ZE(-80), -560, 150, 300, 1.7, 0.42);
    anb.position.y = 6;
    const anb2 = mountain(ZE(60), -600, 120, 220, 0.6, 0.5);
    anb2.position.y = -4;
    /* Gauekoren ekaitza Anboton: hodei beltza */
    const storm = new T.Mesh(puffGeo(70, 9, 3.3, 0.45), new T.MeshStandardMaterial({ color: "#3a3550", emissive: new T.Color("#1a1530"), emissiveIntensity: 0.6, roughness: 1, transparent: true, opacity: 0.92 }));
    storm.position.set(ZE(-80), 160, -560);
    BP.add(storm);
    ZR.storm = storm;
  }
  /* enarak: bi hego eta buztan-urkila (lerro-geometria txikia), uharteen inguruan biraka */
  function swallowMesh() {
    const s = new T.Shape();
    s.moveTo(0, 0.25);
    s.lineTo(0.9, -0.15);
    s.lineTo(0.18, -0.12);
    s.lineTo(0.12, -0.55);
    s.lineTo(0, -0.35);
    s.lineTo(-0.12, -0.55);
    s.lineTo(-0.18, -0.12);
    s.lineTo(-0.9, -0.15);
    s.closePath();
    const g = new T.ShapeGeometry(s);
    g.rotateX(-PI / 2);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: "#1a2238", side: T.DoubleSide }));
    m.scale.setScalar(0.8);
    return m;
  }
  /* jentil-arkua (bi harri zutik eta gaina) */
  function stoneArch(x, z, y, rot, w = 5, h = 5.2) {
    const g = new T.Group(),
      st = stackMaterial();
    for (const s of [-1, 1]) {
      const p = new T.Mesh(new T.BoxGeometry(1, h, 1.1), st);
      p.position.set((s * w) / 2, h / 2, 0);
      p.castShadow = true;
      g.add(p);
    }
    const top = new T.Mesh(new T.BoxGeometry(w + 2, 0.9, 1.4), st);
    top.position.y = h + 0.35;
    top.castShadow = true;
    g.add(top);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    BP.add(g);
    const c = Math.cos(rot),
      s2 = Math.sin(rot);
    for (const s of [-1, 1]) solids.push({ x: x + (c * s * w) / 2, z: z - (s2 * s * w) / 2, r: 0.75, h: h + 1, y, pillar: true });
    return g;
  }

  /* ================================ ORTZADARRA ================================ */
  /* koloreen testura: zazpi banda (u: zabalera), ertzak leunak */
  let RAINBOW_TEX = null;
  function rainbowTexture() {
    if (RAINBOW_TEX) return RAINBOW_TEX;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 8;
    const g = c.getContext("2d"),
      cols = ["#ff4b4b", "#ff9a3c", "#ffe14d", "#5fe07a", "#4fb4ff", "#5a6cff", "#b46bff"];
    const gr = g.createLinearGradient(0, 0, 256, 0);
    cols.forEach((col, i) => gr.addColorStop(0.08 + (i / 6) * 0.84, col));
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 8);
    /* ertzak gardenak */
    const img = g.getImageData(0, 0, 256, 8);
    for (let x = 0; x < 256; x++) {
      const u = x / 255,
        a = Math.min(1, Math.min(u, 1 - u) / 0.09);
      for (let y = 0; y < 8; y++) img.data[(y * 256 + x) * 4 + 3] = Math.round(255 * a);
    }
    g.putImageData(img, 0, 0);
    RAINBOW_TEX = new T.CanvasTexture(c);
    return RAINBOW_TEX;
  }
  /* zinta bat puntu-zerrenda batean zehar (lau, zabalera w); indizeak ordenan → drawRange-z hazi */
  function ribbonGeo(pts, w) {
    const pos = [],
      uv = [],
      idx = [],
      up = new T.Vector3(0, 1, 0),
      side = new T.Vector3(),
      tan = new T.Vector3();
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)];
      tan.subVectors(b, a).normalize();
      side.crossVectors(up, tan).normalize();
      if (i) acc += pts[i].distanceTo(pts[i - 1]);
      const p = pts[i];
      pos.push(p.x - (side.x * w) / 2, p.y, p.z - (side.z * w) / 2, p.x + (side.x * w) / 2, p.y, p.z + (side.z * w) / 2);
      uv.push(0, acc / 20, 1, acc / 20);
      if (i) {
        const k = (i - 1) * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  /* ortzadarraren bidea: A → B zuzena (oinez), gero kurba (ikusgaia) */
  function rainbowPath(A, B, far, ctrlK = 2.2) {
    const pts = [],
      n0 = 14;
    for (let i = 0; i <= n0; i++) pts.push(new T.Vector3().lerpVectors(A, B, i / n0));
    const dir = new T.Vector3().subVectors(B, A),
      C = B.clone().addScaledVector(dir, ctrlK);
    for (let i = 1; i <= 40; i++) {
      const t = i / 40,
        q = new T.Vector3()
          .copy(B)
          .multiplyScalar((1 - t) * (1 - t))
          .addScaledVector(C, 2 * (1 - t) * t)
          .addScaledVector(far, t * t);
      pts.push(q);
    }
    return pts;
  }
  function rainbowMesh(pts, w) {
    const g = new T.Group(),
      geo = ribbonGeo(pts, w),
      mat = new T.MeshBasicMaterial({ map: rainbowTexture(), transparent: true, opacity: 0.82, side: T.DoubleSide, depthWrite: false, fog: true });
    const m = new T.Mesh(geo, mat);
    m.renderOrder = 4;
    g.add(m);
    /* distira zabal bat (argi-lanbroa) */
    const geo2 = ribbonGeo(pts, w * 2.6),
      glowM = new T.Mesh(geo2, new T.MeshBasicMaterial({ color: "#fff6e0", transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: true }));
    glowM.renderOrder = 3;
    glowM.position.y = -0.04;
    g.add(glowM);
    (BP || scene).add(g);
    return { g, m, glowM, n: geo.index.count, n2: geo2.index.count };
  }
  /* haranean: harrespilatik iparrerantz (Anboto aldera), hodeietaraino */
  const ORZ = { A: new T.Vector3(46, 9.06, -75.6), dir: new T.Vector3(-0.28, 0, -0.96), len: 22, rise: 8, t: 0, p: null, mesh: null, sparks: 0 };
  function ortzadarBuild() {
    zoneBuild("ibarra");
    const A = ORZ.A,
      B = A.clone().addScaledVector(ORZ.dir, ORZ.len);
    B.y += ORZ.rise;
    ORZ.B = B;
    const far = A.clone().addScaledVector(ORZ.dir, 230);
    far.y = 150;
    ORZ.mesh = rainbowMesh(rainbowPath(A, B, far, 2.4), 3.6);
    /* oinezko zatia: arrapala (alboetatik ezin igo) */
    const len = ORZ.len,
      rot = Math.atan2(ORZ.dir.x, ORZ.dir.z);
    ORZ.p = { x: (A.x + B.x) / 2, z: (A.z + B.z) / 2, y: B.y, bottom: A.y - 1, w: 3.4, d: len, rot, ramp: [A.y, B.y], phase: -1, area: "harrespila", safe: false, rainbow: true, off: true };
    platforms.push(ORZ.p);
    /* oinean distira */
    ORZ.foot = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#fff2c8", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    ORZ.foot.scale.setScalar(6);
    ORZ.foot.position.set(A.x, A.y + 0.8, A.z);
    BP.add(ORZ.foot);
    ORZ.t = saved.flags.includes("ortzadarra") ? 1 : 0;
    ortzadarPose(ORZ.t);
  }
  function ortzadarPose(k) {
    const M = ORZ.mesh;
    if (!M) return;
    M.g.visible = k > 0.001;
    M.m.geometry.setDrawRange(0, Math.floor((M.n / 6) * k) * 6);
    M.glowM.geometry.setDrawRange(0, Math.floor((M.n2 / 6) * k) * 6);
    ORZ.p.off = k < 0.35;
    ORZ.foot.material.opacity = k * 0.5;
  }
  /* ORTZI erritmoa (txalaparta.js-tik) */
  function ortziEffect() {
    if (ZONE.cur === "ibarra" && Math.hypot(P.x - 46, P.z + 64) < 17 && P.y > 7) {
      if (saved.flags.includes("ortzadarra")) {
        notify(L("Ortzadarra hor dago: iparrera, zerurako bidea."), "", 3.5);
        fxRing(ORZ.A.x, ORZ.A.y + 0.2, ORZ.A.z, "#fff2c8", 6, 0.9);
        return;
      }
      if (!saved.flags.includes("irati-errolan")) {
        notify(L("Harriek kantatu dute… baina zerua itxita dago oraindik."), "", 3.5);
        return;
      }
      flagSet("ortzadarra");
      ORZ.t = 0.0001;
      SND.stinger(true);
      SND.wake();
      shake(0.25);
      title("ORTZADARRA", "");
      notify(L("Harrespilako harriek kantatu dute, eta ortzadar bat jaio da: jentilen zubia, zerura!"), "", 6);
      hud();
      return;
    }
    if (ZONE.cur === "zerua") {
      notify(L("Ortzik entzun zaitu: zeruan zaude jada."), "", 2.6);
      return;
    }
    notify(L("Zerua urrun dago hemendik… Harrespilan jo, jentilen harrien erdian."), "", 3.5);
  }
  function ortzadarUpdate(dt) {
    if (!ORZ.mesh) return;
    if (ORZ.t > 0 && ORZ.t < 1) {
      ORZ.t = Math.min(1, ORZ.t + dt * 0.4);
      ortzadarPose(smooth01(ORZ.t));
      if (Math.random() < dt * 40) {
        const k = smooth01(ORZ.t),
          q = ORZ.A.clone().addScaledVector(ORZ.dir, ORZ.len * Math.min(1, k * 3));
        q.y += ORZ.rise * Math.min(1, k * 3);
        fxBurst(q.x, q.y + 0.3, q.z, { n: 2, speed: 1.6, up: 1.5, life: 0.9, size: 0.3, color: ["#ff9a3c", "#ffe14d", "#5fe07a", "#4fb4ff"][Math.floor(Math.random() * 4)], grav: 0.5 });
      }
    }
    if (ORZ.t >= 1) {
      ORZ.mesh.m.material.opacity = 0.62 + 0.2 * (1 - DAY.k * 0.6) + Math.sin(time * 1.3) * 0.04;
      if (Math.random() < dt * 4 && Math.hypot(P.x - ORZ.A.x, P.z - ORZ.A.z) < 40) {
        const t = Math.random(),
          q = ORZ.A.clone().addScaledVector(ORZ.dir, ORZ.len * t);
        q.y += ORZ.rise * t;
        fxBurst(q.x + (Math.random() - 0.5) * 3, q.y + 0.2, q.z, { n: 1, speed: 0.4, up: 0.8, life: 1.2, size: 0.18, color: "#fff6dc", grav: -0.3 });
      }
      /* goian: zerura */
      if (!ZONE.pending && !cinematic && P.platform === ORZ.p && P.y > ORZ.A.y + ORZ.rise - 1.6) {
        coachDone("ortzadarra");
        enterZone("zerua", { ...DGZ.entry, cp: true });
      }
    }
  }

  /* ================================ UHARTEAK ================================ */
  function buildZerua() {
    dungeonBegin(DGZ);
    cloudSea();
    skyScenery();
    /* ---- Z1: Ortzadarraren muturra ---- */
    skyIsland({ x: ZE(0), z: 0, y: 0, r: 12.5, depth: 16, area: "zA" });
    skyRoom("Z1", ZE(0), 0, 25, 25, { rx: 12.5, area: "zA", name: "ORTZADARRAREN MUTURRA", desc: "Hodeien gainean. Hemen bizi dira haizea eta trumoia." });
    DGZ.hearthA = sutondoa("zA-su", ZE(-5.5), 0, 2.5, 1.9, -1.4);
    jentilStatue(ZE(-7.5), -5.5, 0.5, 0.85);
    jentilStatue(ZE(7.5), -5.5, -0.5, 0.85);
    stoneArch(ZE(0), -10.6, 0, 0, 4.6, 4.8);
    for (const [tx, tz, k] of [[ZE(9.2), 3.4, "tree_single_A"], [ZE(-9.4), -1.5, "tree_single_B"], [ZE(6.4), 8.4, "tree_single_B"]]) {
      model(k, tx, 0, tz, 4.8, tx * 0.3);
      solids.push({ x: tx, z: tz, r: 0.5, h: 5, y: 0, pillar: true });
    }
    model("rock_single_B", ZE(-3), 0, 9.6, 1.6, 0.4);
    model("rock_single_D", ZE(10.2), 0, -3, 1.9, 1.1);
    /* ortzadarra hegoan, beherantz (haranera) */
    const rA = new T.Vector3(ZE(0), 0.04, 12.1),
      rB = new T.Vector3(ZE(0), -3.1, 25.5),
      rFar = new T.Vector3(ZE(-30), -70, 190);
    ZR.rainbow = rainbowMesh(rainbowPath(rA, rB, rFar, 2), 3.6);
    const rRot = Math.atan2(rB.x - rA.x, rB.z - rA.z),
      rLen = Math.hypot(rB.x - rA.x, rB.z - rA.z);
    platforms.push({ x: (rA.x + rB.x) / 2, z: (rA.z + rB.z) / 2, y: rA.y, bottom: rB.y - 1, w: 3.4, d: rLen, rot: rRot, ramp: [rA.y, rB.y], phase: -1, area: "zA", safe: false, rainbow: true });
    /* ---- Z1 → Z2: zubia ---- */
    skyBridge(ZE(0), -16.6, 3.6, 9.4, 0, "zA");
    /* ---- Z2: Hodei-zubiak (garaia airean) ---- */
    ROOMS_AREA.zB = ["HODEI-ZUBIAK", "Iraganean, hodeiak harri bezain trinkoak ziren. Aldatu garaia airean."];
    cloudStep(ZE(-1.5), 0, -24.8, 2.3, 0, { area: "zB" });
    cloudStep(ZE(2.6), 0.6, -30.8, 2.3, 1, { area: "zB" });
    cloudStep(ZE(-1.6), 1.0, -36.8, 2.3, 0, { area: "zB" });
    cloudStep(ZE(1.4), 0.5, -43.0, 2.5, -1, { area: "zB" });
    /* ekialdean: laino trinkoa → bide ezkutua (HAIZE-ADARRA) */
    const h1 = cloudStep(ZE(8.2), 0.9, -31.5, 1.9, -1, { hidden: true, area: "zB" }),
      h2 = cloudStep(ZE(13.4), 1.6, -35.2, 1.9, -1, { hidden: true, area: "zB" });
    skyIsland({ x: ZE(19.5), z: -38.5, y: 2.2, r: 3.8, depth: 6, area: "zB", debris: 2 });
    model("tree_single_A", ZE(21), 2.2, -40, 3.6, 0.3);
    solids.push({ x: ZE(21), z: -40, r: 0.45, h: 4, y: 2.2, pillar: true });
    chest("zB-piece", ZE(19), 2.2, -37.8, -PI / 2, { t: "piece", id: "zerua" });
    const revealMist = () => {
      if (!h1.off) return;
      h1.reveal();
      h2.reveal();
      if (!saved.cleared.includes("zB-laino")) saved.cleared.push("zB-laino");
      persist();
    };
    mist(ZE(13), 0.6, -34.5, 6, {
      n: 22,
      h: 3.5,
      op: 0.75,
      col: "#f2f6fb",
      back: 9e9,
      live: () => !saved.cleared.includes("zB-laino"),
      onClear: () => {
        revealMist();
        notify(L("Lainoa uxatu da: hodei-harri batzuk, ekialderantz!"), "", 4);
      },
    });
    if (saved.cleared.includes("zB-laino")) {
      h1.off = h2.off = false;
      h1.m.visible = h2.m.visible = true;
      h1.safe = h2.safe = true;
    }
    /* ---- Z3: Zeruko plaza (borroka) ---- */
    skyPlaza({ x: ZE(0), z: -62, y: 0, w: 24, d: 24, depth: 18, area: "zC" });
    skyRoom("Z3", ZE(0), -62, 24, 24, {
      area: "zC",
      name: "ZERUKO PLAZA",
      desc: "Jentilen plaza zaharra, hodeien gainean. Itzalak zain.",
      waves: [[["eye", -1, 2], ["grunt", -1, 1]], [["grunt", 0, 2], ["eye", 1, 1]], [["brute", -1, 1], ["eye", 0, 1], ["eye", 1, 1]]],
      diff: 1.3,
      hpK: 1.45,
      fightText: "Itzalak hodeien gainean! Kolore bakoitza bere garaian. Ertzetik kontuz…",
      onWin: () => {
        revealChest(DGZ.keyChest);
        notify(L("Kutxa bat agertu da plazaren erdian."), "", 4);
      },
    });
    DGZ.keyChest = chest("zC-key", ZE(0), 0, -62, 0, { t: "key" }, { hidden: !isCleared("Z3") });
    DGZ.hearthC = sutondoa("zC-su", ZE(-8.4), 0, -53.2, 1.9, -1.5);
    /* estalpeak: bi harri-bloke (plaza azpi-espazioetan) eta haien atzean, zorroak */
    coverBlock(ZE(-6.5), -59.5, 3.2, 2.0, 2.0);
    coverBlock(ZE(6.5), -57, 2.0, 3.2, 2.0);
    pouch("zC-zorroa1", ZE(-7.2), 0, -61.3, 15);
    pouch("zC-zorroa2", ZE(7.2), 0, -59.4, 15);
    jentilStatue(ZE(8), -70.5, -0.4, 0.7);
    bprop("rubble_half", ZE(-7), 0, -69.5, DS * 0.6, 0.7);
    bprop("rubble_large", ZE(9.5), 0, -55, DS * 0.5, 2.1);
    /* ---- Z3 → Z4: zubia ekialdera ---- */
    skyBridge(ZE(18.5), -62, 13.4, 3.6, 0, "zC");
    /* ---- Z4: Haize-errota ---- */
    skyIsland({ x: ZE(34), z: -62, y: 0, r: 9.2, depth: 13, area: "zD" });
    skyRoom("Z4", ZE(34), -62, 18.4, 18.4, { rx: 9.2, area: "zD", name: "HAIZE-ERROTA", desc: "Jentilen haize-errota, geldirik. Haize-adar batek esnatuko luke…" });
    millBuild(ZE(39), -68.2);
    liftBuild(ZE(34), -73.2);
    /* goiko ertza (y 9) eta giltza txikiko atea */
    slab({ x: ZE(34), z: -79.6, y: 9, w: 5, d: 9, h: 1.4, area: "zD" });
    const ledgeUnder = obj(underGeo(3.4, 5.6, 6, 4, 2.2, true), underMat());
    ledgeUnder.position.set(ZE(34), 7.6, -79.6);
    ledgeUnder.castShadow = false;
    DOORDEF.zDn = door("zD-n", ZE(34), -84.3, 0, 9, "key");
    for (const s of [-1, 1]) wallBlock(ZE(34 + s * 3.5), -84.3, 1.4, 1.6, 0, 9, 8, stackMaterial());
    skyBridge(ZE(34), -88.4, 3.6, 7.6, 9, "zE");
    /* ---- Z5: Hodei-zainaren harria (y 9) ---- */
    skyPlaza({ x: ZE(34), z: -104, y: 9, w: 24, d: 24, depth: 16, area: "zE" });
    skyRoom("Z5", ZE(34), -104, 24, 24, { y: 9, area: "zE", name: "HODEI-ZAINAREN HARRIA", desc: "Harrizko zaindari bat, hodeiz jantzita." });
    DGZ.wingChest = chest("zE-enara", ZE(34), 9, -97, PI, { t: "item", id: "enara" }, { hidden: !isCleared("zE-mini") });
    jentilStatue(ZE(26), -113, 0.3, 0.75, 9);
    jentilStatue(ZE(42), -113, -0.3, 0.75, 9);
    /* ---- Z3 mendebaldea: haize-zutabea (ORAINEAN) → Z6 ---- */
    ZR.westDraft = updraft({ x: ZE(-21), z: -62, r: 2.7, y0: -16, y1: 19.5, phase: 1, power: 8.8, id: "zF-u" });
    /* ---- Z6: Tximista-dorrea (y 14) ---- */
    skyIsland({ x: ZE(-46), z: -62, y: 14, r: 11, depth: 15, area: "zF" });
    skyRoom("Z6", ZE(-46), -62, 22, 22, { y: 14, rx: 11, area: "zF", name: "TXIMISTA-DORREA", desc: "Dorre zahar bat, heuraz estalia. Goian, tximista-orratza." });
    const tower = slab({ x: ZE(-46), z: -64.5, y: 23, w: 6, d: 6, h: 9, area: "zF" });
    tower.slick = true;
    tower.m.material = stackMaterial();
    DGZ.ivyF = ivySide(tower, "s", 14, { phase: 0, id: "zF-heura" });
    /* tximista-orratza (goian) */
    const rod = obj(new T.CylinderGeometry(0.06, 0.12, 4.2, 6), material("#8a8f96", 0.2));
    rod.position.set(ZE(-46) + 2, 25.1, -66.5);
    DGZ.rodTip = obj(new T.OctahedronGeometry(0.28, 0), new T.MeshStandardMaterial({ color: "#b8dcff", emissive: new T.Color("#7fc8ff"), emissiveIntensity: 1.2 }));
    DGZ.rodTip.position.set(ZE(-46) + 2, 27.3, -66.5);
    DGZ.bigChest = chest("zF-bigkey", ZE(-46), 23, -64.8, 0, { t: "bigkey" }, { hidden: !isCleared("zF-bells") });
    RUNE_SETS.push({
      id: "zF-bells",
      zone: "zerua",
      kind: "kanpaia",
      time: 9,
      runes: [[ZE(-54.5), 17.6, -57.5, -1], [ZE(-37.5), 17.6, -57.5, 1], [ZE(-46), 17.6, -53.6, -1]],
      hint: "Hiru ekaitz-kanpaia dorrearen inguruan. Jo denak SORGINKERIAz, elkarren segidan (bat ORAINEAN bakarrik).",
      onSolve: () => {
        revealChest(DGZ.bigChest);
        title("KANPAIAK BATERA", "");
        notify(L("Dorrearen gainean, kutxa bat! Heura IRAGANEAN bizirik dago."), "", 4.5);
      },
    });
    model("rock_single_C", ZE(-53), 14, -68, 2.4, 0.8);
    model("tree_single_B", ZE(-38.5), 14, -67.5, 4.5, 0.2);
    solids.push({ x: ZE(-38.5), z: -67.5, r: 0.5, h: 5, y: 14, pillar: true });
    /* ---- Z3 iparra: zeruko eskailerak → Z7 ---- */
    stoneArch(ZE(0), -73.2, 0, 0, 4.8, 5.4);
    skyRamp(ZE(0), -74.5, 0, ZE(0), -89.5, 9, 4.2, "zC");
    slab({ x: ZE(0), z: -93, y: 9, w: 6.4, d: 7, h: 1.4, area: "zC" });
    const landUnder = obj(underGeo(4.2, 4.6, 7, 4, 1.2, true), underMat());
    landUnder.position.set(ZE(0), 7.6, -93);
    landUnder.castShadow = false;
    skyRamp(ZE(0), -96.5, 9, ZE(0), -112, 18, 4.2, "zG");
    /* ---- Z7: Ekaitzaren begia (Odei) ---- */
    skyIsland({ x: Z7.x, z: Z7.z, y: Z7.y, r: Z7.r, depth: 22, area: "zG", top: "stone" });
    DGZ.bossRoom = skyRoom("Z7", Z7.x, Z7.z, Z7.r * 2, Z7.r * 2, { y: Z7.y, rx: Z7.r, noClamp: true, area: "zG", name: "EKAITZAREN BEGIA", desc: "" });
    /* atalasea: eskaileretatik uhartera (atearen azpian) */
    slab({ x: ZE(0), z: -113.4, y: 18, w: 6.4, d: 3.4, h: 1.4, area: "zG" });
    DOORDEF.zGn = door("zG-n", ZE(0), -113.7, 0, 18, "boss");
    for (const s of [-1, 1]) {
      const pil = obj(new T.CylinderGeometry(1.1, 1.3, 9, 8), stackMaterial());
      pil.position.set(ZE(s * 3.9), 18 + 4.5, -113.7);
      solids.push({ x: ZE(s * 3.9), z: -113.7, r: 1.2, h: 9, y: 18, pillar: true });
    }
    /* harrespila zeruan: zutarriak ertzean */
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.11;
      if (Math.abs(Math.sin(a) - 1) < 0.08) continue;
      const x = Z7.x + Math.cos(a) * 15.6,
        z = Z7.z + Math.sin(a) * 15.6;
      if (z > Z7.z + 13) continue;
      const m = box(x, Z7.y + 1.4, z, 1, 2.8 + (i % 3) * 0.5, 0.7, stackMaterial());
      m.rotation.y = a;
      solids.push({ x, z, r: 0.65, h: 3.5, y: Z7.y, pillar: true });
    }
    barrierBuild();
    odeiBuild();
    /* ---- Z8: Enaren habia (ezkutuko uhartetxoa) — Z4-ko haize-zutabea (ORAINEAN) ---- */
    ZR.nestDraft = updraft({ x: ZE(45.2), z: -55.5, r: 2.2, y0: -12, y1: 15.5, phase: 1, power: 8.4, id: "zH-u" });
    skyIsland({ x: ZE(52), z: -34, y: 6, r: 4.2, depth: 7, area: "zH", debris: 2 });
    ROOMS_AREA.zH = ["ENAREN HABIA", "Enarak hemen bizi dira, ekaitzetik urrun."];
    chest("zH-habia", ZE(52.5), 6, -33.5, PI / 2, { t: "piece", id: "habia" });
    const nest = obj(new T.TorusGeometry(0.9, 0.35, 6, 14), material("#6b4a2e"));
    nest.rotation.x = PI / 2;
    nest.position.set(ZE(50.2), 6.3, -35.8);
    /* enarak */
    for (let i = 0; i < 7; i++) {
      const m = swallowMesh();
      BP.add(m);
      ZR.birds.push({ m, c: i < 4 ? [ZE(0), 0] : [ZE(30), -60], r: 9 + i * 2.1, h: 6 + (i % 3) * 3, sp: 0.5 + (i % 4) * 0.13, ph: i * 1.7 });
    }
    dungeonEnd(DGZ);
  }
  /* ---------------- HAIZE-ERROTA eta IGOGAILUA (Z4) ---------------- */
  function millBuild(x, z) {
    const st = stackMaterial(),
      tw = obj(new T.CylinderGeometry(1.5, 1.95, 8, 10), st);
    tw.position.set(x, 4, z);
    const roof = obj(new T.ConeGeometry(2.2, 2.4, 10), material("#6b4a2e"));
    roof.position.set(x, 9.2, z);
    solids.push({ x, z, r: 2, h: 10, y: 0, pillar: true });
    const F = fan(x, 6.4, z + 2.05, 0, {
      id: "zD-errota",
      need: 0.15,
      range: 17,
      onSpin: (on) => {
        ZR.millOn = on;
      },
    });
    F.g.scale.setScalar(1.9);
    ZR.mill = F;
  }
  function liftBuild(x, z) {
    const g = new T.Group(),
      disc = new T.Mesh(new T.CylinderGeometry(2.05, 1.7, 0.7, 16), stackMaterial());
    disc.position.y = -0.35;
    disc.castShadow = disc.receiveShadow = true;
    g.add(disc);
    const rune = new T.Mesh(new T.CircleGeometry(1.2, 24), new T.MeshBasicMaterial({ color: "#ffd38a", map: runeTexture(), transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending }));
    rune.rotation.x = -PI / 2;
    rune.position.y = 0.02;
    g.add(rune);
    g.position.set(x, 0, z);
    BP.add(g);
    const p = { x, z, y: 0, bottom: -0.8, rx: 2.0, rz: 2.0, phase: -1, area: "zD", safe: false, lift: true };
    platforms.push(p);
    ZR.lift = { g, p, rune, y: 0, hold: 0 };
  }
  function liftUpdate(dt) {
    const Lf = ZR.lift;
    if (!Lf) return;
    const on = P.platform === Lf.p,
      top = Lf.y > 8.95;
    /* goian, gainean bazaude: zain */
    if (ZR.millOn || (top && on)) Lf.hold = 1.2;
    else Lf.hold = Math.max(0, Lf.hold - dt);
    const want = Lf.hold > 0 ? 9 : 0,
      sp = want > Lf.y ? 2.4 : 1.6;
    const prev = Lf.y;
    Lf.y = want > Lf.y ? Math.min(want, Lf.y + sp * dt) : Math.max(want, Lf.y - sp * dt);
    Lf.p.y = Lf.y;
    Lf.g.position.y = Lf.y;
    Lf.rune.material.opacity = Lf.y !== prev ? 0.75 + Math.sin(time * 12) * 0.15 : 0.35;
    if (Lf.y !== prev && Math.random() < dt * 14) fxBurst(Lf.p.x + (Math.random() - 0.5) * 3, Lf.y - 0.6, Lf.p.z + (Math.random() - 0.5) * 3, { n: 1, speed: 0.6, up: -1, life: 0.7, size: 0.22, color: "#d9e6f2", grav: 2 });
  }
  /* ---------------- EKAITZ-HESIA (Z7): ate handia ireki arte ---------------- */
  function barrierBuild() {
    const tex = draftTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(8, 2);
    tex.rotation = PI / 2;
    const m = obj(new T.CylinderGeometry(Z7.r + 0.6, Z7.r + 0.6, 26, 48, 1, true), new T.MeshBasicMaterial({ map: tex, color: "#b9c8ff", transparent: true, opacity: 0.32, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    m.position.set(Z7.x, Z7.y + 12, Z7.z);
    m.castShadow = false;
    m.renderOrder = 7;
    ZR.barrier = { m, tex, k: 1 };
  }
  function barrierUpdate(dt) {
    const B = ZR.barrier;
    if (!B) return;
    const open = saved.doors.includes(DGZ.bossDoor) || saved.flags.includes("odei");
    B.k = mix(B.k, open ? 0 : 1, 1 - Math.exp(-dt * 1.5));
    B.m.visible = B.k > 0.01;
    B.tex.offset.x += dt * 0.25;
    B.m.material.opacity = 0.3 * B.k;
    if (open) return;
    /* barrura ezin: haizeak kanpora botatzen zaitu */
    const dx = P.x - Z7.x,
      dz = P.z - Z7.z,
      d = Math.hypot(dx, dz) || 1,
      lim = Z7.r + 1.1;
    if (d < lim && P.y > Z7.y - 6) {
      P.x = Z7.x + (dx / d) * lim;
      P.z = Z7.z + (dz / d) * lim;
      P.vx = (dx / d) * 9;
      P.vz = (dz / d) * 9;
      if (P.glide) P.vy = Math.min(P.vy, 0);
      hero.position.set(P.x, P.y, P.z);
      notifyOnce("zG-hesia", L("Ekaitz-hesia: haizeak atzera bota zaitu. Ate handia: giltza nagusia."), "");
    }
  }

  /* ================================ EGUNERAKETA ================================ */
  DGZ.update = (dt) => {
    hearthsUpdate(dt);
    liftUpdate(dt);
    barrierUpdate(dt);
    for (const S of ZR.sea) S.t.offset.x += dt * S.sp;
    for (const C of ZR.clouds) {
      const y = C.y0 + Math.sin(time * (C.big ? 0.25 : 0.9) + C.ph) * (C.big ? 0.8 : 0.08);
      C.m.position.y = y;
      if (C.ghost) C.ghost.position.y = y;
    }
    for (const D of ZR.debris) D.m.position.y = D.y0 + Math.sin(time * 0.7 + D.ph) * 0.45;
    for (const B of ZR.birds) {
      const a = time * B.sp + B.ph;
      B.m.position.set(B.c[0] + Math.cos(a) * B.r, B.h + Math.sin(a * 2.3) * 1.2, B.c[1] + Math.sin(a) * B.r * 0.8);
      B.m.rotation.y = -a;
      B.m.rotation.z = Math.sin(time * 9 + B.ph) * 0.35;
    }
    if (ZR.storm) ZR.storm.rotation.y += dt * 0.02;
    if (DGZ.rodTip) DGZ.rodTip.material.emissiveIntensity = 1 + Math.max(0, Math.sin(time * 7)) * 1.4;
    /* lehen aldiz: iritsiera */
    if (!saved.flags.includes("zerua") && !cinematic && P.grounded && ROOM.cur === DGZ.rooms.Z1) {
      flagSet("zerua");
      say(
        [
          ["· · ·", "Ortzadarraren amaieran, hodeien gainean: uharte zaharrak airean, eta urrunean, Anboto, ekaitz beltz batean bilduta.", "", ZE(0), -40, 0, [ZE(18), 14, 26]],
          ["AMAIUR", "Jentilen zerua… Hemendik igotzen ziren izarretara, amonak zioenez.", "", P.x, P.z, 0],
          ["AMAIUR", "Trumoia entzuten da iparrean. Gauekoren zaindari bat, zalantzarik gabe.", "", P.x, P.z, 0],
        ],
        () => notify(L("Iparrera, hodei-zubietatik. Hodeiak IRAGANEAN trinkoak dira: aldatu garaia airean."), "", 6),
      );
    }
    /* Z5: zaindaria esnatzen da */
    const R5 = DGZ.rooms.Z5;
    if (R5 && !MINI.e && !ROOM.fight && !cinematic && ROOM.cur === R5 && !isCleared("zE-mini") && P.grounded && P.y > 8 && Math.abs(P.x - R5.x) < R5.w / 2 - 3 && Math.abs(P.z - R5.z) < R5.d / 2 - 3)
      miniBegin(
        R5,
        {
          name: "HODEI-ZAINA",
          clearId: "zE-mini",
          hp: 38,
          scale: 1.75,
          K: 1.3,
          tint: "#c9d6e6",
          add: [["eye", -1, 2]],
          hint: "Hodeiz jantzitako zaindaria! Ezkutua garaiz aldatzen du (begien kolorea). Oldarka datorrenean: ALDARATU.",
          onDead: () => {
            revealChest(DGZ.wingChest);
            notify(L("Kutxa bat agertu da harriaren hegoaldean."), "", 4);
          },
        },
        R5.x,
        R5.z - 6,
      );
    /* lainoa: hurbil → pista */
    if (!saved.cleared.includes("zB-laino") && Math.hypot(P.x - ZE(10), P.z + 33) < 11) notifyOnce("zB-laino-hint", hasHorn() ? L("Laino trinkoa hodeien artean… HAIZE-ADARRAk uxatuko luke.") : L("Laino trinkoa hodeien artean… haize bolada batek uxatuko luke."), "");
    if (ROOM.cur === DGZ.rooms.Z4 && !isCleared("zD-lift")) {
      notifyOnce("zD-mill-hint", L("Jentilen haize-errota, geldirik. Igogailuaren gainetik, HAIZE-ADARRAz putz egin errotari."), "");
      if (ZR.lift && ZR.lift.y > 8.9) saved.cleared.push("zD-lift");
    }
    odeiUpdateZone(dt);
  };
  const FOG_SKY_PAST = new T.Color("#e3c3a2"),
    FOG_SKY_NOW = new T.Color("#b3c8de"),
    SEA_PAST = new T.Color("#f0d3b4"),
    SEA_NOW = new T.Color("#c9d5e3");
  /* argia eta lainoa (eraVisuals-etik, dayVisuals ondoren) */
  function skyVisuals() {
    sun.color.set(phaseBlend > 0.5 ? "#fff6ea" : "#ffd29a");
    sun.intensity = mix(1.85, 1.95, phaseBlend);
    ambient.intensity = mix(0.82, 0.9, phaseBlend) * (scene.environment ? 0.6 : 1);
    ambient.color.set("#d9e8f5");
    ambient.groundColor.set("#6a6f86");
    scene.fog.color.copy(FOG_SKY_PAST).lerp(FOG_SKY_NOW, phaseBlend);
    scene.fog.near = 180;
    scene.fog.far = 950;
    playerLight.intensity = 0;
    for (const S of ZR.sea) S.m.material.color.copy(SEA_PAST).lerp(SEA_NOW, phaseBlend);
  }
  /* leizeko helburuak (HUD + markatzailea) */
  DGZ.objective = () => {
    const R = DGZ.rooms,
      it = (k) => saved.items.includes(k);
    /* Odei aske: zerua amaituta (Herensugea, hodeien beste aldean) */
    if (saved.flags.includes("odei")) {
      if (!saved.flags.includes("irati-odei")) return ["Itzuli ortzadarretik (hegoan): herrian, Irati zain.", [DGZ.exitArch.x, DGZ.exitArch.z, 0]];
      if (!saved.flags.includes("herensugea")) return ["Odeiren hodei zuria (ortzadarraren muturrean): SUGE-MENDIRA.", HZ.cloud ? [HZ.cloud.position.x, HZ.cloud.position.z, 0] : null];
      return ["Ortzadarra (hegoan): haranera.", [DGZ.exitArch.x, DGZ.exitArch.z, 0]];
    }
    if (!isCleared("Z3")) return ROOM.cur === R.Z3 ? ["Zeruko plaza: garaitu itzalak (ertzetik kontuz).", [R.Z3.x, R.Z3.z, 0]] : ["Iparrera hodei-zubietatik: hodeiak IRAGANEAN trinkoak dira. Aldatu garaia airean.", [R.Z3.x, -51, 0]];
    if (!saved.doors.includes("zD-n") && !(saved.keyz.zerua > 0)) return ["Kutxa: plazaren erdian.", [R.Z3.x, R.Z3.z, 0]];
    if (!saved.doors.includes("zD-n")) {
      if (P.y > 7.5 && Math.abs(P.x - ZE(34)) < 4 && P.z < -74) return ["Giltza txikiko atea: ireki.", [ZE(34), -83, 9]];
      return ["Ekialdeko haize-errota: igogailuaren gainean, HAIZE-ADARRAz putz egin errotari.", [ZE(34), -73.2, 0]];
    }
    if (!isCleared("zE-mini")) return ["Hodei-zainaren harria: zaindaria esnatuko da.", [R.Z5.x, R.Z5.z, 9]];
    if (!it("enara")) return ["Kutxa ireki: harriaren hegoaldean.", [R.Z5.x, -97, 9]];
    if (!it(DGZ.bigKey)) {
      if (ROOM.cur === R.Z6) return isCleared("zF-bells") ? ["Dorrea: igo heura IRAGANEAN; goian, kutxa.", [ZE(-46), -60.8, 14]] : ["Hiru ekaitz-kanpaiak, elkarren segidan (bat ORAINEAN bakarrik).", [ZE(-46), -56, 14]];
      return ["Plazaren mendebaldean, haize-zutabea (ORAINEAN): jauzi bikoitza eta eutsi JAUZIari — planeatu gora, dorreraino.", [ZE(-21), -62, 0]];
    }
    return saved.doors.includes(DGZ.bossDoor) ? ["Ekaitzaren begia: ODEI.", [Z7.x, Z7.z + 10, Z7.y]] : ["Zeruko eskailerak iparrean: ekaitz-hesiaren ate handia (giltza nagusia).", [ZE(0), -112, 18]];
  };
