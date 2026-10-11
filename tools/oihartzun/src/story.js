  /* ==================================================================
     GIDOIA · misterioak, bihurguneak eta zintzilik geratzen diren uneak
     · Egunkari-orriak: Amaiurren letra, begizta-zenbakiekin. Bi erronken
       saria dira; beste biak ezkutuan daude (herrian eta Orratzean).
     · Uharte bakoitzeko erronkaren ondoren, eszena labur bat: galdera bat
       zabalik uzten du hurrengo uhartera bultzatzeko.
     · Gauekoren maskara: azken bihurgunea (bossaren ondoren).
     ================================================================== */
  const JOURNAL = [
    [
      1,
      "«Gaur itsasoa gelditu da. Irratiak Iratiren ahotsa du, baina Irati duela zazpi urte joan zen. Bihar berriro saiatuko naiz.»",
      "«Hoy el mar se ha detenido. La radio tiene la voz de Irati, pero Irati se fue hace siete años. Mañana lo intentaré otra vez.»",
    ],
    [
      37,
      "«Gaur ere zubia hautsita zegoen. Kaxak pilatu ditut, beti bezala. Ez dut gogoratzen zenbatgarren aldia den. Hezurdurek nire izena dakite.»",
      "«Hoy el puente también estaba roto. He apilado las cajas, como siempre. No recuerdo cuántas veces van. Los esqueletos saben mi nombre.»",
    ],
    [
      112,
      "«Irratiko ahotsak gezurra dio. Irati ez zen itsasoak eraman. Kanpaia jo zuen egunean, nik…»\n\n(Orriaren gainerakoa urratuta dago.)",
      "«La voz de la radio miente. A Irati no se la llevó el mar. El día que tocó la campana, yo…»\n\n(El resto de la página está arrancado.)",
    ],
    [
      999,
      "«Gaur ez dut erlojua apurtuko. Gaur Gauekori maskara kenduko diot. Azpian dagoena ezagutzen dudala uste dut… eta beldur naiz.»",
      "«Hoy no romperé el reloj. Hoy le quitaré la máscara a Gaueko. Creo que conozco lo que hay debajo… y tengo miedo.»",
    ],
  ];
  const STORY = { pending: null, afterBoon: -1, pages: [] };
  const jName = (k) => L("EGUNKARIA · " + JOURNAL[k][0] + ". BEGIZTA", "DIARIO · BUCLE " + JOURNAL[k][0]);
  function journalShot(k, x, z, y) {
    return [jName(k), JOURNAL[k][1], JOURNAL[k][2], x, z, y];
  }
  function pageGot(k) {
    saved.pages = Array.isArray(saved.pages) ? saved.pages : [];
    if (!saved.pages.includes(k)) saved.pages.push(k);
    persist();
  }
  /* uharte bakoitzaren erronkaren ondoren */
  function storyScript(i) {
    const I = ISLANDS[Math.min(5, Math.max(0, i))];
    const at = (who, eu, es) => [who, eu, es, P.x, P.z, P.y];
    if (i === 0)
      return [
        at("IRATI · 140.85", "Hori da! Hezurrak itsasora itzuli dira. Amaiur, entzun: errotara bidean…", "¡Eso es! Los huesos vuelven al mar. Amaiur, escucha: de camino al molino…"),
        at("IRATI · 140.85", "…itxaron. Zure atzean. Nor dago zure atzean?", "…espera. Detrás de ti. ¿Quién está detrás de ti?"),
        at("AMAIUR", "Inor ez. Ez dago inor. Irati? Irati!", "Nadie. No hay nadie. ¿Irati? ¡Irati!"),
        at("· · ·", "Estatikoa. Eta, oso urrun, norbait barrez.", "Estática. Y, muy lejos, alguien que ríe."),
      ];
    if (i === 1) {
      pageGot(1);
      return [
        journalShot(1, P.x, P.z, P.y),
        at("AMAIUR", "Hau nire letra da. Baina nik ez dut hau idatzi… oraindik ez.", "Esta es mi letra. Pero yo no he escrito esto… todavía no."),
      ];
    }
    if (i === 2)
      return [
        at("GAUEKO · 000.00", "Hogeita hamazazpi aldiz apurtu dituzu nire zaindariak. Eta hogeita hamazazpi aldiz itzuli zara.", "Treinta y siete veces has roto a mis guardianes. Y treinta y siete veces has vuelto."),
        at("AMAIUR", "Nola dakizu nire izena?", "¿Cómo sabes mi nombre?"),
        at("GAUEKO · 000.00", "Hurrengo uhartean, egia erakutsiko dizut. Ez zaizu gustatuko.", "En la próxima isla te mostraré la verdad. No te va a gustar."),
      ];
    if (i === 3) {
      pageGot(2);
      return [
        journalShot(2, P.x, P.z, P.y),
        at("AMAIUR", "Norbaitek urratu du. Norbaitek ez du nahi nik amaiera irakurtzea.", "Alguien la ha arrancado. Alguien no quiere que lea el final."),
        at("IRATI · 140.85", "Amaiur… ez sinetsi orri horiek. Mesedez.", "Amaiur… no creas esas páginas. Por favor."),
      ];
    }
    if (i === 4)
      return [
        at("IRATI · 140.85", "Orratza igo behar duzu erlojura iristeko. Baina entzun: goian dagoena ez da Gaueko.", "Tienes que subir la Aguja para llegar al reloj. Pero escucha: lo que hay arriba no es Gaueko."),
        at("AMAIUR", "Orduan, nor da?", "Entonces, ¿quién es?"),
        at("IRATI · 140.85", "Galdetu zeure buruari zergatik ez diozun inoiz aurpegia ikusi.", "Pregúntate por qué nunca le has visto la cara."),
        ["· · ·", "Orratzaren hegaletan, hiru kanpai txiki esnatu dira. Erortzen bazara, azkenak gogoratuko zaitu.", "En las laderas de la Aguja despiertan tres campanas pequeñas. Si caes, la última te recordará.", -21.6, -141.8, 11.6],
      ];
    if (i === "twist")
      return [
        ["· · ·", "Maskara pitzatu eta erori da. Azpian, aurpegi bat dago: zurea.", "La máscara se agrieta y cae. Debajo hay un rostro: el tuyo.", 0, -179, BOSS_Y],
        ["AMAIUR", "Ni… ni naiz.", "Soy… soy yo.", 0, -173, BOSS_Y],
        ["GAUEKO · ITZALA", "Herria ito zen egunean, zuk geldiarazi zenuen denbora. Zure beldurretik jaio nintzen: zure itzala naiz.", "El día que se hundió el pueblo, tú detuviste el tiempo. Nací de tu miedo: soy tu sombra.", 0, -179, BOSS_Y],
        ["GAUEKO · ITZALA", "Begizta bakoitzean Iratiren ahotsa aldatu dut, zu itzul zintezen. Bakarrik ez geratzeko.", "En cada bucle cambié la voz de Irati para que volvieras. Para no quedarme sola.", 0, -179, BOSS_Y],
        ["IRATI · 140.85", "Amaiur. Hau ni naiz, benetan. Utzi joaten. Erlojua zure eskuetan dago.", "Amaiur. Esta soy yo, de verdad. Déjala ir. El reloj está en tus manos.", 0, -179, BOSS_Y],
      ];
    return null;
  }
  function storyQueue(i, boon, delay = 1.5) {
    STORY.pending = { i, boon, t: delay };
  }
  function storyUpdate(dt) {
    const S = STORY.pending;
    if (!S || cinematic || ENDING.on) return;
    S.t -= dt;
    if (S.t > 0) return;
    STORY.pending = null;
    saved.story = Array.isArray(saved.story) ? saved.story : [];
    const key = String(S.i);
    if (!saved.story.includes(key)) {
      const script = storyScript(S.i);
      if (script) {
        saved.story.push(key);
        persist();
        STORY.afterBoon = S.boon ? S.i : -1;
        scenes[7] = script;
        playScene(7);
        return;
      }
    }
    if (S.boon) offerBoon(S.i);
  }
  /* eszena amaitzean (endScene): saria eskaini, zain bazegoen */
  function storyAfterScene() {
    if (STORY.afterBoon < 0) return;
    const k = STORY.afterBoon;
    STORY.afterBoon = -1;
    setTimeout(() => offerBoon(k), 350);
  }
  /* --------------------------- egunkari-orri ezkutuak --------------------------- */
  function pageTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#efe2c4";
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#d9c49a";
    g.fillRect(0, 0, 128, 10);
    g.strokeStyle = "#5b4630";
    g.lineWidth = 2;
    for (let y = 30; y < 150; y += 14) {
      g.beginPath();
      g.moveTo(14, y);
      for (let x = 14; x < 114; x += 6) g.lineTo(x, y + Math.sin(x * 0.7 + y) * 1.5);
      g.stroke();
    }
    return new T.CanvasTexture(c);
  }
  function journalPickup(k, x, y, z) {
    const got = Array.isArray(saved.pages) && saved.pages.includes(k);
    const m = new T.Mesh(new T.PlaneGeometry(0.75, 0.95), new T.MeshBasicMaterial({ map: pageTexture(), side: T.DoubleSide, transparent: true }));
    m.position.set(x, y, z);
    scene.add(m);
    const g = glow(x, y, z, "#ffe9b0", 2.4);
    m.visible = g.visible = !got;
    return { k, x, y, z, m, g, got };
  }
  function journalUpdate(J, dt) {
    if (J.got) return;
    J.m.rotation.y += dt * 1.6;
    J.m.position.y = J.y + Math.sin(time * 2.2 + J.k) * 0.18;
    J.g.position.y = J.m.position.y;
    if (Math.hypot(P.x - J.x, P.z - J.z) < 1.4 && Math.abs(P.y + 1 - J.y) < 1.8) {
      J.got = true;
      J.m.visible = J.g.visible = false;
      pageGot(J.k);
      SND.memory();
      fxBurst(J.x, J.y, J.z, { n: 24, speed: 3, up: 2, life: 0.9, size: 0.3, color: "#ffe9b0", grav: -1 });
      dialog(jName(J.k), L("Orri bat, zure letraz.", "Una página, con tu letra."), L("Orri bat, zure letraz.", "Una página, con tu letra."), JOURNAL[J.k][1], JOURNAL[J.k][2], [[L("JARRAITU", "CONTINUAR"), () => {}]]);
    }
  }
