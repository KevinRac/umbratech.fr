/**
 * Recettes des bruitages (jalon M10, lot D, décisions n°239 et n°240).
 *
 * Chaque recette pose des couches sur une `Voice` (synthétiseur du jeu, de la
 * planche d'écoute, ou faux synthétiseur des tests) à partir de l'instant `t`.
 * Les niveaux sont mixés entre eux : un coup critique est le son le plus fort
 * (crête ≈ 1), un pas ou un curseur est discret (≤ 0,1).
 */
import type { NoiseParams, ToneParams, Voice } from './synth';

/** Sons de combat (M8, refaits au lot D). */
export const COMBAT_SFX = ['dash', 'arme', 'swing', 'hit', 'crit', 'critHit', 'miss', 'bow', 'release', 'throw', 'charge', 'spell', 'land', 'tick', 'ko', 'heal'] as const;
/** Sons d'interface (lot D). */
export const UI_SFX = ['cursor', 'confirm', 'cancel', 'refuse', 'menuOpen', 'menuClose', 'page', 'buy', 'notify', 'item', 'quest', 'levelUp', 'repUp', 'repDown', 'save'] as const;
/** Sons du monde (lot D). Les pas sont à part (`stepSfx`). */
export const WORLD_SFX = ['alert', 'battleStart', 'villageEnter', 'travel', 'gate'] as const;

export type SfxId = (typeof COMBAT_SFX)[number] | (typeof UI_SFX)[number] | (typeof WORLD_SFX)[number];

/** Couleur d'un sort selon l'élément (`spell`). */
export type SfxTone = 'cendre' | 'maree' | 'racine' | 'lanterne' | 'pierre' | null;
export const SPELL_TONES: readonly SfxTone[] = ['cendre', 'maree', 'racine', 'lanterne', 'pierre', null];

/** Matières des pas (n°239 : pas selon le sol). */
export const STEP_MATERIALS = ['herbe', 'terre', 'pave', 'bois', 'sable', 'boue', 'eau', 'feuilles', 'gravier'] as const;
export type StepMaterial = (typeof STEP_MATERIALS)[number];

/** Ambiances en boucle (bus ambiance). */
export const AMBIENCES = ['plaine', 'foret', 'ressac', 'marais', 'braises'] as const;
export type AmbienceId = (typeof AMBIENCES)[number];

type Tone = Omit<ToneParams, 'at'>;
type Noise = Omit<NoiseParams, 'at'>;

/** Petite aide : poser une couche à `t + dt`. */
function at(v: Voice, t: number) {
  return {
    tone: (dt: number, p: Tone) => v.tone({ ...p, at: t + dt }),
    noise: (dt: number, p: Noise) => v.noise({ ...p, at: t + dt }),
  };
}

/** Variation douce (± `amount`) pour que deux sons identiques ne sonnent pas pareil. */
const vary = (v: Voice, amount: number): number => 1 + (v.random() * 2 - 1) * amount;

/**
 * Table de mixage (n°240) : correction de niveau de chaque son, en dB, réglée
 * à l'écoute et à la mesure (`npm run sfx-board`) contre la musique (≈ −19 LUFS
 * en crête momentanée au volume par défaut). Repères : critique et passage au
 * combat ≈ −20, coups ≈ −25, souffles ≈ −30, interface ≈ −34, pas ≈ −41.
 */
export const SFX_LEVEL_DB: Readonly<Partial<Record<SfxId, number>>> = {
  hit: 2,
  dash: 6,
  swing: 6,
  throw: 6,
  release: 6,
  arme: 3,
  bow: 7,
  miss: 2,
  tick: 4,
  cursor: 5,
  confirm: 8,
  cancel: 9,
  refuse: 7,
  menuOpen: 6,
  menuClose: 10,
  page: 14,
  buy: 1,
  notify: 3,
  item: 1,
  repUp: 3,
  repDown: 5,
  alert: 10,
  villageEnter: 2,
  travel: 3,
  gate: 4,
};
/** Correction des sorts selon l'élément (dB). */
const SPELL_LEVEL_DB: Readonly<Record<string, number>> = { maree: 2, null: 7 };
/** Correction des pas selon la matière (dB). */
export const STEP_LEVEL_DB: Readonly<Partial<Record<StepMaterial, number>>> = { herbe: 9, terre: 6, pave: 1, bois: -1, sable: 4, boue: 2, eau: 5, gravier: 8 };

/** Voix dont toutes les couches sont multipliées par `k`. */
export function scaled(v: Voice, db: number): Voice {
  if (!db) return v;
  const k = 10 ** (db / 20);
  return {
    tone: (p) => v.tone({ ...p, gain: Math.min(1, p.gain * k) }),
    noise: (p) => v.noise({ ...p, gain: Math.min(1, p.gain * k) }),
    random: () => v.random(),
  };
}

