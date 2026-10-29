// LEIZEEN DEIA: modeloak meshoptimizer-ekin trinkotu (EXT_meshopt_compression, galerarik gabe).
//   npm install @gltf-transform/core@4 @gltf-transform/extensions@4 meshoptimizer@1
//   node meshopt.mjs [karpeta]        (lehenetsia: script honen karpeta)
// build_models.mjs-en ondoren exekutatu. Datuak ez dira aldatzen (QUANTIZE modua, berrantolatu gabe):
// erpinak, ordena eta kuantizazioa (KHR_mesh_quantization) berdin geratzen dira, kolisioak
// (posK, bandPolys, radialShape) eta Amaiurren aurpegia (aurpegia.js) ukitu gabe.
// Jokoak deskodetzailea txertatzen du (tools/leizeak/vendor/meshopt_decoder.js, MIT).
// Bi aldiz exekutatzea ez da kaltegarria: dagoeneko trinkotutakoak saltatzen ditu.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort()) {
  const file = path.join(DIR, f);
  const src = fs.readFileSync(file);
  const doc = await io.readBinary(new Uint8Array(src));
  if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression')) {
    console.log(f.padEnd(20), 'dagoeneko trinkotuta');
    continue;
  }
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = await io.writeBinary(doc);
  fs.writeFileSync(file, out);
  console.log(f.padEnd(20), kb(src.length), '→', kb(out.length));
}
