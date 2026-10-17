/**
 * Décors multi-tuiles (« tampons ») : arbres, maisons, remparts, tentes,
 * falaises, autels… Chaque tampon est peint une fois puis découpé en tuiles.
 *
 * - `blocked` : cases de collision (ligne par ligne) ;
 * - `canopyRows` : nombre de rangées du haut posées sur la couche `canopy`
 *   (dessinée SUR le héros) ; les autres vont dans `decor` (SOUS le héros).
 */
import { propRelief } from './relief';
import { hashString, mulberry32 } from './noise';
import { ACCENT, INK, RAMPS, SHADE, ellipse, line, outline, shadedBlob, speckle, type Ramp, type Rnd } from './art';
import { mix, Px } from './px';
import { MILL_MS, paintCottage, paintForge, paintGuardTower, paintHut, paintInn, paintLogHouse, paintMill, paintSlateHouse, paintStoneHouse, paintTemple, paintTownHouse } from './buildings';
import { DEAD_FOOT, OAK_FOOT, PINE_FOOT, WIND_MS, paintBush, paintDarkPine, paintDeadTree, paintFlowers, paintLavender, paintOak, paintPine, paintReeds, paintSunflowers, paintTallGrass } from './flora';
import { PALETTE as P } from '../../src/render/palette';

const T = 16;

export interface Stamp {
  readonly name: string;
  readonly variant: number;
  readonly w: number;
  readonly h: number;
  readonly px: Px;
  readonly blocked: readonly boolean[];
  readonly canopyRows: number;
  /** Rangées du bas qui ne portent que l'ombre portée (jamais bloquantes). */
  readonly shadowRows: number;
  /** Sortie de cheminée (pixels du tampon) d'où monte la fumée animée, s'il y en a une. */
  readonly chimney: { readonly x: number; readonly y: number } | null;
  /** Bâtiment : ses rangées de toit (canopy) ne doivent pas surplomber une route ni une place. */
  readonly building: boolean;
  /** Images d'animation (vent, ailes du moulin) ; `px` est la première. */
  readonly frames: readonly Px[];
  /** Durée de chaque image (ms), vide si le tampon est fixe. */
  readonly frameMs: readonly number[];
  /** Case du pied (tronc) : point d'ancrage pour `placeFoot`. */
  readonly foot: { readonly x: number; readonly y: number };
  /** Végétation : peut chevaucher une autre végétation (composée pixel par pixel). */
  readonly overlap: boolean;
}

type Painter = (px: Px, rnd: Rnd, variant: number, frame: number) => void;

interface Def {
  readonly w: number;
  readonly h: number;
  readonly variants: number;
  readonly canopyRows: number;
  readonly shadowRows?: number;
  readonly chimney?: { readonly x: number; readonly y: number };
  /** Cases bloquées : `all`, `bottom` (rangée du bas) ou une liste « x,y ». */
  readonly block: 'all' | 'bottom' | 'none' | readonly string[];
  readonly paint: Painter;
  /** Biseau automatique (`propRelief`) ; les bâtiments gèrent leur propre lumière. */
  readonly relief?: boolean;
  readonly building?: boolean;
  readonly frameMs?: readonly number[];
  readonly foot?: { readonly x: number; readonly y: number };
  readonly overlap?: boolean;
}

/** Végétation (tools/world/flora.ts, décision n°45) : collision au tronc, feuillage sur `canopy`, vent. */
function plant(w: number, h: number, canopy: number, paint: Painter, variants: number, foot: { x: number; y: number } | null, wind = true): Def {
  return {
    w,
    h,
    variants,
    canopyRows: canopy,
    block: foot ? [`${foot.x},${foot.y}`] : 'none',
    paint,
    relief: false,
    overlap: true,
    ...(foot ? { foot } : {}),
    ...(wind ? { frameMs: WIND_MS } : {}),
  };
}

/** Cases bloquées « au pied » : toutes les colonnes (ou `cols`) des rangées `rows`. */
function foot(w: number, rows: readonly number[], cols?: readonly number[]): string[] {
  const out: string[] = [];
  for (const y of rows) for (let x = 0; x < w; x++) if (!cols || cols.includes(x)) out.push(`${x},${y}`);
  return out;
}

