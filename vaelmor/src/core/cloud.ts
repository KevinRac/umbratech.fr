/**
 * Compte et sauvegarde en ligne (lot M9b, GDD §14.3, décisions n°170 à n°173).
 *
 * - Connexion par un code à 6 chiffres envoyé par e-mail (API `vaelmor/api/`,
 *   même méthode que gw1). Le jeu reste jouable sans compte.
 * - Connecté, chaque écriture ou suppression d'un emplacement part aussi en
 *   ligne. Au titre (et après la connexion), tous les emplacements sont
 *   comparés : le côté qui a changé gagne ; si les deux ont changé, le joueur
 *   choisit (`planSync`, logique pure).
 * - Le point de la dernière synchronisation de chaque emplacement est gardé
 *   dans `vaelmor:sync`, par compte.
 * Hors ligne (serveur injoignable, développement local), tout se tait : les
 * sauvegardes restent dans le navigateur.
 */
import { loadGameData } from '../data';
import { decodeSave, type SaveEnvelope, type SaveMeta } from '../logic/save';
import { GAME_SAVE_KEYS } from '../logic/save/keys';
import { keyOfSlot, peekEnvelope, planSync, slotOfKey, type RemoteSide, type SyncAction, type SyncBase } from '../logic/save/sync';
import { deleteSlot, onSlotChange, writeSlot, type SlotKey } from './saves';
import { readRaw, writeRaw } from './storage';

/* ---------- Appels à l'API ---------- */

export type ApiResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string; readonly body?: Record<string, unknown> };

/** Adresse de l'API : `vaelmor/api/` à côté de `vaelmor/play/`. */
function apiUrl(route: string, query = ''): string {
  return new URL(`../api/index.php?r=${route}${query}`, window.location.href).toString();
}

async function call<T>(route: string, body?: Record<string, unknown>, query = ''): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(route, query), {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-Vaelmor': '1' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return { ok: false, status: 0, code: 'offline', message: 'Serveur injoignable : vérifie ta connexion.' };
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, status: res.status, code: 'offline', message: 'Le serveur de sauvegarde ne répond pas.' };
  }
  if (!res.ok) return { ok: false, status: res.status, code: String(data['error'] ?? 'error'), message: String(data['message'] ?? 'Erreur du serveur.'), body: data };
  return { ok: true, data: data as T };
}

/* ---------- État du compte ---------- */

export type CloudStatus = 'unknown' | 'offline' | 'signedOut' | 'signedIn';

let status: CloudStatus = 'unknown';
let email: string | null = null;

export const cloudStatus = (): CloudStatus => status;
export const cloudEmail = (): string | null => email;

/** Interroge le serveur : connecté, déconnecté ou hors ligne. */
export async function refreshAccount(): Promise<CloudStatus> {
  const res = await call<{ user: { email: string } | null }>('auth/me');
  if (!res.ok) {
    status = res.status === 0 || res.code === 'offline' || res.status >= 500 || res.status === 404 ? 'offline' : 'signedOut';
    email = null;
    return status;
  }
  email = res.data.user?.email ?? null;
  status = email ? 'signedIn' : 'signedOut';
  if (email) resetBookIfOtherUser(email);
  return status;
}

export async function requestCode(address: string): Promise<ApiResult<{ ok: boolean; ttl: number }>> {
  return call('auth/request', { email: address });
}

export async function verifyCode(address: string, code: string): Promise<ApiResult<{ user: { email: string } }>> {
  const res = await call<{ user: { email: string } }>('auth/verify', { email: address, code });
  if (res.ok) {
    email = res.data.user.email;
    status = 'signedIn';
    resetBookIfOtherUser(email);
  }
  return res;
}

export async function logout(): Promise<void> {
  await call('auth/logout', {});
  email = null;
  status = 'signedOut';
}

/* ---------- Point de la dernière synchronisation (localStorage `vaelmor:sync`) ---------- */

