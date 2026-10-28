  /* ==================================================================
     BORROKA · Gauekoren hezurrezko zaindariak (KayKit Skeletons, CC0)
     · Hiru mota: ezpatadun hezurdura (lasterka eta ebakia), hezurdun
       sorgina (urrutitik jaurtitzen du eta teleportatzen da) eta
       aizkoradun gudaria (orroa, oldarraldia, kaiolaren kontra zorabiatu).
     · Zaindari bakoitza garai batean bakarrik zauritzen da: begi urreak →
       iragana, begi urdinak → oraina, moreak → biak. Beste garaian ezkutua.
     · Jokalariaren sorginkeria: magic.js.
     ================================================================== */
  const ENEMIES = [],
    SHOTS = [];
  /* S: eskala bisuala (prozedurazko ordezkoa) · H: gorputzaren erdiaren altuera (helburua) */
  const EN_DEF = {
    grunt: { hp: 3, speed: 3.9, r: 0.85, dmg: 1, mass: 1, S: 1.55, H: 1.2 },
    eye: { hp: 3, speed: 3.1, r: 0.85, dmg: 1, mass: 0.8, S: 1.5, H: 1.25 },
    brute: { hp: 10, speed: 2.5, r: 1.3, dmg: 2, mass: 2.6, S: 1.45, H: 1.6 },
    /* SAGUZARRA (6. leizea): biraka, gero murgilka; argiak lurrera botatzen du */
    bat: { hp: 2, speed: 5.4, r: 0.62, dmg: 1, mass: 0.45, S: 1, H: 1.15 },
    mamua: { hp: 3, speed: 3.4, r: 0.68, dmg: 1, mass: 0.7, S: 1, H: 1.3 },
    /* ZAINDARIA (sigiloa.js): Gauekoren itzal-zaindaria, kriseiluarekin */
    zaindari: { hp: 4, speed: 4.3, r: 0.8, dmg: 1, mass: 1.4, S: 1.5, H: 1.25 },
  };
  const ERA_COL = ["#ffb85c", "#7fe9ff", "#c98bff"];
  const ATK = { n: 0, t: 9, dir: 0, waveCd: 0, lungeT: 0, hold: false };
  const NUMS = [];
  let combatMat = null;
  function combatLevel() {
    return ROOM.fight || BOSS.on || ENEMIES.some((e) => e.state !== "dead" && !sigCalm(e) && Math.hypot(e.x - P.x, e.z - P.z) < 26) ? 2 : 1;
  }
  function enemiesAlive() {
    return ENEMIES.filter((e) => e.state !== "dead").length;
  }
  /* --------------------------- hezurdurak (KayKit, animatuak) --------------------------- */
  const SKEL_OF = { grunt: ["skel_minion", 1.32], eye: ["skel_mage", 1.32], brute: ["skel_warrior", 1.62], zaindari: ["skel_warrior", 1.42] };
  const SKEL_TINT = ["#f0d6ae", "#c4ddf0", "#dccbf5"];
  function skelMesh(type, era) {
    const def = SKEL_OF[type];
    /* saguzarrak: hezurdurarik ez (prozedurala) */
    if (!def) return null;
    const src = models[def[0]],
      clips = models.skel_minion && models.skel_minion.animations;
    if (!src || !clips || !clips.length) return null;
    const ei = era < 0 ? 2 : era,
      root = cloneSkinned(src.scene),
      g = new T.Group();
    root.scale.setScalar(def[1]);
    g.add(root);
    let base = null;
    root.traverse((n) => {
      if (n.isMesh && !/Eyes/.test(n.name) && !base) base = n.material;
    });
    /* three r128: hezurdun sareek "skinning" duen materiala behar dute; armek ez */
    const body = base.clone();
    body.skinning = true;
    body.color = new T.Color(SKEL_TINT[ei]);
    body.emissive = new T.Color("#000000");
    body.envMapIntensity = 0.55;
    const rigid = body.clone();
    rigid.skinning = false;
    const eye = new T.MeshBasicMaterial({ color: ERA_COL[ei], skinning: true });
    /* itzal-mapan ez (11 sare × etsai bakoitza mugikorrean garestia da): itzal leuna lurrean */
    root.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = false;
      n.receiveShadow = false;
      n.frustumCulled = false;
      n.material = /Eyes/.test(n.name) ? eye : n.isSkinnedMesh ? body : rigid;
    });
    /* begien distira (buruari lotuta) */
    const head = root.getObjectByName("head"),
      shine = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: ERA_COL[ei], transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
    shine.scale.setScalar(0.9);
    if (head) {
      shine.position.set(0, 0.42, 0.33);
      head.add(shine);
    }
    const mixer = new T.AnimationMixer(root),
      actions = {};
    for (const c of clips) actions[c.name] = mixer.clipAction(c);
    const R = EN_DEF[type].r * 1.2;
    const parts = enemyExtras(type, era, R, R * 0.95);
    g.add(parts.shield);
    return { g, body, rigid, eye, shine, mixer, actions, anim: "", skel: true, ...parts };
  }
  /* geometria partekatuak (etsai bakoitzak materialak bakarrik ditu bereak) */
  const EGEO = {};
  const egeo = (k, f) => EGEO[k] || (EGEO[k] = f());
  /* garai-ezkutua, aura eta bizitza-barra (bi ereduentzat) */
  function enemyExtras(type, era, R, cy) {
    const col = ERA_COL[era < 0 ? 2 : era];
    const shield = new T.Mesh(
      egeo("shield", () => new T.IcosahedronGeometry(1, 3)),
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { uC: { value: new T.Color(col) }, uA: { value: 0 }, uT: { value: 0 } },
        vertexShader: "varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}",
        fragmentShader: "uniform vec3 uC;uniform float uA,uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(vN,vV)),2.6);float hex=step(.86,fract(vP.y*6.+uT*.6))*.25;gl_FragColor=vec4(uC,(f+hex*f)*uA);}",
      }),
    );
    shield.material.opacity = 0;
    shield.scale.set(R, R * 1.25, R);
    shield.position.y = cy;
    const aura = new T.Mesh(egeo("aura" + type, () => new T.RingGeometry(EN_DEF[type].r * 0.9, EN_DEF[type].r * 1.25, 28)), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false }));
    aura.rotation.x = -PI / 2;
    const blob = new T.Mesh(egeo("blob", () => new T.PlaneGeometry(1, 1)), new T.MeshBasicMaterial({ map: glowTexture, color: "#000000", transparent: true, opacity: 0.55, depthWrite: false }));
    /* auraren barruan (dagoeneko etzanda): z lokala = gora */
    blob.scale.setScalar(EN_DEF[type].r * 2.6);
    blob.position.z = -0.02;
    aura.add(blob);
    const bar = new T.Group(),
      bg = new T.Mesh(egeo("bar", () => new T.PlaneGeometry(1, 0.11)), new T.MeshBasicMaterial({ color: "#16091f", transparent: true, opacity: 0.75, depthTest: false })),
      fg = new T.Mesh(egeo("bar", () => new T.PlaneGeometry(1, 0.11)), new T.MeshBasicMaterial({ color: col, depthTest: false }));
    fg.position.z = 0.001;
    bar.add(bg, fg);
    bar.renderOrder = fg.renderOrder = bg.renderOrder = 9;
    scene.add(aura, bar);
    return { shield, aura, bar, fg };
  }
  /* animazioa: izen bera bada, abiadura bakarrik eguneratu */
  function enAnim(e, name, ts = 1, once = false, fade = 0.18) {
    if (!e.mixer) return;
    const a = e.actions[name];
    if (!a) return;
    if (e.anim === name) {
      a.timeScale = ts;
      return;
    }
    const old = e.actions[e.anim];
    a.reset();
    a.timeScale = ts;
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.fadeIn(fade).play();
    if (old) old.fadeOut(fade);
    e.anim = name;
  }
  /* --------------------------- itzalen eredua (ordezkoa: modelorik gabe) --------------------------- */
  function enemyMesh(type, era) {
    const sk = skelMesh(type, era);
    if (sk) {
      scene.add(sk.g);
      return sk;
    }
    const g = new T.Group(),
      body = new T.MeshStandardMaterial({ color: "#0d0812", roughness: 0.62, metalness: 0, envMapIntensity: 0.25, emissive: new T.Color("#1a0626"), emissiveIntensity: 0.6 }),
      eye = new T.MeshBasicMaterial({ color: ERA_COL[era < 0 ? 2 : era] }),
      horn = new T.MeshStandardMaterial({ color: "#2b2033", roughness: 0.4, metalness: 0.3 });
    const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    const sphere = new T.IcosahedronGeometry(1, 2),
      rim = new T.MeshBasicMaterial({ color: ERA_COL[era < 0 ? 2 : era], side: T.BackSide });
    const outline = (m, k = 1.09) => {
      const o = new T.Mesh(m.geometry, rim);
      o.position.copy(m.position);
      o.scale.copy(m.scale).multiplyScalar(k);
      g.add(o);
    };
    if (type === "grunt") {
      outline(add(sphere, body, 0, 0.62, 0, 0.58, 0.66, 0.58));
      add(sphere, eye, -0.2, 0.78, 0.48, 0.085, 0.11, 0.06);
      add(sphere, eye, 0.2, 0.78, 0.48, 0.085, 0.11, 0.06);
      for (const s of [-1, 1]) add(new T.ConeGeometry(0.11, 0.55, 6), horn, s * 0.34, 1.26, 0.02).rotation.z = -s * 0.55;
      const teeth = new T.MeshBasicMaterial({ color: "#f3e9ff" });
      for (let i = 0; i < 5; i++) add(new T.ConeGeometry(0.035, 0.11, 4), teeth, (i - 2) * 0.075, 0.52, 0.53, 1, -1, 1);
      for (let i = 0; i < 5; i++) add(new T.ConeGeometry(0.12, 0.38, 5), body, Math.sin(i * 1.3) * 0.38, 0.1, Math.cos(i * 1.3) * 0.38, 1, -1, 1);
    } else if (type === "bat") {
      /* saguzarra: gorputz txikia, belarri zorrotzak eta bi hego (kulunkan, ikusmenean) */
      outline(add(sphere, body, 0, 0, 0, 0.32, 0.3, 0.36), 1.12);
      add(sphere, eye, -0.11, 0.08, 0.3, 0.06, 0.07, 0.04);
      add(sphere, eye, 0.11, 0.08, 0.3, 0.06, 0.07, 0.04);
      for (const s of [-1, 1]) add(new T.ConeGeometry(0.07, 0.26, 4), horn, s * 0.14, 0.33, 0.02).rotation.z = -s * 0.35;
      const wg = new T.Shape();
      wg.moveTo(0, 0.12);
      wg.lineTo(0.55, 0.22);
      wg.lineTo(0.95, 0.05);
      wg.lineTo(0.78, -0.12);
      wg.lineTo(0.6, -0.04);
      wg.lineTo(0.42, -0.18);
      wg.lineTo(0.22, -0.06);
      wg.lineTo(0, -0.12);
      wg.closePath();
      const wgeo = new T.ShapeGeometry(wg),
        wmat = new T.MeshStandardMaterial({ color: "#1a1020", roughness: 0.7, side: T.DoubleSide, emissive: new T.Color("#1a0626"), emissiveIntensity: 0.5 });
      wgeo.rotateX(-PI / 2);
      const wings = [1, -1].map((s) => {
        const w = new T.Mesh(wgeo, wmat);
        w.scale.x = s;
        w.position.set(s * 0.2, 0.02, 0);
        g.add(w);
        return w;
      });
      g.userData.wings = wings;
    } else if (type === "mamua") {
      /* MAMUA: maindire bat, barrutik argi; ertz uhinduna eta begi-zulo ilunak */
      const prof = [];
      for (let i = 0; i <= 10; i++) {
        const k = i / 10;
        prof.push(new T.Vector2(Math.sin(Math.min(1, k * 1.7) * PI * 0.5) * (0.55 + k * 0.32), 1.75 - k * 1.75));
      }
      const geo = new T.LatheGeometry(prof, 22),
        pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const y = pa.getY(i);
        if (y < 0.35) {
          const a = Math.atan2(pa.getZ(i), pa.getX(i));
          pa.setY(i, y + Math.sin(a * 6) * 0.12 * (1 - y / 0.35));
        }
      }
      geo.computeVertexNormals();
      body.color.set("#ece6ff");
      body.transparent = true;
      body.opacity = 0.86;
      body.side = T.DoubleSide;
      body.emissive.set("#4a3a7a");
      add(geo, body, 0, 0, 0);
      const hole = new T.MeshBasicMaterial({ color: "#1a0f2e" });
      add(sphere, hole, -0.2, 1.3, 0.47, 0.11, 0.15, 0.06);
      add(sphere, hole, 0.2, 1.3, 0.47, 0.11, 0.15, 0.06);
      add(sphere, eye, -0.2, 1.3, 0.5, 0.045, 0.06, 0.03);
      add(sphere, eye, 0.2, 1.3, 0.5, 0.045, 0.06, 0.03);
      add(sphere, hole, 0, 1.0, 0.53, 0.08, 0.1, 0.04);
    } else if (type === "eye") {
      outline(add(sphere, body, 0, 0, 0, 0.5, 0.5, 0.5), 1.1);
      add(sphere, eye, 0, 0.02, 0.42, 0.24, 0.24, 0.1);
      add(sphere, new T.MeshBasicMaterial({ color: "#12081a" }), 0, 0.02, 0.5, 0.09, 0.14, 0.05);
      for (let i = 0; i < 4; i++) add(new T.ConeGeometry(0.08, 0.7, 5), body, Math.cos(i * 1.57) * 0.22, -0.55, Math.sin(i * 1.57) * 0.22, 1, -1, 1);
    } else {
      outline(add(sphere, body, 0, 1.0, 0, 1.0, 0.95, 0.9), 1.07);
      add(sphere, eye, -0.32, 1.3, 0.78, 0.11, 0.08, 0.06);
      add(sphere, eye, 0.32, 1.3, 0.78, 0.11, 0.08, 0.06);
      add(new T.BoxGeometry(0.5, 0.12, 0.08), eye, 0, 0.75, 0.86);
      for (const s of [-1, 1]) {
        const h = add(new T.ConeGeometry(0.16, 1.1, 7), horn, s * 0.62, 1.85, 0.1);
        h.rotation.z = -s * 0.85;
        h.rotation.x = -0.3;
      }
    }
    const R = (EN_DEF[type].r / EN_DEF[type].S) * 1.35,
      parts = enemyExtras(type, era, R, type === "eye" || type === "bat" ? 0 : R * 0.8);
    g.add(parts.shield);
    scene.add(g);
    return { g, body, eye, wings: g.userData.wings, ...parts };
  }
  function spawnEnemy(type, era, x, z, y) {
    const D = EN_DEF[type],
      M = enemyMesh(type, era),
      e = { type, era, x, z, y, vx: 0, vz: 0, hp: D.hp, max: D.hp, state: "spawn", t: 0, cd: 1 + Math.random(), dir: Math.atan2(P.x - x, P.z - z), flash: 0, stun: 0, hitT: 0, blinkCd: 2, room: null, K: 1, H: !M.skel && type === "eye" ? 1.9 : D.H, ...M, D };
    e.g.position.set(x, e.skel ? y : y - 1.5, z);
    e.g.rotation.y = e.dir;
    e.spawnLen = e.skel ? 1.25 : 0.7;
    enAnim(e, "Spawn_Ground_Skeletons", 2.85, true, 0.01);
    ENEMIES.push(e);
    fxRing(x, y + 0.05, z, "#8a3dff", 2.2, 0.6);
    fxBurst(x, y + 0.2, z, { n: 14, speed: 2.5, up: 3, life: 0.7, size: 0.3, color: "#6d28c9", grav: 2 });
    return e;
  }
  /* GPU memoria askatu: materialak, hezurduren testurak (geometria partekatuak ez) */
  function removeEnemy(e) {
    scene.remove(e.g, e.aura, e.bar);
    e.body.dispose();
    e.eye.dispose();
    if (e.rigid) e.rigid.dispose();
    if (e.shine) e.shine.material.dispose();
    if (e.dizzy) {
      scene.remove(e.dizzy);
      e.dizzy.material.dispose();
    }
    e.shield.material.dispose();
    e.aura.material.dispose();
    for (const c of e.aura.children) c.material.dispose();
    for (const c of e.bar.children) c.material.dispose();
    if (e.mixer) {
      e.mixer.stopAllAction();
      e.mixer.uncacheRoot(e.mixer.getRoot());
    }
    e.g.traverse((n) => {
      if (n.isSkinnedMesh && n.skeleton && n.skeleton.dispose) n.skeleton.dispose();
      /* ordezko eredu prozeduralak bere geometriak ditu (KayKit klonek iturriarekin partekatzen dituzte) */
      if (!e.skel && n.isMesh && n !== e.shield) n.geometry.dispose();
    });
    if (e.zain) zainDispose(e);
  }
  function clearEnemies() {
    for (const e of ENEMIES) removeEnemy(e);
    ENEMIES.length = 0;
    for (const s of SHOTS) scene.remove(s.m);
    SHOTS.length = 0;
    /* oldarraldiaren seinale gorriak ere bai (bestela betiko taupaka geratzen dira) */
    for (const t of TELE) {
      scene.remove(t.m);
      t.m.material.dispose();
    }
    TELE.length = 0;
  }
  /* olatua gela batean (laukizuzena: w, d) edo eremu biribil batean (rx, rz) */
  function spawnWave(list, R) {
    const I = R;
    for (const [type, era, n] of list)
      for (let k = 0; k < n; k++) {
        let best = null;
        for (let tries = 0; tries < 30; tries++) {
          const a = Math.random() * TAU,
            r = 0.25 + Math.random() * 0.5,
            x = I.rx ? I.x + Math.cos(a) * I.rx * r : I.x + (Math.random() - 0.5) * (I.w - 6),
            z = I.rx ? I.z + Math.sin(a) * I.rz * r : I.z + (Math.random() - 0.5) * (I.d - 6);
          if (Math.hypot(x - P.x, z - P.z) < 5.5) continue;
          if (solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1.4)) continue;
          if (ENEMIES.some((o) => Math.hypot(x - o.x, z - o.z) < 2.2)) continue;
          best = [x, z];
          break;
        }
        if (best) {
          const e = spawnEnemy(type, era, best[0], best[1], I.y);
          e.room = I;
          e.K = I.diff || 1;
          /* bizitza gelaren arabera */
          e.hp = e.max = Math.round(e.D.hp * (I.hpK || 1));
        }
      }
  }
  /* force: garaiaren ezkutua gorabehera (TXIMISTARRIA) */
  function hitEnemy(e, dmg, nx, nz, force) {
    if (!force && e.era !== -1 && e.era !== phase) {
      /* ezkutua: beste garaian dago */
      e.shield.material.opacity = 1.6;
      fxBurst(e.x, e.y + 0.9, e.z, { n: 10, speed: 5, life: 0.3, size: 0.22, color: ERA_COL[e.era], grav: 3 });
      SND.clang();
      haptic(12);
      e.vx += nx * 3;
      e.vz += nz * 3;
      /* ezkutuaren abisua: behin testua, gero beti ikur bat buruaren gainean */
      shieldHint(e);
      if (!COACH.seen.has("era-shield")) {
        coachDone("era-shield");
        notify(
          e.era ? "Ezkutu urdina: ORAINEAN bakarrik zauritzen da. ALDATU garaia!" : "Ezkutu urrea: IRAGANEAN bakarrik zauritzen da. ALDATU garaia!",
          e.era ? "Escudo azul: solo se hiere en el PRESENTE. ¡CAMBIA de época!" : "Escudo dorado: solo se hiere en el PASADO. ¡CAMBIA de época!",
          3.5,
        );
      }
      return;
    }
    const mult = e.state === "stun" || e.parried > 0 ? 2 : 1,
      big = dmg * mult >= 2;
    e.hp -= dmg * mult;
    /* 1 · DISTIRA: etsaia zuri fotograma gutxi batzuetan (eta zapalduta: kolpea gorputzean) */
    e.flash = 0.12;
    e.punch = 0.13;
    e.hitT = 0.3;
    /* 4 · ATZERA BULTZATU */
    const kb = (big ? 9.5 : 5.6) / e.D.mass;
    e.vx += nx * kb;
    e.vz += nz * kb;
    if (e.state === "wind" && e.type !== "brute" && dmg >= 2) {
      e.state = "recover";
      e.t = 0;
    }
    /* 5 · DARDARA ETA IZOZTU (kolpearen arabera) */
    hitStop = Math.max(hitStop, big ? 0.075 : 0.038);
    shake(big ? 0.2 : 0.085);
    haptic(big ? 18 : 7);
    /* 3 · TXINPARTAK: kolpearen noranzkoan, eta talka-izarra */
    const hy = e.y + e.H * (e.skel ? 1.3 : 1);
    fxBurst(e.x - nx * 0.3, hy, e.z - nz * 0.3, { n: 7 + dmg * 4, dir: [nx, nz], cone: 1.15, speed: 9.5, up: 1.4, life: 0.3, size: 0.2, color: "#fff4d6", grav: 7, drag: 3.5 });
    fxBurst(e.x, hy, e.z, { n: 6 + dmg * 3, speed: 4.5, life: 0.4, size: 0.26, color: ERA_COL[e.era < 0 ? 2 : e.era], grav: 3 });
    fxFlash(e.x - nx * 0.45, hy, e.z - nz * 0.45, big ? 3.4 : 2.3, "#ffffff", big ? 0.11 : 0.08);
    damageNumber(e, dmg * mult);
    SND.hit(dmg * mult);
    comboHit();
    miniDamaged(e, dmg * mult);
    if (e.hp <= 0) killEnemy(e);
  }
  /* ezkutuaren ikurra: "ALDATU" eta garaiaren kolorea, etsaiaren gainean */
  function shieldHint(e) {
    const el = $("shieldHint");
    if (!el) return;
    SHIELD_HINT.e = e;
    SHIELD_HINT.t = 1.4;
    el.textContent = (e.era ? L("ORAINA", "PRESENTE") : L("IRAGANA", "PASADO")) + " · " + L("ALDATU", "CAMBIA") + kb(" (Q)");
    el.style.borderColor = el.style.color = ERA_COL[e.era];
  }
  const SHIELD_HINT = { e: null, t: 0 };
  function shieldHintUpdate(dt) {
    const el = $("shieldHint");
    if (!el) return;
    SHIELD_HINT.t -= dt;
    const e = SHIELD_HINT.e;
    if (!e || SHIELD_HINT.t <= 0 || e.state === "dead" || e.era === phase) {
      el.hidden = true;
      return;
    }
    const v = new T.Vector3(e.x, e.y + e.H * 2 + 1.2, e.z).project(camera);
    el.hidden = false;
    el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`;
  }
  function killEnemy(e) {
    e.state = "dead";
    e.t = 0;
    e.vx *= 0.3;
    e.vz *= 0.3;
    enAnim(e, "Death_C_Skeletons", 1.7, true, 0.08);
    /* hiltzeak bultzada berritzen du (erasoa saritu: mugimendu bizia) */
    P.dashReady = true;
    P.dashes = Math.max(P.dashes, 1);
    if (e.shine) e.shine.visible = false;
    e.aura.visible = e.bar.visible = false;
    e.shield.visible = false;
    /* bizitzarik gabe: puxika bat bezala — puztu (zuri), gero lehertu (enemyUpdate) */
    e.pop = 0.1;
    e.flash = 0.2;
    hitStop = Math.max(hitStop, 0.085);
    shake(0.16);
    SND.kill();
    haptic(16);
    /* argi-izpia: batzuetan bizitza bat itzultzen du */
    if (Math.random() < 0.28 && P.hp < P.maxHp) MOTES.push({ x: e.x, z: e.z, y: e.y + 1, t: 0, m: orb(e.x, e.y + 1, e.z, 0.18, "#9dffc4") });
  }
  const MOTES = [];
  /* garai-uhina: garaia aldatzean inguruko itzalak bultzatu eta zauritu */
  function eraWave() {
    if (ATK.waveCd > 0 || !ENEMIES.length) return;
    ATK.waveCd = 2.6;
    const R = saved.boons?.includes("wave") ? 5 : 3.6;
    let hit = false;
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      const dx = e.x - P.x,
        dz = e.z - P.z,
        dd = Math.hypot(dx, dz);
      if (dd > R) continue;
      hit = true;
      e.stun = Math.max(e.stun, 0.6);
      if (e.state === "wind" || e.state === "charge") {
        e.state = "recover";
        e.t = 0;
      }
      if (e.era === -1 || e.era === phase) hitEnemy(e, saved.boons?.includes("wave") ? 2 : 1, dx / (dd || 1), dz / (dd || 1));
      else {
        e.vx += (dx / (dd || 1)) * 6;
        e.vz += (dz / (dd || 1)) * 6;
      }
    }
    if (hit) fxRing(P.x, P.y + 0.4, P.z, eraCol(), R, 0.35);
  }
  /* --------------------------- itzalen adimena --------------------------- */
  /* zailtasuna gelaren arabera (e.K): sarrera leuna, azkenak frenetikoak */
  function enemyUpdate(dt) {
    for (const e of ENEMIES) {
      const K = e.K || 1;
      const I = e.room || null;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.stun = Math.max(0, e.stun - dt);
      if (e.parried > 0) parriedUpdate(e, dt);
      const dx = P.x - e.x,
        dz = P.z - e.z,
        d = Math.hypot(dx, dz) || 1,
        ux = dx / d,
        uz = dz / d;
      let want = 0,
        wx = 0,
        wz = 0;
      if (e.mixer) e.mixer.update(dt);
      if (e.state === "dead") {
        e.aura.visible = e.bar.visible = false;
        if (e.pop > 0) {
          /* puztu… eta lehertu */
          e.pop -= dt;
          e.gS ??= e.g.scale.x;
          const k = 1 - Math.max(0, e.pop) / 0.1,
            s = 1 + 0.34 * Math.sin(k * PI * 0.5);
          if (e.skel) e.g.scale.set(e.gS * s, e.gS * (1 + 0.2 * k), e.gS * s);
          else e.g.scale.setScalar(e.D.S * s);
          e.body.emissive.set("#ffffff");
          e.body.emissiveIntensity = 2.6;
          if (e.rigid) {
            e.rigid.emissive.set("#ffffff");
            e.rigid.emissiveIntensity = 2.6;
          }
          if (e.pop <= 0) {
            if (e.skel) e.g.scale.setScalar(e.gS);
            const col = ERA_COL[e.era < 0 ? 2 : e.era],
              cy = e.y + (e.skel ? e.H * 1.2 : 0.8);
            fxBurst(e.x, cy, e.z, { n: 40, speed: 8, up: 2.4, life: 0.85, size: 0.38, color: "#7a2fd6", grav: 1.5 });
            fxBurst(e.x, cy, e.z, { n: 24, speed: 11, ring: true, life: 0.35, size: 0.3, color: "#ffffff", grav: 0, drag: 5 });
            fxBurst(e.x, cy, e.z, { n: 16, speed: 3, up: 3, life: 1.1, size: 0.3, color: col, grav: -1 });
            fxRing(e.x, e.y + 0.1, e.z, col, 3.4, 0.5);
            fxFlash(e.x, cy, e.z, 4.2, "#ffffff", 0.12);
            SND.pop();
            if (e.rigid) e.rigid.emissive.set("#000000");
          }
          continue;
        }
        if (e.skel) {
          /* hezurrak lurrera erori, gero lurrean hondoratu */
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          e.vx *= Math.exp(-dt * 6);
          e.vz *= Math.exp(-dt * 6);
          e.g.position.set(e.x, e.y - Math.max(0, e.t - 1.05) * 1.6, e.z);
          e.body.emissive.set("#000000");
          continue;
        }
        const k = e.t / 0.45;
        e.g.scale.setScalar(Math.max(0.001, (1 - k) * e.D.S));
        e.g.position.y = e.y + k * 0.6;
        continue;
      }
      e.hitT = Math.max(0, e.hitT - dt);
      e.blinkCd = Math.max(0, e.blinkCd - dt);
      if (e.state === "spawn") {
        if (e.skel) e.g.position.set(e.x, e.y, e.z);
        else e.g.position.set(e.x, e.y - 2 + smooth01(Math.min(1, e.t / 0.7)) * 2 + (e.type === "eye" ? 1.9 : e.type === "bat" ? 1.7 : e.type === "mamua" ? 0.35 : 0), e.z);
        if (e.t > e.spawnLen) (e.state = e.type === "eye" || e.type === "bat" ? "hover" : e.type === "mamua" ? "drift" : "chase"), (e.t = 0);
      } else if (e.stun > 0 && e.state !== "stun") {
        /* garai-uhinak gelditua */
      } else if (e.type === "grunt") {
        if (e.state === "chase") {
          /* urrun badago, lasterka (esprinta); hurbil, kontuz */
          want = e.D.speed * K * (d > 6 ? 1.5 : 1);
          wx = ux;
          wz = uz;
          e.dir = Math.atan2(ux, uz);
          if (d < 2.6 && e.t > 0.3) (e.state = "wind"), (e.t = 0), (e.lx = ux), (e.lz = uz), (e.atk0 = time);
        } else if (e.state === "wind") {
          e.dir = Math.atan2(e.lx, e.lz);
          if (e.t > 0.46 / Math.sqrt(K)) (e.state = "lunge"), (e.t = 0);
        } else if (e.state === "lunge") {
          e.vx = e.lx * 10.5;
          e.vz = e.lz * 10.5;
          if (d < e.D.r + 0.55 && Math.abs(P.y - e.y) < 1.4) meleeHit(e, e.D.dmg);
          if (e.t > 0.22) (e.state = "recover"), (e.t = 0);
        } else if (e.state === "recover" && e.t > 0.6) (e.state = "chase"), (e.t = 0);
      } else if (e.type === "zaindari") {
        /* sigiloa.js: bidea, susmoa, ehiza eta loa */
        [want, wx, wz] = zainAI(e, dt, d, ux, uz);
      } else if (e.type === "bat") {
        /* SAGUZARRA: Amaiurren inguruan biraka; abisua (garrasia) eta murgilka (ALDARATU daiteke) */
        if (e.state === "hover") {
          const desired = 4.4,
            sp = (e.orbit ??= Math.random() < 0.5 ? 1 : -1);
          want = e.D.speed * K;
          wx = ux * (d - desired) * 0.5 - uz * sp * 1.25;
          wz = uz * (d - desired) * 0.5 + ux * sp * 1.25;
          e.dir = Math.atan2(wx, wz);
          e.cd -= dt * K;
          if (e.cd <= 0 && d < 7.5) {
            e.state = "wind";
            e.t = 0;
            e.atk0 = time;
            SND.screech && SND.screech();
          }
        } else if (e.state === "wind") {
          e.dir = Math.atan2(ux, uz);
          e.lx = ux;
          e.lz = uz;
          if (e.t > 0.55 / Math.sqrt(K)) (e.state = "lunge"), (e.t = 0);
        } else if (e.state === "lunge") {
          e.vx = e.lx * 12.5;
          e.vz = e.lz * 12.5;
          if (d < e.D.r + 0.65 && Math.abs(P.y - e.y) < 1.7) meleeHit(e, e.D.dmg);
          if (e.t > 0.34) (e.state = "recover"), (e.t = 0);
        } else if (e.state === "recover" && e.t > 0.55) (e.state = "hover"), (e.t = 0), (e.cd = 1.1 + Math.random() * 1.3);

      } else if (e.type === "mamua") {
        /* MAMUA: astiro hurbildu; desagertu eta Amaiurren ondoan agertu (atzean) → heldu (ALDARATU daiteke) */
        if (e.state === "drift") {
          want = e.D.speed * K * 0.6;
          wx = ux;
          wz = uz;
          e.dir = Math.atan2(ux, uz);
          e.cd -= dt * K;
          if (e.cd <= 0 && d < 11) (e.state = "fade"), (e.t = 0);
          else if (d < 2.3 && e.t > 0.4) (e.state = "wind"), (e.t = 0), (e.atk0 = time), (e.lx = ux), (e.lz = uz);
        } else if (e.state === "fade") {
          e.vx *= 0.8;
          e.vz *= 0.8;
          if (e.t > 0.32) {
            mamuaWarp(e, I);
            e.state = "appear";
            e.t = 0;
          }
        } else if (e.state === "appear") {
          e.dir = Math.atan2(ux, uz);
          if (e.t > 0.3) (e.state = "wind"), (e.t = 0), (e.atk0 = time), SND.screech && SND.screech();
        } else if (e.state === "wind") {
          e.dir = Math.atan2(ux, uz);
          e.lx = ux;
          e.lz = uz;
          if (e.t > 0.5 / Math.sqrt(K)) (e.state = "grab"), (e.t = 0);
        } else if (e.state === "grab") {
          e.vx = e.lx * 9;
          e.vz = e.lz * 9;
          if (d < e.D.r + 0.7 && Math.abs(P.y - e.y) < 1.8) meleeHit(e, e.D.dmg);
          if (e.t > 0.3) (e.state = "recover"), (e.t = 0);
        } else if (e.state === "recover" && e.t > 0.7) (e.state = "drift"), (e.t = 0), (e.cd = 2.2 + Math.random() * 1.5);
      } else if (e.type === "eye") {
        if (e.state === "hover") {
          const desired = 7,
            side = Math.sin(time * 0.7 + e.x) > 0 ? 1 : -1;
          want = e.D.speed * K;
          wx = ux * (d - desired) * 0.35 + -uz * side * 0.6;
          wz = uz * (d - desired) * 0.35 + ux * side * 0.6;
          e.dir = Math.atan2(ux, uz);
          e.cd -= dt;
          if (e.skel && d < 3.6 && e.blinkCd <= 0) blink(e, I);
          else if (e.cd <= 0 && d < 13) (e.state = "aim"), (e.t = 0);
        } else if (e.state === "aim") {
          e.dir = Math.atan2(ux, uz);
          if (e.t > 0.7) {
            /* gero eta zailago: hiru proiektileko haizea (txandaka) */
            const fan = K > 1.1 && (e.volley = (e.volley || 0) + 1) % 2 === 0;
            shoot(e, ux, uz, K);
            if (fan) {
              const a = Math.atan2(ux, uz);
              for (const s of [-0.32, 0.32]) shoot(e, Math.sin(a + s), Math.cos(a + s), K);
            }
            e.state = "hover";
            e.t = 0;
            e.cd = (1.9 + Math.random() * 0.8) / K;
          }
        }
      } else if (e.type === "brute") {
        if (e.state === "chase") {
          want = e.D.speed * K;
          wx = ux;
          wz = uz;
          e.dir = Math.atan2(ux, uz);
          e.cd -= dt * K;
          if (e.cd <= 0 && d > 3 && d < 12) (e.state = "wind"), (e.t = 0), (e.lx = ux), (e.lz = uz), (e.atk0 = time), telegraph(e);
          else if (d < 2.2 && e.t > 0.5) (e.state = "wind"), (e.t = 0.4), (e.lx = ux), (e.lz = uz), (e.atk0 = time), telegraph(e);
        } else if (e.state === "wind") {
          if (e.t > 0.9) (e.state = "charge"), (e.t = 0), SND.roar();
        } else if (e.state === "charge") {
          e.vx = e.lx * 14;
          e.vz = e.lz * 14;
          if (d < e.D.r + 0.6 && Math.abs(P.y - e.y) < 1.6) {
            meleeHit(e, e.D.dmg);
            if (e.state === "charge") (e.state = "recover"), (e.t = 0);
          }
          if (e.t > 1.1) (e.state = "recover"), (e.t = 0);
        } else if (e.state === "stun") {
          if (e.t > 1.7) (e.state = "chase"), (e.t = 0), (e.cd = 1.5);
        } else if (e.state === "recover" && e.t > 0.7) (e.state = "chase"), (e.t = 0), (e.cd = 1.8 + Math.random());
      }
      /* mugimendua: abiadura + bultzada (marruskadurarekin) */
      if (want > 0) {
        const n = Math.hypot(wx, wz) || 1;
        e.vx = mix(e.vx, (wx / n) * want, 1 - Math.exp(-dt * 6));
        e.vz = mix(e.vz, (wz / n) * want, 1 - Math.exp(-dt * 6));
      } else if (e.state !== "lunge" && e.state !== "charge") {
        e.vx *= Math.exp(-dt * 7);
        e.vz *= Math.exp(-dt * 7);
      }
      /* elkarren arteko tartea */
      for (const o of ENEMIES)
        if (o !== e && o.state !== "dead") {
          const ox = e.x - o.x,
            oz = e.z - o.z,
            od = Math.hypot(ox, oz),
            min = e.D.r + o.D.r;
          if (od < min && od > 0.001) {
            e.x += (ox / od) * (min - od) * 0.5;
            e.z += (oz / od) * (min - od) * 0.5;
          }
        }
      let nx = e.x + e.vx * dt,
        nz = e.z + e.vz * dt;
      /* eraikinak saihestu */
      for (const o of solids) {
        if (o.shapes) {
          for (const B of o.shapes) {
            const q = shapePush(B, nx, nz, e.D.r);
            if (q) [nx, nz] = q;
          }
          continue;
        }
        const ox = nx - o.x,
          oz = nz - o.z,
          od = Math.hypot(ox, oz);
        if (od < o.r + e.D.r && od > 0.001) {
          nx = o.x + (ox / od) * (o.r + e.D.r);
          nz = o.z + (oz / od) * (o.r + e.D.r);
        }
      }
      /* haranean (gaueko itzalak): lurraren gainean, ez ibaian ez herrian */
      if (e.terrain) [nx, nz] = terrainStep(e, nx, nz);
      /* zaindariak: hormetan zehar ez (irristatu) */
      if (e.type === "zaindari") [nx, nz] = sigWallPush(nx, nz, e.D.r * 0.8);
      /* gelaren barruan (hormaren kontra jo: zezena zorabiatuta) */
      if (I) {
        let out = false;
        if (I.rx) {
          const ex = (nx - I.x) / I.rx,
            ez = (nz - I.z) / I.rz,
            ee = Math.hypot(ex, ez);
          if (ee > 0.86) {
            nx = I.x + (ex / ee) * 0.86 * I.rx;
            nz = I.z + (ez / ee) * 0.86 * I.rz;
            out = true;
          }
        } else {
          const hw = I.w / 2 - 1.4,
            hd = I.d / 2 - 1.4,
            cx = clamp(nx, I.x - hw, I.x + hw),
            cz = clamp(nz, I.z - hd, I.z + hd);
          out = cx !== nx || cz !== nz;
          nx = cx;
          nz = cz;
        }
        if (out) {
          if (e.state === "charge") {
            e.state = "stun";
            e.t = 0;
            shake(0.3);
            SND.thud();
            fxBurst(nx, e.y + 1, nz, { n: 20, speed: 5, up: 3, life: 0.6, size: 0.3, color: "#c58bff", grav: 6 });
            notifyOnce("brute-stun", "Zezena zorabiatuta: orain bikoitza zauritzen da!", "Bestia aturdida: ¡ahora recibe doble daño!");
          }
        }
      }
      e.x = nx;
      e.z = nz;
      /* ikusmena */
      /* saguzarra: airean; murgilka behera, zorabiatuta lurrean */
      e.fly = e.type !== "bat" ? 0 : mix(e.fly ?? 1.7, e.stun > 0 ? 0.3 : e.state === "lunge" ? 0.95 : 1.75, 1 - Math.exp(-dt * (e.stun > 0 ? 9 : 7)));
      const bob = e.type === "eye" && !e.skel ? 1.9 + Math.sin(time * 2.4 + e.x) * 0.2 : e.type === "bat" ? e.fly + Math.sin(time * 5 + e.x) * 0.12 : e.type === "mamua" ? 0.35 + Math.sin(time * 2.2 + e.x) * 0.15 : 0;
      if (e.wings) {
        const f = e.stun > 0 ? 0.15 + Math.sin(time * 3) * 0.1 : Math.sin(time * (e.state === "lunge" ? 9 : 24) + e.x * 3) * 0.75;
        e.wings[0].rotation.z = f;
        e.wings[1].rotation.z = -f;
      }
      if (e.state !== "spawn") e.g.position.set(e.x, e.y + bob, e.z);
      e.g.rotation.y += Math.atan2(Math.sin(e.dir - e.g.rotation.y), Math.cos(e.dir - e.g.rotation.y)) * (1 - Math.exp(-dt * 10));
      const wind = e.state === "wind" || e.state === "aim";
      if (e.skel) {
        enemyAnim(e);
        e.g.rotation.z = e.state === "stun" ? Math.sin(time * 18) * 0.08 : 0;
        e.body.emissive.set(e.flash > 0 ? "#ffffff" : wind ? "#d0203e" : "#000000");
        e.body.emissiveIntensity = e.flash > 0 ? 2.4 : wind ? 0.35 + 0.35 * Math.sin(time * 30) : 0;
        e.rigid.emissive.copy(e.body.emissive);
        e.rigid.emissiveIntensity = e.body.emissiveIntensity;
        if (e.shine) e.shine.material.opacity = wind ? 1 : 0.75 + Math.sin(time * 5 + e.x) * 0.15;
      } else {
        const sq = wind ? 1 - 0.18 * Math.min(1, e.t / 0.4) : e.state === "lunge" || e.state === "charge" ? 1.15 : 1 + Math.sin(time * 6 + e.x) * 0.04;
        e.g.scale.set(e.D.S / Math.sqrt(sq), e.D.S * sq, e.D.S / Math.sqrt(sq));
        if (e.state === "stun") e.g.rotation.z = Math.sin(time * 18) * 0.12;
        else e.g.rotation.z = 0;
        e.body.emissive.set(e.flash > 0 ? "#ffffff" : wind ? "#c01a3c" : "#1a0626");
        e.body.emissiveIntensity = e.flash > 0 ? 2 : wind ? 0.7 + 0.6 * Math.sin(time * 30) : 0.6;
        if (e.type === "mamua") {
          /* desagertu / agertu (gardentasuna) eta barruko argi zurixka */
          e.vis = mix(e.vis ?? 1, e.state === "fade" ? 0 : 1, 1 - Math.exp(-dt * (e.state === "fade" ? 14 : 8)));
          if (!(e.flash > 0) && !wind) {
            e.body.emissive.set(e.counting > 0 ? "#7a6aff" : "#4a3a7a");
            e.body.emissiveIntensity = 0.55;
          }
          e.body.opacity = 0.86 * e.vis;
          e.g.visible = e.vis > 0.04;
        }
      }
      /* kolpearen zapalketa (punch): zabaldu eta zapaldu, segundo zati batean */
      if (e.punch > 0) {
        e.punch = Math.max(0, e.punch - dt);
        const k = e.punch / 0.13,
          sx = 1 + 0.2 * k,
          sy = 1 - 0.16 * k;
        if (e.skel) {
          e.gS ??= e.g.scale.x;
          e.g.scale.set(e.gS * sx, e.gS * sy, e.gS * sx);
        } else e.g.scale.set(e.g.scale.x * sx, e.g.scale.y * sy, e.g.scale.z * sx);
      } else if (e.skel && e.gS && e.g.scale.y !== e.gS) e.g.scale.setScalar(e.gS);
      const vulnerable = e.era === -1 || e.era === phase;
      e.shield.material.opacity = Math.max(vulnerable ? 0 : 0.85 + 0.15 * Math.sin(time * 5), e.shield.material.opacity - dt * 3);
      e.shield.material.uniforms.uA.value = e.shield.material.opacity;
      e.shield.visible = e.shield.material.opacity > 0.01;
      e.shield.material.uniforms.uT.value = time;
      e.aura.position.set(e.x, e.y + 0.04, e.z);
      e.aura.material.opacity = vulnerable ? 0.85 : 0.35;
      e.bar.visible = e.hp < e.max;
      e.bar.position.set(e.x, e.y + (e.skel ? e.H * 2 + 0.75 : e.type === "brute" ? 3.7 : e.type === "eye" ? 3.2 : e.type === "bat" ? 2.6 : 2.5), e.z);
      e.bar.quaternion.copy(camera.quaternion);
      e.fg.scale.x = Math.max(0.001, e.hp / e.max);
      e.fg.position.x = -(1 - e.fg.scale.x) / 2;
    }
    for (let i = ENEMIES.length - 1; i >= 0; i--)
      if (ENEMIES[i].state === "dead" && ENEMIES[i].t > (ENEMIES[i].skel ? 1.9 : 0.5)) {
        removeEnemy(ENEMIES[i]);
        ENEMIES.splice(i, 1);
      }
    shotsUpdate(dt);
    for (let i = MOTES.length - 1; i >= 0; i--) {
      const m = MOTES[i];
      m.t += dt;
      const dd = Math.hypot(P.x - m.x, P.z - m.z);
      if (m.t > 0.6 && dd < 6) {
        m.x = mix(m.x, P.x, 1 - Math.exp(-dt * 6));
        m.z = mix(m.z, P.z, 1 - Math.exp(-dt * 6));
      }
      m.m.position.set(m.x, m.y + Math.sin(m.t * 4) * 0.15, m.z);
      if (dd < 1 || m.t > 9) {
        if (dd < 1) {
          P.hp = Math.min(P.maxHp, P.hp + 1);
          SND.heal();
          fxBurst(P.x, P.y + 1, P.z, { n: 12, speed: 2, up: 2, life: 0.6, size: 0.25, color: "#9dffc4", grav: -1 });
          hud();
        }
        scene.remove(m.m);
        MOTES.splice(i, 1);
      }
    }
  }
  /* hezurduraren animazioa egoeraren arabera */
  function enemyAnim(e) {
    const sp = Math.hypot(e.vx, e.vz);
    let name = "Idle_Combat",
      ts = 1,
      once = false;
    switch (e.state) {
      case "spawn":
        return;
      case "chase":
      case "hover":
        if (sp > 3.4) (name = "Running_C"), (ts = clamp(sp / 4.6, 0.8, 1.6));
        else if (sp > 0.5) (name = "Walking_D_Skeletons"), (ts = clamp(sp / 1.4, 0.8, 2.2));
        break;
      case "wind":
        if (e.type === "brute") (name = "Taunt"), (ts = 1.15), (once = true);
        else (name = "1H_Melee_Attack_Chop"), (ts = 1.25), (once = true);
        break;
      case "lunge":
        (name = "1H_Melee_Attack_Chop"), (ts = 1.25), (once = true);
        break;
      case "charge":
        (name = "Running_C"), (ts = 1.9);
        break;
      case "aim":
        (name = "Spellcast_Shoot"), (ts = 1.3), (once = true);
        break;
      case "stun":
        (name = "Hit_A"), (ts = 0.5);
        break;
      /* zaindariak (sigiloa.js): geldi begira, lo (lurrean etzanda) eta esnatu (lurretik altxatu) */
      case "look":
        (name = "Idle_Combat"), (ts = 0.65);
        break;
      case "sleep":
        (name = "Death_C_Skeletons"), (ts = 1.1), (once = true);
        break;
      case "wake":
        (name = "Spawn_Ground_Skeletons"), (ts = 2.85), (once = true);
        break;
    }
    if (e.hitT > 0 && (e.state === "chase" || e.state === "hover" || e.state === "recover")) (name = "Hit_A"), (ts = 1.8), (once = true);
    enAnim(e, name, ts, once, name === "Hit_A" ? 0.06 : 0.18);
  }
  /* hezurdun sorgina: hurbiltzen bazara, teleportatu egiten da */
  function blink(e, I) {
    e.blinkCd = 4.5;
    fxBurst(e.x, e.y + 1, e.z, { n: 18, speed: 4, up: 2, life: 0.5, size: 0.3, color: ERA_COL[e.era < 0 ? 2 : e.era], grav: 1 });
    for (let k = 0; k < 16; k++) {
      const a = Math.random() * TAU,
        r = 7 + Math.random() * 3,
        x = P.x + Math.cos(a) * r,
        z = P.z + Math.sin(a) * r;
      if (I && (I.rx ? ((x - I.x) / I.rx) ** 2 + ((z - I.z) / I.rz) ** 2 > 0.62 : Math.abs(x - I.x) > I.w / 2 - 3 || Math.abs(z - I.z) > I.d / 2 - 3)) continue;
      if (solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1.2)) continue;
      e.x = x;
      e.z = z;
      break;
    }
    e.vx = e.vz = 0;
    e.cd = Math.min(e.cd, 0.6);
    fxRing(e.x, e.y + 0.1, e.z, ERA_COL[e.era < 0 ? 2 : e.era], 2, 0.4);
    SND.shot();
  }
  /* mamua: Amaiurren atzean edo alboan agertu (lur gainean, gelaren barruan) */
  function mamuaWarp(e, I) {
    fxBurst(e.x, e.y + 1, e.z, { n: 14, speed: 2.5, up: 1, life: 0.5, size: 0.3, color: "#d9c8ff", grav: -0.5 });
    for (let k = 0; k < 14; k++) {
      const a = P.angle + PI + (Math.random() - 0.5) * (k < 7 ? 1.6 : 4),
        r = 2.4 + Math.random() * 0.8,
        x = P.x + Math.sin(a) * r,
        z = P.z + Math.cos(a) * r;
      if (I && (I.rx ? ((x - I.x) / I.rx) ** 2 + ((z - I.z) / I.rz) ** 2 > 0.7 : Math.abs(x - I.x) > I.w / 2 - 1.5 || Math.abs(z - I.z) > I.d / 2 - 1.5)) continue;
      if (solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.9)) continue;
      const g = support(x, z, e.y + 1.2);
      if (!g || Math.abs(topY(g, x, z) - e.y) > 1.2) continue;
      e.x = x;
      e.z = z;
      e.y = topY(g, x, z);
      break;
    }
    e.vx = e.vz = 0;
    SND.whoosh();
  }
  const TELE = [];
  let teleGeo = null;
  function telegraph(e) {
    if (!teleGeo) {
      teleGeo = new T.PlaneGeometry(1.7, 1);
      teleGeo.rotateX(-PI / 2);
      teleGeo.translate(0, 0, 0.5);
    }
    const m = new T.Mesh(teleGeo, new T.MeshBasicMaterial({ color: "#ff4d6d", transparent: true, opacity: 0.5, depthWrite: false }));
    m.renderOrder = 3;
    scene.add(m);
    TELE.push({ m, e, t: 0 });
  }
  function shoot(e, ux, uz, K = 1) {
    const y0 = e.y + (e.skel ? 1.9 : 1.4),
      m = orb(e.x + ux * 0.6, y0, e.z + uz * 0.6, 0.26, ERA_COL[e.era < 0 ? 2 : e.era]);
    m.castShadow = false;
    SHOTS.push({ m, x: e.x + ux * 0.6, z: e.z + uz * 0.6, y: y0, vx: ux * 8.5 * K, vz: uz * 8.5 * K, sp: 8.5 * K, t: 0, era: e.era, from: e });
    SND.shot();
  }
  /* ESTALPEA: zutabeek, kutxek eta harriek itzalen proiektilak geldiarazten dituzte (ezkutatu atzean!) */
  function shotCover(s) {
    for (const o of solids) {
      if (o.r < 0.35 || o.noCover) continue;
      const top = o.y + (phase === 0 || o.pillar ? o.h : o.h * 0.19);
      if (s.y > top + 0.15 || s.y < o.y - 0.3 || Math.hypot(s.x - o.x, s.z - o.z) > o.r + 0.2) continue;
      fxBurst(s.x, s.y, s.z, { n: 10, speed: 3.5, life: 0.3, size: 0.22, color: "#e8e2d4", grav: 4 });
      SND.clang(0.35);
      if (!COACH.seen.has("estalpea")) {
        coachDone("estalpea");
        notify(L("ESTALPEA: zutabeek eta kutxek proiektilak geldiarazten dituzte. Ezkutatu atzean!"), "", 3.5);
      }
      return true;
    }
    return false;
  }
  /* EZKUTUA: INDARRA kargatzean, aurretik datozen proiektilak itzultzen dira (jaurtitzailearengana) */
  function shieldBlocks(s) {
    if (s.back || !MAG.charging || MAG.charge < 0.12) return false;
    const dx = s.x - P.x,
      dz = s.z - P.z;
    if (Math.hypot(dx, dz) > 1.8 || Math.abs(s.y - (P.y + 1.1)) > 1.7) return false;
    const a = Math.atan2(dx, dz);
    return Math.abs(Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle))) < 1.3;
  }
  function reflectShot(s) {
    s.back = true;
    s.t = 0;
    const src = s.from && s.from.state !== "dead" ? s.from : s.rock && BOSS.on ? BOSS.center() : null;
    let ux = Math.sin(P.angle),
      uz = Math.cos(P.angle);
    if (src) {
      const dx = src.x - s.x,
        dz = src.z - s.z,
        d = Math.hypot(dx, dz) || 1;
      ux = dx / d;
      uz = dz / d;
      if (s.rock) {
        /* harkaitza: parabola Basajaunengana (~0.9 s) */
        s.sp = clamp(d / 0.9, 8, 26);
        s.vy = 5.2;
        s.y = Math.max(s.y, P.y + 1.4);
      }
    }
    if (!s.rock) s.sp = Math.max(13, (s.sp || 9) * 1.6);
    s.vx = ux * s.sp;
    s.vz = uz * s.sp;
    MAG.shieldFlash = 0.6;
    SND.clang();
    fxRing(s.x, s.y, s.z, "#ffffff", 1.8, 0.3);
    fxBurst(s.x, s.y, s.z, { n: 14, speed: 4, life: 0.35, size: 0.24, color: "#ffffff", grav: 0 });
    haptic(20);
    hitStop = Math.max(hitStop, 0.05);
    coachDone("shield");
    notifyOnce("shield-ok", L("EZKUTUA: proiektila itzuli duzu!"), "");
  }
  /* itzulitako proiektila: etsaiak zorabiatu eta zauritu; harkaitzak Basajaun zorabiatzen du */
  function backHits(s) {
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      if (Math.hypot(e.x - s.x, e.z - s.z) < e.D.r + 0.45 && Math.abs(e.y + e.H - s.y) < 2) {
        e.stun = Math.max(e.stun, 1.4);
        hitEnemy(e, s.rock ? 3 : 2, s.vx / (s.sp || 1), s.vz / (s.sp || 1));
        return true;
      }
    }
    if (s.rock && BOSS.canStagger()) {
      const c = BOSS.center();
      if (Math.hypot(c.x - s.x, c.z - s.z) < (c.r || 2.6) && s.y < (c.h || 7)) {
        BOSS.stagger();
        return true;
      }
    }
    /* izarra (Inguma): hegan dagoen jaurtitzailea jo */
    if (s.star && BOSS.canStagger()) {
      const c = BOSS.center();
      if (Math.hypot(c.x - s.x, c.z - s.z) < (c.r || 2.6) && s.y > c.y - 1.5 && s.y < c.y + (c.h || 4)) {
        BOSS.stagger();
        return true;
      }
    }
    return false;
  }
  function shotsUpdate(dt) {
    for (let i = SHOTS.length - 1; i >= 0; i--) {
      const s = SHOTS[i];
      s.t += dt;
      if (shieldBlocks(s)) reflectShot(s);
      /* Basajaunen harkaitzak: parabola, lurra jotzean apurtu (eremu txiki bat zauritzen du) */
      if (s.rock) {
        s.vy -= 16 * dt;
        s.x += s.vx * dt;
        s.z += s.vz * dt;
        s.y += s.vy * dt;
        s.m.position.set(s.x, s.y, s.z);
        s.m.rotation.x += dt * 5;
        s.m.rotation.z += dt * 3;
        const hitP = !s.back && Math.hypot(P.x - s.x, P.z - s.z) < 1.1 && Math.abs(P.y + 1 - s.y) < 1.3,
          hitB = s.back && backHits(s);
        /* s.floor: zoruaren altuera (gela garaietan); s.fire: su-bola (Herensugea) */
        const fl = s.floor || 0;
        if (s.y < fl + 0.5 || hitP || hitB || s.t > 4) {
          fxBurst(s.x, Math.max(fl + 0.3, s.y), s.z, s.fire ? { n: 26, speed: 5.5, up: 3.5, life: 0.7, size: 0.4, color: "#ff8a2a", grav: -1 } : { n: 22, speed: 5, up: 3, life: 0.6, size: 0.32, color: "#9a8a6a", grav: 9 });
          s.fire ? SND.flame() : SND.crumble();
          if (s.fire && s.onLand) s.onLand(s);
          if (!s.back && (hitP || (Math.hypot(P.x - s.x, P.z - s.z) < 1.9 && P.y < fl + 1.2))) playerHit(1, s.x, s.z);
          scene.remove(s.m);
          if (s.m.parent) s.m.parent.remove(s.m);
          SHOTS.splice(i, 1);
        }
        continue;
      }
      if (s.t < 0.35 && !s.radial && !s.back) {
        const dx = P.x - s.x,
          dz = P.z - s.z,
          d = Math.hypot(dx, dz) || 1;
        s.vx = mix(s.vx, (dx / d) * s.sp, dt * 2);
        s.vz = mix(s.vz, (dz / d) * s.sp, dt * 2);
      }
      /* itzulitako izarra: jaurtitzailearengana gidatua (hegan dabil) */
      if (s.back && s.star && s.from) {
        const hx = s.from.x - s.x,
          hz = s.from.z - s.z,
          hd = Math.hypot(hx, hz) || 1;
        s.vx = mix(s.vx, (hx / hd) * s.sp, Math.min(1, dt * 6));
        s.vz = mix(s.vz, (hz / hd) * s.sp, Math.min(1, dt * 6));
        s.y = mix(s.y, s.from.y + 1, Math.min(1, dt * 4));
      }
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      if (!s.radial && !s.back) s.y = mix(s.y, P.y + 1, dt * 2);
      s.m.position.set(s.x, s.y, s.z);
      s.m.scale.setScalar(1 + Math.sin(s.t * 20) * 0.15);
      let gone = s.t > 3.5;
      if (s.back) {
        if (backHits(s)) gone = true;
      } else if (Math.hypot(P.x - s.x, P.z - s.z) < 0.75 && Math.abs(P.y + 1 - s.y) < 1.2) {
        playerHit(1, s.x - s.vx, s.z - s.vz);
        gone = true;
      } else if (shotCover(s)) gone = true;
      if (gone) {
        scene.remove(s.m);
        SHOTS.splice(i, 1);
      }
    }
    for (let i = TELE.length - 1; i >= 0; i--) {
      const T0 = TELE[i],
        e = T0.e;
      T0.t += dt;
      const len = 14;
      T0.m.position.set(e.x, e.y + 0.06, e.z);
      T0.m.rotation.y = Math.atan2(e.lx, e.lz);
      T0.m.scale.set(1, 1, len * Math.min(1, T0.t / 0.25));
      T0.m.material.opacity = 0.25 + 0.3 * Math.abs(Math.sin(time * 14));
      if (e.state !== "wind") {
        scene.remove(T0.m);
        TELE.splice(i, 1);
      }
    }
  }
  /* jokalaria zauritua (bultzada bitartean ukiezina) */
  function playerHit(dmg, fx, fz) {
    if (damageTime > 0 || respawnTimer || P.dashT > 0 || MAG.spinT < 0.3 || GET.on) return;
    climbDrop();
    P.hp -= dmg;
    comboBreak();
    damageTime = 1.05;
    const dx = P.x - fx,
      dz = P.z - fz,
      d = Math.hypot(dx, dz) || 1;
    P.vx = (dx / d) * 9;
    P.vz = (dz / d) * 9;
    P.vy = Math.max(P.vy, 4);
    P.grounded = false;
    FB.hurt();
    haptic(45);
    hud();
    if (P.hp <= 0 && !potionSave()) fall(true);
  }
  /* ==================================================================
     ALDARATU · etsaiaren kolpea desbideratu (une zehatzean)
     Kolpea iristen den unean SORGINKERIA sakatu, etsaiari begira: kolpea
     desbideratzen da, etsaia zorabiatuta geratzen da eta une batez kalte
     bikoitza jasotzen du. Segidan sakatzeak (zalaparta) ez du balio.
     EZKUTUA altxatuta (INDARRA kargatzen): kolpea geldiarazten du, baina
     karga galtzen da eta Amaiur atzera bultzatuta.
     ================================================================== */
  const GUARD = { since: 9, win: 0, safe: 0, n: 0, blocks: 0, pressT: -9 };
  const PARRY_WIN = 0.24,
    PARRY_SPAM = 0.6;
  /* sakatze fisiko bakoitzean (ez buffer-ak): leihoa ireki, aurreko sakatzea urrun badago */
  function guardPress() {
    GUARD.win = GUARD.since > PARRY_SPAM ? PARRY_WIN : 0;
    GUARD.since = 0;
    GUARD.pressT = time;
  }
  function guardUpdate(dt) {
    GUARD.since += dt;
    GUARD.win = Math.max(0, GUARD.win - dt);
    GUARD.safe = Math.max(0, GUARD.safe - dt);
  }
  function facing(x, z, lim) {
    const a = Math.atan2(x - P.x, z - P.z);
    return Math.abs(Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle))) < lim;
  }
  /* etsaiaren gorputz-kolpea (ezpata, oldarraldia): aldaratu, blokeatu edo zauria */
  function meleeHit(e, dmg) {
    if (GUARD.safe > 0 || damageTime > 0 || respawnTimer || P.dashT > 0 || MAG.spinT < 0.3 || GET.on) return;
    /* sakatzea etsaiaren erasoa hasi ondoren izan behar da (erreakzioa, ez zorizko tiroa) */
    const front = facing(e.x, e.z, 1.75);
    if (front && GUARD.win > 0 && GUARD.pressT >= (e.atk0 ?? -1e9)) return parry(e);
    if (front && MAG.charging && MAG.charge > 0.12) return guardBlock(e, dmg);
    playerHit(dmg, e.x, e.z);
  }
  function parry(e) {
    GUARD.win = 0;
    GUARD.safe = 0.4;
    GUARD.n++;
    const dx = e.x - P.x,
      dz = e.z - P.z,
      d = Math.hypot(dx, dz) || 1,
      cx = P.x + (dx / d) * 0.9,
      cy = P.y + 1.2,
      cz = P.z + (dz / d) * 0.9;
    if (e.type === "brute") (e.state = "stun"), (e.t = 0);
    else (e.state = "recover"), (e.t = -1);
    e.stun = Math.max(e.stun, 1.6);
    e.parried = 2.4;
    e.vx = (dx / d) * (9 / e.D.mass);
    e.vz = (dz / d) * (9 / e.D.mass);
    P.vx = -(dx / d) * 2.5;
    P.vz = -(dz / d) * 2.5;
    P.dashReady = true;
    P.dashes = Math.max(P.dashes, 1);
    hitStop = Math.max(hitStop, 0.13);
    slowmo = Math.max(slowmo, 0.3);
    shake(0.16);
    haptic(35);
    SND.parry();
    MAG.shieldMat.opacity = 0.95;
    MAG.shieldFlash = 0.8;
    fxRing(cx, cy, cz, "#fff1a8", 2.6, 0.35);
    fxBurst(cx, cy, cz, { n: 26, speed: 6, up: 1, life: 0.4, size: 0.28, color: "#fff1a8", grav: 2 });
    damageNumber(e, L("ALDARATUA!"), "#fff1a8");
    coachDone("parry");
    notifyOnce("aldaratu", L("ALDARATUA! Etsaia zorabiatuta: orain kalte bikoitza jasotzen du."), "");
  }
  function guardBlock(e, dmg) {
    GUARD.safe = 0.35;
    GUARD.blocks++;
    const dx = e.x - P.x,
      dz = e.z - P.z,
      d = Math.hypot(dx, dz) || 1;
    if (e.state === "lunge" || e.state === "charge") (e.state = "recover"), (e.t = 0);
    e.vx = (dx / d) * (5 / e.D.mass);
    e.vz = (dz / d) * (5 / e.D.mass);
    P.vx = -(dx / d) * (dmg >= 2 ? 10 : 7);
    P.vz = -(dz / d) * (dmg >= 2 ? 10 : 7);
    MAG.charge = 0;
    MAG.shieldFlash = 0.6;
    SND.clang(1.2);
    shake(0.12);
    haptic(25);
    hitStop = Math.max(hitStop, 0.05);
    fxBurst(P.x + (dx / d) * 0.9, P.y + 1.2, P.z + (dz / d) * 0.9, { n: 16, speed: 4, life: 0.3, size: 0.24, color: "#ffffff", grav: 2 });
    notifyOnce("blokeatu", L("EZKUTUA: kolpea geldiarazi duzu (karga galduta). Une zehatzean sakatuz gero: ALDARATU!"), "");
  }
  /* zorabiatuta: izar-distira buruaren gainean */
  function parriedUpdate(e, dt) {
    e.parried = Math.max(0, e.parried - dt);
    if (!e.dizzy) {
      e.dizzy = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#fff1a8", transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      e.dizzy.scale.setScalar(0.7);
      scene.add(e.dizzy);
    }
    const a = time * 7;
    e.dizzy.visible = e.parried > 0 && e.state !== "dead";
    e.dizzy.position.set(e.x + Math.cos(a) * 0.45, e.y + (e.H || 1.1) * 2 + 0.35, e.z + Math.sin(a) * 0.45);
    e.dizzy.material.opacity = Math.min(1, e.parried * 2) * (0.7 + 0.3 * Math.sin(time * 20));
  }
  function damageNumber(e, n, col) {
    let el = NUMS.find((x) => x.t > 0.7);
    if (!el) {
      if (NUMS.length > 10) return;
      const d = document.createElement("div");
      d.className = "dmg";
      $("hud").appendChild(d);
      el = { d, t: 9 };
      NUMS.push(el);
    }
    el.t = 0;
    el.x = e.x;
    el.y = e.y + e.H * 2 + 0.3;
    el.z = e.z;
    el.d.textContent = n;
    el.d.style.color = col || (n >= 3 ? "#fff1a8" : "#ffffff");
  }
  function numbersUpdate(dt) {
    const v = new T.Vector3();
    for (const n of NUMS) {
      n.t += dt;
      if (n.t > 0.7) {
        n.d.style.opacity = 0;
        continue;
      }
      v.set(n.x, n.y + n.t * 1.2, n.z).project(camera);
      n.d.style.opacity = 1 - n.t / 0.7;
      n.d.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${1 + Math.max(0, 0.15 - n.t) * 4})`;
    }
  }
  const NOTE_ONCE = new Set();
  function notifyOnce(id, eu, es) {
    if (NOTE_ONCE.has(id)) return;
    NOTE_ONCE.add(id);
    notify(eu, es, 3);
  }
  /* --------------------------- sariak (arena bakoitzaren ondoren) --------------------------- */
  const BOONS = [
    ["heart", "ARNASA SAKONA", "ALIENTO PROFUNDO", "+1 bizitza gehienez.", "+1 de vida máxima."],
    ["sharp", "MAKILA ZORROTZA", "VARA AFILADA", "Izpi hirukoitzek eta INDARRAk +1 kalte egiten dute.", "Los rayos triples y la INDARRA hacen +1 de daño."],
    ["wave", "GARAI-UHIN HANDIA", "GRAN ONDA DE ÉPOCA", "Garaia aldatzean uhin zabalagoa eta indartsuagoa.", "Al cambiar de época, la onda es más amplia y fuerte."],
    ["dash", "AIREKO BULTZADA BIKOITZA", "DOBLE DASH AÉREO", "Bi BULTZADA airean, lurrera jaitsi gabe.", "Dos DASH en el aire sin tocar el suelo."],
  ];
  function offerBoon(i) {
    if (!started) return;
    const pool = BOONS.filter((b) => !saved.boons.includes(b[0]));
    if (!pool.length) return;
    const pick = pool.sort(() => Math.random() - 0.5).slice(0, 2);
    dialog(
      "IRATI",
      "Hartu nire oparia.",
      "Toma mi regalo.",
      pick.map((b) => L(b[1], b[2]) + " — " + L(b[3], b[4])).join("\n\n"),
      pick.map((b) => L(b[1], b[2]) + " — " + L(b[3], b[4])).join("\n\n"),
      pick.map((b) => [
        L(b[1], b[2]),
        () => {
          saved.boons.push(b[0]);
          updateMaxHp();
          P.hp = P.maxHp;
          persist();
          SND.memory();
          hud();
        },
      ]),
    );
  }