/**
 * Bâtiment (décision n°44) : `canopy` rangées de toit sur la couche haute, les
 * rangées de murs suivantes bloquent, la dernière ne porte que l'ombre.
 */
function building(w: number, h: number, canopy: number, paint: Painter, extra: { variants?: number; chimney?: { x: number; y: number }; cols?: readonly number[]; blockRows?: readonly number[] } = {}): Def {
  const rows = extra.blockRows ?? Array.from({ length: h - 1 - canopy }, (_, i) => canopy + i);
  return { w, h, variants: extra.variants ?? 1, canopyRows: canopy, shadowRows: 1, block: foot(w, rows, extra.cols), paint, relief: false, building: true, ...(extra.chimney ? { chimney: extra.chimney } : {}) };
}

/* ---------- Outils ---------- */

/** Ombre portée : ellipse bleu nuit translucide, décalée vers le bas-droite (lumière en haut à gauche). */
function shadow(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  const ox = Math.round(rx * 0.25);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx + ox - rx); x <= Math.ceil(cx + ox + rx); x++) {
      const dx = (x + 0.5 - cx - ox) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && px.alphaAt(x, y) === 0) px.set(x, y, SHADE, dx * dx + dy * dy > 0.6 ? 70 : 105);
    }
  }
}

/** Rectangle ombré (lumière en haut à gauche) avec contour. */
function slab(px: Px, x: number, y: number, w: number, h: number, ramp: Ramp, rnd: Rnd): void {
  px.rect(x, y, w, h, ramp.base);
  px.rect(x, y, w, 1, ramp.hi);
  px.rect(x, y, 1, h, ramp.light);
  px.rect(x, y + h - 1, w, 1, ramp.dark);
  px.rect(x + w - 1, y, 1, h, ramp.dark);
  speckle(px, rnd, x + 1, y + 1, w - 2, h - 2, ramp.dark, Math.floor((w * h) / 12));
  speckle(px, rnd, x + 1, y + 1, w - 2, h - 2, ramp.light, Math.floor((w * h) / 16));
}

/* ---------- Arbres ---------- */

function paintRock(px: Px, rnd: Rnd, variant: number): void {
  const r = variant === 2 ? RAMPS.stone : RAMPS.rock;
  shadedBlob(px, 8, 10, 6.5, 5.5, r, rnd, 0.1);
  line(px, 6, 8, 9, 12, r.deep);
  if (variant === 1) speckle(px, rnd, 3, 6, 10, 8, RAMPS.grass.base, 4);
  outline(px, INK);
  shadow(px, 8, 14, 6, 1.5);
}

function paintTent(px: Px, rnd: Rnd, variant: number): void {
  const cloth = variant === 0 ? mix(P.rougeCendre, P.grisRoux, 0.3) : mix(P.grisRoux, P.sable, 0.3);
  const ramp: Ramp = { deep: mix(cloth, P.nuit, 0.7), dark: mix(cloth, P.nuit, 0.4), base: cloth, light: mix(cloth, P.parchemin, 0.25), hi: mix(cloth, P.parchemin, 0.5) };
  for (let y = 4; y < 28; y++) {
    const f = (y - 4) / 24;
    const half = Math.round(1 + f * 14);
    for (let x = 16 - half; x < 16 + half; x++) px.set(x, y, x < 16 - half * 0.3 ? ramp.light : x > 16 + half * 0.5 ? ramp.dark : ramp.base);
  }
  // Entrée sombre et fanion.
  for (let y = 16; y < 28; y++) for (let x = 13; x < 19; x++) px.set(x, y, (x + y) % 5 === 0 ? ramp.deep : P.nuit);
  line(px, 16, 4, 16, 0, RAMPS.trunk.dark);
  px.rect(17, 0, 4, 2, P.rougeCendre);
  speckle(px, rnd, 4, 14, 24, 12, ramp.dark, 8);
  outline(px, INK);
  shadow(px, 16, 29, 14, 2);
}