/** Joue un bruitage à l'instant `t`. Renvoie sa durée approximative (s). */
export function playRecipe(voice: Voice, id: SfxId, t: number, tone: SfxTone = null): number {
  const v = scaled(voice, id === 'spell' ? (SPELL_LEVEL_DB[String(tone)] ?? 0) : (SFX_LEVEL_DB[id] ?? 0));
  const L = at(v, t);
  const p = vary(v, 0.03);
  switch (id) {
    /* ---------------- Combat ---------------- */
    case 'dash':
      // Élan : souffle qui monte, appui au sol.
      L.noise(0, { filter: 'bandpass', f: 380 * p, f1: 2600 * p, q: 1.1, dur: 0.2, gain: 0.42, attack: 0.06, color: 'pink' });
      L.noise(0, { filter: 'lowpass', f: 320, f1: 140, dur: 0.12, gain: 0.25, color: 'brown' });
      L.noise(0.03, { filter: 'highpass', f: 3500, f1: 6500, dur: 0.12, gain: 0.08, attack: 0.04 });
      return 0.22;
    case 'arme':
      // Lame qui tinte quand l'arme se lève (métal en modulation de fréquence).
      L.tone(0, { wave: 'sine', f: 2350 * p, fm: { ratio: 2.76, index: 0.7 }, dur: 0.45, gain: 0.07, attack: 0.002, wet: 0.35 });
      L.tone(0.012, { wave: 'triangle', f: 3520 * p, dur: 0.3, gain: 0.035, wet: 0.3 });
      L.noise(0, { filter: 'highpass', f: 5000, dur: 0.04, gain: 0.06 });
      return 0.45;
    case 'swing':
      // Fendre l'air : souffle étroit qui monte vite, plus une pointe d'air.
      L.noise(0, { filter: 'bandpass', f: 800 * p, f1: 5400 * p, q: 2.4, dur: 0.14, gain: 0.6, attack: 0.025 });
      L.noise(0.02, { filter: 'highpass', f: 4000, f1: 7000, dur: 0.1, gain: 0.14, attack: 0.03 });
      return 0.16;
    case 'hit':
      // Choc : corps grave, attaque mate, claquement.
      L.tone(0, { wave: 'sine', f: 170 * p, f1: 44, dur: 0.2, gain: 0.85, attack: 0.002 });
      L.tone(0, { wave: 'square', f: 115 * p, f1: 60, dur: 0.06, gain: 0.14, lowpass: 1200 });
      L.noise(0, { filter: 'lowpass', f: 3800, f1: 380, dur: 0.1, gain: 0.62 });
      L.noise(0, { filter: 'highpass', f: 2600, dur: 0.03, gain: 0.28 });
      L.noise(0.004, { filter: 'bandpass', f: 900, q: 1.5, dur: 0.12, gain: 0.12, wet: 0.25 });
      return 0.25;
    case 'critHit':
      // Coup critique : craquement grave, deuxième onde, cymbale (GDD §11.3).
      L.tone(0, { wave: 'sine', f: 140 * p, f1: 30, dur: 0.45, gain: 1, attack: 0.002 });
      L.tone(0, { wave: 'square', f: 1900, f1: 160, dur: 0.07, gain: 0.16, lowpass: 3000 });
      L.noise(0, { filter: 'lowpass', f: 6500, f1: 280, dur: 0.22, gain: 0.9 });
      L.noise(0, { filter: 'highpass', f: 3000, dur: 0.04, gain: 0.35 });
      L.tone(0.06, { wave: 'sine', f: 95, f1: 34, dur: 0.32, gain: 0.5 });
      L.noise(0.008, { filter: 'highpass', f: 7200, f1: 5200, dur: 1.0, gain: 0.2, attack: 0.003, wet: 0.45 });
      L.noise(0.008, { filter: 'bandpass', f: 4200, q: 3, dur: 0.6, gain: 0.08, wet: 0.4 });
      return 1.0;
    case 'crit':
      // Préparation du critique : montée qui scintille.
      L.tone(0, { wave: 'triangle', f: 380, f1: 1900, dur: 0.3, gain: 0.12, attack: 0.04, wet: 0.35 });
      L.tone(0.02, { wave: 'sine', f: 1150, f1: 3600, dur: 0.3, gain: 0.05, attack: 0.05, wet: 0.4 });
      L.noise(0, { filter: 'highpass', f: 2500, f1: 9500, dur: 0.32, gain: 0.13, attack: 0.12 });
      return 0.35;
    case 'miss':
      // Esquive : souffle léger qui passe à côté.
      L.noise(0, { filter: 'highpass', f: 1500 * p, f1: 4800, dur: 0.17, gain: 0.3, attack: 0.03, pan: 0.35 });
      L.tone(0.02, { wave: 'triangle', f: 950, f1: 1450, dur: 0.09, gain: 0.04, pan: 0.35 });
      return 0.2;
    case 'bow':
      // Corde qu'on tend : grincement de bois.
      L.tone(0, { wave: 'sawtooth', f: 155, f1: 235, dur: 0.24, gain: 0.06, attack: 0.06, lowpass: 900 });
      L.noise(0, { filter: 'bandpass', f: 800, f1: 1100, q: 7, dur: 0.22, gain: 0.08, attack: 0.05 });
      return 0.25;
    case 'release':
      // Corde lâchée : claquement et vibration.
      L.tone(0, { wave: 'triangle', f: 640 * p, f1: 290, dur: 0.17, gain: 0.22 });
      L.tone(0, { wave: 'square', f: 205, f1: 185, dur: 0.14, gain: 0.05, lowpass: 1500 });
      L.noise(0, { filter: 'bandpass', f: 2700, f1: 1100, q: 2, dur: 0.07, gain: 0.3 });
      L.noise(0.03, { filter: 'bandpass', f: 1200, f1: 3500, q: 1.5, dur: 0.16, gain: 0.12, attack: 0.03 });
      return 0.2;
    case 'throw':
      L.noise(0, { filter: 'bandpass', f: 330, f1: 1700, q: 1.4, dur: 0.26, gain: 0.42, attack: 0.05, color: 'pink' });
      L.noise(0.05, { filter: 'highpass', f: 3000, dur: 0.15, gain: 0.06, attack: 0.05 });
      return 0.28;
    case 'charge':
      // Magie qui se rassemble.
      L.tone(0, { wave: 'sine', f: 220, f1: 880, dur: 0.6, gain: 0.1, attack: 0.18, wet: 0.5 });
      L.tone(0, { wave: 'triangle', f: 331, f1: 1320, dur: 0.6, gain: 0.05, attack: 0.18, wet: 0.5, vibrato: { rate: 9, depth: 0.01 } });
      L.noise(0, { filter: 'bandpass', f: 600, f1: 3200, q: 4, dur: 0.6, gain: 0.07, attack: 0.35 });
      return 0.6;
    case 'spell':
      return spell(v, t, tone, p);
    case 'land':
      L.tone(0, { wave: 'sine', f: 115 * p, f1: 38, dur: 0.22, gain: 0.6 });
      L.noise(0, { filter: 'lowpass', f: 950, f1: 170, dur: 0.14, gain: 0.38, color: 'pink' });
      L.noise(0.01, { filter: 'bandpass', f: 1800, q: 1, dur: 0.18, gain: 0.05, attack: 0.03 });
      return 0.25;
    case 'tick':
      // La barre de PV qui tique (GBA).
      L.tone(0, { wave: 'square', f: 1250, dur: 0.03, gain: 0.045, attack: 0.002, lowpass: 3200 });
      return 0.03;
    case 'ko':
      // Chute : note qui s'effondre, souffle, corps au sol.
      L.tone(0, { wave: 'square', f: 420, f1: 65, dur: 0.6, gain: 0.11, attack: 0.01, lowpass: 1600, wet: 0.3 });
      L.tone(0, { wave: 'triangle', f: 210, f1: 40, dur: 0.6, gain: 0.12, attack: 0.01 });
      L.noise(0, { filter: 'lowpass', f: 1300, f1: 140, dur: 0.55, gain: 0.22, attack: 0.05, color: 'pink' });
      L.tone(0.38, { wave: 'sine', f: 95, f1: 38, dur: 0.22, gain: 0.45 });
      L.noise(0.38, { filter: 'lowpass', f: 700, f1: 150, dur: 0.15, gain: 0.25, color: 'brown' });
      return 0.65;
    case 'heal':
      // Lumière qui monte : arpège doux et scintillement.
      [660, 880, 1320, 1760].forEach((f, i) => L.tone(i * 0.07, { wave: 'triangle', f, dur: 0.35, gain: 0.07, attack: 0.012, wet: 0.6 }));
      [1320, 1980].forEach((f, i) => L.tone(0.05 + i * 0.12, { wave: 'sine', f: f * 2, dur: 0.3, gain: 0.02, wet: 0.7 }));
      L.noise(0.05, { filter: 'highpass', f: 5500, f1: 9000, dur: 0.6, gain: 0.04, attack: 0.15 });
      return 0.7;

    /* ---------------- Interface ---------------- */
    case 'cursor':
      // Petit clic boisé, très court (souvent répété).
      L.tone(0, { wave: 'sine', f: 1500 * vary(v, 0.01), f1: 1300, dur: 0.04, gain: 0.055, attack: 0.001 });
      L.noise(0, { filter: 'bandpass', f: 3800, q: 2, dur: 0.018, gain: 0.05 });
      return 0.04;
    case 'confirm':
      L.tone(0, { wave: 'triangle', f: 880, dur: 0.09, gain: 0.075, attack: 0.002 });
      L.tone(0.055, { wave: 'triangle', f: 1320, dur: 0.14, gain: 0.07, attack: 0.002, wet: 0.2 });
      L.noise(0, { filter: 'bandpass', f: 3200, q: 2, dur: 0.02, gain: 0.05 });
      return 0.2;
    case 'cancel':
      L.tone(0, { wave: 'triangle', f: 700, f1: 520, dur: 0.1, gain: 0.07 });
      L.tone(0.06, { wave: 'triangle', f: 520, f1: 360, dur: 0.13, gain: 0.06 });
      return 0.19;
    case 'refuse':
      // Bourdon sourd, deux fois : « non ».
      L.tone(0, { wave: 'square', f: 196, dur: 0.07, gain: 0.07, lowpass: 900 });
      L.tone(0.09, { wave: 'square', f: 185, dur: 0.1, gain: 0.07, lowpass: 900 });
      return 0.2;
    case 'menuOpen':
      // Parchemin qu'on déroule.
      L.noise(0, { filter: 'bandpass', f: 1600, f1: 3800, q: 0.8, dur: 0.2, gain: 0.16, attack: 0.04, color: 'pink' });
      L.noise(0.02, { filter: 'highpass', f: 5000, dur: 0.12, gain: 0.04, attack: 0.03 });
      L.tone(0.03, { wave: 'triangle', f: 523, f1: 784, dur: 0.16, gain: 0.045, wet: 0.25 });
      return 0.22;
    case 'menuClose':
      L.noise(0, { filter: 'bandpass', f: 3600, f1: 1400, q: 0.8, dur: 0.16, gain: 0.14, attack: 0.02, color: 'pink' });
      L.tone(0.02, { wave: 'triangle', f: 700, f1: 470, dur: 0.12, gain: 0.04 });
      return 0.18;
    case 'page':
      // Réplique suivante : page tournée, discrète.
      L.noise(0, { filter: 'bandpass', f: 2400, f1: 3000, q: 1, dur: 0.07, gain: 0.08, attack: 0.012, color: 'pink' });
      L.tone(0, { wave: 'sine', f: 1100, dur: 0.035, gain: 0.025 });
      return 0.07;
    case 'buy':
      // Pièces qui tintent.
      [0, 0.065, 0.14].forEach((dt, i) =>
        L.tone(dt + v.random() * 0.015, { wave: 'sine', f: [2800, 3350, 3050][i]! * vary(v, 0.02), fm: { ratio: 1.41, index: 1.3 }, dur: 0.22, gain: 0.065, attack: 0.001, wet: 0.25 }),
      );
      L.noise(0, { filter: 'highpass', f: 6000, dur: 0.05, gain: 0.04 });
      return 0.36;
    case 'notify':
      L.tone(0, { wave: 'sine', f: 1046, dur: 0.45, gain: 0.07, wet: 0.5 });
      L.tone(0.07, { wave: 'sine', f: 1568, dur: 0.4, gain: 0.05, wet: 0.5 });
      return 0.47;
    case 'item':
      // Objet obtenu : couvercle de bois, puis éclat.
      L.noise(0, { filter: 'lowpass', f: 700, f1: 300, dur: 0.12, gain: 0.18, color: 'brown' });
      L.tone(0, { wave: 'sine', f: 180, f1: 130, dur: 0.1, gain: 0.12 });
      L.tone(0.1, { wave: 'sine', f: 2093, fm: { ratio: 3.01, index: 0.4 }, dur: 0.5, gain: 0.055, wet: 0.5 });
      L.tone(0.16, { wave: 'sine', f: 2637, dur: 0.4, gain: 0.04, wet: 0.5 });
      return 0.56;
    case 'quest':
      // Quête terminée, recrue : courte fanfare.
      [523, 659, 784].forEach((f, i) => L.tone(i * 0.075, { wave: 'triangle', f, dur: 0.12, gain: 0.07 }));
      L.tone(0.225, { wave: 'triangle', f: 1046, dur: 0.6, gain: 0.08, wet: 0.4, hold: 0.15 });
      L.tone(0.225, { wave: 'square', f: 523, dur: 0.55, gain: 0.025, lowpass: 1800, hold: 0.15, wet: 0.3 });
      L.tone(0.225, { wave: 'triangle', f: 784, dur: 0.6, gain: 0.04, hold: 0.15, wet: 0.4 });
      return 0.85;
    case 'levelUp':
      // Montée de niveau, esprit GBA : gamme vive puis accord tenu.
      [784, 988, 1175, 1568].forEach((f, i) => L.tone(i * 0.065, { wave: 'square', f, dur: 0.09, gain: 0.05, lowpass: 3200 }));
      L.tone(0.26, { wave: 'square', f: 1568, dur: 0.55, gain: 0.05, lowpass: 3200, hold: 0.2, wet: 0.3 });
      L.tone(0.26, { wave: 'triangle', f: 1976, dur: 0.55, gain: 0.05, hold: 0.2, wet: 0.35 });
      L.tone(0.26, { wave: 'triangle', f: 1175, dur: 0.6, gain: 0.05, hold: 0.2, wet: 0.35 });
      return 0.86;
    case 'repUp':
      L.tone(0, { wave: 'sine', f: 880, fm: { ratio: 2, index: 0.3 }, dur: 0.3, gain: 0.07, wet: 0.4 });
      L.tone(0.1, { wave: 'sine', f: 1175, fm: { ratio: 2, index: 0.3 }, dur: 0.45, gain: 0.07, wet: 0.4 });
      return 0.55;
    case 'repDown':
      L.tone(0, { wave: 'triangle', f: 440, dur: 0.22, gain: 0.08, lowpass: 1500 });
      L.tone(0.14, { wave: 'triangle', f: 349, dur: 0.35, gain: 0.08, lowpass: 1500, wet: 0.2 });
      return 0.5;
    case 'save':
      // Lanterne qui s'allume : accord clair et souffle.
      L.noise(0, { filter: 'bandpass', f: 600, f1: 1800, q: 0.7, dur: 0.4, gain: 0.06, attack: 0.15, color: 'pink' });
      [784, 1175, 1568].forEach((f, i) => L.tone(0.05 + i * 0.04, { wave: 'sine', f, dur: 0.9, gain: 0.05, attack: 0.02, wet: 0.7 }));
      return 0.95;

    /* ---------------- Monde ---------------- */
    case 'alert':
      // Le « ! » d'un ennemi qui vous voit.
      L.tone(0, { wave: 'triangle', f: 1050, f1: 1580, dur: 0.07, gain: 0.1, attack: 0.002 });
      L.tone(0.07, { wave: 'square', f: 1580, dur: 0.12, gain: 0.05, lowpass: 3000, wet: 0.2 });
      L.noise(0, { filter: 'highpass', f: 4000, dur: 0.05, gain: 0.05 });
      return 0.2;
    case 'battleStart':
      // Passage au combat (flash et zoom, 400 ms) : souffle qui monte, puis impact.
      L.noise(0, { filter: 'bandpass', f: 500, f1: 6000, q: 0.9, dur: 0.4, gain: 0.3, attack: 0.33, color: 'pink' });
      L.tone(0, { wave: 'sawtooth', f: 110, f1: 440, dur: 0.4, gain: 0.04, attack: 0.3, lowpass: 2000 });
      L.tone(0.38, { wave: 'sine', f: 150, f1: 38, dur: 0.45, gain: 0.75, attack: 0.002 });
      L.noise(0.38, { filter: 'lowpass', f: 4000, f1: 300, dur: 0.3, gain: 0.55 });
      L.noise(0.385, { filter: 'highpass', f: 6500, f1: 5000, dur: 0.8, gain: 0.12, wet: 0.5 });
      return 1.2;
    case 'villageEnter':
      // Cloche du village au loin.
      L.tone(0, { wave: 'sine', f: 784, fm: { ratio: 2.41, index: 1.0 }, dur: 1.6, gain: 0.06, attack: 0.003, wet: 0.6 });
      L.tone(0.35, { wave: 'sine', f: 659, fm: { ratio: 2.41, index: 1.0 }, dur: 1.6, gain: 0.05, attack: 0.003, wet: 0.6 });
      return 2;
    case 'travel':
      // Voyage rapide : souffle d'autel et lumière qui s'élève.
      L.noise(0, { filter: 'bandpass', f: 400, f1: 3200, q: 1, dur: 0.6, gain: 0.22, attack: 0.25, wet: 0.5, color: 'pink' });
      L.tone(0, { wave: 'sine', f: 440, f1: 1760, dur: 0.65, gain: 0.06, attack: 0.2, wet: 0.6 });
      L.tone(0.05, { wave: 'triangle', f: 660, f1: 2640, dur: 0.6, gain: 0.03, attack: 0.2, wet: 0.6 });
      L.noise(0.2, { filter: 'highpass', f: 6000, f1: 9000, dur: 0.6, gain: 0.04, attack: 0.2 });
      return 0.85;
    case 'gate':
      // Passage bloqué : choc sourd contre une barricade.
      L.tone(0, { wave: 'sine', f: 120, f1: 70, dur: 0.15, gain: 0.25 });
      L.noise(0, { filter: 'lowpass', f: 900, f1: 300, dur: 0.12, gain: 0.2, color: 'pink' });
      L.tone(0.12, { wave: 'square', f: 185, dur: 0.1, gain: 0.05, lowpass: 900 });
      return 0.25;
  }
}

