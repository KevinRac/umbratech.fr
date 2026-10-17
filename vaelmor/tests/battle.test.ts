import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { planEnemyAction } from '../src/logic/ai/enemyAi';
import { forecast, resolveExchange, triangleEdge } from '../src/logic/combat/combat';
import { BattleError, attackUnit, endPhase, evaluateOutcome, moveUnit, phaseComplete, readyUnits, summarize, undoMove, waitUnit } from '../src/logic/tactics/battle';
import { battleRules, buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { cellIndex, distance, mobility, pathTo, reachable, threatCells } from '../src/logic/tactics/grid';
import type { BattleState } from '../src/logic/tactics/types';
import { statsAtLevel } from '../src/logic/units/stats';
import { makeBattle, plains, rules, unit } from './helpers/battle';
import { testWorld } from './helpers/world';

const R = rules();
const cells = (list: readonly { x: number; y: number }[]): string[] => list.map((c) => `${c.x},${c.y}`).sort();

describe('stats selon le niveau (décision n°52)', () => {
  it('niveau 1 = stats de base ; croissance moyenne arrondie au-delà ; la mobilité ne grandit pas', () => {
    const gardien = loadGameData().classes.find((c) => c.id === 'gardien_des_marees');
    if (!gardien) throw new Error('classe absente');
    expect(statsAtLevel(gardien.baseStats, gardien.growths, 1)).toEqual(gardien.baseStats);
    expect(statsAtLevel(gardien.baseStats, gardien.growths, 3)).toEqual({ pv: 26, fo: 7, mag: 0, dex: 5, vit: 4, def: 9, res: 4, chc: 4, mob: 4 });
    expect(() => statsAtLevel(gardien.baseStats, gardien.growths, 0)).toThrow(RangeError);
  });
});

describe('construction d’un combat', () => {
  it('déploie la compagnie d’essai (héros en premier) et place les ennemis', () => {
    const data = loadGameData();
    const encounter = findEncounter(data, 'embuscade_du_gue');
    const state = buildBattle(encounter, data.encounters.testParty, data, { seed: 1, world: testWorld().source });
    const players = state.units.filter((u) => u.team === 'player');
    expect(players).toHaveLength(5);
    expect(players[0]).toMatchObject({ name: 'Voyageur', isHero: true });
    expect(state.units.filter((u) => u.team === 'enemy')).toHaveLength(7);
    expect(state).toMatchObject({ phase: 'player', turn: 1, outcome: 'ongoing', objective: 'rout', zone: 'z1' });
    expect(players.every((p) => p.hp === p.stats.pv && p.weapon.id === data.classes.find((c) => c.id === p.kindId)?.startingWeapon)).toBe(true);
  });

  it('respecte maxDeploy', () => {
    const data = loadGameData();
    const encounter = { ...findEncounter(data, 'embuscade_du_gue'), maxDeploy: 2 };
    const state = buildBattle(encounter, data.encounters.testParty, data, { seed: 1, world: testWorld().source });
    expect(state.units.filter((u) => u.team === 'player').map((u) => u.name)).toEqual(['Voyageur', 'Odran']);
  });

  it('une carte tirée du monde exige la carte du monde', () => {
    const data = loadGameData();
    expect(() => buildBattle(findEncounter(data, 'embuscade_du_gue'), data.encounters.testParty, data, { seed: 1 })).toThrow(/carte du monde est nécessaire/);
  });
});

describe('déplacement sur la grille', () => {
  const map = [
    '.......', //
    '..f....',
    '~~~#~~~',
    '.......',
  ];

  it('coûts du terrain : la forêt coûte 2, la rivière bloque, le pont passe', () => {
    const s = makeBattle(map, [{ class: 'lame_du_serment', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [6, 3] }]);
    const reach = reachable(s, unit(s, 'p0'));
    expect(reach.cost.get(cellIndex(s.map, 2, 1))).toBe(2);
    expect(reach.cost.has(cellIndex(s.map, 0, 2))).toBe(false);
    // 0,0 → pont (3,2) : 1 + 1 + 1 = 3 ; puis rive sud (3,3) : 4 ; (5,3) : 6 > mob 5.
    expect(reach.cost.get(cellIndex(s.map, 3, 3))).toBe(4);
    expect(reach.cost.has(cellIndex(s.map, 5, 3))).toBe(false);
    expect(pathTo(reach, s.map, { x: 3, y: 3 }).map((c) => `${c.x},${c.y}`)).toEqual(['2,0', '3,0', '3,1', '3,2', '3,3']);
  });

  it('traverse un allié sans s’y arrêter ; un ennemi bloque le passage', () => {
    const corridor = ['wwwwwww', '.......', 'wwwwwww'];
    const s = makeBattle(corridor, [{ class: 'lame_du_serment', at: [0, 1] }, { class: 'gardien_des_marees', at: [1, 1] }], [{ enemy: 'ecumeur_sabreur', at: [4, 1] }]);
    const reach = reachable(s, unit(s, 'p0'));
    expect(cells(reach.stops)).toEqual(['0,1', '2,1', '3,1']);
    expect(reach.cost.has(cellIndex(s.map, 5, 1))).toBe(false);
  });

  it('déplacement, annulation, puis action', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'lame_du_serment', at: [0, 1] }], [{ enemy: 'ecumeur_sabreur', at: [5, 1] }]);
    const events = moveUnit(s, 'p0', { x: 3, y: 1 });
    expect(events[0]).toMatchObject({ type: 'move', unitId: 'p0' });
    expect(() => moveUnit(s, 'p0', { x: 2, y: 1 })).toThrow(BattleError);
    undoMove(s, 'p0');
    expect(unit(s, 'p0')).toMatchObject({ x: 0, y: 1, moved: false });
    moveUnit(s, 'p0', { x: 4, y: 1 });
    attackUnit(s, 'p0', 'e0', R);
    expect(unit(s, 'p0').acted).toBe(true);
    expect(() => undoMove(s, 'p0')).toThrow(BattleError);
    expect(() => moveUnit(s, 'p0', { x: 9, y: 9 })).toThrow(BattleError);
  });

  it('zone de menace : déplacement + portée de l’arme', () => {
    const s = makeBattle(plains(9, 9), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_archer', at: [4, 4] }]);
    const archer = unit(s, 'e0');
    const threat = threatCells(s, archer);
    // Mob 5 + arc 2 : 7 cases de distance au plus, mais pas la case de l'archer elle-même… sauf s'il peut s'en écarter.
    for (const i of threat) expect(distance({ x: i % 9, y: Math.floor(i / 9) }, archer)).toBeLessThanOrEqual(7);
    expect(threat.has(cellIndex(s.map, 4, 0))).toBe(true);
  });
});

