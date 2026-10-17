import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { blendGrade, effectsFor, eveningGrade, flicker, haloStrength, LIGHT_KINDS, nextQuality, parseLightKind, parseQuality, QUALITIES, tiltMaskAlpha } from '../src/render/atmosphere';
import { applyMatrix, gradeMatrix } from '../src/render/grade';

/** Atmosphère HD-2D (décision n°47). */
const data = loadGameData();
const luma = ([r, g, b]: [number, number, number]): number => 0.299 * r + 0.587 * g + 0.114 * b;

describe('réglage « Qualité »', () => {
  it('Haute : tous les effets ; Basse : étalonnage et vignettage ; Désactivée : rien', () => {
    expect(Object.values(effectsFor('high')).every(Boolean)).toBe(true);
    expect(effectsFor('low')).toEqual({ grade: true, vignette: true, bloom: false, tiltShift: false, rays: false, dust: false, halos: false });
    expect(Object.values(effectsFor('off')).some(Boolean)).toBe(false);
  });

  it('défile Haute → Basse → Désactivée → Haute et lit prudemment la valeur enregistrée', () => {
    expect(QUALITIES.map(nextQuality)).toEqual(['low', 'off', 'high']);
    expect(parseQuality('low')).toBe('low');
    for (const bad of [undefined, null, 3, 'ultra', {}]) expect(parseQuality(bad)).toBe('high');
  });
});

describe('jour / soir', () => {
  it('le soir assombrit et réchauffe chaque zone ; t = 0 rend le jour, t = 1 le soir', () => {
    for (const zone of data.zones) {
      const day = zone.grade;
      const evening = eveningGrade(day);
      expect(blendGrade(day, evening, 0)).toEqual(day);
      expect(blendGrade(day, evening, 1)).toEqual(evening);
      const grey: [number, number, number] = [150, 150, 150];
      const d = applyMatrix(gradeMatrix(day), grey);
      const e = applyMatrix(gradeMatrix(evening), grey);
      expect(luma(e), zone.id).toBeLessThan(luma(d));
      expect(e[0] - e[2], zone.id).toBeGreaterThan(d[0] - d[2]);
    }
  });
});

describe('halos', () => {
  it('chaque lumière scintille entre 0,6 et 1, sans battre à l’unisson', () => {
    for (const kind of LIGHT_KINDS) {
      let min = 1;
      let max = 0;
      for (let t = 0; t < 20; t += 0.01) {
        const f = flicker(t, 3, kind);
        min = Math.min(min, f);
        max = Math.max(max, f);
      }
      expect(min, kind).toBeGreaterThanOrEqual(0.6);
      expect(max, kind).toBeLessThanOrEqual(1.0001);
      expect(max - min, kind).toBeGreaterThan(0.03);
      expect(flicker(1, 3, kind)).not.toBeCloseTo(flicker(1, 4, kind), 3);
    }
  });

  it('les fenêtres ne s’allument que le soir ; les autres lumières gardent une part en plein jour', () => {
    expect(haloStrength('window', 0, 0.55)).toBe(0);
    expect(haloStrength('window', 1, 0.55)).toBe(1);
    expect(haloStrength('lamp', 0, 0.55)).toBe(0.55);
    expect(haloStrength('fire', 1, 0.55)).toBe(1);
    expect(parseLightKind('fire')).toBe('fire');
    expect(parseLightKind('soleil')).toBeNull();
  });
});

describe('flou de profondeur', () => {
  it('net au centre, flou plein en haut et en bas, fondu monotone entre les deux', () => {
    const { focus, fade } = data.balance.visuals.tiltShift;
    expect(tiltMaskAlpha(0.5, focus, fade)).toBe(0);
    expect(tiltMaskAlpha(0.5 + focus / 2, focus, fade)).toBe(0);
    expect(tiltMaskAlpha(0, focus, fade)).toBe(1);
    expect(tiltMaskAlpha(1, focus, fade)).toBe(1);
    let prev = 0;
    for (let v = 0.5; v <= 1; v += 0.01) {
      const a = tiltMaskAlpha(v, focus, fade);
      expect(a).toBeGreaterThanOrEqual(prev);
      expect(tiltMaskAlpha(1 - v, focus, fade)).toBeCloseTo(a, 6);
      prev = a;
    }
  });
});
