# EUSKARAZ GAMES · Cloud Online

**EUSKARAZ GAMES** Cloudflare Workers-en hedatzeko prestatutako proiektua, GitHub bidez.

Atari osoa eta joko guztiak euskara hutsean daude: ez dago hizkuntza-hautatzailerik, eta atariak
beti euskara pasatzen die jokoei (`window.__EG_LANG = "eu"`). Gordetako hizkuntza-hobespen zaharrak
(`kirol-lang`, `elur-lang`, `oihartzun-language`, `ataria-lang`) ez dira kontuan hartzen.

## Egitura
- `public/index.html`: ataria (arina; joko bakoitza irekitzen denean bakarrik kargatzen du).
- `public/games/<jokoa>.html`: joko bakoitza bere fitxategian (`pilota`, `zesta`, `artzain`, `basoa`, `itsas`, `oihartzun`, `leizeak`).
  `elur.html` OIHARTZUN-en aurreko bertsioa da (ELUR JOKOA), haren hasierako pantailatik irekitzen dena.
- `public/assets/egfx.js`: jokoen grafiko-modulu partekatua (benetako testurak, zeruak, ura, mendiak).
- `public/assets/tex`, `sky`, `covers`: CC0 testurak, zeruak eta atariko azalak. Kredituak: `public/assets/CREDITS.md`.
- `src/worker.js`: WebSocket zerbitzaria, Durable Objects-ekin.
- `wrangler.jsonc`: Cloudflare Workers-en konfigurazioa.
- `package.json`: Wrangler.
- `DESIGN.md`: sistema bisuala (koloreak, tipografia, osagaiak eta jokoen arau grafikoak).
- `tools/`: testurak birsortzeko scriptak (`tools/assets`) eta jokoak pantaila-argazkiekin probatzekoak (`tools/test`).
- `.claude/skills/`: Clauderentzako diseinu-tresnak (Impeccable, Taste, Playwright CLI eta `euskaraz-gfx`).

## Grafikoak
Jokoek CC0 testura fotografikoak (Poly Haven, ambientCG) erabiltzen dituzte, erliebearekin (normal map),
benetako zeruekin eta giro-argiztapenarekin. Zerbait kargatzean huts egiten badu, joko bakoitza bere
betiko testuretara itzultzen da automatikoki. Mugikor motelean kalitatea bere kabuz egokitzen da.
Jokoaren URLko aukerak:
- `?gfx=0`: jatorrizko grafikoak (testura berririk gabe).
- `?gfx=lite`: modu arina.
- `?gfx=high`: beti kalitate gorena.

## OIHARTZUN
Ekintza, plataformak eta puzzleak 3Dn, bi garairekin: iragana (ilunabarra, itsaso bizia) eta oraina
(egun oskarbia, itsaso izoztua). Amaiur **magia jaurtitzen duen sorgina** da: izpiak berak bilatzen du
helburua (xede automatikoa), segidako hirugarrenak hiru izpi jaurtitzen ditu, botoia mantenduz
**INDARRA** kargatzen da (zeharkatu eta eztanda egiten duen izpi handia) eta, BULTZADA bitartean,
biraka-kolpea ematen du. Etsaiak **hezurdura animatuak** dira (KayKit, CC0, GitHub): korrika oldartzen
diren ezpatariak, tiro egin eta teleportatzen diren magoak eta aizkorarekin oldartzen diren gudariak.
Bakoitza bere begien koloreko garaian bakarrik zauritzen da. **KATEA** kontagailua, kamera geldoa azken
hilketan eta gero eta biziagoak diren etsai-olatuak.
- Uharte bakoitza kaiola bat da: ezin da erori, eta irteera erronka gainditzean irekitzen da (borroka
  edo «Ultrahand» erako kaxa-eraikuntza). Askatutako uharteetan garaien araberako **erruna-puzzleak** daude.
- **Gauekoren Orratza**: Celeste erako igoera, 5. uhartetik (y 11) hodeien gaineko erlojuraino (y 42):
  airean zintzilik dauden harri basaltikoak, garai-kristalak, BULTZADA berritzen duten kristal berdeak,
  erortzen diren harriak, haize-korrontea, espiritu-harriak agerrarazten dituen erruna eta hiru
  kontrol-kanpai (erortzean ez da bizitzarik galtzen).
- Misterioz eta bihurguneez betetako gidoia: Amaiurren egunkariko orriak begizta-zenbakiekin, uharte
  bakoitzaren amaieran galdera bat zabalik uzten duten eszena laburrak, Gauekoren maskararen
  bihurgunea eta amaieraren ondorengo azken irrati-mezua.
