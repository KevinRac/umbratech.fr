/**
 * Constantes globales du moteur (GDD §12.2). Les valeurs de réglage du jeu
 * (vitesses, XP, prix…) vivent dans `data/balance.json`, pas ici.
 */

/**
 * Résolution logique de l'écran titre et du chargement (décision n°4).
 * Le monde ouvert utilise une résolution plus basse (décision n°36) : voir WORLD_WIDTH.
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Résolution logique du monde ouvert : 320×180, pixels plus gros, rendu plus net (décision n°36). */
export const WORLD_WIDTH = 320;
export const WORLD_HEIGHT = 180;

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
