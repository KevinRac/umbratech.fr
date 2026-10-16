/**
 * Notifications brèves en haut de l'écran (GDD §13.6) : file d'attente,
 * 2,5 s chacune, glissement d'entrée et fondu de sortie.
 */
import type Phaser from 'phaser';
import { PALETTE } from '../render/palette';
import { drawPanel } from './panel';
import { addText } from './text';

export const TOAST_DURATION_MS = 2500;

export class Toasts {
  private readonly queue: string[] = [];
  private showing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth = 1000,
  ) {}

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
    const text = addText(this.scene, 0, 0, message, { color: PALETTE.parchemin, maxWidth: this.scene.scale.width - 48 });
    const width = Math.ceil(text.width) + 16;
    const height = Math.max(19, Math.ceil(text.height) + 6);
    const x = Math.round((this.scene.scale.width - width) / 2);
    const container = this.scene.add.container(x, -height - 2).setDepth(this.depth).setScrollFactor(0);
    const panel = drawPanel(this.scene, 0, 0, width, height);
    text.setPosition(8, 2);
    container.add([panel, text]);

    this.scene.tweens.chain({
      targets: container,
      tweens: [
        { y: 6, duration: 180, ease: 'Quad.easeOut' },
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
