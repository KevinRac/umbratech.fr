/**
 * Bâtiments du monde ouvert (refonte graphique, étape 2 — décision n°44).
 *
 * Inspiration *Eastward* : chaque bâtiment a sa silhouette et son histoire
 * (chaumière, maisons de village, auberge, forge, temple, moulin, tour de garde).
 * Règles communes, appliquées par la boîte à outils ci-dessous :
 * - lumière fixe en haut à gauche : plans gauches éclairés, faces droites sombres ;
 * - murs plus sombres que les toits, ombre de l'avant-toit sur la façade ;
 * - toits en rangées (tuiles, ardoises, bardeaux) avec une ombre sous chaque rang,
 *   chaume en couches avec un gros bourrelet d'avant-toit ;
 * - contour coloré (teinte du matériau assombrie vers l'ombre profonde), pas de noir ;
 * - occlusion ambiante au pied des murs, ombre portée douce vers le bas à droite ;
 * - herbes folles au pied des murs, mousse et fissures sur la pierre.
 *
 * Collisions « au pied » : seules les rangées basses (les murs) bloquent ; les
 * rangées hautes (toit, flèche, ailes du moulin) passent sur la couche `canopy`,
 * dessinée par-dessus le héros quand il passe derrière.
 */
import { hash2 } from './noise';
import { RAMPS, SHADE, ramp, type Ramp, type Rnd } from './art';
import { mix, type Px } from './px';
import { PALETTE as P } from '../../src/render/palette';

const DEEP = P.ombreProfonde;

/* ---------- Matériaux ---------- */

/** Teinte des faces de murs : un cran sous la lumière des toits (lumière zénithale en haut à gauche). */
const wall = (c: number): number => mix(c, SHADE, 0.12);

const M = {
  plaster: ramp(wall(mix(P.sable, P.terreSeche, 0.22)), mix(P.terreSeche, SHADE, 0.55), P.lumiereDoree),
  whitewash: ramp(wall(mix(P.ecume, P.pierre, 0.6)), mix(P.ardoise, SHADE, 0.45), 0xfff6e2),
  timber: ramp(mix(P.terreSombre, P.brique, 0.3), DEEP, P.terreSeche),
  stoneWarm: ramp(wall(mix(P.pierre, P.ocre, 0.22)), mix(P.terreSombre, SHADE, 0.55), P.parchemin),
  stoneGrey: ramp(wall(mix(P.pierre, P.ardoise, 0.38)), SHADE, P.parchemin),
  stoneMount: ramp(wall(mix(P.grisRoux, P.pierre, 0.35)), SHADE, P.ocreClair),
  stoneTemple: ramp(wall(mix(P.pierre, P.parchemin, 0.3)), mix(P.ardoise, SHADE, 0.5), 0xfff3dc),
  log: ramp(wall(mix(P.terreSeche, P.terreSombre, 0.45)), mix(P.brique, SHADE, 0.6), P.ocreClair),
  logEnd: ramp(mix(P.ocreClair, P.terreSeche, 0.4), P.terreSombre, P.parchemin),
  boards: ramp(mix(P.terreSombre, P.ardoise, 0.25), DEEP, P.terreSeche),
  wood: RAMPS.wood,
  thatch: ramp(mix(P.ocre, P.jauneBle, 0.3), mix(P.terreSombre, SHADE, 0.45), P.lumiereDoree),
  thatchOld: ramp(mix(P.ocre, P.terreSeche, 0.45), mix(P.terreSombre, SHADE, 0.5), P.ocreClair),
  tileRed: ramp(mix(P.terreCuite, P.rougeCendre, 0.3), mix(P.brique, SHADE, 0.55), P.ocreClair),
  slate: ramp(mix(P.ardoise, P.bleuGris, 0.35), P.ombreProfonde, mix(P.ciel, P.lumiereChaude, 0.45)),
  slateDark: ramp(mix(P.ardoiseSombre, P.violetPale, 0.15), P.ombreProfonde, mix(P.bleuGris, P.lumiereChaude, 0.4)),
  shingle: ramp(mix(P.terreSeche, P.grisRoux, 0.45), mix(P.terreSombre, SHADE, 0.55), P.ocreClair),
  moss: ramp(mix(P.mousse, P.olive, 0.3), mix(P.oliveSombre, P.violetBrume, 0.45), P.oliveClair),
  brick: RAMPS.rust,
  iron: ramp(mix(P.metal, P.ardoiseSombre, 0.4), P.ombreProfonde, P.metalClair),
  canvas: ramp(mix(P.parchemin, P.sable, 0.3), mix(P.terreSeche, SHADE, 0.45), 0xfff8ea),
  burlap: ramp(mix(P.sable, P.terreSeche, 0.45), mix(P.terreSombre, SHADE, 0.4), P.parchemin),
  grass: RAMPS.grass,
} as const;

/** Volets : un coloris par village. */
export const SHUTTERS = {
  blue: ramp(mix(P.bleuGris, P.ardoise, 0.25), DEEP, mix(P.ciel, P.lumiereChaude, 0.3)),
  green: ramp(mix(P.mousse, P.vertProfond, 0.35), DEEP, P.oliveClair),
  red: ramp(mix(P.rougeCendre, P.brique, 0.25), DEEP, P.ocreClair),
  ochre: ramp(mix(P.ocre, P.terreCuite, 0.3), mix(P.brique, SHADE, 0.5), P.ocreClair),
} as const;

const GLASS_TOP = mix(P.lumiereDoree, P.braise, 0.25);
const GLASS_BOTTOM = mix(P.braise, P.orangeForge, 0.4);
const GLOW = P.lumiereDoree;

/* ---------- Outils ---------- */

const tone = (r: Ramp, t: number): number => {
  const k = Math.max(0, Math.min(4, Math.round(t)));
  return k === 0 ? r.deep : k === 1 ? r.dark : k === 2 ? r.base : k === 3 ? r.light : r.hi;
};

const h = (x: number, y: number, seed: number): number => hash2(x, y, seed);

function rect(px: Px, x: number, y: number, w: number, hgt: number, color: number): void {
  px.rect(x, y, w, hgt, color);
}

/** Assombrit (ou éclaire) les pixels opaques existants d'un rectangle. */
function tint(px: Px, x: number, y: number, w: number, hgt: number, color: number, k: number): void {
  for (let j = y; j < y + hgt; j++) {
    for (let i = x; i < x + w; i++) {
      const c = px.colorAt(i, j);
      if (c >= 0 && px.alphaAt(i, j) === 255) px.set(i, j, mix(c, color, k));
    }
  }
}

/** Ligne épaisse (pinceau carré de `size` px). */
function stroke(px: Px, x0: number, y0: number, x1: number, y1: number, color: number, size = 1): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    rect(px, x, y, size, size, color);
  }
}

/* ---------- Murs ---------- */

/** Crépi : face éclairée à gauche, ombre propre à droite, taches d'humidité en bas. */
function wallPlaster(px: Px, x0: number, x1: number, y0: number, y1: number, m: Ramp, seed: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let t = 2;
      if (x <= x0) t = 3;
      else if (x >= x1 - 1) t = 1;
      const n = h(x, y, seed);
      if (n < 0.04) t -= 1;
      else if (n > 0.975) t += 1;
      if (y > y1 - 6 && h(x >> 1, (y - y1) >> 1, seed + 1) < 0.18 + (y - (y1 - 6)) * 0.06) t -= 1;
      px.set(x, y, tone(m, t));
    }
  }
}

/** Fissure en zigzag sur un mur. */
function crack(px: Px, x: number, y: number, len: number, m: Ramp, seed: number): void {
  let cx = x;
  for (let i = 0; i < len; i++) {
    px.set(cx, y + i, m.deep);
    if (i > 0) px.set(cx + 1, y + i, m.light);
    if (h(i, 0, seed) < 0.45) cx += h(i, 1, seed) < 0.5 ? -1 : 1;
  }
}

