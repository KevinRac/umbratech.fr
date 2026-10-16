/**
 * Champ de blé animé : tuile 16×16 répétable, 4 images. Le vent fait onduler les
 * épis en vague qui traverse le champ (`frame` décale la phase d'un cran).
 *
 * Style « épi bien gras » : chaque épi (5×9 px) a un contour sombre, une face
 * éclairée à gauche, une face dans l'ombre à droite et des grains séparés par
 * des sillons. Deux rangs (celui du fond est assombri) donnent de la profondeur.
 * Tuile fermée sur elle-même (les coordonnées bouclent) → raccords invisibles.
 *
 * Peinte dans un « puits de pixels » (`PixelSink`) : sert au jeu (texture animée
 * posée sur les champs) et à l'outil de génération (tuile fixe = image 0).
 * `variant` ne change que les détails (décalage des épis, fleurs).
 */
import { PALETTE as P, mixColor as mix } from './palette';
import type { PixelSink } from './waterTile';

export const WHEAT_FRAMES = 4;
export const WHEAT_TILE = 16;

const SHADE = mix(P.ombreViolette, P.ombreProfonde, 0.3);

const C = {
  soil: mix(P.terreSombre, P.ombreProfonde, 0.55),
  soilLight: mix(P.terreSombre, P.ombreProfonde, 0.3),
  soilHi: mix(P.terreSeche, P.ocre, 0.3),
  ink: mix(P.rougeCendre, P.nuitBleue, 0.7),
  hi: mix(P.jauneBle, P.parchemin, 0.55),
  light: mix(P.jauneBle, P.braise, 0.1),
  mid: mix(P.jauneBle, P.ambre, 0.55),
  dark: mix(P.ambre, P.rougeCendre, 0.5),
  stem: mix(P.oliveClair, P.jauneBle, 0.35),
  stemDark: mix(P.oliveSombre, P.olive, 0.3),
  leaf: mix(P.olive, P.vertDore, 0.3),
  poppy: P.rougeCendre,
  poppyHi: P.orangeForge,
  cornflower: mix(P.bleuGris, P.ciel, 0.5),
} as const;

/** Épi 5×9 : o contour, h éclat, L clair, M moyen, D ombre. */
const EAR = [
  '..o..',
  '.oho.',
  '.oLDo',
  'oLMDo',
  'oLDDo',
  'oMLDo',
  'oLDDo',
  '.oMDo',
  '..oo.',
] as const;
const EAR_W = 5;
const EAR_H = 9;
const STEM_LEN = 3;
const SWAY = [0, 1, 0, -1] as const;

const hash = (a: number, b: number, c: number): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type Put = (x: number, y: number, color: number) => void;

/** Un rang d'épis dont le haut est en `top` ; `back` assombrit (rang du fond). */
function paintRow(put: Put, top: number, xShift: number, frame: number, variant: number, row: number, back: boolean): void {
  const tint = (c: number): number => (back ? mix(c, SHADE, 0.3) : c);
  for (let i = 0; i < 2; i++) {
    const baseX = i * 8 + xShift;
    const dy = Math.floor(hash(i, row, variant) * 2); // épis plus ou moins hauts
    const sway = SWAY[(frame + i * 2 + xShift) % WHEAT_FRAMES] as number;
    const t = top + dy;
    // Tige (2 px : face éclairée + face dans l'ombre) et feuille basse.
    for (let k = 0; k < STEM_LEN + 2; k++) {
      const lean = k < 3 ? sway : 0;
      put(baseX + 2 + lean, t + EAR_H + k, tint(C.stem));
      put(baseX + 3 + lean, t + EAR_H + k, tint(C.stemDark));
    }
    put(baseX + 1, t + EAR_H + 3, tint(C.leaf));
    put(baseX + 0, t + EAR_H + 2, tint(C.leaf));
    // Épi.
    const colors: Record<string, number> = { o: C.ink, h: C.hi, L: C.light, M: C.mid, D: C.dark };
    EAR.forEach((line, y) => {
      for (let x = 0; x < EAR_W; x++) {
        const ch = line[x] as string;
        if (ch !== '.') put(baseX + x + sway, t + y, tint(colors[ch] as number));
      }
    });
  }
}

export function paintWheatFrame(sink: PixelSink, ox: number, oy: number, frame: number, variant: number): void {
  const W = WHEAT_TILE;
  const put: Put = (x, y, color) => sink.set(ox + ((x % W) + W) % W, oy + ((y % W) + W) % W, color);
  // Terre : sillons sombres entre les rangs, arête claire sur le bord supérieur de chaque sillon.
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) put(x, y, y % 8 < 4 ? C.soil : C.soilLight);
  }
  for (let x = 0; x < W; x += 2) {
    put(x, 0, C.soilHi);
    put(x + 1, 8, C.soilHi);
  }
  paintRow(put, 0, 4, frame, variant, 0, true);
  paintRow(put, 8, 0, frame, variant + 3, 1, false);
  // Bleuets et coquelicots (rares, fixes).
  if (variant % 2 === 1) {
    put(14, 6, C.poppy);
    put(13, 6, C.poppyHi);
    put(13, 7, C.stemDark);
  } else {
    put(1, 13, C.cornflower);
    put(2, 13, C.cornflower);
    put(1, 14, C.stemDark);
  }
}
