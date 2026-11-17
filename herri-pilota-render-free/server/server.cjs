'use strict';
const {createServer}=require('node:http');
const {WebSocketServer,WebSocket}=require('ws');
const {randomBytes}=require('node:crypto');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const {Match,DT,inputOf}=require('./engine.cjs');
const port=Number(process.env.PORT||8787),rooms=new Map(),MAX_ROOMS=Number(process.env.MAX_ROOMS||600);
const origins=String(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code=()=>[...randomBytes(7)].slice(0,6).map(v=>CODE_CHARS[v%CODE_CHARS.length]).join('');
const safeName=s=>String(s||'PILOTARI').normalize('NFKC').replace(/[^\p{L}\p{N} .-]/gu,'').trim().slice(0,18)||'PILOTARI';
const send=(ws,msg)=>{if(ws?.readyState===WebSocket.OPEN && ws.bufferedAmount<512*1024){try{ws.send(JSON.stringify(msg));}catch{}}};
const http=createServer((req,res)=>{
 if(req.url==='/'||req.url==='/index.html'){
  const p=join(__dirname,'../client/index.html'),alt=join(__dirname,'index.html');
  const name=existsSync(p)?p:alt;
  try{const data=readFileSync(name);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}
  catch(e){res.writeHead(503);res.end('HTML missing');}return;
 }
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,name:'HERRI-PILOTA-SERVER',rooms:rooms.size,version:'46.0'}));return;}
 res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('Herri Pilota V46 · servidor WebSocket autoritativo. Conéctate usando /ws.');
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
http.on('upgrade',(req,socket,head)=>{
 const origin=req.headers.origin;
 if(req.url!=='/ws' || (origins.length && (!origin||!origins.includes(origin)))){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
function broadcast(room,msg){for(const player of room.players)if(player)send(player.ws,msg);}
function clearRoom(room,reason='ROOM_CLOSED'){if(!rooms.has(room.code))return;rooms.delete(room.code);broadcast(room,{type:'closed',reason});}
function abandon(ws){const room=ws.room;if(!room)return;const idx=ws.side;
 ws.room=null;ws.side=null;if(room.players[idx]?.ws!==ws)return;
 if(room.players[1-idx]){const rival=room.players[1-idx];send(rival.ws,{type:'opponent_left'});rival.ws.room=null;rival.ws.side=null;}
 clearRoom(room,'OPPONENT_LEFT');}
wss.on('connection',ws=>{
 ws.isAlive=true;ws.inputAt=0;ws.msgAt=0;ws.msgCount=0;ws.room=null;ws.side=null;
 ws.on('pong',()=>{ws.isAlive=true});
 ws.on('message',buf=>{
  let m;try{m=JSON.parse(buf.toString());}catch{send(ws,{type:'error',code:'BAD_JSON'});return;}
  if(!m||typeof m!=='object'||Array.isArray(m))return;
  const now=Date.now();if(now-ws.msgAt>1000){ws.msgAt=now;ws.msgCount=0;}if(++ws.msgCount>65){send(ws,{type:'error',code:'RATE_LIMIT'});ws.close(1008);return;}
  if(m.type==='ping'){send(ws,{type:'pong',n:m.n,t:now});return;}
  if(m.type==='leave'){abandon(ws);return;}
  if(m.type==='create'){
   if(ws.room||rooms.size>=MAX_ROOMS){send(ws,{type:'error',code:'ROOM_LIMIT'});return;}
   let id;do{id=code()}while(rooms.has(id));
   const target=[12,18,22].includes(m.config?.target)?m.config.target:22;
   const config={target,serve:m.config?.serve==='4-7'?'4-7':'none',mode:m.config?.mode==='fourhalf'?'fourhalf':'singles',venue:String(m.config?.venue||'FRONTOIA').slice(0,55)};
   const room={code:id,config,players:[{ws,name:safeName(m.name)},null],match:null,created:now,sendTicks:0};rooms.set(id,room);ws.room=room;ws.side=0;
   send(ws,{type:'created',room:id,side:0,config});return;
  }
  if(m.type==='join'){
   if(ws.room)return;const id=String(m.room||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);const room=rooms.get(id);
   if(!room||room.players[1]||room.match){send(ws,{type:'error',code:'ROOM_NOT_FOUND_OR_FULL'});return;}
   room.players[1]={ws,name:safeName(m.name)};ws.room=room;ws.side=1;
   room.match=new Match(room.config);const cfg={...room.config,p1:room.players[0].name,p2:room.players[1].name};
   broadcast(room,{type:'start',room:id,config:cfg,names:[cfg.p1,cfg.p2],tick:room.match.tick});return;
  }
  if(m.type==='input'&&ws.room?.match&&ws.side!==null){
   if(now-ws.inputAt<12)return;ws.inputAt=now;ws.room.match.setInput(ws.side,inputOf(m.i));return;
  }
  if(m.type==='rematch'&&ws.room?.match&&ws.side===0&&ws.room.match.phase==='finished'){
   ws.room.match=new Match(ws.room.config);broadcast(ws.room,{type:'start',room:ws.room.code,config:{...ws.room.config,p1:ws.room.players[0].name,p2:ws.room.players[1].name}});
  }
 });
 ws.on('close',()=>abandon(ws));ws.on('error',()=>abandon(ws));
});
let prev=process.hrtime.bigint(),acc=0,tick=0;
const loop=setInterval(()=>{
 const now=process.hrtime.bigint(),delta=Math.min(Number(now-prev)/1e9,.13);prev=now;acc+=delta;
 let n=0;while(acc>=DT&&n<7){acc-=DT;n++;tick++;
  for(const r of rooms.values())if(r.match){r.match.step();if(tick%3===0){broadcast(r,{type:'snap',s:r.match.snap()});}}
 }
 if(n===7&&acc>DT)acc=0;
 const ms=Date.now();for(const r of rooms.values())if(ms-r.created>2*60*60*1000)clearRoom(r,'TTL');
},1000/60);
loop.unref();
const pingTimer=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;try{ws.ping();}catch{}}},15000);pingTimer.unref();
http.listen(port,'0.0.0.0',()=>console.log(`HERRI PILOTA V46 game server listening on :${port} rooms=0`));
function shutdown(){for(const r of [...rooms.values()])clearRoom(r,'SERVER_RESTART');wss.close();http.close();clearInterval(loop);clearInterval(pingTimer);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);