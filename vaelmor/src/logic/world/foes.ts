/**
 * Ennemis visibles du monde ouvert (GDD §7, jalon M3) : la machine d'état qui
 * les fait vivre hors combat.
 *
 *   repos / patrouille / errance ──(héros vu)──► ALERTE « ! » ──► POURSUITE
 *        ▲                                                            │
 *        └────────── RETOUR ◄── (perdu 6 s ou à 8 cases) ◄────────────┘
 *   POURSUITE ──(contact)──► COMBAT      ennemi trop faible ──► FUITE
 *
 * Module pur : positions en pixels (les pieds de l'ennemi, comme le héros),
 * temps en ms, hasard par `Rng`. La scène lit l'état de chaque `FoeSim` pour
 * le dessiner et réagit aux événements que `updateFoe` renvoie.
 */
import type { FoesBalance, WorldFoeDef } from '../../data/schemas';
import { COLLISION } from '../../data/worldMap';
import type { Rng } from '../rng';
import type { CollisionGrid } from './collision';
import { facingFromVector, type Facing8 } from './movement';
import { findPath, type Cell } from './pathfinding';

export type FoeMode = 'dormant' | 'idle' | 'patrol' | 'wander' | 'alert' | 'chase' | 'return' | 'flee';

export interface FoeSim {
  readonly def: WorldFoeDef;
  /** Rencontre engagée par cet ennemi (fixe, ou tirée au chargement). */
  readonly encounterId: string;
  /** Niveau moyen des ennemis de la rencontre. */
  readonly level: number;
  /** S'enfuit au lieu de combattre (compagnie bien plus forte). */
  readonly weak: boolean;
  /** Pieds, au point d'attache. */
  readonly home: { readonly x: number; readonly y: number };
  readonly homeAim: number;
  x: number;
  y: number;
  /** Direction du regard (radians, 0 = est, π/2 = sud). */
  aim: number;
  mode: FoeMode;
  /** Temps passé dans le mode actuel (ms). */
  modeMs: number;
  /** Vrai quand il a bougé à la dernière mise à jour (animation de marche). */
  moving: boolean;
  /** La vigie a déjà appelé des renforts. */
  reinforced: boolean;
  route: Cell[];
  pauseMs: number;
  /** Prochain point du trajet d'une patrouille. */
  leg: number;
  repathMs: number;
  lostMs: number;
}

export type FoeEvent =
  | { readonly type: 'alert' }
  | { readonly type: 'reinforce' }
  | { readonly type: 'flee' }
  | { readonly type: 'lost' }
  | { readonly type: 'contact'; readonly ambush: boolean };

export interface FoeEnv {
  readonly grid: CollisionGrid;
  readonly cfg: FoesBalance;
  readonly tile: number;
  readonly hero: { readonly x: number; readonly y: number };
  /** Facteur de détection du moment : sprint ×2, forêt ×0,6, classe (Chasseur de Serpents de Mer ×0,8) — voir `detectionScale`. */
  readonly scale: number;
  /** Répit après un combat : personne ne détecte ni ne touche. */
  readonly grace: boolean;
  readonly rng: Rng;
}

const AIM = { n: -Math.PI / 2, e: 0, s: Math.PI / 2, w: Math.PI } as const;
const REPATH_MS = 350;
const UNREACHABLE_REPATH_MS = 1500;
const EYE = 6;

export const cellFeet = (c: Cell, tile: number): { x: number; y: number } => ({ x: c.x * tile + tile / 2, y: (c.y + 1) * tile - 1 });
export const feetCell = (x: number, y: number, tile: number): Cell => ({ x: Math.floor(x / tile), y: Math.floor((y - 1) / tile) });

/** Facteur de détection : sprint et forêt, classe. Le héros qui court s'entend de plus loin ; la forêt le cache. */
export function detectionScale(opts: { sprinting: boolean; inForest: boolean; sprintMultiplier: number; forestMultiplier: number; classScale: number }): number {
  return (opts.sprinting ? opts.sprintMultiplier : 1) * (opts.inForest ? opts.forestMultiplier : 1) * opts.classScale;
}

export interface FoeSeed {
  readonly encounterId: string;
  readonly level: number;
  readonly weak: boolean;
}

