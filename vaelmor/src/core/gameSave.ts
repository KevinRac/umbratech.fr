/**
 * Sauvegarder et charger la partie en cours (jalon M9).
 *
 * Fait le lien entre la partie en mémoire (`session.ts`) et les emplacements
 * (`saves.ts`) : instantané, résumé, écriture, restauration ; chronomètre du
 * temps de jeu (n°155) ; export et import de fichiers (n°164).
 */
import { loadGameData } from '../data';
import { SAVE_KEYS } from '../logic/save/keys';
import { buildEnvelope, decodeSave, encodeEnvelope, MAX_IMPORT_BYTES, type SaveEnvelope } from '../logic/save';
import { restoreGame, snapshotGame, summarize } from '../logic/save/snapshot';
import { readSlot, SLOT_LABEL, writeSlot, type LoadableSlot, type SlotKey, type WriteResult } from './saves';
import { getSessionState, getWorldState, setSessionState, setWorldState } from './session';

/* ---------- Identifiant de partie et chronomètre ---------- */

/** Identifiant d'une nouvelle partie (n°170). */
export function newGameId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

let clockRunning = false;

/** Le temps de jeu court-il ? Faux sur l'écran titre et pendant la pause (n°155). */
export function setPlayClock(running: boolean): void {
  clockRunning = running;
}

/** Ajoute le temps d'une image à la partie (appelé à chaque pas du jeu). */
export function tickPlayClock(deltaMs: number): void {
  const world = getWorldState();
  if (!clockRunning || !world) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  world.playMs += Math.min(Math.max(deltaMs, 0), 250);
}

/* ---------- Sauvegarder et charger ---------- */

/** Enveloppe de la partie en cours ; `place` : lieu ou zone, en toutes lettres. */
export function currentEnvelope(place: string): SaveEnvelope | null {
  const world = getWorldState();
  if (!world) return null;
  const game = loadGameData();
  return buildEnvelope(snapshotGame(world, getSessionState()), summarize(world, game, place), new Date().toISOString());
}

/** Sauvegarde la partie en cours dans un emplacement. */
export function saveCurrentGame(key: SlotKey, place: string): WriteResult {
  const envelope = currentEnvelope(place);
  if (!envelope) return { ok: false, message: 'Aucune partie en cours.' };
  return writeSlot(key, envelope, loadGameData());
}

/** Sauvegarde automatique (n°160) : même chose, sur la clé `auto`. */
export const autoSave = (place: string): WriteResult => saveCurrentGame(SAVE_KEYS.auto, place);

/** Remplace la partie en mémoire par celle d'une sauvegarde lisible. */
export function loadIntoSession(save: SaveEnvelope): void {
  const { world, session } = restoreGame(save.data);
  setWorldState(world);
  setSessionState(session);
}

/** Relit un emplacement juste avant de le charger (il a pu changer depuis l'affichage de la liste). */
export function freshSlot(key: SlotKey): LoadableSlot | null {
  const entry = readSlot(key, loadGameData());
  return entry.state === 'ok' || entry.state === 'restored' ? entry : null;
}

/* ---------- Export et import (n°164) ---------- */

/** Nom du fichier exporté : `vaelmor-emplacement2-2026-11-02.json`. */
export function exportFileName(key: SlotKey, save: SaveEnvelope): string {
  const slot = key === SAVE_KEYS.auto ? 'auto' : `emplacement${key.slice(-1)}`;
  return `vaelmor-${slot}-${save.savedAt.slice(0, 10)}.json`;
}

/** Télécharge une sauvegarde en fichier .json (l'enveloppe telle quelle, lisible). */
export function exportSave(key: SlotKey, save: SaveEnvelope): void {
  const blob = new Blob([encodeEnvelope(save, true)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(key, save);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportResult = { readonly ok: true; readonly save: SaveEnvelope; readonly warnings: readonly string[] } | { readonly ok: false; readonly message: string };

/** Lit et contrôle un fichier choisi par le joueur (mêmes contrôles qu'au chargement, n°156). */
export async function readImportFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: 'Fichier trop gros : ce n’est pas une sauvegarde de Vaelmor (1 Mo au plus).' };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: 'Le fichier n’a pas pu être lu.' };
  }
  const result = decodeSave(text, loadGameData());
  if (!result.ok) return { ok: false, message: result.kind === 'checksum' ? 'Fichier modifié ou abîmé : la somme de contrôle ne correspond pas.' : result.message };
  return { ok: true, save: result.save, warnings: result.warnings };
}

/** Ouvre le sélecteur de fichiers ; résout null si le joueur annule. */
export function pickImportFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    let settled = false;
    const done = (file: File | null): void => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => done(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => done(null));
    document.body.append(input);
    input.click();
  });
}

/** Écrit une sauvegarde importée dans un emplacement (la date d'origine est gardée). */
export function storeImported(key: SlotKey, save: SaveEnvelope): WriteResult {
  return writeSlot(key, save, loadGameData());
}

export { SLOT_LABEL };
