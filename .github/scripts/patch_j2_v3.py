from pathlib import Path
import re, base64

path=Path('public/index.html')
src=path.read_text(encoding='utf-8')
m=re.search(r'(const PACK=\{"pilota":")([A-Za-z0-9+/=]+)(")',src)
if not m:
    raise SystemExit('Pilota PACK not found')

pil=base64.b64decode(m.group(2)).decode('utf-8')
if 'ONLINE J2 CONTACT V3' in pil:
    print('J2 contact V3 already present')
    raise SystemExit(0)

start=pil.index('function hpGuestUpdate(S,dt){')
end_marker=" $('hScore').textContent=Math.round(S.score);"
end=pil.index(end_marker,start)

new_head="""function hpGuestUpdate(S,dt){
 const mv=hpOnlineGuestMove();
 if(!HPOnline.guestPred){
   HPOnline.guestPred={x:S.fx,z:S.fz,seq:0,kind:'flat',armed:false};
 }

 /* ONLINE J2 CONTACT V3: el invitado conserva localmente la intención de golpe.
    Así se ve el mismo acercamiento fino a la pelota que en J1, mientras el host
    sigue siendo la única autoridad de física, pelota, puntos y validación. */
 let edge=false;
 if(pop('e')||pop('n')){HPOnline.guestPred.seq++;HPOnline.guestPred.kind='flat';HPOnline.guestPred.armed=true;edge=true;}
 if(pop('q')||pop('m')){HPOnline.guestPred.seq++;HPOnline.guestPred.kind='lob';HPOnline.guestPred.armed=true;edge=true;}
 if(pop('tab')||pop(',')){HPOnline.guestPred.seq++;HPOnline.guestPred.kind='drop';HPOnline.guestPred.armed=true;edge=true;}
 const flatHeld=!!(keys['e']||keys['n']);
 const lobHeld=!!(keys['q']||keys['m']);
 const dropHeld=!!(keys['tab']||keys[',']);

 HPOnline.inputT+=dt;
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

 /* Predicción visual SOLO del pelotari azul local. */
 const mag=Math.min(1,mv.l||Math.hypot(mv.x,mv.z));
 const sp=((mag>.84?13.2:9.0)+PB.speed)*mag;
 HPOnline.guestPred.x=clamp(HPOnline.guestPred.x+mv.x*sp*dt,S.XL+.4,S.XR+4.2);
 HPOnline.guestPred.z=clamp(HPOnline.guestPred.z+mv.z*sp*dt,S.WALL+2.2,S.BACK+4.2);

 const auth=pose&&pose.s&&pose.s.f;
 const hostSwing=(pose&&pose.s&&pose.s.p2sw)||0;
 if(hostSwing>.08||(pose&&pose.s&&pose.s.turn!=='a'))HPOnline.guestPred.armed=false;
 const wantsContact=!!(HPOnline.guestPred.armed&&S.live&&S.turn==='a'&&S.wall);

 /* Cerca de la pelota reconciliamos más rápido con la posición autoritativa.
    Esto hace visible el mismo auto-ajuste corto que usa el juego local. */
 if(auth){
   const err=Math.hypot(HPOnline.guestPred.x-auth[0],HPOnline.guestPred.z-auth[1]);
   const rate=wantsContact?(err>.9?13:8):(err>1.6?8:3.2);
   const k=1-Math.exp(-dt*rate);
   HPOnline.guestPred.x=lerp(HPOnline.guestPred.x,auth[0],k);
   HPOnline.guestPred.z=lerp(HPOnline.guestPred.z,auth[1],k);
 }

 /* Pequeña compensación de latencia visual (35 ms): no mueve la pelota real ni
    amplía la zona válida de golpe. Solo coloca el cuerpo donde el host ya lo
    está llevando para que mano y pelota parezcan encontrarse de forma natural. */
 if(wantsContact){
   const lead=.035;
   const bx=S.b.x+(S.v?S.v.x:0)*lead;
   const bz=S.b.z+(S.v?S.v.z:0)*lead;
   const dx=bx-HPOnline.guestPred.x,dz=bz-HPOnline.guestPred.z,d=Math.hypot(dx,dz);
   if(d<4.8&&d>1.12){
     const q=(1-d/4.8)*8.2*dt;
     HPOnline.guestPred.x=clamp(HPOnline.guestPred.x+dx/d*q,S.XL+.4,S.XR+4.2);
     HPOnline.guestPred.z=clamp(HPOnline.guestPred.z+dz/d*q,S.WALL+2.2,S.BACK+4.2);
   }
 }

 /* En el instante del golpe, convergemos deprisa a la posición host para que
    no parezca que la pelota sale a distancia del jugador. */
 if(hostSwing>.08&&auth){
   const k=1-Math.exp(-dt*24);
   HPOnline.guestPred.x=lerp(HPOnline.guestPred.x,auth[0],k);
   HPOnline.guestPred.z=lerp(HPOnline.guestPred.z,auth[1],k);
 }

 if(S.foe){
   S.foe.position.set(HPOnline.guestPred.x,0,HPOnline.guestPred.z);
   S.foe.rotation.y=Math.atan2(S.b.x-HPOnline.guestPred.x,S.b.z-HPOnline.guestPred.z);
   animAthlete(S.foe,mag,dt);
   if(hostSwing>.01)swingRig(S.foe,hostSwing,(pose&&pose.s&&pose.s.k2)||HPOnline.guestPred.kind);
 }
"""

pil=pil[:start]+new_head+pil[end:]
enc=base64.b64encode(pil.encode('utf-8')).decode('ascii')
src=src[:m.start(2)]+enc+src[m.end(2):]
path.write_text(src,encoding='utf-8')
print('Patched J2 contact feel V3')
