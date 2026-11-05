/**
 * IA « prudente » de la compagnie (jalon M10, lot F, décision n°263).
 *
 * Elle joue la compagnie comme le ferait un joueur attentif, pour que le
 * simulateur d'équilibrage (`logic/sim`) mesure le jeu tel qu'on le joue et non
 * tel qu'une IA foncière le subit (A-10 : l'IA agressive de la compagnie
 * d'essai perdait 0 % contre tous les boss après Brakk).
 *
 * Pour chaque case d'arrêt possible, elle estime ce que l'unité y subirait à la
 * phase ennemie (chaque ennemi qui peut l'atteindre, avec les vraies formules,
 * en répartissant ses coups entre les cibles à sa portée) et retranche ce
 * danger au score de l'action :
 *
 *   score = valeur de l'action (attaque, soin, objet, compétence, attente)
 *           − poids du danger × dégâts attendus − pénalité mortelle
 *           + cohésion de la compagnie
 *
 * Le poids du danger grandit quand l'unité est blessée (elle recule, se soigne
 * ou boit une potion), et double pour le héros (sa chute est la défaite). Tant
 * qu'aucun ennemi n'est à portée et que des ennemis offensifs approchent, la
 * compagnie tient sa position sur le meilleur terrain ; elle avance quand
 * tous les ennemis restent passifs (boss, sentinelles) ou après `patience`
 * tours. À chaque pas, c'est l'action au meilleur score de toute la compagnie
 * qui est jouée (une unité qui peut tuer passe avant celle qui attend).
 *
 * Module pur, déterministe (l'ordre des cases et des unités tranche).
 */
import { doubles, strikeOdds } from '../combat/combat';
import { itemHeal } from '../progression/traits';
import { executePlan } from './enemyAi';
import { attackScore, healScore, profileOf, skillScore, type AiPlan } from './enemyAi';
import { moveUnit, readyUnits, waitUnit } from '../tactics/battle';
import { itemAction } from '../tactics/battle';
import { cellIndex, cellsInRange, distance, foesOf, friendsOf, getUnit, inBounds, reachable, targetsFrom, terrainAt, threatCells } from '../tactics/grid';
import { healTargets } from '../tactics/items';
import { skillBlocker, skillDef, skillTargets } from '../tactics/skills';
import type { BattleEvent, BattleRules, BattleState, BattleUnit, Cell } from '../tactics/types';

/** Poids de l'IA prudente (réglés à la main, comme `W` dans `enemyAi.ts`). */
export const PRUDENT = {
  /** Poids de chaque point de dégâts attendus à la phase ennemie. */
  danger: 0.55,
  /** Majoration du danger d'une unité blessée : × (1 + frailty × part de PV perdue). */
  frailty: 2,
  /** Majoration pour le héros (sa chute est la défaite). */
  hero: 2,
  /** Pénalité quand les dégâts attendus suffisent à l'abattre (doublée pour le héros). */
  lethal: 45,
  /** Pénalité par case au-delà de `cohesionRange` de l'allié le plus proche. */
  cohesion: 1.4,
  cohesionRange: 3,
  /** Poids d'un soin par objet, et seuil de PV (part du maximum) sous lequel on l'utilise. */
  itemHeal: 1.8,
  itemBelow: 0.55,
  /** Invocation : valeur de base et par ennemi proche (jusqu'à trois). */
  summon: 10,
  summonNear: 3,
  /** Tours qu'elle attend l'ennemi avant d'avancer. */
  patience: 1,
  /** Au-delà de ce tour, le combat s'éternise : le danger compte `rushRisk` fois moins (on force la décision). */
  rushTurn: 6,
  rushRisk: 0.1,
  /** Poids de l'avance (par case de distance à l'ennemi le plus proche) quand elle avance. */
  advance: 0.6,
  /** Poids de l'abri du terrain quand elle attend. */
  cover: 1.5,
} as const;

/** Plan de l'IA prudente : un plan ordinaire, ou l'usage d'un objet depuis la case d'arrivée. */
export interface PrudentPlan extends AiPlan {
  readonly item?: { readonly id: string; readonly targetId: string } | null;
}

/** Un ennemi et les cases qu'il peut frapper à sa prochaine phase. */
interface Threat {
  readonly enemy: BattleUnit;
  readonly cells: ReadonlySet<number>;
}

/** Ce que l'IA sait de la situation, calculé une fois par pas (l'état change après chaque action). */
export interface PrudentContext {
  readonly threats: readonly Threat[];
  /** Tout le monde avance (ennemis passifs ou patience épuisée) plutôt que de tenir sa position. */
  readonly advance: boolean;
  /** Le combat s'éternise : on prend des risques. */
  readonly rush: boolean;
}

