/**
 * Ennemis visibles du monde (jalon M3, GDD §7) : machine d'état, détection,
 * présence et réapparition, récompenses, défaite, embuscade, passages d'accès.
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { checkFoesOnMap } from '../src/data/foeMap';
import type { WorldFoeDef } from '../src/data/schemas';
import {
  buildTownIndex,
  chooseEncounter,
  classDetectionScale,
  difficultyOf,
  foeFlees,
  foePresent,
  meanEnemyLevel,
  newProgress,
  settleBattle,
  testPartyAt,
  type GameCtx,
} from '../src/logic/game';
import { Rng } from '../src/logic/rng';
import { endPhase } from '../src/logic/tactics/battle';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { CollisionGrid, gateRequirements, isGateOpen } from '../src/logic/world/collision';
import { cellFeet, createFoe, detectionScale, detects, feetCell, isSurprisable, surpriseTarget, updateFoe, type FoeEnv, type FoeSim } from '../src/logic/world/foes';
import { findPath } from '../src/logic/world/pathfinding';
import { gridFromRows, TILE } from './helpers/fixtures';
import { testWorld } from './helpers/world';

const data = loadGameData();
const cfg = data.balance.foes;

function ctx(flags: string[] = []): GameCtx {
  const progress = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
  return { data, index: buildTownIndex(data), progress, flags, discovered: [] };
}

const def = (partial: Partial<WorldFoeDef> & Pick<WorldFoeDef, 'kind'>): WorldFoeDef => ({ id: 'test', zone: 'z1', at: [10, 10], sprite: 'ecumeur_sabreur', ...partial });
const open = (w = 40, h = 30) => gridFromRows(Array.from({ length: h }, () => '.'.repeat(w)));

function sim(d: WorldFoeDef, level = 3, weak = false): FoeSim {
  return createFoe(d, { encounterId: 'patrouille_ecumeurs', level, weak }, TILE);
}

function env(grid: CollisionGrid, hero: { x: number; y: number }, extra: Partial<FoeEnv> = {}): FoeEnv {
  return { grid, cfg, tile: TILE, hero, scale: 1, grace: false, rng: Rng.fromSeed('foes'), ...extra };
}

/** Joue `ms` millisecondes par pas de 50 ms ; renvoie tous les événements. */
function run(foe: FoeSim, ms: number, e: FoeEnv) {
  const events: ReturnType<typeof updateFoe> = [];
  for (let t = 0; t < ms; t += 50) events.push(...updateFoe(foe, 50, e));
  return events;
}

const at = (x: number, y: number) => cellFeet({ x, y }, TILE);

describe('données des ennemis du monde', () => {
  it('chaque ennemi se tient sur une case libre de sa zone, hors des villages', () => {
    expect(checkFoesOnMap(data, testWorld().map)).toEqual([]);
  });

  it('les trajets de patrouille et les zones d\'errance sont praticables', () => {
    const { map } = testWorld();
    const grid = CollisionGrid.fromMap(map, data.zones.flatMap((z) => (z.unlockFlag ? [z.unlockFlag, ...(z.access ?? [])] : [])));
    for (const foe of data.worldFoes) {
      const [x, y] = foe.at;
      expect(grid.isSolidCell(x, y), `${foe.id} sur une case pleine`).toBe(false);
      if (foe.path) {
        for (let i = 0; i < foe.path.length; i++) {
          const a = foe.path[i] as readonly [number, number];
          const b = foe.path[(i + 1) % foe.path.length] as readonly [number, number];
          expect(findPath(grid, { x: a[0], y: a[1] }, { x: b[0], y: b[1] }), `${foe.id} : pas de chemin ${a} → ${b}`).not.toBeNull();
        }
      }
    }
  });

  it('chaque zone a de quoi nourrir ses types d\'ennemis, et chaque boss de quête a son ennemi', () => {
    for (const foe of data.worldFoes) {
      const encounter = chooseEncounter(data, foe, 'seed');
      expect(encounter.zone).toBe(foe.zone);
      expect(meanEnemyLevel(encounter)).toBeGreaterThan(0);
    }
    const flags = new Set(data.encounters.encounters.filter((e) => data.worldFoes.some((f) => f.encounter === e.id && f.kind === 'boss')).flatMap((e) => e.victoryFlags));
    for (const flag of ['boss_brakk', 'boss_roi_cerf', 'boss_merrow', 'boss_aiguille', 'boss_gardien_cendre']) expect(flags.has(flag), flag).toBe(true);
  });

  it('les niveaux des rencontres suivent les zones de niveau', () => {
    for (const enc of data.encounters.encounters) {
      const zone = data.zones.find((z) => z.id === enc.zone);
      if (!zone || !data.worldFoes.some((f) => f.encounter === enc.id) && !zone.encounterTable.some((t) => t.encounter === enc.id)) continue;
      const mean = meanEnemyLevel(enc);
      expect(mean, enc.id).toBeGreaterThanOrEqual(zone.levelMin - 1);
      expect(mean, enc.id).toBeLessThanOrEqual(zone.levelMax + 1);
    }
  });
});

