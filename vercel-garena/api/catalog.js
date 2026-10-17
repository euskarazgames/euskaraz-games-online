const SOURCES = [
  { id:'primeran', name:'PRIMERAN', url:'https://primeran.eus/api/v1/home', origin:'https://primeran.eus', kind:'api', base:'series' },
  { id:'primeran-docs', name:'PRIMERAN · Dokumentalak', url:'https://primeran.eus/api/v1/pages/dokumentalak-p', origin:'https://primeran.eus', kind:'api', base:'docs' },
  { id:'etbon', name:'ETB ON', url:'https://etbon.eus/api/v1/home', origin:'https://etbon.eus', kind:'api', base:'entertainment' },
  { id:'guau', name:'GUAU', url:'https://guau.eus/api/v1/home', origin:'https://guau.eus', kind:'api', base:'audio' },
  { id:'orain', name:'ORAIN', url:'https://orain.eus/eu/', origin:'https://orain.eus', kind:'html', base:'news' },
  { id:'kirolak', name:'KIROLAK EITB', url:'https://kirolakeitb.eus/eu/', origin:'https://kirolakeitb.eus', kind:'html', base:'sports' },
  { id:'makusi', name:'MAKUSI', url:'https://makusi.eus/', origin:'https://makusi.eus', kind:'makusi', base:'kids' },
  { id:'gaztea', name:'Gaztea', url:'https://www.gaztea.eus/', origin:'https://www.gaztea.eus', kind:'html', base:'audio' }
];

