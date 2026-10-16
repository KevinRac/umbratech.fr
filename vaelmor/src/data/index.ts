/**
 * Registre des données embarquées dans le jeu.
 *
 * Les JSON de `vaelmor/data/` sont importés à la compilation (aucune requête
 * réseau au lancement) puis validés une fois par `loadGameData()`.
 * Ajouter un fichier : le déclarer dans `DATA_SCHEMAS` (validate.ts) puis
 * l'importer ici ; le test `data.test.ts` vérifie que les deux listes concordent.
 */
import balance from '../../data/balance.json';
import classes from '../../data/classes.json';
import elements from '../../data/elements.json';
import reputation from '../../data/reputation.json';
import terrains from '../../data/terrains.json';
import { GameDataError, validateGameData, type GameData, type RawGameData } from './validate';

export const EMBEDDED_DATA: RawGameData = { elements, terrains, reputation, balance, classes };

let cache: GameData | null = null;

/** Valide (une seule fois) et renvoie les données. Lève `GameDataError` si invalides. */
export function loadGameData(): GameData {
  if (cache) return cache;
  const result = validateGameData(EMBEDDED_DATA);
  if (!result.ok) throw new GameDataError(result.issues);
  cache = result.data;
  return cache;
}

export { GameDataError } from './validate';
export type { GameData } from './validate';
export type * from './schemas';
