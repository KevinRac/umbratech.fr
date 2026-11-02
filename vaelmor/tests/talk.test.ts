/**
 * Dialogues de combat (GDD §7.9, décisions n°105 à n°115 et n°174 à n°191) :
 * fiches nommées, scènes, citations de combat, de mort, de phase et de deuil,
 * plafond, Parler, recrutement, IA, bilan.
 */
import { describe, expect, it } from 'vitest';
import { EMBEDDED_DATA, loadGameData } from '../src/data';
import type { SceneDef } from '../src/data/talkSchemas';
import { validateGameData, type GameData } from '../src/data/validate';
import { planAllyAction } from '../src/logic/ai/allyAi';
import { executePlan, planEnemyAction } from '../src/logic/ai/enemyAi';
import { attackUnit, endPhase, skillAction, talkAction } from '../src/logic/tactics/battle';
import { EMPTY_TALK_CONTEXT, isSpared, talkRefusal, talkResults, talkTargets, type TalkContext } from '../src/logic/tactics/talk';
import type { BattleEvent, BattleRules, BattleState, BattleUnit } from '../src/logic/tactics/types';
import type { EncounterDef } from '../src/data/schemas';
import { applyTalkResults, namedCandidates, namedPopAllowed, namedPopChance, rollNamedPop, startingCompany } from '../src/logic/game';
import { newProgress, type Progress } from '../src/logic/game/progress';
import { Rng } from '../src/logic/rng';
import { battleRules, findEncounter } from '../src/logic/tactics/encounter';
import { createMember } from '../src/logic/units/company';
import { makeBattle, plains, rules, unit } from './helpers/battle';

const R = rules();
const data = loadGameData();

const scenesOf = (events: readonly BattleEvent[]): Extract<BattleEvent, { type: 'scene' }>[] => events.filter((e): e is Extract<BattleEvent, { type: 'scene' }> => e.type === 'scene');
const typesOf = (events: readonly BattleEvent[]): string[] => events.map((e) => e.type);

/** Rend une unité sûre de toucher (et forte) : les tests ne dépendent pas des dés. */
function sure(u: BattleUnit, fo = 30): BattleUnit {
  for (const block of [u.base, u.stats] as Record<string, number>[]) {
    block.dex = 99;
    block.chc = 30;
    block.fo = fo;
    block.mag = fo;
    block.vit = 30;
  }
  return u;
}

/** Règles avec d'autres scènes et fiches (données de test, sans toucher au jeu). */
function withTalk(patch: { scenes?: readonly SceneDef[]; named?: GameData['named'] }): BattleRules {
  const d: GameData = { ...data, scenes: patch.scenes ?? data.scenes, named: patch.named ?? data.named };
  return battleRules(d);
}

const DONE: TalkContext = { ...EMPTY_TALK_CONTEXT, quests: { colporteur_perdu: 'done' }, company: ['heros', 'nessa'] };

