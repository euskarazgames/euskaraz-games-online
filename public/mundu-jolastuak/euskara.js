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


/* UI phrases extracted from the actual 31 original game HTML files.
 * An image/video/audio with baked-in lettering cannot be translated here. */
Object.assign(translations,{
  "Skyfarer":"Zeru-bidaiaria","Tidebound":"Itsasoari lotuta",
  "Storm Surfer":"Ekaitz-surflaria","Skyhook Rescue":"Zeruko erreskatea",
  "Paper Dragon":"Paperezko dragoia","PAPER DRAGON":"PAPEREZKO DRAGOIA",
  "Bubble Balloon":"Xaboi-burbuila","Kite Rider":"Kometa-gainean",
  "KITE RIDER":"KOMETA-GAINEAN","Aurora Skiff":"Aurorako txalupa",
  "Bell Tower":"Kanpandorrea","BELL TOWER":"KANPANDORREA",
  "Whale Song":"Balearen kantua","Sky Library":"Zeruko liburutegia",
  "SKY LIBRARY":"ZERUKO LIBURUTEGIA","KINTSUGI MOUNTAIN":"KINTSUGI MENDIA",
  "Paper Moon Stairs":"Paperezko ilargirako eskailerak",
  "Space Mower":"Espazioko sega-makina","Starlight Train":"Izarren trena",
  "DUNE SURFER":"DUNETAKO SURFLARIA","autumn wind":"udazkeneko haizea",
  "STAINED GLASS":"BEIRATEAK","Snow Globe":"Elur-bola",
  "RUST BLOOM":"HERDOILAREN LORALDIA",
  "TWO SAILOR STORM REGATTA":"BI MARINELEN EKAITZEKO ESTROPADA",
  "A TWO-SAILOR STORM REGATTA":"BI MARINELEN EKAITZEKO ESTROPADA",
  "GATE 1/10":"1/10 ATEA","P1 · HELM":"1. JOKALARIA · LEMA",
  "P2 · ROPES":"2. JOKALARIA · SOKAK",
  "P2: CPU":"2. JOKALARIA: MAKINA","wheel":"lema","heave":"tiratu",
  "haul":"tiratu","ease":"askatu","brace":"orientatu",
  "MANTA SURGE":"MANTA-BULTZADA",
  "RAISING THE CORAL…":"KORALA ALTXATZEN…",
  "you steer · AI works the ropes":"zuk gidatzen duzu · IAk sokak erabiltzen ditu",
  "one keyboard · two sailors":"teklatu bat · bi marinel",
  "turn the wheel":"biratu lema","heave together (surge)":"tiratu elkarrekin (bultzada)",
  "haul — open the manta sails":"tiratu — ireki belak",
  "ease — in squalls!":"askatu — haize-boladetan!",
  "brace the yard to the wind":"orientatu bela haizerantz",
  "PRESS ENTER TO SAIL AGAIN":"SAKATU ENTER BERRIRO NABIGATZEKO",
  "LIGHTHOUSE REACHED":"ITSASARGIRA IRITSI ZARA",
  "Click or press Space":"Klik egin edo sakatu zuriune-barra",
  "run":"korrika","sprint / dive":"esprintatu / murgildu",
  "jump, hold to glide":"salto egin; eutsi planeatzeko",
  "jump, hold to glide  ·  mouse to look":"salto egin; eutsi planeatzeko · sagua begiratzeko",
  "Space to fly again":"Zuriune-barra, berriro hegan egiteko",
  "M · sound":"M · soinua","m · sound":"M · soinua",
  "DUSK":"ILUNABARRA","CARVE THE FACE":"EGIN BIRA OLATUAN",
  "JUMP":"SALTO EGIN","BOOST":"BULTZADA",
  "IN THE AIR":"AIREAN","SPIN":"BIRATU","WIPED OUT":"ERORI ZARA",
  "Two airships. One cable. A storm rising.":"Bi aireontzi. Kable bakarra. Ekaitza dator.",
  "Captain 1":"1. kapitaina","Captain 2":"2. kapitaina",
  "fly":"hegan egin","climb":"igo","descend":"jaitsi",
  "or the CPU copilot":"edo makinaren kopilotua",
  "1 or 2 players · solo, the CPU flies airship 2 · a second player takes over with the arrows or a 2nd gamepad":"1 edo 2 jokalari · bakarka, makinak bigarren aireontzia gidatzen du · bigarren jokalariak geziekin edo aginte batekin parte har dezake",
  "Press Space or Enter":"Sakatu zuriune-barra edo Enter",
  "Harbor reached":"Portura iritsi zara",
  "Press Enter to fly again":"Sakatu Enter berriro hegan egiteko",
  "Stick / ↑ ↓  fly  ·  hold A / Space  rise":"Agintea / ↑ ↓ hegan egiteko · eutsi A / zuriune-barrari igotzeko",
  "PAUSED":"PAUSATUTA","WELL FLOWN":"OSO ONDO HEGAN EGIN DUZU",
  "Catch the little bubbles, dodge the antennas!":"Harrapatu burbuila txikiak eta saihestu antenak!",
  "POP!":"LEHERTU!","BEST":"ONENA",
  "Arrows / WASD or stick: lean  ·  Space / A: puff":"Geziak / WASD edo agintea: makurtu · zuriune-barra / A: putz egin",
  "Press Space or tap to fly":"Sakatu zuriune-barra edo ukitu hegan egiteko",
  "lean & steer":"makurtu eta gidatu","climb":"igo","dive":"murgildu",
  "wind boost":"haize-bultzada",
  "fly through wind gates, skim the lakes, grab paper cranes":"igaro haize-ateak, hegatu lakuetatik gertu eta jaso paperezko kurriloak",
  "Landed!":"Lurreratu zara!","or tap to fly again":"edo ukitu berriro hegan egiteko",
  "Steer ← → or stick  ·  Ride the wind  ·  Gust: Space or A":"Gidatu ← → edo agintearekin · baliatu haizea · bolada: zuriune-barra edo A",
  "Gates":"Ateak","Lights":"Argiak","Score":"Puntuazioa",
  "OPEN":"IREKI","IN FULL BLOOM":"LORALDI BETEAN",
  "the bells are waking":"kanpaiak esnatzen ari dira",
  "ring the bells, paint the sky":"jo kanpaiak, margotu zerua",
  "swing":"kulunkatu","climb the rope":"igo sokatik",
  "the sky remembers every bell":"zeruak kanpai bakoitza gogoratzen du",
  "press R to ring again":"sakatu R berriro kanpaiak jotzeko",
  "walk":"ibili","wander":"ibiltari","raise the lantern":"altxatu linterna",
  "The herd is home":"Artaldea etxera itzuli da",
  "press enter":"sakatu Enter",
  "press enter to walk again":"sakatu Enter berriro ibiltzeko",
  "gathering the fog":"lainoa biltzen",
  "touch the lanterns, and let them become stars":"ukitu linternak, eta bihur daitezela izar",
  "the sky remembers every lantern":"zeruak linterna guztiak gogoratzen ditu",
  "press r to climb again":"sakatu R berriro igotzeko",
  "press any key to dive":"sakatu edozein tekla murgiltzeko",
  "swim":"igeri egin","kick":"ostiko egin","sing":"abestu",
  "Glide along the whale's song · follow her to the light":"Planeatu balearen kantuarekin · jarraitu argiraino",
  "press enter to dive again":"sakatu Enter berriro murgiltzeko",
  "press space  ·  click to fly":"sakatu zuriune-barra · klik egin hegan egiteko",
  "the sky library":"zeruko liburutegia",
  "space · click to fly again":"zuriune-barra · klik egin berriro hegan egiteko",
  "sound off":"soinua itzalita",
  "every step mends the mountain":"urrats bakoitzak mendia sendatzen du",
  "gathering ink…":"tinta biltzen…",
  "mend":"konpondu","the mountain is whole":"mendia sendatu da",
  "press R to climb again":"sakatu R berriro igotzeko",
  "drive":"gidatu","turbo":"turboa",
  "blow on the ember":"putz egin txingarrari",
  "The forest remembers.":"Basoak gogoan du.",
  "Enter — play again":"Enter — berriro jokatu",
  "PRESS JUMP TO JOIN  ·  ENTER TO START":"SAKATU SALTO EGITEKO TEKLA SARTZEKO · ENTER HASTEKO",
  "LEFT / RIGHT MOVE  ·  UP JUMP  ·  HOLD DOWN ON A LEVER  ·  FOUR LEVERS OPEN THE VAULT":"EZKERRA / ESKUINA MUGITZEKO · GORA SALTO EGITEKO · EUTSI BEHERA PALANKAN · LAU PALANKAK GANGAREN ATEA IREKITZEN DUTE",
  "Press Start":"Sakatu Hasi","The train shines":"Trena distiratsu dago",
  "stars":"izarrak","wagons lit":"argitutako bagoiak",
  "score":"puntuazioa","Click for sound":"Egin klik soinua aktibatzeko",
  "Ride the dunes · chase the sunset":"Surfeatu dunetan · jarraitu ilunabarrari",
  "PRESS SPACE TO RIDE":"SAKATU ZURIUNE-BARRA ABIATZEKO",
  "PRESS SPACE TO RIDE AGAIN":"SAKATU ZURIUNE-BARRA BERRIRO ABIATZEKO",
  "carve / spin":"bira egin","tuck for speed":"makurtu bizkortzeko",
  "hold & release to jump":"eutsi eta askatu salto egiteko",
  "in the air: flip":"airean: itzulipurdia",
  "in the air: grab":"airean: heldu",
  "SUNSET":"ILUNABARRA","Shaping the dunes":"Dunak moldatzen",
  "to leap, keep holding to glide on your leaves":"salto egiteko, jarraitu sakatuta hostoekin planeatzeko",
  "to dive":"murgiltzeko",
  "gather the drifting leaves, wake the sleeping trees, carry autumn to the great tree":"bildu haizeak daramatzan hostoak, esnatu lo dauden zuhaitzak eta eraman udazkena zuhaitz handira",
  "sleeping trees awakened":"esnatutako zuhaitzak",
  "leaves given to the great tree":"zuhaitz handiari emandako hostoak",
  "space to fly again":"zuriune-barra, berriro hegan egiteko",
  "only the coloured light will hold her":"koloretako argiak bakarrik eutsiko dio",
  "gathering light…":"argia biltzen…",
  "press space to walk the nave again":"sakatu zuriune-barra nabetik berriro ibiltzeko",
  "DEPTH":"SAKONERA",
  "WAKE THE SLEEPING JELLYFISH WITH YOUR LIGHT":"ESNATU LOTAN DAUDEN MEDUSAK ZURE ARGIAREKIN",
  "FOLLOW THEIR GLOW DOWN THE TRENCH":"JARRAITU HAIEN DISTIRARI ITSAS HONDORAINO",
  "WASD · ARROWS · MOUSE — STEER    SPACE — LIGHT PULSE    M — SOUND":"WASD · GEZIAK · SAGUA — GIDATU    ZURIUNE-BARRA — ARGI-PULTSUA    M — SOINUA",
  "turn the world":"biratu mundua",
  "the snow settles":"elurra pausatzen da",
  "a child, a field of giants, the last hour of the sun":"haur bat, erraldoien soroa, eguzkiaren azken ordua",
  "in the air to rise on your scarf":"airean, zapiarekin goratzeko",
  "the field keeps the light you carried":"soroak ekarri duzun argia gordetzen du",
  "flowers awakened":"esnatutako loreak",
  "light gathered":"bildutako argia",
  "until dusk":"ilunabarrera arte",
  "press space to run again":"sakatu zuriune-barra berriro korrika egiteko",
  "gathering the light":"argia biltzen",
  "press enter or click":"sakatu Enter edo egin klik",
  "hold J or shift to pour":"eutsi J edo Shift sakatuta isurtzeko",
  "the city remembers its colours":"hiriak bere koloreak gogoratzen ditu",
  "enter · wander on":"Enter · jarraitu ibiltzen",
  "to paint a stroke":"pintzelkada bat emateko",
  "angles the brush down":"pintzela beherantz okertzen du",
  "the ink has dried":"tinta lehortu da",
  "press space to paint again":"sakatu zuriune-barra berriro margotzeko",
  "press any key":"sakatu edozein tekla",
  "press any key to walk again":"sakatu edozein tekla berriro ibiltzeko",
  "marcher":"ibili","courir":"korrika egin","houlette":"artzain-makila",
  "Houlette":"Artzain-makila","siffler":"txistu egin","Siffler":"Txistu egin",
  "Gather the cloud-sheep, push them together, and lead the big cloud over a dry field":"Bildu hodei-ardiak, elkartu eta eraman hodei handia soro lehor baten gainera",
  "Enter to play again":"Enter, berriro jokatzeko",
  "paint the rails":"margotu errailak",
  "full steam":"abiadura bizian","brake":"balaztatu","whistle":"txistua",
  "touch: hold the left / right side to steer":"ukitu: eutsi ezkerreko / eskuineko aldeari gidatzeko",
  "Press Space or tap to start":"Sakatu zuriune-barra edo ukitu hasteko",
  "Station reached!":"Geltokira iritsi zara!",
  "Space ▸ next station":"Zuriune-barra ▸ hurrengo geltokia",
  "Laying the tracks…":"Errailak jartzen…",
  "gathering sand":"harea biltzen",
  "hold ↓ to call the sand":"eutsi ↓ sakatuta hareari deitzeko",
  "she climbed the falling time":"denbora erortzean gora egin zuen"
});

