  const T = THREE,
    $ = (id) => document.getElementById(id),
    PI = Math.PI,
    TAU = PI * 2,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    mix = (a, b, t) => a + (b - a) * t,
    dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
    mobile = matchMedia("(pointer:coarse)").matches;
  /* euskara hutsean: L(eu, es) beti euskarazko testua da (gaztelaniazkoak iturburuan bakarrik geratzen dira) */
  const language = "eu";
  const L = (eu) => eu;
  /* teklatuaren letrak: mugikorrean ez dute zentzurik */
  const kb = (s) => (mobile ? "" : s);
  let saved = { stage: 0, memories: [], ending: null, deaths: 0, assist: false, cleared: [], boons: [] };
  try {
    const s = JSON.parse(localStorage.getItem("oihartzun-bialde-v2"));
    if (s && Number.isInteger(s.stage) && s.stage >= 0 && s.stage < 6 && Array.isArray(s.memories))
      saved = { ...saved, ...s };
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
    currentStage = -1,
    endingActive = false;
  let boss = { clock: 0, state: "sleep", hits: 0, wave: null, attackPhase: 0, hitLock: 0, group: null, ring: null };
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
  const ISLANDS = [
    {
      x: 0,
      z: 23,
      y: 0,
      rx: 16,
      rz: 18,
      name: ["Azken Herria", "El Último Pueblo"],
      hint: [
        "Zubia hautsi da. Beste aldean ba al dago? Q: aldatu garaia.",
        "El puente está roto. ¿Existe en el otro lado? Q: cambia de época.",
      ],
    },
    {
      x: 0,
      z: -24,
      y: 2,
      rx: 12,
      rz: 12,
      name: ["Uraren Memoria", "La Memoria del Agua"],
      hint: [
        "Jauzi bikoitza eta BULTZADA. Ehundu: hurrengo zubia bi garaietan sendoa.",
        "Salta dos veces y usa DASH. Tejer vuelve sólido el próximo puente en ambas épocas.",
      ],
    },
    {
      x: 31,
      z: -57,
      y: 5,
      rx: 12,
      rz: 12,
      name: ["Lo Dagoen Artxiboa", "El Archivo Dormido"],
      hint: [
        "Airean garaia aldatzean, BULTZADA behin berreskuratzen da.",
        "Cambiar de época en el aire recupera el DASH una vez por salto.",
      ],
    },
    {
      x: 0,
      z: -98,
      y: 8,
      rx: 13,
      rz: 13,
      name: ["Argiaren Haustura", "La Fractura de la Luz"],
      hint: [
        "Argi gorriak iraganean bakarrik egiten du min. Aldatu garaia igarotzean.",
        "La luz roja solo daña en el pasado. Cambia de época para atravesarla.",
      ],
    },
    {
      x: -32,
      z: -131,
      y: 11,
      rx: 12,
      rz: 12,
      name: ["Itzultzen Ez Den Ahotsa", "La Voz que No Vuelve"],
      hint: [
        "Dorrearen kanpaia entzuten da. Lotu jauzia, BULTZADA eta garaia.",
        "Ya se oye la campana de la torre. Encadena salto, DASH y cambio de época.",
      ],
    },
    {
      x: 0,
      z: -174,
      y: 42,
      rx: 19,
      rz: 19,
      name: ["Gauekoren Erlojua", "El Reloj de Gaueko"],
      hint: [
        "Uhina: beste garaira aldatu. Nukleoa irekita: SORGINKERIA edo BULTZADA.",
        "Onda: cambia a la otra época. Núcleo abierto: HECHIZO o DASH.",
      ],
    },
  ];
  /* Gauekoren erlojua hodeien gainean: Orratzaren igoera (ascent.js) */
  const BOSS_Y = ISLANDS[5].y,
    BOSS_HITS = 4;
  const checkpointPositions = [
    [0, 29],
    [0, -20],
    [31, -53],
    [0, -94],
    [-32, -127],
    [0, -162],
  ];
  /* ==================================================================
     ATMOSFERA · bi garai, bi zeru
     Iragana: ilunabar urrekara, itsasoa bizirik.
     Oraina: egun argi eta hotza, denbora hautsia — itsasoa izoztuta (izotz-zelai
     zabala) eta denbora-hauts gutxi airean geldirik. Mundu irekiaren sentsazioa.
     EGFX (/assets/egfx.js) ez badago, lehengo gradienteak erabiltzen dira.
     ================================================================== */
  const EG = window.EGFX && EGFX.enabled ? EGFX : null;
  const ATMO = { skyPast: null, skyNow: null, envPast: null, envNow: null, terrain: undefined, rockMat: null, dust: null,
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
    const m = EG && EG.has(key) ? EG.material(key, { color: key === "cliff" ? "#8aa3ae" : "#93b0bd", repeat: [12, 1.2], roughness: 1, normal: 1.3 }) : null;
    return (ATMO.rockMat = m || material("#4e6e7a"));
  }
  function stackMaterial() {
    if (ATMO.stackMat) return ATMO.stackMat;
    const key = EG && EG.has("cliff") ? "cliff" : "rock";
    const m = EG && EG.has(key) ? EG.material(key, { color: "#7f97a1", repeat: [4, 3.2], roughness: 1, normal: 1.4 }) : null;
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
    horizonUpdate(dt);
    if (sky.material.uniforms.blend) sky.material.uniforms.blend.value = b;
    const su = sea.material.uniforms;
    su.blend.value = b;
    if (su.camPos) su.camPos.value.copy(camera.position);
    if (ATMO.terrain) ATMO.terrain.userData.uBlend.value = b;
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
    if (EG && EG.tier === 0) {
      const want = b < 0.5 ? ATMO.envPast : ATMO.envNow;
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
    const falls = [];
    for (const I of ISLANDS.slice(1, 5)) falls.push(new T.Vector3(I.x + I.rx * 0.7, I.z, 1));
    while (falls.length < 5) falls.push(new T.Vector3(0, 0, 0));
    falls[4].set(0, 23, 0); /* Azken Herriaren ertza */
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
      },
      vertexShader:
        "varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
      fragmentShader: [
        "uniform float clock,blend,useSky,useWater;uniform vec3 camPos;uniform sampler2D tPast,tNow,tWater,tCrack;uniform vec3 falls[5];varying vec3 wp;",
        "vec2 eq(vec3 d){return vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5);}",
        "vec3 skyCol(vec3 d){",
        "  if(useSky>.5){vec2 uv=eq(d);return mix(texture2D(tPast,uv).rgb,texture2D(tNow,uv).rgb,blend);}",
        "  float t=pow(max(d.y,0.),.6);vec3 day=mix(vec3(.82,.71,.55),vec3(.23,.47,.59),t);vec3 night=mix(vec3(.74,.85,.94),vec3(.27,.53,.86),t);return mix(day,night,blend);}",
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
        "  vec3 col=mix(deep,shal,.35+wv*.15*(1.-fr));",
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
        "  col+=pow(max(dot(r,sd),0.),70.)*(1.-fr)*vec3(1.,.82,.55)*.45+pow(max(dot(r,sd),0.),18.)*fr*vec3(.9,.95,1.)*.22;",
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
    const portrait = innerHeight > innerWidth;
    return {
      k: (portrait ? 1.95 : mobile ? 1.12 : 1) * CAM.user,
      fov: portrait ? 50 : 44,
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
      const a = o.ring ? (k / o.n) * TAU : Math.random() * TAU,
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
      CAM.fovKick = 7;
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
      fxBurst(P.x, P.y + 1, P.z, { n: 20, speed: 5, life: 0.5, size: 0.28, color: "#ff8a6a", grav: 4 });
      SND.hurt();
    },
    bossHit(x, y, z) {
      hitStop = 0.11;
      shake(0.85);
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
    let ctx = null, master, comp, sfx, mus, amb, verbIn, noise = null, nextBeat = 0, beatN = 0, pads = [], ambNodes = null, lastPhase = -1;
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
      get ready() { return !!ctx; },
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
      hit(d) {
        if (!ok()) return;
        const t = ctx.currentTime;
        hiss(t, 0.09, 0.16 + d * 0.04, "lowpass", 2600, 300, 0.8);
        tone("sine", 190, t, 0.002, 0.12, 0.14 + d * 0.04, sfx, 70);
        tone("square", 2400, t, 0.001, 0.02, 0.02, sfx, 1800);
      },
      clang() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 1830, t, 0.001, 0.35, 0.05, sfx, 1790);
        tone("sine", 2710, t, 0.001, 0.25, 0.035, sfx, 2650);
        hiss(t, 0.06, 0.08, "highpass", 5000, 3000, 0.7);
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
      thud() {
        if (!ok()) return;
        const t = ctx.currentTime;
        tone("sine", 82, t, 0.002, 0.3, 0.16, sfx, 40);
        hiss(t, 0.18, 0.08, "lowpass", 900, 150, 0.7);
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
    witch:
      '<svg viewBox="0 0 100 120" aria-hidden="true"><path class="p2" d="M10 120c3-17 18-27 40-28 22 1 37 11 40 28z"/>' +
      '<path class="p3" d="M27 50c-6 22-3 42 7 56l8-36zM73 50c6 22 3 42-7 56l-8-36z"/>' +
      '<ellipse class="p1" cx="50" cy="69" rx="16.5" ry="20"/>' +
      '<path class="p3" d="M33 60c4-9 12-12 17-12s14 3 17 12c-6-5-11-6-17-6s-11 1-17 6z"/>' +
      '<g class="eyes"><ellipse class="p4" cx="43.5" cy="68" rx="2.3" ry="2.8"/><ellipse class="p4" cx="56.5" cy="68" rx="2.3" ry="2.8"/></g>' +
      '<path class="p3" d="M40 62.5l7 .8M60 62.5l-7 .8" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
      '<path class="mouth p4" d="M45.5 80.5q4.5 2.6 9 0q-4.5 1.2-9 0z"/>' +
      '<ellipse class="p2" cx="50" cy="49" rx="40" ry="7.5"/>' +
      '<path class="p2" d="M24 47q26-7 52 0l-7-6q-6-22 11-37q-27 6-36 40z"/>' +
      '<path class="p5" d="M27 45.5q23-6 46 0" fill="none" stroke-width="2.4"/></svg>',
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
    return who.startsWith("AMAIUR") ? "witch" : who.startsWith("IRATI") ? "radio" : who.startsWith("GAUEKO") ? "gaueko" : "unknown";
  }
  /* ---- irakaspenak: kontrol bakoitza behar den unean, behin ---- */
  const COACH = { seen: new Set(), cur: null };
  try {
    for (const k of JSON.parse(localStorage.getItem("oihartzun-coach") || "[]")) COACH.seen.add(k);
  } catch {}
  /* euM/esM: ukipen-pantailarako testua, teklatuaren aipamenik gabe */
  function coach(id, key, eu, es, btn, euM, esM) {
    if (COACH.seen.has(id) || cinematic || workshop.active) return false;
    if (COACH.cur === id) return true;
    coachHide();
    COACH.cur = id;
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
    if (!started || paused || cinematic || saved.ending) return;
    const st = saved.stage,
      fight = ARENA.state === "fight";
    if (ATK.n && COACH.cur === "attack") coachDone("attack");
    if (MAG.charging && COACH.cur === "charge") coachDone("charge");
    if (P.travel >= 4) coachDone("move");
    /* lehentasun-ordena: une bakoitzean irakaspen bakarra */
    (fight &&
      ARENA.island === 0 &&
      ENEMIES.some((e) => e.state !== "spawn") &&
      coach("attack", "J", "SORGINKERIA: J edo klika · izpiak bakarrik bilatzen du helburua", "HECHIZO: J o clic · el rayo busca solo a su objetivo", "attackBtn", "SORGINKERIA: sakatu · izpiak bakarrik bilatzen du helburua", "HECHIZO: pulsa · el rayo busca solo a su objetivo")) ||
      (fight &&
        ATK.n >= 6 &&
        ENEMIES.some((e) => e.state !== "spawn" && e.state !== "dead") &&
        coach("charge", "J", "Mantendu J: INDARRA kargatu · askatu: eztanda", "Mantén J: carga INDARRA · suelta: explosión", "attackBtn", "Mantendu SORGINKERIA: INDARRA · askatu: eztanda", "Mantén HECHIZO: INDARRA · suelta: explosión")) ||
      (fight &&
        COACH.seen.has("charge") &&
        ENEMIES.some((e) => e.state !== "dead" && Math.hypot(e.x - P.x, e.z - P.z) < 3.2) &&
        coach("spin", "F+J", "BULTZADA eta SORGINKERIA: biraka-kolpea", "DASH y HECHIZO: golpe giratorio", "dashBtn", "BULTZADA eta SORGINKERIA: biraka-kolpea", "DASH y HECHIZO: golpe giratorio")) ||
      (fight &&
        COACH.seen.has("attack") &&
        ENEMIES.some((e) => e.state === "wind" && Math.hypot(e.x - P.x, e.z - P.z) < 4) &&
        coach("dodge", "F", "BULTZADA bitartean ukiezina zara: saihestu erasoa!", "Durante el DASH eres invulnerable: ¡esquiva!", "dashBtn", "BULTZADA bitartean ukiezina zara: saihestu erasoa!", "Durante el DASH eres invulnerable: ¡esquiva!")) ||
      (!fight && zoneHere() && !isCleared(currentStage) && !CRAFT.on &&
        coach("craft", "G", "ESKU MAGIKOA: egin klik kaxa batean eta arrastatu", "MANO MÁGICA: haz clic en una caja y arrástrala", "useBtn", "ESKUA: ukitu kaxa bat eta arrastatu", "MANO: toca una caja y arrástrala")) ||
      (st === 0 && P.travel < 4 && coach("move", "WASD", "Mugitu: WASD edo geziak · Shift: korrika", "Muévete: WASD o flechas · Shift: correr", "stick", "Mugitu: arrastatu makila · ertzeraino, korrika", "Muévete: arrastra la palanca · hasta el borde, corres")) ||
      (!fight && COACH.seen.has("move") && P.travel > 25 &&
        coach("camera", "⇄", "Kamera: saguaren eskuineko botoia + arrastatu · gurpila: hurbildu", "Cámara: botón derecho del ratón + arrastrar · rueda: acercar", null, "Kamera: arrastatu hatza pantailan (biratu eta hurbildu) · bi ukitu: zentratu", "Cámara: arrastra el dedo por la pantalla (girar y acercar) · dos toques: centrar")) ||
      (mobile && !fight && CTX.cur && !CRAFT.on &&
        coach("power", "", "", "", "useBtn", "Botere-botoia: une bakoitzean behar duzun boterea agertzen da", "Botón de poder: aparece el poder que necesitas en cada momento")) ||
      (st === 0 && !fight && phase === 1 && Math.hypot(P.x, P.z - 0.5) < 9 && coach("shift", "Q", "Zubia iraganean dago · ALDATU GARAIA", "El puente existe en el pasado · CAMBIA DE ÉPOCA", "phaseBtn", "Zubia iraganean dago · sakatu ALDATU", "El puente existe en el pasado · pulsa CAMBIAR")) ||
      (st === 0 && phase === 0 && P.z < -6 && P.z > -14 && coach("jump", "␣ ×2", "JAUZI · airean berriro sakatu: jauzi bikoitza", "SALTA · pulsa otra vez en el aire: doble salto", "jumpBtn")) ||
      (st === 1 && isCleared(1) && P.x > 3 && P.z < -26 && coach("dash", "F", "BULTZADA · aurrera ziztu bizian, lurrean edo airean", "DASH · impulso largo, en el suelo o en el aire", "dashBtn")) ||
      (st === 1 && isCleared(1) && Math.hypot(P.x - 12, P.z + 37) < 11 && magic.weaveCooldown <= 0 &&
        coach("weave", "C", "EHUNDU · zubia bi garaietan sendo, 12 segundoz", "TEJER · el puente sólido en ambas épocas, 12 s", "useBtn", "Sakatu EHUNDU: zubia bi garaietan sendo, 12 s", "Pulsa TEJER: el puente sólido en ambas épocas, 12 s")) ||
      (st === 2 && !fight && !P.grounded && P.vy < 2 && coach("airshift", "Q", "Airean garaia aldatu: BULTZADA berri bat", "Cambia de época en el aire: un DASH nuevo", "phaseBtn", "Airean ALDATU: BULTZADA berri bat", "CAMBIAR en el aire: un DASH nuevo")) ||
      (st === 3 && isCleared(3) && Math.hypot(P.x + 9, P.z + 108) < 10 && coach("beam", "Q", "Argi gorriak iraganean bakarrik egiten du min", "La luz roja solo daña en el pasado", "phaseBtn"));
  }


  /* ==================================================================
     OIHARTZUNAK · hiru erronka hautazko, hiru kanpai
     Orainean, herria ito zuen olatua izoztuta dago: haren gandorretan
     ibil daiteke. Iraganean itsaso arrunta da. Kanpai bakoitzak Iratiren
     benetako ahotsaren zati bat gordetzen du — ez grabazioa.
     Datuak: [x, z, goiko y, erradioa, biraketa] · oholak: [x, z, y, w, d, mugikorra]
     ================================================================== */
  const ECHO_DEFS = [
    {
      /* A · Uhin Izoztuak (2. uhartea): olatuen eskailera leuna; itzulera iraganeko oholetatik */
      islet: [-29, -44.5, 5.4, 4.4],
      waves: [
        [-16.5, -19.5, 2.7, 2.5, 0.6],
        [-22.5, -23, 3.4, 2.5, 1.0],
        [-27, -29, 4.1, 2.5, 1.5],
        [-29, -36, 4.8, 2.5, 1.9],
      ],
      planks: [
        [-20.5, -44, 4.8, 4, 4],
        [-13, -38.5, 3.4, 4, 4],
      ],
      crystals: [],
    },
    {
      /* B · Ekaitzaren Eskailera (4. uhartea): garaiak txandakatzen dira, airean aldatu behar da */
      islet: [9, -118, 13.8, 3.2],
      waves: [
        [16, -105.5, 9.2, 2.4, 2.7],
        [24.5, -117, 11.6, 2.4, 3.6],
      ],
      planks: [
        [22, -110, 10.4, 4, 4],
        [19.5, -122.5, 12.8, 4, 4],
      ],
      crystals: [],
    },
    {
      /* C · Isiltasunaren Gandorra (5. uhartea): ohol mugikorra, jauzi bikoitza eta kristala */
      islet: [-30, -152.5, 18.6, 3.4],
      waves: [
        [-47.5, -136, 12.2, 2.4, 4.4],
        [-50.5, -152, 14.6, 2.4, 5.3],
      ],
      planks: [
        [-53, -143.5, 13.4, 3.6, 3.6, true],
        [-41.5, -157, 15.6, 3.6, 3.6],
      ],
      crystals: [[-36, -155, 18.4]],
    },
  ];
  const ECHO_SCENES = [
    [
      ["IRATI · OIHARTZUNA", "Amaiur… hau ez da grabazioa. Olatu hau izoztu zenean, nire ahotsa barruan geratu zen.", "Amaiur… esto no es la grabación. Cuando esta ola se heló, mi voz se quedó dentro."],
      ["IRATI · OIHARTZUNA", "Txikitan bezala: oihu egin itsasoari, eta itzuli egiten da. Oihartzuna da itsasoak ematen duen erantzun bakarra.", "Como cuando éramos pequeñas: le gritas al mar y vuelve. El eco es la única respuesta que da el mar."],
      ["AMAIUR", "Beste kanpai batzuk entzuten ditut. Urrunago.", "Oigo otras campanas. Más lejos."],
    ],
    [
      ["IRATI · OIHARTZUNA", "Kanpaia nik jo nuen lehenengo aldiz, ura etxeetara sartu zenean. Ez nekien denbora geldituko zenik.", "Yo toqué la campana la primera vez, cuando el agua entró en las casas. No sabía que el tiempo se detendría."],
      ["IRATI · OIHARTZUNA", "Zu deitzen ari nintzela uste nuen. Barkatu, Amaiur. Ehun aldiz jo dut geroztik.", "Creía que te estaba llamando. Perdóname, Amaiur. La he tocado cien veces desde entonces."],
    ],
    [
      ["IRATI · OIHARTZUNA", "Gaueko ez da gaiztoa. Gaua da, besterik ez. Eta gau orok egunsenti bat zor dio norbaiti.", "Gaueko no es malvado. Es la noche, nada más. Y toda noche le debe un amanecer a alguien."],
      ["IRATI · OIHARTZUNA", "Erlojuaren aurrean zaudenean, ez pentsatu nigan. Pentsatu herriko leihoetan, goizean.", "Cuando estés ante el reloj, no pienses en mí. Piensa en las ventanas del pueblo, por la mañana."],
    ],
  ];
  const ECHO_ALL = ["AMAIUR", "Hiru oihartzunak entzun ditut. Ez zara grabazio bat, Irati. Itsasoak gogoratzen zaitu.", "He oído los tres ecos. No eres una grabación, Irati. El mar te recuerda."];
  const ECHO = { list: [], waves: [], spray: null, ghostMat: null, hinted: new Set(), callT: 0, lastPhase: -1 };

  /* Izotz-materiala: gandorretan izotz-hautsa (zapaltzeko lekua), alboetan beira urdina;
     iraganean ur iluna bihurtzen da. Itsasoaren ur-normalak ematen dio izoztutako uhin-ehundura. */
  function iceMaterial() {
    if (ATMO.iceMat) return ATMO.iceMat;
    const wn = rawTex("water_n", false),
      sc = rawTex("snow_c", true);
    const m = new T.MeshStandardMaterial({
      color: "#7fc6de",
      roughness: 0.14,
      metalness: 0.02,
      envMapIntensity: 1.5,
      emissive: new T.Color("#1b5a73"),
      emissiveIntensity: 0.38,
    });
    if (wn) {
      m.normalMap = wn;
      m.normalScale.set(0.5, 0.5);
    }
    const u = { uBlend: { value: 1 }, uSnow: { value: sc } };
    m.userData.u = u;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWN;\nvarying vec3 vWP;")
        .replace(
          "#include <project_vertex>",
          "#include <project_vertex>\nvWN=normalize(mat3(modelMatrix)*objectNormal);\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      sh.fragmentShader =
        "uniform float uBlend;\nuniform sampler2D uSnow;\nvarying vec3 vWN;\nvarying vec3 vWP;\n" +
        sh.fragmentShader
          .replace(
            "#include <map_fragment>",
            [
              "float iceUp = smoothstep( 0.88, 0.97, normalize( vWN ).y ) * uBlend;",
              "diffuseColor.rgb *= mix( 0.42, 1.12, smoothstep( -8.5, 9.0, vWP.y ) );",
              sc ? "vec3 frostC = pow( texture2D( uSnow, vWP.xz * 0.21 ).rgb, vec3( 2.2 ) ) * vec3( 1.02, 1.06, 1.12 );" : "vec3 frostC = vec3( 0.86, 0.92, 0.98 );",
              "diffuseColor.rgb = mix( diffuseColor.rgb, frostC, iceUp * 0.9 );",
              "diffuseColor.rgb = mix( vec3( 0.04, 0.2, 0.24 ), diffuseColor.rgb, uBlend );",
            ].join("\n"),
          )
          .replace(
            "#include <roughnessmap_fragment>",
            "#include <roughnessmap_fragment>\nroughnessFactor = mix( 0.06, mix( roughnessFactor, 0.78, iceUp ), uBlend );",
          )
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\nfloat iceRim = pow( 1.0 - abs( dot( normalize( vViewPosition ), normal ) ), 3.0 );\ntotalEmissiveRadiance = totalEmissiveRadiance * uBlend + iceRim * vec3( 0.42, 0.78, 1.0 ) * 0.55 * uBlend;",
          );
    };
    m.customProgramCacheKey = () => "oih-ice";
    return (ATMO.iceMat = m);
  }
  /* Olatu izoztua: itsasotik jauzi eta izoztu zen ur-zutabea. Zurtoin mehea (hutsuneak
     ondo ikusteko), goian koroa laua (zapaltzeko) eta aurrean gandor kizkurra (olatuaren ertza). */
  function waveGeometry(r, H, seed) {
    const ctl = [
      [1.55 * r, -0.9],
      [1.2 * r, 0.12 * H],
      [0.66 * r, 0.42 * H],
      [0.6 * r, 0.68 * H],
      [0.78 * r, H - 2.4],
      [1.02 * r, H - 0.9],
      [1.16 * r, H - 0.3],
      [1.08 * r, H - 0.02],
      [0.8 * r, H],
      [0.001, H],
    ].map(([R, Y]) => new T.Vector2(R, Y));
    const prof = new T.SplineCurve(ctl).getSpacedPoints(40),
      A = 44,
      N = prof.length,
      pos = [],
      uv = [],
      idx = [];
    for (let j = 0; j <= A; j++) {
      const th = (j / A) * TAU,
        front = Math.pow(Math.max(0, Math.cos(th)), 3);
      for (let i = 0; i < N; i++) {
        let { x: R, y: Y } = prof[i];
        const rimZone = T.MathUtils.smoothstep(R, 0.85 * r, 1.12 * r) * T.MathUtils.smoothstep(Y, H - 3, H - 0.4);
        /* gandorra: aurrean ertza kanporantz eta gorantz, gero behera kizkurtzen */
        R += front * rimZone * 0.75 * r;
        Y += front * rimZone * (0.9 - Math.max(0, R - 1.5 * r) * 1.4);
        const stem = Y < H - 1.2 ? 1 : 0;
        R *= 1 + stem * (0.07 * Math.sin(5 * th + Y * 0.55 + seed) + 0.04 * Math.sin(11 * th - Y * 1.3 + seed * 2));
        pos.push(Math.cos(th) * R, Y, Math.sin(th) * R);
        uv.push(th * 1.6, Y / 3);
      }
    }
    for (let j = 0; j < A; j++)
      for (let i = 0; i < N - 1; i++) {
        const a = j * N + i,
          b = a + N;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function addWave([x, z, y, r, rot], k) {
    const H = y + 8.5,
      m = obj(waveGeometry(r, H, k * 1.7 + 0.3), iceMaterial());
    m.position.set(x, -8.5, z);
    m.rotation.y = rot;
    m.castShadow = true;
    m.receiveShadow = true;
    if (!ECHO.ghostMat)
      ECHO.ghostMat = new T.MeshBasicMaterial({ color: "#9feaf5", transparent: true, opacity: 0, depthWrite: false });
    const ghost = new T.Mesh(new T.TorusGeometry(r, 0.05, 4, 48), ECHO.ghostMat);
    ghost.rotation.x = -PI / 2;
    ghost.position.set(x, y + 0.06, z);
    scene.add(ghost);
    const plat = { x, z, y, rx: r, rz: r, phase: 1, wave: true, m };
    platforms.push(plat);
    const W = { x, z, y, r, rot, H, m, ghost, plat, seed: k * 2.3 };
    ECHO.waves.push(W);
    return W;
  }
  /* Izotz-zintzilikarioak koroaren ertzean eta ur-tanta izoztuak gandorraren aurrean (orainean bakarrik) */
  function addSpray() {
    const per = mobile ? 9 : 16,
      n = ECHO.waves.length * per,
      im = new T.InstancedMesh(new T.ConeGeometry(0.16, 1, 5), iceMaterial(), n);
    im.castShadow = false;
    const base = [];
    let s = 4242;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const W of ECHO.waves)
      for (let i = 0; i < per; i++) {
        const th = rnd() * TAU,
          drop = i % 3 === 2,
          R = W.r * (drop ? 1.9 + rnd() * 0.9 : 1.08 + rnd() * 0.1) * (Math.cos(th) > 0 && !drop ? 1 + 0.6 * Math.pow(Math.cos(th), 3) : 1),
          len = drop ? 0.35 : 0.7 + rnd() * 1.5,
          a = th - W.rot,
          v = drop ? W.H - 1.4 + rnd() * 2.4 : W.H - 0.55 - len / 2;
        base.push({ p: new T.Vector3(W.x + Math.cos(a) * R, -8.5 + v, W.z + Math.sin(a) * R), s: new T.Vector3(drop ? 1.1 : 1, drop ? 0.35 : -len, drop ? 1.1 : 1) });
      }
    scene.add(im);
    ECHO.spray = { im, base, k: -1 };
  }
  /* Kanpai-uhartetxoa: uharteen antzeko harri flotatzailea, gainean kanpai-arkua */
  function addIslet([x, z, y, r], id) {
    const geo = new T.CylinderGeometry(1, 1, 1, 26, 4),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i),
        pz = a.getZ(i),
        py = a.getY(i),
        ang = Math.atan2(pz, px),
        t = py + 0.5,
        edge = 1 + 0.06 * Math.sin(ang * 5 + id * 2) + 0.04 * Math.sin(ang * 9 + id);
      const sc = (0.42 + t * 0.58) * (t > 0.99 ? 1 : edge);
      a.setXYZ(i, px * r * sc, y - 6 + t * 6, pz * r * sc);
    }
    geo.computeVertexNormals();
    obj(geo, rockMaterial()).position.set(x, 0, z);
    const cap = new T.CircleGeometry(r, 32);
    cap.rotateX(-PI / 2);
    const tm = terrainMaterial();
    let top;
    if (tm) {
      worldUV(cap, x, z);
      top = obj(cap, tm);
    } else top = obj(cap, material("#b7cbd0"));
    top.position.set(x, y + 0.015, z);
    top.castShadow = false;
    platforms.push({ x, z, y, rx: r, rz: r, phase: -1, islet: id, m: top });
    for (let i = 0; i < 7; i++) {
      const an = (i * TAU) / 7 + id;
      model(i % 2 ? "rock_single_A" : "rock_single_C", x + Math.cos(an) * r * 0.97, y - 0.9, z + Math.sin(an) * r * 0.97, 1.7 + (i % 3) * 0.3, an);
    }
    /* arkua eta kanpaia */
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = id * 1.3 + 0.4;
    scene.add(g);
    for (const sx of [-1.25, 1.25]) box(sx, 1.65, 0, 0.34, 3.3, 0.34, "#76868c", g);
    box(0, 3.35, 0, 3.1, 0.3, 0.42, "#5f4330", g);
    const pivot = new T.Group();
    pivot.position.set(0, 3.2, 0);
    g.add(pivot);
    const prof = [
      [0, 0], [0.16, 0.01], [0.25, 0.09], [0.29, 0.3], [0.33, 0.56], [0.42, 0.79], [0.53, 0.93], [0.56, 0.97],
      [0.5, 0.96], [0.39, 0.84], [0.29, 0.6], [0.25, 0.32], [0.2, 0.12], [0, 0.08],
    ].map(([px, py]) => new T.Vector2(px * 1.5, -py * 1.5));
    const bell = obj(
      new T.LatheGeometry(prof, 30),
      ATMO.bronze ||
        (ATMO.bronze = new T.MeshStandardMaterial({ color: "#b8873f", metalness: 0.9, roughness: 0.3, side: T.DoubleSide })),
      pivot,
    );
    bell.castShadow = true;
    const clap = orb(0, -1.2, 0, 0.12, "#3d2f22", pivot);
    clap.castShadow = false;
    /* argi-zutabea: urrunetik ikusten da, kanpaia jo arte */
    const shaft = new T.Mesh(
      new T.CylinderGeometry(0.85, 0.85, 46, 20, 1, true),
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
        uniforms: { uA: { value: 1 }, uTime: { value: 0 }, uC: { value: new T.Color("#ffd58a") } },
        vertexShader:
          "varying vec2 vUv;varying float vE;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vE=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}",
        fragmentShader:
          "uniform float uA,uTime;uniform vec3 uC;varying vec2 vUv;varying float vE;void main(){float a=pow(vE,2.)*pow(vUv.y,1.7)*(.78+.22*sin(vUv.y*36.+uTime*2.2));gl_FragColor=vec4(uC,a*uA*.42);}",
      }),
    );
    /* CylinderGeometry-n uv.y=1 goian dago: alderantziz, argia behean indartsuena izan dadin */
    shaft.rotation.x = PI;
    shaft.position.set(x, y + 23, z);
    shaft.renderOrder = 5;
    scene.add(shaft);
    const halo = glow(x, y + 2.6, z, "#ffd9a0", 3.2);
    return { id, x, z, y, r, g, pivot, bell, shaft, halo, swing: 0, swingT: 9, rung: false };
  }
  function buildEchoes() {
    saved.echoes = Array.isArray(saved.echoes) ? saved.echoes.filter((n) => n >= 0 && n < 3) : [];
    ECHO_DEFS.forEach((d, id) => {
      d.waves.forEach((w, k) => addWave(w, id * 10 + k));
      for (const [x, z, y, w, dd, moving] of d.planks) bridge(x, z, y, w, dd, 0, !!moving);
      for (const [x, z, y] of d.crystals) {
        const m = orb(x, y, z, 0.34, "#b3ffc9");
        buildCrystals.push({ x, z, y, m, cool: 0 });
      }
      const E = addIslet(d.islet, id);
      E.rung = saved.echoes.includes(id);
      if (E.rung) E.shaft.visible = false;
      ECHO.list.push(E);
    });
    addSpray();
    ECHO.lastPhase = phase;
  }
  /* Olatuen itxura phaseBlend-en arabera: orainean zutik eta izoztuta, iraganean itsasoan desegiten */
  function wavesVisual(dt) {
    const k = phaseBlend,
      e = k * k * (3 - 2 * k);
    if (ATMO.iceMat) ATMO.iceMat.userData.u.uBlend.value = e;
    for (const W of ECHO.waves) {
      /* iraganean itsasoaren azpian desagertzen dira (trantsizioan hondoratzen ikusten dira) */
      W.m.scale.y = Math.max(0.004, e);
      W.m.visible = e > 0.03;
    }
    if (ECHO.ghostMat) ECHO.ghostMat.opacity = (1 - e) * 0.42;
    const sp = ECHO.spray;
    if (sp && Math.abs(sp.k - e) > 0.002) {
      sp.k = e;
      const mt = new T.Matrix4(),
        q = new T.Quaternion(),
        sc = new T.Vector3();
      const k2 = Math.max(0.0001, (e - 0.6) / 0.4);
      sp.base.forEach((b, i) => {
        sc.copy(b.s).multiplyScalar(k2);
        const p = b.p.clone();
        p.y = -8.5 + (p.y + 8.5) * e;
        mt.compose(p, q, sc);
        sp.im.setMatrixAt(i, mt);
      });
      sp.im.instanceMatrix.needsUpdate = true;
      sp.im.visible = e > 0.6;
    }
  }
  /* Garaia aldatzean: olatuak lehertu (iragana) edo izoztu (oraina) — hurbilekoek bakarrik */
  function wavesOnShift() {
    let near = false;
    for (const W of ECHO.waves) {
      if (Math.hypot(P.x - W.x, P.z - W.z) > 46) continue;
      near = true;
      if (phase === 0) fxBurst(W.x, W.y - 1.5, W.z, { n: 12, speed: 4, up: 5, life: 1.1, size: 0.42, color: "#cfefff", grav: 9, drag: 1.2, jitter: 2.5 });
      else fxBurst(W.x, W.y + 0.2, W.z, { n: 8, speed: 1.4, up: 1.5, life: 0.9, size: 0.26, color: "#e8fbff", grav: -0.3, drag: 3, jitter: W.r });
    }
    if (near) phase === 0 ? SND.splash() : SND.freeze();
  }
  function echoUpdate(dt) {
    wavesVisual(dt);
    for (const E of ECHO.list) {
      E.shaft.material.uniforms.uTime.value = time;
      if (E.rung) {
        const a = E.shaft.material.uniforms.uA;
        a.value = Math.max(0, a.value - dt * 0.6);
        E.shaft.visible = a.value > 0;
        E.halo.material.color.set("#9feaf5");
      }
      E.swingT += dt;
      E.pivot.rotation.z = E.swing * Math.sin(E.swingT * 5.2) * Math.exp(-E.swingT * 0.55);
      const d = Math.hypot(P.x - E.x, P.z - E.z);
      if (!E.rung && d < 44 && !ECHO.hinted.has(E.id) && started && !cinematic && subTimer <= 0) {
        ECHO.hinted.add(E.id);
        notify("Kanpai-hots bat… itsasoaren gainean.", "Una campanada… sobre el mar.", 4);
      }
      if (!E.rung && P.grounded && d < 2.4 && Math.abs(P.y - E.y) < 1.2) ringEcho(E);
    }
    /* deia: kanpai jo gabeko hurbilenak noizean behin jotzen du, distantziaren arabera */
    ECHO.callT -= dt;
    if (ECHO.callT <= 0) {
      ECHO.callT = 7;
      let best = null,
        bd = 1e9;
      for (const E of ECHO.list)
        if (!E.rung) {
          const d = Math.hypot(P.x - E.x, P.z - E.z);
          if (d < bd) (bd = d), (best = E);
        }
      if (best && bd < 70) {
        SND.echo(0.5 * (1 - bd / 70));
        best.swing = Math.max(best.swing * Math.exp(-best.swingT * 0.55), 0.06);
        best.swingT = 0;
      }
    }
  }
  function ringEcho(E) {
    E.rung = true;
    E.swing = 0.42;
    E.swingT = 0;
    if (!saved.echoes.includes(E.id)) saved.echoes.push(E.id);
    persist();
    SND.echo(1);
    shake(0.22);
    fxRing(E.x, E.y + 0.15, E.z, "#ffe2a6", 11, 1.4);
    fxRing(E.x, E.y + 2.4, E.z, "#ffe2a6", 6, 0.9);
    fxBurst(E.x, E.y + 2.6, E.z, { n: 46, speed: 4.5, up: 2.5, life: 1.4, size: 0.32, color: "#ffe2a6", grav: -0.6, drag: 1.6 });
    notify(
      "OIHARTZUNA · " + saved.echoes.length + " / 3",
      "ECO · " + saved.echoes.length + " / 3",
      3,
    );
    /* eszena pausarik edo menurik ez dagoenean */
    const go = () => (ENDING.on || cinematic || !$("overlay").hidden || paused ? setTimeout(go, 600) : playEchoScene(E.id));
    setTimeout(go, 1500);
  }
  function playEchoScene(id) {
    const E = ECHO.list[id],
      shots = ECHO_SCENES[id].map(([who, eu, es]) => [who, eu, es, E.x, E.z, E.y]);
    if (saved.echoes.length === 3) shots.push([...ECHO_ALL, E.x, E.z, E.y]);
    scenes[6] = shots;
    playScene(6);
  }

  /* ==================================================================
     AMAIERA · kamera-bidaia, munduaren eraldaketa eta laburpena
     ================================================================== */
  const ENDINGS = {
    release: ["Denbora askatua", "El tiempo liberado"],
    keep: ["Egun hau, betiko", "Este día, para siempre"],
    bridge: ["Biharko zubia", "El puente al mañana"],
    unite: ["Bi aldeak", "Los dos lados"],
  };
  const ENDING = { on: false, which: null, t: 0, b0: 1, s: 0, p0: new T.Vector3(), l0: new T.Vector3(), fx: [], exp0: 1.12 };
  const bez = (a, b, c, u, out) =>
    out.set(
      (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * b.x + u * u * c.x,
      (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * b.y + u * u * c.y,
      (1 - u) * (1 - u) * a.z + 2 * u * (1 - u) * b.z + u * u * c.z,
    );
  const smooth01 = (t) => t * t * (3 - 2 * t);
  function endingText(which) {
    const t =
      which === "bridge"
        ? [
            "Ez duzu egun hau hautsi. Irteera bat eraiki diozu.\nHiru mundutako ahotsek zubi berean bat egin dute. Herriak bihar du.",
            "No has roto este día. Le has construido una salida.\nLas voces de tres mundos se encuentran sobre el mismo puente. El pueblo tiene un mañana.",
          ]
        : which === "unite"
          ? [
              "Irati ez da itzuli. Baina ez da desagertu ere.\nHerriko ate urdina berriro ireki da.",
              "Irati no ha vuelto. Pero tampoco ha desaparecido.\nLa puerta azul del pueblo vuelve a abrirse.",
            ]
          : which === "keep"
            ? ["Itsasoak arnasari eutsi dio.\nBihar berriro izango da gaur.", "El mar contiene la respiración.\nMañana volverá a ser hoy."]
            : ["Ordua askatu duzu.\nLehen aldiz, kanpaiak ez du berriro jotzen.", "Has soltado la hora.\nPor primera vez, la campana no vuelve a sonar."];
    if (saved.echoes?.length === 3) {
      t[0] += "\n\nHiru oihartzunak zurekin daude. Itsasoak gogoratzen du.";
      t[1] += "\n\nLos tres ecos están contigo. El mar la recuerda.";
    }
    /* azken kakoa: irratiak berriro hitz egiten du */
    if (which !== "keep") {
      t[0] += "\n\n· · · 140.85 · · ·\n«Amaiur? Entzuten nauzu? Hau ez da grabazio bat. Itsasoaren beste aldean nago.»";
      t[1] += "\n\n· · · 140.85 · · ·\n«¿Amaiur? ¿Me oyes? Esto no es una grabación. Estoy al otro lado del mar.»";
    }
    return t;
  }
  function endingStart(which) {
    Object.assign(ENDING, { on: true, which, t: 0, b0: phaseBlend, s: 0, exp0: renderer.toneMappingExposure });
    ENDING.p0.copy(camera.position);
    ENDING.l0.set(P.x, P.y + 1, P.z);
    paused = true;
    clearInput();
    coachHide();
    $("hud").style.opacity = "0";
    $("touch").style.visibility = "hidden";
    $("top").style.visibility = "hidden";
    $("waypoint").hidden = true;
    if (guideBeacon) guideBeacon.visible = false;
    $("endName").textContent = L(...ENDINGS[which]);
    $("endText").textContent = L(...endingText(which));
    $("endFx").className = "";
    $("endFx").hidden = false;
    SND.ending(which);
    for (const f of ENDING.fx) scene.remove(f.m);
    ENDING.fx = [];
    const core = new T.Vector3(0, BOSS_Y + 3, -179);
    if (which === "bridge") {
      /* argi-zubia erlojutik herrira, ortzadarra bezala */
      for (let i = 0; i < 40; i++) {
        const u = i / 39,
          z = mix(-158, 4, u),
          y = mix(BOSS_Y + 0.2, 0.5, u) + Math.sin(u * PI) * 15;
        const m = box(0, y, z, 2.6, 0.14, 3.7, material("#ffd68f", 1.6));
        m.castShadow = false;
        m.scale.setScalar(0.001);
        ENDING.fx.push({ m, kind: "plank", at: 3.2 + i * 0.16 });
      }
    } else if (which === "unite" || which === "release") {
      const n = which === "unite" ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const c = which === "unite" && i % 2 ? "#a9ecf5" : "#ffdca0",
          m = orb(core.x, core.y, core.z, 0.3, c);
        m.castShadow = false;
        const dest = new T.Vector3(Math.sin(i * 2.4) * 28, 6 + (i % 4) * 5, -40 - i * 13);
        ENDING.fx.push({ m, kind: "mote", at: 3 + i * 0.45, from: core.clone(), mid: new T.Vector3(dest.x * 0.4, 34 + i, mix(core.z, dest.z, 0.4)), to: dest });
      }
    }
    if (which !== "keep") {
      fxBurst(core.x, core.y, core.z, { n: 70, speed: 8, up: 2, life: 1.6, size: 0.4, color: which === "unite" ? "#d9f4ff" : "#ffe6b0", grav: -0.4, drag: 1.4 });
      fxRing(core.x, core.y - 2.7, core.z, "#ffe6b0", 18, 1.6);
    }
  }
  function endingUpdate(dt) {
    const E = ENDING;
    E.t += dt;
    time += dt;
    const u = smooth01(clamp(E.t / 15, 0, 1));
    bez(E.p0, new T.Vector3(36, BOSS_Y + 21, -148), new T.Vector3(17, BOSS_Y + 37, -247), u, camera.position);
    const look = bez(E.l0, new T.Vector3(0, BOSS_Y + 3, -179), new T.Vector3(0, 3, -92), smooth01(clamp(E.t / 13, 0, 1)), new T.Vector3());
    camera.lookAt(look);
    const target = E.which === "keep" ? 1 : E.which === "unite" ? 0.5 : 0;
    phaseBlend = mix(E.b0, target, smooth01(clamp((E.t - 2.2) / 6.5, 0, 1)));
    eraVisuals(dt);
    wavesVisual(dt);
    const warm = E.which === "release" || E.which === "bridge" ? smooth01(clamp((E.t - 3) / 8, 0, 1)) : 0;
    renderer.toneMappingExposure = E.exp0 + warm * 0.18 - (E.which === "keep" ? smooth01(clamp(E.t / 8, 0, 1)) * 0.12 : 0);
    sun.intensity *= 1 + warm * 0.35;
    if (boss.group) {
      const fade = E.which === "keep" ? 0 : smooth01(clamp((E.t - 1) / 4, 0, 1));
      boss.core.scale.setScalar(Math.max(0.001, 1 - fade));
      boss.ring.position.y = 3 - fade * 22;
      boss.ring.rotation.z += dt * (E.which === "keep" ? 0 : 0.4 * (1 - fade));
    }
    for (const f of E.fx) {
      const k = clamp((E.t - f.at) / (f.kind === "plank" ? 0.5 : 6), 0, 1);
      if (f.kind === "plank") f.m.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - k, 3)));
      else {
        bez(f.from, f.mid, f.to, smooth01(k), f.m.position);
        f.m.scale.setScalar(Math.max(0.001, k <= 0 ? 0.001 : 1 - Math.max(0, k - 0.8) * 5));
      }
    }
    if (E.which === "release" && E.t > 2 && E.t < 9 && frame++ % 6 === 0)
      fxBurst(mix(-20, 20, Math.random()), BOSS_Y + 1 + Math.random() * 6, -179 + mix(-20, 20, Math.random()), { n: 3, speed: 0.6, up: 1.4, life: 2.4, size: 0.3, color: "#ffd99a", grav: -0.5, drag: 0.6 });
    if (mixer) mixer.update(dt);
    if (E.t > 3 && E.s < 1) (E.s = 1), $("endFx").classList.add("s1");
    if (E.t > 5.5 && E.s < 2) (E.s = 2), $("endFx").classList.add("s2");
    if (E.t > 11 && E.s < 3) {
      E.s = 3;
      endingCard();
      $("endFx").classList.add("s3");
      $("endExplore").focus({ preventScroll: true });
    }
  }
  function endingCard() {
    const t = Math.round(saved.playTime || 0),
      mm = Math.floor(t / 60),
      ss = String(t % 60).padStart(2, "0"),
      seen = saved.endings || [];
    const stats = [
      [L("DENBORA", "TIEMPO"), (mm >= 60 ? Math.floor(mm / 60) + "h " + String(mm % 60).padStart(2, "0") : mm) + ":" + ss],
      [L("ERORIALDIAK", "CAÍDAS"), saved.deaths || 0],
      [L("OROITZAPENAK", "RECUERDOS"), saved.memories.length + "/5"],
      [L("OIHARTZUNAK", "ECOS"), (saved.echoes?.length || 0) + "/3"],
      [L("EGUNKARIA", "DIARIO"), (saved.pages?.length || 0) + "/4"],
      [L("KATEA ONENA", "MEJOR CADENA"), MAG.best],
      [L("AMAIERAK", "FINALES"), seen.length + "/4"],
    ];
    $("endStats").replaceChildren(
      ...stats.map(([k, v]) => {
        const d = document.createElement("div"),
          dt = document.createElement("dt"),
          dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = v;
        d.append(dt, dd);
        return d;
      }),
    );
    $("endHint").textContent = !seen.includes("unite")
      ? L("Bost oroitzapenekin, beste amaiera bat irekitzen da.", "Con los cinco recuerdos se abre otro final.")
      : !seen.includes("bridge")
        ? L("Hiru eraikuntza-loturak osatuz gero, beste amaiera bat dago.", "Si completas los tres enlaces de construcción, hay otro final.")
        : seen.length < 4
          ? L("Erlojuaren aurrean, beste erabaki bat har dezakezu.", "Ante el reloj, puedes tomar otra decisión.")
          : (saved.echoes?.length || 0) < 3
            ? L("Itsasoaren gainean kanpaiak daude oraindik.", "Aún quedan campanas sobre el mar.")
            : L("Dena entzun duzu. Eskerrik asko, bidaiari.", "Lo has escuchado todo. Gracias, viajera.");
    $("endExplore").textContent = L("UHARTEAK ARRAKATU", "EXPLORAR LAS ISLAS");
    $("endVillage").textContent = L("HERRIRA ITZULI", "VOLVER AL PUEBLO");
  }
  function endingFinish(village) {
    if (!ENDING.on) return;
    ENDING.on = false;
    $("endFx").hidden = true;
    $("endFx").className = "";
    $("hud").style.opacity = "1";
    $("touch").style.visibility = "";
    $("top").style.visibility = "";
    renderer.toneMappingExposure = ENDING.exp0;
    paused = false;
    accumulator = 0;
    if (village) {
      teleport(0, 29, 0);
      currentStage = 0;
      notify("Bide bera. Beste begirada bat.", "El mismo camino. Otra mirada.", 4);
    }
    CAM.pos = null;
    hud();
  }

  /* @include arena.js */
  /* @include combat.js */
  /* @include magic.js */
  /* @include ascent.js */
  /* @include story.js */
  /* @include runes.js */
  /* @include horizon.js */
  /* @include craft.js */
  /* musikaren intentsitatea: 0 izenburua/zinematika · 1 esplorazioa · 2 borroka · 3 bossa */
  function musicLevel() {
    if (!started || cinematic || ENDING.on) return 0;
    if (saved.stage === 5 && !saved.ending && boss.state !== "sleep" && boss.state !== "done") return 3;
    /* Orratzaren igoera: musika bizia (borrokaren geruzak) */
    if (ASC.inZone) return 2;
    return typeof combatLevel === "function" ? combatLevel() : 1;
  }
  let stepAcc = 0;
  function persist() {
    try {
      localStorage.setItem("oihartzun-bialde-v2", JSON.stringify(saved));
    } catch {}
  }
  function notify(a, b, d = 6) {
    $("subtitle").textContent = L(a, b);
    subTimer = d;
    $("subtitle").style.opacity = 1;
  }
  function title(a, b) {
    $("chapterTitle").textContent = L(a, b);
    titleTimer = 3.6;
    $("chapterTitle").style.opacity = 1;
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
  function obj(geo, mat, parent = scene) {
    const m = new T.Mesh(geo, typeof mat === "string" ? material(mat) : mat);
    parent.add(m);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function box(x, y, z, w, h, d, c, parent = scene) {
    const m = obj(new T.BoxGeometry(w, h, d), c, parent);
    m.position.set(x, y, z);
    return m;
  }
  function orb(x, y, z, r, c, parent = scene) {
    const m = obj(new T.IcosahedronGeometry(r, 1), material(c, 1), parent);
    m.position.set(x, y, z);
    return m;
  }
  function ring(x, y, z, r, c, parent = scene) {
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
    scene.add(m);
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
  function parseAsset(name) {
    return new Promise((resolve, reject) => loader.parse(ASSETS[name], "", (g) => resolve(g), reject));
  }
  function model(name, x, y, z, height, angle = 0, parent = scene) {
    const base = models[name],
      m = base.scene.clone(true);
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
    if (name.startsWith("building_") && name !== "building_destroyed") {
      buildings.push({ m, x, y, z, height, angle });
      const r = Math.min(size.x, size.z) * s * 0.32;
      solids.push({ x, z, r, h: height, y });
    }
    return m;
  }
  function addIsland(I, index) {
    const geo = new T.CylinderGeometry(1, 1, 1, 40, 5),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        z = a.getZ(i),
        y = a.getY(i),
        ang = Math.atan2(z, x),
        edge = 1 + 0.04 * Math.sin(ang * 7 + index) + 0.03 * Math.sin(ang * 11);
      const taper = y + 0.5;
      const scale = 0.64 + taper * 0.36;
      a.setXYZ(i, x * I.rx * scale * edge, I.y - 8 + (y + 0.5) * 8, z * I.rz * scale * edge);
    }
    geo.computeVertexNormals();
    const rock = obj(geo, rockMaterial());
    rock.position.set(I.x, 0, I.z);
    const topGeo = new T.CircleGeometry(1, 64);
    topGeo.rotateX(-PI / 2);
    const tm = terrainMaterial();
    let top;
    if (tm) {
      topGeo.scale(I.rx, 1, I.rz);
      worldUV(topGeo, I.x, I.z);
      top = obj(topGeo, tm);
      top.position.set(I.x, I.y + 0.015, I.z);
    } else {
      const topmat = new T.MeshStandardMaterial({
        color: "#b7cbd0",
        roughness: 0.95,
        map: groundTexture,
        bumpMap: groundTexture,
        bumpScale: 0.035,
      });
      terrainMats.push(topmat);
      top = obj(topGeo, topmat);
      top.position.set(I.x, I.y + 0.015, I.z);
      top.scale.set(I.rx, 1, I.rz);
    }
    top.castShadow = false;
    platforms.push({ x: I.x, z: I.z, y: I.y, rx: I.rx, rz: I.rz, phase: -1, island: index, m: top });
    for (let i = 0; i < 18; i++) {
      let a = (i * TAU) / 18;
      const x = I.x + Math.cos(a) * I.rx * 0.95,
        z = I.z + Math.sin(a) * I.rz * 0.95;
      const r = model(i % 2 ? "rock_single_A" : "rock_single_C", x, I.y - 1, z, 2.5 + (i % 3) * 0.35, a);
      r.scale.x *= 1.4;
      r.scale.z *= 1.4;
    }
    // Deliberately open lanes: scenery is placed around the rim rather than in the route.
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8 + 0.3,
        x = I.x + Math.cos(a) * I.rx * 0.77,
        z = I.z + Math.sin(a) * I.rz * 0.76;
      if (Math.abs(x - I.x) < 5) continue;
      let m = model(i % 2 ? "tree_single_A" : "tree_single_B", x, I.y, z, 3 + (i % 3) * 0.75, i);
      plants.push(m);
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399,
        x = I.x + Math.cos(a) * (4 + (i % 4)),
        z = I.z + Math.sin(a) * (4 + (i % 4));
      if (Math.abs(x - I.x) < 3) continue;
      for (let j = 0; j < 3; j++) {
        let m = obj(new T.ConeGeometry(0.09, 0.6, 3), material("#50766b"));
        m.position.set(x + j * 0.12, I.y + 0.3, z);
        m.rotation.z = (j - 1) * 0.25;
        plants.push(m);
      }
    }
  }
  function bridge(x, z, y, w, d, p, moving = false) {
    let group = new T.Group();
    scene.add(group);
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
  function build() {
    scene = new T.Scene();
    scene.background = new T.Color("#527b9b");
    /* mundu irekia: urrunera ikusten da (urruneko uharteak eta itsasontziak) */
    scene.fog = new T.Fog("#527b9b", 130, 560);
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
    Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 130 });
    sun.shadow.normalBias = 0.08;
    sun.shadow.bias = -0.00025;
    scene.add(sun);
    scene.add(sun.target);
    glowTexture = makeGlowTexture();
    textures();
    ATMO.skyPast = skyTex("sky_dusk");
    ATMO.skyNow = skyTex("sky_day");
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
      },
      vertexShader:
        "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: [
        "varying vec3 p;uniform float blend,useTex;uniform sampler2D tPast,tNow;uniform vec3 uFog;",
        "vec2 eq(vec3 d){return vec2(atan(d.z,d.x)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5);}",
        "void main(){vec3 d=normalize(p);float t=pow(max(d.y,0.),.6);",
        "vec3 day=mix(vec3(.82,.71,.55),vec3(.23,.47,.59),t);vec3 night=mix(vec3(.74,.85,.94),vec3(.27,.53,.86),t);",
        "vec3 c=mix(day,night,blend);",
        "if(useTex>.5){vec2 uv=eq(d);c=mix(texture2D(tPast,uv).rgb,texture2D(tNow,uv).rgb,smoothstep(0.,1.,blend));}",
        /* horizontearen azpian (itsasoaren muga urrunetik haratago): lainoaren kolorea, banda argirik gabe */
        "c=mix(c,uFog,smoothstep(.035,-.015,d.y));",
        "gl_FragColor=vec4(c,1.);}",
      ].join("\n"),
    });
    sky = obj(new T.SphereGeometry(450, 32, 20), skyMat);
    sky.castShadow = false;
    sky.receiveShadow = false;
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    if (EG && ATMO.skyPast && ATMO.skyNow) {
      ATMO.fogPast.copy(EG.horizon("dusk", 0.45)).lerp(new T.Color("#7a6a62"), 0.25);
      ATMO.fogNow.copy(EG.horizon("day", 0.45)).lerp(new T.Color("#b9d3ea"), 0.3);
      ATMO.envPast = EG.environment(renderer, scene, "dusk");
      ATMO.envNow = EG.environment(renderer, scene, "day");
      scene.environment = ATMO.envNow;
    }
    const seaMat = new T.ShaderMaterial({
      uniforms: { clock: { value: 0 }, blend: { value: 1 } },
      vertexShader:
        "varying vec3 p;void main(){p=position;vec3 q=position;q.z+=sin(q.x*.1+q.y*.07)*.15;gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);}",
      fragmentShader:
        "varying vec3 p;uniform float clock;uniform float blend;void main(){float a=sin(p.x*.19+p.y*.27+clock*.9);float b=sin(p.x*.43-p.y*.18-clock*.6);float w=a*b;float foam=pow(max(0.,sin(p.x*.9+p.y*.61+clock)+sin(p.x*.14-p.y*.31-clock)-1.2),3.);vec3 day=mix(vec3(.055,.24,.29),vec3(.17,.49,.51),w*.15+.4);vec3 night=mix(vec3(.022,.065,.15),vec3(.07,.25,.36),w*.15+.4);vec3 col=mix(day,night,blend)+foam*vec3(.035,.065,.07);gl_FragColor=vec4(col,1.);}",
    });
    sea = obj(new T.PlaneGeometry(3000, 3000, 1, 1), seaMaterial());
    sea.receiveShadow = false;
    sea.rotation.x = -PI / 2;
    sea.position.y = -8.5;
    sea.castShadow = false;
    for (const [i, I] of ISLANDS.entries()) addIsland(I, i);
    // Places have silhouettes, paths and their own visual identity.
    model("building_home_A_blue", -8, 0, 23, 5.7, 0.35);
    model("building_home_B_blue", 8, 0, 30, 6, -0.7);
    model("building_market_blue", -8, 0, 34, 4.2, PI);
    model("building_home_A_blue", 7, 0, 15, 4.3, 2);
    walkway(0, 38, 0, 7, 0, 3.1);
    walkway(-8, 23, 8, 23, 0, 2.4);
    model("building_watermill_blue", -6, 2, -23, 6.3, 0.2);
    model("building_windmill_blue", -5, 2, -31, 7.3, -0.6);
    walkway(0, -14, 6, -31, 2, 2.4);
    model("building_tower_A_blue", 36, 5, -60, 11, 0);
    model("building_home_B_blue", 25, 5, -57, 4.5, 1.5);
    walkway(25, -51, 32, -65, 5, 2.5);
    model("building_church_blue", -4, 8, -101, 8, 0.2);
    walkway(0, -88, 4, -106, 8, 2.5);
    model("building_castle_blue", -37, 11, -135, 11, PI / 3);
    walkway(-32, -121, -25, -138, 11, 2.4);
    // Traversal grammar: safe common shore, amber past, blue present, then a moving span.
    bridge(0, -0.8, 0.45, 6, 6, 0);
    bridge(0, -7, 1.15, 6, 7, 0);
    bridge(12, -37, 2.9, 5, 5, 1);
    bridge(20, -44, 3.85, 5, 5, 0);
    bridge(20, -72, 5.7, 5.2, 5.2, 1);
    bridge(11, -79, 6.6, 5.4, 5.4, 1, true);
    bridge(4, -83, 7.2, 5, 5, 0);
    bridge(-14, -111, 8.8, 5, 5, 0);
    bridge(-22, -118, 9.8, 5, 5, 1);
    // Extra routes contain memories, never compulsory currency.
    bridge(19, 29, 1, 4, 4, 0);
    bridge(25, 26, 2, 4, 4, 1);
    bridge(44, -51, 6, 4, 4, 0);
    bridge(49, -46, 7.2, 4, 4, 1);
    bridge(-45, -125, 12, 4, 4, 0);
    const mems = [
      [25, 26, 2, 1],
      [7, -29, 2, 0],
      [49, -46, 7.2, 1],
      [6, -104, 8, 1],
      [-45, -125, 12, 0],
    ];
    for (const [id, a] of mems.entries()) {
      const [x, z, y, p] = a;
      const m = orb(x, y + 1.3, z, 0.35, "#ffd9a0");
      const g = glow(x, y + 1.3, z, "#ffd6a0", 3);
      pickups.push({ id, x, z, y, p, m, g, collected: saved.memories.includes(id) });
      m.visible = g.visible = !saved.memories.includes(id);
    }
    for (let i = 0; i < 6; i++) {
      const I = ISLANDS[i],
        cx = checkpointPositions[i][0],
        cz = checkpointPositions[i][1];
      ring(cx, I.y + 0.07, cz, 1.1, "#a5dbd5");
      const f = orb(I.x, I.y + 1.3, I.z, 0.22, "#a9e9e6");
      glow(I.x, I.y + 1.8, I.z, "#b0eaff", 1.7).material.opacity = 0.42;
    }
    // Temporal danger at the fourth crossing, visibly absent in the other era.
    for (const [x, z, y] of [
      [-14, -111, 9],
      [-4, -105, 8.5],
    ]) {
      const post = box(x, y + 1.5, z, 0.35, 3, 0.35, "#657780");
      const beam = box(x, y + 0.75, z, 12, 0.18, 0.18, material("#ff715e", 1.6));
      hazards.push({ x, z, y, beam, phase: 0, t: 0 });
    }
    // Monolithic arena: the final encounter uses the same change-and-dash vocabulary.
    let root = new T.Group();
    root.position.set(0, BOSS_Y, -179);
    scene.add(root);
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      const b = box(Math.cos(a) * 6, 2, Math.sin(a) * 6, 1, 4, 1, "#8b9b9e", root);
      b.rotation.z = Math.sin(a) * 0.12;
    }
    const core = orb(0, 3, 0, 1.4, "#c2e7ea", root);
    let halo = obj(new T.TorusGeometry(2.7, 0.15, 8, 64), material("#d6b477", 0.5), root);
    halo.position.y = 3;
    halo.rotation.y = 0.4;
    boss.group = root;
    boss.ring = halo;
    boss.core = core;
    boss.pips = 3;
    boss.pipOrbs = [0, 1, 2].map(() => {
      const o = orb(0, 3, 0, 0.32, "#fff6d0", root);
      o.castShadow = false;
      o.visible = false;
      return o;
    });
    boss.wave = ring(0, BOSS_Y + 0.2, -179, 1, "#ffb382");
    boss.waves = [boss.wave, ring(0, BOSS_Y + 0.25, -179, 1, "#88e3f4"), ring(0, BOSS_Y + 0.3, -179, 1, "#ffb382")];
    for (const w of boss.waves) w.visible = false;
    glow(0, BOSS_Y + 3, -179, "#aee7ff", 8);
    for (let i = 0; i < 12; i++) {
      let a = (i * TAU) / 12;
      const x = Math.cos(a) * 17,
        z = -174 + Math.sin(a) * 17;
      model("rock_single_A", x, BOSS_Y, z, 3.5, a);
    }
    // Distant sea stacks frame the route without adding navigational clutter.
    /* mundu irekia: gutxiago eta urrunago (ez dute horma bat osatzen; horizontea ikusten da) */
    for (let i = 0; i < 12; i++) {
      let x = (i % 2 ? -1 : 1) * (96 + (i % 4) * 26),
        z = 46 - i * 24;
      if (EG && (EG.has("cliff") || EG.has("rock"))) {
        seaStack(x, z, 15 + (i % 5) * 3, i);
        continue;
      }
      const m = model("mountain_A", x, -9, z, 15 + (i % 5) * 3, i);
      m.scale.x *= 1.25;
      m.scale.z *= 1.25;
    }
    for (const b of buildings) {
      const ruin = model("building_destroyed", b.x, b.y, b.z, b.height * 0.19, b.angle);
      eraBuildings.push({ past: b.m, present: ruin });
    }
    for (let i = 0; i < 10; i++) {
      const g = new T.BufferGeometry().setFromPoints([
        new T.Vector3(-0.5, 0, 0.2),
        new T.Vector3(0, 0, 0),
        new T.Vector3(0.5, 0, 0.2),
      ]);
      const bird = new T.Line(g, new T.LineBasicMaterial({ color: "#243a4d" }));
      scene.add(bird);
      birds.push(bird);
    }
    horizonWorld();
    footRing = ring(0, 0.05, 0, 0.45, "#d7ecdd");
    footRing.material = new T.MeshBasicMaterial({ color: "#172c3c", transparent: true, opacity: 0.25 });
    footRing.castShadow = false;
    // Waterfall sheets and foam provide motion even when the player stops.
    const fallTex = fallTexture();
    for (const I of ISLANDS.slice(1, 5)) {
      const h = I.y + 8.6,
        geo = new T.CylinderGeometry(1.15, 1.6, h, 14, 1, true, -PI * 0.55, PI * 1.1);
      const ft = fallTex.clone();
      ft.needsUpdate = true;
      ft.repeat.set(2, Math.max(1, h / 9));
      const f = obj(
        geo,
        new T.MeshBasicMaterial({ map: ft, color: "#bfeef5", transparent: true, opacity: 0.65, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }),
      );
      f.position.set(I.x + I.rx * 0.74, I.y - h / 2 + 0.1, I.z);
      f.rotation.y = PI / 2;
      f.castShadow = f.receiveShadow = false;
      ATMO.falls.push(f);
      ring(I.x + I.rx * 0.7, -8.2, I.z, 2, "#a7d2d8");
    }
    timeDust();
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
    mixer = new T.AnimationMixer(actor);
    models.mage.actions = {};
    for (const a of models.mage.animations) models.mage.actions[a.name] = mixer.clipAction(a);
    animate("Idle");
    magicInit();
    const lamp = orb(0.5, 1, 0, 0.12, "#ffd3a0", hero);
    glow(0, 1, 0, "#f0ca8f", 1.2).userData.player = true;
    fxInit();
    buildWorkshop();
    buildEchoes();
    buildCages();
    buildCraft();
    buildAscent();
    buildRunePuzzles();
    STORY.pages.push(journalPickup(0, -12.5, 1.3, 29.5));
    teleport(0, 29, 0);
    phase = 0;
    setPhaseVisual(true);
    updateWorld(0);
    camera.position.set(28, 24, 53);
    camera.lookAt(0, 1, 22);
    setPhaseVisual(true);
  }
  function animate(name) {
    if (activeAnimation === name || !models.mage.actions[name]) return;
    const old = models.mage.actions[activeAnimation],
      next = models.mage.actions[name];
    next.reset().fadeIn(0.15).play();
    if (old) old.fadeOut(0.15);
    activeAnimation = name;
  }
  function contains(s, x, z, margin = 0) {
    return s.rx
      ? ((x - s.x) / (s.rx + margin)) ** 2 + ((z - s.z) / (s.rz + margin)) ** 2 <= 1
      : Math.abs(x - s.x) <= s.w / 2 + margin && Math.abs(z - s.z) <= s.d / 2 + margin;
  }
  function support(x, z, feet, ph = phase) {
    let best = null;
    for (const s of platforms)
      if (
        (s.phase === -1 || s.phase === ph) &&
        s.y <= feet + 0.4 &&
        contains(s, x, z, -0.07) &&
        (!best || s.y > best.y)
      )
        best = s;
    return best;
  }
  function teleport(x, z, y) {
    jumpBuffer = 0;
    groundGrace = 0;
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
  function returnCheckpoint() {
    ascent = null;
    magicReset();
    const cpStage = currentStage >= 0 && currentStage <= saved.stage ? currentStage : saved.stage;
    routeStep = stageRoute[cpStage];
    magic.history = [];
    const cp = checkpointPositions[cpStage];
    teleport(cp[0], cp[1], ISLANDS[cpStage].y);
    P.hp = P.maxHp;
    damageTime = 1;
    arenaReset();
    if (CRAFT.held) craftRelease();
    craftExit();
    boss.hits = 0;
    if (saved.stage === 5 && !saved.ending) {
      boss.state = "tell";
      boss.clock = 0;
    }
    saved.deaths++;
    persist();
    shiftFlash = 0.7;
    FB.respawn();
    notify("Berriro. Orain badakizu bidea.", "Otra vez. Ahora conoces el camino.", 2.3);
  }
  let hardFall = false;
  function fall(hard) {
    if (respawnTimer > 0) return;
    hardFall = !!hard;
    respawnTimer = hard ? 0.6 : 0.38;
    P.vx = P.vz = 0;
  }
  function jump() {
    if (!started || paused || ascent) return;
    jumpBuffer = 0.18;
  }
  function dash() {
    if (!started || paused || ascent || !P.dashReady || P.dashT > 0 || respawnTimer) return;
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
    if (!started || paused || ascent || phaseCooldown > 0 || respawnTimer) return;
    phase = 1 - phase;
    phaseCooldown = 0.22;
    shiftFlash = 1;
    if (!P.grounded && saved.stage >= 2 && !P.shiftAir) {
      coachDone("airshift");
      P.shiftAir = true;
      P.dashReady = true;
      P.dashes = Math.max(P.dashes, 1);
      P.vy = Math.max(P.vy, 2.3);
      notify("Beste une bat. Beste bultzada bat.", "Otro instante. Otro impulso.", 1.7);
    }
    setPhaseVisual();
    FB.shift();
    wavesOnShift();
    eraWave();
    coachDone("shift");
    if (saved.stage === 3) coachDone("beam");
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
    for (const p of pickups) {
      p.m.visible = p.g.visible = !p.collected && p.p === phase;
    }
    for (const h of hazards) h.beam.visible = h.phase === phase;
    $("phaseName").textContent = (phase ? L("ORAINA", "PRESENTE") : L("IRAGANA", "PASADO")) + kb(" · Q");
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
    let d = direction(),
      len = Math.hypot(d.x, d.z),
      surf = !!(input.keys.ShiftLeft || input.keys.ShiftRight) || (mobile && Math.hypot(input.x, input.z) > 0.88);
    /* eraikitzean: pieza eskuan → geldirik; mugitzen hasiz gero, eraikuntza-modutik irten */
    if (CRAFT.on && !CRAFT.held && len > 0.3) craftExit();
    if (CRAFT.held) {
      d = { x: 0, z: 0 };
      len = 0;
    }
    const groundSpeed = surf ? 12.8 : 7.7;
    /* sorginkeria kargatzean edo biraka: mugimendu motelagoa */
    const atkSlow = MAG.charging ? 0.58 : MAG.spinT < 0.3 ? 0.45 : 1;
    const speed = (P.grounded ? groundSpeed : Math.max(groundSpeed, P.airSpeed)) * atkSlow;
    P.wallGrace = Math.max(0, P.wallGrace - dt);
    P.wallLock = Math.max(0, P.wallLock - dt);
    if (P.platform?.moving && P.grounded) {
      P.x += P.platform.dx;
      P.z += P.platform.dz;
    }
    if (jumpBuffer > 0 && (P.grounded || groundGrace > 0 || P.jumps < 2 || P.wallGrace > 0)) {
      const wallKick = !P.grounded && groundGrace <= 0 && P.jumps >= 2 && P.wallGrace > 0;
      if (wallKick) {
        P.vx = P.wallX * 12;
        P.vz = P.wallZ * 12;
        P.wallLock = 0.16;
        P.jumps = 1;
        spawnTrail();
      } else P.jumps = P.grounded || groundGrace > 0 ? 1 : P.jumps + 1;
      P.airSpeed = Math.min(14, Math.max(speed, Math.hypot(P.vx, P.vz)));
      P.vy = P.jumps === 2 ? 11.4 : 10.6;
      P.dashT = 0;
      if (P.jumps === 2) spawnTrail();
      P.grounded = false;
      P.platform = null;
      jumpBuffer = groundGrace = 0;
      FB.jump(P.jumps === 2 || wallKick ? 2 : 1);
      if (P.jumps === 2) coachDone("jump");
    }
    if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashX * 24;
      P.vz = P.dashZ * 24;
      P.vy = 0;
      if (frame % 3 === 0) spawnTrail();
    } else {
      const t = 1 - Math.exp(-dt * (P.grounded ? 22 : len > 0.1 ? 6.5 : 3));
      if (P.wallLock <= 0) {
        P.vx = mix(P.vx, d.x * speed, t);
        P.vz = mix(P.vz, d.z * speed, t);
      }
      P.vy -= 25 * dt;
      /* Orratzeko haize-korrontea: gora eraman eta jauzi bikoitza/bultzada berritu */
      const lift = ascLift(P.x, P.z, P.y);
      if (lift > 0) {
        P.vy = Math.min(P.vy + lift * dt, 9);
        P.jumps = Math.min(P.jumps, 1);
        P.dashReady = true;
        P.dashes = Math.max(P.dashes, 1);
      }
    }
    const px = P.x,
      pz = P.z,
      py = P.y;
    let nx = P.x + P.vx * dt,
      nz = P.z + P.vz * dt,
      ny = P.y + P.vy * dt;
    /* kaiolak: uhartetik ezin da erori */
    [nx, nz] = cageCollide(px, pz, nx, nz, py);
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
      if (s.phase !== -1 && s.phase !== phase) continue;
      if (contains(s, nx, nz, 0.18) && !contains(s, px, pz, 0.18) && py < s.y - 0.32 && py + 1.8 > s.y - 0.5) {
        P.wallGrace = s.slick ? 0 : 0.15;
        const wn = Math.hypot(px - s.x, pz - s.z) || 1;
        P.wallX = (px - s.x) / wn;
        P.wallZ = (pz - s.z) / wn;
        nx = px;
        nz = pz;
        P.vx = P.vz = 0;
      }
    }
    let landing = null;
    if (P.vy <= 0)
      for (const s of platforms) {
        if (
          (s.phase === -1 || s.phase === phase) &&
          contains(s, nx, nz, 0.12) &&
          py >= s.y - 0.22 &&
          ny <= s.y + 0.04 &&
          (!landing || s.y > landing.y)
        )
          landing = s;
      }
    const wasGrounded = P.grounded,
      impact = -P.vy;
    P.grounded = !!landing;
    if (landing && !wasGrounded) FB.land(impact);
    if (landing) {
      P.airSpeed = groundSpeed;
      P.jumps = 0;
      ny = landing.y;
      P.vy = 0;
      if (P.dashT <= 0) {
        P.dashReady = true;
        P.dashes = saved.boons.includes("dash") ? 2 : 1;
      }
      P.shiftAir = false;
      P.platform = landing;
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
    /* sorginkeria jaurtitzean, helburuari begira (hankak korrika jarraitzen dute) */
    if (len > 0.12 && P.dashT <= 0 && MAG.aimT <= 0) {
      const a = Math.atan2(d.x, d.z);
      P.angle += Math.atan2(Math.sin(a - P.angle), Math.cos(a - P.angle)) * Math.min(1, dt * 18);
    }
    hero.position.set(P.x, P.y, P.z);
    hero.rotation.y = mix(hero.rotation.y, hero.rotation.y + Math.atan2(Math.sin(P.angle - hero.rotation.y), Math.cos(P.angle - hero.rotation.y)), Math.min(1, dt * 30));
    hero.visible = damageTime <= 0 || Math.floor(damageTime * 15) % 2 === 0;
    animate(
      CRAFT.held
        ? "Spellcast_Raise"
        : MAG.spinT < 0.5
          ? "2H_Melee_Attack_Spin"
          : P.dashT > 0
            ? "Dodge_Forward"
            : !P.grounded
              ? "Jump_Idle"
              : len > 0.15
                ? "Running_A"
                : "Idle",
    );
    trackSafe(dt);
    if (P.y < -9.3) fall();
    if (landing && landing.island !== undefined && landing.island > saved.stage) {
      saved.stage = landing.island;
      P.hp = P.maxHp;
      persist();
      enterStage(saved.stage);
    }
    if (landing?.island !== undefined) currentStage = landing.island;
    /* itzal-marka: airean, azpiko plataforma erakutsi (3D plataformetan sakonera irakurtzeko) */
    const under = landing || support(P.x, P.z, P.y);
    footRing.visible = !!under;
    if (under) {
      const h = Math.max(0, P.y - under.y);
      footRing.position.set(P.x, under.y + 0.035, P.z);
      footRing.scale.setScalar(1 + Math.min(1.2, h * 0.08));
      footRing.material.opacity = landing ? 0.25 : clamp(0.55 - h * 0.025, 0.2, 0.55);
    }
  }
  function enterStage(i) {
    const I = ISLANDS[i];
    if (i >= 1) coachDone("jump");
    coachHide();
    title(I.name[0], I.name[1]);
    FB.stage();
    const text = [
      null,
      [
        "IRATI: «Ikusten nauzunean, ez jarraitu nire atzetik.»\nBi garaien arteko zubia ehundu dezakezu.",
        "IRATI: «Cuando me veas, no me sigas.»\nPuedes tejer el puente entre las dos épocas.",
      ],
      [
        "Liburuan zure izena dago. Duela ehun urte idatzita.\nAirean garaia aldatzeak BULTZADA berreskuratzen du.",
        "Tu nombre está en el libro. Escrito hace cien años.\nCambiar de época en el aire recupera DASH.",
      ],
      [
        "IRATI: «Ez zinen ni salbatzera etorri. Agur esatera baizik.»",
        "IRATI: «No viniste a salvarme. Viniste a despedirte.»",
      ],
      [
        "Kanpaiak ez du ordua ematen. Geratzen zaigun denbora jaten du.",
        "La campana no da la hora. Devora el tiempo que nos queda.",
      ],
      [
        "GAUEKO: «Zure oroitzapenek eusten diote itsasoari. Ez ukitu erlojua.»",
        "GAUEKO: «Tus recuerdos sostienen el mar. No toques el reloj.»",
      ],
    ][i];
    if (text) notify(...text, 8);
    if (i === 5 && !saved.ending) {
      boss.state = "tell";
      boss.clock = 0;
    }
    hud();
    if (!saved.ending) playScene(i);
  }
  function takeHit() {
    if (damageTime > 0 || respawnTimer || P.dashT > 0) return;
    P.hp--;
    damageTime = 1.2;
    shiftFlash = 0.4;
    FB.hurt();
    haptic(45);
    hud();
    if (P.hp <= 0) fall(true);
  }
  function updateBoss(dt) {
    if (stasisActive()) return;
    if (saved.stage < 5 || saved.ending) {
      for (const w of boss.waves) w.visible = false;
      boss.core.rotation.y += dt * 0.5;
      return;
    }
    boss.clock += dt;
    boss.hitLock = Math.max(0, boss.hitLock - dt);
    const bpos = { x: 0, z: -179 };
    boss.ring.rotation.z += dt * (boss.state === "open" ? 2 : 0.45);
    boss.core.position.y = 3 + Math.sin(time * 2) * 0.15;
    if (boss.state === "tell") {
      for (const w of boss.waves) w.visible = false;
      boss.attackPhase = Math.floor((boss.hits + Math.floor(time * 0.05)) % 2);
      const c = boss.attackPhase ? "#88e3f4" : "#ffb77b";
      boss.core.material = material(c, 1.8);
      boss.ring.scale.setScalar(1 + Math.sin(boss.clock * 10) * 0.06);
      if (boss.clock > 2) {
        boss.state = "wave";
        boss.clock = 0;
        boss.waves.forEach((w, k) => (w.material = material((boss.attackPhase + k) % 2 ? "#88e3f4" : "#ffb77b", 1.3)));
        if (boss.hits >= 1) bossBurst();
        if (boss.hits && boss.warned !== boss.hits) {
          boss.warned = boss.hits;
          notify(
            boss.hits === 1 ? "Bi uhin eta proiektil-koroa: bi aldiz ALDATU, eta jo proiektilak!" : "Hiru uhin! Erritmoa: aldatu, aldatu, aldatu.",
            boss.hits === 1 ? "Dos ondas y una corona de proyectiles: ¡CAMBIA dos veces y destruye los proyectiles!" : "¡Tres ondas! Ritmo: cambia, cambia, cambia.",
            2.6,
          );
        }
      }
    } else if (boss.state === "wave") {
      /* bossaren faseak: kolpe bakoitzaren ondoren uhin bat gehiago, garai txandakatuetan */
      const n = 1 + Math.min(2, boss.hits),
        speed = 15 + boss.hits * 2.5;
      let live = false;
      boss.waves.forEach((w, k) => {
        const t = boss.clock - k * 0.85;
        w.visible = k < n && t > 0 && t < 1.65;
        if (k < n && t < 1.65) live = true;
        if (!w.visible) return;
        const r = 1 + t * speed;
        w.scale.setScalar(r);
        if (phase === (boss.attackPhase + k) % 2 && Math.abs(dist(P, bpos) - r) < 1 && P.y < BOSS_Y + 1.1) takeHit();
      });
      if (!live) {
        boss.state = "open";
        boss.clock = 0;
        boss.pips = 3;
        for (const w of boss.waves) w.visible = false;
        boss.core.material = material("#fff1b3", 1.8);
        notify("ORAIN! SORGINKERIA edo BULTZADA nukleora.", "¡AHORA! HECHIZO o DASH al núcleo.", 2.5);
      }
    } else if (boss.state === "open") {
      if (dist(P, bpos) < 3.4 && P.dashT > 0 && boss.hitLock <= 0) bossStrike();
      if (boss.clock > 4.2 - boss.hits * 0.4 && boss.state !== "done") {
        boss.state = "tell";
        boss.clock = 0;
      }
    }
    /* nukleoaren ezkutua: hiru argi biraka (izpi bakoitzak bat itzaltzen du) */
    for (let i = 0; i < boss.pipOrbs.length; i++) {
      const o = boss.pipOrbs[i],
        on = boss.state === "open" && i < boss.pips,
        a = time * 2.4 + (i * TAU) / 3;
      o.visible = on;
      o.position.set(Math.cos(a) * 2.2, 3 + Math.sin(time * 3 + i) * 0.3, Math.sin(a) * 2.2);
    }
  }
  /* izpiek ezkutua higatzen dute; INDARRAk (izpi handia) osorik apurtzen du */
  function bossChip(n) {
    if (boss.state !== "open" || boss.hitLock > 0) return;
    boss.pips -= n;
    SND.clang();
    fxBurst(0, BOSS_Y + 3, -179, { n: 14, speed: 5, life: 0.4, size: 0.3, color: "#fff1b3", grav: 2 });
    if (boss.pips <= 0) bossStrike();
  }
  /* uhinarekin batera: proiektil-koroa (izpiekin suntsitu daiteke) */
  function bossBurst() {
    const n = 8 + boss.hits * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + time,
        era = (i + boss.hits) % 2,
        m = orb(Math.cos(a) * 2.5, BOSS_Y + 1.3, -179 + Math.sin(a) * 2.5, 0.26, ERA_COL[era]);
      m.castShadow = false;
      SHOTS.push({ m, x: Math.cos(a) * 2.5, z: -179 + Math.sin(a) * 2.5, y: BOSS_Y + 1.3, vx: Math.cos(a) * 6.5, vz: Math.sin(a) * 6.5, sp: 6.5, t: 0.4, era, radial: true });
    }
    SND.shot();
  }
  /* nukleoa jo (bultzada edo makila-kolpea) */
  function bossStrike() {
    boss.hits++;
    boss.hitLock = 1;
    boss.clock = 4.1;
    FB.bossHit(0, BOSS_Y + 3, -179);
    if (Math.hypot(P.x, P.z + 179) < 5) {
      P.vx = -Math.sin(P.angle) * 12;
      P.vz = -Math.cos(P.angle) * 12;
      P.dashT = 0;
      P.vy = 7;
    }
    shiftFlash = 1;
    haptic(70);
    if (boss.hits === BOSS_HITS) {
      boss.state = "done";
      saved.bossDone = true;
      clearEnemies();
      if (!saved.cleared.includes(5)) saved.cleared.push(5);
      persist();
      SND.stinger(true);
      slowmo = 0.9;
      storyQueue("twist", false, 1.6);
      notify("IRATI: «Orain bai. Orain zure erabakia da.»", "IRATI: «Ahora sí. Ahora la decisión es tuya.»", 8);
    } else
      spawnWave(
        [
          [["grunt", 0, 2], ["grunt", 1, 2]],
          [["grunt", 0, 2], ["grunt", 1, 1], ["eye", -1, 2]],
          [["brute", -1, 1], ["grunt", 0, 2], ["eye", 1, 1], ["eye", 0, 1]],
        ][boss.hits - 1],
        5,
      );
  }
  function updateWorld(dt) {
    for (const s of phaseObjects)
      if (s.moving) {
        if (stasisActive()) {
          s.dx = s.dz = 0;
          continue;
        }
        const oldx = s.x,
          oldz = s.z;
        s.motionTime = (s.motionTime || 0) + dt;
        s.x = s.baseX + Math.sin(s.motionTime * 0.65) * 2.1;
        s.dx = s.x - oldx;
        s.dz = s.z - oldz;
        s.m.position.x = s.ghost.position.x = s.x;
      }
    for (const h of hazards) {
      if (!stasisActive()) {
        h.t += dt;
        h.beam.rotation.y = Math.sin(h.t * 0.6) * 0.7;
      }
      const dx = P.x - h.x,
        dz = P.z - h.z,
        localX = dx * Math.cos(h.beam.rotation.y) - dz * Math.sin(h.beam.rotation.y),
        localZ = dx * Math.sin(h.beam.rotation.y) + dz * Math.cos(h.beam.rotation.y);
      if (
        !stasisActive() &&
        phase === h.phase &&
        Math.abs(localX) < 6 &&
        Math.abs(localZ) < 0.42 &&
        Math.abs(P.y - h.y) < 1.3
      )
        takeHit();
    }
    for (const p of pickups) {
      p.m.rotation.y = time * 0.7;
      p.m.position.y = p.y + 1.25 + Math.sin(time * 2 + p.id) * 0.17;
      if (!p.collected && phase === p.p && Math.hypot(P.x - p.x, P.z - p.z) < 1.3 && Math.abs(P.y - p.y) < 1.5) {
        p.collected = true;
        p.m.visible = p.g.visible = false;
        saved.memories.push(p.id);
        persist();
        FB.pickup(p);
        notify(
          [
            "«Ez ahaztu gure etxeko atea urdina zela.»",
            "«Itsasoa goraka zetorren. Kanpaiak geldiarazi zuen.»",
            "«Oroitzapen bat ez da pertsona bat.»",
            "«Agur esateak ez du esan nahi ahaztea.»",
            "«Erlojua ez da hautsi behar. Bi aldeak elkartu daitezke.»",
          ][p.id],
          [
            "«No olvides que la puerta de casa era azul.»",
            "«El mar estaba subiendo. La campana lo detuvo.»",
            "«Un recuerdo no es una persona.»",
            "«Despedirse no significa olvidar.»",
            "«No hace falta romper el reloj. Sus dos lados pueden reunirse.»",
          ][p.id],
          7,
        );
      }
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
      b.position.set(Math.cos(a) * (25 + i * 3), 22 + (i % 3) * 2, -55 + Math.sin(a) * 75);
      b.rotation.y = -a;
      b.rotation.z = Math.sin(time * 3 + i) * 0.12;
    }
    for (const g of glows) {
      if (g.userData.player) g.position.set(P.x + 0.5, P.y + 1, P.z);
      else if (g.userData.fall) g.material.opacity = 0.35 + Math.sin(time * 3 + g.position.x) * 0.08;
    }
    if (mixer) mixer.update(dt);
    if (saved.bossDone && boss.state !== "done") boss.state = "done";
    updateBoss(dt);
    near = null;
    /* bihurguneko eszena (maskara) amaierako erabakiaren aurretik */
    if (saved.bossDone && dist(P, { x: 0, z: -179 }) < 6 && !STORY.pending) near = "ending";
    $("prompt").hidden = !near;
    if (near) $("prompt").textContent = L("E / EKIN · IRATIREN AZKEN MEZUA", "E / ACTUAR · EL ÚLTIMO MENSAJE");
  }
  const GRASS = new T.Color("#829977").convertSRGBToLinear(),
    SNOW = new T.Color("#b9ccd5").convertSRGBToLinear();
  function eraVisuals() {
    sky.material.uniforms.blend.value = phaseBlend;
    sea.material.uniforms.blend.value = phaseBlend;
    sea.material.uniforms.clock.value = time;
    for (const m of terrainMats) m.color.copy(GRASS).lerp(SNOW, phaseBlend);
    sun.color.set(phaseBlend > 0.5 ? "#f3f7ff" : "#ffddb3");
    sun.intensity = mix(1.8, 1.95, phaseBlend);
    ambient.intensity = mix(0.86, 0.95, phaseBlend) * (scene.environment ? 0.55 : 1);
    scene.fog.color.copy(ATMO.fogPast).lerp(ATMO.fogNow, phaseBlend);
    scene.background.copy(scene.fog.color);
    if (sky.material.uniforms.uFog) sky.material.uniforms.uFog.value.copy(scene.fog.color);
  }
  function interact() {
    if (!started || paused) return;
    const station = stations.find((s) => Math.hypot(P.x - s.x, P.z - s.z) < 5);
    if (station) {
      openWorkshop();
      return;
    }
    if (near === "ending") finishDialog();
    else if (zoneHere() && !isCleared(currentStage)) craftToggle();
    else powerMenu();
  }
  function finishDialog() {
    dialog(
      "IRATI",
      "Ez naiz beste aldean bizi.",
      "No vivo al otro lado.",
      "«Zuk gogoratzen nauzun lekuan bizi naiz. Aska ezazu ordua, Amaiur. Herriak biharamuna behar du.»\n\nItsasoa mugitzen hasten da. Erlojua zure eskuetan dago.",
      "«Vivo en el lugar donde me recuerdas. Suelta la hora, Amaiur. El pueblo necesita un mañana.»\n\nEl mar empieza a moverse. El reloj está en tus manos.",
      [
        [L("DENBORA ASKATU", "LIBERAR EL TIEMPO"), () => end("release")],
        [L("EGUN HAU GORDE", "GUARDAR ESTE DÍA"), () => end("keep")],
        ...(saved.echoes?.length === 3
          ? [[L("BIHARKO ZUBIA ERAIKI", "CONSTRUIR EL PUENTE A MAÑANA"), () => end("bridge")]]
          : []),
        ...(saved.memories.length === 5 ? [[L("BI ALDEAK ELKARTU", "UNIR LOS DOS LADOS"), () => end("unite")]] : []),
      ],
    );
  }
  function end(which) {
    saved.ending = which;
    saved.endings = [...new Set([...(saved.endings || []), which])];
    persist();
    phase = which === "keep" ? 1 : 0;
    setPhaseVisual();
    boss.state = "done";
    for (const w of boss.waves) w.visible = false;
    endingActive = true;
    endingStart(which);
  }
  function cameraUpdate(dt) {
    const ov = window.__camOverride; /* probetarako soilik (?test) */
    if (ov) {
      camera.position.set(...ov.pos);
      camera.lookAt(...ov.look);
      return;
    }
    if (workshop.active) {
      const a = workshop.selected,
        look = new T.Vector3(a.x, a.y, a.z);
      camera.position.lerp(look.clone().add(new T.Vector3(17, 23, 26)), 1 - Math.exp(-dt * 5));
      camera.lookAt(look);
      return;
    }
    CAM.look.lerp(
      new T.Vector3(clamp(P.vx * 0.26, -3.2, 3.2), 0, clamp(P.vz * 0.26, -3.2, 3.2)),
      1 - Math.exp(-dt * 2.4),
    );
    const F = camFrame();
    /* borrokan kamera hurbilago (itzalak eta erasoak irakurgarri) */
    CAM.zoom = mix(CAM.zoom ?? 1, ARENA.state === "fight" ? F.fight : 1, 1 - Math.exp(-dt * 2.5));
    /* Orratzean: kamera baxuagoa eta gorantz begira (hurrengo harriak ikusteko) */
    CAM.asc = mix(CAM.asc ?? 0, ASC.inZone ? 1 : 0, 1 - Math.exp(-dt * 1.8));
    const look = new T.Vector3(P.x, P.y + 1 + CAM.asc * 2.6, P.z).add(CAM.look),
      offset = new T.Vector3(mix(15.5, 13.5, CAM.asc), mix(F.h, 10, CAM.asc), mix(23, 22, CAM.asc)).multiplyScalar(CAM.zoom * F.k);
    /* jokalaria pantailaren erdialdetik gora (behean botoiak daude): begirada kamerarantz lerratu */
    /* hatzaz biratutako kamera (yaw, leundua): desplazamendua jokalariaren inguruan */
    CAM.yawS += (CAM.yaw - CAM.yawS) * (1 - Math.exp(-dt * 12));
    if (Math.abs(CAM.yaw - CAM.yawS) < 1e-4) CAM.yawS = CAM.yaw;
    if (CAM.yawS) offset.applyAxisAngle(UP_AXIS, CAM.yawS);
    if (F.lift) look.add(new T.Vector3(offset.x, 0, offset.z).normalize().multiplyScalar(F.lift * CAM.user));
    const target = look.clone().add(offset);
    if (!CAM.pos || CAM.pos.distanceTo(camera.position) > 4) CAM.pos = camera.position.clone();
    CAM.pos.lerp(target, 1 - Math.exp(-dt * 7));
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
    phase = 1;
    setPhaseVisual(true);
    updateWorld(0);
    $("start").hidden = true;
    $("hud").hidden = false;
    $("pause").hidden = false;
    $("touch").classList.add("play");
    audioStart();
    const cp = checkpointPositions[saved.stage];
    teleport(cp[0], cp[1], ISLANDS[saved.stage].y);
    currentStage = saved.stage;
    routeStep = stageRoute[saved.stage];
    if (saved.stage === 5) boss.state = saved.bossDone ? "done" : "tell";
    if (saved.stage === 0) {
      title("ITSASOAREN BESTALDEAN", "AL OTRO LADO DEL MAR");
      notify(
        "IRATI: «Etxera itzultzen zarenean, ez ireki ate urdina.»",
        "IRATI: «Cuando vuelvas a casa, no abras la puerta azul.»",
        7,
      );
    } else notify("Bideak zure urratsak gogoratzen ditu.", "El camino recuerda tus pasos.", 3);
    hud();
    if (!saved.ending) playScene(saved.stage);
  }
  function help() {
    dialog(
      "OIHARTZUN",
      "Bi garaien artean.",
      "Entre dos épocas.",
      "Uharte bakoitza Gauekoren kaiola da: ezin zara erori, eta irteera erronka gainditzean irekitzen da. Uharteak txandaka: BORROKA eta ERAIKUNTZA.\n\nMUGITU: WASD edo makila (ertzeraino: korrika). JAUZI: Espazioa, bi aldiz airean. BULTZADA (F): aurrera ziztu bizian; bitartean ukiezina zara.\n\nSORGINKERIA: J, saguaren klika edo SORGINKERIA botoia. Izpiak bakarrik bilatzen du helburua (18 m); segidako hirugarrenak hiru izpi jaurtitzen ditu. Mantendu: INDARRA kargatu; askatu: izpi handia eta eztanda. BULTZADA bitartean sakatu: biraka-kolpea. Izpiek itzalen proiektilak suntsitzen dituzte eta errunak pizten.\n\nGAUEKOREN ORRATZA: harriz harri igo. Kristal berdeek BULTZADA berritzen dute, haizeak gora darama, harri arreak erori egiten dira eta kanpaiek zure azken urratsa gogoratzen dute (erortzean ez duzu bizitzarik galtzen). Airean, jauzia mantenduz gero, gorago iristen zara.\n\nGARAIA (Q): URREA iragana da, URDINA oraina. Zubi bakoitza bere garaian bakarrik da sendoa. Itzalek begien koloreko garaian bakarrik hartzen dute kalte: beste garaian ezkutua dute. Garaia aldatzean, inguruko itzalak bultzatzen dituzu.\n\nESKU MAGIKOA (G edo ESKUA botoia): ukitu kaxa bat eta arrastatu; ukitu laburrak biratu egiten du. Kaxa bat beste baten gainean utziz gero, pilatu egiten dira; ondoan utziz gero, itsatsi. Errunara iristeko eskailerak eraiki.\n\nZubitik erortzean, azken lur seguruan berragertzen zara (bizitza bat). EHUNDU (C), ATZERA (V), IGO (X) eta GELDITU (Z): botereen menuan (H).",
      "Cada isla es una jaula de Gaueko: no puedes caerte, y la salida se abre al superar su reto. Las islas se alternan: COMBATE y CONSTRUCCIÓN.\n\nMOVER: WASD o palanca (al máximo: correr). SALTAR: Espacio, dos veces en el aire. DASH (F): impulso; durante el DASH eres invulnerable.\n\nHECHIZO: J, clic o el botón HECHIZO. El rayo busca solo a su objetivo (18 m); el tercero seguido lanza tres rayos. Mantén: carga INDARRA; suelta: rayo grande con explosión. Pulsa durante el DASH: golpe giratorio. Los rayos destruyen los proyectiles de las sombras y encienden runas.\n\nLA AGUJA DE GAUEKO: sube de piedra en piedra. Los cristales verdes renuevan el DASH, el viento te eleva, las piedras marrones se derrumban y las campanas recuerdan tu último paso (al caer no pierdes vida). En el aire, mantener el salto te lleva más alto.\n\nÉPOCA (Q): el ORO es el pasado, el AZUL el presente. Cada puente solo es sólido en su época. Las sombras solo reciben daño en la época del color de sus ojos: en la otra tienen escudo. Al cambiar de época empujas a las sombras cercanas.\n\nMANO MÁGICA (G o MANO): toca una caja y arrástrala; un toque corto la gira. Si la sueltas sobre otra, se apilan; si la dejas al lado, se unen. Construye escaleras para llegar a la runa.\n\nSi caes de un puente, reapareces en el último suelo seguro (pierdes una vida). TEJER (C), RETORNO (V), ASCENDER (X) y ESTASIS (Z): en el menú de poderes (H).",
    );
  }
  function pause() {
    if (cinematic || ENDING.on) return;
    if (!started || !$("overlay").hidden) return;
    dialog(
      "OIHARTZUN",
      "Arnasa hartu.",
      "Respira.",
      "Uharte berrira iristean gordetzen da aurrerapena.",
      "El avance se guarda al alcanzar una isla nueva.",
      [
        [L("JARRAITU", "CONTINUAR"), () => {}],
        [L("KONTROLAK", "CONTROLES"), help],
        [
          L("LAGUNTZA: ", "AYUDA: ") + (saved.assist ? "BAI" : "EZ"),
          () => {
            saved.assist = !saved.assist;
            persist();
            notify("Laguntza: denbora motelago eta BULTZADA luzeago.", "Ayuda: tiempo más lento y DASH más largo.", 4);
          },
        ],
        [L("AZKEN UHARTERA", "ÚLTIMA ISLA"), returnCheckpoint],
        [
          L("MENURA", "AL MENÚ"),
          () => {
            started = false;
            paused = true;
            $("start").hidden = false;
            $("hud").hidden = true;
            $("pause").hidden = true;
            $("touch").classList.remove("play");
          },
        ],
      ],
    );
  }
  function translate() {
    document.documentElement.lang = language;
    $("premise").textContent = L(
      "Uharte bakoitzak bi bizitza ditu.\nBatek bidea ezkutatzen du. Besteak, egia.\nZu Amaiur zara, sorgina. Irratiak zure izena daki.",
      "Cada isla tiene dos vidas.\nUna esconde el camino. La otra, la verdad.\nEres Amaiur, la bruja. La radio sabe tu nombre.",
    );
    $("play").textContent = saved.stage ? L("JARRAITU →", "CONTINUAR →") : L("BIDAIA HASI →", "COMENZAR →");
    $("helpBtn").textContent = L("NOLA JOKATU", "CÓMO JUGAR");
    $("phaseBtn").textContent = L("ALDATU", "CAMBIAR");
    $("jumpBtn").textContent = L("JAUZI", "SALTAR");
    $("attackBtn").textContent = L("SORGIN-\nKERIA", "HECHIZO");
    $("rotateBtn").textContent = "↻";
    $("rotateBtn").onclick = () => {
      const p = CRAFT.held || CRAFT.last;
      if (p) craftRotate(p);
    };
    $("useBtn").textContent = L("EKIN", "ACTUAR");
    $("useBtn").hidden = true;
    CTX.cur = null;
    $("weaveBtn").textContent = "⋯";
    $("weaveBtn").setAttribute("aria-label", L("BOTEREAK", "PODERES"));
    $("recallBtn").textContent = L("IGO", "ASCENDER");
    $("cineSkip").textContent = L("SALTATU →", "OMITIR →");
    $("cineNext").textContent = L("JARRAITU →", "SIGUIENTE →");
    $("heartLab").textContent = L("ARNASA", "ALIENTO");
    $("dashLab").textContent = L("BULTZADA", "IMPULSO");
    $("secretLab").textContent = L("OROITZAPENAK", "RECUERDOS");
    $("echoLab").textContent = L("OIHARTZUNAK", "ECOS");
    $("keys").innerHTML = [["WASD", "mugitu"], ["Shift", "korrika"], ["␣ ×2", "jauzi"], ["J / klik", "sorginkeria (mantendu: INDARRA)"], ["F", "bultzada"], ["Q", "garaia"], ["E", "ekin"], ["G", "esku magikoa"], ["R", "biratu"], ["H", "botereak"]]
      .map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`)
      .join("");
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
      KeyC: weave,
      KeyV: recall,
      KeyG: craftToggle,
      KeyJ: attack,
      KeyK: attack,
      KeyX: ascend,
      KeyZ: stasis,
      KeyH: powerMenu,
      KeyE: interact,
      KeyR: () => {
        if (started && !paused) returnCheckpoint();
      },
      Escape: pause,
    };
    addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (workshop.active) {
        if (!e.repeat) buildKey(e);
        e.preventDefault();
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
    $("recallBtn").onclick = ascend;
    $("cineNext").onclick = nextShot;
    $("endExplore").onclick = () => endingFinish(false);
    $("endVillage").onclick = () => endingFinish(true);
    $("cineSkip").onclick = endScene;
    $("phaseBtn").onclick = switchPhase;
    $("dashBtn").onclick = dash;
    $("jumpBtn").onclick = jump;
    $("useBtn").onclick = null;
    bindActionTouches();
    bindWorkshop();
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
      dialog(
        "OIHARTZUN",
        "Bidaia berri bat?",
        "¿Un nuevo viaje?",
        "Bertsio honetako aurrerapena ezabatuko da.",
        "Se borrará el progreso de esta versión.",
        [
          [L("EZEZTATU", "CANCELAR"), () => {}],
          [
            L("BERRIRO HASI", "REINICIAR"),
            () => {
              localStorage.removeItem("oihartzun-bialde-v2");
              location.reload();
            },
          ],
        ],
      );
    $("credits").onclick = () =>
      dialog(
        "BI ALDE · v2",
        "Egileak eta erreferentziak",
        "Autores y referencias",
        "Pertsonaia, animazioak eta ingurune-modeloak: Kay Lousberg / KayKit, CC0.\nMotorra: Three.js r128, MIT. Jatorrizko ELUR JOKOA modua: Snowflow / Maksymilian Dendura, MIT.\n\nJokoaren kodea, mailen diseinua, itsasoa, musika eta bi garaien sistema bertsio honetarako sortu dira.\n\nDiseinu-erreferentziak: Hades (borroka eta musika-geruzak), Zelda: Tears of the Kingdom (eraikuntza), Celeste (mugimenduaren zehaztasuna), Outer Wilds (jakiteko gogoa). Ez ditu joko horien baliabideak erabiltzen: musika eta soinu guztiak jokoak berak sortzen ditu.",
        "Personaje, animaciones y modelos de entorno: Kay Lousberg / KayKit, CC0.\nMotor: Three.js r128, MIT. Modo ELUR JOKOA original: Snowflow / Maksymilian Dendura, MIT.\n\nCódigo del juego, diseño de niveles, océano, música y sistema de dos épocas creados para esta versión.\n\nReferencias de diseño: Hades (combate y música por capas), Zelda: Tears of the Kingdom (construcción), Celeste (precisión de movimiento), Outer Wilds (curiosidad). No utiliza recursos de esos juegos: toda la música y el sonido los genera el propio juego.",
      );
    /* ELUR JOKOA: jatorrizko modua bere orrian dago (/games/elur.html), ez fitxategi honen barruan. */
    if (location.protocol === "file:") $("legacy").hidden = true;
    $("legacy").onclick = () => {
      const base = location.protocol === "about:" ? document.baseURI : location.href;
      const u = new URL("/games/elur.html", base).href;
      const w = window.open(u, "_blank");
      if (!w) location.href = u;
    };
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
    const idx = currentStage < 0 ? saved.stage : currentStage,
      I = ISLANDS[idx];
    $("chapter").textContent = "0" + (idx + 1) + " / 06 · OIHARTZUN";
    $("placeName").textContent = L(...I.name);
    $("goal").textContent = saved.ending
      ? saved.memories.length === 5 && saved.echoes.length === 3
        ? L("Dena aurkitu duzu. Uharteak zureak dira.", "Lo has encontrado todo. Las islas son tuyas.")
        : L("Bilatu falta diren oroitzapenak eta kanpaiak.", "Busca los recuerdos y las campanas que faltan.")
      : guideText();
    $("echoBox").hidden = !saved.echoes.length;
    $("echoes").textContent = saved.echoes.length + "/3";
    $("hearts").textContent = "● ".repeat(Math.max(0, P.hp)) + "○ ".repeat(Math.max(0, P.maxHp - P.hp));
    /* mugikorrean ESKUA/LISTO botere-botoian dago (ctxUpdate) */
    $("craftBtn").hidden = true;
    $("dashDot").textContent = P.dashReady ? "◆" : "◇";
    $("dashDot").style.opacity = P.dashReady ? 1 : 0.5;
    $("secrets").textContent = saved.memories.length + "/5";
    $("route").textContent = L("ITSASOAREN BESTALDEAN", "AL OTRO LADO DEL MAR");
    $("bossHud").hidden = saved.stage !== 5 || !!saved.ending;
    if (!$("bossHud").hidden)
      $("bossHud").innerHTML =
        (boss.state === "open"
          ? L("SORGINKERIA NUKLEORA", "HECHIZO AL NÚCLEO")
          : boss.state === "done"
            ? L("ERLOJUA ISILIK", "EL RELOJ CALLA")
            : L("BESTE GARAIRA!", "¡A LA OTRA ÉPOCA!")) +
        "<small>" +
        "◆ ".repeat(boss.hits) +
        "◇ ".repeat(Math.max(0, BOSS_HITS - boss.hits)) +
        "</small>";
    map();
  }
  function map() {
    const c = $("map").getContext("2d");
    c.clearRect(0, 0, 240, 240);
    c.fillStyle = "#102c40";
    c.fillRect(0, 0, 240, 240);
    const xx = (x) => 120 + (x - P.x) * 1.6,
      zz = (z) => 120 + (z - P.z) * 1.6;
    c.strokeStyle = "#aac7d430";
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < ISLANDS.length; i++) {
      const I = ISLANDS[i];
      if (!i) c.moveTo(xx(I.x), zz(I.z));
      else c.lineTo(xx(I.x), zz(I.z));
    }
    c.stroke();
    for (const I of ISLANDS) {
      c.fillStyle = "#6e9198";
      c.beginPath();
      c.ellipse(xx(I.x), zz(I.z), I.rx * 1.6, I.rz * 1.6, 0, 0, TAU);
      c.fill();
    }
    for (const s of phaseObjects) {
      c.fillStyle = s.phase === -1 || s.phase === phase ? "#f2d298" : "#4b6a80";
      c.fillRect(xx(s.x) - 3, zz(s.z) - 3, 6, 6);
    }
    for (const W of ECHO.waves) {
      c.fillStyle = phase === 1 ? "#bfeaf5" : "#2f5266";
      c.beginPath();
      c.arc(xx(W.x), zz(W.z), W.r * 1.6, 0, TAU);
      c.fill();
    }
    for (const E of ECHO.list) {
      c.fillStyle = "#6e9198";
      c.beginPath();
      c.arc(xx(E.x), zz(E.z), E.r * 1.6, 0, TAU);
      c.fill();
      c.fillStyle = E.rung ? "#7fb9c4" : "#ffd27a";
      c.beginPath();
      c.moveTo(xx(E.x), zz(E.z) - 5);
      c.lineTo(xx(E.x) + 4, zz(E.z));
      c.lineTo(xx(E.x), zz(E.z) + 5);
      c.lineTo(xx(E.x) - 4, zz(E.z));
      c.fill();
    }
    for (const e of ENEMIES)
      if (e.state !== "dead") {
        c.fillStyle = "#ff5a6e";
        c.beginPath();
        c.arc(xx(e.x), zz(e.z), e.type === "brute" ? 4 : 3, 0, TAU);
        c.fill();
      }
    for (const m of pickups)
      if (!m.collected) {
        c.fillStyle = "#ffe4a2";
        c.beginPath();
        c.arc(xx(m.x), zz(m.z), 3, 0, TAU);
        c.fill();
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
    updateAbilities(dt);
    updateMagic(dt);
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
      if (!ascent) move(dt);
      magicUpdate(dt);
      ascentUpdate(dt);
      for (const J of STORY.pages) journalUpdate(J, dt);
      storyUpdate(dt);
      runePuzzlesUpdate(dt);
      enemyUpdate(dt);
      arenaUpdate(dt);
      craftUpdate(dt);
    }
    music(dt);
    subTimer -= dt;
    titleTimer -= dt;
    if (subTimer <= 0) $("subtitle").style.opacity = 0;
    if (titleTimer <= 0) $("chapterTitle").style.opacity = 0;
    shiftFlash = Math.max(0, shiftFlash - dt * 2.8);
    $("phaseFlash").style.opacity = shiftFlash * 0.35;
    if (frame % 8 === 0) hud();
    if (frame % 6 === 0) ctxUpdate();
    /* bizitza bakarra: binjeta gorria taupadaka eta bihotz-soinua */
    const low = P.hp === 1 && started && !ENDING.on;
    lowBeat = low ? lowBeat + dt : 0;
    if (low && lowBeat > 0.95) {
      lowBeat = 0;
      SND.thud();
    }
    $("vignette").style.boxShadow = low ? `inset 0 0 ${110 + 50 * Math.abs(Math.sin(time * 3.3))}px #b0102ea6` : "";
    if (frame % 15 === 0) coachUpdate();
    if (time > 75 && !keysFaded) {
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
    if (workshop.active) {
      cameraUpdate(raw);
    } else if (cinematic) {
      updateCinema(raw);
    } else if (ENDING.on) {
      endingUpdate(raw);
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
    } else if (!started) {
      let t = now * 0.000035;
      camera.position.set(34 + Math.sin(t) * 7, 24, 55 + Math.cos(t) * 5);
      camera.lookAt(0, 2, 14);
      sea.material.uniforms.clock.value = now * 0.0004;
      if (mixer) mixer.update(raw);
      birds.forEach((b, i) => b.position.set(Math.cos(t + i) * 35, 22 + (i % 3), -20 + Math.sin(t + i) * 30));
    }
    fxUpdate(raw);
    juiceUpdate(raw);
    cageVisual(raw);
    numbersUpdate(raw);
    shieldHintUpdate(raw);
    SND.update();
    atmoUpdate(raw);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  const magic = { weaveCooldown: 0, recallCooldown: 0, history: [], sample: 0 };
  const routePoints = [
    [0, 6, 0, -1],
    [0, -0.8, 0.45, 0],
    [0, -7, 1.15, 0],
    [0, -17, 2, -1],
    [6, -29, 2, -1],
    [12, -37, 2.9, 1],
    [20, -44, 3.85, 0],
    [26, -51, 5, -1],
    [27, -63, 5, -1],
    [20, -72, 5.7, 1],
    [11, -79, 6.6, 1],
    [4, -83, 7.2, 0],
    [0, -90, 8, -1],
    [-7, -105, 8, -1],
    [-14, -111, 8.8, 0],
    [-22, -118, 9.8, 1],
    [-28, -125, 11, -1],
    [-25, -138, 11, -1],
    [-21.65, -141.78, 11.6, -1],
    [-16.65, -147.06, 23.5, -1],
    [-17.25, -153.88, 35.6, -1],
    [-6, -164, BOSS_Y, -1],
    [0, -173, BOSS_Y, -1],
  ];
  const stageRoute = [0, 4, 8, 13, 17, 22];
  let routeStep = 0,
    guideBeacon = null,
    cinematic = null;
  function targetPoint() {
    if (routeStep < stageRoute[Math.max(0, currentStage)]) routeStep = stageRoute[Math.max(0, currentStage)];
    let p = routePoints[routeStep];
    if (
      routeStep < routePoints.length - 1 &&
      Math.hypot(P.x - p[0], P.z - p[1]) < 2.3 &&
      P.grounded &&
      Math.abs(P.y - p[2]) < 1
    ) {
      routeStep++;
      p = routePoints[routeStep];
    }
    return p;
  }
  function guideText() {
    const ci = currentStage;
    if (ARENA.state === "fight") return L("Garaitu itzalak", "Derrota a las sombras") + " · " + enemiesAlive();
    if (ci >= 0 && ci < 5 && !isCleared(ci)) {
      if (TRIALS[ci] === "craft")
        return L(
          "Atea itxita: igo errunaren zutabera. Pilatu kaxak ESKU MAGIKOArekin (ukitu eta arrastatu).",
          "Puerta cerrada: sube a la columna de la runa. Apila cajas con la MANO MÁGICA (toca y arrastra).",
        );
      if (TRIALS[ci] === "fight") return L("Atea itxita. Itzalak uhartearen erdian daude.", "Puerta cerrada. Las sombras esperan en el centro de la isla.");
    }
    if (saved.stage === 5)
      return saved.bossDone
        ? L("Hurbildu erlojura. EKIN: azken erabakia.", "Acércate al reloj. ACTUAR: decisión final.")
        : L("Uhina: ALDATU garaia. Nukleo zuria: SORGINKERIA edo BULTZADA.", "Onda: CAMBIAR época. Núcleo blanco: HECHIZO o DASH.");
    const p = targetPoint(),
      d = Math.round(Math.hypot(P.x - p[0], P.z - p[1]));
    if (ASC.inZone)
      return L(
        "ORRATZA · igo hodeietaraino. Kristal berdeek BULTZADA berritzen dute; haizeak gora darama; erruna: SORGINKERIA.",
        "LA AGUJA · sube hasta las nubes. Los cristales verdes renuevan el DASH; el viento te eleva; la runa: HECHIZO.",
      );
    if (routeStep === 0)
      return (
        L(
          "HELBURUA: ur-errotara iritsi. Jarraitu urrezko markari zubi hautsiraino.",
          "OBJETIVO: llegar al molino. Sigue la marca dorada hasta el puente roto.",
        ) +
        " · " +
        d +
        " m"
      );
    if (p[3] >= 0 && phase !== p[3])
      return (
        L(
          "Zubia falta da: ALDATU (Q), edo EHUNDU (C) hurbiletik.",
          "Falta el puente: CAMBIAR (Q), o TEJER (C) desde cerca.",
        ) +
        " · " +
        d +
        " m"
      );
    return (
      (mobile
        ? L("Korrika (makila ertzera) + JAUZI ×2 + BULTZADA. Botere-botoia behar denean agertzen da.", "Corre (palanca al máximo) + SALTAR ×2 + DASH. El botón de poder aparece cuando hace falta.")
        : L("Korrika (makila ertzera / Shift) + JAUZI ×2 + BULTZADA. G / BOTEREAK: eraiki.", "Corre (palanca al máximo / Shift) + SALTAR ×2 + DASH. G / PODERES: construir.")) +
      " · " +
      d +
      " m"
    );
  }
  function drawGuide() {
    if (!started || cinematic || saved.ending) {
      $("waypoint").hidden = true;
      return;
    }
    const Zp = CRAFT.puzzles.find((Z) => Z.D.island === currentStage && !Z.solved);
    const p = saved.stage === 5 ? [0, -179, BOSS_Y] : Zp ? [Zp.plat.x, Zp.plat.z, Zp.plat.y] : targetPoint();
    if (ARENA.state === "fight" || CRAFT.on) {
      $("waypoint").hidden = true;
      if (guideBeacon) guideBeacon.visible = false;
      return;
    }
    if (workshop.active) {
      $("waypoint").hidden = true;
      return;
    }
    if (!guideBeacon) {
      guideBeacon = ring(p[0], p[2] + 0.1, p[1], 0.85, "#ffe09e");
      guideBeacon.castShadow = false;
    }
    guideBeacon.visible = true;
    guideBeacon.position.set(p[0], p[2] + 0.12, p[1]);
    guideBeacon.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
    const v = new T.Vector3(p[0], p[2] + 2.6, p[1]).project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth,
      y = (-v.y * 0.5 + 0.5) * innerHeight;
    const el = $("waypoint");
    el.hidden = false;
    el.style.left = clamp(x, 55, innerWidth - 55) + "px";
    el.style.top = clamp(y, 170, innerHeight - (mobile ? 285 : 120)) + "px";
    const outside = x < 55 || x > innerWidth - 55 || y < 170 || y > innerHeight - (mobile ? 285 : 120);
    const arrows = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
    const arrow = arrows[(Math.round(Math.atan2(y - innerHeight / 2, x - innerWidth / 2) / (PI / 4)) + 8) % 8];
    el.textContent = (outside ? arrow : "◆") + " " + Math.round(Math.hypot(P.x - p[0], P.z - p[1])) + " m";
    $("magicStatus").textContent = mobile
      ? L("EHUNDU", "TEJER") + " " + (magic.weaveCooldown > 0 ? Math.ceil(magic.weaveCooldown) + "s" : "✓")
      : L("EHUNDU", "TEJER") +
        " " +
        (magic.weaveCooldown > 0 ? Math.ceil(magic.weaveCooldown) + "s" : "C ✓") +
        "  ·  " +
        L("IGO", "ASCENDER") +
        " X  ·  " +
        L("ESKU MAGIKOA", "MANO MÁGICA") +
        " G";
  }
  function weave() {
    if (!started || paused || respawnTimer || magic.weaveCooldown > 0) return;
    const candidates = phaseObjects
      .filter((s) => Math.hypot(P.x - s.x, P.z - s.z) < 19 && s.phase !== -1)
      .sort((a, b) => dist(P, a) - dist(P, b));
    const s = candidates[0];
    if (!s) {
      notify("Hurbildu zubi baten ertzera: 19 metroko irismena.", "Acércate a un puente: alcance de 19 metros.", 3);
      return;
    }
    coachDone("weave");
    s.originalPhase = s.phase;
    s.phase = -1;
    s.wovenUntil = time + 12;
    magic.weaveCooldown = 4;
    setPhaseVisual();
    chord();
    spawnTrail();
    notify(
      "EHUNDU · Zubia bi garaietan sendoa da, 12 segundoz.",
      "TEJER · El puente es sólido en ambas épocas durante 12 segundos.",
      4,
    );
  }
  function recall() {
    if (!started || paused || respawnTimer || magic.recallCooldown > 0) return;
    const candidates = magic.history.filter((h) => time - h.t >= 1 && time - h.t <= 6 && h.stage === saved.stage);
    const h = candidates[0];
    if (!h) {
      notify(
        "Lur seguruan ibili lehenik. Zure arrastoa gordetzen ari naiz.",
        "Camina primero sobre suelo seguro. Estoy guardando tu rastro.",
        3,
      );
      return;
    }
    phase = h.phase;
    setPhaseVisual();
    teleport(h.x, h.z, h.y);
    magic.recallCooldown = 8;
    routeStep = h.route;
    shiftFlash = 1;
    note(540, 0.7, 0.04);
    notify("ATZERA · Zure azken arrasto segurura itzuli zara.", "RETORNO · Has vuelto a tu rastro seguro reciente.", 3);
  }
  function updateMagic(dt) {
    magic.weaveCooldown = Math.max(0, magic.weaveCooldown - dt);
    magic.recallCooldown = Math.max(0, magic.recallCooldown - dt);
    magic.sample += dt;
    if (magic.sample > 0.15) {
      magic.sample = 0;
      if (P.grounded && P.platform?.island !== undefined)
        magic.history.push({ x: P.x, z: P.z, y: P.y, phase, stage: saved.stage, t: time, route: routeStep });
      magic.history = magic.history.filter((h) => time - h.t < 6);
    }
    for (const s of phaseObjects)
      if (s.wovenUntil && time > s.wovenUntil) {
        s.phase = s.originalPhase;
        s.wovenUntil = 0;
        setPhaseVisual();
      }
  }
  const scenes = [
    [
      [
        "IRATI · 140.85",
        "Amaiur. Entzuten nauzu? Itsasoa geldirik dago. Hori ez da elurra: denbora hautsia da.",
        "Amaiur. ¿Me recibes? El mar está inmóvil. Eso no es nieve: es tiempo roto.",
        0,
        23,
      ],
      [
        "AMAIUR",
        "Zure ahotsa… duela zazpi urte galdu zintudan. Nor ari da nirekin hizketan?",
        "Tu voz… Te perdí hace siete años. ¿Quién está hablando conmigo?",
        0,
        29,
      ],
      [
        "IRATI · 140.85",
        "Kontuz: Gauekoren hezurrezko zaindariak esnatu dira. Zure makilak sua du: SORGINKERIA, eta urrutitik jo. Izpiak bakarrik bilatzen du helburua.",
        "Cuidado: los guardianes de hueso de Gaueko han despertado. Tu varita tiene fuego: HECHIZO, y golpéalos desde lejos. El rayo busca solo su objetivo.",
        0,
        23,
      ],
      [
        "IRATI · 140.85",
        "Ur-errotara etorri. Urrezko marka jarraitu. Zubi ertzean, ALDATU garaia: egurra berriro agertuko da.",
        "Ven al molino. Sigue la marca dorada. Al borde del puente, CAMBIA de época: la madera volverá a aparecer.",
        0,
        -3,
      ],
      [
        "IRATI · 140.85",
        "Ez izan presarik. Bide bakoitzak bi garai ditu: begiratu ondo bi aldeak. Argi berdeko bankuetan, sorginaren eskuak bidea eraiki dezake.",
        "No tengas prisa. Cada camino tiene dos épocas: mira bien los dos lados. En los bancos de luz verde, la mano de la bruja puede construir el camino.",
        0,
        6,
      ],
    ],
    [
      [
        "IRATI · 140.85",
        "Ondo. Lehen zubia zeharkatu duzu. Errotaren gurpila atzerantz dabil.",
        "Bien. Has cruzado el primer puente. La rueda del molino gira al revés.",
        -6,
        -23,
      ],
      [
        "AMAIUR",
        "Nire izena dago egurrean. Nik ez dut idatzi.",
        "Mi nombre está tallado en la madera. Yo no lo escribí.",
        0,
        -24,
      ],
      [
        "IRATI · 140.85",
        "Artxibora joan. Zubia garaiz aldatzen da: EHUNDU eta zeharkatu bi aldeak.",
        "Ve al archivo. El puente cambia de época: usa TEJER y cruza ambos lados.",
        20,
        -44,
      ],
    ],
    [
      [
        "AMAIUR",
        "Artxiboak dio ni naizela erlojuaren zaindaria. Ehun urte daramatzat hemen?",
        "El archivo dice que soy la guardiana del reloj. ¿Llevo cien años aquí?",
        36,
        -60,
      ],
      [
        "AHOTS EZEZAGUNA · 000.00",
        "Ez galdetu zenbat urte. Galdetu zenbat aldiz.",
        "No preguntes cuántos años. Pregunta cuántas veces.",
        31,
        -57,
      ],
      [
        "IRATI · 140.85",
        "Ez entzun. Aldatu garaia airean: beste BULTZADA bat izango duzu. Elizara iritsi behar dugu.",
        "No escuches. Cambia de época en el aire: tendrás otro DASH. Tenemos que llegar a la iglesia.",
        11,
        -79,
      ],
    ],
    [
      [
        "AMAIUR",
        "Kanpai bakoitzarekin oroitzapen bat galtzen dut. Zuk bazenekien.",
        "Con cada campanada pierdo un recuerdo. Tú lo sabías.",
        -4,
        -101,
      ],
      [
        "IRATI · 140.85",
        "Nik ez zaitut hona ekarri. Zuk grabatu zenuen nire ahotsa, ez amore emateko.",
        "Yo no te traje aquí. Tú grabaste mi voz para no rendirte.",
        0,
        -98,
      ],
      ["AMAIUR", "Orduan nor ari da grabazioa aldatzen?", "Entonces, ¿quién está cambiando la grabación?", 0, -98],
    ],
    [
      [
        "GAUEKO · 000.00",
        "Ni ez naiz zure etsaia. Herria ito zen eguna giltzapetu zenuen. Nik giltzari eusten diot.",
        "No soy tu enemigo. Encerraste el día en que se hundió el pueblo. Yo sostengo la llave.",
        -37,
        -135,
      ],
      [
        "AMAIUR",
        "Eta nire oroitzapenak erabiltzen dituzu sarraila elikatzeko. Amaitu da.",
        "Y utilizas mis recuerdos para alimentar la cerradura. Se acabó.",
        -32,
        -131,
      ],
      [
        "IRATI · 140.85",
        "Erlojua Orratzaren gainean dago, hodeien artean. Garbitu uhartea eta igo: harriz harri, haizez haize.",
        "El reloj está sobre la Aguja, entre las nubes. Limpia la isla y sube: de piedra en piedra, de viento en viento.",
        0,
        -179,
      ],
    ],
    [
      [
        "GAUEKO · 000.00",
        "Iritsi zara. Beti iristen zara. Askatu denbora, eta egun hau betiko galduko duzu.",
        "Has llegado. Siempre llegas. Libera el tiempo y perderás este día para siempre.",
        0,
        -179,
      ],
      ["AMAIUR", "Kendu maskara hori, Gaueko. Ikusi nahi zaitut.", "Quítate esa máscara, Gaueko. Quiero verte.", 0, -173],
      ["GAUEKO · 000.00", "Jo nire nukleoa lau aldiz, eta zeuk kenduko didazu.", "Golpea mi núcleo cuatro veces y me la quitarás tú misma.", 0, -179],
      [
        "IRATI · 140.85",
        "Uhina datorrenean, ALDATU garaia. Nukleoa zuri dagoenean: SORGINKERIA edo BULTZADA. Zurekin nago.",
        "Cuando venga la onda, CAMBIA de época. Cuando el núcleo esté blanco: HECHIZO o DASH. Estoy contigo.",
        0,
        -179,
      ],
    ],
  ];
  function playScene(i) {
    if (cinematic || !started) return;
    coachHide();
    cinematic = { i, n: 0, t: 0 };
    paused = true;
    clearInput();
    $("cinema").hidden = false;
    $("hud").style.opacity = "0";
    $("touch").style.visibility = "hidden";
    $("waypoint").hidden = true;
    if (guideBeacon) guideBeacon.visible = false;
    showShot();
  }
  function showShot() {
    const c = cinematic,
      sh = scenes[c.i][c.n];
    Object.assign(c, { t: 0, full: L(sh[1], sh[2]), shown: 0, lastN: -1, typing: true, doneT: 0 });
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
    SND.radio();
  }
  function nextShot() {
    if (!cinematic) return;
    const c = cinematic;
    if (c.typing) {
      c.shown = c.full.length; /* lehenik testua osatu */
      return;
    }
    if (++c.n >= scenes[c.i].length) endScene();
    else showShot();
  }
  function endScene() {
    if (!cinematic) return;
    $("portrait").classList.remove("talk");
    const wasEcho = cinematic.i === 6;
    cinematic = null;
    paused = false;
    clearInput();
    accumulator = 0;
    $("cinema").hidden = true;
    $("hud").style.opacity = "1";
    $("touch").style.visibility = "";
    $("chapterTitle").style.opacity = 0;
    titleTimer = 0;
    storyAfterScene();
    if (wasEcho)
      notify(
        saved.echoes.length === 3 ? "Hiru oihartzunak entzun dituzu." : "OIHARTZUNA · " + saved.echoes.length + " / 3 · Beste kanpai batzuk zain daude.",
        saved.echoes.length === 3 ? "Has escuchado los tres ecos." : "ECO · " + saved.echoes.length + " / 3 · Otras campanas esperan.",
        4,
      );
    else
      notify(
        "Jarraitu urrezko markari. Zure bidea aurrean dago.",
        "Sigue la marca dorada. Tu camino está delante de ti.",
        4,
      );
    hud();
  }
  function updateCinema(dt) {
    const c = cinematic;
    c.t += dt;
    const sh = scenes[c.i][c.n],
      I = ISLANDS[c.i] || ISLANDS[Math.max(0, currentStage)];
    const look = new T.Vector3(sh[3], (sh[5] ?? I.y) + 1.4, sh[4]),
      a = c.n % 2 ? -0.35 : 0.3;
    const pk = innerHeight > innerWidth ? 1.55 : 1,
      pos = look.clone().add(new T.Vector3(12 * Math.cos(a + c.t * 0.035), 9, 17).multiplyScalar(pk));
    camera.position.lerp(pos, 1 - Math.exp(-dt * 2));
    camera.lookAt(look);
    if (mixer) mixer.update(dt);
    sea.material.uniforms.clock.value += dt;
    music(dt);
    if (c.typing) {
      c.shown += dt * 50;
      const n = Math.min(c.full.length, Math.floor(c.shown));
      if (n !== c.lastN) {
        $("cineText").textContent = c.full.slice(0, n);
        if (n > c.lastN && n % 3 === 0 && /\S/.test(c.full[n - 1] || "")) SND.blip();
        c.lastN = n;
      }
      if (n >= c.full.length) {
        c.typing = false;
        c.doneT = c.t;
        $("portrait").classList.remove("talk");
      }
    } else if (c.t - c.doneT > Math.max(4.5, c.full.length * 0.055)) nextShot();
  }

  // Movement and construction systems. Building pieces are rune-anchored solids, not simulated rigid bodies.
  let jumpHeld = false,
    ascent = null,
    abilityClock = 0,
    stasisUntil = 0,
    stasisCooldown = 0,
    ascendCooldown = 0;
  const buildCrystals = [],
    stations = [],
    workshop = { active: false, selected: null, pieces: [], undo: [], outline: null, linkId: 1, seen: new Set() };
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
      ["recallBtn", ascend],
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
     BOTERE-BOTOIA (mugikorra) · une bakoitzean behar den botere bakarra
     Eraikitzeko eremuan ESKUA, plataforma baten azpian IGO, zubi mugikor
     edo arrisku baten ondoan GELDITU, beste garaiko zubi baten ertzean
     EHUNDU, erlojuaren aurrean EKIN. Bestela ezkutatuta. ⋯ = menu osoa.
     ================================================================== */
  const CTX = { cur: null, fn: null }; /* null: hurrengo eguneraketak beti aplikatzen du (ezkutatu barne) */
  function ascendRoof() {
    if (ascent || ascendCooldown > 0 || ascZone()) return null;
    return platforms.find((s) => (s.phase === -1 || s.phase === phase) && s.y > P.y + 1.7 && s.y < P.y + 13 && contains(s, P.x, P.z, -0.1)) || null;
  }
  function ctxPower() {
    if (CRAFT.on) return ["craft", L("EGINDA", "LISTO"), "green", craftToggle];
    if (near === "ending") return ["end", L("EKIN", "ACTUAR"), "gold", interact];
    if (zoneHere() && !isCleared(currentStage)) return ["craft", L("ESKUA", "MANO"), "green", craftToggle];
    if (P.grounded && ascendRoof()) return ["ascend", L("IGO", "SUBIR"), "violet", ascend];
    const dd = (o) => Math.hypot(o.x - P.x, o.z - P.z);
    if (stasisCooldown <= 0 && !stasisActive() && (phaseObjects.some((o) => o.moving && dd(o) < 12) || hazards.some((h) => h.phase === phase && dd(h) < 12)))
      return ["stasis", L("GELDITU", "PARAR"), "cyan", stasis];
    if (magic.weaveCooldown <= 0 && phaseObjects.some((o) => o.phase !== -1 && o.phase !== phase && !o.asc && dd(o) < 9))
      return ["weave", L("EHUNDU", "TEJER"), "blue", weave];
    return null;
  }
  function ctxUpdate() {
    const c = started && !paused && !cinematic && !ENDING.on ? ctxPower() : null,
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
    if (!started || paused || ascent) return;
    dialog(
      L("SORGINAREN BOTEREAK", "PODERES DE LA BRUJA"),
      L("Bidea zure esku dago.", "El camino está en tus manos."),
      L("Bidea zure esku dago.", "El camino está en tus manos."),
      "Mugikorrean ez duzu menu hau behar: BOTERE-BOTOIA bakarrik agertzen da behar denean (ESKUA, IGO, GELDITU, EHUNDU, EKIN).\n\nESKU MAGIKOA: kaxak mugitu, biratu eta pilatu. IGO: gaineko plataforma zeharkatu. GELDITU: plataformak eta arriskuak izoztu. EHUNDU: zubia bi garaietan sendo. ATZERA: denbora pixka bat atzera.",
      "En el móvil no necesitas este menú: el BOTÓN DE PODER aparece solo cuando hace falta (MANO, SUBIR, PARAR, TEJER, ACTUAR).\n\nMANO MÁGICA: mueve, gira y apila cajas. SUBIR: atraviesa la plataforma encima de ti. PARAR: detén plataformas y peligros. TEJER: el puente sólido en ambas épocas. RETORNO: el tiempo retrocede un poco.",
      [
        [L("ESKU MAGIKOA", "MANO MÁGICA") + kb(" · G"), craftToggle],
        [L("IGO", "ASCENDER") + kb(" · X"), ascend],
        [L("GELDITU", "ESTASIS") + kb(" · Z"), stasis],
        [L("EHUNDU", "TEJER") + kb(" · C"), weave],
        [L("ATZERA", "RETORNO") + kb(" · V"), recall],
        [L("JARRAITU", "CONTINUAR"), () => {}],
      ],
    );
  }
  function stasisActive() {
    return abilityClock < stasisUntil;
  }
  function stasis() {
    if (!started || paused || respawnTimer || stasisCooldown > 0) return;
    stasisUntil = abilityClock + 5;
    stasisCooldown = 11;
    shiftFlash = 1;
    chord();
    notify(
      "GELDITU · Zubi mugikorrak eta arriskuak: 5 segundo geldirik.",
      "ESTASIS · Puentes móviles y peligros detenidos durante 5 segundos.",
      4,
    );
  }
  function ascend() {
    if (!started || paused || respawnTimer || ascent || ascendCooldown > 0) return;
    if (ascZone()) {
      notify("Orratzak IGO xurgatzen du: igo zure hankekin.", "La Aguja absorbe ASCENDER: sube con tus piernas.", 2.5);
      return;
    }
    const roof = platforms
      .filter(
        (s) =>
          (s.phase === -1 || s.phase === phase) && s.y > P.y + 1.7 && s.y < P.y + 13 && contains(s, P.x, P.z, -0.1),
      )
      .sort((a, b) => a.y - b.y)[0];
    if (!roof) {
      notify(
        "IGO: kokatu plataforma baten azpian (gehienez 13 m). Eraiki bat zure gainean.",
        "ASCENDER: sitúate bajo una plataforma (máximo 13 m). Puedes construirla sobre ti.",
        4,
      );
      return;
    }
    ascent = { x: P.x, z: P.z, from: P.y, to: roof.y, t: 0, roof };
    P.vx = P.vz = P.vy = 0;
    P.dashT = 0;
    ascendCooldown = 2;
    note(390, 0.9, 0.045);
    spawnTrail();
  }
  function updateAbilities(dt) {
    abilityClock += dt;
    stasisCooldown = Math.max(0, stasisCooldown - dt);
    ascendCooldown = Math.max(0, ascendCooldown - dt);
    if (ascent) {
      const a = ascent;
      a.t += dt;
      const t = clamp(a.t / 0.65, 0, 1);
      P.y = mix(a.from, a.to, t * t * (3 - 2 * t));
      hero.position.set(a.x, P.y, a.z);
      animate("Spellcast_Raise");
      if (frame % 4 === 0) spawnTrail();
      if (t === 1) {
        teleport(a.x, a.z, a.to);
        ascent = null;
        chord();
      }
    }
    for (const c of buildCrystals) {
      c.cool = Math.max(0, c.cool - dt);
      c.m.visible = c.cool <= 0;
      c.m.rotation.y += dt;
      c.m.position.y = c.y + Math.sin(abilityClock * 3 + c.x) * 0.15;
      if (c.cool <= 0 && Math.hypot(P.x - c.x, P.z - c.z) < 1.1 && Math.abs(P.y + 1 - c.y) < 1.5) {
        P.dashReady = true;
        P.jumps = Math.min(P.jumps, 1);
        P.vy = Math.max(P.vy, 3);
        c.cool = 3;
        note(880, 0.25, 0.04);
        spawnTrail();
      }
    }
    for (const station of stations) {
      const complete = saved.workshopSolved?.includes(station.id);
      station.mark.material.color.set(complete ? "#98ffc3" : "#68dcec");
      station.mark.rotation.z += dt * 0.12;
      if (!complete && !workshop.active) {
        const piece = workshop.pieces.find(
          (a) =>
            a.group !== null &&
            a.zone === station.id &&
            contains(a, station.socketX, station.socketZ, 0.1) &&
            Math.abs(a.y - station.y) < 1.7,
        );
        if (piece && assembly(piece).length >= 2) {
          saved.workshopSolved ||= [];
          saved.workshopSolved.push(station.id);
          persist();
          chord();
          station.lift.visible = true;
          station.liftPlatform.phase = -1;
          notify(
            "LOTURA OSATUTA · Bide sekretua ireki da. IGO erabili plataformaren azpian.",
            "ENLACE COMPLETO · Ruta secreta abierta. Usa ASCENDER bajo la plataforma.",
            6,
          );
        }
      }
      if (
        complete &&
        !ascent &&
        Math.hypot(P.x - station.liftPlatform.x, P.z - station.liftPlatform.z) < 2.7 &&
        Math.abs(P.y - station.liftPlatform.y) < 0.4 &&
        !saved.workshopEcho?.includes(station.id)
      ) {
        saved.workshopEcho ||= [];
        saved.workshopEcho.push(station.id);
        persist();
        playWorkshopScene(station.id);
      }
    }
    const nearStation = stations.find((a) => Math.hypot(P.x - a.x, P.z - a.z) < 6);
    $("workHint").hidden = !nearStation || workshop.active || !!cinematic;
    if (nearStation)
      $("workHint").textContent = L(
        "G / BOTEREAK → ESKU MAGIKOA · Bi ohol lotu errunaren gainean.",
        "G / PODERES → MANO MÁGICA · Une dos tablones sobre la runa.",
      );
    $("stasisBadge").hidden = !stasisActive();
    if (stasisActive())
      $("stasisBadge").textContent =
        L("DENBORA GELDIRIK · ", "TIEMPO DETENIDO · ") + Math.ceil(stasisUntil - abilityClock) + "s";
  }
  function addPiece(id, zone, x, z, y, w, d) {
    const group = new T.Group();
    scene.add(group);
    box(0, -0.17, 0, w, 0.34, d, "#748e86", group);
    for (let i = 0; i < 4; i++) box((i / 3 - 0.5) * (w - 0.3), 0.01, 0, 0.07, 0.06, d, "#dec899", group);
    ring(0, 0.055, 0, 0.43, "#8dffd3", group);
    const a = { id, zone, x, z, y, w, d, phase: -1, m: group, group: null, home: { x, z, y, w, d }, built: true };
    group.position.set(x, y, z);
    group.userData.piece = a;
    workshop.pieces.push(a);
    platforms.push(a);
    return a;
  }
  function buildWorkshop() {
    /* lehengo eraikuntza-estazioak ordezkatuta daude (craft.js: ukipen bidezko puzzleak) */
    const configs = [];
    for (const c of configs) {
      const station = { ...c };
      station.mark = ring(c.socketX, c.y + 0.06, c.socketZ, 2.3, "#68dcec");
      station.mark.rotation.x = -PI / 2;
      box(c.x, c.y + 0.3, c.z, 1.4, 0.6, 1.1, "#49685f");
      orb(c.x, c.y + 1, c.z, 0.27, "#90ffcc");
      glow(c.x, c.y + 1, c.z, "#7dffc9", 2);
      for (let i = 0; i < 3; i++) addPiece(c.id * 10 + i, c.id, c.x - 3 + i * 2.5, c.z + 1.5, c.y, 2.2, 5.2);
      const lift = box(c.liftX, c.y + 5.4, c.liftZ, 5, 0.4, 5, material("#679e92", 0.15));
      ring(c.liftX, c.y + 5.65, c.liftZ, 1.2, "#b4ffe2");
      station.lift = lift;
      station.liftPlatform = {
        x: c.liftX,
        z: c.liftZ,
        y: c.y + 5.6,
        w: 5,
        d: 5,
        phase: saved.workshopSolved?.includes(c.id) ? -1 : -2,
        m: lift,
      };
      lift.visible = station.liftPlatform.phase === -1;
      platforms.push(station.liftPlatform);
      stations.push(station);
    }
    for (const row of [
      [0, -4, 3.5],
      [15, -40, 6],
      [14, -76, 9],
      [-17, -114, 12],
    ]) {
      const [x, z, y] = row;
      const m = orb(x, y, z, 0.34, "#b3ffc9");
      buildCrystals.push({ x, z, y, m, cool: 0 });
    }
    if (Array.isArray(saved.buildPieces))
      for (const st of saved.buildPieces) {
        const a = workshop.pieces.find((a) => a.id === st.id);
        if (
          !a ||
          ![st.x, st.z, st.y, st.w, st.d].every(Number.isFinite) ||
          Math.hypot(st.x - a.home.x, st.z - a.home.z) > 55 ||
          st.y < a.home.y - 2 ||
          st.y > a.home.y + 20
        )
          continue;
        Object.assign(a, {
          x: st.x,
          z: st.z,
          y: st.y,
          w: st.w,
          d: st.d,
          group: Number.isInteger(st.group) ? st.group : null,
        });
        a.m.rotation.y = st.rot || 0;
        syncPiece(a);
      }
    workshop.linkId = 1 + Math.max(0, ...workshop.pieces.map((a) => a.group || 0));
  }
  function assembly(a) {
    return a.group === null ? [a] : workshop.pieces.filter((b) => b.group === a.group);
  }
  function pieceState(a) {
    return { id: a.id, x: a.x, z: a.z, y: a.y, w: a.w, d: a.d, group: a.group, rot: a.m.rotation.y };
  }
  function recordBuild() {
    workshop.undo.push(workshop.pieces.map(pieceState));
    if (workshop.undo.length > 30) workshop.undo.shift();
  }
  function saveBuild() {
    saved.buildPieces = workshop.pieces.map(pieceState);
    persist();
  }
  function syncPiece(a) {
    a.m.position.set(a.x, a.y, a.z);
  }
  function selectionList() {
    return workshop.pieces
      .filter((a) => Math.hypot(a.x - P.x, a.z - P.z) <= 27)
      .sort((a, b) => dist(P, a) - dist(P, b));
  }
  function selectPiece(a) {
    if (typeof a === "number") a = workshop.pieces.find((p) => p.id === a);
    if (!a) return;
    workshop.selected = a;
    drawSelection();
  }
  function drawSelection() {
    const a = workshop.selected;
    if (!a) return;
    if (workshop.outline) {
      for (const e of workshop.outline.children) {
        e.geometry.dispose();
        e.material.dispose();
      }
      scene.remove(workshop.outline);
    }
    const g = new T.Group();
    for (const b of assembly(a)) {
      const edges = new T.LineSegments(
        new T.EdgesGeometry(new T.BoxGeometry(b.w + 0.12, 0.5, b.d + 0.12)),
        new T.LineBasicMaterial({ color: "#c6ffe1" }),
      );
      edges.position.set(b.x, b.y - 0.15, b.z);
      g.add(edges);
    }
    scene.add(g);
    workshop.outline = g;
    $("buildInfo").textContent =
      L("OHOLA ", "TABLÓN ") +
      ((a.id % 10) + 1) +
      " · " +
      assembly(a).length +
      L(" pieza lotuta", " piezas unidas") +
      " · " +
      L("Altuera ", "Altura ") +
      (a.y - ISLANDS[Math.max(0, currentStage)].y).toFixed(1) +
      " m";
    $("buildHint").textContent = L(
      "Mugitu oholak erruna turkesara. Bi pieza hurbildu eta LOTU. ↶ desegin.",
      "Mueve tablones a la runa turquesa. Acerca dos piezas y pulsa UNIR. ↶ deshace.",
    );
  }
  function openWorkshop() {
    if (!started || paused || ascent || respawnTimer) return;
    if (!P.grounded) {
      notify("ESKU MAGIKOA: lur seguruan jarri lehenik.", "MANO MÁGICA: aterriza primero sobre suelo seguro.", 3);
      return;
    }
    const list = selectionList().filter((a) => a !== P.platform);
    if (!list.length) {
      notify(
        "Bilatu argi berdea duen bankua. Oholak bertan daude.",
        "Busca un banco con luz verde. Allí encontrarás tablones.",
        4,
      );
      return;
    }
    workshop.active = true;
    paused = true;
    clearInput();
    $("buildPanel").hidden = false;
    $("hud").style.visibility = "hidden";
    $("top").style.visibility = "hidden";
    $("touch").style.visibility = "hidden";
    $("waypoint").hidden = true;
    selectPiece(list[0]);
    $("buildTitle").textContent = L("ESKU MAGIKOA", "MANO MÁGICA");
    for (const el of document.querySelectorAll("[data-eu]")) el.textContent = L(el.dataset.eu, el.dataset.es);
    note(440, 0.5, 0.035);
  }
  function closeWorkshop() {
    if (!workshop.active) return;
    saveBuild();
    workshop.active = false;
    paused = false;
    clearInput();
    $("buildPanel").hidden = true;
    $("hud").style.visibility = "";
    $("top").style.visibility = "";
    $("hud").style.opacity = "1";
    $("touch").style.visibility = "";
    if (workshop.outline) {
      for (const e of workshop.outline.children) {
        e.geometry.dispose();
        e.material.dispose();
      }
      scene.remove(workshop.outline);
      workshop.outline = null;
    }
    cameraUpdate(1);
    notify(
      "Oholak airean finkatuta geratzen dira. Orain igo eta probatu.",
      "Los tablones quedan anclados en el aire. Sube y prueba tu construcción.",
      4,
    );
  }
  function canTransform(arr) {
    return (
      arr.every(
        (a) =>
          Math.hypot(a.x - P.x, a.z - P.z) <= 28 &&
          a.y >= ISLANDS[Math.max(0, currentStage)].y - 0.2 &&
          a.y <= ISLANDS[Math.max(0, currentStage)].y + 17,
      ) && !arr.some((a) => contains(a, P.x, P.z, 0.4) && Math.abs(a.y - P.y) < 1.9)
    );
  }
  function movePiece(dx, dz, dy = 0) {
    if (!workshop.active) return false;
    const a = workshop.selected,
      items = assembly(a),
      proposed = items.map((b) => ({ ...b, x: b.x + dx, z: b.z + dz, y: b.y + dy }));
    if (!canTransform(proposed)) {
      buildMessage();
      return false;
    }
    recordBuild();
    items.forEach((b, i) => {
      Object.assign(b, { x: proposed[i].x, z: proposed[i].z, y: proposed[i].y });
      syncPiece(b);
    });
    drawSelection();
    return true;
  }
  function buildMessage() {
    $("buildHint").textContent = L(
      "Ezin da hemen jarri: zure gorputza edo 28 metroko irismena. Mugitu beste aldera.",
      "No cabe aquí: tu cuerpo o el límite de 28 metros. Muévelo hacia otro lado.",
    );
  }
  function rotatePiece() {
    if (!workshop.active) return false;
    const a = workshop.selected,
      items = assembly(a),
      proposed = items.map((b) => ({ ...b, x: a.x - (b.z - a.z), z: a.z + (b.x - a.x), w: b.d, d: b.w }));
    if (!canTransform(proposed)) {
      buildMessage();
      return false;
    }
    recordBuild();
    items.forEach((b, i) => {
      Object.assign(b, { x: proposed[i].x, z: proposed[i].z, w: proposed[i].w, d: proposed[i].d });
      b.m.rotation.y += PI / 2;
      syncPiece(b);
    });
    drawSelection();
    return true;
  }
  function joinPiece() {
    if (!workshop.active) return false;
    const a = workshop.selected,
      items = assembly(a);
    let best = null;
    for (const b of workshop.pieces) {
      if (items.includes(b) || b.zone !== a.zone) continue;
      for (const base of items) {
        if (Math.abs(base.y - b.y) > 1) continue;
        const dx = base.x - b.x,
          dz = base.z - b.z;
        let tx = 0,
          tz = 0;
        if (Math.abs(dx) / (base.w + b.w) >= Math.abs(dz) / (base.d + b.d)) {
          tx = b.x + (Math.sign(dx || 1) * (base.w + b.w)) / 2 - base.x;
          tz = b.z - base.z;
        } else {
          tz = b.z + (Math.sign(dz || 1) * (base.d + b.d)) / 2 - base.z;
          tx = b.x - base.x;
        }
        const n = Math.hypot(tx, tz);
        if (n < 2.2 && (!best || n < best.n)) best = { b, n, tx, tz, dy: b.y - base.y };
      }
    }
    if (!best) {
      $("buildHint").textContent = L(
        "Hurbildu bi ertz: gehienez 2 metro. Gero LOTU.",
        "Acerca dos bordes: máximo 2 metros. Después UNIR.",
      );
      return false;
    }
    const proposed = items.map((b) => ({ ...b, x: b.x + best.tx, z: b.z + best.tz, y: b.y + best.dy }));
    if (!canTransform(proposed)) {
      buildMessage();
      return false;
    }
    recordBuild();
    const other = assembly(best.b),
      id = workshop.linkId++;
    items.forEach((b, i) => {
      Object.assign(b, { x: proposed[i].x, z: proposed[i].z, y: proposed[i].y, group: id });
      syncPiece(b);
    });
    other.forEach((b) => (b.group = id));
    drawSelection();
    chord();
    return true;
  }
  function detachPiece() {
    if (!workshop.active) return;
    recordBuild();
    workshop.selected.group = null;
    drawSelection();
  }
  function undoPiece() {
    if (!workshop.active || !workshop.undo.length) return;
    const snapshot = workshop.undo.pop();
    for (const st of snapshot) {
      const a = workshop.pieces.find((b) => b.id === st.id);
      Object.assign(a, { x: st.x, z: st.z, y: st.y, w: st.w, d: st.d, group: st.group });
      a.m.rotation.y = st.rot;
      syncPiece(a);
    }
    drawSelection();
  }
  function resetPiece() {
    if (!workshop.active) return;
    const a = workshop.selected;
    if (contains({ ...a, ...a.home }, P.x, P.z, 0.5)) {
      buildMessage();
      return;
    }
    recordBuild();
    a.group = null;
    Object.assign(a, a.home);
    a.m.rotation.y = 0;
    syncPiece(a);
    drawSelection();
  }
  function cyclePiece() {
    const list = selectionList(),
      i = list.indexOf(workshop.selected);
    selectPiece(list[(i + 1) % list.length]);
  }
  function buildKey(e) {
    const actions = {
      Escape: closeWorkshop,
      KeyG: closeWorkshop,
      KeyW: () => movePiece(0.557, -0.83),
      ArrowUp: () => movePiece(0.557, -0.83),
      KeyS: () => movePiece(-0.557, 0.83),
      ArrowDown: () => movePiece(-0.557, 0.83),
      KeyA: () => movePiece(-0.83, 0.557),
      ArrowLeft: () => movePiece(-0.83, 0.557),
      KeyD: () => movePiece(0.83, -0.557),
      ArrowRight: () => movePiece(0.83, -0.557),
      KeyR: rotatePiece,
      KeyE: joinPiece,
      KeyQ: cyclePiece,
      KeyZ: undoPiece,
      PageUp: () => movePiece(0, 0, 0.5),
      PageDown: () => movePiece(0, 0, -0.5),
    };
    if (actions[e.code]) actions[e.code]();
  }
  function bindWorkshop() {
    const actions = {
      buildClose: closeWorkshop,
      buildNext: cyclePiece,
      buildRotate: rotatePiece,
      buildJoin: joinPiece,
      buildDetach: detachPiece,
      buildUndo: undoPiece,
      buildReset: resetPiece,
      buildUp: () => movePiece(0.557, -0.83),
      buildDown: () => movePiece(-0.557, 0.83),
      buildLeft: () => movePiece(-0.83, 0.557),
      buildRight: () => movePiece(0.83, -0.557),
      buildRise: () => movePiece(0, 0, 0.5),
      buildLower: () => movePiece(0, 0, -0.5),
    };
    for (const [id, fn] of Object.entries(actions)) $(id).onclick = fn;
    $("view").addEventListener("pointerdown", (e) => {
      if (!workshop.active) return;
      const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1), camera);
      const hits = ray.intersectObjects(
        selectionList().map((a) => a.m),
        true,
      );
      if (hits.length) {
        let o = hits[0].object;
        while (o && !o.userData.piece) o = o.parent;
        if (o) selectPiece(o.userData.piece);
      }
    });
  }
  function playWorkshopScene(id) {
    const script = [
      [
        [
          "IRATI · 140.85",
          "Zubi hori… ez zen grabazioan agertzen. Lehen aldiz, zerbait berria egin duzu.",
          "Ese puente… no aparecía en la grabación. Por primera vez has hecho algo nuevo.",
          -12,
          20,
        ],
        [
          "AMAIUR",
          "Beraz, ez dugu iragana bakarrik aldatzen. Etorkizuna ere eraiki dezakegu.",
          "Entonces no solo cambiamos el pasado. También podemos construir el futuro.",
          -12,
          20,
        ],
      ],
      [
        [
          "AHOTS EZEZAGUNA · 000.00",
          "Ez naiz Gaueko. Beste Amaiur bat naiz. Zuk eraikitako zubia nire munduan ere agertu da.",
          "No soy Gaueko. Soy otra Amaiur. El puente que has construido también apareció en mi mundo.",
          39,
          -54,
        ],
        [
          "IRATI · 140.85",
          "Ez dago bi garai bakarrik. Hartu ez dituzun erabakiak ere hemen bizi dira.",
          "No hay solo dos épocas. Las decisiones que no tomaste también viven aquí.",
          39,
          -54,
        ],
      ],
      [
        [
          "AMAIUR",
          "Gauekoren giltza ez da suntsitu behar. Biharko bidea eraikiz gero, herriak ihes egin dezake.",
          "No hay que destruir la llave de Gaueko. Si construimos un camino hacia mañana, el pueblo podrá escapar.",
          -29,
          -129,
        ],
        [
          "IRATI · 140.85",
          "Hiru lotura. Hiru ahots. Erlojua irekitzen duzunean, beste aukera bat izango duzu.",
          "Tres enlaces. Tres voces. Cuando abras el reloj, tendrás otra opción.",
          -29,
          -129,
        ],
      ],
    ][id];
    const idx = scenes.length;
    scenes.push(script);
    playScene(idx);
  }

  async function boot() {
    /* atariaren barruan (iframe): goiko erdiko "itzuli" botoiari lekua utzi */
    if (window.__EG_GAME) document.body.classList.add("eg-embed");
    controls();
    translate();
    const egReady = EG ? EG.preload(["grass", "snow", "cliff", "water", "planks"], ["dusk", "day"], 8000) : Promise.resolve();
    const names = Object.keys(ASSETS);
    let done = 0;
    await Promise.all(
      names.map(async (name) => {
        models[name] = await parseAsset(name);
        $("loadBar").style.width = (++done / (names.length + 1)) * 90 + "%";
      }),
    );
    const glb = (b64) => {
      const binary = atob(b64),
        bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Promise((res, rej) => loader.parse(bytes.buffer, "", res, rej));
    };
    models.mage = await glb(MAGE);
    /* KayKit hezurdurak (CC0): animazioak skel_minion-en daude, hiru aldaerek partekatzen dituzte */
    if (typeof SKEL_GLB !== "undefined")
      for (const k of Object.keys(SKEL_GLB)) {
        try {
          models["skel_" + k] = await glb(SKEL_GLB[k]);
        } catch (e) {
          console.warn("skel", k, e);
        }
      }
    $("loadLabel").textContent = L("Itsasoa eta zerua…", "El mar y el cielo…");
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
        saved,
        input,
        solids,
        workshop,
        stations,
        openWorkshop,
        closeWorkshop,
        movePiece,
        rotatePiece,
        joinPiece,
        undoPiece,
        selectPiece,
        ascend,
        stasis,
        abilityState: () => ({ ascent, stasisUntil, abilityClock }),
        releaseJump,
        buildCrystals,
        weave,
        recall,
        magic,
        guideText,
        playScene,
        endScene,
        nextShot,
        cinematicState: () => cinematic,
        coachState: () => ({ cur: COACH.cur, seen: [...COACH.seen], frame, time }),
        platforms,
        pickups,
        ISLANDS,
        ECHO,
        ECHO_DEFS,
        SND,
        ARENA,
        ENEMIES,
        CRAFT,
        CAGES,
        SAFE,
        TRIALS,
        attack,
        ATK,
        MAG,
        BOLTS,
        RUNES,
        ASC,
        STORY,
        RUNE_PUZ,
        CAM,
        CAMG,
        camGesture: { down: camGestureDown, move: camGestureMove, up: camGestureUp },
        CTX,
        ctxPower,
        ctxUpdate,
        direction,
        ascRespawn,
        ascZone,
        magicReset,
        dbg: () => ({ started, paused, ascent: !!ascent, respawnTimer, craft: CRAFT.on, cinematic: !!cinematic }),
        spawnEnemy,
        spawnWave,
        playerHit,
        islandDone,
        isCleared,
        craftEnter,
        craftExit,
        craftGrab,
        craftDrag,
        craftRelease,
        craftRotate,
        settle,
        bossStrike,
        pickPiece,
        ENDING,
        ringEcho,
        endingFinish,
        blend: () => phaseBlend,
        boss,
        teleport,
        jump,
        dash,
        switchPhase,
        tick,
        interact,
        finishDialog,
        end,
        support,
        contains,
        enterStage,
        start,
        hero,
        models,
        scene,
        renderer,
        camera,
        phase: () => phase,
        state: () => ({ started, paused, respawnTimer, phaseCooldown, currentStage }),
        resume: () => {
          if (workshop.active) closeWorkshop();
          endScene();
          started = true;
          paused = false;
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
          fxUpdate(dt);
          juiceUpdate(dt);
          cageVisual(dt);
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
