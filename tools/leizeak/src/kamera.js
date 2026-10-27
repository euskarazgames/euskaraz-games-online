  /* ==================================================================
     KAMERA · HORMA (diseinu propioa; abentura-joko klasikoen ideia orokorra)
     Hormari edo kutxa-pila bati bizkarra emanez gero (makila hormarantz une batez), Amaiur itsatsita
     geratzen da: alboetara bakarrik mugitzen da (isilik), eta ertzera hurbiltzean kamerak izkinaren
     atzera begiratzen du (hormaren beste aldean dagoena ikusteko). Makila hormatik urruntzean, jauzian
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
  /* kutxa-pilen zirkulu-talkek (solids) blokearen aurpegia baino lehen gelditzen dute Amaiur: ukitu ez
     arren, hormarik hurbilena (0.5 m baino gutxiago, aurpegiaren parean eta altuera berean) */
  function hormaNear() {
    let best = null,
      bd = 0.5;
    for (const s of platforms) {
      if (!s.wall || s.off || s.bars || (s.phase !== -1 && s.phase !== phase)) continue;
      const R = s.w / 2 + s.d / 2 + 1;
      if (Math.abs(s.x - P.x) > R || Math.abs(s.z - P.z) > R) continue;
      if (P.y >= s.y - 0.32 || P.y + 1.8 <= (s.bottom ?? s.y - 0.5)) continue;
      const f = wallFace(s, P.x, P.z);
      if (f.dist >= 0 && f.dist < bd && Math.abs(f.at) <= f.ext) {
        bd = f.dist;
        best = s;
      }
    }
    return best;
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
      CAM.wallView && started && !BEGI.on && P.grounded && !P.riding && !P.climb && P.dashT <= 0 && !LOCK.target && !CRAFT.on && !CRAFT.held && !MAG.charging && !MIR.on && ZONE.cur !== "ibarra" && !ivyNear(1.8);
    const raw = direction();
    if (!HORMA.on) {
      const s = P.wallS || (can && Math.hypot(raw.x, raw.z) > 0.6 ? hormaNear() : null);
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
  /* kamera: hormaren erdian, ohikoa (gela osoa ikusten da); ertzera hurbildu ahala (azken 3.8 m),
     atzetik eta kanpotik, diagonalean, IZKINAREN ATZERA begira (hormaren beste aldera, ertzetik
     haratago). Amaiur beti koadroan: begirada ez da haren norabidetik biratzen ikuspegi horizontalaren
     (pantaila bertikalean estuagoa) % 62 baino gehiago */
  function hormaCamera(dt, target, look) {
    const sd = HORMA.side,
      e = HORMA.k > 0 ? clamp(1 - (HORMA.ext - HORMA.at * sd - 0.3) / 3.5, 0, 1) : 0;
    HORMA.e = mix(HORMA.e || 0, e, 1 - Math.exp(-dt * 4));
    const w = HORMA.k * HORMA.e,
      k = w * w * (3 - 2 * w);
    if (k <= 0.001) return;
    const tx = HORMA.tx * sd,
      tz = HORMA.tz * sd,
      cx = P.x + HORMA.nx * 6 - tx * 6,
      cz = P.z + HORMA.nz * 6 - tz * 6,
      cy = P.y + 6.5,
      bx = P.x + tx * 6 - HORMA.nx * 3,
      bz = P.z + tz * 6 - HORMA.nz * 3,
      hf = Math.atan(Math.tan((camera.fov * PI) / 360) * camera.aspect),
      aP = Math.atan2(P.x - cx, P.z - cz),
      aB = Math.atan2(bx - cx, bz - cz),
      a = aP + clamp(Math.atan2(Math.sin(aB - aP), Math.cos(aB - aP)), -0.62 * hf, 0.62 * hf),
      r = Math.hypot(bx - cx, bz - cz),
      lx = cx + Math.sin(a) * r,
      lz = cz + Math.cos(a) * r,
      ly = P.y + 0.9;
    target.set(mix(target.x, cx, k), mix(target.y, cy, k), mix(target.z, cz, k));
    look.set(mix(look.x, lx, k), mix(look.y, ly, k), mix(look.z, lz, k));
  }
  /* ==================================================================
     BEGIRATU (lehen pertsona; diseinu propioa): Amaiurren begietatik inguruari begiratu, geldirik.
     I tekla edo begi-botoia (berriz sakatuta, itzuli); makilak, hatzak edo saguaren eskuineko botoiak
     begirada biratzen du. Jauzia, bultzada, erasoa, kolpe bat edo eszena bat: itzuli (Amaiur begiratzen
     zuen norabidera begira).
     ================================================================== */
  const BEGI = { on: false, k: 0, yaw: 0, pitch: 0 };
  function begiCan() {
    return started && !paused && !cinematic && !FILM.on && !GET.on && !TXALA.on && !CRAFT.on && !CRAFT.held && !MIR.on && P.grounded && !P.riding && !P.climb && P.dashT <= 0 && !respawnTimer && damageTime <= 0 && CHAIN.state === "idle";
  }
  function begiToggle() {
    if (BEGI.on) return begiOff();
    if (!begiCan()) return;
    if (HORMA.on) hormaOff();
    LOCK.target = null;
    Object.assign(BEGI, { on: true, yaw: P.angle, pitch: -0.06 });
    P.vx = P.vz = 0;
    SND.click();
    $("lookBtn").classList.add("on");
    document.body.classList.add("begi");
    coach("begiratu", "I", "BEGIRATU: makilaz inguruan begiratu · I berriz: itzuli", "", null, "BEGIRATU: makilaz edo hatzaz begiratu · begia berriz: itzuli", "");
  }
  function begiOff() {
    if (!BEGI.on) return;
    BEGI.on = false;
    $("lookBtn").classList.remove("on");
    document.body.classList.remove("begi");
    coachDone("begiratu");
  }
  /* hatza edo sagua (pixelak): eskuinera arrastatu → eskuinera begiratu */
  function begiLook(dx, dy) {
    BEGI.yaw -= dx * 0.0062;
    BEGI.pitch = clamp(BEGI.pitch - dy * 0.005, -0.8, 0.62);
  }
  /* tick-etik, move() aurretik: makila → begirada (Amaiur ere biratzen da) */
  function begiUpdate(dt) {
    if (BEGI.on && !begiCan()) begiOff();
    if (BEGI.on) {
      const r = stickRaw();
      BEGI.yaw -= r.x * dt * 2.2;
      BEGI.pitch = clamp(BEGI.pitch - r.z * dt * 1.5, -0.8, 0.62);
      P.angle = BEGI.yaw;
      P.vx = P.vz = 0;
    }
    BEGI.k = mix(BEGI.k, BEGI.on ? 1 : 0, 1 - Math.exp(-dt * (BEGI.on ? 7 : 9)));
    if (BEGI.k < 0.002) BEGI.k = 0;
  }
  /* eszenak, deiak, txalaparta…: lehen pertsona utzi eta Amaiur berriz ikusgai (begizta nagusitik) */
  function begiGuard() {
    if (!BEGI.on && !BEGI.k) return;
    if (FILM.on || cinematic || GET.on || TXALA.on || !started) {
      begiOff();
      BEGI.k = 0;
      hero.visible = true;
    }
  }
  /* kamera: begien altueran, aurrera apur bat (burua ez ikusteko); begirada yaw/pitch norabidean */
  function begiCamera(target, look) {
    if (BEGI.k <= 0) return;
    const k = BEGI.k * BEGI.k * (3 - 2 * BEGI.k),
      fx = Math.sin(BEGI.yaw),
      fz = Math.cos(BEGI.yaw),
      cp = Math.cos(BEGI.pitch),
      ey = P.y + 1.62,
      cx = P.x + fx * 0.22,
      cz = P.z + fz * 0.22;
    target.set(mix(target.x, cx, k), mix(target.y, ey, k), mix(target.z, cz, k));
    look.set(mix(look.x, cx + fx * cp * 10, k), mix(look.y, ey + Math.sin(BEGI.pitch) * 10, k), mix(look.z, cz + fz * cp * 10, k));
  }
