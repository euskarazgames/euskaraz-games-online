  /* ==================================================================
     MURUMENDI · azken atala (diseinu propioa): MIKELATSEN EKAITZA
     Zazpi txingarrak itzulita, Mikelatsek amona eraman du (Iturraldeko sutondoa, Mariren
     zortzigarren sua). Plazan Atarrabirekin hitz egitean, Mariren suzko bolak Amaiur gailurrera
     darama; kazkabarrak bota egiten du, eta mendiaren barrutik igotzen da (harpeak.js).
     GAILURRA: harrizko plaza, zazpi zutarri, Mariren leizea eta amona kazkabar-kaiolan.
       · I KAZKABARRA: Mikelats hegan; kazkabar-zirkuluak eta tximistak (abisua lurrean). Haren kapa
         (Atarrabiren itzala) babesten du: piztu hiru ZUTARRI sorginkeriaz → kapa erre → lurrera → jo.
       · II ITZALAK: itzal-armada (UDAN bakarrik zauritzen dira: ALDATU); bi uhin → lurrera → jo.
       · III EKAITZA: eraso gehiago; beste lau zutarriak → nekatuta → LO-KANTA (◀ ▶ ◀ ▶ ◀): lo.
     Amaiera: itzala Atarrabiri itzultzen zaio, Marik Mikelats mendiaren azpian lokartzen du, amona
     aske, egunsentia; negua ez da joan: "Gau batek ekarri zuen, eta beste gau batek eramango du".
     Azken planoa: kaiko kanpaia izotzaren barruan (GAU BELTZA, lau negu geroago).
     Probetan: window.__game.AN eta MK (egoera), mikelatsLull().
     ================================================================== */
  const ANX = 3000;
  ZONES.anboto = { name: "MURUMENDI · GAILURRA", outdoor: true, sky: true, anboto: true, fallY: -24, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null };
  const AN = { built: false, round: 0, stage: "", tx: null, stones: [], lit: 0, gaueko: null, eyes: [], mouth: null, glow: null, clouds: [], dawn: 0, flash: 0, amona: null, cage: null };
  const AN_SPAWN = { x: ANX, y: 0, z: 9, a: PI };
  /* MIKELATS: borrokako gorputza (hegan) — egoera, fasea, bizia eta erasoak */
  const MK = { on: false, g: null, root: null, mixer: null, acts: {}, cur: "", cloak: null, crown: [], eyes: [], aura: null, state: "", phase: 0, hp: 0, t: 0, x: ANX, y: 5, z: -4, tx: ANX, tz: -4, retarget: 0, atkCd: 2.4, marks: [], bolts: [], stun: 0, waves: 0, burn: 0, flash: 0, top: 4.4 };
  const MK_HP = [0, 3, 3, 0];
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
      /* solidoak: benetako ingerada (gailurraren ertzean sartzen dira) */
      const sh = radialShape(m, 0.1, 2.6, m.position.x, m.position.z);
      if (sh) solids.push({ x: m.position.x, z: m.position.z, r: sh.rmin * 0.9, h: 0.6 + 1.4 + (i % 3) * 0.7, y: 0, pillar: true, shapes: [sh] });
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
    /* zazpi zutarri (Mariren zazpi txingarrak), arku batean: sorginkeriaz pizten dira (kapa erretzeko) */
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
      const S = { x, z, orb, k: 0, lit: false };
      S.rune = { rune: true, x, y: orb.position.y, z, r: 1.3, lit: false, live: () => ZONE.cur === "anboto" && MK.on && MK.state === "hover" && (MK.phase === 1 || MK.phase === 3) && !S.lit, hit: () => mkStone(S) };
      RUNES.push(S.rune);
      AN.stones.push(S);
    }
    mkBuild();
    /* amona, kazkabar-kaiolan, leizearen ezkerrean */
    {
      const ax = ANX - 6.2,
        az = -7.6,
        root = npcMesh({ model: "npc_hooded", tint: "#4a4048", scale: 0.93 });
      const g = new T.Group();
      if (root) g.add(root);
      g.position.set(ax, 0, az);
      g.rotation.y = 0.5;
      BP.add(g);
      const mixer = root ? new T.AnimationMixer(root) : null,
        idle = models.mage.animations.find((c) => c.name === "Idle");
      if (mixer && idle) mixer.clipAction(idle).play();
      AN.amona = { g, mixer, x: ax, z: az };
      const ice = new T.MeshStandardMaterial({ color: "#d8f2ff", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.75, emissive: new T.Color("#6fb8e8"), emissiveIntensity: 0.35 }),
        cage = new T.Group();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU,
          bar = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 2.8, 5), ice);
        bar.position.set(Math.cos(a) * 1.05, 1.4, Math.sin(a) * 1.05);
        cage.add(bar);
      }
      const lid = new T.Mesh(new T.ConeGeometry(1.25, 0.9, 9), ice);
      lid.position.y = 3.2;
      cage.add(lid);
      cage.position.set(ax, 0, az);
      BP.add(cage);
      solids.push({ x: ax, z: az, r: 1.2, h: 3, y: 0, pillar: true });
      AN.cage = { g: cage, mat: ice, k: 1 };
    }
    /* Mikelatsen ekaitz-irudia: itzal erraldoia leizearen atzean (kapa, burua eta begi izoztuak) */
    const dark = new T.MeshBasicMaterial({ color: "#05060c", transparent: true, opacity: 0.86, depthWrite: false, fog: false });
    const G = new T.Group();
    const cloak = new T.Mesh(new T.ConeGeometry(16, 44, 20, 1, true), dark);
    cloak.position.y = 4;
    const head = new T.Mesh(new T.SphereGeometry(7.5, 18, 14), dark);
    head.position.y = 29;
    G.add(cloak, head);
    for (const s of [-1, 1]) {
      const e = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#bfe8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
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
    scene.fog.near = mix(50, 140, d) + CAM.far;
    scene.fog.far = mix(300, 800, d) + CAM.far;
    playerLight.intensity = mix(1.8, 0, d);
    for (const c of AN.clouds) c.traverse((n) => n.isMesh && n.material.color.setRGB(mix(0.2, 1, d), mix(0.22, 0.82, d), mix(0.32, 0.74, d)));
  }
  /* ------------------------------ eguneraketa ------------------------------ */
  function anbotoUpdate(dt) {
    if (!AN.built || ZONE.cur !== "anboto") return;
    AN.flash = Math.max(0, AN.flash - dt * 3);
    /* tximistak ekaitzean (egunsentia arte) */
    if (AN.dawn < 0.3 && Math.random() < dt * (MK.on ? 0.25 : 0.12)) {
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
    if (AN.amona && AN.amona.mixer) AN.amona.mixer.update(dt);
    if (AN.cage) {
      AN.cage.g.visible = AN.cage.k > 0.02;
      AN.cage.mat.opacity = 0.75 * AN.cage.k;
      AN.cage.g.scale.y = 0.4 + 0.6 * AN.cage.k;
    }
    for (const c of AN.clouds) c.position.x += dt * 0.8 * (1 + (c.id % 3) * 0.3);
    for (const c of AN.clouds) if (c.position.x > ANX + 140) c.position.x -= 280;
    mkUpdate(dt);
  }
  function anbotoLight(n) {
    AN.lit = n;
    AN.stones.forEach((S, i) => {
      if (i < n && !S.lit) {
        S.lit = S.rune.lit = true;
        fxBurst(S.x, 4, S.z, { n: 24, speed: 2.4, up: 2, life: 0.9, size: 0.3, color: "#ffc35a", grav: -0.6 });
      }
    });
  }
  /* ------------------------------ sarrera ------------------------------ */
  /* plazan, Atarrabirekin (npc.js-tik): Mariren suzko bola eta hegaldia */
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
          cap: ["MURUMENDI", "MIKELATSEN EKAITZA · HODEIEN GAINEAN"],
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
        /* kazkabarrak suzko bola bota du: lehenik mendiaren barrutik (harpeak.js) */
        if (!flag("harpeak")) return harpeakStart();
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
    MK.on = false;
    film(
      [
        { d: 4.6, fade: "in", cam: [[ANX + 26, 14, 30], [ANX + 14, 8, 22]], look: [[ANX, 4, -6], [ANX, 6, -10]], cap: ["MURUMENDI · GAILURRA", "MIKELATSEN EKAITZA · 04:44"] },
        { d: 4.8, say: "f_g1", cam: [[ANX, 4, 14], [ANX, 7, 10]], look: [[ANX, 18, -40], [ANX, 24, -46]], on: () => (AN.stage = "mikelats") },
        { d: 5.2, say: "f_g2", cam: [[ANX - 2, 2.6, -2], [ANX - 3.4, 2.4, -3.4]], look: [ANX - 6.2, 1.6, -7.6] },
        { d: 4.6, say: "f_a3", key: "#ffd9b0", cam: [() => faceCam(2.2, 0.3, 0.5), () => faceCam(1.6, 0.2, 0.2)], look: [faceLook, faceLook] },
      ],
      () => {
        AN.stage = "fight";
        mkStart();
        hud();
      },
    );
  }
  /* ------------------------------ MIKELATS ------------------------------ */
  function mkBuild() {
    const g = new T.Group();
    BP.add(g);
    MK.g = g;
    const root = npcMesh({ model: "npc_knight", tint: "#2a3448", noHelmet: true, scale: 1.9 });
    if (root) {
      g.add(root);
      MK.root = root;
      const box = new T.Box3().setFromObject(root);
      MK.top = box.max.y - box.min.y || 4.4;
      MK.mixer = new T.AnimationMixer(root);
      for (const c of models.mage.animations) MK.acts[c.name] = MK.mixer.clipAction(c);
      mkAnim("Idle");
    }
    const H = MK.top;
    /* kapa: Atarrabiren itzala (beltza, gardena, behean zarpaila) */
    const cloak = new T.Mesh(new T.ConeGeometry(1.9, H * 0.95, 14, 1, true), new T.MeshBasicMaterial({ color: "#05070d", transparent: true, opacity: 0.82, side: T.DoubleSide, depthWrite: false }));
    cloak.position.y = H * 0.45;
    g.add(cloak);
    MK.cloak = cloak;
    /* kazkabar-koroa */
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU,
        sp = new T.Mesh(new T.ConeGeometry(0.12, 0.7 + (i % 2) * 0.3, 5), new T.MeshStandardMaterial({ color: "#e8f6ff", emissive: new T.Color("#9fd8ff"), emissiveIntensity: 0.9, roughness: 0.2 }));
      sp.position.set(Math.cos(a) * 0.42, H + 0.25, Math.sin(a) * 0.42);
      sp.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      g.add(sp);
      MK.crown.push(sp);
    }
    for (const s of [-1, 1]) {
      const e = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#bfe8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      e.position.set(s * 0.22, H * 0.86, 0.42);
      e.scale.set(0.5, 0.18, 1);
      g.add(e);
      MK.eyes.push(e);
    }
    MK.aura = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#3a5aa0", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
    MK.aura.position.y = H * 0.5;
    MK.aura.scale.setScalar(H * 2.4);
    g.add(MK.aura);
    g.position.set(MK.x, MK.y, MK.z);
    g.visible = false;
  }
  function mkAnim(name, once) {
    const a = MK.acts[name];
    if (!a || MK.cur === name) return;
    const old = MK.acts[MK.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.fadeIn(0.2).play();
    if (old) old.fadeOut(0.2);
    MK.cur = name;
  }
  function mkStart() {
    Object.assign(MK, { on: true, state: "hover", phase: 1, hp: MK_HP[1], t: 0, atkCd: 2.6, stun: 0, waves: 0, burn: 0, x: ANX, y: 5, z: -4, tx: ANX, tz: -4 });
    for (const S of AN.stones) S.lit = S.rune.lit = false;
    AN.lit = 0;
    MK.g.visible = true;
    MK.cloak.material.opacity = 0.82;
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "mikelats";
    ROOM.fight = null;
    title("MIKELATS", "");
    bossBar("MIKELATS", 1);
    notify(L("Haren kapa Atarrabiren itzala da: ez dago zauritzerik. Piztu ZUTARRIAK sorginkeriaz: txingarren argiak kapa erreko du!"), "", 7);
  }
  const mkLit = () => AN.stones.filter((S) => S.lit).length;
  function mkStone(S) {
    if (S.lit) return;
    S.lit = S.rune.lit = true;
    AN.lit = mkLit();
    SND.rune(true);
    fxBurst(S.x, 4, S.z, { n: 30, speed: 3, up: 2.4, life: 1, size: 0.34, color: "#ffc35a", grav: -0.6 });
    fxRing(S.x, 0.2, S.z, "#ffcf8a", 3.5, 0.7);
    const n = AN.lit;
    if (MK.phase === 1) {
      notify(L("ZUTARRIA ") + n + " / 3", "", 1.8);
      if (n >= 3) mkDown(7, L("Kapa erretzen ari da! Mikelats lurrera: jo, orain!"));
    } else if (MK.phase === 3) {
      notify(L("ZUTARRIA ") + n + " / 7", "", 1.8);
      if (n >= 7) mkTired();
    }
  }
  function mkDown(secs, msg) {
    MK.state = "down";
    MK.stun = secs;
    MK.burn = 1;
    MK.tx = ANX + (MK.x - ANX) * 0.3;
    MK.tz = -2 + (MK.z + 2) * 0.3;
    SND.stinger(false);
    shake(0.4);
    mkAnim("Hit_A", true);
    if (msg) notify(msg, "", 4);
  }
  function mkHit(n) {
    if (MK.state !== "down") return;
    MK.hp -= n;
    MK.flash = 1;
    SND.hit ? SND.hit(1) : SND.thud();
    fxBurst(MK.x, MK.y + MK.top * 0.6, MK.z, { n: 18, speed: 3, up: 2, life: 0.6, size: 0.3, color: "#bfe8ff", grav: 2 });
    bossBar("MIKELATS", mkTotal());
    if (MK.hp <= 0) {
      if (MK.phase === 1) return mkPhase2();
      if (MK.phase === 2) return mkPhase3();
    }
  }
  /* bizi-barra: hiru fase (III-n, zutarriak) */
  function mkTotal() {
    if (MK.phase === 3) return (1 - mkLit() / 7) / 3;
    return (3 - MK.phase + Math.max(0, MK.hp) / MK_HP[MK.phase]) / 3;
  }
  function mkPhase2() {
    MK.phase = 2;
    MK.state = "talk";
    MK.hp = MK_HP[2];
    MK.burn = 0;
    film(
      [
        { d: 4.4, say: "f_g4", cam: [[ANX, 3.4, 8], [ANX, 4.2, 6]], look: [MK.x, MK.y + 3, MK.z] },
        { d: 4.4, say: "f_i2", vfx: "irati", cam: [[ANX + 4, 2.6, 4], [ANX + 3, 2.8, 3]], look: [ANX, 3, -4] },
      ],
      () => {
        MK.state = "summon";
        MK.waves = 0;
        mkWave();
        notify(L("Itzalak UDAN bakarrik zauritzen dira (begi urreak): ALDATU urtaroa, Q!"), "", 6);
      },
    );
  }
  function mkWave() {
    MK.waves++;
    const n = MK.waves === 1 ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + MK.waves,
        x = ANX + Math.cos(a) * 6.5,
        z = -1 + Math.sin(a) * 5.5,
        era = MK.waves === 1 ? 0 : i % 2;
      const e = spawnEnemy("grunt", era, x, z, 0);
      e.mk = true;
    }
  }
  function mkPhase3() {
    MK.phase = 3;
    MK.state = "talk";
    MK.burn = 0;
    film([{ d: 4.2, say: "f_g3", cam: [[ANX + 6, 3, 4], [ANX + 5, 3.4, 5]], look: [MK.x, MK.y + 3, MK.z] }], () => {
      MK.state = "hover";
      MK.atkCd = 1.6;
      MK.cloak.material.opacity = 0.82;
      notify(L("Ekaitza! Piztu beste ZUTARRIAK (zazpiak), kazkabarraren artean."), "", 5);
    });
  }
  function mkTired() {
    MK.state = "tired";
    MK.tx = ANX;
    MK.tz = -3;
    MK.burn = 1;
    SND.stinger(true);
    mkAnim("Death_A", true);
    bossBar("MIKELATS", 0.02);
    notify(L("Mikelats nekatuta dago. Jo LO-KANTA (◀ ▶ ◀ ▶ ◀): lo egin dezala, mendiaren azpian."), "", 8);
    coach("mk-lokanta", "B", "B: txalaparta → LO-KANTA (◀ ▶ ◀ ▶ ◀)", "", "useBtn", "TXALAPARTA → LO-KANTA (◀ ▶ ◀ ▶ ◀)", "");
  }
  /* LO-KANTA gailurrean (seaska.js-ko seaskaEffect-etik): true → kudeatuta */
  function mikelatsLull() {
    if (ZONE.cur !== "anboto" || !MK.on) return false;
    if (MK.state !== "tired") {
      notify(L("Mikelats esna dago oraindik: lehenik, zazpi zutarriak."), "", 3);
      return true;
    }
    MK.state = "sleep";
    MK.on = false;
    BOSS.dead = true;
    BOSS.on = false;
    bossBar(null);
    for (const M of MK.marks) M.m.parent && M.m.parent.remove(M.m);
    MK.marks.length = 0;
    for (const e of ENEMIES) if (e.mk && e.state !== "dead") killEnemy(e);
    coachDone("mk-lokanta");
    fxRing(MK.x, 0.3, MK.z, "#c9b6ff", 9, 1.2);
    setTimeout(anbotoEnding, 900);
    return true;
  }
  /* kazkabar-zirkuluak eta tximistak (abisua lurrean, gero kolpea) */
  function mkMark(x, z, kind) {
    const bolt = kind === "bolt",
      m = new T.Mesh(new T.RingGeometry(bolt ? 1.1 : 1.3, bolt ? 1.4 : 1.6, 24), new T.MeshBasicMaterial({ color: bolt ? "#bfe8ff" : "#e8f3ff", transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(x, 0.07, z);
    ZONES.anboto.group.add(m);
    MK.marks.push({ x, z, t: 0, fuse: bolt ? 0.9 : 1.25, m, kind });
  }
  const mkOnIsland = (x, z) => Math.hypot((x - ANX) / 14, (z - 0) / 12) < 1;
  function mkAttack() {
    mkAnim("Spellcast_Shoot", true);
    MK.flash = 0.6;
    const hard = MK.phase === 3,
      kind = Math.random() < (hard ? 0.45 : 0.35) ? "bolt" : "hail";
    if (kind === "bolt") {
      mkMark(P.x, P.z, "bolt");
      if (hard) mkMark(P.x + (Math.random() - 0.5) * 5, P.z + (Math.random() - 0.5) * 5, "bolt");
    } else {
      const n = hard ? 7 : 5;
      for (let i = 0; i < n; i++) {
        let x = P.x + (Math.random() - 0.5) * 7,
          z = P.z + (Math.random() - 0.5) * 7;
        if (i === 0) {
          x = P.x;
          z = P.z;
        }
        if (mkOnIsland(x, z)) mkMark(x, z, "hail");
      }
    }
    MK.atkCd = hard ? 1.7 + Math.random() * 0.6 : 2.5 + Math.random() * 0.8;
  }
  function mkUpdate(dt) {
    if (!MK.g) return;
    MK.flash = Math.max(0, MK.flash - dt * 2.5);
    MK.burn = Math.max(0, MK.burn - dt * 0.35);
    if (MK.mixer && MK.g.visible) MK.mixer.update(dt);
    /* kazkabar-zirkuluak */
    for (let i = MK.marks.length - 1; i >= 0; i--) {
      const M = MK.marks[i];
      M.t += dt;
      M.m.material.opacity = 0.4 + 0.4 * Math.abs(Math.sin(time * 12));
      M.m.scale.setScalar(1 + (1 - M.t / M.fuse) * 0.4);
      if (M.t >= M.fuse) {
        if (M.kind === "bolt") {
          AN.flash = 1;
          SND.thunder && SND.thunder();
          fxBurst(M.x, 0.5, M.z, { n: 30, speed: 6, up: 6, life: 0.5, size: 0.35, color: "#dff4ff", grav: 4 });
          if (Math.hypot(P.x - M.x, P.z - M.z) < 1.5 && P.y < 1.8) playerHit(1, M.x, M.z);
        } else {
          fxBurst(M.x, 0.4, M.z, { n: 22, speed: 4, up: 3, life: 0.6, size: 0.3, color: "#e8f3ff", grav: 9 });
          SND.thud();
          if (Math.hypot(P.x - M.x, P.z - M.z) < 1.7 && P.y < 1.6) playerHit(1, M.x, M.z);
        }
        M.m.parent && M.m.parent.remove(M.m);
        MK.marks.splice(i, 1);
      }
    }
    if (!MK.on) return;
    MK.t += dt;
    /* mugimendua: hegan (borrokan), lurrean (behera, nekatuta) */
    const low = MK.state === "down" || MK.state === "tired",
      high = MK.state === "summon";
    if (MK.state === "hover" && (MK.retarget -= dt) <= 0) {
      const a = Math.random() * TAU;
      MK.tx = ANX + Math.cos(a) * 7;
      MK.tz = -2 + Math.sin(a) * 5;
      MK.retarget = 3 + Math.random() * 2;
    }
    const ty = low ? 0 : high ? 9 + Math.sin(time * 0.8) : 4.5 + Math.sin(time * 1.3) * 0.5;
    MK.x = mix(MK.x, MK.tx, 1 - Math.exp(-dt * (low ? 3 : 1.2)));
    MK.z = mix(MK.z, MK.tz, 1 - Math.exp(-dt * (low ? 3 : 1.2)));
    MK.y = mix(MK.y, ty, 1 - Math.exp(-dt * (low ? 4 : 1.5)));
    MK.g.position.set(MK.x, MK.y, MK.z);
    MK.g.rotation.y = Math.atan2(P.x - MK.x, P.z - MK.z);
    MK.cloak.material.opacity = 0.82 * (1 - MK.burn * 0.8);
    MK.cloak.material.color.setRGB(0.02 + MK.burn * 0.9, 0.03 + MK.burn * 0.4, 0.05);
    MK.aura.material.opacity = 0.35 + MK.flash * 0.5;
    if (MK.burn > 0.2 && Math.random() < dt * 20) fxBurst(MK.x, MK.y + MK.top * 0.4, MK.z, { n: 2, speed: 1, up: 2, life: 0.6, size: 0.3, color: "#ff9a3a", grav: -2 });
    if (MK.state === "hover") {
      MK.atkCd -= dt;
      if (MK.atkCd <= 0 && !cinematic && !FILM.on) mkAttack();
    } else if (MK.state === "down") {
      MK.stun -= dt;
      if (MK.stun <= 0) {
        /* altxatu: I fasean, zutarri bat itzali (berriro piztu behar da) */
        MK.state = MK.phase === 2 ? "summon" : "hover";
        MK.atkCd = 1.2;
        if (MK.phase === 1) {
          const S = AN.stones.filter((s) => s.lit).pop();
          if (S) S.lit = S.rune.lit = false;
          AN.lit = mkLit();
          notify(L("Mikelats altxatu da! Zutarri bat itzali du: piztu berriro."), "", 4);
        }
        mkAnim("Idle");
      }
    } else if (MK.state === "summon") {
      if (!ENEMIES.some((e) => e.mk && e.state !== "dead")) {
        if (MK.waves < 2) mkWave();
        else mkDown(8, L("Armada desegin da! Mikelats lurrera erori da: jo, orain!"));
      }
    }
  }
  BOSSK.mikelats = {
    vulnerable: () => MK.state === "down",
    weak: () => ({ x: MK.x, y: MK.y + MK.top * 0.6, z: MK.z }),
    center: () => ({ x: MK.x, y: MK.y, z: MK.z, h: MK.top + 1, r: 2 }),
    hit: (n) => mkHit(n),
  };
  /* gailurrean, txalaparta harria: LO-KANTA jotzeko (txalaparta librea) */
  function anbotoActionNear() {
    if (ZONE.cur !== "anboto" || MK.state !== "tired" || !AN.tx || Math.hypot(P.x - AN.tx.x, P.z - AN.tx.z) > 3.6) return null;
    return { kind: "txala", label: L("LO-KANTA"), fn: () => txalaOpen() };
  }
  /* ------------------------------ amaiera ------------------------------ */
  function anbotoEnding() {
    AN.stage = "end";
    const S0 = { x: MK.x, z: MK.z };
    film(
      [
        {
          d: 5.4,
          text: ["· · ·", "Mikelats lurrean etzan da, lo. Haren kapa beltza askatu da, eta itzal bat bezala irristatu da harkaitzen gainetik."],
          cam: [[ANX + 8, 4, 8], [ANX + 5, 5, 5]],
          look: [[S0.x, 1, S0.z], [ANX, 2, -8]],
          on: () => {
            mkAnim("Death_A", true);
            MK.g.position.y = 0;
          },
          tick: (dt, k) => {
            MK.cloak.material.opacity = 0.82 * (1 - k);
            AN.glow.material.opacity = k * 0.8;
            if (MK.mixer) MK.mixer.update(dt);
          },
        },
        { d: 5.2, say: "f_m1", cam: [[ANX, 3, 4], [ANX, 3.4, 1]], look: [ANX, 3.6, -11.6], tick: () => (AN.glow.material.opacity = 1 + Math.sin(time * 3) * 0.1) },
        { d: 5.4, say: "f_m2", cam: [[ANX - 8, 4, 6], [ANX - 6, 6, 2]], look: [S0.x, 1, S0.z] },
        { d: 4.6, say: "f_g5", cam: [[S0.x + 2.4, 1.6, S0.z + 2.4], [S0.x + 1.8, 1.4, S0.z + 1.8]], look: [S0.x, 0.6, S0.z] },
        { d: 4.8, say: "f_a4", key: "#ffd9b0", cam: [() => faceCam(2, 0.3, -0.5), () => faceCam(1.5, 0.2, -0.2)], look: [faceLook, faceLook] },
        {
          d: 6,
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
          text: ["· · ·", "Leizearen atarian, mutil bat: Atarrabi. Eguzkiaren lehen izpiak jo du… eta haren itzala lurrean dago."],
          cam: [[ANX + 3, 2.2, 0], [ANX + 2.4, 2, -2]],
          look: [ANX, 1.4, -9],
          on: () => {
            AN.gaueko.g.visible = false;
            MK.g.visible = false;
            oroitPlace("atarrabi", ANX, 0, -9.6, 0);
            const A = OROIT.actors.atarrabi;
            if (A) A.g.traverse((n) => n.isMesh && (n.castShadow = true));
            hero.position.set(ANX, 0, -1.2);
            hero.rotation.y = PI;
          },
          tick: (dt, k) => {
            const A = OROIT.actors.atarrabi;
            if (A) A.g.position.z = mix(-9.6, -6.4, smooth01(k));
            oroitActorsTick(dt);
            AN.dawn = 0.35 + k * 0.25;
          },
        },
        { d: 4.2, say: "f_i3", vfx: "dry", key: "#ffd9b0", cam: [[ANX + 2.2, 1.8, -4.2], [ANX + 1.8, 1.7, -4.6]], look: [ANX, 1.5, -6.4], tick: (dt) => oroitActorsTick(dt) },
        { d: 4.2, say: "f_a5", key: "#ffd9b0", cam: [() => faceCam(1.8, 0.2, 0.4), () => faceCam(1.4, 0.15, 0.2)], look: [faceLook, faceLook], tick: (dt) => oroitActorsTick(dt) },
        { d: 4.8, say: "f_i4", vfx: "dry", cam: [[ANX + 4, 2.6, -1], [ANX + 5, 3.4, 1]], look: [ANX, 1.4, -6], tick: (dt) => oroitActorsTick(dt) },
        {
          d: 5.6,
          say: "f_n2",
          cam: [[ANX - 2, 2.2, -2.6], [ANX - 3.4, 2.6, -1.4]],
          look: [AN.amona.x, 1.5, AN.amona.z],
          tick: (dt, k) => {
            AN.cage.k = Math.max(0, 1 - k * 2.5);
            AN.dawn = 0.6 + k * 0.3;
            oroitActorsTick(dt);
          },
        },
        /* EPILOGOA: haranean, egunsentia — negua ez da joan; Iturralden, sua piztuta */
        {
          d: 6,
          fade: "in",
          cap: ["IBARRA · EGUNSENTIA", "NEGUA EZ DA JOAN"],
          cam: [[70, 40, 122], [40, 22, 80]],
          look: [[0, 4, 30], [0, 2, 30]],
          on: () => {
            AN.stage = "";
            enterZone("ibarra", { x: 2.4, y: 0, z: 27.6, a: 0 }, true);
            PRO.hideNpc = true;
            phase = 1;
            setPhaseVisual(true);
            saved.tod = 0.27;
            const sp = TXALA.spots[0];
            hero.position.set(sp.x + 1.2, 0, sp.z - 1.9);
            hero.rotation.y = 0;
          },
        },
        {
          d: 6,
          text: ["· · ·", "Iturralden, sutondoa piztuta dago berriro. Eta plazan, txalapartak ez du gehiago bakarrik jotzen."],
          cam: [[0.6, 2.4, 24.6], [0.2, 2, 25.8]],
          look: [0, 1.2, 29.4],
          tick: (dt) => {
            const sp = TXALA.spots[0];
            AN.beat = (AN.beat || 0) - dt;
            if (AN.beat <= 0) {
              AN.beat = 0.42;
              AN.side = AN.side === "L" ? "R" : "L";
              sp.planks[AN.side === "L" ? 0 : 2].position.y = 1.25;
              SND.tok(AN.side, AN.side === "R");
            }
            for (const pl of sp.planks) pl.position.y = mix(pl.position.y, 1.33, 1 - Math.exp(-dt * 10));
          },
        },
        /* azken planoa: kaiko kanpaia izotzaren barruan (GAU BELTZA) */
        {
          d: 6.4,
          title: ["LEIZEEN DEIA", "AMAIERA"],
          text: ["· · ·", "Kaian, izotzaren barruan, kanpaia isilik dago. Oraingoz."],
          night: 0.2,
          cam: [[16, -3, 96], [12, -5, 92]],
          look: [9.8, -5.6, 86.4],
          on: () => {
            const B = oroitBell();
            B.g.position.set(9.8, -7.2, 86.4);
            B.g.visible = true;
            if (!AN.bellIce) {
              AN.bellIce = new T.Mesh(new T.BoxGeometry(3.2, 4.4, 2.6), new T.MeshStandardMaterial({ color: "#d8f2ff", roughness: 0.1, transparent: true, opacity: 0.55, emissive: new T.Color("#6fb8e8"), emissiveIntensity: 0.3, depthWrite: false }));
              ZONES.ibarra.group.add(AN.bellIce);
            }
            AN.bellIce.position.set(9.8, -5.0, 86.4);
            AN.bellIce.visible = true;
          },
        },
        {
          d: 6.4,
          fade: "out",
          title: ["GAU BELTZA", "LAU NEGU GEROAGO"],
          text: ["· · ·", "Gau batek ekarri zuen negua. Beste gau batek eramango du."],
          cam: [[12, -5, 92], [10, -4, 90]],
          look: [9.8, -5.2, 86.4],
          on: () => setTimeout(() => FILM.on && SND.echo(0.5), 2200),
        },
        {
          d: 7,
          fade: "out",
          text: ["EGILEAK", "Joko originala: istorioa, pertsonaiak, mailak eta musika EUSKARAZ GAMESentzat sortuak. Euskal mitologia herri-ondarea da. Ahotsak: sintetikoak (inor ez da klonatu). Eskerrik asko jolasteagatik."],
          cam: [[0, 30, 60], [0, 60, 90]],
          look: [[0, 10, 0], [-28, 120, -320]],
          on: () => {
            if (OROIT.bell) OROIT.bell.g.visible = false;
            if (AN.bellIce) AN.bellIce.visible = false;
          },
        },
      ],
      () => {
        oroitEnd();
        PRO.hideNpc = false;
        flagSet("anboto");
        persist();
        title("LEIZEEN DEIA", "AMAIERA");
        notify(L("Amona etxean dago, eta Atarrabi Mariren ondoan. Harana zurea da: arnasa-zatiak, misterioak eta erronkak zain."), "", 8);
        hud();
      },
    );
  }
  /* azken atalaren helburua (ZONE anboto) */
  function anbotoObjective() {
    if (MK.on && MK.phase === 1) return ["Mikelatsen kapa: piztu zutarriak sorginkeriaz (" + mkLit() + " / 3), eta jo lurrera erortzen denean.", null];
    if (MK.on && MK.phase === 2) return ["Itzal-armada: UDAN zauritzen dira (ALDATU, Q).", null];
    if (MK.on && MK.phase === 3 && MK.state !== "tired") return ["Ekaitza: piztu zazpi zutarriak (" + mkLit() + " / 7).", null];
    if (MK.state === "tired") return ["LO-KANTA (◀ ▶ ◀ ▶ ◀): lo egin dezala Mikelatsek.", AN.tx ? [AN.tx.x, AN.tx.z + 1.6, 0] : null];
    return ["Murumendi: amona askatu.", null];
  }
  /* (lehengo bertsioaren izena: amaieraren ondoren ez dago ezer egiteko) */
  function iratiBody() {}
