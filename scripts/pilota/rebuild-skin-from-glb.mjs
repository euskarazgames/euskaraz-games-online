#!/usr/bin/env node
/**
 * Rebuild a compact, skinned WebGL mesh from Blender's verified glTF UVs.
 *
 * Root cause fixed: some imported Fal GLBs contain nonfinite/extreme Blender
 * UV data before glTF export. The glTF exporter normalizes/unrolls its own
 * TEXCOORD_0 stream; using raw mesh.uv_layers produces corrupted outfits.
 *
 * The GLB visual viewer is ground truth for POSITION, NORMAL and TEXCOORD_0.
 * The legacy _skin.bin is ground truth for joint indices and weights. Join
 * vertex records by normalized position with 2mm keys, preserving existing
 * bone rig and gameplay IK. Emit 19-float vertex layout expected by GL.meshSkin.
 *
 * Usage: node scripts/pilota/rebuild-skin-from-glb.mjs jon
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const id=process.argv[2];
if(!/^(jon|lurra|harri|mendibe)$/.test(id||''))throw Error('Name must be jon|lurra|harri|mendibe');
const base='public/pilota/characters/'+id;
const source=fs.readFileSync(base+'_skin.bin'),glb=fs.readFileSync(base+'_optimized.glb');
assert(source.readUInt32LE(0)>5000 && glb.readUInt32LE(0)===0x46546c67,'Invalid skin or glb');
const jlen=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+jlen).toString().trim());
const binStart=20+jlen,binBytes=glb.readUInt32LE(binStart),binary=glb.subarray(binStart+8,binStart+8+binBytes);
const nold=source.readUInt32LE(0); const byKey=new Map();
const key=p=>p.map(x=>Math.round(x*500)).join(':');
for(let i=0;i<nold;i++){
  const off=8+i*76, p=[source.readFloatLE(off),source.readFloatLE(off+4),source.readFloatLE(off+8)];
  const weights=[],joints=[];
  for(let k=0;k<4;k++){joints.push(source.readFloatLE(off+44+k*4));weights.push(source.readFloatLE(off+60+k*4));}
  const item={p,joints,weights};
  const k=key(p); if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(item);
}
function accessor(index){
  const acc=json.accessors[index]; if(!acc||acc.bufferView===undefined)throw Error('Unsupported glTF sparse attribute');
  const view=json.bufferViews[acc.bufferView];
  const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};const n=sizes[acc.type];
  const readers={
    5120:[1,(i)=>binary.readInt8(i)],
    5121:[1,(i)=>binary.readUInt8(i)],
    5122:[2,(i)=>binary.readInt16LE(i)],
    5123:[2,(i)=>binary.readUInt16LE(i)],
    5125:[4,(i)=>binary.readUInt32LE(i)],
    5126:[4,(i)=>binary.readFloatLE(i)]
  };
  if(!readers[acc.componentType]||!n)throw Error('Unsupported glTF accessor: '+index);
  const [sz,read]=readers[acc.componentType],start=(view.byteOffset||0)+(acc.byteOffset||0),stride=view.byteStride||n*sz;
  const out=new Array(acc.count);
  for(let i=0;i<acc.count;i++){const p=start+i*stride;out[i]=Array.from({length:n},(_,j)=>read(p+j*sz));}
  return out;
}
const vertices=[],indices=[],used=new Set();let noSkin=0,nearLookups=0,uvFail=0,missingNormal=0,primitiveCount=0;
for(const mesh of json.meshes){
  for(const prim of mesh.primitives){
    if(prim.attributes?.POSITION===undefined || prim.attributes?.TEXCOORD_0===undefined)continue;
    const p=accessor(prim.attributes.POSITION),uv=accessor(prim.attributes.TEXCOORD_0);
    const norm=prim.attributes.NORMAL===undefined?null:accessor(prim.attributes.NORMAL);
    const ids=prim.indices===undefined?Array.from({length:p.length},(_,i)=>[i]):accessor(prim.indices);
    assert.equal(p.length,uv.length,'GLB position and texture coordinate count mismatch');
    const offset=vertices.length/19;
    for(let i=0;i<p.length;i++){
      const xyz=p[i],tex=uv[i],candidates=byKey.get(key(xyz))||[];
      let old=candidates[0];
      if(!old){
        // Fallback: exact Blender transforms can create sub-mm vertex drift.
        // Evaluate close neighbours, never map a distant vertex.
        let bd=Infinity;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
          const ix=Math.round(xyz[0]*500)+dx,iy=Math.round(xyz[1]*500)+dy,iz=Math.round(xyz[2]*500)+dz;
          for(const test of byKey.get([ix,iy,iz].join(':'))||[]){
            const d=xyz.reduce((tot,v,k)=>tot+(v-test.p[k])**2,0);
            if(d<bd){bd=d;old=test;}
          }
        }
        if(old&&bd<.00009)nearLookups++;else {noSkin++;old=null;}
      }
      if(!tex.every(Number.isFinite)||tex.some(v=>v<-.01||v>1.01))uvFail++;
      const normal=norm?.[i]||[0,1,0];if(!norm)missingNormal++;
      const j=old?.joints||[0,0,0,0],w=old?.weights||[1,0,0,0];
      const data=[...xyz,...normal,...tex,5,1,5,...j,...w];
      assert.equal(data.length,19); if(!data.every(Number.isFinite))throw Error('Nonfinite vertex '+i+' for '+id);
      vertices.push(...data);
    }
    for(const a of ids){const k=offset+a[0];if(k>=65536)throw Error('Too many vertices for WebGL1');indices.push(k);}
    primitiveCount++;
  }
}
if(!vertices.length||!indices.length||indices.length%3)throw Error('No valid glTF triangles: '+id);
const count=vertices.length/19, tri=indices.length/3;
const ratio=noSkin/count;
if(ratio>.01)throw Error('Too many vertices without matching rig weights '+id+': '+(ratio*100).toFixed(2)+'%');
if(uvFail/count>.01)throw Error('GLB UVs still out of range for '+id+': '+uvFail+'/'+count);
const buffer=Buffer.allocUnsafe(8+vertices.length*4+indices.length*2);
buffer.writeUInt32LE(count,0);buffer.writeUInt32LE(indices.length,4);
let o=8;
for(const v of vertices){buffer.writeFloatLE(v,o);o+=4;}
for(const v of indices){buffer.writeUInt16LE(v,o);o+=2;}
fs.writeFileSync(base+'_skin.bin',buffer);
const diagnostic={name:id,vertices:count,triangles:tri,uvOutOfRange:uvFail,unmatched:noSkin,nearLookups,skinBytes:buffer.length,primitives:primitiveCount,sourceVertices:nold};
fs.appendFileSync(base+'_report.txt','UV rebuild from GLB TEXCOORD_0: '+JSON.stringify(diagnostic)+'\n');
console.log('SKIN_UV_REPAIRED',JSON.stringify(diagnostic));
