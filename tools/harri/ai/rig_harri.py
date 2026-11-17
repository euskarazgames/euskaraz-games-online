#!/usr/bin/env python3
"""HARRI · Tripo modeloa → jokorako GLB riggeatua (Blender bpy, headless).

  <venv-bpy>/bin/python tools/harri/ai/rig_harri.py [--yaw 0] [--height 1.5]

Sarrera: tools/harri/ai/harri/tripo.glb (sortu.py harri). Irteera: public/harri/assets/harri_ia.glb
  · zentratua, oinak Z=0-n, altuera 1,5, aurpegia -Y (Blender) = +Z (glTF/three.js);
  · hezurdura: hips, torso, head, upperarm_L/R, forearm_L/R, hand_L/R, thigh_L/R, shin_L/R, foot_L/R
    (L = pertsonaiaren ezkerra = +X); pisu automatikoak (bone heat), huts eginez gero inguratzaileak;
  · testura ≤1024 px JPEG; >15k triangelu bada, decimate;
  · errenderrak: tools/harri/ai/harri/render_front.png, render_34.png, render_pose.png (Cycles CPU).
--yaw: Tripo-ren orientazioa zuzentzeko (gradu, Z ardatza), zabalera X-n jarri ondoren aurpegia -Y-ra ez badago.
"""
import argparse, math, pathlib, sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = HERE / 'harri' / 'tripo.glb'
OUT = ROOT / 'public/harri/assets/harri_ia.glb'
REN = HERE / 'harri'


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--yaw', type=float, default=0.0)
    ap.add_argument('--height', type=float, default=1.5)
    ap.add_argument('--tex', type=int, default=1024)
    ap.add_argument('--look', action='store_true', help='orientazioa egiaztatzeko errenderra bakarrik')
    a = ap.parse_args(argv)
    import bpy
    from mathutils import Vector, Euler

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SRC))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
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
        if o is not ob:
            bpy.data.objects.remove(o, do_unlink=True)
    ob.name = 'harri'
    me = ob.data
    me.name = 'harri'

    # --- orientazioa eta eskala (numpy, erpinak zuzenean)
    N = len(me.vertices)
    V = np.zeros(N * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(N, 3)
    if np.ptp(V[:, 1]) > np.ptp(V[:, 0]):  # zabalera (besoak) X-n
        V[:, [0, 1]] = np.stack([V[:, 1], -V[:, 0]], 1)
    if a.yaw:
        c, s = math.cos(math.radians(a.yaw)), math.sin(math.radians(a.yaw))
        V[:, [0, 1]] = np.stack([c * V[:, 0] - s * V[:, 1], s * V[:, 0] + c * V[:, 1]], 1)
    V[:, 2] -= V[:, 2].min()
    V *= a.height / V[:, 2].max()
    H = a.height
    feet = V[V[:, 2] < 0.05 * H]
    V[:, 0] -= (V[:, 0].min() + V[:, 0].max()) / 2
    V[:, 1] -= feet[:, 1].mean()
    me.vertices.foreach_set('co', V.ravel())
    me.update()
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    print('dims', np.ptp(V, 0), 'tris', sum(len(p.vertices) - 2 for p in me.polygons), flush=True)

    # --- garbiketa: erpin bikoitzak (bone heat-erako) eta decimate behar bada
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.object.mode_set(mode='OBJECT')
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > 15000:
        mod = ob.modifiers.new('dec', 'DECIMATE')
        mod.ratio = 14000 / tris
        bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()

    # --- testura: ≤1024 px, JPEG
    for im in bpy.data.images:
        if im.size[0] > a.tex:
            im.scale(a.tex, a.tex)
        im.file_format = 'JPEG'

    setup_render(bpy)
    if a.look:
        render(bpy, (0, -4, 0.75), REN / 'look_front.png')
        return

    # --- giltzadurak geometriatik
    N = len(me.vertices)
    V = np.zeros(N * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(N, 3)
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    half = np.abs(x).max()
    # hankak: oinen multzoak
    fL = V[(z < 0.06 * H) & (x > 0)]
    fR = V[(z < 0.06 * H) & (x < 0)]
    legx = (fL[:, 0].mean() - fR[:, 0].mean()) / 2
    # hankartea: erdiko zutabearen behealdea
    colm = (np.abs(x) < 0.03 * H) & (z > 0.15 * H)  # oinen barnealdea saihestu
    zcr = float(z[colm].min()) if colm.any() else 0.25 * H
    # besoak: kanpoko zerrenda (|x| > 0.62·half), hankartetik gora
    arms = {}
    for side, sg in (('L', 1), ('R', -1)):
        P = V[(x * sg > 0.6 * half) & (z > 0.15 * H)]
        top, bot = P[:, 2].max(), P[:, 2].min()
        hand = P[P[:, 2] < bot + 0.18 * (top - bot)]
        arms[side] = dict(top=top, bot=bot, hand=hand.mean(0), y=float(np.median(P[:, 1])))
        print(side, 'besoa', round(top / H, 3), round(bot / H, 3), np.round(hand.mean(0) / H, 3), flush=True)
    print('hankartea', round(zcr / H, 3), 'hankak x', round(legx / H, 3), flush=True)

    # --- hezurdura
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'harri_rig'
    arm.data.name = 'harri_rig'
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for b in list(eb):
        eb.remove(b)

    def bone(name, h, t, parent=None, connect=False):
        b = eb.new(name)
        b.head, b.tail = Vector(h), Vector(t)
        b.roll = 0
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    zh = zcr + 0.04 * H
    zsh = (arms['L']['top'] + arms['R']['top']) / 2
    zneck = zsh - 0.02 * H
    bone('hips', (0, 0, zh - 0.03 * H), (0, 0, zh + 0.06 * H))
    bone('torso', (0, 0, zh + 0.06 * H), (0, 0, zneck), 'hips', True)
    bone('head', (0, 0, zneck), (0, 0, H * 0.98), 'torso', True)
    for side, sg in (('L', 1), ('R', -1)):
        A = arms[side]
        sh = Vector((sg * 0.66 * half, A['y'], zsh - 0.08 * H))
        hc = Vector(tuple(A['hand']))
        hand_top = hc + Vector((0, 0, 0.07 * H))
        el = sh.lerp(hand_top, 0.5) + Vector((0, 0.02 * H, 0))
        tip = Vector((hc.x, hc.y, A['bot'] + 0.01 * H))
        bone('upperarm_' + side, sh, el, 'torso')
        bone('forearm_' + side, el, hand_top, 'upperarm_' + side, True)
        bone('hand_' + side, hand_top, tip, 'forearm_' + side, True)
        F = fL if side == 'L' else fR
        fx, fy = F[:, 0].mean(), F[:, 1].mean()
        toe = F[:, 1].min()  # -Y = aurrera
        kz = zcr * 0.52
        az = 0.07 * H
        bone('thigh_' + side, (sg * legx * 0.9, fy, zh), (fx, fy + 0.01 * H, kz), 'hips')
        bone('shin_' + side, (fx, fy + 0.01 * H, kz), (fx, fy, az), 'thigh_' + side, True)
        bone('foot_' + side, (fx, fy, az), (fx, toe + 0.02 * H, 0.02 * H), 'shin_' + side, True)
    bpy.ops.object.mode_set(mode='OBJECT')

    # --- parent: pisu automatikoak
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    empty = [v.index for v in me.vertices if not v.groups or max(g.weight for g in v.groups) < 1e-4]
    print('pisurik gabeko erpinak', len(empty), '/', len(me.vertices), flush=True)
    if len(empty) > 0.02 * len(me.vertices):
        print('bone heat-ek huts egin du → inguratzaileak', flush=True)
        ob.parent = None
        for vg in list(ob.vertex_groups):
            ob.vertex_groups.remove(vg)
        ob.modifiers.clear()
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
    elif empty:  # gutxi batzuk: hurbilen dagoen hezurrari
        vg = ob.vertex_groups['torso']
        vg.add(empty, 1.0, 'REPLACE')

    # --- errenderrak (atseden-jarrera)
    render(bpy, (0, -4, 0.75), REN / 'render_front.png')
    render(bpy, (2.83, -2.83, 1.3), REN / 'render_34.png')
    # --- jarrera-proba: besoak eta hankak
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    pb = arm.pose.bones
    from mathutils import Matrix

    def rotw(name, axis, deg):  # biraketa munduko ardatzean (atseden-jarrerarekiko)
        p = pb[name]
        p.rotation_mode = 'QUATERNION'
        M = p.bone.matrix_local.to_3x3()
        p.rotation_quaternion = (M.inverted() @ Matrix.Rotation(math.radians(deg), 3, axis) @ M).to_quaternion()
    rotw('upperarm_L', 'Y', -65)   # ezker besoa alboetara gora
    rotw('forearm_L', 'Y', -30)
    rotw('upperarm_R', 'X', -75)   # eskuin besoa aurrera
    rotw('forearm_R', 'X', -40)
    rotw('thigh_L', 'X', -35)      # ezker hanka aurrera
    rotw('shin_L', 'X', 45)
    rotw('thigh_R', 'X', 25)       # eskuina atzera
    rotw('head', 'Z', 15)
    bpy.ops.object.mode_set(mode='OBJECT')
    render(bpy, (0, -4, 0.75), REN / 'render_pose.png')
    render(bpy, (-4, 0, 0.75), REN / 'render_pose_side.png')
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    for b in pb:
        b.rotation_quaternion = (1, 0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT')

    # --- esportazioa
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True,
                              export_image_format='JPEG', export_jpeg_quality=85, export_skins=True,
                              export_animations=False, export_draco_mesh_compression_enable=False,
                              export_yup=True, export_apply=False)
    print('OUT', OUT, OUT.stat().st_size // 1024, 'KB', flush=True)


def setup_render(bpy):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'  # CPU (headless, GPU/EGL gabe)
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.render.resolution_x = 640
    sc.render.resolution_y = 640
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.95, 0.92, 0.86, 1)
    bg.inputs[1].default_value = 0.9
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.0
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(50), math.radians(-20), math.radians(-30))
    sc.collection.objects.link(so)
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 1.9
    co = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co


def render(bpy, pos, path):
    from mathutils import Vector
    co = bpy.context.scene.camera
    co.location = Vector(pos)
    target = Vector((0, 0, 0.75))
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
