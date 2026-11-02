/**
 * Jalon M6 : XP et montée de niveau (GDD §9.12, §8.2 ; décisions n°128 à n°132).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { GROWTH_KEYS, type GrowthBlock } from '../src/data/schemas';
import { addXp, killXp, nonLethalXp, rollLevelUp, xpMultiplier } from '../src/logic/progression/xp';
import { Rng } from '../src/logic/rng';
import { attackUnit, endPhase, healAction, itemAction, readyUnits, skillAction, waitUnit } from '../src/logic/tactics/battle';
import { allyUnit } from '../src/logic/tactics/units';
import type { BattleEvent, BattleState, BattleUnit } from '../src/logic/tactics/types';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const R = rules();
const data = loadGameData();
const xpEvents = (events: readonly BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'xp' }> => e.type === 'xp');

/** Rend une attaque sûre : l'attaquant touche toujours, la cible n'a plus qu'un PV. */
function sureKill(s: BattleState, attacker: BattleUnit, target: BattleUnit): void {
  attacker.base.dex = attacker.stats.dex = 99;
  target.base.vit = target.stats.vit = 0;
  target.base.chc = target.stats.chc = 0;
  target.hp = 1;
  void s;
}

describe('barème de l’XP (GDD §9.12)', () => {
  it('coup non létal : 8 + 2Δ, borné de 1 à 20 ; coup fatal : 20 + 4Δ, borné de 5 à 100, +40 pour un boss', () => {
    expect(nonLethalXp(R, 3, 3)).toBe(8);
    expect(nonLethalXp(R, 3, 5)).toBe(12);
    expect(nonLethalXp(R, 10, 1)).toBe(1);
    expect(nonLethalXp(R, 1, 20)).toBe(20);
    expect(killXp(R, 3, 3, false)).toBe(20);
    expect(killXp(R, 3, 1, false)).toBe(12);
    expect(killXp(R, 15, 1, false)).toBe(5);
    expect(killXp(R, 3, 4, true)).toBe(64);
  });

  it('un coup fatal rapporte l’XP du coup fatal ; l’ennemi, lui, n’en gagne jamais', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }, { class: 'gardien_des_marees', at: [3, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }]);
    const lame = unit(s, 'p0');
    const foe = unit(s, 'e0');
    sureKill(s, lame, foe);
    const events = attackUnit(s, 'p0', 'e0', R);
    const xp = xpEvents(events);
    // Dernier ennemi vaincu : victoire, donc +20 de bonus aux membres déployés.
    expect(xp.find((e) => e.unitId === 'p0')).toMatchObject({ amount: 20, bonus: 20, before: { level: 3, xp: 0 }, after: { level: 3, xp: 40 } });
    expect(xp.find((e) => e.unitId === 'p1')).toMatchObject({ amount: 0, bonus: 20 });
    expect(foe.xp).toBeNull();
    expect(lame.xp).toBe(40);
  });

  it('un coup non létal rapporte 8 + 2Δ aux deux membres de l’échange qui frappent', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 4 }, { enemy: 'ecumeur_sabreur', at: [2, 0], level: 4 }]);
    unit(s, 'e0').hp = 99;
    unit(s, 'e0').base.pv = unit(s, 'e0').stats.pv = 99;
    const events = attackUnit(s, 'p0', 'e0', R);
    expect(xpEvents(events)).toEqual([expect.objectContaining({ unitId: 'p0', amount: 10, bonus: 0 })]);
  });
});

describe('montée de niveau (décision n°129)', () => {
  it('une stat monte quand le dé est sous sa croissance ; 100 % et plus donnent un point sûr', () => {
    const always: GrowthBlock = { pv: 100, fo: 150, mag: 0, dex: 0, vit: 0, def: 0, res: 0, chc: 0 };
    for (let i = 0; i < 20; i++) {
      const g = rollLevelUp(always, Rng.fromSeed(i));
      expect(g.pv).toBe(1);
      expect(g.fo).toBeGreaterThanOrEqual(1);
      expect(g.mag ?? 0).toBe(0);
    }
  });

  it('au moins une stat monte toujours, même avec des croissances faibles', () => {
    const weak: GrowthBlock = { pv: 5, fo: 5, mag: 5, dex: 5, vit: 5, def: 5, res: 5, chc: 5 };
    for (let i = 0; i < 300; i++) {
      const gains = rollLevelUp(weak, Rng.fromSeed(`faible${i}`));
      expect(Object.values(gains).reduce((n, v) => n + (v ?? 0), 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it('les gains moyens suivent les croissances (Gardien des Marées, 2 000 tirages)', () => {
    const cls = data.classes.find((c) => c.id === 'gardien_des_marees')!;
    const rng = Rng.fromSeed('moyenne');
    const sum: Record<string, number> = {};
    const n = 2000;
    for (let i = 0; i < n; i++) for (const [k, v] of Object.entries(rollLevelUp(cls.growths, rng))) sum[k] = (sum[k] ?? 0) + (v ?? 0);
    for (const key of GROWTH_KEYS) expect((sum[key] ?? 0) / n).toBeCloseTo(cls.growths[key] / 100, 1);
  });

  it('passer un niveau en combat augmente les stats et les PV restants ; la Mob ne bouge pas', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }, { class: 'gardien_des_marees', at: [3, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }, { enemy: 'ecumeur_sabreur', at: [2, 0], level: 3 }]);
    const lame = unit(s, 'p0');
    lame.xp = 95;
    lame.hp = 10;
    sureKill(s, lame, unit(s, 'e0'));
    const before = { ...lame.base };
    const events = attackUnit(s, 'p0', 'e0', R);
    const ev = xpEvents(events).find((e) => e.unitId === 'p0')!;
    expect(ev.after).toEqual({ level: 4, xp: 15 });
    expect(ev.levelUps).toHaveLength(1);
    const gains = ev.levelUps[0]!.gains;
    for (const key of GROWTH_KEYS) expect(lame.base[key]).toBe(before[key] + (gains[key] ?? 0));
    expect(lame.base.mob).toBe(before.mob);
    expect(lame.hp).toBe(10 + (gains.pv ?? 0));
    expect(lame.gains).toEqual(gains);
    expect(lame.level).toBe(4);
  });

  it('le tirage des croissances n’use pas le hasard du combat', () => {
    const run = (xp: number): number[] => {
      const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 3 }], { seed: 'meme' });
      unit(s, 'p0').xp = xp;
      attackUnit(s, 'p0', 'e0', R);
      return [...s.rng.getState()];
    };
    expect(run(99)).toEqual(run(0));
  });

  it('au plafond (20 en classe de base), l’XP est perdue et la barre reste à 0 (décision n°131)', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 20 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 20 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 20 }]);
    const lame = unit(s, 'p0');
    expect(lame.levelCap).toBe(20);
    expect(addXp(s, R, lame, 500)).toEqual([]);
    expect(lame.xp).toBe(0);
    const near = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 19 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    const u = unit(near, 'p0');
    expect(addXp(near, R, u, 250)).toHaveLength(1);
    expect(u.level).toBe(20);
    expect(u.xp).toBe(0);
  });
});

