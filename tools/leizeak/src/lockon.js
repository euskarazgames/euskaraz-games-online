  /* ==================================================================
     FINKATU · helburua finkatu (T teklarekin edo ◎ botoiarekin)
     Etsai bat finkatzean: eraztun gorria haren gainean, Amaiur hari begira
     (alboetara mugitzen da), izpi guztiak hara, eta kamerak biak enkoadratzen ditu.
     Berriro sakatuz → hurrengo helburua; bakarra bada → askatu.
     ================================================================== */
  const LOCK = { target: null, ring: null, k: 0 };
  function lockInit() {
    const g = new T.Group();
    const r1 = new T.Mesh(new T.TorusGeometry(0.75, 0.06, 6, 48), new T.MeshBasicMaterial({ color: "#ff6a5a", transparent: true, opacity: 0.9, depthWrite: false }));
    r1.rotation.x = PI / 2;
    g.add(r1);
    for (let i = 0; i < 3; i++) {
      const tri = new T.Mesh(new T.ConeGeometry(0.16, 0.34, 3), new T.MeshBasicMaterial({ color: "#ff8a6a" }));
      const a = (i / 3) * TAU;
      tri.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
      tri.rotation.z = PI / 2;
      tri.rotation.y = -a;
      g.add(tri);
    }
    g.visible = false;
    scene.add(g);
    LOCK.ring = g;
  }
  function lockCandidates() {
    const list = ENEMIES.filter((e) => e.state !== "dead" && e.state !== "spawn" && Math.hypot(e.x - P.x, e.z - P.z) < 24 && Math.abs(e.y - P.y) < 8);
    if (BOSS.on && BOSS.lockable && !BOSS.dead) list.push(BOSS.lockable);
    return list;
  }
  function lockPos(t) {
    if (t.boss) {
      const w = BOSS.center();
      return { x: w.x, y: w.y, z: w.z, h: w.h || 3 };
    }
    return { x: t.x, y: t.y, z: t.z, h: (t.H || 1.1) * 2 };
  }
  function lockValid(t) {
    if (!t) return false;
    if (t.boss) return BOSS.on && !BOSS.dead;
    return t.state !== "dead" && ENEMIES.includes(t) && Math.hypot(t.x - P.x, t.z - P.z) < 28;
  }
  function lockToggle() {
    if (!PRO.can.lock) return proNope("lock");
    if (!started || paused || TXALA.on) return;
    const list = lockCandidates();
    if (!list.length) {
      LOCK.target = null;
      notify(L("Ez dago helbururik hurbil."), "", 1.4);
      return;
    }
    const fa = P.angle,
      score = (t) => {
        const p = lockPos(t),
          dx = p.x - P.x,
          dz = p.z - P.z,
          d = Math.hypot(dx, dz) || 1;
        return d * (1.6 - ((dx * Math.sin(fa) + dz * Math.cos(fa)) / d) * 0.8);
      };
    list.sort((a, b) => score(a) - score(b));
    if (!LOCK.target) LOCK.target = list[0];
    else {
      const i = list.indexOf(LOCK.target);
      LOCK.target = list.length > 1 ? list[(i + 1) % list.length] : null;
    }
    SND.click();
    coachDone("lock");
  }
  function lockUpdate(dt) {
    if (LOCK.target && !lockValid(LOCK.target)) LOCK.target = null;
    LOCK.k = mix(LOCK.k, LOCK.target ? 1 : 0, 1 - Math.exp(-dt * 6));
    const R = LOCK.ring;
    R.visible = !!LOCK.target;
    if (!LOCK.target) return;
    const p = lockPos(LOCK.target);
    R.position.set(p.x, p.y + p.h + 0.55 + Math.sin(time * 5) * 0.08, p.z);
    R.rotation.y += dt * 2.4;
    R.scale.setScalar(1 + Math.sin(time * 8) * 0.06);
  }
  /* kamera: helburua pantailaren goialdean, biak ikusgai */
  function lockCamera(dt, look) {
    if (!LOCK.target || LOCK.k < 0.02) return;
    const p = lockPos(LOCK.target),
      th = Math.atan2(p.x - P.x, p.z - P.z),
      base = Math.atan2(15.5, 23);
    let want = th + PI - base;
    want += Math.round((CAM.yaw - want) / TAU) * TAU;
    CAM.yaw += (want - CAM.yaw) * (1 - Math.exp(-dt * 2.6));
    look.x = mix(look.x, (look.x + p.x) / 2, 0.4 * LOCK.k);
    look.z = mix(look.z, (look.z + p.z) / 2, 0.4 * LOCK.k);
  }
