# EUSKARAZ GAMES · plataforma bateratua
Portada nueva en \`public/index.html\`: Kirol Challenge (pilota, zesta, artzain-txakurrak), Basoa Solid, Basoa Solid II eta Mundu Jolastuak (31).

La portada nueva no sustituye los motores anteriores:
- \`public/klasiko/index.html\` es copia **exacta del blob del anterior index**, preservando su código sin reconstruirlo.
- \`public/klasiko/bridge.js\` abre automáticamente el deporte/aventura que se solicita con \`?joko=pilota|zesta|artzain|basoa|itsas|kirol\`; si un código legado cambia el selector, el portal clásico sigue siendo navegable.
- \`/mundu-jolastuak/games/<slug>/\` mantiene los 31 juegos alojados en GitHub con el sistema de traducción parcial y el proxy de assets existente.
- El portal incorpora buscador, filtros, favoritos y último juego (guardados en el navegador), selección EU/ES para la interfaz, acceso con teclado y modo pantalla completa.
- *Importante*: la traducción de los 31 juegos es parcial y parte del material multimedia depende aún de la demo original; no anunciar como preservación independiente ni 100% traducido.

Cloudflare: \`wrangler.jsonc\` debe enrutar primero \`/klasiko\` y \`/klasiko/*\` para que el Worker inyecte bridge.js. La portada no necesita framework ni build. Conserva \`/garena/\` y \`/mundu-jolastuak/\` intactos.
