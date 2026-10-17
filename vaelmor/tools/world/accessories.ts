/**
 * Petits décors et accessoires du monde ouvert (refonte graphique, étape 4 —
 * décision n°46) : ce qui raconte la vie des lieux, à la manière d'*Eastward*.
 *
 * - Vie des villages : tonneaux, caisses, sacs, bottes de foin, jardinières,
 *   outils, tas de bois, bancs, charrette, lampadaires, cordes à linge, étals,
 *   puits, panneaux, tableau d'affichage, poteries, filets de pêche.
 * - Nature : rochers, cailloux, souches, troncs couchés, champignons, falaises.
 * - Pierre et ruines : remparts, tours, palissades, clôtures, colonnes, murets,
 *   menhirs, cairns, autels, épaves, barque.
 * - Camp : tentes, feu de camp (flammes animées), chaudron, bannières au vent.
 *
 * Règles communes (celles des bâtiments, n°44) : lumière fixe en haut à gauche,
 * trois tons par matière au minimum, contour coloré (jamais noir), ombre portée
 * douce vers le bas à droite (`finish`). Collisions au pied : seules les cases
 * du bas bloquent, le haut des objets hauts passe sur la couche `canopy`.
 */
import { hash2 } from './noise';
import { RAMPS, SHADE, ramp, type Ramp, type Rnd } from './art';
import { M, finish } from './buildings';
import { SWAY } from './flora';
import { mix, Px } from './px';
import { PALETTE as P } from '../../src/render/palette';

const DEEP = P.ombreProfonde;
const T = 16;

/** Flammes : 4 images courtes et irrégulières. */
export const FIRE_MS = [130, 110, 150, 120] as const;

/* ---------- Matières ---------- */

const MAT = {
  wood: M.wood,
  plank: ramp(mix(P.terreSeche, P.ambre, 0.35), mix(P.brique, SHADE, 0.55), P.ocreClair),
  oldWood: ramp(mix(P.grisRoux, P.terreSeche, 0.45), mix(P.terreSombre, SHADE, 0.55), P.pierre),
  bark: ramp(mix(P.terreSombre, P.grisRoux, 0.35), mix(DEEP, P.brique, 0.3), P.terreSeche),
  logEnd: M.logEnd,
  iron: M.iron,
  burlap: M.burlap,
  canvas: M.canvas,
  hay: ramp(mix(P.jauneBle, P.ocre, 0.35), mix(P.terreCuite, SHADE, 0.35), P.lumiereDoree),
  clay: ramp(mix(P.terreCuite, P.ocre, 0.25), mix(P.brique, SHADE, 0.5), P.ocreClair),
  rock: ramp(mix(P.grisRoux, P.ardoise, 0.35), mix(DEEP, P.ombreViolette, 0.35), mix(P.pierre, P.lumiereChaude, 0.35)),
  rockWarm: ramp(mix(P.grisRoux, P.ocre, 0.25), mix(P.terreSombre, SHADE, 0.6), mix(P.parchemin, P.lumiereChaude, 0.3)),
  sandStone: ramp(mix(P.sable, P.pierre, 0.45), mix(P.terreCuite, SHADE, 0.5), P.parchemin),
  stone: M.stoneGrey,
  stoneWarm: M.stoneWarm,
  ruin: ramp(mix(P.pierre, P.ardoise, 0.35), mix(DEEP, P.violetBrume, 0.3), P.parchemin),
  moss: M.moss,
  leaf: ramp(mix(P.mousse, P.vertDore, 0.32), mix(P.vertProfond, P.ombreViolette, 0.5), mix(P.vertDore, P.lumiereChaude, 0.5)),
  snow: ramp(P.ecume, mix(P.ardoise, P.violetPale, 0.45), 0xffffff),
  water: ramp(mix(P.ardoise, P.nuitBleue, 0.4), P.ombreProfonde, P.ciel),
  rope: ramp(mix(P.sable, P.ocre, 0.4), mix(P.terreSombre, SHADE, 0.4), P.parchemin),
  red: ramp(mix(P.rougeCendre, P.brique, 0.2), mix(P.brique, P.ombreViolette, 0.6), mix(P.orangeForge, P.ocreClair, 0.4)),
  blue: ramp(mix(P.bleuGris, P.ardoise, 0.2), mix(P.ombreProfonde, P.bleuGris, 0.25), mix(P.ciel, P.ecume, 0.4)),
  green: ramp(mix(P.mousse, P.vertProfond, 0.3), DEEP, P.oliveClair),
  white: ramp(mix(P.ecume, P.parchemin, 0.4), mix(P.ardoise, P.violetPale, 0.4), 0xfffaf0),
  gold: ramp(P.jauneBle, mix(P.ambre, P.brique, 0.4), P.lumiereDoree),
} as const;

const FLOWER = [mix(P.rougeCendre, P.orangeForge, 0.3), P.jauneBle, P.ecume, mix(P.violetPale, P.violetBrume, 0.3), P.ciel] as const;

/* ---------- Outils ---------- */

const tone = (r: Ramp, t: number): number => {
  const k = Math.max(0, Math.min(4, Math.round(t)));
  return k === 0 ? r.deep : k === 1 ? r.dark : k === 2 ? r.base : k === 3 ? r.light : r.hi;
};
const h = (x: number, y: number, s: number): number => hash2(x, y, s);

const LIGHT = (() => {
  const v = [-0.5, -0.72, 0.55];
  const n = Math.hypot(v[0] as number, v[1] as number, v[2] as number);
  return v.map((c) => c / n) as [number, number, number];
})();

function rect(px: Px, x: number, y: number, w: number, hh: number, color: number): void {
  px.rect(x, y, w, hh, color);
}

/** Ligne de 1 px (pas de Bresenham, suffisant pour les manches et les cordes). */
function seg(px: Px, x0: number, y0: number, x1: number, y1: number, color: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), color);
}

/**
 * Volume arrondi éclairé comme une sphère (sacs, rochers, poteries, foin) :
 * `bump` déforme le bord pour casser la symétrie, `grain` ajoute la matière.
 */
function blob(px: Px, cx: number, cy: number, rx: number, ry: number, r: Ramp, seed: number, o: { bump?: number; grain?: number; flatBottom?: number } = {}): void {
  const bump = o.bump ?? 0;
  const grain = o.grain ?? 0.08;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const ang = Math.atan2(y - cy, x - cx);
      const k = 1 + bump * (Math.sin(ang * 3 + seed) * 0.6 + Math.sin(ang * 5 + seed * 2) * 0.4);
      const dx = (x + 0.5 - cx) / (rx * k);
      let dy = (y + 0.5 - cy) / (ry * k);
      if (o.flatBottom !== undefined && y > o.flatBottom) continue;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (o.flatBottom !== undefined) dy = Math.min(dy, 0.6);
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const lum = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2] + (h(x, y, seed) - 0.5) * grain * 2;
      px.set(x, y, lum > 0.86 ? r.hi : lum > 0.62 ? r.light : lum > 0.3 ? r.base : lum > 0.02 ? r.dark : r.deep);
    }
  }
}

/** Cylindre vertical (tonneau, poteau, tronc) : colonnes de gauche éclairées. */
function cylinder(px: Px, x0: number, x1: number, y0: number, y1: number, r: Ramp, seed = 0, grain = 0): void {
  const w = x1 - x0 + 1;
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0 + 0.5) / w;
    const base = u < 0.18 ? 3 : u < 0.32 ? 3.4 : u < 0.62 ? 2 : u < 0.86 ? 1 : 0.4;
    for (let y = y0; y <= y1; y++) px.set(x, y, tone(r, base - (grain && h(x, y, seed) < grain ? 1 : 0)));
  }
}

/** Ellipse pleine d'une couleur. */
function disc(px: Px, cx: number, cy: number, rx: number, ry: number, color: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px.set(x, y, color);
    }
  }
}

/**
 * Boîte vue en 3/4 : face du dessus (plus claire) puis face avant ; arête gauche
 * éclairée, droite dans l'ombre.
 */
function box(px: Px, x: number, y: number, w: number, top: number, front: number, r: Ramp, seed: number, planks = 3): void {
  for (let j = 0; j < top; j++) {
    for (let i = 0; i < w; i++) {
      let t = 3.4;
      if (j === 0) t = 4;
      if (i === w - 1) t = 2.6;
      if (planks && (i % (w > 8 ? 4 : 3) === 0) && i > 0) t -= 0.8;
      px.set(x + i, y + j, tone(r, t));
    }
  }
  for (let j = 0; j < front; j++) {
    for (let i = 0; i < w; i++) {
      let t = 2;
      if (i === 0) t = 2.8;
      if (i >= w - 2) t = 1.2;
      if (j === 0) t += 0.4;
      if (planks && j > 0 && j % planks === 0) t -= 0.9;
      if (h(x + i, y + j, seed) < 0.07) t -= 0.6;
      px.set(x + i, y + top + j, tone(r, t));
    }
  }
}

