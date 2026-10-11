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
Acción, plataformas y puzles en 3D con dos épocas: el pasado (atardecer, mar vivo) y el presente
(noche, mar helado). Amaiur es una **bruja que dispara magia**: el rayo busca solo a su objetivo
(autoapuntado), el tercero seguido lanza tres rayos, manteniendo se carga **INDARRA** (rayo grande que
atraviesa y explota) y, durante el dash, un golpe giratorio. Los enemigos son **esqueletos animados**
(KayKit, CC0, GitHub): espadachines que esprintan, magos que disparan y se teletransportan y guerreros
con hacha que embisten. Cada uno solo se hiere en la época del color de sus ojos. Contador **KATEA**,
cámara lenta en la última baja y oleadas cada vez más frenéticas.
- Cada isla es una jaula: no se puede caer y la salida se abre al superar su reto (combate o
  construcción con cajas estilo «Ultrahand»). En islas liberadas hay **puzles de runas** por épocas.
- **La Aguja de Gaueko**: ascenso estilo Celeste de la isla 5 (y 11) al reloj sobre las nubes (y 42):
  rocas basálticas flotantes, cristales de época, cristales verdes que renuevan el dash, piedras que se
  derrumban, corriente de viento, runa que materializa piedras espirituales y tres campanas de control
  (al caer no se pierde vida).
- Guion con misterios y giros: páginas del diario de Amaiur con números de bucle, escenas breves al
  terminar cada isla que dejan una pregunta abierta, el giro de la máscara de Gaueko y un último
  mensaje de radio tras el final.
- Jefe final con cuatro fases, escudo de tres luces en el núcleo, coronas de proyectiles y refuerzos.
  Cuatro finales, tres campanas y cuatro páginas opcionales. Música épica sintetizada por capas.
- Código fuente legible: `tools/oihartzun/src/` (`game.js`, `combat.js`, `magic.js`, `ascent.js`,
  `story.js`, `runes.js`, `arena.js`, `craft.js`, `music.js`) → `python3 tools/oihartzun/build.py`
- Modelos: `tools/oihartzun/models/*.glb` (generados con `build_models.mjs` desde KayKit).
- Versión de un solo archivo: `python3 tools/oihartzun/standalone.py /tmp/OIHARTZUN.html`
- Pruebas: `tools/test/oihartzun_routes.js` (recorridos, puzles, la Aguja entera y las runas con la
  física real), `tools/test/oihartzun_combat.js` (un bot supera las arenas a distancia),
  `tools/test/oihartzun_boss.js` (jefe completo y giro final), `tools/test/errcheck.js`.

## Cloudflare
- Worker name: `euskaraz-games-online`
- Root directory: `/`
- Build command: vacío
- Deploy command: `npx wrangler deploy`

No uses el uploader directo de archivos de Cloudflare para este proyecto.
