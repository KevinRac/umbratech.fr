/**
 * Sols du monde : textures de base de chaque type de terrain, transitions
 * entre terrains voisins et rivages (GDD §3.5, §12.3).
 *
 * Les transitions suivent une règle de priorité : le terrain le plus
 * « prioritaire » déborde de quelques pixels sur son voisin moins prioritaire
 * (la route mord sur l'herbe, le sable sur l'herbe…). L'eau est toujours
 * prioritaire : la tuile de terre se découpe, laissant voir l'eau animée du
 * jeu, avec une berge sombre et un liseré d'écume.
 */
import { groundRelief } from './relief';
import { ACCENT, RAMPS, SHADE, line, speckle, type Ramp, type Rnd } from './art';
import { mix, type Px } from './px';
import { PALETTE as P } from '../../src/render/palette';
import { paintWheatFrame } from '../../src/render/wheatTile';

export const GROUND_KINDS = ['grass', 'forest', 'dirt', 'road', 'sand', 'rock', 'snow', 'marsh', 'field', 'cobble', 'planks', 'ruins', 'pond'] as const;
export type GroundKind = (typeof GROUND_KINDS)[number];

/** Terrain (`terrains.json`) de chaque type de sol. */
export const GROUND_TERRAIN: Record<GroundKind, string> = {
  grass: 'plaine',
  forest: 'foret',
  dirt: 'plaine',
  road: 'route',
  sand: 'plage',
  rock: 'montagne',
  snow: 'montagne',
  marsh: 'marais',
  field: 'plaine',
  cobble: 'village',
  planks: 'village',
  ruins: 'ruines',
  pond: 'eau_profonde',
};

/** Qui déborde sur qui : plus la valeur est haute, plus le terrain est prioritaire. */
export const GROUND_PRIORITY: Record<GroundKind, number> = {
  marsh: 0,
  grass: 1,
  field: 2,
  forest: 3,
  rock: 4,
  snow: 5,
  sand: 6,
  dirt: 7,
  road: 8,
  ruins: 9,
  planks: 10,
  cobble: 11,
  pond: 12,
};

/** Nombre de variantes de la texture de base de chaque sol (tons × décors ; voir `toneColor`). */
export const TONED: ReadonlySet<GroundKind> = new Set<GroundKind>(['grass', 'forest', 'dirt', 'sand', 'rock', 'snow', 'marsh']);
export const GROUND_VARIANTS: Record<GroundKind, number> = {
  grass: 12, // 3 tons × 4 décors
  forest: 9,
  dirt: 6,
  road: 3,
  sand: 6,
  rock: 6,
  snow: 6,
  marsh: 6,
  field: 2,
  cobble: 3,
  planks: 2,
  ruins: 4,
  pond: 3,
};

export type Side = GroundKind | 'water' | null;
/** Voisins dans l'ordre nord, est, sud, ouest. */
export type Sides = readonly [Side, Side, Side, Side];
/** Coins d'eau seule (nord-est, sud-est, sud-ouest, nord-ouest). */
export type Corners = readonly [boolean, boolean, boolean, boolean];

export interface GroundSpec {
  readonly kind: GroundKind;
  readonly variant: number;
  readonly sides: Sides;
  readonly corners: Corners;
}

const NO_SIDES: Sides = [null, null, null, null];
const NO_CORNERS: Corners = [false, false, false, false];

export function plainSpec(kind: GroundKind, variant: number): GroundSpec {
  return { kind, variant, sides: NO_SIDES, corners: NO_CORNERS };
}

export function groundKey(spec: GroundSpec): string {
  const sides = spec.sides.map((s) => (s === null ? '-' : s === 'water' ? 'W' : s)).join('.');
  const corners = spec.corners.map((c) => (c ? '1' : '0')).join('');
  return `g:${spec.kind}:${spec.variant}:${sides}:${corners}`;
}

const T = 16;

/* ---------- Textures de base ---------- */

function fill(px: Px, color: number): void {
  px.rect(0, 0, T, T, color);
}

/** Touffe d'herbe : trois pixels en « Y » et un éclat clair au sommet. */
function tuft(px: Px, x: number, y: number, dark: number, tip: number): void {
  px.set(x, y, dark);
  px.set(x - 1, y - 1, dark);
  px.set(x + 1, y - 1, dark);
  px.set(x, y - 1, tip);
  px.set(x - 1, y - 2, tip);
  px.set(x + 1, y, mix(dark, SHADE, 0.45));
}

