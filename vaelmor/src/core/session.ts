/**
 * Partie en cours (en mémoire). Les scènes s'y accrochent pour partager l'état
 * du monde sans se connaître ; la persistance dans localStorage arrive au
 * jalon M9 et lira / écrira ces mêmes structures.
 */
import type { WorldState } from '../logic/world/worldState';

let world: WorldState | null = null;

export function getWorldState(): WorldState | null {
  return world;
}

export function setWorldState(state: WorldState | null): void {
  world = state;
}

export function hasRunningGame(): boolean {
  return world !== null;
}