describe('sources d’XP (décision n°128)', () => {
  it('soin au bâton : 15 ; objet de soin sur un allié : soutien (10)', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 3 }, { class: 'gardien_des_marees', at: [1, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }], {
      loadouts: [
        { weapon: null, accessory: null, items: [] },
        { weapon: null, accessory: null, items: [{ item: 'potion', qty: 1 }] },
      ],
    });
    unit(s, 'p1').hp -= 8;
    expect(xpEvents(healAction(s, 'p0', 'p1', R))).toEqual([expect.objectContaining({ unitId: 'p0', amount: 15 })]);
    unit(s, 'p0').hp -= 8;
    expect(xpEvents(itemAction(s, 'p1', 'potion', 'p0', R))).toEqual([expect.objectContaining({ unitId: 'p1', amount: 10 })]);
  });

  it('l’XP du golem va à l’invocateur', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'invocateur_de_pierres_anciennes', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0], level: 3 }, { enemy: 'ecumeur_sabreur', at: [4, 0], level: 3 }]);
    const skill = data.skills.find((x) => x.owner === 'invocateur_de_pierres_anciennes')!.id;
    skillAction(s, 'p0', skill, { x: 1, y: 0 }, R);
    const golem = s.units.find((u) => u.ownerId === 'p0')!;
    expect(golem).toBeDefined();
    expect(golem.xp).toBeNull();
    // Le golem frappe à la phase suivante du joueur.
    endPhase(s, R);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    golem.x = 2;
    unit(s, 'e0').hp = 99;
    unit(s, 'e0').base.pv = unit(s, 'e0').stats.pv = 99;
    const events = attackUnit(s, golem.id, 'e0', R);
    const xp = xpEvents(events);
    expect(xp.every((e) => e.unitId === 'p0')).toBe(true);
    expect(xp.length).toBe(1);
  });

  it('victoire : +20 à tous les membres déployés, KO compris', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }, { class: 'gardien_des_marees', at: [4, 0], level: 3 }, { class: 'porte_lanterne', at: [3, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }]);
    unit(s, 'p2').hp = 0;
    sureKill(s, unit(s, 'p0'), unit(s, 'e0'));
    const xp = xpEvents(attackUnit(s, 'p0', 'e0', R));
    expect(xp.map((e) => [e.unitId, e.bonus])).toEqual(expect.arrayContaining([['p0', 20], ['p1', 20], ['p2', 20]]));
    expect(unit(s, 'p2').xp).toBe(20);
  });

  it('rattrapage ×1,25 trois niveaux sous la moyenne ; ×0,5 quand la compagnie dépasse la zone de 5 niveaux', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 2 }, { class: 'gardien_des_marees', at: [4, 0], level: 8 }, { class: 'porte_lanterne', at: [3, 0], level: 8 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }]);
    expect(xpMultiplier(s, R, unit(s, 'p0'))).toBe(1.25);
    expect(xpMultiplier(s, R, unit(s, 'p1'))).toBe(1);
    const high = makeBattle(plains(3, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 12 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    expect(xpMultiplier(high, R, unit(high, 'p0'))).toBe(0.5); // zone 1 : niveaux 1 à 5
  });

  it('alliés verts : seuls les errants gagnent de l’XP, et leurs stats suivent la croissance moyenne (décision n°132)', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    const template = { id: 't', name: 'Aldric', class: 'gardien_des_marees', sprite: 'milicien', levelOffset: 0 };
    const guard = allyUnit(data, R, template, 4, 'garde', null, 'g0');
    expect(guard.xp).toBeNull();
    const errant = allyUnit(data, R, template, 4, 'errant', 'aldric', 'g1', 50);
    expect(errant.xp).toBe(50);
    const reference = allyUnit(data, R, template, 5, 'errant', 'aldric', 'g2');
    addXp(s, R, errant, 60);
    expect(errant.level).toBe(5);
    expect(errant.xp).toBe(10);
    expect(errant.base).toEqual(reference.base);
  });
});
