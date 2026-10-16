/**
 * Sprite du héros (GDD §4.2, §12.4) : voyageur encapuchonné, 16×24 px.
 *
 * Trois poses de base (face, dos, profil droit) × 4 images de marche. Le profil
 * gauche est le profil droit retourné par le moteur (`flipX`). Dessiné par code
 * en attendant les vrais assets : un placeholder lisible, contour compris.
 * Module sans DOM : il peint dans un « puits de pixels » (voir `waterTile.ts`).
 */
import { PALETTE as P, mixColor } from './palette';
import type { PixelSink } from './waterTile';

export const HERO_W = 16;
export const HERO_H = 24;
export const HERO_WALK_FRAMES = 4;
export const HERO_POSES = ['down', 'up', 'side'] as const;
export type HeroPose = (typeof HERO_POSES)[number];

const C = {
  ink: P.encre,
  cloak: mixColor(P.bleuNuit, P.bleuGris, 0.35),
  cloakLight: mixColor(P.bleuNuit, P.bleuGris, 0.7),
  cloakDark: mixColor(P.bleuNuit, P.nuit, 0.5),
  scarf: P.rougeCendre,
  scarfLight: P.orangeForge,
  skin: mixColor(P.sable, P.orangeForge, 0.22),
  skinDark: mixColor(P.sable, P.rougeCendre, 0.4),
  hair: mixColor(P.grisRoux, P.nuit, 0.55),
  belt: mixColor(P.ambre, P.grisRoux, 0.5),
  buckle: P.jauneBle,
  boot: mixColor(P.grisRoux, P.nuit, 0.6),
  bootLight: P.grisRoux,
  pants: mixColor(P.grisRoux, P.nuit, 0.35),
  steel: P.pierre,
  eye: P.nuit,
} as const;

type Grid = (number | null)[];

function rect(g: Grid, x: number, y: number, w: number, h: number, color: number): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < HERO_W && j < HERO_H) g[j * HERO_W + i] = color;
  }
}

const px = (g: Grid, x: number, y: number, color: number): void => rect(g, x, y, 1, 1, color);

/** Corps vu de face ou de dos ; `step` : -1 jambe gauche levée, 1 jambe droite levée, 0 debout. */
function drawFrontBack(g: Grid, back: boolean, step: number, bob: number): void {
  const y0 = -bob; // le haut du corps monte d'un pixel sur les pas
  // Jambes et bottes.
  const leftUp = step === -1 ? 1 : 0;
  const rightUp = step === 1 ? 1 : 0;
  rect(g, 5, 19, 3, 3 - leftUp, C.pants);
  rect(g, 8, 19, 3, 3 - rightUp, C.pants);
  rect(g, 5, 21 - leftUp, 3, 2, C.boot);
  rect(g, 8, 21 - rightUp, 3, 2, C.boot);
  px(g, 5, 21 - leftUp, C.bootLight);
  px(g, 8, 21 - rightUp, C.bootLight);
  // Cape.
  rect(g, 4, 12 + y0, 8, 8, C.cloak);
  rect(g, 4, 12 + y0, 2, 8, C.cloakLight);
  rect(g, 10, 12 + y0, 2, 8, C.cloakDark);
  rect(g, 4, 19 + y0, 8, 1, C.cloakDark);
  // Ceinture.
  rect(g, 4, 16 + y0, 8, 1, C.belt);
  if (!back) px(g, 7, 16 + y0, C.buckle);
  // Bras.
  const swing = step;
  rect(g, 3, 13 + y0 + (swing === 1 ? 1 : 0), 1, 5, C.cloak);
  rect(g, 12, 13 + y0 + (swing === -1 ? 1 : 0), 1, 5, C.cloakDark);
  px(g, 3, 18 + y0 + (swing === 1 ? 1 : 0), C.skin);
  px(g, 12, 18 + y0 + (swing === -1 ? 1 : 0), C.skin);
  // Écharpe.
  rect(g, 5, 11 + y0, 6, 2, C.scarf);
  px(g, 5, 11 + y0, C.scarfLight);
  if (!back) {
    px(g, 9, 13 + y0, C.scarf);
    px(g, 9, 14 + y0, C.scarf);
  }
  // Tête et capuche.
  rect(g, 4, 3 + y0, 8, 8, C.cloak);
  rect(g, 5, 2 + y0, 6, 1, C.cloak);
  rect(g, 4, 3 + y0, 1, 8, C.cloakLight);
  rect(g, 11, 3 + y0, 1, 8, C.cloakDark);
  if (back) {
    rect(g, 6, 4 + y0, 4, 5, C.cloakDark);
    // Fourreau d'épée en travers du dos.
    for (let i = 0; i < 6; i++) px(g, 5 + i, 18 + y0 - i, C.steel);
    px(g, 4, 18 + y0, C.belt);
    px(g, 10, 12 + y0, C.buckle);
  } else {
    rect(g, 5, 5 + y0, 6, 5, C.skin);
    rect(g, 5, 5 + y0, 6, 1, C.hair);
    px(g, 5, 6 + y0, C.hair);
    px(g, 10, 6 + y0, C.hair);
    px(g, 6, 7 + y0, C.eye);
    px(g, 9, 7 + y0, C.eye);
    rect(g, 5, 9 + y0, 6, 1, C.skinDark);
  }
}

