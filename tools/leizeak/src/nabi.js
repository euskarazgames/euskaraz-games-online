  /* ==================================================================
     NABIGAZIOA · Recast & Detour (recastnavigation, zlib; recast-navigation-js, MIT)
     Gune bakoitzerako nabigazio-sare bat, jokoaren talka-datu berberetatik (ez marrazkitik):
       · lurra: plataformen gainazalak — kaxak, elipseak, arrapalak; haraneko lurra laginduta (gy),
         ibaia eta izotza kanpo; plataforma bakoitzaren alboak (behetik goiraino) horma gisa
       · oztopoak: solido finkoak (pillar) prisma gisa, beren altueran: kaxak, zirkuluak eta
         harkaitzen ingerada izarduna (radialShape)
     Recast-ek agentearen erradioa (0,85 m) kentzen die hormei eta 0,45 m-ko koskak onartzen ditu;
     Detour-ek bidea bilatzen du (A* poligonoetan + hari-tenkatzea). Haranekoa kargan eraikitzen da
     (bi garaietan bera: garai bakarrekoak kanpo), beste guneetakoa zonara sartzean (fundidoan).
     Erabiltzaileak: zaindariak (sigiloa.js), grunt/brute ehizan (combat.js), gaueko itzalak eta
     pottoka (pottoka.js). Recast ez badago (WASM ezin), jokabide zaharra: zuzenean helburura.
     Probetan: __game.NAV, navMeshFor(), navPath().
     ================================================================== */
  const NAV = { ok: false, meshes: {}, last: {}, ms: {}, fails: 0, pending: 0, debug: null };
  /* agenteen erradioa: zaindaria 0,8, grunt 0,85, pottoka 0,9 (izkinak haien bultzada-eremutik kanpo) */
  const NAV_R = 0.85,
    NAV_H = 1.8,
    NAV_CLIMB = 0.45,
    NAV_EXT = { x: 2.5, y: 6, z: 2.5 };
  function navInit() {
    if (typeof RecastNav === "undefined" || typeof WebAssembly === "undefined") return Promise.resolve();
    return RecastNav.init(RecastNav.Recast).then(
      () => (NAV.ok = true),
      (e) => console.warn("nabigazioa", e),
    );
  }
  /* gunearen gakoa: haranean garai bakarra; besteetan garaika (garai bakarreko plataformak) eta
     itxitako/irekitako ateen arabera (off) */
  function navKey(zone = ZONE.cur, ph = phase) {
    if (zone === "ibarra") return "ibarra";
    const L0 = ZONES[zone].platforms;
    let off = 0;
    for (let i = 0; i < L0.length; i++) if (L0[i].off) off += i + 1;
    return zone + ":" + ph + ":" + off;
  }
  /* sarrerako geometria (posizioak + indizeak) gunearen plataforma eta solidoetatik; phys: fisikarako
     (fisika.js) — lur osoa (ibai-ohea eta izotza barne) eta garai honetako plataforma guztiak */
  function navGeometry(zone, ph, phys = false) {
    const Z = ZONES[zone],
      pos = [],
      idx = [],
      valley = zone === "ibarra" && !phys,
      B = zone === "ibarra" ? [HG.x0, HG.z0, HG.x1, HG.z1] : null,
      inB = (x, z, r = 0) => !B || (x + r > B[0] && x - r < B[2] && z + r > B[1] && z - r < B[3]);
    const V = (x, y, z) => (pos.push(x, y, z), pos.length / 3 - 1);
    /* goranzko gainazala: Recast-ek normalaren y-a begiratzen du (aldrebes badago, buelta) */
    const up = (a, b, c) => {
      const ax = pos[a * 3],
        az = pos[a * 3 + 2],
        cr = (pos[b * 3 + 2] - az) * (pos[c * 3] - ax) - (pos[b * 3] - ax) * (pos[c * 3 + 2] - az);
      if (cr >= 0) idx.push(a, b, c);
      else idx.push(a, c, b);
    };
    /* horma: (ax, az) → (bx, bz), y0 → y1a / y1b */
    const wall = (ax, az, bx, bz, y0, ya, yb) => {
      const a = V(ax, y0, az),
        b = V(bx, y0, bz),
        c = V(bx, yb, bz),
        d = V(ax, ya, az);
      idx.push(a, b, c, a, c, d);
    };
    /* poligono ganbila (puntuak [x, y, z]): gaina haizagan, aukeran alboak behetik */
    const prism = (pts, bottom) => {
      const c = V(pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[2], 0) / pts.length),
        ids = pts.map((p) => V(p[0], p[1], p[2]));
      for (let i = 0; i < ids.length; i++) up(c, ids[i], ids[(i + 1) % ids.length]);
      if (bottom !== null) for (let i = 0; i < pts.length; i++) {
        const p = pts[i],
          q = pts[(i + 1) % pts.length];
        wall(p[0], p[2], q[0], q[2], bottom, p[1], q[1]);
      }
    };
    /* maskaradun gainazala: sare batean lagindu (gelaxkaren erdia barruan bada) */
    const sampled = (x0, z0, x1, z1, st, ok, hy) => {
      const nx = Math.max(1, Math.ceil((x1 - x0) / st)),
        nz = Math.max(1, Math.ceil((z1 - z0) / st)),
        id = new Int32Array((nx + 1) * (nz + 1)).fill(-1),
        vid = (i, j) => {
          const k = i + j * (nx + 1);
          if (id[k] < 0) {
            const x = x0 + i * st,
              z = z0 + j * st;
            id[k] = V(x, hy(x, z), z);
          }
          return id[k];
        };
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const cx = x0 + (i + 0.5) * st,
            cz = z0 + (j + 0.5) * st;
          if (!ok(cx, cz)) continue;
          const a = vid(i, j),
            b = vid(i + 1, j),
            c = vid(i + 1, j + 1),
            d = vid(i, j + 1);
          up(a, b, c);
          up(a, c, d);
        }
    };
    for (const s of Z.platforms) {
      if (s.off || s.moving || s.hidden || s.dyn || (valley ? s.phase !== -1 || s.ice : s.phase !== -1 && s.phase !== ph)) continue;
      if (s.hf) {
        /* haraneko lurra: HG sarearen triangelu berberak (gy zatika lineala da) */
        const ok = valley ? (x, z) => s.mask(x, z) && walkSD(x, z) > 0.3 && riverW(x, z) > 0.5 : (x, z) => !s.mask || s.mask(x, z);
        if (s === HG.p) sampled(HG.x0, HG.z0, HG.x1, HG.z1, HG.s, ok, s.hf);
        else sampled(s.x - s.w / 2, s.z - s.d / 2, s.x + s.w / 2, s.z + s.d / 2, 1, ok, s.hf);
        continue;
      }
      const rx = s.rx ? s.rx : Math.hypot(s.w, s.d) / 2;
      if (!inB(s.x, s.z, rx)) continue;
      const bottom = s.bottom ?? s.y - 1.2;
      if (s.mask) {
        /* maskaradun kaxa edo elipsea (izotza ez): laginduta, alborik gabe */
        sampled(s.x - rx, s.z - rx, s.x + rx, s.z + rx, 1, (x, z) => contains(s, x, z), (x, z) => topY(s, x, z));
        continue;
      }
      let pts;
      if (s.rx) {
        const n = Math.max(12, Math.min(32, Math.round((s.rx + s.rz) * 2)));
        pts = Array.from({ length: n }, (_, k) => {
          const a = (k / n) * TAU;
          return [s.x + Math.cos(a) * s.rx, s.y, s.z + Math.sin(a) * s.rz];
        });
      } else {
        const c = Math.cos(s.rot || 0),
          n = Math.sin(s.rot || 0);
        pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
          const lx = (u * s.w) / 2,
            lz = (v * s.d) / 2,
            x = s.x + lx * c + lz * n,
            z = s.z - lx * n + lz * c;
          return [x, topY(s, x, z), z];
        });
      }
      prism(pts, bottom);
    }
    /* solido finkoak: prisma beren altueran (y → y + h); mugikorrak (herritarrak, pottoka) ez */
    for (const o of Z.solids) {
      if (!o.pillar || o.mov || !(o.r > 0) || !inB(o.x, o.z, o.r + 2)) continue;
      const y0 = o.y ?? 0,
        y1 = y0 + (o.h ?? 3),
        shapes = o.shapes && o.shapes.length ? o.shapes : [{ x: o.x, z: o.z, r: o.r }];
      for (const S of shapes) {
        let pts;
        if (S.rad) pts = Array.from({ length: RAD_N }, (_, k) => [S.x + RAD_DIR[k][0] * S.rad[k], y1, S.z + RAD_DIR[k][1] * S.rad[k]]);
        else if (S.r) {
          const n = S.r > 3 ? 24 : 14;
          pts = Array.from({ length: n }, (_, k) => [S.x + Math.cos((k / n) * TAU) * S.r, y1, S.z + Math.sin((k / n) * TAU) * S.r]);
        } else {
          const c = Math.cos(S.rot || 0),
            n = Math.sin(S.rot || 0);
          pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
            const lx = (u * S.w) / 2,
              lz = (v * S.d) / 2;
            return [S.x + lx * c + lz * n, y1, S.z - lx * n + lz * c];
          });
        }
        prism(pts, y0);
      }
    }
    return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
  }
  /* sarea eraiki (gune aktiboa); ms neurtu */
  function navBuild(key, zone, ph = phase) {
    const t0 = performance.now(),
      g = navGeometry(zone, ph),
      valley = zone === "ibarra",
      cs = valley ? 0.3 : 0.22,
      ch = 0.2;
    let M = null;
    if (g.idx.length) {
      const r = RecastNav.generateSoloNavMesh(g.pos, g.idx, {
        cs,
        ch,
        walkableSlopeAngle: 50,
        walkableHeight: Math.ceil(NAV_H / ch),
        walkableClimb: Math.floor(NAV_CLIMB / ch),
        walkableRadius: Math.ceil(NAV_R / cs),
        maxEdgeLen: 12 / cs,
        maxSimplificationError: 1.3,
        minRegionArea: 6,
        mergeRegionArea: 20,
        maxVertsPerPoly: 6,
        detailSampleDist: 6,
        detailSampleMaxError: 1,
      });
      if (r.success) M = { key, nav: r.navMesh, q: new RecastNav.NavMeshQuery(r.navMesh), tris: g.idx.length / 3 };
      else (NAV.fails++, console.warn("nabigazioa", key, r.error));
    }
    NAV.ms[key] = Math.round(performance.now() - t0);
    NAV.meshes[key] = M;
    return M;
  }
  /* zonara sartzean (fundidoan) edo kargan: bi garaietako sareak aurrez */
  function navPrepare(zone = ZONE.cur) {
    if (!NAV.ok) return;
    for (const ph of zone === "ibarra" ? [phase] : [0, 1]) {
      const key = navKey(zone, ph);
      if (!(key in NAV.meshes)) navBuild(key, zone, ph);
    }
  }
  /* gune honetako sarea; ateren bat ireki/itxi bada, berria hurrengo unean eraikitzen da (bitartean,
     zaharra) — jokoaren erdian ez da inoiz zain geratzen. null: Recast ez dago edo ezin */
  function navMeshFor(zone = ZONE.cur) {
    if (!NAV.ok) return null;
    const key = navKey(zone),
      base = zone + ":" + phase;
    if (key in NAV.meshes) return (NAV.last[base] = NAV.meshes[key]);
    if (!NAV.pending) {
      NAV.pending = setTimeout(() => {
        NAV.pending = 0;
        if (ZONE.cur === zone && !(navKey(zone) in NAV.meshes)) navBuild(navKey(zone), zone);
      }, 0);
    }
    return NAV.last[base] || null;
  }
  /* bidea (puntuak) a-tik b-ra; null ezin bada */
  function navPath(ax, ay, az, bx, by, bz) {
    const M = navMeshFor();
    if (!M) return null;
    const r = M.q.computePath({ x: ax, y: ay, z: az }, { x: bx, y: by, z: bz }, { halfExtents: NAV_EXT });
    return r.success && r.path.length ? r.path : null;
  }
  /* agentearen hurrengo izkina (x, z) helbururako bidean; null: zuzenean joan (bidea zuzena da,
     sarerik ez, edo ezin) — bidea 0,35 s-ro edo helburua 1,2 m mugitzean berriz kalkulatzen da */
  function navCorner(a, tx, ty, tz) {
    const M = navMeshFor();
    if (!M) return null;
    let N = a.nav;
    if (!N || N.key !== M.key || time - N.t > 0.35 || Math.hypot(N.tx - tx, N.tz - tz) > 1.2) {
      const r = M.q.computePath({ x: a.x, y: a.y, z: a.z }, { x: tx, y: ty, z: tz }, { halfExtents: NAV_EXT });
      N = a.nav = { key: M.key, t: time, tx, tz, pts: r.success ? r.path : null, i: 1 };
    }
    const p = N.pts;
    if (!p || p.length < 3) return null;
    while (N.i < p.length - 1 && Math.hypot(p[N.i].x - a.x, p[N.i].z - a.z) < 0.55) N.i++;
    if (N.i >= p.length - 1) return null;
    return [p[N.i].x, p[N.i].z];
  }
  /* norabidea [dx, dz] (normalizatu gabe) helbururantz, bidea jarraituz; I: gelaren mugak (izkina
     gelatik kanpo badago — atea zeharkatuz — zuzenean, borroka-gela ez baita uzten) */
  function navToward(a, tx, ty, tz, I = null) {
    const c = navCorner(a, tx, ty, tz);
    if (!c || (I && !(I.rx ? ((c[0] - I.x) / I.rx) ** 2 + ((c[1] - I.z) / I.rz) ** 2 < 0.8 : Math.abs(c[0] - I.x) < I.w / 2 - 1.4 && Math.abs(c[1] - I.z) < I.d / 2 - 1.4))) return [tx - a.x, tz - a.z];
    return [c[0] - a.x, c[1] - a.z];
  }
  /* probetarako: sarea marraztu (urdinxka, gainetik) */
  function navDebug(on = true) {
    if (NAV.debug) {
      NAV.debug.parent && NAV.debug.parent.remove(NAV.debug);
      NAV.debug.geometry.dispose();
      NAV.debug = null;
    }
    const M = on && navMeshFor();
    if (!M) return 0;
    const [p, i] = RecastNav.getNavMeshPositionsAndIndices(M.nav),
      geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    geo.setIndex(Array.from(i));
    NAV.debug = new T.Mesh(geo, new T.MeshBasicMaterial({ color: "#36d1ff", transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide, fog: false }));
    NAV.debug.position.y = 0.08;
    NAV.debug.renderOrder = 5;
    scene.add(NAV.debug);
    return i.length / 3;
  }
