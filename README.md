# EUSKARAZ GAMES · Cloud Online

Proyecto preparado para desplegar **EUSKARAZ GAMES** en Cloudflare Workers mediante GitHub.

## Estructura
- `public/index.html`: portal (ligero; carga cada juego solo cuando se abre).
- `public/games/<juego>.html`: cada juego en su propio archivo (`pilota`, `zesta`, `artzain`, `basoa`, `itsas`, `oihartzun`).
  `elur.html` es la versión anterior de OIHARTZUN (ELUR JOKOA), accesible desde su pantalla de inicio.
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

## OIHARTZUN
Plataformas 3D con dos épocas: el pasado (atardecer, mar vivo) y el presente (noche, mar helado).
Cada puente existe solo en su época; en el presente las olas que inundaron el pueblo están congeladas
y se puede caminar sobre ellas. Seis islas, cinco recuerdos, tres campanas opcionales (retos de
dificultad creciente), un jefe final con tres fases y cuatro finales con su propia secuencia.
- Prueba de errores: `node tools/test/errcheck.js http://127.0.0.1:8091/games/oihartzun.html 12000`
- Prueba de recorridos (un bot completa los retos con la física real del juego):
  `node tools/test/oihartzun_routes.js http://127.0.0.1:8091/games/oihartzun.html`

## Cloudflare
- Worker name: `euskaraz-games-online`
- Root directory: `/`
- Build command: vacío
- Deploy command: `npx wrangler deploy`

No uses el uploader directo de archivos de Cloudflare para este proyecto.
