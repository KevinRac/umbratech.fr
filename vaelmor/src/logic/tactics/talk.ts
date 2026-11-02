/**
 * Dialogues de combat (GDD §7.9, bible narrative, décisions n°105 à n°115 et
 * n°174 à n°191) : citations de combat, Parler, recrutement d'un ennemi
 * nommé, citations de mort, de phase et de deuil.
 *
 * Les scènes sont des **événements** (`scene`) glissés dans la liste que
 * renvoie chaque commande : avant l'échange de coups (citation de combat),
 * avant la chute (citation de mort), après le changement de phase d'un boss.
 * Le rendu les affiche dans l'ordre ; le combat lui-même n'en dépend pas.
 *
 * Règles :
 * - une scène ne se joue qu'une fois par combat, et une fois par partie sauf
 *   `once: false` (scènes déjà vues : `TalkContext.seen`) ;
 * - au plus `balance.namedPop.sceneCap` (3) citations de combat, de mort et de
 *   deuil par combat ; Parler et les scènes de phase ne sont jamais bloquées ;
 *   tant qu'un boss a encore une scène possible, une place lui reste réservée
 *   (n°176) ;
 * - une compétence de zone ne déclenche pas de citation de combat (n°177) ;
 * - la citation de mort et de phase dépend de l'auteur du dernier coup
 *   (échange, compétence, statut, ronces ; n°178) ;
 * - Parler : unité de la compagnie (ou allié vert nommé, par son IA) collée à
 *   un nommé recrutable dont elle est un interlocuteur. Prérequis manquants
 *   ou délai passé : refus, action perdue, l'unité n'est pas frappée par lui
 *   ce tour (n°180). Succès : il change de camp sous sa forme de compagnie
 *   (n°181) et rejoint la compagnie à la fin du combat (n°182).
 *
 * Module pur : ni DOM ni Phaser.
 */
import { TIER_IDS } from '../../data/townSchemas';
import type { BattleCondition, NamedEnemyDef, SceneDef, SceneKind } from '../../data/talkSchemas';
import type { GameData } from '../../data/validate';
import { getReputationTier } from '../reputation/reputation';
import { BattleError, assertCanAction, finishUnit, settleOutcome } from './battleCore';
import { getUnit } from './grid';
import { areaOf, skillDef } from './skills';
import { refreshStats } from './status';
import { type BattleEvent, type BattleRules, type BattleState, type BattleUnit } from './types';
import { emptyLoadout, memberUnit } from './units';

/** Sort d'un ennemi nommé dans la partie (sauvegardé, n°183). */
export type NamedStatus = 'defeated' | 'recruited' | 'lost';

/** Ce que les scènes ont besoin de savoir de la partie, figé au lancement du combat. */
export interface TalkContext {
  /** État des quêtes (`active` ou `done`). */
  readonly quests: Readonly<Record<string, string>>;
  /** Drapeaux de progression levés. */
  readonly flags: readonly string[];
  /** Identifiants des membres de la compagnie. */
  readonly company: readonly string[];
  readonly reputation: Readonly<Record<string, number>>;
  readonly gold: number;
  /** Scènes déjà vues dans la partie. */
  readonly seen: readonly string[];
  /** Ennemis nommés vaincus, recrutés ou perdus. */
  readonly named: Readonly<Record<string, NamedStatus>>;
}

export const EMPTY_TALK_CONTEXT: TalkContext = { quests: {}, flags: [], company: [], reputation: {}, gold: 0, seen: [], named: {} };

/** Recrue gagnée pendant le combat. */
export interface TalkRecruit {
  /** Le nommé (« rik »). */
  readonly charId: string;
  /** Son unité dans le camp de la compagnie. */
  readonly unitId: string;
  /** Rançon à payer à la fin du combat (0 : aucune). */
  readonly ransom: number;
}

