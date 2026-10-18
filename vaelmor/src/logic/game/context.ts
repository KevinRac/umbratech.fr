/**
 * Contexte de jeu pour les règles de village : données indexées + état vivant.
 * Les fonctions de `logic/game` prennent un `GameCtx` et le modifient en place
 * (l'état appartient à la partie, pas aux scènes).
 */
import type { GameData } from '../../data/validate';
import type { LocationDef, NpcDef, QuestDef, ShopDef, TierId } from '../../data/townSchemas';
import { buildCatalog, type ItemInfo } from './catalog';
import { reputationOf, tierIdOf, type Progress } from './progress';

export interface TownIndex {
  readonly locations: ReadonlyMap<string, LocationDef>;
  readonly npcs: ReadonlyMap<string, { readonly npc: NpcDef; readonly location: LocationDef }>;
  readonly shops: ReadonlyMap<string, { readonly shop: ShopDef; readonly location: LocationDef }>;
  readonly quests: ReadonlyMap<string, QuestDef>;
  readonly catalog: ReadonlyMap<string, ItemInfo>;
}

/**
 * Lieu fictif des alliés errants (jalon M5) : ils parlent comme des PNJ (même
 * format de dialogue) mais n'appartiennent à aucun village (réputation neutre).
 */
export const ROADS_LOCATION_ID = 'routes';

export function buildTownIndex(data: GameData): TownIndex {
  const npcs = new Map<string, { npc: NpcDef; location: LocationDef }>();
  const shops = new Map<string, { shop: ShopDef; location: LocationDef }>();
  for (const location of data.locations) {
    for (const npc of location.npcs) npcs.set(npc.id, { npc, location });
    for (const shop of location.shops) shops.set(shop.id, { shop, location });
  }
  const roads: LocationDef = { id: ROADS_LOCATION_ID, name: 'Sur les routes', summary: 'Alliés errants qui parcourent l’île.', reputation: null, npcs: [...data.wanderers], shops: [], rewards: [] };
  for (const npc of data.wanderers) npcs.set(npc.id, { npc, location: roads });
  return {
    locations: new Map(data.locations.map((l) => [l.id, l])),
    npcs,
    shops,
    quests: new Map(data.quests.map((q) => [q.id, q])),
    catalog: buildCatalog(data),
  };
}

export interface GameCtx {
  readonly data: GameData;
  readonly index: TownIndex;
  readonly progress: Progress;
  /** Drapeaux de progression (`WorldState.openFlags`). */
  readonly flags: string[];
  /** Lieux découverts (`WorldState.discoveredLocations`). */
  readonly discovered: readonly string[];
}

/** Palier de réputation d'un lieu (neutre pour un lieu sans réputation). */
export function tierAt(ctx: GameCtx, locationId: string): TierId {
  if (ctx.progress.reputation[locationId] === undefined) return 'neutre';
  return tierIdOf(reputationOf(ctx.progress, locationId), ctx.data.reputation);
}

/** Notifications produites par les règles ; les scènes les mettent en forme. */
export type Notice =
  | { readonly kind: 'rep'; readonly target: string; readonly delta: number; readonly after: number; readonly tierChanged: TierId | null }
  | { readonly kind: 'gold'; readonly amount: number }
  | { readonly kind: 'item'; readonly item: string; readonly qty: number; readonly lost: number }
  | { readonly kind: 'quest'; readonly quest: string; readonly event: 'accepted' | 'completed' | 'ready' | 'refused' }
  | { readonly kind: 'recruit'; readonly name: string }
  | { readonly kind: 'day'; readonly day: number }
  | { readonly kind: 'reward'; readonly text: string };
