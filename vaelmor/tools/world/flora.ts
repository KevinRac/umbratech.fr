/**
 * Végétation du monde ouvert (refonte graphique, étape 3 — décision n°45).
 *
 * - Feuillus : 3 à 4 masses de feuillage (et quelques touffes), chacune éclairée
 *   comme une sphère (lumière en haut à gauche), séparées par une ombre de contact ;
 *   bord de la silhouette « feuillu » (pointes irrégulières) ; tronc à écorce
 *   striée, évasé en racines, mousse au pied ; ombre portée douce vers le bas à droite.
 * - Conifères : étages superposés à bord inférieur festonné (pointes des branches),
 *   face gauche éclairée, ombre sous chaque étage ; variante enneigée en montagne.
 * - Buissons, fleurs sauvages, herbes hautes, lavande, tournesols.
 *
 * Vent : chaque peintre reçoit `frame` (0..3) ; `SWAY[frame]` cisaille le haut
 * de la plante d'un pixel. Le générateur en fait une animation de tuiles Tiled,
 * jouée par la couche GPU de Phaser (aucun coût CPU).
 */
import { hash2 } from './noise';
import { SHADE, ramp, type Ramp, type Rnd } from './art';
import { mix, Px } from './px';
import { PALETTE as P } from '../../src/render/palette';

const DEEP = P.ombreProfonde;

/** Balancement par image (px) et durée des images (ms) : un aller-retour en ~1,9 s. */
export const SWAY = [0, 1, 0, -1] as const;
export const WIND_MS = [560, 420, 560, 420] as const;

const tone = (r: Ramp, t: number): number => {
  const k = Math.max(0, Math.min(4, Math.round(t)));
  return k === 0 ? r.deep : k === 1 ? r.dark : k === 2 ? r.base : k === 3 ? r.light : r.hi;
};
const h = (x: number, y: number, s: number): number => hash2(x, y, s);

/* ---------- Matières ---------- */

export const LEAF = {
  summer: ramp(mix(P.mousse, P.vertDore, 0.32), mix(P.vertProfond, P.ombreViolette, 0.5), mix(P.vertDore, P.lumiereChaude, 0.5)),
  deep: ramp(mix(P.vertProfond, P.mousse, 0.55), mix(P.ombreProfonde, P.vertProfond, 0.45), mix(P.oliveClair, P.lumiereChaude, 0.35)),
  autumn: ramp(mix(P.ocre, P.terreCuite, 0.4), mix(P.brique, P.ombreViolette, 0.55), P.lumiereDoree),
  gold: ramp(mix(P.ocre, P.jauneBle, 0.45), mix(P.terreCuite, P.ombreViolette, 0.5), P.lumiereDoree),
  pine: ramp(mix(P.vertProfond, P.bleuGris, 0.22), mix(P.ombreProfonde, P.vertProfond, 0.3), mix(P.mousse, P.oliveClair, 0.55)),
  mistPine: ramp(mix(P.vertProfond, P.ardoiseSombre, 0.4), mix(P.ombreProfonde, P.violetBrume, 0.25), mix(P.mousse, P.bleuGris, 0.45)),
  grass: ramp(mix(P.olive, P.vertDore, 0.42), mix(P.oliveSombre, P.ombreViolette, 0.45), mix(P.oliveClair, P.lumiereChaude, 0.5)),
  lavenderLeaf: ramp(mix(P.oliveClair, P.bleuGris, 0.35), mix(P.oliveSombre, P.ombreViolette, 0.45), mix(P.oliveClair, P.ecume, 0.5)),
} as const;

const BARK = ramp(mix(P.terreSombre, P.grisRoux, 0.35), mix(P.ombreProfonde, P.brique, 0.3), P.terreSeche);
const DEAD_BARK = ramp(mix(P.grisRoux, P.terreSeche, 0.35), mix(P.ombreProfonde, P.violetBrume, 0.3), P.pierre);
const MOSS = ramp(mix(P.mousse, P.olive, 0.3), mix(P.oliveSombre, P.violetBrume, 0.45), P.oliveClair);
const SNOW = ramp(P.ecume, mix(P.ardoise, P.violetPale, 0.45), 0xffffff);