/** Pierre appareillée : assises irrégulières, joints, pierres éclairées en haut à gauche, mousse en bas. */
function wallStone(px: Px, x0: number, x1: number, y0: number, y1: number, m: Ramp, seed: number, moss = 0.25, big = false): void {
  const mortar = mix(m.deep, m.dark, 0.35);
  let yb = y1;
  let row = 0;
  while (yb >= y0) {
    const hgt = (big ? 5 : 4) + (h(row, 7, seed) < 0.4 ? 1 : 0);
    const yt = Math.max(y0, yb - hgt + 1);
    let x = x0 - Math.floor(h(row, 3, seed) * 6);
    let s = 0;
    while (x <= x1) {
      const sw = (big ? 7 : 5) + Math.floor(h(row, s, seed + 9) * 5);
      const xe = x + sw - 1;
      const v = h(row, s, seed + 5);
      const base = 2 + (v < 0.22 ? -1 : v > 0.86 ? 1 : 0);
      for (let yy = yt; yy <= yb; yy++) {
        for (let xx = Math.max(x, x0); xx <= Math.min(xe, x1); xx++) {
          if (yy === yt || xx === x) {
            px.set(xx, yy, mortar);
            continue;
          }
          let t = base;
          if (yy === yt + 1) t += 1;
          if (yy === yb) t -= 1;
          if (xx === xe) t -= 1;
          if (xx >= x1 - 1) t -= 1;
          if (xx <= x0 + 1 && yy > yt + 1) t += 1;
          px.set(xx, yy, tone(m, t));
        }
      }
      // Mousse : sur le haut des pierres basses.
      const low = (yb - y0) / Math.max(1, y1 - y0);
      if (moss > 0 && h(row, s, seed + 13) < moss * low * 1.6) {
        const mx = Math.max(x + 1, x0);
        const mw = Math.min(xe, x1) - mx;
        for (let i = 0; i < mw; i++) if (h(i, row, seed + s) < 0.7) px.set(mx + i, yt + 1, i % 3 === 0 ? M.moss.light : M.moss.base);
        if (mw > 2) px.set(mx + 1, yt + 2, M.moss.dark);
      }
      x = xe + 1;
      s++;
    }
    yb = yt - 1;
    row++;
  }
}

/** Rondins empilés, bouts ronds aux angles. */
function wallLog(px: Px, x0: number, x1: number, y0: number, y1: number, m: Ramp, seed: number): void {
  const profile = [3, 2, 2, 1];
  for (let y = y0; y <= y1; y++) {
    const ly = (y1 - y) % 4;
    const log = Math.floor((y1 - y) / 4);
    for (let x = x0; x <= x1; x++) {
      let t = profile[3 - ly] as number;
      if (x >= x1 - 2) t -= 1;
      if (ly === 0 && h(x >> 1, log, seed) < 0.25) t -= 1;
      if (h(x, y, seed + 2) < 0.05) t -= 1;
      px.set(x, y, tone(m, t));
    }
    // Bouts de rondins (cernes clairs) aux deux angles.
    if (ly === 3 || ly === 0) continue;
    for (const ex of [x0, x1 - 2]) {
      for (let i = 0; i < 3; i++) px.set(ex + i, y, i === 1 && ly === 2 ? M.logEnd.base : ly === 2 ? M.logEnd.light : M.logEnd.dark);
    }
  }
}

/** Planches verticales. */
function wallBoards(px: Px, x0: number, x1: number, y0: number, y1: number, m: Ramp, seed: number): void {
  for (let x = x0; x <= x1; x++) {
    const k = Math.floor((x - x0) / 3);
    const c = (x - x0) % 3;
    const base = 2 + (h(k, 0, seed) < 0.3 ? -1 : 0);
    for (let y = y0; y <= y1; y++) {
      let t = base;
      if (c === 0) t += 1;
      if (c === 2) t = 0;
      if (h(x, y, seed + 1) < 0.04) t -= 1;
      px.set(x, y, tone(m, t));
    }
  }
}

/** Pans de bois : poteaux, sablières et écharpes (contreventement). */
function timberFrame(px: Px, posts: readonly number[], rails: readonly number[], y0: number, y1: number, braces: readonly [number, number, number, number][], m: Ramp = M.timber): void {
  for (const [xa, ya, xb, yb] of braces) {
    stroke(px, xa, ya, xb, yb, m.dark, 2);
    stroke(px, xa, ya, xb, yb, m.base, 1);
  }
  for (const x of posts) {
    rect(px, x, y0, 1, y1 - y0 + 1, m.base);
    rect(px, x + 1, y0, 1, y1 - y0 + 1, m.dark);
  }
  for (const y of rails) {
    for (let x = Math.min(...posts); x <= Math.max(...posts) + 1; x++) {
      px.set(x, y, m.light);
      px.set(x, y + 1, m.dark);
    }
  }
}

/** Soubassement de pierre (pied du mur). */
function plinth(px: Px, x0: number, x1: number, y0: number, y1: number, m: Ramp, seed: number): void {
  wallStone(px, x0, x1, y0, y1, m, seed, 0.5);
  for (let x = x0; x <= x1; x++) px.set(x, y0, mix(px.colorAt(x, y0), DEEP, 0.35));
}

/** Ombre de l'avant-toit sur la façade (dégradé de 3 rangées). */
function eaveShadow(px: Px, x0: number, x1: number, y: number, rows = 3): void {
  for (let i = 0; i < rows; i++) tint(px, x0, y + i, x1 - x0 + 1, 1, SHADE, 0.5 - i * 0.15);
}

/* ---------- Toits ---------- */

type RoofKind = 'tile' | 'slate' | 'shingle' | 'thatch';

interface RoofOpts {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  /** Retrait du faîtage de chaque côté (toit en croupe) ; 0 = pignons. */
  readonly hip: number;
  readonly kind: RoofKind;
  readonly m: Ramp;
  readonly seed: number;
  readonly round?: boolean;
  /** Proportion de mousse (bardeaux, chaume ancien). */
  readonly moss?: number;
}

/** Motif de rang : décalage de ton selon le matériau. */
function courseTone(kind: RoofKind, x: number, ly: number, r: number, seed: number): number {
  switch (kind) {
    case 'tile': {
      const jx = (x + (r % 2) * 2 + 400) % 5;
      if (ly === 0) return jx === 0 ? -2 : jx === 4 ? 0 : 1;
      if (ly === 3) return -1;
      return jx === 0 ? -1 : 0;
    }
    case 'slate': {
      const jx = (x + (r % 2) * 3 + 600) % 6;
      if (ly === 0) return jx === 0 ? -1 : 1;
      if (ly === 2) return -1;
      if (jx === 0) return -1;
      const v = h(Math.floor((x + (r % 2) * 3 + 600) / 6), r, seed);
      return v < 0.2 ? -1 : v > 0.88 ? 1 : 0;
    }
    case 'shingle': {
      const jx = (x + (r % 2) * 2 + 400) % 4;
      if (ly === 0) return jx === 0 ? -1 : 1;
      if (ly === 2) return -1;
      if (jx === 0) return -1;
      const v = h(Math.floor((x + (r % 2) * 2 + 400) / 4), r, seed);
      return v < 0.3 ? -1 : 0;
    }
    default:
      return 0;
  }
}

const ROW_H: Record<RoofKind, number> = { tile: 4, slate: 3, shingle: 3, thatch: 6 };

/**
 * Toit vu de trois quarts, faîtage en haut : rangées parallèles au faîtage,
 * croupes latérales (claire à gauche, sombre à droite) si `hip` > 0.
 */