function spell(v: Voice, t: number, tone: SfxTone, p: number): number {
  const L = at(v, t);
  switch (tone) {
    case 'cendre':
      // Brasier : grondement, souffle de feu, crépitements.
      L.noise(0, { filter: 'lowpass', f: 1300, f1: 170, dur: 0.65, gain: 0.8, attack: 0.03, wet: 0.3, color: 'pink' });
      L.tone(0, { wave: 'sine', f: 95, f1: 38, dur: 0.5, gain: 0.5 });
      for (let i = 0; i < 7; i++) L.noise(0.05 + v.random() * 0.45, { filter: 'highpass', f: 2500 + v.random() * 3000, dur: 0.012 + v.random() * 0.015, gain: 0.18 });
      return 0.65;
    case 'maree':
      // Vague : flot qui monte puis retombe, bulles.
      L.noise(0, { filter: 'bandpass', f: 380, f1: 1800, q: 0.9, dur: 0.5, gain: 0.62, attack: 0.05, wet: 0.4, color: 'pink' });
      L.noise(0.12, { filter: 'bandpass', f: 1600, f1: 380, q: 0.8, dur: 0.45, gain: 0.4, wet: 0.4, color: 'pink' });
      for (let i = 0; i < 5; i++) L.tone(0.1 + v.random() * 0.4, { wave: 'sine', f: 500 + v.random() * 400, f1: 1100 + v.random() * 500, dur: 0.04, gain: 0.05 });
      return 0.6;
    case 'racine':
      // Bois qui craque et racines qui percent.
      for (let i = 0; i < 4; i++) L.tone(i * 0.045, { wave: 'square', f: (260 - i * 30) * p, f1: 90, dur: 0.05, gain: 0.12, lowpass: 1400 });
      L.noise(0, { filter: 'lowpass', f: 1900, f1: 300, dur: 0.32, gain: 0.5, color: 'pink' });
      L.tone(0.05, { wave: 'sine', f: 75, f1: 40, dur: 0.3, gain: 0.4 });
      return 0.35;
    case 'lanterne':
      // Cloche de lumière : accord pur et scintillement.
      L.tone(0, { wave: 'sine', f: 1320, fm: { ratio: 3.5, index: 0.35 }, dur: 0.8, gain: 0.1, wet: 0.6 });
      L.tone(0.03, { wave: 'triangle', f: 1980, dur: 0.6, gain: 0.07, wet: 0.6 });
      L.tone(0.06, { wave: 'sine', f: 2640, dur: 0.5, gain: 0.05, wet: 0.6 });
      L.noise(0.02, { filter: 'highpass', f: 6000, f1: 9000, dur: 0.6, gain: 0.04, attack: 0.1 });
      return 0.8;
    case 'pierre':
      // Roc : grondement et éboulis.
      L.tone(0, { wave: 'sine', f: 80, f1: 30, dur: 0.5, gain: 0.95 });
      L.noise(0, { filter: 'lowpass', f: 700, f1: 100, dur: 0.5, gain: 0.8, color: 'brown' });
      for (let i = 0; i < 5; i++) L.noise(0.06 + v.random() * 0.3, { filter: 'bandpass', f: 900 + v.random() * 900, q: 3, dur: 0.03, gain: 0.2 });
      return 0.5;
    default:
      // Magie sans élément.
      L.tone(0, { wave: 'square', f: 880, f1: 200, dur: 0.25, gain: 0.1, lowpass: 2500, wet: 0.4 });
      L.noise(0, { filter: 'bandpass', f: 2000, f1: 600, q: 1.5, dur: 0.22, gain: 0.3, wet: 0.4 });
      return 0.3;
  }
}

