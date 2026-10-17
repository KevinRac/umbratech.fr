/**
 * Sols du monde : textures de base de chaque type de terrain, transitions
 * entre terrains voisins et rivages (GDD §3.5, §12.3, décision n°43).
 *
 * Contours lissés (décision n°43) : l'outil de génération floute la présence
 * de chaque sol à l'échelle du monde (flou gaussien sur les cases, échantillonné
 * tous les 4 px). Chaque tuile reçoit ses 5 × 5 échantillons ; pour chaque
 * pixel on les interpole, on ajoute un bruit très doux et continu (période
 * 32 px, même valeur des deux côtés d'un raccord), et le sol le plus présent
 * l'emporte. Les marches d'une case
 * deviennent des pentes et des courbes ; aucune coupure entre deux tuiles. Le
 * même principe découpe de larges plaques de 3 tons et dessine les rivages :
 * l'eau (rivière, mer, étangs) est la couche la plus haute ; là où elle passe,
 * la tuile est transparente et laisse voir l'eau animée du jeu, avec un talus
 * et un liseré d'écume. Les champs et les quais gardent des bords nets.
 */
import { ACCENT, RAMPS, SHADE, SUN, speckle, type Ramp, type Rnd } from './art';
import { hashString, mulberry32 } from './noise';
import { mix, Px } from './px';
import { PALETTE as P } from '../../src/render/palette';
import { paintFieldSoil } from './wheat';

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

/** Qui recouvre qui : plus la valeur est haute, plus le terrain est prioritaire. */
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

/** Hauteur visuelle : un sol plus haut projette une ombre douce sur son voisin (lumière en haut à gauche). */
const GROUND_HEIGHT: Record<GroundKind, number> = {
  marsh: 0,
  pond: 0,
  road: 1,
  dirt: 1,
  sand: 1,
  cobble: 1,
  ruins: 1,
  planks: 2,
  field: 2,
  grass: 2,
  forest: 2,
  rock: 3,
  snow: 3,
};

/** Sols à bords nets : ils ne se mélangent pas à leurs voisins (champs cultivés, quais, étangs). */
export const HARD_KINDS: ReadonlySet<GroundKind> = new Set<GroundKind>(['field', 'planks']);
/** Sols découpés en plaques de 3 tons. */
export const TONED: ReadonlySet<GroundKind> = new Set<GroundKind>(['grass', 'forest', 'dirt', 'road', 'sand', 'rock', 'snow', 'marsh']);
/** Sols dont la texture suit une trame du monde (pavés) : la tuile dépend de sa phase. */
const PHASED: ReadonlySet<GroundKind> = new Set<GroundKind>(['cobble']);

/** Nombre de décors possibles par sol (`deco` de 0 à n-1 ; 0 = sol nu). */
export const GROUND_DECOS: Record<GroundKind, number> = {
  grass: 5,
  forest: 4,
  dirt: 3,
  road: 3,
  sand: 3,
  rock: 3,
  snow: 2,
  marsh: 3,
  field: 2,
  cobble: 1,
  planks: 2,
  ruins: 4,
  pond: 3,
};


/** Ornière d'une route : axe et voie (0 = haut/gauche, 1 = bas/droite d'une route de 2 cases). */
export interface Rut {
  readonly axis: 'h' | 'v';
  readonly lane: 0 | 1;
}

/** Couche de sol lissée : un sol, ou l'eau (toujours au-dessus). */
export type Layer = GroundKind | 'water';

/** Échantillons (5 × 5, tous les 4 px, ligne par ligne) de la présence lissée d'une couche, quantifiés de 0 à 16 (= 0 à 1). */
export interface LayerSamples {
  readonly layer: Layer;
  readonly f: readonly number[];
}

export const SAMPLE_STEPS = 16;

export interface GroundSpec {
  /** Sol de la case elle-même (porte le terrain de la tuile) ; `water` pour une case d'eau. */
  readonly kind: Layer;
  readonly deco: number;
  /** Sol de repli (le plus présent dans la tuile). */
  readonly base: GroundKind;
  /** Couches présentes près de la tuile : chaque pixel prend celle dont la présence (plus un bruit doux) est la plus forte. */
  readonly layers: readonly LayerSamples[];
  /** Ton lissé (5 × 5 échantillons, 0 à 16 = ton 0 à 2). */
  readonly tone: readonly number[];
  /** Parité de la case : (x & 1) + 2 × (y & 1). Sert au bruit et aux trames de période 32 px. */
  readonly phase: number;
  readonly rut: Rut | null;
  /** Usure des pavés : 0 au bord de la place, 2 au centre. */
  readonly wear: number;
}

const T = 16;
const PERIOD = 32;

