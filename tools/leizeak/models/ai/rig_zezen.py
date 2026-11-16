#!/usr/bin/env python3
"""LEIZEEN DEIA: Zezengorriren hezurdura (Blender, bpy). Tripo modelo estatikoa → lau hankako animalia.

tools/leizeak/models/ai/zezengorri/tripo.glb → public/assets/models/leizeak/zezengorri.glb
  · orientazioa: lau apatxak (k-means, lurraren ondoan); aurreko bikotea buruaren aldekoa da;
    aurrera = Blender -Y (glTF +Z, jokoan bezala), erdia apatxen erdian, altuera finkoa;
  · hezurdura: root → body → lau hanka (goikoa + behekoa, belaunean) eta burua (lepotik muturrera);
  · pisuak geometriatik: sabelaren azpian hankak uharte bereiziak dira (apatx hurbilena, erradio
    barruan), belaunean nahasketa leuna; lepoaren aurrean eta gorputzaren gainetik (adarrak) burua;
  · markak (empty, buruaren semeak): eye_L / eye_R (testuraren kolore horitik), forehead (sugarra),
    snout (muturra): jokoak hor jartzen ditu begien distira, txingarra eta su-arnasa;
  · testura 1024 px JPEG; Draco gabe (gero meshopt.mjs).

  /home/user/.venvs/bpy311/bin/python tools/leizeak/models/ai/rig_zezen.py [--height 5.0]
"""
import argparse, math, pathlib, sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = ROOT / 'public/assets/models/leizeak'
LEGS = ('F_L', 'F_R', 'B_L', 'B_R')


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def kmeans(P, k, iters=40):
    C = [P[np.argmax(np.linalg.norm(P - P.mean(0), axis=1))]]
    for _ in range(1, k):
        d = np.min(((P[:, None, :] - np.array(C)[None]) ** 2).sum(-1), 1)
        C.append(P[np.argmax(d)])
    C = np.array(C)
    for _ in range(iters):
        lab = np.argmin(((P[:, None, :] - C[None]) ** 2).sum(-1), 1)
        C = np.array([P[lab == j].mean(0) if np.any(lab == j) else C[j] for j in range(k)])
    return C


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='zezengorri')
    ap.add_argument('--height', type=float, default=5.0)
    ap.add_argument('--tex', type=int, default=1024)
    a = ap.parse_args(argv)
    import bpy
    from mathutils import Matrix, Vector

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(HERE / a.name / 'tripo.glb'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        sys.exit('sarerik ez')
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o != ob:
            bpy.data.objects.remove(o, do_unlink=True)
    me = ob.data
    N = len(me.vertices)
    V = np.zeros(N * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(N, 3)

    # 1) lurra eta altuera
    V[:, 2] -= V[:, 2].min()
    V *= a.height / V[:, 2].max()
    H = a.height
    # 2) apatxak eta aurrealdea
    C = kmeans(V[V[:, 2] < 0.06 * H][:, :2], 4)
    top = V[V[:, 2] > 0.72 * H][:, :2].mean(0)
    order = np.argsort(((C - top) ** 2).sum(1))
    fwd = C[order[:2]].mean(0) - C[order[2:]].mean(0)
    th = -math.pi / 2 - math.atan2(fwd[1], fwd[0])
    R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
    mid = C.mean(0)
    V[:, :2] = (V[:, :2] - mid) @ R.T
    C = (C - mid) @ R.T
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    # hankak: F (aurrea, y < 0) / B; L (x > 0) / R
    legs = {}
    for c in C:
        legs[('F' if c[1] < 0 else 'B') + '_' + ('L' if c[0] > 0 else 'R')] = c
    if sorted(legs) != sorted(LEGS):
        sys.exit(f'apatxak ez dira argi bereizten: {C.round(2).tolist()}')
    yF = (legs['F_L'][1] + legs['F_R'][1]) / 2
    yB = (legs['B_L'][1] + legs['B_R'][1]) / 2
    dx = np.mean([abs(c[0]) for c in C])
    Lng = y.max() - y.min()
    # 3) sabela (hanken arteko zutabea) eta gorputzaren goialdea (atzeko hanken gainean)
    col = (np.abs(x) < 0.35 * dx) & (y > yF * 0.6) & (y < yB * 0.6)
    zb = float(z[col].min()) if col.any() else 0.45 * H
    zt = float(z[(np.abs(y - yB) < 0.1 * Lng)].max())
    zk = 0.45 * zb
    zp = zb + 0.3 * (zt - zb)
    # hanka bakoitza zutabe bat da (apatxaren erradioa × 1.7): buztana eta sabela kanpoan geratzen dira
    hoof = V[:, 2] < 0.06 * H
    hl = np.argmin(np.stack([(x - legs[k][0]) ** 2 + (y - legs[k][1]) ** 2 for k in LEGS], 1), 1)
    ctr, rad = {}, {}
    for i, k in enumerate(LEGS):
        s = hoof & (hl == i)
        rh = float(np.percentile(np.hypot(x[s] - legs[k][0], y[s] - legs[k][1]), 90)) if s.sum() > 4 else 0.12 * H
        colm = (hl == i) & (np.hypot(x - legs[k][0], y - legs[k][1]) < 1.7 * rh)

        def at(z0, z1):
            t = colm & (z >= z0) & (z <= z1)
            return np.array([x[t].mean(), y[t].mean()]) if t.sum() > 4 else legs[k]
        ctr[k] = (legs[k], at(zk - 0.04 * H, zk + 0.04 * H), at(0.8 * zb, 0.95 * zb))
        rad[k] = 1.25 * rh
    # 4) pisuak
    def leg_center(k, zz):
        h, kc, tc = ctr[k]
        t1 = np.clip(zz / max(zk, 1e-6), 0, 1)[:, None]
        t2 = np.clip((zz - zk) / max(0.9 * zb - zk, 1e-6), 0, 1)[:, None]
        lo = h + (kc - h) * t1
        return np.where((zz < zk)[:, None], lo, kc + (tc - kc) * t2)
    dist = np.stack([np.hypot(*(np.stack([x, y], 1) - leg_center(k, z)).T) / rad[k] for k in LEGS], 1)
    li = np.argmin(dist, 1)
    dmin = dist[np.arange(N), li]
    bb = 0.12 * (zt - zb)
    wl = smooth(zb + bb, zb - bb, z) * smooth(1.9, 1.5, dmin)
    tk = smooth(zk - 0.06 * H, zk + 0.06 * H, z)
    # burua: lepoaren aurrean (aurrealdeko % 24) eta bularraren gainean; adarrak ere bai (aurrean bakarrik)
    ymin = float(y.min())
    yn = ymin + 0.24 * Lng
    wh = smooth(yn + 0.08 * Lng, yn - 0.06 * Lng, y) * smooth(zb + 0.5 * (zt - zb), zb + 0.8 * (zt - zb), z)
    wh = np.maximum(wh, smooth(zt, zt + 0.05 * H, z) * smooth(yn + 0.08 * Lng, yn, y))
    wh = np.minimum(wh, 1 - wl)
    W = {'body': np.clip(1 - wl - wh, 0, 1), 'head': wh}
    for i, k in enumerate(LEGS):
        m = (li == i) * wl
        W['leg_' + k + '_up'] = m * tk
        W['leg_' + k + '_lo'] = m * (1 - tk)
    tot = sum(W.values())
    for k in W:
        W[k] = W[k] / np.maximum(tot, 1e-6)
    # lepoaren pibota: lepo-zatiaren erdian
    sl = (np.abs(y - yn) < 0.04 * Lng) & (z > zb + 0.5 * (zt - zb))
    neck = np.array([0.0, yn, (z[sl].min() + z[sl].max()) / 2 if sl.sum() > 4 else zt])
    # 5) markak: muturra, begiak (testuraren horia), bekokia (sugarra)
    head = wh > 0.5
    tip = head & (y < ymin + 0.05 * Lng)
    snout = V[tip].mean(0) if tip.any() else V[np.argmin(y)]
    uv = np.zeros((N, 2))
    img = None
    for mat in me.materials:
        if mat and mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    img = n.image
                    break
    if img is not None and me.uv_layers.active:
        L = len(me.loops)
        lv = np.zeros(L, dtype=np.int64)
        me.loops.foreach_get('vertex_index', lv)
        luv = np.zeros(L * 2)
        me.uv_layers.active.data.foreach_get('uv', luv)
        uv[lv] = luv.reshape(L, 2)
        w, h = img.size
        px = np.array(img.pixels[:]).reshape(h, w, img.channels)
        iu = np.clip((uv[:, 0] % 1) * (w - 1), 0, w - 1).astype(int)
        iv = np.clip((uv[:, 1] % 1) * (h - 1), 0, h - 1).astype(int)
        col_ = px[iv, iu, :3]
    else:
        col_ = np.zeros((N, 3))
    r_, g_, b_ = col_[:, 0], col_[:, 1], col_[:, 2]
    warm = (r_ > 0.7) & (g_ > 0.35) & (b_ < 0.35)
    yellow = warm & (g_ > 0.55)
    face = head & (y < ymin + 0.2 * Lng)
    fz = z[face]
    zmid = float(np.percentile(fz, 50)) if face.any() else snout[2]
    # sugarra: buruaren goian, erdian; begiak: aurpegiaren alboetan, sugarraren azpian
    flame = face & warm & (z > zmid) & (np.abs(x - snout[0]) < 0.3)
    if flame.sum() >= 3:
        f = V[flame]
        fore = np.array([np.median(f[:, 0]), np.percentile(f[:, 1], 30), np.percentile(f[:, 2], 10)])
    else:
        fore = np.array([snout[0], snout[1] + 0.3, zmid + 0.4])
        print('bekokia: geometriatik', flush=True)
    eyes = {}
    for side, sgn in (('L', 1), ('R', -1)):
        s = face & yellow & ((x - snout[0]) * sgn > 0.12) & (z < fore[2]) & (z > snout[2] - 0.2)
        if s.sum() >= 3:
            eyes[side] = V[s].mean(0)
    if len(eyes) < 2:
        ez = snout[2] + 0.25
        for side, sgn in (('L', 1), ('R', -1)):
            ex = snout[0] + sgn * 0.42
            s = face & (np.abs(z - ez) < 0.15) & (np.abs(x - ex) < 0.12)
            eyes[side] = np.array([ex, y[s].min() if s.any() else snout[1] + 0.45, ez])
        print('begiak: koloretik ez; geometriatik', flush=True)
    # 6) sarea idatzi eta hezurdura
    me.vertices.foreach_set('co', V.ravel())
    me.update()
    arm = bpy.data.armatures.new('zezen_arm')
    ao = bpy.data.objects.new('zezen', arm)
    bpy.context.scene.collection.objects.link(ao)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones

    def bone(name, h, t, parent=None, connect=False):
        b = eb.new(name)
        b.head, b.tail = Vector(tuple(float(v) for v in h)), Vector(tuple(float(v) for v in t))
        b.roll = 0
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    bone('root', (0, 0, 0), (0, 0, 0.25 * H))
    bone('body', (0, yB, zp), (0, yF, zp), 'root')
    for k in LEGS:
        h, kc, tc = ctr[k]
        bone('leg_' + k + '_up', (tc[0], tc[1], zp), (kc[0], kc[1], zk), 'body')
        bone('leg_' + k + '_lo', (kc[0], kc[1], zk), (h[0], h[1], 0.03 * H), 'leg_' + k + '_up', True)
    neck[0] = snout[0]
    bone('head', tuple(neck), (snout[0], snout[1], snout[2]), 'body')
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.parent = ao
    mod = ob.modifiers.new('arm', 'ARMATURE')
    mod.object = ao
    for k, w in W.items():
        vg = ob.vertex_groups.new(name=k)
        for wv in np.unique(np.round(w[w > 0.002], 3)):
            idx = np.nonzero(np.abs(np.round(w, 3) - wv) < 1e-9)[0].tolist()
            vg.add(idx, float(wv), 'REPLACE')
    bpy.context.view_layer.update()
    for nm, p in (('eye_L', eyes['L']), ('eye_R', eyes['R']), ('forehead', fore), ('snout', snout)):
        e = bpy.data.objects.new(nm, None)
        bpy.context.scene.collection.objects.link(e)
        e.parent = ao
        e.parent_type = 'BONE'
        e.parent_bone = 'head'
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(Vector(tuple(float(v) for v in p)))
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth()
    for im in bpy.data.images:
        if im.size[0] > a.tex or im.size[1] > a.tex:
            k = a.tex / max(im.size[0], im.size[1])
            im.scale(int(im.size[0] * k), int(im.size[1] * k))
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f'{a.name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=False, export_image_format='JPEG',
                              export_image_quality=85, export_apply=False, export_skins=True, export_animations=False,
                              export_draco_mesh_compression_enable=False, export_yup=True)
    f = lambda v: [round(float(t), 2) for t in v]
    print(f'{a.name}: H {H} m, luzera {Lng:.2f}, sabela {zb:.2f}, bizkarra {zt:.2f}, belauna {zk:.2f}, pibota {zp:.2f}', flush=True)
    for k in LEGS:
        print(' ', k, 'apatxa', f(ctr[k][0]), 'belauna', f(ctr[k][1]), 'goia', f(ctr[k][2]), 'r', round(rad[k], 2),
              'erpinak', int(((li == LEGS.index(k)) & (wl > 0.5)).sum()), flush=True)
    print('  burua', int((wh > 0.5).sum()), 'erpin; lepoa', f(neck), 'muturra', f(snout), 'begiak', f(eyes['L']), f(eyes['R']), 'bekokia', f(fore), flush=True)
    print(f'  → {out} ({out.stat().st_size // 1024} KB)', flush=True)


if __name__ == '__main__':
    main()
