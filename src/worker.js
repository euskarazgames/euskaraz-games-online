import { handleAtariaApi } from "./ataria.js";
import { DurableObject } from "cloudflare:workers";

function validRoom(v) {
  return typeof v === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(v);
}
function validSide(v) {
  return v === "host" || v === "guest";
}
function validGame(v) {
  return v === "pilota" || v === "zesta" || v === "artzain";
}
function safeName(v) {
  return String(v || "").replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 24) || "JOKALARIA";
}
function sendJson(ws, obj) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ataria/api/catalog" || url.pathname === "/garena/api/catalog") {
      return handleAtariaApi(request);
    }

    if (["/ataria/api/click","/ataria/api/ranking","/garena/api/click","/garena/api/ranking"].includes(url.pathname)) {
      const stub = env.ATARIA_STATS.getByName("global");
      const target = new URL(request.url);
      target.hostname = "ataria-stats";
      target.pathname = target.pathname.replace(/^\/garena\//,"/ataria/");
      return stub.fetch(new Request(target, request));
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "euskaraz-games-ws", ts: Date.now() }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/ws") {
      if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
        return new Response("WebSocket upgrade required", { status: 426 });
      }

      const room = url.searchParams.get("room") || "";
      const side = url.searchParams.get("side") || "";
      const game = url.searchParams.get("game") || "";

      if (!validRoom(room) || !validSide(side) || !validGame(game)) {
        return new Response("Bad room parameters", { status: 400 });
      }

      const stub = env.GAME_ROOM.getByName(room);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  sockets() {
    return this.ctx.getWebSockets().map(ws => ({
      ws,
      a: ws.deserializeAttachment() || {}
    }));
  }

  notifyPairState() {
    const list = this.sockets();
    const host = list.find(x => x.a.side === "host");
    const guest = list.find(x => x.a.side === "guest");

    if (host && guest && host.a.game === guest.a.game) {
      sendJson(host.ws, { sys: "paired", peerName: guest.a.name, game: host.a.game });
      sendJson(guest.ws, { sys: "paired", peerName: host.a.name, game: guest.a.game });
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const side = url.searchParams.get("side");
    const game = url.searchParams.get("game");
    const name = safeName(url.searchParams.get("name"));

    const current = this.sockets();

    // A room is locked to one game.
    const existingGame = current.find(x => x.a.game)?.a.game;
    if (existingGame && existingGame !== game) {
      return new Response("Room belongs to another game", { status: 409 });
    }

    // Reconnect: replace the old socket for the same side.
    for (const x of current) {
      if (x.a.side === side) {
        try { x.ws.close(4001, "replaced"); } catch {}
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      side,
      game,
      name,
      joinedAt: Date.now()
    });

    sendJson(server, { sys: "ready", side, game });
    this.notifyPairState();

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    const me = ws.deserializeAttachment() || {};

    if (typeof message === "string") {
      // Small control messages handled at the room server.
      if (message.length < 256 && message.includes('"sys":"ping"')) {
        try {
          const p = JSON.parse(message);
          if (p?.sys === "ping") {
            sendJson(ws, { sys: "pong", t: p.t || 0, server: Date.now() });
            return;
          }
        } catch {}
      }
      if (message.length > 256 * 1024) {
        try { ws.close(1009, "message too large"); } catch {}
        return;
      }
    }

    // Fast relay to the opposite player only.
    for (const x of this.sockets()) {
      if (x.ws === ws) continue;
      if (x.a.side === me.side) continue;
      if (x.a.game !== me.game) continue;
      try {
        if (x.ws.readyState === 1) x.ws.send(message);
      } catch {}
    }
  }

  webSocketClose(ws, code, reason) {
    if (code === 4001) return; // transparent reconnect replacement
    const me = ws.deserializeAttachment() || {};
    for (const x of this.sockets()) {
      if (x.ws === ws || x.a.side === me.side || x.a.game !== me.game) continue;
      sendJson(x.ws, { sys: "peer_left", side: me.side, reason: String(reason || "") });
    }
  }

  webSocketError(ws) {
    try { ws.close(1011, "websocket error"); } catch {}
  }
}

export class AtariaStats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/ataria/api/click") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      let body;
      try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

      const itemUrl = String(body?.url || "").slice(0, 1200);
      const title = String(body?.title || "").slice(0, 180);
      const category = String(body?.category || "").slice(0, 40);
      const source = String(body?.source || "").slice(0, 80);
      if (!itemUrl.startsWith("https://") || !title) return new Response("Bad Request", { status: 400 });

      const key = "item:" + itemUrl;
      const current = (await this.ctx.storage.get(key)) || {
        url: itemUrl, title, category, source, count: 0, lastOpenedAt: null
      };
      current.title = title || current.title;
      current.category = category || current.category;
      current.source = source || current.source;
      current.count = Number(current.count || 0) + 1;
      current.lastOpenedAt = new Date().toISOString();
      await this.ctx.storage.put(key, current);

      return Response.json({ ok: true, count: current.count }, {
        headers: { "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/ataria/api/ranking") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      const entries = await this.ctx.storage.list({ prefix: "item:" });
      const ranking = [...entries.values()]
        .filter(x => x && x.url && x.title)
        .sort((a,b) => (Number(b.count||0)-Number(a.count||0)) || String(b.lastOpenedAt||"").localeCompare(String(a.lastOpenedAt||"")))
        .slice(0, 20);
      const payload = JSON.stringify({ ranking, generatedAt: new Date().toISOString() });
      return new Response(request.method === "HEAD" ? null : payload, {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}
