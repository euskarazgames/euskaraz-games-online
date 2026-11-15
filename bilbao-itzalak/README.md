# BILBAO · ITZALEN SAREA — WebGL2 / Web + Unity

Thriller ficticio de seis capítulos en un Bilbao 3D estilizado. Juego web con escena 3D original GLB, controles de teclado y táctiles, cuaderno, mapa, 3 interiores y cuatro desenlaces.

## Desarrollo

Servir `web/` por HTTP local: `python3 -m http.server 8000 -d web`, visitar `http://localhost:8000`. La edición HTML `Bilbao_Itzalen_Sarea_3D_OFFLINE.html` no requiere servidor (con GLB integrado).

## Interrogatorios opcionales

El botón CODEC IA permite formular preguntas libres. Sin API configurada, usa respuestas locales escritas a mano. En Vercel crear manualmente la variable `OPENAI_API_KEY` (nueva, secreta) en la configuración del proyecto, con coste/límites de uso configurados por el propietario. **Nunca** subir claves al repositorio ni insertar credenciales en el navegador. Si una clave ha sido expuesta en un chat, revocarla y rotarla.

La función `api/interrogatorio.mjs` limita longitud de pregunta y respuesta y añade límite de frecuencia básico, pero un servicio público de pago requiere controles persistentes de cuota/IP y autenticación opcional.

## Licencias y representación

Edificios y lugares son interpretaciones artísticas originales, no geometría extraída de Google Street View. Proyecto original, organizaciones y personajes ficticios. El modelo exportado es un prototipo, no un juego AAA final.

## Unity

Abrir la carpeta `Unity/` desde Unity Hub, importar OBJ y ejecutar menú Tools > Bilbao: Itzalen Sarea > Generar escena 3D. Requiere Unity Editor para compilar y verificar. No incluye binario WebGL Unity compilado.