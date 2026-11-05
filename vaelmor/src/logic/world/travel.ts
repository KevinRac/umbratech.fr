/**
 * Voyage rapide (GDD §4.8, décisions n°7 et n°234) : depuis un autel des
 * Lanternes ou un lieu habité, vers n'importe quel autel découvert ou lieu
 * habité déjà visité. Gratuit, refusé pendant une poursuite. Module pur.
 */
import { COLLISION, type MapObject, type WorldMap } from '../../data/worldMap';
import { findSpawn, objectCenter } from './worldState';
import { locationAtPoint } from './zones';

/** Genres de lieux d'où l'on part et où l'on arrive. */
export const TRAVEL_KINDS: readonly string[] = ['autel', 'village', 'ville'];

export interface TravelPoint {
  /** Identifiant du lieu (`props.id`). */
  readonly id: string;
  readonly name: string;
  readonly kind: 'autel' | 'village' | 'ville';
  /** Pieds du héros à l'arrivée (pixels). */
  readonly x: number;
  readonly y: number;
}

const idOf = (loc: MapObject): string => String(loc.props['id']);

/** Lieu de départ possible sous les pieds du héros (autel, village, ville), ou null. */
export function travelOrigin(map: WorldMap, px: number, py: number): MapObject | null {
  const loc = locationAtPoint(map, px, py);
  return loc && TRAVEL_KINDS.includes(loc.kind) ? loc : null;
}

/**
 * Point d'arrivée d'un lieu : le point d'apparition de l'autel (`altar_<nom>` pour
 * `autel_<nom>`), sinon la case libre la plus proche du centre du lieu (pas sous un toit).
 */
export function arrivalPoint(map: WorldMap, loc: MapObject): { x: number; y: number } | null {
  if (loc.kind === 'autel') {
    const spawn = findSpawn(map, idOf(loc).replace(/^autel_/, 'altar_'));
    if (spawn) return spawn;
  }
  const t = map.tileSize;
  const center = objectCenter(loc);
  const cx = Math.floor(center.x / t);
  const cy = Math.floor(center.y / t);
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let dy = -12; dy <= 12; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      if (map.collision[y * map.width + x] !== COLLISION.free) continue;
      // La case au-dessus doit aussi être libre : le héros (16×28) ne naît pas collé à un mur.
      if (y > 0 && map.collision[(y - 1) * map.width + x] !== COLLISION.free) continue;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = { x: x * t + t / 2, y: (y + 1) * t - 1 };
      }
    }
  }
  return best;
}

/** Destinations ouvertes : lieux habités visités, puis autels découverts, dans l'ordre de la carte ; sans le lieu de départ. */
export function travelPoints(map: WorldMap, discovered: readonly string[], fromId: string | null = null): TravelPoint[] {
  const seen = new Set(discovered);
  const points: TravelPoint[] = [];
  for (const group of [['ville', 'village'], ['autel']]) {
    for (const loc of map.locations) {
      if (!group.includes(loc.kind) || !seen.has(idOf(loc)) || idOf(loc) === fromId) continue;
      const at = arrivalPoint(map, loc);
      if (at) points.push({ id: idOf(loc), name: loc.name, kind: loc.kind as TravelPoint['kind'], x: at.x, y: at.y });
    }
  }
  return points;
}

export type TravelCheck = { readonly ok: true; readonly from: MapObject } | { readonly ok: false; readonly reason: string };

/** Le héros peut-il voyager d'ici ? (autel ou lieu habité, sans poursuite en cours.) */
export function canTravel(map: WorldMap, px: number, py: number, chased: boolean): TravelCheck {
  const from = travelOrigin(map, px, py);
  if (!from) return { ok: false, reason: 'On voyage depuis un autel des Lanternes ou un lieu habité.' };
  if (chased) return { ok: false, reason: 'Impossible de voyager : un ennemi te poursuit.' };
  return { ok: true, from };
}
