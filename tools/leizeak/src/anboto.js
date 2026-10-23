  /* ==================================================================
     ANBOTO · azken atala (diseinu propioa): MARIREN ETXEA
     Zazpi argiak berde: Irati Anboton dago, bizirik, Gauekoren gauean (itsasotik atera zuen).
     Plazan Iratirekin hitz egitean, Andereren suzko bolak Amaiur mendi-gailurrera darama.
       · Gailurra: harrizko plaza hodeien gainean, Mariren leizea iparrean, zazpi zutarri (zazpi
         urteak) eta harrizko txalaparta. Atzean, Gaueko: itzal erraldoia, urrezko begiak, ekaitza.
       · DUELUA (txalaparta, galdera-erantzuna): Gaueko galdezka, Amaiur erantzunez. Hiru txanda:
         lau kolpe, bost kolpe, eta zazpi kolpe BI AHOTSEZ (Amaiurrek ◀, Iratik ▶ — bakarrik ezin da).
         Huts eginez gero, Gaueko berriro galdezka (ez dago porrotik: gaua pazientziaz luzea da).
       · Amaiera: zazpi urteak leizera, Mariren ahotsa itzultzen da, ituna (gaua Gauekorena, urteak
         ahizpenak), Irati leizetik bizirik, egunsentia. Epilogoa haranean: bi ahizpak txalapartan.
     Probetan: window.__game.anboto (egoera) eta txalaparta-kolpeak (txalaHit) botarentzat.
     ================================================================== */
  const ANX = 3000;
  ZONES.anboto = { name: "ANBOTO · MARIREN ETXEA", outdoor: true, sky: true, anboto: true, fallY: -24, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null };
  const AN = { built: false, round: 0, stage: "", tx: null, stones: [], lit: 0, gaueko: null, eyes: [], mouth: null, glow: null, clouds: [], dawn: 0, flash: 0, irati: null, fire: null };
  const AN_SPAWN = { x: ANX, y: 0, z: 9, a: PI };
  const AN_ROUNDS = [
    { seq: ["L", "R", "R", "L"], title: "GAUEKOREN DEIA · I" },
    { seq: ["R", "L", "L", "R", "L"], title: "GAUEKOREN DEIA · II" },
    { seq: ["L", "R", "L", "R", "R", "L", "R"], title: "BI AHOTSEZ · III", duet: true },
  ];
  const AN_FOG_NIGHT = new T.Color("#141a2e"),
    AN_FOG_DAWN = new T.Color("#e9b08c");
  /* ------------------------------ eraikuntza ------------------------------ */
  function anbotoBuild() {
    if (AN.built) return;
    AN.built = true;
    zoneBuild("anboto");
    /* gailurra: harrizko plaza (lauzak) eta harkaitza azpian */
    skyIsland({ x: ANX, z: 0, y: 0, r: 15, rz: 13, top: "stone", depth: 28, debris: 5, area: "gailurra" });
    /* ertzeko harkaitzak (silueta) */
    for (let i = 0; i < 9; i++) {
      const a = PI * 0.15 + (i / 8) * PI * 0.7 + PI,
        r = 14.5 + (i % 3) * 0.8,
        m = obj(new T.DodecahedronGeometry(1.4 + (i % 3) * 0.7, 0), rockMaterial());
      m.position.set(ANX + Math.cos(a) * r * 1.05, 0.6, Math.sin(a) * r * 0.9 + 1);
      m.rotation.set(i, i * 1.7, 0);
    }
    /* Mariren leizea: bi zutabe, ataria eta ahoa (barruan, argi epela amaieran) */
    const mz = -11.2;
    for (const s of [-1, 1]) {
      const p = obj(new T.BoxGeometry(2.4, 7.4, 2.6), rockMaterial());
      p.position.set(ANX + s * 3.7, 3.7, mz);
      solids.push({ x: ANX + s * 3.7, z: mz, r: 1.5, h: 8, y: 0, pillar: true });
    }
    const lintel = obj(new T.BoxGeometry(10.2, 2.2, 3), rockMaterial());
    lintel.position.set(ANX, 8.3, mz);
    lintel.rotation.z = 0.04;
    const back = obj(new T.BoxGeometry(14, 14, 3), rockMaterial());
    back.position.set(ANX, 5, mz - 2.6);
    AN.mouth = obj(new T.PlaneGeometry(5.2, 7), new T.MeshBasicMaterial({ color: "#030305" }));
    AN.mouth.position.set(ANX, 3.5, mz - 1.05);
    AN.mouth.castShadow = false;
    solids.push({ x: ANX, z: mz - 1, r: 2.8, h: 8, y: 0, pillar: true });
    AN.glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffb35a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    AN.glow.position.set(ANX, 3.4, mz - 0.6);
    AN.glow.scale.setScalar(11);
    BP.add(AN.glow);
    /* harrizko txalaparta, leizearen aurrean */
    AN.tx = txalapartaMesh(ANX, 0, -4.2, 0, "gailurra");
    TXALA.spots.push(AN.tx);
    /* zazpi zutarri (zazpi urteak), arku batean */
    for (let i = 0; i < 7; i++) {
      const a = PI + 0.32 + (i / 6) * (PI - 0.64),
        x = ANX + Math.cos(a) * 10.5,
        z = -1.5 + Math.sin(a) * 8.5,
        st = obj(new T.CylinderGeometry(0.55, 0.8, 3.2 + (i % 2) * 0.5, 6), rockMaterial());
      st.position.set(x, 1.6, z);
      st.rotation.y = i;
      solids.push({ x, z, r: 0.8, h: 3.5, y: 0, pillar: true });
      const orb = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#3dff8a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.15 }));
      orb.position.set(x, 3.9 + (i % 2) * 0.5, z);
      orb.scale.setScalar(2.2);
      BP.add(orb);
      AN.stones.push({ x, z, orb, k: 0 });
    }
    /* Gaueko: itzal erraldoia leizearen atzean (kapa, burua eta urrezko begiak) */
    const dark = new T.MeshBasicMaterial({ color: "#05060c", transparent: true, opacity: 0.86, depthWrite: false, fog: false });
    const G = new T.Group();
    const cloak = new T.Mesh(new T.ConeGeometry(16, 44, 20, 1, true), dark);
    cloak.position.y = 4;
    const head = new T.Mesh(new T.SphereGeometry(7.5, 18, 14), dark);
    head.position.y = 29;
    G.add(cloak, head);
    for (const s of [-1, 1]) {
      const e = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffcf7a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
      e.position.set(s * 3.2, 29.5, 8.4);
      e.scale.set(5, 0.1, 1);
      G.add(e);
      AN.eyes.push(e);
    }
    G.position.set(ANX, -6, -46);
    G.renderOrder = 1;
    BP.add(G);
    AN.gaueko = { g: G, mat: dark };
    /* hodei-itsasoa behean eta ekaitz-hodeiak inguruan */
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU,
        r = 70 + (i % 4) * 16,
        c = model(i % 2 ? "cloud_big" : "cloud_small", ANX + Math.cos(a) * r, i % 4 ? -26 - (i % 3) * 5 : 24 + (i % 2) * 10, Math.sin(a) * r - 6, 9 + (i % 3) * 4, i);
      c.traverse((n) => n.isMesh && ((n.castShadow = false), (n.material = n.material.clone()), (n.material.transparent = true), (n.material.opacity = 0.9)));
      AN.clouds.push(c);
    }
  }
  /* argia eta lainoa: gaua (ekaitza) → egunsentia (AN.dawn) */
  function anbotoVisuals() {
    const d = AN.dawn;
    sun.color.set("#8ea8ff").lerp(new T.Color("#ffc58a"), d);
    sun.intensity = mix(0.55, 1.7, d) + AN.flash * 2.5;
    ambient.intensity = mix(0.45, 0.8, d) * (scene.environment ? 0.7 : 1) + AN.flash * 0.8;
    ambient.color.set("#8f9cd8").lerp(new T.Color("#ffe1c4"), d);
    ambient.groundColor.set("#1b1830").lerp(new T.Color("#6a5a50"), d);
    scene.fog.color.copy(AN_FOG_NIGHT).lerp(AN_FOG_DAWN, d);
    scene.fog.near = mix(50, 140, d);
    scene.fog.far = mix(300, 800, d);
    playerLight.intensity = mix(1.8, 0, d);
    for (const c of AN.clouds) c.traverse((n) => n.isMesh && n.material.color.setRGB(mix(0.2, 1, d), mix(0.22, 0.82, d), mix(0.32, 0.74, d)));
  }
  /* ------------------------------ eguneraketa ------------------------------ */
  function anbotoUpdate(dt) {
    if (!AN.built || ZONE.cur !== "anboto") return;
    AN.flash = Math.max(0, AN.flash - dt * 3);
    /* tximistak ekaitzean (egunsentia arte) */
    if (AN.dawn < 0.3 && Math.random() < dt * 0.12) {
      AN.flash = 1;
      setTimeout(() => SND.thunder && SND.thunder(), 280);
    }
    const G = AN.gaueko;
    if (G) {
      G.g.position.y = -6 + Math.sin(time * 0.5) * 0.8;
      G.g.rotation.z = Math.sin(time * 0.3) * 0.03;
      const open = AN.stage === "end" ? 0 : AN.stage ? 1 : 0.35;
      for (const e of AN.eyes) {
        e.material.opacity = mix(e.material.opacity, open * (0.85 + Math.sin(time * 9) * 0.1), 1 - Math.exp(-dt * 3));
        e.scale.y = mix(e.scale.y, 0.1 + 3.4 * open, 1 - Math.exp(-dt * 3));
      }
    }
    for (const S of AN.stones) {
      S.k = mix(S.k, S.lit ? 1 : 0.12, 1 - Math.exp(-dt * 4));
      S.orb.material.opacity = S.k * (0.85 + Math.sin(time * 3 + S.x) * 0.1);
      S.orb.scale.setScalar(1.4 + S.k * 1.6);
    }
    for (const c of AN.clouds) c.position.x += dt * 0.8 * (1 + (c.id % 3) * 0.3);
    for (const c of AN.clouds) if (c.position.x > ANX + 140) c.position.x -= 280;
  }
  function anbotoLight(n) {
    AN.lit = n;
    AN.stones.forEach((S, i) => {
      if (i < n && !S.lit) {
        S.lit = true;
        fxBurst(S.x, 4, S.z, { n: 24, speed: 2.4, up: 2, life: 0.9, size: 0.3, color: "#3dff8a", grav: -0.6 });
      }
    });
  }
  /* ------------------------------ sarrera ------------------------------ */
  /* plazan, Iratirekin (npc.js-tik): suzko bola eta hegaldia */
  function anbotoStart() {
    if (ZONE.cur !== "ibarra" || cinematic || FILM.on) return;
    const V = (id, x, z, y, cam) => {
      const [who, text] = voiceLine(id);
      return [who, text, "", x, z, y, cam || null, id];
    };
    voicePreload(["f_i1", "f_a1", "f_n1", "f_a2"]);
    say(
      [
        V("f_i1", 0, 41, 0),
        V("f_a1", P.x, P.z, P.y),
        ["· · ·", "Une horretan, suzko bola bat jaitsi da zerutik, plazaren gainera. Ez du erretzen: berotzen du.", "", 0, 38, 4, [0, 12, 30]],
        V("f_n1", 0, 38, 4, [0, 10, 34]),
        V("f_a2", P.x, P.z, P.y),
      ],
      anbotoFlight,
    );
  }
  function anbotoFlight() {
    if (!MARI.m) mariCliffMesh();
    const H = { x: P.x, y: P.y, z: P.z };
    film(
      [
        {
          d: 4.2,
          cam: [[H.x + 8, H.y + 3, H.z + 9], [H.x + 6, H.y + 6, H.z + 7]],
          look: [[H.x, H.y + 4, H.z], [H.x, H.y + 9, H.z]],
          on: () => {
            MARI.m.visible = true;
            MARI.m.scale.setScalar(0.35);
            MARI.m.position.set(H.x, H.y + 12, H.z);
          },
          tick: (dt, k) => {
            MARI.m.position.set(H.x, H.y + mix(12, 4.5, Math.min(1, k * 2)) + Math.max(0, k - 0.5) * 8, H.z);
            hero.position.y = H.y + Math.max(0, k - 0.5) * 8;
            if (Math.random() < dt * 20) fxBurst(MARI.m.position.x, MARI.m.position.y, MARI.m.position.z, { n: 3, speed: 1.4, life: 0.9, size: 0.6, color: "#ffb347", grav: 0 });
          },
        },
        {
          d: 4.6,
          fade: "out",
          cap: ["ANBOTO", "MARIREN ETXEA · HODEIEN GAINEAN"],
          cam: [[H.x + 20, H.y + 30, H.z + 30], [H.x - 10, 60, H.z - 30]],
          look: [[H.x, H.y + 14, H.z], [-28, 120, -320]],
          tick: (dt, k) => {
            const p = MARI.m.position;
            p.set(mix(H.x, -28, k * k), mix(H.y + 8, 140, k), mix(H.z, -320, k * k));
            hero.position.copy(p);
            if (Math.random() < dt * 30) fxBurst(p.x, p.y, p.z, { n: 3, speed: 2, life: 1.2, size: 1.6, color: "#ffb347", grav: 0 });
          },
        },
      ],
      () => {
        if (MARI.m) {
          MARI.m.visible = false;
          MARI.m.scale.setScalar(1);
        }
        anbotoBuild();
        AN.stage = "arrive";
        AN.dawn = 0;
        /* zinema lehenik (FILM.on): kokapen-errotulua zinemak berak idazten du, ez bikoiztu */
        anbotoArrive();
        enterZone("anboto", { ...AN_SPAWN }, true);
      },
    );
  }
  function anbotoArrive() {
    film(
      [
        { d: 4.6, fade: "in", cam: [[ANX + 26, 14, 30], [ANX + 14, 8, 22]], look: [[ANX, 4, -6], [ANX, 6, -10]], cap: ["ANBOTO · GAILURRA", "MARIREN ETXEA · 04:44"] },
        { d: 4.8, say: "f_g1", cam: [[ANX, 4, 14], [ANX, 7, 10]], look: [[ANX, 18, -40], [ANX, 24, -46]], on: () => (AN.stage = "gaueko") },
        { d: 5.2, say: "f_g2", cam: [[ANX - 9, 3, 2], [ANX - 7, 3.4, 4]], look: [ANX, 20, -46] },
        { d: 4.6, say: "f_a3", key: "#ffd9b0", cam: [() => faceCam(2.2, 0.3, 0.5), () => faceCam(1.6, 0.2, 0.2)], look: [faceLook, faceLook] },
      ],
      () => {
        AN.stage = "duel";
        hud();
        coach("anboto", "E", "Harrizko txalaparta: E → ERANTZUN Gauekori", "", "useBtn", "Harrizko txalaparta: EKIN → ERANTZUN", "");
      },
    );
  }
  /* ------------------------------ duelua ------------------------------ */
  function anbotoActionNear() {
    if (ZONE.cur !== "anboto" || AN.stage !== "duel" || !AN.tx || Math.hypot(P.x - AN.tx.x, P.z - AN.tx.z) > 3.6) return null;
    return { kind: "txala", label: L("ERANTZUN"), fn: anbotoDuel };
  }
  function anbotoDuel() {
    if (AN.stage !== "duel" || TXALA.on) return;
    coachDone("anboto");
    const R = AN_ROUNDS[AN.round];
    txalaCall(R.seq, R.title, R.duet ? L("Gaueko galdezka… Zuk ◀, Iratik ▶.") : L("Gaueko galdezka. Entzun… eta erantzun."), () => anbotoRoundWon(AN.round), {
      duet: !!R.duet,
      onBeat: () => {
        AN.flash = Math.max(AN.flash, 0.25);
        for (const e of AN.eyes) e.scale.y = 4.2;
      },
    });
  }
  function anbotoRoundWon(i) {
    SND.stinger(i === 2);
    anbotoLight([2, 4, 7][i]);
    AN.round = i + 1;
    persist();
    if (i === 0) return film([{ d: 4.2, say: "f_g3", cam: [[ANX + 6, 3, 4], [ANX + 5, 3.4, 5]], look: [ANX, 22, -46] }], anbotoDuel);
    if (i === 1)
      return film(
        [
          { d: 4.4, say: "f_g4", cam: [[ANX, 3.4, 8], [ANX, 4.2, 6]], look: [ANX, 24, -46] },
          {
            d: 4.4,
            say: "f_i2",
            cam: [[ANX - 4.5, 2.4, -1], [ANX - 3.6, 2.2, -1.8]],
            look: [ANX + 1.6, 1.4, -5.6],
            on: () => {
              oroitPlace("irati", ANX + 1.4, 0, -6.2, 0);
              const A = OROIT.actors.irati;
              if (A) A.g.traverse((n) => n.material && ((n.material.opacity = 0.55), (n.material.transparent = true)));
            },
            tick: (dt) => oroitActorsTick(dt),
          },
        ],
        anbotoDuel,
      );
    anbotoEnding();
  }
  /* ------------------------------ amaiera ------------------------------ */
  function anbotoEnding() {
    AN.stage = "end";
    const iratiSolid = () => {
      const A = oroitActor("irati");
      if (A) A.g.traverse((n) => n.material && ((n.material.opacity = 1), (n.material.transparent = false), (n.material.depthWrite = true)));
    };
    film(
      [
        {
          d: 5.4,
          text: ["· · ·", "Zazpi argiak zutarrietatik altxatu dira, eta Mariren leizera sartu, bata bestearen atzetik."],
          cam: [[ANX + 10, 5, 10], [ANX + 6, 6, 6]],
          look: [[ANX, 3, -4], [ANX, 3.6, -11]],
          on: () => (OROIT.actors.irati ? (OROIT.actors.irati.g.visible = false) : 0),
          tick: (dt, k) => {
            AN.stones.forEach((S, i) => {
              const kk = clamp(k * 1.6 - i * 0.09, 0, 1);
              S.orb.position.set(mix(S.x, ANX, kk), mix(4, 3.4, kk) + Math.sin(kk * PI) * 3, mix(S.z, -11.6, kk));
            });
            AN.glow.material.opacity = k;
          },
        },
        { d: 5.2, say: "f_m1", cam: [[ANX, 3, 4], [ANX, 3.4, 1]], look: [ANX, 3.6, -11.6], tick: (dt, k) => (AN.glow.material.opacity = 1 + Math.sin(time * 3) * 0.1) },
        { d: 5.4, say: "f_m2", cam: [[ANX - 8, 4, 6], [ANX - 6, 6, 2]], look: [ANX, 20, -46] },
        { d: 4.6, say: "f_g5", cam: [[ANX, 6, 12], [ANX, 8, 10]], look: [ANX, 24, -46] },
        { d: 4.8, say: "f_a4", key: "#ffd9b0", cam: [() => faceCam(2, 0.3, -0.5), () => faceCam(1.5, 0.2, -0.2)], look: [faceLook, faceLook] },
        {
          d: 5.6,
          say: "f_g6",
          cam: [[ANX, 5, 14], [ANX, 9, 18]],
          look: [[ANX, 24, -46], [ANX, 30, -60]],
          tick: (dt, k) => {
            AN.gaueko.mat.opacity = 0.86 * (1 - k);
            AN.dawn = k * 0.35;
          },
        },
        {
          d: 6,
          text: ["· · ·", "Leizetik, oinutsik eta hotzez dardarka, neska bat irten da. Ez da oihartzun bat."],
          cam: [[ANX + 3, 2.2, 0], [ANX + 2.4, 2, -2]],
          look: [ANX, 1.4, -9],
          on: () => {
            AN.gaueko.g.visible = false;
            oroitPlace("irati", ANX, 0, -10.4, 0);
            iratiSolid();
            hero.position.set(ANX, 0, -1.2);
            hero.rotation.y = PI;
          },
          tick: (dt, k) => {
            const A = OROIT.actors.irati;
            if (A) A.g.position.z = mix(-10.4, -4.2 - 2.6, smooth01(k));
            oroitActorsTick(dt);
            AN.dawn = 0.35 + k * 0.25;
          },
        },
        { d: 4.2, say: "f_i3", vfx: "dry", key: "#ffd9b0", cam: [[ANX + 2.2, 1.8, -4.6], [ANX + 1.8, 1.7, -5]], look: [ANX, 1.5, -6.8], tick: (dt) => oroitActorsTick(dt) },
        { d: 4.2, say: "f_a5", key: "#ffd9b0", cam: [() => faceCam(1.8, 0.2, 0.4), () => faceCam(1.4, 0.15, 0.2)], look: [faceLook, faceLook], tick: (dt) => oroitActorsTick(dt) },
        { d: 4.8, say: "f_i4", vfx: "dry", cam: [[ANX + 4, 2.6, -1], [ANX + 5, 3.4, 1]], look: [ANX, 1.4, -4.4], tick: (dt) => oroitActorsTick(dt) },
        {
          d: 5.6,
          say: "f_n2",
          cam: [[ANX, 6, 10], [ANX + 6, 14, 22]],
          look: [[ANX, 4, -6], [ANX - 20, 30, -80]],
          on: () => {
            if (!MARI.m) mariCliffMesh();
            ZONES.anboto.group.add(MARI.m);
            MARI.m.visible = true;
            MARI.m.scale.setScalar(0.5);
          },
          tick: (dt, k) => {
            MARI.m.position.set(ANX - k * 10, 10 + k * 18, -12 - k * 30);
            AN.dawn = 0.6 + k * 0.4;
            oroitActorsTick(dt);
          },
        },
        /* EPILOGOA: haranean, egunsentia, uda; bi ahizpak plazako txalapartan */
        {
          d: 6,
          fade: "in",
          cap: ["IBARRA · EGUNSENTIA", "ZAZPI URTEREN ONDOREN"],
          cam: [[70, 40, 122], [40, 22, 80]],
          look: [[0, 4, 30], [0, 2, 30]],
          on: () => {
            if (MARI.m) {
              MARI.m.visible = false;
              MARI.m.scale.setScalar(1);
              ZONES.ibarra.group.add(MARI.m);
            }
            AN.stage = "";
            enterZone("ibarra", { x: 2.4, y: 0, z: 27.6, a: 0 }, true);
            /* plazan bi ahizpak bakarrik txalapartan (bikiak etxean, une batez) */
            PRO.hideNpc = true;
            phase = 0;
            setPhaseVisual(true);
            saved.tod = 0.27;
            const sp = TXALA.spots[0];
            oroitPlace("irati", sp.x - 1.2, 0, sp.z - 1.9, 0);
            iratiSolid();
            hero.position.set(sp.x + 1.2, 0, sp.z - 1.9);
            hero.rotation.y = 0;
          },
          tick: (dt) => oroitActorsTick(dt),
        },
        {
          d: 6.4,
          title: ["LEIZEEN DEIA", "AMAIERA"],
          text: ["· · ·", "Eguna egunekoentzat, gaua gauekoentzat. Eta txalaparta, beti, bi ahotsez."],
          cam: [[0.6, 2.4, 24.6], [0.2, 2, 25.8]],
          look: [0, 1.2, 29.4],
          tick: (dt) => {
            oroitActorsTick(dt);
            const sp = TXALA.spots[0];
            AN.beat = (AN.beat || 0) - dt;
            if (AN.beat <= 0) {
              AN.beat = 0.36;
              AN.side = AN.side === "L" ? "R" : "L";
              sp.planks[AN.side === "L" ? 0 : 2].position.y = 1.25;
              SND.tok(AN.side, AN.side === "R");
            }
            for (const pl of sp.planks) pl.position.y = mix(pl.position.y, 1.33, 1 - Math.exp(-dt * 10));
          },
        },
        {
          d: 7,
          fade: "out",
          text: ["EGILEAK", "Joko originala: istorioa, pertsonaiak, mailak eta musika EUSKARAZ GAMESentzat sortuak. Euskal mitologia herri-ondarea da. Ahotsak: sintetikoak (inor ez da klonatu). Eskerrik asko jolasteagatik."],
          cam: [[0, 30, 60], [0, 60, 90]],
          look: [[0, 10, 0], [-28, 120, -320]],
          tick: (dt) => oroitActorsTick(dt),
        },
      ],
      () => {
        oroitEnd();
        PRO.hideNpc = false;
        flagSet("anboto");
        iratiBody();
        persist();
        title("LEIZEEN DEIA", "AMAIERA");
        notify(L("Irati etxean dago. Harana zurea da: arnasa-zatiak, misterioak eta erronkak zain."), "", 8);
        hud();
      },
    );
  }
  /* azken atalaren helburua (ZONE anboto) */
  function anbotoObjective() {
    if (AN.stage === "duel") return ["Harrizko txalaparta, Mariren leizearen aurrean: ERANTZUN Gauekori (" + AN.round + " / 3).", AN.tx ? [AN.tx.x, AN.tx.z + 1.6, 0] : null];
    return ["Anboto: Mariren etxea.", null];
  }
  /* epilogoaren ondoren: Irati plazan, bizirik (mamu-itxurarik gabe) */
  function iratiBody() {
    const N = NPCS.find((n) => n.id === "irati");
    if (!N || N.body) return;
    N.body = true;
    N.root.traverse((n) => {
      if (!n.isMesh) return;
      n.material.transparent = false;
      n.material.opacity = 1;
      n.material.depthWrite = true;
      n.material.color = new T.Color("#9fd0f0").lerp(new T.Color("#ffffff"), 0.35);
      n.material.emissive = new T.Color("#000000");
      n.material.emissiveIntensity = 0;
      n.castShadow = true;
    });
    if (N.halo) N.halo.visible = false;
  }
