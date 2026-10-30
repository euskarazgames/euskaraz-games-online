// Browser-level QA: real Chromium on the local Cloudflare Worker.
// Remote artwork may be unavailable, so image/asset failures are documented,
// not silently counted as complete gameplay acceptance.
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=new URL("../",import.meta.url);
const games=JSON.parse(readFileSync(new URL("public/mundu-jolastuak/jokoak.json",root),"utf8"));
const target=process.env.MUNDU_TEST_ORIGIN||"http://127.0.0.1:8787";
const out=fileURLToPath(new URL("reports/browser/",root));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist"]});
const sample=new Set(["skyfarer","clockwork-heist","starlight-train","ink-fox","tidebound","hourglass"]);
const audit=[];
let critical=0;
for(const g of games){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 const failedRequests=[];
 page.on("pageerror",e=>errors.push(String(e.message||e).slice(0,300)));
 page.on("requestfailed",req=>failedRequests.push({url:req.url().slice(0,220),failure:req.failure()?.errorText}));
 let status="ok",frameUrl="",canvas=false,touch=false;
 try{
  await page.goto(target+"/mundu-jolastuak/play.html?joko="+encodeURIComponent(g.slug),{waitUntil:"domcontentloaded",timeout:20000});
  await page.locator("#game").waitFor({timeout:5000});
  // Wait for the iframe navigation to start, not for all remote media to download.
  await page.waitForTimeout(sample.has(g.slug)?1700:600);
  const frame=page.frames().find(f=>f.url().includes("/games/"+g.slug+"/"));
  assert(frame,"The game iframe did not navigate to self-hosted source");
  frameUrl=frame.url();
  try{
    const info=await frame.evaluate(()=>({
      canvas:!!document.querySelector("canvas"),
      touch:document.querySelectorAll("#eg-controls .stick").length===2,
      lang:document.documentElement.lang,
      difficulties:document.querySelectorAll("#eg-difficulty button, #eg-ink-difficulty button").length
    }));
    canvas=info.canvas;touch=info.touch;
    if(["space-mower","ink-fox"].includes(g.slug))assert.equal(info.difficulties,3,g.slug+": three playable difficulties missing");
    assert.equal(info.lang,"eu","Game document lang must be eu");
    assert(touch,"Touch controls should load on coarse pointer browser");
  }catch(e){errors.push("Frame inspection: "+String(e).slice(0,250));status="error"}
  if(sample.has(g.slug)){
    // A stalled GPU capture in headless CI is not a game startup failure.
    try {
      await page.screenshot({path:out+g.slug+".png",fullPage:false,animations:"allow",timeout:6500});
    } catch(err) {
      errors.push("Screenshot unavailable: "+String(err).slice(0,130));
    }
  }
 }catch(e){status="error";errors.push(String(e).slice(0,350))}
 if(errors.some(x=>/CORS|MIME type|failed to fetch dynamically imported module/i.test(x)))status="error";
 if(status==="error")critical++;
 audit.push({slug:g.slug,status,frameUrl,canvas,touch,errors,failedRequests:failedRequests.slice(0,15)});
 await page.close();
}
await browser.close();
const summary={checked:audit.length,totalGames:games.length,critical,screenCaptures:[...sample],games:audit,
  caveat:"Code/frame loading is not complete gameplay validation; external art, audio and 3D assets may remain missing."};
writeFileSync(out+"qa.json",JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify({checked:audit.length,totalGames:games.length,critical,screenshots:[...sample],faults:audit.filter(x=>x.status!=="ok").slice(0,15)},null,2));
if(critical)process.exitCode=1;
