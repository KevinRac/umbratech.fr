/**
 * Interface du combat tactique (GDD §13.5, §13.7), dessinée en pixels natifs
 * par-dessus `BattleScene` : bandeau du haut (rencontre, objectif, tour et
 * phase), fiche de l'unité survolée, terrain sous le curseur, prévision de
 * l'échange, menus (actions, menu de carte), bandeau de phase, barres de PV de
 * l'échange en cours, notifications et écran de fin.
 *
 * La carte occupe le centre de l'écran ; les fiches vivent dans les deux
 * colonnes latérales (`SIDE` pixels), là où la carte ne passe jamais.
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

/** Largeur des colonnes latérales réservées à l'interface (à S = 1). */
export const SIDE = 140;
/** Hauteur du bandeau du haut (à S = 1). */
export const TOP_BAR = 28;

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
      this.resultMenu = null;
      this.menuCancel = null;
      this.exchange = null;
      this.exchangeBars.clear();
      this.header = [];
      this.phaseLabel = null;
      this.unitParts = [];
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

  /* ---------- Fiche d'unité (colonne de gauche) ---------- */

  showUnit(unit: BattleUnit | null): void {
    this.run(() => {
      this.clear(this.unitParts);
      if (!unit) return;
      const S = this.S;
      const x = 6 * S;
      const y = (TOP_BAR + 6) * S;
      const w = (SIDE - 10) * S;
      const parts = this.unitParts;
      // Portrait : le sprite de carte agrandi ×3, sur un médaillon à la couleur du camp.
      const cx = x + w / 2;
      parts.push(this.add.rectangle(cx, y + 50 * S, 56 * S, 76 * S, TEAM_COLOR[unit.team], 0.16).setDepth(DEPTH.panel + 1));
      parts.push(this.add.rectangle(cx, y + 87 * S, 56 * S, 2 * S, TEAM_COLOR[unit.team], 0.8).setDepth(DEPTH.panel + 1));
      parts.push(
        this.add
          .image(cx, y + 92 * S, BATTLE_TEX.unit(unit.sprite), BATTLE_TEX.unitFrame('down', 0))
          .setOrigin(0.5, 1)
          .setScale(3 * S)
          .setDepth(DEPTH.panel + 2),
      );
      if (unit.isBoss) parts.push(this.add.image(cx + 22 * S, y + 18 * S, BATTLE_TEX.crown).setScale(3 * S).setDepth(DEPTH.panel + 3));
      if (unit.isHero) parts.push(this.add.image(cx + 22 * S, y + 18 * S, BATTLE_TEX.heroMark).setScale(3 * S).setDepth(DEPTH.panel + 3));

      let ty = y + 98 * S;
      const line = (text: string, color: number, opts: { font?: 'body' | 'small' } = {}): PixelText => {
        const small = opts.font === 'small';
        const t = addText(this, cx, ty, text, { scale: small ? 2 * S : S, font: opts.font ?? 'body', color, align: 'center', maxWidth: w - 12 * S }).setDepth(DEPTH.panel + 2);
        parts.push(t);
        ty += Math.ceil(t.height) + (small ? 4 : 1) * S;
        return t;
      };
      line(unit.name, PALETTE.parchemin);
      if (unit.kindName !== unit.name) line(unit.kindName, unit.team === 'player' ? PALETTE.cyanEclat : PALETTE.braise, { font: 'small' });
      else ty += 2 * S;
      line(`Niv. ${unit.level}   PV ${unit.hp}/${unit.stats.pv}`, PALETTE.parchemin);
      // Barre de PV.
      const barW = w - 28 * S;
      parts.push(this.add.rectangle(x + 14 * S, ty, barW, 5 * S, PALETTE.encre, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 2));
      const ratio = unit.hp / unit.stats.pv;
      parts.push(
        this.add
          .rectangle(x + 14 * S + S, ty + S, Math.max(0, Math.round((barW - 2 * S) * ratio)), 3 * S, ratio > 0.5 ? 0x7fcf6a : ratio > 0.25 ? PALETTE.jauneBle : PALETTE.rougeCendre, 1)
          .setOrigin(0, 0)
          .setDepth(DEPTH.panel + 3),
      );
      ty += 10 * S;
      const range = unit.weapon.range[0] === unit.weapon.range[1] ? `${unit.weapon.range[0]}` : `${unit.weapon.range[0]}-${unit.weapon.range[1]}`;
      line(`${unit.weapon.name}  (portée ${range})`, PALETTE.ocreClair, { font: 'small' });
      // Statistiques : deux colonnes de 4.
      const colW = (w - 20 * S) / 2;
      STAT_LABELS.forEach(([key, label], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const sx = x + 12 * S + col * colW;
        const sy = ty + row * 14 * S;
        parts.push(addText(this, sx, sy, label, { font: 'small', scale: 2 * S, color: PALETTE.metalClair, shadow: false }).setDepth(DEPTH.panel + 2));
        const value = key === 'mob' && unit.bogged ? `${unit.stats.mob - 1}` : `${unit.stats[key]}`;
        parts.push(addText(this, sx + colW - 8 * S, sy, value, { font: 'small', scale: 2 * S, color: key === 'mob' && unit.bogged ? PALETTE.braise : PALETTE.parchemin, align: 'right', shadow: false }).setDepth(DEPTH.panel + 2));
      });
      ty += 4 * 14 * S + 4 * S;
      // Jauge de Résonance (GDD §9.9).
      parts.push(addText(this, x + 12 * S, ty, 'RÉSONANCE', { font: 'small', scale: 2 * S, color: PALETTE.metalClair, shadow: false }).setDepth(DEPTH.panel + 2));
      const gw = w - 24 * S;
      parts.push(this.add.rectangle(x + 12 * S, ty + 17 * S, gw, 4 * S, PALETTE.encre, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 2));
      parts.push(this.add.rectangle(x + 12 * S, ty + 17 * S, Math.round((gw * unit.resonance) / 100), 4 * S, PALETTE.cyanEclat, 1).setOrigin(0, 0).setDepth(DEPTH.panel + 3));
      ty += 26 * S;
      if (unit.bogged) {
        parts.push(addText(this, cx, ty, 'Enlisé (−1 Mob)', { font: 'small', scale: 2 * S, color: PALETTE.braise, align: 'center' }).setDepth(DEPTH.panel + 2));
        ty += 14 * S;
      }
      parts.push(drawPanel(this, x, y, w, ty - y + 8 * S, { scale: 2 * S, depth: DEPTH.panel }));
    });
  }

  /* ---------- Terrain (bas de la colonne de gauche) ---------- */

  showTerrain(terrain: TerrainDef | null): void {
    this.run(() => {
      this.clear(this.terrainParts);
      if (!terrain) return;
      const S = this.S;
      const w = (SIDE - 10) * S;
      const h = 74 * S;
      const x = 6 * S;
      const y = this.scale.height - h - 6 * S;
      const parts = this.terrainParts;
      parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
      parts.push(addText(this, x + w / 2, y + 7 * S, terrain.name, { scale: S, color: PALETTE.jauneBle, align: 'center' }).setDepth(DEPTH.panel + 1));
      const rows: [string, string][] = [
        ['DÉF', signed(terrain.defense)],
        ['ESQ', signed(terrain.avoid)],
        ['DÉPL', terrain.moveCost === null ? '—' : `${terrain.moveCost}`],
      ];
      rows.forEach(([label, value], i) => {
        const ry = y + 28 * S + i * 12 * S;
        parts.push(addText(this, x + 14 * S, ry, label, { font: 'small', scale: 2 * S, color: PALETTE.metalClair, shadow: false }).setDepth(DEPTH.panel + 1));
        parts.push(addText(this, x + w - 14 * S, ry, value, { font: 'small', scale: 2 * S, color: PALETTE.parchemin, align: 'right', shadow: false }).setDepth(DEPTH.panel + 1));
      });
      if (terrain.heal > 0) parts.push(addText(this, x + w / 2, y - 14 * S, `Soigne ${Math.round(terrain.heal * 100)} % des PV`, { font: 'small', scale: 2 * S, color: 0x7fcf6a, align: 'center' }).setDepth(DEPTH.panel + 1));
    });
  }

  /* ---------- Prévision (colonne de droite) ---------- */

  showForecast(forecast: Forecast | null, attacker: BattleUnit | null, defender: BattleUnit | null): void {
    this.run(() => {
      this.clear(this.forecastParts);
      if (!forecast || !attacker || !defender) return;
      const S = this.S;
      const w = (SIDE - 10) * S;
      const x = this.scale.width - w - 6 * S;
      const y = (TOP_BAR + 6) * S;
      const h = 214 * S;
      const parts = this.forecastParts;
      parts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }));
      parts.push(addText(this, x + w / 2, y + 7 * S, 'Prévision', { scale: S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.panel + 1));
      const colA = x + 26 * S;
      const colB = x + w - 26 * S;
      const mid = x + w / 2;
      let ty = y + 28 * S;
      parts.push(addText(this, x + 10 * S, ty, attacker.name, { scale: S, color: TEAM_COLOR[attacker.team] }).setDepth(DEPTH.panel + 1));
      ty += 16 * S;
      parts.push(addText(this, x + w - 10 * S, ty, defender.name, { scale: S, color: TEAM_COLOR[defender.team], align: 'right' }).setDepth(DEPTH.panel + 1));
      ty += 22 * S;
      const a = forecast.attacker;
      const d = forecast.defender;
      const dmg = (side: SideForecast): string => (!side.canStrike ? '—' : `${side.odds.damage}${side.doubles ? ' ×2' : ''}`);
      const pct = (side: SideForecast, v: number): string => (side.canStrike ? `${v}` : '—');
      const afterA = Math.max(0, a.hp - (d.canStrike ? d.odds.damage * (d.doubles ? 2 : 1) : 0));
      const afterD = Math.max(0, d.hp - a.odds.damage * (a.doubles ? 2 : 1));
      const rows: [string, string, string][] = [
        ['PV', `${a.hp}`, `${d.hp}`],
        ['DÉG', dmg(a), dmg(d)],
        ['PRÉC', pct(a, a.odds.hit), pct(d, d.odds.hit)],
        ['CRIT', pct(a, a.odds.crit), pct(d, d.odds.crit)],
        ['APRÈS', `${afterA}`, `${afterD}`],
      ];
      for (const [label, va, vb] of rows) {
        parts.push(addText(this, mid, ty, label, { font: 'small', scale: 2 * S, color: PALETTE.metalClair, align: 'center', shadow: false }).setDepth(DEPTH.panel + 1));
        parts.push(addText(this, colA, ty, va, { font: 'small', scale: 2 * S, color: PALETTE.parchemin, align: 'center', shadow: false }).setDepth(DEPTH.panel + 1));
        parts.push(addText(this, colB, ty, vb, { font: 'small', scale: 2 * S, color: PALETTE.parchemin, align: 'center', shadow: false }).setDepth(DEPTH.panel + 1));
        ty += 15 * S;
      }
      // Avantages : triangle élémentaire, arme efficace.
      const notes: [string, number][] = [];
      if (a.odds.triangle === 1) notes.push(['Élément favorable', 0x7fcf6a]);
      if (a.odds.triangle === -1) notes.push(['Élément défavorable', PALETTE.braise]);
      if (a.odds.effective) notes.push(['Arme efficace !', PALETTE.jauneBle]);
      if (!d.canStrike) notes.push(['Pas de riposte', PALETTE.cyanEclat]);
      ty += 2 * S;
      for (const [note, color] of notes.slice(0, 3)) {
        parts.push(addText(this, mid, ty, note, { font: 'small', scale: 2 * S, color, align: 'center' }).setDepth(DEPTH.panel + 1));
        ty += 12 * S;
      }
    });
  }

  /* ---------- Aide (bas de la colonne de droite) ---------- */

  showHelp(lines: readonly (readonly [string, string])[]): void {
    this.run(() => {
      this.clear(this.helpParts);
      if (lines.length === 0) return;
      const S = this.S;
      const w = (SIDE - 10) * S;
      const lineH = 16 * S;
      const h = lines.length * lineH + 12 * S;
      const x = this.scale.width - w - 6 * S;
      const y = this.scale.height - h - 6 * S;
      this.helpParts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.panel }).setAlpha(0.85));
      lines.forEach(([key, action], i) => {
        const ly = y + 5 * S + i * lineH;
        this.helpParts.push(addText(this, x + 10 * S, ly, key, { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH.panel + 1));
        this.helpParts.push(addText(this, x + w - 10 * S, ly, action, { scale: S, color: PALETTE.metalClair, align: 'right' }).setDepth(DEPTH.panel + 1));
      });
    });
  }

  /* ---------- Menus ---------- */

  get menuOpen(): boolean {
    return this.menu !== null;
  }

  openMenu(request: MenuRequest): void {
    this.run(() => {
      this.closeMenuNow();
      const S = this.S;
      const lineHeight = 26 * S;
      const titleH = request.title ? 22 * S : 0;
      const w = (SIDE - 10) * S;
      const h = request.items.length * lineHeight + titleH + 14 * S;
      const x = this.scale.width - w - 6 * S;
      const y = (TOP_BAR + 6) * S;
      this.menuParts.push(drawPanel(this, x, y, w, h, { scale: 2 * S, depth: DEPTH.menu }));
      if (request.title) this.menuParts.push(addText(this, x + w / 2, y + 7 * S, request.title, { scale: S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.menu + 1));
      this.menu = new VerticalMenu(this, x + 6 * S, y + 7 * S + titleH, request.items, this.actions, {
        width: w - 12 * S,
        lineHeight,
        depth: DEPTH.menu + 1,
        scale: 2 * S,
        textScale: S,
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
        const sub = addText(this, width / 2, top + 44 * S, `Tour ${turn}`, { font: 'small', scale: 2 * S, color: PALETTE.parchemin, align: 'center' });
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
      const y = height - h - 8 * S;
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
