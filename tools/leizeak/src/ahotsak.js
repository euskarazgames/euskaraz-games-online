  /* ==================================================================
     AHOTSAK · pertsonaien ahotsak (sintetikoak; ikus tools/leizeak/ahotsak/)
     Lerroen testua lerroak.json-etik dator (build-ean txertatua): azpitituluak beti daude.
     Audioa /assets/voice/leizeak/<id>.mp3 da, behar denean kargatua; ez badago (lineaz kanpo,
     fitxategirik gabe…), testua bakarrik. Web Audio iragazkiak pertsonaiaren arabera:
     IRATI oihartzun-harritik (banda estua eta oihartzun leuna), GAUEKO ilunpetik (fitxategian bertan
     oktaba bat beherako geruza eta eten luzeak; hemen presentzia, oihartzun laburra eta erreberberazioa,
     distortsiorik eta abiadura-aldaketarik gabe: argi entzun behar da), INGUMA ametsetik (ahots
     dardaratsua, modulatutako atzerapena), AMAIUR hurbil eta lehor. Hitz egitean musika jaisten da.
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
    const k = who.startsWith("INGUMA") || who === "IRATI?" ? "inguma" : who.startsWith("IRATI") ? "irati" : who.startsWith("GAUEKO") ? "gaueko" : "dry";
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
      hp.frequency.value = 180;
      pk.type = "peaking";
      pk.frequency.value = 2300;
      pk.gain.value = 3;
      lp.type = "lowpass";
      lp.frequency.value = 7200;
      dl.delayTime.value = 0.17;
      fb.gain.value = 0.2;
      wet.gain.value = 0.2;
      input.connect(hp).connect(pk).connect(lp);
      lp.connect(VOICE.an);
      lp.connect(dl);
      dl.connect(fb).connect(dl);
      dl.connect(wet).connect(VOICE.an);
      send.gain.value = 0.3;
      lp.connect(send);
    } else if (k === "gaueko") {
      /* ilunpetik, baina argi: baxu leunak, presentzia (kontsonanteak), oihartzun labur bat eta
         erreberberazio neurritsua. Sakontasuna fitxategian dago (oktaba beherako geruza). */
      const hp = ctx.createBiquadFilter(),
        ls = ctx.createBiquadFilter(),
        pk = ctx.createBiquadFilter(),
        lp = ctx.createBiquadFilter(),
        dl = ctx.createDelay(1),
        wet = ctx.createGain();
      hp.type = "highpass";
      hp.frequency.value = 55;
      ls.type = "lowshelf";
      ls.frequency.value = 160;
      ls.gain.value = 2;
      pk.type = "peaking";
      pk.frequency.value = 2600;
      pk.Q.value = 1;
      pk.gain.value = 3;
      lp.type = "lowpass";
      lp.frequency.value = 9500;
      dl.delayTime.value = 0.095;
      wet.gain.value = 0.14;
      input.connect(hp).connect(ls).connect(pk).connect(lp);
      lp.connect(VOICE.an);
      lp.connect(dl).connect(wet).connect(VOICE.an);
      send.gain.value = 0.35;
      lp.connect(send);
    } else if (k === "inguma") {
      /* ametsetik: ahotsa dardaraka (atzerapen modulatua) eta erreberberazio luzea */
      const hp = ctx.createBiquadFilter(),
        dl = ctx.createDelay(0.1),
        lfo = ctx.createOscillator(),
        depth = ctx.createGain(),
        wet = ctx.createGain();
      hp.type = "highpass";
      hp.frequency.value = 140;
      dl.delayTime.value = 0.012;
      lfo.frequency.value = 0.7;
      depth.gain.value = 0.004;
      lfo.connect(depth).connect(dl.delayTime);
      lfo.start();
      wet.gain.value = 0.55;
      input.connect(hp);
      hp.connect(VOICE.an);
      hp.connect(dl).connect(wet).connect(VOICE.an);
      send.gain.value = 0.6;
      hp.connect(send);
    } else {
      input.connect(VOICE.an);
      send.gain.value = 0.1;
      input.connect(send);
    }
    return (VOICE.chains[k] = { input, rate: 1, deep: k === "gaueko" });
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
    /* Gauekoren ahots baxua musikaren baxuarekin lehiatzen da: musika gehiago jaitsi */
    SND.duck(true, C.deep ? 0.07 : 0.15);
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
