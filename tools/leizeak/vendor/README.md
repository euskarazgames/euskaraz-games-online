# LEIZEEN DEIA · kanpoko liburutegiak

`build.py`-k fitxategi hauek jokoaren HTMLan txertatzen ditu (fitxategi bakarra, sarerik gabe ere bai).
Ez editatu eskuz: jatorrizko paketeetatik kopiatuta edo bilduta daude.

| Fitxategia | Jatorria | Lizentzia |
|---|---|---|
| `meshopt_decoder.js` | npm `meshoptimizer@1.3.0` → `meshopt_decoder.cjs` (aldaketarik gabe) | MIT · Arseny Kapoulkine |
| `recast-navigation.js` | npm `@recast-navigation/core`, `/generators`, `/wasm` 0.43.1, esbuild-ekin bilduta (`src/recast_entry.mjs`, IIFE, `RecastNav` globala, wasm-compat: WASM barruan) | MIT · Isaac Mason; Recast & Detour: zlib · Mikko Mononen |
| `../../../public/assets/vendor/jolt-physics.js` | npm `jolt-physics@1.1.1` → `dist/jolt-physics.wasm-compat.js`, esbuild-ekin bilduta (`src/jolt_entry.mjs`, IIFE, `JoltPhys` globala; `node:*` kanpoan). Ez dago HTMLan: jokoak beranduago kargatzen du (`standalone.py`-k barruan sartzen du) | MIT · Jorrit Rouwe |

Modeloak trinkotzeko (galerarik gabe): `node tools/leizeak/models/meshopt.mjs` (`build_models.mjs`-en ondoren).

Recast berriz biltzeko (karpeta huts batean):

```bash
npm install @recast-navigation/core@0.43.1 @recast-navigation/generators@0.43.1 @recast-navigation/wasm@0.43.1 esbuild
npx esbuild recast_entry.mjs --bundle --format=iife --global-name=RecastNav --minify --target=es2019 --outfile=recast_bundle.js
```

(gero lizentzia-goiburua `recast-navigation.js`-ren hasieratik kopiatu eta bilduma atzean jarri)

Jolt berriz biltzeko (karpeta huts batean, `jolt-physics@1.1.1` instalatuta):

```bash
npx esbuild jolt_entry.mjs --bundle --format=iife --global-name=JoltPhys --minify --target=es2020 \
  --external:node:module --external:node:worker_threads --external:node:fs --external:node:path --external:node:url --outfile=jolt_bundle.js
```
