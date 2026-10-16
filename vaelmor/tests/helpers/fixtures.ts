/**
 * Cartes de test dessinées en texte.
 *   .  libre      #  bloqué      ~  eau      ,  zone lente      G  passage verrouillé (drapeau « boss_test »)
 */
import { loadGameData } from '../../src/data';
import type { MapObject, WorldMap } from '../../src/data/worldMap';
import { CollisionGrid } from '../../src/logic/world/collision';
import type { MovementConfig } from '../../src/logic/world/movement';

export const TILE = 16;
export const GATE_FLAG = 'boss_test';

export function movementConfig(): MovementConfig {
  return loadGameData().balance.exploration;
}

const CODES: Record<string, number> = { '.': 0, '#': 1, '~': 2, ',': 3, G: 4 };

export function gridFromRows(rows: readonly string[], openFlags: readonly string[] = []): CollisionGrid {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const values = new Uint8Array(width * height);
  const gates = new Map<number, string>();
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Ligne ${y} de longueur ${row.length}, ${width} attendu`);
    [...row].forEach((ch, x) => {
      const code = CODES[ch];
      if (code === undefined) throw new Error(`Caractère de carte inconnu « ${ch} »`);
      values[y * width + x] = code;
      if (ch === 'G') gates.set(y * width + x, GATE_FLAG);
    });
  });
  const grid = new CollisionGrid(width, height, TILE, values, gates);
  grid.setOpenFlags(openFlags);
  return grid;
}

/** Centre en pixels (pieds au bas de la case) d'une case de la grille. */
export function cellFeet(x: number, y: number): { x: number; y: number } {
  return { x: x * TILE + TILE / 2, y: (y + 1) * TILE - 1 };
}

/** Objet de carte de test ; `id` est la propriété « id » (identifiant de contenu), pas l'identifiant Tiled. */
export function makeObject(partial: Partial<Omit<MapObject, 'id'>> & { id: string }): MapObject {
  const { id, ...rest } = partial;
  return { id: 1, name: id, kind: 'village', x: 0, y: 0, width: 0, height: 0, props: { id }, ...rest };
}

/** Carte du monde minimale pour les tests de zones. */
export function makeWorldMap(zonesRows: readonly string[], locations: readonly MapObject[] = []): WorldMap {
  const height = zonesRows.length;
  const width = zonesRows[0]?.length ?? 0;
  const zones = new Uint8Array(width * height);
  zonesRows.forEach((row, y) => [...row].forEach((ch, x) => (zones[y * width + x] = ch === '.' ? 0 : Number(ch))));
  const size = width * height;
  return {
    width,
    height,
    tileSize: TILE,
    ground: new Uint16Array(size).fill(1),
    decor: new Uint16Array(size),
    canopy: new Uint16Array(size),
    collision: new Uint8Array(size),
    zones,
    terrainByGid: new Map([[1, 'plaine']]),
    locations,
    gates: [],
    spawns: [],
    ambient: [],
    gateFlagByCell: new Map(),
  };
}
