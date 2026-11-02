/** Indices d'images dans une feuille d'apparence (rangées sud/nord/est, `frames` colonnes). Logique pure. */
import { SKIN_ALTS, SKIN_ROWS, type SkinPose } from '../data/skins';

/** Index de l'image `frame` (modulo le nombre d'images) pour une pose. */
export function skinFrameIndex(pose: SkinPose, frame: number, frames: number): number {
  const row = SKIN_ROWS.indexOf(pose);
  const col = ((Math.trunc(frame) % frames) + frames) % frames;
  return row * frames + col;
}

/** Liste des index d'une marche complète pour une pose. */
export function skinWalkFrames(pose: SkinPose, frames: number): number[] {
  return Array.from({ length: frames }, (_, i) => skinFrameIndex(pose, i, frames));
}

/**
 * Détail distinctif d'une recrue (décision n°121) : deux membres de la même classe ont le même skin ;
 * le deuxième porte un détail (1), le troisième un autre (2), etc. Le héros et le premier de chaque
 * classe n'en ont pas (0). Les couleurs restent réservées aux camps : les détails sont neutres.
 */
export function skinVariant(party: readonly { readonly class: string; readonly hero: boolean }[], index: number): number {
  const member = party[index];
  if (!member || member.hero) return 0;
  let n = 0;
  for (let i = 0; i < index; i++) {
    const other = party[i];
    if (other && !other.hero && other.class === member.class) n++;
  }
  return n;
}

/** Identifiant de sprite d'une apparence avec son détail : `lame_du_serment#2` (0 = sans détail). */
export function variantSprite(base: string, variant: number): string {
  return variant > 0 ? `${base}#${variant}` : base;
}

/** Inverse de `variantSprite`. */
export function parseSprite(sprite: string): { base: string; variant: number } {
  const i = sprite.indexOf('#');
  if (i < 0) return { base: sprite, variant: 0 };
  const v = Number(sprite.slice(i + 1));
  return { base: sprite.slice(0, i), variant: Number.isInteger(v) && v > 0 ? v : 0 };
}

/**
 * Sprite d'un membre de classe `base` pour son rang parmi les membres de cette classe (`skinVariant`) :
 * 0 = skin de la classe ; puis les autres personnages générés (`SKIN_ALTS`) ; puis le skin de la classe
 * avec un détail peint, en recommençant au premier détail.
 */
export function memberSprite(base: string, variant: number): string {
  if (variant <= 0) return base;
  const alts = SKIN_ALTS[base] ?? [];
  if (variant <= alts.length) return alts[variant - 1] as string;
  return variantSprite(base, variant - alts.length);
}
