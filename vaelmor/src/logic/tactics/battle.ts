/**
 * Déroulement d'un combat (GDD §9.4, §9.10, §9.13) : commandes des unités,
 * phases, renforts, statuts, conditions de victoire et de défaite.
 *
 * Une unité par tour : Déplacement → Action (Attaquer, Compétence, Objet,
 * Soigner ou Attendre) ; le déplacement s'annule tant qu'aucune action n'a été
 * choisie. Les commandes vérifient leurs conditions et lèvent une
 * `BattleError` sinon : le rendu ne propose que des commandes valides, une
 * erreur signale donc un bogue.
 *
 * Un tour (jalon M5) : phase du joueur, phase alliée (les alliés verts, menés
 * par l'IA, s'il y en a), phase ennemie. Au début de chaque phase : renforts
 * du camp attendus ce tour, statuts expirés, invocations dissipées, terrains
 * temporaires retirés, dégâts des statuts (Brûlure), unités gelées qui perdent
 * leur action, soin des villages (compagnie et alliés).
 */
import { resolveExchange } from '../combat/combat';
import { BattleError, assertCanAct, assertCanAction, finishUnit, hurt, livingUnits, settleOutcome } from './battleCore';
import { checkBossPhases } from './bosses';
import { canStop, getUnit, inWeaponRange, nearestFreeCell, pathTo, reachable, terrainAt } from './grid';
import { healUnit, useItem } from './items';
import { useSkill } from './skills';
import { expireStatuses, isStunned, statusDef } from './status';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type Cell, type Team } from './types';

export { BattleError, evaluateOutcome, livingUnits } from './battleCore';

/** Unités du camp en cours qui peuvent encore agir. */
export function readyUnits(state: BattleState): BattleUnit[] {
  return livingUnits(state, state.phase).filter((u) => !u.acted);
}

/** Après toute action qui blesse : boss qui changent de phase, fin du combat. */
export function afterAction(state: BattleState, rules: BattleRules): BattleEvent[] {
  return [...checkBossPhases(state, rules), ...settleOutcome(state)];
}

/**
 * Déplace une unité (une fois par tour). Après « Pas de marée », c'est le
 * déplacement offert : il termine le tour de l'unité.
 */
export function moveUnit(state: BattleState, unitId: string, to: Cell): BattleEvent[] {
  const unit = getUnit(state, unitId);
  assertCanAct(state, unit);
  if (unit.moved) throw new BattleError(`${unit.name} a déjà bougé.`);
  const reach = reachable(state, unit);
  if (!canStop(reach, state.map, to)) throw new BattleError(`${unit.name} ne peut pas aller en ${to.x},${to.y}.`);
  const path = pathTo(reach, state.map, to);
  const canto = unit.cantoLeft > 0;
  unit.moveOrigin = { x: unit.x, y: unit.y };
  unit.x = to.x;
  unit.y = to.y;
  unit.moved = true;
  if (canto) finishUnit(state, unit);
  return path.length > 1 ? [{ type: 'move', unitId, path }] : [];
}

/** Annule le déplacement de ce tour (avant toute action). */
export function undoMove(state: BattleState, unitId: string): void {
  const unit = getUnit(state, unitId);
  assertCanAct(state, unit);
  if (!unit.moved || !unit.moveOrigin) return;
  unit.x = unit.moveOrigin.x;
  unit.y = unit.moveOrigin.y;
  unit.moveOrigin = null;
  unit.moved = false;
}

export function waitUnit(state: BattleState, unitId: string): BattleEvent[] {
  const unit = getUnit(state, unitId);
  assertCanAct(state, unit);
  finishUnit(state, unit);
  return [];
}

/** Attaque une unité ennemie à portée depuis la case actuelle. */
export function attackUnit(state: BattleState, attackerId: string, defenderId: string, rules: BattleRules): BattleEvent[] {
  const attacker = getUnit(state, attackerId);
  const defender = getUnit(state, defenderId);
  assertCanAction(state, attacker);
  if (defender.hp <= 0 || !hostile(defender.team, attacker.team)) throw new BattleError(`${defender.name} n'est pas une cible valable.`);
  if (!inWeaponRange(attacker, attacker, defender)) throw new BattleError(`${defender.name} est hors de portée.`);

  const strikes = resolveExchange(state, attacker, defender, rules);
  const events: BattleEvent[] = [{ type: 'combat', attackerId, defenderId, strikes }];
  for (const unit of [defender, attacker]) if (unit.hp <= 0) events.push({ type: 'ko', unitId: unit.id });
  finishUnit(state, attacker);
  events.push(...afterAction(state, rules));
  return events;
}

