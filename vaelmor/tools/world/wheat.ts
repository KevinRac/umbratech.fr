/**
 * Champs de blé (décision n°49, remplace la tuile répétée des n°41 à n°45).
 *
 * Chaque case de champ reçoit un tampon 1×2 : les tiges partent du bas de la
 * case, les épis montent dans la case du dessus. Les tampons sont composés du
 * nord au sud (`composeLayers`) : les épis d'un rang passent devant les tiges
 * du rang précédent, ce qui donne une masse continue sans quadrillage.
 *
 * Un épi : 3 colonnes (clair à gauche, moyen, ombre à droite), grains en
 * chevrons, barbes fines au-dessus, tige qui verdit vers le bas, feuilles.
 * Les épis du fond sont plus sombres et plus hauts, ceux du devant plus clairs.
 * Variantes : 0-3 dense (intérieur), 4 clairsemé (bord du champ, épis courts,
 * trous), 5 touffe sauvage (hors du champ, casse la silhouette carrée),
 * 6 dense avec coquelicots et bleuets.
 *
 * Vent : `SWAY[frame]` fait pencher les épis (plus le haut de la tige monte,
 * plus elle se déplace) ; le générateur en fait une animation GPU (n°45).
 */
import { hash2 } from './noise';
import { SHADE, type Rnd } from './art';
import { SWAY } from './flora';
import { mix, type Px } from './px';
import { PALETTE as P } from '../../src/render/palette';

export const WHEAT_VARIANTS = 7;
export const WHEAT_EDGE = 4;
export const WHEAT_WILD = 5;

const C = {
  soil: mix(mix(P.ocre, P.terreSombre, 0.6), SHADE, 0.3),
  soilDeep: mix(mix(P.terreSombre, P.brique, 0.3), SHADE, 0.45),
  stemBack: mix(mix(P.ocre, P.oliveSombre, 0.5), SHADE, 0.25),
  stem: mix(P.ocre, P.oliveClair, 0.4),
  stemLow: mix(P.oliveSombre, P.ocre, 0.35),
  leaf: mix(P.oliveClair, P.ocre, 0.45),
  leafDark: mix(P.oliveSombre, P.ocre, 0.25),
  hi: mix(P.lumiereDoree, 0xffffff, 0.3),
  light: mix(P.jauneBle, P.lumiereDoree, 0.4),
  mid: mix(P.jauneBle, P.ocre, 0.3),
  dark: mix(P.ocre, P.terreCuite, 0.35),
  deep: mix(mix(P.terreCuite, P.brique, 0.3), SHADE, 0.25),
  awn: mix(P.parchemin, P.jauneBle, 0.5),
  poppy: mix(P.rougeCendre, P.orangeForge, 0.25),
  poppyHi: P.braise,
  cornflower: mix(P.bleuGris, P.ciel, 0.55),
} as const;

interface Stalk {
  readonly x: number;
  /** Pied de la tige (y du tampon, 16..31). */
  readonly base: number;
  /** Hauteur de la tige jusqu'au bas de l'épi. */
  readonly h: number;
  /** 0 fond, 1 devant : règle la lumière. */
  readonly depth: number;
  readonly lean: number;
}

/** Tiges de la variante : rangs serrés, du fond vers le devant. */
function stalks(variant: number): Stalk[] {
  const out: Stalk[] = [];
  const seed = 40 + variant * 7;
  const sparse = variant === WHEAT_EDGE;
  const wild = variant === WHEAT_WILD;
  const rows = wild ? 1 : 3;
  for (let r = 0; r < rows; r++) {
    const base = wild ? 29 : 20 + r * 4 + Math.floor(hash2(r, 0, seed) * 2);
    const step = wild ? 3 : sparse ? 3 : 2;
    for (let x = (r % 2) * 2 - 1; x < 17; x += step) {
      const k = hash2(x, r, seed);
      if ((sparse && k < 0.4) || (wild && (x < 3 || x > 12 || k < 0.35)) || (!sparse && !wild && k < 0.12)) continue;
      const jx = x + Math.floor(hash2(x, r + 9, seed) * 2);
      out.push({
        x: jx,
        base: base + Math.floor(hash2(x, r + 3, seed) * 2),
        h: (sparse ? 7 : wild ? 8 : 9) + Math.floor(hash2(x, r + 5, seed) * 4) - (sparse && k < 0.6 ? 3 : 0),
        depth: wild ? 1 : r / Math.max(1, rows - 1),
        lean: hash2(x, r + 7, seed) < 0.5 ? 0 : hash2(x, r + 8, seed) < 0.5 ? -1 : 1,
      });
    }
  }
  return out.sort((a, b) => a.base - b.base);
}

