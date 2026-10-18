/**
 * Construction d'un combat (module EncounterBuilder, GDD §16.2) : carte,
 * cases de déploiement, unités de la compagnie, ennemis, renforts prévus
 * (ennemis aux tours 3 et 6 des cartes de boss, alliés verts), objectif,
 * graine du hasard.
 *
 * Deux sortes de cartes : une carte tirée du monde autour du point de contact
 * (`sampled`, décision n°57 : le combat se joue sur le terrain où il est
 * engagé), ou une carte fixe écrite en texte (scénario).
 *
 * Déploiement (jalon M5) : la carte offre `maxDeploy` + `prep.extraSlots` cases
 * bleues ; la compagnie y est posée par défaut dans l'ordre (héros en premier),
 * puis l'écran de préparation la change (`prep.ts`).
 */
import type { GameData } from '../../data/validate';
import type { EncounterDef, PartyMemberDef } from '../../data/schemas';
import { Rng } from '../rng';
import { parseBattleMap } from './grid';
import { placeUnits, sampleTerrain, type TerrainSource } from './sampling';
import type { AllySource, BattleMap, BattleRules, BattleState, BattleUnit, Cell, Reinforcement } from './types';
import { allyUnit, emptyLoadout, enemyUnit, memberUnit, type Loadout } from './units';

export function battleRules(data: GameData): BattleRules {
  return {
    combat: data.balance.combat,
    elements: new Map(data.elements.map((e) => [e.id, e])),
    statuses: new Map(data.statuses.map((s) => [s.id, s])),
    skills: new Map(data.skills.map((s) => [s.id, s])),
    consumables: new Map(data.consumables.map((c) => [c.id, c])),
    terrains: new Map(data.terrains.map((t) => [t.id, t])),
    enemies: new Map(data.enemies.map((e) => [e.id, e])),
    weapons: new Map(data.weapons.map((w) => [w.id, w])),
    allies: data.balance.allies,
    data,
  };
}

export function findEncounter(data: GameData, id: string): EncounterDef {
  const encounter = data.encounters.encounters.find((e) => e.id === id);
  if (!encounter) throw new Error(`Rencontre inconnue : « ${id} »`);
  return encounter;
}

/** Un allié vert qui rejoindra le combat (GDD §7.8), décidé avant le combat (`logic/game/allyRules.ts`). */
export interface AllyJoin {
  /** Modèle (allies.json › templates). */
  readonly template: string;
  readonly level: number;
  /** Tour d'arrivée (au début de la phase alliée). */
  readonly turn: number;
  /** D'où il vient, en cases du monde (village, errant) ; null : au bord de la carte, côté compagnie. */
  readonly worldCell: Cell | null;
  readonly source: AllySource;
  readonly errantId: string | null;
  /** Bandeau à l'arrivée. */
  readonly label: string;
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
  /** Équipement de chaque membre de la compagnie (même ordre que la compagnie). */
  readonly loadouts?: readonly Loadout[];
  /** Alliés verts attendus. */
  readonly allies?: readonly AllyJoin[];
}

interface Layout {
  readonly map: BattleMap;
  /** Cases bleues (déploiement). */
  readonly slots: readonly Cell[];
  readonly enemies: readonly Cell[];
  /** Zone du monde où se joue le combat (étalonnage, ennemis à venir). */
  readonly zone: string;
  /** Coin de la fenêtre dans le monde (carte tirée du monde) ; null sur une carte fixe. */
  readonly worldOrigin: Cell | null;
}

/** Nombre de cases bleues d'une rencontre (déploiement maximal + cases de choix). */
export function slotCount(encounter: EncounterDef, data: GameData): number {
  return encounter.sampled ? encounter.maxDeploy + data.balance.prep.extraSlots : (encounter.deploy ?? []).length;
}

/** Carte et cases de départ d'une rencontre. */
export function layoutEncounter(encounter: EncounterDef, data: GameData, options: BattleOptions): Layout {
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
    const placement = placeUnits(map, sample.site, encounter.sampled.anchor, slotCount(encounter, data), encounter.enemies, Rng.fromSeed(`${options.seed}:placement`), options.ambush === true);
    const zoneValue = options.world.zone(site.x, site.y);
    const zone = data.zones.find((z) => z.value === zoneValue)?.id ?? encounter.zone;
    return { map, slots: placement.deploy, enemies: placement.enemies, zone, worldOrigin: sample.origin };
  }
  const map = parseBattleMap(encounter.map ?? [], data.encounters.legend, data.terrains);
  const slots = (encounter.deploy ?? []).map(([x, y]) => ({ x, y }));
  const enemies = encounter.enemies.map((e) => ({ x: e.x ?? 0, y: e.y ?? 0 }));
  return { map, slots, enemies, zone: encounter.zone, worldOrigin: null };
}

