  /* ==================================================================
     HARANA · Ibarraren lurra (altuera-sare bakarra)
     · Haran bat, ez uharteak: hegoaldean itsaslabarra eta portua, ekialdean muinoak
       eta ur-jauziaren arroila, iparraldean eta mendebaldean mendi-hegalak.
     · Ibaia kurbaka doa ur-jauzitik mendebaldeko leize-zuloraino; han lurrak
       irensten du (karsta: ibaiak lurpean jarraitzen du).
     · Lur-ezpondak (ez kaxak): basora eta lepora lurrezko aldapak igotzen dira;
       portuko eskailera itsaslabarrean zulatuta dago.
     · Altuera-sare bera (1.5 m) erabiltzen da marrazteko eta fisikarako
       (triangeluz triangelu): oinak beti lurrean.
     · Mugak: haranaren ingerada (distantzia zeinuduna) eta portuko eremua.
       Malda handiegiak horma dira (ezin da igo).
     ================================================================== */
  const RIVER_Y = -1.2;
  /* ibaiaren erdiko lerroa, ur-jauzitik mendebaldera: [x, z, zabalera erdia] */
  const RIVER_CP = [
    [102, -28.5, 5], [95, -28.5, 5.4], [87, -28.3, 5.8], [77, -26.6, 6.1], [65, -30.3, 6.4], [53, -32.6, 6.8], [41, -29.8, 7.1],
    [30, -24.6, 7.3], [18, -24, 7.3], [8, -27.4, 7.4], [0, -28.5, 7.4], [-8, -29.6, 7.5], [-20, -33.4, 7.6], [-33, -33.6, 8.1],
    [-44, -29.6, 9.2], [-51, -28.4, 9.8], [-59, -29, 8.6], [-70, -32.2, 7.2], [-80, -31.4, 6.3], [-88, -28.8, 5.6], [-94, -28.5, 5.2],
  ];
  /* haranaren ingerada (erlojuaren norabidean): [x, z, muinoa, kostaldea] — gainerakoa mendia */
  const VALLEY_CP = [
    [-78, 30, 0, 1], [-70, 42, 0, 1], [-58, 52, 0, 1], [-44, 58, 0, 1], [-30, 61.5, 0, 1], [-16, 64, 0, 1], [-4, 65.5, 0, 1], [8, 65, 0, 1],
    [20, 63.5, 0, 1], [34, 59.5, 0, 1], [48, 52, 0, 1], [60, 42, 0, 1], [70, 30, 0, 1],
    [77, 16, 1, 0], [81, 2, 1, 0], [84, -9, 1, 0], [88, -17, 1, 0],
    [95, -20.5, 1, 0], [101, -22, 0.85, 0], [103.6, -25.5, 0.5, 0], [103.6, -31.5, 0, 0], [101, -35, 0, 0], [95, -36.5, 0, 0], [88, -39.5, 0.6, 0],
    [85, -48, 1, 0], [89, -64, 1, 0], [91, -84, 1, 0], [89, -106, 1, 0], [82, -126, 0.7, 0],
    [70, -140, 0, 0], [52, -148, 0, 0], [34, -150, 0, 0], [18, -148, 0, 0], [4, -146.5, 0, 0], [-10, -146.5, 0, 0], [-24, -147.5, 0, 0], [-38, -149, 0, 0], [-50, -144, 0, 0],
    [-58, -138, 0, 0], [-72, -139, 0, 0], [-86, -135, 0, 0], [-94, -123, 0, 0],
    [-97, -104, 0, 0], [-96, -82, 0, 0], [-95, -62, 0, 0], [-95, -46, 0, 0],
    [-91.5, -39.5, 0, 0], [-89.6, -34.5, 0, 0], [-89.2, -28.5, 0, 0], [-89.6, -22.5, 0, 0], [-91.5, -17.5, 0, 0],
    [-90, -6, 0, 0], [-86, 6, 0, 0], [-82, 18, 0, 0],
  ];
  /* leize-zuloa: ibaia hemen desagertzen da */
  const PIT = { x: -97, z: -28.5, r: 7.2 };
  /* lur-ezpondak (max) eta zulaketak (min): { ax, az, ay, bx, bz, by, w, k } */
  const EMB = [],
    CUTS = [];
  const HG = { s: 1.5, x0: -146, z0: -196, x1: 164, z1: 122, nx: 0, nz: 0, h: null, rw: null, cs: 3, cnx: 0, cnz: 0, sd: null, wh: null, wc: null, p: null, ice: null };
  let VAL = null,
    RIV = null,
    RIV_L = null;

  /* Catmull-Rom kontrol-puntuetatik (atributuak ere interpolatzen dira) */
  function crPath(cp, closed, sub) {
    const n = cp.length,
      out = [],
      at = (i) => (closed ? cp[(i + n) % n] : cp[Math.max(0, Math.min(n - 1, i))]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1),
        p1 = at(i),
        p2 = at(i + 1),
        p3 = at(i + 2);
      for (let k = 0; k < sub; k++) {
        const t = k / sub,
          t2 = t * t,
          t3 = t2 * t;
        out.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    if (!closed) out.push(cp[n - 1].slice());
    return out;
  }
  function polyNear(pts, closed, x, z) {
    let best = 1e18,
      bi = 0,
      bt = 0;
    const n = pts.length,
      m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i],
        b = pts[i + 1 === n ? 0 : i + 1],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        L2 = dx * dx + dz * dz || 1e-9;
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = a[0] + dx * t - x,
        qz = a[1] + dz * t - z,
        d = qx * qx + qz * qz;
      if (d < best) {
        best = d;
        bi = i;
        bt = t;
      }
    }
    return { d: Math.sqrt(best), i: bi, t: bt };
  }
  function inPoly(pts, x, z) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i],
        b = pts[j];
      if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  /* ibaia: hurbileko puntua eta zabalera erdia */
  function riverNear(x, z) {
    const r = polyNear(RIV, false, x, z),
      a = RIV[r.i],
      b = RIV[r.i + 1];
    return { d: r.d, hw: a[2] + (b[2] - a[2]) * r.t, i: r.i, t: r.t };
  }
  /* haranaren ingerada: distantzia zeinuduna (+ barruan) eta mota */
  function valleyNear(x, z) {
    const r = polyNear(VAL, true, x, z),
      a = VAL[r.i],
      b = VAL[(r.i + 1) % VAL.length];
    return { sd: inPoly(VAL, x, z) ? r.d : -r.d, wh: a[2] + (b[2] - a[2]) * r.t, wc: a[3] + (b[3] - a[3]) * r.t };
  }
  /* ezpondaren gainazala: goian laua (w zabalera, muturretan ere zuzen moztuta), alboetan malda
     (k; negatiboa zulaketetan) */
  function embH(e, x, z) {
    const dx = e.bx - e.ax,
      dz = e.bz - e.az,
      L = Math.hypot(dx, dz),
      ux = dx / L,
      uz = dz / L,
      along = (x - e.ax) * ux + (z - e.az) * uz,
      lat = Math.abs((x - e.ax) * -uz + (z - e.az) * ux),
      t = clamp(along / L, 0, 1),
      top = e.ay + (e.by - e.ay) * t,
      out = Math.hypot(Math.max(0, lat - e.w / 2), Math.max(0, -along, along - L));
    return top - out * e.k;
  }
  /* sare lodiaren interpolazio bilineala (distantzia zeinuduna eta motak) */
  function coarse(arr, x, z) {
    const fx = clamp((x - HG.x0) / HG.cs, 0, HG.cnx - 1.001),
      fz = clamp((z - HG.z0) / HG.cs, 0, HG.cnz - 1.001),
      i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      v = fz - j,
      k = i + j * HG.cnx;
    return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + HG.cnx] * (1 - u) + arr[k + HG.cnx + 1] * u) * v;
  }
  /* sare finaren interpolazio bilineala (ibaiaren ertzerako distantzia) */
  function fine(arr, x, z, out) {
    const fx = (x - HG.x0) / HG.s,
      fz = (z - HG.z0) / HG.s;
    if (fx < 0 || fz < 0 || fx >= HG.nx - 1 || fz >= HG.nz - 1) return out;
    const i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      v = fz - j,
      k = i + j * HG.nx;
    return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + HG.nx] * (1 - u) + arr[k + HG.nx + 1] * u) * v;
  }
  /* lurraren altuera: marrazketaren triangelu berberak (zatika lineala) */
  function gy(x, z) {
    const H = HG.h;
    if (!H) return 0;
    const fx = (x - HG.x0) / HG.s,
      fz = (z - HG.z0) / HG.s;
    if (fx < 0 || fz < 0 || fx >= HG.nx - 1 || fz >= HG.nz - 1) return 0;
    const i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      v = fz - j,
      k = i + j * HG.nx,
      nx = HG.nx;
    if (u + v < 1) return H[k] + (H[k + 1] - H[k]) * u + (H[k + nx] - H[k]) * v;
    return H[k + nx + 1] + (H[k + nx] - H[k + nx + 1]) * (1 - u) + (H[k + 1] - H[k + nx + 1]) * (1 - v);
  }
  /* ur-ertzerainoko distantzia (negatiboa uretan) */
  const riverW = (x, z) => (HG.rw ? fine(HG.rw, x, z, 40) : 40);
  const inPit = (x, z) => Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 0.6;
  const groundMask = (x, z) => gy(x, z) > -6.4;
  /* haraneko lurra (barrutik): erliebe leuna, herrian laua */
  function floorH(x, z) {
    const amp = 1.05 - 0.2 * smooth01(clamp((z + 45) / 30, 0, 1));
    return Math.max(0, hubNoise(x, z)) * amp * flatMask(x, z);
  }
  function rawHeight(x, z, sd, wh, wc, rw) {
    let h = floorH(x, z);
    const wm = Math.max(0, 1 - wh - wc),
      foot = (1 - wc) * (wm * 2.6 + wh * 1.2);
    if (sd > 0) {
      /* mendi-oinak: ertzetik gertu lurra apur bat igotzen da (kostaldean ez) */
      if (sd < 12) h += foot * (1 - sd / 12) ** 2;
    } else {
      const d = -sd,
        n = hubNoise(x * 1.9 + 40, z * 1.9 - 25) - 1.05,
        base = h + foot,
        mtn = base + d * 0.42 + Math.max(0, d - 9) * 1.05 + Math.max(0, d - 24) * 0.9 + n * Math.min(1, d / 8) * 3.5,
        hill = base + d * 0.24 + Math.max(0, d - 18) * 0.55 + n * Math.min(1, d / 10) * 1.6,
        coast = mix(h, -13, smooth01(Math.min(1, d / 6.5)));
      h = wm * mtn + wh * hill + wc * coast;
    }
    /* ibaia: ertz leunak (lurra altuago → ertz zabalagoa, beti igotzeko moduan) eta hondo sakona */
    const bw = Math.min(7, 3.6 + Math.max(0, h - 0.8) * 1.6);
    if (rw < bw) h = rw < 0 ? mix(RIVER_Y, -3.4, smooth01(Math.min(1, -rw / 3))) : mix(RIVER_Y, h, smooth01(rw / bw));
    /* leize-zuloa: horma zut-zutak */
    const dp = Math.hypot(x - PIT.x, z - PIT.z);
    if (dp < PIT.r + 4) h = Math.min(h, dp < PIT.r ? -30 : mix(-30, h + 2, smooth01(Math.min(1, (dp - PIT.r) / 1.6))));
    for (const e of EMB) h = Math.max(h, embH(e, x, z));
    for (const c of CUTS) h = Math.min(h, embH(c, x, z));
    return h;
  }
  /* altuera-sareak kalkulatu (behin, eraikitzean) */
  function buildHeights() {
    VAL = crPath(VALLEY_CP, true, 8);
    RIV = crPath(RIVER_CP, false, 6);
    RIV_L = [0];
    for (let i = 1; i < RIV.length; i++) RIV_L.push(RIV_L[i - 1] + Math.hypot(RIV[i][0] - RIV[i - 1][0], RIV[i][1] - RIV[i - 1][1]));
    HG.cnx = Math.round((HG.x1 - HG.x0) / HG.cs) + 1;
    HG.cnz = Math.round((HG.z1 - HG.z0) / HG.cs) + 1;
    HG.sd = new Float32Array(HG.cnx * HG.cnz);
    HG.wh = new Float32Array(HG.cnx * HG.cnz);
    HG.wc = new Float32Array(HG.cnx * HG.cnz);
    for (let j = 0; j < HG.cnz; j++)
      for (let i = 0; i < HG.cnx; i++) {
        const v = valleyNear(HG.x0 + i * HG.cs, HG.z0 + j * HG.cs),
          k = i + j * HG.cnx;
        HG.sd[k] = v.sd;
        HG.wh[k] = v.wh;
        HG.wc[k] = v.wc;
      }
    HG.nx = Math.round((HG.x1 - HG.x0) / HG.s) + 1;
    HG.nz = Math.round((HG.z1 - HG.z0) / HG.s) + 1;
    const N = HG.nx * HG.nz,
      h = new Float32Array(N),
      rw = new Float32Array(N);
    for (let j = 0; j < HG.nz; j++)
      for (let i = 0; i < HG.nx; i++) {
        const x = HG.x0 + i * HG.s,
          z = HG.z0 + j * HG.s,
          k = i + j * HG.nx,
          sd = coarse(HG.sd, x, z);
        let w = 40;
        if (x > -104 && x < 112 && z > -52 && z < -4 && sd > -8) {
          const r = riverNear(x, z);
          w = Math.min(40, r.d - r.hw);
        }
        rw[k] = w;
        h[k] = rawHeight(x, z, sd, coarse(HG.wh, x, z), coarse(HG.wc, x, z), w);
      }
    HG.h = h;
    HG.rw = rw;
  }
  /* ibaiaren puntua luzeraren arabera: [x, z, hw, tx, tz] (t: ibaiaren norabidea) */
  function riverAt(s) {
    let i = 1;
    while (i < RIV_L.length - 1 && RIV_L[i] < s) i++;
    const a = RIV[i - 1],
      b = RIV[i],
      L = RIV_L[i] - RIV_L[i - 1] || 1,
      t = clamp((s - RIV_L[i - 1]) / L, 0, 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (b[0] - a[0]) / L, (b[1] - a[1]) / L];
  }
  /* x jakin bateko lehen puntuaren luzera (ibaia ekialdetik mendebaldera doa) */
  function riverS(x) {
    for (let i = 0; i < RIV.length; i++) if (RIV[i][0] <= x) return RIV_L[i];
    return RIV_L[RIV_L.length - 1];
  }
  /* ibaiaren erdiko z x jakin batean (eginkizunetarako) */
  function riverZ(x) {
    return riverAt(riverS(x))[1];
  }

  /* ---------------------------- mugak eta malda ---------------------------- */
  /* portuko eremua: eskailera, kaia eta badia (ingeradatik kanpo) */
  const PORT = { sx: -6, sz: 61, ex: 8, ez: 74, sw: 3.2, dock: { x: 8, z: 80.5, w: 5, d: 13 }, bay: { x: 10, z: 88, rx: 24, rz: 21 } };
  function portSD(x, z) {
    const S = PORT;
    let best = -99;
    /* eskailera: zuzenkia, zabalera sw */
    const dx = S.ex - S.sx,
      dz = S.ez - S.sz,
      L = Math.hypot(dx, dz),
      ux = dx / L,
      uz = dz / L,
      ax = x - S.sx,
      az = z - S.sz,
      along = ax * ux + az * uz,
      side = Math.abs(ax * -uz + az * ux);
    best = Math.max(best, Math.min(S.sw / 2 - side, along + 1, L + 1 - along));
    const D = S.dock;
    best = Math.max(best, Math.min(D.w / 2 - Math.abs(x - D.x), D.d / 2 - Math.abs(z - D.z)));
    const B = S.bay,
      e = Math.hypot((x - B.x) / B.rx, (z - B.z) / B.rz);
    best = Math.max(best, (1 - e) * Math.min(B.rx, B.rz));
    return best;
  }
  function valleySD(x, z) {
    const c = coarse(HG.sd, x, z);
    if (c > 4 || c < -8) return c;
    return valleyNear(x, z).sd;
  }
  const walkSD = (x, z) => Math.max(valleySD(x, z), portSD(x, z));
  /* haranetik ezin da irten: ingeradaren barrura bultzatu (ertzean irristatuz) */
  function hubBounds(px, pz, nx, nz) {
    const m = 0.35;
    let s1 = walkSD(nx, nz);
    if (s1 >= m) return [nx, nz];
    if (s1 >= walkSD(px, pz)) return [nx, nz];
    for (let k = 0; k < 3 && s1 < m; k++) {
      const e = 0.25,
        gx = walkSD(nx + e, nz) - walkSD(nx - e, nz),
        gz = walkSD(nx, nz + e) - walkSD(nx, nz - e),
        gl = Math.hypot(gx, gz) || 1;
      nx += (gx / gl) * (m - s1);
      nz += (gz / gl) * (m - s1);
      s1 = walkSD(nx, nz);
    }
    P.wallGrace = 0;
    return [nx, nz];
  }
  /* malda handiegia (edo lurra oinen gainetik) → horma; ertzean irristatu */
  function terrainCollide(px, pz, py, nx, nz) {
    const run = Math.hypot(nx - px, nz - pz);
    if (run < 1e-5 || !groundMask(nx, nz)) return [nx, nz];
    const onG = P.grounded && P.platform === HG.p,
      lim = onG ? py + 1.15 * run + 0.015 : py + 0.25;
    if (gy(nx, nz) <= lim) return [nx, nz];
    /* aldapan gora doan osagaia kendu */
    const e = 0.35,
      gx = gy(nx + e, nz) - gy(nx - e, nz),
      gz = gy(nx, nz + e) - gy(nx, nz - e),
      gl = Math.hypot(gx, gz) || 1,
      mx = nx - px,
      mz = nz - pz,
      dot = Math.max(0, (mx * gx + mz * gz) / gl),
      sx = px + mx - (gx / gl) * dot,
      sz = pz + mz - (gz / gl) * dot,
      run2 = Math.hypot(sx - px, sz - pz),
      lim2 = onG ? py + 1.15 * run2 + 0.015 : py + 0.25;
    P.wallGrace = 0;
    if (run2 > 1e-4 && gy(sx, sz) <= lim2) return [sx, sz];
    return [px, pz];
  }
  /* IRAGANEAN ibaian ezin da sakonera sartu: ur-ertzera bultzatu */
  function riverBank(px, pz, py, nx, nz) {
    if (phase !== 0 || py > RIVER_Y + 0.22) return [nx, nz];
    const w1 = riverW(nx, nz);
    if (w1 >= -0.6 || w1 >= riverW(px, pz)) return [nx, nz];
    const e = 0.3,
      gx = riverW(nx + e, nz) - riverW(nx - e, nz),
      gz = riverW(nx, nz + e) - riverW(nx, nz - e),
      gl = Math.hypot(gx, gz) || 1;
    return [nx + (gx / gl) * (-0.6 - w1), nz + (gz / gl) * (-0.6 - w1)];
  }
  /* uretan (iraganean, ibaiaren hondoan): korronteak eramaten du */
  function riverDrown() {
    if (phase !== 0 || respawnTimer || P.y > RIVER_Y - 0.7 || riverW(P.x, P.z) > -0.4) return;
    fxBurst(P.x, RIVER_Y + 0.2, P.z, { n: 26, speed: 3.2, up: 3, life: 0.6, size: 0.3, color: "#d8f2ff", grav: 8 });
    SND.splash();
    notify(L("Korronteak eraman zaitu. Iraganean ibaia bizirik dago."), "", 2.6);
    fall();
  }
  /* lur segurua ez ibaiaren barruan */
  const hubSafeSpot = (x, z, y) => y > RIVER_Y + 0.25 || riverW(x, z) > 0.4;
  /* kamera: lurrak (muinoak, mendi-hegalak) ez dezan Amaiur estali */
  function camTerrainLift(look, target) {
    let need = target.y;
    for (const f of [0.25, 0.4, 0.55, 0.7, 0.85, 1]) {
      const x = look.x + (target.x - look.x) * f,
        z = look.z + (target.z - look.z) * f,
        g = gy(x, z) + 1.6,
        ly = look.y + (target.y - look.y) * f;
      if (ly < g) need = Math.max(need, look.y + (g - look.y) / f);
    }
    target.y = Math.min(need, target.y + 26);
  }

  /* ----------------------- harkaitzak: kamerarako zuloa ----------------------- */
  /* kamera eta Amaiurren artean dagoen harria zulatu (dithering-a ertzean) */
  const CUT = { c: { value: new T.Vector3(0, -999, 0) }, f: { value: new T.Vector3(0, -999, 0) }, r: { value: 3.6 } };
  const CUT_GLSL = [
    "{",
    "  vec3 cutD = uCutF - uCutC; float cutL = length(cutD); vec3 cutN = cutD / max(cutL, 0.001);",
    "  vec3 cutP = vCutW - uCutC; float cutT = dot(cutP, cutN);",
    "  if (cutT > 0.0 && cutT < cutL - 0.8) {",
    "    float cutQ = length(cutP - cutN * cutT), cutR = uCutR * (0.5 + 0.5 * cutT / cutL);",
    "    if (cutQ < cutR) {",
    "      float cutZ = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));",
    "      if (cutQ < cutR * 0.7 || cutZ > (cutQ - cutR * 0.7) / (cutR * 0.3)) discard;",
    "    }",
    "  }",
    "}",
  ].join("\n");
  function cutawayMat(base) {
    const m = base.clone();
    m.userData = base.userData;
    const prev = base.onBeforeCompile,
      prevKey = base.customProgramCacheKey;
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.uniforms.uCutC = CUT.c;
      sh.uniforms.uCutF = CUT.f;
      sh.uniforms.uCutR = CUT.r;
      sh.vertexShader = "varying vec3 vCutW;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  vCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = "uniform vec3 uCutC;\nuniform vec3 uCutF;\nuniform float uCutR;\nvarying vec3 vCutW;\n" + sh.fragmentShader.replace("void main() {", "void main() {\n" + CUT_GLSL);
    };
    m.customProgramCacheKey = function () {
      return (prevKey ? prevKey.call(this) : "") + "|cut";
    };
    return m;
  }
  function cutUpdate(tx, ty, tz) {
    CUT.c.value.copy(camera.position);
    CUT.f.value.set(tx, ty + 0.4, tz);
  }

  /* ------------------------------ lurraren sarea ------------------------------ */
  function valleyMaterial() {
    const tm = terrainMaterial(),
      g = rawTex("grass_c", true),
      gn = rawTex("grass_n"),
      s = rawTex("snow_c", true),
      sn = rawTex("snow_n"),
      c = rawTex("cliff_c", true);
    if (!tm || !g || !gn || !s || !sn || !c) return null;
    const m = new T.MeshStandardMaterial({ map: g, normalMap: gn, roughness: 0.96, metalness: 0, color: "#e4ecdc" });
    m.normalScale.set(0.8, 0.8);
    const uBlend = tm.userData.uBlend;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uBlend = uBlend;
      sh.uniforms.uSnow = { value: s };
      sh.uniforms.uSnowN = { value: sn };
      sh.uniforms.uCliff = { value: c };
      sh.uniforms.uBank = { value: dirtTex() };
      sh.vertexShader =
        "varying vec3 vTW;\nvarying vec3 vTN;\n" +
        sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  vTN = normalize(mat3(modelMatrix) * objectNormal);");
      sh.fragmentShader =
        "uniform float uBlend;\nuniform sampler2D uSnow;\nuniform sampler2D uSnowN;\nuniform sampler2D uCliff;\nuniform sampler2D uBank;\nvarying vec3 vTW;\nvarying vec3 vTN;\n" +
        sh.fragmentShader
          .replace(
            "#include <map_fragment>",
            [
              "#ifdef USE_MAP",
              "  vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );",
              "  vec4 snowC = mapTexelToLinear( texture2D( uSnow, vUv * 0.71 ) ) * vec4( 1.06, 1.08, 1.12, 1.0 );",
              "  vec3 tn = normalize( vTN );",
              "  float rk = smoothstep( 0.2, 0.36, 1.0 - tn.y );",
              "  vec2 bw = abs( tn.xz ) + 0.001; bw /= bw.x + bw.y;",
              "  vec4 cliffC = mapTexelToLinear( texture2D( uCliff, vTW.zy * 0.085 ) ) * bw.x + mapTexelToLinear( texture2D( uCliff, vTW.xy * 0.085 ) ) * bw.y;",
              "  vec4 bankC = mapTexelToLinear( texture2D( uBank, vTW.xz * 0.21 ) ) * vec4( 0.95, 0.93, 0.9, 1.0 );",
              "  float bank = 1.0 - smoothstep( -0.95, -0.4, vTW.y );",
              "  float edge = 1.0 - abs( uBlend * 2.0 - 1.0 );",
              "  float sb = smoothstep( 0.2, 0.8, uBlend + ( texelColor.g - 0.18 ) * 1.6 * edge );",
              "  float hs = smoothstep( 21.0, 31.0, vTW.y + ( texelColor.g - 0.2 ) * 12.0 + uBlend * 7.0 );",
              "  vec4 col = mix( texelColor, snowC, sb );",
              "  col = mix( col, bankC, bank * ( 1.0 - sb * 0.6 ) );",
              "  col = mix( col, cliffC * vec4( 0.22, 0.21, 0.19, 1.0 ), rk );",
              "  col = mix( col, snowC, hs * ( 1.0 - rk * 0.55 ) );",
              "  diffuseColor *= col;",
              "#endif",
            ].join("\n"),
          )
          .replace(
            "vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;",
            "vec3 mapN = mix( texture2D( normalMap, vUv ).xyz, texture2D( uSnowN, vUv * 0.71 ).xyz, uBlend ) * 2.0 - 1.0;",
          );
    };
    m.customProgramCacheKey = () => "eg-valley";
    return m;
  }
  /* haraneko lurra: sare bakarra (urruneko mendi-hegalak eta itsas hondoa kanpoan) */
  function valleyMesh() {
    const { nx, nz, s, x0, z0, h } = HG,
      pos = new Float32Array(nx * nz * 3),
      uv = new Float32Array(nx * nz * 2),
      idx = [];
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx,
          x = x0 + i * s,
          z = z0 + j * s;
        pos[k * 3] = x;
        pos[k * 3 + 1] = h[k];
        pos[k * 3 + 2] = z;
        uv[k * 2] = x / 4.5;
        uv[k * 2 + 1] = z / 4.5;
      }
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = i + j * nx,
          b = a + 1,
          c = a + nx,
          d = c + 1;
        if (h[a] < -12.6 && h[b] < -12.6 && h[c] < -12.6 && h[d] < -12.6) continue;
        if (coarse(HG.sd, x0 + (i + 0.5) * s, z0 + (j + 0.5) * s) < -58) continue;
        idx.push(a, c, b, c, d, b);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    let mat = valleyMaterial();
    if (!mat) {
      /* testurarik gabe: kolorea erpinetan (belarra, harria, ertza, elurra) */
      const nr = geo.attributes.normal,
        col = new Float32Array(nx * nz * 3),
        C = {
          grass: new T.Color("#7d9a5f").convertSRGBToLinear(),
          rock: new T.Color("#7b7a72").convertSRGBToLinear(),
          bank: new T.Color("#8d7b5e").convertSRGBToLinear(),
          snow: new T.Color("#eef2f5").convertSRGBToLinear(),
        },
        tmp = new T.Color();
      for (let k = 0; k < nx * nz; k++) {
        const y = h[k],
          rk = smooth01(clamp((1 - nr.getY(k) - 0.2) / 0.16, 0, 1));
        tmp.copy(C.grass).lerp(C.bank, 1 - smooth01(clamp((y + 0.95) / 0.55, 0, 1)));
        tmp.lerp(C.rock, rk).lerp(C.snow, smooth01(clamp((y - 22) / 9, 0, 1)) * (1 - rk * 0.5));
        col[k * 3] = tmp.r;
        col[k * 3 + 1] = tmp.g;
        col[k * 3 + 2] = tmp.b;
      }
      geo.setAttribute("color", new T.BufferAttribute(col, 3));
      mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, color: "#b7cbd0" });
      terrainMats.push(mat);
    }
    const m = obj(geo, mat);
    m.castShadow = false;
    m.receiveShadow = true;
    return m;
  }
  /* ibaia: ur-zinta kurbatua (orainean izotza) */
  function riverSheet() {
    const tn = rawTex("water_n", false),
      mat = new T.MeshStandardMaterial({ color: "#2d6f7c", roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.86, normalMap: tn || null });
    if (tn) mat.normalScale.set(0.6, 0.6);
    const pos = [],
      uv = [],
      idx = [];
    /* ura leize-zuloaren ertzean amaitzen da (zuloa agerian) */
    let n = RIV.length;
    while (n > 2 && Math.hypot(RIV[n - 1][0] - PIT.x, RIV[n - 1][1] - PIT.z) < PIT.r + 0.4) n--;
    for (let i = 0; i < n; i++) {
      const a = RIV[Math.max(0, i - 1)],
        b = RIV[Math.min(n - 1, i + 1)],
        tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        nxv = -(b[1] - a[1]) / tl,
        nzv = (b[0] - a[0]) / tl,
        p = RIV[i],
        w = p[2] + 1.8;
      for (const sd of [-1, 0, 1]) {
        pos.push(p[0] + nxv * w * sd, RIVER_Y, p[1] + nzv * w * sd);
        uv.push((w * sd) / 9, RIV_L[i] / 9);
      }
    }
    for (let i = 0; i < n - 1; i++)
      for (let k = 0; k < 2; k++) {
        const a = i * 3 + k,
          b = a + 3;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (geo.attributes.normal.getY(0) < 0) {
      geo.setIndex(idx.map((v, i) => idx[i - (i % 3) + (2 - (i % 3))]));
      geo.computeVertexNormals();
    }
    const m = obj(geo, mat);
    m.castShadow = false;
    m.receiveShadow = true;
    WATERS.push({ m, tn, y: RIVER_Y });
    return m;
  }
  /* leize-zuloa: ibaia zulora erortzen da; behean iluntasuna */
  function sinkhole() {
    const { x, z, r } = PIT;
    /* ura zuloaren ertzetik behera (ibaiaren aldean) */
    const ft = fallTexture();
    ft.repeat.set(4, 1.2);
    const fg = new T.CylinderGeometry(r - 0.25, r - 0.6, 11, 28, 1, true, PI / 2 - 0.95, 1.9);
    const fall = obj(fg, new T.MeshBasicMaterial({ map: ft, color: "#cdeef5", transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
    fall.position.set(x, RIVER_Y - 5.6, z);
    fall.castShadow = false;
    ATMO.falls.push(fall);
    /* sakonera: gradiente beltza eta hondo iluna (itsasoa ezkutatzeko) */
    const gc = document.createElement("canvas");
    gc.width = 4;
    gc.height = 64;
    const g2 = gc.getContext("2d"),
      gr = g2.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.55, "rgba(2,4,6,.85)");
    gr.addColorStop(1, "rgba(2,4,6,1)");
    g2.fillStyle = gr;
    g2.fillRect(0, 0, 4, 64);
    const dark = obj(new T.CylinderGeometry(r + 0.4, r + 0.4, 9, 32, 1, true), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), transparent: true, depthWrite: false, side: T.BackSide, fog: false }));
    dark.position.set(x, RIVER_Y - 4.2, z);
    dark.castShadow = dark.receiveShadow = false;
    const floor = obj(new T.CircleGeometry(r + 0.5, 32), new T.MeshBasicMaterial({ color: "#020406", fog: false }));
    floor.rotation.x = -PI / 2;
    floor.position.set(x, -8.3, z);
    floor.castShadow = floor.receiveShadow = false;
    /* ur-hautsa (iraganean) */
    HUB.pit = { x, z, fall, mist: 0 };
    /* zuloaren atzean harkaitzak (mendebaldeko hegala) */
    for (const [a, hh, sd] of [[2.1, 16, 31], [2.7, 21, 32], [3.3, 24, 33], [3.9, 19, 34], [4.5, 13, 35]]) rockPillar(x + Math.cos(a) * (r + 5.5), z + Math.sin(a) * (r + 5.5), gy(x + Math.cos(a) * (r + 5.5), z + Math.sin(a) * (r + 5.5)) + hh, sd, 0.6);
  }
  /* leize-zuloa: iraganean ur-hautsa gora; orainean isilik */
  function pitUpdate(dt) {
    const H = HUB.pit;
    if (!H || phaseBlend > 0.5 || Math.abs(P.x - H.x) > 70 || Math.abs(P.z - H.z) > 70) return;
    H.mist -= dt;
    if (H.mist > 0) return;
    H.mist = 0.1;
    const a = (Math.random() - 0.5) * 1.7;
    fxBurst(H.x + Math.cos(a) * (PIT.r - 1.2), RIVER_Y - 2.5 - Math.random() * 3, H.z + Math.sin(a) * (PIT.r - 1.2), { n: 2, speed: 0.5, up: 2.4, life: 1.5, size: 0.9, color: "#e6f4f8", grav: -0.4, drag: 1.2 });
  }
  /* arroilako harkaitzak ibaiaren ertzean (ibaitik kanpo; talka-zirkuluarekin) */
  function riverRocks(x0, x1, side, hMin, hMax, seed, step = 6.5) {
    const s0 = riverS(x0),
      s1 = riverS(x1);
    let s = seed;
    for (let q = s0; q <= s1; q += step) {
      s++;
      const [cx, cz, hw, tx, tz] = riverAt(q),
        r = 4.5 + ((s * 37) % 5),
        off = hw + r * 0.82 + 0.4,
        x = cx + -tz * side * off,
        z = cz + tx * side * off,
        h = hMin + (((s * 53) % 7) / 6) * (hMax - hMin);
      rockPillar(x, z, Math.max(gy(x, z), 0) + h, s);
      solids.push({ x, z, r: r * 0.9, h: 80, y: -12, pillar: true });
    }
  }
  /* mendi-hegaletako harkaitz-bandak (ingeradatik kanpo) */
  function slopeRocks() {
    let s = 400;
    for (let i = 0; i < VAL.length; i += 6) {
      const a = VAL[i],
        b = VAL[(i + 1) % VAL.length],
        wm = 1 - a[2] - a[3];
      if (wm < 0.7) continue;
      s++;
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        out = 3 + ((s * 13) % 6),
        x = a[0] + ((b[1] - a[1]) / tl) * out * VAL_OUT,
        z = a[1] - ((b[0] - a[0]) / tl) * out * VAL_OUT;
      if (Math.hypot(x - PIT.x, z - PIT.z) < 26) continue;
      rockPillar(x, z, gy(x, z) + 4 + ((s * 29) % 9), s, 0.55);
    }
  }
  /* ingeradaren kanpoko norabidea (erlojuaren norabidean doa: eskuinera kanpoa) */
  let VAL_OUT = 1;
  function valleyOrient() {
    let area = 0;
    for (let i = 0; i < VAL.length; i++) {
      const a = VAL[i],
        b = VAL[(i + 1) % VAL.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    VAL_OUT = area > 0 ? -1 : 1;
  }
  /* geometriak batu (posizioa, normala, uv): dei bakarra */
  function mergeGeos(geos) {
    let n = 0;
    const flat = geos.map((g) => {
      const ng = g.index ? g.toNonIndexed() : g;
      n += ng.attributes.position.count;
      return ng;
    });
    const pos = new Float32Array(n * 3),
      nor = new Float32Array(n * 3),
      uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of flat) {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.BufferAttribute(nor, 3));
    geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
    return geo;
  }
  /* props.glb-ko modelo bat instantzia askotan (dei bakarra zati bakoitzeko) */
  function propInstanced(name, items) {
    const base = PROP[name];
    if (!base || !items.length) return;
    const root = base.clone(true);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(root),
      size = bb.getSize(new T.Vector3()),
      inv = new T.Matrix4().copy(root.matrixWorld).invert(),
      rx = root.rotation.x,
      rz = root.rotation.z,
      sc = root.scale.clone(),
      D = new T.Object3D(),
      M = new T.Matrix4();
    root.traverse((n) => {
      if (!n.isMesh) return;
      const rel = new T.Matrix4().multiplyMatrices(inv, n.matrixWorld),
        im = new T.InstancedMesh(n.geometry, n.material, items.length);
      items.forEach(([x, y, z, hh, a], k) => {
        const f = hh / size.y;
        D.position.set(x, y - bb.min.y * f, z);
        D.rotation.set(rx, a, rz);
        D.scale.copy(sc).multiplyScalar(f);
        D.updateMatrix();
        M.multiplyMatrices(D.matrix, rel);
        im.setMatrixAt(k, M);
      });
      im.castShadow = true;
      im.receiveShadow = true;
      (BP || scene).add(im);
    });
  }
  /* muinoetako eta mendi-oinetako basoa (apaingarria, ingeradatik kanpo) */
  function slopeForest() {
    let sd = 911;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647),
      kinds = ["trees_A_large", "trees_B_large", "trees_A_medium", "trees_B_medium"],
      lists = kinds.map(() => []);
    for (let i = 0; i < 900; i++) {
      const x = HG.x0 + 6 + rnd() * (HG.x1 - HG.x0 - 12),
        z = HG.z0 + 6 + rnd() * (HG.z1 - HG.z0 - 12),
        v = coarse(HG.sd, x, z);
      if (v > -1.8 || v < -30) continue;
      const y = gy(x, z);
      if (y < 0.4 || y > 24) continue;
      const e = 0.8,
        sl = Math.hypot(gy(x + e, z) - gy(x - e, z), gy(x, z + e) - gy(x, z - e)) / (2 * e);
      if (sl > 0.75 || Math.hypot(x - PIT.x, z - PIT.z) < 14) continue;
      /* kameraren aldean (haranaren hego-ekialdean) ez: Amaiur estaliko luke */
      if ([8, 16, 26].some((k) => coarse(HG.sd, x - 0.56 * k, z - 0.83 * k) > -1.5)) continue;
      const k = i % kinds.length;
      lists[k].push([x, y - 0.3, z, 7 + rnd() * 5, rnd() * TAU]);
    }
    kinds.forEach((k, i) => propInstanced(k, lists[i]));
  }
  /* zuhaitzak ez itsaslabarrean, ez ibaian, ez haranetik kanpo */
  const treeSpot = (x, z) => !HG.h || (valleySD(x, z) > 2.2 && riverW(x, z) > 2.2);
  /* lurraren plataforma (haran osoa) eta ibaiaren izotza (orainean) */
  function valleyGround() {
    buildHeights();
    valleyOrient();
    valleyMesh();
    const W = HG.x1 - HG.x0,
      D = HG.z1 - HG.z0;
    HG.p = { x: HG.x0 + W / 2, z: HG.z0 + D / 2, y: 0, bottom: -60, w: W - 2, d: D - 2, rot: 0, phase: -1, safe: true, area: "herria", hf: gy, mask: groundMask, ground: true };
    platforms.push(HG.p);
    HG.ice = { x: 4, z: -28.5, y: RIVER_Y, bottom: -2.6, w: 214, d: 44, rot: 0, phase: 1, area: "ibaia", safe: false, slick: true, ice: true, mask: (x, z) => riverW(x, z) < -0.05 && !inPit(x, z) };
    platforms.push(HG.ice);
    riverSheet();
    sinkhole();
  }
