/**
 * Cadre d'interface « métal patiné » (GDD §12.4) dessiné par code : bordure
 * sombre, liseré métal éclairé en haut à gauche, rivets dorés aux coins.
 * Toutes les coordonnées sont entières pour rester sur la grille de pixels.
 */
import type Phaser from 'phaser';
import { PALETTE } from '../render/palette';

export interface PanelOptions {
  readonly fill?: number;
  readonly fillAlpha?: number;
  readonly depth?: number;
}

export function drawPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, options: PanelOptions = {}): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const X = Math.round(x);
  const Y = Math.round(y);
  const W = Math.round(width);
  const H = Math.round(height);

  // Fond.
  g.fillStyle(options.fill ?? 0x14121f, options.fillAlpha ?? 0.88);
  g.fillRect(X + 2, Y + 2, W - 4, H - 4);

  // Contour extérieur sombre.
  g.fillStyle(PALETTE.encre, 1);
  g.fillRect(X + 1, Y, W - 2, 1);
  g.fillRect(X + 1, Y + H - 1, W - 2, 1);
  g.fillRect(X, Y + 1, 1, H - 2);
  g.fillRect(X + W - 1, Y + 1, 1, H - 2);

  // Liseré métal : clair en haut et à gauche, sombre en bas et à droite.
  g.fillStyle(PALETTE.metalClair, 1);
  g.fillRect(X + 1, Y + 1, W - 2, 1);
  g.fillRect(X + 1, Y + 1, 1, H - 2);
  g.fillStyle(PALETTE.metal, 1);
  g.fillRect(X + 1, Y + H - 2, W - 2, 1);
  g.fillRect(X + W - 2, Y + 1, 1, H - 2);

  // Filet intérieur discret.
  g.fillStyle(0x2a2540, 1);
  g.fillRect(X + 4, Y + 3, W - 8, 1);
  g.fillRect(X + 4, Y + H - 4, W - 8, 1);

  // Rivets aux coins.
  for (const [cx, cy] of [
    [X + 1, Y + 1],
    [X + W - 4, Y + 1],
    [X + 1, Y + H - 4],
    [X + W - 4, Y + H - 4],
  ] as const) {
    g.fillStyle(PALETTE.metal, 1);
    g.fillRect(cx, cy, 3, 3);
    g.fillStyle(PALETTE.ambre, 1);
    g.fillRect(cx + 1, cy + 1, 1, 1);
  }

  if (options.depth !== undefined) g.setDepth(options.depth);
  return g;
}