/** Ramène à 0 la phase d'une tuile qui n'en dépend pas (sol uni) : moins de tuiles différentes. */
export function normalizeSpec(spec: GroundSpec): GroundSpec {
  const flatTone = spec.tone.every((t) => t === spec.tone[0]);
  const phased = spec.layers.length > 0 || !flatTone || spec.rut !== null || (spec.kind !== 'water' && PHASED.has(spec.kind));
  return phased ? spec : { ...spec, phase: 0 };
}

export function groundKey(spec: GroundSpec): string {
  const layers = spec.layers.map((l) => `${l.layer}${l.f.join(',')}`).join('|');
  const toned = TONED.has(spec.base) || spec.layers.some((l) => l.layer !== 'water' && TONED.has(l.layer));
  const tone = toned ? spec.tone.join(',') : '';
  return `g:${spec.kind}:${spec.base}:${spec.deco}:${spec.phase}:${layers}:${tone}:${spec.rut ? `${spec.rut.axis}${spec.rut.lane}` : '-'}:${spec.kind === 'cobble' ? spec.wear : 0}`;
}

/* ---------- Bruit continu du monde (période 32 px) ---------- */

/** Bruit de valeur lissé, périodique sur 32 × 32 px, dans [-1, 1]. */
function periodicNoise(seed: number): Float32Array {
  const out = new Float32Array(PERIOD * PERIOD);
  const octaves: [number, number][] = [
    [16, 0.55],
    [8, 0.45],
  ];
  for (const [step, weight] of octaves) {
    const n = PERIOD / step;
    const rnd = mulberry32(seed + step * 7919);
    const lattice = Array.from({ length: n * n }, () => rnd() * 2 - 1);
    const g = (x: number, y: number): number => lattice[(((y % n) + n) % n) * n + (((x % n) + n) % n)] as number;
    const s = (t: number): number => t * t * (3 - 2 * t);
    for (let y = 0; y < PERIOD; y++) {
      for (let x = 0; x < PERIOD; x++) {
        const fx = x / step;
        const fy = y / step;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = s(fx - x0);
        const ty = s(fy - y0);
        const a = g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx;
        const b = g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx;
        out[y * PERIOD + x] = (out[y * PERIOD + x] as number) + weight * (a * (1 - ty) + b * ty);
      }
    }
  }
  return out;
}

const noiseCache = new Map<string, Float32Array>();
function noiseOf(name: string): Float32Array {
  let n = noiseCache.get(name);
  if (!n) {
    n = periodicNoise(hashString(`ground-noise:${name}`));
    noiseCache.set(name, n);
  }
  return n;
}
const wrap = (v: number): number => ((v % PERIOD) + PERIOD) % PERIOD;
const sample = (n: Float32Array, wx: number, wy: number): number => n[wrap(wy) * PERIOD + wrap(wx)] as number;

/** Amplitude du bruit de bord de chaque couche (en valeur de champ) : faible, pour des courbes nettes et douces. */
const EDGE_AMPLITUDE: Record<Layer, number> = {
  marsh: 0.14,
  grass: 0.12,
  field: 0,
  forest: 0.14,
  rock: 0.12,
  snow: 0.12,
  sand: 0.1,
  dirt: 0.1,
  road: 0.06,
  ruins: 0.1,
  planks: 0,
  cobble: 0.05,
  pond: 0.1,
  water: 0.09,
};
const TONE_AMPLITUDE = 0.22;
/** Léger avantage des sols aménagés : les cours et sentiers d'une case de large ne disparaissent pas dans l'herbe. */
const LAYER_GAIN: Partial<Record<Layer, number>> = { dirt: 1.1, road: 1.06, cobble: 1.1, ruins: 1.06 };

/* ---------- Textures de base ---------- */

/** Rampe de la route : terre sèche plus claire que la terre battue. */
const ROAD_RAMP: Ramp = { ...RAMPS.dirt, base: mix(RAMPS.dirt.base, P.ocreClair, 0.22), light: mix(RAMPS.dirt.light, P.parchemin, 0.25) };
const DIRT_RAMP: Ramp = { ...RAMPS.dirt, base: mix(RAMPS.dirt.base, P.terreCuite, 0.12), dark: mix(RAMPS.dirt.dark, P.brique, 0.1) };

export function rampOf(kind: GroundKind): Ramp {
  switch (kind) {
    case 'grass':
      return RAMPS.grass;
    case 'forest':
      return RAMPS.forest;
    case 'dirt':
      return DIRT_RAMP;
    case 'road':
      return ROAD_RAMP;
    case 'sand':
      return RAMPS.sand;
    case 'rock':
      return RAMPS.rock;
    case 'snow':
      return RAMPS.snow;
    case 'marsh':
      return RAMPS.marsh;
    case 'field':
      return RAMPS.wheat;
    case 'cobble':
      return RAMPS.stone;
    case 'planks':
      return RAMPS.wood;
    case 'ruins':
      return RAMPS.ruin;
    case 'pond':
      return RAMPS.pond;
  }
}

