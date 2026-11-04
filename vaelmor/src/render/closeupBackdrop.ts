/**
 * Fonds et socles de l'écran de combat rapproché (jalon M8, décision n°208),
 * peints par code dans la charte du monde (n°43 à n°46) : palette « fin
 * d'après-midi », lumière en haut à gauche, ombres violet-bleu, jamais de noir
 * ni de gris neutre, dégradés tramés (Bayer) plutôt que lisses.
 *
 * Un fond fait 320×180 pixels d'art (affiché ×3 sur le canevas 960×540) : ciel,
 * plans lointains (collines, futaie, cimes, toits, mer, tours), sol jusqu'en bas.
 * Un socle est la dalle de terrain sous un combattant (dessus éclairé, tranche
 * dans l'ombre), comme les plateformes des Fire Emblem GBA.
 *
 * Module sans DOM : un tampon de couleurs (−1 = transparent), copié en texture par le rendu.
 */
import type { BackdropId } from '../data/schemas';
import { bayer, valueNoise1D, tileableNoise2D } from './pixelCanvas';
import { PALETTE as P, mixColor } from './palette';

export const BACKDROP_W = 320;
export const BACKDROP_H = 180;
/** Ligne d'horizon du fond (pixels d'art). */
export const HORIZON = 98;
/** Socle : largeur, épaisseur du dessus et de la tranche (pixels d'art). */
export const PLATFORM_W = 92;
export const PLATFORM_TOP = 9;
export const PLATFORM_EDGE = 5;

export interface PaintedImage {
  readonly width: number;
  readonly height: number;
  /** 0xRRGGBB, ou −1 pour un pixel transparent. */
  readonly pixels: Int32Array;
}

const SHADE = mixColor(P.ombreViolette, P.ombreProfonde, 0.3);

class Buf {
  readonly pixels: Int32Array;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.pixels = new Int32Array(width * height).fill(-1);
  }
  set(x: number, y: number, c: number): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    this.pixels[iy * this.width + ix] = c;
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return this.pixels[y * this.width + x] ?? -1;
  }
  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Dégradé vertical tramé entre des arrêts (t de 0 à 1 sur [y0, y1[). */
  gradient(y0: number, y1: number, stops: readonly (readonly [number, number])[]): void {
    const span = Math.max(1, y1 - y0 - 1);
    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / span;
      for (let x = 0; x < this.width; x++) this.set(x, y, dithered(stops, t, x, y));
    }
  }
  image(): PaintedImage {
    return { width: this.width, height: this.height, pixels: this.pixels };
  }
}

function dithered(stops: readonly (readonly [number, number])[], t: number, x: number, y: number): number {
  const first = stops[0] as readonly [number, number];
  if (t <= first[0]) return first[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i] as readonly [number, number];
    const b = stops[i + 1] as readonly [number, number];
    if (t >= a[0] && t <= b[0]) return (t - a[0]) / (b[0] - a[0] || 1) > bayer(x, y) ? b[1] : a[1];
  }
  return (stops[stops.length - 1] as readonly [number, number])[1];
}

/** Silhouette d'un plan lointain : hauteur du relief à la colonne x (plus grand = plus haut). */
function ridge(x: number, seed: number, scale: number, amp: number): number {
  return valueNoise1D(x / scale, seed) * amp + valueNoise1D(x / (scale * 0.37), seed + 7) * amp * 0.35;
}

/** Plan lointain : de `base - relief` jusqu'à `bottom`, ombré à droite des crêtes, liseré clair à gauche. */
function layer(b: Buf, base: number, bottom: number, seed: number, scale: number, amp: number, fill: number, rim: number, shade: number): void {
  for (let x = 0; x < b.width; x++) {
    const top = Math.round(base - ridge(x, seed, scale, amp));
    const slope = ridge(x + 1, seed, scale, amp) - ridge(x - 1, seed, scale, amp);
    for (let y = top; y < bottom; y++) {
      let c = fill;
      if (y === top) c = slope > 0 ? rim : shade;
      else if (slope < -0.4 && y < top + 4) c = shade;
      b.set(x, y, c);
    }
  }
}

