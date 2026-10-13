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
    return [saved.pieces.length < 8 ? "Harana zurea da. Arnasa-zatiak: " + saved.pieces.length + " · Ardiak: " + saved.sheep.length + "/3" : "Harana zurea da.", null];
  }
  function questCheck() {
    if (ready) hud();
  }
  /* --------------------------- hasiera eta amaiera --------------------------- */
  function introScene() {
    say(
      [
        ["· · ·", "Egunsentia Ibarran. Gau osoan, plazako txalapartak bakarrik jo du, inork ukitu gabe: tok, tok-tok.", "", 0, 30, 0],
        ["AMAIUR", "Berriro. Hirugarren gaua. Erritmo hori… ezagutzen dut, nonbaitetik.", "", P.x, P.z, 0],
        ["IRATI", "Amaiur. Plazara etorri. Nire ahotsa entzuten baduzu, oraindik ez da berandu.", "", 0, 41, 0],
      ],
      () => {
        flagSet("intro");
        notify(L("Plazara: Iratiren oihartzuna zain dago."), "", 5);
      },
    );
  }
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
        ["GAUEKO", "Txalapartak deitzen du, sorgin. Nik ere entzuten dut. Zazpi leize, zazpi zaindari… eta zu bakarrik.", "", P.x, P.z, 0],
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
  function mariUpdate(dt) {
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
