/**
 * Champ de bataille peint par code (jalon M4) : une image par carte de combat,
 * dans le style du monde ouvert (décisions n°43 à n°46) — palette « fin
 * d'après-midi », lumière en haut à gauche, ombres violet-bleu, contours
 * colorés, sols en larges plaques de 3 tons aux bords arrondis.
 *
 * - Sol : chaque pixel prend le sol le plus présent autour de lui (cases
 *   voisines pondérées par la distance, plus un bruit doux) : rivières, côtes
 *   et marais ont des bords courbes, sans marches d'une case.
 * - Routes : tracées comme des chemins entre les centres des cases voisines.
 * - Décors par case (forêt, montagne, ruines, village, pont, roseaux) peints
 *   du nord au sud ; ils peuvent déborder de quelques pixels sur la case du
 *   dessus (`BF_TOP` pixels de marge au-dessus de la première rangée).
 * - Eau animée : `BF_WATER_FRAMES` images.
 *
 * Module sans DOM : il remplit un tampon de couleurs (−1 = transparent) que le
 * rendu copie dans une texture. Les cases restent lisibles : le contour d'un
 * sol ne s'écarte de sa case que de quelques pixels.
 */
import { bayer, tileableNoise2D } from './pixelCanvas';
import { PALETTE as P, mixColor } from './palette';
import { WATER_COLORS } from './waterTile';

export const BF_TILE = 16;
/** Marge au-dessus de la première rangée, pour les cimes et les toits qui débordent. */
export const BF_TOP = 10;
export const BF_WATER_FRAMES = 4;

interface Ramp {
  readonly deep: number;
  readonly dark: number;
  readonly base: number;
  readonly light: number;
  readonly hi: number;
}

const SHADE = mixColor(P.ombreViolette, P.ombreProfonde, 0.3);
const SUN = P.lumiereChaude;

function ramp(base: number, shadow: number = SHADE, light: number = SUN): Ramp {
  return { deep: mixColor(base, shadow, 0.78), dark: mixColor(base, shadow, 0.42), base, light: mixColor(base, light, 0.3), hi: mixColor(base, light, 0.62) };
}

const R = {
  grass: ramp(mixColor(P.olive, P.vertDore, 0.38)),
  forestFloor: ramp(mixColor(P.oliveSombre, P.mousse, 0.55), SHADE, P.oliveClair),
  foliage: ramp(mixColor(P.mousse, P.vertDore, 0.3)),
  foliageDeep: ramp(mixColor(P.vertProfond, P.mousse, 0.4)),
  dirt: ramp(mixColor(P.terreSeche, P.ocre, 0.18), mixColor(P.terreSombre, SHADE, 0.35), P.ocreClair),
  sand: ramp(mixColor(P.sable, P.ocreClair, 0.3), mixColor(P.terreCuite, SHADE, 0.35), P.parchemin),
  rock: ramp(mixColor(P.grisRoux, P.ardoise, 0.3), SHADE, P.pierre),
  stone: ramp(mixColor(P.pierre, P.ocre, 0.14), SHADE, P.parchemin),
  snow: ramp(P.ecume, mixColor(P.ardoise, P.violetPale, 0.4), 0xffffff),
  mud: ramp(mixColor(P.oliveSombre, P.violetPale, 0.22), SHADE, P.oliveClair),
  wood: ramp(mixColor(P.ambre, P.terreSombre, 0.55), mixColor(P.brique, SHADE, 0.55), P.ocreClair),
  trunk: ramp(mixColor(P.terreSombre, P.grisRoux, 0.3), SHADE, P.terreSeche),
  thatch: ramp(mixColor(P.jauneBle, P.ocre, 0.35), mixColor(P.terreCuite, SHADE, 0.3), P.parchemin),
  wall: ramp(mixColor(P.parchemin, P.sable, 0.35), mixColor(P.terreSeche, SHADE, 0.35), 0xfff8ee),
} as const;

const inkOf = (r: Ramp): number => mixColor(r.deep, SHADE, 0.45);

type Ground = 'grass' | 'forest' | 'dirt' | 'sand' | 'mud' | 'rock' | 'water' | 'deep' | 'ford';

/** Sol peint sous chaque terrain (les décors viennent ensuite). */
const GROUND_OF: Readonly<Record<string, Ground>> = {
  plaine: 'grass',
  route: 'grass',
  foret: 'forest',
  montagne: 'rock',
  riviere: 'water',
  gue: 'ford',
  pont: 'water',
  ruines: 'grass',
  village: 'grass',
  plage: 'sand',
  marais: 'mud',
  eau_profonde: 'deep',
  batiment: 'dirt',
};