const rx = [
  [/^Press (?:the )?space(?:bar)? to (start|play|continue)$/i,(_,v)=>"Sakatu zuriune-barra "+(v.toLowerCase()==="continue"?"jarraitzeko":v.toLowerCase()==="play"?"jolasteko":"hasteko")],
  [/^Press (?:the )?enter key to (start|continue)$/i,(_,v)=>"Sakatu Enter "+(v.toLowerCase()==="start"?"hasteko":"jarraitzeko")],
  [/^Score:\s*(.*)$/i,(_,n)=>"Puntuazioa: "+n],
  [/^Time:\s*(.*)$/i,(_,n)=>"Denbora: "+n],
  [/^Level:\s*(.*)$/i,(_,n)=>"Maila: "+n],
  [/^Lives:\s*(.*)$/i,(_,n)=>"Bizitzak: "+n],
  [/^SCORE\s+(\d+)$/i,(_,n)=>"PUNTUAZIOA "+n],
  [/^LEVEL\s+(\d+)$/i,(_,n)=>"MAILA "+n],
  [/^saved\s+(\d+)\s*\/\s*(\d+)$/i,(_,n,total)=>"erreskatatuta "+n+" / "+total],
  [/^GATE\s+(\d+)\/(\d+)$/i,(_,n,total)=>"ATEA "+n+"/"+total],
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