/** Lance une compétence sur une case (voir `skills.ts`). */
export function skillAction(state: BattleState, unitId: string, skillId: string, target: Cell, rules: BattleRules): BattleEvent[] {
  return [...useSkill(state, unitId, skillId, target, rules), ...afterAction(state, rules)];
}

/** Utilise un objet porté (voir `items.ts`). */
export function itemAction(state: BattleState, unitId: string, item: string, targetId: string, rules: BattleRules): BattleEvent[] {
  return [...useItem(state, unitId, item, targetId, rules), ...afterAction(state, rules)];
}

/** Soigne un allié au bâton (voir `items.ts`). */
export function healAction(state: BattleState, unitId: string, targetId: string, rules: BattleRules): BattleEvent[] {
  return [...healUnit(state, unitId, targetId), ...afterAction(state, rules)];
}

/* ---------- Phases ---------- */

/** Fait entrer les renforts du camp attendus à ce tour (au plus près de leur point d'entrée). */
function spawnReinforcements(state: BattleState, team: Team): BattleEvent[] {
  const events: BattleEvent[] = [];
  const due = state.reinforcements.filter((r) => r.team === team && r.turn <= state.turn);
  if (due.length === 0) return events;
  // Les renforts doivent pouvoir rejoindre leur camp : l'ancre est une unité vivante du même côté.
  const anchorUnit = team === 'enemy' ? state.units.find((u) => u.hp > 0 && u.team === 'enemy') : state.units.find((u) => u.hp > 0 && u.isHero) ?? state.units.find((u) => u.hp > 0 && u.team === 'player');
  const anchor = anchorUnit ? { x: anchorUnit.x, y: anchorUnit.y } : null;
  for (const wave of due) {
    state.reinforcements.splice(state.reinforcements.indexOf(wave), 1);
    const ids: string[] = [];
    for (const unit of wave.units) {
      const cell = nearestFreeCell(state, wave.entry, anchor) ?? nearestFreeCell(state, wave.entry);
      if (!cell) continue;
      unit.x = cell.x;
      unit.y = cell.y;
      state.units.push(unit);
      ids.push(unit.id);
    }
    if (ids.length > 0) events.push({ type: 'arrive', team, unitIds: ids, label: wave.label });
  }
  return events;
}

/**
 * Début de phase d'un camp : renforts, unités prêtes, statuts expirés,
 * invocations dissipées, terrains temporaires retirés, dégâts des statuts,
 * gel, enlisement, soin des villages (compagnie et alliés verts, GDD §3.5).
 */
function startPhase(state: BattleState, team: Team, rules: BattleRules): BattleEvent[] {
  const events: BattleEvent[] = spawnReinforcements(state, team);

  // Terrains temporaires posés par ce camp.
  const gone = state.overlays.filter((o) => o.team === team && state.turn >= o.until);
  if (gone.length > 0) {
    for (const o of gone) {
      state.map.terrains[o.index] = o.original;
      state.overlays.splice(state.overlays.indexOf(o), 1);
    }
    events.push({ type: 'terrain', cells: gone.map((o) => ({ x: o.index % state.map.width, y: Math.floor(o.index / state.map.width) })), terrain: gone[0]?.original.id ?? '', on: false });
  }

  for (const unit of state.units) {
    if (unit.team !== team || unit.hp <= 0) continue;
    unit.moved = false;
    unit.acted = false;
    unit.moveOrigin = null;
    unit.cantoLeft = 0;
    unit.bogged = unit.bogPending;
    unit.bogPending = false;
    if (unit.summonUntil !== null && state.turn >= unit.summonUntil) {
      unit.hp = 0;
      events.push({ type: 'vanish', unitId: unit.id });
      continue;
    }
    for (const status of expireStatuses(state, unit, rules)) events.push({ type: 'expire', unitId: unit.id, status });
    for (const mod of [...unit.mods]) {
      const dot = statusDef(rules, mod.status).dot;
      if (dot === undefined || unit.hp <= 0) continue;
      const dealt = hurt(unit, dot);
      events.push({ type: 'dot', unitId: unit.id, status: mod.status, damage: dealt, hp: unit.hp });
      if (unit.hp <= 0) events.push({ type: 'ko', unitId: unit.id });
    }
    if (unit.hp <= 0) continue;
    if (isStunned(unit, rules)) {
      unit.acted = true;
      unit.moved = true;
      events.push({ type: 'stunned', unitId: unit.id });
    }
    const heal = terrainAt(state.map, unit.x, unit.y).heal;
    if (team !== 'enemy' && heal > 0 && unit.hp < unit.stats.pv) {
      const amount = Math.min(unit.stats.pv - unit.hp, Math.max(1, Math.floor(unit.stats.pv * heal)));
      unit.hp += amount;
      events.push({ type: 'heal', unitId: unit.id, amount });
    }
  }
  events.push(...afterAction(state, rules));
  return events;
}

