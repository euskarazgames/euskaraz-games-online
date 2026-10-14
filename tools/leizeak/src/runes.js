  /* ==================================================================
     ERRUNAK ETA SUTEGIAK · sorginkeriaz pizten dira
     Multzo bakoitza zona eta gela batean dago. Errun/sutegi bakoitza garai batean
     bakarrik ikusten eta jotzen da (urrea → iragana, urdina → oraina, morea →
     biak). Piztutakoak segundo gutxi irauten du: denak batera piztuta → onSolve.
     Sutegiak (kind: "fire") leizeetan: harrizko ontzia eta sua.
     ================================================================== */
  const RUNE_SETS = [];
  const RUNE_PUZ = [];
  /* errun-harria: oktaedroa, distira eta denbora-eraztuna */
  function runeMesh(x, y, z, col, kind) {
    const g = new T.Group();
    let stone;
    if (kind === "galdara") {
      /* Tartaloren galdara: burdinazko ontzi handia hiru hankatan */
      const iron = material("#2c2622", 0.05),
        bowl = new T.Mesh(new T.CylinderGeometry(1.15, 0.8, 0.9, 14, 1, true), iron);
      bowl.position.y = -0.15;
      bowl.material = bowl.material.clone();
      bowl.material.side = T.DoubleSide;
      g.add(bowl);
      const rim = new T.Mesh(new T.TorusGeometry(1.15, 0.09, 6, 20), iron);
      rim.rotation.x = PI / 2;
      rim.position.y = 0.3;
      g.add(rim);
      for (let i = 0; i < 3; i++) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 1.9, 6), iron),
          a = (i / 3) * TAU;
        leg.position.set(Math.cos(a) * 0.7, -1.3, Math.sin(a) * 0.7);
        leg.rotation.z = Math.cos(a) * 0.2;
        leg.rotation.x = -Math.sin(a) * 0.2;
        g.add(leg);
      }
      stone = new T.Mesh(new T.ConeGeometry(0.75, 1.8, 9), new T.MeshStandardMaterial({ color: "#3a2a20", emissive: new T.Color(col), emissiveIntensity: 0.3, roughness: 0.6, transparent: true, opacity: 0.95 }));
      stone.position.y = 0.95;
    } else if (kind === "fire") {
      const bowl = new T.Mesh(new T.CylinderGeometry(0.85, 0.55, 0.7, 12), rockMaterial());
      bowl.position.y = -0.2;
      g.add(bowl);
      const ped = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 1.6, 8), rockMaterial());
      ped.position.y = -1.3;
      g.add(ped);
      stone = new T.Mesh(new T.ConeGeometry(0.5, 1.3, 8), new T.MeshStandardMaterial({ color: "#3a2a20", emissive: new T.Color(col), emissiveIntensity: 0.3, roughness: 0.6, transparent: true, opacity: 0.95 }));
      stone.position.y = 0.6;
    } else if (kind === "kanpaia") {
      /* jentil-kanpaia: harrizko arkua eta brontzezko kanpaia zintzilik (kulunka egiten du) */
      const sm = rockMaterial();
      for (const s of [-1, 1]) {
        const post = new T.Mesh(new T.BoxGeometry(0.45, 3.7, 0.45), sm);
        post.position.set(s * 1.25, -1.6, 0);
        post.castShadow = true;
        g.add(post);
      }
      const lintel = new T.Mesh(new T.BoxGeometry(3.1, 0.45, 0.6), sm);
      lintel.position.y = 0.42;
      g.add(lintel);
      const pivot = new T.Group();
      pivot.position.y = 0.18;
      g.add(pivot);
      const prof = [[0.04, 0], [0.3, -0.05], [0.41, -0.24], [0.45, -0.58], [0.53, -0.92], [0.7, -1.12], [0.73, -1.2], [0.64, -1.18]].map(([r, y]) => new T.Vector2(r, y));
      stone = new T.Mesh(new T.LatheGeometry(prof, 18), new T.MeshStandardMaterial({ color: "#b4823c", metalness: 0.75, roughness: 0.34, emissive: new T.Color(col), emissiveIntensity: 0.2, side: T.DoubleSide }));
      stone.castShadow = true;
      pivot.add(stone);
      const clap = new T.Mesh(new T.SphereGeometry(0.13, 8, 6), material("#3a2a1a"));
      clap.position.y = -1.02;
      pivot.add(clap);
    } else {
      stone = new T.Mesh(new T.OctahedronGeometry(0.62, 0), new T.MeshStandardMaterial({ color: "#5d5070", emissive: new T.Color(col), emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }));
      stone.scale.y = 1.4;
    }
    if (!stone.parent) g.add(stone);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
    halo.scale.setScalar(kind === "galdara" ? 4.6 : 3.2);
    if (kind === "fire") halo.position.y = 0.7;
    if (kind === "galdara") halo.position.y = 1.1;
    if (kind === "kanpaia") halo.position.y = -0.6;
    g.add(halo);
    const timer = new T.Mesh(new T.RingGeometry(1.05, 1.22, 48, 1, 0, TAU), new T.MeshBasicMaterial({ color: "#f3e6ff", transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
    if (kind === "fire" || kind === "galdara") timer.position.y = kind === "galdara" ? 2.3 : 1.6;
    if (kind === "kanpaia") timer.position.y = 1.35;
    g.add(timer);
    const ghost = new T.Mesh(stone.geometry, new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.25 }));
    ghost.scale.copy(stone.scale);
    ghost.position.copy(stone.position);
    (kind === "kanpaia" ? stone.parent : g).add(ghost);
    g.position.set(x, y, z);
    (BP || scene).add(g);
    return { g, stone, halo, timer, ghost };
  }
  /* denbora-eraztuna (kamerari begira) */
  function runeTimer(R, frac) {
    R.timer.material.opacity = frac > 0 ? 0.8 : 0;
    R.timer.quaternion.copy(camera.quaternion);
    if (frac > 0) {
      R.timer.geometry.dispose();
      R.timer.geometry = new T.RingGeometry(1.05, 1.22, 48, 1, PI / 2, TAU * frac);
    }
  }
  /* zona baten multzoak (BP ezarrita) */
  function buildRunePuzzles(zone) {
    for (const D of RUNE_SETS.filter((d) => d.zone === zone)) {
      const set = { D, solved: saved.cleared.includes(D.id), list: [], group: BP };
      for (const [x, y, z, era] of D.runes) {
        const hot = D.kind === "fire" || D.kind === "galdara",
          v = runeMesh(x, y, z, hot ? "#ff9d4a" : D.kind === "kanpaia" && era < 0 ? "#ffcf7a" : era < 0 ? "#c9a8ff" : ERA_COL[era], D.kind);
        const R = {
          rune: true,
          x,
          y: hot ? y + 0.6 : D.kind === "kanpaia" ? y - 0.55 : y,
          z,
          r: D.kind === "galdara" ? 1.4 : D.kind === "fire" ? 1.1 : D.kind === "kanpaia" ? 1.1 : 0.9,
          idx: set.list.length,
          era,
          needFire: !!D.needFire,
          lit: false,
          t: 0,
          ...v,
          set,
          live: () => !set.solved && set.group === ZONES[ZONE.cur].group && (era === -1 || era === phase) && (!D.when || D.when()),
          hit: () => runeSetHit(set, R),
        };
        set.list.push(R);
        RUNES.push(R);
      }
      RUNE_PUZ.push(set);
    }
  }
  function runeSetHit(set, R) {
    R.lit = true;
    R.t = set.D.time;
    if (set.D.kind === "kanpaia") {
      R.swv = (R.swv || 0) + 3.4;
      SND.kanpaia(R.idx);
    } else SND.rune(true);
    const hot = set.D.kind === "fire" || set.D.kind === "galdara";
    fxBurst(R.x, R.y, R.z, { n: 18, speed: 3, up: 1, life: 0.6, size: 0.3, color: hot ? "#ffb35c" : R.era < 0 ? "#d9c2ff" : ERA_COL[R.era], grav: -1 });
    const n = set.list.filter((r) => r.lit).length;
    if (n < set.list.length) {
      notify((set.D.kind === "galdara" ? L("GALDARA ") : set.D.kind === "fire" ? L("SUTEGIA ") : set.D.kind === "kanpaia" ? L("KANPAIA ") : L("ERRUNA ")) + n + " / " + set.list.length + L(" · azkar, besteak!"), "", 2);
      return;
    }
    /* denak batera */
    set.solved = true;
    if (!saved.cleared.includes(set.D.id)) saved.cleared.push(set.D.id);
    persist();
    for (const r of set.list) fxRing(r.x, r.y - 0.5, r.z, "#f3e6ff", 3, 0.6);
    SND.stinger(true);
    haptic(50);
    if (set.D.onSolve) set.D.onSolve();
    hud();
  }
  function runePuzzlesUpdate(dt) {
    for (const set of RUNE_PUZ) {
      if (set.group !== ZONES[ZONE.cur].group) continue;
      const fire = set.D.kind === "fire" || set.D.kind === "galdara",
        near = set.list.some((r) => Math.hypot(r.x - P.x, r.z - P.z) < 16),
        here = !set.solved && near;
      for (const R of set.list) {
        const vis = set.solved || R.lit || R.era === -1 || R.era === phase;
        R.stone.visible = R.halo.visible = vis;
        R.ghost.visible = !vis;
        if (fire) {
          const on = set.solved || R.lit;
          R.stone.scale.set(on ? 1 + Math.sin(time * 17 + R.x) * 0.08 : 0.35, on ? 1 + Math.sin(time * 13 + R.z) * 0.15 : 0.25, on ? 1 : 0.35);
          R.stone.material.emissiveIntensity = on ? 2.2 : 0.15;
          R.stone.material.color.set(on ? "#ff7a2a" : "#2a2420");
          R.halo.material.opacity = on ? 0.9 : 0.12;
        } else if (set.D.kind === "kanpaia") {
          /* kulunka: malguki moteldua */
          R.swv = ((R.swv || 0) - (R.sw || 0) * 28 * dt) * Math.exp(-dt * 1.1);
          R.sw = (R.sw || 0) + R.swv * dt;
          R.stone.parent.rotation.x = R.sw;
          R.stone.material.emissiveIntensity = set.solved ? 0.8 : R.lit ? 1.7 : 0.12 + (here ? 0.18 + 0.12 * Math.sin(time * 4 + R.x) : 0);
          R.halo.material.opacity = set.solved ? 0.3 : R.lit ? 0.9 : here ? 0.32 : 0.1;
        } else {
          R.g.rotation.y += dt * (R.lit ? 3 : 0.8);
          R.g.position.y = R.y + Math.sin(time * 2 + R.x) * 0.15;
          R.stone.material.emissiveIntensity = set.solved ? 1.2 : R.lit ? 1.7 : 0.45 + Math.sin(time * 4 + R.z) * 0.2;
          R.halo.material.opacity = set.solved ? 0.5 : R.lit ? 0.95 : here ? 0.6 : 0.25;
        }
        if (R.lit && !set.solved) {
          R.t -= dt;
          runeTimer(R, Math.max(0, R.t / set.D.time));
          if (R.t <= 0) {
            R.lit = false;
            runeTimer(R, 0);
            SND.rune(false);
          }
        } else if (R.timer.material.opacity) runeTimer(R, 0);
      }
      if (here && set.D.hint) notifyOnce("runes" + set.D.id, set.D.hint, "");
    }
  }
