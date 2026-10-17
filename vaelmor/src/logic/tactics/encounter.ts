/**
 * Construction d'un combat (module EncounterBuilder, GDD §16.2) : carte,
 * unités alliées déployées, ennemis, objectif, graine du hasard.
 *
 * En attendant l'écran de préparation (jalon M5), la compagnie est déployée
 * automatiquement : les unités prennent les cases de déploiement dans l'ordre,
 * le héros en premier, dans la limite de `maxDeploy`.
 */
import type { GameData } from '../../data/validate';
import type { EncounterDef, PartyMemberDef } from '../../data/schemas';
import { Rng } from '../rng';
import { statsAtLevel } from '../units/stats';
import { parseBattleMap } from './grid';
import type { BattleRules, BattleState, BattleUnit } from './types';

export function battleRules(data: GameData): BattleRules {
  return { combat: data.balance.combat, elements: new Map(data.elements.map((e) => [e.id, e])) };
}

export function findEncounter(data: GameData, id: string): EncounterDef {
  const encounter = data.encounters.encounters.find((e) => e.id === id);
  if (!encounter) throw new Error(`Rencontre inconnue : « ${id} »`);
  return encounter;
}

export interface BattleOptions {
  /** Graine du hasard : la même graine rejoue le même combat. */
  readonly seed: string | number;
  /** Avantage de position (le joueur a surpris l'ennemi, GDD §4.7). */
  readonly initiative?: boolean;
}

function baseUnit(): Pick<BattleUnit, 'moved' | 'acted' | 'moveOrigin' | 'resonance' | 'bogPending' | 'bogged' | 'alerted'> {
  return { moved: false, acted: false, moveOrigin: null, resonance: 0, bogPending: false, bogged: false, alerted: false };
}

export function buildBattle(encounter: EncounterDef, party: readonly PartyMemberDef[], data: GameData, options: BattleOptions): BattleState {
  const map = parseBattleMap(encounter.map, data.encounters.legend, data.terrains);
  const weapons = new Map(data.weapons.map((w) => [w.id, w]));
  const weapon = (id: string) => {
    const w = weapons.get(id);
    if (!w) throw new Error(`Arme inconnue : « ${id} »`);
    return w;
  };

  const units: BattleUnit[] = [];
  const deployed = [...party].sort((a, b) => Number(b.hero) - Number(a.hero)).slice(0, Math.min(encounter.maxDeploy, encounter.deploy.length));
  deployed.forEach((member, i) => {
    const cls = data.classes.find((c) => c.id === member.class);
    if (!cls) throw new Error(`Classe inconnue : « ${member.class} »`);
    const [x, y] = encounter.deploy[i] as [number, number];
    const stats = statsAtLevel(cls.baseStats, cls.growths, member.level);
    units.push({
      id: `p${i}`,
      name: member.name,
      team: 'player',
      kindId: cls.id,
      kindName: cls.name,
      sprite: member.hero ? 'heros' : cls.id,
      level: member.level,
      stats,
      weapon: weapon(cls.startingWeapon),
      element: cls.element,
      armor: cls.armor,
      isHero: member.hero,
      isBoss: false,
      ai: null,
      hp: stats.pv,
      x,
      y,
      ...baseUnit(),
    });
  });

  encounter.enemies.forEach((placed, i) => {
    const def = data.enemies.find((e) => e.id === placed.enemy);
    if (!def) throw new Error(`Ennemi inconnu : « ${placed.enemy} »`);
    const stats = statsAtLevel(def.baseStats, def.growths, placed.level);
    units.push({
      id: `e${i}`,
      name: def.name,
      team: 'enemy',
      kindId: def.id,
      kindName: def.title ?? def.name,
      sprite: def.sprite,
      level: placed.level,
      stats,
      weapon: weapon(def.weapon),
      element: def.element,
      armor: def.armor,
      isHero: false,
      isBoss: placed.boss === true,
      ai: placed.ai ?? def.ai,
      hp: stats.pv,
      x: placed.x,
      y: placed.y,
      ...baseUnit(),
    });
  });

  return {
    encounterId: encounter.id,
    name: encounter.name,
    map,
    units,
    objective: encounter.objective.type,
    victoryFlags: encounter.victoryFlags,
    rng: Rng.fromSeed(options.seed),
    phase: 'player',
    turn: 1,
    outcome: 'ongoing',
    initiative: options.initiative === true,
  };
}