/** Petites touffes d'herbe au pied d'un objet. */
function tuft(px: Px, x: number, gy: number, seed: number, n = 3): void {
  const g = RAMPS.grass;
  for (let i = 0; i < n; i++) {
    const hh = 1 + Math.floor(h(x, i, seed) * 3);
    for (let j = 0; j < hh; j++) px.set(x + i, gy - j, j === hh - 1 ? g.hi : j === 0 ? g.dark : g.light);
  }
}

/** Copie `src` en faisant onduler son bas (`top` fixe) : linge et drapeaux au vent. */
function blitSwing(dst: Px, src: Px, sway: number, top: number, len: number): void {
  for (let y = 0; y < src.height; y++) {
    const f = Math.max(0, Math.min(1, (y - top) / len));
    const dx = Math.round(sway * f * 1.6);
    for (let x = 0; x < src.width; x++) {
      const a = src.alphaAt(x, y);
      if (a) dst.set(x + dx, y, src.colorAt(x, y), a);
    }
  }
}

/* ---------- Vie des villages ---------- */

/** Tonneau cerclé de fer (v0) ou tonneau de pluie ouvert, l'eau reflète le ciel (v1). */
export function paintBarrel(px: Px, _rnd: Rnd, variant: number): void {
  const x0 = 4;
  const x1 = 11;
  for (let y = 4; y <= 13; y++) {
    const inset = y === 4 || y === 13 ? 1 : 0;
    for (let x = x0 + inset; x <= x1 - inset; x++) {
      const u = (x - x0 + 0.5) / 8;
      let t = u < 0.2 ? 3 : u < 0.55 ? 2.2 : u < 0.85 ? 1.2 : 0.5;
      if ((x - x0) % 3 === 2) t -= 0.5; // douelles
      px.set(x, y, tone(MAT.wood, t));
    }
  }
  for (const y of [6, 11]) {
    for (let x = x0; x <= x1; x++) px.set(x, y, x < 6 ? MAT.iron.light : x > 9 ? MAT.iron.dark : MAT.iron.base);
  }
  // Dessus.
  disc(px, 7.9, 3.6, 4, 1.7, MAT.wood.dark);
  if (variant === 1) {
    disc(px, 7.9, 3.7, 3, 1.1, MAT.water.base);
    px.set(6, 3, MAT.water.hi);
    px.set(7, 3, MAT.water.light);
  } else {
    disc(px, 7.9, 3.5, 3, 1.1, MAT.wood.light);
    rect(px, 6, 3, 4, 1, MAT.wood.hi);
  }
  tuft(px, 3, 14, variant + 3, 2);
  finish(px, 2, 3);
}

/** Caisse clouée (v0) ou pile de deux caisses (v1). */
export function paintCrate(px: Px, _rnd: Rnd, variant: number): void {
  const r = MAT.plank;
  const crate = (x: number, y: number, w: number, top: number, front: number): void => {
    // Dessus : planches claires.
    for (let j = 0; j < top; j++) for (let i = 0; i < w; i++) px.set(x + i, y + j, tone(r, j === 0 ? 4 : i % 4 === 3 ? 2.6 : 3.5));
    const fy = y + top;
    for (let j = 0; j < front; j++) {
      for (let i = 0; i < w; i++) {
        const frame = i === 0 || i === w - 1 || j === 0 || j === front - 1;
        let t = frame ? 2.9 : (j - 1) % 3 === 2 ? 1 : 2;
        if (i >= w - 2) t -= 1;
        if (frame && i === 0) t = 3.3;
        px.set(x + i, fy + j, tone(r, t));
      }
    }
    // Croisillon.
    for (let i = 1; i < w - 1; i++) {
      const j = Math.round(1 + ((i - 1) * (front - 3)) / (w - 3));
      px.set(x + i, fy + j, r.light);
      px.set(x + i, fy + j + 1, r.dark);
    }
    for (const [cx, cy] of [[x + 1, fy + 1], [x + w - 2, fy + 1], [x + 1, fy + front - 2], [x + w - 2, fy + front - 2]] as const) px.set(cx, cy, MAT.iron.light);
  };
  if (variant === 1) {
    crate(3, 6, 12, 3, 7);
    crate(5, 0, 8, 2, 5);
  } else {
    crate(3, 3, 11, 3, 8);
  }
  tuft(px, 1, 14, variant + 7, 2);
  finish(px, 2, 2);
}

/** Sacs de toile de jute ficelés, un peu de grain répandu. */
export function paintSacks(px: Px, _rnd: Rnd, variant: number): void {
  const r = ramp(mix(P.ocre, P.terreSeche, 0.55), mix(P.terreSombre, SHADE, 0.45), P.ocreClair);
  const sack = (cx: number, by: number, w: number, hgt: number, seed: number): void => {
    const top = by - hgt;
    for (let y = top; y <= by; y++) {
      const v = (y - top) / hgt;
      // Profil : col étroit, panse large, base posée.
      const half = v < 0.12 ? 1 : v < 0.25 ? w * 0.32 : v > 0.92 ? w * 0.44 : w * (0.4 + 0.1 * Math.sin((Math.PI * (v - 0.25)) / 0.67));
      for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
        const u = (x + 0.5 - (cx - half)) / (half * 2);
        let t = u < 0.25 ? 3.3 : u < 0.6 ? 2.3 : u < 0.85 ? 1.4 : 0.6;
        if (v > 0.25 && v < 0.35) t -= 0.5; // pli sous le lien
        if (v > 0.9) t -= 0.6;
        if (h(x, y, seed) < 0.12) t -= 0.5;
        px.set(x, y, tone(r, t));
      }
    }
    // Lien et oreilles du col.
    rect(px, Math.round(cx - w * 0.32), Math.round(top + hgt * 0.22), Math.round(w * 0.64), 1, MAT.rope.dark);
    px.set(Math.round(cx - 2), top, r.hi);
    px.set(Math.round(cx + 1), top, r.light);
  };
  sack(5.5, 13, 8, 10, 1);
  sack(11.5, 13, 7, 8, 2);
  if (variant === 1) {
    // Sac ouvert, grain doré.
    disc(px, 11.5, 5.6, 2.4, 1, MAT.gold.base);
    px.set(11, 5, MAT.gold.hi);
  }
  for (const [x, y] of [[2, 14], [4, 15], [14, 14], [9, 15]] as const) px.set(x, y, MAT.gold.base);
  finish(px, 2, 2);
}

/** Botte de foin cerclée de ficelle, brins qui dépassent. */
export function paintHay(px: Px, _rnd: Rnd): void {
  const x = 2;
  const y = 4;
  const w = 12;
  for (let j = 0; j < 3; j++) for (let i = 0; i < w; i++) px.set(x + i, y + j, tone(MAT.hay, h(i, j, 3) < 0.35 ? 3 : 4 - (i === w - 1 ? 1 : 0)));
  for (let j = 3; j < 10; j++) {
    for (let i = 0; i < w; i++) {
      let t = i < 2 ? 3 : i > w - 3 ? 1 : 2;
      if (h(i, j, 9) < 0.25) t -= 0.7; // brins
      if (h(i, j >> 1, 4) < 0.15) t += 0.6;
      px.set(x + i, y + j, tone(MAT.hay, t));
    }
  }
  for (const bx of [x + 3, x + 8]) {
    for (let j = 0; j < 10; j++) px.set(bx, y + j, j < 3 ? MAT.rope.light : MAT.rope.dark);
  }
  // Brins qui dépassent.
  for (const [sx, sy] of [[3, 3], [7, 3], [12, 3], [14, 8]] as const) px.set(sx, sy, MAT.hay.hi);
  finish(px, 2, 3);
}

/** Jardinière de bois fleurie (trois coloris). */
export function paintPlanter(px: Px, _rnd: Rnd, variant: number): void {
  // Feuillage.
  blob(px, 5, 7.5, 3.4, 2.6, MAT.leaf, 1 + variant, { bump: 0.12, grain: 0.2 });
  blob(px, 10.5, 7.3, 3.6, 2.8, MAT.leaf, 3 + variant, { bump: 0.12, grain: 0.2 });
  // Fleurs.
  const c1 = FLOWER[variant % FLOWER.length] as number;
  const c2 = FLOWER[(variant + 2) % FLOWER.length] as number;
  for (const [x, y, c] of [[3, 6, c1], [6, 5, c2], [9, 5, c1], [12, 6, c1], [7, 7, c1], [11, 8, c2], [4, 8, c2]] as const) {
    px.set(x, y, c);
    px.set(x + 1, y, mix(c, P.ombreViolette, 0.35));
    px.set(x, y - 1, mix(c, 0xffffff, 0.45));
  }
  // Bac.
  box(px, 2, 9, 12, 1, 5, MAT.plank, 4, 0);
  rect(px, 2, 9, 12, 1, MAT.plank.light);
  for (let i = 2; i < 14; i += 4) for (let j = 11; j < 15; j++) px.set(i + 3, j, MAT.plank.dark);
  finish(px, 2, 2);
}

