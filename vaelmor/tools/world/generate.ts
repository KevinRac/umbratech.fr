/**
 * Génération de la carte du monde (GDD §3, §4.4) : de la forme de l'île
 * jusqu'à l'export Tiled. Entièrement déterministe (aucun `Math.random`).
 *
 * Étapes : terre → zones → rivière et franchissements → sols → bandes
 * barrières → routes (A*) → passages → lieux → décors → couches → Tiled.
 */
import type { ZoneDef } from '../../src/data/schemas';
import { COLLISION } from '../../src/data/worldMap';
import { fbm, hash2, hashString, mulberry32 } from './noise';
import {
  CAUSEWAY,
  CHANNEL,
  CROSSINGS,
  LOCATIONS,
  MAP_H,
  MAP_W,
  RIVER,
  ROADS,
  SEED,
  START,
  Z1_POLY,
  Z3_POLY,
  Z4_POLY,
  Z5_MAX_X,
  Z5_MIN_Y,
  type LocationPlan,
  type Pt,
} from './layout';
import {
  GROUND_DECOS,
  GROUND_PRIORITY,
  GROUND_TERRAIN,
  HARD_KINDS,
  SAMPLE_STEPS,
  TONED,
  groundKey,
  normalizeSpec,
  paintBridge,
  paintClear,
  paintDeepWater,
  paintFord,
  paintGround,
  paintHardGround,
  type GroundKind,
  type GroundSpec,
  type Layer,
  type LayerSamples,
  type Rut,
} from './ground';
import { Px } from './px';
import { getStamp, variantCount, type Stamp } from './props';
import { TILE, TILESET_COLUMNS, TILESET_NAME, TilesetBuilder } from './tileset';
import { WHEAT_EDGE, WHEAT_WILD } from './wheat';

const W = MAP_W;
const H = MAP_H;
const N = W * H;
const idx = (x: number, y: number): number => y * W + x;
const inb = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H;
const at = (a: ArrayLike<number>, i: number): number => a[i] as number;

/** Codes de sol qui ne sont pas des `GroundKind`. */
const WATER = 100;
const BRIDGE = 101;
const FORD = 102;
const KINDS: readonly GroundKind[] = ['grass', 'forest', 'dirt', 'road', 'sand', 'rock', 'snow', 'marsh', 'field', 'cobble', 'planks', 'ruins', 'pond'];
const KIND_CODE: Record<GroundKind, number> = Object.fromEntries(KINDS.map((k, i) => [k, i])) as Record<GroundKind, number>;
const isLandCode = (c: number): boolean => c < KINDS.length;
const kindOf = (c: number): GroundKind => KINDS[c] as GroundKind;
const POND = KIND_CODE.pond;

export interface GeneratedWorld {
  readonly tiled: Record<string, unknown>;
  readonly atlas: Px;
  readonly layers: { readonly ground: Uint16Array; readonly decor: Uint16Array; readonly canopy: Uint16Array; readonly collision: Uint8Array; readonly zones: Uint8Array };
  readonly stats: Record<string, number>;
  /** Cases devant les portes des bâtiments (doivent rester atteignables). */
  readonly doorFronts: readonly { readonly x: number; readonly y: number }[];
}

/* ---------- Géométrie ---------- */

function inPoly(x: number, y: number, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as Pt;
    const [xj, yj] = poly[j] as Pt;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function zoneValueAt(x: number, y: number): number {
  if (x <= Z5_MAX_X && y >= Z5_MIN_Y) return 5;
  const px = x + 0.5;
  const py = y + 0.5;
  if (inPoly(px, py, Z4_POLY)) return 4;
  if (inPoly(px, py, Z3_POLY)) return 3;
  if (inPoly(px, py, Z1_POLY)) return 1;
  return 2;
}

/** Abscisse du centre de la rivière à la rangée `y` (interpolation + méandres). */
function riverX(y: number): number {
  const pts = RIVER;
  let base = (pts[pts.length - 1] as Pt)[0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i] as Pt;
    const [x1, y1] = pts[i + 1] as Pt;
    if (y >= y0 && y <= y1) {
      base = x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
      break;
    }
  }
  return base + (fbm(y / 9, 3.1, SEED + 41, 3) - 0.5) * 3.2;
}

function riverHalfWidth(y: number): number {
  return 1.15 + 0.55 * fbm(y / 6, 7.7, SEED + 43, 2) + Math.max(0, y - 104) * 0.06;
}

/* ---------- Tas binaire pour A* ---------- */

class MinHeap {
  private readonly items: { f: number; i: number }[] = [];
  get size(): number {
    return this.items.length;
  }
  push(f: number, i: number): void {
    const a = this.items;
    a.push({ f, i });
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if ((a[p] as { f: number }).f <= (a[c] as { f: number }).f) break;
      [a[p], a[c]] = [a[c] as { f: number; i: number }, a[p] as { f: number; i: number }];
      c = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0] as { f: number; i: number };
    const last = a.pop() as { f: number; i: number };
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < a.length && (a[l] as { f: number }).f < (a[m] as { f: number }).f) m = l;
        if (r < a.length && (a[r] as { f: number }).f < (a[m] as { f: number }).f) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m] as { f: number; i: number }, a[p] as { f: number; i: number }];
        p = m;
      }
    }
    return top.i;
  }
}

/* ---------- Contexte de génération ---------- */

interface Ctx {
  land: Uint8Array;
  sea: Uint8Array;
  zone: Uint8Array;
  code: Uint8Array; // sol (KIND_CODE / WATER / BRIDGE / FORD)
  collision: Uint8Array;
  decor: Uint16Array;
  canopy: Uint16Array;
  blockedOcc: Uint8Array; // case occupée par un décor bloquant
  decorOcc: Uint8Array;
  /** Occupation des couches : 0 libre, 1 exclusive, 2 végétation (superposable). */
  canopyOcc: Uint8Array;
  decorParts: (Part[] | undefined)[];
  canopyParts: (Part[] | undefined)[];
  seq: number;
  /** Case couverte par un bâtiment (toit ou mur) : sert à espacer les bâtiments entre eux. */
  buildOcc: Uint8Array;
  /** Cases à garder libres de tout accessoire bloquant (cour devant une porte). */
  keep: Uint8Array;
  /** Bâtiments posés (coin haut-gauche) : on habille leurs flancs (décision n°46). */
  buildings: { name: string; v: number; x: number; y: number }[];
  road: Uint8Array;
  /** Ornières : 0 aucune, sinon 1 + axe (0 h, 1 v) × 2 + voie ; 255 = croisement (pas d'ornière). */
  rut: Uint8Array;
  noBuild: Uint8Array; // places, champs, routes dilatées : pas de maison
  reserved: Uint8Array; // emprises des lieux : pas de décor aléatoire
  band: Uint8Array; // 0 aucune, 1 forêt, 2 marais, 3 falaise
  gateFlag: (string | undefined)[];
  chimneys: { x: number; y: number }[]; // sorties de cheminée (pixels) : fumée animée
  lights: { x: number; y: number; kind: string }[]; // halos (pixels), décision n°47
  tiles: TilesetBuilder;
}

interface PlaceOptions {
  margin?: number; // distance minimale (Chebyshev) aux autres décors bloquants
  allowReserved?: boolean;
  allowWater?: boolean;
  onRoad?: boolean;
  needFree?: boolean; // exige un sol « praticable » (pas de gué ni de pont)
  noBuild?: boolean; // respecte les zones interdites aux maisons
}

function canPlace(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions): boolean {
  const s = getStamp(name, v);
  const margin = o.margin ?? 1;
  // Bâtiment : la rangée devant sa façade (sa porte) doit rester praticable.
  if (s.building) {
    for (let i = 0; i < s.w; i++) {
      const fx = x + i;
      const fy = y + s.h;
      if (!inb(fx, fy)) return false;
      const k = idx(fx, fy);
      const code = at(c.code, k);
      if (c.blockedOcc[k] || c.band[k] || code === WATER || code === POND) return false;
    }
  }
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (!inb(cx, cy)) return false;
      const k = idx(cx, cy);
      const isBlocked = s.blocked[j * s.w + i] as boolean;
      if (isBlocked && c.keep[k]) return false; // devant une porte
      const code = at(c.code, k);
      if (!o.allowWater && (code === WATER || code === BRIDGE || code === FORD)) return false;
      if (code === BRIDGE || code === FORD) return false;
      const rowIsCanopy = j < s.canopyRows;
      const occ = rowIsCanopy ? c.canopyOcc[k] : c.decorOcc[k];
      if (occ && !(occ === 2 && s.overlap)) return false;
      // Un toit ne recouvre pas un accessoire posé plus tôt (étal, puits…) : il le masquerait.
      if (s.building && rowIsCanopy && c.decorOcc[k] === 1) return false;
      if (!o.allowReserved && c.reserved[k]) return false;
      // Aucun décor sur l'emprise d'un bâtiment (toit, murs, ombre et cour devant la porte).
      if (!s.building && c.buildOcc[k]) return false;
      // Un toit de bâtiment ne surplombe ni route ni place (on y passerait « derrière » la maison).
      const solid = isBlocked || (s.building && rowIsCanopy);
      if (!o.onRoad && solid && c.road[k]) return false;
      if (o.noBuild && solid && c.noBuild[k]) return false;
      if (at(c.collision, k) === COLLISION.gate) return false;
      if ((solid || s.building) && margin >= 0) {
        for (let dy = -margin; dy <= margin; dy++) {
          for (let dx = -margin; dx <= margin; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!inb(nx, ny)) continue;
            const inside = nx >= x && nx < x + s.w && ny >= y && ny < y + s.h;
            const kk = idx(nx, ny);
            if (isBlocked && !(inside && s.blocked[(ny - y) * s.w + (nx - x)]) && c.blockedOcc[kk]) return false;
            if (s.building && !inside && c.buildOcc[kk]) return false;
          }
        }
      }
    }
  }
  return true;
}

/** Morceau de tampon posé sur une case ; les cases sont composées à la fin (`composeLayers`). */
interface Part {
  readonly s: Stamp;
  readonly i: number;
  readonly j: number;
  /** Décalage d'image (vent) : vague d'ouest en est. */
  readonly phase: number;
  /** Ordre de dessin : le pied le plus au sud passe devant. */
  readonly order: number;
  readonly seq: number;
}

function tileVisible(s: Stamp, i: number, j: number): boolean {
  for (const f of s.frames) {
    for (let y = j * TILE; y < (j + 1) * TILE; y++) for (let x = i * TILE; x < (i + 1) * TILE; x++) if (f.alphaAt(x, y) > 0) return true;
  }
  return false;
}

