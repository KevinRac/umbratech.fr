/**
 * Types du combat tactique (GDD §9). Module pur : ni DOM ni Phaser.
 *
 * L'état d'un combat (`BattleState`) est modifié en place par les commandes de
 * `battle.ts` (et de `skills.ts`, `items.ts`) ; chaque commande renvoie la liste
 * des événements produits (déplacement, échange de coups, compétence, unité
 * vaincue, renforts…), que le rendu rejoue sous forme d'animations. Tout le
 * hasard passe par le `Rng` de l'état : un combat est rejouable à l'identique
 * depuis sa graine.
 *
 * Trois camps (jalon M5) : la compagnie (`player`, commandée par le joueur),
 * les alliés verts (`ally`, toujours commandés par une IA, GDD §7.8) et les
 * ennemis (`enemy`). Compagnie et alliés sont du même côté.
 */
import type {
  AiProfile,
  AlliesBalance,
  ArmorKind,
  BalanceConfig,
  BossDef,
  ConsumableDef,
  ElementDef,
  EnemyDef,
  SkillDef,
  StatBlock,
  StatusDef,
  TerrainDef,
  WeaponDef,
} from '../../data/schemas';
import type { GameData } from '../../data/validate';
import type { Rng } from '../rng';

export type Team = 'player' | 'ally' | 'enemy';

/** Ordre des phases d'un tour : joueur, alliés, ennemis (GDD §7.8). */
export const PHASE_ORDER: readonly Team[] = ['player', 'ally', 'enemy'];

/** Deux camps s'affrontent-ils ? La compagnie et les alliés verts sont du même côté. */
export const hostile = (a: Team, b: Team): boolean => (a === 'enemy') !== (b === 'enemy');

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface BattleMap {
  readonly width: number;
  readonly height: number;
  /**
   * Terrain de chaque case, rangée par rangée. Modifiable pour les terrains
   * temporaires (Mur de ronces) : `state.overlays` garde le terrain d'origine.
   */
  readonly terrains: TerrainDef[];
}

export interface ItemStack {
  item: string;
  qty: number;
}

/** Statut ou renfort posé sur une unité (skills.json › statuses). */
export interface Modifier {
  readonly status: string;
  /** Retiré au début d'une phase de son camp dont le tour est ≥ `until`. */
  readonly until: number;
  /** Unité qui l'a posé. */
  readonly sourceId: string;
}

/** Boss à deux phases (GDD §9.11). */
export interface BossState {
  readonly def: BossDef;
  phase: 1 | 2;
}

export type AllySource = 'garde' | 'passage' | 'errant';

export interface BattleUnit {
  /** Identifiant (réaffecté par les tests, d'où l'absence de `readonly`). */
  id: string;
  readonly name: string;
  readonly team: Team;
  /** Classe (compagnie, alliés) ou type d'ennemi. */
  readonly kindId: string;
  /** Nom de la classe ou du type d'ennemi (« Gardien des Marées », « Écumeur »). */
  readonly kindName: string;
  /** Apparence (render/unitSprites.ts). */
  readonly sprite: string;
  readonly level: number;
  /** Stats sans statut (accessoire et phase de boss compris). */
  base: StatBlock;
  /** Stats effectives (base + statuts), recalculées par `refreshStats`. */
  stats: StatBlock;
  readonly weapon: WeaponDef;
  /** Accessoire porté (un seul emplacement, GDD §9.8). */
  readonly accessory: string | null;
  /** Élément de l'unité : défensif dans le triangle (décision n°51). */
  readonly element: string | null;
  readonly armor: ArmorKind;
  /** Le héros : sa chute est une défaite (GDD §9.10). */
  readonly isHero: boolean;
  readonly isBoss: boolean;
  /** Profil d'IA (ennemis ; change en phase 2 d'un boss). Les alliés verts ont leur propre IA. */
  ai: AiProfile | null;

  hp: number;
  x: number;
  y: number;
  /** A déjà bougé pendant cette phase. */
  moved: boolean;
  /** A fini son tour (action ou attente). */
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

  /** Compétences utilisables (signature de la classe, compétences de boss). */
  skills: string[];
  /** Tour à partir duquel une compétence à délai est de nouveau prête. */
  cooldowns: Record<string, number>;
  /** Ressources de classe restantes (Pierres, Charges). */
  resources: Record<string, number>;
  /** Objets portés (5 au plus, choisis à la préparation). */
  items: ItemStack[];
  /** Statuts et renforts en cours. */
  mods: Modifier[];
  /** Déplacement maximal imposé par un statut (Entravé : 0, Harponné : 2), recalculé par `refreshStats`. */
  moveCap: number | null;
  /** Après « Pas de marée » : l'unité peut encore marcher de tant de cases (0 = non). */
  cantoLeft: number;
  /** Invocation : disparaît au début de la phase de son camp dont le tour est ≥ cette valeur. */
  summonUntil: number | null;
  readonly boss: BossState | null;
  /** Allié vert : d'où il vient (garde, passage, errant). */
  readonly allySource: AllySource | null;
  /** Allié errant du monde (il sera blessé s'il tombe). */
  readonly errantId: string | null;
  /** Rang dans la compagnie (écran de préparation, objets consommés). */
  readonly memberIndex: number | null;
}

export type Objective = 'rout' | 'boss';
export type Outcome = 'ongoing' | 'victory' | 'defeat';