/** Râteau, pelle et seau contre un petit chevalet. */
export function paintTools(px: Px, _rnd: Rnd): void {
  // Chevalet.
  for (const x of [2, 13]) rect(px, x, 4, 1, 10, MAT.oldWood.dark);
  rect(px, 2, 4, 12, 1, MAT.oldWood.light);
  rect(px, 2, 5, 12, 1, MAT.oldWood.dark);
  // Râteau.
  seg(px, 5, 1, 4, 13, MAT.wood.light);
  seg(px, 6, 1, 5, 13, MAT.wood.dark);
  rect(px, 2, 1, 7, 1, MAT.iron.base);
  for (let i = 0; i < 4; i++) px.set(2 + i * 2, 0, MAT.iron.light);
  // Pelle.
  seg(px, 9, 2, 10, 9, MAT.wood.light);
  rect(px, 9, 1, 3, 1, MAT.wood.dark);
  rect(px, 9, 10, 3, 4, MAT.iron.base);
  rect(px, 9, 10, 1, 4, MAT.iron.light);
  rect(px, 11, 10, 1, 4, MAT.iron.dark);
  px.set(10, 14, MAT.iron.dark);
  // Seau.
  for (let y = 10; y <= 14; y++) for (let x = 12; x <= 15; x++) px.set(x, y, x === 12 ? MAT.wood.light : x === 15 ? MAT.wood.deep : MAT.wood.base);
  rect(px, 12, 11, 4, 1, MAT.iron.base);
  rect(px, 12, 10, 4, 1, MAT.water.base);
  finish(px, 1, 2);
}

/** Tas de bûches (vues de bout) et billot avec sa hache (2×1). */
export function paintWoodpile(px: Px, _rnd: Rnd): void {
  // Bûches de long derrière les bouts.
  for (let row = 0; row < 3; row++) {
    const y = 10 - row * 3;
    const x1 = 22 - row * 3;
    for (let yy = y; yy < y + 4; yy++) for (let x = 3 + row * 2; x <= x1; x++) px.set(x, yy, tone(MAT.bark, yy === y ? 3 : yy === y + 3 ? 1 : 2 - (h(x, yy, 3) < 0.2 ? 1 : 0)));
  }
  // Bouts des bûches.
  const ends: [number, number][] = [[4, 12], [8, 12.4], [12, 12], [6, 9], [10, 9.2], [8, 6]];
  for (const [cx, cy] of ends) {
    disc(px, cx, cy, 2.3, 2, MAT.bark.dark);
    disc(px, cx - 0.2, cy - 0.2, 1.6, 1.4, MAT.logEnd.base);
    px.set(Math.round(cx - 1), Math.round(cy - 1), MAT.logEnd.hi);
    px.set(Math.round(cx), Math.round(cy), MAT.logEnd.dark);
  }
  // Billot et hache.
  for (let y = 9; y <= 13; y++) for (let x = 25; x <= 30; x++) px.set(x, y, x === 25 ? MAT.bark.light : x >= 29 ? MAT.bark.dark : MAT.bark.base);
  disc(px, 27.5, 8.6, 3, 1.3, MAT.logEnd.base);
  px.set(26, 8, MAT.logEnd.hi);
  seg(px, 28, 8, 31, 3, MAT.wood.light);
  rect(px, 26, 6, 3, 2, MAT.iron.light);
  px.set(26, 7, MAT.iron.dark);
  // Copeaux.
  for (const [x, y] of [[23, 14], [24, 13], [31, 14]] as const) px.set(x, y, MAT.logEnd.light);
  finish(px, 2, 3);
}

/** Banc de bois sur deux pieds (2×1). */
export function paintBench(px: Px, _rnd: Rnd): void {
  for (const x of [5, 25]) {
    rect(px, x, 9, 2, 5, MAT.plank.dark);
    px.set(x, 9, MAT.plank.base);
  }
  // Dossier.
  rect(px, 3, 2, 26, 2, MAT.plank.base);
  rect(px, 3, 2, 26, 1, MAT.plank.hi);
  for (const x of [5, 26]) rect(px, x, 4, 1, 4, MAT.plank.dark);
  // Assise.
  rect(px, 3, 7, 26, 2, MAT.plank.light);
  rect(px, 3, 7, 26, 1, MAT.plank.hi);
  rect(px, 3, 9, 26, 1, MAT.plank.deep);
  for (let x = 6; x < 28; x += 7) px.set(x, 7, MAT.plank.base);
  finish(px, 2, 3);
}

/** Charrette à foin : grande roue, ridelles, chargement (2×2, le foin passe sur `canopy`). */
export function paintCart(px: Px, _rnd: Rnd): void {
  // Brancards.
  seg(px, 24, 20, 31, 24, MAT.wood.dark);
  seg(px, 24, 21, 31, 25, MAT.wood.base);
  // Chargement de foin.
  blob(px, 13, 12, 11, 7, MAT.hay, 4, { bump: 0.08, grain: 0.28 });
  for (let i = 0; i < 14; i++) px.set(3 + Math.floor(h(i, 0, 5) * 20), 6 + Math.floor(h(i, 1, 5) * 10), MAT.hay.dark);
  // Caisse.
  box(px, 2, 16, 23, 1, 7, MAT.plank, 7, 3);
  for (const x of [2, 12, 24]) rect(px, x, 17, 1, 7, MAT.plank.dark);
  // Roue.
  for (let y = 18; y <= 31; y++) for (let x = 2; x <= 16; x++) {
    const d = Math.hypot(x + 0.5 - 9, y + 0.5 - 25);
    if (d <= 6.2 && d > 5.4) px.set(x, y, MAT.wood.deep);
    else if (d <= 5.4 && d > 4.2) px.set(x, y, x + y < 33 ? MAT.wood.light : MAT.wood.dark);
  }
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI;
    seg(px, Math.round(9 - Math.cos(ang) * 4), Math.round(25 - Math.sin(ang) * 4), Math.round(9 + Math.cos(ang) * 4), Math.round(25 + Math.sin(ang) * 4), MAT.wood.base);
  }
  rect(px, 8, 24, 2, 2, MAT.iron.light);
  finish(px, 3, 3);
}

/** Lampadaire de fer forgé à lanterne (1×2, la lanterne passe sur `canopy`). */
export function paintLampPost(px: Px, _rnd: Rnd): void {
  // Socle de pierre.
  box(px, 4, 26, 8, 1, 3, MAT.stone, 2, 0);
  // Fût.
  cylinder(px, 7, 8, 9, 25, MAT.iron);
  rect(px, 6, 23, 4, 1, MAT.iron.base);
  // Potence et lanterne.
  rect(px, 5, 8, 6, 1, MAT.iron.base);
  rect(px, 4, 2, 8, 1, MAT.iron.light);
  rect(px, 5, 1, 6, 1, MAT.iron.base);
  px.set(7, 0, MAT.iron.light);
  for (let y = 3; y <= 7; y++) {
    px.set(4, y, MAT.iron.base);
    px.set(11, y, MAT.iron.dark);
    for (let x = 5; x <= 10; x++) px.set(x, y, y === 3 ? P.lumiereDoree : y === 7 ? P.braise : x === 7 || x === 8 ? 0xfff4d6 : y < 6 ? P.lumiereDoree : mix(P.braise, P.lumiereDoree, 0.5));
  }
  rect(px, 7, 3, 1, 5, MAT.iron.dark);
  finish(px, 3, 4);
}

