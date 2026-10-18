/**
 * Résolution d'un échange de coups (GDD §9.7) : dégâts, précision, critique,
 * double attaque, riposte, triangle élémentaire, armes efficaces, Résonance.
 *
 * Formules (valeurs dans balance.json › combat) :
 * - dégâts physiques = Fo + Puissance ± triangle − Déf − défense du terrain ;
 *   dégâts magiques = Mag + Puissance ± triangle − Rés (minimum 0) ;
 *   arme efficace : × `effectiveMultiplier` ; critique : × `critMultiplier`.
 * - précision = Préc. arme + Dex×2 + Chc/2 ± triangle ; esquive = Vit×2 + Chc/2
 *   + esquive du terrain ; chance de toucher = précision − esquive, bornée
 *   (5 à 100 %) ; **un seul jet** : la chance affichée est la vraie.
 * - critique = Crit. arme + Dex/2 − Chc de la cible (0 à 100 %).
 * - double attaque si Vit ≥ Vit adverse + `doubleAttackSpeedGap`.
 * - le défenseur riposte si l'attaquant est à portée de son arme.
 * - ordre : attaque, riposte, seconde attaque, seconde riposte ; l'échange
 *   s'arrête dès qu'une unité tombe.
 *
 * Triangle (décision n°51) : il ne joue que si l'arme porte un élément (armes
 * magiques). Il compare l'élément de l'arme à l'élément de la cible (celui de
 * sa classe) : Marée > Cendre > Racine > Marée. Pierre et Lanterne sont neutres.
 *
 * Statuts (jalon M5) : Rempart retire des dégâts physiques, Harponné multiplie
 * les dégâts reçus, Voile de brume ajoute de l'esquive. Une compétence de
 * frappe modifie le coup (`StrikeMods`) : touche garantie, dégâts ×, Déf
 * ignorée, bonus contre une armure, pas de riposte.
 */
import { distance, terrainAt } from '../tactics/grid';
import { avoidBonusOf, damageTakenOf, guardOf } from '../tactics/status';
import type { BattleRules, BattleState, BattleUnit, Cell, Strike } from '../tactics/types';

/** Modificateurs d'une frappe de compétence (skills.json, effet « frappe »). */
export interface StrikeMods {
  readonly sureHit?: boolean;
  readonly damageMult?: number;
  readonly ignoreDef?: number;
  readonly bonusVs?: readonly string[];
  readonly bonusMult?: number;
  readonly noCounter?: boolean;
}

/** +1 avantage, −1 désavantage, 0 neutre. */
export type TriangleEdge = -1 | 0 | 1;

export function triangleEdge(weaponElement: string | null, targetElement: string | null, rules: BattleRules): TriangleEdge {
  if (weaponElement === null || targetElement === null) return 0;
  if (rules.elements.get(weaponElement)?.beats === targetElement) return 1;
  if (rules.elements.get(targetElement)?.beats === weaponElement) return -1;
  return 0;
}