function paintCampfire(px: Px, rnd: Rnd): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    px.set(8 + Math.round(Math.cos(a) * 5), 12 + Math.round(Math.sin(a) * 2.5), RAMPS.rock.base);
  }
  line(px, 5, 13, 11, 11, RAMPS.trunk.base);
  line(px, 5, 11, 11, 13, RAMPS.trunk.dark);
  px.rect(7, 6, 3, 5, ACCENT.fire);
  px.rect(8, 4, 1, 3, ACCENT.fire);
  px.rect(8, 8, 1, 3, P.jauneBle);
  px.set(6 + Math.floor(rnd() * 5), 3, ACCENT.ember);
  outline(px, INK);
}

function paintWallH(px: Px, rnd: Rnd, variant: number): void {
  // Rempart horizontal : crénelage en haut, face de pierre.
  px.rect(0, 2, T, 14, RAMPS.stone.base);
  px.rect(0, 2, T, 2, RAMPS.stone.hi);
  px.rect(0, 14, T, 2, RAMPS.stone.deep);
  for (let y = 5; y < 14; y += 4) for (let x = ((y / 4) % 2) * 4; x < T; x += 8) px.rect(x, y, 6, 3, rnd() < 0.5 ? RAMPS.stone.light : RAMPS.stone.base);
  for (let y = 5; y < 14; y += 4) px.rect(0, y + 3, T, 1, RAMPS.stone.dark);
  speckle(px, rnd, 0, 4, T, 10, RAMPS.stone.dark, 8);
  for (const x of variant === 0 ? [0, 8] : [2, 10]) px.rect(x, 0, 5, 3, RAMPS.stone.light);
  outline(px, INK);
}

function paintWallV(px: Px, rnd: Rnd): void {
  px.rect(3, 0, 10, T, RAMPS.stone.base);
  px.rect(3, 0, 2, T, RAMPS.stone.hi);
  px.rect(11, 0, 2, T, RAMPS.stone.deep);
  for (let y = 0; y < T; y += 4) px.rect(5, y + 3, 6, 1, RAMPS.stone.dark);
  speckle(px, rnd, 5, 0, 6, T, RAMPS.stone.dark, 6);
  outline(px, INK);
}

function paintTower(px: Px, rnd: Rnd): void {
  slab(px, 2, 8, 28, 22, RAMPS.stone, rnd);
  for (let y = 12; y < 30; y += 5) px.rect(2, y, 28, 1, RAMPS.stone.dark);
  for (const x of [2, 10, 18, 25]) px.rect(x, 3, 5, 6, RAMPS.stone.light);
  for (const x of [2, 10, 18, 25]) px.rect(x, 3, 5, 1, RAMPS.stone.hi);
  px.rect(14, 16, 4, 7, P.nuit);
  px.rect(14, 15, 4, 1, RAMPS.stone.deep);
  px.rect(15, 18, 2, 3, ACCENT.window);
  outline(px, INK);
  shadow(px, 16, 31, 14, 1.5);
}

function paintPalisade(px: Px, rnd: Rnd, variant: number): void {
  for (let x = 0; x < T; x += 4) {
    const top = 1 + ((x / 4 + variant) % 2);
    px.rect(x, top + 2, 3, 14 - top - 2, RAMPS.wood.base);
    px.rect(x, top + 2, 1, 14 - top - 2, RAMPS.wood.light);
    px.rect(x + 2, top + 2, 1, 14 - top - 2, RAMPS.wood.dark);
    px.set(x + 1, top, RAMPS.wood.base);
    px.set(x + 1, top + 1, RAMPS.wood.base);
  }
  px.rect(0, 9, T, 1, RAMPS.wood.deep);
  speckle(px, rnd, 0, 4, T, 10, RAMPS.wood.dark, 5);
  outline(px, INK);
}