/** Corde à linge entre deux poteaux, le linge ondule au vent (3×2, 4 images). */
export function paintLaundry(px: Px, _rnd: Rnd, variant: number, frame: number): void {
  // Poteaux.
  for (const x of [3, 44]) {
    cylinder(px, x, x + 1, 3, 29, MAT.oldWood);
    rect(px, x - 1, 3, 4, 1, MAT.oldWood.light);
  }
  // Corde (légère courbe).
  for (let x = 5; x < 44; x++) px.set(x, 4 + Math.round(Math.sin(((x - 5) / 39) * Math.PI) * 3), MAT.rope.light);
  // Linge (calque à part, cisaillé selon le vent).
  const cloth = new Px(px.width, px.height);
  const rope = (x: number): number => 4 + Math.round(Math.sin(((x - 5) / 39) * Math.PI) * 3);
  const items: [number, number, number, Ramp][] = variant === 0
    ? [[7, 9, 9, MAT.white], [18, 7, 7, MAT.blue], [27, 8, 8, MAT.red], [37, 5, 6, MAT.white]]
    : [[8, 7, 8, MAT.green], [17, 10, 9, MAT.white], [29, 6, 7, MAT.gold], [37, 5, 6, MAT.blue]];
  for (const [x0, w, len, r] of items) {
    for (let i = 0; i < w; i++) {
      const top = rope(x0 + i) + 1;
      const hh = len - (i === 0 || i === w - 1 ? 1 : 0) - (h(i, x0, 2) < 0.2 ? 1 : 0);
      for (let j = 0; j < hh; j++) {
        let t = i < 2 ? 3.2 : i > w - 3 ? 1.4 : 2.2;
        if (j === 0) t += 0.6;
        if ((i + x0) % 4 === 0) t -= 0.6; // plis
        cloth.set(x0 + i, top + j, tone(r, t));
      }
    }
    // Pinces.
    cloth.set(x0 + 1, rope(x0 + 1), MAT.wood.light);
    cloth.set(x0 + w - 2, rope(x0 + w - 2), MAT.wood.light);
  }
  blitSwing(px, cloth, SWAY[frame % 4] as number, 5, 10);
  finish(px, 3, 4);
}

/** Étal de marché : auvent rayé, comptoir et marchandises (2×2 ; v0 fruits, v1 poissons, v2 poteries). */
export function paintStall(px: Px, _rnd: Rnd, variant: number): void {
  const cloth = [MAT.red, MAT.blue, MAT.gold][variant % 3] as Ramp;
  // Poteaux.
  for (const x of [3, 28]) cylinder(px, x, x + 1, 6, 28, MAT.wood);
  // Comptoir.
  box(px, 2, 19, 28, 2, 8, MAT.plank, 3 + variant, 3);
  // Marchandises.
  if (variant === 0) {
    for (let i = 0; i < 9; i++) {
      const c = [MAT.red, MAT.gold, MAT.green][i % 3] as Ramp;
      const x = 5 + i * 2.6;
      disc(px, x, 18, 1.5, 1.4, c.base);
      px.set(Math.round(x - 0.6), 17, c.hi);
    }
  } else if (variant === 1) {
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 6;
      for (let k = 0; k < 5; k++) px.set(x + k, 18, k === 0 ? MAT.blue.hi : MAT.blue.light);
      for (let k = 0; k < 5; k++) px.set(x + k, 19, MAT.blue.base);
      px.set(x + 5, 18, MAT.blue.dark);
      px.set(x + 5, 19, MAT.blue.dark);
      px.set(x + 1, 18, P.nuit);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 5;
      blob(px, x, 16.5 - (i % 2), 2, 2.4 + (i % 2), MAT.clay, i, { grain: 0.05 });
      px.set(x, 13 - (i % 2) * 2, MAT.clay.dark);
    }
  }
  // Auvent rayé, bord festonné.
  for (let y = 2; y <= 10; y++) {
    const inset = Math.max(0, 3 - (y - 2));
    for (let x = 1 + inset; x <= 30 - inset; x++) {
      const stripe = Math.floor((x - 1) / 4) % 2 === 0;
      const r = stripe ? cloth : MAT.white;
      let t = y < 4 ? 3.6 : y > 8 ? 1.6 : 2.4;
      if (x > 27) t -= 0.8;
      px.set(x, y, tone(r, t));
    }
  }
  for (let x = 1; x <= 30; x++) if (x % 4 !== 0) px.set(x, 11, tone(Math.floor((x - 1) / 4) % 2 === 0 ? cloth : MAT.white, 1.2));
  finish(px, 3, 4);
}

/** Puits de pierre à petit toit de bardeaux, treuil et seau (1×2, le toit passe sur `canopy`). */
export function paintWell(px: Px, _rnd: Rnd): void {
  // Margelle (anneau vu en 3/4).
  for (let y = 18; y <= 28; y++) {
    for (let x = 1; x <= 14; x++) {
      const dx = (x + 0.5 - 8) / 7;
      if (Math.abs(dx) > 1) continue;
      const topY = 21 - Math.round(Math.sqrt(1 - dx * dx) * 2);
      if (y < topY) continue;
      const course = Math.floor((y - 19) / 3);
      const joint = (y - 19) % 3 === 2 || (x + course * 2) % 5 === 0;
      let t = joint ? 1 : 2.2;
      if (x <= 2) t += 1;
      if (x >= 13) t -= 1;
      if (y === topY || y === topY + 1) t = 3.6;
      px.set(x, y, tone(MAT.stone, t));
    }
  }
  disc(px, 8, 21, 5, 1.6, MAT.water.deep);
  px.set(6, 21, MAT.water.base);
  // Poteaux et treuil.
  for (const x of [2, 13]) cylinder(px, x, x, 7, 21, MAT.wood);
  rect(px, 3, 10, 10, 1, MAT.wood.light);
  rect(px, 3, 11, 10, 1, MAT.wood.dark);
  seg(px, 8, 12, 8, 16, MAT.rope.base);
  rect(px, 7, 16, 3, 3, MAT.wood.base);
  px.set(7, 16, MAT.iron.light);
  // Toit à deux pans.
  for (let y = 0; y <= 7; y++) {
    const half = 2 + y;
    for (let x = 8 - half; x < 8 + half; x++) {
      if (x < 0 || x > 15) continue;
      const left = x < 8;
      let t = left ? 3 : 1.6;
      if ((y + (left ? 0 : 1)) % 3 === 0) t -= 0.8;
      if (y === 7) t -= 0.6;
      px.set(x, y, tone(M.shingle, t));
    }
  }
  rect(px, 7, 0, 2, 1, M.shingle.hi);
  finish(px, 3, 3);
}

/** Poteau indicateur à deux flèches. */
export function paintSign(px: Px): void {
  cylinder(px, 7, 8, 3, 14, MAT.oldWood);
  const arrow = (y: number, dir: 1 | -1): void => {
    const x0 = dir === 1 ? 4 : 2;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) px.set(x0 + i, y + j, j === 0 ? MAT.plank.hi : j === 2 ? MAT.plank.dark : MAT.plank.base);
    const tip = dir === 1 ? x0 + 9 : x0 - 1;
    px.set(tip, y + 1, MAT.plank.base);
    px.set(tip, y, MAT.plank.dark);
    px.set(tip, y + 2, MAT.plank.dark);
    for (let i = 2; i < 7; i += 2) px.set(x0 + i, y + 1, MAT.plank.deep);
  };
  arrow(3, 1);
  arrow(7, -1);
  tuft(px, 6, 14, 5, 4);
  finish(px, 2, 2);
}

/** Tableau d'affichage couvert, avis punaisés (2×2). */
export function paintBoard(px: Px, _rnd: Rnd): void {
  for (const x of [4, 27]) cylinder(px, x, x + 1, 6, 28, MAT.wood);
  // Panneau.
  box(px, 3, 10, 26, 1, 13, MAT.plank, 6, 4);
  // Avis.
  const notes: [number, number, number, number][] = [[6, 13, 6, 7], [14, 12, 5, 5], [20, 14, 6, 6], [13, 18, 5, 4]];
  for (const [x, y, w, hh] of notes) {
    rect(px, x, y, w, hh, MAT.white.base);
    rect(px, x, y, w, 1, MAT.white.hi);
    rect(px, x + w - 1, y, 1, hh, MAT.white.dark);
    for (let j = y + 2; j < y + hh - 1; j += 2) rect(px, x + 1, j, w - 3, 1, MAT.white.deep);
    px.set(x + Math.floor(w / 2), y, MAT.red.base);
  }
  // Petit toit.
  for (let y = 4; y <= 9; y++) {
    for (let x = 1 + Math.max(0, 9 - y - 3); x <= 30 - Math.max(0, 9 - y - 3); x++) px.set(x, y, tone(M.shingle, y < 6 ? 3.4 : y === 9 ? 1 : 2.2 - (x > 26 ? 0.8 : 0)));
  }
  finish(px, 3, 4);
}

/** Poteries et amphores de terre cuite. */
export function paintPots(px: Px, _rnd: Rnd): void {
  blob(px, 5, 9, 3.6, 4.6, MAT.clay, 2, { grain: 0.06, flatBottom: 13 });
  rect(px, 4, 3, 3, 2, MAT.clay.base);
  rect(px, 3, 3, 5, 1, MAT.clay.light);
  blob(px, 11, 11, 3, 3, MAT.clay, 5, { grain: 0.06, flatBottom: 14 });
  rect(px, 10, 7, 3, 1, MAT.clay.light);
  // Frise peinte.
  for (let x = 2; x <= 8; x += 2) px.set(x, 8, MAT.white.base);
  for (let x = 9; x <= 13; x += 2) px.set(x, 11, MAT.blue.light);
  finish(px, 2, 2);
}

