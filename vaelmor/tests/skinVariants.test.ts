import { describe, expect, it } from 'vitest';
import { parseSprite, skinVariant, variantSprite } from '../src/logic/skinFrames';
import { detailsFor, paintDetails } from '../src/render/skinDetails';

describe('détails des recrues', () => {
  const party = [
    { class: 'lame_du_serment', hero: true },
    { class: 'lame_du_serment', hero: false },
    { class: 'veilleur_des_falaises', hero: false },
    { class: 'lame_du_serment', hero: false },
    { class: 'lame_du_serment', hero: false },
  ];
  it('le héros et le premier de chaque classe n’ont pas de détail ; les suivants en ont un chacun', () => {
    expect(party.map((_, i) => skinVariant(party, i))).toEqual([0, 0, 0, 1, 2]);
  });
  it('identifiant de sprite aller-retour', () => {
    expect(variantSprite('lame_du_serment', 0)).toBe('lame_du_serment');
    expect(variantSprite('lame_du_serment', 2)).toBe('lame_du_serment#2');
    expect(parseSprite('lame_du_serment#2')).toEqual({ base: 'lame_du_serment', variant: 2 });
    expect(parseSprite('heros')).toEqual({ base: 'heros', variant: 0 });
  });
  it('les détails tournent : plume, écharpe, les deux', () => {
    expect(detailsFor(0)).toEqual([]);
    expect(detailsFor(1)).toEqual(['plume']);
    expect(detailsFor(2)).toEqual(['echarpe']);
    expect(detailsFor(3)).toEqual(['plume', 'echarpe']);
    expect(detailsFor(4)).toEqual(['plume']);
  });
  it('peint quelque chose sur une silhouette, rien sans variante', () => {
    const make = (): { width: number; height: number; data: Uint8ClampedArray } => {
      const data = new Uint8ClampedArray(30 * 30 * 4);
      for (let y = 6; y < 29; y++) for (let x = 10; x < 20; x++) data.set([90, 90, 90, 255], (y * 30 + x) * 4);
      return { width: 30, height: 30, data };
    };
    for (const v of [1, 2]) {
      const a = make();
      const before = a.data.slice();
      paintDetails(a, 0, 0, 30, 30, v, false);
      expect(a.data.some((b, i) => b !== before[i]), `variante ${v}`).toBe(true);
    }
    const n = make();
    const ref = n.data.slice();
    paintDetails(n, 0, 0, 30, 30, 0, false);
    expect(n.data).toEqual(ref);
  });
});
