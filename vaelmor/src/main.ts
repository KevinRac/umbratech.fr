/**
 * Point d'entrée du jeu : crée le jeu Phaser (canevas à la taille réelle de l'écran, pixel art
 * agrandi par le zoom des caméras) et enregistre les scènes.
 */
import Phaser from 'phaser';
import { GAME_TITLE, GAME_VERSION } from './core/config';
import { showFatalError } from './core/fatal';
import { bindDisplaySize, measureDisplay } from './render/displayScaler';
import { PALETTE, toCss } from './render/palette';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldHudScene } from './scenes/WorldHudScene';
import { WorldScene } from './scenes/WorldScene';

function start(): void {
  const initial = measureDisplay();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: initial.width,
    height: initial.height,
    backgroundColor: toCss(PALETTE.nuit),
    title: GAME_TITLE,
    version: GAME_VERSION,
    banner: false,
    pixelArt: true,
    disableContextMenu: true,
    autoFocus: true,
    input: { keyboard: true, mouse: true, touch: false, gamepad: false },
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / initial.dpr,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, TitleScene, WorldScene, WorldHudScene, DebugScene],
  });
  bindDisplaySize(game);
}

try {
  start();
} catch (error) {
  showFatalError('Impossible de lancer le jeu : ce navigateur doit prendre en charge WebGL.', [
    error instanceof Error ? error.message : String(error),
  ]);
}
