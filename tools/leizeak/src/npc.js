  /* ==================================================================
     HERRITARRAK · Herriko jendea (KayKit Adventurers, CC0, kolore propioekin)
     Pello eta Peio (txalapartari bikiak), Maddi (errementaria eta denda),
     Joanes (artzaina: hiru ardi galdu ditu), Kattalin (andre zaharra, Mariren
     istorioak) eta Iratiren oihartzuna (plazan, ia gardena).
     Animazioak: sorginarenak (Rig_Medium bera) eta hezurdurenak (makila-kolpea).
     ================================================================== */
  const NPCS = [];
  const NPC_DEFS = [
    { id: "pello", name: "PELLO", model: "npc_rogue", tint: "#7f9fc9", x: -1.9, z: 28.4, a: 0, area: "herria", hit: true },
    { id: "peio", name: "PEIO", model: "npc_rogue", tint: "#d58b74", x: 1.9, z: 28.4, a: 0, area: "herria", hit: true },
    { id: "irati", name: "IRATI", model: "npc_hooded", ghost: true, x: 0, z: 41, a: PI, area: "herria" },
    { id: "maddi", name: "MADDI", model: "npc_knight", tint: "#e0b48a", noHelmet: true, x: 21, z: 40.5, a: -2.2, area: "herria" },
    { id: "joanes", name: "JOANES", model: "npc_barbarian", tint: "#9fbf86", x: -31, z: 1, a: 0.3, area: "zelaiak" },
    { id: "kattalin", name: "KATTALIN", model: "npc_hooded", tint: "#8a7f9a", x: -15.5, z: 28.5, a: 2.2, area: "herria" },
    { id: "jentil", name: "JENTIL ZAHARRA", model: "npc_barbarian", stone: true, scale: 2.1, x: 46, z: -64, a: -PI / 2, area: "harrespila", y: 9 },
  ];
  const WEAPON_RE = /Axe|Shield|Sword|Crossbow|Knife|Throwable|Mug|Spellbook|Staff|Wand|Hat/;
  function npcMesh(D) {
    const src = models[D.model];
    if (!src) return null;
    const root = cloneSkinned(src.scene);
    root.scale.setScalar(1.15 * (D.scale || 1));
    root.traverse((n) => {
      if (!n.isMesh) return;
      if (WEAPON_RE.test(n.name) || (D.noHelmet && /Helmet/.test(n.name))) n.visible = false;
      n.castShadow = true;
      n.receiveShadow = false;
      n.frustumCulled = false;
      const m = n.material.clone();
      m.skinning = !!n.isSkinnedMesh;
      if (D.ghost) {
        m.transparent = true;
        m.opacity = 0.55;
        m.color = new T.Color("#bfe6ff");
        m.emissive = new T.Color("#4a8fd0");
        m.emissiveIntensity = 0.6;
        m.depthWrite = false;
        n.castShadow = false;
      } else if (D.stone) {
        m.map = null;
        m.color = new T.Color("#62675f");
        m.roughness = 1;
        m.emissive = new T.Color("#ffd38a");
        m.emissiveIntensity = 0.04;
      } else if (D.tint) m.color = new T.Color(D.tint).lerp(new T.Color("#ffffff"), 0.35);
      n.material = m;
    });
    return root;
  }
  function buildNpcs() {
    zoneBuild("ibarra");
    for (const D of NPC_DEFS) {
      const root = npcMesh(D);
      if (!root) continue;
      const g = new T.Group();
      g.add(root);
      g.position.set(D.x, D.y || 0, D.z);
      g.rotation.y = D.a;
      BP.add(g);
      const mixer = new T.AnimationMixer(root),
        acts = {};
      for (const c of models.mage.animations) acts[c.name] = mixer.clipAction(c);
      if (models.skel_minion) for (const c of models.skel_minion.animations) if (/Chop|Taunt/.test(c.name)) acts[c.name] = mixer.clipAction(c);
      const N = { ...D, g, root, mixer, acts, cur: "", t: Math.random() * 3, y: D.y || 0 };
      npcAnim(N, D.stone ? "Idle" : "Idle");
      if (D.stone) mixer.timeScale = 0.25;
      solids.push({ x: D.x, z: D.z, r: D.stone ? 1.6 : 0.6, h: 2, y: N.y, pillar: true });
      if (D.ghost) N.halo = glow(D.x, 1.3, D.z, "#9fd8ff", 4.5);
      NPCS.push(N);
    }
  }
  function npcAnim(N, name, once) {
    const a = N.acts[name];
    if (!a || N.cur === name) return;
    const old = N.acts[N.cur];
    a.reset();
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat);
    a.clampWhenFinished = !!once;
    a.fadeIn(0.2).play();
    if (old) old.fadeOut(0.2);
    N.cur = name;
  }
  function npcsUpdate(dt) {
    if (ZONE.cur !== "ibarra") return;
    for (const N of NPCS) {
      const d = Math.hypot(P.x - N.x, P.z - N.z);
      if (d > 70) continue;
      N.t += dt;
      N.mixer.update(dt);
      /* hurbil bazaude, zuri begira */
      if (d < 7 && !N.stone) {
        const want = Math.atan2(P.x - N.x, P.z - N.z),
          cur = N.g.rotation.y;
        N.g.rotation.y = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, dt * 4);
      } else if (!N.stone) N.g.rotation.y += Math.atan2(Math.sin(N.a - N.g.rotation.y), Math.cos(N.a - N.g.rotation.y)) * Math.min(1, dt * 2);
      /* bikiak: txalaparta jotzen (txandaka), Amaiur hurbil ez dagoenean */
      if (N.hit) {
        const beat = Math.floor((time + (N.id === "peio" ? 0.42 : 0)) / 0.84);
        if (d > 5 && beat !== N.lastBeat) {
          N.lastBeat = beat;
          npcAnim(N, "1H_Melee_Attack_Chop", true);
          N.cur = "";
          if (d < 30 && !TXALA.on && !cinematic) SND.tok(N.id === "pello" ? "L" : "R", false, clamp(1 - d / 30, 0, 1) * 0.6);
        } else if (d <= 5) npcAnim(N, "Idle");
      }
      if (N.ghost) {
        N.g.position.y = 0.25 + Math.sin(time * 1.4) * 0.12;
        N.halo.position.set(N.x, 1.4 + N.g.position.y, N.z);
        N.halo.material.opacity = 0.35 + 0.15 * Math.sin(time * 2);
        if (Math.random() < dt * 3) fxBurst(N.x, 1 + Math.random() * 1.6, N.z, { n: 1, speed: 0.4, up: 0.6, life: 1.2, size: 0.18, color: "#bfe6ff", grav: -0.4, jitter: 0.8 });
      }
    }
  }
  function npcNear() {
    if (ZONE.cur !== "ibarra") return null;
    let best = null,
      bd = 3.4;
    for (const N of NPCS) {
      const d = Math.hypot(P.x - N.x, P.z - N.z);
      if (d < (N.stone ? 5 : bd) && Math.abs(P.y - N.y) < 2.5) {
        best = N;
        bd = d;
      }
    }
    return best;
  }
  /* elkarrizketa eszena gisa (erretratua + idazmakina), bi pertsonen arteko erdian */
  function talk(N, lines, after) {
    const mx = (N.x + P.x) / 2,
      mz = (N.z + P.z) / 2,
      my = Math.max(N.y, P.y);
    say(lines.map(([who, text]) => [who, text, "", mx, mz, my]), after);
  }
  function talkTo(N) {
    const f = (k) => saved.flags.includes(k);
    if (N.id === "pello" || N.id === "peio") return talkTwins(N, f);
    if (N.id === "irati") return talkIrati(N, f);
    if (N.id === "maddi") return talkMaddi(N, f);
    if (N.id === "joanes") return talkJoanes(N, f);
    if (N.id === "kattalin") return talkKattalin(N, f);
    if (N.id === "jentil") return talkJentil(N, f);
  }
  function talkTwins(N, f) {
    if (!saved.rhythms.includes("esnatu"))
      return talk(
        N,
        [
          ["PELLO", "Amaiur! Gauero entzuten dugu: txalapartak bakarrik jotzen du, guk ukitu gabe."],
          ["PEIO", "Erritmo zaharra da. Jentilek harriak esnatzeko erabiltzen zutena."],
          ["PELLO", "Txalaparta bi lagunen hizketa da: batek galdetu, besteak erantzun. Zuk erantzun behar duzu."],
          ["PEIO", "Entzun gure deia, eta errepikatu. Ezkerra eta eskuina."],
        ],
        () =>
          txalaLearn("esnatu", "PELLO ETA PEIO", () => {
            flagSet("esnatu");
            talk(N, [
              ["PEIO", "Horixe! Harrespilako harriak lo daude ibaiaz bestaldean. ESNATU erritmoarekin, eskailera bihurtzen dira."],
              ["PELLO", "Eta Basajaunen leizearen atea… hura ere jentil-harri bat da. Kontuz, sorgin."],
            ]);
            coach("txala", "B", "B: txalaparta jo (ikasitako erritmoak)", "", "useBtn", "TXALAPARTA botoia: ikasitako erritmoak jo", "");
          }),
      );
    if (!f("erronka"))
      return talk(N, [["PEIO", "Prest erronka baterako? Erritmo luzeago bat joko dugu. Errepikatzen baduzu, saria duzu."]], () =>
        dialog(N.name, L("TXALAPARTARIEN ERRONKA"), "", L("Sei kolpeko erritmoa. Lasai: deia behar adina aldiz entzungo duzu."), "", [
          [
            L("ERRONKA ONARTU"),
            () =>
              txalaCall(["L", "R", "L", "L", "R", "R"], "PELLO ETA PEIO", L("Entzun… sei kolpe."), () => {
                flagSet("erronka");
                pieceGet("erronka");
                persist();
              }),
          ],
          [L("GERO"), () => {}],
        ]),
      );
    return talk(N, [[N.name, ["Harrespila ekialdean dago, ibaiaz bestaldean. Harriek gure erritmoa gogoratzen dute.", "Leizean harri-danborrak entzungo dituzu. Haiek ere erantzuna nahi dute.", "Gaua gauekoentzat, eguna egunekoentzat. Hala esaten zuten gure aitonek."][Math.floor(time) % 3]]]);
  }
  function talkIrati(N, f) {
    if (!f("irati1"))
      return talk(
        N,
        [
          ["IRATI", "Amaiur… ez beldurtu. Ez naiz mamua. Oihartzun bat naiz: zuk gogoratzen nauzunean, hemen nago."],
          ["AMAIUR", "Irati! Txalapartak gauez… zu zara?"],
          ["IRATI", "Ez. Deia Marirengandik dator. Mendien andrea isildu egin da, eta haren leizeak itxi."],
          ["IRATI", "Gauekoren itzalak ez ziren guztiz desagertu. Izakiak gaiztotzen ari dira: Basajaun lehena."],
          ["IRATI", "Ikasi erritmoak Pello eta Peiorengandik. Gero, harrespila eta basoa. Ni hemen egongo naiz."],
        ],
        () => flagSet("irati1"),
      );
    if (f("basajaun") && !f("cliff")) return mariCliff();
    if (saved.flags.includes("basajaun"))
      return talk(N, [
        ["IRATI", "Basajaun aske dago. Baina Mariren suzko bola… nork darama? Zerua ere isilik dago."],
        ["IRATI", "Gelditu herrian nahi adina. Beste leizeak itxita jarraitzen dute… oraingoz."],
      ]);
    if (saved.zone === "leizea" || f("leizea"))
      return talk(N, [["IRATI", "Leizeak oihartzun asko ditu. Entzun ondo: batzuek bidea erakusten dute, beste batzuek tranpa."]]);
    if (!saved.rhythms.includes("esnatu")) return talk(N, [["IRATI", "Plazako bikiek erritmo zaharrak dakizkite. Hitz egin haiekin."]]);
    return talk(N, [["IRATI", "Basoa iparraldean dago, ibaiaz bestaldean. Atea jentil-harri bat da: ESNATU."]]);
  }
  function talkMaddi(N) {
    const potions = saved.potions || 0;
    const items = [
      ["botila", L("SENDABELAR-BOTILA"), 30, L("Erortzen zarenean, bizirik itzultzen zaitu. (Gehienez 2)"), () => potions < 2, () => (saved.potions = potions + 1)],
      ["dash", L("AIREKO BULTZADA BIKOITZA"), 60, L("Bi bultzada airean."), () => !saved.boons.includes("dash"), () => saved.boons.push("dash")],
      ["sharp", L("MAKILA ZORROTZA"), 80, L("Izpi hirukoitzek eta INDARRAk +1 kalte."), () => !saved.boons.includes("sharp"), () => saved.boons.push("sharp")],
      ["zatia", L("ARNASA-ZATIA"), 120, L("Lau zatirekin, arnasa bat gehiago."), () => !saved.pieces.includes("denda"), () => pieceGet("denda")],
    ].filter((it) => it[4]());
    talk(N, [["MADDI", saved.coins < 30 ? "Txanponik gabe? Upelak eta kaxak hautsi, eta itzalek ere uzten dituzte." : "Burdina beroa eta prezio hotzak. Zer behar duzu, sorgin?"]], () =>
      dialog(
        "MADDI · ERREMENTARIA",
        L("DENDA") + " · " + saved.coins + " " + L("TXANPON"),
        "",
        items.length ? items.map((it) => it[1] + " — " + it[2] + " · " + it[3]).join("\n\n") : L("Gaur ez daukat ezer gehiago zuretzat."),
        "",
        [
          ...items.map((it) => [
            it[1] + " · " + it[2],
            () => {
              if (saved.coins < it[2]) return notify(L("Ez duzu txanpon nahikorik."), "", 2.4);
              saved.coins -= it[2];
              it[5]();
              updateMaxHp();
              persist();
              SND.coin(true);
              if (it[0] !== "zatia") notify(L("Erosita: ") + it[1], "", 2.6);
              hud();
            },
          ]),
          [L("AGUR"), () => {}],
        ],
      ),
    );
  }
  function talkJoanes(N, f) {
    const home = saved.sheep.length;
    if (!f("ardiak"))
      return talk(
        N,
        [
          ["JOANES", "Basajaun isildu zenetik, ardiak ihesi doaz gauez. Hiru falta zaizkit."],
          ["JOANES", "Bat zelaien ekialdean, bestea ibaiaz bestaldeko larreetan eta azkena… basoan, uste dut."],
          ["JOANES", "Hurbiltzen bazara, zure atzetik etorriko dira. Ekarri itzazu hesira, mesedez."],
        ],
        () => flagSet("ardiak"),
      );
    if (home < 3) return talk(N, [["JOANES", home ? home + " ardi etxean. Beste " + (3 - home) + " falta dira." : "Hesira ekarri, zure atzetik etorriko dira."]]);
    if (!f("ardiak-saria"))
      return talk(N, [["JOANES", "Hirurak etxean! Eskerrik asko, Amaiur. Hartu hau: nire amonak gordetzen zuen."]], () => {
        flagSet("ardiak-saria");
        pieceGet("ardiak");
      });
    return talk(N, [["JOANES", "Ardiak lasai daude orain. Basajaun bizirik balego bezala."]]);
  }
  function talkKattalin(N, f) {
    if (!f("kattalin"))
      return talk(
        N,
        [
          ["KATTALIN", "Mari… Anbotoko andrea. Ostiraletan suzko bola batean ibiltzen zen mendiz mendi."],
          ["KATTALIN", "Zazpi leize ditu, eta bakoitzean zaindari bat. Lehena Basajaunena da, basoan."],
          ["KATTALIN", "Gaueko gauaren jabea da. Gaua gauekoentzat… baina zuk ez diozu beldurrik izan behar, alaba."],
        ],
        () => flagSet("kattalin"),
      );
    return talk(N, [["KATTALIN", ["Harrespilan jentil zahar bat bizi da, harrizkoa. Galdetu iezaiozu Mariri buruz.", "Ostirala da gaur? Ez dakit. Denborak ez du lehengo itxurarik.", "Gure aitonek esaten zuten: izena duen guztia bada."][Math.floor(time) % 3]]]);
  }
  function talkJentil(N, f) {
    if (!f("jentil"))
      return talk(
        N,
        [
          ["JENTIL ZAHARRA", "…Mende asko lo. Zure erritmoak esnatu nau, sorgin txikia."],
          ["JENTIL ZAHARRA", "Gu, jentilak, joan ginen zeruan izar berri bat agertu zenean. Harriak bakarrik geratu ziren."],
          ["JENTIL ZAHARRA", "Leizeetan oihartzunak bizi dira. Hau ere ikasi: ezkutukoa erakusten du."],
        ],
        () => {
          flagSet("jentil");
          const go = () => pieceGet("harrespila");
          if (!saved.rhythms.includes("entzun")) txalaLearn("entzun", "JENTIL ZAHARRA", go);
          else go();
        },
      );
    return talk(N, [["JENTIL ZAHARRA", "Basajaunek basoa zaintzen zuen. Orain itzalak zaintzen du bera. Askatu ezazu."]]);
  }
  /* ardiak: aurkitutakoan Amaiurri jarraitzen diote hesiraino */
  function sheepUpdate(dt) {
    for (const S of HUB.sheep) {
      if (S.home) {
        S.t += dt;
        S.m.position.y = S.y + Math.abs(Math.sin(S.t * 2)) * 0.05;
        S.m.rotation.y = S.i + Math.sin(S.t * 0.3) * 0.6;
        continue;
      }
      const d = Math.hypot(P.x - S.x, P.z - S.z);
      if (!S.follow && saved.flags.includes("ardiak") && d < 4.5 && Math.abs(P.y - S.y) < 3) {
        S.follow = true;
        SND.baa();
        notify(L("Ardiak zure atzetik dator. Eraman hesira!"), "", 2.5);
      }
      if (S.follow) {
        if (d > 2.4) {
          const sp = Math.min(9, d * 2.2);
          S.x += ((P.x - S.x) / d) * sp * dt;
          S.z += ((P.z - S.z) / d) * sp * dt;
          S.m.rotation.y = Math.atan2(P.x - S.x, P.z - S.z) - PI / 2;
        }
        const s = support(S.x, S.z, P.y + 0.5);
        S.y = s ? topY(s, S.x, S.z) : S.y;
        if (Math.hypot(S.x - HUB.pen.x, S.z - HUB.pen.z) < 6.5 && Math.abs(S.y) < 1) {
          S.home = true;
          S.follow = false;
          saved.sheep.push(S.i);
          saved.coins += 5;
          persist();
          SND.baa();
          SND.coin(true);
          fxBurst(S.x, S.y + 1, S.z, { n: 20, speed: 3, up: 2, life: 0.8, size: 0.3, color: "#ffffff", grav: 1 });
          notify(L("Ardia etxean! ") + saved.sheep.length + " / 3 · +5 " + L("txanpon"), "", 3);
          hud();
        }
        if (d > 40) S.follow = false;
      }
      S.t += dt;
      S.m.position.set(S.x, S.y + (S.follow ? Math.abs(Math.sin(S.t * 9)) * 0.15 : 0), S.z);
    }
  }
  /* ---- erretratu berriak (SVG, diseinu propioak) ---- */
  Object.assign(PORTRAITS, {
    aitona:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p2" d="M12 120c4-18 17-27 38-28 21 1 34 10 38 28z"/>' +
      '<ellipse class="p1" cx="50" cy="68" rx="17" ry="20"/>' +
      '<ellipse class="p3" cx="50" cy="46" rx="25" ry="6.5"/><path class="p3" d="M28 47q22-16 44 0z"/><rect class="p3" x="48" y="33" width="3" height="5" rx="1"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="66" rx="2" ry="2.3"/><ellipse class="p4" cx="56.5" cy="66" rx="2" ry="2.3"/></g>' +
      '<path class="p5" d="M38 77q6-5 12-1q6-4 12 1q-6 3-12 1q-6 2-12-1z"/><path class="mouth p4" d="M46 82q4 2 8 0q-4 1-8 0z"/></svg>',
    errementari:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p2" d="M12 120c4-18 17-26 38-27 21 1 34 9 38 27z"/>' +
      '<ellipse class="p1" cx="50" cy="67" rx="16" ry="19.5"/>' +
      '<path class="p3" d="M30 60c1-17 11-24 20-24s19 7 20 24c-6-7-12-10-20-10s-14 3-20 10z"/><path class="p5" d="M32 54q18-9 36 0l-2 4q-16-7-32 0z"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="66" rx="2.1" ry="2.5"/><ellipse class="p4" cx="56.5" cy="66" rx="2.1" ry="2.5"/></g>' +
      '<path class="mouth p4" d="M45.5 78q4.5 2.4 9 0q-4.5 1.1-9 0z"/><circle class="p5" cx="38" cy="73" r="1.4"/></svg>',
    artzain:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p2" d="M10 120c4-19 18-28 40-29 22 1 36 10 40 29z"/>' +
      '<ellipse class="p1" cx="50" cy="66" rx="17.5" ry="20.5"/>' +
      '<path class="p3" d="M33 72q17 22 34 0q-2 16-17 18q-15-2-17-18z"/>' +
      '<ellipse class="p5" cx="50" cy="45" rx="27" ry="6"/><path class="p5" d="M33 45q2-15 17-16q15 1 17 16z"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="63" rx="2.1" ry="2.4"/><ellipse class="p4" cx="56.5" cy="63" rx="2.1" ry="2.4"/></g>' +
      '<path class="mouth p4" d="M46 76q4 2 8 0q-4 1-8 0z"/></svg>',
    amona:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p3" d="M14 120c2-30 14-52 36-56 22 4 34 26 36 56z"/>' +
      '<ellipse class="p1" cx="50" cy="68" rx="15.5" ry="19"/>' +
      '<path class="p3" d="M28 70c-2-24 8-38 22-38s24 14 22 38c-5-14-12-20-22-20s-17 6-22 20z"/>' +
      '<g class="eyes"><path class="p4" d="M41 66q2.5-2 5 0" stroke-width="1.6" fill="none"/><path class="p4" d="M54 66q2.5-2 5 0" stroke-width="1.6" fill="none"/></g>' +
      '<path class="mouth p4" d="M45.5 79q4.5 2.6 9 0q-4.5 1.2-9 0z"/><path class="p5" d="M40 72l-3 2M60 72l3 2" stroke-width="1" fill="none"/></svg>',
    jentil:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="g1" d="M6 120c4-34 18-58 44-60 26 2 40 26 44 60z"/>' +
      '<path class="g1" d="M26 68c-2-26 8-44 24-46 16 2 26 20 24 46-6 10-14 16-24 16s-18-6-24-16z"/>' +
      '<path class="p5" d="M34 44l8 4M66 44l-8 4M44 30l4 6M60 34l-6 5" stroke-width="1.4" fill="none"/>' +
      '<g class="eyes"><ellipse class="g2" cx="41" cy="56" rx="3.6" ry="1.8"/><ellipse class="g2" cx="59" cy="56" rx="3.6" ry="1.8"/></g></svg>',
    basajaun:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="g1" d="M4 120c4-36 20-60 46-62 26 2 42 26 46 62z"/>' +
      '<path class="g1" d="M22 74c-6-30 8-52 28-54 20 2 34 24 28 54-8 14-16 22-28 22s-20-8-28-22z"/>' +
      '<path class="p5" d="M24 34l6 10M38 22l3 12M62 22l-3 12M76 34l-6 10" stroke-width="2.4" fill="none"/>' +
      '<g class="eyes"><ellipse class="g2" cx="40" cy="58" rx="4" ry="2.2"/><ellipse class="g2" cx="60" cy="58" rx="4" ry="2.2"/></g>' +
      '<path class="p5" d="M36 78q14 10 28 0" stroke-width="2" fill="none"/></svg>',
    mari:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><circle class="g2" cx="50" cy="56" r="40" opacity=".35"/>' +
      '<path class="p2" d="M12 120c4-18 17-27 38-28 21 1 34 10 38 28z"/>' +
      '<ellipse class="p1" cx="50" cy="66" rx="15.5" ry="19.5"/>' +
      '<path class="p3" d="M30 64c-2-20 6-32 20-32s22 12 20 32c-4-10-10-16-20-16s-16 6-20 16z"/>' +
      '<path class="g2" d="M34 36q4-14 8-6q4-14 8-2q4-12 8 2q4-8 8 6z"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="65" rx="2" ry="2.4"/><ellipse class="p4" cx="56.5" cy="65" rx="2" ry="2.4"/></g>' +
      '<path class="mouth p4" d="M46 77q4 2 8 0q-4 1-8 0z"/></svg>',
    danbor:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><ellipse class="g1" cx="50" cy="96" rx="34" ry="12"/><rect class="g1" x="16" y="44" width="68" height="52"/>' +
      '<ellipse class="p5" cx="50" cy="44" rx="34" ry="12"/><path class="g2" d="M30 60l10 20M50 58v24M70 60l-10 20" stroke-width="2.4" fill="none"/>' +
      '<g class="eyes"><circle class="g2" cx="40" cy="44" r="2.4"/><circle class="g2" cx="60" cy="44" r="2.4"/></g></svg>',
  });
  const PORTRAIT_OF = { PELLO: "aitona", PEIO: "aitona", "PELLO ETA PEIO": "aitona", MADDI: "errementari", JOANES: "artzain", KATTALIN: "amona", "JENTIL ZAHARRA": "jentil", BASAJAUN: "basajaun", MARI: "mari", "HARRI-DANBORRA": "danbor", IRATI: "radio" };
