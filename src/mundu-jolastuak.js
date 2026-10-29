// Euskaraz Games · Mundu Jolastuak — safe, allowlisted proxy
// Original games: © 2026 Lovis Odin — MIT, https://github.com/lovisdotio/video-to-game
const ROUTES = {
  "O2_3D_SKYFARER": "skyfarer",
  "H01_TIDEBOUND_coop2": "tidebound",
  "S30_STORM-SURFER": "storm-surfer",
  "D01_SKYHOOK-RESCUE_coop2": "skyhook-rescue",
  "B06_PAPER-DRAGON": "paper-dragon",
  "B10_BUBBLE-BALLOON": "bubble-balloon",
  "S16_KITE-RIDER": "kite-rider",
  "B08_AURORA-SKIFF": "aurora-skiff",
  "B03_GLASS-GREENHOUSE": "glass-greenhouse",
  "A14_BELL-TOWER": "bell-tower",
  "A07_FOG-SHEPHERD": "fog-shepherd",
  "A02_PAPER-MOON-STAIRS": "paper-moon-stairs",
  "A09_WHALE-SONG": "whale-song",
  "A06_SKY-LIBRARY": "sky-library",
  "A01_KINTSUGI-MOUNTAIN": "kintsugi-mountain",
  "S28_SPACE-MOWER": "space-mower",
  "A13_EMBER-PATH": "ember-path",
  "H02_CLOCKWORK-HEIST_4p": "clockwork-heist",
  "B04_STARLIGHT-TRAIN": "starlight-train",
  "S11_DUNE-SURFER": "dune-surfer",
  "A10_AUTUMN-WIND": "autumn-wind",
  "A03_STAINED-GLASS": "stained-glass",
  "S12_DEEP-LIGHTS": "deep-lights",
  "A12_SNOW-GLOBE": "snow-globe",
  "A15_SUNFLOWER-SILHOUETTE": "sunflower-silhouette",
  "A05_RUST-BLOOM": "rust-bloom",
  "S08_INK-FOX": "ink-fox",
  "A04_MIRROR-SEA": "mirror-sea",
  "S17_CLOUD-SHEPHERD": "cloud-shepherd",
  "S22_TRAIN-PAINTER": "train-painter",
  "A08_HOURGLASS": "hourglass"
};
const GAME_IDS = new Set(Object.keys(ROUTES));
const SOURCE_ORIGIN = "https://fal-video-to-game.vercel.app";
const PREFIX = "/mundu-jolastuak/original/";
class EuskaraHead {
  element(el) { el.append('<script defer src="/mundu-jolastuak/euskara.js"></script>', { html: true }); }
}
class EuskaraLang {
  element(el) { el.setAttribute("lang", "eu"); }
}
export async function handleMunduProxy(request) {
  const incoming = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response("Method Not Allowed", {status:405,headers:{allow:"GET, HEAD"}});
  if (!incoming.pathname.startsWith(PREFIX)) return new Response("Not Found", {status:404});
  const suffix = incoming.pathname.slice(PREFIX.length);
  const first = suffix.split("/")[0];
  if (!GAME_IDS.has(first) && first !== "brand") return new Response("Not Found", {status:404});
  if (!suffix || /(?:^|\/)\.\.(?:\/|$)|%2f|%5c/i.test(suffix))
    return new Response("Bad path", {status:400});
  // Only a pinned public host; never proxy arbitrary URLs or hosts.
  const target = new URL("/" + suffix + incoming.search, SOURCE_ORIGIN);
  const range = request.headers.get("Range");
  const headers = new Headers({Accept:request.headers.get("Accept") || "*/*"});
  if (range) headers.set("Range",range);
  let remote;
  try {
    remote = await fetch(target.toString(), {method:request.method,headers,redirect:"follow"});
  } catch {
    return new Response("Jatorrizko zerbitzua ez dago erabilgarri.",{status:502});
  }
  const responseHeaders = new Headers(remote.headers);
  for (const key of ["set-cookie","content-security-policy","x-frame-options","content-length","content-encoding","access-control-allow-origin"]) responseHeaders.delete(key);
  responseHeaders.set("access-control-allow-origin","*");
  responseHeaders.set("cross-origin-resource-policy","cross-origin");
  responseHeaders.set("x-content-type-options","nosniff");
  responseHeaders.set("cache-control", remote.ok ? "public, max-age=300" : "no-store");
  const response = new Response(request.method==="HEAD" ? null : remote.body,
    {status:remote.status,statusText:remote.statusText,headers:responseHeaders});
  const ctype = responseHeaders.get("content-type") || "";
  if (request.method === "GET" && remote.ok && /text\/html/i.test(ctype))
    return new HTMLRewriter().on("html",new EuskaraLang()).on("head",new EuskaraHead()).transform(response);
  return response;
}

class HomeEntry {
  element(el) {
    el.append('<a href="/mundu-jolastuak/" aria-label="Mundu Jolastuak: 31 joko berri" style="position:fixed;left:16px;bottom:17px;z-index:99999;display:inline-flex;align-items:center;gap:7px;border:1px solid #f5a768;background:#211b1d;color:#ffab67;padding:10px 15px;border-radius:99px;box-shadow:0 8px 30px #0008;font:800 12px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.045em;text-decoration:none">🎮 MUNDU JOLASTUAK · 31 JOKO</a>',{html:true});
  }
}
export function addMunduLink(response) {
  if (!response.ok || !/text\/html/i.test(response.headers.get("content-type") || "")) return response;
  return new HTMLRewriter().on("body",new HomeEntry()).transform(response);
}


// Serve archived source files locally. Original artwork is NOT in the upstream
// GitHub tree; missing assets are requested temporarily from the public demo.
// No arbitrary remote host or traversal path can be selected by the visitor.
const LOCAL_GAMES_PREFIX = "/mundu-jolastuak/games/";
const SLUG_TO_UPSTREAM = Object.fromEntries(Object.entries(ROUTES).map(([id, slug])=>[slug,id]));
export async function handleLocalGame(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed",{status:405});
  const incoming = new URL(request.url);
  if (/%2f|%5c|%00/i.test(incoming.pathname)) return new Response("Bad path",{status:400});
  const tail = incoming.pathname.slice(LOCAL_GAMES_PREFIX.length);
  const parts = tail.split("/");
  const slug = parts.shift();
  const up = SLUG_TO_UPSTREAM[slug];
  // A few games load the original shared controller script via ../brand/.
  if (slug === "brand") {
    const relative = parts.join("/");
    if (!relative || !/^[a-z0-9_/.-]+$/i.test(relative) || relative.includes("..")) return new Response("Not Found",{status:404});
    const target = new URL("/mundu-jolastuak/original/brand/" + relative + incoming.search, incoming.origin);
    return handleMunduProxy(new Request(target,request));
  }
  if (!up) return new Response("Jokoa ez da aurkitu",{status:404});
  if (parts.length === 1 && parts[0] === "") {
    const target = new URL(incoming);
    target.pathname += "index.html";
    return Response.redirect(target.toString(),302);
  }
  // Worker checks real GitHub-archived HTML/JS assets before using fallback.
  const local = await env.ASSETS.fetch(request);
  if (local.ok) return local;
  const relative = parts.join("/");
  if (!relative.startsWith("assets/") || relative.includes("..") || /%2f|%5c/i.test(relative)) return local;
  const upstream = new URL("/mundu-jolastuak/original/" + up + "/" + relative + incoming.search, incoming.origin);
  return handleMunduProxy(new Request(upstream,request));
}
