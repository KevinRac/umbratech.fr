/**
 * Jalon M5 : alliés verts (GDD §7.8) — phase alliée, IA alliée, renforts
 * alliés, gardes de village, alliés de passage, alliés errants du monde.
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { ALLY_W, menaceBonus, planAllyAction } from '../src/logic/ai/allyAi';
import { executePlan, planEnemyAction } from '../src/logic/ai/enemyAi';
import { BattleError, endPhase, evaluateOutcome, moveUnit, readyUnits, waitUnit } from '../src/logic/tactics/battle';
import { buildBattle, findEncounter, type AllyJoin } from '../src/logic/tactics/encounter';
import { distance } from '../src/logic/tactics/grid';
import { allyLevel, distanceToArea, errantPresent, planAllies, woundErrants, type VillageArea } from '../src/logic/game/allyRules';
import { newProgress } from '../src/logic/game/progress';
import { Rng } from '../src/logic/rng';
import { CollisionGrid } from '../src/logic/world/collision';
import { createWalker, updateWalker, walkerCell } from '../src/logic/world/allyWalkers';
import { findPath } from '../src/logic/world/pathfinding';
import type { TierId } from '../src/data/townSchemas';
import { makeBattle, plains, rules, unit } from './helpers/battle';
import { testWorld } from './helpers/world';

const R = rules();
const data = loadGameData();

describe('phase alliée (GDD §7.8)', () => {
  it('joueur → alliés → ennemis ; sans allié, la phase alliée est sautée', () => {
    const s = makeBattle(plains(8, 3), [{ class: 'lame_du_serment', at: [0, 1] }], [{ enemy: 'ecumeur_sabreur', at: [7, 1] }], { greens: [{ class: 'gardien_des_marees', at: [1, 1] }] });
    expect(endPhase(s, R)[0]).toMatchObject({ type: 'phase', team: 'ally', turn: 1 });
    expect(readyUnits(s).map((u) => u.id)).toEqual(['g0']);
    expect(endPhase(s, R)[0]).toMatchObject({ type: 'phase', team: 'enemy', turn: 1 });
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    expect(endPhase(s, R)[0]).toMatchObject({ type: 'phase', team: 'player', turn: 2 });
    const alone = makeBattle(plains(8, 3), [{ class: 'lame_du_serment', at: [0, 1] }], [{ enemy: 'ecumeur_sabreur', at: [7, 1] }]);
    expect(endPhase(alone, R)[0]).toMatchObject({ type: 'phase', team: 'enemy', turn: 1 });
  });

  it('le joueur ne commande jamais un allié vert', () => {
    const s = makeBattle(plains(8, 3), [{ class: 'lame_du_serment', at: [0, 1] }], [{ enemy: 'ecumeur_sabreur', at: [7, 1] }], { greens: [{ class: 'gardien_des_marees', at: [1, 1] }] });
    expect(readyUnits(s).map((u) => u.id)).toEqual(['p0']);
    expect(() => moveUnit(s, 'g0', { x: 2, y: 1 })).toThrow(BattleError);
  });

  it('les alliés verts ne comptent pas dans la défaite ni dans la victoire', () => {
    const s = makeBattle(plains(8, 3), [{ class: 'lame_du_serment', at: [0, 1], hero: true }], [{ enemy: 'ecumeur_sabreur', at: [7, 1] }], { greens: [{ class: 'gardien_des_marees', at: [1, 1] }] });
    unit(s, 'g0').hp = 0;
    expect(evaluateOutcome(s)).toBe('ongoing');
    unit(s, 'g0').hp = 10;
    unit(s, 'p0').hp = 0;
    expect(evaluateOutcome(s)).toBe('defeat');
  });

  it('un allié arrive au tour prévu, au début de la phase alliée, près de son point d’entrée', () => {
    const join: AllyJoin = { template: 'garde_haut_gue', level: 3, turn: 2, worldCell: null, source: 'garde', errantId: null, label: 'Les gardes de Haut-Gué accourent !' };
    const s = buildBattle(findEncounter(data, 'embuscade_du_gue'), data.encounters.testParty, data, { seed: 3, world: testWorld().source, allies: [join] });
    expect(s.reinforcements).toHaveLength(1);
    // Tour 1 : pas encore d'allié, la phase alliée est sautée.
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    expect(endPhase(s, R)[0]).toMatchObject({ team: 'enemy', turn: 1 });
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R); // tour 2, joueur
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    const events = endPhase(s, R);
    expect(events[0]).toMatchObject({ type: 'phase', team: 'ally', turn: 2 });
    const arrive = events.find((e) => e.type === 'arrive');
    expect(arrive).toMatchObject({ team: 'ally', label: 'Les gardes de Haut-Gué accourent !' });
    const guard = s.units.find((u) => u.team === 'ally');
    expect(guard).toMatchObject({ name: 'Garde de Haut-Gué', allySource: 'garde', level: 3, sprite: 'milicien' });
    expect(guard?.acted).toBe(false);
  });
});

describe('IA alliée (GDD §7.8)', () => {
  it('protège le héros : frappe l’ennemi qui le menace plutôt qu’un ennemi isolé', () => {
    // Le héros en (0,1) ; un sabreur à 4 cases de lui (il peut le frapper au prochain tour), un autre loin du héros.
    const s = makeBattle(plains(12, 3), [{ class: 'heritier_des_cendres', at: [0, 1], hero: true, level: 1 }], [
      { enemy: 'ecumeur_sabreur', at: [4, 1], level: 2 },
      { enemy: 'ecumeur_sabreur', at: [8, 2], level: 2 },
    ], { greens: [{ class: 'lame_du_serment', at: [6, 1], level: 3 }] });
    expect(menaceBonus(s, unit(s, 'e0'), R)).toBeGreaterThanOrEqual(ALLY_W.protectHero);
    expect(menaceBonus(s, unit(s, 'e1'), R)).toBe(0);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planAllyAction(s, 'g0', R);
    expect(plan.targetId).toBe('e0');
  });

  it('un allié soigneur soigne d’abord un membre blessé', () => {
    const s = makeBattle(plains(10, 3), [{ class: 'lame_du_serment', at: [2, 1], hero: true }], [{ enemy: 'ecumeur_sabreur', at: [5, 1] }], { greens: [{ class: 'porte_lanterne', at: [0, 1], level: 3 }] });
    unit(s, 'p0').hp = 5;
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planAllyAction(s, 'g0', R);
    expect(plan.healId).toBe('p0');
    executePlan(s, plan, R);
    expect(unit(s, 'p0').hp).toBeGreaterThan(5);
  });

  it('sans cible, il s’avance sans s’éloigner de la compagnie de plus de 4 cases', () => {
    const s = makeBattle(plains(20, 3), [{ class: 'gardien_des_marees', at: [0, 1], hero: true }], [{ enemy: 'ecumeur_sabreur', at: [19, 1] }], { greens: [{ class: 'danseur_des_courants', at: [1, 1], level: 3 }] });
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planAllyAction(s, 'g0', R);
    expect(plan.to.x).toBeGreaterThan(1);
    expect(distance(plan.to, unit(s, 'p0'))).toBeLessThanOrEqual(R.allies.leash);
  });

  it('un combat avec des alliés se termine toujours (IA partout)', () => {
    for (let seed = 0; seed < 5; seed++) {
      const joins: AllyJoin[] = [
        { template: 'garde_haut_gue', level: 3, turn: 1, worldCell: null, source: 'garde', errantId: null, label: 'Gardes' },
        { template: 'apprentie_haut_gue', level: 2, turn: 2, worldCell: null, source: 'passage', errantId: null, label: 'Renfort' },
      ];
      const s = buildBattle(findEncounter(data, 'embuscade_du_gue'), data.encounters.testParty, data, { seed, world: testWorld().source, allies: joins });
      for (let guard = 0; guard < 200 && s.outcome === 'ongoing'; guard++) {
        for (const u of readyUnits(s)) {
          if (s.outcome !== 'ongoing' || u.acted || u.hp <= 0) continue;
          executePlan(s, u.team === 'ally' ? planAllyAction(s, u.id, R) : planEnemyAction(s, u.id, R), R);
        }
        endPhase(s, R);
      }
      expect(s.outcome).not.toBe('ongoing');
    }
  });
});

describe('qui rejoint un combat (GDD §7.8)', () => {
  const haut: Omit<VillageArea, 'tier'> = { id: 'haut_gue', name: 'Haut-Gué', x0: 61, y0: 72, x1: 82, y1: 87, zone: 1 };
  const plan = (tier: TierId, site: { x: number; y: number }, seed: string | number = 1, errants: { id: string; cell: { x: number; y: number } }[] = []) =>
    planAllies({ data, site, zoneValue: 1, villages: [{ ...haut, tier }], errants, rng: Rng.fromSeed(seed) });

  it('gardes : aucun à Hostile ou Neutre, un à Amical, deux à Allié ; seulement à 10 cases au plus du village', () => {
    const near = { x: 88, y: 80 }; // 6 cases à l'est du village
    expect(distanceToArea({ ...haut, tier: 'neutre' }, near)).toBe(6);
    const guards = (tier: TierId) => plan(tier, near).filter((j) => j.source === 'garde');
    expect(guards('hostile')).toHaveLength(0);
    expect(guards('neutre')).toHaveLength(0);
    expect(guards('amical')).toHaveLength(1);
    expect(guards('allie')).toHaveLength(2);
    expect(guards('heros_local').map((g) => g.turn)).toEqual([1, 1]);
    expect(guards('amical')[0]).toMatchObject({ template: 'garde_haut_gue', turn: 2, worldCell: { x: 72, y: 80 } });
    expect(plan('allie', { x: 100, y: 80 }).filter((j) => j.source === 'garde')).toHaveLength(0);
  });

  it('allié de passage : 0 % à Neutre, environ 35 % à Héros local', () => {
    const rate = (tier: TierId) => {
      let n = 0;
      for (let seed = 0; seed < 400; seed++) if (plan(tier, { x: 40, y: 60 }, seed).some((j) => j.source === 'passage')) n++;
      return n / 400;
    };
    expect(rate('neutre')).toBe(0);
    expect(rate('amical')).toBeGreaterThan(0.05);
    expect(rate('amical')).toBeLessThan(0.16);
    expect(rate('heros_local')).toBeGreaterThan(0.28);
    expect(rate('heros_local')).toBeLessThan(0.42);
    const passer = (() => {
      for (let seed = 0; ; seed++) {
        const j = plan('heros_local', { x: 40, y: 60 }, seed).find((x) => x.source === 'passage');
        if (j) return j;
      }
    })();
    expect([2, 3]).toContain(passer.turn);
    expect(passer.worldCell).toBeNull();
  });

  it('allié errant : d’office à 6 cases, une fois sur deux s’il voit le combat, jamais au-delà', () => {
    const site = { x: 40, y: 60 };
    expect(plan('neutre', site, 1, [{ id: 'aldric', cell: { x: 45, y: 62 } }]).filter((j) => j.source === 'errant')).toHaveLength(1);
    expect(plan('neutre', site, 1, [{ id: 'aldric', cell: { x: 70, y: 62 } }])).toHaveLength(0);
    let joined = 0;
    for (let seed = 0; seed < 200; seed++) if (plan('neutre', site, seed, [{ id: 'aldric', cell: { x: 50, y: 62 } }]).length > 0) joined++;
    expect(joined / 200).toBeGreaterThan(0.38);
    expect(joined / 200).toBeLessThan(0.62);
    const j = plan('neutre', site, 1, [{ id: 'aldric', cell: { x: 45, y: 62 } }])[0];
    expect(j).toMatchObject({ template: 'voyageur_arme', errantId: 'aldric', worldCell: { x: 45, y: 62 }, turn: 2 });
  });

  it('niveau des alliés : milieu des niveaux de la zone + écart du modèle', () => {
    expect(allyLevel(data, 1, 'garde_haut_gue')).toBe(3);
    expect(allyLevel(data, 1, 'milicien_haut_gue')).toBe(2);
    expect(allyLevel(data, 4, 'garde_pierre_haute')).toBe(15);
  });

  it('un errant tombé au combat est blessé jusqu’au prochain repos', () => {
    const progress = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    expect(errantPresent(progress, 'aldric')).toBe(true);
    woundErrants(progress, ['aldric']);
    expect(errantPresent(progress, 'aldric')).toBe(false);
    progress.day += 1;
    expect(errantPresent(progress, 'aldric')).toBe(true);
  });
});

describe('alliés errants du monde', () => {
  it('chaque route est parcourable d’une étape à l’autre, passages fermés', () => {
    const grid = CollisionGrid.fromMap(testWorld().map);
    for (const w of data.wanderers) {
      w.route.forEach(([x, y], i) => {
        const [nx, ny] = w.route[(i + 1) % w.route.length] as [number, number];
        expect(findPath(grid, { x, y }, { x: nx, y: ny }), `${w.id} étape ${i}`).not.toBeNull();
      });
    }
  });

  it('un errant suit sa route, marque une pause à chaque étape et s’arrête quand on lui parle', () => {
    const map = testWorld().map;
    const grid = CollisionGrid.fromMap(map);
    const def = data.wanderers.find((w) => w.id === 'aldric');
    if (!def) throw new Error('aldric absent');
    const w = createWalker(def, map.tileSize);
    const env = { grid, tile: map.tileSize, speed: 40, pauseMs: 500, hero: { x: -999, y: -999 } };
    const start = walkerCell(w, map.tileSize);
    let reached = false;
    for (let t = 0; t < 4000 && !reached; t++) {
      updateWalker(w, 50, env);
      const c = walkerCell(w, map.tileSize);
      if (c.x === def.route[1]?.[0] && c.y === def.route[1]?.[1]) reached = true;
    }
    expect(reached).toBe(true);
    expect(walkerCell(w, map.tileSize)).not.toEqual(start);
    // En pause à l'étape : il ne bouge pas.
    updateWalker(w, 50, env);
    expect(w.moving).toBe(false);
    w.talking = true;
    const before = { x: w.x, y: w.y };
    for (let i = 0; i < 40; i++) updateWalker(w, 50, env);
    expect({ x: w.x, y: w.y }).toEqual(before);
  });
});