const WATERY: ReadonlySet<Ground> = new Set<Ground>(['water', 'deep', 'ford']);
/** Les cases qui prolongent une route (on trace le chemin jusqu'à elles). */
const ROAD_LINKS: ReadonlySet<string> = new Set(['route', 'pont', 'village']);

/** Teintes des bâtiments tirés du monde (décision n°57). */
const ROOF = ramp(mixColor(P.terreCuite, P.brique, 0.35), mixColor(P.brique, SHADE, 0.4), P.ocreClair);
const WALL_STONE = ramp(mixColor(P.pierre, P.grisRoux, 0.35));

export interface Battlefield {
  readonly width: number;
  readonly height: number;
  /** Couleur 0xRRGGBB de chaque pixel, −1 = transparent. */
  readonly pixels: Int32Array;
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

class Painter {
  readonly px: Int32Array;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.px = new Int32Array(width * height).fill(-1);
  }

  /** (x, y) en pixels de carte ; la marge du haut est gérée ici. */
  set(x: number, y: number, color: number): void {
    const yy = y + BF_TOP;
    if (x < 0 || yy < 0 || x >= this.width || yy >= this.height) return;
    this.px[yy * this.width + x] = color;
  }

  get(x: number, y: number): number {
    const yy = y + BF_TOP;
    if (x < 0 || yy < 0 || x >= this.width || yy >= this.height) return -1;
    return this.px[yy * this.width + x] ?? -1;
  }

  /** Mélange vers une couleur (ombre, lumière) ; sans effet sur un pixel transparent. */
  blend(x: number, y: number, color: number, amount: number): void {
    const current = this.get(x, y);
    if (current < 0) return;
    this.set(x, y, mixColor(current, color, amount));
  }
}

/** Sol le plus présent au pixel (px, py) : cases voisines pondérées par la distance, plus un bruit doux. */
function groundAt(grounds: readonly Ground[], w: number, h: number, px: number, py: number, seed: number): Ground {
  const cx = Math.floor(px / BF_TILE);
  const cy = Math.floor(py / BF_TILE);
  const scores = new Map<Ground, number>();
  const radius = 6;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = Math.min(w - 1, Math.max(0, cx + dx));
      const ny = Math.min(h - 1, Math.max(0, cy + dy));
      const g = grounds[ny * w + nx] as Ground;
      const rx = Math.max(nx * BF_TILE - (px + 0.5), 0, px + 0.5 - (nx + 1) * BF_TILE);
      const ry = Math.max(ny * BF_TILE - (py + 0.5), 0, py + 0.5 - (ny + 1) * BF_TILE);
      const d = Math.hypot(rx, ry);
      const weight = Math.max(0, 1 - d / radius);
      if (weight > 0) scores.set(g, (scores.get(g) ?? 0) + weight);
    }
  }
  let best: Ground = grounds[cy * w + cx] as Ground;
  let bestScore = -Infinity;
  for (const [g, score] of scores) {
    const wobble = WATERY.has(g) ? (tileableNoise2D(px / 9, py / 9, 64, seed + 31) - 0.5) * 1.1 : 0;
    const jitter = (tileableNoise2D(px / 5, py / 5, 64, seed + g.length * 7) - 0.5) * 0.7 + wobble;
    const s = score + jitter + (g === best ? 0.25 : 0);
    if (s > bestScore) {
      bestScore = s;
      best = g;
    }
  }
  return best;
}

/** Ton (sombre, moyen, clair) en larges plaques. */
function plaque(px: number, py: number, seed: number, r: Ramp): number {
  const n = tileableNoise2D(px / 11, py / 11, 64, seed);
  return n < 0.28 ? mixColor(r.base, r.dark, 0.45) : n > 0.7 ? r.light : r.base;
}

const WATER_PATTERNS: number[][] = [];
function waterPattern(frame: number): number[] {
  const cached = WATER_PATTERNS[frame];
  if (cached) return cached;
  const tile: number[] = new Array(BF_TILE * BF_TILE).fill(WATER_COLORS.base);
  // Mêmes vagues que l'eau du monde (render/waterTile.ts), recopiées ici sans canevas.
  const crests: readonly (readonly [number, number, number])[] = [
    [1, 2, 4],
    [9, 5, 5],
    [3, 9, 3],
    [11, 12, 4],
    [6, 14, 3],
  ];
  const shift = frame % BF_WATER_FRAMES;
  for (const [cx, cy, len] of crests) {
    const y = (cy + (shift >> 1)) % BF_TILE;
    for (let i = 0; i < len; i++) {
      const x = (cx + i + shift) % BF_TILE;
      tile[((y + 1) % BF_TILE) * BF_TILE + x] = WATER_COLORS.trough;
    }
  }
  for (const [cx, cy, len] of crests) {
    const y = (cy + (shift >> 1)) % BF_TILE;
    for (let i = 0; i < len; i++) {
      const x = (cx + i + shift) % BF_TILE;
      tile[y * BF_TILE + x] = i === Math.floor(len / 2) && shift % 2 === 0 ? WATER_COLORS.glint : WATER_COLORS.crest;
    }
  }
  WATER_PATTERNS[frame] = tile;
  return tile;
}