/** Teinte de fond : 3 tons très proches (0 neutre, 1 plus clair, 2 plus sombre) pour de larges nuances douces. */
function toneColor(r: Ramp, v: number): number {
  const t = v % 3;
  return t === 0 ? r.base : t === 1 ? mix(r.base, r.light, 0.09) : mix(r.base, r.dark, 0.1);
}
const decoOf = (v: number): number => Math.floor(v / 3);

/** Pose un caillou : lumière en haut, ombre dessous (2 × 2 px). */
function pebble(px: Px, x: number, y: number, r: Ramp): void {
  px.set(x, y, r.hi);
  px.set(x + 1, y, r.light);
  px.set(x, y + 1, r.dark);
  px.set(x + 1, y + 1, r.deep);
}

function paintGrass(px: Px, rnd: Rnd, variant: number): void {
  const r: Ramp = RAMPS.grass;
  fill(px, toneColor(r, variant));
  const deco = decoOf(variant);
  const at = (): [number, number] => [2 + Math.floor(rnd() * 12), 3 + Math.floor(rnd() * 11)];
  if (deco === 0) {
    for (let i = 0; i < 2; i++) tuft(px, ...at(), r.dark, r.light);
  } else if (deco === 1) {
    tuft(px, ...at(), r.dark, r.light);
    const [x, y] = at();
    pebble(px, x, y, RAMPS.rock);
  } else if (deco === 2) {
    const colors = [ACCENT.flowerYellow, ACCENT.flowerWhite, ACCENT.flowerRed, ACCENT.flowerBlue];
    for (let i = 0; i < 3; i++) {
      const [x, y] = at();
      px.set(x, y, colors[Math.floor(rnd() * colors.length)] as number);
      px.set(x, y + 1, r.dark);
    }
  } else {
    // Trèfles : petit bouquet de pixels clairs et sombres.
    const [x, y] = at();
    px.set(x, y, r.light);
    px.set(x + 1, y, r.hi);
    px.set(x, y + 1, r.dark);
    px.set(x + 1, y + 1, r.light);
    tuft(px, ...at(), r.dark, r.light);
  }
}

function paintForest(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.forest;
  fill(px, toneColor(r, variant));
  const deco = decoOf(variant);
  // Feuilles mortes : deux pixels chauds isolés.
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(rnd() * 13);
    const y = 1 + Math.floor(rnd() * 13);
    px.set(x, y, RAMPS.foliageAutumn.base);
    px.set(x + 1, y, RAMPS.foliageAutumn.dark);
  }
  if (deco === 0) {
    const x = 2 + Math.floor(rnd() * 10);
    line(px, x, 12, x + 3, 13, r.deep);
    line(px, x + 3, 13, x + 5, 12, r.deep);
  } else if (deco === 1) {
    const x = 3 + Math.floor(rnd() * 9);
    const y = 4 + Math.floor(rnd() * 8);
    px.set(x, y, ACCENT.flowerRed);
    px.set(x + 1, y, ACCENT.flowerRed);
    px.set(x, y - 1, ACCENT.flowerWhite);
    px.set(x, y + 1, P.parchemin);
  } else {
    tuft(px, 3 + Math.floor(rnd() * 10), 5 + Math.floor(rnd() * 8), r.deep, r.light);
  }
}

function paintDirt(px: Px, rnd: Rnd, variant: number, ramp: Ramp = RAMPS.dirt): void {
  fill(px, toneColor(ramp, variant));
  const n = 1 + decoOf(variant);
  for (let i = 0; i < n; i++) pebble(px, 2 + Math.floor(rnd() * 11), 2 + Math.floor(rnd() * 11), ramp);
  // Un trait de terre sombre, comme une trace.
  const y = 3 + Math.floor(rnd() * 10);
  const x = Math.floor(rnd() * 8);
  px.rect(x, y, 4, 1, ramp.dark);
}

function paintRoad(px: Px, rnd: Rnd, variant: number): void {
  const ramp: Ramp = { ...RAMPS.dirt, base: mix(RAMPS.dirt.base, P.sable, 0.3), light: mix(RAMPS.dirt.light, P.parchemin, 0.25) };
  fill(px, ramp.base);
  px.rect(0, 0, T, 1, mix(ramp.base, ramp.light, 0.35));
  const n = 2 + (variant % 2);
  for (let i = 0; i < n; i++) pebble(px, 1 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 11), ramp);
  if (variant >= 1) {
    const y = variant === 1 ? 5 : 11;
    for (let x = 0; x < T; x += 1) if (x % 5 !== 3) px.set(x, y, ramp.dark);
  }
}

