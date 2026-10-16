/**
 * Écran titre (GDD §13). Décor animé : mer scintillante, brumes et nuages en
 * parallaxe, lanterne vacillante, braises et cendres, fenêtres de la Citadelle
 * qui palpitent. Menu : Nouvelle partie, Continuer (si une sauvegarde existe),
 * Options. « Nouvelle partie » mène à l'île (M1) ; les autres entrées annoncent leur jalon.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_SUBTITLE, GAME_VERSION, GAME_WIDTH, MILESTONE } from '../core/config';
import { ActionInput } from '../core/input';
import { hasKey } from '../core/storage';
import { GAME_SAVE_KEYS } from '../logic/save/keys';
import {
  CITADEL_WINDOWS,
  CLIFF,
  HERO,
  HORIZON_Y,
  LANTERN,
  MOON,
  SEA_FRAMES,
  TEX,
} from '../render/backdrops/titleBackdrop';
import { setLogicalSize } from '../render/displayScaler';
import { paintLogo } from '../render/logo';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { addText } from '../ui/text';
import { Toasts } from '../ui/Toasts';
import { VerticalMenu } from '../ui/VerticalMenu';
import { SCENES } from './keys';

const DEPTH = {
  sky: 0,
  clouds: 1,
  sea: 2,
  windows: 3,
  mistFar: 4,
  cliff: 5,
  glow: 6,
  hero: 7,
  particles: 8,
  mistNear: 9,
  ui: 20,
} as const;

const MENU = { x: 322, y: 186, width: 136 } as const;

export class TitleScene extends Phaser.Scene {
  private actions!: ActionInput;
  private menu!: VerticalMenu;
  private toasts!: Toasts;
  private sea!: Phaser.GameObjects.Image;
  private seaFrame = 0;
  private mistFar!: Phaser.GameObjects.TileSprite;
  private mistNear!: Phaser.GameObjects.TileSprite;
  private clouds!: Phaser.GameObjects.TileSprite;
  private starting = false;

  constructor() {
    super(SCENES.title);
  }

  create(): void {
    setLogicalSize(this.game, GAME_WIDTH, GAME_HEIGHT);
    this.actions = new ActionInput(this);
    this.toasts = new Toasts(this);
    this.buildBackdrop();
    this.buildAmbience();
    this.buildTitle();
    this.buildMenu();
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.clouds.tilePositionX += 2.2 * dt;
    this.mistFar.tilePositionX += 4 * dt;
    this.mistNear.tilePositionX += 9 * dt;
    this.menu.update();
  }

  /* ---------- Décor ---------- */

  private buildBackdrop(): void {
    this.add.image(0, 0, TEX.sky).setOrigin(0, 0).setDepth(DEPTH.sky);

    this.clouds = this.add
      .tileSprite(0, MOON.y + 4, GAME_WIDTH, 24, TEX.clouds)
      .setOrigin(0, 0)
      .setTint(PALETTE.violetPale)
      .setAlpha(0.35)
      .setDepth(DEPTH.clouds);

    this.sea = this.add.image(0, HORIZON_Y, TEX.sea(0)).setOrigin(0, 0).setDepth(DEPTH.sea);
    this.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => {
        this.seaFrame = (this.seaFrame + 1) % SEA_FRAMES;
        this.sea.setTexture(TEX.sea(this.seaFrame));
      },
    });

    // Fenêtres de la Citadelle : lueurs cyan de la Brume qui palpitent.
    CITADEL_WINDOWS.forEach(([x, y], i) => {
      const glint = this.add.image(x, y, TEX.px1).setOrigin(0, 0).setTint(PALETTE.cyanEclat).setDepth(DEPTH.windows).setAlpha(0);
      this.tweens.add({
        targets: glint,
        alpha: { from: 0, to: 1 },
        duration: 900 + i * 230,
        delay: i * 520,
        yoyo: true,
        repeat: -1,
        hold: 400 + i * 150,
        repeatDelay: 1800 + i * 400,
      });
    });

    // Étoiles scintillantes (en plus des étoiles fixes peintes dans le ciel).
    const stars: readonly (readonly [number, number])[] = [
      [36, 22], [92, 61], [141, 14], [208, 48], [262, 19], [331, 33], [452, 88], [468, 18], [25, 104], [187, 92], [243, 70], [118, 120],
    ];
    stars.forEach(([x, y], i) => {
      const star = this.add.image(x, y, TEX.px1).setOrigin(0, 0).setTint(PALETTE.ecume).setDepth(DEPTH.sky);
      this.tweens.add({ targets: star, alpha: { from: 1, to: 0.15 }, duration: 700 + (i % 4) * 260, delay: i * 310, yoyo: true, repeat: -1 });
    });

    this.mistFar = this.add
      .tileSprite(0, HORIZON_Y - 22, GAME_WIDTH, 40, TEX.mist)
      .setOrigin(0, 0)
      .setTint(PALETTE.violetPale)
      .setAlpha(0.32)
      .setDepth(DEPTH.mistFar);

    this.add.image(CLIFF.x, CLIFF.y, TEX.cliff).setOrigin(0, 0).setDepth(DEPTH.cliff);

    // Lumière de la lanterne : halo additif qui vacille.
    const halo = this.add
      .image(LANTERN.x, LANTERN.y - 1, TEX.halo)
      .setTint(PALETTE.orangeForge)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.9)
      .setDepth(DEPTH.glow);
    this.tweens.add({ targets: halo, alpha: { from: 0.65, to: 1 }, duration: 140, yoyo: true, repeat: -1, repeatDelay: 90, ease: 'Stepped' });
    this.tweens.add({ targets: halo, scale: { from: 1, to: 1.08 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Le héros contemple la Citadelle ; sa cape bat au vent.
    const hero = this.add.image(HERO.x, HERO.y, TEX.hero(0)).setOrigin(0, 0).setDepth(DEPTH.hero);
    let heroFrame = 0;
    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        heroFrame = 1 - heroFrame;
        hero.setTexture(TEX.hero(heroFrame));
      },
    });

    this.mistNear = this.add
      .tileSprite(0, GAME_HEIGHT - 46, GAME_WIDTH, 40, TEX.mist)
      .setOrigin(0, 0)
      .setTint(PALETTE.bleuGris)
      .setAlpha(0.22)
      .setDepth(DEPTH.mistNear);
    this.mistNear.tilePositionX = 97;
  }

  private buildAmbience(): void {
    // Braises qui montent de la lanterne.
    this.add
      .particles(LANTERN.x, LANTERN.y - 3, TEX.px1, {
        speedY: { min: -18, max: -8 },
        speedX: { min: -5, max: 5 },
        accelerationX: { min: -3, max: 6 },
        lifespan: { min: 1800, max: 3600 },
        alpha: { start: 1, end: 0 },
        tint: [PALETTE.braise, PALETTE.orangeForge, 0xfff1c9],
        frequency: 260,
      })
      .setDepth(DEPTH.particles);

    // Cendres portées par le vent du large.
    this.add
      .particles(0, -4, TEX.px1, {
        x: { min: 0, max: GAME_WIDTH + 120 },
        speedX: { min: -16, max: -7 },
        speedY: { min: 5, max: 11 },
        lifespan: 26000,
        alpha: { start: 0.75, end: 0.15 },
        tint: [PALETTE.pierre, PALETTE.violetPale],
        frequency: 380,
      })
      .setDepth(DEPTH.particles);

    // Léger assombrissement des bords de l'écran.
    this.cameras.main.filters.external.addVignette(0.5, 0.5, 0.85, 0.35);
  }

  /** Fondu au noir puis arrivée sur l'île, au point de départ. */
  private startNewGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.menu.setLocked(true);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.world, { newGame: true }));
  }

  /* ---------- Titre et menu ---------- */

  private buildTitle(): void {
    const logo = this.add.image(0, 12, paintLogo(this)).setOrigin(0, 0).setScale(3).setDepth(DEPTH.ui);
    logo.x = Math.round((GAME_WIDTH - logo.displayWidth) / 2);
    addText(this, GAME_WIDTH / 2, 64, GAME_SUBTITLE, { color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.ui);

    addText(this, 6, GAME_HEIGHT - 11, `v${GAME_VERSION} · prototype ${MILESTONE}`, { font: 'small', color: PALETTE.desactive, shadow: false }).setDepth(DEPTH.ui);
  }

  private buildMenu(): void {
    const hasSave = GAME_SAVE_KEYS.some((key) => hasKey(key));
    const lineHeight = 17;
    const items = [
      { label: 'Nouvelle partie', onSelect: () => this.startNewGame() },
      { label: 'Continuer', enabled: hasSave, onSelect: () => this.toasts.push('Le chargement arrive au jalon M9.') },
      { label: 'Options', onSelect: () => this.toasts.push('Les options arrivent au jalon M10.') },
    ];
    const panelHeight = items.length * lineHeight + 22;
    drawPanel(this, MENU.x, MENU.y, MENU.width, panelHeight, { depth: DEPTH.ui });
    this.menu = new VerticalMenu(this, MENU.x + 5, MENU.y + 6, items, this.actions, { width: MENU.width - 10, lineHeight, depth: DEPTH.ui });
    addText(this, MENU.x + MENU.width / 2, MENU.y + panelHeight - 12, 'Flèches : choisir  ·  Entrée : valider', {
      font: 'small',
      color: PALETTE.metalClair,
      shadow: false,
      align: 'center',
    }).setDepth(DEPTH.ui);
  }
}
