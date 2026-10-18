/**
 * Règles des ennemis du monde (jalon M3, GDD §7) qui touchent à la progression :
 * qui est présent, quelle rencontre il engage, quel écart de niveau afficher,
 * et ce qu'un combat rapporte ou coûte. Pure : le hasard vient d'un `Rng`.
 */
import type { EncounterDef, FoesBalance, PartyMemberDef, WorldFoeDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { Rng } from '../rng';
import { tierAt, type GameCtx, type Notice } from './context';
import { woundErrants } from './allyRules';
import { giveGold, giveItem } from './effects';
import { countItem, removeItem } from './progress';

export type BattleEnd = 'victory' | 'defeat' | 'retreat';

/* ---------- Présence et réapparition (GDD §7.7, décision n°74) ---------- */

/** L'ennemi est-il dans le monde en ce moment ? */
export function foePresent(ctx: GameCtx, foe: WorldFoeDef): boolean {
  const { progress, data } = ctx;
  const down = progress.foes[foe.id];
  switch (foe.kind) {
    case 'boss': {
      if (down) return false;
      const flags = data.encounters.encounters.find((e) => e.id === foe.encounter)?.victoryFlags ?? [];
      return !(flags.length > 0 && flags.every((f) => ctx.flags.includes(f)));
    }
    case 'sentinelle':
    case 'embuscade':
      return down === undefined;
    case 'patrouille':
      return down === undefined || progress.day > down.day;
    case 'garde':
      if (foe.town === undefined || tierAt(ctx, foe.town) !== 'hostile') return false;
      return down === undefined || progress.day > down.day;
    case 'errant':
      return down === undefined || progress.clock - down.clock >= data.balance.foes.wanderRespawnMs || progress.zoneVisits > down.visits;
  }
}

/** Rencontre engagée par un ennemi du monde : la sienne, ou tirée (au poids) dans la table de sa zone. */
export function chooseEncounter(data: GameData, foe: WorldFoeDef, seed: string): EncounterDef {
  const encounters = data.encounters.encounters;
  if (foe.encounter !== undefined) {
    const fixed = encounters.find((e) => e.id === foe.encounter);
    if (!fixed) throw new Error(`Rencontre inconnue : « ${foe.encounter} »`);
    return fixed;
  }
  const zone = data.zones.find((z) => z.id === foe.zone);
  const entries = (zone?.encounterTable ?? []).filter((t) => t.for.includes(foe.kind));
  if (entries.length === 0) throw new Error(`Aucune rencontre de « ${foe.kind} » dans la zone « ${foe.zone} »`);
  const rng = Rng.fromSeed(seed);
  let roll = rng.int(1, entries.reduce((n, t) => n + t.weight, 0));
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return encounters.find((e) => e.id === entry.encounter) as EncounterDef;
  }
  return encounters.find((e) => e.id === (entries[0] as { encounter: string }).encounter) as EncounterDef;
}

/* ---------- Niveaux et indicateur de difficulté (GDD §7.5) ---------- */

export function meanEnemyLevel(encounter: EncounterDef): number {
  return encounter.enemies.reduce((n, e) => n + e.level, 0) / encounter.enemies.length;
}

/** Niveau moyen de la compagnie (compagnie d'essai tant que M5-M6 ne sont pas là ; `override` pour le debug). */
export function partyLevel(data: GameData, override?: number): number {
  if (override !== undefined) return override;
  const party = data.encounters.testParty;
  return party.reduce((n, m) => n + m.level, 0) / party.length;
}

/** Compagnie d'essai, au niveau imposé s'il y en a un (debug). */
export function testPartyAt(data: GameData, level?: number): PartyMemberDef[] {
  return data.encounters.testParty.map((m) => (level === undefined ? { ...m } : { ...m, level }));
}

/** Facteur de détection de la compagnie : le plus discret des bonus de classe présents (Chasseur de Serpents de Mer ×0,8). */
export function classDetectionScale(data: GameData): number {
  let scale = 1;
  for (const member of data.encounters.testParty) scale = Math.min(scale, data.balance.foes.classDetection[member.class] ?? 1);
  return scale;
}

export interface Difficulty {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly boss: boolean;
}

export function difficultyOf(foes: FoesBalance, enemyLevel: number, party: number, boss: boolean): Difficulty {
  if (boss) return { id: 'boss', label: foes.bossIndicator.label, color: foes.bossIndicator.color, boss: true };
  const gap = Math.round(enemyLevel - party);
  const band = foes.difficulty.find((b) => b.maxGap === null || gap <= b.maxGap) ?? (foes.difficulty[foes.difficulty.length - 1] as FoesBalance['difficulty'][number]);
  return { id: band.id, label: band.label, color: band.color, boss: false };
}