/** Couleur de fond d'un ton : plaques nettement distinctes mais douces (0 sombre, 1 moyen, 2 clair). */
function toneColor(r: Ramp, tone: number): number {
  return tone === 0 ? mix(r.base, r.dark, 0.24) : tone === 2 ? mix(r.base, r.light, 0.26) : r.base;
}

function fill(px: Px, color: number): void {
  px.rect(0, 0, T, T, color);
}

/** Quelques pixels à peine plus sombres : grain discret, sans bruit. */
function grain(px: Px, rnd: Rnd, color: number, count: number): void {
  for (let i = 0; i < count; i++) px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), color);
}

function texGrass(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.grass;
  const c = toneColor(r, tone);
  fill(px, c);
  grain(px, rnd, mix(c, r.dark, 0.35), 3);
  grain(px, rnd, mix(c, r.light, 0.35), 2);
}

function texForest(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.forest;
  const c = toneColor(r, tone);
  fill(px, c);
  grain(px, rnd, mix(c, r.dark, 0.4), 3);
  // Feuilles mortes : pixels chauds isolés.
  for (let i = 0; i < 2; i++) px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), mix(c, RAMPS.foliageAutumn.base, 0.5));
}

function texEarth(px: Px, rnd: Rnd, tone: number, r: Ramp): void {
  const c = toneColor(r, tone);
  fill(px, c);
  grain(px, rnd, mix(c, r.dark, 0.3), 4);
  grain(px, rnd, mix(c, r.light, 0.3), 2);
}

function texSand(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.sand;
  const c = toneColor(r, tone);
  fill(px, c);
  // Rides de vent : traits courts, lumière au-dessus, creux dessous.
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(rnd() * 10);
    const y = 2 + Math.floor(rnd() * 12);
    const w = 4 + Math.floor(rnd() * 3);
    px.rect(x, y, w, 1, mix(c, r.light, 0.5));
    px.rect(x + 1, y + 1, w - 1, 1, mix(c, r.dark, 0.35));
  }
}

function texRock(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.rock;
  const c = toneColor(r, tone);
  fill(px, c);
  grain(px, rnd, mix(c, r.dark, 0.35), 4);
  grain(px, rnd, mix(c, r.light, 0.35), 3);
}

/** Dalle de roche inclinée : arête claire en haut, ombre violette en bas. */
function slab(px: Px, x: number, y: number, w: number, c: number, r: Ramp): void {
  px.rect(x + 1, y, w - 2, 1, mix(c, r.hi, 0.55));
  px.rect(x, y + 1, w, 2, mix(c, r.light, 0.35));
  px.rect(x, y + 3, w, 1, mix(c, r.dark, 0.55));
  px.rect(x + 1, y + 4, w - 1, 1, mix(c, SHADE, 0.35));
  px.set(x + w, y + 2, mix(c, r.dark, 0.5));
}

function texSnow(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.snow;
  const c = toneColor(r, tone);
  fill(px, c);
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(rnd() * 9);
    const y = 3 + Math.floor(rnd() * 10);
    px.rect(x, y, 4, 1, mix(c, r.dark, 0.45));
    px.rect(x + 1, y + 1, 3, 1, mix(c, r.dark, 0.25));
  }
  px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), 0xffffff);
}

function texMarsh(px: Px, rnd: Rnd, tone: number): void {
  const r = RAMPS.marsh;
  const c = toneColor(r, tone);
  fill(px, c);
  grain(px, rnd, mix(c, r.dark, 0.4), 4);
  grain(px, rnd, mix(c, r.light, 0.3), 2);
}

/** Flaque de marais : eau sombre, reflet du ciel en haut à gauche. */
function puddle(px: Px, x: number, y: number, r: Ramp): void {
  const water = mix(P.ardoise, r.deep, 0.45);
  px.rect(x, y, 6, 2, water);
  px.rect(x + 1, y - 1, 4, 1, water);
  px.rect(x + 1, y + 2, 4, 1, mix(water, r.dark, 0.4));
  px.set(x + 1, y, mix(P.ciel, water, 0.35));
  px.set(x + 2, y, mix(P.ecume, P.lumiereChaude, 0.3));
  px.rect(x + 1, y - 2, 4, 1, mix(r.base, r.dark, 0.6));
}

/* Pavés : cellules de Voronoï sur une trame de 32 px (raccords invisibles), usés au centre des places. */
interface Stone {
  readonly x: number;
  readonly y: number;
  readonly shade: number;
}
const STONES: readonly Stone[] = (() => {
  const rnd = mulberry32(hashString('cobble-stones'));
  const out: Stone[] = [];
  const step = 6.4; // 5 × 5 pierres par période
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      out.push({ x: (i + 0.5 + (rnd() - 0.5) * 0.7 + (j % 2) * 0.35) * step, y: (j + 0.5 + (rnd() - 0.5) * 0.55) * step, shade: rnd() });
    }
  }
  return out;
})();