describe('détection (GDD §7.3)', () => {
  const grid = open();
  const sentinel = () => sim(def({ kind: 'sentinelle', facing: 'e', at: [10, 10] }));

  it('le cône de la vigie voit devant elle jusqu\'à 5 cases, pas derrière', () => {
    const foe = sentinel();
    expect(detects(foe, env(grid, at(14, 10)))).toBe(true);
    expect(detects(foe, env(grid, at(16, 10)))).toBe(false);
    expect(detects(foe, env(grid, at(6, 10)))).toBe(false);
    expect(detects(foe, env(grid, at(13, 12)))).toBe(true);
  });

  it('le cercle d\'un errant voit dans toutes les directions, 4 cases', () => {
    const foe = sim(def({ kind: 'errant', roam: 3 }));
    for (const [x, y] of [[13, 10], [7, 10], [10, 13], [10, 7]] as const) expect(detects(foe, env(grid, at(x, y))), `${x},${y}`).toBe(true);
    expect(detects(foe, env(grid, at(10, 16)))).toBe(false);
  });

  it('le sprint double la portée, la forêt la réduit de 40 %, le Chasseur de Serpents de Mer de 20 %', () => {
    const foe = sim(def({ kind: 'errant', roam: 3 }));
    const x = at(17, 10); // 7 cases : hors du cercle de 4, dans celui de 8
    expect(detects(foe, env(grid, x))).toBe(false);
    const ex = data.balance.exploration;
    const sprint = detectionScale({ sprinting: true, inForest: false, sprintMultiplier: ex.sprintDetectionMultiplier, forestMultiplier: ex.forestDetectionMultiplier, classScale: 1 });
    expect(sprint).toBe(2);
    expect(detects(foe, env(grid, x, { scale: sprint }))).toBe(true);
    const forest = detectionScale({ sprinting: false, inForest: true, sprintMultiplier: 2, forestMultiplier: ex.forestDetectionMultiplier, classScale: 1 });
    expect(forest).toBeCloseTo(0.6);
    expect(detects(foe, env(grid, at(13, 10), { scale: forest }))).toBe(false);
    expect(classDetectionScale(data)).toBeCloseTo(0.8);
  });

  it('un mur arrête la vue', () => {
    const walled = gridFromRows(Array.from({ length: 20 }, (_, y) => (y < 20 ? '.'.repeat(11) + '#' + '.'.repeat(28) : '')));
    const foe = sim(def({ kind: 'errant', roam: 3, at: [9, 10] }));
    expect(detects(foe, env(walled, at(13, 10)))).toBe(false);
  });
});