/** Ordre de déploiement par défaut : le héros d'abord, puis la compagnie dans l'ordre. */
export function defaultDeployOrder(party: readonly PartyMemberDef[]): number[] {
  const order = party.map((_, i) => i);
  return order.sort((a, b) => Number(party[b]?.hero) - Number(party[a]?.hero) || a - b);
}

/** Point du bord de la carte le plus proche de `p`. */
export function borderPoint(map: BattleMap, p: Cell): Cell {
  const x = Math.max(0, Math.min(map.width - 1, Math.round(p.x)));
  const y = Math.max(0, Math.min(map.height - 1, Math.round(p.y)));
  const dl = x;
  const dr = map.width - 1 - x;
  const dt = y;
  const db = map.height - 1 - y;
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return { x: 0, y };
  if (m === dr) return { x: map.width - 1, y };
  if (m === dt) return { x, y: 0 };
  return { x, y: map.height - 1 };
}

const centroid = (cells: readonly Cell[]): Cell =>
  cells.length === 0 ? { x: 0, y: 0 } : { x: cells.reduce((n, c) => n + c.x, 0) / cells.length, y: cells.reduce((n, c) => n + c.y, 0) / cells.length };

export function buildBattle(base: EncounterDef, party: readonly PartyMemberDef[], data: GameData, options: BattleOptions): BattleState {
  const encounter: EncounterDef = options.extraEnemies && options.extraEnemies.length > 0 ? { ...base, enemies: [...base.enemies, ...options.extraEnemies] } : base;
  const rules = battleRules(data);
  const layout = layoutEncounter(encounter, data, options);
  const map = layout.map;
  const maxDeploy = Math.min(encounter.maxDeploy, layout.slots.length);

  const units: BattleUnit[] = [];
  defaultDeployOrder(party)
    .slice(0, maxDeploy)
    .forEach((memberIndex, i) => {
      const member = party[memberIndex] as PartyMemberDef;
      const slot = layout.slots[i] as Cell;
      units.push(memberUnit(data, rules, member, options.loadouts?.[memberIndex] ?? emptyLoadout(), `p${i}`, memberIndex, slot.x, slot.y));
    });

  encounter.enemies.forEach((placed, i) => {
    const cell = layout.enemies[i] as Cell;
    units.push(enemyUnit(data, rules, placed, `e${i}`, cell.x, cell.y));
  });

  // Renforts ennemis : au bord de la carte, du côté du boss (ou des ennemis).
  const boss = units.find((u) => u.isBoss);
  const enemyHome = boss ? { x: boss.x, y: boss.y } : centroid(layout.enemies);
  const playerHome = centroid(layout.slots);
  let nextId = 0;
  const reinforcements: Reinforcement[] = [];
  for (const wave of encounter.reinforcements ?? []) {
    reinforcements.push({
      turn: wave.turn,
      team: 'enemy',
      units: wave.enemies.map((e) => enemyUnit(data, rules, e, `r${nextId++}`, -1, -1)),
      entry: borderPoint(map, enemyHome),
      label: 'Renforts ennemis !',
    });
  }
  // Alliés verts : depuis leur village ou leur position dans le monde, sinon au bord côté compagnie.
  for (const join of options.allies ?? []) {
    const template = data.allyTemplates.find((t) => t.id === join.template);
    if (!template) throw new Error(`Modèle d'allié inconnu : « ${join.template} »`);
    const origin = layout.worldOrigin;
    const local = join.worldCell && origin ? { x: join.worldCell.x - origin.x, y: join.worldCell.y - origin.y } : null;
    const inside = local !== null && local.x >= 0 && local.y >= 0 && local.x < map.width && local.y < map.height;
    reinforcements.push({
      turn: join.turn,
      team: 'ally',
      units: [allyUnit(data, rules, template, join.level, join.source, join.errantId, `a${nextId++}`)],
      entry: local && inside ? local : borderPoint(map, local ?? playerHome),
      label: join.label,
    });
  }

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
    deploySlots: layout.slots,
    maxDeploy,
    reinforcements,
    overlays: [],
    itemsUsed: {},
    nextId,
  };
}
