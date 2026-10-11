# EUSKARAZ GAMES

Euskarazko joko-ataria, Cloudflare Workers-en (GitHub-etik automatikoki hedatua, `npx wrangler deploy`).

## Egitura
- `public/index.html` — ataria (arina; jokoak behar direnean kargatzen ditu `fetch` → iframe `srcdoc`).
- `public/games/<jokoa>.html` — sei joko, fitxategi bakarrekoak, three.js r128:
  `pilota`, `zesta`, `artzain` ("Kirol" motorra), `basoa`, `itsas` ("Solid" motorra) eta
  `oihartzun` (bi garaiko plataforma-jokoa; `elur.html` haren aurreko bertsioa da).
  OIHARTZUN-ek `?test` parametroarekin `window.__game` proba-kakoa erakusten du.
- `public/assets/egfx.js` — grafiko modulu partekatua (CC0 testurak, zeruak, ura, mendiak).
- `public/assets/{tex,sky,covers}` — testurak, zeruak eta atariko irudiak. Kredituak: `public/assets/CREDITS.md`.
- `public/garena`, `public/ataria`, `src/ataria.js` — GARENA katalogoa (jokoetatik aparte).
- `src/worker.js` — WebSocket zerbitzaria (Durable Objects) eta APIak.

## Konbentzioak
- Interfazeko testuak euskaraz. Commit mezuak ere euskaraz (historiaren estiloan).
- Diseinua: `DESIGN.md` (koloreak, tipografia, osagaiak, EGFX arauak).
- Grafikoak hobetzeko: `.claude/skills/euskaraz-gfx/SKILL.md` (lan-fluxua eta egiaztapena).
- Jokoen RNG-a ez ukitu (mailak hazi finkoarekin sortzen dira).
- Fallback-ak mantendu: `?gfx=0` edo testurarik gabe, jokoek funtzionatu behar dute.

## Probak
```bash
npx http-server public -p 8091 -c-1 -s &
NODE_PATH=$(npm root -g) node tools/test/errcheck.js http://127.0.0.1:8091/games/pilota.html 9000
NODE_PATH=$(npm root -g) node tools/test/shot.js http://127.0.0.1:8091/ /tmp/ataria 390 844 3000
NODE_PATH=$(npm root -g) node tools/test/oihartzun_routes.js http://127.0.0.1:8091/games/oihartzun.html
```
