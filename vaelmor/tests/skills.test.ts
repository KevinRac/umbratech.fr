/**
 * Jalon M5 : jauge de Résonance, compétences signature des 12 classes, statuts,
 * objets en combat et soin au bâton.
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { forecast, resolveExchange } from '../src/logic/combat/combat';
import { BattleError, attackUnit, endPhase, healAction, itemAction, moveUnit, readyUnits, skillAction, waitUnit, evaluateOutcome } from '../src/logic/tactics/battle';
import { cellIndex, mobility, reachable, terrainAt } from '../src/logic/tactics/grid';
import { itemTargets, staffHealAmount } from '../src/logic/tactics/items';
import { skillArea, skillBlocker, skillDef, skillForecast, skillTargets } from '../src/logic/tactics/skills';
import { applyStatus, hasStatus } from '../src/logic/tactics/status';
import type { BattleEvent, BattleState } from '../src/logic/tactics/types';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const R = rules();
const data = loadGameData();
const skillOf = (classId: string): string => data.skills.find((s) => s.owner === classId)?.id as string;

/** Termine la phase du joueur, laisse les ennemis attendre, revient au joueur. */
function skipEnemyPhase(s: BattleState): BattleEvent[] {
  const events = endPhase(s, R);
  for (const u of readyUnits(s)) waitUnit(s, u.id);
  return [...events, ...endPhase(s, R)];
}

describe('Résonance (GDD §9.9)', () => {
  it('+20 par coup porté, +10 par coup reçu, plafonnée à 100', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'gardien_des_marees', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }], { seed: 'r' });
    const a = unit(s, 'p0');
    const e = unit(s, 'e0');
    const strikes = resolveExchange(s, a, e, R);
    const dealt = strikes.filter((x) => x.attackerId === a.id).length;
    const taken = strikes.filter((x) => x.attackerId === e.id && x.hit).length;
    expect(a.resonance).toBe(Math.min(100, dealt * 20 + taken * 10));
    a.resonance = 95;
    resolveExchange(s, a, e, R);
    expect(a.resonance).toBe(100);
  });

  it('une compétence trop chère est refusée ; lancée, elle coûte sa Résonance et termine le tour', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 5 }]);
    const lame = unit(s, 'p0');
    const estocade = skillDef(R, 'estocade_juree');
    expect(skillBlocker(s, lame, estocade)).toMatch(/Résonance 0\/60/);
    expect(() => skillAction(s, 'p0', 'estocade_juree', { x: 1, y: 0 }, R)).toThrow(BattleError);
    lame.resonance = 70;
    skillAction(s, 'p0', 'estocade_juree', { x: 1, y: 0 }, R);
    // 70 − 60 + 20 par coup porté (la frappe est une attaque) ± 10 si touché en riposte.
    expect(lame.resonance).toBeGreaterThanOrEqual(30);
    expect(lame.resonance).toBeLessThanOrEqual(50);
    expect(lame.acted).toBe(true);
  });
});

