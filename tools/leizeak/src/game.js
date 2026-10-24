  const T = THREE,
    $ = (id) => document.getElementById(id),
    PI = Math.PI,
    TAU = PI * 2,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    mix = (a, b, t) => a + (b - a) * t,
    smooth01 = (t) => t * t * (3 - 2 * t),
    dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
    mobile = matchMedia("(pointer:coarse)").matches;
  /* euskara hutsean: L(eu, es) beti euskarazko testua da (gaztelaniazkoak iturburuan bakarrik geratzen dira) */
  const language = "eu";
  const L = (eu) => eu;
  /* teklatuaren letrak: mugikorrean ez dute zentzurik */
  const kb = (s) => (mobile ? "" : s);
  /* gordetako partida (LEIZEEN DEIA): istorio-banderak, erritmoak, tresnak, giltzak, txanponak... */
  const SAVE_KEY = "leizeak-v1";
  const FRESH = () => ({ v: 1, zone: "ibarra", cp: null, deaths: 0, assist: false, flags: [], rhythms: [], items: [], keys: 0, keyz: {}, coins: 0, pieces: [], hearts: 0, potions: 0, chests: [], doors: [], cleared: [], visited: [], sheep: [], boons: [], echoes: [], herbs: [], ores: [], arimak: [], tod: 0.35, playTime: 0 });
  let saved = FRESH();
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) {
      saved = { ...saved, ...s };
      for (const k of ["flags", "rhythms", "items", "pieces", "chests", "doors", "cleared", "visited", "sheep", "boons", "echoes", "herbs", "ores", "arimak"]) if (!Array.isArray(saved[k])) saved[k] = [];
      if (!Number.isFinite(saved.tod)) saved.tod = 0.35;
      /* giltza txikiak leize bakoitzeko (lehengo partidetan zenbaki bakarra) */
      if (!saved.keyz || typeof saved.keyz !== "object") saved.keyz = { leizea: saved.keys || 0 };
    }
  } catch {}
  let started = false,
    paused = true,
    ready = false,
    time = 0,
    phase = 1,
    phaseBlend = 1,
    phaseCooldown = 0,
    shiftFlash = 0,
    subTimer = 0,
    titleTimer = 0,
    respawnTimer = 0,
    damageTime = 0,
    groundGrace = 0,
    jumpBuffer = 0,
    frame = 0,
    accumulator = 0,
    quality = mobile ? 0 : 1,
    muted = false,
    audio = null,
    beat = 0,
    lastBeat = -1,
    activeAnimation = "",
    mixer,
    actor,
    hero,
    renderer,
    camera,
    scene,
    sun,
    ambient,
    sea,
    sky,
    terrainMats = [],
    buildings = [],
    eraBuildings = [],
    solids = [],
    plants = [],
    phaseObjects = [],
    platforms = [],
    pickups = [],
    glows = [],
    trails = [],
    hazards = [],
    birds = [],
    models = {},
    loader = new T.GLTFLoader(),
    footRing,
    checkpointFx,
    near = null,
    endingActive = false;
  const input = { x: 0, z: 0, keys: {} };
  const P = {
    x: 0,
    z: 29,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    angle: PI,
    grounded: true,
    airSpeed: 7.7,
    wallGrace: 0,
    wallX: 0,
    wallZ: 0,
    wallLock: 0,
    jumps: 0,
    dashReady: true,
    dashT: 0,
    dashX: 0,
    dashZ: -1,
    shiftAir: false,
    hp: 5,
    maxHp: 5,
    dashes: 1,
    travel: 0,
    platform: null,
  };
  P.maxHp = P.hp = (saved.boons || []).includes("heart") ? 6 : 5;
  /* ==================================================================
     ATMOSFERA · bi garai, bi zeru
     Iragana: ilunabar urrekara, itsasoa bizirik.
     Oraina: egun argi eta hotza, denbora hautsia — itsasoa izoztuta (izotz-zelai
     zabala) eta denbora-hauts gutxi airean geldirik. Mundu irekiaren sentsazioa.
     EGFX (/assets/egfx.js) ez badago, lehengo gradienteak erabiltzen dira.
     ================================================================== */
  const EG = window.EGFX && EGFX.enabled ? EGFX : null;
  const ATMO = { skyPast: null, skyNow: null, skyNight: null, envPast: null, envNow: null, envNight: null, terrain: undefined, rockMat: null, dust: null,
    fogPast: new T.Color("#5a829d"), fogNow: new T.Color("#a9c6de"), envOn: null, falls: [] };
  function rawTex(id, srgb) {
    const img = EG && EG.image(id);
    if (!img) return null;
    const t = new T.Texture(img);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    if (srgb) t.encoding = T.sRGBEncoding;
    t.needsUpdate = true;
    return t;
  }
  function skyTex(id) {
    const t = rawTex(id, false);
    if (!t) return null;
    t.wrapT = T.ClampToEdgeWrapping;
    t.minFilter = T.LinearFilter; /* mipmap gabe: equirect-aren josturan lerrorik ez */
    t.generateMipmaps = false;
    return t;
  }
  /* Gainazal lauetarako UV-ak munduko koordenatuetan: material bakarra uharte guztietarako. */
  function worldUV(geo, ox, oz, tile = 4.5) {
    const a = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < a.count; i++) uv.setXY(i, (a.getX(i) + ox) / tile, (a.getZ(i) + oz) / tile);
    uv.needsUpdate = true;
    return geo;
  }
  /* Uharteen gaina: belarra iraganean, elurra orainean (zarata batekin, ez dena batera). */
  function terrainMaterial() {
    if (ATMO.terrain !== undefined) return ATMO.terrain;
    const g = rawTex("grass_c", true),
      gn = rawTex("grass_n"),
      s = rawTex("snow_c", true),
      sn = rawTex("snow_n");
    if (!g || !s || !gn || !sn) return (ATMO.terrain = null);
    const m = new T.MeshStandardMaterial({ map: g, normalMap: gn, roughness: 0.96, metalness: 0, color: "#e4ecdc" });
    m.normalScale.set(0.8, 0.8);
    const uBlend = { value: 1 };
    m.userData.uBlend = uBlend;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uBlend = uBlend;
      sh.uniforms.uSnow = { value: s };
      sh.uniforms.uSnowN = { value: sn };
      sh.fragmentShader =
        "uniform float uBlend;\nuniform sampler2D uSnow;\nuniform sampler2D uSnowN;\n" +
        sh.fragmentShader
          .replace(
            "#include <map_fragment>",
            [
              "#ifdef USE_MAP",
              "  vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );",
              "  vec4 snowC = mapTexelToLinear( texture2D( uSnow, vUv * 0.71 ) );",
              "  float edge = 1.0 - abs( uBlend * 2.0 - 1.0 );",
              "  float sb = smoothstep( 0.2, 0.8, uBlend + ( texelColor.g - 0.18 ) * 1.6 * edge );",
              "  diffuseColor *= mix( texelColor, snowC * vec4( 1.06, 1.08, 1.12, 1.0 ), sb );",
              "#endif",
            ].join("\n"),
          )
          .replace(
            "vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;",
            "vec3 mapN = mix( texture2D( normalMap, vUv ).xyz, texture2D( uSnowN, vUv * 0.71 ).xyz, uBlend ) * 2.0 - 1.0;",
          );
    };
    m.customProgramCacheKey = () => "oih-terrain";
    return (ATMO.terrain = m);
  }
  function rockMaterial() {
    if (ATMO.rockMat) return ATMO.rockMat;
    const key = EG && EG.has("cliff") ? "cliff" : "rock";
    const m = EG && EG.has(key) ? EG.material(key, { color: key === "cliff" ? "#5e5c54" : "#69706b", repeat: [12, 1.2], roughness: 1, normal: 1.3 }) : null;
    return (ATMO.rockMat = m || material("#4e6e7a"));
  }
  function stackMaterial() {
    if (ATMO.stackMat) return ATMO.stackMat;
    const key = EG && EG.has("cliff") ? "cliff" : "rock";
    const m = EG && EG.has(key) ? EG.material(key, { color: "#3f403b", repeat: [4, 3.2], roughness: 1, normal: 1.4 }) : null;
    return (ATMO.stackMat = m || rockMaterial());
  }
  /* Itsas-harri prozeduralak (lehengo kaxa grisen ordez). */
  function seaStack(x, z, h, seed) {
    const r = 4.5 + ((seed * 37) % 5),
      H = h + 12,
      geo = new T.CylinderGeometry(r * 0.52, r, H, 12, 9);
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        py = a.getY(i),
        pz = a.getZ(i),
        ang = Math.atan2(pz, px),
        k = 1 + 0.17 * Math.sin(ang * 3 + seed) + 0.09 * Math.sin(ang * 7 + py * 0.35 + seed * 2) + 0.07 * Math.sin(py * 0.8 + seed);
      a.setXYZ(i, px * k, py, pz * k);
    }
    geo.computeVertexNormals();
    const m = obj(geo, stackMaterial());
    m.position.set(x, -8.5 + H / 2 - 3, z);
    m.rotation.y = seed;
    m.castShadow = false;
    const tm = terrainMaterial();
    if (tm) {
      const cap = new T.CircleGeometry(r * 0.52 * 0.98, 12);
      cap.rotateX(-PI / 2);
      worldUV(cap, x, z);
      const c = obj(cap, tm);
      c.position.set(x, -8.5 + H - 3 + 0.02, z);
      c.rotation.y = seed;
      c.castShadow = false;
    }
    return m;
  }
  /* Denbora-hautsa: orainean airean geldirik (elurra ez dena); iraganean urre-izpi gutxi batzuk dantzan. */
  function timeDust() {
    const N = mobile ? 900 : 1800,
      pos = new Float32Array(N * 3),
      sd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      sd[i] = Math.random();
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("seed", new T.BufferAttribute(sd, 1));
    const m = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uBlend: { value: 1 }, uCenter: { value: new T.Vector3() }, uPx: { value: 1 } },
      vertexShader: [
        "attribute float seed;uniform float uTime,uBlend,uPx;uniform vec3 uCenter;varying float vA;varying vec3 vC;",
        "void main(){",
        "  vec3 h=vec3(35.,15.,35.);",
        "  vec3 pp=mod(position-uCenter+h,h*2.)-h+uCenter;",
        "  float past=1.-uBlend;",
        "  pp.x+=past*sin(uTime*.23+seed*11.)*1.6; pp.y+=past*sin(uTime*.5+seed*30.)*.9; pp.z+=past*cos(uTime*.19+seed*7.)*1.6;",
        "  vec4 mv=modelViewMatrix*vec4(pp,1.);",
        "  float vis=mix(step(.84,seed),step(.62,seed),uBlend);",
        "  gl_PointSize=(mix(2.6,1.5,uBlend)+fract(seed*13.)*1.7)*uPx*55./max(-mv.z,1.)*vis;",
        "  float tw=.62+.38*sin(uTime*(.7+seed*2.)*(1.-uBlend*.85)+seed*40.);",
        "  vA=vis*(.35+.65*fract(seed*7.))*tw*smoothstep(70.,20.,-mv.z);",
        "  vC=mix(vec3(1.,.8,.48),vec3(.9,.96,1.),uBlend);",
        "  gl_Position=projectionMatrix*mv;}",
      ].join("\n"),
      fragmentShader:
        "varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vC,smoothstep(.5,0.,d)*vA*.85);}",
    });
    const p = new T.Points(g, m);
    p.frustumCulled = false;
    p.renderOrder = 5;
    scene.add(p);
    return (ATMO.dust = p);
  }
  /* Ur-jauzia: iraganean erortzen, orainean izoztuta. */
  function fallTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 64,
        w = 1 + Math.random() * 3,
        a = 0.25 + Math.random() * 0.6;
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.3, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, `rgba(255,255,255,${a * 0.6})`);
      g.fillStyle = gr;
      g.fillRect(x, Math.random() * 80, w, 256);
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  function atmoUpdate(dt) {
    const b = phaseBlend;
    if (sky.material.uniforms.blend) sky.material.uniforms.blend.value = b;
    const su = sea.material.uniforms;
    su.blend.value = b;
    if (su.camPos) su.camPos.value.copy(camera.position);
    if (ATMO.terrain) ATMO.terrain.userData.uBlend.value = b * 0.38;
    if (ATMO.dust) {
      const u = ATMO.dust.material.uniforms;
      u.uTime.value = time;
      u.uBlend.value = b;
      u.uCenter.value.set(P.x, P.y + 4, P.z);
      u.uPx.value = renderer.getPixelRatio() * (innerHeight / 720);
    }
    for (const f of ATMO.falls) {
      f.material.map.offset.y -= dt * 1.6 * Math.max(0, 1 - b * 1.15);
      f.material.color.setRGB(mix(0.75, 0.86, b), mix(0.93, 0.95, b), mix(0.97, 1, b));
      f.material.opacity = mix(0.62, 0.9, b);
    }
    if (EG && EG.tier === 0 && ZONES[ZONE.cur].outdoor) {
      const want = DAY.k > 0.55 && ATMO.envNight ? ATMO.envNight : b < 0.5 ? ATMO.envPast : ATMO.envNow;
      if (want && scene.environment !== want) scene.environment = want;
    }
  }
  /* Izotz-pitzadurak aldez aurretik (voronoi, lauza errepikagarria): pixel bakoitzeko kalkulu
     garestiaren ordez bi testura-irakurketa (R: pitzadura handiak, G: finak). */
  function crackTexture() {
    const N = 256,
      C = 4,
      img = new Uint8Array(N * N * 4);
    const hash = (x, y, s) => {
      const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const vor = (px, py, s) => {
      const ix = Math.floor(px),
        iy = Math.floor(py),
        fx = px - ix,
        fy = py - iy;
      let d1 = 8,
        d2 = 8;
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++) {
          const cx = (((ix + x) % C) + C) % C,
            cy = (((iy + y) % C) + C) % C,
            d = Math.hypot(x + hash(cx, cy, s) - fx, y + hash(cx, cy, s + 19) - fy);
          if (d < d1) (d2 = d1), (d1 = d);
          else if (d < d2) d2 = d;
        }
      return d2 - d1;
    };
    const edge = (d, w) => 255 * (1 - smooth01(clamp(d / w, 0, 1)));
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const u = (i / N) * C,
          v = (j / N) * C,
          k = (j * N + i) * 4;
        img[k] = edge(vor(u, v, 1), 0.035);
        img[k + 1] = edge(vor(u, v, 2), 0.025);
        img[k + 3] = 255;
      }
    const t = new T.DataTexture(img, N, N, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  /* Itsasoa: iraganean bizirik (olatuak, islapena, apar-eraztunak); orainean izoztuta (izotz-pitzadurak). */
  function seaMaterial() {
    const tPast = ATMO.skyPast,
      tNow = ATMO.skyNow,
      tWater = rawTex("water_n", false);
    /* aparra: kaiaren zutabeen inguruan eta itsaslabarraren oinean */
    const falls = [new T.Vector3(-2.1, 66, 1), new T.Vector3(2.1, 74.6, 1), new T.Vector3(-30, 64, 1), new T.Vector3(34, 62, 1), new T.Vector3(0, 0, 0)];
    return new T.ShaderMaterial({
      uniforms: {
        clock: { value: 0 },
        blend: { value: 1 },
        camPos: { value: new T.Vector3() },
        tPast: { value: tPast },
        tNow: { value: tNow },
        tWater: { value: tWater },
        useSky: { value: tPast && tNow ? 1 : 0 },
        tCrack: { value: crackTexture() },
        useWater: { value: tWater ? 1 : 0 },
        falls: { value: falls },
        tNight: { value: ATMO.skyNight },
        useNight: { value: ATMO.skyNight ? 1 : 0 },
        uNight: { value: 0 },
      },
      vertexShader:
        "varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: [
        "uniform float clock,blend,useSky,useWater,uNight,useNight;uniform vec3 camPos;uniform sampler2D tPast,tNow,tWater,tCrack,tNight;uniform vec3 falls[5];varying vec3 wp;",
        "vec2 eq(vec3 d){return vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5);}",
        "vec3 skyCol(vec3 d){vec3 s;",
        "  if(useSky>.5){vec2 uv=eq(d);s=mix(texture2D(tPast,uv).rgb,texture2D(tNow,uv).rgb,blend);}",
        "  else{float t=pow(max(d.y,0.),.6);vec3 day=mix(vec3(.82,.71,.55),vec3(.23,.47,.59),t);vec3 ice=mix(vec3(.74,.85,.94),vec3(.27,.53,.86),t);s=mix(day,ice,blend);}",
        "  vec3 nn=useNight>.5?texture2D(tNight,eq(d)).rgb:vec3(.02,.03,.06);return mix(s,nn,uNight);}",
        "void main(){",
        "  float fr=smoothstep(0.,1.,blend);",
        "  float tt=clock*(1.-fr*.995);",
        "  vec2 q=wp.xz;",
        "  vec3 n;",
        "  if(useWater>.5){",
        "    vec3 a=texture2D(tWater,q*.031+vec2(tt*.011,tt*.007)).xyz*2.-1.;",
        "    vec3 b=texture2D(tWater,q*.057-vec2(tt*.009,-tt*.012)).xyz*2.-1.;",
        "    vec2 s=(a.xy+b.xy)*mix(.26,.04,fr);n=normalize(vec3(s.x,1.,s.y));",
        "  }else n=normalize(vec3(sin(q.x*.4+tt)*.08*(1.-fr),1.,cos(q.y*.33-tt*.8)*.08*(1.-fr)));",
        "  vec3 v=normalize(wp-camPos);",
        "  vec3 r=reflect(v,n);r.y=abs(r.y);",
        "  float f=.03+.97*pow(1.-max(dot(-v,n),0.),5.);",
        "  vec3 deep=mix(vec3(.04,.22,.26),vec3(.34,.48,.6),fr);",
        "  vec3 shal=mix(vec3(.12,.44,.45),vec3(.64,.77,.87),fr);",
        "  float wv=sin(q.x*.19+q.y*.27+tt*.9)*sin(q.x*.43-q.y*.18-tt*.6);",
        "  vec3 col=mix(deep,shal,.35+wv*.15*(1.-fr))*mix(1.,.2,uNight);",
        "  vec3 rc=skyCol(r);",
        "  col=mix(col,rc,clamp(f*mix(.85,.45,fr)+mix(.08,.1,fr),0.,1.));",
        "  if(fr>.01){",
        "    vec2 wq=q+vec2(sin(q.y*.07)*6.,sin(q.x*.06)*6.);",
        "    float crack=texture2D(tCrack,wq*.01125).r;float fine=texture2D(tCrack,(wq*.17+3.)*.25).g;",
        "    float frost=sin(q.x*.11+sin(q.y*.13)*2.)*sin(q.y*.09-sin(q.x*.07)*2.);",
        "    col=mix(col,vec3(.17,.33,.48),fr*crack*.5);col+=fr*(fine*vec3(.07,.09,.1)+frost*vec3(.04,.05,.06));",
        "  }",
        "  float foam=0.;",
        "  for(int i=0;i<5;i++){float w=falls[i].z;if(w<.5)continue;float d=length(q-falls[i].xy);",
        "    foam+=(1.-smoothstep(1.5,5.5,d))*(.55+.45*sin(d*3.-tt*4.));}",
        "  col+=clamp(foam,0.,1.)*mix(vec3(.55,.68,.68),vec3(.75,.85,.9),fr)*.5;",
        "  vec3 sd=normalize(vec3(-.45,.32,-.83));",
        "  col+=(pow(max(dot(r,sd),0.),70.)*(1.-fr)*vec3(1.,.82,.55)*.45+pow(max(dot(r,sd),0.),18.)*fr*vec3(.9,.95,1.)*.22)*(1.-uNight);",
        "  float far=smoothstep(140.,520.,length(wp.xz-camPos.xz));",
        "  col=mix(col,skyCol(normalize(vec3(v.x,.015,v.z))),far);",
        "  gl_FragColor=vec4(col,1.);}",
      ].join("\n"),
    });
  }

  /* ==================================================================
     JOKO-SENTSAZIOA · partikulak, kamera, squash & stretch, hit-stop
     Gertaera bakoitzak (jauzi, lurreratzea, bultzada, garai-aldaketa…) FB.*
     deitzen du; hemen ikusmena eta soinua batzen dira.
     ================================================================== */
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FX = { N: 0, pts: null, pos: null, vel: null, life: null, max: null, size: null, col: null, grav: null, drag: null, next: 0, rings: [] };
  const CAM = { trauma: 0, fovKick: 0, look: new T.Vector3(), lookVel: new T.Vector3(), baseFov: 44, shakeT: 0 };
  /* Kamera-distantzia (⤢ botoia): hurbil · ertaina · urrun. Bertikalean ikus-eremu horizontala
     estua da: kamera askoz urrunago, FOV zabalagoa eta jokalaria ukipen-botoien gainetik. */
  const CAM_LEVELS = [0.8, 1, 1.3];
  let camLevel = 1;
  /* erabiltzailearen kamera: hatz eskuinaz biratu (yaw) eta hurbildu/urrundu (user) */
  CAM.yaw = 0;
  CAM.yawS = 0; /* leundua: kamerak eta kontrolek hau erabiltzen dute */
  CAM.user = 1;
  try {
    const v = localStorage.getItem("oihartzun-cam");
    if (v !== null) {
      const f = +v;
      /* lehengo formatua: 0/1/2 mailak */
      if (Number.isInteger(f) && f >= 0 && f <= 2) camLevel = f;
      CAM.user = Number.isInteger(f) && f >= 0 && f <= 2 ? CAM_LEVELS[f] : clamp(f || 1, 0.55, 1.8);
    }
  } catch {}
  function camSave() {
    try {
      localStorage.setItem("oihartzun-cam", CAM.user.toFixed(3));
    } catch {}
  }
  function camZoom(f) {
    CAM.user = clamp(CAM.user * f, 0.55, 1.8);
    camSave();
  }
  function camReset() {
    /* biraketa osoen multiplo hurbilena: bide laburrena */
    CAM.yaw = Math.round(CAM.yawS / TAU) * TAU;
    notify("Kamera zentratuta", "Cámara centrada", 1.2);
  }
  /* keinuak pantailan (ez botoietan): hatz batek biratu (ezker-eskuin) eta hurbildu (gora-behera);
     bi hatzek atximurka hurbildu; bi ukitu azkar: zentratu. Saguan: eskuineko botoia + gurpila. */
  const CAMG = { ptrs: new Map(), pinch: 0, lastTap: 0 };
  /* gertaeraren berezko denbora (ez kudeatzailearena): fotograma motelekin ere ukitu azkarrak ondo */
  const evTime = (e) => (e.timeStamp > 0 ? e.timeStamp : performance.now());
  function camGestureDown(e) {
    if (CRAFT.on) return; /* eraikitzean, ukitzeak piezentzat */
    const now = evTime(e);
    CAMG.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: now });
    if (CAMG.ptrs.size === 2) {
      const [a, b] = [...CAMG.ptrs.values()];
      CAMG.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function camGestureMove(e) {
    const q = CAMG.ptrs.get(e.pointerId);
    if (!q) return false;
    const dx = e.clientX - q.x,
      dy = e.clientY - q.y;
    q.x = e.clientX;
    q.y = e.clientY;
    if (CAMG.ptrs.size >= 2) {
      const [a, b] = [...CAMG.ptrs.values()],
        d = Math.hypot(a.x - b.x, a.y - b.y);
      if (CAMG.pinch > 0 && d > 0) camZoom(CAMG.pinch / d);
      CAMG.pinch = d;
    } else {
      CAM.yaw -= dx * 0.0085;
      if (Math.abs(dy) > Math.abs(dx) * 0.6) camZoom(Math.exp(dy * 0.0045));
    }
    if (Math.hypot(e.clientX - q.x0, e.clientY - q.y0) > 14) coachDone("camera");
    return true;
  }
  function camGestureUp(e) {
    const q = CAMG.ptrs.get(e.pointerId);
    if (!q) return false;
    CAMG.ptrs.delete(e.pointerId);
    if (CAMG.ptrs.size < 2) CAMG.pinch = 0;
    const now = evTime(e);
    if (now - q.t < 260 && Math.hypot(e.clientX - q.x0, e.clientY - q.y0) < 12) {
      if (now - CAMG.lastTap < 340) {
        camReset();
        CAMG.lastTap = 0;
      } else CAMG.lastTap = now;
    }
    return true;
  }
  function camFrame() {
    const portrait = innerHeight > innerWidth,
      /* haranean (kanpoan, zabal): kamera urrunago eta angelu zabalagoa — espazio gehiago ikusteko */
      open = ZONE.cur === "ibarra" ? 1 : 0;
    return {
      k: (portrait ? 1.95 : mobile ? 1.12 : 1) * CAM.user * (1 + 0.14 * open),
      fov: (portrait ? 50 : 44) + 4 * open,
      lift: portrait ? 5.5 : mobile ? 1.2 : 0,
      fight: portrait ? 0.86 : 0.74,
      /* kameraren altuera (angelua): baxuagoa → zerua eta urruneko uharteak ikusten dira */
      h: portrait ? 12 : 13.5,
    };
  }
  const SQ = { y: 1, v: 0 },
    UP_AXIS = new T.Vector3(0, 1, 0);
  let hitStop = 0;
  function fxInit() {
    const N = (FX.N = mobile ? 320 : 600);
    FX.pos = new Float32Array(N * 3);
    FX.vel = new Float32Array(N * 3);
    FX.life = new Float32Array(N);
    FX.max = new Float32Array(N);
    FX.size = new Float32Array(N);
    FX.col = new Float32Array(N * 3);
    FX.grav = new Float32Array(N);
    FX.drag = new Float32Array(N);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(FX.pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute("color", new T.BufferAttribute(FX.col, 3).setUsage(T.DynamicDrawUsage));
    FX.alpha = new Float32Array(N);
    FX.psize = new Float32Array(N);
    g.setAttribute("alpha", new T.BufferAttribute(FX.alpha, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute("psize", new T.BufferAttribute(FX.psize, 1).setUsage(T.DynamicDrawUsage));
    const m = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { uPx: { value: 1 } },
      vertexShader:
        "attribute float alpha,psize;attribute vec3 color;uniform float uPx;varying float vA;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*uPx*120./max(-mv.z,1.);vA=alpha;vC=color;gl_Position=projectionMatrix*mv;}",
      fragmentShader:
        "varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vC,smoothstep(.5,.1,d)*vA);}",
    });
    FX.pts = new T.Points(g, m);
    FX.pts.frustumCulled = false;
    FX.pts.renderOrder = 6;
    scene.add(FX.pts);
  }
  /* o: {n, speed, up, spread(0-1 horizontal), life, size, color, grav, drag, ring} */
  function fxBurst(x, y, z, o) {
    if (!FX.pts) return;
    const c = new T.Color(o.color || "#ffffff");
    for (let k = 0; k < (o.n || 10); k++) {
      const i = FX.next;
      FX.next = (FX.next + 1) % FX.N;
      /* dir: [dx, dz] → kono batean (kolpearen noranzkoan); bestela biribilean */
      const a = o.ring ? (k / o.n) * TAU : o.dir ? Math.atan2(o.dir[1], o.dir[0]) + (Math.random() - 0.5) * (o.cone || 1) : Math.random() * TAU,
        sp = (o.speed || 3) * (o.ring ? 1 : 0.4 + Math.random() * 0.8),
        hz = o.spread === undefined ? 1 : o.spread;
      FX.pos[i * 3] = x + (o.jitter || 0) * (Math.random() - 0.5);
      FX.pos[i * 3 + 1] = y + (o.jitter || 0) * (Math.random() - 0.5);
      FX.pos[i * 3 + 2] = z + (o.jitter || 0) * (Math.random() - 0.5);
      FX.vel[i * 3] = Math.cos(a) * sp * hz;
      FX.vel[i * 3 + 1] = (o.up || 0) * (0.6 + Math.random() * 0.8) + (1 - hz) * sp * (Math.random() - 0.3);
      FX.vel[i * 3 + 2] = Math.sin(a) * sp * hz;
      FX.max[i] = FX.life[i] = (o.life || 0.6) * (0.7 + Math.random() * 0.6);
      FX.size[i] = (o.size || 0.25) * (0.6 + Math.random() * 0.8);
      FX.grav[i] = o.grav === undefined ? 6 : o.grav;
      FX.drag[i] = o.drag === undefined ? 2.5 : o.drag;
      FX.col[i * 3] = c.r;
      FX.col[i * 3 + 1] = c.g;
      FX.col[i * 3 + 2] = c.b;
    }
  }
  /* talka-izarra: distira zuri labur bat kolpearen puntuan (fotograma gutxi) */
  const FLASHES = [];
  let STAR_TEX = null;
  function starTexture() {
    if (STAR_TEX) return STAR_TEX;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d"),
      gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.18, "#ffffffcc");
    gr.addColorStop(0.5, "#ffffff22");
    gr.addColorStop(1, "#ffffff00");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    /* lau izpi */
    g.globalCompositeOperation = "lighter";
    for (const [w, h] of [[120, 7], [7, 120]]) {
      const lg = g.createRadialGradient(64, 64, 0, 64, 64, 60);
      lg.addColorStop(0, "#ffffffee");
      lg.addColorStop(1, "#ffffff00");
      g.fillStyle = lg;
      g.fillRect(64 - w / 2, 64 - h / 2, w, h);
    }
    STAR_TEX = new T.CanvasTexture(c);
    return STAR_TEX;
  }
  function fxFlash(x, y, z, size = 2, color = "#ffffff", life = 0.09) {
    let f = FLASHES.find((f) => f.t >= f.life);
    if (!f) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: starTexture(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false }));
      s.renderOrder = 14;
      scene.add(s);
      f = { s, t: 0, life: 0 };
      FLASHES.push(f);
    }
    f.s.material.color.set(color);
    f.s.position.set(x, y, z);
    f.s.material.rotation = Math.random() * PI;
    Object.assign(f, { t: 0, life, size });
    f.s.visible = true;
  }
  /* Uhin-eraztuna (garai-aldaketa, bultzada bikoitza…) */
  function fxRing(x, y, z, color, maxR = 6, dur = 0.55) {
    let r = FX.rings.find((r) => r.t >= r.dur);
    if (!r) {
      const m = new T.Mesh(
        new T.TorusGeometry(1, 0.06, 6, 72),
        new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending }),
      );
      m.rotation.x = -PI / 2;
      scene.add(m);
      r = { m, t: 0, dur: 0 };
      FX.rings.push(r);
    }
    r.m.material.color.set(color);
    r.m.position.set(x, y, z);
    Object.assign(r, { t: 0, dur, maxR });
    r.m.visible = true;
  }
  function fxUpdate(dt) {
    if (!FX.pts) return;
    for (let i = 0; i < FX.N; i++) {
      if (FX.life[i] <= 0) {
        FX.alpha[i] = 0;
        continue;
      }
      FX.life[i] -= dt;
      const k = Math.exp(-FX.drag[i] * dt);
      FX.vel[i * 3] *= k;
      FX.vel[i * 3 + 2] *= k;
      FX.vel[i * 3 + 1] = FX.vel[i * 3 + 1] * k - FX.grav[i] * dt;
      FX.pos[i * 3] += FX.vel[i * 3] * dt;
      FX.pos[i * 3 + 1] += FX.vel[i * 3 + 1] * dt;
      FX.pos[i * 3 + 2] += FX.vel[i * 3 + 2] * dt;
      const t = Math.max(0, FX.life[i] / FX.max[i]);
      FX.alpha[i] = t * t * 0.9;
      FX.psize[i] = FX.size[i] * (0.4 + t * 0.6);
    }
    const g = FX.pts.geometry;
    g.attributes.position.needsUpdate = g.attributes.alpha.needsUpdate = g.attributes.psize.needsUpdate = g.attributes.color.needsUpdate = true;
    FX.pts.material.uniforms.uPx.value = renderer.getPixelRatio() * (innerHeight / 720);
    for (const f of FLASHES) {
      if (f.t >= f.life) {
        f.s.visible = false;
        continue;
      }
      f.t += dt;
      const u = Math.min(1, f.t / f.life);
      f.s.scale.setScalar(f.size * (0.55 + u * 0.7));
      f.s.material.opacity = 1 - u * u;
    }
    for (const r of FX.rings) {
      if (r.t >= r.dur) {
        r.m.visible = false;
        continue;
      }
      r.t += dt;
      const u = Math.min(1, r.t / r.dur),
        e = 1 - Math.pow(1 - u, 3);
      r.m.scale.setScalar(0.3 + e * r.maxR);
      r.m.material.opacity = (1 - u) * 0.85;
    }
  }
  function shake(a) {
    if (!reduceMotion) CAM.trauma = Math.min(1, CAM.trauma + a);
  }
  function squash(v) {
    SQ.v += v;
  }
  function juiceUpdate(dt) {
    /* squash & stretch: malguki moteldua */
    SQ.v += (1 - SQ.y) * 260 * dt;
    SQ.v *= Math.exp(-dt * 16);
    SQ.y += SQ.v * dt;
    const sy = clamp(SQ.y, 0.72, 1.3),
      sxz = 1 / Math.sqrt(sy);
    if (actor) actor.scale.set(1.15 * sxz, 1.15 * sy, 1.15 * sxz);
    CAM.trauma = Math.max(0, CAM.trauma - dt * 1.6);
    CAM.fovKick = mix(CAM.fovKick, 0, 1 - Math.exp(-dt * 6));
    CAM.shakeT += dt;
  }
  /* ---- gertaerak ---- */
  const eraCol = () => (phase ? "#bff6ff" : "#ffd79a");
  const groundCol = () => (phaseBlend > 0.5 ? "#e8f3ff" : "#d9caa2");
  const FB = {
    jump(n) {
      squash(n === 2 ? 3.2 : 2.6);
      if (n === 2) {
        fxBurst(P.x, P.y + 0.3, P.z, { n: 16, speed: 4.2, ring: true, life: 0.45, size: 0.22, color: eraCol(), grav: 0, drag: 4 });
        fxRing(P.x, P.y + 0.15, P.z, eraCol(), 1.8, 0.35);
      } else fxBurst(P.x, P.y + 0.1, P.z, { n: 8, speed: 2.4, spread: 1, up: 0.8, life: 0.45, size: 0.3, color: groundCol(), grav: 2 });
      SND.jump(n);
    },
    land(impact) {
      if (impact < 3) return;
      const k = clamp((impact - 3) / 14, 0, 1);
      squash(-2.4 - k * 4.5);
      fxBurst(P.x, P.y + 0.08, P.z, { n: 6 + Math.round(k * 14), speed: 2.5 + k * 4, ring: true, up: 0.6, life: 0.5, size: 0.32, color: groundCol(), grav: 3, drag: 5 });
      if (k > 0.55) shake(0.18 * k);
      SND.land(k);
    },
    dash() {
      /* kamerak ez du kolperik jasotzen (FOV-jauzirik ez): abiadura arrastoak eta soinuak ematen dute */
      squash(-1.4);
      fxBurst(P.x, P.y + 1, P.z, { n: 14, speed: 3, life: 0.4, size: 0.24, color: eraCol(), grav: 0, drag: 6, jitter: 0.6 });
      SND.dash();
    },
    shift() {
      fxRing(P.x, P.y + 0.2, P.z, eraCol(), 7, 0.6);
      fxBurst(P.x, P.y + 1, P.z, { n: 28, speed: 6, life: 0.7, size: 0.26, color: eraCol(), grav: -0.5, drag: 3 });
      shake(0.12);
      SND.shift(phase);
    },
    pickup(p) {
      fxBurst(p.x, p.y + 1.3, p.z, { n: 40, speed: 3.5, up: 3, life: 1.1, size: 0.3, color: "#ffe2a6", grav: -1, drag: 2 });
      fxRing(p.x, p.y + 1.3, p.z, "#ffd98f", 3.5, 0.8);
      SND.memory();
    },
    hurt() {
      hitStop = 0.07;
      shake(0.55);
      squash(-2);
      fxFlash(P.x, P.y + 1.1, P.z, 3, "#ffb39a", 0.1);
      fxBurst(P.x, P.y + 1, P.z, { n: 20, speed: 5, life: 0.5, size: 0.28, color: "#ff8a6a", grav: 4 });
      SND.hurt();
    },
    bossHit(x, y, z) {
      hitStop = 0.11;
      shake(0.85);
      fxFlash(x, y, z, 6.5, "#ffffff", 0.13);
      fxBurst(x, y, z, { n: 60, speed: 9, life: 0.9, size: 0.38, color: "#fff1c4", grav: 2, drag: 2 });
      fxRing(x, y, z, "#fff1c4", 9, 0.7);
      SND.bossHit();
    },
    respawn() {
      fxRing(P.x, P.y + 0.1, P.z, "#b8f0ff", 3, 0.6);
      fxBurst(P.x, P.y + 1, P.z, { n: 24, speed: 2.5, up: 2, life: 0.8, size: 0.26, color: "#d8f6ff", grav: -1 });
      SND.respawn();
    },
    stage() {
      fxRing(P.x, P.y + 0.1, P.z, "#ffe6b0", 8, 1.1);
      SND.stage();
    },
    step() {
      if (Math.random() < 0.6) fxBurst(P.x, P.y + 0.05, P.z, { n: 1, speed: 0.6, up: 0.5, life: 0.35, size: 0.18, color: groundCol(), grav: 1 });
      SND.step();
    },
  };

  /* ==================================================================
     SOINUA · musika sortzailea, efektuak eta giroa (Web Audio, fitxategirik gabe)
     Iragana: Re lidioa, epela (pad + arpa-pultsua, olatuak).
     Oraina: Re doriarra, hotza (kanpai izoztuak, haizea, erlojuaren tik-taka).
     Gaueko: txalaparta-erritmoa eta drone baxua.
     ================================================================== */
  const SND = (() => {
    let ctx = null, master, comp, sfx, mus, amb, verbIn, noise = null, nextBeat = 0, beatN = 0, pads = [], ambNodes = null, lastPhase = -1, RIV = null;
    const BEAT = 0.42;
    const HARM = {
      past: [
        [146.83, 220, 277.18, 329.63, 440],
        [123.47, 185, 246.94, 293.66, 369.99],
        [98, 146.83, 196, 246.94, 293.66],
        [110, 164.81, 220, 277.18, 329.63],
      ],
      now: [
        [146.83, 220, 261.63, 329.63, 349.23],
        [116.54, 174.61, 233.08, 293.66, 349.23],
        [98, 146.83, 196, 233.08, 293.66],
        [110, 164.81, 220, 261.63, 329.63],
      ],
    };
    function impulse(sec, decay) {
      const n = Math.floor(ctx.sampleRate * sec),
        b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
      }
      return b;
    }
    function init(ac) {
      if (ctx) return;
      ctx = ac;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3.5;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      const verb = ctx.createConvolver();
      verb.buffer = impulse(3.2, 2.6);
      verbIn = ctx.createGain();
      verbIn.gain.value = 0.42;
      verbIn.connect(verb);
      const vOut = ctx.createGain();
      vOut.gain.value = 0.55;
      verb.connect(vOut);
      vOut.connect(master);
      sfx = bus(0.8, 0.25);
      mus = bus(0.42, 0.6);
      amb = bus(0.32, 0.15);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      nextBeat = ctx.currentTime + 0.2;
    }
    function bus(g, send) {
      const b = ctx.createGain();
      b.gain.value = g;
      b.connect(master);
      const s = ctx.createGain();
      s.gain.value = send;
      b.connect(s);
      s.connect(verbIn);
      return b;
    }
    const ok = () => ctx && !muted;
    function env(g, t, a, peak, dec) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    }
    function tone(type, f, t, a, dec, peak, out, f2) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dec);
      env(g, t, a, peak, dec);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + a + dec + 0.05);
    }
    function bell(f, t, v, out = sfx) {
      const c = ctx.createOscillator(),
        m = ctx.createOscillator(),
        mg = ctx.createGain(),
        g = ctx.createGain();
      c.frequency.value = f;
      m.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 1.6, t);
      mg.gain.exponentialRampToValueAtTime(1, t + 1.4);
      m.connect(mg);
      mg.connect(c.frequency);
      env(g, t, 0.005, v, 1.8);
      c.connect(g);
      g.connect(out);
      c.start(t);
      m.start(t);
      c.stop(t + 2);
      m.stop(t + 2);
    }
    function pluck(f, t, v, out = mus, bright = 1800) {
      const o = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        lp = ctx.createBiquadFilter(),
        g = ctx.createGain();
      o.type = "triangle";
      o2.type = "sine";
      o.frequency.value = f;
      o2.frequency.value = f * 2.002;
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(bright, t);
      lp.frequency.exponentialRampToValueAtTime(320, t + 0.9);
      env(g, t, 0.004, v, 1.1);
      o.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(out);
      o.start(t);
      o2.start(t);
      o.stop(t + 1.2);
      o2.stop(t + 1.2);
    }
    function hiss(t, dur, v, type, f1, f2, q = 1, out = sfx) {
      const s = ctx.createBufferSource(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain();
      s.buffer = noise;
      s.loop = true;
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(f1, t);
      f.frequency.exponentialRampToValueAtTime(f2, t + dur);
      env(g, t, Math.min(0.03, dur * 0.3), v, dur);
      s.connect(f);
      f.connect(g);
      g.connect(out);
      s.start(t, Math.random());
      s.stop(t + dur + 0.1);
    }
    /* Eliza-kanpaia: partzial ez-harmonikoak (hum, prime, tierce, quint, nominal…) */
    function toll(f, t, v, dec = 5, out = sfx) {
      for (const [k, a] of [[0.5, 0.55], [1, 1], [1.19, 0.42], [1.5, 0.3], [2, 0.5], [2.52, 0.2], [3.01, 0.16]]) {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = f * k;
        env(g, t, 0.004, v * a, dec * (k < 1 ? 1.3 : 1 / Math.sqrt(k)));
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + dec * 1.4 + 0.1);
      }
    }
    function knock(t, v, p = 1) {
      tone("sine", 260 * p, t, 0.002, 0.11, v, mus, 150 * p);
      hiss(t, 0.04, v * 0.5, "bandpass", 1800 * p, 1200 * p, 4, mus);
    }
    function pad(freqs, t, dur, v) {
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(v, t + 1.6);
      out.gain.setValueAtTime(v, t + dur - 1.2);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      lp.connect(out);
      out.connect(mus);
      const oscs = [];
      for (const f of freqs)
        for (const det of [-6, 6]) {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = f;
          o.detune.value = det;
          const g = ctx.createGain();
          g.gain.value = 0.18 / freqs.length;
          o.connect(g);
          g.connect(lp);
          o.start(t);
          o.stop(t + dur + 0.8);
          oscs.push(o);
        }
      const p = { out, oscs, end: t + dur };
      pads.push(p);
      return p;
    }
    function fadePads(t) {
      for (const p of pads) {
        try {
          p.out.gain.cancelScheduledValues(t);
          p.out.gain.setValueAtTime(Math.max(0.0001, p.out.gain.value), t);
          p.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
          p.oscs.forEach((o) => o.stop(t + 0.8));
        } catch (e) {}
      }
      pads = [];
    }
    function ambience(ph) {
      if (ambNodes) {
        const t = ctx.currentTime;
        ambNodes.g.gain.setTargetAtTime(0.0001, t, 0.4);
        ambNodes.s.stop(t + 2);
        ambNodes = null;
      }
      const t = ctx.currentTime,
        s = ctx.createBufferSource(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain(),
        lfo = ctx.createOscillator(),
        lg = ctx.createGain();
      s.buffer = noise;
      s.loop = true;
      f.type = ph ? "bandpass" : "lowpass";
      f.frequency.value = ph ? 620 : 520;
      f.Q.value = ph ? 0.9 : 0.4;
      lfo.frequency.value = ph ? 0.07 : 0.13;
      lg.gain.value = ph ? 220 : 160;
      lfo.connect(lg);
      lg.connect(f.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.setTargetAtTime(ph ? 0.5 : 0.7, t, 1.2);
      s.connect(f);
      f.connect(g);
      g.connect(amb);
      s.start(t);
      lfo.start(t);
      ambNodes = { s, g };
    }
    /* Musika: ritmo-egutegia aurrera begira (0.3 s) */
    /* @include music.js */
    function schedule() {
      if (!ok() || MZ.rendering) return;
      const t0 = ctx.currentTime;
      if (pads.length > 6) pads = pads.filter((p) => p.end > t0 - 1);
      if (phase !== lastPhase) {
        lastPhase = phase;
        ambience(phase);
      }
      mzSchedule(t0);
    }
    return {
      init,
      get ctx() {
        return ctx;
      },
      /* oihartzun-deia: interferentzia (Gauekoren sarrera) */
      static(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.45, 0.07 * v, "bandpass", 2600, 900, 0.5);
        hiss(t + 0.05, 0.25, 0.04 * v, "highpass", 5200, 7000, 0.7);
        tone("square", 55, t, 0.005, 0.3, 0.02 * v, sfx, 48);
      },
      /* ahotsak (ahotsak.js): bus nagusia eta erreberberazioa; hitz egitean musika eta giroa jaitsi */
      voiceNodes() {
        return ctx ? { master, verbIn } : null;
      },
      /* lv: musikaren maila hitz egitean (ahots baxuentzat, Gauekorentzat, are baxuago) */
      duck(on, lv = 0.15) {
        if (!ctx) return;
        const t = ctx.currentTime;
        mus.gain.setTargetAtTime(on ? lv : 0.42, t, on ? 0.08 : 0.7);
        amb.gain.setTargetAtTime(on ? 0.12 : 0.32, t, on ? 0.08 : 0.7);
      },
      setMuted(m) {
        if (!ctx) return;
        master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
        if (!m) { lastPhase = -1; nextBeat = ctx.currentTime + 0.1; }
      },
      update() { if (ctx) schedule(); },
      stinger(big) { if (ok()) mzStinger(big); },
      /* sorginkeria: izpi distiratsua (garaiaren arabera tonu bat edo bestea) */
      cast(triple) {
        if (!ok()) return;
        const t = ctx.currentTime,
          f = (phase ? 1318.5 : 987.77) * (0.97 + Math.random() * 0.06);
        tone("triangle", f, t, 0.002, 0.11, triple ? 0.05 : 0.035, sfx, f * 0.42);
        tone("sine", f * 2, t, 0.001, 0.06, 0.02, sfx, f * 0.9);
        hiss(t, 0.1, triple ? 0.07 : 0.045, "bandpass", 5200, 1700, 2.2);
        if (triple) bell(f * 1.5, t + 0.03, 0.02);
      },
      charge() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 220, t, 0.05, 0.7, 0.04, sfx, 660);
        tone("triangle", 330, t + 0.05, 0.05, 0.65, 0.02, sfx, 990);
        hiss(t, 0.7, 0.03, "bandpass", 600, 4200, 3);
      },
      ready() {
        if (!ok()) return;
        const t = ctx.currentTime;
        bell(1760, t, 0.03);
        bell(2637, t + 0.05, 0.018);
      },
      blast(full) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 140, t, 0.004, 0.45, full ? 0.2 : 0.14, sfx, 38);
        tone("sawtooth", 480, t, 0.002, 0.25, 0.04, sfx, 90);
        hiss(t, 0.5, full ? 0.14 : 0.1, "lowpass", 5000, 260, 0.8);
      },
      wind(v) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.5, 0.03 * v, "bandpass", 500, 1300, 1.2);
      },
      crumble() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.35, 0.09, "lowpass", 1400, 180, 0.9);
        tone("sine", 95, t, 0.003, 0.25, 0.08, sfx, 45);
      },
      rune(on) {
        if (!ok()) return;
        const t = ctx.currentTime;
        if (on) [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => bell(f, t + i * 0.05, 0.03));
        else tone("sine", 660, t, 0.004, 0.3, 0.04, sfx, 330);
      },
      tickTock(k) {
        if (!ok()) return;
        tone("square", k ? 1760 : 1320, ctx.currentTime, 0.001, 0.03, 0.015, sfx);
      },
      /* borroka eta eraikuntza */
      swing(n) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, n === 3 ? 0.26 : 0.13, n === 3 ? 0.12 : 0.08, "bandpass", 700, n === 3 ? 3800 : 2900, 1.3);
        bell([880, 987.77, 1174.66][n - 1] * (phase ? 1.5 : 1), t + 0.01, 0.022);
      },
      /* kolpea: "zart" lehor bat talka-fotograman (zarata laburra + tonua beherantz, bakoitza apur bat desberdin) */
      hit(d) {
        if (!ok()) return;
        const t = ctx.currentTime,
          v = 0.9 + Math.random() * 0.22;
        hiss(t, 0.035, 0.22 + d * 0.05, "highpass", 3800 * v, 1500, 0.9);
        hiss(t, 0.09, 0.16 + d * 0.04, "lowpass", 2600, 300, 0.8);
        tone("triangle", 330 * v, t, 0.001, 0.08, 0.12 + d * 0.03, sfx, 95);
        tone("sine", 190 * v, t, 0.002, 0.12, 0.14 + d * 0.04, sfx, 60);
        if (d >= 2) tone("sine", 82, t, 0.002, 0.22, 0.2, sfx, 42);
      },
      /* saguzarraren garrasia (murgildu aurretik) */
      screech() {
        if (!ok() || time - (SND.scrT ?? -9) < 0.15) return;
        SND.scrT = time;
        const t = ctx.currentTime;
        tone("sawtooth", 2400, t, 0.005, 0.16, 0.025, sfx, 3600);
        tone("square", 3100, t + 0.03, 0.004, 0.1, 0.012, sfx, 2600);
      },
      /* EGUZKI-ISPILUA: altxatu (distira), izpiaren burrunba, kristala, biraketa */
      mirror() {
        if (!ok()) return;
        const t = ctx.currentTime,
          k = phase ? 1.122 : 1;
        [1046.5, 1318.5, 1568].forEach((f, i) => bell(f * k, t + i * 0.05, 0.03));
        hiss(t, 0.4, 0.025, "highpass", 6000, 9000, 0.8);
      },
      hum(kind) {
        if (!ok()) return;
        const t = ctx.currentTime,
          f = kind === "moon" ? 330 : 262;
        tone("sine", f, t, 0.08, 0.55, 0.016, sfx, f * 1.01);
        tone("sine", f * 1.5, t, 0.08, 0.5, 0.009, sfx, f * 1.5);
      },
      chime() {
        if (!ok()) return;
        const t = ctx.currentTime;
        [1318.5, 1760, 2093].forEach((f, i) => bell(f, t + i * 0.07, 0.045));
      },
      turn() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.18, 0.05, "bandpass", 900, 500, 2);
        tone("square", 180, t, 0.002, 0.08, 0.02, sfx, 140);
      },
      /* Herensugearen su-arnasa */
      breath() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 1.5, 0.1, "lowpass", 600, 2600, 0.7);
        hiss(t + 0.1, 1.3, 0.05, "bandpass", 1800, 900, 1);
        tone("sawtooth", 70, t, 0.05, 1.4, 0.045, sfx, 55);
      },
      /* bizitzarik gabe: puxika bat bezala lehertu (askoz batera: bakarra) */
      pop() {
        if (!ok() || time - (SND.popT ?? -9) < 0.06) return;
        SND.popT = time;
        const t = ctx.currentTime;
        hiss(t, 0.06, 0.3, "bandpass", 2400, 900, 1.4);
        tone("sine", 920, t, 0.001, 0.1, 0.12, sfx, 180);
        tone("triangle", 140, t, 0.002, 0.18, 0.12, sfx, 55);
      },
      /* ALDARATU: burdin-hots distiratsua eta akorde laburra */
      parry() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 2350, t, 0.001, 0.5, 0.07, sfx, 2300);
        tone("sine", 3520, t, 0.001, 0.35, 0.04, sfx, 3480);
        tone("triangle", 587.33, t + 0.02, 0.004, 0.45, 0.05, sfx);
        tone("triangle", 880, t + 0.05, 0.004, 0.5, 0.04, sfx);
        hiss(t, 0.08, 0.1, "highpass", 6000, 3200, 0.7);
      },
      clang(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 1830, t, 0.001, 0.35, 0.05 * v, sfx, 1790);
        tone("sine", 2710, t, 0.001, 0.25, 0.035 * v, sfx, 2650);
        hiss(t, 0.06, 0.08 * v, "highpass", 5000, 3000, 0.7);
      },
      kill() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 620, t, 0.003, 0.42, 0.06, sfx, 70);
        hiss(t, 0.4, 0.07, "bandpass", 1800, 300, 1);
        bell(1318.5, t + 0.08, 0.025);
      },
      roar() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sawtooth", 96, t, 0.02, 0.6, 0.07, sfx, 58);
        hiss(t, 0.5, 0.06, "lowpass", 700, 200, 1.2);
      },
      thud(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 82, t, 0.002, 0.3, 0.16 * v, sfx, 40);
        hiss(t, 0.18, 0.08 * v, "lowpass", 900, 150, 0.7);
      },
      /* jentil-kanpaiak (bakoitzak bere nota) */
      kanpaia(i = 0) {
        if (!ok()) return;
        toll([392, 523.25, 659.25, 783.99, 587.33][i % 5], ctx.currentTime, 0.05, 3.4);
      },
      /* TXIMISTARRIA: jaurtiketa, metxa (txinpartak) eta trumoia */
      throwStone() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.22, 0.07, "bandpass", 600, 2400, 1.4);
        tone("sine", 300, t, 0.004, 0.15, 0.03, sfx, 520);
      },
      crackle(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        for (let i = 0; i < 3; i++) hiss(t + i * 0.025, 0.02, 0.05 * v, "highpass", 5000 + Math.random() * 2000, 3000, 1.5);
      },
      thunder() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.05, 0.22, "highpass", 7000, 3000, 0.7);
        tone("sawtooth", 1400, t, 0.001, 0.08, 0.05, sfx, 300);
        tone("sine", 120, t, 0.003, 0.9, 0.24, sfx, 32);
        hiss(t + 0.02, 1.4, 0.16, "lowpass", 2200, 90, 0.8);
        hiss(t + 0.35, 1.2, 0.08, "lowpass", 600, 70, 0.6);
      },
      shot() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 920, t, 0.004, 0.22, 0.035, sfx, 480);
        hiss(t, 0.15, 0.03, "bandpass", 2500, 1200, 2);
      },
      heal() {
        if (!ok()) return;
        const t = ctx.currentTime;
        [659.25, 880, 1318.5].forEach((f, i) => bell(f, t + i * 0.06, 0.03));
      },
      glue() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.18, 0.06, "bandpass", 400, 1400, 2.5);
        tone("sine", 300, t, 0.004, 0.12, 0.05, sfx, 560);
      },
      grab() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 440, t, 0.01, 0.25, 0.03, sfx, 660);
        tone("triangle", 880, t + 0.02, 0.01, 0.2, 0.015, sfx, 1320);
      },
      /* txalaparta: ohol lodiaren kolpe hutsa (ezkerra baxuagoa, eskuina argiagoa);
         espirituaren deia (spirit) oihartzun handiagoarekin; vol: urrutiko jotzaileak */
      tok(side, spirit, vol = 1) {
        if (!ok() || vol < 0.02) return;
        const t = ctx.currentTime,
          f = side === "L" ? 196 : 247,
          v = vol * (spirit ? 0.85 : 1);
        tone("sine", f * 1.5, t, 0.001, 0.16, 0.16 * v, spirit ? mus : sfx, f);
        tone("triangle", f * 3.02, t, 0.001, 0.07, 0.07 * v, spirit ? mus : sfx, f * 2.4);
        hiss(t, 0.035, 0.09 * v, "bandpass", side === "L" ? 1300 : 1900, 700, 3, spirit ? mus : sfx);
        if (spirit) bell(f * 4, t + 0.01, 0.012 * v);
      },
      wake() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 55, t, 0.05, 1.6, 0.2, sfx, 38);
        hiss(t, 1.4, 0.1, "lowpass", 600, 90, 0.7);
        [196, 293.66, 392].forEach((f, i) => bell(f, t + 0.3 + i * 0.16, 0.04));
      },
      echoWave() {
        if (!ok()) return;
        const t = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          bell(1174.66, t + i * 0.32, 0.05 / (i + 1));
          bell(1567.98, t + 0.08 + i * 0.32, 0.03 / (i + 1));
        }
        hiss(t, 1.3, 0.04, "bandpass", 3200, 900, 4);
      },
      coin(big) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("square", big ? 1567.98 : 1318.5, t, 0.001, 0.05, 0.02, sfx);
        tone("square", big ? 2093 : 1760, t + 0.05, 0.001, 0.12, 0.02, sfx);
      },
      baa() {
        if (!ok()) return;
        const t = ctx.currentTime,
          o = ctx.createOscillator(),
          lfo = ctx.createOscillator(),
          lg = ctx.createGain(),
          lp = ctx.createBiquadFilter(),
          g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(320, t);
        o.frequency.linearRampToValueAtTime(280, t + 0.55);
        lfo.frequency.value = 23;
        lg.gain.value = 18;
        lfo.connect(lg);
        lg.connect(o.frequency);
        lp.type = "bandpass";
        lp.frequency.value = 1100;
        lp.Q.value = 2;
        env(g, t, 0.04, 0.05, 0.55);
        o.connect(lp);
        lp.connect(g);
        g.connect(sfx);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.7);
        lfo.stop(t + 0.7);
      },
      /* gauza bat lortzean: lau notako fanfarra propioa (Re nagusia, goranzkoa) */
      fanfare() {
        if (!ok()) return;
        const t = ctx.currentTime;
        [[587.33, 0], [739.99, 0.14], [880, 0.28], [1174.66, 0.46]].forEach(([f, d], i) => {
          pluck(f, t + d, i === 3 ? 0.09 : 0.06, sfx, 3200);
          bell(f * 2, t + d, i === 3 ? 0.03 : 0.015);
        });
        pad([146.83, 220, 293.66, 369.99], t + 0.4, 2.2, 0.06);
      },
      chain() {
        if (!ok()) return;
        const t = ctx.currentTime;
        for (let i = 0; i < 7; i++) tone("square", 2400 + Math.random() * 900, t + i * 0.035, 0.001, 0.02, 0.012, sfx);
        hiss(t, 0.3, 0.05, "bandpass", 2600, 5200, 2);
      },
      /* haraneko giroa */
      cluck() {
        if (!ok()) return;
        const t = ctx.currentTime;
        for (let i = 0; i < 3; i++) tone("square", 760 + Math.random() * 120, t + i * 0.09, 0.004, 0.05, 0.012, amb, 520);
      },
      moo(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime,
          o = ctx.createOscillator(),
          lp = ctx.createBiquadFilter(),
          g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(118, t);
        o.frequency.linearRampToValueAtTime(96, t + 1.1);
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(380, t);
        lp.frequency.linearRampToValueAtTime(700, t + 0.5);
        env(g, t, 0.15, 0.05 * v, 1.0);
        o.connect(lp);
        lp.connect(g);
        g.connect(amb);
        o.start(t);
        o.stop(t + 1.3);
      },
      chirp() {
        if (!ok()) return;
        const t = ctx.currentTime,
          f = 2600 + Math.random() * 1600,
          n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) tone("sine", f, t + i * 0.085, 0.004, 0.06, 0.012, amb, f * (1.3 + Math.random() * 0.4));
      },
      /* pottoka: apatxen hotsa eta irrintzia */
      hoof(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 120 + Math.random() * 30, t, 0.002, 0.07, 0.05 * v, sfx, 70);
        hiss(t, 0.05, 0.03 * v, "bandpass", 900, 600, 2);
      },
      neigh(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime,
          o = ctx.createOscillator(),
          bp = ctx.createBiquadFilter(),
          g = ctx.createGain(),
          lfo = ctx.createOscillator(),
          lg = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(820, t);
        o.frequency.linearRampToValueAtTime(980, t + 0.18);
        o.frequency.exponentialRampToValueAtTime(380, t + 1.1);
        lfo.frequency.value = 22;
        lg.gain.value = 40;
        lfo.connect(lg);
        lg.connect(o.frequency);
        bp.type = "bandpass";
        bp.frequency.value = 1400;
        bp.Q.value = 2.5;
        env(g, t, 0.06, 0.045 * v, 1.1);
        o.connect(bp);
        bp.connect(g);
        g.connect(sfx);
        o.start(t);
        lfo.start(t);
        o.stop(t + 1.25);
        lfo.stop(t + 1.25);
      },
      /* heura: hostoen karraska */
      leaves(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.18, 0.05 * v, "bandpass", 2400, 900, 1.6);
        hiss(t + 0.06, 0.12, 0.03 * v, "highpass", 4200, 2600, 1);
      },
      /* gaua: kilkerrak (uda) eta hontza */
      cricket() {
        if (!ok()) return;
        const t = ctx.currentTime,
          f = 4300 + Math.random() * 600;
        for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) tone("square", f, t + r * 0.22 + i * 0.028, 0.002, 0.016, 0.005, amb);
      },
      owl() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 360, t, 0.06, 0.35, 0.03, amb, 330);
        tone("sine", 350, t + 0.55, 0.05, 0.25, 0.022, amb, 320);
        tone("sine", 355, t + 0.85, 0.08, 0.55, 0.028, amb, 300);
      },
      crow() {
        if (!ok()) return;
        const t = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          tone("sawtooth", 520, t + i * 0.32, 0.01, 0.2, 0.012, amb, 380);
          hiss(t + i * 0.32, 0.18, 0.012, "bandpass", 1200, 900, 3, amb);
        }
      },
      creak() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 140 + Math.random() * 60, t, 0.02, 0.9, 0.03, amb, 60);
        hiss(t, 0.5, 0.02, "bandpass", 2400, 600, 6, amb);
      },
      drip() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 900, t, 0.002, 0.12, 0.04, sfx, 1600);
        hiss(t + 0.02, 0.25, 0.04, "lowpass", 1800, 400, 0.8);
      },
      /* ibaiaren hotsa: iturri bakarra, bolumena distantziaren arabera */
      riverLevel(v) {
        if (!ok()) return;
        if (!RIV) {
          const s = ctx.createBufferSource(),
            f = ctx.createBiquadFilter(),
            g = ctx.createGain();
          s.buffer = noise;
          s.loop = true;
          f.type = "bandpass";
          f.frequency.value = 900;
          f.Q.value = 0.6;
          g.gain.value = 0;
          s.connect(f);
          f.connect(g);
          g.connect(amb);
          s.start();
          RIV = g;
        }
        RIV.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.4);
      },
      /* probetarako: musika-maila bat fitxategira errendatu (OfflineAudioContext) */
      async render(level, bars, era, only) {
        const keep = [ctx, master, comp, sfx, mus, amb, verbIn, noise, MZ.L, MZ.ks, MZ.level, MZ.era, MZ.eraD, MZ.off];
        ctx = null;
        MZ.L = null;
        MZ.ks = new Map();
        MZ.off = {};
        MZ.rendering = true;
        const off = new OfflineAudioContext(2, Math.ceil(44100 * (bars * 16 * MZ.step + 2.5)), 44100);
        init(off);
        mzBuild();
        MZ.level = -1;
        const plan = Array.isArray(level) ? level : [[0, level]];
        mzLevel(plan[0][1], 0);
        if (only)
          for (const k of Object.keys(MZ.L))
            if (!only.includes(k)) {
              MZ.L[k].gain.cancelScheduledValues(0);
              MZ.L[k].gain.value = 0;
            }
        MZ.era.frequency.value = era ? 3600 : 16000;
        MZ.eraD.frequency.value = era ? 5200 : 16000;
        for (let n = 0; n < bars * 16; n++) {
          const ch = plan.find((p) => p[0] * 16 === n && n > 0);
          if (ch) mzLevel(ch[1], 0.05 + n * MZ.step);
          mzStep(0.05 + n * MZ.step, n);
        }
        const buf = await off.startRendering();
        [ctx, master, comp, sfx, mus, amb, verbIn, noise, MZ.L, MZ.ks, MZ.level, MZ.era, MZ.eraD, MZ.off] = keep;
        MZ.rendering = false;
        return buf;
      },
      note(f, t, v, type) { if (ok()) tone(type || "sine", f, ctx.currentTime, 0.01, t, Math.min(0.12, v * 2), sfx); },
      chord() {
        if (!ok()) return;
        const t = ctx.currentTime, base = phase ? [293.66, 349.23, 440, 523.25] : [293.66, 369.99, 440, 587.33];
        base.forEach((f, i) => bell(f, t + i * 0.09, 0.05));
      },
      jump(n) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.16, 0.05, "bandpass", 700, 1800, 1.2);
        if (n === 2) bell(phase ? 987.77 : 783.99, t, 0.05);
        else tone("triangle", 330, t, 0.004, 0.12, 0.035, sfx, 520);
      },
      land(k) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 110, t, 0.003, 0.14 + k * 0.1, 0.08 + k * 0.12, sfx, 48);
        hiss(t, 0.12 + k * 0.1, 0.05 + k * 0.08, "lowpass", phaseBlend > 0.5 ? 2400 : 900, 300, 0.7);
      },
      dash() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.28, 0.12, "bandpass", 400, 3200, 1.4);
        tone("sawtooth", 140, t, 0.005, 0.2, 0.03, sfx, 70);
      },
      shift(ph) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.35, 0.07, "highpass", 6000, 1200, 0.8);
        (ph ? [659.25, 987.77, 1318.5] : [293.66, 440, 587.33]).forEach((f, i) => bell(f, t + 0.02 + i * 0.05, 0.045));
      },
      memory() {
        if (!ok()) return;
        const t = ctx.currentTime;
        [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => bell(f, t + i * 0.11, 0.05));
      },
      hurt() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("square", 92, t, 0.003, 0.3, 0.07, sfx, 46);
        tone("sawtooth", 233, t, 0.003, 0.25, 0.03, sfx, 180);
        hiss(t, 0.2, 0.08, "lowpass", 1200, 200, 0.7);
      },
      bossHit() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 70, t, 0.002, 0.9, 0.22, sfx, 32);
        hiss(t, 0.6, 0.16, "lowpass", 3200, 120, 0.6);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * 0.03, 0.05));
      },
      respawn() {
        if (!ok()) return;
        const t = ctx.currentTime;
        [392, 523.25, 659.25].forEach((f, i) => bell(f, t + 0.1 + i * 0.12, 0.04));
      },
      stage() {
        if (!ok()) return;
        const t = ctx.currentTime;
        pad([146.83, 220, 293.66, 369.99], t, 3.2, 0.08);
        [587.33, 880, 1174.66].forEach((f, i) => bell(f, t + 0.15 + i * 0.16, 0.05));
      },
      step() {
        if (!ok()) return;
        const t = ctx.currentTime, snow = phaseBlend > 0.5;
        hiss(t, snow ? 0.07 : 0.05, snow ? 0.035 : 0.02, "bandpass", snow ? 1900 + Math.random() * 600 : 700 + Math.random() * 300, snow ? 1300 : 500, snow ? 2 : 1.2);
      },
      blip() {
        if (!ok()) return;
        tone("square", 1180 + Math.random() * 80, ctx.currentTime, 0.001, 0.022, 0.012, sfx);
      },
      radio() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.35, 0.05, "bandpass", 2600, 1400, 3);
        tone("sine", 1400, t + 0.05, 0.005, 0.12, 0.02, sfx);
      },
      click() {
        if (!ok()) return;
        tone("triangle", 880, ctx.currentTime, 0.002, 0.05, 0.03, sfx, 660);
      },
      /* oihartzun-kanpaia: v<1 urrutiko deia, v=1 jo eta bere oihartzunak */
      echo(v = 1) {
        if (!ok() || v < 0.02) return;
        const t = ctx.currentTime;
        toll(196, t, 0.075 * v, v < 1 ? 3.5 : 5.5);
        if (v >= 1) {
          toll(196, t + 1.35, 0.028, 4.5);
          toll(196, t + 2.7, 0.011, 4);
        }
      },
      freeze() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.55, 0.045, "highpass", 6200, 2600, 1.4);
        tone("sine", 2093, t + 0.04, 0.002, 0.3, 0.012, sfx);
        tone("sine", 2637, t + 0.12, 0.002, 0.25, 0.008, sfx);
      },
      splash() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.9, 0.07, "lowpass", 1600, 260, 0.8);
        hiss(t + 0.12, 0.6, 0.03, "bandpass", 3200, 900, 1.2);
      },
      /* HAIZE-ADARRA: adar-hots baxua eta arnasa */
      horn() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sawtooth", 196, t, 0.05, 0.55, 0.045, sfx, 188);
        tone("triangle", 293.66, t + 0.03, 0.06, 0.5, 0.05, sfx, 290);
        tone("sine", 98, t, 0.05, 0.6, 0.06, sfx, 96);
        hiss(t, 0.7, 0.07, "bandpass", 900, 2600, 0.9);
      },
      whoosh() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.55, 0.06, "bandpass", 500, 2400, 1.4);
      },
      /* lamiaren kantua: glisando garbia eta oihartzuna */
      sing(v = 1) {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 659.25, t, 0.25, 1.4, 0.03 * v, mus, 587.33);
        tone("sine", 987.77, t + 0.5, 0.25, 1.2, 0.018 * v, mus, 880);
        bell(1318.5, t + 0.9, 0.01 * v, mus);
      },
      /* sua izotzaren kontra / sua pizten */
      sizzle() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.7, 0.08, "highpass", 2400, 5200, 0.8);
        tone("sine", 180, t, 0.01, 0.4, 0.04, sfx, 90);
      },
      flame() {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.5, 0.09, "lowpass", 700, 2200, 0.9);
        tone("sine", 140, t, 0.02, 0.35, 0.06, sfx, 220);
      },
      ending(which) {
        if (!ok()) return;
        const t = ctx.currentTime,
          cold = which === "keep";
        pad(cold ? [146.83, 174.61, 220, 293.66] : [146.83, 220, 293.66, 369.99], t + 0.5, 11, 0.11);
        toll(98, t + 0.2, 0.1, 8);
        (cold ? [587.33, 698.46, 880, 1046.5] : [587.33, 739.99, 880, 1174.66]).forEach((f, i) => bell(f, t + 3 + i * 0.42, 0.04));
      },
    };
  })();

  /* ==================================================================
     KODEK-ERRETRATUAK (SVG) · idazmakina-testua · irakaspen testuingurukoak
     ================================================================== */
  const PORTRAITS = {
    /* Amaiur (aurpegia.js-ko aurpegiaren berdina): txapel morea zinta laranja eta belarritakoarekin,
       ile beltza kopetilekin, begi anbarrak distiraz, pikortak eta masailetako gorrixka */
    witch:
      '<svg viewBox="0 0 100 120" aria-hidden="true">' +
      '<path fill="#3a3672" d="M8 120c3-19 17-29 42-31 25 2 39 12 42 31z"/><path fill="#5753a6" d="M31 93q19 10 38 0l-3 9q-16 7-32 0z"/>' +
      '<rect fill="#e2b08c" x="44" y="80" width="12" height="11"/>' +
      '<path fill="#1c1b25" d="M28 58c-4 17-2 29 6 38l6-31zM72 58c4 17 2 29-6 38l-6-31z"/>' +
      '<ellipse fill="#f2c8a6" cx="50" cy="66" rx="19.5" ry="21.5"/>' +
      '<path fill="#1c1b25" d="M30.5 60c1.5-12 9.5-19.5 19.5-19.5S68 48 69.5 60c-3.5-3.6-7.5-5.6-11.6-6.2l-2.6 4.6-2.8-5.2q-3-.3-6 .2l-2.4 5-2.6-4.4c-4.4 1.2-8 3.2-11 6z"/>' +
      '<g fill="#e8857e" opacity=".42"><ellipse cx="37.5" cy="73" rx="5.4" ry="3.2"/><ellipse cx="62.5" cy="73" rx="5.4" ry="3.2"/></g>' +
      '<g fill="#a5603f" opacity=".75"><circle cx="39" cy="71" r=".75"/><circle cx="41.6" cy="72.6" r=".65"/><circle cx="36.6" cy="72.4" r=".6"/><circle cx="61" cy="71" r=".75"/><circle cx="58.4" cy="72.6" r=".65"/><circle cx="63.4" cy="72.4" r=".6"/><circle cx="48.4" cy="70.4" r=".5"/><circle cx="51.6" cy="70.4" r=".5"/></g>' +
      '<g class="eyes"><ellipse fill="#fbf6ef" cx="42" cy="64.5" rx="4.7" ry="5.5"/><ellipse fill="#fbf6ef" cx="58" cy="64.5" rx="4.7" ry="5.5"/>' +
      '<circle fill="#a35f27" cx="42.4" cy="65.2" r="3.5"/><circle fill="#a35f27" cx="57.6" cy="65.2" r="3.5"/>' +
      '<circle fill="#e9b85a" opacity=".55" cx="42.4" cy="64.2" r="2"/><circle fill="#e9b85a" opacity=".55" cx="57.6" cy="64.2" r="2"/>' +
      '<circle fill="#1a0d08" cx="42.4" cy="65.2" r="1.6"/><circle fill="#1a0d08" cx="57.6" cy="65.2" r="1.6"/>' +
      '<circle fill="#fff" cx="41" cy="63.6" r="1.05"/><circle fill="#fff" cx="56.2" cy="63.6" r="1.05"/></g>' +
      '<path stroke="#20110b" stroke-width="1.5" fill="none" stroke-linecap="round" d="M37.2 62.6q4.8-4.4 9.6 0M53.2 62.6q4.8-4.4 9.6 0M37.4 62.4l-1.6-1.4M62.6 62.4l1.6-1.4"/>' +
      '<path stroke="#3b2216" stroke-width="1.4" fill="none" stroke-linecap="round" d="M37 56.4q5-3.2 9.4-.2M53.6 56.2q4.4-3 9.4.2"/>' +
      '<path stroke="#c48a68" stroke-width=".9" fill="none" stroke-linecap="round" d="M50.4 68.4q1.2 2.4-.8 3.4"/>' +
      '<path class="mouth" fill="#8a3a36" d="M45.6 77.6q4.4 2.8 8.8 0q-4.4 1.4-8.8 0z"/>' +
      '<ellipse fill="#454199" cx="50" cy="46.5" rx="43" ry="8.5"/>' +
      '<path fill="#5853b4" d="M25 45.5q25-8.5 50 0l-8.4-7.6q-4-25 10.4-36.9q-31 6.4-42 44.5z"/>' +
      '<path fill="#e07a34" d="M27.4 42.4q22.6-6.8 45.2 0l-1.8 4.6q-20.8-5.2-41.6 0z"/>' +
      '<rect fill="none" stroke="#cdd6de" stroke-width="1.7" x="44.6" y="37.8" width="10.8" height="7.6" rx="1.2"/></svg>',
    radio:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p2" d="M12 120c4-18 17-26 38-27 21 1 34 9 38 27z"/>' +
      '<path class="p3" d="M30 46c-9 18-8 46 2 66l10-40zM70 46c9 18 8 46-2 66l-10-40z"/>' +
      '<ellipse class="p1" cx="50" cy="66" rx="16" ry="20"/>' +
      '<path class="p3" d="M32 58c2-17 12-24 18-24s16 7 18 24c-5-8-11-12-18-12s-13 4-18 12z"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="66" rx="2.1" ry="2.5"/><ellipse class="p4" cx="56.5" cy="66" rx="2.1" ry="2.5"/></g>' +
      '<path class="mouth p4" d="M46 78q4 2.2 8 0q-4 1-8 0z"/>' +
      '<circle class="p5" cx="34.5" cy="74" r="1.6"/>' +
      '<path class="p5" d="M28 40q22-14 44 0" fill="none" stroke-width="2.2"/><rect class="p5" x="25" y="38" width="6" height="10" rx="2"/></svg>',
    unknown:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><g class="static">' +
      Array.from({ length: 70 }, (_, i) => {
        const x = (i * 37) % 96, y = (i * 53) % 116, w = 2 + (i % 5) * 3;
        return `<rect class="p${2 + (i % 3)}" x="${x}" y="${y}" width="${w}" height="2"/>`;
      }).join("") +
      '</g><text class="p1" x="50" y="74" text-anchor="middle" font-size="34" font-family="Georgia">?</text></svg>',
    gaueko:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="g1" d="M8 120c6-30 18-52 42-56 24 4 36 26 42 56z"/>' +
      '<path class="g1" d="M30 70c-2-16 5-30 20-33 15 3 22 17 20 33-6-5-13-7-20-7s-14 2-20 7z"/>' +
      '<path class="g1" d="M33 44q-9-14-3-30q4 14 13 20zM67 44q9-14 3-30q-4 14-13 20z"/>' +
      '<g class="eyes"><ellipse class="g2" cx="42" cy="58" rx="3.4" ry="1.6"/><ellipse class="g2" cx="58" cy="58" rx="3.4" ry="1.6"/></g></svg>',
  };
  function portraitFor(who) {
    if (PORTRAIT_OF[who]) return PORTRAIT_OF[who];
    return who.startsWith("AMAIUR") ? "witch" : who.startsWith("IRATI") ? "radio" : who.startsWith("GAUEKO") ? "gaueko" : "unknown";
  }
  /* ---- irakaspenak: kontrol bakoitza behar den unean, behin ---- */
  const COACH = { seen: new Set(), cur: null };
  try {
    for (const k of JSON.parse(localStorage.getItem("oihartzun-coach") || "[]")) COACH.seen.add(k);
  } catch {}
  /* euM/esM: ukipen-pantailarako testua, teklatuaren aipamenik gabe */
  function coach(id, key, eu, es, btn, euM, esM) {
    if (COACH.seen.has(id) || cinematic || GET.on || TXALA.on) return false;
    if (COACH.cur === id) return true;
    coachHide();
    COACH.cur = id;
    COACH.t0 = time;
    COACH.btn = mobile ? btn : null;
    $("coachKey").textContent = mobile ? "" : key;
    $("coachKey").hidden = mobile || !key;
    $("coachText").textContent = mobile && euM ? L(euM, esM) : L(eu, es);
    $("coach").hidden = false;
    if (COACH.btn && $(COACH.btn)) $(COACH.btn).classList.add("coach");
    return true;
  }
  function coachHide() {
    $("coach").hidden = true;
    if (COACH.btn && $(COACH.btn)) $(COACH.btn).classList.remove("coach");
    COACH.cur = COACH.btn = null;
  }
  function coachDone(id) {
    if (COACH.seen.has(id)) return;
    COACH.seen.add(id);
    try {
      localStorage.setItem("oihartzun-coach", JSON.stringify([...COACH.seen]));
    } catch {}
    if (COACH.cur === id) coachHide();
  }
  function coachUpdate() {
    if (!started || paused || cinematic || TXALA.on) return;
    /* hitzaurreko irakaspenak (pro-*) ez ordezkatu */
    if (PRO.on && COACH.cur && COACH.cur.startsWith("pro-")) return;
    const fight = !!ROOM.fight || ENEMIES.some((e) => e.state !== "dead" && Math.hypot(e.x - P.x, e.z - P.z) < 16);
    /* irakaspenak ez dira pantailan geratzen: 7 s eta kitto (hitzaurrekoak ekintzaren zain) */
    if (COACH.cur && !COACH.cur.startsWith("pro-") && time - (COACH.t0 || 0) > 7) coachDone(COACH.cur);
    if (ATK.n && COACH.cur === "attack") coachDone("attack");
    if (MAG.charging && COACH.cur === "charge") coachDone("charge");
    if (P.travel >= 4) coachDone("move");
    /* lehentasun-ordena: une bakoitzean irakaspen bakarra */
    (fight &&
      ENEMIES.some((e) => e.state !== "spawn") &&
      coach("attack", "J", "SORGINKERIA: J edo klika · izpiak bakarrik bilatzen du helburua", "", "attackBtn", "SORGINKERIA: sakatu · izpiak bakarrik bilatzen du helburua", "")) ||
      (fight && ATK.n >= 5 && ENEMIES.some((e) => e.state !== "spawn" && e.state !== "dead") && coach("lock", "T", "T: FINKATU · helburu bat finkatu (berriro: hurrengoa)", "", "recallBtn", "◎ FINKATU: helburu bat finkatu", "")) ||
      (fight &&
        ATK.n >= 8 &&
        ENEMIES.some((e) => e.state !== "spawn" && e.state !== "dead") &&
        coach("charge", "J", "Mantendu J: INDARRA kargatu (eta EZKUTUA) · askatu: eztanda", "", "attackBtn", "Mantendu SORGINKERIA: INDARRA eta EZKUTUA · askatu: eztanda", "")) ||
      (SHOTS.some((s) => !s.back && Math.hypot(s.x - P.x, s.z - P.z) < 10) &&
        coach("shield", "J", "Mantendu J: EZKUTUA — aurretik datozen proiektilak itzultzen ditu", "", "attackBtn", "Mantendu SORGINKERIA: EZKUTUA (proiektilak itzuli)", "")) ||
      (fight &&
        COACH.seen.has("attack") &&
        ENEMIES.some((e) => e.state === "wind" && Math.hypot(e.x - P.x, e.z - P.z) < 4) &&
        coach("dodge", "F", "BULTZADA bitartean ukiezina zara: saihestu erasoa!", "", "dashBtn", "BULTZADA bitartean ukiezina zara: saihestu erasoa!", "")) ||
      (fight &&
        COACH.seen.has("dodge") &&
        ENEMIES.some((e) => e.state === "wind" && e.type !== "eye" && Math.hypot(e.x - P.x, e.z - P.z) < 5) &&
        coach("parry", "J", "Kolpea iristean sakatu J (behin): ALDARATU — etsaia zorabiatuta", "", "attackBtn", "Kolpea iristean sakatu SORGINKERIA (behin): ALDARATU", "")) ||
      (!fight && !P.climb && ivyNear(2.5) && ivyLive(ivyNear(2.5)) &&
        coach("climb", "W", "HEURA: bultzatu hormaren kontra eta igo", "", "stick", "HEURA: makila hormarantz, igotzeko", "")) ||
      (!fight && zoneHere() && !CRAFT.on && !zoneHere().solved &&
        coach("craft", "G", "ESKU MAGIKOA: egin klik kaxa batean eta arrastatu", "", "useBtn", "ESKUA: ukitu kaxa bat eta arrastatu", "")) ||
      (P.travel < 4 && coach("move", "WASD", "Mugitu: WASD edo geziak · Shift: korrika", "", "stick", "Mugitu: arrastatu makila · ertzeraino, korrika", "")) ||
      (!fight && COACH.seen.has("move") && P.travel > 25 &&
        coach("camera", "⇄", "Kamera: saguaren eskuineko botoia + arrastatu · gurpila: hurbildu", "", null, "Kamera: arrastatu hatza pantailan (biratu eta hurbildu) · bi ukitu: zentratu", "")) ||
      (!fight && npcNear() && coach("talk", "E", "E: HITZ EGIN", "", "useBtn", "HITZ EGIN botoia", "")) ||
      (mobile && !fight && CTX.cur && !CRAFT.on &&
        coach("power", "", "", "", "useBtn", "Ekintza-botoia: une bakoitzean behar duzuna agertzen da", "")) ||
      (ZONE.cur === "leizea" && ROOM.cur && ROOM.cur.id === "B" && coach("shift", "Q", "Plataformak garai batean bakarrik daude · ALDATU GARAIA (Q), airean ere", "", "phaseBtn", "Plataformak garai batean bakarrik · sakatu ALDATU, airean ere", "")) ||
      (ZONE.cur === "leizea" && ROOM.cur && ROOM.cur.id === "B" && P.z < -30 && coach("jump", "␣ ×2", "JAUZI · airean berriro sakatu: jauzi bikoitza", "", "jumpBtn")) ||
      (saved.rhythms.length && !TXALA.on && coach("txala", "B", "B: txalaparta jo (ikasitako erritmoak)", "", "useBtn", "TXALAPARTA: ikasitako erritmoak jo (⋯ menuan ere)", ""));
  }


  /* @include rooms.js */
  /* @include combat.js */
  /* @include magic.js */
  /* @include runes.js */
  /* @include craft.js */
  /* @include world.js */
  /* @include haran.js */
  /* @include ibarra.js */
  /* @include bizia.js */
  /* @include quests.js */
  /* @include adarra.js */
  /* @include txalaparta.js */
  /* @include lockon.js */
  /* @include chain.js */
  /* @include npc.js */
  /* @include dungeon.js */
  /* @include boss.js */
  /* @include story.js */
  /* @include lamia.js */
  /* @include tartalo.js */
  /* @include gaua.js */
  /* @include pottoka.js */
  /* @include sekretuak.js */
  /* @include heura.js */
  /* @include tximista.js */
  /* @include jentilak.js */
  /* @include enara.js */
  /* @include zerua.js */
  /* @include odei.js */
  /* @include herria.js */
  /* @include ispilua.js */
  /* @include herensuge.js */
  /* @include ahotsak.js */
  /* @include film.js */
  /* @include deiak.js */
  /* @include prologoa.js */
  /* @include hautsa.js */
  /* @include seaska.js */
  /* @include ametsa.js */
  /* @include inguma.js */
  /* @include aurpegia.js */
  /* @include izenburua.js */
  /* @include oroitzapenak.js */
  /* @include anboto.js */
  function musicLevel() {
    if (!started || cinematic) return 0;
    if (BOSS.on || MINI.e || MINI.other) return 3;
    return typeof combatLevel === "function" ? combatLevel() : 1;
  }
  let stepAcc = 0;
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {}
  }
  function notify(a, b, d = 6) {
    const s = L(a, b);
    $("subtitle").textContent = s;
    /* irakurtzeko adina bakarrik (2.2-4.5 s): mezuak ez dira pantailan geratzen */
    subTimer = Math.min(d, clamp(1.6 + s.length / 26, 2.2, 4.5));
    $("subtitle").style.opacity = 1;
  }
  /* HUD ISILA: helburua, lekua eta garaia aldatzean agertzen dira, eta 7 s-ren buruan desagertu
     (zenbakiak, distantziak adibidez, ez dira aldaketatzat hartzen) */
  const HUDQ = { goal: "", place: "", phaseHud: "", t: { goal: 0, place: 0, phaseHud: 0 } };
  function hudShow(id, text) {
    const k = String(text).replace(/[\d.,]+/g, "#");
    if (HUDQ[id] === k) return;
    HUDQ[id] = k;
    HUDQ.t[id] = 7;
    $(id).classList.remove("quiet");
  }
  function hudQuiet(dt) {
    for (const id in HUDQ.t) {
      if (HUDQ.t[id] <= 0) continue;
      HUDQ.t[id] -= dt;
      if (HUDQ.t[id] <= 0) $(id).classList.add("quiet");
    }
  }
  function title(a, b) {
    $("chapterTitle").textContent = L(a, b);
    titleTimer = 3.6;
    $("chapterTitle").style.opacity = 1;
  }
  /* gune berria: izena eta deskribapena txartel bakarrean (lehen bisitan bakarrik) */
  function areaTitle(name, desc) {
    const el = $("chapterTitle");
    el.textContent = name;
    if (desc) {
      const d = document.createElement("em");
      d.textContent = L(desc);
      el.appendChild(d);
    }
    titleTimer = 3.4;
    el.style.opacity = 1;
  }
  function clearInput() {
    jumpHeld = false;
    input.x = input.z = 0;
    input.keys = {};
    $("knob").style.transform = "";
    jumpBuffer = 0;
    /* sorginkeria: botoia askatuta (INDARRA ez da eszena baten ondoren jaurtitzen) */
    ATK.hold = false;
    if (MAG.charging) castStop();
    MAG.charging = false;
    MAG.charge = 0;
    MAG.holdT = 0;
  }
  function dialog(s, a, b, ea, eb, choices) {
    paused = true;
    clearInput();
    $("speaker").textContent = s;
    $("title").textContent = L(a, b);
    $("text").textContent = L(ea, eb);
    $("choices").replaceChildren();
    (choices || [[L("JARRAITU", "CONTINUAR"), () => {}]]).forEach(([label, fn]) => {
      const bt = document.createElement("button");
      bt.className = "primary";
      bt.textContent = label;
      bt.onclick = () => {
        $("overlay").hidden = true;
        paused = !started;
        fn();
      };
      $("choices").appendChild(bt);
    });
    $("overlay").hidden = false;
  }
  function note(f, t = 0.4, v = 0.035, type = "sine") {
    SND.note(f, t, v, type);
  }
  function chord() {
    SND.chord();
  }
  function audioStart() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      SND.init(audio);
    } catch {}
  }
  function music(dt) {
    /* musika SND.update()-k programatzen du begiztan (ikus loop) */
  }
  const mats = new Map();
  function material(c, em = 0) {
    const key = c + em;
    if (!mats.has(key))
      mats.set(
        key,
        new T.MeshStandardMaterial({
          color: new T.Color(c).convertSRGBToLinear(),
          emissive: new T.Color(c).convertSRGBToLinear(),
          emissiveIntensity: em,
          roughness: 0.83,
        }),
      );
    return mats.get(key);
  }
  /* BP: eraikitzen ari den zonaren taldea (bestela eszena) — zona bakoitza bere taldean */
  let BP = null;
  function obj(geo, mat, parent = BP || scene) {
    const m = new T.Mesh(geo, typeof mat === "string" ? material(mat) : mat);
    parent.add(m);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function box(x, y, z, w, h, d, c, parent = BP || scene) {
    const m = obj(new T.BoxGeometry(w, h, d), c, parent);
    m.position.set(x, y, z);
    return m;
  }
  function orb(x, y, z, r, c, parent = BP || scene) {
    const m = obj(new T.IcosahedronGeometry(r, 1), material(c, 1), parent);
    m.position.set(x, y, z);
    return m;
  }
  function ring(x, y, z, r, c, parent = BP || scene) {
    const m = obj(new T.TorusGeometry(r, 0.065, 6, 64), material(c, 0.65), parent);
    m.position.set(x, y, z);
    m.rotation.x = -PI / 2;
    return m;
  }
  let glowTexture, groundTexture, pathTexture;
  function textures() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#c6c8c0";
    g.fillRect(0, 0, 256, 256);
    let seed = 9127;
    const r = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 15000; i++) {
      const n = 130 + r() * 120;
      g.fillStyle = "rgba(" + n + "," + n + "," + n + ",.17)";
      g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 3);
    }
    groundTexture = new T.CanvasTexture(c);
    groundTexture.wrapS = groundTexture.wrapT = T.RepeatWrapping;
    groundTexture.repeat.set(5, 5);
    const p = document.createElement("canvas");
    p.width = p.height = 256;
    const ctx = p.getContext("2d");
    ctx.fillStyle = "#6d7779";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++)
      for (let x = -1; x < 9; x++) {
        let px = x * 32 + (y % 2) * 16,
          py = y * 32;
        const n = 145 + r() * 35;
        ctx.fillStyle = "rgb(" + n + "," + (n + 5) + "," + (n + 4) + ")";
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, 28, 28, 5);
        ctx.fill();
        ctx.strokeStyle = "#d2d1bb55";
        ctx.stroke();
      }
    pathTexture = new T.CanvasTexture(p);
    pathTexture.wrapS = pathTexture.wrapT = T.RepeatWrapping;
    pathTexture.repeat.set(1, 6);
  }
  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d"),
      grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.15, "#ffffffaf");
    grad.addColorStop(0.4, "#ffffff35");
    grad.addColorStop(1, "#ffffff00");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  function glow(x, y, z, c, s = 4) {
    const m = new T.Sprite(
      new T.SpriteMaterial({
        map: glowTexture,
        color: c,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        opacity: 0.6,
      }),
    );
    m.position.set(x, y, z);
    m.scale.set(s, s, 1);
    (BP || scene).add(m);
    glows.push(m);
    return m;
  }
  /* SkeletonUtils.clone (three r128 adibideetatik): hezurdun sareak hezurdura propioarekin klonatu */
  function cloneSkinned(source) {
    const src = new Map(),
      dst = new Map(),
      clone = source.clone();
    (function walk(a, b) {
      src.set(b, a);
      dst.set(a, b);
      for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]);
    })(source, clone);
    clone.traverse((n) => {
      if (!n.isSkinnedMesh) return;
      const s = src.get(n);
      n.skeleton = s.skeleton.clone();
      n.bindMatrix.copy(s.bindMatrix);
      n.skeleton.bones = s.skeleton.bones.map((b) => dst.get(b));
      n.bind(n.skeleton, n.bindMatrix);
    });
    return clone;
  }
  /* props.glb-ko modeloak izenez (KayKit, CC0): herria, natura eta leizeko piezak */
  const PROP = {};
  function model(name, x, y, z, height, angle = 0, parent = BP || scene) {
    const base = PROP[name];
    if (!base) throw new Error("modelorik ez: " + name);
    const m = base.clone(true);
    const bb = new T.Box3().setFromObject(m),
      size = bb.getSize(new T.Vector3());
    const s = height / (name.startsWith("rock_") ? Math.max(size.x, size.z) : size.y);
    m.scale.multiplyScalar(s);
    m.position.set(x, y - bb.min.y * s, z);
    m.rotation.y = angle;
    parent.add(m);
    m.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    if (name.startsWith("building_") && name !== "building_destroyed" && name !== "building_bridge_A") {
      const r = Math.min(size.x, size.z) * s * 0.36;
      solids.push({ x, z, r, h: height, y, pillar: true });
      occluder(m, x, y, z, Math.max(size.x, size.z) * s * 0.42, height);
    }
    return m;
  }
  function bridge(x, z, y, w, d, p, moving = false) {
    let group = new T.Group();
    (BP || scene).add(group);
    group.position.set(x, y, z);
    const c = p === 0 ? "#bba17b" : "#618eaa";
    box(0, -0.24, 0, w, 0.48, d, c, group);
    for (let i = 0; i < 5; i++) box((i / 4 - 0.5) * w, -0.005, 0, 0.055, 0.025, d, "#e1c8a0", group);
    for (const side of [-1, 1]) {
      box(
        side * (w / 2 - 0.2),
        0.05,
        0,
        0.07,
        0.12,
        d,
        p === 0 ? material("#ffc484", 0.8) : material("#9de9e9", 0.8),
        group,
      );
    }
    const ghost = box(
      x,
      y - 0.24,
      z,
      w,
      0.48,
      d,
      new T.MeshBasicMaterial({
        color: p === 0 ? "#efc794" : "#88dded",
        wireframe: true,
        transparent: true,
        opacity: 0.16,
      }),
    );
    ghost.castShadow = false;
    const P = { x, z, y, w, d, phase: p, m: group, ghost, moving, baseX: x, baseZ: z, dx: 0, dz: 0 };
    platforms.push(P);
    phaseObjects.push(P);
    return P;
  }
  function walkway(ax, az, bx, bz, y, width = 2) {
    let len = Math.hypot(bx - ax, bz - az);
    const m = box(
      (ax + bx) / 2,
      y + 0.03,
      (az + bz) / 2,
      width,
      0.06,
      len,
      new T.MeshStandardMaterial({
        color: "#d7d1b7",
        map: pathTexture,
        bumpMap: pathTexture,
        bumpScale: 0.03,
        roughness: 0.9,
      }),
    );
    m.rotation.y = Math.atan2(bx - ax, bz - az);
    return m;
  }
  /* Amaiurren argia (leizean pizten da): sorgin-kriseilua */
  let playerLight = null;
  function build() {
    scene = new T.Scene();
    scene.background = new T.Color("#9fb9cc");
    scene.fog = new T.Fog("#9fb9cc", 130, 560);
    camera = new T.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 1400);
    renderer = new T.WebGLRenderer({ canvas: $("view"), antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality ? 1.5 : 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    if (EG) {
      EG.setRenderer(renderer);
      EG.track(scene, renderer, camera);
    }
    ambient = new T.HemisphereLight("#c8dfe8", "#3a4960", 0.8);
    scene.add(ambient);
    sun = new T.DirectionalLight("#ffddb3", 1.8);
    sun.position.set(-35, 65, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality ? 2048 : 1024, quality ? 2048 : 1024);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
    sun.shadow.normalBias = 0.08;
    sun.shadow.bias = -0.00025;
    scene.add(sun);
    scene.add(sun.target);
    glowTexture = makeGlowTexture();
    textures();
    ATMO.skyPast = skyTex("sky_dusk");
    ATMO.skyNow = skyTex("sky_day");
    ATMO.skyNight = skyTex("sky_night");
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        blend: { value: 1 },
        tPast: { value: ATMO.skyPast },
        tNow: { value: ATMO.skyNow },
        useTex: { value: ATMO.skyPast && ATMO.skyNow ? 1 : 0 },
        uFog: { value: new T.Color("#9fb9cc") },
        tNight: { value: ATMO.skyNight },
        useNight: { value: ATMO.skyNight ? 1 : 0 },
        uNight: { value: 0 },
        uTw: { value: 0 },
      },
      vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: [
        "varying vec3 p;uniform float blend,useTex,uNight,useNight,uTw;uniform sampler2D tPast,tNow,tNight;uniform vec3 uFog;",
        "vec2 eq(vec3 d){return vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5);}",
        "void main(){vec3 d=normalize(p);float t=pow(max(d.y,0.),.6);",
        "vec3 day=mix(vec3(.82,.71,.55),vec3(.23,.47,.59),t);vec3 night=mix(vec3(.74,.85,.94),vec3(.27,.53,.86),t);",
        "vec3 c=mix(day,night,blend);",
        "if(useTex>.5){vec2 uv=eq(d);c=mix(texture2D(tPast,uv).rgb,texture2D(tNow,uv).rgb,smoothstep(0.,1.,blend));}",
        "c=mix(c,c*vec3(1.2,.8,.7)+vec3(.07,.015,0.),uTw*(1.-t)*.75);",
        "vec3 nc=useNight>.5?texture2D(tNight,eq(d)).rgb*1.35:mix(vec3(.012,.02,.05),vec3(.03,.05,.11),t);",
        "c=mix(c,nc,uNight);",
        "c=mix(c,uFog,smoothstep(.035,-.015,d.y));",
        "gl_FragColor=vec4(c,1.);}",
      ].join("\n"),
    });
    sky = obj(new T.SphereGeometry(450, 32, 20), skyMat, scene);
    sky.castShadow = sky.receiveShadow = false;
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    if (EG && ATMO.skyPast && ATMO.skyNow) {
      ATMO.fogPast.copy(EG.horizon("dusk", 0.45)).lerp(new T.Color("#7a6a62"), 0.25);
      ATMO.fogNow.copy(EG.horizon("day", 0.45)).lerp(new T.Color("#b9d3ea"), 0.3);
      ATMO.envPast = EG.environment(renderer, scene, "dusk");
      ATMO.envNow = EG.environment(renderer, scene, "day");
      if (ATMO.skyNight) ATMO.envNight = EG.environment(renderer, scene, "night");
      scene.environment = ATMO.envNow;
    }
    sea = obj(new T.PlaneGeometry(3000, 3000, 1, 1), seaMaterial(), scene);
    sea.receiveShadow = sea.castShadow = false;
    sea.rotation.x = -PI / 2;
    sea.position.y = -8.5;
    for (let i = 0; i < 10; i++) {
      const g = new T.BufferGeometry().setFromPoints([new T.Vector3(-0.5, 0, 0.2), new T.Vector3(0, 0, 0), new T.Vector3(0.5, 0, 0.2)]);
      const bird = new T.Line(g, new T.LineBasicMaterial({ color: "#243a4d" }));
      scene.add(bird);
      birds.push(bird);
    }
    footRing = ring(0, 0.05, 0, 0.45, "#d7ecdd", scene);
    footRing.material = new T.MeshBasicMaterial({ color: "#172c3c", transparent: true, opacity: 0.25 });
    footRing.castShadow = false;
    timeDust();
    /* Amaiur (KayKit Mage, CC0) */
    hero = new T.Group();
    scene.add(hero);
    actor = models.mage.scene;
    actor.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
      if (/Spellbook|2H_Staff/.test(n.name)) n.visible = false;
    });
    actor.scale.setScalar(1.15);
    hero.add(actor);
    /* aurpegi berria (aurpegia.js): begi handiak, bekainak, pikortak; kliskak eta ahoa */
    faceBuild();
    mixer = new T.AnimationMixer(actor);
    models.mage.actions = {};
    for (const a of models.mage.animations) models.mage.actions[a.name] = mixer.clipAction(a);
    animate("Idle");
    playerLight = new T.PointLight("#ffd2a0", 0, 15, 1.7);
    playerLight.position.set(0.4, 2.3, 0.6);
    hero.add(playerLight);
    magicInit();
    heuraInit();
    wingsBuild();
    orb(0.5, 1, 0, 0.12, "#ffd3a0", hero);
    glow(0, 1, 0, "#f0ca8f", 1.2).userData.player = true;
    fxInit();
    lockInit();
    chainInit();
    /* zonak: harana eta lehen leizea (bakoitza bere taldean) */
    buildIbarra();
    buildNpcs();
    lifeInit();
    questsInit();
    gauaInit();
    npcsNightStart();
    buildPottoka();
    secretsInit();
    buildCraft("ibarra");
    buildRunePuzzles("ibarra");
    buildDungeon();
    buildCraft("leizea");
    buildRunePuzzles("leizea");
    zoneBuild("leizea");
    basajaunBuild();
    /* bigarren eta hirugarren leizeak */
    buildLamia();
    buildRunePuzzles("lamia");
    buildTartalo();
    buildRunePuzzles("tartalo");
    /* laugarren leizea: JENTILBARATZA (eta haraneko trikuharria) */
    buildJentil();
    buildRunePuzzles("jentil");
    dolmenBuild();
    /* bosgarrena: JENTILEN ZERUA (eta haraneko ortzadarra) */
    buildZerua();
    buildRunePuzzles("zerua");
    ortzadarBuild();
    /* seigarrena: HERENSUGEAREN HAITZULOA (Odeiren hodeia zeruan) */
    buildHerensuge();
    /* herria: etxe-izenak eta ateak; Amaiurren etxea (ITURRALDE) barrutik */
    herriaInit();
    buildEtxea();
    /* zazpigarrena: AMETSA (Amaiurren ametsa, Ingumaren etxea) */
    buildAmetsa();
    BP = null;
    zoneActivate(DGS[saved.zone] ? saved.zone : "ibarra");
    const sp = spawnPoint();
    teleport(sp.x, sp.z, sp.y);
    phase = 1;
    setPhaseVisual(true);
    updateWorld(0);
    camera.position.set(46, 30, 78);
    camera.lookAt(0, 2, 18);
  }
  /* non agertu: gordetako kontrol-puntua (zona berean) edo zonaren sarrera */
  function spawnPoint() {
    const c = saved.cp;
    if (c && c.zone === ZONE.cur) return c;
    return DGS[ZONE.cur] ? DGS[ZONE.cur].entry : ZONES.ibarra.spawn;
  }
  function animate(name) {
    if (activeAnimation === name || !models.mage.actions[name]) return;
    const old = models.mage.actions[activeAnimation],
      next = models.mage.actions[name];
    next.reset().fadeIn(0.15).play();
    if (old) old.fadeOut(0.15);
    activeAnimation = name;
  }
  /* plataformak: elipseak (rx, rz) edo kaxak (w, d), aukeran biratuta (rot) eta arrapala gisa
     (ramp: y0 → y1 tokiko z ardatzean, A muturretik B muturrera) */
  function local(s, x, z) {
    const dx = x - s.x,
      dz = z - s.z;
    if (!s.rot) return [dx, dz];
    const c = Math.cos(s.rot),
      n = Math.sin(s.rot);
    return [dx * c - dz * n, dx * n + dz * c];
  }
  function contains(s, x, z, margin = 0) {
    if (s.rx) return ((x - s.x) / (s.rx + margin)) ** 2 + ((z - s.z) / (s.rz + margin)) ** 2 <= 1 && (!s.mask || s.mask(x, z));
    const [lx, lz] = local(s, x, z);
    return Math.abs(lx) <= s.w / 2 + margin && Math.abs(lz) <= s.d / 2 + margin && (!s.mask || s.mask(x, z));
  }
  function topY(s, x, z) {
    if (s.hf) return s.hf(x, z);
    if (!s.ramp) return s.y;
    const lz = local(s, x, z)[1];
    return mix(s.ramp[0], s.ramp[1], clamp(lz / s.d + 0.5, 0, 1));
  }
  function support(x, z, feet, ph = phase) {
    let best = null,
      by = -1e9;
    for (const s of platforms) {
      if (s.off || (s.phase !== -1 && s.phase !== ph) || !contains(s, x, z, -0.07)) continue;
      const y = topY(s, x, z);
      if (y <= feet + 0.4 && y > by) {
        best = s;
        by = y;
      }
    }
    return best;
  }
  function teleport(x, z, y) {
    climbDrop();
    glideStop();
    jumpBuffer = 0;
    groundGrace = 0;
    /* lur irregularra: azpiko lurrera (edo gaineko gainazalera, gehienez 2.5 m) itsatsi */
    const g = support(x, z, y + 2.5);
    if (g) y = Math.max(y, topY(g, x, z));
    P.x = x;
    P.z = z;
    P.y = y;
    P.vx = P.vz = P.vy = 0;
    P.grounded = true;
    P.jumps = 0;
    P.dashReady = true;
    P.shiftAir = false;
    P.dashT = 0;
    P.airSpeed = 7.7;
    P.wallGrace = P.wallLock = 0;
    P.platform = support(x, z, y);
    hero.position.set(x, y, z);
  }
  /* bizitzak amaituta: zonaren azken kontrol-puntura (herria edo leizearen sarrera) */
  function returnCheckpoint() {
    ponyDismount(true);
    magicReset();
    if (CRAFT.held) craftRelease();
    craftExit();
    roomReset();
    const cp = checkpoint();
    if (cp.zone !== ZONE.cur) enterZone(cp.zone, cp, true);
    else teleport(cp.x, cp.z, cp.y);
    P.hp = P.maxHp;
    damageTime = 1;
    saved.deaths++;
    persist();
    shiftFlash = 0.7;
    FB.respawn();
    notify(L("Berriro. Orain badakizu bidea."), "", 2.3);
  }
  let hardFall = false;
  function fall(hard) {
    if (respawnTimer > 0) return;
    ponyDismount(true);
    climbDrop();
    glideStop();
    mirrorLower();
    hardFall = !!hard;
    respawnTimer = hard ? 0.6 : 0.38;
    P.vx = P.vz = 0;
  }
  function jump() {
    if (!started || paused || TXALA.on) return;
    jumpBuffer = 0.18;
  }
  function dash() {
    if (!started || paused || TXALA.on || !P.dashReady || P.dashT > 0 || respawnTimer || P.riding || P.climb) return;
    if (!PRO.can.dash) return proNope("dash");
    let d = direction();
    if (Math.hypot(d.x, d.z) < 0.1) d = { x: Math.sin(P.angle), z: Math.cos(P.angle) };
    const n = Math.hypot(d.x, d.z) || 1;
    P.dashX = d.x / n;
    P.dashZ = d.z / n;
    P.dashT = saved.assist ? 0.32 : 0.25;
    P.dashes = Math.max(0, P.dashes - 1);
    P.dashReady = P.dashes > 0;
    P.vy = 0;
    P.grounded = false;
    P.angle = Math.atan2(P.dashX, P.dashZ);
    FB.dash();
    spawnTrail();
    coachDone("dash");
  }
  function switchPhase() {
    if (!started || paused || TXALA.on || phaseCooldown > 0 || respawnTimer) return;
    if (!PRO.can.phase) return proNope("phase");
    phase = 1 - phase;
    phaseCooldown = 0.22;
    shiftFlash = 1;
    if (!P.grounded && !P.shiftAir) {
      coachDone("airshift");
      P.shiftAir = true;
      P.dashReady = true;
      P.dashes = Math.max(P.dashes, 1);
      P.vy = Math.max(P.vy, 2.3);
      notify("Beste une bat. Beste bultzada bat.", "Otro instante. Otro impulso.", 1.7);
    }
    setPhaseVisual();
    FB.shift();
    eraWave();
    coachDone("shift");
    if (!P.platform || P.platform.phase !== -1) {
      P.platform = null;
      P.grounded = false;
    }
    hud();
  }
  function setPhaseVisual(immediate = false) {
    for (const b of eraBuildings) {
      b.past.visible = phase === 0;
      b.present.visible = phase === 1;
    }
    for (const s of phaseObjects) {
      s.m.visible = s.phase === -1 || s.phase === phase;
      s.ghost.visible = s.phase !== -1 && s.phase !== phase;
    }
    for (const h of hazards) h.beam.visible = h.phase === phase;
    phaseLabel();
    $("phaseMark").style.background = phase ? "#9ae3e555" : "#f1c58166";
    if (immediate) phaseBlend = phase;
  }
  function direction() {
    let x =
        (input.keys.KeyD || input.keys.ArrowRight ? 1 : 0) -
        (input.keys.KeyA || input.keys.ArrowLeft ? 1 : 0) +
        input.x,
      z = (input.keys.KeyS || input.keys.ArrowDown ? 1 : 0) - (input.keys.KeyW || input.keys.ArrowUp ? 1 : 0) + input.z;
    let n = Math.hypot(x, z);
    if (n > 1) {
      x /= n;
      z /= n;
    }
    /* makila → mundua, kameraren biraketaren arabera ("gora" = kameratik urrun) */
    const wx = x * 0.83 + z * 0.557,
      wz = -x * 0.557 + z * 0.83;
    if (!CAM.yawS) return { x: wx, z: wz };
    const c = Math.cos(CAM.yawS),
      sn = Math.sin(CAM.yawS);
    return { x: wx * c + wz * sn, z: -wx * sn + wz * c };
  }
  function spawnTrail() {
    const m = obj(
      new T.IcosahedronGeometry(0.4, 0),
      new T.MeshBasicMaterial({
        color: phase ? "#a7f4f0" : "#ffe0a1",
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    m.scale.set(0.8, 1.8, 0.8);
    m.position.set(P.x, P.y + 1, P.z);
    m.castShadow = false;
    trails.push({ m, life: 0.3 });
  }
  function move(dt) {
    groundGrace = P.grounded ? 0.14 : Math.max(0, groundGrace - dt);
    jumpBuffer = Math.max(0, jumpBuffer - dt);
    heuraTick(dt);
    /* HEURA: hormari helduta (heura.js arduratzen da) */
    if (P.climb && climbUpdate(dt)) return;
    let d = direction(),
      len = Math.hypot(d.x, d.z),
      surf = !!(input.keys.ShiftLeft || input.keys.ShiftRight) || (mobile && Math.hypot(input.x, input.z) > 0.88);
    /* eraikitzean: pieza eskuan → geldirik; mugitzen hasiz gero, eraikuntza-modutik irten */
    if (CRAFT.on && !CRAFT.held && len > 0.3) craftExit();
    /* eskuan pieza bat edo EGUZKI-ISPILUA altxatuta: geldirik (makilak apuntatzen du) */
    if (CRAFT.held || MIR.on) {
      d = { x: 0, z: 0 };
      len = 0;
    }
    const groundSpeed = P.riding ? (surf ? 19 : 12.5) : surf ? 12.8 : 7.7;
    /* sorginkeria kargatzean edo biraka: mugimendu motelagoa */
    const atkSlow = MAG.charging ? 0.58 : MAG.spinT < 0.3 ? 0.45 : 1;
    const speed = (P.grounded ? groundSpeed : Math.max(groundSpeed, P.airSpeed)) * atkSlow;
    P.wallGrace = Math.max(0, P.wallGrace - dt);
    P.wallLock = Math.max(0, P.wallLock - dt);
    if (P.platform?.moving && P.grounded) {
      P.x += P.platform.dx;
      P.z += P.platform.dz;
    }
    if (jumpBuffer > 0 && (P.riding ? P.grounded || groundGrace > 0 : P.grounded || groundGrace > 0 || P.jumps < 2 || P.wallGrace > 0)) {
      const wallKick = !P.riding && !P.grounded && groundGrace <= 0 && P.jumps >= 2 && P.wallGrace > 0;
      if (wallKick) {
        P.vx = P.wallX * 12;
        P.vz = P.wallZ * 12;
        P.wallLock = 0.16;
        P.jumps = 1;
        spawnTrail();
      } else P.jumps = P.grounded || groundGrace > 0 ? 1 : P.jumps + 1;
      P.airSpeed = Math.min(P.riding ? 20 : 14, Math.max(speed, Math.hypot(P.vx, P.vz)));
      P.vy = P.riding ? 11.6 : P.jumps === 2 ? 11.4 : 10.6;
      if (P.riding) P.jumps = 2;
      P.dashT = 0;
      if (P.jumps === 2) spawnTrail();
      P.grounded = false;
      P.platform = null;
      jumpBuffer = groundGrace = 0;
      FB.jump(P.jumps === 2 || wallKick ? 2 : 1);
      if (P.jumps === 2) coachDone("jump");
    }
    /* ENARA: jauzi bikoitzaren ondoren JAUZIari eutsi → planeatu */
    glideCheck();
    if (CHAIN.state === "pull") {
      /* SUGAARREN KATEA: eraztunerantz tiraka (grabitaterik gabe) */
      const v = chainPullVel();
      P.vx = v.x;
      P.vy = v.y;
      P.vz = v.z;
      P.dashT = 0;
    } else if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashX * 24;
      P.vz = P.dashZ * 24;
      P.vy = 0;
      if (frame % 3 === 0) spawnTrail();
    } else {
      /* izotzean: marruskadura txikia (irristatu) */
      const t = 1 - Math.exp(-dt * (P.grounded ? (P.platform && P.platform.ice ? 2.4 : 22) : len > 0.1 ? 6.5 : 3));
      if (P.riding) {
        /* POTTOKA: inertzia eta biratze mugatua (zaldi baten sentsazioa) */
        const want = len > 0.12 ? Math.atan2(d.x, d.z) : P.angle;
        if (P.grounded) P.angle += Math.atan2(Math.sin(want - P.angle), Math.cos(want - P.angle)) * Math.min(1, dt * 4.2);
        const sp = P.grounded ? speed * Math.min(1, len) : Math.hypot(P.vx, P.vz),
          k = 1 - Math.exp(-dt * (P.grounded ? (P.platform && P.platform.ice ? 1.2 : 2.8) : 0.4));
        P.vx = mix(P.vx, Math.sin(P.angle) * sp, k);
        P.vz = mix(P.vz, Math.cos(P.angle) * sp, k);
      } else if (P.wallLock <= 0) {
        P.vx = mix(P.vx, d.x * speed, t);
        P.vz = mix(P.vz, d.z * speed, t);
      }
      P.vy -= 25 * dt;
    }
    if (P.glide && CHAIN.state !== "pull" && P.dashT <= 0) glideVel(dt, d, len);
    else if (!P.grounded && CHAIN.state !== "pull" && P.dashT <= 0) {
      /* hegorik gabe, haize-zutabean: erorketa leunagoa */
      const up = updraftAt(P.x, P.y, P.z);
      if (up > 0 && P.vy < 0) P.vy = Math.max(P.vy, -6);
    }
    const px = P.x,
      pz = P.z,
      py = P.y;
    /* P.wx / P.wz: kanpoko haizea (Odeiren bolada) */
    let nx = P.x + (P.vx + (P.wx || 0)) * dt,
      nz = P.z + (P.vz + (P.wz || 0)) * dt,
      ny = P.y + P.vy * dt;
    /* gelak itxita (borroka) edo zonaren mugak */
    [nx, nz] = roomCollide(px, pz, nx, nz, py);
    /* haranean: malda handiegiak horma dira */
    if (ZONE.cur === "ibarra") [nx, nz] = terrainCollide(px, pz, py, nx, nz);
    // Raised platforms have sides. Falling through an absent platform is intentional.
    for (const o of solids) {
      const top = o.y + (phase === 0 || o.pillar ? o.h : o.h * 0.19);
      let dx = nx - o.x,
        dz = nz - o.z,
        dd = Math.hypot(dx, dz);
      if (dd < o.r + 0.27 && py < top - 0.2) {
        if (dd < 0.001) {
          dx = 1;
          dd = 1;
        }
        P.wallGrace = o.slick ? 0 : 0.15;
        P.wallX = dx / dd;
        P.wallZ = dz / dd;
        nx = o.x + (dx / dd) * (o.r + 0.27);
        nz = o.z + (dz / dd) * (o.r + 0.27);
      }
    }
    for (const s of platforms) {
      if (s.off || (s.phase !== -1 && s.phase !== phase)) continue;
      const sy = topY(s, nx, nz);
      if (contains(s, nx, nz, 0.18) && !contains(s, px, pz, 0.18) && py < sy - 0.32 && py + 1.8 > (s.bottom ?? sy - 0.5)) {
        P.wallGrace = s.slick ? 0 : 0.15;
        const wn = Math.hypot(px - s.x, pz - s.z) || 1;
        P.wallX = (px - s.x) / wn;
        P.wallZ = (pz - s.z) / wn;
        nx = px;
        nz = pz;
        P.vx = P.vz = 0;
      }
    }
    let landing = null,
      landY = -1e9;
    if (P.vy <= 0)
      for (const s of platforms) {
        if (s.off || (s.phase !== -1 && s.phase !== phase) || !contains(s, nx, nz, 0.12)) continue;
        const sy = topY(s, nx, nz);
        if (py >= sy - 0.22 && ny <= sy + 0.04 && sy > landY) {
          landing = s;
          landY = sy;
        }
      }
    /* maldan behera: lurrean bazegoen eta jauzirik ez, azpiko lurrera itsatsi (ez "hegan" egin) */
    if (!landing && P.grounded && P.vy <= 0 && P.dashT <= 0) {
      const s = support(nx, nz, py);
      if (s) {
        const sy = topY(s, nx, nz);
        if (py - sy < 0.5) {
          landing = s;
          landY = sy;
        }
      }
    }
    const wasGrounded = P.grounded,
      impact = -P.vy;
    P.grounded = !!landing;
    if (landing && !wasGrounded) FB.land(impact);
    if (landing) {
      P.airSpeed = groundSpeed;
      P.jumps = 0;
      ny = landY;
      P.vy = 0;
      if (P.dashT <= 0) {
        P.dashReady = true;
        P.dashes = saved.boons.includes("dash") ? 2 : 1;
      }
      P.shiftAir = false;
      P.platform = landing;
      P.glide = false;
    } else P.platform = null;
    P.x = nx;
    P.z = nz;
    P.y = ny;
    P.travel += Math.hypot(nx - px, nz - pz);
    if (P.grounded && P.dashT <= 0) {
      stepAcc += Math.hypot(nx - px, nz - pz);
      if (stepAcc > 1.75) {
        stepAcc = 0;
        FB.step();
      }
    }
    /* sorginkeria jaurtitzean, helburuari begira (hankak korrika jarraitzen dute);
       helburua finkatuta: beti hari begira (alboetara mugitzen da) */
    const lockT = LOCK.target && !P.riding && P.dashT <= 0 && CHAIN.state === "idle" ? lockPos(LOCK.target) : null;
    if (lockT) {
      const a = Math.atan2(lockT.x - P.x, lockT.z - P.z);
      P.angle += Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle)) * Math.min(1, dt * 14);
    } else if (len > 0.12 && !P.riding && P.dashT <= 0 && MAG.aimT <= 0) {
      const a = Math.atan2(d.x, d.z);
      P.angle += Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle)) * Math.min(1, dt * 18);
    }
    hero.position.set(P.x, P.y + riderY(), P.z);
    hero.rotation.y = mix(hero.rotation.y, hero.rotation.y + Math.atan2(Math.sin(P.angle - hero.rotation.y), Math.cos(P.angle - hero.rotation.y)), Math.min(1, dt * 30));
    hero.visible = damageTime <= 0 || Math.floor(damageTime * 15) % 2 === 0;
    /* finkatuta eta mugitzen: alboetara (strafe) edo atzeraka */
    let run = "Running_A";
    if (lockT && len > 0.15) {
      const fx = Math.sin(P.angle),
        fz = Math.cos(P.angle),
        fwd = (d.x * fx + d.z * fz) / len,
        side = (d.x * fz - d.z * fx) / len;
      run = fwd < -0.6 ? "Walking_Backwards" : Math.abs(side) > 0.55 ? (side > 0 ? "Running_Strafe_Left" : "Running_Strafe_Right") : "Running_A";
      if (!models.mage.actions[run]) run = "Running_A";
    }
    animate(
      P.riding
        ? "Idle"
        : CRAFT.held
        ? "Spellcast_Raise"
        : CHAIN.state === "pull"
          ? "Jump_Idle"
          : MAG.spinT < 0.5
            ? "2H_Melee_Attack_Spin"
            : P.dashT > 0
              ? "Dodge_Forward"
              : !P.grounded
                ? "Jump_Idle"
                : len > 0.15
                  ? run
                  : "Idle",
    );
    if (!P.climb && !P.glide) climbTry(d, len);
    glideVisual(dt);
    trackSafe(dt);
    if (P.y < ZONES[ZONE.cur].fallY) fall();
    /* gunea (herria, zelaiak, leizeko gela...): HUDaren izena eta helburuak */
    const ar = ZONE.cur === "ibarra" ? (P.grounded ? hubArea(P.x, P.z, P.y) : null) : landing?.area;
    if (ar && ar !== AREA.cur) enterArea(ar);
    /* itzal-marka: airean, azpiko plataforma erakutsi (3D plataformetan sakonera irakurtzeko) */
    const under = landing || support(P.x, P.z, P.y);
    footRing.visible = !!under;
    if (under) {
      const uy = landing ? landY : topY(under, P.x, P.z),
        h = Math.max(0, P.y - uy);
      footRing.position.set(P.x, uy + 0.035, P.z);
      footRing.scale.setScalar(1 + Math.min(1.2, h * 0.08));
      footRing.material.opacity = landing ? 0.25 : clamp(0.55 - h * 0.025, 0.2, 0.55);
    }
  }
  function takeHit() {
    if (damageTime > 0 || respawnTimer || P.dashT > 0) return;
    P.hp--;
    damageTime = 1.2;
    shiftFlash = 0.4;
    FB.hurt();
    haptic(45);
    hud();
    if (P.hp <= 0 && !potionSave()) fall(true);
  }
  function updateWorld(dt) {
    for (const s of phaseObjects)
      if (s.moving) {
        const oldx = s.x,
          oldz = s.z;
        s.motionTime = (s.motionTime || 0) + dt;
        s.x = s.baseX + Math.sin(s.motionTime * 0.65) * 2.1;
        s.dx = s.x - oldx;
        s.dz = s.z - oldz;
        s.m.position.x = s.ghost.position.x = s.x;
      }
    for (const h of hazards) {
      h.t += dt;
      h.beam.rotation.y = Math.sin(h.t * 0.6) * 0.7;
      const dx = P.x - h.x,
        dz = P.z - h.z,
        localX = dx * Math.cos(h.beam.rotation.y) - dz * Math.sin(h.beam.rotation.y),
        localZ = dx * Math.sin(h.beam.rotation.y) + dz * Math.cos(h.beam.rotation.y);
      if (
        phase === h.phase &&
        Math.abs(localX) < 6 &&
        Math.abs(localZ) < 0.42 &&
        Math.abs(P.y - h.y) < 1.3
      )
        takeHit();
    }
    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.life -= dt;
      t.m.material.opacity = Math.max(0, t.life);
      t.m.scale.multiplyScalar(0.98);
      if (t.life <= 0) {
        scene.remove(t.m);
        t.m.geometry.dispose();
        t.m.material.dispose();
        trails.splice(i, 1);
      }
    }
    phaseBlend = mix(phaseBlend, phase, 1 - Math.exp(-dt * 3.5));
    eraVisuals();
    echoUpdate(dt);
    for (let i = 0; i < birds.length; i++) {
      let b = birds[i],
        a = time * 0.07 + i;
      b.position.set(Math.cos(a) * (35 + i * 4), 24 + (i % 3) * 3, -40 + Math.sin(a) * 70);
      b.rotation.y = -a;
      b.rotation.z = Math.sin(time * 3 + i) * 0.12;
    }
    for (const g of glows) {
      if (g.userData.player) g.position.set(P.x + 0.5, P.y + 1, P.z);
      else if (g.userData.fall) g.material.opacity = 0.35 + Math.sin(time * 3 + g.position.x) * 0.08;
    }
    if (mixer) mixer.update(dt);
    /* testuinguruko ekintza (E / ekintza-botoia): hitz egin, ireki, jo... */
    near = actionHere();
    const pr = $("prompt");
    pr.hidden = !near || cinematic || TXALA.on;
    if (near) pr.textContent = kb("E / ") + near.label;
  }
  const GRASS = new T.Color("#829977").convertSRGBToLinear(),
    SNOW = new T.Color("#b9ccd5").convertSRGBToLinear();
  /* leizean: ilun eta hotza (oraina) edo epela (iragana); argia zuziek eta Amaiurren kriseiluak ematen dute */
  const CAVE_PAST = new T.Color("#140d09"),
    CAVE_NOW = new T.Color("#070b11");
  function eraVisuals() {
    sky.material.uniforms.blend.value = phaseBlend;
    sea.material.uniforms.blend.value = phaseBlend;
    sea.material.uniforms.clock.value = time;
    /* haranean elurra orbanka (negua hasten ari da), ez dena zuri */
    for (const m of terrainMats) m.color.copy(GRASS).lerp(SNOW, phaseBlend * 0.38);
    if (ZONES[ZONE.cur].outdoor) {
      sun.color.set(phaseBlend > 0.5 ? "#f3f7ff" : "#ffddb3");
      sun.intensity = mix(1.8, 1.95, phaseBlend);
      ambient.intensity = mix(0.86, 0.95, phaseBlend) * (scene.environment ? 0.55 : 1);
      scene.fog.color.copy(ATMO.fogPast).lerp(ATMO.fogNow, phaseBlend);
      /* zeruan ez dago gaurik (hodeien gainean, eguzkia beti); ametsean, beti gaua */
      if (ZONES[ZONE.cur].sky) {
        /* Anboto: ekaitz-gaua, egunsentira (AN.dawn) */
        DAY.k = ZONES[ZONE.cur].anboto ? 1 - AN.dawn * 0.9 : ZONES[ZONE.cur].dream ? 1 : 0;
        DAY.tw = ZONES[ZONE.cur].anboto ? 4 * DAY.k * (1 - DAY.k) : 0;
      }
      dayVisuals();
      if (ZONES[ZONE.cur].dream) dreamVisuals();
      else if (ZONES[ZONE.cur].anboto) anbotoVisuals();
      else if (ZONES[ZONE.cur].sky) skyVisuals();
    } else {
      sun.color.set(phaseBlend > 0.5 ? "#8fa9cc" : "#c08c5c");
      sun.intensity = 0.38;
      ambient.intensity = 0.5;
      scene.fog.color.copy(CAVE_PAST).lerp(CAVE_NOW, phaseBlend);
      /* etxean gauez: ilargi-argia leihotik; sutondoa itzalita badago, are ilunago */
      if (ZONE.cur === "etxea" && DAY.k > 0.5) {
        const cold = DGE.hearth && DGE.hearth.unlit;
        sun.color.set("#7f9fd8");
        sun.intensity = cold ? 0.22 : 0.3;
        ambient.intensity = cold ? 0.2 : 0.34;
      }
    }
    scene.background.copy(scene.fog.color);
    if (sky.material.uniforms.uFog) sky.material.uniforms.uFog.value.copy(scene.fog.color);
  }
  /* ==================================================================
     EKIN (E tekla edo ekintza-botoia) · une bakoitzean ekintza bakarra:
     hitz egin, kutxa ireki, atea, harri-danborra, txalaparta, jentil-harria.
     ================================================================== */
  function actionHere() {
    if (!started || cinematic || GET.on || TXALA.on || CRAFT.on || respawnTimer || P.climb) return null;
    if (RING.on && ringReach()) return { kind: "talk", label: L("ERANTZUN"), fn: deiaAnswer };
    const PA = proActionNear();
    if (PA) return PA;
    const AB = anbotoActionNear();
    if (AB) return AB;
    const N = npcNear();
    if (N) return { kind: "talk", label: L("HITZ EGIN"), fn: () => talkTo(N) };
    const OC = odeiCloudNear();
    if (OC) return OC;
    const C = chestNear();
    if (C) return { kind: "chest", label: L("IREKI"), fn: () => openChest(C) };
    const LC = lockedChestNear();
    if (LC) return { kind: "locked", label: L("ITXITA"), fn: () => notify(LC.lockedHint || L("Ezin da ireki… oraingoz."), "", 3.5) };
    if (ponyNear()) return { kind: "pony", label: L("IGO"), fn: ponyMount };
    const HN = hearthNear();
    if (HN) return { kind: "hearth", label: L("ATSEDEN"), fn: () => hearthRest(HN) };
    const HA = homeActionNear();
    if (HA) return HA;
    const AA = ametsaActionNear();
    if (AA) return AA;
    const SC = shortcutNear();
    if (SC) return SC;
    const MN = mirrorNear();
    if (MN) return { kind: "turn", label: L("BIRATU"), fn: () => mirrorTurn(MN) };
    const D = doorNear();
    if (D) return { kind: "door", label: D.kind === "boss" ? L("ATE HANDIA") : L("ATEA"), fn: () => tryDoor(D) };
    if (drumNear()) return { kind: "drum", label: L("ENTZUN"), fn: drumTalk };
    const E = echoNear();
    if (E) return { kind: "drum", label: L("ENTZUN"), fn: () => echoListen(E) };
    if (andereDoorNear()) return { kind: "door", label: L("ATEA"), fn: andereDoor };
    if (ZONE.cur === "ibarra") {
      if (P.riding) return { kind: "pony", label: L("JAITSI"), fn: () => ponyDismount() };
      const HD = houseDoorNear();
      if (HD) return houseAction(HD);
      const sp = TXALA.spots.find((s) => s.group === ZONES.ibarra.group && Math.hypot(s.x - P.x, s.z - P.z) < 3.4);
      if (sp && txalaKnown().length) return { kind: "txala", label: L("TXALAPARTA"), fn: txalaOpen };
      const S = HUB.stones.find((s) => !s.awake && Math.hypot(s.x - P.x, s.z - P.z) < (s.gate ? 9 : 4.5));
      if (S)
        return saved.rhythms.includes("esnatu")
          ? { kind: "txala", label: L("ESNATU"), fn: txalaOpen }
          : { kind: "stone", label: L("JENTIL-HARRIA"), fn: () => notify(L("Jentil-harri bat, lo. Erritmo zahar batek esnatuko luke… Plazako bikiek dakite."), "", 4) };
    }
    return null;
  }
  function interact() {
    if (!started || paused || cinematic) return;
    const a = actionHere();
    if (a) return a.fn();
    const Z = zoneHere();
    if (Z && !Z.solved) return craftToggle();
    powerMenu();
  }
  /* sendabelar-botila: bizitzak amaitzean, bizirik itzultzen zaitu */
  function potionSave() {
    if (!(saved.potions > 0)) return false;
    saved.potions--;
    P.hp = P.maxHp;
    damageTime = 1.4;
    persist();
    SND.heal();
    fxRing(P.x, P.y + 0.2, P.z, "#9dffc4", 5, 1);
    fxBurst(P.x, P.y + 1, P.z, { n: 40, speed: 4, up: 3, life: 1, size: 0.3, color: "#9dffc4", grav: -1 });
    title("SENDABELARRA!", "");
    notify(L("Sendabelar-botilak bizirik itzuli zaitu. Geratzen dira: ") + saved.potions, "", 3);
    hud();
    return true;
  }
  function cameraUpdate(dt) {
    const ov = window.__camOverride; /* probetarako soilik (?test) */
    if (ov) {
      camera.position.set(...ov.pos);
      camera.lookAt(...ov.look);
      return;
    }
    /* aurrera begiratu: abiadura mugatua (bultzadak eta kateak ez dute kamera aurrera-atzera astintzen) */
    const lv = Math.hypot(P.vx, P.vz),
      lk = lv > 9 ? 9 / lv : 1;
    CAM.look.lerp(
      new T.Vector3(clamp(P.vx * lk * 0.26, -3.2, 3.2), 0, clamp(P.vz * lk * 0.26, -3.2, 3.2)),
      1 - Math.exp(-dt * 2.4),
    );
    const F = camFrame();
    /* borrokan kamera hurbilago (itzalak eta erasoak irakurgarri) */
    CAM.zoom = mix(CAM.zoom ?? 1, ROOM.fight || BOSS.on ? (BOSS.on ? 1 : F.fight) : 1, 1 - Math.exp(-dt * 2.5));
    /* leizean: kamera garaiagoa eta maldatsuagoa (hormek ez dezaten Amaiur estali) */
    CAM.inside = mix(CAM.inside ?? 0, ZONES[ZONE.cur].outdoor ? 0 : 1, 1 - Math.exp(-dt * 6));
    const look = new T.Vector3(P.x, P.y + (P.riding ? 1.7 : 1), P.z).add(CAM.look),
      /* Errolan (erraldoia): kamera urrunago eta begirada gorago */
      tall = BOSS.on && BOSS.kind === "errolan",
      /* Odei (zeruan): kamera urrunago, begirada gorago; planeatzean ere urrunago */
      cloud = BOSS.on && BOSS.kind === "odei",
      dragon = BOSS.on && BOSS.kind === "zazpi",
      offset = new T.Vector3(mix(15.5, 10, CAM.inside), mix(F.h, 18.5, CAM.inside), mix(23, 15, CAM.inside)).multiplyScalar(CAM.zoom * F.k * (BOSS.on ? (tall ? 1.5 : cloud ? 1.4 : dragon ? 1.38 : 1.25) : 1) * (P.riding ? 1.16 : 1) * (1 + 0.16 * GLIDE.k));
    lockCamera(dt, look);
    /* etsai nagusia: biak enkoadratu (finkatu gabe ere) */
    CAM.bossK = mix(CAM.bossK || 0, BOSS.on && !LOCK.target ? 1 : 0, 1 - Math.exp(-dt * 3));
    if (CAM.bossK > 0.01) {
      const c = BOSS.center();
      look.x = mix(look.x, (look.x + c.x) / 2, 0.55 * CAM.bossK);
      look.z = mix(look.z, (look.z + c.z) / 2, 0.55 * CAM.bossK);
      if (cloud) {
        look.y += clamp((ODEI.y - P.y) * 0.3, 0, 4.5) * CAM.bossK;
        offset.y *= 1 - 0.28 * CAM.bossK;
      }
      if (dragon) {
        look.y += 1.6 * CAM.bossK;
        offset.y *= 1 - 0.12 * CAM.bossK;
      }
      if (tall) {
        /* harkaitza altxatzean: kamera gorago eta urrunago (harria ikusteko) */
        CAM.liftK = mix(CAM.liftK || 0, ERR.state === "lift" || ERR.state === "throw" ? 1 : 0, 1 - Math.exp(-dt * 3));
        look.y += (4.2 + 4 * CAM.liftK) * CAM.bossK;
        offset.y *= 1 - 0.3 * CAM.bossK;
        offset.multiplyScalar(1 + 0.18 * CAM.liftK * CAM.bossK);
      }
    }
    /* jokalaria pantailaren erdialdetik gora (behean botoiak daude): begirada kamerarantz lerratu */
    /* hatzaz biratutako kamera (yaw, leundua): desplazamendua jokalariaren inguruan */
    CAM.yawS += (CAM.yaw - CAM.yawS) * (1 - Math.exp(-dt * 12));
    if (Math.abs(CAM.yaw - CAM.yawS) < 1e-4) CAM.yawS = CAM.yaw;
    if (CAM.yawS) offset.applyAxisAngle(UP_AXIS, CAM.yawS);
    if (F.lift) look.add(new T.Vector3(offset.x, 0, offset.z).normalize().multiplyScalar(F.lift * CAM.user));
    const target = look.clone().add(offset);
    /* haranean: muinoek eta mendi-hegalek ez dezatela Amaiur estali */
    if (ZONE.cur === "ibarra") camTerrainLift(look, target);
    if (!CAM.pos || CAM.pos.distanceTo(camera.position) > 4) {
      CAM.pos = camera.position.clone();
      CAM.vel = new T.Vector3();
    }
    /* malguki kritikoki moteldua (SmoothDamp): abiadura-aldaketa bortitzetan (bultzada, katea)
       kamerak ez du kolperik: azelerazioa zerotik hasten da eta leunki itzaltzen da */
    const w = 11,
      wx = w * dt,
      ex = 1 / (1 + wx + 0.48 * wx * wx + 0.235 * wx * wx * wx);
    for (const k of ["x", "y", "z"]) {
      const ch = CAM.pos[k] - target[k],
        tmp = (CAM.vel[k] + w * ch) * dt;
      CAM.vel[k] = (CAM.vel[k] - w * tmp) * ex;
      CAM.pos[k] = target[k] + (ch + tmp) * ex;
    }
    camera.position.copy(CAM.pos);
    const sh = CAM.trauma * CAM.trauma;
    if (sh > 0.0005) {
      const q = CAM.shakeT * 31;
      camera.position.x += Math.sin(q * 1.7) * sh * 0.9;
      camera.position.y += Math.sin(q * 2.3 + 1) * sh * 0.6;
      camera.position.z += Math.sin(q * 1.3 + 2) * sh * 0.9;
    }
    camera.lookAt(look);
    const fov = F.fov + CAM.fovKick;
    if (Math.abs(camera.fov - fov) > 0.02) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    sun.position.set(P.x - 32, P.y + 60, P.z + 25);
    sun.target.position.set(P.x, P.y, P.z);
    sun.target.updateMatrixWorld();
  }
  function start() {
    if (!ready) return;
    started = true;
    paused = false;
    titleLeave();
    $("start").hidden = true;
    $("hud").hidden = false;
    $("pause").hidden = false;
    $("touch").classList.add("play");
    audioStart();
    zoneActivate(DGS[saved.zone] ? saved.zone : "ibarra");
    const sp = spawnPoint();
    teleport(sp.x, sp.z, sp.y);
    if (sp.a !== undefined) P.angle = sp.a;
    hero.rotation.y = P.angle;
    Object.assign(SAFE, { x: sp.x, y: sp.y, z: sp.z, phase: 1 });
    CAM.pos = null;
    phase = 1;
    setPhaseVisual(true);
    updateWorld(0);
    AREA.cur = "";
    hud();
    if (!flag("intro")) prologueStart();
    else {
      title(ZONES[ZONE.cur].name, "");
      notify(L("Bideak zure urratsak gogoratzen ditu."), "", 3);
    }
  }
  function help() {
    dialog(
      "LEIZEEN DEIA",
      L("Nola jokatu"),
      "",
      "IBARRA haran zabala da: herria, zelaiak, ibaia, harrespila eta basoa. Herritarrekin hitz egin (E edo ekintza-botoia): eginkizunak, denda eta sekretuak. Urrezko eraztunak hurrengo helburua erakusten du.\n\n" +
        "MUGITU: WASD edo makila (ertzeraino: korrika). JAUZI: Espazioa (airean berriro: jauzi bikoitza). BULTZADA (F): ziztu bizian; bitartean ukiezina zara.\n\n" +
        "SORGINKERIA: J, klika edo botoia. Izpiak bakarrik bilatzen du helburua; mantendu: INDARRA (eztanda) eta, bitartean, EZKUTUA: aurretik datozen proiektilak itzultzen ditu. FINKATU (T edo ◎): helburu bat finkatu; kamerak eta izpiek hari jarraitzen diote.\n\n" +
        "GARAIA (Q): URREA iragana (uda), URDINA oraina (negua). Plataforma batzuk garai batean bakarrik daude, eta itzal bakoitza bere begien koloreko garaian bakarrik zauritzen da.\n\n" +
        "TXALAPARTA (B): bi makila, EZKERRA eta ESKUINA. Espirituek erritmo bat jotzen dute; zuk errepikatu. Ikasitako erritmoak edonon jo daitezke: ESNATU (◀ ◀ ▶) jentil-harriak altxatzen ditu, ENTZUN (▶ ◀ ▶ ▶) ezkutukoa erakusten du.\n\n" +
        "LEIZEAN: giltza txikiek ateak irekitzen dituzte; giltza nagusiak, ate handia. Kutxa bakoitzak zerbait du. Lehen leizearen tresna: SUGAARREN KATEA (C) — suge-eraztunetara tiratu, kaxak erakarri, etsaiak zorabiatu.\n\n" +
        "ESKU MAGIKOA (G): kaxak arrastatu, biratu eta pilatu. Lau ARNASA-ZATIrekin, arnasa bat gehiago.",
      "",
    );
  }
  function pause() {
    if (cinematic || GET.on || FILM.on) return;
    if (TXALA.on) return txalaClose();
    if (!started || !$("overlay").hidden) return;
    const zoneName = ZONES[ZONE.cur].name;
    dialog(
      "LEIZEEN DEIA",
      L("Arnasa hartu."),
      "",
      zoneName +
        (AREA.cur && (AREAS[AREA.cur] || ROOMS_AREA[AREA.cur]) ? " · " + (AREAS[AREA.cur] || ROOMS_AREA[AREA.cur])[0] : "") +
        "\n\n" +
        L("Arnasa-zatiak: ") + (saved.pieces.length % 4) + " / 4 (" + saved.pieces.length + L(" guztira)") +
        "\n" + L("Txanponak: ") + saved.coins +
        (saved.potions ? "\n" + L("Sendabelar-botilak: ") + saved.potions : "") +
        "\n" + L("Erritmoak: ") + (txalaKnown().map((k) => RHYTHMS[k].name + " " + seqText(RHYTHMS[k].seq)).join(" · ") || "—") +
        "\n" + L("Tresnak: ") + ([saved.items.includes("katea") && "SUGAARREN KATEA", saved.items.includes("giltzanagusia") && !saved.doors.includes("dD-n") && "GILTZA NAGUSIA"].filter(Boolean).join(" · ") || "—"),
      "",
      [
        [L("JARRAITU"), () => {}],
        [L("EGUNKARIA") + kb(" · L"), () => setTimeout(questLog, 0)],
        ...(saved.flags.includes("intro") || saved.flags.includes("pro-deia") ? [[L("DEITU · IRATI"), () => setTimeout(iratiCall, 0)]] : []),
        [L("KONTROLAK"), help],
        [
          L("LAGUNTZA: ") + (saved.assist ? "BAI" : "EZ"),
          () => {
            saved.assist = !saved.assist;
            persist();
            notify(L("Laguntza: denbora motelago eta BULTZADA luzeago."), "", 4);
          },
        ],
        [L("KONTROL-PUNTURA"), returnCheckpoint],
        [
          L("MENURA"),
          () => {
            started = false;
            paused = true;
            $("start").hidden = false;
            $("hud").hidden = true;
            $("pause").hidden = true;
            $("touch").classList.remove("play");
            translate();
          },
        ],
      ],
    );
  }
  /* tekla-zerrenda: hitzaurrean, ikasitako tresnak bakarrik */
  function keysRender() {
    const has = (k) => saved.items.includes(k);
    $("keys").innerHTML = [["WASD", "mugitu"], ["Shift", "korrika"], ["␣ ×2", "jauzi"], ["J / klik", "sorginkeria"], ...(PRO.can.dash ? [["F", "bultzada"]] : []), ...(PRO.can.phase ? [["Q", "garaia"]] : []), ["E", "ekin"], ...(PRO.can.lock ? [["T", "finkatu"]] : []), ...(!PRO.on || has("makilak") ? [["B", "txalaparta"]] : []), ...(!PRO.on ? [["C", "katea"]] : []), ...(has("adarra") ? [["V", "adarra"]] : []), ...(has("tximistarria") ? [["X", "tximistarria"]] : []), ...(has("enara") ? [["␣ eutsi", "enara"]] : []), ...(has("ispilua") ? [["J argian", "ispilua"]] : []), ["L", "egunkaria"]]
      .map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`)
      .join("");
  }
  function translate() {
    document.documentElement.lang = language;
    $("play").textContent = saved.flags.includes("intro") || saved.flags.includes("pro-0") ? "JARRAITU" : "DEIARI ERANTZUN";
    $("helpBtn").textContent = "NOLA JOKATU";
    $("phaseBtn").textContent = "ALDATU";
    $("jumpBtn").textContent = "JAUZI";
    $("attackBtn").textContent = "SORGIN-\nKERIA";
    $("rotateBtn").textContent = "↻";
    $("rotateBtn").onclick = () => {
      const p = CRAFT.held || CRAFT.last;
      if (p) craftRotate(p);
    };
    $("useBtn").textContent = "EKIN";
    $("useBtn").hidden = true;
    CTX.cur = null;
    $("weaveBtn").textContent = "⋯";
    $("weaveBtn").setAttribute("aria-label", "MENUA");
    $("recallBtn").textContent = "◎";
    $("cineSkip").textContent = "SALTATU →";
    $("cineNext").textContent = "JARRAITU →";
    $("heartLab").textContent = "ARNASA";
    $("dashLab").textContent = "BULTZADA";
    $("coinLab").textContent = "TXANPONAK";
    $("keyLab").textContent = "GILTZAK";
    $("bombLab").textContent = "TXIMISTA";
    keysRender();
    if (ready) {
      setPhaseVisual();
      hud();
    }
  }
  function controls() {
    const actions = {
      Space: jump,
      KeyQ: switchPhase,
      KeyF: dash,
      KeyC: chainFire,
      KeyV: hornBlow,
      KeyX: bombThrow,
      KeyZ: dustThrow,
      KeyB: txalaOpen,
      KeyT: lockToggle,
      Tab: lockToggle,
      KeyG: craftToggle,
      KeyJ: attack,
      KeyK: attack,
      KeyH: powerMenu,
      KeyL: questLog,
      KeyE: interact,
      Escape: pause,
    };
    addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
      /* azala: Enter / zuriunea → DEIARI ERANTZUN (botoia fokuan ez badago ere) */
      if (!started && ready && !e.repeat && ["Enter", "Space"].includes(e.code) && $("overlay").hidden && !$("start").hidden && document.activeElement?.tagName !== "BUTTON") {
        start();
        return;
      }
      if (FILM.on) {
        if (e.code === "Escape") filmSkip();
        return;
      }
      /* gauza bat lortu da: edozein tekla → jarraitu */
      if (GET.on) {
        if (!e.repeat && ["Space", "Enter", "KeyE", "Escape", "KeyJ"].includes(e.code)) itemGetClose();
        return;
      }
      /* txalaparta irekita: ezkerra / eskuina */
      if (TXALA.on) {
        if (!e.repeat && ["ArrowLeft", "KeyJ", "KeyA"].includes(e.code)) txalaHit("L");
        if (!e.repeat && ["ArrowRight", "KeyK", "KeyD"].includes(e.code)) txalaHit("R");
        if (e.code === "Escape" || e.code === "KeyB") txalaClose();
        return;
      }
      if (CRAFT.on && !e.repeat) {
        if (e.code === "KeyR") return craftRotate();
        if (e.code === "Escape" || e.code === "KeyG") return craftExit();
      }
      if ((e.code === "KeyJ" || e.code === "KeyK") && !e.repeat) ATK.hold = true;
      if (cinematic) {
        if (!e.repeat && (e.code === "Space" || e.code === "Enter")) nextShot();
        if (e.code === "Escape") endScene();
        return;
      }
      if (!e.repeat && actions[e.code]) {
        if (e.code === "Space") jumpHeld = true;
        actions[e.code]();
      }
      input.keys[e.code] = true;
    });
    addEventListener("keyup", (e) => {
      delete input.keys[e.code];
      if (e.code === "Space") releaseJump();
      if (e.code === "KeyJ" || e.code === "KeyK") ATK.hold = false;
    });
    addEventListener("mouseup", () => (ATK.hold = false));
    bindCraftPointer();
    $("weaveBtn").onclick = powerMenu;
    $("recallBtn").onclick = lockToggle;
    $("cineNext").onclick = nextShot;
    $("itemGet").onclick = itemGetClose;
    $("cineSkip").onclick = endScene;
    $("filmSkip").onclick = filmSkip;
    $("deiaRing").onclick = () => deiaAnswer();
    $("phaseBtn").onclick = switchPhase;
    $("dashBtn").onclick = dash;
    $("jumpBtn").onclick = jump;
    $("useBtn").onclick = null;
    bindActionTouches();
    bindTxala();
    const stick = $("stick"),
      knob = $("knob");
    let pointer = null;
    function move(e) {
      const b = stick.getBoundingClientRect();
      input.x = clamp((e.clientX - b.left - b.width / 2) / 36, -1, 1);
      input.z = clamp((e.clientY - b.top - b.height / 2) / 36, -1, 1);
      const n = Math.hypot(input.x, input.z);
      if (n > 1) {
        input.x /= n;
        input.z /= n;
      }
      knob.style.transform = `translate(${input.x * 28}px,${input.z * 28}px)`;
    }
    stick.onpointerdown = (e) => {
      pointer = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      move(e);
    };
    stick.onpointermove = (e) => {
      if (pointer === e.pointerId) move(e);
    };
    stick.onpointerup =
      stick.onpointercancel =
      stick.onlostpointercapture =
        () => {
          pointer = null;
          input.x = input.z = 0;
          knob.style.transform = "";
        };
    /* lehen ukitzean audioa piztu (izenburuko musika eta giroa) */
    addEventListener("pointerdown", () => audioStart(), { once: true });
    addEventListener("keydown", () => audioStart(), { once: true });
    $("play").onclick = start;
    $("helpBtn").onclick = help;
    $("pause").onclick = pause;
    $("audio").onclick = () => {
      muted = !muted;
      $("audio").textContent = muted ? "♪ ×" : "♫";
      if (!muted) audioStart();
      SND.setMuted(muted);
    };
    $("quality").textContent = quality ? "HD" : "ARIN";
    /* ⤢: distantzia aurrezarriak (hurbil · ertaina · urrun) eta kamera zentratu */
    $("camBtn").onclick = () => {
      camLevel = (camLevel + 1) % 3;
      CAM.user = CAM_LEVELS[camLevel];
      CAM.yaw = Math.round(CAM.yawS / TAU) * TAU;
      camSave();
      notify(...[["KAMERA · HURBIL", "CÁMARA · CERCA"], ["KAMERA · ERTAINA", "CÁMARA · MEDIA"], ["KAMERA · URRUN", "CÁMARA · LEJOS"]][camLevel], 1.6);
    };
    $("camBtn").textContent = "⤢";
    $("quality").onclick = () => {
      quality = 1 - quality;
      renderer.setPixelRatio(Math.min(devicePixelRatio, quality ? 1.5 : 1));
      sun.shadow.mapSize.set(quality ? 2048 : 1024, quality ? 2048 : 1024);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
      $("quality").textContent = quality ? "HD" : "ARIN";
    };
    $("reset").onclick = () =>
      dialog("LEIZEEN DEIA", L("Bidaia berri bat?"), "", L("Partida honetako aurrerapena ezabatuko da."), "", [
        [L("EZEZTATU"), () => {}],
        [
          L("BERRIRO HASI"),
          () => {
            try {
              localStorage.removeItem(SAVE_KEY);
            } catch {}
            location.reload();
          },
        ],
      ]);
    $("credits").onclick = () =>
      dialog(
        "LEIZEEN DEIA",
        L("Egileak eta iturriak"),
        "",
        L(
          "OIHARTZUN-en bigarren atala: joko berria eta originala. Istorioa, pertsonaiak, mailak, txalapartaren mekanika, musika eta soinu guztiak joko honetarako sortu dira (musika eta soinuak jokoak berak sortzen ditu, Web Audio bidez).\n\n" +
            "Euskal mitologia (Mari, Basajaun, jentilak, Gaueko, Sugaar) herri-ondarea da; hemen modu librean kontatzen da.\n\n" +
            "Pertsonaiak, animazioak, herria eta leizeko piezak: Kay Lousberg / KayKit, CC0. Testurak eta zeruak: Poly Haven eta ambientCG, CC0. Motorra: three.js r128, MIT.",
        ),
        "",
      );
    addEventListener("blur", () => {
      clearInput();
      if (started && !paused) pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInput();
        if (started && !paused) pause();
      }
    });
    addEventListener("resize", () => {
      if (!ready) return;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  }
  function hud() {
    if (!ready) return;
    const Z = ZONES[ZONE.cur],
      A = AREA.cur ? AREAS[AREA.cur] || ROOMS_AREA[AREA.cur] : null;
    const DG = DGS[ZONE.cur];
    $("chapter").textContent = DG ? (DG.home ? L("ETXEA") : DG.num + " · " + Z.name) : "LEIZEEN DEIA";
    $("placeName").textContent = A ? A[0] : Z.name;
    $("goal").textContent = QST.mikel
      ? L("Jomugak: ") + QST.mikel.hits + " / " + QST.mikel.need + " · " + Math.max(0, Math.ceil(QST.mikel.t)) + " s"
      : ROOM.fight && !ROOM.fight.boss
        ? L("Garaitu itzalak") + " · " + enemiesAlive()
        : objective()[0];
    hudShow("goal", $("goal").textContent);
    hudShow("place", $("chapter").textContent + "|" + $("placeName").textContent);
    $("hearts").textContent = "● ".repeat(Math.max(0, P.hp)) + "○ ".repeat(Math.max(0, P.maxHp - P.hp));
    $("craftBtn").hidden = true;
    $("dashDot").textContent = P.dashReady ? "◆" : "◇";
    $("dashDot").style.opacity = P.dashReady ? 1 : 0.5;
    $("coins").textContent = saved.coins;
    $("keyBox").hidden = !DG || !!DG.home;
    $("bombBox").hidden = !hasBomb();
    if (hasBomb()) $("bombN").textContent = "●".repeat(TXB.n) + "○".repeat(Math.max(0, TXB.max - TXB.n));
    if (DG) $("keyN").textContent = (saved.keyz[ZONE.cur] || 0) + (saved.items.includes(DG.bigKey) && !saved.doors.includes(DG.bossDoor) ? " ◆" : "");
    $("route").textContent = Z.name;
    map();
  }
  /* mapa txikia: haranean lautadak eta jendea; leizean bisitatutako gelak */
  function map() {
    const c = $("map").getContext("2d");
    c.clearRect(0, 0, 240, 240);
    const inDg = !!DGS[ZONE.cur];
    c.fillStyle = inDg ? "#0d1418" : "#102c40";
    c.fillRect(0, 0, 240, 240);
    const sc = inDg ? 1.7 : 1.05,
      xx = (x) => 120 + (x - P.x) * sc,
      zz = (z) => 120 + (z - P.z) * sc,
      dot = (x, z, r, col) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(xx(x), zz(z), r, 0, TAU);
        c.fill();
      };
    if (ZONE.cur === "ibarra") {
      /* harana (ingerada), terrazak, ibaia, zubia eta leize-zuloa */
      if (VAL) {
        c.fillStyle = "#5f8579";
        c.beginPath();
        VAL.forEach(([x, z], i) => (i ? c.lineTo(xx(x), zz(z)) : c.moveTo(xx(x), zz(z))));
        c.closePath();
        c.fill();
      }
      for (const s of platforms)
        if (s.rx && !s.mask && s.y > 1) {
          c.fillStyle = s.y > 6 ? "#86a690" : "#759a8a";
          c.beginPath();
          c.ellipse(xx(s.x), zz(s.z), s.rx * sc, s.rz * sc, 0, 0, TAU);
          c.fill();
        }
      if (RIV) {
        c.strokeStyle = phase ? "#9fc3d2" : "#2c6a86";
        c.lineCap = "round";
        for (let i = 0; i < RIV.length - 1; i += 2) {
          const a = RIV[i],
            b = RIV[Math.min(RIV.length - 1, i + 2)];
          c.lineWidth = a[2] * 2 * sc;
          c.beginPath();
          c.moveTo(xx(a[0]), zz(a[1]));
          c.lineTo(xx(b[0]), zz(b[1]));
          c.stroke();
        }
        dot(PIT.x, PIT.z, PIT.r * sc, "#05080a");
      }
      c.fillStyle = "#d9cfae";
      c.fillRect(xx(-2.5), zz(-38), 5 * sc, 19 * sc);
      for (const N of NPCS) dot(N.x, N.z, 3, N.ghost ? "#bfe6ff" : "#ffe4a2");
      for (const S of HUB.sheep) if (!S.home && saved.flags.includes("ardiak")) dot(S.x, S.z, 3, "#ffffff");
      dot(HUB.cave.x, HUB.cave.z, 4.5, HUB.gate.p.off ? "#9dffc4" : "#ff9d6a");
      if (ponyTamed() && !P.riding) dot(POTT.x, POTT.z, 3.5, "#c98a5a");
    } else {
      for (const R of ROOMS) {
        if (R.zone !== ZONE.cur || (!saved.visited.includes(R.id) && ROOM.cur !== R)) continue;
        c.fillStyle = ROOM.cur === R ? "#3d6475" : "#26404b";
        c.strokeStyle = "#7fb9c4";
        if (R.rx) {
          /* zeruko uharte biribila */
          c.beginPath();
          c.ellipse(xx(R.x), zz(R.z), R.rx * sc, R.rz * sc, 0, 0, TAU);
          c.fill();
          c.stroke();
        } else {
          c.fillRect(xx(R.x - R.w / 2), zz(R.z - R.d / 2), R.w * sc, R.d * sc);
          c.strokeRect(xx(R.x - R.w / 2), zz(R.z - R.d / 2), R.w * sc, R.d * sc);
        }
      }
      /* haize-zutabe biziak */
      for (const U of UPDRAFTS) if (U.group === ZONES[ZONE.cur].group && U.k > 0.5) dot(U.x, U.z, 3.5, "#bff6ff");
      for (const D of DOORS) if (!D.open && D.g.parent === ZONES[ZONE.cur].group) dot(D.x, D.z, 3, D.kind === "boss" ? "#ff9d4a" : D.kind === "key" ? "#e8c27a" : "#8a96a0");
      for (const C of CHESTS) if (!C.opened && C.m.visible && C.zoneGroup === ZONES[ZONE.cur].group) dot(C.x, C.z, 3, "#ffe4a2");
    }
    for (const e of ENEMIES) if (e.state !== "dead") dot(e.x, e.z, e.type === "brute" ? 4 : 3, "#ff5a6e");
    const o = objective()[1];
    if (o) {
      c.strokeStyle = "#ffd98f";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(clamp(xx(o[0]), 8, 232), clamp(zz(o[1]), 8, 232), 6, 0, TAU);
      c.stroke();
    }
    c.save();
    c.translate(120, 120);
    c.rotate(-P.angle);
    c.fillStyle = "#fff8da";
    c.beginPath();
    c.moveTo(0, 7);
    c.lineTo(-4, -5);
    c.lineTo(4, -5);
    c.fill();
    c.restore();
    c.fillStyle = "#adc9da";
    c.font = "11px system-ui";
    c.fillText("N", 116, 16);
  }
  function tick(dt) {
    if (cinematic) return;
    frame++;
    time += dt;
    saved.playTime = (saved.playTime || 0) + dt;
    if (frame % 2400 === 0) persist();
    phaseCooldown = Math.max(0, phaseCooldown - dt);
    damageTime = Math.max(0, damageTime - dt);
    if (respawnTimer > 0) {
      respawnTimer -= dt;
      if (respawnTimer <= 0) {
        /* zero zehatza: balio negatibo txiki batek "egia" emango luke eta bultzada, garaia… blokeatuko lituzke */
        respawnTimer = 0;
        hardFall ? returnCheckpoint() : softRespawn();
      }
    } else {
      updateWorld(dt);
      if (!TXALA.on) move(dt);
      magicUpdate(dt);
      bombsUpdate(dt);
      chainUpdate(dt);
      lockUpdate(dt);
      txalaUpdate(dt);
      runePuzzlesUpdate(dt);
      enemyUpdate(dt);
      roomsUpdate(dt);
      doorsUpdate(dt);
      lootUpdate(dt);
      craftUpdate(dt);
      hornUpdate(dt);
      fansUpdate(dt);
      mistsUpdate(dt);
      updraftsUpdate(dt);
      shaftsUpdate(dt);
      odeiCloudUpdate(dt);
      skyDragonUpdate(dt);
      pouchesUpdate(dt);
      deiaUpdate(dt);
      hautsaUpdate(dt);
      proUpdate(dt);
      if (ZONE.cur === "ibarra") {
        hubUpdate(dt);
        npcsUpdate(dt);
        mariUpdate(dt);
        pottokaUpdate(dt);
      } else {
        dungeonUpdate(dt);
        bossUpdate(dt);
        anbotoUpdate(dt);
      }
    }
    music(dt);
    subTimer -= dt;
    titleTimer -= dt;
    hudQuiet(dt);
    if (subTimer <= 0) $("subtitle").style.opacity = 0;
    if (titleTimer <= 0) $("chapterTitle").style.opacity = 0;
    shiftFlash = Math.max(0, shiftFlash - dt * 2.8);
    $("phaseFlash").style.opacity = shiftFlash * 0.35;
    if (frame % 8 === 0) hud();
    if (frame % 6 === 0) ctxUpdate();
    /* bizitza bakarra: binjeta gorria taupadaka eta bihotz-soinua */
    const low = P.hp === 1 && started;
    lowBeat = low ? lowBeat + dt : 0;
    if (low && lowBeat > 0.95) {
      lowBeat = 0;
      SND.thud();
    }
    $("vignette").style.boxShadow = low ? `inset 0 0 ${110 + 50 * Math.abs(Math.sin(time * 3.3))}px #b0102ea6` : ingumaVignette();
    if (frame % 15 === 0) coachUpdate();
    /* teklen laguntza: lehen 20 s-etan bakarrik (gero menuan) */
    if (time > 20 && !keysFaded) {
      keysFaded = true;
      $("keys").style.opacity = 0;
    }
  }
  let keysFaded = false,
    lowBeat = 0,
    slowmo = 0;
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (window.__hold) return; /* probetarako: fotogramaz fotograma grabatzeko */
    const raw = Math.min(0.12, (now - last) / 1000);
    last = now;
    faceUpdate(raw);
    if (FILM.on) filmUpdate(raw);
    else if (cinematic) {
      updateCinema(raw);
      occlusionUpdate(raw);
    } else if (GET.on) {
      itemGetUpdate(raw);
      cameraUpdate(raw);
    } else if (TXALA.on && started) {
      /* txalaparta: mundua geldi, erritmoa bizirik */
      txalaUpdate(raw);
      if (mixer) mixer.update(raw);
      cameraUpdate(raw);
    } else if (started && !paused) {
      if (hitStop > 0) {
        hitStop -= raw;
        accumulator = 0;
      } else accumulator += raw * (saved.assist ? 0.72 : 1) * (slowmo > 0 ? 0.28 : 1);
      slowmo = Math.max(0, slowmo - raw);
      let n = 0;
      while (accumulator >= 1 / 120 && n++ < 15) {
        tick(1 / 120);
        accumulator -= 1 / 120;
      }
      if (CRAFT.on) craftCamera(raw);
      else cameraUpdate(raw);
      drawGuide();
      occlusionUpdate(raw);
    } else if (!started) {
      /* izenburua (izenburua.js): Amaiur muinoan, ilunabarrean, zazpi deiak zeruan */
      let t = now * 0.000035;
      titleUpdate(raw);
      if (mixer) mixer.update(raw);
      if (ZONE.cur === "ibarra") npcsUpdate(raw);
      birds.forEach((b, i) => b.position.set(Math.cos(t + i) * 35, 22 + (i % 3), -20 + Math.sin(t + i) * 30));
    }
    zoneFadeUpdate(raw);
    fxUpdate(raw);
    juiceUpdate(raw);
    numbersUpdate(raw);
    shieldHintUpdate(raw);
    SND.update();
    atmoUpdate(raw);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  /* kamera eta helburuaren artean dauden hormak, etxeak eta zuhaitzak gardendu */
  function occlusionUpdate(dt) {
    const t = cinematic && CAM.cineLook ? CAM.cineLook : { x: P.x, y: P.y + 1, z: P.z };
    if (ZONE.cur === "ibarra") {
      hubOcclusion(dt, t.x, t.y, t.z);
      cutUpdate(t.x, t.y, t.z);
    } else wallsFade(dt, t.x, t.z);
  }
  /* elkarrizketak eta eszenak (say() bidez gehitzen dira) */
  const scenes = [];
  let cinematic = null,
    guideBeacon = null;
  /* helburuaren urrezko markatzailea (lurrean eraztuna + pantailako gezia) */
  function drawGuide() {
    const o = started && !cinematic && !FILM.on && !CRAFT.on && !ROOM.fight && !BOSS.on ? objective()[1] : null;
    if (!o) {
      $("waypoint").hidden = true;
      if (guideBeacon) guideBeacon.visible = false;
      return;
    }
    if (!guideBeacon) {
      guideBeacon = ring(o[0], o[2] + 0.1, o[1], 0.85, "#ffe09e", scene);
      guideBeacon.castShadow = false;
    }
    guideBeacon.visible = true;
    const oy = ZONE.cur === "ibarra" && o[2] < 1 ? Math.max(o[2], gy(o[0], o[1])) : o[2];
    guideBeacon.position.set(o[0], oy + 0.12, o[1]);
    guideBeacon.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
    const v = new T.Vector3(o[0], oy + 2.6, o[1]).project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth,
      y = (-v.y * 0.5 + 0.5) * innerHeight;
    const el = $("waypoint");
    el.hidden = Math.hypot(P.x - o[0], P.z - o[1]) < 3;
    el.style.left = clamp(x, 55, innerWidth - 55) + "px";
    el.style.top = clamp(v.z > 1 ? innerHeight - 90 : y, 80, innerHeight - 90) + "px";
    el.textContent = Math.round(Math.hypot(P.x - o[0], P.z - o[1])) + " m";
  }
  function playScene(i) {
    if (cinematic || !started) return;
    coachHide();
    cinematic = { i, n: 0, t: 0 };
    paused = true;
    clearInput();
    $("cinema").hidden = false;
    $("deiaRing").hidden = true;
    $("hud").style.opacity = "0";
    $("touch").style.visibility = "hidden";
    $("waypoint").hidden = true;
    $("prompt").hidden = true;
    if (guideBeacon) guideBeacon.visible = false;
    showShot();
  }
  function showShot() {
    const c = cinematic,
      sh = scenes[c.i][c.n],
      call = !!scenes[c.i].call;
    voiceStop();
    /* sh[7]: ahotsaren id-a (ahotsak.js); deietan, larruazal berezia (oihartzun-deia) */
    Object.assign(c, { t: 0, full: L(sh[1], sh[2]), shown: 0, lastN: -1, typing: true, doneT: 0, voice: sh[7] || null, vOn: !sh[7], vEnd: 0, vT0: 0 });
    const cin = $("cinema"),
      intr = call && /^(GAUEKO|INGUMA)/.test(sh[0]);
    c.intr = intr;
    cin.classList.toggle("deia", call);
    cin.classList.toggle("intrusion", intr);
    $("cineTag").textContent = call ? (intr ? "OIHARTZUN-DEIA · ▶ ▶ ▶ ▶ · ?" : "OIHARTZUN-DEIA · ◀ ◀ ▶") : "LEIZEEN DEIA";
    if (intr) SND.static(1);
    $("cineWho").textContent = sh[0];
    $("cineText").textContent = "";
    $("cineFull").textContent = c.full;
    $("cineCount").textContent = String(c.n + 1).padStart(2, "0") + " / " + String(scenes[c.i].length).padStart(2, "0");
    const kind = portraitFor(sh[0]),
      pt = $("portrait");
    if (pt.dataset.kind !== kind) {
      pt.innerHTML = PORTRAITS[kind];
      pt.dataset.kind = kind;
    }
    pt.className = kind + " talk";
    if (!intr) SND.radio();
  }
  function nextShot() {
    if (!cinematic) return;
    const c = cinematic;
    if (c.typing) {
      c.shown = c.full.length; /* lehenik testua osatu */
      if (!c.vOn) c.vOn = true; /* ahotsa ez da hasi: testua bakarrik */
      return;
    }
    voiceStop();
    if (++c.n >= scenes[c.i].length) endScene();
    else showShot();
  }
  function endScene() {
    if (!cinematic) return;
    voiceStop();
    $("cinema").classList.remove("deia", "intrusion");
    $("portrait").classList.remove("talk");
    cinematic = null;
    paused = false;
    clearInput();
    accumulator = 0;
    $("cinema").hidden = true;
    $("deiaRing").hidden = !RING.on;
    $("hud").style.opacity = "1";
    $("touch").style.visibility = "";
    $("chapterTitle").style.opacity = 0;
    titleTimer = 0;
    storyAfterScene();
    hud();
  }
  function updateCinema(dt) {
    const c = cinematic;
    c.t += dt;
    const sh = scenes[c.i][c.n];
    const look = new T.Vector3(sh[3] ?? P.x, (sh[5] ?? P.y) + 1.4, sh[4] ?? P.z),
      a = c.n % 2 ? -0.35 : 0.3;
    /* leizean: hurbilago eta goitik (hormak); sh[6]: kameraren kokapen finkoa (zerua begiratzeko...) */
    const pk = (innerHeight > innerWidth ? 1.55 : 1) * (ZONES[ZONE.cur].outdoor ? 1 : 0.85),
      /* oihartzun-deietan: Amaiur hurbiletik, isilik entzuten */
      near = scenes[c.i].call,
      pos = sh[6] ? new T.Vector3(...sh[6]) : look.clone().add(near ? new T.Vector3(3.6 * Math.cos(a + c.t * 0.05), 2.2, 4.6).multiplyScalar(innerHeight > innerWidth ? 1.75 : 1) : new T.Vector3(9 * Math.cos(a + c.t * 0.035), ZONES[ZONE.cur].outdoor ? 7 : 11, 12).multiplyScalar(pk));
    camera.position.lerp(pos, 1 - Math.exp(-dt * 2));
    camera.lookAt(look);
    CAM.cineLook = look;
    if (mixer) mixer.update(dt);
    sea.material.uniforms.clock.value += dt;
    if (ZONE.cur === "ibarra") mariUpdate(dt);
    music(dt);
    /* ahotsa: kargatuta dagoenean hasi (gehienez 0.8 s itxaron; bestela testua bakarrik).
       Gauekoren sarreran, interferentzia amaitu arte itxaron: ahotsa estatikoaren gainetik ez */
    if (!c.vOn && c.t >= (c.intr ? 0.4 : 0) && (voiceReady(c.voice) || c.t > 0.8)) {
      c.vOn = true;
      c.vEnd = voicePlay(c.voice);
      c.vT0 = c.t;
    }
    if (c.typing && c.vOn) {
      c.shown += dt * (c.vEnd ? Math.max(14, c.full.length / Math.max(0.6, c.vEnd * 0.85)) : 50);
      /* ahotsarekin: testua audioaren erlojuari lotuta (fotograma motelekin ere ez da atzeratzen) */
      if (c.vEnd && VOICE.cur && VOICE.cur.id === c.voice) c.shown = Math.max(c.shown, ((SND.ctx.currentTime - VOICE.cur.t0) / (VOICE.cur.dur * 0.85)) * c.full.length);
      const n = Math.min(c.full.length, Math.floor(c.shown));
      if (n !== c.lastN) {
        $("cineText").textContent = c.full.slice(0, n);
        if (!c.vEnd && n > c.lastN && n % 3 === 0 && /\S/.test(c.full[n - 1] || "")) SND.blip();
        c.lastN = n;
      }
      if (n >= c.full.length) {
        c.typing = false;
        c.doneT = c.t;
        if (!c.vEnd) $("portrait").classList.remove("talk");
      }
    } else if (!c.typing && (c.vEnd ? !voicePlaying() && c.t - c.vT0 > c.vEnd + 0.5 : c.t - c.doneT > Math.max(4.5, c.full.length * 0.055))) nextShot();
    /* ahotsarekin: ahoa ahotsaren mailaren arabera; deietan, uhina */
    const lv = c.vEnd ? voiceLevel() : 0;
    if (c.vEnd) $("portrait").classList.toggle("talk", lv > 0.08);
    if (scenes[c.i].call) deiaWave(lv);
  }

  let jumpHeld = false;
  function releaseJump() {
    if (!jumpHeld) return;
    jumpHeld = false;
    if (!paused && P.vy > 4 && P.dashT <= 0) P.vy = Math.max(4, P.vy * 0.5);
  }
  function bindActionTouches() {
    for (const [id, fn] of [
      ["jumpBtn", jump],
      ["dashBtn", dash],
      ["phaseBtn", switchPhase],
      ["recallBtn", lockToggle],
      ["attackBtn", attack],
      ["craftBtn", craftToggle],
      ["useBtn", () => CTX.fn && CTX.fn()],
    ]) {
      const el = $(id);
      el.onclick = null;
      el.onpointerdown = (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (id === "jumpBtn") jumpHeld = true;
        if (id === "attackBtn") ATK.hold = true;
        fn();
        el.classList.add("pressed");
      };
      el.onpointerup =
        el.onpointercancel =
        el.onlostpointercapture =
          (e) => {
            el.classList.remove("pressed");
            if (id === "jumpBtn") releaseJump();
            if (id === "attackBtn") ATK.hold = false;
          };
    }
  }
  /* ==================================================================
     EKINTZA-BOTOIA (mugikorra) · une bakoitzean behar dena: HITZ EGIN, IREKI,
     ATEA, ENTZUN, TXALAPARTA, ESKUA, KATEA… Bestela ezkutatuta. ⋯ = menu osoa.
     ================================================================== */
  const CTX = { cur: null, fn: null };
  const CTX_COL = { talk: "gold", chest: "gold", door: "gold", hearth: "gold", drum: "violet", txala: "violet", stone: "violet", craft: "green", chain: "cyan" };
  function ctxPower() {
    if (CRAFT.on) return ["craft", L("EGINDA"), "green", craftToggle];
    if (near) return [near.kind, near.label, CTX_COL[near.kind] || "blue", near.fn];
    const Z = zoneHere();
    if (Z && !Z.solved) return ["craft", L("ESKUA"), "green", craftToggle];
    if (hasChain() && CHAIN.state === "idle" && chainCandidates().some((t) => t.kind === "ring" || t.kind === "boss" || t.kind === "crate")) return ["chain", L("KATEA"), "cyan", chainFire];
    /* HAIZE-ADARRA: haize-errota, balsa, lainoa edo hosto-pila hurbil */
    if (hasHorn() && WIND.list.some((W) => W.group === ZONES[ZONE.cur].group && (!W.live || W.live()) && Math.hypot(W.x - P.x, W.z - P.z) < (W.range || 14) - 1 && (W.y === undefined || Math.abs(W.y - P.y) < (W.dy || 6))))
      return ["wind", L("ADARRA"), "cyan", hornBlow];
    /* TXIMISTARRIA: harri arrakalatu bat hurbil (edo etsai nagusiak eskatzen duenean) */
    if (hasBomb() && TXB.n > 0 && (crackNear(11) || (BOSS.on && BOSS.bombAim && BOSS.bombAim()))) return ["bomb", L("TXIMISTA"), "cyan", bombThrow];
    /* ENTZUN behar den lekuan (ezkutuko harriak) */
    if (saved.rhythms.includes("entzun") && TXALA.reveal <= 0 && platforms.some((s) => s.hidden && Math.hypot(s.x - P.x, s.z - P.z) < 18)) return ["txala", L("TXALAPARTA"), "violet", txalaOpen];
    /* IZAR-HAUTSA: izar-lainoa, ate-zainak, ametseko etsaiak edo Inguma */
    if (hasDust() && dustUseful()) return ["dust", L("IZARRAK"), "violet", dustThrow];
    return null;
  }
  function ctxUpdate() {
    const c = started && !paused && !cinematic && !GET.on && !TXALA.on ? ctxPower() : null,
      key = c ? c[0] + c[1] : "",
      el = $("useBtn");
    if (key === CTX.cur) return;
    CTX.cur = key;
    CTX.fn = c ? c[3] : null;
    el.hidden = !c;
    if (c) {
      el.textContent = c[1];
      el.dataset.kind = c[2];
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
  }
  function powerMenu() {
    if (!started || paused || cinematic || TXALA.on) return;
    const opts = [];
    if (saved.rhythms.length) opts.push([L("TXALAPARTA") + kb(" · B"), txalaOpen]);
    if (hasChain()) opts.push([L("SUGAARREN KATEA") + kb(" · C"), chainFire]);
    if (hasHorn()) opts.push([L("HAIZE-ADARRA") + kb(" · V"), hornBlow]);
    if (hasBomb()) opts.push([L("TXIMISTARRIA") + kb(" · X"), bombThrow]);
    if (hasDust()) opts.push([L("IZAR-HAUTSA") + kb(" · Z"), dustThrow]);
    opts.push([L("FINKATU") + kb(" · T"), lockToggle]);
    opts.push([L("EGUNKARIA") + kb(" · L"), () => setTimeout(questLog, 0)]);
    const Z = zoneHere();
    if (Z && !Z.solved) opts.push([L("ESKU MAGIKOA") + kb(" · G"), craftToggle]);
    opts.push([L("JARRAITU"), () => {}]);
    dialog(
      L("SORGINAREN BOTEREAK"),
      L("Zer egin nahi duzu?"),
      "",
      (saved.rhythms.length ? L("Erritmoak: ") + txalaKnown().map((k) => RHYTHMS[k].name + " " + seqText(RHYTHMS[k].seq)).join(" · ") : L("Oraindik ez dakizu erritmorik: Pello eta Peio plazan daude.")) +
        "\n\n" +
        (hasChain() ? L("KATEA: suge-eraztunetara tiratu, kaxak erakarri, etsaiak zorabiatu.") + "\n\n" : "") +
        (hasHorn() ? L("ADARRA: haize-bolada aurrera — errotak, balsak, lainoa, hostoak.") + "\n\n" : "") +
        (hasBomb() ? L("TXIMISTARRIA: jaurti, eta trumoiak harri arrakalatuak apurtzen ditu (urrun egon!).") + "\n\n" : "") +
        (hasWings() ? L("ENARA: jauzi bikoitza eta eutsi JAUZIari — planeatu; haize-zutabeek gora eramaten zaituzte.") + "\n\n" : "") +
        (saved.items.includes("ispilua") ? L("EGUZKI-ISPILUA: argi-zutabe batean, eutsi SORGINKERIAri eta apuntatu. Iraganean eguzkia, orainean ilargia. Ispilu-harriak: BIRATU.") + "\n\n" : "") +
        (hasDust() ? L("IZAR-HAUTSA: bota, eta gaueko izakiak KONTATZEN geratzen dira (geldi, kalte bikoitza). Izar-lainoan, izar-plataformak; airean, izar-eskailerak.") + "\n\n" : "") +
        L("FINKATU: helburu bat finkatu (berriro sakatuz, hurrengoa).") +
        (saved.potions ? "\n\n" + L("Sendabelar-botilak: ") + saved.potions + L(" (bizitzak amaitzean, berez erabiltzen dira)") : ""),
      "",
      opts,
    );
  }
  async function boot() {
    /* atariaren barruan (iframe): goiko erdiko "itzuli" botoiari lekua utzi */
    if (window.__EG_GAME) document.body.classList.add("eg-embed");
    controls();
    translate();
    const egReady = EG ? EG.preload(["grass", "snow", "cliff", "water", "planks"], ["dusk", "day", "night"], 8000) : Promise.resolve();
    const glb = (b64) => {
      const binary = atob(b64),
        bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Promise((res, rej) => loader.parse(bytes.buffer, "", res, rej));
    };
    /* KayKit (CC0): sorgina, hezurdurak, herritarrak eta props.glb (herria, natura, leizea) */
    const jobs = [["mage", MAGE], ["props", PROPS_GLB]];
    for (const k of Object.keys(SKEL_GLB)) jobs.push(["skel_" + k, SKEL_GLB[k]]);
    for (const k of Object.keys(NPC_GLB)) jobs.push(["npc_" + k, NPC_GLB[k]]);
    let done = 0;
    await Promise.all(
      jobs.map(async ([k, b64]) => {
        try {
          models[k] = await glb(b64);
        } catch (e) {
          if (k === "mage" || k === "props") throw e;
          console.warn(k, e);
        }
        $("loadBar").style.width = (++done / (jobs.length + 1)) * 90 + "%";
      }),
    );
    for (const n of models.props.scene.children) PROP[n.name] = n;
    $("loadLabel").textContent = L("Harana eta leizea…");
    await egReady;
    build();
    ready = true;
    translate();
    $("loadBar").style.width = "100%";
    $("loading").hidden = true;
    requestAnimationFrame(loop);
    if (new URLSearchParams(location.search).has("test"))
      window.__game = {
        P,
        TITLE,
        AN,
        OROIT,
        FACE,
        faceWorld,
        faceCam,
        faceLook,
        film,
        notify,
        title,
        oroitPlay,
        oroitLog,
        anbotoStart,
        anbotoDuel,
        saved,
        DGA,
        AM,
        ING,
        HAUTS,
        DUST_GATES,
        BERTSOAK,
        dustThrow,
        dustUseful,
        starPlatform,
        inMist,
        bertsoCount,
        seaskaEffect,
        seaskaReady,
        ametsaEnter,
        ametsaWake,
        ametsaSeaska,
        ametsaActionNear,
        ingumaStart,
        ingumaFinale,
        ingumaLullaby,
        SHAFTS,
        MIRRORS,
        CRYSTALS,
        CRYSTAL_SETS,
        WEBS,
        MIR,
        mirrorTurn,
        mirrorRaise,
        mirrorLower,
        mirrorCan,
        beamTrace,
        shaftAt,
        shaftLight,
        DGH,
        HZ,
        ZB,
        zbStart,
        zbDown,
        zbHit,
        zbLight,
        odeiCloudRide,
        odeiCloudNear,
        iratiHerensuge,
        HOUSE,
        DGE,
        POUCHES,
        houseKnock,
        houseDoorNear,
        homeEnter,
        homeSleep,
        homeActionNear,
        GLIDE,
        UPDRAFTS,
        updraftAt,
        DGZ,
        ZR,
        Z7,
        ORZ,
        ODEI,
        odeiStart,
        ortziEffect,
        glideStop,
        setJumpHeld: (v) => {
          jumpHeld = !!v;
        },
        input,
        get platforms() {
          return platforms;
        },
        get solids() {
          return solids;
        },
        ZONES,
        ZONE,
        AREA,
        HUB,
        DUNGEON,
        ROOMS,
        ROOM,
        DOORS,
        CHESTS,
        BREAKABLES,
        NPCS,
        TXALA,
        RHYTHMS,
        LOCK,
        CHAIN,
        BOSS,
        BJ,
        MINI,
        GET,
        CRAFT,
        ENEMIES,
        SHOTS,
        SAFE,
        ATK,
        MAG,
        BOLTS,
        RUNE_PUZ,
        CAM,
        CAMG,
        CTX,
        SND,
        PROP,
        models,
        scene,
        renderer,
        camera,
        hero,
        enterZone,
        zoneActivate,
        teleport,
        jump,
        dash,
        switchPhase,
        attack,
        interact,
        actionHere,
        talkTo,
        txalaOpen,
        txalaHit,
        txalaClose,
        txalaLearn,
        rhythmEffect,
        lockToggle,
        chainFire,
        chainCandidates,
        openChest,
        openDoor,
        tryDoor,
        itemGet,
        itemGetClose,
        pieceGet,
        spawnEnemy,
        spawnWave,
        playerHit,
        hitEnemy,
        killEnemy,
        bossStart,
        miniStart,
        isCleared,
        objective,
        flagSet,
        craftEnter,
        craftExit,
        craftGrab,
        craftDrag,
        craftRelease,
        craftRotate,
        pickPiece,
        settle,
        support,
        contains,
        topY,
        gy,
        riverW,
        walkSD,
        ECHOES,
        HERBS,
        DGS,
        DGL,
        SERP,
        LAM,
        RAFT,
        FANS,
        MISTS,
        WIND,
        DGT,
        TART,
        EYE,
        DAY,
        WISP_DEFS,
        NIGHT_HOME,
        dayClock,
        eguzkiloreEffect,
        npcsNightStart,
        POTT,
        ponyMount,
        ponyDismount,
        pottokaCall,
        SECRETS,
        GUARD,
        guardPress,
        IVY,
        CLIMB,
        TXB,
        bombThrow,
        bombExplode,
        bombsBlow,
        crackWall,
        crackRock,
        BREAKABLES,
        RUNE_SETS,
        buildRunePuzzles,
        DGJ,
        ERR,
        ZAZPI,
        HEARTHS,
        SHORTCUTS,
        DOL,
        dolmenWake,
        hearthRest,
        shortcutNear,
        errolanStart,
        ivyWall,
        ivySide,
        slab,
        zoneBuild,
        climbDrop,
        meleeHit,
        HERD,
        eyeRay,
        eyeOccluders,
        RUNES,
        chargeStart,
        chargeRelease,
        hasFire,
        breakAt,
        hornBlow,
        windable,
        keysHere,
        zoneFadeUpdate,
        bossBar,
        QST,
        mikelStart,
        questLog,
        pitUpdate,
        ctxPower,
        ctxUpdate,
        powerMenu,
        playScene,
        endScene,
        nextShot,
        start,
        tick,
        direction,
        magicReset,
        returnCheckpoint,
        cinematicState: () => cinematic,
        PRO,
        FILM,
        RING,
        VOICE,
        prologueStart,
        prologueSkip,
        proUpdate,
        deiaAnswer,
        deiaRing,
        deia,
        iratiCall,
        filmSkip,
        filmEnd,
        voiceLoad,
        coachState: () => ({ cur: COACH.cur, seen: [...COACH.seen], frame, time }),
        phase: () => phase,
        blend: () => phaseBlend,
        state: () => ({ started, paused, respawnTimer, phaseCooldown, zone: ZONE.cur, room: ROOM.cur && ROOM.cur.id, fight: ROOM.fight && ROOM.fight.id, area: AREA.cur }),
        resume: () => {
          endScene();
          if (GET.on) {
            GET.t = 9;
            itemGetClose();
          }
          if (TXALA.on) txalaClose();
          started = true;
          paused = false;
          titleLeave();
          $("overlay").hidden = true;
          $("start").hidden = true;
          $("hud").hidden = false;
        },
        /* fotograma bat (bideoa grabatzeko): logika + efektuak + kamera + errendatzea */
        step: (dt, logic = true) => {
          if (logic) for (let k = 0; k < Math.round(dt * 120); k++) tick(1 / 120);
          if (cinematic) updateCinema(dt);
          else if (CRAFT.on) craftCamera(dt);
          else cameraUpdate(dt);
          drawGuide();
          occlusionUpdate(dt);
          zoneFadeUpdate(dt);
          fxUpdate(dt);
          juiceUpdate(dt);
          numbersUpdate(dt);
          shieldHintUpdate(dt);
          atmoUpdate(dt);
          if (mixer) mixer.update(0);
          sky.position.copy(camera.position);
          renderer.render(scene, camera);
        },
        draw: () => {
          cameraUpdate(1);
          drawGuide();
          renderer.render(scene, camera);
        },
      };
  }
  boot().catch((e) => {
    $("loading").hidden = true;
    $("fatal").hidden = false;
    $("fatal").textContent = L("Ezin izan da jokoa kargatu. ", "No se pudo cargar el juego. ") + e.message;
    console.error(e);
  });
})();
