  /* ==================================================================
     DENBORA · noiz alda daitekeen garaia
     Garaia aldatzea ez dago hasieratik: istorioaren bihurgunean irekitzen da (DENB.flag bandera,
     kaiko kanpaian). Lehen ekitaldian (Basajaun, Lamia, Tartalo) Amaiur orainean bakarrik dago:
     · LAMIEN LEIZEAN, ura eta izotza: botoi berarekin, ura esnatu (UR BIZIA) edo izoztu (IZOTZA);
       leizearen bi egoerak, barruan bakarrik. Sarrera (ur-jauziko izotz-gortina): KATEArekin erauzi.
     · Garai bati lotutako etsaiak garairik gabe sortzen dira, eta etsai ertainen ezkutua ez da
       garaiz aldatzen: itxi eta ireki egiten da (itxaron eta eraso).
     · Haranean eta beste leizeetan, ORAINA beti.
     Probetan: __game.DENB, eraOpen(), canPhase().
     ================================================================== */
  const DENB = { flag: "giroa" };
  const eraOpen = () => flag(DENB.flag);
  const eraComb = () => ZONE.cur === "lamia";
  const canPhase = () => eraOpen() || eraComb();
  /* zona aldatzean eta bandera/tresna berriekin: botoia, HUDa eta, behar bada, orainera itzuli */
  function eraGate() {
    proLocks();
    if (!canPhase() && phase !== 1) {
      phase = 1;
      setPhaseVisual(true);
    }
  }
