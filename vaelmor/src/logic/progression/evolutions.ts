/**
 * Évolutions de classe (GDD §10.1, jalon M6, décisions n°140 à n°144). Module pur.
 *
 * - Un membre évolue au niveau 10 ou plus, avec un Sceau de Maîtrise dans le
 *   sac et la condition de sa branche remplie (`classes.json › evolutions ›
 *   requires` : compteurs gardés sur le membre, quête terminée, palier de
 *   réputation, lieux découverts). Le niveau ne repart pas à 1 ; le plafond
 *   passe à 30, les stats reçoivent le bonus de la branche, les croissances
 *   s'ajoutent à celles de la classe de base. La lignée (classe de base) garde
 *   ses mécaniques, sa compétence signature et ses passives.
 * - Les compteurs sont tenus pendant le combat (`tallyEvents`, sur
 *   `unit.tally`) puis reportés sur le membre à la fin (`applyBattleCounters`).
 */
import type { ClassDef, EvolutionCondition, GrowthBlock } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { tierRank, tierIdOf, type Progress } from '../game/progress';
import type { TierId } from '../../data/townSchemas';
import type { BattleEvent, BattleRules, BattleState, BattleUnit, GrowthKey } from '../tactics/types';
import { hostile } from '../tactics/types';
import type { Member } from '../units/company';
import { oathKept } from './traits';

export type EvolutionDef = ClassDef['evolutions'][number];

export const SEAL_ITEM = 'sceau_de_maitrise';

/** Classe de base et fiche d'une évolution. */
export function findEvolution(data: GameData, id: string): { readonly cls: ClassDef; readonly evo: EvolutionDef } | null {
  for (const cls of data.classes) {
    const evo = cls.evolutions.find((e) => e.id === id);
    if (evo) return { cls, evo };
  }
  return null;
}

/** Croissances d'une unité évoluée : celles de la classe de base plus le bonus de la branche. */
export function evolvedGrowths(cls: ClassDef, evo: EvolutionDef | null): GrowthBlock {
  if (!evo) return cls.growths;
  const g: Record<GrowthKey, number> = { ...cls.growths };
  for (const [k, v] of Object.entries(evo.growthBonus) as [GrowthKey, number][]) g[k] += v;
  return g;
}

/** Ce qu'il faut savoir du monde pour vérifier une condition. */
export interface EvolutionWorld {
  readonly data: GameData;
  readonly progress: Progress;
  readonly discovered: readonly string[];
}

/** Une condition est-elle remplie ? Renvoie aussi l'avancement à montrer (« 3/5 »). */
export function conditionProgress(world: EvolutionWorld, member: Member, c: EvolutionCondition): { readonly done: boolean; readonly text: string | null } {
  switch (c.kind) {
    case 'counter': {
      const have = Math.min(c.min, member.counters[c.id] ?? 0);
      return { done: have >= c.min, text: c.min > 1 ? `${have}/${c.min}` : null };
    }
    case 'quest':
      return { done: world.progress.quests[c.id] === 'done', text: null };
    case 'rep': {
      const value = world.progress.reputation[c.target] ?? 0;
      return { done: tierRank(tierIdOf(value, world.data.reputation)) >= tierRank(c.tier as TierId), text: null };
    }
    case 'visit': {
      const seen = c.locations.filter((l) => world.discovered.includes(l)).length;
      return { done: seen >= c.min, text: c.min > 1 ? `${Math.min(seen, c.min)}/${c.min}` : null };
    }
  }
}

/** La branche est-elle ouverte (une des alternatives entièrement remplie) ? Avancement de la meilleure alternative. */
export function branchProgress(world: EvolutionWorld, member: Member, evo: EvolutionDef): { readonly met: boolean; readonly progress: string | null } {
  let best: { met: boolean; progress: string | null; score: number } = { met: false, progress: null, score: -1 };
  for (const alt of evo.requires) {
    const parts = alt.map((c) => conditionProgress(world, member, c));
    const met = parts.every((p) => p.done);
    const score = parts.filter((p) => p.done).length / parts.length;
    if (met) return { met: true, progress: null };
    if (score > best.score) best = { met, progress: parts.map((p) => p.text).filter((t): t is string => t !== null).join(' · ') || null, score };
  }
  return { met: best.met, progress: best.progress };
}

export interface EvolutionChoice {
  readonly evo: EvolutionDef;
  /** Condition de branche remplie. */
  readonly met: boolean;
  readonly progress: string | null;
  /** Tout est réuni : niveau, Sceau, condition. */
  readonly ready: boolean;
}

/** Les deux branches d'un membre, et ce qui manque. Vide pour un membre déjà évolué. */
export function evolutionChoices(world: EvolutionWorld, member: Member): { readonly choices: readonly EvolutionChoice[]; readonly blocker: string | null } {
  const cls = world.data.classes.find((c) => c.id === member.class);
  if (!cls || member.evolution) return { choices: [], blocker: member.evolution ? 'Déjà évolué' : null };
  const minLevel = world.data.balance.levels.promotionMinLevel;
  const seal = world.progress.inventory.some((s) => s.item === SEAL_ITEM && s.qty > 0);
  const blocker = member.level < minLevel ? `Niveau ${minLevel} requis` : !seal ? 'Il faut un Sceau de Maîtrise' : null;
  const choices = cls.evolutions.map((evo) => {
    const b = branchProgress(world, member, evo);
    return { evo, met: b.met, progress: b.progress, ready: blocker === null && b.met };
  });
  return { choices, blocker };
}

/**
 * Fait évoluer un membre (le Sceau est consommé). Renvoie un message d'erreur
 * si l'évolution n'est pas possible, sinon null.
 */
