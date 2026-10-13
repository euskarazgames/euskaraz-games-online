  /* ==================================================================
     HARANAREN BIZITZA · animaliak, kea, txinpartak, haizea eta giro-hotsak
     · Oiloak eta behiak: geometria bakarra (erpin-koloreekin) eta instantziak
       (marrazketa-dei bakarra espezie bakoitzeko).
     · Iraganean (uda): tximeletak, ipurtargiak basoan, arrainak ibaian.
       Orainean (negua): ke gehiago tximinietan, izotzaren karrankak, beleak.
     · Zuhaitzak eta banderak haizean; errementariaren txinpartak eta mailu-hotsak.
     ================================================================== */
  const LIFE = { hens: [], cows: [], henIM: null, cowIM: null, flies: null, bugs: [], bugIM: null, fish: null, smoke: [], chimneys: [], t: 0, next: {} };
  /* geometria batzuk bakarrean (erpin-koloreekin) */
  function mergeColored(parts) {
    let n = 0;
    const flat = parts.map(([g, col]) => {
      const ng = g.index ? g.toNonIndexed() : g;
      n += ng.attributes.position.count;
      return [ng, new T.Color(col).convertSRGBToLinear()];
    });
    const pos = new Float32Array(n * 3),
      nor = new Float32Array(n * 3),
      colA = new Float32Array(n * 3);
    let o = 0;
    for (const [g, c] of flat) {
      g.computeVertexNormals();
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      for (let i = 0; i < g.attributes.position.count; i++) colA.set([c.r, c.g, c.b], (o + i) * 3);
      o += g.attributes.position.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.BufferAttribute(nor, 3));
    geo.setAttribute("color", new T.BufferAttribute(colA, 3));
    return geo;
  }
  const at = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    g.scale(sx, sy, sz);
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    return g;
  };
  function henGeometry() {
    return mergeColored([
      [at(new T.IcosahedronGeometry(0.22, 1), 0, 0.36, 0, 0, 0, 0, 1, 0.9, 1.3), "#f4eee2"],
      [at(new T.ConeGeometry(0.12, 0.26, 6), 0, 0.46, -0.27, -0.9), "#e9e1d0"],
      [at(new T.IcosahedronGeometry(0.11, 1), 0, 0.6, 0.22), "#f4eee2"],
      [at(new T.ConeGeometry(0.035, 0.1, 5), 0, 0.6, 0.35, PI / 2), "#e8a53a"],
      [at(new T.BoxGeometry(0.03, 0.08, 0.12), 0, 0.72, 0.21), "#d23c2c"],
      [at(new T.CylinderGeometry(0.018, 0.018, 0.22, 4), 0.07, 0.11, 0), "#e8a53a"],
      [at(new T.CylinderGeometry(0.018, 0.018, 0.22, 4), -0.07, 0.11, 0), "#e8a53a"],
    ]);
  }
  function cowGeometry() {
    return mergeColored([
      [at(new T.BoxGeometry(0.9, 0.8, 1.7), 0, 1.1, 0), "#f1ece4"],
      [at(new T.BoxGeometry(0.92, 0.5, 0.6), 0, 1.25, 0.25), "#3a2c26"],
      [at(new T.BoxGeometry(0.55, 0.55, 0.62), 0, 1.25, 1.05), "#f1ece4"],
      [at(new T.BoxGeometry(0.45, 0.3, 0.2), 0, 1.08, 1.4), "#e9b7a7"],
      [at(new T.ConeGeometry(0.06, 0.25, 5), 0.22, 1.6, 1.0, 0, 0, -0.7), "#e8e0cc"],
      [at(new T.ConeGeometry(0.06, 0.25, 5), -0.22, 1.6, 1.0, 0, 0, 0.7), "#e8e0cc"],
      ...[[0.3, 0.6], [-0.3, 0.6], [0.3, -0.6], [-0.3, -0.6]].map(([lx, lz]) => [at(new T.BoxGeometry(0.18, 0.75, 0.18), lx, 0.37, lz), "#3a2c26"]),
      [at(new T.CylinderGeometry(0.03, 0.03, 0.7, 4), 0, 1.1, -0.95, 0.4), "#3a2c26"],
    ]);
  }
  function lifeInit() {
    zoneBuild("ibarra");
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    /* oiloak herrian */
    const henHomes = [[-6, 30], [12, 45], [-15, 47], [21, 33], [-24, 26], [6, 52], [-3, 41], [16, 26]];
    LIFE.henIM = new T.InstancedMesh(henGeometry(), mat, henHomes.length);
    LIFE.henIM.castShadow = true;
    LIFE.henIM.frustumCulled = false;
    BP.add(LIFE.henIM);
    for (const [i, [hx, hz]] of henHomes.entries()) LIFE.hens.push({ hx, hz, x: hx, z: hz, a: i * 1.7, tx: hx, tz: hz, t: i * 0.7, peck: 0, run: 0 });
    /* behiak ipar-larreetan */
    const cowSpots = [[22, -100], [30, -92], [16, -94], [34, -104]];
    LIFE.cowIM = new T.InstancedMesh(cowGeometry(), mat, cowSpots.length);
    LIFE.cowIM.castShadow = true;
    LIFE.cowIM.frustumCulled = false;
    BP.add(LIFE.cowIM);
    for (const [i, [cx, cz]] of cowSpots.entries()) LIFE.cows.push({ hx: cx, hz: cz, x: cx, z: cz, a: i * 2.1, tx: cx, tz: cz, t: i * 2.3, graze: 0 });
    /* tximeletak (iraganean): bi hegal, instantziak kolorearekin */
    const wing = new T.BufferGeometry();
    wing.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, 0.16, 0, 0.1, 0.14, 0, -0.1, 0, 0, 0, -0.14, 0, -0.1, -0.16, 0, 0.1], 3));
    wing.computeVertexNormals();
    LIFE.bugIM = new T.InstancedMesh(wing, new T.MeshBasicMaterial({ side: T.DoubleSide }), 18);
    LIFE.bugIM.frustumCulled = false;
    BP.add(LIFE.bugIM);
    const bugCols = ["#ffd166", "#f7f0e0", "#ff9f6e", "#9fd8ff", "#c9a8ff"];
    for (let i = 0; i < 18; i++) {
      const home = [[-50, 2], [-12, 33], [8, 40], [44, -2], [-30, -2], [20, -60]][i % 6];
      LIFE.bugs.push({ hx: home[0] + (i % 3) * 2, hz: home[1] + (i % 2) * 3, ph: i * 1.37, sp: 0.6 + (i % 4) * 0.15 });
      LIFE.bugIM.setColorAt(i, new T.Color(bugCols[i % bugCols.length]));
    }
    /* ipurtargiak basoan (iraganean, ilunabarrean) */
    const N = 46,
      pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = (i * 2.399) % TAU,
        r = 6 + ((i * 7.31) % 30);
      pos.set([-6 + Math.cos(a) * r, 6 + (i % 5) * 0.5, -112 + Math.sin(a) * r * 0.7], i * 3);
    }
    const fg = new T.BufferGeometry();
    fg.setAttribute("position", new T.BufferAttribute(pos, 3));
    LIFE.flies = new T.Points(fg, new T.PointsMaterial({ color: "#d9ff8a", size: 0.35, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, map: glowTexture }));
    LIFE.flies.userData.base = pos.slice();
    BP.add(LIFE.flies);
    /* arraina (iraganean ibaitik jauzi) */
    LIFE.fish = new T.Mesh(at(new T.ConeGeometry(0.16, 0.7, 6), 0, 0, 0, PI / 2), material("#9fb6c8", 0.1));
    LIFE.fish.visible = false;
    BP.add(LIFE.fish);
    LIFE.fishT = -1;
    /* tximiniak: etxe bakoitzaren goiko puntua (teilatuaren gailurra ez bada, tximinia) */
    for (const H of HOUSES) {
      H.m.updateMatrixWorld(true);
      let best = null;
      const v = new T.Vector3();
      H.m.traverse((n) => {
        if (!n.isMesh) return;
        const a = n.geometry.attributes.position,
          arr = a.array,
          f = !a.normalized ? 1 : arr instanceof Int16Array ? 1 / 32767 : arr instanceof Uint16Array ? 1 / 65535 : arr instanceof Int8Array ? 1 / 127 : arr instanceof Uint8Array ? 1 / 255 : 1;
        for (let i = 0; i < a.count; i += 3) {
          v.set(a.getX(i) * f, a.getY(i) * f, a.getZ(i) * f).applyMatrix4(n.matrixWorld);
          if (!best || v.y > best.y) best = v.clone();
        }
      });
      if (best && Math.hypot(best.x - H.x, best.z - H.z) > 0.8) LIFE.chimneys.push({ x: best.x, y: best.y + 0.2, z: best.z, forge: !!H.forge, t: Math.random() * 2 });
    }
    for (let i = 0; i < 36; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#c9ccce", transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false;
      BP.add(s);
      LIFE.smoke.push({ s, t: 9, life: 1 });
    }
    BP = null;
  }
  const LM = new T.Matrix4(),
    LQ = new T.Quaternion(),
    LE = new T.Euler(),
    LV = new T.Vector3(),
    LS = new T.Vector3();
  function lifeUpdate(dt) {
    LIFE.t += dt;
    const past = 1 - phaseBlend,
      near = (x, z, r) => Math.abs(P.x - x) < r && Math.abs(P.z - z) < r;
    /* oiloak: ibili, mokoka, eta Amaiur hurbil → ihes */
    if (LIFE.henIM && near(0, 38, 90)) {
      for (const [i, h] of LIFE.hens.entries()) {
        h.t -= dt;
        const dp = Math.hypot(P.x - h.x, P.z - h.z);
        if (dp < 2.4) {
          h.run = 0.8;
          h.tx = h.x + ((h.x - P.x) / (dp || 1)) * 4;
          h.tz = h.z + ((h.z - P.z) / (dp || 1)) * 4;
          if (!h.cluck && Math.random() < 0.3) SND.cluck();
          h.cluck = true;
        } else h.cluck = false;
        if (h.t <= 0) {
          h.t = 1.5 + Math.random() * 3;
          h.peck = Math.random() < 0.5 ? 1.2 : 0;
          const a = Math.random() * TAU,
            r = Math.random() * 4;
          h.tx = h.hx + Math.cos(a) * r;
          h.tz = h.hz + Math.sin(a) * r;
        }
        h.run = Math.max(0, h.run - dt);
        h.peck = Math.max(0, h.peck - dt);
        const dx = h.tx - h.x,
          dz = h.tz - h.z,
          d = Math.hypot(dx, dz);
        if (d > 0.15 && h.peck <= 0) {
          const sp = h.run > 0 ? 4.2 : 1.1;
          h.x += (dx / d) * Math.min(d, sp * dt);
          h.z += (dz / d) * Math.min(d, sp * dt);
          h.a = Math.atan2(dx, dz);
        }
        const hop = d > 0.15 && h.peck <= 0 ? Math.abs(Math.sin(LIFE.t * (h.run > 0 ? 22 : 11) + i)) * 0.06 : 0,
          pitch = h.peck > 0 ? Math.max(0, Math.sin(LIFE.t * 14 + i)) * 0.7 : 0;
        LE.set(pitch, h.a, 0, "YXZ");
        LQ.setFromEuler(LE);
        LM.compose(LV.set(h.x, gy(h.x, h.z) + hop, h.z), LQ, LS.set(1.15, 1.15, 1.15));
        LIFE.henIM.setMatrixAt(i, LM);
      }
      LIFE.henIM.instanceMatrix.needsUpdate = true;
    }
    /* behiak: astiro bazkatzen */
    if (LIFE.cowIM && near(25, -98, 90)) {
      for (const [i, c] of LIFE.cows.entries()) {
        c.t -= dt;
        if (c.t <= 0) {
          c.t = 5 + Math.random() * 6;
          c.graze = Math.random() < 0.6 ? 4 : 0;
          const a = Math.random() * TAU;
          c.tx = c.hx + Math.cos(a) * 6;
          c.tz = c.hz + Math.sin(a) * 6;
          if (Math.random() < 0.25 && Math.hypot(P.x - c.x, P.z - c.z) < 30) SND.moo(clamp(1 - Math.hypot(P.x - c.x, P.z - c.z) / 30, 0.2, 1));
        }
        c.graze = Math.max(0, c.graze - dt);
        const dx = c.tx - c.x,
          dz = c.tz - c.z,
          d = Math.hypot(dx, dz);
        if (d > 0.3 && c.graze <= 0) {
          c.x += (dx / d) * 0.6 * dt;
          c.z += (dz / d) * 0.6 * dt;
          c.a += Math.atan2(Math.sin(Math.atan2(dx, dz) - c.a), Math.cos(Math.atan2(dx, dz) - c.a)) * Math.min(1, dt * 1.5);
        }
        LE.set(c.graze > 0 ? 0.18 : 0, c.a, 0, "YXZ");
        LQ.setFromEuler(LE);
        LM.compose(LV.set(c.x, gy(c.x, c.z), c.z), LQ, LS.set(1.2, 1.2, 1.2));
        LIFE.cowIM.setMatrixAt(i, LM);
      }
      LIFE.cowIM.instanceMatrix.needsUpdate = true;
    }
    /* tximeletak: iraganean bakarrik */
    if (LIFE.bugIM) {
      LIFE.bugIM.visible = past > 0.3;
      if (LIFE.bugIM.visible)
        for (const [i, b] of LIFE.bugs.entries()) {
          const t = LIFE.t * b.sp + b.ph,
            x = b.hx + Math.sin(t * 0.7) * 3 + Math.sin(t * 1.9) * 0.6,
            z = b.hz + Math.cos(t * 0.53) * 3,
            y = gy(x, z) + 1 + Math.sin(t * 1.3) * 0.5,
            flap = 0.25 + Math.abs(Math.sin(LIFE.t * 18 + i)) * 0.75;
          LE.set(0, t, 0);
          LQ.setFromEuler(LE);
          LM.compose(LV.set(x, y, z), LQ, LS.set(flap * past, 1, 1));
          LIFE.bugIM.setMatrixAt(i, LM);
        }
      LIFE.bugIM.instanceMatrix.needsUpdate = true;
    }
    /* ipurtargiak basoan (iraganean) */
    if (LIFE.flies) {
      LIFE.flies.material.opacity = past * (0.7 + 0.3 * Math.sin(LIFE.t * 3));
      LIFE.flies.visible = past > 0.05 && near(-6, -112, 60);
      if (LIFE.flies.visible) {
        const a = LIFE.flies.geometry.attributes.position,
          b = LIFE.flies.userData.base;
        for (let i = 0; i < a.count; i++) a.setXYZ(i, b[i * 3] + Math.sin(LIFE.t * 0.6 + i) * 1.2, b[i * 3 + 1] + Math.sin(LIFE.t * 0.9 + i * 2) * 0.6, b[i * 3 + 2] + Math.cos(LIFE.t * 0.5 + i) * 1.2);
        a.needsUpdate = true;
      }
    }
    /* arraina ibaian (iraganean, ibaitik hurbil) */
    if (LIFE.fishT < 0 && past > 0.6 && riverW(P.x, P.z) < 20 && Math.random() < dt * 0.25) {
      /* ibaiaren puntu bat Amaiurren inguruan (ertzetik urrun) */
      const [rx, rz, hw] = riverAt(riverS(clamp(P.x + (Math.random() - 0.5) * 24, -84, 92)));
      LIFE.fishT = 0;
      LIFE.fishX = rx;
      LIFE.fishZ = rz + (Math.random() - 0.5) * hw;
      LIFE.fishA = Math.random() * TAU;
    }
    if (LIFE.fishT >= 0) {
      LIFE.fishT += dt;
      const k = LIFE.fishT / 0.9;
      LIFE.fish.visible = k < 1;
      LIFE.fish.position.set(LIFE.fishX + Math.sin(LIFE.fishA) * k * 1.8, -1.2 + Math.sin(k * PI) * 1.3, LIFE.fishZ + Math.cos(LIFE.fishA) * k * 1.8);
      LIFE.fish.rotation.set(0, LIFE.fishA, 0);
      LIFE.fish.rotateX(-Math.cos(k * PI) * 1.1);
      if (k >= 1) {
        fxBurst(LIFE.fish.position.x, -1.1, LIFE.fish.position.z, { n: 12, speed: 2, up: 2.5, life: 0.5, size: 0.2, color: "#d8f2ff", grav: 8 });
        if (Math.hypot(P.x - LIFE.fishX, P.z - LIFE.fishZ) < 26) SND.drip();
        LIFE.fishT = -1;
      }
    }
    /* zuhaitzak eta banderak haizean */
    const wind = 0.6 + 0.4 * Math.sin(LIFE.t * 0.31);
    for (const w of SWAY) {
      if (Math.abs(w.m.position.x - P.x) > 70 || Math.abs(w.m.position.z - P.z) > 70) continue;
      w.m.rotation.z = Math.sin(LIFE.t * 1.1 + w.ph) * 0.018 * w.k * wind;
      w.m.rotation.x = Math.sin(LIFE.t * 0.9 + w.ph * 1.7) * 0.012 * w.k * wind;
    }
    for (const [i, f] of FLAGS.entries()) f.rotation.z = Math.sin(LIFE.t * 2.4 + i) * 0.03 * wind;
    /* kea tximinietatik (orainean gehiago) eta errementariaren txinpartak */
    for (const c of LIFE.chimneys) {
      if (!near(c.x, c.z, 75)) continue;
      c.t -= dt * (0.5 + phaseBlend * 0.9 + (c.forge ? 0.6 : 0));
      if (c.t <= 0) {
        c.t = 0.55 + Math.random() * 0.4;
        const S = LIFE.smoke.find((q) => q.t >= q.life);
        if (S) Object.assign(S, { t: 0, life: 4 + Math.random() * 2, x: c.x, y: c.y, z: c.z, vx: 0.25 + Math.random() * 0.2, vz: (Math.random() - 0.5) * 0.2 });
      }
      if (c.forge && Math.random() < dt * 1.2) fxBurst(c.x, c.y - 0.4, c.z, { n: 4, speed: 1.5, up: 2.5, life: 0.6, size: 0.12, color: "#ffb35c", grav: 2 });
    }
    for (const S of LIFE.smoke) {
      if (S.t >= S.life) {
        S.s.visible = false;
        continue;
      }
      S.t += dt;
      const k = S.t / S.life;
      S.s.visible = true;
      S.s.position.set(S.x + S.vx * S.t * 2.2, S.y + S.t * 1.3, S.z + S.vz * S.t * 2.2);
      S.s.scale.setScalar(0.8 + k * 3.2);
      S.s.material.opacity = Math.sin(k * PI) * 0.32;
      S.s.material.color.set(phaseBlend > 0.5 ? "#d5dade" : "#b9b4ac");
    }
    ambienceUpdate(dt, past);
  }
  /* giro-hotsak: txoriak (uda) edo beleak (negua), ibaia, errementaria, kanpaia, izotza */
  function ambienceUpdate(dt, past) {
    const N = LIFE.next,
      due = (k, min, max) => {
        N[k] = (N[k] ?? Math.random() * max) - dt;
        if (N[k] > 0) return false;
        N[k] = min + Math.random() * (max - min);
        return true;
      };
    const river = clamp(1 - riverW(P.x, P.z) / 24, 0, 1),
      falls = Math.max(clamp(1 - (Math.hypot(P.x - 99, P.z + 28.5) - 10) / 30, 0, 1), clamp(1 - (Math.hypot(P.x - PIT.x, P.z - PIT.z) - 8) / 26, 0, 1));
    SND.riverLevel(river * past * 0.9 + falls * past * 0.5);
    if (P.y > -2 && DAY.k < 0.5 && due("bird", 2.5, 7)) past > 0.5 ? SND.chirp() : SND.crow();
    if (phaseBlend > 0.5 && river > 0.3 && due("creak", 6, 14)) SND.creak();
    const forge = Math.hypot(P.x - 23, P.z - 41);
    if (forge < 26 && DAY.k < 0.55 && due("forge", 1.1, 1.6)) {
      SND.clang(clamp(1 - forge / 26, 0.1, 1) * 0.6);
      const M = NPCS.find((n) => n.id === "maddi");
      if (M && Math.hypot(P.x - M.x, P.z - M.z) > 4) {
        npcAnim(M, "1H_Melee_Attack_Chop", true);
        M.cur = "";
      }
    }
    if (due("bell", 70, 90) && Math.hypot(P.x + 20, P.z - 22) < 80) SND.echo(clamp(1 - Math.hypot(P.x + 20, P.z - 22) / 80, 0.15, 0.6));
  }
