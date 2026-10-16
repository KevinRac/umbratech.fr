/**
 * Règles de réputation (GDD §6) — fonctions pures, pilotées par `data/reputation.json`.
 */
import type { ReputationConfig, ReputationTier } from '../../data/schemas';

/** Ramène une valeur dans l'échelle [min, max] (entier). */
export function clampReputation(value: number, config: ReputationConfig): number {
  return Math.min(config.max, Math.max(config.min, Math.round(value)));
}

/** Palier correspondant à une valeur (la valeur est d'abord bornée). */
export function getReputationTier(value: number, config: ReputationConfig): ReputationTier {
  const v = clampReputation(value, config);
  const tier = config.tiers.find((t) => v >= t.min && v <= t.max);
  if (!tier) throw new RangeError(`Aucun palier de réputation pour la valeur ${v}`);
  return tier;
}

/** Applique une variation et renvoie la nouvelle valeur bornée. */
export function applyReputationDelta(value: number, delta: number, config: ReputationConfig): number {
  return clampReputation(value + delta, config);
}

/**
 * Décroissance appliquée à chaque visite sans action (décision n°10) :
 * au-delà de ±seuil, la valeur revient d'un pas vers le seuil, sans le franchir.
 */
export function applyReputationDecay(value: number, config: ReputationConfig): number {
  const { threshold, stepPerVisit } = config.decay;
  if (value > threshold) return Math.max(threshold, value - stepPerVisit);
  if (value < -threshold) return Math.min(-threshold, value + stepPerVisit);
  return value;
}

/** Prix d'achat selon la réputation (arrondi à l'unité, minimum 1). */
export function buyPrice(basePrice: number, reputation: number, config: ReputationConfig): number {
  return Math.max(1, Math.round(basePrice * getReputationTier(reputation, config).priceMultiplier));
}

/** Prix de revente : fixe, indépendant de la réputation (GDD §6.4). */
export function sellPrice(basePrice: number, config: ReputationConfig): number {
  return Math.floor(basePrice * config.sellRatio);
}