describe('machine d\'état (GDD §7.2)', () => {
  const grid = open();

  it('repère → « ! » 0,6 s → poursuite → contact → combat', () => {
    const foe = sim(def({ kind: 'errant', roam: 3 }));
    const hero = at(13, 10);
    const first = updateFoe(foe, 50, env(grid, hero));
    expect(first).toEqual([{ type: 'alert' }]);
    expect(foe.mode).toBe('alert');
    const events = run(foe, 3000, env(grid, hero));
    expect(events.some((e) => e.type === 'contact')).toBe(true);
  });

  it('un poursuivant lâche prise hors de vue ou à plus de 8 cases, puis rentre à son poste', () => {
    const foe = sim(def({ kind: 'errant', roam: 3 }));
    run(foe, 1300, env(grid, at(14, 10)));
    expect(foe.mode).toBe('chase');
    expect(foe.x).toBeGreaterThan(foe.home.x + TILE);
    const far = at(26, 10);
    const events = run(foe, 100, env(grid, far));
    expect(events).toContainEqual({ type: 'lost' });
    expect(foe.mode).toBe('return');
    run(foe, 20000, env(grid, far));
    expect(['wander', 'idle']).toContain(foe.mode);
    expect(Math.hypot(foe.x - foe.home.x, foe.y - foe.home.y)).toBeLessThan(TILE * 4);
  });

  it('la poursuite se gagne en courant, pas en marchant', () => {
    expect(cfg.speeds.chase).toBeGreaterThan(data.balance.exploration.walkSpeed);
    expect(cfg.speeds.chase).toBeLessThan(data.balance.exploration.sprintSpeed);
  });

  it('une embuscade est invisible puis se referme à 2 cases', () => {
    const foe = sim(def({ kind: 'embuscade' }));
    expect(foe.mode).toBe('dormant');
    expect(updateFoe(foe, 50, env(grid, at(14, 10)))).toEqual([]);
    expect(updateFoe(foe, 50, env(grid, at(12, 10)))).toEqual([{ type: 'contact', ambush: true }]);
  });

  it('un boss se déclenche à 6 cases après son « ! », sans quitter son repaire', () => {
    const foe = sim(def({ kind: 'boss', encounter: 'camp_des_ecumeurs' }));
    expect(updateFoe(foe, 50, env(grid, at(18, 10)))).toEqual([]);
    expect(updateFoe(foe, 50, env(grid, at(15, 10)))).toEqual([{ type: 'alert' }]);
    const events = run(foe, 1000, env(grid, at(15, 10)));
    expect(events).toContainEqual({ type: 'contact', ambush: false });
    expect(foe.x).toBe(foe.home.x);
  });

  it('une vigie appelle des renforts une fois, puis poursuit', () => {
    const foe = sim(def({ kind: 'sentinelle', facing: 'e' }));
    const hero = at(13, 10);
    const events = run(foe, 900, env(grid, hero));
    expect(events.filter((e) => e.type === 'reinforce')).toHaveLength(1);
    expect(foe.reinforced).toBe(true);
    expect(foe.mode).toBe('chase');
  });

  it('un ennemi bien plus faible que la compagnie s\'enfuit, sauf les boss, embuscades et gardes', () => {
    const errant = def({ kind: 'errant', roam: 3 });
    expect(foeFlees(cfg, errant, 1, 7)).toBe(true);
    expect(foeFlees(cfg, errant, 3, 7)).toBe(false);
    expect(foeFlees(cfg, def({ kind: 'boss' }), 1, 20)).toBe(false);
    expect(foeFlees(cfg, def({ kind: 'embuscade' }), 1, 20)).toBe(false);
    expect(foeFlees(cfg, def({ kind: 'garde', town: 'haut_gue', roam: 3 }), 1, 20)).toBe(false);
    const foe = sim(errant, 1, true);
    const events = updateFoe(foe, 50, env(grid, at(13, 10)));
    expect(events).toEqual([{ type: 'flee' }]);
    const before = Math.hypot(foe.x - at(13, 10).x, foe.y - at(13, 10).y);
    run(foe, 1000, env(grid, at(13, 10)));
    expect(Math.hypot(foe.x - at(13, 10).x, foe.y - at(13, 10).y)).toBeGreaterThan(before);
  });

  it('le répit après un combat empêche détection et contact', () => {
    const foe = sim(def({ kind: 'errant', roam: 3 }));
    expect(run(foe, 1000, env(grid, at(10, 10), { grace: true }))).toEqual([]);
    expect(foe.mode).not.toBe('alert');
  });

  it('une patrouille suit son trajet et marque une pause à chaque point', () => {
    const foe = sim(def({ kind: 'patrouille', at: [10, 10], path: [[10, 10], [16, 10], [16, 14]] }));
    run(foe, 60000, env(grid, at(35, 28)));
    expect(foe.mode).toBe('patrol');
    expect(foe.leg).toBeGreaterThan(3);
  });

  it('le garde qui touche le héros déclenche une embuscade', () => {
    const foe = sim(def({ kind: 'garde', town: 'haut_gue', roam: 3 }));
    expect(updateFoe(foe, 50, env(grid, at(10, 10)))).toEqual([{ type: 'contact', ambush: true }]);
  });

  it('attaque par surprise : seulement un ennemi non alerté à portée', () => {
    const calm = sim(def({ kind: 'patrouille', at: [10, 10], path: [[10, 10], [14, 10]] }));
    const hero = { x: calm.x + 10, y: calm.y };
    expect(isSurprisable(calm)).toBe(true);
    expect(surpriseTarget([calm], hero, cfg.surpriseRange)).toBe(calm);
    expect(surpriseTarget([calm], { x: calm.x + 60, y: calm.y }, cfg.surpriseRange)).toBeNull();
    const dormant = sim(def({ kind: 'embuscade' }));
    expect(surpriseTarget([dormant], { x: dormant.x, y: dormant.y }, cfg.surpriseRange)).toBeNull();
    calm.mode = 'alert';
    expect(surpriseTarget([calm], hero, cfg.surpriseRange)).toBeNull();
  });

  it('feetCell et cellFeet sont réciproques', () => {
    const feet = cellFeet({ x: 7, y: 9 }, TILE);
    expect(feetCell(feet.x, feet.y, TILE)).toEqual({ x: 7, y: 9 });
  });
});

