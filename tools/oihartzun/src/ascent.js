  /* ==================================================================
     ORRATZA · Gauekoren erlojurako igoera (Celeste-ren estiloan)
     Laugarren uhartetik (y 11) erlojuraino (y 42), hodeien gainera.
     · Basaltozko harri hegalariak, garai bakoitzeko kristal-harriak,
       DASH kristal berdeak, harri erorkorrak eta haize-korronte bat.
     · Errun bat: sorginkeriaz jo, eta espiritu-harriak agertzen dira
       hamar segundoz.
     · Hiru kanpai (gordetze-puntuak): erortzean azken kanpaian
       berragertzen zara, bizitzarik galdu gabe. Erorketak kontatzen dira.
     Koordenatuak: u = pantailaren eskuinera, w = kamerarantz (sakonera).
     ================================================================== */
  const ASC = { O: { x: -19, z: -145 }, list: [], cps: [], cp: -1, falls: 0, slabs: [], winds: [], spirits: [], rune: null, page: null, inZone: false, windT: 0, hud: "", spiritT: 0, tickN: -1, built: false };
  const ascAt = (u, w) => ({ x: ASC.O.x + u * 0.83 + w * 0.557, z: ASC.O.z - u * 0.557 + w * 0.83 });
  /* [mota, u, y, w, erradioa, gehigarria] · col: gehigarria = kanpaiaren zenbakia */
  const ASC_DEF = [
    ["col", -4, 11.6, 1.2, 2.0, 0],
    ["col", -0.6, 13.6, 0.2, 1.6],
    ["col", 2.9, 15.8, -0.4, 1.5],
    ["col", -0.2, 18.0, -1.4, 1.5],
    ["era", -3.6, 20.0, -0.6, 1.4, 0],
    ["era", -0.6, 22.0, 0.5, 1.4, 1],
    ["col", 3.1, 23.5, -0.4, 2.1, 1],
    ["crystal", 7.4, 25.4, 0],
    ["slab", 12.2, 24.6, -0.3, 1.5],
    ["slab", 9.4, 26.9, -2.2, 1.4],
    ["col", 6.0, 28.5, -3.0, 1.6],
    ["crystal", 13.2, 29.2, 0.2],
    ["page", 16.2, 30.4, 1.2, 1.15],
    ["wind", 2.4, 27.2, -3.6, 1.7, 38.6],
    ["col", 6.4, 35.6, -6.4, 1.9, 2],
    ["rune", 8.8, 39.8, -5.2],
    ["spirit", 9.6, 37.7, -6.2, 1.3],
    ["spirit", 12.7, 39.7, -6.3, 1.3],
  ];
  const ASC_SPIRIT_TIME = 10;
  function hexRock(r, h, top, side) {
    const g = new T.Group(),
      body = new T.Mesh(new T.CylinderGeometry(r, r * 0.42, h, 6, 1), new T.MeshStandardMaterial({ color: side, roughness: 0.92, flatShading: true }));
    body.position.y = -h / 2 - 0.12;
    body.castShadow = true;
    body.receiveShadow = true;
    const cap = new T.Mesh(new T.CylinderGeometry(r * 1.02, r, 0.24, 6, 1), new T.MeshStandardMaterial({ color: top, roughness: 0.85, flatShading: true }));
    cap.position.y = -0.12;
    cap.receiveShadow = true;
    g.add(body, cap);
    return g;
  }
  function buildAscent() {
    const basalt = "#3f4650",
      topStone = "#b9b4a2";
    for (const [kind, u, y, w, r, extra] of ASC_DEF) {
      const { x, z } = ascAt(u, w);
      if (kind === "col" || kind === "page") {
        const m = hexRock(r, kind === "page" ? 1.6 : 2.6 + (r > 1.8 ? 1.2 : 0), topStone, basalt);
        m.position.set(x, y, z);
        m.rotation.y = u * 0.7;
        scene.add(m);
        const s = { x, z, y, rx: r, rz: r, phase: -1, asc: true, m, kind };
        platforms.push(s);
        ASC.list.push(s);
        if (kind === "col" && extra !== undefined) {
          /* kanpai txikia: gordetze-puntua */
          const post = box(x - r * 0.55, y + 0.75, z - r * 0.35, 0.12, 1.5, 0.12, "#5a4a3a");
          const bell = obj(new T.CylinderGeometry(0.12, 0.3, 0.42, 10, 1, true), new T.MeshStandardMaterial({ color: "#8a8f96", metalness: 0.7, roughness: 0.35, side: T.DoubleSide }));
          bell.position.set(x - r * 0.55, y + 1.38, z - r * 0.35);
          const halo = glow(x - r * 0.55, y + 1.4, z - r * 0.35, "#9fd6ff", 1.6);
          halo.material.opacity = 0.25;
          ASC.cps[extra] = { k: extra, s, x, y, z, bell, halo, post, rung: false };
        }
        if (kind === "page") ASC.pageRock = s;
      } else if (kind === "era") {
        /* garai bateko kristal-harria: ikusi bai, sendo bakarrik bere garaian */
        const col = extra === 0 ? "#ffc27a" : "#8fe8ff";
        const m = new T.Mesh(new T.CylinderGeometry(r, r * 0.25, 1.4, 6, 1), new T.MeshStandardMaterial({ color: col, emissive: new T.Color(col), emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }));
        m.geometry.translate(0, -0.7, 0);
        m.position.set(x, y, z);
        m.castShadow = true;
        scene.add(m);
        const ghost = new T.Mesh(m.geometry, new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.22 }));
        ghost.position.copy(m.position);
        scene.add(ghost);
        const s = { x, z, y, rx: r, rz: r, phase: extra, asc: true, m, ghost, baseX: x, baseZ: z, dx: 0, dz: 0, kind };
        platforms.push(s);
        phaseObjects.push(s);
        ASC.list.push(s);
      } else if (kind === "slab") {
        /* harri erorkorra: zapaldu eta 0.55 s geroago erortzen da */
        const m = hexRock(r, 0.9, "#a88f70", "#5b4a3c");
        m.position.set(x, y, z);
        scene.add(m);
        const cracks = new T.Mesh(new T.RingGeometry(r * 0.3, r * 0.95, 6, 1), new T.MeshBasicMaterial({ color: "#2a1f17", transparent: true, opacity: 0.55, depthWrite: false }));
        cracks.rotation.x = -PI / 2;
        cracks.position.y = 0.012;
        m.add(cracks);
        const s = { x, z, y, rx: r, rz: r, phase: -1, asc: true, m, slab: { st: "idle", t: 0 }, kind };
        platforms.push(s);
        ASC.slabs.push(s);
        ASC.list.push(s);
      } else if (kind === "crystal") {
        const m = orb(x, y, z, 0.34, "#b3ffc9");
        buildCrystals.push({ x, z, y, m, cool: 0 });
      } else if (kind === "wind") {
        /* haize-korrontea: zurrunbilo argitsua eta gorantz doazen partikulak */
        const h = extra - y;
        const tex = fallTexture();
        tex.repeat.set(3, h / 6);
        const m = new T.Mesh(new T.CylinderGeometry(r, r * 0.8, h, 20, 1, true), new T.MeshBasicMaterial({ map: tex, color: "#cfefff", transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
        m.position.set(x, y + h / 2, z);
        scene.add(m);
        const ring0 = ring(x, y, z, r, "#cfefff");
        ring0.material = new T.MeshBasicMaterial({ color: "#cfefff", transparent: true, opacity: 0.5 });
        ASC.winds.push({ x, z, r, y0: y, y1: extra, m, tex });
      } else if (kind === "rune") {
        const v = runeMesh(x, y, z, "#b48cff");
        v.ghost.visible = false;
        ASC.rune = { rune: true, x, y, z, r: 0.9, lit: false, t: 0, ...v, live: () => ASC.inZone || P.y > 30, hit: () => runeLit() };
        RUNES.push(ASC.rune);
      } else if (kind === "spirit") {
        const m = new T.Mesh(new T.CylinderGeometry(r, r * 0.3, 0.9, 6, 1), new T.MeshStandardMaterial({ color: "#e8dcff", emissive: new T.Color("#b48cff"), emissiveIntensity: 0.9, transparent: true, opacity: 0, roughness: 0.3, flatShading: true }));
        m.geometry.translate(0, -0.45, 0);
        m.position.set(x, y, z);
        scene.add(m);
        const ghost = new T.Mesh(m.geometry, new T.MeshBasicMaterial({ color: "#c9a8ff", wireframe: true, transparent: true, opacity: 0.18 }));
        ghost.position.copy(m.position);
        scene.add(ghost);
        const s = { x, z, y, rx: r, rz: r, phase: 9, asc: true, m, ghost, spirit: true, kind };
        platforms.push(s);
        ASC.spirits.push(s);
        ASC.list.push(s);
      }
    }
    /* Orratza: hodeietaraino doan harri-zutabea (atzealdea, ez da ukitzen) */
    const n = ascAt(8, -13),
      needle = obj(new T.CylinderGeometry(3.6, 6.4, 49, 9, 6), rockMaterial());
    const a = needle.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const k = 1 + 0.08 * Math.sin(a.getY(i) * 0.7 + Math.atan2(a.getZ(i), a.getX(i)) * 3);
      a.setX(i, a.getX(i) * k);
      a.setZ(i, a.getZ(i) * k);
    }
    needle.geometry.computeVertexNormals();
    needle.position.set(n.x, -9 + 24.5, n.z);
    /* kateak: Orratzetik erlojuaren uhartera */
    const chainMat = new T.MeshStandardMaterial({ color: "#2c2a30", metalness: 0.8, roughness: 0.4 });
    for (const [tx, tz] of [
      [-8, -168],
      [-14, -176],
    ]) {
      const p0 = new T.Vector3(n.x, 38.5, n.z),
        p1 = new T.Vector3(tx, BOSS_Y - 0.6, tz),
        mid = p0.clone().lerp(p1, 0.5);
      mid.y -= 2.2;
      const curve = new T.QuadraticBezierCurve3(p0, mid, p1);
      scene.add(new T.Mesh(new T.TubeGeometry(curve, 24, 0.09, 5, false), chainMat));
    }
    /* egunkari-orria (hautazkoa): harri urrunean */
    const pr = ASC.pageRock;
    if (pr) ASC.page = journalPickup(2, pr.x, pr.y + 1.2, pr.z);
    ASC.built = true;
  }
  /* --------------------------- eguneratzea --------------------------- */
  function ascZone(x = P.x, z = P.z, y = P.y) {
    const dx = x - ASC.O.x,
      dz = z - ASC.O.z,
      u = dx * 0.83 - dz * 0.557,
      w = dx * 0.557 + dz * 0.83;
    return u > -8.5 && u < 19 && w > -10 && w < 4.5 && y > 10.4 && y < 44;
  }
  /* haize-korrontea: goranzko azelerazioa (0 kanpoan) */
  function ascLift(x, z, y) {
    for (const W of ASC.winds) {
      if (Math.hypot(x - W.x, z - W.z) > W.r || y < W.y0 - 1 || y > W.y1 + 1.6) continue;
      return y < W.y1 ? 62 : 62 * (1 - (y - W.y1) / 1.6);
    }
    return 0;
  }
  function runeLit() {
    const R = ASC.rune;
    if (!R || R.lit) return;
    R.lit = true;
    R.t = ASC_SPIRIT_TIME;
    ASC.tickN = -1;
    for (const s of ASC.spirits) {
      s.phase = -1;
      fxBurst(s.x, s.y, s.z, { n: 18, speed: 3, up: 2, life: 0.7, size: 0.35, color: "#d9c2ff", grav: -1 });
    }
    SND.rune(true);
    shiftFlash = 0.5;
    haptic(25);
    notify("Erruna piztuta: espiritu-harriak 10 segundoz!", "Runa encendida: ¡piedras espirituales durante 10 segundos!", 3);
    coachDone("rune");
  }
  function ascRespawn() {
    const C = ASC.cps[Math.max(0, ASC.cp)];
    ASC.falls++;
    saved.ascFalls = (saved.ascFalls || 0) + 1;
    teleport(C.x, C.z, C.y);
    P.angle = PI * 0.8;
    shiftFlash = 0.75;
    damageTime = 0.6;
    FB.respawn();
    haptic(25);
    if (C.k === 2 && ASC.rune && !ASC.rune.lit) notifyOnce("rune-hint", "Erruna jo SORGINKERIArekin: espiritu-harriak agertuko dira.", "Golpea la runa con un HECHIZO: aparecerán piedras espirituales.");
  }
  function ascentUpdate(dt) {
    if (!ASC.built) return;
    ASC.inZone = ascZone() && P.platform?.island === undefined;
    /* gordetze-puntuak */
    for (const C of ASC.cps)
      if (C && P.grounded && P.platform === C.s && ASC.cp < C.k) {
        ASC.cp = C.k;
        C.rung = true;
        C.bell.material = new T.MeshStandardMaterial({ color: "#f2c46d", metalness: 0.8, roughness: 0.3, side: T.DoubleSide, emissive: new T.Color("#7a4f10") });
        C.halo.material.color.set("#ffd27a");
        C.halo.material.opacity = 0.6;
        SND.memory();
        fxRing(C.x, C.y + 0.1, C.z, "#ffd27a", 4, 0.6);
        ascLine(C.k);
      }
    /* kanpaiak kulunkatu */
    for (const C of ASC.cps) if (C) C.bell.rotation.z = Math.sin(time * 2.2 + C.k) * (C.rung ? 0.25 : 0.06);
    /* harri erorkorrak */
    for (const s of ASC.slabs) {
      const S = s.slab;
      if (S.st === "idle" && P.grounded && P.platform === s) {
        S.st = "shake";
        S.t = 0;
        SND.crumble();
      } else if (S.st === "shake") {
        S.t += dt;
        s.m.position.set(s.x + (Math.random() - 0.5) * 0.12, s.y, s.z + (Math.random() - 0.5) * 0.12);
        if (S.t > 0.55) {
          S.st = "fall";
          S.t = 0;
          s.phase = 9;
          if (P.platform === s) {
            P.platform = null;
            P.grounded = false;
          }
          fxBurst(s.x, s.y - 0.3, s.z, { n: 16, speed: 3, up: 1, life: 0.8, size: 0.35, color: "#8a7258", grav: 9 });
        }
      } else if (S.st === "fall") {
        S.t += dt;
        s.m.position.y = s.y - S.t * S.t * 9;
        s.m.rotation.z = S.t * 0.8;
        s.m.visible = S.t < 1.4;
        if (S.t > 2.6) {
          S.st = "idle";
          s.phase = -1;
          s.m.visible = true;
          s.m.rotation.z = 0;
          s.m.position.set(s.x, s.y, s.z);
          fxBurst(s.x, s.y, s.z, { n: 12, speed: 2, up: 1, life: 0.5, size: 0.3, color: "#d8c6a8", grav: -1 });
        }
      }
    }
    /* haizea: ikusmena eta soinua */
    for (const W of ASC.winds) W.tex.offset.y -= dt * 1.4;
    const lift = ascLift(P.x, P.z, P.y);
    ASC.windT -= dt;
    if (lift > 0) {
      if (ASC.windT <= 0) {
        SND.wind(1);
        ASC.windT = 0.45;
      }
      coachDone("wind");
    }
    for (const W of ASC.winds)
      if (frame % 3 === 0 && Math.hypot(P.x - W.x, P.z - W.z) < 30) {
        const a = Math.random() * TAU,
          r = Math.random() * W.r;
        fxBurst(W.x + Math.cos(a) * r, W.y0 + Math.random() * 2, W.z + Math.sin(a) * r, { n: 1, speed: 0.2, up: 9, life: 1.2, size: 0.22, color: "#e6f6ff", grav: -2, drag: 0.5 });
      }
    /* erruna eta espiritu-harriak */
    const R = ASC.rune;
    if (R) {
      R.g.rotation.y += dt * (R.lit ? 3 : 0.8);
      R.g.position.y = R.y + Math.sin(time * 2) * 0.15;
      R.stone.material.emissiveIntensity = R.lit ? 1.6 : 0.5 + Math.sin(time * 4) * 0.2;
      R.halo.material.opacity = R.lit ? 0.95 : 0.55;
      if (R.lit) {
        R.t -= dt;
        runeTimer(R, Math.max(0, R.t / ASC_SPIRIT_TIME));
        const n = Math.ceil(R.t);
        if (n <= 3 && n !== ASC.tickN) {
          ASC.tickN = n;
          SND.tickTock(n % 2);
        }
        if (R.t <= 0) {
          R.lit = false;
          runeTimer(R, 0);
          SND.rune(false);
          for (const s of ASC.spirits) {
            s.phase = 9;
            if (P.platform === s) {
              P.platform = null;
              P.grounded = false;
            }
          }
        }
      }
      for (const s of ASC.spirits) {
        const on = s.phase === -1,
          blink = on && R.t < 2.5 && Math.sin(time * 26) > 0;
        s.m.material.opacity = mix(s.m.material.opacity, on ? (blink ? 0.35 : 0.88) : 0, 1 - Math.exp(-dt * 12));
        s.m.visible = s.m.material.opacity > 0.02;
        s.ghost.visible = !on;
      }
    }
    if (ASC.page) journalUpdate(ASC.page, dt);
    /* erortzean: azken kanpaira (bizitzarik galdu gabe) */
    if (ASC.cp >= 0 && !respawnTimer) {
      const C = ASC.cps[ASC.cp],
        dx = P.x - ASC.O.x,
        dz = P.z - ASC.O.z,
        u = dx * 0.83 - dz * 0.557,
        w = dx * 0.557 + dz * 0.83;
      const over = u > -8.5 && u < 19 && w > -10 && w < 4.5;
      if (over && !P.grounded && P.y < C.y - 6.5 && P.platform?.island === undefined) ascRespawn();
    }
    /* HUD */
    const txt = ASC.inZone && saved.stage === 4 ? Math.max(0, ASC.cp + 1) + "/3|" + ASC.falls : "";
    if (txt !== ASC.hud) {
      ASC.hud = txt;
      const el = $("ascHud");
      el.hidden = !txt;
      if (txt) {
        el.textContent = "";
        el.append(L("ORRATZA", "LA AGUJA") + " · " + (ASC.cp + 1) + "/3");
        const sm = document.createElement("small");
        sm.textContent = L("ERORIALDIAK", "CAÍDAS") + " · " + ASC.falls;
        el.append(sm);
      }
    }
  }
  /* igoeraren ahotsak (ez dute jokoa gelditzen) */
  function ascLine(k) {
    const lines = [
      ["AMAIUR: «Ez begiratu behera. Igo.»", "AMAIUR: «No mires abajo. Sube.»"],
      ["GAUEKO: «Igo, igo. Beti bezala. Goian zain nago.»", "GAUEKO: «Sube, sube. Como siempre. Te espero arriba.»"],
      ["IRATI · 140.85: «…ahizpa… ez… ez kendu maskara…» (estatikoa)", "IRATI · 140.85: «…hermana… no… no le quites la máscara…» (estática)"],
    ];
    notify(...lines[k], 5);
  }
