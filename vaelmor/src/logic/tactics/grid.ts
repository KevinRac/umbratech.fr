/**
 * Grille de combat : cases, terrains, déplacements et portées (GDD §9.5).
 *
 * - Déplacement en 4 directions ; chaque case coûte le `moveCost` de son
 *   terrain (§3.5), une case `null` est infranchissable.
 * - On traverse ses alliés (compagnie et alliés verts) mais pas ses ennemis
 *   (zone de contrôle) ; on ne s'arrête jamais sur une case occupée.
 * - Portées en distance de Manhattan.
 */
import type { TerrainDef } from '../../data/schemas';
import { hostile, type BattleMap, type BattleState, type BattleUnit, type Cell } from './types';

export const DIRECTIONS: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export const cellIndex = (map: BattleMap, x: number, y: number): number => y * map.width + x;
export const cellOf = (map: BattleMap, index: number): Cell => ({ x: index % map.width, y: Math.floor(index / map.width) });
export const inBounds = (map: BattleMap, x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height;
export const distance = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function terrainAt(map: BattleMap, x: number, y: number): TerrainDef {
  const terrain = map.terrains[cellIndex(map, x, y)];
  if (!terrain || !inBounds(map, x, y)) throw new RangeError(`Case ${x},${y} hors de la carte de combat`);
  return terrain;
}

/** Construit la carte d'un combat depuis ses lignes de texte (une lettre par case, décision n°53). */
export function parseBattleMap(rows: readonly string[], legend: Readonly<Record<string, string>>, terrains: readonly TerrainDef[]): BattleMap {
  const byId = new Map(terrains.map((t) => [t.id, t]));
  const height = rows.length;
  const width = [...(rows[0] ?? '')].length;
  const cells: TerrainDef[] = [];
  rows.forEach((row, y) => {
    const chars = [...row];
    if (chars.length !== width) throw new Error(`Carte de combat : la ligne ${y} fait ${chars.length} cases au lieu de ${width}`);
    chars.forEach((char, x) => {
      const terrain = byId.get(legend[char] ?? '');
      if (!terrain) throw new Error(`Carte de combat : lettre « ${char} » inconnue (case ${x},${y})`);
      cells.push(terrain);
    });
  });
  return { width, height, terrains: cells };
}

export const isAlive = (unit: BattleUnit): boolean => unit.hp > 0;

/** Unité vivante sur une case, ou null. */
export function unitAt(state: BattleState, x: number, y: number): BattleUnit | null {
  return state.units.find((u) => u.hp > 0 && u.x === x && u.y === y) ?? null;
}

export function getUnit(state: BattleState, id: string): BattleUnit {
  const unit = state.units.find((u) => u.id === id);
  if (!unit) throw new Error(`Unité inconnue : ${id}`);
  return unit;
}

/**
 * Mobilité de la phase en cours : −1 si enlisé (jamais moins de 1), plafonnée
 * par un statut (Entravé : 0, Harponné : 2) ; après « Pas de marée », ce qui
 * reste du déplacement offert.
 */
export function mobility(unit: BattleUnit): number {
  if (unit.cantoLeft > 0) return unit.cantoLeft;
  const base = Math.max(1, unit.stats.mob - (unit.bogged ? 1 : 0));
  return unit.moveCap === null ? base : Math.min(base, unit.moveCap);
}

export interface Reach {
  /** Coût pour atteindre chaque case visitée (index → coût). */
  readonly cost: ReadonlyMap<number, number>;
  /** Case précédente sur le meilleur chemin (index → index). */
  readonly prev: ReadonlyMap<number, number>;
  /** Cases où l'unité peut finir son déplacement (libres, ou sa propre case). */
  readonly stops: readonly Cell[];
}

/**
 * Plus courts chemins depuis la case d'une unité (Dijkstra), dans la limite de
 * `budget` (sa mobilité par défaut ; `Infinity` pour une carte de distances).
 */
export function reachable(state: BattleState, unit: BattleUnit, budget: number = mobility(unit), from: Cell = unit): Reach {
  const { map } = state;
  const cost = new Map<number, number>();
  const prev = new Map<number, number>();
  const blocked = new Set<number>();
  const occupied = new Set<number>();
  for (const other of state.units) {
    if (other.hp <= 0 || other === unit) continue;
    const i = cellIndex(map, other.x, other.y);
    occupied.add(i);
    if (hostile(other.team, unit.team)) blocked.add(i);
  }

  const start = cellIndex(map, from.x, from.y);
  cost.set(start, 0);
  // File de priorité simple : les cartes font au plus 32×24 cases.
  const open: number[] = [start];
  while (open.length > 0) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if ((cost.get(open[k] as number) ?? 0) < (cost.get(open[best] as number) ?? 0)) best = k;
    const current = open.splice(best, 1)[0] as number;
    const c = cellOf(map, current);
    const base = cost.get(current) ?? 0;
    for (const d of DIRECTIONS) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      if (!inBounds(map, nx, ny)) continue;
      const ni = cellIndex(map, nx, ny);
      if (blocked.has(ni)) continue;
      const step = terrainAt(map, nx, ny).moveCost;
      if (step === null) continue;
      const total = base + step;
      if (total > budget) continue;
      if (total < (cost.get(ni) ?? Infinity)) {
        cost.set(ni, total);
        prev.set(ni, current);
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }

  const stops: Cell[] = [];
  for (const i of [...cost.keys()].sort((a, b) => a - b)) if (!occupied.has(i)) stops.push(cellOf(map, i));
  return { cost, prev, stops };
}

export function canStop(reach: Reach, map: BattleMap, cell: Cell): boolean {
  return reach.stops.some((s) => s.x === cell.x && s.y === cell.y) && inBounds(map, cell.x, cell.y);
}

/** Chemin (cases successives, départ compris) jusqu'à une case atteinte. */
export function pathTo(reach: Reach, map: BattleMap, to: Cell): Cell[] {
  let i: number | undefined = cellIndex(map, to.x, to.y);
  if (!reach.cost.has(i)) return [];
  const path: Cell[] = [];
  while (i !== undefined) {
    path.unshift(cellOf(map, i));
    i = reach.prev.get(i);
  }
  return path;
}

/** Cases à portée [min, max] d'une case. */
export function cellsInRange(map: BattleMap, from: Cell, range: readonly [number, number]): Cell[] {
  const out: Cell[] = [];
  const [min, max] = range;
  for (let dy = -max; dy <= max; dy++) {
    for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < min || d > max) continue;
      const x = from.x + dx;
      const y = from.y + dy;
      if (inBounds(map, x, y)) out.push({ x, y });
    }
  }
  return out;
}