function paintSand(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.sand;
  fill(px, toneColor(r, variant));
  const deco = decoOf(variant);
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(rnd() * 9);
    const y = 2 + Math.floor(rnd() * 12);
    px.rect(x, y, 4 + Math.floor(rnd() * 3), 1, r.light);
    px.rect(x + 1, y + 1, 3, 1, r.dark);
  }
  if (deco === 1) {
    const x = 3 + Math.floor(rnd() * 9);
    const y = 3 + Math.floor(rnd() * 9);
    px.set(x, y, ACCENT.flowerWhite);
    px.set(x + 1, y, P.parchemin);
    px.set(x, y + 1, r.dark);
  }
}

function paintRock(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.rock;
  fill(px, toneColor(r, variant));
  // Dalles inclinées : arête claire en haut, ombre en bas.
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(rnd() * 9);
    const y = 1 + Math.floor(rnd() * 11);
    px.rect(x, y, 5, 1, r.hi);
    px.rect(x, y + 1, 5, 2, r.light);
    px.rect(x, y + 3, 5, 1, r.dark);
    px.set(x + 5, y + 1, r.dark);
    px.set(x + 5, y + 2, r.deep);
  }
  let x = 2 + Math.floor(rnd() * 11);
  let y = 1 + Math.floor(rnd() * 4);
  for (let i = 0; i < 5 + decoOf(variant); i++) {
    px.set(x, y, r.deep);
    x += rnd() < 0.4 ? 1 : 0;
    y += 1;
  }
}

function paintSnow(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.snow;
  fill(px, toneColor(r, variant));
  // Creux ombrés (bleutés) et étincelles.
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(rnd() * 9);
    const y = 3 + Math.floor(rnd() * 10);
    px.rect(x, y, 4, 1, mix(r.base, r.dark, 0.55));
    px.rect(x + 1, y + 1, 3, 1, mix(r.base, r.dark, 0.3));
  }
  px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), 0xffffff);
  if (decoOf(variant) === 1) px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), ACCENT.cyan);
}

function paintMarsh(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.marsh;
  fill(px, toneColor(r, variant));
  // Flaques sombres avec un reflet de ciel.
  const x = 1 + Math.floor(rnd() * 8);
  const y = 3 + Math.floor(rnd() * 8);
  px.rect(x, y, 6, 3, mix(P.bleuGris, r.deep, 0.55));
  px.rect(x + 1, y - 1, 4, 1, mix(P.bleuGris, r.deep, 0.55));
  px.rect(x + 1, y + 3, 4, 1, mix(P.bleuGris, r.deep, 0.55));
  px.set(x + 2, y + 1, P.ciel);
  px.set(x + 3, y + 1, P.ecume);
  tuft(px, 2 + Math.floor(rnd() * 12), 12 + Math.floor(rnd() * 3), RAMPS.grass.dark, RAMPS.grass.light);
  if (decoOf(variant) === 1) {
    const vx = 3 + Math.floor(rnd() * 9);
    px.set(vx, 2, ACCENT.violet);
    px.set(vx, 3, r.dark);
  }
}

function paintPond(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.pond;
  fill(px, r.base);
  speckle(px, rnd, 0, 0, T, T, r.dark, 5);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 12);
    const y = 1 + Math.floor(rnd() * 14);
    px.rect(x, y, 3 + Math.floor(rnd() * 2), 1, r.light);
  }
  if (variant === 2) {
    const x = 3 + Math.floor(rnd() * 9);
    const y = 3 + Math.floor(rnd() * 9);
    px.rect(x, y, 3, 2, RAMPS.grass.dark);
    px.set(x + 1, y, RAMPS.grass.base);
    px.set(x + 2, y + 1, ACCENT.flowerWhite);
  }
}

/** Champ fixe (cases au bord d'un autre sol) : image 0 du blé animé que le jeu pose sur les cases intérieures. */
function paintField(px: Px, _rnd: Rnd, variant: number): void {
  paintWheatFrame({ set: (x, y, color, alpha) => px.set(x, y, color, alpha ?? 255) }, 0, 0, 0, variant);
}

