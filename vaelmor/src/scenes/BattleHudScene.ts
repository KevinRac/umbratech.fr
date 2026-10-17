/**
 * Interface du combat tactique (GDD §13.5, §13.7), dessinée en pixels natifs
 * par-dessus `BattleScene` : bandeau du haut (rencontre, objectif, tour et
 * phase), fiche de l'unité survolée, terrain sous le curseur, prévision de
 * l'échange, menus (actions, menu de carte), bandeau de phase, barres de PV de
 * l'échange en cours, notifications et écran de fin.
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
import { drawPanel } from '../ui/panel';
import { addText, setText, type PixelText } from '../ui/text';
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

const DEPTH = { panel: 10, menu: 40, exchange: 50, banner: 80, result: 100, toasts: 200 } as const;
const TEAM_COLOR: Readonly<Record<Team, number>> = { player: 0x6fa8dc, enemy: 0xd9654b };
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
    this.toasts = new Toasts(this, { depth: DEPTH.toasts, scale: 2 * this.S, textScale: this.S });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.menu && this.menuCancel) this.menuCancel();
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
    });
    this.ready = true;
    const queued = this.pending;
    this.pending = [];
    for (const call of queued) call();
  }

  override update(): void {
    if (!this.ready) return;
    if (this.menu) {
      if (this.actions.justPressed('cancel') && this.menuCancel) this.menuCancel();
      else this.menu?.update();
    }
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
      setText(this.phaseLabel, `Tour ${turn} · ${team === 'player' ? 'Phase du joueur' : 'Phase ennemie'}`);
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
    this.drawTerrain();
  }

  /** Bas de la colonne de fenêtres du haut (unité, puis détails ou prévision). */
  private stackTop(): number {
    const S = this.S;
    let y = (TOP_BAR + 6) * S;
    if (this.lastUnit && !this.lastForecast) y += 72 * S;
    if (this.lastDetails && !this.lastForecast) y += 96 * S;
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

  private drawUnit(): void {
    this.clear(this.unitParts);
    const unit = this.lastUnit;
    if (!unit || this.lastForecast) return;
    const S = this.S;
    const w = WIN_W * S;
    const h = 66 * S;
    const x = this.winX(w);
    const y = (TOP_BAR + 6) * S;
    const parts = this.unitParts;
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
    parts.push(addText(this, tx, y + 6 * S, unit.name, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.panel + 2));
    parts.push(addText(this, x + w - 10 * S, y + 6 * S, `Niv ${unit.level}`, { scale: S, color: PALETTE.jauneBle, align: 'right' }).setDepth(DEPTH.panel + 2));
    const kind = unit.kindName !== unit.name ? unit.kindName : unit.weapon.name;
    parts.push(addText(this, tx, y + 21 * S, kind, { scale: S, color: unit.team === 'player' ? PALETTE.cyanEclat : PALETTE.braise, maxWidth: w - 64 * S }).setDepth(DEPTH.panel + 2));
    // Barre de PV.
    const barW = w - 66 * S - 46 * S;
    const by = y + 44 * S;
    parts.push(this.add.rectangle(tx, by, barW, 6 * S, PALETTE.encre, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 2));
    const ratio = unit.hp / unit.stats.pv;
    parts.push(this.add.rectangle(tx + S, by + S, Math.max(0, Math.round((barW - 2 * S) * ratio)), 4 * S, hpColor(ratio), 1).setOrigin(0, 0).setDepth(DEPTH.panel + 3));
    parts.push(addText(this, x + w - 10 * S, by - 6 * S, `${unit.hp}/${unit.stats.pv}`, { scale: S, color: PALETTE.parchemin, align: 'right' }).setDepth(DEPTH.panel + 2));
  }

  /* ---------- Fiche détaillée (unité choisie) ---------- */

  showDetails(unit: BattleUnit | null): void {
    this.run(() => {
      this.lastDetails = unit;
      this.drawDetails();
    });
  }

  private drawDetails(): void {
    this.clear(this.detailParts);
    const unit = this.lastDetails;
    if (!unit || this.lastForecast) return;
    const S = this.S;
    const w = WIN_W * S;
    const h = 90 * S;
    const x = this.winX(w);
    const y = (TOP_BAR + 6 + (this.lastUnit ? 72 : 0)) * S;
    const parts = this.detailParts;
    parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
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
    return r !== null && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
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
      const x = this.winX(w);
      // Le menu d'action laisse la place de la prévision, qui s'affiche au survol d'un ennemi.
      const y = big ? Math.max(this.stackTop(), (TOP_BAR + 6 + FORECAST_MAX_H + 8) * S) : this.stackTop();
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
    return new Promise((resolve) => {
      this.run(() => {
        if (durationMs <= 0) {
          resolve();
          return;
        }
        const S = this.S;
        const { width, height } = this.scale;
        const color = TEAM_COLOR[team];
        const container = this.add.container(0, 0).setDepth(DEPTH.banner);
        const bandH = 64 * S;
        const top = Math.round(height / 2 - bandH / 2);
        container.add(this.add.rectangle(0, top, width, bandH, PALETTE.nuit, 0.8).setOrigin(0, 0));
        container.add(this.add.rectangle(0, top, width, 2 * S, color, 0.9).setOrigin(0, 0));
        container.add(this.add.rectangle(0, top + bandH - 2 * S, width, 2 * S, color, 0.9).setOrigin(0, 0));
        const title = addText(this, width / 2, top + 10 * S, team === 'player' ? 'Phase du joueur' : 'Phase ennemie', { font: 'title', scale: 3 * S, color, align: 'center' });
        const sub = addText(this, width / 2, top + 42 * S, `Tour ${turn}`, { scale: S, color: PALETTE.parchemin, align: 'center' });
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

  /* ---------- Fin du combat (GDD §13.7) ---------- */

  /** `opensWorld` : la victoire lève des drapeaux dans une partie en cours (un passage s'ouvre). */
  showResult(summary: BattleSummary, opensWorld: boolean, onContinue: () => void): void {
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
      const title = addText(this, width / 2, y + 16 * S, victory ? 'Victoire' : 'Compagnie dispersée', {
        font: 'title',
        scale: 3 * S,
        color: victory ? PALETTE.lumiereDoree : PALETTE.braise,
        align: 'center',
      }).setDepth(DEPTH.result + 2);
      parts.push(title);
      const lines: [string, number][] = [
        [`Tours : ${summary.turns}`, PALETTE.parchemin],
        [`Ennemis vaincus : ${summary.enemiesDefeated} / ${summary.enemiesTotal}`, PALETTE.parchemin],
      ];
      if (victory) {
        lines.push(summary.fallen.length > 0 ? [`Blessés (1 PV, jusqu'au prochain repos) : ${summary.fallen.join(', ')}`, PALETTE.braise] : ['Aucun blessé', 0x7fcf6a]);
        if (opensWorld && summary.flags.length > 0) lines.push(['Un passage s’ouvre dans le monde…', PALETTE.cyanEclat]);
      } else {
        lines.push(['La compagnie se replie.', PALETTE.metalClair]);
      }
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
