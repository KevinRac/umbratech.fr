/**
 * Construction d'un combat (module EncounterBuilder, GDD §16.2) : carte,
 * unités alliées déployées, ennemis, objectif, graine du hasard.
 *
 * Deux sortes de cartes : une carte tirée du monde autour du point de contact
 * (`sampled`, décision n°57 : le combat se joue sur le terrain où il est
 * engagé), ou une carte fixe écrite en texte (scénario).
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
import { placeUnits, sampleTerrain, type TerrainSource } from './sampling';
import type { BattleMap, BattleRules, BattleState, BattleUnit, Cell } from './types';

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
  /** Le monde, pour une carte tirée du terrain (`sampled`). */
  readonly world?: TerrainSource;
  /** Point de contact dans le monde (remplace le `site` par défaut de la rencontre). */
  readonly site?: Cell;
  /** Embuscade subie (GDD §7.4) : les ennemis démarrent tout près et ouvrent le combat par leur phase. */
  readonly ambush?: boolean;
  /** Renforts appelés par une vigie (GDD §7.2) : ajoutés aux ennemis de la rencontre. */
  readonly extraEnemies?: readonly { readonly enemy: string; readonly level: number }[];
}

interface Layout {
  readonly map: BattleMap;
  readonly deploy: readonly Cell[];
  readonly enemies: readonly Cell[];
  /** Zone du monde où se joue le combat (étalonnage, ennemis à venir). */
  readonly zone: string;
  /** Coin de la fenêtre dans le monde (carte tirée du monde) ; null sur une carte fixe. */
  readonly worldOrigin: Cell | null;
}

/** Carte et cases de départ d'une rencontre. */
export function layoutEncounter(encounter: EncounterDef, partySize: number, data: GameData, options: BattleOptions): Layout {
  const count = Math.min(encounter.maxDeploy, partySize);
  if (encounter.sampled) {
    if (!options.world) throw new Error(`La rencontre « ${encounter.id} » se joue sur le terrain du monde : la carte du monde est nécessaire.`);
    const [sx, sy] = encounter.sampled.site;
    const site = options.site ?? { x: sx, y: sy };
    const sample = sampleTerrain(options.world, site, encounter.sampled, data.terrains);
    const byId = new Map(data.terrains.map((t) => [t.id, t]));
    const map: BattleMap = {
      width: sample.rows[0]?.length ?? 0,
      height: sample.rows.length,
      terrains: sample.rows.flatMap((row) =>
        row.map((id) => {
          const t = byId.get(id);
          if (!t) throw new Error(`Terrain inconnu tiré du monde : « ${id} »`);
          return t;
        }),
      ),
    };
    const placement = placeUnits(map, sample.site, encounter.sampled.anchor, count, encounter.enemies, Rng.fromSeed(`${options.seed}:placement`), options.ambush === true);
    const zoneValue = options.world.zone(site.x, site.y);
    const zone = data.zones.find((z) => z.value === zoneValue)?.id ?? encounter.zone;
    return { map, deploy: placement.deploy, enemies: placement.enemies, zone, worldOrigin: sample.origin };
  }
  const map = parseBattleMap(encounter.map ?? [], data.encounters.legend, data.terrains);
  const deploy = (encounter.deploy ?? []).slice(0, count).map(([x, y]) => ({ x, y }));
  const enemies = encounter.enemies.map((e) => ({ x: e.x ?? 0, y: e.y ?? 0 }));
  return { map, deploy, enemies, zone: encounter.zone, worldOrigin: null };
}

function baseUnit(): Pick<BattleUnit, 'moved' | 'acted' | 'moveOrigin' | 'resonance' | 'bogPending' | 'bogged' | 'alerted'> {
  return { moved: false, acted: false, moveOrigin: null, resonance: 0, bogPending: false, bogged: false, alerted: false };
}

export function buildBattle(base: EncounterDef, party: readonly PartyMemberDef[], data: GameData, options: BattleOptions): BattleState {
  const encounter: EncounterDef = options.extraEnemies && options.extraEnemies.length > 0 ? { ...base, enemies: [...base.enemies, ...options.extraEnemies] } : base;
  const layout = layoutEncounter(encounter, party.length, data, options);
  const map = layout.map;
  const weapons = new Map(data.weapons.map((w) => [w.id, w]));
  const weapon = (id: string) => {
    const w = weapons.get(id);
    if (!w) throw new Error(`Arme inconnue : « ${id} »`);
    return w;
  };

  const units: BattleUnit[] = [];
  const deployed = [...party].sort((a, b) => Number(b.hero) - Number(a.hero)).slice(0, layout.deploy.length);
  deployed.forEach((member, i) => {
    const cls = data.classes.find((c) => c.id === member.class);
    if (!cls) throw new Error(`Classe inconnue : « ${member.class} »`);
    const { x, y } = layout.deploy[i] as Cell;
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
      x: (layout.enemies[i] as Cell).x,
      y: (layout.enemies[i] as Cell).y,
      ...baseUnit(),
    });
  });

  return {
    encounterId: encounter.id,
    name: encounter.name,
    zone: layout.zone,
    worldOrigin: layout.worldOrigin,
    map,
    units,
    objective: encounter.objective.type,
    victoryFlags: encounter.victoryFlags,
    rng: Rng.fromSeed(options.seed),
    phase: options.ambush === true ? 'enemy' : 'player',
    turn: 1,
    outcome: 'ongoing',
    initiative: options.initiative === true && options.ambush !== true,
    ambush: options.ambush === true,
  };
}