const BOOK_KEY = 'vaelmor:sync';

interface SyncBook {
  user: string | null;
  slots: Record<string, SyncBase>;
}

function readBook(): SyncBook {
  try {
    const raw = readRaw(BOOK_KEY);
    const book = raw ? (JSON.parse(raw) as SyncBook) : null;
    if (book && typeof book === 'object' && book.slots && typeof book.slots === 'object') return book;
  } catch {
    /* illisible : on repart de zéro */
  }
  return { user: null, slots: {} };
}

function writeBook(book: SyncBook): void {
  writeRaw(BOOK_KEY, JSON.stringify(book));
}

/** Un autre compte sur ce navigateur : on oublie les points de synchronisation du précédent. */
function resetBookIfOtherUser(user: string): void {
  const book = readBook();
  if (book.user !== user) writeBook({ user, slots: {} });
}

function setBase(slot: string, base: SyncBase | null): void {
  const book = readBook();
  if (base) book.slots[slot] = base;
  else delete book.slots[slot];
  writeBook(book);
}

/* ---------- Synchronisation ---------- */

interface RemoteEntry extends RemoteSide {
  readonly slot: string;
  readonly meta: SaveMeta;
}

export interface SyncConflict {
  readonly key: SlotKey;
  /** Sauvegarde de ce navigateur. */
  readonly local: SaveEnvelope;
  /** Sauvegarde en ligne (résumé) et sa révision. */
  readonly remote: { readonly meta: SaveMeta; readonly savedAt: string; readonly rev: number };
}

export interface SyncReport {
  readonly ok: boolean;
  readonly message: string | null;
  readonly pushed: number;
  readonly pulled: number;
  readonly conflicts: readonly SyncConflict[];
}

let syncing: Promise<SyncReport> | null = null;

/** Compare et synchronise les 4 emplacements ; les conflits sont rendus, pas tranchés. */
export function syncAll(): Promise<SyncReport> {
  syncing ??= runSync().finally(() => (syncing = null));
  return syncing;
}

async function runSync(): Promise<SyncReport> {
  if (status !== 'signedIn') return { ok: false, message: 'Non connecté.', pushed: 0, pulled: 0, conflicts: [] };
  const list = await call<{ saves: RemoteEntry[] }>('saves/list');
  if (!list.ok) return { ok: false, message: list.message, pushed: 0, pulled: 0, conflicts: [] };
  const game = loadGameData();
  const book = readBook();
  let pushed = 0;
  let pulled = 0;
  const conflicts: SyncConflict[] = [];
  const errors: string[] = [];
  for (const key of GAME_SAVE_KEYS) {
    const slot = slotOfKey(key);
    const remote = list.data.saves.find((s) => s.slot === slot) ?? null;
    const raw = readRaw(key);
    const decoded = raw === null ? null : decodeSave(raw, game);
    // Une sauvegarde locale illisible ne doit jamais effacer celle en ligne : on la répare depuis le compte.
    const localSide = decoded?.ok ? peekEnvelope(raw) : null;
    const broken = raw !== null && !decoded?.ok;
    const action: SyncAction = broken ? (remote ? 'pull' : 'none') : planSync(localSide, remote, book.slots[slot] ?? null);
    const result = await apply(action, key, slot, raw, remote);
    if (result === 'pushed') pushed++;
    else if (result === 'pulled') pulled++;
    else if (result === 'conflict' && decoded?.ok && remote) conflicts.push({ key, local: decoded.save, remote: { meta: remote.meta, savedAt: remote.savedAt, rev: remote.rev } });
    else if (typeof result === 'object') errors.push(result.error);
  }
  return { ok: errors.length === 0, message: errors[0] ?? null, pushed, pulled, conflicts };
}

type Applied = 'none' | 'pushed' | 'pulled' | 'conflict' | { error: string };