/** État des dialogues pendant un combat. */
export interface TalkState {
  readonly context: TalkContext;
  /** Scènes jouées pendant ce combat, dans l'ordre (refus de Parler exclus). */
  readonly played: string[];
  /** Places du plafond déjà prises (citations de combat, de mort, de deuil). */
  capUsed: number;
  /** L'ennemi `enemyId` ne frappe pas `unitId` pendant le tour `turn` (refus de Parler, n°180). */
  readonly spared: { readonly enemyId: string; readonly unitId: string; readonly turn: number }[];
  readonly recruits: TalkRecruit[];
  /** Qui a joué quelle scène avec quel ennemi (deuil, journal). */
  readonly log: { readonly sceneId: string; readonly enemy: string; readonly unit: string | null }[];
  /** Auteur du dernier coup reçu par chaque unité (n°178). */
  readonly hits: Record<string, string>;
}

export function newTalkState(context: TalkContext = EMPTY_TALK_CONTEXT): TalkState {
  return { context, played: [], capUsed: 0, spared: [], recruits: [], log: [], hits: {} };
}

/* ---------- Données ---------- */

export function namedDef(rules: BattleRules, charId: string | null): NamedEnemyDef | null {
  if (charId === null) return null;
  return rules.data.named.find((n) => n.id === charId) ?? null;
}

const scenesFor = (rules: BattleRules, enemy: string, kind: SceneKind): SceneDef[] => rules.data.scenes.filter((s) => s.enemy === enemy && s.kind === kind);

export function sceneDef(rules: BattleRules, id: string): SceneDef {
  const scene = rules.data.scenes.find((s) => s.id === id);
  if (!scene) throw new BattleError(`Scène inconnue : « ${id} »`);
  return scene;
}

const CAPPED: ReadonlySet<SceneKind> = new Set(['battle', 'death', 'mourn']);

/* ---------- Conditions ---------- */

const tierRank = (id: string): number => (TIER_IDS as readonly string[]).indexOf(id);

/** Ce qu'une condition peut interroger : la partie, et le combat s'il a lieu. */
export interface ConditionEnv {
  readonly ctx: TalkContext;
  readonly data: GameData;
  /** Tour du combat (1 hors combat). */
  readonly turn: number;
  /** Or disponible (rançons promises déduites). */
  readonly gold: number;
  /** Le personnage est-il sur la carte, du côté de la compagnie ? */
  readonly deployed: (charId: string) => boolean;
  /** Scène vue dans la partie ou jouée dans ce combat. */
  readonly seen: (sceneId: string) => boolean;
}

/** Évalue une condition (toutes ses clés, et l'une de ses variantes `any`). */
export function evalCondition(c: BattleCondition | undefined, env: ConditionEnv): boolean {
  if (!c) return true;
  const { ctx } = env;
  const one = (x: Omit<BattleCondition, 'any'>): boolean => {
    if (x.questDone !== undefined && ctx.quests[x.questDone] !== 'done') return false;
    if (x.questActive !== undefined && ctx.quests[x.questActive] !== 'active') return false;
    if (x.flag !== undefined && !ctx.flags.includes(x.flag)) return false;
    if (x.notFlag !== undefined && ctx.flags.includes(x.notFlag)) return false;
    if (x.recruited !== undefined && !ctx.company.includes(x.recruited)) return false;
    if (x.deployed !== undefined && !env.deployed(x.deployed)) return false;
    if (x.rep) {
      const tier = tierRank(getReputationTier(ctx.reputation[x.rep.target] ?? 0, env.data.reputation).id);
      if (x.rep.tierMin !== undefined && tier < tierRank(x.rep.tierMin)) return false;
      if (x.rep.tierMax !== undefined && tier > tierRank(x.rep.tierMax)) return false;
    }
    if (x.gold !== undefined && env.gold < x.gold) return false;
    if (x.seen !== undefined && !env.seen(x.seen)) return false;
    if (x.notSeen !== undefined && env.seen(x.notSeen)) return false;
    if (x.maxTurn !== undefined && env.turn > x.maxTurn) return false;
    return true;
  };
  if (!one(c)) return false;
  return c.any ? c.any.some(one) : true;
}

