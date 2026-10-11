  /* ==================================================================
     ERRUN-PUZZLEAK · sorginkeria eta garaiak (hautazkoak)
     Uharte garbitu batzuetan errunak daude: bakoitza garai batean bakarrik
     ikusten eta jotzen da (urrea → iragana, urdina → oraina, morea → biak).
     Piztutako errun batek segundo gutxi irauten du: denak batera piztuta → saria.
     ================================================================== */
  const RUNE_SETS = [
    { island: 2, time: 8, runes: [[38.5, 6.5, -63.5, 0], [24.5, 3.2, -62, 1], [33, 4.5, -49.5, -1]] },
    { island: 3, time: 9, runes: [[-7, 7.5, -104, 0], [6.5, 2.6, -90, 1], [-9, 3, -90, -1], [7, 5.5, -106.5, 0]] },
  ];
  const RUNE_PUZ = [];
  /* errun-harria: oktaedroa, distira eta denbora-eraztuna */
  function runeMesh(x, y, z, col) {
    const g = new T.Group(),
      stone = new T.Mesh(new T.OctahedronGeometry(0.62, 0), new T.MeshStandardMaterial({ color: "#5d5070", emissive: new T.Color(col), emissiveIntensity: 0.6, roughness: 0.3, flatShading: true }));
    stone.scale.y = 1.4;
    g.add(stone);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
    halo.scale.setScalar(3.2);
    g.add(halo);
    const timer = new T.Mesh(new T.RingGeometry(1.05, 1.22, 48, 1, 0, TAU), new T.MeshBasicMaterial({ color: "#f3e6ff", transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
    g.add(timer);
    const ghost = new T.Mesh(stone.geometry, new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.25 }));
    ghost.scale.copy(stone.scale);
    g.add(ghost);
    g.position.set(x, y, z);
    scene.add(g);
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
  function buildRunePuzzles() {
    saved.runes = Array.isArray(saved.runes) ? saved.runes : [];
    for (const D of RUNE_SETS) {
      const I = ISLANDS[D.island],
        set = { D, solved: saved.runes.includes(D.island), list: [] };
      for (const [x, h, z, era] of D.runes) {
        const v = runeMesh(x, I.y + h, z, era < 0 ? "#c9a8ff" : ERA_COL[era]);
        const R = {
          rune: true,
          x,
          y: I.y + h,
          z,
          r: 0.9,
          era,
          lit: false,
          t: 0,
          ...v,
          set,
          live: () => !set.solved && currentStage === D.island && isCleared(D.island) && (era === -1 || era === phase),
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
    fxBurst(R.x, R.y, R.z, { n: 18, speed: 3, up: 1, life: 0.6, size: 0.3, color: R.era < 0 ? "#d9c2ff" : ERA_COL[R.era], grav: -1 });
    const n = set.list.filter((r) => r.lit).length;
    if (n < set.list.length) {
      notify(L("ERRUNA ", "RUNA ") + n + " / " + set.list.length + L(" · azkar, besteak!", " · ¡rápido, las demás!"), L("ERRUNA ", "RUNA ") + n + " / " + set.list.length + L(" · azkar, besteak!", " · ¡rápido, las demás!"), 2);
      return;
    }
    /* denak batera: saria */
    set.solved = true;
    saved.runes.push(set.D.island);
    persist();
    for (const r of set.list) fxRing(r.x, r.y - 0.5, r.z, "#f3e6ff", 3, 0.6);
    SND.stinger(true);
    title("ERRUNAK PIZTUTA", "RUNAS ENCENDIDAS");
    haptic(50);
    P.hp = P.maxHp;
    hud();
    if (BOONS.some((b) => !saved.boons.includes(b[0]))) setTimeout(() => offerBoon(set.D.island), 900);
    else notify("Argiak zure arnasa berritu du.", "La luz ha renovado tu aliento.", 3);
  }
  function runePuzzlesUpdate(dt) {
    for (const set of RUNE_PUZ) {
      const here = currentStage === set.D.island && isCleared(set.D.island) && !set.solved;
      for (const R of set.list) {
        const vis = set.solved || R.lit || R.era === -1 || R.era === phase;
        R.stone.visible = R.halo.visible = vis;
        R.ghost.visible = !vis;
        R.g.rotation.y += dt * (R.lit ? 3 : 0.8);
        R.g.position.y = R.y + Math.sin(time * 2 + R.x) * 0.15;
        R.stone.material.emissiveIntensity = set.solved ? 1.2 : R.lit ? 1.7 : 0.45 + Math.sin(time * 4 + R.z) * 0.2;
        R.halo.material.opacity = set.solved ? 0.5 : R.lit ? 0.95 : here ? 0.6 : 0.25;
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
      if (here && set.list.some((r) => Math.hypot(r.x - P.x, r.z - P.z) < 16))
        notifyOnce(
          "runes" + set.D.island,
          "Errunak! Bakoitza bere garaian ikusten da. Piztu denak batera SORGINKERIArekin (" + set.D.time + " s).",
          "¡Runas! Cada una se ve en su época. Enciéndelas todas a la vez con HECHIZO (" + set.D.time + " s).",
        );
    }
  }
