/**
 * Fins de l'histoire (jalon M7, décision n°196, bible §4) : quand le combat qui
 * lève le drapeau final (Orvane) est gagné, une fin est choisie d'après l'état
 * de la partie — réputations et unité déployée encore debout — et son drapeau
 * `fin_*` est levé. Le jeu reste jouable ensuite ; Orvane ne revient pas.
 *
 * Module pur : ni DOM ni Phaser.
 */
import type { EndingDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { tierRank } from './progress';
import { tierAt, type GameCtx } from './context';

export interface EndingInput {
  /** Drapeaux levés par la victoire qui vient d'être réglée. */
  readonly victoryFlags: readonly string[];
  /** Personnages de la compagnie déployés et debout à la fin du combat. */
  readonly aliveDeployed: readonly string[];
}

/** Le combat qui vient d'être gagné est-il celui du boss final ? */
export function isFinalVictory(data: GameData, victoryFlags: readonly string[]): boolean {
  return victoryFlags.includes(data.endings.finalFlag);
}

/** La fin obtenue d'après l'état de la partie : la première dont les conditions tiennent, sinon la dernière. */
export function chooseEnding(ctx: GameCtx, aliveDeployed: readonly string[]): EndingDef {
  const { endings } = ctx.data.endings;
  for (const ending of endings) {
    if (ending.when === undefined) return ending;
    const reps = (ending.when.rep ?? []).every((r) => {
      const tier = tierRank(tierAt(ctx, r.target));
      if (r.tierMin !== undefined && tier < tierRank(r.tierMin)) return false;
      if (r.tierMax !== undefined && tier > tierRank(r.tierMax)) return false;
      return true;
    });
    const alive = ending.when.aliveDeployed === undefined || aliveDeployed.includes(ending.when.aliveDeployed);
    if (reps && alive) return ending;
  }
  return endings[endings.length - 1] as EndingDef;
}

/** Fin déjà obtenue dans la partie (son drapeau est levé), ou null. */
export function endingReached(data: GameData, flags: readonly string[]): EndingDef | null {
  return data.endings.endings.find((e) => flags.includes(e.flag)) ?? null;
}

/**
 * Règle la fin d'une victoire : si c'est celle du boss final et qu'aucune fin
 * n'a encore été obtenue, choisit la fin, lève son drapeau et la renvoie.
 */
export function settleEnding(ctx: GameCtx, input: EndingInput): EndingDef | null {
  if (!isFinalVictory(ctx.data, input.victoryFlags) || endingReached(ctx.data, ctx.flags)) return null;
  const ending = chooseEnding(ctx, input.aliveDeployed);
  if (!ctx.flags.includes(ending.flag)) ctx.flags.push(ending.flag);
  return ending;
}
