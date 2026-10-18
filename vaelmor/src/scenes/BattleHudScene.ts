/**
 * Interface du combat tactique (GDD §13.5, §13.7), dessinée en pixels natifs
 * par-dessus `BattleScene` : bandeau du haut (rencontre, objectif, tour et
 * phase), fiche de l'unité survolée, terrain sous le curseur, prévision de
 * l'échange ou de la compétence, menus (actions, objets, menu de carte),
 * bandeaux (phase, renforts, compétence), réplique d'un boss, barres de PV de
 * l'échange en cours, notifications, écran de préparation (jalon M5,
 * GDD §13.4) et écran de fin.
 *
 * La carte occupe tout l'écran entre le bandeau du haut et la barre d'aide du
 * bas ; comme sur GBA, les fenêtres flottent au-dessus de la carte et passent
 * du côté opposé au curseur (`setDodge`) pour ne jamais cacher la case visée.
 * `BattleScene` pilote tout ; les appels reçus avant la création sont mis en attente.
 */
import Phaser from 'phaser';
import { ActionInput } from '../core/input';
import { uiScaleFor } from '../core/viewport';
import type { TerrainDef } from '../data/schemas';
import type { Forecast, SideForecast } from '../logic/combat/combat';
import type { BattleSummary } from '../logic/tactics/battle';
import type { BattleUnit, Team } from '../logic/tactics/types';
import { BATTLE_TEX } from '../render/battleTextures';
import { PALETTE } from '../render/palette';
import { ALLY_OUTLINE } from '../render/unitSprites';
import { PrepSheet, type SheetCallbacks, type SheetView } from '../ui/PrepSheet';
import { drawPanel } from '../ui/panel';
import { ScrollList, type ListRow } from '../ui/ScrollList';
import { addText, fitText, setText, type PixelText } from '../ui/text';
import { Toasts } from '../ui/Toasts';
import { VerticalMenu, type MenuItem } from '../ui/VerticalMenu';
import { SCENES } from './keys';

/** Hauteur du bandeau du haut (à S = 1). */
export const TOP_BAR = 28;
/** Hauteur de la barre d'aide du bas (à S = 1). */
export const BOTTOM_BAR = 20;
/** Hauteur maximale de la prévision (deux notes), à S = 1. */
const FORECAST_MAX_H = 228;
/** Largeur des fenêtres d'unité, de prévision et de détail (à S = 1). */
const WIN_W = 228;

export type DodgeSide = 'left' | 'right';

const DEPTH = { panel: 10, prep: 30, menu: 40, exchange: 50, banner: 80, line: 90, result: 100, toasts: 200 } as const;
/** Couleurs des camps : bleu (compagnie), vert menthe (alliés, comme leur liseré), rouge (ennemis). */
export const TEAM_COLOR: Readonly<Record<Team, number>> = { player: 0x6fa8dc, ally: ALLY_OUTLINE, enemy: 0xd9654b };
const PHASE_LABEL: Readonly<Record<Team, string>> = { player: 'Phase du joueur', ally: 'Phase alliée', enemy: 'Phase ennemie' };
const PHASE_TITLE: Readonly<Record<Team, string>> = { player: 'PHASE DU JOUEUR', ally: 'PHASE ALLIÉE', enemy: 'PHASE ENNEMIE' };
const STAT_LABELS: readonly (readonly [keyof BattleUnit['stats'], string])[] = [
  ['fo', 'FO'],
  ['mag', 'MAG'],
  ['dex', 'DEX'],
  ['vit', 'VIT'],
  ['def', 'DÉF'],
  ['res', 'RÉS'],
  ['chc', 'CHC'],
  ['mob', 'MOB'],
];

export interface MenuRequest {
  readonly title?: string;
  readonly items: MenuItem[];
  readonly onCancel: (() => void) | null;
  /** Grand menu (menu d'action après un déplacement) : texte doublé, lignes hautes. */
  readonly large?: boolean;
  /** Menu au centre de l'écran (menu de combat, ouvert par Échap). */
  readonly centered?: boolean;
  /** Entrée choisie à l'ouverture (menu rouvert après un réglage). */
  readonly initialIndex?: number;
}

/** Ce que la fiche détaillée montre en plus des stats (jalon M5). */
export interface UnitExtra {
  /** Compétence : nom, coût, prête ou non (raison). */
  readonly skill: { readonly name: string; readonly cost: string; readonly blocker: string | null } | null;
  /** Ressource de classe (« Pierres 2/3 »). */
  readonly resource: string | null;
  /** Objets portés (« Potion ×2 »). */
  readonly items: readonly string[];
  /** Statuts en cours. */
  readonly statuses: readonly { readonly name: string; readonly color: number }[];
  /** Accessoire porté. */
  readonly accessory: string | null;
}

/** Aperçu d'une compétence, d'un objet ou d'un soin avant de valider (fenêtre de prévision). */
export interface SkillPreviewView {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly lines: readonly { readonly name: string; readonly text: string; readonly color: number }[];
}

/** Écran de préparation (GDD §9.3, §13.4). */
export interface PrepView {
  readonly title: string;
  readonly objective: string;
  /** Compagnie : une ligne par membre (marque de déploiement, nom, classe). */
  readonly roster: readonly ListRow[];
  readonly deployed: number;
  readonly maxDeploy: number;
  readonly cursor: number;
  /** Membre choisi : sa fiche (unité telle qu'elle sera déployée). */
  readonly unit: BattleUnit | null;
  readonly extra: UnitExtra | null;
  /** Aperçu des ennemis (type, niveau, nombre ; boss en tête). */
  readonly enemies: readonly { readonly text: string; readonly color: number }[];
  /** Renforts annoncés (ennemis, alliés verts). */
  readonly warnings: readonly { readonly text: string; readonly color: number }[];
  /** Positions imposées (embuscade). */
  readonly locked: boolean;
  readonly canRetreat: boolean;
  readonly message: string | null;
}

export interface PrepCallbacks {
  readonly onCursor: (member: number) => void;
  readonly onToggle: (member: number) => void;
  readonly onFight: () => void;
  readonly onAuto: () => void;
  /** Clic droit sur un membre : sa fiche, son équipement et son sac. */
  readonly onSheet: (member: number) => void;
  readonly onPlace: () => void;
  readonly onBack: (() => void) | null;
}

export interface ExchangeView {
  readonly left: BattleUnit;
  readonly right: BattleUnit;
  readonly leftSide: SideForecast;
  readonly rightSide: SideForecast;
}

export class BattleHudScene extends Phaser.Scene {
  private ready = false;
  private pending: (() => void)[] = [];
  private actions!: ActionInput;
  private toasts!: Toasts;
  private S = 1;

  private header: Phaser.GameObjects.GameObject[] = [];
  /** Côté où flottent les fenêtres (opposé au curseur). */
  private side: DodgeSide = 'left';
  private lastUnit: BattleUnit | null = null;
  private lastDetails: BattleUnit | null = null;
  private lastTerrain: TerrainDef | null = null;
  private lastForecast: [Forecast, BattleUnit, BattleUnit] | null = null;
  private detailParts: Phaser.GameObjects.GameObject[] = [];
  private phaseLabel: PixelText | null = null;
  private unitParts: Phaser.GameObjects.GameObject[] = [];
  private terrainParts: Phaser.GameObjects.GameObject[] = [];
  private forecastParts: Phaser.GameObjects.GameObject[] = [];
  private helpParts: Phaser.GameObjects.GameObject[] = [];
  private menuParts: Phaser.GameObjects.GameObject[] = [];
  private menu: VerticalMenu | null = null;
  private menuCancel: (() => void) | null = null;
  private exchange: Phaser.GameObjects.Container | null = null;
  private exchangeBars = new Map<string, { fill: Phaser.GameObjects.Rectangle; label: PixelText; width: number; max: number }>();
  private resultParts: Phaser.GameObjects.GameObject[] = [];
  private resultMenu: VerticalMenu | null = null;

