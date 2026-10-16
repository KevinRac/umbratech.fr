/**
 * Zones de niveau et lieux (GDD §3.4, §4.5, §8) : quelle zone, quel lieu sous
 * les pieds du héros, et quels changements depuis la dernière image.
 */
import type { ZoneDef } from '../../data/schemas';
import type { MapObject, WorldMap } from '../../data/worldMap';

export function zoneValueAtCell(map: WorldMap, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return 0;
  return map.zones[ty * map.width + tx] as number;
}

/** Terrain (`terrains.json`) sous une case de la carte, ou null hors carte. */
export function terrainAtCell(map: WorldMap, tx: number, ty: number): string | null {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return null;
  return map.terrainByGid.get(map.ground[ty * map.width + tx] as number) ?? null;
}

/** Lieu (rectangle de la couche `locations`) contenant un point en pixels, en préférant le plus petit. */
export function locationAtPoint(map: WorldMap, px: number, py: number): MapObject | null {
  let best: MapObject | null = null;
  for (const loc of map.locations) {
    if (px < loc.x || py < loc.y || px >= loc.x + loc.width || py >= loc.y + loc.height) continue;
    if (best === null || loc.width * loc.height < best.width * best.height) best = loc;
  }
  return best;
}

export interface ZoneUpdate {
  readonly zone: ZoneDef | null;
  readonly zoneChanged: boolean;
  /** Zone quittée quand `zoneChanged` (null au premier appel). */
  readonly previousZone: ZoneDef | null;
  readonly location: MapObject | null;
  readonly locationChanged: boolean;
}

/**
 * Suit la zone et le lieu du héros. Les recherches ne sont refaites que
 * lorsque le héros change de case.
 */
export class ZoneTracker {
  private readonly zoneByValue: ReadonlyMap<number, ZoneDef>;
  private cell = -1;
  private zone: ZoneDef | null = null;
  private location: MapObject | null = null;
  private started = false;

  constructor(
    private readonly map: WorldMap,
    zones: readonly ZoneDef[],
  ) {
    this.zoneByValue = new Map(zones.map((z) => [z.value, z]));
  }

  get currentZone(): ZoneDef | null {
    return this.zone;
  }

  get currentLocation(): MapObject | null {
    return this.location;
  }

  /** À appeler à chaque image avec la position des pieds (pixels). */
  update(px: number, py: number): ZoneUpdate {
    const tx = Math.floor(px / this.map.tileSize);
    const ty = Math.floor(py / this.map.tileSize);
    const cell = ty * this.map.width + tx;
    if (this.started && cell === this.cell) {
      return { zone: this.zone, zoneChanged: false, previousZone: this.zone, location: this.location, locationChanged: false };
    }

    const previousZone = this.zone;
    const nextZone = this.zoneByValue.get(zoneValueAtCell(this.map, tx, ty)) ?? null;
    const nextLocation = locationAtPoint(this.map, px, py);
    const zoneChanged = !this.started || nextZone?.id !== this.zone?.id;
    const locationChanged = !this.started ? nextLocation !== null : nextLocation?.id !== this.location?.id;

    this.started = true;
    this.cell = cell;
    this.zone = nextZone;
    this.location = nextLocation;
    return { zone: nextZone, zoneChanged, previousZone: zoneChanged ? previousZone : nextZone, location: nextLocation, locationChanged };
  }

  /** Oublie l'état (après une téléportation, pour re-déclencher les annonces). */
  reset(): void {
    this.started = false;
    this.cell = -1;
    this.zone = null;
    this.location = null;
  }
}
