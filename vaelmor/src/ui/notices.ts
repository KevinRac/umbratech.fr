/**
 * Mise en forme des notifications produites par les règles (`logic/game`) :
 * un message court par événement, en français.
 */
import type { GameCtx, Notice } from '../logic/game';

const signed = (n: number): string => (n > 0 ? `+${n}` : `-${Math.abs(n)}`);

/** Nom affiché d'une cible de réputation : un lieu ou une faction. */
export function reputationName(ctx: GameCtx, target: string): string {
  return ctx.data.factions.find((f) => f.id === target)?.name ?? ctx.index.locations.get(target)?.name ?? target;
}

export function tierName(ctx: GameCtx, id: string): string {
  return ctx.data.reputation.tiers.find((t) => t.id === id)?.name ?? id;
}

export function formatNotice(ctx: GameCtx, notice: Notice): string {
  switch (notice.kind) {
    case 'rep': {
      const base = `${reputationName(ctx, notice.target)} ${signed(notice.delta)}`;
      return notice.tierChanged ? `${base} · ${tierName(ctx, notice.tierChanged)}` : base;
    }
    case 'gold':
      return `${signed(notice.amount)} or`;
    case 'item': {
      const name = ctx.index.catalog.get(notice.item)?.name ?? notice.item;
      if (notice.qty < 0) return `${name} vendu`;
      if (notice.lost > 0 && notice.qty === 0) return `Sac plein : ${name} perdu`;
      return notice.qty > 1 ? `${name} ×${notice.qty}` : `${name} obtenu`;
    }
    case 'quest': {
      const name = ctx.index.quests.get(notice.quest)?.name ?? notice.quest;
      switch (notice.event) {
        case 'accepted':
          return `Quête acceptée : ${name}`;
        case 'completed':
          return `Quête terminée : ${name}`;
        case 'ready':
          return `Objectif atteint : ${name}`;
        case 'refused':
          return `Quête refusée : ${name}`;
      }
      return name;
    }
    case 'recruit':
      return `${notice.name} rejoint la compagnie`;
    case 'day':
      return `Jour ${notice.day}`;
    case 'reward':
      return notice.text;
  }
}

export const formatNotices = (ctx: GameCtx, notices: readonly Notice[]): string[] => notices.map((n) => formatNotice(ctx, n));
