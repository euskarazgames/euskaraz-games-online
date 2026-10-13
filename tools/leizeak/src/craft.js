  /* ==================================================================
     ESKU MAGIKOA · eraikuntza ukipenarekin (Ultrahand estiloan)
     · Ukitu pieza bat → altxatu. Arrastatu → mugitu. Ukitu laburra → biratu.
     · Askatzean, azpian duenaren gainean erortzen da (pilatu egiten dira);
       ondoan uzten diren piezak elkarri itsasten zaizkio eta batera mugitzen dira.
     · Erronka: gelako helburura (adib. ertz altu bat) iritsi → saria / atea.
     · Eremua: gela laukizuzena edo elipsea (I), zonaren taldearen barruan.
     ================================================================== */
  const CRAFT = { on: false, held: null, pieces: [], puzzles: [], ptr: null, down: null, group: 1, ray: new T.Raycaster(), plane: new T.Plane(new T.Vector3(0, 1, 0), 0), hit: new T.Vector3(), camPos: new T.Vector3(), camLook: new T.Vector3(), beam: null, marker: null };
  /* puzzleak (dungeon.js-ek betetzen ditu): { id, area: {x,z,y,w,d}, goal: plataforma, crates, planks, ghost, onSolve } */
  const PUZZLE_DEFS = [];
  /* eremua: laukizuzena (w, d) edo elipsea (rx, rz) */
  function inArea(I, x, z, m = 0) {
    if (I.rx) return Math.hypot((x - I.x) / (I.rx + m), (z - I.z) / (I.rz + m)) < 1;
    return Math.abs(x - I.x) < I.w / 2 + m && Math.abs(z - I.z) < I.d / 2 + m;
  }
  let woodMat = null;
  function craftMaterial() {
    if (woodMat) return woodMat;
    const key = EG && EG.has("planks") ? "planks" : EG && EG.has("wood") ? "wood" : null;
    woodMat = key ? EG.material(key, { color: "#c79a62", repeat: [1, 1], roughness: 0.9, normal: 1 }) : new T.MeshStandardMaterial({ color: "#a27648", roughness: 0.85 });
    return woodMat;
  }
  function addCratePiece(x, z, y, kind) {
    const crate = kind === "crate",
      w = crate ? 2 : 2.2,
      d = crate ? 2 : 5.2,
      h = crate ? 2 : 0.34,
      g = new T.Group(),
      m = new T.Mesh(new T.BoxGeometry(w, h, d), craftMaterial());
    m.position.y = -h / 2;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    /* ertz argiak: hartu daitekeela adierazteko */
    const edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w + 0.02, h + 0.02, d + 0.02)), new T.LineBasicMaterial({ color: "#3d2a17" }));
    edge.position.y = -h / 2;
    g.add(edge);
    if (crate)
      for (const s of [-1, 1]) {
        const band = new T.Mesh(new T.BoxGeometry(w + 0.04, 0.16, d + 0.04), new T.MeshStandardMaterial({ color: "#5b4632", roughness: 0.6, metalness: 0.4 }));
        band.position.y = -h / 2 + s * 0.62;
        g.add(band);
      }
    g.position.set(x, y + h, z);
    (BP || scene).add(g);
    const p = { x, z, y: y + h, w, d, h, phase: -1, piece: true, kind, m: g, edge, group: 0, home: { x, z, y: y + h }, rot: 0, vy: 0, fallT: 0 };
    platforms.push(p);
    CRAFT.pieces.push(p);
    return p;
  }
  /* zona bakoitzeko puzzleak, zona horren taldean (BP) eraikita */
  function buildCraft(zone) {
    PUZZLE_DEFS.filter((D) => D.zone === zone).forEach((D) => {
      const I = D.area,
        plat = D.goal,
        rune = ring(plat.x, plat.y + 0.06, plat.z, 0.62, "#ffd27a"),
        beacon = glow(plat.x, plat.y + 1.2, plat.z, "#ffd27a", 3.4);
      const Z = { id: D.id, D, I, rune, beacon, plat, solved: isCleared(D.id), ghosts: [], t: 0, group: BP };
      for (const [x, z] of D.crates) addCratePiece(x, z, I.y, "crate");
      for (const [x, z] of D.planks) addCratePiece(x, z, I.y, "plank");
      /* laguntza (super-gida): denbora luzez konpondu gabe → mamu-kaxak */
      for (const [x, z, lvl] of D.ghost) {
        const gm = new T.Mesh(new T.BoxGeometry(2, 2, 2), new T.MeshBasicMaterial({ color: "#9dffc4", transparent: true, opacity: 0.0, depthWrite: false }));
        gm.position.set(x, I.y + lvl * 2 - 1, z);
        gm.visible = false;
        BP.add(gm);
        Z.ghosts.push(gm);
      }
      CRAFT.puzzles.push(Z);
    });
    if (CRAFT.beam) return;
    /* eskutik piezara doan argi-izpia eta lurreratze-markatzailea */
    CRAFT.beam = new T.Mesh(new T.CylinderGeometry(0.05, 0.12, 1, 8, 1, true), new T.MeshBasicMaterial({ color: "#7dffc4", transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }));
    CRAFT.beam.visible = false;
    scene.add(CRAFT.beam);
    const mk = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: "#7dffc4", transparent: true, opacity: 0.35, depthWrite: false }));
    mk.rotation.x = -PI / 2;
    mk.visible = false;
    scene.add(mk);
    CRAFT.marker = mk;
  }
  const zoneHere = () => CRAFT.puzzles.find((Z) => Z.group === ZONES[ZONE.cur].group && inArea(Z.I, P.x, P.z, 1));
  const groupOf = (p) => (p.group ? CRAFT.pieces.filter((q) => q.group === p.group) : [p]);
  /* --------------------------- euskarria eta erorketa --------------------------- */
  function overlapsXZ(a, b, m = 0) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - m && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - m;
  }
  function supportFor(p, excl) {
    let best = -Infinity;
    const Z = CRAFT.zone || zoneHere();
    if (!Z) return best;
    const I = Z.I;
    if (inArea(I, p.x, p.z, -0.6)) best = I.y;
    /* gelako plataforma finkoak (adib. ertz altua) ere euskarri dira */
    for (const s of Z.D.supports || []) if (overlapsXZ(p, s, 0.3)) best = Math.max(best, s.y);
    for (const q of CRAFT.pieces) if (!excl.includes(q) && overlapsXZ(p, q, 0.12)) best = Math.max(best, q.y);
    return best;
  }
  function settle(list) {
    const base = Math.min(...list.map((p) => p.y - p.h));
    let land = -Infinity;
    for (const p of list) land = Math.max(land, supportFor({ x: p.x, z: p.z, w: p.w, d: p.d }, list) - (p.y - p.h - base));
    if (land === -Infinity) {
      /* azpian ezer ez: itsasora → etxera itzuli */
      for (const p of list) p.fallT = 0.001;
      return false;
    }
    const dy = land - base;
    for (const p of list) {
      p.y += dy;
      p.vy = 0;
    }
    /* jokalaria azpian harrapatuta badago, gainera igo */
    for (const p of list)
      if (contains(p, P.x, P.z, 0.1) && P.y < p.y - 0.25 && P.y > p.y - p.h - 1.7) {
        P.y = p.y;
        hero.position.y = P.y;
        P.vy = 0;
      }
    glueCheck(list);
    return true;
  }
  /* ondoko piezak (altuera berean) itsatsi */
  function glueCheck(list) {
    for (const p of list)
      for (const q of CRAFT.pieces) {
        if (list.includes(q) || Math.abs(p.y - q.y) > 0.12 || Math.abs(p.h - q.h) > 0.05) continue;
        const gx = Math.abs(p.x - q.x) - (p.w + q.w) / 2,
          gz = Math.abs(p.z - q.z) - (p.d + q.d) / 2,
          ox = (p.w + q.w) / 2 - Math.abs(p.x - q.x),
          oz = (p.d + q.d) / 2 - Math.abs(p.z - q.z);
        const touching = (Math.abs(gx) < 0.3 && oz > 0.8) || (Math.abs(gz) < 0.3 && ox > 0.8);
        if (!touching) continue;
        const gid = p.group || q.group || CRAFT.group++;
        for (const r of [...groupOf(p), ...groupOf(q)]) r.group = gid;
        fxBurst((p.x + q.x) / 2, p.y - p.h / 2, (p.z + q.z) / 2, { n: 18, speed: 2, up: 1, life: 0.6, size: 0.25, color: "#7dffc4", grav: 2 });
        SND.glue();
        haptic(14);
        notifyOnce("glue", "Piezak itsatsi dira: orain batera mugitzen dira.", "Las piezas se han unido: ahora se mueven juntas.");
      }
  }
  /* --------------------------- hartu, mugitu, biratu, askatu --------------------------- */
  function pointerRay(cx, cy) {
    const v = new T.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    CRAFT.ray.setFromCamera(v, camera);
    return CRAFT.ray;
  }
  function pickPiece(cx, cy) {
    const r = pointerRay(cx, cy),
      hits = r.intersectObjects(CRAFT.pieces.map((p) => p.m), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !CRAFT.pieces.some((p) => p.m === o)) o = o.parent;
      const p = CRAFT.pieces.find((q) => q.m === o);
      if (p && Math.hypot(p.x - P.x, p.z - P.z) < 30) return p;
    }
    return null;
  }
  function craftEnter() {
    const Z = zoneHere();
    if (!Z || CRAFT.on || !started || paused || cinematic) return false;
    CRAFT.on = true;
    CRAFT.zone = Z;
    /* kamera-trantsizioa uneko kameratik abiatu */
    CRAFT.camPos.copy(camera.position);
    CRAFT.camLook.set(P.x, P.y + 1, P.z);
    clearInput();
    document.body.classList.add("crafting");
    coachHide();
    SND.note(523, 0.4, 0.03);
    coach("craft-drag", "", "Ukitu kaxa bat eta arrastatu. Ukitu laburra: biratu. Pilatu kaxak errunara igotzeko.", "Toca una caja y arrástrala. Toque corto: girar. Apila cajas para subir a la runa.", null, "Ukitu kaxa bat eta arrastatu. Ukitu laburra: biratu. Pilatu kaxak errunara igotzeko.", "Toca una caja y arrástrala. Toque corto: girar. Apila cajas para subir a la runa.");
    return true;
  }
  function craftExit() {
    if (!CRAFT.on) return;
    if (CRAFT.held) craftRelease();
    CRAFT.on = false;
    document.body.classList.remove("crafting");
    CRAFT.beam.visible = CRAFT.marker.visible = false;
    CAM.pos = null;
    coachDone("craft-drag");
  }
  function craftToggle() {
    if (P.riding) return;
    if (CRAFT.on) craftExit();
    else if (!craftEnter())
      notify(L("ESKU MAGIKOA: kaxak dauden geletan bakarrik."), "", 3);
  }
  function craftGrab(p, cx, cy) {
    if (!CRAFT.on && !craftEnter()) return false;
    if (P.platform && groupOf(p).includes(P.platform)) {
      notify("Ezin duzu zapaltzen ari zaren pieza mugitu.", "No puedes mover la pieza que estás pisando.", 2);
      return false;
    }
    CRAFT.held = p;
    const r = pointerRay(cx, cy);
    CRAFT.plane.constant = -CRAFT.zone.I.y;
    if (r.ray.intersectPlane(CRAFT.plane, CRAFT.hit)) {
      CRAFT.offX = p.x - CRAFT.hit.x;
      CRAFT.offZ = p.z - CRAFT.hit.z;
    } else CRAFT.offX = CRAFT.offZ = 0;
    CRAFT.tx = p.x;
    CRAFT.tz = p.z;
    for (const q of groupOf(p)) q.edge.material.color.set("#7dffc4");
    SND.grab();
    haptic(10);
    return true;
  }
  function craftDrag(cx, cy) {
    const p = CRAFT.held;
    if (!p) return;
    const r = pointerRay(cx, cy);
    if (!r.ray.intersectPlane(CRAFT.plane, CRAFT.hit)) return;
    let tx = CRAFT.hit.x + CRAFT.offX,
      tz = CRAFT.hit.z + CRAFT.offZ;
    /* gelaren barruan mantendu */
    const I = CRAFT.zone.I;
    if (I.rx) {
      const ex = (tx - I.x) / I.rx,
        ez = (tz - I.z) / I.rz,
        ee = Math.hypot(ex, ez);
      if (ee > 0.84) {
        tx = I.x + (ex / ee) * 0.84 * I.rx;
        tz = I.z + (ez / ee) * 0.84 * I.rz;
      }
    } else {
      tx = clamp(tx, I.x - I.w / 2 + 1.4, I.x + I.w / 2 - 1.4);
      tz = clamp(tz, I.z - I.d / 2 + 1.4, I.z + I.d / 2 - 1.4);
    }
    for (const o of solids) {
      const ox = tx - o.x,
        oz = tz - o.z,
        od = Math.hypot(ox, oz),
        R = o.r + Math.max(p.w, p.d) * 0.5;
      if (od < R && od > 0.001) {
        tx = o.x + (ox / od) * R;
        tz = o.z + (oz / od) * R;
      }
    }
    CRAFT.tx = tx;
    CRAFT.tz = tz;
  }
  function craftRotate(p = CRAFT.held) {
    if (!p) return;
    const list = groupOf(p),
      cx = p.x,
      cz = p.z;
    for (const q of list) {
      const dx = q.x - cx,
        dz = q.z - cz;
      q.x = cx - dz;
      q.z = cz + dx;
      [q.w, q.d] = [q.d, q.w];
      q.rot = (q.rot + 1) % 4;
      q.m.rotation.y = (q.rot * PI) / 2;
    }
    if (!CRAFT.held) settle(list);
    SND.click();
    haptic(8);
  }
  function craftRelease() {
    const p = CRAFT.held;
    if (!p) return;
    CRAFT.held = null;
    CRAFT.last = p;
    const list = groupOf(p),
      snap = (v) => Math.round(v * 2) / 2,
      dx = snap(p.x) - p.x,
      dz = snap(p.z) - p.z;
    for (const q of list) {
      q.x += dx;
      q.z += dz;
      q.edge.material.color.set("#3d2a17");
    }
    if (settle(list)) {
      SND.thud();
      haptic(12);
      squashPiece(list);
      for (const q of list) fxBurst(q.x, q.y - q.h, q.z, { n: 6, speed: 2, up: 0.6, life: 0.4, size: 0.3, color: "#d9caa2", grav: 3 });
    }
    CRAFT.marker.visible = CRAFT.beam.visible = false;
  }
  function squashPiece(list) {
    for (const q of list) q.squash = 0.25;
  }
  /* --------------------------- eguneratzea --------------------------- */
  function craftUpdate(dt) {
    const p = CRAFT.held;
    if (p) {
      const list = groupOf(p),
        k = 1 - Math.exp(-dt * 16),
        nx = mix(p.x, CRAFT.tx, k),
        nz = mix(p.z, CRAFT.tz, k),
        dx = nx - p.x,
        dz = nz - p.z;
      for (const q of list) {
        q.x += dx;
        q.z += dz;
      }
      /* zintzilik: multzoaren behealdea euskarri guztien gainetik 0.7 m */
      const bottom = Math.min(...list.map((q) => q.y - q.h));
      let need = -Infinity;
      for (const q of list) need = Math.max(need, supportFor(q, list) - (q.y - q.h - bottom));
      if (need === -Infinity) need = CRAFT.zone.I.y;
      const dy = (need + 0.7 - bottom) * (1 - Math.exp(-dt * 12));
      for (const q of list) q.y += dy;
      /* izpia eskutik piezara */
      const hx = P.x + Math.sin(P.angle) * 0.4,
        hz = P.z + Math.cos(P.angle) * 0.4,
        hy = P.y + 1.5,
        tx = p.x,
        ty = p.y - p.h / 2,
        tz = p.z,
        L0 = Math.hypot(tx - hx, ty - hy, tz - hz);
      CRAFT.beam.visible = true;
      CRAFT.beam.position.set((hx + tx) / 2, (hy + ty) / 2, (hz + tz) / 2);
      CRAFT.beam.scale.set(1, L0, 1);
      CRAFT.beam.lookAt(tx, ty, tz);
      CRAFT.beam.rotateX(PI / 2);
      P.angle = Math.atan2(tx - P.x, tz - P.z);
      /* lurreratze-markatzailea */
      const land = supportFor(p, list);
      CRAFT.marker.visible = land > -Infinity;
      if (CRAFT.marker.visible) {
        CRAFT.marker.position.set(Math.round(p.x * 2) / 2, land + 0.04, Math.round(p.z * 2) / 2);
        CRAFT.marker.scale.set(p.w, p.d, 1);
      }
    }
    for (const q of CRAFT.pieces) {
      if (q.fallT > 0) {
        /* itsasora erortzen: ondoren etxera itzuli */
        q.fallT += dt;
        q.vy -= 25 * dt;
        q.y += q.vy * dt;
        if (q.fallT > 1.4) {
          Object.assign(q, { x: q.home.x, z: q.home.z, y: q.home.y, vy: 0, fallT: 0, group: 0 });
          fxBurst(q.x, q.y, q.z, { n: 16, speed: 2, up: 2, life: 0.7, size: 0.3, color: "#7dffc4", grav: -1 });
          notifyOnce("piece-home", "Pieza erori da: bere lekura itzuli da.", "La pieza ha caído: ha vuelto a su sitio.");
        }
      }
      q.squash = Math.max(0, (q.squash || 0) - dt);
      const s = q.squash > 0 ? 1 - Math.sin((q.squash / 0.25) * PI) * 0.12 : 1;
      q.m.position.set(q.x, q.y, q.z);
      q.m.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5);
    }
    /* puzzleak: helburuaren gainean → saria */
    for (const Z of CRAFT.puzzles) {
      Z.rune.rotation.z += dt * (Z.solved ? 0.4 : 1.4);
      Z.beacon.material.color.set(Z.solved ? "#9dffc4" : "#ffd27a");
      const here = Z.group === ZONES[ZONE.cur].group;
      if (here && !Z.solved && P.grounded && P.platform === Z.plat) {
        Z.solved = true;
        Z.rune.material = material("#9dffc4", 1.4);
        fxRing(Z.plat.x, Z.plat.y + 0.1, Z.plat.z, "#9dffc4", 6, 1);
        fxBurst(Z.plat.x, Z.plat.y + 1, Z.plat.z, { n: 40, speed: 4, up: 5, life: 1.2, size: 0.32, color: "#9dffc4", grav: -1 });
        craftExit();
        if (!saved.cleared.includes(Z.id)) saved.cleared.push(Z.id);
        persist();
        if (Z.D.onSolve) Z.D.onSolve();
      }
      /* super-gida: 70 s gelan konpondu gabe */
      if (here && !Z.solved && inArea(Z.I, P.x, P.z) && started && !paused) Z.t += dt;
      const show = !Z.solved && Z.t > 70;
      for (const g of Z.ghosts) {
        g.visible = show;
        g.material.opacity = 0.18 + 0.1 * Math.sin(time * 3);
      }
      if (show && !Z.hinted) {
        Z.hinted = true;
        notify("Laguntza: kaxa-mamuek eskailera bat erakusten dute.", "Ayuda: las cajas fantasma muestran una escalera.", 5);
      }
    }
  }
  /* kamera: eraikitzean eremua goitik ikusi */
  function craftCamera(dt) {
    const Z = CRAFT.zone,
      c = new T.Vector3(mix(Z.I.x, P.x, 0.45), Z.I.y + 1, mix(Z.I.z, P.z, 0.45)),
      pos = c.clone().add(new T.Vector3(7, mobile && innerHeight > innerWidth ? 30 : 22, 17));
    CRAFT.camPos.lerp(pos, 1 - Math.exp(-dt * 4));
    CRAFT.camLook.lerp(c, 1 - Math.exp(-dt * 4));
    camera.position.copy(CRAFT.camPos);
    camera.lookAt(CRAFT.camLook);
  }
  /* --------------------------- sarrera: ukipena eta sagua kanbasean --------------------------- */
  function bindCraftPointer() {
    const view = $("view");
    view.addEventListener("pointerdown", (e) => {
      if (!started || paused || cinematic || TXALA.on) return;
      /* saguaren eskuineko botoia: kamera biratu */
      if (e.pointerType === "mouse" && e.button === 2) {
        camGestureDown(e);
        view.setPointerCapture(e.pointerId);
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const p = zoneHere() ? pickPiece(e.clientX, e.clientY) : null;
      if (p) {
        CRAFT.down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), p, dragging: false };
        view.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      /* pieza ez bada: sagu-klika = erasoa (mahaigainean) */
      if (e.pointerType === "mouse") {
        if (!CRAFT.on) {
          ATK.hold = true;
          attack();
        }
        return;
      }
      /* ukipena pantailan (botoietatik kanpo): kamera biratu eta hurbildu */
      camGestureDown(e);
      view.setPointerCapture(e.pointerId);
    });
    view.addEventListener("pointermove", (e) => {
      if (camGestureMove(e)) return;
      const d = CRAFT.down;
      if (!d || d.id !== e.pointerId) return;
      if (!d.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 9) {
        d.dragging = craftGrab(d.p, d.x, d.y);
        if (!d.dragging) CRAFT.down = null;
      }
      if (d.dragging) craftDrag(e.clientX, e.clientY);
    });
    const up = (e) => {
      if (camGestureUp(e)) return;
      const d = CRAFT.down;
      if (!d || d.id !== e.pointerId) return;
      CRAFT.down = null;
      if (d.dragging) craftRelease();
      else if (performance.now() - d.t < 450) {
        /* ukitu laburra: biratu */
        if (!CRAFT.on) craftEnter();
        if (CRAFT.on && !(P.platform && groupOf(d.p).includes(P.platform))) craftRotate(d.p);
      }
    };
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
    view.addEventListener("wheel", (e) => {
      if (CRAFT.held) craftRotate();
      else camZoom(Math.exp(clamp(e.deltaY, -120, 120) * 0.0015));
      e.preventDefault();
    }, { passive: false });
    view.addEventListener("contextmenu", (e) => e.preventDefault());
  }
