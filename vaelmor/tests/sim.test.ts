/**
 * Jalon M10, lot F : simulateur d'équilibrage et IA prudente (n°245, n°263).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { dangerAt, nextPrudentPlan, prudentContext, riskPenalty } from '../src/logic/ai/prudentAi';
import { simulateBattle } from '../src/logic/sim/battle';
import { composeCompany } from '../src/logic/sim/company';
import { aggregate, inTarget } from '../src/logic/sim/stats';
import { readyUnits } from '../src/logic/tactics/battle';
import { makeBattle, plains, rules, unit } from './helpers/battle';
import { testWorld } from './helpers/world';

const data = loadGameData();
const R = rules();
const play = (id: string, hero: string, level: number, zone: string, seed: string) => {
  const encounter = data.encounters.encounters.find((e) => e.id === id)!;
  const c = composeCompany(data, hero, zone, level, encounter.maxDeploy);
  return simulateBattle({ data, encounter, members: c.members, loadouts: c.loadouts, world: testWorld().source, seed, ai: 'prudente' });
};

describe('compagnies simulées', () => {
  it('le héros d’abord, au plus `size` membres, objets limités par la préparation', () => {
    const c = composeCompany(data, 'lame_du_serment', 'z3', 10, 5);
    expect(c.members).toHaveLength(5);
    expect(c.members[0]?.hero).toBe(true);
    expect(c.members[0]?.class).toBe('lame_du_serment');
    for (const l of c.loadouts) expect(l.items.reduce((n, s) => n + s.qty, 0)).toBeLessThanOrEqual(data.balance.prep.maxItems);
  });

  it('la compagnie couvre des rôles différents (tank, soin…) avant de doubler un rôle', () => {
    const c = composeCompany(data, 'lame_du_serment', 'z3', 10, 5);
    const roles = c.members.map((m) => data.classes.find((k) => k.id === m.class)?.role);
    expect(new Set(roles).size).toBe(roles.length);
  });

  it('les évolutions viennent avec la zone et le niveau 10', () => {
    expect(composeCompany(data, 'lame_du_serment', 'z1', 3, 5).members.some((m) => m.evolution)).toBe(false);
    expect(composeCompany(data, 'lame_du_serment', 'z3', 10, 5).members.filter((m) => m.evolution)).toHaveLength(1);
    expect(composeCompany(data, 'lame_du_serment', 'z3', 8, 5).members.some((m) => m.evolution)).toBe(false);
  });
});

describe('simulateur', () => {
  it('est déterministe : même graine, même combat', () => {
    expect(play('patrouille_ecumeurs', 'gardien_des_marees', 3, 'z1', 's1')).toEqual(play('patrouille_ecumeurs', 'gardien_des_marees', 3, 'z1', 's1'));
  });

  it('chaque combat finit : victoire ou défaite, jamais sans fin', () => {
    for (const id of ['embuscade_du_gue', 'camp_des_ecumeurs', 'roi_maree_brise']) {
      const r = play(id, 'lame_du_serment', 6, 'z2', 'fin');
      expect(r.outcome, id).not.toBe('timeout');
      expect(r.turns).toBeLessThanOrEqual(41);
    }
  });

  it('une compagnie de zone 1 bat une patrouille de zone 1 le plus souvent', () => {
    const rs = Array.from({ length: 8 }, (_, i) => play('patrouille_ecumeurs', 'gardien_des_marees', 3, 'z1', `p${i}`));
    expect(aggregate(rs).winRate).toBeGreaterThan(0.5);
  });
});

describe('statistiques et cibles (n°245)', () => {
  it('compare aux cibles : ordinaires 70–90 % en 8 tours, boss 45–70 %', () => {
    const mk = (win: number, n: number, turns: number) => aggregate(Array.from({ length: n }, (_, i) => ({ encounter: 'x', boss: false, seed: String(i), outcome: i < win ? 'victory' : 'defeat', turns, deployed: 5, fallen: 0, heroFell: false, hpLeft: 0.5, enemiesDefeated: 0, enemiesTotal: 0, itemsUsed: 0, members: [] }) as const));
    expect(inTarget(false, mk(8, 10, 6)).ok).toBe(true);
    expect(inTarget(false, mk(10, 10, 6)).why).toBe('trop facile');
    expect(inTarget(false, mk(5, 10, 6)).why).toBe('trop dur');
    expect(inTarget(false, mk(8, 10, 12)).why).toBe('trop long');
    expect(inTarget(true, mk(5, 10, 12)).ok).toBe(true);
    expect(inTarget(true, mk(9, 10, 12)).why).toBe('trop facile');
  });
});

describe('IA prudente', () => {
  const make = () => makeBattle(plains(10, 3), [{ class: 'lame_du_serment', at: [0, 1], level: 5, hero: true }, { class: 'gardien_des_marees', at: [1, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [8, 1], level: 5 }]);

  it('le danger est nul hors de portée ennemie et positif au contact', () => {
    const s = make();
    const ctx = prudentContext(s);
    expect(dangerAt(s, unit(s, 'p0'), { x: 0, y: 1 }, ctx, R)).toBe(0);
    expect(dangerAt(s, unit(s, 'p0'), { x: 7, y: 1 }, ctx, R)).toBeGreaterThan(0);
  });

  it('le risque pèse plus pour le héros et pour un blessé, et plus encore s’il est mortel', () => {
    const s = make();
    const hero = unit(s, 'p0');
    const other = unit(s, 'p1');
    expect(riskPenalty(hero, 5)).toBeGreaterThan(riskPenalty(other, 5));
    const hurt = { ...other, hp: Math.ceil(other.stats.pv / 3) } as typeof other;
    expect(riskPenalty(hurt, 5)).toBeGreaterThan(riskPenalty(other, 5));
    expect(riskPenalty(other, other.hp + 1)).toBeGreaterThan(riskPenalty(other, other.hp - 1) + 30);
  });

  it('rend un plan tant que quelqu’un peut agir, puis null', () => {
    const s = make();
    expect(nextPrudentPlan(s, R)).not.toBeNull();
    for (const u of readyUnits(s)) u.acted = true;
    expect(nextPrudentPlan(s, R)).toBeNull();
  });
});