export function createFoe(def: WorldFoeDef, seed: FoeSeed, tile: number): FoeSim {
  const home = cellFeet({ x: def.at[0], y: def.at[1] }, tile);
  const aim = def.facing ? AIM[def.facing] : AIM.s;
  const mode: FoeMode = def.kind === 'embuscade' ? 'dormant' : def.kind === 'sentinelle' || def.kind === 'boss' ? 'idle' : def.kind === 'patrouille' ? 'patrol' : 'wander';
  return {
    def,
    encounterId: seed.encounterId,
    level: seed.level,
    weak: seed.weak,
    home,
    homeAim: aim,
    x: home.x,
    y: home.y,
    aim,
    mode,
    modeMs: 0,
    moving: false,
    reinforced: false,
    route: [],
    pauseMs: 0,
    leg: 1,
    repathMs: 0,
    lostMs: 0,
  };
}

/** Direction de sprite (8 directions) du regard d'un ennemi. */
export function foeFacing(foe: FoeSim): Facing8 {
  return facingFromVector(Math.cos(foe.aim), Math.sin(foe.aim)) ?? 's';
}

/** Caché au joueur : une embuscade qui attend. */
export const isHidden = (foe: FoeSim): boolean => foe.mode === 'dormant';

/** Peut-on lui tomber dessus par surprise (touche E) ? Ni caché, ni déjà alerté. */
export const isSurprisable = (foe: FoeSim): boolean => foe.mode === 'idle' || foe.mode === 'patrol' || foe.mode === 'wander' || foe.mode === 'return';

const angleDiff = (a: number, b: number): number => {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
};

/** Aucun obstacle plein (arbre, mur, rocher) entre deux points : l'eau ne gêne pas la vue. */
export function lineOfSight(grid: CollisionGrid, ax: number, ay: number, bx: number, by: number, tile: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (tile / 2)));
  for (let i = 1; i < steps; i++) {
    const x = ax + ((bx - ax) * i) / steps;
    const y = ay + ((by - ay) * i) / steps;
    if (grid.valueAt(Math.floor(x / tile), Math.floor(y / tile)) === COLLISION.blocked) return false;
  }
  return true;
}

/** Le héros est-il dans le cercle ou le cône de vision de cet ennemi ? */
export function detects(foe: FoeSim, env: FoeEnv): boolean {
  const det = env.cfg.detection[foe.def.kind];
  const dx = env.hero.x - foe.x;
  const dy = env.hero.y - foe.y;
  const d = Math.hypot(dx, dy);
  const inCircle = det.radius > 0 && d <= det.radius * env.tile * env.scale;
  const inCone = det.coneRange > 0 && d <= det.coneRange * env.tile * env.scale && angleDiff(Math.atan2(dy, dx), foe.aim) <= ((det.coneAngle / 2) * Math.PI) / 180;
  if (!inCircle && !inCone) return false;
  return lineOfSight(env.grid, foe.x, foe.y - EYE, env.hero.x, env.hero.y - EYE, env.tile);
}

function setMode(foe: FoeSim, mode: FoeMode): void {
  foe.mode = mode;
  foe.modeMs = 0;
  foe.route = [];
  foe.repathMs = 0;
  foe.lostMs = 0;
}

/** Marche le long de `route` ; renvoie vrai tant qu'il reste du chemin. */
function follow(foe: FoeSim, speed: number, dtMs: number, tile: number): boolean {
  let budget = (speed * dtMs) / 1000;
  while (budget > 0 && foe.route.length > 0) {
    const target = cellFeet(foe.route[0] as Cell, tile);
    const dx = target.x - foe.x;
    const dy = target.y - foe.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) {
      foe.x = target.x;
      foe.y = target.y;
      budget -= d;
      foe.route.shift();
    } else {
      foe.x += (dx / d) * budget;
      foe.y += (dy / d) * budget;
      budget = 0;
    }
    if (d > 0.01) foe.aim = Math.atan2(dy, dx);
    foe.moving = true;
  }
  return foe.route.length > 0;
}

