  /* ==================================================================
     TXIMISTARRIA · tximista-harria (Jentilbaratzako tresna)
     Herri-sinesmenean, tximistak lurrera botatako harria; etxeetan gordetzen
     zen ekaitzetatik babesteko. Hemen: X (edo TXIMISTARRIA botoia) → harria
     jaurti; 1.7 s-ra lehertzen da, trumoi batekin:
     · harri arrakalatuak eta hormak apurtzen ditu (sorginkeriak ez);
     · itzalak zorabiatu eta zauritzen ditu, garaiaren ezkutua gorabehera;
     · kanpaiak jotzen ditu; beste tximistarriak ere lehertzen ditu;
     · Amaiur ere zauritzen du, hurbilegi badago!
     Hiru karga, berez betetzen dira. HAIZE-ADARRAk lurreko harriak bultzatzen ditu.
     ================================================================== */
  const TXB = { list: [], n: 3, max: 3, t: 0, light: null, flash: 0, geo: null, mat: null, thrown: 0, fx: [] };
  const hasBomb = () => saved.items.includes("tximistarria");
  const BOMB_FUSE = 1.7,
    BOMB_R = 3.4,
    BOMB_RECHARGE = 3,
    BOMB_G = 22;
  /* jaurtitzeko helburua: aurrean dagoen arrakala hurbilena (edo etsai nagusiaren puntua), bestela aurrera */
  function bombTarget(fa) {
    const fx = Math.sin(fa),
      fz = Math.cos(fa),
      grp = ZONES[ZONE.cur].group;
    let best = null,
      bs = 1e9;
    for (const B of BREAKABLES) {
      if (!B.bombOnly || B.broken || B.buildZone !== grp) continue;
      const dx = B.x - P.x,
        dz = B.z - P.z,
        d = Math.hypot(dx, dz);
      if (d > 13 || d < 1.5 || (dx * fx + dz * fz) / d < 0.55) continue;
      if (d < bs) (bs = d), (best = { x: B.x - (dx / d) * Math.min(1.4, (B.r || 1) * 0.6), y: B.y, z: B.z - (dz / d) * Math.min(1.4, (B.r || 1) * 0.6) });
    }
    if (!best && BOSS.on && BOSS.bombAim) best = BOSS.bombAim();
    if (best) return best;
    const g = support(P.x + fx * 6.5, P.z + fz * 6.5, P.y + 3);
    return { x: P.x + fx * 6.5, y: g ? topY(g, P.x + fx * 6.5, P.z + fz * 6.5) : P.y, z: P.z + fz * 6.5 };
  }
  function bombThrow() {
    if (!hasBomb() || !started || paused || TXALA.on || CRAFT.on || cinematic || respawnTimer || GET.on || P.climb || P.riding || CHAIN.state !== "idle") return;
    if (TXB.n < 1) {
      notify(L("Tximistarririk ez: itxaron pixka bat (berez betetzen dira)."), "", 1.6);
      return;
    }
    TXB.n--;
    TXB.thrown++;
    const fa = faceDir(),
      tg = bombTarget(fa),
      a = Math.atan2(tg.x - P.x, tg.z - P.z),
      o = { x: P.x + Math.sin(a) * 0.6, y: P.y + 1.5, z: P.z + Math.cos(a) * 0.6 },
      dx = tg.x - o.x,
      dz = tg.z - o.z,
      d = Math.hypot(dx, dz),
      T0 = clamp(d / 9, 0.42, 1.05);
    P.angle = a;
    MAG.aimT = 0.3;
    if (!TXB.geo) {
      TXB.geo = new T.DodecahedronGeometry(0.3, 0);
      TXB.mat = new T.MeshStandardMaterial({ color: "#3b4250", roughness: 0.5, metalness: 0.3, emissive: new T.Color("#7fc8ff"), emissiveIntensity: 0.6, flatShading: true });
    }
    const m = new T.Mesh(TXB.geo, TXB.mat.clone());
    m.castShadow = true;
    const spark = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#bfe6ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    spark.scale.setScalar(0.9);
    m.add(spark);
    m.position.set(o.x, o.y, o.z);
    ZONES[ZONE.cur].group.add(m);
    TXB.list.push({ m, spark, x: o.x, y: o.y, z: o.z, vx: dx / T0, vz: dz / T0, vy: (tg.y + 0.3 - o.y + 0.5 * BOMB_G * T0 * T0) / T0, t: 0, ck: 0, grp: ZONES[ZONE.cur].group });
    castAnim("Spellcast_Shoot", 2.2, 6);
    SND.throwStone();
    coachDone("bomb");
    hud();
  }
  /* HAIZE-ADARRA: aurreko konoan dauden harriak bultzatu */
  function bombsBlow(dx, dz) {
    let n = 0;
    for (const b of TXB.list) {
      const rx = b.x - P.x,
        rz = b.z - P.z,
        d = Math.hypot(rx, rz);
      if (d > 12 || (rx * dx + rz * dz) / (d || 1) < 0.6) continue;
      b.vx += dx * 10;
      b.vz += dz * 10;
      b.vy = Math.max(b.vy, 1.5);
      n++;
    }
    return n;
  }
  function bombsUpdate(dt) {
    if (hasBomb() && TXB.n < TXB.max) {
      TXB.t += dt;
      if (TXB.t >= BOMB_RECHARGE) {
        TXB.t = 0;
        TXB.n++;
        hud();
      }
    } else TXB.t = 0;
    if (TXB.light) {
      TXB.flash = Math.max(0, TXB.flash - dt * 5);
      TXB.light.intensity = TXB.flash * 9;
      TXB.light.visible = TXB.flash > 0.01;
    }
    /* tximista-izpiak, distirak eta erre-orbanak itzaltzen */
    for (let i = TXB.fx.length - 1; i >= 0; i--) {
      const f = TXB.fx[i];
      f.t += dt;
      const k = 1 - f.t / f.life;
      if (k <= 0) {
        f.m.parent && f.m.parent.remove(f.m);
        f.m.traverse((n) => n.material && n.material.dispose());
        TXB.fx.splice(i, 1);
        continue;
      }
      if (f.kind === "bolt") f.m.traverse((n) => n.material && (n.material.opacity = k * (Math.sin(f.t * 90) > -0.3 ? 1 : 0.3)));
      else if (f.kind === "glow") {
        f.m.material.opacity = k * k;
        f.m.scale.setScalar(f.s * (1 + (1 - k) * 0.6));
      } else f.m.material.opacity = 0.62 * Math.min(1, k * 3);
    }
    for (let i = TXB.list.length - 1; i >= 0; i--) {
      const b = TXB.list[i];
      if (b.grp !== ZONES[ZONE.cur].group) {
        bombRemove(b, i);
        continue;
      }
      b.t += dt;
      b.vy -= BOMB_G * dt;
      let nx = b.x + b.vx * dt,
        nz = b.z + b.vz * dt,
        ny = b.y + b.vy * dt;
      /* hormak eta plataformen alboak: errebotatu */
      for (const s of platforms) {
        if (s.off || (s.phase !== -1 && s.phase !== phase)) continue;
        const sy = topY(s, nx, nz);
        if (contains(s, nx, nz, 0.15) && !contains(s, b.x, b.z, 0.15) && b.y < sy - 0.2 && b.y > (s.bottom ?? sy - 0.5) - 0.3) {
          b.vx *= -0.45;
          b.vz *= -0.45;
          nx = b.x;
          nz = b.z;
        }
      }
      for (const o of solids) {
        if (!(o.r > 0)) continue;
        const ox = nx - o.x,
          oz = nz - o.z,
          od = Math.hypot(ox, oz);
        if (od < o.r + 0.3 && b.y < (o.y || 0) + o.h && od > 0.001) {
          nx = o.x + (ox / od) * (o.r + 0.3);
          nz = o.z + (oz / od) * (o.r + 0.3);
          const vn = (b.vx * ox + b.vz * oz) / od;
          if (vn < 0) {
            b.vx -= ((1.5 * vn * ox) / od);
            b.vz -= ((1.5 * vn * oz) / od);
          }
        }
      }
      /* lurra: errebote txikiak eta marruskadura */
      const g = support(nx, nz, Math.max(b.y, ny) + 0.3),
        fy = g ? topY(g, nx, nz) : -1e9;
      if (ny <= fy + 0.3 && b.vy <= 0) {
        ny = fy + 0.3;
        if (b.vy < -3.5) {
          b.vy *= -0.32;
          b.vx *= 0.75;
          b.vz *= 0.75;
          SND.thud(0.35);
        } else b.vy = 0;
        const k = Math.exp(-dt * 2.6);
        b.vx *= k;
        b.vz *= k;
      }
      b.x = nx;
      b.y = ny;
      b.z = nz;
      b.m.position.set(b.x, b.y, b.z);
      b.m.rotation.x += Math.hypot(b.vx, b.vz) * dt * 2.2;
      b.m.rotation.y += dt * 2;
      /* metxa: gero eta azkarrago dir-dir */
      const left = BOMB_FUSE - b.t,
        rate = left < 0.5 ? 26 : left < 1 ? 14 : 7,
        on = Math.sin(b.t * rate) > 0;
      b.m.material.emissiveIntensity = on ? 2.4 : 0.5;
      b.spark.material.opacity = on ? 1 : 0.35;
      b.spark.scale.setScalar(on ? 1.2 : 0.7);
      b.ck -= dt;
      if (b.ck <= 0) {
        b.ck = left < 0.6 ? 0.11 : 0.24;
        SND.crackle(left < 0.6 ? 1.2 : 0.7);
        fxBurst(b.x, b.y + 0.35, b.z, { n: 2, speed: 2.4, up: 2, life: 0.25, size: 0.18, color: "#d8f0ff", grav: 2 });
      }
      if (b.y < ZONES[ZONE.cur].fallY - 2) {
        bombRemove(b, i);
        continue;
      }
      if (b.t >= BOMB_FUSE) {
        bombRemove(b, i);
        bombExplode(b.x, b.y, b.z);
      }
    }
  }
  function bombRemove(b, i) {
    b.m.parent && b.m.parent.remove(b.m);
    b.m.material.dispose();
    b.spark.material.dispose();
    TXB.list.splice(i, 1);
  }
  /* trumoia: apurtu, zorabiatu, zauritu, kanpaiak jo */
  function bombExplode(x, y, z) {
    if (!TXB.light) {
      TXB.light = new T.PointLight("#cfe6ff", 0, 26, 1.6);
      scene.add(TXB.light);
    }
    TXB.light.position.set(x, y + 1.6, z);
    TXB.flash = 1;
    fxRing(x, y + 0.15, z, "#d6ecff", BOMB_R + 1.4, 0.45);
    lightningFx(x, y, z);
    fxBurst(x, y + 0.6, z, { n: 42, speed: 9, up: 3, life: 0.55, size: 0.45, color: "#e8f4ff", grav: 3 });
    fxBurst(x, y + 0.4, z, { n: 26, speed: 5, up: 4, life: 0.95, size: 0.55, color: "#56627a", grav: 6, drag: 1.5 });
    shake(0.36);
    haptic(45);
    hitStop = Math.max(hitStop, 0.04);
    SND.thunder();
    bombBreak(x, y, z, BOMB_R);
    /* fisika (Jolt): upelak, harriak eta zatiak hegan */
    physBlast(x, y, z, BOMB_R + 3.5);
    for (const e of ENEMIES) {
      if (e.state === "dead" || e.state === "spawn") continue;
      const dx = e.x - x,
        dz = e.z - z,
        d = Math.hypot(dx, dz);
      if (d > BOMB_R + e.D.r || Math.abs(e.y - y) > 3) continue;
      e.stun = Math.max(e.stun, 1.4);
      if (e.state === "wind" || e.state === "charge" || e.state === "lunge") (e.state = "recover"), (e.t = 0);
      hitEnemy(e, 3, dx / (d || 1), dz / (d || 1), true);
      e.vx += (dx / (d || 1)) * (8 / e.D.mass);
      e.vz += (dz / (d || 1)) * (8 / e.D.mass);
    }
    for (const R of RUNES) if (R.live && R.live() && !R.lit && Math.hypot(R.x - x, R.y - y, R.z - z) < BOMB_R + 1 && !R.needFire) R.hit(null);
    if (BOSS.on && BOSS.bomb) BOSS.bomb(x, y, z, BOMB_R);
    /* beste harriak: kate-erreakzioa */
    for (const b of TXB.list) if (Math.hypot(b.x - x, b.z - z) < BOMB_R && b.t < BOMB_FUSE - 0.1) b.t = BOMB_FUSE - 0.1;
    const pd = Math.hypot(P.x - x, P.z - z);
    if (pd < 2.5 && Math.abs(P.y - y) < 2.2) {
      if (saved.assist) {
        P.vx += ((P.x - x) / (pd || 1)) * 8;
        P.vz += ((P.z - z) / (pd || 1)) * 8;
      } else playerHit(1, x, z);
      notifyOnce("bomb-self", L("Kontuz! Tximistarria hurbilegi lehertu da."), "");
    }
  }
  /* tximista zerutik (zigi-zaga), distira handia eta lurrean erre-orbana */
  function lightningFx(x, y, z) {
    const grp = ZONES[ZONE.cur].group,
      g = new T.Group(),
      mat = () => new T.MeshBasicMaterial({ color: "#e6f4ff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    let px = x + (Math.random() - 0.5) * 2,
      py = y + 14,
      pz = z + (Math.random() - 0.5) * 2;
    for (let i = 0; i < 9; i++) {
      const k = (i + 1) / 9,
        nx = i === 8 ? x : x + (Math.random() - 0.5) * 2.4 * (1 - k),
        ny = y + 14 * (1 - k),
        nz = i === 8 ? z : z + (Math.random() - 0.5) * 2.4 * (1 - k),
        len = Math.hypot(nx - px, ny - py, nz - pz),
        seg = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, len, 4, 1, true), mat());
      seg.position.set((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2);
      seg.lookAt(nx, ny, nz);
      seg.rotateX(PI / 2);
      g.add(seg);
      [px, py, pz] = [nx, ny, nz];
    }
    grp.add(g);
    TXB.fx.push({ kind: "bolt", m: g, t: 0, life: 0.22 });
    const glowS = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#d9eeff", transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    glowS.position.set(x, y + 1, z);
    glowS.scale.setScalar(9);
    grp.add(glowS);
    TXB.fx.push({ kind: "glow", m: glowS, t: 0, life: 0.35, s: 9 });
    const scorch = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), new T.MeshBasicMaterial({ map: glowTexture, color: "#000000", transparent: true, opacity: 0.6, depthWrite: false }));
    scorch.rotation.x = -PI / 2;
    scorch.position.set(x, y - 0.27, z);
    scorch.renderOrder = 2;
    grp.add(scorch);
    TXB.fx.push({ kind: "scorch", m: scorch, t: 0, life: 5 });
  }
  /* --------------------------- harri arrakalatuak --------------------------- */
  let CRACK_MAT = null;
  function crackMaterial() {
    if (CRACK_MAT) return CRACK_MAT;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    let sd = 5;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const branch = (px, py, a, len, w, depth) => {
      x.lineWidth = w;
      x.beginPath();
      x.moveTo(px, py);
      let cx = px,
        cy = py;
      const n = 6;
      for (let i = 0; i < n; i++) {
        a += (rnd() - 0.5) * 0.9;
        cx += Math.cos(a) * (len / n);
        cy += Math.sin(a) * (len / n);
        x.lineTo(cx, cy);
        if (depth > 0 && rnd() < 0.35) {
          x.stroke();
          branch(cx, cy, a + (rnd() > 0.5 ? 0.8 : -0.8), len * 0.45, w * 0.6, depth - 1);
          x.lineWidth = w;
          x.beginPath();
          x.moveTo(cx, cy);
        }
      }
      x.stroke();
    };
    x.lineCap = x.lineJoin = "round";
    /* argi-ertza lehenik (zabalagoa), gero pitzadura iluna */
    for (const [col, k] of [["rgba(190,220,255,0.55)", 1.9], ["#140f0c", 1]]) {
      sd = 5;
      x.strokeStyle = col;
      for (let i = 0; i < 8; i++) branch(128, 128, (i / 8) * TAU + rnd() * 0.4, 70 + rnd() * 50, (5 - i * 0.3) * k, 2);
    }
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    CRACK_MAT = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    return CRACK_MAT;
  }
  /* harri-horma arrakalatua (TXIMISTARRIAk bakarrik apurtzen du) */
  function crackWall(id, x, z, w, d, h, opts = {}) {
    const y0 = opts.y || 0,
      g = new T.Group();
    g.position.set(x, y0, z);
    BP.add(g);
    const wall = new T.Mesh(new T.BoxGeometry(w, h, d), opts.mat || rockMaterial());
    wall.position.y = h / 2;
    wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    const along = w >= d,
      size = Math.min((along ? w : d) * 0.95, h * 1.25);
    for (const s of [-1, 1]) {
      const pl = new T.Mesh(new T.PlaneGeometry(size, size), crackMaterial());
      if (along) pl.position.set(0, h * 0.48, s * (d / 2 + 0.02));
      else pl.position.set(s * (w / 2 + 0.02), h * 0.48, 0);
      pl.rotation.y = along ? (s > 0 ? 0 : PI) : s > 0 ? PI / 2 : -PI / 2;
      g.add(pl);
    }
    /* oinean harri-koskorrak */
    for (let i = 0; i < 4; i++) {
      const r = new T.Mesh(new T.DodecahedronGeometry(0.25 + (i % 2) * 0.15, 0), rockMaterial());
      r.position.set(along ? (i - 1.5) * (w / 4) : (i % 2 ? 1 : -1) * (w / 2 + 0.3), 0.2, along ? (i % 2 ? 1 : -1) * (d / 2 + 0.3) : (i - 1.5) * (d / 4));
      g.add(r);
    }
    const p = wallBlock(x, z, w, d, 0, y0, h + (opts.extra ?? 2));
    const done = isCleared(id);
    g.visible = !done;
    p.off = done;
    const B = {
      kind: "arrakala",
      id,
      x,
      y: y0,
      z,
      m: g,
      r: Math.max(w, d) / 2,
      broken: done,
      buildZone: BP,
      bombOnly: true,
      hint: L("Harri arrakalatua: sorginkeriak ez du apurtzen… TXIMISTA batek bai."),
      solid: { r: 0 },
      hitTest: (bx, by, bz, r) => by < y0 + h + 1 && Math.abs(bx - x) < w / 2 + r && Math.abs(bz - z) < d / 2 + r,
      custom: () => {
        g.visible = false;
        p.off = true;
        if (!saved.cleared.includes(id)) saved.cleared.push(id);
        persist();
        SND.crumble();
        for (let i = 0; i < 6; i++) fxBurst(x + (along ? (i - 2.5) * (w / 6) : 0), y0 + 1 + (i % 3) * (h / 4), z + (along ? 0 : (i - 2.5) * (d / 6)), { n: 14, speed: 4, up: 3, life: 0.9, size: 0.4, color: "#8d8577", grav: 9 });
        if (opts.onBreak) opts.onBreak();
        else notifyOnce("crack-" + id, L("Harria apurtu da!"), "");
      },
    };
    BREAKABLES.push(B);
    return B;
  }
  /* harkaitz arrakalatua (haranean: zuloak eta sekretuak ixten ditu) */
  function crackRock(id, x, y, z, r, opts = {}) {
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const geo = new T.DodecahedronGeometry(r, 1),
      pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + 0.12 * Math.sin(pos.getX(i) * 3.1 + pos.getZ(i) * 2.3);
      pos.setXYZ(i, pos.getX(i) * k, Math.max(-r * 0.2, pos.getY(i)) * 0.85, pos.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const rock = new T.Mesh(geo, rockMaterial());
    rock.position.y = r * 0.55;
    rock.castShadow = rock.receiveShadow = true;
    g.add(rock);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4,
        pl = new T.Mesh(new T.PlaneGeometry(r * 1.4, r * 1.4), crackMaterial());
      pl.position.set(Math.sin(a) * r * 0.93, r * 0.62, Math.cos(a) * r * 0.93);
      pl.rotation.y = a;
      g.add(pl);
    }
    const solid = { x, z, r: r * 0.95, h: r * 1.6, y, pillar: true };
    solids.push(solid);
    const done = isCleared(id);
    g.visible = !done;
    if (done) solid.r = -1;
    const B = {
      kind: "arrakala",
      id,
      x,
      y,
      z,
      m: g,
      r,
      broken: done,
      buildZone: BP,
      bombOnly: true,
      hint: L("Harkaitz arrakalatua: sorginkeriak ez du apurtzen… TXIMISTA batek bai."),
      solid: { r: 0 },
      hitTest: (bx, by, bz, rr) => by < y + r * 1.7 && Math.hypot(bx - x, bz - z) < r + rr,
      custom: () => {
        g.visible = false;
        solid.r = -1;
        if (!saved.cleared.includes(id)) saved.cleared.push(id);
        persist();
        SND.crumble();
        for (let i = 0; i < 5; i++) fxBurst(x + Math.cos(i) * r * 0.6, y + 0.8 + (i % 2), z + Math.sin(i) * r * 0.6, { n: 14, speed: 4, up: 3, life: 0.9, size: 0.42, color: "#8d8577", grav: 9 });
        if (opts.onBreak) opts.onBreak();
      },
    };
    BREAKABLES.push(B);
    return B;
  }
  function crackNear(r) {
    const grp = ZONES[ZONE.cur].group;
    return BREAKABLES.find((B) => B.bombOnly && !B.broken && B.buildZone === grp && Math.hypot(B.x - P.x, B.z - P.z) < r + (B.r || 0));
  }
