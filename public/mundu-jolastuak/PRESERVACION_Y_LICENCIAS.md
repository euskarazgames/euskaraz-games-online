# Mundu Jolastuak · Preservación y licencias / Iraunkortasuna eta baimenak

## Qué está archivado / Zer dago gordeta
- 31 juegos: HTML de ejecución y 26 módulos JavaScript adicionales en `games/`.
- Fuente: [Lovis Odin / video-to-game](https://github.com/lovisdotio/video-to-game).
- Referencia del proyecto original (2026-10-29): commit `d1a24fd8a47576ec4b3c36388b30deda0631def9`.
- Copyright del código original © 2026 Lovis Odin; licencia MIT conservada en `LICENSE-original-MIT.txt`.
- Traducción parcial de los textos DOM/Canvas 2D; catálogo y ayuda en euskera.

## Qué NO está archivado
Los archivos de vídeo, fotografías, texturas, modelos GLB, fuentes específicas, música y efectos de sonido que no se encuentran en el repositorio original. El código revisado tiene al menos 561 referencias a archivos externos que requieren inventario y verificación. No equivale a 561 archivos únicos ni implica que todos estén ausentes del servidor demo.

La licencia MIT del código fuente no demuestra por sí sola que cada archivo multimedia de la demo sea redistribuible. Hasta aclararlo, no introducir archivos multimedia externos de forma permanente en el repositorio de Euskaraz Games ni declarar la colección «autónoma» o «100 % libre».

## Funcionamiento actual
El código se carga desde `/mundu-jolastuak/games/`. Si el juego solicita un archivo `assets/` ausente, Cloudflare Worker hace una petición temporal al servidor original público y lo entrega al juego. Algunos scripts siguen usando librerías CDN. Si desaparece la fuente, el recurso puede dejar de estar disponible. Esto es una **adaptación web con dependencias externas**, no un archivo independiente.

**Iraunkortasun osorako**: jatorrizko fitxategien baimenak eskuratu, baliabideak legez artxibatu, CDNak ordezkatu eta jokoa benetako nabigatzaileetan probatu behar da.

## Pasos para finalizar
1. Generar y revisar el inventario de URLs, tamaños, procedencia, autor y licencia.
2. Solicitar al creador autorización explícita para conservar y redistribuir los medios que no consten bajo licencia reutilizable. Documentar la respuesta.
3. Sustituir por gráficos, voces y audios propios o CC0 los recursos sin permiso.
4. Archivar los archivos autorizados en almacenamiento gestionado (preferiblemente R2 + manifiesto SHA-256), y servirlos desde el propio dominio.
5. Ejecutar pruebas de interfaz, lógica de juego, controles móviles, WebGL, accesibilidad y carga para **cada uno** de los 31 juegos.
6. Revisar en contexto cada texto sin traducir y traducir también los letreros incrustados en imágenes y audio, creando nuevas versiones autorizadas.

## Permiso para usar los recursos (borrador en inglés)
Subject: Permission to archive and Basque-localize Video to Game media assets

Hello Lovis,

I am working on **Euskaraz Games**, a free Basque-language videogame preservation and localization project. The MIT-licensed source of your 31 Video to Game examples has been preserved with your credits and license.

Some image, GLB, audio and UI assets used in the live demos are not included in the GitHub repository. Would you authorize our project to download, translate where appropriate, archive, and publicly redistribute these specific assets alongside the MIT code, free of charge, with full attribution? If any assets have different licenses or third-party rights, could you identify which ones must be excluded?

We would document the scope of your permission and retain links to your original project. Thank you for your work and consideration.

## Oharrak
Euskarazko tituluak eta nabigazioa eginda egon arren, jokoetako irudi, soinu eta zenbait mezu oraindik jatorrizko hizkuntzan ager daitezke. Ez aurkeztu bilduma osorik itzulita gisa, 31 jokoetako testuen eta audioen berrikuspena amaitu arte.
