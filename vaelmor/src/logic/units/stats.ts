/**
 * Statistiques d'une unité selon son niveau (GDD §9.6, §10.3, §10.4).
 *
 * Tant que la montée de niveau n'existe pas (jalon M6), une unité créée à un
 * niveau supérieur à 1 reçoit la **croissance moyenne** de chaque stat :
 * `base + arrondi(croissance × (niveau − 1) / 100)` (décision n°52). C'est aussi
 * la règle définitive des ennemis : un ennemi d'un niveau donné a toujours les
 * mêmes stats, ce qui rend les combats lisibles et rejouables. La mobilité ne
 * grandit pas.
 */
import { GROWTH_KEYS, type GrowthBlock, type StatBlock } from '../../data/schemas';

export function statsAtLevel(base: StatBlock, growths: GrowthBlock, level: number): StatBlock {
  if (!Number.isInteger(level) || level < 1) throw new RangeError(`Niveau invalide : ${level}`);
  const stats = { ...base };
  for (const key of GROWTH_KEYS) stats[key] = base[key] + Math.round((growths[key] * (level - 1)) / 100);
  return stats;
}
