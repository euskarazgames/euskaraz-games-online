  /* ==================================================================
     EGUZKI-ISPILUA · Herensugearen haitzuloko tresna (diseinu propioa)
     Sabaiko arrakaletatik argia sartzen da haitzulora: IRAGANEAN eguzkia (urrea),
     ORAINEAN ilargia (zilarra). Argi-zutabe batean, eutsi SORGINKERIAri: Amaiurrek
     ispilua altxatzen du eta izpia jaurtitzen (makilarekin apuntatu; askatu: jaitsi).
     · ISPILU-HARRIAK: BIRATU (E) → argia harriaren aurpegiak begiratzen duen norabidean
       ateratzen da (zortzi norabide). Atzetik jotzen badu, ez.
     · KRISTALAK: urrezkoak (eguzkia), urdinak (ilargia) edo zuriak (biak).
     · SARE BELTZAK: eguzkiak (edo SUAk) erretzen ditu; ilargiak ez.
     · Saguzarrak eta itzalak: argiak zorabiatzen ditu (saguzarrak lurrera erortzen dira).
     ================================================================== */
  const SHAFTS = [],
    MIRRORS = [],
    CRYSTALS = [],
    CRYSTAL_SETS = [],
    WEBS = [];
  const MIR = { on: false, t: 0, kind: null, shaft: null, aim: 0, y: 0, segs: [], beams: [], end: null, flare: null, disc: null, discMat: null, hum: 0, hinted: new Set() };
  const LIGHT = { sun: "#ffd27a", moon: "#a9dcff" };
  const BEAM_MAX = 42,
    BEAM_HOPS = 8,
    BEAM_Y = 1.6;
  const lightName = (k) => (k === "sun" ? L("EGUZKIA") : L("ILARGIA"));

  /* ------------------------------ argi-zutabeak ------------------------------ */
  let SHAFT_TEX = null;
  function shaftTexture() {
    if (SHAFT_TEX) return SHAFT_TEX;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    /* izpi bertikalak (zerrenda leunak) */
    for (let x = 0; x < 128; x++) {
      const u = x / 128,
        a = 0.35 + 0.65 * Math.pow(Math.abs(Math.sin(u * PI * 5 + Math.sin(u * 17) * 0.6)), 1.6);
      g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      g.fillRect(x, 0, 1, 128);
    }
    /* goian eta behean leun */
    g.globalCompositeOperation = "destination-in";
    const v = g.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.12, "rgba(0,0,0,0.9)");
    v.addColorStop(0.75, "rgba(0,0,0,0.55)");
    v.addColorStop(1, "rgba(0,0,0,0.2)");
    g.fillStyle = v;
    g.fillRect(0, 0, 128, 128);
    SHAFT_TEX = new T.CanvasTexture(c);
    SHAFT_TEX.wrapS = T.RepeatWrapping;
    return SHAFT_TEX;
  }
  /* o: { id, x, z, y, r, kind: "sun" | "moon" | "both", live } */
  function lightShaft(o) {
    const { x, z } = o,
      y = o.y || 0,
      r = o.r || 1.5,
      h = o.h || 15;
    const mat = new T.MeshBasicMaterial({ map: shaftTexture(), color: LIGHT.sun, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
    const m = new T.Mesh(new T.CylinderGeometry(r * 0.72, r * 1.02, h, 24, 1, true), mat);
    m.position.set(x, y + h / 2, z);
    m.renderOrder = 6;
    BP.add(m);
    const spotMat = new T.MeshBasicMaterial({ map: glowTexture, color: LIGHT.sun, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
    const spot = new T.Mesh(new T.CircleGeometry(r * 1.5, 28), spotMat);
    spot.rotation.x = -PI / 2;
    spot.position.set(x, y + 0.05, z);
    spot.renderOrder = 6;
    BP.add(spot);
    /* zoruko marka: harrizko eraztuna (itzalean ere ikusten da: "hemen argia sartzen da") */
    const ring = new T.Mesh(new T.RingGeometry(r * 0.92, r * 1.04, 32), new T.MeshBasicMaterial({ color: "#c9b38a", transparent: true, opacity: 0.35, depthWrite: false }));
    ring.rotation.x = -PI / 2;
    ring.position.set(x, y + 0.04, z);
    BP.add(ring);
    const S = { id: o.id || "s" + SHAFTS.length, x, z, y, r, kind: o.kind || "both", live: o.live, m, mat, spot, spotMat, k: 0, col: null, group: BP };
    SHAFTS.push(S);
    return S;
  }
  /* zutabearen argia orain: "sun", "moon" edo null */
  function shaftLight(S) {
    if (!S || (S.live && !S.live())) return null;
    if (S.kind === "both") return phase ? "moon" : "sun";
    if (S.kind === "sun") return phase ? null : "sun";
    return phase ? "moon" : null;
  }
  function shaftAt(x, z, y) {
    const G = ZONES[ZONE.cur].group;
    return SHAFTS.find((S) => S.group === G && Math.hypot(x - S.x, z - S.z) < S.r + 0.25 && Math.abs(y - S.y) < 1.4) || null;
  }
  function shaftsUpdate(dt) {
    const G = ZONES[ZONE.cur].group;
    let here = null;
    for (const S of SHAFTS) {
      if (S.group !== G) continue;
      const kind = shaftLight(S),
        want = kind ? 1 : 0;
      S.k = mix(S.k, want, 1 - Math.exp(-dt * (want ? 3 : 5)));
      if (kind && kind !== S.col) {
        S.col = kind;
        S.mat.color.set(LIGHT[kind]);
        S.spotMat.color.set(LIGHT[kind]);
      }
      const fl = 1 + Math.sin(time * 1.7 + S.x) * 0.06;
      S.mat.opacity = S.k * (S.col === "moon" ? 0.24 : 0.3) * fl;
      S.spotMat.opacity = S.k * 0.55 * fl;
      S.m.visible = S.spot.visible = S.k > 0.01;
      S.mat.map.offset.x += dt * 0.01;
      /* hautsa argian */
      if (S.k > 0.5 && Math.random() < dt * 4)
        fxBurst(S.x + (Math.random() - 0.5) * S.r * 1.3, S.y + 0.6 + Math.random() * 5, S.z + (Math.random() - 0.5) * S.r * 1.3, { n: 1, speed: 0.1, up: -0.25, life: 2.2, size: 0.07, color: LIGHT[S.col], grav: 0.05, drag: 1 });
      if (kind && Math.hypot(P.x - S.x, P.z - S.z) < S.r + 0.25 && Math.abs(P.y - S.y) < 1.4) here = S;
    }
    /* irakatsi: lehen aldiz argi-zutabe batean, ispiluarekin */
    if (here && saved.items.includes("ispilua") && !MIR.on && P.grounded)
      coach("ispilua", "J", "Argi-zutabean: mantendu J → EGUZKI-ISPILUA (apuntatu)", "", "attackBtn", "Argi-zutabean: mantendu SORGINKERIA → ISPILUA", "");
    mirrorsUpdate(dt);
    crystalsUpdate(dt);
    websUpdate(dt);
  }

  /* ------------------------------ ispilu-harriak ------------------------------ */
  /* o: { id, x, z, y, a (norabidea, radianak), fixed } — aurpegiak +z begiratzen du */
  function mirrorStand(o) {
    const { x, z } = o,
      y = o.y || 0;
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const base = new T.Mesh(new T.CylinderGeometry(0.5, 0.66, 0.85, 8), rockMaterial());
    base.position.y = 0.42;
    base.castShadow = base.receiveShadow = true;
    g.add(base);
    const head = new T.Group();
    head.position.y = 0.85;
    g.add(head);
    const bronze = material("#9a6a2a", 0.15);
    for (const s of [-1, 1]) {
      const post = new T.Mesh(new T.BoxGeometry(0.12, 1.2, 0.16), bronze);
      post.position.set(s * 0.72, 0.6, 0);
      post.castShadow = true;
      head.add(post);
    }
    const discMat = new T.MeshStandardMaterial({ color: "#efe2bd", metalness: 0.92, roughness: 0.16, emissive: new T.Color("#6b4e1a"), emissiveIntensity: 0.3 });
    const disc = new T.Mesh(new T.CircleGeometry(0.62, 28), discMat);
    disc.position.set(0, BEAM_Y - 0.85, 0.03);
    head.add(disc);
    const back = new T.Mesh(new T.CircleGeometry(0.66, 28), material("#3c2814"));
    back.rotation.y = PI;
    back.position.set(0, BEAM_Y - 0.85, 0);
    head.add(back);
    const rim = new T.Mesh(new T.TorusGeometry(0.65, 0.07, 6, 28), bronze);
    rim.position.copy(disc.position);
    head.add(rim);
    /* eguzki-ikurra atzean (norabidea irakurtzeko) */
    const sunMark = new T.Mesh(new T.CircleGeometry(0.2, 12), material("#c99a3a", 0.4));
    sunMark.rotation.y = PI;
    sunMark.position.set(0, BEAM_Y - 0.85, -0.02);
    head.add(sunMark);
    /* gezia oinarrian: aurpegiaren norabidea */
    const arrow = new T.Mesh(new T.ConeGeometry(0.16, 0.42, 3), material("#e9c98a", 0.5));
    arrow.rotation.x = PI / 2;
    arrow.position.set(0, -0.02, 0.62);
    head.add(arrow);
    const solid = { x, z, r: 0.62, h: 2.1, y, pillar: true, noBeam: true };
    solids.push(solid);
    const M = { id: o.id || "m" + MIRRORS.length, x, y, z, a: o.a || 0, show: o.a || 0, fixed: !!o.fixed, g, head, disc, discMat, solid, lit: 0, litK: null, group: BP, turnT: 9 };
    head.rotation.y = M.a;
    MIRRORS.push(M);
    return M;
  }
  function mirrorNear() {
    const G = ZONES[ZONE.cur].group;
    let best = null,
      bd = 2.4;
    for (const M of MIRRORS) {
      if (M.group !== G || M.fixed) continue;
      const d = Math.hypot(P.x - M.x, P.z - M.z);
      if (d < bd && Math.abs(P.y - M.y) < 1.5) (bd = d), (best = M);
    }
    return best;
  }
  /* BIRATU: 45° erlojuaren norabidean (goitik begiratuta) */
  function mirrorTurn(M) {
    M.a = (M.a - PI / 4 + TAU) % TAU;
    M.turnT = 0;
    SND.turn ? SND.turn() : SND.clang(0.4);
    fxBurst(M.x, M.y + 1.2, M.z, { n: 6, speed: 1.4, up: 1, life: 0.4, size: 0.14, color: "#e9c98a", grav: 3 });
    coachDone("biratu");
  }
  function mirrorsUpdate(dt) {
    const G = ZONES[ZONE.cur].group;
    for (const M of MIRRORS) {
      if (M.group !== G) continue;
      M.turnT += dt;
      /* biraketa leuna (angelu laburrena) */
      const da = Math.atan2(Math.sin(M.a - M.show), Math.cos(M.a - M.show));
      M.show += da * Math.min(1, dt * 12);
      M.head.rotation.y = M.show;
      M.lit = Math.max(0, M.lit - dt);
      const on = M.lit > 0;
      M.discMat.emissive.set(on ? LIGHT[M.litK || "sun"] : "#6b4e1a");
      M.discMat.emissiveIntensity = on ? 1.6 + Math.sin(time * 20) * 0.2 : 0.3;
    }
  }

  /* ------------------------------ kristalak ------------------------------ */
  const CRYSTAL_COL = { sun: "#ffc34a", moon: "#7cc8ff", any: "#f2f0ff" };
  /* o: { id, x, z, y, kind: "sun" | "moon" | "any", latch (betiko), hold (s, argia joan ondoren), onLit, live } */
  function lightCrystal(o) {
    const { x, z } = o,
      y = o.y || 0,
      kind = o.kind || "any",
      col = CRYSTAL_COL[kind];
    const g = new T.Group();
    g.position.set(x, y, z);
    BP.add(g);
    const stand = new T.Mesh(new T.CylinderGeometry(0.3, 0.55, BEAM_Y - 0.55, 7), rockMaterial());
    stand.position.y = (BEAM_Y - 0.55) / 2;
    stand.castShadow = stand.receiveShadow = true;
    g.add(stand);
    const mat = new T.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, emissive: new T.Color(col), emissiveIntensity: 0.25, flatShading: true });
    const gem = new T.Mesh(new T.OctahedronGeometry(0.42, 0), mat);
    gem.scale.y = 1.55;
    gem.position.y = BEAM_Y;
    g.add(gem);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: col, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(2.6);
    halo.position.y = BEAM_Y;
    g.add(halo);
    const solid = { x, z, r: 0.5, h: BEAM_Y + 0.6, y, pillar: true, noBeam: true };
    solids.push(solid);
    const done = !!o.latch && isCleared(o.id);
    const C = { id: o.id, x, y, z, kind, latch: !!o.latch, hold: o.hold || 0, onLit: o.onLit, live: o.live, g, gem, mat, halo, k: done ? 1 : 0, on: done, left: 0, hitT: 9, group: BP, set: null };
    CRYSTALS.push(C);
    return C;
  }
  /* kristal-multzoa: denak batera piztuta → onSolve (behin; gordeta) */
  function crystalSet(id, list, onSolve) {
    const S = { id, list, onSolve, done: isCleared(id) };
    for (const C of list) C.set = S;
    CRYSTAL_SETS.push(S);
    return S;
  }
  function crystalLight(C, kind, dt) {
    C.hitT = 0;
    if (C.on && C.latch) return;
    if (C.kind !== "any" && C.kind !== kind) {
      const want = C.kind === "sun" ? L("Kristal urreak EGUZKIA behar du: IRAGANEAN bakarrik sartzen da.") : L("Kristal urdinak ILARGIA behar du: ORAINEAN bakarrik sartzen da.");
      notifyOnce("kristal-" + C.kind, want, "");
      return;
    }
    C.k = Math.min(1, C.k + dt / 0.55);
    if (C.k >= 1 && !C.on) {
      C.on = true;
      C.left = C.hold;
      SND.chime ? SND.chime() : SND.ready();
      fxBurst(C.x, C.y + BEAM_Y, C.z, { n: 24, speed: 3.2, up: 1.4, life: 0.7, size: 0.22, color: CRYSTAL_COL[C.kind === "any" ? kind : C.kind], grav: 1 });
      fxRing(C.x, C.y + 0.1, C.z, CRYSTAL_COL[C.kind === "any" ? kind : C.kind], 2.6, 0.5);
      if (C.latch) {
        if (C.id && !saved.cleared.includes(C.id)) saved.cleared.push(C.id);
        persist();
      }
      if (C.onLit) C.onLit(C);
    }
  }
  function crystalsUpdate(dt) {
    const G = ZONES[ZONE.cur].group;
    for (const C of CRYSTALS) {
      if (C.group !== G) continue;
      C.hitT += dt;
      if (!C.latch && C.hitT > 0.12) {
        if (C.on) {
          C.left -= dt;
          if (C.left <= 0) {
            C.on = false;
            C.k = 0;
            SND.clang(0.25);
          }
        } else C.k = Math.max(0, C.k - dt * 1.5);
      }
      const lit = C.on ? 1 : C.k;
      C.mat.emissiveIntensity = 0.25 + lit * 2.2 + (C.on ? Math.sin(time * 6) * 0.25 : 0);
      C.halo.material.opacity = lit * 0.75;
      C.gem.rotation.y += dt * (0.4 + lit * 2.5);
      /* denbora mugatua: amaitzear dagoenean keinuka */
      if (C.on && !C.latch && C.hold > 0 && C.left < 2) C.gem.visible = Math.sin(time * 26) > -0.3;
      else C.gem.visible = true;
    }
    for (const S of CRYSTAL_SETS) {
      if (S.done || S.list[0].group !== G) continue;
      if (S.list.every((C) => C.on)) {
        S.done = true;
        if (!saved.cleared.includes(S.id)) saved.cleared.push(S.id);
        persist();
        SND.chord ? SND.chord() : SND.memory();
        if (S.onSolve) S.onSolve();
      }
    }
  }

  /* ------------------------------ sare beltzak ------------------------------ */
  let WEB_TEX = null;
  function webTexture() {
    if (WEB_TEX) return WEB_TEX;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.strokeStyle = "rgba(40,22,58,0.95)";
    g.lineCap = "round";
    const cx = 128,
      cy = 128,
      spokes = 11;
    let sd = 7;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const ang = [];
    for (let i = 0; i < spokes; i++) ang.push((i / spokes) * TAU + rnd() * 0.25);
    g.lineWidth = 3.4;
    for (const a of ang) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190);
      g.stroke();
    }
    g.lineWidth = 2.2;
    for (let r = 14; r < 180; r += 13 + rnd() * 6) {
      g.beginPath();
      ang.forEach((a, i) => {
        const rr = r * (0.92 + rnd() * 0.16),
          px = cx + Math.cos(a) * rr,
          py = cy + Math.sin(a) * rr;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.closePath();
      g.stroke();
    }
    /* distira morea hari batzuetan */
    g.strokeStyle = "rgba(170,90,255,0.55)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = ang[(i * 2) % spokes];
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170);
      g.stroke();
    }
    WEB_TEX = new T.CanvasTexture(c);
    return WEB_TEX;
  }
  /* o: { id, x, z, y, w, h, rot } — sare zabala (ate bat edo zirrikitu bat ixten du) */
  function shadowWeb(o) {
    const { x, z } = o,
      y = o.y || 0,
      w = o.w || 6,
      h = o.h || 6,
      rot = o.rot || 0;
    const mat = new T.MeshBasicMaterial({ map: webTexture(), transparent: true, side: T.DoubleSide, depthWrite: false, alphaTest: 0.05 });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rot;
    m.renderOrder = 5;
    BP.add(m);
    /* talka-horma (lodiera txikia, sarearen planoan) */
    const wall = wallBlock(x, z, w, 0.5, rot, y, h);
    const done = isCleared(o.id);
    m.visible = !done;
    wall.off = done;
    const W = { id: o.id, x, y, z, w, h, rot, m, mat, wall, burnt: done, k: 0, group: BP };
    wall.web = W;
    WEBS.push(W);
    /* SUAk ere erretzen du (izpia edo INDARRA) */
    BREAKABLES.push({
      kind: "sarea",
      id: o.id,
      x,
      y,
      z,
      m,
      r: w / 2,
      broken: done,
      buildZone: BP,
      fireOnly: true,
      hint: L("Sare beltza, itzalez ehundua. Sorginkeria arruntak ez du urratzen… SUAk edo EGUZKIAk bai."),
      solid: { r: 0 },
      hitTest: (bx, by, bz, r) => {
        const [lx, lz] = local(wall, bx, bz);
        return by > y - 0.5 && by < y + h + 0.5 && Math.abs(lx) < w / 2 + r && Math.abs(lz) < 0.9 + r;
      },
      custom: () => webBurn(W),
    });
    return W;
  }
  function webBurn(W) {
    if (W.burnt) return;
    W.burnt = true;
    W.m.visible = false;
    W.wall.off = true;
    const B = BREAKABLES.find((b) => b.kind === "sarea" && b.id === W.id);
    if (B) B.broken = true;
    if (W.id && !saved.cleared.includes(W.id)) saved.cleared.push(W.id);
    persist();
    SND.flame();
    const c = Math.cos(W.rot),
      s = Math.sin(W.rot);
    for (let i = 0; i < 7; i++) {
      const o = (i / 6 - 0.5) * W.w;
      fxBurst(W.x + c * o, W.y + 1 + (i % 3) * (W.h / 4), W.z - s * o, { n: 10, speed: 2.6, up: 3, life: 0.9, size: 0.34, color: i % 2 ? "#ffb347" : "#a46bff", grav: -1.5 });
    }
    notify(L("Sare beltza erre da!"), "", 2);
  }
  function websUpdate(dt) {
    for (const W of WEBS) if (!W.burnt && W.k > 0) W.k = Math.max(0, W.k - dt * 0.6);
  }

  /* ------------------------------ ispilua eskuan ------------------------------ */
  function mirrorCan() {
    if (!saved.items.includes("ispilua") || !P.grounded || P.riding || P.climb || P.glide || CHAIN.state !== "idle") return false;
    return !!shaftLight(shaftAt(P.x, P.z, P.y));
  }
  function mirrorBuild() {
    if (MIR.disc) return;
    const g = new T.Group(),
      mat = new T.MeshStandardMaterial({ color: "#f6ecd0", metalness: 0.9, roughness: 0.15, emissive: new T.Color(LIGHT.sun), emissiveIntensity: 1.2, side: T.DoubleSide });
    const disc = new T.Mesh(new T.CircleGeometry(0.42, 24), mat);
    const rim = new T.Mesh(new T.TorusGeometry(0.44, 0.05, 6, 24), material("#b07a2e", 0.3));
    g.add(disc, rim);
    for (let i = 0; i < 8; i++) {
      const ray = new T.Mesh(new T.ConeGeometry(0.05, 0.16, 3), material("#d9a441", 0.4));
      const a = (i / 8) * TAU;
      ray.position.set(Math.cos(a) * 0.53, Math.sin(a) * 0.53, 0);
      ray.rotation.z = a - PI / 2;
      g.add(ray);
    }
    g.visible = false;
    scene.add(g);
    MIR.disc = g;
    MIR.discMat = mat;
    /* izpiak: barrena (zuri) eta distira (kolorea), segmentu bakoitzeko */
    const geo = new T.CylinderGeometry(1, 1, 1, 10, 1, true);
    geo.rotateX(PI / 2);
    for (let i = 0; i < BEAM_HOPS; i++) {
      const core = new T.Mesh(geo, new T.MeshBasicMaterial({ color: "#fffbe8", transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      const halo = new T.Mesh(geo, new T.MeshBasicMaterial({ color: LIGHT.sun, transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      core.renderOrder = halo.renderOrder = 8;
      core.visible = halo.visible = false;
      scene.add(core, halo);
      MIR.beams.push({ core, halo });
    }
    MIR.flare = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: LIGHT.sun, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    MIR.flare.renderOrder = 9;
    scene.add(MIR.flare);
  }
  function mirrorRaise() {
    mirrorBuild();
    const S = shaftAt(P.x, P.z, P.y);
    MIR.on = true;
    MIR.t = 0;
    MIR.shaft = S;
    MIR.kind = shaftLight(S);
    MIR.aim = P.angle;
    MIR.y = P.y + BEAM_Y;
    castAnim("Spellcasting", 0.6, 3);
    SND.mirror ? SND.mirror() : SND.charge();
    fxRing(P.x, P.y + 0.1, P.z, LIGHT[MIR.kind], 2.2, 0.35);
    coachDone("ispilua");
  }
  function mirrorLower() {
    if (!MIR.on) return;
    MIR.on = false;
    MIR.end = null;
    if (MIR.disc) MIR.disc.visible = false;
    for (const B of MIR.beams) B.core.visible = B.halo.visible = false;
    if (MIR.flare) MIR.flare.material.opacity = 0;
    castStop();
  }
  /* izpiaren laguntza: makilaren norabidetik hurbil dagoen helburu bat (kristala, ispilua, buruak…) */
  function mirrorAssist(want) {
    const G = ZONES[ZONE.cur].group,
      fx = Math.sin(want),
      fz = Math.cos(want);
    let best = want,
      bs = 0.3;
    const consider = (x, z, w = 1) => {
      const dx = x - P.x,
        dz = z - P.z,
        d = Math.hypot(dx, dz);
      if (d < 1 || d > BEAM_MAX) return;
      const off = Math.acos(clamp((dx * fx + dz * fz) / d, -1, 1)) * w;
      if (off < bs) (bs = off), (best = Math.atan2(dx, dz));
    };
    for (const M of MIRRORS) if (M.group === G && Math.abs(M.y - P.y) < 1.5) consider(M.x, M.z);
    for (const C of CRYSTALS) if (C.group === G && !(C.on && C.latch) && Math.abs(C.y - P.y) < 1.5) consider(C.x, C.z);
    const BK = BOSS.on && !BOSS.dead && BOSSK[BOSS.kind];
    if (BK && BK.beamAim) for (const p of BK.beamAim()) consider(p.x, p.z, 0.8);
    for (const e of ENEMIES) if (e.state !== "dead" && e.state !== "spawn") consider(e.x, e.z, 1.4);
    return best;
  }
  /* ---- izpiaren ibilbidea (XZ planoan, altuera finkoan) ---- */
  function rayCircle(px, pz, dx, dz, cx, cz, r, maxD) {
    const ox = px - cx,
      oz = pz - cz,
      b = ox * dx + oz * dz,
      c = ox * ox + oz * oz - r * r;
    if (c < 0) return -1;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return t >= 0 && t <= maxD ? t : -1;
  }
  function rayBox(px, pz, dx, dz, s, maxD) {
    const [lx, lz] = local(s, px, pz),
      c = Math.cos(s.rot || 0),
      n = Math.sin(s.rot || 0),
      ldx = dx * c - dz * n,
      ldz = dx * n + dz * c,
      hw = s.w / 2,
      hd = s.d / 2;
    let t0 = 0,
      t1 = maxD;
    for (const [o, v, h] of [[lx, ldx, hw], [lz, ldz, hd]]) {
      if (Math.abs(v) < 1e-9) {
        if (Math.abs(o) > h) return -1;
        continue;
      }
      let a = (-h - o) / v,
        b = (h - o) / v;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return -1;
    }
    return t0;
  }
  function beamTrace(x, y, z, a, kind) {
    const G = ZONES[ZONE.cur].group,
      segs = [];
    let dx = Math.sin(a),
      dz = Math.cos(a),
      from = null,
      left = BEAM_MAX,
      end = null;
    for (let hop = 0; hop < BEAM_HOPS && left > 0.3; hop++) {
      let best = left,
        hit = null;
      const test = (t, h) => {
        if (t >= 0 && t < best) (best = t), (hit = h);
      };
      for (const M of MIRRORS) if (M !== from && M.group === G && Math.abs(M.y + BEAM_Y - y) < 1) test(rayCircle(x, z, dx, dz, M.x, M.z, 0.7, best), { k: "mirror", M });
      for (const C of CRYSTALS) if (C.group === G && Math.abs(C.y + BEAM_Y - y) < 1 && !(C.live && !C.live())) test(rayCircle(x, z, dx, dz, C.x, C.z, 0.55, best), { k: "crystal", C });
      for (const W of WEBS) if (!W.burnt && W.group === G && y > W.y && y < W.y + W.h) test(rayBox(x, z, dx, dz, W.wall, best), { k: "web", W });
      for (const e of ENEMIES) {
        if (e.state === "dead" || e.state === "spawn" || y < e.y - 0.3 || y > e.y + 2.8) continue;
        test(rayCircle(x, z, dx, dz, e.x, e.z, e.D.r + 0.3, best), { k: "enemy", e });
      }
      const BK = BOSS.on && !BOSS.dead && BOSSK[BOSS.kind];
      if (BK && BK.beamHit) {
        const r = BK.beamHit(x, y, z, dx, dz, best);
        if (r) test(r.t, { k: "boss", r });
      }
      for (const s of solids) {
        if (s.r < 0.3 || s.noBeam || y < s.y || y > s.y + s.h) continue;
        test(rayCircle(x, z, dx, dz, s.x, s.z, s.r * 0.9, best), { k: "wall" });
      }
      for (const s of platforms) {
        if (s.off || s.rx || !s.w || s.web || s.bars || (s.phase !== -1 && s.phase !== phase) || y > s.y + 0.05 || y < (s.bottom ?? s.y - 1)) continue;
        test(rayBox(x, z, dx, dz, s, best), { k: "wall" });
      }
      const ex = x + dx * best,
        ez = z + dz * best;
      segs.push([x, z, ex, ez]);
      left -= best;
      if (!hit) break;
      if (hit.k === "mirror") {
        const M = hit.M,
          nx = Math.sin(M.a),
          nz = Math.cos(M.a);
        segs[segs.length - 1][2] = M.x;
        segs[segs.length - 1][3] = M.z;
        /* atzetik (aurpegiaren norabide berean): argiak ez du zeharkatzen; alboetatik eta aurretik, bai */
        if (dx * nx + dz * nz > 0.35) {
          end = { x: M.x - dx * 0.6, z: M.z - dz * 0.6, k: "back", M };
          break;
        }
        M.lit = 0.12;
        M.litK = kind;
        /* ispilu-harriak argia berriz igortzen du (indar osoz) */
        left = BEAM_MAX;
        from = M;
        x = M.x;
        z = M.z;
        dx = nx;
        dz = nz;
        continue;
      }
      end = { x: ex, z: ez, ...hit };
      break;
    }
    return { segs, end };
  }
  function mirrorUpdate(dt) {
    if (!MIR.on) return;
    MIR.t += dt;
    const S = MIR.shaft,
      kind = shaftLight(S);
    if (!kind || !P.grounded || respawnTimer || P.climb || Math.hypot(P.x - S.x, P.z - S.z) > S.r + 0.6) return mirrorLower();
    if (kind !== MIR.kind) {
      MIR.kind = kind;
      fxRing(P.x, P.y + 0.1, P.z, LIGHT[kind], 2.2, 0.35);
    }
    /* apuntatu: makila (edo finkatutako helburua) + laguntza */
    const d = direction(),
      len = Math.hypot(d.x, d.z);
    let want = len > 0.25 ? Math.atan2(d.x, d.z) : MIR.aim;
    if (LOCK.target && !LOCK.target.boss) want = Math.atan2(LOCK.target.x - P.x, LOCK.target.z - P.z);
    if (len > 0.25 || MIR.t < 0.05) want = mirrorAssist(want);
    const da = Math.atan2(Math.sin(want - MIR.aim), Math.cos(want - MIR.aim));
    MIR.aim += da * Math.min(1, dt * 9);
    P.angle = MIR.aim;
    P.vx *= 0.5;
    P.vz *= 0.5;
    MAG.aimT = 0.2;
    /* ispilua buruaren gainean, 45°: goitik argia → aurrera */
    const hx = P.x + Math.sin(MIR.aim) * 0.25,
      hz = P.z + Math.cos(MIR.aim) * 0.25,
      hy = P.y + 2.25;
    MIR.disc.visible = true;
    MIR.disc.position.set(hx, hy, hz);
    MIR.disc.rotation.set(0, 0, 0);
    MIR.disc.rotation.order = "YXZ";
    MIR.disc.rotation.y = MIR.aim;
    MIR.disc.rotation.x = -PI / 4;
    MIR.discMat.emissive.set(LIGHT[kind]);
    MIR.discMat.emissiveIntensity = 1.1 + Math.sin(time * 14) * 0.15;
    /* izpia: hasieran laburra (hedatzen) */
    const grow = Math.min(1, MIR.t / 0.18);
    MIR.y = P.y + BEAM_Y;
    const ox = P.x + Math.sin(MIR.aim) * 0.7,
      oz = P.z + Math.cos(MIR.aim) * 0.7,
      tr = beamTrace(ox, MIR.y, oz, MIR.aim, kind);
    /* ispilutik izpiaren hasierara: argi-zati txiki bat (goitik beherantz) */
    let hop = 0;
    const draw = (x0, y0, z0, x1, y1, z1, r) => {
      const B = MIR.beams[hop++];
      if (!B) return;
      const L3 = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      for (const m of [B.core, B.halo]) {
        m.visible = L3 > 0.05;
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        m.lookAt(x1, y1, z1);
      }
      const fl = 1 + Math.sin(time * 40 + hop) * 0.08;
      B.core.scale.set(r * 0.28 * fl, r * 0.28 * fl, L3);
      B.halo.scale.set(r * fl, r * fl, L3);
      B.halo.material.color.set(LIGHT[kind]);
      B.core.material.color.set(kind === "sun" ? "#fff6dc" : "#eef8ff");
    };
    let total = 0;
    for (const s of tr.segs) total += Math.hypot(s[2] - s[0], s[3] - s[1]);
    let budget = total * grow;
    draw(hx, hy, hz, ox, MIR.y, oz, 0.22);
    let tip = null;
    for (const s of tr.segs) {
      if (budget <= 0) break;
      const L2 = Math.hypot(s[2] - s[0], s[3] - s[1]),
        k = Math.min(1, budget / (L2 || 1));
      const x1 = mix(s[0], s[2], k),
        z1 = mix(s[1], s[3], k);
      draw(s[0], MIR.y, s[1], x1, MIR.y, z1, 0.26);
      tip = [x1, z1];
      budget -= L2;
    }
    for (let i = hop; i < MIR.beams.length; i++) MIR.beams[i].core.visible = MIR.beams[i].halo.visible = false;
    if (tip) {
      MIR.flare.position.set(tip[0], MIR.y, tip[1]);
      MIR.flare.material.color.set(LIGHT[kind]);
      MIR.flare.material.opacity = 0.85;
      MIR.flare.scale.setScalar(1.6 + Math.sin(time * 30) * 0.25);
    }
    MIR.hum += dt;
    if (MIR.hum > 0.5) {
      MIR.hum = 0;
      SND.hum && SND.hum(kind);
    }
    if (grow < 1) return;
    /* helburua */
    const E = (MIR.end = tr.end);
    if (!E) return;
    if (frame % 3 === 0) fxBurst(E.x, MIR.y, E.z, { n: 2, speed: 2.2, up: 0.6, life: 0.3, size: 0.16, color: LIGHT[kind], grav: 2 });
    if (E.k === "crystal") crystalLight(E.C, kind, dt);
    else if (E.k === "web") {
      if (kind === "sun") {
        E.W.k += dt;
        if (frame % 2 === 0) fxBurst(E.x, MIR.y, E.z, { n: 2, speed: 1.5, up: 2, life: 0.5, size: 0.2, color: "#ffb347", grav: -2 });
        if (E.W.k > 0.4) webBurn(E.W);
      } else notifyOnce("sare-ilargia", L("Ilargiaren argiak ez du sare beltza erretzen. EGUZKIA behar da: IRAGANA."), "");
    } else if (E.k === "enemy") {
      const e = E.e;
      if (e.type === "bat") {
        if (e.stun <= 0) {
          SND.screech && SND.screech();
          fxBurst(e.x, e.y + 1.6, e.z, { n: 10, speed: 2.4, up: 1, life: 0.4, size: 0.18, color: LIGHT[kind], grav: 3 });
        }
        e.stun = Math.max(e.stun, 2.8);
        e.state = "hover";
      } else if (!e.mini) e.stun = Math.max(e.stun, 0.6);
    } else if (E.k === "boss") E.r.on && E.r.on(kind, dt);
  }
  /* zonaz aldatzean eta abar: dena itzali */
  function mirrorReset() {
    mirrorLower();
  }