describe('formules de combat (GDD §9.7)', () => {
  // Lame du Serment niv. 3 : Fo 8, Dex 8, Vit 8, Déf 5, Chc 5 ; épée de fer (Pui 5, Préc 90).
  // Écumeur niv. 2 : PV 19, Fo 5, Dex 4, Vit 5, Déf 3, Chc 2 ; hachette (Pui 6, Préc 75).
  it('prévision sur plaine', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', level: 3, at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', level: 2, at: [1, 0] }]);
    const f = forecast(s, unit(s, 'p0'), unit(s, 'e0'), R);
    expect(f.attacker).toMatchObject({ canStrike: true, doubles: false, odds: { damage: 10, hit: 97, crit: 2, triangle: 0, effective: false } });
    expect(f.defender).toMatchObject({ canStrike: true, doubles: false, odds: { damage: 6, hit: 66, crit: 0 } });
  });

  it('le terrain du défenseur le protège (forêt : Déf +1, Esq +20)', () => {
    const s = makeBattle(['.f..'], [{ class: 'lame_du_serment', level: 3, at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', level: 2, at: [1, 0] }]);
    const f = forecast(s, unit(s, 'p0'), unit(s, 'e0'), R);
    expect(f.attacker.odds).toMatchObject({ damage: 9, hit: 77 });
  });

  it('triangle élémentaire : Marée > Cendre > Racine > Marée, seulement pour une arme élémentaire', () => {
    expect(triangleEdge('cendre', 'racine', R)).toBe(1);
    expect(triangleEdge('cendre', 'maree', R)).toBe(-1);
    expect(triangleEdge('racine', 'maree', R)).toBe(1);
    expect(triangleEdge('pierre', 'maree', R)).toBe(0);
    expect(triangleEdge(null, 'maree', R)).toBe(0);
    const s = makeBattle(plains(4, 1), [{ class: 'heritier_des_cendres', at: [0, 0] }, { class: 'gardien_des_marees', at: [1, 0] }, { class: 'faconneur_de_racines', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    const mage = unit(s, 'p0');
    const neutral = forecast(s, mage, unit(s, 'e0'), R, { x: 2, y: 0 }).attacker.odds;
    const vsMaree = forecast(s, mage, unit(s, 'p1'), R).attacker.odds;
    const vsRacine = forecast(s, mage, unit(s, 'p2'), R, { x: 3, y: 0 }).attacker.odds;
    expect(vsMaree.triangle).toBe(-1);
    expect(vsRacine.triangle).toBe(1);
    // Mag 8 + Pui 6 ± 2 − Rés.
    expect(vsMaree.damage).toBe(8 + 6 - 2 - 3);
    expect(vsRacine.damage).toBe(8 + 6 + 2 - 5);
    expect(neutral.triangle).toBe(0);
  });

  it('pas de riposte hors de portée ; l’archer ne frappe pas au contact', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'veilleur_des_falaises', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    expect(forecast(s, unit(s, 'p0'), unit(s, 'e0'), R).defender.canStrike).toBe(false);
    expect(forecast(s, unit(s, 'e0'), unit(s, 'p0'), R, { x: 1, y: 0 }).defender.canStrike).toBe(false);
    expect(forecast(s, unit(s, 'e0'), unit(s, 'p0'), R, { x: 1, y: 0 }).defender.doubles).toBe(false);
  });

  it('double attaque à Vit + 4 ; arme efficace ×1,5 (arbalète contre armure lourde, harpon contre boss)', () => {
    const s = makeBattle(
      plains(6, 2),
      [{ class: 'danseur_des_courants', at: [0, 0] }, { class: 'ingenieur_des_ruines', at: [3, 1] }, { class: 'chasseur_de_serpents_de_mer', at: [5, 0] }],
      [{ enemy: 'ecumeur_lancier', at: [1, 0] }, { enemy: 'brakk', at: [4, 0], boss: true }],
      { objective: 'boss' },
    );
    expect(forecast(s, unit(s, 'p0'), unit(s, 'e0'), R).attacker.doubles).toBe(true); // Vit 10 contre 3
    const bolt = forecast(s, unit(s, 'p1'), unit(s, 'e0'), R, { x: 3, y: 0 }).attacker.odds;
    expect(bolt.effective).toBe(true);
    expect(bolt.damage).toBe(Math.floor((6 + 7 - 5) * 1.5));
    const harpoon = forecast(s, unit(s, 'p2'), unit(s, 'e1'), R).attacker.odds;
    expect(harpoon).toMatchObject({ effective: true, damage: Math.floor((8 + 7 - 6) * 1.5) });
  });

  it('chance de toucher bornée entre 5 et 100 %', () => {
    // Danseur niv. 30 en forêt : esquive 58 + 9 + 20 = 87, plus que la précision du lancier (83).
    const s = makeBattle(['.f.'], [{ class: 'danseur_des_courants', level: 30, at: [1, 0] }], [{ enemy: 'ecumeur_lancier', at: [0, 0] }]);
    expect(forecast(s, unit(s, 'p0'), unit(s, 'e0'), R).attacker.odds.hit).toBe(100);
    expect(forecast(s, unit(s, 'e0'), unit(s, 'p0'), R).attacker.odds.hit).toBe(5);
  });
});

describe('résolution d’un échange', () => {
  const setup = (seed: string): BattleState =>
    makeBattle(plains(4, 1), [{ class: 'lame_du_serment', level: 3, at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', level: 2, at: [1, 0] }], { seed });

  it('est rejouable à l’identique depuis la graine', () => {
    const a = setup('graine');
    const b = setup('graine');
    expect(resolveExchange(a, unit(a, 'p0'), unit(a, 'e0'), R)).toEqual(resolveExchange(b, unit(b, 'p0'), unit(b, 'e0'), R));
  });

  it('applique les dégâts, la Résonance, puis s’arrête à la chute d’une unité', () => {
    for (let seed = 0; seed < 40; seed++) {
      const s = setup(`s${seed}`);
      const lame = unit(s, 'p0');
      const ecumeur = unit(s, 'e0');
      ecumeur.hp = 4;
      const strikes = resolveExchange(s, lame, ecumeur, R);
      const first = strikes[0];
      if (!first) throw new Error('aucun coup');
      expect(first).toMatchObject({ attackerId: 'p0', targetId: 'e0', counter: false });
      if (first.hit) {
        expect(strikes).toHaveLength(1);
        expect(ecumeur.hp).toBe(0);
        expect(first.damage).toBe(4); // jamais plus que les PV restants
      } else {
        expect(strikes[1]).toMatchObject({ counter: true, attackerId: 'e0' });
      }
      expect(lame.resonance).toBeGreaterThanOrEqual(20);
      expect(ecumeur.alerted).toBe(true);
    }
  });

  it('un critique triple les dégâts', () => {
    let seen = false;
    for (let seed = 0; seed < 400 && !seen; seed++) {
      const s = makeBattle(plains(3, 1), [{ class: 'danseur_des_courants', level: 10, at: [0, 0] }], [{ enemy: 'brakk', level: 10, at: [1, 0] }], { seed: `c${seed}` });
      for (const strike of resolveExchange(s, unit(s, 'p0'), unit(s, 'e0'), R)) {
        if (strike.crit && strike.attackerId === 'p0') {
          const odds = forecast(s, unit(s, 'p0'), unit(s, 'e0'), R).attacker.odds;
          expect(strike.damage).toBe(odds.damage * 3);
          seen = true;
        }
      }
    }
    expect(seen).toBe(true);
  });
});

describe('phases, victoire et défaite', () => {
  it('la phase passe à l’ennemi puis revient au joueur au tour suivant', () => {
    const s = makeBattle(plains(6, 2), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [5, 1] }]);
    waitUnit(s, 'p0');
    expect(phaseComplete(s)).toBe(true);
    expect(endPhase(s)[0]).toMatchObject({ type: 'phase', team: 'enemy', turn: 1 });
    expect(readyUnits(s).map((u) => u.id)).toEqual(['e0']);
    waitUnit(s, 'e0');
    expect(endPhase(s)[0]).toMatchObject({ type: 'phase', team: 'player', turn: 2 });
    expect(unit(s, 'p0')).toMatchObject({ acted: false, moved: false });
  });

  it('avantage de position : la première phase ennemie est sautée', () => {
    const s = makeBattle(plains(6, 2), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [5, 1] }], { initiative: true });
    waitUnit(s, 'p0');
    const events = endPhase(s);
    expect(events.filter((e) => e.type === 'phase')).toEqual([
      { type: 'phase', team: 'enemy', turn: 1, skipped: true },
      { type: 'phase', team: 'player', turn: 2, skipped: false },
    ]);
    expect(s.phase).toBe('player');
  });

  it('le village soigne 20 % des PV max d’un allié au début de sa phase', () => {
    const s = makeBattle(['v.....'], [{ class: 'gardien_des_marees', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [5, 0], ai: 'boss' }]);
    const gardien = unit(s, 'p0');
    gardien.hp = 10;
    waitUnit(s, 'p0');
    endPhase(s);
    waitUnit(s, 'e0');
    const events = endPhase(s);
    expect(events).toContainEqual({ type: 'heal', unitId: 'p0', amount: Math.floor(24 * 0.2) });
    expect(gardien.hp).toBe(10 + 4);
  });

  it('finir dans un marais enlise : −1 Mob à la phase suivante seulement', () => {
    const s = makeBattle(['.,....'], [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [5, 0], ai: 'boss' }]);
    const lame = unit(s, 'p0');
    moveUnit(s, 'p0', { x: 1, y: 0 });
    waitUnit(s, 'p0');
    endPhase(s);
    waitUnit(s, 'e0');
    endPhase(s);
    expect(mobility(lame)).toBe(4);
    moveUnit(s, 'p0', { x: 2, y: 0 });
    waitUnit(s, 'p0');
    endPhase(s);
    waitUnit(s, 'e0');
    endPhase(s);
    expect(mobility(lame)).toBe(5);
  });

  it('défaite si le héros tombe ; victoire quand tous les ennemis tombent', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', hero: true, at: [0, 0] }, { class: 'gardien_des_marees', at: [3, 0] }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }]);
    unit(s, 'p0').hp = 0;
    expect(evaluateOutcome(s)).toBe('defeat');
    unit(s, 'p0').hp = 5;
    unit(s, 'e0').hp = 0;
    expect(evaluateOutcome(s)).toBe('victory');
  });

  it('objectif « boss » : la chute du boss suffit ; le bilan rend les drapeaux de victoire', () => {
    const s = makeBattle(
      plains(5, 1),
      [{ class: 'chasseur_de_serpents_de_mer', level: 20, at: [0, 0] }],
      [{ enemy: 'brakk', at: [1, 0], boss: true }, { enemy: 'ecumeur_sabreur', at: [4, 0] }],
      { objective: 'boss' },
    );
    unit(s, 'e0').hp = 1;
    let events = attackUnit(s, 'p0', 'e0', R);
    // Le harpon peut manquer : on recommence jusqu'au coup au but, tour après tour.
    while (s.outcome === 'ongoing') {
      endPhase(s);
      for (const e of readyUnits(s)) waitUnit(s, e.id);
      endPhase(s);
      events = attackUnit(s, 'p0', 'e0', R);
    }
    expect(events.at(-1)).toEqual({ type: 'outcome', outcome: 'victory' });
    expect(summarize(s)).toMatchObject({ outcome: 'victory', enemiesDefeated: 1, enemiesTotal: 2, fallen: [], flags: ['boss_test'] });
    expect(() => waitUnit(s, 'p0')).toThrow(BattleError);
  });
});

