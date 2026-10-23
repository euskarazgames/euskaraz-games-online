  /* ==================================================================
     HITZAURREA · "OIHARTZUNA" (0. atala)
     Hasiera mailakatua: zinema (gaua, txalaparta bakarrik, Gaueko), Iturralden esnatu, Iratiren
     lehen oihartzun-deia eta erronka txikiak; bakoitzak tresna bat irakasten du, gero istorioan
     behar dena:
       1 · MUGITU          → oihartzun-harria dardaraka (deia)
       2 · SORGINKERIA     → sutondoa piztu            (leizeetako sutegiak)
       3 · JAUZI BIKOITZA  → ganbara: Iratiren makilak (txalaparta)
       4 · GARAIA          → atea izoztuta; udan zabalik (garai-zubiak, itzalak)
       5 · BULTZADA        → Gauekoren begiak kalean: itzalean itxaron edo ziztu bizian pasatu
       6 · FINKATU + garaiak borrokan → plazako itzalak (urrezko begiak: iraganean bakarrik)
     Egunsentia, Iratiren oihartzuna plazan eta izenburua. Banderak: pro-0, pro-deia, pro-sua,
     pro-makilak, pro-atea, pro-kalea, pro-plaza → intro + irati1 + prologoa.
     Partida zaharrek (intro banderarekin) ez dute hitzaurrerik eta tresnak libre dituzte.
     ================================================================== */
  const PRO = { on: false, hideNpc: false, ghost: false, can: { phase: true, dash: true, lock: true }, stone: null, chest: null, ice: null, hearth: null, beams: [], caught: 0, catchT: 0, hold: null, eyes: null, fight: null, rise: 0, said: {}, nopeT: 0 };
  const proFlag = (k) => saved.flags.includes(k);
  function proLocks() {
    PRO.can.phase = !PRO.on || proFlag("pro-makilak");
    PRO.can.dash = !PRO.on || proFlag("pro-atea");
    PRO.can.lock = !PRO.on || proFlag("pro-kalea");
    const b = document.body.classList;
    b.toggle("pro-nophase", !PRO.can.phase);
    b.toggle("pro-nodash", !PRO.can.dash);
    b.toggle("pro-nolock", !PRO.can.lock);
    keysRender();
  }
  /* ikasi gabeko tresna: garaiaz, pista txiki bat (besteetan, isilik) */
  function proNope(what) {
    if (what !== "phase" || time - PRO.nopeT < 4) return;
    PRO.nopeT = time;
    notify(L("Garaiak… oraindik ez dituzu gogoratzen."), "", 2.5);
  }
  const proDoor = () => {
    const S = HOUSE.home;
    return { x: S.x + S.fx * 1.6, y: S.y, z: S.z + S.fz * 1.6, a: Math.atan2(S.fx, S.fz) };
  };
  /* gaua: erlojua geldi, herritarrak etxean, txalaparta bakarrik */
  function proNight(tod = 0.155) {
    saved.tod = tod;
    DAY.k = nightOf(tod);
    DAY.tw = 4 * DAY.k * (1 - DAY.k);
    DAY.night = DAY.k > 0.5;
    PRO.hideNpc = PRO.ghost = true;
  }

  /* ------------------------------ eraikitzea (Iturralde barruan) ------------------------------ */
  function proBuildHouse(E, D) {
    /* oihartzun-harria: leiho azpiko aulki txikian; Iratiren ahotsa hemendik dator */
    const stool = obj(new T.BoxGeometry(0.9, 0.62, 0.7), material("#6e4a2c"));
    stool.position.set(E(-1.2), 0.31, -D / 2 + 0.75);
    solids.push({ x: E(-1.2), z: -D / 2 + 0.75, r: 0.55, h: 0.62, y: 0, pillar: true });
    const g = new T.Group(),
      st = new T.Mesh(new T.SphereGeometry(0.24, 18, 12), new T.MeshStandardMaterial({ color: "#5d7f86", roughness: 0.35, emissive: new T.Color("#5fe3c8"), emissiveIntensity: 0.2 })),
      band = new T.Mesh(new T.TorusGeometry(0.25, 0.018, 6, 28), new T.MeshBasicMaterial({ color: "#a8fff0", transparent: true, opacity: 0.5 })),
      halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7fffe0", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    st.scale.set(1, 0.72, 1);
    band.rotation.x = PI / 2;
    halo.scale.setScalar(2.4);
    g.add(st, band, halo);
    g.position.set(E(-1.2), 0.85, -D / 2 + 0.75);
    BP.add(g);
    PRO.stone = { x: E(-1.2), z: -D / 2 + 0.75, g, st, band, halo, ring: 0 };
    /* GANBARA: apalen gainean, jauzi bikoitzarekin bakarrik iristen da */
    const loft = slab({ x: E(4.1), z: -D / 2 + 0.85, y: 3.6, w: 5.4, d: 1.7, h: 0.26, mat: "wood", area: "etxeA" });
    loft.m.castShadow = true;
    const beam = material("#5a3c26");
    for (const x of [E(1.55), E(6.65)]) {
      const p = obj(new T.BoxGeometry(0.24, 3.4, 0.24), beam);
      p.position.set(x, 1.7, -D / 2 + 1.6);
      solids.push({ x, z: -D / 2 + 1.6, r: 0.22, h: 3.4, y: 0, pillar: true });
    }
    const lip = obj(new T.BoxGeometry(5.4, 0.18, 0.12), beam);
    lip.position.set(E(4.1), 3.62, -D / 2 + 1.68);
    /* Iratiren kutxa ganbaran: barruan, haren txalaparta-makilak */
    const chest = new T.Group(),
      box = new T.Mesh(new T.BoxGeometry(0.9, 0.5, 0.56), material("#7a4e2c")),
      lid = new T.Group(),
      lidM = new T.Mesh(new T.BoxGeometry(0.92, 0.14, 0.58), material("#8a5a34"));
    box.position.y = 0.25;
    lidM.position.set(0, 0.07, 0.29);
    lid.add(lidM);
    lid.position.set(0, 0.5, -0.29);
    for (const x of [-0.3, 0.3]) {
      const s = new T.Mesh(new T.BoxGeometry(0.06, 0.52, 0.6), material("#c9a35c", 0.2));
      s.position.set(x, 0.25, 0);
      chest.add(s);
    }
    chest.add(box, lid);
    const ch = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7fffe0", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    ch.scale.setScalar(2.2);
    ch.position.y = 0.7;
    chest.add(ch);
    chest.position.set(E(5.7), 3.6, -D / 2 + 0.75);
    BP.add(chest);
    PRO.chest = { x: E(5.7), y: 3.6, z: -D / 2 + 0.75, g: chest, lid, halo: ch, open: false };
    /* atea izoztuta (orainean): Gauekoren negua; iraganean, uda eta atea zabalik */
    const ice = obj(new T.BoxGeometry(2.7, 2.95, 0.42), new T.MeshStandardMaterial({ color: "#cdefff", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85, emissive: new T.Color("#6fb8e8"), emissiveIntensity: 0.35 }));
    ice.position.set(E(0), 1.47, D / 2 + 0.05);
    ice.castShadow = false;
    PRO.ice = ice;
    /* sutondoa: hitzaurrean itzalita; SORGINKERIAk pizten du */
    PRO.hearthTarget = { rune: true, x: DGE.hearth.x, y: 0.95, z: DGE.hearth.z, r: 1.3, lit: false, live: () => PRO.on && ZONE.cur === "etxea" && proFlag("pro-deia") && !proFlag("pro-sua"), hit: () => proHearthLit() };
    RUNES.push(PRO.hearthTarget);
  }
  /* sutondoa piztuta ala ez (hitzaurrearen arabera) */
  function proHearthState() {
    const H = DGE.hearth;
    if (!H) return;
    H.unlit = PRO.on && !proFlag("pro-sua");
    const tch = DGE.torches.find((t) => t.fl === H.fl);
    if (tch) tch.off = H.unlit;
  }

  /* ------------------------------ hasiera ------------------------------ */
  function prologueStart() {
    PRO.on = true;
    proLocks();
    proNight();
    proHearthState();
    if (!proFlag("pro-0")) return proColdOpen();
    if (!proFlag("pro-atea")) return proHouse();
    if (!proFlag("pro-plaza")) return proStreet();
    proDawn();
  }
  /* Gauekoren begiak hodeietan (zinemarako) */
  function proEyes() {
    if (PRO.eyes) return PRO.eyes;
    const g = new T.Group();
    for (const s of [-1, 1]) {
      const e = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffcf7a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
      e.scale.set(15, 0.1, 1);
      e.position.set(s * 9, 0, 0);
      g.add(e);
    }
    g.position.set(8, 66, -96);
    ZONES.ibarra.group.add(g);
    return (PRO.eyes = g);
  }
  function proEyesOpen(k) {
    const g = proEyes();
    g.visible = true;
    for (const e of g.children) {
      e.material.opacity = clamp(k * 1.6, 0, 1);
      e.scale.set(15, 0.1 + 5 * smooth01(clamp(k * 1.3, 0, 1)), 1);
    }
  }
  function proColdOpen() {
    const sp = TXALA.spots[0],
      S = HOUSE.home;
    film(
      [
        { d: 6.5, fade: "in", cam: [[70, 40, 122], [50, 29, 96]], look: [[0, 4, 30], [3, 3, 27]], cap: ["IBARRA HARANA · 03:12", "ERLOJUA HAUTSI ZENETIK · 365 EGUN"] },
        { d: 5.5, cam: [[7.5, 4.8, 39.5], [4.2, 3, 35.6]], look: [sp.x, 1.3, sp.z], cap: ["HERRIKO PLAZA", "HIRUGARREN GAUA · INORK EZ DU JOTZEN"] },
        { d: 4.6, cam: [[2, 5, 45], [1, 6.5, 41]], look: [[8, 30, -60], [8, 60, -96]], cap: null, say: "pro_g1", tick: (dt, k) => proEyesOpen(k) },
        { d: 4.4, cam: [[1, 6.5, 41], [-2, 12, 26]], look: [[8, 60, -96], [8, 64, -96]], say: "pro_g2", tick: () => proEyesOpen(1) },
        { d: 5.2, cam: [[11, 7, 43], [15.5, 4.4, 38.5]], look: [S.x, 2.6, S.z], cap: ["ITURRALDE · 03:40", "BI AHIZPAREN ETXEA. BAT BAKARRIK LO."], fade: "out", on: () => PRO.eyes && (PRO.eyes.visible = false) },
        /* Amaiur aurkezpena: lehen planoa, lo (ilargi-argia aurpegian), eta begiak irekitzen */
        {
          d: 4.4,
          fade: "in",
          key: "#c4d6ff",
          cap: ["AMAIUR", "LO DAGO. HARRIAK DEITUKO DIO."],
          on: () => {
            proBedroom();
            FACE.force = "closed";
          },
          cam: [() => faceCam(1.75, 0.35, 0.3), () => faceCam(1.2, 0.22, 0.1)],
          look: [faceLook, faceLook], up: faceUp,
          tick: (dt) => proStoneRing(dt, true),
        },
        {
          d: 3.8,
          key: "#c4d6ff",
          cap: ["AMAIUR · ITURRALDEKO SORGINA", "IRATIREN AHIZPA"],
          on: () => {
            FACE.force = null;
            FACE.blinkT = 2.6;
          },
          cam: [() => faceCam(1.2, 0.22, 0.1), () => faceCam(0.98, 0.16, -0.06)],
          look: [faceLook, faceLook], up: faceUp,
          tick: (dt) => proStoneRing(dt, true),
        },
        {
          d: 5.4,
          cap: null,
          on: () => proBedroom(),
          cam: [() => [DGE.bed.x + 4.6, 4.4, DGE.bed.z + 5], () => [DGE.bed.x + 3.6, 3.5, DGE.bed.z + 3.4]],
          look: [() => [DGE.bed.x, 0.9, DGE.bed.z], () => [PRO.stone.x, 0.9, PRO.stone.z]],
          tick: (dt) => proStoneRing(dt, true),
        },
      ],
      () => {
        if (PRO.eyes) PRO.eyes.visible = false;
        FACE.force = null;
        flagSet("pro-0");
        proHouse(true);
      },
    );
  }
  /* zinemaren azken planoa: etxean, ohean lo */
  function proBedroom() {
    if (ZONE.cur !== "etxea") enterZone("etxea", { x: DGE.bed.x + 1.7, y: 0, z: DGE.bed.z, a: PI / 2 }, true);
    proHearthState();
    /* etzanda: burua burkoaren aldean (iparra), aurpegia gora */
    hero.position.set(DGE.bed.x, 0.84, DGE.bed.z + 1.15);
    if (actor) actor.rotation.x = -PI / 2;
    hero.rotation.y = 0;
  }

  /* ------------------------------ 1-4 · Iturralde ------------------------------ */
  function proHouse(fromFilm) {
    if (ZONE.cur !== "etxea") enterZone("etxea", { x: DGE.bed.x + 1.8, y: 0, z: DGE.bed.z, a: PI / 2 }, true);
    teleport(DGE.bed.x + 1.8, DGE.bed.z, 0);
    P.angle = PI / 2;
    hero.rotation.y = P.angle;
    proHearthState();
    proLocks();
    if (actor) actor.rotation.x = fromFilm ? -PI / 2 : 0;
    PRO.rise = fromFilm ? 1 : 0;
    CAM.pos = null;
    title("ITURRALDE", "");
    locCaption("etxea");
    if (!proFlag("pro-deia")) {
      deiaRing(
        "IRATI",
        ["pro_i1", "pro_a1", "pro_i2", "pro_i3", "pro_a2", "pro_i4", "pro_i5"],
        () => {
          flagSet("pro-deia");
          coach("pro-magic", "J", "J edo klika: SORGINKERIA → sutondoa", "", "attackBtn", "SORGINKERIA: sutondoa piztu", "");
          hud();
        },
        16,
        { x: PRO.stone.x, z: PRO.stone.z + 0.6, r: 2.6 },
      );
      notify(L("Oihartzun-harria dardaraka dago. Hurbildu eta erantzun."), "", 5);
    }
  }
  /* oihartzun-harria: dardara, distira eta txalaparta-kolpe bigunak deia jotzen duen bitartean */
  function proStoneRing(dt, film) {
    const S = PRO.stone;
    if (!S) return;
    const on = film || RING.on;
    S.ring = mix(S.ring, on ? 1 : proFlag("pro-deia") ? 0.25 : 0, 1 - Math.exp(-dt * 4));
    S.halo.material.opacity = S.ring * (0.55 + Math.sin(time * 9) * 0.25);
    S.st.material.emissiveIntensity = 0.2 + S.ring * 1.3;
    S.g.position.x = S.x + (on ? Math.sin(time * 70) * 0.012 : 0);
    S.band.rotation.z += dt * (0.5 + S.ring * 3);
    if (film) {
      PRO.filmRing = (PRO.filmRing || 0) - dt;
      if (PRO.filmRing <= 0) {
        PRO.filmRing = 1.5;
        ["L", "L", "R"].forEach((s, i) => setTimeout(() => FILM.on && SND.tok(s, true, 0.4), i * 190));
      }
    }
  }
  function proHearthLit() {
    if (proFlag("pro-sua")) return;
    flagSet("pro-sua");
    PRO.hearthTarget.lit = true;
    proHearthState();
    const H = DGE.hearth;
    SND.flame();
    SND.rune(true);
    fxBurst(H.x, 1, H.z, { n: 46, speed: 4, up: 3, life: 1, size: 0.34, color: "#ffb35c", grav: -1.5 });
    fxRing(H.x, 0.2, H.z, "#ffcf8a", 4.5, 0.8);
    coachDone("pro-magic");
    title("SUA", "");
    setTimeout(() => {
      if (!PRO.on) return;
      deia(["pro_i6", "pro_i6b"], () => {
        coach("pro-dj", "␣ ×2", "␣ eta airean berriro ␣: JAUZI BIKOITZA", "", "jumpBtn", "JAUZI, eta airean berriro: JAUZI BIKOITZA", "");
        hud();
      });
    }, 900);
  }
  function proOpenChest() {
    const C = PRO.chest;
    if (!C || C.open) return;
    C.open = true;
    coachDone("pro-dj");
    SND.creak();
    itemGet("makilak", L("IRATIREN MAKILAK"), L("Iratiren txalaparta-makilak. Txalapartak bi ahots ditu: batak galdetzen du, besteak erantzuten. Ikasitako erritmoak edonon jo daitezke: ") + (mobile ? L("⋯ menuan, TXALAPARTA.") : L("B tekla.")), () => {
      flagSet("pro-makilak");
      if (!saved.items.includes("makilak")) saved.items.push("makilak");
      persist();
      proLocks();
      deia(["pro_i7", "pro_a3", "pro_i8", "pro_g3"], () => {
        coach("pro-phase", "Q", "Q: GARAIA → IRAGANA (uda): atea zabalik", "", "phaseBtn", "ALDATU: IRAGANA (uda) → atea zabalik", "");
        hud();
      });
    });
  }
  /* ekintzak (actionHere-tik): harria, kutxa */
  function proActionNear() {
    if (!PRO.on || ZONE.cur !== "etxea") return null;
    const C = PRO.chest;
    if (C && !C.open && Math.hypot(P.x - C.x, P.z - C.z) < 1.9 && Math.abs(P.y - C.y) < 1.2)
      return proFlag("pro-sua") ? { kind: "chest", label: L("IREKI"), fn: proOpenChest } : { kind: "locked", label: L("ILUN"), fn: () => notify(L("Ilunpean ez da ezer ikusten. Lehenik, argia: sutondoa."), "", 3) };
    return null;
  }

  /* ------------------------------ 5 · kalea: Gauekoren begiak ------------------------------ */
  const PRO_BEAMS = [
    /* [x0, z0, ax, az, abiadura, fasea, erradioa] */
    [18.2, 32, 0, 7.5, 1.35, 0, 2.6],
    [12.4, 32.4, 0, 8.2, 1.75, 2.2, 2.6],
    [6.4, 31.6, 4.4, 4.4, 1.15, 0.6, 2.4],
  ];
  function proBeamsBuild() {
    if (PRO.beams.length) return;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const gr = c.getContext("2d"),
      rg = gr.createRadialGradient(64, 64, 6, 64, 64, 62);
    rg.addColorStop(0, "rgba(255,236,190,0.95)");
    rg.addColorStop(0.65, "rgba(255,206,130,0.55)");
    rg.addColorStop(0.92, "rgba(255,170,80,0.18)");
    rg.addColorStop(1, "rgba(255,170,80,0)");
    gr.fillStyle = rg;
    gr.fillRect(0, 0, 128, 128);
    const tex = new T.CanvasTexture(c);
    for (const [x0, z0, ax, az, sp, ph, r] of PRO_BEAMS) {
      const spot = new T.Mesh(new T.CircleGeometry(r * 1.12, 32), new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      spot.rotation.x = -PI / 2;
      spot.renderOrder = 3;
      const cone = new T.Mesh(new T.CylinderGeometry(0.25, r, 26, 24, 1, true), new T.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      ZONES.ibarra.group.add(spot, cone);
      PRO.beams.push({ x0, z0, ax, az, sp, ph, r, spot, cone, x: x0, z: z0 });
    }
  }
  function proBeamsShow(v) {
    for (const B of PRO.beams) B.spot.visible = B.cone.visible = v;
  }
  function proStreet() {
    PRO.hideNpc = PRO.ghost = true;
    proLocks();
    proBeamsBuild();
    proBeamsShow(true);
    /* kalea gaindituta (partida plazan gorde zen): plazaren ondoan jarraitu */
    const d = proFlag("pro-kalea") ? { x: 6, y: 0, z: 32.5, a: -PI / 2 } : proDoor();
    if (ZONE.cur !== "ibarra") enterZone("ibarra", d, true);
    else {
      teleport(d.x, d.z, d.y);
      P.angle = d.a;
    }
    Object.assign(SAFE, { ...proDoor(), phase: 1 });
    CAM.pos = null;
    locCaption("ibarra");
    if (!proFlag("pro-kalea") && !PRO.said.street) {
      PRO.said.street = true;
      setTimeout(() => PRO.on && !proFlag("pro-kalea") && deiaRing("IRATI", ["pro_i9", "pro_i10"], () => coach("pro-dash", "F", "F: BULTZADA · ziztu bizian, begiradak ez zaitu ikusten", "", "dashBtn", "BULTZADA: ziztu bizian, begiradak ez zaitu ikusten", ""), 4), 700);
    }
  }
  /* begiradak: bidea, ukitzea eta harrapatzea */
  function proBeamsUpdate(dt) {
    if (!PRO.beams.length || ZONE.cur !== "ibarra") return;
    const active = PRO.on && proFlag("pro-atea") && !proFlag("pro-kalea");
    proBeamsShow(active);
    if (!active) return;
    const slow = PRO.caught >= 4 ? 0.72 : 1;
    for (const B of PRO.beams) {
      const a = time * B.sp * slow + B.ph;
      B.x = B.x0 + Math.cos(a) * B.ax;
      B.z = B.z0 + Math.sin(a) * B.az;
      const y = gy(B.x, B.z);
      B.spot.position.set(B.x, y + 0.07, B.z);
      B.cone.position.set(B.x, y + 13, B.z);
      B.spot.material.opacity = 0.75 + Math.sin(time * 6 + B.ph) * 0.12;
    }
    if (PRO.catchT > 0) {
      PRO.catchT -= dt;
      if (PRO.hold) {
        P.x = PRO.hold.x;
        P.z = PRO.hold.z;
        P.vx = P.vz = 0;
      }
      if (PRO.catchT <= 0) {
        $("beamAlert").hidden = true;
        PRO.hold = null;
        const d = proDoor();
        teleport(d.x, d.z, d.y);
        P.angle = d.a;
        CAM.pos = null;
        ZONE.fadeT = 0.39;
      }
      return;
    }
    if (respawnTimer || cinematic || FILM.on) return;
    /* plazara iritsita: kalea gainditua */
    if (P.x < 3.2) {
      flagSet("pro-kalea");
      proLocks();
      return proPlaza();
    }
    if (P.dashT > 0) return;
    for (const B of PRO.beams) if (Math.hypot(P.x - B.x, P.z - B.z) < B.r * 0.86) return proCaught(B);
  }
  function proCaught(B) {
    PRO.caught++;
    PRO.catchT = 1.6;
    PRO.hold = { x: P.x, z: P.z };
    $("beamAlert").hidden = false;
    $("beamAlert").textContent = L("IKUSI ZAITU");
    SND.static(1.2);
    SND.thud();
    shake(0.35);
    fxBurst(P.x, P.y + 1, P.z, { n: 30, speed: 3, up: 1, life: 0.8, size: 0.4, color: "#1a1020", grav: -2 });
    voiceLoad("pro_g4").then(() => voiceLoad("pro_g5"));
    voicePlay(PRO.caught % 2 ? "pro_g4" : "pro_g5");
    if (PRO.caught === 3) setTimeout(() => notify(L("Irati: «Bultzadan ez zaitu ikusten. Itxaron argia urruntzen den arte, eta orduan: F!»"), "", 5), 1700);
  }

  /* ------------------------------ 6 · plaza: lehen borroka ------------------------------ */
  function proPlaza() {
    if (PRO.fight) return;
    const sp = TXALA.spots[0];
    PRO.fight = { list: [], done: false };
    title("PLAZA", "");
    deia(["pro_i11", "pro_i12"], () => {
      const pos = [
        [sp.x - 5.5, sp.z - 3, 1],
        [sp.x + 5.5, sp.z - 2.5, 1],
        [sp.x, sp.z + 6.5, 0],
      ];
      for (const [x, z, era] of pos) {
        const e = spawnEnemy("grunt", era, x, z, gy(x, z));
        Object.assign(e, { terrain: true, K: 0.75, pro: true });
        PRO.fight.list.push(e);
      }
      coach("pro-lock", "T", "T: FINKATU · helburu bat, eta jo", "", "recallBtn", "◎: FINKATU · helburu bat, eta jo", "");
      notify(L("Urrezko begiak: IRAGANEAN bakarrik zauritzen dira. Urdinak: ORAINEAN."), "", 6);
      hud();
    });
  }
  function proFightUpdate() {
    const F = PRO.fight;
    if (!F || F.done || !F.list.length) return;
    if (LOCK.target) coachDone("pro-lock");
    if (F.list.every((e) => e.state === "dead")) {
      F.done = true;
      flagSet("pro-plaza");
      setTimeout(proDawn, 900);
    }
  }

  /* ------------------------------ egunsentia, Irati eta izenburua ------------------------------ */
  function proDawn() {
    const sp = TXALA.spots[0],
      N = NPCS.find((n) => n.id === "irati");
    if (ZONE.cur !== "ibarra") enterZone("ibarra", { x: sp.x + 4, y: 0, z: sp.z + 5, a: PI }, true);
    PRO.ghost = false;
    RING.on = false;
    $("deiaRing").hidden = true;
    proBeamsShow(false);
    film(
      [
        {
          d: 6,
          cam: [[sp.x + 9, 3.5, sp.z + 12], [sp.x + 5, 6, sp.z + 14]],
          look: [[sp.x, 1.5, sp.z], [sp.x - 10, 9, sp.z - 40]],
          cap: ["HERRIKO PLAZA · 06:31", "EGUNSENTIA. TXALAPARTA ISILDU DA."],
          tick: (dt, k) => {
            saved.tod = mix(0.16, 0.29, smooth01(k));
            DAY.k = nightOf(saved.tod);
            DAY.tw = 4 * DAY.k * (1 - DAY.k);
            eraVisuals();
          },
        },
      ],
      () => {
        saved.tod = 0.3;
        DAY.k = nightOf(0.3);
        DAY.night = false;
        PRO.hideNpc = false;
        if (N) {
          N.g.visible = true;
          fxBurst(N.x, 1.2, N.z, { n: 50, speed: 2.5, up: 2.5, life: 1.3, size: 0.3, color: "#bff6ff", grav: -1 });
          fxRing(N.x, 0.15, N.z, "#9ae3e5", 4, 1);
        }
        SND.memory();
        vsay(["pro_i13", "pro_a4", "pro_i14", "pro_i15", "pro_i16", "pro_a5"], proTitle, { IRATI: [0, 41, 0] });
      },
    );
  }
  function proTitle() {
    film(
      [
        { d: 7.5, cap: null, cam: [[6, 4, 46], [10, 26, 70]], look: [[0, 3, 30], [10, 30, -110]], title: ["LEIZEEN DEIA", "OIHARTZUN II"] },
        { d: 4.5, cam: [[10, 26, 70], [11, 28, 72]], look: [10, 30, -110], say: "pro_g6", fade: "out", title: ["LEIZEEN DEIA", "OIHARTZUN II"] },
      ],
      proEnd,
    );
  }
  function proEnd() {
    for (const k of ["pro-0", "pro-deia", "pro-sua", "pro-makilak", "pro-atea", "pro-kalea", "pro-plaza", "intro", "irati1", "prologoa"]) if (!proFlag(k)) saved.flags.push(k);
    if (!saved.items.includes("makilak")) saved.items.push("makilak");
    saved.tod = Math.max(saved.tod, 0.3);
    PRO.on = PRO.hideNpc = PRO.ghost = false;
    if (actor) actor.rotation.x = 0;
    proLocks();
    proHearthState();
    proBeamsShow(false);
    for (const e of ENEMIES) if (e.pro && e.state !== "dead") killEnemy(e);
    persist();
    $("filmFade").style.opacity = 0;
    title("IBARRA", "");
    notify(L("Plazako txalaparta: Pello eta Peiok erritmo zaharrak dakizkite."), "", 6);
    hud();
  }
  /* probetarako (eta partida zaharretarako): hitzaurrea saltatu */
  function prologueSkip() {
    if (FILM.on) {
      FILM.after = null;
      filmEnd();
    }
    if (cinematic) endScene();
    RING.on = false;
    $("deiaRing").hidden = true;
    proEnd();
    if (ZONE.cur !== "ibarra") enterZone("ibarra", ZONES.ibarra.spawn, true);
  }

  /* ------------------------------ eguneraketa (tick-etik) ------------------------------ */
  function proUpdate(dt) {
    if (!PRO.on) return;
    /* esnatzea: ohetik zutitu */
    if (PRO.rise > 0) {
      PRO.rise = Math.max(0, PRO.rise - dt * 1.6);
      if (actor) actor.rotation.x = -PI / 2 * smooth01(PRO.rise);
    }
    if (ZONE.cur === "etxea") {
      proStoneRing(dt, false);
      const C = PRO.chest;
      if (C) {
        C.halo.material.opacity = proFlag("pro-sua") && !C.open ? 0.55 + Math.sin(time * 4) * 0.25 : 0;
        C.lid.rotation.x = mix(C.lid.rotation.x, C.open ? -1.9 : 0, 1 - Math.exp(-dt * 6));
      }
      /* izotza: orainean atea itxita; iraganean (uda) zabalik */
      const iceOn = !proFlag("pro-atea");
      PRO.ice.visible = iceOn;
      if (iceOn) {
        PRO.ice.material.opacity = 0.85 * phaseBlend;
        if (phase === 1 && Math.abs(P.x - HX) < 1.7 && P.z > 4.35) {
          P.z = 4.35;
          P.vz = Math.min(0, P.vz);
          if (!PRO.said.ice && proFlag("pro-makilak")) {
            PRO.said.ice = true;
            notify(L("Izotza. Gogoratu udako atea: GARAIA."), "", 3);
          }
        }
        if (phase === 0 && proFlag("pro-makilak")) coachDone("pro-phase");
      }
      return;
    }
    if (ZONE.cur === "ibarra") {
      /* etxetik irtenda: kalea */
      if (!proFlag("pro-atea") && proFlag("pro-makilak")) {
        flagSet("pro-atea");
        proLocks();
        proStreet();
      }
      proBeamsUpdate(dt);
      if (proFlag("pro-kalea") && !proFlag("pro-plaza") && !PRO.fight && !cinematic && !FILM.on) proPlaza();
      proFightUpdate();
    }
  }
  /* helburua (HUD) hitzaurrean */
  function proObjective() {
    if (ZONE.cur === "etxea") {
      if (!proFlag("pro-deia")) return ["Oihartzun-harria dardaraka: hurbildu eta ERANTZUN.", [PRO.stone.x, PRO.stone.z + 1.2, 0]];
      if (!proFlag("pro-sua")) return ["Piztu sutondoa SORGINKERIArekin.", [DGE.hearth.x, DGE.hearth.z + 1.5, 0]];
      if (!proFlag("pro-makilak")) return ["Ganbaran, Iratiren kutxa. JAUZI BIKOITZA.", [PRO.chest.x, PRO.chest.z, 3.6]];
      return ["Atea izoztuta: GARAIA aldatu (IRAGANA, uda) eta irten.", [DGE.exitArch.x, DGE.exitArch.z - 1, 0]];
    }
    if (!proFlag("pro-kalea")) return ["Plazara, Gauekoren begiei ihes eginez (itzalean itxaron edo BULTZADA).", [2, 31, 0]];
    if (!proFlag("pro-plaza")) return ["Plazako itzalak garbitu. Urrezko begiak: IRAGANA.", [TXALA.spots[0].x, TXALA.spots[0].z, 0]];
    return ["Egunsentia.", null];
  }
