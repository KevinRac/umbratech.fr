/**
 * Polices pixel nettes.
 *
 * Le texte Canvas classique est lissé (anticrénelage), ce qui donne des
 * pixels gris une fois agrandi. On charge donc chaque police (woff2, licence
 * OFL, dans `assets/fonts/`) puis on dessine ses glyphes à sa taille native
 * (1 pixel de police = 1 pixel de jeu), on les « seuille » (alpha ≥ 50 % →
 * opaque, sinon transparent) et on les range dans une texture : on obtient une
 * police bitmap Phaser parfaitement nette, colorable par teinte (tint).
 *
 * Ajouter une police : une entrée dans `PIXEL_FONTS` (taille = taille native de
 * la grille de la police, vérifiée sans aucun pixel gris).
 */
import Phaser from 'phaser';
import { assetUrl } from '../core/config';

export interface PixelFontDef {
  /** Nom de famille CSS interne (préfixé pour éviter les collisions). */
  readonly family: string;
  /** Fichier sous `vaelmor/`. */
  readonly file: string;
  /** Taille native en px : la grille de la police tombe sur les pixels du jeu. */
  readonly size: number;
  /** Hauteur de ligne en pixels de jeu (sinon ascendante + descendante). */
  readonly lineHeight?: number;
}

export const PIXEL_FONTS = {
  /** Texte courant, dialogues, menus — Jersey 10 (majuscules de 10 px). */
  body: { family: 'Vaelmor Jersey 10', file: 'assets/fonts/jersey-10.woff2', size: 1400 / 75, lineHeight: 17 },
  /** Petites étiquettes, chiffres d'interface — Tiny5 (majuscules de 5 px). */
  small: { family: 'Vaelmor Tiny5', file: 'assets/fonts/tiny5.woff2', size: 8, lineHeight: 9 },
  /** Titres, gothique pixel — Jacquarda Bastarda 9 (majuscules de 9 px), souvent affichée ×2. */
  title: { family: 'Vaelmor Jacquarda', file: 'assets/fonts/jacquarda-bastarda-9.woff2', size: 13, lineHeight: 15 },
} as const satisfies Record<string, PixelFontDef>;

export type FontKey = keyof typeof PIXEL_FONTS;

/** Caractères rastérisés : ASCII imprimable + français (Ÿ absent des polices). */
export const FONT_CHARSET =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  'àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒÆ«»’‘“”–—…•·×°€';

const ALPHA_THRESHOLD = 128;
const ATLAS_WIDTH = 512;
const PADDING = 1;

/** Clé de texture et de police bitmap Phaser pour une police. */
export const fontKey = (key: FontKey): string => `font:${key}`;

/** Charge les fichiers de police via l'API FontFace. */
export async function loadPixelFontFaces(): Promise<void> {
  await Promise.all(
    Object.values(PIXEL_FONTS).map(async (def) => {
      const face = new FontFace(def.family, `url(${assetUrl(def.file)}) format("woff2")`);
      await face.load();
      document.fonts.add(face);
    }),
  );
}

interface GlyphBox {
  readonly char: string;
  readonly drawX: number;
  readonly width: number;
  readonly xOffset: number;
  readonly xAdvance: number;
}

/** Rastérise une police chargée et l'enregistre comme police bitmap Phaser. */
export function buildPixelFont(scene: Phaser.Scene, key: FontKey): void {
  const def: PixelFontDef = PIXEL_FONTS[key];
  const cssFont = `${def.size}px "${def.family}"`;

  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) throw new Error('Canvas 2D indisponible.');
  measureCtx.font = cssFont;
  const probe = measureCtx.measureText('ÉgjqyÀ');
  const ascent = Math.ceil(probe.fontBoundingBoxAscent);
  const descent = Math.ceil(probe.fontBoundingBoxDescent);
  const cellHeight = ascent + descent;

  // Mesure de chaque glyphe (avance + débordements éventuels de l'encre).
  const glyphs: GlyphBox[] = [...FONT_CHARSET].map((char) => {
    const m = measureCtx.measureText(char);
    const advance = Math.round(m.width);
    const left = Math.max(0, Math.ceil(m.actualBoundingBoxLeft));
    const right = Math.max(advance, Math.ceil(m.actualBoundingBoxRight));
    return { char, drawX: left, width: left + right, xOffset: -left, xAdvance: advance };
  });

  // Placement en rangées dans l'atlas.
  let x = PADDING;
  let y = PADDING;
  const placed = glyphs.map((g) => {
    if (x + g.width + PADDING > ATLAS_WIDTH) {
      x = PADDING;
      y += cellHeight + PADDING;
    }
    const at = { ...g, x, y };
    x += g.width + PADDING;
    return at;
  });
  const atlasHeight = Phaser.Math.Pow2.GetPowerOfTwo(y + cellHeight + PADDING);

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponible.');
  ctx.font = cssFont;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  for (const g of placed) ctx.fillText(g.char, g.x + g.drawX, g.y + ascent);

  // Seuillage : chaque pixel devient blanc opaque ou transparent.
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const on = (px[i + 3] ?? 0) >= ALPHA_THRESHOLD;
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = on ? 255 : 0;
  }
  ctx.putImageData(image, 0, 0);

  const textureKey = fontKey(key);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);

  // Le type Phaser omet `xAdvance`, pourtant lu par le moteur (GetBitmapTextSize).
  type CharData = Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & { xAdvance: number };
  const chars: Record<number, CharData> = {};
  for (const g of placed) {
    chars[g.char.charCodeAt(0)] = {
      x: g.x,
      y: g.y,
      width: g.width,
      height: cellHeight,
      centerX: Math.floor(g.width / 2),
      centerY: Math.floor(cellHeight / 2),
      xOffset: g.xOffset,
      yOffset: 0,
      xAdvance: g.xAdvance,
      data: {},
      kerning: {},
      u0: g.x / ATLAS_WIDTH,
      v0: 1 - g.y / atlasHeight,
      u1: (g.x + g.width) / ATLAS_WIDTH,
      v1: 1 - (g.y + cellHeight) / atlasHeight,
    };
  }

  const data: Phaser.Types.GameObjects.BitmapText.BitmapFontData = {
    font: textureKey,
    size: def.size,
    lineHeight: def.lineHeight ?? cellHeight,
    retroFont: false,
    chars,
  };
  scene.cache.bitmapFont.add(textureKey, { data, texture: textureKey, frame: null });
}
