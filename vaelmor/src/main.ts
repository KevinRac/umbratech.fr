/**
 * Point d'entrée du jeu : crée le jeu Phaser (canevas à la taille réelle de l'écran, pixel art
 * agrandi par le zoom des caméras) et enregistre les scènes.
 */
import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GAME_TITLE, GAME_VERSION } from './core/config';
import { showFatalError } from './core/fatal';
import { bindDisplaySize, measureDisplay } from './render/displayScaler';
import { PALETTE, toCss } from './render/palette';
import { BattleHudScene } from './scenes/BattleHudScene';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { DialogueScene } from './scenes/DialogueScene';
import { MenuScene } from './scenes/MenuScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldHudScene } from './scenes/WorldHudScene';
import { WorldScene } from './scenes/WorldScene';

function start(): void {
  const initial = measureDisplay();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
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
    scene: [BootScene, TitleScene, WorldScene, WorldHudScene, DialogueScene, MenuScene, BattleScene, BattleHudScene, DebugScene],
  });
  bindDisplaySize(game);
  // Outil de debug : `?debug` expose le jeu à la console (`window.vaelmor`) pour inspecter les scènes.
  if (new URLSearchParams(window.location.search).has('debug')) (window as unknown as { vaelmor: Phaser.Game }).vaelmor = game;
}

try {
  start();
} catch (error) {
  showFatalError('Impossible de lancer le jeu : ce navigateur doit prendre en charge WebGL.', [
    error instanceof Error ? error.message : String(error),
  ]);
}
