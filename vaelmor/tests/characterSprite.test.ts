import { describe, expect, it } from 'vitest';
import { CHAR_H, CHAR_POSES, CHAR_W, CHAR_WALK_FRAMES, CHARACTER_SHAPES, paintCharacterFrame, type Accessory, type CharacterLook, type HeadStyle, type Outfit } from '../src/render/characterSprite';
import { HERO_H, HERO_LOOK, HERO_W } from '../src/render/heroSprite';

/** Gabarit des personnages 16×28 (décision n°48). */
type Img = Map<number, number>;

function paint(look: CharacterLook, pose: (typeof CHAR_POSES)[number], frame: number): Img {
  const img: Img = new Map();
  paintCharacterFrame({ set: (x, y, c) => {
    expect(x >= 0 && y >= 0 && x < CHAR_W && y < CHAR_H, `hors cadre ${x},${y}`).toBe(true);
    img.set(y * CHAR_W + x, c);
  } }, 0, 0, look, pose, frame);
  return img;
}

const rowFilled = (img: Img, y: number): boolean => [...img.keys()].some((k) => Math.floor(k / CHAR_W) === y);
const luminance = (c: number): number => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);

const HEADS: HeadStyle[] = ['hood', 'short', 'long', 'bun'];
const OUTFITS: Outfit[] = ['cloak', 'tunic', 'dress'];
const ACCESSORIES: Accessory[] = ['none', 'sword', 'satchel', 'lantern'];

describe('gabarit des personnages', () => {
  it('le héros fait 16×28 px', () => {
    expect([HERO_W, HERO_H]).toEqual([16, 28]);
  });

  it('toutes les formes ont la bonne taille (16 colonnes ; tête 11, corps 9, jambes 5 rangées)', () => {
    const check = (rows: readonly string[], n: number, name: string): void => {
      expect(rows.length, name).toBe(n);
      for (const r of rows) expect(r.length, `${name} « ${r} »`).toBe(16);
    };
    for (const pose of CHAR_POSES) {
      for (const h of HEADS) check(CHARACTER_SHAPES.HEAD[pose][h], 11, `tête ${pose}/${h}`);
      for (const o of OUTFITS) check(CHARACTER_SHAPES.BODY[pose][o], 9, `corps ${pose}/${o}`);
    }
    for (const legs of [CHARACTER_SHAPES.LEGS_FRONT, CHARACTER_SHAPES.LEGS_SIDE, CHARACTER_SHAPES.LEGS_DRESS, CHARACTER_SHAPES.LEGS_DRESS_SIDE]) {
      expect(legs.length).toBe(CHAR_WALK_FRAMES);
      for (const f of legs) check(f, 5, 'jambes');
    }
  });

  it('pieds sur la rangée 26, contour sur la 27, marge en haut pour le rebond du pas', () => {
    for (const pose of CHAR_POSES) {
      const stand = paint(HERO_LOOK, pose, 0);
      expect(rowFilled(stand, 26), pose).toBe(true);
      expect(rowFilled(stand, 27), pose).toBe(true);
      expect(rowFilled(stand, 0), pose).toBe(false);
    }
  });

  it('chaque combinaison tête × tenue × accessoire se peint dans le cadre, 4 images de marche distinctes', () => {
    for (const head of HEADS) {
      for (const outfit of OUTFITS) {
        for (const accessory of ACCESSORIES) {
          const look = { ...HERO_LOOK, head, outfit, accessory };
          for (const pose of CHAR_POSES) {
            const frames = Array.from({ length: CHAR_WALK_FRAMES }, (_, f) => JSON.stringify([...paint(look, pose, f)]));
            expect(new Set(frames).size, `${head}/${outfit}/${accessory}/${pose}`).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });

  it('3 tons par matière (la cape du héros de face), aucun noir pur ni gris neutre sombre', () => {
    const front = paint(HERO_LOOK, 'down', 0);
    const colors = new Set(front.values());
    for (const tone of ['dark', 'base', 'light'] as const) expect(colors.has(HERO_LOOK.top[tone]), tone).toBe(true);
    for (const pose of CHAR_POSES) {
      for (const c of paint(HERO_LOOK, pose, 1).values()) {
        if (luminance(c) >= 60) continue;
        const r = (c >> 16) & 255;
        const g = (c >> 8) & 255;
        const b = c & 255;
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(8);
        expect(luminance(c)).toBeGreaterThan(14);
      }
    }
  });
});
