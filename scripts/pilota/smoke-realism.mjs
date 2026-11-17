import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function inspectSkin(name){
 const b=readFileSync('public/pilota/characters/'+name+'_skin.bin');
 const vertices=b.readUInt32LE(0), out={name,vertices,hand8:0,hand7:0,hand5:0,bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},dominant: {min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}};
 for(let i=0;i<vertices;i++){
  const off=8+i*76;
  const xyz=[b.readFloatLE(off),b.readFloatLE(off+4),b.readFloatLE(off+8)];
  xyz.forEach((v,j)=>{out.bounds.min[j]=Math.min(v,out.bounds.min[j]);out.bounds.max[j]=Math.max(v,out.bounds.max[j]);});
  let w8=0,w7=0,w5=0;
  for(let j=0;j<4;j++){
   const id=Math.round(b.readFloatLE(off+44+j*4)),w=b.readFloatLE(off+60+j*4);
   if(id===8)w8+=w;if(id===7)w7+=w;if(id===5)w5+=w;
  }
  if(w8>.65){out.hand8++;xyz.forEach((v,j)=>{out.dominant.min[j]=Math.min(v,out.dominant.min[j]);out.dominant.max[j]=Math.max(v,out.dominant.max[j]);});}
  if(w7>.65)out.hand7++;if(w5>.65)out.hand5++;
 }
 return out;
}
for(const name of ['jon','harri','lurra','mendibe']){
  const mesh=inspectSkin(name);
  console.log('SOURCE_SKIN',JSON.stringify(mesh));
  const raw=readFileSync('public/pilota/characters/'+name+'_skin.bin');
  const n=raw.readUInt32LE(0);let malformed=0;
  for(let i=0;i<n;i++){
    const uv0=raw.readFloatLE(8+i*76+24), uv1=raw.readFloatLE(8+i*76+28);
    if(!Number.isFinite(uv0)||!Number.isFinite(uv1)||uv0<-.015||uv1<-.015||uv0>1.015||uv1>1.015)malformed++;
  }
  assert(malformed<=Math.max(2,Math.ceil(n*.005)),name+' atlas UVs corrupted: '+malformed+'/'+n);
  console.log('VALID_UV_ATLAS',name,{vertices:n,malformed});
}
// Recheck regenerated, body-width-calibrated Fal/Blender character weights.
const ORIGIN=process.env.PILOTA_ORIGIN||'http://127.0.0.1:8799';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const report=[];
const errors=[];
async function run(name,opts,allowGame=true){
  const context=await browser.newContext({...opts,serviceWorkers:'block'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(name+': '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(name+' console: '+m.text().slice(0,300));});
  page.on('requestfailed',r=>{if(r.url().includes('/pilota/characters/'))errors.push(name+' missing model: '+r.url()+': '+r.failure()?.errorText)});
  await page.goto(ORIGIN+'/pilota/?personajes3d=1',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>Boolean(window.HPA&&window.PILOTA_MODELS&&window.PILOTA_CAREER),{timeout:45000});
  await page.waitForFunction(()=>Boolean(window.PILOTA_MODELS.ready.jon&&window.PILOTA_MODELS.ready.harri),{timeout:45000});
  const stats=await page.evaluate(()=>{
    const m=window.PILOTA_MODELS;
    const get=x=>{const a=m.ready[x];return a?{name:x,vertices:a.verts,triangles:a.tris,palm:a.handSamples,loc:a.palmLocal}:null};
    const gl=document.querySelector('#gl').getContext('webgl2')||document.querySelector('#gl').getContext('webgl');
    const p=window.HPA.me;
    return {active:m.active,loaded:[get('jon'),get('harri')],meReady:!!p.realMesh,foeReady:!!window.HPA.foe.realMesh,
      hand:p.handPos(),glOk:gl.getError()===gl.NO_ERROR,maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
      canvasWidth:document.querySelector('#gl').width,canvasHeight:document.querySelector('#gl').height,
      intro:!!document.querySelector('#menu'),career:!!document.querySelector('#career .hero-cover')};
  });
  console.log('BROWSER_MODELS',name,JSON.stringify(stats));
  assert(stats.meReady&&stats.foeReady,'Both photoreal characters must be visible');
  assert(stats.loaded.every(z=>z.vertices>5000&&z.vertices<=65535&&z.triangles>=10000&&z.triangles<=15000),'Mesh size out of range');
  assert(stats.loaded.every(z=>z.palm>=12),'Right palm on each character must have source geometry samples');
  assert(stats.loaded.every(z=>z.loc?.every(Number.isFinite)),'Hand geometry projection not finite');
  assert(stats.hand.every(Number.isFinite),'Hand position is non-finite');
  assert(stats.glOk,'WebGL reported an error');
  assert(stats.intro&&stats.career,'Career/intro missing');
  if(allowGame){
    await page.locator('#career .matchcard button.primary').click({timeout:10000});
    const entered=await page.evaluate(()=>document.body.classList.contains('match')&&Boolean(window.PILOTA_CAREER.current));
    assert(entered,'Career match did not start');
    await page.waitForTimeout(500);
    assert((await page.evaluate(()=>document.querySelector('#gl')?.width||0))>0);
    // One JPEG capture only. Two back-to-back GPU screenshots can stall
    // Chromium SwiftShader for >10 seconds even when the frame renders.
    const jpg=await page.screenshot({path:'reports/pilota/'+name+'-career.jpg',type:'jpeg',quality:48,timeout:55000,animations:'disabled'});
    if(name==='desktop'){
      console.log('QA_SCENE_JPEG_START '+jpg.toString('base64')+' QA_SCENE_JPEG_END');
      // Capture the unaltered Fal UV atlas to diagnose jersey/skin mismatches.
      const atlas=await page.evaluate(async()=>{
        const im=new Image(); im.src='/pilota/characters/jon_diffuse.png';await im.decode();
        const can=document.createElement('canvas');can.width=512;can.height=512;
        const c=can.getContext('2d');c.drawImage(im,0,0,512,512);
        return can.toDataURL('image/jpeg',.61).split(',')[1];
      });
      console.log('QA_ATLAS_JPEG_START '+atlas+' QA_ATLAS_JPEG_END');
    }
    // Neck follows the incoming ball smoothly, and the realistic mesh wrist remains articulated.
    const motion=await page.evaluate(()=>{
      const p=window.HPA.me, start=p.gaze, target=start>0?-1:1;
      p.update(.016,{look:target,swing:.5,swKind:'flat'});
      const first=p.gaze, wrist=p.J.haR.r.slice();
      p.update(.016,{look:target,swing:.5,swKind:'flat'});
      return {start,first,second:p.gaze,wrist,target};
    });
    assert(Number.isFinite(motion.second)&&Math.abs(motion.second)<=1,'Neck tracking exceeds safe bounds');
    assert(Math.abs(motion.target-motion.first)<Math.abs(motion.target-motion.start) &&
      Math.abs(motion.target-motion.second)<Math.abs(motion.target-motion.first),'Neck tracking is not smoothly interpolated');
    assert(motion.wrist.every(Number.isFinite)&&motion.wrist.length===3,'Invalid wrist pose');
    const gameplay=await page.evaluate(()=>({phase:window.HPA.M?.phase||null,hand:window.HPA.me.handPos(),rival:window.HPA.foe._realName,ball:window.HPA.M?.ball,gl:document.querySelector('#gl').getContext('webgl2')?.getError()}));
    assert(gameplay.hand?.every(Number.isFinite),'Invalid contact position during gameplay');
    assert(gameplay.rival,'Missing rival in match');
    report.push({name,stats,gameplay});
  }else report.push({name,stats});
  // Switch to each remaining rival through the old Arena matching engine.
  if(name==='desktop'){
    await page.evaluate(()=>{UI.CFG.rival=0;window.HPA.goMenu();});
    await page.waitForFunction(()=>Boolean(window.PILOTA_MODELS.ready.lurra),{timeout:30000});
    await page.evaluate(()=>{UI.CFG.rival=2;window.HPA.goMenu();});
    await page.waitForFunction(()=>Boolean(window.PILOTA_MODELS.ready.mendibe),{timeout:30000});
    const r=await page.evaluate(()=>Object.fromEntries(Object.entries(window.PILOTA_MODELS.ready).map(([id,m])=>[id,{tri:m.tris,vertices:m.verts,handSamples:m.handSamples}])));
    assert(Object.keys(r).length>=4,'Not all four characters loaded');
    assert(Object.values(r).every(q=>q.handSamples>=12),'One of the opponent hands cannot be tracked');
    console.log('ALL_MODELS',JSON.stringify(r));
    // Alternative UV orientation comparison for Fal's textured GLB.
    // Diagnostic-only: does not change production source assets or game logic.
    try{
      await page.goto(ORIGIN+'/pilota/?personajes3d=1&textureFlip=1',{waitUntil:'domcontentloaded',timeout:40000});
      await page.waitForFunction(()=>Boolean(window.PILOTA_MODELS?.ready?.jon&&window.PILOTA_MODELS?.ready?.harri),{timeout:45000});
      await page.locator('#career .matchcard button.primary').click({timeout:12000});
      await page.waitForTimeout(450);
      const flip=await page.screenshot({type:'jpeg',quality:46,timeout:55000});
      console.log('QA_FLIP_JPEG_START '+flip.toString('base64')+' QA_FLIP_JPEG_END');
    }catch(e){console.warn('UV alternative diagnostic unavailable:',String(e).slice(0,150));}

  }
  await context.close();
}
async function viewerCapture(flip){
 const ctx=await browser.newContext({viewport:{width:1180,height:780}});
 const page=await ctx.newPage();
 const dir=flip?'FLIP':'NORMAL';
 page.on('pageerror',e=>console.log('3D_VIEWER_PAGEERROR_'+dir,e.message));
 try{
  await page.goto(ORIGIN+'/pilota/personajes/?textureFlip='+(flip?'1':'0'),{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.getElementById('message')?.hidden===true,null,{timeout:25000});
  await page.waitForTimeout(900);
  const jpg=await page.screenshot({path:'reports/pilota/viewer-'+dir+'.jpg',type:'jpeg',quality:60,timeout:45000});
  console.log('QA_VIEWER_'+dir+'_JPEG_START '+jpg.toString('base64')+' QA_VIEWER_'+dir+'_JPEG_END');
 }catch(e){console.log('OPTIONAL_VIEWER_UNAVAILABLE_'+dir,e.message.slice(0,220));}
 await ctx.close();
}
try {
 await run('desktop',{viewport:{width:1440,height:900}});
 await viewerCapture(false);
 await viewerCapture(true);
 await run('mobile',{...devices['iPhone 13'],viewport:{width:390,height:844}},false);
 // Low-load fallback remains available and preserves career start.
 const ctx=await browser.newContext();
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push('fallback: '+e.message));
 await page.goto(ORIGIN+'/pilota/?personajes3d=0',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>Boolean(window.HPA&&window.PILOTA_CAREER),{timeout:40000});
 const fallback=await page.evaluate(()=>({real:window.PILOTA_MODELS.active,hero:!!window.HPA.me.realMesh,career:!!document.querySelector('#career .matchcard')}));
 assert(!fallback.real&&!fallback.hero&&fallback.career,'Fallback corrupted');
 report.push({name:'fallback',fallback});await ctx.close();
 if(errors.length)throw Error('Runtime errors: '+errors.join(' | '));
 console.log('QA_REPORT',JSON.stringify(report,null,2));
}finally{await browser.close();}