/* ---------- Outils ---------- */

/** Ombre au sol (ellipse douce) posée seulement sur le vide. */
function groundShadow(px: Px, cx: number, cy: number, rx: number, ry: number, core = 95): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1 || px.alphaAt(x, y) !== 0) continue;
      px.set(x, y, SHADE, d > 0.62 ? Math.round(core * 0.6) : core);
    }
  }
}

/** Contour coloré : teinte du voisin assombrie et tirée vers le violet ; ne touche pas aux ombres opaques. */
function outline(px: Px): void {
  const marks: [number, number, number][] = [];
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) {
      if (px.alphaAt(x, y) === 255) continue;
      for (const [nx, ny] of [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]] as const) {
        if (px.alphaAt(nx, ny) === 255) {
          marks.push([x, y, mix(mix(px.colorAt(nx, ny), DEEP, 0.62), P.violetBrume, 0.18)]);
          break;
        }
      }
    }
  }
  for (const [x, y, c] of marks) px.set(x, y, c);
}

/** Copie `src` dans `dst` en cisaillant : décalage de `sway` px en haut, nul à `y1` et dessous. */
function blitSheared(dst: Px, src: Px, sway: number, y0: number, y1: number): void {
  for (let y = 0; y < src.height; y++) {
    const f = y1 <= y0 ? 0 : Math.max(0, Math.min(1, (y1 - y) / (y1 - y0)));
    const dx = Math.round(sway * f * 1.15);
    for (let x = 0; x < src.width; x++) {
      const a = src.alphaAt(x, y);
      if (a === 0) continue;
      dst.set(x + dx, y, src.colorAt(x, y), a);
    }
  }
}

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly ry?: number;
}

const L = (() => {
  const v = [-0.5, -0.72, 0.55];
  const n = Math.hypot(v[0] as number, v[1] as number, v[2] as number);
  return v.map((c) => c / n) as [number, number, number];
})();

/**
 * Couronne de feuillage : masses sphériques dessinées du fond vers l'avant,
 * bord feuillu, touffes de feuilles, ombre de contact entre masses.
 */
function paintCrown(dst: Px, puffs: readonly Puff[], leaf: Ramp, seed: number, opts: { blossom?: readonly number[]; fruit?: number } = {}): void {
  const W = dst.width;
  const H = dst.height;
  const id = new Int16Array(W * H).fill(-1);
  const lum = new Float32Array(W * H);
  puffs.forEach((p, n) => {
    const ry = p.ry ?? p.r;
    for (let y = Math.floor(p.y - ry - 2); y <= Math.ceil(p.y + ry + 2); y++) {
      for (let x = Math.floor(p.x - p.r - 2); x <= Math.ceil(p.x + p.r + 2); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = (x + 0.5 - p.x) / p.r;
        const dy = (y + 0.5 - p.y) / ry;
        const d2 = dx * dx + dy * dy;
        // Bord feuillu : rayon modulé par l'angle (pointes) et par le pixel.
        const ang = Math.atan2(dy, dx);
        const edge = 1 + (h(Math.round((ang + Math.PI) * 3.2), n, seed) - 0.5) * 0.22 + (h(x, y, seed + n) - 0.5) * 0.14;
        if (d2 > edge * edge) continue;
        const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d2)));
        // Touffes de feuilles (~3 px) : relief local.
        const clump = (h(Math.floor((x + (y % 2)) / 3), Math.floor(y / 3), seed + 3) - 0.5) * 0.34;
        lum[y * W + x] = dx * (L[0] as number) + dy * (L[1] as number) + nz * (L[2] as number) + clump;
        id[y * W + x] = n;
      }
    }
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const n = id[i] as number;
      if (n < 0) continue;
      const l = lum[i] as number;
      let t = l > 0.8 ? 4 : l > 0.52 ? 3 : l > 0.18 ? 2 : l > -0.2 ? 1 : 0;
      // Ombre de contact : la masse de derrière s'assombrit au bord d'une masse de devant.
      const front = (xx: number, yy: number): boolean => xx >= 0 && yy >= 0 && xx < W && yy < H && (id[yy * W + xx] as number) > n;
      if (front(x, y + 1) || front(x + 1, y) || front(x, y + 2)) t = Math.min(t, 1) - (front(x, y + 1) ? 1 : 0);
      // Masse de devant : liseré clair sur son bord haut-gauche.
      const behind = (xx: number, yy: number): boolean => xx >= 0 && yy >= 0 && xx < W && yy < H && (id[yy * W + xx] as number) >= 0 && (id[yy * W + xx] as number) < n;
      if ((behind(x, y - 1) || behind(x - 1, y)) && t >= 2) t += 1;
      let color = tone(leaf, t);
      if (opts.blossom && t >= 2 && h(x, y, seed + 9) < 0.07) color = opts.blossom[Math.floor(h(y, x, seed) * opts.blossom.length)] as number;
      if (opts.fruit !== undefined && t >= 1 && t <= 3 && h(x, y, seed + 11) < 0.018) color = opts.fruit;
      dst.set(x, y, color);
    }
  }
}

