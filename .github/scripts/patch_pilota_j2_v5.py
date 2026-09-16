from pathlib import Path
import re, base64
p=Path('public/index.html'); src=p.read_text(encoding='utf-8')
m=re.search(r'(const PACK=\{"pilota":")([A-Za-z0-9+/=]+)(")',src)
if not m: raise SystemExit('Pilota PACK not found')
pil=base64.b64decode(m.group(2)).decode('utf-8')
if 'ONLINE PILOTA J2 V5' in pil: raise SystemExit(0)
# V5: make guest reconciliation perceptually continuous: local prediction wins for normal latency,
# server only eases small drift; hard correction is reserved for true desync.
old='const rate=wantsContact?(err>.9?10:6):(err>1.6?4.5:1.8);'
new='const rate=wantsContact?(err>1.25?7:4.2):(err>2.8?3.2:(err>.55?1.25:.45)); /* ONLINE PILOTA J2 V5 */'
if old not in pil: raise SystemExit('V4 reconciliation anchor not found')
pil=pil.replace(old,new,1)
# Increase local input cadence to 50 Hz for J2; state remains host-authoritative.
pil=pil.replace('HPOnline.inputT>=1/30','HPOnline.inputT>=1/50',1)
# On point transition, fully neutralise guest held actions and establish a fresh action epoch.
old2="""if(HPOnline.guestPred.lastLive&&!S.live){
   HPOnline.guestPred.armed=false;
   HPOnline.guestPred.seq=0;
   HPOnline.guestPred.round=Date.now();
 }"""
new2="""if(HPOnline.guestPred.lastLive&&!S.live){
   HPOnline.guestPred.armed=false;
   HPOnline.guestPred.seq=0;
   HPOnline.guestPred.kind='';
   HPOnline.guestPred.round=Date.now();
   HPOnline.guestPred.blockUntil=performance.now()+650;
   flatHeld=false;lobHeld=false;dropHeld=false;
   hpSendGame({type:'input',i:{x:0,z:0,flat:false,lob:false,drop:false,aseq:0,kind:'',round:HPOnline.guestPred.round}});
 }"""
if old2 not in pil: raise SystemExit('guest round reset anchor not found')
pil=pil.replace(old2,new2,1)
# During the short dead-ball reset window never transmit an old action as a new serve.
needle="""hpSendGame({type:'input',i:{
     x:mv.x,z:mv.z,
     flat:flatHeld,lob:lobHeld,drop:dropHeld,
     aseq:HPOnline.guestPred.seq,kind:HPOnline.guestPred.kind
   }});"""
repl="""const j2Blocked=HPOnline.guestPred.blockUntil&&performance.now()<HPOnline.guestPred.blockUntil;
   hpSendGame({type:'input',i:{
     x:mv.x,z:mv.z,
     flat:j2Blocked?false:flatHeld,lob:j2Blocked?false:lobHeld,drop:j2Blocked?false:dropHeld,
     aseq:j2Blocked?0:HPOnline.guestPred.seq,kind:j2Blocked?'':HPOnline.guestPred.kind,
     round:HPOnline.guestPred.round||0
   }});"""
if needle not in pil: raise SystemExit('guest send anchor not found')
pil=pil.replace(needle,repl,1)
# Host: clear every J2 action latch when rally becomes dead and ignore stale action sequence.
old3="""if(HPOnline._j2LastLive&&!this.live){
   HPOnline._j2RoundBaseSeq=HPOnline.remoteActionSeq||0;
   this.p2Armed=false;this.p2Charge=0;this.p2Swing=0;
 }"""
new3="""if(HPOnline._j2LastLive&&!this.live){
   HPOnline._j2RoundBaseSeq=HPOnline.remoteActionSeq||0;
   HPOnline._j2DeadUntil=performance.now()+700;
   this.p2Armed=false;this.p2Charge=0;this.p2Swing=0;
   if(HPOnline.remoteInput){HPOnline.remoteInput.flat=false;HPOnline.remoteInput.lob=false;HPOnline.remoteInput.drop=false;}
   HPOnline.remotePrev={flat:false,lob:false,drop:false};
 }"""
if old3 not in pil: raise SystemExit('host reset anchor not found')
pil=pil.replace(old3,new3,1)
# Gate J2 serve/action release during reset window.
old4="if(this.p2Armed&&(HPOnline.remoteActionSeq||0)>(HPOnline._j2RoundBaseSeq||0)&&!held&&this.p2Charge>.02)this.p2Serve();"
new4="if(!(HPOnline._j2DeadUntil&&performance.now()<HPOnline._j2DeadUntil)&&this.p2Armed&&(HPOnline.remoteActionSeq||0)>(HPOnline._j2RoundBaseSeq||0)&&!held&&this.p2Charge>.02)this.p2Serve();"
if old4 not in pil: raise SystemExit('serve gate anchor not found')
pil=pil.replace(old4,new4,1)
enc=base64.b64encode(pil.encode()).decode(); src=src[:m.start(2)]+enc+src[m.end(2):]
p.write_text(src,encoding='utf-8')
print('Applied ONLINE PILOTA J2 V5: 50Hz input, soft reconciliation, full point-reset action flush')
