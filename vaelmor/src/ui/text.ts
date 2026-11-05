/**
 * Création de texte pixel. Toujours passer par `addText` : la police, l'échelle
 * entière, la couleur et l'ombre portée restent cohérentes dans tout le jeu.
 */
import Phaser from 'phaser';
import { PALETTE } from '../render/palette';
import { loadTextSize, onSettingsChange } from '../core/settings';
import { PIXEL_FONTS, fontKey, type FontKey } from '../render/pixelFont';

export type TextAlign = 'left' | 'center' | 'right';

export interface TextOptions {
  readonly font?: FontKey;
  /** Agrandissement entier (entier ≥ 1) : garde les pixels carrés. */
  readonly scale?: number;
  readonly color?: number;
  /** Ancrage horizontal par rapport à x (le texte reste sur des pixels entiers). */
  readonly align?: TextAlign;
  /** Couleur de l'ombre portée (1 px en bas à droite, ×échelle), ou false. */
  readonly shadow?: number | false;
  /** Décalage de l'ombre en pixels (par défaut : l'échelle ; 1 px suffit pour un grand texte net). */
  readonly shadowOffset?: number;
  /** Largeur maximale avant retour à la ligne, en pixels de jeu. */
  readonly maxWidth?: number;
  /**
   * Texte des dialogues, scènes et menus : suit le réglage « Taille du texte »
   * (n°242) — la police `body` devient `bodyLarge` en ×1,25.
   */
  readonly sizable?: boolean;
}

let largeText: boolean | null = null;
onSettingsChange((key) => {
  if (key === 'textSize') largeText = null;
});

/** « Taille du texte » sur ×1,25 ? (lu une fois, relu quand le réglage change). */
export function isLargeText(): boolean {
  if (largeText === null) largeText = loadTextSize() === 'large';
  return largeText;
}

/** Police réellement employée pour un texte. */
export function resolveFont(font: FontKey = 'body', sizable = false): FontKey {
  return sizable && font === 'body' && isLargeText() ? 'bodyLarge' : font;
}

/** Hauteur de ligne (pixels de jeu, avant l'échelle) d'un texte des dialogues, scènes et menus. */
export function sizableLineHeight(font: FontKey = 'body'): number {
  return PIXEL_FONTS[resolveFont(font, true)].lineHeight;
}

export type PixelText = Phaser.GameObjects.BitmapText & { readonly anchorX: number; readonly anchorAlign: TextAlign };

const ALIGN_CODE: Record<TextAlign, number> = { left: 0, center: 1, right: 2 };

/** Ajoute un texte pixel net. */
export function addText(scene: Phaser.Scene, x: number, y: number, text: string, options: TextOptions = {}): PixelText {
  const font = resolveFont(options.font, options.sizable);
  const scale = options.scale ?? 1;
  const obj = scene.add.bitmapText(0, Math.round(y), fontKey(font), text, PIXEL_FONTS[font].size * scale, ALIGN_CODE[options.align ?? 'left']);
  obj.setOrigin(0, 0);
  obj.setTint(options.color ?? PALETTE.parchemin);
  if (options.maxWidth) obj.setMaxWidth(options.maxWidth);
  const shadow = options.shadow ?? PALETTE.encre;
  const offset = options.shadowOffset ?? scale;
  if (shadow !== false) obj.setDropShadow(offset, offset, shadow, 1);
  const pixelText = Object.assign(obj, { anchorX: x, anchorAlign: options.align ?? 'left' }) as PixelText;
  realign(pixelText);
  return pixelText;
}

/** Change le texte en conservant l'ancrage (centré, aligné à droite…). */
export function setText(obj: PixelText, text: string): void {
  obj.setText(text);
  realign(obj);
}

function realign(obj: PixelText): void {
  const width = obj.width;
  const x = obj.anchorAlign === 'center' ? obj.anchorX - width / 2 : obj.anchorAlign === 'right' ? obj.anchorX - width : obj.anchorX;
  obj.x = Math.round(x);
}

/** Tronque un texte d'une ligne avec « … » pour qu'il tienne dans `maxWidth` pixels (jamais de débordement du cadre). */
export function fitText(obj: PixelText, maxWidth: number): PixelText {
  const full = obj.text;
  if (obj.width <= maxWidth) return obj;
  let n = full.length;
  while (n > 1) {
    n -= 1;
    obj.setText(`${full.slice(0, n).trimEnd()}…`);
    if (obj.width <= maxWidth) break;
  }
  realign(obj);
  return obj;
}
