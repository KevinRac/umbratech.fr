/**
 * Cadrage des scènes dans le canevas fixe (décision n°37) : une scène conçue
 * pour une zone de `designWidth` pixels d'art de large (16:9) règle le zoom de sa
 * caméra pour remplir le canevas. Les caméras Phaser zooment autour de leur
 * centre ; on décale donc le défilement pour que la zone commence en (0, 0).
 */
import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/config';

export interface ViewOrigin {
  readonly x: number;
  readonly y: number;
}

/** Zoom entier de la caméra pour une zone de conception donnée. */
export function zoomFor(designWidth: number): number {
  return GAME_WIDTH / designWidth;
}

/** Défilement à retrancher pour que le point (0, 0) du monde soit en haut à gauche de l'écran. */
export function viewOrigin(designWidth: number): ViewOrigin {
  const zoom = zoomFor(designWidth);
  return { x: (GAME_WIDTH / 2) * (1 - 1 / zoom), y: (GAME_HEIGHT / 2) * (1 - 1 / zoom) };
}

/** Règle zoom et défilement de la caméra principale ; renvoie l'origine pour les scènes qui défilent. */
export function fitCamera(scene: Phaser.Scene, designWidth: number): ViewOrigin {
  const origin = viewOrigin(designWidth);
  scene.cameras.main.setZoom(zoomFor(designWidth)).setScroll(-origin.x, -origin.y);
  return origin;
}