/** Un pas sur une matière (gain et hauteur varient d'un pas à l'autre). */
export function stepRecipe(voice: Voice, material: StepMaterial, t: number): number {
  const v = scaled(voice, STEP_LEVEL_DB[material] ?? 0);
  const L = at(v, t);
  const g = vary(v, 0.18);
  const p = vary(v, 0.08);
  switch (material) {
    case 'herbe':
      L.noise(0, { filter: 'bandpass', f: 2300 * p, q: 0.8, dur: 0.08, gain: 0.05 * g, attack: 0.012 });
      L.noise(0, { filter: 'lowpass', f: 420, dur: 0.05, gain: 0.05 * g, color: 'brown' });
      return 0.08;
    case 'terre':
      L.noise(0, { filter: 'lowpass', f: 950 * p, f1: 320, dur: 0.07, gain: 0.1 * g, color: 'pink' });
      L.noise(0, { filter: 'bandpass', f: 1900 * p, q: 1, dur: 0.03, gain: 0.03 * g });
      return 0.07;
    case 'pave':
      L.noise(0, { filter: 'bandpass', f: 1500 * p, q: 2, dur: 0.035, gain: 0.08 * g });
      L.tone(0, { wave: 'sine', f: 190 * p, f1: 120, dur: 0.035, gain: 0.08 * g });
      L.noise(0.004, { filter: 'highpass', f: 3500, dur: 0.02, gain: 0.025 * g });
      return 0.04;
    case 'bois':
      L.tone(0, { wave: 'sine', f: 230 * p, f1: 160, dur: 0.07, gain: 0.11 * g });
      L.noise(0, { filter: 'bandpass', f: 900 * p, q: 3, dur: 0.06, gain: 0.06 * g });
      return 0.07;
    case 'sable':
      L.noise(0, { filter: 'bandpass', f: 3400 * p, q: 0.6, dur: 0.1, gain: 0.055 * g, attack: 0.018 });
      L.noise(0, { filter: 'lowpass', f: 500, dur: 0.05, gain: 0.03 * g, color: 'brown' });
      return 0.1;
    case 'boue':
      L.noise(0, { filter: 'lowpass', f: 520 * p, f1: 200, dur: 0.13, gain: 0.1 * g, attack: 0.02, color: 'brown' });
      L.tone(0.01, { wave: 'sine', f: 130 * p, f1: 90, dur: 0.09, gain: 0.05 * g });
      L.noise(0.04, { filter: 'bandpass', f: 900, f1: 1700, q: 2, dur: 0.07, gain: 0.04 * g });
      return 0.13;
    case 'eau':
      L.noise(0, { filter: 'bandpass', f: 1200 * p, f1: 2500, q: 1, dur: 0.12, gain: 0.09 * g, attack: 0.008, color: 'pink' });
      L.tone(0.02, { wave: 'sine', f: 700 * p, f1: 1150, dur: 0.04, gain: 0.025 * g });
      return 0.12;
    case 'feuilles':
      L.noise(0, { filter: 'highpass', f: 2600 * p, dur: 0.08, gain: 0.05 * g, attack: 0.01 });
      L.noise(0.01, { filter: 'bandpass', f: 1200 * p, q: 1.5, dur: 0.06, gain: 0.05 * g });
      L.noise(0, { filter: 'lowpass', f: 400, dur: 0.04, gain: 0.04 * g, color: 'brown' });
      return 0.08;
    case 'gravier':
      L.noise(0, { filter: 'bandpass', f: 2800 * p, q: 1.5, dur: 0.07, gain: 0.06 * g });
      for (let i = 0; i < 3; i++) L.noise(v.random() * 0.05, { filter: 'bandpass', f: 3000 + v.random() * 2500, q: 4, dur: 0.012, gain: 0.04 * g });
      L.noise(0, { filter: 'lowpass', f: 600, dur: 0.04, gain: 0.04 * g, color: 'brown' });
      return 0.08;
  }
}

