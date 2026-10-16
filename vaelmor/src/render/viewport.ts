/**
 * Cadrage des caméras Phaser dans un canevas à la taille de l'écran
 * (décision n°38). Voir `core/viewport.ts` pour le choix des facteurs.
 */
import type Phaser from 'phaser';
import { titleZoomFor, zoomOrigin } from '../core/viewport';

export interface WorldView {
  readonly zoom: number;
  /** À retrancher de la position voulue du coin haut-gauche pour obtenir le défilement Phaser. */
  readonly origin: { x: number; y: number };
  /** Taille visible en pixels d'art. */
  readonly width: number;
  readonly height: number;
}

/** Zoom du monde : `zoom` pixels d'écran par pixel d'art. */
export function worldView(scene: Phaser.Scene, zoom: number): WorldView {
  const { width, height } = scene.scale;
  scene.cameras.main.setZoom(zoom);
  return { zoom, origin: zoomOrigin(width, height, zoom), width: width / zoom, height: height / zoom };
}

/** Écran titre : zone de conception centrée, zoom entier. Renvoie le zoom choisi. */
export function fitDesignArea(scene: Phaser.Scene, designWidth: number, designHeight: number): number {
  const { width, height } = scene.scale;
  const zoom = titleZoomFor(width, height, designWidth, designHeight);
  const origin = zoomOrigin(width, height, zoom);
  const marginX = (width / zoom - designWidth) / 2;
  const marginY = (height / zoom - designHeight) / 2;
  scene.cameras.main.setZoom(zoom).setScroll(Math.round(-origin.x - marginX), Math.round(-origin.y - marginY));
  return zoom;
}
