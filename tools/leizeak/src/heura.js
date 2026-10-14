  /* ==================================================================
     HEURA · horma heuratsuak igo daitezke
     · Hormaren kontra bultzatu (oinez edo airean) → heldu.
     · Makila/teklak: gora eta behera (pantailan bezala), alboetara.
     · JAUZI: gora begira bazaude, jauzi bat gora (hormatik askatu gabe);
       bestela, hormatik atzera jauzi. Goian, ertzera igotzen da.
     · Heura bizirik IRAGANEAN dago (uda); ORAINEAN izoztuta: ezin da heldu.
       (phase: -1 → bi garaietan.) Garaia aldatzean, heura izoztu → erori.
     ================================================================== */
  const IVY = [];
  const CLIMB = { along: 0, regrab: 0, raise: null, sp: 0, step: 0, hop: 0 };
  const CLIMB_UP = 3.4,
    CLIMB_SIDE = 2.9,
    CLIMB_GAP = 0.42;
  const IVY_GREEN = new T.Color("#ffffff"),
    IVY_FROST = new T.Color("#9fb0c6");
  let IVY_TEX = null,
    IVY_FROST_TEX = null,
    IVY_MAT = null,
    IVY_EVER = null;
  /* heura-testura (kanbasean): zurtoinak eta hiru-bost hostoko orriak, ertzetan errepikagarria.
     frost: hosto lehor eta izoztuak (orainerako), ausazkotasun berberarekin */
  function ivyTexture(frost) {
    if (!frost && IVY_TEX) return IVY_TEX;
    if (frost && IVY_FROST_TEX) return IVY_FROST_TEX;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    let sd = 11;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    x.lineCap = "round";
    for (let k = 0; k < 7; k++) {
      let px = 18 + k * 36 + rnd() * 10,
        py = 260;
      x.strokeStyle = frost ? "#4a3f36" : "#3a4522";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(px, py);
      while (py > -4) {
        py -= 16;
        px += (rnd() - 0.5) * 14;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    const leaf = (lx, ly, r, a, col) => {
      x.fillStyle = col;
      x.beginPath();
      for (let j = 0; j <= 12; j++) {
        const t = (j / 12) * TAU,
          rr = r * (0.62 + 0.38 * Math.abs(Math.cos(t * 2.5)));
        const px = lx + Math.cos(t + a) * rr,
          py = ly + Math.sin(t + a) * rr;
        j ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.fill();
      x.strokeStyle = frost ? "rgba(240,248,255,0.7)" : "rgba(210,235,160,0.28)";
      x.lineWidth = frost ? 1.6 : 1;
      x.beginPath();
      x.moveTo(lx, ly);
      x.lineTo(lx + Math.cos(a) * r * 0.8, ly + Math.sin(a) * r * 0.8);
      x.stroke();
    };
    for (let i = 0; i < 300; i++) {
      const lx = rnd() * 256,
        ly = rnd() * 256,
        r = 7 + rnd() * 9,
        a = rnd() * TAU,
        g = (85 + rnd() * 95) | 0,
        k1 = rnd(),
        k2 = rnd(),
        col = frost ? `rgb(${(96 + g * 0.35) | 0},${(88 + g * 0.3) | 0},${(84 + k2 * 40) | 0})` : `rgb(${(28 + k1 * 34) | 0},${g},${(26 + k2 * 30) | 0})`;
      /* orainean: hostoen erdiak eroriak */
      if (frost && k1 > 0.55) continue;
      /* ertzetan: beste aldean ere marraztu (errepikapena jarraitua) */
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) if (lx + ox > -20 && lx + ox < 276 && ly + oy > -20 && ly + oy < 276) leaf(lx + ox, ly + oy, r, a, col);
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.encoding = T.sRGBEncoding;
    if (frost) IVY_FROST_TEX = tex;
    else IVY_TEX = tex;
    return tex;
  }
  function ivyMaterials() {
    if (IVY_MAT) return;
    const base = { map: ivyTexture(), alphaTest: 0.45, roughness: 0.82, side: T.DoubleSide };
    IVY_MAT = new T.MeshStandardMaterial(base);
    IVY_EVER = new T.MeshStandardMaterial(base);
  }
  /* heura-horma: oinarriaren erdia (cx, cz), kanpo-normala (nx, nz), zabalera w, y0 → y1 (ertza) */
  function ivyWall(o) {
    ivyMaterials();
    const { cx, cz, nx, nz, w, y0, y1 } = o,
      ph = o.phase ?? 0,
      h = y1 - y0 + 0.35,
      geo = new T.PlaneGeometry(w, h),
      uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 2.6, (uv.getY(i) * h) / 2.6 + cx * 0.13);
    const m = new T.Mesh(geo, ph === -1 ? IVY_EVER : IVY_MAT);
    m.position.set(cx + nx * 0.06, y0 + h / 2 - 0.05, cz + nz * 0.06);
    m.rotation.y = Math.atan2(nx, nz);
    m.receiveShadow = true;
    (BP || scene).add(m);
    /* goiko ertzean hosto-mataza (bolumena) */
    const tuft = new T.Mesh(new T.PlaneGeometry(w * 0.96, 0.9), m.material);
    tuft.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = i % 2 ? v * 0.35 : (v * w) / 2.6));
    tuft.position.set(cx + nx * 0.3, y1 + 0.05, cz + nz * 0.3);
    tuft.rotation.set(-0.9, Math.atan2(nx, nz), 0, "YXZ");
    (BP || scene).add(tuft);
    const F = { id: o.id || "ivy" + IVY.length, cx, cz, nx, nz, tx: -nz, tz: nx, w, y0, y1, phase: ph, group: BP, m, tuft };
    IVY.push(F);
    return F;
  }
  /* kaxa-plataforma baten aldea (n, s, e, w — tokiko ardatzetan) heuraz estali */
  function ivySide(p, side, y0, opts = {}) {
    const c = Math.cos(p.rot || 0),
      s = Math.sin(p.rot || 0),
      L0 = { n: [0, -p.d / 2, 0, -1, p.w], s: [0, p.d / 2, 0, 1, p.w], e: [p.w / 2, 0, 1, 0, p.d], w: [-p.w / 2, 0, -1, 0, p.d] }[side],
      [lx, lz, lnx, lnz, len] = L0;
    return ivyWall({ ...opts, cx: p.x + lx * c + lz * s, cz: p.z - lx * s + lz * c, nx: lnx * c + lnz * s, nz: -lnx * s + lnz * c, w: opts.w || len - 0.4, y0, y1: p.y });
  }
  const ivyLive = (F) => F.phase === -1 || F.phase === phase;
  /* sarrera gordina (pantailako ardatzak): x eskuina, z behera */
  function stickRaw() {
    let x = (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) - (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) + input.x,
      z = (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0) - (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) + input.z;
    const n = Math.hypot(x, z);
    if (n > 1) (x /= n), (z /= n);
    return { x, z };
  }
  /* pantailaren "eskuina" munduan (kameraren biraketa) */
  function camRight() {
    const wx = 0.83,
      wz = -0.557,
      c = Math.cos(CAM.yawS || 0),
      sn = Math.sin(CAM.yawS || 0);
    return { x: wx * c + wz * sn, z: -wx * sn + wz * c };
  }
  function heuraInit() {
    const UPPER = /^(spine|chest|upperarm|lowerarm|wrist|hand|head)/,
      c = models.mage.animations.find((a) => a.name === "Spellcast_Raise");
    if (c) CLIMB.raise = mixer.clipAction(new T.AnimationClip("Raise_goia", c.duration, c.tracks.filter((t) => UPPER.test(t.name))));
  }
  function ivyNear(r) {
    const grp = ZONES[ZONE.cur].group;
    return IVY.find((F) => F.group === grp && Math.abs((P.x - F.cx) * F.nx + (P.z - F.cz) * F.nz) < r && Math.abs((P.x - F.cx) * F.tx + (P.z - F.cz) * F.tz) < F.w / 2 + 1 && P.y > F.y0 - 1 && P.y < F.y1);
  }
  /* move()-en amaieran: hormaren kontra bultzatzen badu, heldu */
  function climbTry(d, len) {
    if (P.climb || CLIMB.regrab > 0 || P.riding || P.dashT > 0 || CHAIN.state !== "idle" || CRAFT.held || len < 0.3 || respawnTimer) return false;
    const grp = ZONES[ZONE.cur].group;
    for (const F of IVY) {
      if (F.group !== grp) continue;
      const rx = P.x - F.cx,
        rz = P.z - F.cz,
        dist = rx * F.nx + rz * F.nz,
        along = rx * F.tx + rz * F.tz;
      if (dist < -0.2 || dist > 0.8 || Math.abs(along) > F.w / 2 - 0.25) continue;
      if (P.y < F.y0 - 0.6 || P.y > F.y1 - 0.75) continue;
      if (-(d.x * F.nx + d.z * F.nz) / len < 0.55) continue;
      if (!ivyLive(F)) {
        notifyOnce("heura-izotza", L("Heura izoztuta dago: ezin zara heldu. IRAGANEAN, udan, bizirik zegoen…"), "");
        continue;
      }
      climbStart(F, along);
      return true;
    }
    return false;
  }
  function climbStart(F, along) {
    P.climb = F;
    CLIMB.along = clamp(along, -F.w / 2 + 0.35, F.w / 2 - 0.35);
    CLIMB.hop = 0;
    P.vx = P.vz = P.vy = 0;
    P.grounded = false;
    P.platform = null;
    P.dashT = 0;
    P.angle = Math.atan2(-F.nx, -F.nz);
    if (MAG.charging) {
      MAG.charging = false;
      MAG.charge = 0;
      castStop();
    }
    SND.leaves();
    coachDone("climb");
    notifyOnce("heura", mobile ? L("HEURA: makila gora eta behera, alboetara. JAUZI: gora (edo atzera, makila hormatik urrun).") : L("HEURA: W/S gora eta behera, A/D alboetara. ␣: jauzi gora (S-rekin: atzera)."), "");
  }
  function climbDrop() {
    if (!P.climb) return;
    P.climb = null;
    CLIMB.regrab = 0.35;
    CLIMB.sp = 0;
    const w = models.mage.actions.Walking_A;
    if (w) w.timeScale = 1;
    if (CLIMB.raise && CLIMB.raise.isRunning()) CLIMB.raise.fadeOut(0.15);
  }
  /* goian: ertzera igo (jauzi txiki bat barrurantz) */
  function climbMantle(F) {
    climbDrop();
    CLIMB.regrab = 0.6;
    P.x = F.cx + F.tx * CLIMB.along - F.nx * 0.8;
    P.z = F.cz + F.tz * CLIMB.along - F.nz * 0.8;
    P.y = F.y1 + 0.05;
    P.vx = -F.nx * 1.5;
    P.vz = -F.nz * 1.5;
    P.vy = 3.2;
    P.jumps = 1;
    P.dashReady = true;
    FB.jump(1);
    hero.position.set(P.x, P.y, P.z);
  }
  /* move()-en hasieran: eskalatzen ari bada, bera arduratzen da (true → move() amaitu) */
  function climbUpdate(dt) {
    const F = P.climb;
    if (!ivyLive(F)) {
      /* garaia aldatuta: heura izoztu da */
      climbDrop();
      fxBurst(P.x + F.nx * 0.3, P.y + 1.2, P.z + F.nz * 0.3, { n: 12, speed: 2, life: 0.6, size: 0.25, color: "#dff4ff", grav: 3 });
      notifyOnce("heura-erori", L("Heura izoztu da eta erori zara! IRAGANEAN bakarrik heltzen zaio."), "");
      return false;
    }
    const st = stickRaw(),
      r = camRight(),
      up = -st.z,
      side = st.x * (r.x * F.tx + r.z * F.tz);
    if (jumpBuffer > 0) {
      jumpBuffer = 0;
      if (up > -0.3 && P.y < F.y1 - 2.2) {
        /* jauzia gora, hormari helduta */
        CLIMB.hop = 0.28;
        FB.jump(1);
        SND.leaves();
      } else {
        /* hormatik atzera */
        climbDrop();
        P.vx = F.nx * 7.5;
        P.vz = F.nz * 7.5;
        P.vy = 9.6;
        P.jumps = 1;
        P.airSpeed = 8;
        P.angle = Math.atan2(F.nx, F.nz);
        FB.jump(1);
        return false;
      }
    }
    CLIMB.hop = Math.max(0, CLIMB.hop - dt);
    const vy = CLIMB.hop > 0 ? 8 : Math.abs(up) > 0.15 ? up * CLIMB_UP : 0,
      va = Math.abs(side) > 0.15 ? side * CLIMB_SIDE : 0;
    CLIMB.along = clamp(CLIMB.along + va * dt, -F.w / 2 + 0.35, F.w / 2 - 0.35);
    const y = P.y + vy * dt;
    if (y >= F.y1 - 0.3 && vy > 0) {
      climbMantle(F);
      return true;
    }
    if (y <= F.y0 + 0.01 && vy < 0) {
      /* behean: askatu */
      P.y = F.y0;
      climbDrop();
      return false;
    }
    P.y = Math.max(F.y0, y);
    P.x = F.cx + F.tx * CLIMB.along + F.nx * CLIMB_GAP;
    P.z = F.cz + F.tz * CLIMB.along + F.nz * CLIMB_GAP;
    P.vx = P.vz = P.vy = 0;
    P.grounded = false;
    P.angle = Math.atan2(-F.nx, -F.nz);
    CLIMB.sp = Math.hypot(vy, va);
    CLIMB.step += dt * CLIMB.sp * 2.2;
    if (CLIMB.sp > 0.3 && Math.sin(CLIMB.step) * Math.sin(CLIMB.step - dt * CLIMB.sp * 2.2) < 0) SND.leaves(0.5);
    /* animazioa: hankak (oinez, abiaduraren arabera) + besoak gora (goiko gorputza) */
    animate("Walking_A");
    const w = models.mage.actions.Walking_A;
    if (w) w.timeScale = CLIMB.sp > 0.3 ? 1.6 : 0.0001;
    if (CLIMB.raise && !CLIMB.raise.isRunning()) {
      CLIMB.raise.reset();
      CLIMB.raise.setLoop(T.LoopPingPong, Infinity);
      CLIMB.raise.setEffectiveWeight(6);
      CLIMB.raise.fadeIn(0.12).play();
    }
    if (CLIMB.raise) CLIMB.raise.timeScale = CLIMB.sp > 0.3 ? 1.4 : 0.0001;
    hero.position.set(P.x, P.y + Math.sin(CLIMB.step) * 0.04, P.z);
    hero.rotation.y = P.angle;
    footRing.visible = false;
    return true;
  }
  /* tick bakoitzean (move()-en hasieran) */
  function heuraTick(dt) {
    CLIMB.regrab = Math.max(0, CLIMB.regrab - dt);
    if (IVY_MAT) {
      const fr = phaseBlend > 0.5;
      if (fr !== IVY.frost) {
        IVY.frost = fr;
        IVY_MAT.map = ivyTexture(fr);
        IVY_MAT.needsUpdate = true;
      }
      IVY_MAT.color.copy(IVY_GREEN).lerp(IVY_FROST, fr ? 0.35 : 0);
    }
  }