/** Filet de pêche sur un séchoir, flotteurs de liège. */
export function paintNets(px: Px, _rnd: Rnd): void {
  for (const x of [2, 13]) cylinder(px, x, x, 2, 14, MAT.oldWood);
  rect(px, 2, 2, 12, 1, MAT.oldWood.light);
  const net = mix(P.bleuGris, P.sable, 0.45);
  const netDark = mix(net, SHADE, 0.45);
  for (let y = 3; y <= 12; y++) {
    const sag = Math.round(Math.sin(((y - 3) / 9) * Math.PI) * 1.5);
    for (let x = 3 + sag; x <= 12 - sag; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) px.set(x, y, y > 9 ? netDark : net);
  }
  for (const [x, y] of [[4, 4], [8, 4], [11, 4], [6, 11]] as const) {
    rect(px, x, y, 2, 2, MAT.gold.base);
    px.set(x, y, MAT.gold.hi);
  }
  finish(px, 2, 2);
}

/* ---------- Nature ---------- */

/** Rocher facetté (v0), rocher moussu (v1), galet clair des plages (v2), avec cailloux. */
export function paintRock(px: Px, _rnd: Rnd, variant: number): void {
  const r = variant === 2 ? MAT.sandStone : variant === 1 ? MAT.rock : MAT.rockWarm;
  blob(px, 7.5, 9.5, variant === 2 ? 6 : 5.6, variant === 2 ? 3.6 : 4.6, r, 3 + variant, { bump: 0.14, grain: 0.06, flatBottom: 13 });
  // Arêtes de facettes.
  const edge = mix(r.dark, r.deep, 0.4);
  if (variant !== 2) {
    seg(px, 5, 7, 7, 10, edge);
    seg(px, 7, 10, 11, 9, edge);
    px.set(6, 7, r.hi);
    px.set(4, 8, r.hi);
  } else {
    seg(px, 4, 10, 9, 11, edge);
  }
  if (variant === 1) {
    // Mousse sur le dessus.
    for (let x = 3; x <= 11; x++) {
      for (let y = 5; y <= 8; y++) {
        if (px.alphaAt(x, y) !== 255 || px.alphaAt(x, y - 2) === 255) continue;
        if (h(x, y, 8) < 0.75) px.set(x, y, tone(MAT.moss, y === 5 || px.alphaAt(x, y - 1) !== 255 ? 3.5 : 2));
      }
    }
  }
  // Cailloux.
  disc(px, 13, 13.5, 1.4, 1, r.light);
  px.set(13, 13, r.hi);
  disc(px, 2, 14, 1, 0.8, r.base);
  finish(px, 2, 2);
}

/** Cailloux et touffes posés au sol (non bloquant) : sans contour, juste une ombre de contact. */
export function paintPebbles(px: Px, _rnd: Rnd, variant: number): void {
  const r = variant === 1 ? MAT.sandStone : MAT.rockWarm;
  const spots: [number, number, number][] = variant === 2 ? [[4, 10, 1.6], [10, 6, 1.2], [12, 12, 1]] : [[3, 12, 1.4], [7, 13, 1], [11, 9, 1.6], [12, 13, 1]];
  for (const [x, y, sz] of spots) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const w = Math.max(2, Math.round(sz * 2));
    for (let i = 0; i < w; i++) px.set(cx + i + 1, cy + 1, SHADE, 90);
    for (let i = 0; i < w; i++) px.set(cx + i, cy, i === w - 1 ? r.dark : r.base);
    for (let i = 0; i < w - 1; i++) px.set(cx + i, cy - 1, i === 0 ? r.hi : r.light);
  }
  if (variant !== 1) tuft(px, 6, 9, variant, 3);
}

/** Souche aux cernes clairs (v0), avec une hache plantée (v1). */
export function paintStump(px: Px, _rnd: Rnd, variant: number): void {
  // Racines.
  for (const [x0, x1] of [[2, 5], [11, 14]] as const) for (let x = x0; x <= x1; x++) px.set(x, 13, MAT.bark.dark);
  px.set(3, 12, MAT.bark.base);
  px.set(12, 12, MAT.bark.dark);
  cylinder(px, 4, 11, 7, 13, MAT.bark, 3, 0.15);
  disc(px, 7.5, 6.8, 4, 1.8, MAT.logEnd.base);
  for (let x = 5; x <= 10; x++) px.set(x, 6, MAT.logEnd.light);
  px.set(7, 7, MAT.logEnd.dark);
  px.set(5, 7, MAT.logEnd.hi);
  // Mousse.
  px.set(4, 12, MAT.moss.light);
  px.set(5, 13, MAT.moss.base);
  if (variant === 1) {
    seg(px, 9, 6, 13, 1, MAT.wood.light);
    seg(px, 10, 6, 14, 1, MAT.wood.dark);
    rect(px, 7, 4, 3, 2, MAT.iron.light);
    px.set(7, 5, MAT.iron.dark);
  } else {
    // Champignons.
    px.set(12, 10, MAT.clay.light);
    px.set(13, 10, MAT.clay.base);
    px.set(12, 11, MAT.white.base);
  }
  finish(px, 2, 2);
}

/** Tronc moussu couché, champignons (2×1). */
export function paintLog(px: Px, _rnd: Rnd): void {
  for (let y = 6; y <= 12; y++) {
    for (let x = 4; x <= 27; x++) {
      const v = (y - 6) / 6;
      let t = v < 0.2 ? 3.2 : v < 0.6 ? 2 : v < 0.85 ? 1 : 0.3;
      if (h(x >> 1, y, 4) < 0.18) t -= 0.7;
      px.set(x, y, tone(MAT.bark, t));
    }
  }
  // Bout coupé.
  disc(px, 27.5, 9, 2.2, 3.4, MAT.logEnd.base);
  px.set(27, 7, MAT.logEnd.hi);
  px.set(28, 9, MAT.logEnd.dark);
  // Mousse sur le dessus.
  for (let x = 6; x <= 24; x++) if (h(x, 0, 6) < 0.7) px.set(x, 6 - (h(x, 1, 6) < 0.3 ? 1 : 0), tone(MAT.moss, 3));
  for (let x = 7; x <= 23; x++) if (h(x, 2, 6) < 0.5) px.set(x, 7, MAT.moss.base);
  // Branche cassée, champignons.
  seg(px, 10, 6, 8, 2, MAT.bark.light);
  for (const x of [14, 17, 19]) {
    px.set(x, 12, MAT.red.light);
    px.set(x + 1, 12, MAT.red.base);
    px.set(x, 13, MAT.white.base);
  }
  finish(px, 2, 2);
}

/** Touffe de champignons (rouges à pois ou bruns), non bloquante. */
export function paintMushrooms(px: Px, _rnd: Rnd, variant: number): void {
  const cap = variant === 0 ? MAT.red : MAT.clay;
  for (const [x, y, s] of [[5, 11, 2], [9, 12, 1.5], [11, 9, 1.2]] as const) {
    rect(px, Math.round(x) - 0, Math.round(y), 1, Math.ceil(s) + 1, MAT.white.base);
    disc(px, x + 0.5, y, s + 0.3, s * 0.7, cap.base);
    px.set(Math.round(x - s * 0.5), Math.round(y - s * 0.4), cap.hi);
    if (variant === 0) px.set(Math.round(x + 1), Math.round(y - 0.4), MAT.white.hi);
  }
  tuft(px, 2, 13, 4 + variant, 2);
  finish(px, 1, 1);
}

/**
 * Falaise (tuile répétable) : lèvre d'herbe (v0), de neige (v1) ou de pierre (v2),
 * paroi en pans verticaux éclairés à gauche, corniches, éboulis au pied.
 */
