# HARRI — HARRIZKO BIHOTZA · diseinu-biblia (bertsio publikoa)

Dokumentu hau zuzendaritza kreatiboaren enkargutik ateratako laburpena da. Sagaren azken sekretua eta 13–18 binetak
**ez daude hemen**: taldearen barne-dokumentuan baino ez. Laminak (`biblia/*.jpg`) kontzeptu-artea dira, ez jokoaren
pantaila-argazkiak; testu honek lehentasuna du laminetako testu akatsen gainetik.

## 1. Nortasun-inbarianteak
- Harri: golem txikia (≈1,0 m), atsegina eta adierazkorra; harri epela, begi anbar-kolorekoak, goroldioa eta margaritak.
- **Bularra harri natural leuna: lauburu, runa, letra, ikur edo markarik gabe.** 02 lamina da erreferentzia nagusia.
- Burdin Aroko Euskal Herrian inspiratutako fantasia. Anakronismo nahigabeak eta inbaditzaileen estereotipoak saihestu.
- Euskara; giza hizkuntza-berrikuspena argitaratu aurretik.
- Baztertutako prototipoak: Harri v0.1 eta Gau Beltza-ren HTML egokitzapena. Ez berrerabili.

## 2. Pilare jokagarria
3D plataformak zehatzak + harriak **hartu, jaurti, lotu, eraiki, desmuntatu**, espazioa benetan betetzen dutenak,
jokalaria eusten dutenak eta erronkak sormenez ebazten uzten dutenak. Eraikuntza da aditz bereizgarria.

### Harri-sistemaren kontratua
| # | Ekintza | Araua |
|---|---|---|
| 1 | HARTU | Harriak id egonkorra du; inbentariora behin gehitzen da (gehienez 3); mundutik hartzea baieztatzean bakarrik desagertzen da. |
| 2 | JAURTI | Ibilbide fisiko irakurgarria (aurreikuspen-lerroa), kamera eta apuntatzea koherenteak, talkak egiaztagarriak, hutsegitearen feedback-a. Urrutiko helbururik ez da magikoki aktibatzen. |
| 3 | LOTU | Bi bloke bateragarrik egitura bat osatzen dute; lotura-grafoa baliozkoa da mugitu edo kolpeak jaso ondoren. |
| 4 | ERAIKI | Zubiak, zutabeak, arrapalak eta eskailerak talka zapalgarriarekin, egonkortasunarekin eta muga definituekin. Aurreikuspena (mamua) baieztatu aurretik. |
| 5 | DESMUNTATU | Materiala beti berreskura daiteke; kontsumo iraunkorrik ez du maila hausten. |
| 6 | INGENIARITZA-BORROKA | Jokalariak lurra menderatzen du: estalpeak, desbideratzeak, oztopoak. Borrokak ezin ditu plataformak mugitu. |

## 3. Lehen mugarria: 15–25 minutuko vertical slice-a (1. mundua: Burdin Aroko kastroa)
| Atala | Edukia |
|---|---|
| A · Bidea eta esnatzea | Harri kontrolatu, mugitu, jauzi, kamera; neska eta kastro txikia aurkitu. |
| B · Lehen harria | Harri bat hartu, apuntatu, jaurti eta urrutiko mekanismoa (itua) aktibatu. Arrakasta, hutsegitea eta berreskuratzea ikusgai. |
| C · Lehen zubia | Bi edo hiru blokerekin ertzak lotu; bloke bakoitzak nortasuna, bolumena eta gainazal zapalgarria du. |
| D · Arriskua hurbiltzen | Basurde batek babesa eraikitzen eta ingurua erabiltzen irakasten du. Neska ez da IA akatsengatik harrapatuta geratzen. |
| E · Santutegia | Mekanika guztiak azken puzzle batean; osatu, zinema laburra ikusi eta berriz hasi ahal izan. |

