/**
 * Combat tactique (GDD §9) : carte sur grille, tour par tour.
 *
 * Toutes les règles viennent de `logic/` (grille, échanges, compétences,
 * objets, phases, IA) ; cette scène lit les entrées, appelle les commandes de
 * `logic/tactics/battle.ts` et rejoue leurs événements en animations sur la
 * carte (le spectacle complet des critiques GBA arrive au jalon M8).
 * L'interface vit dans `BattleHudScene`.
 *
 * Avant le combat (jalon M5, GDD §9.3) : écran de préparation — choix des
 * unités déployées, cases bleues (glisser ou cliquer pour échanger), formation
 * Auto, équipement et objets, aperçu des ennemis, Combattre / Retour.
 *
 * Phase du joueur : choisir une unité → la déplacer (cases bleues) → Attaquer,
 * Compétence, Objet, Soigner ou Attendre ; Échap annule le déplacement. Phase
 * alliée : les alliés verts jouent leur IA (jamais commandés par le joueur).
 * Phase ennemie : chaque ennemi joue le plan de son IA.
 * Souris : survol = curseur, clic gauche = valider, clic droit = annuler (jamais le menu : Échap ou Tab).
 */
import Phaser from 'phaser';
import { ANIM_SPEED_FACTOR, ANIM_SPEED_LABEL, loadAnimSpeed, nextAnimSpeed, saveAnimSpeed, type AnimSpeed } from '../core/settings';
import { showFatalError } from '../core/fatal';
import { ActionInput } from '../core/input';
import { getLastDeployed, getLoadouts, getWorldState, setLastDeployed } from '../core/session';
import { getGameCtx } from '../core/townContext';
import { settleBattle, testPartyAt, type BattleEnd, type Settlement } from '../logic/game';
import { formatNotices } from '../ui/notices';
import { uiScaleFor, zoomOrigin } from '../core/viewport';
import { loadGameData, type GameData } from '../data';
import type { PartyMemberDef } from '../data/schemas';
import { planAllyAction } from '../logic/ai/allyAi';
import { planEnemyAction } from '../logic/ai/enemyAi';
import { forecast } from '../logic/combat/combat';
import { attackUnit, endPhase, healAction, itemAction, livingUnits, moveUnit, phaseComplete, readyUnits, skillAction, summarize, undoMove, waitUnit } from '../logic/tactics/battle';
import { phaseThreshold } from '../logic/tactics/bosses';
import { battleRules, buildBattle, findEncounter, type AllyJoin } from '../logic/tactics/encounter';
import { cellIndex, cellsInRange, getUnit, inBounds, inWeaponRange, pathTo, reachable, targetsFrom, terrainAt, threatCells, unitAt, type Reach } from '../logic/tactics/grid';
import { healTargets, staffHealAmount, usableItems } from '../logic/tactics/items';
import {
  accessoryChoices,
  applyPlan,
  autoFormation,
  carried,
  convoyLeft,
  deployedMembers,
  giveItem,
  planFromState,
  reconcileLoadouts,
  swapSlots,
  takeItem,
  toggleMember,
  weaponChoices,
  type PrepPlan,
} from '../logic/tactics/prep';
import { costLabel, previewSkill, skillArea, skillBlocker, skillDef, skillForecast, skillTargets } from '../logic/tactics/skills';
import { isStunned } from '../logic/tactics/status';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type Cell, type EffectResult, type ItemStack, type Strike, type Team } from '../logic/tactics/types';
import { memberUnit, type Loadout } from '../logic/tactics/units';
import { BF_TILE, BF_TOP, BF_WATER_FRAMES } from '../render/battlefield';
import { BATTLE_TEX, ensureBattleFxTextures, ensureBattlefield, ensureMapSprite } from '../render/battleTextures';
import { WORLD_MAP_KEY, WORLD_TEX, WORLD_TILESET_KEY, ensureWorldTextures } from '../render/worldTextures';
import { WATER_FRAMES } from '../render/waterTile';
import { fixGpuTileAnimations } from '../render/tileAnimations';
import { WorldAtmosphere } from '../render/worldAtmosphere';
import { ALLY_OUTLINE, UNIT_IDLE_FRAMES } from '../render/unitSprites';
import { loadQuality } from '../core/settings';
import { loadWorldMap, type WorldMap } from '../data/worldMap';
import { worldTerrainSource, type TerrainSource } from '../logic/tactics/sampling';
import { PALETTE, mixColor } from '../render/palette';
import { addText } from '../ui/text';
import type { MenuItem } from '../ui/VerticalMenu';
import type { ListRow } from '../ui/ScrollList';
import type { SheetView } from '../ui/PrepSheet';
import { BOTTOM_BAR, TEAM_COLOR, TOP_BAR, type BattleHudScene, type DodgeSide, type PrepView, type UnitExtra } from './BattleHudScene';
import { SCENES } from './keys';

export interface BattleSceneData {
  readonly encounterId: string;
  /** Scène où revenir après le combat. */
  readonly returnTo: 'title' | 'world';
  /** Graine du hasard (par défaut : tirée au lancement). */
  readonly seed?: string | number;
  /** Avantage de position (le joueur a surpris l'ennemi). */
  readonly initiative?: boolean;
  /** Point de contact dans le monde, en cases (la carte de combat est tirée du terrain autour). */
  readonly site?: Cell;
  /** Embuscade subie : les ennemis démarrent tout près et ouvrent le combat (GDD §7.4). */
  readonly ambush?: boolean;
  /** Ennemi du monde engagé : il est vaincu pour de bon si la compagnie gagne (jalon M3). */
  readonly foeId?: string;
  /** Renforts d'une vigie, ajoutés aux ennemis de la rencontre. */
  readonly extraEnemies?: readonly { readonly enemy: string; readonly level: number }[];
  /** Alliés verts qui rejoindront le combat (gardes, passage, errants ; jalon M5). */
  readonly allies?: readonly AllyJoin[];
}

/** Zoom du combat : chaque case fait 32 pixels à l'écran, comme une carte GBA agrandie (décision n°58). */
const BATTLE_ZOOM = 2;
/** Le curseur garde cette marge (en cases) avec le bord de l'écran : la carte défile avant. */
const SCROLL_MARGIN = 2;

type Mode = 'prep' | 'place' | 'busy' | 'browse' | 'move' | 'menu' | 'target' | 'enemy' | 'end';

/** Ce qu'on vise : une attaque, une compétence, un objet, un soin. */
interface Targeting {
  readonly kind: 'attack' | 'skill' | 'item' | 'heal';
  readonly skillId?: string;
  readonly item?: string;
  /** Cases valables. */
  readonly cells: readonly Cell[];
  /** Curseur libre (compétence sur une case) plutôt qu'un défilement des cibles. */
  readonly free: boolean;
}

interface UnitView {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly hpBg: Phaser.GameObjects.Rectangle;
  readonly hpFill: Phaser.GameObjects.Rectangle;
  readonly mark: Phaser.GameObjects.Image;
  aura: Phaser.GameObjects.Image | null;
  /** Rage d'un boss en seconde phase (0 à 1) : teinte rouge pulsée du sprite. */
  rage: { t: number } | null;
}

const T = BF_TILE;
/** Libellé court de la vitesse des animations (la colonne du menu est étroite). */
const ANIM_SPEED_SHORT: Readonly<Record<AnimSpeed, string>> = { normal: '×1', fast: '×2', off: 'max' };
/** Teinte de rage d'un boss en seconde phase (pulsée sur le sprite). */
const RAGE_TINT = 0xff5a3c;
/** Profondeurs : l'art du monde (sol, décors, cimes), la grille, les cases colorées, puis les unités au-dessus de tout le décor (lisibilité tactique). Halos, rayons et poussière de l'atmosphère se placent vers 10,6–10,9. */
const DEPTH = { water: -10, field: 0, decor: 1, canopy: 2, grid: 3, outside: 3.5, overlay: 3.8, threat: 4, highlight: 5, area: 5.6, frame: 6, shadow: 9.9, units: 10, cursor: 30, fx: 40, numbers: 50 } as const;
const COLORS = {
  move: 0x4f93e6,
  attack: 0xe0584c,
  threat: 0xb83a3a,
  marked: 0xe07b39,
  player: 0x6fa8dc,
  enemy: 0xd9654b,
  acted: 0x8c869c,
  /** Cases de soin : vert-jaune plein (le liseré des alliés verts est un vert menthe, GDD §13.5). */
  heal: 0x7fcf6a,
  skill: 0xb07fe0,
  area: 0xffb15c,
  slot: 0x4f93e6,
  pick: 0xffdf9a,
} as const;
const SHADOW_TINT: Readonly<Record<Team, number>> = { player: 0x9cc0ff, ally: 0xb0f0c8, enemy: 0xffb0a0 };
const WATER_FRAME_MS = 420;
/** Durées de base (ms) des animations sur la carte, avant le réglage de vitesse. */
const MS = { step: 75, lunge: 90, back: 120, hitStop: 70, number: 650, ko: 520, between: 110, banner: 1300, enemyPause: 160, projectile: 190, cutIn: 900, bossLine: 2400, arrive: 1100 } as const;

export class BattleScene extends Phaser.Scene {
  private gameData!: GameData;
  private rules!: BattleRules;
  private state!: BattleState;
  private params!: BattleSceneData;
  private seed = '';
  /** Bilan appliqué à la partie à la fin du combat (or, butin, drapeaux, défaite). */
  private settlement: Settlement | null = null;
  private ended: BattleEnd | null = null;
  private hud!: BattleHudScene;
  private actions!: ActionInput;
  private alive = false;

  /* Compagnie et préparation (jalon M5) */
  private party: PartyMemberDef[] = [];
  private loadouts: Loadout[] = [];
  /** Sac de la compagnie : celui de la partie, ou un sac d'essai (titre). */
  private convoy: ItemStack[] = [];
  private plan: PrepPlan | null = null;
  private prepCursor = 0;
  private prepPick: number | null = null;
  private prepMessage: string | null = null;
  private slotTiles: Phaser.GameObjects.Image[] = [];

