# Mundu Jolastuak · euskarazko 31 jokoen kode-artxiboa

Jatorrizko 31 jokoen HTML/JS iturburu-kodea GitHuben artxibatuta dago, `public/mundu-jolastuak/games/` karpetan; originalak: https://github.com/lovisdotio/video-to-game (© 2026 Lovis Odin, MIT).

- Katalogoa: `/mundu-jolastuak/`
- Jolasteko: `/mundu-jolastuak/play.html?joko=skyfarer`
- Joko bakoitzaren kode lokala: `/mundu-jolastuak/games/<slug>/index.html`
- Itzulpena: `euskara.js` DOM eta Canvas 2D testu ikusgarrietarako; ez da oraindik itzulpen osoa.
- `src/mundu-jolastuak.js`: jatorrizko repoan ez dauden `assets/` multimedia-fitxategiak aldi baterako demoaren domeinu baimendutik eskaintzen ditu. `../brand/` kontroladore fitxategia ere bai.
- `play.html`: iframe sandbox isolatua; nabigatzailean probatu behar da.

**Garrantzitsua:** honek kodearen iraunkortasuna hobetzen du, baina *ez* da oraindik bideojokoen artxibo multimedia autonomoa. Jatorrizko GitHub repoan ez dago irudien, musiken, 3D ereduen eta soinu fitxategien bilduma; ez dira kopiatu ezta beren lizentziak egiaztatu ere. CDNeko Three.js eta beste kanpoko menpekotasunak ere badira. Funtzionamendua erabat independentea izateko, baliabide bakoitza lortu, lizentzia egiaztatu, bertan gorde eta erreferentziak egokitu beharko dira.

## Egiaztatzeko
1. `jokoak.json` 31 `slug` = `games/<slug>/index.html` 31.
2. Clockwork Heist, Starlight Train eta Hourglass jokoek beren JS fitxategiak artxibatuta dituzte.
3. Jokoak pantaila osoan, teklatuan eta mugikorrean benetan probatu; hainbat ez daude mugikorrerako prestatuta.
4. Kontrolen eta testu zehatzen itzulpena pertsonaz gainbegiratu.
5. Baimenak lortu eta falta diren multimedia-fitxategien manifestua osatu.

Jatorrizko MIT lizentzia: `LICENSE-original-MIT.txt`.