/** Sol en larges plaques étirées (perspective), peu contrastées, plus sombre vers le bas. */
function ground(b: Buf, top: number, base: number, light: number, dark: number, seed: number): void {
  for (let y = top; y < b.height; y++) {
    const depth = (y - top) / (b.height - top);
    for (let x = 0; x < b.width; x++) {
      const n = tileableNoise2D(x / (30 + depth * 30), y / (3 + depth * 5), 64, seed);
      let c = base;
      if (n > 0.74) c = mixColor(base, light, 0.6);
      else if (n < 0.24) c = mixColor(base, dark, 0.6);
      if (depth > 0.55 && bayer(x, y) < (depth - 0.55) * 1.6) c = mixColor(c, dark, 0.7);
      if (depth < 0.08 && bayer(x, y) < 0.5) c = mixColor(c, dark, 0.35);
      b.set(x, y, c);
    }
  }
}

/** Arbre feuillu lointain (boule de feuillage sur un tronc), lumière en haut à gauche. */
function tree(b: Buf, cx: number, foot: number, r: number, leaf: number, light: number, dark: number, trunk: number): void {
  b.rect(cx - 1, foot - r, 2, r, trunk);
  const cy = foot - r - Math.round(r * 0.6);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + r * 0.5) continue;
      const lit = x + y < -r * 0.5;
      const shade = x + y > r * 0.6;
      b.set(cx + x, cy + y, lit ? light : shade ? dark : leaf);
    }
  }
}

/** Maison lointaine : mur, toit en pente, fenêtre chaude. */
function house(b: Buf, x: number, foot: number, w: number, h: number, roof: number, wall: number, wallDark: number): void {
  b.rect(x, foot - h, w, h, wall);
  b.rect(x + w - 2, foot - h, 2, h, wallDark);
  const rh = Math.round(w * 0.45);
  for (let j = 0; j < rh; j++) {
    const inset = j;
    for (let i = x - 1 + inset; i < x + w + 1 - inset; i++) b.set(i, foot - h - j, j === 0 ? mixColor(roof, SHADE, 0.4) : i < x + w / 2 ? mixColor(roof, P.lumiereChaude, 0.15) : roof);
  }
  b.rect(x + 2, foot - h + 3, 2, 3, P.lumiereChaude);
  if (w > 9) b.rect(x + w - 5, foot - h + 3, 2, 3, mixColor(P.lumiereChaude, P.ambre, 0.4));
}

/** Rayons de lumière obliques (tramés) depuis le haut à gauche. */
function rays(b: Buf, y0: number, y1: number, color: number, strength: number): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < b.width; x++) {
      const band = (x + y * 0.8) % 70;
      if (band < 14 && bayer(x, y) < strength * (1 - band / 14)) {
        const c = b.get(x, y);
        if (c >= 0) b.set(x, y, mixColor(c, color, 0.22));
      }
    }
  }
}

function sky(b: Buf, top: number, horizon: number, bottom: number): void {
  b.gradient(0, HORIZON + 4, [
    [0, top],
    [0.55, horizon],
    [1, bottom],
  ]);
}

/** Chaîne de pics : flanc éclairé à gauche, ombré à droite, neige aux sommets. */
function peaks(b: Buf, seed: number, base: number, amp: number, rock: number, snow: boolean): void {
  const height = (x: number): number => {
    const u = (x + valueNoise1D(x / 70, seed + 5) * 60) / (38 + valueNoise1D(x / 120, seed + 9) * 22);
    const i = Math.floor(u);
    const f = u - i;
    const tri = 1 - Math.abs(f * 2 - 1);
    return tri * (0.55 + valueNoise1D(i, seed) * 0.45) * amp + valueNoise1D(x / 9, seed + 3) * 4;
  };
  for (let x = 0; x < b.width; x++) {
    const top = Math.round(base - height(x));
    const lit = height(x + 1) > height(x - 1);
    for (let y = top; y < HORIZON + 6; y++) {
      let c = lit ? mixColor(rock, P.lumiereChaude, 0.18) : mixColor(rock, SHADE, 0.35);
      if (snow && y < top + 7 && y < base - amp * 0.45) c = lit ? P.ecume : mixColor(P.ecume, P.violetPale, 0.45);
      b.set(x, y, c);
    }
  }
}

