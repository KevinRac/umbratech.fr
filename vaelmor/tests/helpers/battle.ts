/**
 * Combats de test : cartes en texte (légende de encounters.json) et unités
 * posées à la main, avec les vraies données du jeu.
 *   .  plaine   =  route   f  forêt   m  montagne   ~  rivière   g  gué
 *   #  pont     r  ruines  v  village s  plage      ,  marais    w  eau profonde
 */
import { loadGameData } from '../../src/data';
import type { EncounterDef, PartyMemberDef } from '../../src/data/schemas';
import { battleRules, buildBattle } from '../../src/logic/tactics/encounter';
import { getUnit } from '../../src/logic/tactics/grid';
import type { BattleRules, BattleState, BattleUnit } from '../../src/logic/tactics/types';

export interface TestAlly {
  readonly class: string;
  readonly level?: number;
  readonly at: readonly [number, number];
  readonly hero?: boolean;
  readonly name?: string;
}

export interface TestEnemy {
  readonly enemy: string;
  readonly level?: number;
  readonly at: readonly [number, number];
  readonly boss?: boolean;
  readonly ai?: EncounterDef['enemies'][number]['ai'];
}

export function rules(): BattleRules {
  return battleRules(loadGameData());
}

/** Combat de test. Les alliés reçoivent les identifiants p0, p1… et les ennemis e0, e1… dans l'ordre donné (le héros reste là où on le met). */
export function makeBattle(
  map: readonly string[],
  allies: readonly TestAlly[],
  enemies: readonly TestEnemy[],
  options: { objective?: 'rout' | 'boss'; seed?: string; initiative?: boolean } = {},
): BattleState {
  const hasHero = allies.some((a) => a.hero);
  const party: PartyMemberDef[] = allies.map((a, i) => ({
    name: a.name ?? `Allié ${i}`,
    class: a.class,
    level: a.level ?? 1,
    hero: a.hero ?? (!hasHero && i === 0),
  }));
  const encounter: EncounterDef = {
    id: 'test',
    name: 'Combat de test',
    zone: 'z1',
    objective: { type: options.objective ?? 'rout' },
    map: [...map],
    // Placement provisoire : le constructeur range le héros en tête, on repose chaque allié ensuite.
    deploy: allies.map((_, i) => [i, 0] as [number, number]),
    maxDeploy: allies.length,
    enemies: enemies.map((e) => ({ enemy: e.enemy, level: e.level ?? 1, x: e.at[0], y: e.at[1], ...(e.boss ? { boss: true } : {}), ...(e.ai ? { ai: e.ai } : {}) })),
    victoryFlags: options.objective === 'boss' ? ['boss_test'] : [],
  };
  const state = buildBattle(encounter, party, loadGameData(), { seed: options.seed ?? 'test', initiative: options.initiative ?? false });
  // Le constructeur trie le héros en tête : on retrouve chaque allié par son nom pour le poser.
  const players = state.units.filter((u) => u.team === 'player');
  allies.forEach((a, i) => {
    const unit = players.find((u) => u.name === party[i]?.name) as BattleUnit;
    Object.assign(unit, { x: a.at[0], y: a.at[1] });
  });
  // Identifiants stables dans l'ordre donné par le test.
  allies.forEach((_, i) => Object.assign(players.find((u) => u.name === party[i]?.name) as BattleUnit, { id: `p${i}` }));
  return state;
}

export const unit = (state: BattleState, id: string): BattleUnit => getUnit(state, id);

/** Rangée de plaine de la largeur voulue. */
export const plains = (width: number, height: number): string[] => Array.from({ length: height }, () => '.'.repeat(width));
