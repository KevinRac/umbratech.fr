/**
 * Petit atelier de pixel art procédural : on écrit des pixels dans un canvas
 * hors écran puis on le convertit en texture Phaser. Sert aux placeholders de
 * qualité (décors, effets) tant que les vrais assets ne sont pas dessinés.
 *
 * Le tramage ordonné (matrice de Bayer 4×4) remplace les dégradés lisses : il
 * ne mélange jamais plus de deux teintes de la palette, comme sur GBA/SNES.
 */
import type Phaser from 'phaser';
import { rgb } from './palette';

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Seuil de tramage dans ]0, 1[ pour le pixel (x, y). */
export function bayer(x: number, y: number): number {
  const row = BAYER_4[((y % 4) + 4) % 4] as readonly number[];
  return ((row[((x % 4) + 4) % 4] as number) + 0.5) / 16;
}

export interface GradientStop {
  /** Position dans [0, 1]. */
  readonly at: number;
  readonly color: number;
}

export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly px: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D indisponible.');
    this.ctx = ctx;
    this.image = ctx.createImageData(width, height);
    this.px = this.image.data;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, color: number, alpha = 255): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!this.inBounds(ix, iy)) return;
    const i = (iy * this.width + ix) * 4;
    const [r, g, b] = rgb(color);
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
    this.px[i + 3] = alpha;
  }

  /** Couleur 0xRRGGBB du pixel, ou null s'il est transparent. */
  get(x: number, y: number): number | null {
    if (!this.inBounds(x, y)) return null;
    const i = (y * this.width + x) * 4;
    if ((this.px[i + 3] ?? 0) === 0) return null;
    return ((this.px[i] ?? 0) << 16) | ((this.px[i + 1] ?? 0) << 8) | (this.px[i + 2] ?? 0);
  }

  fillRect(x: number, y: number, w: number, h: number, color: number, alpha = 255): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color, alpha);
  }

  /** Disque plein (centre et rayon en pixels). */
  fillCircle(cx: number, cy: number, r: number, color: number): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, color);
      }
    }
  }

  /** Couleur tramée entre plusieurs arrêts, pour une valeur t dans [0, 1]. */
  static ditheredColor(stops: readonly GradientStop[], t: number, x: number, y: number): number {
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) throw new Error('Dégradé sans arrêt.');
    if (t <= first.at) return first.color;
    if (t >= last.at) return last.color;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i] as GradientStop;
      const b = stops[i + 1] as GradientStop;
      if (t >= a.at && t <= b.at) {
        const local = (t - a.at) / (b.at - a.at || 1);
        return local > bayer(x, y) ? b.color : a.color;
      }
    }
    return last.color;
  }

  /** Dégradé vertical tramé sur la bande [y0, y1[. */
  verticalGradient(y0: number, y1: number, stops: readonly GradientStop[]): void {
    const span = Math.max(1, y1 - y0 - 1);
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / span;
      for (let x = 0; x < this.width; x++) this.set(x, y, PixelCanvas.ditheredColor(stops, t, x, y));
    }
  }

  /** Envoie les pixels dans le canvas (à appeler avant de créer la texture). */
  commit(): HTMLCanvasElement {
    this.ctx.putImageData(this.image, 0, 0);
    return this.canvas;
  }

  /** Crée (ou remplace) une texture Phaser à partir du canvas. */
  toTexture(scene: Phaser.Scene, key: string): string {
    this.commit();
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, this.canvas);
    return key;
  }
}

/** Bruit de valeur 1D lissé et déterministe (pour silhouettes de reliefs). */
export function valueNoise1D(x: number, seed: number): number {
  const hash = (n: number): number => {
    let h = Math.imul(n ^ seed, 2654435761);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519);
    h ^= h >>> 13;
    return ((h >>> 0) % 10000) / 10000;
  };
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash(i) * (1 - s) + hash(i + 1) * s;
}

/** Bruit de valeur 2D périodique (tuilable) sur une grille de `period` cellules. */
export function tileableNoise2D(x: number, y: number, period: number, seed: number): number {
  const hash = (i: number, j: number): number => {
    const ii = ((i % period) + period) % period;
    const jj = ((j % period) + period) % period;
    let h = Math.imul(ii * 374761393 + jj * 668265263 + seed, 2654435761);
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177);
    return ((h >>> 0) % 10000) / 10000;
  };
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(i, j) * (1 - sx) + hash(i + 1, j) * sx;
  const bottom = hash(i, j + 1) * (1 - sx) + hash(i + 1, j + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}