/* ---------------- Ambiances ---------------- */

/** Nappe continue : bruit filtré en boucle, avec un lent balancement du volume (et du filtre). */
export interface AmbienceBed {
  readonly color: 'white' | 'pink' | 'brown';
  readonly filter: BiquadFilterType;
  readonly f: number;
  readonly q?: number;
  readonly gain: number;
  /** Balancement du volume : fréquence (Hz) et profondeur (0 à 1). */
  readonly swell?: { readonly rate: number; readonly depth: number };
  /** Balancement du filtre : fréquence (Hz) et amplitude (Hz). */
  readonly sweep?: { readonly rate: number; readonly depth: number };
  readonly pan?: number;
}

/** Événement ponctuel : joué au hasard toutes les `every[0]` à `every[1]` secondes. */
export interface AmbienceEvent {
  readonly name: string;
  readonly every: readonly [number, number];
  /** Correction de niveau de l'événement (dB, table de mixage). */
  readonly db?: number;
  readonly play: (v: Voice, t: number) => void;
}

export interface AmbienceDef {
  /** Correction de niveau de toute l'ambiance (dB, table de mixage). */
  readonly levelDb: number;
  readonly beds: readonly AmbienceBed[];
  readonly events: readonly AmbienceEvent[];
}

const side = (v: Voice): number => (v.random() * 2 - 1) * 0.8;