/** Tronc à écorce striée, évasé en racines au pied, mousse côté nord-ouest. */
function paintTrunk(px: Px, cx: number, yTop: number, yBottom: number, w: number, bark: Ramp, seed: number, roots = true): void {
  for (let y = yTop; y <= yBottom; y++) {
    const flare = roots ? Math.max(0, y - (yBottom - 4)) * 0.9 : 0;
    const half = w / 2 + flare;
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half) - 1;
    for (let x = x0; x <= x1; x++) {
      const rel = (x - x0 + 0.5) / Math.max(1, x1 - x0 + 1);
      let t = rel < 0.3 ? 3 : rel < 0.68 ? 2 : 1;
      if ((x + Math.floor(y / 3) + Math.floor(h(x, 0, seed) * 3)) % 3 === 0 && h(x, y >> 1, seed) < 0.55) t -= 1;
      if (y < yTop + 4) t -= 1; // ombre de la couronne
      if (y > yBottom - 3 && rel < 0.35 && h(x, y, seed + 1) < 0.6) {
        px.set(x, y, tone(MOSS, 2 + (rel < 0.15 ? 1 : 0)));
        continue;
      }
      px.set(x, y, tone(bark, t));
    }
  }
  if (!roots) return;
  // Racines : deux ou trois tentacules qui plongent dans le sol.
  for (const [dir, len] of [[-1, 4], [1, 4], [1, 2]] as const) {
    const sx = dir < 0 ? Math.round(cx - w / 2 - 3) : Math.round(cx + w / 2 + 2);
    for (let i = 0; i < len; i++) {
      const x = sx + dir * i;
      const y = yBottom - 1 + Math.floor(i / 2);
      px.set(x, y, tone(bark, dir < 0 ? 3 : 1));
      px.set(x, y + 1, tone(bark, 0));
    }
  }
}

/* ---------- Arbres ---------- */

/** Couronnes de feuillus (3×3 cases) : 3-4 masses principales + touffes. */
const OAK_SHAPES: readonly (readonly Puff[])[] = [
  [{ x: 24, y: 10, r: 9 }, { x: 13, y: 16, r: 8 }, { x: 35, y: 15, r: 8 }, { x: 18, y: 23, r: 8 }, { x: 31, y: 23, r: 8 }, { x: 24, y: 25, r: 6 }],
  [{ x: 20, y: 11, r: 9 }, { x: 32, y: 12, r: 8 }, { x: 11, y: 20, r: 7 }, { x: 37, y: 21, r: 7 }, { x: 24, y: 22, r: 10, ry: 8 }],
  [{ x: 26, y: 9, r: 8 }, { x: 15, y: 13, r: 8 }, { x: 35, y: 18, r: 8 }, { x: 14, y: 24, r: 7 }, { x: 25, y: 22, r: 9 }, { x: 34, y: 27, r: 5 }],
];

export const OAK_FOOT = { x: 1, y: 2 } as const;

