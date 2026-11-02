import { describe, expect, it } from 'vitest';
import { memberSprite, parseSprite, skinVariant, variantSprite } from '../src/logic/skinFrames';
import { SKIN_ALTS } from '../src/data/skins';
import { CLASS_DETAILS, detailsFor, paintDetails } from '../src/render/skinDetails';
import { SKINS } from '../src/data/skins';

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
  it('chaque classe a ses propres détails, cohérents, qui tournent', () => {
    expect(detailsFor(0, 'gardien_des_marees')).toEqual([]);
    expect(detailsFor(1, 'gardien_des_marees')).toEqual(['cimier']);
    expect(detailsFor(2, 'gardien_des_marees')).toEqual(['cornes']);
    expect(detailsFor(3, 'gardien_des_marees')).toEqual(['laurier']);
    expect(detailsFor(4, 'gardien_des_marees')).toEqual(['cimier']);
    expect(detailsFor(1, 'heritier_des_cendres')).toEqual(['pointu']);
    // Jamais de chapeau sur un casque.
    for (const cls of ['gardien_des_marees', 'heraut_des_bannieres']) {
      for (const set of CLASS_DETAILS[cls] ?? []) expect(set.some((k) => k === 'chapeau' || k === 'pointu' || k === 'plume'), cls).toBe(false);
    }
  });
  it('les 12 classes ont au moins 3 détails', () => {
    const alts = new Set(Object.values(SKIN_ALTS).flat());
    for (const s of SKINS) if (s.id !== 'heros' && !alts.has(s.id)) expect((CLASS_DETAILS[s.id] ?? []).length, s.id).toBeGreaterThanOrEqual(3);
  });
  it('peint quelque chose sur une silhouette, rien sans variante', () => {
    const make = (): { width: number; height: number; data: Uint8ClampedArray } => {
      const data = new Uint8ClampedArray(30 * 30 * 4);
      for (let y = 6; y < 29; y++) for (let x = 10; x < 20; x++) data.set([90, 90, 90, 255], (y * 30 + x) * 4);
      return { width: 30, height: 30, data };
    };
    for (const v of [1, 2, 3]) {
      const a = make();
      const before = a.data.slice();
      paintDetails(a, 0, 0, 30, 30, v, false, 'lame_du_serment');
      expect(a.data.some((b, i) => b !== before[i]), `variante ${v}`).toBe(true);
    }
    const n = make();
    const ref = n.data.slice();
    paintDetails(n, 0, 0, 30, 30, 0, false);
    expect(n.data).toEqual(ref);
  });
  it('le 2e Veilleur est un autre personnage ; les suivants, le skin de la classe avec un détail', () => {
    expect(memberSprite('veilleur_des_falaises', 0)).toBe('veilleur_des_falaises');
    expect(memberSprite('veilleur_des_falaises', 1)).toBe('veilleur_des_falaises_v1');
    expect(memberSprite('veilleur_des_falaises', 2)).toBe('veilleur_des_falaises#1');
    expect(memberSprite('gardien_des_marees', 1)).toBe('gardien_des_marees#1');
    for (const alts of Object.values(SKIN_ALTS)) for (const id of alts) expect(SKINS.some((s) => s.id === id), id).toBe(true);
  });
});