function endPhaseOf(state: BattleState, team: Team): void {
  for (const unit of state.units) {
    if (unit.team !== team) continue;
    unit.bogged = false;
    unit.cantoLeft = 0;
  }
}

/** La phase alliée a lieu s'il y a des alliés verts sur la carte ou attendus à ce tour. */
export function allyPhaseNeeded(state: BattleState, turn: number): boolean {
  return state.units.some((u) => u.team === 'ally' && u.hp > 0) || state.reinforcements.some((r) => r.team === 'ally' && r.turn <= turn);
}

/**
 * Termine la phase en cours et ouvre la suivante : joueur → alliés (s'il y en
 * a) → ennemis → joueur (tour suivant). Avec l'avantage de position
 * (`initiative`), la première phase ennemie est sautée : le joueur joue deux
 * phases d'affilée (GDD §4.7).
 */
export function endPhase(state: BattleState, rules: BattleRules): BattleEvent[] {
  if (state.outcome !== 'ongoing') return [];
  endPhaseOf(state, state.phase);
  const events: BattleEvent[] = [];
  let next: Team;
  let turn = state.turn;
  if (state.phase === 'player') next = 'ally';
  else if (state.phase === 'ally') next = 'enemy';
  else if (state.ambush) {
    // Fin de la phase d'embuscade : la compagnie joue enfin son tour 1.
    state.ambush = false;
    next = 'player';
  } else {
    next = 'player';
    turn += 1;
  }
  for (;;) {
    if (next === 'ally' && !allyPhaseNeeded(state, turn)) next = 'enemy';
    if (next === 'enemy' && state.initiative && turn === 1) {
      state.initiative = false;
      events.push({ type: 'phase', team: 'enemy', turn, skipped: true });
      next = 'player';
      turn += 1;
      continue;
    }
    break;
  }
  state.phase = next;
  state.turn = turn;
  events.push({ type: 'phase', team: next, turn, skipped: false }, ...startPhase(state, next, rules));
  return events;
}

/** Vrai quand toutes les unités du camp en cours ont agi (la phase peut se terminer d'elle-même). */
export function phaseComplete(state: BattleState): boolean {
  return readyUnits(state).length === 0;
}

/** Bilan d'un combat terminé (écran de victoire ou de défaite, GDD §13.7). */
export interface BattleSummary {
  readonly outcome: BattleState['outcome'];
  readonly turns: number;
  readonly enemiesDefeated: number;
  readonly enemiesTotal: number;
  /**
   * Membres de la compagnie tombés. Après une victoire, ils reviennent avec
   * 1 PV, « Blessés » jusqu'au prochain repos (règle « Blessure », GDD §9.13) ;
   * la compagnie persistante qui gardera cet état arrive avec le recrutement (M6).
   */
  readonly fallen: readonly string[];
  /** Alliés verts tombés. */
  readonly alliesFallen: readonly string[];
  /** Alliés errants tombés (blessés jusqu'au prochain repos, GDD §7.8). */
  readonly errantsFallen: readonly string[];
  readonly flags: readonly string[];
  /** Objets consommés pendant le combat. */
  readonly itemsUsed: readonly { readonly item: string; readonly qty: number }[];
}

export function summarize(state: BattleState): BattleSummary {
  const enemies = state.units.filter((u) => u.team === 'enemy' && u.summonUntil === null);
  const allies = state.units.filter((u) => u.team === 'ally');
  return {
    outcome: state.outcome,
    turns: state.turn,
    enemiesDefeated: enemies.filter((u) => u.hp <= 0).length,
    enemiesTotal: enemies.length,
    fallen: state.units.filter((u) => u.team === 'player' && u.summonUntil === null && u.hp <= 0).map((u) => u.name),
    alliesFallen: allies.filter((u) => u.hp <= 0).map((u) => u.name),
    errantsFallen: allies.filter((u) => u.hp <= 0 && u.errantId !== null).map((u) => u.errantId as string),
    flags: state.outcome === 'victory' ? state.victoryFlags : [],
    itemsUsed: Object.entries(state.itemsUsed).map(([item, qty]) => ({ item, qty })),
  };
}
