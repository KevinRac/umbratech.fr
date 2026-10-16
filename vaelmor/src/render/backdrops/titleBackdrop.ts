/**
 * Décor procédural de l'écran titre : la Citadelle Engloutie sous la lune,
 * vue depuis une falaise de la côte ouest. Placeholder « de qualité » (GDD
 * §12.7) : tout est dessiné pixel par pixel à la palette globale, sans asset
 * externe, et sera remplacé par une illustration dessinée plus tard.
 */
import type Phaser from 'phaser';
import { TITLE_HEIGHT as GAME_HEIGHT, TITLE_WIDTH as GAME_WIDTH } from '../../core/config';
import { Rng } from '../../logic/rng';
import { PALETTE, mixColor } from '../palette';
import { PixelCanvas, bayer, tileableNoise2D, valueNoise1D, type GradientStop } from '../pixelCanvas';

export const HORIZON_Y = 172;
export const MOON = { x: 404, y: 46, r: 13 } as const;
export const SEA_FRAMES = 3;

/** Positions (repère écran) des éléments animés posés par la scène. */
export const CLIFF = { x: 0, y: 150, width: 236, height: GAME_HEIGHT - 150 } as const;
export const LANTERN = { x: 118, y: 185 } as const;
export const HERO = { x: 152, y: 182 } as const;
export const CITADEL_WINDOWS: readonly (readonly [number, number])[] = [
  [304, 140],
  [314, 137],
  [326, 143],
  [316, 114],
  [341, 120],
  [293, 126],
];

export const TEX = {
  sky: 'title:sky',
  sea: (i: number) => `title:sea${i}`,
  cliff: 'title:cliff',
  mist: 'title:mist',
  clouds: 'title:clouds',
  halo: 'title:halo',
  hero: (i: number) => `title:hero${i}`,
  px1: 'px:1',
  px2: 'px:2',
} as const;

const SKY_STOPS: readonly GradientStop[] = [
  { at: 0, color: PALETTE.nuit },
  { at: 0.4, color: PALETTE.nuitBleue },
  { at: 0.72, color: PALETTE.bleuNuit },
  { at: 0.9, color: mixColor(PALETTE.bleuNuit, PALETTE.violetBrume, 0.5) },
  { at: 1, color: PALETTE.violetBrume },
];

const SILHOUETTE = 0x1a1530;
const SILHOUETTE_RIM = 0x3a2f58;
const CLIFF_DARK = 0x0e0d18;
const CLIFF_MID = 0x1c1830;
const CLIFF_RIM = 0x3d3358;

function skyColorAt(x: number, y: number): number {
  return PixelCanvas.ditheredColor(SKY_STOPS, y / (HORIZON_Y - 1), x, y);
}

/** Silhouette de la Citadelle : vrai si le pixel (x, y) est dans la pierre. */
function inCitadel(x: number, y: number): boolean {
  if (y >= HORIZON_Y) return false;
  // Remparts bas, percés d'arches à demi noyées.
  if (x >= 280 && x <= 358 && y >= 152) {
    const archCenters = [290, 306, 322, 338, 352];
    for (const cx of archCenters) {
      const dx = x - cx;
      if (Math.abs(dx) <= 4 && y >= 160 - Math.round(Math.sqrt(Math.max(0, 16 - dx * dx)))) return false;
    }
    return true;
  }
  // Créneaux du rempart.
  if (x >= 280 && x <= 358 && y >= 149 && y < 152) return x % 4 < 2;
  // Donjon central avec créneaux.
  if (x >= 300 && x <= 332 && y >= 128) return true;
  if (x >= 300 && x <= 332 && y >= 125) return (x - 300) % 5 < 3;
  // Tour gauche et toit conique.
  if (x >= 289 && x <= 298 && y >= 118) return true;
  if (y >= 100 && y < 118) {
    const half = ((y - 100) / 18) * 6;
    if (Math.abs(x - 293.5) <= half) return true;
  }
  // Flèche centrale.
  if (x >= 312 && x <= 320 && y >= 106) return true;
  if (y >= 82 && y < 106) {
    const half = ((y - 82) / 24) * 5;
    if (Math.abs(x - 316) <= half) return true;
  }
  // Tour droite, brisée en dents de scie.
  if (x >= 336 && x <= 347) {
    const broken = 104 + [0, 3, 1, 6, 4, 9, 7, 11, 8, 13, 10, 15][x - 336]!;
    if (y >= broken) return true;
  }
  return false;
}

