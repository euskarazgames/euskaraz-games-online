const TTL = 15 * 60;
const SOURCES = [
  { id:'primeran', name:'PRIMERAN', url:'https://primeran.eus/api/v1/home', origin:'https://primeran.eus', kind:'api', base:'series' },
  { id:'primeran-docs', name:'PRIMERAN · Dokumentalak', url:'https://primeran.eus/api/v1/pages/dokumentalak-p', origin:'https://primeran.eus', kind:'api', base:'docs' },
  { id:'etbon', name:'ETB ON', url:'https://etbon.eus/api/v1/home', origin:'https://etbon.eus', kind:'api', base:'entertainment' },
  { id:'guau', name:'GUAU', url:'https://guau.eus/api/v1/home', origin:'https://guau.eus', kind:'api', base:'audio' },
  { id:'orain', name:'ORAIN', url:'https://orain.eus/eu/', origin:'https://orain.eus', kind:'html', base:'news', ttl:60 },
  { id:'kirolak', name:'KIROLAK EITB', url:'https://kirolakeitb.eus/eu/', origin:'https://kirolakeitb.eus', kind:'html', base:'sports' },
  { id:'makusi', name:'MAKUSI', url:'https://makusi.eus/', origin:'https://makusi.eus', kind:'makusi', base:'kids' },
  { id:'gaztea', name:'Gaztea', url:'https://www.gaztea.eus/', origin:'https://www.gaztea.eus', kind:'html', base:'audio' },
];

const decode = (s='') => String(s)
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const p=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return p>0&&p<=0x10ffff?String.fromCodePoint(p):''})
  .replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const clean = s => decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();

