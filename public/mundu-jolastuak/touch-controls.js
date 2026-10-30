/* Euskaraz Games — floating independent multitouch sticks. No polling of synthetic keys. */
(()=>{
'use strict';
const cfg=window.EG_GAME,profile=cfg.touch;
if(!profile)throw Error('Ukipen-profila falta da: '+cfg.slug);
const left={x:0,y:0,active:false},right={x:0,y:0,active:false};
const api=window.EGPad={left,right,sensitivity:1,axis(value,axis='x',sign=1){return left.active?left[axis]*sign:value},rightAxis(value,axis='y',sign=1){return right.active?right[axis]*sign:value}};
function init(){
 if(document.getElementById('eg-controls'))return;
 const style=document.createElement('style');style.textContent=`
 #eg-controls{--size:clamp(104px,23vw,144px);position:fixed;inset:0;z-index:99990;pointer-events:none;user-select:none;-webkit-user-select:none;display:none}#eg-controls.visible{display:block}
 #eg-controls .stick{position:absolute;bottom:max(18px,env(safe-area-inset-bottom));width:var(--size);height:var(--size);border-radius:50%;background:radial-gradient(circle,#12322b33,#07191980);border:1px solid #bce7d958;box-shadow:inset 0 0 0 14px #a4dccc08,0 4px 18px #0003;pointer-events:none;touch-action:none;contain:layout style;outline:none;opacity:0}
 #eg-controls .stick::before,#eg-controls .stick::after{content:'';position:absolute;background:#d5efe42b;pointer-events:none}#eg-controls .stick::before{height:1px;top:50%;left:14px;right:14px}#eg-controls .stick::after{width:1px;left:50%;top:14px;bottom:14px}
 #eg-controls .stick.left{left:max(18px,env(safe-area-inset-left))}#eg-controls .stick.right{right:max(18px,env(safe-area-inset-right));border-color:#ffc89466;background:radial-gradient(circle,#73442533,#26160c80)}
 #eg-controls .nub{position:absolute;left:50%;top:50%;width:45%;height:45%;margin:-22.5%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d2f0dcbf,#33735fa8);border:1px solid #d1f4e3ad;box-shadow:0 3px 12px #0004;will-change:transform;pointer-events:none}#eg-controls .right .nub{background:radial-gradient(circle at 35% 30%,#ffe0b8cc,#aa673fac);border-color:#ffe4c6}
 #eg-controls .stick.active{border-color:#fff9;opacity:1}#eg-controls .stick-label{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;color:#f0f5ec;text-shadow:0 2px 3px #000;font:700 9px system-ui;letter-spacing:.08em;pointer-events:none}
 #eg-controls .actions{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(var(--size) + max(52px,env(safe-area-inset-bottom)));display:flex;max-width:220px;gap:7px;justify-content:flex-end;flex-wrap:wrap;pointer-events:none}
 #eg-controls button,#eg-settings button{min-height:44px;padding:8px 11px;border-radius:14px;background:#10251ed9;border:1px solid #c8ecda80;color:#fff;font:700 11px system-ui;pointer-events:auto;touch-action:none;box-shadow:0 3px 10px #0004}#eg-controls button.pressed{background:#bd7843;border-color:#ffe0b8}#eg-controls .actions button:first-child{background:#87542ddb;border-color:#f6c38b;min-width:65px}
 #eg-controls.left-handed .left{left:auto;right:max(18px,env(safe-area-inset-right))}#eg-controls.left-handed .right{right:auto;left:max(18px,env(safe-area-inset-left))}#eg-controls.left-handed .actions{right:auto;left:max(16px,env(safe-area-inset-left));justify-content:flex-start}
 #eg-touch-menu{position:fixed;z-index:99992;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);display:flex;gap:5px}#eg-touch-menu button{font:700 10px system-ui;color:white;background:#0f211ec9;border:1px solid #d3ebdf66;border-radius:8px;padding:8px;min-height:34px;touch-action:manipulation}
 #eg-settings{position:fixed;z-index:99993;left:50%;top:55px;transform:translateX(-50%);width:min(340px,90vw);padding:16px;background:#10241ff5;color:white;border:1px solid #9dc6b8;border-radius:16px;box-shadow:0 12px 40px #0009;font:12px/1.6 system-ui}#eg-settings[hidden]{display:none}#eg-settings label{display:flex;gap:9px;align-items:center;margin:12px 0}#eg-settings input[type=range]{width:150px}#eg-settings p{margin:6px 0;color:#c6dfd2}
 @media(max-height:470px){#eg-controls{--size:104px}#eg-controls .stick{bottom:max(12px,env(safe-area-inset-bottom))}#eg-controls .actions{bottom:calc(var(--size) + 38px)}#eg-controls button{min-height:42px;padding:6px 10px}#eg-settings{max-height:70vh;overflow:auto}}
 @media(max-width:360px){#eg-controls{--size:98px}#eg-controls .stick.left{left:10px}#eg-controls .stick.right{right:10px}#eg-controls .actions{max-width:190px}}
 `;document.head.append(style);
 let options={sensitivity:1,leftHanded:false};try{Object.assign(options,JSON.parse(localStorage.getItem('eg-touch-v2')||'{}'))}catch{}
 api.sensitivity=Math.max(.5,Math.min(2,Number(options.sensitivity)||1));
 const root=document.createElement('section');root.id='eg-controls';root.setAttribute('aria-label','Bi joystick ukigarri');
 const coarse=window.matchMedia?.('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
 root.classList.toggle('visible',coarse);root.classList.toggle('left-handed',!!options.leftHanded);
 const held=new Map(),keyRefs=new Map(),owners=new Map(),sticks=[],buttonPointers=[];
 function keyName(code){return code==='Space'?' ':code==='Enter'?'Enter':code==='ShiftLeft'?'Shift':code.startsWith('Key')?code.slice(3).toLowerCase():code.startsWith('Digit')?code.slice(5):code}
 function emit(code,down){const key=keyName(code),ev=new KeyboardEvent(down?'keydown':'keyup',{key,code,bubbles:true,cancelable:true});const n={Space:32,Enter:13,ShiftLeft:16,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40}[code]||key.toUpperCase().charCodeAt(0);for(const field of ['keyCode','which'])Object.defineProperty(ev,field,{get:()=>n});document.dispatchEvent(ev)}
 function setKeys(owner,list){const prev=held.get(owner)||new Set(),next=new Set(list.filter(Boolean));for(const code of prev)if(!next.has(code)){const n=(keyRefs.get(code)||1)-1;if(n){keyRefs.set(code,n)}else{keyRefs.delete(code);emit(code,false)}}for(const code of next)if(!prev.has(code)){const n=keyRefs.get(code)||0;keyRefs.set(code,n+1);if(!n)emit(code,true)}if(next.size)held.set(owner,next);else held.delete(owner)}
 function stop(e){e.preventDefault();e.stopPropagation()}
 function pointerStart(el,e){if(e.pointerType==='mouse'&&e.button!==0)return false;try{el.setPointerCapture(e.pointerId)}catch{}stop(e);return true}
 let raf=0,last=0;
 function schedule(){if(!raf)raf=requestAnimationFrame(tick)}
 function makeStick(side,label){const el=document.createElement('div');el.className='stick '+side;el.dataset.stick=side;el.setAttribute('role','group');el.setAttribute('aria-label',label);el.innerHTML='<span class="stick-label"></span><span class="nub"></span>';el.querySelector('.stick-label').textContent=label;root.append(el);
 const st={el,nub:el.querySelector('.nub'),out:side==='left'?left:right,side,id:null,tx:0,ty:0,cx:0,cy:0,r:42};sticks.push(st);
 function position(e){let x=(e.clientX-st.cx)/st.r,y=(e.clientY-st.cy)/st.r;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}st.nub.style.transform=`translate3d(${x*st.r}px,${y*st.r}px,0)`;const d=Math.hypot(x,y),dz=.12,k=d>dz?Math.pow((d-dz)/(1-dz),1.2)/d:0;st.tx=x*k;st.ty=y*k;if(st.side==='left'&&profile.left==='x')st.ty=0;schedule()}
 st.position=position;return st}
 // Anchor each thumb at its initial contact; crossing the midpoint keeps ownership.
 const interactive=target=>target?.closest?.('button,a,input,select,textarea,[role="button"],[contenteditable="true"],#eg-touch-menu,#eg-settings,.actions');
 function floatingEnabled(e){return root.classList.contains('visible')&&panel.hidden&&!interactive(e.target)}
 window.addEventListener('pointerdown',e=>{
  if(!floatingEnabled(e)||owners.has(e.pointerId)||(e.pointerType==='mouse'&&e.button!==0))return;
  const physicalLeft=e.clientX<window.innerWidth/2;
  const st=sticks[(physicalLeft!==!!options.leftHanded)?0:1];
  stop(e);e.stopImmediatePropagation();
  if(st.id!==null)return;
  st.id=e.pointerId;owners.set(e.pointerId,st);st.cx=e.clientX;st.cy=e.clientY;
  const size=st.el.getBoundingClientRect().width||104;st.r=size*.32;
  Object.assign(st.el.style,{left:(st.cx-size/2)+'px',top:(st.cy-size/2)+'px',right:'auto',bottom:'auto'});
  st.out.active=true;st.el.classList.add('active');
  try{st.el.setPointerCapture(e.pointerId)}catch{}
  st.position(e);
 },true);
 window.addEventListener('pointermove',e=>{const st=owners.get(e.pointerId);if(!st)return;stop(e);e.stopImmediatePropagation();st.position(e)},true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,e=>{const st=owners.get(e.pointerId);if(!st)return;stop(e);e.stopImmediatePropagation();releaseStick(st)},true);

 function releaseStick(st){const id=st.id;owners.delete(id);st.id=null;try{if(id!==null&&st.el.hasPointerCapture?.(id))st.el.releasePointerCapture(id)}catch{}st.tx=st.ty=st.out.x=st.out.y=0;st.out.active=false;st.nub.style.transform='translate3d(0,0,0)';st.el.classList.remove('active');setKeys(st.side,[])}
 const leftLabel=profile.left==='runner'?'SALTO / JAITSI':profile.left==='x'?'MUGITU ↔':'MUGITU';
 makeStick('left',leftLabel);makeStick('right',profile.rightLabel||'EKINTZAK');
 function digital(v,codeA,codeB,prev){const at=v<0?codeA:codeB;const threshold=prev?.has(at) ? .20 : .32;return Math.abs(v)>threshold?at:null}
 function tick(now){raf=0;const dt=last?Math.min((now-last)/1000,.033):1/60;last=now;const a=1-Math.exp(-32*dt);
  for(const st of sticks)if(st.id!==null){st.out.x+=(st.tx-st.out.x)*a;st.out.y+=(st.ty-st.out.y)*a;const prev=held.get(st.side),keys=[];
   if(st.side==='left'){
    if(profile.left==='runner'){keys.push(digital(st.out.y,'Space','ArrowDown',prev));}
    else if(!profile.analog){keys.push(digital(st.out.x,'KeyA','KeyD',prev));if(profile.left==='xy')keys.push(digital(st.out.y,'KeyW','KeyS',prev));}
    // Forward/reverse remain keyboard actions in Train Painter; steering is analog.
    if(cfg.slug==='train-painter')keys.push(digital(st.out.y,'ArrowUp','ArrowDown',prev));
   }else if(profile.right==='actions'){keys.push(digital(st.out.y,profile.up,profile.down,prev));if(profile.side)keys.push(digital(st.out.x,profile.side,profile.side,prev));}
   setKeys(st.side,keys);
  }
  if(sticks.some(st=>st.id!==null))schedule();else last=0;
 }
 const actions=document.createElement('div');actions.className='actions';root.append(actions);
 function button(label,code){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.code=code;const pointers=new Set();buttonPointers.push(pointers);
 b.addEventListener('pointerdown',e=>{if(!pointerStart(b,e))return;pointers.add(e.pointerId);b.classList.add('pressed');setKeys(b,[code]);});
 const end=e=>{if(!pointers.delete(e.pointerId))return;stop(e);if(!pointers.size){b.classList.remove('pressed');setKeys(b,[])}};
 b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);actions.append(b);return b}
 for(const [label,code] of profile.actions)button(label,code);
 const menu=document.createElement('div');menu.id='eg-touch-menu';menu.innerHTML='<button type="button" data-start>Hasi</button><button type="button" data-toggle>Aginteak</button><button type="button" data-settings>⚙</button>';
 menu.querySelector('[data-settings]').setAttribute('aria-label','Aginteen ezarpenak');
 function pulse(code){const owner={};setKeys(owner,[code]);setTimeout(()=>setKeys(owner,[]),90)}
 menu.querySelector('[data-start]').onclick=()=>{if(profile.start==='join'){pulse('KeyW');setTimeout(()=>pulse('Enter'),140)}else pulse(profile.start||'Space')};
 const panel=document.createElement('div');panel.id='eg-settings';panel.hidden=true;panel.innerHTML='<strong>UKIPEN-AGINTEAK</strong><p class="mapping"></p><label>Kamera <input type="range" min="0.5" max="2" step="0.1" aria-label="Kameraren sentikortasuna"><output></output></label><label><input type="checkbox"> Ezker-eskuinak trukatu</label><p>Ukitu pantailaren ezkerreko erdia mugitzeko eta eskuinekoa kamera edo ekintzak kontrolatzeko. Joysticka hatza jartzen duzun tokian agertuko da, eta askatzean desagertuko da.</p><button type="button">Itxi</button>';
 panel.querySelector('.mapping').textContent=profile.right==='camera'?'Ezkerra: mugitu. Eskuina: kamera.':profile.right==='sails'?'Ezkerra: lema. Eskuina: belak eta orientazioa.':profile.right==='altitude'?'Ezkerra: hegan. Eskuina: igo edo jaitsi.':profile.right==='rope'?'Ezkerra: kulunkatu. Eskuina: sokan igo edo jaitsi.':'Ezkerra: '+(profile.left==='runner'?'salto eta jaitsiera.':'mugitu.')+' Eskuina: ↑ '+(profile.actions[0]?.[0]||'ekintza')+(profile.down?' · ↓ '+(profile.actions[1]?.[0]||'ekintza'):'')+(profile.side?' · ↔ '+(profile.actions.find(a=>a[1]===profile.side)?.[0]||'bizkortu'):'');
 const slider=panel.querySelector('input[type=range]'),check=panel.querySelector('input[type=checkbox]');slider.value=api.sensitivity;slider.parentElement.hidden=profile.right!=='camera';panel.querySelector('output').textContent=api.sensitivity+'×';check.checked=!!options.leftHanded;
 function persist(){try{localStorage.setItem('eg-touch-v2',JSON.stringify(options))}catch{}}
 slider.oninput=()=>{api.sensitivity=options.sensitivity=+slider.value;panel.querySelector('output').textContent=slider.value+'×';persist()};check.onchange=()=>{releaseAll();root.classList.toggle('left-handed',check.checked);options.leftHanded=check.checked;persist()};
 function releaseAll(){for(const pointers of buttonPointers)pointers.clear();for(const st of sticks)releaseStick(st);for(const owner of [...held.keys()])setKeys(owner,[]);root.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));if(raf)cancelAnimationFrame(raf);raf=0;last=0}
 menu.querySelector('[data-toggle]').onclick=()=>{releaseAll();root.classList.toggle('visible')};menu.querySelector('[data-settings]').onclick=()=>{releaseAll();panel.hidden=!panel.hidden};panel.querySelector('button').onclick=()=>panel.hidden=true;
 // Controller touches never reach the original touch recognizers underneath.
 const isUI=e=>e.target?.closest?.('#eg-controls,#eg-touch-menu,#eg-settings');
 for(const type of ['touchstart','touchmove','touchend','touchcancel'])window.addEventListener(type,e=>{if(isUI(e)||floatingEnabled(e)){if((e.target.closest('#eg-controls')||floatingEnabled(e))&&e.cancelable)e.preventDefault();e.stopImmediatePropagation()}},{capture:true,passive:false});
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','mousedown','mouseup']){root.addEventListener(type,e=>e.stopPropagation());menu.addEventListener(type,e=>e.stopPropagation());panel.addEventListener(type,e=>e.stopPropagation())}
 window.addEventListener('blur',releaseAll);window.addEventListener('pagehide',releaseAll);window.addEventListener('resize',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
 document.body.append(root,menu,panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
