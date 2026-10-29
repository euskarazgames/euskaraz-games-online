  /* ==================================================================
     FISIKA · Jolt Physics (JoltPhysics.js 1.1.1, MIT) — gorputz dinamikoak
     · Mundu estatikoa gune eta garai bakoitzean: jokoaren talka-datu berberak (navGeometry, "phys"
       moduan: lur osoa, ibai-ohea eta izotza barne; plataformak, hormak eta solido finkoak) MeshShape
       bakarrean. Zonaz edo garaiz aldatzean, dagokiona.
     · Gorputz dinamikoak: upelak eta kaxak (bultzatu, eztandek hegan bidali), harri biribilak (aldapan
       behera jaisten dira; azkar badatoz, min ematen dute), harri-kuboa (bultzatu eta gainera igo) eta
       apurtutakoen zatiak (egurra, harria, izotza).
     · Amaiur eta etsaiak ez daude Jolt-en: haien talka-sistemak (solids) gorputz dinamikoak oztopo gisa
       ikusten ditu — ezin dira zeharkatu — eta bultzada itzultzen die (physPush).
     · Jolt beranduago kargatzen da (/assets/vendor/jolt-physics.js, ~1 MB gzip; fitxategi bakarrean,
       barruan): bitartean edo ezin bada, jokabide zaharra (upelak geldi, zatirik ez).
     Probetan: __game.PHYS, physLoad(), physPush(), physBlast().
     ================================================================== */
  const PHYS = { ok: false, loading: null, J: null, iface: null, bi: null, stat: {}, cur: null, items: [], frags: [], acc: 0, ms: {}, v: null, p: null, hurtT: 0, steps: 0 };
  const PL_STATIC = 0,
    PL_MOVE = 1,
    PHYS_DT = 1 / 60;
  /* upel/kaxa/harri bakoitza: forma, masa (kg) eta bultzada (Amaiurren abiaduraren zatia) */
  const PHYS_KIND = {
    barrel: { shape: "cyl", r: 0.5, h: 1.5, mass: 45, push: 0.95, fric: 0.6, col: "#8a6440" },
    crate_A_big: { shape: "box", w: 1.15, h: 1.25, d: 1.15, mass: 35, push: 0.9, fric: 0.7, col: "#a37a4c" },
    boulder: { shape: "sphere", r: 0.95, mass: 420, push: 0.6, fric: 0.9, col: "#8d8a84" },
    block: { shape: "box", w: 1.45, h: 1.45, d: 1.45, mass: 380, push: 0.42, fric: 0.75, col: "#9a958c" },
  };
  /* eraikitzen ari den gunea (BP taldearen jabea) */
  function buildZoneId() {
    for (const k in ZONES) if (ZONES[k].group && ZONES[k].group === BP) return k;
    return ZONE.cur;
  }
  /* gorputz dinamiko bat erregistratu (eraikitzean): m eredua (BP-n), x/y/z oinarria, solidoa (talka) */
  function physItem(kind, m, x, y, z, solid, extra = {}) {
    const K = PHYS_KIND[kind],
      hc = K.shape === "sphere" ? K.r : K.h / 2,
      parent = m.parent || BP || scene,
      pivot = new T.Group();
    pivot.position.set(x, y + hc, z);
    parent.add(pivot);
    const yaw = m.rotation.y;
    m.position.set(0, -hc, 0);
    m.rotation.set(0, yaw, 0);
    pivot.add(m);
    const I = { kind, K, m, pivot, zone: buildZoneId(), x0: x, y0: y, z0: z, x, y, z, hc, solid, body: null, ...extra };
    solid.dyn = true;
    solid.item = I;
    PHYS.items.push(I);
    return I;
  }
  /* ------------------------------ kargatu eta munduak ------------------------------ */
  function physLoad() {
    if (PHYS.loading) return PHYS.loading;
    const script = () =>
      window.JoltPhys
        ? Promise.resolve()
        : new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "/assets/vendor/jolt-physics.js";
            s.onload = res;
            s.onerror = () => rej(new Error("jolt-physics.js ezin kargatu"));
            document.head.appendChild(s);
          });
    PHYS.loading = script()
      .then(() => JoltPhys.initJolt())
      .then((J) => {
        physSetup(J);
        PHYS.ok = true;
        physSync();
      })
      .catch((e) => console.warn("fisika", e));
    return PHYS.loading;
  }
  function physSetup(J) {
    PHYS.J = J;
    const S = new J.JoltSettings(),
      opf = new J.ObjectLayerPairFilterTable(2),
      bpi = new J.BroadPhaseLayerInterfaceTable(2, 2);
    opf.EnableCollision(PL_STATIC, PL_MOVE);
    opf.EnableCollision(PL_MOVE, PL_MOVE);
    bpi.MapObjectToBroadPhaseLayer(PL_STATIC, new J.BroadPhaseLayer(0));
    bpi.MapObjectToBroadPhaseLayer(PL_MOVE, new J.BroadPhaseLayer(1));
    S.mObjectLayerPairFilter = opf;
    S.mBroadPhaseLayerInterface = bpi;
    S.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(S.mBroadPhaseLayerInterface, 2, S.mObjectLayerPairFilter, 2);
    PHYS.iface = new J.JoltInterface(S);
    J.destroy(S);
    PHYS.sys = PHYS.iface.GetPhysicsSystem();
    PHYS.bi = PHYS.sys.GetBodyInterface();
    PHYS.sys.SetGravity(new J.Vec3(0, -20, 0));
    PHYS.v = new J.Vec3(0, 0, 0);
    PHYS.p = new J.RVec3(0, 0, 0);
    PHYS.q = new J.Quat(0, 0, 0, 1);
  }
  /* gune + garai baterako mundu estatikoa (MeshShape bat), behar denean eraikita */
  function physStatic(zone, ph) {
    const key = zone + ":" + ph;
    if (key in PHYS.stat) return PHYS.stat[key];
    const J = PHYS.J,
      t0 = performance.now(),
      g = navGeometry(zone, ph, true);
    let body = null;
    if (g.idx.length) {
      const vl = new J.VertexList(),
        tl = new J.IndexedTriangleList(),
        f3 = new J.Float3(0, 0, 0),
        it = new J.IndexedTriangle();
      vl.reserve(g.pos.length / 3);
      for (let i = 0; i < g.pos.length; i += 3) {
        f3.x = g.pos[i];
        f3.y = g.pos[i + 1];
        f3.z = g.pos[i + 2];
        vl.push_back(f3);
      }
      tl.reserve(g.idx.length / 3);
      for (let i = 0; i < g.idx.length; i += 3) {
        it.set_mIdx(0, g.idx[i]);
        it.set_mIdx(1, g.idx[i + 1]);
        it.set_mIdx(2, g.idx[i + 2]);
        tl.push_back(it);
      }
      const ms = new J.MeshShapeSettings(vl, tl, new J.PhysicsMaterialList());
      ms.Sanitize();
      const res = ms.Create();
      if (res.IsValid()) {
        PHYS.p.Set(0, 0, 0);
        const bcs = new J.BodyCreationSettings(res.Get(), PHYS.p, PHYS.q, J.EMotionType_Static, PL_STATIC);
        bcs.mFriction = 0.8;
        body = PHYS.bi.CreateBody(bcs);
        J.destroy(bcs);
      } else console.warn("fisika: mundu estatikoa", key);
      for (const o of [vl, tl, f3, it, ms]) J.destroy(o);
    }
    PHYS.ms[key] = Math.round(performance.now() - t0);
    return (PHYS.stat[key] = body);
  }
  /* gune/garai aktiboarekin bat etorri: mundu estatikoa trukatu eta guneko gorputzak sortu/kendu */
  function physSync() {
    if (!PHYS.ok) return;
    const bi = PHYS.bi,
      J = PHYS.J,
      key = ZONE.cur + ":" + phase;
    if (PHYS.cur === key) return;
    const prevZone = PHYS.cur && PHYS.cur.split(":")[0];
    if (PHYS.cur && PHYS.stat[PHYS.cur]) bi.RemoveBody(PHYS.stat[PHYS.cur].GetID());
    PHYS.cur = key;
    const S = physStatic(ZONE.cur, phase);
    if (S) bi.AddBody(S.GetID(), J.EActivation_DontActivate);
    if (prevZone !== ZONE.cur) {
      /* beste garaiko mundua ere orain (zonara sartzean, fundidoan): garaiz aldatzean ez da zain geratzen */
      physStatic(ZONE.cur, 1 - phase);
      for (const I of PHYS.items) if (I.body && I.zone !== ZONE.cur) physDrop(I);
      for (const F of PHYS.frags.splice(0)) fragKill(F);
      for (const I of PHYS.items) if (!I.body && I.zone === ZONE.cur && !(I.B && I.B.broken)) physSpawn(I);
    } else for (const I of PHYS.items) if (I.body && !I.rest) bi.ActivateBody(I.body.GetID());
  }
  /* gorputza sortu (azken lekuan) */
  function physSpawn(I) {
    const J = PHYS.J,
      K = I.K,
      shape = K.shape === "sphere" ? new J.SphereShape(K.r, null) : K.shape === "cyl" ? new J.CylinderShape(K.h / 2, K.r, 0.05, null) : new J.BoxShape(new J.Vec3(K.w / 2, K.h / 2, K.d / 2), 0.05, null);
    PHYS.p.Set(I.pivot.position.x, I.pivot.position.y, I.pivot.position.z);
    const q = I.pivot.quaternion;
    PHYS.q.Set(q.x, q.y, q.z, q.w);
    const bcs = new J.BodyCreationSettings(shape, PHYS.p, PHYS.q, J.EMotionType_Dynamic, PL_MOVE);
    bcs.mFriction = K.fric;
    bcs.mRestitution = 0.12;
    bcs.mLinearDamping = 0.15;
    bcs.mAngularDamping = K.shape === "sphere" ? 0.25 : 0.6;
    bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia;
    bcs.mMassPropertiesOverride.mMass = K.mass;
    bcs.mMotionQuality = J.EMotionQuality_LinearCast;
    I.body = PHYS.bi.CreateBody(bcs);
    J.destroy(bcs);
    PHYS.bi.AddBody(I.body.GetID(), J.EActivation_DontActivate);
    /* harri biribilak eta kuboa geldi (lotan) lehen bultzadara arte: maldan ere ez dira berez jaisten */
    if (I.rest === undefined) I.rest = I.kind === "boulder" || I.kind === "block";
  }
  function physDrop(I) {
    if (!I.body) return;
    PHYS.bi.RemoveBody(I.body.GetID());
    PHYS.bi.DestroyBody(I.body.GetID());
    I.body = null;
  }
  /* ------------------------------ bultzadak ------------------------------ */
  /* Amaiurrek (edo etsai batek) solido dinamiko bat bultzatu: norabidea (ux, uz), abiadura v (m/s) */
  function physPush(o, ux, uz, v) {
    const I = o.item;
    if (!PHYS.ok || !I || !I.body || !(v > 0.05)) return;
    const bi = PHYS.bi,
      id = I.body.GetID(),
      lv = bi.GetLinearVelocity(id),
      vx = lv.GetX(),
      vy = lv.GetY(),
      vz = lv.GetZ(),
      along = vx * ux + vz * uz,
      want = v * I.K.push;
    if (along >= want) return;
    const dv = want - along;
    PHYS.v.Set(vx + ux * dv, vy, vz + uz * dv);
    bi.SetLinearVelocity(id, PHYS.v);
    bi.ActivateBody(id);
    I.rest = false;
    if (I.onPush) I.onPush();
  }
  /* eztanda (TXIMISTARRIA) edo kolpe handia: erradioko gorputzak eta zatiak kanpora */
  function physBlast(x, y, z, r, power = 14) {
    if (!PHYS.ok) return 0;
    let n = 0;
    const bi = PHYS.bi;
    for (const I of [...PHYS.items.filter((I) => I.body), ...PHYS.frags]) {
      const p = bi.GetPosition(I.body.GetID()),
        dx = p.GetX() - x,
        dy = p.GetY() - y,
        dz = p.GetZ() - z,
        d = Math.hypot(dx, dy, dz);
      if (d > r) continue;
      const k = (power * (1 - d / r) * (I.K ? Math.min(1, 120 / I.K.mass + 0.35) : 1)) / (d || 1);
      const lv = bi.GetLinearVelocity(I.body.GetID());
      PHYS.v.Set(lv.GetX() + dx * k, lv.GetY() + Math.max(2, dy * k + power * 0.35 * (1 - d / r)), lv.GetZ() + dz * k);
      bi.SetLinearVelocity(I.body.GetID(), PHYS.v);
      bi.ActivateBody(I.body.GetID());
      I.rest = false;
      n++;
    }
    return n;
  }
  /* ------------------------------ zatiak (apurtzean) ------------------------------ */
  const FRAG_GEO = {};
  function physDebris(x, y, z, col, n = 9, size = 0.22, sp = 4.5) {
    if (!PHYS.ok || !PHYS.cur) return 0;
    const J = PHYS.J,
      mat = material(col, 0.85),
      parent = ZONES[ZONE.cur].group || scene;
    for (let i = 0; i < n; i++) {
      const s = size * (0.6 + ((i * 37) % 10) / 14),
        w = s * (1.4 + (i % 3) * 0.3),
        h = s * 0.55,
        d = s;
      const key = w.toFixed(2) + h.toFixed(2) + d.toFixed(2),
        geo = (FRAG_GEO[key] ||= new T.BoxGeometry(w, h, d));
      const m = new T.Mesh(geo, mat);
      m.castShadow = true;
      parent.add(m);
      const a = (i / n) * TAU + Math.random() * 0.6,
        ox = Math.cos(a) * 0.25,
        oz = Math.sin(a) * 0.25;
      PHYS.p.Set(x + ox, y + (i % 3) * 0.18, z + oz);
      PHYS.q.Set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5, 1);
      const len = Math.hypot(PHYS.q.GetX(), PHYS.q.GetY(), PHYS.q.GetZ(), 1);
      PHYS.q.Set(PHYS.q.GetX() / len, PHYS.q.GetY() / len, PHYS.q.GetZ() / len, 1 / len);
      const bcs = new J.BodyCreationSettings(new J.BoxShape(new J.Vec3(w / 2, h / 2, d / 2), 0.02, null), PHYS.p, PHYS.q, J.EMotionType_Dynamic, PL_MOVE);
      bcs.mFriction = 0.7;
      bcs.mRestitution = 0.25;
      bcs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia;
      bcs.mMassPropertiesOverride.mMass = 1.5;
      const body = PHYS.bi.CreateBody(bcs);
      J.destroy(bcs);
      PHYS.bi.AddBody(body.GetID(), J.EActivation_Activate);
      const v = sp * (0.6 + Math.random() * 0.6);
      PHYS.v.Set(Math.cos(a) * v, 3 + Math.random() * 3.5, Math.sin(a) * v);
      PHYS.bi.SetLinearVelocity(body.GetID(), PHYS.v);
      PHYS.v.Set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      PHYS.bi.SetAngularVelocity(body.GetID(), PHYS.v);
      PHYS.frags.push({ m, body, t: 0, life: 3.2 + Math.random() * 1.2, mat });
    }
    /* gehienez 60 zati aldi berean (zaharrenak kanpo) */
    while (PHYS.frags.length > 60) fragKill(PHYS.frags.shift());
    return n;
  }
  function fragKill(F) {
    PHYS.bi.RemoveBody(F.body.GetID());
    PHYS.bi.DestroyBody(F.body.GetID());
    F.m.parent && F.m.parent.remove(F.m);
  }
  /* apurtzen denaren kolorea (egurra, harria, izotza) */
  function debrisColor(B) {
    if (B.fireOnly) return "#7a5a3a";
    if (B.bombOnly) return "#8d8a84";
    if (B.ice || /izotz|ice/.test(B.kind || "")) return "#cfeefa";
    return B.kind === "barrel" ? "#8a6440" : "#a37a4c";
  }
  /* ------------------------------ urratsa ------------------------------ */
  function physUpdate(dt) {
    if (!PHYS.ok || !PHYS.cur) return;
    PHYS.acc = Math.min(PHYS.acc + dt, PHYS_DT * 3);
    while (PHYS.acc >= PHYS_DT) {
      PHYS.iface.Step(PHYS_DT, 1);
      PHYS.acc -= PHYS_DT;
      PHYS.steps++;
    }
    const bi = PHYS.bi;
    PHYS.hurtT = Math.max(0, PHYS.hurtT - dt);
    for (const I of PHYS.items) {
      if (!I.body || I.zone !== ZONE.cur) continue;
      const id = I.body.GetID();
      if (!bi.IsActive(id)) continue;
      const p = bi.GetPosition(id),
        q = bi.GetRotation(id);
      I.pivot.position.set(p.GetX(), p.GetY(), p.GetZ());
      I.pivot.quaternion.set(q.GetX(), q.GetY(), q.GetZ(), q.GetW());
      I.x = p.GetX();
      I.z = p.GetZ();
      I.y = p.GetY() - I.hc;
      const S = I.solid;
      S.x = I.x;
      S.z = I.z;
      S.y = I.y;
      if (S.shapes) {
        const B0 = S.shapes[0];
        B0.x = I.x;
        B0.z = I.z;
        B0.rot = Math.atan2(2 * (q.GetW() * q.GetY() + q.GetX() * q.GetZ()), 1 - 2 * (q.GetY() ** 2 + q.GetX() ** 2));
      }
      if (I.B) {
        I.B.x = I.x;
        I.B.z = I.z;
        I.B.y = I.y;
      }
      if (I.plat) {
        /* harri-kuboa: goiko aldea plataforma (zutik dagoenean) */
        const up = 1 - 2 * (q.GetX() ** 2 + q.GetZ() ** 2);
        I.plat.off = up < 0.9;
        I.plat.x = I.x;
        I.plat.z = I.z;
        I.plat.y = p.GetY() + I.K.h / 2;
        I.plat.bottom = I.y;
        I.plat.rot = S.shapes ? S.shapes[0].rot : 0;
      }
      /* harri biribila azkar: min ematen du (Amaiurri) eta etsaiak zapaltzen ditu */
      if (I.kind === "boulder") {
        const lv = bi.GetLinearVelocity(id),
          sp = Math.hypot(lv.GetX(), lv.GetZ());
        if (sp > 5.5 && PHYS.hurtT <= 0 && Math.hypot(P.x - I.x, P.z - I.z) < I.K.r + 0.5 && Math.abs(P.y + 0.9 - p.GetY()) < 1.6) {
          PHYS.hurtT = 1;
          playerHit(1, I.x, I.z);
        }
        if (sp > 4.5)
          for (const e of ENEMIES)
            if (e.state !== "dead" && !e.rollT && Math.hypot(e.x - I.x, e.z - I.z) < I.K.r + e.D.r) {
              e.rollT = 1;
              setTimeout(() => (e.rollT = 0), 900);
              hitEnemy(e, 2, lv.GetX() / sp, lv.GetZ() / sp, 9);
            }
      }
      /* mundutik kanpo (itsasora, zulora): jatorrira */
      if (I.y < (ZONES[ZONE.cur].fallY ?? -9.3) - 2) {
        PHYS.p.Set(I.x0, I.y0 + I.hc + 0.5, I.z0);
        bi.SetPosition(id, PHYS.p, PHYS.J.EActivation_Activate);
        PHYS.v.Set(0, 0, 0);
        bi.SetLinearVelocity(id, PHYS.v);
      }
    }
    physHidden();
    for (let i = PHYS.frags.length - 1; i >= 0; i--) {
      const F = PHYS.frags[i];
      F.t += dt;
      const id = F.body.GetID(),
        p = bi.GetPosition(id),
        q = bi.GetRotation(id);
      F.m.position.set(p.GetX(), p.GetY(), p.GetZ());
      F.m.quaternion.set(q.GetX(), q.GetY(), q.GetZ(), q.GetW());
      /* azken segundoan lurrera hondoratu eta desagertu */
      if (F.t > F.life - 0.8) F.m.scale.setScalar(Math.max(0.01, (F.life - F.t) / 0.8));
      if (F.t > F.life) {
        fragKill(F);
        PHYS.frags.splice(i, 1);
      }
    }
  }
  /* ------------------------------ haraneko gorputzak ------------------------------ */
  /* ipar-zelaiak: hiru harri biribil maldetan (lehenaren azpian, jentilen txanponak) eta zutabe baten
     ondoan harri-kubo bat: bultzatu zutabera, igo, eta goian kutxa. Zutabea 5,6 m: jauzi bikoitzak
     4,85 m ematen ditu (ez da iristen), kubotik 6,3 m; labaina (hormako jauzirik ez) */
  const PHYS_BOULDERS = [[-60, -101], [27, -77], [-18, -65]];
  const HARRI = { px: -64, pz: -64, bx: -69.5, bz: -60.5 };
  function boulderMesh(seed) {
    const geo = new T.IcosahedronGeometry(PHYS_KIND.boulder.r, 2),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i),
        z = a.getZ(i),
        k = 1 + 0.07 * Math.sin(x * 4.1 + seed) * Math.cos(z * 3.7 + seed * 2) + 0.04 * Math.sin(y * 6 + seed);
      a.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
    /* jatorria oinean (physItem-ek pibotearen azpian jartzen du) */
    geo.translate(0, PHYS_KIND.boulder.r, 0);
    const m = new T.Mesh(geo, rockMaterial());
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  function physValley() {
    PHYS_BOULDERS.forEach(([x, z], i) => {
      const y = gy(x, z) - 0.04,
        m = boulderMesh(i * 3.1 + 1);
      m.position.set(x, y, z);
      (BP || scene).add(m);
      const solid = { x, z, r: PHYS_KIND.boulder.r * 0.98, h: PHYS_KIND.boulder.r * 2, y };
      solids.push(solid);
      const I = physItem("boulder", m, x, y, z, solid);
      I.onPush = () => notifyOnce("harri-biribila", L("Harri biribila: bultzatu, eta aldapan behera doa. Kontuz azpian!"), "");
      /* lehenaren azpian: jentilen txanponak (behin) */
      if (i === 0) I.hidden = true;
    });
    /* zutabea (5,6 m) eta goian kutxa */
    const { px, pz, bx, bz } = HARRI,
      g0 = gy(px, pz),
      top = g0 + 5.6,
      geo = new T.CylinderGeometry(1.25, 1.6, top - g0 + 0.6, 11, 5),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i),
        z = a.getZ(i),
        k = y > (top - g0) / 2 + 0.2 ? 1 : 1 + 0.09 * Math.sin(Math.atan2(z, x) * 5 + y * 1.7);
      a.setXYZ(i, x * k, y, z * k);
    }
    const col = obj(geo, rockMaterial());
    col.position.set(px, g0 - 0.6 + (top - g0 + 0.6) / 2, pz);
    solids.push({ x: px, z: pz, r: 1.5, h: top - g0 + 0.6, y: g0 - 0.6, pillar: true, slick: true });
    platforms.push({ x: px, z: pz, y: top, bottom: g0 - 0.6, rx: 1.3, rz: 1.3, phase: -1, safe: true, area: "iparra" });
    chest("harri-kuboa", px, top, pz, -0.6, { t: "coins", n: 30 });
    /* harri-kuboa: lauburu bat aurpegietan (bultzatzeko seinalea) */
    const K = PHYS_KIND.block,
      by = gy(bx, bz),
      cube = new T.Mesh(new T.BoxGeometry(K.w, K.h, K.d), rockMaterial());
    cube.castShadow = cube.receiveShadow = true;
    const mark = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), new T.MeshBasicMaterial({ map: runeTexture(), color: "#ffd38a", transparent: true, opacity: 0.45, depthWrite: false, blending: T.AdditiveBlending }));
    for (const r of [0, PI / 2, PI, -PI / 2]) {
      const q = mark.clone();
      q.position.set(Math.sin(r) * (K.w / 2 + 0.01), K.h / 2, Math.cos(r) * (K.d / 2 + 0.01));
      q.rotation.y = r;
      cube.add(q);
    }
    cube.geometry.translate(0, K.h / 2, 0);
    cube.position.set(bx, by, bz);
    (BP || scene).add(cube);
    const solid = { x: bx, z: bz, r: K.w / 2, h: K.h, y: by, shapes: [{ x: bx, z: bz, w: K.w, d: K.d, rot: 0 }] },
      plat = { x: bx, z: bz, y: by + K.h, bottom: by, w: K.w, d: K.d, rot: 0, phase: -1, safe: true, dyn: true, area: "iparra" };
    solids.push(solid);
    platforms.push(plat);
    const I = physItem("block", cube, bx, by, bz, solid, { plat });
    I.onPush = () => notifyOnce("harri-kuboa", L("Harri-kuboa: bultzatu zutabearen ondora, eta gainera igo."), "");
  }
  /* harri biribilaren azpian (lehena mugitzean): txanponak */
  function physHidden() {
    for (const I of PHYS.items) {
      if (!I.hidden || I.zone !== ZONE.cur || Math.hypot(I.x - I.x0, I.z - I.z0) < 2) continue;
      I.hidden = false;
      if (saved.flags.includes("harri-azpian")) continue;
      saved.flags.push("harri-azpian");
      const y = gy(I.x0, I.z0);
      fxBurst(I.x0, y + 0.4, I.z0, { n: 26, speed: 3, up: 3, life: 0.9, size: 0.28, color: "#ffd36a", grav: 4 });
      dropLoot(I.x0, y, I.z0, 7);
      SND.rune && SND.rune(true);
      notify(L("Harriaren azpian, jentilen txanponak!"), "", 2.6);
    }
  }
