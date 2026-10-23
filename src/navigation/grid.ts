import { WORLD_DEPTH, WORLD_WIDTH } from '../constants';

export type Point2 = { x: number; z: number };
export type Obstacle =
  | { kind: 'circle'; x: number; z: number; radius: number }
  | { kind: 'box'; x: number; z: number; halfX: number; halfZ: number };

const STEPS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1],
] as const;

export class NavigationGrid {
  readonly cellSize: number;
  readonly width: number;
  readonly depth: number;
  private readonly columns: number;
  private readonly rows: number;
  private readonly blockedCells: Uint8Array;

  constructor(obstacles: readonly Obstacle[], cellSize = 1, width = WORLD_WIDTH, depth = WORLD_DEPTH) {
    this.cellSize = cellSize;
    this.width = width;
    this.depth = depth;
    this.columns = Math.floor(width / cellSize) + 1;
    this.rows = Math.floor(depth / cellSize) + 1;
    this.blockedCells = new Uint8Array(this.columns * this.rows);

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const p = this.point(col, row);
        if (Math.abs(p.x) > width / 2 - 0.6 || Math.abs(p.z) > depth / 2 - 0.6 ||
            obstacles.some((obstacle) => this.collides(p, obstacle, 0.42))) {
          this.blockedCells[this.index(col, row)] = 1;
        }
      }
    }
  }

  private collides(p: Point2, obstacle: Obstacle, buffer: number) {
    if (obstacle.kind === 'circle') {
      return Math.hypot(p.x - obstacle.x, p.z - obstacle.z) < obstacle.radius + buffer;
    }
    return Math.abs(p.x - obstacle.x) < obstacle.halfX + buffer &&
      Math.abs(p.z - obstacle.z) < obstacle.halfZ + buffer;
  }

  private index(col: number, row: number) { return row * this.columns + col; }
  private inside(col: number, row: number) {
    return col >= 0 && row >= 0 && col < this.columns && row < this.rows;
  }
  private point(col: number, row: number): Point2 {
    return { x: col * this.cellSize - this.width / 2, z: row * this.cellSize - this.depth / 2 };
  }
  private cell(p: Point2) {
    return {
      col: Math.round((p.x + this.width / 2) / this.cellSize),
      row: Math.round((p.z + this.depth / 2) / this.cellSize),
    };
  }
  private open(col: number, row: number) {
    return this.inside(col, row) && !this.blockedCells[this.index(col, row)];
  }

  isWalkable(p: Point2) {
    const { col, row } = this.cell(p);
    return this.open(col, row);
  }

  // A tap on a wall or prop resolves to the nearest walkable grid point.
  private nearest(p: Point2): { col: number; row: number } | null {
    const cell = this.cell(p);
    if (this.open(cell.col, cell.row)) return cell;
    for (let radius = 1; radius < 16; radius++) {
      let best: { col: number; row: number } | null = null;
      let bestDistance = Infinity;
      for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const col = cell.col + dx, row = cell.row + dz;
        if (!this.open(col, row)) continue;
        const spot = this.point(col, row);
        const dist = Math.hypot(spot.x - p.x, spot.z - p.z);
        if (dist < bestDistance) { bestDistance = dist; best = { col, row }; }
      }
      if (best) return best;
    }
    return null;
  }

  private clearSegment(a: Point2, b: Point2): boolean {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let i = 0; i <= Math.ceil(length / 0.26); i++) {
      const t = i / Math.max(1, Math.ceil(length / 0.26));
      if (!this.isWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
    }
    return true;
  }

  findPath(from: Point2, destination: Point2): Point2[] {
    const start = this.nearest(from);
    const goal = this.nearest(destination);
    if (!start || !goal) return [];
    const total = this.columns * this.rows;
    const score = new Float64Array(total).fill(Infinity);
    const parent = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const startId = this.index(start.col, start.row);
    const goalId = this.index(goal.col, goal.row);
    score[startId] = 0;
    const frontier: { id: number; cost: number }[] = [{ id: startId, cost: 0 }];

    // Binary min-heap: avoids sorting thousands of nodes on long trips.
    const push = (entry: { id: number; cost: number }) => {
      let i = frontier.length;
      frontier.push(entry);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (frontier[p].cost <= entry.cost) break;
        frontier[i] = frontier[p]; i = p;
      }
      frontier[i] = entry;
    };
    const pop = () => {
      const best = frontier[0];
      const last = frontier.pop()!;
      if (frontier.length) {
        let i = 0;
        while (i * 2 + 1 < frontier.length) {
          let c = i * 2 + 1;
          if (c + 1 < frontier.length && frontier[c + 1].cost < frontier[c].cost) c++;
          if (frontier[c].cost >= last.cost) break;
          frontier[i] = frontier[c]; i = c;
        }
        frontier[i] = last;
      }
      return best;
    };
    const heuristic = (col: number, row: number) =>
      Math.hypot(goal.col - col, goal.row - row);

    let found = false;
    while (frontier.length) {
      const current = pop();
      if (closed[current.id]) continue;
      if (current.id === goalId) { found = true; break; }
      closed[current.id] = 1;
      const col = current.id % this.columns;
      const row = Math.floor(current.id / this.columns);
      for (const [dx, dz] of STEPS) {
        const nc = col + dx, nr = row + dz;
        if (!this.open(nc, nr)) continue;
        if (dx && dz && (!this.open(col + dx, row) || !this.open(col, row + dz))) continue;
        const neighborId = this.index(nc, nr);
        if (closed[neighborId]) continue;
        const next = score[current.id] + Math.hypot(dx, dz);
        if (next >= score[neighborId]) continue;
        score[neighborId] = next;
        parent[neighborId] = current.id;
        push({ id: neighborId, cost: next + heuristic(nc, nr) });
      }
    }
    if (!found) return [];

    const points: Point2[] = [];
    for (let id = goalId; id !== -1; id = parent[id]) {
      points.push(this.point(id % this.columns, Math.floor(id / this.columns)));
    }
    points.reverse();
    if (this.isWalkable(from)) points[0] = from;
    if (this.isWalkable(destination)) points[points.length - 1] = destination;

    // String-pull the route, avoiding obvious zigzags while preserving collision clearance.
    const simplified: Point2[] = [];
    for (let i = 0; i < points.length - 1;) {
      let furthest = i + 1;
      for (let j = points.length - 1; j > i + 1; j--) {
        if (this.clearSegment(points[i], points[j])) { furthest = j; break; }
      }
      simplified.push(points[furthest]);
      i = furthest;
    }
    return simplified;
  }
}
