import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { BF_TILE, BF_TOP, BF_WATER_FRAMES, paintBattlefield } from '../src/render/battlefield';
import { CHARACTER_SHAPES, CHAR_POSES, GEAR_PAD } from '../src/render/characterSprite';
import { UNIT_H, UNIT_IDLE_FRAMES, UNIT_SPRITES, UNIT_W, UNIT_WALK_FRAMES, paintUnitSprite } from '../src/render/unitSprites';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { terrainAt } from '../src/logic/tactics/grid';
import { testWorld } from './helpers/world';

/** Champ de bataille peint par code et apparences des unités (jalon M4). */
const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

const data = loadGameData();
const rowsOf = (id: string): string[][] => {
  const s = buildBattle(findEncounter(data, id), data.encounters.testParty, data, { seed: 1, world: testWorld().source });
  return Array.from({ length: s.map.height }, (_, y) => Array.from({ length: s.map.width }, (_, x) => terrainAt(s.map, x, y).id));
};

describe('champ de bataille', () => {
  for (const encounter of data.encounters.encounters) {
    const rows = rowsOf(encounter.id);
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

describe('unités au gabarit commun (décision n°60)', () => {
  it('chaque classe, chaque ennemi et le héros ont une fiche', () => {
    const sprites = ['heros', ...data.classes.map((c) => c.id), ...data.enemies.map((e) => e.sprite)];
    for (const sprite of sprites) expect(UNIT_SPRITES[sprite], sprite).toBeDefined();
  });

  it('les corpulences de classe sont dessinées sur 16 colonnes', () => {
    for (const shapes of Object.values(CHARACTER_SHAPES.BUILDS)) {
      const rows = [...Object.values(shapes.body).flat(), ...shapes.legsFront.flat(), ...shapes.legsSide.flat()];
      for (const row of rows) expect(row.length, row).toBe(16);
    }
  });

  it('chaque classe a sa propre silhouette (contour différent de toutes les autres)', () => {
    const mask = (id: string): string => {
      const px = new Set<number>();
      paintUnitSprite({ set: (x: number, y: number) => px.add(y * UNIT_W + x) }, 0, 0, id, 'player', 'idle', 0);
      return [...px].sort((a, b) => a - b).join(',');
    };
    const ids = data.classes.map((c) => c.id);
    expect(new Set(ids.map(mask)).size).toBe(ids.length);
  });

  for (const id of Object.keys(UNIT_SPRITES)) {
    it(`${id} : tient dans son cadre, pieds en bas, couleurs de camp distinctes, sombres teintés`, () => {
      const paint = (team: 'player' | 'enemy', kind: 'idle' | (typeof CHAR_POSES)[number], frame: number): Map<number, number> => {
        const px = new Map<number, number>();
        paintUnitSprite(
          {
            set: (x: number, y: number, c: number) => {
              expect(x >= 0 && x < UNIT_W && y >= 0 && y < UNIT_H).toBe(true);
              px.set(y * UNIT_W + x, c);
            },
          },
          0,
          0,
          id,
          team,
          kind,
          frame,
        );
        return px;
      };
      for (let f = 0; f < UNIT_IDLE_FRAMES; f++) {
        const blue = paint('player', 'idle', f);
        const red = paint('enemy', 'idle', f);
        // Pieds sur la rangée 26 du gabarit (contour sur la 27) : dernière rangée du cadre élargi.
        expect([...blue.keys()].some((i) => Math.floor(i / UNIT_W) === 26 + GEAR_PAD.y)).toBe(true);
        expect([...blue.keys()].sort()).toEqual([...red.keys()].sort());
        if (id !== 'heros') expect([...blue.entries()].filter(([i, c]) => red.get(i) !== c).length).toBeGreaterThan(10);
        for (const c of blue.values()) {
          if (luminance(c) >= 40) continue;
          const r = (c >> 16) & 255;
          const g = (c >> 8) & 255;
          const b = c & 255;
          expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(8);
          expect(luminance(c)).toBeGreaterThan(14);
        }
      }
      // La respiration change l'image ; la marche aussi.
      expect(JSON.stringify([...paint('player', 'idle', 0)])).not.toBe(JSON.stringify([...paint('player', 'idle', 1)]));
      for (const view of CHAR_POSES) {
        const frames = Array.from({ length: UNIT_WALK_FRAMES }, (_, f) => JSON.stringify([...paint('player', view, f)]));
        expect(new Set(frames).size).toBeGreaterThan(1);
      }
    });
  }
});