/* ---------- Les neuf fonds ---------- */

function plaine(b: Buf): void {
  sky(b, mixColor(P.ciel, P.ardoise, 0.25), P.ciel, mixColor(P.ciel, P.lumiereChaude, 0.55));
  layer(b, HORIZON - 4, HORIZON + 6, 11, 70, 18, mixColor(P.ardoise, P.olive, 0.35), mixColor(P.ciel, P.oliveClair, 0.4), mixColor(P.ardoise, SHADE, 0.3));
  layer(b, HORIZON + 2, HORIZON + 10, 23, 45, 10, mixColor(P.olive, P.mousse, 0.4), P.oliveClair, P.oliveSombre);
  for (const [x, r] of [[40, 6], [58, 5], [226, 7], [250, 5], [290, 6]] as const) tree(b, x, HORIZON + 6, r, P.mousse, P.oliveClair, P.oliveSombre, P.terreSombre);
  ground(b, HORIZON + 6, mixColor(P.olive, P.vertDore, 0.38), mixColor(P.oliveClair, P.vertDore, 0.4), mixColor(P.olive, SHADE, 0.3), 5);
  // Fleurs et touffes claires dans l'herbe.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(valueNoise1D(i * 3.1, 9) * 320);
    const y = HORIZON + 10 + Math.floor(valueNoise1D(i * 5.7, 13) * 70);
    b.set(x, y, i % 5 === 0 ? P.braise : i % 3 === 0 ? P.parchemin : P.oliveClair);
  }
}

function foret(b: Buf): void {
  sky(b, mixColor(P.vertProfond, P.oliveSombre, 0.4), mixColor(P.mousse, P.lumiereChaude, 0.2), mixColor(P.oliveClair, P.lumiereChaude, 0.4));
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(valueNoise1D(i * 1.7, 3) * 330) - 5;
    const w = 4 + Math.floor(valueNoise1D(i * 2.3, 5) * 6);
    const far = i % 2 === 0;
    const c = far ? mixColor(P.vertProfond, P.ardoise, 0.35) : mixColor(P.terreSombre, P.vertProfond, 0.45);
    b.rect(x, 0, w, HORIZON + 8, c);
    b.rect(x, 0, 1, HORIZON + 8, mixColor(c, P.oliveClair, 0.3));
    b.rect(x + w - 1, 0, 1, HORIZON + 8, mixColor(c, SHADE, 0.4));
  }
  layer(b, 26, 34, 41, 30, 14, mixColor(P.vertProfond, P.mousse, 0.4), P.mousse, P.vertProfond);
  b.rect(0, 0, 320, 12, mixColor(P.vertProfond, SHADE, 0.3));
  layer(b, HORIZON + 4, HORIZON + 10, 17, 40, 8, mixColor(P.mousse, P.oliveSombre, 0.5), P.oliveClair, P.oliveSombre);
  ground(b, HORIZON + 8, mixColor(P.oliveSombre, P.mousse, 0.55), mixColor(P.mousse, P.oliveClair, 0.4), mixColor(P.oliveSombre, SHADE, 0.35), 8);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(valueNoise1D(i * 4.1, 21) * 320);
    const y = HORIZON + 12 + Math.floor(valueNoise1D(i * 2.9, 22) * 66);
    b.set(x, y, i % 4 === 0 ? P.ambre : P.terreCuite);
  }
  rays(b, 0, HORIZON + 30, P.lumiereChaude, 0.5);
}