function paintFence(px: Px, rnd: Rnd, variant: number): void {
  if (variant === 0) {
    px.rect(0, 7, T, 2, RAMPS.wood.base);
    px.rect(0, 11, T, 2, RAMPS.wood.base);
    for (const x of [1, 12]) px.rect(x, 4, 2, 11, RAMPS.wood.dark);
  } else {
    px.rect(6, 0, 4, T, RAMPS.wood.base);
    px.rect(2, 3, 12, 2, RAMPS.wood.base);
    px.rect(2, 9, 12, 2, RAMPS.wood.base);
    px.rect(6, 0, 1, T, RAMPS.wood.light);
  }
  speckle(px, rnd, 0, 0, T, T, RAMPS.wood.deep, 3);
  outline(px, INK);
}

function paintWell(px: Px, rnd: Rnd): void {
  slab(px, 2, 7, 12, 8, RAMPS.stone, rnd);
  px.rect(4, 7, 8, 3, P.nuitBleue);
  px.rect(3, 1, 1, 8, RAMPS.wood.dark);
  px.rect(12, 1, 1, 8, RAMPS.wood.dark);
  px.rect(2, 0, 12, 2, RAMPS.wood.base);
  px.rect(5, 2, 1, 4, P.grisRoux);
  outline(px, INK);
  shadow(px, 8, 15, 7, 1);
}

function paintBarrel(px: Px, rnd: Rnd, variant: number): void {
  if (variant === 0) {
    ellipse(px, 8, 9, 5, 6, RAMPS.wood.base);
    px.rect(3, 6, 10, 1, RAMPS.rock.base);
    px.rect(3, 11, 10, 1, RAMPS.rock.base);
    px.rect(5, 4, 2, 8, RAMPS.wood.light);
  } else {
    slab(px, 2, 5, 12, 9, RAMPS.wood, rnd);
    px.rect(2, 9, 12, 1, RAMPS.wood.deep);
    px.rect(7, 5, 2, 9, RAMPS.wood.deep);
  }
  outline(px, INK);
  shadow(px, 8, 15, 6, 1);
}

function paintStall(px: Px, rnd: Rnd, variant: number): void {
  const cloth = [P.rougeCendre, P.ciel, P.jauneBle][variant % 3] as number;
  for (let y = 2; y < 9; y++) for (let x = 1; x < 31; x++) px.set(x, y, (Math.floor(x / 4) % 2 === 0) ? cloth : P.parchemin);
  px.rect(1, 9, 30, 1, RAMPS.wood.deep);
  px.rect(2, 9, 2, 6, RAMPS.wood.dark);
  px.rect(28, 9, 2, 6, RAMPS.wood.dark);
  slab(px, 3, 10, 26, 5, RAMPS.wood, rnd);
  for (let i = 0; i < 6; i++) px.set(5 + i * 4, 9, [ACCENT.flowerRed, P.jauneBle, P.vertDore][i % 3] as number);
  outline(px, INK);
  shadow(px, 16, 15, 14, 1);
}

function paintHay(px: Px, rnd: Rnd): void {
  shadedBlob(px, 8, 10, 7, 5.5, RAMPS.wheat, rnd, 0.1);
  line(px, 3, 9, 13, 9, RAMPS.wheat.dark);
  outline(px, INK);
  shadow(px, 8, 15, 7, 1);
}

function paintCrate(px: Px, rnd: Rnd): void {
  slab(px, 2, 5, 12, 10, RAMPS.wood, rnd);
  line(px, 2, 5, 13, 14, RAMPS.wood.deep);
  outline(px, INK);
  shadow(px, 8, 15, 6, 1);
}

function paintSign(px: Px): void {
  px.rect(7, 6, 2, 9, RAMPS.wood.dark);
  px.rect(2, 2, 12, 6, RAMPS.wood.base);
  px.rect(2, 2, 12, 1, RAMPS.wood.light);
  px.rect(4, 4, 8, 1, RAMPS.wood.deep);
  outline(px, INK);
}

/* ---------- Autels, ruines, falaises ---------- */

function paintAltar(px: Px, rnd: Rnd): void {
  slab(px, 2, 8, 12, 7, RAMPS.ruin, rnd);
  slab(px, 4, 5, 8, 4, RAMPS.ruin, rnd);
  px.rect(7, 0, 2, 5, ACCENT.cyan);
  px.set(6, 2, ACCENT.cyan);
  px.set(9, 2, ACCENT.cyan);
  px.set(7, 5, 0xffffff);
  speckle(px, rnd, 3, 9, 10, 5, ACCENT.cyan, 2);
  outline(px, INK);
  shadow(px, 8, 15, 7, 1);
}

