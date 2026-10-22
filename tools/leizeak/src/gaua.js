  /* ==================================================================
     EGUNA ETA GAUA · "Gaua gauekoentzat, eguna egunekoentzat"
     · Haranean denbora ibiltzen da Basajaun askatu ondoren (Gauekok txalaparta entzun du):
       eguna ~5 min, gaua ~2.5 min. Leizeetan ez: han ez dago eguzkirik.
     · Gauez: izarrak eta ilargia, leihoetako eta faroletako argiak, Amaiurren kriseilua;
       herritarrak etxera (Irati, Kattalin eta Txomin ez); plazako txalapartak bakarrik jotzen du.
     · Gauekoren itzalak zelaietan (herrira ez dira sartzen); egunsentian hautsi egiten dira.
     · ARIMA-ARGIAK: gauez bakarrik, haranean barreiatuta; Kattalinek argizaiolak pizten ditu.
     · EGUZKILORE erritmoa (Kattalinek irakatsia, eguzkilorea ekarri ondoren): hurrengo
       egunsentira edo ilunabarrera; leizean, inguruko itzalak zorabiatzen ditu.
     ================================================================== */
  const DAY = { k: 0, tw: 0, skip: -1, night: false, freeze: false, foeT: 5, ghostT: 0, ghostI: 0, ghostSeq: 0, halo: null, glass: null, flower: null, wisps: [], amb: {} };
  const DAY_RATE = [1 / 600, 1 / 300]; /* [eguna, gaua]: tod unitateak segundoko */
  const isDayT = (t) => t > 0.25 && t < 0.75;
  function nightOf(t) {
    if (t < 0.5) return 1 - smooth01(clamp((t - 0.205) / 0.09, 0, 1));
    return smooth01(clamp((t - 0.705) / 0.09, 0, 1));
  }
  const clockRuns = () => saved.flags.includes("cliff") && !DAY.freeze;
  const MOON_COL = new T.Color("#8ea6dc"),
    DUSK_COL = new T.Color("#ff9a62"),
    FOG_NIGHT = new T.Color("#0d1422"),
    FOG_DUSK = new T.Color("#c07a66"),
    AMB_DAY = new T.Color("#c8dfe8"),
    AMB_NIGHT = new T.Color("#4b5f94"),
    GND_DAY = new T.Color("#3a4960"),
    GND_NIGHT = new T.Color("#121827");
  /* herritarren etxeak (gauez hara joaten dira) */
  const NIGHT_HOME = { pello: [14.4, 24.6], peio: [15.6, 25.4], maddi: [23.4, 41.8], joanes: [-36.2, 19.2], maite: [-10.2, 52.2], mikel: [-24, 48.4] };
  /* haraneko farolak (gauez piztuta) */
  const LAMPS = [[-8.2, 33.2], [8.4, 33.6], [-9.6, 44.6], [9.8, 45.2], [3.6, 18.5], [-1.6, 4.5], [2.6, -9], [-4.4, 59.6], [-15.6, 25.8], [19.2, 37.4]];
  /* arima-argiak: gauez bakarrik (hamar) */
  const WISP_DEFS = [
    { id: "harrespila", x: 52, z: -70 },
    { id: "basoa", x: -20, z: -104 },
    { id: "basoa2", x: 4, z: -118 },
    { id: "arroila", x: 70, z: -20 },
    { id: "urjauzia", x: 88, z: -20 },
    { id: "zuloa", x: -86, z: -18 },
    { id: "mendebaldea", x: -60, z: 10 },
    { id: "ekialdea", x: 60, z: 15 },
    { id: "kaia", x: 8, z: 82 },
    { id: "lepoa", x: -76, z: -118 },
  ];
  const EGUZKILORE_AT = { x: 40, z: -56 };
  /* lurraren gainazala (plataformak barne) */
  function nightGround(x, z, yRef) {
    const s = support(x, z, yRef + 1.2);
    return s ? topY(s, x, z) : gy(x, z);
  }
  /* herritik eta portutik kanpo: Gaueko ez da txalapartak jotzen duen tokira sartzen */
  const nightWild = (x, z) => Math.hypot(x, z - 38) > 40 && z < 58;

  /* ------------------------------ eraikitzea ------------------------------ */
  function gauaInit() {
    zoneBuild("ibarra");
    if (typeof saved.tod !== "number") saved.tod = 0.35;
    if (!saved.arimak) saved.arimak = [];
    DAY.k = nightOf(saved.tod);
    DAY.night = DAY.k > 0.5;
    nightWindows();
    nightLamps();
    /* eguzkilorea: harrespilan, iraganean eta egunez */
    const fy = nightGround(EGUZKILORE_AT.x, EGUZKILORE_AT.z, 20);
    DAY.flower = eguzkiloreMesh();
    DAY.flower.position.set(EGUZKILORE_AT.x, fy + 0.05, EGUZKILORE_AT.z);
    DAY.flower.visible = false;
    BP.add(DAY.flower);
    DAY.flowerY = fy;
    /* arima-argiak */
    for (const D of WISP_DEFS) {
      const y = nightGround(D.x, D.z, 30),
        g = new T.Group(),
        halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#9fd8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, fog: false })),
        core = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffffff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, fog: false }));
      halo.scale.setScalar(2.6);
      core.scale.setScalar(0.7);
      g.add(halo, core);
      g.visible = false;
      BP.add(g);
      DAY.wisps.push({ ...D, y, g, halo, core, ox: D.x, oz: D.z, a: Math.random() * TAU, got: saved.arimak.includes(D.id) });
    }
  }
  /* eguzkilorea (Carlina acaulis): lurrean zabaldutako eguzki zilarra */
  function eguzkiloreMesh() {
    const g = new T.Group(),
      parts = [[at(new T.CylinderGeometry(0.2, 0.22, 0.08, 16), 0, 0.12, 0), "#d9a441"]];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      parts.push([at(new T.BoxGeometry(0.06, 0.02, 0.32), Math.sin(a) * 0.32, 0.11, Math.cos(a) * 0.32, -0.12, a, 0), "#efe9d8"]);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.2;
      parts.push([at(new T.ConeGeometry(0.09, 0.62, 4), Math.sin(a) * 0.48, 0.04, Math.cos(a) * 0.48, PI / 2, 0, -a), "#5f7a4a"]);
    }
    g.add(new T.Mesh(mergeColored(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: new T.Color("#3a3220"), emissiveIntensity: 0.4 })));
    const glowS = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffe9a8", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    glowS.scale.setScalar(2.2);
    glowS.position.y = 0.4;
    g.add(glowS);
    g.scale.setScalar(1.4);
    return g;
  }
  /* leihoetako argiak: etxe bakoitzaren fatxadetan (kaxa biratuaren arabera), argi-hodei epelak */
  function nightWindows() {
    const halos = [],
      dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const H of HOUSES) {
      if (!H.m || H === HUB.andere) continue;
      const rot = H.m.rotation.y;
      H.m.rotation.y = 0;
      H.m.updateMatrixWorld(true);
      const bb = new T.Box3().setFromObject(H.m);
      H.m.rotation.y = rot;
      H.m.updateMatrixWorld(true);
      const cx = H.m.position.x,
        cz = H.m.position.z,
        hw = ((bb.max.x - bb.min.x) / 2) * 0.86,
        hd = ((bb.max.z - bb.min.z) / 2) * 0.86,
        h = bb.max.y - bb.min.y,
        ox = (bb.min.x + bb.max.x) / 2 - cx,
        oz = (bb.min.z + bb.max.z) / 2 - cz,
        c = Math.cos(rot),
        s = Math.sin(rot);
      for (const [k, [dx, dz]] of dirs.entries())
        for (const off of [-0.3, 0.3]) {
          if ((k * 2 + (off > 0 ? 1 : 0) + Math.round(cx * 3)) % 3 === 0) continue; /* ez leiho guztiak piztuta */
          const lx = ox + (dz ? off * 2 * hw : dx * (hw + 0.35)),
            lz = oz + (dx ? off * 2 * hd : dz * (hd + 0.35));
          halos.push(cx + lx * c + lz * s, bb.min.y + h * 0.3, cz - lx * s + lz * c);
        }
    }
    if (halos.length) DAY.halo = haloPoints(halos, 3.4);
  }
  /* argi-hodei bigunak (Points bakarra) */
  function haloPoints(arr, size) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(arr, 3));
    const p = new T.Points(g, new T.PointsMaterial({ map: glowTexture, color: "#ffc27a", size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    p.visible = false;
    p.frustumCulled = false;
    BP.add(p);
    return p;
  }
  /* farolak: burdinazko zutoina eta beira (gauez distiratsu) */
  function nightLamps() {
    const posts = [],
      glass = [],
      halos = [];
    for (const [x, z] of LAMPS) {
      const y = nightGround(x, z, 20);
      posts.push(at(new T.CylinderGeometry(0.07, 0.09, 2.8, 6), x, y + 1.4, z));
      posts.push(at(new T.BoxGeometry(0.5, 0.06, 0.06), x + 0.2, y + 2.75, z));
      posts.push(at(new T.ConeGeometry(0.26, 0.2, 4), x + 0.42, y + 2.8, z, 0, PI / 4));
      glass.push(at(new T.BoxGeometry(0.26, 0.34, 0.26), x + 0.42, y + 2.52, z));
      halos.push(x + 0.42, y + 2.5, z);
      solids.push({ x, z, r: 0.22, h: 3, y, pillar: true });
    }
    const pm = new T.Mesh(mergeGeos(posts), material("#2c2a28", 0.05));
    pm.castShadow = true;
    BP.add(pm);
    DAY.glass = new T.Mesh(mergeGeos(glass), new T.MeshStandardMaterial({ color: "#4a3a22", emissive: new T.Color("#ffbf66"), emissiveIntensity: 0.05, roughness: 0.4 }));
    BP.add(DAY.glass);
    DAY.lampHalo = haloPoints(halos, 5.2);
  }

  /* ------------------------------ ikusmena ------------------------------ */
  /* eraVisuals-etik (kanpoan): argia, lainoa, zerua eta itsasoa gauerako */
  function dayVisuals() {
    const k = DAY.k,
      tw = DAY.tw;
    sun.color.lerp(DUSK_COL, tw * 0.55).lerp(MOON_COL, k);
    sun.intensity *= mix(1, 0.16, k) * (1 - tw * 0.2);
    ambient.intensity *= mix(1, 0.3, k);
    ambient.color.copy(AMB_DAY).lerp(AMB_NIGHT, k);
    ambient.groundColor.copy(GND_DAY).lerp(GND_NIGHT, k);
    scene.fog.color.lerp(FOG_DUSK, tw * 0.3).lerp(FOG_NIGHT, k);
    scene.fog.near = mix(130, 60, k);
    scene.fog.far = mix(560, 400, k);
    const su = sky.material.uniforms;
    if (su.uNight) {
      su.uNight.value = k;
      su.uTw.value = tw;
    }
    if (sea.material.uniforms.uNight) sea.material.uniforms.uNight.value = k;
    playerLight.intensity = 2.1 * smooth01(clamp((k - 0.3) / 0.45, 0, 1));
    for (const b of birds) b.visible = k < 0.6;
    const lit = smooth01(clamp((k - 0.25) / 0.5, 0, 1));
    if (DAY.halo) {
      DAY.halo.visible = lit > 0.01;
      DAY.halo.material.opacity = lit * 0.7;
    }
    if (DAY.glass) {
      DAY.glass.material.emissiveIntensity = 0.05 + lit * 2.4;
      DAY.lampHalo.visible = lit > 0.01;
      DAY.lampHalo.material.opacity = lit * (0.75 + Math.sin(time * 7) * 0.04);
    }
  }
  function phaseLabel() {
    const night = ZONES[ZONE.cur] && ZONES[ZONE.cur].outdoor && DAY.k > 0.5;
    $("phaseName").textContent = (night ? "☾ " : "") + (phase ? L("ORAINA", "PRESENTE") : L("IRAGANA", "PASADO")) + kb(" · Q");
  }

  /* ------------------------------ erlojua ------------------------------ */
  /* hubUpdate-tik (haranean bakarrik) */
  function dayClock(dt) {
    if (typeof saved.tod !== "number") saved.tod = 0.35;
    if (DAY.skip >= 0) {
      const rem = (DAY.skip - saved.tod + 1) % 1,
        step = Math.min(rem, dt * 0.24);
      saved.tod = (saved.tod + step) % 1;
      if (rem - step < 1e-4) {
        saved.tod = DAY.skip;
        DAY.skip = -1;
        persist();
      }
    } else if (clockRuns() && started && !paused && !TXALA.on && !GET.on) saved.tod = (saved.tod + dt * DAY_RATE[isDayT(saved.tod) ? 0 : 1]) % 1;
    DAY.k = nightOf(saved.tod);
    DAY.tw = 4 * DAY.k * (1 - DAY.k);
    const night = DAY.k > 0.5;
    if (night !== DAY.night) {
      DAY.night = night;
      phaseLabel();
      if (night) onNightfall();
      else onDawn();
    }
    nightFoes(dt);
    wispsUpdate(dt);
    flowerUpdate(dt);
    ghostTxala(dt);
    nightAmbience(dt);
  }
  function onNightfall() {
    if (!clockRuns()) return;
    if (!saved.flags.includes("gaua")) {
      flagSet("gaua");
      title("GAUA", "");
      notify(L("Gaua iritsi da Ibarrara. Gauekoren itzalak zelaietan dabiltza… Kattalin atarian zain dago, kriseiluarekin."), "", 7);
    } else notify(L("Gaua. Gaua gauekoentzat… herritarrak etxera doaz."), "", 3);
    SND.owl();
  }
  function onDawn() {
    let n = 0;
    for (const e of ENEMIES)
      if (e.night && e.state !== "dead") {
        e.dawn = true;
        killEnemy(e);
        n++;
      }
    if (clockRuns()) notify(n ? L("Egunsentia: itzalak hauts bihurtu dira.") : L("Egunsentia Ibarran."), "", 2.6);
  }
  /* EGUZKILORE erritmoa (txalaparta.js-ko rhythmEffect-etik) */
  function eguzkiloreEffect() {
    fxRing(P.x, P.y + 0.3, P.z, "#ffe9a8", 12, 0.9);
    fxBurst(P.x, P.y + 1.4, P.z, { n: 40, speed: 5, up: 2, life: 0.9, size: 0.35, color: "#ffe2a0", grav: -1 });
    SND.wake();
    let n = 0;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn" || Math.hypot(e.x - P.x, e.z - P.z) > 12) continue;
      e.stun = Math.max(e.stun, 2.6);
      n++;
      if (e.night) hitEnemy(e, 2, (e.x - P.x) / 12, (e.z - P.z) / 12);
    }
    if (ZONE.cur !== "ibarra") return notify(n ? L("Eguzkiloreak itzalak zorabiatu ditu!") : L("Leizean ez dago eguzkirik… baina eguzkiloreak itzalak uxatzen ditu."), "", 3);
    if (!clockRuns()) return notify(L("Eguzkia bere bidean dago oraindik."), "", 2.5);
    const toDawn = DAY.k > 0.5;
    DAY.skip = toDawn ? 0.3 : 0.8;
    title(toDawn ? "EGUNSENTIA" : "ILUNABARRA", "");
    notify(toDawn ? L("Eguzkilorea: gaua igaro da.") : L("Eguzkilorea: eguzkia sartu da. Gaua dator."), "", 3);
  }

  /* ------------------------------ herritarrak gauez ------------------------------ */
  /* npcsUpdate-tik: true → NPCa hemen kudeatuta (etxera bidean edo etxean) */
  function npcNight(N, dt) {
    /* hitzaurrean (gaua, Gauekoren begiak): herritar guztiak etxean; egunsentian itzultzen dira */
    if (PRO.hideNpc) {
      if (!N.away) {
        Object.assign(N, { away: true, proHid: true, walking: false });
        N.g.visible = false;
        if (N.solid) N.solid.r = 0;
      }
      return true;
    }
    if (N.proHid) {
      N.proHid = false;
      if (!NIGHT_HOME[N.id]) {
        N.away = false;
        N.g.visible = true;
        if (N.solid) N.solid.r = 0.6;
      }
    }
    const H = NIGHT_HOME[N.id];
    if (!H) return false;
    if (DAY.k > 0.55 && clockRuns()) {
      if (N.away) return true;
      return npcWalkTo(N, H[0], H[1], dt, () => {
        N.away = true;
        N.g.visible = false;
        if (N.solid) N.solid.r = 0;
      });
    }
    if (N.away) {
      N.away = false;
      N.back = true;
      N.g.visible = true;
      if (N.solid) N.solid.r = 0.6;
      Object.assign(N, { x: H[0], z: H[1], walking: false, wait: 1 });
      N.y = gy(N.x, N.z);
      N.g.position.set(N.x, N.y, N.z);
    }
    if (N.back) return npcWalkTo(N, N.hx, N.hz, dt, () => (N.back = false));
    return false;
  }
  function npcWalkTo(N, tx, tz, dt, done) {
    const dx = tx - N.x,
      dz = tz - N.z,
      dd = Math.hypot(dx, dz);
    if (dd < 0.3) {
      npcAnim(N, "Idle");
      N.walking = false;
      done();
      return true;
    }
    const sp = 2.1;
    N.x += (dx / dd) * Math.min(dd, sp * dt);
    N.z += (dz / dd) * Math.min(dd, sp * dt);
    N.y = gy(N.x, N.z);
    N.g.position.set(N.x, N.y, N.z);
    N.a = Math.atan2(dx, dz);
    N.g.rotation.y += Math.atan2(Math.sin(N.a - N.g.rotation.y), Math.cos(N.a - N.g.rotation.y)) * Math.min(1, dt * 8);
    if (!N.walking) npcAnim(N, "Walking_A");
    N.walking = true;
    if (N.solid) {
      N.solid.x = N.x;
      N.solid.z = N.z;
    }
    return true;
  }
  /* partida gauez kargatzean: herritarrak zuzenean etxean */
  function npcsNightStart() {
    if (!(DAY.k > 0.55 && clockRuns())) return;
    for (const N of NPCS) {
      const H = NIGHT_HOME[N.id];
      if (!H) continue;
      Object.assign(N, { x: H[0], z: H[1], away: true });
      N.g.visible = false;
      if (N.solid) N.solid.r = 0;
    }
  }
  /* plazako txalaparta: gauez, bikiak etxean daudela, bakarrik jotzen du (oihartzun urdinak) */
  const GHOST_SEQ = [["L", "L", "R"], ["R", "L", "R", "R"], ["L", "R", "L", "R", "R"]];
  function ghostTxala(dt) {
    const sp = TXALA.spots[0];
    if (!sp) return;
    for (const pl of sp.planks) pl.position.y = mix(pl.position.y, 1.33, 1 - Math.exp(-dt * 10));
    const on = ((DAY.k > 0.6 && clockRuns()) || PRO.ghost) && !TXALA.on;
    ghostSticks(sp, dt, on);
    if (!on) return;
    DAY.ghostT -= dt;
    if (DAY.ghostT > 0) return;
    const seq = GHOST_SEQ[DAY.ghostSeq % GHOST_SEQ.length];
    if (DAY.ghostI >= seq.length) {
      DAY.ghostI = 0;
      DAY.ghostSeq++;
      DAY.ghostT = 2.6;
      return;
    }
    const s = seq[DAY.ghostI++];
    DAY.ghostT = 0.42;
    const pl = sp.planks[s === "L" ? 0 : 2];
    pl.position.y = 1.25;
    const d = Math.hypot(P.x - sp.x, P.z - sp.z);
    fxBurst(sp.x + (s === "L" ? -1.2 : 1.2), 1.5, sp.z, { n: 6, speed: 1.2, up: 1.5, life: 0.8, size: 0.2, color: "#9fd8ff", grav: -0.5 });
    if (d < 32 && !cinematic) SND.tok(s, true, clamp(1 - d / 32, 0, 1) * 0.5);
  }

  /* makila fantasmak: oholen bi aldeetan (L eta R), kolpe bakoitzean behera eta distira */
  function ghostSticks(sp, dt, on) {
    if (!sp.ghost) {
      sp.ghost = [-1, 1].map((s) => {
        const pv = new T.Group(),
          mat = new T.MeshBasicMaterial({ color: "#bff6ff", transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }),
          st = new T.Mesh(new T.CylinderGeometry(0.035, 0.055, 1.1, 6), mat),
          halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#9fd8ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
        /* eskua (pv) oholen alboan; makila erdirantz */
        st.rotation.x = PI / 2;
        st.position.z = -s * 0.55;
        halo.position.z = -s * 1.08;
        halo.scale.setScalar(0.9);
        pv.add(st, halo);
        pv.position.set(0, 1.65, s * 1.25);
        sp.g.add(pv);
        return { pv, mat, halo, s, k: 0 };
      });
    }
    for (const G of sp.ghost) {
      const pl = sp.planks[G.s < 0 ? 0 : 2],
        hit = pl.position.y < 1.29;
      G.k = mix(G.k, on ? 1 : 0, 1 - Math.exp(-dt * 3));
      G.mat.opacity = 0.75 * G.k;
      G.halo.material.opacity = (hit ? 0.9 : 0.35) * G.k;
      G.pv.visible = G.k > 0.01;
      /* atsedenean punta gora; kolpean, oholaren gainera */
      const a = hit ? -G.s * 0.25 : G.s * 0.9;
      G.pv.rotation.x = mix(G.pv.rotation.x, a, 1 - Math.exp(-dt * (hit ? 40 : 7)));
      G.pv.position.y = 1.65 + Math.sin(time * 2 + G.s) * 0.04;
    }
  }
  /* ------------------------------ Gauekoren itzalak ------------------------------ */
  function nightFoes(dt) {
    for (const e of ENEMIES) {
      if (!e.night) continue;
      if (e.state === "dead") {
        if (!e.looted) {
          e.looted = true;
          if (!e.dawn) dropLoot(e.x, e.y, e.z, 2);
        }
        continue;
      }
      /* urrunegi: desagertu (ez dira betiko atzetik ibiltzen) */
      if (Math.hypot(e.x - P.x, e.z - P.z) > 48) {
        e.state = "dead";
        e.looted = e.dawn = true;
        e.t = 9;
        e.g.visible = e.aura.visible = e.bar.visible = false;
      }
    }
    if (!(DAY.k > 0.72 && clockRuns()) || cinematic || !started || paused || ZONE.pending || DAY.skip >= 0) return;
    DAY.foeT -= dt;
    if (DAY.foeT > 0) return;
    DAY.foeT = 6 + Math.random() * 5;
    if (!nightWild(P.x, P.z) || P.y < -4 || ENEMIES.filter((e) => e.night && e.state !== "dead").length >= 3) return;
    for (let tries = 0; tries < 14; tries++) {
      const a = Math.random() * TAU,
        r = 10 + Math.random() * 6,
        x = P.x + Math.cos(a) * r,
        z = P.z + Math.sin(a) * r;
      if (!nightWild(x, z) || walkSD(x, z) < 2 || riverW(x, z) < 1.5) continue;
      const y = nightGround(x, z, P.y);
      if (Math.abs(y - P.y) > 3) continue;
      const e = spawnEnemy(Math.random() < 0.25 ? "eye" : "grunt", -1, x, z, y);
      Object.assign(e, { night: true, terrain: true, K: 0.9 });
      notifyOnce("gaueko-itzalak", L("Gauekoren itzalak! Gauez zelaietan ibiltzen dira; herrian ez dira sartzen."), "");
      return;
    }
  }
  /* combat.js-ko enemyUpdate-tik: haranean lurraren gainean ibili (ez ibaian, ez herrian) */
  function terrainStep(e, nx, nz) {
    const ty = nightGround(nx, nz, e.y);
    if (walkSD(nx, nz) < 0.6 || riverW(nx, nz) < 0.8 || ty - e.y > 0.6 || !nightWild(nx, nz)) return [e.x, e.z];
    e.y = ty;
    return [nx, nz];
  }

  /* ------------------------------ arima-argiak ------------------------------ */
  function wispsUpdate(dt) {
    const on = DAY.k > 0.6;
    for (const W of DAY.wisps) {
      W.g.visible = on && !W.got;
      if (!W.g.visible) continue;
      /* astiro ibili aingura inguruan; Amaiur hurbil → apur bat ihes */
      W.a += dt * 0.5;
      const dp = Math.hypot(P.x - W.x, P.z - W.z);
      let tx = W.ox + Math.cos(W.a) * 1.6,
        tz = W.oz + Math.sin(W.a * 1.3) * 1.6;
      if (dp < 4.5 && dp > 0.01) {
        tx = W.x + ((W.x - P.x) / dp) * 2;
        tz = W.z + ((W.z - P.z) / dp) * 2;
        const ax = tx - W.ox,
          az = tz - W.oz,
          al = Math.hypot(ax, az);
        if (al > 3) {
          tx = W.ox + (ax / al) * 3;
          tz = W.oz + (az / al) * 3;
        }
      }
      W.x = mix(W.x, tx, 1 - Math.exp(-dt * 1.2));
      W.z = mix(W.z, tz, 1 - Math.exp(-dt * 1.2));
      const fade = smooth01(clamp((DAY.k - 0.6) / 0.3, 0, 1));
      W.g.position.set(W.x, W.y + 1.3 + Math.sin(time * 2 + W.ox) * 0.25, W.z);
      W.halo.material.opacity = fade * (0.55 + Math.sin(time * 3 + W.oz) * 0.15);
      W.core.material.opacity = fade * 0.9;
      if (Math.random() < dt * 4) fxBurst(W.x, W.g.position.y, W.z, { n: 1, speed: 0.3, up: 0.4, life: 1, size: 0.16, color: "#bfe6ff", grav: -0.3, jitter: 0.3 });
      if (dp < 1.6 && Math.abs(P.y + 1 - W.g.position.y) < 2.2 && fade > 0.5) {
        W.got = true;
        if (!saved.arimak.includes(W.id)) saved.arimak.push(W.id);
        persist();
        SND.memory();
        fxBurst(W.x, W.g.position.y, W.z, { n: 30, speed: 3, up: 2, life: 1, size: 0.3, color: "#bfe6ff", grav: -1 });
        fxRing(W.x, W.y + 0.2, W.z, "#9fd8ff", 4, 0.7);
        notify(L("ARIMA-ARGIA ") + saved.arimak.length + " / " + WISP_DEFS.length + (saved.flags.includes("arimak") ? L(" · Kattalinek argizaiola bat piztuko du") : L(" · Kattalinek jakingo du zer den")), "", 3.5);
        hud();
      }
    }
  }
  /* ------------------------------ eguzkilorea ------------------------------ */
  function flowerUpdate(dt) {
    const F = DAY.flower;
    if (!F) return;
    const want = saved.flags.includes("eguzkilore-bila") && !saved.flags.includes("eguzkilorea");
    F.visible = want && phaseBlend < 0.5 && DAY.k < 0.35;
    if (!F.visible) return;
    F.rotation.y += dt * 0.3;
    if (phase === 0 && Math.hypot(P.x - EGUZKILORE_AT.x, P.z - EGUZKILORE_AT.z) < 1.5 && Math.abs(P.y - DAY.flowerY) < 2) {
      flagSet("eguzkilorea");
      SND.heal();
      fxBurst(EGUZKILORE_AT.x, DAY.flowerY + 0.6, EGUZKILORE_AT.z, { n: 30, speed: 2.5, up: 2.5, life: 1, size: 0.28, color: "#ffe9a8", grav: -0.6 });
      itemGet("eguzkilore", L("EGUZKILOREA"), L("Eguzkiaren lorea. Ateetan jartzen da, gaueko izakiak urrun egon daitezen. Eraman Kattalini."));
    }
  }
  /* ------------------------------ giro-hotsak gauez ------------------------------ */
  function nightAmbience(dt) {
    if (DAY.k < 0.5 || P.y < -4) return;
    const A = DAY.amb,
      due = (k, min, max) => {
        A[k] = (A[k] ?? Math.random() * max) - dt;
        if (A[k] > 0) return false;
        A[k] = min + Math.random() * (max - min);
        return true;
      };
    if (phaseBlend < 0.5 && due("cricket", 0.6, 1.8)) SND.cricket();
    if (due("owl", 9, 18)) SND.owl();
    /* lamiak askatuta: ibaian kantatzen dute gauez */
    if (saved.flags.includes("lamia") && riverW(P.x, P.z) < 18 && due("sing", 12, 22)) SND.sing && SND.sing(0.35);
  }

  /* ------------------------------ Kattalin gauez ------------------------------ */
  /* talkKattalin-etik: true → hemen kudeatuta */
  function kattalinNight(N, f) {
    if (f("gaua") && !saved.rhythms.includes("eguzkilore")) {
      if (f("eguzkilorea")) {
        talk(
          N,
          [
            ["KATTALIN", "Eguzkilorea! Usaina… eguzkiarena. Amonak gure atean iltzatzen zuen, udazkenero."],
            ["KATTALIN", "Gaueko ez da eguzkilorea dagoen atetik sartzen: eguzkia dela uste du, eta beldur da."],
            ["KATTALIN", "Entzun orain erritmo hau. Andererena zen. Eguzkiari deitzen dio… edo bidaltzen du."],
          ],
          () => txalaLearn("eguzkilore", "KATTALIN", () => {
            flagSet("arimak");
            notify(L("EGUZKILORE: gauez, egunsentia dakar; egunez, ilunabarra. Leizean, itzalak zorabiatzen ditu."), "", 6);
          }),
        );
        return true;
      }
      if (!f("eguzkilore-bila")) {
        talk(
          N,
          [
            ["KATTALIN", "Gaua, alaba. Gaua gauekoentzat, eguna egunekoentzat… Gauekoren itzalak zelaietan dabiltza berriro."],
            ["KATTALIN", "Gure atean eguzkilore bat zegoen. Negu honek zimeldu du, eta etxea babesik gabe dago."],
            ["KATTALIN", "Harrespilako larrean hazten da, lurrean, eguzki txiki bat bezala. Baina udan bakarrik loratzen da… eta egunez."],
            ["KATTALIN", "Ekarri bat, eta erakutsiko dizut Andereren erritmoa."],
          ],
          () => flagSet("eguzkilore-bila"),
        );
        return true;
      }
      talk(N, [["KATTALIN", "Eguzkilorea harrespilan dago, lurrean. IRAGANEAN (uda) eta EGUNEZ bakarrik ikusten da."]]);
      return true;
    }
    /* arima-argiak: argizaiolak piztu */
    const n = saved.arimak.length,
      give = (flag, lines, fn) => {
        talk(N, lines, () => {
          flagSet(flag);
          fn();
        });
        return true;
      };
    if (f("arimak") || n) {
      if (!f("arimak")) flagSet("arimak");
      if (n >= 3 && !f("arimak3"))
        return give("arimak3", [["KATTALIN", "Hiru arima-argi! Elizako argizaiolak piztu ditut, bakoitzari bere izena esanez. Hartu: amonaren botila."]], () => {
          saved.potions = (saved.potions || 0) + 1;
          persist();
          itemGet("botila", L("SENDABELAR-BOTILA"), L("Bizitzak amaitzean, berez erabiltzen da."));
        });
      if (n >= 6 && !f("arimak6")) return give("arimak6", [["KATTALIN", "Sei argizaiola piztuta. Herriko zaharrek lasaiago egiten dute lo. Hau zuretzat: argizaiolaren bihotza."]], () => pieceGet("arimak6"));
      if (n >= WISP_DEFS.length && !f("arimak10"))
        return give(
          "arimak10",
          [
            ["KATTALIN", "Hamar! Eta azkenak… Andereren izena zuen. Nire amona. Bere argia ere bidean galduta zegoen."],
            ["KATTALIN", "Esan du: «Anboton, Mariren etxean, zazpigarren atea. Erritmoa eraman, eta ez beldurtu ilunpeaz.»"],
          ],
          () => pieceGet("arimak10"),
        );
      if (n < WISP_DEFS.length && DAY.k > 0.5) {
        talk(N, [["KATTALIN", "Arima-argiak gauez ibiltzen dira: gure aurrekoen argiak, bidea galduta. " + n + " / " + WISP_DEFS.length + ". Ekarri, eta argizaiolak piztuko ditut."]]);
        return true;
      }
    }
    return false;
  }