describe('présence et réapparition (GDD §7.7)', () => {
  const foe = (kind: WorldFoeDef['kind'], extra: Partial<WorldFoeDef> = {}) => def({ kind, id: `f_${kind}`, ...extra });

  it('sentinelle, embuscade et boss ne reviennent jamais', () => {
    const c = ctx();
    for (const kind of ['sentinelle', 'embuscade'] as const) {
      const d = foe(kind, kind === 'sentinelle' ? { facing: 'n' } : {});
      expect(foePresent(c, d)).toBe(true);
      c.progress.foes[d.id] = { day: c.progress.day, clock: 0, visits: 0 };
      c.progress.day += 5;
      c.progress.clock += 1e9;
      c.progress.zoneVisits += 5;
      expect(foePresent(c, d)).toBe(false);
    }
    const boss = foe('boss', { encounter: 'camp_des_ecumeurs' });
    expect(foePresent(c, boss)).toBe(true);
    c.flags.push('boss_brakk');
    expect(foePresent(c, boss)).toBe(false);
  });

  it('une patrouille revient après un repos à l\'auberge', () => {
    const c = ctx();
    const d = foe('patrouille', { path: [[10, 10], [14, 10]] });
    c.progress.foes[d.id] = { day: c.progress.day, clock: 0, visits: 0 };
    expect(foePresent(c, d)).toBe(false);
    c.progress.day += 1;
    expect(foePresent(c, d)).toBe(true);
  });

  it('un errant revient après 10 minutes de jeu ou un changement de zone', () => {
    const d = foe('errant', { roam: 3 });
    const byTime = ctx();
    byTime.progress.foes[d.id] = { day: 1, clock: 1000, visits: 0 };
    expect(foePresent(byTime, d)).toBe(false);
    byTime.progress.clock = 1000 + cfg.wanderRespawnMs;
    expect(foePresent(byTime, d)).toBe(true);
    const byZone = ctx();
    byZone.progress.foes[d.id] = { day: 1, clock: 1000, visits: 0 };
    byZone.progress.zoneVisits = 1;
    expect(foePresent(byZone, d)).toBe(true);
  });

  it('les gardes n\'apparaissent que si la réputation du village est hostile (décision n°65)', () => {
    const c = ctx();
    const d = foe('garde', { town: 'haut_gue', roam: 3 });
    expect(foePresent(c, d)).toBe(false);
    c.progress.reputation['haut_gue'] = -90;
    expect(foePresent(c, d)).toBe(true);
    c.progress.foes[d.id] = { day: c.progress.day, clock: 0, visits: 0 };
    expect(foePresent(c, d)).toBe(false);
    c.progress.day += 1;
    expect(foePresent(c, d)).toBe(true);
  });
});

