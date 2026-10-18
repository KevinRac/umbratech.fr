/**
 * Alliés errants du monde ouvert (jalon M5, GDD §7.8) : des PNJ verts qui
 * parcourent de longues routes, villages compris, s'abordent et rejoignent les
 * combats proches. Ils suivent leurs étapes en boucle (chemin le plus court sur
 * la grille de collision), font une pause à chaque étape, s'arrêtent quand on
 * leur parle et ne marchent jamais à travers le héros.
 *
 * Module pur : positions en pixels (les pieds, comme le héros), temps en ms.
 */
import type { WandererDef } from '../../data/allySchemas';
import type { CollisionGrid } from './collision';
import { cellFeet, feetCell } from './foes';
import { facingFromVector, type Facing8 } from './movement';
import { findPath, type Cell } from './pathfinding';

export interface WalkerSim {
  readonly def: WandererDef;
  x: number;
  y: number;
  facing: Facing8;
  moving: boolean;
  /** Un dialogue est ouvert : il attend. */
  talking: boolean;
  /** Prochaine étape de la route. */
  leg: number;
  /** Chemin vers l'étape (cases). */
  route: Cell[];
  pauseMs: number;
  /** Nouvel essai de chemin après un échec. */
  retryMs: number;
}

export interface WalkerEnv {
  readonly grid: CollisionGrid;
  readonly tile: number;
  readonly speed: number;
  readonly pauseMs: number;
  /** Pieds du héros : un errant ne lui marche pas dessus. */
  readonly hero: { readonly x: number; readonly y: number };
}

export function createWalker(def: WandererDef, tile: number): WalkerSim {
  const feet = cellFeet({ x: def.at[0], y: def.at[1] }, tile);
  return { def, x: feet.x, y: feet.y, facing: def.facing, moving: false, talking: false, leg: 1 % def.route.length, route: [], pauseMs: 0, retryMs: 0 };
}

/** Case du monde où se tient l'errant. */
export const walkerCell = (w: WalkerSim, tile: number): Cell => feetCell(w.x, w.y, tile);

/** Avance l'errant le long de sa route. */
export function updateWalker(w: WalkerSim, dtMs: number, env: WalkerEnv): void {
  w.moving = false;
  if (w.talking) return;
  if (w.pauseMs > 0) {
    w.pauseMs = Math.max(0, w.pauseMs - dtMs);
    return;
  }
  if (w.route.length === 0) {
    if (w.retryMs > 0) {
      w.retryMs = Math.max(0, w.retryMs - dtMs);
      return;
    }
    const [tx, ty] = w.def.route[w.leg] as [number, number];
    const path = findPath(env.grid, walkerCell(w, env.tile), { x: tx, y: ty });
    if (!path) {
      // Étape inaccessible (passage fermé, PNJ en travers) : on passe à la suivante un peu plus tard.
      w.leg = (w.leg + 1) % w.def.route.length;
      w.retryMs = 1500;
      return;
    }
    w.route = path.slice(1);
    if (w.route.length === 0) {
      w.leg = (w.leg + 1) % w.def.route.length;
      w.pauseMs = env.pauseMs;
      return;
    }
  }
  let budget = (env.speed * dtMs) / 1000;
  while (budget > 0 && w.route.length > 0) {
    const target = cellFeet(w.route[0] as Cell, env.tile);
    const dx = target.x - w.x;
    const dy = target.y - w.y;
    const d = Math.hypot(dx, dy);
    // Le héros se tient sur la case suivante : l'errant patiente.
    if (Math.hypot(env.hero.x - target.x, env.hero.y - target.y) < env.tile * 0.7) {
      w.facing = facingFromVector(dx, dy) ?? w.facing;
      return;
    }
    if (d <= budget) {
      w.x = target.x;
      w.y = target.y;
      budget -= d;
      w.route.shift();
    } else {
      w.x += (dx / d) * budget;
      w.y += (dy / d) * budget;
      budget = 0;
    }
    if (d > 0.01) w.facing = facingFromVector(dx, dy) ?? w.facing;
    w.moving = true;
  }
  if (w.route.length === 0) {
    w.leg = (w.leg + 1) % w.def.route.length;
    w.pauseMs = env.pauseMs;
  }
}
