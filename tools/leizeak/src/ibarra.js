  /* ==================================================================
     IBARRA · haran nagusia
     · Lurra: bi lautada erliebe leunarekin (muino txikiak); herrian, eraikinen
       inguruan eta bideen muturretan laua.
     · Bideak kurbatuak (spline), ertz leun eta irregularrekin: harlauzak herrian,
       lur-bidea kanpoan. Zubia harrizko arkua da.
     · Ibaia harri-arroila batean: ORAINEAN izoztuta (gainetik ibil daiteke),
       IRAGANEAN ur bizia. Ekialdean ur-jauzia eta haren atzean LAMIEN LEIZEA;
       ipar-mendebaldean ARTZAINEN LEPOA eta TARTALOREN KOBA; hegoaldean portua,
       kaia eta badia (orainean izoztua).
     ================================================================== */
  const HUB = {
    gate: null,
    stairs: [],
    stones: [],
    sheep: [],
    pen: { x: -31, z: -5 },
    cave: { x: -6, z: -139, y: 5 },
    lamia: { x: 99.4, z: -28.5, y: -1.2 },
    tartalo: { x: -70, z: -129.5, y: 12 },
    barrels: [],
    boat: null,
    wheel: null,
    iceFall: null,
    windGate: null,
    bay: null,
  };
  const CLOUDS = [];
  const SWAY = [];

  /* ---------------------------- testurak ---------------------------- */
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (srgb) t.encoding = T.sRGBEncoding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    return t;
  }
  let TEX_DIRT, TEX_COBBLE, TEX_EDGE, TEX_FIELD;
  /* lur-bidea: hauts marroia, harri-koxkorrak eta gurpil-arrastoak */
  function dirtTex() {
    return (TEX_DIRT ||= canvasTex(256, 256, (g, w, h) => {
      let sd = 4242;
      const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      g.fillStyle = "#866f50";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = 95 + r() * 85;
        g.fillStyle = `rgba(${v + 34},${v + 16},${v - 6},${0.1 + r() * 0.2})`;
        g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
      }
      for (const yy of [0.33, 0.67]) {
        g.fillStyle = "rgba(70,52,34,.18)";
        g.fillRect(0, yy * h - 7, w, 14);
      }
      for (let i = 0; i < 240; i++) {
        const v = 125 + r() * 95;
        g.fillStyle = `rgba(${v},${v - 8},${v - 22},.6)`;
        g.beginPath();
        g.ellipse(r() * w, r() * h, 1 + r() * 3.5, 1 + r() * 2.5, r() * 3, 0, TAU);
        g.fill();
      }
    }));
  }
  /* harlauzak: harri biribilduak, junturak ilunak */
  function cobbleTex() {
    return (TEX_COBBLE ||= canvasTex(256, 256, (g, w, h) => {
      let sd = 9127;
      const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      g.fillStyle = "#5b5850";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++)
        for (let x = -1; x < 9; x++) {
          const px = x * 32 + (y % 2) * 16 + (r() - 0.5) * 4,
            py = y * 32 + (r() - 0.5) * 4,
            n = 150 + r() * 50;
          g.fillStyle = `rgb(${n},${n - 6},${n - 16})`;
          g.beginPath();
          g.roundRect(px + 2, py + 2, 27 + r() * 3, 27 + r() * 3, 9);
          g.fill();
          g.fillStyle = "rgba(255,255,255,.08)";
          g.beginPath();
          g.roundRect(px + 5, py + 4, 16, 8, 4);
          g.fill();
        }
    }));
  }
  /* bidearen ertz leuna (alphaMap: v zeharka; u luzetara zarata) */
  function edgeTex() {
    return (TEX_EDGE ||= canvasTex(
      128,
      64,
      (g, w, h) => {
        const img = g.createImageData(w, h);
        for (let u = 0; u < w; u++) {
          const a = u / w,
            e0 = 0.16 + 0.1 * Math.sin(a * TAU * 3 + 1) + 0.05 * Math.sin(a * TAU * 7),
            e1 = 0.16 + 0.1 * Math.sin(a * TAU * 2 + 4) + 0.05 * Math.sin(a * TAU * 9 + 2);
          for (let v = 0; v < h; v++) {
            const t = v / (h - 1),
              k = smooth01(clamp(t / e0, 0, 1)) * smooth01(clamp((1 - t) / e1, 0, 1)),
              c = Math.round(255 * k),
              i = (v * w + u) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
            img.data[i + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
      },
      false,
    ));
  }
  /* soroa: lur iraulia ildaskatan */
  function fieldTex() {
    return (TEX_FIELD ||= canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = "#6e5338";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = "#5a4129";
        g.fillRect(0, i * 16 + 10, w, 5);
        g.fillStyle = "rgba(160,130,90,.35)";
        g.fillRect(0, i * 16 + 3, w, 3);
      }
    }));
  }

  /* --------------------------- lurraren erliebea --------------------------- */
  /* eremu lauak: herria, eraikinak, bideen muturrak (haran.js-ek erabiltzen ditu) */
  const FLAT = [],
    FLAT_E = [];
  function hubNoise(x, z) {
    const a = Math.sin(x * 0.043 + z * 0.021 + 1.7) * Math.sin(z * 0.047 - x * 0.018 + 0.4),
      b = Math.sin(x * 0.091 + 2.1) * Math.sin(z * 0.083 + 0.9),
      c = Math.sin(x * 0.021 - z * 0.034 + 4.2);
    return 1.05 + 0.95 * a + 0.42 * b + 0.45 * c;
  }
  /* 0 eremu lauetan (herria, eraikinak, bideen muturrak...), 1 urrun */
  function flatMask(x, z) {
    let m = 1;
    for (const f of FLAT) {
      const d = Math.hypot(x - f[0], z - f[1]) - f[2];
      if (d < f[3]) {
        if (d <= 0) return 0;
        m = Math.min(m, smooth01(d / f[3]));
      }
    }
    for (const f of FLAT_E) {
      const d = (Math.hypot((x - f[0]) / f[2], (z - f[1]) / f[3]) - 1) * Math.min(f[2], f[3]);
      if (d < f[4]) {
        if (d <= 0) return 0;
        m = Math.min(m, smooth01(d / f[4]));
      }
    }
    return m;
  }

  /* --------------------------------- bideak --------------------------------- */
  const PATH_MATS = {};
  function pathMat(kind) {
    if (PATH_MATS[kind]) return PATH_MATS[kind];
    return (PATH_MATS[kind] = new T.MeshStandardMaterial({
      map: kind === "stone" ? cobbleTex() : dirtTex(),
      alphaMap: edgeTex(),
      transparent: true,
      depthWrite: false,
      roughness: kind === "stone" ? 0.86 : 0.97,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }));
  }
  /* arrapaletarako material opakoak (ertz leunik gabe) */
  let MAT_DIRT, MAT_STONE;
  const dirtMat = () => (MAT_DIRT ||= new T.MeshStandardMaterial({ map: dirtTex(), roughness: 0.97 }));
  const stoneMat = () => (MAT_STONE ||= new T.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.88 }));
  /* bidea: puntuen artean kurba leuna (Catmull-Rom), zabalera aldakorra eta lurrari itsatsita */
  function pathRibbon(pts, w, kind = "dirt", o = {}) {
    const ground = o.ground || (o.y !== undefined ? () => o.y : gy);
    const curve = new T.CatmullRomCurve3(pts.map(([px, pz]) => new T.Vector3(px, 0, pz)), false, "catmullrom", 0.5),
      len = curve.getLength(),
      n = Math.max(3, Math.ceil(len / 1.1)),
      S = curve.getSpacedPoints(n),
      A = 4,
      pos = [],
      uv = [],
      idx = [],
      seed = pts[0][0] * 0.37 + pts[0][1] * 0.11;
    let dist = 0;
    for (let i = 0; i <= n; i++) {
      const p = S[i],
        q = S[Math.min(n, i + 1)],
        b = S[Math.max(0, i - 1)];
      let tx = q.x - b.x,
        tz = q.z - b.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const nx = -tz,
        nz = tx;
      if (i) dist += S[i].distanceTo(S[i - 1]);
      const endK = 0.8 + 0.2 * Math.min(1, i / 2, (n - i) / 2),
        ww = w * endK * (1 + 0.09 * Math.sin(i * 0.61 + seed) + 0.05 * Math.sin(i * 1.73 + seed * 2)),
        off = 0.22 * Math.sin(i * 0.37 + seed);
      for (let k = 0; k <= A; k++) {
        const s = k / A - 0.5,
          px = p.x + nx * (s * ww + off),
          pz = p.z + nz * (s * ww + off);
        pos.push(px, ground(px, pz) + (o.lift ?? 0.06), pz);
        uv.push(dist / (kind === "stone" ? 2.4 : 3.2), k / A);
      }
    }
    for (let i = 0; i < n; i++)
      for (let k = 0; k < A; k++) {
        const a0 = i * (A + 1) + k,
          b0 = a0 + A + 1;
        idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = obj(geo, pathMat(kind));
    m.castShadow = false;
    m.renderOrder = 2;
    return m;
  }
  /* plaza: harlauza-zirkulua ertzean harri-lerro batekin */
  function plaza(x, z, r) {
    const geo = new T.CircleGeometry(r, 48);
    geo.rotateX(-PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (r / 1.3), uv.getY(i) * (r / 1.3));
    const m = obj(geo, new T.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.86 }));
    m.position.set(x, 0.05, z);
    m.castShadow = false;
    const curb = obj(new T.TorusGeometry(r, 0.18, 4, 64), material("#7d7869"));
    curb.rotation.x = -PI / 2;
    curb.position.set(x, 0.06, z);
    curb.scale.z = 0.5;
    curb.castShadow = false;
  }

  /* ------------------------- harkaitzak (sare bakarrean) ------------------------- */
  const ROCKBATCH = [];
  /* harri-zutabe zakarra (seaStack bezalakoa) baina bilduta: dei gutxi */
  function rockPillar(x, z, h, seed, rTop = 0.52) {
    const r = 4.5 + ((seed * 37) % 5),
      Hh = h + 12,
      geo = new T.CylinderGeometry(r * rTop, r, Hh, 12, 7);
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        py = a.getY(i),
        pz = a.getZ(i),
        ang = Math.atan2(pz, px),
        k = 1 + 0.17 * Math.sin(ang * 3 + seed) + 0.09 * Math.sin(ang * 7 + py * 0.35 + seed * 2) + 0.07 * Math.sin(py * 0.8 + seed);
      a.setXYZ(i, px * k, py, pz * k);
    }
    geo.rotateY(seed);
    geo.translate(x, -11.5 + Hh / 2, z);
    ROCKBATCH.push(geo.toNonIndexed());
    return r;
  }
  function rocksFlush() {
    if (!ROCKBATCH.length) return;
    let n = 0;
    for (const g of ROCKBATCH) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3),
      uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of ROCKBATCH) {
      pos.set(g.attributes.position.array, o * 3);
      uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    /* kamera eta Amaiurren artean badago, harria zulatzen da (haran.js) */
    const m = obj(geo, (ROCKMAT ||= cutawayMat(stackMaterial())));
    m.castShadow = false;
    ROCKBATCH.length = 0;
  }
  let ROCKMAT = null;
  /* -------------------------- arrapalak eta zubia -------------------------- */
  /* arrapala ikusezina (fisika bakarrik): ikusgaia beste nonbait eraikitzen da */
  function rampP(ax, az, ay, bx, bz, by, w, area, bottom = -9) {
    const len = Math.hypot(bx - ax, bz - az),
      p = { x: (ax + bx) / 2, z: (az + bz) / 2, y: Math.max(ay, by), bottom, w, d: len, rot: Math.atan2(bx - ax, bz - az), ramp: [ay, by], phase: -1, area, safe: true };
    platforms.push(p);
    return p;
  }
  /* harrizko eskailera (ikusgaia): mailak sare bakarrean; fisika rampP-n (malda leuna) */
  function stairsMesh(ax, az, ay, bx, bz, by, w, n) {
    const len = Math.hypot(bx - ax, bz - az),
      rot = Math.atan2(bx - ax, bz - az),
      dep = len / n,
      geos = [];
    for (let i = 0; i < n; i++) {
      const top = ay + (by - ay) * ((i + 0.5) / n),
        g = new T.BoxGeometry(w, 1.3, dep * 1.02);
      g.translate(0, top - 0.65, (i + 0.5) * dep - len / 2);
      g.rotateY(rot);
      g.translate((ax + bx) / 2, 0, (az + bz) / 2);
      geos.push(g);
    }
    const m = obj(mergeGeos(geos), stoneMat());
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  /* harrizko zubi arkuduna: fisika sei arrapalatan (arkua), ikusgaia estrusioa eta baranda */
  function stoneBridge(x, z0, z1, w, peak) {
    const len = Math.abs(z1 - z0),
      dir = Math.sign(z1 - z0),
      deck = (t) => peak * Math.sin(PI * clamp(t, 0, 1)),
      N = 6;
    /* oholtzaren azpia mehea: izotzaren gainean, arkuaren erdian, azpitik pasa daiteke */
    for (let i = 0; i < N; i++) {
      const ya = deck(i / N),
        yb = deck((i + 1) / N);
      rampP(x, z0 + (dir * len * i) / N, ya, x, z0 + (dir * len * (i + 1)) / N, yb, w, i < N / 2 ? "herria" : "iparra", Math.min(ya, yb) - 0.75);
    }
    const ext = 1.6,
      L = len + ext * 2,
      top = (s) => deck((s - ext) / len),
      shape = new T.Shape(),
      M = 28;
    shape.moveTo(0, -1.6);
    for (let i = 0; i <= M; i++) {
      const s = (i / M) * L;
      shape.lineTo(s, top(s) + 0.02);
    }
    shape.lineTo(L, -1.6);
    /* arkuaren zuloa (elipse erdia ur gainean) */
    const hw = len / 2 - 1.4,
      hc = 2.3,
      cx = L / 2;
    shape.lineTo(cx + hw, -1.6);
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * PI;
      shape.lineTo(cx + Math.cos(a) * hw, -1.6 + Math.sin(a) * hc);
    }
    shape.lineTo(0, -1.6);
    const mat = stackMaterial(),
      body = obj(new T.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 4 }), mat);
    body.rotation.y = dir > 0 ? -PI / 2 : PI / 2;
    body.position.set(dir > 0 ? x + w / 2 : x - w / 2, 0, z0 - dir * ext);
    body.castShadow = true;
    /* galtzada: harlauzak arkuaren gainean */
    const pts = [],
      zs = z0 - dir * ext;
    for (let i = 0; i <= 12; i++) pts.push([x, z0 - dir * ext * 0.6 + dir * (len + ext * 1.2) * (i / 12)]);
    pathRibbon(pts, w * 0.92, "stone", { lift: 0.05, ground: (px, pz) => top((pz - zs) * dir) });
    /* barandak */
    const rail = new T.Shape();
    rail.moveTo(0, top(0) - 0.15);
    for (let i = 0; i <= M; i++) {
      const s = (i / M) * L;
      rail.lineTo(s, top(s) + 0.75);
    }
    for (let i = M; i >= 0; i--) {
      const s = (i / M) * L;
      rail.lineTo(s, top(s) - 0.15);
    }
    for (const side of [-1, 1]) {
      const r = obj(new T.ExtrudeGeometry(rail, { depth: 0.38, bevelEnabled: false, curveSegments: 2 }), mat);
      r.rotation.y = body.rotation.y;
      const off = side < 0 ? 0 : w - 0.38;
      r.position.set(dir > 0 ? x + w / 2 - off : x - w / 2 + off, 0, z0 - dir * ext);
      /* baranda-horma: oholtzaren gainetik bakarrik (izotzean azpitik pasatzeko) */
      wallBlock(x + side * (w / 2 - 0.12), (z0 + z1) / 2, 0.32, len + 1, 0, 1.7, peak + 1.6);
    }
    /* zubia: herri-zubia mugikorretan ere irakurgarri (occluder ez) */
    return body;
  }

  /* --------------------------------- soroak --------------------------------- */
  function field(x, z, w, d, rot, crop) {
    const g = new T.Group();
    g.position.set(x, gy(x, z), z);
    g.rotation.y = rot;
    (BP || scene).add(g);
    const soil = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: fieldTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    soil.material.map.repeat.set(1, d / 6);
    soil.rotation.x = -PI / 2;
    soil.position.y = 0.04;
    soil.receiveShadow = true;
    g.add(soil);
    /* landareak: ilaretan (instantziak) */
    const geo = crop === "arto" ? new T.ConeGeometry(0.16, 1.1, 5) : new T.IcosahedronGeometry(0.28, 0),
      mat = material(crop === "arto" ? "#8fa34a" : "#5d8a3c"),
      rows = Math.floor(d / 1.1),
      cols = Math.floor(w / 0.9),
      im = new T.InstancedMesh(geo, mat, rows * cols),
      M4 = new T.Matrix4();
    let k = 0;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const s = 0.75 + ((i * 7 + j * 13) % 5) * 0.1;
        M4.makeScale(s, s, s).setPosition(-w / 2 + 0.45 + j * 0.9, crop === "arto" ? 0.55 * s : 0.18, -d / 2 + 0.55 + i * 1.1);
        im.setMatrixAt(k++, M4);
      }
    im.castShadow = true;
    g.add(im);
    /* harrizko hesia inguruan */
    for (const [lx, lz, len, ry] of [[0, -d / 2 - 0.3, w, 0], [0, d / 2 + 0.3, w, 0], [-w / 2 - 0.3, 0, d, PI / 2], [w / 2 + 0.3, 0, d, PI / 2]]) {
      const n = Math.max(1, Math.ceil(len / 3.1));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n - 0.5,
          wx = x + Math.cos(rot) * (lx + (ry ? 0 : t * len)) + Math.sin(rot) * (lz + (ry ? t * len : 0)),
          wz = z - Math.sin(rot) * (lx + (ry ? 0 : t * len)) + Math.cos(rot) * (lz + (ry ? t * len : 0));
        if ((i === 0 && lz < 0 && !ry) || (crop === "arto" && i === n - 1 && ry && lx > 0)) continue;
        /* modeloaren luzera z ardatzean dago: alboaren norabidean biratu */
        model("fence_stone_straight", wx, gy(wx, wz), wz, 0.75, rot + ry + PI / 2);
      }
    }
    FIELDS.push({ g, im, crop });
    return g;
  }
  const FIELDS = [];

  /* ---------------------------------- IBARRA ---------------------------------- */
  function buildIbarra() {
    zoneBuild("ibarra");
    /* eremu lauak (erliebea leuntzen da hemen) */
    FLAT.push(
      [0, 38, 27, 10], [-38, 22, 7, 4], [40, 18, 7, 4], [33, 47, 6, 3], [-27, 50, 6, 3], [14, 56, 6, 3], [-12, 55, 6, 3], [2, 58, 8, 3], [17, 22, 6, 3], [28, 31, 6, 3],
      [-40, 48, 7, 4], [-8, 60, 6, 4], [-31, -5, 12, 5], [-53, 2, 12, 4], [-51, -16, 10, 4], [-44, 14, 5, 3], [30, -12, 8, 4], [24, -2, 6, 3], [0, -15, 6, 5], [-20, 22, 9, 3], [-32, 37, 10, 3],
      [0, -42, 6, 5], [21, -64, 10, 5], [-26, -70, 6, 5], [-38, -95, 7, 5], [24, -98, 8, 6],
    );
    FLAT_E.push([46, -64, 15, 15, 6], [-6, -112, 42, 30, 7], [-70, -118, 16, 13, 7]);
    /* lur-ezpondak: basora eta lepora (lurrezko aldapak, ez kaxak) */
    EMB.push(
      { ax: -26, az: -70.5, ay: 0, bx: -26, bz: -85, by: 4.9, w: 6, k: 1.7 },
      { ax: -26, az: -85, ay: 4.9, bx: -26, bz: -89, by: 4.9, w: 6, k: 1.7 },
      { ax: -38, az: -96, ay: 0, bx: -52, bz: -101, by: 4.2, w: 4.4, k: 1.6 },
      { ax: -52, az: -101, ay: 4.2, bx: -56.4, bz: -101.4, by: 4.2, w: 4.4, k: 1.6 },
      { ax: -56.4, az: -101.4, ay: 4.2, bx: -71.5, bz: -98.3, by: 9.4, w: 4.4, k: 1.6 },
      { ax: -71.5, az: -98.3, ay: 9.4, bx: -74.6, bz: -98.6, by: 9.4, w: 5.6, k: 1.6 },
      { ax: -74.6, az: -98.6, ay: 9.4, bx: -74.6, bz: -102.2, by: 9.4, w: 4.6, k: 1.6 },
      { ax: -74.6, az: -102.2, ay: 9.4, bx: -74.6, bz: -105.1, by: 12, w: 4.4, k: 1.6 },
      { ax: -74.6, az: -105.1, ay: 12, bx: -74.6, bz: -107.6, by: 12, w: 4.4, k: 1.6 },
    );
    /* portuko eskailera itsaslabarrean zulatuta */
    CUTS.push({ ax: -6, az: 61, ay: -0.08, bx: 8, bz: 74, by: -7.28, w: 3.6, k: -2.6 });
    /* haran osoa: lurra, ibaia (izotza orainean) eta leize-zuloa */
    valleyGround();
    /* terrazak */
    plateau({ x: 46, z: -64, y: 9, rx: 15, rz: 15, area: "harrespila" });
    plateau({ x: -6, z: -112, y: 5, rx: 42, rz: 30, area: "basoa" });
    plateau({ x: -70, z: -118, y: 12, rx: 16, rz: 13, area: "lepoa" });
    /* lepoaren gainetik ezin da erori (bidetik bakarrik jaitsi) */
    BOUNDS.push({ x: -70, z: -118, rx: 16, rz: 13, k: 0.95, gaps: [[1.86, 0.17]] });

    /* ------------------------------ IBAIA ------------------------------ */
    /* arroila: harkaitz-hormak ibaiaren ertzean (iparrean garaiak, hegoan baxuagoak: kamera) */
    riverRocks(92, 57, 1, 13, 22, 21);
    riverRocks(92, 57, -1, 2, 4.5, 3, 8);
    riverRocks(50, 37, 1, 4, 8, 71, 7);
    riverRocks(-14, -34, 1, 2.5, 5, 51, 9);
    riverRocks(-58, -74, 1, 2, 4.5, 61, 8);
    /* ibaiko uhartetxoa (izotzean bakarrik iristen da; oihartzun-harria gainean) */
    rockPillar(-50, -28.5, -0.9, 30, 0.85);
    platforms.push({ x: -50, z: -28.5, y: -0.4, bottom: -2, rx: 3.4, rz: 3.4, phase: -1, safe: true, area: "ibaia" });
    /* zubia: harrizko arkua */
    stoneBridge(0, -19, -38, 5, 1.7);
    /* ------------------- ur-jauzia eta LAMIEN LEIZEA (ekialdea) ------------------- */
    mountain(142, -28, 32, 50, 1.2, 0.78);
    /* harkaitz-horma ur-jauziaren inguruan (leizearen ahoa erdian geratzen da) */
    for (const [sx, sz, sh, seed] of [[104, -42, 18, 4], [105, -16, 7, 5], [106, -28.5, 22, 15], [109, -35, 22, 10], [109, -22, 17, 20], [113, -46, 24, 2], [114, -12, 9, 25], [118, -33, 26, 9], [118, -23, 21, 4], [122, -40, 28, 12], [123, -15, 14, 30]])
      rockPillar(sx, sz, sh, seed);
    const ft = fallTexture();
    ft.repeat.set(2, 1.4);
    const fall = obj(new T.PlaneGeometry(9, 17), new T.MeshBasicMaterial({ map: ft, color: "#cdeef5", transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
    fall.position.set(99, 7.3, -28.5);
    fall.rotation.y = -PI / 2;
    fall.castShadow = false;
    ATMO.falls.push(fall);
    /* izotz-gortina (ORAINA): ur-jauzia izoztuta, pasaezina */
    HUB.iceFall = obj(new T.BoxGeometry(1.2, 17, 9.4), new T.MeshStandardMaterial({ color: "#cfeefa", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.78, emissive: new T.Color("#5fa8c8"), emissiveIntensity: 0.15 }));
    HUB.iceFall.position.set(98.6, 7.3, -28.5);
    platforms.push((HUB.iceFall.p = { x: 98.6, z: -28.5, y: 16, bottom: -2, w: 1.3, d: 9.6, rot: 0, phase: 1, wall: true, safe: false }));
    /* ertz-harria ur-jauziaren aurrean (bi garaietan) eta leizearen ahoa atzean */
    slab({ x: 95.05, z: -28.5, y: -0.9, w: 9.1, d: 9, h: 1.4, area: "urjauzia" });
    wallBlock(97.5, -33.6, 6, 1.2, 0, -1.2, 10);
    wallBlock(97.5, -23.4, 6, 1.2, 0, -1.2, 10);
    for (const [ax, az] of [[101.2, -32.2], [101.2, -24.8]]) box(ax, 2.6, az, 1.6, 7.6, 1.6, material("#4e4b44"));
    box(101.2, 6.9, -28.5, 1.6, 1.2, 9, material("#45423b"));
    const mouthL = obj(new T.PlaneGeometry(6.5, 8), new T.MeshBasicMaterial({ color: "#030608" }));
    mouthL.position.set(101.2, 2.8, -28.5);
    mouthL.rotation.y = -PI / 2;
    mouthL.castShadow = false;
    slab({ x: 100.8, z: -28.5, y: -0.9, w: 2.8, d: 6, h: 1.4, area: "urjauzia" });

    /* ------------------------------ HERRIA ------------------------------ */
    plaza(0, 36, 10.5);
    /* bideak: harlauzak herrian */
    pathRibbon([[-8, 62], [-4, 55], [-0.5, 49], [0, 46.6]], 3.3, "stone");
    pathRibbon([[0, 25.6], [1.5, 20], [3, 12], [1.2, 2], [-0.6, -8], [0, -16.5]], 3.2, "dirt");
    pathRibbon([[-10.2, 34.5], [-14, 31], [-17.5, 27.2]], 2.8, "stone");
    pathRibbon([[-10.4, 38], [-16, 39], [-21.5, 37.8]], 2.6, "stone");
    pathRibbon([[10.3, 38], [15.5, 41.2], [21.5, 42.5]], 2.6, "stone");
    pathRibbon([[3, 46.4], [2.6, 51.5]], 2.6, "stone");
    pathRibbon([[-7.4, 28.6], [-13, 18], [-21, 8], [-27, 1]], 2.4, "dirt");
    pathRibbon([[8, 29], [18, 20], [26, 10], [30, -6]], 2.4, "dirt");
    pathRibbon([[-26, 1], [-38, 4], [-45, 12]], 2.2, "dirt");
    pathRibbon([[-14, 43], [-26, 46], [-36, 47]], 2.2, "stone");
    /* eliza eta frontoia (euskal herri baten bihotza) */
    model("building_church_red", -20, 0, 22, 14, 0.6);
    box(-32, 4.6, 37, 1.4, 9.2, 15, material("#ece6d6"));
    box(-32, 0.6, 37, 1.6, 1.2, 15.2, material("#8c877a"));
    box(-32, 9.35, 37, 1.8, 0.5, 15.6, material("#6d6b62"));
    box(-31.27, 1.55, 37, 0.06, 0.2, 15, material("#a8332a", 0.2));
    for (const pz of [29.3, 44.7]) box(-32, 4.8, pz, 1.9, 9.6, 0.7, material("#d9d2c0"));
    wallBlock(-32, 37, 1.4, 15, 0, 0, 9.5);
    const court = obj(new T.PlaneGeometry(11, 15), material("#5d8a6a"));
    court.rotation.x = -PI / 2;
    court.position.set(-26, 0.045, 37);
    court.castShadow = false;
    for (const zz of [31, 37, 43]) box(-31.2, 0.06, zz, 0.12, 0.02, 0.6, "#ffffff");
    /* etxeak (zuria eta gorria) */
    for (const [hx, hz, hh, ha, k] of [
      [17, 22, 7, -0.6, "A"], [28, 31, 8, -1.3, "B"], [14, 56, 7, 2.7, "A"], [-12, 55, 8, 3.0, "B"], [-27, 50, 7, 2.3, "A"],
      [33, 47, 6.5, -2.2, "A"], [-38, 22, 7.5, 1.2, "B"], [40, 18, 7, -1.0, "B"],
    ])
      HOUSES.push({ m: model("building_home_" + k + "_red", hx, gy(hx, hz), hz, hh, ha), x: hx, z: hz });
    /* ANDEREREN ETXEA: zigilatuta (jentil-erruna atean) */
    HUB.andere = { m: model("building_home_B_red", -40, 0, 48, 7.8, 1.9), x: -40, z: 48 };
    HOUSES.push(HUB.andere);
    const seal = obj(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ color: "#9fd8ff", map: runeTexture(), transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }));
    seal.position.set(-36.6, 1.7, 49.6);
    seal.rotation.y = 1.9;
    HUB.andere.seal = seal;
    HOUSES.push({ m: model("building_blacksmith_red", 25, 0, 43, 7.5, -1.9), x: 25, z: 43, forge: true });
    HOUSES.push({ m: model("building_tavern_red", 2, 0, 58, 9, PI), x: 2, z: 58 });
    model("building_well_red", 9, 0, 35, 3.2, 0.3);
    /* errota ibai-ertzean: gurpila iraganean biraka */
    const mill = model("building_watermill_red", 30, 0, -12, 9, PI);
    HUB.wheel = mill.getObjectByName("building_watermill_wheel_red");
    HOUSES.push({ m: mill, x: 30, z: -12 });
    /* garaia (aleak gordetzeko etxola) soroen ondoan */
    model("building_grain", -44, gy(-44, 14), 14, 5.2, 0.4);
    /* txalaparta plazan (Pello eta Peio) */
    TXALA.spots.push(txalapartaMesh(0, 0, 30.5, 0, "herria"));
    /* merkatua eta apaingarriak */
    model("tent", -10, 0, 28, 3.4, 0.4);
    model("tent", 13, 0, 29, 3, -0.3);
    for (const [bx, bz] of [[-12, 31], [-11, 32.6], [15, 32], [21, 40], [-20, 41], [30, 38], [-28, 44], [24, 25]]) HUB.barrels.push(breakable("barrel", bx, gy(bx, bz), bz));
    for (const [bx, bz] of [[-13.6, 29.5], [15.2, 30.2], [22.6, 39.4], [-20, 30]]) HUB.barrels.push(breakable("crate_A_big", bx, gy(bx, bz), bz));
    FLAGS.push(model("flag_red", 4, 0, 25, 4.2, 0.2), model("flag_yellow", -6, 0, 47, 3.6, 2.8), model("flag_green", 9.5, 0, 46.5, 3.4, -2.6));
    model("wheelbarrow", 19, 0, 36, 1.5, 0.8);
    model("sack", 12, 0, 27, 0.8, 0.5);
    model("crate_open", 27.5, 0, 40.5, 1.1, 0.3);
    model("bucket_water", 10.8, 0, 33.8, 0.7, 0);
    model("target", -27.5, 0, 31, 2.2, -1.2);
    /* ------------------------------ PORTUA ------------------------------ */
    /* harrizko eskailera itsaslabarrean behera, egurrezko kaia eta badia (orainean izoztua) */
    rampP(-6, 61, 0, 8, 74, -7.2, 3.2, "portua");
    stairsMesh(-6, 61, 0, 8, 74, -7.2, 3.2, 18);
    for (const k of [0.62, 0.86]) box(-6 + 14 * k, (0 - 7.2 * k - 9.4) / 2, 61 + 13 * k, 1.6, 9.4 - 7.2 * k + 0.2, 1.6, stackMaterial());
    const sr = Math.atan2(14, 13);
    for (const sd of [-1, 1]) wallBlock(1 + Math.cos(sr) * sd * 1.85, 67.5 - Math.sin(sr) * sd * 1.85, 0.3, 19.2, sr, -8, 9.5);
    slab({ x: 8, z: 80.5, y: -7.2, w: 5, d: 13, h: 0.5, mat: "wood", area: "kaia" });
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) box(8 + s * 2.2, -8.3, 75.5 + k * 3.6, 0.35, 2.4, 0.35, "#5d4632");
    harborBoat(17, 85);
    /* badia izoztua (orainean): elipsea, itsaslabarraren oinetik (mugak haran.js-en) */
    HUB.bay = { x: PORT.bay.x, z: PORT.bay.z, rx: PORT.bay.rx, rz: PORT.bay.rz };
    platforms.push({ x: PORT.bay.x, z: PORT.bay.z, y: -8.4, bottom: -9, rx: PORT.bay.rx + 0.5, rz: PORT.bay.rz + 0.5, phase: 1, area: "badia", safe: false, slick: true, ice: true });
    /* izotz-uhartetxoa badian (Txominen sarea) */
    HUB.islet = { x: 25, z: 100 };
    rockPillar(26.5, 101.5, -7.8, 10, 0.8);
    platforms.push({ x: 26.5, z: 101.5, y: -7.3, bottom: -9, rx: 3.3, rz: 3.3, phase: -1, area: "badia", safe: true });
    /* ------------------------------ ZELAIAK ------------------------------ */
    for (let i = 0; i < 6; i++) model("fence_wood_straight", HUB.pen.x - 6 + i * 2.3, 0, HUB.pen.z + 5, 1.3, PI / 2);
    for (let i = 0; i < 4; i++) model("fence_wood_straight", HUB.pen.x - 7.2, 0, HUB.pen.z + 4 - i * 2.3, 1.3, 0);
    for (let i = 0; i < 4; i++) model("fence_wood_straight", HUB.pen.x + 7.2, 0, HUB.pen.z + 4 - i * 2.3, 1.3, 0);
    field(-53, 2, 16, 11, 0.12, "arto");
    field(-51, -16, 13, 9, -0.2, "baratza");
    model("resource_lumber", 22, gy(22, 2), 2, 1.4, 0.4);
    model("resource_lumber", 27, gy(27, -7), -7, 1.4, 1.2);
    model("tent", 24, gy(24, -2), -2, 2.6, 0.9);
    model("pallet", 20.5, gy(20.5, 0.5), 0.5, 0.3, 0.2);
    for (const [tx, tz] of [[18, -4], [31, 1], [15, 6]]) model("tree_single_A_cut", tx, gy(tx, tz), tz, 0.9, tx);
    trees(38, 6, null, 13, 10, undefined, [[30, -12, 9], [24, -2, 6], [0, 0, 7]]);
    trees(-60, 26, null, 11, 8, undefined, [[-53, 2, 11]]);
    trees(52, 40, null, 12, 7);
    trees(-56, 46, null, 9, 5, undefined, [[-40, 48, 9]]);
    trees(62, 2, null, 7, 4, ["trees_A_small", "trees_B_small", "tree_single_B"]);

    /* ------------------------------ IPAR-LARREAK ------------------------------ */
    pathRibbon([[0, -40.5], [-3, -47], [-10, -57], [-20, -66], [-26, -71.5]], 2.8, "dirt");
    pathRibbon([[0.5, -40.5], [6, -47], [12, -56], [14.5, -62]], 2.4, "dirt");
    pathRibbon([[-17, -64], [-27, -78], [-33, -88], [-38, -95]], 2.4, "dirt");
    pathRibbon([[13, -52], [22, -70], [26, -86], [24, -98]], 2.2, "dirt");
    trees(-46, -52, null, 13, 9, undefined, [[-20, -66, 5]]);
    trees(10, -80, null, 8, 4, undefined, [[-6, -84, 6], [24, -86, 4]]);
    trees(70, -96, null, 14, 9);
    trees(58, -122, null, 10, 6, ["trees_A_small", "trees_B_medium", "tree_single_A"]);
    /* harrespilaren eskailera: jentil-harriak (ESNATU erritmoarekin altxatzen dira) */
    for (let i = 0; i < 5; i++) HUB.stairs.push(jentilStone(15 + i * 3.1, -64, 0, (i + 1) * 1.72, 2.6, 2.8, "iparra"));
    /* harrespila: zutarri biribila */
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU,
        x = 46 + Math.cos(a) * 9,
        z = -64 + Math.sin(a) * 9;
      const m = box(x, 9 + 1.6, z, 1.1, 3.2 + (i % 3) * 0.6, 0.8, stackMaterial());
      m.rotation.y = a;
      m.rotation.z = (i % 2 ? 1 : -1) * 0.05;
      solids.push({ x, z, r: 0.75, h: 4, y: 9, pillar: true });
    }
    /* ---- BASOA: lur-bide aldapatsua harri artean (lur-ezponda, haran.js) ---- */
    pathRibbon([[-26, -70], [-25.6, -75], [-26.2, -80.5], [-26, -86.4]], 3.2, "dirt");
    for (const [rx_, rz_, rs, rk] of [[-30.4, -74, 2.4, "rock_single_A"], [-21.6, -77, 2.8, "rock_single_C"], [-30.6, -81, 3.2, "rock_single_D"], [-21.2, -83, 2.2, "rock_single_B"], [-31, -86.5, 2.6, "rock_single_E"]])
      model(rk, rx_, gy(rx_, rz_), rz_, rs, rx_ * 0.7);
    trees(-6, -112, 5, 38, 44, undefined, [[-6, -112, 7], [-26, -88, 6], [-6, -134, 7], [-14, -100, 4], [-6, -122, 4], [-22, -126, 4]]);
    pathRibbon([[-26, -86], [-20, -97], [-13, -110], [-8, -122], [-6, -133]], 2.6, "dirt", { y: 5 });
    pathRibbon([[-14, -100], [-26, -110], [-30, -122]], 1.8, "dirt", { y: 5 });
    /* leizearen ataria: harkaitzak, arkua eta jentil-atea */
    mountain(-6, -182, 38, 70, 0.3, 0.55);
    solids.push({ x: -6, z: -182, r: 34, h: 80, y: -9, pillar: true });
    wallBlock(-6, -143, 60, 4, 0, 5, 30, false);
    for (const [sx, sz, sh, seed] of [[-31, -147, 20, 2], [-24, -149, 27, 5], [-17, -146, 24, 7], [5, -146, 23, 1], [12, -149, 28, 4], [19, -146, 19, 8], [-6, -151, 30, 3], [-14, -153, 34, 6], [2, -153, 32, 9]]) {
      rockPillar(sx, sz, sh, seed);
      solids.push({ x: sx, z: sz, r: 4.2, h: sh + 12, y: -9, pillar: true });
    }
    box(-10.5, 5 + 4, -140, 2.2, 8, 2.6, material("#56544c"));
    box(-1.5, 5 + 4, -140, 2.2, 8, 2.6, material("#56544c"));
    box(-6, 5 + 8.6, -140, 11.2, 1.6, 2.6, material("#4c4a43"));
    solids.push({ x: -10.5, z: -140, r: 1.4, h: 9, y: 5, pillar: true }, { x: -1.5, z: -140, r: 1.4, h: 9, y: 5, pillar: true });
    const mouth = obj(new T.PlaneGeometry(7, 8), new T.MeshBasicMaterial({ color: "#05080a" }));
    mouth.position.set(-6, 9, -141.2);
    mouth.castShadow = false;
    HUB.gate = jentilStone(-6, -138.4, 5, 5, 6.6, 1.6, "ataria", true);

    /* ------------------ ARTZAINEN LEPOA eta TARTALOREN KOBA ------------------ */
    /* mendi-bidea lur-ezpondetan gora (haran.js: EMB) */
    pathRibbon([[-36, -95.3], [-44, -98.3], [-52, -100.9], [-56.4, -101.3], [-64, -99.8], [-71.4, -98.4]], 3.1, "dirt");
    pathRibbon([[-71.4, -98.4], [-74.2, -98.7], [-74.6, -101], [-74.6, -103.8], [-74.6, -106]], 3.1, "dirt");
    for (const [rx_, rz_, rs, rk] of [[-45, -93, 2.4, "rock_single_B"], [-60, -96, 2.8, "rock_single_D"], [-66, -104.6, 3, "rock_single_C"], [-79.6, -96, 2.6, "rock_single_A"]])
      model(rk, rx_, gy(rx_, rz_), rz_, rs, rx_);
    /* haize-errotaren atea (HAIZE-ADARRA behar da): egurrezko hesia eta besoak */
    const wg = new T.Group();
    wg.position.set(-74.6, 9.4, -101.4);
    BP.add(wg);
    const gateMesh = new T.Mesh(new T.BoxGeometry(4.6, 3.6, 0.4), material("#6a4a2e"));
    gateMesh.position.y = 1.8;
    gateMesh.castShadow = true;
    wg.add(gateMesh);
    for (let i = -2; i <= 2; i++) {
      const plank = new T.Mesh(new T.BoxGeometry(0.16, 3.7, 0.5), material("#4e3520"));
      plank.position.set(i * 1.05, 1.8, 0);
      wg.add(plank);
    }
    const mast = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 6.4, 6), material("#5a3c26"));
    mast.position.set(3.2, 3.2, 0);
    wg.add(mast);
    const sails = new T.Group();
    sails.position.set(3.2, 6.2, 0.4);
    for (let i = 0; i < 4; i++) {
      const arm = new T.Mesh(new T.BoxGeometry(0.22, 2.6, 0.08), material("#d9c9a8"));
      arm.position.y = 1.3;
      const holder = new T.Group();
      holder.rotation.z = (i * PI) / 2;
      holder.add(arm);
      sails.add(holder);
    }
    wg.add(sails);
    HUB.windGate = { g: wg, gate: gateMesh, sails, t: saved.flags.includes("lepoa") ? 1 : 0, spin: 0, x: -74.6, z: -101.4, y: 9.4, p: wallBlock(-74.6, -101.4, 4.8, 0.8, 0, 9.4, 7.5) };
    HUB.windGate.p.off = saved.flags.includes("lepoa");
    /* HAIZE-ADARRA: besoei putz egitean, errota biraka eta atea gora */
    windable({ x: -71.4, y: 15.6, z: -101, r: 2.6, dy: 9, range: 16, live: () => !saved.flags.includes("lepoa"), gust: () => (HUB.windGate.spin = 1) });
    /* hosto-pilak: zerbait ezkutatzen dute (adarraz) */
    const leafC1 = chest("h-hostoak", 15, 5, -129, -0.6, { t: "piece", id: "hostoak" }, { hidden: true });
    if (!leafC1.opened) leafPile(15, 5, -129, () => revealChest(leafC1));
    const leafC2 = chest("h-hostoak2", -45, gy(-45, -22), -22, 0.8, { t: "coins", n: 25 }, { hidden: true });
    if (!leafC2.opened) leafPile(-45, gy(-45, -22), -22, () => revealChest(leafC2));
    /* lepoaren hegoaldeko ertza: arrapalatik bakarrik igo daiteke (atea saihestu ezin) */
    wallBlock(-82, -104.4, 9.6, 0.6, 0, 0, 17);
    wallBlock(-64.4, -104.4, 15, 0.6, 0, 0, 17);
    wallBlock(-77.6, -98.6, 0.5, 6, 0, 9.4, 5);
    /* atearen atzeko ezponda: alboetatik ezin da igo (atetik bakarrik) */
    for (const sx of [-77.15, -72.05]) wallBlock(sx, -103.3, 0.5, 3.6, 0, 0, 17);
    /* koba: harkaitzak, ardi-hezurrak eta aho iluna */
    mountain(-76, -162, 34, 64, 2.4, 0.5);
    solids.push({ x: -76, z: -162, r: 28, h: 80, y: -9, pillar: true });
    for (const [sx, sz, sh, seed] of [[-84, -136, 26, 3], [-77, -139, 30, 5], [-63, -138, 28, 1], [-56, -134, 22, 6], [-88, -128, 21, 9]]) {
      rockPillar(sx, sz, sh, seed);
      solids.push({ x: sx, z: sz, r: 4, h: sh + 12, y: -9, pillar: true });
    }
    wallBlock(-70, -132.4, 26, 2, 0, 12, 20, false);
    box(-74, 12 + 3.6, -130.6, 2, 7.2, 2.4, material("#4e4b44"));
    box(-66, 12 + 3.6, -130.6, 2, 7.2, 2.4, material("#4e4b44"));
    box(-70, 12 + 7.6, -130.6, 10, 1.4, 2.4, material("#45423b"));
    solids.push({ x: -74, z: -130.6, r: 1.3, h: 9, y: 12, pillar: true }, { x: -66, z: -130.6, r: 1.3, h: 9, y: 12, pillar: true });
    const mouthT = obj(new T.PlaneGeometry(6, 7), new T.MeshBasicMaterial({ color: "#040506" }));
    mouthT.position.set(-70, 12 + 3.5, -131.8);
    mouthT.castShadow = false;
    for (const [bx, bz, br] of [[-62, -122, 0.4], [-66.5, -125.5, 2.1], [-77, -124, 1.2], [-80.5, -116, 0.8]]) {
      const bone = obj(new T.CylinderGeometry(0.07, 0.07, 0.9, 5), material("#e8e0cc"));
      bone.position.set(bx, 12.08, bz);
      bone.rotation.set(PI / 2, 0, br);
      const skull = obj(new T.IcosahedronGeometry(0.22, 0), material("#e8e0cc"));
      skull.position.set(bx + 0.5, 12.16, bz + 0.2);
    }
    model("rock_single_E", -82, 12, -112, 3.4, 0.4);
    trees(-70, -112, 12, 9, 5, ["tree_single_A", "tree_single_B", "trees_A_small"], [[-70, -118, 5], [-74.6, -106, 4]]);

    /* ---- atzeko planoa: mendiak, Anboto eta hodeiak ---- */
    for (const [mx, mz, mh, mr, sl] of [
      [-175, -140, 85, 70, 0.6], [-120, -245, 115, 90, 0.55], [-30, -335, 175, 120, 0.5], [70, -270, 120, 95, 0.55], [165, -175, 95, 75, 0.6],
      [205, -45, 70, 60, 0.66], [-205, -25, 62, 55, 0.7], [-150, 40, 34, 45, 2], [140, 45, 30, 40, 2], [-60, -230, 70, 55, 0.62], [120, -215, 80, 60, 0.6],
    ])
      mountain(mx, mz, mr, mh, mx * 0.013 + mz * 0.007, sl);
    for (let i = 0; i < 9; i++) {
      const c = model(i % 2 ? "cloud_big" : "cloud_small", -200 + i * 52, 70 + (i % 3) * 12, -240 + (i % 4) * 40, 14 + (i % 3) * 5, i);
      c.traverse((n) => n.isMesh && ((n.castShadow = false), (n.material = n.material.clone()), (n.material.transparent = true), (n.material.opacity = 0.85)));
      CLOUDS.push(c);
    }
    /* mendi-hegalak: harkaitz-bandak eta basoa (ingeradatik kanpo) */
    slopeRocks();
    slopeForest();
    rocksFlush();
    /* ardiak (Joanesen misioa) */
    for (const [i, [sx, sz]] of [[52, -18], [-62, -74], [-22, -122]].entries()) {
      const home = saved.sheep.includes(i),
        hx = home ? HUB.pen.x - 3 + i * 3 : sx,
        hz = home ? HUB.pen.z : sz,
        hy = home ? gy(hx, hz) : sz < -100 ? 5 : gy(sx, sz);
      const m = sheepMesh(hx, hy, hz, i);
      HUB.sheep.push({ i, m, x: hx, z: hz, y: hy, home, follow: false, t: i });
    }
    ZONES.ibarra.spawn = { x: -6, y: 0, z: 44 };
  }
  const HOUSES = [],
    FLAGS = [];
  /* txalupa portuan: iraganean kulunka, orainean izotzean harrapatuta */
  function harborBoat(x, z) {
    const hull = new T.Shape();
    hull.moveTo(-2.7, 0.9);
    hull.lineTo(2.9, 0.9);
    hull.lineTo(2.1, -0.4);
    hull.lineTo(-2.2, -0.4);
    hull.closePath();
    const g = new T.Group();
    const hg = new T.ExtrudeGeometry(hull, { depth: 1.7, bevelEnabled: false });
    hg.translate(0, 0, -0.85);
    g.add(new T.Mesh(hg, material("#7a4f32")));
    const mast = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 5, 5), material("#5a3c26"));
    mast.position.set(0, 3.2, 0);
    g.add(mast);
    const sail = new T.Mesh(new T.PlaneGeometry(2.2, 2.8), new T.MeshStandardMaterial({ color: "#e9dcc0", side: T.DoubleSide, roughness: 0.9 }));
    sail.position.set(0.9, 3.4, 0);
    g.add(sail);
    g.scale.setScalar(1.3);
    g.position.set(x, -8.3, z);
    g.rotation.y = PI / 2.4;
    (BP || scene).add(g);
    HUB.boat = g;
  }

  /* haraneko guneak kokapenaren arabera (HUDaren izena eta deskribapena) */
  function hubArea(x, z, y) {
    if (y < -5 && z > 60) return z > 87 || Math.abs(x - 8) > 3 ? "badia" : "kaia";
    if (Math.hypot(x - PIT.x, z - PIT.z) < 17) return "zuloa";
    if (y < -0.4 && riverW(x, z) < 1) return x > 88 ? "urjauzia" : x > 50 ? "arroila" : "ibaia";
    if (Math.hypot(x - HUB.cave.x, z - HUB.cave.z) < 14 && y > 3) return "ataria";
    if (y > 7.5 && Math.hypot(x - 46, z + 64) < 17) return "harrespila";
    if (y > 3 && ((x + 70) / 19) ** 2 + ((z + 116) / 17) ** 2 < 1.3) return "lepoa";
    if (y > 3.5 && ((x + 6) / 43) ** 2 + ((z + 112) / 31) ** 2 < 1) return "basoa";
    if (z < -12) return z < riverZ(clamp(x, -88, 100)) ? "iparra" : "zelaiak";
    if (z > 63) return "portua";
    if (z > 10 && Math.abs(x) < 46) return "herria";
    return "zelaiak";
  }
  function hubUpdate(dt) {
    dayClock(dt);
    secretsUpdate();
    stonesUpdate(dt);
    watersUpdate(dt);
    for (const [i, c] of CLOUDS.entries()) c.position.x += dt * (0.6 + (i % 3) * 0.3) * (1 - phaseBlend * 0.85);
    if (HUB.boat) {
      const live = 1 - phaseBlend;
      HUB.boat.position.y = -8.3 + Math.sin(time * 1.1) * 0.12 * live - phaseBlend * 0.15;
      HUB.boat.rotation.z = Math.sin(time * 0.8) * 0.04 * live + phaseBlend * 0.06;
    }
    /* errotaren gurpila: iraganean biraka, orainean izoztuta */
    if (HUB.wheel) HUB.wheel.rotation.x -= dt * 0.9 * (1 - phaseBlend);
    if (HUB.iceFall) {
      HUB.iceFall.visible = phaseBlend > 0.5;
      HUB.iceFall.material.opacity = 0.35 + 0.45 * phaseBlend;
    }
    if (HUB.andere && HUB.andere.seal) HUB.andere.seal.material.opacity = saved.flags.includes("andere") ? 0 : 0.45 + 0.25 * Math.sin(time * 2);
    windGateUpdate(dt);
    pitUpdate(dt);
    riverDrown();
    sheepUpdate(dt);
    lifeUpdate(dt);
    questsUpdate(dt);
    if (ZONE.pending || cinematic) return;
    /* leizeen ahoak */
    if (HUB.gate && HUB.gate.p.off && Math.hypot(P.x - HUB.cave.x, P.z - HUB.cave.z) < 2.4 && P.y > 4) enterZone("leizea", { ...DUNGEON.entry, cp: true });
    /* ur-jauziaren atzean: IRAGANEAN bakarrik (orainean izotz-gortina) */
    if (DGS.lamia && phase === 0 && P.x > HUB.lamia.x && Math.abs(P.z - HUB.lamia.z) < 3.2 && P.y > -2 && P.y < 2) {
      fxBurst(P.x, P.y + 1.2, P.z, { n: 30, speed: 3, up: 2, life: 0.6, size: 0.3, color: "#cdeef5", grav: 6 });
      SND.splash();
      enterZone("lamia", { ...DGS.lamia.entry, cp: true });
    }
    if (DGS.tartalo && Math.hypot(P.x - HUB.tartalo.x, P.z - HUB.tartalo.z) < 2.4 && P.y > 10) enterZone("tartalo", { ...DGS.tartalo.entry, cp: true });
  }
  /* haize-errotaren atea: HAIZE-ADARRAz putz egitean besoak biraka eta atea gora */
  function windGateUpdate(dt) {
    const W = HUB.windGate;
    if (!W) return;
    W.spin = Math.max(0, W.spin - dt * 0.6);
    W.sails.rotation.z -= dt * (0.3 + W.spin * 9) * (1 - phaseBlend * 0.7);
    if (W.spin > 0.8 && W.t < 1 && !saved.flags.includes("lepoa")) {
      flagSet("lepoa");
      SND.wake();
      shake(0.25);
      title("ARTZAINEN LEPOA", "");
      notify(L("Haize-errota biraka: atea altxatu da. Tartaloren koba goian dago."), "", 4);
    }
    if (saved.flags.includes("lepoa") && W.t < 1) W.t = Math.min(1, W.t + dt * 0.5);
    const k = smooth01(W.t);
    W.gate.position.y = 1.8 + k * 3.6;
    W.g.children.forEach((c, i) => i > 0 && i < 6 && (c.position.y = 1.8 + k * 3.6));
    W.p.off = k > 0.9;
  }
