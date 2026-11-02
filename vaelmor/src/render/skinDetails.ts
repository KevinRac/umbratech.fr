/**
 * Détails distinctifs des recrues (décision n°121), peints par-dessus les skins et les portraits.
 *
 * Règles (retours de l'auteur du 02/11/2026) :
 *  - visibles au premier coup d'œil : ils changent la silhouette de la tête ;
 *  - cohérents avec la classe : chaque classe a sa propre liste (`CLASS_DETAILS`), tirée de ce qu'un
 *    personnage de ce métier pourrait porter (cimier ou cornes sur un casque, chapeau pointu pour un mage,
 *    fleurs dans les bois du druide…) ; jamais un chapeau sur un casque ;
 *  - neutres : or, ivoire, os, cuir, ardoise ; le rouge, le bleu et le vert restent aux camps.
 * Le 2e membre d'une classe porte le premier détail de sa liste, le 3e le deuxième, etc. (cycle).
 * Les sprites reçoivent `DETAIL_PAD` rangées libres au-dessus de la tête (feuille de recrue plus haute).
 * Module sans Phaser : il travaille sur un tampon RGBA (celui d'un `ImageData`).
 */
export interface RgbaBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Rangées ajoutées au-dessus de chaque image de sprite (cimier, cornes, chapeau, auréole…). */
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
const ARDOISE: Rgb = [70, 64, 74];
const ARDOISE_CLAIRE: Rgb = [104, 96, 108];
const CONTOUR: Rgb = [34, 25, 22];

export type DetailKind =
  | 'plume' // plume dorée piquée sur la tête ou dans la capuche
  | 'chapeau' // chapeau de voyage à large bord
  | 'bandeau' // bandeau ivoire noué, pans flottants
  | 'diademe' // cercle doré sur le front
  | 'cimier' // crête de crin ivoire sur le casque
  | 'cornes' // cornes d'os sur le casque ou la capuche
  | 'aureole' // anneau doré au-dessus de la tête
  | 'pointu' // chapeau pointu de mage
  | 'fleurs' // fleurs ivoire dans les cheveux ou les bois
  | 'queue' // queue de cheval (couleur des cheveux)
  | 'masque' // foulard ivoire sur le bas du visage, pan qui flotte
  | 'ailes' // ailettes ivoire de part et d'autre du casque
  | 'laurier'; // couronne de laurier doré

/** Détails possibles par classe, dans l'ordre d'attribution. */
export const CLASS_DETAILS: Readonly<Record<string, readonly (readonly DetailKind[])[]>> = {
  gardien_des_marees: [['cimier'], ['cornes'], ['laurier']],
  heraut_des_bannieres: [['ailes'], ['cornes'], ['laurier']],
  lame_du_serment: [['laurier'], ['queue'], ['bandeau']],
  veilleur_des_falaises: [['plume'], ['masque'], ['plume', 'masque']],
  heritier_des_cendres: [['pointu'], ['cornes'], ['aureole']],
  porte_lanterne: [['aureole'], ['laurier'], ['aureole', 'laurier']],
  alchimiste_des_saisons: [['chapeau'], ['fleurs'], ['chapeau', 'plume']],
  danseur_des_courants: [['plume'], ['queue'], ['masque']],
  invocateur_de_pierres_anciennes: [['pointu'], ['aureole'], ['cornes']],
  faconneur_de_racines: [['fleurs'], ['laurier'], ['fleurs', 'laurier']],
  ingenieur_des_ruines: [['chapeau'], ['bandeau'], ['chapeau', 'plume']],
  chasseur_de_serpents_de_mer: [['cornes'], ['masque'], ['cornes', 'masque']],
};
const DEFAULT_DETAILS: readonly (readonly DetailKind[])[] = [['laurier'], ['plume'], ['bandeau']];

/** Détails portés par une recrue d'une classe pour un numéro de variante (0 = aucun). */
export function detailsFor(variant: number, base = ''): DetailKind[] {
  if (variant <= 0) return [];
  const list = CLASS_DETAILS[base] ?? DEFAULT_DETAILS;
  return [...(list[(variant - 1) % list.length] as readonly DetailKind[])];
}

/** Ordre de peinture : derrière (auréole) puis par-dessus la tête, la plume en dernier. */
const ORDER: readonly DetailKind[] = ['aureole', 'queue', 'masque', 'diademe', 'laurier', 'bandeau', 'fleurs', 'cimier', 'ailes', 'cornes', 'chapeau', 'pointu', 'plume'];

