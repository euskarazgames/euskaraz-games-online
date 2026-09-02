from pathlib import Path
import re, base64

path=Path('public/index.html')
src=path.read_text(encoding='utf-8')
m=re.search(r'(const PACK=\{\"pilota\":\")([A-Za-z0-9+/=]+)(\")',src)
if not m: raise SystemExit('Pilota PACK not found')
pil=base64.b64decode(m.group(2)).decode('utf-8')
changed=False

# Host: use the remote analogue vector directly.
if 'ONLINE J2: movimiento analógico directo' not in pil:
    start_tag='const _hpP2=SPORTS.pilota.p2Input;SPORTS.pilota.p2Input=function(dt){'
    end_tag='function hpSnap(S)'
    start=pil.index(start_tag); end=pil.index(end_tag,start)
    new='''const _hpP2=SPORTS.pilota.p2Input;SPORTS.pilota.p2Input=function(dt){
 if(!(HPOnline.active&&HPOnline.isHost))return _hpP2.call(this,dt);
 const r=HPOnline.remoteInput||{};
 let x=Number(r.x)||0,z=Number(r.z)||0;
 x=clamp(x,-1,1);z=clamp(z,-1,1);
 let l=Math.hypot(x,z);if(l>1){x/=l;z/=l;l=1;}
 /* ONLINE J2: movimiento analógico directo */
 const kf=1-Math.pow(.00035,dt);
 this.p2AimX=lerp(this.p2AimX,clamp(x*1.2,-1,1),kf);
 this.p2AimY=lerp(this.p2AimY,clamp(z*1.2,-1,1),kf);
 const seq=+r.aseq||0;
 if(seq>(HPOnline.remoteActionSeq||0)){HPOnline.remoteActionSeq=seq;const k=r.kind||'flat';this.p2Kind=k==='lob'?'lob':(k==='drop'?'drop':'flat');this.p2Armed=true;this.p2Charge=Math.max(this.p2Charge||0,.06);}
 const held=!!(r.flat||r.lob||r.drop);if(this.p2Armed&&held)this.p2Charge=Math.min(1,this.p2Charge+dt*1.5);
 const sp=(l>.85?13.6:9.2)*l;
 this.fx=clamp(this.fx+x*sp*dt,this.XL+.4,this.XR+4.2);
 this.fz=clamp(this.fz+z*sp*dt,this.WALL+2.2,this.BACK+4.2);
 if(this.p2Armed&&this.live&&this.turn==='a'&&this.wall){const d=dist2(this.fx,this.fz,this.b.x,this.b.z);if(d<4.6&&d>1.2){const q=(1-d/4.6)*7.5*dt;this.fx+=(this.b.x-this.fx)/d*q;this.fz+=(this.b.z-this.fz)/d*q;}}
 this.foe.position.set(this.fx,0,this.fz);
 if(this.p2Swing<=0){this.foe.rotation.y=Math.atan2(this.b.x-this.fx,this.b.z-this.fz);animAthlete(this.foe,l,dt);}
 this.p2Swing=Math.max(0,this.p2Swing-dt*3.1);swingRig(this.foe,this.p2Swing,this.p2Kind);
 if(!this.live&&this.server==='a'){this.b.set(this.fx,1.42+Math.sin(clockT*3)*.22,this.fz-.4);this.ball.position.copy(this.b);this.bsh.position.set(this.b.x,.05,this.b.z);if(this.p2Armed&&!held&&this.p2Charge>.02)this.p2Serve();}
 HPOnline.remotePrev={flat:!!r.flat,lob:!!r.lob,drop:!!r.drop};
};
'''
    pil=pil[:start]+new+pil[end:];changed=True

# Guest: arrows are J2 movement too. WASD and touch joystick remain valid.
if 'ONLINE J2 INPUT V2' not in pil:
    old_aim="""function inAim(){
let x=(keys['arrowright']?1:0)-(keys['arrowleft']?1:0)+camV.x;
let y=(keys['arrowdown']?1:0)-(keys['arrowup']?1:0)+camV.y;
const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
return{x,y,l:Math.min(1,l)};
}"""
    new_aim="""function inAim(){
/* ONLINE J2 INPUT V2: on the guest, arrow keys belong to player movement.
   Camera touch/aim remains available on the right stick. */
const onGuest=!!(window.HPOnline&&HPOnline.active&&!HPOnline.isHost);
let x=(onGuest?0:((keys['arrowright']?1:0)-(keys['arrowleft']?1:0)))+camV.x;
let y=(onGuest?0:((keys['arrowdown']?1:0)-(keys['arrowup']?1:0)))+camV.y;
const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
return{x,y,l:Math.min(1,l)};
}"""
    if old_aim not in pil: raise SystemExit('inAim block not found')
    pil=pil.replace(old_aim,new_aim,1)

    needle='function hpGuestUpdate(S,dt){\n const mv=inMove();'
    repl="""function hpOnlineGuestMove(){
 let x=moveV.x+(keys['d']?1:0)-(keys['a']?1:0)+(keys['arrowright']?1:0)-(keys['arrowleft']?1:0);
 let z=moveV.y+(keys['s']?1:0)-(keys['w']?1:0)+(keys['arrowdown']?1:0)-(keys['arrowup']?1:0);
 let l=Math.hypot(x,z);if(l>1){x/=l;z/=l;l=1;}
 return{x,z,l:Math.min(1,l)};
}
function hpGuestUpdate(S,dt){
 const mv=hpOnlineGuestMove();"""
    if needle not in pil: raise SystemExit('hpGuestUpdate input line not found')
    pil=pil.replace(needle,repl,1);changed=True

if changed:
    enc=base64.b64encode(pil.encode('utf-8')).decode('ascii')
    src=src[:m.start(2)]+enc+src[m.end(2):]
    path.write_text(src,encoding='utf-8')
    print('Patched J2 host + guest controls (arrows/WASD/touch)')
else:
    print('J2 controls already current')
