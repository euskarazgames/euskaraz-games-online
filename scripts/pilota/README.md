# HERRI PILOTA — pelotaris realistas (Fal → Blender → WebGL)

**Rama de preproducción:** \`feature/pilota-personajes-realistas-fal-blender\`.
**No sustituir los jugadores publicados hasta pasar QA en Safari iPhone y escritorio.**

## Material de referencia generado con fal.ai

- **Jon (azul, protagonista):** referencia individual: https://v3b.fal.media/files/b/0ab2d728/QvHGVVAMfXwCBusYV7Eb5_58v0YDwC.png
- **Elenco completo:** https://v3b.fal.media/files/b/0ab2d728/fbymkyQwm8WW5zhBzTXnU_647ylyQ9.png
- **Estudio de animación / contacto:** https://v3b.fal.media/files/b/0ab2d728/Fv4dI0ugYr7QAvA3Qyoyl_53cVAymh.png
- **A. Lurra:** https://v3b.fal.media/files/b/0ab2d782/mK9GnBwOvaKVoxdr5B9n4_DE1p8Lnb.png
- **Xabier Harri:** https://v3b.fal.media/files/b/0ab2d782/2ZGCzekgWYsfCV7BFkTH-_V4l4GlDi.png
- **U. Mendibe:** https://v3b.fal.media/files/b/0ab2d782/pAQ9QR518J4QM_lv8N2hQ_8SPDbzNt.png

Original assets generated for this project; NOT a license to use actual professional athletes' likenesses. Host assets in own domain for durability.

## 3D pipeline

1. \`scripts/pilota/sources.json\`: direct source GLB links (generated with Fal Hunyuan 3D).
2. \`scripts/pilota/blender_prepare.py\`: executed by Blender in GitHub Actions.
3. Import GLB, normalize to 1.80m, decimate to ~14.5k triangles, preserve UV diffuse.
4. Create a 15-bone armature with the **same order** and names as \`Body.SKEL\` in \`public/pilota/index.html\`; preliminary nearest-bone weights.
5. Save \`<name>_rig.blend\` (GitHub Actions artifact), \`<name>_optimized.glb\` (portable 3D preview), \`<name>_diffuse.png\`, and \`<name>_skin.bin\` (custom game skin).
6. The game's custom shader expects 19 float32 values per vertex, then uint16 triangle indices. Preview in URL \`/pilota/?personajes3d=1\` **on a deployment containing generated files**. Without the flag, the current game remains completely untouched.

### Animation quality control — mandatory

- Check hand-to-pelota contact on JO, GLOBOA, MOTZ, serve, running strike and very low bounce.
- Correct fingers, elbow folding, shoulder twists, knees, foot plant and spine tilt by hand in Blender.
- Validate front/back orientation and texture UV seams; humans generated from one photo often have errors on the back.
- Perform manual weight painting, retargeting and animation polish; auto rig alone is NOT production quality.
- Do not change scoring, 3–7 serve, career persistence, intros, menus, or the remaining games.
- Capture screenshots for mobile and desktop, and measure actual performance before enabling real models by default.

### Build locally (with Blender 3.x or 4.x)

\`\`\`bash
blender -b --factory-startup --python scripts/pilota/blender_prepare.py -- \
  --source /path/to/your/model.glb --out public/pilota/characters/jon --target-tris 14500
\`\`\`

## Required release gate

Merge only after: skinned mesh imports without JS/GL errors, screen-space anatomy and clothing are right, strikes visually touch the incoming ball, 3–7 serves unaffected, game remains playable through a full season, and performance is acceptable on iPhone Safari. The runner success is only a technical first pass.