/** Peint les détails de la variante `variant` de la classe `base` dans la cellule (ox, oy, w, h) ; `portrait` : portrait 64×64. */
export function paintDetails(buf: RgbaBuffer, ox: number, oy: number, w: number, h: number, variant: number, portrait: boolean, base = ''): void {
  const kinds = detailsFor(variant, base);
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
  const set = (x: number, y: number, c: Rgb): void => {
    const i = at(x, y);
    buf.data[i] = c[0];
    buf.data[i + 1] = c[1];
    buf.data[i + 2] = c[2];
    buf.data[i + 3] = 255;
  };
  const put = (x: number, y: number, c: Rgb): void => {
    if (!inside(x, y)) return;
    set(x, y, c);
    painted[y * w + x] = 1;
  };
  /** Bloc de s × s pixels (traits doublés sur les portraits). */
  const block = (x: number, y: number, c: Rgb): void => {
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) put(x + i, y + j, c);
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
    for (const [x, y] of add) set(x, y, CONTOUR);
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
  const tall = bottom - top;
  // Rangée du front (où se posent diadème, bandeau, chapeaux) et du bas du visage (foulard).
  const brow = top + (portrait ? 12 : 2);
  const chin = portrait ? Math.round(h * 0.6) : top + Math.max(5, Math.round(tall * 0.25));
  /** Couleur la plus fréquente sur le haut de la tête (cheveux, capuche ou casque). */
  const hairColor = (): Rgb => {
    const count = new Map<number, number>();
    for (let y = top; y <= top + (portrait ? 10 : 3); y++) {
      for (let x = hx - hw; x <= hx + hw; x++) {
        if (!inMask(x, y)) continue;
        const i = at(x, y);
        const key = ((buf.data[i] as number) << 16) | ((buf.data[i + 1] as number) << 8) | (buf.data[i + 2] as number);
        const lum = (buf.data[i] as number) + (buf.data[i + 1] as number) + (buf.data[i + 2] as number);
        if (lum < 90) continue; // pas le contour
        count.set(key, (count.get(key) ?? 0) + 1);
      }
    }
    let best = 0x6b4a32;
    let max = -1;
    for (const [k, v] of count) if (v > max) [best, max] = [k, v];
    return [(best >> 16) & 255, (best >> 8) & 255, best & 255];
  };
  const darker = (c: Rgb, k: number): Rgb => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

  const painters: Record<DetailKind, () => void> = {
    aureole: () => {
      // Anneau doré au-dessus de la tête (derrière elle sur un portrait, où le haut du cadre est proche).
      const cy = portrait ? top + 8 : top - 3;
      const rx = portrait ? hw + 4 : Math.max(3, hw - 1);
      const ry = portrait ? 5 : 1;
      for (let a = 0; a < 360; a += 3) {
        const x = Math.round(hx + rx * Math.cos((a * Math.PI) / 180));
        const y = Math.round(cy + ry * Math.sin((a * Math.PI) / 180));
        if (portrait && inMask(x, y)) continue;
        block(x, y, a > 180 && a < 360 ? OR_CLAIR : OR);
      }
      outline();
    },
    queue: () => {
      // Queue de cheval qui part de l'arrière de la tête et retombe sur le côté droit.
      const hair = hairColor();
      const span = rowSpan(brow + s, hx - hw - 1, hx + hw + 1);
      if (!span) return;
      const x0 = span[1];
      const path: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [4, 2], [5, 3], [5, 4], [5, 5], [4, 6], [4, 7]];
      for (const [dx, dy] of path) {
        block(x0 + dx * s, brow + s + dy * s, hair);
        block(x0 + dx * s - s, brow + s + dy * s, darker(hair, 0.75));
      }
      block(x0, brow + s, OR);
      block(x0 + s, brow + s, OR);
      outline();
    },
    masque: () => {
      // Foulard ivoire noué sur le bas du visage : il déborde un peu de la tête et son pan flotte à droite.
      const span = rowSpan(chin, hx - hw - 1, hx + hw + 1) ?? [hx - hw, hx + hw];
      for (let k = 0; k < 2 * s; k++) for (let x = span[0] - s; x <= span[1] + s; x++) put(x, chin + k, k >= s ? IVOIRE_OMBRE : IVOIRE);
      const tail: [number, number][] = [[1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [1, 1], [2, 2], [3, 3]];
      for (const [dx, dy] of tail) block(span[1] + s + dx * s, chin + dy * s, dy > dx - 1 ? IVOIRE_OMBRE : IVOIRE);
      outline();
    },
    ailes: () => {
      // Deux ailettes ivoire plantées sur les côtés du casque, qui s'ouvrent vers le haut.
      const y0 = top + (portrait ? 8 : 2);
      const span = rowSpan(y0, hx - hw - 1, hx + hw + 1) ?? [hx - hw, hx + hw];
      // Éventail plus large que haut (les cornes, elles, sont fines et montent).
      const wing: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, -1], [2, -1], [3, -1], [4, -1], [5, -1], [2, -2], [3, -2], [4, -2], [5, -2], [4, -3], [5, -3], [6, -3]];
      for (const side of [-1, 1] as const) {
        const x0 = side < 0 ? span[0] - s : span[1] + s;
        for (const [dx, dy] of wing) block(x0 + side * dx * s, y0 + dy * s, (dy & 1) === 0 ? IVOIRE : IVOIRE_OMBRE);
      }
      outline();
    },
    laurier: () => {
      // Couronne de laurier doré : un bandeau de feuilles qui dépasse en pointes de chaque côté de la tête.
      const span = rowSpan(brow, hx - hw - 1, hx + hw + 1) ?? [hx - hw, hx + hw];
      for (let k = 0; k < s; k++) for (let x = span[0]; x <= span[1]; x++) put(x, brow + k, (x + k) % 2 ? OR : OR_OMBRE);
      for (const side of [-1, 1] as const) {
        const x0 = side < 0 ? span[0] : span[1];
        // Petits brins de feuilles couchés vers l'arrière (pas vers le haut : on les prendrait pour des cornes).
        const leaves: [number, number][] = [[1, 0], [2, 0], [1, -1], [2, 1], [3, 1]];
        for (const [dx, dy] of leaves) block(x0 + side * dx * s, brow + dy * s, dy < 0 ? OR_CLAIR : OR);
      }
      outline();
    },
    diademe: () => {
      // Cercle doré sur le front, pierre ivoire au milieu.
      for (let k = 0; k < s; k++) {
        const span = rowSpan(brow + k, hx - hw - 1, hx + hw + 1);
        if (!span) continue;
        for (let x = span[0]; x <= span[1]; x++) put(x, brow + k, x === hx ? OR_CLAIR : OR);
      }
      block(hx - (portrait ? 1 : 0), brow - s, IVOIRE);
      block(hx - (portrait ? 1 : 0), brow - 2 * s, OR_CLAIR);
      outline();
    },
    bandeau: () => {
      // Bande ivoire autour du haut de la tête, nœud à droite et deux pans qui flottent.
      for (let k = 0; k < 2 * s; k++) {
        const span = rowSpan(brow + k, hx - hw - 1, hx + hw + 1);
        if (!span) continue;
        for (let x = span[0]; x <= span[1]; x++) put(x, brow + k, k >= s ? IVOIRE_OMBRE : IVOIRE);
      }
      const knot = rowSpan(brow, hx - hw - 1, hx + hw + 1);
      if (knot) {
        const tails: [number, number][] = [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [5, 2], [0, 1], [1, 2], [2, 3], [3, 4], [3, 5]];
        for (const [dx, dy] of tails) block(knot[1] + 1 + dx * s, brow + dy * s, dy > dx ? IVOIRE_OMBRE : IVOIRE);
      }
      outline();
    },
    fleurs: () => {
      // Trois fleurs ivoire à cœur doré, posées sur le haut de la tête (ou au bout des bois).
      const xs = [hx - Math.round(hw * 0.7), hx, hx + Math.round(hw * 0.7)];
      xs.forEach((x, i) => {
        const col = rowSpan(top + (i === 1 ? 0 : s) + (portrait ? 4 : 0), x - s, x + s);
        const y = (col ? top + (portrait ? 4 : 0) : top) + (i === 1 ? 0 : s);
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) block(x + dx * s, y + dy * s, IVOIRE);
        block(x, y, OR);
      });
      outline();
    },
    cimier: () => {
      // Crête de crin ivoire sur le dessus du casque, qui retombe vers l'arrière (à droite), base dorée.
      const len = portrait ? 18 : 9;
      for (let t = 0; t < len; t++) {
        const x = hx - Math.round(hw * 0.5) + t * (portrait ? 2 : 1);
        const lift = Math.round(Math.sin((t / (len - 1)) * Math.PI) * (portrait ? 6 : 3));
        const yb = top + (portrait ? 2 : 0);
        put(x, yb, OR_OMBRE);
        if (portrait) put(x + 1, yb, OR_OMBRE);
        for (let k = 1; k <= lift + (portrait ? 2 : 1); k++) {
          put(x, yb - k, k === lift + (portrait ? 2 : 1) ? IVOIRE : k % 2 ? IVOIRE_OMBRE : IVOIRE);
          if (portrait) put(x + 1, yb - k, IVOIRE);
        }
      }
      outline();
    },
    cornes: () => {
      // Deux cornes d'os qui sortent des côtés de la tête et montent en s'écartant.
      const y0 = top + (portrait ? 8 : 2);
      const span = rowSpan(y0, hx - hw - 1, hx + hw + 1) ?? [hx - hw, hx + hw];
      const horn: [number, number][] = [[0, 0], [-1, -1], [-1, -2], [-2, -3], [-2, -4], [-2, -5]];
      for (const side of [-1, 1] as const) {
        const x0 = side < 0 ? span[0] : span[1];
        horn.forEach(([dx, dy], i) => {
          block(x0 + side * -dx * s, y0 + dy * s, i === horn.length - 1 ? IVOIRE_OMBRE : IVOIRE);
          if (i < 3) block(x0 + side * (-dx * s - s), y0 + dy * s, IVOIRE_OMBRE);
        });
      }
      outline();
    },
    chapeau: () => {
      // Calotte de cuir, ruban doré, large bord qui déborde des deux côtés.
      const brimY = top + (portrait ? 9 : 3);
      const brimHalf = hw + (portrait ? 8 : 3);
      const crownHalf = Math.max(2 * s, Math.round(hw * 0.7));
      const crownTop = top - (portrait ? 6 : 3);
      for (let y = crownTop; y < brimY; y++) {
        const half = y === crownTop ? crownHalf - s : crownHalf;
        for (let x = hx - half; x <= hx + half; x++) put(x, y, x < hx - half / 3 ? CUIR_CLAIR : CUIR);
      }
      for (let k = 0; k < s; k++) for (let x = hx - crownHalf; x <= hx + crownHalf; x++) put(x, brimY - 1 - k, OR);
      for (let k = 0; k < s + (portrait ? 1 : 0); k++) for (let x = hx - brimHalf; x <= hx + brimHalf; x++) put(x, brimY + k, k === 0 ? CUIR_CLAIR : CUIR_SOMBRE);
      outline();
    },
    pointu: () => {
      // Chapeau pointu de mage : bord, cône qui monte et dont la pointe retombe vers la droite.
      const brimY = top + (portrait ? 8 : 2);
      const brimHalf = hw + (portrait ? 6 : 2);
      const baseHalf = Math.max(2 * s, Math.round(hw * 0.75));
      const height = portrait ? 18 : 9;
      for (let t = 0; t < height; t++) {
        const y = brimY - 1 - t;
        const half = Math.max(0, Math.round(baseHalf * (1 - t / height)));
        const lean = Math.round(((t / height) ** 2) * (portrait ? 8 : 4));
        for (let x = hx - half + lean; x <= hx + half + lean; x++) put(x, y, x <= hx + lean - half / 2 ? ARDOISE_CLAIRE : ARDOISE);
      }
      for (let k = 0; k < s; k++) for (let x = hx - baseHalf; x <= hx + baseHalf; x++) put(x, brimY - 1 - k, OR);
      for (let k = 0; k < s; k++) for (let x = hx - brimHalf; x <= hx + brimHalf; x++) put(x, brimY + k, ARDOISE_CLAIRE);
      outline();
    },
    plume: () => {
      // Grande plume dorée qui part du haut de la tête (ou du chapeau) et se courbe vers la gauche.
      const baseY = portrait ? top + 16 : top + (kinds.includes('chapeau') ? 0 : s);
      const baseX = portrait ? hx - hw + 4 : hx - Math.round(hw * 0.35);
      const len = portrait ? Math.min(20, baseY) : 8;
      for (let t = 0; t < len; t++) {
        const y = baseY - t;
        const x = baseX - Math.round(((t * t) / len) * (portrait ? 0.55 : 0.5));
        const width = t === 0 || t === len - 1 ? 1 : portrait ? 3 : 2;
        for (let k = 0; k < width; k++) put(x + k, y, k === 0 ? OR_OMBRE : k === width - 1 ? OR_CLAIR : OR);
      }
      outline();
    },
  };
  for (const kind of ORDER) if (kinds.includes(kind)) painters[kind]();
}