/** Renforts attendus : ils entrent au début de la phase de leur camp, au tour indiqué. */
export interface Reinforcement {
  readonly turn: number;
  readonly team: Exclude<Team, 'player'>;
  readonly units: BattleUnit[];
  /** Case visée pour l'entrée (au bord de la carte, ou près d'un village). */
  readonly entry: Cell;
  /** Bandeau affiché à l'arrivée (« Renfort ! », « Les gardes de Haut-Gué ! »). */
  readonly label: string;
}

/** Terrain temporaire (Mur de ronces) : le terrain d'origine revient à l'expiration. */
export interface TerrainOverlay {
  readonly index: number;
  readonly original: TerrainDef;
  readonly team: Team;
  readonly until: number;
}

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
  /** Numéro du tour (1 au départ) ; un tour = phase joueur, phase alliée (s'il y a des alliés), phase ennemie. */
  turn: number;
  outcome: Outcome;
  /** Avantage de position (GDD §4.7) : la première phase ennemie est sautée. */
  initiative: boolean;
  /** Embuscade subie : la phase ennemie qui ouvre le combat n'est pas encore jouée (le tour reste le tour 1). */
  ambush: boolean;
  /** Cases bleues de l'écran de préparation (GDD §9.3). */
  readonly deploySlots: readonly Cell[];
  /** Unités de la compagnie déployées au plus. */
  readonly maxDeploy: number;
  /** Renforts encore attendus. */
  readonly reinforcements: Reinforcement[];
  readonly overlays: TerrainOverlay[];
  /** Objets consommés pendant le combat (retirés du sac à la fin). */
  readonly itemsUsed: Record<string, number>;
  /** Compteur des identifiants d'unités créées en cours de combat (renforts, invocations). */
  nextId: number;
}

/** Règles chiffrées du combat, tirées des données (balance.json, elements.json, skills.json…). */
export interface BattleRules {
  readonly combat: BalanceConfig['combat'];
  readonly elements: ReadonlyMap<string, ElementDef>;
  readonly statuses: ReadonlyMap<string, StatusDef>;
  readonly skills: ReadonlyMap<string, SkillDef>;
  readonly consumables: ReadonlyMap<string, ConsumableDef>;
  readonly terrains: ReadonlyMap<string, TerrainDef>;
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  readonly weapons: ReadonlyMap<string, WeaponDef>;
  readonly allies: AlliesBalance;
  /** Les données complètes (fabrique des invocations et des renforts). */
  readonly data: GameData;
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

/** Effet d'une compétence ou d'un objet sur une unité. */
export interface EffectResult {
  readonly unitId: string;
  readonly damage?: number;
  readonly heal?: number;
  /** Statut posé. */
  readonly status?: string;
  /** Statut sans effet (boss immunisé). */
  readonly immune?: string;
  /** Statuts retirés (purge). */
  readonly cleansed?: boolean;
  readonly hp: number;
}

export type BattleEvent =
  | { readonly type: 'move'; readonly unitId: string; readonly path: readonly Cell[] }
  | { readonly type: 'combat'; readonly attackerId: string; readonly defenderId: string; readonly strikes: readonly Strike[]; readonly skillId?: string }
  | { readonly type: 'ko'; readonly unitId: string }
  | { readonly type: 'heal'; readonly unitId: string; readonly amount: number; readonly sourceId?: string }
  | { readonly type: 'phase'; readonly team: Team; readonly turn: number; readonly skipped: boolean }
  | { readonly type: 'outcome'; readonly outcome: Exclude<Outcome, 'ongoing'> }
  /** Compétence lancée : annonce (nom), case visée, zone. */
  | { readonly type: 'skill'; readonly unitId: string; readonly skillId: string; readonly target: Cell; readonly cells: readonly Cell[] }
  /** Effets d'une compétence (hors frappe) ou d'un objet sur les unités touchées. */
  | { readonly type: 'effects'; readonly sourceId: string; readonly element: string | null; readonly results: readonly EffectResult[] }
  /** Objet utilisé. */
  | { readonly type: 'item'; readonly unitId: string; readonly item: string; readonly targetId: string }
  /** Dégâts d'un statut au début de la phase (Brûlure, Poison). */
  | { readonly type: 'dot'; readonly unitId: string; readonly status: string; readonly damage: number; readonly hp: number }
  /** L'unité est gelée : elle perd son action. */
  | { readonly type: 'stunned'; readonly unitId: string }
  | { readonly type: 'expire'; readonly unitId: string; readonly status: string }
  /** Renforts entrés sur la carte. */
  | { readonly type: 'arrive'; readonly team: Team; readonly unitIds: readonly string[]; readonly label: string }
  /** Le boss passe en seconde phase. */
  | { readonly type: 'bossPhase'; readonly unitId: string; readonly line: string }
  /** Unité invoquée (déjà posée sur sa case). */
  | { readonly type: 'summon'; readonly unitId: string; readonly sourceId: string }
  /** Invocation dissipée. */
  | { readonly type: 'vanish'; readonly unitId: string }
  /** Terrain temporaire posé (`on`) ou retiré. */
  | { readonly type: 'terrain'; readonly cells: readonly Cell[]; readonly terrain: string; readonly on: boolean }
  /** Après « Pas de marée » : l'unité peut encore marcher. */
  | { readonly type: 'canto'; readonly unitId: string; readonly range: number };
