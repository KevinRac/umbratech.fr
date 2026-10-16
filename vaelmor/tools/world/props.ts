/**
 * Décors multi-tuiles (« tampons ») : arbres, maisons, remparts, tentes,
 * falaises, autels… Chaque tampon est peint une fois puis découpé en tuiles.
 *
 * - `blocked` : cases de collision (ligne par ligne) ;
 * - `canopyRows` : nombre de rangées du haut posées sur la couche `canopy`
 *   (dessinée SUR le héros) ; les autres vont dans `decor` (SOUS le héros).
 */
import { hashString, mulberry32 } from './noise';
import { ACCENT, INK, RAMPS, SHADE, ellipse, inkOf, line, outline, shadedBlob, speckle, type Ramp, type Rnd } from './art';
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
  /** Rangées du bas qui ne portent que l'ombre portée (jamais bloquantes). */
  readonly shadowRows: number;
  /** Sortie de cheminée (pixels du tampon) d'où monte la fumée animée, s'il y en a une. */
  readonly chimney: { readonly x: number; readonly y: number } | null;
}

type Painter = (px: Px, rnd: Rnd, variant: number) => void;

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
  speckle(px, rnd, 3, 4, 10, 22, ramp.deep, 4);
  outline(px, inkOf(ramp));
  shadow(px, 8, 30, 7, 1.8);
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
  outline(px, inkOf(leaf));
  shadow(px, 16, 30, 12, 2.4);
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
  speckle(px, rnd, 6, 12, 4, 18, t.deep, 3);
  outline(px, inkOf(t));
  shadow(px, 8, 30, 5, 1.5);
}

