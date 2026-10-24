/**
 * Ground Zero 008 — Elevation is a property of the ONE continuous slab.
 * All render vertices and hydrology cells sample the same height function.
 * Metres, world x/z in [-5,5]. Edge top stays at y=0.
 */
export const WORLD_SIZE = 10;
export const WORLD_HALF = WORLD_SIZE / 2;
export const GRID_CELLS = 32;
export const CELL_SIZE = WORLD_SIZE / GRID_CELLS;
export const CELL_AREA = CELL_SIZE * CELL_SIZE;
export const SUBSTRATE_BOTTOM = -0.8;

type Hollow = { x: number; z: number; r: number; depth: number };
const HOLLOWS: readonly Hollow[] = [
  { x: -2.75, z: -2.35, r: 1.12, depth: .17 },
  { x: 2.65, z: -2.05, r: 1.18, depth: .15 },
  { x: .75, z: 2.30, r: 1.37, depth: .19 },
  { x: -2.73, z: 2.22, r: 1.06, depth: .14 },
  { x: -.40, z: -.35, r: .97, depth: .115 },
];
const smooth = (t: number): number => {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
};
export function terrainHeight(x: number, z: number): number {
  // Edge taper preserves the familiar clean 10m diorama silhouette.
  const edge = Math.max(Math.abs(x), Math.abs(z));
  const fade = 1 - smooth((edge - 4.18) / .82);
  let height = .047 * Math.sin(x * .88 + z * .24) * Math.cos(z * .78)
    + .024 * Math.sin(z * 1.45 - x * .42);
  height += .071 * Math.exp(-(((x - 1.25) / 1.6) ** 2 + ((z + .45) / 1.6) ** 2));
  for (const h of HOLLOWS) {
    const d = ((x - h.x) ** 2 + (z - h.z) ** 2) / (h.r * h.r);
    height -= h.depth * Math.exp(-1.8 * d);
  }
  return fade * height;
}

export type TerrainCell = {
  index: number; x: number; z: number; height: number;
  neighbors: readonly number[];
};
export function makeTerrainCells(): TerrainCell[] {
  const cells: TerrainCell[] = [];
  for (let row = 0; row < GRID_CELLS; row++) {
    for (let col = 0; col < GRID_CELLS; col++) {
      const index = row * GRID_CELLS + col;
      const x = -WORLD_HALF + (col + .5) * CELL_SIZE;
      const z = -WORLD_HALF + (row + .5) * CELL_SIZE;
      const neighbors: number[] = [];
      // 8-neighbour connectivity is closer to physical downslope directions
      // than four orthogonal steps; ties resolve by stable cell index.
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dz === 0) continue;
          const r = row + dz, c = col + dx;
          if (r >= 0 && r < GRID_CELLS && c >= 0 && c < GRID_CELLS) {
            neighbors.push(r * GRID_CELLS + c);
          }
        }
      }
      cells.push({ index, x, z, height: terrainHeight(x, z), neighbors });
    }
  }
  return cells;
}

export function isEdgeCell(index: number): boolean {
  const row = Math.floor(index / GRID_CELLS), col = index % GRID_CELLS;
  return row === 0 || col === 0 || row === GRID_CELLS - 1 || col === GRID_CELLS - 1;
}
export function cellIndexAt(x: number, z: number): number {
  const col = Math.max(0, Math.min(GRID_CELLS - 1,
    Math.floor((x + WORLD_HALF) / CELL_SIZE)));
  const row = Math.max(0, Math.min(GRID_CELLS - 1,
    Math.floor((z + WORLD_HALF) / CELL_SIZE)));
  return row * GRID_CELLS + col;
}
