/**
 * Détails distinctifs des recrues (décision n°121, revue le 02/11/2026 : « visibles au premier coup d'œil »),
 * peints par-dessus les skins et les portraits. Ils changent la silhouette, pas seulement un pixel :
 *   1. grande plume dorée plantée sur la tête ;
 *   2. chapeau de voyage à large bord ;
 *   3. bandeau ivoire noué, dont les deux pans flottent sur le côté ;
 *   4. chapeau à plume, puis le cycle recommence.
 * (Une cape derrière le corps a été essayée : cachée par les personnages larges, illisible.)
 * Couleurs neutres (or, cuir, ivoire) : le rouge, le bleu et le vert restent aux camps.
 * Les sprites reçoivent `DETAIL_PAD` rangées libres au-dessus de la tête (feuille de recrue plus haute).
 * Module sans Phaser : il travaille sur un tampon RGBA (celui d'un `ImageData`).
 */
export interface RgbaBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Rangées ajoutées au-dessus de chaque image de sprite pour la plume et le chapeau. */
export const DETAIL_PAD = 8;

type Rgb = readonly [number, number, number];
const OR: Rgb = [240, 198, 84];
const OR_CLAIR: Rgb = [255, 232, 150];
const OR_OMBRE: Rgb = [178, 128, 44];
const CUIR: Rgb = [104, 70, 44];
const CUIR_CLAIR: Rgb = [140, 98, 62];
const CUIR_SOMBRE: Rgb = [70, 46, 30];
const IVOIRE: Rgb = [240, 232, 210];
const IVOIRE_OMBRE: Rgb = [190, 176, 150];
const CONTOUR: Rgb = [34, 25, 22];

export type DetailKind = 'plume' | 'chapeau' | 'bandeau';

const CYCLE: readonly (readonly DetailKind[])[] = [['plume'], ['chapeau'], ['bandeau'], ['chapeau', 'plume']];

/** Détails portés pour un numéro de variante (0 = aucun). */
export function detailsFor(variant: number): DetailKind[] {
  if (variant <= 0) return [];
  return [...(CYCLE[(variant - 1) % CYCLE.length] as readonly DetailKind[])];
}