function commit(c: Ctx, name: string, v: number, x: number, y: number): void {
  const s = getStamp(name, v);
  if (s.chimney) c.chimneys.push({ x: x * TILE + s.chimney.x, y: y * TILE + s.chimney.y });
  if (s.building) c.buildings.push({ name, v, x, y });
  for (const l of s.lights) c.lights.push({ x: x * TILE + l.x, y: y * TILE + l.y, kind: l.kind });
  const fx = x + s.foot.x;
  const fy = y + s.foot.y;
  const phase = s.frames.length > 1 && !s.building ? (-(fx >> 1) & 3) % s.frames.length : 0;
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (!inb(cx, cy)) continue;
      const k = idx(cx, cy);
      if (tileVisible(s, i, j)) {
        const part: Part = { s, i, j, phase, order: fy * W + fx, seq: c.seq++ };
        const canopy = j < s.canopyRows;
        const parts = canopy ? c.canopyParts : c.decorParts;
        (parts[k] ??= []).push(part);
        const occ = canopy ? c.canopyOcc : c.decorOcc;
        occ[k] = s.overlap && occ[k] !== 1 ? 2 : 1;
      }
      if (s.building) c.buildOcc[k] = 1; // ombre comprise : la cour devant la porte reste dégagée
      if (s.blocked[j * s.w + i]) {
        c.blockedOcc[k] = 1;
        const cur = at(c.collision, k);
        if (cur === COLLISION.free || cur === COLLISION.slow) c.collision[k] = COLLISION.blocked;
      }
    }
  }
}

/**
 * Compose chaque case des couches `decor` et `canopy` : les morceaux de tampons
 * sont superposés du nord au sud ; une case dont un morceau est animé (vent,
 * moulin) devient une tuile animée Tiled (une image par pas de vent).
 */
function composeLayers(c: Ctx): void {
  const compose = (parts: readonly Part[], f: number): Px => {
    const px = new Px(TILE, TILE);
    for (const p of parts) {
      const frames = p.s.frames;
      const img = frames.length > 1 ? (frames[(f + p.phase) % frames.length] as Px) : (frames[0] as Px);
      px.blit(img, p.i * TILE, p.j * TILE, TILE, TILE, 0, 0);
    }
    return px;
  };
  const build = (all: (Part[] | undefined)[], out: Uint16Array): void => {
    for (let k = 0; k < N; k++) {
      const parts = all[k];
      if (!parts || parts.length === 0) continue;
      parts.sort((a, b) => a.order - b.order || a.seq - b.seq);
      const anim = parts.find((p) => p.s.frames.length > 1);
      if (!anim) {
        out[k] = c.tiles.fromContent(compose(parts, 0));
        continue;
      }
      const frames = Array.from({ length: anim.s.frames.length }, (_, f) => compose(parts, f));
      const gids = frames.map((px) => c.tiles.fromContent(px));
      out[k] = gids.every((g) => g === gids[0]) ? (gids[0] as number) : c.tiles.animated(gids, anim.s.frameMs, frames[0] as Px);
    }
  };
  build(c.decorParts, c.decor);
  build(c.canopyParts, c.canopy);
}

/** Pose un tampon par son pied (tronc) en (`x`, `y`). */
function placeFoot(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions = {}): boolean {
  const s = getStamp(name, v);
  return place(c, name, v, x - s.foot.x, y - s.foot.y, o);
}

function place(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions = {}): boolean {
  if (!canPlace(c, name, v, x, y, o)) return false;
  commit(c, name, v, x, y);
  return true;
}

/**
 * Bâtiment remarquable (auberge, forge, temple, moulin, tour) : posé au plus
 * près de la case visée (`x`, `y` = coin haut-gauche), dans un rayon de 6 cases,
 * avec sa cour de terre devant la porte. Avertit si aucune place ne convient.
 */
function placeNear(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions = {}): boolean {
  const opts: PlaceOptions = { margin: 1, allowReserved: true, noBuild: true, ...o };
  const cands: [number, number][] = [];
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) cands.push([dx, dy]);
  cands.sort((a, b) => Math.hypot(a[0], a[1] * 1.2) - Math.hypot(b[0], b[1] * 1.2));
  for (const [dx, dy] of cands) {
    if (!place(c, name, v, x + dx, y + dy, opts)) continue;
    yard(c, name, v, x + dx, y + dy);
    return true;
  }
  console.warn(`  ⚠ ${name} : aucune place libre près de (${x}, ${y})`);
  return false;
}

/** Cour de terre battue sur la rangée devant un bâtiment. */
function yard(c: Ctx, name: string, v: number, x: number, y: number): void {
  const s = getStamp(name, v);
  for (let i = 0; i < s.w; i++) if (inb(x + i, y + s.h)) c.keep[idx(x + i, y + s.h)] = 1;
  for (let i = -1; i <= s.w; i++) {
    const k = idx(x + i, y + s.h);
    if (inb(x + i, y + s.h) && isLandCode(at(c.code, k)) && !c.road[k] && ['grass', 'forest', 'sand', 'marsh'].includes(kindOf(at(c.code, k)))) c.code[k] = KIND_CODE.dirt;
  }
}

/* ---------- Accessoires (décision n°46) ---------- */

const RING = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]] as const;

/** Case praticable pendant l'habillage (l'eau et les bandes ne sont figées qu'ensuite). */
function passable(c: Ctx, x: number, y: number): boolean {
  if (!inb(x, y)) return false;
  const k = idx(x, y);
  const code = at(c.code, k);
  if (code === WATER || code === POND) return false;
  return !c.band[k] && !c.blockedOcc[k] && c.collision[k] !== COLLISION.blocked;
}

/**
 * Bloquer (`x`, `y`) couperait-il un passage ? On regarde l'anneau des 8 voisines :
 * si les voisines praticables y forment plusieurs morceaux qui touchent la case
 * par un côté, elles ne communiquent peut-être que par elle (test prudent).
 */
function pinches(c: Ctx, x: number, y: number): boolean {
  const free = RING.map(([dx, dy]) => passable(c, x + dx, y + dy));
  if (free.every(Boolean)) return false;
  let runs = 0;
  for (let i = 0; i < 8; i++) {
    if (!free[i] || free[(i + 7) % 8]) continue;
    let edge = false;
    for (let j = i; j < i + 8 && free[j % 8]; j++) if (j % 2 === 0) edge = true;
    if (edge) runs++;
  }
  return runs > 1;
}

/** Pose un accessoire sans fermer de passage ni encombrer la cour d'une porte. */
function placeProp(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions = {}): boolean {
  const opts: PlaceOptions = { margin: 0, allowReserved: true, ...o };
  if (!canPlace(c, name, v, x, y, opts)) return false;
  const s = getStamp(name, v);
  const marked: number[] = [];
  let ok = true;
  for (let j = 0; j < s.h && ok; j++) {
    for (let i = 0; i < s.w && ok; i++) {
      if (!s.blocked[j * s.w + i]) continue;
      const k = idx(x + i, y + j);
      if (c.keep[k] || pinches(c, x + i, y + j)) ok = false;
      else {
        c.blockedOcc[k] = 1;
        marked.push(k);
      }
    }
  }
  for (const k of marked) c.blockedOcc[k] = 0;
  if (!ok) return false;
  commit(c, name, v, x, y);
  return true;
}

/** Pose un accessoire par son pied au plus près de (`x`, `y`), dans un rayon `r`. */
function propNear(c: Ctx, name: string, v: number, x: number, y: number, r = 2, o: PlaceOptions = {}): boolean {
  const s = getStamp(name, v);
  const cands: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) cands.push([dx, dy]);
  cands.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (const [dx, dy] of cands) if (placeProp(c, name, v, x + dx - s.foot.x, y + dy - s.foot.y, o)) return true;
  return false;
}

/**
 * Flancs des bâtiments d'un lieu : un ou deux accessoires du village contre les
 * murs (tonneaux, sacs, outils, bois…), jamais devant une porte.
 */
function dressBuildings(c: Ctx, loc: LocationPlan, from: number, set: readonly string[]): void {
  const rnd = mulberry32(hashString(`${loc.id}:flancs`));
  for (const b of c.buildings.slice(from)) {
    const s = getStamp(b.name, b.v);
    for (const side of [-1, 1] as const) {
      if (rnd() > 0.72) continue;
      const name = set[Math.floor(rnd() * set.length)] as string;
      const p = getStamp(name, 0);
      const v = Math.floor(rnd() * 3);
      const x = side < 0 ? b.x - p.w : b.x + s.w;
      const wallRow = b.y + s.h - 2;
      if (!placeProp(c, name, v, x, wallRow - (p.h - 1))) placeProp(c, name, v, x, wallRow - p.h);
    }
  }
}

/** Corde à linge dans les jardins d'un village (la case du milieu reste un passage). */
function laundryLines(c: Ctx, loc: LocationPlan, count: number): void {
  const rnd = mulberry32(hashString(`${loc.id}:linge`));
  let placed = 0;
  for (let tries = 0; placed < count && tries < 300; tries++) {
    const x = Math.round(loc.cx + (rnd() * 2 - 1) * (loc.w / 2 + 2));
    const y = Math.round(loc.cy + (rnd() * 2 - 1) * (loc.h / 2 + 2));
    if (placeProp(c, 'laundry', placed % 2, x, y, { noBuild: true })) placed++;
  }
}

/** Lampadaires aux coins d'une place. */
function plazaLamps(c: Ctx, loc: LocationPlan, w: number, hh: number, corners: readonly number[] = [0, 1, 2, 3]): void {
  const x0 = Math.floor(loc.cx - w / 2);
  const y0 = Math.floor(loc.cy - hh / 2);
  const spots: [number, number][] = [[x0 - 1, y0 - 1], [x0 + w, y0 - 1], [x0 - 1, y0 + hh], [x0 + w, y0 + hh]];
  for (const i of corners) {
    const [x, y] = spots[i] as [number, number];
    propNear(c, 'lamp_post', 0, x, y, 2);
  }
}

/* ---------- 1. Terre ---------- */

