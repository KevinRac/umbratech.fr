/**
 * Monde ouvert (GDD §4) : l'île de Vaelmor à explorer librement.
 *
 * Rendu : sol, décors et cimes sont des couches de tuiles GPU (une seule
 * image chacune, nettes) ; l'eau est une texture animée posée sous la carte.
 * Logique : tout ce qui se calcule (collisions, déplacement, caméra, zones)
 * vient de `logic/world/` ; cette scène ne fait que lire les touches, appliquer
 * ces fonctions et dessiner le résultat.
 */
import Phaser from 'phaser';
import { worldZoomFor } from '../core/viewport';
import { showFatalError } from '../core/fatal';
import { ActionInput } from '../core/input';
import { getWorldState, setWorldState } from '../core/session';
import { GameDataError, loadGameData, type GameData } from '../data';
import type { ZoneDef } from '../data/schemas';
import { COLLISION, WorldMapError, loadWorldMap, type WorldMap } from '../data/worldMap';
import { centerOn, followTarget, type CameraConfig, type Vec2 } from '../logic/world/camera';
import { CollisionGrid, gateRequirements, isGateOpen } from '../logic/world/collision';
import { buildSafeGrid, createFoe, detectionScale, feetCell, surpriseTarget, updateFoe, type FoeEvent, type FoeSim, type SafeGrid } from '../logic/world/foes';
import { createBody, placeBodyAt, spritePose, stepBody, type BodyState } from '../logic/world/movement';
import { nearestFreeCell } from '../logic/world/pathfinding';
import { ZoneTracker, terrainAtCell } from '../logic/world/zones';
import { DEFAULT_WANDER, Wanderer } from '../logic/game/wander';
import { Rng } from '../logic/rng';
import { getGameCtx } from '../core/townContext';
import {
  chooseEncounter,
  classDetectionScale,
  collectFlagRewards,
  difficultyOf,
  enterLocation,
  foeFlees,
  foePresent,
  meanEnemyLevel,
  newProgress,
  newlyReady,
  npcPresent,
  partyLevel,
  questStatus,
  questTierOk,
  reputationOf,
  tierAt,
  tierIdOf,
  type BattleEnd,
  type GameCtx,
  type Notice,
} from '../logic/game';
import { findEncounter } from '../logic/tactics/encounter';
import { FoeActor } from '../render/foeActors';
import { ensureFoeTextures } from '../render/foeTextures';
import type { NpcDef } from '../data/townSchemas';
import { formatNotices } from '../ui/notices';
import { facingPose, facingToward } from '../render/npcSprites';
import { TOWN_TEX, ensureMarkerTextures, ensureNpcTexture } from '../render/townTextures';
import type { MenuTab } from './MenuScene';
import { addUnique, newWorldState, objectCenter, type WorldState } from '../logic/world/worldState';
import { worldView, type WorldView } from '../render/viewport';
import { parseQuality, type Quality } from '../render/atmosphere';
import { WorldAtmosphere } from '../render/worldAtmosphere';
import { loadQuality, saveQuality } from '../core/settings';
import { PALETTE } from '../render/palette';
import { WORLD_MAP_KEY, WORLD_TEX, WORLD_TILESET_KEY, ensureHeroAnimations, ensureWorldTextures } from '../render/worldTextures';
import { WATER_FRAMES } from '../render/waterTile';
import { WHEAT_FRONT_BELOW, WHEAT_FRONT_FRAMES, WHEAT_FRONT_H, WHEAT_FRONT_MS } from '../render/wheatFront';
import { fixGpuTileAnimations } from '../render/tileAnimations';
import { SCENES } from './keys';
import type { ReputationView, WorldHudScene } from './WorldHudScene';

const DEPTH = {
  water: -10,
  ground: 0,
  decor: 1,
  shadow: 2,
  entities: 2.1,
  canopy: 10,
  /** Silhouette du héros au-dessus des toits : visible seulement là où un toit le cache. */
  heroGhost: 10.2,
  marker: 10.4,
  smoke: 10.5,
  fog: 11,
  debug: 90,
} as const;

const TILESET_NAME = 'world_tiles';
const WATER_FRAME_MS = 420;
const SMOKE_PERIOD_MS = 520;
const GATE_MESSAGE_COOLDOWN_MS = 4000;

/** Un PNJ posé dans le monde. */
interface NpcActor {
  readonly def: NpcDef;
  readonly locationId: string;
  x: number;
  /** Pieds du PNJ (pixels). */
  footY: number;
  readonly walker: Wanderer;
  readonly rng: Rng;
  /** Vrai pendant une conversation : il finit son pas puis ne bouge plus. */
  talking: boolean;
  /** Cases réservées au dernier calcul (pour ne mettre la collision à jour qu'au besoin). */
  reservedKey: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  readonly marker: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
  readonly spark: Phaser.GameObjects.Image;
  readonly phase: number;
  facing: NpcDef['facing'];
}

/** Ce que le combat qui vient de finir laisse derrière lui (jalon M3). */
export interface BattleReturn {
  readonly end: BattleEnd;
  /** Défaite : village où la compagnie se réveille (null : point de départ). */
  readonly wakeAt?: string | null;
  /** Or, butin, récompenses : à annoncer. */
  readonly notices: readonly Notice[];
}

export interface WorldSceneData {
  /** Vrai pour une nouvelle partie : l'état du monde repart du point de départ. */
  readonly newGame?: boolean;
  /** Retour d'un combat. */
  readonly battleReturn?: BattleReturn;
}

/** Options d'un combat engagé par un ennemi du monde. */
interface EngageOptions {
  readonly initiative?: boolean;
  readonly ambush?: boolean;
  readonly foeId?: string;
  readonly extraEnemies?: readonly { enemy: string; level: number }[];
}

export class WorldScene extends Phaser.Scene {
  private data_!: GameData;
  private map!: WorldMap;
  private grid!: CollisionGrid;
  private state!: WorldState;
  private actions!: ActionInput;
  private hud!: WorldHudScene;
  private view!: WorldView;
  private tracker!: ZoneTracker;
  private body_!: BodyState;
  private camera_: Vec2 = { x: 0, y: 0 };
  private cameraConfig!: CameraConfig;

  private hero!: Phaser.GameObjects.Sprite;
  /**
   * Copie translucide du héros dessinée au-dessus de la couche `canopy`
   * (décision n°44) : posée sur le héros visible, elle ne change rien (même
   * couleur) ; quand un toit le recouvre, elle laisse deviner sa silhouette.
   */
  private heroGhost!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  /** Blé où le héros s'enfonce : case → pixels du bas cachés (décision n°50). */
  private wheatHide = new Map<number, number>();
  private wheatFront!: Phaser.GameObjects.Image;
  private wheatFrame = 0;
  private water!: Phaser.GameObjects.TileSprite;
  private fog = new Map<string, Phaser.GameObjects.TileSprite[]>();

  private paused = false;
  /** Vrai pendant la transition vers une autre scène (combat). */
  private leaving = false;