function montagne(b: Buf): void {
  sky(b, mixColor(P.ardoise, P.ciel, 0.4), mixColor(P.ciel, P.pierre, 0.35), mixColor(P.lumiereChaude, P.pierre, 0.4));
  peaks(b, 7, 74, 52, mixColor(P.ardoise, P.violetPale, 0.35), true);
  peaks(b, 13, 90, 30, mixColor(P.grisRoux, P.ardoise, 0.5), false);
  layer(b, HORIZON - 2, HORIZON + 8, 19, 38, 18, mixColor(P.grisRoux, P.ardoise, 0.3), mixColor(P.pierre, P.lumiereChaude, 0.2), mixColor(P.grisRoux, SHADE, 0.4));
  ground(b, HORIZON + 6, mixColor(P.grisRoux, P.terreSeche, 0.4), mixColor(P.pierre, P.ocre, 0.2), mixColor(P.grisRoux, SHADE, 0.35), 12);
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(valueNoise1D(i * 3.3, 31) * 320);
    const y = HORIZON + 12 + Math.floor(valueNoise1D(i * 1.9, 32) * 60);
    b.rect(x, y, 3, 2, mixColor(P.pierre, P.ocre, 0.2));
    b.rect(x + 1, y + 2, 3, 1, mixColor(P.grisRoux, SHADE, 0.4));
  }
}

function riviere(b: Buf): void {
  plaine(b);
  // Rivière au loin, berges et écume.
  for (let y = HORIZON + 8; y < HORIZON + 26; y++) {
    for (let x = 0; x < 320; x++) {
      const edge = Math.sin(x / 31) * 2 + Math.sin(x / 13) * 1;
      if (y < HORIZON + 10 + edge || y > HORIZON + 23 + edge) continue;
      const shimmer = (x + y * 3) % 23 === 0;
      b.set(x, y, shimmer ? P.ecume : y < HORIZON + 14 + edge ? mixColor(P.ardoise, P.ciel, 0.45) : P.ardoise);
    }
    if (y === HORIZON + 24) for (let x = 0; x < 320; x++) if (x % 5 !== 0) b.set(x, y + Math.round(Math.sin(x / 31) * 2), mixColor(P.terreSombre, SHADE, 0.3));
  }
}

function cote(b: Buf): void {
  sky(b, mixColor(P.bleuGris, P.ardoise, 0.5), mixColor(P.bleuGris, P.ciel, 0.5), mixColor(P.sable, P.lumiereChaude, 0.3));
  // Mer jusqu'à la grève, crêtes d'écume.
  for (let y = HORIZON - 6; y < HORIZON + 20; y++) {
    const t = (y - (HORIZON - 6)) / 26;
    for (let x = 0; x < 320; x++) {
      let c = dithered([[0, mixColor(P.ardoise, P.bleuGris, 0.5)], [1, P.ardoiseSombre]], t, x, y);
      if ((x + Math.floor(y * 7.3)) % 37 < 3 && y % 3 === 0) c = mixColor(P.ecume, P.bleuGris, 0.3);
      b.set(x, y, c);
    }
  }
  for (let x = 0; x < 320; x++) {
    const wave = HORIZON + 20 + Math.round(Math.sin(x / 17) * 2);
    b.set(x, wave, P.ecume);
    b.set(x, wave + 1, mixColor(P.ecume, P.sable, 0.5));
  }
  ground(b, HORIZON + 22, mixColor(P.sable, P.ocreClair, 0.3), mixColor(P.sable, P.parchemin, 0.4), mixColor(P.sable, P.terreCuite, 0.35), 15);
  for (let x = 0; x < 320; x++) b.set(x, HORIZON + 22 + Math.round(Math.sin(x / 17) * 2), mixColor(P.sable, P.ardoise, 0.35));
}

