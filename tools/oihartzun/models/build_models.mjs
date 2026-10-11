// KayKit (CC0, GitHub) modeloak OIHARTZUN-erako: behar diren animazioak bakarrik.
//   cd tools/oihartzun/models && npm install @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4
//   node build_models.mjs <kaykit-adventures-karpeta> <kaykit-skeletons-karpeta>
// Hezurdura guztiek rig bera dute (Rig_Medium): animazioak skel_minion-en bakarrik gordetzen dira
// eta jokoak hiru aldaeretan erabiltzen ditu. Atseden-jarreran geldirik dauden kanalak kentzen dira
// eta sareak kuantizatzen dira (KHR_mesh_quantization, GLTFLoader r128-k onartzen du).
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize, mergeDocuments, unpartition } from '@gltf-transform/functions';
import fs from 'fs';
import path from 'path';
const [adv, skl] = process.argv.slice(2);
const A = (f) => path.join(adv, 'addons/kaykit_character_pack_adventures/Characters/gltf', f);
const S = (f) => path.join(skl, 'addons/kaykit_character_pack_skeletons/Characters/gltf', f);
const W = (f) => path.join(skl, 'addons/kaykit_character_pack_skeletons/Assets/gltf', f);
/* armak (pakete bereko Assets/) eskuko "handslot" hezurrari lotuta */
const WEAPONS = {
  skel_minion: [['Skeleton_Blade.gltf', 'handslot.r'], ['Skeleton_Shield_Small_A.gltf', 'handslot.l']],
  skel_mage: [['Skeleton_Staff.gltf', 'handslot.r']],
  skel_warrior: [['Skeleton_Axe.gltf', 'handslot.r']],
};
const SKEL_ANIMS = ['Idle_Combat', 'Walking_D_Skeletons', 'Running_C', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop', 'Spellcast_Shoot', 'Hit_A', 'Death_C_Skeletons', 'Spawn_Ground_Skeletons', 'Taunt'];
const JOBS = [
  ['mage', A('Mage.glb'), ['Idle', 'Walking_A', 'Running_A', 'Jump_Start', 'Jump_Idle', 'Jump_Land', 'Dodge_Forward', 'Spellcast_Shoot', 'Spellcast_Long', 'Spellcast_Raise', 'Spellcasting', '2H_Melee_Attack_Spin', 'Hit_A', 'Death_A', 'Cheer']],
  ['skel_minion', S('Skeleton_Minion.glb'), SKEL_ANIMS],
  ['skel_mage', S('Skeleton_Mage.glb'), []],
  ['skel_warrior', S('Skeleton_Warrior.glb'), []],
];
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const EPS = 1e-4;

/* kanal batek balio bera badu beti eta nodoaren atseden-balioa bada, ez du ezer egiten */
function idleChannel(c) {
  const node = c.getTargetNode(), s = c.getSampler(), out = s.getOutput().getArray();
  const rest = { translation: node.getTranslation(), rotation: node.getRotation(), scale: node.getScale() }[c.getTargetPath()];
  if (!rest) return false;
  const n = rest.length;
  for (let i = 0; i < out.length; i++) if (Math.abs(out[i] - rest[i % n]) > EPS) return false;
  return true;
}

for (const [name, file, keep] of JOBS) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  /* animazioaren kanalak eta samplerrak ere askatu: bestela haien accessor-ak geratzen dira */
  for (const a of root.listAnimations())
    if (!keep.includes(a.getName())) {
      for (const c of a.listChannels()) c.dispose();
      for (const s of a.listSamplers()) s.dispose();
      a.dispose();
    }
  for (const [wf, bone] of WEAPONS[name] || []) {
    const wdoc = await io.read(W(wf));
    const map = mergeDocuments(doc, wdoc);
    const slot = root.listNodes().find((n) => n.getName() === bone);
    for (const sc of wdoc.getRoot().listScenes()) {
      const tsc = map.get(sc);
      for (const n of tsc.listChildren()) slot.addChild(n);
      tsc.dispose();
    }
  }
  await doc.transform(unpartition());
  const missing = keep.filter((k) => !root.listAnimations().some((a) => a.getName() === k));
  await doc.transform(resample({ tolerance: 2e-4 }));
  let dropped = 0;
  for (const a of root.listAnimations())
    for (const c of a.listChannels())
      if (idleChannel(c)) {
        const s = c.getSampler();
        c.dispose();
        if (!s.listParents().some((p) => p !== root && p.propertyType === 'AnimationChannel')) s.dispose();
        dropped++;
      }
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  await doc.transform(dedup(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(`${name}.glb`, glb);
  const meshes = root.listNodes().filter((n) => n.getMesh()).map((n) => n.getName());
  console.log(name.padEnd(13), (glb.byteLength / 1024).toFixed(0) + ' KB', 'anims', root.listAnimations().length, 'kanal kenduak', dropped, missing.length ? 'FALTA: ' + missing : '', '| meshes:', meshes.join(','));
}