  private zoom = 3;
  private field!: Phaser.GameObjects.Image;
  private fieldKey = '';
  private worldMap: WorldMap | null = null;
  /**
   * Coin du champ de bataille en pixels du monde. Les couches GPU de Phaser 4.2.1
   * ignorent leur position : le monde reste en place et c'est le combat qui se pose
   * dessus. Toutes les positions passent par `px` / `py`.
   */
  private base = { x: 0, y: 0 };
  /** Étalonnage, bloom, rayons, poussière, halos du monde ouvert (décision n°47), sur la caméra du combat. */
  private atmosphere: WorldAtmosphere | null = null;
  private views = new Map<string, UnitView>();
  private brambles = new Map<number, Phaser.GameObjects.Image>();
  private cursor!: Phaser.GameObjects.Image;
  private cursorCell: Cell = { x: 0, y: 0 };
  private highlights: Phaser.GameObjects.Image[] = [];
  private areaTiles: Phaser.GameObjects.Image[] = [];
  /** Flèche du chemin que prendra l'unité choisie jusqu'à la case visée. */
  private arrowTiles: Phaser.GameObjects.Image[] = [];
  private threatTiles: Phaser.GameObjects.Image[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  private mode: Mode = 'busy';
  private modeSince = 0;
  /** Image où le mode a changé : l'appui qui a provoqué le changement ne doit pas servir deux fois. */
  private modeFrame = -1;
  private selected: BattleUnit | null = null;
  private reach: Reach | null = null;
  /** Après « Pas de marée » : le déplacement offert (pas d'annulation). */
  private canto = false;
  private targeting: Targeting | null = null;
  private targetIndex = 0;
  private showAllThreat = false;
  private marked = new Set<string>();
  private speed: AnimSpeed = 'normal';
  private pendingClick: { cell: Cell; right: boolean; up?: boolean } | null = null;
  /** Menu d'action ouvert après le déplacement : un clic sur un ennemi à portée lance l'attaque. */
  private actionMenuOpen = false;
  /** Ennemi survolé pendant le menu d'action (sa prévision est affichée). */
  private hoverTarget: BattleUnit | null = null;
  private lastHover = '';
  /** Défilement : coin haut-gauche visible (pixels d'art), cible du lissage, taille visible. */
  private cam = { x: 0, y: 0 };
  private camTarget = { x: 0, y: 0 };
  private viewSize = { w: 480, h: 246 };
  private dodge: DodgeSide = 'left';

  constructor() {
    super(SCENES.battle);
  }

  create(params: BattleSceneData): void {
    this.params = params;
    this.alive = true;
    this.hovered = null;
    this.views = new Map();
    this.brambles = new Map();
    this.ended = null;
    this.settlement = null;
    this.plan = null;
    this.prepPick = null;
    this.prepMessage = null;
    this.prepCursor = 0;
    this.slotTiles = [];
    this.canto = false;
    this.targeting = null;
    const url = new URLSearchParams(window.location.search);
    const debug = url.has('debug');
    try {
      this.gameData = loadGameData();
      this.rules = battleRules(this.gameData);
      const encounter = findEncounter(this.gameData, params.encounterId);
      // `?debug&seed=…` rejoue un combat à l'identique (placement et dés).
      const seed = params.seed ?? (debug && url.get('seed') ? `${url.get('seed')}` : `${params.encounterId}:${Date.now()}`);
      this.seed = String(seed);
      this.party = testPartyAt(this.gameData, getWorldState()?.testLevel);
      this.convoy = getWorldState()?.progress.inventory ?? this.gameData.balance.prep.testItems.map((s) => ({ ...s }));
      this.loadouts = getLoadouts(this.party.length);
      reconcileLoadouts(this.loadouts, this.convoy);
      this.state = buildBattle(encounter, this.party, this.gameData, {
        seed,
        initiative: params.initiative === true,
        ambush: params.ambush === true,
        ...(params.extraEnemies ? { extraEnemies: params.extraEnemies } : {}),
        world: this.worldSource(),
        ...(params.site ? { site: params.site } : {}),
        loadouts: this.loadouts,
        allies: [...(params.allies ?? []), ...(debug ? this.debugAllies(url.get('allies')) : [])],
      });
      if (debug) this.applyDebugParams(url);
    } catch (error) {
      showFatalError('Le combat n’a pas pu être préparé.', [error instanceof Error ? error.message : String(error)]);
      return;
    }
    this.speed = loadAnimSpeed();
    this.actions = new ActionInput(this);
    this.scene.launch(SCENES.battleHud);
    this.hud = this.scene.get(SCENES.battleHud) as BattleHudScene;

    ensureBattleFxTextures(this);
    for (const unit of this.state.units) ensureMapSprite(this, unit.sprite, unit.team);
    for (const wave of this.state.reinforcements) for (const unit of wave.units) ensureMapSprite(this, unit.sprite, unit.team);
    this.buildField();
    this.layoutCamera();
    this.buildAtmosphere();
    this.buildUnits();
    this.buildCursor();
    this.sparks = this.add.particles(0, 0, BATTLE_TEX.spark, {
      emitting: false,
      lifespan: { min: 180, max: 380 },
      speed: { min: 30, max: 90 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
    });
    this.sparks.setDepth(DEPTH.fx);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      // Un clic sur un menu de l'interface n'est pas un clic sur la carte.
      if (this.hud.isOverMenu(pointer.x, pointer.y)) return;
      const cell = this.cellAtPointer(pointer);
      if (cell) this.pendingClick = { cell, right: pointer.rightButtonDown() };
      else if (pointer.rightButtonDown()) this.pendingClick = { cell: this.cursorCell, right: true };
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      // Glisser-déposer à la préparation : relâcher sur une autre case bleue échange les deux.
      if (this.mode !== 'prep' || this.prepPick === null || this.hud.isOverMenu(pointer.x, pointer.y)) return;
      const cell = this.cellAtPointer(pointer);
      if (cell) this.pendingClick = { cell, right: false, up: true };
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());

    const boss = this.state.units.find((u) => u.isBoss);
    this.hud.setHeader(this.state.name, this.objectiveText(boss));
    this.hud.setPhase(this.state.phase, 1);
    this.cameras.main.fadeIn(450, 0, 0, 0);
    // `?debug&prep=off` passe la préparation (déploiement par défaut).
    if (debug && url.get('prep') === 'off') {
      this.focusHero();
      void this.openingSequence();
    } else this.startPrep();
  }

  private objectiveText(boss: BattleUnit | undefined): string {
    return this.state.objective === 'boss' && boss ? `Objectif : vaincre ${boss.name}` : 'Objectif : vaincre tous les ennemis';
  }

  private focusHero(): void {
    const hero = this.state.units.find((u) => u.isHero) ?? this.state.units[0];
    if (hero) {
      this.setCursor(hero);
      this.centerCameraOn(hero);
    }
  }

  /* ---------- Débogage ---------- */

  /**
   * `?debug&allies=garde,passage,errant` : fait venir un allié vert de chaque
   * sorte (au tour 1 pour les gardes, 2 pour les autres), pour essayer la phase alliée.
   */
  private debugAllies(spec: string | null): AllyJoin[] {
    if (!spec) return [];
    const out: AllyJoin[] = [];
    for (const kind of spec.split(',')) {
      if (kind === 'garde') out.push({ template: 'garde_haut_gue', level: 3, turn: 1, worldCell: null, source: 'garde', errantId: null, label: 'Les gardes de Haut-Gué accourent !' });
      if (kind === 'passage') out.push({ template: 'apprentie_haut_gue', level: 3, turn: 1, worldCell: null, source: 'passage', errantId: null, label: 'Renfort ! Un habitant de Haut-Gué vient à l’aide.' });
      if (kind === 'errant') out.push({ template: 'voyageur_arme', level: 3, turn: 1, worldCell: null, source: 'errant', errantId: null, label: 'Aldric se joint au combat !' });
    }
    return out;
  }

  /**
   * `?debug&res=100` : Résonance de départ de la compagnie ; `&bosshp=0.55` : PV
   * du boss (part de ses PV max), pour voir vite la phase 2.
   */
  private applyDebugParams(url: URLSearchParams): void {
    const res = Number(url.get('res'));
    if (url.has('res') && Number.isFinite(res)) this.debugResonance = Math.max(0, Math.min(100, res));
    const bossHp = Number(url.get('bosshp'));
    if (url.has('bosshp') && Number.isFinite(bossHp)) {
      for (const u of this.state.units) if (u.isBoss) u.hp = Math.max(1, Math.round(u.stats.pv * Math.max(0, Math.min(1, bossHp))));
    }
  }

  private debugResonance: number | null = null;

  /* ---------- Construction ---------- */

  /**
   * Le champ de bataille (décision n°59) : sur une carte tirée du monde, c'est
   * **l'art du monde lui-même** — sol organique, bâtiments, arbres et blé au vent,
   * eau animée — décalé pour que la case (0, 0) du combat tombe sur le coin de
   * la fenêtre. Autour, le monde continue, assombri. Une carte fixe (scénario)
   * est peinte par `battlefield.ts`.
   */
  private buildField(): void {
    const origin = this.state.worldOrigin;
    this.base = origin ? { x: origin.x * T, y: origin.y * T } : { x: 0, y: 0 };
    const w = this.state.map.width * T;
    const h = this.state.map.height * T;
    if (origin && this.worldMap) this.buildWorldField(this.worldMap);
    else this.buildPaintedField();

    // Grille discrète : liseré d'un pixel au bord haut et gauche de chaque case.
    const grid = this.add.graphics().setDepth(DEPTH.grid).setPosition(this.base.x, this.base.y);
    grid.fillStyle(mixColor(PALETTE.ombreViolette, PALETTE.ombreProfonde, 0.3), 0.16);
    for (let x = 0; x <= this.state.map.width; x++) grid.fillRect(x * T, 0, 1, h);
    for (let y = 0; y <= this.state.map.height; y++) grid.fillRect(0, y * T, w, 1);

    // Cadre du champ de bataille : le monde au-delà est assombri, liseré doré.
    const outside = this.add.graphics().setDepth(DEPTH.outside).setPosition(this.base.x, this.base.y);
    const far = 4000;
    outside.fillStyle(PALETTE.nuit, 0.55);
    outside.fillRect(-far, -far, 2 * far + w, far);
    outside.fillRect(-far, h, 2 * far + w, far);
    outside.fillRect(-far, 0, far, h);
    outside.fillRect(w, 0, far, h);
    const frame = this.add.graphics().setDepth(DEPTH.frame).setPosition(this.base.x, this.base.y);
    frame.lineStyle(1, PALETTE.ambre, 0.7).strokeRect(-0.5, -0.5, w + 1, h + 1);
  }

  private buildWorldField(map: WorldMap): void {
    ensureWorldTextures(this);
    const worldW = map.width * T;
    const worldH = map.height * T;
    const water = this.add.tileSprite(0, 0, worldW, worldH, WORLD_TEX.water(0)).setOrigin(0, 0).setDepth(DEPTH.water);
    let waterFrame = 0;
    this.time.addEvent({
      delay: WATER_FRAME_MS,
      loop: true,
      callback: () => {
        waterFrame = (waterFrame + 1) % WATER_FRAMES;
        water.setTexture(WORLD_TEX.water(waterFrame));
      },
    });
    const tilemap = this.make.tilemap({ key: WORLD_MAP_KEY });
    const tileset = tilemap.addTilesetImage('world_tiles', WORLD_TILESET_KEY);
    if (!tileset) throw new Error('Tileset du monde introuvable.');
    // Vent dans les feuillages et le blé, ailes du moulin, flammes : tuiles animées par le GPU (décision n°45).
    fixGpuTileAnimations(tileset, this.renderer);
    const layers: [string, number][] = [
      ['ground', DEPTH.field],
      ['decor', DEPTH.decor],
      ['canopy', DEPTH.canopy],
    ];
    for (const [name, depth] of layers) {
      const layer = tilemap.createLayer(name, tileset, 0, 0, true);
      if (!layer) throw new Error(`Couche « ${name} » impossible à créer.`);
      layer.setDepth(depth);
    }
  }

  private buildPaintedField(): void {
    const rows: string[][] = [];
    for (let y = 0; y < this.state.map.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.state.map.width; x++) row.push(terrainAt(this.state.map, x, y).id);
      rows.push(row);
    }
    this.fieldKey = this.state.encounterId;
    ensureBattlefield(this, this.fieldKey, rows, 7);
    this.field = this.add.image(this.base.x, this.base.y - BF_TOP, BATTLE_TEX.field(this.fieldKey, 0)).setOrigin(0, 0).setDepth(DEPTH.field);
    let frame = 0;
    this.time.addEvent({
      delay: WATER_FRAME_MS,
      loop: true,
      callback: () => {
        frame = (frame + 1) % BF_WATER_FRAMES;
        this.field.setTexture(BATTLE_TEX.field(this.fieldKey, frame));
      },
    });
    this.field.setCrop(0, BF_TOP - 2, this.state.map.width * T, this.state.map.height * T + 2);
  }

  /**
   * Atmosphère HD-2D du monde (décision n°47) sur le combat : étalonnage de la
   * zone, bloom, vignettage, rayons, poussière, halos des lanternes et des feux
   * de la fenêtre. Le flou de profondeur est coupé : sur une carte tactique,
   * chaque case doit rester nette (décision n°59).
   */
  private buildAtmosphere(): void {
    const origin = this.state.worldOrigin;
    const map = this.worldMap;
    const lights = origin && map
      ? map.ambient
          .filter((o) => o.kind === 'light')
          .filter((o) => o.x > this.base.x - 2 * T && o.y > this.base.y - 2 * T && o.x < this.px(this.state.map.width + 2) && o.y < this.py(this.state.map.height + 2))
      : [];
    this.atmosphere = new WorldAtmosphere(this, this.gameData.balance.visuals, lights);
    this.atmosphere.setQuality(loadQuality(), ['tiltShift']);
    const zone = this.gameData.zones.find((z) => z.id === this.state.zone);
    if (zone) this.atmosphere.setZone(zone);
  }

  /** Carte du monde (cache du chargement) : le combat se joue sur son terrain. */
  private worldSource(): TerrainSource | undefined {
    const raw = this.cache.tilemap.get(WORLD_MAP_KEY)?.data as unknown;
    if (!raw) return undefined;
    this.worldMap = loadWorldMap(raw, { zones: this.gameData.zones, terrains: this.gameData.terrains, tileSize: this.gameData.balance.exploration.tileSize });
    return worldTerrainSource(this.worldMap);
  }

  /** Pixel du monde du bord gauche (haut) d'une colonne (rangée) de la carte de combat. */
  private px(x: number): number {
    return this.base.x + x * T;
  }

  private py(y: number): number {
    return this.base.y + y * T;
  }

  /**
   * Caméra (décision n°58) : zoom ×2 comme le monde ouvert, entre le bandeau du
   * haut et la barre d'aide du bas ; la carte défile avec le curseur.
   */
  private layoutCamera(): void {
    const { width: W, height: H } = this.scale;
    const S = uiScaleFor(H);
    const top = TOP_BAR * S;
    const vpH = H - (TOP_BAR + BOTTOM_BAR) * S;
    this.zoom = BATTLE_ZOOM;
    this.viewSize = { w: W / this.zoom, h: vpH / this.zoom };
    const camera = this.cameras.main;
    camera.setViewport(0, top, W, vpH).setZoom(this.zoom).setBackgroundColor(mixColor(PALETTE.nuit, PALETTE.ombreProfonde, 0.4));
  }

  /** Bornes du défilement : la carte reste à l'écran ; plus petite que l'écran, elle est centrée. */
  private clampCam(x: number, y: number): { x: number; y: number } {
    const mapW = this.state.map.width * T;
    const mapH = this.state.map.height * T;
    const { w, h } = this.viewSize;
    const m = 12; // on aperçoit le monde assombri au-delà du bord
    const top = 26; // les personnages de la première rangée dépassent de leur case vers le haut
    const cx = mapW <= w ? (mapW - w) / 2 : Math.max(-m, Math.min(mapW - w + m, x));
    const cy = mapH + top <= h ? (mapH - h) / 2 - top / 2 : Math.max(-top, Math.min(mapH - h + m, y));
    return { x: cx, y: cy };
  }

  private centerCameraOn(cell: Cell): void {
    this.camTarget = this.clampCam(cell.x * T + T / 2 - this.viewSize.w / 2, cell.y * T + T / 2 - this.viewSize.h / 2);
    this.cam = { ...this.camTarget };
    this.applyCamera();
  }

  /** Fait défiler la carte si la case approche du bord (marge de `SCROLL_MARGIN` cases). */
  private followCell(cell: Cell): void {
    const m = SCROLL_MARGIN * T;
    let { x, y } = this.camTarget;
    const { w, h } = this.viewSize;
    if (cell.x * T < x + m) x = cell.x * T - m;
    if ((cell.x + 1) * T > x + w - m) x = (cell.x + 1) * T - w + m;
    if (cell.y * T - T < y + m) y = cell.y * T - T - m;
    if ((cell.y + 1) * T > y + h - m) y = (cell.y + 1) * T - h + m;
    this.camTarget = this.clampCam(x, y);
  }

  private applyCamera(): void {
    const camera = this.cameras.main;
    const origin = zoomOrigin(camera.width, camera.height, this.zoom);
    camera.setScroll(Math.round(this.cam.x + this.base.x) - origin.x, Math.round(this.cam.y + this.base.y) - origin.y);
    // Les fenêtres passent du côté opposé au curseur (pas pendant la préparation : les panneaux sont fixes).
    if (this.mode === 'prep' || this.mode === 'place') return;
    const screenX = (this.cursorCell.x * T + T / 2 - this.cam.x) * this.zoom;
    const side: DodgeSide = screenX < this.scale.width / 2 ? 'right' : 'left';
    if (side !== this.dodge) {
      this.dodge = side;
      this.hud.setDodge(side);
    }
  }

