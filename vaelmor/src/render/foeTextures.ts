/**
 * Indicateurs des ennemis du monde (jalon M3) : crâne de difficulté (GDD §7.5),
 * « ! » d'alerte (GDD §7.2) et « ? » quand la piste est perdue. Pixel art
 * procédural, contour sombre pour se lire sur l'herbe comme sur la pierre ;
 * le crâne est blanc, teinté par la couleur de la difficulté.
 */
import type Phaser from 'phaser';
import { PALETTE as P } from './palette';
import { PixelCanvas } from './pixelCanvas';

export const FOE_TEX = {
  skull: 'foe:skull',
  bang: 'foe:bang',
  /** Point d'exclamation rouge de l'embuscade. */
  bangRed: 'foe:bangRed',
  question: 'foe:question',
  /** Zone d'ombre sous les pieds d'un ennemi plus large que celle du héros (boss). */
  shadowBig: 'foe:shadowBig',
} as const;

/** `#` plein (teinté), `o` détail sombre (yeux, trait), `.` vide ; le contour est ajouté autour. */
const SKULL = [
  '..#####..',
  '.#######.',
  '#########',
  '#oo###oo#',
  '#oo###oo#',
  '#########',
  '.###o###.',
  '..#####..',
  '..#.#.#..',
] as const;

const BANG = [
  '..###..',
  '.#####.',
  '.##o##.',
  '.##o##.',
  '.##o##.',
  '.##o##.',
  '..#o#..',
  '.#####.',
  '.##o##.',
  '..###..',
] as const;

const QUESTION = [
  '..###..',
  '.#####.',
  '##o.o##',
  '#######',
  '...oo##',
  '..o####',
  '..o##..',
  '.#####.',
  '..o##..',
  '..###..',
] as const;

function paintPattern(scene: Phaser.Scene, key: string, rows: readonly string[], fill: number, detail: number): void {
  if (scene.textures.exists(key)) return;
  const h = rows.length;
  const w = (rows[0] ?? '').length;
  const canvas = new PixelCanvas(w + 2, h + 2);
  const at = (x: number, y: number): string => (x < 0 || y < 0 || x >= w || y >= h ? '.' : (rows[y] as string)[x] ?? '.');
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const c = at(x, y);
      if (c === '#') canvas.set(x + 1, y + 1, fill);
      else if (c === 'o') canvas.set(x + 1, y + 1, detail);
      else if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n === '#' || n === 'o')) canvas.set(x + 1, y + 1, P.encre);
    }
  }
  canvas.toTexture(scene, key);
}

export function ensureFoeTextures(scene: Phaser.Scene): void {
  paintPattern(scene, FOE_TEX.skull, SKULL, 0xffffff, P.ombreProfonde);
  paintPattern(scene, FOE_TEX.bang, BANG, P.jauneBle, P.rougeCendre);
  paintPattern(scene, FOE_TEX.bangRed, BANG, 0xe8302a, P.encre);
  paintPattern(scene, FOE_TEX.question, QUESTION, P.ecume, P.bleuNuit);
  if (!scene.textures.exists(FOE_TEX.shadowBig)) {
    const shadow = new PixelCanvas(18, 7);
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 18; x++) {
        const dx = (x + 0.5 - 9) / 9;
        const dy = (y + 0.5 - 3.5) / 3.5;
        if (dx * dx + dy * dy <= 1) shadow.set(x, y, P.encre, dx * dx + dy * dy > 0.55 ? 70 : 110);
      }
    }
    shadow.toTexture(scene, FOE_TEX.shadowBig);
  }
}
