  /* ==================================================================
     AHOTSAK · pertsonaien ahotsak (sintetikoak; ikus tools/leizeak/ahotsak/)
     Lerroen testua lerroak.json-etik dator (build-ean txertatua): azpitituluak beti daude.
     Audioa /assets/voice/leizeak/<id>.mp3 da, behar denean kargatua; ez badago (lineaz kanpo,
     fitxategirik gabe…), testua bakarrik. Web Audio iragazkiak pertsonaiaren arabera:
     IRATI oihartzun-harritik (banda estua eta oihartzuna), GAUEKO ilunpetik (baxuagoa, motelago,
     erreberberazio luzea), AMAIUR hurbil eta lehor. Hitz egiten den bitartean musika jaisten da.
     ================================================================== */
  const VOICE_LINES = /* @json ../ahotsak/lerroak.json */;
  const VOICE = { base: "/assets/voice/leizeak/", buf: new Map(), wait: new Map(), cur: null, an: null, data: null, chains: {}, level: 0 };
  const voiceLine = (id) => VOICE_LINES[id] || ["", ""];
  function voiceLoad(id) {
    if (VOICE.buf.has(id)) return Promise.resolve(VOICE.buf.get(id));
    if (VOICE.wait.has(id)) return VOICE.wait.get(id);
    const ctx = SND.ctx;
    if (!ctx || !VOICE_LINES[id]) return Promise.resolve(null);
    const inl = window.LEIZEAK_VOICES,
      url = inl && inl[id] ? inl[id] : VOICE.base + id + ".mp3";
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? new Promise((res) => ctx.decodeAudioData(ab, res, () => res(null))) : null))
      .catch(() => null)
      .then((b) => {
        VOICE.buf.set(id, b);
        VOICE.wait.delete(id);
        return b;
      });
    VOICE.wait.set(id, p);
    return p;
  }
  function voicePreload(ids) {
    for (const id of ids) if (id) voiceLoad(id);
  }
  /* kargatuta dago (edo ez dago eta ez da egongo)? */
  const voiceReady = (id) => VOICE.buf.has(id) || !SND.ctx;
  /* pertsonaia bakoitzaren katea (behin sortua) → analizatzailea → bus nagusia */
  function voiceChain(who) {
    const k = who.startsWith("IRATI") ? "irati" : who.startsWith("GAUEKO") || who.startsWith("INGUMA") ? "gaueko" : "dry";
    if (VOICE.chains[k]) return VOICE.chains[k];
    const ctx = SND.ctx,
      N = SND.voiceNodes();
    if (!VOICE.an) {
      VOICE.an = ctx.createAnalyser();
      VOICE.an.fftSize = 1024;
      VOICE.data = new Uint8Array(VOICE.an.fftSize);
      VOICE.an.connect(N.master);
    }
    const input = ctx.createGain(),
      send = ctx.createGain();
    send.connect(N.verbIn);
    if (k === "irati") {
      /* oihartzun-harria: behe eta goi muturrak kenduta, presentzia, atzerapen leuna */
      const hp = ctx.createBiquadFilter(),
        pk = ctx.createBiquadFilter(),
        lp = ctx.createBiquadFilter(),
        dl = ctx.createDelay(1),
        fb = ctx.createGain(),
        wet = ctx.createGain();
      hp.type = "highpass";
      hp.frequency.value = 240;
      pk.type = "peaking";
      pk.frequency.value = 2300;
      pk.gain.value = 4;
      lp.type = "lowpass";
      lp.frequency.value = 6200;
      dl.delayTime.value = 0.17;
      fb.gain.value = 0.28;
      wet.gain.value = 0.32;
      input.connect(hp).connect(pk).connect(lp);
      lp.connect(VOICE.an);
      lp.connect(dl);
      dl.connect(fb).connect(dl);
      dl.connect(wet).connect(VOICE.an);
      send.gain.value = 0.3;
      lp.connect(send);
    } else if (k === "gaueko") {
      /* ilunpetik: baxuak indartuta, distortsio leuna eta erreberberazio handia */
      const ls = ctx.createBiquadFilter(),
        ws = ctx.createWaveShaper(),
        lp = ctx.createBiquadFilter();
      ls.type = "lowshelf";
      ls.frequency.value = 200;
      ls.gain.value = 6;
      const c = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const x = (i / 511) * 2 - 1;
        c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
      }
      ws.curve = c;
      lp.type = "lowpass";
      lp.frequency.value = 5200;
      input.connect(ls).connect(ws).connect(lp);
      lp.connect(VOICE.an);
      send.gain.value = 0.75;
      lp.connect(send);
    } else {
      input.connect(VOICE.an);
      send.gain.value = 0.1;
      input.connect(send);
    }
    return (VOICE.chains[k] = { input, rate: k === "gaueko" ? 0.92 : 1 });
  }
  /* jo: iraupena (s) itzultzen du; 0 audiorik ez badago */
  function voicePlay(id) {
    voiceStop();
    const b = VOICE.buf.get(id),
      ctx = SND.ctx;
    if (!b || !ctx || muted) return 0;
    const C = voiceChain(voiceLine(id)[0]),
      src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = C.rate;
    src.connect(C.input);
    src.start();
    const dur = b.duration / C.rate;
    VOICE.cur = { src, id, t0: ctx.currentTime, dur };
    src.onended = () => {
      if (VOICE.cur && VOICE.cur.src === src) {
        VOICE.cur = null;
        SND.duck(false);
      }
    };
    SND.duck(true);
    return dur;
  }
  function voiceStop() {
    if (!VOICE.cur) return;
    try {
      VOICE.cur.src.stop();
    } catch {}
    VOICE.cur = null;
    SND.duck(false);
  }
  const voicePlaying = () => !!VOICE.cur;
  /* ahotsaren maila (0..1): ahoaren animazioa eta uhin-marrazkia */
  function voiceLevel() {
    if (!VOICE.cur || !VOICE.an) return (VOICE.level = mix(VOICE.level, 0, 0.3));
    VOICE.an.getByteTimeDomainData(VOICE.data);
    let s = 0;
    for (let i = 0; i < VOICE.data.length; i += 4) {
      const v = (VOICE.data[i] - 128) / 128;
      s += v * v;
    }
    return (VOICE.level = mix(VOICE.level, clamp(Math.sqrt(s / (VOICE.data.length / 4)) * 5, 0, 1), 0.5));
  }
