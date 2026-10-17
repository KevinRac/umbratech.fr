/** Carte du monde réelle (assets/maps/world.json), lue une fois pour les tests de combat. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadGameData } from '../../src/data';
import { loadWorldMap, type WorldMap } from '../../src/data/worldMap';
import { worldTerrainSource, type TerrainSource } from '../../src/logic/tactics/sampling';

let cached: { map: WorldMap; source: TerrainSource } | null = null;

export function testWorld(): { map: WorldMap; source: TerrainSource } {
  if (cached) return cached;
  const data = loadGameData();
  const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'assets/maps/world.json'), 'utf8')) as unknown;
  const map = loadWorldMap(raw, { zones: data.zones, terrains: data.terrains, tileSize: data.balance.exploration.tileSize });
  cached = { map, source: worldTerrainSource(map) };
  return cached;
}