function paintMenhir(px: Px, rnd: Rnd): void {
  for (let y = 3; y < 30; y++) {
    const half = y < 8 ? 2 + (y - 3) : y > 26 ? 6 - (y - 26) : 6;
    for (let x = 8 - half; x < 8 + half; x++) px.set(x, y, x < 7 ? RAMPS.ruin.light : x > 9 ? RAMPS.ruin.dark : RAMPS.ruin.base);
  }
  // Rune lumineuse.
  line(px, 8, 10, 8, 16, ACCENT.cyan);
  line(px, 6, 13, 10, 13, ACCENT.cyan);
  speckle(px, rnd, 3, 4, 10, 24, RAMPS.ruin.deep, 8);
  outline(px, INK);
  shadow(px, 8, 30, 6, 1.5);
}

function paintPillar(px: Px, rnd: Rnd, variant: number): void {
  const broken = variant % 2 === 1;
  const top = broken ? 12 : 4;
  slab(px, 4, top, 8, 28 - top, RAMPS.ruin, rnd);
  px.rect(3, 26, 10, 4, RAMPS.ruin.dark);
  px.rect(3, 26, 10, 1, RAMPS.ruin.light);
  if (!broken) {
    px.rect(3, 2, 10, 3, RAMPS.ruin.light);
    px.rect(3, 2, 10, 1, RAMPS.ruin.hi);
  } else {
    speckle(px, rnd, 4, top - 2, 8, 3, RAMPS.ruin.base, 4);
  }
  speckle(px, rnd, 4, top, 8, 24 - top, RAMPS.grass.dark, 3);
  outline(px, INK);
  shadow(px, 8, 30, 6, 1.5);
}

function paintRuinWall(px: Px, rnd: Rnd, variant: number): void {
  const h = 6 + (variant % 3) * 3;
  slab(px, 0, 16 - h, T, h - 1, RAMPS.ruin, rnd);
  for (let x = 0; x < T; x += 4) if (rnd() < 0.5) px.rect(x, 16 - h, 4, 2 + Math.floor(rnd() * 2), 0, 0);
  speckle(px, rnd, 0, 16 - h, T, h, RAMPS.grass.base, 5);
  outline(px, INK);
}

function paintCliff(px: Px, rnd: Rnd, variant: number): void {
  const r = variant === 2 ? RAMPS.stone : RAMPS.rock;
  px.rect(0, 0, T, T, r.base);
  px.rect(0, 0, T, 4, r.hi);
  px.rect(0, 4, T, 2, r.light);
  for (let x = 0; x < T; x += 2 + Math.floor(rnd() * 3)) {
    const len = 6 + Math.floor(rnd() * 9);
    for (let y = 5; y < 5 + len && y < T; y++) px.set(x, y, y > 11 ? r.deep : r.dark);
  }
  px.rect(0, 14, T, 2, r.deep);
  speckle(px, rnd, 0, 4, T, 11, r.light, 8);
  if (variant === 1) speckle(px, rnd, 0, 0, T, 5, RAMPS.snow.base, 12);
}

function paintCairn(px: Px, rnd: Rnd): void {
  shadedBlob(px, 8, 12, 5, 3, RAMPS.rock, rnd, 0.1);
  shadedBlob(px, 8, 8, 3.5, 2.5, RAMPS.stone, rnd, 0.1);
  shadedBlob(px, 8, 5, 2, 1.8, RAMPS.rock, rnd, 0.1);
  outline(px, INK);
}

