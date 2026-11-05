/**
 * Moteur audio commun (jalon M10, décisions n°236 et n°240) : un seul contexte
 * Web Audio et trois bus (musique, effets, ambiance), chacun avec le volume
 * réglé par le joueur. Le contexte est créé tout de suite mais ne joue qu'après
 * un premier geste du joueur (règle des navigateurs) ; il se tait quand l'onglet
 * est caché.
 */
import { onSettingsChange, readSetting, writeSetting } from '../core/settings';

export type Bus = 'music' | 'sfx' | 'ambience';

/** Volumes par défaut (0 à 100, n°240). */
export const DEFAULT_VOLUMES: Readonly<Record<Bus, number>> = { music: 70, sfx: 80, ambience: 50 };
const SETTING_KEY: Readonly<Record<Bus, string>> = { music: 'musicVolume', sfx: 'sfxVolume', ambience: 'ambienceVolume' };

let ctx: AudioContext | null = null;
const buses = new Map<Bus, GainNode>();
let duck: GainNode | null = null;
let unlocked = false;
const onUnlock: (() => void)[] = [];

/** Volume enregistré d'un bus (0 à 100). Pour les effets, l'ancien réglage « Sons : non » vaut 0. */
export function loadVolume(bus: Bus): number {
  const raw = readSetting(SETTING_KEY[bus]);
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.min(100, Math.round(raw)));
  if (bus === 'sfx' && readSetting('sound') === false) return 0;
  return DEFAULT_VOLUMES[bus];
}

export function saveVolume(bus: Bus, volume: number): void {
  writeSetting(SETTING_KEY[bus], Math.max(0, Math.min(100, Math.round(volume))));
}

/** Gain d'un volume réglé : courbe en carré, plus fine dans les faibles volumes. */
export function volumeGain(volume: number): number {
  const v = Math.max(0, Math.min(100, volume)) / 100;
  return v * v;
}

/**
 * Contexte audio, ou null tant que le joueur n'a pas touché le clavier ou la
 * souris (un contexte créé avant est bloqué par le navigateur) ou sans Web Audio.
 */
export function audioContext(): AudioContext | null {
  return unlocked ? ctx : null;
}

function createContext(): AudioContext | null {
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return null;
  let c: AudioContext;
  try {
    c = new Ctor();
  } catch {
    return null;
  }
  duck = c.createGain();
  duck.connect(c.destination);
  for (const bus of ['music', 'sfx', 'ambience'] as const) {
    const gain = c.createGain();
    gain.gain.value = volumeGain(loadVolume(bus));
    // La musique passe par le « duck » (baissée pendant les critiques et les cut-ins, n°240).
    gain.connect(bus === 'music' ? duck : c.destination);
    buses.set(bus, gain);
  }
  onSettingsChange((key) => {
    for (const bus of ['music', 'sfx', 'ambience'] as const) {
      if (key === SETTING_KEY[bus]) buses.get(bus)?.gain.setTargetAtTime(volumeGain(loadVolume(bus)), c.currentTime, 0.05);
    }
  });
  return c;
}

/** Branche le déverrouillage au premier geste et le silence quand l'onglet est caché (appelé une fois au démarrage). */
export function initAudio(): void {
  if (typeof document === 'undefined') return;
  const unlock = (): void => {
    ctx ??= createContext();
    if (!ctx) return;
    void ctx.resume().then(() => {
      if (unlocked) return;
      unlocked = true;
      for (const fn of onUnlock.splice(0)) fn();
    });
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(type, unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !unlocked) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

/** Entrée d'un bus, pour y brancher une source. */
export function busInput(bus: Bus): AudioNode | null {
  return audioContext() ? (buses.get(bus) ?? null) : null;
}

/** Vrai quand le joueur a déjà touché le clavier ou la souris (le son peut jouer). */
export function audioUnlocked(): boolean {
  return unlocked;
}

/** À appeler dès que le son peut jouer (tout de suite si c'est déjà le cas). */
export function whenUnlocked(fn: () => void): void {
  if (unlocked) fn();
  else onUnlock.push(fn);
}

/** Baisse la musique de `db` décibels pendant `ms` millisecondes (critiques, cut-ins). */
export function duckMusic(db = -6, ms = 900): void {
  const c = audioContext();
  if (!c || !duck) return;
  const t = c.currentTime;
  duck.gain.cancelScheduledValues(t);
  duck.gain.setTargetAtTime(10 ** (db / 20), t, 0.04);
  duck.gain.setTargetAtTime(1, t + ms / 1000, 0.25);
}
