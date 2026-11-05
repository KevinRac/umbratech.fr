/**
 * Carte de l'île (jalon M10, décision n°233) : un parchemin peint par code
 * d'après la carte du monde (terrain de chaque case), sans DOM ni Phaser
 * (calcul pur, testé). Les zones encore jamais visitées restent dans le
 * brouillard : du papier hachuré, seul le trait de côte se devine.
 *
 * Chaque case du monde devient un carré de `cell` pixels. Les repères (lieux,
 * héros) sont posés par la scène par-dessus, avec `cellCenter`.
 */
import type { WorldMap } from '../data/worldMap';
import { mixColor, PALETTE as P } from './palette';

export interface IslandMapImage {
  readonly width: number;
  readonly height: number;
  /** Couleur 0xRRGGBB de chaque pixel (jamais transparent). */
  readonly pixels: Int32Array;
}

export interface IslandMapInput {
  readonly map: WorldMap;
  /** Valeurs (`zones.json › value`) des zones visitées. */
  readonly discoveredZones: ReadonlySet<number>;
  /** Taille d'une case du monde sur la carte, en pixels (entier ≥ 2). */
  readonly cell: number;
}

type Ground = 'eau' | 'profond' | 'plage' | 'plaine' | 'foret' | 'montagne' | 'marais' | 'route' | 'habite' | 'toit' | 'ruines';

/** Terrain du jeu → encre de la carte. */
const GROUND_OF: Readonly<Record<string, Ground>> = {
  riviere: 'eau',
  eau_profonde: 'profond',
  gue: 'route',
  pont: 'route',
  route: 'route',
  plage: 'plage',
  plaine: 'plaine',
  foret: 'foret',
  ronces: 'foret',
  montagne: 'montagne',
  marais: 'marais',
  village: 'habite',
  batiment: 'toit',
  obstacle: 'plaine',
  ruines: 'ruines',
};

const PAPER = mixColor(P.ocreClair, P.parchemin, 0.55);
const PAPER_DARK = mixColor(PAPER, P.terreSeche, 0.35);
const INK = mixColor(P.terreSombre, P.ombreViolette, 0.35);

const COLORS: Readonly<Record<Ground, number>> = {
  eau: mixColor(PAPER, P.ardoise, 0.58),
  profond: mixColor(PAPER, P.ardoise, 0.72),
  plage: mixColor(PAPER, P.sable, 0.55),
  plaine: mixColor(PAPER, P.oliveClair, 0.45),
  foret: mixColor(PAPER, P.olive, 0.62),
  montagne: mixColor(PAPER, P.grisRoux, 0.5),
  marais: mixColor(PAPER, P.oliveSombre, 0.45),
  route: mixColor(PAPER, P.terreSeche, 0.55),
  habite: mixColor(PAPER, P.pierre, 0.5),
  toit: mixColor(PAPER, P.terreCuite, 0.6),
  ruines: mixColor(PAPER, P.grisRoux, 0.4),
};

const isWater = (g: Ground | null): boolean => g === 'eau' || g === 'profond';

function hash(x: number, y: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Centre d'une case du monde (en cases) sur l'image de la carte, en pixels. */
export function cellCenter(cell: number, tx: number, ty: number): { x: number; y: number } {
  return { x: tx * cell + Math.floor(cell / 2), y: ty * cell + Math.floor(cell / 2) };
}

export function paintIslandMap(input: IslandMapInput): IslandMapImage {
  const { map, cell } = input;
  const W = map.width * cell;
  const H = map.height * cell;
  const px = new Int32Array(W * H);
  const ground: (Ground | null)[] = new Array(map.width * map.height);
  const fogged: boolean[] = new Array(map.width * map.height);
  for (let i = 0; i < map.width * map.height; i++) {
    const terrain = map.terrainByGid.get(map.ground[i] as number) ?? 'plaine';
    ground[i] = GROUND_OF[terrain] ?? 'plaine';
    const zone = map.zones[i] as number;
    fogged[i] = zone !== 0 && !input.discoveredZones.has(zone);
  }
  const at = (tx: number, ty: number): Ground | null => (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height ? 'profond' : (ground[ty * map.width + tx] ?? null));

  for (let y = 0; y < H; y++) {
    const ty = Math.floor(y / cell);
    const iy = y - ty * cell;
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / cell);
      const ix = x - tx * cell;
      const i = ty * map.width + tx;
      const g = ground[i] as Ground;
      // Papier : larges taches de 3 tons (jamais de grain pixel par pixel).
      const blot = hash(Math.floor(x / 9), Math.floor(y / 9));
      let c: number;
      if (fogged[i] && !isWater(g)) {
        // Brouillard : papier un peu plus sombre, hachures diagonales légères.
        c = mixColor(PAPER, PAPER_DARK, 0.25 + blot * 0.15);
        if ((x + y) % 6 === 0) c = mixColor(c, INK, 0.18);
      } else {
        c = COLORS[g];
        if (blot > 0.72) c = mixColor(c, P.parchemin, 0.12);
        else if (blot < 0.2) c = mixColor(c, PAPER_DARK, 0.12);
        if (g === 'foret' && hash(tx * 3 + (ix >> 1), ty * 3 + (iy >> 1)) > 0.55 && (ix + iy) % 2 === 0) c = mixColor(c, P.oliveSombre, 0.6);
        else if (g === 'montagne' && (ix + 2 * (iy % 2)) % cell === 0 && iy < cell - 1) c = mixColor(c, INK, 0.45);
        else if (g === 'marais' && hash(x, y) > 0.86) c = mixColor(c, P.violetPale, 0.6);
        else if (isWater(g) && (y % 5 === 0) && hash(Math.floor(x / 4), y) > 0.55) c = mixColor(c, P.ecume, 0.35);
        else if (g === 'toit') c = iy === 0 ? mixColor(c, P.lumiereChaude, 0.3) : iy === cell - 1 ? mixColor(c, INK, 0.35) : c;
      }
      // Trait de côte : le bord d'une case de terre qui touche l'eau (deviné sous le brouillard).
      if (!isWater(g)) {
        const edge =
          (ix === 0 && isWater(at(tx - 1, ty))) ||
          (ix === cell - 1 && isWater(at(tx + 1, ty))) ||
          (iy === 0 && isWater(at(tx, ty - 1))) ||
          (iy === cell - 1 && isWater(at(tx, ty + 1)));
        if (edge) c = mixColor(c, INK, fogged[i] ? 0.35 : 0.7);
      }
      // Bords du parchemin brunis.
      const border = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (border < 14) c = mixColor(c, P.terreSombre, ((14 - border) / 14) ** 2 * 0.55);
      px[y * W + x] = c;
    }
  }
  return { width: W, height: H, pixels: px };
}
