/**
 * Décors multi-tuiles (« tampons ») : arbres, maisons, remparts, tentes,
 * falaises, autels… Chaque tampon est peint une fois puis découpé en tuiles.
 *
 * - `blocked` : cases de collision (ligne par ligne) ;
 * - `canopyRows` : nombre de rangées du haut posées sur la couche `canopy`
 *   (dessinée SUR le héros) ; les autres vont dans `decor` (SOUS le héros).
 */
import { hashString, mulberry32 } from './noise';
import { ACCENT, INK, RAMPS, ellipse, line, outline, shadedBlob, speckle, type Ramp, type Rnd } from './art';
import { mix, Px } from './px';
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
}

type Painter = (px: Px, rnd: Rnd, variant: number) => void;

interface Def {
  readonly w: number;
  readonly h: number;
  readonly variants: number;
  readonly canopyRows: number;
  /** Cases bloquées : `all`, `bottom` (rangée du bas) ou une liste « x,y ». */
  readonly block: 'all' | 'bottom' | 'none' | readonly string[];
  readonly paint: Painter;
}

/* ---------- Outils ---------- */

function shadow(px: Px, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && px.alphaAt(x, y) === 0) px.set(x, y, P.encre, 70);
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

function conifer(px: Px, rnd: Rnd, ramp: Ramp, tiers: number): void {
  // 16×32 : cime sur la case du haut, base et tronc sur la case du bas.
  px.rect(7, 25, 2, 6, RAMPS.trunk.base);
  px.rect(7, 25, 1, 6, RAMPS.trunk.light);
  px.rect(8, 25, 1, 6, RAMPS.trunk.dark);
  const top = 1;
  const span = 26 - top;
  for (let t = 0; t < tiers; t++) {
    const y0 = top + Math.floor((t * span) / (tiers + 0.8));
    const y1 = y0 + Math.floor(span / tiers) + 4;
    const maxHalf = 3 + Math.round(((t + 1) / tiers) * 4);
    for (let y = y0; y <= y1 && y < 28; y++) {
      const f = (y - y0) / (y1 - y0);
      const half = Math.max(1, Math.round(1 + f * (maxHalf - 1)));
      for (let x = 8 - half; x < 8 + half; x++) {
        const side = (x - (8 - half)) / (2 * half);
        const lit = side < 0.35 ? 1 : side > 0.7 ? -1 : 0;
        let color = lit > 0 ? ramp.light : lit < 0 ? ramp.dark : ramp.base;
        if (y === y1 || (y === y1 - 1 && rnd() < 0.5)) color = ramp.dark;
        if (y === y0 + 1 && lit >= 0) color = ramp.hi;
        px.set(x, y, color);
      }
    }
  }
  speckle(px, rnd, 3, 4, 10, 22, ramp.deep, 6);
  outline(px, INK);
  shadow(px, 8, 30, 6, 1.5);
}

function paintPine(px: Px, rnd: Rnd, variant: number): void {
  const ramp: Ramp = variant === 3 ? { ...RAMPS.foliage, base: RAMPS.foliageAutumn.dark } : RAMPS.foliage;
  conifer(px, rnd, ramp, 3 + (variant % 2));
}

function paintDarkPine(px: Px, rnd: Rnd, variant: number): void {
  conifer(px, rnd, RAMPS.forest, 3 + (variant % 2));
  // Pointes plus claires : sapins de la brume.
  for (let i = 0; i < 6; i++) px.set(4 + Math.floor(rnd() * 8), 5 + Math.floor(rnd() * 18), RAMPS.forest.light);
}

function paintOak(px: Px, rnd: Rnd, variant: number): void {
  const leaf: Ramp = variant === 3 ? RAMPS.foliageAutumn : RAMPS.foliage;
  px.rect(14, 22, 4, 9, RAMPS.trunk.base);
  px.rect(14, 22, 1, 9, RAMPS.trunk.light);
  px.rect(17, 22, 1, 9, RAMPS.trunk.dark);
  px.rect(13, 29, 6, 2, RAMPS.trunk.dark);
  shadedBlob(px, 9, 14, 8, 8, leaf, rnd);
  shadedBlob(px, 23, 14, 8, 8, leaf, rnd);
  shadedBlob(px, 16, 8, 10, 8, leaf, rnd);
  shadedBlob(px, 16, 17, 10, 7, leaf, rnd);
  if (variant === 2) {
    for (let i = 0; i < 4; i++) px.set(6 + Math.floor(rnd() * 20), 6 + Math.floor(rnd() * 16), ACCENT.flowerRed);
  }
  outline(px, INK);
  shadow(px, 16, 30, 10, 2);
}

