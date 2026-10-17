import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { COLLISION } from '../src/data/worldMap';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { cellIndex, terrainAt } from '../src/logic/tactics/grid';
import { sampleTerrain, terrainDistances, type TerrainSource } from '../src/logic/tactics/sampling';
import type { BattleState } from '../src/logic/tactics/types';
import { testWorld } from './helpers/world';

/** Cartes de combat tirées du monde (décision n°57). */
const data = loadGameData();

/** Petit monde en texte : . plaine  f forêt  F arbre (forêt, bloqué)  ~ rivière  # bloqué  H mur de maison  D porte  b objet de village. */
function textWorld(rows: readonly string[]): TerrainSource {
  const at = (x: number, y: number): string => rows[Math.max(0, Math.min(rows.length - 1, y))]?.[Math.max(0, Math.min((rows[0]?.length ?? 1) - 1, x))] ?? '.';
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    terrain: (x, y) => ({ f: 'foret', F: 'foret', '~': 'riviere' })[at(x, y)] ?? 'plaine',
    blocked: (x, y) => '#HDbF'.includes(at(x, y)),
    settlement: (x, y) => 'HDb'.includes(at(x, y)),
    door: (x, y) => at(x, y) === 'D',
    zone: () => 1,
  };
}

/** Vérifie qu'un combat tiré du monde est jouable. */
function expectPlayable(s: BattleState): void {
  const players = s.units.filter((u) => u.team === 'player');
  const enemies = s.units.filter((u) => u.team === 'enemy');
  const cells = new Set(s.units.map((u) => cellIndex(s.map, u.x, u.y)));
  expect(cells.size).toBe(s.units.length);
  for (const u of s.units) expect(terrainAt(s.map, u.x, u.y).moveCost).not.toBeNull();
  const hero = players.find((u) => u.isHero) ?? players[0];
  if (!hero) throw new Error('pas de héros');
  const reach = terrainDistances(s.map, hero);
  for (const e of enemies) expect(reach.has(cellIndex(s.map, e.x, e.y)), `${e.name} injoignable`).toBe(true);
  for (const p of players) for (const e of enemies) expect(Math.abs(p.x - e.x) + Math.abs(p.y - e.y)).toBeGreaterThanOrEqual(4);
}

describe('fenêtre tirée du monde', () => {
  it('suit ce qui est dessiné : murs, portes du monde, objets, arbres, falaises', () => {
    const world = textWorld([
      '..........~~..........',
      '..HHH.....~~....####..',
      '..HDH.....~~....####..',
      '..........~~....####..',
      '....#.....~~...b......',
      '..........~~..........',
      '......................',
      'ffFfff....~~..........',
    ]);
    const sample = sampleTerrain(world, { x: 10, y: 4 }, { width: 22, height: 8 }, data.terrains);
    expect(sample.origin).toEqual({ x: 0, y: 0 });
    expect(sample.site).toEqual({ x: 10, y: 4 });
    const at = (x: number, y: number): string => sample.rows[y]?.[x] ?? '?';
    expect(at(10, 0)).toBe('riviere');
    expect([at(0, 7), at(2, 7)]).toEqual(['foret', 'foret']); // un tronc de forêt reste un couvert praticable
    expect([at(2, 1), at(4, 2)]).toEqual(['batiment', 'batiment']);
    expect(at(3, 2)).toBe('village'); // la porte dessinée devient une case visitable
    expect(at(17, 2)).toBe('montagne'); // amas de rochers
    expect(at(4, 4)).toBe('obstacle'); // obstacle isolé
    expect(at(15, 4)).toBe('obstacle'); // objet de village (tonneau, puits…)
    expect(at(3, 3)).toBe('plaine');
  });

  it('reste dans le monde et contient le point de contact, même au bord', () => {
    const world = testWorld().source;
    for (const site of [{ x: 0, y: 0 }, { x: world.width - 1, y: world.height - 1 }, { x: 80, y: 60 }]) {
      const s = sampleTerrain(world, site, { width: 30, height: 20 }, data.terrains);
      expect(s.origin.x).toBeGreaterThanOrEqual(0);
      expect(s.origin.y).toBeGreaterThanOrEqual(0);
      expect(s.origin.x + 30).toBeLessThanOrEqual(world.width);
      expect(s.site.x).toBeGreaterThanOrEqual(0);
      expect(s.site.x).toBeLessThan(30);
      expect(s.site.y).toBeGreaterThanOrEqual(0);
      expect(s.site.y).toBeLessThan(20);
    }
  });
});

describe('rencontres tirées du monde', () => {
  for (const encounter of data.encounters.encounters.filter((e) => e.sampled)) {
    it(`« ${encounter.id} » est jouable à son point par défaut, déterministe`, () => {
      const world = testWorld().source;
      const s = buildBattle(encounter, data.encounters.testParty, data, { seed: 'x', world });
      expectPlayable(s);
      const again = buildBattle(encounter, data.encounters.testParty, data, { seed: 'x', world });
      expect(again.units.map((u) => [u.x, u.y])).toEqual(s.units.map((u) => [u.x, u.y]));
      const boss = s.units.find((u) => u.isBoss);
      if (encounter.sampled?.anchor === 'enemy' && boss && s.worldOrigin) {
        // Le boss tient son repaire : il est au point de contact (ou sur la case praticable la plus proche).
        const [sx, sy] = encounter.sampled.site;
        expect(Math.abs(boss.x + s.worldOrigin.x - sx) + Math.abs(boss.y + s.worldOrigin.y - sy)).toBeLessThanOrEqual(2);
      }
    });
  }

  it('un combat engagé n’importe où sur la terre ferme est jouable', () => {
    const { map, source } = testWorld();
    const encounter = findEncounter(data, 'embuscade_du_gue');
    let tried = 0;
    for (let y = 4; y < map.height; y += 11) {
      for (let x = 4; x < map.width; x += 11) {
        const i = y * map.width + x;
        if (map.collision[i] !== COLLISION.free) continue;
        const terrain = source.terrain(x, y);
        if (terrain === 'eau_profonde' || terrain === 'riviere') continue;
        tried++;
        const s = buildBattle(encounter, data.encounters.testParty, data, { seed: `${x},${y}`, world: source, site: { x, y } });
        expectPlayable(s);
        expect(s.zone).toBe(data.zones.find((z) => z.value === map.zones[i])?.id ?? 'z1');
      }
    }
    expect(tried).toBeGreaterThan(40);
  });
});
