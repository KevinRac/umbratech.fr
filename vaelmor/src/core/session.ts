/**
 * Partie en cours (en mémoire). Les scènes s'y accrochent pour partager l'état
 * du monde sans se connaître ; la sauvegarde (jalon M9, `core/saves.ts`) lit
 * et écrit ces mêmes structures.
 */
import type { SessionState } from '../logic/save/snapshot';
import { emptyLoadout, type Loadout } from '../logic/tactics/units';
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

/* ---------- Préparation des combats (jalons M5, M9) ---------- */

/**
 * Équipement de chaque membre de la compagnie et dernier choix de déploiement,
 * gardés d'un combat à l'autre et sauvegardés avec la partie. Indexés par
 * identifiant de membre (décision n°154) : une recrue qui arrive ou un membre
 * perdu en mode Classique ne décale rien.
 */
let loadouts: Record<string, Loadout> = {};
let lastDeployed: string[] | null = null;

/** Équipement des membres, dans l'ordre donné (les objets renvoyés sont ceux de la session : les modifier les garde). */
export function getLoadouts(memberIds: readonly string[]): Loadout[] {
  return memberIds.map((id) => (loadouts[id] ??= emptyLoadout()));
}

/** Membres déployés au dernier combat (identifiants). */
export function getLastDeployed(): readonly string[] | null {
  return lastDeployed;
}

export function setLastDeployed(memberIds: readonly string[]): void {
  lastDeployed = [...memberIds];
}

/** État de la session à sauvegarder (les objets sont ceux de la session, à copier par l'appelant). */
export function getSessionState(): SessionState {
  return { loadouts, lastDeployed };
}

/** Remet la session dans l'état d'une sauvegarde, ou à neuf (nouvelle partie). */
export function setSessionState(state: SessionState | null): void {
  loadouts = state ? state.loadouts : {};
  lastDeployed = state ? state.lastDeployed : null;
}
