/**
 * Palette des tuiles du monde et petits outils de dessin pixel art.
 * Toutes les teintes dérivent de la palette globale (GDD §12.3).
 */
import { PALETTE as P } from '../../src/render/palette';
import { mix, type Px } from './px';

export type Rnd = () => number;

export interface Ramp {
  /** Du plus sombre au plus clair. */
  readonly deep: number;
  readonly dark: number;
  readonly base: number;
  readonly light: number;
  readonly hi: number;
}

/**
 * Rampe de 5 teintes avec glissement de teinte (« hue shifting ») : les ombres
 * virent vers le bleu-violet, les lumières vers le jaune chaud. C'est ce qui
 * donne un rendu moderne, loin des dégradés ternes du pixel art d'époque.
 */
function ramp(base: number, shadow: number, highlight: number): Ramp {
  return {
    deep: mix(base, shadow, 0.78),
    dark: mix(base, shadow, 0.42),
    base,
    light: mix(base, highlight, 0.3),
    hi: mix(base, highlight, 0.62),
  };
}

/** Teinte d'ombre commune : bleu nuit légèrement violet (jamais du noir pur). */
export const SHADE = mix(P.ombreViolette, P.ombreProfonde, 0.3);
/** Lumière commune : jaune-orangé chaud de fin d'après-midi (décision n°43). */
export const SUN = P.lumiereChaude;

export const INK = mix(SHADE, P.nuit, 0.45); // contour des objets
export const INK_DEEP = P.encre;

/** Contour coloré d'une rampe : sa teinte la plus sombre, assombrie vers le bleu nuit. */
export const inkOf = (r: Ramp): number => mix(r.deep, SHADE, 0.45);

export const RAMPS = {
  grass: ramp(mix(P.olive, P.vertDore, 0.38), SHADE, SUN),
  forest: ramp(mix(P.oliveSombre, P.mousse, 0.45), SHADE, P.oliveClair),
  foliage: ramp(mix(P.mousse, P.vertDore, 0.3), SHADE, SUN),
  foliageAutumn: ramp(mix(P.ocre, P.terreCuite, 0.35), mix(P.brique, SHADE, 0.4), P.ocreClair),
  dirt: ramp(mix(P.terreSeche, P.ocre, 0.18), mix(P.terreSombre, SHADE, 0.35), P.ocreClair),
  sand: ramp(mix(P.sable, P.ocreClair, 0.3), mix(P.terreCuite, SHADE, 0.35), P.parchemin),
  rock: ramp(mix(P.grisRoux, P.ardoise, 0.3), SHADE, P.pierre),
  stone: ramp(mix(P.pierre, P.ocre, 0.14), SHADE, P.parchemin),
  snow: ramp(P.ecume, mix(P.ardoise, P.violetPale, 0.4), 0xffffff),
  marsh: ramp(mix(P.oliveSombre, P.violetPale, 0.22), SHADE, P.oliveClair),
  pond: ramp(mix(P.ardoise, P.nuitBleue, 0.45), P.ombreProfonde, P.ciel),
  wood: ramp(mix(P.ambre, P.terreSombre, 0.55), mix(P.brique, SHADE, 0.55), P.ocreClair),
  trunk: ramp(mix(P.terreSombre, P.grisRoux, 0.3), SHADE, P.terreSeche),
  rust: ramp(mix(P.rougeCendre, P.grisRoux, 0.25), mix(P.rougeCendre, SHADE, 0.5), P.orangeForge),
  wheat: ramp(mix(P.jauneBle, P.ocre, 0.3), mix(P.terreCuite, SHADE, 0.25), P.parchemin),
  ruin: ramp(mix(P.pierre, P.ardoise, 0.35), SHADE, P.parchemin),
} as const;

export const ACCENT = {
  flowerYellow: P.jauneBle,
  flowerWhite: P.ecume,
  flowerRed: mix(P.rougeCendre, P.orangeForge, 0.3),
  flowerBlue: P.ciel,
  ember: P.braise,
  fire: P.orangeForge,
  window: P.braise,
  windowDark: P.bleuNuit,
  cyan: P.cyanEclat,
  violet: P.violetBrume,
  foam: P.ecume,
  wet: mix(P.sable, P.bleuGris, 0.4),
} as const;

export function ellipse(px: Px, cx: number, cy: number, rx: number, ry: number, color: number, alpha = 255): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px.set(x, y, color, alpha);
    }
  }
}

/** Boule ombrée (feuillage, rocher) : lumière en haut à gauche, bruit de matière. */
export function shadedBlob(px: Px, cx: number, cy: number, rx: number, ry: number, ramp: Ramp, rnd: Rnd, grain = 0.18): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const light = -0.55 * dx - 0.75 * dy + (rnd() - 0.5) * grain * 2;
      const color = light > 0.62 ? ramp.hi : light > 0.2 ? ramp.light : light > -0.35 ? ramp.base : light > -0.7 ? ramp.dark : ramp.deep;
      px.set(x, y, color);
    }
  }
}

/** Ajoute un contour 1 px aux formes opaques (les pixels transparents voisins d'un pixel opaque). */
export function outline(px: Px, color: number, x0 = 0, y0 = 0, w = px.width, h = px.height): void {
  const marks: [number, number][] = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (px.alphaAt(x, y) !== 0) continue;
      if (px.alphaAt(x - 1, y) > 200 || px.alphaAt(x + 1, y) > 200 || px.alphaAt(x, y - 1) > 200 || px.alphaAt(x, y + 1) > 200) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) px.set(x, y, color);
}

/** Pose `count` pixels de `color` au hasard dans le rectangle. */
export function speckle(px: Px, rnd: Rnd, x: number, y: number, w: number, h: number, color: number, count: number): void {
  for (let i = 0; i < count; i++) px.set(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), color);
}

/** Ligne de Bresenham. */
export function line(px: Px, x0: number, y0: number, x1: number, y1: number, color: number): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    px.set(x, y, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
