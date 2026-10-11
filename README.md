# EUSKARAZ GAMES · Cloud Online

Proyecto preparado para desplegar **EUSKARAZ GAMES** en Cloudflare Workers mediante GitHub.

## Estructura
- `public/index.html`: portal (ligero; carga cada juego solo cuando se abre).
- `public/games/<juego>.html`: cada juego en su propio archivo (`pilota`, `zesta`, `artzain`, `basoa`, `itsas`).
- `public/assets/egfx.js`: módulo gráfico común de los juegos (texturas reales, cielos, agua, montañas).
- `public/assets/tex`, `sky`, `covers`: texturas CC0, cielos y portadas del portal. Créditos en `public/assets/CREDITS.md`.
- `src/worker.js`: servidor WebSocket con Durable Objects.
- `wrangler.jsonc`: configuración de Cloudflare Workers.
- `package.json`: Wrangler.
- `DESIGN.md`: sistema visual (colores, tipografía, componentes y reglas gráficas de los juegos).
- `tools/`: scripts para regenerar texturas (`tools/assets`) y para probar los juegos con capturas (`tools/test`).
- `.claude/skills/`: herramientas de diseño para Claude (Impeccable, Taste, Playwright CLI y `euskaraz-gfx`).

## Gráficos
Los juegos usan texturas fotográficas CC0 (Poly Haven, ambientCG) con relieve (normal map), cielos
reales e iluminación ambiental. Si algo falla al cargar, cada juego vuelve automáticamente a sus
texturas de siempre. En móviles lentos la calidad se ajusta sola. Opciones en la URL de un juego:
- `?gfx=0`: gráficos originales (sin texturas nuevas).
- `?gfx=lite`: modo ligero.
- `?gfx=high`: calidad máxima siempre.

## Cloudflare
- Worker name: `euskaraz-games-online`
- Root directory: `/`
- Build command: vacío
- Deploy command: `npx wrangler deploy`

No uses el uploader directo de archivos de Cloudflare para este proyecto.
