/**
 * Cartes de combat tirées du monde (GDD §9.2 « terrain échantillonné »,
 * décision n°57) : le combat se joue sur le terrain réel autour du point de
 * contact. Une rivière, un gué, une lisière, un village, une côte deviennent
 * le champ de bataille, case pour case.
 *
 * 1. `sampleTerrain` choisit une fenêtre de la carte du monde qui contient le
 *    point de contact (décalée si besoin pour éviter de jouer dans la mer) et
 *    convertit chaque case (`convertCell`) : le combat affiche l'art du monde
 *    (décision n°59), le terrain suit donc ce qui est dessiné — sol gardé,
 *    murs de bâtiments, portes visitables, falaises, arbres, obstacles.
 * 2. `placeUnits` pose la compagnie et les ennemis : un camp au point de
 *    contact, l'autre à ~10 cases de déplacement, chacun groupé et
 *    toujours relié à l'autre par un chemin praticable.
 *
 * Module pur : la carte du monde est lue à travers `TerrainSource`.
 */
import type { TerrainDef } from '../../data/schemas';
import { COLLISION, type WorldMap } from '../../data/worldMap';
import type { Rng } from '../rng';
import { DIRECTIONS, cellIndex, distance, inBounds, terrainAt } from './grid';
import type { BattleMap, Cell } from './types';

/** Ce que le combat lit du monde. */
export interface TerrainSource {
  readonly width: number;
  readonly height: number;
  /** Terrain du sol (identifiant de terrains.json). */
  terrain(x: number, y: number): string;
  /** Case bloquée du monde (bâtiment, tronc, rocher, rempart, passage fermé). */
  blocked(x: number, y: number): boolean;
  /** Case dans un lieu habité (village, ville, camp). */
  settlement(x: number, y: number): boolean;
  /** Porte d'un bâtiment dessinée sur cette case (décision n°59). */
  door(x: number, y: number): boolean;
  /** Valeur de zone (couche `zones`), 0 si aucune. */
  zone(x: number, y: number): number;
}

const SETTLEMENTS = new Set(['village', 'ville', 'camp']);

export function worldTerrainSource(map: WorldMap): TerrainSource {
  const size = map.tileSize;
  const settled = new Uint8Array(map.width * map.height);
  for (const loc of map.locations) {
    if (!SETTLEMENTS.has(loc.kind)) continue;
    const x0 = Math.floor(loc.x / size);
    const y0 = Math.floor(loc.y / size);
    for (let y = y0; y < y0 + Math.ceil(loc.height / size); y++) {
      for (let x = x0; x < x0 + Math.ceil(loc.width / size); x++) if (x >= 0 && y >= 0 && x < map.width && y < map.height) settled[y * map.width + x] = 1;
    }
  }
  const at = (x: number, y: number): number => Math.min(map.height - 1, Math.max(0, y)) * map.width + Math.min(map.width - 1, Math.max(0, x));
  const doors = new Set<number>();
  for (const o of map.ambient) if (o.kind === 'door') doors.add(at(Math.floor(o.x / size), Math.floor(o.y / size)));
  return {
    width: map.width,
    height: map.height,
    terrain: (x, y) => map.terrainByGid.get(map.ground[at(x, y)] as number) ?? 'plaine',
    blocked: (x, y) => {
      const c = map.collision[at(x, y)];
      return c === COLLISION.blocked || c === COLLISION.gate;
    },
    settlement: (x, y) => settled[at(x, y)] === 1,
    door: (x, y) => doors.has(at(x, y)),
    zone: (x, y) => map.zones[at(x, y)] as number,
  };
}

export interface SampledTerrain {
  /** Coin haut-gauche de la fenêtre, en cases du monde. */
  readonly origin: Cell;
  /** Terrain de combat de chaque case, rangée par rangée. */
  readonly rows: readonly (readonly string[])[];
  /** Point de contact dans la fenêtre. */
  readonly site: Cell;
}

/**
 * Fenêtre de `size` cases autour de `site` : on garde le point de contact à
 * au moins 3 cases du bord et on privilégie la fenêtre la plus praticable,
 * puis la plus centrée.
 */