/** Une condition est-elle vraie dans ce combat ? */
export function conditionHolds(state: BattleState, rules: BattleRules, c: BattleCondition | undefined): boolean {
  if (!c) return true;
  const ctx = state.talk.context;
  return evalCondition(c, {
    ctx,
    data: rules.data,
    turn: state.turn,
    gold: goldLeft(state),
    deployed: (id) => state.units.some((u) => u.hp > 0 && u.team !== 'enemy' && u.charId === id),
    seen: (id) => ctx.seen.includes(id) || state.talk.played.includes(id),
  });
}

/** Or encore disponible (rançons promises pendant ce combat déduites). */
function goldLeft(state: BattleState): number {
  return state.talk.context.gold - state.talk.recruits.reduce((n, r) => n + r.ransom, 0);
}

/** La scène peut-elle encore se jouer (pas déjà jouée dans ce combat, ni vue dans la partie si `once`) ? */
function fresh(state: BattleState, scene: SceneDef): boolean {
  if (state.talk.played.includes(scene.id)) return false;
  return scene.once === false || !state.talk.context.seen.includes(scene.id);
}

/* ---------- Plafond (n°176) ---------- */

/** Un boss vivant a-t-il encore une citation (plafonnée) possible avec une unité présente ? */
function bossPending(state: BattleState, rules: BattleRules): boolean {
  const present = new Set(state.units.filter((u) => u.hp > 0 && u.team !== 'enemy' && u.charId !== null).map((u) => u.charId as string));
  for (const boss of state.units) {
    if (!boss.isBoss || boss.hp <= 0 || boss.team !== 'enemy' || boss.charId === null) continue;
    for (const s of rules.data.scenes) {
      if (s.enemy !== boss.charId || !CAPPED.has(s.kind) || !fresh(state, s)) continue;
      if (s.units.length === 0 || s.units.some((u) => present.has(u))) return true;
    }
  }
  return false;
}

function capAllows(state: BattleState, rules: BattleRules, scene: SceneDef, enemy: BattleUnit): boolean {
  if (!CAPPED.has(scene.kind)) return true;
  const left = rules.data.balance.namedPop.sceneCap - state.talk.capUsed;
  if (left <= 0) return false;
  if (left === 1 && !enemy.isBoss && bossPending(state, rules)) return false;
  return true;
}

function play(state: BattleState, scene: SceneDef, unit: BattleUnit | null): void {
  state.talk.played.push(scene.id);
  state.talk.log.push({ sceneId: scene.id, enemy: scene.enemy, unit: unit?.charId ?? null });
  if (CAPPED.has(scene.kind)) state.talk.capUsed += 1;
}

type SceneEvent = Extract<BattleEvent, { type: 'scene' }>;

const sceneEvent = (scene: SceneDef, enemy: BattleUnit, unit: BattleUnit | null, failed = false): SceneEvent => ({
  type: 'scene',
  sceneId: scene.id,
  kind: scene.kind,
  enemyId: enemy.id,
  unitId: unit?.id ?? null,
  failed,
});

/* ---------- Déclencheurs ---------- */

/** Scène liée à `unit` (ou générique si `units` est vide et `generic`), jouable maintenant. */
function pick(state: BattleState, rules: BattleRules, enemy: BattleUnit, kind: SceneKind, unit: BattleUnit | null, generic: boolean, accept: (s: SceneDef) => boolean = () => true): SceneDef | null {
  if (enemy.charId === null) return null;
  const candidates = scenesFor(rules, enemy.charId, kind).filter((s) => fresh(state, s) && accept(s) && conditionHolds(state, rules, s.when) && capAllows(state, rules, s, enemy));
  const linked = unit?.charId ? candidates.find((s) => s.units.includes(unit.charId as string)) : undefined;
  if (linked) return linked;
  return generic ? (candidates.find((s) => s.units.length === 0) ?? null) : null;
}