  constructor() {
    super({ key: SCENES.battleHud, active: false });
  }

  create(): void {
    this.actions = new ActionInput(this);
    this.S = uiScaleFor(this.scale.height);
    this.toasts = new Toasts(this, { depth: DEPTH.toasts, scale: 2 * this.S, textScale: this.S, top: TOP_BAR * this.S });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.list && this.listCancel) this.listCancel();
      else if (pointer.rightButtonDown() && this.menu && this.menuCancel) this.menuCancel();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
      this.pending = [];
      this.menu = null;
      this.menuRect = null;
      this.resultMenu = null;
      this.menuCancel = null;
      this.exchange = null;
      this.exchangeBars.clear();
      this.header = [];
      this.phaseLabel = null;
      this.unitParts = [];
      this.detailParts = [];
      this.lastUnit = null;
      this.lastDetails = null;
      this.lastTerrain = null;
      this.lastForecast = null;
      this.side = 'left';
      this.terrainParts = [];
      this.forecastParts = [];
      this.helpParts = [];
      this.menuParts = [];
      this.resultParts = [];
      this.previewParts = [];
      this.lastPreview = null;
      this.lastExtra = null;
      this.listParts = [];
      this.list = null;
      this.listCancel = null;
      this.prepParts = [];
      this.prepRoster = null;
      this.prepMenu = null;
      this.prepView = null;
      this.prepCallbacks = null;
      this.prepFrames = null;
      this.prepRects = [];
      this.prepPaused = false;
    });
    this.ready = true;
    const queued = this.pending;
    this.pending = [];
    for (const call of queued) call();
  }

  override update(): void {
    if (!this.ready) return;
    if (this.list) {
      if (this.actions.justPressed('cancel') && this.listCancel) this.listCancel();
      else this.list?.update();
    } else if (this.menu) {
      if (this.actions.justPressed('cancel') && this.menuCancel) this.menuCancel();
      else this.menu?.update();
    } else if (this.prepView) this.updatePrepInput();
    this.resultMenu?.update();
  }

  private run(call: () => void): void {
    if (this.ready) call();
    else this.pending.push(call);
  }

  private clear(parts: Phaser.GameObjects.GameObject[]): void {
    for (const part of parts) part.destroy();
    parts.length = 0;
  }

  /* ---------- Bandeau du haut ---------- */

  setHeader(title: string, objective: string): void {
    this.run(() => {
      this.clear(this.header);
      const S = this.S;
      const { width } = this.scale;
      const band = this.add.rectangle(0, 0, width, TOP_BAR * S, PALETTE.nuit, 0.82).setOrigin(0, 0).setDepth(DEPTH.panel);
      const line = this.add.rectangle(0, TOP_BAR * S - S, width, S, PALETTE.ambre, 0.75).setOrigin(0, 0).setDepth(DEPTH.panel);
      const name = addText(this, 12 * S, 5 * S, title, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.panel + 1);
      const goal = addText(this, width / 2, 5 * S, objective, { scale: S, color: PALETTE.jauneBle, align: 'center' }).setDepth(DEPTH.panel + 1);
      this.phaseLabel = addText(this, width - 12 * S, 5 * S, '', { scale: S, align: 'right' }).setDepth(DEPTH.panel + 1);
      this.header.push(band, line, name, goal, this.phaseLabel);
    });
  }

  setPhase(team: Team, turn: number): void {
    this.run(() => {
      if (!this.phaseLabel) return;
      setText(this.phaseLabel, `Tour ${turn} · ${PHASE_LABEL[team]}`);
      this.phaseLabel.setTint(TEAM_COLOR[team]);
    });
  }

  /* ---------- Placement des fenêtres ---------- */

  /** Abscisse d'une fenêtre de largeur `w` du côté courant. */
  private winX(w: number): number {
    return this.side === 'left' ? 6 * this.S : this.scale.width - w - 6 * this.S;
  }

  /** Les fenêtres passent du côté opposé au curseur (comme sur GBA). */
  setDodge(side: DodgeSide): void {
    this.run(() => {
      if (side === this.side) return;
      this.side = side;
      this.rebuildWindows();
    });
  }

  private rebuildWindows(): void {
    this.drawUnit();
    this.drawDetails();
    this.drawForecast();
    this.drawPreview();
    this.drawTerrain();
  }

  /** Bas de la colonne de fenêtres du haut (unité, puis détails ou prévision). */
  private stackTop(): number {
    const S = this.S;
    let y = (TOP_BAR + 6) * S;
    if (this.lastPreview) return y + this.previewHeight + 8 * S;
    if (this.lastUnit && !this.lastForecast) y += 72 * S;
    if (this.lastDetails && !this.lastForecast) y += (this.detailsHeight + 6) * S;
    if (this.lastForecast) y += Math.max(this.forecastHeight, 214 * S) + 8 * S;
    return y;
  }

  /* ---------- Fenêtre d'unité ---------- */

  showUnit(unit: BattleUnit | null): void {
    this.run(() => {
      this.lastUnit = unit;
      this.drawUnit();
      this.drawDetails();
    });
  }

  /** Largeur de la fenêtre d'unité (élargie pour un nom long) ; la fiche détaillée l'imite. */
  private unitWidth = 0;

  private drawUnit(): void {
    this.clear(this.unitParts);
    const unit = this.lastUnit;
    if (!unit || this.lastForecast || this.lastPreview) return;
    const S = this.S;
    const h = 66 * S;
    const y = (TOP_BAR + 6) * S;
    const parts = this.unitParts;
    // La fenêtre s'élargit quand le nom, la classe ou le niveau ne tiennent pas dans la largeur de base.
    const kind = unit.kindName !== unit.name ? unit.kindName : unit.weapon.name;
    const nameText = addText(this, 0, y + 6 * S, unit.name, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.panel + 2);
    const levelText = addText(this, 0, y + 6 * S, `Niv ${unit.level}`, { scale: S, color: PALETTE.jauneBle, align: 'right' }).setDepth(DEPTH.panel + 2);
    const kindText = addText(this, 0, y + 21 * S, kind, { scale: S, color: unit.team === 'player' ? PALETTE.cyanEclat : unit.team === 'ally' ? ALLY_OUTLINE : PALETTE.braise }).setDepth(DEPTH.panel + 2);
    const needed = 56 * S + Math.max(nameText.width + 10 * S + levelText.width, kindText.width) + 10 * S;
    const w = Math.min(Math.max(WIN_W * S, Math.ceil(needed)), this.scale.width - 12 * S);
    this.unitWidth = w;
    const x = this.winX(w);
    parts.push(nameText, levelText, kindText);
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
    // Portrait : le sprite de carte agrandi ×2 sur un fond aux couleurs du camp.
    parts.push(this.add.rectangle(x + 8 * S, y + 8 * S, 40 * S, 50 * S, TEAM_COLOR[unit.team], 0.22).setOrigin(0, 0).setDepth(DEPTH.panel + 1));
    parts.push(
      this.add
        .image(x + 28 * S, y + 56 * S, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('idle', 0))
        .setOrigin(0.5, 1)
        .setScale(2 * S)
        .setDepth(DEPTH.panel + 2),
    );
    if (unit.isBoss) parts.push(this.add.image(x + 44 * S, y + 12 * S, BATTLE_TEX.crown).setScale(2 * S).setDepth(DEPTH.panel + 3));
    if (unit.isHero) parts.push(this.add.image(x + 44 * S, y + 12 * S, BATTLE_TEX.heroMark).setScale(2 * S).setDepth(DEPTH.panel + 3));
    const tx = x + 56 * S;
    nameText.setPosition(tx, nameText.y);
    kindText.setPosition(tx, kindText.y);
    levelText.setPosition(x + w - 10 * S - levelText.width, levelText.y);
    // Barre de PV.
    const barW = w - 66 * S - 46 * S;
    const by = y + 44 * S;
    parts.push(this.add.rectangle(tx, by, barW, 6 * S, PALETTE.encre, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 2));
    const ratio = unit.hp / unit.stats.pv;
    parts.push(this.add.rectangle(tx + S, by + S, Math.max(0, Math.round((barW - 2 * S) * ratio)), 4 * S, hpColor(ratio), 1).setOrigin(0, 0).setDepth(DEPTH.panel + 3));
    parts.push(addText(this, x + w - 10 * S, by - 6 * S, `${unit.hp}/${unit.stats.pv}`, { scale: S, color: PALETTE.parchemin, align: 'right' }).setDepth(DEPTH.panel + 2));
  }

  /* ---------- Fiche détaillée (unité choisie) ---------- */

  showDetails(unit: BattleUnit | null, extra: UnitExtra | null = null): void {
    this.run(() => {
      this.lastDetails = unit;
      this.lastExtra = extra;
      this.drawDetails();
    });
  }

  private lastExtra: UnitExtra | null = null;
  /** Hauteur de la fiche détaillée dessinée (le menu se place dessous). */
  private detailsHeight = 90;

  private drawDetails(): void {
    this.clear(this.detailParts);
    const unit = this.lastDetails;
    if (!unit || this.lastForecast || this.lastPreview) return;
    const S = this.S;
    const w = this.lastUnit ? Math.max(WIN_W * S, this.unitWidth) : WIN_W * S;
    const x = this.winX(w);
    const y = (TOP_BAR + 6 + (this.lastUnit ? 72 : 0)) * S;
    const extra = this.lastExtra;
    const extraLines = extra ? this.extraLines(unit, extra) : [];
    const h = (90 + extraLines.length * 16) * S;
    this.detailsHeight = h / S;
    const parts = this.detailParts;
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
    extraLines.forEach(([label, color], i) => {
      parts.push(addText(this, x + 10 * S, y + (82 + i * 16) * S, label, { scale: S, color, maxWidth: w - 20 * S }).setDepth(DEPTH.panel + 1));
    });
    const range = unit.weapon.range[0] === unit.weapon.range[1] ? `${unit.weapon.range[0]}` : `${unit.weapon.range[0]}-${unit.weapon.range[1]}`;
    parts.push(addText(this, x + 10 * S, y + 6 * S, `${unit.weapon.name} · portée ${range}`, { scale: S, color: PALETTE.ocreClair }).setDepth(DEPTH.panel + 1));
    const colW = (w - 20 * S) / 4;
    STAT_LABELS.forEach(([key, label], i) => {
      const sx = x + 10 * S + (i % 4) * colW;
      const sy = y + 26 * S + Math.floor(i / 4) * 16 * S;
      parts.push(addText(this, sx, sy - 3 * S, label, { scale: S, color: PALETTE.metalClair }).setDepth(DEPTH.panel + 1));
      const bogged = key === 'mob' && unit.bogged;
      parts.push(addText(this, sx + colW - 10 * S, sy - 3 * S, `${bogged ? unit.stats.mob - 1 : unit.stats[key]}`, { scale: S, color: bogged ? PALETTE.braise : PALETTE.parchemin, align: 'right' }).setDepth(DEPTH.panel + 1));
    });
    const gy = y + 62 * S;
    parts.push(addText(this, x + 10 * S, gy - 3 * S, 'Résonance', { scale: S, color: PALETTE.metalClair }).setDepth(DEPTH.panel + 1));
    const gx = x + 100 * S;
    const gw = w - 110 * S;
    parts.push(this.add.rectangle(gx, gy + 6 * S, gw, 5 * S, PALETTE.encre, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 1));
    parts.push(this.add.rectangle(gx, gy + 6 * S, Math.round((gw * unit.resonance) / 100), 5 * S, PALETTE.cyanEclat, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 2));
    if (unit.bogged) parts.push(addText(this, x + w - 10 * S, y + 6 * S, 'Enlisé', { scale: S, color: PALETTE.braise, align: 'right' }).setDepth(DEPTH.panel + 1));
  }

  /** Lignes ajoutées à la fiche : compétence, ressource, accessoire, objets, statuts. */
  private extraLines(unit: BattleUnit, extra: UnitExtra): [string, number][] {
    const lines: [string, number][] = [];
    if (extra.skill) lines.push([`${extra.skill.name} · ${extra.skill.cost}${extra.skill.blocker ? ` (${extra.skill.blocker})` : ''}`, extra.skill.blocker ? PALETTE.metalClair : PALETTE.lumiereDoree]);
    if (extra.resource) lines.push([extra.resource, PALETTE.ocreClair]);
    if (extra.accessory) lines.push([`Accessoire : ${extra.accessory}`, PALETTE.parchemin]);
    if (extra.items.length > 0) lines.push([`Objets : ${extra.items.join(', ')}`, PALETTE.parchemin]);
    if (extra.statuses.length > 0) lines.push([extra.statuses.map((st) => st.name).join(' · '), extra.statuses[0]?.color ?? PALETTE.parchemin]);
    void unit;
    return lines;
  }

  /* ---------- Terrain (bas de la colonne) ---------- */

  showTerrain(terrain: TerrainDef | null): void {
    this.run(() => {
      this.lastTerrain = terrain;
      this.drawTerrain();
    });
  }

  private drawTerrain(): void {
    this.clear(this.terrainParts);
    const terrain = this.lastTerrain;
    if (!terrain) return;
    const S = this.S;
    const w = 150 * S;
    const h = 62 * S;
    const x = this.winX(w);
    const y = this.scale.height - (BOTTOM_BAR + 6) * S - h;
    const parts = this.terrainParts;
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }).setAlpha(0.95));
    parts.push(addText(this, x + w / 2, y + 6 * S, terrain.name, { scale: S, color: PALETTE.jauneBle, align: 'center' }).setDepth(DEPTH.panel + 1));
    const cells: [string, string][] = [
      ['Déf', signed(terrain.defense)],
      ['Esq', signed(terrain.avoid)],
      ['Dépl', terrain.moveCost === null ? '—' : `${terrain.moveCost}`],
    ];
    const colW = (w - 16 * S) / 3;
    cells.forEach(([label, value], i) => {
      const cx = x + 8 * S + colW * (i + 0.5);
      parts.push(addText(this, cx, y + 24 * S, label, { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH.panel + 1));
      parts.push(addText(this, cx, y + 40 * S, value, { scale: S, color: PALETTE.parchemin, align: 'center' }).setDepth(DEPTH.panel + 1));
    });
    if (terrain.heal > 0) parts.push(addText(this, x + w / 2, y - 18 * S, `Soigne ${Math.round(terrain.heal * 100)} % des PV`, { scale: S, color: 0x7fcf6a, align: 'center' }).setDepth(DEPTH.panel + 1));
  }

  /* ---------- Prévision de l'échange ---------- */

  showForecast(forecast: Forecast | null, attacker: BattleUnit | null, defender: BattleUnit | null): void {
    this.run(() => {
      this.lastForecast = forecast && attacker && defender ? [forecast, attacker, defender] : null;
      this.drawUnit();
      this.drawDetails();
      this.drawForecast();
    });
  }

  private drawForecast(): void {
    this.clear(this.forecastParts);
    if (!this.lastForecast) return;
    const [forecast, attacker, defender] = this.lastForecast;
    const S = this.S;
    const w = WIN_W * S;
    const x = this.winX(w);
    const y = (TOP_BAR + 6) * S;
    const parts = this.forecastParts;
    const colA = x + 44 * S;
    const colB = x + w - 44 * S;
    const mid = x + w / 2;
    const text = (tx: number, ty: number, value: string, color: number, align: 'left' | 'center' | 'right' = 'center'): void => {
      parts.push(addText(this, tx, ty, value, { scale: S, color, align }).setDepth(DEPTH.panel + 2));
    };
    // En-tête : chaque combattant, son sprite sur la couleur de son camp, son nom.
    const head = (unit: BattleUnit, cx: number): void => {
      // Portrait : le sprite ×2 (son cadre a 7 rangées vides au-dessus de la tête).
      parts.push(this.add.rectangle(cx, y + 40 * S, 52 * S, 58 * S, TEAM_COLOR[unit.team], 0.22).setDepth(DEPTH.panel + 1));
      parts.push(this.add.image(cx, y + 70 * S, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1).setScale(2 * S).setDepth(DEPTH.panel + 2));
      text(cx, y + 72 * S, unit.name, TEAM_COLOR[unit.team]);
    };
    head(attacker, colA);
    head(defender, colB);
    text(mid, y + 34 * S, 'contre', PALETTE.metalClair);

    const a = forecast.attacker;
    const d = forecast.defender;
    const dmg = (side: SideForecast): string => (!side.canStrike ? '—' : side.doubles ? `${side.odds.damage} ×2` : `${side.odds.damage}`);
    const pct = (side: SideForecast, v: number): string => (side.canStrike ? `${v} %` : '—');
    const afterA = Math.max(0, a.hp - (d.canStrike ? d.odds.damage * (d.doubles ? 2 : 1) : 0));
    const afterD = Math.max(0, d.hp - a.odds.damage * (a.doubles ? 2 : 1));
    const rows: [string, string, string][] = [
      ['PV', `${a.hp}`, `${d.hp}`],
      ['Dégâts', dmg(a), dmg(d)],
      ['Précision', pct(a, a.odds.hit), pct(d, d.odds.hit)],
      ['Critique', pct(a, a.odds.crit), pct(d, d.odds.crit)],
    ];
    let ty = y + 96 * S;
    const line = 17 * S;
    for (const [label, va, vb] of rows) {
      text(mid, ty, label, PALETTE.metalClair);
      text(colA, ty, va, PALETTE.parchemin);
      text(colB, ty, vb, PALETTE.parchemin);
      ty += line;
    }
    // PV après l'échange (si tous les coups touchent), en rouge quand l'unité tombe.
    parts.push(this.add.rectangle(x + 10 * S, ty + 1 * S, w - 20 * S, S, PALETTE.metal, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 1));
    ty += 4 * S;
    text(mid, ty, 'Après', PALETTE.metalClair);
    text(colA, ty, `${afterA}`, afterA === 0 ? PALETTE.braise : 0x7fcf6a);
    text(colB, ty, `${afterD}`, afterD === 0 ? PALETTE.braise : 0x7fcf6a);
    ty += line + 2 * S;

    const notes: [string, number][] = [];
    if (a.odds.triangle === 1) notes.push(['Élément favorable', 0x7fcf6a]);
    if (a.odds.triangle === -1) notes.push(['Élément défavorable', PALETTE.braise]);
    if (a.odds.effective) notes.push(['Arme efficace !', PALETTE.jauneBle]);
    if (!d.canStrike) notes.push(['Pas de riposte', PALETTE.cyanEclat]);
    for (const [note, color] of notes.slice(0, 2)) {
      text(mid, ty, note, color);
      ty += line;
    }
    const h = ty - y + 6 * S;
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
    this.forecastHeight = h;
  }

  /** Hauteur de la prévision affichée (le menu se place dessous). */
  private forecastHeight = 0;

  /* ---------- Aperçu d'une compétence, d'un objet, d'un soin ---------- */

  private lastPreview: SkillPreviewView | null = null;
  private previewParts: Phaser.GameObjects.GameObject[] = [];

  showSkillPreview(view: SkillPreviewView | null): void {
    this.run(() => {
      this.lastPreview = view;
      this.drawUnit();
      this.drawDetails();
      this.drawPreview();
    });
  }

  private drawPreview(): void {
    this.clear(this.previewParts);
    const view = this.lastPreview;
    if (!view) return;
    const S = this.S;
    const w = 272 * S;
    const x = this.winX(w);
    const y = (TOP_BAR + 6) * S;
    const parts = this.previewParts;
    const text = (tx: number, ty: number, value: string, color: number, align: 'left' | 'center' | 'right' = 'left', maxWidth?: number): void => {
      parts.push(addText(this, tx, ty, value, { scale: S, color, align, ...(maxWidth ? { maxWidth } : {}) }).setDepth(DEPTH.panel + 2));
    };
    text(x + w / 2, y + 7 * S, view.title, PALETTE.lumiereDoree, 'center');
    text(x + w / 2, y + 23 * S, view.subtitle, PALETTE.cyanEclat, 'center');
    const desc = addText(this, x + 10 * S, y + 42 * S, view.description, { scale: S, color: PALETTE.metalClair, maxWidth: w - 20 * S }).setDepth(DEPTH.panel + 2);
    parts.push(desc);
    let ty = y + 46 * S + desc.height;
    parts.push(this.add.rectangle(x + 10 * S, ty, w - 20 * S, S, PALETTE.metal, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 1));
    ty += 5 * S;
    for (const line of view.lines.slice(0, 7)) {
      const right = addText(this, x + w - 12 * S, ty, line.text, { scale: S, color: line.color, align: 'right' }).setDepth(DEPTH.panel + 2);
      parts.push(right);
      // Le nom cède la place aux chiffres : il est raccourci s'il déborde.
      const room = w - 24 * S - right.width - 8 * S;
      const name = addText(this, x + 12 * S, ty, line.name, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.panel + 2);
      let label = line.name;
      while (name.width > room && label.length > 3) {
        label = label.slice(0, -1);
        setText(name, `${label.trimEnd()}…`);
      }
      parts.push(name);
      ty += 17 * S;
    }
    if (view.lines.length === 0) {
      text(x + w / 2, ty, 'Personne n’est touché', PALETTE.metalClair, 'center');
      ty += 17 * S;
    }
    const h = ty - y + 6 * S;
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
    this.previewHeight = h;
  }

  private previewHeight = 0;

  /* ---------- Aide (barre du bas) ---------- */

  showHelp(lines: readonly (readonly [string, string])[]): void {
    this.run(() => {
      this.clear(this.helpParts);
      const S = this.S;
      const { width, height } = this.scale;
      const y = height - BOTTOM_BAR * S;
      this.helpParts.push(this.add.rectangle(0, y, width, BOTTOM_BAR * S, PALETTE.nuit, 0.85).setOrigin(0, 0).setDepth(DEPTH.panel));
      this.helpParts.push(this.add.rectangle(0, y, width, S, PALETTE.ambre, 0.6).setOrigin(0, 0).setDepth(DEPTH.panel));
      // Touches en or, actions en gris, centrées.
      const pieces: PixelText[] = [];
      for (const [key, action] of lines) {
        pieces.push(addText(this, 0, y + 2 * S, key, { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH.panel + 1));
        pieces.push(addText(this, 0, y + 2 * S, action, { scale: S, color: PALETTE.metalClair }).setDepth(DEPTH.panel + 1));
      }
      const gap = 6 * S;
      const pairGap = 22 * S;
      let total = 0;
      pieces.forEach((p, i) => (total += Math.ceil(p.width) + (i % 2 === 0 ? gap : pairGap)));
      let cx = Math.round((width - total + pairGap) / 2);
      pieces.forEach((p, i) => {
        p.x = cx;
        cx += Math.ceil(p.width) + (i % 2 === 0 ? gap : pairGap);
      });
      this.helpParts.push(...pieces);
    });
  }

  /* ---------- Menus ---------- */

  get menuOpen(): boolean {
    return this.menu !== null;
  }

  /** Rectangle du menu ouvert (pixels de l'écran), pour ne pas prendre un clic dessus pour un clic sur la carte. */
  private menuRect: { x: number; y: number; w: number; h: number } | null = null;

  isOverMenu(x: number, y: number): boolean {
    const r = this.menuRect;
    return (r !== null && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || this.isOverPrep(x, y) || this.sheetOpen;
  }

  openMenu(request: MenuRequest): void {
    this.run(() => {
      this.closeMenuNow();
      const S = this.S;
      const big = request.large === true;
      const lineHeight = (big ? 38 : 26) * S;
      const titleH = request.title ? (big ? 34 : 22) * S : 0;
      const w = (big ? 228 : 172) * S;
      const h = request.items.length * lineHeight + titleH + (big ? 18 : 14) * S;
      const centered = request.centered === true;
      const x = centered ? Math.round((this.scale.width - w) / 2) : this.winX(w);
      // Le menu d'action laisse la place de la prévision, qui s'affiche au survol d'un ennemi.
      const y = centered ? Math.round((this.scale.height - h) / 2) : big ? Math.max(this.stackTop(), (TOP_BAR + 6 + FORECAST_MAX_H + 8) * S) : this.stackTop();
      this.menuParts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.menu }));
      this.menuRect = { x, y, w, h };
      if (request.title) this.menuParts.push(addText(this, x + w / 2, y + (big ? 7 : 7) * S, request.title, { scale: (big ? 1.5 : 1) * S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.menu + 1));
      this.menu = new VerticalMenu(this, x + 6 * S, y + (big ? 9 : 7) * S + titleH, request.items, this.actions, {
        width: w - 12 * S,
        lineHeight,
        depth: DEPTH.menu + 1,
        scale: (big ? 3 : 2) * S,
        textScale: (big ? 1.5 : 1) * S,
        // Grand texte : ombre d'un seul pixel, sinon les lettres paraissent doublées.
        shadowOffset: S,
        centerLabels: big,
      });
      if (request.initialIndex !== undefined) this.menu.selectIndex(request.initialIndex);
      this.menuCancel = request.onCancel;
      // L'appui qui a ouvert le menu ne doit pas aussi le valider.
      this.actions.consume('confirm');
      this.actions.consume('cancel');
    });
  }

  closeMenu(): void {
    this.run(() => this.closeMenuNow());
  }

  private closeMenuNow(): void {
    this.menu?.destroy();
    this.menu = null;
    this.menuCancel = null;
    this.menuRect = null;
    this.clear(this.menuParts);
  }

  /* ---------- Bandeau de phase ---------- */

  phaseBanner(team: Team, turn: number, durationMs: number): Promise<void> {
    return this.banner(PHASE_TITLE[team], `Tour ${turn}`, TEAM_COLOR[team], durationMs);
  }

  /** Bandeau qui traverse l'écran (phase, renforts, compétence d'un boss). Titres en police lisible (n°81). */
  banner(titleText: string, subtitle: string, color: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.run(() => {
        if (durationMs <= 0) {
          resolve();
          return;
        }
        const S = this.S;
        const { width, height } = this.scale;
        const container = this.add.container(0, 0).setDepth(DEPTH.banner);
        const bandH = 64 * S;
        const top = Math.round(height / 2 - bandH / 2);
        container.add(this.add.rectangle(0, top, width, bandH, PALETTE.nuit, 0.8).setOrigin(0, 0));
        container.add(this.add.rectangle(0, top, width, 2 * S, color, 0.9).setOrigin(0, 0));
        container.add(this.add.rectangle(0, top + bandH - 2 * S, width, 2 * S, color, 0.9).setOrigin(0, 0));
        const title = addText(this, width / 2, top + 10 * S, titleText, { font: 'body', scale: 2 * S, color, align: 'center', shadowOffset: 2 * S });
        const sub = addText(this, width / 2, top + 42 * S, subtitle, { scale: S, color: PALETTE.parchemin, align: 'center' });
        container.add([title, sub]);
        container.x = width;
        this.tweens.chain({
          targets: container,
          tweens: [
            { x: 0, duration: durationMs * 0.25, ease: 'Cubic.easeOut' },
            { x: 0, duration: durationMs * 0.5 },
            { x: -width, duration: durationMs * 0.25, ease: 'Cubic.easeIn' },
          ],
          onComplete: () => {
            container.destroy(true);
            resolve();
          },
        });
      });
    });
  }

  /* ---------- Échange en cours : barres de PV (style GBA) ---------- */

  showExchange(view: ExchangeView): void {
    this.run(() => {
      this.exchange?.destroy(true);
      this.exchangeBars.clear();
      const S = this.S;
      const { width, height } = this.scale;
      const w = 400 * S;
      const h = 66 * S;
      const x = Math.round((width - w) / 2);
      const y = height - h - (BOTTOM_BAR + 6) * S;
      const container = this.add.container(0, 0).setDepth(DEPTH.exchange);
      container.add(drawPanel(this, x, y, w, h, { scale: 2 * S }));
      const half = w / 2;
      const block = (unit: BattleUnit, side: SideForecast, bx: number): void => {
        const color = TEAM_COLOR[unit.team];
        container.add(this.add.rectangle(bx + 8 * S, y + 7 * S, half - 16 * S, 2 * S, color, 0.85).setOrigin(0, 0));
        container.add(addText(this, bx + 10 * S, y + 9 * S, unit.name, { scale: S, color: PALETTE.parchemin }));
        const stats = side.canStrike ? `Dég ${side.odds.damage}${side.doubles ? ' ×2' : ''}   Préc ${side.odds.hit}   Crit ${side.odds.crit}` : 'Pas de riposte';
        container.add(addText(this, bx + 10 * S, y + 25 * S, stats, { scale: S, color: PALETTE.metalClair }));
        const barW = half - 56 * S;
        const by = y + 46 * S;
        container.add(this.add.rectangle(bx + 10 * S, by, barW, 8 * S, PALETTE.encre, 1).setOrigin(0, 0));
        const ratio = unit.hp / unit.stats.pv;
        const fill = this.add.rectangle(bx + 11 * S, by + S, Math.max(0, Math.round((barW - 2 * S) * ratio)), 6 * S, hpColor(ratio), 1).setOrigin(0, 0);
        container.add(fill);
        const label = addText(this, bx + half - 12 * S, by - 5 * S, `${unit.hp}`, { scale: S, color: PALETTE.parchemin, align: 'right' });
        container.add(label);
        this.exchangeBars.set(unit.id, { fill, label, width: barW - 2 * S, max: unit.stats.pv });
      };
      block(view.left, view.leftSide, x);
      block(view.right, view.rightSide, x + half);
      container.add(this.add.rectangle(x + half, y + 8 * S, S * 2, h - 16 * S, PALETTE.metal, 1).setOrigin(0.5, 0));
      container.setAlpha(0);
      this.tweens.add({ targets: container, alpha: 1, duration: 120 });
      this.exchange = container;
    });
  }

  setExchangeHp(unitId: string, hp: number, durationMs: number): void {
    this.run(() => {
      const bar = this.exchangeBars.get(unitId);
      if (!bar) return;
      const ratio = hp / bar.max;
      const target = Math.max(0, Math.round(bar.width * ratio));
      setText(bar.label, `${hp}`);
      bar.fill.setFillStyle(hpColor(ratio), 1);
      if (durationMs <= 0) bar.fill.width = target;
      else this.tweens.add({ targets: bar.fill, width: target, duration: durationMs, ease: 'Quad.easeOut' });
    });
  }

  hideExchange(): void {
    this.run(() => {
      const container = this.exchange;
      this.exchange = null;
      this.exchangeBars.clear();
      if (container) this.tweens.add({ targets: container, alpha: 0, duration: 150, onComplete: () => container.destroy(true) });
    });
  }

  toast(message: string): void {
    this.run(() => this.toasts.push(message));
  }

  /* ---------- Compétence : bandeau court au-dessus de la carte ---------- */

  /** Nom de la compétence dans un cartouche, avec le portrait du lanceur (GDD §11.4 : cut-in). */
  skillCutIn(unit: BattleUnit, name: string, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.run(() => {
        if (durationMs <= 0) {
          resolve();
          return;
        }
        const S = this.S;
        const { width } = this.scale;
        const color = TEAM_COLOR[unit.team];
        const w = 300 * S;
        const h = 48 * S;
        const x = Math.round((width - w) / 2);
        const y = (TOP_BAR + 10) * S;
        const c = this.add.container(0, 0).setDepth(DEPTH.banner);
        c.add(drawPanel(this, x, y, w, h, { scale: 2 * S }));
        c.add(this.add.rectangle(x + 8 * S, y + 8 * S, 34 * S, 32 * S, color, 0.25).setOrigin(0, 0));
        c.add(this.add.image(x + 25 * S, y + 46 * S, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('ready', 2)).setOrigin(0.5, 1).setScale(S).setCrop(0, 0, 40, 30));
        c.add(addText(this, x + 52 * S, y + 7 * S, name, { font: 'body', scale: S, color: PALETTE.lumiereDoree }));
        c.add(addText(this, x + 52 * S, y + 25 * S, unit.name, { scale: S, color }));
        c.setAlpha(0);
        c.x = -40 * S;
        this.tweens.chain({
          targets: c,
          tweens: [
            { alpha: 1, x: 0, duration: durationMs * 0.2, ease: 'Cubic.easeOut' },
            { alpha: 1, duration: durationMs * 0.6 },
            { alpha: 0, x: 40 * S, duration: durationMs * 0.2, ease: 'Cubic.easeIn' },
          ],
          onComplete: () => {
            c.destroy(true);
            resolve();
          },
        });
      });
    });
  }

  /* ---------- Réplique d'un boss (changement de phase) ---------- */

  bossLine(unit: BattleUnit, line: string, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.run(() => {
        const S = this.S;
        const { width, height } = this.scale;
        const w = Math.min(width - 40 * S, 620 * S);
        const h = 92 * S;
        const x = Math.round((width - w) / 2);
        const y = Math.round(height * 0.62);
        const c = this.add.container(0, 0).setDepth(DEPTH.line);
        c.add(this.add.rectangle(0, 0, width, height, 0x2a0d12, 0.35).setOrigin(0, 0));
        c.add(drawPanel(this, x, y, w, h, { scale: 2 * S, fillAlpha: 0.96 }));
        c.add(this.add.rectangle(x + 10 * S, y + 10 * S, 64 * S, 72 * S, TEAM_COLOR.enemy, 0.3).setOrigin(0, 0));
        c.add(this.add.image(x + 42 * S, y + 84 * S, BATTLE_TEX.ms(unit.sprite, unit.team), BATTLE_TEX.msFrame('ready', 2)).setOrigin(0.5, 1).setScale(2 * S));
        c.add(addText(this, x + 86 * S, y + 10 * S, `${unit.name} — phase 2`, { font: 'body', scale: S, color: PALETTE.braise }));
        c.add(addText(this, x + 86 * S, y + 32 * S, `« ${line} »`, { scale: S, color: PALETTE.parchemin, maxWidth: w - 100 * S }));
        c.setAlpha(0);
        this.tweens.add({ targets: c, alpha: 1, duration: 160 });
        const close = (): void => {
          this.tweens.add({ targets: c, alpha: 0, duration: 180, onComplete: () => c.destroy(true) });
          resolve();
        };
        this.time.delayedCall(Math.max(900, durationMs), close);
      });
    });
  }

  /* ---------- Liste à choisir (objets) ---------- */

  private listParts: Phaser.GameObjects.GameObject[] = [];
  private list: ScrollList | null = null;
  private listCancel: (() => void) | null = null;

  /** Liste modale au centre (objets à donner ou reprendre, objets à utiliser). */
  openList(title: string, rows: readonly ListRow[], onActivate: (index: number) => void, onCancel: () => void, footer: string | null = null): void {
    this.run(() => {
      this.closeListNow();
      const S = this.S;
      const rowH = 24 * S;
      const visible = Math.min(10, Math.max(3, rows.length));
      const w = 360 * S;
      const h = (40 + visible * 24 + (footer ? 22 : 8)) * S;
      const x = Math.round((this.scale.width - w) / 2);
      const y = Math.round((this.scale.height - h) / 2);
      this.listParts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.menu }));
      this.listParts.push(addText(this, x + w / 2, y + 8 * S, title, { scale: S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.menu + 1));
      this.listFooter = footer ? addText(this, x + w / 2, y + h - 22 * S, footer, { scale: S, color: PALETTE.metalClair, align: 'center' }).setDepth(DEPTH.menu + 1) : null;
      if (this.listFooter) this.listParts.push(this.listFooter);
      this.menuRect = { x, y, w, h };
      this.list = new ScrollList(this, x + 8 * S, y + 32 * S, this.actions, { width: w - 16 * S, rowHeight: rowH, visibleRows: visible, depth: DEPTH.menu + 1, scale: S, onActivate });
      this.list.setRows(rows, false);
      this.listCancel = onCancel;
      this.actions.consume('confirm');
      this.actions.consume('cancel');
    });
  }

  private listFooter: PixelText | null = null;

  /** Met à jour les lignes (et le pied) de la liste ouverte ; le curseur reste. */
  updateList(rows: readonly ListRow[], footer: string | null = null): void {
    this.run(() => {
      this.list?.setRows(rows, true);
      if (footer !== null && this.listFooter) setText(this.listFooter, footer);
    });
  }

  closeList(): void {
    this.run(() => this.closeListNow());
  }

  private closeListNow(): void {
    this.list?.destroy();
    this.list = null;
    this.listCancel = null;
    this.listFooter = null;
    this.clear(this.listParts);
    if (!this.menu) this.menuRect = null;
  }

  get listOpen(): boolean {
    return this.list !== null;
  }

  /* ---------- Écran de préparation (GDD §9.3, §13.4) ---------- */

  private prepParts: Phaser.GameObjects.GameObject[] = [];
  private prepRoster: ScrollList | null = null;
  private prepMenu: VerticalMenu | null = null;
  private prepFocus: 'roster' | 'menu' = 'roster';
  private prepCallbacks: PrepCallbacks | null = null;
  private prepView: PrepView | null = null;
  private prepFrames: { roster: Phaser.GameObjects.Rectangle; menu: Phaser.GameObjects.Rectangle } | null = null;
  /** Rectangles des panneaux de préparation (un clic dessus n'est pas un clic sur la carte). */
  private prepRects: { x: number; y: number; w: number; h: number }[] = [];

  get prepOpen(): boolean {
    return this.prepView !== null;
  }

  openPrep(view: PrepView, callbacks: PrepCallbacks): void {
    this.run(() => {
      this.prepCallbacks = callbacks;
      this.prepFocus = 'roster';
      this.drawPrep(view, true);
    });
  }

  updatePrep(view: PrepView): void {
    this.run(() => this.drawPrep(view, false));
  }

  closePrep(): void {
    this.run(() => {
      this.sheet?.close();
      this.prepRoster?.destroy();
      this.prepRoster = null;
      this.prepMenu?.destroy();
      this.prepMenu = null;
      this.clear(this.prepParts);
      this.prepView = null;
      this.prepCallbacks = null;
      this.prepFrames = null;
      this.prepRects = [];
    });
  }

  /* ---------- Fiche d'un membre (clic droit) ---------- */

  private sheet: PrepSheet | null = null;
  private sheetCallbacks: SheetCallbacks | null = null;

  get sheetOpen(): boolean {
    return this.sheet?.isOpen === true;
  }

  openSheet(view: SheetView, callbacks: SheetCallbacks): void {
    this.run(() => {
      this.sheet ??= new PrepSheet(this, this.S);
      this.sheetCallbacks = callbacks;
      this.sheet.draw(view, callbacks);
    });
  }

  updateSheet(view: SheetView): void {
    this.run(() => {
      if (this.sheet?.isOpen && this.sheetCallbacks) this.sheet.draw(view, this.sheetCallbacks);
    });
  }

  closeSheet(): void {
    this.run(() => {
      this.sheet?.close();
      this.sheetCallbacks = null;
    });
  }

  /** La touche Entrée / les flèches vont à la carte (placement au clavier) : le panneau ne réagit plus. */
  setPrepPaused(paused: boolean): void {
    this.run(() => {
      this.prepPaused = paused;
      this.prepRoster?.setLocked(paused);
      this.prepMenu?.setLocked(paused);
    });
  }

  private prepPaused = false;

  private drawPrep(view: PrepView, fresh: boolean): void {
    const S = this.S;
    const { width, height } = this.scale;
    const cb = this.prepCallbacks;
    if (!cb) return;
    const cursor = view.cursor;
    const menuIndex = fresh ? 0 : (this.prepMenu?.selected ?? 0);
    this.prepRoster?.destroy();
    this.prepRoster = null;
    this.prepMenu?.destroy();
    this.prepMenu = null;
    this.clear(this.prepParts);
    this.prepView = view;
    this.prepRects = [];
    const parts = this.prepParts;
    const top = (TOP_BAR + 6) * S;
    const colW = 236 * S;

    // Colonne de gauche : la compagnie.
    const lx = 6 * S;
    const rowH = 22 * S;
    const rosterRows = Math.min(view.roster.length, 12);
    const rosterH = (34 + rosterRows * 22 + 6) * S;
    parts.push(drawPanel(this, lx, top, colW, rosterH, { scale: 2 * S, depth: DEPTH.prep }));
    this.prepRects.push({ x: lx, y: top, w: colW, h: rosterH });
    parts.push(addText(this, lx + 10 * S, top + 7 * S, '1 · Compagnie', { scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH.prep + 1));
    parts.push(addText(this, lx + colW - 10 * S, top + 7 * S, `${view.deployed}/${view.maxDeploy} déployés`, { scale: S, color: view.deployed >= view.maxDeploy ? PALETTE.lumiereDoree : PALETTE.parchemin, align: 'right' }).setDepth(DEPTH.prep + 1));
    const rosterFrame = this.add.rectangle(lx + 3 * S, top + 29 * S, colW - 6 * S, rosterRows * 22 * S + 6 * S, 0, 0).setOrigin(0, 0).setStrokeStyle(S, PALETTE.ambre, 0.8).setDepth(DEPTH.prep + 1);
    parts.push(rosterFrame);
    this.prepRoster = new ScrollList(this, lx + 6 * S, top + 32 * S, this.actions, {
      width: colW - 12 * S,
      rowHeight: rowH,
      visibleRows: rosterRows,
      depth: DEPTH.prep + 1,
      scale: S,
      onCursor: (i) => {
        if (this.prepView && this.prepView.cursor !== i) cb.onCursor(i);
      },
      hoverSelects: false,
      onContext: (i) => cb.onSheet(i),
      onActivate: (i) => cb.onToggle(i),
    });
    this.prepRoster.reset(view.roster, cursor);

    // Sous la compagnie : la fiche du membre choisi.
    const unit = view.unit;
    if (unit) {
      const fy = top + rosterH + 6 * S;
      const extra = view.extra;
      const lines: [string, number][] = [];
      const range = unit.weapon.range[0] === unit.weapon.range[1] ? `${unit.weapon.range[0]}` : `${unit.weapon.range[0]}-${unit.weapon.range[1]}`;
      lines.push([`${unit.weapon.name} · portée ${range}`, PALETTE.ocreClair]);
      lines.push([`Accessoire : ${extra?.accessory ?? '—'}`, PALETTE.parchemin]);
      lines.push([`Objets : ${extra && extra.items.length > 0 ? `${extra.items.length} (clic droit : sac)` : '—'}`, PALETTE.parchemin]);
      if (extra?.skill) lines.push([`${extra.skill.name} · ${extra.skill.cost}`, PALETTE.lumiereDoree]);
      const fh = Math.min(height - (BOTTOM_BAR + 6) * S - fy, (58 + lines.length * 16) * S);
      parts.push(drawPanel(this, lx, fy, colW, fh, { scale: 2 * S, depth: DEPTH.prep }));
      this.prepRects.push({ x: lx, y: fy, w: colW, h: fh });
      parts.push(this.add.rectangle(lx + 8 * S, fy + 8 * S, 30 * S, 36 * S, TEAM_COLOR.player, 0.22).setOrigin(0, 0).setDepth(DEPTH.prep + 1));
      parts.push(this.add.image(lx + 23 * S, fy + 44 * S, BATTLE_TEX.ms(unit.sprite, 'player'), BATTLE_TEX.msFrame('idle', 0)).setOrigin(0.5, 1).setScale(S).setDepth(DEPTH.prep + 2));
      const textW = colW - 46 * S - 10 * S;
      parts.push(fitText(addText(this, lx + 46 * S, fy + 7 * S, `${unit.name}  Niv ${unit.level}`, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.prep + 2), textW));
      parts.push(fitText(addText(this, lx + 46 * S, fy + 21 * S, unit.kindName, { scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH.prep + 2), textW));
      parts.push(addText(this, lx + 46 * S, fy + 35 * S, `PV ${unit.stats.pv}`, { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH.prep + 2));
      lines.forEach(([t, c], i) => parts.push(fitText(addText(this, lx + 10 * S, fy + (54 + i * 16) * S, t, { scale: S, color: c }).setDepth(DEPTH.prep + 2), colW - 20 * S)));
    }

    // Colonne de droite : objectif, ennemis, renforts, puis les boutons.
    const rx = width - colW - 6 * S;
    const info: [string, number][] = [[view.objective, PALETTE.jauneBle], ...view.enemies.map((e) => [e.text, e.color] as [string, number]), ...view.warnings.map((w) => [w.text, w.color] as [string, number])];
    if (view.locked) info.push(['Embuscade : positions imposées', PALETTE.braise]);
    // Chaque ligne prend la hauteur de son texte (une ligne trop longue passe à la suivante sans chevaucher).
    const infoTexts: Phaser.GameObjects.GameObject[] = [];
    let iy = top + 30 * S;
    for (const [t, c] of info) {
      const txt = addText(this, rx + 10 * S, iy, t, { scale: S, color: c, maxWidth: colW - 20 * S }).setDepth(DEPTH.prep + 1);
      infoTexts.push(txt);
      iy += Math.max(17 * S, Math.ceil((txt as unknown as { height: number }).height) + 4 * S);
    }
    const infoH = iy - top + 4 * S;
    parts.push(drawPanel(this, rx, top, colW, infoH, { scale: 2 * S, depth: DEPTH.prep }));
    this.prepRects.push({ x: rx, y: top, w: colW, h: infoH });
    parts.push(addText(this, rx + 10 * S, top + 7 * S, 'Ennemis en vue', { scale: S, color: PALETTE.braise }).setDepth(DEPTH.prep + 1));
    parts.push(...infoTexts);

    // Dans l'ordre où l'on prépare : formation, équipement, objets, puis « Combattre » (la validation) en bas.
    const items: MenuItem[] = [
      { label: 'Formation Auto', enabled: !view.locked, onSelect: () => cb.onAuto() },
      { label: 'Placer les unités', enabled: !view.locked, onSelect: () => cb.onPlace() },
      { label: 'Combattre !', onSelect: () => cb.onFight() },
      ...(cb.onBack && view.canRetreat ? [{ label: 'Retour', onSelect: () => cb.onBack?.() }] : []),
    ];
    const lineH = 26 * S;
    const my = top + infoH + 6 * S;
    const mh = items.length * lineH + 30 * S;
    parts.push(drawPanel(this, rx, my, colW, mh, { scale: 2 * S, depth: DEPTH.prep }));
    this.prepRects.push({ x: rx, y: my, w: colW, h: mh });
    const menuFrame = this.add.rectangle(rx + 3 * S, my + 19 * S, colW - 6 * S, mh - 22 * S, 0, 0).setOrigin(0, 0).setStrokeStyle(S, PALETTE.ambre, 0.8).setDepth(DEPTH.prep + 1);
    parts.push(menuFrame);
    parts.push(addText(this, rx + 10 * S, my + 7 * S, '2 · Préparer, puis combattre', { scale: S, color: PALETTE.cyanEclat }).setDepth(DEPTH.prep + 1));
    this.prepMenu = new VerticalMenu(this, rx + 6 * S, my + 23 * S, items, this.actions, { width: colW - 12 * S, lineHeight: lineH, depth: DEPTH.prep + 1, scale: 2 * S, textScale: S });
    this.prepMenu.selectIndex(menuIndex);
    this.prepFrames = { roster: rosterFrame, menu: menuFrame };
    if (view.message) parts.push(addText(this, width / 2, height - (BOTTOM_BAR + 22) * S, view.message, { scale: S, color: PALETTE.braise, align: 'center' }).setDepth(DEPTH.prep + 2));
    this.refreshPrepFocus();
    this.prepRoster.setLocked(this.prepPaused);
    this.prepMenu.setLocked(this.prepPaused);
  }

  private refreshPrepFocus(): void {
    if (!this.prepFrames) return;
    this.prepFrames.roster.setVisible(this.prepFocus === 'roster');
    this.prepFrames.menu.setVisible(this.prepFocus === 'menu');
  }

  /** Un clic sur un panneau de préparation n'est pas un clic sur la carte. */
  isOverPrep(x: number, y: number): boolean {
    return this.prepRects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  }

  private updatePrepInput(): void {
    if (this.sheet?.isOpen) {
      if (this.actions.justPressed('cancel')) this.sheetCallbacks?.onClose();
      return;
    }
    if (this.prepPaused || !this.prepView) return;
    if (this.actions.justPressed('left') && this.prepFocus === 'menu') {
      this.prepFocus = 'roster';
      this.refreshPrepFocus();
      return;
    }
    if (this.actions.justPressed('right') && this.prepFocus === 'roster') {
      this.prepFocus = 'menu';
      this.refreshPrepFocus();
      return;
    }
    if (this.prepFocus === 'roster') this.prepRoster?.update();
    else this.prepMenu?.update();
  }

  /* ---------- Fin du combat (GDD §13.7) ---------- */

  /** `opensWorld` : la victoire lève des drapeaux dans une partie en cours (un passage s'ouvre). */
  showResult(summary: BattleSummary, opensWorld: boolean, onContinue: () => void, rewards: readonly string[] = [], note: string | null = null): void {
    this.run(() => {
      this.closeMenuNow();
      this.clear(this.resultParts);
      const S = this.S;
      const { width, height } = this.scale;
      const victory = summary.outcome === 'victory';
      const w = 420 * S;
      const h = 250 * S;
      const x = Math.round((width - w) / 2);
      const y = Math.round((height - h) / 2);
      const parts = this.resultParts;
      parts.push(this.add.rectangle(0, 0, width, height, PALETTE.nuit, 0.6).setOrigin(0, 0).setDepth(DEPTH.result).setInteractive());
      parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.result + 1 }));
      const title = addText(this, width / 2, y + 16 * S, victory ? 'VICTOIRE' : 'DÉFAITE', {
        font: 'body',
        scale: 2 * S,
        color: victory ? PALETTE.lumiereDoree : PALETTE.braise,
        align: 'center',
        shadowOffset: 2 * S,
      }).setDepth(DEPTH.result + 2);
      parts.push(title);
      const lines: [string, number][] = [
        [`Tours : ${summary.turns}`, PALETTE.parchemin],
        [`Ennemis vaincus : ${summary.enemiesDefeated} / ${summary.enemiesTotal}`, PALETTE.parchemin],
      ];
      if (victory) {
        lines.push(summary.fallen.length > 0 ? [`Blessés (1 PV, jusqu'au prochain repos) : ${summary.fallen.join(', ')}`, PALETTE.braise] : ['Aucun blessé', 0x7fcf6a]);
        if (summary.alliesFallen.length > 0) lines.push([`Alliés tombés : ${summary.alliesFallen.join(', ')}`, ALLY_OUTLINE]);
        if (opensWorld && summary.flags.length > 0) lines.push(['Un passage s’ouvre dans le monde…', PALETTE.cyanEclat]);
        if (rewards.length > 0) lines.push([`Butin : ${rewards.join(' · ')}`, PALETTE.lumiereDoree]);
      } else {
        lines.push(['La compagnie se replie.', PALETTE.metalClair]);
        if (rewards.length > 0) lines.push([rewards.join(' · '), PALETTE.braise]);
        if (note) lines.push([note, PALETTE.metalClair]);
      }
      if (summary.itemsUsed.length > 0) lines.push([`Objets utilisés : ${summary.itemsUsed.reduce((n, u) => n + u.qty, 0)}`, PALETTE.metalClair]);
      lines.forEach(([text, color], i) => {
        parts.push(addText(this, width / 2, y + 74 * S + i * 22 * S, text, { scale: S, color, align: 'center', maxWidth: w - 40 * S }).setDepth(DEPTH.result + 2));
      });
      this.resultMenu = new VerticalMenu(this, x + w / 2 - 70 * S, y + h - 44 * S, [{ label: 'Continuer', onSelect: onContinue }], this.actions, {
        width: 140 * S,
        lineHeight: 30 * S,
        depth: DEPTH.result + 2,
        scale: 2 * S,
        textScale: S,
      });
      this.actions.consume('confirm');
      this.tweens.add({ targets: parts.slice(1), alpha: { from: 0, to: 1 }, duration: 400 });
    });
  }

  lockResult(): void {
    this.run(() => this.resultMenu?.setLocked(true));
  }
}

function signed(v: number): string {
  return v > 0 ? `+${v}` : `${v}`;
}

function hpColor(ratio: number): number {
  return ratio > 0.5 ? 0x7fcf6a : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre;
}
