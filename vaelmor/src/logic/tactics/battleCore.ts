/**
 * Briques communes aux commandes du combat : vérifications, fin du tour d'une
 * unité, conditions de victoire et de défaite (GDD §9.10), dégâts directs.
 * Module pur.
 */
import { getUnit, terrainAt } from './grid';
import type { BattleEvent, BattleState, BattleUnit, Team } from './types';

export class BattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BattleError';
  }
}

export function assertCanAct(state: BattleState, unit: BattleUnit): void {
  if (state.outcome !== 'ongoing') throw new BattleError('Le combat est terminé.');
  if (unit.hp <= 0) throw new BattleError(`${unit.name} est hors de combat.`);
  if (unit.team !== state.phase) throw new BattleError(`Ce n'est pas la phase de ${unit.name}.`);
  if (unit.acted) throw new BattleError(`${unit.name} a déjà agi.`);
}

/** Une action (attaque, compétence, objet, soin) : interdite pendant le déplacement offert par « Pas de marée ». */
export function assertCanAction(state: BattleState, unit: BattleUnit): void {
  assertCanAct(state, unit);
  if (unit.cantoLeft > 0) throw new BattleError(`${unit.name} a déjà agi : il ne peut plus que se déplacer.`);
}

export function getActor(state: BattleState, id: string): BattleUnit {
  return getUnit(state, id);
}

/** Unités vivantes d'un camp. */
export function livingUnits(state: BattleState, team: Team): BattleUnit[] {
  return state.units.filter((u) => u.team === team && u.hp > 0);
}

/** Fin du tour d'une unité : elle est grisée ; un marais l'enlise pour sa prochaine phase. */
export function finishUnit(state: BattleState, unit: BattleUnit): void {
  unit.acted = true;
  unit.moved = true;
  unit.moveOrigin = null;
  unit.cantoLeft = 0;
  if (unit.hp > 0 && terrainAt(state.map, unit.x, unit.y).tags.includes('enlise')) unit.bogPending = true;
}

/** La compagnie au sens de la défaite : les membres (ni alliés verts ni invocations). */
export const isMember = (u: BattleUnit): boolean => u.team === 'player' && u.summonUntil === null;

/**
 * Conditions de fin (GDD §9.10) : défaite si le héros tombe ou si toute la
 * compagnie est hors de combat (les alliés verts et les invocations ne
 * comptent pas) ; victoire quand tous les ennemis sont vaincus (« rout »,
 * renforts attendus compris) ou quand le boss tombe (« boss »).
 */
export function evaluateOutcome(state: BattleState): BattleState['outcome'] {
  const members = state.units.filter(isMember);
  if (members.some((u) => u.isHero && u.hp <= 0) || members.every((u) => u.hp <= 0)) return 'defeat';
  const enemies = state.units.filter((u) => u.team === 'enemy');
  if (state.objective === 'boss') return enemies.some((u) => u.isBoss && u.hp <= 0) ? 'victory' : 'ongoing';
  const waiting = state.reinforcements.some((r) => r.team === 'enemy');
  return enemies.every((u) => u.hp <= 0) && !waiting ? 'victory' : 'ongoing';
}

export function settleOutcome(state: BattleState): BattleEvent[] {
  if (state.outcome !== 'ongoing') return [];
  const outcome = evaluateOutcome(state);
  if (outcome === 'ongoing') return [];
  state.outcome = outcome;
  return [{ type: 'outcome', outcome }];
}

/** Retire des PV (jamais sous 0) ; renvoie les dégâts réellement infligés. */
export function hurt(unit: BattleUnit, damage: number): number {
  const dealt = Math.max(0, Math.min(unit.hp, damage));
  unit.hp -= dealt;
  return dealt;
}

/** Rend des PV (jamais au-delà du maximum) ; renvoie les PV réellement rendus. */
export function mend(unit: BattleUnit, amount: number): number {
  const healed = Math.max(0, Math.min(unit.stats.pv - unit.hp, amount));
  unit.hp += healed;
  return healed;
}
