  /* ==================================================================
     GIDOIA · LEIZEEN DEIA (istorio propioa)
     Erlojua hautsi eta urtebetera, Ibarrako txalapartak gauez jotzen hasten dira
     bakarrik. Mari isildu da; Gauekoren itzal-zatiek mitologiako izakiak
     gaiztotzen dituzte. Amaiur leizera jaitsiko da Basajaun askatzera.
     · Banderak (saved.flags): istorioaren aurrerapena.
     · Helburua (HUD + urrezko markatzailea): aurrerapenaren araberakoa.
     · Amaiera (zati honetakoa): Mariren suzko bola zeruan… nork darama?
     ================================================================== */
  const ITEMS = {
    adarra: {
      get() {
        if (!saved.items.includes("adarra")) saved.items.push("adarra");
        persist();
        translate();
        itemGet(
          "adarra",
          L("HAIZE-ADARRA"),
          L("Putz egin: haize-bolada aurrera. Haize-errotak biratzen ditu, balsak bultzatzen, lainoa uxatzen. ") + (mobile ? L("ADARRA botoia agertzen da behar denean.") : L("V tekla.")),
          () => coach("horn", "V", "V: HAIZE-ADARRA · putz egin aurrera", "", "useBtn", "ADARRA: putz egin aurrera", ""),
        );
      },
    },
    sugarra: {
      get() {
        if (!saved.items.includes("sugarra")) saved.items.push("sugarra");
        persist();
        itemGet(
          "sugarra",
          L("BURRUNTZI GORIA"),
          L("SUGAR-IZPIA: INDARRA kargatuta askatzean, izpia sua da. Egurra erretzen du, Gauekoren izotza urtzen eta burdinazko galdarak pizten. ") + (mobile ? L("Eutsi SORGINKERIA botoiari eta askatu.") : L("Eutsi J (edo klika) eta askatu.")),
          () => coach("fire", "J", "Mantendu J eta askatu: SUGAR-IZPIA (sua)", "", "attackBtn", "Mantendu SORGINKERIA eta askatu: SUGAR-IZPIA", ""),
        );
      },
    },
    tximistarria: {
      get() {
        if (!saved.items.includes("tximistarria")) saved.items.push("tximistarria");
        TXB.n = TXB.max;
        persist();
        translate();
        itemGet(
          "tximista",
          L("TXIMISTARRIA"),
          L("Tximistak lurrera botatako harria. Jaurti: trumoiak harri arrakalatuak apurtzen ditu eta itzalak zorabiatzen. Urrun egon! Hiru harri; berez betetzen dira. ") + (mobile ? L("TXIMISTA botoia agertzen da arrakala bat hurbil dagoenean (eta ⋯ menuan).") : L("X tekla.")),
          () => coach("bomb", "X", "X: TXIMISTARRIA · jaurti eta urrundu", "", "useBtn", "TXIMISTA: jaurti eta urrundu", ""),
        );
      },
    },
    enara: {
      get() {
        if (!saved.items.includes("enara")) saved.items.push("enara");
        persist();
        translate();
        itemGet(
          "enara",
          L("ENARAREN HEGOAK"),
          L("Enara baten hegoak. Airean, jauzi bikoitzaren ondoren, eutsi JAUZIari: planeatu. Haize-zutabeek gora eramaten zaituzte. ") + (mobile ? L("JAUZI bi aldiz eta eutsi.") : L("␣ bi aldiz eta eutsi.")),
          () => coach("glide", "␣", "␣ ×2 eta eutsi: ENARA (planeatu)", "", "jumpBtn", "JAUZI ×2 eta eutsi: ENARA", ""),
        );
      },
    },
    ispilua: {
      get() {
        if (!saved.items.includes("ispilua")) saved.items.push("ispilua");
        persist();
        translate();
        itemGet(
          "ispilua",
          L("EGUZKI-ISPILUA"),
          L("Brontzezko ispilu zaharra, eguzki bat atzean. Argi-zutabe batean (sabaiko arrakalak), eutsi SORGINKERIAri: argia islatu eta apuntatu. IRAGANEAN eguzkia, ORAINEAN ilargia. Gela honetan bertan ere, zutabe bat dago… ") + (mobile ? L("Eutsi SORGINKERIA botoiari argian.") : L("Eutsi J argian.")),
          () => coach("ispilua", "J", "Argi-zutabean: mantendu J → EGUZKI-ISPILUA (apuntatu)", "", "attackBtn", "Argi-zutabean: mantendu SORGINKERIA → ISPILUA", ""),
        );
      },
    },
    katea: {
      get() {
        if (!saved.items.includes("katea")) saved.items.push("katea");
        persist();
        itemGet(
          "katea",
          L("SUGAARREN KATEA"),
          L("Suge-eraztunetara tiratzen zaitu, kaxak erakartzen ditu eta etsaiak zorabiatzen. ") + (mobile ? L("KATEA botoia agertzen da eraztun bat hurbil dagoenean.") : L("C tekla.")),
          () => coach("chain", "C", "C: KATEA · suge-eraztunetara tiratu", "", "useBtn", "KATEA: suge-eraztunetara tiratu", ""),
        );
      },
    },
  };
  function flagSet(k) {
    if (saved.flags.includes(k)) return;
    saved.flags.push(k);
    persist();
    questCheck();
  }
  const flag = (k) => saved.flags.includes(k);
  /* elkarrizketak eszena gisa: [nor, testua, "", x, z, y] */
  let CINE_AFTER = null;
  function say(shots, after) {
    /* ahotsak (sh[7]) aurrez kargatu: planoa hasten denerako prest egon daitezen */
    voicePreload(shots.map((s) => s[7]));
    scenes.push(shots);
    CINE_AFTER = after || null;
    playScene(scenes.length - 1);
  }
  function storyAfterScene() {
    const f = CINE_AFTER;
    CINE_AFTER = null;
    if (f) f();
  }
  /* --------------------------- helburuak --------------------------- */
  function objective() {
    if (PRO.on) return proObjective();
    if (ZONE.cur === "anboto") return anbotoObjective();
    const d = (x, z) => Math.round(Math.hypot(P.x - x, P.z - z));
    const DG = DGS[ZONE.cur];
    if (DG && DG.objective) return DG.objective();
    if (ZONE.cur === "leizea") {
      const R = DUNGEON.rooms,
        inE = ROOM.cur === R.E;
      if (!isCleared("dA-fire")) return ["Piztu bi sutegiak SORGINKERIArekin, elkarren segidan.", [R.A.x, -5, 0]];
      if (!saved.doors.includes("dB-n") && !saved.keyz.leizea) return ["Giltza bat behar da. Mendebaldeko gelan, ertz garai baten gainean…", [R.C.x, R.C.z + 4, 0]];
      if (!saved.doors.includes("dB-n")) return ["Ireki iparreko atea giltza txikiarekin.", [R.B.x, R.B.z - 15, 0]];
      if (!isCleared("D")) return ["Itzalen gelan sartu eta garbitu.", [R.D.x, R.D.z, 0]];
      if (!saved.rhythms.includes("entzun")) return ["Ekialdeko gelan harri-danbor bat dago. Entzun zer dioen.", [DUNGEON.drum.x, DUNGEON.drum.z - 2.6, 0]];
      if (!isCleared("dF-boss")) return [inE && P.z > -80 ? "Putzua: jo ENTZUN (B) ertzean, eta gurutzatu agertzen diren harrietatik." : "Iparrera: zaindariaren gela.", inE && P.z > -80 ? [R.E.x - 8, R.E.z + 9, 0] : [R.F.x, R.F.z, 0]];
      if (!saved.items.includes("katea")) return ["Zaindariaren kutxa ireki.", [R.F.x, R.F.z - 4, 0]];
      if (!saved.items.includes("giltzanagusia")) return ["Mendebaldeko putzua: KATEA (C) suge-eraztunetara.", [R.G.x + 10, R.G.z + 6, 0]];
      if (!flag("basajaun")) return saved.doors.includes("dD-n") ? ["Basajaunen bihotza. Prestatu.", [R.I.x, R.I.z + 8, 0]] : ["Ate handia iparraldean: giltza nagusia.", [R.D.x, R.D.z - 12, 0]];
      return ["Irten leizetik hegoaldeko arkutik. Herriak zure berri itxaroten du.", [DUNGEON.exitArch.x, DUNGEON.exitArch.z, 0]];
    }
    if (!flag("irati1")) return ["Plazan: Iratiren oihartzunarekin hitz egin.", [0, 41, 0]];
    if (!saved.rhythms.includes("esnatu")) return ["Plazako txalaparta: Pello eta Peiorekin hitz egin.", [0, 28.4, 0]];
    if (!flag("atea")) return ["Iparrera, ibaiaz bestaldean, basoko leizea. Atea: jo ESNATU (" + d(HUB.cave.x, HUB.cave.z) + " m).", [HUB.cave.x, HUB.cave.z + 4, 5]];
    if (!flag("basajaun")) return ["Basajaunen leizea zabalik dago. Sartu.", [HUB.cave.x, HUB.cave.z, 5]];
    if (!flag("cliff")) return ["Itzuli herrira. Iratiri kontatu.", [0, 41, 0]];
    if (!flag("lamia")) return ["Ekialdeko ur-jauzia: LAMIEN LEIZEA. Izotzaren gainetik joan; han, IRAGANERA (" + d(93, -28.5) + " m).", [93, -28.5, -0.9]];
    if (!flag("lepoa")) return ["Artzainen lepoa: haize-errotari putz HAIZE-ADARRAz (" + d(-74.6, -99) + " m).", [-74.6, -99, 9.4]];
    if (!flag("tartalo")) return ["Lepoaren goian: TARTALOREN KOBA (" + d(-70, -128) + " m).", [-70, -127, 12]];
    if (!flag("irati-tartalo")) return ["Itzuli herrira: Iratiri Tartaloren berri eman.", [0, 41, 0]];
    if (!flag("jentilatea")) return ["Harrespilako trikuharria: jentilen atea. Jo ESNATU haren ondoan (" + d(45, -69.5) + " m).", [45, -67, 9]];
    if (!flag("errolan")) return ["JENTILBARATZA: trikuharriaren azpian, jentilen hiria (" + d(45, -69.5) + " m).", [45, -69.4, 9]];
    if (!flag("irati-errolan")) return ["Itzuli herrira: Iratiri Errolanen berri eman.", [0, 41, 0]];
    if (!saved.rhythms.includes("ortzi")) return ["Harrespilan, jentil zaharrak badaki zerura nola igo (" + d(46, -64) + " m).", [46, -62.4, 9]];
    if (!flag("ortzadarra")) return ["Harrespilaren erdian jo ORTZI (txalaparta): ortzadarra.", [46, -66.5, 9]];
    if (!flag("odei")) return ["Ortzadarra: igo hodeien gainera, JENTILEN ZERUA (" + d(ORZ.A.x, ORZ.A.z) + " m).", [ORZ.A.x, ORZ.A.z - 1, 9]];
    if (!flag("irati-odei")) return ["Itzuli herrira: Iratiri Odeiren berri eman.", [0, 41, 0]];
    if (!flag("herensugea")) return ["JENTILEN ZERUA: ortzadarretik igo, eta Odeiren hodei zuriak SUGE-MENDIRA eramango zaitu (" + d(ORZ.A.x, ORZ.A.z) + " m).", [ORZ.A.x, ORZ.A.z - 1, 9]];
    if (!flag("irati-herensuge")) return ["Plazan: Iratiri Herensugearen berri eman.", [0, 41, 0]];
    /* zazpigarren atala: Inguma (seaska.js, ametsa.js) */
    if (!flag("inguma-ametsa")) return ["Iturralden lo egin (ohea), sutondoa piztuta.", [28, 31, 0]];
    if (!flag("seaska")) return ["Plazan: Iratiri ametsaren berri eman.", [0, 41, 0]];
    if (!flag("seaska-kanta")) {
      const B = BERTSOAK.find((b) => !flag(b.flag));
      if (!B) return ["Plazan: Irati, hiru bertsoekin.", [0, 41, 0]];
      const at = { "bertso-belar": [-15.5, 28.5, 0], "bertso-hare": [8.2, 78, -7.2], "bertso-izar": [46, -64, 9] }[B.flag];
      return ["Seaska-kantaren bertsoak (" + bertsoCount() + "/3): " + B.who + (B.flag === "bertso-izar" && DAY.k < 0.5 ? " — gauez." : "."), at];
    }
    if (!flag("inguma")) return ["Iturralden, ohean: AMETSERA (Ingumaren ametsa).", [28, 31, 0]];
    if (!flag("irati-inguma")) return ["Irten kanpora: Anboto aldera begiratu.", [28, 31, 0]];
    /* azken atala: Anboto (anboto.js) */
    if (!flag("anboto")) return ["Plazan: Irati. Anbotora, Mariren etxera.", [0, 41, 0]];
    return [saved.pieces.length < 8 ? "Harana zurea da. Arnasa-zatiak: " + saved.pieces.length + " · Ardiak: " + saved.sheep.length + "/3" : "Harana zurea da.", null];
  }
  function questCheck() {
    if (ready) hud();
  }
  /* --------------------------- hasiera eta amaiera --------------------------- */
  /* etsai nagusiaren ondoren: irteera-argia eta, haranean, Mariren suzko bola */
  function storyAfterBoss() {
    title("BASAJAUN ASKE", "");
    notify(L("Basajaunen basoa askatuta. Irten hegoaldeko arkutik."), "", 5);
    hud();
  }
  const MARI = { m: null, t: -1 };
  function mariCliff() {
    if (flag("cliff") || ZONE.cur !== "ibarra") return;
    flagSet("cliff");
    if (!MARI.m) {
      MARI.m = new T.Mesh(new T.SphereGeometry(4, 16, 12), new T.MeshBasicMaterial({ color: "#ffb347" }));
      MARI.glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ff9a3a", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      MARI.glow.scale.setScalar(40);
      MARI.m.add(MARI.glow);
      ZONES.ibarra.group.add(MARI.m);
    }
    MARI.armed = true;
    say(
      [
        ["IRATI", "Amaiur! Basajaunen orroa entzun dugu herritik… baina ez zen haserrea. Askatu duzu!", "", 0, 41, 0],
        ["· · ·", "Bat-batean, zerua argitzen da. Suzko bola bat, Anbotoko aldetik, itsaso aldera hegan.", "", 10, -120, 79, [0, 4, 34]],
        ["IRATI", "Mariren sua… baina Mari ez doa haren barruan. Norbaitek darama.", "", 0, 41, 0],
        ["GAUEKO", "Txalapartak deitzen du, sorgin. Nik ere entzuten dut. Zazpi leize, zazpi zaindari… eta zu bakarrik.", "", P.x, P.z, 0, null, "st_g1"],
        ["AMAIUR", "Gaueko… ez zinen desagertu.", "", P.x, P.z, 0],
        ["IRATI", "Ez gaude bakarrik, Amaiur. Basajaun zurekin dago orain. Eta herri osoa.", "", 0, 41, 0],
      ],
      () => {
        title("JARRAITZEKO…", "");
        notify(L("Lehen leizea amaituta. Harana libreki esploratu dezakezu: arnasa-zatiak, ardiak, erronkak…"), "", 7);
        hud();
      },
    );
  }
  /* zati honen amaiera: zazpi argi zeruan, Anboto aldean — hiru askatuta (berdeak), lau falta (gorriak) */
  const ZAZPI = { g: null, t: -1, armed: false, lights: [], storm: null, green: 3 };
  /* argien koloreak: askatutako zaindariak berde, besteak gorri */
  function zazpiColors(green) {
    ZAZPI.green = green;
    for (const L0 of ZAZPI.lights) {
      const c = L0.i < green ? "#3dff8a" : "#ff2a1a";
      L0.halo.material.color.set(c);
      L0.core.material.color.set(c);
    }
  }
  function zazpiBuild() {
    const g = new T.Group();
    g.position.set(20, 125, -170);
    /* ekaitz-hodeia: erdian iluna, ertzetan garden (kanbasean marraztua) */
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 128;
    const c2 = cv.getContext("2d");
    for (let k = 0; k < 14; k++) {
      const x = 40 + ((k * 73) % 176),
        y = 40 + ((k * 37) % 48),
        r = 34 + ((k * 19) % 30),
        gr = c2.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(22,16,30,0.75)");
      gr.addColorStop(1, "rgba(22,16,30,0)");
      c2.fillStyle = gr;
      c2.fillRect(0, 0, 256, 128);
    }
    const storm = new T.Mesh(new T.PlaneGeometry(260, 130), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    storm.position.set(0, -6, -30);
    g.add(storm);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU - PI / 2,
        col = i < 3 ? "#3dff8a" : "#ff2a1a",
        halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, depthWrite: false, opacity: 0, fog: false })),
        core = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
      halo.position.set(Math.cos(a) * 24, Math.sin(a) * 24, 0);
      core.position.copy(halo.position);
      halo.scale.setScalar(20);
      core.scale.setScalar(6);
      g.add(halo, core);
      ZAZPI.lights.push({ halo, core, i });
    }
    g.visible = false;
    ZONES.ibarra.group.add(g);
    g.lookAt(0, 30, 40);
    ZAZPI.g = g;
    ZAZPI.storm = storm;
  }
  function zazpiUpdate(dt) {
    if (!ZAZPI.g) return;
    if (ZAZPI.armed && cinematic && cinematic.n >= 2) {
      ZAZPI.armed = false;
      ZAZPI.t = 0;
      ZAZPI.g.visible = true;
    }
    if (ZAZPI.t < 0) return;
    const t = (ZAZPI.t += dt);
    /* laugarren argia: gorritik berdera (Errolan aske) */
    if (ZAZPI.turn && ZAZPI.green < (ZAZPI.turnTo || 4) && t > 4.2) {
      zazpiColors(ZAZPI.turnTo || 4);
      SND.stinger(true);
    }
    ZAZPI.storm.material.opacity = clamp(t * 0.6, 0, 1);
    for (const L0 of ZAZPI.lights) {
      const k = clamp((t - 0.8 - L0.i * 0.45) * 2, 0, 1),
        beat = L0.i < ZAZPI.green ? 1 : 0.7 + Math.sin(time * 5 + L0.i) * 0.3;
      L0.halo.material.opacity = k * 0.85 * beat;
      L0.core.material.opacity = k * beat;
    }
  }
  function iratiFinale() {
    if (flag("irati-tartalo") || ZONE.cur !== "ibarra") return;
    if (!ZAZPI.g) zazpiBuild();
    ZAZPI.armed = true;
    say(
      [
        ["IRATI", "Amaiur! Lepotik ardi-zintzarriak entzun ditugu, eta Tartaloren orroa… baina kantu bat zirudien.", "", 0, 41, 0],
        ["AMAIUR", "Aske dago. Begitik itzal bat atera zitzaion, kea bezala. Eta izen bat esan zuen: Anboto.", "", P.x, P.z, 0],
        ["· · ·", "Une horretan, Anboto aldetik, hodei beltz bat jaitsi da harana estaltzera. Haren barruan, zazpi argi.", "", 20, -170, 120, [0, 30, 40]],
        ["· · ·", "Hiru argi berde: Basajaun, Lamia, Tartalo. Beste lauak gorri, taupaka, bihotz gaiztotuak bezala.", "", 20, -170, 120, [0, 30, 40]],
        ["GAUEKO", "Hiru zaindari, sorgin. Lau falta. Eta Anboton, Mariren etxean… ni zain. Txalaparta jo nahi duzu? Jo, bada. Nik ere badakit dantzan.", "", P.x, P.z, 0, null, "st_g3"],
        ["IRATI", "Ez entzun. Beldur da: herriak berriro jotzen du gauez, eta erritmoa indartzen ari da.", "", 0, 41, 0],
        ["AMAIUR", "Orrazia, adarra, sua… eta zuek. Anbotora noa.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-tartalo");
        ZAZPI.t = -1;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Hiru leize amaituta. Harrespilako trikuharriak dardara egiten du: jo ESNATU haren ondoan."), "", 8);
        hud();
      },
    );
  }
  /* laugarren zatiaren amaiera: Errolan aske → laugarren argia berde */
  function iratiJentil() {
    if (flag("irati-errolan") || ZONE.cur !== "ibarra") return;
    if (!ZAZPI.g) zazpiBuild();
    zazpiColors(3);
    ZAZPI.armed = true;
    ZAZPI.turn = true;
    say(
      [
        ["IRATI", "Amaiur! Gau osoan harrespilako harriek dardara egin dute… eta gero, trumoi bat, zerua garbi zegoen arren.", "", 0, 41, 0],
        ["AMAIUR", "Errolan, jentilen azkena. Aske dago. Ekaitz bat zeraman bularrean.", "", P.x, P.z, 0],
        ["· · ·", "Anbotoko hodeian, zazpi argiak berriro. Laugarrena… berde bihurtu da.", "", 20, -170, 120, [0, 30, 40]],
        ["GAUEKO", "Lau. Ondo kontatzen duzu, sorgin. Baina hodeien gainean, jentilen zeruan… nire hiru zaindari gogorrenak zain daude.", "", P.x, P.z, 0, null, "st_g4"],
        ["IRATI", "Ez gaude bakarrik: herriak berriro jotzen du txalaparta, gauez eta egunez.", "", 0, 41, 0],
        ["AMAIUR", "Jentilen zerura, beraz. Hodeien gainera.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-errolan");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Lau leize amaituta. Harana zurea da: arnasa-zatiak, misterioak, erronkak… Jentilen zerua laster."), "", 8);
        hud();
      },
    );
  }
  /* bosgarren zatiaren amaiera: Odei aske → bosgarren argia berde */
  function iratiOdei() {
    if (flag("irati-odei") || ZONE.cur !== "ibarra") return;
    if (!ZAZPI.g) zazpiBuild();
    zazpiColors(4);
    ZAZPI.armed = true;
    ZAZPI.turn = true;
    ZAZPI.turnTo = 5;
    say(
      [
        ["IRATI", "Amaiur! Gaur euria egin du, eta euri goxoa zen, ez kazkabarra. Txalapartak lasaiago jotzen du.", "", 0, 41, 0],
        ["AMAIUR", "Odei aske dago. Trumoi bat zeraman bihotzean, Errolanek bezala.", "", P.x, P.z, 0],
        ["· · ·", "Anbotoko hodeian, zazpi argiak berriro. Bosgarrena… berde bihurtu da.", "", 20, -170, 120, [0, 30, 40]],
        ["GAUEKO", "Bost. Ondo dabil zure txalaparta, sorgin. Baina Herensugeak ez du kanpairik entzuten… eta Ingumak ametsetan harrapatzen ditu ausartenak ere.", "", P.x, P.z, 0, null, "st_g5"],
        ["IRATI", "Ez dago bakarrik, Gaueko. Herri osoak jotzen du berarekin.", "", 0, 41, 0],
        ["AMAIUR", "Bi falta. Gero, Anbotora.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-odei");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Bost leize amaituta. Herensugea zain dago, hodeien beste aldean: igo ortzadarretik, eta Odeiren hodei zuriak eramango zaitu."), "", 8);
        hud();
      },
    );
  }
  /* seigarren zatiaren amaiera: Herensugea aske → seigarren argia berde; Inguma */
  function iratiHerensuge() {
    if (flag("irati-herensuge") || ZONE.cur !== "ibarra") return;
    if (!ZAZPI.g) zazpiBuild();
    zazpiColors(5);
    ZAZPI.armed = true;
    ZAZPI.turn = true;
    ZAZPI.turnTo = 6;
    say(
      [
        ["IRATI", "Amaiur! Herensuge bat herriaren gainean, hegan! Haurrak oihuka atera dira… baina zuri begira zegoen, ez guri.", "", 0, 41, 0],
        ["AMAIUR", "Zazpi buru zituen, eta sei gezurrak ziren. Orain bat bakarra du: berea.", "", P.x, P.z, 0],
        ["· · ·", "Anbotoko hodeian, zazpi argiak berriro. Seigarrena… berde bihurtu da.", "", 20, -170, 120, [0, 30, 40]],
        ["GAUEKO", "Sei. Esna zaude oraindik, sorgin txikia? Laster… lo egingo duzu. Eta ametsetan, nire azken zaindaria zain: Inguma.", "", P.x, P.z, 0, null, "st_g6"],
        ["IRATI", "Gaur gauean, ez itzali sutondoa, Amaiur. Nire amonak esaten zuen: Ingumaren aurka, kanta bat ohe ondoan.", "", 0, 41, 0],
        ["AMAIUR", "Kanta bat… Bat falta. Gero, Anbotora.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-herensuge");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Sei leize amaituta. Harana, zerua eta suge-mendia zureak dira. Inguma laster: ametsetan…"), "", 8);
        hud();
      },
    );
  }
  function mariUpdate(dt) {
    zazpiUpdate(dt);
    /* bigarren planoan hasi (zerua begiratzen denean) */
    if (MARI.armed && cinematic && cinematic.n >= 1) {
      MARI.armed = false;
      MARI.t = 0;
    }
    if (MARI.t < 0 || !MARI.m) return;
    MARI.t += dt;
    const k = Math.min(1, MARI.t / 9);
    MARI.m.position.set(mix(-60, 120, k), 90 + Math.sin(k * PI) * 30, mix(-300, 160, k));
    MARI.m.visible = k < 1;
    if (Math.random() < dt * 30) fxBurst(MARI.m.position.x, MARI.m.position.y, MARI.m.position.z, { n: 3, speed: 2, life: 1.2, size: 2.4, color: "#ffb347", grav: 0 });
    if (k >= 1) MARI.t = -1;
  }
