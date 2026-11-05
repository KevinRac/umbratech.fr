/**
 * Jalon M10 (finitions) : réglages versionnés et écran Options (n°232), carte
 * de l'île (n°233), voyage rapide (n°234).
 */
import { describe, expect, it } from 'vitest';
import { onSettingsChange, SETTINGS_VERSION, writeSetting } from '../src/core/settings';
import { loadGameData } from '../src/data';
import { islandMarkers, zoneBossCleared } from '../src/logic/world/islandMarkers';
import { CollisionGrid } from '../src/logic/world/collision';
import { reachableCells } from '../src/logic/world/pathfinding';
import { arrivalPoint, canTravel, travelOrigin, travelPoints } from '../src/logic/world/travel';
import { findSpawn } from '../src/logic/world/worldState';
import { paintIslandMap } from '../src/render/islandMap';
import { OPTION_SECTIONS, optionRows, stepValue, valueLabel } from '../src/ui/optionsModel';
import { testWorld } from './helpers/world';

const data = loadGameData();
const { map } = testWorld();
const idOf = (id: string) => map.locations.find((l) => String(l.props['id']) === id);

describe('réglages et écran Options (n°232)', () => {
  it('chaque réglage est rangé dans une section connue, a une aide et lit une de ses valeurs', () => {
    const rows = optionRows();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const row of rows) {
      expect(OPTION_SECTIONS.map((s) => s.id)).toContain(row.section);
      expect(row.help.length, row.id).toBeGreaterThan(10);
      expect(row.values.length, row.id).toBeGreaterThanOrEqual(2);
      expect(row.values.map((v) => v.id), row.id).toContain(row.get());
      expect(valueLabel(row).length).toBeGreaterThan(0);
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('les valeurs défilent en boucle dans les deux sens', () => {
    const quality = optionRows().find((r) => r.id === 'quality');
    expect(quality).toBeTruthy();
    if (!quality) return;
    const ids = quality.values.map((v) => v.id);
    const start = ids.indexOf(quality.get());
    expect(stepValue(quality, 1)).toBe(ids[(start + 1) % ids.length]);
    expect(stepValue(quality, -1)).toBe(ids[(start - 1 + ids.length) % ids.length]);
  });

  it('un réglage écrit prévient les scènes ouvertes, même sans stockage', () => {
    const heard: string[] = [];
    const off = onSettingsChange((key) => heard.push(key));
    writeSetting('quality', 'low');
    off();
    writeSetting('quality', 'high');
    expect(heard).toEqual(['quality']);
    expect(SETTINGS_VERSION).toBe(1);
  });
});

describe('voyage rapide (n°234)', () => {
  const allFlags = data.zones.map((z) => z.unlockFlag).filter((f): f is string => !!f);
  const grid = CollisionGrid.fromMap(map, allFlags);
  const start = findSpawn(map, 'start') as { x: number; y: number };
  const reach = reachableCells(grid, { x: Math.floor(start.x / 16), y: Math.floor(start.y / 16) });

  it('chaque autel, village et la ville ont un point d’arrivée libre, atteignable à pied depuis le départ', () => {
    const places = map.locations.filter((l) => ['autel', 'village', 'ville'].includes(l.kind));
    expect(places.length).toBe(11);
    for (const loc of places) {
      const at = arrivalPoint(map, loc);
      expect(at, String(loc.props['id'])).not.toBeNull();
      if (!at) continue;
      const tx = Math.floor(at.x / 16);
      const ty = Math.floor(at.y / 16);
      expect(grid.isSolidCell(tx, ty), String(loc.props['id'])).toBe(false);
      expect(reach[ty * map.width + tx], String(loc.props['id'])).toBe(1);
    }
  });

  it('un autel arrive à son point d’apparition', () => {
    const autel = idOf('autel_racine');
    expect(autel).toBeTruthy();
    if (autel) expect(arrivalPoint(map, autel)).toEqual(findSpawn(map, 'altar_racine'));
  });

  it('destinations : lieux habités visités puis autels découverts, sans le lieu de départ ni les autres lieux', () => {
    const points = travelPoints(map, ['haut_gue', 'autel_aubemer', 'ronceval', 'camp_ecumeurs', 'autel_racine'], 'haut_gue');
    expect(points.map((p) => p.id)).toEqual(['ronceval', 'autel_aubemer', 'autel_racine']);
    expect(points.every((p) => p.name.length > 0)).toBe(true);
  });

  it('on part d’un autel ou d’un lieu habité, jamais pendant une poursuite', () => {
    const village = idOf('haut_gue');
    const camp = idOf('camp_ecumeurs');
    if (!village || !camp) throw new Error('lieux manquants');
    const inside = { x: village.x + village.width / 2, y: village.y + village.height / 2 };
    expect(travelOrigin(map, inside.x, inside.y)?.kind).toBe('village');
    expect(canTravel(map, inside.x, inside.y, false).ok).toBe(true);
    const chased = canTravel(map, inside.x, inside.y, true);
    expect(chased.ok).toBe(false);
    if (!chased.ok) expect(chased.reason).toContain('poursuit');
    expect(canTravel(map, camp.x + 8, camp.y + 8, false).ok).toBe(false);
    const altar = findSpawn(map, 'altar_aubemer') as { x: number; y: number };
    expect(canTravel(map, altar.x, altar.y - 4, false).ok).toBe(true);
  });
});

describe('carte de l’île (n°233)', () => {
  it('parchemin à la taille de l’île, déterministe ; le brouillard cache les zones non visitées', () => {
    const all = new Set(data.zones.map((z) => z.value));
    const open = paintIslandMap({ map, discoveredZones: all, cell: 3 });
    expect(open.width).toBe(map.width * 3);
    expect(open.height).toBe(map.height * 3);
    expect(paintIslandMap({ map, discoveredZones: all, cell: 3 }).pixels).toEqual(open.pixels);
    const fog = paintIslandMap({ map, discoveredZones: new Set([1]), cell: 3 });
    // Une case de forêt de la zone 2 : peinte en forêt carte ouverte, en papier sous le brouillard.
    const cellIndex = [...map.zones].findIndex((z, i) => z === 2 && map.terrainByGid.get(map.ground[i] as number) === 'foret');
    const tx = cellIndex % map.width;
    const ty = Math.floor(cellIndex / map.width);
    const p = (ty * 3 + 1) * open.width + tx * 3 + 1;
    expect(open.pixels[p]).not.toBe(fog.pixels[p]);
    const green = (c: number) => ((c >> 8) & 255) - ((c >> 16) & 255);
    expect(green(open.pixels[p] as number)).toBeGreaterThan(green(fog.pixels[p] as number));
    // Toute la zone 1 (visitée) est identique.
    for (let i = 0; i < map.zones.length; i++) {
      if (map.zones[i] !== 1) continue;
      const q = (Math.floor(i / map.width) * 3 + 1) * open.width + (i % map.width) * 3 + 1;
      if (open.pixels[q] !== fog.pixels[q]) throw new Error(`case ${i} de la zone 1 changée par le brouillard`);
    }
    expect([...open.pixels].every((c) => c >= 0)).toBe(true);
  });

  it('seuls les lieux visités ont un repère ; repaire vaincu et quête à rendre', () => {
    const markers = islandMarkers(map, data.zones, {
      discovered: ['haut_gue', 'camp_ecumeurs'],
      flags: ['boss_brakk'],
      quests: [{ location: 'haut_gue', status: 'ready' }, { location: 'haut_gue', status: 'active' }],
    });
    expect(markers.map((m) => m.id).sort()).toEqual(['camp_ecumeurs', 'haut_gue']);
    expect(markers.find((m) => m.id === 'camp_ecumeurs')?.cleared).toBe(true);
    expect(markers.find((m) => m.id === 'haut_gue')?.quest).toBe('ready');
    expect(islandMarkers(map, data.zones, { discovered: ['camp_ecumeurs'], flags: [], quests: [] })[0]?.cleared).toBe(false);
  });

  it('le boss de la dernière zone est vaincu quand une fin a été jouée', () => {
    const last = Math.max(...data.zones.map((z) => z.value));
    expect(zoneBossCleared(data.zones, last, [])).toBe(false);
    expect(zoneBossCleared(data.zones, last, ['fin_lanterne'])).toBe(true);
  });
});