export function sampleTerrain(src: TerrainSource, site: Cell, size: { width: number; height: number }, terrains: readonly TerrainDef[]): SampledTerrain {
  const passable = new Map(terrains.map((t) => [t.id, t.moveCost !== null]));
  const w = Math.min(size.width, src.width);
  const h = Math.min(size.height, src.height);
  const clampX = (x: number): number => Math.max(0, Math.min(src.width - w, x));
  const clampY = (y: number): number => Math.max(0, Math.min(src.height - h, y));
  const centered = { x: clampX(site.x - Math.floor(w / 2)), y: clampY(site.y - Math.floor(h / 2)) };
  const margin = Math.min(3, Math.floor(w / 2), Math.floor(h / 2));

  let best = centered;
  let bestScore = -Infinity;
  for (let oy = clampY(site.y - h + 1 + margin); oy <= clampY(site.y - margin); oy++) {
    for (let ox = clampX(site.x - w + 1 + margin); ox <= clampX(site.x - margin); ox++) {
      let open = 0;
      for (let y = oy; y < oy + h; y += 2) for (let x = ox; x < ox + w; x += 2) if (!src.blocked(x, y) && passable.get(src.terrain(x, y)) !== false) open++;
      const score = open * 4 - 6 * (Math.abs(ox - centered.x) + Math.abs(oy - centered.y));
      if (score > bestScore) {
        bestScore = score;
        best = { x: ox, y: oy };
      }
    }
  }

  const rows: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) row.push(convertCell(src, best.x + x, best.y + y));
    rows.push(row);
  }
  return { origin: best, rows, site: { x: site.x - best.x, y: site.y - best.y } };
}

/**
 * Terrain de combat d'une case du monde (décision n°59 : ce qui est dessiné fait
 * foi, puisque le combat affiche l'art du monde). Une case libre garde son sol ;
 * une case bloquée devient, selon ce qu'elle porte : la porte d'un bâtiment
 * (case visitable), le mur d'un bâtiment, une falaise (amas de rochers), un
 * arbre de forêt (couvert praticable) ou un obstacle (objet isolé).
 */
function convertCell(src: TerrainSource, x: number, y: number): string {
  const ground = src.terrain(x, y);
  if (!src.blocked(x, y)) return ground === 'village' ? 'route' : ground;
  if (ground === 'montagne' || ground === 'riviere' || ground === 'eau_profonde') return ground;
  if (src.door(x, y)) return 'village';
  let blockedAround = 0;
  let blockedSides = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!(dx || dy) || !src.blocked(x + dx, y + dy)) continue;
      blockedAround++;
      if (dx === 0 || dy === 0) blockedSides++;
    }
  }
  if (src.settlement(x, y)) return blockedSides > 0 ? 'batiment' : 'obstacle';
  if (ground === 'foret') return 'foret';
  return blockedAround >= 4 ? 'montagne' : 'obstacle';
}

/** Coûts de déplacement depuis une case, sans tenir compte des unités (Dijkstra). */
export function terrainDistances(map: BattleMap, from: Cell): Map<number, number> {
  const cost = new Map<number, number>([[cellIndex(map, from.x, from.y), 0]]);
  const open: number[] = [cellIndex(map, from.x, from.y)];
  while (open.length > 0) {
    let k = 0;
    for (let i = 1; i < open.length; i++) if ((cost.get(open[i] as number) ?? 0) < (cost.get(open[k] as number) ?? 0)) k = i;
    const current = open.splice(k, 1)[0] as number;
    const cx = current % map.width;
    const cy = Math.floor(current / map.width);
    for (const d of DIRECTIONS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!inBounds(map, nx, ny)) continue;
      const step = terrainAt(map, nx, ny).moveCost;
      if (step === null) continue;
      const ni = cellIndex(map, nx, ny);
      const total = (cost.get(current) ?? 0) + step;
      if (total < (cost.get(ni) ?? Infinity)) {
        if (!cost.has(ni)) open.push(ni);
        cost.set(ni, total);
      }
    }
  }
  return cost;
}

function nearestPassable(map: BattleMap, from: Cell): Cell {
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (terrainAt(map, x, y).moveCost === null) continue;
      const d = distance(from, { x, y });
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  if (!best) throw new Error('Carte de combat sans aucune case praticable.');
  return best;
}

/** Nombre de cases praticables dans un rayon de 2 (ouverture d'un lieu). */
function openness(map: BattleMap, c: Cell): number {
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inBounds(map, c.x + dx, c.y + dy) && terrainAt(map, c.x + dx, c.y + dy).moveCost !== null) n++;
  return n;
}

const cellOfIndex = (map: BattleMap, i: number): Cell => ({ x: i % map.width, y: Math.floor(i / map.width) });