function marais(b: Buf): void {
  sky(b, mixColor(P.violetPale, P.ardoiseSombre, 0.4), mixColor(P.violetPale, P.oliveClair, 0.3), mixColor(P.oliveClair, P.violetPale, 0.4));
  layer(b, HORIZON, HORIZON + 8, 29, 50, 8, mixColor(P.oliveSombre, P.violetPale, 0.35), mixColor(P.oliveClair, P.violetPale, 0.3), mixColor(P.oliveSombre, SHADE, 0.3));
  // Arbres morts.
  for (const x of [34, 98, 210, 268]) {
    const c = mixColor(P.terreSombre, P.violetPale, 0.3);
    b.rect(x, HORIZON - 34, 3, 40, c);
    b.rect(x + 2, HORIZON - 34, 1, 40, mixColor(c, SHADE, 0.4));
    for (let i = 0; i < 9; i++) b.set(x - i, HORIZON - 26 - Math.floor(i * 0.7), c);
    for (let i = 0; i < 7; i++) b.set(x + 3 + i, HORIZON - 20 - i, c);
  }
  ground(b, HORIZON + 6, mixColor(P.oliveSombre, P.violetPale, 0.22), mixColor(P.mousse, P.oliveClair, 0.3), mixColor(P.oliveSombre, SHADE, 0.4), 18);
  for (let i = 0; i < 9; i++) {
    const cx = Math.floor(valueNoise1D(i * 2.2, 41) * 300) + 10;
    const cy = HORIZON + 14 + Math.floor(valueNoise1D(i * 3.7, 42) * 50);
    for (let y = -2; y <= 2; y++) for (let x = -12; x <= 12; x++) if ((x * x) / 144 + (y * y) / 4 <= 1) b.set(cx + x, cy + y, y < 0 ? mixColor(P.violetPale, P.ardoise, 0.4) : mixColor(P.ardoiseSombre, P.violetPale, 0.3));
  }
  // Brume basse tramée.
  for (let y = HORIZON - 8; y < HORIZON + 16; y++) for (let x = 0; x < 320; x++) if (bayer(x, y) < 0.25 * (1 - Math.abs(y - HORIZON - 4) / 12)) b.set(x, y, mixColor(P.violetPale, P.ecume, 0.4));
}

function ruines(b: Buf): void {
  sky(b, mixColor(P.ardoise, P.violetPale, 0.3), mixColor(P.ciel, P.lumiereChaude, 0.3), mixColor(P.lumiereChaude, P.ocreClair, 0.4));
  layer(b, HORIZON + 2, HORIZON + 8, 37, 60, 10, mixColor(P.olive, P.ardoise, 0.35), P.oliveClair, P.oliveSombre);
  const stone = mixColor(P.pierre, P.ocre, 0.14);
  for (const [x, h] of [[30, 46], [60, 28], [118, 54], [196, 22], [244, 50], [286, 34]] as const) {
    b.rect(x, HORIZON + 4 - h, 9, h, stone);
    b.rect(x, HORIZON + 4 - h, 2, h, mixColor(stone, P.parchemin, 0.4));
    b.rect(x + 7, HORIZON + 4 - h, 2, h, mixColor(stone, SHADE, 0.4));
    for (let i = 0; i < 9; i++) b.set(x + i, HORIZON + 4 - h - ((i * 3) % 4), stone);
    for (let j = 6; j < h; j += 8) b.rect(x + 2, HORIZON + 4 - h + j, 5, 1, mixColor(stone, SHADE, 0.25));
  }
  b.rect(110, HORIZON - 46, 26, 4, stone);
  ground(b, HORIZON + 6, mixColor(P.terreSeche, P.olive, 0.3), mixColor(P.pierre, P.ocre, 0.2), mixColor(P.terreSeche, SHADE, 0.35), 25);
  for (let y = HORIZON + 14; y < 180; y += 7) for (let x = (y % 14 === 0 ? 0 : 9); x < 320; x += 18) {
    b.rect(x, y, 15, 1, mixColor(P.terreSeche, SHADE, 0.3));
  }
}

function village(b: Buf): void {
  sky(b, mixColor(P.ciel, P.ardoise, 0.25), P.ciel, mixColor(P.ciel, P.lumiereChaude, 0.6));
  layer(b, HORIZON - 2, HORIZON + 6, 51, 70, 10, mixColor(P.olive, P.ardoise, 0.35), P.oliveClair, P.oliveSombre);
  const wall = mixColor(P.parchemin, P.sable, 0.35);
  const wallDark = mixColor(P.terreSeche, SHADE, 0.3);
  for (const [x, w, h, roof] of [[8, 22, 20, P.terreCuite], [36, 16, 15, P.jauneBle], [70, 26, 24, P.brique], [204, 20, 18, P.terreCuite], [232, 28, 26, P.ardoise], [270, 18, 16, P.jauneBle], [296, 22, 20, P.brique]] as const) {
    house(b, x, HORIZON + 6, w, h, roof, wall, wallDark);
  }
  tree(b, 128, HORIZON + 6, 7, P.mousse, P.oliveClair, P.oliveSombre, P.terreSombre);
  tree(b, 180, HORIZON + 6, 6, P.mousse, P.oliveClair, P.oliveSombre, P.terreSombre);
  ground(b, HORIZON + 6, mixColor(P.terreSeche, P.ocre, 0.18), mixColor(P.ocreClair, P.terreSeche, 0.4), mixColor(P.terreSombre, SHADE, 0.2), 33);
  for (let y = HORIZON + 12; y < 180; y += 6) for (let x = (y % 12 === 0 ? 2 : 8); x < 320; x += 12) b.rect(x, y, 9, 1, mixColor(P.terreSombre, SHADE, 0.15));
}