function paintCobble(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.stone;
  fill(px, r.dark);
  let y = 0;
  let rowIndex = 0;
  while (y < T) {
    const h = rowIndex % 2 === 0 ? 5 : 6;
    let x = (rowIndex * 3 + variant * 2) % 5 === 0 ? 0 : -2 - (rowIndex % 3);
    while (x < T) {
      const w = 5 + Math.floor(rnd() * 3);
      const color = rnd() < 0.5 ? r.base : r.light;
      px.rect(x + 1, y + 1, w - 1, h - 1, color);
      px.rect(x + 1, y + 1, w - 1, 1, r.hi);
      speckle(px, rnd, x + 1, y + 1, w - 1, h - 1, r.dark, 1);
      x += w;
    }
    y += h;
    rowIndex++;
  }
}

function paintPlanks(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.wood;
  fill(px, r.dark);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const color = rnd() < 0.5 ? r.base : r.light;
    px.rect(0, y, T, 3, color);
    px.rect(0, y, T, 1, r.hi);
    px.rect(0, y + 3, T, 1, r.deep);
    const seam = (row * 7 + variant * 5) % T;
    px.rect(seam, y, 1, 3, r.deep);
    px.set((seam + 2) % T, y + 1, r.deep); // clou
  }
}

function paintRuins(px: Px, rnd: Rnd, variant: number): void {
  const r = RAMPS.ruin;
  fill(px, r.dark);
  // Dalles irrégulières 8×8 avec fissures et mousse.
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      px.rect(tx * 8 + 1, ty * 8 + 1, 7, 7, rnd() < 0.5 ? r.base : r.light);
      px.rect(tx * 8 + 1, ty * 8 + 1, 7, 1, r.hi);
    }
  }
  speckle(px, rnd, 0, 0, T, T, r.deep, 3);
  let x = 2 + Math.floor(rnd() * 11);
  let y = Math.floor(rnd() * 5);
  for (let i = 0; i < 6; i++) {
    px.set(x, y, r.deep);
    x += rnd() < 0.4 ? 1 : 0;
    y += 1;
  }
  if (variant % 2 === 1) {
    speckle(px, rnd, 0, 0, T, T, RAMPS.grass.dark, 3);
    speckle(px, rnd, 0, 0, T, T, RAMPS.foliage.base, 2);
  }
}

const PAINTERS: Record<GroundKind, (px: Px, rnd: Rnd, variant: number) => void> = {
  grass: paintGrass,
  forest: paintForest,
  dirt: (px, rnd, v) => paintDirt(px, rnd, v, { ...RAMPS.dirt, base: mix(RAMPS.dirt.base, P.rougeCendre, 0.12), dark: mix(RAMPS.dirt.dark, P.rougeCendre, 0.1) }),
  road: paintRoad,
  sand: paintSand,
  rock: paintRock,
  snow: paintSnow,
  marsh: paintMarsh,
  field: paintField,
  cobble: paintCobble,
  planks: paintPlanks,
  ruins: paintRuins,
  pond: paintPond,
};

export function paintBase(px: Px, rnd: Rnd, kind: GroundKind, variant: number): void {
  PAINTERS[kind](px, rnd, variant);
  if (kind !== 'pond' && kind !== 'field') groundRelief(px, variant, kind === 'grass' || kind === 'forest' ? 0.9 : 1.15);
}

/* ---------- Transitions et rivages ---------- */

/** Distance (en pixels) au bord n°`side` (0 nord, 1 est, 2 sud, 3 ouest). */
function edgeDistance(side: number, x: number, y: number): number {
  return side === 0 ? y : side === 1 ? T - 1 - x : side === 2 ? T - 1 - y : x;
}
function edgePosition(side: number, x: number, y: number): number {
  return side === 0 || side === 2 ? x : y;
}

/** Profondeur (1 à `max`) de la bande le long d'un bord : bruit lissé pour un contour naturel. */
function depthProfile(rnd: Rnd, min: number, max: number): number[] {
  const raw = Array.from({ length: T }, () => min + rnd() * (max - min));
  return raw.map((_, i) => {
    const a = raw[(i + T - 1) % T] as number;
    const b = raw[i] as number;
    const c = raw[(i + 1) % T] as number;
    return Math.round((a + 2 * b + c) / 4);
  });
}

function blendNeighbor(px: Px, rnd: Rnd, side: number, other: GroundKind): void {
  const tmp = new (px.constructor as new (w: number, h: number) => Px)(T, T);
  paintBase(tmp, rnd, other, 0);
  const depth = depthProfile(rnd, 1.4, 3.6);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (edgeDistance(side, x, y) < (depth[edgePosition(side, x, y)] as number)) px.copy(tmp, x, y, 1, 1, x, y);
    }
  }
}

