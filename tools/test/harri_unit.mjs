// HARRI · unit probak (Node): inbentarioa, eraikuntza, desmuntaketa eta berrabiaraztea.  node tools/test/harri_unit.mjs
import { BuildGrid, Inventory, MAX_CANTILEVER } from '../../public/harri/src/grid.js';
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('✗', msg); } else console.log('✓', msg); };

// Erreka: j=12,13,14 ura (hondoa -2.2), ertzak 0 altueran; ertz urrunak j<=11, hurbilekoak j>=15.
const stream = { groundTop: (i, j) => (j >= 12 && j <= 14) ? -2.2 : 0, solidCell(i, j, k) { return this.groundTop(i, j) >= k + 1 - 0.01; } };
{
  const g = new BuildGrid(stream);
  ok(!g.canPlace(0, 13, -1).ok, 'erdiko gelaxka ezin da bakarrik jarri (euskarririk ez)');
  ok(g.place('b1', 0, 14, -1).ok, 'lehen blokea ertz hurbilari lotuta (ainguratua)');
  ok(g.place('b2', 0, 13, -1).ok, 'bigarrena zintzilik (dist 2)');
  ok(g.place('b3', 0, 12, -1).ok, 'hirugarrenak ertz urrunarekin lotzen du');
  ok(g.walkable(-1, (i, j) => j === 14, (i, j) => j === 12), 'zubia zapalgarria da ertz batetik bestera');
  ok(g.structures().length === 1, 'hiru blokeek egitura bakarra osatzen dute (lotura-grafoa)');
  ok(!g.place('b1', 3, 14, -1).ok, 'id bera ezin da bi aldiz jarri (bikoizketarik ez)');
  const r = g.remove(0, 14, -1);
  ok(r.removed && r.removed.id === 'b1', 'DESMUNTATU: blokea itzultzen da');
  ok(r.dropped.length === 0, 'b2 eta b3 ertz urrunetik eutsita jarraitzen dute (dist 1, 2)');
  const r2 = g.remove(0, 12, -1);
  ok(r2.dropped.map(b => b.id).join() === 'b2', 'euskarririk gabe geratutakoa askatu eta itzultzen da (ez da galtzen)');
  ok(g.list().length === 0, 'sarea hutsik: material guztia berreskuratuta');
}
{ // Zabalera 5: erdiko gelaxka MAX_CANTILEVER-etik haratago dago
  const wide = { groundTop: (i, j) => (j >= 10 && j <= 14) ? -3 : 0, solidCell(i, j, k) { return this.groundTop(i, j) >= k + 1 - 0.01; } };
  const g = new BuildGrid(wide);
  g.place('a', 0, 14, -1); g.place('b', 0, 13, -1); g.place('c', 0, 10, -1); g.place('d', 0, 11, -1);
  ok(!g.canPlace(0, 12, -1).ok, `5eko hutsunea: erdikoa ezin da (MAX_CANTILEVER=${MAX_CANTILEVER})`);
}
{ // Zutabea eta eskailera lur lauan
  const flat = { groundTop: () => 0, solidCell(i, j, k) { return k < 0; } };
  const g = new BuildGrid(flat);
  ok(g.place('p1', 5, 5, 0).ok && g.place('p2', 5, 5, 1).ok, 'zutabea: bi bloke bata bestearen gainean');
  ok(!g.canPlace(5, 5, 3).ok, 'ezin da airean jarri (hutsunea azpian)');
  ok(g.canPlace(6, 5, 1).ok, 'alboko zintzilikatua (dist 1) zutabetik');
  const r = g.remove(5, 5, 0);
  ok(r.dropped.length === 1 && r.dropped[0].id === 'p2', 'oinarria kentzean goikoa askatzen da');
}
{ // Inbentarioa
  const inv = new Inventory(3);
  ok(inv.add('h1') && inv.add('h2') && inv.add('h3'), 'hiru harri hartu');
  ok(!inv.add('h4'), 'laugarrena ez (gehienez 3)');
  ok(!inv.add('h1'), 'id bera bi aldiz ez');
  ok(inv.take() === 'h3' && inv.count === 2, 'jaurtitzean bat kentzen da');
  inv.clear(); ok(inv.count === 0, 'berrabiaraztean hutsik');
}
console.log(`\n${n - fails}/${n} proba ondo`); process.exit(fails ? 1 : 0);