/** Épi 2×5 : grains alternés clair / moyen à gauche, ombre à droite, une barbe qui penche. */
function ear(px: Px, x: number, y: number, depth: number, glow: boolean, lean: number): void {
  const shade = (c: number): number => mix(c, SHADE, 0.16 * (1 - depth));
  const L = shade(glow ? C.hi : C.light);
  const M = shade(C.mid);
  const D = shade(C.dark);
  px.set(x + 1 + (lean > 0 ? 1 : 0), y - 1, shade(C.awn));
  for (let j = 0; j < 5; j++) {
    px.set(x, y + j, j === 0 ? shade(C.hi) : j % 2 === 1 ? L : M);
    px.set(x + 1, y + j, j === 4 ? shade(C.deep) : j % 2 === 0 ? D : M);
  }
}

export function paintWheat(px: Px, _rnd: Rnd, variant: number, frame: number): void {
  const sway = SWAY[frame % 4] as number;
  const list = stalks(variant);
  const dense = variant !== WHEAT_EDGE && variant !== WHEAT_WILD;
  // Ombre de contact au pied de chaque rang (le sol labouré reste visible entre les rangs).
  if (dense) {
    for (const s of list) for (let x = s.x; x <= s.x + 2; x++) px.set(x, s.base + 1, C.soilDeep, 120);
  }
  for (const s of list) {
    const top = s.base - s.h;
    // Tige : verte en bas, dorée en haut ; elle penche avec le vent vers le haut.
    for (let y = s.base; y >= top + 5; y--) {
      const t = (s.base - y) / s.h;
      const dx = Math.round(sway * t * 1.15) + (t > 0.6 ? s.lean : 0);
      px.set(s.x + 1 + dx, y, t < 0.3 ? C.stemLow : C.stem);
    }
    // Feuille en biais à mi-hauteur.
    const ly = s.base - Math.floor(s.h * 0.35);
    const side = (s.x + variant) % 2 === 0 ? 1 : -1;
    px.set(s.x + 1 + side, ly, C.leaf);
    px.set(s.x + 1 + side * 2, ly - 1, C.leafDark);
    // Épi.
    const ex = s.x + Math.round(sway * 1.15) + s.lean;
    const glow = hash2(s.x, s.base, 77 + variant) < 0.18;
    ear(px, ex, top, s.depth, glow, s.lean + sway);
  }
  if (variant === 6) {
    for (const [x, y, c] of [[3, 20, C.poppy], [11, 24, C.poppy], [7, 27, C.cornflower]] as const) {
      px.set(x, y, c);
      px.set(x + 1, y, c === C.poppy ? C.poppyHi : mix(c, 0xffffff, 0.3));
      px.set(x, y + 1, C.stemLow);
    }
  }
}

/** Sol labouré sous le blé : sillons horizontaux de terre, chaume. */
export function paintFieldSoil(px: Px, deco: number): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const furrow = (y + (deco % 2)) % 4;
      let c = furrow === 0 ? C.soilDeep : furrow === 1 ? C.soil : mix(C.soil, P.ocre, 0.35);
      if (hash2(x, y, 31 + deco) < 0.08) c = mix(c, P.terreSeche, 0.5);
      px.set(x, y, c);
    }
  }
  // Chaume et brins tombés.
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash2(i, deco, 5) * 15);
    const y = Math.floor(hash2(i, deco, 6) * 14) + 1;
    px.set(x, y, C.stem);
    px.set(x + 1, y - 1, C.mid);
  }
}
