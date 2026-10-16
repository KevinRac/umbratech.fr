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
import { WORLD_HEIGHT as GAME_HEIGHT, WORLD_WIDTH as GAME_WIDTH } from '../core/config';
import { showFatalError } from '../core/fatal';
import { ActionInput } from '../core/input';
import { getWorldState, setWorldState } from '../core/session';
import { GameDataError, loadGameData, type GameData } from '../data';
import type { ZoneDef } from '../data/schemas';
import { COLLISION, WorldMapError, loadWorldMap, type WorldMap } from '../data/worldMap';
import { centerOn, followTarget, type CameraConfig, type Vec2 } from '../logic/world/camera';
import { CollisionGrid } from '../logic/world/collision';
import { createBody, placeBodyAt, spritePose, stepBody, type BodyState } from '../logic/world/movement';
import { nearestFreeCell } from '../logic/world/pathfinding';
import { ZoneTracker } from '../logic/world/zones';
import { addUnique, newWorldState, objectCenter, type WorldState } from '../logic/world/worldState';
import { setLogicalSize } from '../render/displayScaler';
import { createAmbience } from '../render/ambience';
import { PALETTE } from '../render/palette';
import { WORLD_MAP_KEY, WORLD_TEX, WORLD_TILESET_KEY, ensureHeroAnimations, ensureWorldTextures } from '../render/worldTextures';
import { WATER_FRAMES } from '../render/waterTile';
import { drawPanel } from '../ui/panel';
import { addText, setText, type PixelText } from '../ui/text';
import { Toasts } from '../ui/Toasts';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

const DEPTH = {
  water: -10,
  ground: 0,
  decor: 1,
  shadow: 2,
  entities: 2.1,
  canopy: 10,
  fog: 11,
  ambience: 60,
  tint: 80,
  debug: 90,
  hud: 100,
  banner: 110,
  pause: 200,
} as const;

const TILESET_NAME = 'world_tiles';
const WATER_FRAME_MS = 420;
const GATE_MESSAGE_COOLDOWN_MS = 4000;
const HINT_DURATION_MS = 9000;

export interface WorldSceneData {
  /** Vrai pour une nouvelle partie : l'état du monde repart du point de départ. */
  readonly newGame?: boolean;
}

export class WorldScene extends Phaser.Scene {
  private data_!: GameData;
  private map!: WorldMap;
  private grid!: CollisionGrid;
  private state!: WorldState;
  private actions!: ActionInput;
  private toasts!: Toasts;
  private tracker!: ZoneTracker;
  private body_!: BodyState;
  private camera_: Vec2 = { x: 0, y: 0 };
  private cameraConfig!: CameraConfig;

  private hero!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private water!: Phaser.GameObjects.TileSprite;
  private tint!: Phaser.GameObjects.Rectangle;
  private ambience: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fog = new Map<string, Phaser.GameObjects.TileSprite[]>();
  private banner: Phaser.GameObjects.Container | null = null;
  private zoneLabel!: PixelText;
  private zonePanel!: Phaser.GameObjects.Graphics;

  private paused = false;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseMenu: VerticalMenu | null = null;

  private lastGateMessage = -Infinity;
  private waterFrame = 0;
  private debugCollisionOn = false;
  private debugOverlay!: Phaser.GameObjects.Graphics;
  private teleportIndex = -1;
  private debugClock = 0;

  constructor() {
    super(SCENES.world);
  }

