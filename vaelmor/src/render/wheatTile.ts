/**
 * Champ de blé animé : tuile 16×16 répétable, 4 images. Le vent fait onduler les
 * épis en vague qui traverse le champ (`frame` décale la phase d'un cran).
 *
 * Peinte dans un « puits de pixels » (`PixelSink`) : sert au jeu (texture animée
 * posée sur les champs) et à l'outil de génération (tuile fixe = image 0).
 * `variant` ne change que les détails (hauteur des tiges, fleurs) pour casser la répétition.
 */
import { PALETTE as P, mixColor as mix } from './palette';
import type { PixelSink } from './waterTile';

export const WHEAT_FRAMES = 4;
export const WHEAT_TILE = 16;

const C = {
  soil: mix(P.grisRoux, P.nuit, 0.55),
  soilLight: mix(P.grisRoux, P.nuit, 0.35),
  stem: mix(P.vertDore, P.jauneBle, 0.45),
  stemDark: mix(P.vertProfond, P.jauneBle, 0.35),
  leaf: mix(P.vertDore, P.vertProfond, 0.35),
  strawDark: mix(P.ambre, P.nuitBleue, 0.3),
  straw: P.jauneBle,
  strawLight: mix(P.jauneBle, P.parchemin, 0.5),
  grain: mix(P.ambre, P.jauneBle, 0.4),
  poppy: P.rougeCendre,
  cornflower: mix(P.bleuGris, P.ciel, 0.5),
} as const;

const SWAY = [0, 1, 0, -1] as const;
const hash = (a: number, b: number, c: number): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Une rangée de plants dont le pied est en `baseY` (inclus). */
function paintRow(sink: PixelSink, baseY: number, frame: number, variant: number, row: number): void {
  for (let i = 0; i < WHEAT_TILE; i += 2) {
    const x = (i + (row % 2)) % WHEAT_TILE;
    const height = 6 + Math.floor(hash(i, row, variant) * 3); // 6 à 8 px
    const sway = SWAY[(frame + (x >> 2)) % WHEAT_FRAMES] as number;
    const topY = baseY - height;
    // Feuilles basses, tige (à moitié penchée), épi (penché en entier).
    sink.set(x, baseY, C.leaf);
    sink.set((x + 1) % WHEAT_TILE, baseY, C.stemDark);
    for (let y = baseY - 1; y > topY + 2; y--) {
      const lean = y < baseY - height / 2 ? Math.round(sway * 0.5) : 0;
      sink.set((x + lean + WHEAT_TILE) % WHEAT_TILE, y, y > baseY - 3 ? C.stemDark : C.stem);
    }
    const ex = (x + sway + WHEAT_TILE) % WHEAT_TILE;
    sink.set(ex, topY, C.strawLight);
    sink.set(ex, topY + 1, C.straw);
    sink.set(ex, topY + 2, C.grain);
    sink.set((ex + WHEAT_TILE - 1) % WHEAT_TILE, topY + 1, C.strawLight);
    sink.set((ex + 1) % WHEAT_TILE, topY + 1, C.strawDark);
    sink.set((ex + 1) % WHEAT_TILE, topY + 2, C.strawDark);
    sink.set(ex, topY - 1, C.strawLight); // barbe de l'épi
  }
}

export function paintWheatFrame(sink: PixelSink, ox: number, oy: number, frame: number, variant: number): void {
  const at = (x: number, y: number, color: number): void => sink.set(ox + x, oy + y, color);
  const rowSink: PixelSink = { set: (x, y, color, alpha) => sink.set(ox + x, oy + y, color, alpha) };
  // Fond : terre sombre entre les rangs.
  for (let y = 0; y < WHEAT_TILE; y++) for (let x = 0; x < WHEAT_TILE; x++) at(x, y, y % 8 < 4 ? C.soil : C.soilLight);
  paintRow(rowSink, 7, frame, variant, 0);
  paintRow(rowSink, 15, frame, variant + 3, 1);
  // Bleuets et coquelicots dans le blé (rares, fixes).
  if (variant % 2 === 1) {
    at(3, 5, C.poppy);
    at(3, 4, C.poppy);
    at(12, 12, C.cornflower);
    at(12, 11, C.cornflower);
  } else {
    at(9, 6, C.cornflower);
    at(9, 5, C.cornflower);
  }
}
