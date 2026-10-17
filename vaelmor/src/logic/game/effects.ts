/** Application des effets de données (réputation, drapeau, or, objet) et des récompenses de progression. */
import type { Effect } from '../../data/townSchemas';
import type { GameCtx, Notice } from './context';
import { addItem, changeReputation, type RepChange } from './progress';

export function repNotice(change: RepChange): Notice | null {
  const delta = change.after - change.before;
  if (delta === 0) return null;
  return {
    kind: 'rep',
    target: change.target,
    delta,
    after: change.after,
    tierChanged: change.tierAfter !== change.tierBefore ? change.tierAfter : null,
  };
}

export function giveGold(ctx: GameCtx, amount: number, notices: Notice[]): void {
  const before = ctx.progress.gold;
  ctx.progress.gold = Math.max(0, before + amount);
  if (ctx.progress.gold !== before) notices.push({ kind: 'gold', amount: ctx.progress.gold - before });
}

export function giveItem(ctx: GameCtx, item: string, qty: number, notices: Notice[]): void {
  const put = addItem(ctx.progress, item, qty, ctx.data.balance);
  notices.push({ kind: 'item', item, qty: put, lost: qty - put });
}

export function giveRep(ctx: GameCtx, target: string, delta: number, notices: Notice[]): void {
  const notice = repNotice(changeReputation(ctx.progress, target, delta, ctx.data.reputation));
  if (notice) notices.push(notice);
}

export function applyEffects(ctx: GameCtx, effects: readonly Effect[] | undefined, notices: Notice[]): void {
  for (const e of effects ?? []) {
    switch (e.type) {
      case 'rep':
        giveRep(ctx, e.target, e.delta, notices);
        break;
      case 'flag':
        if (!ctx.flags.includes(e.flag)) ctx.flags.push(e.flag);
        break;
      case 'gold':
        giveGold(ctx, e.amount, notices);
        break;
      case 'item':
        giveItem(ctx, e.item, e.qty, notices);
        break;
    }
  }
}

/**
 * Récompenses de progression : quand un drapeau de boss ou de camp est levé,
 * les lieux concernés versent leur récompense, une seule fois.
 */
export function collectFlagRewards(ctx: GameCtx): Notice[] {
  const notices: Notice[] = [];
  for (const location of ctx.data.locations) {
    for (const reward of location.rewards) {
      const key = `${location.id}:${reward.flag}`;
      if (!ctx.flags.includes(reward.flag) || ctx.progress.rewarded.includes(key)) continue;
      ctx.progress.rewarded.push(key);
      notices.push({ kind: 'reward', text: reward.text });
      applyEffects(ctx, reward.effects, notices);
    }
  }
  return notices;
}
