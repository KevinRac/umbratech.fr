/**
 * Menu vertical navigable au clavier (actions haut/bas/confirmer) et à la
 * souris (survol = sélection, clic = validation). Les entrées désactivées
 * restent visibles mais sont sautées.
 */
import Phaser from 'phaser';
import type { ActionInput } from '../core/input';
import { PALETTE } from '../render/palette';
import { addText, type PixelText } from './text';

export interface MenuItem {
  readonly label: string;
  readonly enabled?: boolean;
  readonly onSelect: () => void;
}

export interface VerticalMenuOptions {
  readonly width: number;
  readonly lineHeight?: number;
  readonly depth?: number;
  /** Vrai dans une scène dont la caméra défile (monde ouvert) : le menu reste collé à l'écran. */
  readonly fixed?: boolean;
}

const CURSOR_KEY = 'ui:cursor';

/** Curseur « flamme de lanterne », 2 images. */
function ensureCursorTexture(scene: Phaser.Scene): void {
  for (const frame of [0, 1]) {
    const key = `${CURSOR_KEY}${frame}`;
    if (scene.textures.exists(key)) continue;
    const rows =
      frame === 0
        ? ['..o..', '.oyo.', '.oyo.', 'oywyo', 'oywyo', '.oyo.', '..o..']
        : ['.....', '..o..', '.oyo.', 'oyyyo', 'oywyo', '.oyo.', '..o..'];
    const colors: Record<string, number> = { o: PALETTE.orangeForge, y: PALETTE.braise, w: 0xfff1c9 };
    const canvas = document.createElement('canvas');
    canvas.width = 5;
    canvas.height = 7;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = colors[ch];
        if (c === undefined) return;
        ctx.fillStyle = `#${c.toString(16).padStart(6, '0')}`;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
    scene.textures.addCanvas(key, canvas);
  }
}

export class VerticalMenu {
  private readonly labels: PixelText[] = [];
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private readonly cursor: Phaser.GameObjects.Image;
  private readonly lineHeight: number;
  private index: number;
  private flickerTimer: Phaser.Time.TimerEvent;
  private locked = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    private readonly y: number,
    private items: MenuItem[],
    private readonly input: ActionInput,
    options: VerticalMenuOptions,
  ) {
    ensureCursorTexture(scene);
    this.lineHeight = options.lineHeight ?? 16;
    const depth = options.depth ?? 0;

    this.highlight = scene.add.rectangle(x, y, options.width, this.lineHeight - 2, PALETTE.violetBrume, 0.55).setOrigin(0, 0).setDepth(depth);
    this.cursor = scene.add.image(x + 4, y, `${CURSOR_KEY}0`).setOrigin(0, 0).setDepth(depth + 1);

    items.forEach((item, i) => {
      const rowY = y + i * this.lineHeight;
      this.labels.push(addText(scene, x + 14, rowY + 1, item.label).setDepth(depth + 1) as PixelText);
      const zone = scene.add.zone(x, rowY, options.width, this.lineHeight).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.isEnabled(i) && this.select(i));
      zone.on('pointerdown', () => this.isEnabled(i) && (this.select(i), this.activate()));
      this.zones.push(zone);
    });

    this.index = Math.max(0, this.items.findIndex((_, i) => this.isEnabled(i)));
    this.flickerTimer = scene.time.addEvent({
      delay: 180,
      loop: true,
      callback: () => this.cursor.setTexture(`${CURSOR_KEY}${this.cursor.texture.key.endsWith('0') ? 1 : 0}`),
    });
    if (options.fixed) {
      for (const obj of [...this.labels, ...this.zones, this.highlight, this.cursor]) obj.setScrollFactor(0);
    }
    this.refresh();
  }

  /** À appeler à chaque frame. */
  update(): void {
    if (this.locked) return;
    if (this.input.justPressed('up')) this.move(-1);
    if (this.input.justPressed('down')) this.move(1);
    if (this.input.justPressed('confirm')) this.activate();
  }

  setItemEnabled(i: number, enabled: boolean): void {
    const item = this.items[i];
    if (!item) return;
    this.items = this.items.map((it, j) => (j === i ? { ...it, enabled } : it));
    this.refresh();
  }

  /** Bloque les entrées (pendant une transition). */
  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  destroy(): void {
    this.flickerTimer.remove();
    for (const obj of [...this.labels, ...this.zones, this.highlight, this.cursor]) obj.destroy();
  }

  private isEnabled(i: number): boolean {
    return this.items[i]?.enabled !== false;
  }

  private move(step: number): void {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const next = (this.index + step * k + n * k) % n;
      if (this.isEnabled(next)) {
        this.select(next);
        return;
      }
    }
  }

  private select(i: number): void {
    if (i === this.index) return;
    this.index = i;
    this.refresh();
  }

  private activate(): void {
    if (this.locked || !this.isEnabled(this.index)) return;
    // Petit « coup » visuel sur l'entrée validée.
    const label = this.labels[this.index];
    if (label) this.scene.tweens.add({ targets: label, x: label.x + 2, duration: 60, yoyo: true });
    this.items[this.index]?.onSelect();
  }

  private refresh(): void {
    const rowY = this.y + this.index * this.lineHeight;
    this.highlight.setY(rowY);
    this.cursor.setY(rowY + Math.floor((this.lineHeight - 2 - 7) / 2));
    this.labels.forEach((label, i) => {
      const color = !this.isEnabled(i) ? PALETTE.desactive : i === this.index ? PALETTE.jauneBle : PALETTE.parchemin;
      label.setTint(color);
    });
  }
}
