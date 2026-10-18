/**
 * IA du combat (GDD §9.15) : un **score** par action possible, sans arbre de
 * recherche. Pour chaque case atteignable, l'IA estime chaque action — attaque
 * (prévision exacte des formules), soin au bâton, compétence (boss) — et garde
 * la meilleure :
 *
 *   attaque = dégâts espérés + bonus de coup fatal − risque (riposte espérée)
 *             + abri du terrain + bonus du profil
 *   soin    = PV rendus × poids (× davantage pour le profil « soutien »)
 *   compétence = dégâts de zone, renforts sur les siens, affaiblissements posés
 *
 * Profils :
 * - agressif : le meilleur score ;
 * - opportuniste : préfère les cibles déjà blessées ;
 * - chasseur_heros : préfère le héros ;
 * - defensif : ne bouge que s'il peut frapper ce tour-ci ; une fois réveillé
 *   (il a frappé ou été frappé), il se comporte en agressif ;
 * - soutien : soigne ou renforce d'abord, frappe ensuite (jalon M5) ;
 * - boss : ne quitte jamais sa case, frappe ce qui passe à portée, lance ses
 *   compétences quand elles valent mieux qu'un coup (en phase 2, la fiche du
 *   boss lui donne souvent un autre profil : Brakk passe en agressif).
 *
 * Sans action, l'unité marche vers la case d'attaque la plus proche (en coût de
 * déplacement réel) de l'adversaire le plus accessible. L'IA est déterministe :
 * à égalité, l'ordre des cases et des unités tranche. Les alliés verts ont leur
 * propre IA (`allyAi.ts`), bâtie sur les mêmes estimations.
 */
import { forecast, type StrikeMods } from '../combat/combat';
import { attackUnit, healAction, moveUnit, skillAction, waitUnit } from '../tactics/battle';
import { cellIndex, cellsInRange, distance, getUnit, inBounds, reachable, targetsFrom, terrainAt, unitAt } from '../tactics/grid';
import { healTargets, staffHealAmount } from '../tactics/items';
import { hasStatus } from '../tactics/status';
import { previewSkill, skillBlocker, skillDef, skillTargets, strikeModsOf } from '../tactics/skills';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type Cell } from '../tactics/types';

export interface AiPlan {
  readonly unitId: string;
  /** Case où finir le déplacement (sa propre case s'il ne bouge pas). */
  readonly to: Cell;
  /** Cible à attaquer depuis `to`, ou null. */
  readonly targetId: string | null;
  /** Allié à soigner au bâton depuis `to`. */
  readonly healId?: string | null;
  /** Compétence à lancer depuis `to`, sur une case. */
  readonly skill?: { readonly id: string; readonly cell: Cell } | null;
}

/** Poids du score (réglés à la main ; les déplacer dans balance.json si l'équilibrage le demande). */
export const W = {
  kill: 40,
  risk: 0.6,
  cover: 1.5,
  wounded: 20,
  hero: 15,
  heal: 1.6,
  supportHeal: 2.6,
  supportAttack: 0.6,
  buff: 6,
  debuff: 8,
  friendlyFire: 1.5,
} as const;

export function profileOf(unit: BattleUnit): NonNullable<BattleUnit['ai']> {
  const ai = unit.ai ?? 'agressif';
  return ai === 'defensif' && unit.alerted ? 'agressif' : ai;
}

/** Score d'une attaque de `unit` sur `target` depuis `from` (modificateurs d'une frappe de compétence éventuels). */
export function attackScore(state: BattleState, unit: BattleUnit, target: BattleUnit, from: Cell, rules: BattleRules, mods: StrikeMods = {}): number {
  const f = forecast(state, unit, target, rules, from, mods);
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
  if (profile === 'soutien') score *= W.supportAttack;
  return score;
}

/** Score d'un soin au bâton sur `target`. */
export function healScore(unit: BattleUnit, target: BattleUnit): number {
  const healed = Math.min(target.stats.pv - target.hp, staffHealAmount(unit));
  if (healed <= 0) return -Infinity;
  const urgency = 1 + (1 - target.hp / target.stats.pv);
  return healed * urgency * (profileOf(unit) === 'soutien' ? W.supportHeal : W.heal) + (target.isBoss || target.isHero ? 8 : 0);
}

/**
 * Score d'une compétence lancée depuis `from` sur `cell` : dégâts sur les
 * adversaires (coup fatal compris) − dégâts sur les siens, renforts posés sur
 * les siens qui ne l'ont pas encore, affaiblissements sur les adversaires non
 * immunisés. Invocations et terrains ne sont pas utilisés par l'IA.
 */
