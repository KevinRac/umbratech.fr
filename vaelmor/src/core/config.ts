/**
 * Constantes globales du moteur (GDD §12.2). Les valeurs de réglage du jeu
 * (vitesses, XP, prix…) vivent dans `data/balance.json`, pas ici.
 */

/**
 * Le canevas a la taille réelle de l'écran (décision n°38) : voir `core/viewport.ts`.
 * Ces deux zones sont les surfaces de conception du pixel art, en pixels d'art.
 */
/**
 * Canevas à taille FIXE (décision n°40) : 960×540 pixels physiques, affiché 1:1 (sans aucun
 * agrandissement CSS) et centré, sur tous les écrans. Texte et interface y sont nets ;
 * le pixel art du monde est zoomé ×2 (480×270 pixels d'art visibles).
 */
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

/** Écran titre : décor dessiné en 480×270, centré et zoomé d'un facteur entier. */
export const TITLE_WIDTH = 480;
export const TITLE_HEIGHT = 270;

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