/** Feuillu 3×3 : variantes 0-1 vert, 2 en fleurs, 3 automne, 4 doré. */
export function paintOak(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 1201 + variant * 17;
  const leaf = variant === 3 ? LEAF.autumn : variant === 4 ? LEAF.gold : LEAF.summer;
  groundShadow(px, 28, 42, 16, 5);
  groundShadow(px, 25, 44, 6, 2, 140);
  paintTrunk(px, 24, 24, 44, 6, BARK, seed);
  // Branche visible entre les masses.
  for (let i = 0; i < 5; i++) px.set(26 + i, 27 - i, BARK.dark);
  const crown = new Px(px.width, px.height);
  const shape = OAK_SHAPES[variant % OAK_SHAPES.length] as readonly Puff[];
  paintCrown(crown, shape, leaf, seed, variant === 2 ? { blossom: [P.ecume, mix(P.rougeCendre, P.ecume, 0.6), 0xfff4f0] } : variant === 1 ? { fruit: mix(P.rougeCendre, P.orangeForge, 0.3) } : {});
  blitSheared(px, crown, SWAY[frame] as number, 2, 30);
  outline(px);
}

export const PINE_FOOT = { x: 1, y: 3 } as const;

/** Conifère 3×4 : étages festonnés ; `mist` = sapin de la brume (bleuté), `snow` = enneigé. */
function conifer(px: Px, seed: number, leaf: Ramp, frame: number, opts: { snow?: boolean; slim?: boolean } = {}): void {
  const W = px.width;
  groundShadow(px, 28, 59, 14, 4);
  groundShadow(px, 25, 60, 5, 2, 140);
  paintTrunk(px, 24, 42, 60, 4, BARK, seed);
  const crown = new Px(px.width, px.height);
  const slim = opts.slim ? 0.78 : 1;
  const tiers = [
    { apex: 25, base: 47, hw: 20 },
    { apex: 18, base: 39, hw: 17 },
    { apex: 11, base: 31, hw: 14 },
    { apex: 5, base: 23, hw: 10 },
    { apex: 1, base: 15, hw: 6 },
  ];
  const tierOf = new Int8Array(W * px.height).fill(-1);
  tiers.forEach((tr, n) => {
    const hw = tr.hw * slim;
    for (let y = tr.apex; y <= tr.base; y++) {
      const f = (y - tr.apex) / (tr.base - tr.apex);
      const half = Math.max(0.6, hw * Math.pow(f, 0.85));
      for (let x = Math.floor(24 - half); x <= Math.ceil(24 + half) - 1; x++) {
        // Bord inférieur festonné : pointes des branches.
        const tip = Math.round(2.2 * Math.abs(Math.sin((x - 24) * 0.62 + n * 1.3)) + h(x, n, seed) * 1.4);
        if (y > tr.base - tip) continue;
        const s = (x + 0.5 - 24) / half;
        let l = -0.75 * s + 0.35 * (1 - f) - 0.05 + (h(x, Math.floor(y / 2), seed + n) - 0.5) * 0.45;
        if (y >= tr.base - tip - 1) l -= 0.45; // dessous de l'étage
        let t = l > 0.62 ? 4 : l > 0.25 ? 3 : l > -0.15 ? 2 : l > -0.55 ? 1 : 0;
        crown.set(x, y, tone(leaf, t));
        tierOf[y * W + x] = n;
      }
    }
  });
  // Ombre de l'étage du dessus sur celui du dessous.
  for (let y = 2; y < px.height; y++) {
    for (let x = 0; x < W; x++) {
      const n = tierOf[y * W + x] as number;
      if (n < 0) continue;
      const above1 = tierOf[(y - 1) * W + x] as number;
      const above2 = tierOf[(y - 2) * W + x] as number;
      if (above1 > n || above2 > n) crown.set(x, y, mix(crown.colorAt(x, y), DEEP, above1 > n ? 0.45 : 0.25));
    }
  }
  // Neige : sur le dessus visible de chaque étage (juste sous l'étage supérieur), côté éclairé.
  if (opts.snow) {
    for (let x = 0; x < W; x++) {
      let prev = -1;
      let run = 0;
      for (let y = 0; y < px.height; y++) {
        const n = tierOf[y * W + x] as number;
        if (n < 0) {
          prev = -1;
          continue;
        }
        if (n !== prev) run = 0;
        prev = n;
        run++;
        const lit = x < 24 + 6 - run;
        if (run <= 3 && lit && h(x, y, seed + 7) < 0.8) crown.set(x, y, tone(SNOW, run === 1 ? 4 : x < 22 ? 3 : 2));
      }
    }
  }
  blitSheared(px, crown, SWAY[frame] as number, 0, 44);
  outline(px);
}