/** Chant d'oiseau : quelques notes rapides en glissando (deux espèces). */
function bird(v: Voice, t: number, base: number, gain: number): void {
  const pan = side(v);
  const notes = 2 + Math.floor(v.random() * 4);
  const f0 = base * (0.85 + v.random() * 0.3);
  let dt = 0;
  for (let i = 0; i < notes; i++) {
    const up = v.random() < 0.6;
    const len = 0.05 + v.random() * 0.07;
    v.tone({ at: t + dt, wave: 'sine', f: f0 * (up ? 0.85 : 1.25), f1: f0 * (up ? 1.3 : 0.9), dur: len, gain: gain * (0.7 + v.random() * 0.3), attack: 0.008, pan, wet: 0.3 });
    dt += len + 0.02 + v.random() * 0.05;
  }
}

function cricket(v: Voice, t: number, gain: number): void {
  const pan = side(v);
  const f = 4300 + v.random() * 600;
  const chirps = 2 + Math.floor(v.random() * 3);
  for (let i = 0; i < chirps; i++) v.tone({ at: t + i * 0.16, wave: 'sine', f, dur: 0.1, gain, attack: 0.01, pan, tremolo: { rate: 55, depth: 0.9 } });
}

function gull(v: Voice, t: number): void {
  const pan = side(v);
  const n = 2 + Math.floor(v.random() * 2);
  for (let i = 0; i < n; i++) {
    const f = 1500 + v.random() * 300;
    v.tone({ at: t + i * 0.28, wave: 'triangle', f: f * 1.15, f1: f * 0.8, dur: 0.22, gain: 0.03, attack: 0.02, pan, wet: 0.5, vibrato: { rate: 22, depth: 0.025 }, lowpass: 3500 });
  }
}