function paintSky(scene: Phaser.Scene): void {
  const c = new PixelCanvas(GAME_WIDTH, GAME_HEIGHT);
  for (let y = 0; y < GAME_HEIGHT; y++) for (let x = 0; x < GAME_WIDTH; x++) c.set(x, y, skyColorAt(x, Math.min(y, HORIZON_Y - 1)));

  // Halo lunaire tramé.
  const haloR = 30;
  for (let y = MOON.y - haloR; y <= MOON.y + haloR; y++) {
    for (let x = MOON.x - haloR; x <= MOON.x + haloR; x++) {
      const d = Math.hypot(x - MOON.x, y - MOON.y);
      if (d <= MOON.r || d > haloR) continue;
      const t = 1 - (d - MOON.r) / (haloR - MOON.r);
      if (t * t * 0.9 > bayer(x, y)) c.set(x, y, mixColor(skyColorAt(x, y), PALETTE.violetPale, 0.55));
    }
  }

  // Étoiles fixes, plus rares près de l'horizon.
  const rng = Rng.fromSeed('vaelmor:titre:etoiles');
  for (let i = 0; i < 90; i++) {
    const x = rng.int(0, GAME_WIDTH - 1);
    const y = Math.floor(Math.pow(rng.next(), 1.6) * (HORIZON_Y - 40));
    if (Math.hypot(x - MOON.x, y - MOON.y) < haloR + 2) continue;
    c.set(x, y, mixColor(skyColorAt(x, y), PALETTE.ecume, 0.25 + rng.next() * 0.45));
  }

  // Lune : disque, ombrage tramé du côté opposé à la lumière, cratères.
  for (let y = -MOON.r; y <= MOON.r; y++) {
    for (let x = -MOON.r; x <= MOON.r; x++) {
      const d2 = x * x + y * y;
      if (d2 > MOON.r * MOON.r + MOON.r * 0.6) continue;
      const shade = (x + y * 0.6) / MOON.r; // > 0 : côté ombre (bas-droite)
      let color = 0xe9e1cf;
      if (shade > 0.35) color = shade - 0.35 > bayer(x, y) * 0.8 ? PALETTE.pierre : color;
      if (shade > 0.85) color = 0xa99f8c;
      c.set(MOON.x + x, MOON.y + y, color);
    }
  }
  for (const [cx, cy, r] of [
    [-4, -3, 2],
    [3, 4, 3],
    [-2, 6, 1],
    [6, -5, 1],
  ] as const) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) c.set(MOON.x + cx + x, MOON.y + cy + y, 0xc4b9a3);
  }

  // Collines lointaines à gauche de la Citadelle.
  for (let x = 150; x < 286; x++) {
    const h = Math.round(2 + valueNoise1D(x / 14, 7) * 7 + valueNoise1D(x / 5, 3) * 2);
    for (let y = HORIZON_Y - h; y < HORIZON_Y; y++) c.set(x, y, mixColor(PALETTE.nuit, PALETTE.violetBrume, 0.45));
  }

  // Citadelle Engloutie, avec liseré de lune sur les arêtes droites.
  for (let y = 70; y < HORIZON_Y; y++) {
    for (let x = 270; x < 370; x++) {
      if (!inCitadel(x, y)) continue;
      const rim = !inCitadel(x + 1, y) || (!inCitadel(x, y - 1) && (x + y) % 2 === 0);
      c.set(x, y, rim ? SILHOUETTE_RIM : SILHOUETTE);
    }
  }

  c.toTexture(scene, TEX.sky);
}

