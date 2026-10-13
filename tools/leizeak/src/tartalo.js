  /* ==================================================================
     TARTALOREN KOBA · hirugarren leizea (diseinu propioa) — sua eta harria
       T1 Kobaren ahoa ......... bi sutegi (SORGINKERIA) elkarren segidan → barrak
       T2 Ardi-korta ........... Tartaloren ardiak; borroka → mendebaldeko barrak; burdin-harria;
                                 ekialdean egurrezko hesia (SUA behar da)
       T3 Begiaren gela ........ Tartaloren begiak zirrikitutik zaintzen du: harrien eta ardien
                                 atzean ezkutatu → GILTZA TXIKIA
       T4 Burruntziaren sutegia  zaindari ertaina (BURRUNTZI-ZAINA) → BURRUNTZI GORIA (SUGAR-IZPIA)
       T5 Izotz-hesia .......... Gauekoren izotz-horma urtu (SUA); galdara garaiak barrak irekitzen ditu
       T6 Galdaren gela ........ lau galdara garai, denak batera SUArekin → GILTZA NAGUSIA
       T7 Tartaloren etxea ..... etsai nagusia: lau galdarak piztu → argiak itsutzen du → begia jo
     Ipuin zaharrean bezala: Tartalok ilunpean ikusten du, baina argiak itsutzen du.
     ================================================================== */
  const TX = 1200;
  const DGT = {
    id: "tartalo",
    num: "03",
    entry: { x: TX, y: 0, z: 8.5, a: PI },
    exitArch: { x: TX, z: 12.2 },
    exitTo: () => ({ x: -70, y: 12, z: -126, a: 0, cp: true }),
    bigKey: "giltzanagusia-tartalo",
    bigKeyText: "Tartaloren etxera daraman ate handia irekitzen du.",
    bossDoor: "tD-n",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ff9a4a", "#ffd0a0"],
    tint: "#d9b89c",
    fog: [10, 58],
  };
  /* ------------------------------ eraikigaiak ------------------------------ */
  /* egurrezko hesia ate batean (SUAk bakarrik erretzen du) */
  function barricade(id, x, z, alongZ, w = 5.8) {
    const g = new T.Group(),
      wood = material("#6b4a2e"),
      dark = material("#43301f");
    g.position.set(x, 0, z);
    g.rotation.y = alongZ ? PI / 2 : 0;
    BP.add(g);
    for (let i = 0; i < 5; i++) {
      const plank = new T.Mesh(new T.BoxGeometry(w, 0.42, 0.22), i % 2 ? dark : wood);
      plank.position.set(0, 0.6 + i * 0.95, 0);
      plank.rotation.z = (i % 2 ? 1 : -1) * 0.06;
      plank.castShadow = true;
      g.add(plank);
    }
    for (const s of [-1, 1]) {
      const x0 = new T.Mesh(new T.BoxGeometry(0.3, 5.4, 0.3), dark);
      x0.position.set(s * (w / 2 - 0.4), 2.7, 0.15);
      x0.rotation.z = s * 0.5;
      g.add(x0);
    }
    const wall = wallBlock(x, z, alongZ ? 1.1 : w, alongZ ? w : 1.1, 0, 0, 7);
    const done = saved.cleared.includes(id);
    g.visible = !done;
    wall.off = done;
    const B = {
      kind: "hesia",
      x,
      y: 0,
      z,
      m: g,
      r: w / 2,
      broken: done,
      buildZone: BP,
      fireOnly: true,
      hint: L("Egurrezko hesia: sorginkeria arruntak ez du erretzen. SUA behar da…"),
      solid: { r: 0 },
      hitTest: (bx, by, bz, r) => by < 6 && Math.abs((alongZ ? bz : bx) - (alongZ ? z : x)) < w / 2 + r && Math.abs((alongZ ? bx : bz) - (alongZ ? x : z)) < 1.2 + r,
      custom: () => {
        g.visible = false;
        wall.off = true;
        if (!saved.cleared.includes(id)) saved.cleared.push(id);
        persist();
        SND.flame();
        for (let i = 0; i < 5; i++) fxBurst(x + (alongZ ? 0 : (i - 2) * 1.1), 1.5 + (i % 3), z + (alongZ ? (i - 2) * 1.1 : 0), { n: 14, speed: 3, up: 4, life: 1, size: 0.4, color: i % 2 ? "#ff7a2a" : "#ffd166", grav: -2 });
        notify(L("Hesia erre da!"), "", 2);
      },
    };
    BREAKABLES.push(B);
    return B;
  }
  /* Gauekoren izotza: izotz-bloke gardenak (SUAk urtzen du) */
  let ICE_MAT = null;
  function gaukoIce(id, x, z, w, d, h = 5.5) {
    ICE_MAT ||= new T.MeshStandardMaterial({ color: "#a9dcf5", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.84, emissive: new T.Color("#2f6f9f"), emissiveIntensity: 0.45, flatShading: true });
    const m = new T.Group();
    m.position.set(x, 0, z);
    BP.add(m);
    /* luzetara bloke irregularrak (kristal-itxura), eta oinarrian izotz-geruza */
    const long = Math.max(w, d),
      n = Math.max(1, Math.round(long / 2.4));
    let sd = Math.round(x * 7 + z * 13);
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const seg = long / n,
        bh = h * (0.82 + rnd() * 0.36),
        b = new T.Mesh(new T.BoxGeometry(w > d ? seg * 1.08 : w * (1 + rnd() * 0.3), bh, w > d ? d * (1 + rnd() * 0.3) : seg * 1.08), ICE_MAT);
      const o = -long / 2 + seg * (i + 0.5);
      b.position.set(w > d ? o : (rnd() - 0.5) * 0.3, bh / 2, w > d ? (rnd() - 0.5) * 0.3 : o);
      b.rotation.set((rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.06);
      m.add(b);
      const tip = new T.Mesh(new T.ConeGeometry(Math.min(w, d) * 0.45, 0.9 + rnd() * 1.2, 5), ICE_MAT);
      tip.position.set(b.position.x, bh + 0.35, b.position.z);
      tip.rotation.y = rnd() * 3;
      m.add(tip);
    }
    const frost = new T.Mesh(new T.PlaneGeometry(w + 2.4, d + 2.4), new T.MeshBasicMaterial({ color: "#dff4ff", transparent: true, opacity: 0.35, depthWrite: false }));
    frost.rotation.x = -PI / 2;
    frost.position.y = 0.03;
    m.add(frost);
    const wall = wallBlock(x, z, w, d, 0, 0, h + 2);
    const done = saved.cleared.includes(id);
    m.visible = !done;
    wall.off = done;
    const B = {
      kind: "izotza",
      x,
      y: 0,
      z,
      m,
      r: Math.max(w, d) / 2,
      broken: done,
      buildZone: BP,
      fireOnly: true,
      hint: L("Gauekoren izotza: ez da hausten, ez da ukitzen… SUAk bakarrik urtzen du."),
      solid: { r: 0 },
      hitTest: (bx, by, bz, r) => by < h + 1 && Math.abs(bx - x) < w / 2 + r + 0.3 && Math.abs(bz - z) < d / 2 + r + 0.3,
      custom: () => {
        m.visible = false;
        wall.off = true;
        if (!saved.cleared.includes(id)) saved.cleared.push(id);
        persist();
        SND.sizzle();
        for (let i = 0; i < 6; i++) fxBurst(x + (Math.random() - 0.5) * w, 1 + Math.random() * h, z + (Math.random() - 0.5) * d, { n: 12, speed: 2, up: 3, life: 1.4, size: 0.6, color: "#e6f6ff", grav: -1.5, drag: 1 });
        notify(L("Gauekoren izotza urtu da!"), "", 2);
      },
    };
    BREAKABLES.push(B);
    return B;
  }
  /* hezur erraldoiak (apaingarria) */
  function bigBones(x, z, rot, s = 1) {
    const g = new T.Group(),
      bone = material("#e3d9c2");
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    BP.add(g);
    for (let i = 0; i < 5; i++) {
      const rib = new T.Mesh(new T.TorusGeometry(1.6 - i * 0.12, 0.13, 6, 14, PI), bone);
      rib.position.set(0, 0, -1.6 + i * 0.8);
      g.add(rib);
    }
    const spine = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 4.2, 6), bone);
    spine.rotation.x = PI / 2;
    spine.position.y = 1.5;
    g.add(spine);
    const skull = new T.Mesh(new T.IcosahedronGeometry(0.7, 1), bone);
    skull.position.set(0.4, 0.5, 2.6);
    skull.scale.set(1, 0.8, 1.2);
    g.add(skull);
    g.traverse((n) => n.isMesh && (n.castShadow = true));
    return g;
  }
  /* ardi-hezur txikiak lurrean (instantzia bakarra) */
  function scatterBones(spots) {
    const bone = "#e6dcc6",
      g = mergeColored([
        [at(new T.CylinderGeometry(0.06, 0.06, 0.7, 5), 0, 0.07, 0, 0, 0, PI / 2), bone],
        ...[[0.36, 0.05], [0.36, -0.05], [-0.36, 0.05], [-0.36, -0.05]].map(([bx, bz]) => [at(new T.SphereGeometry(0.09, 6, 4), bx, 0.08, bz), bone]),
        [at(new T.CylinderGeometry(0.05, 0.05, 0.5, 5), 0.1, 0.06, 0.3, 0, 0.8, PI / 2), "#d8ccb2"],
        [at(new T.IcosahedronGeometry(0.17, 0), -0.2, 0.12, -0.3, 0, 0, 0, 1, 0.8, 1.3), "#efe6d2"],
      ]),
      im = new T.InstancedMesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), spots.length);
    spots.forEach(([x, z], i) => {
      HM.compose(HV.set(x, 0, z), HQ.setFromEuler(HE.set(0, x * 1.7 + z * 0.9, 0)), HS);
      im.setMatrixAt(i, HM);
    });
    im.receiveShadow = true;
    BP.add(im);
  }
  /* lasto-pila (ardien ohea, Tartaloren ohea) */
  function straw(x, z, r) {
    const g = new T.Group(),
      cols = ["#c9a64a", "#b8913a", "#d8b85c"];
    g.position.set(x, 0, z);
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.IcosahedronGeometry(r * (0.45 + (i % 3) * 0.12), 0), material(cols[i % 3]));
      m.position.set(Math.cos(i * 2.1) * r * 0.45 * (i ? 1 : 0), 0.05, Math.sin(i * 2.1) * r * 0.45 * (i ? 1 : 0));
      m.scale.y = 0.32;
      m.rotation.y = i;
      m.receiveShadow = true;
      g.add(m);
    }
    BP.add(g);
    return g;
  }
  /* Tartaloren ardiak (instantziak; ibilian) */
  function sheepGeometry() {
    return mergeColored([
      [at(new T.IcosahedronGeometry(0.62, 1), 0, 0.95, 0, 0, 0, 0, 0.9, 0.95, 1.25), "#efe9dc"],
      [at(new T.BoxGeometry(0.42, 0.42, 0.5), 0, 1.12, 0.85), "#2c2a2a"],
      [at(new T.IcosahedronGeometry(0.22, 0), 0, 1.4, 0.78), "#efe9dc"],
      ...[[0.28, 0.45], [-0.28, 0.45], [0.28, -0.45], [-0.28, -0.45]].map(([lx, lz]) => [at(new T.CylinderGeometry(0.07, 0.06, 0.6, 5), lx, 0.3, lz), "#2c2a2a"]),
    ]);
  }
  const HERD = { im: null, list: [] };
  function herd(spots) {
    const im = new T.InstancedMesh(sheepGeometry(), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), spots.length);
    im.castShadow = true;
    im.frustumCulled = false;
    BP.add(im);
    HERD.im = im;
    for (const [i, s] of spots.entries()) HERD.list.push({ ...s, x: s.x0, z: s.z0, a: 0, t: i * 1.3 });
  }
  const HM = new T.Matrix4(),
    HQ = new T.Quaternion(),
    HV = new T.Vector3(),
    HS = new T.Vector3(1, 1, 1),
    HE = new T.Euler();
  function herdUpdate(dt) {
    if (!HERD.im) return;
    for (const [i, s] of HERD.list.entries()) {
      s.t += dt;
      /* bide batetik astiro (joan-etorri), batzuetan larratzen */
      const k = 0.5 + 0.5 * Math.sin(s.t * s.sp + s.ph),
        nx = mix(s.x0, s.x1, k),
        nz = mix(s.z0, s.z1, k);
      if (Math.hypot(nx - s.x, nz - s.z) > 1e-4) s.a = Math.atan2(nx - s.x, nz - s.z);
      s.x = nx;
      s.z = nz;
      HM.compose(HV.set(s.x, Math.abs(Math.sin(s.t * 5)) * 0.04, s.z), HQ.setFromEuler(HE.set(0, s.a, 0)), HS);
      HERD.im.setMatrixAt(i, HM);
    }
    HERD.im.instanceMatrix.needsUpdate = true;
  }

  /* ---------------------------- BEGIAREN GELA (T3) ---------------------------- */
  const EYE = { m: null, iris: null, cone: null, x: 0, y: 0, z: 0, a: 0, t: 0, alert: 0, covers: [], half: 0.21, range: 44, caught: 0, entry: null, n: 40 };
  function eyeBuild(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const crack = new T.Mesh(new T.PlaneGeometry(6.5, 4.2), new T.MeshBasicMaterial({ color: "#050302" }));
    crack.position.z = -0.3;
    g.add(crack);
    const ball = new T.Mesh(new T.SphereGeometry(1.55, 20, 14), material("#f2ead8", 0.15)),
      iris = new T.Mesh(new T.SphereGeometry(0.75, 16, 12), material("#c2410c", 1.2)),
      pupil = new T.Mesh(new T.SphereGeometry(0.38, 12, 10), new T.MeshBasicMaterial({ color: "#120604" }));
    iris.position.z = 1.15;
    iris.scale.z = 0.5;
    pupil.position.z = 1.45;
    pupil.scale.z = 0.4;
    const look = new T.Group();
    look.add(ball, iris, pupil);
    g.add(look);
    for (const s of [-1, 1]) {
      const lid = new T.Mesh(new T.SphereGeometry(1.62, 16, 8, 0, TAU, 0, PI / 2), material("#6b4b38"));
      lid.rotation.x = s < 0 ? 0 : PI;
      lid.scale.y = 0.5;
      lid.position.y = s * 0.85;
      g.add(lid);
    }
    const light = new T.PointLight("#ff8a3a", 1.6, 22, 1.6);
    light.position.set(0, 0, 2.5);
    g.add(light);
    /* begiradaren konoa lurrean (laranja, gardena): izpiak hormetan eta estalgietan mozten dira */
    const n = EYE.n,
      cg = new T.BufferGeometry(),
      idx = [];
    cg.setAttribute("position", new T.Float32BufferAttribute(new Float32Array((n + 2) * 3), 3));
    for (let i = 1; i <= n; i++) idx.push(0, i, i + 1);
    cg.setIndex(idx);
    const cone = new T.Mesh(cg, new T.MeshBasicMaterial({ color: "#ff6a1a", transparent: true, opacity: 0.38, depthWrite: false, side: T.DoubleSide, fog: false }));
    cone.position.set(x, 0.06, z + 0.6);
    cone.frustumCulled = false;
    cone.renderOrder = 3;
    BP.add(cone);
    /* ertza (marra argia): begiradaren muga argi ikusteko */
    const eg = new T.BufferGeometry();
    eg.setAttribute("position", cg.getAttribute("position"));
    const edge = new T.LineLoop(eg, new T.LineBasicMaterial({ color: "#ffd2a0", transparent: true, opacity: 0.9, fog: false }));
    edge.position.set(x, 0.09, z + 0.6);
    edge.frustumCulled = false;
    edge.renderOrder = 4;
    BP.add(edge);
    Object.assign(EYE, { m: g, look, iris, cone, x, y, z });
  }
  /* estalgiak: harriak eta (ibilian) ardiak */
  const EYE_OCC = [];
  function eyeOccluders() {
    EYE_OCC.length = 0;
    for (const c of EYE.covers) EYE_OCC.push(c);
    for (const s of HERD.list) if (s.cover) EYE_OCC.push({ x: s.x, z: s.z, r: 1.05 });
    return EYE_OCC;
  }
  /* izpi bat (jatorria, noranzkoa) noraino iristen da: gelaren hormak eta estalgiak */
  function eyeRay(ox, oz, dx, dz, R) {
    const x0 = R.x - R.w / 2 + 0.8,
      x1 = R.x + R.w / 2 - 0.8,
      z0 = R.z - R.d / 2 + 0.8,
      z1 = R.z + R.d / 2 - 0.8;
    let t = EYE.range;
    if (dx > 1e-6) t = Math.min(t, (x1 - ox) / dx);
    if (dx < -1e-6) t = Math.min(t, (x0 - ox) / dx);
    if (dz > 1e-6) t = Math.min(t, (z1 - oz) / dz);
    if (dz < -1e-6) t = Math.min(t, (z0 - oz) / dz);
    for (const c of EYE_OCC) {
      const cx = c.x - ox,
        cz = c.z - oz,
        b = cx * dx + cz * dz,
        q = b * b - (cx * cx + cz * cz - c.r * c.r);
      if (b <= 0 || q < 0) continue;
      const hit = b - Math.sqrt(q);
      if (hit > 0 && hit < t) t = hit;
    }
    return Math.max(0, t);
  }
  function eyeUpdate(dt) {
    if (!EYE.m) return;
    const R = DGT.rooms.T3;
    EYE.t += dt;
    /* begirada: ezker-eskuin, muturretan gelditzen da */
    EYE.a = clamp(1.3 * Math.sin(EYE.t * 0.42), -0.95, 0.95);
    EYE.look.rotation.y = EYE.a;
    EYE.cone.material.opacity = 0.34 + EYE.alert * 0.4 + Math.sin(time * 3) * 0.04;
    EYE.caught = Math.max(0, EYE.caught - dt);
    /* konoa: izpi bakoitza hormetan edo estalgietan gelditzen da (itzalak agerian) */
    eyeOccluders();
    const ox = EYE.cone.position.x,
      oz = EYE.cone.position.z,
      pa = EYE.cone.geometry.attributes.position;
    for (let i = 0; i <= EYE.n; i++) {
      const a = EYE.a - EYE.half + (2 * EYE.half * i) / EYE.n,
        dx = Math.sin(a),
        dz = Math.cos(a),
        t = eyeRay(ox, oz, dx, dz, R);
      pa.setXYZ(i + 1, dx * t, 0, dz * t);
    }
    pa.needsUpdate = true;
    if (ROOM.cur !== R || cinematic || respawnTimer) {
      EYE.alert = Math.max(0, EYE.alert - dt * 2);
      return;
    }
    /* atean (korridorean) seguru */
    const safe = P.x > R.x + R.w / 2 - 0.8;
    const dx = P.x - ox,
      dz = P.z - oz,
      d = Math.hypot(dx, dz) || 1,
      ang = Math.atan2(dx, dz),
      inCone = Math.abs(Math.atan2(Math.sin(ang - EYE.a), Math.cos(ang - EYE.a))) < EYE.half + 0.03,
      seen = inCone && d < eyeRay(ox, oz, dx / d, dz / d, R) + 0.4;
    if (!safe && seen && P.y < 4) {
      EYE.alert += dt * 3.2;
      if (EYE.alert > 0.55 && EYE.caught <= 0) {
        /* ikusi zaitu: sarrerara bueltan (kalterik gabe) */
        EYE.caught = 2;
        EYE.alert = 0;
        SND.roar();
        shake(0.35);
        shiftFlash = 0.8;
        title("TARTALOK IKUSI ZAITU!", "");
        notify(L("Ezkutatu harrien eta ardien atzean, begirada pasatzen den bitartean."), "", 3.5);
        teleport(EYE.entry.x, EYE.entry.z, 0);
        P.angle = -PI / 2;
        hero.rotation.y = P.angle;
      }
    } else EYE.alert = Math.max(0, EYE.alert - dt * 1.5);
  }

  /* ------------------------------ TARTALOREN KOBA ------------------------------ */
  function buildTartalo() {
    dungeonBegin(DGT);
    const E = (x) => TX + x;
    /* ---- T1: Kobaren ahoa ---- */
    room("T1", E(0), 0, 24, 24, { area: "tA", name: "KOBAREN AHOA", desc: "Ardi-hezurrak nonahi. Bi sutegi itzalita.", doors: { n: 0, s: 0 } });
    slab({ x: E(0), z: 15, y: 0, w: 6, d: 6, h: 1.2, mat: "dark" });
    wallBlock(E(-3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(3.4), 15, 0.8, 6, 0, 0, 7);
    wallBlock(E(0), 18.2, 6, 0.8, 0, 0, 7);
    const arch = obj(new T.PlaneGeometry(5, 5.6), new T.MeshBasicMaterial({ color: "#ffd9b0", transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
    arch.position.set(E(0), 2.8, 17.6);
    DGT.exitGlow = arch;
    DOORDEF.tAn = door("tA-n", E(0), -12, 0, 0, "bars");
    RUNE_SETS.push({
      id: "tA-fire",
      zone: "tartalo",
      kind: "fire",
      time: 9,
      runes: [[E(-7), 1.6, -6, -1], [E(7), 1.6, -6, -1]],
      hint: "Bi sutegi itzalita. Piztu biak SORGINKERIArekin, elkarren segidan!",
      onSolve: () => {
        openDoor(DOORDEF.tAn);
        title("BARRAK IREKI DIRA", "");
      },
    });
    bigBones(E(-7.5), 6.5, 0.6, 0.8);
    for (const [bx, bz] of [[E(8), 8], [E(9), -8]]) breakable("barrel", bx, 0, bz);
    scatterBones([[E(-3.5), 4], [E(4.5), 2.5], [E(-9), -2], [E(9.5), 1.5], [E(2), 9.5], [E(-5.5), 10], [E(6.5), -3.5], [E(-2), -8.5]]);
    bprop("rubble_large", E(-9.5), 0, -9.5, DS * 0.7, 0.5);
    bprop("sack", E(9.6), 0, 9.6, DS * 0.9, 0.3);
    /* ---- T1→T2 ---- */
    corridor(E(0), -18, 6, 12, "z");
    /* ---- T2: Ardi-korta (borroka) ---- */
    room("T2", E(0), -39, 30, 30, {
      area: "tB",
      name: "ARDI-KORTA",
      desc: "Tartaloren artaldea. Hezurrezko artzainak zain.",
      doors: { s: 0, w: 0, n: 0, e: 0 },
      waves: [[["grunt", 0, 3]], [["brute", 1, 1], ["grunt", 1, 2]], [["eye", -1, 2], ["brute", 0, 1]]],
      diff: 1.15,
      hpK: 1.3,
      fightText: "Tartaloren artzainak! Kolore bakoitza bere garaian zauritzen da.",
      onWin: () => {
        openDoor(DOORDEF.tBw);
        notify(L("Mendebaldeko barrak ireki dira."), "", 3);
      },
    });
    DOORDEF.tBw = door("tB-w", E(-15), -39, PI / 2, 0, "bars", "T2");
    DOORDEF.tBn = door("tB-n", E(0), -54, 0, 0, "key");
    DOORDEF.tBn.room = "T2";
    DGT.barricadeE = barricade("tB-hesia", E(15.6), -39, true);
    /* izotzean harrapatutako kutxa: orain ezin da… (SUArekin itzuli) */
    gaukoIce("tB-ice", E(-11.4), -50.4, 3.6, 3.6, 2.9);
    chest("tB-piece", E(-11.4), 0, -50.4, PI / 4, { t: "piece", id: "tartalo" }, { locked: () => !isCleared("tB-ice"), lockedHint: L("Kutxa izotzean harrapatuta dago. Gauekoren izotza… SUAk bakarrik urtzen du.") });
    oreNode(ORE_DEFS.find((d) => d.id === "tartalo"), E(12), 0, -50.5);
    /* bi korta (egurrezko hesiak) eta lastoa */
    for (const sx of [-1, 1]) {
      for (const fz of [-28.8, -32.2]) bprop("fence_wood_straight", E(sx * 11.4), 0, fz, DS * 1.3, PI / 2);
      bprop("fence_wood_straight", E(sx * 9.6), 0, -34.2, DS * 1.3, 0);
      straw(E(sx * 12), -28.6, 1.4);
      bprop("bucket_water", E(sx * 8.6), 0, -27, DS * 0.8, sx);
    }
    straw(E(-4), -49.5, 1.2);
    bprop("sack", E(4.5), 0, -51.6, DS * 0.9, 1.1);
    scatterBones([[E(-6), -36], [E(6.5), -42], [E(-10), -45], [E(11), -33], [E(2), -48]]);
    herd([
      { x0: E(-9), z0: -33, x1: E(-3), z1: -35, sp: 0.25, ph: 0 },
      { x0: E(4), z0: -36, x1: E(9), z1: -33, sp: 0.2, ph: 1 },
      { x0: E(-8), z0: -44, x1: E(-2), z1: -46, sp: 0.22, ph: 2 },
      { x0: E(3), z0: -44, x1: E(9), z1: -45, sp: 0.18, ph: 3 },
      /* T3-ko ardiak: estalgi mugikorra */
      { x0: E(-43), z0: -50.5, x1: E(-30), z1: -50, sp: 0.16, ph: 0.5, cover: true },
      { x0: E(-30.5), z0: -57.2, x1: E(-38), z1: -57.4, sp: 0.15, ph: 2.2, cover: true },
      { x0: E(-40), z0: -40, x1: E(-31), z1: -41.5, sp: 0.18, ph: 4, cover: true },
    ]);
    bigBones(E(10), -27.5, -0.4, 0.6);
    /* ---- T2→T3 ---- */
    corridor(E(-18), -39, 6, 6, "x");
    /* ---- T3: Begiaren gela (ezkutuka) ---- */
    room("T3", E(-33), -45, 24, 42, { area: "tC", name: "BEGIAREN GELA", desc: "Zirrikitu batetik, begi erraldoi batek dena zaintzen du.", doors: { e: 6 }, fog: [8, 70] });
    eyeBuild(E(-33), 3.6, -64.9);
    EYE.entry = { x: E(-18.5), z: -39 };
    for (const [cx, cz, cr] of [[E(-26), -46, 1.6], [E(-37.5), -47.5, 1.8], [E(-29.5), -53, 1.6], [E(-41), -55.5, 1.7], [E(-34), -59.5, 1.5], [E(-25.5), -58.5, 1.6], [E(-42.5), -42.5, 1.5]]) {
      const rk = obj(new T.DodecahedronGeometry(cr, 0), rockMaterial());
      rk.position.set(cx, cr * 0.75, cz);
      rk.scale.y = 1.3;
      rk.rotation.y = cx;
      solids.push({ x: cx, z: cz, r: cr * 0.95, h: 3, y: 0, pillar: true });
      EYE.covers.push({ x: cx, z: cz, r: cr * 0.95 });
    }
    DGT.keyChest = chest("tC-key", E(-42), 0, -62.5, 0, { t: "key" });
    bigBones(E(-26), -63, 2.2, 0.55);
    scatterBones([[E(-30), -44], [E(-38.5), -52], [E(-27), -55], [E(-36), -63.5], [E(-23.5), -49]]);
    /* ---- T2→T4 ---- */
    corridor(E(0), -58.5, 6, 9, "z");
    /* ---- T4: Burruntziaren sutegia (zaindari ertaina) ---- */
    room("T4", E(0), -78, 30, 30, { area: "tD", name: "BURRUNTZIAREN SUTEGIA", desc: "Sutegi zahar bat, oraindik bero. Zerbaitek zaintzen du.", doors: { s: 0, n: 0 } });
    DOORDEF.tDn = door("tD-n", E(0), -93, 0, 0, "boss");
    const hearth = obj(new T.BoxGeometry(5, 2.2, 3), rockMaterial());
    hearth.position.set(E(-9), 1.1, -90.5);
    const coals = obj(new T.BoxGeometry(4, 0.3, 2), material("#ff6a2a", 1.6));
    coals.position.set(E(-9), 2.3, -90.5);
    glow(E(-9), 3, -90.5, "#ff7a2a", 5);
    solids.push({ x: E(-9), z: -90.5, r: 2.4, h: 2.4, y: 0, pillar: true });
    /* kanpaia (tximinia) sutegiaren gainean eta kateak */
    const hood = obj(new T.CylinderGeometry(0.9, 3.4, 2.6, 4, 1, true), material("#2e2620"));
    hood.position.set(E(-9), 4.9, -90.5);
    hood.rotation.y = PI / 4;
    hood.material = hood.material.clone();
    hood.material.side = T.DoubleSide;
    const pipe = obj(new T.BoxGeometry(1.2, 3, 1.2), material("#2e2620"));
    pipe.position.set(E(-9), 7.6, -90.5);
    /* ingudea: oina + gorputza + adarra */
    const anvil = new T.Group(),
      iron = material("#3a3a3a", 0.05);
    anvil.position.set(E(6), 0, -86);
    anvil.rotation.y = 0.3;
    for (const [w, h, d, y] of [[1, 0.5, 0.7, 0.25], [0.6, 0.4, 0.5, 0.7], [1.7, 0.35, 0.75, 1.07]]) {
      const b = new T.Mesh(new T.BoxGeometry(w, h, d), iron);
      b.position.y = y;
      b.castShadow = true;
      anvil.add(b);
    }
    const horn = new T.Mesh(new T.ConeGeometry(0.3, 0.8, 8), iron);
    horn.rotation.z = PI / 2;
    horn.position.set(1.2, 1.07, 0);
    anvil.add(horn);
    BP.add(anvil);
    solids.push({ x: E(6), z: -86, r: 1, h: 1.25, y: 0, pillar: true });
    bprop("weaponrack", E(-14), 0, -80, DS * 0.9, PI / 2);
    bprop("weaponrack", E(14), 0, -75, DS * 0.9, -PI / 2);
    bprop("barrel_large", E(12.5), 0, -91, DS * 0.85, 0.4);
    bprop("bucket_water", E(8.5), 0, -88.5, DS * 0.9, 0);
    bprop("resource_stone", E(-13), 0, -70, DS * 0.8, 0.8);
    bprop("crate_open", E(12.5), 0, -66, DS * 0.8, -0.3);
    for (const cx of [-3, 3]) {
      const ch = obj(new T.CylinderGeometry(0.05, 0.05, 3.2, 4), material("#2a2a2a", 0.05));
      ch.position.set(E(cx), 5.4, -84);
    }
    DGT.fireChest = chest("tD-sugarra", E(0), 0, -70, PI, { t: "item", id: "sugarra" }, { hidden: !isCleared("tD-mini") });
    /* ---- T2→T5 ---- */
    corridor(E(18.6), -39, 7.2, 6, "x");
    /* ---- T5: Izotz-hesia ---- */
    room("T5", E(37.2), -39, 30, 30, { area: "tE", name: "IZOTZ-HESIA", desc: "Gauekoren izotza. Hemen ez da negua iristen… baina izotza bai.", doors: { w: 0, n: 0 }, fog: [6, 46] });
    /* gela osoa zeharkatzen duen izotz-horma (gardena: atzean, barrak eta galdara garaia) */
    gaukoIce("tE-ice", E(30), -39, 1.4, 28.4, 6.5);
    for (let i = 0; i < 9; i++) {
      const sp = obj(new T.ConeGeometry(0.35 + (i % 3) * 0.12, 1.4 + (i % 4) * 0.5, 5), new T.MeshStandardMaterial({ color: "#d6f1ff", roughness: 0.15, transparent: true, opacity: 0.8, emissive: new T.Color("#3d7fb0"), emissiveIntensity: 0.3 }));
      sp.position.set(E(28.4 + (i % 2) * 3.4), 0.6, -51 + i * 3.2);
      sp.rotation.set((i % 2 ? 1 : -1) * 0.25, i, (i % 3) * 0.15);
    }
    DOORDEF.tEn = door("tE-n", E(37.2), -54, 0, 0, "bars");
    const shelf = obj(new T.CylinderGeometry(1.2, 1.5, 5.4, 10), stackMaterial());
    shelf.position.set(E(48), 2.7, -50);
    solids.push({ x: E(48), z: -50, r: 1.5, h: 5.4, y: 0, pillar: true });
    RUNE_SETS.push({
      id: "tE-galdara",
      zone: "tartalo",
      kind: "galdara",
      needFire: true,
      time: 999,
      runes: [[E(48), 7, -50, -1]],
      hint: "Galdara garai bat, eskuz iristezina. Burdinazkoa… SUA behar du (INDARRA kargatu).",
      onSolve: () => {
        openDoor(DOORDEF.tEn);
        title("BARRAK IREKI DIRA", "");
      },
    });
    for (const [cx, cz] of [[E(44), -28], [E(49), -36]]) bigBones(cx, cz, cx, 0.5);
    breakable("barrel", E(50), 0, -27);
    breakable("barrel", E(24.5), 0, -27);
    /* ---- T5→T6 ---- */
    corridor(E(37.2), -58.5, 6, 9, "z");
    /* ---- T6: Galdaren gela ---- */
    room("T6", E(37.2), -78, 30, 30, { area: "tF", name: "GALDAREN GELA", desc: "Lau galdara garaian. Itzalita.", doors: { s: 0 } });
    for (const [px, pz] of [[E(28), -69], [E(46.4), -69], [E(28), -87], [E(46.4), -87]]) {
      const col = obj(new T.CylinderGeometry(1.1, 1.4, 5.2, 10), stackMaterial());
      col.position.set(px, 2.6, pz);
      solids.push({ x: px, z: pz, r: 1.4, h: 5.2, y: 0, pillar: true });
    }
    RUNE_SETS.push({
      id: "tF-galdarak",
      zone: "tartalo",
      kind: "galdara",
      needFire: true,
      time: 13,
      runes: [[E(28), 6.8, -69, -1], [E(46.4), 6.8, -69, -1], [E(28), 6.8, -87, -1], [E(46.4), 6.8, -87, -1]],
      hint: "Lau galdara garai. SUA (INDARRA kargatu) bakoitzari, denak batera piztuta egon arte!",
      onSolve: () => {
        revealChest(DGT.bigChest);
        title("GALDARAK PIZTUTA", "");
      },
    });
    DGT.bigChest = chest("tF-bigkey", E(37.2), 0, -78, 0, { t: "bigkey" }, { hidden: !isCleared("tF-galdarak") });
    /* ---- T4→T7 ---- */
    corridor(E(0), -96, 6, 6, "z");
    /* ---- T7: Tartaloren etxea ---- */
    room("T7", E(0), -117, 36, 36, { area: "tG", name: "TARTALOREN ETXEA", desc: "", doors: { s: 0 } });
    for (const [bx, bz, br] of [[E(-15), -110, 0.5], [E(15.5), -121, 2.4]]) bigBones(bx, bz, br, 0.7);
    /* Tartaloren ohea (lastoa) eta eltze erraldoia */
    straw(E(-4), -131.5, 3.2);
    straw(E(3), -132.2, 2.4);
    const pot = obj(new T.CylinderGeometry(2.3, 1.7, 2.6, 16, 1, true), material("#2a2420", 0.05));
    pot.material = pot.material.clone();
    pot.material.side = T.DoubleSide;
    pot.position.set(E(-15.2), 1.3, -122);
    solids.push({ x: E(-15.2), z: -122, r: 2.2, h: 2.6, y: 0, pillar: true });
    scatterBones([[E(-10), -105], [E(9), -107], [E(-16), -128], [E(16), -112], [E(6), -127], [E(-6), -124], [E(12), -101.5]]);
    DGT.bossRoom = DGT.rooms.T7;
    tartaloBuild();
    dungeonEnd(DGT);
  }
  DGT.update = (dt) => {
    herdUpdate(dt);
    eyeUpdate(dt);
    /* burruntziaren sutegia: sartzean zaindaria */
    const R4 = DGT.rooms.T4;
    if (R4 && !MINI.e && !ROOM.fight && !cinematic && ROOM.cur === R4 && !isCleared("tD-mini") && P.grounded && Math.abs(P.x - R4.x) < R4.w / 2 - 3 && Math.abs(P.z - R4.z) < R4.d / 2 - 3)
      miniBegin(
        R4,
        {
          name: "BURRUNTZI-ZAINA",
          clearId: "tD-mini",
          hp: 32,
          scale: 1.6,
          K: 1.2,
          tint: "#e6b48a",
          add: [["grunt", -1, 2]],
          hint: "Sutegiaren zaindaria! Haren ezkutuak garaia aldatzen du: begiratu begien koloreari.",
          onDead: () => {
            revealChest(DGT.fireChest);
            notify(L("Kutxa bat agertu da sutegiaren erdian."), "", 4);
          },
        },
        R4.x,
        R4.z - 6,
      );
  };

  /* ================================ TARTALO (T7) ================================ */
  const TART = { g: null, root: null, mixer: null, acts: {}, cur: "", x: 0, z: 0, a: 0, state: "sleep", t: 0, hp: 6, rounds: 3, step: 0, n: 0, waves: [], braz: [], eye: null, iris: null, eyeGlow: null, club: null, seenIntro: false, slam: false, sweepHit: false };
  const TART_HP = 6;
  function tartaloBuild() {
    const R = DGT.bossRoom,
      src = models.npc_barbarian;
    TART.x = R.x;
    TART.z = R.z - 8;
    /* lau galdara (SUArekin bakarrik): denak piztuta → argiak itsutzen du */
    for (const [ox, oz] of [[-12.5, -12.5], [12.5, -12.5], [-12.5, 12.5], [12.5, 12.5]]) {
      const x = R.x + ox,
        z = R.z + oz,
        v = runeMesh(x, 1.6, z, "#ff9d4a", "galdara"),
        B = { rune: true, x, y: 2.2, z, r: 1.4, lit: false, t: 0, t0: 13, needFire: true, ...v, live: () => BOSS.on && BOSS.kind === "tartalo" && !B.lit && ["idle", "stomp", "throw", "sweep", "stagger"].includes(TART.state), hit: () => tartBrazier(B) };
      v.ghost.visible = false;
      solids.push({ x, z, r: 1.3, h: 3, y: 0, pillar: true });
      RUNES.push(B);
      TART.braz.push(B);
    }
    if (!src) return;
    const SC = 4.3,
      root = cloneSkinned(src.scene);
    root.scale.setScalar(SC);
    root.traverse((n) => {
      if (!n.isMesh) return;
      if (/Axe|Shield|Mug|Hat|Barbarian_Head/.test(n.name)) n.visible = false;
      const m = n.material.clone();
      m.skinning = !!n.isSkinnedMesh;
      m.color = new T.Color("#9a7458");
      m.emissive = new T.Color("#1d0e06");
      m.emissiveIntensity = 0.5;
      n.material = m;
      n.castShadow = true;
      n.frustumCulled = false;
    });
    /* buru prozedurala: begi bakar handia, bekain lodia, sudur zabala, letaginak */
    const head = root.getObjectByName("head");
    const hg = new T.Group(),
      skin = material("#b98a66"),
      dark = material("#3e2a1c");
    const skull = new T.Mesh(new T.SphereGeometry(0.5, 18, 14), skin);
    skull.scale.set(1.05, 0.95, 0.95);
    skull.position.set(0, 0.42, 0);
    const socket = new T.Mesh(new T.SphereGeometry(0.27, 16, 12), material("#8a6248"));
    socket.position.set(0, 0.52, 0.33);
    socket.scale.set(1, 0.9, 0.6);
    const eye = new T.Mesh(new T.SphereGeometry(0.235, 18, 14), material("#f6efe0", 0.2));
    eye.position.set(0, 0.52, 0.38);
    const iris = new T.Mesh(new T.SphereGeometry(0.13, 14, 10), material("#d9480f", 1.4));
    iris.position.set(0, 0.52, 0.565);
    iris.scale.z = 0.45;
    const pupil = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), new T.MeshBasicMaterial({ color: "#120604" }));
    pupil.position.set(0, 0.52, 0.62);
    pupil.scale.set(0.7, 1.3, 0.5);
    const brow = new T.Mesh(new T.SphereGeometry(0.3, 14, 6), dark);
    brow.scale.set(1.45, 0.3, 0.55);
    brow.position.set(0, 0.79, 0.36);
    brow.rotation.x = 0.35;
    const nose = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), material("#a8765a"));
    nose.scale.set(1.3, 0.8, 0.9);
    nose.position.set(0, 0.3, 0.5);
    const mouth = new T.Mesh(new T.BoxGeometry(0.38, 0.07, 0.08), dark);
    mouth.position.set(0, 0.17, 0.43);
    hg.add(skull, socket, eye, iris, pupil, brow, nose, mouth);
    for (const s of [-1, 1]) {
      const ear = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), skin);
      ear.position.set(s * 0.5, 0.42, 0);
      ear.scale.set(0.6, 1.2, 0.9);
      const tusk = new T.Mesh(new T.ConeGeometry(0.035, 0.14, 6), material("#efe6d2"));
      tusk.position.set(s * 0.12, 0.24, 0.45);
      hg.add(ear, tusk);
    }
    /* ile nahasia: harri-itxurako mototsak */
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU,
        tuft = new T.Mesh(new T.IcosahedronGeometry(0.17 + (i % 3) * 0.04, 0), dark);
      tuft.position.set(Math.sin(a) * 0.36, 0.78 + Math.cos(a * 2) * 0.05, Math.cos(a) * 0.3 - 0.06);
      tuft.rotation.set(i, i * 2, 0);
      hg.add(tuft);
    }
    const eyeGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff8a3a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.25 }));
    eyeGlow.scale.setScalar(0.9);
    eyeGlow.position.copy(iris.position);
    hg.add(eyeGlow);
    hg.traverse((n) => n.isMesh && (n.castShadow = true));
    if (head) head.add(hg);
    /* makila (eskuineko eskuan) */
    const club = new T.Mesh(new T.CylinderGeometry(0.11, 0.05, 1.4, 8), material("#5a3c26"));
    club.position.set(0, 0.5, 0);
    const hand = root.getObjectByName("handslot.r");
    if (hand) hand.add(club);
    const g = new T.Group();
    g.add(root);
    BP.add(g);
    const light = new T.PointLight("#ff9a5a", 1.2, 18, 1.6);
    light.position.set(0, 9, 3);
    g.add(light);
    const mixer = new T.AnimationMixer(root),
      acts = {};
    for (const c of models.mage.animations) acts[c.name] = mixer.clipAction(c);
    if (models.skel_minion) for (const c of models.skel_minion.animations) acts[c.name] = mixer.clipAction(c);
    Object.assign(TART, { g, root, mixer, acts, eye, iris, eyeGlow, light, club });
    g.position.set(TART.x, 0, TART.z);
    tartAnim("Idle");
    if (saved.flags.includes("tartalo")) tartFreed(true);
  }
  function tartAnim(name, once, ts = 1) {
    const a = TART.acts[name];
    if (!a || (TART.cur === name && !once)) return;
    const old = TART.acts[TART.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.timeScale = ts;
    a.fadeIn(0.2).play();
    if (old && old !== a) old.fadeOut(0.2);
    TART.cur = name;
  }
  function tartBrazier(B) {
    B.lit = true;
    B.t = B.t0 = 13 - (3 - TART.rounds) * 2;
    SND.flame();
    fxBurst(B.x, B.y + 0.6, B.z, { n: 22, speed: 3, up: 3, life: 0.8, size: 0.4, color: "#ffb35c", grav: -2 });
    const n = TART.braz.filter((b) => b.lit).length;
    if (n < 4) return notify(L("GALDARA ") + n + " / 4" + L(" · argia! Denak batera…"), "", 2);
    /* denak piztuta: argiak itsutzen du */
    TART.state = "blind";
    TART.t = 0;
    SND.roar();
    shake(0.5);
    title("ITSUTUTA!", "");
    notifyOnce("tart-blind", L("Argiak itsutu du! Begia zabalik: SORGINKERIA!"), "");
    tartAnim("Hit_A", true, 0.6);
  }
  function tartaloStart() {
    if (BOSS.on || saved.flags.includes("tartalo") || !TART.g) return;
    const R = DGT.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "tartalo";
    BOSS.weakR = 1.5;
    Object.assign(TART, { state: "intro", t: 0, hp: TART_HP, rounds: 3, step: 0, x: R.x, z: R.z - 8 });
    const fight = () => {
      TART.state = "idle";
      TART.t = 0;
      title("TARTALO", "");
      SND.roar();
      shake(0.5);
      bossBar("TARTALO", 1);
      notify(L("Ilunpean dena ikusten du… argiak itsutzen du. Lau galdarak: SUA!"), "", 6);
    };
    if (TART.seenIntro) return fight();
    TART.seenIntro = true;
    say(
      [
        ["TARTALO", "Usain berria nire kobazuloan. Ez da ardia. Ez da artzaina… sorgina da!", "", TART.x, TART.z, 7],
        ["AMAIUR", "Tartalo! Itzal bat daramazu begian. Ez zara zu.", "", P.x, P.z, 0],
        ["TARTALO", "BEGI BAKARRA, BAINA ILUNPEAN DENA IKUSTEN DUT. ZURE BIHOTZA ERE BAI. ETORRI HONA!", "", TART.x, TART.z, 7],
      ],
      fight,
    );
  }
  /* itzulitako harkaitza: zorabiatuta, begia une batez agerian */
  function tartStagger() {
    if (!["idle", "stomp", "throw", "sweep"].includes(TART.state)) return;
    TART.state = "stagger";
    TART.t = 0;
    SND.roar();
    shake(0.4);
    fxBurst(TART.x, 6, TART.z, { n: 40, speed: 6, up: 3, life: 0.8, size: 0.4, color: "#ffe2a6", grav: 6 });
    title("ZORABIATUTA!", "");
    tartAnim("Hit_A", true, 0.7);
  }
  function tartWaveMesh() {
    const m = new T.Mesh(new T.TorusGeometry(1, 0.13, 6, 64), new T.MeshBasicMaterial({ color: "#c9a27a", transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -PI / 2;
    ZONES.tartalo.group.add(m);
    return m;
  }
  /* galdarak itzali (zapalketa handia) */
  function tartDouse() {
    for (const B of TART.braz) B.lit = false;
    TART.waves.push({ x: TART.x, z: TART.z, r: 2, sp: 15, m: tartWaveMesh() });
    SND.thud();
    shake(0.5);
  }
  function tartaloUpdateBoss(dt) {
    if (ZONE.cur !== "tartalo" || !TART.g) return;
    TART.mixer.update(dt);
    const R = DGT.bossRoom;
    /* galdaren itxura eta denbora */
    for (const B of TART.braz) {
      if (B.lit && TART.state !== "blind") {
        B.t -= dt;
        if (B.t <= 0) {
          B.lit = false;
          SND.rune(false);
        }
      }
      const on = B.lit || TART.state === "blind";
      runeTimer(B, B.lit && TART.state !== "blind" && TART.state !== "freed" ? Math.max(0.01, B.t / B.t0) : 0);
      B.stone.scale.set(on ? 1 + Math.sin(time * 17 + B.x) * 0.08 : 0.35, on ? 1 + Math.sin(time * 13 + B.z) * 0.15 : 0.25, on ? 1 : 0.35);
      B.stone.material.emissiveIntensity = on ? 2.4 : 0.15;
      B.stone.material.color.set(on ? "#ff7a2a" : "#2a2420");
      B.halo.material.opacity = on ? 0.95 : 0.12;
    }
    if (TART.state === "freed") {
      TART.g.rotation.y += Math.atan2(Math.sin(Math.atan2(P.x - TART.x, P.z - TART.z) - TART.g.rotation.y), Math.cos(Math.atan2(P.x - TART.x, P.z - TART.z) - TART.g.rotation.y)) * Math.min(1, dt * 2);
      return;
    }
    if (TART.state === "sleep") {
      if (ROOM.cur === R && P.grounded && !cinematic && Math.abs(P.z - R.z) < R.d / 2 - 4 && Math.abs(P.x - R.x) < R.w / 2 - 3) tartaloStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    TART.t += dt;
    const dx = P.x - TART.x,
      dz = P.z - TART.z,
      d = Math.hypot(dx, dz) || 1,
      face = Math.atan2(dx, dz),
      rage = 3 - TART.rounds;
    const turn = (k = 3) => (TART.a += Math.atan2(Math.sin(face - TART.a), Math.cos(face - TART.a)) * Math.min(1, dt * k));
    TART.eyeGlow.material.opacity = TART.state === "blind" || TART.state === "stagger" ? 0.9 + Math.sin(time * 10) * 0.1 : 0.3;
    TART.iris.material.emissiveIntensity = TART.state === "blind" ? 2.5 : 1.2;
    /* gorputzaren kontra: bultzatu */
    if (d < 3.2 && P.y < 3) {
      P.vx += (dx / d) * 14 * dt * 8;
      P.vz += (dz / d) * 14 * dt * 8;
    }
    switch (TART.state) {
      case "idle": {
        turn();
        if (d > 6) {
          tartAnim("Walking_A");
          const sp = 2 + rage * 0.45;
          TART.x += (dx / d) * sp * dt;
          TART.z += (dz / d) * sp * dt;
        } else tartAnim("Idle");
        if (TART.t > 1.7 - rage * 0.25) {
          TART.step++;
          const seq = d < 7 ? ["sweep", "stomp", "throw"] : ["throw", "stomp", "throw", "sweep"];
          TART.state = seq[TART.step % seq.length];
          TART.t = 0;
          TART.n = 0;
          TART.slam = false;
          TART.sweepHit = false;
        }
        break;
      }
      case "stomp": {
        turn(1.5);
        const reps = 2 + (rage > 0 ? 1 : 0),
          cyc = 1.1 - rage * 0.1,
          k = Math.floor(TART.t / cyc);
        if (k >= reps) {
          TART.state = "idle";
          TART.t = 0;
          break;
        }
        if (k >= TART.n) {
          TART.n = k + 1;
          tartAnim("2H_Melee_Attack_Chop", true, 1.1);
        }
        const into = TART.t - k * cyc;
        if (into > cyc * 0.55 && !TART.slam) {
          TART.slam = true;
          shake(0.4);
          SND.thud();
          TART.waves.push({ x: TART.x, z: TART.z, r: 2, sp: 12 + rage * 2, m: tartWaveMesh() });
        }
        if (into < cyc * 0.2) TART.slam = false;
        break;
      }
      case "throw": {
        turn(4);
        if (TART.t > 0.5 + TART.n * 0.6 && TART.n < 2 + rage) {
          TART.n++;
          tartAnim("Spellcast_Shoot", true, 1.1);
          const a = face + (TART.n - 1.5) * 0.25,
            sx = TART.x + Math.sin(TART.a) * 2.5,
            sz = TART.z + Math.cos(TART.a) * 2.5,
            sp = clamp(Math.hypot(P.x - sx, P.z - sz) * (0.85 + Math.random() * 0.3), 6, 21);
          const m = new T.Mesh(new T.DodecahedronGeometry(0.9, 0), rockMaterial());
          m.position.set(sx, 6, sz);
          m.castShadow = true;
          scene.add(m);
          SHOTS.push({ m, x: sx, z: sz, y: 6, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, sp, t: 0, era: 2, rock: true, vy: 3.4 });
          SND.shot();
        }
        if (TART.t > 0.6 + (2 + rage) * 0.6 + 0.7) {
          TART.state = "idle";
          TART.t = 0;
        }
        break;
      }
      case "sweep": {
        /* makila: abisua (0.8 s), gero aurrean erdi-zirkulua */
        if (TART.t < 0.8) turn(2.5);
        if (TART.t < 0.05) tartAnim("Spellcast_Raise", true, 1);
        if (TART.t > 0.8 && !TART.sweepHit) {
          TART.sweepHit = true;
          tartAnim("2H_Melee_Attack_Spin", true, 1.4);
          SND.swing(3);
          fxBurst(TART.x + Math.sin(TART.a) * 3, 1, TART.z + Math.cos(TART.a) * 3, { n: 26, speed: 6, life: 0.4, size: 0.35, color: "#c9a27a", grav: 6 });
          const fa = Math.atan2(Math.sin(face - TART.a), Math.cos(face - TART.a));
          if (d < 6.5 && Math.abs(fa) < 1.6 && P.y < 2.5) playerHit(2, TART.x, TART.z);
        }
        if (TART.t > 1.6) {
          TART.state = "idle";
          TART.t = 0;
        }
        break;
      }
      case "stagger": {
        TART.g.position.y = -0.6 * Math.min(1, TART.t * 3);
        if (TART.t > 3.2) {
          TART.state = "idle";
          TART.t = 0;
          TART.g.position.y = 0;
        }
        break;
      }
      case "blind": {
        /* begia estali, gero belauniko begia zabalik */
        TART.g.position.y = -1.3 * Math.min(1, Math.max(0, TART.t - 0.8) * 2);
        if (TART.t > 7.5) {
          TART.g.position.y = 0;
          TART.state = "idle";
          TART.t = 0;
          tartDouse();
          notify(L("Galdarak itzali ditu! Berriro piztu, denak batera."), "", 3);
        }
        break;
      }
      case "roar": {
        TART.g.position.y = 0;
        if (TART.t > 1.6) {
          tartDouse();
          TART.state = "idle";
          TART.t = 0;
        }
        break;
      }
    }
    TART.x = clamp(TART.x, R.x - 11.5, R.x + 11.5);
    TART.z = clamp(TART.z, R.z - 11.5, R.z + 12);
    TART.g.position.x = TART.x;
    TART.g.position.z = TART.z;
    TART.g.rotation.y = TART.a;
    BOSS.lockable.x = TART.x;
    BOSS.lockable.z = TART.z;
    BOSS.lockable.y = 0;
    for (let i = TART.waves.length - 1; i >= 0; i--) {
      const W = TART.waves[i];
      W.r += W.sp * dt;
      W.m.scale.setScalar(W.r);
      W.m.position.set(W.x, 0.15, W.z);
      W.m.material.opacity = clamp(1 - W.r / 26, 0, 0.9);
      const pd = Math.hypot(P.x - W.x, P.z - W.z);
      if (Math.abs(pd - W.r) < 0.7 && P.y < 0.9 && P.dashT <= 0) playerHit(1, W.x, W.z);
      if (W.r > 26) {
        W.m.parent && W.m.parent.remove(W.m);
        TART.waves.splice(i, 1);
      }
    }
  }
  const TV = new T.Vector3();
  BOSSK.tartalo = {
    vulnerable: () => (TART.state === "blind" && TART.t > 1.2) || (TART.state === "stagger" && TART.t > 0.4),
    weak: () => {
      TART.iris.getWorldPosition(TV);
      return { x: TV.x, y: TV.y, z: TV.z };
    },
    center: () => ({ x: TART.x, y: 0, z: TART.z, h: 8, r: 2.8 }),
    stagger: () => tartStagger(),
    hit: (n) => {
      if (!BOSS.vulnerable()) return;
      TART.hp -= n;
      const w = BOSS.weak();
      FB.bossHit(w.x, w.y, w.z);
      damageNumber({ x: w.x, y: w.y, z: w.z, H: 0.4 }, n);
      bossBar("TARTALO", (TART.rounds - 1 + Math.max(0, TART.hp) / TART_HP) / 3);
      if (TART.hp <= 0) {
        TART.rounds--;
        TART.hp = TART_HP;
        if (TART.rounds <= 0) return tartDefeat();
        TART.state = "roar";
        TART.t = 0;
        TART.g.position.y = 0;
        SND.roar();
        shake(0.6);
        slowmo = 0.5;
        tartAnim("Taunt", true, 0.8);
        notify(TART.rounds === 2 ? L("Begia zauritua! Galdarak itzaliko ditu…") : L("Azken aldia! Haserre dago: azkarrago!"), "", 3);
      }
    },
  };
  function tartDefeat() {
    BOSS.dead = true;
    TART.state = "freed";
    for (const W of TART.waves) W.m.parent && W.m.parent.remove(W.m);
    TART.waves.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    TART.g.position.y = 0;
    say(
      [
        ["· · ·", "Begitik itzal bat atera da, kea bezala, eta koba osoa hoztu du une batez.", "", TART.x, TART.z, 6],
        ["TARTALO", "…Argia. Mina. Eta gero… ezer ez. Burua garbi daukat lehen aldiz aspaldian.", "", TART.x, TART.z, 7],
        ["TARTALO", "Gaueko etorri zen gauez. Begi bat eman zidan, berea. Harekin dena ikusten nuen… eta dena gorrotatzen.", "", TART.x, TART.z, 7],
        ["AMAIUR", "Zazpi leize, zazpi zaindari, esan zuen Gauekok. Zuk zer dakizu?", "", P.x, P.z, 0],
        ["TARTALO", "Anbotoko gailurrean, jentilen zeruan, haizeak ez du lorik egiten. Hara joan zen Mariren sua. Han egongo da hurrengo atea.", "", TART.x, TART.z, 7],
      ],
      () => {
        tartFreed();
        saved.hearts = Math.max(saved.hearts, 3);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("tartalo");
        persist();
        itemGet("bihotza", L("TARTALOREN BIHOTZA"), L("Arnasa bat gehiago. Kobako artaldea lasai dago orain."), () => {
          title("TARTALO ASKE", "");
          notify(L("Irten kobatik hegoaldeko arkutik. Herrian, Irati zain."), "", 6);
          hud();
        });
      },
    );
  }
  function tartFreed(instant) {
    BOSS.on = false;
    TART.state = "freed";
    TART.g.position.y = 0;
    for (const B of TART.braz) B.lit = true;
    TART.root.traverse((n) => {
      if (n.isSkinnedMesh && n.material.emissive) {
        n.material.color.set("#b88c68");
        n.material.emissive.set("#000000");
      }
    });
    TART.iris.material.color.set("#7fbf6a");
    TART.eyeGlow.material.color.set("#9dffc4");
    TART.light.color.set("#ffd9a0");
    tartAnim("Idle");
    if (!instant) fxRing(TART.x, 0.2, TART.z, "#9dffc4", 16, 1.4);
  }
  /* bossUpdate eta bossReset-etik */
  function tartaloUpdate(dt) {
    tartaloUpdateBoss(dt);
  }
  function tartaloReset() {
    if (BOSS.on && BOSS.kind === "tartalo" && !BOSS.dead) {
      BOSS.on = false;
      for (const W of TART.waves) W.m.parent && W.m.parent.remove(W.m);
      TART.waves.length = 0;
      for (const B of TART.braz) B.lit = false;
      const R = DGT.bossRoom;
      Object.assign(TART, { state: "sleep", t: 0, x: R.x, z: R.z - 8, a: 0 });
      if (TART.g) {
        TART.g.position.set(TART.x, 0, TART.z);
        TART.g.rotation.y = 0;
      }
      tartAnim("Idle");
      bossBar(null);
    }
  }
  /* leizeko helburuak (HUD + markatzailea) */
  DGT.objective = () => {
    const R = DGT.rooms,
      f = (k) => saved.flags.includes(k);
    if (!isCleared("tA-fire")) return ["Piztu bi sutegiak SORGINKERIArekin, elkarren segidan.", [R.T1.x, -6, 0]];
    if (!isCleared("T2")) return ["Ardi-korta: Tartaloren artzainak.", [R.T2.x, R.T2.z, 0]];
    if (!saved.doors.includes("tB-n") && !(saved.keyz.tartalo > 0)) return ROOM.cur === R.T3 ? ["Ezkutatu harrien eta ardien atzean. Giltza: iparraldeko izkinan.", [R.T3.x - 9, -62.5, 0]] : ["Mendebaldean, begiaren gela.", [R.T3.x + 8, -39, 0]];
    if (!saved.doors.includes("tB-n")) return ["Ardi-kortako iparreko atea: giltza txikia.", [R.T2.x, -51, 0]];
    if (!isCleared("tD-mini")) return ["Burruntziaren sutegia. Zaindaria esnatuko da.", [R.T4.x, R.T4.z, 0]];
    if (!saved.items.includes("sugarra")) return ["Kutxa ireki: sutegiaren erdian.", [R.T4.x, -70, 0]];
    if (!saved.items.includes(DGT.bigKey)) {
      if (!isCleared("tB-hesia")) return ["Ardi-kortako ekialdeko hesia: SUA (INDARRA kargatu).", [R.T2.x + 12, -39, 0]];
      if (!isCleared("tE-ice")) return ["Gauekoren izotz-horma: SUAk urtzen du.", [R.T5.x - 7.2, -39, 0]];
      if (!isCleared("tE-galdara")) return ["Galdara garaia: SUA (INDARRA kargatu) urrutitik.", [R.T5.x + 10.8, -50, 7]];
      return ["Galdaren gela: lauak SUArekin, denak batera.", [R.T6.x, R.T6.z, 0]];
    }
    if (!f("tartalo")) return saved.doors.includes("tD-n") ? ["Tartalo. Ilunpean dena ikusten du… argiak itsutzen du.", [R.T7.x, R.T7.z + 10, 0]] : ["Sutegiko iparreko ate handia: giltza nagusia.", [R.T4.x, -90, 0]];
    return ["Irten kobatik hegoaldeko arkutik.", [DGT.exitArch.x, DGT.exitArch.z, 0]];
  };