/** Pin de la forêt (variantes : 0-1 vert, 2 élancé, 3 roussi). */
export function paintPine(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const leaf = variant === 3 ? { ...LEAF.pine, base: mix(LEAF.pine.base, P.ocre, 0.35), light: mix(LEAF.pine.light, P.ocreClair, 0.3) } : LEAF.pine;
  conifer(px, 1301 + variant * 13, leaf, frame, { slim: variant === 2 });
}

/** Sapin de la brume et des monts (variantes : 0-1 bleuté, 2 élancé, 3 enneigé). */
export function paintDarkPine(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  conifer(px, 1401 + variant * 13, LEAF.mistPine, frame, { slim: variant === 2, snow: variant === 3 });
}

export const DEAD_FOOT = { x: 1, y: 2 } as const;

/** Arbre mort 3×3 : tronc tordu, branches noueuses, quelques feuilles sèches. */
export function paintDeadTree(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 1501 + variant;
  groundShadow(px, 27, 43, 9, 3);
  paintTrunk(px, 24, 16, 44, 5, DEAD_BARK, seed);
  const branches: [number, number, number, number][] =
    variant % 2 === 0
      ? [[22, 26, 12, 16], [12, 16, 8, 8], [12, 16, 15, 9], [26, 22, 36, 14], [36, 14, 40, 6], [36, 14, 33, 7], [24, 18, 25, 6]]
      : [[23, 24, 10, 20], [10, 20, 6, 13], [26, 20, 38, 18], [38, 18, 42, 11], [30, 19, 30, 10], [24, 17, 20, 7]];
  for (const [x0, y0, x1, y1] of branches) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      px.set(x, y, DEAD_BARK.base);
      px.set(x, y + 1, DEAD_BARK.dark);
      if (i < n / 2) px.set(x + 1, y, DEAD_BARK.dark);
    }
    px.set(x1, y1, DEAD_BARK.light);
  }
  for (let i = 0; i < 6; i++) px.set(8 + Math.floor(h(i, 1, seed) * 34), 6 + Math.floor(h(i, 2, seed) * 14), i % 2 ? P.ocre : P.terreCuite);
  outline(px);
}

/* ---------- Petites plantes ---------- */

/** Buisson 1×1 en 2-3 masses (variantes : vert, baies, automne, fleuri). */
export function paintBush(px: Px, _rnd: Rnd, variant: number): void {
  const seed = 1601 + variant;
  groundShadow(px, 9.5, 13.5, 7, 2.2);
  const leaf = variant === 2 ? LEAF.autumn : variant === 4 ? LEAF.deep : LEAF.summer;
  const crown = new Px(16, 16);
  paintCrown(crown, [{ x: 8.5, y: 7.5, r: 5 }, { x: 5, y: 10, r: 4 }, { x: 11.5, y: 10, r: 4.2 }], leaf, seed, variant === 1 ? { fruit: mix(P.rougeCendre, P.violetPale, 0.2) } : variant === 3 ? { blossom: [P.ecume, P.jauneBle] } : {});
  if (variant === 1) {
    for (const [x, y] of [[6, 9], [10, 7], [12, 11], [8, 12]] as const) if (crown.alphaAt(x, y)) crown.set(x, y, mix(P.rougeCendre, P.braise, 0.25));
  }
  px.blit(crown, 0, 0, 16, 16, 0, 0);
  outline(px);
}

