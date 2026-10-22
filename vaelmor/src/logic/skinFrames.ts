/** Indices d'images dans une feuille d'apparence (rangées sud/nord/est, `frames` colonnes). Logique pure. */
import { SKIN_ROWS, type SkinPose } from '../data/skins';

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
