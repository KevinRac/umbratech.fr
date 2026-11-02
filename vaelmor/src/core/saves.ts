/**
 * Emplacements de sauvegarde dans le navigateur (GDD §14.2, jalon M9).
 *
 * - 3 emplacements manuels et 1 sauvegarde automatique (n°159), clés de
 *   `logic/save/keys.ts`.
 * - Avant chaque écriture, l'ancienne version lisible passe dans la copie de
 *   secours `<clé>:backup` (n°157). À la lecture, une principale abîmée est
 *   remplacée par sa copie si celle-ci est bonne.
 * - Quota dépassé : rien n'est écrasé, le message le dit.
 *
 * Le stockage passe par l'interface `SaveStore` : localStorage aujourd'hui,
 * le serveur du compte en ligne demain (décision n°170).
 */
import type { GameData } from '../data/validate';
import { backupKey, GAME_SAVE_KEYS, MANUAL_SLOTS, SAVE_KEYS } from '../logic/save/keys';
import { decodeSave, encodeEnvelope, type SaveEnvelope } from '../logic/save';
import { latestOf } from '../logic/save/snapshot';
import { readRaw, removeKey, writeRaw, type StorageWriteResult } from './storage';

/** Où vivent les sauvegardes (n°170 : un second magasin, en ligne, viendra au lot M9b). */
export interface SaveStore {
  read(key: string): string | null;
  write(key: string, text: string): StorageWriteResult;
  remove(key: string): void;
}

export const localStore: SaveStore = { read: readRaw, write: writeRaw, remove: removeKey };

export type SlotKey = (typeof GAME_SAVE_KEYS)[number];
export type ManualSlotKey = (typeof MANUAL_SLOTS)[number];

export const SLOT_LABEL: Readonly<Record<SlotKey, string>> = {
  [SAVE_KEYS.auto]: 'Sauvegarde automatique',
  [SAVE_KEYS.slot1]: 'Emplacement 1',
  [SAVE_KEYS.slot2]: 'Emplacement 2',
  [SAVE_KEYS.slot3]: 'Emplacement 3',
};

export type SlotEntry =
  | { readonly key: SlotKey; readonly state: 'empty' }
  | { readonly key: SlotKey; readonly state: 'ok' | 'restored'; readonly save: SaveEnvelope; readonly warnings: readonly string[]; readonly message: string | null }
  | { readonly key: SlotKey; readonly state: 'broken'; readonly message: string };

export type LoadableSlot = Extract<SlotEntry, { state: 'ok' | 'restored' }>;

export const isLoadable = (entry: SlotEntry): entry is LoadableSlot => entry.state === 'ok' || entry.state === 'restored';

/**
 * Lit un emplacement. Une principale illisible est remplacée par sa copie de
 * secours si celle-ci est bonne (n°157) ; sinon l'emplacement est « abîmé ».
 */
export function readSlot(key: SlotKey, game: GameData, store: SaveStore = localStore): SlotEntry {
  const raw = store.read(key);
  if (raw === null) {
    const backup = store.read(backupKey(key));
    if (backup === null) return { key, state: 'empty' };
    // Principale effacée mais copie présente (écriture interrompue) : on la reprend.
    return restoreFromBackup(key, backup, game, store, 'La sauvegarde avait disparu : la copie précédente a été reprise.');
  }
  const main = decodeSave(raw, game);
  if (main.ok) return { key, state: 'ok', save: main.save, warnings: main.warnings, message: main.warnings.length > 0 ? main.warnings.join(' ') : null };
  const backup = store.read(backupKey(key));
  if (backup !== null) {
    const what = key === SAVE_KEYS.auto ? 'La sauvegarde automatique était abîmée' : `L’${SLOT_LABEL[key].toLowerCase()} était abîmé`;
    const restored = restoreFromBackup(key, backup, game, store, `${what} : la copie précédente a été chargée.`);
    if (restored.state === 'restored') return restored;
  }
  return { key, state: 'broken', message: `Sauvegarde illisible. ${main.message}` };
}

function restoreFromBackup(key: SlotKey, backup: string, game: GameData, store: SaveStore, message: string): SlotEntry {
  const copy = decodeSave(backup, game);
  if (!copy.ok) return { key, state: 'broken', message: `Sauvegarde illisible. ${copy.message}` };
  store.write(key, backup);
  return { key, state: 'restored', save: copy.save, warnings: copy.warnings, message: [message, ...copy.warnings].join(' ') };
}

export function listSlots(game: GameData, store: SaveStore = localStore): SlotEntry[] {
  return GAME_SAVE_KEYS.map((key) => readSlot(key, game, store));
}

/** La plus récente des sauvegardes lisibles (« Continuer », n°162). */
export function latestSlot(game: GameData, store: SaveStore = localStore): LoadableSlot | null {
  return latestOf(listSlots(game, store).filter(isLoadable));
}

export type WriteResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

/**
 * Prévenu après chaque écriture ou suppression d'un emplacement (le compte en
 * ligne s'y abonne pour envoyer la nouvelle version, lot M9b).
 */
type SlotListener = (key: SlotKey, deleted: boolean) => void;
let slotListener: SlotListener | null = null;

export function onSlotChange(listener: SlotListener | null): void {
  slotListener = listener;
}

/**
 * Écrit une sauvegarde. L'ancienne version lisible part d'abord dans la copie
 * de secours. En cas d'échec, l'emplacement garde son ancien contenu.
 */
export function writeSlot(key: SlotKey, envelope: SaveEnvelope, game: GameData, store: SaveStore = localStore, silent = false): WriteResult {
  const previous = store.read(key);
  if (previous !== null && decodeSave(previous, game).ok) {
    const copied = store.write(backupKey(key), previous);
    if (!copied.ok && copied.reason !== 'quota') return { ok: false, message: copied.message };
  }
  const written = store.write(key, encodeEnvelope(envelope));
  if (written.ok) {
    if (!silent && store === localStore) slotListener?.(key, false);
    return { ok: true };
  }
  if (written.reason === 'quota') return { ok: false, message: 'Espace de stockage plein : la partie n’a pas été sauvegardée. Supprime ou exporte un emplacement.' };
  return { ok: false, message: written.message };
}

/** Efface un emplacement et sa copie de secours. */
export function deleteSlot(key: SlotKey, store: SaveStore = localStore, silent = false): void {
  store.remove(key);
  store.remove(backupKey(key));
  if (!silent && store === localStore) slotListener?.(key, true);
}

/** Une sauvegarde existe-t-elle (même abîmée) ? Pour griser « Continuer » sans tout lire. */
export function anySave(store: SaveStore = localStore): boolean {
  return GAME_SAVE_KEYS.some((key) => store.read(key) !== null || store.read(backupKey(key)) !== null);
}
