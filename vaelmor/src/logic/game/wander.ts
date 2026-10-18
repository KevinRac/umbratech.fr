/**
 * Déambulation des PNJ (jalon M2, décision n°63 révisée) : chacun se promène à
 * pied, case par case, dans une zone circulaire autour de son poste (`at`), puis
 * s'arrête un moment, et repart. Logique pure : la carte et les obstacles
 * mobiles (autres PNJ, héros) sont fournis par des fonctions, le hasard par `Rng`.
 */
import type { Rng } from '../rng';

export interface Tile {
  readonly x: number;
  readonly y: number;
}

export type Direction = 'n' | 's' | 'e' | 'w';

/** Cases de la zone, accessibles à pied depuis le poste, en marchant d'une case à l'autre (4 directions). */
export function reachableTiles(home: Tile, radius: number, walkable: (x: number, y: number) => boolean): Tile[] {
  const key = (x: number, y: number): number => y * 4096 + x;
  const seen = new Set<number>([key(home.x, home.y)]);
  const out: Tile[] = [home];
  const queue: Tile[] = [home];
  while (queue.length > 0) {
    const cur = queue.shift() as Tile;
    for (const [dx, dy] of STEPS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (Math.abs(x - home.x) > radius || Math.abs(y - home.y) > radius) continue;
      if (seen.has(key(x, y)) || !walkable(x, y)) continue;
      seen.add(key(x, y));
      const tile = { x, y };
      out.push(tile);
      queue.push(tile);
    }
  }
  return out;
}

const STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Plus court chemin (cases à parcourir, départ exclu) dans la zone, ou null. */
export function findPath(from: Tile, to: Tile, home: Tile, radius: number, walkable: (x: number, y: number) => boolean): Tile[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number): number => y * 4096 + x;
  const previous = new Map<number, Tile | null>([[key(from.x, from.y), null]]);
  const queue: Tile[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift() as Tile;
    for (const [dx, dy] of STEPS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (Math.abs(x - home.x) > radius || Math.abs(y - home.y) > radius) continue;
      if (previous.has(key(x, y)) || !walkable(x, y)) continue;
      previous.set(key(x, y), cur);
      if (x === to.x && y === to.y) {
        const path: Tile[] = [];
        let node: Tile | null = { x, y };
        while (node && !(node.x === from.x && node.y === from.y)) {
          path.push(node);
          node = previous.get(key(node.x, node.y)) ?? null;
        }
        return path.reverse();
      }
      queue.push({ x, y });
    }
  }
  return null;
}

export interface WanderOptions {
  readonly home: Tile;
  /** Rayon de la zone, en cases (0 : le PNJ reste à son poste). */
  readonly radius: number;
  /** Vitesse de marche, en cases par seconde. */
  readonly speed: number;
  readonly minPauseMs: number;
  readonly maxPauseMs: number;
}

export const DEFAULT_WANDER = { speed: 1.35, minPauseMs: 2500, maxPauseMs: 9000 } as const;

/** Délai avant de retenter un pas quand la case suivante est prise. */
const BLOCKED_RETRY_MS = 350;
const MAX_BLOCKED_RETRIES = 6;

/** Un PNJ qui se promène : une case à la fois, avec une position intermédiaire pendant le pas. */
export class Wanderer {
  /** Case occupée (ou quittée, pendant un pas). */
  private tile: Tile;
  private next: Tile | null = null;
  /** Avancement du pas en cours, de 0 à 1. */
  private progress = 0;
  private path: Tile[] = [];
  private waitMs: number;
  private retries = 0;
  private dir: Direction;
  private zone: Tile[] | null = null;

  constructor(
    private readonly options: WanderOptions,
    private readonly walkable: (x: number, y: number) => boolean,
    rng: Rng,
    facing: Direction = 's',
  ) {
    this.tile = options.home;
    this.dir = facing;
    this.waitMs = rng.int(this.options.minPauseMs / 2, this.options.maxPauseMs);
  }

  get facing(): Direction {
    return this.dir;
  }

  /** Oriente le PNJ (conversation). */
  face(direction: Direction): void {
    if (!this.walking) this.dir = direction;
  }

  get walking(): boolean {
    return this.next !== null;
  }

  /** Cases réservées : celle d'où il part et celle où il va. */
  get reserved(): readonly Tile[] {
    return this.next ? [this.tile, this.next] : [this.tile];
  }

  get currentTile(): Tile {
    return this.tile;
  }

  /** Position des pieds en pixels (centre bas de la case, interpolée pendant un pas). */
  position(tileSize: number): { x: number; footY: number } {
    const a = this.tile;
    const b = this.next ?? this.tile;
    const t = this.progress;
    return {
      x: (a.x + (b.x - a.x) * t) * tileSize + tileSize / 2,
      footY: (a.y + 1 + (b.y - a.y) * t) * tileSize,
    };
  }

  /** Zone atteignable (calculée à la demande, une fois). */
  private reachable(): Tile[] {
    this.zone ??= reachableTiles(this.options.home, this.options.radius, this.walkable);
    return this.zone;
  }

  /**
   * Avance de `dtMs`. `canEnter` dit si une case est libre en ce moment (autre PNJ,
   * héros). Pendant `hold`, le PNJ finit son pas puis s'arrête (conversation).
   */
  update(dtMs: number, rng: Rng, canEnter: (x: number, y: number) => boolean, hold = false): void {
    if (this.options.radius <= 0) return;
    let remaining = dtMs;
    while (remaining > 0) {
      if (this.next) {
        const stepMs = 1000 / this.options.speed;
        const need = (1 - this.progress) * stepMs;
        if (remaining < need) {
          this.progress += remaining / stepMs;
          return;
        }
        remaining -= need;
        this.tile = this.next;
        this.next = null;
        this.progress = 0;
        if (this.path.length === 0) this.waitMs = rng.int(this.options.minPauseMs, this.options.maxPauseMs);
        continue;
      }
      if (hold) return;
      if (this.waitMs > 0) {
        if (remaining < this.waitMs) {
          this.waitMs -= remaining;
          return;
        }
        remaining -= this.waitMs;
        this.waitMs = 0;
      }
      if (this.path.length === 0) {
        this.chooseDestination(rng);
        if (this.path.length === 0) {
          this.waitMs = rng.int(this.options.minPauseMs, this.options.maxPauseMs);
          if (remaining < 1) return;
          continue;
        }
      }
      const step = this.path[0] as Tile;
      if (!canEnter(step.x, step.y)) {
        this.retries++;
        if (this.retries > MAX_BLOCKED_RETRIES) {
          this.path = [];
          this.retries = 0;
          this.waitMs = rng.int(this.options.minPauseMs, this.options.maxPauseMs);
        } else {
          this.waitMs = BLOCKED_RETRY_MS;
        }
        continue;
      }
      this.retries = 0;
      this.path.shift();
      this.next = step;
      this.progress = 0;
      const dx = step.x - this.tile.x;
      const dy = step.y - this.tile.y;
      this.dir = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n';
    }
  }

  private chooseDestination(rng: Rng): void {
    const zone = this.reachable();
    if (zone.length < 2) return;
    // Destinations à au moins deux cases d'ici, pour de vraies promenades.
    for (let attempt = 0; attempt < 6; attempt++) {
      const goal = rng.pick(zone);
      if (Math.abs(goal.x - this.tile.x) + Math.abs(goal.y - this.tile.y) < 2) continue;
      const path = findPath(this.tile, goal, this.options.home, this.options.radius, this.walkable);
      if (path && path.length > 0) {
        this.path = path;
        return;
      }
    }
  }
}
