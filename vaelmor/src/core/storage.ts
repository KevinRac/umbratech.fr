/**
 * Accès sûr à localStorage (GDD §14.2).
 *
 * localStorage peut être absent ou lever une exception (navigation privée,
 * stockage bloqué, quota dépassé) : aucune fonction ici ne lève, elles
 * renvoient un résultat explicite. Le format des sauvegardes (versionnage,
 * checksum, migrations) sera construit au-dessus au jalon M9.
 */
export type StorageWriteResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'unknown'; message: string };

function getStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = 'vaelmor:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

export function readRaw(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function hasKey(key: string): boolean {
  return readRaw(key) !== null;
}

export function writeRaw(key: string, value: string): StorageWriteResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: 'unavailable', message: 'Le stockage local est indisponible dans ce navigateur.' };
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    const isQuota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
    return isQuota
      ? { ok: false, reason: 'quota', message: 'Espace de stockage plein : impossible de sauvegarder.' }
      : { ok: false, reason: 'unknown', message: `Écriture impossible : ${(error as Error).message}` };
  }
}

export function removeKey(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    /* rien à faire */
  }
}