/**
 * Citation de combat avant un échange (n°106, n°177) : entre l'ennemi nommé et
 * l'unité liée qui l'attaque ou qu'il attaque ; à défaut, citation de deuil
 * si l'allié vert lié est tombé avant d'avoir eu sa scène (n°179).
 */
function exchangeScene(state: BattleState, rules: BattleRules, attacker: BattleUnit, defender: BattleUnit): SceneEvent | null {
  const enemyAttacks = attacker.team === 'enemy';
  const enemy = enemyAttacks ? attacker : defender;
  const other = enemyAttacks ? defender : attacker;
  if (enemy.team !== 'enemy' || other.team === 'enemy') return null;
  const direction = enemyAttacks ? 'enemy_attacks' : 'ally_attacks';
  const battle = pick(state, rules, enemy, 'battle', other, false, (s) => (s.direction ?? 'either') === 'either' || s.direction === direction);
  if (battle) {
    play(state, battle, other);
    return sceneEvent(battle, enemy, other);
  }
  const mourn =
    enemy.charId === null
      ? undefined
      : scenesFor(rules, enemy.charId, 'mourn').find((s) => fresh(state, s) && s.units.some((id) => fallenBeforeScene(state, enemy, id)) && conditionHolds(state, rules, s.when) && capAllows(state, rules, s, enemy));
  if (mourn) {
    const fallen = state.units.find((u) => u.charId !== null && mourn.units.includes(u.charId) && u.hp <= 0) ?? null;
    play(state, mourn, fallen);
    return sceneEvent(mourn, enemy, fallen);
  }
  return null;
}

/** L'allié vert `charId` est tombé dans ce combat sans avoir joué de scène avec `enemy` (n°179). */
function fallenBeforeScene(state: BattleState, enemy: BattleUnit, charId: string): boolean {
  if (enemy.charId === null || !state.units.some((u) => u.charId === charId && u.team === 'ally' && u.hp <= 0)) return false;
  return !state.talk.log.some((l) => l.enemy === enemy.charId && l.unit === charId);
}

/**
 * Glisse les scènes dans les événements d'une commande : citation de combat
 * avant chaque échange, citation de mort avant la chute d'un nommé ou d'un
 * boss, scène de phase après le changement de phase d'un boss.
 */
export function weaveScenes(state: BattleState, rules: BattleRules, events: readonly BattleEvent[]): BattleEvent[] {
  if (rules.data.scenes.length === 0) return [...events];
  const out: BattleEvent[] = [];
  const hits = state.talk.hits;
  const find = (id: string): BattleUnit | null => state.units.find((u) => u.id === id) ?? null;
  for (const event of events) {
    switch (event.type) {
      case 'combat': {
        const attacker = find(event.attackerId);
        const defender = find(event.defenderId);
        const area = event.skillId !== undefined && areaOf(attacker ?? {}, skillDef(rules, event.skillId)) !== undefined;
        if (attacker && defender && !area) {
          const scene = exchangeScene(state, rules, attacker, defender);
          if (scene) out.push(scene);
        }
        for (const s of event.strikes) if (s.hit) hits[s.targetId] = s.attackerId;
        out.push(event);
        break;
      }
      case 'effects':
        for (const r of event.results) if ((r.damage ?? 0) > 0) hits[r.unitId] = event.sourceId;
        out.push(event);
        break;
      case 'dot': {
        const victim = find(event.unitId);
        const source = victim?.mods.find((m) => m.status === event.status)?.sourceId;
        if (source) hits[event.unitId] = source;
        out.push(event);
        break;
      }
      case 'thorns':
        hits[event.unitId] = event.sourceId;
        out.push(event);
        break;
      case 'ko': {
        const victim = find(event.unitId);
        const killerId = hits[event.unitId];
        const killer = killerId ? find(killerId) : null;
        const by = killer && killer.team !== 'enemy' ? killer : null;
        if (victim && victim.team === 'enemy' && victim.charId !== null) {
          const scene = pick(state, rules, victim, 'death', by, true);
          if (scene) {
            const who = scene.units.length > 0 ? by : null;
            play(state, scene, who);
            out.push(sceneEvent(scene, victim, who));
          }
        }
        out.push(event);
        break;
      }
      case 'bossPhase': {
        const boss = find(event.unitId);
        const actorId = hits[event.unitId];
        const actor = actorId ? find(actorId) : null;
        const by = actor && actor.team !== 'enemy' ? actor : null;
        const scene = boss ? pick(state, rules, boss, 'phase', by, true) : null;
        if (scene && boss) {
          const who = scene.units.length > 0 ? by : null;
          play(state, scene, who);
          // La scène remplace la réplique de la fiche du boss.
          out.push({ ...event, line: '' }, sceneEvent(scene, boss, who));
        } else out.push(event);
        break;
      }
      default:
        out.push(event);
    }
  }
  return out;
}

