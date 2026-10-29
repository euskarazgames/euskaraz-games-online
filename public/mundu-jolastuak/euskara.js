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
let pending=false;
const ob=new MutationObserver(()=>{
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{pending=false;visit(document.body || document.documentElement)});
});
function go() {
 if(!document.body)return;
 visit(document.body);
 ob.observe(document.body,{childList:true,subtree:true,characterData:true});
 document.documentElement.lang="eu";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go,{once:true});else go();
})();