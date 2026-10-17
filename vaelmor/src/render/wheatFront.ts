/**
 * Épis au premier plan quand le héros traverse un champ (décision n°50).
 *
 * Le bas du héros est rogné (les épis du champ, dessinés dessous, réapparaissent
 * à la place de ses jambes) ; cette frange d'épis est posée sur la ligne de
 * coupe pour qu'elle soit irrégulière et dorée, pas droite. 4 images au rythme
 * du vent des plantes (n°45). Mêmes couleurs que le blé du générateur
 * (`tools/world/wheat.ts`). Module sans DOM : il peint dans un « puits de pixels ».
 */
import { PALETTE as P, mixColor as mix } from './palette';
import type { PixelSink } from './waterTile';

export const WHEAT_FRONT_W = 20;
export const WHEAT_FRONT_H = 9;
export const WHEAT_FRONT_FRAMES = 4;
/** Durées des images, identiques au vent des plantes (`WIND_MS`). */
export const WHEAT_FRONT_MS = [560, 420, 560, 420] as const;
/** Rangées sous la ligne de coupe couvertes par la frange (tiges). */
export const WHEAT_FRONT_BELOW = 3;

const SWAY = [0, 1, 0, -1] as const;
const SHADE = mix(P.ombreViolette, P.ombreProfonde, 0.3);
const C = {
  stem: mix(P.ocre, P.oliveClair, 0.4),
  hi: mix(P.lumiereDoree, 0xffffff, 0.3),
  light: mix(P.jauneBle, P.lumiereDoree, 0.4),
  mid: mix(P.jauneBle, P.ocre, 0.3),
  dark: mix(P.ocre, P.terreCuite, 0.35),
  deep: mix(mix(P.terreCuite, P.brique, 0.3), SHADE, 0.25),
  awn: mix(P.parchemin, P.jauneBle, 0.5),
} as const;

/** Épis : position x, hauteur de la pointe (0 = plus haut). */
const EARS: readonly (readonly [number, number])[] = [
  [1, 2],
  [4, 0],
  [7, 1],
  [10, 0],
  [13, 2],
  [16, 1],
];

export function paintWheatFront(sink: PixelSink, ox: number, oy: number, frame: number): void {
  const sway = SWAY[frame % SWAY.length] as number;
  const H = WHEAT_FRONT_H;
  for (const [x, top] of EARS) {
    const y0 = top + 1;
    // Tige jusqu'en bas de la frange.
    for (let y = y0 + 5; y < H; y++) sink.set(ox + x + 1, oy + y, C.stem);
    const ex = x + sway;
    sink.set(ox + ex + 1, oy + y0 - 1, C.awn);
    for (let j = 0; j < 5; j++) {
      sink.set(ox + ex, oy + y0 + j, j === 0 ? C.hi : j % 2 === 1 ? C.light : C.mid);
      sink.set(ox + ex + 1, oy + y0 + j, j === 4 ? C.deep : j % 2 === 0 ? C.dark : C.mid);
    }
  }
}
