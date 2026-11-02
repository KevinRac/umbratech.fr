/**
 * La compagnie persistante (jalon M6) : chaque membre garde son niveau, son
 * XP et ses stats tirées au sort d'un combat à l'autre. Structure
 * sérialisable telle quelle (sauvegarde M9). Module pur.
 *
 * Un membre qui arrive reçoit la croissance moyenne de son niveau (décisions
 * n°52 et n°135) ; ensuite, chaque montée de niveau est tirée au sort en
 * combat (n°129) et reportée ici à la fin du combat, quelle qu'en soit
 * l'issue (n°130).
 */
import type { StatBlock } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import type { BattleUnit, GrowthKey } from '../tactics/types';
import { statsAtLevel } from './stats';

export interface Member {
  /** Identifiant stable (« heros », « nessa »…). */
  readonly id: string;
  name: string;
  /** Classe actuelle (classes.json). */
  class: string;
  readonly hero: boolean;
  level: number;
  /** XP vers le niveau suivant (0 à 99). */
  xp: number;
  /** Stats propres, sans accessoire ni statut. */
  stats: StatBlock;
  /** 20 en classe de base, 30 en classe avancée (décision n°131). */
  levelCap: number;
}

export interface MemberSeed {
  readonly id: string;
  readonly name: string;
  readonly class: string;
  readonly level: number;
  readonly hero?: boolean;
}

/** Un nouveau membre au niveau voulu, stats à la croissance moyenne. */
export function createMember(data: GameData, seed: MemberSeed): Member {
  const cls = data.classes.find((c) => c.id === seed.class);
  if (!cls) throw new Error(`Classe inconnue : « ${seed.class} »`);
  const levelCap = data.balance.levels.baseClassCap;
  const level = Math.max(1, Math.min(levelCap, seed.level));
  return { id: seed.id, name: seed.name, class: cls.id, hero: seed.hero === true, level, xp: 0, stats: statsAtLevel(cls.baseStats, cls.growths, level), levelCap };
}

/**
 * Reporte sur la compagnie ce que ses membres ont gagné pendant un combat :
 * niveau, XP et stats des montées de niveau (`memberIndex` = rang dans la compagnie).
 */
export function applyBattleProgress(company: Member[], units: readonly BattleUnit[]): void {
  for (const unit of units) {
    if (unit.team !== 'player' || unit.memberIndex === null || unit.summonUntil !== null || unit.xp === null) continue;
    const member = company[unit.memberIndex];
    if (!member) continue;
    member.level = unit.level;
    member.xp = unit.xp;
    const stats: Record<keyof StatBlock, number> = { ...member.stats };
    for (const [key, value] of Object.entries(unit.gains) as [GrowthKey, number][]) stats[key] += value;
    member.stats = stats;
  }
}

/** Niveau et XP gardés par un allié errant (décision n°132). */
export interface ErrantRecord {
  level: number;
  xp: number;
}

/** Reporte le niveau et l'XP des alliés errants du combat. */
export function applyErrantProgress(records: Record<string, ErrantRecord>, units: readonly BattleUnit[]): void {
  for (const unit of units) {
    if (unit.team !== 'ally' || unit.errantId === null || unit.xp === null) continue;
    records[unit.errantId] = { level: unit.level, xp: unit.xp };
  }
}
