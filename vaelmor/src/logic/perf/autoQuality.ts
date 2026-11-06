/**
 * Qualité automatique (lot G, n°246) : règle pure qui décide, d'après la durée des
 * images, quand baisser le réglage « Qualité des effets » (Haute → Basse → Désactivée).
 *
 * Principes :
 *  - on mesure par fenêtres de `windowMs` ; la fenêtre est « lente » si la médiane des
 *    images dépasse `slowMs` (moins de ~36 ips) ou si le 90ᵉ centile dépasse `stutterMs` ;
 *  - une image de plus de `maxFrameMs` (onglet caché, chargement d'une scène) n'est pas
 *    mesurée, et une fenêtre faite surtout de telles images ne compte pas ;
 *  - il faut `slowWindows` fenêtres lentes de suite pour baisser d'un cran, puis un répit
 *    de `graceMs` (les filtres qu'on vient de couper laissent le temps à l'image de se stabiliser) ;
 *  - on ne remonte jamais seul : un cran perdu ne revient que si le joueur le choisit
 *    (évite de faire clignoter les effets).
 *
 * Aucune dépendance à Phaser ni au DOM : testé dans `tests/perf.test.ts`.
 */

export type PerfLevel = 'high' | 'low' | 'off';

/** Du plus beau au plus léger. */
export const PERF_LEVELS: readonly PerfLevel[] = ['high', 'low', 'off'];

export interface AutoQualityConfig {
  /** Durée d'une fenêtre de mesure, en ms. */
  readonly windowMs: number;
  /** Une fenêtre qui compte moins d'images mesurées que ça n'est pas jugée. */
  readonly minFrames: number;
  /** Au-delà, l'image n'est pas mesurée (pause, onglet caché, chargement). */
  readonly maxFrameMs: number;
  /** Médiane au-dessus de laquelle la fenêtre est lente (~36 ips). */
  readonly slowMs: number;
  /** 90ᵉ centile au-dessus duquel la fenêtre est lente (saccades fréquentes). */
  readonly stutterMs: number;
  /** Nombre de fenêtres lentes consécutives pour baisser d'un cran. */
  readonly slowWindows: number;
  /** Répit après un changement de cran, en ms. */
  readonly graceMs: number;
  /** Part maximale de temps « non mesuré » dans une fenêtre jugée. */
  readonly maxSkippedShare: number;
}

export const AUTO_QUALITY: AutoQualityConfig = {
  windowMs: 3000,
  minFrames: 8,
  maxFrameMs: 1000,
  slowMs: 28,
  stutterMs: 50,
  slowWindows: 2,
  graceMs: 4000,
  maxSkippedShare: 0.4,
};

export type WindowVerdict = 'slow' | 'ok' | 'void';

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index] as number;
}

/** Verdict d'une fenêtre : durées mesurées et temps passé en images non mesurées. */
export function windowVerdict(frames: readonly number[], skippedMs: number, config: AutoQualityConfig = AUTO_QUALITY): WindowVerdict {
  const measured = frames.reduce((sum, f) => sum + f, 0);
  if (frames.length < config.minFrames) return 'void';
  if (skippedMs > (measured + skippedMs) * config.maxSkippedShare) return 'void';
  const sorted = [...frames].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  return median > config.slowMs || p90 > config.stutterMs ? 'slow' : 'ok';
}

/** Cran inférieur (le dernier reste le dernier). */
export function lowerLevel(level: PerfLevel): PerfLevel {
  const next = PERF_LEVELS[PERF_LEVELS.indexOf(level) + 1];
  return next ?? level;
}

/** Lit un cran enregistré ; toute valeur inconnue donne `fallback`. */
export function parsePerfLevel(raw: unknown, fallback: PerfLevel = 'high'): PerfLevel {
  return typeof raw === 'string' && (PERF_LEVELS as readonly string[]).includes(raw) ? (raw as PerfLevel) : fallback;
}

/** Suit les images et dit quand baisser d'un cran. */
export class AutoQuality {
  private current: PerfLevel;
  private frames: number[] = [];
  private elapsed = 0;
  private skipped = 0;
  private slowStreak = 0;
  private grace = 0;

  constructor(
    start: PerfLevel = 'high',
    private readonly config: AutoQualityConfig = AUTO_QUALITY,
  ) {
    this.current = start;
  }

  get level(): PerfLevel {
    return this.current;
  }

  /** Vrai tant que le répit suivant un changement n'est pas écoulé. */
  get inGrace(): boolean {
    return this.grace > 0;
  }

  /** Repart de zéro à ce cran (réglage changé par le joueur, retour à « Automatique »). */
  reset(level: PerfLevel = 'high'): void {
    this.current = level;
    this.clearWindow();
    this.slowStreak = 0;
    this.grace = 0;
  }

  /** Une image de `deltaMs` ms vient de passer. Renvoie le nouveau cran si on vient de baisser, sinon `null`. */
  feed(deltaMs: number): PerfLevel | null {
    if (!(deltaMs > 0)) return null;
    if (this.grace > 0) {
      this.grace = Math.max(0, this.grace - deltaMs);
      return null;
    }
    if (this.current === PERF_LEVELS[PERF_LEVELS.length - 1]) return null;
    if (deltaMs > this.config.maxFrameMs) this.skipped += deltaMs;
    else this.frames.push(deltaMs);
    this.elapsed += deltaMs;
    if (this.elapsed < this.config.windowMs) return null;

    const verdict = windowVerdict(this.frames, this.skipped, this.config);
    this.clearWindow();
    if (verdict === 'void') return null;
    this.slowStreak = verdict === 'slow' ? this.slowStreak + 1 : 0;
    if (this.slowStreak < this.config.slowWindows) return null;

    this.current = lowerLevel(this.current);
    this.slowStreak = 0;
    this.grace = this.config.graceMs;
    return this.current;
  }

  private clearWindow(): void {
    this.frames = [];
    this.elapsed = 0;
    this.skipped = 0;
  }
}