/** Pierre la plus proche et écart à la deuxième (en px) au point (wx, wy) du monde. */
function nearestStone(wx: number, wy: number): { id: number; gap: number } {
  let best = Infinity;
  let second = Infinity;
  let id = 0;
  STONES.forEach((s, i) => {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const dx = wrap(wx) + 0.5 - (s.x + ox * PERIOD);
        const dy = (wrap(wy) + 0.5 - (s.y + oy * PERIOD)) * 1.15;
        const d = Math.hypot(dx, dy);
        if (d < best) {
          second = best;
          best = d;
          id = i;
        } else if (d < second) second = d;
      }
    }
  });
  return { id, gap: second - best };
}

function texCobble(px: Px, rnd: Rnd, phase: number, wear: number): void {
  const r = RAMPS.stone;
  const ox = (phase & 1) * T;
  const oy = (phase >> 1) * T;
  const grout = wear === 0 ? mix(r.dark, RAMPS.grass.deep, 0.25) : mix(r.dark, r.base, wear === 2 ? 0.35 : 0.1);
  const ids: number[] = [];
  const gaps: number[] = [];
  for (let y = -1; y <= T; y++) {
    for (let x = -1; x <= T; x++) {
      const s = nearestStone(ox + x, oy + y);
      ids.push(s.id);
      gaps.push(s.gap);
    }
  }
  const at = (x: number, y: number): number => (y + 1) * (T + 2) + (x + 1);
  const isGrout = (x: number, y: number): boolean => (gaps[at(x, y)] as number) < (wear === 2 ? 0.9 : 1.25);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (isGrout(x, y)) {
        px.set(x, y, grout);
        continue;
      }
      const stone = STONES[ids[at(x, y)] as number] as Stone;
      // Plus la place est usée, plus les pierres sont claires et lisses.
      let c = stone.shade < 0.33 ? mix(r.base, r.dark, 0.3) : stone.shade < 0.7 ? r.base : mix(r.base, r.light, 0.4);
      c = mix(c, r.light, wear * 0.12);
      const lit = isGrout(x - 1, y) || isGrout(x, y - 1);
      const dark = isGrout(x + 1, y) || isGrout(x, y + 1);
      if (lit && !dark) c = mix(c, r.hi, wear === 2 ? 0.3 : 0.5);
      else if (dark && !lit) c = mix(c, SHADE, wear === 2 ? 0.18 : 0.3);
      px.set(x, y, c);
    }
  }
  // Mousse dans les joints au bord des places.
  if (wear === 0) {
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rnd() * T);
      const y = Math.floor(rnd() * T);
      if (isGrout(x, y)) px.set(x, y, RAMPS.grass.dark);
    }
  }
}

function texPlanks(px: Px, rnd: Rnd, deco: number): void {
  const r = RAMPS.wood;
  fill(px, r.dark);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const color = rnd() < 0.5 ? r.base : r.light;
    px.rect(0, y, T, 3, color);
    px.rect(0, y, T, 1, r.hi);
    px.rect(0, y + 3, T, 1, r.deep);
    const seam = (row * 7 + deco * 5) % T;
    px.rect(seam, y, 1, 3, r.deep);
    px.set((seam + 2) % T, y + 1, r.deep); // clou
  }
}

function texRuins(px: Px, rnd: Rnd, deco: number): void {
  const r = RAMPS.ruin;
  fill(px, r.dark);
  // Dalles irrégulières 8×8 avec fissures et mousse.
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      px.rect(tx * 8 + 1, ty * 8 + 1, 7, 7, rnd() < 0.5 ? r.base : mix(r.base, r.light, 0.5));
      px.rect(tx * 8 + 1, ty * 8 + 1, 7, 1, r.hi);
      px.rect(tx * 8 + 1, ty * 8 + 7, 7, 1, mix(r.base, SHADE, 0.25));
    }
  }
  let x = 2 + Math.floor(rnd() * 11);
  let y = Math.floor(rnd() * 5);
  for (let i = 0; i < 6; i++) {
    px.set(x, y, r.deep);
    x += rnd() < 0.4 ? 1 : 0;
    y += 1;
  }
  if (deco % 2 === 1) {
    speckle(px, rnd, 0, 0, T, T, RAMPS.grass.dark, 4);
    speckle(px, rnd, 0, 0, T, T, RAMPS.grass.base, 3);
  }
}

