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