describe('rencontres, difficulté, récompenses', () => {
  it('la rencontre tirée est celle de la table, stable pour une graine, et respecte le type', () => {
    const d = def({ kind: 'errant', roam: 3 });
    const a = chooseEncounter(data, d, 'graine');
    expect(chooseEncounter(data, d, 'graine').id).toBe(a.id);
    const zone = data.zones.find((z) => z.id === 'z1');
    expect(zone?.encounterTable.filter((t) => t.for.includes('errant')).map((t) => t.encounter)).toContain(a.id);
    const seen = new Set(Array.from({ length: 60 }, (_, i) => chooseEncounter(data, def({ kind: 'errant', zone: 'z2', roam: 3 }), `s${i}`).id));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('l\'indicateur suit l\'écart de niveau (GDD §7.5)', () => {
    const label = (gap: number) => difficultyOf(cfg, 10 + gap, 10, false).id;
    expect([-6, -4, -3, -1, 0, 2, 3, 5, 6, 9].map(label)).toEqual(['facile', 'facile', 'abordable', 'abordable', 'equilibre', 'equilibre', 'dangereux', 'dangereux', 'mortel', 'mortel']);
    expect(difficultyOf(cfg, 1, 20, true)).toMatchObject({ boss: true, id: 'boss' });
  });

  it('victoire : or de la zone, butin, drapeaux, ennemi vaincu pour de bon', () => {
    const c = ctx();
    const encounter = findEncounter(data, 'camp_des_ecumeurs');
    const before = c.progress.gold;
    const result = settleBattle(c, { end: 'victory', encounter, foeId: 'z1_brakk', enemiesDefeated: 7, bossDown: true, seed: 'x' });
    expect(result.goldWon).toBeGreaterThan(80 + 6 * 10);
    expect(c.progress.gold).toBe(before + result.goldWon);
    expect(c.flags).toContain('boss_brakk');
    expect(c.progress.foes['z1_brakk']).toBeDefined();
    const hyper = c.progress.inventory.find((s) => s.item === 'hyper_potion');
    expect(hyper?.qty).toBeGreaterThanOrEqual(2);
    expect(result.notices.length).toBeGreaterThan(0);
  });

  it('victoire : or d\'un ennemi entre le min et le max de la zone, butin reproductible', () => {
    const encounter = findEncounter(data, 'rodeurs_aubemer');
    const run1 = ctx();
    const a = settleBattle(run1, { end: 'victory', encounter, foeId: 'z1_rodeur_plaine', enemiesDefeated: 4, bossDown: false, seed: 'même' });
    const run2 = ctx();
    const b = settleBattle(run2, { end: 'victory', encounter, foeId: 'z1_rodeur_plaine', enemiesDefeated: 4, bossDown: false, seed: 'même' });
    expect(a.goldWon).toBe(b.goldWon);
    expect(run1.progress.inventory).toEqual(run2.progress.inventory);
    const zone = data.zones.find((z) => z.id === 'z1');
    expect(a.goldWon).toBeGreaterThanOrEqual(4 * (zone?.goldPerEnemy.min ?? 0));
    expect(a.goldWon).toBeLessThanOrEqual(4 * (zone?.goldPerEnemy.max ?? 0));
  });

  it('défaite : 10 % de l\'or perdu, retour au dernier village ; retraite : rien ne change (décision n°56)', () => {
    const c = ctx();
    c.progress.gold = 205;
    c.progress.lastVillage = 'haut_gue';
    const encounter = findEncounter(data, 'patrouille_ecumeurs');
    const lost = settleBattle(c, { end: 'defeat', encounter, foeId: 'z1_patrouille_gue', enemiesDefeated: 1, bossDown: false, seed: 'x' });
    expect(c.progress.gold).toBe(205 - 20);
    expect(lost).toMatchObject({ goldLost: 20, wakeAt: { location: 'haut_gue' } });
    expect(c.progress.foes['z1_patrouille_gue']).toBeUndefined();
    const retreat = settleBattle(c, { end: 'retreat', encounter, foeId: 'z1_patrouille_gue', enemiesDefeated: 2, bossDown: false, seed: 'x' });
    expect(retreat).toMatchObject({ goldLost: 0, wakeAt: null, notices: [] });
    expect(c.progress.gold).toBe(185);
  });
});

describe('embuscade et renforts dans le combat', () => {
  const { source } = testWorld();
  const encounter = findEncounter(data, 'embuscade_roseaux');
  const party = testPartyAt(data);

  it('embuscade subie : la phase ennemie ouvre le combat, les ennemis sont tout près, le tour 1 reste le tour 1', () => {
    const calm = buildBattle(encounter, party, data, { seed: 'a', world: source, site: { x: 56, y: 84 } });
    const ambushed = buildBattle(encounter, party, data, { seed: 'a', world: source, site: { x: 56, y: 84 }, ambush: true });
    expect(calm.phase).toBe('player');
    expect(ambushed.phase).toBe('enemy');
    const nearest = (s: typeof calm) => Math.min(...s.units.filter((u) => u.team === 'enemy').flatMap((e) => s.units.filter((u) => u.team === 'player').map((p) => Math.abs(p.x - e.x) + Math.abs(p.y - e.y))));
    expect(nearest(ambushed)).toBeLessThan(nearest(calm));
    expect(nearest(ambushed)).toBeGreaterThanOrEqual(2);
    endPhase(ambushed);
    expect(ambushed.phase).toBe('player');
    expect(ambushed.turn).toBe(1);
    endPhase(ambushed);
    expect(ambushed.phase).toBe('enemy');
  });

  it('l\'embuscade annule l\'avantage de position', () => {
    const s = buildBattle(encounter, party, data, { seed: 'a', world: source, site: { x: 56, y: 84 }, ambush: true, initiative: true });
    expect(s.initiative).toBe(false);
  });

  it('les renforts d\'une vigie rejoignent les ennemis de la rencontre', () => {
    const sentinels = findEncounter(data, 'sentinelles_ecumeurs');
    const s = buildBattle(sentinels, party, data, { seed: 'b', world: source, site: { x: 88, y: 78 }, extraEnemies: [{ enemy: 'ecumeur_sabreur', level: 2 }, { enemy: 'ecumeur_archer', level: 2 }] });
    expect(s.units.filter((u) => u.team === 'enemy')).toHaveLength(sentinels.enemies.length + 2);
  });
});

describe('passages d\'accès (décision n°67)', () => {
  const requirements = gateRequirements(data.zones);

  it('la Citadelle exige le Gardien de Cendre, la confiance de Pierre-Haute et la barque de Dorn', () => {
    expect(requirements.get('boss_gardien_cendre')).toEqual(['acces_citadelle', 'barque_de_dorn']);
    const flags = (...f: string[]) => new Set(f);
    expect(isGateOpen('boss_gardien_cendre', flags('boss_gardien_cendre'), requirements)).toBe(false);
    expect(isGateOpen('boss_gardien_cendre', flags('boss_gardien_cendre', 'acces_citadelle'), requirements)).toBe(false);
    expect(isGateOpen('boss_gardien_cendre', flags('acces_citadelle', 'barque_de_dorn'), requirements)).toBe(false);
    expect(isGateOpen('boss_gardien_cendre', flags('boss_gardien_cendre', 'acces_citadelle', 'barque_de_dorn'), requirements)).toBe(true);
    expect(isGateOpen('boss_brakk', flags('boss_brakk'), requirements)).toBe(true);
  });

  it('la grille de collision suit les exigences', () => {
    const { map } = testWorld();
    const grid = CollisionGrid.fromMap(map, ['boss_gardien_cendre']);
    grid.setGateRequirements(requirements);
    const gate = map.gates.find((g) => g.props['flag'] === 'boss_gardien_cendre');
    expect(gate).toBeDefined();
    const cx = Math.floor((((gate?.x ?? 0) + (gate?.width ?? 0) / 2)) / TILE);
    const cy = Math.floor((((gate?.y ?? 0) + (gate?.height ?? 0) / 2)) / TILE);
    expect(grid.isSolidCell(cx, cy)).toBe(true);
    grid.setOpenFlags(['boss_gardien_cendre', 'acces_citadelle', 'barque_de_dorn']);
    expect(grid.isSolidCell(cx, cy)).toBe(false);
  });
});
