/**
 * Écriture et lecture d'une sauvegarde (GDD §14.2, décisions n°151, n°156).
 *
 * Écriture : enveloppe `{ game, saveVersion, savedAt, meta, data, checksum }`,
 * la somme portant sur tout le reste de l'enveloppe.
 * Lecture, six contrôles dans l'ordre : JSON, somme, version (une version
 * future est refusée), migrations, schéma strict, références aux données du
 * jeu. Aucune fonction ne lève : le résultat dit ce qui ne va pas, en
 * français, pour le joueur. Module pur.
 */
import type { GameData } from '../../data/validate';
import { checksumOf } from './checksum';
import { migrate, MIGRATIONS, MigrationError, type Migration, type RawEnvelope } from './migrations';
import { checkReferences } from './references';
import { SAVE_GAME, SAVE_VERSION, saveEnvelopeSchema, type SaveData, type SaveEnvelope, type SaveMeta } from './schema';

export type SaveErrorKind = 'json' | 'game' | 'checksum' | 'future' | 'migration' | 'schema' | 'content';

export type DecodeResult =
  | { readonly ok: true; readonly save: SaveEnvelope; readonly warnings: readonly string[]; readonly migratedFrom: number | null }
  | { readonly ok: false; readonly kind: SaveErrorKind; readonly message: string };

/** Taille au-delà de laquelle un fichier importé est refusé sans être lu (n°164). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** Somme d'une enveloppe : tout sauf le champ `checksum`. */
export function envelopeChecksum(envelope: Record<string, unknown>): string {
  const { checksum: _ignored, ...rest } = envelope;
  return checksumOf(rest);
}

/** Construit l'enveloppe d'une sauvegarde ; `savedAt` en ISO 8601 (l'heure vient de l'appelant). */
export function buildEnvelope(data: SaveData, meta: SaveMeta, savedAt: string): SaveEnvelope {
  const body = { game: SAVE_GAME, saveVersion: SAVE_VERSION, savedAt, meta, data } as const;
  return { ...body, checksum: envelopeChecksum(body) };
}

/** Texte écrit dans localStorage ou dans le fichier exporté. */
export function encodeEnvelope(envelope: SaveEnvelope, pretty = false): string {
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}

const fail = (kind: SaveErrorKind, message: string): DecodeResult => ({ ok: false, kind, message });

export interface DecodeOptions {
  /** Registre de migrations (les tests en injectent de factices). */
  readonly migrations?: Readonly<Record<number, Migration>>;
  /** Version courante supposée (tests). */
  readonly version?: number;
}

/**
 * Lit une sauvegarde. Les références inconnues sont corrigées et signalées
 * dans `warnings` (n°156) ; le résultat est prêt à être restauré.
 */
export function decodeSave(raw: string, game: GameData, options: DecodeOptions = {}): DecodeResult {
  const version = options.version ?? SAVE_VERSION;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail('json', 'Données illisibles : la sauvegarde est coupée ou abîmée.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail('json', 'Données illisibles : ce n’est pas une sauvegarde.');
  const env = parsed as Record<string, unknown>;
  if (env['game'] !== SAVE_GAME) return fail('game', 'Ce fichier n’est pas une sauvegarde de Vaelmor.');
  const saveVersion = env['saveVersion'];
  if (typeof saveVersion !== 'number' || !Number.isInteger(saveVersion) || saveVersion < 1) return fail('schema', 'La sauvegarde n’indique pas sa version.');
  if (typeof env['checksum'] !== 'string' || env['checksum'] !== envelopeChecksum(env)) {
    return fail('checksum', 'La somme de contrôle ne correspond pas : la sauvegarde a été modifiée ou abîmée.');
  }
  if (saveVersion > version) return fail('future', `Cette sauvegarde vient d’une version plus récente du jeu (format ${saveVersion}, ce jeu lit jusqu’au format ${version}).`);

  let current: RawEnvelope = env as RawEnvelope;
  if (saveVersion < version) {
    try {
      current = migrate(current, version, options.migrations ?? MIGRATIONS);
    } catch (error) {
      return fail('migration', error instanceof MigrationError ? error.message : 'La sauvegarde n’a pas pu être mise à jour.');
    }
    current.checksum = envelopeChecksum(current);
  }

  // Le schéma vaut pour la version courante ; une version d'essai (tests) n'est contrôlée qu'au niveau des références.
  const checked = version === SAVE_VERSION ? saveEnvelopeSchema.safeParse(current) : saveEnvelopeSchema.safeParse({ ...current, saveVersion: SAVE_VERSION });
  if (!checked.success) {
    const issue = checked.error.issues[0];
    const where = issue ? issue.path.join('.') : '';
    return fail('schema', `La sauvegarde est incomplète ou abîmée${where ? ` (${where})` : ''}.`);
  }
  const save = checked.data;
  const report = checkReferences(save.data, game);
  if (report.fatal) return fail('content', report.fatal);
  // Les corrections (références, migration) changent le contenu : la somme suit, pour que l'enveloppe se réécrive telle quelle.
  save.checksum = envelopeChecksum(save);
  return { ok: true, save, warnings: report.warnings, migratedFrom: saveVersion < version ? saveVersion : null };
}