/** Pas direct vers un point (sans chemin), refusé si la case d'arrivée est pleine. */
function stepToward(foe: FoeSim, tx: number, ty: number, speed: number, dtMs: number, env: FoeEnv): boolean {
  const dx = tx - foe.x;
  const dy = ty - foe.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return false;
  const step = Math.min(d, (speed * dtMs) / 1000);
  const nx = foe.x + (dx / d) * step;
  const ny = foe.y + (dy / d) * step;
  if (env.grid.isSolidCell(Math.floor(nx / env.tile), Math.floor((ny - 1) / env.tile))) return false;
  foe.x = nx;
  foe.y = ny;
  foe.aim = Math.atan2(dy, dx);
  foe.moving = true;
  return true;
}

function planRoute(foe: FoeSim, to: Cell, env: FoeEnv): boolean {
  const from = feetCell(foe.x, foe.y, env.tile);
  const path = findPath(env.grid, from, to);
  if (!path) return false;
  foe.route = path.slice(1);
  return true;
}

export function updateFoe(foe: FoeSim, dtMs: number, env: FoeEnv): FoeEvent[] {
  const events: FoeEvent[] = [];
  const { cfg, tile, hero } = env;
  foe.moving = false;
  foe.modeMs += dtMs;
  const dist = Math.hypot(hero.x - foe.x, hero.y - foe.y);

  // Embuscade : invisible tant que le héros n'est pas tout près, puis elle se referme d'un coup.
  if (foe.mode === 'dormant') {
    if (!env.grace && dist <= cfg.detection.embuscade.radius * tile) events.push({ type: 'contact', ambush: true });
    return events;
  }

  // Contact : le combat s'engage (embuscade de la milice si le garde nous tombe dessus).
  if (!env.grace && dist <= cfg.contactRadius && foe.mode !== 'flee') {
    events.push({ type: 'contact', ambush: foe.def.kind === 'garde' });
    return events;
  }

  const sees = !env.grace && detects(foe, env);
  switch (foe.mode) {
    case 'idle':
    case 'patrol':
    case 'wander':
    case 'return': {
      if (foe.def.kind === 'boss') {
        if (!env.grace && dist <= cfg.detection.boss.radius * tile) {
          setMode(foe, 'alert');
          events.push({ type: 'alert' });
        }
        break;
      }
      if (sees) {
        if (foe.weak) {
          setMode(foe, 'flee');
          events.push({ type: 'flee' });
        } else {
          foe.aim = Math.atan2(hero.y - foe.y, hero.x - foe.x);
          setMode(foe, 'alert');
          events.push({ type: 'alert' });
        }
        break;
      }
      if (foe.mode === 'return') returnHome(foe, dtMs, env);
      else if (foe.mode === 'patrol') patrol(foe, dtMs, env);
      else if (foe.mode === 'wander') wander(foe, dtMs, env);
      break;
    }
    case 'alert': {
      foe.aim = Math.atan2(hero.y - foe.y, hero.x - foe.x);
      if (foe.modeMs < cfg.alertMs) break;
      if (foe.def.kind === 'boss') {
        // Le boss ne quitte pas son repaire : l'alerte se termine par le combat.
        if (!env.grace) events.push({ type: 'contact', ambush: false });
        else setMode(foe, 'idle');
        break;
      }
      if (foe.def.kind === 'sentinelle' && !foe.reinforced) {
        foe.reinforced = true;
        events.push({ type: 'reinforce' });
      }
      setMode(foe, 'chase');
      break;
    }
    case 'chase': {
      if (env.grace) {
        setMode(foe, 'return');
        break;
      }
      const los = lineOfSight(env.grid, foe.x, foe.y - EYE, hero.x, hero.y - EYE, tile);
      foe.lostMs = los ? 0 : foe.lostMs + dtMs;
      if (foe.lostMs >= cfg.loseSightMs || dist > cfg.loseDistance * tile) {
        setMode(foe, 'return');
        events.push({ type: 'lost' });
        break;
      }
      if (los && dist < tile * 2.5 && stepToward(foe, hero.x, hero.y, cfg.speeds.chase, dtMs, env)) {
        foe.route = [];
        break;
      }
      foe.repathMs -= dtMs;
      if (foe.repathMs <= 0) {
        const target = feetCell(hero.x, hero.y, tile);
        foe.repathMs = planRoute(foe, target, env) ? REPATH_MS : UNREACHABLE_REPATH_MS;
      }
      follow(foe, cfg.speeds.chase, dtMs, tile);
      break;
    }
    case 'flee': {
      if (dist > cfg.loseDistance * tile || (env.grace && dist > cfg.contactRadius * 4)) {
        setMode(foe, 'return');
        break;
      }
      const away = Math.atan2(foe.y - hero.y, foe.x - hero.x);
      for (const turn of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
        const a = away + turn;
        if (stepToward(foe, foe.x + Math.cos(a) * 24, foe.y + Math.sin(a) * 24, cfg.speeds.flee, dtMs, env)) break;
      }
      // Acculé, il se bat : le contact est géré plus haut dès que le héros le touche.
      break;
    }
  }
  return events;
}

