  /* ==================================================================
     ANBOTOKO HARPEAK · sigilu-leizea (diseinu propioa), ANBOTOren gailurraren aurrean
     Gauekoren ekaitzak Andereren suzko bola bota du mendi-magalean: Amaiurrek mendiaren barrutik
     igo behar du, Gauekoren itzal-zaindarien artean, ikusia izan gabe (sigiloa.js).
       A Suzko bolaren zuloa ... lurreratzea; Iratiren deia (oihartzun-radarra)
       B Zaintza-gela .......... zaindari bat joan-etorrian: itxaron eta pasatu bizkarretik
       C Kutxen harpea ......... bi zaindari eta begi-harri bat: TOK-TOK eta LOTARAZI
       D Hari-pasabidea ........ izotz-hariak (orainean): jauzi edo iraganera
       E Gauekoren ataria ...... bi zaindari, begi-harria eta atea → GAILURRA (anboto.js)
     Gela bakoitza kontrol-puntu bat da. Kamera: GOITIK eta HORMA (kamera.js); C eta E garaiago (gela
     osoa), D baxuago (harien altuera irakurgarri). BEGIRATU (lehen pertsona) leku guztietan.
     Probetan: window.__game.HK, harpeakStart(), harpeakEnd().
     ================================================================== */
  const KX = 3300;
  ZONES.harpeak = { name: "ANBOTOKO HARPEAK", outdoor: false, fallY: -9.3, platforms: [], phaseObjects: [], solids: [], hazards: [], group: null };
  const DGK = {
    id: "harpeak",
    num: "08",
    entry: { x: KX, y: 0, z: 5, a: PI },
    /* atzera bueltarik ez (ekaitza): irteera-arkua erabili gabe */
    exitArch: { x: KX, z: 900 },
    exitTo: () => ({ x: 0, y: 0, z: 41, a: 0, cp: true }),
    bigKey: "",
    bossDoor: "",
    lights: [],
    torches: [],
    rooms: {},
    torchCol: ["#ffb36b", "#9fb8ff"],
    /* mendiaren barrua: harri iluna eta hotza (piezen kolorea) */
    tint: "#7f8aa6",
    fog: [12, 72],
    update: (dt) => harpeakUpdate(dt),
  };
  const HK = { defs: [], gate: null, called: [], embers: [], t0: 0, gateWarn: 0, exitZ: -166.5, ending: false };
  /* gela bakoitzaren sarrera (kontrol-puntua) eta Iratiren deia */
  const HK_ROOMS = {
    hB: { cp: [KX, -20.5], call: ["hp_i2", "hp_i3"] },
    hC: { cp: [KX + 6, -56.5], call: ["hp_i4", "hp_i5"] },
    hD: { cp: [KX - 6, -98.5], call: ["hp_i6"] },
    hE: { cp: [KX - 6, -134.5], call: ["hp_i7"] },
  };
  function buildHarpeak() {
    dungeonBegin(DGK);
    const E = (x) => KX + x;
    /* ---- A: suzko bolaren zuloa ---- */
    room("hkA", E(0), 0, 30, 24, { area: "hA", name: "SUZKO BOLAREN ZULOA", desc: "Ekaitzak hemen bota zaitu. Mendiaren barrua: Gauekoren bidea.", doors: { n: 0 }, fog: [10, 60] });
    for (const [x, z, s, r] of [[E(-4), 3, 0.7, 0.3], [E(5), 1, 0.9, 1.4], [E(-9), -4, 0.6, 2.1], [E(8), -6, 0.55, 0.8], [E(1), 8, 0.6, 2.6]]) bprop(s > 0.65 ? "rubble_large" : "rubble_half", x, 0, z, DS * s, r);
    /* zuloa sabaian: ekaitzaren argia goitik */
    const shaft = obj(new T.CylinderGeometry(1.6, 2.6, 14, 16, 1, true), new T.MeshBasicMaterial({ color: "#9fb8ff", transparent: true, opacity: 0.04, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    shaft.position.set(E(0), 7, 3);
    shaft.castShadow = false;
    HK.shaft = shaft;
    /* lurrean, ekaitzaren argi-orbana */
    const pool = obj(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: glowTexture, color: "#9fb8ff", transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -PI / 2;
    pool.position.set(E(0), 0.05, 3);
    pool.castShadow = false;
    HK.pool = pool;
    for (const [x, z] of [[E(-1.5), 4.5], [E(1.8), 2.4], [E(0.4), 5.8], [E(-2.6), 1.6]]) HK.embers.push({ x, z, fl: glow(x, 0.4, z, "#ff9a4a", 1.6), ph: x * 3 + z });
    /* suzko bolaren arrastoa: lur erre bat */
    const scorch = obj(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: glowTexture, color: "#000000", transparent: true, opacity: 0.7, depthWrite: false }));
    scorch.rotation.x = -PI / 2;
    scorch.position.set(E(0), 0.03, 3.4);
    scorch.castShadow = false;
    bprop("banner_patternB_red", E(-9), 0, -11.2, DS * 0.8, 0);
    bprop("banner_patternB_red", E(9), 0, -11.2, DS * 0.8, 0);
    corridor(E(0), -15, 6, 6, "z");
    /* ---- B: zaintza-gela (zaindari bat joan-etorrian) ---- */
    const B = room("hkB", E(0), -33, 30, 30, { area: "hB", name: "ZAINTZA-GELA", desc: "Kriseilu bat, joan-etorrian. Haren argia, haren begirada.", doors: { s: 0, n: 6 }, fog: [11, 64] });
    for (const [x, z] of [[E(-7), -40], [E(7), -40]]) {
      bprop("pillar_decorated", x, 0, z, DS * 0.9, 0);
      solids.push({ x, z, r: 1.3, h: 6, y: 0, pillar: true });
    }
    hkHide(E(-12.2), -21.5, 2);
    hkHide(E(12.4), -44.8, 2);
    HK.defs.push({ x: E(-10), z: -30, a: PI / 2, room: B, path: [[E(-10), -30, 2.6, 0], [E(10), -30, 2.6, 0]] });
    corridor(E(6), -51, 6, 6, "z");
    /* ---- C: kutxen harpea (bi zaindari, begi-harria) ---- */
    const C = room("hkC", E(0), -72, 30, 36, { area: "hC", name: "KUTXEN HARPEA", desc: "Itzalak eta harrizko begi bat. Hormek hitz egiten dute: TOK-TOK.", doors: { s: 6, n: -6 }, fog: [11, 66], cam: { pitch: 1.06, d: 24.5 } });
    for (const [x, z] of [[E(-7), -64], [E(7), -64], [E(-7), -80], [E(7), -80]]) coverBlock(x, z, 6, 1.4, 2.4, 0, "crates");
    for (const [x, z, r] of [[E(-13), -60, 0.4], [E(13.2), -75, 1.2], [E(-12.8), -71, 2.2]]) bprop("barrel_large", x, 0, z, DS * 0.75, r);
    hkHide(E(-12.6), -56.8, 2);
    hkHide(E(12.6), -87.2, 2);
    HK.defs.push({ x: E(-11), z: -58, a: PI / 2, room: C, path: [[E(-11), -58, 1.6, PI / 2], [E(11), -58, 1.6, PI], [E(11), -86, 1.6, -PI / 2], [E(-11), -86, 1.6, 0]] });
    /* iparreko atearen zaindaria: ez da mugitzen (TOK-TOK hotsera bakarrik) */
    HK.eyeC = sigEye({ x: E(0), z: -72, base: 0, sweep: 1.25, sp: 0.42, range: 10.5, fov: 0.3 });
    HK.defs.push({ x: E(-6), z: -85.6, a: 0, room: C, path: [[E(-6), -85.6, 9, 0]] });
    corridor(E(-6), -93, 6, 6, "z");
    /* ---- D: hari-pasabidea (izotz-hariak orainean) ---- */
    const D = room("hkD", E(-6), -111, 18, 30, { area: "hD", name: "HARI-PASABIDEA", desc: "Izotz-hariak, orainean bakarrik. Iraganean, bidea libre.", doors: { s: 0, n: 0 }, fog: [10, 60], cam: { pitch: 0.74, d: 18.5 } });
    for (const [z, y] of [[-102, 0.75], [-110, 1.5], [-118, 0.75]]) sigThread(E(-14.2), z, E(2.2), z, y);
    for (const [x, z] of [[E(-14.4), -106], [E(2.4), -114]]) hkHide(x, z, 1.6);
    HK.defs.push({ x: E(-1), z: -100, a: PI, room: D, range: 8.5, path: [[E(-1), -100, 2, PI], [E(-1), -122, 2, 0]] });
    corridor(E(-6), -129, 6, 6, "z");
    /* ---- E: Gauekoren ataria ---- */
    const Ee = room("hkE", E(0), -147, 30, 30, { area: "hE", name: "GAUEKOREN ATARIA", desc: "Atea, gailurrera. Begirada guztiak hemen.", doors: { s: -6, n: 0 }, fog: [12, 70], cam: { pitch: 1.08, d: 25 } });
    for (const [x, z] of [[E(-5), -147], [E(5), -147]]) {
      bprop("pillar_decorated", x, 0, z, DS * 0.9, 0);
      solids.push({ x, z, r: 1.3, h: 6, y: 0, pillar: true });
    }
    hkHide(E(-12.6), -150, 2);
    hkHide(E(12.6), -136, 1.8);
    HK.defs.push({ x: E(-11), z: -140, a: PI / 2, room: Ee, path: [[E(-11), -140, 2, PI / 2], [E(11), -140, 2, -PI / 2]] });
    HK.defs.push({ x: E(8), z: -155, a: 0, room: Ee, path: [[E(8), -155, 3.2, 0], [E(-8), -155, 3.2, 0]] });
    HK.eyeE = sigEye({ x: E(12), z: -158, base: -PI / 2 - 0.35, sweep: 0.75, sp: 0.5, ph: 1.2, range: 12, fov: 0.28 });
    HK.gate = door("hE-n", E(0), -162, 0, 0, "bars", "hkE");
    corridor(E(0), -165, 6, 6, "z");
    /* gailurrerako argia */
    const up = obj(new T.CylinderGeometry(2.6, 2.6, 16, 14, 1, true), new T.MeshBasicMaterial({ color: "#ffd9a8", transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    up.position.set(E(0), 8, -166.5);
    up.castShadow = false;
    HK.up = up;
    dungeonEnd(DGK);
  }
  /* ITZAL-ZOKOA: ilunpe-orban bat lurrean (ezkutalekua) */
  function hkHide(x, z, r) {
    const m = obj(new T.PlaneGeometry(r * 2.4, r * 2.4), new T.MeshBasicMaterial({ map: glowTexture, color: "#000000", transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -PI / 2;
    m.position.set(x, 0.04, z);
    m.castShadow = false;
    const rim = obj(new T.RingGeometry(r * 0.94, r, 32), new T.MeshBasicMaterial({ color: "#7fb8e6", transparent: true, opacity: 0.18, depthWrite: false }));
    rim.rotation.x = -PI / 2;
    rim.position.set(x, 0.05, z);
    SIG.hides.push({ x, z, r, zone: "harpeak" });
  }
  /* ------------------------------ sarrera eta eguneraketa ------------------------------ */
  function harpeakEntered(id) {
    if (id !== "harpeak") return;
    SIG.hides = SIG.hides.filter((h) => h.zone === "harpeak");
    sigStart("harpeak", HK.defs);
  }
  function harpeakUpdate(dt) {
    if (SIG.zone !== "harpeak") harpeakEntered("harpeak");
    /* mendiaren barrua: ilunagoa (zuziak, kriseiluak eta Amaiurren argia bakarrik) — itzalak garrantzitsu */
    ambient.intensity = 0.24;
    sun.intensity = 0.26;
    playerLight.intensity = 1.6;
    for (const e of HK.embers) e.fl.material.opacity = 0.45 + Math.sin(time * 9 + e.ph) * 0.15;
    /* ekaitza goian: tximisten distira zulotik */
    HK.flash = Math.max(0, (HK.flash || 0) - dt * 2.5);
    if (Math.random() < dt * 0.08) HK.flash = 1;
    if (HK.shaft) HK.shaft.material.opacity = 0.035 + HK.flash * 0.12;
    if (HK.pool) HK.pool.material.opacity = 0.3 + HK.flash * 0.5;
    if (HK.up) HK.up.material.opacity = 0.1 + Math.sin(time * 1.6) * 0.03;
    /* gela berria: kontrol-puntua eta (behin) Iratiren deia */
    const R = HK_ROOMS[AREA.cur];
    if (R && !HK.called.includes(AREA.cur) && !cinematic && !FILM.on) {
      HK.called.push(AREA.cur);
      saved.cp = { zone: "harpeak", x: R.cp[0], y: 0, z: R.cp[1] };
      persist();
      if (!(CALL_TEST && !window.__calls)) setTimeout(() => ZONE.cur === "harpeak" && !RING.on && SIG.phase !== 1 && deiaRing("IRATI", R.call, null, 5), 900);
    }
    /* irakaspenak: TOK-TOK hormaren ondoan, LOTARAZI zaindari baten atzean */
    if (frame % 20 === 0 && !cinematic) {
      const A = sigActionNear();
      if (A && A.label === L("LOTARAZI")) coach("lotarazi", "E", "LOTARAZI: atzetik, oharkabean — E", "", "useBtn", "LOTARAZI: atzetik, oharkabean — EKIN", "");
      else if (A && AREA.cur === "hC") coach("tok", "E", "TOK-TOK: hormaren ondoan, E — zaindaria hotsera dator", "", "useBtn", "TOK-TOK: hormaren ondoan, EKIN — zaindaria hotsera", "");
    }
    /* atea: hurbiltzean irekitzen da, alarman ez */
    const G = HK.gate;
    if (G && !G.open && Math.hypot(P.x - G.x, P.z - G.z) < 5.5) {
      if (SIG.phase === 1) {
        if (time - HK.gateWarn > 6) {
          HK.gateWarn = time;
          notify("Atea ez da irekiko… ikusten zaituzten bitartean.", "", 3);
        }
      } else {
        openDoor(G);
        SND.echo(0.6);
      }
    }
    /* irteera: gailurrera */
    if (!HK.ending && P.z < HK.exitZ && Math.abs(P.x - KX) < 3.2) harpeakEnd();
  }
  /* ------------------------------ istorioa ------------------------------ */
  /* ANBOTOra bidean (anbotoFlight): Gauekoren ekaitzak suzko bola bota du */
  function harpeakStart() {
    HK.called.length = 0;
    HK.ending = false;
    HK.t0 = time;
    SIG.alarms = SIG.sleeps = SIG.knocks = 0;
    saved.cp = { zone: "harpeak", x: DGK.entry.x, y: 0, z: DGK.entry.z };
    enterZone("harpeak", { ...DGK.entry, cp: true }, true);
    const E = (x) => KX + x;
    film(
      [
        {
          d: 3.6,
          fade: "in",
          cap: ["ANBOTOKO HARPEAK", "MENDIAREN BARRUA · 04:12"],
          cam: [[E(9), 13, 13], [E(6), 9, 10]],
          look: [[E(0), 0.5, 3], [E(0), 1, 3]],
          on: () => {
            shake(0.5);
            SND.thunder && SND.thunder();
            fxBurst(E(0), 1, 3, { n: 60, speed: 7, up: 4, life: 1.2, size: 0.4, color: "#ffb347", grav: 5 });
            animate("Jump_Land");
          },
        },
        { d: 4.6, say: "hp_n1", cam: [[E(-4), 2, 9], [E(-3), 3.5, 8]], look: [E(0), 6, -2] },
        { d: 4.2, say: "hp_a1", key: "#ffd9b0", cam: [() => faceCam(2.2, 0.3, 0.5), () => faceCam(1.6, 0.2, 0.25)], look: [faceLook, faceLook] },
      ],
      () => {
        animate("Idle");
        hud();
        if (!(CALL_TEST && !window.__calls)) setTimeout(() => ZONE.cur === "harpeak" && deiaRing("IRATI", ["hp_i1"], null, 3), 700);
      },
    );
  }
  function harpeakEnd() {
    if (HK.ending) return;
    HK.ending = true;
    const secs = Math.round(time - HK.t0),
      rank = SIG.alarms === 0 ? "ITZALA" : SIG.alarms <= 2 ? "OIHARTZUNA" : "EKAITZA";
    flagSet("harpeak");
    saved.harpeak = { alarms: SIG.alarms, sleeps: SIG.sleeps, knocks: SIG.knocks, secs, rank };
    persist();
    film(
      [
        {
          d: 3.4,
          fade: "out",
          cap: ["GAILURRERA", rank + " · " + L("alarmak: ") + SIG.alarms + " · " + L("lo: ") + SIG.sleeps],
          cam: [[KX + 5, 4, -158], [KX + 3, 9, -160]],
          look: [[KX, 3, -166], [KX, 12, -168]],
          tick: (dt, k) => {
            hero.position.y = P.y + k * 6;
          },
        },
      ],
      () => {
        anbotoBuild();
        AN.stage = "arrive";
        AN.dawn = 0;
        anbotoArrive();
        enterZone("anboto", { ...AN_SPAWN }, true);
      },
    );
  }
  function harpeakObjective() {
    const E = (x) => KX + x,
      a = AREA.cur;
    if (SIG.phase === 1) return ["IKUSI ZAITUZTE! Ezkutatu: itzalean, haien begiradatik kanpo.", null];
    if (a === "hA" || !a) return ["Mendiaren barrutik, gailurrera. Iparrera, itzalean.", [E(0), -16, 0]];
    if (a === "hB") return ["Zaindariaren bizkarretik: iparreko atera.", [E(6), -50, 0]];
    if (a === "hC") return ["Iparreko atea: zaindaria hotsera erakarri (TOK-TOK).", [E(-6), -92, 0]];
    if (a === "hD") return ["Izotz-hariak: jauzi, edo iraganera (garaia).", [E(-6), -128, 0]];
    return ["Gauekoren ataria: atea, gailurrera.", [E(0), -164, 0]];
  }
  /* egunkarian: sigilu-leizearen emaitza (izenburua, alarmak, lo eta denbora) */
  function harpeakLog() {
    const R = saved.harpeak;
    if (!R) return "";
    const mm = Math.floor(R.secs / 60),
      ss = String(R.secs % 60).padStart(2, "0");
    return "\n\n" + L("ANBOTOKO HARPEAK") + " · " + R.rank + "\n   " + L("Alarmak: ") + R.alarms + " · " + L("Lo: ") + R.sleeps + " · " + L("TOK-TOK: ") + R.knocks + " · " + mm + ":" + ss;
  }
