# EUSKARAZ GAMES · Cloud Online

**EUSKARAZ GAMES** Cloudflare Workers-en hedatzeko prestatutako proiektua, GitHub bidez.

Ataria euskara hutsean dago, eta beti euskara pasatzen die jokoei (`window.__EG_LANG = "eu"`).

## Egitura
- `public/index.html`: ataria (arina; joko bakoitza irekitzen denean bakarrik kargatzen du).
- `public/games/<jokoa>.html`: joko bakoitza bere fitxategian (`pilota`, `zesta`, `artzain`, `basoa`, `itsas`, `oihartzun`).
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

## Cloudflare
- Worker-aren izena: `euskaraz-games-online`
- Erro-direktorioa: `/`
- Build komandoa: hutsik
- Deploy komandoa: `npx wrangler deploy`

Ez erabili Cloudflare-ren fitxategi-igotzaile zuzena proiektu honetarako.