function citadelle(b: Buf): void {
  sky(b, P.nuitBleue, mixColor(P.bleuNuit, P.violetBrume, 0.4), mixColor(P.violetBrume, P.ardoise, 0.4));
  const stone = mixColor(P.ardoiseSombre, P.violetBrume, 0.25);
  for (const [x, w, h] of [[20, 22, 64], [62, 14, 40], [140, 30, 80], [228, 18, 50], [270, 26, 70]] as const) {
    b.rect(x, HORIZON + 4 - h, w, h, stone);
    b.rect(x, HORIZON + 4 - h, 2, h, mixColor(stone, P.ardoise, 0.4));
    b.rect(x + w - 3, HORIZON + 4 - h, 3, h, mixColor(stone, SHADE, 0.4));
    for (let i = 0; i < w; i += 4) b.rect(x + i, HORIZON + 4 - h - 3, 2, 3, stone);
    for (let j = 10; j < h - 6; j += 14) b.rect(x + Math.floor(w / 2) - 1, HORIZON + 4 - h + j, 2, 4, P.cyanEclat);
  }
  // Eau noire au pied des tours, reflets cyan.
  for (let y = HORIZON + 4; y < HORIZON + 16; y++) for (let x = 0; x < 320; x++) b.set(x, y, (x + y * 5) % 29 === 0 ? P.cyanEclat : mixColor(P.nuitBleue, P.ardoiseSombre, 0.4));
  ground(b, HORIZON + 14, mixColor(P.ardoiseSombre, P.violetBrume, 0.2), mixColor(P.ardoise, P.cyanEclat, 0.15), mixColor(P.ardoiseSombre, SHADE, 0.4), 44);
  for (let y = HORIZON + 4; y < 180; y++) for (let x = 0; x < 320; x++) if (bayer(x, y) < 0.12 && (x * 7 + y * 3) % 11 < 4) b.set(x, y, mixColor(b.get(x, y) < 0 ? P.violetBrume : b.get(x, y), P.violetBrume, 0.5));
}

const PAINTERS: Readonly<Record<BackdropId, (b: Buf) => void>> = { plaine, foret, montagne, riviere, cote, marais, ruines, village, citadelle };

/** Fond de l'écran rapproché (320×180, entièrement peint). */
export function paintBackdrop(id: BackdropId): PaintedImage {
  const b = new Buf(BACKDROP_W, BACKDROP_H);
  PAINTERS[id](b);
  // Sécurité : aucun pixel laissé vide.
  for (let i = 0; i < b.pixels.length; i++) if ((b.pixels[i] ?? -1) < 0) b.pixels[i] = SHADE;
  return b.image();
}

