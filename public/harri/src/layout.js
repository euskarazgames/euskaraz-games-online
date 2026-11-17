// 1. MUNDUA · Burdin Aroko kastroa — mailaren diseinua (koordenatuak metrotan; +Z hegoaldea, jokalaria iparrera doa: -Z).
// Eraikuntza-sarea: gelaxka 2×1×2 (x,y,z). Ertzak eta itsaslabarrak 2ko sarean lerrokatuta daude.
export const CELL = { x: 2, y: 1, z: 2 };
export const STREAM = { z0: 10, z1: 16, x0: -34, x1: 34, bed: -2.2, water: -0.5 };      // erreka: 6 m zabal → 3 bloke
export const CLIFF_Z = -14, PLATEAU_Y = 4, PLATEAU_X = 12;                               // santutegiko itsaslabarra (4 m)
export const CHASM = { z0: -34, z1: -28, bottom: -7 };                                    // amildegia: 6 m → 3 bloke
export const ISLAND = { x0: -6, x1: 6, z0: -48, z1: -34 };
export const PALISADE_Z = 38, GATE_HALF = 1.7, PALISADE_H = 3.3;
export const THROW_V = 19;

// Ibilbide nagusia (bide-lurra margotzeko eta belarra kentzeko)
export const PATH = [[2, 86], [2, 78], [1, 70], [0, 61], [-1, 50], [0, 42], [0, 37], [-1, 30], [0, 22], [-1, 17], [0, 9], [-2, 1], [0, -7], [0, -13], [0, -16], [0, -27], [0, -35], [0, -45]];

// Lur lauko eremuak (zaratarik gabe): [x0,x1,z0,z1]
export const FLAT = [[-16, 16, 37, 50], [-22, 22, 16, 38], [-34, 34, 16, 20], [-16, 16, -14, 10], [-8, 8, 48, 90]];

export const CHECKPOINTS = {
  A: { x: 2, y: 0, z: 76, yaw: Math.PI }, B: { x: 0, y: 0, z: 46, yaw: Math.PI }, C: { x: -1, y: 0, z: 20, yaw: Math.PI },
  C2: { x: -1, y: 0, z: 7.5, yaw: Math.PI }, D: { x: -3, y: 0, z: 7.5, yaw: Math.PI }, E: { x: 0, y: 0, z: -9, yaw: Math.PI },
  E2: { x: 0, y: 4, z: -17, yaw: Math.PI }, E3: { x: 0, y: 4, z: -37, yaw: Math.PI },
};

// Harri txikiak (jaurtigarriak): id egonkorrak
export const ROCKS = [
  ['h_b1', -4.0, 45.0], ['h_b2', -3.3, 45.7], ['h_b3', -4.7, 46.1], ['h_b4', -2.6, 44.6],
  ['h_d1', -6.0, 8.6], ['h_d2', -5.3, 9.2], ['h_d3', -6.7, 9.4],
  ['h_e1', -3.0, -17.4, 4], ['h_e2', -2.3, -18.0, 4], ['h_e3', -3.6, -18.3, 4], ['h_e4', -1.0, -38.5, 4], ['h_e5', -1.7, -39.0, 4],
];
// Harrizko blokeak (2×1×2): id egonkorrak, etxeko gelaxka (i,j) eta lurraren altuera k
export const BLOCKS = [
  ['b_c1', 2, 9, 0], ['b_c2', 4, 9, 0], ['b_c3', 3, 10, 0], ['b_c4', -6, 9, 0],          // erreka-ertz hurbilean
  ['b_d1', 1, 2, 0],                                                                        // larrean
  ['b_e1', -3, -6, 0], ['b_e2', 2, -6, 0],                                                   // itsaslabarraren oinean
  ['b_e3', 2, -9, 4], ['b_e4', 3, -10, 4], ['b_e5', -3, -10, 4], ['b_e6', -4, -9, 4],         // goi-lautadan
];
// Haraneko loreak (bildumagarriak): id, x, y, z
export const FLOWERS = [
  ['lore1', 5.5, 2.2, 53.5], ['lore2', -6.5, 0, 81], ['lore3', -13.5, 1.6, 41.5], ['lore4', 17.5, 0, 27.5],
  ['lore5', -26, 0, 17.5], ['lore6', 12.5, 2.4, 1.5], ['lore7', 8, 7.5, -24],
];
