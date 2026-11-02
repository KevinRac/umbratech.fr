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
import type { OathKind } from '../progression/traits';
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
  /**
   * Blessure (GDD §9.13, décision n°138) : jour de repos où le membre est
   * tombé ; il reste blessé jusqu'au repos suivant. Null : en forme.
   */
  woundedDay: number | null;
  /** Passive choisie (n°93) ; null : la dernière apprise. */
  passive: string | null;
  /** Dernier serment choisi (Lame du Serment, n°123) ; null : « Protéger ». */
  oath: OathKind | null;
  /** Évolution (classes.json › evolutions) ; null en classe de base. La classe (`class`) reste la classe de base. */
  evolution: string | null;
  /** Compteurs des conditions d'évolution (serments tenus, boss vaincus…). */
  counters: Record<string, number>;
}

/** Le membre est-il blessé ce jour-là ? */
export const isWounded = (member: Pick<Member, 'woundedDay'>, day: number): boolean => member.woundedDay !== null && day <= member.woundedDay;

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
  return { id: seed.id, name: seed.name, class: cls.id, hero: seed.hero === true, level, xp: 0, stats: statsAtLevel(cls.baseStats, cls.growths, level), levelCap, woundedDay: null, passive: null, oath: null, evolution: null, counters: {} };
}

/**
 * Reporte sur la compagnie ce que ses membres ont gagné pendant un combat :
 * niveau, XP et stats des montées de niveau (`memberIndex` = rang dans la
 * compagnie). Un membre tombé est blessé jusqu'au prochain repos (n°138).
 */
export function applyBattleProgress(company: Member[], units: readonly BattleUnit[], day: number): void {
  for (const unit of units) {
    if (unit.team !== 'player' || unit.memberIndex === null || unit.summonUntil !== null || unit.xp === null) continue;
    const member = company[unit.memberIndex];
    if (!member) continue;
    if (unit.hp <= 0) member.woundedDay = day;
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