function texPond(px: Px, rnd: Rnd, deco: number): void {
  const r = RAMPS.pond;
  fill(px, r.base);
  speckle(px, rnd, 0, 0, T, T, r.dark, 5);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 12);
    const y = 1 + Math.floor(rnd() * 14);
    px.rect(x, y, 3 + Math.floor(rnd() * 2), 1, r.light);
  }
  if (deco === 2) {
    const x = 3 + Math.floor(rnd() * 9);
    const y = 3 + Math.floor(rnd() * 9);
    px.rect(x, y, 3, 2, RAMPS.grass.dark);
    px.set(x + 1, y, RAMPS.grass.base);
    px.set(x + 2, y + 1, ACCENT.flowerWhite);
  }
}

/** Texture d'un sol plein (sans décor) : base de la composition. */
function paintTexture(px: Px, rnd: Rnd, kind: GroundKind, tone: number, spec: GroundSpec): void {
  switch (kind) {
    case 'grass':
      return texGrass(px, rnd, tone);
    case 'forest':
      return texForest(px, rnd, tone);
    case 'dirt':
      return texEarth(px, rnd, tone, DIRT_RAMP);
    case 'road':
      return texEarth(px, rnd, tone, ROAD_RAMP);
    case 'sand':
      return texSand(px, rnd, tone);
    case 'rock':
      return texRock(px, rnd, tone);
    case 'snow':
      return texSnow(px, rnd, tone);
    case 'marsh':
      return texMarsh(px, rnd, tone);
    case 'cobble':
      return texCobble(px, rnd, spec.phase, spec.kind === 'cobble' ? spec.wear : 1);
    case 'ruins':
      return texRuins(px, rnd, spec.kind === 'ruins' ? spec.deco : 0);
    case 'planks':
      return texPlanks(px, rnd, spec.deco);
    case 'pond':
      return texPond(px, rnd, spec.deco);
    case 'field':
      paintFieldSoil(px, spec.deco);
      return;
  }
}

/* ---------- Petits décors du sol ---------- */

/** Touffe d'herbe en éventail (lumière en haut à gauche, ombre violette à droite). `big` : herbe haute. */
function tuft(px: Px, x: number, y: number, r: Ramp, big: boolean): void {
  const dark = r.dark;
  const mid = mix(r.base, r.light, 0.3);
  const tip = r.hi;
  px.set(x + 1, y + 1, mix(r.dark, SHADE, 0.35)); // ombre au pied
  px.set(x, y, dark);
  px.set(x - 1, y, dark);
  px.set(x + 1, y, dark);
  px.set(x - 1, y - 1, mid);
  px.set(x, y - 1, dark);
  px.set(x + 1, y - 1, mid);
  px.set(x - 2, y - 2, tip);
  px.set(x, y - 2, mid);
  px.set(x + 2, y - 2, mid);
  if (big) {
    px.set(x + 2, y, dark);
    px.set(x - 2, y - 1, mid);
    px.set(x + 2, y - 1, dark);
    px.set(x, y - 3, tip);
    px.set(x - 1, y - 3, tip);
    px.set(x + 3, y - 3, mid);
    px.set(x + 2, y + 1, mix(r.dark, SHADE, 0.35));
  }
}

function pebble(px: Px, x: number, y: number, r: Ramp): void {
  px.set(x, y, r.hi);
  px.set(x + 1, y, r.light);
  px.set(x, y + 1, r.base);
  px.set(x + 1, y + 1, r.dark);
  px.set(x + 2, y + 1, mix(r.dark, SHADE, 0.5));
}

function flower(px: Px, x: number, y: number, petal: number, heart: number): void {
  px.set(x, y - 1, petal);
  px.set(x - 1, y, petal);
  px.set(x + 1, y, petal);
  px.set(x, y + 1, mix(petal, SHADE, 0.3));
  px.set(x, y, heart);
  px.set(x + 1, y + 2, RAMPS.grass.dark);
}

/** Vrai si tout le rectangle est du sol `kind` (les décors ne débordent pas sur un autre sol). */
type KindAt = (x: number, y: number) => GroundKind;
function clear(kindAt: KindAt, kind: GroundKind, x0: number, y0: number, x1: number, y1: number): boolean {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x < 0 || y < 0 || x >= T || y >= T || kindAt(x, y) !== kind) return false;
  return true;
}