function buildLand(): Uint8Array {
  const land = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - 80) / 77, (y - 60) / 57);
      const warp = (fbm(x / 14, y / 14, SEED + 1) - 0.5) * 0.46 + (fbm(x / 5, y / 5, SEED + 2) - 0.5) * 0.12;
      if (d + warp < 1) land[idx(x, y)] = 1;
    }
  }
  // Zones d'accueil des lieux : toujours de la terre autour.
  for (const loc of LOCATIONS) {
    const r = Math.max(loc.w, loc.h) / 2 + 1;
    for (let y = Math.floor(loc.cy - r); y <= Math.ceil(loc.cy + r); y++) {
      for (let x = Math.floor(loc.cx - r); x <= Math.ceil(loc.cx + r); x++) {
        if (inb(x, y) && Math.hypot(x - loc.cx, y - loc.cy) <= r) land[idx(x, y)] = 1;
      }
    }
  }
  // Île de la Citadelle : tout ce qui est à l'ouest du chenal est reconstruit.
  for (let y = Z5_MIN_Y - 3; y < H; y++) {
    for (let x = 0; x <= Z5_MAX_X; x++) {
      const warp = (fbm(x / 6, y / 6, SEED + 3) - 0.5) * 0.35;
      const d = Math.hypot((x - 15) / 9.5, (y - 100) / 12.5);
      land[idx(x, y)] = d + warp < 1 && x <= 24 && y >= 88 ? 1 : 0;
    }
  }
  // Chaussée vers l'îlot, chenal au nord : eau.
  for (let y = CHANNEL.y0; y <= CHANNEL.y1; y++) for (let x = CHANNEL.x0; x <= CHANNEL.x1; x++) land[idx(x, y)] = 0;
  for (let x = 4; x <= CHANNEL.x1; x++) {
    const top = 84 + Math.round(fbm(x / 4, 9.1, SEED + 4) * 2 - 1);
    for (let y = top; y < 88; y++) land[idx(x, y)] = 0;
  }
  for (let y = CAUSEWAY.y0; y <= CAUSEWAY.y1; y++) for (let x = 20; x <= CAUSEWAY.x1 + 1; x++) land[idx(x, y)] = 1;
  // Bordure de mer.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) land[idx(x, y)] = 0;
  }
  // Étangs et îlots minuscules : on les efface.
  fillSmall(land, 1, 45, (c) => c.some((i) => LOCATIONS.some((l) => idx(l.cx, l.cy) === i)));
  fillSmall(land, 0, 70, (c) => c.some((i) => i % W < 2 || i % W >= W - 2 || Math.floor(i / W) < 2 || Math.floor(i / W) >= H - 2));
  return land;
}

/** Remplit les composantes de valeur `value` plus petites que `limit` (sauf si `keep` les épargne). */
function fillSmall(grid: Uint8Array, value: number, limit: number, keep: (cells: number[]) => boolean): void {
  const seen = new Uint8Array(N);
  for (let start = 0; start < N; start++) {
    if (seen[start] || grid[start] !== value) continue;
    const cells: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      cells.push(i);
      const x = i % W;
      const y = Math.floor(i / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inb(nx, ny)) continue;
        const k = idx(nx, ny);
        if (!seen[k] && grid[k] === value) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    if (cells.length < limit && !keep(cells)) for (const i of cells) grid[i] = value === 1 ? 0 : 1;
  }
}

/** Mer = eau reliée au bord de la carte. */
function seaMask(land: Uint8Array): Uint8Array {
  const sea = new Uint8Array(N);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(idx(x, 0), idx(x, H - 1));
  for (let y = 0; y < H; y++) stack.push(idx(0, y), idx(W - 1, y));
  while (stack.length > 0) {
    const i = stack.pop() as number;
    if (sea[i] || land[i]) continue;
    sea[i] = 1;
    const x = i % W;
    const y = Math.floor(i / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (inb(x + dx, y + dy)) stack.push(idx(x + dx, y + dy));
  }
  return sea;
}

/* ---------- 2. Rivière ---------- */

function carveRiver(c: Ctx): void {
  const [, firstY] = RIVER[0] as Pt;
  const [, lastY] = RIVER[RIVER.length - 1] as Pt;
  const crossRows = new Set<number>();
  for (const cr of CROSSINGS) {
    crossRows.add(cr.y);
    crossRows.add(cr.y + 1);
  }
  for (let y = firstY; y <= lastY; y++) {
    const xc = riverX(y);
    const half = riverHalfWidth(y);
    const cells: number[] = [];
    for (let x = Math.floor(xc - half - 1); x <= Math.ceil(xc + half + 1); x++) {
      if (Math.abs(x + 0.5 - xc) <= half && inb(x, y)) cells.push(x);
    }
    const crossing = CROSSINGS.find((cr) => y === cr.y || y === cr.y + 1);
    for (const x of cells) {
      const k = idx(x, y);
      c.land[k] = 0;
      c.code[k] = crossing ? (crossing.kind === 'bridge' ? BRIDGE : FORD) : WATER;
    }
  }
}

/* ---------- 3. Sols ---------- */

function paintKinds(c: Ctx): void {
  const sea = c.sea;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      if (c.code[k] === BRIDGE || c.code[k] === FORD) continue;
      if (!c.land[k]) {
        c.code[k] = WATER;
        continue;
      }
      const z = at(c.zone, k);
      const n = fbm(x / 9, y / 9, SEED + 11);
      const n2 = fbm(x / 4, y / 4, SEED + 12);
      let kind: GroundKind;
      switch (z) {
        case 1:
          kind = n2 > 0.74 ? 'dirt' : 'grass';
          break;
        case 2:
          kind = n > 0.36 ? 'forest' : 'grass';
          if (n2 > 0.8) kind = 'grass';
          break;
        case 3:
          kind = n > 0.62 ? 'marsh' : n2 > 0.76 ? 'dirt' : 'grass';
          break;
        case 4: {
          const altitude = (45 - y) / 45 + (n - 0.5) * 0.9;
          kind = altitude > 0.62 ? 'snow' : n2 > 0.72 ? 'dirt' : 'rock';
          if (altitude < 0.12 && n < 0.45) kind = 'grass';
          break;
        }
        default:
          kind = n2 > 0.7 ? 'rock' : 'ruins';
      }
      c.code[k] = KIND_CODE[kind];
    }
  }
  // Plages : le sable borde la mer (sauf montagnes).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      if (!isLandCode(at(c.code, k)) || at(c.zone, k) === 4) continue;
      let dist = 9;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (inb(nx, ny) && sea[idx(nx, ny)]) dist = Math.min(dist, Math.abs(dx) + Math.abs(dy));
        }
      }
      const width = 1.6 + fbm(x / 6, y / 6, SEED + 13) * 2.4;
      if (dist <= width) c.code[k] = KIND_CODE.sand;
    }
  }
}

/* ---------- 4. Barrières et passages ---------- */

const BAND_FOR_ZONE: Readonly<Record<number, number>> = { 2: 1, 3: 2, 4: 3, 5: 3 };

function markBands(c: Ctx): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      if (!c.land[k]) continue;
      const z = at(c.zone, k);
      if (z === 1) continue;
      let lower = false;
      for (let dy = -2; dy <= 2 && !lower; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (inb(nx, ny) && at(c.zone, idx(nx, ny)) < z) {
            lower = true;
            break;
          }
        }
      }
      if (lower) c.band[k] = BAND_FOR_ZONE[z] ?? 3;
    }
  }
}

/* ---------- 5. Routes ---------- */

function pathCost(c: Ctx, k: number): number {
  const code = at(c.code, k);
  if (code === WATER) return Infinity;
  let cost = 1;
  if (code === BRIDGE) cost = 1;
  else if (code === FORD) cost = 3;
  else {
    switch (kindOf(code)) {
      case 'marsh':
        cost = 3;
        break;
      case 'forest':
        cost = 1.25;
        break;
      case 'rock':
        cost = 1.6;
        break;
      case 'snow':
        cost = 2;
        break;
      case 'pond':
        return Infinity;
      default:
        cost = 1;
    }
  }
  if (c.band[k]) cost += 5;
  return cost + hash2(k % W, Math.floor(k / W), SEED + 51) * 0.35;
}

function findRoad(c: Ctx, from: number, to: number): number[] | null {
  const dist = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new MinHeap();
  const tx = to % W;
  const ty = Math.floor(to / W);
  dist[from] = 0;
  heap.push(0, from);
  while (heap.size > 0) {
    const cur = heap.pop();
    if (cur === to) break;
    const x = cur % W;
    const y = Math.floor(cur / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= W - 2 || ny >= H - 2) continue;
      const k = idx(nx, ny);
      const step = k === to ? 1 : pathCost(c, k) + (c.reserved[k] && !c.road[k] ? 1.5 : 0);
      if (!Number.isFinite(step)) continue;
      const nd = (dist[cur] as number) + step;
      if (nd < (dist[k] as number)) {
        dist[k] = nd;
        prev[k] = cur;
        heap.push(nd + (Math.abs(nx - tx) + Math.abs(ny - ty)) * 0.95, k);
      }
    }
  }
  if (prev[to] === -1) return null;
  const path: number[] = [];
  for (let k = to; k !== -1; k = prev[k] as number) path.push(k);
  return path.reverse();
}

function carveRoads(c: Ctx): void {
  const byId = new Map(LOCATIONS.map((l) => [l.id, l]));
  for (const [a, b] of ROADS) {
    const la = byId.get(a) as LocationPlan;
    const lb = byId.get(b) as LocationPlan;
    const path = findRoad(c, idx(la.cx, la.cy), idx(lb.cx, lb.cy));
    if (!path) throw new Error(`Aucune route entre ${a} et ${b}`);
    path.forEach((k, i) => {
      const x = k % W;
      const y = Math.floor(k / W);
      const next = path[i + 1] ?? path[i - 1] ?? k;
      const horizontal = Math.floor(next / W) === y;
      const widen = horizontal ? idx(x, y + 1) : idx(x + 1, y);
      // Virage : la case précédente et la suivante ne sont pas sur le même axe → pas d'ornière ici.
      const prevK = path[i - 1];
      const nextK = path[i + 1];
      const turning = prevK !== undefined && nextK !== undefined && (Math.floor(prevK / W) === y) !== (Math.floor(nextK / W) === y);
      [k, widen].forEach((cell, lane) => {
        if (cell >= N || !c.land[cell]) {
          if (at(c.code, cell) !== BRIDGE && at(c.code, cell) !== FORD) return;
        }
        c.road[cell] = 1;
        const code = turning ? 255 : 1 + (horizontal ? 0 : 2) + lane;
        const prev = at(c.rut, cell);
        c.rut[cell] = prev === 0 || prev === code ? code : 255;
      });
    });
  }
  for (let k = 0; k < N; k++) {
    if (!c.road[k]) continue;
    const code = at(c.code, k);
    if (isLandCode(code) && kindOf(code) !== 'cobble' && kindOf(code) !== 'planks') c.code[k] = KIND_CODE.road;
  }
}

/* ---------- Mise en place des lieux ---------- */

function reserveRect(c: Ctx, loc: LocationPlan, extra = 1): void {
  const x0 = Math.floor(loc.cx - loc.w / 2) - extra;
  const y0 = Math.floor(loc.cy - loc.h / 2) - extra;
  for (let y = y0; y < y0 + loc.h + extra * 2; y++) {
    for (let x = x0; x < x0 + loc.w + extra * 2; x++) if (inb(x, y)) c.reserved[idx(x, y)] = 1;
  }
}

