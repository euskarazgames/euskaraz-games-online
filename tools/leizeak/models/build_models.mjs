// LEIZEEN DEIA: KayKit-en (CC0, GitHub) modelo gehigarriak, GLB txikietan.
//   npm install @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4
//   node build_models.mjs <kaykit-karpeta> <irteera-karpeta>
// <kaykit-karpeta>-n hiru errepositorio hauek: KayKit-Medieval-Hexagon-Pack-1.0,
// KayKit-Dungeon-Remastered-1.0 eta KayKit-Character-Pack-Adventures-1.0.
//
// · props.glb: herriko etxeak, natura, altzariak eta leizeko piezak, eszena bakarrean; nodo
//   bakoitzak modeloaren izena du (jokoak izenez klonatzen ditu). Testurak deduplikatuta eta
//   sareak kuantizatuta (KHR_mesh_quantization).
// · npc_*.glb: herritarrak (animaziorik gabe): sorginaren (mage.glb) animazioak erabiltzen
//   dituzte, KayKit pertsonaia guztiek Rig_Medium hezurdura bera baitute.
// Ondoren: node meshopt.mjs (EXT_meshopt_compression, galerarik gabe; jokoak deskodetzailea txertatzen du).
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization, KHRMaterialsEmissiveStrength, KHRTextureTransform } from '@gltf-transform/extensions';
import { prune, dedup, quantize, mergeDocuments, unpartition, weld } from '@gltf-transform/functions';
import fs from 'fs';
import path from 'path';

const [KK, OUT] = process.argv.slice(2);
const HEX = path.join(KK, 'KayKit-Medieval-Hexagon-Pack-1.0/addons/kaykit_medieval_hexagon_pack/Assets/gltf');
const DUN = path.join(KK, 'KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf');
const ADV = path.join(KK, 'KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf');

const PROPS = [
  ...['building_home_A_red', 'building_home_B_red', 'building_blacksmith_red', 'building_tavern_red', 'building_well_red', 'building_church_red',
    'building_watermill_red'].map((n) => ['buildings/red', n]),
  ...['fence_wood_straight', 'fence_wood_straight_gate', 'fence_stone_straight', 'fence_stone_straight_gate', 'building_bridge_A', 'building_destroyed', 'wall_straight', 'building_grain', 'building_stage_A'].map((n) => ['buildings/neutral', n]),
  ...['hills_A_trees', 'hills_B_trees', 'hill_single_A', 'mountain_A_grass_trees', 'mountain_B_grass', 'mountain_C_grass_trees', 'rock_single_A', 'rock_single_B',
    'rock_single_C', 'rock_single_D', 'rock_single_E', 'tree_single_A', 'tree_single_B', 'trees_A_large', 'trees_A_medium', 'trees_B_large', 'trees_B_medium',
    'trees_A_small', 'trees_B_small', 'tree_single_A_cut', 'waterplant_A', 'waterplant_B', 'waterlily_A', 'waterlily_B', 'cloud_big', 'cloud_small'].map((n) => ['decoration/nature', n]),
  ...['barrel', 'crate_A_big', 'crate_B_small', 'crate_open', 'pallet', 'sack', 'wheelbarrow', 'flag_red', 'flag_yellow', 'flag_green', 'tent', 'ladder', 'bucket_water', 'bucket_empty', 'resource_lumber',
    'resource_stone', 'weaponrack', 'target'].map((n) => ['decoration/props', n]),
];
const NPCS = [['npc_barbarian', 'Barbarian.glb'], ['npc_knight', 'Knight.glb'], ['npc_rogue', 'Rogue.glb'], ['npc_hooded', 'Rogue_Hooded.glb']];

const io = new NodeIO().registerExtensions([KHRMeshQuantization, KHRMaterialsEmissiveStrength, KHRTextureTransform]);
const kb = (b) => (b.byteLength / 1024).toFixed(0) + ' KB';
fs.mkdirSync(OUT, { recursive: true });

/* ---- props.glb ---- */
const files = [...PROPS.map(([d, n]) => [n, path.join(HEX, d, n + '.gltf')])];
/* leizeko piezak (astunegiak direnak kanpoan: haien ordez antzeko arinagoak) */
const SKIP = new Set(['wall_cracked', 'chest_gold', 'crates_stacked', 'keyring']);
for (const f of fs.readdirSync(DUN).sort()) {
  const n = f.replace(/(\.gltf)?\.glb$/, '');
  if (f.endsWith('.glb') && !SKIP.has(n)) files.push([n, path.join(DUN, f)]);
}
const doc = await io.read(files[0][1]);
const root = doc.getRoot();
const scene = root.listScenes()[0];
const wrap = (name, sc) => {
  const holder = doc.createNode(name);
  for (const n of sc.listChildren()) holder.addChild(n);
  return holder;
};
const first = wrap(files[0][0], scene);
scene.addChild(first);
for (const [name, file] of files.slice(1)) {
  const src = await io.read(file);
  for (const a of src.getRoot().listAnimations()) a.dispose();
  const map = mergeDocuments(doc, src);
  for (const sc of src.getRoot().listScenes()) {
    const tsc = map.get(sc);
    scene.addChild(wrap(name, tsc));
    tsc.dispose();
  }
}
for (const sc of root.listScenes()) if (sc !== scene) sc.dispose();
await doc.transform(unpartition());
doc.createExtension(KHRMeshQuantization).setRequired(true);
await doc.transform(dedup(), weld(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
const glb = await io.writeBinary(doc);
fs.writeFileSync(path.join(OUT, 'props.glb'), glb);
console.log('props.glb', kb(glb), 'modeloak', scene.listChildren().length, 'testurak', root.listTextures().length);

/* ---- herritarrak ---- */
for (const [name, file] of NPCS) {
  const d = await io.read(path.join(ADV, file));
  for (const a of d.getRoot().listAnimations()) {
    for (const c of a.listChannels()) c.dispose();
    for (const s of a.listSamplers()) s.dispose();
    a.dispose();
  }
  await d.transform(unpartition());
  d.createExtension(KHRMeshQuantization).setRequired(true);
  await d.transform(dedup(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
  const b = await io.writeBinary(d);
  fs.writeFileSync(path.join(OUT, name + '.glb'), b);
  const meshes = d.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => n.getName());
  console.log(name.padEnd(14), kb(b), '| meshes:', meshes.join(','));
}
