import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { COLLISION, parseWorldMap, type MapObject, type WorldMap } from '../src/data/worldMap';
import { CollisionGrid } from '../src/logic/world/collision';
import { createBody, stepBody } from '../src/logic/world/movement';
import { findPath, reachableCells } from '../src/logic/world/pathfinding';
import { findSpawn, objectCenter } from '../src/logic/world/worldState';
import { generateWorld } from '../tools/world/generate';
import { cellFeet, movementConfig } from './helpers/fixtures';

const data = loadGameData();
const root = resolve(import.meta.dirname, '..');
const raw = JSON.parse(readFileSync(resolve(root, 'assets/maps/world.json'), 'utf8')) as unknown;
const parsed = parseWorldMap(raw, { zones: data.zones, terrains: data.terrains, tileSize: data.balance.exploration.tileSize });
if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
const map: WorldMap = parsed.map;
const ALL_FLAGS = data.zones.flatMap((z) => (z.unlockFlag === null ? [] : [z.unlockFlag]));

const cellOf = (o: MapObject): { x: number; y: number } => {
  const p = objectCenter(o);
  return { x: Math.floor(p.x / map.tileSize), y: Math.floor(p.y / map.tileSize) };
};
const byId = (list: readonly MapObject[], id: string): MapObject => {
  const found = list.find((o) => o.props['id'] === id);
  if (!found) throw new Error(`objet « ${id} » absent`);
  return found;
};
/** Le générateur prend plusieurs secondes : une seule génération, partagée par les tests. */
let generatedOnce: ReturnType<typeof generateWorld> | null = null;
const generated = (): ReturnType<typeof generateWorld> => (generatedOnce ??= generateWorld(data.zones));
const GENERATION_TIMEOUT = 30_000;
const zoneOf = (o: MapObject): number => map.zones[cellOf(o).y * map.width + cellOf(o).x] as number;

