import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import {
  applyReputationDecay,
  applyReputationDelta,
  buyPrice,
  clampReputation,
  getReputationTier,
  sellPrice,
} from '../src/logic/reputation/reputation';

const config = loadGameData().reputation;

describe('réputation (GDD §6)', () => {
  it.each([
    [-100, 'hostile'],
    [-61, 'hostile'],
    [-60, 'mefiant'],
    [-21, 'mefiant'],
    [-20, 'neutre'],
    [20, 'neutre'],
    [21, 'amical'],
    [50, 'amical'],
    [51, 'allie'],
    [80, 'allie'],
    [81, 'heros_local'],
    [100, 'heros_local'],
  ])('la valeur %i donne le palier %s', (value, tier) => {
    expect(getReputationTier(value, config).id).toBe(tier);
  });

  it('borne les valeurs à [-100, 100]', () => {
    expect(clampReputation(250, config)).toBe(100);
    expect(clampReputation(-180, config)).toBe(-100);
    expect(applyReputationDelta(95, 15, config)).toBe(100);
    expect(getReputationTier(999, config).id).toBe('heros_local');
  });

  it('décroît d’un point par visite au-delà de ±50, sans franchir le seuil', () => {
    expect(applyReputationDecay(70, config)).toBe(69);
    expect(applyReputationDecay(51, config)).toBe(50);
    expect(applyReputationDecay(50, config)).toBe(50);
    expect(applyReputationDecay(-70, config)).toBe(-69);
    expect(applyReputationDecay(-50, config)).toBe(-50);
    expect(applyReputationDecay(10, config)).toBe(10);
  });

  it('applique les multiplicateurs de prix du GDD', () => {
    expect(buyPrice(100, 0, config)).toBe(100);
    expect(buyPrice(100, -30, config)).toBe(120);
    expect(buyPrice(100, -80, config)).toBe(150);
    expect(buyPrice(100, 30, config)).toBe(95);
    expect(buyPrice(100, 60, config)).toBe(85);
    expect(buyPrice(100, 90, config)).toBe(75);
    expect(buyPrice(1, 90, config)).toBe(1);
  });

  it('revend à 40 % du prix de base, quelle que soit la réputation', () => {
    expect(sellPrice(100, config)).toBe(40);
    expect(sellPrice(25, config)).toBe(10);
  });
});
