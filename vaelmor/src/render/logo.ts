/**
 * Logotype « VAELMOR » dessiné à la main en pixels : capitales romaines à
 * empattements (13 px de haut), dégradé tramé du parchemin vers la braise,
 * contour sombre d'un pixel et ombre rouge cendre. Affiché à une échelle
 * entière (×2 ou ×3) pour rester net.
 */
import type Phaser from 'phaser';
import { PALETTE } from './palette';
import { PixelCanvas, type GradientStop } from './pixelCanvas';

export const LOGO_TEXTURE = 'logo:vaelmor';

const GLYPHS: Record<string, readonly string[]> = {
  V: [
    '###.....###',
    '.##......#.',
    '.##......#.',
    '..##....#..',
    '..##....#..',
    '..##....#..',
    '...##..#...',
    '...##..#...',
    '...##..#...',
    '....####...',
    '....###....',
    '.....#.....',
    '.....#.....',
  ],
  A: [
    '.....#.....',
    '.....##....',
    '....###....',
    '....#.##...',
    '....#.##...',
    '...#...##..',
    '...#...##..',
    '..#######..',
    '..#.....##.',
    '.#......##.',
    '.#......##.',
    '.#.......##',
    '###....####',
  ],
  E: [
    '#########',
    '.##.....#',
    '.##......',
    '.##......',
    '.##...#..',
    '.######..',
    '.##...#..',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##.....#',
    '#########',
  ],
  L: [
    '####.....',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##......',
    '.##.....#',
    '#########',
  ],
  M: [
    '###.......###',
    '.##.......##.',
    '.###.....###.',
    '.#.##...#.##.',
    '.#.##...#.##.',
    '.#..##.#..##.',
    '.#..##.#..##.',
    '.#...###..##.',
    '.#...###..##.',
    '.#....#...##.',
    '.#....#...##.',
    '.#........##.',
    '###......####',
  ],
  O: [
    '...#####...',
    '..##...##..',
    '.##.....##.',
    '.##.....##.',
    '##.......##',
    '##.......##',
    '##.......##',
    '##.......##',
    '##.......##',
    '.##.....##.',
    '.##.....##.',
    '..##...##..',
    '...#####...',
  ],
  R: [
    '#######....',
    '.##....##..',
    '.##.....##.',
    '.##.....##.',
    '.##.....##.',
    '.##....##..',
    '.######....',
    '.##..##....',
    '.##...##...',
    '.##...##...',
    '.##....##..',
    '.##....##..',
    '####....###',
  ],
};

const GLYPH_HEIGHT = 13;
const LETTER_SPACING = 2;
/** Marge autour du mot : contour (1 px) + ombre (2 px dessous). */
const MARGIN = 1;
const DROP = 2;

const SHADOW = 0x5e2a26;

const FILL_STOPS: readonly GradientStop[] = [
  { at: 0, color: 0xfff6e2 },
  { at: 0.3, color: PALETTE.parchemin },
  { at: 0.55, color: PALETTE.pierre },
  { at: 0.8, color: PALETTE.ambre },
  { at: 1, color: PALETTE.orangeForge },
];

/** Peint le logotype d'un mot (lettres disponibles : V A E L M O R). */
export function paintLogo(scene: Phaser.Scene, word = 'VAELMOR'): string {
  if (scene.textures.exists(LOGO_TEXTURE)) return LOGO_TEXTURE;
  const glyphs = [...word].map((ch) => {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`Logotype : lettre « ${ch} » non dessinée.`);
    return g;
  });
  const textWidth = glyphs.reduce((w, g) => w + (g[0]?.length ?? 0), 0) + LETTER_SPACING * (glyphs.length - 1);
  const width = textWidth + MARGIN * 2;
  const height = GLYPH_HEIGHT + MARGIN * 2 + DROP;

  // Masque des pixels « encre » des lettres.
  const ink: boolean[][] = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  let cursor = MARGIN;
  for (const glyph of glyphs) {
    glyph.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && (ink[y + MARGIN]![cursor + x] = true)));
    cursor += (glyph[0]?.length ?? 0) + LETTER_SPACING;
  }
  const isInk = (x: number, y: number): boolean => ink[y]?.[x] ?? false;
  const nearInk = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isInk(x + dx, y + dy)) return true;
    return false;
  };

  // Zone « extérieure » (remplissage depuis les bords) : l'ombre n'entre pas dans les creux des lettres.
  const outside: boolean[][] = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  const stack: [number, number][] = [];
  for (let x = 0; x < width; x++) stack.push([x, 0], [x, height - 1]);
  for (let y = 0; y < height; y++) stack.push([0, y], [width - 1, y]);
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height || outside[y]![x] || nearInk(x, y)) continue;
    outside[y]![x] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const c = new PixelCanvas(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInk(x, y)) {
        const t = (y - MARGIN) / (GLYPH_HEIGHT - 1);
        c.set(x, y, PixelCanvas.ditheredColor(FILL_STOPS, t, x, y));
      } else if (nearInk(x, y)) {
        c.set(x, y, PALETTE.encre);
      } else if (outside[y]![x] && (nearInk(x, y - 1) || nearInk(x, y - DROP))) {
        c.set(x, y, SHADOW);
      }
    }
  }
  return c.toTexture(scene, LOGO_TEXTURE);
}
