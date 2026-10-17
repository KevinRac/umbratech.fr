import { describe, expect, it } from 'vitest';
import { getStamp, STAMP_DEFS, variantCount } from '../tools/world/props';

/** Bâtiments de la refonte graphique (décision n°44). */
const BUILDINGS = Object.keys(STAMP_DEFS).filter((name) => getStamp(name, 0).building);

const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

describe('bâtiments', () => {
  it('couvrent les six silhouettes demandées', () => {
    for (const name of ['house_thatch', 'inn', 'forge', 'temple', 'mill', 'guard_tower']) expect(BUILDINGS).toContain(name);
  });

  for (const name of BUILDINGS) {
    for (let v = 0; v < variantCount(name); v++) {
      const s = getStamp(name, v);
      it(`${name}:${v} — collision au pied, toit sur la couche haute`, () => {
        expect(s.canopyRows).toBeGreaterThan(0);
        expect(s.shadowRows).toBe(1);
        let anyBlocked = false;
        for (let y = 0; y < s.h; y++) {
          for (let x = 0; x < s.w; x++) {
            const b = s.blocked[y * s.w + x] as boolean;
            anyBlocked ||= b;
            if (y === s.h - 1) expect(b, `ombre ${x},${y}`).toBe(false);
            if (y < s.canopyRows - (name === 'mill' ? 1 : 0)) expect(b, `toit ${x},${y}`).toBe(false);
          }
        }
        expect(anyBlocked).toBe(true);
        // La rangée bloquée la plus basse touche l'ombre : on bute bien au pied du mur.
        expect(s.blocked.slice((s.h - 2) * s.w, (s.h - 1) * s.w).some(Boolean)).toBe(true);
      });

      it(`${name}:${v} — ni noir pur ni gris neutre sombre, ombre portée translucide`, () => {
        let translucent = 0;
        for (let y = 0; y < s.px.height; y++) {
          for (let x = 0; x < s.px.width; x++) {
            const a = s.px.alphaAt(x, y);
            if (a === 0) continue;
            const c = s.px.colorAt(x, y);
            if (a < 255) translucent++;
            if (luminance(c) < 70) {
              // Les sombres sont teintés (bleu-violet ou chaud), jamais gris neutre.
              const r = (c >> 16) & 255;
              const g = (c >> 8) & 255;
              const b = c & 255;
              expect(Math.max(r, g, b) - Math.min(r, g, b), `pixel ${x},${y}`).toBeGreaterThan(8);
              expect(luminance(c), `pixel ${x},${y}`).toBeGreaterThan(18);
            }
          }
        }
        expect(translucent).toBeGreaterThan(s.w * 16);
      });
    }
  }
});
