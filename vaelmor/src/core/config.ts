/**
 * Constantes globales du moteur (GDD §12.2). Les valeurs de réglage du jeu
 * (vitesses, XP, prix…) vivent dans `data/balance.json`, pas ici.
 */

/** Résolution logique (décision n°4). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Taille d'une tuile en pixels. */
export const TILE_SIZE = 16;

export const GAME_TITLE = 'Vaelmor';
export const GAME_SUBTITLE = 'Les Marées de Cendre';
export const GAME_VERSION: string = __GAME_VERSION__;

/** Jalon de développement affiché sur l'écran titre et dans l'outil de debug. */
export const MILESTONE = 'M0';

/**
 * URL d'un asset rangé sous `vaelmor/` (ex. `assets/fonts/tiny5.woff2`,
 * `music/mus_title.mp3`). Fonctionne en développement et une fois servi depuis `play/`.
 */
export function assetUrl(path: string): string {
  return `${__ASSET_BASE__}${path.replace(/^\/+/, '')}`;
}
