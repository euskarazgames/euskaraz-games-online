  /* ==================================================================
     EGINKIZUNAK ETA MISTERIOAK
     · Egunkaria (L tekla, ⋯ menua edo pausa): istorioa eta bigarren mailako eginkizunak.
     · Ikurrak herritarren buru gainean: ! (zerbait berria) eta ? (emateko prest).
     · OIHARTZUN-HARRIAK (7): ENTZUN haien ondoan → iraganeko ahots bat (Andereren istorioa).
       Zazpiak entzunda, Andereren etxeko zigilua desagertzen da.
     · Kattalinen sorgin-belarrak (3, IRAGANEAN bakarrik), Txominen sarea (badia izoztua,
       ORAINEAN), Mikelen erronka (frontoiko jomugak), Maddiren burdin-harriak (5).
     ================================================================== */
  const ECHO_DEFS = [
    { id: "eliza", x: -27, z: 15.5, y: null, lines: ["Ehun urte isilik… eta orain txalapartak berriro. Norbaitek entzuten badu: ni Andere naiz, Ibarrako sorgina."] },
    { id: "harrespila", x: 51, z: -59, y: 9, lines: ["Jentilek erakutsi zidaten: erritmo bakoitzak ate bat irekitzen du. Baita ixten ere. Ez ahaztu inoiz ixten dena."] },
    { id: "ibaia", x: -50, z: -28.5, y: -0.4, lines: ["Gaueko erlojuan giltzapetu nuen. Marirekin itun bat egin nuen: haranaren ahotsa, haren ordainetan. Txalapartak isildu ziren."] },
    { id: "urjauzia", x: 92.5, z: -31.6, y: -0.9, lines: ["Lamiei eman nien nire urrezko orrazia gordetzeko. Haiek bakarrik dakite zer ixten duen."] },
    { id: "basoa", x: -32, z: -122, y: 5, past: true, lines: ["Erlojua hautsi denean, ituna ere hautsi da. Mariren sua libre dabil zeruan… eta nik daramat."] },
    { id: "lepoa", x: -81, z: -121, y: 12, lines: ["Tartalok begi bakarra du, baina ilunpean dena ikusten du. Argiak itsutzen du. Gogoratu: argia."] },
    { id: "frontoia", x: -32, z: 34, y: 9.6, lines: ["Amaiur. Zu zara nire biloba. Zazpi harriak entzun badituzu, zatoz nire etxera. Atea zabalik egongo da."] },
  ];
  const ECHOES = [];
  const HERB_DEFS = [
    { id: "basoa", x: -20, z: -100, y: 5 },
    { id: "ibarbide", x: 31, z: -46, y: null },
    { id: "harrespila", x: 40.5, z: -58.5, y: 9 },
  ];
  const HERBS = [];
  const ORE_DEFS = [
    { id: "arroila", zone: "ibarra", x: 62, z: -27.5, y: -1.2, phase: 1 },
    { id: "lepoa", zone: "ibarra", x: -84.5, z: -114, y: 12 },
    { id: "leizea", zone: "leizea", x: 552, z: -69, y: 0 },
    { id: "lamia", zone: "lamia", room: "L2" },
    { id: "tartalo", zone: "tartalo", room: "T2" },
  ];
  const QST = { mikel: null, netMesh: null, marks: [] };
  /* ! eta ? ikurrak (kanbas) */
  function markTex(ch, col) {
    return canvasTex(64, 64, (g) => {
      g.font = "900 46px Georgia,serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = 8;
      g.strokeStyle = "#1c2a36";
      g.strokeText(ch, 32, 34);
      g.fillStyle = col;
      g.fillText(ch, 32, 34);
    });
  }
  function questsInit() {
    zoneBuild("ibarra");
    /* oihartzun-harriak */
    for (const D of ECHO_DEFS) {
      const y = D.y ?? gy(D.x, D.z),
        g = new T.Group();
      g.position.set(D.x, y, D.z);
      BP.add(g);
      const st = new T.Mesh(new T.CylinderGeometry(0.32, 0.45, 1.5, 6), material("#3e4a52"));
      st.position.y = 0.75;
      st.castShadow = true;
      g.add(st);
      const rune = new T.Mesh(new T.PlaneGeometry(0.6, 0.6), new T.MeshBasicMaterial({ color: "#9fd8ff", map: runeTexture(), transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }));
      rune.position.set(0, 0.95, 0.4);
      g.add(rune);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#9fd8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.4 }));
      halo.position.y = 1.2;
      halo.scale.setScalar(2.4);
      g.add(halo);
      ECHOES.push({ ...D, y, g, rune, halo, heard: saved.echoes.includes(D.id) });
    }
    /* frontoiaren gaina: plataforma eta ENTZUN-ek agertzen dituen harri-mailak */
    platforms.push({ x: -32, z: 37, y: 9.6, bottom: 9, w: 1.8, d: 15.6, rot: 0, phase: -1, safe: true, area: "herria" });
    for (const [hx, hz, hy] of [[-26.5, 31.5, 2.1], [-28.2, 33.6, 4.2], [-29.9, 35.8, 6.3], [-30.3, 33.2, 8.3]]) hiddenSlab(hx, hz, hy, 2, 2);
    /* sorgin-belarrak: lore urdin distiratsuak (iraganean bakarrik) */
    for (const D of HERB_DEFS) {
      const y = D.y ?? gy(D.x, D.z),
        g = new T.Group();
      g.position.set(D.x, y, D.z);
      BP.add(g);
      const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.6, 4), material("#4f7a3a"));
      stem.position.y = 0.3;
      g.add(stem);
      for (let i = 0; i < 5; i++) {
        const pet = new T.Mesh(new T.SphereGeometry(0.12, 6, 4), material("#7fb8ff", 0.8));
        pet.scale.set(1, 0.4, 1.8);
        pet.position.set(Math.cos((i * TAU) / 5) * 0.14, 0.62, Math.sin((i * TAU) / 5) * 0.14);
        pet.rotation.y = (-i * TAU) / 5;
        g.add(pet);
      }
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#9fd0ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
      halo.position.y = 0.65;
      halo.scale.setScalar(1.6);
      g.add(halo);
      HERBS.push({ ...D, y, g, got: saved.herbs.includes(D.id) });
    }
    for (const D of ORE_DEFS) if (D.zone === "ibarra") oreNode(D, D.x, D.y, D.z);
    /* Txominen sarea badiako uhartetxoan */
    const net = new T.Group();
    for (let i = 0; i < 5; i++) {
      const r = new T.Mesh(new T.TorusGeometry(0.5 - i * 0.07, 0.03, 4, 18), material("#c9b48a"));
      r.rotation.x = PI / 2;
      r.position.y = 0.05 + i * 0.05;
      net.add(r);
    }
    const flt = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), material("#e8592c", 0.3));
    flt.position.set(0.4, 0.2, 0);
    net.add(flt);
    net.position.set(26.5, -7.3, 101.5);
    BP.add(net);
    QST.netMesh = net;
    /* Mikelen jomugak frontoian (SORGINKERIArekin jo) */
    QST.targets = [];
    for (let i = 0; i < 3; i++) {
      const tg = new T.Group(),
        disc = new T.Mesh(new T.CircleGeometry(0.62, 24), material("#f4e9d2", 0.2)),
        mid = new T.Mesh(new T.RingGeometry(0.22, 0.44, 24), material("#c0392b", 0.4)),
        eye = new T.Mesh(new T.CircleGeometry(0.15, 16), material("#c0392b", 0.4));
      mid.position.z = eye.position.z = 0.01;
      tg.add(disc, mid, eye);
      tg.rotation.y = PI / 2;
      tg.visible = false;
      BP.add(tg);
      const R = { rune: true, x: 0, y: 0, z: 0, r: 0.75, lit: true, g: tg, live: () => QST.mikel && !R.lit, hit: () => mikelHit(R) };
      RUNES.push(R);
      QST.targets.push(R);
    }
    /* ikurrak herritarren gainean */
    QST.texNew = markTex("!", "#ffd166");
    QST.texDone = markTex("?", "#9dffc4");
    for (const N of NPCS) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: QST.texNew, transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.9);
      sp.visible = false;
      BP.add(sp);
      QST.marks.push({ N, sp });
    }
    BP = null;
  }
  /* burdin-harria: harri iluna laranja-zainekin (sorginkeriaz edo birakaz hautsi) */
  function oreNode(D, x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    (BP || scene).add(g);
    const rock = new T.Mesh(new T.DodecahedronGeometry(0.75, 0), material("#3b3632"));
    rock.position.y = 0.55;
    rock.scale.set(1.2, 0.9, 1);
    rock.castShadow = true;
    g.add(rock);
    for (let i = 0; i < 6; i++) {
      const v = new T.Mesh(new T.OctahedronGeometry(0.11, 0), material("#ff8a3a", 1.4));
      v.position.set(Math.cos(i * 1.9) * 0.62, 0.45 + (i % 3) * 0.18, Math.sin(i * 1.9) * 0.55);
      g.add(v);
    }
    const B = { kind: "ore", x, y, z, m: g, hp: 1, broken: saved.ores.includes(D.id), zone: D.zone, r: 0.9, h: 1.2, buildZone: BP || scene, phase: D.phase, onBreak: () => oreGet(D, B) };
    g.visible = !B.broken;
    solids.push((B.solid = { x, z, r: B.broken ? 0 : 0.8, h: 1.2, y }));
    BREAKABLES.push(B);
    return B;
  }
  function oreGet(D, B) {
    if (!saved.ores.includes(D.id)) saved.ores.push(D.id);
    persist();
    fxBurst(B.x, B.y + 0.8, B.z, { n: 26, speed: 4, up: 3, life: 0.8, size: 0.3, color: "#ff9a4a", grav: 8 });
    SND.coin(true);
    notify(L("BURDIN-HARRIA ") + saved.ores.length + " / 5" + (saved.flags.includes("maddi-burdina") ? L(" · Maddik zain") : ""), "", 3);
    hud();
  }
  /* ---------------------------- ENTZUN harrien ondoan ---------------------------- */
  function echoNear() {
    if (ZONE.cur !== "ibarra") return null;
    return ECHOES.find((E) => !E.heard && Math.hypot(P.x - E.x, P.z - E.z) < 2.6 && Math.abs(P.y - E.y) < 2 && (!E.past || phase === 0)) || null;
  }
  function echoListen(E) {
    if (!saved.rhythms.includes("entzun")) return notify(L("Harri honek ahots bat gordetzen du… ENTZUN erritmoa beharko zenuke."), "", 3.5);
    E.heard = true;
    if (!saved.echoes.includes(E.id)) saved.echoes.push(E.id);
    persist();
    SND.echoWave();
    fxRing(E.x, E.y + 0.2, E.z, "#9fd8ff", 6, 1);
    const n = saved.echoes.length;
    say(
      [
        ["OIHARTZUN-HARRIA", "…tok… tok-tok… (iraganeko ahots bat harritik)", "", E.x, E.z, E.y],
        ...E.lines.map((t) => ["ANDERE", t, "", E.x, E.z, E.y]),
      ],
      () => {
        notify(L("Oihartzun-harriak: ") + n + " / 7", "", 3);
        if (n >= 7) {
          flagSet("andere-giltza");
          title("ZAZPI OIHARTZUN", "");
          notify(L("Andereren etxeko zigilua ahuldu da (herriaren mendebaldean)."), "", 5);
        }
        hud();
      },
    );
  }
  /* Andereren etxea: zazpi oihartzunekin zigilua desagertzen da */
  function andereDoorNear() {
    return ZONE.cur === "ibarra" && !saved.flags.includes("andere") && Math.hypot(P.x - -36.8, P.z - 49.4) < 3;
  }
  function andereDoor() {
    if (!saved.flags.includes("andere-giltza"))
      return notify(L("Atean jentil-zigilu bat. Ahots asko entzun beharko dituzu zabaltzeko (") + saved.echoes.length + " / 7).", "", 3.5);
    flagSet("andere");
    say(
      [
        ["· · ·", "Zigilua urtu egiten da, izotza eguzkitan bezala. Barruan, mahai baten gainean, gutun bat eta argi epel bat.", "", -40, 48, 0],
        ["ANDERE", "Amaiur: gutun hau irakurtzen baduzu, ituna hautsi da eta ni zeruan nabil, Mariren suarekin.", "", -40, 48, 0],
        ["ANDERE", "Gaueko ez dago erlojuan. Zazpigarren leizean itxaroten du, Anboton. Zazpi zaindariek ireki behar dute bidea.", "", -40, 48, 0],
        ["AMAIUR", "Amona… ez zinen hil. Zuk daramazu suzko bola.", "", P.x, P.z, P.y],
      ],
      () => {
        saved.hearts += 1;
        updateMaxHp();
        P.hp = P.maxHp;
        persist();
        itemGet("bihotza", L("ANDERERENA ARNASA"), L("Arnasa bat gehiago. Andereren gutuna egunkarian gorde duzu."));
      },
    );
  }
  /* --------------------------- eginkizunen eguneraketa --------------------------- */
  function questsUpdate(dt) {
    for (const E of ECHOES) {
      const vis = !E.past || phaseBlend < 0.5;
      E.g.visible = vis;
      E.rune.material.opacity = E.heard ? 0.12 : 0.45 + 0.3 * Math.sin(time * 2.6 + E.x);
      E.halo.material.opacity = E.heard ? 0.05 : 0.28 + 0.14 * Math.sin(time * 2 + E.z);
    }
    /* belarrak: iraganean bakarrik ikusten dira; hurbiltzean bildu */
    for (const H of HERBS) {
      H.g.visible = !H.got && phaseBlend < 0.5;
      H.g.rotation.y += dt * 0.6;
      if (!H.got && phase === 0 && Math.hypot(P.x - H.x, P.z - H.z) < 1.4 && Math.abs(P.y - H.y) < 2) {
        H.got = true;
        if (!saved.herbs.includes(H.id)) saved.herbs.push(H.id);
        persist();
        SND.heal();
        fxBurst(H.x, H.y + 0.6, H.z, { n: 24, speed: 2.5, up: 2, life: 0.8, size: 0.25, color: "#9fd0ff", grav: -0.5 });
        notify(L("SORGIN-BELARRA ") + saved.herbs.length + " / 3" + (saved.flags.includes("kattalin-belar") ? "" : L(" · Kattalinek jakingo du zertarako den")), "", 3);
      }
    }
    /* sarea: badiako uhartetxoan (orainean iristen da) */
    if (QST.netMesh) {
      QST.netMesh.visible = !saved.flags.includes("sarea");
      if (QST.netMesh.visible && Math.hypot(P.x - 26.5, P.z - 101.5) < 2 && P.y > -8) {
        flagSet("sarea");
        SND.grab();
        notify(L("TXOMINEN SAREA eskuratuta. Eraman kaira."), "", 3);
      }
    }
    for (const B of BREAKABLES) if (B.kind === "ore" && B.phase !== undefined) B.m.visible = !B.broken && (phaseBlend > 0.5) === (B.phase === 1);
    mikelUpdate(dt);
    marksUpdate();
  }
  /* zerbait berria duten herritarrak (! berria, ? emateko prest) */
  function npcNews(N) {
    const f = (k) => saved.flags.includes(k);
    switch (N.id) {
      case "irati":
        return !f("irati1") || (f("basajaun") && !f("cliff")) || (f("lamia") && !f("irati-lamia")) || (f("tartalo") && !f("irati-tartalo")) ? "!" : null;
      case "pello":
      case "peio":
        return !saved.rhythms.includes("esnatu") || (!f("erronka") && f("intro")) ? "!" : null;
      case "joanes":
        return !f("ardiak") || (f("ardiak-saria") && !saved.rhythms.includes("pottoka")) ? "!" : saved.sheep.length >= 3 && !f("ardiak-saria") ? "?" : null;
      case "kattalin":
        if (f("gaua") && !saved.rhythms.includes("eguzkilore")) return f("eguzkilorea") ? "?" : !f("eguzkilore-bila") ? "!" : null;
        if ((saved.arimak || []).length >= 3 && !f("arimak3")) return "?";
        if ((saved.arimak || []).length >= 6 && !f("arimak6")) return "?";
        if ((saved.arimak || []).length >= 10 && !f("arimak10")) return "?";
        return !f("kattalin") || !f("kattalin-belar") ? "!" : saved.herbs.length >= 3 && !f("belarrak-ok") ? "?" : null;
      case "maddi":
        return f("basajaun") && !f("maddi-burdina") ? "!" : saved.ores.length >= 5 && !f("burdina-ok") ? "?" : null;
      case "mikel":
        return !f("mikel-ok") ? "!" : null;
      case "txomin":
        return !f("txomin") ? "!" : f("sarea") && !f("txomin-ok") ? "?" : null;
      case "jentil":
        return !f("jentil") ? "!" : null;
      default:
        return null;
    }
  }
  function marksUpdate() {
    for (const M of QST.marks) {
      const k = ZONE.cur === "ibarra" ? npcNews(M.N) : null;
      M.sp.visible = !!k && !M.N.away && M.N.g.visible && Math.hypot(P.x - M.N.x, P.z - M.N.z) < 60 && !cinematic;
      if (!M.sp.visible) continue;
      M.sp.material.map = k === "?" ? QST.texDone : QST.texNew;
      M.sp.position.set(M.N.x, M.N.y + (M.N.scale || 1) * 2.55 + Math.sin(time * 3 + M.N.x) * 0.08, M.N.z);
    }
  }
  /* --------------------------- Mikelen erronka --------------------------- */
  function mikelStart() {
    QST.mikel = { t: 30, hits: 0, need: 10 };
    for (const R of QST.targets) mikelPlace(R);
    title("FRONTOIKO ERRONKA", "");
    notify(L("Jo hamar jomuga 30 segundotan! (SORGINKERIA)"), "", 3);
    SND.stinger(false);
  }
  function mikelPlace(R) {
    R.lit = false;
    R.x = -31.15;
    R.y = 1.4 + Math.random() * 6.2;
    R.z = 30.5 + Math.random() * 13;
    R.g.position.set(R.x, R.y, R.z);
    R.g.visible = true;
    R.g.scale.setScalar(0.01);
  }
  function mikelHit(R) {
    const M = QST.mikel;
    if (!M) return;
    M.hits++;
    SND.rune(true);
    fxBurst(R.x, R.y, R.z, { n: 20, speed: 3, life: 0.5, size: 0.25, color: "#ffd166", grav: 4 });
    R.lit = true;
    R.g.visible = false;
    if (M.hits >= M.need) return mikelEnd(true);
    setTimeout(() => QST.mikel && mikelPlace(R), 350);
  }
  function mikelUpdate(dt) {
    const M = QST.mikel;
    if (!M) return;
    M.t -= dt;
    for (const R of QST.targets) if (R.g.visible) R.g.scale.setScalar(mix(R.g.scale.x, 1, 1 - Math.exp(-dt * 10)));
    if (M.t <= 0 || ZONE.cur !== "ibarra" || Math.hypot(P.x + 26, P.z - 37) > 30) mikelEnd(false);
  }
  function mikelEnd(win) {
    QST.mikel = null;
    for (const R of QST.targets) {
      R.lit = true;
      R.g.visible = false;
    }
    if (win) {
      flagSet("mikel-ok");
      SND.stinger(true);
      const N = NPCS.find((n) => n.id === "mikel");
      talk(N, [["MIKEL", "Hamarrak! Zu bai sorgina! Hartu hau: frontoiaren azpian aurkitu nuen, distiraka."]], () => pieceGet("mikel"));
    } else notify(L("Denbora amaitu da. Mikelekin hitz egin berriro saiatzeko."), "", 3);
    hud();
  }
  /* ------------------------------ elkarrizketak ------------------------------ */
  function talkMikel(N, f) {
    if (f("mikel-ok")) return talk(N, [["MIKEL", ["Handitan zu bezalakoa izango naiz: frontoian txapeldun eta sorgin!", "Txomin zaharrak badia izoztuan galdu zuen sarea. Gaixoa.", "Andereren etxea sorgindua dago. Amonak dio ez hurbiltzeko."][Math.floor(time) % 3]]]);
    talk(
      N,
      [
        ["MIKEL", "Kaixo, sorgin! Pilotan jokatzen dut, baina zuk sorginkeriaz ere jo dezakezu, ezta?"],
        ["MIKEL", "Erronka bat: hamar jomuga frontoian, hogeita hamar segundotan. Irabazten baduzu, nire altxorra zurea."],
      ],
      () =>
        dialog("MIKEL", L("FRONTOIKO ERRONKA"), "", L("Jomugak frontoiaren horman agertuko dira. SORGINKERIArekin jo (helburua berez bilatzen du)."), "", [
          [L("ERRONKA ONARTU"), mikelStart],
          [L("GERO"), () => {}],
        ]),
    );
  }
  function talkTxomin(N, f) {
    if (seaskaTalk(N, f)) return;
    if (!f("txomin"))
      return talk(
        N,
        [
          ["TXOMIN", "Itsasoa izoztuta, txalupa harrapatuta… eta nire sarea, badiako uhartetxoan, izotzaren erdian."],
          ["TXOMIN", "Oinez joan daiteke izotzaren gainetik, baina ni zaharregia naiz. Eta iraganeko ura… hura ez da izotza."],
        ],
        () => flagSet("txomin"),
      );
    if (f("sarea") && !f("txomin-ok"))
      return talk(N, [["TXOMIN", "Nire sarea! Eskerrik asko, neska. Hartu hau: itsasoaren hondoan aurkitu nuen, aspaldi."]], () => {
        flagSet("txomin-ok");
        saved.coins += 40;
        saved.potions = Math.min(2, (saved.potions || 0) + 1);
        persist();
        pieceGet("sarea");
      });
    return talk(N, [["TXOMIN", f("txomin-ok") ? "Itsasoa urtzen denean, arraina eramango dizut. Hitza." : "Sarea uhartetxoan dago, badiaren erdian. Orainean izotzak eusten du."]]);
  }
  function talkMaite(N) {
    talk(N, [["MAITE", ["Ogia goizean, txalaparta gauez. Herri honek ez du lorik egiten.", "Andereren etxe hura… gauez argi urdin bat ikusten da leihoan.", "Ibaia izoztu zenetik, Txomin ez da itsasora atera.", "Oiloak ere urduri daude. Zerbait dator."][Math.floor(time * 0.7) % 4]]]);
  }
  /* ------------------------------ egunkaria (L) ------------------------------ */
  function questLog() {
    if (!started || paused || cinematic || TXALA.on) return;
    const f = (k) => saved.flags.includes(k),
      line = (done, name, prog, hint) => (done ? "✓ " : "◆ ") + name + (prog ? " · " + prog : "") + (done || !hint ? "" : "\n   " + hint),
      side = [];
    if (f("ardiak") || f("intro")) side.push(line(f("ardiak-saria"), L("Joanesen ardiak"), saved.sheep.length + "/3", f("ardiak") ? L("Hiru ardi galduak: zelaiak, ipar-larreak eta basoa. Hurbildu eta hesira eraman.") : L("Joanes artzaina zelaietan dago.")));
    side.push(line(f("erronka"), L("Txalapartarien erronka"), "", L("Pello eta Peio plazan: sei kolpeko erritmoa.")));
    if (f("kattalin")) side.push(line(f("belarrak-ok"), L("Kattalinen sorgin-belarrak"), saved.herbs.length + "/3", L("Lore urdinak IRAGANEAN bakarrik: basoa, harrespila, ibaiaz bestaldeko larreak.")));
    side.push(line(f("mikel-ok"), L("Mikelen frontoiko erronka"), "", L("Hamar jomuga hogeita hamar segundotan.")));
    if (f("txomin")) side.push(line(f("txomin-ok"), L("Txominen sarea"), f("sarea") ? L("eskuan") : "", L("Badiako uhartetxoa: ORAINEAN izotzaren gainetik.")));
    else side.push(line(false, L("Arrantzalea kaian"), "", L("Portuko eskaileratik behera, kaian norbait zain.")));
    if (f("maddi-burdina")) side.push(line(f("burdina-ok"), L("Maddiren burdin-harriak"), saved.ores.length + "/5", L("Harri ilunak zain laranjekin: arroila (izotza), lepoa eta leizeak.")));
    side.push(line(f("andere"), L("Oihartzun-harriak"), saved.echoes.length + "/7", L("Harri urdin distiratsuak haran osoan: jo ENTZUN haien ondoan.")));
    if (f("gaua")) side.push(line(saved.rhythms.includes("eguzkilore"), L("Kattalinen eguzkilorea"), f("eguzkilorea") ? L("eskuan") : "", L("Harrespilako larrean: IRAGANEAN (uda) eta EGUNEZ bakarrik loratzen da.")));
    if (f("arimak") || (saved.arimak || []).length) side.push(line(f("arimak10"), L("Arima-argiak"), (saved.arimak || []).length + "/10", L("GAUEZ bakarrik, haran osoan barreiatuta. Kattalinek elizako argizaiolak pizten ditu.")));
    side.push(...secretsLog(line));
    const pieces = saved.pieces.length;
    dialog(
      L("EGUNKARIA"),
      L("Eginkizunak eta misterioak"),
      "",
      L("ISTORIOA") + "\n" + objective()[0] + "\n\n" + L("BESTE EGINKIZUNAK") + "\n" + side.join("\n") + "\n\n" + L("Arnasa-zatiak: ") + pieces + " · " + L("Txanponak: ") + saved.coins + (f("andere") ? "\n\n" + L("ANDERE: «Gaueko ez dago erlojuan. Zazpigarren leizean itxaroten du, Anboton.»") : ""),
      "",
      [[L("ITXI"), () => {}]],
    );
  }
