/**
 * Mesure de fluidité pour le journal de session (lot H de M10, décision n°275).
 * Logique pure : l'appelant donne la durée réelle de chaque image ; toutes les
 * `PERF_SAMPLE.windowMs` de jeu, l'échantillonneur rend une ligne de mesure
 * (images par seconde moyennes, pire image, part d'images lentes).
 *
 * C'est ce qui permet à l'auteur de vérifier les 60 ips (n°246) sur la machine
 * d'un testeur sans que celui-ci ait à regarder F3. Une pause (onglet caché,
 * fenêtre F10 ouverte) n'est pas du temps de jeu : une « image » de plus d'une
 * seconde est ignorée.
 */

export const PERF_SAMPLE = {
  /** Durée de jeu d'une fenêtre de mesure. */
  windowMs: 20_000,
  /** Au-delà, l'image n'est pas mesurée (pause, onglet caché). */
  gapMs: 1000,
  /** Une image plus longue est comptée comme lente (moins de 40 ips). */
  slowFrameMs: 25,
  /** Une fenêtre de moins d'images que cela n'est pas rendue (jeu quasi à l'arrêt). */
  minFrames: 60,
} as const;

export interface PerfSample {
  /** Images par seconde moyennes sur la fenêtre. */
  readonly fps: number;
  /** Pire image de la fenêtre, en millisecondes. */
  readonly worstMs: number;
  /** Part d'images lentes (0 à 1). */
  readonly slowShare: number;
  readonly frames: number;
}

export class PerfSampler {
  private time = 0;
  private frames = 0;
  private slow = 0;
  private worst = 0;

  /** Donne la durée d'une image ; renvoie une mesure quand la fenêtre est pleine. */
  feed(deltaMs: number): PerfSample | null {
    if (!(deltaMs > 0) || deltaMs > PERF_SAMPLE.gapMs) return null;
    this.time += deltaMs;
    this.frames += 1;
    if (deltaMs > PERF_SAMPLE.slowFrameMs) this.slow += 1;
    if (deltaMs > this.worst) this.worst = deltaMs;
    if (this.time < PERF_SAMPLE.windowMs) return null;
    const sample: PerfSample | null =
      this.frames >= PERF_SAMPLE.minFrames
        ? { fps: Math.round((this.frames / this.time) * 10_000) / 10, worstMs: Math.round(this.worst), slowShare: Math.round((this.slow / this.frames) * 1000) / 1000, frames: this.frames }
        : null;
    this.reset();
    return sample;
  }

  reset(): void {
    this.time = 0;
    this.frames = 0;
    this.slow = 0;
    this.worst = 0;
  }
}

/** Texte d'une mesure pour le journal : « 58,3 ips · pire image 41 ms · 4 % d'images lentes ». */
export function describeSample(sample: PerfSample, heapMb: number | null): string {
  const heap = heapMb === null ? '' : ` · tas ${Math.round(heapMb)} Mo`;
  return `${sample.fps.toFixed(1).replace('.', ',')} ips · pire image ${sample.worstMs} ms · ${Math.round(sample.slowShare * 100)} % d’images lentes${heap}`;
}
