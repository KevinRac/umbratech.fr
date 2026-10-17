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
import { QUALITY_LABEL, nextQuality, type Quality } from '../render/atmosphere';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { Toasts } from '../ui/Toasts';
import { addText } from '../ui/text';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

const DEPTH = { ambience: 60, tint: 80, hud: 100, banner: 110, pause: 200, toasts: 300 } as const;
const GAUGE_EXPANDED_MS = 3200;
const HINT_DURATION_MS = 9000;

export interface PauseHandlers {
  readonly onResume: () => void;
  readonly onTitle: () => void;
  /** Qualité des effets HD-2D en cours, et changement demandé (décision n°47). */
  readonly quality: () => Quality;
  readonly onQuality: (quality: Quality) => void;
}

/** Ce que la jauge de réputation affiche pour le lieu où se trouve le joueur. */
export interface ReputationView {
  readonly place: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly tierName: string;
  readonly tierColor: number;
  readonly tiers: readonly { readonly min: number; readonly max: number; readonly color: number }[];
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
  private gold: number | null = null;
  private goldParts: Phaser.GameObjects.GameObject[] = [];
  private reputation: ReputationView | null = null;
  private gaugeExpandedUntil = 0;
  private gaugeParts: Phaser.GameObjects.GameObject[] = [];
  private promptText: string | null = null;
  private promptParts: Phaser.GameObjects.GameObject[] = [];

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
      this.gold = null;
      this.goldParts = [];
      this.reputation = null;
      this.gaugeParts = [];
      this.promptText = null;
      this.promptParts = [];
    });
    this.ready = true;
    const queued = this.pending;
    this.pending = [];
    for (const call of queued) call();
  }

  override update(): void {
    if (!this.ready) return;
    this.pauseMenu?.update();
    // La jauge de réputation se replie après quelques secondes.
    if (this.reputation && this.gaugeExpandedUntil > 0 && this.time.now > this.gaugeExpandedUntil) {
      this.gaugeExpandedUntil = 0;
      this.buildGauge();
    }
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

  /** Notifications de jeu (réputation, or, objets, quêtes) : deux messages par bulle au plus. */
  notify(messages: readonly string[]): void {
    this.run(() => {
      for (let i = 0; i < messages.length; i += 2) this.toasts.push(messages.slice(i, i + 2).join('   ·   '));
    });
  }

  /** Or du joueur, en haut à droite. */
  setGold(amount: number): void {
    this.run(() => {
      this.gold = amount;
      this.buildGold();
    });
  }

  /** Jauge de réputation du lieu (null hors d'un village). `expand` : grande jauge pendant quelques secondes. */
  setReputation(view: ReputationView | null, expand = false): void {
    this.run(() => {
      this.reputation = view;
      this.gaugeExpandedUntil = view && expand ? this.time.now + GAUGE_EXPANDED_MS : 0;
      this.buildGauge();
    });
  }

  /** Invite d'interaction en bas de l'écran (« E  Parler à Maëlys »), ou null. */
  setPrompt(text: string | null): void {
    this.run(() => {
      if (text === this.promptText) return;
      this.promptText = text;
      this.buildPrompt();
    });
  }

  showBanner(title: string, subtitle: string, holdMs: number): void {
    this.run(() => {
      const S = this.S;
      this.banner?.destroy(true);
      const container = this.add.container(0, 0).setDepth(DEPTH.banner);
      const cx = this.scale.width / 2;
      // Bandeau sombre sur toute la largeur : le nom reste lisible sur n'importe quel décor.
      const top = 62 * S;
      const titleText = addText(this, cx, top + 10 * S, title, { scale: 2 * S, shadow: false, color: PALETTE.parchemin, align: 'center' });
      const width = Math.ceil(titleText.width);
      const lineY = top + 10 * S + Math.ceil(titleText.height) + 4 * S;
      const bottom = lineY + (subtitle ? 24 * S : 10 * S);
      container.add(this.add.rectangle(0, top, this.scale.width, bottom - top, PALETTE.nuit, 0.72).setOrigin(0, 0));
      container.add(this.add.rectangle(0, top, this.scale.width, S, PALETTE.ambre, 0.8).setOrigin(0, 0));
      container.add(this.add.rectangle(0, bottom - S, this.scale.width, S, PALETTE.ambre, 0.8).setOrigin(0, 0));
      container.add(titleText);
      container.add(this.add.rectangle(Math.round(cx - width / 2 - 12 * S), lineY, width + 24 * S, S, PALETTE.ambre, 0.9).setOrigin(0, 0));
      if (subtitle) container.add(addText(this, cx, lineY + 6 * S, subtitle, { scale: S, shadow: false, color: PALETTE.cyanEclat, align: 'center' }));
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
    this.buildGold();
    this.buildGauge();
    this.buildPrompt();
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

  private buildGold(): void {
    for (const part of this.goldParts) part.destroy();
    this.goldParts = [];
    if (this.gold === null) return;
    const S = this.S;
    const label = addText(this, 0, 0, `${this.gold}`, { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH.hud + 1);
    const width = Math.ceil(label.width) + 66 * S;
    const x = this.scale.width - width - 8 * S;
    const panel = drawPanel(this, x, 8 * S, width, 32 * S, { scale: 2 * S, depth: DEPTH.hud }).setAlpha(0.9);
    // Pièce : disque ambre et reflet.
    const coin = this.add.circle(x + 16 * S, 24 * S, 7 * S, PALETTE.ambre).setDepth(DEPTH.hud + 1).setStrokeStyle(S, PALETTE.rougeCendre);
    const shine = this.add.rectangle(x + 13 * S, 20 * S, 3 * S, 4 * S, PALETTE.lumiereDoree).setOrigin(0, 0).setDepth(DEPTH.hud + 2);
    label.setPosition(x + 32 * S, 14 * S);
    const unit = addText(this, x + width - 8 * S, 18 * S, 'or', { font: 'small', scale: S + 1, color: PALETTE.metalClair, align: 'right' }).setDepth(DEPTH.hud + 1);
    this.goldParts = [panel, coin, shine, label, unit];
  }

  private buildGauge(): void {
    for (const part of this.gaugeParts) part.destroy();
    this.gaugeParts = [];
    const view = this.reputation;
    if (!view) return;
    const S = this.S;
    const expanded = this.gaugeExpandedUntil > 0;
    const width = 240 * S;
    const height = (expanded ? 62 : 44) * S;
    const x = 8 * S;
    // En bas à gauche, au-dessus de l'aide des touches : la bannière du lieu occupe le haut de l'écran.
    const y = this.scale.height - height - 44 * S;
    const panel = drawPanel(this, x, y, width, height, { scale: S, depth: DEPTH.hud }).setAlpha(expanded ? 0.95 : 0.78);
    const place = addText(this, x + 12 * S, y + 6 * S, view.place, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.hud + 1);
    const tier = addText(this, x + width - 12 * S, y + 6 * S, view.tierName, { scale: S, color: view.tierColor, align: 'right' }).setDepth(DEPTH.hud + 1);
    this.gaugeParts.push(panel, place, tier);

    const barX = x + 12 * S;
    const barY = y + 30 * S;
    const barW = width - 24 * S;
    const barH = 8 * S;
    const span = view.max - view.min;
    const at = (v: number): number => barX + Math.round(((v - view.min) / span) * barW);
    this.gaugeParts.push(this.add.rectangle(barX - S, barY - S, barW + 2 * S, barH + 2 * S, PALETTE.encre).setOrigin(0, 0).setDepth(DEPTH.hud + 1));
    for (const t of view.tiers) {
      const x0 = at(t.min);
      const x1 = at(t.max + 1);
      this.gaugeParts.push(this.add.rectangle(x0, barY, Math.max(S, x1 - x0 - S), barH, t.color, 0.38).setOrigin(0, 0).setDepth(DEPTH.hud + 2));
    }
    // Remplissage depuis le milieu de l'échelle (0) jusqu'à la valeur : à gauche = défiance, à droite = faveur.
    const zero = at(0);
    const here = at(view.value);
    this.gaugeParts.push(this.add.rectangle(Math.min(zero, here), barY, Math.max(S, Math.abs(here - zero)), barH, view.tierColor, 1).setOrigin(0, 0).setDepth(DEPTH.hud + 3));
    this.gaugeParts.push(this.add.rectangle(zero, barY - 2 * S, S, barH + 4 * S, PALETTE.parchemin, 0.8).setOrigin(0, 0).setDepth(DEPTH.hud + 4));
    this.gaugeParts.push(this.add.rectangle(here - S, barY - 3 * S, 3 * S, barH + 6 * S, 0xffffff, 1).setOrigin(0, 0).setDepth(DEPTH.hud + 5).setStrokeStyle(S, PALETTE.encre));
    if (expanded) {
      const sign = view.value > 0 ? '+' : view.value < 0 ? '-' : '';
      const detail = addText(this, x + 12 * S, y + 44 * S, `Réputation  ${sign}${Math.abs(view.value)}`, { font: 'small', scale: S + 1, color: PALETTE.metalClair }).setDepth(DEPTH.hud + 1);
      this.gaugeParts.push(detail);
    }
  }

  private buildPrompt(): void {
    for (const part of this.promptParts) part.destroy();
    this.promptParts = [];
    if (this.promptText === null) return;
    const S = this.S;
    const { width, height } = this.scale;
    const key = addText(this, 0, 0, 'E', { scale: S, color: PALETTE.jauneBle }).setDepth(DEPTH.hud + 2);
    const label = addText(this, 0, 0, this.promptText, { scale: S, color: PALETTE.parchemin }).setDepth(DEPTH.hud + 2);
    const total = Math.ceil(key.width) + Math.ceil(label.width) + 52 * S;
    const x = Math.round((width - total) / 2);
    const y = height - 92 * S;
    const panel = drawPanel(this, x, y, total, 32 * S, { scale: S, depth: DEPTH.hud + 1 }).setAlpha(0.92);
    const keyBox = this.add.rectangle(x + 10 * S, y + 6 * S, 22 * S, 20 * S, PALETTE.violetBrume, 0.9).setOrigin(0, 0).setDepth(DEPTH.hud + 1).setStrokeStyle(S, PALETTE.ambre);
    key.setPosition(Math.round(x + 21 * S - key.width / 2), y + 8 * S);
    label.setPosition(x + 40 * S, y + 8 * S);
    this.promptParts = [panel, keyBox, key, label];
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
    const qualityLabel = (): string => `Qualité : ${QUALITY_LABEL[handlers.quality()]}`;
    const items = [
      { label: 'Reprendre', onSelect: handlers.onResume },
      {
        label: qualityLabel(),
        onSelect: () => {
          handlers.onQuality(nextQuality(handlers.quality()));
          this.pauseMenu?.setItemLabel(1, qualityLabel());
        },
      },
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