function setKindRect(c: Ctx, x0: number, y0: number, w: number, h: number, kind: GroundKind, mark = true): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inb(x, y)) continue;
      const k = idx(x, y);
      if (!isLandCode(at(c.code, k)) || c.road[k]) continue;
      c.code[k] = KIND_CODE[kind];
      if (mark) c.noBuild[k] = 1;
    }
  }
}

function dilateRoads(c: Ctx): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!c.road[idx(x, y)]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) c.noBuild[idx(x + dx, y + dy)] = 1;
    }
  }
}

function lattice(c: Ctx, loc: LocationPlan, names: readonly string[], count: number, seed: string, spacingX = 1, spacingY = 1): number {
  const rnd = mulberry32(hashString(`${loc.id}:${seed}`));
  const x0 = Math.floor(loc.cx - loc.w / 2);
  const y0 = Math.floor(loc.cy - loc.h / 2);
  const cands: { x: number; y: number; d: number }[] = [];
  for (let y = y0 + 1; y < y0 + loc.h - 2; y++) {
    for (let x = x0 + 1; x < x0 + loc.w - 2; x++) cands.push({ x, y, d: Math.hypot((x - loc.cx) / 1.4, y - loc.cy) + rnd() * 3 });
  }
  cands.sort((a, b) => a.d - b.d);
  let placed = 0;
  for (const cand of cands) {
    if (placed >= count) break;
    const name = names[placed % names.length] as string;
    const v = hashString(`${loc.id}:${seed}:${placed}`) % variantCount(name);
    // marge d'une case autour (collision de décor) + bande sud réservée devant la porte
    if (!canPlace(c, name, v, cand.x, cand.y, { margin: Math.max(spacingX, spacingY), allowReserved: true, noBuild: true })) continue;
    place(c, name, v, cand.x, cand.y, { margin: Math.max(spacingX, spacingY), allowReserved: true, noBuild: true });
    yard(c, name, v, cand.x, cand.y);
    placed++;
  }
  return placed;
}

/**
 * Jardins autour d'un village (décision n°45) : rangs de 2 à 4 plantes
 * (tournesols, lavande, fleurs…) sur l'herbe, jamais sur une route, une place,
 * une cour ou l'emprise d'un bâtiment.
 */
function gardens(c: Ctx, loc: LocationPlan, names: readonly string[], count: number): void {
  const rnd = mulberry32(hashString(`${loc.id}:gardens`));
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 40; tries++) {
    const x = Math.round(loc.cx + (rnd() * 2 - 1) * (loc.w / 2 + 3));
    const y = Math.round(loc.cy + (rnd() * 2 - 1) * (loc.h / 2 + 3));
    const name = names[Math.floor(rnd() * names.length)] as string;
    const len = 2 + Math.floor(rnd() * 3);
    let ok = 0;
    for (let i = 0; i < len; i++) {
      if (!inb(x + i, y)) continue;
      const k = idx(x + i, y);
      const kind = isLandCode(at(c.code, k)) ? kindOf(at(c.code, k)) : '';
      if (c.road[k] || c.noBuild[k] || (kind !== 'grass' && kind !== 'forest')) continue;
      if (place(c, name, (x + i + y) % variantCount(name), x + i, y, { margin: -1, allowReserved: true })) ok++;
    }
    if (ok > 0) placed++;
  }
}

function scatterAround(c: Ctx, loc: LocationPlan, names: readonly string[], count: number, seed: string, radius?: number): void {
  const rnd = mulberry32(hashString(`${loc.id}:${seed}`));
  const rx = (radius ?? loc.w / 2 - 1);
  const ry = (radius ?? loc.h / 2 - 1);
  let tries = 0;
  let done = 0;
  while (done < count && tries < count * 40) {
    tries++;
    const x = Math.round(loc.cx + (rnd() * 2 - 1) * rx);
    const y = Math.round(loc.cy + (rnd() * 2 - 1) * ry);
    const name = names[Math.floor(rnd() * names.length)] as string;
    if (placeProp(c, name, Math.floor(rnd() * 4), x, y, { noBuild: true })) done++;
  }
}

function ringWalls(c: Ctx, x0: number, y0: number, w: number, h: number, kinds: { h: string; v: string; tower: string | null }, hOffset = 0): void {
  for (let x = x0; x < x0 + w; x++) {
    place(c, kinds.h, (x + hOffset) % 2, x, y0, { margin: -1, allowReserved: true });
    place(c, kinds.h, (x + hOffset) % 2, x, y0 + h - 1, { margin: -1, allowReserved: true });
  }
  for (let y = y0 + 1; y < y0 + h - 1; y++) {
    place(c, kinds.v, 0, x0, y, { margin: -1, allowReserved: true });
    place(c, kinds.v, 0, x0 + w - 1, y, { margin: -1, allowReserved: true });
  }
  if (kinds.tower) {
    place(c, kinds.tower, 0, x0 - 1, y0 - 1, { margin: -1, allowReserved: true });
    place(c, kinds.tower, 0, x0 + w - 1, y0 - 1, { margin: -1, allowReserved: true });
    place(c, kinds.tower, 0, x0 - 1, y0 + h - 1, { margin: -1, allowReserved: true });
    place(c, kinds.tower, 0, x0 + w - 1, y0 + h - 1, { margin: -1, allowReserved: true });
  }
}

function plaza(c: Ctx, loc: LocationPlan, w: number, h: number): void {
  setKindRect(c, Math.floor(loc.cx - w / 2), Math.floor(loc.cy - h / 2), w, h, 'cobble');
}