export function skillScore(state: BattleState, unit: BattleUnit, skillId: string, from: Cell, cell: Cell, rules: BattleRules): number {
  const skill = skillDef(rules, skillId);
  if (skill.effects.some((e) => e.kind === 'invocation' || e.kind === 'terrain')) return -Infinity;
  const strike = skill.effects.find((e) => e.kind === 'frappe');
  if (strike) {
    const target = unitAt(state, cell.x, cell.y);
    return target ? attackScore(state, unit, target, from, rules, strikeModsOf(strike)) + 4 : -Infinity;
  }
  // Prévision depuis `from` : l'unité est momentanément posée sur la case.
  const home = { x: unit.x, y: unit.y };
  unit.x = from.x;
  unit.y = from.y;
  let score = 0;
  try {
    for (const line of previewSkill(state, unit, skill, cell, rules)) {
      const foe = hostile(line.unit.team, unit.team);
      if (line.damage !== undefined) {
        const dmg = Math.min(line.unit.hp, line.damage);
        score += foe ? dmg + (dmg >= line.unit.hp ? W.kill * 0.75 : 0) : -dmg * W.friendlyFire;
      }
      if (line.heal !== undefined && !foe) score += line.heal * W.heal;
      if (line.status !== undefined && !line.immune) {
        const kind = rules.statuses.get(line.status)?.kind;
        if (kind === 'buff' && !foe && !hasStatus(line.unit, line.status)) score += W.buff;
        if (kind === 'debuff' && foe && !hasStatus(line.unit, line.status)) score += W.debuff;
      }
    }
  } finally {
    unit.x = home.x;
    unit.y = home.y;
  }
  // Un renfort ne vaut que s'il touche au moins deux des siens.
  const buffOnly = skill.effects.every((e) => e.kind === 'statut') && skill.target === 'soi';
  return buffOnly && score < 2 * W.buff ? -Infinity : score;
}

/** Carte des coûts de déplacement depuis une case, pour une unité, sans limite de mobilité. */
function distanceField(state: BattleState, unit: BattleUnit, from: Cell): ReadonlyMap<number, number> {
  return reachable(state, unit, Infinity, from).cost;
}

/**
 * Case d'arrêt qui rapproche le plus l'unité d'une case d'attaque sur un
 * adversaire (en coût réel). `allowed` restreint les cases d'arrêt (laisse des alliés verts).
 */
export function approach(state: BattleState, unit: BattleUnit, stops: readonly Cell[], allowed: (c: Cell) => boolean = () => true): Cell {
  const { map } = state;
  const fromUnit = distanceField(state, unit, unit);
  const profile = profileOf(unit);
  let goal: Cell | null = null;
  let goalScore = Infinity;
  for (const target of state.units) {
    if (target.hp <= 0 || !hostile(target.team, unit.team)) continue;
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
  const here = { x: unit.x, y: unit.y };
  if (!goal) return here;
  // Coût restant depuis chaque case d'arrêt possible jusqu'au but (chemin symétrique).
  const toGoal = distanceField(state, unit, goal);
  let best: Cell = here;
  let bestCost = allowed(here) ? (toGoal.get(cellIndex(map, unit.x, unit.y)) ?? Infinity) : Infinity;
  let bestCover = -Infinity;
  for (const stop of stops) {
    if (!allowed(stop)) continue;
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

/** Meilleure action (attaque, soin, compétence) depuis les cases données, avec son score. */
export function bestAction(state: BattleState, unit: BattleUnit, stops: readonly Cell[], rules: BattleRules, bonus: (target: BattleUnit) => number = () => 0): { plan: AiPlan; score: number } | null {
  const top: { plan: AiPlan | null; score: number } = { plan: null, score: -Infinity };
  const consider = (plan: AiPlan, score: number): void => {
    if (score > top.score) {
      top.score = score;
      top.plan = plan;
    }
  };
  const usable = unit.skills.filter((id) => skillBlocker(state, unit, skillDef(rules, id)) === null);
  for (const stop of stops) {
    for (const target of targetsFrom(state, unit, stop)) consider({ unitId: unit.id, to: stop, targetId: target.id }, attackScore(state, unit, target, stop, rules) + bonus(target));
    for (const friend of healTargets(state, unit, stop)) consider({ unitId: unit.id, to: stop, targetId: null, healId: friend.id }, healScore(unit, friend));
    for (const id of usable) {
      const skill = skillDef(rules, id);
      for (const cell of skillTargets(state, unit, skill, stop)) consider({ unitId: unit.id, to: stop, targetId: null, skill: { id, cell } }, skillScore(state, unit, id, stop, cell, rules));
    }
  }
  return top.plan ? { plan: top.plan, score: top.score } : null;
}

/** Choisit l'action d'un ennemi (ne modifie pas l'état). */
export function planEnemyAction(state: BattleState, unitId: string, rules: BattleRules): AiPlan {
  const unit = getUnit(state, unitId);
  const profile = profileOf(unit);
  const here: Cell = { x: unit.x, y: unit.y };
  const stops = profile === 'boss' ? [here] : reachable(state, unit).stops.filter((c) => inBounds(state.map, c.x, c.y));
  const best = bestAction(state, unit, stops, rules);
  if (best && best.score > -Infinity) return best.plan;
  if (profile === 'boss' || profile === 'defensif') return { unitId, to: here, targetId: null };
  return { unitId, to: approach(state, unit, stops), targetId: null };
}

/** Joue un plan : déplacement, puis action (ou attente). */
export function executePlan(state: BattleState, plan: AiPlan, rules: BattleRules): BattleEvent[] {
  const unit = getUnit(state, plan.unitId);
  const events: BattleEvent[] = [];
  if (plan.to.x !== unit.x || plan.to.y !== unit.y) events.push(...moveUnit(state, unit.id, plan.to));
  if (plan.targetId) events.push(...attackUnit(state, unit.id, plan.targetId, rules));
  else if (plan.healId) events.push(...healAction(state, unit.id, plan.healId, rules));
  else if (plan.skill) events.push(...skillAction(state, unit.id, plan.skill.id, plan.skill.cell, rules));
  else events.push(...waitUnit(state, unit.id));
  return events;
}

/** Distance (Manhattan) à laquelle une unité peut frapper au prochain tour (déplacement + portée). */
export const threatReach = (u: BattleUnit): number => u.stats.mob + u.weapon.range[1];

export { distance };
