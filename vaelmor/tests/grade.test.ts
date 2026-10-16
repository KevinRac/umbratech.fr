import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { applyMatrix, gradeMatrix, lerpMatrix } from '../src/render/grade';

const NEUTRAL = { shadow: '#000000', shadowAmount: 0, light: '#ffffff', lightAmount: 0, saturation: 0, contrast: 0, brightness: 0 };

describe('étalonnage des zones (décision n°43)', () => {
  it('un étalonnage neutre ne change aucune couleur', () => {
    const m = gradeMatrix(NEUTRAL);
    for (const c of [[0, 0, 0], [255, 255, 255], [120, 60, 200]] as const) {
      applyMatrix(m, c).forEach((v, i) => expect(v).toBeCloseTo(c[i] as number, 6));
    }
  });

  it('teinte les ombres sans les laisser noires et réchauffe les lumières', () => {
    const m = gradeMatrix({ ...NEUTRAL, shadow: '#3d3658', shadowAmount: 0.2, light: '#ffd9a0', lightAmount: 0.15 });
    const [r, g, b] = applyMatrix(m, [0, 0, 0]);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
    expect(r + g + b).toBeGreaterThan(0);
    const [wr, , wb] = applyMatrix(m, [200, 200, 200]);
    expect(wr).toBeGreaterThan(wb);
  });

  it('chaque zone a un étalonnage valide qui garde les couleurs lisibles', () => {
    for (const zone of loadGameData().zones) {
      const m = gradeMatrix(zone.grade);
      expect(m).toHaveLength(20);
      const mid = applyMatrix(m, [128, 128, 128]);
      for (const v of mid) expect(Math.abs(v - 128)).toBeLessThan(40);
    }
  });

  it('le fondu entre deux zones part de la première et arrive à la seconde', () => {
    const a = gradeMatrix(NEUTRAL);
    const b = gradeMatrix({ ...NEUTRAL, saturation: -0.5 });
    expect(lerpMatrix(a, b, 0)).toEqual(a);
    lerpMatrix(a, b, 1).forEach((v, i) => expect(v).toBeCloseTo(b[i] as number, 9));
  });
});
