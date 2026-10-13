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
    if (kind === "fire") {
      const bowl = new T.Mesh(new T.CylinderGeometry(0.85, 0.55, 0.7, 12), rockMaterial());
      bowl.position.y = -0.2;
      g.add(bowl);
      const ped = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 1.6, 8), rockMaterial());
      ped.position.y = -1.3;
      g.add(ped);
      stone = new T.Mesh(new T.ConeGeometry(0.5, 1.3, 8), new T.MeshStandardMaterial({ color: "#3a2a20", emissive: new T.Color(col), emissiveIntensity: 0.3, roughness: 0.6, transparent: true, opacity: 0.95 }));
      stone.position.y = 0.6;
    } else {
      stone = new T.Mesh(new T.OctahedronGeometry(0.62, 0), new T.MeshStandardMaterial({ color: "#5d5070", emissive: new T.Color(col), emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }));
      stone.scale.y = 1.4;
    }
    g.add(stone);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
    halo.scale.setScalar(3.2);
    if (kind === "fire") halo.position.y = 0.7;
    g.add(halo);
    const timer = new T.Mesh(new T.RingGeometry(1.05, 1.22, 48, 1, 0, TAU), new T.MeshBasicMaterial({ color: "#f3e6ff", transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
    if (kind === "fire") timer.position.y = 1.6;
    g.add(timer);
    const ghost = new T.Mesh(stone.geometry, new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.25 }));
    ghost.scale.copy(stone.scale);
    ghost.position.copy(stone.position);
    g.add(ghost);
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
        const v = runeMesh(x, y, z, D.kind === "fire" ? "#ff9d4a" : era < 0 ? "#c9a8ff" : ERA_COL[era], D.kind);
        const R = {
          rune: true,
          x,
          y: D.kind === "fire" ? y + 0.6 : y,
          z,
          r: D.kind === "fire" ? 1.1 : 0.9,
          era,
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
    SND.rune(true);
    fxBurst(R.x, R.y, R.z, { n: 18, speed: 3, up: 1, life: 0.6, size: 0.3, color: set.D.kind === "fire" ? "#ffb35c" : R.era < 0 ? "#d9c2ff" : ERA_COL[R.era], grav: -1 });
    const n = set.list.filter((r) => r.lit).length;
    if (n < set.list.length) {
      notify((set.D.kind === "fire" ? L("SUTEGIA ") : L("ERRUNA ")) + n + " / " + set.list.length + L(" · azkar, besteak!"), "", 2);
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
      const fire = set.D.kind === "fire",
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
