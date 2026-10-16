/**
 * Tampon de pixels RGBA hors navigateur : sert à peindre les tuiles du monde
 * (outil de génération, exécuté sous Node).
 */
export class Px {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Remplace le pixel (alpha 255 par défaut ; 0 = efface). */
  set(x: number, y: number, color: number, alpha = 255): void {
    if (!this.inBounds(x, y)) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = (color >> 16) & 0xff;
    this.data[i + 1] = (color >> 8) & 0xff;
    this.data[i + 2] = color & 0xff;
    this.data[i + 3] = alpha;
  }

  /** Superpose une couleur (avec alpha 0–255) sur le pixel existant. */
  blend(x: number, y: number, color: number, alpha: number): void {
    if (!this.inBounds(x, y) || alpha <= 0) return;
    const i = (y * this.width + x) * 4;
    const dstA = (this.data[i + 3] as number) / 255;
    const srcA = alpha / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.data[i] = Math.round((r * srcA + (this.data[i] as number) * dstA * (1 - srcA)) / outA);
    this.data[i + 1] = Math.round((g * srcA + (this.data[i + 1] as number) * dstA * (1 - srcA)) / outA);
    this.data[i + 2] = Math.round((b * srcA + (this.data[i + 2] as number) * dstA * (1 - srcA)) / outA);
    this.data[i + 3] = Math.round(outA * 255);
  }

  alphaAt(x: number, y: number): number {
    return this.inBounds(x, y) ? (this.data[(y * this.width + x) * 4 + 3] as number) : 0;
  }

  /** Couleur 0xRRGGBB du pixel, ou -1 s'il est transparent. */
  colorAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) return -1;
    const i = (y * this.width + x) * 4;
    if ((this.data[i + 3] as number) === 0) return -1;
    return ((this.data[i] as number) << 16) | ((this.data[i + 1] as number) << 8) | (this.data[i + 2] as number);
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 255): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color, alpha);
  }

  /** Copie une région de `src` ; les pixels transparents de la source ne remplacent rien. */
  blit(src: Px, sx: number, sy: number, w: number, h: number, dx: number, dy: number): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const a = src.alphaAt(sx + i, sy + j);
        if (a === 0) continue;
        const c = src.colorAt(sx + i, sy + j);
        if (a === 255) this.set(dx + i, dy + j, c);
        else this.blend(dx + i, dy + j, c, a);
      }
    }
  }

  /** Copie exacte (y compris la transparence) d'une région de `src`. */
  copy(src: Px, sx: number, sy: number, w: number, h: number, dx: number, dy: number): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!this.inBounds(dx + i, dy + j)) continue;
        const si = ((sy + j) * src.width + (sx + i)) * 4;
        const di = ((dy + j) * this.width + (dx + i)) * 4;
        for (let k = 0; k < 4; k++) this.data[di + k] = src.inBounds(sx + i, sy + j) ? (src.data[si + k] as number) : 0;
      }
    }
  }
}

/** Mélange linéaire de deux couleurs 0xRRGGBB. */
export function mix(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const r = Math.round(((a >> 16) & 0xff) * (1 - k) + ((b >> 16) & 0xff) * k);
  const g = Math.round(((a >> 8) & 0xff) * (1 - k) + ((b >> 8) & 0xff) * k);
  const bl = Math.round((a & 0xff) * (1 - k) + (b & 0xff) * k);
  return (r << 16) | (g << 8) | bl;
}
