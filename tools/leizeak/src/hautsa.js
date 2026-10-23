  /* ==================================================================
     IZAR-HAUTSA · amonaren hauts-zorroa (ametseko tresna, diseinu propioa)
     Ingumaren aurkako konjuru zaharrak dio: «zeruan izarrak, lurrean belarrak,
     itsasoan hareak: denak kontatu arte, ez etorri enegana». Gaueko izakiek
     ezin diote kontatzeari utzi: Z (edo IZARRAK botoia) → hauts-eskukada aurrera:
     · itzalak, saguzarrak, mamuak… KONTATZEN geratzen dira (geldi, kalte bikoitza);
     · IZAR-LAINOAN (ametsa leun dagoen tokietan) hautsak izar-plataforma bat
       sortzen du jaurti den altueran: zubiak hutsunean, eta jauziaren goienean
       jaurtiz gero, izar-eskailerak. Hiru gehienez, bost segundoz.
     ================================================================== */
  const HAUTS = { list: [], plats: [], mists: [], cd: 0, n: 0, mat: null, geo: null, counted: 0 };
  const hasDust = () => saved.items.includes("hautsa");
  const DUST_REACH = 2.5,
    DUST_R = 1.8,
    DUST_LIFE = 5,
    DUST_MAX = 3;
  /* izar-lainoa: { x, z, w, d, y0, y1 } — barruan, hautsak plataformak sortzen ditu */
  function starMist(o) {
    const M = { x: o.x, z: o.z, w: o.w, d: o.d, y0: o.y0 ?? -6, y1: o.y1 ?? 30, group: BP, puffs: [] };
    /* distira leuna: zenbait sprite (lainoa) eta izar txikiak */
    const n = Math.max(3, Math.round((o.w * o.d) / 40));
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#9d7bff", transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      const px = o.x + (((i * 37) % 17) / 17 - 0.5) * o.w * 0.9,
        pz = o.z + (((i * 53) % 13) / 13 - 0.5) * o.d * 0.9,
        py = M.y0 + 1 + ((i * 29) % 11) / 11 * Math.min(10, M.y1 - M.y0);
      s.position.set(px, py, pz);
      s.scale.setScalar(5 + (i % 3) * 2);
      BP.add(s);
      M.puffs.push({ s, y0: py, ph: i * 1.7 });
    }
    HAUTS.mists.push(M);
    return M;
  }
  const inMist = (x, y, z) => HAUTS.mists.find((M) => M.group === ZONES[ZONE.cur].group && Math.abs(x - M.x) < M.w / 2 && Math.abs(z - M.z) < M.d / 2 && y > M.y0 && y < M.y1) || null;
  /* jaurti: helburua aurrean (etsai bat konoan badago, harengana) */
  function dustThrow() {
    if (!hasDust() || !started || paused || TXALA.on || CRAFT.on || cinematic || respawnTimer || GET.on || P.climb || P.riding || CHAIN.state !== "idle") return;
    if (HAUTS.cd > 0) return;
    HAUTS.cd = 0.4;
    HAUTS.n++;
    const fa = faceDir(),
      fx = Math.sin(fa),
      fz = Math.cos(fa);
    let tx = P.x + fx * DUST_REACH,
      tz = P.z + fz * DUST_REACH,
      ty = P.y;
    /* etsai hurbila konoan: harengana (kontatzera) */
    let best = null,
      bd = 9;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      const dx = e.x - P.x,
        dz = e.z - P.z,
        d = Math.hypot(dx, dz);
      if (d < bd && d > 0.5 && (dx * fx + dz * fz) / d > 0.6 && Math.abs(e.y - P.y) < 4) (bd = d), (best = e);
    }
    /* etsai nagusia (eta haren kopiak): BOSSK[kind].dustAim() → [{x, y, z}] */
    const BK = BOSS.on && BOSSK[BOSS.kind];
    if (BK && BK.dustAim)
      for (const c of BK.dustAim()) {
        const dx = c.x - P.x,
          dz = c.z - P.z,
          d = Math.hypot(dx, dz);
        if (d < (best ? bd : 14) && d > 0.5 && (dx * fx + dz * fz) / d > 0.55 && Math.abs(c.y - P.y) < 7) (bd = d), (best = c);
      }
    if (best && !inMist(tx, ty + 0.5, tz)) {
      tx = best.x;
      tz = best.z;
      ty = best.y;
    }
    P.angle = Math.atan2(tx - P.x, tz - P.z);
    MAG.aimT = 0.25;
    /* airean, izar-lainoan: izarra berehala oinen azpian (izar-eskailerak) */
    if (!P.grounded && inMist(P.x, P.y, P.z)) {
      const M = inMist(P.x, P.y, P.z),
        p = starPlatform(P.x + fx * 0.5, Math.max(M.y0 + 0.5, P.y - 0.05), P.z + fz * 0.5);
      p.t = 0.6;
      if (P.vy < 0) P.vy = 0;
      fxBurst(P.x, P.y, P.z, { n: 20, speed: 3, up: 0.5, life: 0.6, size: 0.18, color: "#e9dcff", grav: 1 });
      castAnim("Spellcast_Shoot", 2.6, 5);
      SND.dust ? SND.dust() : SND.cast();
      coachDone("hautsa");
      return;
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#e6d8ff", transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(1.1);
    const o = { x: P.x + fx * 0.5, y: P.y + 1.4, z: P.z + fz * 0.5 };
    s.position.set(o.x, o.y, o.z);
    ZONES[ZONE.cur].group.add(s);
    HAUTS.list.push({ s, o, tx, ty, tz, t: 0, T: best ? clamp(bd / 14, 0.18, 0.5) : 0.22, grp: ZONES[ZONE.cur].group, py: P.y });
    castAnim("Spellcast_Shoot", 2.6, 5);
    SND.dust ? SND.dust() : SND.cast();
    coachDone("hautsa");
  }
  /* lehertzean: izar-plataforma (lainoan) eta kontatzaileak */
  function dustBurst(D) {
    const { tx, tz } = D,
      ty = D.ty;
    fxBurst(tx, ty + 1, tz, { n: 26, speed: 3.6, up: 1.2, life: 0.8, size: 0.2, color: "#e9dcff", grav: 0.6 });
    fxRing(tx, ty + 0.2, tz, "#b99bff", 2.6, 0.45);
    /* kontatu! (gaueko izakiak) */
    let n = 0;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      if (Math.hypot(e.x - tx, e.z - tz) < 2.8 && Math.abs(e.y - ty) < 3.5) {
        dustCount(e, e.mini ? 2.5 : 4.2);
        n++;
      }
    }
    if (BOSS.on && BOSSK[BOSS.kind] && BOSSK[BOSS.kind].dust) n += BOSSK[BOSS.kind].dust(tx, ty, tz) || 0;
    for (const G of DUST_GATES) if (G.group === ZONES[ZONE.cur].group && Math.hypot(G.x - tx, G.z - tz) < G.r + 2.5) (gateCount(G), n++);
    if (n) notifyOnce("kontatu", L("«Denak kontatu arte, ez etorri enegana!» — kontatzen ari dira: orain, kalte bikoitza."), "");
    /* izar-plataforma */
    const M = inMist(tx, ty + 0.5, tz);
    if (M) starPlatform(tx, Math.max(M.y0 + 0.5, ty), tz);
  }
  function dustCount(e, secs) {
    e.counting = Math.max(e.counting || 0, secs);
    e.countN = e.countN || 0;
    e.countT = 0;
    e.stun = Math.max(e.stun, secs);
    e.parried = Math.max(e.parried || 0, secs);
    if (e.state === "lunge" || e.state === "wind" || e.state === "grab") (e.state = e.type === "bat" ? "hover" : "recover"), (e.t = -secs);
    HAUTS.counted++;
  }
  /* ---- izar-plataformak ---- */
  function starPlatform(x, y, z) {
    if (!HAUTS.geo) {
      HAUTS.geo = new T.CylinderGeometry(DUST_R, DUST_R * 0.82, 0.3, 24);
      HAUTS.mat = new T.MeshStandardMaterial({ color: "#3a2a6a", emissive: new T.Color("#7a5cff"), emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.3 });
    }
    while (HAUTS.plats.length >= DUST_MAX) starPlatformRemove(HAUTS.plats[0]);
    const g = new T.Group();
    g.position.set(x, y, z);
    const disc = new T.Mesh(HAUTS.geo, HAUTS.mat.clone());
    disc.position.y = -0.15;
    g.add(disc);
    /* konstelazioa: izar-puntuak diskoan */
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996,
        r = DUST_R * 0.92 * Math.sqrt((i + 0.5) / 9);
      pts.push(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    const stars = new T.Points(pg, new T.PointsMaterial({ color: "#fff6d8", size: 0.34, transparent: true, opacity: 0.95, depthWrite: false, blending: T.AdditiveBlending }));
    g.add(stars);
    const lines = new T.LineLoop(pg, new T.LineBasicMaterial({ color: "#c9b6ff", transparent: true, opacity: 0.5 }));
    g.add(lines);
    ZONES[ZONE.cur].group.add(g);
    const p = { x, z, y, bottom: y - 0.4, rx: DUST_R, rz: DUST_R, phase: -1, safe: false, star: true, m: g, disc, t: 0, grp: ZONES[ZONE.cur].group, list: ZONES[ZONE.cur].platforms };
    p.list.push(p);
    HAUTS.plats.push(p);
    SND.chime ? SND.chime() : SND.ready();
    return p;
  }
  function starPlatformRemove(p) {
    const i = p.list.indexOf(p);
    if (i >= 0) p.list.splice(i, 1);
    const j = HAUTS.plats.indexOf(p);
    if (j >= 0) HAUTS.plats.splice(j, 1);
    p.m.parent && p.m.parent.remove(p.m);
    p.disc.material.dispose();
    if (P.platform === p) P.grounded = false;
    fxBurst(p.x, p.y + 0.2, p.z, { n: 14, speed: 1.6, up: 0.4, life: 0.6, size: 0.16, color: "#c9b6ff", grav: 2 });
  }
  /* ---- ATE-ZAINAK: harrizko bi zaindari pasabidea ixten; hautsarekin kontatzen hasten dira eta aldentzen ---- */
  const DUST_GATES = [];
  function dustGate(o) {
    /* o: { x, z, y, w (pasabidearen zabalera), rot } */
    const y = o.y || 0,
      w = o.w || 4,
      rot = o.rot || 0,
      c = Math.cos(rot),
      s = Math.sin(rot);
    const G = { x: o.x, z: o.z, y, w, rot, r: w / 2, k: 0, t: 0, group: BP, guards: [], wall: null, n: 0 };
    for (const sd of [-1, 1]) {
      const g = new T.Group(),
        stone = rockMaterial();
      const body = new T.Mesh(new T.CylinderGeometry(0.75, 1, 3.4, 8), stone);
      body.position.y = 1.7;
      body.castShadow = true;
      g.add(body);
      const head = new T.Mesh(new T.DodecahedronGeometry(0.75, 0), stone);
      head.position.y = 3.9;
      g.add(head);
      for (const ex of [-0.25, 0.25]) {
        const eye = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), new T.MeshBasicMaterial({ color: "#b99bff" }));
        eye.position.set(ex, 4, 0.66);
        g.add(eye);
      }
      g.rotation.y = rot;
      BP.add(g);
      G.guards.push({ g, sd, eye: g.children.slice(2) });
    }
    /* talka: pasabidea itxita (ate-zainak elkarren ondoan) */
    G.wall = wallBlock(o.x, o.z, w, 1.2, rot, y, 5);
    DUST_GATES.push(G);
    gatePose(G);
    return G;
  }
  function gatePose(G) {
    const c = Math.cos(G.rot),
      s = Math.sin(G.rot);
    for (const Q of G.guards) {
      /* itxita: erdian elkarrekin (±0.9); irekita: alboetara (±w/2 + 1) */
      const off = Q.sd * mix(0.95, G.w / 2 + 1.3, G.k);
      Q.g.position.set(G.x + c * off, G.y, G.z - s * off);
    }
    G.wall.off = G.k > 0.6;
  }
  function gateCount(G) {
    if (G.t > 0.5) {
      G.t = 6.5;
      return;
    }
    G.t = 6.5;
    G.n = 0;
    SND.wake();
    notifyOnce("ate-zainak", L("Ate-zainak kontatzen hasi dira! Pasa, kontatzen amaitu aurretik."), "");
  }
  function gatesUpdate(dt) {
    for (const G of DUST_GATES) {
      if (G.group !== ZONES[ZONE.cur].group) continue;
      const was = G.t;
      G.t = Math.max(0, G.t - dt);
      G.k = mix(G.k, G.t > 0 ? 1 : 0, 1 - Math.exp(-dt * (G.t > 0 ? 5 : 3)));
      /* itxi ez, Amaiur erdian badago */
      if (G.t <= 0 && G.k > 0.05 && Math.hypot(P.x - G.x, P.z - G.z) < G.w / 2 + 0.4) G.k = Math.max(G.k, 0.7);
      gatePose(G);
      if (G.t > 0 && Math.floor(was * 2) !== Math.floor(G.t * 2)) {
        G.n++;
        for (const Q of G.guards) damageNumber({ x: Q.g.position.x, y: G.y + 3.4, z: Q.g.position.z, H: 0.5 }, String(G.n), "#d9c8ff");
      }
      for (const Q of G.guards) for (const e of Q.eye) e.material.color.set(G.t > 0 ? "#fff1a8" : "#b99bff");
    }
  }
  /* ---------------------------- eguneratzea ---------------------------- */
  function hautsaUpdate(dt) {
    HAUTS.cd = Math.max(0, HAUTS.cd - dt);
    /* hegaldian */
    for (let i = HAUTS.list.length - 1; i >= 0; i--) {
      const D = HAUTS.list[i];
      D.t += dt;
      const k = Math.min(1, D.t / D.T);
      D.s.position.set(mix(D.o.x, D.tx, k), mix(D.o.y, D.ty + 0.8, k) + Math.sin(k * PI) * 0.8, mix(D.o.z, D.tz, k));
      if (frame % 2 === 0) fxBurst(D.s.position.x, D.s.position.y, D.s.position.z, { n: 2, speed: 0.4, life: 0.4, size: 0.12, color: "#e6d8ff", grav: 0.5, drag: 3 });
      if (k >= 1) {
        D.s.parent && D.s.parent.remove(D.s);
        D.s.material.dispose();
        HAUTS.list.splice(i, 1);
        if (D.grp === ZONES[ZONE.cur].group) dustBurst(D);
      }
    }
    /* izar-plataformak: bizitza, keinuka amaieran */
    for (let i = HAUTS.plats.length - 1; i >= 0; i--) {
      const p = HAUTS.plats[i];
      if (p.grp !== ZONES[ZONE.cur].group) {
        starPlatformRemove(p);
        continue;
      }
      /* gainean zaudenean, astiroago */
      p.t += dt * (P.platform === p ? 0.6 : 1);
      const left = DUST_LIFE - p.t;
      p.disc.material.opacity = left < 1.2 ? (Math.sin(time * 28) > 0 ? 0.55 : 0.12) : 0.55;
      p.m.rotation.y += dt * 0.4;
      if (left <= 0) starPlatformRemove(p);
    }
    /* lainoak: kulunka */
    for (const M of HAUTS.mists) {
      if (M.group !== ZONES[ZONE.cur].group) continue;
      for (const q of M.puffs) {
        q.s.position.y = q.y0 + Math.sin(time * 0.6 + q.ph) * 0.5;
        q.s.material.opacity = 0.1 + Math.sin(time * 0.9 + q.ph) * 0.04;
      }
      if (Math.random() < dt * 4) fxBurst(M.x + (Math.random() - 0.5) * M.w, M.y0 + 1 + Math.random() * 6, M.z + (Math.random() - 0.5) * M.d, { n: 1, speed: 0.2, up: 0.3, life: 1.6, size: 0.1, color: "#d9c8ff", grav: -0.1, drag: 1 });
    }
    /* kontatzaileak: zenbakiak buruaren gainean */
    for (const e of ENEMIES) {
      if (!(e.counting > 0) || e.state === "dead") continue;
      e.counting -= dt;
      e.countT = (e.countT || 0) + dt;
      e.stun = Math.max(e.stun, Math.min(0.2, e.counting));
      if (e.countT > 0.5) {
        e.countT = 0;
        e.countN = (e.countN || 0) + 1;
        damageNumber(e, String(e.countN), "#d9c8ff");
      }
    }
    gatesUpdate(dt);
  }
  /* IZARRAK botoia (ctxPower): hautsak zerbait egingo luke hemen? */
  function dustUseful() {
    const grp = ZONES[ZONE.cur].group;
    if (HAUTS.mists.some((M) => M.group === grp && Math.abs(P.x - M.x) < M.w / 2 + 5 && Math.abs(P.z - M.z) < M.d / 2 + 5)) return true;
    if (DUST_GATES.some((G) => G.group === grp && G.t <= 0 && Math.hypot(G.x - P.x, G.z - P.z) < 9)) return true;
    if (BOSS.on && BOSSK[BOSS.kind] && BOSSK[BOSS.kind].dust) return true;
    return ZONE.cur === "ametsa" && ENEMIES.some((e) => e.state !== "dead" && !(e.counting > 0) && Math.hypot(e.x - P.x, e.z - P.z) < 10);
  }
  function hautsaReset() {
    for (const p of HAUTS.plats.slice()) starPlatformRemove(p);
    for (const D of HAUTS.list) D.s.parent && D.s.parent.remove(D.s);
    HAUTS.list.length = 0;
  }