async function apply(action: SyncAction, key: SlotKey, slot: string, raw: string | null, remote: RemoteSide | null): Promise<Applied> {
  switch (action) {
    case 'none':
      if (remote && raw) setBase(slot, { checksum: remote.checksum, rev: remote.rev });
      else if (!remote && !raw) setBase(slot, null);
      return 'none';
    case 'push':
      return raw === null ? 'none' : push(slot, raw, remote?.rev ?? 0);
    case 'pull':
      return pull(key, slot);
    case 'deleteRemote': {
      const res = await call('saves/delete', { slot, baseRev: remote?.rev ?? 0 });
      if (!res.ok) return { error: res.message };
      setBase(slot, null);
      return 'none';
    }
    case 'deleteLocal':
      deleteSlot(key, undefined, true);
      setBase(slot, null);
      return 'none';
    case 'conflict':
      return 'conflict';
  }
}

async function push(slot: string, raw: string, baseRev: number): Promise<Applied> {
  const res = await call<{ rev: number }>('saves/put', { slot, envelope: raw, baseRev });
  if (res.ok) {
    const side = peekEnvelope(raw);
    if (side) setBase(slot, { checksum: side.checksum, rev: res.data.rev });
    return 'pushed';
  }
  return res.code === 'conflict' ? 'conflict' : { error: res.message };
}

async function pull(key: SlotKey, slot: string): Promise<Applied> {
  const res = await call<{ envelope: string; rev: number }>('saves/get', undefined, `&slot=${slot}`);
  return res.ok ? store(key, slot, res.data.envelope, res.data.rev) : { error: res.message };
}

/** Range une sauvegarde venue du compte (contrôlée comme un import) et retient le point de synchronisation. */
function store(key: SlotKey, slot: string, text: string, rev: number): Applied {
  const game = loadGameData();
  const decoded = decodeSave(text, game);
  if (!decoded.ok) return { error: `Sauvegarde en ligne illisible : ${decoded.message}` };
  const written = writeSlot(key, decoded.save, game, undefined, true);
  if (!written.ok) return { error: written.message };
  const side = peekEnvelope(readRaw(key));
  if (side) setBase(slot, { checksum: side.checksum, rev });
  return 'pulled';
}

/** Tranche un conflit : garder la sauvegarde de ce navigateur ou celle du compte. */
export async function resolveConflict(conflict: SyncConflict, keep: 'local' | 'remote'): Promise<{ ok: boolean; message: string | null }> {
  const slot = slotOfKey(conflict.key);
  const result = keep === 'local' ? await push(slot, readRaw(conflict.key) ?? '', conflict.remote.rev) : await pull(conflict.key, slot);
  if (typeof result === 'object') return { ok: false, message: result.error };
  if (result === 'conflict') return { ok: false, message: 'La sauvegarde en ligne a encore changé : relance la synchronisation.' };
  return { ok: true, message: null };
}

/* ---------- Envoi après chaque écriture locale ---------- */

let pending: Promise<void> = Promise.resolve();

/** Branche l'envoi automatique : chaque écriture ou suppression d'un emplacement part aussi en ligne. */
export function startCloudSync(): void {
  onSlotChange((key, deleted) => {
    if (status !== 'signedIn') return;
    const slot = slotOfKey(key);
    // Les envois partent l'un après l'autre, dans l'ordre des écritures.
    pending = pending.then(async () => {
      const base = readBook().slots[slot] ?? null;
      if (deleted) {
        if (!base) return;
        const res = await call('saves/delete', { slot, baseRev: base.rev });
        if (res.ok) setBase(slot, null);
        return;
      }
      const raw = readRaw(key);
      // Sans point de synchronisation, l'emplacement sera comparé à la prochaine synchronisation (titre).
      if (raw !== null && base) await push(slot, raw, base.rev);
      else if (raw !== null) await push(slot, raw, 0);
    });
  });
  void refreshAccount();
}

export { keyOfSlot };