/** Peint les détails d'une variante dans la cellule (ox, oy, w, h) ; `portrait` : portrait 64×64 (traits doublés). */
export function paintDetails(buf: RgbaBuffer, ox: number, oy: number, w: number, h: number, variant: number, portrait: boolean): void {
  const kinds = detailsFor(variant);
  if (kinds.length === 0) return;
  const at = (x: number, y: number): number => ((oy + y) * buf.width + ox + x) * 4;
  // Silhouette d'origine (avant toute peinture), pour les contours et le placement.
  const mask = new Uint8Array(w * h);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((buf.data[at(x, y) + 3] as number) < 128) continue;
      mask[y * w + x] = 1;
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return;
  const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h;
  const inMask = (x: number, y: number): boolean => inside(x, y) && mask[y * w + x] === 1;
  const painted = new Uint8Array(w * h);
  const put = (x: number, y: number, c: Rgb): void => {
    if (!inside(x, y)) return;
    const i = at(x, y);
    buf.data[i] = c[0];
    buf.data[i + 1] = c[1];
    buf.data[i + 2] = c[2];
    buf.data[i + 3] = 255;
    painted[y * w + x] = 1;
  };
  /** Contour sombre autour de ce qui vient d'être peint, là où il n'y a ni personnage ni peinture. */
  const outline = (): void => {
    const add: [number, number][] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (painted[y * w + x] || inMask(x, y)) continue;
        const near = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => inside(nx as number, ny as number) && painted[(ny as number) * w + (nx as number)] === 1);
        if (near) add.push([x, y]);
      }
    }
    for (const [x, y] of add) {
      const i = at(x, y);
      buf.data[i] = CONTOUR[0];
      buf.data[i + 1] = CONTOUR[1];
      buf.data[i + 2] = CONTOUR[2];
      buf.data[i + 3] = 255;
    }
    painted.fill(0);
  };
  const rowSpan = (y: number, x0 = 0, x1 = w - 1): [number, number] | null => {
    let a = -1;
    let b = -1;
    for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
      if (!inMask(x, y)) continue;
      if (a < 0) a = x;
      b = x;
    }
    return a < 0 ? null : [a, b];
  };
  // Tête : centre et demi-largeur mesurés sur ses premières rangées (les armes qui dépassent sur les côtés n'y sont pas).
  const s = portrait ? 2 : 1;
  const headRows = portrait ? 14 : 5;
  let hx = 0;
  let hw = 0;
  let n = 0;
  for (let y = top; y <= Math.min(bottom, top + headRows); y++) {
    const span = portrait ? rowSpan(y, Math.floor(w * 0.15), Math.ceil(w * 0.85)) : rowSpan(y);
    if (!span) continue;
    hx += (span[0] + span[1]) / 2;
    hw = Math.max(hw, (span[1] - span[0]) / 2);
    n++;
  }
  if (n === 0) return;
  hx = Math.round(hx / n);
  hw = Math.max(3 * s, Math.min(Math.round(hw), portrait ? 22 : 7));

  if (kinds.includes('bandeau')) {
    // Bande ivoire autour du haut de la tête, nœud à droite et deux pans qui flottent.
    const by = top + (portrait ? 12 : 2);
    for (let k = 0; k < 2 * s; k++) {
      const y = by + k;
      const span = rowSpan(y, hx - hw - 1, hx + hw + 1);
      if (!span) continue;
      for (let x = span[0]; x <= span[1]; x++) put(x, y, k >= s ? IVOIRE_OMBRE : IVOIRE);
    }
    const knot = rowSpan(by, hx - hw - 1, hx + hw + 1);
    if (knot) {
      const kx = knot[1] + 1;
      const tails: [number, number][] = [
        [0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [5, 2],
        [0, 1], [1, 2], [2, 3], [3, 4], [3, 5],
      ];
      for (const [dx, dy] of tails) for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) put(kx + dx * s + i, by + dy * s + j, dy > dx ? IVOIRE_OMBRE : IVOIRE);
    }
    outline();
  }

  if (kinds.includes('chapeau')) {
    // Calotte posée sur le haut de la tête, large bord sombre qui déborde des deux côtés.
    const brimY = top + (portrait ? 9 : 3);
    const brimHalf = hw + (portrait ? 8 : 3);
    const crownHalf = Math.max(2 * s, Math.round(hw * 0.7));
    const crownTop = top - (portrait ? 6 : 3);
    for (let y = crownTop; y < brimY; y++) {
      const half = y === crownTop ? crownHalf - s : crownHalf;
      for (let x = hx - half; x <= hx + half; x++) put(x, y, x < hx - half / 3 ? CUIR_CLAIR : CUIR);
    }
    // Ruban doré au pied de la calotte.
    for (let k = 0; k < s; k++) for (let x = hx - crownHalf; x <= hx + crownHalf; x++) put(x, brimY - 1 - k, OR);
    for (let k = 0; k < s + (portrait ? 1 : 0); k++) for (let x = hx - brimHalf; x <= hx + brimHalf; x++) put(x, brimY + k, k === 0 ? CUIR_CLAIR : CUIR_SOMBRE);
    outline();
  }

  if (kinds.includes('plume')) {
    // Grande plume dorée qui part du haut de la tête et se courbe vers la gauche.
    const baseY = portrait ? top + 16 : top + (kinds.includes('chapeau') ? 0 : s);
    const baseX = portrait ? hx - hw + 4 : hx - Math.round(hw * 0.35);
    const len = portrait ? Math.min(20, baseY) : 8;
    for (let t = 0; t < len; t++) {
      const y = baseY - t;
      const curve = Math.round(((t * t) / len) * (portrait ? 0.55 : 0.5));
      const x = baseX - curve;
      const width = t === 0 || t === len - 1 ? 1 : portrait ? 3 : 2;
      for (let k = 0; k < width * (portrait ? 1 : 1); k++) put(x + k, y, k === 0 ? OR_OMBRE : k === width - 1 ? OR_CLAIR : OR);
    }
    outline();
  }
}
