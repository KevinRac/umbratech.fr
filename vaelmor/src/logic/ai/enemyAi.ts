/**
 * IA ennemie (GDD §9.15) : un **score** par action possible, sans arbre de
 * recherche. Pour chaque case atteignable et chaque cible à portée depuis
 * cette case, l'IA estime l'échange (prévision exacte des formules) :
 *
 *   score = dégâts espérés + bonus de coup fatal − risque (riposte espérée)
 *           + abri du terrain + bonus du profil
 *
 * Profils :
 * - agressif : le meilleur score ;
 * - opportuniste : préfère les cibles déjà blessées ;
 * - chasseur_heros : préfère le héros ;
 * - defensif : ne bouge que s'il peut frapper ce tour-ci ; une fois réveillé
 *   (il a frappé ou été frappé), il se comporte en agressif ;
 * - boss : ne quitte jamais sa case, frappe ce qui passe à portée.
 *
 * Sans cible à portée, l'ennemi marche vers la case d'attaque la plus proche
 * (en coût de déplacement réel) de l'allié le plus accessible.
 * L'IA est déterministe : à égalité, l'ordre des cases et des unités tranche.
 */
import { forecast } from '../combat/combat';
import { cellIndex, cellsInRange, getUnit, inBounds, reachable, targetsFrom, terrainAt, unitAt } from '../tactics/grid';
import type { BattleRules, BattleState, BattleUnit, Cell } from '../tactics/types';

export interface AiPlan {
  readonly unitId: string;
  /** Case où finir le déplacement (sa propre case s'il ne bouge pas). */
  readonly to: Cell;
  /** Cible à attaquer depuis `to`, ou null (attendre). */
  readonly targetId: string | null;
}

/** Poids du score (réglés à la main ; les déplacer dans balance.json si l'équilibrage le demande). */
const W = {
  kill: 40,
  risk: 0.6,
  cover: 1.5,
  wounded: 20,
  hero: 15,
} as const;

function profileOf(unit: BattleUnit): NonNullable<BattleUnit['ai']> {
  const ai = unit.ai ?? 'agressif';
  return ai === 'defensif' && unit.alerted ? 'agressif' : ai;
}

/** Score d'une attaque de `unit` sur `target` depuis `from`. */
export function attackScore(state: BattleState, unit: BattleUnit, target: BattleUnit, from: Cell, rules: BattleRules): number {
  const f = forecast(state, unit, target, rules, from);
  const a = f.attacker;
  const strikes = a.doubles ? 2 : 1;
  const p = a.odds.hit / 100;
  const expected = Math.min(target.hp, p * a.odds.damage * strikes);
  // Probabilité de vaincre la cible pendant l'échange (critique compris, approximée).
  const killDamage = a.odds.damage * strikes >= target.hp ? p : a.odds.damage * rules.combat.critMultiplier >= target.hp ? p * (a.odds.crit / 100) : 0;
  const d = f.defender;
  const risk = d.canStrike ? (d.odds.hit / 100) * d.odds.damage * (d.doubles ? 2 : 1) * (1 - killDamage) : 0;
  const terrain = terrainAt(state.map, from.x, from.y);
  let score = expected + W.kill * killDamage - W.risk * risk + W.cover * (terrain.defense + terrain.avoid / 10);
  const profile = profileOf(unit);
  if (profile === 'opportuniste') score += W.wounded * (1 - target.hp / target.stats.pv);
  if (profile === 'chasseur_heros' && target.isHero) score += W.hero;
  return score;
}

/** Carte des coûts de déplacement depuis une case, pour une unité, sans limite de mobilité. */
function distanceField(state: BattleState, unit: BattleUnit, from: Cell): ReadonlyMap<number, number> {
  return reachable(state, unit, Infinity, from).cost;
}

function approach(state: BattleState, unit: BattleUnit, stops: readonly Cell[]): Cell {
  const { map } = state;
  const fromUnit = distanceField(state, unit, unit);
  const profile = profileOf(unit);
  let goal: Cell | null = null;
  let goalScore = Infinity;
  for (const target of state.units) {
    if (target.hp <= 0 || target.team === unit.team) continue;
    for (const c of cellsInRange(map, target, unit.weapon.range)) {
      const occupant = unitAt(state, c.x, c.y);
      if (occupant && occupant !== unit) continue;
      const cost = fromUnit.get(cellIndex(map, c.x, c.y));
      if (cost === undefined) continue;
      let score = cost;
      if (profile === 'chasseur_heros' && target.isHero) score -= 4;
      if (profile === 'opportuniste') score -= 3 * (1 - target.hp / target.stats.pv);
      if (score < goalScore) {
        goalScore = score;
        goal = c;
      }
    }
  }
  if (!goal) return { x: unit.x, y: unit.y };
  // Coût restant depuis chaque case d'arrêt possible jusqu'au but (chemin symétrique).
  const toGoal = distanceField(state, unit, goal);
  let best: Cell = { x: unit.x, y: unit.y };
  let bestCost = toGoal.get(cellIndex(map, unit.x, unit.y)) ?? Infinity;
  let bestCover = -Infinity;
  for (const stop of stops) {
    const cost = toGoal.get(cellIndex(map, stop.x, stop.y));
    if (cost === undefined) continue;
    const t = terrainAt(map, stop.x, stop.y);
    const cover = t.defense * 10 + t.avoid;
    if (cost < bestCost || (cost === bestCost && cover > bestCover)) {
      best = stop;
      bestCost = cost;
      bestCover = cover;
    }
  }
  return best;
}

/** Choisit l'action d'un ennemi (ne modifie pas l'état). */
export function planEnemyAction(state: BattleState, unitId: string, rules: BattleRules): AiPlan {
  const unit = getUnit(state, unitId);
  const profile = profileOf(unit);
  const here: Cell = { x: unit.x, y: unit.y };
  const stops = profile === 'boss' ? [here] : reachable(state, unit).stops.filter((c) => inBounds(state.map, c.x, c.y));

  let best: AiPlan | null = null;
  let bestScore = -Infinity;
  for (const stop of stops) {
    for (const target of targetsFrom(state, unit, stop)) {
      const score = attackScore(state, unit, target, stop, rules);
      if (score > bestScore) {
        bestScore = score;
        best = { unitId, to: stop, targetId: target.id };
      }
    }
  }
  if (best) return best;
  if (profile === 'boss' || profile === 'defensif') return { unitId, to: here, targetId: null };
  return { unitId, to: approach(state, unit, stops), targetId: null };
}