function roofSide(px: Px, o: RoofOpts): void {
  const span = Math.max(1, o.y1 - o.y0);
  for (let y = o.y0; y <= o.y1; y++) {
    const f = (y - o.y0) / span;
    const g = o.round ? 1 - Math.sin((f * Math.PI) / 2) : 1 - f;
    const inset = Math.round(o.hip * g);
    const L = o.x0 + inset;
    const R = o.x1 - inset;
    const sideW = o.hip > 0 ? Math.max(1, Math.round(o.hip * 0.8 * (1 - f)) + 2) : 0;
    for (let x = L; x <= R; x++) {
      if (o.round && y >= o.y1 - 1 && (x === L || x === R)) continue;
      let t = 2;
      if (sideW > 0 && x - L < sideW) t += 1;
      else if (sideW > 0 && R - x < sideW) t -= 1;
      else if (x - L < 2) t += 1;
      else if (R - x < 3) t -= 1;
      if (o.kind === 'thatch') {
        // Couches de chaume ondulées + mèches verticales.
        const wob = Math.round(h(x >> 2, 0, o.seed) * 2);
        const ly = (o.y1 - y + wob + 600) % 6;
        if (ly === 5) t -= 1;
        else if (ly === 0) t += 0.6;
        const v = h(x, Math.floor((y + h(x, 0, o.seed + 1) * 5) / 3), o.seed + 2);
        if (v < 0.2) t -= 1;
        else if (v > 0.9) t += 1;
        // Bourrelet d'avant-toit : épais, clair dessus, sombre dessous.
        const e = o.y1 - y;
        if (e === 0) t = 1;
        else if (e === 1) t = 2;
        else if (e === 2 || e === 3) t = Math.max(t, 3) + (h(x, y, o.seed) < 0.2 ? -1 : 0);
        // Faîtage tressé.
        if (y - o.y0 <= 2) t = (x + y) % 4 === 0 ? 0 : y === o.y0 ? 2 : 1;
      } else {
        const rh = ROW_H[o.kind];
        const ly = (o.y1 - y) % rh;
        const r = Math.floor((o.y1 - y) / rh);
        t += courseTone(o.kind, x, ly, r, o.seed);
        if (y === o.y0) t = x - L < (R - L) * 0.6 ? 4 : 3;
        else if (y === o.y0 + 1) t = 1;
        if (o.y1 - y === 0) t = Math.min(t, 1);
      }
      let color = tone(o.m, t);
      if (o.moss && h(x >> 2, y >> 2, o.seed + 7) < o.moss && h(x, y, o.seed + 8) < 0.8 && y > o.y0 + 2) {
        color = tone(M.moss, t - 0.5);
      }
      px.set(x, y, color);
    }
  }
}

interface GableOpts {
  readonly cx: number;
  readonly halfW: number;
  readonly apexY: number;
  readonly baseY: number;
  /** Profondeur visible des versants (vers l'arrière). */
  readonly depth: number;
  readonly kind: Exclude<RoofKind, 'thatch'>;
  readonly m: Ramp;
  readonly seed: number;
  /** Bord de rive (planche ou rang de tuiles) à l'avant. */
  readonly barge?: Ramp;
}

/** Ligne de rive d'un pignon avant : y du bord à l'abscisse x. */
const gableEdge = (o: GableOpts, x: number): number => o.apexY + Math.round((Math.abs(x - o.cx) / o.halfW) * (o.baseY - o.apexY));

/** Pignon sur rue : deux versants qui fuient vers l'arrière, rive en planches à l'avant. */
function roofGable(px: Px, o: GableOpts): void {
  const barge = o.barge ?? M.timber;
  for (let x = o.cx - o.halfW; x <= o.cx + o.halfW; x++) {
    const d = Math.abs(x - o.cx);
    const ye = gableEdge(o, x);
    const left = x < o.cx;
    for (let y = ye - o.depth; y < ye; y++) {
      let t = 2 + (left ? 1 : x === o.cx ? 1 : -1);
      const rh = 4;
      const ls = d % rh;
      if (ls === rh - 1) t += 1;
      else if (ls === 0 && d > 0) t -= 1;
      const jy = (y - (ye - o.depth) + Math.floor(d / rh) * 2 + 600) % 5;
      if (jy === 0 && ls !== rh - 1) t -= 1;
      if (y === ye - o.depth) t = left ? 4 : 3;
      if (x === o.cx) t = y === ye - o.depth ? 4 : 3;
      if (o.kind === 'slate' && h(x, y, o.seed) < 0.12) t -= 1;
      px.set(x, y, tone(o.m, t));
    }
    // Rive : planche de 3 px, claire dessus, ombre dessous.
    px.set(x, ye, left ? barge.light : barge.base);
    px.set(x, ye + 1, barge.base);
    px.set(x, ye + 2, barge.deep);
    void d;
  }
}

/* ---------- Ouvertures et accessoires ---------- */

interface WindowOpts {
  readonly w?: number;
  readonly h?: number;
  readonly shutter?: Ramp;
  readonly box?: boolean;
  readonly lit?: boolean;
  readonly frame?: Ramp;
  readonly seed?: number;
}

/** Fenêtre à petits bois, vitres chaudes, volets ouverts, appui et jardinière. */
function windowAt(px: Px, x: number, y: number, o: WindowOpts = {}): void {
  const w = o.w ?? 8;
  const hh = o.h ?? 9;
  const frame = o.frame ?? M.timber;
  const lit = o.lit ?? true;
  rect(px, x, y, w, hh, frame.dark);
  for (let j = 1; j < hh - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const f = (j - 1) / Math.max(1, hh - 3);
      px.set(x + i, y + j, lit ? mix(GLASS_TOP, GLASS_BOTTOM, f) : mix(P.bleuNuit, P.ardoise, 0.3 - f * 0.2));
    }
  }
  const mx = x + Math.floor(w / 2);
  const my = y + Math.floor(hh / 2);
  rect(px, mx, y + 1, 1, hh - 2, frame.base);
  rect(px, x + 1, my, w - 2, 1, frame.base);
  px.set(x + 1, y + 1, lit ? 0xfff4d6 : P.metalClair);
  rect(px, x, y, w, 1, frame.deep);
  // Appui de pierre et son ombre.
  rect(px, x - 1, y + hh, w + 2, 1, M.stoneWarm.light);
  tint(px, x - 1, y + hh + 1, w + 2, 1, SHADE, 0.4);
  if (o.shutter) {
    const s = o.shutter;
    for (let j = 0; j < hh; j++) {
      const plank = j % 3 === 2;
      px.set(x - 3, y + j, plank ? s.dark : s.light);
      px.set(x - 2, y + j, plank ? s.dark : s.base);
      px.set(x - 1, y + j, s.dark);
      px.set(x + w, y + j, plank ? s.deep : s.base);
      px.set(x + w + 1, y + j, plank ? s.deep : s.dark);
      px.set(x + w + 2, y + j, s.deep);
    }
    px.set(x - 1, y + 1, M.iron.base);
    px.set(x - 1, y + hh - 2, M.iron.base);
    px.set(x + w, y + 1, M.iron.base);
    px.set(x + w, y + hh - 2, M.iron.base);
  }
  if (o.box) {
    const by = y + hh + 1;
    rect(px, x - 1, by, w + 2, 3, M.wood.base);
    rect(px, x - 1, by, w + 2, 1, M.wood.light);
    rect(px, x - 1, by + 2, w + 2, 1, M.wood.dark);
    const flowers = [mix(P.rougeCendre, P.orangeForge, 0.35), P.jauneBle, P.ecume, mix(P.violetPale, P.ciel, 0.35)];
    for (let i = 0; i < w + 2; i++) {
      const v = h(i, 1, o.seed ?? 3);
      px.set(x - 1 + i, by - 1, v < 0.5 ? M.grass.base : v < 0.7 ? M.grass.light : (flowers[Math.floor(v * 13) % 4] as number));
      if (h(i, 2, o.seed ?? 3) < 0.4) px.set(x - 1 + i, by - 2, i % 2 ? (flowers[(i + 1) % 4] as number) : M.grass.dark);
    }
  }
}

