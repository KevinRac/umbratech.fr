/**
 * Partie en cours (en mémoire). Les scènes s'y accrochent pour partager l'état
 * du monde sans se connaître ; la persistance dans localStorage arrive au
 * jalon M9 et lira / écrira ces mêmes structures.
 */
import type { WorldState } from '../logic/world/worldState';
import { emptyLoadout, type Loadout } from '../logic/tactics/units';

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

/* ---------- Préparation des combats (jalon M5) ---------- */

/**
 * Équipement de chaque membre de la compagnie et dernier choix de déploiement,
 * gardés d'un combat à l'autre pendant la session (la sauvegarde arrive au jalon M9).
 */
let loadouts: Loadout[] | null = null;
let lastDeployed: number[] | null = null;

export function getLoadouts(size: number): Loadout[] {
  if (!loadouts || loadouts.length !== size) loadouts = Array.from({ length: size }, () => emptyLoadout());
  return loadouts;
}

export function getLastDeployed(): readonly number[] | null {
  return lastDeployed;
}

export function setLastDeployed(members: readonly number[]): void {
  lastDeployed = [...members];
}
