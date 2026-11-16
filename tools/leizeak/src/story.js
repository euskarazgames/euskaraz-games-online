  /* ==================================================================
     GIDOIA · LEIZEEN DEIA (GAU BELTZAren aurrekoa; istorio propioa)
     Gau Beltzaren gauetik hiru negura, Ibarrako txalapartak gauez jotzen hasten dira
     bakarrik: leizeek deitzen dute. Atarrabik (Mariren semea, itzalik gabe) kriseiluaren
     sugarretik hitz egiten dio Amaiurri; haren anaia Mikelatsek Mariren zazpi txingarrak
     lapurtzen ditu leizeetako zaindariak gaiztotuz. Amaiur leizera jaitsiko da Basajaun askatzera.
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
          L("SUGAR-IZPIA: INDARRA kargatuta askatzean, izpia sua da. Egurra erretzen du, Mikelatsen izotza urtzen eta burdinazko galdarak pizten. ") + (mobile ? L("Eutsi SORGINKERIA botoiari eta askatu.") : L("Eutsi J (edo klika) eta askatu.")),
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
          L("Brontzezko ispilu zaharra, eguzki bat atzean. Argi-zutabe batean (sabaiko arrakalak), eutsi SORGINKERIAri: argia islatu eta apuntatu. UDAN eguzkia, NEGUAN ilargia. Gela honetan bertan ere, zutabe bat dago… ") + (mobile ? L("Eutsi SORGINKERIA botoiari argian.") : L("Eutsi J argian.")),
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
          L("BASAJAUNEN KATEA"),
          L("Basajaunen katea: eraztunetara tiratzen zaitu, kaxak erakartzen ditu eta etsaiak zorabiatzen. ") + (mobile ? L("KATEA botoia agertzen da eraztun bat hurbil dagoenean.") : L("C tekla.")),
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
    if (ZONE.cur === "harpeak") return harpeakObjective();
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
    if (!flag("irati1")) return ["Plazan: Atarrabirekin hitz egin, txalapartaren ondoan.", [0, 41, 0]];
    if (!saved.rhythms.includes("esnatu")) return ["Plazako txalaparta: Pello eta Peiorekin hitz egin.", [0, 28.4, 0]];
    if (!flag("atea")) return ["Iparrera, ibaiaz bestaldean, basoko leizea. Atea: jo ESNATU (" + d(HUB.cave.x, HUB.cave.z) + " m).", [HUB.cave.x, HUB.cave.z + 4, 5]];
    if (!flag("basajaun")) return ["Basajaunen leizea zabalik dago. Sartu.", [HUB.cave.x, HUB.cave.z, 5]];
    if (!flag("cliff")) return ["Itzuli herrira: Atarrabiri kontatu.", [0, 41, 0]];
    if (!flag("lamia")) return [(flag("ur-jauzia") ? "Ekialdeko ur-jauzia: LAMIEN LEIZEA, uraren atzean (" : "Ekialdeko ur-jauzia izoztuta: izotz-gortinako suge-eraztuna, KATEArekin (") + d(93, -28.5) + " m).", [93, -28.5, -0.9]];
    if (!flag("lepoa")) return ["Artzainen lepoa: haize-errotari putz HAIZE-ADARRAz (" + d(-74.6, -99) + " m).", [-74.6, -99, 9.4]];
    if (!flag("tartalo")) return ["Lepoaren goian: TARTALOREN KOBA (" + d(-70, -128) + " m).", [-70, -127, 12]];
    if (!flag("irati-tartalo")) return ["Itzuli herrira: Atarrabiri Tartaloren berri eman.", [0, 41, 0]];
    /* bihurgunea: AMONAREN TXINGARRA (Iturralden; urtaroak irekitzen ditu) */
    if (!flag("giroa")) return ["Iturraldera: amona zain dago, sutondoan.", [28, 31, 0]];
    if (!flag("jentilatea")) return ["Harrespilako trikuharria: mairuen atea. Jo ESNATU haren ondoan (" + d(45, -69.5) + " m).", [45, -67, 9]];
    if (!flag("errolan")) return ["MAIRUBARATZA: trikuharriaren azpian, mairuen hiria (" + d(45, -69.5) + " m).", [45, -69.4, 9]];
    if (!flag("irati-errolan")) return ["Itzuli herrira: Atarrabiri Mairu zaharraren berri eman.", [0, 41, 0]];
    if (!saved.rhythms.includes("ortzi")) return ["Harrespilan, jentil zaharrak badaki zerura nola igo (" + d(46, -64) + " m).", [46, -62.4, 9]];
    if (!flag("ortzadarra")) return ["Harrespilaren erdian jo ORTZI (txalaparta): ortzadarra.", [46, -66.5, 9]];
    if (!flag("odei")) return ["Ortzadarra: igo hodeien gainera, ORTZIA (" + d(ORZ.A.x, ORZ.A.z) + " m).", [ORZ.A.x, ORZ.A.z - 1, 9]];
    if (!flag("irati-odei")) return ["Itzuli herrira: Atarrabiri Eateren berri eman.", [0, 41, 0]];
    if (!flag("herensugea")) return ["ORTZIA: ortzadarretik igo, eta hodei zuri batek ZEZEN-HARPERA eramango zaitu (" + d(ORZ.A.x, ORZ.A.z) + " m).", [ORZ.A.x, ORZ.A.z - 1, 9]];
    if (!flag("irati-herensuge")) return ["Plazan: Atarrabiri Zezengorriren berri eman.", [0, 41, 0]];
    /* zazpigarren atala: Inguma (seaska.js, ametsa.js) */
    if (!flag("inguma-ametsa")) return ["Iturralden lo egin (ohea), sutondoa piztuta.", [28, 31, 0]];
    if (!flag("seaska")) return ["Plazan: Atarrabiri akelarrearen berri eman.", [0, 41, 0]];
    if (!flag("seaska-kanta")) {
      const B = BERTSOAK.find((b) => !flag(b.flag));
      if (!B) return ["Plazan: Atarrabi, hiru bertsoekin.", [0, 41, 0]];
      const at = { "bertso-belar": [-15.5, 28.5, 0], "bertso-hare": [8.2, 78, -7.2], "bertso-izar": [46, -64, 9] }[B.flag];
      return ["Lo-kantaren bertsoak (" + bertsoCount() + "/3): " + B.who + (B.flag === "bertso-izar" && DAY.k < 0.5 ? " — gauez." : "."), at];
    }
    if (!flag("inguma")) return ["Iturralden, ohean: AKELARRERA (Akerbeltz).", [28, 31, 0]];
    if (!flag("irati-inguma")) return ["Irten kanpora: Murumendi aldera begiratu.", [28, 31, 0]];
    /* azken atala: Anboto (anboto.js) */
    if (!flag("anboto")) return ["Plazan: Atarrabi. Murumendira, amonaren bila.", [0, 41, 0]];
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
        ["ATARRABI", "Amaiur! Basajaunen orroa entzun dut lurraren azpitik… baina ez zen haserrea. Askatu duzu!", "", 0, 41, 0],
        ["· · ·", "Bat-batean, zerua argitzen da. Suzko bola bat, mendi aldetik, itsaso aldera hegan.", "", 10, -120, 79, [0, 4, 34]],
        ["ATARRABI", "Lehen txingarra amaren leizera itzuli da. Amak… sentitu du.", "", 0, 41, 0],
        ["MIKELATS", "Anaiak sorgin bat aurkitu du. Txingar bat itzuli diozu amari… Sei ditut oraindik.", "", P.x, P.z, 0, null, "st_g1"],
        ["AMAIUR", "Hori zen zure anaia? Haren ahotsa… hotza da.", "", P.x, P.z, 0],
        ["ATARRABI", "Ez beldurtu. Basajaun zurekin dago orain. Eta herri osoa ere bai.", "", 0, 41, 0],
      ],
      () => {
        title("JARRAITZEKO…", "");
        notify(L("Lehen txingarra itzulita. Harana libreki esploratu dezakezu: arnasa-zatiak, ardiak, erronkak…"), "", 7);
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
      const c = L0.i < green ? "#ffcf5a" : "#a3201a";
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
        col = i < 3 ? "#ffcf5a" : "#a3201a",
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
        ["ATARRABI", "Amaiur! Lepotik ardi-zintzarriak entzun dira, eta Tartaloren orroa… baina kantu bat zirudien.", "", 0, 41, 0],
        ["AMAIUR", "Aske dago. Begitik itzal bat atera zitzaion, kea bezala… eta zure oinetara etorri zen, Atarrabi.", "", P.x, P.z, 0],
        ["· · ·", "Une horretan, Murumendi aldetik, ekaitz-hodei bat jaitsi da harana estaltzera. Haren barruan, zazpi txingar.", "", 20, -170, 120, [0, 30, 40]],
        ["· · ·", "Hiru txingar urrezko: Basajaun, Lamia, Tartalo. Beste lauak gorri, Mikelatsen ekaitzean, taupaka.", "", 20, -170, 120, [0, 30, 40]],
        ["MIKELATS", "Hiru txingar galdu ditut. Baina negua nirea da, eta zure amonaren sua… hura ere nahi dut.", "", P.x, P.z, 0, null, "st_g3"],
        ["ATARRABI", "Zure amonaren sua aipatu du… Zoaz etxera, Amaiur. Orain.", "", 0, 41, 0],
        ["AMAIUR", "Amona…!", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-tartalo");
        ZAZPI.t = -1;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        notify(L("Hiru txingar itzulita. Iturraldera, azkar: amona zain dago, sutondoan."), "", 8);
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
        ["ATARRABI", "Amaiur! Gau osoan harrespilako harriek dardara egin dute… eta gero, isiltasuna. Lo daude berriro.", "", 0, 41, 0],
        ["AMAIUR", "Mairu zaharra aske dago. Haserrez altxatzen zituen harriak: ekaitz bat zeraman bularrean.", "", P.x, P.z, 0],
        ["· · ·", "Murumendiko hodeian, zazpi txingarrak berriro. Laugarrena… urrez piztu da.", "", 20, -170, 120, [0, 30, 40]],
        ["ATARRABI", "Nire itzala hazten ari da, txingar bakoitzarekin. Ez dakit zergatik… baina ez dut beldurrik.", "", 0, 41, 0],
        ["MIKELATS", "Lau. Harriak lo daude berriro. Baina hodeien gainean, Eatek ez du sorginik maite.", "", P.x, P.z, 0, null, "st_g4"],
        ["ATARRABI", "Eate: haizearen eta suaren izpiritua. Hodeien gainean, Ortzian, bosgarren txingarra gordetzen du, nire anaiaren trumoia bihotzean.", "", 0, 41, 0],
        ["AMAIUR", "Ortzira, beraz. Hodeien gainera.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-errolan");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Lau txingar itzulita. Harana zurea da: arnasa-zatiak, misterioak, erronkak… Ortzia laster."), "", 8);
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
        ["ATARRABI", "Amaiur! Gaur euria egin du, eta euri goxoa zen, ez kazkabarra. Txalapartak lasaiago jotzen du.", "", 0, 41, 0],
        ["AMAIUR", "Eate aske dago. Trumoi bat zeraman bihotzean, Mairu zaharrak bezala.", "", P.x, P.z, 0],
        ["· · ·", "Murumendiko hodeian, zazpi txingarrak berriro. Bosgarrena… urrez piztu da.", "", 20, -170, 120, [0, 30, 40]],
        ["MIKELATS", "Bost. Ekaitza ere galdu dut… Baina Zezengorrik ez du inoiz altxorrik uzten.", "", P.x, P.z, 0, null, "st_g5"],
        ["ATARRABI", "Zezengorri amaren altxorren zaindaria zen. Orain, amaren txingarra zaintzen du nire anaiarentzat, eguzkiaren leizean.", "", 0, 41, 0],
        ["AMAIUR", "Bi falta. Gero, Murumendira.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-odei");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Bost txingar itzulita. Zezengorri zain dago, hodeien beste aldean: igo ortzadarretik, eta hodei zuri batek eramango zaitu."), "", 8);
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
        ["ATARRABI", "Amaiur! Bart, zerua gorri jarri da herriaren gainean, eta zezen baten orroa entzun da mendietan… esker-oihu bat zirudien.", "", 0, 41, 0],
        ["AMAIUR", "Zezengorri aske dago. Altxorra itzuli du, eta eguzkiak berriro ikusten du haren leizea.", "", P.x, P.z, 0],
        ["· · ·", "Murumendiko hodeian, zazpi txingarrak berriro. Seigarrena… urrez piztu da.", "", 20, -170, 120, [0, 30, 40]],
        ["ATARRABI", "Ia osorik dago nire itzala, Amaiur. Begira: eguzkiak badaki non utzi.", "", 0, 41, 0],
        ["MIKELATS", "Sei. Nekatuta zaude, sorgin? Lo egin… Akelarrean, Akerbeltz zain.", "", P.x, P.z, 0, null, "st_g6"],
        ["ATARRABI", "Akelarrea… Gaur gauean, ez itzali sutondoa, Amaiur. Sorginak lotan hegan egiten du: kontuz zure ametsekin.", "", 0, 41, 0],
        ["AMAIUR", "Akelarrea… Bat falta. Gero, Murumendira.", "", P.x, P.z, 0],
      ],
      () => {
        flagSet("irati-herensuge");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Sei txingar itzulita. Harana, Ortzia eta Zezen-harpea zureak dira. Akelarrea laster: ametsetan…"), "", 8);
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