function dressLocation(c: Ctx, loc: LocationPlan): void {
  const x0 = Math.floor(loc.cx - loc.w / 2);
  const y0 = Math.floor(loc.cy - loc.h / 2);
  const rnd = mulberry32(hashString(`dress:${loc.id}`));
  const built = c.buildings.length;
  switch (loc.style) {
    case 'haut_gue': {
      plaza(c, loc, 6, 4);
      setKindRect(c, x0 + 1, y0 + 9, 6, 5, 'field');
      for (let i = 0; i < 6; i++) place(c, 'fence', 0, x0 + 1 + i, y0 + 8, { margin: -1, allowReserved: true });
      placeFoot(c, 'well', 0, loc.cx + 3, loc.cy - 2, { margin: 0, allowReserved: true });
      // Auberge de Maëlys, moulin de Thom (près du champ), forge de Bran, tour du capitaine Ilar.
      placeNear(c, 'inn', 0, loc.cx + 2, loc.cy - 8);
      placeNear(c, 'mill', 0, x0, y0 + 3);
      placeNear(c, 'forge', 0, loc.cx + 5, loc.cy + 1);
      placeNear(c, 'guard_tower', 0, loc.cx - 7, loc.cy + 2);
      lattice(c, loc, ['house_thatch', 'house_tile', 'house_thatch', 'hut'], 8, 'houses');
      // Vie du village (n°46) : place éclairée, charrette au champ, linge, flancs des maisons.
      plazaLamps(c, loc, 6, 4, [0, 3]);
      propNear(c, 'board', 0, loc.cx - 2, loc.cy - 3, 2);
      propNear(c, 'bench', 0, loc.cx - 1, loc.cy + 3, 2);
      propNear(c, 'cart', 0, x0 + 9, y0 + 14, 2);
      dressBuildings(c, loc, built, ['hay', 'sacks', 'tools', 'barrel', 'planter', 'woodpile', 'crate', 'planter']);
      laundryLines(c, loc, 1);
      gardens(c, loc, ['sunflowers', 'sunflowers', 'flowers', 'lavender'], 8);
      scatterAround(c, loc, ['hay', 'barrel', 'sacks', 'bush'], 6, 'misc');
      place(c, 'sign', 0, loc.cx - 4, loc.cy + 6, { margin: 0, allowReserved: true });
      break;
    }
    case 'ronceval': {
      plaza(c, loc, 5, 4);
      placeFoot(c, 'well', 0, loc.cx + 2, loc.cy - 2, { margin: 0, allowReserved: true });
      lattice(c, loc, ['house_wood', 'hut', 'house_wood', 'house_thatch'], 8, 'houses');
      // Village de bûcherons : bois coupé partout, souches, une lanterne sur la place.
      plazaLamps(c, loc, 5, 4, [1]);
      dressBuildings(c, loc, built, ['woodpile', 'tools', 'barrel', 'sacks', 'woodpile', 'planter']);
      laundryLines(c, loc, 1);
      gardens(c, loc, ['flowers', 'tall_grass', 'flowers'], 7);
      scatterAround(c, loc, ['stump', 'woodpile', 'bush', 'stump'], 7, 'misc');
      break;
    }
    case 'port_brume': {
      plaza(c, loc, 6, 4);
      placeFoot(c, 'well', 0, loc.cx - 3, loc.cy - 2, { margin: 0, allowReserved: true });
      placeFoot(c, 'stall', 0, loc.cx - 2, loc.cy - 4, { margin: 0, allowReserved: true, noBuild: false });
      placeFoot(c, 'stall', 1, loc.cx + 1, loc.cy - 4, { margin: 0, allowReserved: true });
      // Chapelle de Frère Odo, tour de guet au-dessus du port.
      placeNear(c, 'temple', 0, loc.cx + 6, loc.cy - 9);
      placeNear(c, 'guard_tower', 1, loc.cx - 10, loc.cy - 6);
      lattice(c, loc, ['house_slate', 'house_tile', 'house_slate', 'hut'], 8, 'houses');
      // Port de pêche : filets, poteries, caisses du port, lanternes, barques.
      plazaLamps(c, loc, 6, 4, [0, 3]);
      propNear(c, 'bench', 0, loc.cx + 1, loc.cy + 3, 2);
      dressBuildings(c, loc, built, ['nets', 'pots', 'barrel', 'crate', 'sacks', 'planter']);
      laundryLines(c, loc, 1);
      gardens(c, loc, ['lavender', 'lavender', 'flowers'], 7);
      scatterAround(c, loc, ['barrel', 'crate', 'nets', 'pots'], 8, 'misc');
      pier(c, loc);
      break;
    }
    case 'pierre_haute': {
      plaza(c, loc, 5, 4);
      setKindRect(c, x0, y0, loc.w, loc.h, 'rock', false);
      placeFoot(c, 'well', 0, loc.cx - 3, loc.cy - 2, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      // Forge de maître Halvar, sanctuaire des Lanternes, tour du village fortifié.
      placeNear(c, 'forge', 0, loc.cx - 9, loc.cy - 7);
      placeNear(c, 'temple', 0, loc.cx + 4, loc.cy - 9);
      placeNear(c, 'guard_tower', 0, loc.cx + 8, loc.cy + 1);
      lattice(c, loc, ['house_stone', 'house_slate', 'house_stone', 'hut'], 8, 'houses');
      // Village fortifié de montagne : bois de chauffage, caisses, lanternes.
      plazaLamps(c, loc, 5, 4, [1, 2]);
      propNear(c, 'board', 0, loc.cx + 1, loc.cy + 4, 2);
      dressBuildings(c, loc, built, ['woodpile', 'crate', 'sacks', 'barrel', 'tools', 'woodpile']);
      gardens(c, loc, ['lavender', 'tall_grass'], 4);
      scatterAround(c, loc, ['rock', 'barrel', 'crate', 'cairn', 'pebbles'], 9, 'misc');
      break;
    }
    case 'valcendre': {
      const wx = x0;
      const wy = y0;
      setKindRect(c, wx + 1, wy + 1, loc.w - 2, loc.h - 2, 'cobble', false);
      for (let y = wy + 1; y < wy + loc.h - 1; y++) for (let x = wx + 1; x < wx + loc.w - 1; x++) if (c.code[idx(x, y)] === KIND_CODE.cobble) c.noBuild[idx(x, y)] = 0;
      // Rues : croix de pavés plus claires restent au sol ; le reste devient terre battue.
      for (let y = wy + 1; y < wy + loc.h - 1; y++) {
        for (let x = wx + 1; x < wx + loc.w - 1; x++) {
          const street = Math.abs(x - loc.cx) <= 1 || Math.abs(y - loc.cy) <= 1;
          if (!street && !c.road[idx(x, y)]) c.code[idx(x, y)] = KIND_CODE.dirt;
          if (street) c.noBuild[idx(x, y)] = 1;
        }
      }
      ringWalls(c, wx, wy, loc.w, loc.h, { h: 'wall_h', v: 'wall_v', tower: 'tower' });
      placeFoot(c, 'well', 0, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx - 4, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx + 5, loc.cy + 2, { margin: 0, allowReserved: true });
      for (let i = 0; i < 3; i++) placeFoot(c, 'stall', i, loc.cx - 8 + i * 3, loc.cy + 3, { margin: 0, allowReserved: true });
      // Cathédrale, Auberge du Corbeau, quartier des forges.
      placeNear(c, 'temple', 0, loc.cx - 10, loc.cy - 10);
      placeNear(c, 'inn', 0, loc.cx + 3, loc.cy - 10);
      placeNear(c, 'forge', 0, loc.cx + 8, loc.cy + 4);
      lattice(c, loc, ['house_tile', 'house_slate', 'house_tile', 'house_stone', 'hut'], 14, 'houses');
      // Grande ville : rues éclairées, bancs, tableau d'affichage, jardinières.
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [-9, -2], [9, 2], [-2, -9], [2, 9]] as const) propNear(c, 'lamp_post', 0, loc.cx + dx, loc.cy + dy, 1);
      propNear(c, 'board', 0, loc.cx + 3, loc.cy - 4, 2);
      propNear(c, 'bench', 0, loc.cx - 6, loc.cy - 3, 2);
      propNear(c, 'bench', 0, loc.cx + 6, loc.cy + 3, 2);
      dressBuildings(c, loc, built, ['planter', 'barrel', 'crate', 'sacks', 'pots', 'planter']);
      gardens(c, loc, ['flowers', 'lavender', 'sunflowers'], 6);
      scatterAround(c, loc, ['barrel', 'crate', 'sacks'], 6, 'misc');
      break;
    }
    case 'camp': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'dirt', false);
      ringWalls(c, x0, y0, loc.w, loc.h, { h: 'palisade', v: 'palisade', tower: null });
      // Le centre du camp est sur la route : le feu de camp se pose à côté.
      propNear(c, 'campfire', 0, loc.cx - 3, loc.cy, 2);
      propNear(c, 'campfire', 0, loc.cx + 3, loc.cy + 1, 2);
      place(c, 'tent', 0, loc.cx - 5, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'tent', 1, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'tent', 0, loc.cx - 5, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'tent', 1, loc.cx + 3, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx, loc.cy - 4, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx - 3, loc.cy - 4, { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['barrel', 'crate', 'sacks', 'woodpile', 'cauldron', 'crate'], 8, 'misc');
      break;
    }
    case 'bosquet': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'grass', false);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        place(c, 'menhir', 0, Math.round(loc.cx + Math.cos(a) * 5.5), Math.round(loc.cy + Math.sin(a) * 3.5), { margin: 0, allowReserved: true, onRoad: false });
      }
      place(c, 'altar', 0, loc.cx, loc.cy, { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['bush'], 6, 'misc');
      break;
    }
    case 'tour_noye': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'ruins', false);
      for (const [dx, dy] of [[-3, 2], [3, 3], [-1, 4], [4, -2]] as const) setKindRect(c, loc.cx + dx, loc.cy + dy, 2, 1, 'pond', false);
      place(c, 'ruined_tower', 0, loc.cx - 1, loc.cy - 5, { margin: 0, allowReserved: true });
      for (const dx of [-5, 4]) place(c, 'pillar', Math.abs(dx) % 2, loc.cx + dx, loc.cy - 1, { margin: 0, allowReserved: true });
      for (let i = 0; i < 5; i++) place(c, 'ruin_wall', i, loc.cx - 5 + i * 2, loc.cy + 2 + (i % 2), { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['reeds', 'rock'], 8, 'misc');
      break;
    }
    case 'aiguille': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'rock', false);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        place(c, 'pillar', i, Math.round(loc.cx + Math.cos(a) * 5), Math.round(loc.cy + Math.sin(a) * 3), { margin: 0, allowReserved: true });
      }
      place(c, 'altar', 0, loc.cx, loc.cy, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx - 2, loc.cy - 3, { margin: 0, allowReserved: true });
      break;
    }
    case 'citadelle': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'ruins', false);
      ringWalls(c, x0 + 1, y0 + 1, loc.w - 2, loc.h - 2, { h: 'ruin_wall', v: 'ruin_wall', tower: 'tower' }, 1);
      for (let i = 0; i < 6; i++) place(c, 'pillar', i, loc.cx - 4 + (i % 3) * 4, loc.cy - 3 + Math.floor(i / 3) * 6, { margin: 0, allowReserved: true });
      place(c, 'altar', 0, loc.cx, loc.cy, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx - 1, loc.cy - 5, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx + 1, loc.cy - 5, { margin: 0, allowReserved: true });
      break;
    }
    case 'pont_arches': {
      place(c, 'sign', 0, loc.cx - 4, loc.cy - 2, { margin: 0, allowReserved: true });
      place(c, 'pillar', 0, loc.cx - 4, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'pillar', 0, loc.cx + 4, loc.cy + 2, { margin: 0, allowReserved: true });
      break;
    }
    case 'pont_vieux': {
      for (let i = 0; i < 3; i++) place(c, 'ruin_wall', i, loc.cx - 4 + i, loc.cy + 3, { margin: 0, allowReserved: true });
      place(c, 'pillar', 1, loc.cx + 4, loc.cy - 3, { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['bush', 'rock'], 4, 'misc');
      break;
    }
    case 'epaves': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'sand', false);
      place(c, 'wreck', 0, loc.cx - 3, loc.cy - 1, { margin: 0, allowReserved: true });
      place(c, 'wreck', 0, loc.cx + 2, loc.cy, { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['barrel', 'crate', 'rock', 'pebbles', 'sacks', 'pebbles'], 9, 'misc');
      break;
    }
    case 'menhir': {
      place(c, 'menhir', 0, loc.cx, loc.cy - 1, { margin: 0, allowReserved: true });
      place(c, 'cairn', 0, loc.cx - 2, loc.cy + 1, { margin: 0, allowReserved: true });
      place(c, 'cairn', 0, loc.cx + 2, loc.cy, { margin: 0, allowReserved: true });
      break;
    }
    case 'autel': {
      setKindRect(c, loc.cx - 1, loc.cy - 1, 3, 3, 'ruins', false);
      place(c, 'altar', 0, loc.cx, loc.cy, { margin: 0, allowReserved: true });
      place(c, 'menhir', 0, loc.cx - 2, loc.cy - 1, { margin: 0, allowReserved: true });
      place(c, 'menhir', 0, loc.cx + 2, loc.cy - 1, { margin: 0, allowReserved: true });
      break;
    }
    default:
      break;
  }
  void rnd;
}

/** Appontement de Port-Brume : planches sur l'eau, barques de chaque côté. */
function pier(c: Ctx, loc: LocationPlan): void {
  const px = loc.cx - 12;
  let shore = loc.cy + 2;
  // Trouve la côte au sud du village (colonne `loc.cx + 6`).
  for (const col of [loc.cx + 6, loc.cx + 7]) {
    let y = loc.cy + 2;
    while (y < H - 3 && c.land[idx(col, y)]) y++;
    for (let k = 0; k < 6; k++) {
      const yy = y - 2 + k;
      if (!inb(col, yy)) continue;
      const i = idx(col, yy);
      c.code[i] = KIND_CODE.planks;
      c.land[i] = 1;
      c.noBuild[i] = 1;
    }
    if (col === loc.cx + 6) shore = y;
  }
  // Barques amarrées de part et d'autre, tonneaux au pied de l'appontement (n°46).
  place(c, 'boat', 0, loc.cx + 3, shore + 1, { margin: -1, allowWater: true, allowReserved: true });
  place(c, 'boat', 0, loc.cx + 8, shore + 2, { margin: -1, allowWater: true, allowReserved: true });
  propNear(c, 'barrel', 1, loc.cx + 5, shore - 3, 1);
  propNear(c, 'crate', 1, loc.cx + 8, shore - 3, 1);
  void px;
}

/* ---------- Champs de blé (décision n°49) ---------- */

/**
 * Plante le blé : un tampon 1×2 par case de champ (les épis montent dans la
 * case du dessus). La silhouette n'est plus un rectangle : les coins sont
 * retirés, la bordure redevient de l'herbe où le blé se fait clairsemé, et des
 * touffes sauvages débordent sur l'herbe voisine.
 */
