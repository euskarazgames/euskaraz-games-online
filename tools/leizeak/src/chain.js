  /* ==================================================================
     SUGAARREN KATEA · lehen leizeko tresna (C tekla edo KATEA botoia)
     Suge-buruko katea jaurti:
       · suge-eraztun batera → Amaiur harantz tiratzen du (amildegiak gurutzatu);
       · kaxa batera → kaxa Amaiurrengana erakarri;
       · etsai batera → zorabiatu eta hurbildu.
     Etsai nagusiek ere eraztunak dituzte… (boss.js)
     ================================================================== */
  const CHAIN = { state: "idle", target: null, hx: 0, hy: 0, hz: 0, t: 0, links: [], head: null, rings: [] };
  const CHAIN_RANGE = 22;
  function chainInit() {
    const linkGeo = new T.TorusGeometry(0.11, 0.035, 5, 10),
      linkMat = material("#c9d6e3", 0.25);
    for (let i = 0; i < 22; i++) {
      const l = new T.Mesh(linkGeo, linkMat);
      l.visible = false;
      scene.add(l);
      CHAIN.links.push(l);
    }
    const head = new T.Group();
    const cone = new T.Mesh(new T.ConeGeometry(0.2, 0.5, 6), material("#5fd6a8", 0.6));
    cone.rotation.x = PI / 2;
    head.add(cone);
    const eye1 = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), new T.MeshBasicMaterial({ color: "#ffe066" }));
    eye1.position.set(0.08, 0.08, 0.05);
    head.add(eye1, eye1.clone());
    head.children[2].position.x = -0.08;
    head.visible = false;
    scene.add(head);
    CHAIN.head = head;
  }
  /* suge-eraztuna: harrizko eraztuna, suge kiribildu batekin (diseinu propioa) */
  function serpentRing(x, y, z, rot = 0) {
    const g = new T.Group();
    const stone = new T.Mesh(new T.TorusGeometry(0.7, 0.16, 8, 24), material("#7a8a7e"));
    g.add(stone);
    const snake = new T.Mesh(new T.TorusGeometry(0.7, 0.07, 6, 30, PI * 1.6), material("#5fd6a8", 0.5));
    snake.rotation.z = 0.4;
    g.add(snake);
    const head = new T.Mesh(new T.ConeGeometry(0.13, 0.32, 5), material("#5fd6a8", 0.6));
    head.position.set(0.55, 0.45, 0);
    head.rotation.z = -0.8;
    g.add(head);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7fe3c0", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    gl.scale.setScalar(2.8);
    g.add(gl);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    (BP || scene).add(g);
    const R = { kind: "ring", x, y, z, g, gl, group: BP };
    CHAIN.rings.push(R);
    return R;
  }
  const hasChain = () => saved.items.includes("katea");
  function chainCandidates() {
    const out = [],
      fa = P.angle,
      fx = Math.sin(fa),
      fz = Math.cos(fa),
      grp = ZONES[ZONE.cur].group;
    for (const R of CHAIN.rings) {
      if (R.group !== grp || R.off) continue;
      const dx = R.x - P.x,
        dz = R.z - P.z,
        d = Math.hypot(dx, dz);
      /* aurrean daudenak lehenik (atzekoak ia inoiz ez) */
      if (d < CHAIN_RANGE && d > 1.5 && Math.abs(R.y - P.y) < 12) out.push({ t: R, s: d * (2.2 - ((dx * fx + dz * fz) / d) * 1.8) });
    }
    for (const p of CRAFT.pieces)
      if (p.m.parent === grp && p.kind === "crate") {
        const dx = p.x - P.x,
          dz = p.z - P.z,
          d = Math.hypot(dx, dz);
        if (d < 14 && d > 3) out.push({ t: { kind: "crate", p, x: p.x, y: p.y - p.h / 2, z: p.z }, s: d * (1.8 - ((dx * fx + dz * fz) / d) * 0.9) + 4 });
      }
    const tgt = LOCK.target && !LOCK.target.boss ? LOCK.target : null;
    for (const e of ENEMIES)
      if (e.state !== "dead" && e.state !== "spawn") {
        const d = Math.hypot(e.x - P.x, e.z - P.z);
        if (d < 15) out.push({ t: { kind: "enemy", e, x: e.x, y: e.y + e.H, z: e.z }, s: e === tgt ? -10 : d + 3 });
      }
    if (BOSS.on && BOSS.ring && BOSS.ring.live()) {
      const w = BOSS.ring.pos(),
        d = Math.hypot(w.x - P.x, w.z - P.z);
      if (d < CHAIN_RANGE + 4) out.push({ t: { kind: "boss", x: w.x, y: w.y, z: w.z }, s: -20 });
    }
    return out.sort((a, b) => a.s - b.s).map((o) => o.t);
  }
  function chainFire() {
    if (!started || paused || !hasChain() || CHAIN.state !== "idle" || TXALA.on || CRAFT.on || respawnTimer) return;
    const t = chainCandidates()[0];
    if (!t) {
      notify(L("Ez dago suge-eraztunik irismenean."), "", 1.6);
      return;
    }
    CHAIN.target = t;
    CHAIN.state = "shoot";
    CHAIN.t = 0;
    const h = chainHand();
    Object.assign(CHAIN, { hx: h.x, hy: h.y, hz: h.z });
    P.angle = Math.atan2(t.x - P.x, t.z - P.z);
    SND.chain();
    coachDone("chain");
    castAnim && MAG.layer && castAnim("Spellcast_Shoot", 1.6, 1);
  }
  function chainHand() {
    return { x: P.x + Math.sin(P.angle) * 0.5, y: P.y + 1.35, z: P.z + Math.cos(P.angle) * 0.5 };
  }
  function chainTargetPos() {
    const t = CHAIN.target;
    if (t.kind === "crate") return { x: t.p.x, y: t.p.y - t.p.h / 2, z: t.p.z };
    if (t.kind === "enemy") return { x: t.e.x, y: t.e.y + t.e.H, z: t.e.z };
    if (t.kind === "boss") return BOSS.ring.pos();
    return { x: t.x, y: t.y, z: t.z };
  }
  /* move()-ek erabiltzen du: tiraka gaudenean abiadura */
  function chainPullVel() {
    const t = chainTargetPos(),
      dx = t.x - P.x,
      dy = t.y - 1.1 - P.y,
      dz = t.z - P.z,
      d = Math.hypot(dx, dy, dz) || 1;
    return { x: (dx / d) * 26, y: (dy / d) * 26, z: (dz / d) * 26, d };
  }
  function chainUpdate(dt) {
    if (CHAIN.state === "idle") {
      for (const l of CHAIN.links) l.visible = false;
      CHAIN.head.visible = false;
      for (const R of CHAIN.rings) if (R.group === ZONES[ZONE.cur].group) R.gl.material.opacity = hasChain() ? 0.45 + 0.25 * Math.sin(time * 3 + R.x) : 0.18;
      return;
    }
    CHAIN.t += dt;
    const hand = chainHand(),
      tp = chainTargetPos();
    if (CHAIN.state === "shoot") {
      const dx = tp.x - CHAIN.hx,
        dy = tp.y - CHAIN.hy,
        dz = tp.z - CHAIN.hz,
        d = Math.hypot(dx, dy, dz),
        step = 70 * dt;
      if (d <= step + 0.4) {
        CHAIN.hx = tp.x;
        CHAIN.hy = tp.y;
        CHAIN.hz = tp.z;
        chainHit();
      } else {
        CHAIN.hx += (dx / d) * step;
        CHAIN.hy += (dy / d) * step;
        CHAIN.hz += (dz / d) * step;
      }
      if (CHAIN.t > 0.6) CHAIN.state = "retract";
    } else if (CHAIN.state === "pull") {
      CHAIN.hx = tp.x;
      CHAIN.hy = tp.y;
      CHAIN.hz = tp.z;
      const v = chainPullVel();
      if (v.d < 0.9 || CHAIN.t > 1.6) {
        /* eraztunera iritsita: jauzi txiki bat gora, abiadura horizontalik gabe (zutabe gainean geratzeko) */
        CHAIN.state = "retract";
        P.vy = 7.5;
        P.vx = P.vz = 0;
        P.jumps = 1;
        P.dashReady = true;
        P.dashes = Math.max(P.dashes, 1);
        FB.jump(2);
      }
    } else if (CHAIN.state === "drag") {
      const p = CHAIN.target.p,
        list = groupOf(p),
        dx = P.x - p.x,
        dz = P.z - p.z,
        d = Math.hypot(dx, dz);
      CHAIN.hx = p.x;
      CHAIN.hy = p.y - p.h / 2;
      CHAIN.hz = p.z;
      if (d > 2.8 && CHAIN.t < 2) {
        const sx = (dx / d) * 12 * dt,
          sz = (dz / d) * 12 * dt;
        for (const q of list) {
          q.x += sx;
          q.z += sz;
          q.y = Math.max(q.y, P.y + q.h + 0.2);
        }
      } else {
        settle(list);
        SND.thud();
        CHAIN.state = "retract";
      }
    } else if (CHAIN.state === "retract") {
      const dx = hand.x - CHAIN.hx,
        dy = hand.y - CHAIN.hy,
        dz = hand.z - CHAIN.hz,
        d = Math.hypot(dx, dy, dz),
        step = 80 * dt;
      if (d <= step) CHAIN.state = "idle";
      else {
        CHAIN.hx += (dx / d) * step;
        CHAIN.hy += (dy / d) * step;
        CHAIN.hz += (dz / d) * step;
      }
    }
    /* katea marraztu: eskutik burura */
    const n = CHAIN.links.length;
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n,
        l = CHAIN.links[i];
      l.visible = true;
      l.position.set(mix(hand.x, CHAIN.hx, k), mix(hand.y, CHAIN.hy, k) + Math.sin(k * PI) * (CHAIN.state === "shoot" ? 0.2 : 0), mix(hand.z, CHAIN.hz, k));
      l.rotation.set(time * 3 + i, i % 2 ? PI / 2 : 0, 0);
    }
    CHAIN.head.visible = true;
    CHAIN.head.position.set(CHAIN.hx, CHAIN.hy, CHAIN.hz);
    CHAIN.head.lookAt(CHAIN.hx * 2 - hand.x, CHAIN.hy * 2 - hand.y, CHAIN.hz * 2 - hand.z);
  }
  function chainHit() {
    const t = CHAIN.target;
    CHAIN.t = 0;
    SND.clang();
    fxBurst(CHAIN.hx, CHAIN.hy, CHAIN.hz, { n: 14, speed: 3, life: 0.4, size: 0.25, color: "#7fe3c0", grav: 1 });
    if (t.kind === "ring") {
      CHAIN.state = "pull";
      P.grounded = false;
      P.platform = null;
      P.dashT = 0;
    } else if (t.kind === "crate") {
      if (P.platform && groupOf(t.p).includes(P.platform)) CHAIN.state = "retract";
      else CHAIN.state = "drag";
    } else if (t.kind === "enemy") {
      const e = t.e;
      e.stun = Math.max(e.stun, 1.8);
      if (e.state === "wind" || e.state === "charge") {
        e.state = "recover";
        e.t = 0;
      }
      const dx = P.x - e.x,
        dz = P.z - e.z,
        d = Math.hypot(dx, dz) || 1;
      e.vx += (dx / d) * 9;
      e.vz += (dz / d) * 9;
      CHAIN.state = "retract";
      notifyOnce("chain-stun", L("Katea: etsaia zorabiatuta!"), "");
    } else if (t.kind === "boss") {
      BOSS.chained();
      CHAIN.state = "retract";
    }
  }