function decorate(px: Px, rnd: Rnd, spec: GroundSpec, kindAt: KindAt): void {
  const kind = spec.kind;
  if (kind === 'water') return;
  const r = rampOf(kind);
  const spot = (w: number, h: number, tries = 6): [number, number] | null => {
    for (let i = 0; i < tries; i++) {
      const x = 2 + Math.floor(rnd() * (T - 4));
      const y = 3 + Math.floor(rnd() * (T - 4));
      if (clear(kindAt, kind, x - w, y - h, x + w, y + 1)) return [x, y];
    }
    return null;
  };
  const d = spec.deco;
  if (d === 0) return;
  if (kind === 'marsh') {
    if (d === 1) {
      const p = spot(4, 3);
      if (p) puddle(px, p[0] - 3, p[1] - 1, r);
    } else {
      for (let i = 0; i < 2; i++) {
        const p = spot(3, 3);
        if (p) tuft(px, p[0], p[1], RAMPS.grass, i === 0);
      }
    }
    return;
  }
  if (kind === 'rock') {
    const p = spot(4, 4);
    if (p) slab(px, p[0] - 3, p[1] - 3, 5 + Math.floor(rnd() * 2), px.colorAt(p[0], p[1]), r);
    if (d === 2) {
      const q = spot(2, 1);
      if (q) pebble(px, q[0], q[1], RAMPS.rock);
      let x = 2 + Math.floor(rnd() * 11);
      let y = 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < 6 && kindAt(Math.min(T - 1, x), Math.min(T - 1, y)) === 'rock'; i++) {
        px.set(x, y, mix(r.deep, SHADE, 0.3));
        x += rnd() < 0.4 ? 1 : 0;
        y += 1;
      }
    }
    return;
  }
  if (kind === 'grass') {
    if (d === 1) {
      const p = spot(2, 2);
      if (p) tuft(px, p[0], p[1], r, false);
    } else if (d === 2) {
      // Touffes groupées : herbe haute.
      for (let i = 0; i < 3; i++) {
        const p = spot(3, 3);
        if (p) tuft(px, p[0], p[1], r, i < 2);
      }
    } else if (d === 3) {
      const colors = [ACCENT.flowerYellow, ACCENT.flowerWhite, ACCENT.flowerRed, mix(P.violetPale, P.ciel, 0.3)];
      const petal = colors[Math.floor(rnd() * colors.length)] as number;
      for (let i = 0; i < 3; i++) {
        const p = spot(1, 1);
        if (p) flower(px, p[0], p[1], i === 2 ? (colors[Math.floor(rnd() * colors.length)] as number) : petal, P.lumiereDoree);
      }
      const p = spot(2, 2);
      if (p) tuft(px, p[0], p[1], r, false);
    } else {
      const p = spot(2, 1);
      if (p) pebble(px, p[0], p[1], RAMPS.rock);
    }
  } else if (kind === 'forest') {
    if (d === 1) {
      const p = spot(2, 2);
      if (p) tuft(px, p[0], p[1], r, false);
    } else if (d === 2) {
      // Tapis de feuilles mortes.
      for (let i = 0; i < 7; i++) {
        const p = spot(0, 0);
        if (p) px.set(p[0], p[1], rnd() < 0.5 ? RAMPS.foliageAutumn.base : RAMPS.foliageAutumn.dark);
      }
    } else {
      const p = spot(1, 2);
      if (p) {
        // Champignon.
        px.set(p[0], p[1] - 1, ACCENT.flowerRed);
        px.set(p[0] + 1, p[1] - 1, mix(ACCENT.flowerRed, SHADE, 0.3));
        px.set(p[0] - 1, p[1] - 1, P.lumiereChaude);
        px.set(p[0], p[1], P.parchemin);
        px.set(p[0] + 1, p[1], mix(r.dark, SHADE, 0.4));
      }
    }
  } else if (kind === 'dirt' || kind === 'road' || kind === 'sand') {
    const n = d;
    for (let i = 0; i < n; i++) {
      const p = spot(2, 1);
      if (p) pebble(px, p[0], p[1], RAMPS.stone);
    }
    if (kind === 'sand' && d === 2) {
      const p = spot(1, 1);
      if (p) {
        px.set(p[0], p[1], ACCENT.flowerWhite);
        px.set(p[0] + 1, p[1], P.parchemin);
        px.set(p[0], p[1] + 1, mix(r.dark, SHADE, 0.3));
      }
    }
  } else if (kind === 'snow') {
    px.set(Math.floor(rnd() * T), Math.floor(rnd() * T), ACCENT.cyan);
  }
}

/* ---------- Composition ---------- */

/** Sol et ton de chaque pixel de la tuile (bordure de 1 px comprise). */
interface Composite {
  readonly kinds: GroundKind[];
  readonly tones: number[];
  /** Pixel d'eau (la tuile y est transparente : l'eau animée du jeu apparaît dessous). */
  readonly water: boolean[];
}

const W2 = T + 2;
const ci = (x: number, y: number): number => (y + 1) * W2 + (x + 1);

