/**
 * Textures d'effets de l'écran de combat rapproché (jalon M8, lot 3, GDD §11.5),
 * peintes par code en pixels d'art (affichées ×3) : trois coupures (diagonale,
 * croix, arc), un cercle runique, une étincelle carrée. Blanches au cœur,
 * liseré chaud ; le rendu les teinte à la couleur de l'élément.
 */
import type Phaser from 'phaser';
import { PixelCanvas } from './pixelCanvas';
import { PALETTE } from './palette';
import { SLASH_IDS, type SlashId } from '../data/schemas';

export const SLASH_SHAPES = SLASH_IDS;
export type SlashShape = SlashId;

export const FX_TEX = {
  slash: (shape: SlashShape): string => `closeup:fx:slash:${shape}`,
  rune: 'closeup:fx:rune',
  dot: 'closeup:fx:dot',
  /** Boule douce (flamme, bulle, poussière) : cœur blanc, deux anneaux plus sombres, pixels nets. */
  puff: 'closeup:fx:puff',
} as const;

const EDGE = PALETTE.lumiereDoree;

/** Croissant : dans le disque (cx, cy, r) mais hors du disque décalé (dx, dy) ; tourné de `angle`. */
function crescent(c: PixelCanvas, size: number, angle: number, thickness: number): void {
  const mid = size / 2;
  const r = size * 0.46;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const inside = (x: number, y: number): boolean => {
    const u = (x - mid) * cos + (y - mid) * sin;
    const v = -(x - mid) * sin + (y - mid) * cos;
    const a = u * u + v * v <= r * r;
    const b = (u - thickness) * (u - thickness) + v * v <= (r * 0.96) * (r * 0.96);
    return a && !b && Math.abs(v) < r * 0.98;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      c.set(x, y, edge ? EDGE : 0xffffff);
    }
  }
}

/** Trait droit épais (pour la croix), effilé aux deux bouts. */
function stroke(c: PixelCanvas, size: number, angle: number): void {
  const mid = size / 2;
  const len = size * 0.48;
  for (let t = -len; t <= len; t += 0.5) {
    const w = Math.max(0, 2.2 * (1 - Math.abs(t) / len));
    for (let s = -w; s <= w; s += 0.5) {
      const x = mid + t * Math.cos(angle) - s * Math.sin(angle);
      const y = mid + t * Math.sin(angle) + s * Math.cos(angle);
      c.set(x, y, Math.abs(s) > w - 0.8 ? EDGE : 0xffffff);
    }
  }
}

/** Crée (une fois) les textures d'effets. */
export function ensureCloseupFx(scene: Phaser.Scene): void {
  if (scene.textures.exists(FX_TEX.rune)) return;
  const size = 40;
  const diag = new PixelCanvas(size, size);
  crescent(diag, size, -Math.PI / 4, 5);
  diag.toTexture(scene, FX_TEX.slash('diagonale'));
  const arc = new PixelCanvas(size, size);
  crescent(arc, size, Math.PI / 2, 6);
  arc.toTexture(scene, FX_TEX.slash('arc'));
  const cross = new PixelCanvas(size, size);
  stroke(cross, size, Math.PI / 4);
  stroke(cross, size, -Math.PI / 4);
  cross.toTexture(scene, FX_TEX.slash('croix'));
  // Cercle runique vu en perspective (ellipse), graduations et trois glyphes.
  const rw = 44;
  const rh = 14;
  const rune = new PixelCanvas(rw, rh);
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    rune.set(rw / 2 + Math.cos(a) * (rw / 2 - 1), rh / 2 + Math.sin(a) * (rh / 2 - 1), 0xffffff);
    rune.set(rw / 2 + Math.cos(a) * (rw / 2 - 5), rh / 2 + Math.sin(a) * (rh / 2 - 3), i % 30 < 18 ? 0xffffff : EDGE);
    if (i % 60 === 0) for (let k = 2; k <= 4; k++) rune.set(rw / 2 + Math.cos(a) * (rw / 2 - k), rh / 2 + Math.sin(a) * (rh / 2 - k * 0.5), EDGE);
  }
  for (const gx of [rw / 2 - 8, rw / 2, rw / 2 + 8]) {
    rune.set(gx, rh / 2 - 1, 0xffffff);
    rune.set(gx, rh / 2, 0xffffff);
    rune.set(gx - 1, rh / 2, EDGE);
    rune.set(gx + 1, rh / 2 - 1, EDGE);
  }
  rune.toTexture(scene, FX_TEX.rune);
  const r = 6;
  const puff = new PixelCanvas(r * 2 + 1, r * 2 + 1);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 0.3) continue;
      // Tons qui seront multipliés par la teinte : cœur blanc, anneaux gris clair (jamais noir).
      const c = d < r * 0.4 ? 0xffffff : d < r * 0.75 ? 0xdcdcdc : 0xa8a8a8;
      puff.set(x + r, y + r, c, d > r - 0.7 ? 170 : 255);
    }
  }
  puff.toTexture(scene, FX_TEX.puff);
  const dot = new PixelCanvas(3, 3);
  dot.fillRect(0, 0, 3, 3, 0xffffff);
  dot.toTexture(scene, FX_TEX.dot);
}
