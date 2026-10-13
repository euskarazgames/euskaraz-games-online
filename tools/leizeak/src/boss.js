  /* ==================================================================
     ETSAI NAGUSIAK (diseinu propioak)
     · BOSS: kudeatzaile orokorra (magic.js, lockon.js eta chain.js-ek erabiltzen dute):
       vulnerable(), weak(), hit(), center(), ring (katearen helburua), chained().
     · BASOKO ZAINDARIA (F gela): hezurdura erraldoia; bere ezkutuak garaiz
       aldatzen du kolpe batzuen ondoren. Garaitzean: SUGAARREN KATEA.
     · BASAJAUN ILUNA (I gela): basoaren jauna, itzal batek gaiztotua.
       Zapalketak (uhinak: salto edo bultzada), harkaitzak (izpiekin suntsitu),
       itzal-laguntzaileak. Nekatzean, bizkarreko sustrai-eraztuna argitzen da:
       KATEArekin tiratu → azala apurtu → bihotza agerian → SORGINKERIA.
       Hiru azal-plaka. Amaieran Basajaun askatzen da.
     ================================================================== */
  /* etsai nagusi bakoitzak bere inplementazioa (BOSSK[kind]); BOSS-ek aktiboarengana bideratzen du */
  const BOSSK = {};
  const bk = () => BOSSK[BOSS.kind] || null;
  const BOSS = {
    on: false,
    dead: false,
    kind: null,
    lockable: { boss: true, x: 0, y: 0, z: 0, H: 2 },
    weakR: 1.6,
    vulnerable: () => BOSS.on && !BOSS.dead && !!bk() && bk().vulnerable(),
    weak: () => (bk() ? bk().weak() : null),
    center: () => (bk() ? bk().center() : { x: 0, y: 0, z: 0, h: 3 }),
    hit: (n, b) => bk() && bk().hit(n, b),
    chained: () => bk() && bk().chained && bk().chained(),
    /* itzulitako harkaitza: etsai nagusia zorabiatu (baldin badaki) */
    stagger: () => bk() && bk().stagger && bk().stagger(),
    canStagger: () => BOSS.on && !!bk() && !!bk().stagger,
    ring: {
      live: () => BOSS.on && !!bk() && !!bk().ring && bk().ring.live(),
      pos: () => bk().ring.pos(),
    },
  };
  /* ------------------------------ zaindaria ------------------------------ */
  const MINI = { e: null, flipDmg: 0 };
  function miniStart() {
    const R = DUNGEON.rooms.F;
    if (saved.cleared.includes("dF-boss") || ROOM.fight) return;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    const e = spawnEnemy("brute", 0, R.x, R.z - 7, 0);
    e.room = R;
    e.mini = true;
    e.K = 1.12;
    e.hp = e.max = 26;
    e.g.scale.multiplyScalar(1.45);
    e.D = { ...e.D, r: 1.9, mass: 4.5 };
    MINI.e = e;
    MINI.flipDmg = 0;
    MINI.adds = 0;
    SND.stinger(false);
    shake(0.4);
    title("BASOKO ZAINDARIA", "");
    notify(L("Haren ezkutuak garaia aldatzen du. Begiratu begien koloreari!"), "", 4);
    bossBar("BASOKO ZAINDARIA", 1);
  }
  /* hitEnemy-ren ondoren (combat.js): ezkutua garaiz aldatu eta barra */
  function miniDamaged(e, dmg) {
    if (!e.mini) return;
    MINI.flipDmg += dmg;
    bossBar("BASOKO ZAINDARIA", Math.max(0, e.hp / e.max));
    if (MINI.flipDmg >= 7 && e.hp > 0) {
      MINI.flipDmg = 0;
      e.era = 1 - e.era;
      e.eye.color.set(ERA_COL[e.era]);
      e.shield.material.color.set(ERA_COL[e.era]);
      fxRing(e.x, e.y + 0.2, e.z, ERA_COL[e.era], 6, 0.6);
      SND.shift(e.era);
      notify(e.era ? L("Ezkutua ORAINERA aldatu da!") : L("Ezkutua IRAGANERA aldatu da!"), "", 2);
      /* laguntzaileak */
      if (MINI.adds < 2) {
        MINI.adds++;
        spawnWave([["grunt", -1, 2]], e.room);
      }
    }
  }
  function miniUpdate(dt) {
    const e = MINI.e;
    if (!e) return;
    if (e.state === "dead" && !MINI.done) {
      MINI.done = true;
      for (const o of ENEMIES) if (o !== e && o.state !== "dead") killEnemy(o);
      setTimeout(() => {
        ROOM.fight = null;
        MINI.e = null;
        MINI.done = false;
        if (!saved.cleared.includes("dF-boss")) saved.cleared.push("dF-boss");
        persist();
        bossBar(null);
        SND.stinger(true);
        slowmo = 0.8;
        title("ZAINDARIA GARAITUTA", "");
        revealChest(DUNGEON.chainChest);
        notify(L("Kutxa bat agertu da gelaren erdian."), "", 4);
      }, 900);
    }
  }
  /* ------------------------------ BASAJAUN ILUNA ------------------------------ */
  const BJ = { g: null, root: null, mixer: null, acts: {}, cur: "", x: 0, z: 0, y: 0, a: 0, state: "sleep", t: 0, plates: 3, hp: 6, ringOn: false, waves: [], rocks: [], hitFlash: 0, step: 0, seenIntro: false };
  const PLATE_HP = 6;
  function basajaunBuild() {
    const R = DUNGEON.bossRoom;
    const src = models.npc_barbarian;
    if (!src) return;
    const root = cloneSkinned(src.scene);
    root.scale.setScalar(1.15 * 3.2);
    root.traverse((n) => {
      if (!n.isMesh) return;
      if (/Axe|Shield|Mug|Hat/.test(n.name)) n.visible = false;
      const m = n.material.clone();
      m.skinning = !!n.isSkinnedMesh;
      m.color = new T.Color("#4a5a3a");
      m.emissive = new T.Color("#1a0f24");
      m.emissiveIntensity = 0.6;
      n.material = m;
      n.castShadow = true;
      n.frustumCulled = false;
    });
    const g = new T.Group();
    g.add(root);
    BP.add(g);
    /* begiak, bihotza eta sustrai-eraztuna (bizkarrean) */
    const eyes = new T.Group();
    for (const s of [-1, 1]) {
      const e = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), new T.MeshBasicMaterial({ color: "#ff8a3a" }));
      e.position.set(s * 0.36, 6.15, 0.95);
      eyes.add(e);
    }
    g.add(eyes);
    const heart = new T.Mesh(new T.IcosahedronGeometry(0.62, 1), material("#ffb347", 1.6));
    heart.position.set(0, 4.3, 1.05);
    heart.visible = false;
    g.add(heart);
    const bark = new T.Mesh(new T.CylinderGeometry(1.0, 1.15, 1.6, 8, 1, true, -PI / 2, PI), material("#3b2c1e"));
    bark.position.set(0, 4.3, 0.2);
    g.add(bark);
    const ringG = new T.Group();
    const r1 = new T.Mesh(new T.TorusGeometry(0.7, 0.16, 8, 24), material("#6b4f2e"));
    const r2 = new T.Mesh(new T.TorusGeometry(0.7, 0.07, 6, 30, PI * 1.6), material("#5fd6a8", 0.6));
    ringG.add(r1, r2);
    ringG.position.set(0, 4.8, -1.15);
    g.add(ringG);
    const ringGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#7fe3c0", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    ringGlow.scale.setScalar(3.5);
    ringGlow.position.copy(ringG.position);
    g.add(ringGlow);
    /* bere argia: ilunean ere irakurgarri (itzala: morea; askatuta: berde epela) */
    const light = new T.PointLight("#b48cff", 1.6, 16, 1.6);
    light.position.set(0, 6.5, 2.2);
    g.add(light);
    const mixer = new T.AnimationMixer(root),
      acts = {};
    for (const c of models.mage.animations) acts[c.name] = mixer.clipAction(c);
    if (models.skel_minion) for (const c of models.skel_minion.animations) acts[c.name] = mixer.clipAction(c);
    Object.assign(BJ, { g, root, mixer, acts, eyes, heart, bark, ringG, ringGlow, light, x: R.x, z: R.z - 9, y: 0, a: 0 });
    g.position.set(BJ.x, 0, BJ.z);
    bjAnim("Idle");
    mixer.timeScale = 0.75;
    if (saved.flags.includes("basajaun")) bjFreed(true);
    else BJ.state = "sleep";
  }
  function bjAnim(name, once, ts = 1) {
    const a = BJ.acts[name];
    if (!a || (BJ.cur === name && !once)) return;
    const old = BJ.acts[BJ.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.timeScale = ts;
    a.fadeIn(0.18).play();
    if (old && old !== a) old.fadeOut(0.18);
    BJ.cur = name;
  }
  function bossBar(name, k) {
    const el = $("bossHud");
    if (!name) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = `<b>${name}</b><i><s style="width:${Math.round(clamp(k, 0, 1) * 100)}%"></s></i>` + (BJ.state !== "sleep" && name === "BASAJAUN ILUNA" ? `<small>${"◆ ".repeat(BJ.plates)}${"◇ ".repeat(3 - BJ.plates)}</small>` : "");
  }
  function bossStart() {
    if (BOSS.on || saved.flags.includes("basajaun")) return;
    const R = DUNGEON.bossRoom;
    ROOM.fight = Object.assign(R, { boss: true });
    clearEnemies();
    BOSS.on = true;
    BOSS.dead = false;
    BOSS.kind = "basajaun";
    BOSS.weakR = 1.6;
    Object.assign(BJ, { state: "intro", t: 0, plates: 3, hp: PLATE_HP, ringOn: false, step: 0 });
    const fight = () => {
      BJ.state = "idle";
      BJ.t = 0;
      title("BASAJAUN ILUNA", "");
      SND.roar();
      shake(0.5);
      bossBar("BASAJAUN ILUNA", 1);
      notify(L("Uhinak: JAUZI edo BULTZADA. Nekatzen denean, begiratu bizkarrari…"), "", 5);
    };
    /* bigarren saiakeran: elkarrizketarik gabe */
    if (BJ.seenIntro) return fight();
    BJ.seenIntro = true;
    say(
      [
        ["BASAJAUN", "…Nire basoa. Nire ardiak. Dena itzal. Dena hotz.", "", BJ.x, BJ.z, 4],
        ["AMAIUR", "Basajaun! Ez naiz zure etsaia. Itzal bat daukazu barruan!", "", P.x, P.z, 0],
        ["BASAJAUN", "ITZALAK EZ DU IZENIK. JOAN… EDO GELDITU BETIRAKO!", "", BJ.x, BJ.z, 4],
      ],
      fight,
    );
  }
  /* jokalaria erori da borrokan: etsai nagusiak hasierara */
  function bossReset() {
    lamiaReset();
    tartaloReset();
    if (MINI.e) {
      MINI.e = null;
      MINI.done = false;
      bossBar(null);
    }
    if (!BOSS.on || BOSS.dead || !BJ.g) return;
    BOSS.on = false;
    for (const W of BJ.waves) W.m.parent && W.m.parent.remove(W.m);
    BJ.waves.length = 0;
    const R = DUNGEON.bossRoom;
    Object.assign(BJ, { state: "sleep", t: 0, plates: 3, hp: PLATE_HP, step: 0, x: R.x, z: R.z - 9, a: 0 });
    BJ.g.position.set(BJ.x, 0, BJ.z);
    BJ.g.rotation.y = 0;
    BJ.heart.visible = false;
    BJ.bark.visible = true;
    BJ.ringGlow.material.opacity = 0;
    bjAnim("Idle");
    bossBar(null);
  }
  BOSSK.basajaun = {
    vulnerable: () => BJ.state === "open",
    stagger: () => bossStagger(),
  };
  BOSSK.basajaun.weak = () => {
    const v = new T.Vector3();
    BJ.heart.getWorldPosition(v);
    return { x: v.x, y: v.y, z: v.z };
  };
  BOSSK.basajaun.center = () => ({ x: BJ.x, y: BJ.y, z: BJ.z, h: 7 });
  BOSSK.basajaun.hit = (n) => {
    if (!BOSS.vulnerable()) return;
    BJ.heart.scale.setScalar(1.35);
    BJ.hitFlash = 0.15;
    BJ.hp -= n;
    FB.bossHit(BOSS.weak().x, BOSS.weak().y, BOSS.weak().z);
    damageNumber({ x: BJ.x, y: 4.4, z: BJ.z, H: 1 }, n);
    bossBar("BASAJAUN ILUNA", (BJ.plates - 1 + Math.max(0, BJ.hp) / PLATE_HP) / 3);
    if (BJ.hp <= 0) {
      BJ.plates--;
      BJ.hp = PLATE_HP;
      BJ.heart.visible = false;
      SND.roar();
      shake(0.6);
      slowmo = 0.5;
      if (BJ.plates <= 0) return bjDefeat();
      BJ.state = "roar";
      BJ.t = 0;
      bjAnim("Taunt", true, 0.8);
      notify(BJ.plates === 2 ? L("Azal-plaka bat apurtuta! Bi falta dira.") : L("Azken plaka! Kontuz: haserre dago."), "", 3);
      bossBar("BASAJAUN ILUNA", BJ.plates / 3);
    }
  };
  BOSSK.basajaun.ring = {
    live: () => BJ.state === "tired",
    pos: () => {
      const v = new T.Vector3();
      BJ.ringG.getWorldPosition(v);
      return { x: v.x, y: v.y, z: v.z };
    },
  };
  BOSSK.basajaun.chained = () => {
    if (BJ.state !== "tired") return;
    BJ.state = "open";
    BJ.t = 0;
    BJ.hp = PLATE_HP;
    BJ.heart.visible = true;
    BJ.bark.visible = false;
    SND.crumble();
    shake(0.45);
    fxBurst(BJ.x, 4.3, BJ.z, { n: 50, speed: 7, up: 4, life: 1, size: 0.4, color: "#8a6a3a", grav: 9 });
    bjAnim("Hit_A", true, 0.6);
    notify(L("Azala erori da! BIHOTZA: SORGINKERIA!"), "", 3);
    coachDone("chain");
  };
  /* bere harkaitza itzuli diote: zorabiatuta (bizkarreko eraztuna agerian) */
  function bossStagger() {
    if (!["idle", "stomp", "throw", "summon"].includes(BJ.state)) return;
    BJ.state = "tired";
    BJ.t = 0;
    BJ.slam = false;
    SND.roar();
    shake(0.4);
    fxBurst(BJ.x, 5, BJ.z, { n: 40, speed: 6, up: 3, life: 0.8, size: 0.4, color: "#ffe2a6", grav: 6 });
    title("ZORABIATUTA!", "");
  }
  function bossUpdate(dt) {
    lamiaUpdate(dt);
    tartaloUpdate(dt);
    miniUpdate(dt);
    /* zaindariaren gelan sartzean: borroka */
    const F = DUNGEON.rooms.F;
    if (F && !MINI.e && !ROOM.fight && !cinematic && ROOM.cur === F && !saved.cleared.includes("dF-boss") && P.grounded && Math.abs(P.x - F.x) < F.w / 2 - 3 && Math.abs(P.z - F.z) < F.d / 2 - 3) miniStart();
    if (!BJ.g || ZONE.cur !== "leizea") return;
    BJ.mixer.update(dt);
    if (BJ.state === "freed") {
      BJ.g.rotation.y += Math.atan2(Math.sin(Math.atan2(P.x - BJ.x, P.z - BJ.z) - BJ.g.rotation.y), Math.cos(Math.atan2(P.x - BJ.x, P.z - BJ.z) - BJ.g.rotation.y)) * Math.min(1, dt * 2);
      return;
    }
    if (BJ.state === "sleep") {
      const R = DUNGEON.bossRoom;
      if (Math.abs(P.x - R.x) < R.w / 2 - 3 && Math.abs(P.z - R.z) < R.d / 2 - 4 && P.grounded && !cinematic) bossStart();
      return;
    }
    if (!BOSS.on || cinematic) return;
    BJ.t += dt;
    BJ.hitFlash = Math.max(0, BJ.hitFlash - dt);
    BJ.heart.scale.setScalar(mix(BJ.heart.scale.x, 1, 1 - Math.exp(-dt * 8)));
    BJ.heart.material.emissiveIntensity = 1.4 + Math.sin(time * 9) * 0.4 + BJ.hitFlash * 6;
    const dx = P.x - BJ.x,
      dz = P.z - BJ.z,
      d = Math.hypot(dx, dz) || 1,
      face = Math.atan2(dx, dz),
      rage = 3 - BJ.plates;
    const turn = (k = 3) => (BJ.a += Math.atan2(Math.sin(face - BJ.a), Math.cos(face - BJ.a)) * Math.min(1, dt * k));
    /* Amaiur gorputzaren kontra: bultzatu */
    if (d < 2.6 && P.y < 3) {
      P.vx += (dx / d) * 14 * dt * 8;
      P.vz += (dz / d) * 14 * dt * 8;
    }
    switch (BJ.state) {
      case "idle": {
        turn();
        if (d > 7) {
          bjAnim("Walking_A");
          const sp = 2.2 + rage * 0.5;
          BJ.x += (dx / d) * sp * dt;
          BJ.z += (dz / d) * sp * dt;
        } else bjAnim("Idle");
        if (BJ.t > 1.6 - rage * 0.25) {
          BJ.step++;
          const seq = ["stomp", "throw", "stomp", "summon", "stomp", "tired"];
          BJ.state = seq[(BJ.step - 1) % seq.length];
          BJ.t = 0;
          BJ.n = 0;
          if (BJ.state === "summon" && ENEMIES.filter((e) => e.state !== "dead").length > 2) BJ.state = "throw";
        }
        break;
      }
      case "stomp": {
        turn(1.5);
        /* abisua: besoak gora, gero kolpea (2-3 aldiz) */
        const reps = 2 + (rage > 0 ? 1 : 0),
          cyc = 1.05 - rage * 0.1,
          k = Math.floor(BJ.t / cyc);
        if (k >= reps) {
          BJ.state = "idle";
          BJ.t = 0;
          break;
        }
        if (k >= BJ.n) {
          BJ.n = k + 1;
          bjAnim("2H_Melee_Attack_Chop", true, 1.15);
        }
        const into = BJ.t - k * cyc;
        if (into > cyc * 0.55 && !BJ.slam) {
          BJ.slam = true;
          shake(0.35);
          SND.thud();
          fxBurst(BJ.x + Math.sin(BJ.a) * 2, 0.3, BJ.z + Math.cos(BJ.a) * 2, { n: 30, speed: 6, up: 2, life: 0.6, size: 0.4, color: "#9a8a6a", grav: 8 });
          BJ.waves.push({ x: BJ.x, z: BJ.z, r: 2, sp: 13 + rage * 2, m: bjWaveMesh(), era: rage >= 2 ? (k % 2) : -1 });
        }
        if (into < cyc * 0.2) BJ.slam = false;
        break;
      }
      case "throw": {
        turn(4);
        if (BJ.t > 0.5 + BJ.n * 0.55 && BJ.n < 3 + rage) {
          BJ.n++;
          bjAnim("Spellcast_Shoot", true, 1.2);
          const era = rage >= 1 ? BJ.n % 2 : -1,
            a = face + (BJ.n - 2) * 0.22,
            sx = BJ.x + Math.sin(BJ.a) * 2,
            sz = BJ.z + Math.cos(BJ.a) * 2,
            sp = clamp(Math.hypot(P.x - sx, P.z - sz) * (0.85 + Math.random() * 0.3), 6, 20);
          const m = new T.Mesh(new T.DodecahedronGeometry(0.75, 0), era < 0 ? rockMaterial() : material(ERA_COL[era], 0.6));
          m.position.set(sx, 5, sz);
          m.castShadow = true;
          scene.add(m);
          /* hegaldia ~1 s: harkaitza Amaiurren inguruan erortzen da */
          SHOTS.push({ m, x: sx, z: sz, y: 5, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, sp, t: 0, era: era < 0 ? 2 : era, rock: true, vy: 3.6 });
          SND.shot();
        }
        if (BJ.t > 0.6 + (3 + rage) * 0.55 + 0.6) {
          BJ.state = "idle";
          BJ.t = 0;
        }
        break;
      }
      case "summon": {
        if (BJ.t < 0.05) {
          bjAnim("Taunt", true, 0.9);
          SND.roar();
        }
        if (BJ.t > 0.9 && !BJ.summoned) {
          BJ.summoned = true;
          spawnWave([["grunt", 0, 1], ["grunt", 1, 1], ...(rage >= 1 ? [["eye", -1, 1]] : [])], DUNGEON.bossRoom);
        }
        if (BJ.t > 1.8) {
          BJ.summoned = false;
          BJ.state = "idle";
          BJ.t = 0;
        }
        break;
      }
      case "tired": {
        /* belauniko: sustrai-eraztuna bizkarrean argitzen da */
        if (BJ.t < 0.05) {
          bjAnim("Hit_A", true, 0.5);
          notifyOnce("bj-tired", L("Nekatuta dago! Bizkarreko SUGE-ERAZTUNA: KATEA!"), "");
          coach("chain", "C", "C: KATEA eraztunera", "", "useBtn", "KATEA botoia: eraztunera tiratu", "");
        }
        BJ.ringGlow.material.opacity = 0.6 + Math.sin(time * 8) * 0.3;
        BJ.g.position.y = -0.9 * Math.min(1, BJ.t * 3);
        if (BJ.t > 6 - rage) {
          BJ.ringGlow.material.opacity = 0;
          BJ.state = "idle";
          BJ.t = 0;
          BJ.g.position.y = 0;
        }
        break;
      }
      case "open": {
        BJ.ringGlow.material.opacity = 0;
        BJ.g.position.y = -0.9;
        if (BJ.t > 6.5) {
          /* bihotza berriro estali */
          BJ.heart.visible = false;
          BJ.bark.visible = true;
          BJ.state = "idle";
          BJ.t = 0;
          BJ.g.position.y = 0;
          SND.roar();
        }
        break;
      }
      case "roar": {
        BJ.g.position.y = 0;
        BJ.bark.visible = true;
        if (BJ.t > 1.6) {
          BJ.state = "summon";
          BJ.t = 0;
        }
        break;
      }
    }
    BJ.x = clamp(BJ.x, DUNGEON.bossRoom.x - 13, DUNGEON.bossRoom.x + 13);
    BJ.z = clamp(BJ.z, DUNGEON.bossRoom.z - 12, DUNGEON.bossRoom.z + 13);
    BJ.g.position.x = BJ.x;
    BJ.g.position.z = BJ.z;
    BJ.g.rotation.y = BJ.a;
    BOSS.lockable.x = BJ.x;
    BOSS.lockable.z = BJ.z;
    BOSS.lockable.y = 0;
    /* uhinak */
    for (let i = BJ.waves.length - 1; i >= 0; i--) {
      const W = BJ.waves[i];
      W.r += W.sp * dt;
      W.m.scale.setScalar(W.r);
      W.m.position.set(W.x, 0.15, W.z);
      W.m.material.opacity = clamp(1 - W.r / 24, 0, 0.9);
      const pd = Math.hypot(P.x - W.x, P.z - W.z);
      if (Math.abs(pd - W.r) < 0.7 && P.y < 0.9 && P.dashT <= 0 && (W.era === -1 || W.era === phase)) playerHit(1, W.x, W.z);
      if (W.r > 24) {
        W.m.parent && W.m.parent.remove(W.m);
        BJ.waves.splice(i, 1);
      }
    }
  }
  function bjWaveMesh() {
    const m = new T.Mesh(new T.TorusGeometry(1, 0.12, 6, 64), new T.MeshBasicMaterial({ color: "#c9b48a", transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -PI / 2;
    BP && BP.add ? BP.add(m) : ZONES.leizea.group.add(m);
    return m;
  }
  function bjDefeat() {
    BOSS.dead = true;
    BJ.state = "freed";
    for (const W of BJ.waves) W.m.parent && W.m.parent.remove(W.m);
    BJ.waves.length = 0;
    for (const e of ENEMIES) if (e.state !== "dead") killEnemy(e);
    ROOM.fight = null;
    bossBar(null);
    SND.stinger(true);
    slowmo = 1.2;
    say(
      [
        ["· · ·", "Itzala basajaunen azaletik askatu da, ke beltz bat bezala, eta sabaian desagertu.", "", BJ.x, BJ.z, 3],
        ["BASAJAUN", "…Argia. Usaina. Basoa. Nor zara zu, sorgin txikia, itzala uxatzeko adorea duzuna?", "", BJ.x, BJ.z, 4],
        ["AMAIUR", "Amaiur naiz, Herrikoa. Txalapartek deitu ninduten.", "", P.x, P.z, 0],
        ["BASAJAUN", "Mari isilik dago, eta ez da kasualitatea. Itzalak ez ninduen bakarrik harrapatu: norbaitek bidali zuen.", "", BJ.x, BJ.z, 4],
        ["BASAJAUN", "Hartu nire bihotzaren zati bat. Eta entzun: Mariren suzko bola ez dago bere leizean.", "", BJ.x, BJ.z, 4],
      ],
      () => {
        bjFreed();
        saved.hearts = Math.max(saved.hearts, 1);
        updateMaxHp();
        P.hp = P.maxHp;
        flagSet("basajaun");
        persist();
        itemGet("bihotza", L("BASAJAUNEN BIHOTZA"), L("Arnasa bat gehiago. Basoa berriro bizirik dago."), () => storyAfterBoss());
      },
    );
  }
  function bjFreed(instant) {
    BOSS.on = false;
    BJ.state = "freed";
    BJ.g.position.y = 0;
    BJ.heart.visible = false;
    BJ.bark.visible = false;
    BJ.ringGlow.material.opacity = 0;
    BJ.eyes.children.forEach((e) => e.material.color.set("#9dffc4"));
    BJ.root.traverse((n) => {
      if (n.isMesh && n.material.color) {
        n.material.color.set("#8a6a46");
        n.material.emissive.set("#000000");
      }
    });
    bjAnim("Idle");
    BJ.light.color.set("#ffd9a0");
    BJ.light.intensity = 1.2;
    if (!instant) fxRing(BJ.x, 0.2, BJ.z, "#9dffc4", 16, 1.4);
  }
