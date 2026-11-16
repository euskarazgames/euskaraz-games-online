  /* ==================================================================
     DENBORA · noiz alda daitekeen urtaroa (UDA ↔ NEGUA)
     Urtaroa aldatzea ez dago hasieratik: istorioaren bihurgunean irekitzen da (DENB.flag bandera,
     AMONAREN TXINGARRA, Tartaloren ondoren, Iturraldeko sutondoan: herria.js). Lehen ekitaldian
     (Basajaun, Lamia, Tartalo) Amaiur neguan bakarrik dago:
     · LAMIEN LEIZEAN, ura eta izotza: botoi berarekin, ura esnatu (UR BIZIA) edo izoztu (IZOTZA);
       leizearen bi egoerak, barruan bakarrik. Sarrera (ur-jauziko izotz-gortina): KATEArekin erauzi.
     · Urtaro bati lotutako etsaiak urtarorik gabe sortzen dira, eta etsai ertainen ezkutua ez da
       urtaroz aldatzen: itxi eta ireki egiten da (itxaron eta eraso).
     · Haranean eta beste leizeetan, NEGUA beti.
     Probetan: __game.DENB, eraOpen(), canPhase().
     ================================================================== */
  const DENB = { flag: "giroa" };
  const eraOpen = () => flag(DENB.flag);
  const eraComb = () => ZONE.cur === "lamia";
  const canPhase = () => eraOpen() || eraComb();
  /* zona aldatzean eta bandera/tresna berriekin: botoia, HUDa eta, behar bada, negura itzuli */
  function eraGate() {
    proLocks();
    if (!canPhase() && phase !== 1) {
      phase = 1;
      setPhaseVisual(true);
    }
  }
