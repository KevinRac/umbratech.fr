/**
 * Déplacement du héros en monde ouvert (GDD §4.2, §4.4).
 *
 * - 8 directions, vitesse normalisée en diagonale.
 * - Accélération douce (balance.json : accelerationMs) au départ comme à l'arrêt.
 * - Boîte de collision aux pieds (10×8 px), résolue axe par axe en petits pas :
 *   on glisse le long des murs et on s'arrête exactement contre eux.
 * - Aide dans les angles : un coin de tuile touché sur moins de `cornerAssist`
 *   pixels est contourné au lieu de bloquer (évite les collisions « collantes »).
 *
 * `stepBody` modifie l'état passé en paramètre (boucle de jeu sans allocation).
 */
import type { BalanceConfig } from '../../data/schemas';
import type { CollisionGrid } from './collision';

export type Facing8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface BodyState {
  /** Position des pieds (centre bas de la boîte de collision), en pixels. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing8;
  /** Vrai si le joueur a donné une direction pendant la dernière image. */
  intent: boolean;
  /** Vrai si le corps s'est réellement déplacé pendant la dernière image. */
  moved: boolean;
  sprinting: boolean;
  onSlowZone: boolean;
  /** Drapeau du passage verrouillé heurté pendant la dernière image (sinon null). */
  bumpedGate: string | null;
}

export interface MoveInput {
  /** -1, 0 ou 1. */
  readonly dx: number;
  readonly dy: number;
  readonly sprint: boolean;
}

export type MovementConfig = Pick<
  BalanceConfig['exploration'],
  'walkSpeed' | 'sprintSpeed' | 'accelerationMs' | 'slowZoneMultiplier' | 'hitboxWidth' | 'hitboxHeight' | 'cornerAssist'
>;

/** Plus grand pas de simulation (px) : plus petit que la plus fine des collisions. */
const MAX_SUBSTEP = 2;
/** Durée d'image maximale prise en compte (onglet en arrière-plan, pic de charge). */
export const MAX_FRAME_SECONDS = 0.05;
const EPSILON = 1e-3;

export function createBody(x: number, y: number, facing: Facing8 = 's'): BodyState {
  return { x, y, vx: 0, vy: 0, facing, intent: false, moved: false, sprinting: false, onSlowZone: false, bumpedGate: null };
}

/** Direction (8 sens) d'un vecteur ; null si le vecteur est nul. */
export function facingFromVector(dx: number, dy: number): Facing8 | null {
  if (dx === 0 && dy === 0) return null;
  const v = dy < 0 ? 'n' : dy > 0 ? 's' : '';
  const h = dx > 0 ? 'e' : dx < 0 ? 'w' : '';
  return `${v}${h}` as Facing8;
}

/** Pose du sprite (3 poses, la gauche étant la droite retournée) pour une direction. */
export function spritePose(facing: Facing8): { pose: 'up' | 'down' | 'side'; flipX: boolean } {
  switch (facing) {
    case 'n':
      return { pose: 'up', flipX: false };
    case 's':
      return { pose: 'down', flipX: false };
    case 'e':
    case 'ne':
    case 'se':
      return { pose: 'side', flipX: false };
    default:
      return { pose: 'side', flipX: true };
  }
}

/** Coin haut-gauche de la boîte de collision pour une position de pieds. */
function boxLeft(x: number, config: MovementConfig): number {
  return x - config.hitboxWidth / 2;
}
function boxTop(y: number, config: MovementConfig): number {
  return y - config.hitboxHeight;
}

/** Boîte libre à la position (x, y) ? */
export function isFreeAt(grid: CollisionGrid, x: number, y: number, config: MovementConfig): boolean {
  return !grid.isSolidRect(boxLeft(x, config), boxTop(y, config), config.hitboxWidth, config.hitboxHeight);
}

/**
 * Avance sur un axe. `delta` est petit (≤ MAX_SUBSTEP). Si la boîte heurte un
 * mur, elle se colle exactement à lui ; dans un angle, elle est décalée.
 * Renvoie la distance réellement parcourue sur l'axe.
 */
function moveAxis(body: BodyState, axis: 'x' | 'y', delta: number, grid: CollisionGrid, config: MovementConfig): number {
  if (delta === 0) return 0;
  const t = grid.tileSize;
  const w = config.hitboxWidth;
  const h = config.hitboxHeight;
  const nx = axis === 'x' ? body.x + delta : body.x;
  const ny = axis === 'y' ? body.y + delta : body.y;

  if (isFreeAt(grid, nx, ny, config)) {
    if (axis === 'x') body.x = nx;
    else body.y = ny;
    return delta;
  }

  const gate = grid.closedGateInRect(boxLeft(nx, config), boxTop(ny, config), w, h);
  if (gate !== null) body.bumpedGate = gate;

  // Aide dans les angles : on cherche le plus petit décalage perpendiculaire qui libère le passage.
  if (config.cornerAssist > 0 && tryCornerSlide(body, axis, delta, grid, config)) return delta;

  // Collage exact au mur : le bord avant de la boîte se pose sur la limite de la tuile.
  if (axis === 'x') {
    const edge = delta > 0 ? body.x + w / 2 : body.x - w / 2;
    const target = delta > 0 ? Math.floor((edge + delta) / t) * t - EPSILON : (Math.floor((edge + delta) / t) + 1) * t + EPSILON;
    const snapped = delta > 0 ? target - w / 2 : target + w / 2;
    if ((delta > 0 && snapped > body.x) || (delta < 0 && snapped < body.x)) {
      if (isFreeAt(grid, snapped, body.y, config)) {
        const travelled = snapped - body.x;
        body.x = snapped;
        return travelled;
      }
    }
  } else {
    const edge = delta > 0 ? body.y : body.y - h;
    const target = delta > 0 ? Math.floor((edge + delta) / t) * t - EPSILON : (Math.floor((edge + delta) / t) + 1) * t + EPSILON;
    const snapped = delta > 0 ? target : target + h;
    if ((delta > 0 && snapped > body.y) || (delta < 0 && snapped < body.y)) {
      if (isFreeAt(grid, body.x, snapped, config)) {
        const travelled = snapped - body.y;
        body.y = snapped;
        return travelled;
      }
    }
  }
  return 0;
}

