const FALLBACK = [
  {platform:"YouTube",account:"@eitb",title:"VS: Homo Bilbainum",url:"https://www.youtube.com/watch?v=Rggplwv0oE4",image:"https://i.ytimg.com/vi/Rggplwv0oE4/hqdefault.jpg",category:"youtube",videoUrl:"https://www.youtube.com/watch?v=Rggplwv0oE4"},
  {platform:"X",account:"@eitbkirolak",title:"Sarah Pollerosek Lointek Gernika utzi du",url:"https://x.com/eitbkirolak/status/2026754072422891890",category:"sports"},
  {platform:"X",account:"@orainnoticias",title:"Un grupo inversor vasco podría estar interesado en la compra de Elmubas Petfood Group",url:"https://x.com/orainnoticias/status/2026744576078156112",category:"news"},
  {platform:"X",account:"@euskaltelebista",title:"Irati Erauskin: Nire belaunaldiko gehiengoak presioa sentitu dugu sexuari dagokionean",url:"https://x.com/euskaltelebista/status/2026734027776966918",category:"news"},
  {platform:"X",account:"@euskadi_irratia",title:"Mikele Landa zinemagilearekin elkarrizketa",url:"https://x.com/euskadi_irratia/status/2026719969178702268",category:"news"},
  {platform:"X",account:"@radioeuskadi",title:"Dani Ezkerro eta euskal gastronomia",url:"https://x.com/radioeuskadi/status/2026734715835687008",category:"news"}
];

function clean(s){
  return String(s||"")
    .replace(/\\u0026/g,"&")
    .replace(/\\u003c/gi,"<")
    .replace(/\\u003e/gi,">")
    .replace(/\\\"/g,'"')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&amp;/g,"&")
    .replace(/&nbsp;/g," ")
    .replace(/<[^>]*>/g," ")
    .replace(/\s+/g," ")
    .trim();
}
async function getText(url){
  const r=await fetch(url,{
    headers:{
      "accept":"text/html,application/xhtml+xml",
      "accept-language":"eu-ES,es;q=0.9,en;q=0.7",
      "user-agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
    },
    redirect:"follow"
  });
  if(!r.ok)throw new Error("HTTP "+r.status);
  return r.text();
}
function parseYoutube(html){
  const out=[],seen=new Set();
  for(const m of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)){
    const id=m[1]; if(seen.has(id))continue; seen.add(id);
    const at=m.index||0;
    const around=html.slice(Math.max(0,at-1600),Math.min(html.length,at+3600));
    let title=
      around.match(/"title":\{"runs":\[\{"text":"([^"]{2,220})"/)?.[1]||
      around.match(/"title":\{"simpleText":"([^"]{2,220})"/)?.[1]||
      "ZEITB · YouTube";
    title=clean(title);
    out.push({
      platform:"YouTube",account:"@eitb",title,
      url:"https://www.youtube.com/watch?v="+id,
      image:"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",
      videoUrl:"https://www.youtube.com/watch?v="+id,
      category:"youtube"
    });
    if(out.length>=18)break;
  }
  return out;
}
function parseOrain(html){
  const out=[],seen=new Set();
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,1000}?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    let href=clean(m[1]);
    if(href.startsWith("/"))href="https://orain.eus"+href;
    if(!/^https:\/\/orain\.eus\/eu\//i.test(href))continue;
    if(!/\/20\d{2}\/\d{2}\/\d{2}\//.test(href))continue;
    if(seen.has(href))continue;
    let title=clean(m[2]);
    if(title.length<18||title.length>240)continue;
    seen.add(href);
    const dm=href.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
    out.push({
      platform:"ORAIN",account:"ORAIN",title,url:href,category:"news",
      publishedAt:dm?dm[1]+"-"+dm[2]+"-"+dm[3]:null
    });
    if(out.length>=24)break;
  }
  return out;
}
function unique(items){
  const seen=new Set();
  return items.filter(x=>x&&x.url&&x.title&&!seen.has(x.url)&&(seen.add(x.url),true));
}
module.exports=async function handler(req,res){
  if(req.method!=="GET"){
    res.statusCode=405; res.setHeader("Allow","GET"); return res.end("Method Not Allowed");
  }
  const [yt,orain]=await Promise.allSettled([
    getText("https://www.youtube.com/@eitb/videos"),
    getText("https://orain.eus/eu/azken-berriak/")
  ]);
  const youtube=yt.status==="fulfilled"?parseYoutube(yt.value):[];
  const news=orain.status==="fulfilled"?parseOrain(orain.value):[];
  const merged=unique([...youtube.slice(0,14),...news.slice(0,18),...FALLBACK]);
  const body=JSON.stringify({items:merged,checkedAt:new Date().toISOString()});
  res.statusCode=200;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=60");
  res.end(body);
};