/** Un ennemi trop faible pour le héros s'enfuit au lieu de combattre (GDD §7.2) — jamais un boss, une embuscade ou un garde. */
export function foeFlees(foes: FoesBalance, foe: WorldFoeDef, enemyLevel: number, party: number): boolean {
  if (foe.kind === 'boss' || foe.kind === 'embuscade' || foe.kind === 'garde') return false;
  return party - enemyLevel >= foes.fleeLevelGap;
}

/* ---------- Fin de combat ---------- */

export interface BattleReport {
  readonly end: BattleEnd;
  readonly encounter: EncounterDef;
  /** Ennemi du monde engagé (null pour un combat de debug). */
  readonly foeId: string | null;
  readonly enemiesDefeated: number;
  /** Le boss de la rencontre est tombé. */
  readonly bossDown: boolean;
  /** Graine du hasard (butin). */
  readonly seed: string;
  /** Objets consommés pendant le combat (jalon M5) : retirés du sac, quelle que soit l'issue. */
  readonly itemsUsed?: readonly { readonly item: string; readonly qty: number }[];
  /** Alliés errants tombés : blessés jusqu'au prochain repos. */
  readonly errantsFallen?: readonly string[];
}

export interface Settlement {
  readonly notices: Notice[];
  /** Défaite : village où la compagnie se réveille (null = point de départ). */
  readonly wakeAt: { readonly location: string | null } | null;
  readonly goldWon: number;
  readonly goldLost: number;
}

/**
 * Applique la fin d'un combat à la partie : victoire (or, butin, drapeaux, ennemi
 * vaincu pour de bon), défaite (perte d'or, retour au dernier village — décision
 * n°56) ou retraite (rien ne change).
 */
export function settleBattle(ctx: GameCtx, report: BattleReport): Settlement {
  const { progress, data } = ctx;
  const notices: Notice[] = [];
  // Ce qui a été bu ou lancé est perdu, même en cas de retraite ou de défaite.
  for (const used of report.itemsUsed ?? []) removeItem(progress, used.item, Math.min(used.qty, countItem(progress, used.item)));
  woundErrants(progress, report.errantsFallen ?? []);
  if (report.end === 'retreat') return { notices, wakeAt: null, goldWon: 0, goldLost: 0 };

  if (report.end === 'defeat') {
    const lost = Math.floor(progress.gold * data.balance.defeat.goldLossRatio);
    if (lost > 0) giveGold(ctx, -lost, notices);
    return { notices, wakeAt: { location: progress.lastVillage ?? data.balance.defeat.fallbackVillage }, goldWon: 0, goldLost: lost };
  }

  const rng = Rng.fromSeed(report.seed);
  const zone = data.zones.find((z) => z.id === report.encounter.zone);
  const foes = data.balance.foes;
  let gold = 0;
  if (zone) {
    for (let i = 0; i < report.enemiesDefeated; i++) gold += rng.int(zone.goldPerEnemy.min, zone.goldPerEnemy.max);
    if (report.bossDown) gold += Math.round(rng.int(zone.goldPerEnemy.min, zone.goldPerEnemy.max) * (foes.bossGoldMultiplier - 1));
  }
  gold += report.encounter.rewards?.gold ?? 0;
  if (gold > 0) giveGold(ctx, gold, notices);

  const regulars = report.enemiesDefeated - (report.bossDown ? 1 : 0);
  for (let i = 0; i < regulars && zone; i++) {
    if (zone.loot.consumables.length > 0 && rng.chance(foes.lootChance.consumable * 100)) giveItem(ctx, rng.pick(zone.loot.consumables), 1, notices);
    else if (zone.loot.equipment.length > 0 && rng.chance(foes.lootChance.equipment * 100)) giveItem(ctx, rng.pick(zone.loot.equipment), 1, notices);
  }
  for (const reward of report.encounter.rewards?.items ?? []) giveItem(ctx, reward.item, reward.qty, notices);

  for (const flag of report.encounter.victoryFlags) if (!ctx.flags.includes(flag)) ctx.flags.push(flag);
  if (report.foeId !== null) progress.foes[report.foeId] = { day: progress.day, clock: progress.clock, visits: progress.zoneVisits };
  return { notices, wakeAt: null, goldWon: gold, goldLost: 0 };
}
