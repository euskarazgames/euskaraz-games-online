  /* ==================================================================
     ENARAREN HEGOAK · planeatu (bosgarren leizeko tresna)
     · Airean, jauzi bikoitzaren ondoren, eutsi JAUZIari: hegoak zabaldu eta astiro
       jaitsi, aurrera planeatuz. Askatu: hegoak bildu (eta berriro sakatu: zabaldu).
     · HAIZE-ZUTABEAK: planeatzen ari zarela, gora eramaten zaituzte (hegorik gabe,
       erorketa leuntzen dute bakarrik). Batzuk ORAINEAN bakarrik bizi dira (Gauekoren
       ekaitza); beste batzuk ODEIren haizeak pizten ditu.
     · Haize-bolada (Odei): P.wx / P.wz — move()-k posizioari gehitzen dio.
     ================================================================== */
  const GLIDE = { k: 0, wings: null, wl: null, wr: null, tail: null, raise: null, t: 0, lift: 0, seen: false };
  const GLIDE_FALL = 2.3,
    GLIDE_SPEED = 9.2;
  const hasWings = () => saved.items.includes("enara");
  const UPDRAFTS = [];
  /* hegoak (enara: bizkarra urdin iluna, sabela zuria, buztan urkilatua) — Amaiurren bizkarrean */
  function wingsBuild() {
    const g = new T.Group(),
      top = new T.MeshStandardMaterial({ color: "#0e1636", roughness: 0.75, metalness: 0, envMapIntensity: 0.25, emissive: new T.Color("#070c24"), emissiveIntensity: 0.5, side: T.FrontSide }),
      under = new T.MeshStandardMaterial({ color: "#efe7d6", roughness: 0.7, side: T.BackSide }),
      throat = new T.MeshStandardMaterial({ color: "#a8442e", roughness: 0.6, side: T.DoubleSide });
    /* hego bat: ilargierdi luzea, atzera okertua (XY planoan marraztu: +y → atzera, gero XZ-ra) */
    const wingGeo = (() => {
      const s = new T.Shape();
      s.moveTo(0, -0.28);
      s.bezierCurveTo(0.6, -0.42, 1.25, -0.12, 1.95, 0.72);
      s.bezierCurveTo(1.5, 0.42, 0.95, 0.36, 0.32, 0.34);
      s.lineTo(0, 0.22);
      s.closePath();
      const geo = new T.ShapeGeometry(s, 10);
      geo.rotateX(-PI / 2);
      return geo;
    })();
    const side = (sx) => {
      const p = new T.Group(),
        a = new T.Mesh(wingGeo, top),
        b = new T.Mesh(wingGeo, under);
      a.castShadow = true;
      p.add(a, b);
      p.scale.x = sx;
      g.add(p);
      return p;
    };
    GLIDE.wl = side(1);
    GLIDE.wr = side(-1);
    /* buztana: bi lerro luze (urkila) */
    const tg = new T.Shape();
    tg.moveTo(-0.18, 0);
    tg.lineTo(0.18, 0);
    tg.lineTo(0.3, 0.95);
    tg.lineTo(0.12, 0.42);
    tg.lineTo(0, 0.5);
    tg.lineTo(-0.12, 0.42);
    tg.lineTo(-0.3, 0.95);
    tg.closePath();
    const tGeo = new T.ShapeGeometry(tg);
    tGeo.rotateX(-PI / 2);
    const tail = new T.Mesh(tGeo, top);
    tail.position.z = -0.3;
    g.add(tail, new T.Mesh(tGeo, under).translateZ(-0.3));
    /* lepoko orban gorria (enararen eztarria) */
    const t2 = new T.Mesh(new T.CircleGeometry(0.16, 10), throat);
    t2.rotation.x = -PI / 2;
    t2.position.set(0, 0.01, 0.2);
    g.add(t2);
    GLIDE.tail = tail;
    g.position.set(0, 2.5, -0.2);
    g.scale.setScalar(1.85);
    g.visible = false;
    hero.add(g);
    GLIDE.wings = g;
    /* besoak gora (hegoei helduta): Spellcast_Raise-ren goiko gorputza */
    const UPPER = /^(spine|chest|upperarm|lowerarm|wrist|hand|head)/,
      c = models.mage.animations.find((a) => a.name === "Spellcast_Raise");
    if (c) GLIDE.raise = mixer.clipAction(new T.AnimationClip("Raise_hegan", c.duration, c.tracks.filter((t) => UPPER.test(t.name))));
  }
  /* ------------------------------ haize-zutabeak ------------------------------ */
  /* haize-marren testura: lerro bertikal uhinduak (gora mugitzen dira) */
  let DRAFT_TEX = null;
  function draftTexture() {
    if (DRAFT_TEX) return DRAFT_TEX;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 128, 256);
    let sd = 17;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 22; i++) {
      const x0 = r() * 128,
        y0 = r() * 256,
        len = 50 + r() * 90,
        a = 0.25 + r() * 0.5;
      g.strokeStyle = `rgba(255,255,255,${a})`;
      g.lineWidth = 1 + r() * 2.2;
      g.beginPath();
      for (let k = 0; k <= 12; k++) {
        const y = y0 - (k / 12) * len,
          x = x0 + Math.sin(k * 0.7 + i) * 4;
        k ? g.lineTo(x, ((y % 256) + 256) % 256) : g.moveTo(x, ((y % 256) + 256) % 256);
      }
      g.stroke();
    }
    DRAFT_TEX = new T.CanvasTexture(c);
    DRAFT_TEX.wrapS = DRAFT_TEX.wrapT = T.RepeatWrapping;
    return DRAFT_TEX;
  }
  /* haize-zutabea: (x, z) erdia, r erradioa, y0 → y1; phase: -1 beti / 0 iragana / 1 oraina;
     live(): aukerako baldintza (adib. Odei agerian); vent: lurreko harri-zuloa */
  function updraft(o) {
    const { x, z, r, y0, y1 } = o,
      h = y1 - y0,
      tex = draftTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(2, Math.max(1, h / 9));
    const mat = new T.MeshBasicMaterial({ map: tex, color: o.col || "#bfeaff", transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: true });
    const m = new T.Mesh(new T.CylinderGeometry(r * 0.92, r * 1.08, h, 18, 1, true), mat);
    m.position.set(x, y0 + h / 2, z);
    m.renderOrder = 6;
    (BP || scene).add(m);
    const inner = new T.Mesh(new T.CylinderGeometry(r * 0.55, r * 0.7, h, 14, 1, true), mat.clone());
    inner.material.map = tex.clone();
    inner.material.map.needsUpdate = true;
    inner.position.copy(m.position);
    inner.renderOrder = 6;
    (BP || scene).add(inner);
    let vent = null;
    if (o.vent !== undefined) {
      /* harrizko zuloa (sare batekin) */
      vent = new T.Group();
      const ringM = new T.Mesh(new T.TorusGeometry(r * 0.78, 0.28, 6, 22), rockMaterial());
      ringM.rotation.x = PI / 2;
      ringM.position.y = 0.08;
      vent.add(ringM);
      const hole = new T.Mesh(new T.CircleGeometry(r * 0.74, 22), new T.MeshBasicMaterial({ color: "#0c1420" }));
      hole.rotation.x = -PI / 2;
      hole.position.y = 0.03;
      vent.add(hole);
      for (let i = -2; i <= 2; i++) {
        const bar = new T.Mesh(new T.BoxGeometry(0.12, 0.1, r * 1.4 * Math.sqrt(1 - (i / 2.6) ** 2)), material("#3a4046"));
        bar.position.set(i * r * 0.27, 0.12, 0);
        vent.add(bar);
      }
      vent.position.set(x, o.vent, z);
      (BP || scene).add(vent);
    }
    const U = { x, z, r, y0, y1, phase: o.phase ?? -1, live: o.live, power: o.power || 8.5, m, inner, mat, vent, k: 0, group: BP, id: o.id || "u" + UPDRAFTS.length };
    UPDRAFTS.push(U);
    return U;
  }
  const updraftOn = (U) => U.group === ZONES[ZONE.cur].group && (U.phase === -1 || U.phase === phase) && (!U.live || U.live());
  /* zutabearen barruan: igoera-abiadura (0 kanpoan); goian leunki gelditzen da */
  function updraftAt(x, y, z) {
    let best = 0;
    GLIDE.draft = null;
    for (const U of UPDRAFTS) {
      if (!updraftOn(U)) continue;
      const d = Math.hypot(x - U.x, z - U.z);
      if (d > U.r || y < U.y0 - 1.5 || y > U.y1 + 1.5) continue;
      const top = clamp((U.y1 - y) / 3.2, 0, 1),
        edge = clamp((U.r - d) / 0.8, 0.35, 1),
        v = U.power * edge * top;
      if (v >= best) {
        best = v;
        GLIDE.draft = U;
      }
    }
    return best;
  }
  function updraftsUpdate(dt) {
    for (const U of UPDRAFTS) {
      if (U.group !== ZONES[ZONE.cur].group) continue;
      const want = updraftOn(U) ? 1 : 0;
      U.k = mix(U.k, want, 1 - Math.exp(-dt * (want ? 3 : 5)));
      U.mat.map.offset.y -= dt * 0.9;
      U.inner.material.map.offset.y -= dt * 1.4;
      U.mat.opacity = U.k * 0.2;
      U.inner.material.opacity = U.k * 0.26;
      U.m.visible = U.inner.visible = U.k > 0.01;
      U.m.rotation.y += dt * 0.6;
      U.inner.rotation.y -= dt * 0.9;
      if (U.k > 0.5 && Math.random() < dt * 9 && Math.hypot(P.x - U.x, P.z - U.z) < 60) {
        const a = Math.random() * TAU,
          rr = Math.random() * U.r;
        fxBurst(U.x + Math.cos(a) * rr, U.y0 + Math.random() * (U.y1 - U.y0) * 0.6, U.z + Math.sin(a) * rr, { n: 1, speed: 0.4, up: 7, life: 1.4, size: 0.18, color: "#eafcff", grav: -3, drag: 0.4 });
      }
    }
  }
  /* ------------------------------ planeatzea ------------------------------ */
  /* move()-etik, jauziaren ondoren: zabaldu / bildu */
  function glideCheck() {
    const keep = hasWings() && !P.grounded && !P.climb && !P.riding && CHAIN.state === "idle" && P.dashT <= 0 && jumpHeld && !respawnTimer && !TXALA.on && !CRAFT.held;
    if (!P.glide) {
      if (keep && P.jumps >= 2 && P.vy <= 0.6) {
        P.glide = true;
        GLIDE.t = 0;
        SND.whoosh();
        haptic(12);
        coachDone("glide");
        coachDone("glide-odei");
        if (!GLIDE.seen) {
          GLIDE.seen = true;
          notifyOnce("glide-first", L("ENARA: eutsi JAUZIari planeatzeko. Haize-zutabeek gora eramaten zaituzte."), "");
        }
      }
    } else if (!keep) P.glide = false;
  }
  /* planeatzean: grabitatearen ordez jaitsiera motela; makilarekin gidatu; haize-zutabeetan gora */
  function glideVel(dt, d, len) {
    const up = updraftAt(P.x, P.y, P.z);
    GLIDE.lift = up;
    const target = up > 0 ? up : -GLIDE_FALL;
    /* move()-k grabitatea aplikatu du jada: kendu, eta helburuko abiadurara hurbildu */
    P.vy += 25 * dt;
    P.vy = mix(P.vy, target, 1 - Math.exp(-dt * (up > 0 ? (P.vy < target ? 2.6 : 6) : 5.5)));
    const fx = Math.sin(P.angle),
      fz = Math.cos(P.angle),
      inDraft = up > 0;
    /* makilarik gabe: aurrera jarraitu (haize-zutabean, geldirik) */
    const wx = len > 0.1 ? d.x * GLIDE_SPEED : inDraft ? 0 : fx * GLIDE_SPEED * 0.72,
      wz = len > 0.1 ? d.z * GLIDE_SPEED : inDraft ? 0 : fz * GLIDE_SPEED * 0.72,
      k = 1 - Math.exp(-dt * (len > 0.1 ? 2.4 : inDraft ? 1.6 : 0.8));
    P.vx = mix(P.vx, wx, k);
    P.vz = mix(P.vz, wz, k);
    /* haize-zutabean, makilarik gabe: erdirantz leunki (bertan gelditzeko) */
    const U = GLIDE.draft;
    if (inDraft && U && len <= 0.1) {
      P.vx += (U.x - P.x) * 3 * dt;
      P.vz += (U.z - P.z) * 3 * dt;
    }
    GLIDE.t += dt;
    if (frame % 7 === 0) fxBurst(P.x - fx * 0.6, P.y + 2.1, P.z - fz * 0.6, { n: 1, speed: 0.3, life: 0.5, size: 0.14, color: "#eafcff", grav: 0, drag: 2 });
  }
  /* hegoen ikusmena eta besoen geruza (move()-ren amaieran) */
  function glideVisual(dt) {
    if (!GLIDE.wings) return;
    const want = P.glide ? 1 : 0;
    GLIDE.k = mix(GLIDE.k, want, 1 - Math.exp(-dt * (want ? 12 : 9)));
    const k = GLIDE.k;
    GLIDE.wings.visible = k > 0.02;
    if (GLIDE.wings.visible) {
      const flap = Math.sin(time * (GLIDE.lift > 0 ? 9 : 3.2)) * (GLIDE.lift > 0 ? 0.16 : 0.07);
      GLIDE.wl.scale.set(k, 1, 0.6 + 0.4 * k);
      GLIDE.wr.scale.set(-k, 1, 0.6 + 0.4 * k);
      GLIDE.wl.rotation.z = flap + (1 - k) * 0.9;
      GLIDE.wr.rotation.z = -flap - (1 - k) * 0.9;
      GLIDE.wings.rotation.x = clamp(-P.vy * 0.03, -0.25, 0.2) + 0.08;
      GLIDE.tail.rotation.y = Math.sin(time * 2.1) * 0.12;
    }
    const R = GLIDE.raise;
    if (R) {
      if (P.glide && !GLIDE.raiseOn) {
        GLIDE.raiseOn = true;
        R.reset();
        R.setLoop(T.LoopOnce, 1);
        R.clampWhenFinished = true;
        R.setEffectiveWeight(6);
        R.timeScale = 1.6;
        R.fadeIn(0.12).play();
      } else if (!P.glide && GLIDE.raiseOn) {
        GLIDE.raiseOn = false;
        R.fadeOut(0.18);
      }
    }
  }
  /* zona aldatzean, erortzean... */
  function glideStop() {
    P.glide = false;
    P.wx = P.wz = 0;
  }
