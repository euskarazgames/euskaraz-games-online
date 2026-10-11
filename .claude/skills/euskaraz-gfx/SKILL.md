---
name: euskaraz-gfx
description: Improve the visuals of the EUSKARAZ GAMES three.js games (Herri Pilota, Zesta Punta, Artzain Txakurrak, Basoa Solid, Itsas Dorrea) or the portal. Use when asked to make a game look better, add textures/skies/models, fix visual or HUD layout bugs, or regenerate portal cover art. Covers the EGFX shared graphics module, the CC0 texture pipeline and the screenshot-based verification loop.
---

# EUSKARAZ GAMES · graphics workflow

Read `DESIGN.md` first (portal tokens + EGFX rules). Games live in `public/games/<key>.html`
(single-file three.js **r128** games, loaded by the portal via `fetch` → iframe `srcdoc`).

## 1. Run and look before changing anything

```bash
npx http-server public -p 8091 -c-1 -s &          # serves portal, games and /assets
export NODE_PATH=$(npm root -g)                     # global playwright
node tools/test/shot.js http://127.0.0.1:8091/games/zesta.html /tmp/z 844 390 8000 '[{"ttap":[422,195]},{"wait":3000},{"shot":"menu"}]'
```

- Test at phone landscape **844×390** and portrait **390×844** (the player is on an iPhone).
- Touch games need `ttap` (touchscreen) — mouse clicks do not trigger their `touchstart` handlers.
- Kirol games (pilota/zesta/artzain) boot after `EGFX.preload`; wait ≥ 8 s before the first tap.
- Basoa/Itsas: tap ~60 times (title → lore → codec) to reach gameplay (`state==='play'`).

## 2. Engines

| Game | Engine | Hooks |
|---|---|---|
| pilota, zesta, artzain | "Kirol" (`BOOT()` closure, `MT` procedural textures, `MX()` materials) | `MX/MXK/MX0`, `EG_SCALE`, `egSky` (`skyRig`), `buildHub`, `buildCourt` |
| basoa, itsas | "Solid" (top-level script, post-process render target) | `egMat(material,key,opts)`, `egLater(fn)`; Itsas act 2: `a2Sea`, `a2Floor`, `a2Block` |

- **Never call the game's `RNG()`** for visual variation: levels are generated from a fixed seed. Use a local hash.
- Zesta and artzain are near-identical files: apply the same patch to both.
- Kirol games: `pilota` uses sRGB output; zesta/artzain use linear output — EGFX adapts automatically.

## 3. EGFX (`public/assets/egfx.js`)

```js
EGFX.preload(['grass','concrete'], ['day'], 6000)  // always resolves (timeout)
EGFX.material(key, {color, repeat:[x,y], roughness, normal, envMapIntensity, match})
EGFX.apply(existingStandardMaterial, key, opts)     // upgrade in place (InstancedMesh ok)
EGFX.skyRig(renderer, scene, 'day', 980)            // .set('dusk'|'overcast'|'night') → horizon color
EGFX.environment(renderer, scene, 'night')          // IBL only
EGFX.mountains({inner, outer, height, low, mid, rock, albedo:false})
EGFX.ground('grass', 1500, {color, tile})
EGFX.water({color, roughness, metalness, normal, repeat}) + EGFX.update(dt) every frame
EGFX.envDefault = 0.55                               // per game IBL strength
EGFX.ambient(hemi, 0.55)                             // lower hemi while IBL is on (restored in lite tiers)
EGFX.autoQuality()                                   // < 45 fps → tier 1 (no IBL/roughness) → tier 2 (no normal maps)
```

URL flags: `?gfx=0` (procedural only), `?gfx=lite`, `?gfx=high` (also `localStorage.eg_gfx`).
Headless swiftshader runs at ~2 fps, so use `?gfx=high` for screenshots/key art.

Rules: one GPU upload per image (repeat happens in the shader); keep the procedural fallback
(`?gfx=0`, offline, or `egfx.js` missing must still work); `match:true` keeps the old average
brightness (night scenes).

## 4. New textures / skies

Add an entry to `TEXTURES` or `SKIES` in `tools/assets/build_assets.py` (Poly Haven `ph` or
ambientCG `acg`, CC0 only), add the key to `LIB` in `egfx.js`, then:

```bash
python3 tools/assets/build_assets.py --only <name>   # writes public/assets/{tex,sky} + CREDITS.md
```

Use mode `'detail'` (neutral grey) for surfaces the game tints (court floors, painted walls, metal).

## 5. Verify (bounded: one batch, fix, one confirm)

```bash
for g in pilota zesta artzain basoa itsas; do
  node tools/test/errcheck.js http://127.0.0.1:8091/games/$g.html 9000            # normal
  node tools/test/errcheck.js http://127.0.0.1:8091/games/$g.html 9000 'egfx\.js' # fallback
done
```

Compare before/after screenshots side by side (`montage a.png b.png -tile 2x out.png`) and check
the HUD is not covered. Portal covers: `node tools/test/keyart.js <url> out.png '#gl canvas' '<actions>'`
then `convert out.png -resize 960x720 -quality 80 public/assets/covers/<key>.jpg`.

## Related skills
`impeccable` and `design-taste-frontend` for portal/HUD UI, `playwright-cli` for browser driving,
img2threejs (install with `tools/skills/install-img2threejs.sh`) for procedural 3D models from a photo.
