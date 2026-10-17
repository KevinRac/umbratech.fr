import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { BF_TILE, BF_TOP, BF_WATER_FRAMES, paintBattlefield } from '../src/render/battlefield';
import { UNIT_LOOKS } from '../src/render/unitLooks';

/** Champ de bataille peint par code et apparences des unités (jalon M4). */
const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

const data = loadGameData();
const rowsOf = (map: readonly string[]): string[][] => map.map((row) => [...row].map((ch) => data.encounters.legend[ch] as string));

describe('champ de bataille', () => {
  for (const encounter of data.encounters.encounters) {
    const rows = rowsOf(encounter.map);
    const field = paintBattlefield(rows, 0, 7);

    it(`« ${encounter.id} » : taille, cases pleines, marge du haut`, () => {
      const w = rows[0]?.length ?? 0;
      expect(field.width).toBe(w * BF_TILE);
      expect(field.height).toBe(rows.length * BF_TILE + BF_TOP);
      // Toute la carte est peinte (seule la marge du haut peut rester transparente).
      for (let y = BF_TOP; y < field.height; y++) for (let x = 0; x < field.width; x++) expect(field.pixels[y * field.width + x]).toBeGreaterThanOrEqual(0);
    });

    it(`« ${encounter.id} » : sombres teintés (ni noir pur ni gris neutre)`, () => {
      for (const c of field.pixels) {
        if (c < 0 || luminance(c) >= 60) continue;
        const r = (c >> 16) & 255;
        const g = (c >> 8) & 255;
        const b = c & 255;
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(8);
        expect(luminance(c)).toBeGreaterThan(18);
      }
    });

    it(`« ${encounter.id} » : déterministe ; seule l'eau change d'une image à l'autre`, () => {
      expect(paintBattlefield(rows, 0, 7).pixels).toEqual(field.pixels);
      const other = paintBattlefield(rows, 1, 7);
      const hasWater = rows.some((row) => row.some((t) => ['riviere', 'gue', 'pont', 'eau_profonde'].includes(t)));
      let changed = 0;
      for (let i = 0; i < field.pixels.length; i++) if (field.pixels[i] !== other.pixels[i]) changed++;
      if (hasWater) expect(changed).toBeGreaterThan(0);
      else expect(changed).toBe(0);
      expect(BF_WATER_FRAMES).toBe(4);
    });
  }

  it('la forêt, la montagne et le village débordent sur la case du dessus (marge peinte)', () => {
    const field = paintBattlefield([['foret', 'montagne', 'village']], 0, 3);
    let painted = 0;
    for (let y = 0; y < BF_TOP; y++) for (let x = 0; x < field.width; x++) if ((field.pixels[y * field.width + x] ?? -1) >= 0) painted++;
    expect(painted).toBeGreaterThan(20);
  });
});

describe('apparences des unités', () => {
  it('chaque classe, chaque ennemi et le héros ont une apparence', () => {
    const sprites = ['heros', ...data.classes.map((c) => c.id), ...data.enemies.map((e) => e.sprite)];
    for (const sprite of sprites) expect(UNIT_LOOKS[sprite], sprite).toBeDefined();
  });
});
