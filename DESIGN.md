---
version: 1
name: EUSKARAZ-GAMES-design
description: |
  Euskal kirolen eta mitologiaren joko-ataria, gauez eta mugikorrean jokatzeko pentsatua.
  Mundua: berde-beltz sakona (#06100c), letra lodi eta estuak maiuskulaz, mendi-berde
  (#5fe0a7) azentu bakarra. Irudiek egiten dute lan guztia: txartel bakoitzaren atzean
  jokoaren beraren irudi errendatua dago (ez marrazki faltsurik). Jokoen barruan, grafikoak
  argazki-testura CC0 errealekin (Poly Haven, ambientCG) eta argazki-zeruekin egiten dira,
  public/assets/egfx.js modulu partekatuaren bidez.

colors:
  bg: "#06100c"            # orri-hondoa (ez da beltz purua)
  bg-2: "#0a1611"          # txartel-hondoa irudia kargatu bitartean
  ink: "#f3f6f1"           # testu nagusia
  muted: "#a7b4ac"         # bigarren mailako testua (≥ 4.5:1 bg-ren gainean)
  faint: "#6f7d74"         # oina, metadatuak
  line: "rgba(243,246,241,.13)"
  line-2: "rgba(243,246,241,.26)"
  accent: "#5fe0a7"        # azentu BAKARRA: kategoria-lerroa, fokua, hover
  accent-ink: "#04110b"    # azentuaren gaineko testua
  red: "#d4232b"           # ikurriña/frontoiko marra: jokoen barruan soilik, ez atarian

typography:
  family: "Archivo (Google Fonts, aldagaia: wdth 62–125, wght 400–900)"
  brand:     { size: 13px,  weight: 850, stretch: 125%, tracking: .16em }
  hero:      { size: "clamp(46px, 9.4vw, 112px)", weight: 900, stretch: 88%, leading: .86, tracking: -.035em }
  title:     { size: "clamp(34px, 4.6vw, 60px)",  weight: 900, stretch: 80%, leading: .88, tracking: -.03em }
  meta:      { size: 12px, weight: 650, tracking: .14em, case: upper, color: accent }
  body:      { size: "15–17px", weight: 400, leading: 1.6, measure: "≤ 58ch", color: muted }
  cta:       { size: 12px, weight: 800, tracking: .16em, case: upper }

radius:
  card: 22px
  tile: 14px
  pill: 999px     # botoi guztiak (JOKATU, irteera)

motion:
  ease: "cubic-bezier(.16,1,.3,1)"
  reveal: "agerpen bakarra kargatzean: opacity + translateY(18px), 90 ms-ko tartea txartelen artean"
  hover: "irudia scale(1.06), CTA → azentu-kolorea; prefers-reduced-motion errespetatzen da"
---

## Overview

EUSKARAZ GAMES ataria **Experience** modukoa da: bisitariak joko bat aukeratzen du eta jokoan sartzen da.
Diseinuak ez du apaingarririk behar — jokoen irudiek eramaten dute pisua. Hiru mundu, ate bakarra:

- **KIROL CHALLENGE** (txartel handia, ezkerrean): barruan hiru kirolak, zuzenean jolasteko
  (HERRI PILOTA, ZESTA PUNTA, ARTZAIN TXAKURRAK). Ez dago leiho modalik.
- **BASOA SOLID** eta **ITSAS DORREA** (eskuinean, bata bestearen gainean): saga bera.

Ez erabili hiru txartel berdin errenkadan; konposizioa asimetrikoa da (1 handi + 2).

## Colors

- Hondoa beti `bg` (#06100c). Ez erabili `#000` purua.
- Azentu bakarra: `accent` (#5fe0a7). Ez gehitu bigarren azenturik atarian.
- Gorria (`red`) jokoen barruko identitatea da (frontoiko marrak, ikurriña); atarian ez.
- Irudien gaineko testuak beti du gradiente-estalkia (`.panel::after`), kontrastea bermatzeko.

## Typography

- Familia bakarra: **Archivo** (aldagaia). Zabalera-ardatzak egiten du nortasuna:
  marka zabal eta tarte handikoa (`stretch 125%`), izenburuak estu eta lodiak (`stretch 80–88%`).
- Izenburuen gainean ez jarri etiketa txikirik (eyebrow) ez zenbakirik (`01 / 03`).
  Kategoria-lerroa (`.meta`) izenburuaren **azpian** doa.
- Gorputz-testua ≤ 58 karaktere lerroko.

## Layout

- Edukiontzia: `max-width: 1240px`, alboetako tartea `clamp(16px, 4vw, 40px)`.
- Mahaigaina (> 900px): sareta `1.35fr 1fr`; KIROL CHALLENGE bi errenkada hartzen ditu.
- Mugikorra (≤ 900px): zutabe bakarra; kirolak zerrenda-errenkada gisa (irudi txikia + izena + gezia).

## Components

### Jolasteko txartela (`.panel.play`)
`<button>` osoa (teklatuarekin erabilgarria). Irudia `object-fit: cover`, izenburua, `.meta`, deskribapena
eta CTA pilula zuria ("JOKATU →"). Hover: irudia handitu, CTA azentu-kolorera.

### Kirol-lauza (`.sport`)
`<button>` bat kirol bakoitzeko: irudi txikia (4:3), izena (850, stretch 85%), azpi-lerroa eta
gezi-botoi biribila. Hover: -3px gora eta ertz berdea.

### Jokalaria (`#player`)
Pantaila osoko iframea (`srcdoc`). Kargatzean: jokoaren izena + barra mehe animatua (ez spinner
generikorik). Irteera-botoia goian **erdian** (jokoen HUDak ezkerreko eta eskuineko izkinak erabiltzen
dituzte); 3,5 s-ren ondoren %42ko opakotasunera itzaltzen da, baina beti sakagarri.

## Jokoen grafikoak (EGFX)

`public/assets/egfx.js` — three.js r128rako modulu partekatua. Joko berri batean:

```html
<script src="/assets/egfx.js"></script>
```
```js
EGFX.preload(['grass','concrete','wall'], ['day'], 6000).then(boot);   // testurak + zerua
EGFX.setRenderer(renderer);
const m = EGFX.material('concrete', { color: 0x8f7d60, repeat: [4, 8], roughness: .9 });
const sky = EGFX.skyRig(renderer, scene, 'day', 980);   // kupula + ingurune-argia; sky.set('dusk')
world.add(EGFX.mountains({ inner: 330, outer: 700, height: 150 }));
const sea = EGFX.water({ color: 0x06253a, repeat: [48, 48] });  // eta begiztan: EGFX.update(dt)
```

### Testura-liburutegia (`public/assets/tex/<izena>_{c,n,r}.jpg`, 512 px)

| Izena | Erabilera |
|---|---|
| `grass` | belardiak, zelaiak (makro-aldaketarekin, errepikapena ezkutatzeko) |
| `forest`, `dirt`, `sand`, `snow` | basoko zorua, bideak, hondartza, elurra |
| `concrete` *(neutroa)* | frontoi eta kantxetako zorua — jokoak ematen dio kolorea |
| `wall` *(neutroa)* | frontoiko horma margotuak — jokoak ematen dio kolorea |
| `plaster`, `stone`, `roof`, `wood`, `planks` | baserriak: igeltsua, harria, teilak, egurra |
| `rock`, `bark` | mendiak, harkaitzak, zuhaitz-enborrak |
| `metal` *(neutroa)*, `rust`, `corrugated` *(neutroa)* | plataforma, herdoila, kontainerrak |
| `water_n` | itsasoaren normal mapa (prozedurala) |

Zeruak (`public/assets/sky/`): `day`, `dusk`, `overcast`, `night` (gaua prozedurala da).
Testurak berriro sortzeko: `python3 tools/assets/build_assets.py`. Kredituak: `public/assets/CREDITS.md`.

### Arauak
- Testura bakoitza **behin** igotzen da GPUra; errepikapena shaderrean (`repeat`), ez `texture.clone()`.
- Kolorea jokoaren irteerarekin bat dator automatikoki (sRGB irteera ↔ sRGB testurak).
- `match: true`: testurak batez beste kolore originala ematen du — gaueko eszenetarako (Basoa, Itsas).
- Huts egiten badu (sarerik ez, `?gfx=0`), jokoak bere testura prozeduralekin jarraitzen du. Ez kendu fallback-a.
- Jokoaren RNG-a ez ukitu (mailak hazi finkoarekin sortzen dira); aldaketa bisualetarako hash finkoa erabili.

## Do's and Don'ts

**Do**
- Txartel bakoitzean jokoaren benetako irudia (canvas-a soilik, HUDik gabe) — `public/assets/covers/`.
- Botoiak `<button>` dira; fokua beti ikusgai (`:focus-visible`, azentu-kolorea).
- Mugimendu bakarra kargatzean; `prefers-reduced-motion` errespetatu.

**Don't**
- Ez erabili eyebrow-ak, sekzio-zenbakiak, testu-gradienteak edo emoji-ikonoak (SVG marraztuak bai).
- Ez gehitu bigarren azentu-kolorerik edo distira/neoi efekturik.
- Ez estali jokoen HUDa ataritik (irteera-botoia goian erdian bakarrik).

## Responsive Behavior

| Zabalera | Portaera |
|---|---|
| ≤ 700px | splash-a txikiagoa; heroa 46px-tik aurrera |
| ≤ 900px | zutabe bakarra; kirolak errenkada gisa |
| > 900px | bento: KIROL CHALLENGE handia + BASOA/ITSAS pilatuta |

Ukitu-eremuak ≥ 44px. Pantailaren ertzak: `env(safe-area-inset-*)` (iPhone).
