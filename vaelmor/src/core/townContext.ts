/**
 * Contexte de jeu des villages pour les scènes : données indexées (une seule
 * fois) + état vivant de la partie en cours (`WorldState`).
 */
import { loadGameData } from '../data';
import { buildTownIndex, type GameCtx, type TownIndex } from '../logic/game';
import { getWorldState } from './session';

let index: TownIndex | null = null;

/** Contexte de la partie en cours, ou null s'il n'y en a pas. */
export function getGameCtx(): GameCtx | null {
  const world = getWorldState();
  if (!world) return null;
  const data = loadGameData();
  index ??= buildTownIndex(data);
  return { data, index, progress: world.progress, flags: world.openFlags, discovered: world.discoveredLocations };
}
