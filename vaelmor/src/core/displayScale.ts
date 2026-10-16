/**
 * Mise à l'échelle entière « pixel parfait » (GDD §12.2).
 *
 * Le facteur entier est calculé en pixels physiques de l'écran, pas en pixels
 * CSS : sur un écran à 125 % (devicePixelRatio 1,25), un zoom CSS ×3 donnerait
 * 3,75 pixels physiques par pixel de jeu, donc des pixels irréguliers. On prend
 * le plus grand entier k tel que la scène (480×270 × k pixels physiques) tienne
 * dans la fenêtre, puis on convertit en zoom CSS : k / devicePixelRatio.
 */
export interface DisplayScale {
  /** Pixels physiques par pixel de jeu (entier ≥ 1). */
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
): DisplayScale {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const physicalW = Math.floor(viewportCssWidth * dpr);
  const physicalH = Math.floor(viewportCssHeight * dpr);
  const k = Math.max(1, Math.min(Math.floor(physicalW / gameWidth), Math.floor(physicalH / gameHeight)));
  const cssZoom = k / dpr;
  return {
    pixelsPerGamePixel: k,
    cssZoom,
    cssWidth: gameWidth * cssZoom,
    cssHeight: gameHeight * cssZoom,
  };
}