function plantWheat(c: Ctx): void {
  const isField = (x: number, y: number): boolean => inb(x, y) && isLandCode(at(c.code, idx(x, y))) && kindOf(at(c.code, idx(x, y))) === 'field';
  const field: number[] = [];
  for (let k = 0; k < N; k++) if (isField(k % W, Math.floor(k / W))) field.push(k);
  const original = new Set(field);
  const was = (x: number, y: number): boolean => inb(x, y) && original.has(idx(x, y));
  // Coins arrondis : une case de champ qui n'a qu'un voisin de champ par axe est retirée
  // (calculé sur le champ d'origine, pour ne pas ronger le champ de proche en proche).
  const inField = new Set(field.filter((k) => {
    const x = k % W;
    const y = Math.floor(k / W);
    return !((!was(x - 1, y) || !was(x + 1, y)) && (!was(x, y - 1) || !was(x, y + 1)));
  }));
  const has = (x: number, y: number): boolean => inb(x, y) && inField.has(idx(x, y));
  const edge = (x: number, y: number): boolean => !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
  const rnd = mulberry32(hashString('ble'));
  for (const k of field) {
    const x = k % W;
    const y = Math.floor(k / W);
    if (!inField.has(k)) {
      c.code[k] = KIND_CODE.grass;
      continue;
    }
    const border = edge(x, y);
    if (border) c.code[k] = KIND_CODE.grass; // la terre labourée ne se voit qu'au cœur du champ
    const v = border ? WHEAT_EDGE : hash2(x, y, SEED + 91) < 0.18 ? 6 : Math.floor(hash2(x, y, SEED + 92) * 4);
    // Posé sans contrôle d'occupation : les épis du premier rang passent devant la clôture.
    commit(c, 'wheat', v, x, y - 1);
  }
  // Touffes sauvages autour du champ.
  for (const k of field) {
    const x = k % W;
    const y = Math.floor(k / W);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inb(nx, ny) || inField.has(idx(nx, ny)) || rnd() > 0.35) continue;
      const kind = isLandCode(at(c.code, idx(nx, ny))) ? kindOf(at(c.code, idx(nx, ny))) : '';
      if (kind !== 'grass' || c.road[idx(nx, ny)]) continue;
      place(c, 'wheat', WHEAT_WILD, nx, ny - 1, { margin: -1, allowReserved: true });
    }
  }
}

/* ---------- Scatter ---------- */

function scatter(c: Ctx): void {
  const rnd = mulberry32(hashString('scatter'));
  const order: number[] = Array.from({ length: N }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  for (const k of order) {
    const code = at(c.code, k);
    if (!isLandCode(code) || c.band[k] || c.reserved[k] || c.road[k]) continue;
    const x = k % W;
    const y = Math.floor(k / W);
    const kind = kindOf(code);
    if (kind === 'sand' || kind === 'cobble' || kind === 'planks' || kind === 'pond') {
      if (kind === 'sand') {
        const rs = rnd();
        if (rs < 0.012) place(c, 'rock', 2, x, y, { margin: 1 });
        else if (rs < 0.03) place(c, 'pebbles', 1, x, y, { margin: -1 });
      }
      continue;
    }
    const z = at(c.zone, k);
    const r = rnd();
    const dense = fbm(x / 7, y / 7, SEED + 21);
    // Prairies fleuries : massifs groupés (fleurs, herbes hautes) là où le champ de bruit est haut.
    const meadow = fbm(x / 6, y / 6, SEED + 31);
    const v = Math.floor(rnd() * 5);
    const oakV = v === 4 ? (dense > 0.55 ? 3 : 4) : v % 3; // feuillus : surtout verts, quelques roux/dorés en lisière
    if (z === 1) {
      if (r < 0.006 + dense * 0.02) placeFoot(c, 'oak', oakV === 3 && dense < 0.5 ? 0 : oakV, x, y, { margin: 1 });
      else if (r < 0.03) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < 0.04) place(c, 'rock', v, x, y, { margin: 1 });
      else if (meadow > 0.58 && r < 0.2) place(c, r < 0.12 ? 'flowers' : 'tall_grass', (x * 7 + y * 3) % (r < 0.12 ? 4 : 2), x, y, { margin: -1 });
      else if (r > 0.993) place(c, 'stump', (x + y) % 2, x, y, { margin: 1 });
      else if (r > 0.975) place(c, 'pebbles', (x + y) % 3 === 1 ? 0 : (x + y) % 3, x, y, { margin: -1 });
    } else if (z === 2) {
      const treeP = kind === 'forest' ? 0.16 + dense * 0.2 : 0.035;
      if (r < treeP) {
        if (rnd() < 0.6) placeFoot(c, 'pine', v % 4, x, y, { margin: 1 });
        else placeFoot(c, 'oak', oakV, x, y, { margin: 1 });
      } else if (r < treeP + 0.03) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < treeP + 0.036) place(c, 'rock', v, x, y, { margin: 1 });
      else if (r < treeP + 0.16 && (kind === 'forest' || meadow > 0.55)) place(c, kind === 'forest' && r < treeP + 0.1 ? 'tall_grass' : 'flowers', kind === 'forest' ? 0 : 2, x, y, { margin: -1 });
      // Sous-bois : souches, troncs couchés, champignons.
      else if (kind === 'forest' && r > 0.985) place(c, r > 0.993 ? 'log' : 'stump', x % 2, x, y, { margin: 1 });
      else if (kind === 'forest' && r > 0.95) place(c, 'mushrooms', (x + y) % 2, x, y, { margin: -1 });
    } else if (z === 3) {
      if (kind === 'marsh') {
        if (r < 0.06) placeFoot(c, 'dead_tree', v % 2, x, y, { margin: 1 });
        else if (r < 0.2) place(c, 'reeds', v, x, y, { margin: 0 });
      } else if (r < 0.01) placeFoot(c, 'dead_tree', v % 2, x, y, { margin: 1 });
      else if (r < 0.035) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < 0.045) place(c, 'rock', v, x, y, { margin: 1 });
      else if (meadow > 0.6 && r < 0.12) place(c, 'tall_grass', 2, x, y, { margin: -1 });
      else if (r > 0.975) place(c, 'pebbles', 1 - ((x + y) % 2), x, y, { margin: -1 });
    } else if (z === 4) {
      if (r < 0.03) place(c, 'rock', v, x, y, { margin: 1 });
      else if (r < 0.05 && kind !== 'snow') placeFoot(c, 'dark_pine', kind === 'rock' && y < 30 ? 3 : v % 3, x, y, { margin: 1 });
      else if (r < 0.058) placeFoot(c, 'dead_tree', v % 2, x, y, { margin: 1 });
      else if (r > 0.95 && kind !== 'snow') place(c, 'pebbles', (x + y) % 2 === 0 ? 0 : 2, x, y, { margin: -1 });
    } else if (z === 5) {
      if (r < 0.03) place(c, 'ruin_wall', v, x, y, { margin: 1 });
      else if (r < 0.04) place(c, 'pillar', v, x, y - 1, { margin: 1 });
      else if (r < 0.05) place(c, 'rock', v, x, y, { margin: 1 });
      else if (r > 0.96) place(c, 'pebbles', 0, x, y, { margin: -1 });
    }
  }
}

function fillBands(c: Ctx): void {
  const rnd = mulberry32(hashString('bands'));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const band = at(c.band, k);
      if (!band || c.collision[k] === COLLISION.gate) continue;
      if (band === 1) {
        c.code[k] = KIND_CODE.forest;
        c.collision[k] = COLLISION.blocked;
        // Lisière dense : un arbre sur deux environ, les cimes se chevauchent.
        if (!c.blockedOcc[k] && rnd() < 0.5) {
          const ok = placeFoot(c, rnd() < 0.8 ? 'dark_pine' : 'pine', Math.floor(rnd() * 3), x, y, { margin: -1, allowReserved: true, onRoad: true });
          if (!ok) place(c, 'bush', Math.floor(rnd() * 5), x, y, { margin: -1, allowReserved: true });
        }
      } else if (band === 2) {
        c.code[k] = POND;
        c.collision[k] = COLLISION.water;
      } else {
        c.code[k] = KIND_CODE.rock;
        c.collision[k] = COLLISION.blocked;
        if (!c.blockedOcc[k]) place(c, 'cliff', Math.floor(rnd() * 3), x, y, { margin: -1, allowReserved: true, onRoad: true });
      }
    }
  }
}

/** Larges plaques de nuances : ton 0 (sombre), 1 (moyen) ou 2 (clair) par case, bruit de basse fréquence. */
function groundTones(c: Ctx): Uint8Array {
  const out = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const code = at(c.code, k);
      if (!isLandCode(code) || !TONED.has(kindOf(code))) {
        out[k] = 1;
        continue;
      }
      const n = fbm(x / 9, y / 9, SEED + 81, 3);
      out[k] = n < 0.41 ? 0 : n > 0.59 ? 2 : 1;
    }
  }
  return out;
}

/** Usure des pavés : distance au bord de la place (0 au bord, 2 au cœur). */
function cobbleWear(c: Ctx): Uint8Array {
  const dist = new Int16Array(N).fill(-1);
  const queue: number[] = [];
  const isCobble = (k: number): boolean => isLandCode(at(c.code, k)) && kindOf(at(c.code, k)) === 'cobble';
  for (let k = 0; k < N; k++) {
    if (!isCobble(k)) {
      dist[k] = 0;
      queue.push(k);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head] as number;
    const x = k % W;
    const y = Math.floor(k / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!inb(x + dx, y + dy)) continue;
      const n = idx(x + dx, y + dy);
      if (dist[n] === -1) {
        dist[n] = (dist[k] as number) + 1;
        queue.push(n);
      }
    }
  }
  const out = new Uint8Array(N);
  for (let k = 0; k < N; k++) out[k] = Math.max(0, Math.min(2, (dist[k] as number) - 1));
  return out;
}

/** Décor du sol d'une case : touffes groupées en massifs, fleurs en tapis, cailloux épars. */
function decoFor(kind: GroundKind, x: number, y: number): number {
  const h = hash2(x, y, SEED + 71);
  const count = GROUND_DECOS[kind];
  if (kind === 'marsh') return h < 0.22 ? 1 : h < 0.5 ? 2 : 0;
  if (kind === 'grass') {
    const flowers = fbm(x / 6, y / 6, SEED + 93, 2);
    const clump = fbm(x / 4, y / 4, SEED + 91, 2);
    if (flowers > 0.66 && h < 0.75) return 3;
    if (clump > 0.56) return h < 0.8 ? 2 : 1;
    if (clump > 0.46) return h < 0.6 ? 1 : 0;
    return h < 0.05 ? 4 % count : 0;
  }
  if (kind === 'forest') {
    const litter = fbm(x / 5, y / 5, SEED + 95, 2);
    if (litter > 0.6) return h < 0.7 ? 2 : 1;
    return h < 0.3 ? 1 : h < 0.36 ? 3 : 0;
  }
  if (kind === 'field' || kind === 'planks' || kind === 'pond' || kind === 'ruins') return Math.floor(h * count);
  if (kind === 'rock') return h < 0.3 ? 1 : h < 0.48 ? 2 : 0;
  return h < 0.25 ? 1 : h < 0.35 ? Math.min(2, count - 1) : 0;
}

/* ---------- Résolution des tuiles ---------- */

/* Contours lissés (décision n°43) : flou gaussien de chaque couche, échantillonné tous les 8 px. */

