/**
 * Fait suivre au canevas la taille réelle de la fenêtre, en pixels physiques
 * (devicePixelRatio compris) : le canevas n'est jamais étiré, donc jamais flou
 * ni pixellisé (décision n°38). Recalculé au redimensionnement et au changement d'écran.
 */
import type Phaser from 'phaser';

export interface DisplaySize {
  /** Taille du canevas en pixels physiques. */
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export function measureDisplay(): DisplaySize {
  const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  return { width: Math.max(320, Math.floor(window.innerWidth * dpr)), height: Math.max(180, Math.floor(window.innerHeight * dpr)), dpr };
}

let current: DisplaySize = { width: 0, height: 0, dpr: 1 };

/** Taille actuelle (pour l'outil de debug). */
export function getDisplaySize(): DisplaySize {
  return current;
}

/** Lie la taille du canevas à la fenêtre ; renvoie une fonction de nettoyage. */
export function bindDisplaySize(game: Phaser.Game): () => void {
  const apply = (): void => {
    const next = measureDisplay();
    current = next;
    game.scale.setZoom(1 / next.dpr);
    if (game.scale.width !== next.width || game.scale.height !== next.height) game.scale.setGameSize(next.width, next.height);
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
