"""HARRI · pertsonaien modeloak Blender-en (bpy) prozeduralki eraikita → GLB.

  python3.13 tools/harri/blender/harri_eraiki.py --out public/harri/assets [--render tools/harri/blender/renders]

Hiru pertsonaia: harri.glb (02 lamina: golem txikia, harri epela, begi anbarrak, goroldioa eta margaritak,
BULAR LEUNA, ikurrik gabe), neska.glb (kastroko neska) eta basurdea.glb.
Artikulazioak hutsune (empty) izendatuak dira; jokoak (public/harri/src/models.js) prozeduralki animatzen ditu.
Blender: -Y aurrera, Z gora → glTF/three.js: +Z aurrera, Y gora. L = pertsonaiaren ezkerra = +X.
"""
import bpy, bmesh, math, random, sys, os, argparse
from mathutils import Vector, Matrix, noise

def s2l(c):  # sRGB → lineala
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)

def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

# ───────────────────────────── geometria-eraikitzailea ─────────────────────────────
class Geo:
    """Artikulazio bakoitzeko geometria metatua: erpinak, aurpegiak, materiala, koloreak (bertizeko izkinak) eta UVak."""
    def __init__(self):
        self.v, self.f, self.m, self.col, self.uv = [], [], [], [], []

    def add_bm(self, bm, mat, color_fn, uv_scale=2.2):
        bm.normal_update()
        base = len(self.v)
        idx = {}
        for i, vert in enumerate(bm.verts):
            idx[vert] = base + i; self.v.append(vert.co.copy())
        for face in bm.faces:
            self.f.append([idx[l.vert] for l in face.loops]); self.m.append(mat)
            n = face.normal; ax = max(range(3), key=lambda k: abs(n[k]))
            cs, uvs = [], []
            for l in face.loops:
                cs.append(color_fn(l.vert.co, l.vert.normal))
                p = l.vert.co
                u, w = ((p.y, p.z) if ax == 0 else (p.x, p.z) if ax == 1 else (p.x, p.y))
                uvs.append((u * uv_scale, w * uv_scale))
            self.col.append(cs); self.uv.append(uvs)
        bm.free()

    def build(self, name, mats, smooth_angle=32):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(v) for v in self.v], [], self.f)
        me.update()
        for mt in mats: me.materials.append(mt)
        for i, poly in enumerate(me.polygons): poly.material_index = self.m[i]
        ca = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='CORNER')
        uvl = me.uv_layers.new(name='UVMap')
        li = 0
        for i, poly in enumerate(me.polygons):
            for k, _ in enumerate(poly.loop_indices):
                c = self.col[i][k]; ca.data[poly.loop_start + k].color = (c[0], c[1], c[2], 1.0)
                uvl.data[poly.loop_start + k].uv = self.uv[i][k]
        try:
            me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        except Exception:
            for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        return ob


