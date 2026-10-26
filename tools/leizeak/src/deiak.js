  /* ==================================================================
     OIHARTZUN-DEIAK · Iratiren ahotsa oihartzun-harritik
     Deia iristean: harria dardaraka, txalaparta-kolpe bigunak (◀ ◀ ▶, Iratiren "sinadura")
     eta HUDean "OIHARTZUN-DEIA". ERANTZUN (E, ekintza-botoia edo ukitu) → elkarrizketa
     deien larruazalarekin: erretratu biribila, uhina eta ahotsa. Erantzuten ez bada, segundo
     batzuen buruan bakarrik irekitzen da (istorioa ez da geratzen). Gauekok deia "zulatu"
     dezake: interferentzia, kolore gorria eta haren ahotsa.
     Edozein unetan, menuan: DEITU · IRATI → zer egin galdetu (helburuaren arabera).
     ================================================================== */
  const RING = { on: false, t: 0, k: 0, auto: 6, next: null, from: "", near: null };
  /* erantzun daiteke? (lehen deian, harriaren ondoan bakarrik) */
  const ringReach = () => !RING.near || Math.hypot(P.x - RING.near.x, P.z - RING.near.z) < RING.near.r;
  /* lerroak: ahots-id-ak ("pro_i1") edo [nor, testua] */
  function deiaShots(lines, at) {
    return lines.map((l) => {
      if (typeof l === "string") {
        const [who, text] = voiceLine(l),
          p = (at && at[who]) || [P.x, P.z, P.y];
        return [who, text, "", p[0], p[1], p[2], null, l];
      }
      const p = (at && at[l[0]]) || [P.x, P.z, P.y];
      return [l[0], l[1], "", p[0], p[1], p[2]];
    });
  }
  /* deia (larruazal berezia) zuzenean */
  function deia(lines, after) {
    const sh = deiaShots(lines);
    sh.call = true;
    voicePreload(lines.filter((l) => typeof l === "string"));
    say(sh, after);
  }
  /* elkarrizketa arrunta, ahotsekin (aurrez aurre): at = { IRATI: [x, z, y] } */
  function vsay(lines, after, at) {
    voicePreload(lines.filter((l) => typeof l === "string"));
    say(deiaShots(lines, at), after);
  }
  /* deia jotzen: erantzun arte (edo auto segundo) */
  function deiaRing(from, lines, after, auto = 6, near = null) {
    voicePreload(lines.filter((l) => typeof l === "string"));
    Object.assign(RING, { on: true, t: 0, k: 0, auto, from, near, next: () => deia(lines, after) });
    $("deiaFrom").textContent = from;
    $("deiaKey").textContent = mobile ? L("ERANTZUN") : L("ERANTZUN · E");
    $("deiaRing").hidden = false;
  }
  function deiaAnswer(force) {
    if (!RING.on || cinematic || FILM.on || (force !== true && !ringReach())) return;
    RING.on = false;
    $("deiaRing").hidden = true;
    SND.tok("R", false, 0.5);
    const f = RING.next;
    RING.next = null;
    if (f) f();
  }
  /* jokoaren tick-etik: tonua (txalaparta-kolpe bigunak) eta erantzun automatikoa */
  function deiaUpdate(dt) {
    if (!RING.on) return;
    RING.t += dt;
    RING.k -= dt;
    if (RING.k <= 0) {
      RING.k = 1.5;
      ["L", "L", "R"].forEach((s, i) => setTimeout(() => RING.on && SND.tok(s, true, 0.45), i * 190));
      haptic(20);
    }
    const reach = ringReach();
    $("deiaKey").textContent = reach ? (mobile ? L("ERANTZUN") : L("ERANTZUN · E")) : L("HURBILDU");
    /* borrokan ez da bakarrik irekitzen; luzaroan erantzun gabe: galdutako deia (menutik berreskuratu) */
    if (RING.t > RING.auto && !cinematic && !FILM.on && !GET.on && !TXALA.on && !ROOM.fight && !BOSS.on) deiaAnswer(true);
    else if (RING.t > 30) {
      RING.on = false;
      RING.missed = RING.next;
      RING.next = null;
      $("deiaRing").hidden = true;
      notify(L("Galdutako deia: menuan, DEITU · IRATI."), "", 3);
    }
  }
  /* uhina (ahotsaren analizatzailetik) deien kanbasean */
  function deiaWave(lv) {
    const cv = $("deiaWave");
    if (!cv || !VOICE.an) return;
    const g = cv.getContext("2d"),
      w = cv.width,
      h = cv.height,
      d = VOICE.data,
      intr = $("cinema").classList.contains("intrusion");
    g.clearRect(0, 0, w, h);
    g.strokeStyle = intr ? "#ff8a5a" : "#7fe3c9";
    g.lineWidth = 2;
    g.beginPath();
    const n = 96;
    for (let i = 0; i < n; i++) {
      const v = voicePlaying() ? (d[Math.floor((i / n) * d.length)] - 128) / 128 : 0,
        x = (i / (n - 1)) * w,
        y = h / 2 + v * h * 1.6 + (intr ? (Math.random() - 0.5) * 6 * lv : 0);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  /* menutik: DEITU · IRATI (zer egin) */
  function iratiCall() {
    if (!started || cinematic || FILM.on) return;
    if (RING.missed) {
      const f = RING.missed;
      RING.missed = null;
      return f();
    }
    const o = objective()[0] || "";
    const extra = [
      "Gogoratu: itzal bakoitza bere begien koloreko garaian zauritzen da.",
      "Ez ahaztu sutondoak: atseden hartu, eta handik jarraituko duzu.",
      "Txalapartak bi ahots ditu. Zuk erantzun, Amaiur.",
      "Harri-danborrak entzun: leizeek beren bidea kantatzen dute.",
    ][Math.floor(time) % 4];
    deia(["dei_i1", ["IRATI", o], ["IRATI", extra], "dei_i2"]);
  }
  /* ---- leize bakoitzaren lehen sarrera: Iratiren deia (behin) · kokapen-errotulua beti ---- */
  const ZONE_CALLS = {
    leizea: ["dz_leizea1", "dz_leizea2"],
    lamia: ["dz_lamia1", "dz_lamia2"],
    tartalo: ["dz_tartalo1", "dz_tartalo2", "dz_tartalo3"],
    jentil: ["dz_jentil1", "dz_jentil2"],
    zerua: ["dz_zerua1", "dz_zerua2"],
    herensuge: ["dz_herensuge1", "dz_herensuge2", "dz_herensuge3"],
  };
  const CALL_TEST = new URLSearchParams(location.search).has("test");
  function zoneEntered(id) {
    if (!FILM.on) locCaption(id);
    /* ANBOTOKO HARPEAK: zaindariak eta radarra (harpeak.js, sigiloa.js) */
    harpeakEntered(id);
    /* zaindari bat askatu ondoren, haranean: haren oroitzapena (oroitzapenak.js) */
    oroitCheck(id);
    /* Inguma garaituta: etxetik irtetean, zazpigarren argia (seaska.js) */
    if (id === "ibarra" && saved.flags.includes("inguma") && !saved.flags.includes("irati-inguma")) setTimeout(ingumaFinale, 1400);
    const lines = ZONE_CALLS[id];
    /* probetan (?test) deirik ez, eskatu ezean (window.__calls): botak ez eteteko */
    if (!lines || PRO.on || saved.flags.includes("deia-" + id) || (CALL_TEST && !window.__calls)) return;
    saved.flags.push("deia-" + id);
    persist();
    setTimeout(() => ZONE.cur === id && !RING.on && deiaRing("IRATI", lines, null, 7), 2200);
  }
  /* kokapen-errotulua (goian eskuinean, makinaz): "BASAJAUNEN LEIZEA" / "07:12 · IRAGANA" */
  let locTimer = 0;
  function locCaption(id) {
    const Z = ZONES[id];
    if (!Z) return;
    const t = ((saved.tod ?? 0.35) * 24 + 24) % 24,
      hh = String(Math.floor(t)).padStart(2, "0"),
      mm = String(Math.floor((t % 1) * 60)).padStart(2, "0"),
      full = Z.name + "\n" + hh + ":" + mm + " · " + (phase ? "ORAINA" : "IRAGANA"),
      el = $("locCap");
    clearInterval(locTimer);
    el.classList.remove("out");
    el.hidden = false;
    let n = 0;
    locTimer = setInterval(() => {
      n++;
      el.textContent = full.slice(0, n) + (n < full.length ? "▌" : "");
      if (n >= full.length) {
        clearInterval(locTimer);
        locTimer = setTimeout(() => el.classList.add("out"), 3600);
      }
    }, 34);
  }
