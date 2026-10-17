/**
 * Combat tactique (GDD §9) : carte sur grille, tour par tour.
 *
 * Toutes les règles viennent de `logic/` (grille, échanges, phases, IA) ; cette
 * scène lit les entrées, appelle les commandes de `logic/tactics/battle.ts` et
 * rejoue leurs événements en animations sur la carte (le spectacle complet des
 * critiques GBA arrive au jalon M8). L'interface vit dans `BattleHudScene`.
 *
 * Phase du joueur : choisir une unité → la déplacer (cases bleues) → Attaquer
 * (prévision affichée, cases rouges) ou Attendre ; Échap annule le
 * déplacement. Phase ennemie : chaque ennemi joue le plan de son IA.
 * Souris : survol = curseur, clic gauche = valider, clic droit = annuler.
 */
import Phaser from 'phaser';
import { ANIM_SPEED_FACTOR, ANIM_SPEED_LABEL, loadAnimSpeed, nextAnimSpeed, saveAnimSpeed, type AnimSpeed } from '../core/settings';
import { showFatalError } from '../core/fatal';
import { ActionInput } from '../core/input';
import { getWorldState } from '../core/session';
import { uiScaleFor, zoomOrigin } from '../core/viewport';
import { loadGameData, type GameData } from '../data';
import { planEnemyAction } from '../logic/ai/enemyAi';
import { forecast } from '../logic/combat/combat';
import { attackUnit, endPhase, livingUnits, moveUnit, phaseComplete, readyUnits, summarize, undoMove, waitUnit } from '../logic/tactics/battle';
import { battleRules, buildBattle, findEncounter } from '../logic/tactics/encounter';
import { cellIndex, cellsInRange, getUnit, inBounds, inWeaponRange, reachable, targetsFrom, terrainAt, threatCells, unitAt, type Reach } from '../logic/tactics/grid';
import type { BattleEvent, BattleRules, BattleState, BattleUnit, Cell, Strike } from '../logic/tactics/types';
import { addUnique } from '../logic/world/worldState';
import { BF_TILE, BF_TOP, BF_WATER_FRAMES } from '../render/battlefield';
import { BATTLE_TEX, ensureBattleFxTextures, ensureBattlefield, ensureMapSprite } from '../render/battleTextures';
import { gradeMatrix } from '../render/grade';
import { WORLD_MAP_KEY } from '../render/worldTextures';
import { loadQuality } from '../core/settings';
import { loadWorldMap } from '../data/worldMap';
import { worldTerrainSource, type TerrainSource } from '../logic/tactics/sampling';
import { PALETTE, mixColor } from '../render/palette';
import { addText } from '../ui/text';
import type { MenuItem } from '../ui/VerticalMenu';
import { BOTTOM_BAR, TOP_BAR, type BattleHudScene, type DodgeSide } from './BattleHudScene';
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
}

/** Zoom du combat : chaque case fait 32 pixels à l'écran, comme une carte GBA agrandie (décision n°58). */
const BATTLE_ZOOM = 2;
/** Le curseur garde cette marge (en cases) avec le bord de l'écran : la carte défile avant. */
const SCROLL_MARGIN = 2;

type Mode = 'busy' | 'browse' | 'move' | 'menu' | 'target' | 'enemy' | 'end';

interface UnitView {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly hpBg: Phaser.GameObjects.Rectangle;
  readonly hpFill: Phaser.GameObjects.Rectangle;
}

const T = BF_TILE;
/** Libellé court de la vitesse des animations (la colonne du menu est étroite). */
const ANIM_SPEED_SHORT: Readonly<Record<AnimSpeed, string>> = { normal: '×1', fast: '×2', off: 'max' };
const DEPTH = { field: 0, frame: 1, threat: 2, highlight: 3, units: 10, cursor: 30, fx: 40, numbers: 50 } as const;
const COLORS = {
  move: 0x4f93e6,
  attack: 0xe0584c,
  threat: 0xb83a3a,
  marked: 0xe07b39,
  player: 0x6fa8dc,
  enemy: 0xd9654b,
  acted: 0x8c869c,
  heal: 0x7fcf6a,
} as const;
const WATER_FRAME_MS = 420;
/** Durées de base (ms) des animations sur la carte, avant le réglage de vitesse. */
const MS = { step: 75, lunge: 90, back: 120, hitStop: 70, number: 650, ko: 520, between: 110, banner: 1300, enemyPause: 160, projectile: 190 } as const;

