# Mundu Jolastuak — Euskaraz Games

Euskaraz Games-en 31 mini-jokoren bilduma esperimentala.

- Sarrera: `/mundu-jolastuak/`.
- Jokatu: `/mundu-jolastuak/play.html?joko=skyfarer`.
- Katalogoa: `public/mundu-jolastuak/jokoak.json` (31 erregistro, jatorrizko estekak).
- Proxy baimendua: `src/mundu-jolastuak.js`. Jatorrizko URL baimenduak soilik; Cloudflare Workerren bidez, zerbitzariaren kanpoko menpekotasuna.
- Euskarazko testuak: `public/mundu-jolastuak/euskara.js`. HTML DOMeko esaldi generikoak dinamikoki moldatzen ditu; **ez** ditu 3D testurak, irudiak, ahotsak edo canvas barruko etiketak aldatzen.
- Segurtasuna: iframeak `sandbox` du, `allow-same-origin` gabe, jokoaren scriptak atariko jatorritik isolatzeko.
- Kanpoko azpiegitura: jatorrizko Vercel zerbitzua erabilgarri egon behar da; haren hutsegiteek jolasa oztopa dezakete.
- Mugikorra: joko guztiak ez dira ukipen-pantailetarako egokiak.
- Lizentzia: jatorrizko iturburu-kodea MIT, © 2026 Lovis Odin. Ikusi `LICENSE-original-MIT.txt`. Irudi eta audio bakoitzaren baldintzak egiaztatzea komeni da geroko artxibo iraunkorrak egiteko.

## QA / egiaztapenak
1. Egiaztatu `jokoak.json` barruko 31 `upstreamPath` guztiak Workerren zerrendarekin bat datozela.
2. Ireki hasierako orria eta `play.html`, probatu teklatu bidezko kontrolak, birkargatzea eta pantaila osoa.
3. Probatu `clockwork-heist` (JS modularra), `ink-fox` (localStorage eskuragarritasuna sandboxean) eta gainerako 29 jokoak benetako nabigatzaileetan.
4. Konpondu etorkizuneko CORS/asset edota sandbox arazoak. Ez dago azken end-to-end probako ziurtagiririk.

**Kontuan izan:** hau ez da oraindik 31 jokoen euskaratze oso eta autonomoa; lehen integrazio teknikoa eta oinarrizko interfazearen lokalizazioa dira.
