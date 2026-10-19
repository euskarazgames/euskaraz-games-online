const TTL = 15 * 60;
const SOURCES = [
  { id:'primeran', name:'PRIMERAN', url:'https://primeran.eus/api/v1/home', origin:'https://primeran.eus', kind:'api', base:'series' },
  { id:'primeran-docs', name:'PRIMERAN · Dokumentalak', url:'https://primeran.eus/api/v1/pages/dokumentalak-p', origin:'https://primeran.eus', kind:'api', base:'docs' },
  { id:'etbon', name:'ETB ON', url:'https://etbon.eus/api/v1/home', origin:'https://etbon.eus', kind:'api', base:'entertainment' },
  { id:'guau', name:'GUAU', url:'https://guau.eus/api/v1/home', origin:'https://guau.eus', kind:'api', base:'audio' },
  { id:'orain', name:'ORAIN', url:'https://orain.eus/eu/azken-berriak/', origin:'https://orain.eus', kind:'html', base:'news', ttl:60 },

  { id:'eitb-news', name:'EITB Albisteak', url:'https://www.eitb.eus/eu/albisteak/', origin:'https://www.eitb.eus', kind:'html', base:'news', ttl:120 },  { id:'kirolak', name:'KIROLAK EITB', url:'https://kirolakeitb.eus/eu/', origin:'https://kirolakeitb.eus', kind:'html', base:'sports' },
  { id:'makusi', name:'MAKUSI', url:'https://makusi.eus/', origin:'https://makusi.eus', kind:'makusi', base:'kids' },
  { id:'gaztea', name:'Gaztea', url:'https://www.gaztea.eus/', origin:'https://www.gaztea.eus', kind:'html', base:'audio' },
];

const decode = (s='') => String(s)
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const p=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return p>0&&p<=0x10ffff?String.fromCodePoint(p):''})
  .replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const clean = s => decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();

