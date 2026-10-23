  /* ==================================================================
     AURPEGIA · Amaiurren aurpegia (diseinu propioa)
     KayKit-eko burua bloke sinpleekin dago (bi obalo beltz begi gisa eta sudur handi bat).
     Hemen: begi-geometria, sudurra eta ahoaren koska buruan sartu (gainazalera berdindu), eta aurpegiaren
     gainean "maskara" kurbatu bat jarri (buruko hezurrari lotua) eskuz marraztutako aurpegi
     batekin: begi handiak (iris anbarra, distirak, betileak), bekainak, pikortak, masailetako
     gorrixka eta ahoa. Begiak kliskatzen ditu, eta hitz egitean (AMAIUR ahotsa) ahoa mugitzen du.
     Testurarik gabe ere (?gfx=0) funtzionatzen du: kanbasean marrazten da.
     ================================================================== */
  const FACE = { mesh: null, tex: null, ctx: null, state: "", blinkT: 3, blink: 0, mouth: 0, force: null, bone: null };
  /* aurpegiaren gainazala sarean (buruaren espazio kuantizatuan, -1..1): erdian aurrera, alboetara atzera */
  const faceSurf = (x, y) => 0.885 - 0.85 * x * x - 0.2 * Math.max(0, y - 0.15) ** 2;
  function faceBuild() {
    const head = actor.getObjectByName("Mage_Head"),
      bone = actor.getObjectByName("head");
    if (!head || !bone || !head.isSkinnedMesh) return;
    const g = head.geometry,
      pos = g.attributes.position,
      uv = g.attributes.uv,
      nrm = g.attributes.normal,
      qn = (a) => (!a.normalized ? 1 : a.array instanceof Int8Array ? 127 : a.array instanceof Int16Array ? 32767 : a.array instanceof Uint16Array ? 65535 : 1),
      pn = qn(pos),
      un = qn(uv),
      nn = qn(nrm),
      R = (v, q) => (q === 1 ? v : Math.round(v * q));
    /* 1 · begi beltzak (paletako gelaxka ilun bat) eta ahoaren koska: azalaren azpira, azal-kolorez */
    const skinU = R(0.06, un),
      skinV = R(0.12, un);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / pn,
        y = pos.getY(i) / pn,
        z = pos.getZ(i) / pn,
        u = uv.getX(i) / un,
        v = uv.getY(i) / un;
      const eye = u >= 0.25 && u < 0.375 && v < 0.25,
        skin = u < 0.125 && v < 0.25;
      if (eye) {
        pos.setZ(i, R(Math.min(z, faceSurf(x, y) - 0.03), pn));
        uv.setXY(i, skinU, skinV);
      } else if (skin && Math.abs(x) < 0.2 && y > -0.31 && y < 0.03 && z > faceSurf(x, y) - 0.07) {
        /* sudur handia: aurpegiaren azpira sartu (aurpegia jarraitua da azpian); sudur txiki bat
           maskaran marrazten da (faceDraw) — botoi-sudurra, anime erara */
        pos.setZ(i, R(faceSurf(x, y) - 0.035, pn));
        const l = Math.hypot(1.7 * x, 1);
        nrm.setXYZ(i, R((1.7 * x) / l, nn), 0, R(1 / l, nn));
      } else if (skin && Math.abs(x) < 0.48 && y < -0.3 && y > -0.56 && Math.abs(z - faceSurf(x, y)) < 0.08) {
        /* ahoaren arraila: gainazaleraino bete, normala aurrera (ahoa marraztuta dago) */
        pos.setZ(i, R(faceSurf(x, y), pn));
        const l = Math.hypot(1.7 * x, 1);
        nrm.setXYZ(i, R((1.7 * x) / l, nn), 0, R(1 / l, nn));
      } else if (skin && Math.abs(x) < 0.5 && y > -0.56 && y < 0.12 && Math.abs(z - faceSurf(x, y)) < 0.03) {
        /* aurpegiaren gainerakoa: gainazalaren normala (itzal-marra eta josturarik gabe) */
        const l = Math.hypot(1.7 * x, 1);
        nrm.setXYZ(i, R((1.7 * x) / l, nn), 0, R(1 / l, nn));
      }
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    nrm.needsUpdate = true;
    /* (normalak ez berkalkulatu: kuantizatuta daude, Int8, eta zero bihurtuko lirateke → aurpegi beltza) */
    /* 2 · maskara: sare-espaziotik buruaren hezurraren espaziora (lotura-matrizeak) */
    const sk = head.skeleton,
      bi = sk.bones.indexOf(bone);
    if (bi < 0) return;
    const M = new T.Matrix4().multiplyMatrices(sk.boneInverses[bi], head.bindMatrix);
    const W = 1.3,
      H = 1.08,
      cy = -0.2,
      geo = new T.PlaneGeometry(W, H, 18, 12),
      gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i),
        y = gp.getY(i) + cy;
      gp.setXYZ(i, x, y, faceSurf(x, y) + 0.018);
    }
    geo.applyMatrix4(M);
    geo.computeVertexNormals();
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    FACE.ctx = c.getContext("2d");
    FACE.tex = new T.CanvasTexture(c);
    FACE.tex.anisotropy = 4;
    if ("encoding" in FACE.tex) FACE.tex.encoding = T.sRGBEncoding;
    const mat = new T.MeshStandardMaterial({ map: FACE.tex, transparent: true, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    FACE.mesh = new T.Mesh(geo, mat);
    FACE.mesh.name = "AmaiurFace";
    FACE.mesh.renderOrder = 2;
    FACE.mesh.castShadow = false;
    bone.add(FACE.mesh);
    /* aurpegiaren erdigunea, aurrea eta goia hezurraren espazioan (zinemako lehen planoetarako) */
    FACE.bone = bone;
    FACE.cL = new T.Vector3(0, -0.12, 0.9).applyMatrix4(M);
    FACE.fL = new T.Vector3(0, 0, 1).transformDirection(M);
    FACE.uL = new T.Vector3(0, 1, 0).transformDirection(M);
    /* maskararen eskala kanbasean: x ∈ [-W/2, W/2], y ∈ [cy - H/2, cy + H/2] */
    FACE.W = W;
    FACE.H = H;
    FACE.cy = cy;
    faceDraw("open", 0);
  }
  /* sare-koordenatuak (x, y) → kanbasa (px) */
  const fpx = (x) => (x / FACE.W + 0.5) * 512,
    fpy = (y) => (0.5 - (y - FACE.cy) / FACE.H) * 512;
  function faceDraw(eyes, mouth) {
    const key = eyes + ":" + mouth;
    if (key === FACE.state || !FACE.ctx) return;
    FACE.state = key;
    const g = FACE.ctx,
      s = 512 / FACE.W; /* pixel sare-unitate bakoitzeko */
    g.clearRect(0, 0, 512, 512);
    /* masailetako gorrixka */
    for (const sx of [-1, 1]) {
      const gr = g.createRadialGradient(fpx(sx * 0.4), fpy(-0.27), 0, fpx(sx * 0.4), fpy(-0.27), 0.17 * s);
      gr.addColorStop(0, "rgba(232,110,110,0.42)");
      gr.addColorStop(1, "rgba(232,110,110,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(fpx(sx * 0.4), fpy(-0.27), 0.18 * s, 0.11 * s, 0, 0, TAU);
      g.fill();
    }
    /* pikortak (sudurrean eta masailetan) */
    g.fillStyle = "rgba(150,82,52,0.55)";
    for (const [fx, fy, r] of [[-0.3, -0.2, 0.012], [-0.24, -0.25, 0.01], [-0.35, -0.24, 0.009], [-0.19, -0.19, 0.008], [0.3, -0.2, 0.012], [0.24, -0.25, 0.01], [0.35, -0.24, 0.009], [0.19, -0.19, 0.008], [-0.06, -0.17, 0.007], [0.06, -0.17, 0.007]]) {
      g.beginPath();
      g.arc(fpx(fx), fpy(fy), r * s, 0, TAU);
      g.fill();
    }
    /* sudurra: botoi txikia — itzal leun bat azpian eta marra labur bat */
    {
      const nx0 = fpx(0),
        ny0 = fpy(-0.205);
      const gn = g.createRadialGradient(nx0, ny0 + 0.012 * s, 0, nx0, ny0 + 0.012 * s, 0.065 * s);
      gn.addColorStop(0, "rgba(176,92,72,0.34)");
      gn.addColorStop(1, "rgba(176,92,72,0)");
      g.fillStyle = gn;
      g.beginPath();
      g.ellipse(nx0, ny0 + 0.012 * s, 0.065 * s, 0.04 * s, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(138,70,54,0.7)";
      g.lineWidth = 0.013 * s;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(nx0 - 0.024 * s, ny0 + 0.006 * s);
      g.quadraticCurveTo(nx0, ny0 + 0.024 * s, nx0 + 0.024 * s, ny0 + 0.006 * s);
      g.stroke();
      g.fillStyle = "rgba(255,240,228,0.55)";
      g.beginPath();
      g.arc(nx0 + 0.008 * s, ny0 - 0.022 * s, 0.012 * s, 0, TAU);
      g.fill();
    }
    /* bekainak: arku leunak, kanpoaldera meheago */
    g.strokeStyle = "#3b2216";
    g.lineCap = "round";
    for (const sx of [-1, 1]) {
      g.lineWidth = 0.034 * s;
      g.beginPath();
      g.moveTo(fpx(sx * 0.12), fpy(0.17));
      g.quadraticCurveTo(fpx(sx * 0.27), fpy(0.255), fpx(sx * 0.42), fpy(0.18));
      g.stroke();
    }
    /* begiak */
    for (const sx of [-1, 1]) {
      const ex = fpx(sx * 0.255),
        ey = fpy(-0.03),
        rx = 0.115 * s,
        ry = 0.135 * s;
      if (eyes === "closed") {
        /* kliska: betazal itxia, kurba bat eta betile txiki bat */
        g.strokeStyle = "#2a1610";
        g.lineWidth = 0.028 * s;
        g.beginPath();
        g.moveTo(ex - rx, ey);
        g.quadraticCurveTo(ex, ey + ry * 0.55, ex + rx, ey);
        g.stroke();
        continue;
      }
      /* zuria */
      g.fillStyle = "#fbf6ef";
      g.beginPath();
      g.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      g.fill();
      /* irisa: anbar-urre gradientea, ertz iluna */
      const ir = 0.09 * s,
        ix = ex + sx * -0.01 * s,
        iy = ey + 0.012 * s;
      const gi = g.createRadialGradient(ix, iy - ir * 0.3, ir * 0.1, ix, iy, ir);
      gi.addColorStop(0, "#e9b85a");
      gi.addColorStop(0.55, "#9a5a22");
      gi.addColorStop(1, "#4a2610");
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, rx, ry, 0, 0, TAU);
      g.clip();
      g.fillStyle = gi;
      g.beginPath();
      g.arc(ix, iy, ir, 0, TAU);
      g.fill();
      /* begi-nina */
      g.fillStyle = "#1a0d08";
      g.beginPath();
      g.arc(ix, iy, ir * 0.48, 0, TAU);
      g.fill();
      /* goiko betazalaren itzala */
      g.fillStyle = "rgba(90,50,40,0.28)";
      g.fillRect(ex - rx, ey - ry, rx * 2, ry * 0.42);
      g.restore();
      /* distirak */
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(ix - ir * 0.38, iy - ir * 0.42, ir * 0.26, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(ix + ir * 0.3, iy + ir * 0.35, ir * 0.12, 0, TAU);
      g.fill();
      /* goiko betazal-marra lodia eta betile-kizkurra kanpoaldean */
      g.strokeStyle = "#20110b";
      g.lineWidth = 0.03 * s;
      g.beginPath();
      g.ellipse(ex, ey, rx * 1.02, ry * 1.02, 0, PI * 1.08, PI * 1.92);
      g.stroke();
      g.lineWidth = 0.022 * s;
      g.beginPath();
      g.moveTo(ex + sx * rx * 0.92, ey - ry * 0.5);
      g.quadraticCurveTo(ex + sx * rx * 1.25, ey - ry * 0.75, ex + sx * rx * 1.3, ey - ry * 1.05);
      g.stroke();
      /* beheko betazal arina */
      g.strokeStyle = "rgba(120,70,50,0.45)";
      g.lineWidth = 0.012 * s;
      g.beginPath();
      g.ellipse(ex, ey, rx * 0.98, ry * 0.98, 0, PI * 0.2, PI * 0.8);
      g.stroke();
    }
    /* ahoa: irribarre txikia; hitz egitean irekita (mouth 0..1) */
    const mx = fpx(0),
      my = fpy(-0.43),
      mw = 0.12 * s;
    if (mouth > 0.15) {
      const mh = (0.025 + 0.06 * mouth) * s;
      g.fillStyle = "#5a1a1e";
      g.beginPath();
      g.ellipse(mx, my, mw * (0.75 + 0.1 * mouth), mh, 0, 0, TAU);
      g.fill();
      g.fillStyle = "#c8505a";
      g.beginPath();
      g.ellipse(mx, my + mh * 0.45, mw * 0.45, mh * 0.42, 0, 0, TAU);
      g.fill();
    } else {
      g.strokeStyle = "#7a2e2a";
      g.lineWidth = 0.022 * s;
      g.beginPath();
      g.moveTo(mx - mw * 0.75, my - 0.008 * s);
      g.quadraticCurveTo(mx, my + 0.05 * s, mx + mw * 0.75, my - 0.008 * s);
      g.stroke();
    }
    FACE.tex.needsUpdate = true;
  }
  /* fotograma bakoitzean: kliskak (3-5 s-ro, 0.12 s) eta ahoa Amaiurren ahotsarekin */
  function faceUpdate(dt) {
    if (!FACE.mesh) return;
    FACE.blinkT -= dt;
    if (FACE.blinkT <= 0) {
      FACE.blink = 0.12;
      FACE.blinkT = 2.8 + Math.random() * 2.6;
    }
    FACE.blink = Math.max(0, FACE.blink - dt);
    const talking = VOICE.cur && /^AMAIUR/.test(voiceLine(VOICE.cur.id)[0]);
    FACE.mouth = talking ? mix(FACE.mouth, voiceLevel() * 1.4, 0.5) : Math.max(0, FACE.mouth - dt * 4);
    const m = FACE.mouth > 0.6 ? 2 : FACE.mouth > 0.2 ? 1 : 0;
    faceDraw(FACE.force || (FACE.blink > 0 ? "closed" : "open"), m === 0 ? 0 : m === 1 ? 0.5 : 1);
  }
  /* aurpegia munduan: { p: erdigunea, f: aurrera, u: gora } */
  function faceWorld() {
    if (!FACE.bone) return null;
    FACE.bone.updateWorldMatrix(true, false);
    const m = FACE.bone.matrixWorld;
    return { p: FACE.cL.clone().applyMatrix4(m), f: FACE.fL.clone().transformDirection(m), u: FACE.uL.clone().transformDirection(m) };
  }
  /* lehen planoa: kamera aurpegiaren aurrean (dist), goraxeago (up) eta alboan (side) */
  function faceCam(dist, up = 0, side = 0) {
    const F = faceWorld();
    if (!F) return [hero.position.x, hero.position.y + 2, hero.position.z + 2.5];
    const r = new T.Vector3().crossVectors(F.u, F.f),
      q = F.p.clone().addScaledVector(F.f, dist).addScaledVector(F.u, up).addScaledVector(r, side);
    return [q.x, q.y, q.z];
  }
  function faceLook() {
    const F = faceWorld();
    return F ? [F.p.x, F.p.y, F.p.z] : [hero.position.x, hero.position.y + 1.5, hero.position.z];
  }
  /* buruaren "gora": etzanda dagoenean ere aurpegia zuzen ikusteko (film.js-ko up) */
  function faceUp() {
    const F = faceWorld();
    return F ? [F.u.x, F.u.y, F.u.z] : [0, 1, 0];
  }
