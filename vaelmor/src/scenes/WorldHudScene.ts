/**
 * Interface du monde ouvert : étiquette de zone, aide, bannières de lieu,
 * notifications, teinte d'ambiance, particules d'ambiance et menu pause.
 *
 * Cette scène tourne par-dessus `WorldScene` et se dessine à la résolution
 * réelle du canevas (960×540) : le texte et les cadres restent nets, quel que
 * soit le zoom du pixel art du monde (décision n°37). `WorldScene` l'appelle
 * directement ; les appels reçus avant sa création sont mis en attente.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI_SCALE } from '../core/config';
import { ActionInput } from '../core/input';
import type { AmbienceKind } from '../data/schemas';
import { createAmbience } from '../render/ambience';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { Toasts } from '../ui/Toasts';
import { addText, type PixelText } from '../ui/text';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

const DEPTH = { ambience: 60, tint: 80, hud: 100, banner: 110, pause: 200, toasts: 300 } as const;
const HINT_DURATION_MS = 9000;
const K = UI_SCALE;

export interface PauseHandlers {
  readonly onResume: () => void;
  readonly onTitle: () => void;
}

export class WorldHudScene extends Phaser.Scene {
  private ready = false;
  private pending: (() => void)[] = [];
  private actions!: ActionInput;
  private toasts!: Toasts;
  private tint!: Phaser.GameObjects.Rectangle;
  private ambience: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private zonePanel: Phaser.GameObjects.Graphics | null = null;
  private zoneLabel!: PixelText;
  private banner: Phaser.GameObjects.Container | null = null;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseMenu: VerticalMenu | null = null;

  constructor() {
    super({ key: SCENES.worldHud, active: false });
  }

  create(): void {
    this.actions = new ActionInput(this);
    this.toasts = new Toasts(this, { depth: DEPTH.toasts, scale: K });
    this.tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0, 0).setDepth(DEPTH.tint);
    this.zoneLabel = addText(this, 22, 14, '', { color: PALETTE.parchemin }).setDepth(DEPTH.hud + 1);
    this.zoneLabel.setVisible(false);
    this.buildHint();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
      this.pending = [];
      this.ambience = null;
      this.zonePanel = null;
      this.banner = null;
      this.pauseMenu = null;
      this.pauseObjects = [];
    });
    this.ready = true;
    const queued = this.pending;
    this.pending = [];
    for (const call of queued) call();
  }

  override update(): void {
    if (this.ready) this.pauseMenu?.update();
  }

  /* ---------- API appelée par WorldScene ---------- */

  setZone(label: string): void {
    this.run(() => {
      this.zoneLabel.setText(label).setVisible(true);
      this.zonePanel?.destroy();
      this.zonePanel = drawPanel(this, 8, 8, Math.ceil(this.zoneLabel.width) + 28, 40, { scale: K, depth: DEPTH.hud }).setAlpha(0.9);
    });
  }

  setTint(color: number, alpha: number): void {
    this.run(() => {
      this.tint.setFillStyle(color, 1).setAlpha(0);
      this.tweens.add({ targets: this.tint, alpha, duration: 900 });
    });
  }

  setAmbience(kind: AmbienceKind): void {
    this.run(() => {
      this.ambience?.destroy();
      this.ambience = createAmbience(this, kind, DEPTH.ambience);
    });
  }

  toast(message: string): void {
    this.run(() => this.toasts.push(message));
  }

  showBanner(title: string, subtitle: string, holdMs: number): void {
    this.run(() => {
      this.banner?.destroy(true);
      const container = this.add.container(0, 0).setDepth(DEPTH.banner);
      const titleText = addText(this, GAME_WIDTH / 2, 70, title, { font: 'title', scale: 3, color: PALETTE.parchemin, align: 'center' });
      container.add(titleText);
      const width = Math.ceil(titleText.width);
      const lineY = 70 + Math.ceil(titleText.height) + 6;
      container.add(this.add.rectangle(Math.round(GAME_WIDTH / 2 - width / 2 - 12), lineY, width + 24, 2, PALETTE.ambre, 0.9).setOrigin(0, 0));
      if (subtitle) container.add(addText(this, GAME_WIDTH / 2, lineY + 10, subtitle, { color: PALETTE.cyanEclat, align: 'center' }));
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
    });
  }

  showPause(handlers: PauseHandlers): void {
    this.run(() => {
      const lineHeight = 17 * K;
      const items = [
        { label: 'Reprendre', onSelect: handlers.onResume },
        { label: 'Retour au titre', onSelect: handlers.onTitle },
      ];
      const width = 300;
      const height = items.length * lineHeight + 76;
      const x = Math.round((GAME_WIDTH - width) / 2);
      const y = Math.round((GAME_HEIGHT - height) / 2);
      const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.nuit, 0.55).setOrigin(0, 0).setDepth(DEPTH.pause).setInteractive();
      const panel = drawPanel(this, x, y, width, height, { scale: K, depth: DEPTH.pause + 1 });
      const title = addText(this, GAME_WIDTH / 2, y + 14, 'Pause', { scale: 2, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.pause + 2);
      this.pauseObjects = [dim, panel, title];
      this.pauseMenu = new VerticalMenu(this, x + 12, y + 56, items, this.actions, { width: width - 24, lineHeight, depth: DEPTH.pause + 2, scale: K });
    });
  }

  hidePause(): void {
    this.run(() => {
      this.pauseMenu?.destroy();
      this.pauseMenu = null;
      for (const object of this.pauseObjects) object.destroy();
      this.pauseObjects = [];
    });
  }

  /* ---------- Interne ---------- */

  private run(call: () => void): void {
    if (this.ready) call();
    else this.pending.push(call);
  }

  private buildHint(): void {
    const bar = this.add.rectangle(0, GAME_HEIGHT - 32, GAME_WIDTH, 32, PALETTE.nuit, 0.6).setOrigin(0, 0).setDepth(DEPTH.hud);
    const hint = addText(this, 16, GAME_HEIGHT - 26, 'ZQSD / flèches : marcher   Maj : courir   Échap : pause', { font: 'small', scale: 2, color: PALETTE.metalClair }).setDepth(DEPTH.hud);
    this.tweens.add({
      targets: [hint, bar],
      alpha: 0,
      delay: HINT_DURATION_MS,
      duration: 800,
      onComplete: () => {
        hint.destroy();
        bar.destroy();
      },
    });
  }
}
