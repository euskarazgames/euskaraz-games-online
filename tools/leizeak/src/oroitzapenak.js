  /* ==================================================================
     OROITZAPENAK · zazpi oroitzapen (diseinu propioa). Zaindari bat askatu eta haranera itzultzean,
     iraganeko eszena labur bat (zinema, sepia eta bineta): Gau Beltza, amona, Atarrabiren itzala,
     zortzigarren sua, zazpi txingarrak, Mikelats eta bi anaiak. Istorioaren muina, pixkanaka:
       · Hiru negu lehenago, Gau Beltzaren gauean, Amaiurren ahizpak kaiko kanpaia jo zuen eta ez zen
         itzuli (GAU BELTZAren istorioa); ordutik, negua.
       · Mariren semeek Etsairen leizean ikasi zuten; Atarrabik itzala galdu zuen, eta Mikelatsek hartu.
       · Marik zazpi txingar eman zizkien zazpi zaindariei, eta zortzigarrena Iturraldeko sutondoari
         (amona gaztea zen). Mikelatsek, ezer ez: ekaitza bihurtu zen.
     Probetan (?test) ez dira bakarrik jotzen, window.__oroit ezarri ezean (botak ez eteteko).
     Egunkarian gordetzen dira (laburpena), eta Iturralden, oroigarriaren ondoan, berriro ikus daitezke.
     ================================================================== */
  const OROIT = { actors: {}, bell: null, clock: null, timer: 0, last: 0 };
  const OROIT_LIST = [
    { flag: "basajaun", n: "I", name: "GAU BELTZA", when: "HIRU NEGU LEHENAGO · KAIA", sum: "Gau Beltzaren gauean, ekaitz bat. Nire ahizpak kaiko kanpaia jo zuen, Txomin itsasotik deitzeko. Txomin itzuli zen; bera, ez." },
    { flag: "lamia", n: "II", name: "AMONA", when: "HAMAR URTE LEHENAGO · PLAZA", sum: "Amonak txalaparta irakatsi zigun: batak galdetzen du, besteak erantzuten du. Eguna egunekoentzat, gaua gauekoentzat." },
    { flag: "tartalo", n: "III", name: "ATARRABIREN ITZALA", when: "AMONAREN IPUINA · ETSAIREN LEIZEA", sum: "Mariren bi semeek Etsairen leizean ikasi zuten. Atarrabi azkena irten zen, eta itzala utzi zuen; anaiak hartu zuen." },
    { flag: "errolan", n: "IV", name: "ZORTZIGARREN SUA", when: "BERROGEITA HAMAR URTE LEHENAGO · ITURRALDE", sum: "Marik bere sua utzi zuen Iturraldeko sutondoan, herria zaintzeko. Amona gaztea zen, eta zaintzea hitz eman zuen." },
    { flag: "odei", n: "V", name: "ZAZPI TXINGARRAK", when: "BERROGEITA HAMAR URTE LEHENAGO · MARIREN LEIZEA", sum: "Marik zazpi txingar eman zizkien zazpi zaindariei. Mikelatsi, ezer ez. Haren ekaitzak gorri bihurtu zituen." },
    { flag: "herensugea", n: "VI", name: "MIKELATS", when: "ANTZINA ETA ORAIN · EKAITZAREN GAUA", sum: "Mikelatsek anaiaren itzala gorde zuen leizean. Itzal hartatik egin ditu bere soldaduak." },
    { flag: "inguma", n: "VII", name: "ANAIAK", when: "ORAIN · MURUMENDI", sum: "Atarrabik ez du anaia hil nahi: lo egin dezala, mendiaren azpian, ekaitza baretu arte." },
  ];
  const oroitSeen = (i) => saved.flags.includes("oroit-" + (i + 1));
  /* ---------------------------- aktoreak eta atrezzoa ---------------------------- */
  /* iraganeko pertsonaiak: herritarren eredu kaputxadunak, kolore propioekin */
  function oroitActor(id) {
    if (OROIT.actors[id]) return OROIT.actors[id];
    const D = { atarrabi: { model: "npc_rogue", tint: "#d9c39a" }, mikelats: { model: "npc_knight", tint: "#2a3448" }, irati: { model: "npc_hooded", tint: "#9fd0f0" }, iratiTxiki: { model: "npc_hooded", tint: "#9fd0f0", scale: 0.7 }, amaiurTxiki: { model: "npc_hooded", tint: "#8f7fd8", scale: 0.72 }, amona: { model: "npc_hooded", tint: "#b3a6c4" } }[id];
    const root = D && npcMesh(D);
    if (!root) return null;
    const g = new T.Group();
    g.add(root);
    g.visible = false;
    ZONES.ibarra.group.add(g);
    const mixer = new T.AnimationMixer(root);
    const idle = models.mage.animations.find((c) => c.name === "Idle");
    if (idle) mixer.clipAction(idle).play();
    return (OROIT.actors[id] = { g, mixer });
  }
  function oroitPlace(id, x, y, z, a) {
    const A = oroitActor(id);
    if (!A) return;
    /* uneko zonaren taldean (Anboton ere ikusteko) */
    const G = ZONES[ZONE.cur].group || scene;
    if (A.g.parent !== G) G.add(A.g);
    A.g.position.set(x, y, z);
    A.g.rotation.y = a;
    A.g.visible = true;
  }
  function oroitActorsTick(dt) {
    for (const k in OROIT.actors) if (OROIT.actors[k].g.visible) OROIT.actors[k].mixer.update(dt);
  }
  /* kaiko kanpaia (I): zutoina, habea eta brontzezko kanpaia */
  function oroitBell() {
    if (OROIT.bell) return OROIT.bell;
    const g = new T.Group(),
      wood = material("#6b4a2e");
    for (const s of [-1, 1]) {
      const post = obj(new T.CylinderGeometry(0.09, 0.11, 3.2, 6), wood, g);
      post.position.set(s * 0.8, 1.6, 0);
    }
    const beam = obj(new T.BoxGeometry(1.9, 0.16, 0.18), wood, g);
    beam.position.y = 3.2;
    const swing = new T.Group();
    swing.position.y = 3.1;
    g.add(swing);
    const bell = obj(new T.CylinderGeometry(0.22, 0.48, 0.7, 14, 1, true), new T.MeshStandardMaterial({ color: "#b07a3a", metalness: 0.8, roughness: 0.35, side: T.DoubleSide }), swing);
    bell.position.y = -0.42;
    g.visible = false;
    ZONES.ibarra.group.add(g);
    return (OROIT.bell = { g, swing });
  }
  /* erlojua (III): esfera handia badiaren gainean, orratzak geldituta */
  function oroitClock() {
    if (OROIT.clock) return OROIT.clock;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#f3e6c8";
    x.beginPath();
    x.arc(128, 128, 120, 0, TAU);
    x.fill();
    x.lineWidth = 8;
    x.strokeStyle = "#5a3d1e";
    x.stroke();
    x.fillStyle = "#3a2612";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      x.fillRect(128 + Math.sin(a) * 98 - 4, 128 - Math.cos(a) * 98 - 10, 8, 20);
    }
    const tex = new T.CanvasTexture(c);
    const face = new T.Mesh(new T.CircleGeometry(9, 48), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, fog: false }));
    const hand = (len, w) => {
      const h = new T.Mesh(new T.PlaneGeometry(w, len), new T.MeshBasicMaterial({ color: "#2a1a0c", fog: false }));
      h.geometry.translate(0, len / 2, 0.05);
      face.add(h);
      return h;
    };
    const hh = hand(5, 0.6),
      mm = hand(7.5, 0.4);
    const g = new T.Group();
    g.add(face);
    g.position.set(10, 16, 104);
    g.rotation.y = PI;
    g.visible = false;
    ZONES.ibarra.group.add(g);
    return (OROIT.clock = { g, hh, mm, face });
  }
  /* Anbotoko ilunpea (VI, VII): eszenatoki txiki bat haranaren azpian (kupula iluna, harri-zorua,
     estalaktitak eta lanbro urdin bat), Irati zazpi argiren artean */
  const OVD = { x: -900, y: 40, z: 900 };
  function oroitVoid() {
    if (OROIT.void) return OROIT.void;
    const g = new T.Group();
    g.position.set(OVD.x, OVD.y, OVD.z);
    const dome = new T.Mesh(new T.SphereGeometry(16, 24, 16), new T.MeshBasicMaterial({ color: "#07080c", side: T.BackSide, fog: false }));
    g.add(dome);
    const floor = new T.Mesh(new T.CircleGeometry(9, 32), rockMaterial());
    floor.rotation.x = -PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU,
        c = new T.Mesh(new T.ConeGeometry(0.5 + (i % 3) * 0.3, 3 + (i % 4), 6), rockMaterial());
      c.position.set(Math.cos(a) * (5 + (i % 2) * 2), 7 - (i % 4) * 0.5, Math.sin(a) * (5 + (i % 2) * 2));
      c.rotation.x = PI;
      g.add(c);
    }
    const mist = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#3a4f8a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
    mist.position.set(0, 1.2, -3);
    mist.scale.set(16, 6, 1);
    g.add(mist);
    g.visible = false;
    scene.add(g);
    return (OROIT.void = g);
  }
  const vc = (x, y, z) => [OVD.x + x, OVD.y + y, OVD.z + z];
  function oroitOrbs() {
    OROIT.orbs = [];
    for (let n = 0; n < 7; n++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#3dff8a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      s.scale.setScalar(0.7);
      scene.add(s);
      OROIT.orbs.push(s);
    }
  }
  function oroitOrbsTick() {
    if (OROIT.orbs) OROIT.orbs.forEach((s, n) => s.position.set(OVD.x + Math.cos(time * 0.6 + (n / 7) * TAU) * 1.6, OVD.y + 1.6 + Math.sin(time + n) * 0.2, OVD.z + Math.sin(time * 0.6 + (n / 7) * TAU) * 1.6));
  }
  /* ------------------------------ eszenak ------------------------------ */
  const OSH = (o) => ({ vfx: "oroit", ...o });
  function oroitShots(i) {
    const dock = { x: 8, y: -7.2, z: 80.5 },
      sp = TXALA.spots[0];
    switch (i) {
      case 0: /* KANPAIA */
        return [
          OSH({ d: 4.6, fade: "in", night: 0.9, cam: [[24, 3, 106], [17, -1, 97]], look: [dock.x, -5.5, 85], on: () => {
            const B = oroitBell();
            B.g.position.set(9.8, dock.y, 86.4);
            B.g.visible = true;
            oroitPlace("irati", 8.4, dock.y, 85.2, 0.5);
            hero.position.set(8, dock.y, 77.4);
            hero.rotation.y = 0.1;
            FACE.force = null;
          }, tick: (dt, k) => {
            OROIT.bell.swing.rotation.z = Math.sin(time * 2.4) * 0.12;
            if (Math.random() < dt * 6) fxBurst(dock.x + (Math.random() - 0.5) * 30, 6, 90 + (Math.random() - 0.5) * 20, { n: 6, speed: 0.4, life: 0.8, size: 0.08, color: "#cfdbe6", grav: 18, drag: 0 });
          } }),
          OSH({ d: 4.2, night: 0.9, say: "o1_i1", cam: [[5.4, -5.5, 82.2], [6.1, -5.7, 83.1]], look: [8.4, -6.1, 85.2], tick: () => (OROIT.bell.swing.rotation.z = Math.sin(time * 2.4) * 0.12) }),
          OSH({ d: 4.2, night: 0.9, say: "o1_a1", cam: [() => faceCam(2.4, 0.35, 0.8), () => faceCam(1.8, 0.25, 0.5)], look: [faceLook, faceLook], key: "#9fb6e6" }),
          OSH({ d: 4.6, night: 0.9, say: "o1_i2", cam: [[11.4, -5.2, 88.6], [10.6, -5.5, 87.6]], look: [8.8, -5.9, 85.6], tick: () => (OROIT.bell.swing.rotation.z = Math.sin(time * 2.4) * 0.12) }),
          OSH({ d: 5.2, night: 0.9, text: ["· · ·", "Kanpaiak hamaika aldiz jo zuen. Eta gero, isiltasuna."], cam: [[8, 2, 70], [8, 10, 62]], look: [[9.8, -4.2, 86.4], [12, 0, 100]], on: () => {
            OROIT.actors.irati.g.visible = false;
            for (let n = 0; n < 3; n++) setTimeout(() => FILM.on && SND.echo(1 - n * 0.3), n * 1300);
          }, tick: () => (OROIT.bell.swing.rotation.z = Math.sin(time * 5) * 0.4 * Math.max(0, 1 - FILM.t / 4)) }),
          OSH({ d: 4.6, night: 0.95, say: "o1_g1", fade: "out", cam: [[2, 7, 70], [0, 10, 64]], look: [[8, 30, -60], [8, 62, -96]] }),
        ];
      case 1: /* AMONA */
        return [
          OSH({ d: 4.8, fade: "in", night: 0.15, cam: [[10, 6, 22], [6.5, 3.6, 25.5]], look: [sp.x, 1.2, sp.z], on: () => {
            oroitPlace("amona", sp.x, 0, sp.z + 2.1, PI);
            oroitPlace("iratiTxiki", sp.x - 1.1, 0, sp.z - 1.6, 0);
            oroitPlace("amaiurTxiki", sp.x + 1.1, 0, sp.z - 1.6, 0);
            hero.position.set(0, -50, 0);
          } }),
          OSH({ d: 4.6, night: 0.15, say: "o2_n1", cam: [[sp.x + 2.2, 1.9, sp.z - 1.4], [sp.x + 1.6, 1.8, sp.z - 0.8]], look: [sp.x, 1.5, sp.z + 2.1] }),
          OSH({ d: 4.6, night: 0.15, say: "o2_n2", cam: [[sp.x - 3.2, 2.4, sp.z + 0.6], [sp.x - 2.6, 2.2, sp.z + 1.2]], look: [sp.x, 1.4, sp.z + 1.4], tick: (dt) => { const T0 = TXALA.spots[0]; if (Math.random() < dt * 3) { T0.planks[Math.random() < 0.5 ? 0 : 2].position.y = 1.25; SND.tok(Math.random() < 0.5 ? "L" : "R", true); } for (const pl of T0.planks) pl.position.y = mix(pl.position.y, 1.33, 1 - Math.exp(-dt * 10)); } }),
          OSH({ d: 3.8, night: 0.15, say: "o2_i1", cam: [[sp.x - 0.4, 1.05, sp.z - 0.4], [sp.x - 0.6, 1, sp.z - 0.6]], look: [sp.x - 1.1, 0.85, sp.z - 1.6] }),
          OSH({ d: 5, night: 0.15, say: "o2_n3", fade: "out", cam: [[sp.x + 0.4, 2.2, sp.z + 5.4], [sp.x + 0.2, 2.6, sp.z + 6.4]], look: [sp.x, 1.5, sp.z + 2.1] }),
        ];
      case 2: /* ATARRABIREN ITZALA: amonaren ipuina, plazan, ilunabarrean */
        return [
          OSH({ d: 4.8, fade: "in", night: 0.55, cam: [[10, 6, 22], [6.5, 3.6, 25.5]], look: [sp.x, 1.2, sp.z], on: () => {
            oroitPlace("amona", sp.x, 0, sp.z + 2.1, PI);
            oroitPlace("iratiTxiki", sp.x - 1.1, 0, sp.z - 1.6, 0);
            oroitPlace("amaiurTxiki", sp.x + 1.1, 0, sp.z - 1.6, 0);
            hero.position.set(0, -50, 0);
          } }),
          OSH({ d: 5.2, night: 0.55, say: "o3_a1", cam: [[sp.x + 2.2, 1.9, sp.z - 1.4], [sp.x + 1.6, 1.8, sp.z - 0.8]], look: [sp.x, 1.5, sp.z + 2.1] }),
          OSH({ d: 5.2, night: 0.7, text: ["· · ·", "Etsairen leizean, azkena irteten zena maisuarena zen. Atarrabik itzala utzi zion atean, eta ihes egin zuen."], cam: [[-6, 8, 50], [6, 10, 44]], look: [[0, 6, 20], [0, 30, -60]] }),
          OSH({ d: 4.6, night: 0.55, say: "o3_a2", cam: [[sp.x - 3.2, 2.4, sp.z + 0.6], [sp.x - 2.6, 2.2, sp.z + 1.2]], look: [sp.x, 1.4, sp.z + 1.4] }),
          OSH({ d: 5, night: 0.6, say: "o3_i1", fade: "out", cam: [[sp.x + 0.4, 2.2, sp.z + 5.4], [sp.x + 0.2, 2.6, sp.z + 6.4]], look: [sp.x, 1.5, sp.z + 2.1] }),
        ];
      case 3: /* ZORTZIGARREN SUA: Mari Iturraldera jaitsi zen; sorgin gazteak sua zaintzea hitz eman */
        return [
          OSH({ d: 5, fade: "in", night: 0.9, text: ["· · ·", "Antzina, Mari mendiz mendi zebilen, suzko bola batean. Gau batean, Ibarrara jaitsi zen."], cam: [[20, 14, -20], [16, 22, -40]], look: [[-20, 60, -280], [-28, 120, -320]] }),
          OSH({ d: 5.4, night: 0.9, say: "o4_m1", cam: [[16, 22, -40], [10, 30, -60]], look: [-28, 120, -320], on: () => {
            if (!ZAZPI.g) zazpiBuild();
            zazpiColors(0);
            ZAZPI.g.visible = true;
            ZAZPI.t = 0;
          }, tick: (dt) => zazpiUpdate(dt) }),
          OSH({ d: 5.2, night: 0.85, say: "o4_n1", cam: [[0, 8, 30], [-2, 16, 18]], look: [[-20, 70, -200], [10, 110, -120]], on: () => {
            if (!MARI.m) mariCliffMesh();
            MARI.t = 0;
          }, tick: (dt) => mariFlight(dt) }),
          OSH({ d: 5.2, night: 0.85, text: ["· · ·", "Sorgin gazteak sutondoan gorde zuen txingarra. Ordutik, Iturralden ez zen sua inoiz itzali, deiaren gauera arte."], fade: "out", cam: [[0, 4, 46], [0, 3, 40]], look: [[0, 30, -20], [0, 60, -80]], on: () => setTimeout(() => FILM.on && SND.echo(0.6), 600), tick: (dt) => mariFlight(dt) }),
        ];
      case 4: /* ZAZPI TXINGARRAK */
        return [
          OSH({ d: 5.4, fade: "in", night: 0.75, say: "o5_m1", cam: [[60, 40, 40], [20, 46, 0]], look: [[-10, 10, -130], [-40, 20, -140]], on: () => {
            if (!ZAZPI.g) zazpiBuild();
            zazpiColors(7); /* zaindariek gordetako urteak: argi berdeak */
            ZAZPI.g.visible = true;
            ZAZPI.t = 2;
          }, tick: (dt) => zazpiUpdate(dt) }),
          OSH({ d: 5.2, night: 0.75, say: "o5_m2", cam: [[20, 46, 0], [10, 50, -20]], look: [20, 125, -170], tick: (dt) => zazpiUpdate(dt) }),
          OSH({ d: 5.2, night: 0.95, say: "o5_g1", fade: "out", cam: [[2, 7, 60], [0, 10, 54]], look: [[8, 40, -70], [8, 62, -96]], tick: (dt, k) => {
            proEyesOpen(k);
            /* Mikelatsen ekaitza: zazpi txingarrak gorri bihurtzen dira */
            if (k > 0.55 && ZAZPI.green) {
              zazpiColors(0);
              SND.stinger(false);
            }
          } }),
        ];
      case 5: /* MIKELATS: anaiaren itzala */
        return [
          OSH({ d: 5.2, fade: "in", night: 0.9, say: "o6_g1", cam: [[-12, 5, 56], [-6, 4, 50]], look: [0, 2, 36], on: () => (hero.position.y = -50) }),
          OSH({ d: 5.6, night: 0.95, say: "o6_g2", cam: [[2, 7, 66], [0, 9, 60]], look: [[8, 40, -70], [8, 62, -96]], tick: (dt, k) => proEyesOpen(0.4 + k * 0.6) }),
          OSH({ d: 4.2, night: 1, say: "o6_i1", vfx: "dry", cam: [vc(2.2, 1.4, 3.2), vc(1.6, 1.3, 2.4)], look: vc(0, 1.2, 0), key: "#7f9fe0", on: () => {
            oroitVoid().visible = true;
            oroitPlace("atarrabi", OVD.x, OVD.y, OVD.z, 0.5);
            proEyes().visible = false;
          } }),
          OSH({ d: 5.6, night: 1, say: "o6_g3", fade: "out", cam: [vc(1.6, 1.3, 2.4), vc(-3, 4, 6)], look: [vc(0, 1.2, 0), vc(0, 4, -6)], key: "#7f9fe0" }),
        ];
      default: /* ANAIAK: Atarrabi, hutsunean */
        return [
          OSH({ d: 5.6, fade: "in", night: 1, say: "o7_i1", vfx: "dry", cam: [vc(2.6, 1.6, 3.4), vc(1.8, 1.4, 2.6)], look: vc(0, 1.3, 0), key: "#9fb6e6", on: () => {
            oroitVoid().visible = true;
            oroitPlace("atarrabi", OVD.x, OVD.y, OVD.z, 0.5);
            hero.position.y = -50;
            oroitOrbs();
          }, tick: oroitOrbsTick }),
          OSH({ d: 5.6, night: 1, say: "o7_i2", vfx: "dry", cam: [vc(-1.6, 1.3, 2.4), vc(-1.1, 1.25, 1.9)], look: vc(0, 1.25, 0), key: "#9fb6e6", tick: oroitOrbsTick }),
          OSH({ d: 5.6, night: 1, say: "o7_i3", vfx: "dry", fade: "out", cam: [vc(-1.1, 1.25, 1.9), vc(3, 5, 7)], look: [vc(0, 1.25, 0), vc(0, 6, -8)], tick: oroitOrbsTick }),
        ];
    }
  }
  /* Mariren suzko bola (haranean, mariCliff-ena bera): zinemetan berrerabilia */
  function mariCliffMesh() {
    MARI.m = new T.Mesh(new T.SphereGeometry(4, 16, 12), new T.MeshBasicMaterial({ color: "#ffb347" }));
    MARI.glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff9a3a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
    MARI.glow.scale.setScalar(40);
    MARI.m.add(MARI.glow);
    ZONES.ibarra.group.add(MARI.m);
  }
  /* oroitzapenean: Anbototik gora, zerura (mariUpdate-ren alderantzizkoa) */
  function mariFlight(dt) {
    if (!MARI.m) return;
    MARI.t = Math.max(0, MARI.t) + dt;
    const k = Math.min(1, MARI.t / 9);
    MARI.m.visible = true;
    MARI.m.position.set(mix(-28, 10, k), mix(120, 260, k), mix(-320, -120, k));
    if (Math.random() < dt * 30) fxBurst(MARI.m.position.x, MARI.m.position.y, MARI.m.position.z, { n: 3, speed: 2, life: 1.2, size: 2.4, color: "#ffb347", grav: 0 });
  }
  /* ------------------------------ jo / itxi ------------------------------ */
  function oroitPlay(i, after) {
    if (FILM.on || cinematic) return false;
    const O = OROIT_LIST[i];
    /* etxetik (Iturralde, oroigarriak) ere bai: eszena haranean dago — zona une batez aldatu */
    const back = ZONE.cur !== "ibarra" ? ZONE.cur : null;
    if (back) zoneActivate("ibarra");
    const shots = oroitShots(i);
    /* lehen planoa: oroitzapenaren txartela (zenbakia, izena eta noiz) */
    shots[0].title = ["OROITZAPENA · " + O.n, O.name + " — " + O.when];
    document.body.classList.add("oroit");
    /* herritarrak etxean (iraganeko eszenetan ez daude; bestela aktoreekin gainjarri) */
    PRO.hideNpc = true;
    SND.memory();
    film(shots, () => {
      oroitEnd();
      if (back) zoneActivate(back);
      if (!saved.flags.includes("oroit-" + (i + 1))) flagSet("oroit-" + (i + 1));
      notify(L("Oroitzapena egunkarian gorde da: ") + O.name + " (" + saved.flags.filter((f) => f.startsWith("oroit-")).length + " / 7)", "", 4);
      hud();
      if (after) after();
    });
    return true;
  }
  function oroitEnd() {
    document.body.classList.remove("oroit");
    if (!PRO.on) PRO.hideNpc = false;
    for (const k in OROIT.actors) OROIT.actors[k].g.visible = false;
    if (OROIT.bell) OROIT.bell.g.visible = false;
    if (OROIT.clock) OROIT.clock.g.visible = false;
    if (OROIT.void) OROIT.void.visible = false;
    OROIT.clockCrack = 0;
    if (OROIT.orbs) {
      for (const s of OROIT.orbs) s.parent && s.parent.remove(s);
      OROIT.orbs = null;
    }
    if (PRO.eyes) PRO.eyes.visible = false;
    if (ZAZPI.g) {
      ZAZPI.g.visible = false;
      ZAZPI.t = -1;
    }
    if (MARI.m) MARI.m.visible = false;
    MARI.t = -1;
  }
  /* haranera itzultzean (zoneEntered-etik): askatutako zaindari baten oroitzapena, ikusi gabe badago */
  const OROIT_TEST = new URLSearchParams(location.search).has("test");
  function oroitCheck(id) {
    if (id !== "ibarra" || (OROIT_TEST && !window.__oroit) || PRO.on) return;
    const i = OROIT_LIST.findIndex((O, n) => n < 6 && saved.flags.includes(O.flag) && !oroitSeen(n));
    if (i < 0) return;
    clearTimeout(OROIT.timer);
    OROIT.timer = setTimeout(() => ZONE.cur === "ibarra" && started && !FILM.on && !cinematic && !TXALA.on && !RING.on && oroitPlay(i), 1800);
  }
  /* egunkarirako: ikusitako oroitzapenen laburpenak */
  function oroitLog() {
    const seen = OROIT_LIST.filter((O, i) => oroitSeen(i));
    if (!seen.length) return "";
    return L("OROITZAPENAK") + " · " + seen.length + " / 7\n" + seen.map((O) => "◆ " + O.n + " · " + O.name + "\n   " + L(O.sum)).join("\n");
  }
