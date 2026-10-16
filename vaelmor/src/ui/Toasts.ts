/**
 * Notifications brèves en haut de l'écran (GDD §13.6) : file d'attente,
 * 2,5 s chacune, glissement d'entrée et fondu de sortie.
 */
import type Phaser from 'phaser';
import { PALETTE } from '../render/palette';
import { drawPanel } from './panel';
import { addText } from './text';

export const TOAST_DURATION_MS = 2500;

export interface ToastsOptions {
  readonly depth?: number;
  /** Largeur de la zone d'affichage (par défaut : tout le canevas). */
  readonly width?: number;
  /** Agrandissement entier du cadre et de la marge (×2 sur l'interface native). */
  readonly scale?: number;
}

export class Toasts {
  private readonly queue: string[] = [];
  private showing = false;
  private readonly depth: number;
  private readonly areaWidth: number;
  private readonly k: number;

  constructor(
    private readonly scene: Phaser.Scene,
    options: ToastsOptions = {},
  ) {
    this.depth = options.depth ?? 1000;
    this.areaWidth = options.width ?? scene.scale.width;
    this.k = options.scale ?? 1;
  }

  push(message: string): void {
    if (this.queue[this.queue.length - 1] === message) return; // évite les doublons d'un même clic répété
    this.queue.push(message);
    if (!this.showing) this.next();
  }

  private next(): void {
    const message = this.queue.shift();
    if (message === undefined) {
      this.showing = false;
      return;
    }
    this.showing = true;
    const k = this.k;
    const text = addText(this.scene, 0, 0, message, { color: PALETTE.parchemin, maxWidth: this.areaWidth - 48 * k });
    const width = Math.ceil(text.width) + 16 * k;
    const height = Math.max(19 * k, Math.ceil(text.height) + 6 * k);
    const x = Math.round((this.areaWidth - width) / 2);
    const container = this.scene.add.container(x, -height - 2).setDepth(this.depth);
    const panel = drawPanel(this.scene, 0, 0, width, height, { scale: k });
    text.setPosition(8 * k, 2 * k);
    container.add([panel, text]);

    this.scene.tweens.chain({
      targets: container,
      tweens: [
        { y: 6 * k, duration: 180, ease: 'Quad.easeOut' },
        { alpha: 1, duration: TOAST_DURATION_MS - 400 },
        { alpha: 0, duration: 220 },
      ],
      onComplete: () => {
        container.destroy(true);
        this.next();
      },
    });
  }
}
