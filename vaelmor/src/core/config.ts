/**
 * Constantes globales du moteur (GDD §12.2). Les valeurs de réglage du jeu
 * (vitesses, XP, prix…) vivent dans `data/balance.json`, pas ici.
 */

/**
 * Résolution logique FIXE du jeu (décision n°39) : 480×270 pixels, la même sur tous
 * les écrans. Le canevas est agrandi par le plus grand facteur ENTIER qui tient dans
 * la fenêtre, avec des bandes noires autour : jamais étiré, jamais flou.
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Taille d'une tuile en pixels. */
export const TILE_SIZE = 16;

export const GAME_TITLE = 'Vaelmor';
export const GAME_SUBTITLE = 'Les Marées de Cendre';
export const GAME_VERSION: string = __GAME_VERSION__;

/** Jalon de développement affiché sur l'écran titre et dans l'outil de debug. */
export const MILESTONE = 'M1';

/**
 * URL d'un asset rangé sous `vaelmor/` (ex. `assets/fonts/tiny5.woff2`,
 * `music/mus_title.mp3`). Fonctionne en développement et une fois servi depuis `play/`.
 */
export function assetUrl(path: string): string {
  return `${__ASSET_BASE__}${path.replace(/^\/+/, '')}`;
}