/**
 * Contournement d'un coin : si le déplacement serait libre après un décalage
 * perpendiculaire d'au plus `cornerAssist` pixels (du seul côté qui l'est),
 * on glisse dans ce sens à la vitesse du pas courant.
 */
function tryCornerSlide(body: BodyState, axis: 'x' | 'y', delta: number, grid: CollisionGrid, config: MovementConfig): boolean {
  const step = Math.abs(delta);
  let best: { offset: number; sign: 1 | -1 } | null = null;
  let tie = false;
  for (let offset = 1; offset <= config.cornerAssist; offset++) {
    const plus = axis === 'x' ? isFreeAt(grid, body.x + delta, body.y + offset, config) : isFreeAt(grid, body.x + offset, body.y + delta, config);
    const minus = axis === 'x' ? isFreeAt(grid, body.x + delta, body.y - offset, config) : isFreeAt(grid, body.x - offset, body.y + delta, config);
    if (plus || minus) {
      if (plus && minus) tie = true;
      else best = { offset, sign: plus ? 1 : -1 };
      break;
    }
  }
  if (tie || best === null) return false;

  const slide = Math.min(step, best.offset) * best.sign;
  const sx = axis === 'x' ? body.x : body.x + slide;
  const sy = axis === 'x' ? body.y + slide : body.y;
  if (!isFreeAt(grid, sx, sy, config)) return false;
  body.x = sx;
  body.y = sy;
  return true;
}

/**
 * Fait avancer le corps d'une image de `dt` secondes. Renvoie le même objet
 * (modifié) pour permettre le chaînage.
 */
export function stepBody(body: BodyState, input: MoveInput, dtRaw: number, grid: CollisionGrid, config: MovementConfig): BodyState {
  const dt = Math.min(Math.max(dtRaw, 0), MAX_FRAME_SECONDS);
  body.bumpedGate = null;
  body.onSlowZone = grid.isSlowAt(body.x, body.y - config.hitboxHeight / 2);

  const length = Math.hypot(input.dx, input.dy);
  body.intent = length > 0;
  body.sprinting = body.intent && input.sprint;

  const maxSpeed = (body.sprinting ? config.sprintSpeed : config.walkSpeed) * (body.onSlowZone ? config.slowZoneMultiplier : 1);
  const targetX = length > 0 ? (input.dx / length) * maxSpeed : 0;
  const targetY = length > 0 ? (input.dy / length) * maxSpeed : 0;

  // Accélération : on rejoint la vitesse visée en `accelerationMs`, quelle que soit la vitesse.
  const accelSeconds = Math.max(config.accelerationMs, 1) / 1000;
  const maxChange = (config.sprintSpeed / accelSeconds) * dt;
  const dvx = targetX - body.vx;
  const dvy = targetY - body.vy;
  const dv = Math.hypot(dvx, dvy);
  if (dv <= maxChange || dv === 0) {
    body.vx = targetX;
    body.vy = targetY;
  } else {
    body.vx += (dvx / dv) * maxChange;
    body.vy += (dvy / dv) * maxChange;
  }

  if (length > 0) {
    const facing = facingFromVector(input.dx, input.dy);
    if (facing) body.facing = facing;
  }

  // Déplacement en petits pas, axe X puis axe Y : on glisse le long des murs.
  const startX = body.x;
  const startY = body.y;
  const totalX = body.vx * dt;
  const totalY = body.vy * dt;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(totalX), Math.abs(totalY)) / MAX_SUBSTEP));
  const stepX = totalX / steps;
  const stepY = totalY / steps;
  for (let i = 0; i < steps; i++) {
    if (stepX !== 0 && moveAxis(body, 'x', stepX, grid, config) === 0) body.vx = 0;
    if (stepY !== 0 && moveAxis(body, 'y', stepY, grid, config) === 0) body.vy = 0;
  }

  body.moved = Math.hypot(body.x - startX, body.y - startY) > 1e-4;
  return body;
}

/** Place le corps à une position et annule sa vitesse (téléportation, chargement). */
export function placeBodyAt(body: BodyState, x: number, y: number): BodyState {
  body.x = x;
  body.y = y;
  body.vx = 0;
  body.vy = 0;
  body.moved = false;
  body.bumpedGate = null;
  return body;
}
