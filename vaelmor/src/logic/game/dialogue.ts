/**
 * Dialogues des PNJ : paroles selon le palier, options disponibles, effets.
 * Pure logique : la scène affiche les pages et le menu que cette couche calcule.
 */
import {
  TIER_IDS,
  type Condition,
  type Expression,
  type Lines,
  type NpcDef,
  type NpcOption,
  type TierId,
} from '../../data/townSchemas';
import { tierAt, type GameCtx, type Notice } from './context';
import { applyEffects, giveGold, giveRep } from './effects';
import { acceptQuest, completeQuest, questStatus, questTierOk, refuseQuest } from './quests';
import { tierRank } from './progress';

const NEUTRAL = tierRank('neutre');

/** Paroles pour un palier ; un palier absent retombe vers le plus proche du « neutre ». */
export function pickLines(lines: Lines, tier: TierId): string[] {
  if (Array.isArray(lines)) return lines;
  const at = tierRank(tier);
  const toward = at < NEUTRAL ? 1 : -1;
  for (let d = 0; d < TIER_IDS.length; d++) {
    for (const idx of [at + toward * d, at - toward * d]) {
      const id = TIER_IDS[idx];
      const found = id === undefined ? undefined : lines[id];
      if (found) return found;
    }
  }
  return Object.values(lines)[0] ?? [];
}

export function expressionFor(tier: TierId): Expression {
  if (tier === 'hostile' || tier === 'mefiant') return 'fache';
  if (tier === 'neutre') return 'neutre';
  return 'content';
}

/** Conditions d'une option, relatives au palier du lieu du PNJ. */
export function conditionMet(ctx: GameCtx, c: Condition | undefined, tier: TierId): boolean {
  if (!c) return true;
  if (c.tierMin && tierRank(tier) < tierRank(c.tierMin)) return false;
  if (c.tierMax && tierRank(tier) > tierRank(c.tierMax)) return false;
  if (c.flag && !ctx.flags.includes(c.flag)) return false;
  if (c.notFlag && ctx.flags.includes(c.notFlag)) return false;
  if (c.quest && c.questStatus && questStatus(ctx, c.quest) !== c.questStatus) return false;
  if (c.quest && !c.questStatus && questStatus(ctx, c.quest) === 'available') return false;
  if (c.gold !== undefined && ctx.progress.gold < c.gold) return false;
  if (c.recruited && !ctx.progress.recruited.includes(c.recruited)) return false;
  return true;
}

export function npcLocationId(ctx: GameCtx, npcId: string): string {
  return ctx.index.npcs.get(npcId)?.location.id ?? '';
}

/** Un PNJ recruté quitte le village. */
export function npcPresent(ctx: GameCtx, npc: NpcDef): boolean {
  return !npc.options.some((o) => o.kind === 'recruit' && ctx.progress.recruited.includes(o.unit.id));
}

export interface VisibleOption {
  readonly index: number;
  readonly option: NpcOption;
  readonly label: string;
}

const heardKey = (npc: NpcDef, index: number): string => `${npc.id}#${index}`;

function defaultLabel(ctx: GameCtx, o: NpcOption): string {
  switch (o.kind) {
    case 'shop':
      return 'Boutique';
    case 'inn':
      return 'Se reposer';
    case 'quest': {
      const name = ctx.index.quests.get(o.quest)?.name ?? '';
      const status = questStatus(ctx, o.quest);
      if (status === 'ready') return `Rendre la quête : ${name}`;
      if (status === 'active') return `À propos de : ${name}`;
      return `Quête : ${name}`;
    }
    case 'recruit':
      return `Recruter ${o.unit.name}`;
    case 'donate':
      return `Faire un don (${o.amount} or)`;
    default:
      return 'Discuter';
  }
}

/** Options affichées dans le menu du PNJ, dans l'ordre des données. */
export function visibleOptions(ctx: GameCtx, npc: NpcDef): VisibleOption[] {
  const tier = tierAt(ctx, npcLocationId(ctx, npc.id));
  if (tier === 'hostile' && npc.refusesWhenHostile) return [];
  const out: VisibleOption[] = [];
  npc.options.forEach((option, index) => {
    if (!conditionMet(ctx, option.when, tier)) return;
    if ((option.kind === 'topic' || option.kind === 'choice') && option.once && ctx.progress.heard.includes(heardKey(npc, index))) return;
    if (option.kind === 'quest' && questStatus(ctx, option.quest) === 'done') return;
    if (option.kind === 'recruit' && ctx.progress.recruited.includes(option.unit.id)) return;
    out.push({ index, option, label: option.label ?? defaultLabel(ctx, option) });
  });
  return out;
}

export interface Greeting {
  readonly pages: string[];
  readonly expression: Expression;
}

export function greetingFor(ctx: GameCtx, npc: NpcDef): Greeting {
  const tier = tierAt(ctx, npcLocationId(ctx, npc.id));
  return { pages: pickLines(npc.greeting, tier), expression: expressionFor(tier) };
}

/** Résultat du choix d'une option. */
export type Outcome =
  | { readonly type: 'say'; readonly pages: string[]; readonly expression: Expression; readonly notices: Notice[] }
  | { readonly type: 'shop'; readonly shopId: string }
  | {
      readonly type: 'ask';
      readonly pages: string[];
      readonly expression: Expression;
      readonly choices: { readonly index: number; readonly label: string }[];
    };

const say = (pages: string[], expression: Expression, notices: Notice[] = []): Outcome => ({ type: 'say', pages, expression, notices });

