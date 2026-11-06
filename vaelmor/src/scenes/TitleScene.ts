/**
 * Écran titre (GDD §13). Décor animé : mer scintillante, brumes et nuages en
 * parallaxe, lanterne vacillante, braises et cendres, fenêtres de la Citadelle
 * qui palpitent. Menu (jalon M9, n°162) : Continuer (la sauvegarde la plus
 * récente, en tête s'il y en a une), Nouvelle partie, Charger, Combat d'essai,
 * Options.
 */
import Phaser from 'phaser';
import { flashCamera } from '../render/cameraFx';
import { setAmbience } from '../audio/ambience';
import { playMusic } from '../audio/music';
import { GAME_SUBTITLE, GAME_VERSION, MILESTONE, TITLE_HEIGHT as GAME_HEIGHT, TITLE_WIDTH as GAME_WIDTH } from '../core/config';
import { ActionInput } from '../core/input';
import { loadGameData } from '../data';
import { loadIntoSession, setPlayClock } from '../core/gameSave';
import { anySave, latestSlot, readSlot } from '../core/saves';
import { cloudStatus, refreshAccount, syncAll, type SyncConflict } from '../core/cloud';
import { SAVE_KEYS } from '../logic/save/keys';
import type { GameMode } from '../logic/game/progress';
import type { SaveEnvelope } from '../logic/save/schema';
import { ConfirmBox } from '../ui/ConfirmBox';
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
import { fitDesignArea } from '../render/viewport';
import { paintLogo } from '../render/logo';
import { PALETTE } from '../render/palette';
import { drawPanel } from '../ui/panel';
import { addText } from '../ui/text';
import { Toasts } from '../ui/Toasts';
import { VerticalMenu } from '../ui/VerticalMenu';
import { openReport } from '../ui/reportLauncher';
import { SCENES } from './keys';
import { slotOneLiner } from './SaveScene';

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

const MENU = { x: 322, y: 172, width: 136 } as const;

export class TitleScene extends Phaser.Scene {
  private actions!: ActionInput;
  private menu: VerticalMenu | null = null;
  private menuParts: Phaser.GameObjects.GameObject[] = [];
  private toasts!: Toasts;
  private sea!: Phaser.GameObjects.Image;
  private seaFrame = 0;
  private mistFar!: Phaser.GameObjects.TileSprite;
  private mistNear!: Phaser.GameObjects.TileSprite;
  private clouds!: Phaser.GameObjects.TileSprite;
  private starting = false;
  private confirm!: ConfirmBox;

  constructor() {
    super(SCENES.title);
  }

  create(): void {
    setAmbience(null, 800);
    playMusic({ kind: 'title' });
    // La scène est réutilisée à chaque retour au titre : on repart d'un état propre.
    this.starting = false;
    this.menu = null;
    this.menuParts = [];
    fitDesignArea(this, GAME_WIDTH, GAME_HEIGHT);
    const refit = (): void => void fitDesignArea(this, GAME_WIDTH, GAME_HEIGHT);
    this.scale.on(Phaser.Scale.Events.RESIZE, refit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, refit));
    this.actions = new ActionInput(this);
    this.toasts = new Toasts(this, { width: GAME_WIDTH });
    this.confirm = new ConfirmBox(this, this.actions, { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 20, width: 300, scale: 1, depth: DEPTH.ui + 10, lineHeight: 16 });
    // Le temps de jeu ne court pas sur l'écran titre (n°155).
    setPlayClock(false);
    this.buildBackdrop();
    this.buildAmbience();
    this.buildTitle();
    this.buildMenu();
    this.cameras.main.fadeIn(700, 0, 0, 0);
    void this.syncOnline();
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.clouds.tilePositionX += 2.2 * dt;
    this.mistFar.tilePositionX += 4 * dt;
    this.mistNear.tilePositionX += 9 * dt;
    if (this.confirm.active) {
      this.confirm.update();
      return;
    }
    this.menu?.update();
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

