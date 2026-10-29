  /* ==================================================================
     IK · begirada eta oinak (ozz-animation-en ideia orokorrak — aim eta bi hezurreko IK —, gure eran)
     Animazioaren ondoren (fotograma bakoitzean, marraztu aurretik), pisu leunekin:
     · BEGIRADA: burua (eta bularra apur bat) helburura, mugekin (±65° alboetara, -30°/+25° gora-behera).
       Amaiur: finkatutako etsaia, hurbileko herritarra, kutxa edo oihartzun-harria. Herritarrek Amaiurri
       begiratzen diote ondotik pasatzean (geldi daudenean).
     · OINAK: oin bakoitza bere lurraren altueran (malda, harria, plataforma); aldaka jaisten da beheko oinak
       heltzeko. Lurrean eta astiro bakarrik (jauzian, bultzadan, erasoan eta zineman ez).
     Hezurrak animazioak berridazten ditu hurrengo eguneraketan: IK ez da metatzen.
     Probetan: __game.IK, ikUpdate().
     ================================================================== */
  const IK = { rigs: [], on: true, hero: null };
  const ikV = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()],
    ikQ = [new T.Quaternion(), new T.Quaternion(), new T.Quaternion(), new T.Quaternion()],
    IK_I = new T.Quaternion();
  /* rig bat prestatu: hezurrak izenez; buruaren "aurrea" lotura-jarreran (pertsonaiaren +Z) */
  function ikRig(root, owner, opts = {}) {
    const head = root.getObjectByName("head"),
      chest = root.getObjectByName("chest"),
      hips = root.getObjectByName("hips");
    if (!head || !chest || !hips) return null;
    /* three.js-k izenetatik puntuak kentzen ditu (PropertyBinding.sanitizeNodeName): "upperleg.l" → "upperlegl" */
    const bone = (n) => root.getObjectByName(n) || root.getObjectByName(n.replace(".", "")),
      legs = ["l", "r"].map((s) => ({ up: bone("upperleg." + s), lo: bone("lowerleg." + s), ft: bone("foot." + s) }));
    const sk = [];
    root.traverse((n) => n.isSkinnedMesh && sk.push(n.skeleton));
    /* lotura-jarreran neurtu (gero animazioak berreskuratzen du) */
    const saved = sk.length ? sk[0].bones.map((b) => [b.position.clone(), b.quaternion.clone()]) : null;
    if (sk.length) sk[0].pose();
    root.updateMatrixWorld(true);
    const rq = root.getWorldQuaternion(new T.Quaternion()),
      fwdW = new T.Vector3(0, 0, 1).applyQuaternion(rq),
      fwd = fwdW.clone().applyQuaternion(head.getWorldQuaternion(new T.Quaternion()).invert()).normalize();
    if (saved) sk[0].bones.forEach((b, i) => (b.position.copy(saved[i][0]), b.quaternion.copy(saved[i][1])));
    const ok = legs.every((L) => L.up && L.lo && L.ft),
      bones = [chest, head, ...(ok ? legs.flatMap((L) => [L.up, L.lo]) : [])];
    const R = { root, owner, head, chest, hips, legs: ok ? legs : null, fwd, w: 0, wf: 0, tgt: new T.Vector3(), feet: !!opts.feet, bones, pre: bones.map(() => new T.Quaternion()), preHip: new T.Vector3(), postQ: new T.Quaternion(), postHip: new T.Vector3(), post: false };
    IK.rigs.push(R);
    return R;
  }
  /* hezur bat munduko biraketa batez biratu (gurasoaren espaziora itzulita) */
  function ikRotateWorld(bone, qw) {
    const qb = bone.getWorldQuaternion(ikQ[2]),
      qp = bone.parent.getWorldQuaternion(ikQ[3]);
    qb.premultiply(qw);
    bone.quaternion.copy(qp.invert().multiply(qb));
    bone.updateMatrixWorld(true);
  }
  /* BEGIRADA: R.tgt-ra, pisua R.w */
  function ikLook(R) {
    const { head, chest, root } = R,
      hp = head.getWorldPosition(ikV[0]),
      rq = root.getWorldQuaternion(ikQ[0]),
      rqi = ikQ[1].copy(rq).invert();
    /* helburuaren norabidea pertsonaiaren espazioan: mugak (yaw, pitch) */
    const d = ikV[1].copy(R.tgt).sub(hp).applyQuaternion(rqi);
    if (d.lengthSq() < 0.04) return;
    d.normalize();
    const yaw = clamp(Math.atan2(d.x, d.z), -1.13, 1.13),
      pitch = clamp(Math.asin(clamp(d.y, -1, 1)), -0.52, 0.44),
      want = ikV[2].set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(rq);
    /* bularra: %25; burua: gainerakoa (buruaren uneko aurrea → nahi dena) */
    for (const [bone, k] of [[chest, 0.25], [head, 1]]) {
      const cur = ikV[3].copy(R.fwd).applyQuaternion(head.getWorldQuaternion(ikQ[0])).normalize(),
        q = ikQ[0].setFromUnitVectors(cur, want);
      IK_I.identity();
      q.copy(IK_I.slerp(q, R.w * k));
      ikRotateWorld(bone, q);
    }
  }
  /* lurraren altuera (x, z) puntuan, yRef inguruan: plataforma edo haraneko lurra */
  function ikGround(x, z, yRef) {
    const s = support(x, z, yRef + 0.55);
    return s ? topY(s, x, z) : null;
  }
  /* bi hezurreko IK: upper → lower → foot, helburua T (mundua), belauna pole norabidean */
  function ikTwoBone(L, T0, pole) {
    const A = L.up.getWorldPosition(ikV[0]),
      B = L.lo.getWorldPosition(ikV[1]),
      C = L.ft.getWorldPosition(ikV[2]),
      L1 = A.distanceTo(B),
      L2 = B.distanceTo(C),
      AT = ikV[3].copy(T0).sub(A);
    let d = AT.length();
    if (d < 1e-4) return;
    const dir = AT.divideScalar(d);
    d = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1),
      sinA = Math.sqrt(1 - cosA * cosA),
      pv = ikV[4].copy(pole).addScaledVector(dir, -pole.dot(dir));
    if (pv.lengthSq() < 1e-6) return;
    pv.normalize();
    /* belaun berria */
    const Bn = ikV[5].copy(A).addScaledVector(dir, L1 * cosA).addScaledVector(pv, L1 * sinA);
    ikRotateWorld(L.up, ikQ[0].setFromUnitVectors(B.sub(A).normalize(), Bn.sub(A).normalize()));
    /* izterra biratuta: oina helburura */
    const B2 = L.lo.getWorldPosition(ikV[1]),
      C2 = L.ft.getWorldPosition(ikV[2]),
      Tc = ikV[5].copy(A).addScaledVector(dir, d);
    ikRotateWorld(L.lo, ikQ[0].setFromUnitVectors(C2.sub(B2).normalize(), Tc.sub(B2).normalize()));
  }
  /* OINAK: R.wf pisua */
  function ikFeet(R, yRef) {
    const legs = R.legs,
      rootY = R.root.getWorldPosition(ikV[0]).y,
      off = [0, 0];
    for (let i = 0; i < 2; i++) {
      const f = legs[i].ft.getWorldPosition(ikV[1]),
        g = ikGround(f.x, f.z, yRef);
      /* animazioa lur lauan dago (erroaren altueran): oina bere lurraren altuerara */
      off[i] = g === null ? 0 : clamp(g - rootY, -0.35, 0.35);
    }
    const drop = Math.min(off[0], off[1], 0) * R.wf;
    if (Math.abs(drop) > 1e-3) {
      const hp = R.hips.getWorldPosition(ikV[2]);
      hp.y += drop;
      R.hips.position.copy(R.hips.parent.worldToLocal(hp));
      R.hips.updateMatrixWorld(true);
    }
    const rq = R.root.getWorldQuaternion(ikQ[1]),
      pole = ikV[3].set(0, 0, 1).applyQuaternion(rq).clone();
    for (let i = 0; i < 2; i++) {
      const lift = off[i] * R.wf - drop;
      if (Math.abs(lift) < 0.01) continue;
      const T0 = legs[i].ft.getWorldPosition(new T.Vector3());
      T0.y += lift;
      ikTwoBone(legs[i], T0, pole);
    }
  }
  /* Amaiurren begiradaren helburua (null: aurrera) */
  function ikHeroTarget(v) {
    if (LOCK.target && LOCK.target.state !== "dead") return v.set(LOCK.target.x, (LOCK.target.y || 0) + 1.3, LOCK.target.z);
    let best = null,
      bd = 5.5;
    if (ZONE.cur === "ibarra")
      for (const N of NPCS) {
        if (!N.g || !N.g.visible) continue;
        const d = Math.hypot(N.x - P.x, N.z - P.z);
        if (d < bd) (bd = d), (best = [N.x, (N.y || 0) + 1.55, N.z]);
      }
    if (!best)
      for (const C of CHESTS) {
        if (C.opened || !C.m.visible || C.zoneGroup !== ZONES[ZONE.cur].group) continue;
        const d = Math.hypot(C.x - P.x, C.z - P.z);
        if (d < Math.min(bd, 4)) (bd = d), (best = [C.x, C.y + 0.6, C.z]);
      }
    return best ? v.set(best[0], best[1], best[2]) : null;
  }
  /* fotograma bakoitzean, marraztu aurretik */
  function ikUpdate(dt) {
    if (!IK.on) return;
    const film = FILM.on || cinematic || !started;
    for (const R of IK.rigs) {
      if (!R.root.visible || (R.owner && R.owner.g && !R.owner.g.visible)) continue;
      let want = 0,
        wantF = 0;
      if (R === IK.hero) {
        const sp = Math.hypot(P.vx, P.vz);
        if (!film && !P.riding && ikHeroTarget(R.tgt)) want = P.dashT > 0 || ATK.t < 0.25 ? 0.3 : 0.9;
        wantF = !film && R.feet && P.grounded && !P.riding && !P.climb && P.dashT <= 0 && sp < 3.2 && ATK.t > 0.4 ? 1 : 0;
      } else if (R.owner) {
        /* herritarra: Amaiur hurbil eta geldi badago */
        const N = R.owner,
          d = Math.hypot(P.x - N.x, P.z - N.z);
        if (d < 4.2 && !N.walking && !film) {
          R.tgt.set(P.x, P.y + 1.5, P.z);
          want = 0.85;
        }
      }
      R.w = mix(R.w, want, 1 - Math.exp(-dt * (want > R.w ? 5 : 3)));
      R.wf = mix(R.wf, wantF, 1 - Math.exp(-dt * 8));
      /* animazioak ez badu ezer idatzi azken aldiz geroztik (pausan, txalapartan...), IK-ren aurreko
         jarrera itzuli: bestela metatu egingo litzateke (aldaka beherago eta beherago) */
      if (R.post && R.head.quaternion.equals(R.postQ) && R.hips.position.equals(R.postHip)) {
        R.bones.forEach((b, i) => b.quaternion.copy(R.pre[i]));
        R.hips.position.copy(R.preHip);
      }
      R.post = false;
      if (R.w < 0.01 && R.wf < 0.01) continue;
      R.bones.forEach((b, i) => R.pre[i].copy(b.quaternion));
      R.preHip.copy(R.hips.position);
      R.root.updateMatrixWorld(true);
      if (R.wf > 0.01 && R.legs) ikFeet(R, R === IK.hero ? P.y : R.root.getWorldPosition(ikV[0]).y);
      if (R.w > 0.01) ikLook(R);
      R.postQ.copy(R.head.quaternion);
      R.postHip.copy(R.hips.position);
      R.post = true;
    }
  }