/** Touffe d'herbes hautes 1×1, animée au vent. */
export function paintTallGrass(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 1701 + variant;
  const g = variant === 2 ? LEAF.gold : LEAF.grass;
  const sway = SWAY[frame] as number;
  groundShadow(px, 9, 14.5, 6.5, 1.8, 100);
  const blades = 13 + (variant % 2) * 3;
  for (let b = 0; b < blades; b++) {
    const bx = 2 + Math.floor(h(b, 0, seed) * 12);
    const len = 6 + Math.floor(h(b, 1, seed) * 8);
    const lean = (h(b, 2, seed) - 0.5) * 5;
    const back = b < blades / 2;
    for (let i = 0; i < len; i++) {
      const f = i / len;
      const x = Math.round(bx + lean * f * f + sway * f * f * 1.7);
      const y = 14 - i - (back ? 1 : 0);
      let tt = f > 0.78 ? 4 : f > 0.5 ? 3 : f > 0.22 ? 2 : 1;
      if (back) tt -= 1;
      px.set(x, y, tone(g, tt));
    }
  }
  if (variant === 1) for (let b = 0; b < 3; b++) px.set(4 + b * 4 + sway, 2 + b, P.parchemin);
}

const FLOWER_SETS: readonly (readonly number[])[] = [
  [mix(P.rougeCendre, P.orangeForge, 0.3), mix(P.rougeCendre, P.braise, 0.5)], // coquelicots
  [P.ecume, 0xfffaf0], // marguerites
  [mix(P.bleuGris, P.ciel, 0.55), mix(P.violetPale, P.ciel, 0.4)], // campanules
  [P.jauneBle, mix(P.jauneBle, P.ecume, 0.4)], // boutons d'or
];

/** Massif de fleurs sauvages 1×1 (variantes : coquelicots, marguerites, campanules, boutons d'or). */
export function paintFlowers(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 1801 + variant;
  const set = FLOWER_SETS[variant % FLOWER_SETS.length] as readonly number[];
  const sway = SWAY[frame] as number;
  groundShadow(px, 8.5, 13.5, 7, 2, 70);
  for (let i = 0; i < 18; i++) {
    const x = 1 + Math.floor(h(i, 0, seed) * 14);
    const y = 10 + Math.floor(h(i, 1, seed) * 5);
    px.set(x, y, tone(LEAF.grass, 1 + (i % 3)));
    px.set(x, y - 1, tone(LEAF.grass, 2 + (i % 2)));
  }
  const heads: [number, number][] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = 2 + Math.floor(h(i, 2, seed) * 12);
    const top = 3 + Math.floor(h(i, 3, seed) * 7);
    const sx = top < 7 ? sway : 0;
    for (let y = top + 1; y <= 13; y++) px.set(x + (y < top + 3 ? sx : 0), y, tone(LEAF.grass, y > 11 ? 1 : 2));
    heads.push([x + sx, top]);
  }
  heads.forEach(([fx, fy], i) => {
    const c = set[i % set.length] as number;
    px.set(fx - 1, fy, mix(c, DEEP, 0.2));
    px.set(fx + 1, fy, mix(c, 0xffffff, 0.15));
    px.set(fx, fy - 1, mix(c, 0xffffff, 0.3));
    px.set(fx, fy + 1, mix(c, DEEP, 0.35));
    px.set(fx, fy, variant === 1 ? P.jauneBle : variant === 0 ? mix(DEEP, P.brique, 0.3) : mix(c, P.lumiereDoree, 0.35));
  });
}