/** Couleur de la berge (le pixel opaque au contact de l'eau), selon le sol. */
function bankColor(kind: GroundKind): number {
  switch (kind) {
    case 'sand':
      return ACCENT.wet;
    case 'grass':
    case 'field':
    case 'dirt':
    case 'road':
      return RAMPS.grass.deep;
    case 'forest':
      return RAMPS.forest.deep;
    case 'marsh':
      return RAMPS.marsh.deep;
    case 'snow':
      return RAMPS.snow.dark;
    case 'rock':
      return RAMPS.rock.deep;
    case 'ruins':
      return RAMPS.ruin.deep;
    case 'planks':
      return RAMPS.wood.deep;
    case 'cobble':
      return RAMPS.stone.deep;
    default:
      return RAMPS.pond.deep;
  }
}

function cutShore(px: Px, rnd: Rnd, side: number, kind: GroundKind): void {
  // Profil lisse et identique d'une case à l'autre (sinusoïde de période 16) : berge continue, sans dents.
  const base = kind === 'sand' ? 3.1 : 2.5;
  const depth = Array.from({ length: T }, (_, i) => base + 0.65 * Math.sin((2 * Math.PI * (i + 0.5)) / T));
  const bank = bankColor(kind);
  const foamAlpha = [255, 220, 170];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const d = edgeDistance(side, x, y);
      const cut = depth[edgePosition(side, x, y)] as number;
      if (d < cut) {
        px.set(x, y, 0, 0);
      } else if (d === cut) {
        px.set(x, y, bank);
      } else if (d === cut + 1 && kind === 'sand') {
        px.set(x, y, mix(px.colorAt(x, y), ACCENT.wet, 0.55));
      }
    }
  }
  // Écume sur l'eau, juste devant la berge.
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const d = edgeDistance(side, x, y);
      const cut = depth[edgePosition(side, x, y)] as number;
      if (d === cut - 1 && rnd() < 0.75) px.set(x, y, ACCENT.foam, foamAlpha[Math.floor(rnd() * 3)] as number);
      else if (d === cut - 2 && rnd() < 0.25) px.set(x, y, ACCENT.foam, 110);
    }
  }
}

function cutCorner(px: Px, corner: number, kind: GroundKind): void {
  // Coins : 0 nord-est, 1 sud-est, 2 sud-ouest, 3 nord-ouest.
  const cx = corner === 0 || corner === 1 ? T - 0.5 : 0.5;
  const cy = corner === 1 || corner === 2 ? T - 0.5 : 0.5;
  const bank = bankColor(kind);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < 4.7) px.set(x, y, 0, 0);
      else if (d < 5.7 && px.alphaAt(x, y) > 0) px.set(x, y, bank);
      else if (d < 6.3 && px.alphaAt(x, y) === 0) px.set(x, y, ACCENT.foam, 160);
    }
  }
}

/** Arrondit un coin de terre qui avance dans l'eau (eau sur deux côtés voisins) : berge en courbe, pas en équerre. */
function roundConvexCorner(px: Px, corner: number, kind: GroundKind): void {
  const R = 7;
  const inset = 2.5 + R; // le cercle est tangent aux deux berges droites
  const east = corner === 0 || corner === 1;
  const south = corner === 1 || corner === 2;
  const ccx = east ? T - inset : inset;
  const ccy = south ? T - inset : inset;
  const bank = bankColor(kind);
  const inRegion = (x: number, y: number): boolean => (east ? x + 0.5 > ccx : x + 0.5 < ccx) && (south ? y + 0.5 > ccy : y + 0.5 < ccy);
  const removed: boolean[] = new Array<boolean>(T * T).fill(false);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (!inRegion(x, y)) continue;
      if (Math.hypot(x + 0.5 - ccx, y + 0.5 - ccy) > R) {
        px.set(x, y, 0, 0);
        removed[y * T + x] = true;
      }
    }
  }
  const gone = (x: number, y: number): boolean => x < 0 || y < 0 || x >= T || y >= T || px.alphaAt(x, y) === 0;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (!inRegion(x, y) || removed[y * T + x]) continue;
      if (px.alphaAt(x, y) > 0 && (gone(x - 1, y) || gone(x + 1, y) || gone(x, y - 1) || gone(x, y + 1))) px.set(x, y, bank);
    }
  }
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (!removed[y * T + x]) continue;
      const near = (nx: number, ny: number): boolean => nx >= 0 && ny >= 0 && nx < T && ny < T && !removed[ny * T + nx] && px.alphaAt(nx, ny) > 0;
      if (near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1)) px.set(x, y, ACCENT.foam, 170);
    }
  }
}

