/* Euskaraz Games · 31 mini-jokoen kontrol lagungarriak.
 * Touch-to-keyboard controls work in games that accept ordinary KeyboardEvents.
 * Does not claim full touch compatibility for games requiring mouse pointer-lock.
 */
(() => {
  "use strict";
  if (!matchMedia("(pointer: coarse)").matches) return;
  const css = `
#eg-touch{position:fixed;z-index:2147483000;left:0;right:0;bottom:0;pointer-events:none;font:700 13px system-ui,-apple-system,sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
#eg-touch *{box-sizing:border-box;touch-action:none}
#eg-touch .eg-top{position:absolute;bottom:145px;right:12px;pointer-events:auto;display:flex;gap:6px}
#eg-touch button{font:inherit;color:white;background:rgba(16,20,30,.79);border:1px solid #ffb17199;box-shadow:0 3px 16px #0008;outline-offset:3px;border-radius:13px;min-height:43px;min-width:43px;padding:6px 10px}
#eg-touch button:focus-visible{outline:3px solid #ffbb80}
#eg-touch button:active,#eg-touch button.eg-pressed{background:#e78d3c;color:#13100c;transform:scale(.95)}
#eg-touch .eg-bottom{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:0 12px 12px;pointer-events:none}
#eg-touch .eg-pad{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(3,44px);gap:3px;pointer-events:auto}
#eg-touch .eg-pad button{padding:0;font-size:21px}
#eg-touch .eg-pad [data-missing]{visibility:hidden;pointer-events:none}
#eg-touch .eg-actions{display:grid;grid-template-columns:repeat(2,55px);gap:8px;pointer-events:auto}
#eg-touch .eg-actions button{min-height:53px;border-radius:50%;font-size:16px}
#eg-touch.eg-hidden .eg-bottom{display:none}
#eg-touch.eg-hidden .eg-top{bottom:12px}
#eg-touch.eg-hidden .eg-top button:not(.eg-toggle){display:none}
@media (min-width:800px){#eg-touch{max-width:820px;margin:auto}}
@media (max-height:430px){#eg-touch .eg-pad{grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,34px)}#eg-touch .eg-actions{grid-template-columns:repeat(2,42px)}#eg-touch .eg-actions button{min-height:38px;min-width:38px}}
`;
  const tag=document.createElement("style");tag.textContent=css;
  document.head.appendChild(tag);
  const ui=document.createElement("div");ui.id="eg-touch";
  ui.setAttribute("role","group");ui.setAttribute("aria-label","Ukipen-kontrol lagungarriak");
  ui.innerHTML=`<div class="eg-top"><button type="button" class="eg-mode" aria-label="Norabide-teklak aldatu">WASD</button><button type="button" class="eg-toggle" aria-expanded="true">Ezkutatu</button></div><div class="eg-bottom">
    <div class="eg-pad" role="group" aria-label="Mugitzeko kontrolak"><i data-missing></i><button type="button" data-direction="up" aria-label="Gora">▲</button><i data-missing></i>
      <button type="button" data-direction="left" aria-label="Ezkerra">◀</button><i data-missing></i><button type="button" data-direction="right" aria-label="Eskuina">▶</button>
      <i data-missing></i><button type="button" data-direction="down" aria-label="Behera">▼</button><i data-missing></i></div>
    <div class="eg-actions" role="group" aria-label="Ekintza-teklak">
      <button type="button" data-key="Space" aria-label="Salto egin edo hasi">A</button>
      <button type="button" data-key="ShiftLeft" aria-label="Korrika egin edo ekintza">B</button>
      <button type="button" data-key="Enter" aria-label="Hasi edo onartu">↵</button>
      <button type="button" data-key="KeyE" aria-label="Elkarreragin">E</button>
    </div></div>`;
  const directions={
    wasd:{up:"KeyW",left:"KeyA",right:"KeyD",down:"KeyS"},
    arrows:{up:"ArrowUp",left:"ArrowLeft",right:"ArrowRight",down:"ArrowDown"}
  };
  const keys={
    KeyW:"w",KeyA:"a",KeyD:"d",KeyS:"s",KeyE:"e",
    ArrowUp:"ArrowUp",ArrowDown:"ArrowDown",ArrowLeft:"ArrowLeft",ArrowRight:"ArrowRight",
    Space:" ",Enter:"Enter",ShiftLeft:"Shift"
  };
  let mode="wasd";
  const active=new Map();
  const send=(code,type)=>{
    const ev=new KeyboardEvent(type,{bubbles:true,cancelable:true,composed:true,code,key:keys[code]||code,
      shiftKey:code==="ShiftLeft"});
    (document.activeElement?.isConnected ? document.activeElement : document.body).dispatchEvent(ev);
  };
  const release=(id)=>{
    const item=active.get(id);if(!item)return;
    active.delete(id);item.button.classList.remove("eg-pressed");
    if(![...active.values()].some(v=>v.code===item.code))send(item.code,"keyup");
  };
  const releaseAll=()=>{for(const id of [...active.keys()])release(id)};
  for(const btn of ui.querySelectorAll("button[data-direction],button[data-key]")){
    btn.addEventListener("pointerdown",ev=>{
      if(ev.button!==0&&ev.pointerType==="mouse")return;
      ev.preventDefault();ev.stopPropagation();
      const code=btn.dataset.key||directions[mode][btn.dataset.direction];
      release(ev.pointerId);
      if(![...active.values()].some(v=>v.code===code))send(code,"keydown");
      active.set(ev.pointerId,{code,button:btn});
      btn.classList.add("eg-pressed");
      try{btn.setPointerCapture(ev.pointerId)}catch{}
    });
    for(const evt of ["pointerup","pointercancel","lostpointercapture"]){
      btn.addEventListener(evt,ev=>{ev.preventDefault();ev.stopPropagation();release(ev.pointerId)});
    }
    btn.addEventListener("contextmenu",ev=>ev.preventDefault());
  }
  const modeBtn=ui.querySelector(".eg-mode");
  modeBtn.addEventListener("click",()=>{releaseAll();mode=mode==="wasd"?"arrows":"wasd";modeBtn.textContent=mode==="wasd"?"WASD":"GEZIAK"});
  const toggle=ui.querySelector(".eg-toggle");
  toggle.addEventListener("click",()=>{
    releaseAll();const hidden=ui.classList.toggle("eg-hidden");
    toggle.textContent=hidden?"Kontrolak":"Ezkutatu";toggle.setAttribute("aria-expanded",String(!hidden));
  });
  addEventListener("blur",releaseAll);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)releaseAll()});
  const init=()=>document.body.appendChild(ui);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
