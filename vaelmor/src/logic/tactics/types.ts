/**
 * Types du combat tactique (GDD §9). Module pur : ni DOM ni Phaser.
 *
 * L'état d'un combat (`BattleState`) est modifié en place par les commandes de
 * `battle.ts` ; chaque commande renvoie la liste des événements produits
 * (déplacement, échange de coups, unité vaincue…), que le rendu rejoue sous
 * forme d'animations. Tout le hasard passe par le `Rng` de l'état : un combat
 * est rejouable à l'identique depuis sa graine.
 */
import type { AiProfile, ArmorKind, BalanceConfig, ElementDef, StatBlock, TerrainDef, WeaponDef } from '../../data/schemas';
import type { Rng } from '../rng';

export type Team = 'player' | 'enemy';

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface BattleMap {
  readonly width: number;
  readonly height: number;
  /** Terrain de chaque case, rangée par rangée. */
  readonly terrains: readonly TerrainDef[];
}

export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly team: Team;
  /** Classe (alliés) ou type d'ennemi. */
  readonly kindId: string;
  /** Nom de la classe ou du type d'ennemi (« Gardien des Marées », « Écumeur »). */
  readonly kindName: string;
  /** Apparence (render/unitLooks.ts). */
  readonly sprite: string;
  readonly level: number;
  readonly stats: StatBlock;
  readonly weapon: WeaponDef;
  /** Élément de l'unité : défensif dans le triangle (décision n°51). */
  readonly element: string | null;
  readonly armor: ArmorKind;
  /** Le héros : sa chute est une défaite (GDD §9.10). */
  readonly isHero: boolean;
  readonly isBoss: boolean;
  /** Profil d'IA (ennemis seulement). */
  readonly ai: AiProfile | null;

  hp: number;
  x: number;
  y: number;
  /** A déjà bougé pendant cette phase. */
  moved: boolean;
  /** A fini son tour (attaque ou attente). */
  acted: boolean;
  /** Case de départ du déplacement en cours, pour « Annuler le déplacement » (GDD §9.4). */
  moveOrigin: Cell | null;
  /** Jauge de Résonance (GDD §9.9), 0 à `combat.resonance.max`. */
  resonance: number;
  /** Fin de tour dans un marais : enlisé à la prochaine phase de son camp (−1 Mob, GDD §3.5). */
  bogPending: boolean;
  bogged: boolean;
  /** Un ennemi « défensif » réveillé (il a frappé ou été frappé) se comporte ensuite en agressif. */
  alerted: boolean;
}

export type Objective = 'rout' | 'boss';
export type Outcome = 'ongoing' | 'victory' | 'defeat';

export interface BattleState {
  readonly encounterId: string;
  readonly name: string;
  /** Zone du monde où se joue le combat (zones.json). */
  readonly zone: string;
  /** Coin de la carte de combat dans le monde (carte tirée du monde), sinon null. */
  readonly worldOrigin: Cell | null;
  readonly map: BattleMap;
  readonly units: BattleUnit[];
  readonly objective: Objective;
  readonly victoryFlags: readonly string[];
  readonly rng: Rng;
  phase: Team;
  /** Numéro du tour (1 au départ) ; un tour = une phase joueur puis une phase ennemie. */
  turn: number;
  outcome: Outcome;
  /** Avantage de position (GDD §4.7) : la première phase ennemie est sautée. */
  initiative: boolean;
}

/** Règles chiffrées du combat, tirées des données (balance.json, elements.json). */
export interface BattleRules {
  readonly combat: BalanceConfig['combat'];
  readonly elements: ReadonlyMap<string, ElementDef>;
}

/** Un coup porté pendant un échange. */
export interface Strike {
  readonly attackerId: string;
  readonly targetId: string;
  /** Riposte du défenseur (et non coup de l'unité qui a engagé). */
  readonly counter: boolean;
  readonly hit: boolean;
  readonly crit: boolean;
  readonly damage: number;
  /** PV de la cible après le coup. */
  readonly targetHp: number;
}

export type BattleEvent =
  | { readonly type: 'move'; readonly unitId: string; readonly path: readonly Cell[] }
  | { readonly type: 'combat'; readonly attackerId: string; readonly defenderId: string; readonly strikes: readonly Strike[] }
  | { readonly type: 'ko'; readonly unitId: string }
  | { readonly type: 'heal'; readonly unitId: string; readonly amount: number }
  | { readonly type: 'phase'; readonly team: Team; readonly turn: number; readonly skipped: boolean }
  | { readonly type: 'outcome'; readonly outcome: Exclude<Outcome, 'ongoing'> };
