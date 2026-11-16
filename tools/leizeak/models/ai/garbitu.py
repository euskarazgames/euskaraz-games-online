#!/usr/bin/env python3
"""LEIZEEN DEIA: IA-modeloak jokorako prestatu (Blender, bpy).

tools/leizeak/models/ai/<izena>/tripo.glb → public/assets/models/leizeak/<izena>.glb
  · sare guztiak bakarrean, jatorria oinetan (Y = 0) eta erdian (X = Z = 0), altuera finkoa (m);
  · poligonoak murriztu (gehienez --faces), normalak leundu;
  · testura 1024 px JPEG (webean arin); Draco gabe (gero meshopt.mjs).

  /home/user/.venvs/bpy311/bin/python tools/leizeak/models/ai/garbitu.py mikelats:4.6 akerbeltz:4.2
"""
import argparse, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = ROOT / 'public/assets/models/leizeak'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('items', nargs='+', help='izena:altuera (m)')
    ap.add_argument('--faces', type=int, default=8000)
    ap.add_argument('--tex', type=int, default=1024)
    a = ap.parse_args()
    import bpy, bmesh
    from mathutils import Vector
    OUT.mkdir(parents=True, exist_ok=True)
    for it in a.items:
        name, h = (it.split(':') + ['4'])[:2]
        h = float(h)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(HERE / name / 'tripo.glb'))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        if not meshes:
            sys.exit(name + ': sarerik ez')
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active
        # gurasoak kendu, transformazioak aplikatu
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for o in list(bpy.context.scene.objects):
            if o.type != 'MESH':
                bpy.data.objects.remove(o, do_unlink=True)
        # neurriak (Blender: Z gora)
        pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        s = h / max(1e-6, mx.z - mn.z)
        cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
        for v in ob.data.vertices:
            v.co = Vector(((v.co.x - cx) * s, (v.co.y - cy) * s, (v.co.z - mn.z) * s))
        nf = len(ob.data.polygons)
        if nf > a.faces:
            m = ob.modifiers.new('dec', 'DECIMATE')
            m.ratio = a.faces / nf
            bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.ops.object.shade_smooth()
        # testurak txikitu
        for img in bpy.data.images:
            if img.size[0] > a.tex or img.size[1] > a.tex:
                k = a.tex / max(img.size[0], img.size[1])
                img.scale(int(img.size[0] * k), int(img.size[1] * k))
        out = OUT / f'{name}.glb'
        bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=False, export_image_format='JPEG',
                                  export_image_quality=85, export_apply=True, export_draco_mesh_compression_enable=False,
                                  export_animations=False, export_yup=True)
        print(f'{name}: {nf} → {len(ob.data.polygons)} aurpegi, altuera {h} m, {out.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