/** Œil-de-bœuf. */
function roundWindow(px: Px, cx: number, cy: number, r: number, frame: Ramp, glass: readonly number[] = [GLASS_TOP, GLASS_BOTTOM]): void {
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r + 0.6) continue;
      if (d > r - 0.6) px.set(x, y, x + y < cx + cy ? frame.light : frame.dark);
      else {
        const a = Math.atan2(y - cy, x - cx);
        const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * glass.length * 2) % glass.length;
        px.set(x, y, glass[seg] as number);
      }
    }
  }
  if (glass.length <= 2) {
    rect(px, cx, cy - r + 1, 1, r * 2 - 1, frame.base);
    rect(px, cx - r + 1, cy, r * 2 - 1, 1, frame.base);
  }
  px.set(cx - 1, cy - r + 1, 0xfff4d6);
}

interface DoorOpts {
  readonly w?: number;
  readonly h?: number;
  readonly m?: Ramp;
  /** Encadrement (pierre) ; absent = linteau de bois. */
  readonly frame?: Ramp;
  readonly double?: boolean;
  readonly studs?: number;
}

/**
 * Porte cintrée en planches (bas du vantail à `yb - 2`), ferrures, poignée,
 * seuil de pierre sur les deux dernières rangées.
 */
function doorAt(px: Px, x: number, yb: number, o: DoorOpts = {}): void {
  const w = o.w ?? 10;
  const hh = o.h ?? 18;
  const m = o.m ?? M.wood;
  const top = yb - 1 - hh;
  if (o.frame) {
    const f = o.frame;
    for (let j = top - 2; j <= yb - 2; j++) {
      for (let i = x - 2; i <= x + w + 1; i++) {
        const k = (i - (x - 2) + Math.floor((j - top) / 3)) % 4;
        let t = k === 0 ? 1 : 2;
        if (i <= x - 1) t += 1;
        if (i >= x + w) t -= 1;
        if (j === top - 2) t = 3;
        px.set(i, j, tone(f, t));
      }
    }
  } else {
    rect(px, x - 1, top - 1, w + 2, hh + 1, M.timber.dark);
    rect(px, x - 2, top - 2, w + 4, 2, M.timber.base);
    rect(px, x - 2, top - 2, w + 4, 1, M.timber.light);
  }
  for (let j = 0; j < hh; j++) {
    for (let i = 0; i < w; i++) {
      // Arc : coins supérieurs arrondis.
      const corner = j === 0 ? 2 : j === 1 ? 1 : 0;
      if (i < corner || w - 1 - i < corner) {
        px.set(x + i, top + j, DEEP);
        continue;
      }
      let t = 2;
      if (i % 3 === 2) t = 1;
      if (i === 0) t = 3;
      if (i >= w - 2) t -= 1;
      if (j < 3) t -= 1;
      if (o.double && i === Math.floor(w / 2) - 1) t = 0;
      px.set(x + i, top + j, tone(m, t));
    }
  }
  // Ferrures.
  for (const fy of [top + 4, yb - 6]) {
    for (let i = 1; i < w - 1; i++) px.set(x + i, fy, i % 4 === 1 ? M.iron.light : M.iron.base);
  }
  if (o.studs) for (let i = 2; i < w - 2; i += 3) for (let j = top + 7; j < yb - 6; j += 4) px.set(x + i, j, P.ambre);
  const hy = top + Math.floor(hh * 0.55);
  if (o.double) {
    px.set(x + Math.floor(w / 2) - 2, hy, P.jauneBle);
    px.set(x + Math.floor(w / 2) + 1, hy, P.jauneBle);
  } else {
    px.set(x + w - 3, hy, P.jauneBle);
    px.set(x + w - 3, hy + 1, P.ambre);
  }
  // Seuil.
  rect(px, x - 2, yb - 1, w + 4, 1, M.stoneWarm.light);
  rect(px, x - 2, yb, w + 4, 1, M.stoneWarm.dark);
}

/** Lanterne murale sur potence (le cœur brille : le bloom de l'étape 5 s'en servira). */
function lantern(px: Px, x: number, y: number, dir: 1 | -1 = 1): void {
  px.set(x, y, M.iron.dark);
  px.set(x + dir, y, M.iron.base);
  px.set(x + dir * 2, y, M.iron.base);
  const lx = x + dir * 2 - 1;
  rect(px, lx, y + 1, 3, 1, M.iron.base);
  rect(px, lx, y + 2, 3, 3, M.iron.dark);
  px.set(lx + 1, y + 2, 0xfff4d6);
  px.set(lx + 1, y + 3, GLOW);
  px.set(lx + 1, y + 4, P.braise);
  rect(px, lx, y + 5, 3, 1, M.iron.deep);
}

type SignIcon = 'tankard' | 'anvil' | 'wheat';

/** Enseigne suspendue à une potence en fer forgé. */
function hangingSign(px: Px, x: number, y: number, dir: 1 | -1, icon: SignIcon): void {
  // Potence avec volute.
  for (let i = 0; i < 9; i++) px.set(x + dir * i, y, i === 0 ? M.iron.dark : M.iron.base);
  px.set(x + dir, y + 1, M.iron.base);
  px.set(x + dir * 2, y + 2, M.iron.base);
  px.set(x + dir * 8, y - 1, M.iron.light);
  px.set(x + dir * 7, y - 1, M.iron.base);
  // Chaînes.
  const bx = dir === 1 ? x + 2 : x - 10;
  px.set(bx + 1, y + 1, M.iron.light);
  px.set(bx + 7, y + 1, M.iron.light);
  // Planche.
  rect(px, bx, y + 2, 9, 8, M.wood.dark);
  rect(px, bx + 1, y + 3, 7, 6, M.wood.base);
  rect(px, bx + 1, y + 3, 7, 1, M.wood.light);
  const ix = bx + 2;
  const iy = y + 4;
  if (icon === 'tankard') {
    rect(px, ix, iy, 4, 4, P.jauneBle);
    rect(px, ix, iy, 4, 1, P.ecume);
    px.set(ix + 4, iy + 1, P.ambre);
    px.set(ix + 4, iy + 2, P.ambre);
    rect(px, ix + 1, iy + 1, 1, 3, P.ambre);
  } else if (icon === 'anvil') {
    rect(px, ix, iy, 5, 2, M.iron.light);
    rect(px, ix + 1, iy + 2, 3, 1, M.iron.base);
    rect(px, ix, iy + 3, 5, 1, M.iron.dark);
  } else {
    for (let i = 0; i < 3; i++) {
      rect(px, ix + i * 2, iy, 1, 4, P.jauneBle);
      px.set(ix + i * 2, iy - 1 + 0, P.ocreClair);
    }
  }
}

/** Cheminée : souche de pierre ou de briques, couronnement, suie, ombre portée sur le toit. */
function chimney(px: Px, x: number, y: number, w: number, hh: number, m: Ramp, seed: number): void {
  // Ombre sur le toit, vers le bas à droite.
  tint(px, x + w, y + 3, 2, hh - 2, SHADE, 0.45);
  tint(px, x + 1, y + hh, w, 2, SHADE, 0.35);
  for (let j = 0; j < hh; j++) {
    for (let i = 0; i < w; i++) {
      const row = Math.floor(j / 3);
      const joint = j % 3 === 2 || (i + (row % 2) * 2) % 4 === 0;
      let t = joint ? 1 : 2;
      if (i === 0) t += 1;
      if (i >= w - 2) t -= 1;
      if (!joint && h(i, j, seed) < 0.12) t -= 1;
      px.set(x + i, y + j, tone(m, t));
    }
  }
  rect(px, x - 1, y, w + 2, 2, M.stoneGrey.base);
  rect(px, x - 1, y, w + 2, 1, M.stoneGrey.hi);
  rect(px, x - 1, y + 1, 1, 1, M.stoneGrey.light);
  rect(px, x + 1, y, w - 2, 1, DEEP);
  rect(px, x + 1, y + 2, w - 2, 1, mix(m.deep, DEEP, 0.4));
}