/* ---------- Parler (n°107, n°180 à n°184) ---------- */

/** Le nommé `enemy` peut-il entendre `unit` (interlocuteur prévu, scène « talk » existante) ? */
function hasTalk(rules: BattleRules, unit: BattleUnit, enemy: BattleUnit): boolean {
  const def = namedDef(rules, enemy.charId);
  if (!def?.recruit || unit.charId === null || !def.recruit.talkers.includes(unit.charId)) return false;
  return scenesFor(rules, def.id, 'talk').some((s) => s.units.includes(unit.charId as string));
}

/** Ennemis nommés recrutables collés à `unit` (ou à la case `from`) à qui elle peut parler. */
export function talkTargets(state: BattleState, unit: BattleUnit, rules: BattleRules, from: { readonly x: number; readonly y: number } = unit): BattleUnit[] {
  if (unit.team === 'enemy' || unit.hp <= 0) return [];
  return state.units.filter((e) => e.team === 'enemy' && e.hp > 0 && Math.abs(e.x - from.x) + Math.abs(e.y - from.y) === 1 && hasTalk(rules, unit, e));
}

/** Ennemis recrutables à qui `unit` pourrait parler s'il était collé à eux (marqueurs de la carte, n°187). */
export function talkableEnemies(state: BattleState, unit: BattleUnit, rules: BattleRules): BattleUnit[] {
  if (unit.team === 'enemy') return [];
  return state.units.filter((e) => e.team === 'enemy' && e.hp > 0 && hasTalk(rules, unit, e));
}

/** Pourquoi le nommé refuserait-il maintenant (null : il accepterait) ? */
export function talkRefusal(state: BattleState, enemy: BattleUnit, rules: BattleRules): 'requires' | 'deadline' | 'ransom' | null {
  const recruit = namedDef(rules, enemy.charId)?.recruit;
  if (!recruit) return 'requires';
  if (!conditionHolds(state, rules, recruit.requires)) return 'requires';
  const d = recruit.deadline;
  if (d?.turn !== undefined && state.turn > d.turn) return 'deadline';
  if (d?.hpBelow !== undefined && enemy.hp < enemy.stats.pv * d.hpBelow) return 'deadline';
  if (recruit.ransom && !conditionHolds(state, rules, recruit.ransom.waivedIf ?? { questDone: '__jamais__' }) && goldLeft(state) < recruit.ransom.gold) return 'ransom';
  return null;
}

/** Un refus de Parler protège l'unité de cet ennemi pendant le tour (n°180). */
export function isSpared(state: BattleState, attacker: BattleUnit, target: BattleUnit): boolean {
  return state.talk.spared.some((s) => s.enemyId === attacker.id && s.unitId === target.id && s.turn === state.turn);
}

/**
 * Parler (n°107) : l'unité, collée au nommé, lui parle. Succès : scène, puis le
 * nommé passe dans le camp de la compagnie sous sa forme de recrue (n°181).
 * Refus : scène de refus, action perdue, l'unité épargnée par lui ce tour.
 */
