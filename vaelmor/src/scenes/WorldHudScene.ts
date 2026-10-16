/**
 * Interface du monde ouvert : étiquette de zone, aide, bannières de lieu,
 * notifications, teinte d'ambiance, particules d'ambiance et menu pause.
 *
 * Cette scène tourne par-dessus `WorldScene` et se dessine en pixels réels de
 * l'écran (le canevas n'est jamais étiré, décision n°38) : texte et cadres sont
 * agrandis d'un facteur entier `S` qui dépend de la hauteur de l'écran. Les
 * valeurs ci-dessous sont écrites pour S = 1 (écran de 540 px de haut) et
 * multipliées par S. `WorldScene` l'appelle directement ; les appels reçus avant
 * sa création sont mis en attente. Au redimensionnement, tout est reconstruit.
 */
import Phaser from 'phaser';
import { uiScaleFor, worldZoomFor } from '../core/viewport';
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
  private S = 1;

  private tint!: Phaser.GameObjects.Rectangle;
  private tintState: { color: number; alpha: number } | null = null;
  private ambience: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private ambienceKind: AmbienceKind | null = null;
  private zoneText: string | null = null;
  private zoneParts: Phaser.GameObjects.GameObject[] = [];
  private hintParts: Phaser.GameObjects.GameObject[] = [];
  private hintUntil = 0;
  private banner: Phaser.GameObjects.Container | null = null;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseMenu: VerticalMenu | null = null;
  private pauseHandlers: PauseHandlers | null = null;

  constructor() {
    super({ key: SCENES.worldHud, active: false });
  }

  create(): void {
    this.actions = new ActionInput(this);
    this.tint = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0, 0).setDepth(DEPTH.tint);
    this.hintUntil = this.time.now + HINT_DURATION_MS;
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      this.ready = false;
      this.pending = [];
      this.ambience = null;
      this.zoneParts = [];
      this.hintParts = [];
      this.banner = null;
      this.pauseMenu = null;
      this.pauseObjects = [];
      this.tintState = null;
      this.zoneText = null;
      this.ambienceKind = null;
      this.pauseHandlers = null;
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
      this.zoneText = label;
      this.buildZone();
    });
  }

  setTint(color: number, alpha: number): void {
    this.run(() => {
      this.tintState = { color, alpha };
      this.tint.setFillStyle(color, 1).setAlpha(0);
      this.tweens.add({ targets: this.tint, alpha, duration: 900 });
    });
  }

  setAmbience(kind: AmbienceKind): void {
    this.run(() => {
      this.ambienceKind = kind;
      this.buildAmbience();
    });
  }

  toast(message: string): void {
    this.run(() => this.toasts.push(message));
  }

  showBanner(title: string, subtitle: string, holdMs: number): void {
    this.run(() => {
      const S = this.S;
      this.banner?.destroy(true);
      const container = this.add.container(0, 0).setDepth(DEPTH.banner);
      const cx = this.scale.width / 2;
      const titleText = addText(this, cx, 70 * S, title, { font: 'title', scale: 3 * S, color: PALETTE.parchemin, align: 'center' });
      container.add(titleText);
      const width = Math.ceil(titleText.width);
      const lineY = 70 * S + Math.ceil(titleText.height) + 6 * S;
      container.add(this.add.rectangle(Math.round(cx - width / 2 - 12 * S), lineY, width + 24 * S, 2 * S, PALETTE.ambre, 0.9).setOrigin(0, 0));
      if (subtitle) container.add(addText(this, cx, lineY + 10 * S, subtitle, { scale: S, color: PALETTE.cyanEclat, align: 'center' }));
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
      this.pauseHandlers = handlers;
      this.buildPause();
    });
  }

  hidePause(): void {
    this.run(() => {
      this.pauseHandlers = null;
      this.destroyPause();
    });
  }

  /* ---------- Construction ---------- */

  private run(call: () => void): void {
    if (this.ready) call();
    else this.pending.push(call);
  }

  /** (Re)construit tout ce qui dépend de la taille de l'écran. */
  private layout(): void {
    const { width, height } = this.scale;
    this.S = uiScaleFor(height);
    this.tint.setSize(width, height);
    if (this.tintState) this.tint.setFillStyle(this.tintState.color, 1).setAlpha(this.tintState.alpha);
    this.toasts = new Toasts(this, { depth: DEPTH.toasts, scale: 2 * this.S, textScale: this.S });
    this.banner?.destroy(true);
    this.banner = null;
    this.buildHint();
    if (this.zoneText !== null) this.buildZone();
    if (this.ambienceKind !== null) this.buildAmbience();
    if (this.pauseHandlers) this.buildPause();
  }

  private buildZone(): void {
    const S = this.S;
    for (const part of this.zoneParts) part.destroy();
    this.zoneParts = [];
    const label = addText(this, 22 * S, 14 * S, this.zoneText ?? '', { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.hud + 1);
    const panel = drawPanel(this, 8 * S, 8 * S, Math.ceil(label.width) + 28 * S, 40 * S, { scale: 2 * S, depth: DEPTH.hud }).setAlpha(0.9);
    this.zoneParts = [panel, label];
  }

  private buildHint(): void {
    for (const part of this.hintParts) part.destroy();
    this.hintParts = [];
    const remaining = this.hintUntil - this.time.now;
    if (remaining <= 0) return;
    const S = this.S;
    const { width, height } = this.scale;
    const bar = this.add.rectangle(0, height - 32 * S, width, 32 * S, PALETTE.nuit, 0.6).setOrigin(0, 0).setDepth(DEPTH.hud);
    const hint = addText(this, 16 * S, height - 26 * S, 'ZQSD / flèches : marcher   Maj : courir   Échap : pause', { font: 'small', scale: 2 * S, color: PALETTE.metalClair }).setDepth(DEPTH.hud);
    this.hintParts = [bar, hint];
    this.tweens.add({
      targets: [hint, bar],
      alpha: 0,
      delay: Math.max(0, remaining - 800),
      duration: 800,
      onComplete: () => {
        hint.destroy();
        bar.destroy();
        this.hintParts = this.hintParts.filter((p) => p !== hint && p !== bar);
      },
    });
  }

  private buildAmbience(): void {
    this.ambience?.destroy();
    if (this.ambienceKind === null) return;
    const { width, height } = this.scale;
    this.ambience = createAmbience(this, this.ambienceKind, DEPTH.ambience, { width, height, zoom: worldZoomFor(height) });
  }

  private buildPause(): void {
    this.destroyPause();
    const handlers = this.pauseHandlers;
    if (!handlers) return;
    const S = this.S;
    const lineHeight = 34 * S;
    const items = [
      { label: 'Reprendre', onSelect: handlers.onResume },
      { label: 'Retour au titre', onSelect: handlers.onTitle },
    ];
    const { width: W, height: H } = this.scale;
    const width = 300 * S;
    const height = items.length * lineHeight + 76 * S;
    const x = Math.round((W - width) / 2);
    const y = Math.round((H - height) / 2);
    const dim = this.add.rectangle(0, 0, W, H, PALETTE.nuit, 0.55).setOrigin(0, 0).setDepth(DEPTH.pause).setInteractive();
    const panel = drawPanel(this, x, y, width, height, { scale: 2 * S, depth: DEPTH.pause + 1 });
    const title = addText(this, W / 2, y + 14 * S, 'Pause', { scale: 2 * S, color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.pause + 2);
    this.pauseObjects = [dim, panel, title];
    this.pauseMenu = new VerticalMenu(this, x + 12 * S, y + 56 * S, items, this.actions, {
      width: width - 24 * S,
      lineHeight,
      depth: DEPTH.pause + 2,
      scale: 2 * S,
      textScale: S,
    });
  }

  private destroyPause(): void {
    this.pauseMenu?.destroy();
    this.pauseMenu = null;
    for (const object of this.pauseObjects) object.destroy();
    this.pauseObjects = [];
  }
}
