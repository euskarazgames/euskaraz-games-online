  /* ==================================================================
     KAMERA · HORMA (diseinu propioa; abentura-joko klasikoen ideia orokorra)
     Hormari edo kutxa-pila bati bizkarra emanez gero (makila hormarantz une batez), Amaiur itsatsita
     geratzen da: alboetara bakarrik mugitzen da, eta kamera baxu eta alboan jartzen da, hormaren
     ertzetik haratago begira (izkinaren atzean dagoena ikusteko). Makila hormatik urruntzean, jauzian
     edo ertzetik irtetean, askatu. Menuan itzal daiteke (HORMA-IKUSPEGIA).
     ================================================================== */
  const HORMA = { on: false, push: 0, k: 0, s: null, nx: 0, nz: 1, tx: 1, tz: 0, side: 1, at: 0, ext: 1 };
  /* plataforma-kaxa baten aurpegirik hurbilena: normala (kanporantz), ukitzailea eta ertzetarako tartea */
  function wallFace(s, x, z) {
    const [lx, lz] = local(s, x, z),
      hx = s.w / 2,
      hz = s.d / 2,
      c = Math.cos(s.rot || 0),
      n = Math.sin(s.rot || 0),
      /* lokaletik mundura: dx = lx·c + lz·n, dz = −lx·n + lz·c */
      W = (ax, az) => [ax * c + az * n, -ax * n + az * c];
    if (Math.abs(lx) - hx > Math.abs(lz) - hz) {
      const [nx, nz] = W(Math.sign(lx) || 1, 0),
        [tx, tz] = W(0, 1);
      return { nx, nz, tx, tz, at: lz, ext: hz, dist: Math.abs(lx) - hx };
    }
    const [nx, nz] = W(0, Math.sign(lz) || 1),
      [tx, tz] = W(1, 0);
    return { nx, nz, tx, tz, at: lx, ext: hx, dist: Math.abs(lz) - hz };
  }
  /* makila → hormaren luzeran bakarrik (astiro: isilik) */
  function hormaDir(d) {
    const s = d.x * HORMA.tx + d.z * HORMA.tz;
    if (Math.abs(s) > 0.2) HORMA.side = Math.sign(s);
    return { x: HORMA.tx * s * 0.45, z: HORMA.tz * s * 0.45 };
  }
  function hormaOn(s, f) {
    HORMA.on = true;
    HORMA.s = s;
    HORMA.push = 0;
    Object.assign(HORMA, { nx: f.nx, nz: f.nz, tx: f.tx, tz: f.tz, at: f.at, ext: f.ext, side: f.at >= 0 ? 1 : -1 });
    P.vx = P.vz = 0;
    SND.tok("L", true, 0.22);
    coach("horma", "", "HORMARI ITSATSITA: alboetara mugitu · ertzean, kamerak izkinaren atzera begiratzen du", "", null, "HORMARI ITSATSITA: makila alboetara · ertzean, izkinaren atzera begiratu", "");
  }
  function hormaOff() {
    HORMA.on = false;
    HORMA.s = null;
    HORMA.push = 0;
  }
  function hormaUpdate(dt, d, len) {
    const can =
      CAM.wallView && started && P.grounded && !P.riding && !P.climb && P.dashT <= 0 && !LOCK.target && !CRAFT.on && !CRAFT.held && !MAG.charging && !MIR.on && ZONE.cur !== "ibarra" && !ivyNear(1.8);
    const raw = direction();
    if (!HORMA.on) {
      const s = P.wallS;
      if (can && s && s.wall && !s.bars) {
        const f = wallFace(s, P.x, P.z),
          into = -(raw.x * f.nx + raw.z * f.nz);
        if (into > 0.6 && f.dist < 0.6) {
          HORMA.push += dt;
          if (HORMA.push > 0.28) hormaOn(s, f);
        } else HORMA.push = 0;
      } else HORMA.push = Math.max(0, HORMA.push - dt * 2);
    } else {
      const f = wallFace(HORMA.s, P.x, P.z),
        away = raw.x * f.nx + raw.z * f.nz;
      if (!can || away > 0.55 || f.dist > 0.8 || Math.abs(f.at) > f.ext + 0.4 || jumpBuffer > 0) hormaOff();
      else {
        Object.assign(HORMA, { nx: f.nx, nz: f.nz, tx: f.tx, tz: f.tz, at: f.at, ext: f.ext });
        /* geldirik: bizkarra hormari */
        if (len < 0.12) {
          const a = Math.atan2(f.nx, f.nz);
          P.angle += Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle)) * Math.min(1, dt * 10);
        }
        /* ertzera iritsita: ikasia */
        if (f.ext - f.at * HORMA.side < 1.2) coachDone("horma");
      }
    }
    HORMA.k = mix(HORMA.k, HORMA.on ? 1 : 0, 1 - Math.exp(-dt * (HORMA.on ? 4.5 : 7)));
    if (HORMA.k < 0.002) HORMA.k = 0;
  }
  /* kamera: baxu, hormatik apur bat aldenduta eta atzerago; begirada ertzerantz (ertzetik gertu,
     izkinatik haratago) */
  function hormaCamera(dt, target, look) {
    if (HORMA.k <= 0) return;
    const k = HORMA.k * HORMA.k * (3 - 2 * HORMA.k),
      sd = HORMA.side,
      tx = HORMA.tx * sd,
      tz = HORMA.tz * sd,
      edge = clamp(1 - (HORMA.ext - HORMA.at * sd) / 6, 0, 1),
      out = 3.8 + 1.4 * edge,
      cx = P.x + HORMA.nx * out - tx * 4.2,
      cz = P.z + HORMA.nz * out - tz * 4.2,
      cy = P.y + 4.4,
      lo = 0.8 + 2.6 * edge,
      lx = P.x + tx * 7.5 + HORMA.nx * lo,
      lz = P.z + tz * 7.5 + HORMA.nz * lo,
      ly = P.y + 0.5;
    target.set(mix(target.x, cx, k), mix(target.y, cy, k), mix(target.z, cz, k));
    look.set(mix(look.x, lx, k), mix(look.y, ly, k), mix(look.z, lz, k));
  }
