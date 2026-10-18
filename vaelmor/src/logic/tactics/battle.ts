/**
 * Déroulement d'un combat (GDD §9.4, §9.10, §9.13) : commandes des unités,
 * phases, conditions de victoire et de défaite.
 *
 * Une unité par tour : Déplacement → Action (Attaquer ou Attendre) ; le
 * déplacement s'annule tant qu'aucune action n'a été choisie. Les commandes
 * vérifient leurs conditions et lèvent une `BattleError` sinon : le rendu ne
 * propose que des commandes valides, une erreur signale donc un bogue.
 */
import { resolveExchange } from '../combat/combat';
import { canStop, getUnit, inWeaponRange, pathTo, reachable, terrainAt } from './grid';
import type { BattleEvent, BattleRules, BattleState, BattleUnit, Cell, Team } from './types';

export class BattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BattleError';
  }
}

function assertCanAct(state: BattleState, unit: BattleUnit): void {
  if (state.outcome !== 'ongoing') throw new BattleError('Le combat est terminé.');
  if (unit.hp <= 0) throw new BattleError(`${unit.name} est hors de combat.`);
  if (unit.team !== state.phase) throw new BattleError(`Ce n'est pas la phase de ${unit.name}.`);
  if (unit.acted) throw new BattleError(`${unit.name} a déjà agi.`);
}

/** Unités vivantes d'un camp. */
export function livingUnits(state: BattleState, team: Team): BattleUnit[] {
  return state.units.filter((u) => u.team === team && u.hp > 0);
}

/** Unités du camp en cours qui peuvent encore agir. */
export function readyUnits(state: BattleState): BattleUnit[] {
  return livingUnits(state, state.phase).filter((u) => !u.acted);
}

/** Déplace une unité (une fois par tour). */
export function moveUnit(state: BattleState, unitId: string, to: Cell): BattleEvent[] {
  const unit = getUnit(state, unitId);
  assertCanAct(state, unit);
  if (unit.moved) throw new BattleError(`${unit.name} a déjà bougé.`);
  const reach = reachable(state, unit);
  if (!canStop(reach, state.map, to)) throw new BattleError(`${unit.name} ne peut pas aller en ${to.x},${to.y}.`);
  const path = pathTo(reach, state.map, to);
  unit.moveOrigin = { x: unit.x, y: unit.y };
  unit.x = to.x;
  unit.y = to.y;
  unit.moved = true;
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

/** Fin du tour d'une unité : elle est grisée ; un marais l'enlise pour sa prochaine phase. */
function finishUnit(state: BattleState, unit: BattleUnit): void {
  unit.acted = true;
  unit.moved = true;
  unit.moveOrigin = null;
  if (unit.hp > 0 && terrainAt(state.map, unit.x, unit.y).tags.includes('enlise')) unit.bogPending = true;
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
  assertCanAct(state, attacker);
  if (defender.hp <= 0 || defender.team === attacker.team) throw new BattleError(`${defender.name} n'est pas une cible valable.`);
  if (!inWeaponRange(attacker, attacker, defender)) throw new BattleError(`${defender.name} est hors de portée.`);

  const strikes = resolveExchange(state, attacker, defender, rules);
  const events: BattleEvent[] = [{ type: 'combat', attackerId, defenderId, strikes }];
  for (const unit of [defender, attacker]) if (unit.hp <= 0) events.push({ type: 'ko', unitId: unit.id });
  finishUnit(state, attacker);
  events.push(...settleOutcome(state));
  return events;
}

/**
 * Conditions de fin (GDD §9.10) : défaite si le héros tombe ou si toute la
 * compagnie est hors de combat ; victoire quand tous les ennemis sont vaincus
 * (« rout ») ou quand le boss tombe (« boss »).
 */
export function evaluateOutcome(state: BattleState): BattleState['outcome'] {
  const players = state.units.filter((u) => u.team === 'player');
  if (players.some((u) => u.isHero && u.hp <= 0) || players.every((u) => u.hp <= 0)) return 'defeat';
  const enemies = state.units.filter((u) => u.team === 'enemy');
  if (state.objective === 'boss' ? enemies.some((u) => u.isBoss && u.hp <= 0) : enemies.every((u) => u.hp <= 0)) return 'victory';
  return 'ongoing';
}

function settleOutcome(state: BattleState): BattleEvent[] {
  if (state.outcome !== 'ongoing') return [];
  const outcome = evaluateOutcome(state);
  if (outcome === 'ongoing') return [];
  state.outcome = outcome;
  return [{ type: 'outcome', outcome }];
}

/** Début de phase d'un camp : unités prêtes, enlisement, soin des villages (alliés seulement, GDD §3.5). */
function startPhase(state: BattleState, team: Team): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const unit of state.units) {
    if (unit.team !== team || unit.hp <= 0) continue;
    unit.moved = false;
    unit.acted = false;
    unit.moveOrigin = null;
    unit.bogged = unit.bogPending;
    unit.bogPending = false;
    const heal = terrainAt(state.map, unit.x, unit.y).heal;
    if (team === 'player' && heal > 0 && unit.hp < unit.stats.pv) {
      const amount = Math.min(unit.stats.pv - unit.hp, Math.max(1, Math.floor(unit.stats.pv * heal)));
      unit.hp += amount;
      events.push({ type: 'heal', unitId: unit.id, amount });
    }
  }
  return events;
}

function endPhaseOf(state: BattleState, team: Team): void {
  for (const unit of state.units) if (unit.team === team) unit.bogged = false;
}

/**
 * Termine la phase en cours et ouvre la suivante. Avec l'avantage de position
 * (`initiative`), la première phase ennemie est sautée : le joueur joue deux
 * phases d'affilée (GDD §4.7).
 */
export function endPhase(state: BattleState): BattleEvent[] {
  if (state.outcome !== 'ongoing') return [];
  endPhaseOf(state, state.phase);
  const events: BattleEvent[] = [];
  if (state.phase === 'player') {
    if (state.initiative && state.turn === 1) {
      state.initiative = false;
      events.push({ type: 'phase', team: 'enemy', turn: state.turn, skipped: true });
      state.turn += 1;
      state.phase = 'player';
      events.push({ type: 'phase', team: 'player', turn: state.turn, skipped: false }, ...startPhase(state, 'player'));
      return events;
    }
    state.phase = 'enemy';
  } else if (state.ambush) {
    // Fin de la phase d'embuscade : la compagnie joue enfin son tour 1.
    state.ambush = false;
    state.phase = 'player';
  } else {
    state.phase = 'player';
    state.turn += 1;
  }
  events.push({ type: 'phase', team: state.phase, turn: state.turn, skipped: false }, ...startPhase(state, state.phase));
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
   * Alliés tombés. Après une victoire, ils reviennent avec 1 PV, « Blessés »
   * jusqu'au prochain repos (règle « Blessure », GDD §9.13) ; la compagnie
   * persistante qui gardera cet état arrive avec le recrutement (M6).
   */
  readonly fallen: readonly string[];
  readonly flags: readonly string[];
}

export function summarize(state: BattleState): BattleSummary {
  const enemies = state.units.filter((u) => u.team === 'enemy');
  return {
    outcome: state.outcome,
    turns: state.turn,
    enemiesDefeated: enemies.filter((u) => u.hp <= 0).length,
    enemiesTotal: enemies.length,
    fallen: state.units.filter((u) => u.team === 'player' && u.hp <= 0).map((u) => u.name),
    flags: state.outcome === 'victory' ? state.victoryFlags : [],
  };
}
