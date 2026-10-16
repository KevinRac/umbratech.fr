/**
 * Applique la mise à l'échelle (entière si possible) au canvas Phaser et la recalcule quand
 * la fenêtre change de taille ou d'écran (changement de devicePixelRatio).
 */
import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config';
import { computeDisplayScale, type DisplayScale } from '../core/displayScale';

let current: DisplayScale = computeDisplayScale(GAME_WIDTH, GAME_HEIGHT, 1, GAME_WIDTH, GAME_HEIGHT);

export function measureDisplayScale(): DisplayScale {
  return computeDisplayScale(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, GAME_WIDTH, GAME_HEIGHT, true);
}

/** Échelle actuellement appliquée (pour l'outil de debug). */
export function getDisplayScale(): DisplayScale {
  return current;
}

/** Lie l'échelle entière au jeu ; renvoie une fonction de nettoyage. */
export function bindIntegerScaling(game: Phaser.Game): () => void {
  const apply = (): void => {
    const next = measureDisplayScale();
    if (next.cssZoom !== current.cssZoom || game.scale.zoom !== next.cssZoom) {
      game.scale.setZoom(next.cssZoom);
    }
    // Pixels francs quand l'échelle est entière, lissage léger sinon (évite des pixels de tailles inégales).
    game.canvas.style.imageRendering = Number.isInteger(next.pixelsPerGamePixel) ? 'pixelated' : 'auto';
    current = next;
  };

  let dprQuery: MediaQueryList | null = null;
  const watchDpr = (): void => {
    dprQuery?.removeEventListener('change', onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener('change', onDprChange);
  };
  function onDprChange(): void {
    apply();
    watchDpr();
  }

  window.addEventListener('resize', apply);
  watchDpr();
  apply();

  return () => {
    window.removeEventListener('resize', apply);
    dprQuery?.removeEventListener('change', onDprChange);
  };
}
