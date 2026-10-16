/**
 * Boot : charge les polices, valide les données, prépare les textures communes,
 * puis lance l'écran titre. Toute erreur ici est affichée clairement (écran
 * d'erreur HTML) au lieu d'un écran noir.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, assetUrl } from '../core/config';
import { showFatalError } from '../core/fatal';
import { GameDataError, loadGameData } from '../data';
import { paintTitleBackdrop } from '../render/backdrops/titleBackdrop';
import { PALETTE } from '../render/palette';
import { PIXEL_FONTS, buildPixelFont, loadPixelFontFaces, type FontKey } from '../render/pixelFont';
import { WORLD_MAP_KEY, WORLD_TILESET_KEY } from '../render/worldTextures';
import { SCENES } from './keys';

const BAR_WIDTH = 120;

export class BootScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENES.boot);
  }

  /** Carte et tileset du monde : petits fichiers, chargés avant l'écran titre pour que « Nouvelle partie » soit instantané. */
  preload(): void {
    this.load.tilemapTiledJSON(WORLD_MAP_KEY, assetUrl('assets/maps/world.json'));
    this.load.image(WORLD_TILESET_KEY, assetUrl('assets/tilesets/world_tiles.png'));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      showFatalError('Un fichier du jeu est introuvable.', [`${file.key} : ${file.url as string}`]);
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.nuit);
    this.bar = this.add.graphics();
    this.drawProgress(0);
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      await loadPixelFontFaces();
      this.drawProgress(0.4);

      loadGameData();
      this.drawProgress(0.6);

      for (const key of Object.keys(PIXEL_FONTS) as FontKey[]) buildPixelFont(this, key);
      this.drawProgress(0.8);

      paintTitleBackdrop(this);
      this.drawProgress(1);
    } catch (error) {
      if (error instanceof GameDataError) {
        showFatalError('Les données du jeu sont invalides.', error.issues);
      } else {
        showFatalError('Le jeu n’a pas pu démarrer.', [error instanceof Error ? error.message : String(error)]);
      }
      return;
    }

    this.scene.launch(SCENES.debug);
    this.time.delayedCall(120, () => this.scene.start(SCENES.title));
  }

  /** Barre de chargement dessinée sans police (les polices ne sont pas encore prêtes). */
  private drawProgress(ratio: number): void {
    const x = Math.round((GAME_WIDTH - BAR_WIDTH) / 2);
    const y = Math.round(GAME_HEIGHT / 2);
    const g = this.bar;
    g.clear();
    g.fillStyle(PALETTE.encre, 1).fillRect(x - 2, y - 2, BAR_WIDTH + 4, 7);
    g.fillStyle(PALETTE.metal, 1).fillRect(x - 1, y - 1, BAR_WIDTH + 2, 5);
    g.fillStyle(PALETTE.ombre, 1).fillRect(x, y, BAR_WIDTH, 3);
    g.fillStyle(PALETTE.orangeForge, 1).fillRect(x, y, Math.round(BAR_WIDTH * ratio), 3);
    g.fillStyle(PALETTE.braise, 1).fillRect(x, y, Math.round(BAR_WIDTH * ratio), 1);
  }
}