export interface Placement {
  readonly deploy: readonly Cell[];
  /** Une case par ennemi, dans l'ordre donné (le boss éventuel sur sa case). */
  readonly enemies: readonly Cell[];
}

/**
 * Pose les deux camps. `anchor` dit qui se tient au point de contact :
 * « player » (le héros a croisé des ennemis, embuscade) ou « enemy » (le
 * héros attaque un repaire : le boss tient le point de contact).
 */
export function placeUnits(map: BattleMap, site: Cell, anchor: 'player' | 'enemy', partySize: number, enemies: readonly { readonly boss?: boolean }[], rng: Rng): Placement {
  const home = nearestPassable(map, site);
  const fromHome = terrainDistances(map, home);
  // L'autre camp : à 9-14 de coût de déplacement, dans un endroit ouvert, de préférence sur une route.
  let other: Cell | null = null;
  let otherScore = -Infinity;
  for (const [i, cost] of fromHome) {
    if (cost < 8 || cost > 15) continue;
    const c = cellOfIndex(map, i);
    const t = terrainAt(map, c.x, c.y);
    const score = openness(map, c) + (t.tags.includes('route') ? 4 : 0) - Math.abs(cost - 11) + rng.next() * 3;
    if (score > otherScore) {
      otherScore = score;
      other = c;
    }
  }
  if (!other) {
    // Petite poche praticable : on prend la case accessible la plus éloignée.
    let far = -1;
    for (const [i, cost] of fromHome) if (cost > far) [far, other] = [cost, cellOfIndex(map, i)];
  }
  const away = other as Cell;
  const playerAnchor = anchor === 'player' ? home : away;
  const enemyAnchor = anchor === 'player' ? away : home;
  const fromPlayer = anchor === 'player' ? fromHome : terrainDistances(map, playerAnchor);
  const fromEnemy = anchor === 'enemy' ? fromHome : terrainDistances(map, enemyAnchor);
  const taken = new Set<number>();

  // Compagnie : les cases les plus proches de son point, côté opposé aux ennemis.
  const deploy = [...fromPlayer.entries()]
    .filter(([i]) => (fromEnemy.get(i) ?? Infinity) >= (fromEnemy.get(cellIndex(map, playerAnchor.x, playerAnchor.y)) ?? 0) - 2)
    .sort((a, b) => a[1] - b[1] || (fromEnemy.get(b[0]) ?? 0) - (fromEnemy.get(a[0]) ?? 0))
    .slice(0, partySize)
    .map(([i]) => {
      taken.add(i);
      return cellOfIndex(map, i);
    });

  // Ennemis : le boss au point du camp ennemi, les autres autour, espacés, à distance de la compagnie.
  const candidates = [...fromEnemy.entries()]
    .filter(([i]) => {
      if (taken.has(i) || (fromPlayer.get(i) ?? Infinity) < 5) return false;
      // Pas d'ennemi collé à la compagnie de l'autre côté d'un obstacle (rivière, mur) : 4 cases au moins à vol d'oiseau.
      const c = cellOfIndex(map, i);
      return deploy.every((d) => distance(d, c) >= 4);
    })
    .map(([i, cost]) => ({ i, key: cost + rng.next() * 3 }))
    .sort((a, b) => a.key - b.key);
  const placed: Cell[] = [];
  const enemyCells: Cell[] = enemies.map(() => ({ x: -1, y: -1 }));
  const bossIndex = enemies.findIndex((e) => e.boss);
  const take = (i: number): Cell => {
    taken.add(i);
    const c = cellOfIndex(map, i);
    placed.push(c);
    return c;
  };
  if (bossIndex >= 0) enemyCells[bossIndex] = take(cellIndex(map, enemyAnchor.x, enemyAnchor.y));
  enemies.forEach((_, k) => {
    if (k === bossIndex) return;
    const spaced = candidates.find((c) => !taken.has(c.i) && placed.every((p) => distance(p, cellOfIndex(map, c.i)) >= 2));
    const any = spaced ?? candidates.find((c) => !taken.has(c.i));
    if (!any) throw new Error('Carte de combat trop petite pour placer tous les ennemis.');
    enemyCells[k] = take(any.i);
  });
  if (deploy.length < partySize) throw new Error('Carte de combat trop petite pour déployer la compagnie.');
  return { deploy, enemies: enemyCells };
}
