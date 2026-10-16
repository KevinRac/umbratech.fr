/**
 * Tuile d'eau animée (GDD §12.5 : vagues sur 2–3 images), 16×16, répétable.
 *
 * Peinte dans un « puits de pixels » (`PixelSink`) pour servir à la fois au
 * jeu (canvas du navigateur) et à l'outil de génération (aperçus). Sans DOM.
 */
import { PALETTE } from './palette';
import { mixColor } from './palette';

export interface PixelSink {
  set(x: number, y: number, color: number, alpha?: number): void;
}

export const WATER_FRAMES = 4;
export const WATER_TILE = 16;

/** Couleurs de l'eau : fond, creux, crête, éclat. */
export const WATER_COLORS = {
  base: mixColor(PALETTE.bleuGris, PALETTE.nuitBleue, 0.38),
  trough: mixColor(PALETTE.bleuGris, PALETTE.nuitBleue, 0.58),
  crest: mixColor(PALETTE.bleuGris, PALETTE.ciel, 0.42),
  glint: PALETTE.ecume,
} as const;

/** Positions (x, y, longueur) des crêtes de vagues ; chaque image les décale pour donner un mouvement doux. */
const CRESTS: readonly (readonly [number, number, number])[] = [
  [1, 2, 4],
  [9, 5, 5],
  [3, 9, 3],
  [11, 12, 4],
  [6, 14, 3],
];

export function paintWaterFrame(sink: PixelSink, frame: number): void {
  for (let y = 0; y < WATER_TILE; y++) for (let x = 0; x < WATER_TILE; x++) sink.set(x, y, WATER_COLORS.base);

  // Creux : bandes sombres qui dérivent d'un pixel par image.
  for (const [cx, cy, len] of CRESTS) {
    const shift = frame % WATER_FRAMES;
    const y = (cy + (shift >> 1)) % WATER_TILE;
    for (let i = 0; i < len; i++) {
      const x = (cx + i + shift) % WATER_TILE;
      sink.set(x, (y + 1) % WATER_TILE, WATER_COLORS.trough);
    }
  }
  // Crêtes : lignes claires avec un éclat au centre.
  for (const [cx, cy, len] of CRESTS) {
    const shift = frame % WATER_FRAMES;
    const y = (cy + (shift >> 1)) % WATER_TILE;
    for (let i = 0; i < len; i++) {
      const x = (cx + i + shift) % WATER_TILE;
      sink.set(x, y, i === Math.floor(len / 2) && shift % 2 === 0 ? WATER_COLORS.glint : WATER_COLORS.crest);
    }
  }
}
