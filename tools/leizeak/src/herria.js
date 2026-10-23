  /* ==================================================================
     HERRIA · etxe bakoitzak bere izena eta bere jendea
     Herri txiki bat, baina bizia: etxe bakoitzak izena du (atearen gainean) eta norbait
     bizi da barruan. ATEA JO: eguna ala gaua, nor dagoen etxean eta istorioa nola doan,
     erantzun desberdinak (eta opari txiki batzuk). Mendietakoak itzultzen dira zaindariak
     askatu ahala. ITURRALDE: Amaiur eta Iratiren etxea — barrura sartu daiteke:
     sutondoa (atseden), ohea (eguna/gaua), Iratiren txokoa eta zaindarien oroitzapenak.
     ================================================================== */
  const HOUSE_DEFS = [
    { id: "pellonea", name: "PELLONEA", at: [17, 22], who: ["pello", "peio"] },
    { id: "iturralde", name: "ITURRALDE", at: [28, 31], home: true },
    { id: "arrantzalenea", name: "ARRANTZALENEA", at: [14, 56], who: ["txomin"] },
    { id: "okinenea", name: "OKINENEA", at: [-12, 55], who: ["maite"] },
    { id: "goikoetxea", name: "GOIKOETXEA", at: [-27, 50], who: ["mikel"] },
    { id: "belarrenea", name: "BELARRENEA", at: [33, 47], who: ["kattalin"] },
    { id: "artzainenea", name: "ARTZAINENEA", at: [-38, 22], who: ["joanes"] },
    { id: "mendieta", name: "MENDIETA", at: [40, 18] },
    { id: "anderenea", name: "ANDERENEA", at: [-40, 48], sealed: true },
    { id: "olaberria", name: "OLABERRIA", at: [25, 43], who: ["maddi"] },
    { id: "ostatua", name: "OSTATUA", at: [2, 58] },
  ];
  const HOUSE = { list: [], breadT: -99, home: null };
  const freedCount = () => ["basajaun", "lamia", "tartalo", "errolan", "odei", "herensugea"].filter((k) => saved.flags.includes(k)).length;
  const isNight = () => DAY.k > 0.5;
  /* etxe-izenaren ohola: egur iluna, letra zizelkatuak eta bi lauburu txiki */
  function nameBoard(text) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 112;
    const g = c.getContext("2d");
    g.fillStyle = "#3b2618";
    g.fillRect(0, 0, 512, 112);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(${90 + (i % 3) * 14},${58 + (i % 2) * 10},34,0.35)`;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 8 + i * 7.5);
      g.bezierCurveTo(170, 4 + i * 7.5 + (i % 3), 340, 12 + i * 7.5, 512, 6 + i * 7.5);
      g.stroke();
    }
    g.strokeStyle = "#1c120b";
    g.lineWidth = 8;
    g.strokeRect(4, 4, 504, 104);
    g.font = "bold 50px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const fit = Math.min(1, 380 / g.measureText(text).width);
    g.save();
    g.translate(256, 58);
    g.scale(fit, 1);
    g.fillStyle = "#1a0f08";
    g.fillText(text, 2, 3);
    g.fillStyle = "#f0d9a8";
    g.fillText(text, 0, 0);
    g.restore();
    for (const x of [38, 474]) {
      g.strokeStyle = "#e3c48a";
      g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const a = (i * PI) / 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 9, 56 + Math.sin(a) * 9, 9, a, a + PI);
        g.stroke();
      }
    }
    const t = new T.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  /* etxeen ateak (KayKit etxeen aurrealdea: +z tokian) eta izen-oholak */
  function herriaInit() {
    zoneBuild("ibarra");
    for (const D of HOUSE_DEFS) {
      const H = HOUSES.find((h) => Math.hypot(h.x - D.at[0], h.z - D.at[1]) < 0.5);
      if (!H || !H.m) continue;
      const m = H.m,
        rot = m.rotation.y;
      m.rotation.y = 0;
      m.updateMatrixWorld(true);
      const bb = new T.Box3().setFromObject(m);
      m.rotation.y = rot;
      m.updateMatrixWorld(true);
      const cx = m.position.x,
        cz = m.position.z,
        ox = (bb.min.x + bb.max.x) / 2 - cx,
        hd = bb.max.z - cz,
        fx = Math.sin(rot),
        fz = Math.cos(rot),
        /* tokiko (ox, hd) → mundua */
        wx = (lx, lz) => cx + lx * Math.cos(rot) + lz * Math.sin(rot),
        wz = (lx, lz) => cz - lx * Math.sin(rot) + lz * Math.cos(rot),
        y0 = bb.min.y;
      const board = new T.Mesh(new T.PlaneGeometry(2.3, 0.5), new T.MeshStandardMaterial({ map: nameBoard(D.name), roughness: 0.8 }));
      board.position.set(wx(ox, hd + 0.08), y0 + Math.min(3.4, (bb.max.y - y0) * 0.42), wz(ox, hd + 0.08));
      board.rotation.y = rot;
      board.castShadow = false;
      BP.add(board);
      /* atzealdea ere irakurgarri (etxea gardentzen denean, kameratik) */
      const back = board.clone();
      back.rotation.y = rot + PI;
      back.position.set(wx(ox, hd + 0.06), board.position.y, wz(ox, hd + 0.06));
      BP.add(back);
      const S = { ...D, x: wx(ox, hd + 1.1), z: wz(ox, hd + 1.1), y: y0, fx, fz, board, gifts: 0 };
      HOUSE.list.push(S);
      if (D.home) HOUSE.home = S;
    }
  }
  function houseDoorNear() {
    if (ZONE.cur !== "ibarra") return null;
    return HOUSE.list.find((S) => !S.sealed && Math.hypot(P.x - S.x, P.z - S.z) < 2.1 && Math.abs(P.y - S.y) < 1.8) || null;
  }
  function houseAction(S) {
    return S.home ? { kind: "door", label: L("SARTU · ") + S.name, fn: () => homeEnter() } : { kind: "door", label: L("ATEA JO · ") + S.name, fn: () => houseKnock(S) };
  }
  /* ate-joa: hiru kolpe, eta erantzuna (edo isiltasuna) */
  function houseKnock(S) {
    for (let i = 0; i < 3; i++) setTimeout(() => SND.tok(i === 2 ? "R" : "L", false, 0.9), i * 170);
    const f = (k) => saved.flags.includes(k),
      night = isNight(),
      home = (id) => {
        const N = NPCS.find((n) => n.id === id);
        return !N || !!N.away;
      },
      voice = (who, lines, after) => say(lines.map((t) => [who, t, "", S.x, S.z, S.y]), after),
      quiet = (t) => notify(t, "", 4.5),
      once = (k, fn) => {
        if (f("jo-" + k)) return false;
        flagSet("jo-" + k);
        fn();
        return true;
      };
    setTimeout(() => {
      switch (S.id) {
        case "pellonea":
          if (!home("pello")) return quiet(L("Inork ez du erantzuten. Pello eta Peio plazan daude, txalapartan."));
          return voice("PEIO", [L("Nor dabil gau honetan? A, sorgina zara! Badakizu zergatik deitzen den etxe hau Pellonea? Pello bost minutu lehenago jaio zelako. Bidegabekeria hutsa."), L("…Pellok dio lo egiteko. Egunez etorri, eta erritmo berri bat irakatsiko dizugu.")]);
        case "arrantzalenea":
          if (!home("txomin")) return quiet(night ? L("Inork ez du erantzuten. Txomin kaian dago, gauez ere: izotzari begira, itsasoa noiz askatuko.") : L("Inork ez du erantzuten. Txomin kaian egoten da egunez, txalupa zaharraren ondoan."));
          return voice("TXOMIN", [f("herensugea") ? L("Herensuge urre bat ikusi dut itsasoaren gainean, hegan! Lehenengo, beldurra. Gero… txalupari begira zegoen, laguntzeko moduan.") : f("odei") ? L("Gaur euria egin du itsasoan. Izotza ahultzen ari da, neska: udan, berriro arrantzara!") : L("Gauez itsasoa entzuten dut… izotza karraska. Egunen batean, berriro aterako naiz.")]);
        case "okinenea": {
          const fresh = time - HOUSE.breadT > 90;
          if (P.hp < P.maxHp && fresh) {
            HOUSE.breadT = time;
            P.hp = P.maxHp;
            SND.heal();
            fxBurst(P.x, P.y + 1.2, P.z, { n: 22, speed: 2, up: 2, life: 0.9, size: 0.26, color: "#ffd9a0", grav: -1 });
            hud();
            return home("maite") ? voice("MAITE", [L("Ordu hauetan? Tira… hartu atzoko ogia, oraindik epel dago.")]) : voice("MAITEREN SENARRA", [L("Maite plazan dabil; ni labearekin. Hartu ogi beroa, labetik atera berria: arnasa itzultzen du!")]);
          }
          return home("maite") ? voice("MAITE", [L("Goizean goiz jaiki behar dut, ogia egiteko. Gabon, sorgin.")]) : voice("MAITEREN SENARRA", [L("Ogia goizean, txalaparta gauez. Itzuli zaurituta zaudenean: ogi beroa beti dago.")]);
        }
        case "goikoetxea":
          if (f("mikel-ok") && once("goikoetxea", () => {}))
            return voice("MIKELEN AMONA", [L("Zu zara nire bilobarekin frontoian jolasten duen sorgina? Hartu hau, nire amonaren errezeta: sendabelar-botila bat.")], () => {
              saved.potions = (saved.potions || 0) + 1;
              persist();
              itemGet("botila", L("SENDABELAR-BOTILA"), L("Bizitzak amaitzean, berez erabiltzen da. Orain: ") + saved.potions + ".");
            });
          return voice("MIKELEN AMONA", [night ? (f("irati-herensuge") ? L("Ixo! Mikel lotan dago… Amets gaiztoak ditu azkenaldian. Nik kantu zahar bat kantatzen diot ohe ondoan: Ingumaren aurka, betidanik.") : L("Ixo! Mikel lotan dago. Ametsetan ere pilotan jokatzen du, ostikoka ohean.")) : f("odei") ? L("Atzo euria egin zuen, euri goxoa. Nire belaunek ere eskertu dute.") : L("Mikel? Frontoian, betiko moduan. Pilota baino ez du buruan.")]);
        case "belarrenea":
          return quiet(night ? L("Inork ez du erantzuten: Kattalin elizan dago, argizaiolak pizten. Atean, eguzkilore lehor bat iltzatuta.") : L("Inork ez du erantzuten. Atean, eguzkilore lehor bat iltzatuta: gaueko izakiak uxatzeko, amonek zioten bezala."));
        case "artzainenea":
          if (!home("joanes")) return quiet(L("Inork ez du erantzuten. Joanes larreetan dabil, ardiekin. Atean, artile-mataza bat zintzilik."));
          return voice("JOANES", [f("ardiak") ? L("Ardiak etxean, ni etxean. Lasai lo egiten dut berriro, zuri esker.") : L("Hiru ardi falta zaizkit… Ez dut begirik ixten.")]);
        case "mendieta":
          if (freedCount() < 3) return quiet(L("Etxe hutsa. Leihoak itxita, atean hautsa. Mendietakoek mendira ihes egin zuten, Gauekoren itzalak iritsi zirenean."));
          if (once("mendieta", () => {}))
            return voice("MENDIETAKO ANDREA", [L("Itzuli gara! Mendian entzun genuen: itzalak hausten ari dira, eta txalapartak berriro jotzen du."), L("Zu zara, ezta? Hartu hau: ez da asko, baina gure esker ona da.")], () => {
              saved.coins += 30;
              persist();
              itemGet("txanponak", L("30 TXANPON"), L("Mendietakoen esker ona. Etxe bat gehiago bizirik."));
            });
          return voice("MENDIETAKO ANDREA", [night ? L("Gabon, sorgin. Gaur gauean ez dugu beldurrik.") : L("Etxea txukuntzen ari gara. Hautsa, hautsa eta hautsa… baina gure etxea da.")]);
        case "olaberria":
          return quiet(L("Barruan, labearen sua. Maddi aurrean dago, dendan."));
        case "ostatua":
          if (f("odei")) {
            if (P.hp < P.maxHp) {
              P.hp = P.maxHp;
              SND.heal();
              hud();
            }
            return voice("OSTALARIA", [L("Bost zaindari aske? Sagardotegia zabalduko dugu! Txotx, sorgin: edan, eta indarberritu.")]);
          }
          return voice("OSTALARIA", [freedCount() >= 2 ? L("Itxita oraindik… baina kupelak prestatzen ari gara. Gauekoren itzalak joan bezain laster, txotx!") : L("Itxita dago, neska! Gaueko ibili bitartean, hemen ez da sagardorik zabalduko.")]);
      }
    }, 520);
  }

  /* ================================ ITURRALDE (barrua) ================================ */
  const HX = 2100;
  ZONES.etxea = { name: "ITURRALDE", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null };
  const DGE = {
    id: "etxea",
    num: "",
    home: true,
    entry: { x: HX, y: 0, z: 3.4, a: PI },
    exitArch: { x: HX, z: 5.4 },
    exitTo: () => {
      const S = HOUSE.home;
      return S ? { x: S.x + S.fx * 1.2, y: S.y, z: S.z + S.fz * 1.2, a: Math.atan2(S.fx, S.fz), cp: true } : { x: 24, y: 0, z: 31, cp: true };
    },
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ffbf75", "#ffcf96"],
    fog: [18, 46],
    keep: [],
  };
  const MEMENTOS = [
    { flag: "basajaun", name: "BASAJAUNEN KIMUA", text: "Pago-kimu bat lapiko batean. Basajaunek eman zizun: «Basoak gogoratzen du».", kind: "kimua" },
    { flag: "lamia", name: "LAMIAREN ORRAZIA", text: "Urrezko orrazia. Lamiak kantatzen zuenean, ibaia dantzan jartzen zen.", kind: "orrazia" },
    { flag: "tartalo", name: "ARDI-ZINTZARRIA", text: "Tartaloren artaldeko zintzarria. Orain ardiak lasai bazkatzen dira lepoan.", kind: "zintzarria" },
    { flag: "errolan", name: "TXIMISTA-HARRIA", text: "Errolanen ekaitz-harriaren zati bat. Eskuan, oraindik epel dago.", kind: "tximista" },
    { flag: "odei", name: "EURI-URA", text: "Odeiren lehen euri goxoa, beirazko ontzi batean. Argiak ortzadarra egiten du barruan.", kind: "euria" },
    { flag: "herensugea", name: "HERENSUGE-EZKATA", text: "Herensugearen ezkata bat, urrezkoa. Sutan jarrita ere, hotz; eskuan, bihotz baten taupadak.", kind: "ezkata" },
    { flag: "inguma", name: "AMONAREN HAUTS-ZORROA", text: "Hutsik, baina barruan izar-hauts pixka bat geratzen da: gauez, distira egiten du. Seaska-kanta, ahopean, beti.", kind: "zorroa" },
  ];
  function mementoMesh(kind) {
    const g = new T.Group();
    if (kind === "kimua") {
      const pot = new T.Mesh(new T.CylinderGeometry(0.17, 0.13, 0.24, 10), material("#9a5a34"));
      pot.position.y = 0.12;
      const tr = new T.Mesh(new T.CylinderGeometry(0.02, 0.025, 0.3, 5), material("#6a4a2a"));
      tr.position.y = 0.38;
      const lv = new T.Mesh(new T.IcosahedronGeometry(0.16, 0), material("#5fa04a", 0.1));
      lv.position.y = 0.56;
      g.add(pot, tr, lv);
    } else if (kind === "orrazia") {
      const c = new T.Mesh(new T.TorusGeometry(0.18, 0.04, 6, 14, PI), material("#ffd36a", 0.5));
      c.position.y = 0.22;
      g.add(c);
      for (let i = 0; i < 7; i++) {
        const t = new T.Mesh(new T.BoxGeometry(0.02, 0.14, 0.02), material("#ffd36a", 0.5));
        t.position.set(-0.15 + i * 0.05, 0.15, 0);
        g.add(t);
      }
    } else if (kind === "zintzarria") {
      const prof = [[0.02, 0], [0.09, -0.02], [0.11, -0.12], [0.14, -0.26], [0.16, -0.3]].map(([r, y]) => new T.Vector2(r, y));
      const b = new T.Mesh(new T.LatheGeometry(prof, 12), new T.MeshStandardMaterial({ color: "#b4823c", metalness: 0.7, roughness: 0.35, side: T.DoubleSide }));
      b.position.y = 0.32;
      g.add(b);
    } else if (kind === "tximista") {
      const st = new T.Mesh(new T.DodecahedronGeometry(0.14, 0), new T.MeshStandardMaterial({ color: "#3b4250", roughness: 0.5, emissive: new T.Color("#7fc8ff"), emissiveIntensity: 1.2, flatShading: true }));
      st.position.y = 0.15;
      g.add(st);
    } else if (kind === "ezkata") {
      /* herensuge-ezkata: tanta itxurako plaka urrea */
      const sc = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), new T.MeshStandardMaterial({ color: "#d9a441", metalness: 0.8, roughness: 0.25, emissive: new T.Color("#7a4a10"), emissiveIntensity: 0.5 }));
      sc.scale.set(1, 1.35, 0.3);
      sc.position.y = 0.2;
      g.add(sc);
    } else if (kind === "zorroa") {
      /* hauts-zorroa: larruzko poltsa txikia, lokarria eta izar-distira */
      const bag = new T.Mesh(new T.SphereGeometry(0.13, 12, 10), material("#7a5a3a"));
      bag.scale.set(1, 1.15, 1);
      bag.position.y = 0.14;
      const neck = new T.Mesh(new T.CylinderGeometry(0.04, 0.07, 0.08, 10), material("#6a4a2a"));
      neck.position.y = 0.3;
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#d9c8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
      glow.position.y = 0.36;
      glow.scale.setScalar(0.4);
      g.add(bag, neck, glow);
    } else if (kind === "euria") {
      const jar = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.3, 12), new T.MeshStandardMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.45, roughness: 0.1, emissive: new T.Color("#5fb8e8"), emissiveIntensity: 0.4 }));
      jar.position.y = 0.15;
      const cork = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.06, 8), material("#8a6a48"));
      cork.position.y = 0.33;
      g.add(jar, cork);
    } else {
      const q = new T.Mesh(new T.TorusGeometry(0.11, 0.015, 5, 16), new T.MeshBasicMaterial({ color: "#8a7a66", transparent: true, opacity: 0.5 }));
      q.position.y = 0.16;
      g.add(q);
    }
    return g;
  }
  /* zura (ohol-testura) eta igeltsu zuria */
  function homeWood(w, d) {
    return EG && EG.has("planks") ? EG.material("planks", { color: "#b08a62", repeat: [w / 2, d / 2], roughness: 0.85 }) : material("#8a6a48");
  }
  function buildEtxea() {
    dungeonBegin(DGE);
    const E = (x) => HX + x,
      W = 14,
      D = 10,
      plaster = new T.MeshStandardMaterial({ color: "#efe8da", roughness: 0.95 }),
      beam = material("#5a3c26"),
      stone = stackMaterial();
    /* zorua (oholak) */
    const fl = slab({ x: E(0), z: 0, y: 0, w: W, d: D, h: 1.2, area: "etxeA" });
    fl.m.material = homeWood(W, D);
    fl.m.position.y -= 0.02;
    /* hormak: iparra eta mendebaldea garaiak (leihoa, apalak); hegoa eta ekialdea baxuak (kamera) */
    const wall = (x, z, w, d, h, mat = plaster) => {
      const m = obj(new T.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z);
      wallBlock(x, z, w, d, 0, 0, 7);
      return m;
    };
    wall(E(0), -D / 2 - 0.25, W + 1, 0.5, 4.2);
    wall(E(-W / 2 - 0.25), 0, 0.5, D + 1, 4.2);
    wall(E(W / 2 + 0.25), 0, 0.5, D + 1, 0.9);
    wall(E(-4.52), D / 2 + 0.25, 6.45, 0.5, 0.9);
    wall(E(4.52), D / 2 + 0.25, 6.45, 0.5, 0.9);
    /* zutabeak eta horma-habeak (sabairik gabe: kamera goitik) */
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
      const p = obj(new T.BoxGeometry(0.42, 4.4, 0.42), beam);
      p.position.set(E(x), 2.2, z);
    }
    for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
      const b = obj(new T.BoxGeometry(0.3, 0.3, D), beam);
      b.position.set(E(x), 4.05, 0);
    }
    /* atea (hegoan) eta atari laburra: irteera */
    for (const s of [-1, 1]) {
      const jamb = obj(new T.BoxGeometry(0.35, 2.9, 0.6), beam);
      jamb.position.set(E(s * 1.45), 1.45, D / 2 + 0.25);
    }
    const lintel = obj(new T.BoxGeometry(3.3, 0.35, 0.6), beam);
    lintel.position.set(E(0), 2.95, D / 2 + 0.25);
    /* atari laburra (ikusezina: atearen argitik kanpora) */
    slab({ x: E(0), z: D / 2 + 3, y: 0, w: 2.6, d: 5.4, h: 1.2, mat: "dark" }).m.visible = false;
    wallBlock(E(-1.5), D / 2 + 3, 0.4, 5.4, 0, 0, 7);
    wallBlock(E(1.5), D / 2 + 3, 0.4, 5.4, 0, 0, 7);
    const glowDoor = obj(new T.PlaneGeometry(2.6, 2.9), new T.MeshBasicMaterial({ color: "#fff1d0", transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending }));
    glowDoor.position.set(E(0), 1.45, D / 2 + 0.6);
    glowDoor.castShadow = false;
    DGE.exitGlow = glowDoor;
    /* leihoa (iparrean): egunez argi epela, gauez ilargi urdina */
    const win = obj(new T.PlaneGeometry(1.7, 1.3), new T.MeshBasicMaterial({ color: "#ffe8b8" }));
    win.position.set(E(-1.2), 2.4, -D / 2 + 0.02);
    for (const [x, y, w, h] of [[-1.2, 2.4, 0.12, 1.4], [-1.2, 2.4, 1.8, 0.12], [-2.1, 2.4, 0.14, 1.45], [-0.3, 2.4, 0.14, 1.45], [-1.2, 3.1, 1.95, 0.14], [-1.2, 1.7, 1.95, 0.14]]) {
      const f = obj(new T.BoxGeometry(w, h, 0.08), beam);
      f.position.set(E(x), y, -D / 2 + 0.05);
    }
    DGE.window = win;
    const shaft = new T.Mesh(new T.PlaneGeometry(1.8, 5.5), new T.MeshBasicMaterial({ color: "#ffe2a8", transparent: true, opacity: 0.08, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    shaft.position.set(E(-1.2), 1.4, -D / 2 + 2.4);
    shaft.rotation.set(-1.0, 0, 0);
    BP.add(shaft);
    DGE.shaft = shaft;
    /* sutondoa (iparraldean, harrizko tximiniarekin) */
    DGE.hearth = sutondoa("etxe-su", E(-4.6), 0, -3.4, 1.4, 1.9);
    const hood = obj(new T.BoxGeometry(3.2, 1.4, 1.2), stone);
    hood.position.set(E(-4.6), 3.3, -D / 2 + 0.6);
    const flue = obj(new T.BoxGeometry(1.4, 1.6, 0.9), stone);
    flue.position.set(E(-4.6), 4.6, -D / 2 + 0.45);
    /* ohea (mendebaldean): egurrezko markoa, izara zuria, manta gorria */
    const bed = new T.Group();
    const frame = new T.Mesh(new T.BoxGeometry(2.0, 0.55, 3.2), material("#6e4a2c"));
    frame.position.y = 0.28;
    const sheet = new T.Mesh(new T.BoxGeometry(1.86, 0.2, 3.0), material("#f2efe6"));
    sheet.position.y = 0.62;
    const blanket = new T.Mesh(new T.BoxGeometry(1.92, 0.12, 1.9), material("#a8332a"));
    blanket.position.set(0, 0.74, 0.5);
    const pillow = new T.Mesh(new T.BoxGeometry(1.3, 0.2, 0.55), material("#fbf8f0"));
    pillow.position.set(0, 0.8, -1.1);
    const head = new T.Mesh(new T.BoxGeometry(2.0, 1.3, 0.16), material("#6e4a2c"));
    head.position.set(0, 0.65, -1.6);
    bed.add(frame, sheet, blanket, pillow, head);
    bed.traverse((n) => n.isMesh && ((n.castShadow = true), (n.receiveShadow = true)));
    bed.position.set(E(-5.6), 0, 2.0);
    BP.add(bed);
    solids.push({ x: E(-5.6), z: 2.0, r: 1.25, h: 1, y: 0, pillar: true }, { x: E(-5.6), z: 3.0, r: 1.0, h: 1, y: 0, pillar: true }, { x: E(-5.6), z: 1.0, r: 1.0, h: 1, y: 0, pillar: true });
    DGE.bed = { x: E(-5.6), z: 2.0 };
    /* mahaia, aulkiak, ogia eta kandela */
    const table = new T.Group(),
      top = new T.Mesh(new T.BoxGeometry(2.4, 0.12, 1.4), material("#7a5434"));
    top.position.y = 0.95;
    table.add(top);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.12, 0.92, 0.12), material("#5a3c26"));
      leg.position.set(sx * 1.05, 0.46, sz * 0.55);
      table.add(leg);
    }
    const bread = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), material("#c9893e"));
    bread.scale.set(1.4, 0.7, 1);
    bread.position.set(-0.5, 1.12, 0.1);
    const candleM = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.26, 8), material("#f4ead2"));
    candleM.position.set(0.6, 1.14, -0.2);
    table.add(bread, candleM);
    for (const sx of [-1, 1]) {
      const chair = new T.Mesh(new T.BoxGeometry(0.55, 0.5, 0.55), material("#6e4a2c"));
      chair.position.set(sx * 1.6, 0.5, 0.1);
      const back = new T.Mesh(new T.BoxGeometry(0.1, 0.8, 0.55), material("#6e4a2c"));
      back.position.set(sx * 1.88, 1.1, 0.1);
      table.add(chair, back);
    }
    table.traverse((n) => n.isMesh && ((n.castShadow = true), (n.receiveShadow = true)));
    table.position.set(E(0.6), 0, 0.6);
    BP.add(table);
    solids.push({ x: E(0.6), z: 0.6, r: 1.25, h: 1.1, y: 0, pillar: true });
    candle(E(0.6) + 0.6, 1.32, 0.4);
    DGE.letter = new T.Mesh(new T.PlaneGeometry(0.42, 0.3), new T.MeshStandardMaterial({ color: "#f3e7c8", emissive: new T.Color("#ffe2a6"), emissiveIntensity: 0.25 }));
    DGE.letter.rotation.x = -PI / 2;
    DGE.letter.position.set(E(0.6) + 0.15, 1.02, 0.85);
    BP.add(DGE.letter);
    DGE.table = { x: E(0.6), z: 0.6 };
    /* lauburu-alfonbra */
    const rc = document.createElement("canvas");
    rc.width = rc.height = 256;
    const rg = rc.getContext("2d");
    rg.fillStyle = "#8f2f27";
    rg.fillRect(0, 0, 256, 256);
    rg.strokeStyle = "#e8cf98";
    rg.lineWidth = 10;
    rg.strokeRect(14, 14, 228, 228);
    rg.lineWidth = 12;
    for (let i = 0; i < 4; i++) {
      const a = (i * PI) / 2;
      rg.beginPath();
      rg.arc(128 + Math.cos(a) * 34, 128 + Math.sin(a) * 34, 34, a, a + PI);
      rg.stroke();
    }
    const rug = obj(new T.PlaneGeometry(3.4, 3.4), new T.MeshStandardMaterial({ map: new T.CanvasTexture(rc), roughness: 1 }));
    rug.rotation.x = -PI / 2;
    rug.position.set(E(3.6), 0.012, 2.3);
    rug.castShadow = false;
    /* oroitzapenen apala (iparrean, eskuinean): zazpi toki */
    const shelf = obj(new T.BoxGeometry(4.6, 0.14, 0.7), material("#6e4a2c"));
    shelf.position.set(E(3.4), 1.55, -D / 2 + 0.4);
    const shelf2 = obj(new T.BoxGeometry(4.6, 0.14, 0.7), material("#6e4a2c"));
    shelf2.position.set(E(3.4), 2.6, -D / 2 + 0.4);
    DGE.mementos = MEMENTOS.map((M, i) => {
      const g = mementoMesh(M.kind),
        row = i < 4 ? 0 : 1,
        col = row ? i - 4 : i;
      g.position.set(E(3.4) - 1.7 + col * (row ? 1.15 : 1.13), row ? 2.67 : 1.62, -D / 2 + 0.42);
      BP.add(g);
      return { ...M, g };
    });
    DGE.shelf = { x: E(3.4), z: -D / 2 + 1.6 };
    /* Iratiren txokoa (ekialdean): txalaparta txikia, marrazkia eta kandela */
    const tx = txalapartaMesh(E(5.4), 0, -1.4, -PI / 2, "etxeA");
    tx.g.scale.setScalar(0.55);
    const dc = document.createElement("canvas");
    dc.width = 256;
    dc.height = 192;
    const dg = dc.getContext("2d");
    dg.fillStyle = "#f3ead6";
    dg.fillRect(0, 0, 256, 192);
    dg.strokeStyle = "#5b4a3a";
    dg.lineWidth = 4;
    dg.beginPath();
    dg.moveTo(20, 170);
    dg.lineTo(110, 60);
    dg.lineTo(150, 110);
    dg.lineTo(190, 70);
    dg.lineTo(240, 170);
    dg.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU - PI / 2;
      dg.fillStyle = i < 3 ? "#3dbf6a" : "#d0402a";
      dg.beginPath();
      dg.arc(128 + Math.cos(a) * 34, 46 + Math.sin(a) * 26, 7, 0, TAU);
      dg.fill();
    }
    for (const [x, c] of [[104, "#c0392b"], [128, "#2c6aa0"]]) {
      dg.fillStyle = c;
      dg.fillRect(x, 148, 14, 22);
      dg.beginPath();
      dg.arc(x + 7, 140, 8, 0, TAU);
      dg.fill();
    }
    dg.strokeStyle = "#5b4a3a";
    dg.lineWidth = 3;
    dg.beginPath();
    dg.moveTo(118, 156);
    dg.lineTo(128, 156);
    dg.stroke();
    const drawing = obj(new T.PlaneGeometry(1.1, 0.82), new T.MeshStandardMaterial({ map: new T.CanvasTexture(dc), roughness: 1 }));
    drawing.position.set(E(6.95) - 0.02, 1.25, -2.6);
    drawing.rotation.y = -PI / 2;
    const wallE = obj(new T.BoxGeometry(0.2, 1.4, 1.6), plaster);
    wallE.position.set(E(7.0), 1.25 + 0.0, -2.6);
    DGE.irati = { x: E(5.0), z: -1.8 };
    /* argiak: mendebaldeko zuzia eta Iratiren txokoko kandela */
    torch(E(-6.6), 2.6, -1.2, PI / 2, null);
    const c2 = obj(new T.CylinderGeometry(0.05, 0.05, 0.24, 8), material("#f4ead2"));
    c2.position.set(E(6.3), 0.95, -3.6);
    candle(E(6.3), 1.12, -3.6);
    /* hitzaurrea: oihartzun-harria, ganbara eta Iratiren kutxa, izoztutako atea */
    proBuildHouse(E, D);
    skyRoom("ETXEA", E(0), 0, W, D, { area: "etxeA", name: "ITURRALDE", desc: "Etxea. Sutondoa, ohea, Iratiren txokoa." });
    dungeonEnd(DGE);
  }
  /* kandela: distira txikia eta zuzi-argia (gertuko bik argi errealak dituzte) */
  function candle(x, y, z) {
    const fl = glow(x, y, z, "#ffcf8a", 1.3);
    BDG.torches.push({ x, y, z, fl, ph: x * 3.1 + z, side: null });
    return fl;
  }
  /* barruko ekintzak (actionHere-tik) */
  function homeActionNear() {
    if (ZONE.cur !== "etxea") return null;
    const near = (o, r) => o && Math.hypot(P.x - o.x, P.z - o.z) < r;
    if (near(DGE.bed, 2.4)) return { kind: "hearth", label: L("OHEA · LO EGIN"), fn: homeSleep };
    if (near(DGE.shelf, 2.2)) return { kind: "talk", label: L("OROITZAPENAK"), fn: homeMementos };
    if (near(DGE.irati, 2.0)) return { kind: "talk", label: L("IRATIREN TXOKOA"), fn: homeIrati };
    if (near(DGE.table, 2.3) && saved.flags.includes("andere")) return { kind: "talk", label: L("ANDEREREN GUTUNA"), fn: homeLetter };
    return null;
  }
  function homeEnter() {
    SND.tok("L", false, 0.6);
    enterZone("etxea", { ...DGE.entry, cp: true });
  }
  function homeSleep() {
    const rest = () => {
      P.hp = P.maxHp;
      TXB.n = TXB.max;
      SND.heal();
      hud();
    };
    if (!saved.flags.includes("cliff")) {
      rest();
      notify(L("Atseden pixka bat ohean: arnasa beteta. (Basajaun askatu arte, ez dago gaurik herrian.)"), "", 4);
      return;
    }
    const sleepTo = (tod, msg) => {
      shiftFlash = 1;
      saved.tod = tod;
      DAY.k = nightOf(tod);
      DAY.night = DAY.k > 0.5;
      rest();
      persist();
      /* Herensugearen ondoren: lehen ametsa (Inguma) */
      if (saved.flags.includes("irati-herensuge") && !saved.flags.includes("inguma-ametsa")) {
        flagSet("inguma-ametsa");
        return say(
          [
            ["· · ·", "Amets bat. Iturralde, baina hutsik. Sutondoa itzalita. Txalapartak, urrunean, erritmo okerra jotzen du: atzekoz aurrera.", "", P.x, P.z, P.y],
            ["IRATI?", "Amaiur… Amaiur, esnatu. Ni naiz… Irati.", "", P.x, P.z, P.y + 2, null, "c7_p1"],
            ["AMAIUR", "Irati? Ez… Zu ez zara Irati.", "", P.x, P.z, P.y, null, "c7_p2"],
            ["INGUMA", "Ametsetan ere ibiltzen naiz, sorgin. Zure ahizparen ahotsa ere badakit egiten.", "", P.x, P.z, P.y + 2, null, "c7_p3"],
            ["INGUMA", "Inguma naiz. Gaur ez zaitut eramango. Laster… bai. Lo ona, sorgin txikia.", "", P.x, P.z, P.y + 2, null, "c7_p4"],
          ],
          () => {
            title(msg, "");
            notify(L("Esnatu zara, izerditan. Ohe ondoan, kantu zahar bat entzun duzu… norbaitek kantatzen zuen?"), "", 6);
          },
        );
      }
      title(msg, "");
      notify(L("Ondo lo egin duzu. Arnasa beteta."), "", 3);
    };
    /* SEASKA-KANTA eta hauts-zorroa eskuan: Ingumaren ametsera (seaska.js) */
    const dream = seaskaReady();
    dialog(L("OHEA"), dream ? L("Ingumaren ametsa") : L("Lo egin?"), "", dream ? L("Hauts-zorroa eskuan, seaska-kanta ahopean. Lo egin, eta Ingumaren ametsera jaitsi?") : L("Amaren mantaren usaina. Kanpoan, txalapartak urrunean."), "", [
      ...(dream ? [[L("AMETSERA"), () => setTimeout(ametsaEnter, 0)]] : []),
      [L("EGUNSENTIRA ARTE"), () => sleepTo(0.28, L("EGUN ON!"))],
      [L("ILUNABARRERA ARTE"), () => sleepTo(0.73, L("ARRATSALDE ON!"))],
      [L("EZ ORAIN"), () => {}],
    ]);
  }
  function homeMementos() {
    const got = MEMENTOS.filter((M) => saved.flags.includes(M.flag));
    dialog(
      L("ITURRALDE"),
      L("OROITZAPENAK · ") + got.length + " / 7",
      "",
      MEMENTOS.map((M) => (saved.flags.includes(M.flag) ? "◆ " + M.name + " — " + M.text : "◇ " + M.text)).join("\n\n"),
      "",
    );
  }
  function homeIrati() {
    const f = (k) => saved.flags.includes(k);
    const t = f("inguma")
      ? L("Iratiren marrazkia: zazpi argi berde mendi baten gainean. Behean, bi ahizpa eskutik… eta haien itzala, bakarra, ilargi azpian. Lehen ez zegoen hor.")
      : f("herensugea")
      ? L("Iratiren marrazkia, berriro: sei argi berde eta zazpigarrena, gorria. Behean, bi ahizpa… eta herensuge urre txiki bat, hegan, haien gainean.")
      : f("odei")
      ? L("Marrazkiaren ondoan, Iratiren idazkera: «Zazpi argi, eta behean bi ahizpa». Bost argi berde dira orain. Hutsuneetan, euri-tanta txiki batzuk: Iratik margotu zituen?")
      : f("errolan")
        ? L("Iratiren marrazkia: zazpi argi mendi baten gainean. Behean, bi neska txiki eskutik helduta. Lau argi berdez margotu dituzu, konturatu gabe.")
        : f("basajaun")
          ? L("Txalaparta txikiaren makilak, Iratiren eskuen neurrikoak. Haurretan: «Bi ahots ditu, Amaiur: batak galdetzen du, besteak erantzuten».")
          : L("Iratiren txalaparta txikia eta marrazki bat: zazpi argi mendi baten gainean. Iratik beti esaten zuen: «Txalapartak ez du inoiz bakarrik jotzen».");
    say([["· · ·", t, "", P.x, P.z, P.y]]);
  }
  function homeLetter() {
    dialog(L("ANDERE"), L("Andereren gutuna"), "", L("«Amaiur: gutun hau irakurtzen baduzu, ituna hautsi da eta ni zeruan nabil, Mariren suarekin. Gaueko ez dago erlojuan. Zazpigarren leizean itxaroten du, Anboton. Zazpi zaindariek ireki behar dute bidea. Ez beldurtu: txalapartak ez du inoiz bakarrik jotzen.»"), "");
  }
  /* barruko eguneraketa: leihoa (eguna/gaua), oroitzapenak (agerian ala ez) */
  DGE.update = (dt) => {
    hearthsUpdate(dt);
    const night = DAY.k > 0.5;
    if (DGE.window) DGE.window.material.color.set(night ? "#3a5a9a" : "#ffe8b8");
    if (DGE.shaft) DGE.shaft.material.opacity = night ? 0.03 : 0.08;
    if (DGE.letter) DGE.letter.visible = saved.flags.includes("andere");
    for (const M of DGE.mementos || []) {
      const on = saved.flags.includes(M.flag);
      M.g.visible = on || M.kind === "?";
      if (on) M.g.rotation.y += dt * 0.25;
    }
    if (!saved.flags.includes("etxea") && !PRO.on) {
      flagSet("etxea");
      notify(L("Etxean. Sutondoan atseden; ohean, eguna edo gaua; apalean, zaindarien oroitzapenak."), "", 6);
    }
  };
  DGE.objective = () => {
    const f = (k) => saved.flags.includes(k);
    /* zazpigarren atala: ohea (lehen amets gaiztoa, gero AMETSERA) eta, esnatu ondoren, kanpora */
    if (DGE.bed && f("irati-herensuge") && !f("inguma-ametsa")) return ["Ohean lo egin, sutondoa piztuta.", [DGE.bed.x, DGE.bed.z, 0]];
    if (DGE.bed && seaskaReady()) return ["Ohean: AMETSERA (Ingumaren ametsa).", [DGE.bed.x, DGE.bed.z, 0]];
    if (f("inguma") && !f("irati-inguma")) return ["Irten kanpora (hegoko atea): Anboto aldera begiratu.", [DGE.exitArch.x, DGE.exitArch.z, 0]];
    return ["Etxean: sutondoa (atseden), ohea (eguna edo gaua), oroitzapenak. Irten atetik (hegoan).", [DGE.exitArch.x, DGE.exitArch.z, 0]];
  };
