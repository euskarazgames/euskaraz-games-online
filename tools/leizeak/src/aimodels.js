  /* ==================================================================
     IA-MODELOAK · etsai nagusien itxura berria (diseinu propioa: Flux → Tripo, fal.ai bidez;
     Blender-ek garbitua eta meshopt-ek trinkotua: tools/leizeak/models/ai/). Behar denean
     kargatzen dira (/assets/models/leizeak/<izena>.glb). Ez badaude, edo ?gfx=0 (EGFX gabe),
     lehengo gorputz prozeduralak bere horretan geratzen dira.
     ================================================================== */
  const AIM = { cache: {}, wait: {}, loader: null };
  function aiModel(name, cb) {
    if (!EG || new URLSearchParams(location.search).get("ia") === "0") return cb && cb(null);
    if (name in AIM.cache) return cb && cb(AIM.cache[name]);
    (AIM.wait[name] ||= []).push(cb);
    if (AIM.wait[name].length > 1) return;
    if (!AIM.loader) {
      AIM.loader = new T.GLTFLoader();
      if (typeof MeshoptDecoder !== "undefined") AIM.loader.setMeshoptDecoder(MeshoptDecoder);
    }
    const done = (sc) => {
      AIM.cache[name] = sc;
      const list = AIM.wait[name];
      AIM.wait[name] = [];
      for (const f of list) f && f(sc);
    };
    AIM.loader.load(
      "/assets/models/leizeak/" + name + ".glb",
      (g) => {
        g.scene.traverse((n) => {
          if (!n.isMesh) return;
          n.castShadow = true;
          n.receiveShadow = false;
        });
        done(g.scene);
      },
      undefined,
      () => done(null),
    );
  }
  /* instantzia bat: materialak propioak (distira, tindua), testura bera argituta (ilunpean irakurgarri) */
  function aiInstance(sc, height, glow = 0.18) {
    const m = sc.clone(true),
      mats = [];
    m.traverse((n) => {
      if (!n.isMesh) return;
      n.material = n.material.clone();
      if (n.material.map) {
        n.material.emissiveMap = n.material.map;
        n.material.emissive = new T.Color("#ffffff");
        n.material.emissiveIntensity = glow;
      }
      mats.push(n.material);
    });
    const box = new T.Box3().setFromObject(m),
      h = box.max.y - box.min.y || 1;
    m.scale.setScalar(height / h);
    return { m, mats };
  }