function safeImage(value,base){
 try{
  if(!value||typeof value!=="string")return null;
  const u=new URL(decode(value),base);
  if(u.protocol!=="https:"||!u.hostname||u.hostname==="localhost"||u.hostname.endsWith(".local"))return null;
  if(/^(?:127\.|10\.|0\.|192\.168\.|169\.254\.)/.test(u.hostname))return null;
  if(/\.(?:svg|ico)(?:$|\?)/i.test(u.pathname))return null;
  return u.href;
 }catch{return null}
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
  if(type==='stream') return `Ireki zuzenekoa ${source.name}en`;
  return `Ireki edukia ${source.name}en`;
}
function parseApi(text,source){
 const data=JSON.parse(text),out=[],seen=new Set();
 const queue=[data];let loops=0;
 while(queue.length&&loops++<7000&&out.length<240){
  const entry=queue.shift();
  if(!entry||typeof entry!=="object")continue;
  if(Array.isArray(entry)){for(const x of entry.slice(0,120))queue.push(x);continue}
  const x=entry;
  const title=clean(x.title||x.name||x.heading||"");
  const slug=x.slug||x.url_slug;
  const collection=x.collection||x.type;
  if(title.length>2&&slug&&["media","series","stream"].includes(collection)){
   const route=collection==="media"?"m":collection==="series"?"s":"ch";
   const url=source.origin+"/"+route+"/"+encodeURIComponent(slug);
   if(!seen.has(url)&&(!x.end_date||Date.parse(x.end_date)>=Date.now())){
    const images=Array.isArray(x.images)?x.images:[];
    const preferred=images.find(i=>i&&i.format===1&&i.has_text)||images.find(i=>i&&i.format===1)||images[0];
    const candidates=[preferred&&preferred.file,...images.map(i=>i&&i.file),x.image,x.poster,x.thumbnail,x.cover,x.banner,x.image_url];
    const image=candidates.map(y=>typeof y==="object"?y?.url||y?.file:y).map(y=>y&&safeImage(y,source.origin)).find(Boolean)||null;
    seen.add(url);
    out.push({id:source.id+"-"+collection+"-"+slug,title,source:source.name,sourceId:source.id,
      category:collection==="stream"?"live":inferCategory(source,x),url,image,
      description:description(source,collection),type:collection,synopsis:clean(x.description||x.synopsis||"").slice(0,360)});
   }
  }
  for(const key of ["children","items","data","results","sections","content","rows","blocks","cards"]){
   const v=x[key];if(v&&typeof v==="object")queue.push(v);
  }
 }
 return out;
}
function imageFrom(fragment,base){
 const attrs=["src","data-src","data-cmp-src","data-original","data-lazy-src","data-image","srcset","data-srcset"];
 const candidates=[];
 for(const att of attrs){
  const rx=new RegExp("(?:^|\\s)"+att+"\\s*=\\s*[\\\"']([^\\\"']+)[\\\"']","gi");
  for(const m of String(fragment||"").matchAll(rx))candidates.push(m[1].split(/\s*,\s*/)[0].split(/\s+/)[0]);
 }
 const style=String(fragment||"").match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
 if(style)candidates.push(style[1]);
 for(const v of candidates){
  const image=safeImage(v,base);
  if(image)return image;
 }
 return null;
}
function titleFromSlug(path){
  const slug=decodeURIComponent(path.split('/').filter(Boolean).pop()||'');
  return slug.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();
}
function parseMakusi(html, source){
  const out=[], seen=new Set();
  const re=/<a\b([^>]*\bhref=["']([^"']*\/ikusi\/(?:s|m)\/[^"'?#]+)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    let url;
    try{url=new URL(decode(m[2]),source.origin)}catch{continue}
    if(!/^\/ikusi\/(?:s|m)\//.test(url.pathname)||seen.has(url.href))continue;
    const attrs=m[1],body=m[3];
    let title=attrs.match(/aria-label=["']([^"']+)/i)?.[1]
      || body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]
      || body.match(/<img[^>]+alt=["']([^"']+)/i)?.[1]
      || clean(body);
    title=clean(title);
    if(!title||title.length<2||/^image|loading$/i.test(title))title=titleFromSlug(url.pathname);
    const around=html.slice(Math.max(0,(m.index||0)-900),Math.min(html.length,(m.index||0)+m[0].length+900));
    const image=imageFrom(body,source.origin)||imageFrom(around,source.origin);
    const type=url.pathname.includes('/ikusi/m/')?'media':'series';
    seen.add(url.href);
    out.push({
      id:`makusi-${type}-${url.pathname.split('/').pop()}`,
      title,source:'MAKUSI',sourceId:'makusi',category:'kids',
      url:url.href,image,description:'Ikusi MAKUSIn',type,
      synopsis:''
    });
    if(out.length>=120)break;
  }
  if(!out.length)throw new Error('Ez da MAKUSI edukirik aurkitu');
  return out;
}
function parseHtml(html,source){
 const out=[],seen=new Set();
 const regex=/<a\b([^>]*\bhref=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(regex)){
  let url;try{url=new URL(decode(m[2]),source.origin)}catch{continue}
  if(url.protocol!=="https:"||url.hostname!==new URL(source.origin).hostname||seen.has(url.href))continue;
  if(!(/\/20\d{2}\/\d{2}\/\d{2}\//.test(url.pathname)||/\/detalle\/\d+\//.test(url.pathname)||/\/albisteak?\//.test(url.pathname)||/\/noticias?\//.test(url.pathname)))continue;
  const attrs=m[1],body=m[3];
  let title=clean(attrs.match(/aria-label=["']([^"']+)/i)?.[1]||
    body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]||
    body.match(/<img[^>]+alt=["']([^"']+)/i)?.[1]||body);
  title=title.replace(/^Ikusi albistearen xehetasunak:\s*/i,"").slice(0,210);
  if(title.length<12)continue;
  const around=html.slice(Math.max(0,(m.index||0)-250),Math.min(html.length,(m.index||0)+m[0].length+400));
  const image=imageFrom(body,source.origin)||imageFrom(around,source.origin)||null;
  seen.add(url.href);
  const dm=url.pathname.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  const publishedAt=dm?dm[1]+"-"+dm[2]+"-"+dm[3]+"T12:00:00Z":null;
  out.push({id:source.id+"-"+url.pathname,title,source:source.name,sourceId:source.id,category:source.base,
    url:url.href,image,description:source.id==="orain"?"Irakurri ORAINen":"Ireki albistea",type:"article",publishedAt});
  if(out.length>=70)break;
 }
 return out;
}
async function enrichNewsImages(items){
 const target=items.filter(x=>x.category==="news"&&!x.image).slice(0,10);
 await Promise.all(target.map(async x=>{
  try{
   const signal=AbortSignal.timeout(3500);
   const r=await fetch(x.url,{signal,headers:{accept:"text/html"}});
   if(!r.ok)return;
   const html=(await r.text()).slice(0,150000);
   const m=html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
    ||html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
   const img=m&&safeImage(m[1],x.url);
   if(img)x.image=img;
  }catch(e){}
 }));
 return items;
}
async function readSource(source, request){
  const origin=new URL(request.url).origin;
  const ttl=Number(source.ttl||TTL);
  const cache=caches.default;
  const key=new Request(`${origin}/garena/__cache/v5/${source.id}`);
  const hit=await cache.match(key);
  if(hit){
    const cached=await hit.json();
    const age=Date.now()-Date.parse(cached.fetchedAt||0);
    if(age < ttl*1000 && Array.isArray(cached.items) && cached.items.length) return {...cached,status:'cache'};
  }
  try{
    const res=await fetch(source.url,{headers:{accept:source.kind==='api'?'application/json':'text/html','user-agent':'GARENA/1.0 (+EITB public directory)'},cf:{cacheTtl:ttl,cacheEverything:true}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const items=source.kind==='api'?parseApi(text,source):source.kind==='makusi'?parseMakusi(text,source):parseHtml(text,source);
    if(source.id==='orain')await enrichNewsImages(items);
    if(!items.length)throw new Error('empty source');
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
  return out.slice(0,900);
}

export async function handleAtariaApi(request){
  if(request.method!=='GET'&&request.method!=='HEAD') return new Response('Method Not Allowed',{status:405,headers:{allow:'GET, HEAD'}});
  const parts=await Promise.all(SOURCES.map(s=>readSource(s,request)));
  const body={items:merge(parts),sources:parts.map(({items,...rest})=>({...rest,count:items.length})),checkedAt:new Date().toISOString(),refreshMinutes:1,contentRefreshMinutes:15};
  return new Response(request.method==='HEAD'?null:JSON.stringify(body),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
