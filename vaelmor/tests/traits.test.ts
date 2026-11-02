/**
 * Jalon M6 : passives des niveaux 5 et 15 (n°93) et mécaniques de classe (n°123 à n°127).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { forecast, resolveExchange } from '../src/logic/combat/combat';
import { equippedPassive, learnedPassives, oathKept, PASSIVE_IDS, seasonOf } from '../src/logic/progression/traits';
import { attackUnit, endPhase, healAction, itemAction, readyUnits, skillAction, waitUnit } from '../src/logic/tactics/battle';
import { inWeaponRange, mobility, reachable } from '../src/logic/tactics/grid';
import { skillArea, skillBlocker, skillDef, skillForecast } from '../src/logic/tactics/skills';
import { applyStatus } from '../src/logic/tactics/status';
import type { BattleState, BattleUnit } from '../src/logic/tactics/types';
import { statsAtLevel } from '../src/logic/units/stats';
import { makeBattle, plainUnit, plains, rules, unit } from './helpers/battle';

const R = rules();
const data = loadGameData();
const withPassive = (u: BattleUnit, passive: string | null): BattleUnit => Object.assign(u, { passive });
const cls = (id: string) => data.classes.find((c) => c.id === id)!;
/** Laisse passer la phase ennemie (et la phase alliée) : retour à la phase du joueur, tour suivant. */
function nextPlayerPhase(s: BattleState): void {
  endPhase(s, R);
  while (s.phase !== 'player') {
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
  }
}

