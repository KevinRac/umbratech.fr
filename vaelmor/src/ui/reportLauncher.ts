/**
 * Touche F10 (lot H de M10, décision n°273) : ouvre l'écran « Signaler un
 * problème » depuis n'importe quelle scène, y compris l'écran titre.
 *
 * Ordre des opérations : capture du jeu (prise sur la prochaine image rendue,
 * donc avant toute pause), puis pause du jeu, puis l'écran HTML. À la
 * fermeture, le jeu reprend sans saut de temps (même mécanique que l'onglet
 * qui se cache) et les touches que Phaser croit enfoncées sont relâchées : une
 * direction tenue au moment d'ouvrir l'écran ne fait pas marcher le héros
 * ensuite.
 */
import type Phaser from 'phaser';
import { captureScreen, logEvent } from '../core/testkit';
import { isReportOpen, openReportOverlay } from './reportOverlay';

let opening = false;

export async function openReport(game: Phaser.Game): Promise<void> {
  if (opening || isReportOpen()) return;
  opening = true;
  try {
    const capture = await captureScreen(game);
    logEvent('session', 'écran « Signaler un problème » ouvert');
    game.pause();
    game.loop.pause();
    openReportOverlay(game, capture, () => {
      game.loop.resume();
      game.resume();
      for (const scene of game.scene.getScenes(true)) scene.input.keyboard?.resetKeys();
      // Le champ de texte avait le focus : on le rend à la page, le jeu écoute la fenêtre.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.focus();
      logEvent('session', 'écran « Signaler un problème » fermé');
    });
  } finally {
    opening = false;
  }
}

/** À appeler une fois depuis `main.ts`. */
export function installReportKey(game: Phaser.Game): void {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'F10' || event.repeat) return;
    event.preventDefault();
    void openReport(game);
  });
}