describe('les 12 compétences signature', () => {
  it('chaque classe a exactement une compétence signature, qu’elle peut lancer dans une situation simple', () => {
    for (const cls of data.classes) {
      const s = makeBattle(plains(7, 5), [{ class: cls.id, at: [2, 2], level: 3 }, { class: 'gardien_des_marees', at: [3, 2], level: 3 }], [{ enemy: 'ecumeur_lancier', at: [4, 2], level: 3 }]);
      const u = unit(s, 'p0');
      expect(u.skills).toEqual([skillOf(cls.id)]);
      u.resonance = 100;
      unit(s, 'p1').hp -= 5; // un blessé pour les soins
      const skill = skillDef(R, u.skills[0] as string);
      // Une frappe à distance doit être à bonne portée : on cherche une case d'où lancer.
      let targets = skillTargets(s, u, skill);
      if (targets.length === 0) {
        for (const stop of reachable(s, u).stops) {
          if (skillTargets(s, u, skill, stop).length === 0) continue;
          moveUnit(s, u.id, stop);
          targets = skillTargets(s, u, skill);
          break;
        }
      }
      expect(targets.length, `${cls.id} : aucune cible`).toBeGreaterThan(0);
      const events = skillAction(s, u.id, skill.id, targets[0] as { x: number; y: number }, R);
      expect(events[0]).toMatchObject({ type: 'skill', unitId: u.id, skillId: skill.id });
    }
  });

  it('Estocade jurée : touche garantie, dégâts ×1,5', () => {
    const s = makeBattle(plains(3, 1), [{ class: 'lame_du_serment', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }]);
    const lame = unit(s, 'p0');
    const enemy = unit(s, 'e0');
    const plain = forecast(s, lame, enemy, R).attacker.odds;
    const f = skillForecast(s, lame, skillDef(R, 'estocade_juree'), enemy, R)?.attacker.odds;
    expect(f?.hit).toBe(100);
    expect(f?.damage).toBe(Math.floor(plain.damage * 1.5));
  });

  it('Tir de Vent : portée 3 et 3 points de Défense ignorés', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'veilleur_des_falaises', at: [0, 0] }], [{ enemy: 'ecumeur_lancier', at: [3, 0] }]);
    const archer = unit(s, 'p0');
    const enemy = unit(s, 'e0');
    expect(skillTargets(s, archer, skillDef(R, 'tir_de_vent'))).toEqual([{ x: 3, y: 0 }]);
    const base = archer.stats.fo + archer.weapon.power - enemy.stats.def;
    expect(skillForecast(s, archer, skillDef(R, 'tir_de_vent'), enemy, R)?.attacker.odds.damage).toBe(base + 3);
  });

  it('Nuée de braises : zone 3×3, alliés compris, Brûlure de 3 par tour pendant 2 tours', () => {
    const s = makeBattle(plains(7, 5), [{ class: 'heritier_des_cendres', at: [0, 2], level: 5 }, { class: 'gardien_des_marees', at: [3, 1] }], [{ enemy: 'ecumeur_sabreur', at: [3, 2], level: 5 }, { enemy: 'ecumeur_sabreur', at: [4, 3], level: 5 }]);
    const mage = unit(s, 'p0');
    mage.resonance = 60;
    expect(skillArea(s, mage, skillDef(R, 'nuee_de_braises'), { x: 3, y: 2 })).toHaveLength(9);
    // Portée [1, 3] : (3,2) est à 3 cases.
    const events = skillAction(s, 'p0', 'nuee_de_braises', { x: 3, y: 2 }, R);
    const effects = events.find((e) => e.type === 'effects');
    expect(effects?.type === 'effects' && effects.results.map((r) => r.unitId).sort()).toEqual(['e0', 'e1', 'p1']);
    const e0 = unit(s, 'e0');
    expect(hasStatus(e0, 'brulure')).toBe(true);
    // Phase ennemie du tour 1 : la brûlure mord.
    const hp = e0.hp;
    const enemyPhase = endPhase(s, R);
    expect(enemyPhase.some((e) => e.type === 'dot' && e.unitId === 'e0' && e.damage === 3)).toBe(true);
    expect(e0.hp).toBe(hp - 3);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R); // tour 2, joueur
    endPhase(s, R); // tour 2, ennemis : deuxième morsure
    expect(e0.hp).toBe(hp - 6);
    for (const u of readyUnits(s)) waitUnit(s, u.id);
    endPhase(s, R);
    const third = endPhase(s, R); // tour 3 : expirée
    expect(third.some((e) => e.type === 'expire' && e.unitId === 'e0' && e.status === 'brulure')).toBe(true);
    expect(e0.hp).toBe(hp - 6);
  });

  it('Halo : la moitié des PV et la purge', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'porte_lanterne', at: [0, 0] }, { class: 'gardien_des_marees', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }]);
    const tank = unit(s, 'p1');
    tank.hp = 2;
    applyStatus(s, tank, 'brulure', 2, 'e0', R);
    unit(s, 'p0').resonance = 40;
    skillAction(s, 'p0', 'halo', { x: 2, y: 0 }, R);
    expect(tank.hp).toBe(2 + Math.floor(tank.stats.pv * 0.5));
    expect(hasStatus(tank, 'brulure')).toBe(false);
  });

  it('Appel aux armes : +3 Fo, +3 Mag, +2 Vit aux alliés à 3 cases, pendant 2 tours', () => {
    const s = makeBattle(plains(9, 1), [{ class: 'heraut_des_bannieres', at: [0, 0] }, { class: 'gardien_des_marees', at: [3, 0] }, { class: 'lame_du_serment', at: [4, 0] }], [{ enemy: 'ecumeur_sabreur', at: [8, 0] }]);
    const near = unit(s, 'p1');
    const far = unit(s, 'p2');
    const before = { fo: near.stats.fo, vit: near.stats.vit, farFo: far.stats.fo };
    unit(s, 'p0').resonance = 40;
    skillAction(s, 'p0', 'appel_aux_armes', { x: 0, y: 0 }, R);
    expect(near.stats.fo).toBe(before.fo + 3);
    expect(near.stats.vit).toBe(before.vit + 2);
    expect(far.stats.fo).toBe(before.farFo);
    skipEnemyPhase(s); // tour 2 : toujours actif
    expect(near.stats.fo).toBe(before.fo + 3);
    skipEnemyPhase(s); // tour 3 : expiré
    expect(near.stats.fo).toBe(before.fo);
  });

  it('Fiole du Gel : l’ennemi perd sa prochaine action ; un boss n’y est pas sensible', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'alchimiste_des_saisons', at: [0, 0] }], [{ enemy: 'ecumeur_sabreur', at: [2, 0] }, { enemy: 'brakk', at: [4, 0], boss: true }]);
    const alch = unit(s, 'p0');
    alch.resonance = 100;
    const vit = unit(s, 'e0').stats.vit;
    skillAction(s, 'p0', 'fiole_du_gel', { x: 2, y: 0 }, R);
    expect(unit(s, 'e0').stats.vit).toBe(Math.max(0, vit - 3));
    const events = endPhase(s, R);
    expect(events.some((e) => e.type === 'stunned' && e.unitId === 'e0')).toBe(true);
    expect(readyUnits(s).map((u) => u.id)).toEqual(['e1']);
    // Le boss : immunisé.
    const s2 = makeBattle(plains(5, 1), [{ class: 'alchimiste_des_saisons', at: [0, 0] }], [{ enemy: 'brakk', at: [2, 0], boss: true }], { objective: 'boss' });
    unit(s2, 'p0').resonance = 100;
    const ev = skillAction(s2, 'p0', 'fiole_du_gel', { x: 2, y: 0 }, R);
    const res = ev.find((e) => e.type === 'effects');
    expect(res?.type === 'effects' && res.results[0]?.immune).toBe('gel');
    expect(unit(s2, 'e0').mods).toEqual([]);
  });

  it('Pas de marée : frappe sans riposte, puis 3 cases de déplacement et fin du tour', () => {
    const s = makeBattle(plains(8, 1), [{ class: 'danseur_des_courants', at: [0, 0], level: 5 }], [{ enemy: 'ecumeur_sabreur', at: [1, 0], level: 5 }]);
    const dancer = unit(s, 'p0');
    dancer.resonance = 30;
    const events = skillAction(s, 'p0', 'pas_de_maree', { x: 1, y: 0 }, R);
    const combat = events.find((e) => e.type === 'combat');
    expect(combat?.type === 'combat' && combat.strikes.every((x) => !x.counter)).toBe(true);
    expect(events.some((e) => e.type === 'canto' && e.range === 3)).toBe(true);
    expect(dancer.acted).toBe(false);
    expect(mobility(dancer)).toBe(3);
    // Plus d'action possible, seulement le déplacement.
    expect(() => attackUnit(s, 'p0', 'e0', R)).toThrow(BattleError);
    if (unit(s, 'e0').hp > 0) {
      // L'ennemi bloque l'est : la danseuse ne peut pas aller plus loin que sa case.
      expect(reachable(s, dancer).stops).toEqual([{ x: 0, y: 0 }]);
    }
    moveUnit(s, 'p0', { x: 0, y: 0 });
    expect(dancer.acted).toBe(true);
  });

  it('Éveil de pierre : une Pierre, un golem de la compagnie pour 3 tours, qui ne compte pas dans la défaite', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'invocateur_de_pierres_anciennes', at: [0, 1] }], [{ enemy: 'ecumeur_sabreur', at: [5, 1] }]);
    const inv = unit(s, 'p0');
    expect(inv.resources['pierres']).toBe(3);
    const events = skillAction(s, 'p0', 'eveil_de_pierre', { x: 1, y: 1 }, R);
    expect(inv.resources['pierres']).toBe(2);
    const summon = events.find((e) => e.type === 'summon');
    expect(summon).toBeTruthy();
    const golem = s.units.find((u) => u.kindId === 'golem_de_pierre');
    expect(golem).toMatchObject({ team: 'player', x: 1, y: 1, hp: 20 });
    expect(golem?.stats.def).toBe(8);
    // L'invocateur tombe : défaite, même si le golem tient.
    inv.hp = 0;
    expect(evaluateOutcome(s)).toBe('defeat');
    inv.hp = 5;
    for (let i = 0; i < 2; i++) skipEnemyPhase(s);
    expect(golem?.hp).toBeGreaterThan(0);
    const third = skipEnemyPhase(s);
    expect(third.some((e) => e.type === 'vanish' && e.unitId === golem?.id)).toBe(true);
    expect(golem?.hp).toBe(0);
  });

  it('Mur de ronces : 3 cases infranchissables pendant 3 tours', () => {
    const s = makeBattle(plains(6, 5), [{ class: 'faconneur_de_racines', at: [0, 2] }], [{ enemy: 'ecumeur_sabreur', at: [5, 2] }]);
    unit(s, 'p0').resonance = 40;
    const events = skillAction(s, 'p0', 'mur_de_ronces', { x: 2, y: 2 }, R);
    const wall = events.find((e) => e.type === 'terrain');
    expect(wall?.type === 'terrain' && wall.cells.map((c) => `${c.x},${c.y}`)).toEqual(['2,1', '2,2', '2,3']);
    expect(terrainAt(s.map, 2, 2).id).toBe('ronces');
    expect(reachable(s, unit(s, 'e0'), Infinity).cost.has(cellIndex(s.map, 2, 2))).toBe(false);
    for (let i = 0; i < 2; i++) skipEnemyPhase(s);
    expect(terrainAt(s.map, 2, 2).id).toBe('ronces');
    skipEnemyPhase(s);
    expect(terrainAt(s.map, 2, 2).id).toBe('plaine');
  });

  it('Perce-armure : une Charge, 6 Déf ignorées, ×1,5 contre l’armure lourde', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'ingenieur_des_ruines', at: [0, 0] }], [{ enemy: 'ecumeur_lancier', at: [2, 0], level: 5 }]);
    const eng = unit(s, 'p0');
    const lancier = unit(s, 'e0');
    const normal = forecast(s, eng, lancier, R).attacker.odds.damage;
    const pierce = skillForecast(s, eng, skillDef(R, 'perce_armure'), lancier, R)?.attacker.odds.damage ?? 0;
    expect(pierce).toBeGreaterThan(normal);
    expect(eng.resources['charges']).toBe(4);
    skillAction(s, 'p0', 'perce_armure', { x: 2, y: 0 }, R);
    expect(eng.resources['charges']).toBe(3);
  });

  it('Harpon enchaîné : la cible encaisse 25 % de plus et ne s’éloigne plus que de 2 cases', () => {
    const s = makeBattle(plains(8, 1), [{ class: 'chasseur_de_serpents_de_mer', at: [0, 0], level: 5 }, { class: 'lame_du_serment', at: [3, 0], level: 5 }], [{ enemy: 'harpie', at: [2, 0], level: 1 }], { seed: 'h2' });
    const hunter = unit(s, 'p0');
    const harpie = unit(s, 'e0');
    harpie.hp = 999;
    harpie.base = { ...harpie.base, pv: 999 };
    harpie.stats = { ...harpie.stats, pv: 999 };
    hunter.resonance = 60;
    const lame = unit(s, 'p1');
    const before = forecast(s, lame, harpie, R).attacker.odds.damage;
    // Touche garantie pour le test : on rejoue jusqu'à poser le harpon.
    for (let i = 0; i < 20 && !hasStatus(harpie, 'harponne'); i++) {
      hunter.acted = false;
      hunter.resonance = 60;
      skillAction(s, 'p0', 'harpon_enchaine', { x: 2, y: 0 }, R);
    }
    expect(hasStatus(harpie, 'harponne')).toBe(true);
    expect(forecast(s, lame, harpie, R).attacker.odds.damage).toBe(Math.floor(before * 1.25));
    expect(mobility(harpie)).toBe(2);
  });

  it('Rempart de Marée : −3 dégâts physiques pour le Gardien et ses voisins', () => {
    const s = makeBattle(plains(5, 2), [{ class: 'gardien_des_marees', at: [1, 0], level: 3 }, { class: 'lame_du_serment', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0], level: 6 }]);
    const lame = unit(s, 'p1');
    const enemy = unit(s, 'e0');
    const before = forecast(s, enemy, lame, R).attacker.odds.damage;
    unit(s, 'p0').resonance = 40;
    skillAction(s, 'p0', 'rempart_de_maree', { x: 1, y: 0 }, R);
    expect(forecast(s, enemy, lame, R).attacker.odds.damage).toBe(Math.max(0, before - 3));
  });
});