export function talkUnit(state: BattleState, unitId: string, targetId: string, rules: BattleRules): BattleEvent[] {
  const unit = getUnit(state, unitId);
  const enemy = getUnit(state, targetId);
  assertCanAction(state, unit);
  if (!talkTargets(state, unit, rules).includes(enemy)) throw new BattleError(`${unit.name} ne peut pas parler à ${enemy.name}.`);
  const def = namedDef(rules, enemy.charId) as NamedEnemyDef;
  const recruit = def.recruit as NonNullable<NamedEnemyDef['recruit']>;
  const scene = scenesFor(rules, def.id, 'talk').find((s) => s.units.includes(unit.charId as string)) as SceneDef;
  finishUnit(state, unit);
  if (talkRefusal(state, enemy, rules) !== null) {
    state.talk.spared.push({ enemyId: enemy.id, unitId: unit.id, turn: state.turn });
    return [sceneEvent(scene, enemy, unit, true)];
  }
  play(state, scene, unit);
  const events: BattleEvent[] = [sceneEvent(scene, enemy, unit)];
  const joined = recruitUnit(state, rules, enemy, def);
  const waived = recruit.ransom ? conditionHolds(state, rules, recruit.ransom.waivedIf ?? { questDone: '__jamais__' }) : true;
  state.talk.recruits.push({ charId: def.id, unitId: joined.id, ransom: recruit.ransom && !waived ? recruit.ransom.gold : 0 });
  events.push({ type: 'recruit', fromId: enemy.id, unitId: joined.id }, ...settleOutcome(state));
  return events;
}

/**
 * Le nommé change de camp (n°181) : son unité ennemie est remplacée, sur la
 * même case, par une unité de la compagnie (classe et niveau de sa fiche,
 * stats à la croissance moyenne, PV dans la même proportion). Elle a déjà agi.
 */
function recruitUnit(state: BattleState, rules: BattleRules, enemy: BattleUnit, def: NamedEnemyDef): BattleUnit {
  const recruit = def.recruit as NonNullable<NamedEnemyDef['recruit']>;
  const same = state.units.filter((u) => u.team === 'player' && u.kindId === recruit.asClass && u.hp > 0).length;
  const id = `n${state.nextId++}`;
  const fresh = memberUnit(rules.data, rules, { id: def.id, name: def.name, class: recruit.asClass, level: recruit.level, hero: false }, emptyLoadout(), id, 0, enemy.x, enemy.y, same);
  const joined: BattleUnit = { ...fresh, memberIndex: null };
  refreshStats(joined, rules);
  joined.hp = Math.max(1, Math.round((joined.stats.pv * enemy.hp) / Math.max(1, enemy.stats.pv)));
  joined.acted = true;
  joined.moved = true;
  const index = state.units.indexOf(enemy);
  state.units.splice(index, 1, joined);
  return joined;
}

/* ---------- Bilan (n°182, n°183) ---------- */

export interface TalkResults {
  /** Scènes vues à retenir pour la partie (`once` vrai). */
  readonly seen: readonly string[];
  /** Ennemis nommés vaincus, perdus ou recrutés pendant ce combat. */
  readonly named: Readonly<Record<string, NamedStatus>>;
  readonly recruits: readonly TalkRecruit[];
}

export function talkResults(state: BattleState, rules: BattleRules): TalkResults {
  const named: Record<string, NamedStatus> = {};
  for (const u of state.units) {
    const def = u.team === 'enemy' && u.hp <= 0 ? namedDef(rules, u.charId) : null;
    if (def) named[def.id] = def.recruit ? 'lost' : 'defeated';
  }
  for (const r of state.talk.recruits) named[r.charId] = 'recruited';
  const seen = state.talk.played.filter((id) => rules.data.scenes.find((s) => s.id === id)?.once !== false);
  return { seen, named, recruits: [...state.talk.recruits] };
}
