/**
 * Un combat simulé de bout en bout (jalon M10, lot F, décision n°263) : la
 * rencontre est construite comme dans le jeu (carte tirée du monde, déploiement,
 * formation « Auto » de la préparation), puis la compagnie et les ennemis jouent
 * jusqu'à l'issue, avec les vraies règles (formules, renforts, boss, XP).
 *
 * Trois conduites pour la compagnie :
 * - `prudente` : l'IA du joueur attentif (`ai/prudentAi.ts`) ;
 * - `agressive` : l'IA des ennemis par défaut, qui fonce (le banc du lot A) ;
 * - `allie` : l'IA des alliés verts (protège le héros, reste groupée).
 *
 * Module pur, déterministe : même graine, même combat.
 */
import { planAllyAction } from '../ai/allyAi';
import { executePlan, planEnemyAction } from '../ai/enemyAi';
import { executePrudent, nextPrudentPlan } from '../ai/prudentAi';
import type { EncounterDef, PartyMemberDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { endPhase, readyUnits, summarize } from '../tactics/battle';
import { battleRules, buildBattle } from '../tactics/encounter';
import { applyPlan, autoFormation, planFromState } from '../tactics/prep';
import type { TerrainSource } from '../tactics/sampling';
import { isMember } from '../tactics/battleCore';
import type { BattleState, BattleUnit } from '../tactics/types';
import type { Loadout } from '../tactics/units';
import type { Member } from '../units/company';

export type CompanyAi = 'prudente' | 'agressive' | 'allie';

export interface BattleSetup {
  readonly data: GameData;
  readonly encounter: EncounterDef;
  readonly members: readonly Member[];
  readonly loadouts: readonly Loadout[];
  readonly world: TerrainSource;
  readonly seed: string;
  readonly ai: CompanyAi;
  /** Tour au-delà duquel le combat est arrêté (« sans fin »). */
  readonly maxTurns?: number;
  /** Les ennemis ouvrent le combat (embuscade, GDD §7.4). */
  readonly ambush?: boolean;
}

export interface MemberOutcome {
  readonly id: string;
  readonly class: string;
  readonly hero: boolean;
  /** XP gagnée dans ce combat (niveaux gagnés compris, bonus de victoire compris). */
  readonly xp: number;
  readonly fell: boolean;
}

export interface BattleResult {
  readonly encounter: string;
  readonly boss: boolean;
  readonly seed: string;
  readonly outcome: 'victory' | 'defeat' | 'timeout';
  readonly turns: number;
  readonly deployed: number;
  readonly fallen: number;
  readonly heroFell: boolean;
  /** Part des PV de la compagnie déployée qu'il reste à la fin (0 à 1). */
  readonly hpLeft: number;
  readonly enemiesDefeated: number;
  readonly enemiesTotal: number;
  readonly itemsUsed: number;
  readonly members: readonly MemberOutcome[];
}

const memberDefs = (members: readonly Member[]): PartyMemberDef[] => members.map((m) => ({ ...m, wounded: false }) as PartyMemberDef);

/** Construit le combat comme la préparation du jeu : placement par défaut puis « Auto ». */
export function prepareBattle(setup: BattleSetup): { readonly state: BattleState; readonly rules: ReturnType<typeof battleRules> } {
  const { data, encounter, members, loadouts } = setup;
  const rules = battleRules(data);
  const party = memberDefs(members);
  const state = buildBattle(encounter, party, data, { seed: setup.seed, world: setup.world, loadouts, ambush: setup.ambush === true });
  const plan = planFromState(state, setup.ambush === true);
  autoFormation(plan, state, party, data);
  applyPlan(state, plan, party, loadouts, data, rules);
  return { state, rules };
}

/** Joue la phase de la compagnie jusqu'à ce que plus personne ne puisse agir. */
function playCompany(state: BattleState, rules: ReturnType<typeof battleRules>, ai: CompanyAi): void {
  for (let guard = 0; guard < 200 && state.outcome === 'ongoing'; guard++) {
    if (ai === 'prudente') {
      const plan = nextPrudentPlan(state, rules);
      if (!plan) return;
      executePrudent(state, plan, rules);
      continue;
    }
    const unit = readyUnits(state).find((u) => u.hp > 0 && !u.acted);
    if (!unit) return;
    executePlan(state, ai === 'allie' ? planAllyAction(state, unit.id, rules) : planEnemyAction(state, unit.id, rules), rules);
  }
}

/** Joue la phase du camp adverse (ennemis ; alliés verts avec leur propre IA). */
function playOthers(state: BattleState, rules: ReturnType<typeof battleRules>): void {
  for (const unit of readyUnits(state)) {
    if (state.outcome !== 'ongoing') return;
    if (unit.hp <= 0 || unit.acted) continue;
    executePlan(state, unit.team === 'ally' ? planAllyAction(state, unit.id, rules) : planEnemyAction(state, unit.id, rules), rules);
  }
}

/** Joue un combat complet et en rend le bilan. */
export function simulateBattle(setup: BattleSetup): BattleResult {
  const { state, rules } = prepareBattle(setup);
  const maxTurns = setup.maxTurns ?? 40;
  const deployed = state.units.filter(isMember);
  const start = new Map(deployed.map((u) => [u.id, { level: u.level, xp: u.xp ?? 0 }]));
  const hpMax = deployed.reduce((n, u) => n + u.stats.pv, 0);
  const perLevel = setup.data.balance.xp.perLevel;

  while (state.outcome === 'ongoing' && state.turn <= maxTurns) {
    if (state.phase === 'player') playCompany(state, rules, setup.ai);
    else playOthers(state, rules);
    if (state.outcome !== 'ongoing') break;
    endPhase(state, rules);
  }

  const summary = summarize(state);
  const outcome: BattleResult['outcome'] = state.outcome === 'ongoing' ? 'timeout' : state.outcome;
  const memberOutcomes: MemberOutcome[] = deployed.map((u: BattleUnit) => {
    const from = start.get(u.id) as { level: number; xp: number };
    return { id: u.charId ?? u.id, class: u.kindId, hero: u.isHero, xp: (u.level - from.level) * perLevel + (u.xp ?? 0) - from.xp, fell: u.hp <= 0 };
  });
  return {
    encounter: setup.encounter.id,
    boss: setup.encounter.objective.type === 'boss',
    seed: setup.seed,
    outcome,
    turns: state.turn,
    deployed: deployed.length,
    fallen: deployed.filter((u) => u.hp <= 0).length,
    heroFell: deployed.some((u) => u.isHero && u.hp <= 0),
    hpLeft: hpMax > 0 ? deployed.reduce((n, u) => n + Math.max(0, u.hp), 0) / hpMax : 0,
    enemiesDefeated: summary.enemiesDefeated,
    enemiesTotal: summary.enemiesTotal,
    itemsUsed: Object.values(state.itemsUsed).reduce((n, q) => n + q, 0),
    members: memberOutcomes,
  };
}