export class BattleScene extends Phaser.Scene {
  private gameData!: GameData;
  private rules!: BattleRules;
  private state!: BattleState;
  private params!: BattleSceneData;
  private hud!: BattleHudScene;
  private actions!: ActionInput;
  private alive = false;

  private zoom = 3;
  private field!: Phaser.GameObjects.Image;
  private fieldKey = '';
  private views = new Map<string, UnitView>();
  private cursor!: Phaser.GameObjects.Image;
  private cursorCell: Cell = { x: 0, y: 0 };
  private highlights: Phaser.GameObjects.Image[] = [];
  private threatTiles: Phaser.GameObjects.Image[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  private mode: Mode = 'busy';
  private modeSince = 0;
  /** Image où le mode a changé : l'appui qui a provoqué le changement ne doit pas servir deux fois. */
  private modeFrame = -1;
  private selected: BattleUnit | null = null;
  private reach: Reach | null = null;
  private targets: BattleUnit[] = [];
  private targetIndex = 0;
  private showAllThreat = false;
  private marked = new Set<string>();
  private speed: AnimSpeed = 'normal';
  private pendingClick: { cell: Cell; right: boolean } | null = null;
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
    try {
      this.gameData = loadGameData();
      this.rules = battleRules(this.gameData);
      const encounter = findEncounter(this.gameData, params.encounterId);
      // `?debug&seed=…` rejoue un combat à l'identique (placement et dés).
      const url = new URLSearchParams(window.location.search);
      const seed = params.seed ?? (url.has('debug') && url.get('seed') ? `${url.get('seed')}` : `${params.encounterId}:${Date.now()}`);
      this.state = buildBattle(encounter, this.gameData.encounters.testParty, this.gameData, {
        seed,
        initiative: params.initiative === true,
        world: this.worldSource(),
        ...(params.site ? { site: params.site } : {}),
      });
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
    this.buildField();
    this.layoutCamera();
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
      const cell = this.cellAtPointer(pointer);
      if (cell) this.pendingClick = { cell, right: pointer.rightButtonDown() };
      else if (pointer.rightButtonDown()) this.pendingClick = { cell: this.cursorCell, right: true };
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());

    const encounterName = this.state.name;
    const boss = this.state.units.find((u) => u.isBoss);
    this.hud.setHeader(encounterName, this.state.objective === 'boss' && boss ? `Objectif : vaincre ${boss.name}` : 'Objectif : vaincre tous les ennemis');
    this.hud.setPhase('player', 1);
    const hero = this.state.units.find((u) => u.isHero) ?? this.state.units[0];
    if (hero) {
      this.setCursor(hero);
      this.centerCameraOn(hero);
    }
    this.cameras.main.fadeIn(450, 0, 0, 0);
    void this.openingSequence();
  }

  /* ---------- Construction ---------- */