describe('passives (n°93)', () => {
  it('chaque passive des données a son effet codé, et inversement', () => {
    const ids = data.classes.flatMap((c) => c.passives.map((p) => p.id)).sort();
    expect(ids).toEqual([...PASSIVE_IDS].sort());
  });

  it('apprises aux niveaux 5 et 15 ; équipée : le choix du joueur, sinon la dernière apprise', () => {
    const g = cls('gardien_des_marees');
    expect(learnedPassives(g, 4)).toEqual([]);
    expect(equippedPassive(g, 5, null)).toBe('garde_rapprochee');
    expect(equippedPassive(g, 15, null)).toBe('inebranlable');
    expect(equippedPassive(g, 15, 'garde_rapprochee')).toBe('garde_rapprochee');
    expect(equippedPassive(g, 9, 'inebranlable')).toBe('garde_rapprochee');
    const s = makeBattle(plains(3, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 4 }, { class: 'gardien_des_marees', at: [1, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    expect(unit(s, 'p0').passive).toBeNull();
    expect(unit(s, 'p1').passive).toBe('garde_rapprochee');
  });

  it('Garde rapprochée : +2 Déf avec un allié adjacent ; Inébranlable : +5 PV, immunisé contre Entravé', () => {
    const s = makeBattle(plains(5, 2), [{ class: 'gardien_des_marees', at: [1, 0], level: 5 }, { class: 'lame_du_serment', at: [4, 1] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0], level: 8 }]);
    const g = unit(s, 'p0');
    const foe = unit(s, 'e0');
    const alone = forecast(s, foe, g, R).attacker.odds.damage;
    unit(s, 'p1').x = 0;
    unit(s, 'p1').y = 0;
    expect(forecast(s, foe, g, R).attacker.odds.damage).toBe(Math.max(0, alone - 2));
    const high = makeBattle(plains(3, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    const steady = unit(high, 'p0');
    expect(steady.passive).toBe('inebranlable');
    const gc = cls('gardien_des_marees');
    expect(steady.stats.pv).toBe(statsAtLevel(gc.baseStats, gc.growths, 15).pv + 5);
    expect(applyStatus(high, steady, 'entrave', 1, 'e0', R)).toBe(false);
  });

  it('Fil tranchant +10 critique ; Lame d’honneur +3 dégâts contre plus fort ; Œil de faucon et Instinct de chasse +10 précision', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 9 }, { enemy: 'brakk', at: [2, 0], level: 5, boss: true }]);
    const lame = plainUnit(unit(s, 'p0'));
    const foe = unit(s, 'e0');
    const base = forecast(s, lame, foe, R).attacker.odds;
    withPassive(lame, 'fil_tranchant');
    expect(forecast(s, lame, foe, R).attacker.odds.crit).toBe(Math.min(100, base.crit + 10));
    withPassive(lame, 'lame_d_honneur');
    expect(forecast(s, lame, foe, R).attacker.odds.damage).toBe(base.damage + 3);
    withPassive(lame, 'oeil_de_faucon');
    expect(forecast(s, lame, foe, R).attacker.odds.hit).toBe(Math.min(100, base.hit + 10));
    const boss = unit(s, 'e1');
    const vsBoss = forecast(s, plainUnit(lame), boss, R, { x: 1, y: 0 }).attacker.odds.hit;
    withPassive(lame, 'instinct_de_chasse');
    expect(forecast(s, lame, boss, R, { x: 1, y: 0 }).attacker.odds.hit).toBe(Math.min(100, vsBoss + 10));
  });

  it('Tir couvert : +1 portée depuis une forêt', () => {
    const s = makeBattle(['f....'], [{ class: 'veilleur_des_falaises', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    const v = unit(s, 'p0');
    expect(v.passive).toBe('tir_couvert');
    expect(inWeaponRange(v, v, unit(s, 'e0'), s.map)).toBe(true);
    expect(inWeaponRange(v, v, unit(s, 'e0'))).toBe(false);
    v.x = 1;
    unit(s, 'e0').x = 4;
    expect(inWeaponRange(v, v, unit(s, 'e0'), s.map)).toBe(false); // depuis la plaine : portée normale
  });

  it('Cendre ardente : +2 dégâts magiques sous 50 % PV ; Braises vives : la Brûlure dure un tour de plus', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'heritier_des_cendres', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 3 }, { enemy: 'ecumeur_sabreur', at: [2, 0], level: 3 }]);
    const mage = withPassive(unit(s, 'p0'), 'cendre_ardente');
    const full = forecast(s, mage, unit(s, 'e0'), R).attacker.odds.damage;
    mage.hp = Math.floor(mage.stats.pv / 2) - 1;
    expect(forecast(s, mage, unit(s, 'e0'), R).attacker.odds.damage).toBe(full + 2);
    withPassive(mage, 'braises_vives');
    applyStatus(s, unit(s, 'e0'), 'brulure', 2, 'p0', R);
    withPassive(mage, null);
    applyStatus(s, unit(s, 'e1'), 'brulure', 2, 'p0', R);
    expect(unit(s, 'e0').mods[0]!.until).toBe(unit(s, 'e1').mods[0]!.until + 1);
  });

  it('Lumière douce : soins +3 ; Veille : 3 PV aux alliés adjacents au début de sa phase', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 5 }, { class: 'gardien_des_marees', at: [1, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
    const healer = withPassive(unit(s, 'p0'), null);
    const g = unit(s, 'p1');
    g.hp = 1;
    const plain = healAction(s, 'p0', 'p1', R).find((e) => e.type === 'heal');
    const s2 = makeBattle(plains(5, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 5 }, { class: 'gardien_des_marees', at: [1, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
    withPassive(unit(s2, 'p0'), 'lumiere_douce');
    unit(s2, 'p1').hp = 1;
    const soft = healAction(s2, 'p0', 'p1', R).find((e) => e.type === 'heal');
    expect(soft?.type === 'heal' && plain?.type === 'heal' && soft.amount - plain.amount).toBe(3);
    void healer;
    const s3 = makeBattle(plains(5, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 15 }, { class: 'gardien_des_marees', at: [1, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
    expect(unit(s3, 'p0').passive).toBe('veille');
    unit(s3, 'p1').hp = 5;
    for (const u of readyUnits(s3)) waitUnit(s3, u.id);
    endPhase(s3, R);
    for (const u of readyUnits(s3)) waitUnit(s3, u.id);
    const back = endPhase(s3, R);
    expect(back.some((e) => e.type === 'heal' && e.unitId === 'p1' && e.amount === 3)).toBe(true);
  });

  it('Étendard : +10 esquive aux alliés à 2 cases ; Hymne : Appel aux armes dure un tour de plus', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'gardien_des_marees', at: [1, 0] }, { class: 'heraut_des_bannieres', at: [5, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0], level: 1 }]);
    const g = unit(s, 'p0');
    const foe = unit(s, 'e0');
    const before = forecast(s, foe, g, R).attacker.odds.hit;
    withPassive(unit(s, 'p1'), 'etendard');
    expect(forecast(s, foe, g, R).attacker.odds.hit).toBe(before);
    unit(s, 'p1').x = 3;
    // Le Héraut est à 2 cases du Gardien : l'ennemi a 10 points de moins pour toucher.
    expect(forecast(s, foe, g, R).attacker.odds.hit).toBe(Math.max(5, before - 10));
    const herald = withPassive(unit(s, 'p1'), 'hymne');
    applyStatus(s, g, 'appel_aux_armes', 2, herald.id, R);
    withPassive(herald, null);
    applyStatus(s, unit(s, 'p1'), 'appel_aux_armes', 2, herald.id, R);
    expect(g.mods.find((m) => m.status === 'appel_aux_armes')!.until).toBe(unit(s, 'p1').mods.find((m) => m.status === 'appel_aux_armes')!.until + 1);
  });

  it('Mains sûres : objets +5 PV ; Distillation : statuts infligés aux ennemis +1 tour', () => {
    const run = (passive: string | null): number => {
      const s = makeBattle(plains(4, 1), [{ class: 'alchimiste_des_saisons', at: [0, 0], level: 5 }, { class: 'gardien_des_marees', at: [1, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }], {
        loadouts: [{ weapon: null, accessory: null, items: [{ item: 'potion', qty: 1 }] }, { weapon: null, accessory: null, items: [] }],
      });
      withPassive(unit(s, 'p0'), passive);
      unit(s, 'p1').hp = 1;
      itemAction(s, 'p0', 'potion', 'p1', R);
      return unit(s, 'p1').hp;
    };
    expect(run('mains_sures')).toBe(run(null) + 5);
    const s = makeBattle(plains(4, 1), [{ class: 'alchimiste_des_saisons', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }, { enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    applyStatus(s, unit(s, 'e0'), 'gel', 1, 'p0', R);
    withPassive(unit(s, 'p0'), null);
    applyStatus(s, unit(s, 'e1'), 'gel', 1, 'p0', R);
    expect(unit(s, 'e0').mods[0]!.until).toBe(unit(s, 'e1').mods[0]!.until + 1);
  });

  it('Pas léger : +15 esquive dans le marais ; Contre-courant : +10 Résonance après une esquive', () => {
    const s = makeBattle([',.'], [{ class: 'danseur_des_courants', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }]);
    const d = withPassive(unit(s, 'p0'), null);
    const foe = unit(s, 'e0');
    const before = forecast(s, foe, d, R).attacker.odds.hit;
    withPassive(d, 'pas_leger');
    expect(forecast(s, foe, d, R).attacker.odds.hit).toBe(Math.max(5, before - 15));
    withPassive(d, 'contre_courant');
    // Le Danseur esquive à coup sûr : la Résonance monte de 10 par coup esquivé.
    d.base.vit = d.stats.vit = 200;
    d.resonance = 0;
    const strikes = resolveExchange(s, foe, d, R);
    const dodged = strikes.filter((x) => x.targetId === d.id && !x.hit).length;
    const struck = strikes.filter((x) => x.attackerId === d.id).length;
    expect(d.resonance).toBe(Math.min(100, dodged * 10 + struck * 20));
  });

  it('Pierre de plus et Charge de plus : +1 ressource ; Golem ancien : +5 PV et +2 Fo', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'invocateur_de_pierres_anciennes', at: [0, 0], level: 5 }, { class: 'ingenieur_des_ruines', at: [4, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }]);
    expect(unit(s, 'p0').resources['pierres']).toBe(4);
    expect(unit(s, 'p1').resources['charges']).toBe(5);
    const golemOf = (passive: string | null): BattleUnit => {
      const t = makeBattle(plains(5, 1), [{ class: 'invocateur_de_pierres_anciennes', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
      withPassive(unit(t, 'p0'), passive);
      skillAction(t, 'p0', 'eveil_de_pierre', { x: 1, y: 0 }, R);
      return t.units.find((u) => u.ownerId === 'p0')!;
    };
    const plain = golemOf(null);
    const ancient = golemOf('golem_ancien');
    expect(ancient.stats.pv).toBe(plain.stats.pv + 5);
    expect(ancient.stats.fo).toBe(plain.stats.fo + 2);
    expect(ancient.hp).toBe(ancient.stats.pv);
  });

  it('Racines profondes : une case et un tour de plus ; Épines : 3 dégâts aux ennemis collés aux ronces', () => {
    const wall = (passive: string | null): BattleState => {
      const s = makeBattle(plains(7, 7), [{ class: 'faconneur_de_racines', at: [3, 6], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [3, 1], level: 1 }]);
      const f = withPassive(unit(s, 'p0'), passive);
      f.resonance = 100;
      skillAction(s, 'p0', 'mur_de_ronces', { x: 3, y: 4 }, R);
      return s;
    };
    const plain = wall(null);
    const deep = wall('racines_profondes');
    expect(deep.overlays.length).toBe(plain.overlays.length + 1);
    expect(deep.overlays[0]!.until).toBe(plain.overlays[0]!.until + 1);
    expect(skillArea(deep, { x: 3, y: 6, passive: 'racines_profondes' }, skillDef(R, 'mur_de_ronces'), { x: 3, y: 4 }).length).toBe(skillArea(deep, { x: 3, y: 6 }, skillDef(R, 'mur_de_ronces'), { x: 3, y: 4 }).length + 1);
    const thorny = wall('epines');
    const foe = unit(thorny, 'e0');
    foe.x = 3;
    foe.y = 3; // collé aux ronces (3,4)
    foe.hp = 20;
    nextPlayerPhase(thorny);
    expect(foe.hp).toBeLessThanOrEqual(17);
  });

  it('Mécanique précise : attaques normales ×1,2 contre une armure lourde, pas les compétences ; Prise ferme : Harponné +1 tour', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'ingenieur_des_ruines', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_lancier', at: [2, 0], level: 1 }]);
    const eng = withPassive(unit(s, 'p0'), null);
    const foe = unit(s, 'e0');
    const plain = forecast(s, eng, foe, R).attacker.odds.damage;
    withPassive(eng, 'mecanique_precise');
    expect(forecast(s, eng, foe, R).attacker.odds.damage).toBe(Math.floor(plain * 1.2));
    const skillPlain = skillForecast(s, withPassive(eng, null), skillDef(R, 'perce_armure'), foe, R)!.attacker.odds.damage;
    expect(skillForecast(s, withPassive(eng, 'mecanique_precise'), skillDef(R, 'perce_armure'), foe, R)!.attacker.odds.damage).toBe(skillPlain);
    const h = makeBattle(plains(4, 1), [{ class: 'chasseur_de_serpents_de_mer', at: [0, 0], level: 15 }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }, { enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    applyStatus(h, unit(h, 'e0'), 'harponne', 2, 'p0', R);
    withPassive(unit(h, 'p0'), null);
    applyStatus(h, unit(h, 'e1'), 'harponne', 2, 'p0', R);
    expect(unit(h, 'e0').mods[0]!.until).toBe(unit(h, 'e1').mods[0]!.until + 1);
  });
});

describe('mécaniques de classe (n°123 à n°127)', () => {
  it('Serment : +10 % de dégâts tant qu’il tient ; Estocade jurée ×1,5 tenu, ×1,2 brisé', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 1 }]);
    const lame = withPassive(unit(s, 'p0'), null);
    const foe = unit(s, 'e0');
    expect(lame.oath).toEqual({ kind: 'proteger', broken: false, kills: 0 });
    const sworn = forecast(s, lame, foe, R).attacker.odds.damage;
    lame.oath!.broken = true;
    const broken = forecast(s, lame, foe, R).attacker.odds.damage;
    expect(sworn).toBe(Math.floor(broken * 1.1));
    const estBroken = skillForecast(s, lame, skillDef(R, 'estocade_juree'), foe, R)!.attacker.odds.damage;
    lame.oath!.broken = false;
    const estKept = skillForecast(s, lame, skillDef(R, 'estocade_juree'), foe, R)!.attacker.odds.damage;
    const raw = forecast(s, Object.assign(Object.create(Object.getPrototypeOf(lame)), lame, { oath: null }), foe, R).attacker.odds.damage;
    expect(estBroken).toBe(Math.floor(raw * 1.2));
    expect(estKept).toBe(Math.floor(Math.floor(raw * 1.5) * 1.1));
  });

  it('Serment « Protéger » brisé quand un membre tombe ; « Intouchable » quand la Lame est touchée ; « Abattre » compte les ennemis', () => {
    // « Protéger » : un ennemi abat la Porte-Lanterne pendant sa phase.
    const t = makeBattle(plains(5, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }, { class: 'porte_lanterne', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0], level: 9 }]);
    const tl = unit(t, 'p0');
    const victim = unit(t, 'p1');
    victim.hp = 1;
    victim.base.vit = victim.stats.vit = 0;
    victim.base.chc = victim.stats.chc = 0;
    victim.base.def = victim.stats.def = 0;
    for (const u of readyUnits(t)) waitUnit(t, u.id);
    endPhase(t, R);
    const foe = unit(t, 'e0');
    foe.base.dex = foe.stats.dex = 99;
    const out = attackUnit(t, 'e0', 'p1', R);
    expect(victim.hp).toBe(0);
    expect(out.some((e) => e.type === 'oath' && e.unitId === tl.id)).toBe(true);
    expect(tl.oath?.broken).toBe(true);

    const u = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 9 }, { enemy: 'ecumeur_sabreur', at: [3, 0], level: 1 }]);
    const ul = Object.assign(unit(u, 'p0'), { oath: { kind: 'intouchable', broken: false, kills: 0 } });
    ul.base.vit = ul.stats.vit = 0;
    ul.base.chc = ul.stats.chc = 0;
    for (const x of readyUnits(u)) waitUnit(u, x.id);
    endPhase(u, R);
    unit(u, 'e0').base.dex = unit(u, 'e0').stats.dex = 99;
    attackUnit(u, 'e0', 'p0', R);
    expect(ul.oath.broken).toBe(true);

    const v = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0], level: 9 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 1 }]);
    const vl = Object.assign(unit(v, 'p0'), { oath: { kind: 'abattre', broken: false, kills: 0 } });
    vl.base.dex = vl.stats.dex = 99;
    unit(v, 'e0').hp = 1;
    attackUnit(v, 'p0', 'e0', R);
    expect(vl.oath.kills).toBe(1);
    expect(v.outcome).toBe('victory');
    expect(oathKept(v, vl, R)).toBe(false); // il en fallait 3
    vl.oath.kills = 3;
    expect(oathKept(v, vl, R)).toBe(true);
  });

  it('Hauteur : le Veilleur gagne +10 précision depuis une forêt', () => {
    const s = makeBattle(['f.....'], [{ class: 'veilleur_des_falaises', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0], level: 8 }]);
    const v = unit(s, 'p0');
    const foe = unit(s, 'e0');
    const high = forecast(s, v, foe, R).attacker.odds.hit;
    const low = forecast(s, v, foe, R, { x: 4, y: 0 }).attacker.odds.hit;
    expect(high).toBe(Math.min(100, low + 10));
  });

  it('Saisons : hiver, printemps, été, automne ; Fiole du Gel à 40 en hiver, +1 Mob en automne, +20 % de dégâts en été', () => {
    expect([1, 2, 3, 4, 5].map(seasonOf)).toEqual(['hiver', 'printemps', 'ete', 'automne', 'hiver']);
    const s = makeBattle(plains(4, 1), [{ class: 'alchimiste_des_saisons', at: [0, 0], level: 3 }], [{ enemy: 'ecumeur_sabreur', at: [3, 0], level: 1 }]);
    const a = unit(s, 'p0');
    a.resonance = 45;
    expect(skillBlocker(s, a, skillDef(R, 'fiole_du_gel'))).toBeNull();
    nextPlayerPhase(s); // tour 2 : printemps
    a.resonance = 45;
    expect(skillBlocker(s, a, skillDef(R, 'fiole_du_gel'))).toMatch(/45\/50/);
    const spring = forecast(s, a, unit(s, 'e0'), R, { x: 2, y: 0 }).attacker.odds.damage;
    nextPlayerPhase(s); // tour 3 : été
    const summer = forecast(s, a, unit(s, 'e0'), R, { x: 2, y: 0 }).attacker.odds.damage;
    expect(summer).toBe(Math.floor(spring * 1.2));
    const mob = mobility(a);
    nextPlayerPhase(s); // tour 4 : automne
    expect(mobility(a)).toBe(mob + 1);
  });

  it('Fil d’eau : le Danseur franchit la rivière et le marais sans s’enliser', () => {
    const s = makeBattle(['.~,..'], [{ class: 'danseur_des_courants', at: [0, 0] }, { class: 'lame_du_serment', at: [4, 0] }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
    // Ennemi hors du chemin.
    unit(s, 'e0').x = 4;
    unit(s, 'p1').x = 3;
    const d = unit(s, 'p0');
    const reach = reachable(s, d);
    expect(reach.cost.get(1)).toBe(2); // rivière : coût profond
    expect(reach.cost.get(2)).toBe(3); // marais : coût léger
    const lame = unit(s, 'p1');
    lame.x = 0;
    d.x = 3;
    expect(reachable(s, lame).cost.has(1)).toBe(false);
  });

  it('Fanfare : +5 Résonance par coup porté pour un allié à 2 cases d’un Héraut', () => {
    const s = makeBattle(plains(6, 1), [{ class: 'gardien_des_marees', at: [1, 0] }, { class: 'heraut_des_bannieres', at: [5, 0] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0], level: 9 }]);
    const g = unit(s, 'p0');
    g.resonance = 0;
    const far = resolveExchange(s, g, unit(s, 'e0'), R).filter((x) => x.attackerId === g.id).length;
    const farRes = g.resonance;
    expect(farRes % 5 === 0 && farRes >= far * 20).toBe(true);
    unit(s, 'p1').x = 0;
    g.resonance = 0;
    const strikes = resolveExchange(s, g, unit(s, 'e0'), R);
    const dealt = strikes.filter((x) => x.attackerId === g.id).length;
    const taken = strikes.filter((x) => x.targetId === g.id && x.hit).length;
    expect(g.resonance).toBe(Math.min(100, dealt * 25 + taken * 10));
  });
});