describe('IA ennemie (GDD §9.15)', () => {
  it('frappe la cible qu’elle peut vaincre plutôt qu’une cible solide', () => {
    const s = makeBattle(plains(7, 3), [{ class: 'gardien_des_marees', at: [2, 1] }, { class: 'heritier_des_cendres', at: [4, 1] }], [{ enemy: 'ecumeur_sabreur', level: 3, at: [3, 0] }]);
    unit(s, 'p1').hp = 3;
    const plan = planEnemyAction(s, 'e0', R);
    expect(plan.targetId).toBe('p1');
  });

  it('chasseur de héros : préfère le héros à cible égale', () => {
    const s = makeBattle(
      plains(7, 3),
      [{ class: 'lame_du_serment', hero: true, at: [2, 1], name: 'Héros' }, { class: 'lame_du_serment', at: [4, 1], name: 'Double' }],
      [{ enemy: 'ecumeur_incendiaire', at: [3, 2] }],
    );
    expect(planEnemyAction(s, 'e0', R).targetId).toBe('p0');
  });

  it('le boss ne quitte jamais sa case ; le défensif attend tant que personne n’est à sa portée', () => {
    const s = makeBattle(plains(12, 3), [{ class: 'lame_du_serment', at: [0, 1] }], [{ enemy: 'brakk', at: [6, 1], boss: true }, { enemy: 'ecumeur_lancier', at: [11, 1] }], { objective: 'boss' });
    expect(planEnemyAction(s, 'e0', R)).toEqual({ unitId: 'e0', to: { x: 6, y: 1 }, targetId: null });
    expect(planEnemyAction(s, 'e1', R)).toEqual({ unitId: 'e1', to: { x: 11, y: 1 }, targetId: null });
  });

  it('sans cible à portée, l’agressif se rapproche par le chemin réel (le pont, pas la rivière)', () => {
    const map = ['..........', '~~~~#~~~~~', '..........'];
    const s = makeBattle(map, [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [9, 2] }]);
    const plan = planEnemyAction(s, 'e0', R);
    expect(plan.targetId).toBeNull();
    // Il marche vers le pont (4,1) : sa distance au pont diminue de toute sa mobilité.
    expect(distance(plan.to, { x: 4, y: 1 })).toBeLessThan(distance({ x: 9, y: 2 }, { x: 4, y: 1 }));
  });
});

