# HARRI · IA arte-pipeline-a (fal.ai + Blender)

Aktibo hauek fal.ai-rekin sortu eta Blender-en (bpy, headless) prestatu dira. Prompt, modelo, seed eta emaitza-URL
guztiak `*/meta.json` fitxategietan daude.

## Irteerak
| Fitxategia | Zer den |
|---|---|
| `public/harri/assets/tex/{rock,moss,grass,dirt,block,thatch,wood}.jpg` | Testura jarraituak (tileable), 512×512, JPEG q82, < 100 KB. |
| `public/harri/assets/harri_ia.glb` | Harri riggeatua: 1,5 unitateko altuera, oinak Y=0-n, aurpegia +Z (three.js), ~10k triangelu, 1024 px-ko JPEG testura, 15 hezur (`hips, torso, head, upperarm_L/R, forearm_L/R, hand_L/R, thigh_L/R, shin_L/R, foot_L/R`; L = +X). Draco/meshopt gabe, ~0,6 MB. Animaziorik ez. |
| `public/harri/assets/azala.jpg` | Atariko azala, 960×540, ~62 KB. |
| `tools/harri/ai/harri/render_front.png`, `render_34.png` | Atseden-jarrerako errenderrak (Cycles CPU). |
| `tools/harri/ai/harri/render_pose.png`, `render_pose_side.png` | Deformazio-proba: ezker besoa alboetara, eskuina aurrera, ezker hanka aurrera, burua biratuta. |
| `tools/harri/ai/harri/{plate02_crop.png, concept.png, tripo.glb}` | 02 laminaren moztea → kontext-en A-pose kontzeptua → Tripo-ren GLB gordina. |
| `tools/harri/ai/tex/*_raw.jpg`, `*_2x2.jpg` | Flux-en irudi gordinak eta 2×2 mosaiko-egiaztapenak (josturak ikusteko). |

## Berriz exekutatzeko
```bash
# fal.ai: saioaren proxyak gakoa txertatzen du (queue.fal.run); bestela export FAL_KEY=...
python3 tools/harri/ai/sortu.py tex [rock moss ...]   # Flux → *_raw.jpg → tileable → public/harri/assets/tex/
python3 tools/harri/ai/sortu.py seamless              # fal deirik gabe: raw-etatik testurak berriz prozesatu
python3 tools/harri/ai/sortu.py harri                 # 02 lamina → fal-ai/flux-pro/kontext → tripo v2.5 image-to-3d
python3 tools/harri/ai/sortu.py azala                 # kontext (Harriren kontzeptua erreferentzia) → azala.jpg

# Blender (bpy 5.2.4, Python 3.13)
python3.13 -m venv ~/bpy && ~/bpy/bin/pip install bpy==5.2.4 numpy
~/bpy/bin/python tools/harri/ai/rig_harri.py [--yaw 0] [--height 1.5]   # → harri_ia.glb + errenderrak
~/bpy/bin/python tools/harri/ai/rig_harri.py --look                      # orientazioa egiaztatu bakarrik
```
Dagoeneko dauden fitxategi gordinak (`*_raw.jpg`, `concept.png`, `tripo.glb`, `azala_raw.png`) ez dira berriz eskatzen:
ezabatu fal-era berriz deitzeko.

### Testura jarraituen metodoa
Ertzetako %6 moztu (Flux-ek batzuetan "markoa" marrazten du) → argi-aldaketa handiak berdindu (high-pass leuna,
mosaikoan bandarik ez izateko) → ertz-nahasketa: eskuineko/beheko %18-a ezkerreko/goiko ertzaren gainean
smoothstep-ekin gurutzatzen da, beraz kontrako ertzak jatorrizko irudian aldameneko pixelak dira. `rock`
pixka bat desaturatzen da (gris epela, ez laranja). Mosaiko guztiak (`tex/*_2x2.jpg`) begiz egiaztatuta.

### Rig-a
Hezurren tokiak geometriatik kalkulatzen dira (oinen multzoak, hankartea, besoen kanpo-zerrenda, eskuak) eta
`ARMATURE_AUTO` (bone heat) pisuekin lotzen da; erpinen % 2 baino gehiago pisurik gabe geratuz gero inguratzaileetara
(`ENVELOPE`) jotzen du. Exekuzio honetan bone heat-ek erpin guztiak pisatu ditu.

## Egiaztapenak
- Harriren bularra: harri leun pitzatua, ikurrik/letrarik gabe (concept.png, errenderrak eta azala begiz egiaztatuta);
  ez da testura-konponketarik behar izan.
- Irudietan testurik ez.
- fal eskaerak guztira: 12 (7 testura + rock eta block berriz, kontext ×2, tripo ×1).

## Huts egin zuena / oharrak
- `rock` lehen saiakeran Flux-ek harri-koskorrez inguratutako hondar-plaza bat marraztu zuen (konposizio zentratua):
  prompt-a aldatu da ("uniform close-up material surface ... no focal point"). `block` lehen bertsioak oin-aztarnen
  antzeko zuloak zituen; seed eta prompt berriarekin errepikatuta.
- Lehen seamless metodoa (erdiko desplazamendua + gurutze-nahasketa) mamu-irudi nabarmenak uzten zituen; ertz-nahasketak ordezkatu du.
- Blender-en Workbench-ek EGL behar du (ez dago edukiontzian): errenderrak Cycles CPU-rekin egiten dira.
- Lehen rig-saiakeran hankartea oinen barnealdean detektatu zen (beso-zerrendak oinak hartzen zituen); iragazkiak zuzenduta.
- Azalan kastroaren hesia harrizkoa atera da, ez egurrezko palisada; kastroa txiki samarra da atzealdean. Azala behar
  bada berriz sortu (`rm tools/harri/ai/azala/azala_raw.png`, prompt-a doitu).
- glTF esportatzaileak abisua: erpin batzuek 4 hezur baino gehiagoren eragina zuten; 4 handienak gordetzen dira (normala).
