/**
 * Champ de blé animé : tuile 16×16 répétable, 4 images (décision n°41, épis
 * gras de la n°42, refait en masse dorée dense à la n°45).
 *
 * Trois rangs d'épis serrés : pas de terre visible, seulement l'ombre chaude
 * entre les tiges. Chaque épi est éclairé à gauche et ombré à droite, cerné
 * d'un contour brun doré (jamais noir). Le vent fait pencher les épis d'un
 * pixel et une bande de lumière traverse le champ en diagonale (`frame` la
 * décale de 4 px). Tuile fermée sur elle-même → raccords invisibles.
 *
 * Peinte dans un « puits de pixels » (`PixelSink`) : sert au jeu (texture animée
 * posée sur les champs) et à l'outil de génération (tuile fixe = image 0).
 * `variant` ne change que les détails (coquelicots, bleuets).
 */
import { PALETTE as P, mixColor as mix } from './palette';
import type { PixelSink } from './waterTile';

export const WHEAT_FRAMES = 4;
export const WHEAT_TILE = 16;

const SHADE = mix(P.ombreViolette, P.ombreProfonde, 0.3);

const C = {
  gap: mix(mix(P.ocre, P.terreSombre, 0.55), SHADE, 0.25),
  gapLight: mix(P.ocre, P.terreSombre, 0.35),
  stem: mix(P.ocre, P.oliveClair, 0.35),
  stemDark: mix(P.ocre, P.oliveSombre, 0.45),
  ink: mix(P.ambre, P.brique, 0.55),
  hi: mix(P.lumiereDoree, 0xffffff, 0.25),
  light: mix(P.jauneBle, P.lumiereDoree, 0.35),
  mid: mix(P.jauneBle, P.ocre, 0.35),
  dark: mix(P.ocre, P.terreCuite, 0.3),
  poppy: mix(P.rougeCendre, P.orangeForge, 0.25),
  poppyHi: P.braise,
  cornflower: mix(P.bleuGris, P.ciel, 0.5),
} as const;

/** Épi 4×7 : h éclat, L clair, M moyen, D ombre, o contour (à droite et en bas seulement). */
const EAR = ['.hL.', 'hLMo', 'LMDo', 'LMMo', 'LMDo', 'MDDo', '.Do.'] as const;
const EAR_W = 4;
const EAR_H = 7;
const SWAY = [0, 1, 0, -1] as const;

const hash = (a: number, b: number, c: number): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type Put = (x: number, y: number, color: number) => void;

/** Bande de lumière qui traverse le champ : 0 hors bande, 1 au centre. */
function wave(x: number, y: number, frame: number): number {
  const d = (((x + y + frame * 4) % 16) + 16) % 16;
  return d < 2 ? 1 : d < 4 ? 0.5 : 0;
}

export function paintWheatFrame(sink: PixelSink, ox: number, oy: number, frame: number, variant: number): void {
  const W = WHEAT_TILE;
  const put: Put = (x, y, color) => sink.set(ox + ((x % W) + W) % W, oy + ((y % W) + W) % W, color);
  // Fond : ombre chaude entre les tiges, plus claire en haut de chaque rang.
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) put(x, y, (y + 1) % 6 < 2 ? C.gapLight : C.gap);
  // Trois rangs (y = 0, 5, 11 : période 16), quatre épis par rang, décalés d'un rang à l'autre.
  const rows = [0, 5, 11];
  rows.forEach((top, r) => {
    for (let i = 0; i < 4; i++) {
      const baseX = i * 4 + (r % 2) * 2;
      const dy = Math.floor(hash(i, r, variant) * 2);
      const t = top + dy - 1;
      const sway = SWAY[(frame + i + r) % 4] as number;
      const back = r === 0;
      // Tige.
      for (let k = EAR_H; k < EAR_H + 3; k++) {
        put(baseX + 1, t + k, back ? C.stemDark : C.stem);
        put(baseX + 2, t + k, C.stemDark);
      }
      const glow = wave(baseX, t, frame);
      const colors: Record<string, number> = {
        o: C.ink,
        h: glow > 0 ? 0xfffbe8 : C.hi,
        L: glow > 0.6 ? C.hi : glow > 0 ? mix(C.light, C.hi, 0.5) : C.light,
        M: glow > 0.6 ? C.light : C.mid,
        D: back ? mix(C.dark, SHADE, 0.2) : C.dark,
      };
      EAR.forEach((line, y) => {
        for (let x = 0; x < EAR_W; x++) {
          const ch = line[x] as string;
          if (ch === '.') continue;
          const lean = y < 3 ? sway : 0;
          put(baseX + x + lean, t + y, colors[ch] as number);
        }
      });
    }
  });
  // Coquelicots et bleuets (rares, fixes).
  if (variant % 2 === 1) {
    put(14, 9, C.poppy);
    put(13, 9, C.poppyHi);
    put(14, 10, C.stemDark);
  } else {
    put(1, 14, C.cornflower);
    put(2, 14, C.cornflower);
    put(1, 15, C.stemDark);
  }
}