/** Un ennemi qui ne vient pas à la compagnie (boss immobile, sentinelle endormie). */
const isPassive = (e: BattleUnit): boolean => profileOf(e) === 'boss' || (profileOf(e) === 'defensif' && !e.alerted);

/** Les cases qu'un ennemi peut frapper à sa prochaine phase. */
function threatOf(state: BattleState, enemy: BattleUnit): Threat {
  const cells = profileOf(enemy) === 'boss' ? new Set(cellsInRange(state.map, enemy, enemy.weapon.range).map((c) => cellIndex(state.map, c.x, c.y))) : threatCells(state, enemy);
  return { enemy, cells };
}

/** Situation de la phase : zones de menace de tous les ennemis, et avancer ou tenir. */
export function prudentContext(state: BattleState): PrudentContext {
  const foes = state.units.filter((u) => u.hp > 0 && u.team === 'enemy');
  const advance = state.turn >= PRUDENT.patience || foes.every(isPassive);
  return { threats: foes.map((e) => threatOf(state, e)), advance, rush: state.turn >= PRUDENT.rushTurn };
}

/** Dégâts attendus d'un ennemi sur l'unité posée sur `cell` (touche, double attaque, critique), part répartie entre ses cibles. */
function expectedHit(state: BattleState, enemy: BattleUnit, unit: BattleUnit, cell: Cell, share: number, rules: BattleRules): number {
  const odds = strikeOdds(state, enemy, unit, cell, rules);
  const strikes = doubles(enemy, unit, rules) ? 2 : 1;
  const crit = 1 + ((rules.combat.critMultiplier - 1) * odds.crit) / 100;
  return (odds.hit / 100) * odds.damage * strikes * crit * share;
}

/** Dégâts attendus sur l'unité si elle finit son tour sur `cell`. */
export function dangerAt(state: BattleState, unit: BattleUnit, cell: Cell, ctx: PrudentContext, rules: BattleRules): number {
  const index = cellIndex(state.map, cell.x, cell.y);
  const mates = friendsOf(state, unit).filter((f) => f !== unit);
  let total = 0;
  for (const t of ctx.threats) {
    if (!t.cells.has(index)) continue;
    // L'ennemi choisit une cible : plus la compagnie est à sa portée, moins la part de chacun est grande.
    const others = mates.filter((m) => t.cells.has(cellIndex(state.map, m.x, m.y))).length;
    total += expectedHit(state, t.enemy, unit, cell, 1 / (1 + others), rules);
  }
  return total;
}

/** Ce que coûte au score le danger d'une case : pondéré par la blessure, le héros, et la chance d'y mourir. */
export function riskPenalty(unit: BattleUnit, danger: number): number {
  if (danger <= 0) return 0;
  const lost = 1 - unit.hp / Math.max(1, unit.stats.pv);
  const weight = PRUDENT.danger * (1 + PRUDENT.frailty * lost) * (unit.isHero ? PRUDENT.hero : 1);
  const lethal = danger >= unit.hp ? PRUDENT.lethal * (unit.isHero ? 2 : 1) : 0;
  return weight * danger + lethal;
}

/** Pénalité d'isolement : la compagnie reste groupée. */
function cohesion(state: BattleState, unit: BattleUnit, cell: Cell): number {
  const mates = friendsOf(state, unit).filter((f) => f !== unit && f.summonUntil === null);
  if (mates.length === 0) return 0;
  const nearest = Math.min(...mates.map((m) => distance(m, cell)));
  return -PRUDENT.cohesion * Math.max(0, nearest - PRUDENT.cohesionRange);
}

/** Distance (en cases d'arme) à l'ennemi le plus proche : ce qu'il reste à parcourir pour le frapper. */
function gapToFoe(state: BattleState, unit: BattleUnit, cell: Cell): number {
  const foes = foesOf(state, unit);
  if (foes.length === 0) return 0;
  return Math.max(0, Math.min(...foes.map((f) => distance(f, cell))) - unit.weapon.range[1]);
}