export function evolveMember(world: EvolutionWorld, member: Member, evoId: string): string | null {
  const { choices, blocker } = evolutionChoices(world, member);
  if (blocker) return blocker;
  const choice = choices.find((c) => c.evo.id === evoId);
  if (!choice) return 'Évolution inconnue pour cette classe';
  if (!choice.met) return 'La condition de cette branche n’est pas remplie';
  const stack = world.progress.inventory.find((s) => s.item === SEAL_ITEM && s.qty > 0);
  if (!stack) return 'Il faut un Sceau de Maîtrise';
  stack.qty -= 1;
  if (stack.qty === 0) world.progress.inventory.splice(world.progress.inventory.indexOf(stack), 1);
  const stats: Record<string, number> = { ...member.stats };
  for (const [k, v] of Object.entries(choice.evo.bonus)) stats[k] = Math.max(k === 'mob' ? 1 : 0, (stats[k] ?? 0) + (v ?? 0));
  member.stats = stats as Member['stats'];
  member.evolution = choice.evo.id;
  member.levelCap = world.data.balance.levels.advancedClassCap;
  return null;
}

/* ---------- Compteurs (pendant le combat) ---------- */

const bump = (unit: BattleUnit | undefined, key: string, by = 1): void => {
  if (!unit || unit.team !== 'player' || unit.memberIndex === null) return;
  unit.tally[key] = (unit.tally[key] ?? 0) + by;
};

/**
 * Compte, pour les évolutions, ce que font les membres pendant une commande :
 * ennemis abattus (à 3 cases ou plus, armures lourdes, par zone), doubles
 * attaques, brûlures et gels posés, PV soignés, invocations, dégâts des ronces,
 * cases d'eau parcourues, ennemis abattus après un serment brisé.
 */
export function tallyEvents(state: BattleState, events: readonly BattleEvent[]): void {
  const find = (id: string): BattleUnit | undefined => state.units.find((u) => u.id === id);
  const killed = (killer: BattleUnit | undefined, victim: BattleUnit | undefined): void => {
    if (!killer || !victim || !hostile(killer.team, victim.team)) return;
    const owner = killer.ownerId ? find(killer.ownerId) : killer;
    bump(owner, `killsZone:${state.zone}`);
    if (victim.armor === 'lourde') bump(owner, 'heavyKills');
    if (owner?.oath?.broken) bump(owner, 'killsAfterBreak');
  };
  for (const event of events) {
    switch (event.type) {
      case 'move': {
        const unit = find(event.unitId);
        for (const c of event.path.slice(1)) {
          const t = state.map.terrains[c.y * state.map.width + c.x];
          if (t && (t.tags.includes('eau') || t.tags.includes('enlise'))) bump(unit, 'waterSteps');
        }
        break;
      }
      case 'combat': {
        const attacker = find(event.attackerId);
        const own = event.strikes.filter((s) => s.attackerId === event.attackerId && !s.counter).length;
        if (own >= 2) bump(attacker, 'doubles');
        for (const s of event.strikes) {
          if (!s.hit || s.targetHp > 0) continue;
          const striker = find(s.attackerId);
          const victim = find(s.targetId);
          killed(striker, victim);
          if (striker && victim && Math.abs(striker.x - victim.x) + Math.abs(striker.y - victim.y) >= 3) bump(striker, 'longKills');
        }
        break;
      }
      case 'effects': {
        const source = find(event.sourceId);
        for (const r of event.results) {
          const target = find(r.unitId);
          if (r.status === 'brulure' && target && source && hostile(source.team, target.team)) bump(source, 'burns');
          if (r.status === 'gel' && target && source && hostile(source.team, target.team)) bump(source, 'freezes');
          if ((r.heal ?? 0) > 0) bump(source, 'healed', r.heal);
          if ((r.damage ?? 0) > 0 && r.hp <= 0) killed(source, target);
        }
        break;
      }
      case 'heal':
        if (event.sourceId) bump(find(event.sourceId), 'healed', event.amount);
        break;
      case 'summon':
        bump(find(event.sourceId), 'summons');
        break;
      case 'thorns': {
        const source = find(event.sourceId);
        bump(source, 'thornDamage', event.damage);
        if (event.hp <= 0) killed(source, find(event.unitId));
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Reporte les compteurs du combat sur les membres, plus ce qui se juge à la
 * fin : serment tenu, boss vaincus (membres déployés), embuscade vaincue en
 * forme, boss vaincu à moins de 5 PV, trois ennemis abattus après un serment brisé.
 */
export function applyBattleCounters(company: Member[], state: BattleState, rules: BattleRules): void {
  const victory = state.outcome === 'victory';
  const bosses = state.units.filter((u) => u.team === 'enemy' && u.isBoss && u.hp <= 0);
  for (const unit of state.units) {
    if (unit.team !== 'player' || unit.memberIndex === null || unit.summonUntil !== null) continue;
    const member = company[unit.memberIndex];
    if (!member) continue;
    const add = (key: string, by = 1): void => {
      member.counters[key] = (member.counters[key] ?? 0) + by;
    };
    for (const [key, value] of Object.entries(unit.tally)) if (key !== 'killsAfterBreak' && key !== 'rally' && key !== 'angel') add(key, value);
    if (unit.oath?.broken && (unit.tally['killsAfterBreak'] ?? 0) >= 3) add('brokenOathTriple');
    if (!victory) continue;
    if (oathKept(state, unit, rules)) add('oathsKept');
    if (bosses.length > 0) {
      add('bossWins', bosses.length);
      for (const b of bosses) add(`boss:${b.kindId}`);
      if (unit.hp > 0 && unit.hp < 5) add('bossWinLowHp');
    }
    if (state.wasAmbush && unit.hp * 2 >= unit.stats.pv) add('ambushWinsHealthy');
  }
}
