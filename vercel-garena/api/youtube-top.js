const CHANNELS=["https://www.youtube.com/@eitb/videos?view=0&sort=p","https://www.youtube.com/@eitb/videos?sort=p"];
function decode(s){return String(s||"").replace(/\\u0026/g,"&").replace(/\\u003c/g,"<").replace(/\\u003e/g,">").replace(/\\\"/g,'"').replace(/&amp;/g,"&").replace(/&#39;/g,"'")}
function views(text){
  const s=decode(text).replace(/\u00a0/g," ").toLowerCase();
  const m=s.match(/([\d.,]+)\s*(mil|millones|m|k|million|billion)?\s*(?:visualizaciones|vistas|views|ikustaldi|ikustaldiak)/i);
  if(!m)return null;
  const n=Number(m[1].replace(/\./g,"").replace(",","."));
  if(!Number.isFinite(n))return null;
  return Math.round(n*(m[2]==="mil"||m[2]==="k"?1000:m[2]==="m"||m[2]==="millones"||m[2]==="million"?1000000:m[2]==="billion"?1000000000:1));
}
function objects(html){
  const out=[];let pos=0;
  while((pos=html.indexOf('"videoRenderer":',pos))>=0&&out.length<200){
    const start=html.indexOf("{",pos+16);if(start<0)break;
    let depth=0,inStr=false,escape=false,end=-1;
    for(let i=start;i<Math.min(html.length,start+18000);i++){
      const c=html[i];
      if(inStr){if(escape)escape=false;else if(c==="\\")escape=true;else if(c==='"')inStr=false;continue}
      if(c==='"'){inStr=true;continue}
      if(c==="{")depth++;else if(c==="}"&&!--depth){end=i+1;break}
    }
    pos=end>0?end:pos+16;
    if(end<0)continue;
    try{out.push(JSON.parse(html.slice(start,end)))}catch{}
  }
  return out;
}
function parse(html){
  const seen=new Set(),out=[];
  for(const x of objects(html)){
    const id=x.videoId;if(!/^[\w-]{11}$/.test(id||"")||seen.has(id))continue;
    const title=decode(x.title?.runs?.map(r=>r.text).join("")||x.title?.simpleText||"");
    const raw=x.viewCountText?.simpleText||x.viewCountText?.runs?.map(r=>r.text).join("")||x.shortViewCountText?.simpleText||"";
    const count=views(raw);
    if(!title||count===null)continue;
    seen.add(id);
    out.push({id,title,views:count,viewsLabel:raw,url:"https://www.youtube.com/watch?v="+id,image:"https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",channel:"EITB"});
  }
  return out.sort((a,b)=>b.views-a.views).slice(0,50).map((v,i)=>({...v,rank:i+1}));
}
module.exports=async(req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","public,s-maxage=1800,stale-while-revalidate=600");
  if(req.method!=="GET"){res.statusCode=405;return res.end(JSON.stringify({error:"method"}))}
  for(const url of CHANNELS){
    try{
      const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; GARENA/1.0)","accept-language":"es-ES,es;q=0.9,en;q=0.8"}});
      if(!r.ok)continue;
      const result=parse(await r.text());
      if(result.length)return res.end(JSON.stringify({items:result,source:"YouTube EITB · más populares",updatedAt:new Date().toISOString(),complete:result.length===50}));
    }catch{}
  }
  res.end(JSON.stringify({items:[],source:"YouTube EITB",unavailable:true,complete:false}));
};
