#!/usr/bin/env python3
"""Convert a Fal-produced pelotari GLB to Blender-editable rig and compact custom WebGL mesh.

This is a FIRST-PASS auto-rig only. Review weights, hands, UVs and facial quality
in Blender; do not release the character based solely on CI success.
Usage: blender -b --factory-startup --python scripts/pilota/blender_prepare.py -- --source raw.glb --out public/pilota/characters/jon
"""
import argparse
import math
import os
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector

def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--texture", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--target-tris", type=int, default=14500)
    return ap.parse_args(argv)

# Names and order are IDENTICAL to Body.SKEL in public/pilota/index.html.
BONES = [
    ("pelvis", None, (0, .98, 0)),
    ("spine", "pelvis", (0, 1.07, 0)),
    ("head", "spine", (0, 1.655, 0)),
    ("shL", "spine", (.19, 1.50, 0)),
    ("elL", "shL", (.19, 1.21, 0)),
    ("haL", "elL", (.19, .955, 0)),
    ("shR", "spine", (-.19, 1.50, 0)),
    ("elR", "shR", (-.19, 1.21, 0)),
    ("haR", "elR", (-.19, .955, 0)),
    ("hipL", "pelvis", (.092, .93, 0)),
    ("knL", "hipL", (.092, .485, 0)),
    ("anL", "knL", (.092, .055, 0)),
    ("hipR", "pelvis", (-.092, .93, 0)),
    ("knR", "hipR", (-.092, .485, 0)),
    ("anR", "knR", (-.092, .055, 0)),
]
# Approximate influence segments in the game's (X, Y-up, Z-forward) frame.
SEG = [
    ((0, .95, 0), (0, 1.14, 0)),
    ((0, 1.12, 0), (0, 1.53, 0)),
    ((0, 1.55, 0), (0, 1.83, 0)),
    ((.23, 1.51, 0), (.35, 1.28, 0)),
    ((.35, 1.28, 0), (.46, 1.07, 0)),
    ((.46, 1.07, 0), (.54, .99, 0)),
    ((-.23, 1.51, 0), (-.35, 1.28, 0)),
    ((-.35, 1.28, 0), (-.46, 1.07, 0)),
    ((-.46, 1.07, 0), (-.54, .99, 0)),
    ((.11, .90, 0), (.12, .53, 0)),
    ((.12, .53, 0), (.12, .24, 0)),
    ((.12, .24, 0), (.12, .065, .06)),
    ((-.11, .90, 0), (-.12, .53, 0)),
    ((-.12, .53, 0), (-.12, .24, 0)),
    ((-.12, .24, 0), (-.12, .065, .06)),
]

def game(v):
    # Blender Z-up -> game's Y-up. A Blender-front model normally faces -Y.
    return (float(v.x), float(v.z), -float(v.y))

def blend_to_game_bone(p):
    return (p[0], -p[2], p[1])

def weights(p, arm_extent):
    """Weight fit to each athlete's body: realistic hand motion needs palm bones.

    Original Fal bodies are not identical in shoulder width or arm reach.
    Rather than treating all as a generic 1.8 m body, adapt lateral rig
    anchors to the actual mesh. Clamp extremity palms to mostly hand influence.
    """
    arm_scale=max(.58,min(1.15,arm_extent/.54))
    # A mesh hand can extend much less laterally than the standard bind pose.
    # If the finger/knuckle points blend with the elbow, it appears detached
    # from the contact marker during the fastest pelota strikes.
    if .70 < p[1] < 1.28 and abs(p[0]) > arm_extent*.76:
        return [(8,.92),(7,.08)] if p[0]<0 else [(5,.92),(4,.08)]
    scores = []
    for i, (a, b) in enumerate(SEG):
        if 3 <= i <= 8:
            a=(a[0]*arm_scale,a[1],a[2])
            b=(b[0]*arm_scale,b[1],b[2])
        ab = [b[k] - a[k] for k in range(3)]
        t = sum((p[k] - a[k]) * ab[k] for k in range(3)) / (sum(q*q for q in ab) + 1e-8)
        t = max(0., min(1., t))
        d2 = sum((p[k] - (a[k] + ab[k] * t))**2 for k in range(3))
        if p[1] > 1.60 and i == 2: d2 *= .1
        if p[1] > 1.12 and abs(p[0]) < .17 and i == 1: d2 *= .20
        if p[1] < .90 and i in (9,10,11,12,13,14) and p[0]*SEG[i][0][0] > 0: d2 *= .18
        scores.append((d2, i))
    scores.sort()
    chosen = scores[:4]
    strength = [math.exp(-min(1.,d)*65.) for d,_ in chosen]
    total = sum(strength) or 1.
    return [(idx, v / total) for v, (_,idx) in zip(strength, chosen)]