export function paintCliff(px: Px, _rnd: Rnd, variant: number): void {
  const r = variant === 2 ? MAT.stoneWarm : MAT.rock;
  const lip = variant === 1 ? MAT.snow : variant === 2 ? MAT.stoneWarm : MAT.leaf;
  const cuts = variant === 1 ? [0, 6, 11, 16] : variant === 2 ? [0, 4, 10, 16] : [0, 5, 9, 16];
  for (let s = 0; s < cuts.length - 1; s++) {
    const a = cuts[s] as number;
    const b = cuts[s + 1] as number;
    for (let x = a; x < b; x++) {
      const u = (x - a) / (b - a - 1 || 1);
      for (let y = 3; y < T; y++) {
        let t = u < 0.25 ? 3 : u < 0.7 ? 2 : 1;
        if (x === b - 1) t = 0.6;
        if (y >= 13) t -= 0.8;
        if ((y === 8 + s || y === 9 + s) && h(x, s, 2) < 0.8) t = y === 8 + s ? 3.6 : 0.8; // corniche
        if (h(x, y, 7 + variant) < 0.06) t -= 0.7;
        px.set(x, y, tone(r, t));
      }
    }
  }
  // Lèvre du haut (herbe qui retombe, neige ou arête).
  for (let x = 0; x < T; x++) {
    const drop = 3 + (h(x, 0, 3 + variant) < 0.45 ? 1 : 0) + (variant === 0 && h(x, 1, 3) < 0.25 ? 2 : 0);
    for (let y = 0; y < drop; y++) px.set(x, y, tone(lip, y === 0 ? 4 : y === drop - 1 ? 1.2 : y === 1 ? 3.4 : 2.4));
  }
  // Éboulis.
  for (const [x, y] of [[2, 14], [7, 15], [12, 14]] as const) {
    px.set(x, y, r.light);
    px.set(x + 1, y, r.base);
  }
}

/* ---------- Pierre, remparts, ruines ---------- */

/** Pierres en assises décalées, arête éclairée en haut à gauche de chaque bloc. */
function masonry(px: Px, x0: number, x1: number, y0: number, y1: number, r: Ramp, seed: number, rowH = 4, moss = 0): void {
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / rowH);
    const ly = (y - y0) % rowH;
    for (let x = x0; x <= x1; x++) {
      const off = (row % 2) * 3;
      const lx = (x - x0 + off) % 6;
      const joint = ly === rowH - 1 || lx === 5;
      let t = joint ? 0.9 : ly === 0 || lx === 0 ? 3 : 2;
      if (!joint && h(Math.floor((x - x0 + off) / 6), row, seed) < 0.25) t -= 0.5;
      if (!joint && h(x, y, seed) < 0.05) t -= 0.6;
      if (moss && y > y1 - 3 && h(x, y, seed + 1) < moss) {
        px.set(x, y, tone(MAT.moss, 2 + (y === y1 - 2 ? 1 : 0)));
        continue;
      }
      px.set(x, y, tone(r, t));
    }
  }
}

/** Rempart (face sud) : merlons, chemin de ronde, appareil de pierre, meurtrière (v1). */
export function paintWallH(px: Px, _rnd: Rnd, variant: number): void {
  const r = MAT.stoneWarm;
  // Chemin de ronde vu d'en haut.
  for (let x = 0; x < T; x++) for (let y = 2; y < 5; y++) px.set(x, y, tone(r, y === 2 ? 2 : 3.2 - (x % 5 === 0 ? 0.8 : 0)));
  // Merlons.
  for (const mx of variant === 0 ? [0, 8] : [3, 11]) {
    for (let x = mx; x < mx + 5 && x < T; x++) for (let y = 0; y < 3; y++) px.set(x, y, tone(r, y === 0 ? 4 : x === mx ? 3.2 : x === mx + 4 ? 1.2 : 2.6));
  }
  // Face.
  masonry(px, 0, T - 1, 5, 15, r, 11 + variant, 4, 0.3);
  rect(px, 0, 5, T, 1, mix(r.deep, DEEP, 0.3));
  if (variant === 1) {
    rect(px, 7, 8, 2, 5, P.nuitBleue);
    px.set(7, 8, r.deep);
    px.set(8, 12, r.light);
  }
}

/** Rempart (côté) : chemin de ronde vu de dessus entre deux parapets. */
export function paintWallV(px: Px, _rnd: Rnd): void {
  const r = MAT.stoneWarm;
  for (let y = 0; y < T; y++) {
    for (let x = 2; x <= 13; x++) {
      let t = 3;
      if (x <= 4) t = x === 2 ? 4 : 3.4; // parapet gauche éclairé
      else if (x >= 11) t = x === 13 ? 0.8 : 1.6; // parapet droit dans l'ombre
      else t = (y % 5 === 4 || x === 8) ? 2 : 2.8; // dalles
      if (h(x, y, 4) < 0.05) t -= 0.6;
      px.set(x, y, tone(r, t));
    }
    px.set(5, y, r.dark);
  }
  finish(px, 2, 0);
}

/** Tour d'angle carrée : couronne crénelée, dalle du sommet, face sud appareillée (2×2). */
export function paintTower(px: Px, _rnd: Rnd): void {
  const r = MAT.stoneWarm;
  // Sommet.
  for (let y = 2; y < 16; y++) {
    for (let x = 2; x < 30; x++) {
      const row = Math.floor((y - 2) / 4);
      const joint = (y - 2) % 4 === 3 || (x + row * 3) % 7 === 0;
      px.set(x, y, tone(r, joint ? 2 : h(Math.floor((x + row * 3) / 7), row, 3) < 0.3 ? 2.6 : 3));
    }
  }
  rect(px, 13, 7, 6, 4, MAT.plank.base); // trappe
  rect(px, 13, 7, 6, 1, MAT.plank.light);
  // Créneaux.
  for (let x = 1; x < 31; x++) {
    const merlon = Math.floor((x - 1) / 4) % 2 === 0;
    for (let y = merlon ? 0 : 2; y < 4; y++) px.set(x, y, tone(r, y === (merlon ? 0 : 2) ? 4 : 3));
  }
  for (const x of [1, 2, 29, 30]) for (let y = 3; y < 16; y++) px.set(x, y, tone(r, x < 16 ? 3.6 : 1.4));
  rect(px, 2, 15, 28, 1, mix(r.deep, DEEP, 0.3));
  // Face sud.
  masonry(px, 1, 30, 16, 31, r, 21, 4, 0.25);
  for (let y = 16; y < 32; y++) {
    px.set(1, y, r.light);
    px.set(30, y, r.deep);
  }
  // Meurtrière éclairée.
  rect(px, 15, 20, 2, 6, P.nuitBleue);
  rect(px, 15, 22, 2, 2, P.braise);
  px.set(15, 22, P.lumiereDoree);
  finish(px, 3, 0);
}

/** Palissade de rondins taillés en pointe, liés par une corde. */
export function paintPalisade(px: Px, _rnd: Rnd, variant: number): void {
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    const top = 1 + Math.floor(h(i, variant, 3) * 3);
    for (let y = top + 2; y < 15; y++) for (let k = 0; k < 4; k++) px.set(x + k, y, tone(MAT.bark, k === 0 ? 3 : k === 1 ? 2.4 : k === 2 ? 1.6 : 0.6));
    // Pointe taillée (bois clair).
    px.set(x + 1, top, MAT.logEnd.light);
    px.set(x + 2, top, MAT.logEnd.base);
    for (let k = 0; k < 4; k++) px.set(x + k, top + 1, k < 2 ? MAT.logEnd.light : MAT.logEnd.dark);
  }
  for (let x = 0; x < T; x++) {
    px.set(x, 7, x % 4 === 3 ? MAT.rope.dark : MAT.rope.light);
    px.set(x, 8, MAT.rope.dark);
  }
  finish(px, 2, 1);
}

/** Clôture de bois : lisses horizontales (v0) ou montant vertical (v1). */
export function paintFence(px: Px, _rnd: Rnd, variant: number): void {
  const r = MAT.oldWood;
  if (variant === 0) {
    for (const y of [6, 10]) {
      for (let x = 0; x < T; x++) {
        px.set(x, y, h(x, y, 2) < 0.15 ? r.base : r.light);
        px.set(x, y + 1, r.dark);
      }
    }
    for (const x of [2, 12]) {
      cylinder(px, x, x + 1, 4, 13, r);
      px.set(x, 3, r.hi);
      px.set(x + 1, 3, r.light);
    }
    tuft(px, 6, 13, 9, 3);
  } else {
    for (let y = 0; y < T; y++) {
      px.set(7, y, r.light);
      px.set(8, y, r.dark);
    }
    for (const y of [3, 11]) cylinder(px, 6, 9, y, y + 2, r);
  }
  finish(px, 2, 2);
}

/** Colonne cannelée (v0) ou brisée avec son fût tombé (v1), lierre (1×2). */
export function paintPillar(px: Px, _rnd: Rnd, variant: number): void {
  const r = MAT.ruin;
  const broken = variant % 2 === 1;
  const top = broken ? 13 : 5;
  // Base.
  box(px, 2, 25, 12, 1, 4, r, 3, 0);
  // Fût cannelé.
  for (let x = 4; x <= 11; x++) {
    for (let y = top; y <= 25; y++) {
      let t = x === 4 ? 3.4 : x <= 6 ? 3 : x <= 8 ? 2 : x <= 10 ? 1.2 : 0.5;
      if (x === 6 || x === 9) t -= 0.6; // cannelures
      if (h(x, y, 5) < 0.05) t -= 0.7;
      px.set(x, y, tone(r, t));
    }
  }
  if (!broken) {
    box(px, 2, 1, 12, 2, 3, r, 4, 0);
  } else {
    // Cassure irrégulière et fût tombé.
    for (let x = 4; x <= 11; x++) {
      const d = Math.floor(h(x, 1, 9) * 3);
      for (let y = top; y < top + d; y++) px.set(x, y, 0, 0);
      px.set(x, top + d, r.hi);
    }
  }
  // Lierre.
  for (let y = 15; y <= 26; y++) if (h(0, y, 7 + variant) < 0.55) px.set(4 + (y % 3 === 0 ? 1 : 0), y, tone(MAT.leaf, y % 2 ? 2 : 3));
  finish(px, 2, 3);
}

