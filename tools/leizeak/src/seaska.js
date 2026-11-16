  /* ==================================================================
     LO-KANTA · zazpigarren ataleko bidea (diseinu propioa, euskal ohitura zaharretan oinarritua)
     Herri-sinesmenak dio sorginek eta izpiritu gaiztoek kontatu egin behar dutela: atean
     eguzkilorea badago, haren hortz guztiak; sarea zintzilik badago, haren begi guztiak. Sorgin
     zaharren lo-kantak hiru bertso ditu:
       · EGUZKILOREAREN HORTZAK ... Kattalinek daki (belar-biltzailea)
       · SAREAREN BEGIAK .......... Txominek (arrantzalea, kaian)
       · ORTZIKO IZARRAK .......... jentil zaharrak, GAUEZ bakarrik (izarrik gabe, ez dago bertsorik)
     Hiru bertsoekin, Atarrabik LO-KANTA erritmoa irakasten du eta sorgin-hautsa ematen
     (SORGIN-HAUTSA). Gauez, Iturralden lo egin → AKELARREA (ametsa.js). Akerbeltzen ondoren:
     esnatu, zazpigarren txingarra… eta Mikelatsek amona eraman du (Murumendira).
     Banderak: inguma-ametsa → seaska → bertso-belar / bertso-hare / bertso-izar → seaska-kanta
     → ametsa → inguma → irati-inguma.
     ================================================================== */
  const BERTSOAK = [
    { flag: "bertso-belar", name: "EGUZKILOREAREN HORTZAK", text: "«Atean eguzkilorea, hortz eta orratz: kontatu, Akerbeltz, hortz guztiak banan-banan.»", who: "Kattalin" },
    { flag: "bertso-hare", name: "SAREAREN BEGIAK", text: "«Arrantzalearen sarea, begi eta korapilo: kontatu, Akerbeltz, korapilo guztiak.»", who: "Txomin" },
    { flag: "bertso-izar", name: "ORTZIKO IZARRAK", text: "«Ortziko izarrak, bat eta mila: kontatu, Akerbeltz, egunsentia iritsi arte.»", who: "jentil zaharra (gauez)" },
  ];
  const bertsoCount = () => BERTSOAK.filter((B) => saved.flags.includes(B.flag)).length;
  /* bertso bat jaso (une berezia) */
  function bertsoGet(flagId, after) {
    const B = BERTSOAK.find((b) => b.flag === flagId);
    if (!B || saved.flags.includes(flagId)) return after && after();
    flagSet(flagId);
    const n = bertsoCount();
    itemGet("bertsoa", L("BERTSOA: ") + B.name, B.text + "  (" + n + " / 3)", () => {
      if (n >= 3) notify(L("Hiru bertsoak! Itzuli Atarrabirengana, plazara."), "", 5);
      else notify(L("Bertsoak: ") + n + " / 3 · " + BERTSOAK.filter((b) => !saved.flags.includes(b.flag)).map((b) => b.who).join(", "), "", 5);
      if (after) after();
    });
  }
  /* herritarren adarrak (talkKattalin / talkTxomin / talkJentil-etik): true → kudeatuta */
  function seaskaTalk(N, f) {
    if (!f("seaska") || f("seaska-kanta")) return false;
    if (N.id === "kattalin" && !f("bertso-belar")) {
      talk(
        N,
        [
          ["KATTALIN", "Sorgin zaharren lo-kanta? Zure amonak kantatzen zuen, belarrak lehortzen genituenean… Itxaron. Gogoratzen dut."],
          ["KATTALIN", "«Atean eguzkilorea, hortz eta orratz…» Sorginak hortz bakoitza kontatu behar du sartu aurretik. Horregatik ez zuen inoiz amaitzen."],
        ],
        () => bertsoGet("bertso-belar"),
      );
      return true;
    }
    if (N.id === "txomin" && !f("bertso-hare")) {
      talk(
        N,
        [
          ["TXOMIN", "Lo-kanta… Zure amonak kantatzen zigun, txikitan, kaian, sareak josten genituen bitartean."],
          ["TXOMIN", "«Arrantzalearen sarea, begi eta korapilo…» Sare zahar batek mila korapilo ditu, neska. Inor ez da sekula horiek kontatzera iritsi."],
        ],
        () => bertsoGet("bertso-hare"),
      );
      return true;
    }
    if (N.id === "jentil" && !f("bertso-izar")) {
      if (DAY.k < 0.5)
        talk(N, [["JENTIL ZAHARRA", "Izarren bertsoa? Gauez etorri, sorgin txikia. Izarrik gabe, ez dago bertsorik."]]);
      else
        talk(
          N,
          [
            ["JENTIL ZAHARRA", "Begira gora. Gu, jentilak, izarrak kontatzen genituen gauez, ehun urtez. Sorginak beti galtzen ziren kontuan."],
            ["JENTIL ZAHARRA", "«Ortziko izarrak, bat eta mila…» Bat bera ahaztuz gero, berriro hasi behar da. Horregatik, egunsentia beti iristen da lehenago."],
          ],
          () => bertsoGet("bertso-izar"),
        );
      return true;
    }
    return false;
  }
  /* Atarrabi (talkIrati-tik): true → kudeatuta */
  function seaskaIrati(N, f) {
    const at = { ATARRABI: [N.x, N.z, N.y || 0] };
    if (f("inguma-ametsa") && !f("seaska")) {
      vsay(["c7_i1", "c7_a1", "c7_i2", "c7_i3"], () => {
        flagSet("seaska");
        title("LO-KANTA", "");
        notify(L("Hiru bertso: Kattalin, Txomin eta jentil zaharra (gauez, harrespilan)."), "", 6);
        hud();
      }, at);
      return true;
    }
    if (f("seaska") && !f("seaska-kanta")) {
      if (bertsoCount() < 3) {
        talk(N, [["ATARRABI", "Bertsoak: " + bertsoCount() + " / 3. " + BERTSOAK.filter((b) => !f(b.flag)).map((b) => b.who).join(", ") + "… Gogoratu: izarrena gauez bakarrik."]]);
        return true;
      }
      /* urratsak: Atarrabi → LO-KANTA erritmoa → sorgin-hautsa → Amaiur eta Atarrabiren abisua */
      const warn = () =>
        vsay(
          ["c7_a2", "c7_i6"],
          () => {
            flagSet("seaska-kanta");
            coach("hautsa", "Z", "Z: SORGIN-HAUTSA · bota, eta kontatzen hasiko dira", "", "useBtn", "HAUTSA: bota, eta kontatzen hasiko dira", "");
            notify(L("Gauez, Iturralden: ohean, AKELARRERA."), "", 6);
            hud();
          },
          at,
        );
      const pouch = () =>
        itemGet("hautsa", L("SORGIN-HAUTSA"), L("Mariren leizeko hauts urrea. Bota: itzal-izakiak KONTATZEN geratzen dira (geldi, kalte bikoitza). Akelarreko lainoan, hautsak plataformak sortzen ditu; airean botaz gero, eskailerak. ") + (mobile ? L("HAUTSA botoia agertzen da behar denean.") : L("Z tekla.")), () => {
          if (!saved.items.includes("hautsa")) saved.items.push("hautsa");
          persist();
          translate();
          warn();
        });
      vsay(["c7_i4"], () => txalaLearn("seaska", "ATARRABI", () => vsay(["c7_i5"], pouch, at)), at);
      return true;
    }
    return false;
  }
  /* LO-KANTA erritmoa (txalaparta.js-ko rhythmEffect-etik; barne-IDa "seaska") */
  function seaskaEffect() {
    fxRing(P.x, P.y + 0.3, P.z, "#c9b6ff", 12, 1.1);
    fxBurst(P.x, P.y + 1.6, P.z, { n: 36, speed: 2.4, up: 1.5, life: 1.4, size: 0.3, color: "#e6dcff", grav: -0.4, drag: 1.5 });
    SND.sing ? SND.sing(0.8) : SND.wake();
    /* akelarrean: galdara (ametsa.js) eta Akerbeltz (inguma.js) */
    if (ZONE.cur === "ametsa" && ametsaSeaska()) return;
    /* Murumendin: Mikelats lokartu (anboto.js) */
    if (ZONE.cur === "anboto" && mikelatsLull()) return;
    let n = 0;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn" || Math.hypot(e.x - P.x, e.z - P.z) > 12) continue;
      e.stun = Math.max(e.stun, 3.5);
      damageNumber(e, "z z z", "#d9c8ff");
      n++;
    }
    notify(n ? L("Lo-kanta: inguruko itzalak lokartu dira.") : L("Lo-kanta… lo egiteko kanta. Akelarrean du indarrik handiena."), "", 3);
  }

  /* ---------------------- ohetik akelarrera (herria.js homeSleep: AKELARRERA) ---------------------- */
  const seaskaReady = () => saved.flags.includes("seaska-kanta") && !saved.flags.includes("inguma");
  function ametsaEnter() {
    saved.tod = 0.02;
    DAY.k = 1;
    DAY.night = true;
    const first = !saved.flags.includes("ametsa");
    film(
      [
        {
          d: 4.6,
          fade: "in",
          cap: ["ITURRALDE · 00:28", first ? "AMAIUR LO DAGO. HAREN ARIMA HEGAN DOA." : "BERRIRO, AKELARRERA."],
          on: () => {
            hero.position.set(DGE.bed.x, 0.84, DGE.bed.z + 1.15);
            if (actor) actor.rotation.x = -PI / 2;
            hero.rotation.y = 0;
          },
          cam: [() => [DGE.bed.x + 4.4, 4.2, DGE.bed.z + 4.8], () => [DGE.bed.x + 1.6, 2.6, DGE.bed.z + 2.4]],
          look: [() => [DGE.bed.x, 0.9, DGE.bed.z + 0.4], () => [DGE.bed.x, 0.9, DGE.bed.z]],
        },
        ...(first
          ? [
              {
                d: 4.4,
                fade: "out",
                cam: [() => [DGE.bed.x + 1.6, 2.6, DGE.bed.z + 2.4], () => [DGE.bed.x + 0.6, 7.5, DGE.bed.z + 1.2]],
                look: [() => [DGE.bed.x, 0.9, DGE.bed.z], () => [DGE.bed.x, 0.9, DGE.bed.z]],
                say: "c7_n1",
              },
            ]
          : []),
      ],
      () => {
        if (actor) actor.rotation.x = 0;
        flagSet("ametsa");
        enterZone("ametsa", { ...DGA.entry, cp: true }, true);
        title("AKELARREA", "");
        $("filmFade").style.opacity = 0;
      },
    );
  }

  /* ---------------------- esnatu (Akerbeltz garaituta) ---------------------- */
  function ametsaWake() {
    saved.tod = 0.27;
    DAY.k = nightOf(0.27);
    enterZone("etxea", { x: DGE.bed.x + 1.8, y: 0, z: DGE.bed.z, a: PI / 2, cp: true }, true);
    film(
      [
        {
          d: 4.2,
          fade: "in",
          cap: ["ITURRALDE · 06:28", "EGUNSENTIA"],
          on: () => {
            hero.position.set(DGE.bed.x, 0.84, DGE.bed.z + 1.15);
            if (actor) actor.rotation.x = -PI / 2;
            hero.rotation.y = 0;
          },
          cam: [() => [DGE.bed.x + 1.2, 6.5, DGE.bed.z + 1.6], () => [DGE.bed.x + 3.4, 3.2, DGE.bed.z + 3.8]],
          look: [() => [DGE.bed.x, 0.9, DGE.bed.z], () => [DGE.bed.x, 0.9, DGE.bed.z + 0.4]],
        },
      ],
      () => {
        if (actor) actor.rotation.x = 0;
        teleport(DGE.bed.x + 1.8, DGE.bed.z, 0);
        P.angle = PI / 2;
        flagSet("inguma");
        deia(["c7_i7"], () => {
          notify(L("Irten kanpora, eta begiratu Murumendi aldera."), "", 6);
          hud();
        });
      },
    );
  }
  /* zazpigarren atalaren amaiera (Iturralde → haranera irtetean): zazpigarren txingarra, eta Mikelatsek amona eraman du */
  function ingumaFinale() {
    const f = (k) => saved.flags.includes(k);
    if (!f("inguma") || f("irati-inguma") || ZONE.cur !== "ibarra" || cinematic || FILM.on) return;
    if (!ZAZPI.g) zazpiBuild();
    zazpiColors(6);
    ZAZPI.armed = true;
    ZAZPI.turn = true;
    ZAZPI.turnTo = 7;
    const V = (id, x, z, y, cam) => {
      const [who, text] = voiceLine(id);
      return [who, text, "", x, z, y, cam || null, id];
    };
    voicePreload(["c7_a5", "c7_g1", "c7_a6", "c7_i8"]);
    say(
      [
        V("c7_a5", P.x, P.z, P.y),
        ["· · ·", "Herriko txalapartak bakarrik jo du, astiro, egunsentiarekin. Murumendi aldetik, kazkabar-haize bat.", "", P.x, P.z, P.y],
        ["· · ·", "Murumendiko hodeian, zazpi argiak. Zazpigarrena… berde bihurtu da. Baina Iturraldeko tximiniak ez du kerik.", "", 20, -170, 120, [0, 30, 40]],
        V("c7_g1", 20, -170, 120, [0, 30, 40]),
        V("c7_a6", P.x, P.z, P.y),
        V("c7_i8", 0, 41, 0),
      ],
      () => {
        flagSet("irati-inguma");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        notify(L("Zazpi txingarrak itzulita. Baina Mikelatsek amona eraman du Murumendira: plazan, Atarrabi zain."), "", 8);
        hud();
        /* zazpigarren oroitzapena: bi anaiak (probetan, window.__oroit ezarrita bakarrik) */
        if (!saved.flags.includes("oroit-7") && (!OROIT_TEST || window.__oroit)) setTimeout(() => oroitPlay(6), 1200);
      },
    );
  }