function paintBoat(px: Px, rnd: Rnd): void {
  for (let x = 2; x < 30; x++) {
    const depth = Math.round(5 * Math.sin(((x - 2) / 27) * Math.PI));
    for (let y = 8; y < 8 + depth + 2; y++) px.set(x, y, y === 8 ? RAMPS.wood.light : y > 8 + depth ? RAMPS.wood.deep : RAMPS.wood.base);
  }
  px.rect(15, 0, 1, 9, RAMPS.trunk.dark);
  for (let y = 1; y < 8; y++) px.rect(16, y, Math.max(1, 8 - y), 1, P.parchemin);
  speckle(px, rnd, 4, 9, 24, 4, RAMPS.wood.dark, 6);
  outline(px, INK);
  shadow(px, 16, 15, 13, 1);
}

function paintWreck(px: Px, rnd: Rnd): void {
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 5;
    const h = 8 + Math.floor(rnd() * 8);
    px.rect(x, 24 - h, 2, h, RAMPS.wood.base);
    px.rect(x, 24 - h, 1, h, RAMPS.wood.light);
  }
  line(px, 1, 22, 30, 17, RAMPS.wood.dark);
  line(px, 1, 23, 30, 18, RAMPS.wood.deep);
  speckle(px, rnd, 2, 8, 28, 18, RAMPS.sand.dark, 6);
  outline(px, INK);
  shadow(px, 16, 27, 14, 2);
}

function paintCauldron(px: Px, rnd: Rnd): void {
  ellipse(px, 8, 10, 6, 4.5, mix(P.nuit, P.grisRoux, 0.3));
  px.rect(3, 6, 10, 2, RAMPS.rock.base);
  px.rect(4, 5, 8, 1, ACCENT.window);
  px.set(6 + Math.floor(rnd() * 4), 3, ACCENT.ember);
  outline(px, INK);
  shadow(px, 8, 15, 7, 1);
}

function paintBanner(px: Px, rnd: Rnd): void {
  px.rect(7, 2, 2, 28, RAMPS.wood.dark);
  for (let y = 3; y < 17; y++) px.rect(9, y, 6 - Math.floor(Math.max(0, y - 11) / 1.5), 1, P.rougeCendre);
  px.rect(9, 3, 6, 1, P.orangeForge);
  speckle(px, rnd, 9, 5, 5, 8, mix(P.rougeCendre, P.nuit, 0.4), 4);
  outline(px, INK);
  shadow(px, 8, 30, 4, 1);
}

/* ---------- Catalogue ---------- */