function groundColor(g: Ground, px: number, py: number, frame: number, seed: number): number {
  switch (g) {
    case 'grass':
      return plaque(px, py, seed, R.grass);
    case 'forest':
      return plaque(px, py, seed + 3, R.forestFloor);
    case 'dirt':
      return plaque(px, py, seed + 5, R.dirt);
    case 'sand':
      return plaque(px, py, seed + 7, R.sand);
    case 'mud':
      return plaque(px, py, seed + 11, R.mud);
    case 'rock':
      return plaque(px, py, seed + 13, R.rock);
    case 'water':
    case 'deep':
    case 'ford': {
      const c = waterPattern(frame)[(((py % BF_TILE) + BF_TILE) % BF_TILE) * BF_TILE + (((px % BF_TILE) + BF_TILE) % BF_TILE)] as number;
      if (g === 'deep') return mixColor(c, P.ombreProfonde, 0.35);
      if (g === 'ford') return mixColor(c, R.sand.base, 0.32);
      return c;
    }
  }
}

/** Distance d'un point au segment [a, b]. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/** Masse de feuillage éclairée en haut à gauche (pixel dans le disque → teinte). */
function sphereShade(dx: number, dy: number, r: number, x: number, y: number, ramp_: Ramp): number {
  const v = (-dx * 0.62 - dy * 0.78) / r;
  const edge = Math.hypot(dx, dy) / r;
  const t = v + bayer(x, y) * 0.35 - 0.17;
  if (edge > 0.82 && v < 0) return ramp_.deep;
  if (t > 0.45) return ramp_.hi;
  if (t > 0.12) return ramp_.light;
  if (t < -0.42) return ramp_.dark;
  return ramp_.base;
}

/** Bosquet de forêt : deux ou trois petits arbres par case, comme une forêt de carte GBA. */
function paintTree(p: Painter, ox: number, oy: number, rnd: number): void {
  const layouts: readonly (readonly (readonly [number, number, number])[])[] = [
    [[5, 5, 4.2], [11.5, 9, 4.2]],
    [[11, 5, 4.2], [4.5, 9.5, 4.2]],
    [[8, 3.5, 4], [4, 10, 3.6], [12, 10.5, 3.6]],
    [[4.5, 4.5, 3.6], [11.5, 5, 3.8], [8, 10.5, 4]],
  ];
  const trees = layouts[Math.floor(rnd * layouts.length) % layouts.length] as readonly (readonly [number, number, number])[];
  // Du fond vers l'avant : les arbres les plus bas passent devant.
  for (const [cx, cy, r] of [...trees].sort((a, b) => a[1] - b[1])) {
    const foot = Math.round(cy + r * 0.9);
    // Ombre portée, tronc, feuillage en deux masses.
    for (let y = -1; y <= 1; y++) for (let x = -3; x <= 3; x++) p.blend(ox + Math.round(cx) + 1 + x, oy + foot + 1 + y, SHADE, 0.3);
    for (let y = foot - 2; y <= foot + 1; y++) {
      p.set(ox + Math.round(cx) - 1, oy + y, R.trunk.light);
      p.set(ox + Math.round(cx), oy + y, R.trunk.dark);
    }
    const foliage = (rnd * 7 + cx) % 1 > 0.7 ? R.foliageDeep : R.foliage;
    paintMasses(p, ox, oy, [[cx, cy - 0.5, r], [cx - r * 0.35, cy - r * 0.55, r * 0.62]], foliage);
  }
}