/** Les deux camps jouent avec l'IA : un combat doit toujours se terminer. */
function autoPlay(state: BattleState, maxTurns = 60): void {
  const r = battleRules(loadGameData());
  while (state.outcome === 'ongoing' && state.turn <= maxTurns) {
    for (const u of readyUnits(state)) {
      if (state.outcome !== 'ongoing') break;
      if (u.hp <= 0 || u.acted) continue;
      const plan = planEnemyAction(state, u.id, r);
      if (plan.to.x !== u.x || plan.to.y !== u.y) moveUnit(state, u.id, plan.to);
      if (plan.targetId) attackUnit(state, u.id, plan.targetId, r);
      else waitUnit(state, u.id);
    }
    endPhase(state);
  }
}

describe('combats complets', () => {
  for (const id of loadGameData().encounters.encounters.map((e) => e.id)) {
    it(`« ${id} » se termine (5 graines), sans commande invalide`, () => {
      const data = loadGameData();
      for (let seed = 0; seed < 5; seed++) {
        const s = buildBattle(findEncounter(data, id), data.encounters.testParty, data, { seed, world: testWorld().source });
        autoPlay(s);
        expect(s.outcome).not.toBe('ongoing');
        // Les PV ne sortent jamais des bornes.
        for (const u of s.units) expect(u.hp >= 0 && u.hp <= u.stats.pv).toBe(true);
      }
    });
  }
});