/** Interpolation bilinéaire des 5 × 5 échantillons (tous les 4 px) au centre du pixel (x, y). */
function field(samples: readonly number[], x: number, y: number): number {
  const fx = Math.min(4, Math.max(0, (x + 0.5) / 4));
  const fy = Math.min(4, Math.max(0, (y + 0.5) / 4));
  const x0 = Math.min(3, Math.floor(fx));
  const y0 = Math.min(3, Math.floor(fy));
  const tx = fx - x0;
  const ty = fy - y0;
  const s = (i: number, j: number): number => samples[j * 5 + i] as number;
  const a = s(x0, y0) * (1 - tx) + s(x0 + 1, y0) * tx;
  const b = s(x0, y0 + 1) * (1 - tx) + s(x0 + 1, y0 + 1) * tx;
  return (a * (1 - ty) + b * ty) / SAMPLE_STEPS;
}

function compose(spec: GroundSpec): Composite {
  const ox = (spec.phase & 1) * T;
  const oy = (spec.phase >> 1) * T;
  const kinds: GroundKind[] = [];
  const tones: number[] = [];
  const water: boolean[] = [];
  for (let y = -1; y <= T; y++) {
    for (let x = -1; x <= T; x++) {
      let kind: GroundKind = spec.base;
      let best = -Infinity;
      let wetScore = -Infinity;
      for (const l of spec.layers) {
        const v = field(l.f, x, y) * (LAYER_GAIN[l.layer] ?? 1) + EDGE_AMPLITUDE[l.layer] * sample(noiseOf(`edge:${l.layer}`), ox + x, oy + y);
        if (l.layer === 'water') wetScore = v;
        else if (v > best) {
          best = v;
          kind = l.layer;
        }
      }
      // Ton : 0 à 2, frontières à 2/3 et 4/3 (le bruit les fait onduler).
      const t = 2 * field(spec.tone, x, y) + TONE_AMPLITUDE * 2 * sample(noiseOf('tone'), ox + x, oy + y);
      kinds.push(kind);
      tones.push(t < 2 / 3 ? 0 : t > 4 / 3 ? 2 : 1);
      water.push(wetScore > best);
    }
  }
  return { kinds, tones, water };
}

/** Ornières : deux sillons qui ondulent doucement le long de la route (continus d'une case à l'autre). */
function paintRut(px: Px, spec: GroundSpec, kindAt: KindAt): void {
  const rut = spec.rut;
  if (!rut) return;
  const r = ROAD_RAMP;
  const ox = (spec.phase & 1) * T;
  const oy = (spec.phase >> 1) * T;
  const base = rut.lane === 0 ? 9 : 5;
  for (let i = 0; i < T; i++) {
    const along = rut.axis === 'h' ? ox + i : oy + i;
    const wave = Math.round(0.6 * Math.sin((2 * Math.PI * wrap(along)) / PERIOD + (rut.lane ? 1.3 : 0)));
    const across = base + wave;
    const put = (offset: number, color: (c: number) => number): void => {
      const x = rut.axis === 'h' ? i : across + offset;
      const y = rut.axis === 'h' ? across + offset : i;
      if (x < 0 || y < 0 || x >= T || y >= T || kindAt(x, y) !== 'road') return;
      px.set(x, y, color(px.colorAt(x, y)));
    };
    put(-1, (c) => mix(c, r.light, 0.35));
    put(0, (c) => mix(c, SHADE, 0.38));
    put(1, (c) => mix(c, r.dark, 0.3));
  }
}

/**
 * Relief des bords : un sol plus haut (l'herbe au-dessus d'un chemin) projette
 * une ombre douce vers le bas et la droite, son rebord s'assombrit, et des
 * brins d'herbe folle débordent sur le chemin.
 */
function paintEdges(px: Px, rnd: Rnd, comp: Composite): void {
  const kindAt = (x: number, y: number): GroundKind => comp.kinds[ci(x, y)] as GroundKind;
  const edits: [number, number, number][] = [];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const k = kindAt(x, y);
      if (HARD_KINDS.has(k)) continue;
      const h = GROUND_HEIGHT[k];
      const c = px.colorAt(x, y);
      const up = kindAt(x, y - 1);
      const left = kindAt(x - 1, y);
      const down = kindAt(x, y + 1);
      const upHigher = GROUND_HEIGHT[up] > h && !HARD_KINDS.has(up);
      const leftHigher = GROUND_HEIGHT[left] > h && !HARD_KINDS.has(left);
      if (upHigher || leftHigher) {
        const grassy = (up === 'grass' || up === 'forest' || up === 'marsh') && upHigher;
        if (grassy && rnd() < 0.3) edits.push([x, y, rampOf(up).dark]); // brin d'herbe folle
        else edits.push([x, y, mix(c, SHADE, upHigher ? 0.3 : 0.2)]);
        continue;
      }
      if (GROUND_HEIGHT[down] < h && !HARD_KINDS.has(down)) edits.push([x, y, mix(c, rampOf(k).dark, 0.5)]);
      else if (GROUND_HEIGHT[kindAt(x, y - 1)] < h && !HARD_KINDS.has(up)) edits.push([x, y, mix(c, SUN, 0.18)]);
    }
  }
  for (const [x, y, c] of edits) px.set(x, y, c);
}

