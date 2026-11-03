/**
 * Ennemis nommés côté partie (GDD §7.9) : apparition au hasard dans un combat
 * ordinaire (n°115, n°185, n°186), contexte des scènes au lancement d'un
 * combat, report de leur bilan sur la partie (n°182, n°183, n°189).
 *
 * Module pur : ni DOM ni Phaser.
 */
import type { EncounterDef } from '../../data/schemas';
import type { NamedEnemyDef } from '../../data/talkSchemas';
import type { GameData } from '../../data/validate';
import type { Rng } from '../rng';
import { evalCondition, type TalkContext, type TalkResults } from '../tactics/talk';
import type { BattleUnit } from '../tactics/types';
import { createMember, type Member } from '../units/company';
import type { Progress } from './progress';

/** Ce que les scènes savent de la partie au lancement d'un combat. */
export function talkContextOf(progress: Progress, flags: readonly string[]): TalkContext {
  return {
    quests: { ...progress.quests },
    flags: [...flags],
    company: progress.company.map((m) => m.id),
    reputation: { ...progress.reputation },
    gold: progress.gold,
    seen: [...progress.scenesSeen],
    named: { ...progress.named },
  };
}

/** Personnages liés à un nommé : ceux de ses scènes et ses interlocuteurs. */
export function linkedUnits(data: GameData, named: NamedEnemyDef): Set<string> {
  const ids = new Set<string>(named.recruit?.talkers ?? []);
  for (const s of data.scenes) if (s.enemy === named.id) for (const u of s.units) ids.add(u);
  return ids;
}

/**
 * La condition d'apparition `pop` d'un nommé tient-elle dans la partie ? Vaut
 * pour le tirage au hasard (n°115) comme pour son poste dans le monde (n°193) :
 * un Écho de quête n'est visible qu'une fois sa quête terminée. `pop: false`
 * (jamais au hasard) ne ferme pas le poste.
 */
export function namedPopHolds(data: GameData, progress: Progress, flags: readonly string[], named: NamedEnemyDef): boolean {
  if (named.pop === false || named.pop === undefined) return true;
  const ctx = talkContextOf(progress, flags);
  const env = { ctx, data, turn: 1, gold: progress.gold, deployed: () => false, seen: (id: string) => ctx.seen.includes(id) };
  return evalCondition(named.pop, env);
}

/** Une rencontre peut-elle accueillir un nommé de passage (ni boss, ni carte de scénario, ni milice) ? */
export function namedPopAllowed(data: GameData, encounter: EncounterDef): boolean {
  return encounter.objective.type !== 'boss' && encounter.sampled !== undefined && !data.balance.namedPop.excludeEncounters.includes(encounter.id);
}

export interface NamedPopInput {
  readonly data: GameData;
  readonly progress: Progress;
  readonly flags: readonly string[];
  readonly encounter: EncounterDef;
  /** Zone où se joue le combat (zones.json). */
  readonly zone: string;
  /** Membres du dernier déploiement (n°185), ou null. */
  readonly lastDeployed: readonly string[] | null;
  readonly rng: Rng;
}

export interface NamedPop {
  readonly enemy: string;
  readonly level: number;
}

/** Nommés qui pourraient surgir dans ce combat, avec leur poids (n°115, n°185). */
export function namedCandidates(input: Omit<NamedPopInput, 'rng'>): { readonly named: NamedEnemyDef; readonly weight: number }[] {
  const { data, progress } = input;
  const zones = data.zones.map((z) => z.id);
  const here = zones.indexOf(input.zone);
  const near = (zone: string): boolean => here >= 0 && Math.abs(zones.indexOf(zone) - here) <= 1;
  const ctx = talkContextOf(progress, input.flags);
  const roster = new Set(progress.company.map((m) => m.id));
  const deployed = new Set(input.lastDeployed ?? []);
  const out: { named: NamedEnemyDef; weight: number }[] = [];
  for (const named of data.named) {
    if (named.pop === false || progress.named[named.id] !== undefined || !near(named.zone)) continue;
    const env = { ctx, data, turn: 1, gold: progress.gold, deployed: (id: string) => deployed.has(id), seen: (id: string) => ctx.seen.includes(id) };
    if (!evalCondition(named.pop, env)) continue;
    const linked = linkedUnits(data, named);
    if (![...linked].some((id) => roster.has(id))) continue;
    out.push({ named, weight: [...linked].some((id) => deployed.has(id)) ? data.balance.namedPop.deployedWeight : 1 });
  }
  return out;
}