/** Couches lissées, par priorité croissante (les sols durs n'en font pas partie ; l'eau est au-dessus de tout). */
const SOFT_LAYERS: readonly GroundKind[] = KINDS.filter((k) => !HARD_KINDS.has(k) && k !== 'pond').sort((a, b) => GROUND_PRIORITY[a] - GROUND_PRIORITY[b]);
/** Rayon du flou (en cases) : large pour les sols naturels (courbes amples), serré pour les routes et pavés (qui restent fins). */
const SIGMA: Record<Layer, number> = {
  marsh: 0.95,
  grass: 0.9,
  field: 0,
  forest: 0.95,
  rock: 0.85,
  snow: 0.85,
  sand: 0.75,
  dirt: 0.55,
  road: 0.45,
  ruins: 0.5,
  planks: 0,
  cobble: 0.55,
  pond: 0,
  water: 0.95,
};
/** Amplitude du bruit de bord (même valeur que `ground.ts`), pour savoir quelles couches peuvent apparaître dans une tuile. */
const MARGIN = 0.16;
const SUB = 4; // échantillons par case (tous les 4 px)
const SW = SUB * W + 1;
const SH = SUB * H + 1;

/** Flou gaussien séparable d'une valeur par case, échantillonné tous les 4 px. */
function blurField(values: Float32Array, sigma: number): Float32Array {
  const radius = Math.ceil(3 * sigma);
  const weight = (d: number): number => Math.exp(-(d * d) / (2 * sigma * sigma));
  const tmp = new Float32Array(SW * H);
  for (let cy = 0; cy < H; cy++) {
    for (let i = 0; i < SW; i++) {
      const pos = i / SUB;
      let sum = 0;
      let wsum = 0;
      for (let cx = Math.floor(pos) - radius; cx <= Math.floor(pos) + radius; cx++) {
        if (cx < 0 || cx >= W) continue;
        const w = weight(pos - (cx + 0.5));
        sum += (values[cy * W + cx] as number) * w;
        wsum += w;
      }
      tmp[cy * SW + i] = wsum > 0 ? sum / wsum : 0;
    }
  }
  const out = new Float32Array(SW * SH);
  for (let j = 0; j < SH; j++) {
    const pos = j / SUB;
    for (let i = 0; i < SW; i++) {
      let sum = 0;
      let wsum = 0;
      for (let cy = Math.floor(pos) - radius; cy <= Math.floor(pos) + radius; cy++) {
        if (cy < 0 || cy >= H) continue;
        const w = weight(pos - (cy + 0.5));
        sum += (tmp[cy * SW + i] as number) * w;
        wsum += w;
      }
      out[j * SW + i] = wsum > 0 ? sum / wsum : 0;
    }
  }
  return out;
}

/** Les 5 × 5 échantillons (quantifiés 0..16) de la case (x, y). */
function samplesOf(f: Float32Array, x: number, y: number): number[] {
  const out: number[] = [];
  for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) out.push(Math.round((f[(SUB * y + j) * SW + (SUB * x + i)] as number) * SAMPLE_STEPS));
  return out;
}

/**
 * Sol « de remplissage » de chaque case : son sol pour une case de terre douce,
 * sinon (eau, pont, champ, quai) le sol doux le plus proche, ainsi que son ton.
 * Sert de fond sous l'eau des rivages et autour des sols durs.
 */
function fillKinds(c: Ctx, tones: Uint8Array): { kind: Uint8Array; tone: Uint8Array } {
  const kind = new Uint8Array(N).fill(255);
  const tone = new Uint8Array(N).fill(1);
  const queue: number[] = [];
  for (let k = 0; k < N; k++) {
    const code = at(c.code, k);
    if (isLandCode(code) && SOFT_LAYERS.includes(kindOf(code))) {
      kind[k] = code;
      tone[k] = at(tones, k);
      queue.push(k);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head] as number;
    const x = k % W;
    const y = Math.floor(k / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!inb(x + dx, y + dy)) continue;
      const n = idx(x + dx, y + dy);
      if (kind[n] === 255) {
        kind[n] = kind[k] as number;
        tone[n] = tone[k] as number;
        queue.push(n);
      }
    }
  }
  for (let k = 0; k < N; k++) if (kind[k] === 255) kind[k] = KIND_CODE.grass;
  return { kind, tone };
}

function resolveGround(c: Ctx, waterDepth: Uint8Array): Uint16Array {
  const ground = new Uint16Array(N);
  const tones = groundTones(c);
  const wear = cobbleWear(c);
  const filled = fillKinds(c, tones);
  const isWaterCode = (code: number): boolean => code === WATER || code === POND;
  const waterNeighbors = (x: number, y: number): number =>
    ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => !inb(x + dx, y + dy) || isWaterCode(at(c.code, idx(x + dx, y + dy)))).length;

  // Eau : rivière, mer, étangs, quais au bord de l'eau ; ponts et gués comptent comme de l'eau
  // (version « ponts en terre » pour les cases de terre qui touchent un pont : pas de fossé avant le tablier).
  const wetA = new Float32Array(N);
  const wetB = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const code = at(c.code, k);
      const crossing = code === BRIDGE || code === FORD;
      const dock = isLandCode(code) && kindOf(code) === 'planks' && waterNeighbors(x, y) >= 2;
      const wet = isWaterCode(code) || dock;
      wetA[k] = wet || crossing ? 1 : 0;
      wetB[k] = wet ? 1 : 0;
    }
  }
  const waterField = blurField(wetA, SIGMA.water);
  const waterFieldNearCrossing = blurField(wetB, SIGMA.water);
  // Présence lissée de chaque sol sur la terre (l'eau a sa propre couche ; champs et quais prennent le sol voisin).
  const fields = new Map<GroundKind, Float32Array>();
  for (const layer of SOFT_LAYERS) {
    const ind = new Float32Array(N);
    for (let k = 0; k < N; k++) ind[k] = (wetB[k] as number) === 0 && kindOf(filled.kind[k] as number) === layer ? 1 : 0;
    fields.set(layer, blurField(ind, SIGMA[layer]));
  }
  const toneValues = new Float32Array(N);
  for (let k = 0; k < N; k++) toneValues[k] = (filled.tone[k] as number) / 2;
  const toneField = blurField(toneValues, 1.1);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const code = at(c.code, k);
      if (code === BRIDGE || code === FORD) {
        const left = at(c.code, idx(x - 1, y)) === code;
        const right = at(c.code, idx(x + 1, y)) === code;
        if (code === FORD) {
          const v = Math.floor(hash2(x, y, SEED + 61) * 3);
          ground[k] = c.tiles.tile(`ford:${v}`, (px, rnd) => paintFord(px, rnd, v), 'gue');
        } else {
          const part = !left ? 'start' : !right ? 'end' : 'mid';
          ground[k] = c.tiles.tile(`bridge:${part}`, (px, rnd) => paintBridge(px, rnd, 'h', part), 'pont');
        }
        continue;
      }
      const isWater = isWaterCode(code);
      const terrain = code === WATER ? (at(waterDepth, k) === 0 ? 'riviere' : 'eau_profonde') : code === POND ? 'eau_profonde' : GROUND_TERRAIN[kindOf(code)];
      if (isLandCode(code) && !isWater && HARD_KINDS.has(kindOf(code))) {
        const kind = kindOf(code);
        const deco = decoFor(kind, x, y);
        ground[k] = c.tiles.tile(`hard:${kind}:${deco}`, (px, rnd) => paintHardGround(px, rnd, kind, deco), terrain);
        continue;
      }

      let nearCrossing = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && [BRIDGE, FORD].includes(at(c.code, idx(x + dx, y + dy)))) nearCrossing = true;
      const water = samplesOf(!isWater && nearCrossing ? waterFieldNearCrossing : waterField, x, y);
      const level = code === WATER ? at(waterDepth, k) : 0;
      if (isWater && Math.min(...water) / SAMPLE_STEPS > 0.5 + MARGIN) {
        ground[k] = c.tiles.tile(`water:${terrain}:${level}`, (px) => (level === 0 ? paintClear(px) : paintDeepWater(px, level)), terrain);
        continue;
      }

      // Couches présentes près de la case ; la plus présente sert de repli.
      const layers: LayerSamples[] = SOFT_LAYERS.map((layer) => ({ layer, f: samplesOf(fields.get(layer) as Float32Array, x, y) })).filter((l) => Math.max(...l.f) > 0);
      const base = ([...layers].sort((a, b) => b.f.reduce((s, v) => s + v, 0) - a.f.reduce((s, v) => s + v, 0))[0]?.layer ?? kindOf(filled.kind[k] as number)) as GroundKind;
      if (layers.length === 1 && Math.min(...(layers[0] as LayerSamples).f) === SAMPLE_STEPS) layers.length = 0;
      if (Math.max(...water) > 0) layers.push({ layer: 'water', f: water });

      const kind: Layer = isWater ? 'water' : kindOf(code);
      const rutCode = at(c.rut, k);
      const rut: Rut | null = kind === 'road' && rutCode > 0 && rutCode < 255 ? { axis: rutCode >= 3 ? 'v' : 'h', lane: ((rutCode - 1) % 2) as 0 | 1 } : null;
      const spec: GroundSpec = normalizeSpec({
        kind,
        deco: kind === 'water' ? 0 : decoFor(kind, x, y),
        base,
        layers,
        tone: samplesOf(toneField, x, y),
        phase: (x & 1) + 2 * (y & 1),
        rut,
        wear: kind === 'cobble' ? (wear[k] as number) : 0,
      });
      ground[k] = c.tiles.tile(`${terrain}|${groundKey(spec)}`, (px, rnd) => paintGround(px, rnd, spec), terrain);
    }
  }
  return ground;
}

/** Distance à la terre (cases) pour les niveaux d'eau profonde. */
function waterDepth(c: Ctx): Uint8Array {
  const dist = new Int16Array(N).fill(-1);
  const queue: number[] = [];
  for (let k = 0; k < N; k++) {
    const code = at(c.code, k);
    if (code !== WATER) {
      dist[k] = 0;
      queue.push(k);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head] as number;
    const x = k % W;
    const y = Math.floor(k / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (!inb(x + dx, y + dy)) continue;
      const n = idx(x + dx, y + dy);
      if (dist[n] === -1) {
        dist[n] = (dist[k] as number) + 1;
        queue.push(n);
      }
    }
  }
  const out = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const d = dist[k] as number;
    out[k] = d >= 8 ? 3 : d >= 5 ? 2 : d >= 3 ? 1 : 0;
  }
  return out;
}

/* ---------- Export Tiled ---------- */

interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0;
  visible: true;
  point?: true;
  properties: { name: string; type: string; value: string }[];
}