function paintDeadTree(px: Px, rnd: Rnd, variant: number): void {
  const t = RAMPS.trunk;
  px.rect(7, 12, 2, 19, t.base);
  px.rect(7, 12, 1, 19, t.light);
  px.rect(8, 12, 1, 19, t.dark);
  px.rect(6, 29, 4, 2, t.dark);
  line(px, 7, 18, 3, 11 - (variant % 2), t.dark);
  line(px, 8, 15, 12, 8, t.dark);
  line(px, 8, 21, 12, 17, t.dark);
  line(px, 3, 11, 2, 7, t.dark);
  line(px, 12, 8, 13, 4, t.dark);
  line(px, 12, 8, 10, 3, t.dark);
  speckle(px, rnd, 6, 12, 4, 18, t.deep, 4);
  outline(px, INK);
  shadow(px, 8, 30, 5, 1.5);
}

function paintBush(px: Px, rnd: Rnd, variant: number): void {
  const berry = variant === 2;
  shadedBlob(px, 8, 10, 6.5, 5, variant === 1 ? RAMPS.foliageAutumn : RAMPS.foliage, rnd);
  shadedBlob(px, 5, 11, 4, 3.5, RAMPS.foliage, rnd);
  if (berry) for (let i = 0; i < 4; i++) px.set(4 + Math.floor(rnd() * 9), 8 + Math.floor(rnd() * 5), ACCENT.flowerRed);
  outline(px, INK);
}

function paintRock(px: Px, rnd: Rnd, variant: number): void {
  const r = variant === 2 ? RAMPS.stone : RAMPS.rock;
  shadedBlob(px, 8, 10, 6.5, 5.5, r, rnd, 0.1);
  line(px, 6, 8, 9, 12, r.deep);
  if (variant === 1) speckle(px, rnd, 3, 6, 10, 8, RAMPS.grass.base, 4);
  outline(px, INK);
  shadow(px, 8, 14, 6, 1.5);
}

function paintReeds(px: Px, rnd: Rnd): void {
  for (let i = 0; i < 6; i++) {
    const x = 2 + Math.floor(rnd() * 12);
    const h = 5 + Math.floor(rnd() * 6);
    line(px, x, 14, x + (rnd() < 0.5 ? -1 : 1), 14 - h, RAMPS.marsh.light);
    px.set(x, 14 - h, RAMPS.wood.base);
  }
  outline(px, RAMPS.marsh.deep);
}

/* ---------- Bâtiments ---------- */

interface HouseStyle {
  readonly wall: Ramp;
  readonly roof: Ramp;
  readonly timber: boolean;
}

const HOUSE_STYLES: readonly HouseStyle[] = [
  { wall: RAMPS.dirt, roof: { ...RAMPS.wood, base: mix(P.ambre, P.grisRoux, 0.35) }, timber: true }, // chaume d'Aubemer
  { wall: RAMPS.stone, roof: { ...RAMPS.wood, base: P.rougeCendre }, timber: false }, // tuiles rouges
  { wall: RAMPS.stone, roof: RAMPS.rock, timber: false }, // ardoise (port, montagne)
  { wall: RAMPS.wood, roof: RAMPS.trunk, timber: true }, // bois (forêt)
  { wall: RAMPS.ruin, roof: { ...RAMPS.rock, base: mix(P.grisRoux, P.bleuGris, 0.4) }, timber: false }, // pierre froide
];

