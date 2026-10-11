  /* ==================================================================
     KAIOLAK ETA ERRONKAK · uharte bakoitza Gauekoren kaiola da
     · Ertzetik ezin da erori: horma ikusezina (irteteko norabidean soilik).
     · Ateak zubien parean. Uhartearen erronka (borroka edo eraikuntza)
       gainditu arte, irteerak itxita daude; borrokan kaiola osoa altxatzen da.
     · Zubitik erortzean, azken lur seguruan berragertzen zara (bizitza bat).
     ================================================================== */
  const CAGE_K = 0.93;
  /* [uhartea, zubiaren puntua (x, z), mota] — "in": sarrera (beti irekita), bestela irteera */
  const GATE_DEFS = [
    [0, 0, -0.8, "exit"], [0, 19, 29, "side"],
    [1, 0, -7, "in"], [1, 12, -37, "exit"], [1, -16.5, -19.5, "side"], [1, -13, -38.5, "side"],
    [2, 20, -44, "in"], [2, 20, -72, "exit"], [2, 44, -51, "side"],
    [3, 4, -83, "in"], [3, -14, -111, "exit"], [3, 16, -105.5, "side"], [3, 9, -118, "side"],
    [4, -22, -118, "in"], [4, -19, -145, "exit"], [4, -45, -125, "side"], [4, -47.5, -136, "side"],
    [5, -10, -153, "in"],
  ];
  /* uharte bakoitzaren erronka */
  const TRIALS = ["fight", "craft", "fight", "craft", "fight", "boss"];
  const CAGES = [];
  const SAFE = { x: 0, y: 0, z: 29, phase: 1, t: 0 };
  const angDiff = (a, b) => {
    const d = Math.abs(a - b) % TAU;
    return d > PI ? TAU - d : d;
  };
  const isCleared = (i) => saved.cleared.includes(i);
  function buildCages() {
    saved.cleared = Array.isArray(saved.cleared) ? saved.cleared.filter((n) => n >= 0 && n < 6) : [];
    if (saved.ending || saved.bossDone) for (let i = 0; i < 6; i++) if (!saved.cleared.includes(i)) saved.cleared.push(i);
    const postGeo = new T.CylinderGeometry(0.1, 0.13, 1, 7);
    postGeo.translate(0, 0.5, 0);
    const posts = [];
    for (const [i, I] of ISLANDS.entries()) {
      const C = { i, x: I.x, z: I.z, y: I.y, rx: I.rx, rz: I.rz, k: CAGE_K, gates: [], lock: 0, lockT: 0, h: 1.15, posts: [], segs: [] };
      for (const [gi, gx, gz, kind] of GATE_DEFS)
        if (gi === i) {
          const a = Math.atan2((gz - I.z) / I.rz, (gx - I.x) / I.rx),
            R = Math.hypot(I.rx * Math.cos(a), I.rz * Math.sin(a));
          C.gates.push({ a, w: (kind === "side" ? 2.9 : 3.5) / R, kind, open: kind === "in" || isCleared(i), seal: null, orbs: [] });
        }
      /* zutoinak elipsean, ateetan hutsune */
      const per = PI * (3 * (I.rx + I.rz) - Math.sqrt((3 * I.rx + I.rz) * (I.rx + 3 * I.rz))),
        n = Math.round(per / 2.1);
      let arc = [];
      const flush = () => {
        if (arc.length > 1) C.segs.push(arc);
        arc = [];
      };
      for (let j = 0; j <= n; j++) {
        const a = (j / n) * TAU - PI;
        if (C.gates.some((g) => angDiff(a, g.a) < g.w)) {
          flush();
          continue;
        }
        const p = new T.Vector3(I.x + Math.cos(a) * I.rx * C.k, I.y, I.z + Math.sin(a) * I.rz * C.k);
        arc.push(p);
        if (j < n) {
          C.posts.push(posts.length);
          posts.push(p);
        }
      }
      flush();
      /* lehen eta azken arkuak lotu (-π/π josturan atea ez badago) */
      if (C.segs.length > 1 && C.segs[0][0].distanceTo(C.segs[C.segs.length - 1].slice(-1)[0]) < 2.5) {
        const last = C.segs.pop();
        C.segs[0] = last.concat(C.segs[0]);
      }
      CAGES.push(C);
    }
    /* zutoinak: InstancedMesh bakarra (harria; gaina argituta) */
    const postMat = new T.MeshStandardMaterial({ color: "#3d4650", roughness: 0.55, metalness: 0.35, emissive: new T.Color("#000000") });
    CAGE.posts = new T.InstancedMesh(postGeo, postMat, posts.length);
    CAGE.posts.castShadow = true;
    CAGE.postPos = posts;
    scene.add(CAGE.posts);
    CAGE.caps = new T.InstancedMesh(new T.IcosahedronGeometry(0.17, 0), new T.MeshBasicMaterial({ color: "#ffd99a" }), posts.length);
    scene.add(CAGE.caps);
    /* argi-soka (barandila) eta kaiola-gortina, arku bakoitzeko */
    CAGE.ropeMat = new T.MeshBasicMaterial({ color: "#ffd99a", transparent: true, opacity: 0.75 });
    CAGE.curtainMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new T.Color("#b05cff") } },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform float uT,uA;uniform vec3 uC;varying vec2 vUv;void main(){float l=pow(abs(sin(vUv.x*180.)),24.)*.55+.18;float s=.5+.5*sin(vUv.y*40.-uT*6.+vUv.x*30.);float a=(l+s*.25)*(1.-vUv.y)*(.35+.65*smoothstep(0.,.08,vUv.y))*uA;gl_FragColor=vec4(uC,a);}",
    });
    for (const C of CAGES) {
      C.ropes = [];
      C.curtains = [];
      for (const arc of C.segs) {
        const curve = new T.CatmullRomCurve3(arc.map((p) => p.clone().setY(C.y + C.h)));
        const rope = new T.Mesh(new T.TubeGeometry(curve, Math.max(8, arc.length * 4), 0.035, 5, false), CAGE.ropeMat);
        scene.add(rope);
        C.ropes.push(rope);
        C.curtains.push(curtainStrip(arc, C.y, 4.2));
      }
      for (const g of C.gates) {
        /* ate-zutabeak eta zigilua (irteera itxita dagoenean) */
        for (const s of [-1, 1]) {
          const a = g.a + s * g.w,
            x = C.x + Math.cos(a) * C.rx * C.k,
            z = C.z + Math.sin(a) * C.rz * C.k;
          box(x, C.y + 1.3, z, 0.42, 2.6, 0.42, "#59626b");
          const o = orb(x, C.y + 2.75, z, 0.2, g.open ? "#9dffc4" : "#ff7a6b");
          o.castShadow = false;
          g.orbs.push(o);
        }
        const p0 = new T.Vector3(C.x + Math.cos(g.a - g.w) * C.rx * C.k, C.y, C.z + Math.sin(g.a - g.w) * C.rz * C.k),
          p1 = new T.Vector3(C.x + Math.cos(g.a + g.w) * C.rx * C.k, C.y, C.z + Math.sin(g.a + g.w) * C.rz * C.k);
        g.seal = curtainStrip([p0, p1], C.y, 2.7, true);
        g.seal.visible = !g.open;
      }
    }
    cageVisual(0);
  }
  const CAGE = { posts: null, caps: null, postPos: [], ropeMat: null, curtainMat: null };
  function curtainStrip(pts, y, h, own) {
    const pos = [],
      uv = [],
      idx = [];
    let len = 0;
    pts.forEach((p, i) => {
      if (i) len += p.distanceTo(pts[i - 1]);
      pos.push(p.x, y, p.z, p.x, y + h, p.z);
      uv.push(len / 40, 0, len / 40, 1);
      if (i) {
        const a = (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const mat = own ? CAGE.curtainMat.clone() : CAGE.curtainMat;
    if (own) mat.uniforms.uA.value = 0.9;
    const m = new T.Mesh(g, mat);
    m.renderOrder = 4;
    m.frustumCulled = false;
    scene.add(m);
    return m;
  }
  /* kaiolaren itxura: zutoinen altuera (barandila → barrak) eta koloreak */
  function cageVisual(dt) {
    if (!CAGE.posts) return;
    const mt = new T.Matrix4(),
      q = new T.Quaternion(),
      sc = new T.Vector3(),
      p = new T.Vector3();
    let curtainA = 0;
    for (const C of CAGES) {
      const target = C.lock ? 1 : 0;
      C.lockT = clamp(C.lockT + (target ? dt * 2.4 : -dt * 1.6), 0, 1);
      const k = C.lockT * C.lockT * (3 - 2 * C.lockT);
      C.h = mix(1.15, 4.4, k);
      curtainA = Math.max(curtainA, k);
      for (const r of C.ropes) {
        r.visible = k < 0.98;
        r.position.y = (C.h - 1.15) * 0.5;
      }
      for (const cu of C.curtains) cu.visible = k > 0.02;
      for (const id of C.posts) {
        const b = CAGE.postPos[id];
        sc.set(1 + k * 0.4, C.h, 1 + k * 0.4);
        mt.compose(p.set(b.x, b.y, b.z), q, sc);
        CAGE.posts.setMatrixAt(id, mt);
        sc.setScalar(1 + k * 0.5);
        mt.compose(p.set(b.x, b.y + C.h + 0.08, b.z), q, sc);
        CAGE.caps.setMatrixAt(id, mt);
      }
      for (const g of C.gates) {
        const open = g.open && !C.lock;
        g.seal.visible = !open;
        g.seal.material.uniforms.uT.value = time;
        for (const o of g.orbs) o.material = material(open ? "#9dffc4" : "#ff7a6b", 1.2);
      }
    }
    CAGE.posts.instanceMatrix.needsUpdate = CAGE.caps.instanceMatrix.needsUpdate = true;
    CAGE.curtainMat.uniforms.uA.value = curtainA;
    CAGE.curtainMat.uniforms.uT.value = time;
    CAGE.caps.material.color.set(curtainA > 0.5 ? "#c58bff" : phaseBlend > 0.5 ? "#bdf3ff" : "#ffd99a");
    CAGE.ropeMat.color.copy(CAGE.caps.material.color);
    CAGE.posts.material.emissive.set(curtainA > 0.5 ? "#2a0f3d" : "#000000");
  }
  /* horma: barrutik kanpora ez (ate irekietan izan ezik); kanpotik barrura beti bai */
  function cageCollide(px, pz, nx, nz, py) {
    for (const C of CAGES) {
      if (py < C.y - 1.2 || py > C.y + 40) continue;
      const e0 = Math.hypot((px - C.x) / C.rx, (pz - C.z) / C.rz);
      if (e0 > C.k + 0.015) continue;
      const fx = (nx - C.x) / C.rx,
        fz = (nz - C.z) / C.rz;
      if (Math.hypot(fx, fz) <= C.k) continue;
      const a = Math.atan2(fz, fx);
      if (!C.lock && C.gates.some((g) => g.open && angDiff(a, g.a) < g.w * 0.92)) continue;
      nx = C.x + Math.cos(a) * C.rx * C.k * 0.999;
      nz = C.z + Math.sin(a) * C.rz * C.k * 0.999;
      P.wallGrace = 0;
    }
    return [nx, nz];
  }
  function setGates(i, open) {
    const C = CAGES[i];
    if (!C) return;
    for (const g of C.gates) if (g.kind !== "in") g.open = open;
  }
  /* azken lur segurua: uharteak, uhartetxoak eta bi garaietako plataformak */
  function trackSafe(dt) {
    SAFE.t += dt;
    if (SAFE.t < 0.2 || !P.grounded || !P.platform) return;
    const s = P.platform;
    if (s.phase !== -1 || s.moving || s.wave || s.piece) return;
    if (s.island === undefined && s.islet === undefined) return;
    SAFE.t = 0;
    Object.assign(SAFE, { x: P.x, y: P.y, z: P.z, phase });
  }
  /* zubitik erortzean: denbora atzera, azken lur segurura (bizitza bat kostatzen du) */
  function softRespawn() {
    ascent = null;
    P.hp -= 1;
    if (P.hp <= 0) return returnCheckpoint();
    if (phase !== SAFE.phase) {
      phase = SAFE.phase;
      setPhaseVisual();
    }
    teleport(SAFE.x, SAFE.z, SAFE.y);
    damageTime = 1.1;
    shiftFlash = 0.8;
    FB.respawn();
    haptic(30);
    notify("Denbora atzera. Saiatu berriro.", "El tiempo retrocede. Inténtalo otra vez.", 1.8);
  }
  function haptic(ms) {
    try {
      if (mobile && navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  /* ==================================================================
     ERRONKEN KUDEATZAILEA · borroka-arenak eta eraikuntza-uharteak
     ================================================================== */
  /* olatuak: [mota, garaia (-1 biak, 0 iragana, 1 oraina), kopurua] */
  const WAVES = {
    0: [
      [["grunt", -1, 2]],
      [["grunt", -1, 3]],
    ],
    2: [
      [["grunt", 0, 2], ["grunt", 1, 2]],
      [["grunt", -1, 2], ["eye", 0, 1], ["eye", 1, 1]],
      [["brute", 1, 1], ["grunt", 0, 2]],
    ],
    4: [
      [["eye", 0, 2], ["grunt", 1, 2]],
      [["brute", 0, 1], ["brute", 1, 1], ["eye", -1, 1]],
      [["grunt", 0, 2], ["grunt", 1, 1], ["eye", 1, 2], ["brute", -1, 1]],
    ],
  };
  const ARENA = { island: -1, wave: -1, state: "idle", t: 0, announced: new Set() };
  function arenaUpdate(dt) {
    const i = currentStage;
    for (const C of CAGES) C.lock = ARENA.state === "fight" && C.i === ARENA.island ? 1 : boss.state !== "sleep" && boss.state !== "done" && C.i === 5 && saved.stage === 5 && !saved.ending ? 1 : 0;
    if (ARENA.state === "fight") {
      ARENA.t += dt;
      if (enemiesAlive() === 0 && ARENA.t > 0.8) {
        const W = WAVES[ARENA.island];
        if (ARENA.wave + 1 < W.length) {
          ARENA.wave++;
          ARENA.t = -1.1;
          ARENA.pending = true;
        } else return arenaWin();
      }
      if (ARENA.pending && ARENA.t >= 0) {
        ARENA.pending = false;
        spawnWave(WAVES[ARENA.island][ARENA.wave]);
        if (ARENA.wave > 0) notify(L("Beste olatu bat!", "¡Otra oleada!"), L("Beste olatu bat!", "¡Otra oleada!"), 1.6);
      }
      return;
    }
    if (i < 0 || i > 4 || isCleared(i) || cinematic) return;
    if (TRIALS[i] === "fight" && P.grounded && P.platform?.island === i) {
      const I = ISLANDS[i],
        e = Math.hypot((P.x - I.x) / I.rx, (P.z - I.z) / I.rz);
      if (e < 0.72 || ARENA.island === i) arenaStart(i);
    }
  }
  function arenaStart(i) {
    Object.assign(ARENA, { island: i, wave: 0, state: "fight", t: -1.4, pending: true });
    clearEnemies();
    SND.stinger(false);
    shake(0.25);
    haptic(40);
    title("ITZALAK!", "¡SOMBRAS!");
    if (!ARENA.announced.has(i)) {
      ARENA.announced.add(i);
      notify(
        i === 0 ? "Kaiola itxi da. Garaitu itzalak!" : "Gauekoren itzalak. Kolore bakoitza bere garaian zauritzen da.",
        i === 0 ? "La jaula se ha cerrado. ¡Derrota a las sombras!" : "Sombras de Gaueko. Cada color solo se hiere en su época.",
        4,
      );
    }
  }
  function arenaWin() {
    const i = ARENA.island;
    ARENA.state = "idle";
    ARENA.island = -1;
    islandDone(i, true);
  }
  /* uhartearen erronka gaindituta: ateak ireki, saria */
  function islandDone(i, fight) {
    if (!saved.cleared.includes(i)) saved.cleared.push(i);
    setGates(i, true);
    P.hp = P.maxHp;
    persist();
    SND.stinger(true);
    haptic(60);
    fxRing(P.x, P.y + 0.2, P.z, "#9dffc4", 10, 1.2);
    title(fight ? "UHARTEA ASKATUTA" : "ATEA IREKI DA", fight ? "ISLA LIBERADA" : "LA PUERTA SE HA ABIERTO");
    notify(
      "Irteera irekita dago. Jarraitu urrezko markari.",
      "La salida está abierta. Sigue la marca dorada.",
      4,
    );
    if (fight && i > 0) setTimeout(() => offerBoon(i), 1600);
    hud();
  }
  function arenaReset() {
    if (ARENA.state === "fight") {
      ARENA.wave = 0;
      ARENA.t = -1.6;
      ARENA.pending = true;
      clearEnemies();
    }
  }
