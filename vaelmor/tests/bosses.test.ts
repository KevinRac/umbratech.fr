/**
 * Jalon M5 : boss à deux phases (GDD §9.11), renforts des cartes de boss,
 * profils d'IA (soutien, boss à compétences), équilibrage indicatif de Brakk.
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { planAllyAction } from '../src/logic/ai/allyAi';
import { executePlan, planEnemyAction } from '../src/logic/ai/enemyAi';
import { attackUnit, endPhase, readyUnits, skillAction, waitUnit } from '../src/logic/tactics/battle';
import { checkBossPhases, phaseThreshold } from '../src/logic/tactics/bosses';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { hasStatus } from '../src/logic/tactics/status';
import type { BattleState } from '../src/logic/tactics/types';
import { makeBattle, plains, rules, unit } from './helpers/battle';
import { testWorld } from './helpers/world';

const R = rules();
const data = loadGameData();

function autoPlay(s: BattleState, maxTurns = 40): void {
  while (s.outcome === 'ongoing' && s.turn <= maxTurns) {
    for (const u of readyUnits(s)) {
      if (s.outcome !== 'ongoing') break;
      if (u.hp <= 0 || u.acted) continue;
      executePlan(s, u.team === 'ally' ? planAllyAction(s, u.id, R) : planEnemyAction(s, u.id, R), R);
    }
    endPhase(s, R);
  }
}

describe('boss à deux phases (GDD §9.11)', () => {
  it('chaque boss de zone a sa fiche : seuil à 50 %, nouvelles compétences, réplique', () => {
    for (const id of ['brakk', 'roi_cerf', 'soeur_merrow', 'mere_harpie', 'gardien_de_cendre']) {
      const boss = data.bosses.find((b) => b.enemy === id);
      expect(boss, id).toBeTruthy();
      expect(boss?.phase2.threshold).toBe(0.5);
      expect(boss?.phase2.skills.length).toBeGreaterThan(0);
      expect(boss?.phase2.line.length).toBeGreaterThan(5);
      expect(boss?.immune).toContain('gel');
    }
  });

  it('Brakk passe en phase 2 sous 50 % : réplique, Cri de pillage aussitôt, il quitte son trône', () => {
    const s = makeBattle(plains(9, 3), [{ class: 'chasseur_de_serpents_de_mer', at: [3, 1], level: 6 }], [
      { enemy: 'brakk', at: [4, 1], boss: true, level: 4 },
      { enemy: 'ecumeur_sabreur', at: [7, 1] },
      { enemy: 'ecumeur_archer', at: [8, 2] },
    ], { objective: 'boss' });
    const brakk = unit(s, 'e0');
    expect(brakk.boss?.phase).toBe(1);
    expect(brakk.ai).toBe('boss');
    expect(brakk.skills).toEqual([]);
    brakk.hp = (phaseThreshold(brakk) ?? 0) + 1;
    expect(checkBossPhases(s, R)).toEqual([]);
    brakk.hp = phaseThreshold(brakk) ?? 0;
    const events = checkBossPhases(s, R);
    expect(events[0]).toMatchObject({ type: 'bossPhase', unitId: 'e0' });
    expect(events.some((e) => e.type === 'skill' && e.skillId === 'cri_de_pillage')).toBe(true);
    expect(brakk.boss?.phase).toBe(2);
    expect(brakk.ai).toBe('agressif');
    expect(brakk.skills).toEqual(['cri_de_pillage', 'hache_tournoyante']);
    // Le cri renforce les Écumeurs à 5 cases (le sabreur à 3, l'archer à 5) et Brakk lui-même.
    expect(hasStatus(unit(s, 'e1'), 'cri_de_pillage')).toBe(true);
    expect(hasStatus(unit(s, 'e2'), 'cri_de_pillage')).toBe(true);
    expect(hasStatus(brakk, 'cri_de_pillage')).toBe(true);
    expect(brakk.cooldowns['cri_de_pillage']).toBe(s.turn + 3);
    // Une seule fois.
    brakk.hp = 1;
    expect(checkBossPhases(s, R)).toEqual([]);
  });

  it('le passage en phase 2 arrive pendant l’échange qui fait tomber le boss sous le seuil', () => {
    // Une prêtresse frappe faiblement : le coup qui passe le seuil ne tue pas Brakk.
    const s = makeBattle(plains(4, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 1 }], [{ enemy: 'brakk', at: [1, 0], boss: true, level: 4 }], { objective: 'boss', seed: 'p2' });
    const brakk = unit(s, 'e0');
    const priest = unit(s, 'p0');
    brakk.hp = (phaseThreshold(brakk) ?? 0) + 2;
    let events: ReturnType<typeof attackUnit> = [];
    for (let i = 0; i < 20 && brakk.boss?.phase === 1; i++) {
      priest.acted = false;
      priest.hp = priest.stats.pv;
      events = attackUnit(s, 'p0', 'e0', R);
    }
    expect(events.some((e) => e.type === 'bossPhase')).toBe(true);
  });

  it('en phase 2, Brakk lance sa hache tournoyante quand deux adversaires sont au contact', () => {
    const s = makeBattle(plains(5, 3), [{ class: 'lame_du_serment', at: [1, 1], level: 3 }, { class: 'gardien_des_marees', at: [3, 1], level: 3 }], [{ enemy: 'brakk', at: [2, 1], boss: true, level: 4 }], { objective: 'boss' });
    const brakk = unit(s, 'e0');
    brakk.hp = phaseThreshold(brakk) ?? 1;
    checkBossPhases(s, R);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planEnemyAction(s, 'e0', R);
    expect(plan.skill?.id).toBe('hache_tournoyante');
    const events = executePlan(s, plan, R);
    const fx = events.find((e) => e.type === 'effects');
    expect(fx?.type === 'effects' && fx.results.map((r) => r.unitId).sort()).toEqual(['p0', 'p1']);
    expect(brakk.cooldowns['hache_tournoyante']).toBe(s.turn + 2);
  });

  it('les autres boss changent aussi de phase (mécanisme générique)', () => {
    for (const id of ['roi_cerf', 'soeur_merrow', 'mere_harpie', 'gardien_de_cendre']) {
      const s = makeBattle(plains(8, 3), [{ class: 'gardien_des_marees', at: [0, 1], level: 10 }], [{ enemy: id, at: [5, 1], boss: true, level: 10 }], { objective: 'boss' });
      const boss = unit(s, 'e0');
      boss.hp = phaseThreshold(boss) ?? 1;
      const events = checkBossPhases(s, R);
      expect(events[0], id).toMatchObject({ type: 'bossPhase' });
      expect(boss.skills, id).toEqual(data.bosses.find((b) => b.enemy === id)?.phase2.skills);
    }
  });

  it('renforts des cartes de boss : aux tours 3 et 6, au début de la phase ennemie', () => {
    const s = buildBattle(findEncounter(data, 'camp_des_ecumeurs'), data.encounters.testParty, data, { seed: 1, world: testWorld().source });
    const count = (): number => s.units.filter((u) => u.team === 'enemy').length;
    const start = count();
    expect(s.reinforcements.map((r) => r.turn)).toEqual([3, 6]);
    const arrivals: number[] = [];
    while (s.turn <= 6 && s.outcome === 'ongoing') {
      for (const u of readyUnits(s)) waitUnit(s, u.id);
      const events = endPhase(s, R);
      for (const e of events) if (e.type === 'arrive') arrivals.push(s.turn);
      if (s.phase === 'enemy') expect(events.some((e) => e.type === 'arrive')).toBe(s.turn === 3 || s.turn === 6);
    }
    expect(arrivals).toEqual([3, 6]);
    expect(count()).toBe(start + 4);
    // Ils entrent sur des cases libres et franchissables.
    for (const u of s.units) expect(s.units.filter((o) => o !== u && o.hp > 0 && u.hp > 0 && o.x === u.x && o.y === u.y)).toEqual([]);
  });

  it('équilibrage indicatif de Brakk : battable, ni trivial ni injuste (IA contre IA)', () => {
    let wins = 0;
    let phase2 = 0;
    const N = 30;
    for (let seed = 0; seed < N; seed++) {
      const s = buildBattle(findEncounter(data, 'camp_des_ecumeurs'), data.encounters.testParty, data, { seed, world: testWorld().source });
      autoPlay(s);
      expect(s.outcome).not.toBe('ongoing');
      if (s.outcome === 'victory') wins++;
      if (s.units.some((u) => u.boss?.phase === 2)) phase2++;
    }
    // L'IA joue la compagnie bien moins bien qu'un joueur (elle lance le héros dans la mêlée) :
    // elle gagne entre une fois sur cinq et quatre fois sur cinq, et voit la phase 2 le plus souvent.
    expect(wins / N).toBeGreaterThan(0.2);
    expect(wins / N).toBeLessThan(0.8);
    expect(phase2 / N).toBeGreaterThan(0.5);
  });
});

describe('profil « soutien » (GDD §9.15)', () => {
  it('la rebouteuse soigne un Écumeur blessé plutôt que de frapper', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'rebouteuse', at: [2, 0], level: 4 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 3 }]);
    unit(s, 'e1').hp = 4;
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planEnemyAction(s, 'e0', R);
    expect(plan.healId).toBe('e1');
    executePlan(s, plan, R);
    expect(unit(s, 'e1').hp).toBeGreaterThan(4);
  });

  it('sans blessé, elle frappe ou s’approche', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'rebouteuse', at: [2, 0], level: 4 }]);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const plan = planEnemyAction(s, 'e0', R);
    expect(plan.healId ?? null).toBeNull();
    expect(plan.targetId).toBe('p0');
  });

  it('le boss en phase 1 ne quitte pas sa case ; la compétence d’un boss attend son délai', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'brakk', at: [4, 0], boss: true, level: 4 }], { objective: 'boss' });
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    expect(planEnemyAction(s, 'e0', R)).toMatchObject({ to: { x: 4, y: 0 }, targetId: null });
    const brakk = unit(s, 'e0');
    brakk.hp = phaseThreshold(brakk) ?? 1;
    checkBossPhases(s, R);
    // Le cri vient d'être lancé : pas avant 3 tours.
    expect(() => skillAction(s, 'e0', 'cri_de_pillage', { x: 4, y: 0 }, R)).toThrow(/Prête au tour/);
  });
});