describe('données des ennemis nommés et des scènes', () => {
  it('le contenu pilote est valide : Rik et Gorm sont des Échos complets', () => {
    const rik = data.enemies.find((e) => e.id === 'rik');
    expect(rik).toMatchObject({ name: 'Rik', title: 'le Cadet', sprite: 'ecumeur_sabreur#1', weapon: 'hachette' });
    expect(data.enemies.find((e) => e.id === 'gorm')?.sprite).toBe('ecumeur_incendiaire#1');
    expect(data.named.map((n) => n.id)).toEqual(['rik', 'gorm']);
    expect(data.scenes.length).toBeGreaterThanOrEqual(7);
  });

  const broken = (mutate: (raw: Record<string, unknown>) => void): readonly string[] => {
    const raw = JSON.parse(JSON.stringify(EMBEDDED_DATA)) as Record<string, unknown>;
    mutate(raw);
    const result = validateGameData(raw as typeof EMBEDDED_DATA);
    return result.ok ? [] : result.issues;
  };
  const scenes = (raw: Record<string, unknown>): Record<string, unknown>[] => (raw.battleQuotes as { scenes: Record<string, unknown>[] }).scenes;

  it('refuse une scène « talk » sans refus, une citation sans unité, un ennemi commun', () => {
    expect(broken((r) => delete scenes(r).find((s) => s.id === 'rik_nessa_parler')?.onFail).join('\n')).toMatch(/onFail/);
    expect(broken((r) => Object.assign(scenes(r)[0] as object, { units: [] })).join('\n')).toMatch(/au moins une unité/);
    expect(broken((r) => Object.assign(scenes(r)[0] as object, { enemy: 'ecumeur_sabreur' })).join('\n')).toMatch(/ni un nommé ni un boss/);
  });

  it('refuse un interlocuteur sans scène, une phase hors boss, un orateur inconnu', () => {
    const named = (r: Record<string, unknown>): Record<string, unknown>[] => (r.enemies as { named: Record<string, unknown>[] }).named;
    expect(broken((r) => ((named(r)[0] as { recruit: { talkers: string[] } }).recruit.talkers = ['nessa', 'alden'])).join('\n')).toMatch(/« alden » n'a pas de scène « talk »/);
    expect(broken((r) => Object.assign(scenes(r).find((s) => s.id === 'gorm_nessa') as object, { kind: 'phase' })).join('\n')).toMatch(/demande un boss/);
    expect(broken((r) => ((scenes(r)[0] as { lines: { speaker: string }[] }).lines[0] as { speaker: string }).speaker = 'personne').join('\n')).toMatch(/personnage inconnu « personne »/);
    expect(broken((r) => Object.assign(named(r)[1] as object, { skinOf: 'inconnu' })).join('\n')).toMatch(/modèle d'ennemi inconnu/);
  });
});

describe('citations de combat (n°106, n°177)', () => {
  const setup = (talk: TalkContext = EMPTY_TALK_CONTEXT): BattleState =>
    makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', name: 'Nessa' }, { class: 'gardien_des_marees', at: [2, 0], hero: true, id: 'heros' }], [{ enemy: 'gorm', at: [2, 1] }, { enemy: 'ecumeur_sabreur', at: [5, 2] }], { talk });

  it('se joue avant l’échange, une seule fois par paire', () => {
    const s = setup();
    unit(s, 'e0').hp = unit(s, 'e0').stats.pv = 99;
    const first = attackUnit(s, 'p0', 'e0', R);
    expect(typesOf(first).slice(0, 2)).toEqual(['scene', 'combat']);
    expect(scenesOf(first)[0]).toMatchObject({ sceneId: 'gorm_nessa', kind: 'battle', enemyId: 'e0', unitId: 'p0', failed: false });
    endPhase(s, R);
    endPhase(s, R);
    expect(scenesOf(attackUnit(s, 'p0', 'e0', R))).toEqual([]);
  });

  it('vaut aussi quand l’ennemi attaque, mais pas pour une autre unité ni une scène déjà vue', () => {
    const s = setup();
    unit(s, 'e0').hp = unit(s, 'e0').stats.pv = 99;
    expect(scenesOf(attackUnit(s, 'p1', 'e0', R))).toEqual([]);
    const enemyTurn = setup();
    unit(enemyTurn, 'e0').hp = unit(enemyTurn, 'e0').stats.pv = 99;
    enemyTurn.phase = 'enemy';
    expect(scenesOf(attackUnit(enemyTurn, 'e0', 'p0', R)).map((e) => e.sceneId)).toEqual(['gorm_nessa']);
    const seen = setup({ ...EMPTY_TALK_CONTEXT, seen: ['gorm_nessa'] });
    unit(seen, 'e0').hp = unit(seen, 'e0').stats.pv = 99;
    expect(scenesOf(attackUnit(seen, 'p0', 'e0', R))).toEqual([]);
  });

  it('respecte le sens d’une citation et rejoue une scène « once: false » à chaque combat', () => {
    const rules2 = withTalk({ scenes: data.scenes.map((sc) => (sc.id === 'gorm_nessa' ? { ...sc, direction: 'enemy_attacks' as const, once: false } : sc)) });
    const s = setup({ ...EMPTY_TALK_CONTEXT, seen: ['gorm_nessa'] });
    unit(s, 'e0').hp = unit(s, 'e0').stats.pv = 99;
    expect(scenesOf(attackUnit(s, 'p0', 'e0', rules2))).toEqual([]);
    s.phase = 'enemy';
    expect(scenesOf(attackUnit(s, 'e0', 'p0', rules2)).length).toBe(1);
    expect(talkResults(s, rules2).seen).toEqual([]);
  });

  it('une compétence de zone ne déclenche rien, une compétence sur une cible oui', () => {
    const extra: SceneDef = { id: 'gorm_aurele', enemy: 'gorm', units: ['aurele'], kind: 'battle', lines: [{ speaker: 'aurele', text: '…' }] };
    const rules2 = withTalk({ scenes: [...data.scenes, extra] });
    const area = makeBattle(plains(6, 3), [{ class: 'heritier_des_cendres', at: [0, 1], id: 'aurele', hero: true }], [{ enemy: 'gorm', at: [2, 1], level: 10 }]);
    unit(area, 'p0').resonance = 100;
    expect(scenesOf(skillAction(area, 'p0', 'nuee_de_braises', { x: 2, y: 1 }, rules2))).toEqual([]);
    const single = makeBattle(plains(6, 3), [{ class: 'lame_du_serment', at: [1, 1], id: 'aurele', hero: true }], [{ enemy: 'gorm', at: [2, 1], level: 10 }]);
    unit(single, 'p0').resonance = 100;
    expect(scenesOf(skillAction(single, 'p0', 'estocade_juree', { x: 2, y: 1 }, rules2)).map((e) => e.sceneId)).toEqual(['gorm_aurele']);
  });
});

describe('citations de mort et de phase (n°178)', () => {
  it('la mort d’un nommé joue la scène de celui qui porte le coup, avant la chute', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', hero: true }], [{ enemy: 'gorm', at: [2, 1] }, { enemy: 'ecumeur_sabreur', at: [5, 2] }], { talk: { ...EMPTY_TALK_CONTEXT, seen: ['gorm_nessa'] } });
    sure(unit(s, 'p0'));
    unit(s, 'e0').hp = 1;
    const events = attackUnit(s, 'p0', 'e0', R);
    const i = typesOf(events).indexOf('scene');
    expect(scenesOf(events)[0]).toMatchObject({ sceneId: 'gorm_nessa_mort', kind: 'death', unitId: 'p0' });
    expect(events[i + 1]?.type).toBe('ko');
  });

  it('sans scène pour l’auteur du coup, rien (ou la scène générique)', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'gardien_des_marees', at: [1, 1], id: 'heros', hero: true }], [{ enemy: 'gorm', at: [2, 1] }, { enemy: 'ecumeur_sabreur', at: [5, 2] }]);
    sure(unit(s, 'p0'));
    unit(s, 'e0').hp = 1;
    expect(scenesOf(attackUnit(s, 'p0', 'e0', R))).toEqual([]);
    const generic: SceneDef = { id: 'gorm_mort', enemy: 'gorm', units: [], kind: 'death', lines: [{ speaker: 'gorm', text: '…' }] };
    const s2 = makeBattle(plains(6, 3), [{ class: 'gardien_des_marees', at: [1, 1], id: 'heros', hero: true }], [{ enemy: 'gorm', at: [2, 1] }, { enemy: 'ecumeur_sabreur', at: [5, 2] }]);
    sure(unit(s2, 'p0'));
    unit(s2, 'e0').hp = 1;
    expect(scenesOf(attackUnit(s2, 'p0', 'e0', withTalk({ scenes: [...data.scenes, generic] })))).toMatchObject([{ sceneId: 'gorm_mort', unitId: null }]);
  });

  it('la phase 2 de Brakk poussée par Nessa joue sa scène à la place de la réplique', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', hero: true }], [{ enemy: 'brakk', at: [2, 1], boss: true, level: 5 }], { objective: 'boss', talk: { ...EMPTY_TALK_CONTEXT, seen: ['brakk_nessa'] } });
    sure(unit(s, 'p0'), 0);
    const brakk = unit(s, 'e0');
    brakk.hp = Math.floor(brakk.stats.pv / 2) + 1;
    unit(s, 'p0').base.fo = unit(s, 'p0').stats.fo = brakk.stats.def + 1;
    const events = attackUnit(s, 'p0', 'e0', R);
    const phase = events.find((e) => e.type === 'bossPhase');
    expect(phase).toMatchObject({ line: '' });
    expect(scenesOf(events)).toMatchObject([{ sceneId: 'brakk_phase', kind: 'phase', unitId: 'p0' }]);
    expect(typesOf(events).indexOf('scene')).toBeGreaterThan(typesOf(events).indexOf('bossPhase'));
  });

  it('poussée par une autre unité, la réplique de la fiche reste', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'heros', hero: true }], [{ enemy: 'brakk', at: [2, 1], boss: true, level: 5 }], { objective: 'boss' });
    sure(unit(s, 'p0'), 0);
    const brakk = unit(s, 'e0');
    brakk.hp = Math.floor(brakk.stats.pv / 2) + 1;
    unit(s, 'p0').base.fo = unit(s, 'p0').stats.fo = brakk.stats.def + 1;
    const events = attackUnit(s, 'p0', 'e0', R);
    expect((events.find((e) => e.type === 'bossPhase') as { line: string }).line.length).toBeGreaterThan(5);
    expect(scenesOf(events)).toEqual([]);
  });
});