  private updateCamera(delta: number): void {
    const k = 1 - Math.pow(0.0005, delta / 1000);
    const dx = this.camTarget.x - this.cam.x;
    const dy = this.camTarget.y - this.cam.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      this.cam = { ...this.camTarget };
    } else {
      this.cam = { x: this.cam.x + dx * k, y: this.cam.y + dy * k };
    }
    this.applyCamera();
  }

  private buildUnits(): void {
    for (const unit of this.state.units) this.createView(unit);
  }

  /** Vue d'une unité : ombre, sprite, barre de PV, marque de statut, couronne, étoile. */
  private createView(unit: BattleUnit): UnitView {
    this.views.get(unit.id)?.container.destroy();
    ensureMapSprite(this, unit.sprite, unit.team);
    const sprite = this.add.sprite(0, 0, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1);
    // Ombre au sol du monde ouvert, légèrement teintée par le camp.
    const shadow = this.add.image(0, -2, WORLD_TEX.shadow).setTint(SHADOW_TINT[unit.team]);
    const hpBg = this.add.rectangle(-6, -2, 12, 2, PALETTE.encre, 0.9).setOrigin(0, 0);
    const hpFill = this.add.rectangle(-6, -2, 12, 2, COLORS.heal, 1).setOrigin(0, 0);
    const mark = this.add.image(8, -30, BATTLE_TEX.status('buff')).setVisible(false);
    const parts: Phaser.GameObjects.GameObject[] = [shadow, sprite, hpBg, hpFill, mark];
    if (unit.isBoss) parts.push(this.add.image(0, -36, BATTLE_TEX.crown));
    if (unit.isHero) parts.push(this.add.image(0, -36, BATTLE_TEX.heroMark));
    const container = this.add.container(0, 0, parts);
    const view: UnitView = { container, sprite, shadow, hpBg, hpFill, mark, aura: null, rage: null };
    this.views.set(unit.id, view);
    sprite.anims.play({ key: BATTLE_TEX.msIdle(unit.sprite, unit.team), startFrame: Math.floor(Math.random() * UNIT_IDLE_FRAMES) });
    this.syncUnit(unit);
    return view;
  }

  private buildCursor(): void {
    this.cursor = this.add.image(0, 0, BATTLE_TEX.cursor(0)).setOrigin(0, 0).setDepth(DEPTH.cursor);
    let frame = 0;
    this.time.addEvent({ delay: 380, loop: true, callback: () => this.cursor.setTexture(BATTLE_TEX.cursor((frame = 1 - frame))) });
  }

  /* ---------- Synchronisation des vues ---------- */

  private syncUnit(unit: BattleUnit): void {
    const view = this.views.get(unit.id);
    if (!view) return;
    view.container.setPosition(this.px(unit.x) + T / 2, this.py(unit.y) + T).setDepth(DEPTH.units + unit.y * 0.01);
    view.container.setVisible(unit.hp > 0);
    const ratio = unit.hp / unit.stats.pv;
    view.hpFill.width = Math.max(1, Math.round(12 * ratio));
    view.hpFill.setFillStyle(ratio > 0.5 ? COLORS.heal : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre, 1);
    const showBar = unit.hp < unit.stats.pv;
    view.hpBg.setVisible(showBar);
    view.hpFill.setVisible(showBar);
    const done = unit.team === this.state.phase && unit.acted && this.state.outcome === 'ongoing' && this.mode !== 'prep' && this.mode !== 'place';
    if (done) {
      view.sprite.anims.stop();
      view.sprite.setFrame(BATTLE_TEX.msFrame('idle', 0)).setTint(COLORS.acted);
    } else {
      if (view.rage) view.sprite.setTint(mixColor(0xffffff, RAGE_TINT, view.rage.t));
      else view.sprite.clearTint();
      if (!view.sprite.anims.isPlaying) view.sprite.anims.play(BATTLE_TEX.msIdle(unit.sprite, unit.team));
    }
    // Marque de statut : gel, puis affaiblissement, puis renfort.
    const kinds = unit.mods.map((m) => this.rules.statuses.get(m.status));
    const mark = isStunned(unit, this.rules) ? 'stun' : kinds.some((k) => k?.kind === 'debuff') ? 'debuff' : kinds.some((k) => k?.kind === 'buff') ? 'buff' : null;
    view.mark.setVisible(mark !== null && unit.hp > 0);
    if (mark) view.mark.setTexture(BATTLE_TEX.status(mark));
    // Aura du boss en seconde phase.
    if (unit.boss?.phase === 2 && !view.aura) {
      // Halo rouge au sol et lueur autour du corps : la rage du boss se voit de loin.
      const aura = this.add.image(0, -2, BATTLE_TEX.aura).setTint(PALETTE.orangeForge).setBlendMode(Phaser.BlendModes.ADD).setScale(1.8, 1.6);
      const glow = this.add.image(0, -14, BATTLE_TEX.aura).setTint(PALETTE.rougeCendre).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2, 2.6).setAlpha(0.6);
      view.container.addAt(aura, 0);
      view.container.addAt(glow, 1);
      view.aura = aura;
      this.tweens.add({ targets: aura, alpha: { from: 0.6, to: 1 }, scaleX: { from: 1.7, to: 2.2 }, duration: 650, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.75 }, duration: 480, yoyo: true, repeat: -1 });
      // Le corps pulse au rouge : lisible même sur le sable d'un camp, où le halo se perd.
      const rage = { t: 0 };
      view.rage = rage;
      this.tweens.add({
        targets: rage, t: 0.75, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (view.sprite.tintMode === Phaser.TintModes.MULTIPLY && view.sprite.anims.isPlaying) view.sprite.setTint(mixColor(0xffffff, RAGE_TINT, rage.t));
        },
      });
    }
  }

  private syncAll(): void {
    for (const unit of this.state.units) this.syncUnit(unit);
  }

  /* ---------- Curseur et survol ---------- */

  private setCursor(cell: Cell): void {
    const x = Math.max(0, Math.min(this.state.map.width - 1, cell.x));
    const y = Math.max(0, Math.min(this.state.map.height - 1, cell.y));
    this.cursorCell = { x, y };
    this.cursor.setPosition(this.px(x) - 2, this.py(y) - 2);
    this.followCell(this.cursorCell);
    this.refreshArrow();
    this.refreshHover();
  }

  private refreshHover(): void {
    if (this.mode === 'prep' || this.mode === 'place') return;
    const { x, y } = this.cursorCell;
    const unit = unitAt(this.state, x, y);
    const key = `${x},${y},${unit?.id ?? ''},${unit?.hp ?? ''},${this.mode}`;
    if (key === this.lastHover) return;
    this.lastHover = key;
    this.hud.showTerrain(terrainAt(this.state.map, x, y));
    this.hoverReady(this.mode === 'browse' && unit?.team === 'player' && !unit.acted && unit.hp > 0 ? unit : null);
    if (this.mode === 'target') return;
    this.hud.showUnit(unit ?? this.selected);
  }

  /** Unité alliée survolée qui brandit son arme (comme sur la carte des Fire Emblem GBA). */
  private hovered: BattleUnit | null = null;

  private playReady(unit: BattleUnit): void {
    const sprite = this.views.get(unit.id)?.sprite;
    const key = BATTLE_TEX.msReady(unit.sprite, unit.team);
    if (sprite && sprite.anims.currentAnim?.key !== key) sprite.anims.play(key);
  }

  private hoverReady(unit: BattleUnit | null): void {
    if (unit === this.hovered) return;
    const previous = this.hovered;
    this.hovered = unit;
    if (previous && previous !== this.selected && !previous.acted) this.views.get(previous.id)?.sprite.anims.play(BATTLE_TEX.msIdle(previous.sprite, previous.team));
    if (unit) this.playReady(unit);
  }

  private cellAtPointer(pointer: Phaser.Input.Pointer): Cell | null {
    const camera = this.cameras.main;
    if (pointer.y < camera.y || pointer.y >= camera.y + camera.height) return null;
    const p = camera.getWorldPoint(pointer.x, pointer.y);
    const x = Math.floor((p.x - this.base.x) / T);
    const y = Math.floor((p.y - this.base.y) / T);
    return inBounds(this.state.map, x, y) ? { x, y } : null;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    if (this.mode === 'menu') {
      if (this.actionMenuOpen) this.hoverActionTarget(this.cellAtPointer(pointer));
      return;
    }
    if (this.mode === 'busy' || this.mode === 'enemy' || this.mode === 'end') return;
    if (this.hud.isOverMenu(pointer.x, pointer.y)) return;
    const cell = this.cellAtPointer(pointer);
    if (!cell || (cell.x === this.cursorCell.x && cell.y === this.cursorCell.y)) return;
    if (this.mode === 'target' && this.targeting) {
      if (this.targeting.free) {
        this.setCursor(cell);
        this.focusFree();
        return;
      }
      const i = this.targeting.cells.findIndex((t) => t.x === cell.x && t.y === cell.y);
      if (i >= 0) this.focusTarget(i);
      return;
    }
    this.setCursor(cell);
  }

  /* ---------- Cases colorées ---------- */

  private paintTiles(pool: Phaser.GameObjects.Image[], cells: Iterable<Cell>, color: number, alpha: number, depth: number): void {
    for (const c of cells) {
      pool.push(this.add.image(this.px(c.x), this.py(c.y), BATTLE_TEX.tile).setOrigin(0, 0).setTint(color).setAlpha(alpha).setDepth(depth));
    }
  }

  private clearTiles(pool: Phaser.GameObjects.Image[]): void {
    for (const tile of pool) tile.destroy();
    pool.length = 0;
  }

  /** Zones de menace : tous les ennemis (touche R) ou ceux marqués d'un clic. */
  private refreshThreat(): void {
    this.clearTiles(this.threatTiles);
    const enemies = livingUnits(this.state, 'enemy');
    const marked = enemies.filter((e) => this.showAllThreat || this.marked.has(e.id));
    if (marked.length === 0) return;
    const cells = new Set<number>();
    for (const enemy of marked) for (const i of threatCells(this.state, enemy)) cells.add(i);
    const list = [...cells].map((i) => ({ x: i % this.state.map.width, y: Math.floor(i / this.state.map.width) }));
    this.paintTiles(this.threatTiles, list, this.showAllThreat ? COLORS.threat : COLORS.marked, 0.32, DEPTH.threat);
  }

  /** Cases bleues (déplacement) et rouges (portée d'attaque depuis ces cases). */
  private showMoveRange(unit: BattleUnit, reach: Reach): void {
    this.clearTiles(this.highlights);
    const map = this.state.map;
    const blue = [...reach.cost.keys()].map((i) => ({ x: i % map.width, y: Math.floor(i / map.width) }));
    const red = new Map<number, Cell>();
    if (!this.canto) {
      for (const stop of reach.stops) {
        for (const c of cellsInRange(map, stop, unit.weapon.range)) {
          const i = cellIndex(map, c.x, c.y);
          if (!reach.cost.has(i)) red.set(i, c);
        }
      }
    }
    this.paintTiles(this.highlights, blue, COLORS.move, 0.5, DEPTH.highlight);
    this.paintTiles(this.highlights, red.values(), COLORS.attack, 0.42, DEPTH.highlight);
  }

  /* ---------- Boucle ---------- */

  override update(_time: number, delta: number): void {
    if (!this.alive || !this.state) return;
    this.updateCamera(delta);
    this.atmosphere?.update(delta / 1000);
    this.updateDebug();
    // Le mode vient de changer pendant cette image (menu validé dans l'interface) : on attend la suivante.
    if (this.modeFrame === this.game.loop.frame) return;
    const click = this.pendingClick;
    this.pendingClick = null;
    // Un clic arrivé au moment d'un changement de mode (menu validé à la souris) est ignoré.
    const clickOk = click !== null && this.time.now - this.modeSince > 120;
    switch (this.mode) {
      case 'prep':
        if (clickOk && click) this.prepClick(click.cell, click.right, click.up === true);
        break;
      case 'place':
        this.updatePlace(clickOk ? click : null);
        break;
      case 'browse':
        this.updateBrowse(clickOk ? click : null);
        break;
      case 'move':
        this.updateMove(clickOk ? click : null);
        break;
      case 'target':
        this.updateTarget(clickOk ? click : null);
        break;
      case 'menu':
        if (this.actionMenuOpen && clickOk && click && !click.right) this.clickDuringActionMenu(click.cell);
        break;
      default:
        break;
    }
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.modeSince = this.time.now;
    this.modeFrame = this.game.loop.frame;
    this.lastHover = '';
    this.refreshArrow();
    this.cursor.setVisible(mode !== 'enemy' && mode !== 'end' && mode !== 'prep');
    this.refreshHelp();
    this.refreshHover();
  }

  private refreshHelp(): void {
    const lines: Record<Mode, readonly (readonly [string, string])[]> = {
      prep: [
        ['Clic gauche', 'déployer, retirer'],
        ['Clic droit', 'fiche, équipement, sac'],
        ['Clic sur la carte', 'prendre, poser, échanger'],
      ],
      place: [
        ['Entrée', 'prendre, poser'],
        ['Échap', 'terminé'],
      ],
      browse: [
        ['Entrée', 'choisir'],
        ['R', 'menaces'],
        ['F', 'unité suiv.'],
        ['Échap', 'menu'],
      ],
      move: this.canto
        ? [
            ['Entrée', 'aller ici'],
            ['Échap', 'rester ici'],
          ]
        : [
            ['Entrée', 'aller ici'],
            ['Échap', 'annuler'],
          ],
      target: [
        ['Flèches', 'cible'],
        ['Entrée', 'valider'],
        ['Échap', 'retour'],
      ],
      menu: [
        ['Entrée', 'valider'],
        ['Échap', 'retour'],
      ],
      enemy: [['Maj', 'accélérer']],
      busy: [['Maj', 'accélérer']],
      end: [],
    };
    const actionMenu: readonly (readonly [string, string])[] = [
      ['Entrée', 'valider'],
      ['Clic sur un ennemi', 'attaquer'],
      ['Échap', 'annuler le déplacement'],
    ];
    this.hud.showHelp(this.mode === 'menu' && this.actionMenuOpen ? actionMenu : lines[this.mode]);
  }

  private cursorStep(): Cell | null {
    const dx = (this.actions.justPressed('right') ? 1 : 0) - (this.actions.justPressed('left') ? 1 : 0);
    const dy = (this.actions.justPressed('down') ? 1 : 0) - (this.actions.justPressed('up') ? 1 : 0);
    return dx !== 0 || dy !== 0 ? { x: dx, y: dy } : null;
  }

  /* ---------- Préparation (GDD §9.3, §13.4) ---------- */

  private startPrep(): void {
    const locked = this.state.ambush;
    const plan = planFromState(this.state, locked);
    // Le dernier choix de déploiement de la session, s'il tient encore.
    const remembered = getLastDeployed();
    if (!locked && remembered) {
      const hero = this.party.findIndex((m) => m.hero);
      const wanted = [hero, ...remembered.filter((m) => m !== hero && m < this.party.length)].slice(0, plan.maxDeploy);
      plan.slots.fill(null);
      wanted.forEach((m, i) => {
        if (i < plan.slots.length) plan.slots[i] = m;
      });
    }
    this.plan = plan;
    this.prepCursor = Math.max(0, this.party.findIndex((m) => m.hero));
    this.applyPrep();
    const slots = this.state.deploySlots;
    const center = slots.reduce((acc, c) => ({ x: acc.x + c.x / slots.length, y: acc.y + c.y / slots.length }), { x: 0, y: 0 });
    this.centerCameraOn({ x: Math.round(center.x), y: Math.round(center.y) });
    this.setMode('prep');
    this.hud.openPrep(this.prepView(), {
      onCursor: (m) => {
        this.prepCursor = m;
        this.hud.updatePrep(this.prepView());
        this.paintSlots();
      },
      onToggle: (m) => {
        this.prepCursor = m;
        this.prepMessage = this.plan ? toggleMember(this.plan, this.party, m) : null;
        this.applyPrep();
      },
      onFight: () => void this.startFight(),
      onAuto: () => {
        if (this.plan) autoFormation(this.plan, this.state, this.party, this.gameData);
        this.prepMessage = null;
        this.applyPrep();
        this.hud.toast('Formation : les unités de front devant, les soigneurs derrière.');
      },
      onSheet: (m) => this.openSheet(m),
      onPlace: () => this.startPlace(),
      onBack: this.state.ambush ? null : () => this.retreatFromPrep(),
    });
  }

  /** Reconstruit la compagnie sur la carte d'après le plan et l'équipement. */
  private applyPrep(): void {
    if (!this.plan) return;
    applyPlan(this.state, this.plan, this.party, this.loadouts, this.gameData, this.rules);
    if (this.debugResonance !== null) for (const u of this.state.units) if (u.team === 'player') u.resonance = this.debugResonance;
    for (const [id, view] of [...this.views]) {
      if (!this.state.units.some((u) => u.id === id)) {
        view.container.destroy();
        this.views.delete(id);
      }
    }
    for (const unit of this.state.units) if (unit.team === 'player') this.createView(unit);
    this.paintSlots();
    if (this.mode === 'prep' || this.mode === 'place') this.hud.updatePrep(this.prepView());
  }

  /** Cases bleues de déploiement ; la case prise (glisser) en doré ; le membre choisi sous le curseur. */
  private paintSlots(): void {
    this.clearTiles(this.slotTiles);
    if (!this.plan) return;
    this.paintTiles(this.slotTiles, this.plan.cells, COLORS.slot, 0.6, DEPTH.highlight);
    if (this.prepPick !== null) {
      const c = this.plan.cells[this.prepPick];
      if (c) this.paintTiles(this.slotTiles, [c], COLORS.pick, 0.6, DEPTH.highlight + 0.1);
    }
    const at = this.plan.slots.indexOf(this.prepCursor);
    if (at >= 0 && this.mode !== 'place') {
      const c = this.plan.cells[at];
      if (c) {
        this.cursor.setVisible(true);
        this.cursor.setPosition(this.px(c.x) - 2, this.py(c.y) - 2);
      }
    } else if (this.mode === 'prep') this.cursor.setVisible(false);
  }

  private prepView(): PrepView {
    const plan = this.plan as PrepPlan;
    const deployed = new Set(deployedMembers(plan));
    const roster: ListRow[] = this.party.map((m, i) => {
      const cls = this.gameData.classes.find((c) => c.id === m.class);
      const on = deployed.has(i);
      // Police pixel : « • » marque les unités déployées ; le héros est en or.
      return { label: `${on ? '•' : '  '} ${m.name}`, right: `${shortClass(cls?.name ?? m.class)} ${m.level}`, color: on ? (m.hero ? PALETTE.lumiereDoree : PALETTE.parchemin) : PALETTE.metalClair };
    });
    const member = this.party[this.prepCursor];
    const unit = member
      ? (this.state.units.find((u) => u.memberIndex === this.prepCursor) ?? memberUnit(this.gameData, this.rules, member, this.loadouts[this.prepCursor] ?? { weapon: null, accessory: null, items: [] }, 'preview', this.prepCursor, -1, -1))
      : null;
    if (unit) ensureMapSprite(this, unit.sprite, 'player');
    // Ennemis groupés par type et niveau, boss en tête.
    const groups = new Map<string, { name: string; level: number; count: number; boss: boolean }>();
    for (const u of this.state.units) {
      if (u.team !== 'enemy') continue;
      const key = `${u.kindId}:${u.level}:${u.isBoss}`;
      const g = groups.get(key) ?? { name: u.name, level: u.level, count: 0, boss: u.isBoss };
      g.count += 1;
      groups.set(key, g);
    }
    const enemies = [...groups.values()]
      .sort((a, b) => Number(b.boss) - Number(a.boss) || b.level - a.level)
      .map((g) => ({ text: `${g.name}${g.boss ? ' (boss)' : ''}${g.count > 1 ? ` ×${g.count}` : ''} · Niv ${g.level}`, color: g.boss ? PALETTE.lumiereDoree : PALETTE.parchemin }));
    const warnings: { text: string; color: number }[] = [];
    const enemyWaves = this.state.reinforcements.filter((r) => r.team === 'enemy').map((r) => r.turn);
    if (enemyWaves.length > 0) warnings.push({ text: `Renforts ennemis : tours ${enemyWaves.join(' et ')}`, color: PALETTE.braise });
    for (const r of this.state.reinforcements.filter((x) => x.team === 'ally')) warnings.push({ text: `Allié vert : ${r.units.map((u) => u.name).join(', ')} (tour ${r.turn})`, color: ALLY_OUTLINE });
    return {
      title: this.state.name,
      objective: this.objectiveText(this.state.units.find((u) => u.isBoss)),
      roster,
      deployed: deployed.size,
      maxDeploy: plan.maxDeploy,
      cursor: this.prepCursor,
      unit,
      extra: unit ? this.unitExtra(unit) : null,
      enemies,
      warnings,
      locked: plan.locked,
      canRetreat: !this.state.ambush,
      message: this.prepMessage,
    };
  }

  /** Clic sur la carte pendant la préparation : prendre une unité, la poser sur une autre case bleue (échange). */
  private prepClick(cell: Cell, right: boolean, up: boolean): void {
    const plan = this.plan;
    if (!plan) return;
    if (right) {
      this.prepPick = null;
      this.paintSlots();
      return;
    }
    const slot = plan.cells.findIndex((c) => c.x === cell.x && c.y === cell.y);
    if (slot < 0) {
      if (!up) {
        this.prepPick = null;
        this.paintSlots();
      }
      return;
    }
    const member = plan.slots[slot] ?? null;
    if (this.prepPick === null) {
      if (up) return;
      if (member === null) return;
      if (plan.locked) {
        this.prepMessage = 'Embuscade : la compagnie ne peut pas se replacer.';
        this.hud.updatePrep(this.prepView());
        return;
      }
      this.prepPick = slot;
      this.prepCursor = member;
      this.paintSlots();
      this.hud.updatePrep(this.prepView());
      return;
    }
    if (slot === this.prepPick) {
      // Relâché sur sa propre case : on garde la prise (un second clic posera l'unité).
      if (!up) {
        this.prepPick = null;
        this.paintSlots();
      }
      return;
    }
    this.prepMessage = swapSlots(plan, this.prepPick, slot);
    this.prepPick = null;
    this.applyPrep();
  }

  /** Placement au clavier : le curseur parcourt la carte, Entrée prend et pose. */
  private startPlace(): void {
    if (!this.plan) return;
    this.hud.setPrepPaused(true);
    this.setMode('place');
    this.cursor.setVisible(true);
    const at = this.plan.slots.indexOf(this.prepCursor);
    this.setCursor(this.plan.cells[at >= 0 ? at : 0] ?? this.cursorCell);
  }

  private updatePlace(click: { cell: Cell; right: boolean; up?: boolean } | null): void {
    const step = this.cursorStep();
    if (step) this.setCursor({ x: this.cursorCell.x + step.x, y: this.cursorCell.y + step.y });
    if (click && !click.up) {
      this.setCursor(click.cell);
      this.prepClick(click.cell, click.right, false);
      return;
    }
    if (this.actions.justPressed('cancel')) {
      if (this.prepPick !== null) {
        this.prepPick = null;
        this.paintSlots();
        return;
      }
      this.hud.setPrepPaused(false);
      this.setMode('prep');
      this.paintSlots();
      return;
    }
    if (this.actions.justPressed('confirm')) this.prepClick(this.cursorCell, false, false);
  }

  /** Fiche du membre : caractéristiques, équipement (un clic change), sac en cases. */
  private sheetView(member: number, message: string | null = null): SheetView | null {
    const def = this.party[member];
    const cls = def ? this.gameData.classes.find((c) => c.id === def.class) : undefined;
    const loadout = this.loadouts[member];
    if (!def || !cls || !loadout || !this.plan) return null;
    const unit = memberUnit(this.gameData, this.rules, def, loadout, 'sheet', member, 0, 0);
    const max = this.gameData.balance.prep.maxItems;
    const itemName = (id: string): string => this.gameData.consumables.find((c) => c.id === id)?.name ?? id;
    const slots: (string | null)[] = [];
    for (const st of loadout.items) for (let i = 0; i < st.qty; i++) slots.push(itemName(st.item));
    while (slots.length < max) slots.push(null);
    const bag = this.gameData.consumables
      .filter((c) => c.battle && this.convoy.some((st) => st.item === c.id))
      .map((c) => {
        const left = Math.max(0, convoyLeft(this.convoy, this.loadouts, c.id));
        return { id: c.id, label: c.name, left, enabled: left > 0 && carried(loadout) < max };
      });
    this.sheetBag = bag.map((b) => b.id);
    const range = unit.weapon.range[0] === unit.weapon.range[1] ? `${unit.weapon.range[0]}` : `${unit.weapon.range[0]}-${unit.weapon.range[1]}`;
    const accessory = unit.accessory ? (this.gameData.accessories.find((a) => a.id === unit.accessory)?.name ?? unit.accessory) : 'aucun';
    const extra = this.unitExtra(unit);
    const s = unit.stats;
    return {
      name: unit.name,
      kind: unit.kindName,
      level: unit.level,
      sprite: unit.sprite,
      deployed: this.plan.slots.includes(member),
      stats: [['PV', s.pv], ['Fo', s.fo], ['Mag', s.mag], ['Dex', s.dex], ['Vit', s.vit], ['Déf', s.def], ['Rés', s.res], ['Chc', s.chc], ['Mob', s.mob]],
      weapon: { name: unit.weapon.name, range, canChange: weaponChoices(this.gameData, cls, this.convoy, this.loadouts, member).length > 1 },
      accessory: { name: accessory, canChange: accessoryChoices(this.gameData, this.convoy, this.loadouts, member).length > 1 || loadout.accessory !== null },
      skill: extra.skill ? `${extra.skill.name} · ${extra.skill.cost}` : null,
      slots,
      bag,
      count: `${carried(loadout)}/${max} objets`,
      message,
    };
  }

  private sheetBag: string[] = [];

  /** Clic droit sur un membre (ou « Équipement », « Objets ») : sa fiche. */
  private openSheet(member: number): void {
    this.prepCursor = member;
    const refresh = (message: string | null = null): void => {
      this.applyPrep();
      const view = this.sheetView(member, message);
      if (view) this.hud.updateSheet(view);
    };
    const m = this.party[member];
    const cls = m ? this.gameData.classes.find((c) => c.id === m.class) : undefined;
    const loadout = this.loadouts[member];
    const view = this.sheetView(member);
    if (!m || !cls || !loadout || !view) return;
    this.hud.setPrepPaused(true);
    this.hud.openSheet(view, {
      onWeapon: () => {
        const weapons = weaponChoices(this.gameData, cls, this.convoy, this.loadouts, member);
        const next = weapons[(weapons.indexOf(loadout.weapon ?? cls.startingWeapon) + 1) % weapons.length] as string;
        loadout.weapon = next === cls.startingWeapon ? null : next;
        refresh();
      },
      onAccessory: () => {
        const accessories = accessoryChoices(this.gameData, this.convoy, this.loadouts, member);
        const list = loadout.accessory !== null && !accessories.includes(loadout.accessory) ? [...accessories, loadout.accessory] : accessories;
        loadout.accessory = list[(list.indexOf(loadout.accessory) + 1) % list.length] ?? null;
        refresh();
      },
      onTake: (slot) => {
        const flat: string[] = [];
        for (const st of loadout.items) for (let i = 0; i < st.qty; i++) flat.push(st.item);
        const item = flat[slot];
        if (item) takeItem(this.loadouts, member, item);
        refresh();
      },
      onGive: (index) => {
        const id = this.sheetBag[index];
        refresh(id ? giveItem(this.loadouts, this.convoy, member, id, this.gameData.balance.prep.maxItems) : null);
      },
      onClose: () => {
        this.hud.closeSheet();
        this.hud.setPrepPaused(false);
      },
    });
  }

  private async startFight(): Promise<void> {
    if (!this.plan) return;
    if (deployedMembers(this.plan).length === 0) return;
    setLastDeployed(deployedMembers(this.plan));
    this.hud.closePrep();
    this.hud.closeMenu();
    this.hud.closeList();
    this.clearTiles(this.slotTiles);
    this.prepPick = null;
    this.plan = null;
    this.setMode('busy');
    this.focusHero();
    await this.openingSequence();
  }

  private retreatFromPrep(): void {
    this.hud.closePrep();
    this.setMode('end');
    this.hud.toast('La compagnie renonce au combat.');
    this.settle('retreat');
    this.leave();
  }

  /** Lignes ajoutées à la fiche d'une unité : compétence, ressource, accessoire, objets, statuts. */
  private unitExtra(unit: BattleUnit): UnitExtra {
    const skillId = unit.skills[0];
    const skill = skillId ? this.rules.skills.get(skillId) : undefined;
    const cls = this.gameData.classes.find((c) => c.id === unit.kindId);
    const resource = cls?.resource?.perBattle !== undefined ? `${cls.resource.name} ${unit.resources[cls.resource.id] ?? 0}/${cls.resource.perBattle}` : null;
    return {
      skill: skill ? { name: skill.name, cost: costLabel(skill, cls?.resource?.name), blocker: unit.team === 'player' ? skillBlocker(this.state, unit, skill) : null } : null,
      resource: unit.team === 'player' ? resource : null,
      items: unit.items.map((s) => `${this.gameData.consumables.find((c) => c.id === s.item)?.name ?? s.item} ×${s.qty}`),
      statuses: unit.mods.map((m) => {
        const def = this.rules.statuses.get(m.status);
        return { name: def?.name ?? m.status, color: Phaser.Display.Color.HexStringToColor(def?.color ?? '#ffffff').color };
      }),
      accessory: unit.accessory ? (this.gameData.accessories.find((a) => a.id === unit.accessory)?.name ?? unit.accessory) : null,
    };
  }

  /* ---------- Exploration de la carte (phase du joueur) ---------- */

  private updateBrowse(click: { cell: Cell; right: boolean } | null): void {
    const step = this.cursorStep();
    if (step) this.setCursor({ x: this.cursorCell.x + step.x, y: this.cursorCell.y + step.y });
    if (this.actions.justPressed('threat')) {
      this.showAllThreat = !this.showAllThreat;
      this.refreshThreat();
    }
    if (this.actions.justPressed('nextUnit')) this.jumpToNextReady();
    if (this.actions.justPressed('menu')) {
      this.openMapMenu();
      return;
    }
    // Clic droit : seulement effacer les zones de menace marquées ; le menu de combat ne s'ouvre qu'avec Échap (ou Tab).
    if (click?.right) {
      if (this.marked.size > 0) {
        this.marked.clear();
        this.refreshThreat();
      }
      return;
    }
    if (this.actions.justPressed('cancel')) {
      if (this.marked.size > 0) {
        this.marked.clear();
        this.refreshThreat();
      } else {
        // Échap sans rien à annuler : le menu de combat (fin du tour, menaces, vitesse, retraite).
        this.openMapMenu();
      }
      return;
    }
    if (click) this.setCursor(click.cell);
    if (!click && !this.actions.justPressed('confirm')) return;

    const unit = unitAt(this.state, this.cursorCell.x, this.cursorCell.y);
    if (unit && unit.team === 'player' && !unit.acted) {
      this.select(unit);
    } else if (unit && unit.team === 'enemy') {
      if (this.marked.has(unit.id)) this.marked.delete(unit.id);
      else this.marked.add(unit.id);
      this.refreshThreat();
    } else if (unit && unit.team === 'ally') {
      // Les alliés verts ne se commandent pas : on montre leur fiche.
      this.hud.showDetails(unit, this.unitExtra(unit));
      this.hud.toast(`${unit.name} est un allié : il agit seul pendant la phase alliée.`);
    }
  }

  private jumpToNextReady(): void {
    const ready = readyUnits(this.state);
    if (ready.length === 0) return;
    const current = ready.findIndex((u) => u.x === this.cursorCell.x && u.y === this.cursorCell.y);
    const next = ready[(current + 1) % ready.length] as BattleUnit;
    this.setCursor(next);
  }

  /* ---------- Phase du joueur ---------- */

  private select(unit: BattleUnit): void {
    this.selected = unit;
    this.reach = reachable(this.state, unit);
    this.showMoveRange(unit, this.reach);
    this.hud.showDetails(unit, this.unitExtra(unit));
    this.playReady(unit);
    this.setMode('move');
    this.refreshArrow();
  }

  private deselect(): void {
    const unit = this.selected;
    this.selected = null;
    this.reach = null;
    this.hud.showDetails(null);
    this.clearTiles(this.highlights);
    if (unit) {
      this.views.get(unit.id)?.sprite.anims.play(BATTLE_TEX.msIdle(unit.sprite, unit.team));
      this.setCursor(unit);
    }
  }

  private updateMove(click: { cell: Cell; right: boolean } | null): void {
    const unit = this.selected;
    const reach = this.reach;
    if (!unit || !reach) return;
    const step = this.cursorStep();
    if (step) this.setCursor({ x: this.cursorCell.x + step.x, y: this.cursorCell.y + step.y });
    if (click?.right || this.actions.justPressed('cancel')) {
      if (this.canto) {
        // Pas de marée : rester sur place termine le tour.
        void this.finishAction(() => waitUnit(this.state, unit.id));
        return;
      }
      this.deselect();
      this.setMode('browse');
      return;
    }
    if (click) this.setCursor(click.cell);
    if (!click && !this.actions.justPressed('confirm')) return;

    const cell = this.cursorCell;
    if (cell.x === unit.x && cell.y === unit.y) {
      if (this.canto) void this.finishAction(() => waitUnit(this.state, unit.id));
      else this.openActionMenu();
      return;
    }
    if (reach.stops.some((s) => s.x === cell.x && s.y === cell.y)) {
      if (this.canto) void this.finishAction(() => moveUnit(this.state, unit.id, cell));
      else void this.moveSelected(cell, null);
      return;
    }
    if (this.canto) return;
    // Clic sur un ennemi atteignable : on va sur la case la plus proche d'où il est à portée.
    const enemy = unitAt(this.state, cell.x, cell.y);
    if (enemy && hostile(enemy.team, unit.team)) {
      const from = this.attackStop(unit, reach, enemy);
      if (from) void this.moveSelected(from, enemy);
    }
  }

  /** Case atteignable la moins chère d'où l'ennemi est à portée de l'arme. */
  private attackStop(unit: BattleUnit, reach: Reach, enemy: BattleUnit): Cell | undefined {
    return reach.stops
      .filter((s) => inWeaponRange(unit, s, enemy) && !(unitAt(this.state, s.x, s.y) && (s.x !== unit.x || s.y !== unit.y)))
      .sort((a, b) => (reach.cost.get(cellIndex(this.state.map, a.x, a.y)) ?? 0) - (reach.cost.get(cellIndex(this.state.map, b.x, b.y)) ?? 0))[0];
  }

  /** Dessine la flèche du départ jusqu'à la case visée par le curseur (case libre atteignable, ou ennemi à portée). */
  private refreshArrow(): void {
    this.clearTiles(this.arrowTiles);
    const unit = this.selected;
    const reach = this.reach;
    if (this.mode !== 'move' || !unit || !reach) return;
    const cell = this.cursorCell;
    let goal: Cell | undefined;
    if (reach.stops.some((s) => s.x === cell.x && s.y === cell.y)) goal = cell;
    else if (!this.canto) {
      const enemy = unitAt(this.state, cell.x, cell.y);
      if (enemy && hostile(enemy.team, unit.team)) goal = this.attackStop(unit, reach, enemy);
    }
    if (!goal || (goal.x === unit.x && goal.y === unit.y)) return;
    const path = pathTo(reach, this.state.map, goal);
    if (path.length < 2) return;
    // Directions en quarts de tour dans le sens horaire depuis l'est : 0 E, 1 S, 2 O, 3 N.
    const dir = (a: Cell, b: Cell): number => (b.x > a.x ? 0 : b.y > a.y ? 1 : b.x < a.x ? 2 : 3);
    path.forEach((c, i) => {
      const next = path[i + 1];
      const prev = path[i - 1];
      let kind: 'line' | 'corner' | 'head' | 'start';
      let turns: number;
      if (!prev && next) {
        kind = 'start';
        turns = dir(c, next);
      } else if (prev && !next) {
        kind = 'head';
        turns = dir(prev, c);
      } else if (prev && next) {
        const from = dir(c, prev); // côté par lequel on arrive
        const to = dir(c, next);
        if ((from + 2) % 4 === to) {
          kind = 'line';
          turns = to % 2;
        } else {
          kind = 'corner';
          // Le virage de base relie l'ouest (2) et le sud (1) ; chaque quart de tour horaire décale les deux côtés de +1.
          const sides = [from, to];
          turns = [0, 1, 2, 3].find((k) => sides.includes((2 + k) % 4) && sides.includes((1 + k) % 4)) ?? 0;
        }
      } else return;
      const image = this.add
        .image(this.px(c.x) + T / 2, this.py(c.y) + T / 2, BATTLE_TEX.arrow(kind))
        .setAngle(turns * 90)
        .setDepth(DEPTH.highlight + 0.5)
        .setAlpha(0.95);
      this.arrowTiles.push(image);
    });
  }

  private async moveSelected(to: Cell, thenTarget: BattleUnit | null): Promise<void> {
    const unit = this.selected;
    if (!unit) return;
    this.setMode('busy');
    this.clearTiles(this.highlights);
    if (to.x !== unit.x || to.y !== unit.y) {
      const events = moveUnit(this.state, unit.id, to);
      await this.playEvents(events);
    }
    if (!this.alive) return;
    this.setCursor(unit);
    if (thenTarget) this.startTargeting({ kind: 'attack', cells: targetsFrom(this.state, unit, unit).map((u) => ({ x: u.x, y: u.y })), free: false }, thenTarget);
    else this.openActionMenu();
  }

  private openActionMenu(): void {
    const unit = this.selected;
    if (!unit) return;
    this.clearTiles(this.highlights);
    this.clearTiles(this.areaTiles);
    this.playReady(unit);
    const targets = targetsFrom(this.state, unit, unit);
    // Portée d'attaque depuis la case choisie.
    this.paintTiles(this.highlights, cellsInRange(this.state.map, unit, unit.weapon.range), COLORS.attack, 0.38, DEPTH.highlight);
    const items: MenuItem[] = [{ label: 'Attaquer', enabled: targets.length > 0, onSelect: () => this.startTargeting({ kind: 'attack', cells: targets.map((t) => ({ x: t.x, y: t.y })), free: false }, null) }];
    const skillId = unit.skills[0];
    if (skillId) {
      const skill = skillDef(this.rules, skillId);
      const cells = skillTargets(this.state, unit, skill);
      const ready = skillBlocker(this.state, unit, skill) === null && cells.length > 0;
      items.push({
        // Le coût est dans la fiche (à côté) : le grand menu reste lisible.
        label: skill.name,
        enabled: ready,
        onSelect: () => this.startTargeting({ kind: 'skill', skillId, cells, free: skill.target === 'case' }, null),
      });
    }
    const usable = usableItems(this.state, unit, this.rules).filter((u) => u.targets.length > 0);
    items.push({ label: 'Objet', enabled: usable.length > 0, onSelect: () => this.openItemMenu() });
    if (unit.weapon.heals !== undefined) {
      const wounded = healTargets(this.state, unit);
      items.push({ label: 'Soigner', enabled: wounded.length > 0, onSelect: () => this.startTargeting({ kind: 'heal', cells: wounded.map((u) => ({ x: u.x, y: u.y })), free: false }, null) });
    }
    items.push({ label: 'Attendre', onSelect: () => void this.finishAction(() => waitUnit(this.state, unit.id)) });
    this.actionMenuOpen = true;
    this.hoverTarget = null;
    this.setMode('menu');
    this.hud.openMenu({
      title: unit.name,
      items,
      large: true,
      onCancel: () => {
        this.closeActionMenu();
        undoMove(this.state, unit.id);
        this.syncUnit(unit);
        this.select(unit);
        this.setCursor(unit);
      },
    });
  }

  /** Sous-menu « Objet » : les objets portés utilisables maintenant. */
  private openItemMenu(): void {
    const unit = this.selected;
    if (!unit) return;
    this.closeActionMenu();
    const usable = usableItems(this.state, unit, this.rules);
    const rows: ListRow[] = usable.map((u) => {
      const def = this.rules.consumables.get(u.item);
      return { label: def?.name ?? u.item, right: `×${u.qty}`, enabled: u.targets.length > 0 };
    });
    this.setMode('menu');
    this.hud.openList(
      `Objets de ${unit.name}`,
      rows,
      (index) => {
        const entry = usable[index];
        if (!entry) return;
        this.hud.closeList();
        this.startTargeting({ kind: 'item', item: entry.item, cells: entry.targets.map((t) => ({ x: t.x, y: t.y })), free: false }, null);
      },
      () => {
        this.hud.closeList();
        this.openActionMenu();
      },
      'Une action : le tour de l’unité se termine.',
    );
  }

  /** Ferme le menu d'action (et la prévision affichée au survol). */
  private closeActionMenu(): void {
    this.actionMenuOpen = false;
    if (this.hoverTarget) this.hud.showForecast(null, null, null);
    this.hoverTarget = null;
    this.hud.closeMenu();
  }

  /** Menu d'action ouvert : survoler un ennemi à portée montre la prévision de l'échange. */
  private hoverActionTarget(cell: Cell | null): void {
    const unit = this.selected;
    if (!unit) return;
    const target = cell ? unitAt(this.state, cell.x, cell.y) : null;
    const valid = target && hostile(target.team, unit.team) && inWeaponRange(unit, unit, target) ? target : null;
    if (valid === this.hoverTarget) return;
    this.hoverTarget = valid;
    // Le curseur ne bouge pas (les fenêtres changeraient de côté sous le menu) : seule la prévision s'affiche.
    if (valid) this.hud.showForecast(forecast(this.state, unit, valid, this.rules), unit, valid);
    else this.hud.showForecast(null, null, null);
  }

  /** Menu d'action ouvert : un clic sur un ennemi à portée lance l'attaque. */
  private clickDuringActionMenu(cell: Cell): void {
    const unit = this.selected;
    if (!unit) return;
    const target = unitAt(this.state, cell.x, cell.y);
    if (!target || !hostile(target.team, unit.team) || !inWeaponRange(unit, unit, target)) return;
    this.closeActionMenu();
    this.hud.showForecast(null, null, null);
    void this.finishAction(() => attackUnit(this.state, unit.id, target.id, this.rules));
  }

  /* ---------- Ciblage : attaque, compétence, objet, soin ---------- */

  private startTargeting(targeting: Targeting, preferred: BattleUnit | null): void {
    const unit = this.selected;
    if (!unit) return;
    this.closeActionMenu();
    const cells = [...targeting.cells].sort((a, b) => a.y - b.y || a.x - b.x);
    if (cells.length === 0) {
      this.openActionMenu();
      return;
    }
    this.targeting = { ...targeting, cells };
    this.clearTiles(this.highlights);
    const color = this.targetColor(targeting);
    this.paintTiles(this.highlights, cells, color, 0.45, DEPTH.highlight);
    this.setMode('target');
    const i = preferred ? cells.findIndex((c) => c.x === preferred.x && c.y === preferred.y) : 0;
    this.focusTarget(Math.max(0, i));
  }

  private targetColor(t: Targeting): number {
    if (t.kind === 'attack') return COLORS.attack;
    if (t.kind === 'heal') return COLORS.heal;
    if (t.kind === 'item') return this.rules.consumables.get(t.item ?? '')?.battle?.target === 'ennemi' ? COLORS.attack : COLORS.heal;
    const skill = this.rules.skills.get(t.skillId ?? '');
    if (!skill) return COLORS.skill;
    if (skill.target === 'ennemi') return COLORS.attack;
    if (skill.target === 'allie') return COLORS.heal;
    return COLORS.skill;
  }

  private focusTarget(index: number): void {
    const t = this.targeting;
    const n = t?.cells.length ?? 0;
    if (!t || n === 0) return;
    this.targetIndex = ((index % n) + n) % n;
    const cell = t.cells[this.targetIndex] as Cell;
    this.setCursor(cell);
    this.showTargetPreview(cell);
  }

  /** Curseur libre (compétence sur une case) : l'aperçu suit la case si elle est valable. */
  private focusFree(): void {
    const t = this.targeting;
    if (!t) return;
    const i = t.cells.findIndex((c) => c.x === this.cursorCell.x && c.y === this.cursorCell.y);
    if (i >= 0) {
      this.targetIndex = i;
      this.showTargetPreview(this.cursorCell);
    } else {
      this.clearTiles(this.areaTiles);
      this.hud.showSkillPreview(null);
      this.hud.showForecast(null, null, null);
    }
  }

  /** Prévision de l'action sur la case visée (échange, zone de la compétence, soin, objet). */
  private showTargetPreview(cell: Cell): void {
    const unit = this.selected;
    const t = this.targeting;
    if (!unit || !t) return;
    this.clearTiles(this.areaTiles);
    const target = unitAt(this.state, cell.x, cell.y);
    if (target) this.hud.showUnit(target);
    if (t.kind === 'attack' && target) {
      this.hud.showSkillPreview(null);
      this.hud.showForecast(forecast(this.state, unit, target, this.rules), unit, target);
      return;
    }
    this.hud.showForecast(null, null, null);
    if (t.kind === 'skill' && t.skillId) {
      const skill = skillDef(this.rules, t.skillId);
      const cls = this.gameData.classes.find((c) => c.id === unit.kindId);
      if (skill.effects.some((e) => e.kind === 'frappe') && target) {
        const f = skillForecast(this.state, unit, skill, target, this.rules);
        if (f) {
          this.hud.showSkillPreview(null);
          this.hud.showForecast(f, unit, target);
          return;
        }
      }
      const area = skillArea(this.state, unit, skill, cell);
      if (skill.area) this.paintTiles(this.areaTiles, area, COLORS.area, 0.62, DEPTH.area);
      const lines = previewSkill(this.state, unit, skill, cell, this.rules).map((line) => this.previewLine(unit, line));
      const extra = skill.effects.some((e) => e.kind === 'invocation') ? [{ name: 'Golem de pierre', text: '20 PV · 3 tours', color: PALETTE.pierre }] : skill.effects.some((e) => e.kind === 'terrain') ? [{ name: 'Ronces', text: `${area.length} cases · 3 tours`, color: PALETTE.olive }] : [];
      this.hud.showSkillPreview({ title: skill.name, subtitle: costLabel(skill, cls?.resource?.name), description: skill.description, lines: [...lines, ...extra] });
      return;
    }
    if (t.kind === 'heal' && target) {
      const amount = Math.min(target.stats.pv - target.hp, staffHealAmount(unit));
      this.hud.showSkillPreview({ title: 'Soigner', subtitle: unit.weapon.name, description: `Rend ${staffHealAmount(unit)} PV (bâton ${unit.weapon.heals} + Mag/2).`, lines: [{ name: target.name, text: `+${amount} PV → ${target.hp + amount}/${target.stats.pv}`, color: COLORS.heal }] });
      return;
    }
    if (t.kind === 'item' && t.item && target) {
      const def = this.rules.consumables.get(t.item);
      const b = def?.battle;
      const parts: string[] = [];
      if (b?.heal) {
        const healed = Math.min(target.stats.pv - target.hp, b.heal);
        parts.push(`+${healed} PV → ${target.hp + healed}/${target.stats.pv}`);
      }
      if (b?.damage) parts.push(`${Math.min(target.hp, b.damage)} dégâts`);
      if (b?.cleanse) parts.push('purge');
      if (b?.status) parts.push(this.rules.statuses.get(b.status.id)?.name ?? b.status.id);
      this.hud.showSkillPreview({ title: def?.name ?? t.item, subtitle: 'Objet · une action', description: def?.description ?? '', lines: [{ name: target.name, text: parts.join(', '), color: b?.target === 'ennemi' ? PALETTE.braise : COLORS.heal }] });
    }
  }

  private previewLine(caster: BattleUnit, line: { unit: BattleUnit; damage?: number; heal?: number; status?: string; immune?: boolean }): { name: string; text: string; color: number } {
    const parts: string[] = [];
    if (line.damage !== undefined) parts.push(`${Math.min(line.unit.hp, line.damage)} dég.`);
    if (line.heal !== undefined) parts.push(`+${line.heal} PV`);
    if (line.status !== undefined) parts.push(line.immune ? 'immunisé' : (this.rules.statuses.get(line.status)?.name ?? line.status));
    const friendlyHit = line.damage !== undefined && !hostile(line.unit.team, caster.team);
    const color = friendlyHit ? PALETTE.braise : line.heal !== undefined ? COLORS.heal : line.damage !== undefined ? PALETTE.parchemin : PALETTE.lumiereDoree;
    return { name: `${line.unit.name}${friendlyHit ? ' (allié !)' : ''}`, text: parts.join(', ') || '—', color };
  }

  private updateTarget(click: { cell: Cell; right: boolean } | null): void {
    const unit = this.selected;
    const t = this.targeting;
    if (!unit || !t) return;
    if (click?.right || this.actions.justPressed('cancel')) {
      this.leaveTargeting();
      this.setCursor(unit);
      this.openActionMenu();
      return;
    }
    if (t.free) {
      const step = this.cursorStep();
      if (step) {
        this.setCursor({ x: this.cursorCell.x + step.x, y: this.cursorCell.y + step.y });
        this.focusFree();
      }
    } else {
      if (this.actions.justPressed('right') || this.actions.justPressed('down')) this.focusTarget(this.targetIndex + 1);
      if (this.actions.justPressed('left') || this.actions.justPressed('up')) this.focusTarget(this.targetIndex - 1);
    }
    let confirm = this.actions.justPressed('confirm');
    if (click) {
      const i = t.cells.findIndex((c) => c.x === click.cell.x && c.y === click.cell.y);
      if (i >= 0) {
        if (t.free) this.setCursor(click.cell);
        this.focusTarget(i);
        confirm = true;
      }
    }
    if (!confirm) return;
    const cell = t.free ? this.cursorCell : t.cells[this.targetIndex];
    if (!cell || !t.cells.some((c) => c.x === cell.x && c.y === cell.y)) return;
    const target = unitAt(this.state, cell.x, cell.y);
    this.leaveTargeting();
    switch (t.kind) {
      case 'attack':
        if (target) void this.finishAction(() => attackUnit(this.state, unit.id, target.id, this.rules));
        break;
      case 'skill':
        if (t.skillId) void this.finishAction(() => skillAction(this.state, unit.id, t.skillId as string, cell, this.rules));
        break;
      case 'item':
        if (t.item && target) void this.finishAction(() => itemAction(this.state, unit.id, t.item as string, target.id, this.rules));
        break;
      case 'heal':
        if (target) void this.finishAction(() => healAction(this.state, unit.id, target.id, this.rules));
        break;
    }
  }

  private leaveTargeting(): void {
    this.targeting = null;
    this.clearTiles(this.areaTiles);
    this.hud.showForecast(null, null, null);
    this.hud.showSkillPreview(null);
  }

  /** Joue l'action choisie, puis passe à la suite (déplacement offert après « Pas de marée », fin de phase…). */
  private async finishAction(command: () => BattleEvent[]): Promise<void> {
    const unit = this.selected;
    this.closeActionMenu();
    this.hud.showDetails(null);
    this.clearTiles(this.highlights);
    this.clearTiles(this.areaTiles);
    this.setMode('busy');
    const wasCanto = this.canto;
    this.canto = false;
    const events = command();
    await this.playEvents(events);
    if (!this.alive) return;
    this.syncAll();
    this.refreshThreat();
    if (this.state.outcome !== 'ongoing') {
      this.selected = null;
      this.reach = null;
      await this.finish();
      return;
    }
    // « Pas de marée » : l'unité peut encore marcher (sans revenir en arrière).
    if (!wasCanto && unit && unit.hp > 0 && unit.cantoLeft > 0 && !unit.acted) {
      this.canto = true;
      this.selected = unit;
      this.reach = reachable(this.state, unit);
      this.showMoveRange(unit, this.reach);
      this.setCursor(unit);
      this.setMode('move');
      this.hud.toast(`${unit.name} peut encore se déplacer de ${unit.cantoLeft} cases.`);
      return;
    }
    this.selected = null;
    this.reach = null;
    this.hud.showDetails(null);
    if (unit) this.syncUnit(unit);
    if (phaseComplete(this.state)) {
      await this.nextPhase();
      return;
    }
    if (unit) this.setCursor(unit);
    this.setMode('browse');
  }

  /* ---------- Menu de carte ---------- */

  private openMapMenu(): void {
    this.setMode('menu');
    const threatLabel = (): string => `Menaces : ${this.showAllThreat ? 'oui' : 'non'}`;
    const animLabel = (): string => `Vitesse : ${ANIM_SPEED_SHORT[this.speed]}`;
    const close = (): void => {
      this.hud.closeMenu();
      this.setMode('browse');
    };
    const items: MenuItem[] = [
      {
        label: 'Fin du tour',
        onSelect: () => {
          this.hud.closeMenu();
          this.setMode('busy');
          void this.nextPhase();
        },
      },
      {
        label: threatLabel(),
        onSelect: () => {
          this.showAllThreat = !this.showAllThreat;
          this.refreshThreat();
          close();
        },
      },
      {
        label: animLabel(),
        onSelect: () => {
          this.speed = nextAnimSpeed(this.speed);
          saveAnimSpeed(this.speed);
          this.hud.toast(`Animations : ${ANIM_SPEED_LABEL[this.speed]}`);
          close();
        },
      },
      { label: 'Retraite', onSelect: () => this.retreat() },
    ];
    this.hud.openMenu({ title: 'Menu', items, onCancel: close, centered: true });
  }

  private retreat(): void {
    this.hud.closeMenu();
    this.setMode('end');
    this.hud.toast('La compagnie se retire du combat.');
    this.settle('retreat');
    this.leave();
  }

  /* ---------- Phases ---------- */

  private async openingSequence(): Promise<void> {
    this.setMode('busy');
    await this.wait(350);
    if (this.state.ambush) {
      // Embuscade subie (GDD §7.4) : les ennemis frappent les premiers.
      await this.hud.phaseBanner('enemy', this.state.turn, this.dur(MS.banner, 400));
      this.hud.toast('Embuscade ! La compagnie est prise au dépourvu.');
      if (!this.alive) return;
      await this.runAiPhase();
      return;
    }
    await this.hud.phaseBanner('player', this.state.turn, this.dur(MS.banner, 400));
    if (this.state.initiative) this.hud.toast('Embuscade réussie : l’ennemi est pris de court !');
    if (!this.alive) return;
    this.focusHero();
    this.setMode('browse');
  }

  private async nextPhase(): Promise<void> {
    this.setMode('busy');
    this.marked.clear();
    const events = endPhase(this.state, this.rules);
    await this.playEvents(events);
    if (!this.alive) return;
    this.syncAll();
    this.refreshThreat();
    if (this.state.outcome !== 'ongoing') {
      await this.finish();
      return;
    }
    if (this.state.phase !== 'player') {
      await this.runAiPhase();
    } else {
      const hero = this.state.units.find((u) => u.isHero && u.hp > 0) ?? readyUnits(this.state)[0];
      if (hero) this.setCursor(hero);
      this.setMode('browse');
      // Toute la compagnie est gelée : la phase passe d'elle-même.
      if (phaseComplete(this.state)) await this.nextPhase();
    }
  }

  /** Phase alliée (IA des alliés verts) ou ennemie : chaque unité joue le plan de son IA. */
  private async runAiPhase(): Promise<void> {
    this.setMode('enemy');
    const team = this.state.phase;
    for (const unit of [...readyUnits(this.state)]) {
      if (!this.alive || this.state.outcome !== 'ongoing') break;
      if (unit.hp <= 0 || unit.acted) continue;
      const plan = team === 'ally' ? planAllyAction(this.state, unit.id, this.rules) : planEnemyAction(this.state, unit.id, this.rules);
      this.cursor.setVisible(true);
      this.setCursorQuiet(unit);
      this.hud.showUnit(unit);
      await this.wait(MS.enemyPause);
      if (plan.to.x !== unit.x || plan.to.y !== unit.y) {
        await this.playEvents(moveUnit(this.state, unit.id, plan.to));
        this.setCursorQuiet(unit);
      }
      if (plan.targetId) await this.playEvents(attackUnit(this.state, unit.id, plan.targetId, this.rules));
      else if (plan.healId) await this.playEvents(healAction(this.state, unit.id, plan.healId, this.rules));
      else if (plan.skill) await this.playEvents(skillAction(this.state, unit.id, plan.skill.id, plan.skill.cell, this.rules));
      else waitUnit(this.state, unit.id);
      this.syncAll();
      await this.wait(MS.between);
    }
    this.cursor.setVisible(false);
    if (!this.alive) return;
    if (this.state.outcome !== 'ongoing') {
      await this.finish();
      return;
    }
    await this.nextPhase();
  }

  private setCursorQuiet(cell: Cell): void {
    this.cursorCell = { x: cell.x, y: cell.y };
    this.cursor.setPosition(this.px(cell.x) - 2, this.py(cell.y) - 2);
    this.followCell(this.cursorCell);
    this.hud.showTerrain(terrainAt(this.state.map, cell.x, cell.y));
  }

  /* ---------- Événements → animations ---------- */

  private async playEvents(events: readonly BattleEvent[]): Promise<void> {
    for (const event of events) {
      if (!this.alive) return;
      switch (event.type) {
        case 'move':
          await this.animateMove(event.unitId, event.path);
          break;
        case 'combat':
          await this.animateCombat(event.attackerId, event.defenderId, event.strikes);
          break;
        case 'ko':
          await this.animateKo(event.unitId);
          break;
        case 'heal': {
          const unit = getUnit(this.state, event.unitId);
          if (event.sourceId) {
            const source = getUnit(this.state, event.sourceId);
            await this.projectile(source, unit, PALETTE.lumiereDoree);
            this.sparks.setParticleTint(COLORS.heal);
            this.sparks.explode(10, this.px(unit.x) + T / 2, this.py(unit.y) + T - 12);
          }
          this.floatText(unit, `+${event.amount}`, COLORS.heal);
          this.syncUnit(unit);
          if (event.sourceId) await this.wait(260);
          break;
        }
        case 'phase':
          this.syncAll();
          this.hud.setPhase(event.team, event.turn);
          if (event.skipped) {
            this.hud.toast('Les ennemis, surpris, ne bougent pas.');
            break;
          }
          await this.hud.phaseBanner(event.team, event.turn, this.dur(MS.banner, 400));
          break;
        case 'outcome':
          break;
        case 'skill':
          await this.animateSkill(event.unitId, event.skillId, event.cells);
          break;
        case 'effects':
          await this.animateEffects(event.sourceId, event.element, event.results);
          break;
        case 'item': {
          const user = getUnit(this.state, event.unitId);
          const target = getUnit(this.state, event.targetId);
          const name = this.rules.consumables.get(event.item)?.name ?? event.item;
          this.floatText(user, name, PALETTE.lumiereDoree, -6);
          if (target !== user) await this.projectile(user, target, PALETTE.ocreClair);
          await this.wait(220);
          break;
        }
        case 'dot': {
          const unit = getUnit(this.state, event.unitId);
          const color = this.statusColor(event.status);
          this.flashUnit(unit, color);
          this.floatText(unit, `${event.damage}`, color);
          this.updateHpBar(unit.id, event.hp);
          await this.wait(320);
          break;
        }
        case 'stunned': {
          const unit = getUnit(this.state, event.unitId);
          this.floatText(unit, 'Gelé !', PALETTE.cyanEclat);
          await this.wait(260);
          break;
        }
        case 'expire':
          break;
        case 'arrive':
          await this.animateArrival(event.team, event.unitIds, event.label);
          break;
        case 'bossPhase':
          await this.animateBossPhase(event.unitId, event.line);
          break;
        case 'summon': {
          const unit = getUnit(this.state, event.unitId);
          const view = this.createView(unit);
          view.container.setAlpha(0);
          this.sparks.setParticleTint(PALETTE.pierre);
          this.sparks.explode(18, this.px(unit.x) + T / 2, this.py(unit.y) + T - 4);
          this.cameras.main.shake(this.dur(220, 80), 0.004);
          await this.tween({ targets: view.container, alpha: 1, duration: this.dur(320, 80) });
          this.floatText(unit, 'Éveil !', PALETTE.pierre);
          break;
        }
        case 'vanish': {
          const view = this.views.get(event.unitId);
          if (view) {
            await this.tween({ targets: view.container, alpha: 0, duration: this.dur(400, 80) });
            view.container.setVisible(false).setAlpha(1);
          }
          break;
        }
        case 'terrain':
          await this.animateTerrain(event.cells, event.on);
          break;
        case 'canto':
          break;
      }
    }
  }

  private statusColor(id: string): number {
    return Phaser.Display.Color.HexStringToColor(this.rules.statuses.get(id)?.color ?? '#ffffff').color;
  }

  private elementColor(element: string | null, fallback: number = PALETTE.lumiereDoree): number {
    const hex = element ? this.gameData.elements.find((e) => e.id === element)?.color : undefined;
    return hex ? Phaser.Display.Color.HexStringToColor(hex).color : fallback;
  }

  /** Compétence : cartouche du nom (cut-in), éclat de la zone, élan du lanceur. */
  private async animateSkill(unitId: string, skillId: string, cells: readonly Cell[]): Promise<void> {
    const unit = getUnit(this.state, unitId);
    const skill = this.rules.skills.get(skillId);
    if (!skill) return;
    this.setCursorQuiet(unit);
    this.playReady(unit);
    await this.hud.skillCutIn(unit, skill.name, this.dur(MS.cutIn, 300));
    if (!this.alive) return;
    if (skill.effects.some((e) => e.kind === 'frappe')) return;
    const color = this.elementColor(skill.element, unit.team === 'enemy' ? PALETTE.braise : PALETTE.lumiereDoree);
    // Cercle runique sous le lanceur, puis la zone s'embrase un instant.
    const sx = this.px(unit.x) + T / 2;
    const sy = this.py(unit.y) + T - 4;
    const rune = this.add.circle(sx, sy, 8, color, 0).setStrokeStyle(1, color, 0.9).setDepth(DEPTH.fx - 1).setScale(0.3);
    void this.tween({ targets: rune, scale: 1.4, alpha: 0, duration: this.dur(380, 120) }).then(() => rune.destroy());
    const flash: Phaser.GameObjects.Image[] = [];
    this.paintTiles(flash, cells, color, 0.55, DEPTH.area);
    for (const c of cells) {
      this.sparks.setParticleTint(color);
      this.sparks.explode(3, this.px(c.x) + T / 2, this.py(c.y) + T / 2);
    }
    if (unit.isBoss) this.cameras.main.shake(this.dur(260, 100), 0.005);
    await this.tween({ targets: flash, alpha: 0, duration: this.dur(420, 120) });
    for (const f of flash) f.destroy();
  }

  /** Effets d'une compétence ou d'un objet : chiffres, statuts posés, immunités, purges. */
  private async animateEffects(sourceId: string, element: string | null, results: readonly EffectResult[]): Promise<void> {
    void sourceId;
    const color = this.elementColor(element);
    for (const r of results) {
      const unit = getUnit(this.state, r.unitId);
      if (r.damage !== undefined) {
        this.flashUnit(unit, 0xffffff);
        this.sparks.setParticleTint(color);
        this.sparks.explode(8, this.px(unit.x) + T / 2, this.py(unit.y) + T - 10);
        this.floatText(unit, `${r.damage}`, PALETTE.parchemin);
        this.updateHpBar(unit.id, r.hp);
      }
      if (r.heal !== undefined) {
        this.sparks.setParticleTint(COLORS.heal);
        this.sparks.explode(8, this.px(unit.x) + T / 2, this.py(unit.y) + T - 12);
        this.floatText(unit, `+${r.heal}`, COLORS.heal);
        this.updateHpBar(unit.id, r.hp);
      }
      if (r.status) this.floatText(unit, this.rules.statuses.get(r.status)?.name ?? r.status, this.statusColor(r.status), r.damage !== undefined || r.heal !== undefined ? -10 : 0);
      if (r.immune) this.floatText(unit, 'Immunisé', PALETTE.metalClair, -10);
      if (r.cleansed) this.floatText(unit, 'Purgé', PALETTE.cyanEclat, -16);
      this.syncUnit(unit);
    }
    await this.wait(results.length > 0 ? 420 : 0);
  }

  /** Renforts : bandeau, puis les unités apparaissent sur leur case. */
  private async animateArrival(team: Team, unitIds: readonly string[], label: string): Promise<void> {
    const units = unitIds.map((id) => getUnit(this.state, id));
    const first = units[0];
    if (first) {
      this.setCursorQuiet(first);
      this.centerCameraOn(first);
    }
    const subtitle = team === 'ally' ? 'Un allié vert rejoint la compagnie (il agit seul)' : 'De nouveaux ennemis entrent sur la carte';
    await this.hud.banner(team === 'ally' ? 'RENFORT !' : 'RENFORTS ENNEMIS', subtitle, TEAM_COLOR[team], this.dur(MS.arrive, 400));
    for (const unit of units) {
      const view = this.createView(unit);
      view.container.setAlpha(0);
      view.container.y -= 6;
      void this.tween({ targets: view.container, alpha: 1, y: view.container.y + 6, duration: this.dur(300, 80) });
    }
    this.hud.toast(label);
    await this.wait(320);
  }

  /** Seconde phase d'un boss : secousse, voile rouge, aura, réplique. */
  private async animateBossPhase(unitId: string, line: string): Promise<void> {
    const unit = getUnit(this.state, unitId);
    this.setCursorQuiet(unit);
    this.cameras.main.shake(this.dur(500, 200), 0.008);
    this.cameras.main.flash(this.dur(260, 100), 180, 40, 40);
    this.syncUnit(unit);
    this.flashUnit(unit, PALETTE.rougeCendre);
    await this.hud.bossLine(unit, line, this.speed === 'off' ? 900 : MS.bossLine);
  }

  /** Mur de ronces : les ronces jaillissent (ou se fanent). */
  private async animateTerrain(cells: readonly Cell[], on: boolean): Promise<void> {
    for (const c of cells) {
      const i = cellIndex(this.state.map, c.x, c.y);
      if (on) {
        const img = this.add.image(this.px(c.x) + T / 2, this.py(c.y) + T, BATTLE_TEX.brambles).setOrigin(0.5, 1).setDepth(DEPTH.units + c.y * 0.01 - 0.005).setScale(1, 0.2);
        this.brambles.get(i)?.destroy();
        this.brambles.set(i, img);
        void this.tween({ targets: img, scaleY: 1, duration: this.dur(260, 60), ease: 'Back.easeOut' });
      } else {
        const img = this.brambles.get(i);
        this.brambles.delete(i);
        if (img) void this.tween({ targets: img, alpha: 0, duration: this.dur(300, 60) }).then(() => img.destroy());
      }
    }
    await this.wait(on ? 280 : 120);
  }

  private flashUnit(unit: BattleUnit, color: number): void {
    const view = this.views.get(unit.id);
    if (!view) return;
    view.sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(this.dur(110, 50) || 50, () => {
      if (!view.sprite.active) return;
      view.sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
      this.syncUnit(unit);
    });
  }

  private async animateMove(unitId: string, path: readonly Cell[]): Promise<void> {
    const unit = getUnit(this.state, unitId);
    const view = this.views.get(unitId);
    if (!view) return;
    const step = this.dur(MS.step);
    for (let i = 1; i < path.length && step > 0; i++) {
      const from = path[i - 1] as Cell;
      const to = path[i] as Cell;
      const pose = to.y < from.y ? 'up' : to.y > from.y ? 'down' : 'side';
      view.sprite.setFlipX(to.x < from.x);
      const anim = BATTLE_TEX.msWalk(unit.sprite, unit.team, pose);
      if (view.sprite.anims.currentAnim?.key !== anim) view.sprite.anims.play(anim);
      await this.tween({ targets: view.container, x: this.px(to.x) + T / 2, y: this.py(to.y) + T, duration: step });
    }
    view.sprite.setFlipX(false);
    view.sprite.anims.play(BATTLE_TEX.msWalk(unit.sprite, unit.team, 'down'));
    if (unit.team !== 'player' || unit.acted) view.sprite.anims.play(BATTLE_TEX.msIdle(unit.sprite, unit.team));
    this.syncUnit(unit);
  }

  private async animateCombat(attackerId: string, defenderId: string, strikes: readonly Strike[]): Promise<void> {
    const attacker = getUnit(this.state, attackerId);
    const defender = getUnit(this.state, defenderId);
    // Les PV affichés repartent des PV d'avant l'échange.
    const before = new Map<string, number>([
      [attacker.id, attacker.hp + strikes.filter((s) => s.targetId === attacker.id).reduce((n, s) => n + s.damage, 0)],
      [defender.id, defender.hp + strikes.filter((s) => s.targetId === defender.id).reduce((n, s) => n + s.damage, 0)],
    ]);
    const f = forecast(this.state, attacker, defender, this.rules);
    const playerFirst = attacker.team !== 'enemy';
    const [left, right] = playerFirst ? [attacker, defender] : [defender, attacker];
    const leftSide = playerFirst ? f.attacker : f.defender;
    const rightSide = playerFirst ? f.defender : f.attacker;
    // Affiche les PV d'avant l'échange (les unités ont déjà perdu leurs PV dans la logique).
    const shown = (u: BattleUnit): BattleUnit => ({ ...u, hp: before.get(u.id) ?? u.hp });
    this.hud.showExchange({ left: shown(left), right: shown(right), leftSide: { ...leftSide, hp: before.get(left.id) ?? left.hp }, rightSide: { ...rightSide, hp: before.get(right.id) ?? right.hp } });
    await this.wait(180);
    for (const strike of strikes) {
      if (!this.alive) return;
      await this.animateStrike(strike);
      this.hud.setExchangeHp(strike.targetId, strike.targetHp, this.dur(260, 80));
      this.updateHpBar(strike.targetId, strike.targetHp);
      await this.wait(MS.between);
    }
    await this.wait(260);
    this.hud.hideExchange();
  }

  private updateHpBar(unitId: string, hp: number): void {
    const unit = getUnit(this.state, unitId);
    const view = this.views.get(unitId);
    if (!view) return;
    const ratio = hp / unit.stats.pv;
    view.hpBg.setVisible(true);
    view.hpFill.setVisible(true);
    view.hpFill.width = Math.max(hp > 0 ? 1 : 0, Math.round(12 * ratio));
    view.hpFill.setFillStyle(ratio > 0.5 ? COLORS.heal : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre, 1);
  }

  private async animateStrike(strike: Strike): Promise<void> {
    const striker = getUnit(this.state, strike.attackerId);
    const target = getUnit(this.state, strike.targetId);
    const sv = this.views.get(striker.id);
    const tv = this.views.get(target.id);
    if (!sv || !tv) return;
    const home = { x: this.px(striker.x) + T / 2, y: this.py(striker.y) + T };
    const dx = Math.sign(target.x - striker.x);
    const dy = Math.sign(target.y - striker.y);
    const weapon = striker.weapon;
    const ranged = weapon.damage === 'magique' || Math.abs(target.x - striker.x) + Math.abs(target.y - striker.y) > 1;

    // Préparation : petit recul (anticipation), puis élan ou tir.
    await this.tween({ targets: sv.container, x: home.x - dx * 2, y: home.y - dy * 2, duration: this.dur(70) });
    if (ranged) {
      await this.tween({ targets: sv.container, x: home.x, y: home.y, duration: this.dur(50) });
      await this.projectile(striker, target);
    } else {
      await this.tween({ targets: sv.container, x: home.x + dx * 6, y: home.y + dy * 6, duration: this.dur(MS.lunge), ease: 'Quad.easeIn' });
    }

    const tx = this.px(target.x) + T / 2;
    const ty = this.py(target.y) + T;
    if (strike.hit) {
      // Impact : flash blanc, étincelles, secousse, chiffre.
      flashWhite(tv.sprite, true);
      const color = weapon.element ? (this.gameData.elements.find((e) => e.id === weapon.element)?.color ?? '#ffffff') : '#ffe6b0';
      this.sparks.setParticleTint(Phaser.Display.Color.HexStringToColor(color).color);
      this.sparks.explode(strike.crit ? 22 : 10, tx, ty - 10);
      if (strike.crit) {
        this.cameras.main.flash(this.dur(140, 60), 255, 255, 255);
        this.cameras.main.shake(this.dur(260, 120), 0.006);
        this.floatText(target, 'CRITIQUE !', PALETTE.jauneBle, -10);
      } else {
        this.cameras.main.shake(this.dur(110, 60), 0.0015);
      }
      this.floatText(target, `${strike.damage}`, strike.crit ? PALETTE.jauneBle : PALETTE.parchemin);
      await this.wait(this.dur(MS.hitStop, 40));
      flashWhite(tv.sprite, false);
      await this.tween({ targets: tv.container, x: tx + dx * 3, y: ty + dy * 3, duration: this.dur(60), yoyo: true });
    } else {
      // Esquive : la cible glisse de côté, « Raté ».
      this.floatText(target, 'Raté', PALETTE.metalClair);
      await this.tween({ targets: tv.container, x: tx + (dy !== 0 ? 4 : 0), y: ty + (dx !== 0 ? -3 : 0), duration: this.dur(80), yoyo: true });
    }
    await this.tween({ targets: sv.container, x: home.x, y: home.y, duration: this.dur(MS.back), ease: 'Quad.easeOut' });
    tv.container.setPosition(tx, ty);
    this.syncUnit(target);
  }

  private async projectile(from: BattleUnit, to: BattleUnit, forced: number | null = null): Promise<void> {
    const magic = forced !== null || from.weapon.damage === 'magique';
    const color = forced ?? (from.weapon.element ? Phaser.Display.Color.HexStringToColor(this.gameData.elements.find((e) => e.id === from.weapon.element)?.color ?? '#ffffff').color : magic ? PALETTE.cyanEclat : PALETTE.parchemin);
    const sx = this.px(from.x) + T / 2;
    const sy = this.py(from.y) + T - 14;
    const ex = this.px(to.x) + T / 2;
    const ey = this.py(to.y) + T - 14;
    const angle = Math.atan2(ey - sy, ex - sx);
    const shot = magic
      ? this.add.image(sx, sy, BATTLE_TEX.spark).setScale(1.6).setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      : this.add.rectangle(sx, sy, 7, 1, color, 1).setRotation(angle);
    shot.setDepth(DEPTH.fx);
    if (magic) {
      // Cercle runique sous le lanceur (GDD §11.4).
      const rune = this.add.circle(sx, sy + 10, 7, color, 0).setStrokeStyle(1, color, 0.9).setDepth(DEPTH.fx - 1).setScale(0.3);
      void this.tween({ targets: rune, scale: 1.2, alpha: 0, duration: this.dur(320, 120) }).then(() => rune.destroy());
    }
    await this.tween({ targets: shot, x: ex, y: ey, duration: this.dur(MS.projectile, 60), ease: magic ? 'Sine.easeIn' : 'Linear' });
    shot.destroy();
  }

  private async animateKo(unitId: string): Promise<void> {
    const unit = getUnit(this.state, unitId);
    const view = this.views.get(unitId);
    if (!view) return;
    const fallen = unit.team === 'player' ? `${unit.name} est hors de combat.` : unit.team === 'ally' ? `${unit.name}, notre allié, est tombé.` : `${unit.name} est vaincu${unit.isBoss ? ' !' : '.'}`;
    this.hud.toast(fallen);
    flashWhite(view.sprite, true);
    await this.tween({ targets: view.container, alpha: 0, duration: this.dur(MS.ko, 120), ease: 'Stepped', easeParams: [5] });
    view.container.setVisible(false).setAlpha(1);
    flashWhite(view.sprite, false);
    this.marked.delete(unitId);
  }

  private floatText(unit: BattleUnit, text: string, color: number, offsetY = 0): void {
    const label = addText(this, this.px(unit.x) + T / 2, this.py(unit.y) - 18 + offsetY, text, { font: 'small', color, align: 'center', shadow: PALETTE.encre }).setDepth(DEPTH.numbers);
    const duration = this.dur(MS.number, 350);
    this.tweens.add({ targets: label, y: label.y - 8, duration: duration * 0.5, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: label, alpha: 0, delay: duration * 0.6, duration: duration * 0.4, onComplete: () => label.destroy() });
  }

  /* ---------- Fin du combat ---------- */

  private async finish(): Promise<void> {
    this.setMode('end');
    this.clearTiles(this.highlights);
    this.clearTiles(this.threatTiles);
    this.clearTiles(this.areaTiles);
    await this.wait(500);
    if (!this.alive) return;
    const summary = summarize(this.state);
    const opensWorld = this.params.returnTo === 'world' && getWorldState() !== null;
    const settlement = this.settle(summary.outcome === 'victory' ? 'victory' : 'defeat');
    const ctx = getGameCtx();
    const rewards = ctx && settlement ? formatNotices(ctx, settlement.notices) : [];
    this.hud.showResult(
      summary,
      opensWorld,
      () => {
        this.hud.lockResult();
        this.leave();
      },
      rewards,
      settlement?.wakeAt ? `La compagnie se réveillera ${settlement.wakeAt.location ? `à ${ctx?.index.locations.get(settlement.wakeAt.location)?.name ?? settlement.wakeAt.location}` : 'au point de départ'}.` : null,
    );
  }

  /**
   * Applique la fin du combat à la partie (une seule fois) : or et butin,
   * drapeaux de victoire, ennemi du monde vaincu, perte d'or en cas de défaite,
   * objets consommés, alliés errants blessés.
   */
  private settle(end: BattleEnd): Settlement | null {
    if (this.ended !== null) return this.settlement;
    this.ended = end;
    const ctx = getGameCtx();
    if (!ctx || this.params.returnTo !== 'world') return null;
    const enemies = this.state.units.filter((u) => u.team === 'enemy' && u.summonUntil === null);
    const summary = summarize(this.state);
    this.settlement = settleBattle(ctx, {
      end,
      encounter: findEncounter(this.gameData, this.params.encounterId),
      foeId: this.params.foeId ?? null,
      enemiesDefeated: enemies.filter((u) => u.hp <= 0).length,
      bossDown: enemies.some((u) => u.isBoss && u.hp <= 0),
      seed: `${this.seed}:butin`,
      itemsUsed: summary.itemsUsed,
      errantsFallen: summary.errantsFallen,
    });
    return this.settlement;
  }

  /** Retour à la scène d'origine ; le monde reçoit le bilan du combat. */
  private leave(): void {
    const world = getWorldState();
    const end = this.ended ?? 'retreat';
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.params.returnTo === 'world' && world) {
        this.scene.start(SCENES.world, { battleReturn: { end, wakeAt: this.settlement?.wakeAt?.location ?? null, notices: this.settlement?.notices ?? [] } });
      } else this.scene.start(SCENES.title);
    });
  }

  /* ---------- Outils ---------- */

  /** Durée ajustée au réglage de vitesse (Maj enfoncée : deux fois plus vite). `min` : plancher hors « Désactivées ». */
  private dur(ms: number, min = 0): number {
    const factor = ANIM_SPEED_FACTOR[this.speed] * (this.actions?.isDown('sprint') ? 0.5 : 1);
    if (factor === 0) return 0;
    return Math.max(min * factor, ms * factor);
  }

  private wait(ms: number): Promise<void> {
    const d = this.speed === 'off' ? Math.min(ms, 60) : this.dur(ms);
    return new Promise((resolve) => {
      if (d <= 0 || !this.alive) resolve();
      else this.time.delayedCall(d, () => resolve());
    });
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      if (!this.alive) {
        resolve();
        return;
      }
      if (!config.duration || (config.duration as number) <= 0) {
        // Sans animation : on pose directement l'état final (sauf aller-retour).
        if (!config.yoyo) {
          const targets = (Array.isArray(config.targets) ? config.targets : [config.targets]) as Record<string, unknown>[];
          for (const target of targets) {
            for (const key of ['x', 'y', 'alpha', 'scale', 'scaleY'] as const) {
              const value = (config as Record<string, unknown>)[key];
              if (typeof value === 'number') target[key] = value;
            }
          }
        }
        resolve();
        return;
      }
      this.tweens.add({ ...config, onComplete: () => resolve() });
    });
  }

  private updateDebug(): void {
    if (this.registry.get('debug.enabled') !== true) return;
    if (this.actions.justPressed('debugTeleport') && this.mode === 'browse') {
      // F2 : victoire immédiate (pour tester l'enchaînement).
      for (const enemy of livingUnits(this.state, 'enemy')) enemy.hp = 0;
      this.state.reinforcements.length = 0;
      this.state.outcome = 'victory';
      this.syncAll();
      void this.finish();
    }
    const boss = this.state.units.find((u) => u.isBoss);
    this.registry.set(
      'debug.info',
      [
        `COMBAT ${this.state.encounterId}  MODE ${this.mode}  TOUR ${this.state.turn} ${this.state.phase}`,
        `CASE ${this.cursorCell.x},${this.cursorCell.y}  ZOOM ×${this.zoom}  F2 VICTOIRE${boss ? `  BOSS ${boss.hp}/${boss.stats.pv} (phase ${boss.boss?.phase ?? 1}, seuil ${phaseThreshold(boss) ?? '-'})` : ''}`,
      ].join('\n'),
    );
  }

  private onShutdown(): void {
    this.alive = false;
    this.atmosphere?.destroy();
    this.atmosphere = null;
    this.worldMap = null;
    this.views.clear();
    this.brambles.clear();
    this.highlights = [];
    this.areaTiles = [];
    this.arrowTiles = [];
    this.threatTiles = [];
    this.slotTiles = [];
    this.marked.clear();
    this.selected = null;
    this.reach = null;
    this.targeting = null;
    this.plan = null;
    this.registry.remove('debug.info');
    this.scene.stop(SCENES.battleHud);
  }
}

/** Silhouette blanche (impact) en mode de teinte « remplissage » de Phaser 4, ou retour à la normale. */
function flashWhite(sprite: Phaser.GameObjects.Sprite, on: boolean): void {
  if (on) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  else sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
}

/** Nom de classe court pour la liste de la compagnie (« Gardien », « Lame », « Héritier »…). */
function shortClass(name: string): string {
  const first = name.split(' ')[0] ?? name;
  return first.length > 10 ? `${first.slice(0, 9)}.` : first;
}
