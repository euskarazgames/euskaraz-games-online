"""BILBAO: ITZALEN SAREA — Blender master scene builder.
RUN: Open Blender 4.2+ > Scripting > Open this .py > Run Script.
Or: blender -b --python ABRIR_EN_BLENDER.py
Creates: Bilbao_Itzalen_Sarea.blend with the imported original 3D city, light rig,
scene breakdown, camera-shots, mission markers, and visual development props.
Blender's built-in glTF importer is required (ships with Blender).
"""
import bpy, math, json, os, random
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
GLB=os.path.join(ROOT,'Bilbao_Itzalak_Ciudad.glb')
PROJECT=os.path.join(ROOT,'Bilbao_Itzalen_Sarea.blend')
JSON=os.path.join(ROOT,'Misiones_y_Zonas.json')
if not os.path.isfile(GLB):
    raise FileNotFoundError('Falta Bilbao_Itzalak_Ciudad.glb: coloca juntos el GLB y este script')

# Clean factory scene, then import glTF mesh with PBR materials.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != bpy.context.scene.collection.name and collection.users == 0:
        bpy.data.collections.remove(collection)
bpy.ops.import_scene.gltf(filepath=GLB)
scene=bpy.context.scene

# Organize imported objects as groups by first portion of the scene object name.
def coll(name):
    obj=bpy.data.collections.get(name)
    if obj is None:
        obj=bpy.data.collections.new(name)
        scene.collection.children.link(obj)
    return obj

for obj in list(bpy.context.selected_objects):
    group=obj.name.split('__')[0]
    dst=coll(group)
    for c in list(obj.users_collection):c.objects.unlink(obj)
    dst.objects.link(obj)
    if obj.type == 'MESH':
        obj['Source']='Original procedural geometry: generate_city.py'
        obj['GameScale']='1 Blender unit = 1 metre'
        obj.color=(.56,.58,.63,1)

MARKERS=coll('70_Actores_Pistas_Y_Guion')
CAMERAS=coll('80_Camaras_Cinematicas')
LIGHTS=coll('81_Iluminacion_Noche')
ATMOS=coll('82_Atrezzo_Cinematico')

def empty(name,pos,shape='SPHERE',size=.8):
    ob=bpy.data.objects.new(name,None); MARKERS.objects.link(ob)
    ob.empty_display_type=shape;ob.empty_display_size=size;ob.location=pos
    return ob

with open(JSON,encoding='utf-8') as f: data=json.load(f)
for idx,item in enumerate(data['objectives']):
    ob=empty('INTERACTUAR__'+item['id'],item['xyz'])
    ob['action']=item['interaction'];ob['mission']=item['mission'];ob['objective_id']=item['id']
    ob['display_name']=item['name'];ob['gameplay_required']='Sí, programar en motor de juego'
for item in data['portals']:
    ob=empty('PORTAL__'+item['scene'],item['entrance'],'CUBE',1.5)
    ob['destination']=item['scene'];ob['return_location']=item['return']
for location in data['locations']:
    ob=empty('REFERENCIA__'+location['id'],location['xyz'],'CIRCLE',3)
    ob['display_name']=location['label']
for i,beat in enumerate(data['beats']):
    scene[f'ACTO_{i+1}']=beat['mission']+' | '+beat['clue']
scene['IMPORTANTE']='Maqueta ficticia inspirada en Bilbao, no georreferenciada ni Street View'
scene['INTERACCIONES']='Los marcadores son puntos de diseño, no lógica jugable en Blender'
scene.unit_settings.system='METRIC'

# Add physically based world and warm/cool noir palette.
world=bpy.data.worlds.new('CIUDAD_NOCHE_AZUL') if not scene.world else scene.world
scene.world=world; world.use_nodes=True
b=world.node_tree.nodes.get('Background')
if b:b.inputs['Color'].default_value=(.014,.025,.055,1);b.inputs['Strength'].default_value=.34

def area(name,location,color,power,size,target):
    ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.color=color
    ld.shape='DISK';ld.size=size
    ob=bpy.data.objects.new(name,ld);LIGHTS.objects.link(ob);ob.location=location
    v=Vector(target)-ob.location;ob.rotation_euler=v.to_track_quat('-Z','Y').to_euler()
    return ob

def point(name,location,color,power,soft):
    ld=bpy.data.lights.new(name,'POINT');ld.energy=power;ld.color=color;ld.shadow_soft_size=soft
    ob=bpy.data.objects.new(name,ld);LIGHTS.objects.link(ob);ob.location=location
    return ob

