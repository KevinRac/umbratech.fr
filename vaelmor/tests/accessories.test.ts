import { describe, expect, it } from 'vitest';
import { getStamp, STAMP_DEFS, variantCount } from '../tools/world/props';

/** Petits décors et accessoires de la refonte graphique (décision n°46). */
const PLANTS = new Set(['pine', 'dark_pine', 'oak', 'dead_tree', 'bush', 'tall_grass', 'flowers', 'lavender', 'sunflowers', 'reeds']);
const PROPS = Object.keys(STAMP_DEFS).filter((name) => !PLANTS.has(name) && !getStamp(name, 0).building);

const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

describe('accessoires', () => {
  it('couvrent la vie des villages demandée', () => {
    for (const name of ['planter', 'barrel', 'sacks', 'tools', 'lamp_post', 'laundry', 'crate', 'woodpile', 'cart', 'bench', 'board', 'stall', 'well']) expect(PROPS).toContain(name);
  });

  for (const name of PROPS) {
    for (let v = 0; v < variantCount(name); v++) {
      const s = getStamp(name, v);
      it(`${name}:${v} — sombres teintés (ni noir pur ni gris neutre)`, () => {
        for (const f of s.frames) {
          for (let y = 0; y < f.height; y++) {
            for (let x = 0; x < f.width; x++) {
              if (f.alphaAt(x, y) === 0) continue;
              const c = f.colorAt(x, y);
              if (luminance(c) >= 70) continue;
              const r = (c >> 16) & 255;
              const g = (c >> 8) & 255;
              const b = c & 255;
              expect(Math.max(r, g, b) - Math.min(r, g, b), `pixel ${x},${y}`).toBeGreaterThan(8);
              expect(luminance(c), `pixel ${x},${y}`).toBeGreaterThan(18);
            }
          }
        }
      });

      if (s.h > 1 && s.canopyRows > 0) {
        it(`${name}:${v} — objet haut : le haut passe sur le héros, collision au pied`, () => {
          for (let y = 0; y < s.canopyRows; y++) for (let x = 0; x < s.w; x++) expect(s.blocked[y * s.w + x], `${x},${y}`).toBe(false);
          const foot = s.h - 1 - s.shadowRows;
          expect(s.blocked.slice(foot * s.w, (foot + 1) * s.w).some(Boolean)).toBe(true);
        });
      }
    }
  }

  it('les petits décors au sol ne bloquent pas', () => {
    for (const name of ['pebbles', 'mushrooms', 'sign']) expect(getStamp(name, 0).blocked.some(Boolean), name).toBe(false);
  });

  it('la corde à linge laisse passer sous le linge (case du milieu libre)', () => {
    const s = getStamp('laundry', 0);
    expect(s.blocked).toEqual([false, false, false, true, false, true]);
  });

  it('flammes, bannières et linge sont animés (4 images différentes)', () => {
    for (const name of ['campfire', 'banner', 'laundry']) {
      const s = getStamp(name, 0);
      expect(s.frames.length, name).toBe(4);
      expect(s.frameMs.length, name).toBe(4);
      const keys = new Set(s.frames.map((f) => Buffer.from(f.data).toString('base64')));
      expect(keys.size, name).toBeGreaterThan(1);
    }
  });
});
