import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldMap } from '../src/data/worldMap';
import { DEFAULT_WANDER, Wanderer, findPath, reachableTiles } from '../src/logic/game/wander';
import { CollisionGrid } from '../src/logic/world/collision';
import { Rng } from '../src/logic/rng';

const data = loadGameData();
const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'assets', 'maps', 'world.json'), 'utf8')) as unknown;
const map = loadWorldMap(raw, { zones: data.zones, terrains: data.terrains, tileSize: data.balance.exploration.tileSize });
const grid = CollisionGrid.fromMap(map);

const doorCells = new Set<number>();
for (const o of map.ambient) {
  if (o.kind !== 'door') continue;
  const x = Math.floor(o.x / map.tileSize);
  const y = Math.floor(o.y / map.tileSize);
  for (const [dx, dy] of [[0, 0], [0, 1], [-1, 1], [1, 1], [0, 2]] as const) doorCells.add((y + dy) * map.width + x + dx);
}
const baseWalkable = (x: number, y: number): boolean => grid.valueAt(x, y) === 0 && !doorCells.has(y * map.width + x);
/** Comme dans le jeu : le poste d'un PNJ est toujours praticable pour lui. */
const walkableFor = (home: readonly [number, number]) => (x: number, y: number): boolean => (x === home[0] && y === home[1]) || baseWalkable(x, y);
const walkable = baseWalkable;
const npcs = data.locations.flatMap((l) => l.npcs);

describe('déambulation des PNJ', () => {
  it('chaque PNJ mobile a une vraie zone de promenade', () => {
    for (const npc of npcs) {
      expect(grid.valueAt(npc.at[0], npc.at[1]), `${npc.id} : poste`).toBe(0);
      if (npc.roam === 0) continue;
      const zone = reachableTiles({ x: npc.at[0], y: npc.at[1] }, npc.roam, walkableFor(npc.at));
      expect(zone.length, `${npc.id} : zone`).toBeGreaterThanOrEqual(8);
    }
  });

  it('le chemin trouvé reste dans la zone et sur des cases libres', () => {
    const home = { x: 75, y: 87 };
    const zone = reachableTiles(home, 6, walkable);
    const goal = zone[zone.length - 1] as (typeof zone)[number];
    const path = findPath(home, goal, home, 6, walkable);
    expect(path).not.toBeNull();
    for (const t of path ?? []) {
      expect(walkable(t.x, t.y)).toBe(true);
      expect(Math.max(Math.abs(t.x - home.x), Math.abs(t.y - home.y))).toBeLessThanOrEqual(6);
    }
  });

  it('cinq minutes de promenade : jamais hors zone, jamais sur la même case', () => {
    const rng = Rng.fromSeed('test');
    const walkers = npcs
      .filter((n) => n.roam > 0)
      .map((n) => ({ n, w: new Wanderer({ home: { x: n.at[0], y: n.at[1] }, radius: n.roam, ...DEFAULT_WANDER }, walkableFor(n.at), rng) }));
    let moved = 0;
    for (let t = 0; t < 300_000; t += 50) {
      for (const { n, w } of walkers) {
        w.update(50, rng, (x, y) => !walkers.some((o) => o.w !== w && o.w.reserved.some((r) => r.x === x && r.y === y)));
        const c = w.currentTile;
        expect(walkableFor(n.at)(c.x, c.y), `${n.id} sur ${c.x},${c.y}`).toBe(true);
        expect(Math.max(Math.abs(c.x - n.at[0]), Math.abs(c.y - n.at[1])), n.id).toBeLessThanOrEqual(n.roam);
        if (w.walking) moved++;
      }
      const seen = new Set<string>();
      for (const { w } of walkers) {
        for (const r of w.reserved) {
          const k = `${r.x},${r.y}`;
          expect(seen.has(k), `case partagée ${k}`).toBe(false);
          seen.add(k);
        }
      }
    }
    expect(moved).toBeGreaterThan(1000);
  });

  it('une conversation fige le PNJ une fois son pas fini', () => {
    const rng = Rng.fromSeed('hold');
    const w = new Wanderer({ home: { x: 75, y: 87 }, radius: 6, ...DEFAULT_WANDER, minPauseMs: 0, maxPauseMs: 1 }, walkable, rng);
    for (let t = 0; t < 20_000 && !w.walking; t += 50) w.update(50, rng, () => true);
    expect(w.walking).toBe(true);
    for (let t = 0; t < 3000; t += 50) w.update(50, rng, () => true, true);
    expect(w.walking).toBe(false);
    const tile = w.currentTile;
    for (let t = 0; t < 10_000; t += 50) w.update(50, rng, () => true, true);
    expect(w.currentTile).toEqual(tile);
  });
});
