'use strict';
// Herri Pilota server-side ruleset. The browser never declares ball positions or points.
const DT = 1 / 60;
const COURT = Object.freeze({front:-14,back:12,left:-9.4,right:9.2,top:14,falta:1.5,r:.19});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sq=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rnd=x=>Math.round(x*1000)/1000;
function inputOf(raw={}) {return {
 x:clamp(Number.isFinite(raw.x)?raw.x:0,-1,1),z:clamp(Number.isFinite(raw.z)?raw.z:0,-1,1),
 flat:raw.flat===true,lob:raw.lob===true,drop:raw.drop===true, aimX:clamp(Number.isFinite(raw.aimX)?raw.aimX:0,-1,1),aimY:clamp(Number.isFinite(raw.aimY)?raw.aimY:0,-1,1)
};}
function player(x,z) {return{x,z,vx:0,vz:0,energy:1,input:inputOf(),holding:false,kind:'flat',charge:0,lastHitTick:-100,sw:0};}
class Match {
 constructor(opts={}){
  this.target=[12,18,22].includes(opts.target)?opts.target:22;
  this.serveRule=opts.serve==='4-7'?'4-7':'none';this.mode=opts.mode==='fourhalf'?'fourhalf':'singles';
  this.p=[player(-1,7),player(2,5)];this.score=[0,0];this.server=0;this.turn=0;this.tick=0;this.seq=0;
  this.ball={x:-1,y:1.5,z:6.6,vx:0,vy:0,vz:0,spin:0};this.lastHitter=-1;
  this.phase='serve';this.wall=false;this.bounces=0;this.serveActive=false;this.serveTicks=0;
  this.pointTimer=0;this.pointWinner=-1;this.matchWinner=-1;this.rally=0;this.event='SAKEA';
 }
 setInput(side,raw){if(side!==0&&side!==1)return;this.p[side].input=inputOf(raw);}
 resetServe(){const p=this.p[this.server];this.ball={x:p.x,y:1.5,z:p.z-.4,vx:0,vy:0,vz:0,spin:0};this.turn=this.server;this.lastHitter=-1;this.bounces=0;this.wall=false;this.serveActive=false;this.serveTicks=0;this.phase='serve';this.event='SAKEA';for(const p of this.p){p.holding=false;p.charge=0;}}
 point(winner,reason){if(this.phase==='point'||this.phase==='finished')return;this.score[winner]++;this.pointWinner=winner;this.server=winner;this.event=reason;this.phase='point';this.pointTimer=80;for(const p of this.p){p.holding=false;p.charge=0;}
 if(this.score[winner]>=this.target){this.phase='finished';this.matchWinner=winner;this.event='PARTIDA AMAITU';}
 }
 hit(side,kind,power,serving){const p=this.p[side],b=this.ball;
  if(this.tick-p.lastHitTick<14)return false;
  if(!serving && (this.phase!=='rally'||!this.wall||this.turn!==side||this.bounces>1))return false;
  if(!serving && (sq(p,b)>2.65 || b.y<.22 || b.y>3.7))return false;
  if(serving && (this.phase!=='serve'||this.server!==side))return false;
  const aim=p.input;const aimX=clamp(aim.x*.78+aim.aimX*.5,-1,1), depth=clamp(aim.z*.7-aim.aimY*.5,-1,1);
  let goalX=clamp(aimX*8.15,-8.4,8.4),goalY=2.15+(depth+1)*2.25,speed=19+power*12;
  if(kind==='lob'){goalY=10.5+power*1.9;speed=16+power*3.7;}
  else if(kind==='drop'){goalY=1.85+power*.7;speed=12.5+power*3.7;}
  else goalY=clamp(goalY,2.05,8.9);
  if(serving){goalY=Math.max(3.1,goalY);speed=Math.max(21,speed)}
  const dZ=Math.max(.5,p.z-COURT.front),dX=goalX-p.x,dist=Math.max(.7,Math.hypot(dX,dZ));const travel=dist/speed;
  b.x=p.x;b.y=Math.max(.85,serving?1.5:b.y);b.z=p.z-.18;
  b.vx=dX/travel;b.vz=-dZ/travel;b.vy=(goalY-b.y+.5*26*travel*travel)/travel;b.spin=aimX*.45;
  this.lastHitter=side;this.turn=1-side;this.phase='rally';this.wall=false;this.bounces=0;this.serveActive=serving;this.serveTicks=0;this.rally++;p.sw=1;p.lastHitTick=this.tick;this.event=serving?'SAKEA':'JOKOA';
  return true;
 }
 step(){this.tick++;
  for(let side=0;side<2;side++){
   const p=this.p[side],i=p.input;
   const moving=Math.hypot(i.x,i.z),sprinting=moving>.86;
   p.energy=clamp(p.energy+(sprinting&&moving>.18?-.125:.1)*DT,.1,1);
   const speed=(sprinting?12.4*(.78+.22*p.energy):8.9),n=Math.max(1,moving),rate=moving>.09?14:21,blend=1-Math.exp(-rate*DT);
   p.vx+=(i.x/n*speed-p.vx)*blend;p.vz+=(i.z/n*speed-p.vz)*blend;
   p.x=clamp(p.x+p.vx*DT,COURT.left+.4,COURT.right+.2);
   p.z=clamp(p.z+p.vz*DT,COURT.front+2.2,COURT.back+.6);p.sw=Math.max(0,p.sw-3*DT);
   const kind=i.flat?'flat':i.lob?'lob':i.drop?'drop':null;
   if(kind){if(!p.holding){p.holding=true;p.kind=kind;p.charge=0;} p.charge=Math.min(1,p.charge+DT*1.5);}
   else if(p.holding){const k=p.kind,charge=p.charge;p.holding=false;p.charge=0;this.hit(side,k,charge,this.phase==='serve');}
  }
  if(this.phase==='serve'){
   const p=this.p[this.server];this.ball.x=p.x;this.ball.y=1.48+Math.sin(this.tick*.06)*.17;this.ball.z=p.z-.4;return;
  }
  if(this.phase==='point'){
   if(--this.pointTimer<=0)this.resetServe();return;
  }
  if(this.phase==='finished')return;
  const b=this.ball,ox=b.x,oy=b.y,oz=b.z;
  b.vy-=26*DT;b.vx+=b.spin*DT*5;b.spin*=1-DT*.9;
  const drag=1-.09*DT;b.vx*=drag;b.vy*=drag;b.vz*=drag;
  b.x+=b.vx*DT;b.y+=b.vy*DT;b.z+=b.vz*DT;
  // Frontis contact with substep crossing, preventing tunneling at high ball speeds.
  if(b.z<=COURT.front+.19 && oz>COURT.front+.19){
   const t=(oz-(COURT.front+.19))/(oz-b.z);const y=oy+(b.y-oy)*t;
   if(y<COURT.falta||y>COURT.top){this.point(1-this.lastHitter,'FRONTISEKO FALTA');return;}
   b.z=COURT.front+.19+(COURT.front+.19-b.z);b.vz=Math.abs(b.vz)*.86;
   this.wall=true;this.serveTicks++;this.event='FRONTISA';
  }
  if(b.x<COURT.left+.19){b.x=COURT.left+.19+(COURT.left+.19-b.x);b.vx=Math.abs(b.vx)*.8;}
  if(b.x>COURT.right-.19){b.x=COURT.right-.19-(b.x-(COURT.right-.19));b.vx=-Math.abs(b.vx)*.8;}
  if(b.y>=COURT.top){b.y=COURT.top-.02;b.vy=-Math.abs(b.vy)*.72;}
  if(b.z>COURT.back+.3){this.point(1-this.lastHitter,'LUZEA');return;}
  if(b.y<=COURT.r){b.y=COURT.r;b.vy=Math.abs(b.vy)*.68;this.bounces++;
   if(!this.wall){this.point(1-this.lastHitter,'FRONTISA BAINO LEHEN');return;}
   if(this.serveActive && this.serveRule==='4-7' && this.bounces===1){
    if(b.z<COURT.front+4*2.5 || b.z>COURT.front+7*2.5){this.point(1-this.lastHitter,'SAKE FALTA');return;}
   }
   this.serveActive=false;
   if(this.bounces>=2){this.point(this.lastHitter,'BI BOTE');return;}
   this.event='LEHEN BOTE';
  }
  // Rally timeout prevents a stalled match from remaining active forever.
  if(this.rally>0 && Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)<1.2 && b.y<.3)this.point(this.lastHitter,'BI BOTE');
 }
 snap(){const p=this.p,b=this.ball;return{
  tick:this.tick,seq:++this.seq,ts:Date.now(),b:[rnd(b.x),rnd(b.y),rnd(b.z)],vel:[rnd(b.vx),rnd(b.vy),rnd(b.vz)],
  p:[rnd(p[0].x),rnd(p[0].z)],f:[rnd(p[1].x),rnd(p[1].z)],en:[rnd(p[0].energy),rnd(p[1].energy)],
  m:null,f2:null,sc:this.score[0],fc:this.score[1],live:this.phase==='rally',wall:this.wall,
  turn:this.turn===0?'p':'a',server:this.server===0?'p':'a',sw:rnd(p[0].sw),p2sw:rnd(p[1].sw),k:p[0].kind,k2:p[1].kind,
  phase:this.phase,winner:this.matchWinner,event:this.event,rally:this.rally
  };}
}
module.exports={Match,DT,inputOf,COURT};