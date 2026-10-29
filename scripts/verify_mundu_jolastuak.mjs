// CI de Mundu Jolastuak: valida el archivado de 31 juegos, sin suponer que su media esté archivada.
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync} from "node:fs";
import {resolve, dirname, join} from "node:path";
const root=resolve(import.meta.dirname,"..");
const read=p=>readFileSync(join(root,p),"utf8");
const games=JSON.parse(read("public/mundu-jolastuak/jokoak.json"));
assert.equal(games.length,31,"31 joko espero ziren");
const slugs=new Set();
const allAssets=new Set();
for(const g of games){
 assert.match(g.slug,/^[a-z][a-z0-9-]+$/);
 assert(!slugs.has(g.slug),"Joko bikoiztua: "+g.slug);slugs.add(g.slug);
 const dir="public/mundu-jolastuak/games/"+g.slug;
 assert(existsSync(join(root,dir,"index.html")),"Kodea falta da: "+g.slug);
 const html=read(dir+"/index.html");
 assert(/<html[^>]*lang=["']eu["']/i.test(html),"Euskarazko hizkuntza etiketa falta da: "+g.slug);
 assert(html.includes("/mundu-jolastuak/euskara.js"),"Euskaratzeko scriptik ez: "+g.slug);
 assert(html.length>2000,"Jokoaren HTML laburregia: "+g.slug);
 const files=[];
 function recurse(folder){
   for(const f of readdirSync(join(root,folder),{withFileTypes:true})){
     const path=folder+"/"+f.name;
     if(f.isDirectory())recurse(path);
     else if(/\.(html|js)$/.test(f.name))files.push(path);
   }
 }
 recurse(dir);
 for(const file of files){
   const txt=read(file);
   for(const match of txt.matchAll(/(?:["'`])((?:\.\/)?assets\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpg|jpeg|gif|svg|glb|gltf|mp3|ogg|wav|woff2?))(?:["'`])/g)){
      const asset=match[1].replace(/^\.\//,"");
      if(!existsSync(join(root,dir,asset)))allAssets.add(g.slug+"/"+asset);
   }
   for(const match of txt.matchAll(/(?:import\s*(?:[^;"']*?from\s*)?|import\s*\()\s*["'](\.{1,2}\/[^"']+\.js)["']/g)){
      const rel=match[1],local=resolve(dirname(join(root,file)),rel);
      if(!rel.startsWith("../brand/"))assert(existsSync(local),"Módulo no encontrado: "+file+" -> "+rel);
   }
 }
}
// Euskaraz Games 2.0: optional progression is actual playable Basque content.
const extraScript=read("public/eg-erronkak.js");
const challengeLine=extraScript.match(/const challenges=(\[[^\n]+\]);/);
assert(challengeLine,"Challenge data missing");
const challengeData=JSON.parse(challengeLine[1]);
assert.equal(challengeData.length,36,"31 + 5 games must have supplemental quests");
assert.equal(new Set(challengeData.map(x=>x.id)).size,36,"Challenge game ID duplicated");
for(const game of games)assert(challengeData.some(x=>x.id==="mj:"+game.slug),"Missing new game challenge: "+game.slug);
for(const id of ["kc:pilota","kc:zesta","kc:artzain","bs:basoa","bs:itsas"])assert(challengeData.some(x=>x.id===id),"Missing classic challenge "+id);
const portal=read("public/index.html");
assert(!portal.includes('class="symbol"'),"Text-only logo required");
assert(portal.includes('/eg-erronkak.js'),"Supplementary challenge script not loaded");
const spaceGame=read("public/mundu-jolastuak/games/space-mower/index.html");
assert(spaceGame.includes("EG_DIFFICULTY")&&spaceGame.includes("eg-difficulty"),"Space Mower expanded gameplay missing");
const foxGame=read("public/mundu-jolastuak/games/ink-fox/index.html");
assert(foxGame.includes("EG_MODE")&&foxGame.includes("eg-ink-difficulty"),"Ink Fox expanded gameplay missing");

const script=read("src/mundu-jolastuak.js");
const worker=read("src/worker.js");
const config=read("wrangler.jsonc");
const viewer=read("public/mundu-jolastuak/play.html");
assert(script.includes("handleLocalGame")&&script.includes("SLUG_TO_UPSTREAM"),"Local game handler missing");
assert(worker.includes("handleLocalGame(request,env)"),"Worker local route missing");
assert(config.includes("/mundu-jolastuak/games/*"),"Wrangler games route missing");
assert(viewer.includes('frame.src="./games/"'),"Viewer must load local game source");
assert(read("public/mundu-jolastuak/LICENSE-original-MIT.txt").includes("MIT License"),"Original MIT license missing");
const report={checkedGames:games.length,sourceModules:26,missingAssetExamples:[...allAssets].sort(),limits:["Los medios no se distribuyen en GitHub original","El código puede seguir recurriendo a CDN y assets de demo","La traducción del juego no es completa"]};
mkdirSync(join(root,"reports"),{recursive:true});
writeFileSync(join(root,"reports/mundu-jolastuak-auditoria.json"),JSON.stringify(report,null,2)+"\n");
console.log("EUSKARAZ GAMES: "+games.length+" HTML eta 26 JavaScript modulu egiaztatuta");
console.log("Kanpo-baliabideen erreferentziak (gutxienez): "+allAssets.size);
