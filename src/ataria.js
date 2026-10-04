const TTL = 15 * 60;
const SOURCES = [
  { id:'primeran', name:'PRIMERAN', url:'https://primeran.eus/api/v1/home', origin:'https://primeran.eus', kind:'api', base:'series' },
  { id:'primeran-docs', name:'PRIMERAN · Dokumentalak', url:'https://primeran.eus/api/v1/pages/dokumentalak-p', origin:'https://primeran.eus', kind:'api', base:'docs' },
  { id:'etbon', name:'ETB ON', url:'https://etbon.eus/api/v1/home', origin:'https://etbon.eus', kind:'api', base:'entertainment' },
  { id:'guau', name:'GUAU', url:'https://guau.eus/api/v1/home', origin:'https://guau.eus', kind:'api', base:'audio' },
  { id:'orain', name:'ORAIN', url:'https://orain.eus/eu/', origin:'https://orain.eus', kind:'html', base:'news' },
  { id:'kirolak', name:'KIROLAK EITB', url:'https://kirolakeitb.eus/eu/', origin:'https://kirolakeitb.eus', kind:'html', base:'sports' },
];

const decode = (s='') => String(s)
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const p=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return p>0&&p<=0x10ffff?String.fromCodePoint(p):''})
  .replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const clean = s => decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();

function safeImage(value, base){
  try {
    const u = new URL(decode(value), base);
    if(u.protocol !== 'https:') return null;
    const allowed = ['cdnstorage.primeran.eus','eitb.scene7.com','s7g10.scene7.com','orain.eus','kirolakeitb.eus','www.eitb.eus','eitb.eus'];
    return allowed.some(h=>u.hostname===h || u.hostname.endsWith('.'+h)) ? u.href : null;
  } catch { return null; }
}
function inferCategory(source,row={}){
  if(source.id==='primeran-docs') return 'docs';
  if(source.id==='guau') return 'audio';
  const t = `${row.name||''} ${row.h1||''} ${row.title||''}`.toLowerCase();
  if(/dokument|document/.test(t)) return 'docs';
  if(/kirol|deport|futbol|pilota|saski/.test(t)) return 'sports';
  if(/albiste|inform|aktual|berri/.test(t)) return 'news';
  if(/entreteni|saio|program|umore|lehiaketa|show/.test(t)) return 'entertainment';
  return source.base;
}
function description(source, type){
  if(source.id==='guau') return 'Entzun GUAUn';
  if(source.id==='primeran-docs') return 'Ikusi dokumentala PRIMERANen';
  if(type==='series') return `Ikusi atalak ${source.name}en`;
  return `Ireki edukia ${source.name}en`;
}
function parseApi(text, source){
  const data = JSON.parse(text);
  if(!Array.isArray(data.children)) throw new Error('Katalogo-formatu ezezaguna');
  const out=[], seen=new Set();
  for(const row of data.children){
    let perRow=0;
    for(const x of row.children||[]){
      if(!x || !['media','series'].includes(x.collection) || !x.slug || !x.title) continue;
      const route = x.collection==='media' ? 'm' : 's';
      const url = `${source.origin}/${route}/${encodeURIComponent(x.slug)}`;
      if(seen.has(url)) continue;
      if(x.end_date && Date.parse(x.end_date) < Date.now()) continue;
      const images = Array.isArray(x.images) ? x.images : [];
      const preferred = images.find(i=>i.format===1&&i.has_text) || images.find(i=>i.format===1) || images.find(i=>i.format===7) || images[0];
      const image = preferred ? safeImage(preferred.file, source.origin) : null;
      if(!image) continue;
      seen.add(url);
      out.push({
        id:`${source.id}-${x.collection}-${x.slug}`,
        title:clean(x.title), source:source.name, sourceId:source.id,
        category:inferCategory(source,row), url, image,
        description:description(source,x.collection), type:x.collection,
        synopsis:clean(x.description||'').slice(0,360)
      });
      if(++perRow >= 10) break;
      if(out.length >= 130) break;
    }
    if(out.length >= 130) break;
  }
  if(!out.length) throw new Error('Katalogoa hutsik');
  return out;
}
function parseHtml(html, source){
  const out=[], seen=new Set();
  const re=/<a\b([^>]*\bhref=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    let url;
    try{ url=new URL(decode(m[2]),source.origin); }catch{ continue; }
    if(url.protocol!=='https:' || url.hostname!==new URL(source.origin).hostname) continue;
    if(!/\/20\d{2}\/\d{2}\/\d{2}\//.test(url.pathname)) continue;
    if(seen.has(url.href)) continue;
    const attrs=m[1], body=m[3];
    let title = attrs.match(/aria-label=["']([^"']+)/i)?.[1] || body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    title=clean(title).replace(/^Ikusi albistearen xehetasunak:\s*/i,'');
    if(!title || title.length<6) continue;
    let img = body.match(/<img[^>]*\bsrc=["']([^"']+)/i)?.[1] || body.match(/data-cmp-src=["']([^"']+)/i)?.[1];
    img = img ? safeImage(img,source.origin) : null;
    seen.add(url.href);
    out.push({id:`${source.id}-${url.pathname}`,title,source:source.name,sourceId:source.id,category:source.base,url:url.href,image:img,description:source.id==='orain'?'Irakurri ORAINen':'Irakurri KIROLAK EITBn',type:'article'});
    if(out.length>=40) break;
  }
  if(!out.length) throw new Error('Ez da albisterik aurkitu');
  return out;
}
async function readSource(source, request){
  const origin=new URL(request.url).origin;
  const cache=caches.default;
  const key=new Request(`${origin}/ataria/__cache/${source.id}`);
  const hit=await cache.match(key);
  if(hit){
    const cached=await hit.json();
    const age=Date.now()-Date.parse(cached.fetchedAt||0);
    if(age < TTL*1000) return {...cached,status:'cache'};
  }
  try{
    const res=await fetch(source.url,{headers:{accept:source.kind==='api'?'application/json':'text/html','user-agent':'ATARIA/1.0 (+EITB public directory)'},cf:{cacheTtl:TTL,cacheEverything:true}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const items=source.kind==='api'?parseApi(text,source):parseHtml(text,source);
    const fresh={id:source.id,name:source.name,items,fetchedAt:new Date().toISOString(),status:'eguneratuta'};
    await cache.put(key,Response.json(fresh,{headers:{'cache-control':'public,max-age=604800'}}));
    return fresh;
  }catch(err){
    if(hit){const cached=await hit.json();return {...cached,status:'aurreko kopia'};}
    return {id:source.id,name:source.name,items:[],fetchedAt:null,status:'ez dago erabilgarri'};
  }
}
function merge(parts){
  const out=[],seen=new Set();
  const lists=parts.map(p=>p.items||[]);
  const max=Math.max(0,...lists.map(x=>x.length));
  for(let i=0;i<max;i++) for(const list of lists){const x=list[i];if(x&&!seen.has(x.url)){seen.add(x.url);out.push(x)}}
  return out.slice(0,480);
}

export async function handleAtariaApi(request){
  if(request.method!=='GET'&&request.method!=='HEAD') return new Response('Method Not Allowed',{status:405,headers:{allow:'GET, HEAD'}});
  const parts=await Promise.all(SOURCES.map(s=>readSource(s,request)));
  const body={items:merge(parts),sources:parts.map(({items,...rest})=>({...rest,count:items.length})),checkedAt:new Date().toISOString(),refreshMinutes:15};
  return new Response(request.method==='HEAD'?null:JSON.stringify(body),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