# Wide urban night pools. Additional city lights use emissive PBR surfaces for speed.
area('ARQUITECTURA_ARRIAGA',(-27,15,23),(.99,.69,.38),2800,18,(-26,44,8))
area('ARRIAGA_CONTRA',(-53,54,28),(.38,.60,1.0),1900,25,(-26,45,8))
area('MERCADO_FACHADA',(98,15,22),(.94,.60,.33),2500,21,(96,40,8))
area('PLAZA_LUZ',(-103,92,25),(.56,.68,.93),1600,38,(-103,95,0))
area('RIO_REFLEJO',(-4,5,18),(.24,.49,.86),2400,35,(-10,1,0))
area('ABANDO_LUZ',(25,-22,22),(.35,.61,.84),1900,30,(25,-48,4))
point('LUZ_PRUEBA_INICIAL',(-26,29,4),(.96,.60,.22),480,2)
for kind,x in [('ARCHIVO',230),('ALMACEN',260),('DESPACHO',290)]:
    area('INTERIOR_'+kind,(x,2,5.2),(.77,.84,1.0),650,8,(x,2,.7))

# Public-facing title plaques, floating text only where artistically useful.
def label(name,value,xyz,rot=(math.pi/2,0,0),size=.65,emission=False):
    curve=bpy.data.curves.new('TYPO_'+name,'FONT');curve.body=value
    curve.size=size;curve.extrude=.004;curve.bevel_depth=.002
    ob=bpy.data.objects.new('ROTULO__'+name,curve);ATMOS.objects.link(ob)
    ob.location=xyz;ob.rotation_euler=rot
    mat=bpy.data.materials.new('LETRAS_LUMINOSAS' if emission else 'ROTULO_MARFIL');mat.diffuse_color=(.97,.72,.35,1) if emission else (.85,.82,.74,1)
    mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF')
    if bs:
        bs.inputs['Base Color'].default_value=mat.diffuse_color
        if emission:
            if 'Emission Color' in bs.inputs:bs.inputs['Emission Color'].default_value=(1,.54,.16,1)
            if 'Emission Strength' in bs.inputs:bs.inputs['Emission Strength'].default_value=2.2
    ob.data.materials.append(mat)
    return ob
label('ARRIAGA','ARRIAGA',(-31.5,34.23,7.73),size=1.2,emission=True)
label('ALDER','ALDER',(-140,22.3,3.9),size=1.1)
label('AGENCIA','ARANBURU', (19.8,-36.02,2.64),size=.62,emission=True)
label('ARCHIVO','ARTXIBOA / ARCHIVO',(225,-5.2,4.2),size=.55)
label('ALMACEN','BILTEGIA / ALMACEN',(255,-5.2,4.2),size=.55)
label('DESPACHO','ALDER - DIRECCION',(285,-5.2,4.2),size=.55)

# Cinematic camera gallery, one frame marker per shot.
def camera_shot(name,start,end,pos,target,focal=36,endpos=None):
    dat=bpy.data.cameras.new(name);dat.lens=focal;dat.clip_end=1100;dat.clip_start=.06
    ob=bpy.data.objects.new(name,dat);CAMERAS.objects.link(ob)
    positions=[(start,pos),(end,endpos or pos)]
    for frame,loc in positions:
        ob.location=loc
        ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
        ob.keyframe_insert(data_path='location',frame=frame)
        ob.keyframe_insert(data_path='rotation_euler',frame=frame)
    marker=scene.timeline_markers.new(name,frame=start);marker.camera=ob
    return ob

camera_shot('01_OPENING_RIA',1,78,(-102,-78,44),(-26,40,8),38,(-72,-51,30))
camera_shot('02_ARRIAGA_MISTERIO',79,148,(-40,12,2.7),(-26,46,7.0),30,(-31,19,2.7))
camera_shot('03_PL_NUEVA_TESTIGO',149,218,(-117,84,3.0),(-104,96,5),30,(-109,87,3))
camera_shot('04_RIBERA_VIGILANCIA',219,290,(62,7,5),(97,40,7),50,(81,16,5))
camera_shot('05_ABANDO_ENGANO',291,355,(15,-10,2.1),(23,-44,4),28,(20,-18,2.1))
camera_shot('06_FINAL_DESPACHO',356,424,(291,-5,2),(290,3,1.2),36,(290,-3.2,2))
scene.frame_start=1;scene.frame_end=424;scene.render.fps=24
scene.camera=bpy.data.objects['02_ARRIAGA_MISTERIO']
scene.frame_set(120)
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=85
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(ROOT,'fotograma_blender.png')
# Engine compatibility with newer and older Blender editions.
try:scene.render.engine='BLENDER_EEVEE_NEXT'
except Exception:
    try:scene.render.engine='BLENDER_EEVEE'
    except Exception:scene.render.engine='CYCLES'
if hasattr(scene,'eevee'):
    if hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=48
scene.render.film_transparent=False
if hasattr(scene,'view_settings'):
    try:scene.view_settings.view_transform='AgX'
    except Exception:pass
# Provide a useful initial viewport camera.
for area_ui in bpy.context.screen.areas if bpy.context.screen else []:
    if area_ui.type=='VIEW_3D':
        area_ui.spaces.active.region_3d.view_perspective='CAMERA'
        area_ui.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=PROJECT)
print('SAVED',PROJECT)
# Optional offline render: blender -b --python ABRIR_EN_BLENDER.py -- --render
import sys
if '--render' in sys.argv:
    bpy.ops.render.render(write_still=True)
    print('RENDERED',scene.render.filepath)