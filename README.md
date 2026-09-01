# EUSKARAZ GAMES · Cloud Online

Proyecto preparado para desplegar **EUSKARAZ GAMES** en Cloudflare Workers mediante GitHub.

## Estructura
- `public/index.html`: portal y juegos.
- `src/worker.js`: servidor WebSocket con Durable Objects.
- `wrangler.jsonc`: configuración de Cloudflare Workers.
- `package.json`: Wrangler.

## Cloudflare
- Worker name: `euskaraz-games-online`
- Root directory: `/`
- Build command: vacío
- Deploy command: `npx wrangler deploy`

No uses el uploader directo de archivos de Cloudflare para este proyecto.
