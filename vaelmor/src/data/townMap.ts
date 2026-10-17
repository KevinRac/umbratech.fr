/**
 * Cohérence entre `locations.json` et la carte du monde : mêmes 22 lieux,
 * réputation réservée aux villages et à la ville, PNJ posés sur des cases
 * libres à l'intérieur de leur lieu, hors des portes.
 */
import { COLLISION, type WorldMap } from './worldMap';
import type { GameData } from './validate';

/** Cases de tolérance autour du rectangle d'un lieu pour y poser un PNJ. */
const NPC_MARGIN = 4;

export function checkTownsOnMap(data: GameData, map: WorldMap): string[] {
  const issues: string[] = [];
  const file = 'locations.json';
  const byId = new Map(map.locations.map((l) => [String(l.props['id']), l]));
  const known = new Set(data.locations.map((l) => l.id));

  for (const id of byId.keys()) if (!known.has(id)) issues.push(`${file} › le lieu « ${id} » de la carte n'est pas décrit`);
  const doorCells = new Set<string>();
  for (const a of map.ambient) {
    if (a.kind !== 'door') continue;
    const x = Math.floor(a.x / map.tileSize);
    const y = Math.floor(a.y / map.tileSize);
    doorCells.add(`${x},${y}`);
    doorCells.add(`${x},${y + 1}`);
  }

  const taken = new Map<string, string>();
  for (const loc of data.locations) {
    const obj = byId.get(loc.id);
    if (!obj) {
      issues.push(`${file} › « ${loc.id} » n'existe pas sur la carte du monde`);
      continue;
    }
    if (loc.name !== obj.name) issues.push(`${file} › « ${loc.id} » s'appelle « ${loc.name} », la carte dit « ${obj.name} »`);
    const inhabited = obj.kind === 'village' || obj.kind === 'ville';
    if (inhabited && loc.reputation === null) issues.push(`${file} › « ${loc.id} » (${obj.kind}) doit avoir une réputation`);
    if (!inhabited && loc.reputation !== null) issues.push(`${file} › « ${loc.id} » (${obj.kind}) ne peut pas avoir de réputation`);
    if (!inhabited && (loc.npcs.length > 0 || loc.shops.length > 0)) issues.push(`${file} › « ${loc.id} » (${obj.kind}) n'a pas d'habitants`);

    // Les bâtiments débordent un peu du rectangle d'entrée du lieu : on tolère une marge.
    const x0 = Math.floor(obj.x / map.tileSize) - NPC_MARGIN;
    const y0 = Math.floor(obj.y / map.tileSize) - NPC_MARGIN;
    const x1 = Math.ceil((obj.x + obj.width) / map.tileSize) - 1 + NPC_MARGIN;
    const y1 = Math.ceil((obj.y + obj.height) / map.tileSize) - 1 + NPC_MARGIN;
    for (const npc of loc.npcs) {
      const [x, y] = npc.at;
      const at = `${file} › ${loc.id}.${npc.id}.at (${x},${y})`;
      if (x < x0 || x > x1 || y < y0 || y > y1) {
        issues.push(`${at} : hors du lieu (cases ${x0},${y0} à ${x1},${y1})`);
        continue;
      }
      if (map.collision[y * map.width + x] !== COLLISION.free) issues.push(`${at} : case non libre`);
      if (doorCells.has(`${x},${y}`)) issues.push(`${at} : sur une porte ou devant une porte`);
      const other = taken.get(`${x},${y}`);
      if (other) issues.push(`${at} : déjà occupée par ${other}`);
      taken.set(`${x},${y}`, npc.id);
    }
  }
  return issues;
}
