/**
 * Repères de la carte de l'île (jalon M10, décision n°233) : lieux visités,
 * repaires des boss (vaincus ou non) et quêtes en cours, par village. Module pur.
 */
import type { ZoneDef } from '../../data/schemas';
import type { WorldMap } from '../../data/worldMap';
import { objectCenter } from './worldState';
import { zoneValueAtCell } from './zones';

export type MarkerKind = 'village' | 'ville' | 'autel' | 'donjon' | 'camp' | 'poi';

export interface IslandMarker {
  readonly id: string;
  readonly name: string;
  readonly kind: MarkerKind;
  /** Case du monde (centre du lieu). */
  readonly tx: number;
  readonly ty: number;
  /** Repaire d'un boss déjà vaincu. */
  readonly cleared: boolean;
  /** Une quête donnée ici est en cours (`active`) ou à rendre (`ready`). */
  readonly quest: 'active' | 'ready' | null;
}

export interface MarkerContext {
  readonly discovered: readonly string[];
  readonly flags: readonly string[];
  /** Lieu du donneur de chaque quête non terminée, avec son état. */
  readonly quests: readonly { readonly location: string; readonly status: 'active' | 'ready' }[];
}

const KINDS: readonly string[] = ['village', 'ville', 'autel', 'donjon', 'camp', 'poi'];

/** Vrai si le boss de la zone `value` est vaincu : le passage vers la zone suivante est ouvert (ou une fin est jouée, pour la dernière). */
export function zoneBossCleared(zones: readonly ZoneDef[], value: number, flags: readonly string[]): boolean {
  const next = zones.find((z) => z.value === value + 1);
  if (next?.unlockFlag) return flags.includes(next.unlockFlag);
  return flags.some((f) => f.startsWith('fin_'));
}

export function islandMarkers(map: WorldMap, zones: readonly ZoneDef[], ctx: MarkerContext): IslandMarker[] {
  const seen = new Set(ctx.discovered);
  const markers: IslandMarker[] = [];
  for (const loc of map.locations) {
    const id = String(loc.props['id']);
    if (!seen.has(id) || !KINDS.includes(loc.kind)) continue;
    const c = objectCenter(loc);
    const tx = Math.floor(c.x / map.tileSize);
    const ty = Math.floor(c.y / map.tileSize);
    const lair = loc.kind === 'camp' || loc.kind === 'donjon';
    const quests = ctx.quests.filter((q) => q.location === id);
    const quest = quests.some((q) => q.status === 'ready') ? 'ready' : quests.length > 0 ? 'active' : null;
    markers.push({ id, name: loc.name, kind: loc.kind as MarkerKind, tx, ty, cleared: lair && zoneBossCleared(zones, zoneValueAtCell(map, tx, ty), ctx.flags), quest });
  }
  return markers;
}
