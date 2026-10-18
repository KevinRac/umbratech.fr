/**
 * Progression du joueur dans le monde (jalon M2) : or, sac, réputations,
 * quêtes, recrues. Structure sérialisable telle quelle en JSON (sauvegarde M9).
 * Les drapeaux de progression restent dans `WorldState.openFlags`.
 */
import type { BalanceConfig, ReputationConfig } from '../../data/schemas';
import { TIER_IDS, type FactionDef, type LocationDef, type TierId } from '../../data/townSchemas';
import { applyReputationDecay, applyReputationDelta, getReputationTier } from '../reputation/reputation';

export interface ItemStack {
  item: string;
  qty: number;
}

export type QuestState = 'active' | 'done';

export interface Progress {
  gold: number;
  inventory: ItemStack[];
  /** Réputation par lieu (ayant des habitants) et par faction. */
  reputation: Record<string, number>;
  /** Cibles dont la réputation a bougé depuis la dernière visite (décroissance, décision n°10). */
  touched: string[];
  /** Jours de repos écoulés (les dons sont plafonnés par jour). */
  day: number;
  donated: Record<string, { day: number; total: number }>;
  quests: Record<string, QuestState>;
  /** Identifiants des recrues ayant rejoint la compagnie. */
  recruited: string[];
  /** Récompenses de progression déjà versées (`lieu:drapeau`). */
  rewarded: string[];
  /** Sujets « à écouter une seule fois » déjà entendus (`pnj#option`). */
  heard: string[];
  /** Ennemis du monde vaincus (jalon M3, décision n°74) : de quoi décider de leur réapparition. */
  foes: Record<string, FoeDefeat>;
  /** Temps de jeu en exploration (ms) : sert à la réapparition des errants. */
  clock: number;
  /** Nombre de changements de zone (les errants réapparaissent quand il augmente). */
  zoneVisits: number;
  /** Dernier village visité : on y revient après une défaite (décision n°56). */
  lastVillage: string | null;
}

/** Quand un ennemi du monde a été vaincu : jour de repos, temps de jeu et compteur de zones à ce moment-là. */
export interface FoeDefeat {
  day: number;
  clock: number;
  visits: number;
}

export interface RepChange {
  readonly target: string;
  readonly before: number;
  readonly after: number;
  readonly tierBefore: TierId;
  readonly tierAfter: TierId;
}

export interface ProgressSeed {
  readonly balance: BalanceConfig;
  readonly locations: readonly LocationDef[];
  readonly factions: readonly FactionDef[];
}

export function newProgress(seed: ProgressSeed): Progress {
  const reputation: Record<string, number> = {};
  for (const loc of seed.locations) if (loc.reputation) reputation[loc.id] = loc.reputation.start;
  for (const f of seed.factions) reputation[f.id] = f.start;
  const progress: Progress = {
    gold: seed.balance.economy.startingGold,
    inventory: [],
    reputation,
    touched: [],
    day: 1,
    donated: {},
    quests: {},
    recruited: [],
    rewarded: [],
    heard: [],
    foes: {},
    clock: 0,
    zoneVisits: 0,
    lastVillage: null,
  };
  for (const s of seed.balance.economy.startingItems) addItem(progress, s.item, s.qty, seed.balance);
  return progress;
}

/* ---------- Sac ---------- */

export function countItem(p: Progress, item: string): number {
  return p.inventory.reduce((n, s) => (s.item === item ? n + s.qty : n), 0);
}

/** Nombre d'unités de `item` qui tiendraient encore dans le sac. */
export function spaceFor(p: Progress, item: string, balance: BalanceConfig): number {
  const { maxStack, inventoryCapacity } = balance.economy;
  let room = 0;
  for (const s of p.inventory) if (s.item === item) room += maxStack - s.qty;
  room += (inventoryCapacity - p.inventory.length) * maxStack;
  return room;
}

/** Range `qty` objets dans le sac ; renvoie la quantité réellement rangée. */
export function addItem(p: Progress, item: string, qty: number, balance: BalanceConfig): number {
  const { maxStack, inventoryCapacity } = balance.economy;
  let left = qty;
  for (const s of p.inventory) {
    if (left <= 0) break;
    if (s.item !== item || s.qty >= maxStack) continue;
    const put = Math.min(left, maxStack - s.qty);
    s.qty += put;
    left -= put;
  }
  while (left > 0 && p.inventory.length < inventoryCapacity) {
    const put = Math.min(left, maxStack);
    p.inventory.push({ item, qty: put });
    left -= put;
  }
  return qty - left;
}

/** Retire `qty` objets ; faux (et rien de retiré) s'il n'y en a pas assez. */
export function removeItem(p: Progress, item: string, qty: number): boolean {
  if (countItem(p, item) < qty) return false;
  let left = qty;
  for (let i = p.inventory.length - 1; i >= 0 && left > 0; i--) {
    const s = p.inventory[i] as ItemStack;
    if (s.item !== item) continue;
    const take = Math.min(left, s.qty);
    s.qty -= take;
    left -= take;
    if (s.qty === 0) p.inventory.splice(i, 1);
  }
  return true;
}

/* ---------- Réputation ---------- */

export function reputationOf(p: Progress, target: string): number {
  return p.reputation[target] ?? 0;
}

export function tierIdOf(value: number, config: ReputationConfig): TierId {
  return getReputationTier(value, config).id as TierId;
}

export const tierRank = (id: TierId): number => TIER_IDS.indexOf(id);

export function changeReputation(p: Progress, target: string, delta: number, config: ReputationConfig): RepChange {
  const before = reputationOf(p, target);
  const after = applyReputationDelta(before, delta, config);
  p.reputation[target] = after;
  if (!p.touched.includes(target)) p.touched.push(target);
  return { target, before, after, tierBefore: tierIdOf(before, config), tierAfter: tierIdOf(after, config) };
}

/**
 * Entrée dans un lieu : si sa réputation n'a pas bougé depuis la dernière
 * visite, elle revient d'un pas vers ±seuil (GDD §6.3). Renvoie le changement.
 */
export function enterLocation(p: Progress, id: string, config: ReputationConfig): RepChange | null {
  if (p.reputation[id] === undefined) return null;
  const at = p.touched.indexOf(id);
  if (at >= 0) {
    p.touched.splice(at, 1);
    return null;
  }
  const before = p.reputation[id] as number;
  const after = applyReputationDecay(before, config);
  if (after === before) return null;
  p.reputation[id] = after;
  return { target: id, before, after, tierBefore: tierIdOf(before, config), tierAfter: tierIdOf(after, config) };
}
