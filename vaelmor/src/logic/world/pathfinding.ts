/**
 * Recherche de chemin sur la grille de collision : A* en 4 directions.
 *
 * Sert aux tests de parcours (la carte est-elle réellement traversable ?),
 * puis aux patrouilles d'ennemis (M3) et aux PNJ qui marchent (M2).
 * Un couloir d'une case suffit au héros (boîte de 10 px dans une tuile de 16),
 * d'où une grille de cases sans élargissement.
 */
import type { CollisionGrid } from './collision';

export interface Cell {
  readonly x: number;
  readonly y: number;
}

/** Cases atteignables à pied depuis `start`, par propagation. Renvoie un tableau de booléens (1 = atteignable). */
export function reachableCells(grid: CollisionGrid, start: Cell): Uint8Array {
  const seen = new Uint8Array(grid.width * grid.height);
  if (grid.isSolidCell(start.x, start.y)) return seen;
  const queue = new Int32Array(grid.width * grid.height);
  let head = 0;
  let tail = 0;
  queue[tail++] = start.y * grid.width + start.x;
  seen[start.y * grid.width + start.x] = 1;
  while (head < tail) {
    const i = queue[head++] as number;
    const x = i % grid.width;
    const y = (i - x) / grid.width;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid.isSolidCell(nx, ny)) continue;
      const ni = ny * grid.width + nx;
      if (seen[ni] === 1) continue;
      seen[ni] = 1;
      queue[tail++] = ni;
    }
  }
  return seen;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Tas binaire minimal (clé = priorité flottante). */
class MinHeap {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number): void {
    let i = this.items.length;
    this.items.push(item);
    this.keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((this.keys[parent] as number) <= key) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0] as number;
    const lastItem = this.items.pop() as number;
    const lastKey = this.keys.pop() as number;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && (this.keys[l] as number) < (this.keys[m] as number)) m = l;
        if (r < this.items.length && (this.keys[r] as number) < (this.keys[m] as number)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b] as number, this.items[a] as number];
    [this.keys[a], this.keys[b]] = [this.keys[b] as number, this.keys[a] as number];
  }
}

/**
 * Plus court chemin (liste de cases, départ et arrivée inclus) ou null.
 * Les zones lentes coûtent `slowCost` au lieu de 1 : le chemin les évite si possible.
 */
export function findPath(grid: CollisionGrid, from: Cell, to: Cell, slowCost = 2): Cell[] | null {
  if (grid.isSolidCell(from.x, from.y) || grid.isSolidCell(to.x, to.y)) return null;
  const w = grid.width;
  const total = w * grid.height;
  const cost = new Float32Array(total).fill(Infinity);
  const parent = new Int32Array(total).fill(-1);
  const startIndex = from.y * w + from.x;
  const goalIndex = to.y * w + to.x;
  cost[startIndex] = 0;
  const open = new MinHeap();
  open.push(startIndex, 0);

  while (open.size > 0) {
    const i = open.pop();
    if (i === goalIndex) break;
    const x = i % w;
    const y = (i - x) / w;
    const base = cost[i] as number;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid.isSolidCell(nx, ny)) continue;
      const ni = ny * w + nx;
      const next = base + (grid.valueAt(nx, ny) === 3 ? slowCost : 1);
      if (next >= (cost[ni] as number)) continue;
      cost[ni] = next;
      parent[ni] = i;
      open.push(ni, next + Math.abs(nx - to.x) + Math.abs(ny - to.y));
    }
  }

  if (parent[goalIndex] === -1 && goalIndex !== startIndex) return null;
  const path: Cell[] = [];
  for (let i = goalIndex; i !== -1; i = parent[i] as number) {
    path.push({ x: i % w, y: Math.floor(i / w) });
    if (i === startIndex) break;
  }
  return path.reverse();
}

/**
 * Case libre la plus proche de (x, y), en cercles croissants (téléportation de
 * debug, apparition près d'un autel…). Renvoie null si rien n'est libre dans `maxRadius`.
 */
export function nearestFreeCell(grid: CollisionGrid, x: number, y: number, maxRadius = 8): Cell | null {
  if (!grid.isSolidCell(x, y)) return { x, y };
  for (let r = 1; r <= maxRadius; r++) {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (grid.isSolidCell(x + dx, y + dy)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x: x + dx, y: y + dy };
        }
      }
    }
    if (best) return best;
  }
  return null;
}