/** Vrai si l'arme de l'attaquant est efficace contre la cible (armure lourde, monstre, boss). */
export function isEffective(attacker: BattleUnit, target: BattleUnit): boolean {
  return attacker.weapon.effective.some((tag) => (tag === 'boss' ? target.isBoss : tag === target.armor));
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Chiffres d'un coup d'une unité sur une autre, chacune sur sa case. */
export interface StrikeOdds {
  /** Dégâts d'un coup normal (avant critique). */
  readonly damage: number;
  /** Chance de toucher, en %. */
  readonly hit: number;
  /** Chance de critique, en % (si le coup touche). */
  readonly crit: number;
  readonly triangle: TriangleEdge;
  readonly effective: boolean;
}

/** Chiffres d'un coup de `attacker` sur `target` posée sur la case `targetAt` (son terrain la protège). */
export function strikeOdds(state: BattleState, attacker: BattleUnit, target: BattleUnit, targetAt: Cell, rules: BattleRules, mods: StrikeMods = {}): StrikeOdds {
  const c = rules.combat;
  const w = attacker.weapon;
  const terrain = terrainAt(state.map, targetAt.x, targetAt.y);
  const triangle = triangleEdge(w.element, target.element, rules);
  const physical = w.damage === 'physique';
  const power = (physical ? attacker.stats.fo : attacker.stats.mag) + w.power + triangle * c.elementAdvantage.damage;
  const reduction = physical ? Math.max(0, target.stats.def - (mods.ignoreDef ?? 0)) + terrain.defense : target.stats.res;
  const effective = isEffective(attacker, target);
  let damage = Math.max(0, power - reduction);
  if (effective) damage = Math.floor(damage * c.effectiveMultiplier);
  if (mods.bonusVs?.includes(target.armor) && mods.bonusMult) damage = Math.floor(damage * mods.bonusMult);
  if (mods.damageMult) damage = Math.floor(damage * mods.damageMult);
  if (physical) damage = Math.max(0, damage - guardOf(target, rules));
  damage = Math.floor(damage * damageTakenOf(target, rules));

  const accuracy = w.hit + attacker.stats.dex * 2 + Math.floor(attacker.stats.chc / 2) + triangle * c.elementAdvantage.hit;
  const avoid = target.stats.vit * 2 + Math.floor(target.stats.chc / 2) + terrain.avoid + avoidBonusOf(target, rules);
  const hit = mods.sureHit ? 100 : clamp(accuracy - avoid, c.hitChanceMin, c.hitChanceMax);
  const crit = clamp(w.crit + Math.floor(attacker.stats.dex / 2) - target.stats.chc, 0, 100);
  return { damage, hit, crit, triangle, effective };
}

export function doubles(attacker: BattleUnit, target: BattleUnit, rules: BattleRules): boolean {
  return attacker.stats.vit >= target.stats.vit + rules.combat.doubleAttackSpeedGap;
}

/** Prévision d'un camp dans l'échange (GDD §13.5). */
export interface SideForecast {
  readonly unitId: string;
  /** Peut frapper (toujours vrai pour l'attaquant ; riposte possible pour le défenseur). */
  readonly canStrike: boolean;
  readonly odds: StrikeOdds;
  /** Frappe deux fois. */
  readonly doubles: boolean;
  readonly hp: number;
  readonly maxHp: number;
}

export interface Forecast {
  readonly attacker: SideForecast;
  readonly defender: SideForecast;
}

/** Prévision de l'échange si `attacker` frappe `defender` depuis la case `from` (sa case actuelle par défaut). */
export function forecast(state: BattleState, attacker: BattleUnit, defender: BattleUnit, rules: BattleRules, from: Cell = attacker, mods: StrikeMods = {}): Forecast {
  const d = distance(from, defender);
  const counter = mods.noCounter !== true && d >= defender.weapon.range[0] && d <= defender.weapon.range[1];
  return {
    attacker: {
      unitId: attacker.id,
      canStrike: true,
      odds: strikeOdds(state, attacker, defender, defender, rules, mods),
      doubles: doubles(attacker, defender, rules),
      hp: attacker.hp,
      maxHp: attacker.stats.pv,
    },
    defender: {
      unitId: defender.id,
      canStrike: counter,
      odds: strikeOdds(state, defender, attacker, from, rules),
      doubles: counter && doubles(defender, attacker, rules),
      hp: defender.hp,
      maxHp: defender.stats.pv,
    },
  };
}

/**
 * Joue l'échange : modifie les PV et la Résonance des deux unités, tire les
 * dés dans le `Rng` de l'état. Les deux unités sont réveillées (profil défensif).
 */
export function resolveExchange(state: BattleState, attacker: BattleUnit, defender: BattleUnit, rules: BattleRules, mods: StrikeMods = {}): Strike[] {
  const f = forecast(state, attacker, defender, rules, attacker, mods);
  const order: [BattleUnit, BattleUnit, SideForecast, boolean][] = [[attacker, defender, f.attacker, false]];
  if (f.defender.canStrike) order.push([defender, attacker, f.defender, true]);
  if (f.attacker.doubles) order.push([attacker, defender, f.attacker, false]);
  if (f.defender.doubles) order.push([defender, attacker, f.defender, true]);

  const res = rules.combat.resonance;
  const strikes: Strike[] = [];
  for (const [striker, target, side, counter] of order) {
    if (striker.hp <= 0 || target.hp <= 0) break;
    const hit = state.rng.chance(side.odds.hit);
    const crit = hit && state.rng.chance(side.odds.crit);
    const damage = hit ? Math.min(target.hp, side.odds.damage * (crit ? rules.combat.critMultiplier : 1)) : 0;
    target.hp -= damage;
    striker.resonance = Math.min(res.max, striker.resonance + res.perAttack);
    if (hit) target.resonance = Math.min(res.max, target.resonance + res.perHitTaken);
    strikes.push({ attackerId: striker.id, targetId: target.id, counter, hit, crit, damage, targetHp: target.hp });
    if (target.hp <= 0) break;
  }
  attacker.alerted = true;
  defender.alerted = true;
  return strikes;
}