export const inWeaponRange = (unit: BattleUnit, from: Cell, target: Cell): boolean => {
  const d = distance(from, target);
  return d >= unit.weapon.range[0] && d <= unit.weapon.range[1];
};

/** Ennemis vivants qu'une unité peut frapper depuis une case. */
export function targetsFrom(state: BattleState, unit: BattleUnit, from: Cell): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && hostile(u.team, unit.team) && inWeaponRange(unit, from, u));
}

/**
 * Zone de menace d'une unité : toutes les cases qu'elle peut frapper ce tour-ci
 * (déplacement compris). Sert à l'affichage des cases rouges (GDD §9.5).
 */
export function threatCells(state: BattleState, unit: BattleUnit, reach: Reach = reachable(state, unit)): Set<number> {
  const out = new Set<number>();
  for (const stop of reach.stops) for (const c of cellsInRange(state.map, stop, unit.weapon.range)) out.add(cellIndex(state.map, c.x, c.y));
  return out;
}

/** Unités vivantes du même côté (compagnie + alliés verts, ou ennemis), l'unité comprise. */
export function friendsOf(state: BattleState, unit: BattleUnit): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && !hostile(u.team, unit.team));
}

/** Unités vivantes du camp adverse. */
export function foesOf(state: BattleState, unit: BattleUnit): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && hostile(u.team, unit.team));
}

/** Case franchissable et libre (pour poser une unité). */
export function isFreeCell(state: BattleState, x: number, y: number): boolean {
  return inBounds(state.map, x, y) && terrainAt(state.map, x, y).moveCost !== null && unitAt(state, x, y) === null;
}

/**
 * Case libre la plus proche de `target` (en distance de Manhattan, puis dans
 * l'ordre des cases), qui soit reliée à `anchor` par des cases franchissables
 * si une ancre est donnée. Sert à faire entrer les renforts et à poser les invocations.
 */
export function nearestFreeCell(state: BattleState, target: Cell, anchor: Cell | null = null, taken: ReadonlySet<number> = new Set()): Cell | null {
  const { map } = state;
  let linked: Set<number> | null = null;
  if (anchor) {
    linked = new Set<number>();
    const start = cellIndex(map, anchor.x, anchor.y);
    const queue = [start];
    linked.add(start);
    while (queue.length > 0) {
      const i = queue.shift() as number;
      const c = cellOf(map, i);
      for (const d of DIRECTIONS) {
        const nx = c.x + d.x;
        const ny = c.y + d.y;
        if (!inBounds(map, nx, ny) || terrainAt(map, nx, ny).moveCost === null) continue;
        const ni = cellIndex(map, nx, ny);
        if (linked.has(ni)) continue;
        linked.add(ni);
        queue.push(ni);
      }
    }
  }
  const tx = Math.max(0, Math.min(map.width - 1, target.x));
  const ty = Math.max(0, Math.min(map.height - 1, target.y));
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = cellIndex(map, x, y);
      if (taken.has(i) || !isFreeCell(state, x, y)) continue;
      if (linked && !linked.has(i)) continue;
      const d = Math.abs(x - tx) + Math.abs(y - ty);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}
