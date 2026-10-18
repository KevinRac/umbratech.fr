/**
 * Cohérence entre `worldEnemies.json` et la carte du monde : chaque ennemi (et
 * chaque point de son trajet) se tient sur une case libre de la bonne zone,
 * aucun n'est posé dans un village sauf le garde de ce village, qui reste près
 * de son entrée. Le trajet des patrouilles (connexité) est vérifié par les
 * tests, qui disposent de la recherche de chemin.
 */
import { COLLISION, type WorldMap } from './worldMap';
import type { GameData } from './validate';

/** Distance maximale (cases, au rectangle du lieu) entre un garde et son village. */
const GUARD_RANGE = 6;

export function checkFoesOnMap(data: GameData, map: WorldMap): string[] {
  const issues: string[] = [];
  const file = 'worldEnemies.json';
  const zoneValue = new Map(data.zones.map((z) => [z.id, z.value]));
  const placed = new Map<string, string>();
  const villages = map.locations.filter((l) => l.kind === 'village' || l.kind === 'ville');
  const byId = new Map(map.locations.map((l) => [String(l.props['id']), l]));

  const insideRect = (loc: { x: number; y: number; width: number; height: number }, x: number, y: number, margin: number): boolean => {
    const t = map.tileSize;
    return x >= Math.floor(loc.x / t) - margin && x <= Math.ceil((loc.x + loc.width) / t) - 1 + margin && y >= Math.floor(loc.y / t) - margin && y <= Math.ceil((loc.y + loc.height) / t) - 1 + margin;
  };

  for (const foe of data.worldFoes) {
    const cells = foe.path ?? [foe.at];
    cells.forEach(([x, y], i) => {
      const at = `${file} › « ${foe.id} »${foe.path ? `.path[${i}]` : '.at'} (${x},${y})`;
      if (x >= map.width || y >= map.height) {
        issues.push(`${at} : hors de la carte`);
        return;
      }
      const value = map.collision[y * map.width + x];
      if (value !== COLLISION.free && value !== COLLISION.slow) issues.push(`${at} : case non praticable`);
      const zone = map.zones[y * map.width + x];
      if (zone !== zoneValue.get(foe.zone)) issues.push(`${at} : cette case n'est pas dans la zone « ${foe.zone} »`);
      for (const village of villages) {
        const own = foe.kind === 'garde' && foe.town === String(village.props['id']);
        if (!own && insideRect(village, x, y, 0)) issues.push(`${at} : dans ${village.name} (un village est un lieu sûr)`);
      }
    });
    const [x, y] = foe.at;
    const key = `${x},${y}`;
    const other = placed.get(key);
    if (other) issues.push(`${file} › « ${foe.id} » : case ${key} déjà occupée par « ${other} »`);
    placed.set(key, foe.id);
    if (foe.kind === 'garde' && foe.town !== undefined) {
      const town = byId.get(foe.town);
      if (!town) issues.push(`${file} › « ${foe.id} ».town : « ${foe.town} » n'existe pas sur la carte`);
      else if (!insideRect(town, x, y, GUARD_RANGE)) issues.push(`${file} › « ${foe.id} » : le garde est trop loin de ${town.name} (${GUARD_RANGE} cases au plus)`);
    }
  }
  return issues;
}