  private buildField(): void {
    const rows: string[][] = [];
    for (let y = 0; y < this.state.map.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.state.map.width; x++) row.push(terrainAt(this.state.map, x, y).id);
      rows.push(row);
    }
    this.fieldKey = this.state.encounterId;
    ensureBattlefield(this, this.fieldKey, rows, 7);
    this.field = this.add.image(0, -BF_TOP, BATTLE_TEX.field(this.fieldKey, 0)).setOrigin(0, 0).setDepth(DEPTH.field);
    let frame = 0;
    this.time.addEvent({
      delay: WATER_FRAME_MS,
      loop: true,
      callback: () => {
        frame = (frame + 1) % BF_WATER_FRAMES;
        this.field.setTexture(BATTLE_TEX.field(this.fieldKey, frame));
      },
    });
    // Cadre autour du champ de bataille : liseré sombre puis métal.
    const w = this.state.map.width * T;
    const h = this.state.map.height * T;
    const g = this.add.graphics().setDepth(DEPTH.frame);
    g.fillStyle(PALETTE.encre, 0.55).fillRect(-3, h + 1, w + 6, 3);
    g.lineStyle(1, PALETTE.encre, 1).strokeRect(-1.5, -1.5, w + 3, h + 3);
    g.lineStyle(1, PALETTE.metal, 1).strokeRect(-2.5, -2.5, w + 5, h + 5);
    // Le débord des décors au-dessus de la première rangée est rogné au cadre.
    this.field.setCrop(0, BF_TOP - 2, w, h + 2);
  }

  /** Carte du monde (cache du chargement) : le combat se joue sur son terrain. */
  private worldSource(): TerrainSource | undefined {
    const raw = this.cache.tilemap.get(WORLD_MAP_KEY)?.data as unknown;
    if (!raw) return undefined;
    return worldTerrainSource(loadWorldMap(raw, { zones: this.gameData.zones, terrains: this.gameData.terrains, tileSize: this.gameData.balance.exploration.tileSize }));
  }

  /**
   * Caméra GBA (décision n°58) : zoom ×2, entre le bandeau du haut et la barre
   * d'aide du bas ; la carte défile avec le curseur. L'étalonnage de la zone du
   * monde où se joue le combat est appliqué (sauf qualité « Désactivée »).
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
    const zone = this.gameData.zones.find((z) => z.id === this.state.zone);
    if (zone && loadQuality() !== 'off') camera.filters.internal.addColorMatrix().colorMatrix.set(gradeMatrix(zone.grade));
  }

  /** Bornes du défilement : la carte reste à l'écran ; plus petite que l'écran, elle est centrée. */
  private clampCam(x: number, y: number): { x: number; y: number } {
    const mapW = this.state.map.width * T;
    const mapH = this.state.map.height * T;
    const { w, h } = this.viewSize;
    const cx = mapW <= w ? (mapW - w) / 2 : Math.max(-4, Math.min(mapW - w + 4, x));
    const cy = mapH <= h ? (mapH - h) / 2 : Math.max(-4, Math.min(mapH - h + 4, y));
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
    if (cell.y * T < y + m) y = cell.y * T - m;
    if ((cell.y + 1) * T > y + h - m) y = (cell.y + 1) * T - h + m;
    this.camTarget = this.clampCam(x, y);
  }

  private applyCamera(): void {
    const camera = this.cameras.main;
    const origin = zoomOrigin(camera.width, camera.height, this.zoom);
    camera.setScroll(Math.round(this.cam.x) - origin.x, Math.round(this.cam.y) - origin.y);
    // Les fenêtres passent du côté opposé au curseur.
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
    for (const unit of this.state.units) {
      const sprite = this.add.sprite(0, 0, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1);
      const hpBg = this.add.rectangle(-6, -2, 12, 2, PALETTE.encre, 0.9).setOrigin(0, 0);
      const hpFill = this.add.rectangle(-6, -2, 12, 2, COLORS.heal, 1).setOrigin(0, 0);
      const parts: Phaser.GameObjects.GameObject[] = [sprite, hpBg, hpFill];
      if (unit.isBoss) parts.push(this.add.image(0, -23, BATTLE_TEX.crown));
      if (unit.isHero) parts.push(this.add.image(5, -21, BATTLE_TEX.heroMark));
      const container = this.add.container(0, 0, parts);
      this.views.set(unit.id, { container, sprite, hpBg, hpFill });
      sprite.anims.play({ key: BATTLE_TEX.msIdle(unit.sprite, unit.team), startFrame: Math.floor(Math.random() * 3) });
      this.syncUnit(unit);
    }
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
    view.container.setPosition(unit.x * T + T / 2, unit.y * T + T).setDepth(DEPTH.units + unit.y * 0.01);
    view.container.setVisible(unit.hp > 0);
    const ratio = unit.hp / unit.stats.pv;
    view.hpFill.width = Math.max(1, Math.round(12 * ratio));
    view.hpFill.setFillStyle(ratio > 0.5 ? COLORS.heal : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre, 1);
    const showBar = unit.hp < unit.stats.pv;
    view.hpBg.setVisible(showBar);
    view.hpFill.setVisible(showBar);
    const done = unit.team === this.state.phase && unit.acted && this.state.outcome === 'ongoing';
    if (done) {
      view.sprite.anims.stop();
      view.sprite.setFrame(BATTLE_TEX.msFrame('idle', 0)).setTint(COLORS.acted);
    } else {
      view.sprite.clearTint();
      if (!view.sprite.anims.isPlaying) view.sprite.anims.play(BATTLE_TEX.msIdle(unit.sprite, unit.team));
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
    this.cursor.setPosition(x * T - 2, y * T - 2);
    this.followCell(this.cursorCell);
    this.refreshHover();
  }

  private refreshHover(): void {
    const { x, y } = this.cursorCell;
    const unit = unitAt(this.state, x, y);
    const key = `${x},${y},${unit?.id ?? ''},${unit?.hp ?? ''},${this.mode}`;
    if (key === this.lastHover) return;
    this.lastHover = key;
    this.hud.showTerrain(terrainAt(this.state.map, x, y));
    if (this.mode === 'target') return;
    this.hud.showUnit(unit ?? this.selected);
  }

  private cellAtPointer(pointer: Phaser.Input.Pointer): Cell | null {
    const camera = this.cameras.main;
    if (pointer.y < camera.y || pointer.y >= camera.y + camera.height) return null;
    const p = camera.getWorldPoint(pointer.x, pointer.y);
    const x = Math.floor(p.x / T);
    const y = Math.floor(p.y / T);
    return inBounds(this.state.map, x, y) ? { x, y } : null;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.alive || this.mode === 'busy' || this.mode === 'enemy' || this.mode === 'end' || this.mode === 'menu') return;
    const cell = this.cellAtPointer(pointer);
    if (!cell || (cell.x === this.cursorCell.x && cell.y === this.cursorCell.y)) return;
    if (this.mode === 'target') {
      const i = this.targets.findIndex((t) => t.x === cell.x && t.y === cell.y);
      if (i >= 0) this.focusTarget(i);
      return;
    }
    this.setCursor(cell);
  }

  /* ---------- Cases colorées ---------- */

  private paintTiles(pool: Phaser.GameObjects.Image[], cells: Iterable<Cell>, color: number, alpha: number, depth: number): void {
    for (const c of cells) {
      pool.push(this.add.image(c.x * T, c.y * T, BATTLE_TEX.tile).setOrigin(0, 0).setTint(color).setAlpha(alpha).setDepth(depth));
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
    for (const stop of reach.stops) {
      for (const c of cellsInRange(map, stop, unit.weapon.range)) {
        const i = cellIndex(map, c.x, c.y);
        if (!reach.cost.has(i)) red.set(i, c);
      }
    }
    this.paintTiles(this.highlights, blue, COLORS.move, 0.5, DEPTH.highlight);
    this.paintTiles(this.highlights, red.values(), COLORS.attack, 0.42, DEPTH.highlight);
  }

  /* ---------- Boucle ---------- */

  override update(_time: number, delta: number): void {
    if (!this.alive || !this.state) return;
    this.updateCamera(delta);
    this.updateDebug();
    // Le mode vient de changer pendant cette image (menu validé dans l'interface) : on attend la suivante.
    if (this.modeFrame === this.game.loop.frame) return;
    const click = this.pendingClick;
    this.pendingClick = null;
    // Un clic arrivé au moment d'un changement de mode (menu validé à la souris) est ignoré.
    const clickOk = click !== null && this.time.now - this.modeSince > 120;
    switch (this.mode) {
      case 'browse':
        this.updateBrowse(clickOk ? click : null);
        break;
      case 'move':
        this.updateMove(clickOk ? click : null);
        break;
      case 'target':
        this.updateTarget(clickOk ? click : null);
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
    this.cursor.setVisible(mode !== 'enemy' && mode !== 'end');
    this.refreshHelp();
    this.refreshHover();
  }

  private refreshHelp(): void {
    const lines: Record<Mode, readonly (readonly [string, string])[]> = {
      browse: [
        ['Entrée', 'choisir'],
        ['R', 'menaces'],
        ['F', 'unité suiv.'],
        ['Tab', 'menu'],
      ],
      move: [
        ['Entrée', 'aller ici'],
        ['Échap', 'annuler'],
      ],
      target: [
        ['Flèches', 'cible'],
        ['Entrée', 'attaquer'],
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
    this.hud.showHelp(lines[this.mode]);
  }

  private cursorStep(): Cell | null {
    const dx = (this.actions.justPressed('right') ? 1 : 0) - (this.actions.justPressed('left') ? 1 : 0);
    const dy = (this.actions.justPressed('down') ? 1 : 0) - (this.actions.justPressed('up') ? 1 : 0);
    return dx !== 0 || dy !== 0 ? { x: dx, y: dy } : null;
  }

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
    if (click?.right || this.actions.justPressed('cancel')) {
      if (this.marked.size > 0) {
        this.marked.clear();
        this.refreshThreat();
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
    } else {
      this.openMapMenu();
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
    this.hud.showDetails(unit);
    const view = this.views.get(unit.id);
    view?.sprite.anims.play(BATTLE_TEX.msWalk(unit.sprite, unit.team, 'down'));
    this.setMode('move');
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
      this.deselect();
      this.setMode('browse');
      return;
    }
    if (click) this.setCursor(click.cell);
    if (!click && !this.actions.justPressed('confirm')) return;

    const cell = this.cursorCell;
    if (cell.x === unit.x && cell.y === unit.y) {
      this.openActionMenu();
      return;
    }
    if (reach.stops.some((s) => s.x === cell.x && s.y === cell.y)) {
      void this.moveSelected(cell, null);
      return;
    }
    // Clic sur un ennemi atteignable : on va sur la case la plus proche d'où il est à portée.
    const enemy = unitAt(this.state, cell.x, cell.y);
    if (enemy && enemy.team !== unit.team) {
      const from = reach.stops
        .filter((s) => inWeaponRange(unit, s, enemy) && !(unitAt(this.state, s.x, s.y) && (s.x !== unit.x || s.y !== unit.y)))
        .sort((a, b) => (reach.cost.get(cellIndex(this.state.map, a.x, a.y)) ?? 0) - (reach.cost.get(cellIndex(this.state.map, b.x, b.y)) ?? 0))[0];
      if (from) void this.moveSelected(from, enemy);
    }
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
    if (thenTarget) this.startTargeting(thenTarget);
    else this.openActionMenu();
  }

  private openActionMenu(): void {
    const unit = this.selected;
    if (!unit) return;
    this.clearTiles(this.highlights);
    this.views.get(unit.id)?.sprite.anims.play(BATTLE_TEX.msWalk(unit.sprite, unit.team, 'down'));
    const targets = targetsFrom(this.state, unit, unit);
    // Portée d'attaque depuis la case choisie.
    this.paintTiles(this.highlights, cellsInRange(this.state.map, unit, unit.weapon.range), COLORS.attack, 0.38, DEPTH.highlight);
    const items: MenuItem[] = [
      { label: 'Attaquer', enabled: targets.length > 0, onSelect: () => this.startTargeting(null) },
      { label: 'Attendre', onSelect: () => void this.finishAction(() => waitUnit(this.state, unit.id)) },
    ];
    this.setMode('menu');
    this.hud.openMenu({
      title: unit.name,
      items,
      onCancel: () => {
        this.hud.closeMenu();
        undoMove(this.state, unit.id);
        this.syncUnit(unit);
        this.select(unit);
        this.setCursor(unit);
      },
    });
  }

  private startTargeting(preferred: BattleUnit | null): void {
    const unit = this.selected;
    if (!unit) return;
    this.hud.closeMenu();
    this.targets = targetsFrom(this.state, unit, unit).sort((a, b) => a.y - b.y || a.x - b.x);
    if (this.targets.length === 0) {
      this.openActionMenu();
      return;
    }
    this.setMode('target');
    this.focusTarget(Math.max(0, preferred ? this.targets.indexOf(preferred) : 0));
  }

  private focusTarget(index: number): void {
    const unit = this.selected;
    const n = this.targets.length;
    if (!unit || n === 0) return;
    this.targetIndex = ((index % n) + n) % n;
    const target = this.targets[this.targetIndex] as BattleUnit;
    this.setCursor(target);
    this.hud.showUnit(target);
    this.hud.showForecast(forecast(this.state, unit, target, this.rules), unit, target);
  }

  private updateTarget(click: { cell: Cell; right: boolean } | null): void {
    const unit = this.selected;
    if (!unit) return;
    if (click?.right || this.actions.justPressed('cancel')) {
      this.hud.showForecast(null, null, null);
      this.setCursor(unit);
      this.openActionMenu();
      return;
    }
    if (this.actions.justPressed('right') || this.actions.justPressed('down')) this.focusTarget(this.targetIndex + 1);
    if (this.actions.justPressed('left') || this.actions.justPressed('up')) this.focusTarget(this.targetIndex - 1);
    let confirm = this.actions.justPressed('confirm');
    if (click) {
      const i = this.targets.findIndex((t) => t.x === click.cell.x && t.y === click.cell.y);
      if (i >= 0) {
        this.focusTarget(i);
        confirm = true;
      }
    }
    if (!confirm) return;
    const target = this.targets[this.targetIndex];
    if (!target) return;
    this.hud.showForecast(null, null, null);
    void this.finishAction(() => attackUnit(this.state, unit.id, target.id, this.rules));
  }

  /** Joue l'action choisie (attaque ou attente), puis passe à la suite. */
  private async finishAction(command: () => BattleEvent[]): Promise<void> {
    const unit = this.selected;
    this.hud.closeMenu();
    this.hud.showDetails(null);
    this.clearTiles(this.highlights);
    this.setMode('busy');
    const events = command();
    await this.playEvents(events);
    if (!this.alive) return;
    this.selected = null;
    this.reach = null;
    this.hud.showDetails(null);
    if (unit) this.syncUnit(unit);
    this.syncAll();
    this.refreshThreat();
    if (this.state.outcome !== 'ongoing') {
      await this.finish();
      return;
    }
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
    this.hud.openMenu({ title: 'Menu', items, onCancel: close });
  }

  private retreat(): void {
    this.hud.closeMenu();
    this.setMode('end');
    this.hud.toast('La compagnie se retire du combat.');
    this.leave(false);
  }

  /* ---------- Phases ---------- */

  private async openingSequence(): Promise<void> {
    this.setMode('busy');
    await this.wait(350);
    await this.hud.phaseBanner('player', this.state.turn, this.dur(MS.banner, 400));
    if (this.state.initiative) this.hud.toast('Embuscade réussie : l’ennemi est pris de court !');
    if (!this.alive) return;
    this.setMode('browse');
  }

  private async nextPhase(): Promise<void> {
    this.setMode('busy');
    this.marked.clear();
    const events = endPhase(this.state);
    await this.playEvents(events);
    if (!this.alive) return;
    this.syncAll();
    this.refreshThreat();
    if (this.state.phase === 'enemy') {
      await this.runEnemyPhase();
    } else {
      const hero = this.state.units.find((u) => u.isHero && u.hp > 0) ?? readyUnits(this.state)[0];
      if (hero) this.setCursor(hero);
      this.setMode('browse');
    }
  }

  private async runEnemyPhase(): Promise<void> {
    this.setMode('enemy');
    for (const enemy of [...readyUnits(this.state)]) {
      if (!this.alive || this.state.outcome !== 'ongoing') break;
      if (enemy.hp <= 0 || enemy.acted) continue;
      const plan = planEnemyAction(this.state, enemy.id, this.rules);
      this.cursor.setVisible(true);
      this.setCursorQuiet(enemy);
      this.hud.showUnit(enemy);
      await this.wait(MS.enemyPause);
      if (plan.to.x !== enemy.x || plan.to.y !== enemy.y) {
        await this.playEvents(moveUnit(this.state, enemy.id, plan.to));
        this.setCursorQuiet(enemy);
      }
      if (plan.targetId) {
        await this.playEvents(attackUnit(this.state, enemy.id, plan.targetId, this.rules));
      } else {
        waitUnit(this.state, enemy.id);
      }
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
    this.cursor.setPosition(cell.x * T - 2, cell.y * T - 2);
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
          this.floatText(unit, `+${event.amount}`, COLORS.heal);
          this.syncUnit(unit);
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
      }
    }
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
      await this.tween({ targets: view.container, x: to.x * T + T / 2, y: to.y * T + T, duration: step });
    }
    view.sprite.setFlipX(false);
    view.sprite.anims.play(BATTLE_TEX.msWalk(unit.sprite, unit.team, 'down'));
    if (unit.team === 'enemy' || unit.acted) view.sprite.anims.play(BATTLE_TEX.msIdle(unit.sprite, unit.team));
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
    const playerFirst = attacker.team === 'player';
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
    const home = { x: striker.x * T + T / 2, y: striker.y * T + T };
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

    const tx = target.x * T + T / 2;
    const ty = target.y * T + T;
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
  }

  private async projectile(from: BattleUnit, to: BattleUnit): Promise<void> {
    const magic = from.weapon.damage === 'magique';
    const color = from.weapon.element ? Phaser.Display.Color.HexStringToColor(this.gameData.elements.find((e) => e.id === from.weapon.element)?.color ?? '#ffffff').color : magic ? PALETTE.cyanEclat : PALETTE.parchemin;
    const sx = from.x * T + T / 2;
    const sy = from.y * T + T - 12;
    const ex = to.x * T + T / 2;
    const ey = to.y * T + T - 12;
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
    this.hud.toast(unit.team === 'player' ? `${unit.name} est hors de combat.` : `${unit.name} est vaincu${unit.isBoss ? ' !' : '.'}`);
    flashWhite(view.sprite, true);
    await this.tween({ targets: view.container, alpha: 0, duration: this.dur(MS.ko, 120), ease: 'Stepped', easeParams: [5] });
    view.container.setVisible(false).setAlpha(1);
    flashWhite(view.sprite, false);
    this.marked.delete(unitId);
  }

  private floatText(unit: BattleUnit, text: string, color: number, offsetY = 0): void {
    const label = addText(this, unit.x * T + T / 2, unit.y * T - 8 + offsetY, text, { font: 'small', color, align: 'center', shadow: PALETTE.encre }).setDepth(DEPTH.numbers);
    const duration = this.dur(MS.number, 350);
    this.tweens.add({ targets: label, y: label.y - 8, duration: duration * 0.5, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: label, alpha: 0, delay: duration * 0.6, duration: duration * 0.4, onComplete: () => label.destroy() });
  }

  /* ---------- Fin du combat ---------- */

  private async finish(): Promise<void> {
    this.setMode('end');
    this.clearTiles(this.highlights);
    this.clearTiles(this.threatTiles);
    await this.wait(500);
    if (!this.alive) return;
    const summary = summarize(this.state);
    const opensWorld = this.params.returnTo === 'world' && getWorldState() !== null;
    this.hud.showResult(summary, opensWorld, () => {
      this.hud.lockResult();
      this.leave(summary.outcome === 'victory');
    });
  }

  /** Retour à la scène d'origine ; une victoire lève les drapeaux de la rencontre (passages du monde). */
  private leave(victory: boolean): void {
    const world = getWorldState();
    if (victory && world) for (const flag of this.state.victoryFlags) addUnique(world.openFlags, flag);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.params.returnTo === 'world' && world) this.scene.start(SCENES.world);
      else this.scene.start(SCENES.title);
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
            for (const key of ['x', 'y', 'alpha', 'scale'] as const) {
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
      this.state.outcome = 'victory';
      this.syncAll();
      void this.finish();
    }
    this.registry.set(
      'debug.info',
      [`COMBAT ${this.state.encounterId}  MODE ${this.mode}`, `CASE ${this.cursorCell.x},${this.cursorCell.y}  ZOOM ×${this.zoom}  F2 VICTOIRE`].join('\n'),
    );
  }

  private onShutdown(): void {
    this.alive = false;
    this.views.clear();
    this.highlights = [];
    this.threatTiles = [];
    this.marked.clear();
    this.selected = null;
    this.reach = null;
    this.registry.remove('debug.info');
    this.scene.stop(SCENES.battleHud);
  }
}

/** Silhouette blanche (impact) en mode de teinte « remplissage » de Phaser 4, ou retour à la normale. */
function flashWhite(sprite: Phaser.GameObjects.Sprite, on: boolean): void {
  if (on) sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  else sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
}
