    /* ==================================================================
       MUSIKA · banda epikoa (Hades estiloko rock mediterraneoa), sintesi hutsa
       132 BPM · Re minor harmonikoa, frigiar kutsuarekin (Eb, C#).
       Tresnak: bateria, baxua, gitarra distortsionatua (power chord, galoia),
       bouzouki-a (Karplus-Strong soka benetakoak, tremoloarekin), hari-pad-a,
       koroa ("aa" formanteak) eta taikoak.
       Intentsitate-mailak: 0 izenburua/zinematika · 1 esplorazioa · 2 borroka · 3 bossa.
       Geruza bakoitzak bere gain-a du: mailak aldatzean geruzak sartu/atera egiten
       dira erritmo-sare berean, eten gabe (Hades-en "stem" sistema bezala).
       ================================================================== */
    const MZ = { step: 60 / 132 / 4, next: 0, n: 0, level: -1, L: null, ks: new Map(), off: {}, eraOn: -1 };
    const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
    /* akordeak: r = erroa (gitarra), pad = hariak/koroa, arp = arpegioaren notak */
    const CH = {
      Dm: { r: 50, pad: [62, 65, 69, 74], arp: [50, 57, 62, 65, 69, 74, 77] },
      Bb: { r: 46, pad: [58, 62, 65, 70], arp: [46, 53, 58, 62, 65, 70, 74] },
      C: { r: 48, pad: [60, 64, 67, 72], arp: [48, 55, 60, 64, 67, 72, 76] },
      A: { r: 45, pad: [57, 61, 64, 69], arp: [45, 52, 57, 61, 64, 69, 73] },
      Gm: { r: 43, pad: [55, 58, 62, 67], arp: [43, 50, 55, 58, 62, 67, 70] },
      Eb: { r: 51, pad: [58, 63, 67, 70], arp: [51, 58, 63, 67, 70, 75, 79] },
    };
    /* forma: A A B A' (32 taktu) — i–VI–VII–V eta iv–i–♭II–V (frigiarra) */
    const FORM = [
      ["Dm", "Bb", "C", "A"],
      ["Dm", "Bb", "C", "A"],
      ["Gm", "Dm", "Eb", "A"],
      ["Dm", "Bb", "C", "A"],
    ];
    /* bouzouki-melodia: [hasiera, iraupena (hamaseirenak), MIDI, tremoloa] */
    const MEL_A = [
      [[0, 4, 69], [4, 2, 74], [6, 2, 76], [8, 4, 77], [12, 2, 76], [14, 2, 74]],
      [[0, 4, 77], [4, 2, 76], [6, 2, 74], [8, 8, 70, 1]],
      [[0, 4, 72], [4, 2, 74], [6, 2, 76], [8, 4, 79], [12, 2, 77], [14, 2, 76]],
      [[0, 6, 76], [6, 2, 74], [8, 4, 73], [12, 4, 69, 1]],
    ];
    const MEL_B = [
      [[0, 4, 79], [4, 2, 77], [6, 2, 74], [8, 4, 70], [12, 4, 74]],
      [[0, 8, 81, 1], [8, 4, 77], [12, 4, 74]],
      [[0, 4, 79], [4, 4, 75], [8, 4, 70], [12, 4, 67]],
      [[0, 2, 69], [2, 2, 73], [4, 2, 76], [6, 2, 79], [8, 8, 81, 1]],
    ];
    /* gitarra: 1 = isilarazitako kolpea (palm mute), 2 = akorde irekia */
    const RIFF = [
      [2, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 2, 0, 1, 1],
      [2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 2, 1, 1, 1],
    ];
    const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0];
    const KICK3 = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1];
    const ARP = [0, 2, 3, 4, 5, 4, 3, 2];
    /* LEIZEEN DEIA: txalaparta-geruza (haranean) — "tok-tok, tak-tak, tok-tok, ta-ka-tak" */
    const TXP = [1, 0, 1, 0, 2, 0, 2, 0, 1, 0, 1, 0, 2, 2, 2, 0];
    const MIX = {
      txala: [0.35, 0.62, 0.42, 0.32],
      pad: [0.55, 0.5, 0.3, 0.26],
      arp: [0.55, 0.85, 0, 0],
      frame: [0, 0.62, 0, 0],
      bass: [0, 0.42, 0.55, 0.55],
      drums: [0, 0, 0.62, 0.62],
      gtr: [0, 0, 0.26, 0.24],
      lead: [0, 0, 1.05, 0.95],
      solo: [0, 0, 0, 0.18],
      choir: [0, 0, 0, 0.36],
      taiko: [0, 0, 0, 0.45],
    };
    function shaper(k) {
      const n = 2048,
        c = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        c[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      return c;
    }
    /* gitarra-katea: distortsioa → kabina (iragazkiak) */
    function ampChain(drive, out, tone = 4600) {
      const inp = ctx.createGain(),
        ws = ctx.createWaveShaper(),
        hp = ctx.createBiquadFilter(),
        pk = ctx.createBiquadFilter(),
        lp = ctx.createBiquadFilter();
      ws.curve = shaper(drive);
      ws.oversample = "2x";
      hp.type = "highpass";
      hp.frequency.value = 110;
      pk.type = "peaking";
      pk.frequency.value = 1700;
      pk.Q.value = 0.9;
      pk.gain.value = 5;
      lp.type = "lowpass";
      lp.frequency.value = tone;
      lp.Q.value = 0.8;
      inp.connect(ws);
      ws.connect(hp);
      hp.connect(pk);
      pk.connect(lp);
      lp.connect(out);
      return inp;
    }
    function mzBuild() {
      MZ.era = ctx.createBiquadFilter();
      MZ.era.type = "lowpass";
      MZ.era.frequency.value = 16000;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 38;
      MZ.era.connect(hp);
      hp.connect(mus);
      const drumBus = bus(0.5, 0.1);
      MZ.eraD = ctx.createBiquadFilter();
      MZ.eraD.type = "lowpass";
      MZ.eraD.frequency.value = 16000;
      const hpD = ctx.createBiquadFilter();
      hpD.type = "highpass";
      hpD.frequency.value = 38;
      MZ.eraD.connect(hpD);
      hpD.connect(drumBus);
      MZ.L = {};
      for (const k of Object.keys(MIX)) {
        const g = ctx.createGain();
        g.gain.value = 0;
        g.connect(k === "drums" || k === "taiko" || k === "gtr" ? MZ.eraD : MZ.era);
        MZ.L[k] = g;
      }
      MZ.gtrIn = ampChain(7, MZ.L.gtr);
      MZ.soloIn = ampChain(12, MZ.L.solo, 3200);
      MZ.stab = ctx.createGain();
      MZ.stab.gain.value = 0.9;
      MZ.stab.connect(MZ.eraD);
      MZ.stabGtr = ampChain(7, MZ.stab);
      MZ.next = ctx.currentTime + 0.1;
    }
    const layerOn = (k, t) => MIX[k][MZ.level] > 0 || t < (MZ.off[k] || 0);
    function mzLevel(lv, t) {
      const prev = MZ.level;
      MZ.level = lv;
      for (const k of Object.keys(MIX)) {
        const v = MIX[k][lv],
          was = prev >= 0 ? MIX[k][prev] : 0;
        MZ.L[k].gain.setTargetAtTime(v, t, v > was ? (lv >= 2 ? 0.08 : 0.5) : lv >= 2 ? 0.25 : 0.9);
        if (v === 0 && was > 0) MZ.off[k] = t + 4;
      }
      /* borrokan sartzean: zartada eta taldea bat-batean */
      if (lv >= 2 && prev < 2) {
        crash(t + 0.02, 1, MZ.stab);
        taiko(t + 0.02, 0.9, MZ.stab);
      }
    }
    /* Karplus-Strong: bi soka apur bat desafinatuak (bouzouki-aren soka bikoitzak) */
    function ksBuf(m) {
      let b = MZ.ks.get(m);
      if (b) return b;
      const sr = ctx.sampleRate,
        f = mf(m),
        dur = m < 55 ? 1.5 : m < 70 ? 1.15 : 0.9,
        n = Math.floor(sr * dur),
        out = new Float32Array(n);
      for (const det of [1, 1.0042]) {
        const D = sr / (f * det) - 0.5,
          N = Math.floor(D),
          fr = D - N,
          y = new Float32Array(n);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          if (i <= N + 1) {
            lp += 0.72 * (Math.random() * 2 - 1 - lp);
            y[i] = lp;
          } else y[i] = 0.9966 * 0.5 * ((1 - fr) * y[i - N] + y[i - N - 1] + fr * (i - N - 2 >= 0 ? y[i - N - 2] : 0));
          out[i] += y[i] * 0.5;
        }
      }
      /* DC-blokeatzailea: zarataren batezbestekoak ez dezala azpi-bajurik sortu */
      let px = 0,
        py = 0;
      for (let i = 0; i < n; i++) {
        const v = out[i] - px + 0.995 * py;
        px = out[i];
        out[i] = py = v;
      }
      for (let i = Math.floor(n * 0.85); i < n; i++) out[i] *= (n - i) / (n * 0.15);
      b = ctx.createBuffer(1, n, sr);
      b.getChannelData(0).set(out);
      MZ.ks.set(m, b);
      return b;
    }
    function ksPluck(m, t, v, out) {
      const s = ctx.createBufferSource(),
        g = ctx.createGain();
      s.buffer = ksBuf(m);
      s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.003;
      g.gain.value = v;
      s.connect(g);
      g.connect(out);
      s.start(t);
      s.stop(t + s.buffer.duration);
    }
    function leadNote(m, t, dur, trem) {
      if (!trem) return ksPluck(m, t, 0.95, MZ.L.lead);
      const k = Math.max(2, Math.round(dur / (MZ.step / 2)));
      for (let i = 0; i < k; i++) ksPluck(m, t + i * (MZ.step / 2), i === 0 ? 0.95 : 0.55 + 0.12 * Math.sin(i), MZ.L.lead);
    }
    function soloNote(m, t, dur) {
      const o = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        g = ctx.createGain(),
        lfo = ctx.createOscillator(),
        lg = ctx.createGain(),
        f = mf(m);
      o.type = "sawtooth";
      o2.type = "square";
      o.frequency.value = f;
      o2.frequency.value = f * 1.002;
      lfo.frequency.value = 5.6;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(14, t + Math.min(0.35, dur));
      lfo.connect(lg);
      lg.connect(o.detune);
      lg.connect(o2.detune);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.setValueAtTime(0.3, t + Math.max(0.02, dur - 0.08));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
      o.connect(g);
      o2.connect(g);
      g.connect(MZ.soloIn);
      for (const x of [o, o2, lfo]) {
        x.start(t);
        x.stop(t + dur + 0.15);
      }
    }
    function gtrChug(m, t, open, out = MZ.gtrIn, len) {
      const dur = len || (open ? MZ.step * 3.2 : MZ.step * 0.9),
        f = mf(m),
        g = ctx.createGain(),
        lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(open ? 5200 : 1500, t);
      lp.frequency.exponentialRampToValueAtTime(open ? 1500 : 480, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(open ? 0.5 : 0.42, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (const [k, d] of [[1, -8], [1.5, 6], [2, 0]]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f * k;
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
      lp.connect(g);
      g.connect(out);
    }
    function bassNote(m, t, dur) {
      const o = ctx.createOscillator(),
        o2 = ctx.createOscillator(),
        lp = ctx.createBiquadFilter(),
        g = ctx.createGain(),
        f = mf(m);
      o.type = "sawtooth";
      o2.type = "square";
      o.frequency.value = f;
      o2.frequency.value = f;
      o2.detune.value = 6;
      lp.type = "lowpass";
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(1500, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + Math.min(0.45, dur));
      env(g, t, 0.006, 0.5, dur);
      o.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(MZ.L.bass);
      for (const x of [o, o2]) {
        x.start(t);
        x.stop(t + dur + 0.05);
      }
    }
    function strings(notes, t, dur, out) {
      const o = ctx.createGain(),
        lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1300;
      o.gain.setValueAtTime(0.0001, t);
      o.gain.exponentialRampToValueAtTime(0.95, t + 0.45);
      o.gain.setValueAtTime(0.95, t + dur - 0.2);
      o.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
      lp.connect(o);
      o.connect(out);
      for (const m of notes)
        for (const d of [-7, 7]) {
          const x = ctx.createOscillator(),
            g = ctx.createGain();
          x.type = "sawtooth";
          x.frequency.value = mf(m);
          x.detune.value = d;
          g.gain.value = 0.3 / notes.length;
          x.connect(g);
          g.connect(lp);
          x.start(t);
          x.stop(t + dur + 0.6);
        }
    }
    /* koroa: zerra-uhinak "aa" bokalaren formanteetatik */
    function choir(notes, t, dur, out) {
      const o = ctx.createGain(),
        lfo = ctx.createOscillator(),
        lg = ctx.createGain();
      o.gain.setValueAtTime(0.0001, t);
      o.gain.exponentialRampToValueAtTime(0.6, t + 0.5);
      o.gain.setValueAtTime(0.6, t + dur - 0.2);
      o.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
      o.connect(out);
      lfo.frequency.value = 5.2;
      lg.gain.value = 9;
      lfo.connect(lg);
      const forms = [[730, 7, 1], [1090, 9, 0.55], [2440, 11, 0.3]].map(([f, q, a]) => {
        const b = ctx.createBiquadFilter(),
          g = ctx.createGain();
        b.type = "bandpass";
        b.frequency.value = f;
        b.Q.value = q;
        g.gain.value = a;
        b.connect(g);
        g.connect(o);
        return b;
      });
      for (const m of notes) {
        const x = ctx.createOscillator();
        x.type = "sawtooth";
        x.frequency.value = mf(m - 12);
        lg.connect(x.detune);
        for (const b of forms) x.connect(b);
        x.start(t);
        x.stop(t + dur + 0.7);
      }
      lfo.start(t);
      lfo.stop(t + dur + 0.7);
    }
    function kick(t, v = 1, out = MZ.L.drums) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.4);
      hiss(t, 0.022, 0.32 * v, "bandpass", 3600, 2600, 1.2, out);
    }
    function snare(t, v = 1, out = MZ.L.drums) {
      hiss(t, 0.21, 0.5 * v, "bandpass", 2300, 1500, 0.6, out);
      hiss(t, 0.12, 0.22 * v, "highpass", 5200, 4200, 0.7, out);
      tone("triangle", 205, t, 0.002, 0.09, 0.32 * v, out, 150);
    }
    function hat(t, v = 1, open = false, out = MZ.L.drums) {
      hiss(t, open ? 0.24 : 0.035, 0.15 * v, "highpass", 8200, 7200, 0.8, out);
    }
    function crash(t, v = 1, out = MZ.L.drums) {
      hiss(t, 1.7, 0.2 * v, "highpass", 5400, 3600, 0.5, out);
      hiss(t, 0.9, 0.1 * v, "bandpass", 9000, 6000, 0.8, out);
    }
    function tom(t, f, out = MZ.L.drums) {
      tone("sine", f, t, 0.002, 0.3, 0.55, out, f * 0.6);
      hiss(t, 0.05, 0.1, "bandpass", f * 4, f * 3, 1, out);
    }
    function taiko(t, v = 1, out = MZ.L.taiko) {
      tone("sine", 96, t, 0.003, 0.7, 0.85 * v, out, 46);
      hiss(t, 0.26, 0.28 * v, "lowpass", 900, 120, 0.8, out);
    }
    function frameDrum(t, v = 1) {
      tone("sine", 112, t, 0.004, 0.32, 0.45 * v, MZ.L.frame, 70);
      hiss(t, 0.08, 0.09 * v, "bandpass", 900, 500, 1, MZ.L.frame);
    }
    /* txalaparta-ohola: kolpe hutsa eta egurraren erresonantzia */
    function txTok(f, t, v) {
      tone("sine", f * 1.5, t, 0.001, 0.15, 0.2 * v, MZ.L.txala, f);
      tone("triangle", f * 3.02, t, 0.001, 0.06, 0.08 * v, MZ.L.txala, f * 2.4);
      hiss(t, 0.03, 0.11 * v, "bandpass", f * 7, f * 4, 3, MZ.L.txala);
    }
    function rim(t) {
      hiss(t, 0.03, 0.07, "bandpass", 3100, 2600, 3, MZ.L.frame);
    }
    /* hamaseiren bat: tresna bakoitzak bere eredua */
    function mzStep(t, n) {
      const s = n % 16,
        bar = Math.floor(n / 16),
        sec = Math.floor(bar / 4) % 4,
        bi = bar % 4,
        C = CH[FORM[sec][bi]],
        lv = MZ.level,
        B = sec === 2,
        on = (k) => layerOn(k, t);
      const cave = !ZONES[ZONE.cur].outdoor;
      /* txalaparta: haranean, bi jotzaileren elkarrizketa (leizean isilik) */
      if (on("txala") && !cave && !ZONES[ZONE.cur].sky && TXP[s] && (lv > 0 || bi % 2 === 0)) txTok(TXP[s] === 1 ? 196 : 233, t, s % 4 === 0 ? 1 : 0.72);
      /* leizea: tantak eta drone sakona esplorazioan */
      if (cave && lv <= 1) {
        if ((s === 6 || s === 13) && (n * 13) % 7 < 2) bell(mf(84 + ((n * 5) % 7)), t, 0.012, MZ.era);
        if (s === 0 && bi === 0) bassNote(C.r - 24, t, MZ.step * 60);
      }
      if (s === 0 && on("pad")) strings(C.pad, t, MZ.step * 16, MZ.L.pad);
      if (s === 0 && on("choir")) choir(C.pad, t, MZ.step * 16, MZ.L.choir);
      if (on("arp") && s % 2 === 0 && (lv !== 0 || s % 4 === 0) && (!cave || s % 4 === 0)) ksPluck(C.arp[ARP[(s / 2) % 8]] + 12, t, cave ? 0.26 : s % 4 ? 0.34 : 0.48, MZ.L.arp);
      if (on("frame") && !cave) {
        if (s === 0 || s === 8) frameDrum(t, s ? 0.75 : 1);
        if (s === 4 || s === 12) rim(t);
        if (s === 14 && bi === 3) frameDrum(t, 0.55);
      }
      const riff = RIFF[B ? 1 : 0][s];
      if (on("bass")) {
        if (lv >= 2) {
          if (riff) bassNote(C.r - 12, t, riff === 2 ? MZ.step * 2.5 : MZ.step * 0.9);
        } else if (s === 0) bassNote(C.r - 12, t, MZ.step * 11);
        else if (s === 12) bassNote(C.r - 5, t, MZ.step * 3);
      }
      if (on("gtr") && riff) gtrChug(C.r, t, riff === 2);
      if (on("drums")) {
        const K = lv >= 3 ? KICK3 : KICK;
        if (K[s]) kick(t, s === 0 ? 1 : 0.85);
        if (s === 4 || s === 12) snare(t, 1);
        if (bi === 3 && s >= 12) {
          tom(t, [196, 165, 131, 110][s - 12]);
          if (s === 15) snare(t, 0.6);
        } else if (s % 2 === 0) hat(t, s % 4 ? 0.6 : 1, s === 14 && bi === 1);
        if (s === 0 && (bi === 0 || lv >= 3)) crash(t, bi === 0 ? 1 : 0.6);
      }
      if (on("taiko") && (s === 0 || s === 8 || (bi === 3 && s >= 12 && s % 2 === 0))) taiko(t, s === 0 ? 1 : 0.7);
      if (on("lead") || on("solo")) {
        const tr = sec === 1 ? -12 : 0;
        for (const [st, len, m, trem] of (B ? MEL_B : MEL_A)[bi])
          if (st === s) {
            if (on("lead")) leadNote(m + tr, t, len * MZ.step, trem);
            if (on("solo")) soloNote(m - 12, t, len * MZ.step);
          }
      }
      /* oraina: izotz-distirak esplorazioan */
      if (phase && lv <= 1 && (s === 0 || s === 8) && ((n * 7) % 5) < 3) bell(mf(C.pad[(bar + s / 8) % 4] + 24), t + 0.01, 0.016, MZ.era);
    }
    function mzSchedule(t0) {
      if (!MZ.L) mzBuild();
      const lv = musicLevel();
      if (lv !== MZ.level) mzLevel(lv, t0);
      /* garaia eta zona: oraina hotza (iragazkia), gaua leunagoa, leizea itxia (are ilunagoa) */
      const caveK = ZONES[ZONE.cur].outdoor ? (DAY.k > 0.5 ? 0.72 : 1) : 0.55,
        eraKey = phase + caveK * 10;
      if (MZ.eraOn !== eraKey) {
        MZ.eraOn = eraKey;
        const f = (phase ? 3600 : 16000) * caveK;
        MZ.era.frequency.setTargetAtTime(f, t0, 0.12);
        MZ.eraD.frequency.setTargetAtTime((phase ? 5200 : 16000) * caveK, t0, 0.12);
      }
      if (MZ.next < t0) MZ.next = t0 + 0.04;
      while (MZ.next < t0 + 0.25) {
        mzStep(MZ.next, MZ.n++);
        MZ.next += MZ.step;
      }
    }
    /* borroka amaitzean: azken akordea (zartada, gitarra irekia, taikoa) */
    function mzStinger(big) {
      if (!MZ.L) return;
      const t = ctx.currentTime + 0.03;
      crash(t, 1.2, MZ.stab);
      taiko(t, 1, MZ.stab);
      gtrChug(50, t, true, MZ.stabGtr, big ? 2.4 : 1.4);
      if (big) choir(CH.Dm.pad, t, 1.6, MZ.stab);
    }