const decode=(s='')=>String(s)
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const p=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return p>0&&p<=0x10ffff?String.fromCodePoint(p):''})
  .replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const clean=s=>decode(String(s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();

function safeImage(value,base){
  try{
    const u=new URL(decode(value),base);
    if(u.protocol!=='https:')return null;
    const allowed=['cdnstorage.primeran.eus','eitb.scene7.com','s7g10.scene7.com','orain.eus','kirolakeitb.eus','www.eitb.eus','eitb.eus','makusi.eus','www.makusi.eus','gaztea.eus','www.gaztea.eus'];
    return allowed.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null;
  }catch{return null}
}
function inferCategory(source,row={}){
  if(source.id==='primeran-docs')return 'docs';
  if(source.id==='guau')return 'audio';
  const t=(String(row.name||'')+' '+String(row.h1||'')+' '+String(row.title||'')).toLowerCase();
  if(/dokument|document/.test(t))return 'docs';
  if(/kirol|deport|futbol|pilota|saski/.test(t))return 'sports';
  if(/albiste|inform|aktual|berri/.test(t))return 'news';
  if(/entreteni|saio|program|umore|lehiaketa|show/.test(t))return 'entertainment';
  return source.base;
}
function description(source,type){
  if(source.id==='guau')return 'Entzun GUAUn';
  if(source.id==='primeran-docs')return 'Ikusi dokumentala PRIMERANen';
  if(type==='series')return 'Ikusi atalak '+source.name+'en';
  if(type==='stream')return 'Ireki zuzenekoa '+source.name+'en';
  return 'Ireki edukia '+source.name+'en';
}
function parseApi(text,source){
  const data=JSON.parse(text);
  if(!Array.isArray(data.children))throw new Error('bad format');
  const out=[],seen=new Set();
  for(const row of data.children){
    let perRow=0;
    for(const x of row.children||[]){
      if(!x||!['media','series','stream'].includes(x.collection)||!x.slug||!x.title)continue;
      const route=x.collection==='media'?'m':x.collection==='series'?'s':'ch';
      const url=source.origin+'/'+route+'/'+encodeURIComponent(x.slug);
      if(seen.has(url))continue;
      if(x.end_date&&Date.parse(x.end_date)<Date.now())continue;
      const images=Array.isArray(x.images)?x.images:[];
      const preferred=images.find(i=>i.format===1&&i.has_text)||images.find(i=>i.format===1)||images.find(i=>i.format===7)||images[0];
      const image=preferred?safeImage(preferred.file,source.origin):null;
      if(!image&&x.collection!=='stream')continue;
      seen.add(url);
      out.push({
        id:source.id+'-'+x.collection+'-'+x.slug,
        title:clean(x.title),source:source.name,sourceId:source.id,
        category:x.collection==='stream'?'live':inferCategory(source,row),
        url,image,description:description(source,x.collection),type:x.collection,
        synopsis:clean(x.description||'').slice(0,360)
      });
      if(++perRow>=16)break;
      if(out.length>=220)break;
    }
    if(out.length>=220)break;
  }
  return out;
}
function imageFrom(fragment,base){
  const patterns=[
    /<img[^>]+(?:src|data-src|data-cmp-src)=["']([^"']+)["']/i,
    /<source[^>]+srcset=["']([^"'\s,]+)/i,
    /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i
  ];
  for(const re of patterns){
    const v=fragment.match(re)?.[1];
    if(v){const img=safeImage(v,base);if(img)return img}
  }
  return null;
}
function titleFromSlug(path){
  const slug=decodeURIComponent(path.split('/').filter(Boolean).pop()||'');
  return slug.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim();
}
function parseMakusi(html,source){
  const out=[],seen=new Set();
  const re=/<a\b([^>]*\bhref=["']([^"']*\/ikusi\/(?:s|m)\/[^"'?#]+)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    let url; try{url=new URL(decode(m[2]),source.origin)}catch{continue}
    if(!/^\/ikusi\/(?:s|m)\//.test(url.pathname)||seen.has(url.href))continue;
    const attrs=m[1],body=m[3];
    let title=attrs.match(/aria-label=["']([^"']+)/i)?.[1]
      ||body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]
      ||body.match(/<img[^>]+alt=["']([^"']+)/i)?.[1]
      ||clean(body);
    title=clean(title);
    if(!title||title.length<2||/^image|loading$/i.test(title))title=titleFromSlug(url.pathname);
    const around=html.slice(Math.max(0,(m.index||0)-900),Math.min(html.length,(m.index||0)+m[0].length+900));
    const image=imageFrom(body,source.origin)||imageFrom(around,source.origin);
    const type=url.pathname.includes('/ikusi/m/')?'media':'series';
    seen.add(url.href);
    out.push({id:'makusi-'+type+'-'+url.pathname.split('/').pop(),title,source:'MAKUSI',sourceId:'makusi',category:'kids',url:url.href,image,description:'Ikusi MAKUSIn',type,synopsis:''});
    if(out.length>=120)break;
  }
  return out;
}
function parseHtml(html,source){
  const out=[],seen=new Set();
  const re=/<a\b([^>]*\bhref=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    let url; try{url=new URL(decode(m[2]),source.origin)}catch{continue}
    if(url.protocol!=='https:'||url.hostname!==new URL(source.origin).hostname)continue;
    if(!/\/20\d{2}\/\d{2}\/\d{2}\//.test(url.pathname)||seen.has(url.href))continue;
    const attrs=m[1],body=m[3];
    let title=attrs.match(/aria-label=["']([^"']+)/i)?.[1]||body.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    title=clean(title).replace(/^Ikusi albistearen xehetasunak:\s*/i,'');
    if(!title||title.length<6)continue;
    let img=body.match(/<img[^>]*\bsrc=["']([^"']+)/i)?.[1]||body.match(/data-cmp-src=["']([^"']+)/i)?.[1];
    img=img?safeImage(img,source.origin):null;
    seen.add(url.href);
    const dm=url.pathname.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    const publishedAt=dm?dm[1]+'-'+dm[2]+'-'+dm[3]+'T12:00:00Z':null;
    out.push({
      id:source.id+'-'+url.pathname,title,source:source.name,sourceId:source.id,category:source.base,
      url:url.href,image:img,
      description:source.id==='orain'?'Irakurri ORAINen':source.id==='gaztea'?'Ikusi Gaztean':'Irakurri KIROLAK EITBn',
      type:'article',publishedAt
    });
    if(out.length>=40)break;
  }
  return out;
}
async function readSource(source){
  try{
    const r=await fetch(source.url,{
      headers:{
        accept:source.kind==='api'?'application/json':'text/html',
        'accept-language':'eu-ES,es;q=0.9,en;q=0.7',
        'user-agent':'Mozilla/5.0 GARENA/2.0'
      },
      redirect:'follow'
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    const text=await r.text();
    const items=source.kind==='api'?parseApi(text,source):source.kind==='makusi'?parseMakusi(text,source):parseHtml(text,source);
    return {id:source.id,name:source.name,items,fetchedAt:new Date().toISOString(),status:'ok'};
  }catch(e){
    return {id:source.id,name:source.name,items:[],fetchedAt:null,status:'unavailable'};
  }
}
function merge(parts){
  const out=[],seen=new Set(),lists=parts.map(p=>p.items||[]);
  const max=Math.max(0,...lists.map(x=>x.length));
  for(let i=0;i<max;i++)for(const list of lists){
    const x=list[i];
    if(x&&!seen.has(x.url)){seen.add(x.url);out.push(x)}
  }
  return out.slice(0,900);
}
module.exports=async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end('Method Not Allowed');
  }
  const parts=await Promise.all(SOURCES.map(readSource));
  const body={items:merge(parts),sources:parts.map(p=>({id:p.id,name:p.name,fetchedAt:p.fetchedAt,status:p.status,count:p.items.length})),checkedAt:new Date().toISOString(),contentRefreshMinutes:15};
  res.statusCode=200;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=300');
  if(req.method==='HEAD')return res.end();
  res.end(JSON.stringify(body));
};