/** Muret de ruine aux pierres disjointes, hauteur selon la variante, mousse. */
export function paintRuinWall(px: Px, _rnd: Rnd, variant: number): void {
  const hh = 6 + (variant % 3) * 3;
  const y0 = 14 - hh;
  masonry(px, 0, T - 1, y0, 13, MAT.ruin, 30 + variant, 3, 0.35);
  // Crête cassée.
  for (let x = 0; x < T; x++) {
    const d = Math.floor(h(x >> 1, variant, 4) * 3);
    for (let y = y0; y < y0 + d; y++) px.set(x, y, 0, 0);
    if (px.alphaAt(x, y0 + d) === 255) px.set(x, y0 + d, MAT.ruin.hi);
  }
  // Moellons tombés.
  px.set(3, 14, MAT.ruin.light);
  px.set(11, 15, MAT.ruin.base);
  finish(px, 2, 1);
}

/** Menhir patiné : facettes, lichen, rune cyan qui luit (1×2). */
export function paintMenhir(px: Px, _rnd: Rnd): void {
  const r = MAT.ruin;
  for (let y = 2; y <= 29; y++) {
    const half = y < 7 ? 2 + (y - 2) * 0.8 : y > 26 ? 6 : 5 + (y > 18 ? 1 : 0);
    for (let x = Math.round(8 - half); x < Math.round(8 + half); x++) {
      const u = (x - (8 - half)) / (half * 2);
      let t = u < 0.3 ? 3.2 : u < 0.6 ? 2.2 : 1;
      if (y < 5) t += 0.6;
      if (h(x, y, 2) < 0.05) t -= 0.7;
      px.set(x, y, tone(r, t));
    }
  }
  // Lichen.
  for (let i = 0; i < 18; i++) {
    const x = 4 + Math.floor(h(i, 0, 3) * 9);
    const y = 12 + Math.floor(h(i, 1, 3) * 15);
    if (px.alphaAt(x, y) === 255) px.set(x, y, i % 3 === 0 ? P.ocre : MAT.moss.light);
  }
  // Rune.
  const rune: [number, number][] = [[8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 11], [9, 11], [6, 12], [10, 12], [7, 15], [9, 15]];
  for (const [x, y] of rune) {
    px.set(x, y, P.cyanEclat);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) if (px.colorAt(x + dx, y + dy) !== P.cyanEclat) px.blend(x + dx, y + dy, P.cyanEclat, 90);
  }
  px.set(8, 12, 0xeaffff);
  finish(px, 3, 3);
}

/** Cairn de pierres plates empilées. */
export function paintCairn(px: Px, _rnd: Rnd): void {
  blob(px, 8, 12, 5.5, 2.6, MAT.rock, 1, { grain: 0.05 });
  blob(px, 7.5, 8.8, 4, 2, MAT.rockWarm, 2, { grain: 0.05 });
  blob(px, 8.3, 6, 3, 1.6, MAT.rock, 3, { grain: 0.05 });
  blob(px, 7.8, 3.6, 1.8, 1.3, MAT.rockWarm, 4, { grain: 0.05 });
  tuft(px, 2, 14, 2, 2);
  finish(px, 2, 2);
}

/** Autel de pierre runique, cristal cyan flottant. */
export function paintAltar(px: Px, _rnd: Rnd): void {
  const r = MAT.ruin;
  box(px, 1, 9, 14, 2, 4, r, 2, 0);
  box(px, 3, 6, 10, 2, 2, r, 3, 0);
  for (const x of [3, 7, 11]) px.set(x, 13, P.cyanEclat);
  // Cristal.
  const crystal: [number, number, number][] = [[7, 0, 0xeaffff], [8, 0, P.cyanEclat], [6, 1, 0xeaffff], [7, 1, 0xeaffff], [8, 1, P.cyanEclat], [9, 1, mix(P.cyanEclat, P.bleuGris, 0.4)], [6, 2, P.cyanEclat], [7, 2, 0xeaffff], [8, 2, mix(P.cyanEclat, P.bleuGris, 0.3)], [9, 2, mix(P.cyanEclat, P.bleuGris, 0.5)], [7, 3, P.cyanEclat], [8, 3, mix(P.cyanEclat, P.bleuGris, 0.5)]];
  for (const [x, y, c] of crystal) px.set(x, y, c);
  for (const [x, y] of [[5, 2], [10, 2], [7, 4], [8, 4]] as const) px.blend(x, y, P.cyanEclat, 80);
  finish(px, 2, 2);
}

/* ---------- Côte ---------- */

/** Barque de pêche vue de 3/4, bancs et rame (2×1). */
export function paintBoat(px: Px, _rnd: Rnd): void {
  for (let x = 2; x <= 29; x++) {
    const u = (x - 2) / 27;
    const half = Math.round(Math.sin(u * Math.PI) * 5);
    for (let y = 8 - half; y <= 8 + half; y++) {
      const rim = y === 8 - half || y === 8 + half;
      const inner = !rim && y < 8 + half - 1;
      px.set(x, y, rim ? (y < 8 ? MAT.plank.hi : MAT.plank.dark) : inner ? tone(MAT.plank, y < 8 ? 1.6 : 1) : MAT.plank.deep);
    }
  }
  for (const x of [11, 19]) rect(px, x, 5, 2, 7, MAT.plank.light);
  seg(px, 8, 13, 24, 3, MAT.wood.light);
  rect(px, 23, 2, 3, 2, MAT.wood.base);
  finish(px, 2, 2);
}

/** Épave échouée : coque couchée sur le flanc, bordages arrachés sur les membrures, mât brisé (2×2). */
export function paintWreck(px: Px, _rnd: Rnd): void {
  const r = MAT.oldWood;
  const hull = ramp(mix(P.terreSombre, P.grisRoux, 0.4), mix(DEEP, P.brique, 0.25), mix(P.terreSeche, P.pierre, 0.4));
  // Coque vue de flanc, inclinée : quille en bas, plat-bord en haut.
  for (let x = 2; x <= 29; x++) {
    const u = (x - 2) / 27;
    const keel = 26 - Math.round(u * 3);
    const depth = Math.round(4 + Math.sin(u * Math.PI) * 8);
    const broken = x >= 18; // l'arrière est éventré : on voit les membrures
    for (let k = 0; k <= depth; k++) {
      const y = keel - k;
      const plank = Math.floor(k / 3);
      if (broken && k > 2 && (x % 4 !== 1) && plank % 2 === 1) continue;
      let t = k === depth ? 3.6 : k % 3 === 2 ? 1 : 2.2;
      if (k < 2) t = 0.8;
      if (h(x, plank, 6) < 0.15) t -= 0.6;
      px.set(x, y, tone(hull, t));
    }
    if (broken && x % 4 === 1) for (let k = 0; k <= depth + 2; k++) px.set(x, keel - k, k > depth ? r.light : r.base); // membrure
  }
  // Mât brisé, cordage.
  seg(px, 12, 15, 7, 2, r.light);
  seg(px, 13, 15, 8, 2, r.dark);
  seg(px, 8, 3, 3, 12, MAT.rope.dark);
  // Algues, sable amassé contre la coque.
  for (let i = 0; i < 12; i++) {
    const x = 3 + Math.floor(h(i, 2, 4) * 26);
    const y = 26 - Math.round(((x - 2) / 27) * 3) - Math.floor(h(i, 3, 4) * 3);
    px.set(x, y, i % 2 ? MAT.green.base : MAT.green.light);
  }
  for (let x = 1; x <= 30; x++) px.set(x, 27 - Math.round(((x - 2) / 27) * 3), MAT.sandStone.light);
  finish(px, 3, 3);
}