describe('carte du monde (assets/maps/world.json)', () => {
  it('est valide et de la taille prévue', () => {
    expect(map.width).toBe(160);
    expect(map.height).toBe(120);
    expect(map.locations.length).toBeGreaterThanOrEqual(20);
  });

  it('est identique à la sortie du générateur (aucune dérive entre les données et le code)', () => {
    expect(`${JSON.stringify(generated().tiled)}\n`).toBe(readFileSync(resolve(root, 'assets/maps/world.json'), 'utf8'));
  }, GENERATION_TIMEOUT);

  it('place les 5 zones et leurs passages', () => {
    const values = new Set(map.zones);
    for (const z of data.zones) expect(values.has(z.value)).toBe(true);
    const flags = new Set([...map.gateFlagByCell.values()]);
    for (const flag of ALL_FLAGS.filter((f) => f !== 'boss_merrow')) expect(flags.has(flag)).toBe(true);
  });

  it('place chaque lieu dans la zone voulue', () => {
    const expected: Record<string, number> = {
      haut_gue: 1,
      camp_ecumeurs: 1,
      pont_trois_arches: 1,
      ronceval: 2,
      valcendre: 2,
      bosquet_roi_cerf: 2,
      port_brume: 3,
      tour_noye: 3,
      pierre_haute: 4,
      aiguille_brisee: 4,
      citadelle: 5,
    };
    for (const [id, zone] of Object.entries(expected)) expect(zoneOf(byId(map.locations, id)), id).toBe(zone);
  });

  it('laisse libre le départ et les points d’autel', () => {
    const grid = CollisionGrid.fromMap(map);
    for (const spawn of map.spawns) {
      const c = { x: Math.floor(spawn.x / map.tileSize), y: Math.floor(spawn.y / map.tileSize) };
      expect(grid.isSolidCell(c.x, c.y), String(spawn.props['id'])).toBe(false);
    }
  });

  it('verrouillé : seule la zone 1 est atteignable depuis le départ', () => {
    const grid = CollisionGrid.fromMap(map, []);
    const start = findSpawn(map, 'start');
    expect(start).not.toBeNull();
    const seen = reachableCells(grid, { x: Math.floor((start?.x ?? 0) / map.tileSize), y: Math.floor((start?.y ?? 0) / map.tileSize) });
    const zonesSeen = new Set<number>();
    seen.forEach((v, i) => {
      if (v) zonesSeen.add(map.zones[i] as number);
    });
    expect([...zonesSeen]).toEqual([1]);
    for (const id of ['haut_gue', 'camp_ecumeurs', 'pont_trois_arches']) {
      const c = cellOf(byId(map.locations, id));
      expect(seen[c.y * map.width + c.x], id).toBe(1);
    }
    for (const id of ['ronceval', 'port_brume', 'valcendre', 'pierre_haute', 'citadelle']) {
      const c = cellOf(byId(map.locations, id));
      expect(seen[c.y * map.width + c.x], id).toBe(0);
    }
  });

  it('déverrouillé : tous les lieux sont atteignables', () => {
    const grid = CollisionGrid.fromMap(map, ALL_FLAGS);
    const start = findSpawn(map, 'start');
    const seen = reachableCells(grid, { x: Math.floor((start?.x ?? 0) / map.tileSize), y: Math.floor((start?.y ?? 0) / map.tileSize) });
    for (const loc of map.locations) {
      // Le centre d'un autel ou d'un menhir est occupé par le décor : on cherche une case libre dans le rectangle.
      let reached = false;
      for (let y = Math.floor(loc.y / map.tileSize); y < Math.ceil((loc.y + loc.height) / map.tileSize); y++) {
        for (let x = Math.floor(loc.x / map.tileSize); x < Math.ceil((loc.x + loc.width) / map.tileSize); x++) if (seen[y * map.width + x] === 1) reached = true;
      }
      expect(reached, String(loc.props['id'])).toBe(true);
    }
  });

  it('les accessoires ne ferment aucune porte : chaque case devant une porte est atteignable (n°46)', () => {
    const grid = CollisionGrid.fromMap(map, ALL_FLAGS);
    const start = findSpawn(map, 'start');
    const seen = reachableCells(grid, { x: Math.floor((start?.x ?? 0) / map.tileSize), y: Math.floor((start?.y ?? 0) / map.tileSize) });
    const fronts = generated().doorFronts;
    expect(fronts.length).toBeGreaterThan(60);
    const blocked = fronts.filter((d) => seen[d.y * map.width + d.x] !== 1).map((d) => `${d.x},${d.y}`);
    expect(blocked).toEqual([]);
  }, GENERATION_TIMEOUT);

  it('chaque passage ouvre sur la zone qu’il protège (drapeau = zone la plus haute voisine)', () => {
    const flagByValue = new Map(data.zones.map((z) => [z.value, z.unlockFlag]));
    for (const [cell, flag] of map.gateFlagByCell) {
      expect(flagByValue.get(map.zones[cell] as number), `case ${cell}`).toBe(flag);
    }
  });

  it('un joueur simulé rallie chaque lieu avec le vrai code de déplacement (passages ouverts)', () => {
    const grid = CollisionGrid.fromMap(map, ALL_FLAGS);
    const config = movementConfig();
    const start = findSpawn(map, 'start') as { x: number; y: number };
    const from = { x: Math.floor(start.x / map.tileSize), y: Math.floor(start.y / map.tileSize) };
    const body = createBody(cellFeet(from.x, from.y).x, cellFeet(from.x, from.y).y);
    let frames = 0;
    let at = from;
    for (const id of ['haut_gue', 'ronceval', 'valcendre', 'port_brume', 'citadelle', 'aiguille_brisee']) {
      const target = cellOf(byId(map.locations, id));
      const path = findPath(grid, at, target);
      expect(path, `chemin vers ${id}`).not.toBeNull();
      for (const cell of path ?? []) {
        const goal = cellFeet(cell.x, cell.y);
        for (let guard = 0; guard < 600; guard++) {
          const ddx = goal.x - body.x;
          const ddy = goal.y - body.y;
          if (Math.abs(ddx) <= 1.5 && Math.abs(ddy) <= 1.5) break;
          const horizontal = Math.abs(ddx) > 1.5 && (Math.abs(ddx) >= Math.abs(ddy) || Math.abs(ddy) <= 1.5);
          stepBody(body, { dx: horizontal ? Math.sign(ddx) : 0, dy: horizontal ? 0 : Math.sign(ddy), sprint: true }, 1 / 60, grid, config);
          frames++;
          expect(grid.isSolidRect(body.x - 5, body.y - 8, 10, 8), `${id}: dans un mur à ${body.x},${body.y}`).toBe(false);
        }
      }
      at = target;
    }
    expect(frames).toBeGreaterThan(1000);
  });

  it('les cases d’eau, bloquées et de passage existent dans la couche de collision', () => {
    const counts = new Map<number, number>();
    for (const v of map.collision) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (const v of [COLLISION.free, COLLISION.blocked, COLLISION.water, COLLISION.slow, COLLISION.gate]) expect(counts.get(v) ?? 0, `valeur ${v}`).toBeGreaterThan(0);
  });
});