/** Meilleure action prudente d'une unité (ne modifie pas l'état), avec son score. */
export function planPrudentAction(state: BattleState, unitId: string, rules: BattleRules, ctx: PrudentContext = prudentContext(state)): { readonly plan: PrudentPlan; readonly score: number } {
  const unit = getUnit(state, unitId);
  const here: Cell = { x: unit.x, y: unit.y };
  const stops = reachable(state, unit).stops.filter((c) => inBounds(state.map, c.x, c.y));
  let best: { plan: PrudentPlan; score: number } = { plan: { unitId, to: here, targetId: null }, score: -Infinity };
  const consider = (plan: PrudentPlan, score: number): void => {
    if (score > best.score) best = { plan, score };
  };
  const usable = unit.skills.filter((id) => skillBlocker(state, unit, skillDef(rules, id)) === null);
  const foes = foesOf(state, unit);

  for (const stop of stops) {
    const base = -riskPenalty(unit, dangerAt(state, unit, stop, ctx, rules)) * (ctx.rush ? PRUDENT.rushRisk : 1) + cohesion(state, unit, stop);
    const ground = terrainAt(state.map, stop.x, stop.y);

    // Attendre (ou s'avancer / reculer) : abri du terrain, et avance si la compagnie avance.
    const hold = PRUDENT.cover * (ground.defense + ground.avoid / 10) - (ctx.advance ? PRUDENT.advance * gapToFoe(state, unit, stop) : 0);
    consider({ unitId, to: stop, targetId: null }, base + hold);

    for (const target of targetsFrom(state, unit, stop)) consider({ unitId, to: stop, targetId: target.id }, base + attackScore(state, unit, target, stop, rules));
    for (const friend of healTargets(state, unit, stop)) consider({ unitId, to: stop, targetId: null, healId: friend.id }, base + healScore(unit, friend));

    // Objets de soin : seulement sous le seuil, pour ne rien gaspiller.
    for (const stack of unit.items) {
      const b = rules.consumables.get(stack.item)?.battle;
      if (stack.qty <= 0 || b?.heal === undefined) continue;
      for (const friend of friendsOf(state, unit)) {
        if (friend.hp >= friend.stats.pv * PRUDENT.itemBelow) continue;
        const d = friend === unit ? 0 : distance(stop, friend);
        if (d < b.range[0] || d > b.range[1]) continue;
        const healed = Math.min(friend.stats.pv - friend.hp, itemHeal(state, unit, b.heal, rules));
        const urgency = 1 + (1 - friend.hp / friend.stats.pv);
        consider({ unitId, to: stop, targetId: null, item: { id: stack.item, targetId: friend.id } }, base + healed * urgency * PRUDENT.itemHeal + (friend.isHero ? 8 : 0));
      }
    }

    for (const id of usable) {
      const skill = skillDef(rules, id);
      const cells = skillTargets(state, unit, skill, stop);
      if (skill.effects.some((e) => e.kind === 'invocation')) {
        // Invoquer entre la compagnie et l'ennemi, seulement quand l'ennemi est proche.
        const near = foes.filter((f) => distance(f, stop) <= 8);
        if (near.length === 0) continue;
        let cell: Cell | null = null;
        let gap = Infinity;
        for (const c of cells) {
          const d = Math.min(...near.map((f) => distance(f, c)));
          if (d < gap) {
            gap = d;
            cell = c;
          }
        }
        if (cell) consider({ unitId, to: stop, targetId: null, skill: { id, cell } }, base + PRUDENT.summon + PRUDENT.summonNear * Math.min(3, near.length));
        continue;
      }
      for (const cell of cells) {
        const score = skillScore(state, unit, id, stop, cell, rules);
        if (score > -Infinity) consider({ unitId, to: stop, targetId: null, skill: { id, cell } }, base + score);
      }
    }
  }
  return best;
}

/** Prochaine action de la phase : le meilleur plan de toute la compagnie, ou null quand plus personne ne peut agir. */
export function nextPrudentPlan(state: BattleState, rules: BattleRules): PrudentPlan | null {
  if (state.phase !== 'player' || state.outcome !== 'ongoing') return null;
  const ctx = prudentContext(state);
  let best: { plan: PrudentPlan; score: number } | null = null;
  for (const unit of readyUnits(state)) {
    const candidate = planPrudentAction(state, unit.id, rules, ctx);
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best?.plan ?? null;
}

/** Joue un plan prudent : déplacement, puis action (objet compris). */
export function executePrudent(state: BattleState, plan: PrudentPlan, rules: BattleRules): BattleEvent[] {
  const unit = getUnit(state, plan.unitId);
  // Après « Pas de marée » (déplacement offert), le déplacement termine le tour : rien à ajouter.
  if (unit.cantoLeft > 0) return plan.to.x !== unit.x || plan.to.y !== unit.y ? moveUnit(state, unit.id, plan.to) : waitUnit(state, unit.id);
  if (!plan.item) return executePlan(state, plan, rules);
  const events: BattleEvent[] = [];
  if (plan.to.x !== unit.x || plan.to.y !== unit.y) events.push(...moveUnit(state, unit.id, plan.to));
  events.push(...itemAction(state, unit.id, plan.item.id, plan.item.targetId, rules));
  return events;
}
