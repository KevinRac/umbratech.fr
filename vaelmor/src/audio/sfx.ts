/**
 * Bruitages du jeu (jalons M8 puis M10, lot D, décisions n°227, n°239, n°240) :
 * tout est synthétisé (`audio/synth.ts`), d'après les recettes de
 * `audio/sfxRecipes.ts`. Les sons passent par un compresseur puis le bus
 * « effets » (`audio/engine.ts`) ; le volume « Effets sonores » à 0 les coupe.
 */
import { audioContext, busInput, DEFAULT_VOLUMES, loadVolume, saveVolume } from './engine';
import { playRecipe, stepRecipe, type SfxId, type SfxTone, type StepMaterial } from './sfxRecipes';
import { Synth } from './synth';

export type { SfxId, SfxTone, StepMaterial } from './sfxRecipes';

let synth: Synth | null = null;
const last = new Map<string, number>();
/** Derniers sons demandés (debug : `window.vaelmorSfx()`), même quand le son est coupé. */
const log: string[] = [];

function remember(id: string): void {
  log.push(id);
  if (log.length > 60) log.shift();
}

export function sfxLog(): readonly string[] {
  return [...log];
}

/** Écart minimal entre deux sons identiques (un menu qui défile, la barre de PV qui tique). */
const MIN_GAP_MS: Partial<Record<SfxId, number>> = { tick: 45, cursor: 35, page: 60 };
const DEFAULT_GAP_MS = 25;

/** Synthétiseur branché sur le bus « effets » (créé au premier son, toujours après un geste). */
function voice(): Synth | null {
  if (loadVolume('sfx') <= 0) return null;
  const ctx = audioContext();
  const bus = busInput('sfx');
  if (!ctx || !bus) return null;
  if (!synth) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 6;
    comp.ratio.value = 5;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp).connect(bus);
    synth = new Synth(ctx, master);
  }
  return synth;
}

function throttled(key: string, gap: number): boolean {
  const now = performance.now();
  if (now - (last.get(key) ?? -Infinity) < gap) return true;
  last.set(key, now);
  return false;
}

/** Joue un bruitage (rien si les sons sont coupés ou indisponibles). */
export function playSfx(id: SfxId | null, tone: SfxTone = null): void {
  if (id === null) return;
  remember(tone ? `${id}:${tone}` : id);
  const v = voice();
  if (!v || throttled(id, MIN_GAP_MS[id] ?? DEFAULT_GAP_MS)) return;
  playRecipe(v, id, v.ctx.currentTime + 0.005, tone);
}

/** Un pas du héros sur une matière (monde ouvert). */
export function playStep(material: StepMaterial): void {
  remember(`pas:${material}`);
  const v = voice();
  if (!v || throttled('step', 90)) return;
  stepRecipe(v, material, v.ctx.currentTime + 0.005);
}

/** Vrai si les effets sonores ne sont pas coupés (volume > 0). */
export function soundOn(): boolean {
  return loadVolume('sfx') > 0;
}

/** Coupe les effets sonores ou leur rend leur volume par défaut (enregistré). */
export function setSoundOn(on: boolean): void {
  saveVolume('sfx', on ? DEFAULT_VOLUMES.sfx : 0);
}