function paintSea(scene: Phaser.Scene, frame: number): void {
  const h = GAME_HEIGHT - HORIZON_Y;
  const c = new PixelCanvas(GAME_WIDTH, h);
  const stops: readonly GradientStop[] = [
    { at: 0, color: 0x2b2f55 },
    { at: 0.35, color: PALETTE.nuitBleue },
    { at: 1, color: 0x0f1020 },
  ];
  const phase = frame * 1.7;
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const reflectHalf = 6 + y * 0.45;
    const waveScale = 3 + y * 0.18;
    for (let x = 0; x < GAME_WIDTH; x++) {
      let color = PixelCanvas.ditheredColor(stops, t, x, y);
      // Crêtes de vagues : traits horizontaux plus longs vers le premier plan.
      const n = valueNoise1D(x / waveScale + phase + y * 13.1, 101 + y);
      if (y % 2 === 0 && n > 0.8 - t * 0.08) color = mixColor(color, PALETTE.bleuGris, 0.55);
      // Reflet de la lune : colonne de tirets scintillants.
      const dx = Math.abs(x - MOON.x);
      if (dx < reflectHalf && y % 2 === frame % 2) {
        const r = valueNoise1D(x / 2.2 + phase * 2 + y * 5.3, 211 + y);
        const strength = (1 - dx / reflectHalf) * (1 - t * 0.6);
        if (r * (0.35 + strength) > 0.42) color = strength > 0.5 ? 0xe9e1cf : strength > 0.25 ? PALETTE.metalClair : PALETTE.violetPale;
      }
      // Reflet sombre et ondulé de la Citadelle.
      if (y < 34 && y % 2 === 1) {
        const wobble = Math.round(Math.sin(y * 0.9 + frame * 2.1) * 1.5);
        if (inCitadel(x + wobble, HORIZON_Y - 1 - Math.floor(y * 1.3))) color = mixColor(color, SILHOUETTE, 0.7);
      }
      c.set(x, y, color);
    }
  }
  c.toTexture(scene, TEX.sea(frame));
}

/** Hauteur (repère local) du sommet de la falaise en x. */
function cliffTop(x: number): number {
  const plateau = 34 + Math.round(valueNoise1D(x / 9, 41) * 4 + valueNoise1D(x / 3, 43) * 1.5);
  if (x < 168) return plateau - (x < 20 ? Math.round((20 - x) * 0.6) : 0);
  // Chute vers la mer.
  const drop = (x - 168) * (x - 168) * 0.045 + (x - 168) * 0.6;
  return plateau + Math.round(drop + valueNoise1D(x / 2, 47) * 3);
}

function paintCliff(scene: Phaser.Scene): void {
  const c = new PixelCanvas(CLIFF.width, CLIFF.height);
  for (let x = 0; x < CLIFF.width; x++) {
    const top = cliffTop(x);
    for (let y = Math.max(0, top); y < CLIFF.height; y++) {
      const depth = y - top;
      let color = CLIFF_DARK;
      // Face éclairée par la lune (pente droite) et strates de roche.
      if (x > 150 && depth < 30 && (x - 150) / 86 + (30 - depth) / 60 > bayer(x, y) + 0.55) color = CLIFF_MID;
      if (x <= 150 && depth > 3 && depth < 9 && (x + depth * 3) % 23 < 2) color = CLIFF_MID;
      if (depth === 0) color = CLIFF_RIM;
      if (depth === 1 && x % 3 !== 0) color = CLIFF_MID;
      c.set(x, y, color);
    }
    // Herbes hautes sur le plateau.
    if (x < 165 && x % 2 === 0) {
      const blade = Math.floor(valueNoise1D(x * 0.7, 59) * 4);
      for (let k = 1; k <= blade; k++) c.set(x + (k === blade && x % 4 === 0 ? 1 : 0), top - k, k === blade ? CLIFF_MID : CLIFF_DARK);
    }
  }
  // Poteau de lanterne (la lanterne et sa lumière sont posées par la scène).
  const lx = LANTERN.x - CLIFF.x;
  const ly = LANTERN.y - CLIFF.y;
  const groundY = cliffTop(lx - 6);
  c.fillRect(lx - 7, ly - 6, 2, groundY - (ly - 6) + 1, CLIFF_DARK);
  c.fillRect(lx - 7, ly - 7, 8, 2, CLIFF_DARK);
  c.set(lx - 1, ly - 5, CLIFF_DARK);
  // Lanterne : cadre sombre, cœur chaud.
  c.fillRect(lx - 2, ly - 4, 5, 7, CLIFF_DARK);
  c.fillRect(lx - 1, ly - 3, 3, 5, PALETTE.braise);
  c.set(lx, ly - 2, 0xfff1c9);
  c.set(lx, ly - 1, 0xfff1c9);
  c.toTexture(scene, TEX.cliff);
}

