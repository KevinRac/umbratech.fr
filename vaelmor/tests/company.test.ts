/**
 * Jalon M6 : compagnie persistante (niveaux, XP et stats reportés après un combat).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { ensureCompany, joinBossRecruits, joinCompany, memberId, newProgress, recruitLevel, startingCompany, testCompany } from '../src/logic/game';
import { attackUnit } from '../src/logic/tactics/battle';
import { statsAtLevel } from '../src/logic/units/stats';
import { applyBattleProgress, applyErrantProgress, createMember, isWounded } from '../src/logic/units/company';
import { allyUnit, woundedStats } from '../src/logic/tactics/units';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const data = loadGameData();
const R = rules();

describe('compagnie persistante', () => {
  it('un membre tombé est blessé jusqu’au prochain repos et se bat diminué (n°138)', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    const company = [createMember(data, { id: 'heros', name: 'Allié 0', class: 'gardien_des_marees', level: 5, hero: true })];
    unit(s, 'p0').hp = 0;
    applyBattleProgress(company, s.units, 3);
    expect(company[0]!.woundedDay).toBe(3);
    expect(isWounded(company[0]!, 3)).toBe(true);
    expect(isWounded(company[0]!, 4)).toBe(false);
    const st = company[0]!.stats;
    const w = woundedStats(st);
    expect(w.mob).toBe(st.mob - 2);
    expect(w.pv).toBe(st.pv - Math.ceil(st.pv / 10));
    expect(w.def).toBe(st.def - Math.ceil(st.def / 10));
    expect(w.mag).toBe(st.mag === 0 ? 0 : st.mag - Math.ceil(st.mag / 10));
    const fresh = makeBattle(plains(4, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    expect(unit(fresh, 'p0').wounded).toBe(false);
  });

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

  it('nouvelle partie : le héros dans la classe choisie, Odran et Aurèle, tous au niveau 2 (n°133, n°134)', () => {
    const c = startingCompany(data, 'porte_lanterne');
    expect(c.map((m) => [m.id, m.class, m.level, m.hero])).toEqual([
      ['heros', 'porte_lanterne', 2, true],
      ['odran', 'gardien_des_marees', 2, false],
      ['aurele', 'heritier_des_cendres', 2, false],
    ]);
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    expect(p.company).toEqual([]);
    const made = ensureCompany(data, p);
    expect(made).toHaveLength(3);
    expect(ensureCompany(data, p)).toBe(made);
  });

  it('compagnie d’essai : une unité par classe, au niveau imposé (n°137)', () => {
    const c = testCompany(data, 6);
    expect(new Set(c.map((m) => m.class)).size).toBe(12);
    expect(c.every((m) => m.level === 6)).toBe(true);
    expect(c.filter((m) => m.hero)).toHaveLength(1);
  });

  it('une recrue arrive à son niveau fixé, ou à la moyenne de la compagnie − 2 (n°135)', () => {
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    p.company = startingCompany(data, 'lame_du_serment');
    expect(recruitLevel(data, p.company, 'nessa')).toBe(2);
    expect(recruitLevel(data, p.company, 'ilmea')).toBe(13);
    for (const m of p.company) m.level = 12;
    expect(recruitLevel(data, p.company, 'nessa')).toBe(10);
    const nessa = joinCompany(data, p, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' });
    expect(nessa).toMatchObject({ level: 10, xp: 0, class: 'danseur_des_courants' });
    expect(p.recruited).toContain('nessa');
    expect(joinCompany(data, p, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' })).toBeNull();
    expect(p.company).toHaveLength(4);
  });

  it('Rhyel rejoint d’office après la victoire contre le Gardien de Cendre (n°136)', () => {
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    p.company = startingCompany(data, 'lame_du_serment');
    expect(joinBossRecruits(data, p, ['boss_brakk'])).toEqual([]);
    const joined = joinBossRecruits(data, p, ['boss_gardien_cendre']);
    expect(joined.map((m) => [m.id, m.class, m.level])).toEqual([['rhyel', 'heritier_des_cendres', 15]]);
    expect(joinBossRecruits(data, p, ['boss_gardien_cendre'])).toEqual([]);
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
    applyBattleProgress(company, s.units, 1);
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
