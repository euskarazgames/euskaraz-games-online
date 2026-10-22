  /* ==================================================================
     ZINEMA · plano zinematografikoak: letterbox-a, kamera-bidaiak, kokapen- eta ordu-errotuluak
     (makinaz idatziak), azpitituluak eta ahotsak, beltzera urtzeak eta izenburu-txartela.
     Mundua geldi dago (logikarik ez), baina ura, zerua, partikulak eta animazioak bizirik.
     Plano bakoitza: { d, cam:[A,B], look:[A,B]|P, fov, cap:[lerroak], say:"id", text:[nor,testua],
       fade:"in"|"out"|"black", title:[handia, txikia], on(), tick(dt,k) } — A/B funtzioak izan daitezke.
     SALTATU (botoia edo Esc): amaierako deia (after) zuzenean; hark ezartzen du egoera.
     ================================================================== */
  const FILM = { on: false, list: null, i: -1, t: 0, sh: null, after: null, capFull: "", capN: 0, vEnd: 0, vOn: false, A: null, B: null, LA: null, LB: null };
  const vec = (a) => new T.Vector3(...(typeof a === "function" ? a() : a));
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function film(list, after) {
    if (FILM.on) return;
    coachHide();
    clearInput();
    voiceStop();
    Object.assign(FILM, { on: true, list, i: -1, after: after || null });
    paused = true;
    const el = $("film");
    el.hidden = false;
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
    $("hud").style.opacity = "0";
    $("touch").style.visibility = "hidden";
    $("pause").hidden = true;
    $("waypoint").hidden = true;
    $("prompt").hidden = true;
    if (guideBeacon) guideBeacon.visible = false;
    voicePreload(list.map((s) => s.say));
    filmNext();
  }
  function filmNext() {
    if (!FILM.on) return;
    FILM.i++;
    if (FILM.i >= FILM.list.length) return filmEnd();
    const s = (FILM.sh = FILM.list[FILM.i]);
    FILM.t = 0;
    FILM.vOn = !s.say;
    FILM.vEnd = 0;
    if (s.on) s.on();
    FILM.A = vec(s.cam[0]);
    FILM.B = vec(s.cam[1] || s.cam[0]);
    const lk = s.look || [P.x, P.y + 1.2, P.z];
    FILM.LA = vec(Array.isArray(lk[0]) || typeof lk[0] === "function" ? lk[0] : lk);
    FILM.LB = vec(Array.isArray(lk[0]) || typeof lk[0] === "function" ? lk[1] || lk[0] : lk);
    if (s.cap) {
      FILM.capFull = s.cap.join("\n");
      FILM.capN = 0;
      $("filmCap").textContent = "";
    } else if (s.cap === null) $("filmCap").textContent = FILM.capFull = "";
    const line = s.say ? voiceLine(s.say) : s.text;
    $("filmSub").hidden = !line;
    if (line) {
      $("filmWho").textContent = line[0];
      $("filmLine").textContent = L(line[1]);
      $("filmSub").className = line[0].startsWith("GAUEKO") ? "dark" : "";
    }
    const fd = $("filmFade");
    fd.style.transition = "none";
    fd.style.opacity = s.fade === "in" || s.fade === "black" ? 1 : 0;
    void fd.offsetWidth;
    fd.style.transition = "";
    if (s.fade === "in") fd.style.opacity = 0;
    /* izenburu-txartela: plano batetik bestera berdina bada, ez da berriro hasten */
    const tt = $("filmTitle"),
      tk = s.title ? s.title.join("|") : "";
    if (tk !== tt.dataset.k) {
      tt.dataset.k = tk;
      tt.hidden = !s.title;
      tt.classList.remove("show");
      if (s.title) {
        $("filmTitleBig").textContent = s.title[0];
        $("filmTitleSmall").textContent = s.title[1] || "";
        void tt.offsetWidth;
        tt.classList.add("show");
      }
    }
    if (s.fov) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  }
  function filmUpdate(dt) {
    const s = FILM.sh;
    if (!s) return;
    FILM.t += dt;
    const k = clamp(FILM.t / s.d, 0, 1),
      e = easeIO(k);
    camera.position.lerpVectors(FILM.A, FILM.B, e);
    const look = new T.Vector3().lerpVectors(FILM.LA, FILM.LB, e);
    camera.lookAt(look);
    CAM.cineLook = look;
    if (s.tick) s.tick(dt, k);
    /* ahotsa: kargatuta dagoenean hasi (gehienez 0.8 s itxaron; bestela testua bakarrik) */
    if (!FILM.vOn && (voiceReady(s.say) || FILM.t > 0.8)) {
      FILM.vOn = true;
      const d = voicePlay(s.say);
      FILM.vEnd = d ? FILM.t + d : 0;
    }
    if (FILM.capN < FILM.capFull.length) {
      const n = Math.min(FILM.capFull.length, Math.floor((FILM.capN += dt * 26)));
      $("filmCap").textContent = FILM.capFull.slice(0, n) + (n < FILM.capFull.length ? "▌" : "");
      if (n % 2 === 0 && /\S/.test(FILM.capFull[n - 1] || "")) SND.blip();
    }
    if (s.fade === "out" && FILM.t > s.d - 1.05 && !FILM.outT) {
      FILM.outT = 1;
      $("filmFade").style.opacity = 1;
    }
    if (mixer) mixer.update(dt);
    time += dt;
    eraVisuals();
    if (ZONE.cur === "ibarra") {
      mariUpdate(dt);
      npcsUpdate(dt);
      if (PRO.ghost) ghostTxala(dt);
    }
    music(dt);
    occlusionUpdate(dt);
    if (FILM.t >= s.d && FILM.vOn && (!FILM.vEnd || FILM.t >= FILM.vEnd + 0.35)) {
      FILM.outT = 0;
      filmNext();
    }
  }
  function filmEnd() {
    if (!FILM.on) return;
    voiceStop();
    FILM.on = false;
    FILM.sh = null;
    FILM.outT = 0;
    const el = $("film");
    el.classList.remove("on");
    $("filmTitle").hidden = true;
    $("filmTitle").dataset.k = "";
    $("filmSub").hidden = true;
    $("filmCap").textContent = "";
    $("filmFade").style.opacity = 0;
    setTimeout(() => !FILM.on && (el.hidden = true), 700);
    paused = false;
    clearInput();
    accumulator = 0;
    CAM.pos = null;
    $("hud").style.opacity = "1";
    $("touch").style.visibility = "";
    $("pause").hidden = !started;
    const f = FILM.after;
    FILM.after = null;
    if (f) f();
    hud();
  }
  const filmSkip = () => filmEnd();
