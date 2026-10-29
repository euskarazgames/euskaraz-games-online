/* EUSKARAZ GAMES · Erronka osagarriak (36 joko · 108 ulermen-proba).
 * This is an optional Basque-language companion game; it never claims that
 * completing these questions reflects achievements inside the 3D engine.
 */
(()=>{"use strict";
const challenges=[{"id":"kc:pilota","story":"Herri Pilotaren lehiaketa","goal":"Frontoian tantoak irabaztea","action":"Pilota aurkariari itzultzea","finale":"Partida amaierara arte jokatzea"},{"id":"kc:zesta","story":"Zesta Puntaren erronka","goal":"Pilota zestarekin jasotzea","action":"Jaurtiketa zuzena prestatzea","finale":"Tantoak lortzeko erritmoa menderatzea"},{"id":"kc:artzain","story":"Artzain Txakurren proba","goal":"Txakurrari aginduak ematea","action":"Artaldea bide egokitik gidatzea","finale":"Artzainaren probak osatzea"},{"id":"bs:basoa","story":"Zazpi Zigiluen sekretua","goal":"Ezkutuan eta kontu handiz aurrera egitea","action":"Arrastoak eta zigiluak aurkitzea","finale":"Basoaren misterioa argitzea"},{"id":"bs:itsas","story":"Itsas Dorreko azken misioa","goal":"Dorreko gelak miatzea","action":"Bost giltzak bilatzea","finale":"Azken aurkariarekin topo egitea"},{"id":"mj:skyfarer","story":"Zeru-bidaiariaren gutunak","goal":"Galdutako gutunak biltzea","action":"Baleen artean planeatzea","finale":"Bildutako gutunak helmugara eramatea"},{"id":"mj:tidebound","story":"Bi marinelen estropada","goal":"Lema eta belak koordinatzea","action":"Haizearen norabidea aprobetxatzea","finale":"Itsasargira iristea"},{"id":"mj:storm-surfer","story":"Ekaitzeko olatuak","goal":"Olatuen gainean oreka mantentzea","action":"Salto eta birak uztartzea","finale":"Olatuaren amaierara iristea"},{"id":"mj:skyhook-rescue","story":"Zeruko erreskatea","goal":"Bi aireontziak koordinatzea","action":"Kablearen bidez erreskatatzea","finale":"Portura iristea"},{"id":"mj:paper-dragon","story":"Paperezko herensugearen hegaldia","goal":"Herensugearekin hegan egitea","action":"Haizea eta altuera kontrolatzea","finale":"Ilunabarreko atea zeharkatzea"},{"id":"mj:bubble-balloon","story":"Burbuilen bila","goal":"Burbuila txikiak harrapatzea","action":"Antenak saihestea","finale":"Ibilbidearen amaierara iristea"},{"id":"mj:kite-rider","story":"Haizearen ateak","goal":"Kometa zuzentzea","action":"Haize-ateak zeharkatzea","finale":"Paperezko kurriloak jasotzea"},{"id":"mj:aurora-skiff","story":"Auroraren azpian","goal":"Txalupa gidatzea","action":"Haize-boladak erabiltzea","finale":"Argiak eta ateak aurkitzea"},{"id":"mj:glass-greenhouse","story":"Kristalezko negutegia","goal":"Kristalezko ateak irekitzea","action":"Haziak eta argiak biltzea","finale":"Negutegia loratzea"},{"id":"mj:bell-tower","story":"Kanpandorreko melodia","goal":"Sokan gora egitea","action":"Kanpaiak erritmoan jotzea","finale":"Dorrea zeharkatzea"},{"id":"mj:fog-shepherd","story":"Lainoaren artzaina","goal":"Lainopean artaldea bilatzea","action":"Linterna altxatuz gidatzea","finale":"Artaldea etxera eramatea"},{"id":"mj:paper-moon-stairs","story":"Ilargirako eskailerak","goal":"Eskaileretan gora egitea","action":"Linternak ukitzea","finale":"Linternak izar bihurtzea"},{"id":"mj:whale-song","story":"Balearen kantua","goal":"Ur azpian igeri egitea","action":"Kantuarekin argi-bidea sortzea","finale":"Baleari argiraino jarraitzea"},{"id":"mj:sky-library","story":"Zeruko liburutegia","goal":"Orrien artean hegan egitea","action":"Aireko ibilbidea aurkitzea","finale":"Liburutegiko bidaia osatzea"},{"id":"mj:kintsugi-mountain","story":"Mendiaren zauriak","goal":"Hautsitako pasabideak aurkitzea","action":"Zubiak urrez konpontzea","finale":"Mendia sendatzea"},{"id":"mj:space-mower","story":"Espazioko soroa","goal":"Belarra moztea","action":"Meteoritoak saihestea","finale":"Hurrengo mailara igarotzea"},{"id":"mj:ember-path","story":"Txingarraren bidea","goal":"Basoko bidea aurkitzea","action":"Txingarrari putz egitea","finale":"Basoaren oroitzapena piztea"},{"id":"mj:clockwork-heist","story":"Erloju-makinen lapurreta","goal":"Lau jokalariak koordinatzea","action":"Palankak batera aktibatzea","finale":"Gangako atea irekitzea"},{"id":"mj:starlight-train","story":"Izarren trena","goal":"Trenaren gainean korrika egitea","action":"Salto eta planeoa erabiltzea","finale":"Bagoiak argitzea"},{"id":"mj:dune-surfer","story":"Dunen gaineko lasterketa","goal":"Dunetan abiadura hartzea","action":"Salto eta birak egitea","finale":"Ilunabarra harrapatzea"},{"id":"mj:autumn-wind","story":"Udazkenaren bidaia","goal":"Haizeak daramatzan hostoak biltzea","action":"Zuhaitz lokartuak esnatzea","finale":"Hostoak zuhaitz handira eramatea"},{"id":"mj:stained-glass","story":"Beirateen argia","goal":"Koloretako argia jarraitzea","action":"Argiak sortzen dituen bideak erabiltzea","finale":"Argi-zatiak biltzea"},{"id":"mj:deep-lights","story":"Itsas hondoko argiak","goal":"Urpekoa gidatzea","action":"Medusak argi-pultsuarekin esnatzea","finale":"Argiari sakoneraino jarraitzea"},{"id":"mj:snow-globe","story":"Elur-bolaren sekretua","goal":"Elur malutak biltzea","action":"Grabitatea aldatzea","finale":"Munduari beste ikuspegi bat ematea"},{"id":"mj:sunflower-silhouette","story":"Eguzkiaren azken argia","goal":"Eguzki-loreak esnatzea","action":"Zapiarekin airean igotzea","finale":"Argia ilunabarrean gordetzea"},{"id":"mj:rust-bloom","story":"Herdoildutako hiria","goal":"Hiriko loreak bilatzea","action":"Ponpetatik ura hartu eta isurtzea","finale":"Hiriaren koloreak itzultzea"},{"id":"mj:ink-fox","story":"Tintazko azeriaren bidaia","goal":"Azeriarekin jauzi egitea","action":"Tintazko pasabideak margotzea","finale":"Ate berriak gainditzea"},{"id":"mj:mirror-sea","story":"Ispilu-itsasoa","goal":"Ispilu-itsasoa zeharkatzea","action":"Saltoekin uhinak sortzea","finale":"Bide ezkutua aurkitzea"},{"id":"mj:cloud-shepherd","story":"Hodei-artaldea","goal":"Hodei-ardiak elkartzea","action":"Artzain-makila eta txistua erabiltzea","finale":"Soro lehorra euriarekin bustitzea"},{"id":"mj:train-painter","story":"Trenaren koloretako bidea","goal":"Trenbideko bihurguneak margotzea","action":"Abiadura kontrolatzea","finale":"Hurrengo geltokira heltzea"},{"id":"mj:hourglass","story":"Hareazko denbora","goal":"Hondarrezko bidea zeharkatzea","action":"Harea bilduz pasabideak sortzea","finale":"Denboraren ertzeraino igotzea"}];
const byId=new Map(challenges.map((g,i)=>[g.id,{...g,index:i}]));
const key="eg-hizkuntza-erronkak-v1";
let saved={};
try{const raw=JSON.parse(localStorage.getItem(key)||"{}");if(raw&&typeof raw==="object"&&!Array.isArray(raw))saved=raw}catch{}
let selected=null,question=0,isOpen=false;
const style=document.createElement("style");style.textContent="\n#eg-extra-toggle{border:1px solid #c48e6699!important;background:#3a2725!important;color:#ffd6b5!important;font-weight:900!important}\n#eg-extra-toggle:hover{background:#f6a15b!important;color:#1c1612!important}\n#eg-extra[hidden]{display:none!important}\n#eg-extra{position:fixed;right:14px;top:80px;width:min(400px,calc(100% - 28px));max-height:calc(100dvh - 100px);overflow:auto;z-index:110;box-sizing:border-box;padding:20px 20px 24px;border:1px solid #ad845e;color:#f3ebe2;border-radius:19px;background:linear-gradient(150deg,#231b22,#141b20);box-shadow:0 15px 65px #000c;font:14px/1.5 system-ui,-apple-system,sans-serif}\n#eg-extra button{cursor:pointer;font:inherit}\n.eg-extra-head{display:flex;align-items:start;justify-content:space-between;gap:15px}\n.eg-extra-head span{display:block;color:#ffae6e;font-size:10px;font-weight:900;letter-spacing:.14em;margin-bottom:5px}\n.eg-extra-head strong{display:block;font-size:20px;letter-spacing:-.045em;line-height:1.12}\n.eg-extra-head small{color:#a9b0b7;font-size:11px}\n.eg-extra-head button{border:1px solid #4d4c54;border-radius:8px;background:#2f3139;color:white;padding:5px 10px}\n.eg-extra-progress{height:7px;background:#37353c;border-radius:9px;margin:15px 0;overflow:hidden}\n.eg-extra-progress>div{height:100%;background:linear-gradient(90deg,#ff9d5e,#fbd79d);border-radius:inherit;transition:width .2s}\n.eg-extra-desc,.eg-extra-note{font-size:12px;color:#b7b5b6;line-height:1.5}\n.eg-extra-kicker{font-size:10px;letter-spacing:.15em;font-weight:900;color:#ffae6e;margin-top:23px}\n#eg-extra h3{font-size:17px;line-height:1.35;margin:8px 0 16px;color:#faf6f1}\n.eg-extra-choices{display:grid;gap:9px}\n.eg-extra-choices button{background:#242a30;color:#f6f3ef;border:1px solid #48494f;border-radius:11px;padding:12px;text-align:left;font-weight:650}\n.eg-extra-choices button:hover,.eg-extra-choices button:focus-visible{border-color:#f5a564;background:#39332f}\n.eg-extra-choices button.eg-extra-wrong{border-color:#b87969}\n.eg-extra-feedback{font-size:12px;color:#ffcfac;min-height:1.5em}\n.eg-extra-note{border-top:1px solid #38383e;padding-top:14px;margin-top:15px}\n.eg-extra-finish{text-align:center;padding:20px 12px}\n.eg-extra-finish>b{color:#ffbc69;font-size:39px;letter-spacing:.2em}\n.eg-extra-finish p{font-size:13px;color:#d3cac2}\n.eg-extra-finish small{color:#aaa}\n@media(max-width:600px){#eg-extra{right:8px;top:68px;width:calc(100% - 16px);max-height:calc(100dvh - 79px);padding:16px}}\n";
document.head.appendChild(style);
const btn=document.createElement("button");
btn.id="eg-extra-toggle";btn.type="button";btn.textContent="✦ ERRONKAK";btn.title="Euskarazko erronka osagarriak";btn.setAttribute("aria-expanded","false");
const modal=document.createElement("aside");modal.id="eg-extra";modal.hidden=true;modal.setAttribute("aria-label","Euskarazko misio osagarriak");modal.setAttribute("role","region");
function store(){try{localStorage.setItem(key,JSON.stringify(saved))}catch{}}
function count(id){return Math.max(0,Math.min(3,Number(saved[id]||0)))}
function total(){return [...byId.keys()].reduce((n,id)=>n+count(id),0)}
function completion(){return Math.round(total()/108*100)}
function render(){
 if(!selected)return;
 const game=byId.get(selected),n=count(selected);btn.textContent="✦ ERRONKAK "+n+"/3";
 modal.replaceChildren();
 const head=document.createElement("div");head.className="eg-extra-head";
 const title=document.createElement("div");title.innerHTML='<span>HIZKUNTZA · ERRONKA+</span><strong></strong><small></small>';
 title.querySelector("strong").textContent=game.story;
 title.querySelector("small").textContent="36 mundu · 108 erronka · "+total()+" izar";
 const close=document.createElement("button");close.textContent="✕";close.type="button";close.title="Itxi";close.addEventListener("click",()=>toggle(false));
 head.append(title,close);modal.appendChild(head);
 const meter=document.createElement("div");meter.className="eg-extra-progress";
 const filled=document.createElement("div");filled.style.width=(n/3*100)+"%";meter.appendChild(filled);modal.appendChild(meter);
 const desc=document.createElement("p");desc.className="eg-extra-desc";desc.textContent="Irakurri, pentsatu eta aukeratu. Erronkak euskarazko ulermena lantzeko dira; ez dute jokoaren puntuazioa aldatzen.";modal.appendChild(desc);
 if(n===3){const finish=document.createElement("div");finish.className="eg-extra-finish";finish.innerHTML="<b>★ ★ ★</b><h3>OSO ONDO!</h3><p>Hiru erronkak gainditu dituzu. Jarraitu jolasten eta ezagutu beste mundu bat.</p><small>Bilduma osoa: "+total()+"/108 izar · "+completion()+"%</small>";modal.appendChild(finish);return;}
 question=n;
 const prompts=[
  {heading:"01 · HELBURUA",question:"Zein da mundu honetako helburua?",field:"goal"},
  {heading:"02 · EKINTZA",question:"Zein ekintzak laguntzen dizu aurrera egiten?",field:"action"},
  {heading:"03 · AMAIERA",question:"Zer lortu nahi duzu abenturaren amaieran?",field:"finale"}
 ];
 const prompt=prompts[question];
 const heading=document.createElement("div");heading.className="eg-extra-kicker";heading.textContent=prompt.heading;
 const ask=document.createElement("h3");ask.textContent=prompt.question;modal.append(heading,ask);
 const choices=document.createElement("div");choices.className="eg-extra-choices";
 const current=game.index,all=challenges;
 const options=[
  {text:game[prompt.field],correct:true},
  {text:all[(current+13)%all.length][prompt.field],correct:false},
  {text:all[(current+25)%all.length][prompt.field],correct:false}
 ];
 // Deterministic rotation avoids placing the correct answer first every time.
 const order=question===0?[1,0,2]:question===1?[2,1,0]:[0,2,1];
 const feedback=document.createElement("p");feedback.className="eg-extra-feedback";feedback.setAttribute("role","status");
 for(const ix of order){
  const item=options[ix],b=document.createElement("button");b.type="button";b.textContent=item.text;
  b.addEventListener("click",()=>{
   if(item.correct){saved[selected]=Math.max(n+1,count(selected));store();render();window.dispatchEvent(new CustomEvent("eg:stars",{detail:{id:selected,stars:count(selected),total:total()}}));}
   else{feedback.textContent="Saiatu berriro: irakurri istorioa eta pentsatu zer gertatzen den joko honetan.";b.classList.add("eg-extra-wrong");}
  });
  choices.appendChild(b);
 }
 modal.append(choices,feedback);
 const help=document.createElement("p");help.className="eg-extra-note";help.textContent="Pista: "+game.story+". Jokoaren kontrolak pantailan eta KONTROLAK atalean dituzu.";modal.appendChild(help);
}
function toggle(force){isOpen=typeof force==="boolean"?force:!isOpen;modal.hidden=!isOpen;btn.setAttribute("aria-expanded",String(isOpen));if(isOpen)render()}
function init(){
 const toolbar=document.querySelector("#player .tools2");
 const player=document.querySelector("#player");
 if(!toolbar||!player)return;
 toolbar.insertBefore(btn,toolbar.firstChild);player.appendChild(modal);
 btn.addEventListener("click",()=>toggle());
 document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&isOpen){toggle(false);ev.preventDefault();ev.stopImmediatePropagation()}},true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.EGChallenges={
 setGame(id){selected=byId.has(id)?id:null;toggle(false);if(selected)render();btn.style.display=selected?"":"none"},
 close(){toggle(false);selected=null;btn.style.display="none"},
 count,total,completion,
 open(){if(selected)toggle(true)},
 games:challenges.length
};
})();