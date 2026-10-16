/**
 * Palette globale (GDD §12.3). Toutes les couleurs dessinées par code passent
 * par ici pour garder la cohérence visuelle ; un asset importé doit être
 * recoloré vers ces teintes (décision n°22).
 */
export const PALETTE = {
  // Brume Noire / nuit
  nuit: 0x12121f,
  nuitBleue: 0x1b2440,
  bleuNuit: 0x2c3550,
  violetBrume: 0x4b2e6f,
  violetPale: 0x6b5a7a,
  cyanEclat: 0x7fe0e8,
  // Cendre / forge
  pierre: 0xc9bfa9,
  parchemin: 0xf2e9d4,
  rougeCendre: 0xa64b3c,
  orangeForge: 0xe07b39,
  braise: 0xffb15c,
  // Plaines
  vertDore: 0x9cc55a,
  jauneBle: 0xe3c36b,
  ciel: 0x8fc7e8,
  // Forêt
  vertProfond: 0x2f5d3a,
  ambre: 0xd69b3c,
  // Côte
  bleuGris: 0x5d7b96,
  sable: 0xd6c49a,
  ecume: 0xe8f1f5,
  // Montagne
  grisRoux: 0x7a6c66,
  // Neutres d'interface
  encre: 0x0b0b14,
  ombre: 0x1a1626,
  metal: 0x5a5466,
  metalClair: 0x8f88a0,
  desactive: 0x6e6878,
} as const;

export type PaletteColor = keyof typeof PALETTE;

/** Convertit 0xRRGGBB en chaîne CSS. */
export const toCss = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Composantes RGB d'une couleur 0xRRGGBB. */
export function rgb(color: number): [number, number, number] {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

/** Interpolation linéaire entre deux couleurs (t dans [0, 1]). */
export function mixColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const k = Math.min(1, Math.max(0, t));
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
