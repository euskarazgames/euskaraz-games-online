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
- **BASAJAUNEN LEIZEA**, lehen leizea: zortzi gela (sutegiak, garai-zubiak, kaxen puzzlea, borroka,
  oihartzunen gela iluna, zaindaria, katearen putzua eta etsai nagusia), giltza txikiak, giltza nagusia,
  mapa txikia eta tresna berria: **SUGAARREN KATEA** (suge-eraztunetara tiratu, kaxak erakarri, etsaiak
  zorabiatu). Etsai nagusia, **Basajaun Iluna**: uhinak, harkaitzak, laguntzaileak eta bizkarreko
  eraztuna (katea) → bihotza (sorginkeria), hiru plakatan.
- Borroka: **FINKATU** (T edo ◎: helburua finkatu, kamerak biak enkoadratzen ditu, Amaiur alboka
  mugitzen da) eta **EZKUTUA** (INDARRA kargatzean aurretik datozen proiektilak itzultzen dira; Basajauni
  bere harkaitza itzuliz gero, zorabiatuta geratzen da).
- Kamera eta irakurgarritasuna: Amaiur eta kameraren artean dauden hormak, etxeak eta zuhaitzak
  gardendu egiten dira; leizean argia zuziek eta Amaiurren kriseiluak ematen dute.
- Iturburua: `tools/leizeak/src/` (`game.js`, `world.js`, `npc.js`, `txalaparta.js`, `dungeon.js`,
  `rooms.js`, `boss.js`, `chain.js`, `lockon.js`, `story.js`, `combat.js`, `magic.js`, `craft.js`,
  `runes.js`, `music.js`) → `python3 tools/leizeak/build.py` (three.js OIHARTZUN-en fitxategitik
  ateratzen da; modeloak `tools/leizeak/models/*.glb`-tik, `build_models.mjs`-ek KayKit-etik sortuak).
- Fitxategi bakarreko bertsioa: `python3 tools/leizeak/standalone.py /tmp/LEIZEEN_DEIA.html`
- Probak: `tools/test/leizeak_route.js` (bide osoa hasieratik amaierako eszenaraino: elkarrizketak,
  txalaparta, atea, leizeko gela guztiak eta Basajaun) eta `tools/test/leizeak_combat.js` (FINKATU,
  EZKUTUA, garaien ezkutuak, sendabelarra). Proba-kakoa: `?test` → `window.__game`.

## Cloudflare
- Worker-aren izena: `euskaraz-games-online`
- Erro-direktorioa: `/`
- Build komandoa: hutsik
- Deploy komandoa: `npx wrangler deploy`

Ez erabili Cloudflare-ren fitxategi-igotzaile zuzena proiektu honetarako.
