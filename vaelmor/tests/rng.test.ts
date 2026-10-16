import { describe, expect, it } from 'vitest';
import { Rng } from '../src/logic/rng';

describe('Rng', () => {
  it('est déterministe pour une même graine', () => {
    const a = Rng.fromSeed('combat:42');
    const b = Rng.fromSeed('combat:42');
    const seqA = Array.from({ length: 20 }, () => a.nextUint32());
    const seqB = Array.from({ length: 20 }, () => b.nextUint32());
    expect(seqA).toEqual(seqB);
  });

  it('diffère selon la graine', () => {
    expect(Rng.fromSeed('a').nextUint32()).not.toBe(Rng.fromSeed('b').nextUint32());
  });

  it('reprend exactement là où l’état a été sauvegardé', () => {
    const rng = Rng.fromSeed(7);
    rng.next();
    const saved = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];
    const restored = Rng.fromState(JSON.parse(JSON.stringify(saved)));
    expect([restored.next(), restored.next(), restored.next()]).toEqual(expected);
  });

  it('int reste dans les bornes et les atteint toutes', () => {
    const rng = Rng.fromSeed('bornes');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(-2, 3);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
  });

  it('next reste dans [0, 1[ avec une moyenne proche de 0,5', () => {
    const rng = Rng.fromSeed('moyenne');
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });

  it('chance respecte les bornes 0 % et 100 % et la fréquence annoncée', () => {
    const rng = Rng.fromSeed('chance');
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(100)).toBe(true);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (rng.chance(30)) hits++;
    expect(hits / 10000).toBeGreaterThan(0.27);
    expect(hits / 10000).toBeLessThan(0.33);
  });

  it('shuffle renvoie une permutation sans modifier l’original', () => {
    const rng = Rng.fromSeed('melange');
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(items);
    expect(() => rng.pick([])).toThrow(RangeError);
  });
});