export function generateWorld(zones: readonly ZoneDef[]): GeneratedWorld {
  const flagByZoneValue = new Map(zones.map((z) => [z.value, z.unlockFlag]));
  const zoneIdByValue = new Map(zones.map((z) => [z.value, z.id]));
  const c: Ctx = {
    land: buildLand(),
    sea: new Uint8Array(N),
    zone: new Uint8Array(N),
    code: new Uint8Array(N),
    collision: new Uint8Array(N),
    decor: new Uint16Array(N),
    canopy: new Uint16Array(N),
    blockedOcc: new Uint8Array(N),
    decorOcc: new Uint8Array(N),
    canopyOcc: new Uint8Array(N),
    buildOcc: new Uint8Array(N),
    keep: new Uint8Array(N),
    buildings: [],
    decorParts: new Array<Part[] | undefined>(N),
    canopyParts: new Array<Part[] | undefined>(N),
    seq: 0,
    road: new Uint8Array(N),
    rut: new Uint8Array(N),
    noBuild: new Uint8Array(N),
    reserved: new Uint8Array(N),
    band: new Uint8Array(N),
    gateFlag: new Array<string | undefined>(N).fill(undefined),
    chimneys: [],
    lights: [],
    tiles: new TilesetBuilder(),
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) c.zone[idx(x, y)] = zoneValueAt(x, y);

  c.sea = seaMask(c.land);
  carveRiver(c);
  paintKinds(c);
  // Chaussée de pierre vers la Citadelle.
  for (let y = CAUSEWAY.y0; y <= CAUSEWAY.y1; y++) {
    for (let x = CAUSEWAY.x0; x <= CAUSEWAY.x1; x++) {
      c.land[idx(x, y)] = 1;
      c.code[idx(x, y)] = KIND_CODE.cobble;
    }
  }
  markBands(c);
  for (const loc of LOCATIONS) reserveRect(c, loc);
  carveRoads(c);
  dilateRoads(c);

  // Passages : les routes qui traversent une bande, plus la chaussée de la Citadelle.
  for (let k = 0; k < N; k++) {
    if (c.band[k] && c.road[k]) {
      c.collision[k] = COLLISION.gate;
      c.gateFlag[k] = flagByZoneValue.get(at(c.zone, k)) ?? undefined;
      c.code[k] = at(c.band, k) === 2 ? KIND_CODE.planks : KIND_CODE.road;
      c.band[k] = 0;
    }
  }
  for (let y = CAUSEWAY.y0; y <= CAUSEWAY.y1; y++) {
    for (let x = CAUSEWAY.x0; x <= CAUSEWAY.x1; x++) {
      c.collision[idx(x, y)] = COLLISION.gate;
      c.gateFlag[idx(x, y)] = flagByZoneValue.get(5) ?? undefined;
    }
  }

  for (const loc of LOCATIONS) dressLocation(c, loc);
  fillBands(c);
  scatter(c);
  plantWheat(c);

  // Collision de base à partir des sols.
  for (let k = 0; k < N; k++) {
    if (c.collision[k] === COLLISION.gate) continue;
    const code = at(c.code, k);
    if (code === WATER || code === POND) c.collision[k] = COLLISION.water;
    else if (code === FORD) c.collision[k] = COLLISION.slow;
    else if (code === BRIDGE) c.collision[k] = COLLISION.free;
    else if (kindOf(code) === 'marsh' && c.collision[k] === COLLISION.free) c.collision[k] = COLLISION.slow;
    else if (kindOf(code) === 'planks' && !c.blockedOcc[k]) c.collision[k] = COLLISION.free;
  }
  // Les routes sont toujours libres.
  for (let k = 0; k < N; k++) if (c.road[k] && c.collision[k] === COLLISION.slow) c.collision[k] = COLLISION.free;

  const depth = waterDepth(c);
  const ground = resolveGround(c, depth);

  // Objets
  let nextId = 1;
  const prop = (name: string, value: string): { name: string; type: string; value: string } => ({ name, type: 'string', value });
  const locations: TiledObject[] = LOCATIONS.map((l) => ({
    id: nextId++,
    name: l.name,
    type: l.kind,
    x: Math.floor(l.cx - l.w / 2) * TILE,
    y: Math.floor(l.cy - l.h / 2) * TILE,
    width: l.w * TILE,
    height: l.h * TILE,
    rotation: 0,
    visible: true,
    properties: [prop('id', l.id), prop('zone', zoneIdByValue.get(at(c.zone, idx(l.cx, l.cy))) ?? 'z1')],
  }));

  // Passages : rectangles par rangée, fusionnés verticalement.
  const gates: TiledObject[] = [];
  const counters = new Map<string, number>();
  type Run = { x0: number; x1: number; y0: number; y1: number; flag: string };
  const open: Run[] = [];
  const done: Run[] = [];
  for (let y = 0; y <= H; y++) {
    const runs: Run[] = [];
    if (y < H) {
      let x = 0;
      while (x < W) {
        const k = idx(x, y);
        const flag = c.collision[k] === COLLISION.gate ? c.gateFlag[k] : undefined;
        if (flag === undefined) {
          x++;
          continue;
        }
        let x1 = x;
        while (x1 + 1 < W && c.collision[idx(x1 + 1, y)] === COLLISION.gate && c.gateFlag[idx(x1 + 1, y)] === flag) x1++;
        runs.push({ x0: x, x1, y0: y, y1: y, flag });
        x = x1 + 1;
      }
    }
    for (let i = open.length - 1; i >= 0; i--) {
      const o = open[i] as Run;
      const match = runs.find((r) => r.x0 === o.x0 && r.x1 === o.x1 && r.flag === o.flag);
      if (match) {
        match.y0 = o.y0;
        open.splice(i, 1);
      } else {
        done.push(o);
        open.splice(i, 1);
      }
    }
    open.push(...runs);
  }
  done.sort((a, b) => a.flag.localeCompare(b.flag) || a.y0 - b.y0 || a.x0 - b.x0);
  for (const r of done) {
    const zoneId = [...flagByZoneValue.entries()].find(([, f]) => f === r.flag)?.[0];
    const zid = zoneIdByValue.get(zoneId ?? 0) ?? 'z0';
    const n = (counters.get(zid) ?? 0) + 1;
    counters.set(zid, n);
    gates.push({
      id: nextId++,
      name: `Passage ${zid.toUpperCase()}-${n}`,
      type: 'gate',
      x: r.x0 * TILE,
      y: r.y0 * TILE,
      width: (r.x1 - r.x0 + 1) * TILE,
      height: (r.y1 - r.y0 + 1) * TILE,
      rotation: 0,
      visible: true,
      properties: [prop('id', `gate_${zid}_${n}`), prop('flag', r.flag)],
    });
  }

  const spawns: TiledObject[] = [
    { id: nextId++, name: 'Départ', type: 'start', x: START.cx * TILE + 8, y: START.cy * TILE + 8, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [prop('id', 'start')] },
  ];
  for (const l of LOCATIONS.filter((p) => p.kind === 'autel')) {
    spawns.push({ id: nextId++, name: l.name, type: 'altar', x: l.cx * TILE + 8, y: (l.cy + 2) * TILE + 8, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [prop('id', l.id.replace('autel_', 'altar_'))] });
  }

  // Cases de départ et d'autel : toujours libres.
  for (const s of spawns) {
    const sx = Math.floor(s.x / TILE);
    const sy = Math.floor(s.y / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const k = idx(sx + dx, sy + dy);
        if (c.collision[k] === COLLISION.blocked && !c.band[k]) {
          c.collision[k] = COLLISION.free;
          c.decorParts[k] = undefined;
          c.canopyParts[k] = undefined;
        }
      }
    }
  }

  // Décors animés : lumières et cheminées (points).
  const ambient: TiledObject[] = [];
  for (const light of c.lights) {
    ambient.push({ id: nextId++, name: 'Lumière', type: 'light', x: light.x, y: light.y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [prop('kind', light.kind)] });
  }
  for (const chimney of c.chimneys) {
    ambient.push({ id: nextId++, name: 'Cheminée', type: 'chimney', x: chimney.x, y: chimney.y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [] });
  }

  composeLayers(c);
  const tileset = c.tiles.build();
  const tileLayer = (id: number, name: string, data: ArrayLike<number>, visible = true): Record<string, unknown> => ({
    id,
    name,
    type: 'tilelayer',
    x: 0,
    y: 0,
    width: W,
    height: H,
    opacity: 1,
    visible,
    data: Array.from(data),
  });
  const objectLayer = (id: number, name: string, objects: TiledObject[]): Record<string, unknown> => ({ id, name, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects });

  const tiled: Record<string, unknown> = {
    compressionlevel: -1,
    height: H,
    width: W,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tileheight: TILE,
    tilewidth: TILE,
    tiledversion: '1.10.2',
    version: '1.10',
    type: 'map',
    nextlayerid: 10,
    nextobjectid: nextId,
    layers: [
      tileLayer(1, 'ground', ground),
      tileLayer(2, 'decor', c.decor),
      tileLayer(3, 'canopy', c.canopy),
      tileLayer(4, 'collision', c.collision, false),
      tileLayer(5, 'zones', c.zone, false),
      objectLayer(6, 'locations', locations),
      objectLayer(7, 'gates', gates),
      objectLayer(8, 'spawns', spawns),
      objectLayer(9, 'ambient', ambient),
    ],
    tilesets: [
      {
        firstgid: 1,
        name: TILESET_NAME,
        image: `${TILESET_NAME}.png`,
        imagewidth: tileset.atlas.width,
        imageheight: tileset.atlas.height,
        tilewidth: TILE,
        tileheight: TILE,
        margin: 0,
        spacing: 0,
        columns: TILESET_COLUMNS,
        tilecount: tileset.tileCount,
        tiles: [
          ...tileset.terrains.map((t) => ({ id: t.id, properties: [{ name: 'terrain', type: 'string', value: t.terrain }] })),
          ...tileset.animations.map((a) => ({ id: a.id, animation: a.frames.map((tileid, i) => ({ tileid, duration: a.durations[i] ?? 400 })) })),
        ].sort((a, b) => a.id - b.id),
      },
    ],
  };

  const count = (pred: (k: number) => boolean): number => {
    let n = 0;
    for (let k = 0; k < N; k++) if (pred(k)) n++;
    return n;
  };
  return {
    tiled,
    atlas: tileset.atlas,
    layers: { ground, decor: c.decor, canopy: c.canopy, collision: c.collision, zones: c.zone },
    doorFronts: Array.from({ length: N }, (_, k) => k).filter((k) => c.keep[k]).map((k) => ({ x: k % W, y: Math.floor(k / W) })),
    stats: {
      tuiles: tileset.tileCount,
      terre: count((k) => c.land[k] === 1),
      passages: gates.length,
      casesPassage: count((k) => c.collision[k] === COLLISION.gate),
      casesBloquees: count((k) => c.collision[k] === COLLISION.blocked),
    },
  };
}