/** Silhouette encapuchonnée du héros, 2 images (cape au vent). */
function paintHero(scene: Phaser.Scene, frame: number): void {
  const rows = [
    '....###....',
    '...#####...',
    '...####R...',
    '...###RR...',
    '....##R....',
    '...#####...',
    '..######R..',
    '..######R..',
    '.#######R..',
    '.#######R..',
    '.#######R..',
    '..######R..',
    '..######R..',
    '..######...',
    '..###.##...',
    '..##..##...',
    '..##..##...',
    '.###..###..',
  ];
  const cape = frame === 0 ? ['#.........', '##........', '##........'] : ['..........', '#.........', '##........'];
  const w = 12;
  const c = new PixelCanvas(w, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') c.set(x + 1, y, PALETTE.encre);
      if (ch === 'R') c.set(x + 1, y, PALETTE.violetPale);
    });
  });
  // Pan de cape qui flotte à gauche (le vent vient de la mer).
  cape.forEach((row, i) => {
    [...row].forEach((ch, x) => {
      if (ch === '#') c.set(x, 9 + i * 2, PALETTE.encre);
    });
  });
  c.toTexture(scene, TEX.hero(frame));
}

/** Bande de brume tramée, tuilable horizontalement. */
function paintMist(scene: Phaser.Scene, key: string, width: number, height: number, cell: number, seed: number, density: number): void {
  const c = new PixelCanvas(width, height);
  const period = width / cell;
  for (let y = 0; y < height; y++) {
    const edge = Math.sin((Math.PI * (y + 0.5)) / height); // fondu haut et bas
    for (let x = 0; x < width; x++) {
      const n = tileableNoise2D(x / cell, y / cell, period, seed) * 0.65 + tileableNoise2D((x * 2) / cell, (y * 2) / cell, period * 2, seed + 1) * 0.35;
      if ((n - (1 - density)) * 2.2 * edge > bayer(x, y)) c.set(x, y, 0xffffff);
    }
  }
  c.toTexture(scene, key);
}

/**
 * Halo lumineux en anneaux concentriques (blanc, teinté et additif à l'usage) :
 * cœur plein, puis trames à 50 % et 25 %, comme les lumières pixel art classiques.
 */
function paintHalo(scene: Phaser.Scene, radius: number): void {
  const size = radius * 2;
  const c = new PixelCanvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
      if (d < 0.3) c.set(x, y, 0xffffff, 120);
      else if (d < 0.55) c.set(x, y, 0xffffff, (x + y) % 2 === 0 ? 110 : 60);
      else if (d < 0.8) {
        if ((x + y) % 2 === 0) c.set(x, y, 0xffffff, 55);
      } else if (d < 1 && x % 2 === 0 && y % 2 === 0) c.set(x, y, 0xffffff, 40);
    }
  }
  c.toTexture(scene, TEX.halo);
}

/** Génère toutes les textures de l'écran titre (≈ 30 ms, une seule fois). */
export function paintTitleBackdrop(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.sky)) return;
  paintSky(scene);
  for (let i = 0; i < SEA_FRAMES; i++) paintSea(scene, i);
  paintCliff(scene);
  paintHero(scene, 0);
  paintHero(scene, 1);
  paintMist(scene, TEX.mist, 256, 40, 16, 5, 0.5);
  paintMist(scene, TEX.clouds, 480, 24, 24, 9, 0.42);
  paintHalo(scene, 28);
  const one = new PixelCanvas(1, 1);
  one.set(0, 0, 0xffffff);
  one.toTexture(scene, TEX.px1);
  const two = new PixelCanvas(2, 2);
  two.fillRect(0, 0, 2, 2, 0xffffff);
  two.toTexture(scene, TEX.px2);
}
