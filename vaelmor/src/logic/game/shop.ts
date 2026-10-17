/** Boutiques : stock visible selon la réputation, achat, vente (GDD §6.2 et §6.4). */
import { tierAt, type GameCtx, type Notice } from './context';
import { giveGold, giveItem } from './effects';
import { countItem, removeItem, reputationOf, spaceFor, tierRank } from './progress';
import { buyPrice, sellPrice } from '../reputation/reputation';
import type { ItemInfo } from './catalog';
import type { TierId } from '../../data/townSchemas';
import { pickLines } from './dialogue';

export interface ShopEntry {
  readonly info: ItemInfo;
  /** Prix payé, avec le multiplicateur du palier. */
  readonly price: number;
  readonly owned: number;
}

export interface SellEntry {
  readonly info: ItemInfo;
  readonly qty: number;
  readonly price: number;
}

export type TradeResult =
  | { readonly ok: true; readonly notices: Notice[] }
  | { readonly ok: false; readonly reason: 'refus' | 'or' | 'sac' | 'stock' | 'inconnu' };

function shopContext(ctx: GameCtx, shopId: string) {
  const found = ctx.index.shops.get(shopId);
  if (!found) return null;
  const rep = reputationOf(ctx.progress, found.location.id);
  const tier = tierAt(ctx, found.location.id);
  const refuses = ctx.data.reputation.tiers.find((t) => t.id === tier)?.refusesTrade === true;
  return { ...found, rep, tier, refuses };
}

export function shopTier(ctx: GameCtx, shopId: string): TierId {
  const s = shopContext(ctx, shopId);
  return s ? s.tier : 'neutre';
}

export function shopRefuses(ctx: GameCtx, shopId: string): boolean {
  return shopContext(ctx, shopId)?.refuses ?? true;
}

export function shopGreeting(ctx: GameCtx, shopId: string): string[] {
  const s = shopContext(ctx, shopId);
  if (!s) return [];
  return pickLines(s.refuses ? s.shop.refusal : s.shop.welcome, s.tier);
}

/** Objets en vente : ceux dont le palier minimal est atteint. */
export function shopStock(ctx: GameCtx, shopId: string): ShopEntry[] {
  const s = shopContext(ctx, shopId);
  if (!s || s.refuses) return [];
  const out: ShopEntry[] = [];
  for (const entry of s.shop.stock) {
    if (entry.minTier && tierRank(s.tier) < tierRank(entry.minTier)) continue;
    const info = ctx.index.catalog.get(entry.item);
    if (!info || info.price === null) continue;
    out.push({ info, price: buyPrice(info.price, s.rep, ctx.data.reputation), owned: countItem(ctx.progress, info.id) });
  }
  return out;
}

/** Objets rares masqués faute de réputation (pour l'indice « revenez quand vous serez connu »). */
export function shopLockedCount(ctx: GameCtx, shopId: string): number {
  const s = shopContext(ctx, shopId);
  if (!s || s.refuses) return 0;
  return s.shop.stock.filter((e) => e.minTier && tierRank(s.tier) < tierRank(e.minTier)).length;
}

export function buy(ctx: GameCtx, shopId: string, item: string, qty = 1): TradeResult {
  const s = shopContext(ctx, shopId);
  if (!s) return { ok: false, reason: 'inconnu' };
  if (s.refuses) return { ok: false, reason: 'refus' };
  const entry = shopStock(ctx, shopId).find((e) => e.info.id === item);
  if (!entry) return { ok: false, reason: 'stock' };
  const total = entry.price * qty;
  if (ctx.progress.gold < total) return { ok: false, reason: 'or' };
  if (spaceFor(ctx.progress, item, ctx.data.balance) < qty) return { ok: false, reason: 'sac' };
  const notices: Notice[] = [];
  giveGold(ctx, -total, notices);
  giveItem(ctx, item, qty, notices);
  return { ok: true, notices };
}

/** Objets du sac que ce marchand rachète (revente fixe à 40 %, indépendante de la réputation). */
export function sellable(ctx: GameCtx): SellEntry[] {
  const out: SellEntry[] = [];
  const seen = new Set<string>();
  for (const stack of ctx.progress.inventory) {
    if (seen.has(stack.item)) continue;
    seen.add(stack.item);
    const info = ctx.index.catalog.get(stack.item);
    if (!info || info.price === null) continue;
    out.push({ info, qty: countItem(ctx.progress, stack.item), price: sellPrice(info.price, ctx.data.reputation) });
  }
  return out;
}

export function sell(ctx: GameCtx, shopId: string, item: string, qty = 1): TradeResult {
  const s = shopContext(ctx, shopId);
  if (!s) return { ok: false, reason: 'inconnu' };
  if (s.refuses) return { ok: false, reason: 'refus' };
  const entry = sellable(ctx).find((e) => e.info.id === item);
  if (!entry || entry.qty < qty) return { ok: false, reason: 'stock' };
  const notices: Notice[] = [];
  removeItem(ctx.progress, item, qty);
  giveGold(ctx, entry.price * qty, notices);
  notices.push({ kind: 'item', item, qty: -qty, lost: 0 });
  return { ok: true, notices };
}