/** Herbes folles au pied des murs (hors des portes). */
function tufts(px: Px, x0: number, x1: number, gy: number, seed: number, avoid: readonly [number, number][] = []): void {
  for (let x = x0; x <= x1; x++) {
    if (avoid.some(([a, b]) => x >= a && x <= b)) continue;
    const v = h(x, 0, seed);
    if (v > 0.42) continue;
    const hgt = 1 + Math.floor(h(x, 1, seed) * 3);
    for (let j = 0; j < hgt; j++) px.set(x, gy + 1 - j, j === hgt - 1 ? M.grass.light : j === 0 ? M.grass.dark : M.grass.base);
    if (v < 0.06) px.set(x, gy - hgt + 1, P.jauneBle);
  }
}

/**
 * Finition : contour coloré (couleur du pixel voisin assombrie), occlusion au
 * pied et ombre portée douce décalée vers le bas à droite.
 */
function finish(px: Px, dx = 4, dy = 5): void {
  const W = px.width;
  const H = px.height;
  const solid = (x: number, y: number): boolean => px.alphaAt(x, y) === 255;
  // 1. Contour coloré.
  const marks: [number, number, number][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px.alphaAt(x, y) !== 0) continue;
      for (const [nx, ny] of [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]] as const) {
        if (solid(nx, ny)) {
          // Teinte du matériau assombrie, poussée vers le violet : jamais un gris neutre.
          marks.push([x, y, mix(mix(px.colorAt(nx, ny), DEEP, 0.66), P.violetBrume, 0.2)]);
          break;
        }
      }
    }
  }
  for (const [x, y, c] of marks) px.set(x, y, c);
  // 2. Ombre portée (silhouette décalée) + occlusion au contact du sol.
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y)) mask[y * W + x] = 1;
  const inShadow = (x: number, y: number): boolean => {
    for (let k = 1; k <= dy; k++) {
      const sx = x - Math.round((dx * k) / dy);
      const sy = y - k;
      if (sx >= 0 && sy >= 0 && sx < W && sy < H && mask[sy * W + sx]) return true;
    }
    return false;
  };
  const shade: [number, number, number][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (mask[y * W + x] || px.alphaAt(x, y) !== 0) continue;
      if (!inShadow(x, y)) continue;
      const ao = y > 0 && mask[(y - 1) * W + x] ? 150 : y > 1 && mask[(y - 2) * W + x] ? 125 : 0;
      const edge = !inShadow(x + 1, y) || !inShadow(x, y + 1);
      shade.push([x, y, Math.max(ao, edge ? 62 : 100)]);
    }
  }
  for (const [x, y, a] of shade) px.set(x, y, SHADE, a);
}

/* ---------- Bâtiments ---------- */

export interface BuildingStyle {
  readonly shutter: Ramp;
}

/** Chaumière : gros toit de chaume arrondi, murs bas crépis, œil-de-bœuf, jardinière. */
export function paintCottage(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 101 + variant;
  const gy = 45;
  const wallTop = 22;
  wallPlaster(px, 3, 41, wallTop, gy - 4, M.plaster, seed);
  timberFrame(px, [3, 40], [], wallTop, gy - 4, []);
  plinth(px, 3, 41, gy - 3, gy, M.stoneWarm, seed);
  crack(px, 33, 34, 4, M.plaster, seed);
  roundWindow(px, 8, 32, 3, M.timber);
  doorAt(px, 15, gy, { w: 10, h: 17 });
  windowAt(px, 31, 28, { w: 7, h: 9, shutter: variant === 1 ? SHUTTERS.green : SHUTTERS.blue, box: true, seed });
  eaveShadow(px, 3, 41, wallTop + 2, 4);
  lantern(px, 27, 29);
  roofSide(px, { x0: 1, x1: 43, y0: 4, y1: 25, hip: 8, kind: 'thatch', m: variant === 1 ? M.thatchOld : M.thatch, seed, round: true, moss: variant === 1 ? 0.22 : 0 });
  chimney(px, 29, 0, 6, 10, M.stoneGrey, seed);
  finish(px);
  tufts(px, 2, 42, gy, seed, [[12, 27]]);
}

/** Cabane : rondins et bardeaux moussus (variante 0) ou petite chaumière (variante 1). */
export function paintHut(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 201 + variant;
  const gy = 45;
  const wallTop = 24;
  if (variant === 0) {
    wallLog(px, 3, 25, wallTop, gy - 2, M.log, seed);
    plinth(px, 3, 25, gy - 1, gy, M.stoneGrey, seed);
  } else {
    wallPlaster(px, 3, 25, wallTop, gy - 3, M.plaster, seed);
    timberFrame(px, [3, 24], [], wallTop, gy - 3, [[5, gy - 4, 9, wallTop + 4]]);
    plinth(px, 3, 25, gy - 2, gy, M.stoneWarm, seed);
  }
  doorAt(px, 9, gy, { w: 9, h: 16, m: variant === 0 ? M.wood : M.wood });
  windowAt(px, 21, 30, { w: 4, h: 6, lit: true });
  eaveShadow(px, 3, 25, wallTop + 2, 3);
  if (variant === 0) roofSide(px, { x0: 1, x1: 27, y0: 5, y1: 27, hip: 3, kind: 'shingle', m: M.shingle, seed, moss: 0.4 });
  else roofSide(px, { x0: 1, x1: 27, y0: 5, y1: 27, hip: 6, kind: 'thatch', m: M.thatch, seed, round: true });
  // Tuyau de poêle.
  rect(px, 18, 2, 3, 8, M.iron.base);
  rect(px, 18, 2, 1, 8, M.iron.light);
  rect(px, 17, 1, 5, 2, M.iron.dark);
  rect(px, 18, 1, 3, 1, DEEP);
  finish(px);
  tufts(px, 2, 26, gy, seed, [[6, 20]]);
}

/** Maison de village à pignon sur rue : rez-de-chaussée de pierre, étage à colombages en encorbellement. */
export function paintTownHouse(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 301 + variant;
  const gy = 61;
  const g: GableOpts = { cx: 21, halfW: 20, apexY: 9, baseY: 27, depth: 7, kind: 'tile', m: M.tileRed, seed };
  // Étage et pignon (crépi + pans de bois), le pignon seulement sous la rive.
  wallPlaster(px, 3, 40, 10, 41, M.plaster, seed);
  for (let x = 3; x <= 40; x++) for (let y = 10; y < gableEdge(g, x); y++) px.set(x, y, 0, 0);
  timberFrame(px, [3, 39], [31], 28, 41, [[5, 41, 12, 32], [18, 41, 11, 32], [23, 41, 30, 32], [37, 41, 30, 32]]);
  rect(px, 20, 12, 1, 19, M.timber.base);
  rect(px, 21, 12, 1, 19, M.timber.dark);
  timberFrame(px, [20], [], 29, 41, []);
  for (let x = 4; x <= 39; x++) {
    const y = gableEdge(g, x) + 7;
    if (y < 30 && (x < 15 || x > 26)) px.set(x, y, M.timber.dark);
  }
  windowAt(px, 17, 17, { w: 7, h: 7, frame: M.timber });
  windowAt(px, 8, 33, { w: 7, h: 7, shutter: SHUTTERS.red, seed });
  windowAt(px, 28, 33, { w: 7, h: 7, shutter: SHUTTERS.red, seed: seed + 1 });
  // Encorbellement : poutre de plancher et ombre sur le rez-de-chaussée.
  rect(px, 2, 41, 40, 1, M.timber.light);
  rect(px, 2, 42, 40, 1, M.timber.dark);
  for (let x = 3; x <= 40; x += 6) px.set(x, 42, M.timber.light);
  // Rez-de-chaussée de pierre.
  wallStone(px, 4, 39, 43, gy, M.stoneWarm, seed, 0.35);
  eaveShadow(px, 4, 39, 43, 3);
  doorAt(px, 17, gy, { w: 10, h: 15, frame: M.stoneWarm });
  windowAt(px, 6, 47, { w: 7, h: 7 });
  windowAt(px, 31, 47, { w: 7, h: 7 });
  roofGable(px, g);
  chimney(px, 31, 3, 5, 11, M.brick, seed);
  finish(px);
  tufts(px, 3, 40, gy, seed, [[13, 30]]);
}