  /**
   * Nouvelle partie. Une sauvegarde automatique existante sera écrasée par la
   * nouvelle partie (n°159) : confirmation en deux étapes (n°163). Ensuite le
   * choix de la classe du héros (n°133), puis de la règle de mort (n°166).
   */
  private startNewGame(): void {
    if (this.starting) return;
    const auto = readSlot(SAVE_KEYS.auto, loadGameData());
    if (auto.state === 'empty') {
      this.pickClass();
      return;
    }
    this.menu?.setLocked(true);
    const what = auto.state === 'broken' ? 'une sauvegarde illisible' : slotOneLiner(auto.save);
    this.confirm.ask(
      [
        { title: 'Écraser la sauvegarde automatique ?', lines: [`Elle contient : ${what}.`, 'Les emplacements 1 à 3 ne sont pas touchés.'], yes: 'Continuer', no: 'Annuler' },
        { title: 'Confirmer', lines: ['La nouvelle partie remplacera la sauvegarde automatique dès son arrivée sur l’île.'], yes: 'Oui, nouvelle partie', no: 'Non' },
      ],
      () => this.pickClass(),
      () => this.menu?.setLocked(false),
    );
  }

  private pickClass(): void {
    this.starting = true;
    this.menu?.setLocked(true);
    this.scene.launch(SCENES.classSelect, {
      onCancel: () => {
        this.starting = false;
        this.menu?.setLocked(false);
        this.actions.consume('cancel');
      },
      onChoose: (heroClass: string, mode: GameMode) => {
        const pick = this.scene.get(SCENES.classSelect);
        pick.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.stop(SCENES.classSelect);
          this.scene.start(SCENES.world, { newGame: true, heroClass, mode });
        });
      },
    });
  }

  /**
   * Compte en ligne (lot M9b, n°172) : au titre, les emplacements sont
   * synchronisés ; une sauvegarde reprise en ligne reconstruit le menu, un
   * conflit ouvre l'écran du compte pour que le joueur choisisse.
   */
  private async syncOnline(): Promise<void> {
    if (cloudStatus() === 'unknown') await refreshAccount();
    if (cloudStatus() !== 'signedIn') return;
    const report = await syncAll();
    if (!this.scene.isActive() || this.starting) return;
    if (report.pulled > 0) {
      this.buildMenu();
      this.toasts.push(`Sauvegardes en ligne : ${report.pulled} reprise(s).`);
    }
    if (report.conflicts.length > 0 && !this.menuBusy()) this.openAccount(report.conflicts);
  }

  /** Un écran est-il déjà ouvert par-dessus le titre ? */
  private menuBusy(): boolean {
    return this.confirm.active || this.scene.isActive(SCENES.saves) || this.scene.isActive(SCENES.classSelect) || this.scene.isActive(SCENES.account);
  }

  private openAccount(conflicts?: readonly SyncConflict[]): void {
    if (this.starting) return;
    this.menu?.setLocked(true);
    this.scene.launch(SCENES.account, {
      ...(conflicts ? { conflicts } : {}),
      onClose: () => {
        this.menu?.setLocked(false);
        this.actions.consume('cancel');
        this.buildMenu();
      },
    });
  }

  /** Continuer : la plus récente des sauvegardes lisibles (n°162), après la synchronisation en cours s'il y en a une. */
  private async continueGame(): Promise<void> {
    if (this.starting) return;
    if (cloudStatus() === 'signedIn') await syncAll();
    if (this.starting) return;
    const latest = latestSlot(loadGameData());
    if (!latest) {
      this.toasts.push('Aucune sauvegarde lisible : ouvre « Charger » pour voir les emplacements.');
      return;
    }
    if (latest.message) this.toasts.push(latest.message);
    this.enterSavedGame(latest.save);
  }

  private openLoad(): void {
    if (this.starting) return;
    this.menu?.setLocked(true);
    this.scene.launch(SCENES.saves, {
      mode: 'title',
      heading: 'CHARGER UNE PARTIE',
      subtitle: 'La sauvegarde automatique et les trois emplacements.',
      onLoad: (save: SaveEnvelope) => this.enterSavedGame(save),
      onClose: () => {
        this.menu?.setLocked(false);
        this.actions.consume('cancel');
        this.buildMenu();
      },
    });
  }

  /** Remplace la partie en mémoire par la sauvegarde et rejoint l'île. */
  private enterSavedGame(save: SaveEnvelope): void {
    this.starting = true;
    this.menu?.setLocked(true);
    loadIntoSession(save);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.world, { loaded: true }));
  }

  /* ---------- Titre et menu ---------- */

  private buildTitle(): void {
    const logo = this.add.image(0, 12, paintLogo(this)).setOrigin(0, 0).setScale(3).setDepth(DEPTH.ui);
    logo.x = Math.round((GAME_WIDTH - logo.displayWidth) / 2);
    addText(this, GAME_WIDTH / 2, 64, GAME_SUBTITLE, { color: PALETTE.cyanEclat, align: 'center' }).setDepth(DEPTH.ui);

    addText(this, 6, GAME_HEIGHT - 11, `v${GAME_VERSION} · prototype ${MILESTONE}`, { font: 'small', color: PALETTE.desactive, shadow: false }).setDepth(DEPTH.ui);
    // Kit de test (lot H, n°273) : F10 est disponible partout.
    // Cliquable aussi : certains navigateurs (Opera GX) gardent la touche F10.
    const report = addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 11, 'Signaler un problème (F10)', { font: 'small', color: PALETTE.desactive, shadow: false, align: 'center' }).setDepth(DEPTH.ui);
    report.setInteractive({ useHandCursor: true }).on('pointerdown', () => void openReport(this.game));
  }

  private buildMenu(): void {
    const hasSave = anySave();
    this.showMenu([
      ...(hasSave ? [{ label: 'Continuer', onSelect: () => void this.continueGame() }] : []),
      { label: 'Nouvelle partie', onSelect: () => this.startNewGame() },
      { label: 'Charger', enabled: hasSave, onSelect: () => this.openLoad() },
      { label: 'Compte', onSelect: () => this.openAccount() },
      // Outil de développement : caché aux joueurs (n°235), toujours là avec `?debug`.
      ...(new URLSearchParams(window.location.search).has('debug') ? [{ label: 'Combat d’essai', onSelect: () => this.showBattleMenu() }] : []),
      { label: 'Options', onSelect: () => this.openOptions() },
    ]);
  }

  /** Écran Options (n°232), par-dessus le titre. */
  private openOptions(): void {
    if (this.starting) return;
    this.menu?.setLocked(true);
    this.scene.launch(SCENES.options, {
      onClose: () => {
        this.menu?.setLocked(false);
        this.actions.consume('cancel');
      },
    });
  }

  /**
   * Combats d'essai du jalon M4 : en attendant les ennemis du monde ouvert
   * (M3), on lance une rencontre directement depuis le titre.
   */
  private showBattleMenu(): void {
    // Jalon M7 : 35 rencontres ne tiennent plus à l'écran ; le titre ne propose que les boss, les cartes fixes (arène) et deux rencontres ordinaires.
    const ordinary = new Set(['embuscade_du_gue', 'brigands_foret_racine']);
    const encounters = loadGameData().encounters.encounters.filter((e) => e.objective.type === 'boss' || e.map !== undefined || ordinary.has(e.id));
    this.showMenu([
      ...encounters.map((encounter) => ({ label: encounter.name, onSelect: () => this.startBattle(encounter.id) })),
      { label: 'Retour', onSelect: () => this.buildMenu() },
    ]);
  }

  private startBattle(encounterId: string): void {
    if (this.starting) return;
    this.starting = true;
    this.menu?.setLocked(true);
    flashCamera(this.cameras.main, 150, 255, 255, 255);
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.battle, { encounterId, returnTo: 'title' }));
  }

  /** (Re)construit le cadre et le menu du titre, ancrés en bas du cadre. */
  private showMenu(items: { label: string; enabled?: boolean; onSelect: () => void }[]): void {
    this.menu?.destroy();
    for (const part of this.menuParts) part.destroy();
    const lineHeight = 17;
    const panelHeight = items.length * lineHeight + 22;
    const y = MENU.y + (4 - items.length) * lineHeight;
    const panel = drawPanel(this, MENU.x, y, MENU.width, panelHeight, { depth: DEPTH.ui });
    this.menu = new VerticalMenu(this, MENU.x + 5, y + 6, items, this.actions, { width: MENU.width - 10, lineHeight, depth: DEPTH.ui });
    const hint = addText(this, MENU.x + MENU.width / 2, y + panelHeight - 12, 'Flèches : choisir  ·  Entrée : valider', {
      font: 'small',
      color: PALETTE.metalClair,
      shadow: false,
      align: 'center',
    }).setDepth(DEPTH.ui);
    this.menuParts = [panel, hint];
  }
}
