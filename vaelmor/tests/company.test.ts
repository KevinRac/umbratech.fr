/**
 * Jalon M6 : compagnie persistante (niveaux, XP et stats reportés après un combat).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { ensureCompany, memberId, newProgress } from '../src/logic/game';
import { attackUnit } from '../src/logic/tactics/battle';
import { statsAtLevel } from '../src/logic/units/stats';
import { applyBattleProgress, applyErrantProgress, createMember } from '../src/logic/units/company';
import { allyUnit } from '../src/logic/tactics/units';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const data = loadGameData();
const R = rules();

describe('compagnie persistante', () => {
  it('un nouveau membre reçoit la croissance moyenne de son niveau (n°52, n°135)', () => {
    const m = createMember(data, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants', level: 4 });
    const cls = data.classes.find((c) => c.id === 'danseur_des_courants')!;
    expect(m.stats).toEqual(statsAtLevel(cls.baseStats, cls.growths, 4));
    expect(m).toMatchObject({ level: 4, xp: 0, levelCap: 20, hero: false });
  });

  it('identifiant tiré du nom, sans accent', () => {
    expect(memberId('Ilmëa')).toBe('ilmea');
    expect(memberId('Gérard')).toBe('gerard');
  });

  it('la compagnie est créée une fois (compagnie d’essai en attendant l’étape 2), au niveau imposé par ?lvl', () => {
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    const c = ensureCompany(data, p, 6);
    expect(c).toHaveLength(data.encounters.testParty.length);
    expect(c.every((m) => m.level === 6)).toBe(true);
    expect(c[0]?.id).toBe('heros');
    expect(ensureCompany(data, p)).toBe(c);
  });

  it('niveau, XP et stats gagnés en combat sont reportés sur le membre', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 3 }]);
    const company = [createMember(data, { id: 'heros', name: 'Allié 0', class: 'lame_du_serment', level: 3, hero: true })];
    const before = { ...company[0]!.stats };
    const lame = unit(s, 'p0');
    lame.xp = 99;
    lame.base.dex = lame.stats.dex = 99;
    unit(s, 'e0').hp = 1;
    unit(s, 'e0').stats.vit = 0;
    attackUnit(s, 'p0', 'e0', R);
    applyBattleProgress(company, s.units);
    const m = company[0]!;
    expect(m.level).toBe(4);
    expect(m.xp).toBe(19);
    for (const [k, v] of Object.entries(lame.gains)) expect(m.stats[k as keyof typeof m.stats]).toBe(before[k as keyof typeof before] + (v ?? 0));
  });

  it('les alliés errants gardent leur niveau et leur XP (n°132)', () => {
    const template = { id: 't', name: 'Brune', class: 'veilleur_des_falaises', sprite: 'x', levelOffset: 0 };
    const errant = allyUnit(data, R, template, 5, 'errant', 'brune', 'g0', 30);
    const records: Record<string, { level: number; xp: number }> = {};
    applyErrantProgress(records, [errant, allyUnit(data, R, template, 5, 'garde', null, 'g1')]);
    expect(records).toEqual({ brune: { level: 5, xp: 30 } });
  });
});
