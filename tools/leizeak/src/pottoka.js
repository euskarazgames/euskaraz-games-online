  /* ==================================================================
     POTTOKA · Beltxa, Joanesen pottoka (diseinu propioa, prozedurala)
     · Hasieran basati dabil ipar-larreetan: hurbiltzean ihes egiten du.
     · Joanesek POTTOKA erritmoa irakasten du ardiak itzuli ondoren (◀ ▶ ◀ ◀):
       haranean jotzean, Beltxa lauhazka etortzen da.
     · E: igo / jaitsi. Zaldiz: azkarrago (Shift: lauhazka), jauzi luzea (hesiak),
       sorginkeria jaurti daiteke; ez bultzadarik ez katerik. Leizeetara ez da sartzen.
     ================================================================== */
  const POTT = { g: null, legs: [], neck: null, tail: null, x: 20, z: -40, y: 0, a: 0, state: "wild", ph: 0, sp: 0, t: 0, graze: 0, hoof: 0, wantX: 20, wantZ: -40, solid: null, bob: 0 };
  const PONY_HOME = { x: 20, z: -40 }; /* ipar-larreak */
  const PONY_S = 1.32,
    SADDLE = 1.05 * PONY_S;
  const ponyTamed = () => saved.rhythms.includes("pottoka");
  function buildPottoka() {
    zoneBuild("ibarra");
    const COAT = "#3b2a22",
      DARK = "#16110e",
      MUZZLE = "#5a4636",
      mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      mesh = (parts, parent) => {
        const m = new T.Mesh(mergeColored(parts), mat);
        m.castShadow = true;
        parent.add(m);
        return m;
      },
      g = new T.Group();
    /* gorputza (hiru elipsoide), zela gorria eta oihal zuria: marrazketa-dei bakarra */
    mesh(
      [
        [at(new T.SphereGeometry(0.5, 14, 10), 0, 1.0, 0, 0, 0, 0, 0.86, 0.76, 1.5), COAT],
        [at(new T.SphereGeometry(0.43, 12, 9), 0, 1.04, 0.56), COAT],
        [at(new T.SphereGeometry(0.45, 12, 9), 0, 1.06, -0.6), COAT],
        [at(new T.BoxGeometry(0.62, 0.1, 0.62), 0, 1.42, 0.02), "#a8332a"],
        [at(new T.BoxGeometry(0.8, 0.03, 0.82), 0, 1.36, 0.02), "#efe6d2"],
      ],
      g,
    );
    /* lepoa, zurda eta burua (lepoarekin batera mugitzen dira) */
    const neck = new T.Group();
    neck.position.set(0, 1.28, 0.78);
    g.add(neck);
    const np = [[at(new T.CylinderGeometry(0.17, 0.25, 0.85, 10), 0, 0.36, 0.12, 0.62), COAT]];
    for (let i = 0; i < 6; i++) np.push([at(new T.BoxGeometry(0.07, 0.2, 0.16), 0, 0.18 + i * 0.12, -0.1 + i * 0.07, 0.62), DARK]);
    np.push([at(new T.BoxGeometry(0.26, 0.3, 0.56), 0, 0.74, 0.6, 0.55), COAT], [at(new T.BoxGeometry(0.22, 0.2, 0.2), 0, 0.58, 0.84, 0.55), MUZZLE], [at(new T.BoxGeometry(0.05, 0.16, 0.12), 0, 0.9, 0.46), DARK]);
    for (const s of [-1, 1]) np.push([at(new T.ConeGeometry(0.05, 0.16, 5), s * 0.09, 0.94, 0.38, 0, 0, -s * 0.2), COAT], [at(new T.SphereGeometry(0.035, 6, 5), s * 0.12, 0.78, 0.58), DARK]);
    mesh(np, neck);
    /* isatsa */
    const tail = new T.Group();
    tail.position.set(0, 1.18, -1.02);
    g.add(tail);
    mesh([0, 1, 2].map((i) => [at(new T.ConeGeometry(0.09 - i * 0.015, 0.7, 6), (i - 1) * 0.04, -0.32, -0.05, Math.PI + 0.25), DARK]), tail);
    /* hankak: aldaka → belauna → apatxa (bi zati hanka bakoitzeko) */
    const legs = [];
    for (const [lx, lz, front] of [[-0.24, 0.55, 1], [0.24, 0.55, 1], [-0.24, -0.6, 0], [0.24, -0.6, 0]]) {
      const hip = new T.Group();
      hip.position.set(lx, 0.98, lz);
      g.add(hip);
      mesh([[at(new T.CylinderGeometry(0.1, 0.08, 0.5, 7), 0, -0.25, 0), COAT]], hip);
      const knee = new T.Group();
      knee.position.y = -0.5;
      hip.add(knee);
      mesh([[at(new T.CylinderGeometry(0.065, 0.06, 0.42, 6), 0, -0.21, 0), COAT], [at(new T.CylinderGeometry(0.08, 0.09, 0.08, 7), 0, -0.44, 0.01), DARK]], knee);
      legs.push({ hip, knee, front, off: front ? (lx < 0 ? 0 : 0.35) : lx < 0 ? Math.PI : Math.PI + 0.35 });
    }
    g.scale.setScalar(PONY_S);
    BP.add(g);
    POTT.g = g;
    Object.assign(POTT, { legs, neck, tail });
    const at0 = saved.ponyAt || PONY_HOME;
    POTT.x = at0.x;
    POTT.z = at0.z;
    POTT.y = nightGround(POTT.x, POTT.z, 30);
    POTT.state = ponyTamed() ? "idle" : "wild";
    POTT.solid = { x: POTT.x, z: POTT.z, r: 0.85, h: 1.9, y: POTT.y, pillar: true };
    solids.push(POTT.solid);
    ponyPlace();
  }
  function ponyPlace() {
    POTT.g.position.set(POTT.x, POTT.y + POTT.bob, POTT.z);
    POTT.g.rotation.y = POTT.a;
    POTT.solid.x = POTT.x;
    POTT.solid.z = POTT.z;
    POTT.solid.y = POTT.y;
    /* zaldiz edo etortzen: talka-gorputzik ez (r < 0: inoiz ez du bultzatzen) */
    POTT.solid.r = P.riding || POTT.state === "come" ? -1 : 0.85;
  }
  /* zubiaren oholtza: plataforma bat (ez lurra, ez izotza, ez horma) puntu honetan; ertzetan tarte
     txikiarekin (arkuaren zatien arteko junturan support()-ek ez du ezer aurkitzen) */
  function deckAt(x, z, feet) {
    let best = null,
      by = -1e9;
    for (const s of platforms) {
      if (s.off || s.ground || s.ice || s.wall || (s.phase !== -1 && s.phase !== phase) || !contains(s, x, z, 0.15)) continue;
      const y = topY(s, x, z);
      if (y <= feet + 0.4 && y > by) (best = s), (by = y);
    }
    return best;
  }
  /* lurraren gainean (ez ibaian; herrian bai) */
  function ponyStep(nx, nz) {
    /* eraikinak: hormaren luzeran irristatu (ez zeharkatu) */
    for (const o of solids)
      if (o.shapes)
        for (const B of o.shapes) {
          const q = shapePush(B, nx, nz, 0.9);
          if (q) [nx, nz] = q;
        }
    /* zubiaren oholtza (plataforma): ibaiaren gainetik pasa daiteke */
    const d0 = deckAt(nx, nz, POTT.y + 1.2),
      s = d0 || support(nx, nz, POTT.y + 1.2),
      deck = !!d0,
      ty = s ? topY(s, nx, nz) : gy(nx, nz);
    if (walkSD(nx, nz) < 0.8 || (!deck && riverW(nx, nz) < 0.8) || ty - POTT.y > 0.7) return false;
    POTT.x = nx;
    POTT.z = nz;
    POTT.y = ty;
    return true;
  }
  /* hanken animazioa: sp (m/s) → urratsak */
  function ponyAnim(dt, sp) {
    const gal = clamp(sp / 10, 0, 1),
      walk = clamp(sp / 2.5, 0, 1);
    POTT.ph += dt * (1.6 + sp * 1.05);
    for (const L0 of POTT.legs) {
      const s = Math.sin(POTT.ph + L0.off);
      L0.hip.rotation.x = s * mix(0.28, 0.75, gal) * walk;
      L0.knee.rotation.x = (L0.front ? -1 : 1) * Math.max(0, L0.front ? s : -s) * mix(0.4, 1.1, gal) * walk;
    }
    POTT.bob = Math.abs(Math.sin(POTT.ph)) * 0.09 * gal;
    POTT.neck.rotation.x = Math.sin(POTT.ph * 2) * 0.06 * gal + (POTT.graze > 0 ? 0.9 * Math.min(1, POTT.graze) : 0);
    POTT.tail.rotation.x = 0.3 * gal + Math.sin(time * 1.3) * 0.08;
    POTT.tail.rotation.z = Math.sin(time * 0.9) * 0.15;
    /* lauhazkaren hotsa */
    if (gal > 0.2 && ZONE.cur === "ibarra") {
      POTT.hoof += dt * (1.6 + sp * 1.05);
      if (POTT.hoof > PI) {
        POTT.hoof -= PI;
        const d = Math.hypot(P.x - POTT.x, P.z - POTT.z);
        if (d < 30) SND.hoof(clamp(1 - d / 30, 0.1, 1));
      }
    }
  }
  /* tick-etik (haranean) */
  function pottokaUpdate(dt) {
    if (!POTT.g) return;
    POTT.g.visible = ZONE.cur === "ibarra";
    if (ZONE.cur !== "ibarra") return;
    POTT.t += dt;
    if (P.riding) {
      POTT.x = P.x;
      POTT.z = P.z;
      POTT.y = P.y;
      POTT.a = P.angle;
      POTT.graze = 0;
      ponyAnim(dt, P.grounded ? Math.hypot(P.vx, P.vz) : 4);
      ponyPlace();
      return;
    }
    const dp = Math.hypot(P.x - POTT.x, P.z - POTT.z);
    let sp = 0,
      tx = POTT.wantX,
      tz = POTT.wantZ;
    if (POTT.state === "wild") {
      /* basati: larrean ibili, Amaiur hurbiltzean ihes */
      if (dp < 7 && !cinematic) {
        tx = POTT.x + ((POTT.x - P.x) / (dp || 1)) * 8;
        tz = POTT.z + ((POTT.z - P.z) / (dp || 1)) * 8;
        sp = 7.5;
        if (!POTT.fled) {
          POTT.fled = true;
          SND.neigh(0.6);
          notifyOnce("pottoka-basati", L("Pottoka beltz bat! Ez du inor hurbiltzen uzten… norbaitek ezagutuko du."), "");
        }
      } else {
        POTT.fled = false;
        if (Math.hypot(tx - POTT.x, tz - POTT.z) < 0.5 || POTT.t > 9) {
          POTT.t = 0;
          const a = Math.random() * TAU,
            r = Math.random() * 9;
          POTT.wantX = PONY_HOME.x + Math.cos(a) * r;
          POTT.wantZ = PONY_HOME.z + Math.sin(a) * r;
          POTT.graze = Math.random() < 0.6 ? 3 : 0;
        }
        sp = POTT.graze > 0 ? 0 : 1.6;
      }
    } else if (POTT.state === "come") {
      /* nabigazio-sarea (Recast): etxeak, harkaitzak eta ibaia inguratu (zubitik) */
      const c = navCorner(POTT, P.x, P.y, P.z);
      tx = c ? c[0] : P.x;
      tz = c ? c[1] : P.z;
      sp = dp > 6 ? 11 : 4;
      if (dp < 2.6) {
        POTT.state = "idle";
        POTT.wantX = POTT.x;
        POTT.wantZ = POTT.z;
        SND.neigh(0.8);
      }
    } else {
      /* zain: bazka, noizean behin pauso batzuk */
      if (POTT.t > 7) {
        POTT.t = 0;
        POTT.graze = Math.random() < 0.7 ? 3.5 : 0;
        if (!POTT.graze) {
          const a = Math.random() * TAU;
          POTT.wantX = POTT.x + Math.cos(a) * 2.5;
          POTT.wantZ = POTT.z + Math.sin(a) * 2.5;
        }
      }
      sp = POTT.graze > 0 ? 0 : 1.2;
    }
    POTT.graze = Math.max(0, POTT.graze - dt);
    const dx = tx - POTT.x,
      dz = tz - POTT.z,
      dd = Math.hypot(dx, dz);
    let moved = 0;
    if (sp > 0 && dd > 0.3) {
      const want = Math.atan2(dx, dz);
      POTT.a += Math.atan2(Math.sin(want - POTT.a), Math.cos(want - POTT.a)) * Math.min(1, dt * 5);
      const st = Math.min(dd, sp * dt),
        nx = POTT.x + Math.sin(POTT.a) * st,
        nz = POTT.z + Math.cos(POTT.a) * st;
      if (ponyStep(nx, nz)) moved = st / dt;
      else if (POTT.state === "come" && dp > 40) {
        /* bidea itxita eta urrun: atzetik agertu */
        ponyArrive(18);
      } else {
        POTT.wantX = POTT.x;
        POTT.wantZ = POTT.z;
      }
    }
    POTT.sp = mix(POTT.sp, moved, 1 - Math.exp(-dt * 8));
    ponyAnim(dt, POTT.sp);
    ponyPlace();
  }
  /* Amaiurren atzean agertu (urrun badago) */
  function ponyArrive(r) {
    for (let k = 0; k < 16; k++) {
      const a = P.angle + PI + (k % 2 ? 1 : -1) * Math.floor(k / 2) * 0.4,
        x = P.x + Math.sin(a) * r,
        z = P.z + Math.cos(a) * r;
      if (walkSD(x, z) < 2 || riverW(x, z) < 1.5) continue;
      const y = nightGround(x, z, P.y + 2);
      if (Math.abs(y - P.y) > 3) continue;
      Object.assign(POTT, { x, z, y, a: Math.atan2(P.x - x, P.z - z) });
      return true;
    }
    return false;
  }
  /* POTTOKA erritmoa (txalaparta.js-ko rhythmEffect-etik) */
  function pottokaCall() {
    if (ZONE.cur !== "ibarra") return notify(L("Leizean ez dago pottokarentzat lekurik."), "", 2.6);
    if (P.riding) return notify(L("Beltxa zure azpian dago!"), "", 2);
    const d = Math.hypot(P.x - POTT.x, P.z - POTT.z);
    if (d > 45) ponyArrive(24);
    POTT.state = "come";
    POTT.graze = 0;
    SND.neigh(1);
    fxRing(P.x, P.y + 0.2, P.z, "#c98a5a", 10, 0.8);
    notify(L("Beltxa lauhazka dator!"), "", 2.4);
  }
  const ponyNear = () => !P.riding && ponyTamed() && POTT.g && ZONE.cur === "ibarra" && POTT.state !== "come" && Math.hypot(P.x - POTT.x, P.z - POTT.z) < 2.8 && Math.abs(P.y - POTT.y) < 1.6;
  function ponyMount() {
    if (P.riding || CRAFT.on || CHAIN.state !== "idle") return;
    P.riding = true;
    P.x = POTT.x;
    P.z = POTT.z;
    P.angle = POTT.a;
    P.vx = P.vz = 0;
    P.dashT = 0;
    SND.neigh(0.9);
    fxBurst(P.x, P.y + 1.2, P.z, { n: 14, speed: 2, up: 2, life: 0.6, size: 0.25, color: "#e8d3b0", grav: 3 });
    notifyOnce("pottoka-igo", mobile ? L("BELTXA · makila ertzeraino: lauhazka · JAUZI: jauzi luzea · JAITSI botoia") : L("BELTXA · Shift: lauhazka · ␣: jauzi luzea · E: jaitsi"), "");
    coachDone("pottoka");
    hud();
  }
  function ponyDismount(quiet) {
    if (!P.riding) return;
    P.riding = false;
    POTT.state = "idle";
    POTT.t = 0;
    Object.assign(POTT, { x: P.x, z: P.z, y: P.y, a: P.angle, wantX: P.x, wantZ: P.z });
    /* Amaiur alboan jaitsi */
    const sx = P.x + Math.cos(P.angle) * 1.3,
      sz = P.z - Math.sin(P.angle) * 1.3;
    if (walkSD(sx, sz) > 0.6 && riverW(sx, sz) > 0.6) {
      P.x = sx;
      P.z = sz;
    }
    saved.ponyAt = { x: +POTT.x.toFixed(1), z: +POTT.z.toFixed(1) };
    persist();
    ponyPlace();
    if (!quiet) SND.thud();
    hud();
  }
  /* move()-tik: zalditik jarlekuaren altuera (Amaiur gora) */
  const riderY = () => (P.riding ? SADDLE + POTT.bob * PONY_S : 0);
  /* Joanes: ardiak itzuli ondoren, Beltxaren erritmoa */
  function joanesPony(N, f) {
    if (!f("ardiak-saria") || ponyTamed()) return false;
    talk(
      N,
      [
        ["JOANES", "Ardiak etxean… baina Beltxa, nire pottoka, oraindik basati dabil ipar-larreetan."],
        ["JOANES", "Basajaun isildu zenetik ez dio inori kasurik egiten. Nire aitonaren erritmoa bakarrik ezagutzen du."],
        ["JOANES", "Entzun ondo. Jo ezazu haranean, eta etorriko zaizu. Zaindu: zure laguna izango da."],
      ],
      () =>
        txalaLearn("pottoka", "JOANES", () => {
          POTT.state = "idle";
          notify(L("POTTOKA: jo haranean, eta Beltxa lauhazka etorriko da.") + (mobile ? L(" IGO / JAITSI botoiarekin.") : L(" E: igo / jaitsi.")), "", 6);
        }),
    );
    return true;
  }
