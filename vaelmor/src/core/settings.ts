/**
 * Réglages du joueur (clé `vaelmor:settings`, GDD §14.2). Pour l'instant :
 * la qualité des effets HD-2D (décision n°47). Les options complètes arrivent
 * au jalon M10 ; ce fichier garde les champs qu'il ne connaît pas.
 */
import { SAVE_KEYS } from '../logic/save/keys';
import { parseQuality, type Quality } from '../render/atmosphere';
import { readRaw, writeRaw } from './storage';

function readSettings(): Record<string, unknown> {
  const raw = readRaw(SAVE_KEYS.settings);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Qualité enregistrée (« Haute » si rien n'est enregistré ou si la valeur est illisible). */
export function loadQuality(): Quality {
  return parseQuality(readSettings()['quality']);
}

/** Enregistre la qualité ; sans stockage disponible, le réglage vaut pour la session seulement. */
export function saveQuality(quality: Quality): void {
  writeRaw(SAVE_KEYS.settings, JSON.stringify({ ...readSettings(), quality }));
}