  create(data: WorldSceneData = {}): void {
    setLogicalSize(this.game, GAME_WIDTH, GAME_HEIGHT);
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
    this.toasts = new Toasts(this);
    ensureWorldTextures(this);
    ensureHeroAnimations(this);

    if (data.newGame || !getWorldState()) setWorldState(newWorldState(this.map));
    this.state = getWorldState() as WorldState;
    this.grid = CollisionGrid.fromMap(this.map, this.state.openFlags);
    this.tracker = new ZoneTracker(this.map, this.data_.zones);

    const exploration = this.data_.balance.exploration;
    const worldWidth = this.map.width * this.map.tileSize;
    const worldHeight = this.map.height * this.map.tileSize;
    this.cameraConfig = {
      view: { width: GAME_WIDTH, height: GAME_HEIGHT },
      world: { width: worldWidth, height: worldHeight },
      deadzone: { width: exploration.cameraDeadzoneWidth, height: exploration.cameraDeadzoneHeight },
      lerp: exploration.cameraLerp,
    };

    this.buildMapLayers(worldWidth, worldHeight);
    this.buildHero();
    this.buildGateFog();
    this.buildHud();
    this.debugOverlay = this.add.graphics().setDepth(DEPTH.debug);

    this.tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.tint);
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 0.95, 0.22);

    this.camera_ = centerOn({ x: this.body_.x, y: this.body_.y - 10 }, this.cameraConfig);
    this.applyCamera();
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
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

  private buildHero(): void {
    const { player } = this.state;
    this.body_ = createBody(player.x, player.y, player.facing);
    // Outil de debug : `?debug&at=31,58` pose le héros sur la case indiquée.
    const params = new URLSearchParams(window.location.search);
    const at = params.has('debug') ? /^(\d+),(\d+)$/.exec(params.get('at') ?? '') : null;
    if (at) placeBodyAt(this.body_, Number(at[1]) * this.map.tileSize + this.map.tileSize / 2, (Number(at[2]) + 1) * this.map.tileSize - 1);
    // Le point d'apparition peut tomber dans un décor (carte modifiée) : on cherche la case libre voisine.
    this.snapToFree(this.body_);

    this.shadow = this.add.image(0, 0, WORLD_TEX.shadow).setOrigin(0.5, 0.5).setDepth(DEPTH.shadow);
    this.hero = this.add.sprite(0, 0, WORLD_TEX.hero, WORLD_TEX.heroFrame('down', 0)).setOrigin(0.5, 1);
    this.syncHero();
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

  private buildHud(): void {
    this.zonePanel = drawPanel(this, 4, 4, 120, 18).setScrollFactor(0).setDepth(DEPTH.hud).setAlpha(0.9);
    this.zoneLabel = addText(this, 11, 7, '', { font: 'small', color: PALETTE.parchemin }).setScrollFactor(0).setDepth(DEPTH.hud + 1) as PixelText;

    const hintBar = this.add.rectangle(0, GAME_HEIGHT - 14, GAME_WIDTH, 14, PALETTE.nuit, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    const hint = addText(this, 8, GAME_HEIGHT - 12, 'ZQSD / flèches : marcher   Maj : courir   Échap : pause', { font: 'small', color: PALETTE.metalClair }).setScrollFactor(0).setDepth(DEPTH.hud);
    this.tweens.add({ targets: [hint, hintBar], alpha: 0, delay: HINT_DURATION_MS, duration: 800, onComplete: () => { hint.destroy(); hintBar.destroy(); } });
  }

  /* ---------- Boucle ---------- */

  override update(time: number, delta: number): void {
    if (!this.map) return;
    if (this.actions.justPressed('cancel')) {
      this.togglePause();
    }
    if (this.paused) {
      this.pauseMenu?.update();
      return;
    }

    const dt = delta / 1000;
    const input = {
      dx: (this.actions.isDown('right') ? 1 : 0) - (this.actions.isDown('left') ? 1 : 0),
      dy: (this.actions.isDown('down') ? 1 : 0) - (this.actions.isDown('up') ? 1 : 0),
      sprint: this.actions.isDown('sprint'),
    };
    stepBody(this.body_, input, dt, this.grid, this.data_.balance.exploration);
    if (this.body_.bumpedGate) this.onGateBump(this.body_.bumpedGate, time);

    this.camera_ = followTarget(this.camera_, { x: this.body_.x, y: this.body_.y - 10 }, Math.min(dt, 0.05), this.cameraConfig);
    this.applyCamera();
    this.syncHero();
    this.updateZones();
    this.updateAtmosphere(dt);
    this.updateDebug(delta);
  }

  private applyCamera(): void {
    this.cameras.main.setScroll(Math.round(this.camera_.x), Math.round(this.camera_.y));
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
    // L'état partagé suit le héros (la sauvegarde y lira sa position, jalon M9).
    this.state.player.x = body.x;
    this.state.player.y = body.y;
    this.state.player.facing = body.facing;
  }

  /* ---------- Zones et lieux ---------- */

  private updateZones(): void {
    const update = this.tracker.update(this.body_.x, this.body_.y - 2);
    if (update.zoneChanged && update.zone) this.onZoneEntered(update.zone, update.previousZone !== null);
    if (update.locationChanged && update.location) {
      const id = String(update.location.props['id']);
      const isNew = addUnique(this.state.discoveredLocations, id);
      this.showBanner(update.location.name, isNew ? 'Lieu découvert' : '', 1400);
    }
  }

  private onZoneEntered(zone: ZoneDef, announce: boolean): void {
    const isNew = addUnique(this.state.discoveredZones, zone.id);
    setText(this.zoneLabel, `${zone.name}  Niv. ${zone.levelMin}-${zone.levelMax}`);
    this.zonePanel.setVisible(true);
    this.resizeZonePanel(Math.ceil(this.zoneLabel.width) + 14);

    const color = Phaser.Display.Color.HexStringToColor(zone.ambient.color).color;
    this.tint.setFillStyle(color, 1).setAlpha(0);
    this.tweens.add({ targets: this.tint, alpha: zone.ambient.alpha, duration: 900 });

    this.ambience?.destroy();
    this.ambience = createAmbience(this, zone.ambience, DEPTH.ambience);

    if (announce || isNew) this.showBanner(zone.name, `Niveau recommandé ${zone.levelMin}-${zone.levelMax}`, 2200);
  }

  private resizeZonePanel(width: number): void {
    this.zonePanel.destroy();
    this.zonePanel = drawPanel(this, 4, 4, width, 18).setScrollFactor(0).setDepth(DEPTH.hud).setAlpha(0.9);
  }

  private showBanner(title: string, subtitle: string, holdMs: number): void {
    this.banner?.destroy(true);
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.banner);
    const titleText = addText(this, GAME_WIDTH / 2, 30, title, { font: 'title', color: PALETTE.parchemin, align: 'center' });
    container.add(titleText);
    const width = Math.ceil(titleText.width);
    const lineX = Math.round(GAME_WIDTH / 2 - width / 2 - 6);
    const line = this.add.rectangle(lineX, 48, width + 12, 1, PALETTE.ambre, 0.9).setOrigin(0, 0);
    container.add(line);
    if (subtitle) container.add(addText(this, GAME_WIDTH / 2, 53, subtitle, { font: 'small', color: PALETTE.cyanEclat, align: 'center' }));
    container.setAlpha(0);
    this.banner = container;
    this.tweens.chain({
      targets: container,
      tweens: [
        { alpha: 1, duration: 400 },
        { alpha: 1, duration: holdMs },
        { alpha: 0, duration: 600 },
      ],
      onComplete: () => {
        container.destroy(true);
        if (this.banner === container) this.banner = null;
      },
    });
  }

  /* ---------- Passages ---------- */

  private onGateBump(flag: string, time: number): void {
    if (time - this.lastGateMessage < GATE_MESSAGE_COOLDOWN_MS) return;
    this.lastGateMessage = time;
    const zone = this.data_.zones.find((z) => z.unlockFlag === flag);
    this.toasts.push(zone?.gateMessage ?? 'Le passage est bloqué.');
  }

  private refreshGates(): void {
    for (const [flag, sprites] of this.fog) {
      const open = this.state.openFlags.includes(flag);
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
      const allOpen = this.data_.zones.flatMap((z) => (z.unlockFlag === null ? [] : [z.unlockFlag]));
      const open = this.state.openFlags.length === 0;
      this.setFlags(open ? allOpen : []);
      this.toasts.push(open ? 'Debug : tous les passages ouverts' : 'Debug : passages refermés');
    }
    if (this.actions.justPressed('debugTeleport')) this.teleportNext();
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
          `COLL ${value}  F2 TP  F4 COLL  F9 PASSAGES`,
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
    this.toasts.push(`Debug : ${place.name}`);
  }

  private drawCollisionOverlay(): void {
    const g = this.debugOverlay;
    g.clear();
    const size = this.map.tileSize;
    const x0 = Math.max(0, Math.floor(this.cameras.main.scrollX / size));
    const y0 = Math.max(0, Math.floor(this.cameras.main.scrollY / size));
    const x1 = Math.min(this.map.width - 1, x0 + Math.ceil(GAME_WIDTH / size) + 1);
    const y1 = Math.min(this.map.height - 1, y0 + Math.ceil(GAME_HEIGHT / size) + 1);
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

  /* ---------- Pause ---------- */

  private togglePause(): void {
    if (this.paused) {
      this.closePause();
      return;
    }
    this.paused = true;
    const width = 150;
    const x = Math.round((GAME_WIDTH - width) / 2);
    const lineHeight = 17;
    const y = Math.round((GAME_HEIGHT - (2 * lineHeight + 38)) / 2);
    const items = [
      { label: 'Reprendre', onSelect: () => this.closePause() },
      { label: 'Retour au titre', onSelect: () => this.backToTitle() },
    ];
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.nuit, 0.55).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.pause);
    const panelHeight = items.length * lineHeight + 38;
    const panel = drawPanel(this, x, y, width, panelHeight, { depth: DEPTH.pause + 1 }).setScrollFactor(0);
    const title = addText(this, GAME_WIDTH / 2, y + 7, 'Pause', { color: PALETTE.cyanEclat, align: 'center' }).setScrollFactor(0).setDepth(DEPTH.pause + 2);
    this.pauseObjects = [dim, panel, title];
    this.pauseMenu = new VerticalMenu(this, x + 6, y + 24, items, this.actions, { width: width - 12, lineHeight, depth: DEPTH.pause + 2, fixed: true });
    this.tweens.pauseAll();
    this.time.paused = true;
  }

  private closePause(): void {
    this.paused = false;
    this.pauseMenu?.destroy();
    this.pauseMenu = null;
    for (const object of this.pauseObjects) object.destroy();
    this.pauseObjects = [];
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  private backToTitle(): void {
    this.closePause();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.title));
  }

  private onShutdown(): void {
    this.registry.remove('debug.info');
    this.fog.clear();
    this.ambience = null;
    this.banner = null;
    this.pauseMenu = null;
    this.pauseObjects = [];
    this.time.paused = false;
  }
}
