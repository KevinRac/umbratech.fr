/**
 * Migrations successives des sauvegardes (GDD §14.2, décision n°158).
 *
 * `MIGRATIONS[n]` transforme une enveloppe de la version n en version n + 1
 * (ses champs `meta` et `data`, et `saveVersion`). Une sauvegarde v1 est
 * ainsi portée pas à pas jusqu'à la version courante. v1 = M9 ; v2 ajoute
 * les dialogues de combat. Chaque changement du schéma (`schema.ts`) ajoute
 * ici une fonction et un test qui charge la sauvegarde figée
 * `tests/fixtures/save-v1.json`.
 *
 * Une migration reçoit une copie et peut la modifier ; elle ne contrôle rien :
 * le schéma de la version courante valide le résultat. Module pur.
 */
import { SAVE_VERSION } from './schema';

/** Enveloppe d'une version quelconque, avant validation. */
export interface RawEnvelope {
  saveVersion: number;
  meta: unknown;
  data: unknown;
  [key: string]: unknown;
}

export type Migration = (envelope: RawEnvelope) => RawEnvelope;

/**
 * v1 → v2 (dialogues de combat, n°189) : la progression gagne les scènes vues,
 * le sort des ennemis nommés et le compteur anti-malchance de leur apparition,
 * tous vides.
 */
const toV2: Migration = (envelope) => {
  const data = envelope.data as { world?: { progress?: Record<string, unknown> } };
  const progress = data.world?.progress;
  if (progress) {
    progress['scenesSeen'] ??= [];
    progress['named'] ??= {};
    progress['namedPity'] ??= 0;
  }
  return { ...envelope, saveVersion: 2 };
};

/** Registre des migrations : version de départ → fonction. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: toV2 };

export class MigrationError extends Error {}

/**
 * Porte une enveloppe de sa version à `target` (version courante par défaut),
 * migration après migration. `registry` sert aux tests.
 */
export function migrate(envelope: RawEnvelope, target: number = SAVE_VERSION, registry: Readonly<Record<number, Migration>> = MIGRATIONS): RawEnvelope {
  let current = JSON.parse(JSON.stringify(envelope)) as RawEnvelope;
  while (current.saveVersion < target) {
    const from = current.saveVersion;
    const step = registry[from];
    if (!step) throw new MigrationError(`Aucune migration de la version ${from} vers la version ${from + 1}.`);
    current = step(current);
    if (current.saveVersion !== from + 1) throw new MigrationError(`La migration depuis la version ${from} n’a pas produit la version ${from + 1}.`);
  }
  return current;
}