/** Teintes du socle selon le fond : dessus, dessus éclairé, ombre, tranche. */
const PLATFORM_COLORS: Readonly<Record<BackdropId, readonly [number, number, number, number]>> = {
  plaine: [mixColor(P.olive, P.vertDore, 0.4), P.oliveClair, mixColor(P.olive, SHADE, 0.35), mixColor(P.terreSombre, SHADE, 0.3)],
  foret: [mixColor(P.mousse, P.oliveSombre, 0.4), mixColor(P.mousse, P.oliveClair, 0.5), mixColor(P.oliveSombre, SHADE, 0.4), mixColor(P.terreSombre, SHADE, 0.4)],
  montagne: [mixColor(P.grisRoux, P.pierre, 0.3), mixColor(P.pierre, P.ocre, 0.2), mixColor(P.grisRoux, SHADE, 0.4), mixColor(P.grisRoux, SHADE, 0.6)],
  riviere: [mixColor(P.olive, P.vertDore, 0.4), P.oliveClair, mixColor(P.olive, SHADE, 0.35), mixColor(P.terreSombre, SHADE, 0.3)],
  cote: [mixColor(P.sable, P.ocreClair, 0.3), mixColor(P.sable, P.parchemin, 0.4), mixColor(P.sable, P.terreCuite, 0.4), mixColor(P.terreCuite, SHADE, 0.45)],
  marais: [mixColor(P.oliveSombre, P.mousse, 0.4), mixColor(P.mousse, P.oliveClair, 0.3), mixColor(P.oliveSombre, SHADE, 0.4), mixColor(P.oliveSombre, SHADE, 0.6)],
  ruines: [mixColor(P.pierre, P.ocre, 0.14), mixColor(P.pierre, P.parchemin, 0.4), mixColor(P.pierre, SHADE, 0.35), mixColor(P.grisRoux, SHADE, 0.45)],
  village: [mixColor(P.terreSeche, P.ocre, 0.2), P.ocreClair, mixColor(P.terreSeche, SHADE, 0.35), mixColor(P.terreSombre, SHADE, 0.35)],
  citadelle: [mixColor(P.ardoise, P.violetBrume, 0.25), mixColor(P.ardoise, P.cyanEclat, 0.2), mixColor(P.ardoiseSombre, SHADE, 0.35), mixColor(P.ardoiseSombre, SHADE, 0.6)],
};

/** Socle sous un combattant : dalle ovale (dessus éclairé à gauche), tranche dans l'ombre, contour coloré et ombre portée. */
export function paintPlatform(id: BackdropId): PaintedImage {
  const W = PLATFORM_W;
  const H = PLATFORM_TOP + PLATFORM_EDGE + 3;
  const b = new Buf(W, H);
  const [top0, lit, dark, edge] = PLATFORM_COLORS[id];
  const top = mixColor(top0, P.lumiereChaude, 0.12);
  const outline = mixColor(edge, SHADE, 0.7);
  const rx = W / 2 - 1.5;
  const ry = PLATFORM_TOP / 2;
  const cx = W / 2 - 0.5;
  const inTop = (x: number, y: number): boolean => {
    const dx = (x - cx) / rx;
    const dy = (y - ry + 0.5) / ry;
    return dx * dx + dy * dy <= 1;
  };
  const inSlab = (x: number, y: number): boolean => {
    if (inTop(x, y)) return true;
    const dx = (x - cx) / rx;
    const dy = (y - ry - PLATFORM_EDGE + 0.5) / ry;
    return y >= ry && dx * dx + dy * dy <= 1;
  };
  // Ombre portée (vers le bas à droite), tramée.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inSlab(x, y) && inSlab(x - 2, y - 3) && bayer(x, y) < 0.5) b.set(x, y, mixColor(SHADE, edge, 0.3));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inSlab(x, y)) continue;
      const border = !inSlab(x - 1, y) || !inSlab(x + 1, y) || !inSlab(x, y - 1) || !inSlab(x, y + 1);
      if (inTop(x, y)) {
        const dx = (x - cx) / rx;
        const dy = (y - ry + 0.5) / ry;
        const n = tileableNoise2D(x / 9, y / 3, 32, 3);
        let c = n > 0.66 ? mixColor(top, lit, 0.6) : n < 0.28 ? mixColor(top, dark, 0.5) : top;
        if (dx < -0.5 && dy < 0.3) c = mixColor(c, lit, 0.5);
        if (dx * dx + dy * dy > 0.8) c = dy < 0 ? lit : dark;
        b.set(x, y, border && dy < 0 ? mixColor(lit, P.lumiereChaude, 0.3) : c);
      } else {
        const t = (y - ry) / (PLATFORM_EDGE + ry);
        b.set(x, y, border ? outline : bayer(x, y) < t ? mixColor(edge, SHADE, 0.4) : edge);
      }
    }
  }
  return b.image();
}