- Itsasoz inguratutako mundu irekia: oraina egun oskarbia da itsaso izoztuaren gainean, eta iragana
  ilunabarra itsaso biziarekin. Horizontean herrixkak eta itsasargiak dituzten uharteak daude, eta
  iraganean nabigatzen duten belaontziak orainean izotzean harrapatuta geratzen dira. Uharteetako
  kaiolak ikusezinak dira (ertza ukitzean txinpartak bakarrik), eta haien zutoinak arena bat ixten
  denean bakarrik altxatzen dira.
- Kamera: bertikalean bere kabuz urruntzen da (ikus-eremu handiagoa). Hatza pantailan arrastatuz biratu
  egiten da (ezker/eskuin) eta hurbildu edo urrundu (gora/behera); bi hatzez atximur eginez zooma, eta bi
  ukitu azkarrekin zentratu. Ordenagailuan: saguaren eskuineko botoia eta gurpila. ⤢ botoia: hiru
  distantzia eta zentratu.
- Botere errazak mugikorrean: BOTERE-BOTOI bakarra, behar denean bakarrik agertzen dena (ESKUA
  eraikuntza-guneetan, eta EGINDA eraikitzen ari zarenean; IGO plataforma baten azpian; GELDITU zubi
  mugikorren edo izpien ondoan; EHUNDU beste garai bateko zubi baten ertzean; EKIN erlojuaren aurrean).
  «⋯» botoiak menu osoa irekitzen du.
- Azken etsaia lau fasetan: nukleoan hiru argiko ezkutua, proiektil-koroak eta errefortzuak. Lau
  amaiera, hiru kanpai eta lau aukerako orri. Geruzaka sintetizatutako musika epikoa.
- Iturburu-kode irakurgarria: `tools/oihartzun/src/` (`game.js`, `combat.js`, `magic.js`, `ascent.js`,
  `story.js`, `runes.js`, `arena.js`, `craft.js`, `horizon.js`, `music.js`) → `python3 tools/oihartzun/build.py`.
  Testuak `L(euskara, gaztelania)` bidez idatzita daude, baina jokoak euskarazkoa bakarrik erakusten du.
- Modeloak: `tools/oihartzun/models/*.glb` (`build_models.mjs`-ekin sortuak, KayKit-etik).
- Fitxategi bakarreko bertsioa: `python3 tools/oihartzun/standalone.py /tmp/OIHARTZUN.html`
- Probak: `tools/test/oihartzun_routes.js` (ibilbideak, puzzleak, Orratz osoa eta errunak benetako
  fisikarekin), `tools/test/oihartzun_combat.js` (bot batek arenak urrunetik gainditzen ditu),
  `tools/test/oihartzun_boss.js` (azken etsai osoa eta azken bihurgunea), `tools/test/errcheck.js`.

## LEIZEEN DEIA (OIHARTZUN II)
OIHARTZUN-en unibertsoko abentura berria eta originala (`public/games/leizeak.html`): ez du beste
jokoen edukirik erabiltzen; istorioa, pertsonaiak, mailak, mekanikak eta musika joko honetarako
sortu dira, euskal mitologiatik abiatuta (Mari, Basajaun, jentilak, Gaueko, Sugaar). Diseinu-analisia
eta bide-orria: `tools/leizeak/DISEINUA.md`.
- **IBARRA**, haran irekia (hub-a): herria plaza, eliza, frontoia, errementaria eta portuarekin; ibaia
  eta zubia; ipar-zelaiak, harrespila muinoan eta basoa leizearen atariarekin. Herritarrak (Pello eta
  Peio txalapartariak, Iratiren oihartzuna, Maddi errementaria eta denda, Joanes artzaina, Kattalin,
  jentil zaharra), eginkizunak (hiru ardi, txalapartarien erronka), arnasa-zatiak eta txanponak.
- **TXALAPARTA**, mekanika sinatua: espiritu batek erritmo bat jotzen du eta Amaiurrek errepikatu egiten
  du (EZKERRA / ESKUINA). Ikasitako erritmoak edonon jo daitezke: **ESNATU** (◀ ◀ ▶) jentil-harriak
  altxatzen ditu (eskailerak, leizearen atea) eta **ENTZUN** (▶ ◀ ▶ ▶) ezkutuko plataformak eta kutxak
  agerian uzten ditu. Musikak ere txalaparta-geruza du haranean.
