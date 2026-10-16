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
  GROUND_PRIORITY,
  GROUND_TERRAIN,
  GROUND_VARIANTS,
  TONED,
  groundKey,
  paintBridge,
  paintClear,
  paintDeepWater,
  paintFord,
  paintGround,
  type Corners,
  type GroundKind,
  type GroundSpec,
  type Side,
  type Sides,
} from './ground';
import { Px } from './px';
import { getStamp } from './props';
import { TILE, TILESET_COLUMNS, TILESET_NAME, TilesetBuilder } from './tileset';

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
  canopyOcc: Uint8Array;
  road: Uint8Array;
  noBuild: Uint8Array; // places, champs, routes dilatées : pas de maison
  reserved: Uint8Array; // emprises des lieux : pas de décor aléatoire
  band: Uint8Array; // 0 aucune, 1 forêt, 2 marais, 3 falaise
  gateFlag: (string | undefined)[];
  wheat: Uint8Array; // cases de champ « intérieures » : le jeu y pose le blé animé
  chimneys: { x: number; y: number }[]; // sorties de cheminée (pixels) : fumée animée
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
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (!inb(cx, cy)) return false;
      const k = idx(cx, cy);
      const isBlocked = s.blocked[j * s.w + i] as boolean;
      const code = at(c.code, k);
      if (!o.allowWater && (code === WATER || code === BRIDGE || code === FORD)) return false;
      if (code === BRIDGE || code === FORD) return false;
      const rowIsCanopy = j < s.canopyRows;
      if (rowIsCanopy ? c.canopyOcc[k] : c.decorOcc[k]) return false;
      if (!o.allowReserved && c.reserved[k]) return false;
      if (!o.onRoad && isBlocked && c.road[k]) return false;
      if (o.noBuild && isBlocked && c.noBuild[k]) return false;
      if (at(c.collision, k) === COLLISION.gate) return false;
      if (isBlocked && margin >= 0) {
        for (let dy = -margin; dy <= margin; dy++) {
          for (let dx = -margin; dx <= margin; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!inb(nx, ny)) continue;
            const inside = nx >= x && nx < x + s.w && ny >= y && ny < y + s.h;
            if (inside && s.blocked[(ny - y) * s.w + (nx - x)]) continue;
            if (c.blockedOcc[idx(nx, ny)]) return false;
          }
        }
      }
    }
  }
  return true;
}

function commit(c: Ctx, name: string, v: number, x: number, y: number): void {
  const s = getStamp(name, v);
  if (s.chimney) c.chimneys.push({ x: x * TILE + s.chimney.x, y: y * TILE + s.chimney.y });
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const cx = x + i;
      const cy = y + j;
      if (!inb(cx, cy)) continue;
      const k = idx(cx, cy);
      const tilePx = new Px(TILE, TILE);
      tilePx.copy(s.px, i * TILE, j * TILE, TILE, TILE, 0, 0);
      let visible = false;
      for (let a = 3; a < tilePx.data.length; a += 4) if ((tilePx.data[a] as number) > 0) visible = true;
      if (visible) {
        const gid = c.tiles.fromPx(`p:${s.name}:${s.variant}:${i}:${j}`, tilePx);
        if (j < s.canopyRows) {
          c.canopy[k] = gid;
          c.canopyOcc[k] = 1;
        } else {
          c.decor[k] = gid;
          c.decorOcc[k] = 1;
        }
      }
      if (s.blocked[j * s.w + i]) {
        c.blockedOcc[k] = 1;
        const cur = at(c.collision, k);
        if (cur === COLLISION.free || cur === COLLISION.slow) c.collision[k] = COLLISION.blocked;
      }
    }
  }
}