/** Profil droit. */
function drawSide(g: Grid, frame: number, bob: number): void {
  const y0 = -bob;
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  // Jambes : écartées sur les pas, jointes à l'arrêt.
  const back = step === 0 ? 7 : step === -1 ? 4 : 9;
  const front = step === 0 ? 7 : step === -1 ? 9 : 4;
  rect(g, back, 19, 3, 3, C.pants);
  rect(g, back, 21, 3, 2, C.boot);
  rect(g, front, 19, 3, 3, C.pants);
  rect(g, front, 21, 3, 2, C.boot);
  px(g, front + 2, 21, C.bootLight);
  px(g, front + 2, 22, C.bootLight);
  // Cape : pan arrière qui flotte.
  rect(g, 4, 12 + y0, 7, 8, C.cloak);
  rect(g, 3, 14 + y0, 1, 5, C.cloakDark);
  rect(g, 4, 12 + y0, 2, 8, C.cloakDark);
  rect(g, 9, 12 + y0, 2, 8, C.cloakLight);
  rect(g, 4, 19 + y0, 7, 1, C.cloakDark);
  rect(g, 4, 16 + y0, 7, 1, C.belt);
  px(g, 10, 16 + y0, C.buckle);
  // Épée au côté.
  px(g, 4, 17 + y0, C.steel);
  px(g, 3, 18 + y0, C.steel);
  px(g, 3, 19 + y0, C.steel);
  // Bras avant qui balance.
  const armX = step === 0 ? 7 : step === -1 ? 9 : 5;
  rect(g, armX, 13 + y0, 2, 5, C.cloakLight);
  px(g, armX + (step === -1 ? 1 : 0), 18 + y0, C.skin);
  // Écharpe.
  rect(g, 6, 11 + y0, 5, 2, C.scarf);
  px(g, 5, 12 + y0, C.scarf);
  px(g, 4, 13 + y0, C.scarf);
  px(g, 6, 11 + y0, C.scarfLight);
  // Tête.
  rect(g, 4, 3 + y0, 8, 8, C.cloak);
  rect(g, 5, 2 + y0, 6, 1, C.cloak);
  rect(g, 4, 3 + y0, 3, 8, C.cloakDark);
  rect(g, 8, 5 + y0, 4, 5, C.skin);
  rect(g, 8, 5 + y0, 4, 1, C.hair);
  px(g, 10, 7 + y0, C.eye);
  px(g, 11, 8 + y0, C.skinDark);
  rect(g, 8, 9 + y0, 3, 1, C.skinDark);
}

/** Peint une image du héros avec un contour sombre, au coin (ox, oy) du puits de pixels. */
export function paintHeroFrame(sink: PixelSink, ox: number, oy: number, pose: HeroPose, frame: number): void {
  const g: Grid = new Array<number | null>(HERO_W * HERO_H).fill(null);
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  if (pose === 'side') drawSide(g, frame, bob);
  else drawFrontBack(g, pose === 'up', step, bob);

  // Contour.
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < HERO_W && y < HERO_H && g[y * HERO_W + x] !== null;
  for (let y = 0; y < HERO_H; y++) {
    for (let x = 0; x < HERO_W; x++) {
      if (solid(x, y)) sink.set(ox + x, oy + y, g[y * HERO_W + x] as number);
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) sink.set(ox + x, oy + y, C.ink);
    }
  }
}