- Harana organikoa da: erliebe jarraitua (muinoak, malkarrak, arroila, sakonunea), bide kurbatuak,
  ibaia zubiekin, portua eta Artzainen lepoa (Tartaloren kobara). Bizirik dago: herritarrak ibilian,
  animaliak, kea, txinpartak, giro-hotsak; eta misterioz beteta: harri-oihartzunak, egunkaria (L),
  sendabelarrak, burdin-harriak (Maddiren makila), hosto-pilen azpiko kutxak, erronkak.
- **BASAJAUNEN LEIZEA**, lehen leizea: zortzi gela (sutegiak, garai-zubiak, kaxen puzzlea, borroka,
  oihartzunen gela iluna, zaindaria, katearen putzua eta etsai nagusia), giltza txikiak, giltza nagusia,
  mapa txikia eta tresna berria: **SUGAARREN KATEA** (suge-eraztunetara tiratu, kaxak erakarri, etsaiak
  zorabiatu). Etsai nagusia, **Basajaun Iluna**: uhinak, harkaitzak, laguntzaileak eta bizkarreko
  eraztuna (katea) → bihotza (sorginkeria), hiru plakatan.
- **LAMIEN LEIZEA**, bigarren leizea (ekialdeko ur-jauziaren atzean): ura iraganean, izotza orainean;
  errota, korua, herensugea (zaindaria) eta tresna berria: **HAIZE-ADARRA** (V: haize-errotak biratu,
  balsak bultzatu, laino lamiarra uxatu, hosto-pilak hegan bidali, proiektilak desbideratu). Etsai
  nagusia, **Lamia Iluna**: kantua eta lainoa → adarra → igerian → ORAINERA (izoztuta) → orrazia jo.
- **TARTALOREN KOBA**, hirugarren leizea (Artzainen lepoaren goian): ardi-korta, **begiaren gela**
  (Tartaloren begiak zirrikitutik zaintzen du: harrien eta ardien atzean ezkutatu), burruntziaren
  sutegia (zaindaria) eta tresna berria: **SUGAR-IZPIA** (INDARRA kargatuta, izpia sua da: egurrezko
  hesiak erre, Gauekoren izotza urtu, burdinazko galdarak urrutitik piztu). Etsai nagusia,
  **Tartalo**: lau galdarak piztu → argiak itsutzen du → begia jo (edo bere harkaitza itzuli).
- **JENTILBARATZA**, laugarren leizea (harrespilako trikuharriaren azpian, ESNATU jota): jentilen hiri
  lurperatua, gela konektatuekin eta itzulerekin. **SUTONDOAK** (atseden-lekuak: arnasa bete eta
  kontrol-puntua), **LASTERBIDEAK** (alde batetik bakarrik irekitzen diren barrak; arrakala bat apurtuta,
  jauzi atalasera), heura (iraganean), kanpaiak sareen atzean (urrutitik jo; bat orainean bakarrik),
  harresia (borroka), harri-zaina (zaindaria) eta tresna berria: **TXIMISTARRIA**. Dorrean, zutabea
  heuraz igo eta goitik lau kanpaia (bat harri arrakalatu baten barruan). Etsai nagusia, **Errolan**,
  jentil erraldoia: harkaitza altxatzen duenean TXIMISTARRIA oinetara (harria buruan erortzen zaio),
  eskukada ALDARATU, harkaitzak EZKUTUAz itzuli → belauniko, bularreko ekaitz-harria agerian.
- **JENTILEN ZERUA**, bosgarren leizea: jentil zaharrak **ORTZI** erritmoa irakasten du (◀ ▶ ▶ ◀ ▶);
  harrespilan jotzean **ortzadarra** jaiotzen da, eta haren gainean oinez igotzen da hodeien gainera.
  Hodei-itsasoaren gaineko uharte zaharrak: hodei-harriak (IRAGANEAN trinkoak; garaia airean aldatu),
  laino trinkoa (HAIZE-ADARRA → bide ezkutua), zeruko plaza (borroka, giltza, sutondoa), jentilen
  haize-errota (adarrarekin biratu → harrizko igogailua), hodei-zaina (zaindaria) eta tresna berria:
  **ENARAREN HEGOAK** (jauzi bikoitza eta eutsi: planeatu; **haize-zutabeek** gora eramaten dute,
  batzuk ORAINEAN bakarrik). Tximista-dorrean hiru ekaitz-kanpaia eta heura (giltza nagusia), enaren
  habia (ezkutuko uhartetxoa) eta **ekaitz-hesia**. Etsai nagusia, **Odei**, trumoiaren hodeia:
  tximistak, kazkabarra eta haize-boladak (HAIZE-ADARRAz geldiarazi); herriek ekaitzen aurka kanpaiak
  jotzen zituzten bezala, lau ekaitz-kanpaiak elkarren segidan → hodeia urratu, bihotza goian agerian →
  haize-zuloetatik gora planeatuz, SORGINKERIA. Hiru txanda, kanpaiak gero eta garai gehiagotan banatuta.
