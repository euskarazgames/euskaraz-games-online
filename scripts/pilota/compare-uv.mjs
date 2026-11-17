import {readFileSync} from 'node:fs';
function glb(path){
 const b=readFileSync(path);
 const jLen=b.readUInt32LE(12);
 const json=JSON.parse(b.subarray(20,20+jLen).toString().trim());
 const pos=20+jLen;
 const binLen=b.readUInt32LE(pos), bin=b.subarray(pos+8,pos+8+binLen);
 const accessor=(i)=>{
   const a=json.accessors[i],view=json.bufferViews[a.bufferView], off=(view.byteOffset||0)+(a.byteOffset||0);
   const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
   const stride=view.byteStride||comps*4;
   return Array.from({length:a.count},(_,k)=>Array.from({length:comps},(_,c)=>bin.readFloatLE(off+k*stride+c*4)));
 };
 const rows=[];
 for(const mesh of json.meshes)for(const prim of mesh.primitives){
   if(prim.attributes.POSITION==null||prim.attributes.TEXCOORD_0==null)continue;
   const p=accessor(prim.attributes.POSITION),uv=accessor(prim.attributes.TEXCOORD_0);
   for(let i=0;i<p.length;i++)rows.push({p:p[i],uv:uv[i]});
 }
 return {rows,json};
}
function custom(path){
 const b=readFileSync(path),n=b.readUInt32LE(0);
 return Array.from({length:n},(_,i)=>({p:Array.from({length:3},(_,k)=>b.readFloatLE(8+i*76+k*4)),uv:[b.readFloatLE(8+i*76+24),b.readFloatLE(8+i*76+28)]}));
}
const id=process.argv[2]||'jon';
const {rows,json}=glb('public/pilota/characters/'+id+'_optimized.glb');
const ours=custom('public/pilota/characters/'+id+'_skin.bin');
const key=p=>p.map(v=>Math.round(v*500)).join(':');
const groups=new Map();
for(const r of rows){const k=key(r.p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r.uv);}
let same=0,flip=0,noMatch=0,far=0,tot=0,samples=[];
for(const [i,r] of ours.entries()){
 const matches=groups.get(key(r.p));
 if(!matches){noMatch++;continue;}
 let a=100,b=100,best=null;
 for(const uv of matches){
  const normal=Math.abs(r.uv[0]-uv[0])+Math.abs(r.uv[1]-uv[1]);
  const reversed=Math.abs(r.uv[0]-uv[0])+Math.abs(1-r.uv[1]-uv[1]);
  if(normal<a){a=normal;best=uv;}if(reversed<b)b=reversed;
 }
 tot++;if(a<.03)same++;if(b<.03)flip++;
 if(a>.05&&b>.05){far++;if(samples.length<8)samples.push({i,p:r.p,ours:r.uv,gltf:best,err:a,flipped:b});}
}
console.log('UV_COMPARE',JSON.stringify({id,ours:ours.length,gltf:rows.length,tot,same,flip,noMatch,far,ratioSame:same/tot,ratioFlip:flip/tot,samples,jsonMeshes:json.meshes.length},null,2));

if(!tot||same/tot<.95||far/tot>.02){console.error('UV_GLTF_MATCH_FAILURE',id,{same,tot,far});process.exitCode=1;}
