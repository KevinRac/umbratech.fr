/**
 * Atmosphère HD-2D du monde ouvert (refonte graphique, étape 5 — décision n°47) :
 * réglage « Qualité », étalonnage du soir, scintillement des lumières, masque du
 * flou de profondeur. Calculs purs (sans Phaser), testés dans `tests/atmosphere.test.ts`.
 */
import { gradeMatrix, type Grade } from './grade';
import { rgb } from './palette';

/* ---------- Réglage « Qualité » (GDD §12.5) ---------- */

export type Quality = 'high' | 'low' | 'off';

export const QUALITIES: readonly Quality[] = ['high', 'low', 'off'];

export const QUALITY_LABEL: Readonly<Record<Quality, string>> = { high: 'Haute', low: 'Basse', off: 'Désactivée' };

/** Effets actifs pour un niveau de qualité. */
export interface EffectPlan {
  readonly grade: boolean;
  readonly vignette: boolean;
  readonly bloom: boolean;
  readonly tiltShift: boolean;
  readonly rays: boolean;
  readonly dust: boolean;
  readonly halos: boolean;
}

/**
 * Haute : tous les effets. Basse : étalonnage et vignettage seulement.
 * Désactivée : aucun filtre (la teinte `ambient` de la zone, posée par le HUD, reste).
 */
export function effectsFor(quality: Quality): EffectPlan {
  const high = quality === 'high';
  const some = quality !== 'off';
  return { grade: some, vignette: some, bloom: high, tiltShift: high, rays: high, dust: high, halos: high };
}

export function nextQuality(quality: Quality): Quality {
  return QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length] as Quality;
}

/** Lit une qualité enregistrée ; toute valeur inconnue donne « Haute ». */
export function parseQuality(raw: unknown): Quality {
  return typeof raw === 'string' && (QUALITIES as readonly string[]).includes(raw) ? (raw as Quality) : 'high';
}

/* ---------- Jour / soir ---------- */

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(Number.parseInt(a.slice(1), 16));
  const [br, bg, bb] = rgb(Number.parseInt(b.slice(1), 16));
  const m = (x: number, y: number): number => Math.round(x + (y - x) * t);
  return hex((m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb));
}

/** Étalonnage « soir » dérivé de celui du jour : ombres plus violettes, lumières orangées, image plus sombre. */
export function eveningGrade(day: Grade): Grade {
  return {
    shadow: mixHex(day.shadow, '#2a2450', 0.5),
    shadowAmount: clamp(day.shadowAmount + 0.1, 0, 0.5),
    light: mixHex(day.light, '#ff9c5a', 0.6),
    lightAmount: clamp(day.lightAmount + 0.08, 0, 0.5),
    saturation: clamp(day.saturation - 0.05, -0.6, 0.6),
    contrast: clamp(day.contrast + 0.04, -0.4, 0.4),
    brightness: clamp(day.brightness - 0.1, -0.3, 0.3),
  };
}

/** Mélange deux étalonnages (`t` = 0 → `a`, 1 → `b`). */
export function blendGrade(a: Grade, b: Grade, t: number): Grade {
  const k = clamp(t, 0, 1);
  const lerp = (x: number, y: number): number => x + (y - x) * k;
  return {
    shadow: mixHex(a.shadow, b.shadow, k),
    shadowAmount: lerp(a.shadowAmount, b.shadowAmount),
    light: mixHex(a.light, b.light, k),
    lightAmount: lerp(a.lightAmount, b.lightAmount),
    saturation: lerp(a.saturation, b.saturation),
    contrast: lerp(a.contrast, b.contrast),
    brightness: lerp(a.brightness, b.brightness),
  };
}

/**
 * Matrice d'étalonnage au moment `evening` (0 jour, 1 soir) : étalonnage du
 * soir, puis baisse de la lumière d'ensemble (`darkness` = part de lumière
 * retirée au soir complet), un peu moins sur le bleu pour garder une nuit
 * bleutée plutôt que noire. Les lumières (halos, bloom) s'ajoutent après.
 */
export function gradeMatrixAt(day: Grade, evening: number, darkness: number): number[] {
  const e = clamp(evening, 0, 1);
  const m = gradeMatrix(blendGrade(day, eveningGrade(day), e));
  const gains = [1 - darkness * e, 1 - darkness * 0.95 * e, 1 - darkness * 0.75 * e];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) m[row * 5 + col] = (m[row * 5 + col] as number) * (gains[row] as number);
  return m;
}

/* ---------- Halos ---------- */

export type LightKind = 'lamp' | 'fire' | 'window' | 'rune';

export const LIGHT_KINDS: readonly LightKind[] = ['lamp', 'fire', 'window', 'rune'];

export function parseLightKind(raw: unknown): LightKind | null {
  return typeof raw === 'string' && (LIGHT_KINDS as readonly string[]).includes(raw) ? (raw as LightKind) : null;
}

/**
 * Scintillement (multiplicateur d'opacité entre ~0,6 et 1) : somme de sinus
 * décalée par lumière, pour qu'aucune ne batte au même rythme. Les feux
 * dansent vite, les lanternes frémissent, les fenêtres respirent, les runes pulsent.
 */
export function flicker(t: number, seed: number, kind: LightKind): number {
  const s = seed * 12.9898;
  switch (kind) {
    case 'fire':
      return 0.8 + 0.1 * Math.sin(t * 9.1 + s) + 0.06 * Math.sin(t * 23.7 + s * 1.7) + 0.04 * Math.sin(t * 41.3 + s * 0.3);
    case 'lamp':
      return 0.9 + 0.06 * Math.sin(t * 5.3 + s) + 0.04 * Math.sin(t * 13.1 + s * 2.1);
    case 'window':
      return 0.94 + 0.04 * Math.sin(t * 2.1 + s) + 0.02 * Math.sin(t * 7.7 + s);
    case 'rune':
      return 0.82 + 0.18 * Math.sin(t * 1.6 + s);
  }
}

/**
 * Intensité d'un halo selon le moment de la journée : les fenêtres ne
 * s'allument qu'au soir, les autres lumières gardent `dayFactor` en plein jour.
 */
export function haloStrength(kind: LightKind, evening: number, dayFactor: number): number {
  const e = clamp(evening, 0, 1);
  return kind === 'window' ? e : dayFactor + (1 - dayFactor) * e;
}

/* ---------- Flou de profondeur ---------- */

/**
 * Opacité de l'image floutée à la hauteur `v` de l'écran (0 haut, 1 bas) :
 * nulle dans la bande nette centrale de hauteur `focus`, pleine après un fondu `fade`.
 */
export function tiltMaskAlpha(v: number, focus: number, fade: number): number {
  const d = Math.abs(v - 0.5) - focus / 2;
  if (d <= 0) return 0;
  if (fade <= 0) return 1;
  const x = clamp(d / fade, 0, 1);
  return x * x * (3 - 2 * x);
}