  /** Étalonnage, bloom, flou de profondeur, rayons, poussière, halos (décisions n°43 et n°47). */
  private atmosphere: WorldAtmosphere | null = null;

  private lastGateMessage = -Infinity;
  private waterFrame = 0;
  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chimneys: { x: number; y: number }[] = [];
  private debugCollisionOn = false;
  private debugOverlay!: Phaser.GameObjects.Graphics;
  private teleportIndex = -1;
  private debugClock = 0;

  /* Villages (jalon M2) */
  private gameCtx!: GameCtx;
  private npcs = new Map<string, NpcActor>();
  private nearNpc: NpcActor | null = null;
  /** Vrai pendant un dialogue ou un menu : le héros ne bouge plus. */
  private modal = false;
  private modalCooldownUntil = 0;
  private announced = new Set<string>();
  private village: string | null = null;
  private lastGold = -1;
  private lastRepKey = '';

  /* Ennemis du monde (jalon M3) */
  private foeActors = new Map<string, FoeActor>();
  private foeRng!: Rng;
  private safeGrid: SafeGrid | null = null;
  private gateReq: ReadonlyMap<string, readonly string[]> = new Map();
  private graceMs = 0;
  private classScale = 1;
  private partyLvl = 3;
  private nearFoe: FoeSim | null = null;
  private presenceTimer = 0;
  private foesDebugOff = false;

  constructor() {
    super(SCENES.world);
  }

  create(data: WorldSceneData = {}): void {
    this.leaving = false;
    this.modal = false;
    this.modalCooldownUntil = 0;
    this.npcs = new Map();
    this.nearNpc = null;
    this.announced = new Set();
    this.village = null;
    this.lastGold = -1;
    this.lastRepKey = '';
    this.foeActors = new Map();
    this.nearFoe = null;
    this.presenceTimer = 0;
    if (data.newGame) this.registry.set('world.atApplied', false);
    this.view = worldView(this, worldZoomFor(this.scale.height));
    try {
      this.data_ = loadGameData();
      const raw = this.cache.tilemap.get(WORLD_MAP_KEY)?.data as unknown;
      this.map = loadWorldMap(raw, { zones: this.data_.zones, terrains: this.data_.terrains, tileSize: this.data_.balance.exploration.tileSize });
    } catch (error) {
      if (error instanceof WorldMapError || error instanceof GameDataError) showFatalError('La carte du monde est invalide.', error.issues);
      else showFatalError('Le monde n’a pas pu être chargé.', [error instanceof Error ? error.message : String(error)]);
      return;
    }

    this.actions = new ActionInput(this);
    this.scene.launch(SCENES.worldHud);
    this.hud = this.scene.get(SCENES.worldHud) as WorldHudScene;
    ensureWorldTextures(this);
    ensureHeroAnimations(this);

    if (data.newGame || !getWorldState()) setWorldState(newWorldState(this.map, newProgress({ balance: this.data_.balance, locations: this.data_.locations, factions: this.data_.factions })));
    this.state = getWorldState() as WorldState;
    this.gameCtx = getGameCtx() as GameCtx;
    this.applyTownDebug(data.newGame === true);
    this.grid = CollisionGrid.fromMap(this.map, this.state.openFlags);
    this.gateReq = gateRequirements(this.data_.zones);
    this.grid.setGateRequirements(this.gateReq);
    this.applyBattleReturn(data.battleReturn);
    this.tracker = new ZoneTracker(this.map, this.data_.zones);

    const exploration = this.data_.balance.exploration;
    const worldWidth = this.map.width * this.map.tileSize;
    const worldHeight = this.map.height * this.map.tileSize;
    this.cameraConfig = {
      view: { width: this.view.width, height: this.view.height },
      world: { width: worldWidth, height: worldHeight },
      deadzone: { width: exploration.cameraDeadzoneWidth, height: exploration.cameraDeadzoneHeight },
      lerp: exploration.cameraLerp,
    };

    this.buildMapLayers(worldWidth, worldHeight);
    this.buildAmbientDecor();
    this.buildHero();
    this.buildNpcs();
    this.buildFoes();
    this.buildGateFog();
    this.debugOverlay = this.add.graphics().setDepth(DEPTH.debug);

    this.atmosphere = new WorldAtmosphere(
      this,
      this.data_.balance.visuals,
      this.map.ambient.filter((o) => o.kind === 'light'),
    );
    // Outils de debug : `?debug&quality=low` force une qualité, `?debug&evening=1` montre le soir.
    const params = new URLSearchParams(window.location.search);
    const debug = params.has('debug');
    this.atmosphere.setQuality(debug && params.has('quality') ? parseQuality(params.get('quality')) : loadQuality(), debug ? (params.get('fxoff') ?? '').split(',') : []);
    if (debug && params.has('evening')) this.atmosphere.setEvening(Math.max(0, Math.min(1, Number(params.get('evening')) || 0)));

    this.camera_ = centerOn({ x: this.body_.x, y: this.body_.y - 10 }, this.cameraConfig);
    this.applyCamera();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.syncTownHud();
    this.checkProgress(true);
    this.announceBattleReturn(data.battleReturn);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
  }

  /** La fenêtre change de taille : nouveau zoom entier, nouvelle zone visible. */
  private onResize(): void {
    if (!this.cameraConfig) return;
    this.view = worldView(this, worldZoomFor(this.scale.height));
    this.cameraConfig = { ...this.cameraConfig, view: { width: this.view.width, height: this.view.height } };
    this.camera_ = centerOn({ x: this.body_.x, y: this.body_.y - 10 }, this.cameraConfig);
    this.applyCamera();
  }

  /* ---------- Construction ---------- */

  private buildMapLayers(worldWidth: number, worldHeight: number): void {
    this.water = this.add.tileSprite(0, 0, worldWidth, worldHeight, WORLD_TEX.water(0)).setOrigin(0, 0).setDepth(DEPTH.water);
    this.time.addEvent({
      delay: WATER_FRAME_MS,
      loop: true,
      callback: () => {
        this.waterFrame = (this.waterFrame + 1) % WATER_FRAMES;
        this.water.setTexture(WORLD_TEX.water(this.waterFrame));
      },
    });

    const tilemap = this.make.tilemap({ key: WORLD_MAP_KEY });
    const tileset = tilemap.addTilesetImage(TILESET_NAME, WORLD_TILESET_KEY);
    if (!tileset) throw new Error(`Tileset « ${TILESET_NAME} » introuvable dans la carte.`);
    // Vent dans les feuillages, ailes du moulin : tuiles animées jouées par le GPU (décision n°45).
    fixGpuTileAnimations(tileset, this.renderer);
    const layers: [string, number][] = [
      ['ground', DEPTH.ground],
      ['decor', DEPTH.decor],
      ['canopy', DEPTH.canopy],
    ];
    for (const [name, depth] of layers) {
      const layer = tilemap.createLayer(name, tileset, 0, 0, true);
      if (!layer) throw new Error(`Couche « ${name} » impossible à créer.`);
      layer.setDepth(depth);
    }
  }