/** Maison du port : murs blanchis à la chaux, toit d'ardoise, lucarne, volets bleus. */
export function paintSlateHouse(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 401 + variant;
  const gy = 45;
  const wallTop = 22;
  wallPlaster(px, 3, 40, wallTop, gy - 4, M.whitewash, seed);
  plinth(px, 3, 40, gy - 3, gy, M.stoneGrey, seed);
  crack(px, 22, 30, 5, M.whitewash, seed);
  doorAt(px, 8, gy, { w: 10, h: 17, frame: M.stoneGrey, m: ramp(mix(P.bleuGris, P.ardoise, 0.3), DEEP, P.ciel) });
  windowAt(px, 28, 28, { w: 7, h: 8, shutter: SHUTTERS.blue, box: true, seed });
  eaveShadow(px, 3, 40, wallTop + 2, 4);
  lantern(px, 21, 29);
  roofSide(px, { x0: 1, x1: 42, y0: 3, y1: 25, hip: 2, kind: 'slate', m: M.slate, seed });
  // Lucarne.
  wallPlaster(px, 18, 26, 11, 19, M.whitewash, seed + 3);
  windowAt(px, 20, 12, { w: 5, h: 6 });
  roofGable(px, { cx: 22, halfW: 7, apexY: 6, baseY: 12, depth: 3, kind: 'slate', m: M.slate, seed, barge: M.stoneGrey });
  chimney(px, 6, 0, 6, 10, M.stoneGrey, seed);
  finish(px);
  tufts(px, 2, 41, gy, seed, [[5, 20]]);
}

/** Maison forestière : rondins, bardeaux moussus, volets verts, bûches empilées. */
export function paintLogHouse(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 501 + variant;
  const gy = 45;
  const wallTop = 22;
  wallLog(px, 3, 40, wallTop, gy - 2, M.log, seed);
  plinth(px, 3, 40, gy - 1, gy, M.stoneGrey, seed);
  windowAt(px, 6, 28, { w: 7, h: 8, shutter: SHUTTERS.green, seed });
  doorAt(px, 18, gy, { w: 10, h: 17 });
  // Bûches empilées contre le mur.
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3 - (j === 0 ? 1 : 0); i++) {
      const cx = 33 + i * 3 + (j === 0 ? 1 : 0);
      const cy = gy - 2 - j * 3;
      rect(px, cx - 1, cy - 1, 3, 3, M.logEnd.dark);
      px.set(cx, cy, M.logEnd.light);
      px.set(cx - 1, cy - 1, M.logEnd.base);
    }
  }
  eaveShadow(px, 3, 40, wallTop + 2, 4);
  roofSide(px, { x0: 1, x1: 42, y0: 3, y1: 25, hip: 4, kind: 'shingle', m: M.shingle, seed, moss: 0.45 });
  chimney(px, 30, 0, 6, 10, M.stoneGrey, seed);
  finish(px);
  tufts(px, 2, 41, gy, seed, [[15, 30]]);
}

/** Maison de montagne : moellons, toit d'ardoise sombre très pentu, petites fenêtres, brasero. */
export function paintStoneHouse(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 601 + variant;
  const gy = 45;
  const wallTop = 24;
  wallStone(px, 3, 40, wallTop, gy, M.stoneMount, seed, 0.3, true);
  windowAt(px, 7, 30, { w: 6, h: 7, shutter: SHUTTERS.red, seed });
  windowAt(px, 31, 30, { w: 6, h: 7, shutter: SHUTTERS.red, seed: seed + 2 });
  doorAt(px, 17, gy, { w: 10, h: 16, frame: M.stoneMount, m: M.boards });
  eaveShadow(px, 3, 40, wallTop + 2, 4);
  // Torche murale.
  px.set(29, 34, M.iron.base);
  px.set(29, 35, M.iron.dark);
  px.set(29, 32, P.braise);
  px.set(29, 33, P.orangeForge);
  px.set(28, 32, P.orangeForge);
  px.set(29, 31, GLOW);
  roofSide(px, { x0: 1, x1: 42, y0: 2, y1: 27, hip: 3, kind: 'slate', m: M.slateDark, seed });
  chimney(px, 6, 0, 8, 12, M.stoneMount, seed);
  finish(px);
  tufts(px, 2, 41, gy, seed, [[14, 30]]);
}

/** Auberge : grand corps à étage (tuiles, lucarnes), aile en pignon, enseigne, lanternes, tonneaux. */
export function paintInn(px: Px, _rnd: Rnd): void {
  const seed = 701;
  const gy = 61;
  // Corps principal : étage à colombages.
  wallPlaster(px, 26, 74, 24, 41, M.plaster, seed);
  timberFrame(px, [26, 41, 58, 73], [32], 24, 41, [[28, 41, 34, 33], [39, 41, 33, 33], [60, 41, 66, 33], [71, 41, 65, 33]]);
  windowAt(px, 30, 33, { w: 7, h: 7, box: true, seed });
  windowAt(px, 47, 31, { w: 7, h: 9, shutter: SHUTTERS.ochre, seed: seed + 1 });
  windowAt(px, 63, 33, { w: 7, h: 7, box: true, seed: seed + 2 });
  rect(px, 25, 41, 51, 1, M.timber.light);
  rect(px, 25, 42, 51, 1, M.timber.dark);
  // Rez-de-chaussée de pierre.
  wallStone(px, 27, 73, 43, gy, M.stoneWarm, seed, 0.3);
  eaveShadow(px, 27, 73, 43, 3);
  doorAt(px, 45, gy, { w: 12, h: 15, frame: M.stoneWarm, double: true, studs: 1 });
  windowAt(px, 31, 46, { w: 8, h: 7 });
  windowAt(px, 63, 45, { w: 8, h: 6 });
  lantern(px, 42, 46, -1);
  lantern(px, 59, 46, 1);
  // Tonneaux.
  for (const bx of [60, 67]) {
    for (let j = 0; j < 9; j++) {
      for (let i = 0; i < 7; i++) {
        const edge = (j === 0 || j === 8) && (i === 0 || i === 6);
        if (edge) continue;
        let t = i < 2 ? 3 : i > 4 ? 1 : 2;
        if (j === 2 || j === 6) t = 0;
        px.set(bx + i, 53 + j, j === 2 || j === 6 ? M.iron.base : tone(M.wood, t));
      }
    }
    rect(px, bx + 1, 53, 5, 1, M.wood.hi);
  }
  roofSide(px, { x0: 23, x1: 76, y0: 3, y1: 26, hip: 3, kind: 'tile', m: M.tileRed, seed });
  // Lucarnes.
  for (const lx of [36, 60]) {
    wallPlaster(px, lx - 4, lx + 4, 12, 20, M.plaster, seed + lx);
    windowAt(px, lx - 2, 13, { w: 5, h: 6 });
    roofGable(px, { cx: lx, halfW: 6, apexY: 7, baseY: 13, depth: 3, kind: 'tile', m: M.tileRed, seed });
  }
  chimney(px, 65, 0, 6, 11, M.brick, seed);
  // Aile en pignon, plus basse, devant le corps.
  wallPlaster(px, 3, 25, 30, gy - 4, M.plaster, seed + 9);
  timberFrame(px, [3, 14, 24], [44], 30, gy - 4, [[5, gy - 4, 12, 46], [22, gy - 4, 16, 46]]);
  windowAt(px, 7, 47, { w: 6, h: 7, shutter: SHUTTERS.ochre, seed: seed + 3 });
  windowAt(px, 17, 35, { w: 5, h: 6 });
  plinth(px, 3, 25, gy - 3, gy, M.stoneWarm, seed);
  roofGable(px, { cx: 14, halfW: 13, apexY: 21, baseY: 36, depth: 6, kind: 'tile', m: M.tileRed, seed: seed + 4 });
  hangingSign(px, 26, 44, -1, 'tankard');
  finish(px);
  tufts(px, 2, 75, gy, seed, [[41, 60], [59, 74]]);
}

