  /* ==================================================================
     HORIZONTEA · mundu irekiaren sentsazioa (itsasoz inguratuta)
     Urruneko uharteak (mendixkak, itsaslabarrak, herrixkak eta itsasargiak)
     eta belaontziak: iraganean nabigatzen, orainean izotzean harrapatuta.
     Ez dira ukitzen; lainoak leuntzen ditu (silueta urdinxkak).
     ================================================================== */
  const FAR = { hills: [], boats: [], lamps: [], grass: new T.Color("#6f9a55"), snow: new T.Color("#eef3f7") };
  /* [angelua (gradu), distantzia, erradioa, altuera, mota] — erdigunea: uhartediaren erdia */
  const FAR_DEF = [
    [-150, 235, 34, 20, "village"],
    [-118, 305, 54, 38, ""],
    [-88, 340, 80, 56, "lighthouse"],
    [-58, 292, 44, 28, ""],
    [-24, 335, 62, 42, "village"],
    [8, 262, 38, 24, "lighthouse"],
    [42, 322, 72, 48, ""],
    [76, 290, 50, 32, "village"],
    [112, 345, 92, 60, ""],
    [148, 252, 40, 24, "lighthouse"],
    [180, 305, 58, 34, "village"],
  ];
  function horizonWorld() {
    const cx = -5,
      cz = -75;
    const cliffMat = new T.MeshStandardMaterial({ color: "#6b655c", roughness: 0.95, flatShading: true });
    const hillMat = new T.MeshStandardMaterial({ color: FAR.grass.clone(), roughness: 1, flatShading: true });
    FAR.hillMat = hillMat;
    const houses = [];
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (const [deg, dist, R, H, kind] of FAR_DEF) {
      const a = (deg * PI) / 180,
        x = cx + Math.cos(a) * dist,
        z = cz + Math.sin(a) * dist;
      /* itsaslabarra (oinarria) */
      const cg = new T.CylinderGeometry(R * 0.93, R * 1.02, 11, 22, 2);
      const cp = cg.attributes.position;
      for (let i = 0; i < cp.count; i++) {
        const ang = Math.atan2(cp.getZ(i), cp.getX(i)),
          k = 1 + 0.06 * Math.sin(ang * 5 + deg) + 0.04 * Math.sin(ang * 11 + R);
        cp.setX(i, cp.getX(i) * k);
        cp.setZ(i, cp.getZ(i) * k);
      }
      cg.computeVertexNormals();
      const cliff = new T.Mesh(cg, cliffMat);
      cliff.position.set(x, -9 + 5.5, z);
      scene.add(cliff);
      /* mendixkak (2-3 kupula zaratadun): belarra iraganean, elurra orainean */
      const nh = 2 + (deg % 2 ? 1 : 0);
      for (let k = 0; k < nh; k++) {
        const hr = R * (k ? 0.5 + rnd() * 0.25 : 0.95),
          hh = H * (k ? 0.55 + rnd() * 0.5 : 1),
          ha = rnd() * TAU,
          off = k ? R * (0.3 + rnd() * 0.3) : 0;
        const hg = new T.SphereGeometry(hr, 22, 8, 0, TAU, 0, PI / 2);
        const hp = hg.attributes.position;
        for (let i = 0; i < hp.count; i++) {
          const px = hp.getX(i),
            pz = hp.getZ(i),
            py = hp.getY(i);
          const bump = 1 + 0.24 * Math.sin(px * 0.11 + deg + k) * Math.cos(pz * 0.09 + R) + 0.13 * Math.sin(px * 0.31 + pz * 0.27 + k);
          hp.setY(i, (py / hr) * hh * bump);
        }
        hg.computeVertexNormals();
        const hill = new T.Mesh(hg, hillMat);
        hill.position.set(x + Math.cos(ha) * off, 2, z + Math.sin(ha) * off);
        scene.add(hill);
        FAR.hills.push(hill);
      }
      /* herrixka: etxe zuriak teilatu gorriekin, kostaldearen ondoan */
      if (kind === "village")
        for (let i = 0; i < 9; i++) {
          const ha = a + PI + (rnd() - 0.5) * 1.4,
            hr = R * (0.45 + rnd() * 0.35),
            hx = x + Math.cos(ha) * hr,
            hz = z + Math.sin(ha) * hr,
            hy = 2 + H * Math.sqrt(Math.max(0, 1 - (hr / (R * 0.95)) ** 2)) * 0.92;
          houses.push([hx, hy, hz, 2.6 + rnd() * 1.6, rnd() * PI]);
        }
      /* itsasargia: dorre zuria, banda gorria eta argia */
      if (kind === "lighthouse") {
        const la = a + PI,
          lx = x + Math.cos(la) * R * 0.62,
          lz = z + Math.sin(la) * R * 0.62,
          ly = 2 + H * Math.sqrt(1 - 0.62 * 0.62) * 0.9;
        const tower = new T.Mesh(new T.CylinderGeometry(1.5, 2.1, 15, 12), new T.MeshStandardMaterial({ color: "#f2efe8", roughness: 0.7 }));
        tower.position.set(lx, ly + 7.5, lz);
        const band = new T.Mesh(new T.CylinderGeometry(1.62, 1.75, 3, 12), new T.MeshStandardMaterial({ color: "#c0392b", roughness: 0.6 }));
        band.position.set(lx, ly + 9, lz);
        scene.add(tower, band);
        const lamp = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: "#fff2c4", transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
        lamp.position.set(lx, ly + 16.2, lz);
        lamp.scale.setScalar(9);
        scene.add(lamp);
        FAR.lamps.push(lamp);
      }
    }
    /* etxeak: InstancedMesh bakarra hormentzat eta beste bat teilatuentzat */
    if (houses.length) {
      const walls = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1.3), new T.MeshStandardMaterial({ color: "#f4efe6", roughness: 0.8 }), houses.length),
        roofs = new T.InstancedMesh(new T.ConeGeometry(0.95, 0.8, 4), new T.MeshStandardMaterial({ color: "#b5462e", roughness: 0.7, flatShading: true }), houses.length);
      const m = new T.Matrix4(),
        q = new T.Quaternion(),
        sv = new T.Vector3(),
        pv = new T.Vector3();
      houses.forEach(([hx, hy, hz, s, rot], i) => {
        q.setFromAxisAngle(new T.Vector3(0, 1, 0), rot);
        m.compose(pv.set(hx, hy + s * 0.5, hz), q, sv.setScalar(s));
        walls.setMatrixAt(i, m);
        q.setFromAxisAngle(new T.Vector3(0, 1, 0), rot + PI / 4);
        m.compose(pv.set(hx, hy + s * 1.38, hz), q, sv.set(s * 1.05, s, s * 1.3));
        roofs.setMatrixAt(i, m);
      });
      scene.add(walls, roofs);
    }
    /* belaontziak: uhartediaren inguruan */
    const hull = new T.Shape();
    hull.moveTo(-2.7, 0.9);
    hull.lineTo(2.9, 0.9);
    hull.lineTo(2.1, -0.4);
    hull.lineTo(-2.2, -0.4);
    hull.closePath();
    const hullGeo = new T.ExtrudeGeometry(hull, { depth: 1.7, bevelEnabled: false });
    hullGeo.translate(0, 0, -0.85);
    hullGeo.rotateY(PI / 2);
    const sailGeo = new T.BufferGeometry();
    sailGeo.setAttribute("position", new T.Float32BufferAttribute([0, 1.1, 0.25, 0, 6.2, 0.25, 0, 1.3, 2.6], 3));
    sailGeo.computeVertexNormals();
    const hullMat = new T.MeshStandardMaterial({ color: "#7a4f32", roughness: 0.8 }),
      mastMat = new T.MeshStandardMaterial({ color: "#5a3c26" });
    const sailCols = ["#f5efe2", "#e9d5b0", "#f5efe2", "#d9534f", "#f5efe2", "#e7c27a"];
    for (let i = 0; i < 6; i++) {
      const g = new T.Group();
      g.add(new T.Mesh(hullGeo, hullMat));
      const mast = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 6, 5), mastMat);
      mast.position.set(0, 3.6, 0.2);
      g.add(mast);
      g.add(new T.Mesh(sailGeo, new T.MeshStandardMaterial({ color: sailCols[i], side: T.DoubleSide, roughness: 0.9 })));
      g.scale.setScalar(1.6);
      scene.add(g);
      FAR.boats.push({ g, u: (i / 6) * TAU + 0.3, rx: 98 + (i % 3) * 14, rz: 152 + (i % 2) * 18, sp: 0.011 + (i % 3) * 0.003, bob: i * 1.7 });
    }
    horizonUpdate(0);
  }
  function horizonUpdate(dt) {
    const b = phaseBlend,
      live = 1 - b;
    if (FAR.hillMat) FAR.hillMat.color.copy(FAR.grass).lerp(FAR.snow, b);
    for (const B of FAR.boats) {
      /* iraganean nabigatzen; orainean izotzean harrapatuta (geldirik eta okertuta) */
      B.u += dt * B.sp * live;
      const x = -5 + Math.cos(B.u) * B.rx,
        z = -75 + Math.sin(B.u) * B.rz;
      B.g.position.set(x, -8.45 + Math.sin(time * 1.3 + B.bob) * 0.18 * live - 0.35 * b, z);
      B.g.rotation.y = Math.atan2(-Math.sin(B.u) * B.rx, Math.cos(B.u) * B.rz);
      B.g.rotation.z = Math.sin(time * 0.9 + B.bob) * 0.06 * live + 0.13 * b;
    }
    for (const l of FAR.lamps) l.material.opacity = 0.55 + 0.4 * Math.max(0, Math.sin(time * 1.6 + l.position.x));
  }