  /**
   * Fumée de cheminée (couche `ambient`). Le blé n'est plus un décor à part :
   * ce sont des tuiles animées de la carte (décision n°49).
   */
  private buildAmbientDecor(): void {
    this.chimneys = this.map.ambient.filter((o) => o.kind === 'chimney').map((o) => ({ x: o.x, y: o.y }));
    this.smoke = this.add.particles(0, 0, WORLD_TEX.smoke, {
      emitting: false,
      lifespan: { min: 1700, max: 2400 },
      speedY: { min: -13, max: -8 },
      speedX: { min: 2, max: 6 },
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.65, end: 0 },
      tint: [0xe8e4ee, 0xc9bfd0, 0xb4aebf],
    });
    this.smoke.setDepth(DEPTH.smoke);
    this.time.addEvent({
      delay: SMOKE_PERIOD_MS,
      loop: true,
      callback: () => {
        const view = this.cameras.main.worldView;
        for (const chimney of this.chimneys) {
          if (chimney.x < view.x - 24 || chimney.x > view.right + 24 || chimney.y < view.y - 48 || chimney.y > view.bottom + 24) continue;
          if (Math.random() < 0.8) this.smoke.emitParticleAt(chimney.x + (Math.random() - 0.5) * 2, chimney.y);
        }
      },
    });
  }

  private buildHero(): void {
    const { player } = this.state;
    this.body_ = createBody(player.x, player.y, player.facing);
    // Outil de debug : `?debug&at=31,58` pose le héros sur la case indiquée.
    const params = new URLSearchParams(window.location.search);
    // Une seule fois par partie : au retour d'un combat, le héros reste là où l'état du jeu le met.
    const at = params.has('debug') && this.registry.get('world.atApplied') !== true ? /^(\d+),(\d+)$/.exec(params.get('at') ?? '') : null;
    if (at) this.registry.set('world.atApplied', true);
    if (at) placeBodyAt(this.body_, Number(at[1]) * this.map.tileSize + this.map.tileSize / 2, (Number(at[2]) + 1) * this.map.tileSize - 1);
    // Le point d'apparition peut tomber dans un décor (carte modifiée) : on cherche la case libre voisine.
    this.snapToFree(this.body_);

    this.shadow = this.add.image(0, 0, WORLD_TEX.shadow).setOrigin(0.5, 0.5).setDepth(DEPTH.shadow);
    this.hero = this.add.sprite(0, 0, WORLD_TEX.hero, WORLD_TEX.heroFrame('down', 0)).setOrigin(0.5, 1);
    this.heroGhost = this.add.sprite(0, 0, WORLD_TEX.hero, WORLD_TEX.heroFrame('down', 0)).setOrigin(0.5, 1).setAlpha(0.5).setDepth(DEPTH.heroGhost);
    this.buildWheat();
    this.syncHero();
  }

  /** Champs de blé : cases où le héros s'enfonce, frange d'épis devant lui, au rythme du vent. */
  private buildWheat(): void {
    const hide = this.data_.balance.visuals.wheatHide;
    const size = this.map.tileSize;
    for (const o of this.map.ambient) {
      if (o.kind !== 'wheat') continue;
      const px = o.props['depth'] === 'edge' ? hide.edge : hide.dense;
      for (let y = o.y; y < o.y + o.height; y += size) {
        for (let x = o.x; x < o.x + o.width; x += size) this.wheatHide.set(Math.floor(y / size) * this.map.width + Math.floor(x / size), px);
      }
    }
    this.wheatFront = this.add.image(0, 0, WORLD_TEX.wheatFront(0)).setOrigin(0.5, 0).setVisible(false);
    const next = (): void => {
      this.wheatFrame = (this.wheatFrame + 1) % WHEAT_FRONT_FRAMES;
      this.wheatFront.setTexture(WORLD_TEX.wheatFront(this.wheatFrame));
      this.time.delayedCall(WHEAT_FRONT_MS[this.wheatFrame] ?? 500, next);
    };
    this.time.delayedCall(WHEAT_FRONT_MS[0], next);
  }

  private snapToFree(body: BodyState): void {
    const size = this.map.tileSize;
    const cell = nearestFreeCell(this.grid, Math.floor(body.x / size), Math.floor(body.y / size), 12);
    if (cell) placeBodyAt(body, cell.x * size + size / 2, (cell.y + 1) * size - 1);
  }

  private buildGateFog(): void {
    for (const gate of this.map.gates) {
      const flag = String(gate.props['flag']);
      const zone = this.data_.zones.find((z) => z.unlockFlag === flag);
      const sprite = this.add
        .tileSprite(gate.x, gate.y, gate.width, gate.height, WORLD_TEX.fog)
        .setOrigin(0, 0)
        .setDepth(DEPTH.fog)
        .setAlpha(0.8)
        .setTint(zone ? Phaser.Display.Color.HexStringToColor(zone.ambient.color).color : PALETTE.violetPale);
      this.fog.set(flag, [...(this.fog.get(flag) ?? []), sprite]);
    }
    this.refreshGates();
  }

  /* ---------- Boucle ---------- */

  override update(time: number, delta: number): void {
    if (!this.map || this.leaving) return;
    if (this.modal) {
      const dtModal = delta / 1000;
      this.updateNpcs(time, delta);
      this.pollTownHud();
      this.updateAtmosphere(dtModal);
      this.atmosphere?.update(dtModal);
      return;
    }
    if (this.actions.justPressed('cancel')) {
      this.togglePause();
    }
    if (this.paused) return;

    const dt = delta / 1000;
    const input = {
      dx: (this.actions.isDown('right') ? 1 : 0) - (this.actions.isDown('left') ? 1 : 0),
      dy: (this.actions.isDown('down') ? 1 : 0) - (this.actions.isDown('up') ? 1 : 0),
      sprint: this.actions.isDown('sprint'),
    };
    this.state.progress.clock += delta;
    stepBody(this.body_, input, dt, this.grid, this.data_.balance.exploration);
    if (this.body_.bumpedGate) this.onGateBump(this.body_.bumpedGate, time);

    this.camera_ = followTarget(this.camera_, { x: this.body_.x, y: this.body_.y - 10 }, Math.min(dt, 0.05), this.cameraConfig);
    this.applyCamera();
    this.syncHero();
    this.updateZones();
    this.updateNpcs(time, delta);
    this.updateFoes(time, delta);
    this.updateInteraction(time);
    this.pollTownHud();
    this.updateAtmosphere(dt);
    this.atmosphere?.update(dt);
    this.updateDebug(delta);
  }

  private applyCamera(): void {
    this.cameras.main.setScroll(Math.round(this.camera_.x) - this.view.origin.x, Math.round(this.camera_.y) - this.view.origin.y);
  }

  private syncHero(): void {
    const body = this.body_;
    const { pose, flipX } = spritePose(body.facing);
    const x = Math.round(body.x);
    const y = Math.round(body.y) + 1;
    this.hero.setPosition(x, y).setFlipX(flipX).setDepth(DEPTH.entities + body.y / 100000);
    this.shadow.setPosition(x, y - 1);
    if (body.moved) {
      this.hero.anims.play(`hero:walk:${pose}`, true);
      this.hero.anims.timeScale = body.sprinting ? 1.5 : 1;
    } else {
      this.hero.anims.stop();
      this.hero.setFrame(WORLD_TEX.heroFrame(pose, 0));
    }
    this.heroGhost.setPosition(x, y).setFlipX(flipX).setFrame(this.hero.frame.name);
    // Dans le blé, les épis cachent le bas du héros (décision n°50).
    const size = this.map.tileSize;
    const hide = this.wheatHide.get(Math.floor((body.y - 1) / size) * this.map.width + Math.floor(body.x / size)) ?? 0;
    if (hide > 0) {
      const h = this.hero.frame.height;
      this.hero.setCrop(0, 0, this.hero.frame.width, h - hide);
      this.heroGhost.setCrop(0, 0, this.hero.frame.width, h - hide);
      this.wheatFront
        .setVisible(true)
        .setPosition(x, y - hide + WHEAT_FRONT_BELOW - WHEAT_FRONT_H)
        .setDepth(this.hero.depth + 0.00001);
    } else if (this.hero.isCropped) {
      this.hero.setCrop();
      this.heroGhost.setCrop();
      this.wheatFront.setVisible(false);
    }
    this.shadow.setVisible(hide === 0);
    // L'état partagé suit le héros (la sauvegarde y lira sa position, jalon M9).
    this.state.player.x = body.x;
    this.state.player.y = body.y;
    this.state.player.facing = body.facing;
  }

  /* ---------- Villages : PNJ, dialogues, réputation (jalon M2) ---------- */

  /**
   * Outils de debug : `?debug&rep=haut_gue:-70,racines:20&gold=999&flags=boss_brakk`
   * règlent réputations, or et drapeaux au lancement d'une partie (une seule fois).
   */
  private applyTownDebug(newGame: boolean): void {
    if (newGame) this.registry.set('town.debugApplied', false);
    const params = new URLSearchParams(window.location.search);
    if (!params.has('debug') || this.registry.get('town.debugApplied') === true) return;
    this.registry.set('town.debugApplied', true);
    const progress = this.gameCtx.progress;
    for (const entry of (params.get('rep') ?? '').split(',')) {
      const [target, value] = entry.split(':');
      if (target && value !== undefined && Number.isFinite(Number(value)) && progress.reputation[target] !== undefined) progress.reputation[target] = Math.max(-100, Math.min(100, Number(value)));
    }
    if (params.has('lvl')) this.state.testLevel = Math.max(1, Math.min(30, Math.floor(Number(params.get('lvl')) || 1)));
    if (params.has('gold')) progress.gold = Math.max(0, Math.floor(Number(params.get('gold')) || 0));
    for (const flag of (params.get('flags') ?? '').split(',')) if (flag) addUnique(this.state.openFlags, flag);
  }

  /** Cases où un PNJ peut marcher : libres, hors portes et devant-de-porte. */
  private npcWalkable = (x: number, y: number): boolean => this.grid.valueAt(x, y) === 0 && !this.doorCells.has(y * this.map.width + x);
  private doorCells = new Set<number>();

  private buildNpcs(): void {
    ensureMarkerTextures(this);
    this.doorCells = new Set();
    for (const o of this.map.ambient) {
      if (o.kind !== 'door') continue;
      const x = Math.floor(o.x / this.map.tileSize);
      const y = Math.floor(o.y / this.map.tileSize);
      for (const [dx, dy] of [[0, 0], [0, 1], [-1, 1], [1, 1], [0, 2]] as const) this.doorCells.add((y + dy) * this.map.width + x + dx);
    }
    for (const { npc, location } of this.gameCtx.index.npcs.values()) {
      if (!npcPresent(this.gameCtx, npc)) continue;
      const size = this.map.tileSize;
      const [tx, ty] = npc.at;
      const x = tx * size + size / 2;
      const footY = (ty + 1) * size;
      const texture = ensureNpcTexture(this, npc);
      const { pose, flipX } = facingPose(npc.facing);
      const sprite = this.add.sprite(x, footY, texture, TOWN_TEX.npcFrame(pose, 0)).setOrigin(0.5, 1).setFlipX(flipX).setDepth(DEPTH.entities + (footY - 1) / 100000);
      const shadow = this.add.image(x, footY - 1, WORLD_TEX.shadow).setDepth(DEPTH.shadow);
      const marker = this.add.image(x, footY - 40, TOWN_TEX.markerAvailable).setDepth(DEPTH.marker).setVisible(false);
      const spark = this.add.image(x, footY - 40, TOWN_TEX.questSpark).setDepth(DEPTH.marker + 0.01).setVisible(false);
      const glow = this.add.image(x, footY - 2, TOWN_TEX.questGlow).setDepth(DEPTH.shadow - 0.01).setVisible(false);
      const rng = Rng.fromSeed(`${npc.id}:${Math.floor(Math.random() * 1e9)}`);
      const walkable = (wx: number, wy: number): boolean => (wx === tx && wy === ty) || this.npcWalkable(wx, wy);
      const walker = new Wanderer({ home: { x: tx, y: ty }, radius: npc.roam, ...DEFAULT_WANDER }, walkable, rng, npc.facing);
      this.npcs.set(npc.id, { def: npc, locationId: location.id, x, footY, sprite, shadow, marker, glow, spark, walker, rng, talking: false, reservedKey: '', phase: (tx * 37 + ty * 91) % 700, facing: npc.facing });
    }
    this.refreshNpcSolids();
    // Le point d'apparition ou la case de départ ne doit pas tomber dans un PNJ.
    if (this.grid.isSolidRect(this.body_.x - 5, this.body_.y - 8, 10, 8)) this.snapToFree(this.body_);
    this.syncHero();
    this.refreshMarkers();
  }

  private refreshNpcSolids(): void {
    const size = this.map.tileSize;
    const cells: number[] = [];
    for (const a of this.npcs.values()) {
      for (const t of a.walker.reserved) cells.push(t.y * this.map.width + t.x);
      a.reservedKey = a.walker.reserved.map((t) => `${t.x},${t.y}`).join(';');
    }
    void size;
    this.grid.setExtraSolid(cells);
  }

  /** Pastilles « ! » (quête à prendre) et « ? » (quête à rendre) au-dessus des PNJ. */
  private refreshMarkers(): void {
    const ctx = this.gameCtx;
    for (const actor of this.npcs.values()) {
      let texture: string | null = null;
      for (const option of actor.def.options) {
        if (option.kind !== 'quest') continue;
        const status = questStatus(ctx, option.quest);
        const quest = ctx.index.quests.get(option.quest);
        if (status === 'ready') texture = TOWN_TEX.markerReady;
        else if (status === 'available' && quest && questTierOk(ctx, quest) && texture === null) texture = TOWN_TEX.markerAvailable;
      }
      const hostile = ctx.progress.reputation[actor.locationId] !== undefined && tierIdOf(reputationOf(ctx.progress, actor.locationId), ctx.data.reputation) === 'hostile' && actor.def.refusesWhenHostile === true;
      if (texture === null || hostile) {
        actor.marker.setVisible(false);
        actor.glow.setVisible(false);
        actor.spark.setVisible(false);
      } else {
        actor.spark.setVisible(true);
        actor.marker.setTexture(texture).setVisible(true);
        actor.glow.setVisible(true).setTint(texture === TOWN_TEX.markerReady ? 0x9ee8f0 : 0xffffff);
      }
    }
  }

  /** Un PNJ peut-il entrer dans cette case maintenant ? (ni autre PNJ, ni héros) */
  private canNpcEnter(self: NpcActor, x: number, y: number): boolean {
    for (const other of this.npcs.values()) {
      if (other === self) continue;
      for (const t of other.walker.reserved) if (t.x === x && t.y === y) return false;
    }
    const size = this.map.tileSize;
    const b = this.body_;
    // Rectangle du héros (10×8, pieds en bas) contre la case, avec une marge.
    return !(b.x + 7 > x * size && b.x - 7 < (x + 1) * size && b.y + 2 > y * size && b.y - 10 < (y + 1) * size);
  }

  /** Marche et respiration des PNJ, pastilles qui flottent. */
  private updateNpcs(time: number, delta = 0): void {
    const frame = (actor: NpcActor): number => (Math.floor((time + actor.phase) / 700) % 2);
    const size = this.map.tileSize;
    let changed = false;
    for (const actor of this.npcs.values()) {
      const talkingToHero = actor.talking;
      if (talkingToHero && !actor.walker.walking) actor.walker.face(facingToward(this.body_.x - actor.x, this.body_.y - (actor.footY - 1)));
      if (delta > 0) actor.walker.update(Math.min(delta, 100), actor.rng, (x, y) => this.canNpcEnter(actor, x, y), this.modal || talkingToHero);
      const pos = actor.walker.position(size);
      const px = Math.round(pos.x);
      const py = Math.round(pos.footY);
      actor.x = px;
      actor.footY = py;
      actor.facing = actor.walker.facing;
      const key = actor.walker.reserved.map((t) => `${t.x},${t.y}`).join(';');
      if (key !== actor.reservedKey) changed = true;
      const { pose, flipX } = facingPose(actor.facing);
      const name = actor.walker.walking ? TOWN_TEX.npcWalk(pose, Math.floor((time + actor.phase) / 140) % 4) : TOWN_TEX.npcFrame(pose, frame(actor));
      actor.sprite.setPosition(px, py).setFlipX(flipX).setFrame(name).setDepth(DEPTH.entities + (py - 1) / 100000);
      actor.shadow.setPosition(px, py - 1);
      actor.glow.setPosition(px, py - 2);
      if (actor.marker.visible) {
        const bob = Math.round(Math.sin(time / 260 + actor.phase) * 1.5);
        actor.marker.setPosition(actor.x, actor.footY - 40 + bob);
        actor.glow.setAlpha(0.7 + 0.3 * Math.sin(time / 420 + actor.phase));
        // Étincelle qui scintille à un coin de l'emblème, un coin différent à chaque cycle.
        const cycle = (time + actor.phase * 3) / 1400;
        const corner = Math.floor(cycle) % 3;
        const t = cycle - Math.floor(cycle);
        const sx = corner === 0 ? 6 : corner === 1 ? -6 : 5;
        const sy = corner === 0 ? -9 : corner === 1 ? -4 : 4;
        actor.spark.setPosition(actor.x + sx, actor.footY - 40 + bob + sy).setAlpha(t < 0.4 ? Math.sin((t / 0.4) * Math.PI) : 0);
      }
    }
    if (changed) this.refreshNpcSolids();
  }

  /** PNJ le plus proche à portée de parole (pieds à pieds). */
  private findNearNpc(): NpcActor | null {
    const range = this.data_.balance.exploration.interactRange;
    let best: NpcActor | null = null;
    let bestDistance = range;
    for (const actor of this.npcs.values()) {
      const d = Math.hypot(actor.x - this.body_.x, actor.footY - 1 - this.body_.y);
      if (d <= bestDistance) {
        best = actor;
        bestDistance = d;
      }
    }
    return best;
  }

  private updateInteraction(time: number): void {
    const near = this.findNearNpc();
    const surprise = near ? null : surpriseTarget([...this.foeActors.values()].map((a) => a.sim), this.body_, this.data_.balance.foes.surpriseRange);
    if (near !== this.nearNpc || surprise !== this.nearFoe) {
      this.nearNpc = near;
      this.nearFoe = surprise;
      this.hud.setPrompt(near ? `Parler à ${near.def.name}` : surprise ? 'Attaquer par surprise' : null);
    }
    if (near && time > this.modalCooldownUntil && this.actions.justPressed('confirm')) this.startDialogue(near);
    else if (surprise && time > this.modalCooldownUntil && this.actions.justPressed('confirm')) this.engageFoe(surprise, { initiative: true });
    if (time > this.modalCooldownUntil && this.actions.justPressed('menu')) this.openMenu('inventaire');
    else if (time > this.modalCooldownUntil && this.actions.justPressed('journal')) this.openMenu('quetes');
  }

  private enterModal(): void {
    this.modal = true;
    this.body_.moved = false;
    this.body_.sprinting = false;
    this.body_.vx = 0;
    this.body_.vy = 0;
    this.nearNpc = null;
    this.nearFoe = null;
    this.hud.setPrompt(null);
    this.syncHero();
  }

  private leaveModal(): void {
    this.modal = false;
    this.modalCooldownUntil = this.time.now + 250;
    this.grid.setOpenFlags(this.state.openFlags);
    this.refreshGates();
    this.refreshMarkers();
    this.syncFoePresence();
    this.checkProgress(false);
  }

  private startDialogue(actor: NpcActor): void {
    this.enterModal();
    // Le PNJ se tourne vers le héros, et le héros vers lui.
    actor.talking = true;
    const toward = facingToward(actor.x - this.body_.x, actor.footY - 1 - this.body_.y);
    this.body_.facing = toward;
    this.syncHero();
    this.scene.launch(SCENES.dialogue, {
      npcId: actor.def.id,
      onClose: (result: { recruited: boolean }) => {
        if (result.recruited) this.removeNpc(actor);
        actor.talking = false;
        this.leaveModal();
      },
    });
  }

  private removeNpc(actor: NpcActor): void {
    actor.sprite.destroy();
    actor.shadow.destroy();
    actor.marker.destroy();
    actor.glow.destroy();
    actor.spark.destroy();
    this.npcs.delete(actor.def.id);
    this.refreshNpcSolids();
  }

  private openMenu(tab: MenuTab): void {
    this.enterModal();
    this.scene.launch(SCENES.menu, { tab, onClose: () => this.leaveModal() });
  }

  /** Jauge de réputation du lieu habité où se trouve le héros (null ailleurs). */
  private reputationView(): ReputationView | null {
    if (!this.village) return null;
    const ctx = this.gameCtx;
    const value = reputationOf(ctx.progress, this.village);
    const cfg = ctx.data.reputation;
    const tier = cfg.tiers.find((t) => t.id === tierIdOf(value, cfg)) ?? cfg.tiers[2];
    const color = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;
    return {
      place: ctx.index.locations.get(this.village)?.name ?? this.village,
      value,
      min: cfg.min,
      max: cfg.max,
      tierName: tier?.name ?? '',
      tierColor: color(tier?.color ?? '#c9bfa9'),
      tiers: cfg.tiers.map((t) => ({ min: t.min, max: t.max, color: color(t.color) })),
    };
  }

  private syncTownHud(): void {
    this.lastGold = this.gameCtx.progress.gold;
    this.hud.setGold(this.lastGold);
  }

  /** Suit l'or et la réputation du lieu : le HUD se met à jour quand ils changent (dialogue, menu, récompense). */
  private pollTownHud(): void {
    const gold = this.gameCtx.progress.gold;
    if (gold !== this.lastGold) {
      this.lastGold = gold;
      this.hud.setGold(gold);
    }
    if (this.village) {
      const key = `${this.village}:${reputationOf(this.gameCtx.progress, this.village)}`;
      if (key !== this.lastRepKey) {
        const first = this.lastRepKey === '';
        this.lastRepKey = key;
        this.hud.setReputation(this.reputationView(), !first);
      }
    }
  }

  /** Entrée dans un village : décroissance de visite (décision n°10), jauge de réputation. */
  private onLocationEntered(id: string): void {
    if (this.gameCtx.progress.reputation[id] === undefined || this.gameCtx.index.locations.get(id)?.reputation === null) {
      this.village = null;
      this.lastRepKey = '';
      this.hud.setReputation(null);
      return;
    }
    enterLocation(this.gameCtx.progress, id, this.gameCtx.data.reputation);
    this.gameCtx.progress.lastVillage = id;
    this.village = id;
    if (tierAt(this.gameCtx, id) === 'hostile' && this.data_.worldFoes.some((f) => f.kind === 'garde' && f.town === id)) {
      this.hud.toast(`Les gardes de ${this.gameCtx.index.locations.get(id)?.name ?? id} te reconnaissent. Ils te traquent !`);
    }
    this.lastRepKey = `${id}:${reputationOf(this.gameCtx.progress, id)}`;
    this.hud.setReputation(this.reputationView(), true);
  }

  private onLocationLeft(): void {
    this.village = null;
    this.lastRepKey = '';
    this.hud.setReputation(null);
  }

  /** Récompenses de boss et quêtes dont l'objectif vient d'être atteint. */
  private checkProgress(silentStart: boolean): void {
    const notices: Notice[] = collectFlagRewards(this.gameCtx);
    if (silentStart) {
      for (const id of Object.keys(this.gameCtx.progress.quests)) if (questStatus(this.gameCtx, id) === 'ready') this.announced.add(id);
    }
    notices.push(...newlyReady(this.gameCtx, this.announced));
    if (notices.length > 0) this.time.delayedCall(silentStart ? 1200 : 0, () => this.hud.notify(formatNotices(this.gameCtx, notices)));
    this.grid.setOpenFlags(this.state.openFlags);
    this.refreshGates();
    this.refreshMarkers();
  }

  /* ---------- Zones et lieux ---------- */

  private updateZones(): void {
    const update = this.tracker.update(this.body_.x, this.body_.y - 2);
    if (update.zoneChanged && update.zone) this.onZoneEntered(update.zone, update.previousZone !== null);
    if (update.locationChanged && update.location) {
      const id = String(update.location.props['id']);
      const isNew = addUnique(this.state.discoveredLocations, id);
      this.hud.showBanner(update.location.name, isNew ? 'Lieu découvert' : '', 1400);
      this.onLocationEntered(id);
      if (isNew) this.checkProgress(false);
    } else if (update.locationChanged) {
      this.onLocationLeft();
    }
  }

  private onZoneEntered(zone: ZoneDef, announce: boolean): void {
    const isNew = addUnique(this.state.discoveredZones, zone.id);
    if (announce) {
      this.state.progress.zoneVisits += 1;
      this.syncFoePresence();
    }
    this.hud.setZone(`${zone.name}  Niv. ${zone.levelMin}-${zone.levelMax}`);
    this.hud.setTint(Phaser.Display.Color.HexStringToColor(zone.ambient.color).color, zone.ambient.alpha);
    this.hud.setAmbience(zone.ambience);
    this.atmosphere?.setZone(zone);

    if (announce || isNew) this.hud.showBanner(zone.name, `Niveau recommandé ${zone.levelMin}-${zone.levelMax}`, 2200);
  }

  /* ---------- Passages ---------- */

  private onGateBump(flag: string, time: number): void {
    if (time - this.lastGateMessage < GATE_MESSAGE_COOLDOWN_MS) return;
    this.lastGateMessage = time;
    const zone = this.data_.zones.find((z) => z.unlockFlag === flag);
    // Le boss est tombé mais l'accès manque encore (Citadelle : confiance de Pierre-Haute, barque de Dorn).
    const accessMissing = this.state.openFlags.includes(flag) && zone?.accessMessage !== undefined;
    this.hud.toast((accessMissing ? zone?.accessMessage : zone?.gateMessage) ?? 'Le passage est bloqué.');
  }

  private refreshGates(): void {
    for (const [flag, sprites] of this.fog) {
      const open = isGateOpen(flag, new Set(this.state.openFlags), this.gateReq);
      for (const sprite of sprites) sprite.setVisible(!open);
    }
  }

  private setFlags(flags: readonly string[]): void {
    this.state.openFlags.splice(0, this.state.openFlags.length, ...flags);
    this.grid.setOpenFlags(this.state.openFlags);
    this.refreshGates();
  }

  private updateAtmosphere(dt: number): void {
    for (const sprites of this.fog.values()) {
      for (const sprite of sprites) {
        if (!sprite.visible) continue;
        sprite.tilePositionX += 6 * dt;
        sprite.tilePositionY += 2 * dt;
      }
    }
  }

  /* ---------- Debug ---------- */

  private get debugEnabled(): boolean {
    return this.registry.get('debug.enabled') === true;
  }

  private updateDebug(delta: number): void {
    if (!this.debugEnabled) {
      if (this.debugCollisionOn) {
        this.debugCollisionOn = false;
        this.debugOverlay.clear();
      }
      return;
    }
    if (this.actions.justPressed('debugCollision')) {
      this.debugCollisionOn = !this.debugCollisionOn;
      if (!this.debugCollisionOn) this.debugOverlay.clear();
    }
    if (this.actions.justPressed('debugGates')) {
      const allOpen = this.data_.zones.flatMap((z) => (z.unlockFlag === null ? [] : [z.unlockFlag, ...(z.access ?? [])]));
      const open = this.state.openFlags.length === 0;
      this.setFlags(open ? allOpen : []);
      this.hud.toast(open ? 'Debug : tous les passages ouverts' : 'Debug : passages refermés');
    }
    if (this.actions.justPressed('debugTeleport')) this.teleportNext();
    if (this.actions.justPressed('debugBattle')) {
      // Combat engagé là où se tient le héros : la carte est tirée du terrain alentour.
      const size = this.map.tileSize;
      this.startBattle('embuscade_du_gue', { x: Math.floor(this.body_.x / size), y: Math.floor((this.body_.y - 1) / size) });
    }
    if (this.actions.justPressed('debugBattleBoss')) this.startBattle('camp_des_ecumeurs');
    if (this.actions.justPressed('debugEvening') && this.atmosphere) {
      const evening = this.atmosphere.getEvening() < 0.5 ? 1 : 0;
      this.atmosphere.setEvening(evening, 2000);
      this.hud.toast(evening ? 'Debug : soir' : 'Debug : jour');
    }
    if (this.debugCollisionOn) this.drawCollisionOverlay();

    this.debugClock += delta;
    if (this.debugClock > 250) {
      this.debugClock = 0;
      const size = this.map.tileSize;
      const tx = Math.floor(this.body_.x / size);
      const ty = Math.floor((this.body_.y - 2) / size);
      const value = this.grid.valueAt(tx, ty);
      const zone = this.tracker.currentZone;
      const location = this.tracker.currentLocation;
      this.registry.set(
        'debug.info',
        [
          `CASE ${tx},${ty}  PX ${Math.round(this.body_.x)},${Math.round(this.body_.y)}`,
          `ZONE ${zone?.id ?? '-'}  LIEU ${location ? String(location.props['id']) : '-'}`,
          `COLL ${value}  F2 TP  F4 COLL  F6 SOIR  F9 PASSAGES`,
          `F7 COMBAT ICI  F8 CAMP DES ÉCUMEURS`,
        ].join('\n'),
      );
    }
  }

  private teleportNext(): void {
    const places = this.map.locations;
    if (places.length === 0) return;
    this.teleportIndex = (this.teleportIndex + 1) % places.length;
    const place = places[this.teleportIndex];
    if (!place) return;
    const center = objectCenter(place);
    const size = this.map.tileSize;
    const cell = nearestFreeCell(this.grid, Math.floor(center.x / size), Math.floor(center.y / size), 10);
    if (!cell) return;
    placeBodyAt(this.body_, cell.x * size + size / 2, (cell.y + 1) * size - 1);
    this.camera_ = centerOn({ x: this.body_.x, y: this.body_.y - 10 }, this.cameraConfig);
    this.applyCamera();
    this.syncHero();
    this.hud.toast(`Debug : ${place.name}`);
  }

  private drawCollisionOverlay(): void {
    const g = this.debugOverlay;
    g.clear();
    const size = this.map.tileSize;
    const x0 = Math.max(0, Math.floor(this.camera_.x / size));
    const y0 = Math.max(0, Math.floor(this.camera_.y / size));
    const x1 = Math.min(this.map.width - 1, x0 + Math.ceil(this.view.width / size) + 1);
    const y1 = Math.min(this.map.height - 1, y0 + Math.ceil(this.view.height / size) + 1);
    const colors: Record<number, number> = { [COLLISION.blocked]: 0xff3030, [COLLISION.water]: 0x3070ff, [COLLISION.slow]: 0xffd030, [COLLISION.gate]: 0xb050ff };
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const value = this.grid.valueAt(x, y);
        const color = colors[value];
        if (color === undefined) continue;
        g.fillStyle(color, 0.35).fillRect(x * size, y * size, size, size);
      }
    }
    // Boîte de collision du héros.
    const { hitboxWidth, hitboxHeight } = this.data_.balance.exploration;
    g.lineStyle(1, 0x30ff80, 1).strokeRect(Math.round(this.body_.x - hitboxWidth / 2), Math.round(this.body_.y - hitboxHeight), hitboxWidth, hitboxHeight);
  }

  /* ---------- Combat ---------- */

  /**
   * Passage au combat tactique (GDD §9.1) : flash blanc puis zoom radial, et la
   * scène de combat prend le relais. Au retour, le monde reprend là où le héros
   * était (l'état vit dans la session). En attendant les ennemis du monde (M3),
   * seul le debug déclenche un combat (F7, F8).
   */
  private startBattle(encounterId: string, site?: { x: number; y: number }, options: EngageOptions = {}): void {
    if (this.paused || this.leaving) return;
    this.leaving = true;
    this.hud.setPrompt(null);
    const camera = this.cameras.main;
    camera.flash(150, 255, 255, 255);
    this.tweens.add({ targets: camera, zoom: camera.zoom * 1.5, duration: 400, ease: 'Cubic.easeIn' });
    camera.fadeOut(400, 255, 255, 255);
    const data = {
      encounterId,
      returnTo: 'world',
      ...(site ? { site } : {}),
      ...(options.initiative ? { initiative: true } : {}),
      ...(options.ambush ? { ambush: true } : {}),
      ...(options.foeId ? { foeId: options.foeId } : {}),
      ...(options.extraEnemies && options.extraEnemies.length > 0 ? { extraEnemies: options.extraEnemies } : {}),
    };
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.battle, data));
  }

  /* ---------- Ennemis du monde (jalon M3, GDD §7) ---------- */

  private buildFoes(): void {
    ensureFoeTextures(this);
    const params = new URLSearchParams(window.location.search);
    this.foesDebugOff = params.has('debug') && params.get('foes') === 'off';
    this.foeRng = Rng.fromSeed(`foes:${Date.now()}`);
    this.safeGrid = buildSafeGrid(
      this.map.width,
      this.map.height,
      this.map.tileSize,
      this.map.locations.filter((l) => l.kind === 'village' || l.kind === 'ville'),
      this.data_.balance.foes.townSafeMargin,
    );
    this.classScale = classDetectionScale(this.data_);
    this.partyLvl = partyLevel(this.data_, this.state.testLevel);
    this.graceMs = this.data_.balance.foes.graceMs;
    this.syncFoePresence();
  }

  /** Crée les ennemis présents et retire les absents (repos, changement de zone, réputation, boss vaincu). */
  private syncFoePresence(): void {
    if (this.foesDebugOff) return;
    const ctx = this.gameCtx;
    const foesCfg = this.data_.balance.foes;
    const tile = this.map.tileSize;
    for (const def of this.data_.worldFoes) {
      const present = foePresent(ctx, def);
      const actor = this.foeActors.get(def.id);
      if (present && !actor) {
        const encounter = chooseEncounter(this.data_, def, `${def.id}:${ctx.progress.day}:${ctx.progress.zoneVisits}`);
        const level = meanEnemyLevel(encounter);
        const boss = def.kind === 'boss';
        const sim = createFoe(def, { encounterId: encounter.id, level, weak: foeFlees(foesCfg, def, level, this.partyLvl) }, tile);
        const color = Phaser.Display.Color.HexStringToColor(difficultyOf(foesCfg, level, this.partyLvl, boss).color).color;
        const det = foesCfg.detection[def.kind];
        const vision = det.radius > 0 || det.coneRange > 0 ? { circle: det.radius * tile, cone: det.coneRange * tile, coneAngle: det.coneAngle } : null;
        this.foeActors.set(def.id, new FoeActor(this, sim, def.sprite, { color, boss, vision: boss || def.kind === 'embuscade' ? null : vision }, { entities: DEPTH.entities, marker: DEPTH.marker, shadow: DEPTH.shadow }));
      } else if (!present && actor) {
        actor.destroy();
        this.foeActors.delete(def.id);
      }
    }
  }

  private updateFoes(time: number, delta: number): void {
    // Les errants reviennent avec le temps : on revérifie la présence de temps en temps.
    this.presenceTimer += delta;
    if (this.presenceTimer > 2000) {
      this.presenceTimer = 0;
      this.syncFoePresence();
    }
    if (this.foeActors.size === 0) return;
    const cfg = this.data_.balance.foes;
    const exploration = this.data_.balance.exploration;
    const tile = this.map.tileSize;
    const dtMs = Math.min(delta, 100);
    this.graceMs = Math.max(0, this.graceMs - dtMs);
    const body = this.body_;
    const heroCell = feetCell(body.x, body.y, tile);
    const scale = detectionScale({
      sprinting: body.sprinting && body.moved,
      inForest: terrainAtCell(this.map, heroCell.x, heroCell.y) === 'foret',
      sprintMultiplier: exploration.sprintDetectionMultiplier,
      forestMultiplier: exploration.forestDetectionMultiplier,
      classScale: this.classScale,
    });
    const env = { grid: this.grid, cfg, tile, hero: { x: body.x, y: body.y }, scale, grace: this.graceMs > 0, rng: this.foeRng, safe: this.safeGrid };
    const simulated = 40 * tile;
    for (const actor of this.foeActors.values()) {
      const sim = actor.sim;
      const distance = Math.hypot(body.x - sim.x, body.y - sim.y);
      if (distance > simulated) continue;
      const events = updateFoe(sim, dtMs, env);
      actor.sync(time, distance <= cfg.indicatorRange * tile && sim.mode !== 'dormant');
      if (this.handleFoeEvents(actor, events, time)) return;
    }
  }

  /** Renvoie vrai quand un combat s'engage. */
  private handleFoeEvents(actor: FoeActor, events: readonly FoeEvent[], time: number): boolean {
    for (const event of events) {
      switch (event.type) {
        case 'alert':
        case 'flee':
          actor.showBubble('bang', time);
          break;
        case 'lost':
          actor.showBubble('question', time, 1200);
          break;
        case 'reinforce':
          this.hud.toast('Une vigie sonne l’alerte : des renforts accourent !');
          break;
        case 'contact':
          this.engageFoe(actor.sim, { ambush: event.ambush });
          return true;
      }
    }
    return false;
  }

  /** Un ennemi du monde engage la compagnie : rencontre, renforts éventuels, terrain du point de contact. */
  private engageFoe(sim: FoeSim, options: Pick<EngageOptions, 'initiative' | 'ambush'>): void {
    if (this.leaving || this.modal) return;
    const encounter = findEncounter(this.data_, sim.encounterId);
    const rng = Rng.fromSeed(`${sim.def.id}:${Math.round(this.state.progress.clock)}:renforts`);
    const extra: { enemy: string; level: number }[] = [];
    if (sim.reinforced) {
      const pool = encounter.enemies.filter((e) => e.boss !== true);
      const { min, max } = this.data_.balance.foes.reinforcements;
      const count = pool.length === 0 ? 0 : rng.int(min, Math.max(min, max));
      for (let i = 0; i < count; i++) {
        const pick = rng.pick(pool);
        extra.push({ enemy: pick.enemy, level: Math.max(1, pick.level - 1) });
      }
    }
    const tile = this.map.tileSize;
    // Une rencontre de repaire se joue autour du boss ; les autres, là où le héros se tient.
    const site = encounter.sampled?.anchor === 'enemy' ? feetCell(sim.x, sim.y, tile) : feetCell(this.body_.x, this.body_.y, tile);
    this.startBattle(encounter.id, site, { ...options, foeId: sim.def.id, extraEnemies: extra });
  }

  /** Défaite : la compagnie se réveille au dernier village (ou au départ) ; la position du héros est posée avant sa construction. */
  private applyBattleReturn(ret: BattleReturn | undefined): void {
    if (!ret || ret.end !== 'defeat') return;
    const place = ret.wakeAt ? this.map.locations.find((l) => String(l.props['id']) === ret.wakeAt) : undefined;
    const spot = place ? this.freeSpotNear(objectCenter(place)) : this.map.spawns.find((o) => o.props['id'] === 'start');
    if (spot) {
      this.state.player.x = spot.x;
      this.state.player.y = spot.y;
      this.state.player.facing = 's';
    }
  }

  /** Case libre la plus proche (en pixels, pieds au bas de la case) : le centre d'un village peut tomber sous un toit. */
  private freeSpotNear(p: { x: number; y: number }): { x: number; y: number } {
    const t = this.map.tileSize;
    const cx = Math.floor(p.x / t);
    const cy = Math.floor(p.y / t);
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (let dy = -12; dy <= 12; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) continue;
        if (this.map.collision[y * this.map.width + x] !== COLLISION.free) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x: x * t + t / 2, y: (y + 1) * t - 1 };
        }
      }
    }
    return best ?? p;
  }

  private announceBattleReturn(ret: BattleReturn | undefined): void {
    if (!ret) return;
    const lines = formatNotices(this.gameCtx, ret.notices);
    if (ret.end === 'defeat') {
      const where = ret.wakeAt ? this.gameCtx.index.locations.get(ret.wakeAt)?.name ?? ret.wakeAt : 'au point de départ';
      this.time.delayedCall(700, () => this.hud.toast(`La compagnie se réveille ${ret.wakeAt ? `à ${where}` : where}.`));
    } else if (ret.end === 'retreat') {
      this.time.delayedCall(700, () => this.hud.toast('La compagnie a battu en retraite.'));
    }
    if (lines.length > 0) this.time.delayedCall(ret.end === 'victory' ? 700 : 2200, () => this.hud.notify(lines));
  }

  /* ---------- Pause ---------- */

  private togglePause(): void {
    if (this.paused) {
      this.closePause();
      return;
    }
    this.paused = true;
    this.hud.showPause({
      onResume: () => this.closePause(),
      onTitle: () => this.backToTitle(),
      quality: () => this.atmosphere?.getQuality() ?? 'high',
      onQuality: (quality: Quality) => {
        this.atmosphere?.setQuality(quality);
        saveQuality(quality);
      },
    });
    this.tweens.pauseAll();
    this.time.paused = true;
  }

  private closePause(): void {
    this.paused = false;
    this.hud.hidePause();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  private backToTitle(): void {
    this.closePause();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.title));
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.atmosphere?.destroy();
    this.atmosphere = null;
    this.registry.remove('debug.info');
    this.fog.clear();
    this.foeActors.clear();
    this.chimneys = [];
    this.scene.stop(SCENES.worldHud);
    this.time.paused = false;
  }
}
