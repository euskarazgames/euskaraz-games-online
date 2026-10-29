// Local HTTP smoke checks for Cloudflare Workers game asset handling.
// This tests real responses; the source-file audit alone cannot detect CORS or redirect loops.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root = new URL("../",import.meta.url);
const games=JSON.parse(readFileSync(new URL("public/mundu-jolastuak/jokoak.json",root),"utf8"));
const origin=process.env.MUNDU_TEST_ORIGIN||"http://127.0.0.1:8787";
const errors=[];
async function testGame(game){
 const url=origin+"/mundu-jolastuak/games/"+encodeURIComponent(game.slug)+"/index.html";
 try{
  const response=await fetch(url,{headers:{Origin:"null"},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,game.slug+": HTTP "+response.status+" "+response.url);
  assert.equal(response.headers.get("access-control-allow-origin"),"*",game.slug+": iframe module CORS missing");
  const body=await response.text();
  assert(body.includes("euskara.js"),game.slug+": i18n missing");
  assert(body.includes("touch-controls.js"),game.slug+": touch script not injected");
  assert(body.includes("<title>"),game.slug+": missing title");
  // Cloudflare must never redirect from directory URL back to index.html.
  const folder=await fetch(origin+"/mundu-jolastuak/games/"+game.slug+"/",{signal:AbortSignal.timeout(20000)});
  assert.equal(folder.status,200,game.slug+": directory route failure");
 }catch(error){errors.push({game:game.slug,error:String(error)})}
}
for(let i=0;i<games.length;i+=5)await Promise.all(games.slice(i,i+5).map(testGame));
for(const path of ["clockwork-heist/src/main.js","starlight-train/src/main.js","hourglass/game.js"]){
 try{
  const res=await fetch(origin+"/mundu-jolastuak/games/"+path,{headers:{Origin:"null"},signal:AbortSignal.timeout(20000)});
  assert.equal(res.status,200,path+" file missing");
  assert.equal(res.headers.get("access-control-allow-origin"),"*",path+" CORS missing");
  assert.match(res.headers.get("content-type")||"",/javascript|text\/plain/i,path+" MIME");
 }catch(error){errors.push({game:path,error:String(error)})}
}
const result={total:games.length,passed:games.length-errors.filter(x=>!x.game.includes("/")).length,errors};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
