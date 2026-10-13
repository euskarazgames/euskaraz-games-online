  /* ==================================================================
     HAIZE-ADARRA · lamien adarra (2. leizeko tresna)
     · V tekla (edo ekintza-botoia): putz egin aurrera → haize-bolada (konoa, ~14 m).
     · Haize-errotak biratzen ditu (ateak), balsak bultzatzen ditu (iraganean, uretan),
       laino lamiarra uxatzen du, hosto-pilak hegan bidaltzen ditu, etsai txikiak atzera
       bultzatzen eta proiektilak desbideratzen.
     · Haranean: Artzainen lepoko haize-errota (Tartaloren bidea) eta hosto-pilak.
     ================================================================== */
  const WIND = { cd: 0, list: [], streaks: [], pool: [] };
  const hasHorn = () => saved.items.includes("adarra");
  /* haizeak eragiten duen gauza bat: { x, y, z, r, range, dy, live(), gust(dx, dz, k) } */
  function windable(o) {
    o.group = BP || scene;
    WIND.list.push(o);
    return o;
  }
  /* noranzkoa: finkatutako helburua, bestela Amaiurren begirada */
  function hornDir() {
    const t = LOCK.target ? lockPos(LOCK.target) : null;
    return t ? Math.atan2(t.x - P.x, t.z - P.z) : P.angle;
  }
  /* konoaren barruan? (along: aurrera, side: alboetara) */
  function inGust(ox, oz, dx, dz, range, r = 0) {
    const along = ox * dx + oz * dz,
      side = Math.abs(ox * dz - oz * dx);
    return along > -1 && along < range + r && side < 2.2 + Math.max(0, along) * 0.45 + r;
  }
  function hornBlow() {
    if (!hasHorn() || !started || paused || TXALA.on || cinematic || WIND.cd > 0 || respawnTimer || GET.on) return;
    WIND.cd = 0.85;
    const a = hornDir(),
      dx = Math.sin(a),
      dz = Math.cos(a);
    P.angle = a;
    hero.rotation.y = a;
    MAG.aimT = 0.35;
    castAnim("Spellcast_Shoot", 1.5, 6);
    SND.horn();
    shake(0.08);
    haptic(18);
    streaks(a);
    coachDone("horn");
    let hit = 0;
    for (const W of WIND.list) {
      if (W.group !== ZONES[ZONE.cur].group || (W.live && !W.live())) continue;
      if (W.y !== undefined && Math.abs(W.y - P.y) > (W.dy || 6)) continue;
      const ox = W.x - P.x,
        oz = W.z - P.z,
        R = W.range || 14;
      if (!inGust(ox, oz, dx, dz, R, W.r || 0)) continue;
      W.gust(dx, dz, clamp(1 - Math.hypot(ox, oz) / (R + 2), 0.25, 1));
      hit++;
    }
    /* etsai arinak atzera (kalterik gabe) eta proiektilak desbideratuta */
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn" || !inGust(e.x - P.x, e.z - P.z, dx, dz, 9)) continue;
      const k = e.type === "brute" ? 0.35 : 1;
      e.vx += dx * 12 * k;
      e.vz += dz * 12 * k;
      e.stun = Math.max(e.stun, 0.5 * k);
      hit++;
    }
    for (const s of SHOTS)
      if (!s.back && inGust(s.x - P.x, s.z - P.z, dx, dz, 8)) {
        s.back = true;
        s.t = 0;
        const sp = Math.max(9, s.sp || 9);
        s.vx = dx * sp;
        s.vz = dz * sp;
        if (s.rock) s.vy = 4;
        hit++;
      }
    if (!hit) notifyOnce("horn-air", L("Haizeak ez du ezer mugitu. Haize-errotak, balsak, lainoa…"), "");
  }
  /* haize-marrak: zinta zuri meheak noranzkoan */
  function streaks(a) {
    for (let i = 0; i < 22; i++) {
      let S = WIND.pool.pop();
      if (!S) {
        const g = new T.PlaneGeometry(1.7, 0.07);
        g.rotateX(-PI / 2);
        S = new T.Mesh(g, new T.MeshBasicMaterial({ color: "#eafcff", transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
        S.renderOrder = 8;
      }
      const sa = a + (Math.random() - 0.5) * 0.7,
        d0 = 0.6 + Math.random() * 1.5;
      S.position.set(P.x + Math.sin(sa) * d0, P.y + 0.6 + Math.random() * 1.6, P.z + Math.cos(sa) * d0);
      S.rotation.y = sa - PI / 2;
      S.scale.set(0.6 + Math.random() * 0.8, 1, 1);
      (ZONES[ZONE.cur].group || scene).add(S);
      WIND.streaks.push({ S, vx: Math.sin(sa) * (16 + Math.random() * 8), vz: Math.cos(sa) * (16 + Math.random() * 8), vy: (Math.random() - 0.3) * 1.5, t: 0, life: 0.45 + Math.random() * 0.3 });
    }
  }
  function hornUpdate(dt) {
    WIND.cd = Math.max(0, WIND.cd - dt);
    for (let i = WIND.streaks.length - 1; i >= 0; i--) {
      const w = WIND.streaks[i];
      w.t += dt;
      w.S.position.x += w.vx * dt;
      w.S.position.y += w.vy * dt;
      w.S.position.z += w.vz * dt;
      const k = w.t / w.life;
      w.S.material.opacity = Math.sin(Math.min(1, k) * PI) * 0.8;
      w.S.scale.x += dt * 2.2;
      if (k >= 1) {
        w.S.parent && w.S.parent.remove(w.S);
        WIND.pool.push(w.S);
        WIND.streaks.splice(i, 1);
      }
    }
  }

  /* ------------------------------ haize-errotak ------------------------------ */
  /* hormako haize-errota: putz egitean biraka (spin 0..1, astiro gelditzen da) */
  const FANS = [];
  function fan(x, y, z, rot, opts = {}) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    BP.add(g);
    const hub = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.5, 10), material("#5a4632"));
    hub.rotation.x = PI / 2;
    g.add(hub);
    const sails = new T.Group();
    for (let i = 0; i < 4; i++) {
      const arm = new T.Group(),
        blade = new T.Mesh(new T.BoxGeometry(0.7, 2.1, 0.06), material(opts.col || "#e8dcc0")),
        rod = new T.Mesh(new T.BoxGeometry(0.1, 2.3, 0.1), material("#4e3520"));
      blade.position.set(0.2, 1.35, 0);
      rod.position.y = 1.2;
      arm.add(rod, blade);
      arm.rotation.z = (i * PI) / 2;
      sails.add(arm);
    }
    sails.position.z = 0.3;
    g.add(sails);
    const F = { g, sails, spin: 0, x, y, z, id: opts.id, onSpin: opts.onSpin, need: opts.need || 0.15 };
    FANS.push(F);
    windable({
      x,
      y,
      z,
      r: 1.6,
      dy: 8,
      range: opts.range || 15,
      gust: (dx, dz, k) => {
        F.spin = Math.min(1, F.spin + 0.65 + k * 0.5);
        SND.whoosh();
        fxBurst(x, y, z, { n: 10, speed: 2.5, life: 0.5, size: 0.25, color: "#eafcff", grav: 0 });
      },
    });
    return F;
  }
  function fansUpdate(dt) {
    for (const F of FANS) {
      if (F.g.parent !== ZONES[ZONE.cur].group) continue;
      F.spin = Math.max(0, F.spin - dt * 0.16);
      F.sails.rotation.z -= dt * F.spin * 11;
      if (F.onSpin) F.onSpin(F.spin > F.need, F);
    }
  }

  /* ------------------------------ laino lamiarra ------------------------------ */
  /* laino-hodeia: sprite handiak; haizeak uxatzen du (k → 0), astiro itzultzen da */
  const MISTS = [];
  function mist(x, y, z, r, opts = {}) {
    const g = new T.Group();
    BP.add(g);
    const parts = [];
    let sd = Math.round(x * 13 + z * 7);
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < (opts.n || 16); i++) {
      const a = rnd() * TAU,
        d = Math.sqrt(rnd()) * r,
        s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: opts.col || "#cfeff2", transparent: true, depthWrite: false, opacity: 0 }));
      s.position.set(x + Math.cos(a) * d, y + 0.8 + rnd() * (opts.h || 3), z + Math.sin(a) * d);
      s.scale.setScalar(r * (0.7 + rnd() * 0.6) + 2);
      s.userData.p = s.position.clone();
      s.userData.ph = rnd() * TAU;
      g.add(s);
      parts.push(s);
    }
    const M = { g, parts, x, y, z, r, k: 1, clearT: 0, back: opts.back ?? 9, op: opts.op || 0.55, live: opts.live, onClear: opts.onClear };
    MISTS.push(M);
    windable({
      x,
      y,
      z,
      r: r * 0.8,
      dy: 9,
      range: opts.range || 16,
      live: () => !M.live || M.live(),
      gust: () => {
        if (M.clearT <= 0) SND.whoosh();
        M.clearT = M.back;
        if (M.onClear) M.onClear(M);
      },
    });
    return M;
  }
  function mistsUpdate(dt) {
    for (const M of MISTS) {
      if (M.g.parent !== ZONES[ZONE.cur].group) continue;
      M.clearT = Math.max(0, M.clearT - dt);
      const want = M.clearT > 0 || (M.live && !M.live()) ? 0 : 1;
      M.k = mix(M.k, want, 1 - Math.exp(-dt * (want ? 0.7 : 5)));
      for (const s of M.parts) {
        const p = s.userData.p,
          ph = s.userData.ph;
        /* uxatzean: kanpora eta gora */
        const out = 1 - M.k;
        s.position.set(p.x + (p.x - M.x) * out * 1.4 + Math.sin(time * 0.4 + ph) * 0.6, p.y + out * 3, p.z + (p.z - M.z) * out * 1.4 + Math.cos(time * 0.35 + ph) * 0.6);
        s.material.opacity = M.op * M.k * (0.75 + Math.sin(time * 0.8 + ph) * 0.25);
      }
    }
  }

  /* ------------------------------ hosto-pilak ------------------------------ */
  /* haranean: hosto lehorren pila batek zerbait ezkutatzen du (kutxa) */
  function leafPile(x, y, z, reveal) {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const cols = ["#b5651d", "#d08a2e", "#8a4b1c", "#c9a13a"];
    for (let i = 0; i < 9; i++) {
      const m = new T.Mesh(new T.IcosahedronGeometry(0.9 + (i % 3) * 0.25, 0), material(cols[i % 4]));
      m.position.set(Math.cos(i * 2.4) * 0.9 * (i % 2 ? 1 : 0.5), 0.3 + (i % 3) * 0.15, Math.sin(i * 2.4) * 0.9 * (i % 2 ? 1 : 0.5));
      m.scale.y = 0.55;
      g.add(m);
    }
    const S = { g, x, y, z, done: false, solid: { x, z, r: 1.4, h: 1.2, y } };
    solids.push(S.solid);
    windable({
      x,
      y,
      z,
      r: 1.2,
      range: 12,
      live: () => !S.done,
      gust: (dx, dz) => {
        S.done = true;
        g.visible = false;
        S.solid.r = 0;
        for (let i = 0; i < 4; i++) fxBurst(x + dx * i * 0.8, y + 0.8, z + dz * i * 0.8, { n: 14, speed: 5, up: 4, life: 1.4, size: 0.32, color: cols[i % 4], grav: 2, drag: 1.2 });
        SND.whoosh();
        if (reveal) reveal();
      },
    });
    return S;
  }
