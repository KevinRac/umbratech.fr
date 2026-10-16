/**
 * Clés localStorage (GDD §14.2). Le format des sauvegardes est construit au jalon M9.
 */
export const SAVE_PREFIX = 'vaelmor:';

export const SAVE_KEYS = {
  slot1: 'vaelmor:save:slot1',
  slot2: 'vaelmor:save:slot2',
  slot3: 'vaelmor:save:slot3',
  auto: 'vaelmor:save:auto',
  settings: 'vaelmor:settings',
} as const;

export const MANUAL_SLOTS = [SAVE_KEYS.slot1, SAVE_KEYS.slot2, SAVE_KEYS.slot3] as const;

/** Copie de secours d'une clé de sauvegarde (restaurée si la principale est corrompue). */
export const backupKey = (key: string): string => `${key}:backup`;

/** Toutes les clés pouvant contenir une partie, de la plus récente à la plus ancienne en priorité d'affichage. */
export const GAME_SAVE_KEYS = [SAVE_KEYS.auto, ...MANUAL_SLOTS] as const;
