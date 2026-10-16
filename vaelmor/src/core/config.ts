/**
 * Constantes globales du moteur (GDD §12.2). Les valeurs de réglage du jeu
 * (vitesses, XP, prix…) vivent dans `data/balance.json`, pas ici.
 */

/**
 * Canevas du jeu : résolution FIXE, quelle que soit la taille de l'écran (décision n°37).
 * Le canevas est ensuite agrandi pour remplir la fenêtre. Les textes et l'interface
 * sont dessinés à cette résolution (nets) ; le pixel art des scènes est agrandi
 * par le zoom de leur caméra.
 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Zone de conception de l'écran titre : 480×270, zoom de caméra ×2. */
export const TITLE_WIDTH = 480;
export const TITLE_HEIGHT = 270;

/** Zone visible du monde ouvert : 320×180 pixels d'art, zoom de caméra ×3 (décision n°36). */
export const WORLD_WIDTH = 320;
export const WORLD_HEIGHT = 180;

/** Échelle de l'interface (panneaux, curseurs) par rapport à leur dessin de base. */
export const UI_SCALE = 2;

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