function waveCrash(v: Voice, t: number): void {
  const pan = side(v) * 0.6;
  v.noise({ at: t, filter: 'lowpass', f: 2400, f1: 350, dur: 2.6, gain: 0.12, attack: 0.9, pan, color: 'pink', wet: 0.3 });
  v.noise({ at: t + 0.7, filter: 'highpass', f: 3000, f1: 1500, dur: 2.0, gain: 0.04, attack: 0.3, pan });
}

function frog(v: Voice, t: number): void {
  const pan = side(v);
  const f = 95 + v.random() * 60;
  const n = 1 + Math.floor(v.random() * 3);
  for (let i = 0; i < n; i++) v.tone({ at: t + i * 0.32, wave: 'square', f: f * 1.1, f1: f * 0.9, dur: 0.22, gain: 0.035, attack: 0.02, lowpass: 900, pan, tremolo: { rate: 28 + v.random() * 10, depth: 0.95 } });
}

function bubble(v: Voice, t: number): void {
  const pan = side(v);
  const n = 1 + Math.floor(v.random() * 3);
  for (let i = 0; i < n; i++) {
    const f = 260 + v.random() * 250;
    v.tone({ at: t + i * (0.08 + v.random() * 0.1), wave: 'sine', f, f1: f * 2.2, dur: 0.06, gain: 0.03, pan });
  }
}

function crackle(v: Voice, t: number): void {
  const pan = side(v) * 0.5;
  const n = 1 + Math.floor(v.random() * 4);
  for (let i = 0; i < n; i++) v.noise({ at: t + v.random() * 0.15, filter: 'highpass', f: 2000 + v.random() * 4000, dur: 0.004 + v.random() * 0.012, gain: 0.04 + v.random() * 0.05, attack: 0.001, pan });
}

function emberPop(v: Voice, t: number): void {
  const pan = side(v) * 0.5;
  v.noise({ at: t, filter: 'bandpass', f: 1200, q: 2, dur: 0.02, gain: 0.08, pan });
  v.noise({ at: t + 0.02, filter: 'highpass', f: 4000, f1: 2500, dur: 0.5, gain: 0.02, attack: 0.05, pan });
}

