from pathlib import Path
import re, base64

path = Path('public/index.html')
src = path.read_text(encoding='utf-8')

m = re.search(r'("itsas":")([A-Za-z0-9+/=]+)(")', src)
if not m:
    raise SystemExit('ITSAS PACK not found')

itsas = base64.b64decode(m.group(2)).decode('utf-8')
marker = 'ITSAS MISIOA COMPACT V1'

if marker in itsas:
    print('Itsas mission panel already compact')
else:
    old_css = '''#misioa{position:fixed;display:none;left:calc(10px + env(safe-area-inset-left));
    bottom:calc(178px + env(safe-area-inset-bottom));z-index:12;max-width:min(62vw,340px);
    background:rgba(6,16,12,.6);border-left:3px solid #d9b23d;border-radius:0 8px 8px 0;padding:7px 11px;}
  #misioa b{display:block;font-size:9px;letter-spacing:3px;color:#d9b23d;}
  #misioa span{display:block;font-size:12px;color:#dff0e2;line-height:1.4;margin-top:2px;}'''

    new_css = '''#misioa{position:fixed;display:none;left:calc(10px + env(safe-area-inset-left));
    bottom:calc(150px + env(safe-area-inset-bottom));z-index:12;max-width:min(48vw,250px);
    background:rgba(6,16,12,.72);border-left:2px solid #d9b23d;border-radius:0 7px 7px 0;
    padding:5px 8px;opacity:0;transform:translateX(-7px);transition:opacity .2s ease,transform .2s ease;
    pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.18);} /* ITSAS MISIOA COMPACT V1 */
  #misioa.show{opacity:1;transform:translateX(0);}
  #misioa b{display:block;font-size:7px;letter-spacing:2.2px;color:#d9b23d;}
  #misioa span{display:block;font-size:10px;color:#dff0e2;line-height:1.25;margin-top:1px;}
  @media(max-width:700px){#misioa{max-width:min(58vw,220px);bottom:calc(142px + env(safe-area-inset-bottom));padding:5px 7px;}#misioa span{font-size:9px;}}'''

    if old_css not in itsas:
        raise SystemExit('Original ITSAS mission CSS block not found')
    itsas = itsas.replace(old_css, new_css, 1)

    start = itsas.index('function setMisioa(t){')
    end = itsas.index('function refreshHUD(){', start)
    new_fn = '''let misioaTimer=0,misioaHideTimer=0;
function setMisioa(t){
  const el=document.getElementById('misioa');
  const tx=document.getElementById('misioaTxt');
  if(!el||!tx)return;
  clearTimeout(misioaTimer);clearTimeout(misioaHideTimer);
  tx.textContent=t;
  el.style.display='block';
  requestAnimationFrame(()=>el.classList.add('show'));
  const important=/(lortuta|eskuratu|giltza|zigilu|saria|sari|hobekuntza|arma|ireki|irabazi)/i.test(String(t||''));
  const stay=important?4700:2600;
  misioaTimer=setTimeout(()=>{
    el.classList.remove('show');
    misioaHideTimer=setTimeout(()=>{el.style.display='none';},220);
  },stay);
}
'''
    itsas = itsas[:start] + new_fn + itsas[end:]

    enc = base64.b64encode(itsas.encode('utf-8')).decode('ascii')
    src = src[:m.start(2)] + enc + src[m.end(2):]
    path.write_text(src, encoding='utf-8')
    print('Patched ITSAS DORREA mission panel: compact + auto-hide notifications')
