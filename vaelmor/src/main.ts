/**
 * Point d'entrée du jeu : crée le jeu Phaser (canevas à la taille réelle de l'écran, pixel art
 * agrandi par le zoom des caméras) et enregistre les scènes.
 */
import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GAME_TITLE, GAME_VERSION } from './core/config';
import { showFatalError } from './core/fatal';
import { tickPlayClock } from './core/gameSave';
import * as cloud from './core/cloud';
import { bindDisplaySize, measureDisplay } from './render/displayScaler';
import { PALETTE, toCss } from './render/palette';
import { BattleCloseupScene } from './scenes/BattleCloseupScene';
import { BattleHudScene } from './scenes/BattleHudScene';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { DebugScene } from './scenes/DebugScene';
import { DialogueScene } from './scenes/DialogueScene';
import { MenuScene } from './scenes/MenuScene';
import { OptionsScene } from './scenes/OptionsScene';
import { IslandMapScene } from './scenes/IslandMapScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { SaveScene } from './scenes/SaveScene';
import { AccountScene } from './scenes/AccountScene';
import { EndingScene } from './scenes/EndingScene';
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
    scene: [BootScene, TitleScene, ClassSelectScene, WorldScene, WorldHudScene, DialogueScene, MenuScene, BattleScene, BattleHudScene, BattleCloseupScene, SaveScene, OptionsScene, IslandMapScene, AccountScene, EndingScene, DebugScene],
  });
  bindDisplaySize(game);
  // Temps de jeu de la partie (n°155) : compté à chaque image, hors titre et hors pause.
  game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => tickPlayClock(delta));
  // Compte en ligne (lot M9b) : les écritures d'emplacements partent aussi sur le serveur quand on est connecté.
  cloud.startCloudSync();
  // Outil de debug : `?debug` expose le jeu à la console (`window.vaelmor`) pour inspecter les scènes.
  if (new URLSearchParams(window.location.search).has('debug')) Object.assign(window, { vaelmor: game, vaelmorCloud: cloud });
}

try {
  start();
} catch (error) {
  showFatalError('Impossible de lancer le jeu : ce navigateur doit prendre en charge WebGL.', [
    error instanceof Error ? error.message : String(error),
  ]);
}
