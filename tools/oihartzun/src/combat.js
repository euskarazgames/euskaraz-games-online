  /* ==================================================================
     BORROKA · Amaiurren makila magikoa eta Gauekoren itzalak
     · Konboa (3 kolpe), auto-helburua, DASH-kolpea eta garai-uhina.
     · Itzal bakoitza garai batean bakarrik zauritzen da: begi urreak →
       iragana, begi urdinak → oraina, morea → biak. Beste garaian ezkutua du.
     ================================================================== */
  const ENEMIES = [],
    SHOTS = [];
  /* S: eskala bisuala (kamera urrun dago: siluetak handiak eta argiak) */
  const EN_DEF = {
    grunt: { hp: 3, speed: 3.6, r: 0.9, dmg: 1, mass: 1, S: 1.55 },
    eye: { hp: 2, speed: 2.9, r: 0.8, dmg: 1, mass: 0.7, S: 1.5 },
    brute: { hp: 7, speed: 2.3, r: 1.4, dmg: 2, mass: 2.6, S: 1.45 },
  };
  const ERA_COL = ["#ffb85c", "#7fe9ff", "#c98bff"];
  const ATK = { n: 0, t: 9, chain: 0, buf: 0, dir: 0, hitSet: new Set(), waveCd: 0, lungeT: 0, dashStrike: 0, slash: null, hold: false };
  const NUMS = [];
  let combatMat = null;
  function combatLevel() {
    return ARENA.state === "fight" || ENEMIES.some((e) => e.state !== "dead") ? 2 : 1;
  }
  function enemiesAlive() {
    return ENEMIES.filter((e) => e.state !== "dead").length;
  }
  /* --------------------------- itzalen eredua --------------------------- */
  function enemyMesh(type, era) {
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
    /* garai-ezkutua: beste garaian dagoenean ikusten da */
    const shield = new T.Mesh(
      new T.IcosahedronGeometry(1, 3),
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { uC: { value: new T.Color(ERA_COL[era < 0 ? 2 : era]) }, uA: { value: 0 }, uT: { value: 0 } },
        vertexShader: "varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}",
        fragmentShader: "uniform vec3 uC;uniform float uA,uT;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(vN,vV)),2.6);float hex=step(.86,fract(vP.y*6.+uT*.6))*.25;gl_FragColor=vec4(uC,(f+hex*f)*uA);}",
      }),
    );
    shield.material.opacity = 0;
    const R = (EN_DEF[type].r / EN_DEF[type].S) * 1.35;
    shield.scale.set(R, R * 1.1, R);
    shield.position.y = type === "eye" ? 0 : R * 0.8;
    g.add(shield);
    const aura = new T.Mesh(new T.RingGeometry(EN_DEF[type].r * 0.9, EN_DEF[type].r * 1.25, 28), new T.MeshBasicMaterial({ color: ERA_COL[era < 0 ? 2 : era], transparent: true, opacity: 0.7, depthWrite: false }));
    aura.rotation.x = -PI / 2;
    /* bizitza-barra */
    const bar = new T.Group(),
      bg = new T.Mesh(new T.PlaneGeometry(1, 0.11), new T.MeshBasicMaterial({ color: "#16091f", transparent: true, opacity: 0.75, depthTest: false })),
      fg = new T.Mesh(new T.PlaneGeometry(1, 0.11), new T.MeshBasicMaterial({ color: ERA_COL[era < 0 ? 2 : era], depthTest: false }));
    fg.position.z = 0.001;
    bar.add(bg, fg);
    bar.renderOrder = fg.renderOrder = bg.renderOrder = 9;
    scene.add(g, aura, bar);
    return { g, body, eye, shield, aura, bar, fg };
  }
  function spawnEnemy(type, era, x, z, y) {
    const D = EN_DEF[type],
      M = enemyMesh(type, era),
      e = { type, era, x, z, y, vx: 0, vz: 0, hp: D.hp, max: D.hp, state: "spawn", t: 0, cd: 1 + Math.random(), dir: 0, flash: 0, stun: 0, island: currentStage, ...M, D };
    e.g.position.set(x, y - 1.5, z);
    ENEMIES.push(e);
    fxRing(x, y + 0.05, z, "#8a3dff", 2.2, 0.6);
    fxBurst(x, y + 0.2, z, { n: 14, speed: 2.5, up: 3, life: 0.7, size: 0.3, color: "#6d28c9", grav: 2 });
    return e;
  }
  function removeEnemy(e) {
    scene.remove(e.g, e.aura, e.bar);
    e.body.dispose();
  }
  function clearEnemies() {
    for (const e of ENEMIES) removeEnemy(e);
    ENEMIES.length = 0;
    for (const s of SHOTS) scene.remove(s.m);
    SHOTS.length = 0;
  }
  function spawnWave(list, island = ARENA.island) {
    const I = ISLANDS[island];
    for (const [type, era, n] of list)
      for (let k = 0; k < n; k++) {
        let best = null;
        for (let tries = 0; tries < 30; tries++) {
          const a = Math.random() * TAU,
            r = 0.25 + Math.random() * 0.5,
            x = I.x + Math.cos(a) * I.rx * r,
            z = I.z + Math.sin(a) * I.rz * r;
          if (Math.hypot(x - P.x, z - P.z) < 5.5) continue;
          if (solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1.4)) continue;
          if (ENEMIES.some((o) => Math.hypot(x - o.x, z - o.z) < 2.2)) continue;
          best = [x, z];
          break;
        }
        if (best) spawnEnemy(type, era, best[0], best[1], I.y).island = island;
      }
  }
  /* --------------------------- jokalariaren erasoa --------------------------- */
  function attack() {
    if (!started || paused || ascent || respawnTimer || CRAFT.on) return;
    if (ATK.t < 0.17) {
      ATK.buf = 0.25; /* konboa: sakatze goiztiarra gorde */
      return;
    }
    ATK.n = ATK.t < 0.55 && ATK.chain < 3 ? ATK.chain + 1 : 1;
    ATK.chain = ATK.n;
    ATK.t = 0;
    ATK.hitSet.clear();
    ATK.dashStrike = P.dashT > 0 ? 1 : 0;
    if (P.dashT > 0) P.dashT = 0.01;
    /* auto-helburua: sarrerako norabidean edo hurbilena (4.5 m) */
    let d = direction(),
      best = null,
      bs = 1e9;
    const len = Math.hypot(d.x, d.z);
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      const dx = e.x - P.x,
        dz = e.z - P.z,
        dd = Math.hypot(dx, dz);
      if (dd > 4.8) continue;
      const align = len > 0.2 ? (dx * d.x + dz * d.z) / (dd * len || 1) : 0;
      const score = dd - align * 1.6;
      if (score < bs) (bs = score), (best = e);
    }
    if (bossTarget()) {
      const dx = 0 - P.x,
        dz = -179 - P.z,
        dd = Math.hypot(dx, dz);
      if (dd < 6 && dd < bs) best = { x: 0, z: -179 };
    }
    if (best) P.angle = Math.atan2(best.x - P.x, best.z - P.z);
    else if (len > 0.2) P.angle = Math.atan2(d.x, d.z);
    ATK.dir = P.angle;
    ATK.lungeT = best ? Math.min(0.1, Math.max(0, Math.hypot(best.x - P.x, best.z - P.z) - 1.7) / 10) : 0.035;
    slashFx(ATK.n, ATK.dashStrike);
    SND.swing(ATK.n);
    squash(ATK.n === 3 ? -1.6 : -0.8);
    coachDone("attack");
  }
  function bossTarget() {
    return saved.stage === 5 && !saved.ending && boss.state === "open" && boss.hitLock <= 0;
  }
  function slashFx(n, strong) {
    if (!ATK.slash) {
      const geo = new T.RingGeometry(0.9, 2.9, 40, 1, -1.2, 2.4);
      geo.rotateX(-PI / 2);
      ATK.slash = new T.Mesh(geo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      ATK.slash.renderOrder = 7;
      scene.add(ATK.slash);
      const g2 = new T.RingGeometry(0.4, 2.9, 48);
      g2.rotateX(-PI / 2);
      ATK.spin = new T.Mesh(g2, ATK.slash.material.clone());
      ATK.spin.renderOrder = 7;
      scene.add(ATK.spin);
    }
    ATK.slashT = 0;
    ATK.slashN = n;
    const c = strong ? "#ffffff" : phase ? "#9ff4ff" : "#ffd58c";
    ATK.slash.material.color.set(c);
    ATK.spin.material.color.set(c);
  }
  function attackUpdate(dt) {
    ATK.t += dt;
    ATK.waveCd = Math.max(0, ATK.waveCd - dt);
    if (ATK.buf > 0) {
      ATK.buf -= dt;
      if (ATK.t >= 0.17) {
        ATK.buf = 0;
        attack();
      }
    }
    if (ATK.t > 0.75) ATK.chain = 0;
    /* botoia sakatuta: konboa bera jarraitzen da */
    if (ATK.hold && ATK.t > 0.3 && !paused) attack();
    /* kolpe-eremua: 0.05–0.16 s artean */
    if (ATK.t > 0.04 && ATK.t < 0.17 && ATK.n) {
      const spin = ATK.n === 3,
        R = spin ? 3 : ATK.dashStrike ? 3.1 : 2.6,
        dmg = (spin ? 2 : 1) + (ATK.dashStrike ? 1 : 0) + (saved.boons?.includes("sharp") ? 1 : 0) * (spin ? 1 : 0);
      for (const e of ENEMIES) {
        if (e.state === "dead" || e.state === "spawn" || ATK.hitSet.has(e)) continue;
        const dx = e.x - P.x,
          dz = e.z - P.z,
          dd = Math.hypot(dx, dz);
        if (dd > R + e.D.r || Math.abs(e.y + (e.type === "eye" ? 1.9 : 0.8) - (P.y + 0.9)) > 2.4) continue;
        if (!spin) {
          const a = Math.atan2(dx, dz),
            diff = angDiff(a, ATK.dir);
          if (diff > 1.25 && dd > e.D.r + 0.4) continue;
        }
        ATK.hitSet.add(e);
        hitEnemy(e, dmg, dx / (dd || 1), dz / (dd || 1));
      }
      if (bossTarget() && !ATK.hitSet.has(boss) && Math.hypot(P.x, P.z + 179) < R + 1.6) {
        ATK.hitSet.add(boss);
        bossStrike();
      }
    }
    /* VFX */
    if (ATK.slash) {
      ATK.slashT = (ATK.slashT ?? 9) + dt;
      const k = ATK.slashT / 0.16,
        spin = ATK.slashN === 3;
      ATK.slash.visible = !spin && k < 1;
      ATK.spin.visible = spin && k < 1.3;
      const s = ATK.slashN === 2 ? -1 : 1;
      ATK.slash.position.set(P.x, P.y + 0.9, P.z);
      ATK.slash.rotation.set(0, ATK.dir + s * (0.9 - k * 1.6) * 0.35, 0);
      ATK.slash.scale.set(s, 1, 1);
      ATK.slash.material.opacity = Math.max(0, 1 - k * k) * 1;
      ATK.spin.position.set(P.x, P.y + 0.7, P.z);
      ATK.spin.scale.setScalar(0.6 + k * 0.6);
      ATK.spin.material.opacity = Math.max(0, 1 - k / 1.3) * 0.8;
    }
  }
  /* erasoaren animazio prozedurala: gorputzaren biraketa (KayKit pertsonaiak ez du eraso-animaziorik) */
  function attackPose() {
    if (ATK.t > 0.4 || !ATK.n) return 0;
    const t = ATK.t;
    if (ATK.n === 3) return t < 0.3 ? smooth01(t / 0.3) * TAU : 0;
    const s = ATK.n === 2 ? -1 : 1;
    if (t < 0.05) return s * -0.7 * (t / 0.05);
    if (t < 0.17) return s * mix(-0.7, 0.95, smooth01((t - 0.05) / 0.12));
    return s * 0.95 * (1 - smooth01((t - 0.17) / 0.23));
  }
  function hitEnemy(e, dmg, nx, nz) {
    if (e.era !== -1 && e.era !== phase) {
      /* ezkutua: beste garaian dago */
      e.shield.material.opacity = 1.6;
      fxBurst(e.x, e.y + 0.9, e.z, { n: 10, speed: 5, life: 0.3, size: 0.22, color: ERA_COL[e.era], grav: 3 });
      SND.clang();
      haptic(12);
      e.vx += nx * 3;
      e.vz += nz * 3;
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
    const mult = e.state === "stun" ? 2 : 1;
    e.hp -= dmg * mult;
    e.flash = 0.1;
    const kb = (dmg >= 2 ? 9 : 5.5) / e.D.mass;
    e.vx += nx * kb;
    e.vz += nz * kb;
    if (e.state === "wind" && e.type !== "brute") {
      e.state = "recover";
      e.t = 0;
    }
    hitStop = Math.max(hitStop, dmg >= 2 ? 0.07 : 0.045);
    shake(dmg >= 2 ? 0.2 : 0.1);
    haptic(dmg >= 2 ? 18 : 9);
    fxBurst(e.x, e.y + (e.type === "eye" ? 1.4 : 0.8), e.z, { n: 10 + dmg * 5, speed: 5, life: 0.4, size: 0.26, color: ERA_COL[e.era < 0 ? 2 : e.era], grav: 3 });
    damageNumber(e, dmg * mult);
    SND.hit(dmg * mult);
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    e.state = "dead";
    e.t = 0;
    fxBurst(e.x, e.y + 0.8, e.z, { n: 34, speed: 6, up: 2, life: 0.9, size: 0.36, color: "#7a2fd6", grav: 1 });
    fxBurst(e.x, e.y + 0.8, e.z, { n: 16, speed: 3, up: 3, life: 1.1, size: 0.3, color: ERA_COL[e.era < 0 ? 2 : e.era], grav: -1 });
    fxRing(e.x, e.y + 0.1, e.z, ERA_COL[e.era < 0 ? 2 : e.era], 3, 0.5);
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
  function enemyUpdate(dt) {
    for (const e of ENEMIES) {
      const I = ISLANDS[e.island] || null;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.stun = Math.max(0, e.stun - dt);
      const dx = P.x - e.x,
        dz = P.z - e.z,
        d = Math.hypot(dx, dz) || 1,
        ux = dx / d,
        uz = dz / d;
      let want = 0,
        wx = 0,
        wz = 0;
      if (e.state === "dead") {
        const k = e.t / 0.45;
        e.g.scale.setScalar(Math.max(0.001, (1 - k) * e.D.S));
        e.g.position.y = e.y + k * 0.6;
        e.aura.visible = e.bar.visible = false;
        continue;
      }
      if (e.state === "spawn") {
        e.g.position.set(e.x, e.y - 2 + smooth01(Math.min(1, e.t / 0.7)) * 2 + (e.type === "eye" ? 1.9 : 0), e.z);
        if (e.t > 0.7) (e.state = e.type === "eye" ? "hover" : "chase"), (e.t = 0);
      } else if (e.stun > 0 && e.state !== "stun") {
        /* garai-uhinak gelditua */
      } else if (e.type === "grunt") {
        if (e.state === "chase") {
          want = e.D.speed;
          wx = ux;
          wz = uz;
          e.dir = Math.atan2(ux, uz);
          if (d < 2.1 && e.t > 0.3) (e.state = "wind"), (e.t = 0), (e.lx = ux), (e.lz = uz);
        } else if (e.state === "wind") {
          if (e.t > 0.42) (e.state = "lunge"), (e.t = 0);
        } else if (e.state === "lunge") {
          e.vx = e.lx * 9;
          e.vz = e.lz * 9;
          if (d < e.D.r + 0.55 && Math.abs(P.y - e.y) < 1.4) playerHit(e.D.dmg, e.x, e.z);
          if (e.t > 0.22) (e.state = "recover"), (e.t = 0);
        } else if (e.state === "recover" && e.t > 0.6) (e.state = "chase"), (e.t = 0);
      } else if (e.type === "eye") {
        if (e.state === "hover") {
          const desired = 7,
            side = Math.sin(time * 0.7 + e.x) > 0 ? 1 : -1;
          want = e.D.speed;
          wx = ux * (d - desired) * 0.35 + -uz * side * 0.6;
          wz = uz * (d - desired) * 0.35 + ux * side * 0.6;
          e.dir = Math.atan2(ux, uz);
          e.cd -= dt;
          if (e.cd <= 0 && d < 13) (e.state = "aim"), (e.t = 0);
        } else if (e.state === "aim") {
          e.dir = Math.atan2(ux, uz);
          if (e.t > 0.7) {
            shoot(e, ux, uz);
            e.state = "hover";
            e.t = 0;
            e.cd = 2.2 + Math.random() * 0.9;
          }
        }
      } else if (e.type === "brute") {
        if (e.state === "chase") {
          want = e.D.speed;
          wx = ux;
          wz = uz;
          e.dir = Math.atan2(ux, uz);
          e.cd -= dt;
          if (e.cd <= 0 && d > 3 && d < 12) (e.state = "wind"), (e.t = 0), (e.lx = ux), (e.lz = uz), telegraph(e);
          else if (d < 2.2 && e.t > 0.5) (e.state = "wind"), (e.t = 0.4), (e.lx = ux), (e.lz = uz), telegraph(e);
        } else if (e.state === "wind") {
          if (e.t > 0.9) (e.state = "charge"), (e.t = 0), SND.roar();
        } else if (e.state === "charge") {
          e.vx = e.lx * 14;
          e.vz = e.lz * 14;
          if (d < e.D.r + 0.6 && Math.abs(P.y - e.y) < 1.6) {
            playerHit(e.D.dmg, e.x, e.z);
            (e.state = "recover"), (e.t = 0);
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
        const ox = nx - o.x,
          oz = nz - o.z,
          od = Math.hypot(ox, oz);
        if (od < o.r + e.D.r && od > 0.001) {
          nx = o.x + (ox / od) * (o.r + e.D.r);
          nz = o.z + (oz / od) * (o.r + e.D.r);
        }
      }
      /* uhartearen barruan (kaiolaren kontra jo: zezena zorabiatuta) */
      if (I) {
        const ex = (nx - I.x) / I.rx,
          ez = (nz - I.z) / I.rz,
          ee = Math.hypot(ex, ez);
        if (ee > 0.86) {
          nx = I.x + (ex / ee) * 0.86 * I.rx;
          nz = I.z + (ez / ee) * 0.86 * I.rz;
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
      const bob = e.type === "eye" ? 1.9 + Math.sin(time * 2.4 + e.x) * 0.2 : 0;
      if (e.state !== "spawn") e.g.position.set(e.x, e.y + bob, e.z);
      e.g.rotation.y = mix(e.g.rotation.y, e.dir, 1 - Math.exp(-dt * 10));
      const wind = e.state === "wind" || e.state === "aim";
      const sq = wind ? 1 - 0.18 * Math.min(1, e.t / 0.4) : e.state === "lunge" || e.state === "charge" ? 1.15 : 1 + Math.sin(time * 6 + e.x) * 0.04;
      e.g.scale.set(e.D.S / Math.sqrt(sq), e.D.S * sq, e.D.S / Math.sqrt(sq));
      if (e.state === "stun") e.g.rotation.z = Math.sin(time * 18) * 0.12;
      else e.g.rotation.z = 0;
      e.body.emissive.set(e.flash > 0 ? "#ffffff" : wind ? "#c01a3c" : "#1a0626");
      e.body.emissiveIntensity = e.flash > 0 ? 2 : wind ? 0.7 + 0.6 * Math.sin(time * 30) : 0.6;
      const vulnerable = e.era === -1 || e.era === phase;
      e.shield.material.opacity = Math.max(vulnerable ? 0 : 0.85 + 0.15 * Math.sin(time * 5), e.shield.material.opacity - dt * 3);
      e.shield.material.uniforms.uA.value = e.shield.material.opacity;
      e.shield.material.uniforms.uT.value = time;
      e.aura.position.set(e.x, e.y + 0.04, e.z);
      e.aura.material.opacity = vulnerable ? 0.85 : 0.35;
      e.bar.visible = e.hp < e.max;
      e.bar.position.set(e.x, e.y + (e.type === "brute" ? 3.7 : e.type === "eye" ? 3.2 : 2.5), e.z);
      e.bar.quaternion.copy(camera.quaternion);
      e.fg.scale.x = Math.max(0.001, e.hp / e.max);
      e.fg.position.x = -(1 - e.fg.scale.x) / 2;
    }
    for (let i = ENEMIES.length - 1; i >= 0; i--)
      if (ENEMIES[i].state === "dead" && ENEMIES[i].t > 0.5) {
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
  function shoot(e, ux, uz) {
    const m = orb(e.x, e.y + 1.4, e.z, 0.24, ERA_COL[e.era < 0 ? 2 : e.era]);
    m.castShadow = false;
    SHOTS.push({ m, x: e.x, z: e.z, y: e.y + 1.4, vx: ux * 8, vz: uz * 8, t: 0, era: e.era });
    SND.shot();
  }
  function shotsUpdate(dt) {
    for (let i = SHOTS.length - 1; i >= 0; i--) {
      const s = SHOTS[i];
      s.t += dt;
      if (s.t < 0.35) {
        const dx = P.x - s.x,
          dz = P.z - s.z,
          d = Math.hypot(dx, dz) || 1;
        s.vx = mix(s.vx, (dx / d) * 8, dt * 2);
        s.vz = mix(s.vz, (dz / d) * 8, dt * 2);
      }
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      s.y = mix(s.y, P.y + 1, dt * 2);
      s.m.position.set(s.x, s.y, s.z);
      s.m.scale.setScalar(1 + Math.sin(s.t * 20) * 0.15);
      let gone = s.t > 3.5;
      if (Math.hypot(P.x - s.x, P.z - s.z) < 0.75 && Math.abs(P.y + 1 - s.y) < 1.2) {
        playerHit(1, s.x - s.vx, s.z - s.vz);
        gone = true;
      }
      /* erasoak proiektilak suntsitzen ditu */
      if (ATK.t > 0.04 && ATK.t < 0.17 && Math.hypot(P.x - s.x, P.z - s.z) < 2.6) {
        gone = true;
        fxBurst(s.x, s.y, s.z, { n: 8, speed: 3, life: 0.3, size: 0.2, color: "#ffffff", grav: 0 });
      }
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
  /* jokalaria zauritua (DASH bitartean ukiezina) */
  function playerHit(dmg, fx, fz) {
    if (damageTime > 0 || respawnTimer || P.dashT > 0 || ENDING.on) return;
    P.hp -= dmg;
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
    if (P.hp <= 0) fall(true);
  }
  function damageNumber(e, n) {
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
    el.y = e.y + (e.type === "eye" ? 2.2 : 1.6);
    el.z = e.z;
    el.d.textContent = n;
    el.d.style.color = n >= 3 ? "#fff1a8" : "#ffffff";
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
    ["sharp", "MAKILA ZORROTZA", "VARA AFILADA", "Konboaren hirugarren kolpeak +1 kalte.", "El tercer golpe del combo hace +1 de daño."],
    ["wave", "GARAI-UHIN HANDIA", "GRAN ONDA DE ÉPOCA", "Garaia aldatzean uhin zabalagoa eta indartsuagoa.", "Al cambiar de época, la onda es más amplia y fuerte."],
    ["dash", "AIRE-DASH BIKOITZA", "DOBLE DASH AÉREO", "Bi DASH airean, lurrera jaitsi gabe.", "Dos DASH en el aire sin tocar el suelo."],
  ];
  function offerBoon(i) {
    if (!started || ENDING.on) return;
    const pool = BOONS.filter((b) => !saved.boons.includes(b[0]));
    if (!pool.length) return;
    const pick = pool.sort(() => Math.random() - 0.5).slice(0, 2);
    dialog(
      "IRATI · 140.85",
      "Hartu nire oparia.",
      "Toma mi regalo.",
      pick.map((b) => L(b[1], b[2]) + " — " + L(b[3], b[4])).join("\n\n"),
      pick.map((b) => L(b[1], b[2]) + " — " + L(b[3], b[4])).join("\n\n"),
      pick.map((b) => [
        L(b[1], b[2]),
        () => {
          saved.boons.push(b[0]);
          if (b[0] === "heart") P.maxHp = 6;
          P.hp = P.maxHp;
          persist();
          SND.memory();
          hud();
        },
      ]),
    );
  }
