/* Euskaraz Games Klasikoa: deep links to preserved original game engine. */
(()=>{
 const key=new URLSearchParams(location.search).get("joko");
 if(!key||!["pilota","zesta","artzain","basoa","itsas","kirol"].includes(key))return;
 let attempts=0;
 function run(){
   attempts++;
   document.querySelector("#splash")?.click();
   if(key==="kirol"){const selector=document.querySelector("#kc");if(selector){selector.click();return}}
   else{const target=document.querySelector('[data-game="'+key+'"]');if(target){
     target.click();
     if(document.querySelector("#player.show"))return;
   }}
   if(attempts<25)setTimeout(run,220);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(run,350),{once:true});
 else setTimeout(run,350);
})();