describe('objets en combat (GDD §9.8) et soin au bâton', () => {
  it('Potion : 10 PV, une action, l’objet est consommé et compté', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0] }, { class: 'gardien_des_marees', at: [1, 0] }], [{ enemy: 'ecumeur_sabreur', at: [3, 0] }], {
      loadouts: [{ weapon: null, accessory: null, items: [{ item: 'potion', qty: 2 }] }, { weapon: null, accessory: null, items: [] }],
    });
    const lame = unit(s, 'p0');
    const tank = unit(s, 'p1');
    tank.hp -= 15;
    expect(itemTargets(s, lame, 'potion', R).map((u) => u.id)).toEqual(['p1']); // la Lame est en pleine forme
    const events = itemAction(s, 'p0', 'potion', 'p1', R);
    expect(events[0]).toMatchObject({ type: 'item', item: 'potion', targetId: 'p1' });
    expect(tank.hp).toBe(tank.stats.pv - 5);
    expect(lame.items).toEqual([{ item: 'potion', qty: 1 }]);
    expect(lame.acted).toBe(true);
    expect(s.itemsUsed).toEqual({ potion: 1 });
  });

  it('Torche : 5 dégâts et Brûlure à un ennemi au contact ; Antidote : purge', () => {
    const s = makeBattle(plains(4, 1), [{ class: 'lame_du_serment', at: [0, 0] }, { class: 'gardien_des_marees', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [1, 0] }], {
      loadouts: [{ weapon: null, accessory: null, items: [{ item: 'torche', qty: 1 }] }, { weapon: null, accessory: null, items: [{ item: 'antidote', qty: 1 }] }],
    });
    const enemy = unit(s, 'e0');
    const hp = enemy.hp;
    itemAction(s, 'p0', 'torche', 'e0', R);
    expect(enemy.hp).toBe(hp - 5);
    expect(hasStatus(enemy, 'brulure')).toBe(true);
    const lame = unit(s, 'p0');
    applyStatus(s, lame, 'poison', 2, 'e0', R);
    // Le Gardien est à 2 cases de la Lame : hors de portée de l'antidote (contact).
    expect(itemTargets(s, unit(s, 'p1'), 'antidote', R).map((u) => u.id)).toEqual([]);
    unit(s, 'p1').x = 1;
    unit(s, 'p1').y = 0;
    enemy.hp = 0;
    expect(itemTargets(s, unit(s, 'p1'), 'antidote', R).map((u) => u.id)).toEqual(['p0']);
  });

  it('Soigner au bâton : Heals + Mag/2, à portée de l’arme, sur un allié blessé', () => {
    const s = makeBattle(plains(5, 1), [{ class: 'porte_lanterne', at: [0, 0], level: 3 }, { class: 'gardien_des_marees', at: [2, 0] }], [{ enemy: 'ecumeur_sabreur', at: [4, 0] }]);
    const priest = unit(s, 'p0');
    const tank = unit(s, 'p1');
    tank.hp = 3;
    expect(staffHealAmount(priest)).toBe(6 + Math.floor(priest.stats.mag / 2));
    healAction(s, 'p0', 'p1', R);
    expect(tank.hp).toBe(3 + staffHealAmount(priest));
    expect(priest.acted).toBe(true);
  });
});
