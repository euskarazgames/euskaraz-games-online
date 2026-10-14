  /* ==================================================================
     TXALAPARTA · jokoaren mekanika sinatua (oihartzuna)
     Bi makila: EZKERRA (◀) eta ESKUINA (▶). Espiritu batek erritmo bat jotzen du
     (deia) eta Amaiurrek errepikatu egiten du (erantzuna) → erritmoa ikasita.
     Ikasitako erritmoak edonon jo daitezke (B edo TXALAPARTA botoia):
       ESNATU  ◀ ◀ ▶   — jentil-harriak esnatzen ditu (eskailerak, ateak).
       ENTZUN  ▶ ◀ ▶ ▶ — oihartzun-uhina: ezkutuko plataformak eta kutxak agerian.
     Harri-danborrek (leizeetan) erritmo berriak eskatzen dituzte ateak irekitzeko.
     ================================================================== */
  const TXALA = { on: false, mode: null, spots: [], input: [], call: null, closeT: 0, personal: null, flash: [0, 0], reveal: 0 };
  const RHYTHMS = {
    esnatu: { seq: ["L", "L", "R"], name: "ESNATU", desc: "Jentil-harriak esnatzen ditu: eskailerak altxatu eta ate zaharrak ireki." },
    entzun: { seq: ["R", "L", "R", "R"], name: "ENTZUN", desc: "Oihartzun-uhin bat: ezkutuko bideak eta altxorrak une batez agerian." },
    eguzkilore: { seq: ["R", "R", "L", "L"], name: "EGUZKILORE", desc: "Eguzkiari dei: gauez egunsentia, egunez ilunabarra. Leizean, itzalak zorabiatzen ditu." },
    pottoka: { seq: ["L", "R", "L", "L"], name: "POTTOKA", desc: "Beltxari dei: haranean, Joanesen pottoka lauhazka etortzen da." },
  };
  const seqText = (seq) => seq.map((s) => (s === "L" ? "◀" : "▶")).join(" ");
  /* plazako txalaparta: bi asto, hiru ohol luze eta lau makila (diseinu propioa) */
  function txalapartaMesh(x, y, z, rot, area) {
    const g = new T.Group(),
      wood = material("#9c7148"),
      dark = material("#6a4a2e");
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) {
        const leg = obj(new T.CylinderGeometry(0.07, 0.08, 1.3, 6), dark, g);
        leg.position.set(s * 1.7, 0.6, k * 0.32);
        leg.rotation.x = k * 0.32;
      }
      const top = obj(new T.BoxGeometry(0.16, 0.12, 0.9), dark, g);
      top.position.set(s * 1.7, 1.2, 0);
    }
    const planks = [];
    for (let i = 0; i < 3; i++) {
      const p = obj(new T.BoxGeometry(4.4, 0.12, 0.26), wood, g);
      p.position.set(0, 1.33, (i - 1) * 0.3);
      planks.push(p);
    }
    for (let i = 0; i < 4; i++) {
      const st = obj(new T.CylinderGeometry(0.035, 0.045, 0.85, 5), material("#c9a27a"), g);
      st.position.set(-1.1 + i * 0.7, 0.45, 0.62);
      st.rotation.z = 0.5 - (i % 2);
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    (BP || scene).add(g);
    solids.push({ x, z, r: 1.3, h: 1.5, y, pillar: true });
    return { x, y, z, g, planks, area, group: BP };
  }
  /* Amaiurren txalaparta magikoa (jotzean bere aurrean agertzen da) */
  function personalTxala() {
    if (TXALA.personal) return TXALA.personal;
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: "#d9b07a", emissive: new T.Color("#ffd38a"), emissiveIntensity: 0.25, transparent: true, opacity: 0.85 });
    const planks = [-1, 1].map((s) => {
      const p = new T.Mesh(new T.BoxGeometry(1.25, 0.1, 0.24), mat.clone());
      p.position.set(s * 0.68, 1.15, 0.85);
      g.add(p);
      return p;
    });
    g.visible = false;
    hero.add(g);
    TXALA.personal = { g, planks };
    return TXALA.personal;
  }
  function txalaKnown() {
    return Object.keys(RHYTHMS).filter((k) => saved.rhythms.includes(k));
  }
  /* ---------------------------- ireki / itxi ---------------------------- */
  function txalaOpen() {
    if (!started || paused || cinematic || TXALA.on || CRAFT.on || GET.on || P.climb) return;
    if (!txalaKnown().length) {
      notify(L("Oraindik ez dakizu erritmorik. Pello eta Peiok irakatsiko dizute plazan."), "", 3.5);
      return;
    }
    txalaShow("free");
    $("txTitle").textContent = L("TXALAPARTA");
    $("txMsg").textContent = L("Jo ikasitako erritmo bat.");
    txalaSeqDots([], 0);
    coachDone("txala");
  }
  function txalaShow(mode) {
    TXALA.on = true;
    TXALA.mode = mode;
    TXALA.input = [];
    TXALA.closeT = 0;
    clearInput();
    $("txala").hidden = false;
    $("txKnown").innerHTML = txalaKnown()
      .map((k) => `<span><b>${RHYTHMS[k].name}</b>${seqText(RHYTHMS[k].seq)}</span>`)
      .join("");
    personalTxala().g.visible = true;
    animate("Idle");
  }
  function txalaClose() {
    if (!TXALA.on) return;
    TXALA.on = false;
    TXALA.call = null;
    $("txala").hidden = true;
    if (TXALA.personal) TXALA.personal.g.visible = false;
    accumulator = 0;
    clearInput();
  }
  /* ------------------------------- jotzea ------------------------------- */
  function txalaHit(side) {
    if (!TXALA.on || TXALA.closeT > 0) return;
    const C = TXALA.call;
    if (C && C.phase !== "answer") return;
    SND.tok(side);
    TXALA.flash[side === "L" ? 0 : 1] = 1;
    padFlash(side);
    fxRing(P.x + Math.sin(P.angle) * 0.85, P.y + 1.2, P.z + Math.cos(P.angle) * 0.85, side === "L" ? "#ffd38a" : "#bff6ff", 2.2 + TXALA.input.length * 0.4, 0.45);
    const now = time;
    if (C) {
      const want = C.seq[C.i];
      C.lastT = now;
      if (side === want) {
        C.i++;
        txalaSeqDots(C.seq, C.i, "ok");
        if (C.i >= C.seq.length) {
          $("txMsg").textContent = L("Oihartzun garbia!");
          TXALA.closeT = 0.001;
          C.success = true;
        }
      } else {
        $("txMsg").textContent = L("Ez da hori. Entzun berriro…");
        txalaSeqDots(C.seq, C.i, "bad");
        SND.hurt();
        C.phase = "wait";
        C.t = -0.9;
      }
      return;
    }
    /* librea: azken kolpeak ikasitako erritmo batekin bat badatoz → eragin */
    if (TXALA.input.length && now - TXALA.input[TXALA.input.length - 1].t > 1.6) TXALA.input = [];
    TXALA.input.push({ s: side, t: now });
    const seq = TXALA.input.map((b) => b.s);
    txalaSeqDots(seq.slice(-5), seq.slice(-5).length, "free");
    for (const k of txalaKnown()) {
      const R = RHYTHMS[k].seq;
      if (seq.length >= R.length && R.every((s, i) => seq[seq.length - R.length + i] === s)) {
        $("txMsg").textContent = RHYTHMS[k].name + "!";
        TXALA.closeT = 0.001;
        TXALA.fire = k;
        return;
      }
    }
  }
  /* deia (ikasi edo harri-danbor bati erantzun) */
  function txalaCall(seq, title, msg, onDone) {
    txalaShow("call");
    TXALA.call = { seq, onDone, phase: "listen", i: 0, t: -0.6, beat: 0 };
    $("txTitle").textContent = title;
    $("txMsg").textContent = msg || L("Entzun…");
    txalaSeqDots(seq, 0, "call");
  }
  function txalaLearn(id, teacher, after) {
    const R = RHYTHMS[id];
    txalaCall(R.seq, teacher, L("Entzun deia, eta errepikatu."), () => {
      if (!saved.rhythms.includes(id)) saved.rhythms.push(id);
      persist();
      itemGet("erritmoa", L("ERRITMO BERRIA: ") + R.name, R.desc + "  " + seqText(R.seq) + kb("  ·  B: txalaparta jo"), after);
    });
  }
  function txalaUpdate(dt) {
    for (const i of [0, 1]) TXALA.flash[i] = Math.max(0, TXALA.flash[i] - dt * 5);
    if (TXALA.personal && TXALA.personal.g.visible)
      TXALA.personal.planks.forEach((p, i) => {
        p.position.y = 1.15 - TXALA.flash[i] * 0.08;
        p.material.emissiveIntensity = 0.25 + TXALA.flash[i] * 1.4;
      });
    if (!TXALA.on) return;
    if (TXALA.closeT > 0) {
      TXALA.closeT += dt;
      if (TXALA.closeT > 0.55) {
        const C = TXALA.call,
          fire = TXALA.fire;
        TXALA.fire = null;
        txalaClose();
        if (C && C.success && C.onDone) C.onDone();
        if (fire) rhythmEffect(fire);
      }
      return;
    }
    const C = TXALA.call;
    if (!C) return;
    C.t += dt;
    if (C.phase === "wait" && C.t >= 0) {
      C.phase = "listen";
      C.i = 0;
      C.beat = 0;
      C.t = -0.2;
      $("txMsg").textContent = L("Entzun…");
      txalaSeqDots(C.seq, 0, "call");
    }
    if (C.phase === "listen" && C.t >= 0) {
      /* espirituaren kolpeak, 0.42 s-ro */
      if (C.t >= C.beat * 0.42 && C.beat < C.seq.length) {
        const s = C.seq[C.beat];
        SND.tok(s, true);
        padFlash(s);
        for (const sp of TXALA.spots) if (sp.group === ZONES[ZONE.cur].group && Math.hypot(sp.x - P.x, sp.z - P.z) < 16) sp.planks[s === "L" ? 0 : 2].position.y = 1.25;
        C.beat++;
        txalaSeqDots(C.seq, C.beat, "call");
      }
      if (C.t > C.seq.length * 0.42 + 0.5) {
        C.phase = "answer";
        C.i = 0;
        C.lastT = time;
        $("txMsg").textContent = L("Zure txanda! Errepikatu.");
        txalaSeqDots(C.seq, 0, "ok");
      }
    }
    if (C.phase === "answer" && C.i > 0 && time - C.lastT > 3) {
      $("txMsg").textContent = L("Berriro entzun…");
      C.phase = "wait";
      C.t = -0.3;
    }
    for (const sp of TXALA.spots) for (const pl of sp.planks) pl.position.y = mix(pl.position.y, 1.33, 1 - Math.exp(-dt * 10));
  }
  function padFlash(s) {
    const el = $(s === "L" ? "txL" : "txR");
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }
  function txalaSeqDots(seq, n, kind) {
    $("txSeq").innerHTML = seq
      .map((s, i) => `<i class="${i < n ? (kind === "bad" && i === n ? "bad" : kind === "call" ? "lit" : "ok") : ""} ${s === "L" ? "l" : "r"}">${s === "L" ? "◀" : "▶"}</i>`)
      .join("");
  }
  /* --------------------------- erritmoen eragina --------------------------- */
  function rhythmEffect(k) {
    if (k === "esnatu") {
      fxRing(P.x, P.y + 0.2, P.z, "#ffd38a", 14, 0.9);
      SND.wake();
      const n = (ZONE.cur === "ibarra" ? wakeStones(24) + dolmenWake() : 0) + (DGS[ZONE.cur] ? dungeonWake() : 0);
      if (!n) notify(L("Harriek lo jarraitzen dute. Ez dago ezer esnatzeko hemen."), "", 2.6);
    } else if (k === "entzun") echoPulse();
    else if (k === "eguzkilore") eguzkiloreEffect();
    else if (k === "pottoka") pottokaCall();
    hud();
  }
  /* ENTZUN: oihartzun-uhina — ezkutuko plataformak (s.hidden) eta kutxak agerian */
  function echoPulse() {
    TXALA.reveal = 15;
    TXALA.pulse = { t: 0 };
    SND.echoWave();
    shake(0.12);
    let found = 0;
    for (const s of platforms)
      if (s.hidden && Math.hypot(s.x - P.x, s.z - P.z) < 40) {
        s.revealed = true;
        found++;
      }
    for (const C of CHESTS)
      if (C.hidden && !C.m.visible && C.zoneGroup === ZONES[ZONE.cur].group && Math.hypot(C.x - P.x, C.z - P.z) < 30) {
        revealChest(C);
        found++;
      }
    notify(found ? L("Oihartzunak ezkutukoa erakutsi du!") : L("Oihartzuna itzuli da… ez dago ezer ezkutuan hemen."), "", 2.6);
  }
  function echoUpdate(dt) {
    const pu = TXALA.pulse;
    if (pu) {
      pu.t += dt;
      if (pu.t < 1.2 && Math.floor(pu.t * 10) !== Math.floor((pu.t - dt) * 10)) fxRing(P.x, P.y + 0.3, P.z, "#bff6ff", 4 + pu.t * 30, 0.5);
      if (pu.t > 1.2) TXALA.pulse = null;
    }
    if (TXALA.reveal > 0) {
      /* plataforma agerian baten gainean bazaude, ez desagertu */
      const onIt = P.platform && P.platform.hidden;
      TXALA.reveal = onIt ? Math.max(TXALA.reveal, 1.5) : TXALA.reveal - dt;
    }
    const k = clamp(TXALA.reveal / 2, 0, 1);
    for (const s of platforms) {
      if (!s.hidden) continue;
      const on = s.revealed && TXALA.reveal > 0;
      s.off = !on;
      if (s.m) {
        s.m.visible = on || k > 0;
        s.m.traverse((n) => n.material && n.material.opacity !== undefined && ((n.material.transparent = true), (n.material.opacity = on ? 0.55 + 0.45 * k + 0.1 * Math.sin(time * 6) : 0)));
      }
      if (TXALA.reveal <= 0) s.revealed = false;
    }
  }
  /* ukipen-botoiak eta teklatua */
  function bindTxala() {
    for (const [id, s] of [["txL", "L"], ["txR", "R"]]) {
      const el = $(id);
      el.onpointerdown = (e) => {
        e.preventDefault();
        txalaHit(s);
      };
    }
    $("txClose").onclick = () => txalaClose();
  }