export const STAMP_DEFS: Readonly<Record<string, Def>> = {
  pine: plant(3, 4, 3, paintPine, 4, PINE_FOOT),
  dark_pine: plant(3, 4, 3, paintDarkPine, 4, PINE_FOOT),
  oak: plant(3, 3, 2, paintOak, 5, OAK_FOOT),
  dead_tree: plant(3, 3, 2, paintDeadTree, 2, DEAD_FOOT, false),
  bush: plant(1, 1, 0, paintBush, 5, null, false),
  tall_grass: plant(1, 1, 0, paintTallGrass, 3, null),
  flowers: plant(1, 1, 0, paintFlowers, 4, null),
  lavender: plant(1, 1, 0, paintLavender, 2, null),
  sunflowers: plant(1, 2, 1, paintSunflowers, 2, null),
  rock: { w: 1, h: 1, variants: 3, canopyRows: 0, block: 'all', paint: paintRock },
  reeds: plant(1, 1, 0, paintReeds, 2, null),
  // Bâtiments (tools/world/buildings.ts, décision n°44).
  house_thatch: building(3, 4, 1, paintCottage, { variants: 2, chimney: { x: 32, y: 0 } }),
  house_tile: building(3, 5, 2, paintTownHouse, { chimney: { x: 33, y: 3 } }),
  house_slate: building(3, 4, 1, paintSlateHouse, { chimney: { x: 9, y: 0 } }),
  house_wood: building(3, 4, 1, paintLogHouse, { chimney: { x: 33, y: 0 } }),
  house_stone: building(3, 4, 1, paintStoneHouse, { chimney: { x: 10, y: 0 } }),
  hut: building(2, 4, 1, paintHut, { variants: 2, chimney: { x: 19, y: 1 } }),
  inn: building(5, 5, 2, paintInn, { chimney: { x: 68, y: 0 } }),
  forge: building(4, 4, 1, paintForge, { chimney: { x: 10, y: 0 } }),
  temple: building(4, 5, 2, paintTemple),
  mill: { ...building(4, 5, 3, paintMill, { cols: [1, 2], blockRows: [2, 3] }), frameMs: MILL_MS },
  guard_tower: building(2, 5, 3, paintGuardTower, { variants: 2 }),
  tent: { w: 2, h: 2, variants: 2, canopyRows: 0, block: 'bottom', paint: paintTent },
  campfire: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintCampfire(px, rnd) },
  wall_h: { w: 1, h: 1, variants: 2, canopyRows: 0, block: 'all', paint: paintWallH },
  wall_v: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintWallV(px, rnd) },
  tower: { w: 2, h: 2, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintTower(px, rnd) },
  palisade: { w: 1, h: 1, variants: 2, canopyRows: 0, block: 'all', paint: paintPalisade },
  fence: { w: 1, h: 1, variants: 2, canopyRows: 0, block: 'all', paint: paintFence },
  well: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintWell(px, rnd) },
  barrel: { w: 1, h: 1, variants: 2, canopyRows: 0, block: 'all', paint: paintBarrel },
  stall: { w: 2, h: 1, variants: 3, canopyRows: 0, block: 'all', paint: paintStall },
  hay: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintHay(px, rnd) },
  crate: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintCrate(px, rnd) },
  sign: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'none', paint: (px) => paintSign(px) },
  altar: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintAltar(px, rnd) },
  menhir: { w: 1, h: 2, variants: 1, canopyRows: 0, block: 'bottom', paint: (px, rnd) => paintMenhir(px, rnd) },
  pillar: { w: 1, h: 2, variants: 2, canopyRows: 0, block: 'bottom', paint: paintPillar },
  ruin_wall: { w: 1, h: 1, variants: 3, canopyRows: 0, block: 'all', paint: paintRuinWall },
  cliff: { w: 1, h: 1, variants: 3, canopyRows: 0, block: 'all', paint: paintCliff },
  cairn: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintCairn(px, rnd) },
  boat: { w: 2, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintBoat(px, rnd) },
  wreck: { w: 2, h: 2, variants: 1, canopyRows: 0, block: 'bottom', paint: (px, rnd) => paintWreck(px, rnd) },
  cauldron: { w: 1, h: 1, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintCauldron(px, rnd) },
  banner: { w: 1, h: 2, variants: 1, canopyRows: 0, block: 'bottom', paint: (px, rnd) => paintBanner(px, rnd) },
};

export type StampName = keyof typeof STAMP_DEFS;

const cache = new Map<string, Stamp>();

export function getStamp(name: string, variant = 0): Stamp {
  const def = STAMP_DEFS[name];
  if (!def) throw new Error(`Tampon inconnu : ${name}`);
  const v = ((variant % def.variants) + def.variants) % def.variants;
  const key = `${name}:${v}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const frames: Px[] = [];
  for (let f = 0; f < Math.max(1, def.frameMs?.length ?? 0); f++) {
    const fpx = new Px(def.w * T, def.h * T);
    def.paint(fpx, mulberry32(hashString(`stamp:${key}`)), v, f);
    if (def.relief !== false) propRelief(fpx);
    frames.push(fpx);
  }
  const px = frames[0] as Px;
  const blocked: boolean[] = [];
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      let b = false;
      if (def.block === 'all') b = y < def.h - (def.shadowRows ?? 0);
      else if (def.block === 'bottom') b = y === def.h - 1;
      else if (def.block !== 'none') b = def.block.includes(`${x},${y}`);
      blocked.push(b);
    }
  }
  const stamp: Stamp = { name, variant: v, w: def.w, h: def.h, px, blocked, canopyRows: def.canopyRows, shadowRows: def.shadowRows ?? 0, chimney: def.chimney ?? null, building: def.building ?? false, frames, frameMs: frames.length > 1 ? (def.frameMs ?? []) : [], foot: def.foot ?? { x: 0, y: def.h - 1 }, overlap: def.overlap ?? false };
  cache.set(key, stamp);
  return stamp;
}

export const variantCount = (name: string): number => (STAMP_DEFS[name] as Def).variants;