/** Pied de lavande 1×1 (un rang : touffe gris-vert, épis violets fins), animé. */
export function paintLavender(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 1901 + variant;
  const sway = SWAY[frame] as number;
  groundShadow(px, 9, 14, 7, 1.8);
  const crown = new Px(16, 16);
  paintCrown(crown, [{ x: 8, y: 11.5, r: 6, ry: 3 }], LEAF.lavenderLeaf, seed);
  px.blit(crown, 0, 0, 16, 16, 0, 0);
  outline(px);
  const purple = ramp(mix(P.violetPale, P.ciel, 0.22), mix(P.violetBrume, P.violetPale, 0.35), mix(P.ciel, 0xffffff, 0.35));
  for (let i = 0; i < 11; i++) {
    const x = 2 + Math.floor((i / 11) * 12 + h(i, 0, seed) * 1.5);
    const top = 2 + Math.floor(h(i, 1, seed) * 4) + (i % 2);
    for (let y = top; y < 10; y++) {
      const f = (10 - y) / (10 - top);
      const xx = x + Math.round(sway * f);
      if (y < top + 4) px.set(xx, y, tone(purple, y === top ? 4 : (y + i) % 2 === 0 ? 3 : 2 - (i % 3 === 0 ? 1 : 0)));
      else px.set(xx, y, tone(LEAF.lavenderLeaf, 1));
    }
  }
}

/** Tournesols 1×2 : tiges, grandes feuilles, capitules tournés vers la lumière. */
export function paintSunflowers(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 2001 + variant;
  const sway = SWAY[frame] as number;
  groundShadow(px, 9, 30, 7, 1.8);
  const petal = ramp(P.jauneBle, mix(P.ocre, P.terreCuite, 0.35), P.lumiereDoree);
  const heads: readonly (readonly [number, number])[] = variant === 0 ? [[5, 6], [11, 10]] : [[10, 5], [4, 11]];
  for (const [hx, hy] of heads) {
    // Tige et feuilles.
    for (let y = hy + 3; y <= 30; y++) {
      const f = Math.max(0, (hy + 12 - y) / 12);
      const x = hx + Math.round(sway * f);
      px.set(x, y, LEAF.grass.dark);
      px.set(x + 1, y, LEAF.grass.deep);
    }
    for (const [ly, dir] of [[hy + 12, -1], [hy + 16, 1], [hy + 8, 1]] as const) {
      if (ly > 28) continue;
      for (let i = 1; i <= 4; i++) {
        px.set(hx + dir * i + (dir > 0 ? 1 : 0), ly - (i > 2 ? 1 : 0), tone(LEAF.summer, i < 3 ? 2 : 3));
        px.set(hx + dir * i + (dir > 0 ? 1 : 0), ly + 1 - (i > 2 ? 1 : 0), tone(LEAF.summer, 1));
      }
    }
    // Capitule : pétales en couronne, cœur brun.
    const cx = hx + sway + 0.5;
    const cy = hy + 0.5;
    for (let y = hy - 4; y <= hy + 4; y++) {
      for (let x = hx - 4 + sway; x <= hx + 5 + sway; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
        if (d < 2.2) px.set(x, y, d < 1.2 ? mix(P.terreSombre, P.brique, 0.4) : P.terreSombre);
        else if (d < 3.6 + Math.abs(Math.sin(a * 5)) * 1.1) px.set(x, y, tone(petal, x + y < cx + cy - 1 ? 4 : x + y > cx + cy + 2 ? 1 : 2));
      }
    }
    void seed;
  }
  outline(px);
}

/** Roseaux 1×1 (marais), animés. */
export function paintReeds(px: Px, _rnd: Rnd, variant: number, frame = 0): void {
  const seed = 2101 + variant;
  const sway = SWAY[frame] as number;
  const g = ramp(mix(P.olive, P.ocre, 0.3), mix(P.oliveSombre, P.ombreViolette, 0.5), P.ocreClair);
  for (let b = 0; b < 7; b++) {
    const x = 2 + Math.floor(h(b, 0, seed) * 12);
    const len = 7 + Math.floor(h(b, 1, seed) * 6);
    for (let i = 0; i < len; i++) {
      const f = i / len;
      px.set(x + Math.round(sway * f * f * 1.5), 14 - i, tone(g, f > 0.7 ? 3 : 2 - (b % 2)));
    }
    if (b % 2 === 0) {
      const tx = x + sway;
      const ty = 14 - len;
      px.set(tx, ty, P.terreSombre);
      px.set(tx, ty + 1, P.terreSombre);
      px.set(tx, ty + 2, mix(P.terreSombre, P.brique, 0.4));
    }
  }
}