export function paintGround(px: Px, rnd: Rnd, spec: GroundSpec): void {
  paintBase(px, rnd, spec.kind, spec.variant);
  spec.sides.forEach((side, i) => {
    if (side !== null && side !== 'water') blendNeighbor(px, rnd, i, side);
  });
  spec.sides.forEach((side, i) => {
    if (side === 'water') cutShore(px, rnd, i, spec.kind);
  });
  spec.corners.forEach((on, i) => {
    if (on) cutCorner(px, i, spec.kind);
  });
  // Coins convexes (eau sur deux côtés voisins) : NE = N+E, SE = E+S, SW = S+W, NW = W+N.
  const wet = spec.sides.map((side) => side === 'water');
  ([[0, 1], [1, 2], [2, 3], [3, 0]] as const).forEach(([a, b], corner) => {
    if (wet[a] && wet[b]) roundConvexCorner(px, corner, spec.kind);
  });
}

/* ---------- Tuiles d'eau et de passage ---------- */

/** Eau libre : transparente (l'eau animée est dessinée par le jeu derrière la couche de sol). */
export function paintClear(_px: Px): void {
  /* rien : tuile transparente */
}

/** Voile sombre en damier tramé : la mer s'assombrit loin des côtes (niveau 1 à 3). */
export function paintDeepWater(px: Px, level: number): void {
  const density = [0, 0.28, 0.5, 0.72][level] as number;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const threshold = ((BAYER[(y % 4) * 4 + (x % 4)] as number) + 0.5) / 16;
      if (density > threshold) px.set(x, y, P.nuit, 120);
    }
  }
}

/** Gué : eau peu profonde, pierres affleurantes. */
export function paintFord(px: Px, rnd: Rnd, variant: number): void {
  const shallow = mix(P.ciel, P.bleuGris, 0.4);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px.set(x, y, shallow, 150);
  // Pierres plates posées dans le courant.
  const stones = 3 + (variant % 2);
  for (let i = 0; i < stones; i++) {
    const x = 1 + Math.floor(rnd() * 11);
    const y = 1 + Math.floor(rnd() * 12);
    px.rect(x, y, 4, 2, RAMPS.rock.light);
    px.rect(x, y + 2, 4, 1, RAMPS.rock.dark);
    px.rect(x, y, 4, 1, RAMPS.rock.hi);
  }
  speckle(px, rnd, 0, 0, T, T, ACCENT.foam, 2);
}

export type BridgeOrientation = 'h' | 'v';
export type BridgePart = 'start' | 'mid' | 'end';

/**
 * Pont de planches. `h` : il traverse un cours d'eau vertical (planches
 * dirigées est-ouest) ; `v` : il franchit un cours d'eau horizontal.
 * `part` : bord de rampe (start, end) ou milieu, pour les rambardes.
 */
export function paintBridge(px: Px, rnd: Rnd, orientation: BridgeOrientation, part: BridgePart): void {
  const r = RAMPS.wood;
  const across = (a: number, b: number): [number, number] => (orientation === 'h' ? [a, b] : [b, a]);
  // Planches.
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < T; j++) {
      const [x, y] = across(i, j);
      const board = Math.floor(j / 4);
      const shade = board % 2 === 0 ? r.base : r.light;
      px.set(x, y, j % 4 === 3 ? r.deep : shade);
    }
  }
  speckle(px, rnd, 0, 0, T, T, r.dark, 3);
  // Rambardes : bandes sombres sur les deux bords du pont (le long de l'axe de marche).
  for (let i = 0; i < T; i++) {
    for (const j of [0, 1, T - 2, T - 1]) {
      const [x, y] = across(i, j);
      px.set(x, y, j === 0 || j === T - 1 ? r.deep : r.hi);
    }
    if (i % 5 === 0) {
      for (const j of [0, T - 1]) {
        const [x, y] = across(i, j);
        px.set(x, y, mix(r.deep, P.encre, 0.5));
      }
    }
  }
  if (part !== 'mid') {
    // Poteau de rampe aux extrémités.
    const iEnd = part === 'start' ? 0 : T - 1;
    for (const j of [0, T - 1]) {
      const [x, y] = across(iEnd, j);
      px.set(x, y, r.hi);
    }
  }
  // Ombre portée du pont sur l'eau : bande translucide dessous.
  for (let i = 0; i < T; i++) {
    const [x, y] = across(i, T - 1);
    px.set(x, y, r.deep);
  }
}