function anvil(v: Voice, t: number): void {
  // Marteau d'une forge au loin (Pierre-Haute).
  const pan = side(v);
  const n = 2 + Math.floor(v.random() * 2);
  for (let i = 0; i < n; i++) v.tone({ at: t + i * 0.55, wave: 'sine', f: 1320, fm: { ratio: 2.76, index: 0.9 }, dur: 0.6, gain: 0.018, attack: 0.001, pan, wet: 0.8, lowpass: 2500 });
}

function woodpecker(v: Voice, t: number): void {
  const pan = side(v);
  for (let i = 0; i < 9; i++) v.noise({ at: t + i * 0.055, filter: 'bandpass', f: 1100, q: 6, dur: 0.02, gain: 0.05 * (1 - i * 0.06), pan, wet: 0.4 });
}

function dove(v: Voice, t: number): void {
  const pan = side(v);
  [0, 0.45, 0.75].forEach((dt, i) => v.tone({ at: t + dt, wave: 'sine', f: [430, 400, 380][i]!, f1: [400, 380, 360][i]!, dur: 0.35, gain: 0.025, attack: 0.08, pan, wet: 0.5 }));
}

function leavesGust(v: Voice, t: number): void {
  v.noise({ at: t, filter: 'bandpass', f: 2600, f1: 3400, q: 0.6, dur: 2.2, gain: 0.05, attack: 0.9, pan: side(v), color: 'pink' });
}

/** Les cinq ambiances (n°239). Niveaux pensés pour le bus « ambiance » à 50. */
export const AMBIENCE_DEFS: Readonly<Record<AmbienceId, AmbienceDef>> = {
  plaine: {
    levelDb: 0,
    beds: [
      { color: 'brown', filter: 'lowpass', f: 520, gain: 0.32, swell: { rate: 0.07, depth: 0.6 }, sweep: { rate: 0.05, depth: 180 } },
      { color: 'pink', filter: 'bandpass', f: 1300, q: 0.7, gain: 0.05, swell: { rate: 0.11, depth: 0.8 }, pan: 0.3 },
    ],
    events: [
      { name: 'alouette', db: 10, every: [2.5, 7], play: (v, t) => bird(v, t, 3400, 0.03) },
      { name: 'passereau', db: 10, every: [5, 12], play: (v, t) => bird(v, t, 2300, 0.035) },
      { name: 'grillon', db: 8, every: [4, 10], play: (v, t) => cricket(v, t, 0.012) },
    ],
  },
  foret: {
    levelDb: 2,
    beds: [
      { color: 'pink', filter: 'bandpass', f: 2400, q: 0.5, gain: 0.07, swell: { rate: 0.13, depth: 0.7 }, sweep: { rate: 0.08, depth: 500 } },
      { color: 'brown', filter: 'lowpass', f: 300, gain: 0.2, swell: { rate: 0.05, depth: 0.5 } },
    ],
    events: [
      { name: 'merle', db: 9, every: [1.5, 4.5], play: (v, t) => bird(v, t, 2600, 0.035) },
      { name: 'mésange', db: 10, every: [3, 8], play: (v, t) => bird(v, t, 4200, 0.022) },
      { name: 'pic', db: 6, every: [12, 26], play: woodpecker },
      { name: 'tourterelle', db: 8, every: [14, 30], play: dove },
      { name: 'feuillage', db: 0, every: [6, 14], play: leavesGust },
    ],
  },
  ressac: {
    levelDb: -4,
    beds: [
      { color: 'pink', filter: 'lowpass', f: 900, gain: 0.3, swell: { rate: 0.11, depth: 0.85 }, sweep: { rate: 0.11, depth: 450 } },
      { color: 'white', filter: 'highpass', f: 3200, gain: 0.025, swell: { rate: 0.11, depth: 0.9 } },
      { color: 'brown', filter: 'lowpass', f: 180, gain: 0.25, swell: { rate: 0.04, depth: 0.4 } },
    ],
    events: [
      { name: 'goéland', db: 8, every: [7, 16], play: gull },
      { name: 'vague', db: 2, every: [5, 10], play: waveCrash },
    ],
  },
  marais: {
    levelDb: 2,
    beds: [
      { color: 'brown', filter: 'lowpass', f: 240, gain: 0.28, swell: { rate: 0.04, depth: 0.5 } },
      { color: 'white', filter: 'bandpass', f: 4600, q: 9, gain: 0.03, swell: { rate: 0.09, depth: 0.8 } },
    ],
    events: [
      { name: 'grenouille', db: 7, every: [1.5, 5], play: frog },
      { name: 'bulles', db: 6, every: [3, 8], play: bubble },
      { name: 'grillon', db: 8, every: [5, 12], play: (v, t) => cricket(v, t, 0.008) },
    ],
  },
  braises: {
    levelDb: 2,
    beds: [
      { color: 'pink', filter: 'bandpass', f: 650, q: 0.6, gain: 0.12, swell: { rate: 0.06, depth: 0.75 }, sweep: { rate: 0.04, depth: 250 } },
      { color: 'brown', filter: 'lowpass', f: 120, gain: 0.3, swell: { rate: 0.03, depth: 0.3 } },
    ],
    events: [
      { name: 'crépitement', db: 8, every: [0.12, 0.7], play: crackle },
      { name: 'braise', db: 6, every: [3, 8], play: emberPop },
      { name: 'forge', db: 6, every: [14, 28], play: anvil },
    ],
  },
};