describe('plafond et deuil (n°176, n°179)', () => {
  const line = { speaker: 'gorm', text: '…' };
  const four: SceneDef[] = ['heros', 'odran', 'aurele', 'nessa'].map((u) => ({ id: `gorm_${u}_x`, enemy: 'gorm', units: [u], kind: 'battle' as const, lines: [line] }));

  it('au plus trois citations par combat', () => {
    const r2 = withTalk({ scenes: four });
    const s = makeBattle(plains(7, 5), ['heros', 'odran', 'aurele', 'nessa'].map((id, i) => ({ class: 'lame_du_serment', at: [[2, 1], [1, 2], [3, 2], [2, 3]][i] as [number, number], id, hero: i === 0 })), [{ enemy: 'gorm', at: [2, 2], level: 20 }]);
    unit(s, 'e0').hp = unit(s, 'e0').stats.pv = 999;
    for (const id of ['p0', 'p1', 'p2', 'p3']) unit(s, id).hp = unit(s, id).stats.pv = 999;
    const played = ['p0', 'p1', 'p2', 'p3'].flatMap((id) => scenesOf(attackUnit(s, id, 'e0', r2)));
    expect(played.length).toBe(3);
    expect(s.talk.capUsed).toBe(3);
  });

  it('la dernière place reste au boss tant qu’il a une scène possible', () => {
    const r2 = withTalk({ scenes: [...four, { id: 'brakk_heros_x', enemy: 'brakk', units: ['heros'], kind: 'battle', lines: [line] }] });
    const s = makeBattle(plains(8, 5), ['odran', 'aurele', 'nessa', 'heros'].map((id, i) => ({ class: 'lame_du_serment', at: [[2, 1], [1, 2], [3, 2], [6, 1]][i] as [number, number], id, hero: id === 'heros' })), [{ enemy: 'gorm', at: [2, 2], level: 20 }, { enemy: 'brakk', at: [7, 1], boss: true, level: 20 }], { objective: 'boss' });
    for (const e of ['e0', 'e1', 'p0', 'p1', 'p2', 'p3']) unit(s, e).hp = unit(s, e).stats.pv = 999;
    expect(['p0', 'p1', 'p2'].flatMap((id) => scenesOf(attackUnit(s, id, 'e0', r2))).length).toBe(2);
    expect(scenesOf(attackUnit(s, 'p3', 'e1', r2)).map((e) => e.sceneId)).toEqual(['brakk_heros_x']);
  });

  it('un allié vert nommé tombé avant sa scène : citation de deuil au contact suivant', () => {
    const r2 = withTalk({
      scenes: [
        { id: 'gorm_aldric', enemy: 'gorm', units: ['voyageur_arme'], kind: 'battle', lines: [line] },
        { id: 'gorm_deuil', enemy: 'gorm', units: ['voyageur_arme'], kind: 'mourn', lines: [{ speaker: 'gorm', text: 'Où est le voyageur ?' }] },
      ],
    });
    const s = makeBattle(plains(7, 3), [{ class: 'gardien_des_marees', at: [1, 1], id: 'heros', hero: true }], [{ enemy: 'gorm', at: [2, 1], level: 10 }], { greens: [{ class: 'lame_du_serment', at: [6, 2], named: 'voyageur_arme' }] });
    expect(unit(s, 'g0').charId).toBe('voyageur_arme');
    unit(s, 'g0').hp = 0;
    unit(s, 'e0').hp = unit(s, 'e0').stats.pv = 999;
    unit(s, 'p0').hp = unit(s, 'p0').stats.pv = 999;
    expect(scenesOf(attackUnit(s, 'p0', 'e0', r2))).toMatchObject([{ sceneId: 'gorm_deuil', kind: 'mourn', unitId: 'g0' }]);
  });
});

