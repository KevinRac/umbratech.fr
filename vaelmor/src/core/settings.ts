/**
 * Réglages du joueur (clé `vaelmor:settings`, GDD §14.2) : un objet JSON
 * versionné (`version`, décision n°232). Chaque champ se lit avec une valeur par
 * défaut : un champ absent ou illisible ne casse rien, et les champs inconnus
 * (d'une version plus récente) sont gardés tels quels. L'écran Options
 * (`scenes/OptionsScene.ts`) les modifie ; les scènes ouvertes écoutent
 * `onSettingsChange` pour appliquer un changement aussitôt.
 */
import { SAVE_KEYS } from '../logic/save/keys';
import { parseQuality, type Quality } from '../render/atmosphere';
import { resolveBindings, storedBindings, type KeyBindings } from '../logic/input/keymap';
import {
  parseColorBlind,
  parseReducedMotion,
  parseTextSize,
  parseTextSpeed,
  reducedActive,
  typingFor,
  type ReducedMotion,
  type TextSize,
  type TextSpeed,
  type Typing,
} from '../logic/settings/accessibility';
import { readRaw, writeRaw } from './storage';

/** Version du format des réglages (décision n°232). */
export const SETTINGS_VERSION = 1;

type SettingsListener = (key: string) => void;
const listeners = new Set<SettingsListener>();

/** Appelé après chaque réglage enregistré, avec son nom (`quality`, `battleAnim`…). Renvoie de quoi se désabonner. */
export function onSettingsChange(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Enregistre un réglage (les autres sont gardés) et prévient les scènes ouvertes. */
export function writeSetting(key: string, value: unknown): void {
  writeRaw(SAVE_KEYS.settings, JSON.stringify({ ...readSettings(), version: SETTINGS_VERSION, [key]: value }));
  for (const listener of [...listeners]) listener(key);
}

/** Valeur brute d'un réglage (lecture par les modules qui ont leur propre analyse). */
export function readSetting(key: string): unknown {
  return readSettings()[key];
}

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
  writeSetting('quality', quality);
}

/* ---------- Vitesse des animations de combat (GDD §11.1, décision n°19) ---------- */

export type AnimSpeed = 'normal' | 'fast' | 'off';

export const ANIM_SPEEDS: readonly AnimSpeed[] = ['normal', 'fast', 'off'];
export const ANIM_SPEED_LABEL: Readonly<Record<AnimSpeed, string>> = { normal: 'Normales', fast: 'Rapides', off: 'Désactivées' };
/** Facteur appliqué aux durées : « Rapides » divise par 2, « Désactivées » ne garde que l'essentiel. */
export const ANIM_SPEED_FACTOR: Readonly<Record<AnimSpeed, number>> = { normal: 1, fast: 0.5, off: 0 };

export function parseAnimSpeed(value: unknown): AnimSpeed {
  return ANIM_SPEEDS.includes(value as AnimSpeed) ? (value as AnimSpeed) : 'normal';
}

export function nextAnimSpeed(speed: AnimSpeed): AnimSpeed {
  return ANIM_SPEEDS[(ANIM_SPEEDS.indexOf(speed) + 1) % ANIM_SPEEDS.length] as AnimSpeed;
}

export function loadAnimSpeed(): AnimSpeed {
  return parseAnimSpeed(readSettings()['battleAnim']);
}

export function saveAnimSpeed(speed: AnimSpeed): void {
  writeSetting('battleAnim', speed);
}

/* ---------- Écran de combat rapproché (jalon M8, décision n°221) ---------- */

/** « Rapproché » : chaque échange se joue dans l'écran rapproché ; « Carte » : sur la carte, comme avant M8. */
export type BattleView = 'closeup' | 'map';

export const BATTLE_VIEWS: readonly BattleView[] = ['closeup', 'map'];
export const BATTLE_VIEW_LABEL: Readonly<Record<BattleView, string>> = { closeup: 'Rapproché', map: 'Carte' };

export function parseBattleView(value: unknown): BattleView {
  return BATTLE_VIEWS.includes(value as BattleView) ? (value as BattleView) : 'closeup';
}

export function nextBattleView(view: BattleView): BattleView {
  return BATTLE_VIEWS[(BATTLE_VIEWS.indexOf(view) + 1) % BATTLE_VIEWS.length] as BattleView;
}

export function loadBattleView(): BattleView {
  return parseBattleView(readSettings()['battleView']);
}

export function saveBattleView(view: BattleView): void {
  writeSetting('battleView', view);
}

/* ---------- Effets réduits (n°221, étendus au monde par n°244) ---------- */

let systemReduced: boolean | null = null;

/** `prefers-reduced-motion` du système (faux hors navigateur) ; un changement du système prévient les scènes comme un réglage. */
export function systemPrefersReducedMotion(): boolean {
  if (systemReduced !== null) return systemReduced;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return (systemReduced = false);
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  systemReduced = query.matches;
  query.addEventListener?.('change', (event) => {
    systemReduced = event.matches;
    for (const listener of [...listeners]) listener('reducedFx');
  });
  return systemReduced;
}

/** Réglage tel qu'enregistré : « Selon le système » si rien n'est enregistré. */
export function loadReducedMotion(): ReducedMotion {
  return parseReducedMotion(readSettings()['reducedFx']);
}

export function saveReducedMotion(mode: ReducedMotion): void {
  writeSetting('reducedFx', mode);
}

/** « Effets réduits » en vigueur (réglage, ou système en « Auto ») : flashs atténués, secousses ÷ 3, pas de zoom. */
export function loadReducedEffects(): boolean {
  return reducedActive(loadReducedMotion(), systemPrefersReducedMotion());
}

/* ---------- Texte (n°242, n°244) ---------- */

export function loadTextSize(): TextSize {
  return parseTextSize(readSettings()['textSize']);
}

export function saveTextSize(size: TextSize): void {
  writeSetting('textSize', size);
}

export function loadTextSpeed(): TextSpeed {
  return parseTextSpeed(readSettings()['textSpeed']);
}

export function saveTextSpeed(speed: TextSpeed): void {
  writeSetting('textSpeed', speed);
}

/** Machine à écrire des répliques, réglée par la vitesse du texte (`balance.dialogue` en base). */
export function loadTyping(base: Typing): Typing {
  return typingFor(base, loadTextSpeed());
}

/* ---------- Mode daltonien (n°243) ---------- */

export function loadColorBlind(): boolean {
  return parseColorBlind(readSettings()['colorBlind']);
}

export function saveColorBlind(on: boolean): void {
  writeSetting('colorBlind', on);
}

/* ---------- Touches (n°241) ---------- */

export function loadKeyBindings(): KeyBindings {
  return resolveBindings(readSettings()['keys']);
}

/** Enregistre les liaisons (seules les actions modifiées sont écrites). */
export function saveKeyBindings(bindings: KeyBindings): void {
  writeSetting('keys', storedBindings(bindings));
}

/* ---------- Sons (jalon M8, n°227) ---------- */

/** Bruitages de combat : activés si rien n'est enregistré. */
export function loadSoundOn(): boolean {
  return readSettings()['sound'] !== false;
}

export function saveSoundOn(on: boolean): void {
  writeSetting('sound', on);
}
