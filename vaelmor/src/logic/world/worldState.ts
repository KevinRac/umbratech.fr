/**
 * État du monde ouvert : ce qui change pendant la partie et devra être
 * sauvegardé (jalon M9). Aucune dépendance au rendu.
 */
import type { WorldMap } from '../../data/worldMap';
import type { Progress } from '../game/progress';
import type { Facing8 } from './movement';

export interface WorldState {
  readonly player: { x: number; y: number; facing: Facing8 };
  /** Drapeaux de progression levés (boss vaincus…) : ils ouvrent les passages verrouillés. */
  readonly openFlags: string[];
  /** Identifiants des zones visitées. */
  readonly discoveredZones: string[];
  /** Identifiants des lieux visités (villages, autels…). */
  readonly discoveredLocations: string[];
  /** Or, sac, réputations, quêtes, recrues (jalon M2). */
  readonly progress: Progress;
}

/** Centre en pixels d'un objet de carte (le pied d'un point d'apparition est sa position). */
export function objectCenter(o: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return { x: o.x + o.width / 2, y: o.y + o.height / 2 };
}

/** Point d'apparition (couche `spawns`) par identifiant. */
export function findSpawn(map: WorldMap, id: string): { x: number; y: number } | null {
  const spawn = map.spawns.find((s) => s.props['id'] === id);
  return spawn ? { x: spawn.x, y: spawn.y } : null;
}

/** État d'une nouvelle partie : le héros apparaît au point « start ». */
export function newWorldState(map: WorldMap, progress: Progress): WorldState {
  const start = findSpawn(map, 'start');
  if (!start) throw new Error('La carte du monde n’a pas de point d’apparition « start ».');
  return { player: { x: start.x, y: start.y, facing: 's' }, openFlags: [], discoveredZones: [], discoveredLocations: [], progress };
}

/** Ajoute `value` à une liste sans doublon (renvoie vrai si c'est nouveau). */
export function addUnique(list: string[], value: string): boolean {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}
