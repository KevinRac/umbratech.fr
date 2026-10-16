/**
 * Affiche le canevas à TAILLE FIXE (960×540 pixels physiques), sans agrandissement :
 * une fenêtre plus grande montre le même jeu entouré de noir, une fenêtre plus petite
 * le réduit pour qu'il tienne (décision n°40). Le devicePixelRatio est compensé pour
 * que 1 pixel de jeu = 1 pixel physique de l'écran.
 */
import type Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/config';

export interface DisplayInfo {
  /** Zoom CSS à appliquer au canevas. */
  readonly cssZoom: number;
  readonly dpr: number;
}

export function measureDisplay(): DisplayInfo {
  const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const cssZoom = Math.min(1 / dpr, window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
  return { cssZoom, dpr };
}

let current: DisplayInfo = { cssZoom: 1, dpr: 1 };

/** Zoom actuellement appliqué (pour l'outil de debug). */
export function getDisplayInfo(): DisplayInfo {
  return current;
}

/** Lie le zoom CSS du canevas à la fenêtre ; renvoie une fonction de nettoyage. */
export function bindDisplaySize(game: Phaser.Game): () => void {
  const apply = (): void => {
    current = measureDisplay();
    game.scale.setZoom(current.cssZoom);
    game.canvas.style.imageRendering = 'pixelated';
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