function returnHome(foe: FoeSim, dtMs: number, env: FoeEnv): void {
  if (foe.route.length === 0) {
    const here = feetCell(foe.x, foe.y, env.tile);
    const home = feetCell(foe.home.x, foe.home.y, env.tile);
    if (here.x === home.x && here.y === home.y) {
      foe.x = foe.home.x;
      foe.y = foe.home.y;
      foe.aim = foe.def.kind === 'sentinelle' ? foe.homeAim : foe.aim;
      setMode(foe, foe.def.kind === 'patrouille' ? 'patrol' : foe.def.kind === 'errant' || foe.def.kind === 'garde' ? 'wander' : 'idle');
      return;
    }
    foe.repathMs -= dtMs;
    if (foe.repathMs > 0) return;
    if (!planRoute(foe, home, env)) {
      // Pas de chemin (rare) : il se téléporte au poste plutôt que de rester coincé.
      foe.x = foe.home.x;
      foe.y = foe.home.y;
      setMode(foe, foe.def.kind === 'patrouille' ? 'patrol' : foe.def.kind === 'errant' || foe.def.kind === 'garde' ? 'wander' : 'idle');
      return;
    }
  }
  follow(foe, env.cfg.speeds.return, dtMs, env.tile);
}

function patrol(foe: FoeSim, dtMs: number, env: FoeEnv): void {
  const path = foe.def.path;
  if (!path || path.length < 2) return;
  if (foe.pauseMs > 0) {
    foe.pauseMs -= dtMs;
    return;
  }
  if (foe.route.length === 0) {
    const target = path[foe.leg % path.length] as readonly [number, number];
    if (!planRoute(foe, { x: target[0], y: target[1] }, env) || foe.route.length === 0) {
      foe.leg += 1;
      foe.pauseMs = env.cfg.pauseMs;
      return;
    }
  }
  if (!follow(foe, env.cfg.speeds.patrol, dtMs, env.tile)) {
    foe.leg += 1;
    foe.pauseMs = env.cfg.pauseMs;
  }
}

function wander(foe: FoeSim, dtMs: number, env: FoeEnv): void {
  const roam = foe.def.roam ?? 3;
  if (foe.pauseMs > 0) {
    foe.pauseMs -= dtMs;
    return;
  }
  if (foe.route.length === 0) {
    const home = feetCell(foe.home.x, foe.home.y, env.tile);
    for (let attempt = 0; attempt < 3; attempt++) {
      const target = { x: home.x + env.rng.int(-roam, roam), y: home.y + env.rng.int(-roam, roam) };
      if (env.grid.isSolidCell(target.x, target.y) || env.grid.valueAt(target.x, target.y) === COLLISION.slow) continue;
      if (planRoute(foe, target, env) && foe.route.length > 0 && foe.route.length <= roam * 4) break;
      foe.route = [];
    }
    if (foe.route.length === 0) {
      foe.pauseMs = env.rng.int(1000, 2500);
      return;
    }
  }
  if (!follow(foe, env.cfg.speeds.wander, dtMs, env.tile)) foe.pauseMs = env.rng.int(1200, 3000);
}

/** Attaque par surprise (E) : le plus proche des ennemis surprenables à portée, ou null. */
export function surpriseTarget(foes: readonly FoeSim[], hero: { x: number; y: number }, range: number): FoeSim | null {
  let best: FoeSim | null = null;
  let bestDistance = range;
  for (const foe of foes) {
    if (!isSurprisable(foe)) continue;
    const d = Math.hypot(hero.x - foe.x, hero.y - foe.y);
    if (d <= bestDistance) {
      best = foe;
      bestDistance = d;
    }
  }
  return best;
}