/** Masses éclairées (arbres, rochers) : union de disques, contour coloré. */
function paintMasses(p: Painter, ox: number, oy: number, masses: readonly (readonly [number, number, number])[], r: Ramp): (x: number, y: number) => number {
  const inside = (x: number, y: number): number => masses.findIndex(([cx, cy, rad]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad);
  for (let y = -8; y <= 16; y++) {
    for (let x = -2; x <= 17; x++) {
      const k = inside(x, y);
      if (k >= 0) {
        const [cx, cy, rad] = masses[k] as readonly [number, number, number];
        p.set(ox + x, oy + y, sphereShade(x + 0.5 - cx, y + 0.5 - cy, rad, x, y, r));
      } else if (inside(x, y + 1) >= 0 || inside(x - 1, y) >= 0 || inside(x + 1, y) >= 0 || inside(x, y - 1) >= 0) {
        p.set(ox + x, oy + y, inkOf(r));
      }
    }
  }
  return inside;
}

function paintMountain(p: Painter, ox: number, oy: number, rnd: number): void {
  // Ombre portée.
  for (let y = -3; y <= 3; y++) for (let x = -8; x <= 8; x++) if ((x * x) / 64 + (y * y) / 9 <= 1) p.blend(ox + 10 + x, oy + 14 + y, SHADE, 0.3);
  const flip = rnd > 0.5 ? -1 : 1;
  const masses: readonly (readonly [number, number, number])[] = [
    [8 + flip * 3.5, 9.5, 4.6],
    [8 - flip * 3, 10, 4.2],
    [8 + flip * 0.5, 3.5, 5.6],
    [8 - flip * 1.5, -1, 3.4],
  ];
  const inside = paintMasses(p, ox, oy, masses, R.rock);
  // Arêtes et fissures : une crête claire, deux failles sombres.
  for (let y = -2; y <= 6; y++) {
    const x = Math.round(8 + flip * 0.5 - (y - 2) * 0.35);
    if (inside(x, y) >= 0) p.set(ox + x, oy + y, R.rock.hi);
  }
  for (const [x0, y0, len] of [[10, 5, 4], [5, 10, 3]] as const) {
    for (let i = 0; i < len; i++) if (inside(x0 + (i >> 1), y0 + i) >= 0) p.set(ox + x0 + (i >> 1), oy + y0 + i, R.rock.deep);
  }
  // Neige accrochée au sommet.
  for (let y = -5; y <= -1; y++) for (let x = 4; x <= 12; x++) if (inside(x, y) >= 0 && inside(x, y - 1) < 0) p.set(ox + x, oy + y, x < 8 ? R.snow.light : R.snow.base);
  // Touffes au pied.
  for (const [x, y] of [[1, 14], [14, 15]] as const) {
    p.set(ox + x, oy + y, R.grass.light);
    p.set(ox + x + 1, oy + y, R.grass.dark);
  }
}

function paintRuins(p: Painter, ox: number, oy: number, rnd: number): void {
  // Dalles au sol.
  for (const [x, y, w] of [[1, 10, 4], [9, 12, 5], [5, 13, 3]] as const) {
    for (let i = 0; i < w; i++) {
      p.set(ox + x + i, oy + y, R.stone.light);
      p.set(ox + x + i, oy + y + 1, R.stone.base);
      p.set(ox + x + i, oy + y + 2, R.stone.dark);
    }
  }
  // Colonne brisée, éclairée à gauche.
  const cx = rnd > 0.5 ? 9 : 4;
  const height = 8 + Math.floor(rnd * 4);
  for (let y = 0; y < height; y++) {
    const yy = 13 - y;
    for (let x = 0; x < 4; x++) {
      const broken = y === height - 1 && (x + Math.floor(rnd * 7)) % 3 === 0;
      if (broken) continue;
      const c = x === 0 ? R.stone.hi : x === 1 ? R.stone.light : x === 2 ? R.stone.base : R.stone.dark;
      p.set(ox + cx + x, oy + yy, (y + x) % 5 === 0 ? mixColor(c, P.mousse, 0.45) : c);
    }
    p.set(ox + cx - 1, oy + yy, inkOf(R.stone));
    p.set(ox + cx + 4, oy + yy, inkOf(R.stone));
  }
  for (let x = -1; x <= 4; x++) p.set(ox + cx + x, oy + 14, R.stone.deep);
  // Tambour tombé.
  const fx = cx === 9 ? 2 : 10;
  for (let x = 0; x < 4; x++) {
    p.set(ox + fx + x, oy + 6, R.stone.light);
    p.set(ox + fx + x, oy + 7, R.stone.base);
    p.set(ox + fx + x, oy + 8, R.stone.dark);
  }
}

function paintCottage(p: Painter, ox: number, oy: number): void {
  for (let y = 12; y <= 15; y++) for (let x = 5; x <= 15; x++) p.blend(ox + x, oy + y, SHADE, 0.3);
  // Murs à colombages.
  for (let y = 8; y <= 14; y++) {
    for (let x = 3; x <= 12; x++) {
      let c = x <= 4 ? R.wall.light : x >= 11 ? R.wall.dark : R.wall.base;
      if (x === 3 || x === 12 || y === 8 || (x === 7 && y < 11)) c = R.wood.dark;
      p.set(ox + x, oy + y, c);
    }
  }
  // Porte et fenêtre chaude.
  for (let y = 11; y <= 14; y++) for (let x = 8; x <= 9; x++) p.set(ox + x, oy + y, y === 11 ? R.wood.deep : R.wood.dark);
  p.set(ox + 5, oy + 10, P.lumiereDoree);
  p.set(ox + 5, oy + 11, P.lumiereChaude);
  p.set(ox + 4, oy + 10, P.lumiereChaude);
  p.set(ox + 4, oy + 11, P.ambre);
  // Toit de chaume en rangées, débordant.
  for (let y = 0; y <= 8; y++) {
    const half = 3 + y * 0.8;
    for (let x = Math.ceil(7.5 - half); x <= Math.floor(7.5 + half); x++) {
      const row = y % 3;
      const lit = x < 7.5 - half / 3;
      let c = lit ? R.thatch.light : x > 7.5 + half / 2 ? R.thatch.dark : R.thatch.base;
      if (row === 2) c = mixColor(c, R.thatch.deep, 0.5);
      if (y === 8) c = R.thatch.deep;
      p.set(ox + x, oy + y, c);
    }
    p.set(ox + Math.ceil(7.5 - half) - 1, oy + y, inkOf(R.thatch));
    p.set(ox + Math.floor(7.5 + half) + 1, oy + y, inkOf(R.thatch));
  }
  for (let x = 4; x <= 11; x++) p.set(ox + x, oy - 1, inkOf(R.thatch));
  // Cheminée.
  for (let y = -2; y <= 1; y++) {
    p.set(ox + 10, oy + y, mixColor(P.brique, P.terreCuite, 0.4));
    p.set(ox + 11, oy + y, P.brique);
  }
}

function paintBridge(p: Painter, ox: number, oy: number, horizontal: boolean): void {
  for (let a = 0; a < BF_TILE; a++) {
    for (let b = 3; b <= 12; b++) {
      const plankEdge = a % 4 === 3;
      const c = b === 3 ? R.wood.hi : b === 12 ? R.wood.deep : plankEdge ? R.wood.dark : b < 6 ? R.wood.light : R.wood.base;
      if (horizontal) p.set(ox + a, oy + b, c);
      else p.set(ox + b, oy + a, c);
    }
    // Garde-corps.
    for (const b of [2, 13]) {
      const c = b === 2 ? R.trunk.light : R.trunk.dark;
      if (horizontal) p.set(ox + a, oy + b, c);
      else p.set(ox + b, oy + a, c);
    }
  }
  // Ombre du tablier sur l'eau.
  for (let a = 0; a < BF_TILE; a++) {
    if (horizontal) p.blend(ox + a, oy + 14, SHADE, 0.45);
    else p.blend(ox + 14, oy + a, SHADE, 0.45);
  }
}

function paintReeds(p: Painter, ox: number, oy: number, seed: number): void {
  // Flaques.
  for (let y = -2; y <= 2; y++) for (let x = -4; x <= 4; x++) if ((x * x) / 16 + (y * y) / 4 <= 1) p.set(ox + 6 + x, oy + 10 + y, y < 0 ? mixColor(WATER_COLORS.base, P.oliveSombre, 0.35) : mixColor(WATER_COLORS.trough, P.oliveSombre, 0.3));
  p.set(ox + 4, oy + 9, WATER_COLORS.crest);
  // Roseaux.
  for (let k = 0; k < 4; k++) {
    const x = 1 + Math.floor(hash(k, ox, seed) * 13);
    const h = 4 + Math.floor(hash(oy, k, seed) * 4);
    for (let y = 0; y < h; y++) p.set(ox + x, oy + 14 - y, y > h - 2 ? P.terreSombre : y % 2 ? R.foliage.light : R.foliage.base);
  }
}

function paintGrassDetail(p: Painter, ox: number, oy: number, cell: number, seed: number): void {
  for (let k = 0; k < 3; k++) {
    const h = hash(cell, k, seed);
    if (h > 0.75) continue;
    const x = 2 + Math.floor(hash(k, cell, seed + 1) * 11);
    const y = 4 + Math.floor(hash(cell + 7, k, seed + 2) * 10);
    p.set(ox + x, oy + y, R.grass.dark);
    p.set(ox + x + 2, oy + y, R.grass.dark);
    p.set(ox + x + 1, oy + y - 1, R.grass.light);
    p.set(ox + x + 1, oy + y, R.grass.base);
  }
  const f = hash(cell, 99, seed);
  if (f > 0.7) {
    const x = 3 + Math.floor(f * 97) % 10;
    const y = 3 + Math.floor(f * 53) % 10;
    const petal = f > 0.85 ? P.parchemin : f > 0.78 ? mixColor(P.rougeCendre, P.braise, 0.4) : P.jauneBle;
    p.set(ox + x, oy + y, petal);
    p.set(ox + x + 1, oy + y + 1, petal);
    p.set(ox + x, oy + y + 1, R.grass.light);
  }
}

/** Maison tirée du monde : toit de tuiles sur les rangées hautes, mur et porte sur la rangée du bas. */
function paintHouse(p: Painter, x0: number, y0: number, x1: number, y1: number, doors: readonly number[]): void {
  const left = x0 * BF_TILE;
  const right = (x1 + 1) * BF_TILE - 1;
  const top = y0 * BF_TILE - 4;
  const wallTop = y1 * BF_TILE + 3;
  const bottom = (y1 + 1) * BF_TILE - 2;
  // Ombre portée vers le bas à droite.
  for (let y = bottom - 2; y <= bottom + 2; y++) for (let x = left + 4; x <= right + 3; x++) p.blend(x, y, SHADE, 0.3);
  // Mur crépi à colombages, éclairé à gauche.
  for (let y = wallTop; y <= bottom; y++) {
    for (let x = left + 1; x <= right - 1; x++) {
      let c = x < left + 4 ? R.wall.light : x > right - 4 ? R.wall.dark : R.wall.base;
      if ((x - left) % 8 === 0 || y === wallTop || y === bottom) c = R.wood.dark;
      p.set(x, y, c);
    }
  }
  // Fenêtres chaudes entre les portes.
  for (let cx = x0; cx <= x1; cx++) {
    const mx = cx * BF_TILE + 8;
    if (doors.includes(cx)) {
      for (let y = wallTop + 3; y <= bottom; y++) for (let x = mx - 3; x <= mx + 2; x++) p.set(x, y, y === wallTop + 3 ? R.wood.deep : x === mx - 3 ? R.wood.base : R.wood.dark);
      p.set(mx + 1, wallTop + 8, P.jauneBle); // poignée
    } else {
      for (let y = wallTop + 4; y <= wallTop + 7; y++) for (let x = mx - 2; x <= mx + 1; x++) p.set(x, y, y === wallTop + 4 ? P.lumiereDoree : P.lumiereChaude);
      p.set(mx - 3, wallTop + 4, R.wood.dark);
    }
  }
  // Toit à deux pans : rangées de tuiles, faîtage, bord sombre.
  const ridge = Math.round((top + wallTop) / 2) - 2;
  for (let y = top; y < wallTop + 1; y++) {
    for (let x = left - 1; x <= right + 1; x++) {
      const near = y <= ridge;
      let c = near ? ROOF.light : ROOF.base;
      if (x <= left + 2) c = mixColor(c, ROOF.hi, 0.35);
      if (x >= right - 2) c = ROOF.dark;
      if ((y - top) % 3 === 2) c = mixColor(c, ROOF.deep, 0.45);
      if ((x + (Math.floor((y - top) / 3) % 2) * 2) % 4 === 0 && (y - top) % 3 !== 2) c = mixColor(c, ROOF.dark, 0.25);
      if (y === ridge) c = ROOF.hi;
      if (y === wallTop) c = ROOF.deep;
      p.set(x, y, c);
    }
  }
  for (let x = left - 1; x <= right + 1; x++) p.set(x, top - 1, inkOf(ROOF));
  for (let y = top; y <= wallTop; y++) {
    p.set(left - 2, y, inkOf(ROOF));
    p.set(right + 2, y, inkOf(ROOF));
  }
  // Cheminée.
  const chim = right - 6;
  for (let y = top - 4; y < top + 2; y++) {
    p.set(chim, y, mixColor(P.brique, P.terreCuite, 0.4));
    p.set(chim + 1, y, P.brique);
    p.set(chim + 2, y, mixColor(P.brique, SHADE, 0.3));
  }
}

/** Mur, palissade ou rempart : une case de pierre reliée à ses voisines. */
function paintWall(p: Painter, ox: number, oy: number, up: boolean, down: boolean, left: boolean, right: boolean): void {
  const x0 = left ? 0 : 2;
  const x1 = right ? 15 : 13;
  const yTop = up ? 0 : 2;
  for (let y = 12; y <= 16; y++) for (let x = x0 + 3; x <= x1 + 3; x++) p.blend(ox + x, oy + y, SHADE, 0.25);
  for (let y = yTop; y <= 13; y++) {
    for (let x = x0; x <= x1; x++) {
      const top = y < 6 && !down ? true : y < 6;
      const course = Math.floor(y / 3);
      const joint = (y % 3 === 2) || ((x + course * 3) % 6 === 0);
      let c = top ? WALL_STONE.light : WALL_STONE.base;
      if (x === x0 && !left) c = WALL_STONE.hi;
      if (x === x1 && !right) c = WALL_STONE.dark;
      if (joint && !top) c = WALL_STONE.dark;
      if (y === 6) c = WALL_STONE.deep;
      p.set(ox + x, oy + y, c);
    }
  }
  // Créneaux sur le dessus quand rien n'est posé au-dessus.
  if (!up) for (let x = x0; x <= x1; x += 4) for (let y = yTop - 2; y < yTop; y++) for (let k = 0; k < 2; k++) p.set(ox + x + k, oy + y, k === 0 ? WALL_STONE.hi : WALL_STONE.light);
  for (let x = x0; x <= x1; x++) p.set(ox + x, oy + 14, inkOf(WALL_STONE));
}

/**
 * Peint le champ de bataille. `rows` : identifiant de terrain de chaque case,
 * rangée par rangée ; `frame` : image de l'eau ; `seed` : variantes des décors.
 */
export function paintBattlefield(rows: readonly (readonly string[])[], frame: number, seed: number): Battlefield {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const width = w * BF_TILE;
  const height = h * BF_TILE + BF_TOP;
  const p = new Painter(width, height);
  const terrain = (x: number, y: number): string => rows[Math.min(h - 1, Math.max(0, y))]?.[Math.min(w - 1, Math.max(0, x))] ?? 'plaine';
  const grounds: Ground[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grounds.push(GROUND_OF[terrain(x, y)] ?? 'grass');

  // 1. Sols aux bords organiques.
  const groundMap: Ground[] = new Array(width * h * BF_TILE);
  for (let py = 0; py < h * BF_TILE; py++) {
    for (let px = 0; px < width; px++) {
      const g = groundAt(grounds, w, h, px, py, seed);
      groundMap[py * width + px] = g;
      p.set(px, py, groundColor(g, px, py, frame, seed));
    }
  }
  const groundOfPx = (px: number, py: number): Ground | null => (px < 0 || py < 0 || px >= width || py >= h * BF_TILE ? null : (groundMap[py * width + px] ?? null));

  // 2. Berges : talus sombre côté terre, écume côté eau.
  for (let py = 0; py < h * BF_TILE; py++) {
    for (let px = 0; px < width; px++) {
      const g = groundOfPx(px, py) as Ground;
      const wet = WATERY.has(g);
      let nearOther = 0;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0, -2], [-2, 0], [2, 0], [0, 2]] as const) {
        const n = groundOfPx(px + dx, py + dy);
        if (n !== null && WATERY.has(n) !== wet) nearOther = Math.max(nearOther, Math.abs(dx) + Math.abs(dy) === 1 ? 2 : 1);
      }
      if (nearOther === 0) continue;
      if (wet) {
        if (nearOther === 2 && (px + py + frame) % 4 !== 0) p.set(px, py, mixColor(P.ecume, WATER_COLORS.crest, 0.35));
      } else {
        const below = groundOfPx(px, py + 1);
        p.set(px, py, below !== null && WATERY.has(below) ? R.dirt.dark : nearOther === 2 ? R.dirt.base : mixColor(p.get(px, py), R.dirt.dark, 0.4));
      }
    }
  }

  // 3. Routes : chemins de terre entre les centres des cases reliées.
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      if (terrain(cx, cy) !== 'route') continue;
      const ax = cx * BF_TILE + 8;
      const ay = cy * BF_TILE + 8;
      const links: [number, number][] = [];
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (ROAD_LINKS.has(terrain(nx, ny))) links.push([ax + dx * 8, ay + dy * 8]);
      }
      // Route large (plusieurs cases) : on comble le coin commun à quatre cases de route.
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        const road = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && ROAD_LINKS.has(terrain(x, y));
        if (road(cx + dx, cy + dy) && road(cx + dx, cy) && road(cx, cy + dy)) links.push([ax + dx * 8, ay + dy * 8]);
      }
      for (let py = cy * BF_TILE - 3; py < (cy + 1) * BF_TILE + 3; py++) {
        for (let px = cx * BF_TILE - 3; px < (cx + 1) * BF_TILE + 3; px++) {
          const g = groundOfPx(px, py);
          if (g === null || WATERY.has(g)) continue;
          let d = Math.hypot(px + 0.5 - ax, py + 0.5 - ay);
          for (const [bx, by] of links) d = Math.min(d, segmentDistance(px + 0.5, py + 0.5, ax, ay, bx, by));
          const edge = 4.6 + (tileableNoise2D(px / 3, py / 3, 64, seed + 21) - 0.5) * 1.6;
          if (d > edge + 1) continue;
          const lit = tileableNoise2D(px / 6, py / 6, 64, seed + 23);
          p.set(px, py, d > edge ? R.dirt.dark : d < 1.6 && lit > 0.5 ? R.dirt.light : lit < 0.3 ? mixColor(R.dirt.base, R.dirt.dark, 0.4) : R.dirt.base);
        }
      }
    }
  }

  // 4. Grille discrète (lisibilité tactique) : liseré sombre au bord haut et gauche des cases.
  for (let py = 0; py < h * BF_TILE; py++) {
    for (let px = 0; px < width; px++) {
      if (px % BF_TILE === 0 || py % BF_TILE === 0) p.blend(px, py, SHADE, (px + py) % 2 === 0 ? 0.16 : 0.1);
    }
  }

  // 5. Bâtiments (cartes tirées du monde) : maisons pour les amas compacts, murs pour les amas allongés.
  const houseAt = new Map<number, { x0: number; y0: number; x1: number; y1: number; doors: number[] }>();
  const wallCells = new Set<number>();
  const seenBlob = new Set<number>();
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      if (terrain(cx, cy) !== 'batiment' || seenBlob.has(cy * w + cx)) continue;
      const blob: [number, number][] = [];
      const stack: [number, number][] = [[cx, cy]];
      seenBlob.add(cy * w + cx);
      while (stack.length > 0) {
        const [x, y] = stack.pop() as [number, number];
        blob.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || seenBlob.has(ny * w + nx)) continue;
          const t = terrain(nx, ny);
          // La porte (case « village ») fait partie de la maison.
          if (t !== 'batiment' && !(t === 'village' && ny >= y)) continue;
          seenBlob.add(ny * w + nx);
          stack.push([nx, ny]);
        }
      }
      const xs = blob.map(([x]) => x);
      const ys = blob.map(([, y]) => y);
      const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      const bw = box.x1 - box.x0 + 1;
      const bh = box.y1 - box.y0 + 1;
      if (bw <= 6 && bh <= 5 && blob.length >= 0.6 * bw * bh) {
        houseAt.set(box.y0 * w + box.x0, { ...box, doors: blob.filter(([x, y]) => terrain(x, y) === 'village').map(([x]) => x) });
      } else {
        for (const [x, y] of blob) if (terrain(x, y) === 'batiment') wallCells.add(y * w + x);
      }
    }
  }
  const inHouse = (x: number, y: number): boolean => [...houseAt.values()].some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);

  // 6. Décors, du nord au sud.
  for (let cy = 0; cy < h; cy++) {
    for (let cx = 0; cx < w; cx++) {
      const id = terrain(cx, cy);
      const ox = cx * BF_TILE;
      const oy = cy * BF_TILE;
      const cell = cy * w + cx;
      const rnd = hash(cx, cy, seed);
      const house = houseAt.get(cell);
      if (house) paintHouse(p, house.x0, house.y0, house.x1, house.y1, house.doors);
      if (wallCells.has(cell)) {
        const isWall = (x: number, y: number): boolean => wallCells.has(y * w + x) && x >= 0 && y >= 0 && x < w && y < h;
        paintWall(p, ox, oy, isWall(cx, cy - 1), isWall(cx, cy + 1), isWall(cx - 1, cy), isWall(cx + 1, cy));
      }
      if (inHouse(cx, cy)) continue;
      switch (id) {
        case 'plaine':
          paintGrassDetail(p, ox, oy, cell, seed);
          break;
        case 'foret':
          paintTree(p, ox, oy, rnd);
          break;
        case 'montagne':
          paintMountain(p, ox, oy, rnd);
          break;
        case 'ruines':
          paintRuins(p, ox, oy, rnd);
          break;
        case 'village':
          paintCottage(p, ox, oy);
          break;
        case 'pont': {
          const land = (x: number, y: number): boolean => x >= 0 && x < w && !WATERY.has(GROUND_OF[terrain(x, y)] ?? 'grass');
          const horizontal = land(cx - 1, cy) || land(cx + 1, cy) || (terrain(cx - 1, cy) === 'pont' && cx > 0) || (terrain(cx + 1, cy) === 'pont' && cx < w - 1);
          paintBridge(p, ox, oy, horizontal);
          break;
        }
        case 'marais':
          paintReeds(p, ox, oy, seed + cell);
          break;
        case 'gue':
          for (const [x, y] of [[3, 4], [9, 7], [5, 11], [12, 12]] as const) {
            p.set(ox + x, oy + y, R.stone.light);
            p.set(ox + x + 1, oy + y, R.stone.base);
            p.set(ox + x, oy + y + 1, R.stone.dark);
            p.set(ox + x + 1, oy + y + 1, R.stone.deep);
          }
          break;
        case 'plage':
          if (rnd > 0.4) {
            p.set(ox + 4 + Math.floor(rnd * 8), oy + 6 + Math.floor(rnd * 5), P.parchemin);
            p.set(ox + 5 + Math.floor(rnd * 8), oy + 7 + Math.floor(rnd * 5), R.sand.dark);
          }
          break;
        default:
          break;
      }
    }
  }

  return { width, height, pixels: p.px };
}
