/**
 * Détails distinctifs des recrues (décision n°121), peints par-dessus les skins et les portraits :
 * plume ivoire dans les cheveux (détail 1), écharpe ivoire au cou (détail 2), les deux (détail 3),
 * puis le cycle recommence. Couleurs neutres (ivoire, cuir, laiton) : le rouge, le bleu et le vert restent
 * aux camps. Module sans Phaser : il travaille sur un tampon RGBA (celui d'un `ImageData`).
 */
export interface RgbaBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

type Rgb = readonly [number, number, number];
const IVOIRE: Rgb = [242, 234, 214];
const IVOIRE_OMBRE: Rgb = [196, 184, 158];
const CUIR_SOMBRE: Rgb = [78, 47, 28];
const CONTOUR: Rgb = [38, 28, 24];

export type DetailKind = 'plume' | 'echarpe';

/** Détails portés pour un numéro de variante (0 = aucun). */
export function detailsFor(variant: number): DetailKind[] {
  if (variant <= 0) return [];
  const k = (variant - 1) % 3;
  return k === 0 ? ['plume'] : k === 1 ? ['echarpe'] : ['plume', 'echarpe'];
}

/** Peint les détails d'une variante dans la cellule (ox, oy, w, h) : `scale` 1 pour un sprite, 2 pour un portrait. */
export function paintDetails(buf: RgbaBuffer, ox: number, oy: number, w: number, h: number, variant: number, portrait: boolean): void {
  const kinds = detailsFor(variant);
  if (kinds.length === 0) return;
  const alpha = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : (buf.data[((oy + y) * buf.width + ox + x) * 4 + 3] as number));
  const solid = (x: number, y: number): boolean => alpha(x, y) >= 128;
  // Silhouette d'origine (avant toute peinture), pour les contours et le placement.
  const mask = new Uint8Array(w * h);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      mask[y * w + x] = 1;
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return;
  const inMask = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  const put = (x: number, y: number, c: Rgb): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = ((oy + y) * buf.width + ox + x) * 4;
    buf.data[i] = c[0];
    buf.data[i + 1] = c[1];
    buf.data[i + 2] = c[2];
    buf.data[i + 3] = 255;
  };
  const rowSpan = (y: number, x0 = 0, x1 = w - 1): [number, number] | null => {
    let a = -1;
    let b = -1;
    for (let x = x0; x <= x1; x++) {
      if (!inMask(x, y)) continue;
      if (a < 0) a = x;
      b = x;
    }
    return a < 0 ? null : [a, b];
  };
  /** Dessine une forme (pixels relatifs à l'ancre) avec un contour sombre là où elle déborde de la silhouette. */
  const stamp = (pixels: readonly (readonly [number, number, Rgb])[], ax: number, ay: number, s: number): void => {
    const own = new Set<string>();
    for (const [dx, dy] of pixels) for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) own.add(`${ax + dx * s + i},${ay + dy * s + j}`);
    for (const key of own) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        if (!own.has(`${nx},${ny}`) && !inMask(nx, ny)) put(nx, ny, CONTOUR);
      }
    }
    for (const [dx, dy, c] of pixels) for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) put(ax + dx * s + i, ay + dy * s + j, c);
  };

  const s = portrait ? 2 : 1;
  for (const kind of kinds) {
    if (kind === 'plume') {
      // Plume plantée sur le côté gauche de la tête, penchée vers l'extérieur.
      const headRow = Math.min(bottom, top + (portrait ? 8 : 2));
      const span = portrait ? rowSpan(headRow, Math.floor(w * 0.2), Math.ceil(w * 0.8)) : rowSpan(headRow);
      if (!span) continue;
      const ax = span[0] + (portrait ? 3 : 1);
      const ay = headRow;
      stamp(
        [
          [-3, -5, IVOIRE],
          [-3, -4, IVOIRE],
          [-2, -4, IVOIRE_OMBRE],
          [-2, -3, IVOIRE],
          [-1, -3, IVOIRE_OMBRE],
          [-2, -2, IVOIRE],
          [-1, -2, IVOIRE_OMBRE],
          [-1, -1, IVOIRE],
          [0, -1, IVOIRE_OMBRE],
          [0, 0, CUIR_SOMBRE],
        ],
        ax,
        ay,
        s,
      );
    } else {
      // Écharpe ivoire drapée au cou : une bande légèrement creusée au milieu, un nœud et un pan qui pend.
      // Le centre suit la tête (haut de la silhouette), pas les armes qui dépassent sur les côtés.
      let hx = 0;
      let n = 0;
      for (let y = top; y <= Math.min(bottom, top + (portrait ? 12 : 4)); y++) {
        const span = portrait ? rowSpan(y, Math.floor(w * 0.2), Math.ceil(w * 0.8)) : rowSpan(y);
        if (span) {
          hx += (span[0] + span[1]) / 2;
          n++;
        }
      }
      if (n === 0) continue;
      hx = Math.round(hx / n);
      const ny = portrait ? Math.round(h * 0.78) : top + Math.round((bottom - top) * 0.42);
      const hw = portrait ? 14 : 4;
      const thick = portrait ? 4 : 2;
      for (let x = hx - hw; x <= hx + hw; x++) {
        const u = (x - hx) / hw;
        const sag = Math.round((1 - u * u) * (portrait ? 3 : 1));
        for (let k = 0; k < thick; k++) {
          const y = ny + sag + k;
          if (!inMask(x, y) && !inMask(x, y - 1)) continue;
          put(x, y, k === thick - 1 ? IVOIRE_OMBRE : IVOIRE);
        }
      }
      // Nœud et pan, côté gauche de l'image.
      const tx = hx - Math.round(hw * 0.55);
      const len = portrait ? 8 : 4;
      const y0 = ny + thick + (portrait ? 1 : 0);
      for (let t = 0; t < len; t++) {
        const y = y0 + t;
        if (y >= h) break;
        const x = tx - (portrait ? Math.floor(t / 4) : 0);
        put(x, y, t === len - 1 ? IVOIRE_OMBRE : IVOIRE);
        if (portrait) put(x + 1, y, IVOIRE_OMBRE);
        if (!inMask(x - 1, y)) put(x - 1, y, CONTOUR);
        const right = x + (portrait ? 2 : 1);
        if (!inMask(right, y)) put(right, y, CONTOUR);
      }
    }
  }
}
