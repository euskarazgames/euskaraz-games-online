# EUSKARAZ GAMES · HARRI

Euskarazko joko-ataria Cloudflare Workers-en (`npx wrangler deploy`, GitHub-etik). Proiektu honetako lan nagusia
orain **HARRI · HARRIZKO BIHOTZA** da: harrizko golem txiki eta atsegin baten 3D plataforma-jokoa, harriak hartu,
jaurti, lotu eta eraikitzen dituena.

## Egitura
- `public/index.html` — ataria (Kirol Challenge, Basoa Solid, Mundu Jolastuak eta HARRI).
- `public/harri/` — HARRI jokoa (three.js r170, ES moduluak, build-ik gabe):
  - `index.html` orria, HUD-a eta ukipen-kontrolak; `src/*.js` moduluak; `vendor/` three.js (MIT);
  - `assets/harri.glb` Harriren modeloa (Blender, `tools/harri/blender/harri_eraiki.py`); `assets/tex/` testurak (aukerakoak).
- `tools/harri/BIBLIA.md` — diseinu-biblia publikoa (nortasuna, mekanikak, 1. mundua, 01–12 binetak, onarpen-irizpideak).
- `tools/harri/biblia/*.jpg` — erreferentzia-laminak (kontzeptu-artea, ez jokoaren pantaila-argazkiak).
- `tools/harri/blender/` — Harriren modeloa sortzeko bpy script-a. `tools/harri/ai/` — fal.ai testura/arte pipeline-a.
- `tools/test/` — Playwright bot-ak (`errcheck.js`, `shot.js`, `harri_route.js`).
- `src/worker.js`, `wrangler.jsonc` — Cloudflare Worker-a (WebSocket, APIak, static assets `public/`).
- `.claude/agents/` — Claude Code Game Studios-eko 25 agente (MIT), HARRIra egokituak.

## Arau nagusiak (HARRI)
- Harriren bularra harri naturala da: **laubururik, runarik, letrarik, ikurrik ez**. 02 lamina da eredu nagusia.
- Jokoko testu guztiak euskaraz; argitaratu aurretik giza hizkuntza-berrikuspena.
- Sagaren azken sekretua taldearentzat bakarrik da: ez idatzi fitxategi publikoetan ezta jokoan ere.
- Harri v0.1 eta Gau Beltza-ren egokitzapena baztertuta daude: ez berrerabili.
- Harri-sistema benetakoa: id egonkorra, inbentarioa behin, jaurtiketa fisikoa, egitura-grafoa, eraikinak zapalgarriak,
  desmuntatzeak beti materiala itzultzen du (ez dago softlock-ik).
- Mugikorra lehenik (iPhone Safari): joystick flotatzaileak, botoi handiak; `?gfx=0` eta testurarik gabeko fallback-ak beti.
- Probak kontrol publikoen bidez bakarrik: ez aldatu demoaren egoera arrakasta faltsutzeko.

## Probak
```bash
node tools/test/serve.js 8091 &                        # public/ zerbitzatzen du
node tools/test/errcheck.js http://127.0.0.1:8091/harri/ 9000
node tools/test/shot.js http://127.0.0.1:8091/harri/ /tmp/harri 844 390 4000
node tools/test/harri_route.js http://127.0.0.1:8091/harri/    # ibilbide osoa kontrol publikoekin
```

## Konbentzioak
- Commit mezuak euskaraz (historiaren estiloan). Ez ukitu beste jokoen RNG-a.
- Hirugarrenen edukirik ez: lan originala. Lizentziak: `public/harri/vendor/LICENSE-three.txt`, `.claude/LICENSE-claude-code-game-studios.txt`.
