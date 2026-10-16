/**
 * Création de texte pixel. Toujours passer par `addText` : la police, l'échelle
 * entière, la couleur et l'ombre portée restent cohérentes dans tout le jeu.
 */
import Phaser from 'phaser';
import { PALETTE } from '../render/palette';
import { PIXEL_FONTS, fontKey, type FontKey } from '../render/pixelFont';

export type TextAlign = 'left' | 'center' | 'right';

export interface TextOptions {
  readonly font?: FontKey;
  /** Agrandissement entier (×1, ×2, ×3) : garde les pixels carrés. */
  readonly scale?: 1 | 2 | 3;
  readonly color?: number;
  /** Ancrage horizontal par rapport à x (le texte reste sur des pixels entiers). */
  readonly align?: TextAlign;
  /** Couleur de l'ombre portée (1 px en bas à droite, ×échelle), ou false. */
  readonly shadow?: number | false;
  /** Largeur maximale avant retour à la ligne, en pixels de jeu. */
  readonly maxWidth?: number;
}

export type PixelText = Phaser.GameObjects.BitmapText & { readonly anchorX: number; readonly anchorAlign: TextAlign };

const ALIGN_CODE: Record<TextAlign, number> = { left: 0, center: 1, right: 2 };

/** Ajoute un texte pixel net. */
export function addText(scene: Phaser.Scene, x: number, y: number, text: string, options: TextOptions = {}): PixelText {
  const font = options.font ?? 'body';
  const scale = options.scale ?? 1;
  const obj = scene.add.bitmapText(0, Math.round(y), fontKey(font), text, PIXEL_FONTS[font].size * scale, ALIGN_CODE[options.align ?? 'left']);
  obj.setOrigin(0, 0);
  obj.setTint(options.color ?? PALETTE.parchemin);
  if (options.maxWidth) obj.setMaxWidth(options.maxWidth);
  const shadow = options.shadow ?? PALETTE.encre;
  if (shadow !== false) obj.setDropShadow(scale, scale, shadow, 1);
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
