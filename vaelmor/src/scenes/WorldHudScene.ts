/**
 * Interface du monde ouvert : étiquette de zone, aide, bannières de lieu,
 * notifications, teinte d'ambiance, particules d'ambiance et menu pause.
 *
 * Cette scène tourne par-dessus `WorldScene`, à la même résolution fixe de
 * 480×270 (décision n°39) : la caméra du monde défile, pas l'interface.
 * `WorldScene` l'appelle directement ; les appels reçus avant sa création sont
 * mis en attente.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config';
import { ActionInput } from '../core/input';
import type { AmbienceKind } from '../data/schemas';
import { createAmbience } from '../render/ambience';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { Toasts } from '../ui/Toasts';
import { addText } from '../ui/text';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

const DEPTH = { ambience: 60, tint: 80, hud: 100, banner: 110, pause: 200, toasts: 300 } as const;
const HINT_DURATION_MS = 9000;

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
  private zoneParts: Phaser.GameObjects.GameObject[] = [];
  private banner: Phaser.GameObjects.Container | null = null;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseMenu: VerticalMenu | null = null;

  constructor() {
    super({ key: SCENES.worldHud, active: false });
  }

  create(): void {
    this.actions = new ActionInput(this);
    this.toasts = new Toasts(this, { depth: DEPTH.toasts });
    this.tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0, 0).setDepth(DEPTH.tint);
    this.buildHint();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
      this.pending = [];
      this.ambience = null;
      this.zoneParts = [];
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
      for (const part of this.zoneParts) part.destroy();
      const text = addText(this, 11, 7, label, { font: 'small', color: PALETTE.parchemin }).setDepth(DEPTH.hud + 1);
      const panel = drawPanel(this, 4, 4, Math.ceil(text.width) + 14, 18, { depth: DEPTH.hud }).setAlpha(0.9);
      this.zoneParts = [panel, text];
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
      this.ambience = createAmbience(this, kind, DEPTH.ambience, { width: GAME_WIDTH, height: GAME_HEIGHT, zoom: GAME_WIDTH / 320 });
    });
  }

  toast(message: string): void {
    this.run(() => this.toasts.push(message));
  }

  showBanner(title: string, subtitle: string, holdMs: number): void {
    this.run(() => {
      this.banner?.destroy(true);
      const container = this.add.container(0, 0).setDepth(DEPTH.banner);
      const titleText = addText(this, GAME_WIDTH / 2, 44, title, { font: 'title', scale: 2, color: PALETTE.parchemin, align: 'center' });
      container.add(titleText);
      const width = Math.ceil(titleText.width);
      const lineY = 44 + Math.ceil(titleText.height) + 4;
      container.add(this.add.rectangle(Math.round(GAME_WIDTH / 2 - width / 2 - 6), lineY, width + 12, 1, PALETTE.ambre, 0.9).setOrigin(0, 0));
      if (subtitle) container.add(addText(this, GAME_WIDTH / 2, lineY + 5, subtitle, { color: PALETTE.cyanEclat, align: 'center' }));
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
      const lineHeight = 17;
      const items = [
        { label: 'Reprendre', onSelect: handlers.onResume },
        { label: 'Retour au titre', onSelect: handlers.onTitle },
      ];
      const width = 150;
      const height = items.length * lineHeight + 38;
      const x = Math.round((GAME_WIDTH - width) / 2);
      const y = Math.round((GAME_HEIGHT - height) / 2);
      const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.nuit, 0.55).setOrigin(0, 0).setDepth(DEPTH.pause).setInteractive();
      const panel = drawPanel(this, x, y, width, height, { depth: DEPTH.pause + 1 });
      const title = addText(this, GAME_WIDTH / 2, y + 7, 'Pause', { color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.pause + 2);
      this.pauseObjects = [dim, panel, title];
      this.pauseMenu = new VerticalMenu(this, x + 6, y + 24, items, this.actions, { width: width - 12, lineHeight, depth: DEPTH.pause + 2 });
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
    const bar = this.add.rectangle(0, GAME_HEIGHT - 14, GAME_WIDTH, 14, PALETTE.nuit, 0.6).setOrigin(0, 0).setDepth(DEPTH.hud);
    const hint = addText(this, 8, GAME_HEIGHT - 12, 'ZQSD / flèches : marcher   Maj : courir   Échap : pause', { font: 'small', color: PALETTE.metalClair }).setDepth(DEPTH.hud);
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
