  /* ==================================================================
     IZENBURUA · azala (hasierako pantaila), abentura epikoen erara baina diseinu propioz:
     Amaiur itsasertzeko harkaitz batean (azalerako bakarrik), urre-orduan, haranari begira;
     zazpi argi-zutabe horizontean zeruraino (zazpi leizeen deiak) eta lanbro urrezkoa.
     Kamera astiro, bizkarretik albora eta itzuli. Logoa DOMean
     (head.html): lauburu-ikurra, txalaparta-makila gurutzatuak eta urrezko letrak (Cinzel).
     Partida hasten denean dena ezkutatzen da eta jokoa ohi bezala dator (start → teleport).
     ================================================================== */
  /* spot: Amaiurren harkaitza (azalerako bakarrik, kostaldean, herriaren gainetik); look: harana */
  const TITLE = { on: false, t: 0, g: null, beams: [], spot: { x: 46, y: 21, z: 70 }, look: { x: -8, y: 6, z: -60 }, cam: { r: 8.5, h: 3.4, k: 0.1, sw: 0.4, side: -0.3, off: 2.2 }, moteT: 0 };
  /* zazpi deiak: kolorea eta lodiera; azalean horizontean zabalduta (mendien atzetik gora),
     ikuspegiaren ±40°-tan, logoaren alboetan ere ikusteko */
  const TITLE_BEAMS = [
    ["#ffae2e", 1.3] /* Basajaun */,
    ["#1fe0c4", 1.3] /* Lamia */,
    ["#ff5a2a", 1.3] /* Tartalo */,
    ["#76e030", 1.6] /* Jentilak */,
    ["#7fb6ff", 1.6] /* Odei */,
    ["#ff7a12", 1.8] /* Herensugea */,
    ["#a462ff", 2.2] /* Inguma */,
  ];
  const TITLE_FOG = new T.Color("#e2a983");
  function titleBuild() {
    const g = new T.Group();
    /* zutabearen testura: behean argia, goian itzalita (gehigarria: beltza = gardena) */
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const x = c.getContext("2d"),
      gr = x.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.18, "#9a9a9a");
    gr.addColorStop(0.6, "#262626");
    gr.addColorStop(1, "#000000");
    x.fillStyle = gr;
    x.fillRect(0, 0, 4, 128);
    const tex = new T.CanvasTexture(c);
    const S0 = TITLE.spot,
      yaw = Math.atan2(TITLE.look.x - S0.x, TITLE.look.z - S0.z);
    for (const [i, [col, w]] of TITLE_BEAMS.entries()) {
      const q = yaw + [-0.7, 0.62, -0.42, 0.36, -0.16, 0.12, 0.85][i],
        d = [165, 175, 190, 185, 205, 195, 160][i],
        bx = S0.x + Math.sin(q) * d,
        bz = S0.z + Math.cos(q) * d,
        by = [6, 8, 10, 12, 16, 12, 6][i];
      /* muina (mehea, bizia) eta haloa (zabala, leuna): urrunetik ere kolorea ikusteko */
      const mk = (r0, r1, op, add) => {
        const m = new T.Mesh(
          new T.CylinderGeometry(r0 * w, r1 * w, 190, 12, 1, true),
          /* muina gehigarria (distira); haloa nahasketa arruntean, kolorea galdu gabe (alphaMap) */
          new T.MeshBasicMaterial(
            add
              ? { color: col, map: tex, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }
              : { color: col, alphaMap: tex, transparent: true, opacity: op, depthWrite: false, fog: false, side: T.DoubleSide },
          ),
        );
        m.position.set(bx, by + 95, bz);
        m.renderOrder = 3;
        g.add(m);
        return m;
      };
      const core = mk(0.55, 0.9, 0.4, true),
        halo = mk(2.4, 4, 0.45, false);
      const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 }));
      s.position.set(bx, by + 2, bz);
      s.scale.setScalar(16 * w);
      g.add(s);
      TITLE.beams.push({ core, halo, s, ph: bx * 0.1 + bz * 0.07 });
    }
    /* harkaitza: itsasotik gora, goian belarra (hash finkoa; jokoaren RNG-a ukitu gabe) */
    const S = TITLE.spot,
      hash = (i) => {
        const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
        return v - Math.floor(v);
      },
      rg = new T.CylinderGeometry(2.9, 7.5, 44, 8, 6),
      rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const y = rp.getY(i);
      if (y > 21.9) continue; /* goiko ertza zuzen (belarra gainean) */
      const k = 1 + (hash(i) - 0.5) * 0.36;
      rp.setX(i, rp.getX(i) * k);
      rp.setZ(i, rp.getZ(i) * k);
      rp.setY(i, y + (hash(i + 99) - 0.5) * 1.2);
    }
    rg.computeVertexNormals();
    const rock = new T.Mesh(rg, rockMaterial());
    rock.position.set(S.x, S.y - 22.35, S.z); /* goiko aurpegia belarraren azpian (z-borrokarik gabe) */
    rock.castShadow = rock.receiveShadow = true;
    /* gaina: belar-kopa irregularra eta harri txiki batzuk */
    const cg = new T.CylinderGeometry(3.5, 3.3, 0.9, 12, 1),
      cp = cg.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const k = 1 + (hash(i * 3 + 7) - 0.5) * 0.16;
      cp.setX(i, cp.getX(i) * k);
      cp.setZ(i, cp.getZ(i) * k);
      if (cp.getY(i) > 0) cp.setY(i, 0.45 - 0.05 * Math.hypot(cp.getX(i), cp.getZ(i)) * hash(i));
    }
    cg.computeVertexNormals();
    /* haraneko belar-testura bera (ez badago, kolore laua) */
    const cu = cg.attributes.uv;
    for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 2.5, cu.getY(i) * 2.5);
    const cap = new T.Mesh(cg, terrainMaterial() || material("#5f8f45"));
    cap.position.set(S.x, S.y - 0.42, S.z);
    cap.receiveShadow = true;
    g.add(rock, cap);
    for (let i = 0; i < 5; i++) {
      const q = i * 1.37 + 0.4,
        d = 2.2 + hash(i + 40) * 0.9,
        st = new T.Mesh(new T.DodecahedronGeometry(0.25 + hash(i + 50) * 0.35, 0), rockMaterial());
      st.position.set(S.x + Math.cos(q) * d, S.y - 0.05, S.z + Math.sin(q) * d);
      st.rotation.set(hash(i + 60) * 3, hash(i + 70) * 3, 0);
      st.castShadow = true;
      g.add(st);
    }
    g.visible = false;
    scene.add(g);
    TITLE.g = g;
  }
  /* azalera sartu: haranean, Amaiur muinoan (soilik itxura: start()-ek teleport egiten du) */
  function titleEnter() {
    if (!TITLE.g) titleBuild();
    TITLE.on = true;
    TITLE.t = 0;
    if (ZONE.cur !== "ibarra") zoneActivate("ibarra");
    const sx = TITLE.spot.x,
      sz = TITLE.spot.z,
      sy = TITLE.spot.y;
    P.x = sx;
    P.y = sy;
    P.z = sz;
    hero.position.set(sx, sy, sz);
    hero.rotation.y = Math.atan2(TITLE.look.x - sx, TITLE.look.z - sz) - 0.35;
    hero.visible = true;
    animate("Idle");
    /* azalean, iragana (harana bizirik, ura mugitzen); start()-ek oraina berrezartzen du */
    phase = 0;
    setPhaseVisual(true);
    TITLE.g.visible = true;
    FACE.force = null;
  }
  function titleLeave() {
    TITLE.on = false;
    if (TITLE.g) TITLE.g.visible = false;
  }
  function titleUpdate(dt) {
    if (!TITLE.on) titleEnter();
    const t = (TITLE.t += dt);
    const H = hero.position,
      face = Math.atan2(TITLE.look.x - H.x, TITLE.look.z - H.z);
    /* kamera: bizkarretik (mendiak eta zutabeak) hiru-laurdeneko alborantz, 70 s-ko kulunka */
    /* bertikalean (mugikorra): urrunago eta erdiratuago, Amaiur logoaren azpian */
    const C = TITLE.cam,
      vert = camera.aspect < 1,
      a = face + PI + C.side + C.sw * Math.sin(t * 0.09),
      r = (vert ? C.r * 1.25 : C.r) + 0.7 * Math.sin(t * 0.05 + 1),
      cy = H.y + (vert ? C.h * 1.2 : C.h) + 0.25 * Math.sin(t * 0.07);
    camera.position.set(H.x + Math.sin(a) * r, cy, H.z + Math.cos(a) * r);
    /* begirada: Amaiurren burutik paisaiara (k), Amaiur beheko herenean */
    const k = vert ? 0.02 : C.k,
      hy = H.y + (vert ? 2.4 : 1.4),
      L = new T.Vector3(mix(H.x, TITLE.look.x, k), mix(hy, TITLE.look.y, k), mix(H.z, TITLE.look.z, k));
    /* begirada ezkerrera lerratu (C.off): Amaiur eskuineko herenean, paisaia erdian */
    const dx = L.x - camera.position.x,
      dz = L.z - camera.position.z,
      dl = Math.hypot(dx, dz) || 1;
    const off = vert ? 0 : C.off;
    L.x += (dz / dl) * off;
    L.z -= (dx / dl) * off;
    camera.lookAt(L);
    if (Math.abs(camera.fov - 50) > 0.02) {
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    /* urre-ordua: eguzki baxua ezkerretik (ertz-argia), zerua eta lainoa urre-arrosa */
    DAY.k = 0.26;
    DAY.tw = 4 * DAY.k * (1 - DAY.k);
    eraVisuals();
    /* urrezko lainoa: urruneko mendiak lanbroan urtzen dira (zutabeek ez dute lainorik) */
    scene.fog.color.lerp(TITLE_FOG, 0.65);
    scene.fog.near = 70;
    scene.fog.far = 340;
    scene.background.copy(scene.fog.color);
    if (sky.material.uniforms.uFog) sky.material.uniforms.uFog.value.copy(scene.fog.color);
    sea.material.uniforms.clock.value = t; /* (jokoko `time` ez da aurreratzen azalean) */
    sun.position.set(H.x - 70, H.y + 34, H.z - 6);
    sun.target.position.set(H.x, H.y, H.z);
    sun.target.updateMatrixWorld();
    for (const B of TITLE.beams) {
      const p = 0.75 + 0.25 * Math.sin(t * 1.3 + B.ph);
      B.core.material.opacity = 0.4 * p;
      B.halo.material.opacity = 0.45 * p;
      B.s.material.opacity = 0.65 + 0.3 * Math.sin(t * 2.1 + B.ph);
    }
    /* hauts urrezkoa Amaiurren inguruan, astiro gora */
    TITLE.moteT -= dt;
    if (TITLE.moteT <= 0) {
      TITLE.moteT = 0.18;
      const q = Math.random() * TAU,
        d = 1.5 + Math.random() * 5;
      fxBurst(H.x + Math.cos(q) * d, H.y + 0.3 + Math.random() * 2, H.z + Math.sin(q) * d, { n: 1, speed: 0.25, up: 0.5, life: 3.2, size: 0.11, color: "#ffd98c", grav: -0.15, drag: 0.3 });
    }
  }