/** Tour en ruine du Noyé : fût rond fendu, sommet éboulé, porte noyée, algues au pied (2×4). */
export function paintRuinedTower(px: Px, _rnd: Rnd): void {
  const r = MAT.ruin;
  const cx = 16;
  const rad = 12;
  const base = 46;
  for (let x = cx - rad; x < cx + rad; x++) {
    const u = (x + 0.5 - (cx - rad)) / (rad * 2);
    // Sommet éboulé : hauteur irrégulière, plus haute à gauche.
    const top = 6 + Math.round(u * 10) + Math.floor(h(x >> 1, 0, 5) * 5);
    const curve = Math.round(Math.sqrt(Math.max(0, 1 - ((u - 0.5) * 2) ** 2)) * 2);
    for (let y = top; y <= base + curve; y++) {
      const row = Math.floor((y - top) / 4);
      const joint = (y + 2) % 4 === 0 || (Math.floor(u * 9) + row) % 2 === 0 && Math.abs(u * 9 - Math.round(u * 9)) < 0.08;
      let t = u < 0.2 ? 3.2 : u < 0.5 ? 2.5 : u < 0.8 ? 1.6 : 0.8;
      if (joint) t -= 0.9;
      if (y === top) t = 4;
      if (h(x, y, 9) < 0.05) t -= 0.7;
      if (y > base - 7 && h(x, y, 12) < 0.45) {
        px.set(x, y, tone(MAT.moss, y > base - 3 ? 1.5 : 2.6)); // algues de la marée
        continue;
      }
      px.set(x, y, tone(r, t));
    }
    // Intérieur creux visible au sommet.
    if (x > cx - rad + 3 && x < cx + rad - 3) for (let y = top + 1; y < top + 3; y++) px.set(x, y, mix(r.deep, P.nuitBleue, 0.4));
  }
  // Fissure.
  seg(px, 21, 18, 18, 30, r.deep);
  seg(px, 18, 30, 19, 36, r.deep);
  // Porte en arc, eau sombre.
  for (let y = 34; y <= base; y++) {
    const half = y < 37 ? 2 + (y - 34) : 4;
    for (let x = 13 - half + 2; x < 13 + half; x++) px.set(x, y, y > base - 3 ? MAT.water.base : P.nuitBleue);
  }
  px.set(11, base - 2, MAT.water.hi);
  // Fenêtre étroite.
  rect(px, 9, 22, 2, 5, P.nuitBleue);
  // Pierres tombées.
  for (const [x, y] of [[27, 45], [29, 47], [4, 46]] as const) {
    rect(px, x, y, 3, 2, r.base);
    px.set(x, y, r.hi);
  }
  finish(px, 4, 5);
}

/* ---------- Camp ---------- */

/** Tente de toile tendue (v0 écrue, v1 rouge rapiécée des Écumeurs), ouverture éclairée (2×2). */
export function paintTent(px: Px, _rnd: Rnd, variant: number): void {
  const r = variant === 0 ? MAT.canvas : ramp(mix(P.rougeCendre, P.grisRoux, 0.3), mix(P.brique, SHADE, 0.6), mix(P.ocreClair, P.rougeCendre, 0.3));
  for (let y = 5; y <= 27; y++) {
    const f = (y - 5) / 22;
    const half = Math.round(2 + f * 13);
    for (let x = 16 - half; x < 16 + half; x++) {
      const left = x < 16;
      let t = left ? (x < 16 - half + 2 ? 3.4 : 3) : x > 16 + half - 3 ? 0.9 : 1.6;
      if ((y - 5) % 6 === 5) t -= 0.5; // plis de la toile
      if (y === 27) t -= 0.7;
      px.set(x, y, tone(r, t));
    }
  }
  // Ouverture.
  for (let y = 15; y <= 27; y++) {
    const half = Math.round((y - 15) * 0.42) + 1;
    for (let x = 16 - half; x < 16 + half; x++) px.set(x, y, y > 23 ? mix(P.braise, P.terreSombre, 0.55) : mix(P.nuitBleue, P.terreSombre, 0.4));
  }
  // Rabat replié.
  for (let y = 16; y <= 27; y++) px.set(16 - Math.round((y - 15) * 0.42) - 2, y, r.hi);
  if (variant === 1) {
    rect(px, 21, 18, 4, 3, MAT.burlap.base);
    rect(px, 21, 18, 4, 1, MAT.burlap.light);
  }
  // Mât, fanion, haubans.
  rect(px, 15, 1, 2, 5, MAT.wood.dark);
  for (let x = 17; x < 22; x++) px.set(x, 1 + Math.floor((x - 17) / 3), variant === 0 ? MAT.blue.base : MAT.red.light);
  seg(px, 4, 27, 0, 30, MAT.rope.light);
  seg(px, 28, 27, 31, 30, MAT.rope.dark);
  finish(px, 3, 3);
}

/** Feu de camp : cercle de pierres, bûches croisées, flammes animées (4 images). */
export function paintCampfire(px: Px, _rnd: Rnd, _variant: number, frame: number): void {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x = 8 + Math.cos(a) * 5.6;
    const y = 11.5 + Math.sin(a) * 2.6;
    disc(px, x, y, 1.4, 1.1, y < 11 ? MAT.rock.base : MAT.rock.light);
    px.set(Math.round(x - 0.5), Math.round(y - 0.6), MAT.rock.hi);
  }
  seg(px, 4, 13, 12, 10, MAT.bark.base);
  seg(px, 4, 10, 12, 13, MAT.bark.dark);
  disc(px, 8, 11.5, 2.5, 1, P.braise);
  // Flammes.
  const sway = [0, 1, 0, -1][frame % 4] as number;
  const tall = [7, 8, 6, 8][frame % 4] as number;
  for (let y = 0; y < tall; y++) {
    const half = Math.max(0.5, 2.8 * (1 - y / tall));
    const cx = 8 + sway * (y / tall);
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      const core = Math.abs(x + 0.5 - cx) < half * 0.45 && y < tall * 0.6;
      px.set(x, 11 - y, core ? (y < 2 ? 0xfff4d6 : P.jauneBle) : y > tall * 0.7 ? P.braise : P.orangeForge);
    }
  }
  // Étincelles.
  const sparks: [number, number][] = [[6, 2], [10, 1], [7, 0], [11, 3]];
  const [sx, sy] = sparks[frame % 4] as [number, number];
  px.set(sx, sy, P.lumiereDoree);
  finish(px, 1, 1);
}

/** Chaudron de fer sur trépied, soupe qui fume. */
export function paintCauldron(px: Px, _rnd: Rnd): void {
  seg(px, 2, 14, 8, 2, MAT.wood.dark);
  seg(px, 14, 14, 8, 2, MAT.wood.base);
  blob(px, 8, 10, 5, 3.6, MAT.iron, 3, { grain: 0.03 });
  disc(px, 8, 7, 4.4, 1.4, MAT.iron.deep);
  disc(px, 8, 7.2, 3.4, 0.9, mix(P.ambre, P.oliveSombre, 0.35));
  px.set(6, 7, mix(P.ambre, P.ocreClair, 0.4));
  rect(px, 3, 6, 10, 1, MAT.iron.light);
  disc(px, 8, 14, 2.4, 0.8, P.braise);
  px.set(8, 14, P.orangeForge);
  finish(px, 2, 1);
}

/** Bannière sur hampe, le tissu ondule au vent (1×2, 4 images ; v0 rouge, v1 bleue). */
export function paintBanner(px: Px, _rnd: Rnd, variant: number, frame: number): void {
  const cloth = variant === 1 ? MAT.blue : MAT.red;
  // Hampe.
  cylinder(px, 5, 6, 3, 29, MAT.wood);
  disc(px, 5.5, 2, 1.5, 1.5, MAT.gold.base);
  px.set(5, 1, MAT.gold.hi);
  rect(px, 6, 4, 9, 1, MAT.wood.dark);
  // Tissu à queue d'aronde, ondulation par image.
  const phase = (frame % 4) * (Math.PI / 2);
  for (let x = 7; x <= 14; x++) {
    const wave = Math.round(Math.sin(phase + (x - 7) * 0.9) * 1.1);
    const len = 15 - (x >= 10 && x <= 11 ? 3 : 0);
    for (let y = 5; y < 5 + len; y++) {
      let t = x === 7 ? 3 : (Math.sin(phase + (x - 7) * 0.9 + 0.8) > 0.3 ? 3 : 1.8);
      if (y === 5) t = 4;
      if (y >= 5 + len - 2) t -= 0.6;
      px.set(x, y + wave, tone(cloth, t));
    }
  }
  // Galon et emblème (soleil d'or).
  for (let x = 7; x <= 14; x++) px.set(x, 6 + Math.round(Math.sin(phase + (x - 7) * 0.9) * 1.1), MAT.gold.base);
  const ex = 10;
  const ey = 11 + Math.round(Math.sin(phase + 3 * 0.9) * 1.1);
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 1], [0, -1], [1, 2]] as const) px.set(ex + dx, ey + dy, dx === 0 && dy === 0 ? MAT.gold.hi : MAT.gold.base);
  finish(px, 3, 3);
}
