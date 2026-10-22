  /* ==================================================================
     SORGINKERIA · Amaiurren makilak magia jaurtitzen du (urrutitik)
     · Sakatu: izpi gidatua, auto-helburuarekin (18 m). Segidako
       hirugarrenak hiru izpi jaurtitzen ditu, haizatuta.
     · Mantendu: INDARRA kargatu; askatu: izpi handia, zeharkatzailea,
       eztanda batekin.
     · bultzada bitartean sakatu: biraka-kolpea (inguruko denak bultzatu).
     · Izpiek itzalen proiektilak suntsitzen dituzte eta errunak pizten.
     ================================================================== */
  const BOLTS = [],
    RUNES = [];
  const MAG = {
    cd: 0,
    buf: 0,
    chain: 0,
    chainT: 9,
    holdT: 0,
    charge: 0,
    charging: false,
    aimT: 0,
    castT: 9,
    cast: null,
    castLen: 0,
    spinT: 9,
    spinHit: new Set(),
    dashEnd: 9,
    combo: 0,
    comboT: 0,
    best: 0,
    shown: -1,
    layer: {},
    wand: null,
    ring: null,
    orb: null,
  };
  const BOLT_RANGE = 18,
    v3 = new T.Vector3();
  function magicInit() {
    /* goiko gorputzeko geruza: korrika egin bitartean sorginkeria (hankak libre) */
    const UPPER = /^(spine|chest|upperarm|lowerarm|wrist|hand|head)/;
    for (const n of ["Spellcast_Shoot", "Spellcasting"]) {
      const c = models.mage.animations.find((a) => a.name === n);
      if (!c) continue;
      MAG.layer[n] = mixer.clipAction(new T.AnimationClip(n + "_goia", c.duration, c.tracks.filter((t) => UPPER.test(t.name))));
    }
    const spin = models.mage.actions["2H_Melee_Attack_Spin"];
    if (spin) spin.timeScale = 3.4;
    MAG.wand = actor.getObjectByName("1H_Wand");
    /* biraka-kolpearen eraztuna eta kargaren argia */
    const g = new T.RingGeometry(0.5, 3.4, 48);
    g.rotateX(-PI / 2);
    MAG.ring = new T.Mesh(g, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    MAG.ring.renderOrder = 7;
    MAG.ring.visible = false;
    scene.add(MAG.ring);
    MAG.orb = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    MAG.orb.renderOrder = 8;
    scene.add(MAG.orb);
    /* EZKUTUA: INDARRA kargatzean aurrean agertzen den ezkutu magikoa (sei aldeko) */
    const sh = new T.Group(),
      shMat = new T.MeshBasicMaterial({ color: "#bff6ff", transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
    const disc = new T.Mesh(new T.CircleGeometry(0.95, 6), shMat);
    const rim = new T.Mesh(new T.RingGeometry(0.88, 1.02, 6), shMat);
    sh.add(disc, rim);
    sh.renderOrder = 8;
    scene.add(sh);
    MAG.shield = sh;
    MAG.shieldMat = shMat;
  }
  /* makilaren punta (azken errendatzeko matrizea; nahikoa) */
  function muzzle() {
    if (MAG.wand) {
      MAG.wand.getWorldPosition(v3);
      if (Math.hypot(v3.x - P.x, v3.z - P.z) < 2.5 && Math.abs(v3.y - P.y - 1.2) < 1.6) return { x: v3.x, y: v3.y + 0.15, z: v3.z };
    }
    return { x: P.x + Math.sin(P.angle) * 0.7, y: P.y + 1.35, z: P.z + Math.cos(P.angle) * 0.7 };
  }
  const alive = (e) => e && e.state !== "dead" && e.state !== "spawn" && ENEMIES.includes(e);
  /* helburuaren puntua (gorputzaren erdia) */
  function aimPoint(t) {
    if (t.rune) return { x: t.x, y: t.y, z: t.z };
    if (t.boss) return BOSS.weak() || { x: t.x, y: t.y, z: t.z };
    return { x: t.x, y: t.y + (t.H || 1.1), z: t.z };
  }
  function faceDir() {
    const d = direction(),
      len = Math.hypot(d.x, d.z);
    return len > 0.2 ? Math.atan2(d.x, d.z) : P.angle;
  }
  /* auto-helburua: hurbilena eta makilaren norabidean dagoena; zauritu daitezkeenak lehenik */
  function pickTarget(range = BOLT_RANGE, skip) {
    /* FINKATU: helburu finkatua bizirik badago, hura beti */
    if (LOCK.target && !(skip && skip.has(LOCK.target)) && (LOCK.target.boss ? BOSS.vulnerable() : alive(LOCK.target))) return LOCK.target;
    const fa = faceDir(),
      fx = Math.sin(fa),
      fz = Math.cos(fa);
    let best = null,
      bs = 1e9;
    const consider = (t, dx, dy, dz, extra) => {
      const dd = Math.hypot(dx, dz);
      if (dd > range || Math.abs(dy) > 9) return;
      const align = dd > 0.01 ? (dx * fx + dz * fz) / dd : 1;
      const score = dd * (1.7 - align * 0.9) + extra;
      if (score < bs) (bs = score), (best = t);
    };
    for (const e of ENEMIES) {
      if (!alive(e) || (skip && skip.has(e))) continue;
      consider(e, e.x - P.x, e.y - P.y, e.z - P.z, e.era === -1 || e.era === phase ? 0 : 7);
    }
    for (const r of RUNES) if (r.live && r.live() && !r.lit && !(skip && skip.has(r))) consider(r, r.x - P.x, r.y - P.y - 1, r.z - P.z, best ? 6 : 0);
    if (BOSS.vulnerable()) {
      const w = BOSS.weak();
      consider(BOSS.lockable, w.x - P.x, w.y - 1 - P.y, w.z - P.z, -3);
    }
    return best;
  }
  /* --------------------------- jaurtiketak --------------------------- */
  /* buffered: aurreko sakatze goiztiar bat (ez da sakatze berria ALDARATUrako) */
  function attack(buffered) {
    if (!started || paused || respawnTimer || CRAFT.on || TXALA.on || CHAIN.state !== "idle" || P.climb) return;
    if (buffered !== true) guardPress();
    if (P.dashT > 0 || MAG.dashEnd < 0.14) return spinStrike();
    if (MAG.cd > 0) {
      MAG.buf = 0.2; /* sakatze goiztiarra gorde */
      return;
    }
    castBolt();
  }
  function castBolt() {
    const tgt = pickTarget();
    MAG.chain = MAG.chainT < 0.6 ? MAG.chain + 1 : 1;
    MAG.chainT = 0;
    const triple = MAG.chain >= 3;
    if (triple) MAG.chain = 0;
    let dir = faceDir();
    if (tgt) {
      const p = aimPoint(tgt);
      dir = Math.atan2(p.x - P.x, p.z - P.z);
    }
    P.angle = dir;
    MAG.aimT = 0.3;
    ATK.n++;
    ATK.t = 0;
    ATK.dir = dir;
    const o = muzzle();
    /* BURDINAZKO MAKILA (Maddi): kalte bikoitza */
    const iron = saved.boons?.includes("burdina") ? 1 : 0;
    spawnBolt(o, dir, tgt, { dmg: 1 + iron });
    if (triple) {
      /* MAKILA ZORROTZA (saria): hiru izpiek +1 kalte */
      const sharp = saved.boons?.includes("sharp") ? 1 : 0,
        skip = new Set([tgt]),
        a = pickTarget(BOLT_RANGE, skip);
      if (a) skip.add(a);
      const b = pickTarget(BOLT_RANGE, skip);
      BOLTS[BOLTS.length - 1].dmg += sharp;
      spawnBolt(o, dir - 0.3, a || tgt, { dmg: 1 + sharp + iron });
      spawnBolt(o, dir + 0.3, b || a || tgt, { dmg: 1 + sharp + iron });
    }
    MAG.cd = 0.13;
    castAnim("Spellcast_Shoot", 2.7, 6);
    SND.cast(triple);
    fxBurst(o.x, o.y, o.z, { n: triple ? 12 : 6, speed: 3, life: 0.22, size: 0.22, color: eraCol(), grav: 0, drag: 6 });
    squash(triple ? -0.5 : -0.25);
    haptic(triple ? 10 : 5);
    coachDone("attack");
  }
  function boltColor(big, fire) {
    return fire ? "#ff6a2a" : big ? "#d9b8ff" : phase ? "#4fdcff" : "#ffad42";
  }
  /* SUGAR-IZPIA (BURRUNTZI GORIA): INDARRAren izpi handiak sua dira */
  const hasFire = () => saved.items.includes("sugarra");
  function spawnBolt(o, dir, target, opt) {
    const sp = opt.big ? 27 : 31;
    let vx = Math.sin(dir) * sp,
      vy = 0,
      vz = Math.cos(dir) * sp;
    if (target) {
      const p = aimPoint(target),
        dx = p.x - o.x,
        dy = p.y - o.y,
        dz = p.z - o.z,
        d = Math.hypot(dx, dy, dz) || 1;
      vy = (dy / d) * sp;
      const h = Math.sqrt(Math.max(0, sp * sp - vy * vy));
      vx = Math.sin(dir) * h;
      vz = Math.cos(dir) * h;
    }
    const col = boltColor(opt.big, opt.fire);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(opt.big ? 3.2 : 1.9);
    s.renderOrder = 8;
    const core = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#ffffff", transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    core.scale.setScalar(opt.big ? 1.3 : 0.62);
    core.renderOrder = 9;
    s.add(core);
    core.scale.divideScalar(s.scale.x);
    s.position.set(o.x, o.y, o.z);
    scene.add(s);
    BOLTS.push({ x: o.x, y: o.y, z: o.z, vx, vy, vz, sp, target, t: 0, life: opt.big ? 1.15 : 0.85, dmg: opt.dmg, big: !!opt.big, full: !!opt.full, fire: !!opt.fire, pierce: opt.big ? 5 : 0, hits: new Set(), s, col });
    if (opt.fire) SND.flame();
  }
  function boltsUpdate(dt) {
    for (let i = BOLTS.length - 1; i >= 0; i--) {
      const b = BOLTS[i];
      b.t += dt;
      /* gidatzea: helburua bizirik badago, harantz biratu */
      const tg = b.target;
      if (tg && (tg.rune ? !tg.lit : tg.boss ? BOSS.vulnerable() : alive(tg))) {
        const p = aimPoint(tg),
          dx = p.x - b.x,
          dy = p.y - b.y,
          dz = p.z - b.z,
          d = Math.hypot(dx, dy, dz) || 1,
          k = 1 - Math.exp(-dt * (b.big ? 7 : 13));
        b.vx = mix(b.vx, (dx / d) * b.sp, k);
        b.vy = mix(b.vy, (dy / d) * b.sp, k);
        b.vz = mix(b.vz, (dz / d) * b.sp, k);
        const n = Math.hypot(b.vx, b.vy, b.vz) || 1;
        b.vx *= b.sp / n;
        b.vy *= b.sp / n;
        b.vz *= b.sp / n;
      }
      const px = b.x,
        py = b.y,
        pz = b.z;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.s.position.set(b.x, b.y, b.z);
      const pulse = 1 + Math.sin(b.t * 40) * 0.12;
      b.s.scale.setScalar((b.big ? 3.2 : 1.9) * pulse);
      if (frame % 2 === 0) fxBurst(mix(px, b.x, 0.5), mix(py, b.y, 0.5), mix(pz, b.z, 0.5), { n: b.big ? 3 : 2, speed: 0.6, life: b.big ? 0.45 : 0.28, size: b.big ? 0.6 : 0.4, color: b.col, grav: 0, drag: 4, jitter: b.big ? 0.4 : 0.15 });
      let gone = b.t > b.life;
      /* itzalak */
      for (const e of ENEMIES) {
        if (gone || !alive(e) || b.hits.has(e)) continue;
        const dx = e.x - b.x,
          dz = e.z - b.z,
          r = e.D.r * 0.85 + (b.big ? 0.75 : 0.4);
        if (dx * dx + dz * dz > r * r) continue;
        const top = e.y + (e.H || 1.1) * 1.9;
        if (b.y < e.y - 0.3 || b.y > top + 0.4) continue;
        b.hits.add(e);
        const n = Math.hypot(b.vx, b.vz) || 1,
          shielded = e.era !== -1 && e.era !== phase;
        hitEnemy(e, b.dmg, b.vx / n, b.vz / n);
        boltImpact(b, b.x, b.y, b.z, shielded);
        if (b.big && !shielded) blast(b, e);
        if (shielded || b.pierce-- <= 0) gone = true;
      }
      /* errunak (errendatu daitezkeenak) */
      for (const r of RUNES) {
        if (gone || !r.live || !r.live() || r.lit) continue;
        if (Math.hypot(r.x - b.x, r.y - b.y, r.z - b.z) < (r.r || 0.9) + 0.35) {
          boltImpact(b, b.x, b.y, b.z, false);
          gone = true;
          /* sutegi handiak (Tartalorenak): SUA bakarrik */
          if (r.needFire && !b.fire) {
            SND.clang(0.5);
            notifyOnce("need-fire", L("Burdinazko galdara hau ez da sorginkeria arruntaz pizten… SUA behar da."), "");
            continue;
          }
          r.hit(b);
        }
      }
      /* etsai nagusiaren puntu ahula */
      const W = !gone && BOSS.vulnerable() ? BOSS.weak() : null;
      if (W && Math.hypot(b.x - W.x, b.y - W.y, b.z - W.z) < BOSS.weakR) {
        boltImpact(b, b.x, b.y, b.z, false);
        BOSS.hit(b.big ? 3 : 1, b);
        gone = true;
      }
      /* upelak eta kaxak: hautsi (txanponak) */
      /* hesiek eta izotzak izpia geldiarazten dute (INDARRA ere bai: ez du hurrengo gela erretzen) */
      const hitB = !gone && breakAt(b.x, b.y, b.z, 0.35, b.fire);
      if (hitB) {
        boltImpact(b, b.x, b.y, b.z, false);
        if (!b.big || hitB.fireOnly || hitB.bombOnly) gone = true;
      }
      /* itzalen proiektilak: izpiak suntsitzen ditu */
      for (let j = SHOTS.length - 1; j >= 0 && !gone; j--) {
        const s = SHOTS[j];
        if (Math.hypot(s.x - b.x, s.y - b.y, s.z - b.z) < (b.big ? 1.4 : 0.85)) {
          fxBurst(s.x, s.y, s.z, { n: 10, speed: 4, life: 0.3, size: 0.25, color: "#ffffff", grav: 0 });
          SND.clang();
          scene.remove(s.m);
          SHOTS.splice(j, 1);
          if (!b.big) gone = true;
        }
      }
      if (b.t > b.life && b.big) blast(b, null);
      if (gone) {
        scene.remove(b.s);
        b.s.material.dispose();
        b.s.children[0].material.dispose();
        BOLTS.splice(i, 1);
      }
    }
  }
  function boltImpact(b, x, y, z, shielded) {
    fxBurst(x, y, z, { n: b.big ? 22 : 9, speed: b.big ? 7 : 4.5, up: 1.5, life: 0.35, size: b.big ? 0.42 : 0.26, color: shielded ? "#ffffff" : b.col, grav: 4 });
  }
  /* INDARRA: eztanda (inguruko itzalei kaltea eta bultzada) */
  function blast(b, first) {
    if (b.blown) return;
    b.blown = true;
    const R = b.full ? 3.4 : 2.7;
    fxRing(b.x, b.y - 0.6, b.z, b.col, R + 1, 0.4);
    fxBurst(b.x, b.y, b.z, { n: 30, speed: 8, up: 2, life: 0.55, size: 0.45, color: b.col, grav: 2 });
    shake(0.22);
    SND.blast(b.full);
    for (const e of ENEMIES) {
      if (!alive(e) || e === first) continue;
      const dx = e.x - b.x,
        dz = e.z - b.z,
        d = Math.hypot(dx, dz);
      if (d > R + e.D.r || Math.abs(e.y + 1 - b.y) > 3) continue;
      hitEnemy(e, 1, dx / (d || 1), dz / (d || 1));
    }
  }
  /* --------------------------- INDARRA (kargatu eta askatu) --------------------------- */
  function chargeStart() {
    MAG.charging = true;
    MAG.charge = 0;
    castAnim("Spellcasting", 1.5, 5);
    SND.charge();
  }
  function chargeRelease() {
    MAG.charging = false;
    if (MAG.charge < 0.3 || !started || paused) {
      if (MAG.layer.Spellcasting) MAG.layer.Spellcasting.fadeOut(0.15);
      MAG.cast = null;
      return;
    }
    const full = MAG.charge >= 1,
      tgt = pickTarget(22);
    let dir = faceDir();
    if (tgt) {
      const p = aimPoint(tgt);
      dir = Math.atan2(p.x - P.x, p.z - P.z);
    }
    P.angle = dir;
    MAG.aimT = 0.35;
    ATK.n++;
    spawnBolt(muzzle(), dir, tgt, { big: true, full, fire: hasFire(), dmg: (full ? 4 : 2 + Math.round(MAG.charge)) + (saved.boons?.includes("sharp") ? 1 : 0) + (saved.boons?.includes("burdina") ? 2 : 0) });
    castAnim("Spellcast_Shoot", 2.2, 8);
    MAG.charge = 0;
    P.vx -= Math.sin(dir) * 5;
    P.vz -= Math.cos(dir) * 5;
    shake(full ? 0.3 : 0.18);
    hitStop = Math.max(hitStop, full ? 0.05 : 0.03);
    haptic(full ? 30 : 16);
    coachDone("charge");
    if (hasFire()) coachDone("fire");
  }
  /* --------------------------- biraka-kolpea (bultzada + sorginkeria) --------------------------- */
  function spinStrike() {
    if (MAG.spinT < 0.42) return;
    MAG.spinT = 0;
    MAG.spinHit.clear();
    if (P.dashT > 0) P.dashT = 0.01;
    ATK.n++;
    MAG.ring.material.color.set(phase ? "#bff6ff" : "#ffe1a8");
    SND.swing(3);
    squash(-1.4);
    /* bultzadaren ondoren ez dago kamera-kolperik: dardara etsaia jotzean bakarrik */
    MAG.spinShook = false;
    haptic(14);
    coachDone("spin");
  }
  function spinUpdate(dt) {
    MAG.spinT += dt;
    const k = MAG.spinT / 0.32;
    MAG.ring.visible = k < 1;
    if (k < 1) {
      MAG.ring.position.set(P.x, P.y + 0.7, P.z);
      MAG.ring.scale.setScalar(0.5 + k * 0.7);
      MAG.ring.rotation.y = MAG.spinT * 18;
      MAG.ring.material.opacity = (1 - k) * 0.85;
    }
    if (MAG.spinT > 0.03 && MAG.spinT < 0.3) {
      for (const e of ENEMIES) {
        if (!alive(e) || MAG.spinHit.has(e)) continue;
        const dx = e.x - P.x,
          dz = e.z - P.z,
          d = Math.hypot(dx, dz);
        if (d > 3.3 + e.D.r * 0.5 || Math.abs(e.y - P.y) > 2.2) continue;
        MAG.spinHit.add(e);
        if (!MAG.spinShook) {
          MAG.spinShook = true;
          shake(0.12);
        }
        hitEnemy(e, 2, dx / (d || 1), dz / (d || 1));
        e.vx += (dx / (d || 1)) * 7;
        e.vz += (dz / (d || 1)) * 7;
      }
      for (let j = SHOTS.length - 1; j >= 0; j--)
        if (Math.hypot(SHOTS[j].x - P.x, SHOTS[j].z - P.z) < 3.6) {
          fxBurst(SHOTS[j].x, SHOTS[j].y, SHOTS[j].z, { n: 8, speed: 3, life: 0.3, size: 0.2, color: "#ffffff", grav: 0 });
          scene.remove(SHOTS[j].m);
          SHOTS.splice(j, 1);
        }
      const W = BOSS.vulnerable() ? BOSS.weak() : null;
      if (W && !MAG.spinHit.has(BOSS) && Math.hypot(P.x - W.x, P.z - W.z) < 4.5) {
        MAG.spinHit.add(BOSS);
        BOSS.hit(2, null);
      }
      breakAt(P.x, P.y, P.z, 2.6);
    }
  }
  /* --------------------------- animazio-geruza --------------------------- */
  function castAnim(name, ts, w) {
    const a = MAG.layer[name];
    if (!a) return;
    for (const k in MAG.layer) if (MAG.layer[k] !== a && MAG.layer[k].isRunning()) MAG.layer[k].fadeOut(0.08);
    a.reset();
    a.setLoop(name === "Spellcasting" ? T.LoopRepeat : T.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = ts;
    a.setEffectiveWeight(w);
    a.fadeIn(0.05).play();
    MAG.cast = name;
    MAG.castT = 0;
    MAG.castLen = name === "Spellcasting" ? Infinity : a.getClip().duration / ts;
  }
  /* --------------------------- SEGIDA: kolpe-segida --------------------------- */
  function comboHit() {
    MAG.combo++;
    MAG.comboT = 2.8;
    MAG.best = Math.max(MAG.best, MAG.combo);
    if ([10, 25, 50, 100].includes(MAG.combo)) {
      title(...[
        ["SUGARRA!", "¡LLAMARADA!"],
        ["EKAITZA!", "¡TORMENTA!"],
        ["SORGIN NAGUSIA!", "¡GRAN BRUJA!"],
        ["AKELARRE!", "¡AKELARRE!"],
      ][[10, 25, 50, 100].indexOf(MAG.combo)]);
      SND.stinger(false);
    }
  }
  function comboBreak() {
    MAG.combo = 0;
    MAG.comboT = 0;
  }
  function comboHud() {
    const el = $("katea");
    if (!el) return;
    const n = MAG.comboT > 0 && MAG.combo >= 3 ? MAG.combo : 0;
    if (n !== MAG.shown) {
      MAG.shown = n;
      el.hidden = !n;
      if (n) {
        el.textContent = L("SEGIDA") + " ×" + n;
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
        el.style.color = n >= 25 ? "#ffd1ff" : n >= 10 ? "#fff1a8" : "";
      }
    }
    if (n) el.style.opacity = Math.min(1, MAG.comboT / 0.6);
  }
  /* --------------------------- eguneratzea (tick bakoitzean) --------------------------- */
  function magicUpdate(dt) {
    guardUpdate(dt);
    ATK.t += dt;
    ATK.waveCd = Math.max(0, ATK.waveCd - dt);
    MAG.cd = Math.max(0, MAG.cd - dt);
    MAG.chainT += dt;
    MAG.aimT = Math.max(0, MAG.aimT - dt);
    MAG.dashEnd = P.dashT > 0 ? 0 : MAG.dashEnd + dt;
    if (MAG.buf > 0) {
      MAG.buf -= dt;
      if (MAG.cd <= 0) {
        MAG.buf = 0;
        attack(true);
      }
    }
    /* mantendu → kargatu; askatu → INDARRA */
    if (ATK.hold && started && !paused && !CRAFT.on && !respawnTimer) {
      MAG.holdT += dt;
      /* argi-zutabe batean: EGUZKI-ISPILUA (ispilua.js) INDARRAren ordez */
      if (!MAG.charging && !MIR.on && MAG.holdT > 0.3 && MAG.spinT > 0.45 && P.dashT <= 0 && !P.climb) mirrorCan() ? mirrorRaise() : chargeStart();
    } else {
      if (MAG.charging) chargeRelease();
      if (MIR.on) mirrorLower();
      MAG.holdT = 0;
    }
    mirrorUpdate(dt);
    if (MAG.charging) {
      const was = MAG.charge;
      MAG.charge = Math.min(1, MAG.charge + dt / 0.7);
      const tgt = pickTarget(22);
      if (tgt) {
        const p = aimPoint(tgt);
        P.angle = Math.atan2(p.x - P.x, p.z - P.z);
      }
      MAG.aimT = 0.2;
      if (was < 1 && MAG.charge >= 1) {
        fxRing(P.x, P.y + 0.15, P.z, "#e9d2ff", 2.4, 0.35);
        SND.ready();
        haptic(18);
      }
      if (frame % 3 === 0) {
        const o = muzzle(),
          a = time * 9;
        fxBurst(o.x + Math.cos(a) * 0.5, o.y, o.z + Math.sin(a) * 0.5, { n: 1, speed: 0.4, up: 0.6, life: 0.3, size: 0.24 + MAG.charge * 0.2, color: MAG.charge >= 1 ? "#f3e6ff" : eraCol(), grav: -1, drag: 3 });
      }
    }
    if (MAG.orb) {
      const o = MAG.charging ? muzzle() : null;
      MAG.orb.material.opacity = MAG.charging ? 0.35 + MAG.charge * 0.6 : Math.max(0, MAG.orb.material.opacity - dt * 6);
      if (o) MAG.orb.position.set(o.x, o.y, o.z);
      MAG.orb.material.color.set(MAG.charge >= 1 ? "#f6e8ff" : eraCol());
      MAG.orb.scale.setScalar(0.6 + MAG.charge * 1.6 + (MAG.charge >= 1 ? Math.sin(time * 30) * 0.15 : 0));
    }
    if (MAG.shield) {
      const on = MAG.charging && MAG.charge > 0.12;
      MAG.shieldMat.opacity = on ? 0.22 + 0.1 * Math.sin(time * 12) + MAG.shieldFlash : Math.max(0, MAG.shieldMat.opacity - dt * 5);
      MAG.shieldFlash = Math.max(0, (MAG.shieldFlash || 0) - dt * 3);
      MAG.shieldMat.color.set(MAG.shieldFlash > 0.05 ? "#ffffff" : eraCol());
      MAG.shield.visible = MAG.shieldMat.opacity > 0.01;
      MAG.shield.position.set(P.x + Math.sin(P.angle) * 0.95, P.y + 1.15, P.z + Math.cos(P.angle) * 0.95);
      MAG.shield.rotation.set(0, P.angle, time * 0.8);
    }
    MAG.castT += dt;
    if (MAG.cast && MAG.castT > MAG.castLen - 0.1) {
      MAG.layer[MAG.cast].fadeOut(0.16);
      MAG.cast = null;
    }
    spinUpdate(dt);
    boltsUpdate(dt);
    MAG.comboT = Math.max(0, MAG.comboT - dt);
    if (MAG.comboT <= 0) MAG.combo = 0;
    if (frame % 4 === 0) comboHud();
  }
  /* goiko gorputzeko kargaren animazioa itzali (eszena, elkarrizketa edo heriotza batek etenda) */
  function castStop() {
    if (MAG.layer.Spellcasting) MAG.layer.Spellcasting.fadeOut(0.15);
    MAG.cast = null;
  }
  function magicReset() {
    for (const b of BOLTS) {
      scene.remove(b.s);
      b.s.material.dispose();
      b.s.children[0].material.dispose();
    }
    BOLTS.length = 0;
    MAG.charging = false;
    MAG.charge = 0;
    MAG.holdT = 0;
    ATK.hold = false;
    mirrorLower();
    castStop();
    comboBreak();
  }
