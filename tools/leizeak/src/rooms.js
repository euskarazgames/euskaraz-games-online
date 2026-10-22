  /* ==================================================================
     MUGAK, GELAK ETA SARIAK
     · Haraneko mugak: lautadetatik ezin da itsasora erori (zubian eta kaian izan ezik).
     · Lur segurua eta berragertzea: erortzean bizitza bat eta azken lur segurura.
     · Borroka-gelak: sartzean ateak ixten dira; olatuak garbitzean irekitzen dira.
     · Ateak (giltza txikia / giltza nagusia / barrak), kutxak, txanponak eta arnasa.
     · Gauza bat lortzean: une berezia (Amaiur pozik, gauza buru gainean, azalpena).
     ================================================================== */
  const BOUNDS = [];
  const SAFE = { x: -6, y: 0, z: 44, phase: 1, t: 0 };
  const angDiff = (a, b) => {
    const d = Math.abs(a - b) % TAU;
    return d > PI ? TAU - d : d;
  };
  function roomCollide(px, pz, nx, nz, py) {
    if (ZONE.cur === "ibarra") {
      /* haranaren ingerada eta portua (haran.js); iraganean ibaian ezin da sakonera sartu */
      [nx, nz] = hubBounds(px, pz, nx, nz);
      [nx, nz] = riverBank(px, pz, py, nx, nz);
    }
    if (ZONE.cur === "ibarra")
      for (const B of BOUNDS) {
        const e0 = Math.hypot((px - B.x) / B.rx, (pz - B.z) / B.rz);
        if (e0 > B.k + 0.02) continue;
        const fx = (nx - B.x) / B.rx,
          fz = (nz - B.z) / B.rz;
        if (Math.hypot(fx, fz) <= B.k) continue;
        const a = Math.atan2(fz, fx);
        /* hutsuneak (zubia, kaia...); hirugarren balioa: garai horretan bakarrik (izotza orainean) */
        if (B.gaps.some(([ga, gw, gp]) => (gp === undefined || gp === phase) && angDiff(a, ga) < gw)) continue;
        nx = B.x + Math.cos(a) * B.rx * B.k * 0.999;
        nz = B.z + Math.sin(a) * B.rz * B.k * 0.999;
        P.wallGrace = 0;
      }
    /* borroka-gela itxita: ezin da irten */
    const R = ROOM.fight;
    if (R && !R.noClamp && py > R.y - 2) {
      if (R.rx) {
        /* uharte biribila: elipsean */
        const ex = (nx - R.x) / (R.rx - 0.8),
          ez = (nz - R.z) / (R.rz - 0.8),
          e = Math.hypot(ex, ez);
        if (e > 1) {
          nx = R.x + (nx - R.x) / e;
          nz = R.z + (nz - R.z) / e;
        }
      } else {
        const hw = R.w / 2 - 0.7,
          hd = R.d / 2 - 0.7;
        nx = clamp(nx, R.x - hw, R.x + hw);
        nz = clamp(nz, R.z - hd, R.z + hd);
      }
    }
    return [nx, nz];
  }
  /* azken lur segurua: bi garaietan dagoen lur finkoa */
  function trackSafe(dt) {
    SAFE.t += dt;
    if (SAFE.t < 0.2 || !P.grounded || !P.platform) return;
    const s = P.platform;
    if (s.phase !== -1 || s.moving || s.piece || !s.safe || s.wall) return;
    if (ZONE.cur === "ibarra" && !hubSafeSpot(P.x, P.z, P.y)) return;
    SAFE.t = 0;
    Object.assign(SAFE, { x: P.x, y: P.y, z: P.z, phase });
  }
  function softRespawn() {
    P.hp -= 1;
    if (P.hp <= 0 && !potionSave()) return returnCheckpoint();
    if (phase !== SAFE.phase) {
      phase = SAFE.phase;
      setPhaseVisual();
    }
    teleport(SAFE.x, SAFE.z, SAFE.y);
    damageTime = 1.1;
    shiftFlash = 0.8;
    FB.respawn();
    haptic(30);
    notify(L("Denbora atzera. Saiatu berriro."), "", 1.8);
    hud();
  }
  function haptic(ms) {
    try {
      if (mobile && navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  /* ----------------------------- borroka-gelak ----------------------------- */
  const ROOM = { fight: null, wave: -1, t: 0, pending: false, cur: null };
  const ROOMS = [];
  const ROOMS_AREA = {};
  const isCleared = (id) => saved.cleared.includes(id);
  function roomsUpdate(dt) {
    if (!DGS[ZONE.cur]) return;
    /* zein gelatan nago? */
    const R = ROOMS.find((r) => r.zone === ZONE.cur && Math.abs(P.x - r.x) < r.w / 2 && Math.abs(P.z - r.z) < r.d / 2);
    if (R && R !== ROOM.cur) {
      ROOM.cur = R;
      if (!saved.visited.includes(R.id)) {
        saved.visited.push(R.id);
        persist();
      }
      if (R.area && R.area !== AREA.cur) enterArea(R.area);
    }
    const F = ROOM.fight;
    if (F) {
      /* etsai nagusien gelak: boss.js-ek kudeatzen ditu */
      if (F.boss) return;
      ROOM.t += dt;
      if (enemiesAlive() === 0 && ROOM.t > 0.8 && !ROOM.pending) {
        if (ROOM.wave + 1 < F.waves.length) {
          ROOM.wave++;
          ROOM.t = -1.1;
          ROOM.pending = true;
        } else return roomWin(F);
      }
      if (ROOM.pending && ROOM.t >= 0) {
        ROOM.pending = false;
        spawnWave(F.waves[ROOM.wave], F);
        if (ROOM.wave > 0) notify(L("Beste olatu bat!"), "", 1.6);
      }
      return;
    }
    if (R && R.waves && !isCleared(R.id) && !cinematic && P.grounded && Math.abs(P.x - R.x) < R.w / 2 - 3 && Math.abs(P.z - R.z) < R.d / 2 - 3) roomStart(R);
  }
  function roomStart(R) {
    Object.assign(ROOM, { fight: R, wave: 0, t: -1.4, pending: true });
    clearEnemies();
    for (const D of DOORS) if (D.room === R.id) D.locked = true;
    SND.stinger(false);
    shake(0.25);
    haptic(40);
    title("ITZALAK!", "");
    notify(R.fightText || L("Ateak itxi dira. Garaitu itzalak!"), "", 4);
  }
  function roomWin(R) {
    slowmo = 0.75;
    ROOM.fight = null;
    if (!saved.cleared.includes(R.id)) saved.cleared.push(R.id);
    for (const D of DOORS) if (D.room === R.id) D.locked = false;
    persist();
    SND.stinger(true);
    haptic(60);
    fxRing(P.x, P.y + 0.2, P.z, "#9dffc4", 10, 1.2);
    title("ATEAK IREKI DIRA", "");
    if (R.onWin) R.onWin();
    hud();
  }
  function roomReset() {
    if (ROOM.fight) {
      const R = ROOM.fight;
      ROOM.fight = null;
      for (const D of DOORS) if (D.room === R.id) D.locked = false;
    }
    bossReset();
    clearEnemies();
  }

  /* ---------------------------------- ateak ---------------------------------- */
  /* mota: "key" (giltza txikia), "boss" (giltza nagusia), "bars" (puzzle/borroka batek irekitzen du) */
  const DOORS = [];
  function door(id, x, z, rot, y, kind, room) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    BP.add(g);
    const gate =
      kind === "boss"
        ? obj(new T.BoxGeometry(5.4, 5.6, 0.5), material("#3a2c1e"), g)
        : kind === "key"
          ? obj(new T.BoxGeometry(5.2, 5.4, 0.45), material("#5a4128"), g)
          : obj(new T.BoxGeometry(5.4, 5.6, 0.25), material("#2b2f33"), g);
    gate.position.y = 2.8;
    if (kind === "bars") {
      gate.material = new T.MeshStandardMaterial({ color: "#2b2f33", metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.0 });
      for (let i = -2; i <= 2; i++) {
        const b = obj(new T.CylinderGeometry(0.11, 0.11, 5.6, 6), material("#3a4046"), g);
        b.position.set(i * 1.05, 2.8, 0);
      }
    }
    const lock = kind === "key" || kind === "boss" ? orb(0, 2.6, 0.35, kind === "boss" ? 0.42 : 0.26, kind === "boss" ? "#ff9d4a" : "#e8c27a", g) : null;
    /* barrak: argia (EGUZKI-ISPILUA) artetik pasatzen da */
    const p = { x, z, y: y + 9, bottom: y - 1, w: 5.6, d: 1.0, rot, phase: -1, wall: true, safe: false, bars: kind === "bars" };
    platforms.push(p);
    /* atea bere hormarekin gardentzen da (kamera eta Amaiurren artean badago) */
    const ca = Math.cos(rot) * 2.8,
      sa = Math.sin(rot) * 2.8;
    const side = sideBegin(x - ca, z + sa, x + ca, z - sa);
    sideEnd();
    g.traverse((n) => {
      if (n.isMesh) {
        n.material = n.material.clone();
        side.mats.push(n.material);
      }
    });
    const D = { id, x, z, y, rot, kind, room, g, gate, lock, p, side, open: saved.doors.includes(id), locked: false, t: saved.doors.includes(id) ? 1 : 0 };
    DOORS.push(D);
    return D;
  }
  function doorsUpdate(dt) {
    for (const D of DOORS) {
      if (D.g.parent !== ZONES[ZONE.cur].group) continue;
      const want = D.open && !D.locked ? 1 : 0;
      D.t = clamp(D.t + (want ? dt * 1.8 : -dt * 3), 0, 1);
      const k = D.t * D.t * (3 - 2 * D.t);
      for (const c of D.g.children) if (c !== D.lock) c.position.y = (c.userData.y0 ??= c.position.y) - k * 5.8;
      if (D.lock) D.lock.visible = !D.open;
      D.p.off = k > 0.85;
    }
  }
  function openDoor(D, silent) {
    if (D.open) return;
    D.open = true;
    if (!saved.doors.includes(D.id)) saved.doors.push(D.id);
    persist();
    if (!silent) {
      SND.thud();
      shake(0.2);
      fxBurst(D.x, D.y + 2.5, D.z, { n: 26, speed: 3.5, up: 2, life: 0.8, size: 0.3, color: "#ffe2a6", grav: 2 });
    }
  }
  /* giltzadun ate bat hurbil? */
  function doorNear() {
    return DOORS.find((D) => !D.open && (D.kind === "key" || D.kind === "boss") && D.g.parent === ZONES[ZONE.cur].group && Math.hypot(P.x - D.x, P.z - D.z) < 3.6);
  }
  /* giltza txikiak leize bakoitzarenak dira */
  const keysHere = () => saved.keyz[ZONE.cur] || 0;
  function tryDoor(D) {
    const DG = DGS[ZONE.cur];
    if (D.kind === "key") {
      if (keysHere() > 0) {
        saved.keyz[ZONE.cur]--;
        openDoor(D);
        notify(L("Giltza txikiak atea ireki du."), "", 2.4);
      } else notify(L("Itxita. Giltza txiki bat behar da."), "", 2.4);
    } else if (D.kind === "boss") {
      if (DG && saved.items.includes(DG.bigKey)) {
        openDoor(D);
        notify(L("Giltza nagusia biraka… atea astiro zabaltzen da."), "", 3);
      } else notify(L("Ate handia. Sarraila bitxia du: giltza nagusia behar da."), "", 3);
    }
    hud();
  }

  /* ---------------------------------- kutxak ---------------------------------- */
  const CHESTS = [];
  /* edukia: { t: "key" | "bigkey" | "item" | "coins" | "piece", id, n } */
  function chest(id, x, y, z, rot, content, opts = {}) {
    const m = model("chest", x, y, z, 1.35, rot);
    const C = { id, x, y, z, rot, m, content, opened: saved.chests.includes(id), hidden: !!opts.hidden, room: opts.room, zoneGroup: BP, locked: opts.locked || null, lockedHint: opts.lockedHint || "" };
    if (C.opened) m.scale.multiplyScalar(0.92);
    m.visible = !C.hidden || C.opened;
    solids.push((C.solid = { x, z, r: 0.9, h: 1.3, y }));
    if (C.hidden) C.solid.r = 0;
    C.glow = glow(x, y + 1.1, z, "#ffe2a6", 2.6);
    C.glow.visible = !C.opened && m.visible;
    CHESTS.push(C);
    return C;
  }
  function chestNear() {
    return CHESTS.find((C) => !C.opened && C.m.visible && !(C.locked && C.locked()) && C.zoneGroup === ZONES[ZONE.cur].group && Math.hypot(P.x - C.x, P.z - C.z) < 2.6 && Math.abs(P.y - C.y) < 1.6);
  }
  /* kutxa itxi bat hurbil (adib. izotzean harrapatuta): pista bat erakusteko */
  function lockedChestNear() {
    return CHESTS.find((C) => !C.opened && C.m.visible && C.locked && C.locked() && C.zoneGroup === ZONES[ZONE.cur].group && Math.hypot(P.x - C.x, P.z - C.z) < 4.2 && Math.abs(P.y - C.y) < 1.6);
  }
  function revealChest(C) {
    if (C.m.visible) return;
    C.m.visible = true;
    C.glow.visible = !C.opened;
    C.solid.r = 0.9;
    fxBurst(C.x, C.y + 1, C.z, { n: 30, speed: 3, up: 3, life: 1, size: 0.3, color: "#ffe2a6", grav: 1 });
    fxRing(C.x, C.y + 0.1, C.z, "#ffe2a6", 4, 0.8);
    SND.rune(true);
  }
  function openChest(C) {
    C.opened = true;
    saved.chests.push(C.id);
    C.glow.visible = false;
    C.m.scale.multiplyScalar(0.92);
    SND.memory();
    fxBurst(C.x, C.y + 1.2, C.z, { n: 36, speed: 3.5, up: 3.5, life: 1.1, size: 0.3, color: "#ffe2a6", grav: -1 });
    const c = C.content;
    if (c.t === "key") {
      saved.keyz[ZONE.cur] = keysHere() + 1;
      itemGet("giltza", L("GILTZA TXIKIA"), L("Leize honetako ate itxi bat irekitzen du."));
    } else if (c.t === "bigkey") {
      const DG = DGS[ZONE.cur];
      if (!saved.items.includes(DG.bigKey)) saved.items.push(DG.bigKey);
      itemGet("giltzanagusia", L("GILTZA NAGUSIA"), DG.bigKeyText || L("Basajaunen bihotzera daraman ate handia irekitzen du."));
    } else if (c.t === "coins") {
      saved.coins += c.n;
      itemGet("txanponak", c.n + " " + L("TXANPON"), L("Maddik dendan zerbait salduko dizu."));
    } else if (c.t === "piece") pieceGet(c.id);
    else if (c.t === "item") ITEMS[c.id].get();
    persist();
    hud();
  }
  /* ---------------- ESTALPEAK eta ezkutuko zorroak (borroka-geletan) ----------------
     Bloke handiek gela azpi-espazioetan banatzen dute: itzalen proiektilak geldiarazten
     dituzte (shotCover) eta haien atzean, kameratik ezkutuan, txanpon-zorro bat egon daiteke. */
  function coverBlock(x, z, w, d, h, y = 0, kind = "stone") {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    if (kind === "crates") {
      /* egurrezko kutxa-pila (KayKit) */
      const n = Math.max(1, Math.round(Math.max(w, d) / 1.3));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5,
          ox = w >= d ? t * (w - 1.3) : 0,
          oz = w >= d ? 0 : t * (d - 1.3);
        model("crate_A_big", ox, 0, oz, 1.25, i * 0.4, g);
        if (i % 2 === 0) model("crate_B_small", ox * 0.9, 1.25, oz * 0.9, 0.75, i, g);
      }
    } else {
      const b = new T.Mesh(new T.BoxGeometry(w, h, d), stackMaterial());
      b.position.y = h / 2;
      b.castShadow = b.receiveShadow = true;
      g.add(b);
      const cap = new T.Mesh(new T.BoxGeometry(w + 0.2, 0.22, d + 0.2), rockMaterial());
      cap.position.y = h + 0.05;
      cap.castShadow = true;
      g.add(cap);
      const rune = new T.Mesh(new T.PlaneGeometry(Math.min(w, h) * 0.55, Math.min(w, h) * 0.55), new T.MeshBasicMaterial({ color: "#ffd38a", map: runeTexture(), transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }));
      rune.position.set(0, h * 0.55, d / 2 + 0.02);
      g.add(rune);
    }
    wallBlock(x, z, w, d, 0, y, h);
    /* talka (itzalak, proiektilak): zirkuluak blokearen luzeran */
    const n = Math.max(1, Math.round(Math.max(w, d) / Math.min(w, d))),
      r = (Math.min(w, d) / 2) * 1.08;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      solids.push({ x: x + (w >= d ? t * (w - 2 * r) : 0), z: z + (w >= d ? 0 : t * (d - 2 * r)), r, h, y, pillar: true });
    }
    return g;
  }
  const POUCHES = [];
  function pouch(id, x, y, z, n) {
    if (saved.chests.includes(id)) return null;
    const g = model("sack", x, y, z, 0.62, x * 1.7);
    const fl = glow(x, y + 0.5, z, "#ffe2a6", 1.4);
    const Pc = { id, x, y, z, n, g, fl, grp: BP, got: false };
    POUCHES.push(Pc);
    return Pc;
  }
  function pouchesUpdate(dt) {
    const grp = ZONES[ZONE.cur].group;
    for (const Pc of POUCHES) {
      if (Pc.got || Pc.grp !== grp) continue;
      Pc.fl.material.opacity = 0.35 + Math.sin(time * 4 + Pc.x) * 0.15;
      if (Math.hypot(P.x - Pc.x, P.z - Pc.z) < 1.15 && Math.abs(P.y - Pc.y) < 1.6) {
        Pc.got = true;
        Pc.g.visible = Pc.fl.visible = false;
        saved.chests.push(Pc.id);
        saved.coins += Pc.n;
        persist();
        SND.coin(true);
        fxBurst(Pc.x, Pc.y + 0.6, Pc.z, { n: 26, speed: 3, up: 3, life: 0.8, size: 0.24, color: "#ffe08a", grav: 3 });
        notify(L("Ezkutuko zorroa: +") + Pc.n + L(" txanpon."), "", 2.6);
        hud();
      }
    }
  }
  /* arnasa-zatiak: lau zati = arnasa bat gehiago */
  function pieceGet(id) {
    if (!saved.pieces.includes(id)) saved.pieces.push(id);
    const n = saved.pieces.length % 4,
      full = saved.pieces.length % 4 === 0;
    updateMaxHp();
    if (full) P.hp = P.maxHp;
    itemGet("zatia", L("ARNASA-ZATIA"), full ? L("Lau zati bilduta: arnasa bat gehiago!") : L("Lau zatirekin arnasa bat gehiago. Orain: ") + n + " / 4.");
  }
  function updateMaxHp() {
    P.maxHp = 5 + saved.hearts + Math.floor(saved.pieces.length / 4) + ((saved.boons || []).includes("heart") ? 1 : 0);
    P.hp = Math.min(P.hp, P.maxHp);
  }

  /* --------------------------- txanponak eta arnasa --------------------------- */
  const LOOT = [];
  const lootGeo = {};
  function dropLoot(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const heart = Math.random() < (P.hp < P.maxHp ? 0.28 : 0.06);
      const kind = heart ? "heart" : Math.random() < 0.15 ? "coin5" : "coin";
      lootGeo[kind] ||=
        kind === "heart"
          ? new T.IcosahedronGeometry(0.26, 0)
          : new T.CylinderGeometry(kind === "coin5" ? 0.3 : 0.22, kind === "coin5" ? 0.3 : 0.22, 0.07, 14);
      const m = new T.Mesh(lootGeo[kind], material(kind === "heart" ? "#ff5b6e" : kind === "coin5" ? "#9fe8ff" : "#ffd36a", 0.9));
      if (kind !== "heart") m.rotation.x = PI / 2;
      m.position.set(x, y + 1, z);
      (ZONES[ZONE.cur].group || scene).add(m);
      const a = Math.random() * TAU,
        sp = 1.5 + Math.random() * 2;
      LOOT.push({ kind, m, x, y: y + 1, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 5 + Math.random() * 2, floor: y, t: 0 });
    }
  }
  function lootUpdate(dt) {
    for (let i = LOOT.length - 1; i >= 0; i--) {
      const o = LOOT[i];
      o.t += dt;
      if (o.vy !== 0 || o.y > o.floor + 0.35) {
        o.vy -= 18 * dt;
        o.x += o.vx * dt;
        o.z += o.vz * dt;
        o.y += o.vy * dt;
        if (o.y < o.floor + 0.35) {
          o.y = o.floor + 0.35;
          o.vy = Math.abs(o.vy) > 2 ? -o.vy * 0.35 : 0;
          o.vx *= 0.5;
          o.vz *= 0.5;
        }
      }
      o.m.position.set(o.x, o.y + Math.sin(o.t * 3) * 0.06, o.z);
      o.m.rotation.y += dt * 3;
      const d = Math.hypot(P.x - o.x, P.z - o.z);
      /* hurbil daudenak Amaiurrengana erakarri */
      if (d < 3.2 && o.t > 0.4) {
        o.x += ((P.x - o.x) / d) * dt * 9;
        o.z += ((P.z - o.z) / d) * dt * 9;
        o.floor = P.y;
      }
      if ((d < 0.9 && Math.abs(P.y + 0.5 - o.y) < 1.6) || o.t > 30) {
        if (o.t <= 30) {
          if (o.kind === "heart") {
            P.hp = Math.min(P.maxHp, P.hp + 1);
            SND.heal();
          } else {
            saved.coins += o.kind === "coin5" ? 5 : 1;
            SND.coin(o.kind === "coin5");
          }
          fxBurst(o.x, o.y, o.z, { n: 8, speed: 2, up: 1.5, life: 0.4, size: 0.2, color: o.kind === "heart" ? "#ff8a9a" : "#ffe08a", grav: 0 });
          hud();
        }
        o.m.parent && o.m.parent.remove(o.m);
        LOOT.splice(i, 1);
      }
    }
  }

  /* ------------------------ gauza bat lortzean (une berezia) ------------------------ */
  const GET = { on: false, t: 0, mesh: null, next: null };
  function itemGet(icon, name, text, after) {
    GET.on = true;
    GET.t = 0;
    GET.next = after || null;
    paused = true;
    clearInput();
    if (GET.mesh) hero.remove(GET.mesh);
    GET.mesh = itemMesh(icon);
    GET.mesh.position.set(0, 3.1, 0);
    hero.add(GET.mesh);
    animate("Cheer");
    if (mixer) mixer.update(0.2);
    $("getIcon").textContent = ICONS[icon] || "✦";
    $("getName").textContent = name;
    $("getText").textContent = text;
    $("itemGet").hidden = false;
    SND.fanfare();
    haptic(50);
    fxRing(P.x, P.y + 0.2, P.z, "#ffe2a6", 4, 0.9);
  }
  function itemGetClose() {
    if (!GET.on || GET.t < 0.6) return;
    GET.on = false;
    $("itemGet").hidden = true;
    if (GET.mesh) {
      hero.remove(GET.mesh);
      GET.mesh = null;
    }
    paused = false;
    accumulator = 0;
    const next = GET.next;
    GET.next = null;
    if (next) next();
    hud();
  }
  function itemGetUpdate(dt) {
    if (!GET.on) return;
    GET.t += dt;
    if (GET.mesh) {
      GET.mesh.rotation.y += dt * 1.6;
      GET.mesh.position.y = 3.1 + Math.sin(GET.t * 2.5) * 0.08;
    }
    if (mixer) mixer.update(dt);
  }
  const ICONS = { makilak: "≋", giltza: "🗝", giltzanagusia: "🗝", txanponak: "◎", zatia: "♥", bihotza: "♥", katea: "⛓", erritmoa: "≋", botila: "⚱", bultzada: "◆", izpia: "✦", adarra: "♫", orrazia: "✧", sugarra: "✹", eraztuna: "◯", eguzkilore: "✺", tximista: "ϟ", enara: "⋎", ispilua: "☀" };
  function itemMesh(icon) {
    const g = new T.Group();
    if (icon === "makilak") {
      /* Iratiren txalaparta-makilak: bi makila gurutzatuta, mutur ilunekin */
      for (const s of [-1, 1]) {
        const st = new T.Mesh(new T.CylinderGeometry(0.045, 0.06, 1.15, 8), material("#c99a62", 0.15)),
          tip = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), material("#5a3c26"));
        tip.position.y = 0.58;
        st.add(tip);
        st.rotation.z = s * 0.42;
        g.add(st);
      }
    } else if (icon === "giltza" || icon === "giltzanagusia") {
      const k = model("key", 0, 0, 0, icon === "giltzanagusia" ? 1.1 : 0.8, 0, g);
      k.rotation.z = PI / 2;
      if (icon === "giltzanagusia") k.traverse((n) => n.isMesh && (n.material = material("#ff9d4a", 0.6)));
    } else if (icon === "zatia" || icon === "bihotza") {
      const h = new T.Mesh(new T.IcosahedronGeometry(icon === "bihotza" ? 0.5 : 0.36, 1), material("#ff5b6e", 0.8));
      g.add(h);
    } else if (icon === "katea") {
      for (let i = 0; i < 5; i++) {
        const l = new T.Mesh(new T.TorusGeometry(0.16, 0.05, 6, 14), material("#c9d6e3", 0.3));
        l.position.y = i * 0.22 - 0.44;
        l.rotation.y = i % 2 ? PI / 2 : 0;
        g.add(l);
      }
      const head = new T.Mesh(new T.ConeGeometry(0.16, 0.36, 6), material("#7fe3c0", 0.6));
      head.position.y = 0.72;
      g.add(head);
    } else if (icon === "adarra") {
      /* adarra: kono kurbatua zatika (bolizkoa, brontzezko ahoarekin) */
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.32,
          seg = new T.Mesh(new T.CylinderGeometry(0.06 + i * 0.035, 0.05 + i * 0.03, 0.3, 10), material(i === 5 ? "#c08a3e" : "#efe4cc", i === 5 ? 0.4 : 0.15));
        seg.position.set(Math.sin(a) * 0.55, Math.cos(a) * 0.55 - 0.3, 0);
        seg.rotation.z = -a;
        g.add(seg);
      }
    } else if (icon === "orrazia") {
      const c = new T.Mesh(new T.TorusGeometry(0.34, 0.07, 6, 16, PI), material("#ffd36a", 0.9));
      g.add(c);
      for (let i = 0; i < 7; i++) {
        const t = new T.Mesh(new T.BoxGeometry(0.035, 0.26, 0.035), material("#ffd36a", 0.9));
        t.position.set(-0.27 + i * 0.09, -0.12, 0);
        g.add(t);
      }
    } else if (icon === "eguzkilore") {
      const e = eguzkiloreMesh();
      e.rotation.x = PI / 2.4;
      e.scale.setScalar(0.62);
      g.add(e);
    } else if (icon === "tximista") {
      const st = new T.Mesh(new T.DodecahedronGeometry(0.3, 0), new T.MeshStandardMaterial({ color: "#3b4250", roughness: 0.5, metalness: 0.3, emissive: new T.Color("#7fc8ff"), emissiveIntensity: 1.6, flatShading: true }));
      g.add(st);
      for (let i = 0; i < 3; i++) {
        const bolt = new T.Mesh(new T.ConeGeometry(0.05, 0.5, 4), material("#dff3ff", 2));
        bolt.position.set(Math.cos(i * 2.1) * 0.42, 0.1, Math.sin(i * 2.1) * 0.42);
        bolt.rotation.z = Math.cos(i * 2.1) * 0.6;
        g.add(bolt);
      }
    } else if (icon === "enara") {
      /* enararen hegoak (txikiak) */
      const s = new T.Shape();
      s.moveTo(0, 0.12);
      s.bezierCurveTo(0.3, 0.2, 0.6, 0.05, 0.9, -0.34);
      s.bezierCurveTo(0.6, -0.2, 0.3, -0.18, 0, -0.12);
      s.closePath();
      const geo = new T.ShapeGeometry(s);
      for (const sx of [1, -1]) {
        const w = new T.Mesh(geo, new T.MeshStandardMaterial({ color: "#2a3a66", emissive: new T.Color("#3a5aa8"), emissiveIntensity: 0.6, side: T.DoubleSide }));
        w.scale.x = sx;
        g.add(w);
      }
      const b = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), material("#efe7d6", 0.3));
      g.add(b);
    } else if (icon === "ispilua") {
      /* EGUZKI-ISPILUA: brontzezko diskoa, eguzki-izpiak ertzean */
      const disc = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshStandardMaterial({ color: "#f6ecd0", metalness: 0.9, roughness: 0.15, emissive: new T.Color("#ffd27a"), emissiveIntensity: 0.9, side: T.DoubleSide }));
      g.add(disc);
      const rim = new T.Mesh(new T.TorusGeometry(0.44, 0.05, 6, 24), material("#b07a2e", 0.4));
      g.add(rim);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU,
          ray = new T.Mesh(new T.ConeGeometry(0.06, 0.2, 3), material("#ffc94a", 1.2));
        ray.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0);
        ray.rotation.z = a - PI / 2;
        g.add(ray);
      }
    } else if (icon === "sugarra") {
      const rod = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 1.2, 8), material("#4a4a4a", 0.2));
      rod.rotation.z = 0.4;
      const tip = new T.Mesh(new T.ConeGeometry(0.09, 0.34, 8), material("#ff7a2a", 2));
      tip.position.set(-0.27, 0.62, 0);
      tip.rotation.z = 0.4;
      g.add(rod, tip);
    } else {
      const o = new T.Mesh(new T.IcosahedronGeometry(0.34, 0), material("#ffd36a", 0.8));
      g.add(o);
    }
    g.add(new T.PointLight("#ffe2a6", 1.2, 6));
    return g;
  }
