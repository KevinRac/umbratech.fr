/**
 * Évolution d'un membre sans passer par le monde (jalon M10, lot F) : le
 * simulateur applique ce que `evolveMember` applique (bonus de la branche,
 * plafond de niveau de la classe avancée) sans Sceau, quête ni compteur.
 * Module pur.
 */
import type { GameData } from '../../data/validate';
import { findEvolution } from '../progression/evolutions';
import type { Member } from '../units/company';

/** Fait évoluer `member` vers `evoId` (bonus de stats, plafond 30). Renvoie faux si l'évolution n'existe pas. */
export function applyEvolutionBonus(data: GameData, member: Member, evoId: string): boolean {
  const found = findEvolution(data, evoId);
  if (!found) return false;
  const stats: Record<string, number> = { ...member.stats };
  for (const [k, v] of Object.entries(found.evo.bonus)) stats[k] = Math.max(k === 'mob' ? 1 : 0, (stats[k] ?? 0) + (v ?? 0));
  member.stats = stats as Member['stats'];
  member.evolution = evoId;
  member.levelCap = data.balance.levels.advancedClassCap;
  return true;
}
