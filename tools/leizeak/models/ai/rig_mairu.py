#!/usr/bin/env python3
"""LEIZEEN DEIA: Mairu Zaharraren hezurdura (Blender, bpy). Tripo modeloa (menhir bizia) → jokoaren
pertsonaien hezurdura bera (KayKit "Rig": hips, spine, chest, head, besoak, hankak), haren animazioak
erabiltzeko (Idle, Walking_A, Spellcast_*, 2H_Melee_*…).

tools/leizeak/models/ai/mairu/tripo.glb → public/assets/models/leizeak/mairu.glb
  · orientazioa: besoen zabalera X ardatzean, aurpegia aurrera (Blender -Y = glTF +Z), oinak Y = 0-n;
  · hezurdura: tools/leizeak/models/npc_knight.glb-ren "Rig" (meshopt gabe; ikus --rig). Hezur bakoitzaren
    norabidea eta "roll"-a ez dira aldatzen (animazioek tokiko errotazio absolutuak dakartzate): giltzaduren
    tokiak bakarrik egokitzen dira menhirraren geometriara; besoak, behera eroriak, jarreran biratu eta
    atseden-jarrera bihurtzen dira (apply pose as rest);
  · pisuak geometriatik: blokea (gorputza eta aurpegia) bularrari zurrun; hankak eta besoak beren hezurrei,
    giltzaduretan nahasketa leunarekin;
  · marka: "core" (bularreko ekaitz-harria, blokearen aurrealdean).
Jokoan (jentilak.js) KayKit klipak erabiltzen dira; hips-en kokapena desplazatzen da, eta beste hezurren
kokapen-pistak kentzen dira (giltzadurak menhirrarenak dira).

  /home/user/.venvs/bpy311/bin/python tools/leizeak/models/ai/rig_mairu.py --rig <knight_raw.glb> [--height 2.0]
"""
import argparse, math, pathlib, sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = ROOT / 'public/assets/models/leizeak'


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--rig', required=True, help='KayKit pertsonaia bat, meshopt gabe (adib. npc_knight deskonprimitua)')
    ap.add_argument('--height', type=float, default=2.0)
    ap.add_argument('--tex', type=int, default=1024)
    a = ap.parse_args(argv)
    import bpy
    from mathutils import Matrix, Vector

    bpy.ops.wm.read_factory_settings(use_empty=True)
    # 1) hezurdura (KayKit): sareak kendu
    bpy.ops.import_scene.gltf(filepath=a.rig)
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    for o in list(bpy.context.scene.objects):
        if o.type != 'ARMATURE':
            bpy.data.objects.remove(o, do_unlink=True)
    arm.name = 'mairu_rig'
    bpy.context.view_layer.update()
    # (armadura objektuaren transformazioa aplikatu: hezurrak mundu-koordenatuetan)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    arm.select_set(False)
    # 2) menhirra (Tripo)
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(HERE / 'mairu' / 'tripo.glb'))
    meshes = [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']
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
        if o not in (ob, arm):
            bpy.data.objects.remove(o, do_unlink=True)
    ob.name = 'mairu'
    me = ob.data
    N = len(me.vertices)
    V = np.zeros(N * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(N, 3)
    # orientazioa: zabalera handiena (besoak) X-n; behatzak aurrera (-Y)
    V[:, 2] -= V[:, 2].min()
    V *= a.height / V[:, 2].max()
    H = a.height
    ex, ey = np.ptp(V[:, 0]), np.ptp(V[:, 1])
    if ey > ex:
        V[:, [0, 1]] = V[:, [1, 0]] * np.array([1, -1])  # (x, y) → (y, -x): biratu 90°
    feet = V[V[:, 2] < 0.06 * H]
    if (feet[:, 1].mean() - V[:, 1].mean()) > 0:  # behatzak +Y aldera: buelta erdia
        V[:, 0] *= -1
        V[:, 1] *= -1
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    # oinak (bi multzo X-n)
    feet = V[z < 0.06 * H]
    fl, fr = feet[feet[:, 0] > 0], feet[feet[:, 0] <= 0]
    cxL, cxR = fl[:, 0].mean(), fr[:, 0].mean()
    xc = (cxL + cxR) / 2
    V[:, 0] -= xc
    yc = feet[:, 1].mean()
    V[:, 1] -= yc
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    footL = np.array([fl[:, 0].mean() - xc, fl[:, 1].mean() - yc])
    footR = np.array([fr[:, 0].mean() - xc, fr[:, 1].mean() - yc])
    gap = (footL[0] - footR[0]) / 2
    # hankarteko altuera: erdiko zutabearen behealdea (blokearen azpia)
    colm = np.abs(x) < 0.3 * gap
    zcr = float(z[colm & (z > 0.05 * H)].min()) if (colm & (z > 0.05 * H)).any() else 0.3 * H
    # blokearen zabalera (goian, besorik gabe)
    top = (z > 0.82 * H) & (z < 0.96 * H)
    bhw = float(np.percentile(np.abs(x[top]), 96)) * 1.02
    # besoak: blokearen kanpoan, hankartetik gora
    arms = {}
    for side, sgn in (('l', 1), ('r', -1)):
        s = (x * sgn > bhw * 1.04) & (z > zcr)
        if s.sum() < 20:
            sys.exit(f'besoa ez da aurkitu ({side})')
        P = V[s]
        arms[side] = dict(top=float(P[:, 2].max()), bot=float(P[:, 2].min()), x=float(np.median(P[:, 0])), y=float(np.median(P[:, 1])),
                          hand=P[P[:, 2] < P[:, 2].min() + 0.12 * (P[:, 2].max() - P[:, 2].min())].mean(0))
    # 3) giltzadurak (norabidea eta roll-a gorde; tokiak eta luzerak bakarrik)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for b in eb:
        b.use_connect = False
    dirs = {b.name: ((b.tail - b.head).normalized(), b.roll, (b.tail - b.head).length) for b in eb}

    def place(name, head, length):
        b = eb[name]
        d, roll, _ = dirs[name]
        b.head = Vector(head)
        b.tail = Vector(head) + d * length
        b.roll = roll

    zh = zcr + 0.03 * H
    place('hips', (0, 0, zh), 0.06 * H)
    blk = H - zh
    place('spine', (0, 0, zh + 0.06 * H), 0.3 * blk)
    zsh = (arms['l']['top'] + arms['r']['top']) / 2 - 0.05 * H
    place('chest', (0, 0, zh + 0.06 * H + 0.3 * blk), max(0.05 * H, zsh - (zh + 0.06 * H + 0.3 * blk)))
    place('head', (0, 0, zsh), max(0.05 * H, 0.9 * H - zsh))
    for side, F, sgn in (('l', footL, 1), ('r', footR, -1)):
        kz = zcr * 0.5
        az = 0.075 * H
        place('upperleg.' + side, (F[0], F[1], zcr + 0.02 * H), (zcr + 0.02 * H) - kz)
        place('lowerleg.' + side, (F[0], F[1], kz), kz - az)
        place('foot.' + side, (F[0], F[1], az), az * 1.35)
        ft = eb['foot.' + side].tail
        place('toes.' + side, (ft.x, ft.y, ft.z), 0.08 * H)
        A = arms[side]
        L = A['top'] - A['bot']
        sh = (A['x'] - sgn * 0.04 * H, A['y'], A['top'] - 0.1 * L)
        lens = [0.34, 0.37, 0.12, 0.17]
        cur = Vector(sh)
        for nm, k in zip(('upperarm.', 'lowerarm.', 'wrist.', 'hand.'), lens):
            place(nm + side, tuple(cur), k * 0.9 * L)
            cur = eb[nm + side].tail.copy()
        hs = eb['hand.' + side]
        place('handslot.' + side, tuple(hs.head + (hs.tail - hs.head) * 0.8), 0.05 * H)
    bpy.ops.object.mode_set(mode='POSE')
    # 4) besoak behera (menhirraren besoak eroriak): jarrera → atseden-jarrera
    for side in ('l', 'r'):
        pb = arm.pose.bones['upperarm.' + side]
        A = arms[side]
        bpy.context.view_layer.update()
        head = arm.matrix_world @ pb.head
        cur = (arm.matrix_world @ pb.tail - head).normalized()
        want = (Vector(tuple(A['hand'])) - head).normalized()
        q = cur.rotation_difference(want)
        Mw = arm.matrix_world @ pb.matrix
        Rw = q.to_matrix().to_4x4()
        T1 = Matrix.Translation(head)
        T0 = Matrix.Translation(-head)
        pb.matrix = arm.matrix_world.inverted() @ (T1 @ Rw @ T0 @ Mw)
    bpy.context.view_layer.update()
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    # 5) pisuak
    me.vertices.foreach_set('co', V.ravel())
    me.update()
    bones = arm.data.bones

    def seg(name):
        b = bones[name]
        return np.array(arm.matrix_world @ b.head_local), np.array(arm.matrix_world @ b.tail_local)

    def dseg(name):
        p0, p1 = seg(name)
        d = p1 - p0
        t = np.clip(((V - p0) @ d) / max(d @ d, 1e-9), 0, 1)
        return np.linalg.norm(V - (p0 + t[:, None] * d), axis=1)

    W = {}
    blockw = (np.abs(x) <= bhw * 1.02) & (z >= zcr - 0.01 * H)
    # blokea → bularra (zurrun); hanken gainaldearekin nahasketa
    wleg = smooth(zcr + 0.05 * H, zcr - 0.03 * H, z)  # 1 behean, 0 blokean
    for side, sgn in (('l', 1), ('r', -1)):
        legside = (x * sgn > 0) & ~((np.abs(x) > bhw * 1.04) & (z > zcr))
        dU, dL, dF = dseg('upperleg.' + side), dseg('lowerleg.' + side), dseg('foot.' + side)
        dT = dseg('toes.' + side)
        best = np.argmin(np.stack([dU, dL, dF, dT], 1), 1)
        for i, nm in enumerate(('upperleg.', 'lowerleg.', 'foot.', 'toes.')):
            W[nm + side] = (best == i) * legside * wleg
        # besoa: blokearen kanpoan; sorbaldan blokearekin nahasketa
        armside = (x * sgn > bhw * 0.98) & (z > zcr)
        wa = smooth(bhw * 0.98, bhw * 1.12, x * sgn) * armside
        dd = np.stack([dseg(nm + side) for nm in ('upperarm.', 'lowerarm.', 'wrist.', 'hand.')], 1)
        best = np.argmin(dd, 1)
        for i, nm in enumerate(('upperarm.', 'lowerarm.', 'wrist.', 'hand.')):
            W[nm + side] = (best == i) * wa
    tot_l = sum(W[k] for k in W)
    W['chest'] = np.clip(1 - tot_l, 0, 1)
    tot = sum(W.values())
    for k in W:
        W[k] = W[k] / np.maximum(tot, 1e-6)
    ob.parent = arm
    ob.matrix_parent_inverse = arm.matrix_world.inverted()
    mod = ob.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
    for k, w in W.items():
        vg = ob.vertex_groups.new(name=k)
        for wv in np.unique(np.round(w[w > 0.002], 3)):
            idx = np.nonzero(np.abs(np.round(w, 3) - wv) < 1e-9)[0].tolist()
            vg.add(idx, float(wv), 'REPLACE')
    # 6) marka: bularreko ekaitz-harria (blokearen aurrealdean)
    zc = zh + 0.55 * blk
    band = blockw & (np.abs(z - zc) < 0.05 * H) & (np.abs(x) < 0.3 * bhw)
    yf = float(y[band].min()) if band.any() else -0.3 * H
    e = bpy.data.objects.new('core', None)
    bpy.context.scene.collection.objects.link(e)
    e.parent = arm
    e.parent_type = 'BONE'
    e.parent_bone = 'chest'
    bpy.context.view_layer.update()
    e.matrix_world = Matrix.Translation(Vector((0.0, yf - 0.02 * H, zc)))
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth()
    for im in bpy.data.images:
        if im.size[0] > a.tex or im.size[1] > a.tex:
            k = a.tex / max(im.size[0], im.size[1])
            im.scale(int(im.size[0] * k), int(im.size[1] * k))
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / 'mairu.glb'
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=False, export_image_format='JPEG',
                              export_image_quality=85, export_apply=False, export_skins=True, export_animations=False,
                              export_draco_mesh_compression_enable=False, export_yup=True)
    f = lambda v: [round(float(t), 3) for t in v]
    print(f'mairu: H {H}, hankartea {zcr:.3f}, blokea ±{bhw:.3f}, sorbaldak {zsh:.3f}, oinak {f(footL)} {f(footR)}')
    for side in ('l', 'r'):
        A = arms[side]
        print(f'  besoa {side}: goia {A["top"]:.3f} behea {A["bot"]:.3f} x {A["x"]:.3f} eskua {f(A["hand"])}')
    print('  pisuak:', {k: int((w > 0.5).sum()) for k, w in W.items() if (w > 0.5).sum()})
    print(f'  core: y {yf:.3f} z {zc:.3f} → {out} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