Derrigorrezko probak: pantaila beltzik ez (HTTPS); korrika + kamera + jauzia aldi berean; jauzi aldakorra, coyote
time eta input buffer-a; eraikin solidoak eta irtenbide irisgarria (ezinezkoa harriak agortu eta misioa blokeatzea);
ukipen-kontrol irakurgarriak Safari fisikoan; berrabiaraztea sariak bikoiztu gabe.

## 4. Mailen urrezko araua
Erronka bakoitzak hasierako irakurketa, jokalariaren hipotesia, ekintza egiaztagarria, berehalako feedback-a eta
emaitza eskaintzen ditu. Ibilbide nagusia irakurgarria; aukerako ibilbideek trebetasun-konbinazioak eska ditzakete.

## 5. Binetak 01–12 (lehen abenturaren sarrera eta tutorial diegetikoa)
1. Plano orokorra / egunsentia — Burdin Aroko kastroa muino batean. Kartela: «Duela negu asko…».
2. Plano ertaina / ihesa — Neska iratzeen artean; atzean zuziak eta herri zehatzik gabeko figura armatuak. «Ama…».
3. Xehetasuna / aurkikuntza — Sustraien artean harri biribil goroldiotsua, aurpegirik gabe; margarita bat ondoan. SFX «krak».
4. Lehen planoa / ahotsa — Neskak harria besarkatzen du enbor baten atzean. «Harri… lagundu, mesedez».
5. Xehetasuna / taupada — Harria dardaratzen da; arrakala batek distira txiki bat erakusten du. SFX «dum… dum…».
6. Lehen-lehen planoa — Bi begi anbar irekitzen dira. Bularrean ez dago ikurrik. Harri: «…?».
7. Kontrapikatua / aurkikuntza — Harri baldar altxatzen da, esku handiei begira. Neska: «Kaixo, Harri».
8. Panoramika / arriskua — Bidea erreka batek mozten du; atzean itzalak eta zuziak basoan.
9. Eskuen planoa / saiakera — Harrik harri txiki bat jaurti eta huts egiten du; «plof» uretan. Neskak barre.
10. Plano amerikarra / asmamena — Bi bloke hurbiltzean dardara mineral leun bat; biak elkartzen dira. «Hori da!».
11. Plano orokorra / ekintza — Pieza lotuekin pasabidea uraren gainean. SFX «tok—tok—KRAK».
12. Plano intimista / promesa — Beste ertzean neskak eskua Harriren bular leunean jartzen du; margarita bat kopetan. «Eskerrik asko».

## 6. Agenteen plana (`.claude/agents/`)
| Rola | Entregagarria | Atea |
|---|---|---|
| game-designer / creative-director | Vertical slice-a eta mugimenduaren plazera | 5 minutuko proba dibertigarria |
| technical-artist / art-director | Harriren modeloa (Blender → GLB), adierazpenak, animazio prozeduralak | 02 laminarekiko fideltasuna, bular leuna |
| gameplay-programmer / engine-programmer | Harri-fisika, talkak, kontrolak | Unit proba eta jokagarritasuna |
| level-designer / world-builder | Kastroa eta zubia | Ibilbide osoa |
| narrative-director / writer | 01–12 binetak storyboard eta zinema | Spoiler publikorik ez |
| qa-tester / qa-lead / performance-analyst | Chrome eta Safari iPhone proba errealak | Ebidentzia eta log-ak |

## 7. Onarpen-irizpideak
- Erreferentziekin aldera daitezkeen pantaila-argazkiak (kamera eta eskala berdinak) eta pertsonaiaren berrikuspena.
- Proba osoa kontrol publikoekin; inoiz ez demoaren egoera aldatu arrakasta faltsutzeko.
- Pantaila beltzik ez; Safari iPhone fisikoa eta mahaigaina neurtuta; metrikak eta log-ak txosten batean.
- Lehen mugarria = eszena landu bat, ez 20 maila.