/** Forge : maison de pierre à grosse cheminée et appentis ouvert (foyer rougeoyant, enclume, outils). */
export function paintForge(px: Px, _rnd: Rnd): void {
  const seed = 801;
  const gy = 45;
  // Appentis : fond très sombre, lueur orangée du foyer au fond à gauche.
  const inside = mix(P.brique, DEEP, 0.72);
  for (let y = 17; y <= gy; y++) {
    for (let x = 37; x <= 58; x++) {
      const d = Math.hypot((x - 43) * 0.9, y - 33);
      const glow = Math.max(0, 1 - d / 15);
      px.set(x, y, mix(inside, P.orangeForge, glow * glow * 0.75));
    }
  }
  // Sol de terre battue éclairé par le feu.
  for (let x = 37; x <= 58; x++) for (let y = gy - 2; y <= gy; y++) px.set(x, y, mix(M.boards.dark, P.braise, Math.max(0, 0.35 - Math.abs(x - 45) / 40)));
  // Foyer de pierre et braises.
  wallStone(px, 38, 47, 29, 39, M.stoneMount, seed + 1, 0);
  rect(px, 40, 31, 6, 4, P.ombreProfonde);
  for (let i = 0; i < 6; i++) {
    px.set(40 + i, 34, i % 2 ? P.braise : P.orangeForge);
    px.set(40 + i, 33, i % 3 === 0 ? GLOW : mix(P.orangeForge, DEEP, 0.3));
  }
  px.set(42, 32, GLOW);
  px.set(43, 31, P.braise);
  for (const [sx, sy] of [[44, 27], [41, 25], [46, 23]] as const) px.set(sx, sy, P.braise);
  // Soufflet.
  rect(px, 48, 33, 4, 3, M.log.dark);
  rect(px, 48, 33, 4, 1, M.log.light);
  // Outils suspendus au fond.
  for (const [tx, len] of [[51, 6], [54, 5], [56, 7]] as const) {
    rect(px, tx, 21, 1, len, M.iron.light);
    rect(px, tx - 1, 21 + len, 3, 2, M.iron.base);
  }
  // Enclume au premier plan, sur son billot.
  rect(px, 49, 41, 5, 4, M.log.base);
  rect(px, 49, 41, 1, 4, M.log.light);
  rect(px, 53, 41, 1, 4, M.log.dark);
  rect(px, 46, 37, 11, 2, M.iron.light);
  rect(px, 46, 37, 11, 1, M.iron.hi);
  px.set(45, 37, M.iron.light);
  px.set(44, 37, M.iron.base);
  rect(px, 48, 39, 7, 2, M.iron.dark);
  px.set(47, 36, P.braise);
  // Poteaux de l'appentis.
  for (const x of [37, 57]) {
    rect(px, x, 21, 2, gy - 20, M.wood.base);
    rect(px, x, 21, 1, gy - 20, M.wood.light);
    rect(px, x + 1, 21, 1, gy - 20, M.wood.dark);
  }
  // Toit en appentis (bardeaux) et son ombre sur l'ouverture.
  roofSide(px, { x0: 35, x1: 60, y0: 10, y1: 21, hip: 0, kind: 'shingle', m: M.shingle, seed: seed + 2, moss: 0.15 });
  tint(px, 37, 22, 22, 2, DEEP, 0.4);
  // Corps de pierre.
  wallStone(px, 3, 36, 22, gy, M.stoneWarm, seed, 0.25);
  windowAt(px, 6, 29, { w: 7, h: 7, frame: M.iron });
  for (let j = 30; j < 35; j += 2) rect(px, 7, j, 5, 1, M.iron.dark);
  doorAt(px, 21, gy, { w: 10, h: 16, frame: M.stoneMount, m: M.boards });
  // Plaque à l'enclume au-dessus de la porte.
  rect(px, 23, 24, 7, 3, M.wood.dark);
  rect(px, 24, 25, 5, 1, M.iron.light);
  eaveShadow(px, 3, 36, 24, 4);
  roofSide(px, { x0: 1, x1: 38, y0: 3, y1: 25, hip: 2, kind: 'slate', m: M.slateDark, seed });
  chimney(px, 6, 0, 9, 14, M.brick, seed);
  finish(px);
  tufts(px, 2, 36, gy, seed, [[17, 34]]);
}

/** Temple : façade en pignon, rosace, contreforts, portail à double vantail, clocheton doré, bas-côtés. */
export function paintTemple(px: Px, _rnd: Rnd): void {
  const seed = 901;
  const gy = 61;
  const stone = M.stoneTemple;
  // Bas-côtés.
  for (const [x0, x1] of [[3, 13], [45, 56]] as const) {
    wallStone(px, x0, x1, 38, gy, stone, seed + x0, 0.3);
    roofSide(px, { x0: x0 - 1, x1: x1 + 1, y0: 31, y1: 39, hip: 0, kind: 'slate', m: M.slate, seed: seed + x0 });
    const lx = x0 + Math.floor((x1 - x0) / 2) - 1;
    rect(px, lx - 1, 43, 5, 11, stone.dark);
    for (let j = 0; j < 9; j++) {
      for (let i = 0; i < 3; i++) {
        if (j === 0 && i !== 1) continue;
        px.set(lx + i, 44 + j, j < 4 ? GLASS_TOP : mix(P.violetPale, GLASS_BOTTOM, 0.5));
      }
    }
  }
  // Nef : façade.
  wallStone(px, 13, 45, 16, gy, stone, seed, 0.2, true);
  // Contreforts.
  for (const bx of [12, 43]) {
    for (let y = 34; y <= gy; y++) {
      const step = y < 38 ? 1 : 0;
      for (let i = step; i < 4; i++) px.set(bx + i, y, tone(stone, i === step ? 4 : i === 3 ? 1 : 2));
    }
    rect(px, bx, 33, 4, 1, stone.light);
  }
  // Rosace.
  roundWindow(px, 29, 31, 5, stone, [P.cyanEclat, P.lumiereDoree, mix(P.violetPale, P.ciel, 0.2), mix(P.rougeCendre, P.braise, 0.4)]);
  px.set(29, 31, P.lumiereDoree);
  // Portail.
  doorAt(px, 23, gy - 1, { w: 13, h: 17, frame: stone, double: true, studs: 1, m: ramp(mix(P.brique, P.terreSombre, 0.4), DEEP, P.ocreClair) });
  rect(px, 18, gy, 23, 1, stone.light);
  rect(px, 16, gy + 1, 27, 1, stone.dark);
  // Toit de la nef (pignon d'ardoise).
  roofGable(px, { cx: 29, halfW: 18, apexY: 13, baseY: 31, depth: 8, kind: 'slate', m: M.slate, seed, barge: stone });
  // Clocheton : arcade, cloche dorée, flèche et soleil.
  rect(px, 25, 4, 9, 9, stone.base);
  rect(px, 25, 4, 1, 9, stone.light);
  rect(px, 32, 4, 2, 9, stone.dark);
  rect(px, 27, 6, 5, 6, DEEP);
  px.set(27, 6, stone.base);
  px.set(31, 6, stone.base);
  rect(px, 28, 8, 3, 3, P.ambre);
  px.set(28, 8, P.jauneBle);
  px.set(29, 11, P.ambre);
  for (const [y, x0, x1] of [[1, 28, 30], [2, 27, 31], [3, 25, 33]] as const) {
    for (let x: number = x0; x <= x1; x++) px.set(x, y, x < 29 ? M.slate.light : x === 29 ? M.slate.hi : M.slate.dark);
  }
  px.set(29, 0, P.jauneBle);
  finish(px);
  tufts(px, 2, 57, gy, seed, [[15, 43]]);
}