def rock_bm(size, seed, subdiv=2, rough=0.08, facets=10, fdist=(0.74, 0.88), flat_front=None, cut=1.0):
    """Harri-zati faseteatua: ikosfera + zarata + ebaketa-planoak (aurpegi lauak, ertz biribilduak)."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    rnd = random.Random(seed)
    planes = []
    for _ in range(facets):
        n = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
        planes.append((n, rnd.uniform(*fdist)))
    if flat_front is not None:  # aurrealde leuna (bularra): plano bakarra, ikurrik ez
        planes.append((Vector((0, -1, 0)), flat_front))
    off = Vector((rnd.random() * 50, rnd.random() * 50, rnd.random() * 50))
    for vert in bm.verts:
        p = vert.co.copy()
        p *= 1.0 + rough * noise.noise(p * 1.6 + off)
        for n, d in planes:
            dist = p.dot(n)
            if dist > d: p -= n * (dist - d) * cut
        vert.co = Vector((p.x * size[0], p.y * size[1], p.z * size[2]))
    return bm


def blob_bm(size, seed, subdiv=2, rough=0.25):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    off = Vector((seed * 3.1, seed * 1.7, seed * 2.3))
    for vert in bm.verts:
        p = vert.co.copy(); p *= 1.0 + rough * noise.noise(p * 2.4 + off)
        vert.co = Vector((p.x * size[0], p.y * size[1], p.z * size[2]))
    return bm


def sphere_bm(size, seg=16, ring=10):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1.0)
    for vert in bm.verts: vert.co = Vector((vert.co.x * size[0], vert.co.y * size[1], vert.co.z * size[2]))
    return bm


def xform(bm, loc=(0, 0, 0), rot=(0, 0, 0)):
    M = Matrix.Translation(Vector(loc)) @ (Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X'))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts); return bm


def cone_bm(r1, r2, depth, seg=10):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth); return bm


def make_mat(name, color, rough=0.9, vcol=False, emit=None, emit_strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*s2l(color), 1)
    bsdf.inputs['Roughness'].default_value = rough
    if vcol:
        vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    if emit is not None:
        key = 'Emission Color' if 'Emission Color' in bsdf.inputs else 'Emission'
        bsdf.inputs[key].default_value = (*s2l(emit), 1)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    return m


def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.empty_display_size = 0.05
    bpy.context.scene.collection.objects.link(e)
    e.location = Vector(loc)
    if parent is not None:
        e.parent = parent; e.matrix_parent_inverse = parent.matrix_world.inverted()
    bpy.context.view_layer.update()
    return e


def attach(ob, parent, world_loc):
    ob.location = Vector(world_loc); bpy.context.view_layer.update()
    ob.parent = parent; ob.matrix_parent_inverse = parent.matrix_world.inverted()
    bpy.context.view_layer.update()
    return ob


def rock_color_fn(base, seed, moss=0.0, moss_col=(0.42, 0.56, 0.20), ao=0.30, var=0.10, center_z=0.0):
    rnd = random.Random(seed)
    tint = Vector(base) * (1 + rnd.uniform(-0.07, 0.07))
    tint = Vector((tint.x * (1 + rnd.uniform(-.03, .03)), tint.y, tint.z * (1 + rnd.uniform(-.04, .04))))
    off = Vector((seed * 7.3, seed * 2.1, seed * 5.9))

    def fn(co, n):
        k = 1 + var * noise.noise(co * 9 + off) + 0.05 * noise.noise(co * 31 + off)
        shade = (1 - ao) + ao * (0.5 + 0.5 * n.z)
        c = tint * k * shade
        if moss > 0:
            mz = max(0.0, n.z - 0.35) / 0.65 * moss
            mz *= 0.7 + 0.6 * max(0.0, noise.noise(co * 7 + off))
            mz = min(1.0, mz)
            c = c.lerp(Vector(moss_col) * k, mz)
        return s2l((max(0, min(1, c.x)), max(0, min(1, c.y)), max(0, min(1, c.z))))
    return fn


def flat_color(c, var=0.06, seed=0):
    off = Vector((seed * 3.3, seed * 1.1, seed * 2.7))
    def fn(co, n):
        k = 1 + var * noise.noise(co * 12 + off)
        return s2l(tuple(max(0, min(1, x * k)) for x in c))
    return fn


def daisy(geo, center, normal, scale, seed, petal_mat, center_mat):
    """Margarita: 9 petalo zuri luzanga + erdigune horia."""
    rnd = random.Random(seed)
    up = Vector(normal).normalized()
    rot_q = Vector((0, 0, 1)).rotation_difference(up)
    R = rot_q.to_matrix().to_4x4()
    n_pet = 9
    for i in range(n_pet):
        a = i / n_pet * math.tau + rnd.uniform(-.1, .1)
        bm = sphere_bm((0.5 * scale, 0.16 * scale, 0.05 * scale), seg=8, ring=6)
        xform(bm, (0.55 * scale, 0, 0.02 * scale), (0, -0.25, 0))
        bmesh.ops.transform(bm, matrix=Matrix.Rotation(a, 4, 'Z'), verts=bm.verts)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(center)) @ R, verts=bm.verts)
        geo.add_bm(bm, petal_mat, flat_color((1.0, 0.98, 0.93), 0.03, seed + i))
    bm = sphere_bm((0.24 * scale, 0.24 * scale, 0.12 * scale), seg=10, ring=6)
    xform(bm, (0, 0, 0.06 * scale))
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(center)) @ R, verts=bm.verts)
    geo.add_bm(bm, center_mat, flat_color((0.98, 0.76, 0.18), 0.08, seed + 99))


def clear_scene():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)


# ─────────────────────────────────── HARRI ───────────────────────────────────
ROCK = hexc('#a8957c')          # harri epela, beix-grisa (02 lamina)
ROCK_D = hexc('#8f7d67')
MOSS = hexc('#6f9a33')

def build_harri():
    clear_scene()
    M = {
        'rock': make_mat('harri_rock', ROCK, 0.92, vcol=True),
        'moss': make_mat('harri_moss', MOSS, 1.0, vcol=True),
        'petal': make_mat('harri_petal', hexc('#fff8ec'), 0.6, vcol=True),
        'center': make_mat('harri_center', hexc('#f2c23a'), 0.6, vcol=True),
        'white': make_mat('harri_eye_white', hexc('#f7f1e6'), 0.25),
        'iris': make_mat('harri_iris', hexc('#d98a22'), 0.3, emit=hexc('#a35a0c'), emit_strength=0.25),
        'iris2': make_mat('harri_iris_light', hexc('#f2b847'), 0.3, emit=hexc('#c07a10'), emit_strength=0.3),
        'pupil': make_mat('harri_pupil', hexc('#24150d'), 0.2),
        'spec': make_mat('harri_spec', hexc('#ffffff'), 0.1, emit=hexc('#ffffff'), emit_strength=2.0),
        'mouth': make_mat('harri_mouth', hexc('#4a1d12'), 0.7),
        'tongue': make_mat('harri_tongue', hexc('#d8715a'), 0.6),
    }
    ML = [M['rock'], M['moss'], M['petal'], M['center']]  # Geo materialen indizeak: 0 rock, 1 moss, 2 petal, 3 center
    root = empty('harri', (0, 0, 0))
    hips = empty('hips', (0, 0, 0.44), root)
    torso = empty('torso', (0, 0, 0.56), hips)
    head = empty('head', (0, 0, 1.08), torso)

    # ── Enborra: bular handia (aurrealde leuna, ikurrik gabe) + sabela + bizkarra
    g = Geo()
    g.add_bm(xform(rock_bm((0.38, 0.30, 0.27), 11, subdiv=3, rough=0.04, facets=8, fdist=(0.84, 0.93), flat_front=0.92), (0, 0.0, 0.19)), 0, rock_color_fn(ROCK, 11, ao=0.25, var=0.07))
    for sx in (-1, 1):  # saihets-harriak (bularra leun mantentzen da)
        g.add_bm(xform(rock_bm((0.14, 0.17, 0.2), 17 + sx, subdiv=2), (sx * 0.31, 0.03, 0.12)), 0, rock_color_fn(ROCK_D, 17 + sx, moss=0.4))
    g.add_bm(xform(rock_bm((0.31, 0.25, 0.16), 12, subdiv=2, facets=9), (0, 0.02, -0.06)), 0, rock_color_fn(ROCK_D, 12))
    g.add_bm(xform(rock_bm((0.30, 0.16, 0.22), 13, subdiv=2), (0, 0.18, 0.2)), 0, rock_color_fn(ROCK_D, 13, moss=0.6))
    # lepoko harri txikiak eta goroldio-orbanak bizkarrean

    g.add_bm(xform(blob_bm((0.14, 0.09, 0.05), 15), (0.12, 0.22, 0.36)), 1, rock_color_fn(MOSS, 15, ao=0.2, var=0.15))
    g.add_bm(xform(blob_bm((0.08, 0.06, 0.04), 16), (-0.24, 0.12, 0.38)), 1, rock_color_fn(MOSS, 16, ao=0.2, var=0.15))
    attach(g.build('torso_mesh', ML), torso, (0, 0, 0.56))

    # ── Burua: harri zabala, kopeta-harriak, masailak, goroldio-txapela eta margaritak
    g = Geo()
    g.add_bm(xform(rock_bm((0.39, 0.34, 0.30), 21, subdiv=3, rough=0.05, facets=9, fdist=(0.84, 0.94), flat_front=0.90), (0, 0, 0.06)), 0, rock_color_fn(ROCK, 21, moss=0.4, ao=0.25, var=0.07))
    for sx in (-1, 1):  # masailak / alboko harriak
        g.add_bm(xform(rock_bm((0.11, 0.14, 0.14), 22 + sx, subdiv=2), (sx * 0.36, -0.02, 0.0), (0, 0, sx * 0.2)), 0, rock_color_fn(ROCK_D, 22 + sx, moss=0.3))
        g.add_bm(xform(rock_bm((0.09, 0.10, 0.10), 24 + sx, subdiv=2), (sx * 0.30, 0.16, 0.18)), 0, rock_color_fn(ROCK_D, 24 + sx, moss=0.8))
    # goroldio-txapela
    cap = blob_bm((0.355, 0.32, 0.17), 31, subdiv=3, rough=0.16)
    for v in cap.verts:
        if v.co.z < 0: v.co.z *= 0.25
    g.add_bm(xform(cap, (0, 0.06, 0.30)), 1, rock_color_fn(MOSS, 31, ao=0.35, var=0.22))
    for i, (x, y, z, s) in enumerate([(0.26, -0.13, 0.27, .08), (-0.29, -0.08, 0.26, .085), (0.06, -0.25, 0.33, .07), (-0.14, 0.26, 0.26, .08), (0.31, 0.12, 0.24, .07), (-0.33, 0.12, 0.2, .06), (0.36, -0.02, 0.16, .05), (-0.08, -0.27, 0.3, .06)]):
        g.add_bm(xform(blob_bm((s * 1.4, s * 1.2, s * 0.9), 40 + i), (x, y, z)), 1, rock_color_fn(MOSS, 40 + i, ao=0.3, var=0.22))
    # margaritak (02 lamina: hiru buruan)
    daisy(g, (0.17, -0.13, 0.42), (0.3, -0.45, 1), 0.105, 51, 2, 3)
    daisy(g, (-0.21, -0.07, 0.41), (-0.35, -0.3, 1), 0.09, 52, 2, 3)
    daisy(g, (0.03, 0.17, 0.44), (0, 0.3, 1), 0.08, 53, 2, 3)
    daisy(g, (-0.32, -0.18, 0.24), (-0.6, -0.6, 0.6), 0.06, 54, 2, 3)
    attach(g.build('head_mesh', ML), head, (0, 0, 1.0))

    # ── Aurpegia: begiak (hutsune bakoitza eskalatuz kliskatzen dira), bekainak, ahoa
    for side, sx in (('L', 1), ('R', -1)):
        eye = empty('eye_' + side, (sx * 0.135, -0.285, 1.19), head)
        parts = [('white', (0.088, 0.04, 0.10), (0, 0, 0)), ('iris', (0.064, 0.02, 0.072), (0.0, -0.028, -0.005)),
                 ('iris2', (0.046, 0.02, 0.05), (0.0, -0.034, -0.012)), ('pupil', (0.032, 0.02, 0.036), (sx * -0.004, -0.044, -0.004)),
                 ('spec', (0.014, 0.01, 0.014), (sx * 0.012, -0.056, 0.022))]
        for mk, sz, off in parts:
            bm = sphere_bm(sz, 18, 12); me = bpy.data.meshes.new('eye_' + mk + '_' + side); bm.to_mesh(me); bm.free()
            for p in me.polygons: p.use_smooth = True
            me.materials.append(M[mk]); ob = bpy.data.objects.new('eye_' + mk + '_' + side, me); bpy.context.scene.collection.objects.link(ob)
            attach(ob, eye, (sx * 0.135 + off[0], -0.285 + off[1], 1.19 + off[2]))
        brow = empty('brow_' + side, (sx * 0.14, -0.30, 1.295), head)
        g = Geo(); g.add_bm(xform(rock_bm((0.115, 0.07, 0.045), 60 + sx, subdiv=2, facets=6, rough=0.04), (0, 0, 0), (0, sx * 0.14, 0)), 0, rock_color_fn(ROCK_D, 60 + sx, ao=0.15))
        attach(g.build('brow_mesh_' + side, ML), brow, (sx * 0.14, -0.30, 1.295))
    mouth = empty('mouth', (0, -0.31, 1.06), head)
    # ahoa: "D" alderantzizkoa (irribarre irekia), sakonera txikiarekin
    bm = bmesh.new(); pts = []
    W, H = 0.135, 0.095
    for i in range(17):
        a = math.pi + i / 16 * math.pi
        pts.append(bm.verts.new((W * math.cos(a), 0, -H * abs(math.sin(a)) * 1.0 + 0.0)))
    face = bm.faces.new(pts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += 0.03
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('mouth_mesh'); bm.to_mesh(me); bm.free(); me.materials.append(M['mouth'])
    ob = bpy.data.objects.new('mouth_mesh', me); bpy.context.scene.collection.objects.link(ob); attach(ob, mouth, (0, -0.322, 1.065))
    bm = sphere_bm((0.07, 0.006, 0.032), 12, 8); me = bpy.data.meshes.new('tongue_mesh'); bm.to_mesh(me); bm.free(); me.materials.append(M['tongue'])
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new('tongue_mesh', me); bpy.context.scene.collection.objects.link(ob); attach(ob, mouth, (0, -0.325, 1.0))

    # ── Besoak: sorbalda-harri handia + besoa + beso-aurrea + ukabil handia
    for side, sx in (('L', 1), ('R', -1)):
        sh = (sx * 0.43, 0.02, 0.98)
        up = empty('upperarm_' + side, sh, torso)
        g = Geo()
        g.add_bm(xform(rock_bm((0.19, 0.18, 0.16), 70 + sx, subdiv=2, facets=7), (0, 0, 0.04)), 0, rock_color_fn(ROCK, 70 + sx, moss=0.9))
        g.add_bm(xform(blob_bm((0.12, 0.10, 0.05), 72 + sx), (sx * 0.02, 0.02, 0.17)), 1, rock_color_fn(MOSS, 72 + sx, ao=0.3, var=0.2))
        g.add_bm(xform(rock_bm((0.10, 0.10, 0.13), 74 + sx, subdiv=2, facets=6), (sx * 0.05, 0.0, -0.17)), 0, rock_color_fn(ROCK_D, 74 + sx))
        if sx > 0: daisy(g, (0.05, -0.02, 0.21), (0.3, -0.3, 1), 0.05, 77, 2, 3)
        attach(g.build('upperarm_mesh_' + side, ML), up, sh)
        el = (sx * 0.50, 0.02, 0.70)
        fo = empty('forearm_' + side, el, up)
        g = Geo()
        g.add_bm(xform(rock_bm((0.145, 0.145, 0.16), 80 + sx, subdiv=2), (sx * 0.01, 0, -0.12)), 0, rock_color_fn(ROCK, 80 + sx, moss=0.5))
        attach(g.build('forearm_mesh_' + side, ML), fo, el)
        wr = (sx * 0.52, 0.0, 0.46)
        ha = empty('hand_' + side, wr, fo)
        g = Geo()
        g.add_bm(xform(rock_bm((0.155, 0.14, 0.13), 90 + sx, subdiv=2), (0, 0.0, -0.10)), 0, rock_color_fn(ROCK, 90 + sx))
        for k in range(4):  # hatz lodiak, ukabila itxita
            g.add_bm(xform(rock_bm((0.042, 0.065, 0.062), 93 + k + sx * 10, subdiv=2, facets=6, rough=0.03, fdist=(0.72, 0.82)), ((k - 1.5) * 0.074, -0.10, -0.15), (0.35, 0, 0)), 0, rock_color_fn(ROCK_D, 93 + k))
        g.add_bm(xform(rock_bm((0.05, 0.055, 0.065), 97 + sx, subdiv=2, facets=4, rough=0.03), (-sx * 0.12, -0.08, -0.06)), 0, rock_color_fn(ROCK_D, 97 + sx))  # erpuru
        attach(g.build('hand_mesh_' + side, ML), ha, wr)

    # ── Hankak: izter motzak, belaunak eta oin zabalak
    for side, sx in (('L', 1), ('R', -1)):
        hp = (sx * 0.17, 0.02, 0.40)
        th = empty('thigh_' + side, hp, hips)
        g = Geo(); g.add_bm(xform(rock_bm((0.15, 0.15, 0.13), 100 + sx, subdiv=2), (0, 0, -0.06)), 0, rock_color_fn(ROCK_D, 100 + sx, moss=0.45))
        attach(g.build('thigh_mesh_' + side, ML), th, hp)
        kn = (sx * 0.18, 0.02, 0.22)
        sn = empty('shin_' + side, kn, th)
        g = Geo(); g.add_bm(xform(rock_bm((0.13, 0.13, 0.11), 110 + sx, subdiv=2, facets=6), (0, 0, -0.06)), 0, rock_color_fn(ROCK, 110 + sx))
        attach(g.build('shin_mesh_' + side, ML), sn, kn)
        an = (sx * 0.18, 0.0, 0.08)
        ft = empty('foot_' + side, an, sn)
        g = Geo(); g.add_bm(xform(rock_bm((0.15, 0.20, 0.08), 120 + sx, subdiv=2, facets=6, rough=0.06), (0, -0.05, -0.0)), 0, rock_color_fn(ROCK_D, 120 + sx, ao=0.4))
        attach(g.build('foot_mesh_' + side, ML), ft, an)
    return root


# ─────────────────────────────────── NESKA ───────────────────────────────────
def build_neska():
    clear_scene()
    SKIN, HAIR, TUNIC, BELT, LEG, SHOE, SHAWL = hexc('#e2ab84'), hexc('#3b2416'), hexc('#a4562c'), hexc('#4b2f1c'), hexc('#b9a27c'), hexc('#5a3a22'), hexc('#6d7a52')
    Ms = [make_mat('neska_' + n, c, r, vcol=True) for n, c, r in (('skin', SKIN, .7), ('hair', HAIR, .8), ('tunic', TUNIC, .95), ('belt', BELT, .8), ('leg', LEG, .95), ('shoe', SHOE, .85), ('shawl', SHAWL, .95), ('eye', hexc('#1c120c'), .3))]
    root = empty('neska', (0, 0, 0)); hips = empty('hips', (0, 0, 0.42), root); torso = empty('torso', (0, 0, 0.46), hips); head = empty('head', (0, 0, 0.88), torso)
    g = Geo()
    g.add_bm(xform(cone_bm(0.235, 0.12, 0.46, 14), (0, 0, 0.0)), 2, flat_color(TUNIC, 0.08, 1))
    g.add_bm(xform(cone_bm(0.17, 0.17, 0.045, 14), (0, 0, 0.06)), 3, flat_color(BELT, 0.05, 2))
    sh = sphere_bm((0.185, 0.15, 0.075), 14, 8)
    g.add_bm(xform(sh, (0, 0.02, 0.21)), 6, flat_color(SHAWL, 0.1, 3))
    attach(g.build('torso_mesh', Ms), torso, (0, 0, 0.63))
    g = Geo()
    g.add_bm(sphere_bm((0.15, 0.14, 0.155), 20, 14), 0, flat_color(SKIN, 0.03, 4))
    hair = sphere_bm((0.162, 0.152, 0.165), 20, 14)
    for v in list(hair.verts):
        if v.co.y < -0.05 and v.co.z < 0.06: v.co.y = -0.05 + (v.co.y + 0.05) * 0.15
    g.add_bm(xform(hair, (0, 0.014, 0.022)), 1, flat_color(HAIR, 0.08, 5))
    for i in range(5):  # txirikorda bizkarrean
        g.add_bm(xform(sphere_bm((0.042 - i * 0.004,) * 3, 10, 6), (0, 0.15 + i * 0.01, -0.07 - i * 0.07)), 1, flat_color(HAIR, 0.08, 6 + i))
    for sx in (-1, 1):
        g.add_bm(xform(sphere_bm((0.022, 0.012, 0.03), 10, 6), (sx * 0.055, -0.137, 0.005)), 7, flat_color((0.11, 0.07, 0.05), 0.02, 9))
        g.add_bm(xform(sphere_bm((0.03, 0.01, 0.02), 10, 6), (sx * 0.085, -0.122, -0.045)), 0, flat_color((0.93, 0.6, 0.5), 0.02, 19))
    attach(g.build('head_mesh', Ms), head, (0, 0, 1.0))
    for side, sx in (('L', 1), ('R', -1)):
        shp = (sx * 0.15, 0, 0.83); arm = empty('arm_' + side, shp, torso)
        g = Geo(); g.add_bm(xform(cone_bm(0.048, 0.04, 0.3, 8), (0, 0, -0.15)), 2, flat_color(TUNIC, 0.06, 10))
        g.add_bm(xform(sphere_bm((0.042,) * 3, 10, 6), (0, 0, -0.33)), 0, flat_color(SKIN, 0.03, 11))
        attach(g.build('arm_mesh_' + side, Ms), arm, shp)
        hp = (sx * 0.08, 0, 0.42); leg = empty('leg_' + side, hp, hips)
        g = Geo(); g.add_bm(xform(cone_bm(0.062, 0.052, 0.36, 8), (0, 0, -0.19)), 4, flat_color(LEG, 0.06, 12))
        g.add_bm(xform(sphere_bm((0.062, 0.1, 0.045), 10, 6), (0, -0.03, -0.39)), 5, flat_color(SHOE, 0.05, 13))
        attach(g.build('leg_mesh_' + side, Ms), leg, hp)
    return root


# ───────────────────────────────── BASURDEA ─────────────────────────────────
def build_basurdea():
    clear_scene()
    FUR, FUR_D, SNOUT, TUSK = hexc('#5b4130'), hexc('#3a281d'), hexc('#a87e6e'), hexc('#efe6d2')
    Ms = [make_mat('basurde_' + n, c, r, vcol=True) for n, c, r in (('fur', FUR, .95), ('dark', FUR_D, .95), ('snout', SNOUT, .7), ('tusk', TUSK, .4), ('eye', hexc('#1a0f08'), .2))]
    root = empty('basurdea', (0, 0, 0)); body = empty('body', (0, 0, 0.5), root)
    g = Geo()
    g.add_bm(xform(rock_bm((0.36, 0.62, 0.32), 201, subdiv=3, rough=0.06, facets=5, fdist=(.88, .96)), (0, 0.05, 0.08)), 0, rock_color_fn(FUR, 201, ao=0.35, var=0.12))
    for i in range(7):  # bizkarreko ile-gandorra
        g.add_bm(xform(cone_bm(0.07, 0.0, 0.16, 6), (0, -0.4 + i * 0.12, 0.4 - abs(i - 2) * 0.02), (0.25, 0, 0)), 1, flat_color(FUR_D, 0.1, 210 + i))
    g.add_bm(xform(cone_bm(0.03, 0.01, 0.18, 6), (0, 0.66, 0.12), (1.2, 0, 0)), 1, flat_color(FUR_D, 0.1, 220))
    attach(g.build('body_mesh', Ms), body, (0, 0, 0.5))
    head = empty('head', (0, -0.5, 0.58), body)
    g = Geo()
    g.add_bm(xform(rock_bm((0.24, 0.32, 0.24), 230, subdiv=2, facets=5), (0, -0.16, -0.06), (-0.35, 0, 0)), 0, rock_color_fn(FUR, 230, ao=0.3))
    g.add_bm(xform(sphere_bm((0.11, 0.05, 0.09), 14, 8), (0, -0.47, -0.17)), 2, flat_color(SNOUT, 0.05, 231))
    for sx in (-1, 1):
        g.add_bm(xform(cone_bm(0.03, 0.004, 0.17, 6), (sx * 0.11, -0.4, -0.12), (0.4, sx * 0.5, 0)), 3, flat_color(TUSK, 0.03, 232))
        g.add_bm(xform(cone_bm(0.06, 0.0, 0.14, 6), (sx * 0.15, -0.03, 0.15), (-0.3, sx * 0.4, 0)), 1, flat_color(FUR_D, 0.08, 233))
        g.add_bm(xform(sphere_bm((0.028,) * 3, 10, 6), (sx * 0.12, -0.27, 0.03)), 4, flat_color((0.1, 0.06, 0.04), 0.02, 234))
    attach(g.build('head_mesh', Ms), head, (0, -0.5, 0.58))
    for name, x, y in (('leg_FL', 0.17, -0.32), ('leg_FR', -0.17, -0.32), ('leg_BL', 0.17, 0.38), ('leg_BR', -0.17, 0.38)):
        hp = (x, y, 0.38); leg = empty(name, hp, body)
        g = Geo(); g.add_bm(xform(cone_bm(0.1, 0.065, 0.32, 8), (0, 0, -0.16)), 0, flat_color(FUR, 0.08, 240))
        g.add_bm(xform(cone_bm(0.06, 0.068, 0.07, 8), (0, -0.01, -0.34)), 1, flat_color((0.15, 0.1, 0.07), 0.05, 241))
        attach(g.build(name + '_mesh', Ms), leg, hp)
    return root


def export(path):
    bpy.ops.object.select_all(action='SELECT')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_animations=False)
    for extra in (dict(export_vertex_color='MATERIAL'), {}):
        try:
            bpy.ops.export_scene.gltf(**kw, **extra); break
        except TypeError:
            continue
    print('GLB:', path, os.path.getsize(path) // 1024, 'KB')


def render(path, cam_loc, target=(0, 0, 0.72), res=(640, 800), lens=55):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 40
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (*s2l(hexc('#f1e6d2')), 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.data.lens = lens
    cam.location = Vector(cam_loc); d = Vector(target) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sc.camera = cam
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.2; sun.data.color = s2l(hexc('#fff1dc'))
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35)); sc.collection.objects.link(sun)
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True); bpy.data.objects.remove(sun, do_unlink=True)
    print('render:', path)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default='public/harri/assets'); ap.add_argument('--render', default=''); ap.add_argument('--only', default='harri,neska,basurdea')
    a = ap.parse_args([x for x in sys.argv[1:] if x != '--'])
    os.makedirs(a.out, exist_ok=True)
    if a.render: os.makedirs(a.render, exist_ok=True)
    builders = {'harri': (build_harri, [((0, -3.3, 0.85), 'front'), ((2.2, -2.5, 1.0), '34'), ((0, 3.2, 0.9), 'back')]),
                'neska': (build_neska, [((1.6, -2.6, 0.8), '34')]), 'basurdea': (build_basurdea, [((3.0, -3.0, 1.1), '34')])}
    for name in a.only.split(','):
        fn, views = builders[name]; fn()
        if a.render:
            for cl, tag in views:
                render(os.path.join(a.render, f'{name}_{tag}.png'), cl, target=(0, 0, 0.75 if name == 'harri' else 0.55))
        export(os.path.join(a.out, name + '.glb'))