def base_color_image(mesh):
    for m in mesh.data.materials:
        if not m or not m.use_nodes: continue
        nodes = m.node_tree.nodes
        bsdfs = [n for n in nodes if n.type == 'BSDF_PRINCIPLED']
        for bsdf in bsdfs:
            color = bsdf.inputs.get("Base Color")
            if color and color.is_linked:
                src = color.links[0].from_node
                if src.type == 'TEX_IMAGE' and src.image:
                    return src.image
    return None

def main():
    arg = parse_args()
    dest = Path(arg.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=arg.source)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes: raise RuntimeError("Fal GLB has no mesh objects.")
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in meshes:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "Pilotari_GameMesh"

    co = [v.co for v in obj.data.vertices]
    zlo,zhi = min(v.z for v in co),max(v.z for v in co)
    if zhi - zlo < .5:
        raise RuntimeError("Unexpected height: model may be sideways; manual Blender orientation required.")
    center = ((min(v.x for v in co) + max(v.x for v in co)) / 2,
              (min(v.y for v in co) + max(v.y for v in co)) / 2)
    scale = 1.80 / (zhi-zlo)
    for v in obj.data.vertices:
        v.co = Vector(((v.co.x-center[0])*scale, (v.co.y-center[1])*scale, (v.co.z-zlo)*scale))
    obj.data.update()

    # Retain the highest-impact detail while reducing mobile draw cost.
    tris = sum(len(p.vertices)-2 for p in obj.data.polygons)
    if tris > arg.target_tris:
        mod=obj.modifiers.new("MobileLOD_Decimate","DECIMATE")
        mod.ratio=arg.target_tris/tris
        bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new("Triangulate","TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.calc_loop_triangles()
    print(f"VERTICES={len(obj.data.vertices)} TRIS={len(obj.data.loop_triangles)}")

    # Save diffuse texture for the custom WebGL skin shader; the source GLB is
    # also exported with its original material nodes for Blender artists.
    # Use Fal's separate texture output: some Blender glTF builds report packed
    # image data unavailable even though a standalone PBR texture was returned.
    img=bpy.data.images.load(arg.texture,check_existing=False)
    try:
        _=img.pixels[0]  # force lazy IO in Blender background mode
    except Exception as exc:
        raise RuntimeError("Cannot decode external Fal texture") from exc
    if not img.has_data:
        img.reload()
        _=img.pixels[0]
    if max(img.size) > 1024: img.scale(1024, 1024)
    for mat in obj.data.materials:
        if mat and mat.use_nodes:
            bsdfs=[n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED"]
            if bsdfs:
                tex=mat.node_tree.nodes.new("ShaderNodeTexImage")
                tex.image=img
                mat.node_tree.links.new(tex.outputs["Color"],bsdfs[0].inputs["Base Color"])
    img.filepath_raw = str(dest) + "_diffuse.png"
    img.file_format = "PNG"
    img.save()
    uvlayer=obj.data.uv_layers.active
    if uvlayer is None: raise RuntimeError("No UVs in source mesh.")

    for i, (name, _, _) in enumerate(BONES):
        obj.vertex_groups.new(name=name)
    arm_extent=max(abs(v.co.x) for v in obj.data.vertices)
    print(f"PLAYER_ARM_EXTENT={arm_extent:.4f}")
    vert_weights = []
    for v in obj.data.vertices:
        vv=weights(game(v.co),arm_extent)
        vert_weights.append(vv)
        for idx,w in vv:
            obj.vertex_groups[BONES[idx][0]].add([v.index],float(w),"REPLACE")

    # Build an editable Blender armature with explicit, game-compatible names.
    arm=bpy.data.armatures.new("Pilotari_Rig_Data")
    rig=bpy.data.objects.new("Pilotari_Rig",arm)
    bpy.context.collection.objects.link(rig)
    for o in bpy.context.selected_objects: o.select_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    for i,(name,parent,p) in enumerate(BONES):
        b=arm.edit_bones.new(name)
        q=blend_to_game_bone(p)
        b.head=Vector(q)
        if name in ("shL","shR","elL","elR","hipL","hipR","knL","knR"):
            side=1 if name.endswith('L') else -1
            b.tail=Vector((q[0]+side*.055,q[1],q[2]-.095))
        else: b.tail=Vector((q[0],q[1],q[2]+.10))
    for name,parent,_ in BONES:
        if parent: arm.edit_bones[name].parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    mod=obj.modifiers.new("Skin_To_Pilotari_Rig","ARMATURE")
    mod.object=rig
    obj.parent=rig
    obj.select_set(True)
    rig.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(dest)+"_rig.blend")

    # Independently export the static, Blender-friendly preview GLB.
    bpy.ops.export_scene.gltf(filepath=str(dest)+"_optimized.glb",export_format="GLB",
                              use_selection=True,export_yup=True,export_materials="NONE")

    # Export compact 19-float vertex format matching GL.meshSkin in the game.
    # Each vertex: position(3), normal(3), uv(2), material(3), joints(4), weights(4).
    # Body.SKEL inverse binds continue to drive the game's animation system.
    indexmap={}
    vertexdata=[]
    indices=[]
    for tri in obj.data.loop_triangles:
        for loop_id in tri.loops:
            lp=obj.data.loops[loop_id]
            vid=lp.vertex_index
            uv=uvlayer.data[loop_id].uv
            key=(vid,round(float(uv.x),5),round(float(uv.y),5))
            if key not in indexmap:
                v=obj.data.vertices[vid]
                p=game(v.co)
                n=game(v.normal)
                joint=vert_weights[vid][:4]
                js=[float(q[0]) for q in joint]+[0.]* (4-len(joint))
                ws=[float(q[1]) for q in joint]+[0.]* (4-len(joint))
                # palette index 5 (white), texture mask 1, secondary index 5.
                # The game GL.tex uploads UV textures with flipY=false; the
                # GLB viewer has the correct orientation with Blender V as-is.
                # Do NOT invert V here (the original atlas appeared on faces).
                vertexdata.extend(list(p)+list(n)+[float(uv.x),float(uv.y)]
                                  +[5.,1.,5.]+js+ws)
                indexmap[key]=len(indexmap)
            indices.append(indexmap[key])
    if len(indexmap)>65535:raise RuntimeError(f"WebGL1 16-bit index overflow: {len(indexmap)}")
    if not indices:raise RuntimeError("Mesh has no triangles.")
    with open(str(dest)+"_skin.bin","wb") as f:
        f.write(struct.pack("<II",len(indexmap),len(indices)))
        f.write(struct.pack("<"+str(len(vertexdata))+"f",*vertexdata))
        f.write(struct.pack("<"+str(len(indices))+"H",*indices))
    with open(str(dest)+"_report.txt","w") as f:
        f.write(f"Vertices: {len(indexmap)}\nTriangles: {len(indices)//3}\n")
        f.write(f"Height: 1.8 metres\nMaterials: {len(obj.data.materials)}\nArm extent: {arm_extent:.4f}\n")
        f.write("Review: facial details, wrist deformation, hand contact, orientation, feet, shadows, mobile FPS.\n")
        f.write("IMPORTANT: generated rig/weights are preliminary and not human-artist validated.\n")
    print("BLENDER_PILOTARI_READY",dest,len(indexmap),len(indices)//3)

if __name__=="__main__":
    main()