/** Chance (%) d'apparition au prochain combat ordinaire. */
export function namedPopChance(data: GameData, pity: number): number {
  const b = data.balance.namedPop;
  return Math.min(b.cap, b.base + b.step * pity);
}

/**
 * Tirage au lancement d'un combat ordinaire (n°115) : un nommé surgit avec la
 * chance du moment ; sinon le compteur anti-malchance avance. Rien n'est tiré
 * (et le compteur ne bouge pas) si la rencontre ne s'y prête pas ou si aucun
 * nommé ne peut venir. Modifie `progress.namedPity`.
 */
export function rollNamedPop(input: NamedPopInput): NamedPop | null {
  const { data, progress, encounter, rng } = input;
  if (!namedPopAllowed(data, encounter)) return null;
  const candidates = namedCandidates(input);
  if (candidates.length === 0) return null;
  if (rng.next() * 100 >= namedPopChance(data, progress.namedPity)) {
    progress.namedPity += 1;
    return null;
  }
  progress.namedPity = 0;
  let roll = rng.next() * candidates.reduce((n, c) => n + c.weight, 0);
  let chosen = candidates[candidates.length - 1] as (typeof candidates)[number];
  for (const c of candidates) {
    roll -= c.weight;
    if (roll < 0) {
      chosen = c;
      break;
    }
  }
  const top = Math.max(...encounter.enemies.map((e) => e.level));
  return { enemy: chosen.named.id, level: Math.min(30, top + data.balance.namedPop.levelBonus) };
}

/**
 * Reporte le bilan des dialogues d'un combat sur la partie (n°182, n°183, n°189) :
 * scènes vues, sort des nommés, recrues ajoutées à la compagnie (blessées si
 * elles sont tombées après avoir rejoint ; perdues en mode Classique), rançons
 * payées. Renvoie les noms des recrues arrivées et des recrues perdues.
 */
export function applyTalkResults(data: GameData, progress: Progress, results: TalkResults, units: readonly BattleUnit[]): { joined: string[]; lost: string[] } {
  for (const id of results.seen) if (!progress.scenesSeen.includes(id)) progress.scenesSeen.push(id);
  for (const [id, status] of Object.entries(results.named)) progress.named[id] = status;
  const joined: string[] = [];
  const lost: string[] = [];
  for (const r of results.recruits) {
    const def = data.named.find((n) => n.id === r.charId);
    const unit = units.find((u) => u.id === r.unitId);
    if (!def?.recruit || !unit) continue;
    if (unit.hp <= 0 && progress.mode === 'classique') {
      progress.named[r.charId] = 'lost';
      lost.push(def.name);
      continue;
    }
    if (progress.company.some((m) => m.id === def.id) || progress.fallen.includes(def.id)) continue;
    // Compagnie au complet (n°199) : il reste recruté (hors de la compagnie), sans rançon.
    if (progress.company.length >= data.balance.levels.rosterMax) continue;
    progress.gold = Math.max(0, progress.gold - r.ransom);
    // Il arrive tel qu'il a fini le combat : niveau de sa fiche, plus ce qu'il a gagné depuis (n°181).
    const member = createMember(data, { id: def.id, name: def.name, class: def.recruit.asClass, level: def.recruit.level });
    const stats: Record<string, number> = { ...member.stats };
    for (const [k, v] of Object.entries(unit.gains)) stats[k] = (stats[k] ?? 0) + (v ?? 0);
    member.stats = stats as Member['stats'];
    member.level = unit.level;
    member.xp = unit.xp ?? 0;
    if (unit.hp <= 0) member.woundedDay = progress.day;
    progress.company.push(member);
    if (!progress.recruited.includes(def.id)) progress.recruited.push(def.id);
    joined.push(def.name);
  }
  return { joined, lost };
}
