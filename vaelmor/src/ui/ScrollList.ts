/**
 * Liste verticale défilante (inventaire, boutique, quêtes) : un curseur, une
 * fenêtre de `visibleRows` lignes, un texte à gauche et un texte à droite par
 * ligne. Navigation aux actions haut/bas/confirmer et à la souris.
 * Les valeurs sont en pixels d'écran (déjà multipliées par l'échelle de l'interface).
 */
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { PALETTE } from '../render/palette';
import { addText, setText, type PixelText } from './text';

export interface ListRow {
  readonly label: string;
  /** Texte aligné à droite (prix, quantité). */
  readonly right?: string;
  readonly enabled?: boolean;
  readonly color?: number;
}

export interface ScrollListOptions {
  readonly width: number;
  readonly rowHeight: number;
  readonly visibleRows: number;
  readonly depth: number;
  /** Échelle de l'interface (S) : marges et curseur. */
  readonly scale: number;
  readonly textScale?: number;
  readonly onCursor?: (index: number) => void;
  readonly onActivate?: (index: number) => void;
}

export class ScrollList {
  private rows: readonly ListRow[] = [];
  private top = 0;
  private cursor = 0;
  private locked = false;
  private readonly labels: PixelText[] = [];
  private readonly rights: PixelText[] = [];
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private readonly upMark: Phaser.GameObjects.Triangle;
  private readonly downMark: Phaser.GameObjects.Triangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    private readonly y: number,
    private readonly input: ActionInput,
    private readonly options: ScrollListOptions,
  ) {
    const S = options.scale;
    const { width, rowHeight, visibleRows, depth } = options;
    const ts = options.textScale ?? S;
    this.highlight = scene.add.rectangle(x, y, width, rowHeight - 2 * S, PALETTE.violetBrume, 0.6).setOrigin(0, 0).setDepth(depth);
    for (let i = 0; i < visibleRows; i++) {
      const rowY = y + i * rowHeight;
      const label = addText(scene, x + 8 * S, rowY + S, '', { scale: ts }).setDepth(depth + 1);
      const right = addText(scene, x + width - 8 * S, rowY + S, '', { scale: ts, align: 'right' }).setDepth(depth + 1);
      this.labels.push(label);
      this.rights.push(right);
      const zone = scene.add.zone(x, rowY, width, rowHeight).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.moveTo(this.top + i));
      zone.on('pointerdown', () => {
        this.moveTo(this.top + i);
        this.activate();
      });
      this.zones.push(zone);
    }
    const mid = x + width - 10 * S;
    this.upMark = scene.add.triangle(mid, y - 5 * S, 0, 6 * S, 6 * S, 6 * S, 3 * S, 0, PALETTE.ambre).setOrigin(0.5, 0.5).setDepth(depth + 1).setVisible(false);
    this.downMark = scene.add.triangle(mid, y + visibleRows * rowHeight + 4 * S, 0, 0, 6 * S, 0, 3 * S, 6 * S, PALETTE.ambre).setOrigin(0.5, 0.5).setDepth(depth + 1).setVisible(false);
    this.render();
  }

  get index(): number {
    return this.cursor;
  }

  get length(): number {
    return this.rows.length;
  }

  setRows(rows: readonly ListRow[], keepCursor = true): void {
    this.rows = rows;
    this.cursor = keepCursor ? Math.min(this.cursor, Math.max(0, rows.length - 1)) : 0;
    if (!keepCursor) this.top = 0;
    this.clampWindow();
    this.render();
    this.options.onCursor?.(this.cursor);
  }

  /** Remplace les lignes et place le curseur, sans prévenir `onCursor` (reconstruction d'un écran). */
  reset(rows: readonly ListRow[], cursor: number): void {
    this.rows = rows;
    this.cursor = Math.max(0, Math.min(cursor, rows.length - 1));
    this.clampWindow();
    this.render();
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  update(): void {
    if (this.locked || this.rows.length === 0) return;
    if (this.input.justPressed('up')) this.moveTo((this.cursor - 1 + this.rows.length) % this.rows.length);
    if (this.input.justPressed('down')) this.moveTo((this.cursor + 1) % this.rows.length);
    if (this.input.justPressed('confirm')) this.activate();
  }

  destroy(): void {
    for (const o of [...this.labels, ...this.rights, ...this.zones, this.highlight, this.upMark, this.downMark]) o.destroy();
  }

  private activate(): void {
    const row = this.rows[this.cursor];
    if (!row || row.enabled === false || this.locked) return;
    this.options.onActivate?.(this.cursor);
  }

  private moveTo(index: number): void {
    if (index < 0 || index >= this.rows.length || index === this.cursor) return;
    this.cursor = index;
    this.clampWindow();
    this.render();
    this.options.onCursor?.(index);
  }

  private clampWindow(): void {
    const { visibleRows } = this.options;
    if (this.cursor < this.top) this.top = this.cursor;
    if (this.cursor >= this.top + visibleRows) this.top = this.cursor - visibleRows + 1;
    this.top = Math.max(0, Math.min(this.top, Math.max(0, this.rows.length - visibleRows)));
  }

  private render(): void {
    const { visibleRows, rowHeight } = this.options;
    for (let i = 0; i < visibleRows; i++) {
      const row = this.rows[this.top + i];
      const label = this.labels[i] as PixelText;
      const right = this.rights[i] as PixelText;
      const zone = this.zones[i] as Phaser.GameObjects.Zone;
      if (!row) {
        setText(label, '');
        setText(right, '');
        zone.disableInteractive();
        continue;
      }
      zone.setInteractive({ useHandCursor: true });
      const selected = this.top + i === this.cursor;
      const color = row.enabled === false ? PALETTE.desactive : selected ? PALETTE.jauneBle : (row.color ?? PALETTE.parchemin);
      setText(label, row.label);
      label.setTint(color);
      setText(right, row.right ?? '');
      right.setTint(row.enabled === false ? PALETTE.desactive : (row.color ?? PALETTE.parchemin));
    }
    const shown = this.rows.length > 0;
    this.highlight.setVisible(shown).setY(this.y + (this.cursor - this.top) * rowHeight);
    this.upMark.setVisible(this.top > 0);
    this.downMark.setVisible(this.top + visibleRows < this.rows.length);
  }
}