- Istorioa: hiru zaindari askatu ondoren, Irati eta azken eszena (zazpi argi Anboto gainean:
  hiru berde, lau gorri); Errolan askatu ondoren, laugarren argia berde bihurtzen da; Odei askatu
  ondoren, bosgarrena (Herensugea eta Inguma falta) → JARRAITZEKO…
- **HERRIA, etxez etxe**: etxe bakoitzak bere izena du atearen gainean (PELLONEA, OKINENEA,
  GOIKOETXEA, ARTZAINENEA, ARRANTZALENEA, BELARRENEA, MENDIETA, OSTATUA…) eta norbait bizi da barruan.
  **ATEA JO**: egunez ala gauez, nor dagoen etxean eta istorioa nola doan, erantzun desberdinak (Maiteren
  ogi beroak arnasa itzultzen du, Mikelen amonak sendabelar-botila bat ematen du, Mendietakoak itzultzen
  dira zaindariak askatu ahala…). **ITURRALDE**, Amaiur eta Iratiren etxea, barrutik: sutondoa
  (atseden eta kontrol-puntua), ohea (lo egin egunsentira edo ilunabarrera arte), Iratiren txokoa eta
  zaindarien **oroitzapenen apala** (askatutako zaindari bakoitzak oroigarri bat uzten du).
- **EGUNA ETA GAUA** ("gaua gauekoentzat, eguna egunekoentzat"): Basajaun askatu ondoren haranean
  denbora ibiltzen da. Gauez: izarrak eta ilargia, leiho eta farolak, Amaiurren kriseilua; herritarrak
  etxera doaz eta plazako txalapartak bakarrik jotzen du; **Gauekoren itzalak** zelaietan (herrira ez
  dira sartzen; egunsentian hautsi) eta **arima-argiak** (hamar, gauez bakarrik: Kattalinek elizako
  argizaiolak pizten ditu → sariak). Kattalinek **EGUZKILORE** erritmoa irakasten du (▶ ▶ ◀ ◀),
  eguzkilorea harrespilan bildu ondoren (iraganean eta egunez): hurrengo egunsentira edo
  ilunabarrera; leizean, itzalak zorabiatzen ditu.
- **POTTOKA**: Beltxa, Joanesen pottoka (basati ipar-larreetan). Ardiak itzuli ondoren, Joanesek
  **POTTOKA** erritmoa irakasten du (◀ ▶ ◀ ◀): haranean jotzean lauhazka dator. E: igo / jaitsi; zaldiz
  azkarrago (Shift: lauhazka), jauzi luzea; leizeetara ez da sartzen.
- **HARANEKO MISTERIOAK**: leizeetako tresnekin itzultzeko sekretuak — sasi-habia (SUA), ibaiko
  harri-zutabea (KATEA), errota zaharra (HAIZE-ADARRA), dorre zaharra (HEURA, iraganean) eta
  jentil-harria (TXIMISTARRIA). Egunkarian agertzen dira ikusten direnean.
- **HEURA**: heuraz estalitako hormak igo daitezke (hormaren kontra bultzatu; gora/behera/alboetara;
  JAUZI: gora edo atzera; goian ertzera igotzen da). Heura iraganean dago bizirik; orainean izoztuta,
  eta garaia aldatuz gero, erori egiten zara.
- **TXIMISTARRIA** (X edo TXIMISTA botoia): tximista-harria jaurti; 1.7 s-ra trumoia: harri
  arrakalatuak apurtu, itzalak zorabiatu (garaiaren ezkutua gorabehera), kanpaiak jo. Hiru harri,
  berez betetzen dira; HAIZE-ADARRAk bultzatzen ditu. Kontuz: hurbilegi, Amaiur ere zauritzen du.
- **KANPAIAK**: jentilen kanpaiak, SORGINKERIAz urrutitik jotzen dira (sareen atzean ere); denak
  batera, denbora-mugarekin.
- Borroka: **FINKATU** (T edo ◎: helburua finkatu, kamerak biak enkoadratzen ditu, Amaiur alboka
  mugitzen da), **EZKUTUA** (INDARRA kargatzean aurretik datozen proiektilak itzultzen dira eta
  gorputz-kolpeak geldiarazten, karga galduta; Basajauni bere harkaitza itzuliz gero, zorabiatuta geratzen
  da) eta **ALDARATU** (kolpea iristen den unean SORGINKERIA sakatu, behin: kolpea desbideratzen da,
  etsaia zorabiatuta geratzen da eta kalte bikoitza jasotzen du; segidan sakatzeak ez du balio).
