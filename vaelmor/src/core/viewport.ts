/**
 * Tailles d'affichage (décision n°38) : le canevas a toujours la taille réelle
 * de l'écran en pixels physiques, donc rien n'est jamais étiré. Le pixel art et
 * l'interface sont agrandis par des facteurs ENTIERS choisis selon la hauteur
 * de l'écran : un grand écran montre plus de monde, pas des pixels plus gros.
 * Fonctions pures (testées).
 */

/** Hauteur d'écran visée pour le pixel art du monde : ~250 pixels d'art en hauteur. */
const WORLD_TARGET_HEIGHT = 250;
/** Hauteur de référence de l'interface : à 540 px de haut, l'interface est à l'échelle ×1. */
const UI_REFERENCE_HEIGHT = 540;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Pixels d'écran par pixel d'art dans le monde (entier, 2 à 8). */
export function worldZoomFor(screenHeight: number): number {
  return clamp(Math.floor(screenHeight / WORLD_TARGET_HEIGHT), 2, 8);
}

/** Facteur entier de l'interface (texte et cadres), ≥ 1. */
export function uiScaleFor(screenHeight: number): number {
  return Math.max(1, Math.round(screenHeight / UI_REFERENCE_HEIGHT));
}

/** Zoom entier de l'écran titre (zone de conception 480×270), ≥ 1. */
export function titleZoomFor(screenWidth: number, screenHeight: number, designWidth: number, designHeight: number): number {
  return Math.max(1, Math.floor(Math.min(screenWidth / designWidth, screenHeight / designHeight)));
}

/**
 * Décalage de défilement d'une caméra Phaser zoomée : elle zoome autour de son
 * centre, donc le coin haut-gauche visible vaut `scroll + origine`.
 */
export function zoomOrigin(screenWidth: number, screenHeight: number, zoom: number): { x: number; y: number } {
  return { x: (screenWidth / 2) * (1 - 1 / zoom), y: (screenHeight / 2) * (1 - 1 / zoom) };
}