function paintHouse(px: Px, rnd: Rnd, style: HouseStyle, wTiles: number, hTiles: number): void {
  const W = wTiles * T;
  const H = hTiles * T;
  const wallTop = H - 18;
  const roofTop = 2;
  const roofBottom = wallTop + 3;
  const { wall, roof } = style;
  // Murs.
  slab(px, 4, wallTop, W - 8, H - wallTop - 2, wall, rnd);
  if (style.timber) {
    for (let x = 4; x < W - 4; x += 10) px.rect(x, wallTop, 2, H - wallTop - 2, RAMPS.trunk.dark);
    px.rect(4, wallTop + 7, W - 8, 1, RAMPS.trunk.dark);
  } else {
    for (let y = wallTop + 4; y < H - 3; y += 5) for (let x = 5 + ((y / 5) % 2) * 3; x < W - 5; x += 7) px.set(x, y, wall.dark);
  }
  px.rect(4, H - 4, W - 8, 2, RAMPS.rock.dark); // soubassement
  // Porte.
  const doorX = Math.floor(W / 2) - 3;
  px.rect(doorX, H - 12, 6, 10, RAMPS.wood.deep);
  px.rect(doorX + 1, H - 11, 4, 9, RAMPS.wood.base);
  px.rect(doorX + 1, H - 11, 4, 1, RAMPS.wood.light);
  px.set(doorX + 4, H - 7, P.jauneBle);
  px.rect(doorX - 1, H - 3, 8, 1, RAMPS.rock.light);
  // Fenêtres.
  const windows = wTiles >= 4 ? [10, W - 15] : [8, W - 13];
  for (const wx of windows) {
    px.rect(wx, wallTop + 4, 5, 5, RAMPS.wood.deep);
    px.rect(wx + 1, wallTop + 5, 3, 3, ACCENT.window);
    px.set(wx + 1, wallTop + 5, P.jauneBle);
    px.rect(wx + 2, wallTop + 5, 1, 3, RAMPS.wood.deep);
  }
  // Toit : trapèze à bardeaux, débord sur les côtés.
  for (let y = roofTop; y <= roofBottom; y++) {
    const f = (y - roofTop) / (roofBottom - roofTop);
    const inset = Math.round((1 - f) * (W / 2 - 6));
    for (let x = 1 + inset; x < W - 1 - inset; x++) {
      const row = Math.floor((y - roofTop) / 4);
      const offset = (row % 2) * 3;
      const edge = (x + offset) % 6 === 0;
      let color = row % 3 === 0 ? roof.light : roof.base;
      if (edge) color = roof.dark;
      if ((y - roofTop) % 4 === 3) color = roof.dark;
      if (x - (1 + inset) < 2) color = roof.hi;
      if (W - 2 - inset - x < 2) color = roof.deep;
      px.set(x, y, color);
    }
  }
  px.rect(1, roofBottom, W - 2, 1, roof.deep);
  // Cheminée.
  const chimX = W - 14;
  slab(px, chimX, 0, 5, 9, RAMPS.stone, rnd);
  outline(px, INK);
  shadow(px, W / 2, H - 1, W / 2 - 2, 1.5);
}

function paintInn(px: Px, rnd: Rnd): void {
  paintHouse(px, rnd, HOUSE_STYLES[1] as HouseStyle, 4, 3);
  // Enseigne suspendue.
  px.rect(5, 30, 1, 5, INK);
  px.rect(1, 35, 9, 6, RAMPS.wood.deep);
  px.rect(2, 36, 7, 4, ACCENT.fire);
  px.rect(5, 37, 1, 2, INK);
  outline(px, INK, 0, 28, 12, 16);
}

function paintHut(px: Px, rnd: Rnd, variant: number): void {
  paintHouse(px, rnd, HOUSE_STYLES[variant % 2 === 0 ? 3 : 0] as HouseStyle, 2, 2);
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

const house = (style: number, w: number, h: number): Painter => (px, rnd) => paintHouse(px, rnd, HOUSE_STYLES[style] as HouseStyle, w, h);

export const STAMP_DEFS: Readonly<Record<string, Def>> = {
  pine: { w: 1, h: 2, variants: 4, canopyRows: 1, block: 'bottom', paint: paintPine },
  dark_pine: { w: 1, h: 2, variants: 3, canopyRows: 1, block: 'bottom', paint: paintDarkPine },
  oak: { w: 2, h: 2, variants: 4, canopyRows: 1, block: 'bottom', paint: paintOak },
  dead_tree: { w: 1, h: 2, variants: 3, canopyRows: 0, block: 'bottom', paint: paintDeadTree },
  bush: { w: 1, h: 1, variants: 3, canopyRows: 0, block: 'none', paint: paintBush },
  rock: { w: 1, h: 1, variants: 3, canopyRows: 0, block: 'all', paint: paintRock },
  reeds: { w: 1, h: 1, variants: 2, canopyRows: 0, block: 'none', paint: (px, rnd) => paintReeds(px, rnd) },
  house_thatch: { w: 3, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: house(0, 3, 3) },
  house_tile: { w: 3, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: house(1, 3, 3) },
  house_slate: { w: 3, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: house(2, 3, 3) },
  house_wood: { w: 3, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: house(3, 3, 3) },
  house_stone: { w: 3, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: house(4, 3, 3) },
  inn: { w: 4, h: 3, variants: 1, canopyRows: 0, block: 'all', paint: (px, rnd) => paintInn(px, rnd) },
  hut: { w: 2, h: 2, variants: 2, canopyRows: 0, block: 'all', paint: paintHut },
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
  const px = new Px(def.w * T, def.h * T);
  def.paint(px, mulberry32(hashString(`stamp:${key}`)), v);
  const blocked: boolean[] = [];
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      let b = false;
      if (def.block === 'all') b = true;
      else if (def.block === 'bottom') b = y === def.h - 1;
      else if (def.block !== 'none') b = def.block.includes(`${x},${y}`);
      blocked.push(b);
    }
  }
  const stamp: Stamp = { name, variant: v, w: def.w, h: def.h, px, blocked, canopyRows: def.canopyRows };
  cache.set(key, stamp);
  return stamp;
}

export const variantCount = (name: string): number => (STAMP_DEFS[name] as Def).variants;
