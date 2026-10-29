/* Mundu Jolastuak · Euskaraz Games — DOM text localization.
   © Euskaraz Games. Original games: © 2026 Lovis Odin, MIT.
   Generic UI strings translated here; canvas textures and speech remain originals. */
(() => {
"use strict";
const translations = {
"Loading…":"Kargatzen…", "Loading...":"Kargatzen...", "LOADING":"KARGATZEN", "Loading":"Kargatzen",
"PRESS SPACE":"SAKATU ZURIUNE-BARRA","press space":"sakatu zuriune-barra",
"PRESS SPACE TO START":"SAKATU ZURIUNE-BARRA HASTEKO",
"Press space to start":"Sakatu zuriune-barra hasteko",
"press space to start":"sakatu zuriune-barra hasteko",
"PRESS SPACE TO PLAY":"SAKATU ZURIUNE-BARRA JOLASTEKO",
"Press Space to Play":"Sakatu zuriune-barra jolasteko",
"PRESS ENTER TO START":"SAKATU ENTER HASTEKO",
"Press Enter to Start":"Sakatu Enter hasteko",
"PRESS ENTER":"SAKATU ENTER", "TAP TO START":"UKITU HASTEKO",
"CLICK TO START":"KLIK EGIN HASTEKO", "CLICK TO PLAY":"KLIK EGIN JOLASTEKO",
"Tap to play":"Ukitu jolasteko", "Click to play":"Egin klik jolasteko",
"Press any key":"Sakatu edozein tekla",
"Press any key to start":"Sakatu edozein tekla hasteko",
"Press any key to continue":"Sakatu edozein tekla jarraitzeko",
"Click anywhere to start":"Egin klik edonon hasteko",
"START":"HASI", "Start":"Hasi", "Start Game":"Hasi jokoa", "START GAME":"HASI JOKOA",
"PLAY":"JOKATU", "Play":"Jokatu", "PLAY AGAIN":"JOKATU BERRIRO",
"Play again":"Jokatu berriro", "REPLAY":"BERRIRO JOKATU", "Replay":"Berriro jokatu",
"RESTART":"BERRABIARAZI", "Restart":"Berrabiarazi", "Retry":"Saiatu berriro",
"TRY AGAIN":"SAIATU BERRIRO", "Try Again":"Saiatu berriro",
"CONTINUE":"JARRAITU", "Continue":"Jarraitu", "RESUME":"JARRAITU", "Resume":"Jarraitu",
"PAUSED":"PAUSATUTA","Paused":"Pausatuta","paused":"pausatuta",
"PAUSE":"PAUSATU","Pause":"Pausatu","MENU":"MENUA","Menu":"Menua",
"CONTROLS":"KONTROLAK","Controls":"Kontrolak","HOW TO PLAY":"NOLA JOKATU",
"How to play":"Nola jokatu","INSTRUCTIONS":"ARGIBIDEAK","Instructions":"Argibideak",
"Settings":"Ezarpenak","SETTINGS":"EZARPENAK",
"GAME OVER":"JOKOA AMAITU DA", "Game Over":"Jokoa amaitu da",
"YOU WIN":"IRABAZI DUZU","You win!":"Irabazi duzu!","WIN":"GARAIPENA",
"VICTORY":"GARAIPENA","Victory":"Garaipena","LEVEL COMPLETE":"MAILA GAINDITUTA",
"Level Complete":"Maila gaindituta","Complete!":"Osatuta!",
"MISSION COMPLETE":"MISIOA BETETA","MISSION FAILED":"MISIOAK HUTS EGIN DU",
"FINISH":"AMAITU","FINISHED":"AMAITUTA","Congratulations!":"Zorionak!",
"GOOD LUCK":"ZORTE ON","Good luck!":"Zorte on!",
"NEXT":"HURRENGOA","Next":"Hurrengoa","BACK":"ATZERA","Back":"Atzera",
"EXIT":"IRTEN","Exit":"Irten","QUIT":"IRTEN","Quit":"Irten",
"YES":"BAI","NO":"EZ","OK":"ADOS","CANCEL":"UTZI",
"Score":"Puntuazioa","SCORE":"PUNTUAZIOA","Points":"Puntuak","POINTS":"PUNTUAK",
"Time":"Denbora","TIME":"DENBORA","Lives":"Bizitzak","LIVES":"BIZITZAK",
"Health":"Osasuna","HEALTH":"OSASUNA","Energy":"Energia","ENERGY":"ENERGIA",
"Distance":"Distantzia","DISTANCE":"DISTANTZIA","Speed":"Abiadura","SPEED":"ABIADURA",
"Level":"Maila","LEVEL":"MAILA","Best":"Onena","BEST":"ONENA",
"High score":"Puntuazio onena","HIGH SCORE":"PUNTUAZIO ONENA",
"Player 1":"1. jokalaria","Player 2":"2. jokalaria",
"PLAYER 1":"1. JOKALARIA","PLAYER 2":"2. JOKALARIA",
"SOLO":"BAKARKA","Solo":"Bakarka","CO-OP":"ELKARLANEAN","Co-op":"Elkarlanean",
"Jump":"Salto egin","JUMP":"SALTO EGIN","MOVE":"MUGITU","Move":"Mugitu",
"Fly":"Hegan egin","FLY":"HEGAN EGIN","Glide":"Planeatu","GLIDE":"PLANEATU",
"RUN":"KORRIKA","Run":"Korrika","Dash":"Oldartu","DASH":"OLDARTU",
"Steer":"Gidatu","STEER":"GIDATU","Turn":"Biratu","TURN":"BIRATU",
"Collect":"Bildu","COLLECT":"BILDU","Catch":"Harrapatu","CATCH":"HARRAPATU",
"Deliver":"Entregatu","DELIVER":"ENTREGATU",
"Mouse":"Sagua","MOUSE":"SAGUA","Keyboard":"Teklatua","KEYBOARD":"TEKLATUA",
"Arrow keys":"Gezi-teklak","ARROW KEYS":"GEZI-TEKLAK",
"Space":"Zuriune-barra","SPACE":"ZURIUNE-BARRA",
"Left":"Ezkerra","Right":"Eskuina","Up":"Gora","Down":"Behera",
"Music":"Musika","Sound":"Soinua","SFX":"Soinu-efektuak",
"On":"Aktibatuta","Off":"Desaktibatuta",
"press space to paint again":"sakatu zuriune-barra berriro margotzeko",
};

Object.assign(translations,{
 "Press to start":"Sakatu hasteko","Start now":"Hasi orain","Click to continue":"Egin klik jarraitzeko",
 "CLICK TO CONTINUE":"KLIK EGIN JARRAITZEKO","PRESS TO PLAY":"SAKATU JOLASTEKO",
 "PAUSE GAME":"JOKOA PAUSATU","Press R to restart":"Sakatu R berrabiarazteko",
 "Tap anywhere to start":"Ukitu pantaila hasteko","READY":"PREST","Ready":"Prest",
 "GO!":"AURRERA!","FINISH!":"AMAIERA!","TIME UP":"DENBORA AGORTU DA",
 "Time's up!":"Denbora agortu da!","MISSION":"MISIOA","OBJECTIVE":"HELBURUA",
 "Objective":"Helburua","CHECKPOINT":"KONTROL-PUNTUA","Checkpoint":"Kontrol-puntua",
 "NEW RECORD":"MARKA BERRIA","Score:":"Puntuazioa:","Lives:":"Bizitzak:",
 "COLLECT":"BILDU","Collected":"Bilduta","FOUND":"AURKITUTA",
 "EXCELLENT":"BIKAIN","GREAT!":"OSO ONDO!","PERFECT":"BIKAIN",
 "FAILED":"HUTS EGIN DU","TRY AGAIN?":"BERRIRO SAIATU?",
 "SOUND ON":"SOINUA AKTIBATUTA","SOUND OFF":"SOINUA ITZALITA",
 "Touch to start":"Ukitu hasteko","Touch to play":"Ukitu jolasteko",
 "WASD":"WASD","SHIFT":"SHIFT","SPACE":"ZURIUNE-BARRA",
 "Press Space":"Sakatu zuriune-barra",
 "hold shift":"eduki Shift sakatuta","Hold Shift":"Eduki Shift sakatuta",
 "paused":"pausatuta","Paused":"Pausatuta","YOU LOST":"GALDU DUZU",
 "Game complete!":"Jokoa osatu duzu!","Well done!":"Oso ondo!",
 "PRESS SPACE TO RESTART":"SAKATU ZURIUNE-BARRA BERRABIARAZTEKO",
 "press space to restart":"sakatu zuriune-barra berrabiarazteko"
});

const rx = [
  [/^Press (?:the )?space(?:bar)? to (start|play|continue)$/i,(_,v)=>"Sakatu zuriune-barra "+(v.toLowerCase()==="continue"?"jarraitzeko":v.toLowerCase()==="play"?"jolasteko":"hasteko")],
  [/^Press (?:the )?enter key to (start|continue)$/i,(_,v)=>"Sakatu Enter "+(v.toLowerCase()==="start"?"hasteko":"jarraitzeko")],
  [/^Score:\s*(.*)$/i,(_,n)=>"Puntuazioa: "+n],
  [/^Time:\s*(.*)$/i,(_,n)=>"Denbora: "+n],
  [/^Level:\s*(.*)$/i,(_,n)=>"Maila: "+n],
  [/^Lives:\s*(.*)$/i,(_,n)=>"Bizitzak: "+n],
  [/^Hold (.*) to (.*)$/i,(_,k,v)=>"Eduki sakatuta "+k+" "+v+" egiteko"],
];
function translate(value) {
 const s=String(value||"");const trim=s.trim();
 if(!trim || trim.length>170)return s;
 let newText=translations[trim];
 if(!newText){for(const [pattern,repl] of rx){if(pattern.test(trim)){newText=trim.replace(pattern,repl);break}}}
 return newText===undefined?s:s.slice(0,s.indexOf(trim))+newText+s.slice(s.indexOf(trim)+trim.length);
}

/* Render-time translation for text painted into Canvas 2D, including textures
   generated from 2D canvas for WebGL. It cannot alter baked images or audio.
   Keep measureText and paint consistent to avoid text alignment defects. */
try {
  const context = globalThis.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (context && !context.__euskarazTextPatched) {
    for (const method of ["fillText","strokeText","measureText"]) {
      const original = context[method];
      if (typeof original !== "function") continue;
      Object.defineProperty(context,method,{
        configurable:true,writable:true,
        value:function(input,...args) {
          const localized = typeof input === "string" ? translate(input) : input;
          return original.call(this,localized,...args);
        }
      });
    }
    Object.defineProperty(context,"__euskarazTextPatched",{value:true});
  }
} catch (error) { console.warn("Euskaraz Games: canvas localization unavailable",error); }

const ignored = /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA)$/;
function visit(node) {
 if(!node || node.nodeType!==1 || ignored.test(node.tagName||""))return;
 if(node.hasAttribute && node.hasAttribute("data-euskaraz-no"))return;
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
 let textNode;
 while((textNode=walker.nextNode())){
   if(textNode.parentElement && !ignored.test(textNode.parentElement.tagName)){
     const out=translate(textNode.nodeValue);if(out!==textNode.nodeValue)textNode.nodeValue=out;
   }
 }
 for(const el of [node,...node.querySelectorAll("[title],[aria-label],[placeholder],input[type=button]")]){
   for(const attribute of ["title","aria-label","placeholder","value"]){
      if(!el.hasAttribute || !el.hasAttribute(attribute))continue;
      const old=el.getAttribute(attribute);
      const next=translate(old);if(next!==old)el.setAttribute(attribute,next);
   }
 }
}
// Inspect changed nodes only; rescanning the whole game every frame harms FPS.
let pending=false;
const dirty=new Set();
const ob=new MutationObserver(records=>{
 for (const record of records) {
   if (record.type==="characterData") dirty.add(record.target);
   if (record.type==="childList") for (const node of record.addedNodes) dirty.add(node);
 }
 if(pending||!dirty.size)return;
 pending=true;
 requestAnimationFrame(()=>{
   pending=false;
   const nodes=[...dirty];dirty.clear();
   for(const node of nodes){
     if(node.nodeType===3){
       if(!node.parentElement || ignored.test(node.parentElement.tagName))continue;
       const translated=translate(node.nodeValue);
       if(translated!==node.nodeValue)node.nodeValue=translated;
     }else if(node.nodeType===1) visit(node);
   }
 });
});
function go() {
 if(!document.body)return;
 visit(document.body);
 ob.observe(document.body,{childList:true,subtree:true,characterData:true});
 document.documentElement.lang="eu";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go,{once:true});else go();
})();