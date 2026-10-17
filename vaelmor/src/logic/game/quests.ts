/** Quêtes (GDD §6.4) : statut calculé en direct à partir des drapeaux et des lieux découverts. */
import type { QuestDef, QuestStatus, QuestStep } from '../../data/townSchemas';
import { tierAt, type GameCtx, type Notice } from './context';
import { applyEffects, giveGold, giveItem, giveRep } from './effects';
import { tierRank } from './progress';

export function stepDone(ctx: GameCtx, step: QuestStep): boolean {
  return step.kind === 'flag' ? ctx.flags.includes(step.flag) : ctx.discovered.includes(step.location);
}

export function questSteps(ctx: GameCtx, quest: QuestDef): { step: QuestStep; done: boolean }[] {
  return quest.steps.map((step) => ({ step, done: stepDone(ctx, step) }));
}

export function questStatus(ctx: GameCtx, id: string): QuestStatus {
  const quest = ctx.index.quests.get(id);
  const state = ctx.progress.quests[id];
  if (!quest || state === undefined) return 'available';
  if (state === 'done') return 'done';
  return quest.steps.every((s) => stepDone(ctx, s)) ? 'ready' : 'active';
}

/** Lieu où vit le donneur de la quête. */
export function questLocation(ctx: GameCtx, quest: QuestDef): string | null {
  return ctx.index.npcs.get(quest.giver)?.location.id ?? null;
}

/** Réputation suffisante pour recevoir la quête (étoile du GDD §6.4). */
export function questTierOk(ctx: GameCtx, quest: QuestDef): boolean {
  if (!quest.minTier) return true;
  const loc = questLocation(ctx, quest);
  return loc === null || tierRank(tierAt(ctx, loc)) >= tierRank(quest.minTier);
}

export function acceptQuest(ctx: GameCtx, id: string): Notice[] {
  if (questStatus(ctx, id) !== 'available') return [];
  ctx.progress.quests[id] = 'active';
  return [{ kind: 'quest', quest: id, event: 'accepted' }];
}

export function refuseQuest(ctx: GameCtx, id: string): Notice[] {
  const quest = ctx.index.quests.get(id);
  const notices: Notice[] = [];
  if (quest?.refusalPenalty) giveRep(ctx, quest.refusalPenalty.target, quest.refusalPenalty.delta, notices);
  return notices;
}

/** Remise de la quête : or, réputation, objets et drapeaux de récompense. */
export function completeQuest(ctx: GameCtx, id: string): Notice[] {
  const quest = ctx.index.quests.get(id);
  if (!quest || questStatus(ctx, id) !== 'ready') return [];
  ctx.progress.quests[id] = 'done';
  const notices: Notice[] = [{ kind: 'quest', quest: id, event: 'completed' }];
  const r = quest.reward;
  if (r.gold) giveGold(ctx, r.gold, notices);
  for (const rep of r.rep) giveRep(ctx, rep.target, rep.delta, notices);
  for (const it of r.items ?? []) giveItem(ctx, it.item, it.qty, notices);
  applyEffects(ctx, (r.flags ?? []).map((flag) => ({ type: 'flag' as const, flag })), notices);
  return notices;
}

/** Quêtes prêtes à être rendues qui viennent de le devenir (pour la notification « objectif atteint »). */
export function newlyReady(ctx: GameCtx, announced: Set<string>): Notice[] {
  const out: Notice[] = [];
  for (const id of Object.keys(ctx.progress.quests)) {
    if (questStatus(ctx, id) === 'ready' && !announced.has(id)) {
      announced.add(id);
      out.push({ kind: 'quest', quest: id, event: 'ready' });
    }
  }
  return out;
}