function place(c: Ctx, name: string, v: number, x: number, y: number, o: PlaceOptions = {}): boolean {
  if (!canPlace(c, name, v, x, y, o)) return false;
  commit(c, name, v, x, y);
  return true;
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
      for (const cell of [k, widen]) {
        if (cell >= N || !c.land[cell]) {
          if (at(c.code, cell) !== BRIDGE && at(c.code, cell) !== FORD) continue;
        }
        c.road[cell] = 1;
      }
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
    const s = getStamp(name, 0);
    // marge d'une case autour (collision de décor) + bande sud réservée devant la porte
    if (!canPlace(c, name, 0, cand.x, cand.y, { margin: Math.max(spacingX, spacingY), allowReserved: true, noBuild: true })) continue;
    place(c, name, 0, cand.x, cand.y, { margin: Math.max(spacingX, spacingY), allowReserved: true, noBuild: true });
    // Cour de terre devant la porte.
    for (let i = -1; i <= s.w; i++) {
      const k = idx(cand.x + i, cand.y + s.h);
      if (inb(cand.x + i, cand.y + s.h) && isLandCode(at(c.code, k)) && !c.road[k] && ['grass', 'forest', 'sand', 'marsh'].includes(kindOf(at(c.code, k)))) c.code[k] = KIND_CODE.dirt;
    }
    placed++;
  }
  return placed;
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
    if (place(c, name, Math.floor(rnd() * 4), x, y, { margin: 0, allowReserved: true, noBuild: true })) done++;
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
  switch (loc.style) {
    case 'haut_gue': {
      plaza(c, loc, 6, 4);
      setKindRect(c, x0 + 1, y0 + 9, 6, 5, 'field');
      for (let i = 0; i < 6; i++) place(c, 'fence', 0, x0 + 1 + i, y0 + 8, { margin: -1, allowReserved: true });
      place(c, 'well', 0, loc.cx + 3, loc.cy - 2, { margin: 0, allowReserved: true });
      place(c, 'inn', 0, loc.cx + 2, loc.cy - 7, { margin: 1, allowReserved: true, noBuild: true });
      lattice(c, loc, ['house_thatch', 'house_tile', 'house_thatch', 'hut'], 8, 'houses');
      scatterAround(c, loc, ['hay', 'barrel', 'crate', 'bush'], 10, 'misc');
      place(c, 'sign', 0, loc.cx - 4, loc.cy + 6, { margin: 0, allowReserved: true });
      break;
    }
    case 'ronceval': {
      plaza(c, loc, 5, 4);
      place(c, 'well', 0, loc.cx + 2, loc.cy - 2, { margin: 0, allowReserved: true });
      lattice(c, loc, ['house_wood', 'hut', 'house_wood', 'house_thatch'], 8, 'houses');
      scatterAround(c, loc, ['barrel', 'crate', 'bush', 'hay'], 10, 'misc');
      break;
    }
    case 'port_brume': {
      plaza(c, loc, 6, 4);
      place(c, 'well', 0, loc.cx - 3, loc.cy - 2, { margin: 0, allowReserved: true });
      place(c, 'stall', 0, loc.cx - 2, loc.cy - 4, { margin: 0, allowReserved: true, noBuild: false });
      place(c, 'stall', 1, loc.cx + 1, loc.cy - 4, { margin: 0, allowReserved: true });
      lattice(c, loc, ['house_slate', 'house_tile', 'house_slate', 'hut'], 8, 'houses');
      scatterAround(c, loc, ['barrel', 'crate', 'barrel'], 12, 'misc');
      pier(c, loc);
      break;
    }
    case 'pierre_haute': {
      plaza(c, loc, 5, 4);
      setKindRect(c, x0, y0, loc.w, loc.h, 'rock', false);
      place(c, 'well', 0, loc.cx - 3, loc.cy - 2, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      lattice(c, loc, ['house_stone', 'house_slate', 'house_stone', 'hut'], 8, 'houses');
      scatterAround(c, loc, ['rock', 'barrel', 'crate', 'cairn'], 12, 'misc');
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
      place(c, 'well', 0, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx - 4, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx + 5, loc.cy + 2, { margin: 0, allowReserved: true });
      for (let i = 0; i < 3; i++) place(c, 'stall', i, loc.cx - 8 + i * 3, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'inn', 0, loc.cx + 3, loc.cy - 9, { margin: 1, allowReserved: true, noBuild: true });
      lattice(c, loc, ['house_tile', 'house_slate', 'house_tile', 'house_stone', 'hut'], 14, 'houses');
      scatterAround(c, loc, ['barrel', 'crate'], 8, 'misc');
      break;
    }
    case 'camp': {
      setKindRect(c, x0, y0, loc.w, loc.h, 'dirt', false);
      ringWalls(c, x0, y0, loc.w, loc.h, { h: 'palisade', v: 'palisade', tower: null });
      place(c, 'campfire', 0, loc.cx, loc.cy, { margin: 0, allowReserved: true });
      place(c, 'tent', 0, loc.cx - 5, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'tent', 1, loc.cx + 3, loc.cy - 3, { margin: 0, allowReserved: true });
      place(c, 'tent', 0, loc.cx - 5, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'tent', 1, loc.cx + 3, loc.cy + 2, { margin: 0, allowReserved: true });
      place(c, 'banner', 0, loc.cx, loc.cy - 4, { margin: 0, allowReserved: true });
      scatterAround(c, loc, ['barrel', 'crate', 'hay', 'cauldron'], 6, 'misc');
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
      place(c, 'tower', 0, loc.cx - 1, loc.cy - 3, { margin: 0, allowReserved: true });
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
      scatterAround(c, loc, ['barrel', 'crate', 'rock'], 4, 'misc');
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
  }
  void px;
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
      if (kind === 'sand' && rnd() < 0.012) place(c, 'rock', 2, x, y, { margin: 1 });
      continue;
    }
    const z = at(c.zone, k);
    const r = rnd();
    const dense = fbm(x / 7, y / 7, SEED + 21);
    const v = Math.floor(rnd() * 4);
    if (z === 1) {
      if (r < 0.006 + dense * 0.02) place(c, 'oak', v, x, y - 1, { margin: 1 });
      else if (r < 0.03) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < 0.04) place(c, 'rock', v, x, y, { margin: 1 });
    } else if (z === 2) {
      const treeP = kind === 'forest' ? 0.16 + dense * 0.2 : 0.035;
      if (r < treeP) {
        if (rnd() < 0.6) place(c, 'pine', v, x, y - 1, { margin: 1 });
        else place(c, 'oak', v, x, y - 1, { margin: 1 });
      } else if (r < treeP + 0.03) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < treeP + 0.036) place(c, 'rock', v, x, y, { margin: 1 });
    } else if (z === 3) {
      if (kind === 'marsh') {
        if (r < 0.06) place(c, 'dead_tree', v, x, y - 1, { margin: 1 });
        else if (r < 0.2) place(c, 'reeds', v, x, y, { margin: 0 });
      } else if (r < 0.01) place(c, 'dead_tree', v, x, y - 1, { margin: 1 });
      else if (r < 0.035) place(c, 'bush', v, x, y, { margin: 0 });
      else if (r < 0.045) place(c, 'rock', v, x, y, { margin: 1 });
    } else if (z === 4) {
      if (r < 0.03) place(c, 'rock', v, x, y, { margin: 1 });
      else if (r < 0.05 && kind !== 'snow') place(c, 'dark_pine', v, x, y - 1, { margin: 1 });
      else if (r < 0.058) place(c, 'dead_tree', v, x, y - 1, { margin: 1 });
    } else if (z === 5) {
      if (r < 0.03) place(c, 'ruin_wall', v, x, y, { margin: 1 });
      else if (r < 0.04) place(c, 'pillar', v, x, y - 1, { margin: 1 });
      else if (r < 0.05) place(c, 'rock', v, x, y, { margin: 1 });
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
        if (!c.blockedOcc[k]) {
          const ok = place(c, rnd() < 0.8 ? 'dark_pine' : 'pine', Math.floor(rnd() * 4), x, y - 1, { margin: -1, allowReserved: true, onRoad: true });
          if (!ok) place(c, 'bush', Math.floor(rnd() * 3), x, y, { margin: -1, allowReserved: true });
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

/* ---------- Résolution des tuiles ---------- */

function resolveGround(c: Ctx, waterDepth: Uint8Array): Uint16Array {
  const ground = new Uint16Array(N);
  const isWaterLike = (x: number, y: number): boolean => {
    if (!inb(x, y)) return true;
    const code = at(c.code, idx(x, y));
    return code === WATER || code === POND;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const code = at(c.code, k);
      if (code === WATER) {
        const level = at(waterDepth, k);
        ground[k] = c.tiles.tile(`water:${level}`, (px) => (level === 0 ? paintClear(px) : paintDeepWater(px, level)), level === 0 ? 'riviere' : 'eau_profonde');
        continue;
      }
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
      const kind = kindOf(code);
      const neighbors: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const sides: Side[] = neighbors.map(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (kind === 'planks' || kind === 'pond') return null;
        if (isWaterLike(nx, ny)) return 'water';
        const nc = at(c.code, idx(nx, ny));
        if (!isLandCode(nc)) return null;
        const nk = kindOf(nc);
        if (nk === kind || nk === 'pond') return null;
        return GROUND_PRIORITY[nk] > GROUND_PRIORITY[kind] ? nk : null;
      });
      const corners = [[1, -1, 0, 1], [1, 1, 1, 2], [-1, 1, 2, 3], [-1, -1, 3, 0]].map(([dx, dy, s1, s2]) => {
        if (kind === 'planks' || kind === 'pond') return false;
        if (sides[s1 as number] === 'water' || sides[s2 as number] === 'water') return false;
        return isWaterLike(x + (dx as number), y + (dy as number));
      });
      const transitional = sides.some((s) => s !== null) || corners.some(Boolean);
      let variant: number;
      if (TONED.has(kind)) {
        // Larges nuances douces (3 tons) ; les décors fins n'apparaissent que sur les cases sans transition.
        const n = fbm(x / 7, y / 7, SEED + 81, 3);
        const tone = n < 0.42 ? 2 : n > 0.58 ? 1 : 0;
        const decos = GROUND_VARIANTS[kind] / 3;
        variant = tone + (transitional ? 0 : 3 * Math.floor(hash2(x, y, SEED + 71) * decos));
      } else {
        variant = Math.floor(hash2(x, y, SEED + 71) * (transitional ? Math.min(2, GROUND_VARIANTS[kind]) : GROUND_VARIANTS[kind]));
      }
      if (kind === 'field' && !transitional) c.wheat[k] = 1;
      const spec: GroundSpec = { kind, variant, sides: sides as unknown as Sides, corners: corners as unknown as Corners };
      ground[k] = c.tiles.tile(groundKey(spec), (px, rnd) => paintGround(px, rnd, spec), GROUND_TERRAIN[kind]);
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
    road: new Uint8Array(N),
    noBuild: new Uint8Array(N),
    reserved: new Uint8Array(N),
    band: new Uint8Array(N),
    gateFlag: new Array<string | undefined>(N).fill(undefined),
    wheat: new Uint8Array(N),
    chimneys: [],
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
          c.decor[k] = 0;
          c.canopy[k] = 0;
        }
      }
    }
  }

  // Décors animés : blé (rectangles de cases) et cheminées (points).
  const ambient: TiledObject[] = [];
  const wOpen: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const wClosed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (let y = 0; y <= H; y++) {
    const runs: { x0: number; x1: number }[] = [];
    for (let x = 0; y < H && x < W; x++) {
      if (!c.wheat[idx(x, y)]) continue;
      const x0 = x;
      while (x + 1 < W && c.wheat[idx(x + 1, y)]) x++;
      runs.push({ x0, x1: x });
    }
    for (let i = wOpen.length - 1; i >= 0; i--) {
      const o = wOpen[i] as { x0: number; x1: number; y0: number; y1: number };
      const j = runs.findIndex((r) => r.x0 === o.x0 && r.x1 === o.x1);
      if (j >= 0) {
        o.y1 = y;
        runs.splice(j, 1);
      } else {
        wClosed.push(o);
        wOpen.splice(i, 1);
      }
    }
    for (const r of runs) wOpen.push({ x0: r.x0, x1: r.x1, y0: y, y1: y });
  }
  wClosed.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  for (const r of wClosed) {
    ambient.push({ id: nextId++, name: 'Champ de blé', type: 'wheat', x: r.x0 * TILE, y: r.y0 * TILE, width: (r.x1 - r.x0 + 1) * TILE, height: (r.y1 - r.y0 + 1) * TILE, rotation: 0, visible: true, properties: [] });
  }
  for (const chimney of c.chimneys) {
    ambient.push({ id: nextId++, name: 'Cheminée', type: 'chimney', x: chimney.x, y: chimney.y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [] });
  }

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
        tiles: tileset.terrains.map((t) => ({ id: t.id, properties: [{ name: 'terrain', type: 'string', value: t.terrain }] })),
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
    stats: {
      tuiles: tileset.tileCount,
      terre: count((k) => c.land[k] === 1),
      passages: gates.length,
      casesPassage: count((k) => c.collision[k] === COLLISION.gate),
      casesBloquees: count((k) => c.collision[k] === COLLISION.blocked),
    },
  };
}