/** Sol uni, sans transition ni rivage (référence des tests et des aperçus). */
export function plainSpec(kind: GroundKind, deco: number, tone = 1): GroundSpec {
  return { kind, deco, base: kind, layers: [], tone: new Array<number>(25).fill(tone * 8), phase: 0, rut: null, wear: 1 };
}

/** Sol à bords nets (champ, quai) : la texture couvre toute la case. */
export function paintHardGround(px: Px, rnd: Rnd, kind: GroundKind, deco: number): void {
  paintTexture(px, rnd, kind, 1, plainSpec(kind, deco));
}

function paintComposite(px: Px, rnd: Rnd, spec: GroundSpec): Composite {
  const comp = compose(spec);
  const kindAt: KindAt = (x, y) => comp.kinds[ci(x, y)] as GroundKind;
  // Une texture par (sol, ton) présent, peinte une seule fois puis découpée pixel par pixel.
  const textures = new Map<string, Px>();
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (comp.water[ci(x, y)]) continue;
      const k = kindAt(x, y);
      const tone = comp.tones[ci(x, y)] as number;
      const key = `${k}:${tone}`;
      let tex = textures.get(key);
      if (!tex) {
        tex = new Px(T, T);
        paintTexture(tex, mulberry32(hashString(`tex:${key}:${spec.phase}:${spec.deco}`)), k, tone, spec);
        textures.set(key, tex);
      }
      px.copy(tex, x, y, 1, 1, x, y);
    }
  }
  paintRut(px, spec, kindAt);
  decorate(px, rnd, spec, kindAt);
  paintEdges(px, rnd, comp);
  return comp;
}

/* ---------- Rivages ---------- */

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

/**
 * Berge en courbe : l'eau découpe la tuile (pixels transparents), la terre qui
 * la borde montre un talus (face de terre sous l'herbe quand l'eau est en
 * dessous, liseré sombre ailleurs) et l'écume borde l'eau.
 */
function paintShore(px: Px, rnd: Rnd, comp: Composite): void {
  if (!comp.water.some(Boolean)) return;
  const clamp = (v: number): number => Math.max(-1, Math.min(T, v));
  const wet = (x: number, y: number): boolean => comp.water[ci(clamp(x), clamp(y))] === true;
  const edits: [number, number, number, number][] = [];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (wet(x, y)) {
        const touching = !wet(x - 1, y) || !wet(x + 1, y) || !wet(x, y - 1) || !wet(x, y + 1);
        const near = !wet(x - 2, y) || !wet(x + 2, y) || !wet(x, y - 2) || !wet(x, y + 2);
        if (touching && rnd() < 0.85) edits.push([x, y, ACCENT.foam, 150 + Math.floor(rnd() * 80)]);
        else if (near && rnd() < 0.3) edits.push([x, y, ACCENT.foam, 90]);
        else edits.push([x, y, 0, 0]);
        continue;
      }
      const k = comp.kinds[ci(x, y)] as GroundKind;
      const bank = bankColor(k);
      const earth = k === 'sand' ? ACCENT.wet : mix(DIRT_RAMP.dark, SHADE, 0.2);
      const c = px.colorAt(x, y);
      if (wet(x, y + 1)) edits.push([x, y, bank, 255]); // pied du talus, au ras de l'eau
      else if (wet(x, y + 2)) edits.push([x, y, earth, 255]); // face de terre éclairée de biais
      else if (wet(x - 1, y) || wet(x + 1, y) || wet(x, y - 1)) edits.push([x, y, mix(bank, c, 0.25), 255]);
      else if (k === 'sand' && (wet(x, y + 3) || wet(x - 2, y) || wet(x + 2, y))) edits.push([x, y, mix(c, ACCENT.wet, 0.5), 255]);
    }
  }
  for (const [x, y, color, alpha] of edits) px.set(x, y, color, alpha);
}

export function paintGround(px: Px, rnd: Rnd, spec: GroundSpec): void {
  const comp = paintComposite(px, rnd, spec);
  paintShore(px, rnd, comp);
}

/* ---------- Tuiles d'eau et de passage ---------- */

/** Eau libre : transparente (l'eau animée est dessinée par le jeu derrière la couche de sol). */
export function paintClear(_px: Px): void {
  /* rien : tuile transparente */
}

/** Voile sombre en damier tramé : la mer s'assombrit loin des côtes (niveau 1 à 3). */
export function paintDeepWater(px: Px, level: number): void {
  const density = [0, 0.2, 0.38, 0.55][level] as number;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const threshold = ((BAYER[(y % 4) * 4 + (x % 4)] as number) + 0.5) / 16;
      if (density > threshold) px.set(x, y, P.ombreProfonde, 110);
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
