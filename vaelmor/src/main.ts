/**
 * Point d'entrée du jeu : crée le jeu Phaser sur un canevas fixe de 960×540 (le pixel art est agrandi par le zoom des
 * caméras), applique la mise à l'échelle et enregistre les scènes.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH } from './core/config';
import { showFatalError } from './core/fatal';
import { bindIntegerScaling, measureDisplayScale } from './render/displayScaler';
import { PALETTE, toCss } from './render/palette';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldHudScene } from './scenes/WorldHudScene';
import { WorldScene } from './scenes/WorldScene';

function start(): void {
  const initial = measureDisplayScale();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
      zoom: initial.cssZoom,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, TitleScene, WorldScene, WorldHudScene, DebugScene],
  });
  bindIntegerScaling(game);
}

try {
  start();
} catch (error) {
  showFatalError('Impossible de lancer le jeu : ce navigateur doit prendre en charge WebGL.', [
    error instanceof Error ? error.message : String(error),
  ]);
}
