/* Native fullscreen when available, immersive viewport on iPhone and denied requests. */
(()=>{
const style=document.createElement('style');style.textContent=`
.eg-expanded{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:0!important;margin:0!important;z-index:100000!important;display:flex!important;flex-direction:column!important;background:#090b11;overflow:hidden!important}
.eg-expanded>.playerhead,.eg-expanded>.playerhelp,.eg-expanded>header,.eg-expanded>footer,.eg-expanded>#help{display:none!important}
.eg-expanded>#stage,.eg-expanded>.gameframe{flex:1!important;min-height:0!important;height:100%!important}
.eg-full-exit{position:absolute;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));z-index:100001;min-width:44px;min-height:44px;border:1px solid #ddd8;border-radius:10px;color:#fff;background:#10241fe6;font:700 12px system-ui;padding:8px;touch-action:manipulation}
.eg-full-exit[hidden]{display:none}
`;document.head.append(style);
window.EGFullscreen=function(target,button){
 let expanded=false,enteredNative=false;
 const exit=document.createElement('button');exit.type='button';exit.className='eg-full-exit';exit.textContent='↙ Itxi';exit.setAttribute('aria-label','Pantaila osotik irten');exit.hidden=true;target.append(exit);
 const nativeElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
 function paint(on){expanded=on;target.classList.toggle('eg-expanded',on);exit.hidden=!on;button.setAttribute('aria-pressed',String(on));}
 async function leave(){paint(false);if(nativeElement()){try{await (document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch{}}enteredNative=false;}
 async function enter(){
  if(expanded){await leave();return;}
  paint(true);
  const request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(request){try{await request.call(target);enteredNative=!!nativeElement()}catch{enteredNative=false;}}
 }
 button.addEventListener('click',enter);exit.addEventListener('click',leave);
 const changed=()=>{if(nativeElement()){enteredNative=true;paint(true)}else if(enteredNative){enteredNative=false;paint(false)}};
 document.addEventListener('fullscreenchange',changed);document.addEventListener('webkitfullscreenchange',changed);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)leave()});
 return {exit:leave,get expanded(){return expanded}};
};
})();
