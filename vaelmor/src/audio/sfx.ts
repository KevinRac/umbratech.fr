/**
 * Bruitages de combat synthétisés (jalon M8, n°227), sans fichier : Web Audio
 * seulement. Sur GBA, chaque élan, chaque coup, chaque critique a son bruit,
 * et la barre de PV « tique » en descendant ; c'est une grande part de
 * l'impact. Ces sons sont des esquisses fidèles à cet esprit (bruit filtré,
 * oscillateurs carrés et sinus) en attendant les bruitages du jalon M10.
 *
 * Le contexte audio naît au premier son joué (toujours après un geste du
 * joueur) ; le volume « Effets sonores » à 0 les coupe (moteur commun : `audio/engine.ts`).
 */
import { audioContext, busInput, DEFAULT_VOLUMES, loadVolume, saveVolume } from './engine';

export type SfxId =
  | 'dash'
  | 'arme'
  | 'swing'
  | 'hit'
  | 'crit'
  | 'critHit'
  | 'miss'
  | 'bow'
  | 'release'
  | 'throw'
  | 'charge'
  | 'spell'
  | 'land'
  | 'tick'
  | 'ko'
  | 'heal';

/** Couleur d'un sort selon l'élément (`spell`). */
export type SfxTone = 'cendre' | 'maree' | 'racine' | 'lanterne' | 'pierre' | null;

let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastTick = 0;

/** Contexte commun (moteur audio, n°240) ; les bruitages passent par un compresseur puis le bus « effets ». */
function audio(): AudioContext | null {
  if (loadVolume('sfx') <= 0) return null;
  const ctx = audioContext();
  const bus = busInput('sfx');
  if (!ctx || !bus) return null;
  if (!master) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(comp).connect(bus);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/** Oscillateur avec glissando de `f0` à `f1` et enveloppe percussive. */
function tone(c: AudioContext, at: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, attack = 0.004): void {
  if (!master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** Bruit filtré (souffle, choc, éclaboussure) : filtre de `f0` à `f1`. */
function hiss(c: AudioContext, at: number, filter: BiquadFilterType, f0: number, f1: number, dur: number, gain: number, q = 1, attack = 0.004): void {
  if (!master || !noise) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, at);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.02);
}

/** Joue un bruitage (rien si les sons sont coupés ou indisponibles). */
export function playSfx(id: SfxId, tone_: SfxTone = null): void {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.005;
  switch (id) {
    case 'dash':
      hiss(c, t, 'bandpass', 500, 2200, 0.14, 0.35, 1.2, 0.02);
      break;
    case 'arme':
      // Lame qui tinte quand l'arme se lève.
      tone(c, t, 'square', 2400, 2300, 0.07, 0.05);
      tone(c, t + 0.012, 'triangle', 3600, 3500, 0.12, 0.06);
      break;
    case 'swing':
      hiss(c, t, 'bandpass', 1400, 5200, 0.1, 0.55, 2, 0.01);
      break;
    case 'hit':
      tone(c, t, 'sine', 150, 48, 0.14, 0.9);
      tone(c, t, 'square', 95, 60, 0.05, 0.16);
      hiss(c, t, 'lowpass', 3200, 500, 0.08, 0.7);
      break;
    case 'critHit':
      tone(c, t, 'sine', 120, 32, 0.32, 1);
      tone(c, t, 'square', 1700, 180, 0.06, 0.16);
      hiss(c, t, 'lowpass', 5200, 400, 0.16, 0.9);
      // Cymbale (GDD §11.3 : craquement grave + cymbale).
      hiss(c, t + 0.01, 'highpass', 7000, 5200, 0.6, 0.22, 0.7, 0.003);
      break;
    case 'crit':
      tone(c, t, 'triangle', 500, 1800, 0.22, 0.12, 0.02);
      hiss(c, t, 'highpass', 3000, 9000, 0.25, 0.12, 0.8, 0.05);
      break;
    case 'miss':
      hiss(c, t, 'highpass', 1800, 4200, 0.14, 0.3, 0.8, 0.01);
      tone(c, t + 0.02, 'triangle', 900, 1300, 0.08, 0.04);
      break;
    case 'bow':
      tone(c, t, 'sawtooth', 170, 240, 0.16, 0.05, 0.03);
      break;
    case 'release':
      tone(c, t, 'triangle', 620, 300, 0.14, 0.22);
      hiss(c, t, 'bandpass', 2500, 1200, 0.05, 0.25, 2);
      break;
    case 'throw':
      hiss(c, t, 'bandpass', 400, 1800, 0.22, 0.4, 1.5, 0.03);
      break;
    case 'charge':
      tone(c, t, 'sine', 220, 900, 0.5, 0.1, 0.12);
      tone(c, t, 'triangle', 330, 1350, 0.5, 0.05, 0.12);
      break;
    case 'spell':
      if (tone_ === 'cendre') {
        hiss(c, t, 'lowpass', 900, 160, 0.55, 0.85, 0.7, 0.02);
        tone(c, t, 'sine', 90, 40, 0.4, 0.5);
      } else if (tone_ === 'maree') {
        hiss(c, t, 'bandpass', 500, 1600, 0.45, 0.7, 0.8, 0.03);
        hiss(c, t + 0.12, 'bandpass', 1400, 400, 0.35, 0.4, 0.8);
      } else if (tone_ === 'racine') {
        for (let i = 0; i < 4; i++) tone(c, t + i * 0.045, 'square', 260 - i * 30, 90, 0.05, 0.12);
        hiss(c, t, 'lowpass', 1800, 300, 0.25, 0.5);
      } else if (tone_ === 'lanterne') {
        tone(c, t, 'triangle', 1320, 1320, 0.45, 0.14);
        tone(c, t + 0.03, 'triangle', 1980, 1980, 0.4, 0.1);
        tone(c, t + 0.06, 'sine', 2640, 2640, 0.35, 0.06);
      } else if (tone_ === 'pierre') {
        tone(c, t, 'sine', 80, 30, 0.4, 0.95);
        hiss(c, t, 'lowpass', 600, 120, 0.4, 0.8);
      } else {
        tone(c, t, 'square', 880, 200, 0.22, 0.12);
        hiss(c, t, 'bandpass', 2000, 600, 0.2, 0.3, 1.5);
      }
      break;
    case 'land':
      tone(c, t, 'sine', 100, 38, 0.16, 0.6);
      hiss(c, t, 'lowpass', 900, 200, 0.1, 0.35);
      break;
    case 'tick': {
      // La barre de PV qui tique (GBA) : un bip court, jamais plus d'un toutes les 45 ms.
      const now = performance.now();
      if (now - lastTick < 45) return;
      lastTick = now;
      tone(c, t, 'square', 1250, 1250, 0.028, 0.045, 0.002);
      break;
    }
    case 'ko':
      tone(c, t, 'square', 420, 70, 0.5, 0.12, 0.01);
      hiss(c, t, 'lowpass', 1200, 150, 0.5, 0.25, 0.7, 0.05);
      break;
    case 'heal':
      [660, 880, 1320, 1760].forEach((f, i) => tone(c, t + i * 0.07, 'triangle', f, f, 0.18, 0.08, 0.01));
      break;
  }
}

/** Vrai si les effets sonores ne sont pas coupés (volume > 0). */
export function soundOn(): boolean {
  return loadVolume('sfx') > 0;
}

/** Coupe les effets sonores ou leur rend leur volume par défaut (enregistré). */
export function setSoundOn(on: boolean): void {
  saveVolume('sfx', on ? DEFAULT_VOLUMES.sfx : 0);
}
