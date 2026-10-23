# EUSKARAZ GAMES

Euskarazko joko-ataria, Cloudflare Workers-en (GitHub-etik automatikoki hedatua, `npx wrangler deploy`).

## Egitura
- `public/index.html` — ataria (arina; jokoak behar direnean kargatzen ditu `fetch` → iframe `srcdoc`).
- `public/games/<jokoa>.html` — zazpi joko, fitxategi bakarrekoak, three.js r128:
  `pilota`, `zesta`, `artzain` ("Kirol" motorra), `basoa`, `itsas` ("Solid" motorra),
  `oihartzun` (bi garaiko plataforma-jokoa; `elur.html` haren aurreko bertsioa da) eta
  `leizeak` (LEIZEEN DEIA, OIHARTZUN II: Ibarra harana, txalaparta eta zazpi leize — Basajaun, Lamia, Tartalo,
  Jentilbaratza/Errolan, Jentilen zerua/Odei, Herensugearen haitzuloa/Herensugea, Ametsa/Inguma).
  OIHARTZUN-ek `?test` parametroarekin `window.__game` proba-kakoa erakusten du.
  OIHARTZUN-en iturburua: `tools/oihartzun/src/` (game.js, combat.js, magic.js, ascent.js, story.js,
  runes.js…). Ez editatu `public/games/oihartzun.html` zuzenean: `python3 tools/oihartzun/build.py`
  exekutatu (three.js handik ateratzen du; sorgina eta hezurdurak `tools/oihartzun/models/*.glb`-tik).
- LEIZEEN DEIA: iturburua `tools/leizeak/src/` (game.js, world.js, npc.js, txalaparta.js, dungeon.js,
  rooms.js, boss.js, chain.js, lockon.js, story.js, haran.js, ibarra.js, quests.js, adarra.js, lamia.js,
  tartalo.js, gaua.js (eguna/gaua), pottoka.js, sekretuak.js, heura.js (eskalada), tximista.js (bonbak eta
  arrakalak), jentilak.js (Jentilbaratza, sutondoak, lasterbideak, Errolan), enara.js (planeatzea eta
  haize-zutabeak), zerua.js (Jentilen zerua, uharteak, ortzadarra), odei.js (Odei), herria.js (etxe-izenak,
  ATEA JO, Iturralde etxea barrutik), ispilua.js (EGUZKI-ISPILUA: argi-zutabeak, izpia, ispilu-harriak,
  kristalak, sare beltzak), herensuge.js (Herensugearen haitzuloa, laba, Odeiren hodeia, Herensugea),
  film.js (zinema: letterbox, errotuluak, azpitituluak), ahotsak.js (ahotsak, Web Audio iragazkiak),
  deiak.js (OIHARTZUN-DEIAK: Iratiren deiak, DEITU · IRATI), prologoa.js (hitzaurrea: erronka bakoitzak
  tresna bat irakasten du; partida berrietan bakarrik), hautsa.js (IZAR-HAUTSA: kontatzen, izar-plataformak,
  ate-zainak), seaska.js (seaska-kantaren hiru bertsoak, SEASKA, ametsera/esnatu, zazpigarren argia),
  ametsa.js (AMETSA: zazpigarren leizea), inguma.js (Inguma)…). Ez editatu `public/games/leizeak.html` zuzenean:
  `python3 tools/leizeak/build.py` (three.js `oihartzun.html`-etik ateratzen da). Diseinua: `tools/leizeak/DISEINUA.md`.
  Joko originala da: ez erabili beste jokoen edukirik (ROMik, maparik, pertsonaiarik, musikarik).
  Ahotsak: `tools/leizeak/ahotsak/lerroak.json` (testuak; build-ean txertatzen dira azpititulu gisa) →
  `sortu.py` (OmniVoice, CPU) → `public/assets/voice/leizeak/<id>.mp3`. Ahots sintetikoak bakarrik
  (erref/: diseinatutako erreferentziak); ez klonatu inoren ahotsik. Lizentziak: `public/assets/CREDITS.md`.
- `public/assets/egfx.js` — grafiko modulu partekatua (CC0 testurak, zeruak, ura, mendiak).
- `public/assets/{tex,sky,covers}` — testurak, zeruak eta atariko irudiak. Kredituak: `public/assets/CREDITS.md`.
- `public/garena`, `public/ataria`, `src/ataria.js` — GARENA katalogoa (jokoetatik aparte).
- `src/worker.js` — WebSocket zerbitzaria (Durable Objects) eta APIak.

## Konbentzioak
- Interfazeko testuak euskaraz. Commit mezuak ere euskaraz (historiaren estiloan).
- Dena euskara hutsean: ez dago hizkuntza-hautatzailerik. Atariak beti `__EG_LANG="eu"` pasatzen du eta
  jokoek ez dute gaztelaniarik edo ingelesik erakusten (OIHARTZUN-en `L(eu, es)` euskarazkoa da beti).
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
NODE_PATH=$(npm root -g) node tools/test/oihartzun_combat.js http://127.0.0.1:8091/games/oihartzun.html
NODE_PATH=$(npm root -g) node tools/test/oihartzun_boss.js http://127.0.0.1:8091/games/oihartzun.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_route.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_combat.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_valley.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_quests.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_lamia.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_tartalo.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_gaua.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_pottoka.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_sekretuak.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_trebetasunak.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_jentilak.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_zerua.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_herria.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_herensuge.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_prologoa.js http://127.0.0.1:8091/games/leizeak.html
NODE_PATH=$(npm root -g) node tools/test/leizeak_ametsa.js http://127.0.0.1:8091/games/leizeak.html
```