describe('Parler et recrutement (n°107, n°180 à n°184)', () => {
  const setup = (talk: TalkContext, rikAt: [number, number] = [2, 1]): BattleState =>
    makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', name: 'Nessa' }, { class: 'gardien_des_marees', at: [0, 0], hero: true, id: 'heros' }], [{ enemy: 'rik', at: rikAt, level: 3 }, { enemy: 'ecumeur_sabreur', at: [5, 2] }], { talk });

  it('seule une interlocutrice collée peut parler', () => {
    const s = setup(DONE);
    expect(talkTargets(s, unit(s, 'p0'), R).map((u) => u.id)).toEqual(['e0']);
    expect(talkTargets(s, unit(s, 'p1'), R)).toEqual([]);
    expect(talkTargets(setup(DONE, [3, 1]), unit(s, 'p0'), R)).toEqual([]);
    expect(() => talkAction(s, 'p1', 'e0', R)).toThrow();
  });

  it('prérequis manquant : refus, action perdue, Nessa épargnée par Rik ce tour', () => {
    const s = setup(EMPTY_TALK_CONTEXT);
    expect(talkRefusal(s, unit(s, 'e0'), R)).toBe('requires');
    const events = talkAction(s, 'p0', 'e0', R);
    expect(scenesOf(events)).toMatchObject([{ sceneId: 'rik_nessa_parler', kind: 'talk', failed: true }]);
    expect(unit(s, 'p0').acted).toBe(true);
    expect(unit(s, 'e0').team).toBe('enemy');
    expect(s.talk.played).toEqual([]);
    endPhase(s, R);
    expect(isSpared(s, unit(s, 'e0'), unit(s, 'p0'))).toBe(true);
    expect(planEnemyAction(s, 'e0', R).targetId).not.toBe('p0');
  });

  it('succès : Rik change de camp, Lame du Serment niveau 4, PV dans la même proportion, déjà joué', () => {
    const s = setup(DONE);
    const rik = unit(s, 'e0');
    rik.hp = Math.floor(rik.stats.pv / 2);
    const events = talkAction(s, 'p0', 'e0', R);
    expect(typesOf(events)).toEqual(['scene', 'recruit']);
    const rec = events[1] as Extract<BattleEvent, { type: 'recruit' }>;
    expect(rec.fromId).toBe('e0');
    expect(() => unit(s, 'e0')).toThrow();
    const joined = unit(s, rec.unitId);
    expect(joined).toMatchObject({ team: 'player', charId: 'rik', name: 'Rik', kindId: 'lame_du_serment', level: 4, acted: true, x: 2, y: 1, memberIndex: null });
    expect(joined.hp / joined.stats.pv).toBeCloseTo(0.5, 1);
    expect(talkResults(s, R)).toMatchObject({ seen: ['rik_nessa_parler'], named: { rik: 'recruited' }, recruits: [{ charId: 'rik', ransom: 0 }] });
  });

  it('recruter le dernier ennemi gagne le combat', () => {
    const s = makeBattle(plains(4, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', hero: true }], [{ enemy: 'rik', at: [2, 1] }], { talk: DONE });
    expect(talkAction(s, 'p0', 'e0', R)).toContainEqual({ type: 'outcome', outcome: 'victory' });
    expect(s.outcome).toBe('victory');
  });

  it('délai passé (après le tour 8) : refus', () => {
    const s = setup(DONE);
    s.turn = 9;
    expect(talkRefusal(s, unit(s, 'e0'), R)).toBe('deadline');
  });

  it('rançon : refus sans l’or, payée au succès, levée par sa condition', () => {
    const named = data.named.map((n) => (n.id === 'rik' && n.recruit ? { ...n, recruit: { ...n.recruit, ransom: { gold: 300, waivedIf: { rep: { target: 'couronne', tierMax: 'mefiant' as const } } } } } : n));
    const r2 = withTalk({ named });
    expect(talkRefusal(setup({ ...DONE, gold: 100 }), unit(setup(DONE), 'e0'), r2)).toBe('ransom');
    const paid = setup({ ...DONE, gold: 300 });
    talkAction(paid, 'p0', 'e0', r2);
    expect(talkResults(paid, r2).recruits[0]?.ransom).toBe(300);
    const waived = setup({ ...DONE, gold: 0, reputation: { couronne: -50 } });
    talkAction(waived, 'p0', 'e0', r2);
    expect(talkResults(waived, r2).recruits[0]?.ransom).toBe(0);
  });

  it('un recrutable tué est perdu, un nommé non recrutable tué est vaincu', () => {
    const s = makeBattle(plains(6, 3), [{ class: 'gardien_des_marees', at: [1, 1], id: 'heros', hero: true }], [{ enemy: 'rik', at: [2, 1] }, { enemy: 'gorm', at: [4, 1] }]);
    unit(s, 'e0').hp = 0;
    unit(s, 'e1').hp = 0;
    expect(talkResults(s, R).named).toEqual({ rik: 'lost', gorm: 'defeated' });
  });

  it('un allié vert nommé interlocuteur va parler seul, si le nommé accepte (n°184)', () => {
    const talk: SceneDef = { id: 'rik_aldric', enemy: 'rik', units: ['voyageur_arme'], kind: 'talk', lines: [{ speaker: 'voyageur_arme', text: 'Pose ton arme, petit.' }], onFail: [{ speaker: 'rik', text: 'Non.' }] };
    const named = data.named.map((n) => (n.id === 'rik' && n.recruit ? { ...n, recruit: { ...n.recruit, talkers: ['nessa', 'voyageur_arme'] } } : n));
    const r2 = withTalk({ scenes: [...data.scenes, talk], named });
    const s = makeBattle(plains(8, 3), [{ class: 'gardien_des_marees', at: [0, 0], id: 'heros', hero: true }], [{ enemy: 'rik', at: [4, 1] }, { enemy: 'ecumeur_sabreur', at: [7, 2] }], { greens: [{ class: 'lame_du_serment', at: [1, 1], named: 'voyageur_arme' }], talk: DONE });
    s.phase = 'ally';
    const plan = planAllyAction(s, 'g0', r2);
    expect(plan.talkId).toBe('e0');
    const events = executePlan(s, plan, r2);
    expect(scenesOf(events)).toMatchObject([{ sceneId: 'rik_aldric', failed: false }]);
    expect(talkResults(s, r2).named).toEqual({ rik: 'recruited' });
    // Sans la quête, Rik refuserait : l'allié ne tente rien.
    const no = makeBattle(plains(8, 3), [{ class: 'gardien_des_marees', at: [0, 0], id: 'heros', hero: true }], [{ enemy: 'rik', at: [4, 1] }, { enemy: 'ecumeur_sabreur', at: [7, 2] }], { greens: [{ class: 'lame_du_serment', at: [1, 1], named: 'voyageur_arme' }] });
    no.phase = 'ally';
    expect(planAllyAction(no, 'g0', r2).talkId ?? null).toBeNull();
  });
});

describe('apparition au hasard des nommés (n°115, n°185, n°186)', () => {
  const progressWith = (company: string[], quests: Record<string, 'active' | 'done'> = {}): Progress => {
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    p.company = startingCompany(data, 'gardien_des_marees');
    for (const id of company) if (!p.company.some((m) => m.id === id)) p.company.push(createMember(data, { id, name: id, class: 'danseur_des_courants', level: 3 }));
    p.quests = { ...quests };
    return p;
  };
  const ordinary = data.encounters.encounters.find((e) => e.id === 'patrouille_ecumeurs') as EncounterDef;
  const input = (p: Progress, over: Partial<Parameters<typeof rollNamedPop>[0]> = {}): Parameters<typeof rollNamedPop>[0] => ({
    data,
    progress: p,
    flags: [],
    encounter: ordinary,
    zone: 'z1',
    lastDeployed: null,
    rng: Rng.fromSeed('pop'),
    ...over,
  });

  it('candidats : nommés de la zone (ou voisine), liés à un membre, condition d’apparition remplie', () => {
    expect(namedCandidates(input(progressWith([])))).toEqual([]);
    expect(namedCandidates(input(progressWith(['nessa']))).map((c) => c.named.id)).toEqual(['gorm']);
    const done = progressWith(['nessa'], { colporteur_perdu: 'done' });
    expect(namedCandidates(input(done)).map((c) => c.named.id)).toEqual(['rik', 'gorm']);
    expect(namedCandidates(input(done, { zone: 'z2' })).length).toBe(2);
    expect(namedCandidates(input(done, { zone: 'z3' }))).toEqual([]);
    done.named = { gorm: 'defeated' };
    expect(namedCandidates(input(done)).map((c) => c.named.id)).toEqual(['rik']);
    expect(namedCandidates(input(done, { lastDeployed: ['nessa'] }))[0]?.weight).toBe(3);
  });

  it('chance de 4 %, +1 par combat sans apparition, plafond 12 %, remise à zéro après une apparition', () => {
    expect(namedPopChance(data, 0)).toBe(4);
    expect(namedPopChance(data, 5)).toBe(9);
    expect(namedPopChance(data, 40)).toBe(12);
    const p = progressWith(['nessa']);
    let pops = 0;
    for (let i = 0; i < 400; i++) {
      const before = p.namedPity;
      const pop = rollNamedPop(input(p, { rng: Rng.fromSeed(`n${i}`) }));
      if (pop) {
        pops += 1;
        expect(p.namedPity).toBe(0);
        expect(pop).toEqual({ enemy: 'gorm', level: Math.max(...ordinary.enemies.map((e) => e.level)) + 1 });
      } else expect(p.namedPity).toBe(before + 1);
    }
    expect(pops).toBeGreaterThan(10);
    expect(pops).toBeLessThan(80);
  });

  it('jamais pour un boss, une carte de scénario, une milice, ni sans candidat (le compteur ne bouge pas)', () => {
    const p = progressWith(['nessa']);
    p.namedPity = 50;
    for (const id of ['camp_des_ecumeurs', 'milice_aubemer']) expect(rollNamedPop(input(p, { encounter: findEncounter(data, id) }))).toBeNull();
    expect(namedPopAllowed(data, findEncounter(data, 'patrouille_ecumeurs'))).toBe(true);
    expect(rollNamedPop(input(progressWith([])))).toBeNull();
    expect(p.namedPity).toBe(50);
  });
});

describe('bilan des dialogues sur la partie (n°182, n°183, n°189)', () => {
  const talkBattle = (): BattleState => makeBattle(plains(6, 3), [{ class: 'danseur_des_courants', at: [1, 1], id: 'nessa', name: 'Nessa' }, { class: 'gardien_des_marees', at: [0, 0], hero: true, id: 'heros' }], [{ enemy: 'rik', at: [2, 1], level: 3 }, { enemy: 'gorm', at: [5, 2] }], { talk: DONE });
  const progressOf = (mode: 'blessure' | 'classique' = 'blessure'): Progress => {
    const p = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions, mode });
    p.company = startingCompany(data, 'gardien_des_marees');
    return p;
  };

  it('Rik recruté rejoint la compagnie à son niveau, scène retenue ; Gorm tombé est vaincu', () => {
    const s = talkBattle();
    const rec = talkAction(s, 'p0', 'e0', R).find((e) => e.type === 'recruit') as Extract<BattleEvent, { type: 'recruit' }>;
    unit(s, 'e1').hp = 0;
    const p = progressOf();
    const out = applyTalkResults(data, p, talkResults(s, R), s.units);
    expect(out).toEqual({ joined: ['Rik'], lost: [] });
    expect(p.company.find((m) => m.id === 'rik')).toMatchObject({ class: 'lame_du_serment', level: 4, woundedDay: null });
    expect(p.recruited).toContain('rik');
    expect(p.named).toEqual({ rik: 'recruited', gorm: 'defeated' });
    expect(p.scenesSeen).toEqual(['rik_nessa_parler']);
    // Tombé après avoir rejoint : blessé (Blessure), perdu (Classique).
    unit(s, rec.unitId).hp = 0;
    const hurt = progressOf();
    applyTalkResults(data, hurt, talkResults(s, R), s.units);
    expect(hurt.company.find((m) => m.id === 'rik')?.woundedDay).toBe(hurt.day);
    const classic = progressOf('classique');
    expect(applyTalkResults(data, classic, talkResults(s, R), s.units)).toEqual({ joined: [], lost: ['Rik'] });
    expect(classic.named.rik).toBe('lost');
    expect(classic.company.some((m) => m.id === 'rik')).toBe(false);
  });
});
