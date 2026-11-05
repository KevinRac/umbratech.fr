/**
 * Agrégation des combats simulés et comparaison aux cibles de la décision
 * n°245 (jalon M10, lot F). Module pur.
 */
import type { BattleResult } from './battle';

/** Cibles d'équilibrage (n°245). Taux de victoire en fraction (0 à 1). */
export const TARGETS = {
  ordinary: { winMin: 0.7, winMax: 0.9, maxTurns: 8 },
  boss: { winMin: 0.45, winMax: 0.7 },
  heroClassMin: 0.5,
  combatsPerLevel: { min: 2, max: 4 },
} as const;

export interface Aggregate {
  readonly n: number;
  readonly wins: number;
  readonly winRate: number;
  /** Tours moyens des victoires (0 s'il n'y en a pas). */
  readonly turnsWin: number;
  readonly turnsAll: number;
  readonly heroFellRate: number;
  readonly fallenMean: number;
  readonly hpLeftWin: number;
  readonly timeouts: number;
  readonly itemsMean: number;
}

const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function aggregate(results: readonly BattleResult[]): Aggregate {
  const won = results.filter((r) => r.outcome === 'victory');
  return {
    n: results.length,
    wins: won.length,
    winRate: results.length === 0 ? 0 : won.length / results.length,
    turnsWin: mean(won.map((r) => r.turns)),
    turnsAll: mean(results.map((r) => r.turns)),
    heroFellRate: mean(results.map((r) => (r.heroFell ? 1 : 0))),
    fallenMean: mean(results.map((r) => r.fallen)),
    hpLeftWin: mean(won.map((r) => r.hpLeft)),
    timeouts: results.filter((r) => r.outcome === 'timeout').length,
    itemsMean: mean(results.map((r) => r.itemsUsed)),
  };
}

/** Une rencontre est dans la cible si son taux (et ses tours, hors boss) y sont. */
export function inTarget(boss: boolean, a: Aggregate): { readonly ok: boolean; readonly why: string } {
  if (boss) {
    const t = TARGETS.boss;
    if (a.winRate < t.winMin) return { ok: false, why: 'trop dur' };
    if (a.winRate > t.winMax) return { ok: false, why: 'trop facile' };
    return { ok: true, why: '' };
  }
  const t = TARGETS.ordinary;
  if (a.winRate < t.winMin) return { ok: false, why: 'trop dur' };
  if (a.winRate > t.winMax) return { ok: false, why: 'trop facile' };
  if (a.turnsWin > t.maxTurns) return { ok: false, why: 'trop long' };
  return { ok: true, why: '' };
}

export const pct = (x: number): string => `${Math.round(x * 100)} %`;

/** Nombre de combats ordinaires pour gagner un niveau, d'après l'XP moyenne gagnée par membre déployé. */
export function combatsPerLevel(xpPerFight: number, perLevel: number): number {
  return xpPerFight <= 0 ? Infinity : perLevel / xpPerFight;
}
