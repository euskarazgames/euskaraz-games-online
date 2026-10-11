/* ==================================================================
   EUSKARAZ GAMES · EGFX — grafiko modulu partekatua (three.js r128)
   ------------------------------------------------------------------
   · CC0 testurak (Poly Haven / ambientCG): kolorea + normal + zimurtasuna
   · Zeruak (equirect) eta ingurune-argia (PMREM / IBL)
   · Testura bakoitza behin bakarrik igotzen da GPUra: errepikapena
     (repeat) materialaren shaderrean egiten da, ez testura klonatuz.
   · Huts egiten badu (sarerik ez, ?gfx=0), jokoak bere testura
     prozeduralekin jarraitzen du.
   Kredituak: /assets/CREDITS.md
   ================================================================== */
(function () {
  'use strict';
  var script = document.currentScript;
  var BASE = '/assets/';
  try { BASE = new URL('.', (script && script.src) || location.href).href; } catch (e) {}
  var OFF = false;
  try {
    var q = new URLSearchParams(location.search);
    OFF = q.get('gfx') === '0' || localStorage.getItem('eg_gfx') === '0';
  } catch (e) {}

  /* n: normal maparen indarra · r: zimurtasun mapa · m: makro aldaketa (errepikapena ezkutatzeko) */
  var LIB = {
    grass:    { n: 0.85, r: 1, m: 1 },
    forest:   { n: 1.0,  r: 1, m: 1 },
    dirt:     { n: 1.0,  r: 1, m: 1 },
    concrete: { n: 0.7,  r: 1, m: 1 },
    wall:     { n: 0.55, r: 1, m: 0 },
    plaster:  { n: 0.8,  r: 0, m: 0 },
    wood:     { n: 0.9,  r: 0, m: 0 },
    planks:   { n: 1.0,  r: 1, m: 0 },
    stone:    { n: 1.1,  r: 0, m: 0 },
    rock:     { n: 1.15, r: 1, m: 1 },
    roof:     { n: 1.0,  r: 0, m: 0 },
    metal:    { n: 0.9,  r: 1, m: 0 },
    rust:     { n: 0.8,  r: 1, m: 0 },
    corrugated: { n: 1.0, r: 1, m: 0 },
    bark:     { n: 1.2,  r: 1, m: 0 },
    snow:     { n: 0.8,  r: 0, m: 1 },
    sand:     { n: 0.9,  r: 0, m: 1 }
  };

  var imgs = {};      // 'grass_c' → HTMLImageElement
  var texCache = {};  // 'grass_c' → THREE.Texture
  var lum = {};       // 'grass' → batez besteko argitasun lineala (makro aldaketarako)
  var lumS = {};      // 'grass' → batez besteko argitasuna sRGB balioetan
  var waters = [];
  var renderer = null;
  var maxAniso = 4;

  function load(id, url) {
    if (imgs[id]) return Promise.resolve(imgs[id]);
    return new Promise(function (res) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { imgs[id] = img; res(img); };
      img.onerror = function () { res(null); };
      img.src = url;
    });
  }

  function srgbOut() {
    return !!(renderer && THREE.sRGBEncoding !== undefined && renderer.outputEncoding === THREE.sRGBEncoding);
  }

  function avgLum(img) {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 8;
      var g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8);
      var d = g.getImageData(0, 0, 8, 8).data, s = 0, s2 = 0;
      for (var i = 0; i < d.length; i += 4) {
        var y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
        s += Math.pow(y, 2.2); s2 += y;
      }
      return [Math.max(0.02, s / 64), Math.max(0.05, s2 / 64)];
    } catch (e) { return [0.2, 0.45]; }
  }

  var EGFX = {
    version: 1,
    base: BASE,
    enabled: !OFF,
    ready: false,
    envDefault: 1,      /* ingurune-argiaren indarra materialetan (jokoak doitu dezake) */

    /* Testurak eta zeruak aurrez kargatu. Beti ebazten da (timeout barne). */
    preload: function (texKeys, skyKeys, timeoutMs) {
      if (OFF) return Promise.resolve(false);
      var jobs = [];
      (texKeys || []).forEach(function (k) {
        if (k === 'water') { jobs.push(load('water_n', BASE + 'tex/water_n.jpg')); return; }
        var L = LIB[k] || {};
        jobs.push(load(k + '_c', BASE + 'tex/' + k + '_c.jpg').then(function (img) {
          if (img) { var a = avgLum(img); lum[k] = a[0]; lumS[k] = a[1]; }
        }));
        jobs.push(load(k + '_n', BASE + 'tex/' + k + '_n.jpg'));
        if (L.r) jobs.push(load(k + '_r', BASE + 'tex/' + k + '_r.jpg'));
      });
      (skyKeys || []).forEach(function (s) { jobs.push(load('sky_' + s, BASE + 'sky/' + s + '.jpg')); });
      var all = Promise.all(jobs).then(function () { EGFX.ready = true; return true; });
      var timer = new Promise(function (res) { setTimeout(function () { EGFX.ready = true; res(false); }, timeoutMs || 6000); });
      return Promise.race([all, timer]);
    },

    has: function (key) { return !OFF && !!imgs[key + '_c']; },
    hasSky: function (name) { return !OFF && !!imgs['sky_' + name]; },

    /* Arazketarako: jokoaren eszena gorde (EGFX.scene / EGFX.camera). */
    track: function (scene, r, camera) { EGFX.scene = scene; EGFX.camera = camera; if (r) renderer = r; },

    /* Renderizatzailea erregistratu (anisotropia eta kolore kudeaketa). */
    setRenderer: function (r) {
      renderer = r;
      try { maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy() || 4); } catch (e) {}
      return r;
    },

    texture: function (id, srgb) {
      if (texCache[id]) return texCache[id];
      var img = imgs[id];
      if (!img) return null;
      var t = new THREE.Texture(img);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = maxAniso;
      /* Kolore-testurak jokoaren irteerarekin bat: sRGB irteera → sRGB testura; bestela lineala
         (horrela argazkia beti bere koloreekin ikusten da). */
      if (srgb && srgbOut()) t.encoding = THREE.sRGBEncoding;
      t.needsUpdate = true;
      texCache[id] = t;
      return t;
    },

    /* Lehendik dagoen MeshStandardMaterial bati testura errealak jarri. */
    apply: function (mat, key, o) {
      o = o || {};
      if (!mat || !EGFX.has(key)) return mat;
      var L = LIB[key] || {};
      mat.map = EGFX.texture(key + '_c', true);
      var n = EGFX.texture(key + '_n', false);
      if (n) {
        mat.normalMap = n;
        var ns = (o.normal === undefined ? 1 : o.normal) * (L.n || 1);
        mat.normalScale = new THREE.Vector2(ns, ns);
      }
      if (L.r && o.roughMap !== false) mat.roughnessMap = EGFX.texture(key + '_r', false);
      if (o.roughness !== undefined) mat.roughness = o.roughness;
      if (o.metalness !== undefined) mat.metalness = o.metalness;
      if (o.color !== undefined) mat.color.set(o.color);
      /* match: testurak batez beste kolore originala eman dezan (eszenaren argitasuna gorde) */
      if (o.match) mat.color.multiplyScalar(Math.min(3.2, 1 / ((srgbOut() ? lum[key] : lumS[key]) || 0.5)));
      mat.envMapIntensity = o.envMapIntensity !== undefined ? o.envMapIntensity : EGFX.envDefault;
      var rep = o.repeat || [1, 1];
      mat.userData.egRepeat = new THREE.Vector2(rep[0], rep[1] === undefined ? rep[0] : rep[1]);
      mat.userData.egMacro = (o.macro === undefined ? !!L.m : o.macro) ? 1 : 0;
      mat.userData.egLum = lum[key] || 0.2;
      mat.onBeforeCompile = egCompile;
      mat.customProgramCacheKey = egKey;
      mat.needsUpdate = true;
      return mat;
    },

    /* MeshStandardMaterial berria testura errealekin (edo null ez badago). */
    material: function (key, o) {
      if (!EGFX.has(key)) return null;
      o = o || {};
      var m = new THREE.MeshStandardMaterial({
        color: o.color === undefined ? 0xffffff : o.color,
        roughness: o.roughness === undefined ? 0.9 : o.roughness,
        metalness: o.metalness === undefined ? 0.02 : o.metalness
      });
      if (o.side !== undefined) m.side = o.side;
      if (o.flatShading) m.flatShading = true;
      return EGFX.apply(m, key, o);
    },

    /* Zeru kupula: toneMapped:false, argazkia den bezala ikusteko. */
    skyMaterial: function (name, o) {
      o = o || {};
      var t = EGFX.texture('sky_' + name, true);
      if (!t) return null;
      return new THREE.MeshBasicMaterial({
        map: t, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
        color: o.tint === undefined ? 0xffffff : o.tint
      });
    },

    /* Zeru mesh bat (lehengo zeru-esfera ordezkatzeko). */
    skyMesh: function (name, radius, o) {
      var mat = EGFX.skyMaterial(name, o);
      if (!mat) return null;
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius || 900, 48, 24), mat);
      mesh.renderOrder = -10;
      mesh.frustumCulled = false;
      if (o && o.yaw) mesh.rotation.y = o.yaw;
      return mesh;
    },

    /* Horizontearen kolorea (lainoa zeruarekin bat etortzeko), kolore lineala. */
    horizon: function (name, at) {
      var img = imgs['sky_' + name];
      var col = new THREE.Color(0x888888);
      if (!img) return col;
      try {
        var c = document.createElement('canvas'); c.width = 64; c.height = 32;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 32);
        var row = Math.round(31 * (at === undefined ? 0.47 : at));
        var d = g.getImageData(0, row, 64, 1).data, r = 0, gg = 0, b = 0;
        for (var i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        col.setRGB(r / 64 / 255, gg / 64 / 255, b / 64 / 255);
        if (srgbOut() && col.convertSRGBToLinear) col.convertSRGBToLinear();
      } catch (e) {}
      return col;
    },

    /* Ingurune-argia (IBL) zeruaren argazkitik. */
    environment: function (r, scene, name) {
      var t = EGFX.texture('sky_' + name, true);
      if (!t || !THREE.PMREMGenerator) return null;
      try {
        var pm = new THREE.PMREMGenerator(r);
        var src = t.clone();
        src.mapping = THREE.EquirectangularReflectionMapping;
        src.needsUpdate = true;
        var env = pm.fromEquirectangular(src).texture;
        pm.dispose();
        src.dispose();
        scene.environment = env;
        return env;
      } catch (e) { return null; }
    },

    /* Zeru-multzoa: kupula + ingurune-argia, eta zerua aldatzeko set(izena).
       Itzultzen du { mesh, set(name) → horizontearen kolorea, name }. */
    skyRig: function (r, scene, name, radius, o) {
      o = o || {};
      var mesh = EGFX.skyMesh(name, radius, o);
      if (!mesh) return null;
      scene.add(mesh);
      var envs = {};
      var rig = {
        mesh: mesh, name: null,
        set: function (n) {
          if (!EGFX.hasSky(n)) return null;
          if (rig.name !== n) {
            mesh.material.map = EGFX.texture('sky_' + n, true);
            mesh.material.needsUpdate = true;
            if (!envs[n]) envs[n] = EGFX.environment(r, scene, n);
            scene.environment = envs[n];
            rig.name = n;
          }
          return EGFX.horizon(n);
        }
      };
      rig.set(name);
      return rig;
    },

    /* Lur zabala (mendietaraino): testura errealarekin, itzalik gabe. */
    ground: function (key, size, o) {
      o = o || {};
      var mat = EGFX.material(key, { color: o.color, roughness: 1, repeat: [size / (o.tile || 4.5)], envMapIntensity: o.envMapIntensity });
      if (!mat) return null;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = o.y === undefined ? -0.08 : o.y;
      m.receiveShadow = !!o.shadow;
      return m;
    },

    /* Mendi-eraztuna (kono zaharren ordez): zarata fraktala, mendilerro leunak,
       kolorea altueraren arabera (belardia → basoa → harkaitza → elurra). */
    mountains: function (o) {
      o = o || {};
      var inner = o.inner || 300, outer = o.outer || 640, H = o.height || 120;
      var SA = o.segA || 220, SR = o.segR || 26, seed = o.seed || 7;
      var snow = o.snow === undefined ? 0.86 : o.snow;
      var hash = function (x, y) {
        var h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
        return h - Math.floor(h);
      };
      var noise = function (x, y, px) { /* balio-zarata, x norabidean periodikoa (px) */
        var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        var x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
        var a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      var ridged = function (ax, ry) {
        var s = 0, amp = 0.55, f = 1, norm = 0;
        for (var k = 0; k < 5; k++) {
          var n = 1 - Math.abs(noise(ax * f, ry * f, 8 * f) * 2 - 1);
          s += n * n * amp; norm += amp; amp *= 0.5; f *= 2;
        }
        return s / norm;
      };
      var cols = { low: new THREE.Color(o.low || 0x6f8f4e), mid: new THREE.Color(o.mid || 0x3f5f36),
        rock: new THREE.Color(o.rock || 0x8b8579), snowC: new THREE.Color(o.snowColor || 0xf2f4f6) };
      var N = (SA + 1) * (SR + 1);
      var pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), col = new Float32Array(N * 3);
      var hs = new Float32Array(N), i = 0, c = new THREE.Color();
      for (var ri = 0; ri <= SR; ri++) {
        var t = ri / SR, rad = inner + (outer - inner) * t;
        var env = Math.min(1, t / 0.42); env = env * env * (3 - 2 * env);
        env *= 1 - 0.55 * Math.max(0, (t - 0.8) / 0.2);
        for (var ai = 0; ai <= SA; ai++) {
          var a = ai / SA * Math.PI * 2;
          var h = ridged(ai / SA * 8, t * 3.1) * env;
          h = Math.pow(h, 1.35) * H * (0.65 + 0.7 * noise(ai / SA * 4, 1.7, 4));
          pos[i * 3] = Math.cos(a) * rad; pos[i * 3 + 1] = h - 2; pos[i * 3 + 2] = Math.sin(a) * rad;
          uv[i * 2] = ai / SA * 48; uv[i * 2 + 1] = t * 6;
          hs[i] = h; i++;
        }
      }
      var idx = [];
      for (ri = 0; ri < SR; ri++) for (ai = 0; ai < SA; ai++) {
        var p0 = ri * (SA + 1) + ai, p1 = p0 + 1, p2 = p0 + SA + 1, p3 = p2 + 1;
        idx.push(p0, p2, p1, p1, p2, p3);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      var nrm = g.attributes.normal.array;
      for (i = 0; i < N; i++) {
        var hn = hs[i] / H, slope = 1 - nrm[i * 3 + 1];
        var j = hash(i * 0.37, 3.1) * 0.12;
        if (hn < 0.22) c.copy(cols.low).lerp(cols.mid, hn / 0.22);
        else c.copy(cols.mid).lerp(cols.rock, Math.min(1, (hn - 0.22) / 0.4 + slope * 0.9));
        if (snow < 1 && hn > snow - j) c.lerp(cols.snowC, Math.min(1, (hn - snow + j) / 0.06) * (1 - slope * 0.6));
        col[i * 3] = c.r * (0.94 + j); col[i * 3 + 1] = c.g * (0.94 + j); col[i * 3 + 2] = c.b * (0.94 + j);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: !!o.flat });
      if (EGFX.has('rock')) {
        EGFX.apply(mat, 'rock', { repeat: [1, 1], normal: 0.7, macro: false, color: 0xffffff });
        if (o.albedo === false) mat.map = null; /* kolorea erpinetatik bakarrik; harkaitzaren erliebea normal mapatik */
      }
      mat.envMapIntensity = o.envMapIntensity === undefined ? 0.6 : o.envMapIntensity;
      var mesh = new THREE.Mesh(g, mat);
      mesh.receiveShadow = false; mesh.castShadow = false;
      return mesh;
    },

    /* Itsasoa / ura: bi normal-geruza mugitzen, islapen handiarekin. */
    water: function (o) {
      o = o || {};
      if (OFF || !imgs.water_n) return null;
      var n = EGFX.texture('water_n', false);
      var m = new THREE.MeshStandardMaterial({
        color: o.color === undefined ? 0x0d2c3a : o.color,
        roughness: o.roughness === undefined ? 0.12 : o.roughness,
        metalness: o.metalness === undefined ? 0.0 : o.metalness,
        transparent: !!o.opacity, opacity: o.opacity || 1
      });
      m.normalMap = n;
      var ns = o.normal === undefined ? 0.55 : o.normal;
      m.normalScale = new THREE.Vector2(ns, ns);
      m.envMapIntensity = o.envMapIntensity === undefined ? 1.25 : o.envMapIntensity;
      var rep = o.repeat || [8, 8];
      m.userData.egRepeat = new THREE.Vector2(rep[0], rep[1] === undefined ? rep[0] : rep[1]);
      m.userData.egMacro = 0;
      m.userData.egLum = 0.2;
      m.userData.egWater = { a: new THREE.Vector2(), b: new THREE.Vector2(), speed: o.speed || 1 };
      m.onBeforeCompile = egCompile;
      m.customProgramCacheKey = egKey;
      waters.push(m);
      return m;
    },

    /* Animazioak (ura). Jokoaren begiztan deitu: EGFX.update(dt). */
    update: function (dt) {
      for (var i = 0; i < waters.length; i++) {
        var w = waters[i].userData.egWater;
        w.a.x += dt * 0.012 * w.speed; w.a.y += dt * 0.007 * w.speed;
        w.b.x -= dt * 0.008 * w.speed; w.b.y += dt * 0.011 * w.speed;
      }
    }
  };

  /* Shader aldaketa partekatua: funtzio bera → programa bera material guztientzat. */
  function egCompile(shader) {
    var u = this.userData;
    shader.uniforms.egRepeat = { value: u.egRepeat || new THREE.Vector2(1, 1) };
    shader.uniforms.egLum = { value: u.egLum || 0.2 };
    var water = u.egWater;
    if (water) {
      shader.uniforms.egFlowA = { value: water.a };
      shader.uniforms.egFlowB = { value: water.b };
    }
    shader.vertexShader = 'uniform vec2 egRepeat;\n' + shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#ifdef USE_UV\n\tvUv = ( uvTransform * vec3( uv * egRepeat, 1 ) ).xy;\n#endif');
    var head = 'uniform float egLum;\n';
    if (u.egMacro) {
      head += '#define EG_MACRO\n';
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', [
        '#ifdef USE_MAP',
        '\tvec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );',
        '\tvec3 egM = mapTexelToLinear( texture2D( map, vUv * 0.1173 + vec2( 0.37, 0.71 ) ) ).rgb;',
        '\tvec3 egM2 = mapTexelToLinear( texture2D( map, vUv.yx * 0.0291 + vec2( 0.13, 0.52 ) ) ).rgb;',
        '\tfloat egV = dot( egM * 0.6 + egM2 * 0.4, vec3( 0.299, 0.587, 0.114 ) ) / egLum;',
        '\ttexelColor.rgb *= clamp( mix( 1.0, egV, 0.42 ), 0.72, 1.3 );',
        '\tdiffuseColor *= texelColor;',
        '#endif'].join('\n'));
    }
    if (water) {
      head += 'uniform vec2 egFlowA;\nuniform vec2 egFlowB;\n';
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
        'vec3 mapN = texture2D( normalMap, vUv + egFlowA ).xyz * 2.0 - 1.0;\n' +
        '\tvec3 mapN2 = texture2D( normalMap, vUv * 1.618 + egFlowB ).xyz * 2.0 - 1.0;\n' +
        '\tmapN = normalize( vec3( mapN.xy + mapN2.xy, mapN.z * mapN2.z ) );');
    }
    shader.fragmentShader = head + shader.fragmentShader;
  }
  function egKey() {
    var u = this.userData;
    return 'egfx1' + (u.egMacro ? 'm' : '') + (u.egWater ? 'w' : '');
  }

  window.EGFX = EGFX;
})();
