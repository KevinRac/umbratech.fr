/**
 * Tas JS stable (lot G, n°246 : « ±10 % après 30 combats »). Calcul pur utilisé par le
 * banc `tools/perf-bench.mjs` et testé dans `tests/perf.test.ts`.
 *
 * Les premiers combats chargent des textures et des caches (c'est normal) : la référence
 * est le premier échantillon pris après `warmup` combats, pas le tas du monde au départ.
 */

export interface HeapSample {
  /** Nombre d'allers-retours monde ↔ combat déjà faits. */
  readonly combats: number;
  /** Tas JS après ramasse-miettes, en octets. */
  readonly bytes: number;
}

export interface HeapReport {
  /** Échantillon de référence (premier après le réchauffement). */
  readonly baseline: HeapSample | null;
  readonly last: HeapSample | null;
  /** Écart du dernier échantillon à la référence, en fraction (0,04 = +4 %). */
  readonly drift: number;
  /** Plus grand écart absolu à la référence parmi les échantillons suivants. */
  readonly maxDeviation: number;
  /** Pente des moindres carrés après la référence, en octets par combat. */
  readonly bytesPerCombat: number;
  /** Faux si les échantillons ne suffisent pas à conclure. */
  readonly enough: boolean;
  /** Vrai si le tas reste dans la tolérance du début à la fin. */
  readonly stable: boolean;
}

export const HEAP_TOLERANCE = 0.1;
export const HEAP_WARMUP_COMBATS = 5;

export function heapReport(samples: readonly HeapSample[], tolerance = HEAP_TOLERANCE, warmup = HEAP_WARMUP_COMBATS): HeapReport {
  const after = samples.filter((s) => s.combats >= warmup);
  const baseline = after[0] ?? null;
  const last = after.at(-1) ?? null;
  if (!baseline || !last || after.length < 2) {
    return { baseline, last, drift: 0, maxDeviation: 0, bytesPerCombat: 0, enough: false, stable: false };
  }
  const deviations = after.map((s) => (s.bytes - baseline.bytes) / baseline.bytes);
  const maxDeviation = Math.max(...deviations.map(Math.abs));
  const n = after.length;
  const meanX = after.reduce((sum, s) => sum + s.combats, 0) / n;
  const meanY = after.reduce((sum, s) => sum + s.bytes, 0) / n;
  const sxx = after.reduce((sum, s) => sum + (s.combats - meanX) ** 2, 0);
  const sxy = after.reduce((sum, s) => sum + (s.combats - meanX) * (s.bytes - meanY), 0);
  return {
    baseline,
    last,
    drift: (last.bytes - baseline.bytes) / baseline.bytes,
    maxDeviation,
    bytesPerCombat: sxx > 0 ? sxy / sxx : 0,
    enough: true,
    stable: maxDeviation <= tolerance,
  };
}
