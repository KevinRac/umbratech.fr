/**
 * Synchronisation d'un emplacement entre ce navigateur et le compte en ligne
 * (lot M9b, décision n°172). Module pur : il décide, `core/cloud.ts` agit.
 *
 * Pour chaque emplacement, le jeu retient le point de la dernière
 * synchronisation réussie (`base` : somme de la sauvegarde et révision en
 * ligne à ce moment-là). Alors :
 * - rien n'a changé d'un côté : on recopie l'autre côté ;
 * - les deux côtés ont changé (ou on n'a jamais synchronisé et ils diffèrent) :
 *   conflit, le joueur choisit ;
 * - les deux côtés sont identiques : rien à faire.
 */

/** Ce que le navigateur a dans un emplacement (null : vide ou illisible). */
export interface LocalSide {
  readonly checksum: string;
  readonly savedAt: string;
}

/** Ce que le compte a dans un emplacement (null : vide). */
export interface RemoteSide {
  readonly checksum: string;
  readonly savedAt: string;
  readonly rev: number;
}

/** Point de la dernière synchronisation réussie de l'emplacement. */
export interface SyncBase {
  readonly checksum: string;
  readonly rev: number;
}

export type SyncAction =
  /** Les deux côtés sont identiques (ou vides). */
  | 'none'
  /** Envoyer la sauvegarde du navigateur. */
  | 'push'
  /** Reprendre la sauvegarde du compte dans le navigateur. */
  | 'pull'
  /** Effacer l'emplacement en ligne : il a été supprimé dans ce navigateur. */
  | 'deleteRemote'
  /** Effacer l'emplacement du navigateur : il a été supprimé en ligne. */
  | 'deleteLocal'
  /** Les deux côtés ont changé : le joueur choisit. */
  | 'conflict';

export function planSync(local: LocalSide | null, remote: RemoteSide | null, base: SyncBase | null): SyncAction {
  if (!local && !remote) return 'none';
  if (local && remote && local.checksum === remote.checksum) return 'none';
  const localChanged = base === null || local?.checksum !== base.checksum;
  const remoteChanged = base === null || (remote?.rev ?? 0) !== base.rev;
  if (!local) {
    // Vide ici : supprimé ici depuis la dernière synchronisation, ou jamais eu.
    if (base !== null && !remoteChanged) return 'deleteRemote';
    return 'pull';
  }
  if (!remote) {
    // Vide en ligne : supprimé ailleurs (si rien n'a bougé ici), sinon à envoyer.
    if (base !== null && !localChanged) return 'deleteLocal';
    return 'push';
  }
  if (localChanged && remoteChanged) return 'conflict';
  if (remoteChanged) return 'pull';
  return 'push';
}

/** Emplacement côté serveur (« auto », « slot1 »…) depuis la clé localStorage, et l'inverse. */
export const slotOfKey = (key: string): string => key.slice(key.lastIndexOf(':') + 1);
export const keyOfSlot = (slot: string): string => `vaelmor:save:${slot}`;

/** Lit la somme et la date d'une sauvegarde brute sans tout contrôler (null si illisible). */
export function peekEnvelope(raw: string | null): LocalSide | null {
  if (raw === null) return null;
  try {
    const env = JSON.parse(raw) as { checksum?: unknown; savedAt?: unknown };
    return typeof env.checksum === 'string' && typeof env.savedAt === 'string' ? { checksum: env.checksum, savedAt: env.savedAt } : null;
  } catch {
    return null;
  }
}
