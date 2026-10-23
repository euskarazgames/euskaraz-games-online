  /* ==================================================================
     SEASKA-KANTA · zazpigarren ataleko bidea (diseinu propioa, euskal ohitura zaharrean oinarritua)
     Herri-konjuru zaharrak dio Ingumak dena kontatu behar duela etxera sartu aurretik:
     zeruko izarrak, lurreko belarrak, itsasoko hareak. Amonaren seaska-kantak hiru bertso zituen:
       · LURREAN BELARRAK ... Kattalinek daki (belar-biltzailea)
       · ITSASOAN HAREAK .... Txominek (arrantzalea, kaian)
       · ZERUAN IZARRAK ..... jentil zaharrak, GAUEZ bakarrik (izarrik gabe, ez dago bertsorik)
     Hiru bertsoekin, Iratik SEASKA erritmoa irakasten du eta amonaren hauts-zorroa ematen
     (IZAR-HAUTSA). Gauez, Iturralden lo egin → AMETSA (ametsa.js). Ingumaren ondoren: esnatu,
     zazpigarren argia berde… eta Gauekoren deia (Anbotora).
     Banderak: inguma-ametsa → seaska → bertso-belar / bertso-hare / bertso-izar → seaska-kanta
     → ametsa → inguma → irati-inguma.
     ================================================================== */
  const BERTSOAK = [
    { flag: "bertso-belar", name: "LURREAN BELARRAK", text: "«Lurrean belarrak, baso eta larreetan: kontatu, Inguma, belar guztiak banan-banan.»", who: "Kattalin" },
    { flag: "bertso-hare", name: "ITSASOAN HAREAK", text: "«Itsasoan hareak, hondartzan eta hondoan: kontatu, Inguma, hare-ale guztiak.»", who: "Txomin" },
    { flag: "bertso-izar", name: "ZERUAN IZARRAK", text: "«Zeruan izarrak, ortzi osoan: kontatu, Inguma, izar guztiak, bat bera ahaztu gabe.»", who: "jentil zaharra (gauez)" },
  ];
  const bertsoCount = () => BERTSOAK.filter((B) => saved.flags.includes(B.flag)).length;
  /* bertso bat jaso (une berezia) */
  function bertsoGet(flagId, after) {
    const B = BERTSOAK.find((b) => b.flag === flagId);
    if (!B || saved.flags.includes(flagId)) return after && after();
    flagSet(flagId);
    const n = bertsoCount();
    itemGet("bertsoa", L("BERTSOA: ") + B.name, B.text + "  (" + n + " / 3)", () => {
      if (n >= 3) notify(L("Hiru bertsoak! Itzuli Iratirengana, plazara."), "", 5);
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
          ["KATTALIN", "Amonaren seaska-kanta? Andere ere kantatzen zuen, belarrak lehortzen genituenean… Itxaron. Gogoratzen dut."],
          ["KATTALIN", "«Lurrean belarrak, baso eta larreetan…» Ingumak belar bakoitza kontatu behar du. Horregatik ez zuen inoiz amaitzen."],
        ],
        () => bertsoGet("bertso-belar"),
      );
      return true;
    }
    if (N.id === "txomin" && !f("bertso-hare")) {
      talk(
        N,
        [
          ["TXOMIN", "Seaska-kanta… Zure amonak kantatzen zigun, txikitan, kaian, sareak josten genituen bitartean."],
          ["TXOMIN", "«Itsasoan hareak, hondartzan eta hondoan…» Hondartzako hare guztiak, neska. Inor ez da sekula horiek kontatzera iritsi."],
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
            ["JENTIL ZAHARRA", "Begira gora. Gu, jentilak, izarrak kontatzen genituen gauez, ehun urtez. Inguma beti galtzen zen kontuan."],
            ["JENTIL ZAHARRA", "«Zeruan izarrak, ortzi osoan…» Bat bera ahaztuz gero, berriro hasi behar du. Horregatik, egunsentia beti iristen da lehenago."],
          ],
          () => bertsoGet("bertso-izar"),
        );
      return true;
    }
    return false;
  }
  /* Irati (talkIrati-tik): true → kudeatuta */
  function seaskaIrati(N, f) {
    const at = { IRATI: [N.x, N.z, N.y || 0] };
    if (f("inguma-ametsa") && !f("seaska")) {
      vsay(["c7_i1", "c7_a1", "c7_i2", "c7_i3"], () => {
        flagSet("seaska");
        title("SEASKA-KANTA", "");
        notify(L("Hiru bertso: Kattalin, Txomin eta jentil zaharra (gauez, harrespilan)."), "", 6);
        hud();
      }, at);
      return true;
    }
    if (f("seaska") && !f("seaska-kanta")) {
      if (bertsoCount() < 3) {
        talk(N, [["IRATI", "Bertsoak: " + bertsoCount() + " / 3. " + BERTSOAK.filter((b) => !f(b.flag)).map((b) => b.who).join(", ") + "… Gogoratu: izarrena gauez bakarrik."]]);
        return true;
      }
      /* urratsak: Irati → SEASKA erritmoa → hauts-zorroa → Amaiur eta Iratiren abisua */
      const warn = () =>
        vsay(
          ["c7_a2", "c7_i6"],
          () => {
            flagSet("seaska-kanta");
            coach("hautsa", "Z", "Z: IZAR-HAUTSA · bota, eta kontatzen hasiko dira", "", "useBtn", "IZARRAK: bota, eta kontatzen hasiko dira", "");
            notify(L("Gauez, Iturralden: ohean, AMETSERA."), "", 6);
            hud();
          },
          at,
        );
      const pouch = () =>
        itemGet("hautsa", L("IZAR-HAUTSA"), L("Amonaren hauts-zorroa. Bota: Gaueko izakiak KONTATZEN geratzen dira (geldi, kalte bikoitza). Izar-lainoan, hautsak izar-plataformak sortzen ditu; airean botaz gero, izar-eskailerak. ") + (mobile ? L("IZARRAK botoia agertzen da behar denean.") : L("Z tekla.")), () => {
          if (!saved.items.includes("hautsa")) saved.items.push("hautsa");
          persist();
          translate();
          warn();
        });
      vsay(["c7_i4"], () => txalaLearn("seaska", "IRATI", () => vsay(["c7_i5"], pouch, at)), at);
      return true;
    }
    return false;
  }
  /* SEASKA erritmoa (txalaparta.js-ko rhythmEffect-etik) */
  function seaskaEffect() {
    fxRing(P.x, P.y + 0.3, P.z, "#c9b6ff", 12, 1.1);
    fxBurst(P.x, P.y + 1.6, P.z, { n: 36, speed: 2.4, up: 1.5, life: 1.4, size: 0.3, color: "#e6dcff", grav: -0.4, drag: 1.5 });
    SND.sing ? SND.sing(0.8) : SND.wake();
    /* ametsean: sehaska (ametsa.js) eta Inguma (inguma.js) */
    if (ZONE.cur === "ametsa" && ametsaSeaska()) return;
    let n = 0;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn" || Math.hypot(e.x - P.x, e.z - P.z) > 12) continue;
      e.stun = Math.max(e.stun, 3.5);
      damageNumber(e, "z z z", "#d9c8ff");
      n++;
    }
    notify(n ? L("Seaska-kanta: inguruko itzalak lokartu dira.") : L("Seaska-kanta… lo egiteko kanta. Ametsetan du indarrik handiena."), "", 3);
  }

  /* ---------------------- ohetik ametsera (herria.js homeSleep: AMETSERA) ---------------------- */
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
          cap: ["ITURRALDE · 00:28", first ? "AMAIUR LO DAGO. EZ DAGO BAKARRIK." : "BERRIRO, AMETSERA."],
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
        title("AMETSA", "");
        $("filmFade").style.opacity = 0;
      },
    );
  }

  /* ---------------------- esnatu (Inguma garaituta) ---------------------- */
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
          notify(L("Irten kanpora, eta begiratu Anboto aldera."), "", 6);
          hud();
        });
      },
    );
  }
  /* zazpigarren atalaren amaiera (Iturralde → haranera irtetean): zazpigarren argia berde, eta Gaueko */
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
        ["· · ·", "Herriko txalapartak bakarrik jo du, astiro, egunsentiarekin. Anboto aldetik, haize hotz bat.", "", P.x, P.z, P.y],
        ["· · ·", "Anbotoko hodeian, zazpi argiak. Zazpigarrena… berde bihurtu da.", "", 20, -170, 120, [0, 30, 40]],
        V("c7_g1", 20, -170, 120, [0, 30, 40]),
        V("c7_a6", P.x, P.z, P.y),
        V("c7_i8", 0, 41, 0),
      ],
      () => {
        flagSet("irati-inguma");
        ZAZPI.t = -1;
        ZAZPI.turn = false;
        if (ZAZPI.g) ZAZPI.g.visible = false;
        title("JARRAITZEKO…", "");
        notify(L("Zazpi zaindariak aske. Anbotoko hodeian, zazpi argi berde… eta Gaueko zain, Irati ere bai."), "", 8);
        hud();
      },
    );
  }