- **Kolpe sendoak**: kolpe bakoitzean etsaia zuri distiratzen da eta zapaltzen, txinpartak kolpearen
  noranzkoan eta talka-izarra, hots lehorra (bakoitza apur bat desberdin), atzera bultzada eta
  izozte labur bat (kolpe handietan gehiago); bizitzarik gabe, puxika bat bezala puztu eta lehertzen da.
- **ESTALPEAK**: zutabeek, kutxek eta harri-blokeek itzalen proiektilak geldiarazten dituzte (ezkutatu
  atzean); borroka-gela batzuetan blokeek gela azpi-espazioetan banatzen dute, eta haien atzean,
  kameratik ezkutuan, txanpon-zorroak daude.
- Kamera eta irakurgarritasuna: Amaiur eta kameraren artean dauden hormak, etxeak eta zuhaitzak
  gardendu egiten dira; leizean argia zuziek eta Amaiurren kriseiluak ematen dute.
- Iturburua: `tools/leizeak/src/` (`game.js`, `world.js`, `haran.js`, `ibarra.js`, `bizia.js`,
  `quests.js`, `npc.js`, `txalaparta.js`, `dungeon.js`, `rooms.js`, `boss.js`, `lamia.js`, `tartalo.js`,
  `adarra.js`, `gaua.js`, `pottoka.js`, `sekretuak.js`, `heura.js`, `tximista.js`, `jentilak.js`,
  `enara.js` (planeatzea, haize-zutabeak), `zerua.js` (Jentilen zerua, ortzadarra), `odei.js`,
  `herria.js` (etxe-izenak, ATEA JO, Iturralde),
  `chain.js`, `lockon.js`, `story.js`, `combat.js`,
  `magic.js`, `craft.js`, `runes.js`, `music.js`) → `python3 tools/leizeak/build.py` (three.js OIHARTZUN-en fitxategitik
  ateratzen da; modeloak `tools/leizeak/models/*.glb`-tik, `build_models.mjs`-ek KayKit-etik sortuak).
- Fitxategi bakarreko bertsioa: `python3 tools/leizeak/standalone.py /tmp/LEIZEEN_DEIA.html`
- Probak: `tools/test/leizeak_route.js` (bide osoa hasieratik lehen leizearen amaierako eszenaraino),
  `tools/test/leizeak_combat.js` (FINKATU, EZKUTUA, garaien ezkutuak, sendabelarra),
  `tools/test/leizeak_valley.js` (haranaren fisika: maldak, ibaia, zubiak, lepoa),
  `tools/test/leizeak_quests.js` (misterioak eta eginkizunak), `tools/test/leizeak_lamia.js`
  (bigarren leizea osoa), `tools/test/leizeak_tartalo.js` (hirugarren leizea osoa, ezkutuka eta
  Tartalo barne, eta azken eszena), `tools/test/leizeak_gaua.js` (eguna/gaua, EGUZKILORE, itzalak,
  arima-argiak), `tools/test/leizeak_pottoka.js` (Beltxa: deitu, igo, lauhazka, jaitsi),
  `tools/test/leizeak_sekretuak.js` (haraneko bost misterioak), `tools/test/leizeak_trebetasunak.js`
  (ALDARATU, EZKUTUA, HEURA, TXIMISTARRIA, kanpaiak), `tools/test/leizeak_jentilak.js` (laugarren
  leizea osoa: trikuharria, sutondoa, lasterbideak, Errolan eta azken eszena) eta
  `tools/test/leizeak_zerua.js` (bosgarrena: ORTZI, ortzadarra, hodei-harriak, igogailua, ENARA eta
  haize-zutabeak, dorrea, habia, ekaitz-hesia, Odei eta azken eszena) eta `tools/test/leizeak_herria.js`
  (etxe-izenak, ATEA JO egunez eta gauez, Iturralde barrutik, kolpe sendoak eta estalpeak).
  Proba-kakoa: `?test` → `window.__game`.

## Cloudflare
- Worker-aren izena: `euskaraz-games-online`
- Erro-direktorioa: `/`
- Build komandoa: hutsik
- Deploy komandoa: `npx wrangler deploy`

Ez erabili Cloudflare-ren fitxategi-igotzaile zuzena proiektu honetarako.
