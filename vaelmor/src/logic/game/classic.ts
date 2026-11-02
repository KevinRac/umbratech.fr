/**
 * Mode Classique : mort définitive (décisions n°13, n°166 à n°169). Module pur.
 *
 * À la fin d'un combat, quelle qu'en soit l'issue, chaque membre de la
 * compagnie tombé (hors héros) est perdu :
 * - il quitte la compagnie et son identifiant est noté dans `fallen` ;
 * - son équipement de préparation est oublié : arme, accessoire et objets
 *   n'étaient que réservés dans le sac, ils y restent ;
 * - une recrue de village coûte 3 de réputation à son village (GDD §6.3).
 * Le héros à terre donne la défaite habituelle (n°16) et n'est jamais perdu ;
 * les alliés verts et les errants gardent la règle des blessures.
 */
import type { GameData } from '../../data/validate';
import type { BattleUnit } from '../tactics/types';
import type { Loadout } from '../tactics/units';
import type { Member } from '../units/company';
import { changeReputation, type Progress, type RepChange } from './progress';

/** Réputation perdue par le village d'une recrue tombée en mode Classique (GDD §6.3). */
export const CLASSIC_RECRUIT_LOSS = -3;

export interface ClassicLoss {
  readonly member: Member;
  /** Village d'origine de la recrue et variation de sa réputation, s'il y en a un. */
  readonly reputation: RepChange | null;
}

/** Village où l'on recrute ce membre (option « recruit » d'un PNJ), ou null. */
export function recruitHome(data: GameData, memberId: string): string | null {
  for (const loc of data.locations) {
    for (const npc of loc.npcs) if (npc.options.some((o) => o.kind === 'recruit' && o.unit.id === memberId)) return loc.reputation ? loc.id : null;
  }
  return null;
}

/**
 * Retire de la compagnie les membres tombés pendant le combat (mode Classique
 * seulement ; sans effet en mode « blessure »). À appeler après le report des
 * niveaux et de l'XP (`applyBattleProgress`), une seule fois par combat.
 */
export function applyClassicLosses(data: GameData, progress: Progress, units: readonly BattleUnit[], loadouts: Record<string, Loadout>): ClassicLoss[] {
  if (progress.mode !== 'classique') return [];
  const fallen = new Set<string>();
  for (const unit of units) {
    if (unit.team !== 'player' || unit.memberIndex === null || unit.summonUntil !== null || unit.hp > 0) continue;
    const member = progress.company[unit.memberIndex];
    if (member && !member.hero) fallen.add(member.id);
  }
  const losses: ClassicLoss[] = [];
  for (const id of fallen) {
    const at = progress.company.findIndex((m) => m.id === id);
    if (at < 0) continue;
    const [member] = progress.company.splice(at, 1) as [Member];
    if (!progress.fallen.includes(id)) progress.fallen.push(id);
    delete loadouts[id];
    const home = recruitHome(data, id);
    losses.push({ member, reputation: home ? changeReputation(progress, home, CLASSIC_RECRUIT_LOSS, data.reputation) : null });
  }
  return losses;
}
