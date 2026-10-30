  /* ==================================================================
     HARANEKO MISTERIOAK · leizeetako tresnekin itzultzeko sekretuak
     · SASI-HABIA (ipar-mendebaldeko larreak): sasi itxien barruan kutxa bat
       distiraka. Egurra bezala, sasiak ere SUAk erretzen ditu.
     · HARRI-ZUTABEA (arroila): ibaiaren erdian, gailurrean suge-eraztun bat:
       KATEAz igo.
     · ERROTA ZAHARRA (ekialdeko zelaiak): haize-errota geldia; HAIZE-ADARRAz
       biratuta, lurreko ate-tranpa irekitzen da.
     · DORRE ZAHARRA (ekialdeko larreak): hegoaldeko horma heuraz; IRAGANEAN igo.
     · JENTIL-HARRIA (mendebaldea): harri arrakalatua; TXIMISTARRIAz apurtu.
     Bakoitza egunkarian agertzen da ikusten denean (pista batekin).
     ================================================================== */
  const SECRETS = [];
  function secretsInit() {
    zoneBuild("ibarra");
    /* --- SASI-HABIA (SUA) --- */
    {
      const x = -62,
        z = -76,
        y = nightGround(x, z, 20),
        id = "s-sasia",
        g = new T.Group(),
        parts = [],
        cols = ["#2f3d22", "#46532c", "#5a4630"];
      g.position.set(x, y, z);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU,
          r = i % 2 ? 2.1 : 1.6,
          bx = Math.cos(a) * r,
          by = 0.6 + (i % 3) * 0.35,
          bz = Math.sin(a) * r;
        parts.push([at(new T.IcosahedronGeometry(0.85 + (i % 3) * 0.2, 0), bx, by, bz, i, i * 2, 0, 1, 0.85, 1), cols[i % 3]]);
        for (let k = 0; k < 3; k++) parts.push([at(new T.ConeGeometry(0.06, 0.4, 4), bx * 1.25 + Math.sin(i + k) * 0.3, by + 0.3 + k * 0.2, bz * 1.25 + Math.cos(i * 2 + k) * 0.3, Math.sin(i + k), 0, Math.cos(i * k)), "#3f4a2a"]);
      }
      /* goiko sasi-kupula (gainetik ere ezin) */
      parts.push([at(new T.IcosahedronGeometry(1.7, 1), 0, 1.9, 0, 0, 0, 0, 1.25, 0.55, 1.25), cols[0]]);
      const bush = new T.Mesh(mergeColored(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
      bush.castShadow = true;
      g.add(bush);
      BP.add(g);
      const done = isCleared(id),
        solid = { x, z, r: done ? -1 : 2.7, h: 3.2, y, pillar: true };
      solids.push(solid);
      g.visible = !done;
      const C = chest("h-sasia", x, y, z, 2.4, { t: "piece", id: "sasia" });
      const B = {
        kind: "sasia",
        x,
        y,
        z,
        m: g,
        r: 2.8,
        broken: done,
        buildZone: BP,
        fireOnly: true,
        hint: L("Sasi lodiak, arantzaz beteak. Sorginkeria arruntak ez ditu erretzen… SUA behar da."),
        solid: { r: 0 },
        hitTest: (bx, by, bz, r) => by < y + 3.4 && Math.hypot(bx - x, bz - z) < 2.8 + r,
        custom: () => {
          g.visible = false;
          solid.r = -1;
          if (!saved.cleared.includes(id)) saved.cleared.push(id);
          persist();
          SND.flame();
          for (let i = 0; i < 8; i++) fxBurst(x + Math.cos(i) * 1.8, y + 1 + (i % 3) * 0.5, z + Math.sin(i) * 1.8, { n: 14, speed: 3, up: 4, life: 1.1, size: 0.42, color: i % 2 ? "#ff7a2a" : "#ffd166", grav: -2 });
          notify(L("Sasiak erre dira! Barruan, kutxa bat."), "", 3);
        },
      };
      BREAKABLES.push(B);
      SECRETS.push({ id: "sasia", x, z, y, r: 12, name: L("Sasi-habia"), hint: L("Sasien barruan zerbait distiratzen du. SUA behar da (Tartaloren koban)."), see: L("Sasi itxien barruan, distira bat… Egurra bezala, sasiak ere erretzen dira."), done: () => saved.chests.includes("h-sasia"), chest: C });
    }
    /* --- HARRI-ZUTABEA (KATEA) --- */
    {
      const x = 75,
        z = -24,
        top = 7,
        g = new T.Group(),
        col = new T.Mesh(new T.CylinderGeometry(1.35, 1.75, top + 4, 9, 4), stackMaterial());
      col.position.y = (top - 4) / 2;
      col.castShadow = col.receiveShadow = true;
      g.add(col);
      const cap = new T.Mesh(new T.CylinderGeometry(1.45, 1.35, 0.4, 9), rockMaterial());
      cap.position.y = top - 0.2;
      g.add(cap);
      g.position.set(x, 0, z);
      BP.add(g);
      solids.push({ x, z, r: 1.6, h: top + 4, y: -4, pillar: true });
      platforms.push({ x, z, y: top, bottom: top - 0.5, w: 2.8, d: 2.8, phase: -1, safe: true });
      serpentRing(x, top + 2.6, z + 0.5, 0);
      const C = chest("h-zutabea", x, top, z - 0.75, PI, { t: "piece", id: "zutabea" });
      SECRETS.push({ id: "zutabea", x, z, y: 0, r: 16, name: L("Harri-zutabea"), hint: L("Ibaiaren erdiko zutabean kutxa bat. Gainean suge-eraztuna: KATEA."), see: L("Harri-zutabe bat ibaiaren erdian, eta goian… suge-eraztun bat."), done: () => saved.chests.includes("h-zutabea"), chest: C });
    }
    /* --- ERROTA ZAHARRA (HAIZE-ADARRA) --- */
    {
      const x = 62,
        z = 12,
        y = nightGround(x, z, 20),
        id = "s-errota",
        tower = new T.Mesh(new T.CylinderGeometry(1.25, 1.55, 5, 10), material("#cfc6b4")),
        roof = new T.Mesh(new T.ConeGeometry(1.7, 1.6, 10), material("#7a3b2a"));
      tower.position.set(x, y + 2.5, z);
      roof.position.set(x, y + 5.8, z);
      for (const m of [tower, roof]) {
        m.castShadow = true;
        BP.add(m);
      }
      solids.push({ x, z, r: 1.55, h: 6.5, y, pillar: true });
      /* ate-tranpa lurrean (errotaren aurrean) */
      const hatch = new T.Mesh(new T.BoxGeometry(1.6, 0.14, 1.6), material("#5a3c26"));
      hatch.position.set(x, y + 0.07, z + 3.4);
      BP.add(hatch);
      const C = chest("h-errota", x, y, z + 3.4, PI, { t: "piece", id: "errota" }, { hidden: !isCleared(id) });
      if (isCleared(id)) hatch.visible = false;
      fan(x, y + 3.6, z + 1.35, 0, {
        range: 16,
        onSpin: (on) => {
          if (!on || isCleared(id)) return;
          saved.cleared.push(id);
          persist();
          hatch.visible = false;
          revealChest(C);
          SND.wake();
          shake(0.2);
          notify(L("Errotak biraka: lurreko ate-tranpa ireki da!"), "", 3);
        },
      });
      SECRETS.push({ id: "errota", x, z, y, r: 12, name: L("Errota zaharra"), hint: L("Errota zahar geldia ekialdeko zelaietan. Haizeak ahaztu du: HAIZE-ADARRA."), see: L("Errota zahar bat, geldi. Haizeak ahaztu du…"), done: () => saved.chests.includes("h-errota"), chest: C });
    }
    /* --- DORRE ZAHARRA (HEURA: iraganean igo) --- */
    {
      const x = 80,
        z = -72,
        y0 = nightGround(x, z, 20),
        top = y0 + 10,
        t = slab({ x, z, y: top, w: 5, d: 5, h: top + 1 });
      t.slick = true;
      t.m.material = stackMaterial();
      const merl = [];
      for (let i = 0; i < 4; i++)
        for (const s of [-1, 1]) {
          const o = -1.9 + i * 1.27;
          merl.push([at(new T.BoxGeometry(0.75, 0.9, 0.75), o, 0.45, s * 2.15), "#8c877c"]);
          merl.push([at(new T.BoxGeometry(0.75, 0.9, 0.75), s * 2.15, 0.45, o), "#8c877c"]);
        }
      const crown = new T.Mesh(mergeColored(merl), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
      crown.position.set(x, top, z);
      crown.castShadow = true;
      BP.add(crown);
      ivySide(t, "s", y0, { phase: 0, id: "dorrea-heura" });
      const C = chest("h-dorrea", x, top, z - 0.6, PI, { t: "piece", id: "dorrea" });
      SECRETS.push({ id: "dorrea", past: true, x, z, y: y0, r: 15, name: L("Dorre zaharra"), hint: L("Dorre zaharra heuraz jantzita: IRAGANEAN, heura bizirik dagoenean, igo daiteke. Goian, kutxa bat."), see: L("Dorre zahar bat, heuraz jantzita… goian zerbaitek distira egiten du."), done: () => saved.chests.includes("h-dorrea"), chest: C });
    }
    /* --- JENTIL-HARRIA (TXIMISTARRIA) --- */
    {
      const x = -50,
        z = -6,
        y = nightGround(x, z, 20),
        C = chest("h-harkaitza", x, y, z, 0.3, { t: "piece", id: "harkaitza" }, { hidden: !isCleared("s-harkaitza") });
      crackRock("s-harkaitza", x, y, z, 2.2, {
        onBreak: () => {
          revealChest(C);
          notify(L("Jentil-harria apurtu da: azpian, kutxa bat!"), "", 3);
        },
      });
      SECRETS.push({ id: "harkaitza", x, z, y, r: 13, name: L("Jentil-harria"), hint: L("Jentil batek jaurtitako harri arrakalatua: TXIMISTA batek apurtuko luke (Jentilbaratzan)."), see: L("Harri erraldoi bat, arrakalatua. Kondairak dio jentil batek jaurti zuela mendi batetik…"), done: () => saved.chests.includes("h-harkaitza"), chest: C });
    }
  }
  /* hubUpdate-tik: hurbiltzean pista (eta egunkarian sartu) */
  function secretsUpdate() {
    for (const S of SECRETS) {
      if (S.done() || Math.hypot(P.x - S.x, P.z - S.z) > S.r) continue;
      const k = "m-" + S.id;
      if (!saved.flags.includes(k)) {
        saved.flags.push(k);
        persist();
        notify(S.see, "", 4.5);
      }
    }
  }
  /* egunkarirako lerroak */
  function secretsLog(line) {
    return SECRETS.filter((S) => (saved.flags.includes("m-" + S.id) && (!S.past || eraOpen())) || S.done()).map((S) => line(S.done(), S.name, "", S.hint));
  }