function safeImage(value, base){
  try {
    const u = new URL(decode(value), base);
    if(u.protocol !== 'https:') return null;
    const allowed = ['cdnstorage.primeran.eus','eitb.scene7.com','s7g10.scene7.com','orain.eus','kirolakeitb.eus','www.eitb.eus','eitb.eus','makusi.eus','www.makusi.eus','gaztea.eus','www.gaztea.eus'];
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
  if(type==='stream') return `Ireki zuzenekoa ${source.name}en`;
  return `Ireki edukia ${source.name}en`;
}
function parseApi(text, source){
  const data = JSON.parse(text);
  if(!Array.isArray(data.children)) throw new Error('Katalogo-formatu ezezaguna');
  const out=[], seen=new Set();
  for(const row of data.children){
    let perRow=0;
    for(const x of row.children||[]){
      if(!x || !['media','series','stream'].includes(x.collection) || !x.slug || !x.title) continue;
      const route = x.collection==='media' ? 'm' : x.collection==='series' ? 's' : 'ch';
      const url = `${source.origin}/${route}/${encodeURIComponent(x.slug)}`;
      if(seen.has(url)) continue;
      if(x.end_date && Date.parse(x.end_date) < Date.now()) continue;
      const images = Array.isArray(x.images) ? x.images : [];
      const preferred = images.find(i=>i.format===1&&i.has_text) || images.find(i=>i.format===1) || images.find(i=>i.format===7) || images[0];
      const image = preferred ? safeImage(preferred.file, source.origin) : null;
      if(!image && x.collection!=='stream') continue;
      seen.add(url);
      out.push({
        id:`${source.id}-${x.collection}-${x.slug}`,
        title:clean(x.title), source:source.name, sourceId:source.id,
        category:x.collection==='stream'?'live':inferCategory(source,row), url, image,
        description:description(source,x.collection), type:x.collection,
        synopsis:clean(x.description||'').slice(0,360)
      });
      if(++perRow >= 16) break;
      if(out.length >= 220) break;
    }
    if(out.length >= 220) break;
  }
  if(!out.length) throw new Error('Katalogoa hutsik');
  return out;
}
function imageFrom(fragment, base){
  const patterns=[
    /<img[^>]+(?:src|data-src|data-cmp-src)=["']([^"']+)["']/i,
    /<source[^>]+srcset=["']([^"'\s,]+)/i,
    /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i
  ];
  for(const re of patterns){
    const v=fragment.match(re)?.[1];
    if(v){const img=safeImage(v,base);if(img)return img;}
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
    const dm=url.pathname.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    const publishedAt=dm?`${dm[1]}-${dm[2]}-${dm[3]}T12:00:00Z`:null;
    out.push({id:`${source.id}-${url.pathname}`,title,source:source.name,sourceId:source.id,category:source.base,url:url.href,image:img,description:source.id==='orain'?'Irakurri ORAINen':source.id==='gaztea'?'Ikusi Gaztean':'Irakurri KIROLAK EITBn',type:'article',publishedAt});
    if(out.length>=40) break;
  }
  if(!out.length) throw new Error('Ez da albisterik aurkitu');
  return out;
}
async function readSource(source, request){
  const origin=new URL(request.url).origin;
  const ttl=Number(source.ttl||TTL);
  const cache=caches.default;
  const key=new Request(`${origin}/garena/__cache/${source.id}`);
  const hit=await cache.match(key);
  if(hit){
    const cached=await hit.json();
    const age=Date.now()-Date.parse(cached.fetchedAt||0);
    if(age < ttl*1000) return {...cached,status:'cache'};
  }
  try{
    const res=await fetch(source.url,{headers:{accept:source.kind==='api'?'application/json':'text/html','user-agent':'GARENA/1.0 (+EITB public directory)'},cf:{cacheTtl:ttl,cacheEverything:true}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const items=source.kind==='api'?parseApi(text,source):source.kind==='makusi'?parseMakusi(text,source):parseHtml(text,source);
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


const SOCIAL_SOURCES = [
  {id:"ig-eitb",platform:"Instagram",user:"eitb",url:"https://www.instagram.com/eitb/",kind:"instagram"},
  {id:"ig-gaztea",platform:"Instagram",user:"gaztea_irratia",url:"https://www.instagram.com/gaztea_irratia/",kind:"instagram"},
  {id:"ig-makusi",platform:"Instagram",user:"makusi_eus",url:"https://www.instagram.com/makusi_eus/",kind:"instagram"},
  {id:"ig-etb-live",platform:"Instagram",user:"etb_zuzenekoak",url:"https://www.instagram.com/etb_zuzenekoak/",kind:"instagram"},
  {id:"ig-euskadi-irratia",platform:"Instagram",user:"euskadi_irratia",url:"https://www.instagram.com/euskadi_irratia/",kind:"instagram"},
  {id:"ig-radio-euskadi",platform:"Instagram",user:"boulevard_radioeuskadi",url:"https://www.instagram.com/boulevard_radioeuskadi/",kind:"instagram"},
  {id:"x-eitb",platform:"X",user:"eitb",url:"https://x.com/eitb",kind:"x"},
  {id:"x-albisteak",platform:"X",user:"eitbalbisteak",url:"https://x.com/eitbalbisteak",kind:"x"},
  {id:"x-kirolak",platform:"X",user:"eitbkirolak",url:"https://x.com/eitbkirolak",kind:"x"},
  {id:"yt-eitb",platform:"YouTube",user:"eitb",url:"https://www.youtube.com/@eitb/videos",kind:"youtube"},
  {id:"yt-makusi",platform:"YouTube",user:"makusi_eus",url:"https://www.youtube.com/@makusi_eus/videos",kind:"youtube"}
];

function socialPostsFromHtml(text, src){
  const out=[], seen=new Set();
  if(src.kind==="instagram"){
    const normalized=String(text||"")
      .replace(/\\u002F/gi,"/")
      .replace(/\\u0026/gi,"&")
      .replace(/\\\//g,"/");
    const candidates=[];
    for(const m of normalized.matchAll(/\/(p|reel)\/([A-Za-z0-9_-]{5,})\/?/g)){
      candidates.push({kind:m[1],code:m[2],idx:m.index||0});
    }
    for(const m of normalized.matchAll(/"shortcode"\s*:\s*"([A-Za-z0-9_-]{5,})"/g)){
      const around=normalized.slice(Math.max(0,(m.index||0)-500),Math.min(normalized.length,(m.index||0)+1800));
      const kind=/"product_type"\s*:\s*"clips"|is_video"\s*:\s*true/i.test(around)?"reel":"p";
      candidates.push({kind,code:m[1],idx:m.index||0});
    }
    for(const c of candidates){
      const key=c.kind+":"+c.code; if(seen.has(key))continue; seen.add(key);
      const around=normalized.slice(Math.max(0,c.idx-1400),Math.min(normalized.length,c.idx+3200));
      const caption=clean(
        around.match(/"(?:caption|accessibility_caption|text)"\s*:\s*"([^"]{6,320})"/i)?.[1]||
        around.match(/"edge_media_to_caption"[\s\S]{0,900}?"text"\s*:\s*"([^"]{6,320})"/i)?.[1]||
        ""
      );
      let image=
        around.match(/"(?:display_url|thumbnail_src)"\s*:\s*"(https:[^"]+)"/i)?.[1]||
        around.match(/"url"\s*:\s*"(https:[^"]+(?:cdninstagram|fbcdn)[^"]*)"/i)?.[1]||
        null;
      if(image)image=image.replace(/\\u0026/g,"&").replace(/\\\//g,"/");
      out.push({
        platform:"Instagram",account:"@"+src.user,
        title:caption||("Instagram · @"+src.user),
        url:"https://www.instagram.com/"+c.kind+"/"+c.code+"/",
        image,type:c.kind==="reel"?"social-video":"social"
      });
      if(out.length>=10)break;
    }
  } else if(src.kind==="x"){
    const re=new RegExp("\\/"+src.user+"\\/status\\/(\\d{8,24})","gi");
    for(const m of text.matchAll(re)){
      const id=m[1]; if(seen.has(id))continue; seen.add(id);
      out.push({platform:"X",account:"@"+src.user,title:"Post · @"+src.user,url:"https://x.com/"+src.user+"/status/"+id,type:"social"});
      if(out.length>=8)break;
    }
  } else if(src.kind==="youtube"){
    for(const m of text.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)){
      const id=m[1]; if(seen.has(id))continue; seen.add(id);
      out.push({platform:"YouTube",account:"@"+src.user,title:"YouTube · @"+src.user,url:"https://www.youtube.com/watch?v="+id,image:"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",videoUrl:"https://www.youtube.com/watch?v="+id,type:"social-video"});
      if(out.length>=10)break;
    }
  }
  return out;
}

async function readSocialSource(src, request){
  const origin=new URL(request.url).origin;
  const cache=caches.default;
  const key=new Request(origin+"/garena/__social/"+src.id);
  const hit=await cache.match(key);
  let cached=null;
  if(hit){
    try{cached=await hit.json()}catch{cached=null}
    if(cached&&Date.now()-Date.parse(cached.fetchedAt||0)<900000)return cached;
  }
  try{
    const res=await fetch(src.url,{
      headers:{
        "accept":"text/html,application/xhtml+xml",
        "accept-language":"eu-ES,es;q=0.9,en;q=0.7",
        "user-agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
      },
      redirect:"follow",
      cf:{cacheTtl:900,cacheEverything:true}
    });
    if(!res.ok)throw new Error("HTTP "+res.status);
    const text=await res.text();
    let items=socialPostsFromHtml(text,src);
    const payload={id:src.id,items,fetchedAt:new Date().toISOString()};
    if(items.length)await cache.put(key,Response.json(payload,{headers:{"cache-control":"public,max-age=86400"}}));
    return items.length?payload:(cached||payload);
  }catch{
    return cached||{id:src.id,items:[],fetchedAt:null};
  }
}

const SOCIAL_FALLBACK_POSTS=[
  {platform:"X",account:"@eitbkirolak",title:"Sarah Pollerosek Lointek Gernika utzi du",url:"https://x.com/eitbkirolak/status/2026754072422891890",type:"social"},
  {platform:"X",account:"@orainnoticias",title:"Un grupo inversor vasco podría estar interesado en la compra de Elmubas Petfood Group",url:"https://x.com/orainnoticias/status/2026744576078156112",type:"social"},
  {platform:"X",account:"@euskaltelebista",title:"Irati Erauskin: Nire belaunaldiko gehiengoak presioa sentitu dugu sexuari dagokionean",url:"https://x.com/euskaltelebista/status/2026734027776966918",type:"social"},
  {platform:"X",account:"@euskadi_irratia",title:"Mikele Landa zinemagilearekin elkarrizketa",url:"https://x.com/euskadi_irratia/status/2026719969178702268",type:"social"},
  {platform:"X",account:"@radioeuskadi",title:"Dani Ezkerro eta euskal gastronomia",url:"https://x.com/radioeuskadi/status/2026734715835687008",type:"social"},
  {platform:"YouTube",account:"@eitb",title:"VS: Homo Bilbainum",url:"https://www.youtube.com/watch?v=Rggplwv0oE4",image:"https://i.ytimg.com/vi/Rggplwv0oE4/hqdefault.jpg",videoUrl:"https://www.youtube.com/watch?v=Rggplwv0oE4",type:"social-video"}
];

export async function handleSocialApi(request){
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method Not Allowed",{status:405,headers:{allow:"GET, HEAD"}});
  const settled=await Promise.allSettled(SOCIAL_SOURCES.map(src=>readSocialSource(src,request)));
  const parts=settled.map(r=>r.status==="fulfilled"?r.value:{items:[]});
  const groups=new Map(), seen=new Set();
  for(const p of parts)for(const x of p.items||[]){
    if(!x||!x.url||seen.has(x.url))continue;
    seen.add(x.url);
    if(!groups.has(x.platform))groups.set(x.platform,[]);
    groups.get(x.platform).push(x);
  }
  const mixed=[];
  let more=true;
  while(more){
    more=false;
    for(const list of groups.values()){
      const x=list.shift();
      if(x){mixed.push(x);more=true}
    }
  }
  const combined=[...mixed];
  for(const x of SOCIAL_FALLBACK_POSTS)if(!combined.some(y=>y.url===x.url))combined.push(x);
  const body={items:combined.slice(0,48),checkedAt:new Date().toISOString()};
  return new Response(request.method==="HEAD"?null:JSON.stringify(body),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