/** Réponse à une question posée (acceptation d'une quête, choix de dialogue). */
export function answer(ctx: GameCtx, npc: NpcDef, optionIndex: number, choiceIndex: number): Outcome {
  const option = npc.options[optionIndex];
  const tier = tierAt(ctx, npcLocationId(ctx, npc.id));
  const base = expressionFor(tier);
  if (!option) return say([], base);
  if (option.kind === 'quest') {
    const notices: Notice[] = [];
    if (choiceIndex === 0) {
      notices.push(...acceptQuest(ctx, option.quest));
      return say(pickLines(option.remind, tier), 'content', notices);
    }
    if (choiceIndex === 1) {
      notices.push(...refuseQuest(ctx, option.quest));
      return say(['Je comprends. Reviens si tu changes d’avis.'], 'triste', notices);
    }
    return say(['Prends ton temps.'], base);
  }
  if (option.kind === 'choice') {
    const available = option.choices.filter((c) => conditionMet(ctx, c.when, tier));
    const chosen = available[choiceIndex];
    if (!chosen) return say([], base);
    const notices: Notice[] = [];
    applyEffects(ctx, chosen.effects, notices);
    if (option.once) ctx.progress.heard.push(heardKey(npc, optionIndex));
    return say(pickLines(chosen.reply, tier), chosen.expression ?? base, notices);
  }
  return say([], base);
}

/** Entrées du menu d'une question (`ask`) : accepter / refuser / plus tard pour une quête. */
export function questAnswers(ctx: GameCtx, questId: string): string[] {
  const quest = ctx.index.quests.get(questId);
  return quest?.refusalPenalty ? ['Accepter', 'Refuser', 'Plus tard'] : ['Accepter', 'Plus tard'];
}

/** Choisit une option du menu et renvoie ce qui doit se passer. */
export function selectOption(ctx: GameCtx, npc: NpcDef, optionIndex: number): Outcome {
  const option = npc.options[optionIndex];
  const tier = tierAt(ctx, npcLocationId(ctx, npc.id));
  const base = expressionFor(tier);
  if (!option) return say([], base);
  const notices: Notice[] = [];

  switch (option.kind) {
    case 'shop':
      return { type: 'shop', shopId: option.shop };

    case 'inn': {
      const free = option.freeFrom !== undefined && tierRank(tier) >= tierRank(option.freeFrom);
      if (!free && ctx.progress.gold < option.cost) return say(pickLines(option.poorReply ?? option.reply, tier), 'triste');
      if (!free) giveGold(ctx, -option.cost, notices);
      ctx.progress.day += 1;
      notices.push({ kind: 'day', day: ctx.progress.day });
      const reply = free && option.freeReply ? option.freeReply : option.reply;
      return say(pickLines(reply, tier), 'content', notices);
    }

    case 'quest': {
      const quest = ctx.index.quests.get(option.quest);
      if (!quest) return say([], base);
      const status = questStatus(ctx, option.quest);
      if (status === 'ready') {
        notices.push(...completeQuest(ctx, option.quest));
        return say(pickLines(option.done, tier), 'content', notices);
      }
      if (status === 'active') return say(pickLines(option.remind, tier), base);
      if (!questTierOk(ctx, quest)) return say(pickLines(option.locked ?? ['Je ne te connais pas assez pour te confier ça.'], tier), 'fache');
      return {
        type: 'ask',
        pages: pickLines(option.offer, tier),
        expression: base,
        choices: questAnswers(ctx, option.quest).map((label, index) => ({ index, label })),
      };
    }

    case 'recruit': {
      const needsRep = option.minTier !== undefined && tierRank(tier) < tierRank(option.minTier);
      const needsQuest = option.needsQuest !== undefined && questStatus(ctx, option.needsQuest) !== 'done';
      if (needsRep || needsQuest) return say(pickLines(option.locked, tier), 'triste');
      const cost = option.gold ?? 0;
      if (ctx.progress.gold < cost) return say([`Il me faut ${cost} or. Reviens quand tu les auras.`], 'triste');
      if (cost > 0) giveGold(ctx, -cost, notices);
      ctx.progress.recruited.push(option.unit.id);
      notices.push({ kind: 'recruit', name: option.unit.name });
      return say(pickLines(option.offer, tier), 'content', notices);
    }

    case 'donate': {
      const today = ctx.progress.donated[option.rep.target];
      const given = today && today.day === ctx.progress.day ? today.total : 0;
      if (ctx.progress.gold < option.amount) return say(pickLines(option.poorReply, tier), 'triste');
      if (given + option.rep.delta > option.dailyCap) return say(pickLines(option.capReply, tier), 'content');
      giveGold(ctx, -option.amount, notices);
      giveRep(ctx, option.rep.target, option.rep.delta, notices);
      ctx.progress.donated[option.rep.target] = { day: ctx.progress.day, total: given + option.rep.delta };
      return say(pickLines(option.reply, tier), 'content', notices);
    }

    case 'topic': {
      applyEffects(ctx, option.effects, notices);
      if (option.once) ctx.progress.heard.push(heardKey(npc, optionIndex));
      return say(pickLines(option.lines, tier), option.expression ?? base, notices);
    }

    case 'choice': {
      const available = option.choices.filter((c) => conditionMet(ctx, c.when, tier));
      return {
        type: 'ask',
        pages: pickLines(option.prompt, tier),
        expression: base,
        choices: available.map((c, index) => ({ index, label: c.label })),
      };
    }
  }
}