/** Moulin : tour ronde de pierre, toit conique de chaume, quatre ailes entoilées, sacs de farine. */
/** Ailes du moulin : 4 images de 22,5° (symétrie d'ordre 4 → rotation continue). */
export const MILL_MS = [170, 170, 170, 170] as const;

export function paintMill(px: Px, _rnd: Rnd, _variant = 0, frame = 0): void {
  const seed = 1001;
  const gy = 61;
  const cx = 29;
  // Tour (cylindre).
  for (let y = 22; y <= gy; y++) {
    const hw = Math.round(11 + ((y - 22) / (gy - 22)) * 4);
    const row = Math.floor((gy - y) / 5);
    for (let x = cx - hw; x <= cx + hw; x++) {
      const rel = (x - cx) / hw;
      let t = rel < -0.65 ? 3 : rel < 0.15 ? 2 : rel < 0.65 ? 1.4 : 0.6;
      const ly = (gy - y) % 5;
      const jx = (x + (row % 2) * 3 + 600) % 7;
      if (ly === 4 || jx === 0) t -= 1;
      else if (ly === 3) t += 0.5;
      if (h(x, y, seed) < 0.05) t -= 1;
      if (y > gy - 8 && h(x >> 1, row, seed + 3) < 0.3 && ly === 3) {
        px.set(x, y, M.moss.base);
        continue;
      }
      px.set(x, y, tone(M.plaster, t));
    }
  }
  doorAt(px, 25, gy, { w: 9, h: 14, m: M.boards });
  rect(px, 32, 30, 4, 5, M.timber.dark);
  rect(px, 33, 31, 2, 3, GLASS_BOTTOM);
  // Sacs de farine.
  for (const [sx, sy, sw, sh] of [[37, 54, 7, 8], [43, 56, 6, 6]] as const) {
    for (let j = 0; j < sh; j++) {
      for (let i = 0; i < sw; i++) {
        if ((j === 0 || j === sh - 1) && (i === 0 || i === sw - 1)) continue;
        px.set(sx + i, sy + j, tone(M.burlap, i < 2 ? 3 : i > sw - 3 ? 1 : 2));
      }
    }
    px.set(sx + Math.floor(sw / 2), sy, M.burlap.dark);
  }
  // Toit conique de chaume.
  for (let y = 6; y <= 26; y++) {
    const hw = Math.round(1 + ((y - 6) / 20) * 15);
    for (let x = cx - hw; x <= cx + hw; x++) {
      if (y >= 25 && Math.abs(x - cx) >= hw - 1) continue;
      const rel = (x - cx) / Math.max(1, hw);
      let t = rel < -0.5 ? 3 : rel < 0.25 ? 2 : rel < 0.7 ? 1.4 : 0.6;
      const v = h(x, Math.floor(y / 3), seed + 2);
      if (v < 0.18) t -= 1;
      else if (v > 0.9) t += 1;
      const e = 26 - y;
      if (e === 0) t = 1;
      else if (e <= 2) t = Math.max(t, 3);
      if ((y - 6 + Math.round(rel * 3)) % 6 === 5) t -= 0.6;
      px.set(x, y, tone(M.thatch, t));
    }
  }
  rect(px, cx, 3, 1, 4, M.wood.dark);
  px.set(cx, 2, M.wood.light);
  // Ailes en croix (X), entoilées sur un côté.
  const hub = { x: cx + 0.5, y: 27.5 };
  const turn = (frame * Math.PI) / 8;
  const arms = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].map((a) => a + turn);
  arms.forEach((a) => {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const nx = -dy;
    const ny = dx;
    const furled = false;
    for (let s = 5; s <= 26; s += 0.5) {
      for (let w = 0; w <= 5; w += 0.5) {
        const x = Math.round(hub.x + dx * s + nx * w);
        const y = Math.round(hub.y + dy * s + ny * w);
        const si = Math.round(s);
        const edge = Math.round(w) === 5;
        const bar = si % 5 === 0;
        let color: number;
        if (w < 1) color = M.wood.dark;
        else if (furled) {
          if (!edge && !bar) continue;
          color = M.wood.base;
        } else if (edge) color = M.wood.base;
        else {
          const lit = dx + dy < 0 ? 3 : dx - dy < 0 ? 2.4 : 1.6;
          color = tone(M.canvas, lit - (Math.round(w) === 1 ? 0.8 : 0) - (bar ? 0.7 : 0));
        }
        px.set(x, y, color);
      }
    }
  });
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) px.set(cx + x, 27 + y, x + y < 0 ? M.wood.light : M.wood.dark);
  px.set(cx, 27, M.iron.base);
  finish(px);
  tufts(px, 13, 46, gy, seed, [[22, 36]]);
}

/** Tour de garde : fût de pierre à fruit, hourds de bois, toit pointu, bannière, torche. */
export function paintGuardTower(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 1101 + variant;
  const gy = 61;
  // Fût (fruit à la base).
  wallStone(px, 5, 23, 24, gy - 8, M.stoneGrey, seed, 0.15);
  wallStone(px, 4, 24, gy - 7, gy, M.stoneGrey, seed + 1, 0.5, true);
  rect(px, 4, gy - 8, 21, 1, M.stoneGrey.light);
  // Archères.
  for (const ay of [31, 41]) {
    rect(px, 13, ay, 2, 6, DEEP);
    rect(px, 12, ay - 1, 4, 1, M.stoneGrey.light);
    rect(px, 15, ay, 1, 6, M.stoneGrey.dark);
  }
  doorAt(px, 10, gy, { w: 9, h: 13, frame: M.stoneGrey, m: M.boards });
  // Bannière.
  const banner = variant === 1 ? SHUTTERS.blue : SHUTTERS.red;
  for (let j = 0; j < 13; j++) {
    for (let i = 0; i < 6; i++) {
      if (j === 12 && (i === 2 || i === 3)) continue;
      px.set(6 + i, 25 + j, tone(banner, i === 0 ? 3 : i === 5 ? 1 : 2));
    }
  }
  px.set(8, 29, P.jauneBle);
  px.set(9, 29, P.jauneBle);
  px.set(8, 30, P.ambre);
  rect(px, 5, 24, 8, 1, M.wood.dark);
  // Torche.
  px.set(22, 50, M.iron.base);
  px.set(22, 51, M.iron.dark);
  px.set(21, 49, M.iron.base);
  px.set(21, 47, P.orangeForge);
  px.set(21, 48, P.braise);
  px.set(21, 46, GLOW);
  px.set(20, 47, P.braise);
  eaveShadow(px, 5, 23, 24, 3);
  // Hourds.
  wallBoards(px, 2, 26, 14, 22, M.wood, seed);
  for (const lx of [7, 14, 21]) rect(px, lx, 16, 1, 4, DEEP);
  for (let x = 3; x <= 25; x += 5) {
    rect(px, x, 23, 2, 2, M.timber.base);
    px.set(x, 23, M.timber.light);
  }
  // Toit pointu d'ardoise.
  roofSide(px, { x0: 1, x1: 27, y0: 4, y1: 15, hip: 13, kind: 'slate', m: M.slateDark, seed });
  rect(px, 14, 0, 1, 5, M.iron.base);
  rect(px, 15, 0, 4, 2, P.rougeCendre);
  px.set(15, 1, mix(P.rougeCendre, DEEP, 0.4));
  finish(px);
  tufts(px, 3, 25, gy, seed, [[7, 21]]);
}