function paintBush(px: Px, rnd: Rnd, variant: number): void {
  const berry = variant === 2;
  shadedBlob(px, 8, 10, 6.5, 5, variant === 1 ? RAMPS.foliageAutumn : RAMPS.foliage, rnd);
  shadedBlob(px, 5, 11, 4, 3.5, RAMPS.foliage, rnd);
  if (berry) for (let i = 0; i < 4; i++) px.set(4 + Math.floor(rnd() * 9), 8 + Math.floor(rnd() * 5), ACCENT.flowerRed);
  outline(px, inkOf(RAMPS.foliage));
  shadow(px, 8, 14, 7, 1.5);
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

const roofRamp = (base: number): Ramp => ({
  deep: mix(base, SHADE, 0.7),
  dark: mix(base, SHADE, 0.38),
  base,
  light: mix(base, P.jauneBle, 0.22),
  hi: mix(base, P.parchemin, 0.5),
});

const HOUSE_STYLES: readonly HouseStyle[] = [
  { wall: { ...RAMPS.sand, base: mix(P.parchemin, P.sable, 0.35) }, roof: roofRamp(mix(P.ambre, P.grisRoux, 0.3)), timber: true }, // chaume d'Aubemer
  { wall: { ...RAMPS.stone, base: mix(P.parchemin, P.pierre, 0.45) }, roof: roofRamp(mix(P.rougeCendre, P.orangeForge, 0.2)), timber: true }, // tuiles rouges
  { wall: RAMPS.stone, roof: roofRamp(mix(P.bleuGris, P.nuitBleue, 0.25)), timber: false }, // ardoise (port, montagne)
  { wall: RAMPS.wood, roof: roofRamp(mix(P.vertProfond, P.grisRoux, 0.3)), timber: true }, // bois (forêt)
  { wall: RAMPS.ruin, roof: roofRamp(mix(P.grisRoux, P.violetPale, 0.35)), timber: false }, // pierre froide
];

/**
 * Maison vue de trois quarts : grand toit à bardeaux, façade crépie à pans de
 * bois, volets, porte cintrée, soubassement de pierre et ombre portée sur la
 * dernière rangée du tampon. `H` = hauteur du bâtiment (sans la rangée d'ombre).
 */
function paintHouse(px: Px, rnd: Rnd, style: HouseStyle, wTiles: number, hTiles: number): void {
  const W = wTiles * T;
  const H = hTiles * T;
  const wallTop = H - 27; // façade de 24 px au-dessus du soubassement : une porte de 18 px de haut va avec un héros de 22 px
  const roofTop = 3;
  const roofBottom = wallTop + 2;
  const { wall, roof } = style;
  // Murs : fond, face éclairée à gauche, ombre propre à droite.
  px.rect(4, wallTop, W - 8, H - wallTop - 3, wall.base);
  px.rect(4, wallTop, 2, H - wallTop - 3, wall.light);
  px.rect(W - 7, wallTop, 3, H - wallTop - 3, wall.dark);
  // Pans de bois ou joints de pierre.
  if (style.timber) {
    const beam = RAMPS.trunk.dark;
    px.rect(4, wallTop, 2, H - wallTop - 3, beam);
    px.rect(W - 6, wallTop, 2, H - wallTop - 3, beam);
    px.rect(Math.floor(W / 2) - 1, wallTop, 2, H - wallTop - 3, beam);
    px.rect(4, wallTop + 6, W - 8, 1, beam);
    for (let i = 0; i < 3; i++) {
      line(px, 6, wallTop + 6 + i * 0, 6, wallTop + 6, beam);
    }
  } else {
    for (let y = wallTop + 3; y < H - 5; y += 4) {
      px.rect(5, y, W - 10, 1, wall.dark);
      for (let x = 6 + (((y / 4) | 0) % 2) * 5; x < W - 6; x += 10) px.rect(x, y - 3, 1, 3, wall.dark);
    }
  }
  // Soubassement de pierre.
  px.rect(4, H - 6, W - 8, 3, RAMPS.rock.base);
  px.rect(4, H - 6, W - 8, 1, RAMPS.rock.light);
  px.rect(4, H - 4, W - 8, 1, RAMPS.rock.dark);
  speckle(px, rnd, 5, H - 6, W - 10, 3, RAMPS.rock.deep, 3);
  // Porte cintrée de 10 × 18 px (le héros fait 22 px de haut).
  const doorX = Math.floor(W / 2) - 5;
  const doorTop = H - 21;
  px.rect(doorX - 1, doorTop - 1, 12, 19, RAMPS.wood.deep);
  px.rect(doorX, doorTop, 10, 18, RAMPS.wood.base);
  px.rect(doorX, doorTop, 10, 1, RAMPS.wood.dark);
  px.rect(doorX, doorTop, 1, 18, RAMPS.wood.light);
  px.rect(doorX + 9, doorTop, 1, 18, RAMPS.wood.dark);
  px.rect(doorX + 4, doorTop, 1, 18, RAMPS.wood.deep); // jour entre les deux vantaux
  for (let y = doorTop + 3; y < H - 5; y += 5) px.rect(doorX + 1, y, 8, 1, RAMPS.wood.dark); // planches
  px.rect(doorX + 1, doorTop + 4, 8, 1, RAMPS.wood.deep); // ferrure
  px.set(doorX + 6, H - 12, P.jauneBle); // poignée
  px.set(doorX + 6, H - 11, P.ambre);
  px.rect(doorX - 2, H - 4, 14, 1, RAMPS.rock.light); // seuil
  px.rect(doorX - 1, doorTop - 2, 12, 1, wall.dark); // linteau
  // Fenêtres à volets, vitres éclairées de l'intérieur.
  const windows = wTiles >= 4 ? [7, W - 15] : wTiles === 2 ? [] : [5, W - 13];
  for (const wx of windows) {
    px.rect(wx, wallTop + 5, 8, 9, RAMPS.wood.deep);
    px.rect(wx + 2, wallTop + 6, 4, 7, ACCENT.window);
    px.rect(wx + 2, wallTop + 6, 4, 1, P.jauneBle);
    px.rect(wx + 4, wallTop + 6, 1, 7, RAMPS.wood.deep);
    px.rect(wx + 2, wallTop + 9, 4, 1, RAMPS.wood.deep);
    px.rect(wx, wallTop + 5, 2, 9, RAMPS.wood.base);
    px.rect(wx + 6, wallTop + 5, 2, 9, RAMPS.wood.dark);
    px.rect(wx - 1, wallTop + 14, 10, 1, RAMPS.wood.dark);
    px.rect(wx - 1, wallTop + 15, 10, 1, SHADE);
  }
  // Toit : grand plan incliné à bardeaux, pente gauche éclairée, rive et faîtage.
  for (let y = roofTop; y <= roofBottom; y++) {
    const f = (y - roofTop) / (roofBottom - roofTop);
    const inset = Math.round((1 - f) * (W / 2 - 9));
    const row = Math.floor((y - roofTop) / 3);
    for (let x = 1 + inset; x < W - 1 - inset; x++) {
      const edge = (x + (row % 2) * 3) % 6 === 0;
      const rel = (x - (1 + inset)) / (W - 2 - 2 * inset);
      let color = rel < 0.3 ? roof.light : rel > 0.72 ? roof.dark : roof.base;
      if ((y - roofTop) % 3 === 2) color = rel < 0.3 ? roof.base : roof.dark;
      else if (edge && (y - roofTop) % 3 === 1) color = rel < 0.5 ? roof.base : roof.dark;
      px.set(x, y, color);
    }
    px.set(1 + inset, y, roof.hi);
    px.set(W - 2 - inset, y, roof.deep);
  }
  px.rect(1, roofBottom, W - 2, 1, roof.deep);
  px.rect(1, roofBottom - 1, W - 2, 1, roof.dark);
  // Faîtage clair.
  const ridge = 1 + Math.round(W / 2 - 9);
  px.rect(ridge, roofTop, W - 2 * ridge, 1, roof.hi);
  // Ombre de l'avant-toit sur la façade.
  px.rect(4, roofBottom + 1, W - 8, 2, SHADE, );
  for (let x = 4; x < W - 4; x++) px.set(x, roofBottom + 3, wall.dark);
  // Cheminée de briques : corps, joints décalés, face éclairée à gauche, couronnement et suie.
  const chimX = W - 19;
  const chimW = 7;
  px.rect(chimX, 2, chimW, 9, RAMPS.rust.base);
  for (let y = 3; y < 11; y += 3) {
    px.rect(chimX, y, chimW, 1, RAMPS.rust.dark);
    for (let x = chimX + ((y / 3) % 2 === 0 ? 2 : 4); x < chimX + chimW; x += 4) px.rect(x, y - 2, 1, 2, RAMPS.rust.dark);
  }
  px.rect(chimX, 2, 1, 9, RAMPS.rust.light);
  px.rect(chimX + chimW - 2, 2, 2, 9, RAMPS.rust.dark);
  px.rect(chimX - 1, 1, chimW + 2, 2, RAMPS.stone.light); // couronnement de pierre
  px.rect(chimX - 1, 2, chimW + 2, 1, RAMPS.stone.dark);
  px.rect(chimX - 1, 1, chimW + 2, 1, RAMPS.stone.hi);
  px.rect(chimX + 1, 0, chimW - 2, 1, RAMPS.stone.deep); // conduit noirci
  px.rect(chimX + 2, 0, chimW - 4, 1, INK);
  outline(px, INK);
  // Ombre portée sur la rangée suivante.
  for (let y = H - 1; y < H + 8; y++) {
    const k = y - (H - 1);
    for (let x = 5 + k; x < W - 1 + Math.min(k, 5); x++) {
      if (x < W && px.alphaAt(x, y) === 0) px.set(x, y, SHADE, k < 4 ? 105 : 70);
    }
  }
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
  paintHouse(px, rnd, HOUSE_STYLES[variant % 2 === 0 ? 3 : 0] as HouseStyle, 2, 3);
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
  house_thatch: { chimney: { x: 32, y: 0 }, w: 3, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: house(0, 3, 3) },
  house_tile: { chimney: { x: 32, y: 0 }, w: 3, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: house(1, 3, 3) },
  house_slate: { chimney: { x: 32, y: 0 }, w: 3, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: house(2, 3, 3) },
  house_wood: { chimney: { x: 32, y: 0 }, w: 3, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: house(3, 3, 3) },
  house_stone: { chimney: { x: 32, y: 0 }, w: 3, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: house(4, 3, 3) },
  inn: { chimney: { x: 48, y: 0 }, w: 4, h: 4, variants: 1, canopyRows: 0, shadowRows: 1, block: 'all', paint: (px, rnd) => paintInn(px, rnd) },
  hut: { chimney: { x: 16, y: 0 }, w: 2, h: 4, variants: 2, canopyRows: 0, shadowRows: 1, block: 'all', paint: paintHut },
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
      if (def.block === 'all') b = y < def.h - (def.shadowRows ?? 0);
      else if (def.block === 'bottom') b = y === def.h - 1;
      else if (def.block !== 'none') b = def.block.includes(`${x},${y}`);
      blocked.push(b);
    }
  }
  const stamp: Stamp = { name, variant: v, w: def.w, h: def.h, px, blocked, canopyRows: def.canopyRows, shadowRows: def.shadowRows ?? 0, chimney: def.chimney ?? null };
  cache.set(key, stamp);
  return stamp;
}

export const variantCount = (name: string): number => (STAMP_DEFS[name] as Def).variants;
