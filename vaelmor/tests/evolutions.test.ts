/**
 * Jalon M6 : évolutions de classe (GDD §10.1, décisions n°140 à n°144).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { forecast } from '../src/logic/combat/combat';
import { newProgress, startingCompany, buy, buildTownIndex, type GameCtx } from '../src/logic/game';
import { applyBattleCounters, evolutionChoices, evolveMember, SEAL_ITEM } from '../src/logic/progression/evolutions';
import { attackUnit, skillAction } from '../src/logic/tactics/battle';
import { inWeaponRange, reachable } from '../src/logic/tactics/grid';
import { memberUnit, emptyLoadout } from '../src/logic/tactics/units';
import type { BattleUnit } from '../src/logic/tactics/types';
import { createMember, type Member } from '../src/logic/units/company';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const data = loadGameData();
const R = rules();
const evolved = (u: BattleUnit, evolution: string): BattleUnit => Object.assign(u, { evolution });
const world = () => {
  const progress = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
  return { data, progress, discovered: [] as string[] };
};

describe('évolution d’un membre (n°141)', () => {
  it('il faut le niveau 10, un Sceau et la condition de la branche', () => {
    const w = world();
    const lame: Member = createMember(data, { id: 'heros', name: 'Voyageur', class: 'lame_du_serment', level: 9, hero: true });
    expect(evolutionChoices(w, lame).blocker).toBe('Niveau 10 requis');
    lame.level = 10;
    expect(evolutionChoices(w, lame).blocker).toBe('Il faut un Sceau de Maîtrise');
    w.progress.inventory.push({ item: SEAL_ITEM, qty: 1 });
    const { choices, blocker } = evolutionChoices(w, lame);
    expect(blocker).toBeNull();
    expect(choices.map((c) => [c.evo.id, c.met, c.progress])).toEqual([
      ['champion_du_serment', false, '0/5'],
      ['executeur_lige', false, null],
    ]);
    expect(evolveMember(w, lame, 'champion_du_serment')).toMatch(/condition/);
    lame.counters['oathsKept'] = 5;
    const before = { ...lame.stats };
    expect(evolveMember(w, lame, 'champion_du_serment')).toBeNull();
    expect(lame).toMatchObject({ evolution: 'champion_du_serment', levelCap: 30, level: 10 });
    expect(lame.stats.fo).toBe(before.fo + 3);
    expect(w.progress.inventory.some((s) => s.item === SEAL_ITEM)).toBe(false);
    expect(evolutionChoices(w, lame).blocker).toBe('Déjà évolué');
  });

  it('une unité évoluée porte le nom de sa branche, garde sa lignée et a de meilleures croissances', () => {
    const m = createMember(data, { id: 'odran', name: 'Odran', class: 'gardien_des_marees', level: 12 });
    m.evolution = 'rempart_de_recif';
    m.levelCap = 30;
    const u = memberUnit(data, R, m, emptyLoadout(), 'p0', 0, 0, 0);
    const cls = data.classes.find((c) => c.id === 'gardien_des_marees')!;
    expect(u).toMatchObject({ kindName: 'Rempart de Récif', kindId: 'gardien_des_marees', lineage: 'gardien_des_marees', evolution: 'rempart_de_recif', levelCap: 30 });
    expect(u.growths?.def).toBe(cls.growths.def + 10);
    expect(u.skills).toEqual(['rempart_de_maree']);
  });

  it('conditions de quête, de réputation et de lieux visités', () => {
    const w = world();
    w.progress.inventory.push({ item: SEAL_ITEM, qty: 3 });
    const g = createMember(data, { id: 'odran', name: 'Odran', class: 'gardien_des_marees', level: 10 });
    expect(evolutionChoices(w, g).choices.find((c) => c.evo.id === 'rempart_de_recif')?.met).toBe(false);
    w.progress.quests['phare_eteint'] = 'done';
    expect(evolutionChoices(w, g).choices.find((c) => c.evo.id === 'rempart_de_recif')?.met).toBe(true);
    const h = createMember(data, { id: 'cendrine', name: 'Cendrine', class: 'heraut_des_bannieres', level: 10 });
    w.progress.reputation['couronne'] = 30;
    expect(evolutionChoices(w, h).choices.find((c) => c.evo.id === 'marechal_de_cendre')?.met).toBe(true);
    const i = createMember(data, { id: 'gerard', name: 'Gérard', class: 'invocateur_de_pierres_anciennes', level: 10 });
    w.discovered.push('menhir_aubemer', 'menhir_foret');
    expect(evolutionChoices(w, i).choices.find((c) => c.evo.id === 'chuchoteur_de_menhirs')).toMatchObject({ met: false, progress: '2/3' });
    w.discovered.push('menhir_cendre');
    expect(evolutionChoices(w, i).choices.find((c) => c.evo.id === 'chuchoteur_de_menhirs')?.met).toBe(true);
  });

  it('chaque boss donne un Sceau ; Maître Lorn en vend 2 pour toute la partie (n°140)', () => {
    for (const id of ['camp_des_ecumeurs', 'roi_cerf_corrompu', 'soeur_merrow', 'mere_harpie', 'gardien_de_cendre']) {
      expect(data.encounters.encounters.find((e) => e.id === id)?.rewards?.items?.some((i) => i.item === SEAL_ITEM), id).toBe(true);
    }
    const w = world();
    w.progress.gold = 100000;
    const ctx: GameCtx = { data, index: buildTownIndex(data), progress: w.progress, flags: [], discovered: [] };
    expect(buy(ctx, 'raretes_de_lorn', SEAL_ITEM).ok).toBe(true);
    expect(buy(ctx, 'raretes_de_lorn', SEAL_ITEM).ok).toBe(true);
    expect(buy(ctx, 'raretes_de_lorn', SEAL_ITEM)).toMatchObject({ ok: false, reason: 'stock' });
  });
});

describe('compteurs d’évolution', () => {
  it('fin de combat : serment tenu, boss vaincu, ennemis abattus par zone, doubles', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 9 }], [{ enemy: 'brakk', at: [1, 0], level: 1, boss: true }], { objective: 'boss' });
    const lame = unit(s, 'p0');
    lame.base.dex = lame.stats.dex = 99;
    unit(s, 'e0').hp = 1;
    attackUnit(s, 'p0', 'e0', R);
    expect(s.outcome).toBe('victory');
    const company = startingCompany(data, 'lame_du_serment');
    applyBattleCounters(company, s, R);
    expect(company[0]!.counters).toMatchObject({ oathsKept: 1, bossWins: 1, 'boss:brakk': 1, 'killsZone:z1': 1 });
  });
});

describe('traits des évolutions (n°142, n°144)', () => {
  it('Champion du Serment : pas de riposte d’un ennemi isolé ; Exécuteur Lige : +15 critique, +30 % sous 50 % PV', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 9 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 9 }]);
    const lame = Object.assign(unit(s, 'p0'), { oath: null, passive: null });
    const foe = unit(s, 'e0');
    expect(forecast(s, lame, foe, R).defender.canStrike).toBe(true);
    evolved(lame, 'champion_du_serment');
    expect(forecast(s, lame, foe, R).defender.canStrike).toBe(false);
    unit(s, 'e1').x = 2; // un autre ennemi au contact : plus un duel
    expect(forecast(s, lame, foe, R).defender.canStrike).toBe(true);
    evolved(lame, null as unknown as string);
    const plain = forecast(s, lame, foe, R).attacker.odds;
    evolved(lame, 'executeur_lige');
    expect(forecast(s, lame, foe, R).attacker.odds.crit).toBe(Math.min(100, plain.crit + 15));
    foe.hp = Math.floor(foe.stats.pv / 2) - 1;
    expect(forecast(s, lame, foe, R).attacker.odds.damage).toBe(Math.floor(plain.damage * 1.3));
  });

  it('Rempart de Récif riposte même hors de portée ; Sentinelle des Abysses repousse la cible', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_archer', at: [2, 0], level: 9 }]);
    const g = Object.assign(unit(s, 'p0'), { weapon: { ...unit(s, 'p0').weapon, range: [1, 1] as [number, number] } });
    const archer = unit(s, 'e0');
    expect(forecast(s, archer, g, R).defender.canStrike).toBe(false);
    evolved(g, 'rempart_de_recif');
    expect(forecast(s, archer, g, R).defender.canStrike).toBe(true);
    const t = makeBattle(plains(5, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 1 }]);
    const sentinel = evolved(unit(t, 'p0'), 'sentinelle_des_abysses');
    sentinel.base.dex = sentinel.stats.dex = 99;
    const foe = unit(t, 'e0');
    foe.base.pv = foe.stats.pv = foe.hp = 99;
    const events = attackUnit(t, 'p0', 'e0', R);
    expect(foe.x).toBe(2);
    expect(events.some((e) => e.type === 'move' && e.unitId === 'e0')).toBe(true);
  });

  it('Harponneur Abyssal attire la cible ; Traqueur de Léviathans ajoute 5 % de ses PV max', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'chasseur_de_serpents_de_mer', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0], level: 1 }]);
    const h = evolved(unit(s, 'p0'), 'harponneur_abyssal');
    h.resonance = 100;
    h.base.dex = h.stats.dex = 99;
    const foe = unit(s, 'e0');
    foe.base.pv = foe.stats.pv = foe.hp = 99;
    skillAction(s, 'p0', 'harpon_enchaine', { x: 2, y: 0 }, R);
    expect(foe.x).toBe(1);
    const t = makeBattle(plains(3, 1), [{ class: 'chasseur_de_serpents_de_mer', at: [0, 0], level: 10 }], [{ enemy: 'brakk', at: [1, 0], level: 10, boss: true }], { objective: 'boss' });
    const c = Object.assign(unit(t, 'p0'), { passive: null });
    const boss = unit(t, 'e0');
    const plain = forecast(t, c, boss, R).attacker.odds.damage;
    evolved(c, 'traqueur_de_leviathans');
    expect(forecast(t, c, boss, R).attacker.odds.damage).toBe(plain + Math.floor(boss.stats.pv * 0.05));
  });

  it('Faucon de Vent : portée +2 et deux coups sans bouger ; Fil-de-Vent : toute case à 1', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'veilleur_des_falaises', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0], level: 9 }]);
    const v = Object.assign(unit(s, 'p0'), { passive: null });
    expect(inWeaponRange(v, v, unit(s, 'e0'), s.map)).toBe(false);
    evolved(v, 'faucon_de_vent');
    expect(inWeaponRange(v, v, unit(s, 'e0'), s.map)).toBe(true);
    expect(forecast(s, v, unit(s, 'e0'), R).attacker.doubles).toBe(true);
    const t = makeBattle(['.mf~w.'], [{ class: 'danseur_des_courants', at: [0, 0], level: 10 }], [{ enemy: 'ecumeur_sabreur', at: [5, 0] }]);
    const d = evolved(unit(t, 'p0'), 'fil_de_vent');
    Object.assign(d, { waterThread: { shallow: 1, deep: 1, flat: true } });
    const reach = reachable(t, d, 4);
    expect([1, 2, 3, 4].map((i) => reach.cost.get(i))).toEqual([1, 2, 3, 4]);
  });
});
