from pathlib import Path
import re, base64

path=Path('public/index.html')
src=path.read_text(encoding='utf-8')
m=re.search(r'(const PACK=\{"pilota":")([A-Za-z0-9+/=]+)(")',src)
if not m:
    raise SystemExit('Pilota PACK not found')
pil=base64.b64decode(m.group(2)).decode('utf-8')

if 'ONLINE PILOTA PRO V4' in pil:
    print('Pilota Pro V4 already present')
    raise SystemExit(0)

old = """ HPOnline.inputT+=dt;
 if(edge||HPOnline.inputT>=1/30){
   HPOnline.inputT=0;
   hpSendGame({type:'input',i:{
     x:mv.x,z:mv.z,
     flat:flatHeld,lob:lobHeld,drop:dropHeld,
     aseq:HPOnline.guestPred.seq,kind:HPOnline.guestPred.kind
   }});
 }

 const pose=hpRemotePose();
 hpApplySmooth(S,pose&&pose.s,dt);

 /* Predicción visual SOLO del pelotari azul local. */"""
new = """ HPOnline.inputT+=dt;
 if(edge||HPOnline.inputT>=1/30){
   HPOnline.inputT=0;
   hpSendGame({type:'input',i:{
     x:mv.x,z:mv.z,
     flat:flatHeld,lob:lobHeld,drop:dropHeld,
     aseq:HPOnline.guestPred.seq,kind:HPOnline.guestPred.kind
   }});
 }

 const pose=hpRemotePose();
 hpApplySmooth(S,pose&&pose.s,dt);

 /* ONLINE PILOTA PRO V4: predicción local estable, con reconciliación suave.
    El host sigue siendo la autoridad de física y puntuación. */
 if(!HPOnline.guestPred.lastLive) HPOnline.guestPred.lastLive=!!S.live;
 if(HPOnline.guestPred.lastLive&&!S.live){
   HPOnline.guestPred.armed=false;
   HPOnline.guestPred.seq=0;
   HPOnline.guestPred.round=Date.now();
 }
 HPOnline.guestPred.lastLive=!!S.live;

 /* Predicción visual SOLO del pelotari azul local. */"""
if old not in pil:
    raise SystemExit('guest prediction anchor not found')
pil=pil.replace(old,new,1)

old2 = """   const rate=wantsContact?(err>.9?13:8):(err>1.6?8:3.2);"""
new2 = """   const rate=wantsContact?(err>.9?10:6):(err>1.6?4.5:1.8);"""
if old2 not in pil:
    raise SystemExit('reconciliation rate not found')
pil=pil.replace(old2,new2,1)

camera_fn = r'''function hpCameraSafety(S,dt){
 /* ONLINE PILOTA PRO V4: camera never sacrifices the local player in portrait. */
 let c=null;
 try{if(typeof camera!=='undefined')c=camera;}catch(e){}
 if(!c){try{if(typeof cam!=='undefined')c=cam;}catch(e){}}
 if(!c||!c.isCamera)return;
 const local=HPOnline.isHost?(S.me||S.player||S.p1||S.hero):(S.foe||S.player2||S.p2||S.hero);
 if(!local||!local.position)return;
 const aspect=(window.innerWidth||1)/(window.innerHeight||1);
 const targetFov=aspect<.82?70:(aspect<1?66:(aspect<1.25?60:55));
 if(typeof c.fov==='number'){
   c.fov=lerp(c.fov,targetFov,1-Math.exp(-dt*5));
   if(c.updateProjectionMatrix)c.updateProjectionMatrix();
 }
 try{
   if(typeof local.position.clone==='function'&&typeof local.position.clone().project==='function'){
     const q=local.position.clone().project(c);
     const edge=Math.max(Math.abs(q.x),Math.abs(q.y));
     if(edge>.78&&typeof c.fov==='number'){
       const extra=Math.min(8,(edge-.78)*24);
       c.fov=lerp(c.fov,Math.min(74,targetFov+extra),1-Math.exp(-dt*7));
       if(c.updateProjectionMatrix)c.updateProjectionMatrix();
     }
   }
 }catch(e){}
}
'''
needle='function hpGuestUpdate(S,dt){'
if needle not in pil:
    raise SystemExit('hpGuestUpdate not found for camera insertion')
pil=pil.replace(needle,camera_fn+'\n'+needle,1)

marker=" $('hScore').textContent=Math.round(S.score);"
if marker not in pil:
    raise SystemExit('guest end marker not found')
pil=pil.replace(marker," hpCameraSafety(S,dt);"+marker,1)

anchor=" HPOnline.remotePrev={flat:!!r.flat,lob:!!r.lob,drop:!!r.drop};\n};"
if anchor not in pil:
    raise SystemExit('host p2Input end anchor not found')
pil=pil.replace(anchor," HPOnline.remotePrev={flat:!!r.flat,lob:!!r.lob,drop:!!r.drop};\n hpCameraSafety(this,dt);\n};",1)

host_anchor="""const _hpP2=SPORTS.pilota.p2Input;SPORTS.pilota.p2Input=function(dt){"""
if host_anchor not in pil:
    raise SystemExit('patched host input not found')
round_guard="""
 if(HPOnline._j2LastLive===undefined)HPOnline._j2LastLive=!!this.live;
 if(HPOnline._j2LastLive&&!this.live){
   HPOnline._j2RoundBaseSeq=HPOnline.remoteActionSeq||0;
   this.p2Armed=false;this.p2Charge=0;this.p2Swing=0;
 }
 HPOnline._j2LastLive=!!this.live;
"""
pil=pil.replace(host_anchor,host_anchor+round_guard,1)

oldserve="""if(this.p2Armed&&!held&&this.p2Charge>.02)this.p2Serve();"""
newserve="""if(this.p2Armed&&(HPOnline.remoteActionSeq||0)>(HPOnline._j2RoundBaseSeq||0)&&!held&&this.p2Charge>.02)this.p2Serve();"""
if oldserve not in pil:
    raise SystemExit('serve condition not found')
pil=pil.replace(oldserve,newserve,1)

enc=base64.b64encode(pil.encode('utf-8')).decode('ascii')
src=src[:m.start(2)]+enc+src[m.end(2):]
path.write_text(src,encoding='utf-8')
print('Applied Pilota Pro V4: adaptive camera + smoother J2 prediction + round-safe serving')
