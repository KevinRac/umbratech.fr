/**
 * Mise à l'échelle entière « pixel parfait » (GDD §12.2).
 *
 * Le facteur entier est calculé en pixels physiques de l'écran, pas en pixels
 * CSS : sur un écran à 125 % (devicePixelRatio 1,25), un zoom CSS ×3 donnerait
 * 3,75 pixels physiques par pixel de jeu, donc des pixels irréguliers. On prend
 * le plus grand entier k tel que la scène (canevas × k pixels physiques) tienne
 * dans la fenêtre, puis on convertit en zoom CSS : k / devicePixelRatio.
 */
export interface DisplayScale {
  /** Pixels physiques par pixel de jeu (entier, ou fractionnaire en mode « remplir »). */
  readonly pixelsPerGamePixel: number;
  /** Facteur à appliquer en CSS (peut être fractionnaire). */
  readonly cssZoom: number;
  /** Taille affichée en pixels CSS. */
  readonly cssWidth: number;
  readonly cssHeight: number;
}

export function computeDisplayScale(
  viewportCssWidth: number,
  viewportCssHeight: number,
  devicePixelRatio: number,
  gameWidth: number,
  gameHeight: number,
  /** Vrai : le canevas remplit la fenêtre (échelle fractionnaire, sauf si elle est proche d'un entier). */
  fit = false,
): DisplayScale {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const physicalW = Math.floor(viewportCssWidth * dpr);
  const physicalH = Math.floor(viewportCssHeight * dpr);
  const ratio = Math.min(physicalW / gameWidth, physicalH / gameHeight);
  const nearest = Math.round(ratio);
  const k = fit
    ? Math.max(0.5, Math.abs(ratio - nearest) < 0.06 && nearest >= 1 ? nearest : Math.floor(ratio * 100) / 100)
    : Math.max(1, Math.floor(ratio));
  const cssZoom = k / dpr;
  return {
    pixelsPerGamePixel: k,
    cssZoom,
    cssWidth: gameWidth * cssZoom,
    cssHeight: gameHeight * cssZoom,
  };
}
