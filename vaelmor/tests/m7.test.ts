/**
 * Jalon M7 (contenu du monde) : nommés aux postes du monde (n°193), figures de
 * village (n°197), roster de 30 et tri / filtre de la préparation (n°199),
 * Arène des Cendres (n°200), Orvane et Ser Maëlis (n°194, n°195), scènes (n°203).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { characterIds } from '../src/data/talkChecks';
import { figureLinked, planAllies, type VillageArea } from '../src/logic/game/allyRules';
import { companyFull, joinCompany } from '../src/logic/game/companyRules';
import { conditionMet, greetingFor, selectOption, visibleOptions } from '../src/logic/game/dialogue';
import { chooseEncounter, foePresent, foeSpriteOf, namedAtPost } from '../src/logic/game/foeRules';
import { chooseEnding, endingReached, settleEnding } from '../src/logic/game/ending';
import { newProgress } from '../src/logic/game/progress';
import { Rng } from '../src/logic/rng';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { rosterClasses, rosterOrder } from '../src/logic/tactics/prep';
import { createMember } from '../src/logic/units/company';
import { terrainAt } from '../src/logic/tactics/grid';
import { buildTownIndex, type GameCtx } from '../src/logic/game';
import type { TierId } from '../src/data/townSchemas';
import { testWorld } from './helpers/world';

const data = loadGameData();
const index = buildTownIndex(data);
const makeCtx = (): GameCtx => ({ data, index, progress: newProgress({ balance: data.balance, locations: data.locations, factions: data.factions }), flags: [], discovered: [] });

describe('nommés aux postes du monde (n°193)', () => {
  const posts = data.worldFoes.filter((f) => f.named !== undefined);

  it('chaque nommé non boss de la bible tient un poste (vigie, ou patrouille pour Rik)', () => {
    const held = posts.map((f) => f.named).sort();
    expect(held).toEqual(['alderic', 'aldo', 'drak', 'gorm', 'hakon', 'hobb', 'ilse', 'maelis', 'orsen', 'oswin', 'rik', 'veilleur_de_pierre']);
    for (const f of posts) expect(f.kind === 'sentinelle' || f.named === 'rik').toBe(true);
  });

  it('le poste d’un Écho de quête attend la fin de sa quête (Rik après « Le colporteur perdu »)', () => {
    const post = posts.find((f) => f.named === 'rik') as (typeof posts)[number];
    const ctx = makeCtx();
    expect(foePresent(ctx, post)).toBe(false);
    ctx.progress.quests['colporteur_perdu'] = 'done';
    expect(foePresent(ctx, post)).toBe(true);
    // Un poste sans condition (Gorm) est là dès le départ ; Maëlis (`pop: false`) aussi.
    expect(foePresent(makeCtx(), posts.find((f) => f.named === 'gorm') as (typeof posts)[number])).toBe(true);
    expect(foePresent(makeCtx(), posts.find((f) => f.named === 'maelis') as (typeof posts)[number])).toBe(true);
  });

  it('le poste porte le sprite d’Écho du nommé et l’ajoute à sa rencontre au niveau du plus fort + 1', () => {
    const post = posts.find((f) => f.named === 'oswin') as (typeof posts)[number];
    expect(foeSpriteOf(data, post)).toBe('chasseur_de_ronces#1');
    const encounter = chooseEncounter(data, post, 'x');
    const top = Math.max(...encounter.enemies.map((e) => e.level));
    expect(namedAtPost(data, post, encounter)).toEqual({ enemy: 'oswin', level: top + data.balance.namedPop.levelBonus });
    expect(namedAtPost(data, data.worldFoes[0] as (typeof posts)[number], encounter)).toBeNull();
  });

  it('le poste disparaît dès que le sort du nommé est réglé (vaincu, recruté, perdu), même par un autre combat', () => {
    const post = posts.find((f) => f.named === 'hobb') as (typeof posts)[number];
    const ctx = makeCtx();
    expect(foePresent(ctx, post)).toBe(true);
    ctx.progress.named['hobb'] = 'recruited';
    expect(foePresent(ctx, post)).toBe(false);
    ctx.progress.named['hobb'] = 'defeated';
    expect(foePresent(ctx, post)).toBe(false);
    // Un combat perdu ne règle rien : il est toujours là.
    delete ctx.progress.named['hobb'];
    expect(foePresent(ctx, post)).toBe(true);
  });

  it('le nommé du poste se bat dans la rencontre (un combat construit avec lui)', () => {
    const post = posts.find((f) => f.named === 'drak') as (typeof posts)[number];
    const encounter = chooseEncounter(data, post, 'x');
    const extra = namedAtPost(data, post, encounter) as { enemy: string; level: number };
    const state = buildBattle(encounter, data.encounters.testParty, data, { seed: 1, world: testWorld().source, extraEnemies: [extra] });
    const drak = state.units.find((u) => u.charId === 'drak');
    expect(drak).toBeDefined();
    expect(drak?.team).toBe('enemy');
    expect(drak?.level).toBe(extra.level);
  });
});

describe('figures de village (n°197)', () => {
  const haut: Omit<VillageArea, 'tier'> = { id: 'haut_gue', name: 'Haut-Gué', x0: 61, y0: 72, x1: 82, y1: 87, zone: 1 };
  const plan = (tier: TierId, enemies: string[], site = { x: 88, y: 80 }, wounded: Record<string, number> = {}, seed: string | number = 1) =>
    planAllies({ data, site, zoneValue: 1, villages: [{ ...haut, tier }], errants: [], rng: Rng.fromSeed(seed), enemies, wounded, day: 0 });

  it('les 17 figures sont des modèles nommés, portant l’identifiant et l’apparence de leur PNJ', () => {
    const figures = data.allyTemplates.filter((t) => t.npc !== undefined);
    expect(figures).toHaveLength(17);
    for (const f of figures) {
      expect(f.named).toBe(true);
      expect(f.id).toBe(f.npc);
      expect(f.sprite).toBe(`figure_${f.id}`);
    }
    expect(data.allyVillages.flatMap((v) => v.figures ?? [])).toHaveLength(17);
    const chars = characterIds(data);
    for (const f of figures) expect(chars.has(f.id)).toBe(true);
  });

  it('une figure est liée à un ennemi par une scène ou comme interlocutrice', () => {
    expect(figureLinked(data, 'ilar', ['brakk'])).toBe(true);
    expect(figureLinked(data, 'dorn', ['hobb'])).toBe(true); // interlocuteur de Hobb
    expect(figureLinked(data, 'ilar', ['ecumeur_sabreur'])).toBe(false);
    expect(figureLinked(data, 'ilar', [])).toBe(false);
  });

  it('un ennemi lié présent : la figure prend la place du premier garde, avec son nom', () => {
    const joins = plan('amical', ['brakk', 'ecumeur_sabreur']);
    const guards = joins.filter((j) => j.source === 'garde');
    expect(guards).toHaveLength(1);
    expect(guards[0]).toMatchObject({ template: 'ilar', errantId: 'ilar', turn: 2 });
    expect(guards[0]?.label).toContain('Capitaine Ilar');
    // À « Allié », deux gardes : les figures liées d'abord (Ilar puis Garrec, tous deux liés à Brakk), puis les gardes ordinaires.
    const two = plan('allie', ['brakk']).filter((j) => j.source === 'garde');
    expect(two.map((j) => j.template)).toEqual(['ilar', 'garrec']);
    expect(plan('allie', ['gorm']).filter((j) => j.source === 'garde').map((j) => j.template)).toEqual(['ilar', 'bran']);
  });

  it('sans ennemi lié, les gardes ordinaires viennent comme avant', () => {
    expect(plan('allie', ['ecumeur_sabreur']).filter((j) => j.source === 'garde').map((j) => j.template)).toEqual(['garde_haut_gue', 'milicien_haut_gue']);
  });

  it('une figure blessée reste chez elle ; plusieurs figures liées : la deuxième vient comme allié de passage', () => {
    expect(plan('amical', ['brakk'], undefined, { ilar: 0 }).filter((j) => j.source === 'garde')[0]?.template).toBe('garrec');
    expect(plan('amical', ['brakk'], undefined, { ilar: 0, garrec: 0 }).filter((j) => j.source === 'garde')[0]?.template).toBe('garde_haut_gue');
    // Gorm est lié à Ilar et à Bran : Ilar en garde, Bran de passage (à coup sûr dès Amical).
    const joins = plan('amical', ['gorm']);
    expect(joins.find((j) => j.source === 'garde')?.template).toBe('ilar');
    expect(joins.find((j) => j.source === 'passage')?.template).toBe('bran');
  });

  it('en combat, une figure est une unité alliée nommée, à l’apparence de son PNJ', () => {
    const encounter = findEncounter(data, 'camp_des_ecumeurs');
    const join = plan('amical', ['brakk']).find((j) => j.source === 'garde');
    expect(join).toBeDefined();
    const state = buildBattle(encounter, data.encounters.testParty, data, { seed: 2, world: testWorld().source, allies: join ? [join] : [] });
    const wave = state.reinforcements.find((r) => r.team === 'ally');
    expect(wave?.units[0]).toMatchObject({ charId: 'ilar', name: 'Capitaine Ilar', sprite: 'figure_ilar', team: 'ally' });
  });
});

describe('roster de 30, tri et filtre (n°199)', () => {
  it('la compagnie refuse une 31e recrue', () => {
    const progress = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions });
    progress.company = [];
    for (let i = 0; i < data.balance.levels.rosterMax; i++) progress.company.push(createMember(data, { id: `m${i}`, name: `M${i}`, class: 'lame_du_serment', level: 1 }));
    expect(companyFull(data, progress)).toBe(true);
    expect(joinCompany(data, progress, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' })).toBeNull();
    expect(progress.company).toHaveLength(30);
  });

  it('au village, un recrutement est refusé quand la compagnie est au complet (sans marquer la recrue)', () => {
    const ctx = makeCtx();
    ctx.progress.quests['colporteur_perdu'] = 'done';
    for (let i = ctx.progress.company.length; i < 30; i++) ctx.progress.company.push(createMember(data, { id: `m${i}`, name: `M${i}`, class: 'lame_du_serment', level: 1 }));
    const nessa = ctx.index.npcs.get('nessa')?.npc;
    expect(nessa).toBeDefined();
    if (!nessa) return;
    const recruit = visibleOptions(ctx, nessa).find((o) => o.option.kind === 'recruit');
    expect(recruit).toBeDefined();
    const out = selectOption(ctx, nessa, recruit?.index ?? 0);
    expect(out.type).toBe('say');
    if (out.type === 'say') expect(out.pages[0]).toContain('au complet');
    expect(ctx.progress.recruited).not.toContain('nessa');
  });

  it('tri : le héros toujours en tête ; niveau décroissant, classe puis nom, nom', () => {
    const party = [
      { name: 'Zoé', class: 'lame_du_serment', level: 3, hero: false },
      { name: 'Voyageur', class: 'gardien_des_marees', level: 2, hero: true },
      { name: 'Anne', class: 'porte_lanterne', level: 9, hero: false },
      { name: 'Bob', class: 'lame_du_serment', level: 5, hero: false },
    ];
    expect(rosterOrder(party, 'arrivee', null)).toEqual([1, 0, 2, 3]);
    expect(rosterOrder(party, 'niveau', null)).toEqual([1, 2, 3, 0]);
    expect(rosterOrder(party, 'classe', null)).toEqual([1, 3, 0, 2]);
    expect(rosterOrder(party, 'nom', null)).toEqual([1, 2, 3, 0]);
  });

  it('filtre par classe : le héros et les déployés restent visibles', () => {
    const party = [
      { name: 'Voyageur', class: 'gardien_des_marees', level: 2, hero: true },
      { name: 'Zoé', class: 'lame_du_serment', level: 3, hero: false },
      { name: 'Anne', class: 'porte_lanterne', level: 9, hero: false },
    ];
    expect(rosterOrder(party, 'arrivee', 'lame_du_serment')).toEqual([0, 1]);
    expect(rosterOrder(party, 'arrivee', 'lame_du_serment', new Set([2]))).toEqual([0, 1, 2]);
    expect(rosterClasses(party, data.classes.map((c) => c.id))).toEqual(['gardien_des_marees', 'lame_du_serment', 'porte_lanterne']);
  });
});

describe('Arène des Cendres (n°200)', () => {
  it('trois séries sur une carte fixe close, la première lève le drapeau de la quête de Dax', () => {
    for (const id of ['arene_serie_1', 'arene_serie_2', 'arene_serie_3']) {
      const e = findEncounter(data, id);
      expect(e.map).toBeDefined();
      expect(e.victoryFlags).toEqual([id]);
      const state = buildBattle(e, data.encounters.testParty, data, { seed: 1 });
      expect(state.units.filter((u) => u.team === 'enemy')).toHaveLength(e.enemies.length);
      // Aucune unité dans un mur.
      for (const u of state.units) expect(terrainAt(state.map, u.x, u.y).id).not.toBe('batiment');
    }
    expect(data.quests.find((q) => q.id === 'arene_des_cendres')?.steps[0]).toMatchObject({ kind: 'flag', flag: 'arene_serie_1' });
    expect(findEncounter(data, 'arene_serie_3').rewards?.items).toEqual([{ item: 'sceau_de_maitrise', qty: 1 }]);
  });

  it('Dax propose la série en cours : la première quand la quête est acceptée, puis la suivante après chaque victoire', () => {
    const ctx = makeCtx();
    const dax = ctx.index.npcs.get('dax')?.npc;
    expect(dax).toBeDefined();
    if (!dax) return;
    const battles = () => visibleOptions(ctx, dax).filter((o) => o.option.kind === 'battle').map((o) => (o.option.kind === 'battle' ? o.option.encounter : ''));
    expect(battles()).toEqual([]);
    ctx.progress.quests['arene_des_cendres'] = 'active';
    expect(battles()).toEqual(['arene_serie_1']);
    const first = visibleOptions(ctx, dax).find((o) => o.option.kind === 'battle');
    const out = selectOption(ctx, dax, first?.index ?? 0);
    expect(out).toMatchObject({ type: 'battle', encounterId: 'arene_serie_1' });
    ctx.flags.push('arene_serie_1');
    ctx.progress.quests['arene_des_cendres'] = 'done';
    expect(battles()).toEqual(['arene_serie_2']);
    ctx.flags.push('arene_serie_2');
    expect(battles()).toEqual(['arene_serie_3']);
    ctx.flags.push('arene_serie_3');
    expect(battles()).toEqual([]);
    expect(conditionMet(ctx, { flag: 'arene_serie_3' }, 'neutre')).toBe(true);
  });
});

describe('Orvane et Ser Maëlis (n°194, n°195)', () => {
  it('Orvane est un boss à deux phases, au cœur de la Citadelle, qui lève boss_orvane', () => {
    const boss = data.bosses.find((b) => b.enemy === 'orvane');
    expect(boss?.immune).toEqual(['gel', 'entrave']);
    expect(boss?.phase2.skills).toContain('nuit_basse');
    const e = findEncounter(data, 'roi_maree_brise');
    expect(e.objective.type).toBe('boss');
    expect(e.victoryFlags).toEqual(['boss_orvane']);
    expect(e.reinforcements?.map((r) => r.turn)).toEqual([3, 6]);
    expect(data.worldFoes.find((f) => f.id === 'z5_orvane')).toMatchObject({ kind: 'boss', encounter: 'roi_maree_brise' });
  });

  it('Ser Maëlis garde la chaussée, n’est pas recrutable et ne surgit jamais au hasard', () => {
    const maelis = data.named.find((n) => n.id === 'maelis');
    expect(maelis?.recruit).toBeUndefined();
    expect(maelis?.pop).toBe(false);
    expect(data.worldFoes.find((f) => f.named === 'maelis')).toMatchObject({ zone: 'z5', kind: 'sentinelle' });
  });

  it('Orvane n’attend au trône qu’une fois Ser Maëlis tombée (combat obligatoire, n°194)', () => {
    const orvane = data.worldFoes.find((f) => f.id === 'z5_orvane') as (typeof data.worldFoes)[number];
    const ctx = makeCtx();
    expect(foePresent(ctx, orvane)).toBe(false);
    ctx.progress.named['maelis'] = 'defeated';
    expect(foePresent(ctx, orvane)).toBe(true);
  });
});

describe('scènes écrites (n°203)', () => {
  it('chaque lien de la bible a sa scène : boss, recrutables (Parler avec refus), non recrutables, figures', () => {
    const has = (enemy: string, unit: string, kind: string) => data.scenes.some((s) => s.enemy === enemy && s.kind === kind && s.units.includes(unit));
    const links: [string, string, string][] = [
      ['brakk', 'ilar', 'battle'], ['brakk', 'garrec', 'battle'], ['brakk', 'rik', 'battle'],
      ['roi_cerf', 'mousse', 'phase'], ['roi_cerf', 'sylve', 'death'],
      ['soeur_merrow', 'dorn', 'death'], ['soeur_merrow', 'odo', 'phase'], ['soeur_merrow', 'tiphaine', 'battle'],
      ['mere_harpie', 'yrsa', 'phase'], ['gardien_de_cendre', 'tobias', 'death'],
      ['orvane', 'rhyel', 'phase'], ['orvane', 'heros', 'death'], ['orvane', 'cendrine', 'battle'],
      ['oswin', 'ysolde', 'talk'], ['oswin', 'mousse', 'talk'], ['hobb', 'corbin', 'talk'], ['hobb', 'dorn', 'talk'],
      ['ilse', 'ilmea', 'talk'], ['orsen', 'zephyrin', 'talk'], ['alderic', 'alden', 'talk'],
      ['hakon', 'orin', 'battle'], ['aldo', 'lia', 'battle'], ['drak', 'kael', 'battle'], ['veilleur_de_pierre', 'gerard', 'death'],
      ['maelis', 'rhyel', 'death'], ['gorm', 'bran', 'battle'], ['orsen', 'lorn', 'battle'],
    ];
    for (const [e, u, k] of links) expect(has(e, u, k), `${e} × ${u} (${k})`).toBe(true);
    // Chaque boss et chaque nommé a une citation de mort générique.
    for (const b of data.bosses) expect(data.scenes.some((s) => s.enemy === b.enemy && s.kind === 'death' && s.units.length === 0), b.enemy).toBe(true);
    for (const n of data.named) expect(data.scenes.some((s) => s.enemy === n.id && s.kind === 'death' && s.units.length === 0), n.id).toBe(true);
    // Chaque scène « talk » a son refus ; chaque errant a une scène.
    for (const s of data.scenes.filter((x) => x.kind === 'talk')) expect(s.onFail?.length ?? 0, s.id).toBeGreaterThan(0);
    for (const w of data.wanderers) expect(data.scenes.some((s) => s.units.includes(w.template)), w.id).toBe(true);
  });

  it('répliques courtes : au plus 140 caractères, 1 à 5 par scène', () => {
    for (const s of data.scenes) {
      expect(s.lines.length, s.id).toBeLessThanOrEqual(5);
      for (const l of [...s.lines, ...(s.onFail ?? [])]) expect(l.text.length, `${s.id} : ${l.text}`).toBeLessThanOrEqual(140);
    }
  });
});

describe('fins de l’histoire (n°196)', () => {
  const ctxWith = (reps: Record<string, number>): GameCtx => {
    const ctx = makeCtx();
    for (const [k, v] of Object.entries(reps)) ctx.progress.reputation[k] = v;
    return ctx;
  };

  it('la lanterne : Marées ≥ Amical et Rhyel déployé debout ; sinon la digue si Couronne ≥ Allié et Marées < Amical ; sinon la nuit basse', () => {
    expect(chooseEnding(ctxWith({ marees: 30 }), ['heros', 'rhyel']).id).toBe('lanterne');
    expect(chooseEnding(ctxWith({ marees: 30 }), ['heros']).id).toBe('nuit_basse');
    expect(chooseEnding(ctxWith({ marees: 30, couronne: 60 }), ['heros']).id).toBe('nuit_basse');
    expect(chooseEnding(ctxWith({ marees: 10, couronne: 60 }), ['heros', 'rhyel']).id).toBe('digue');
    expect(chooseEnding(ctxWith({ marees: -30, couronne: 90 }), []).id).toBe('digue');
    expect(chooseEnding(ctxWith({}), []).id).toBe('nuit_basse');
  });

  it('seule la victoire sur Orvane règle une fin ; elle lève son drapeau une seule fois', () => {
    const ctx = ctxWith({ marees: 40 });
    expect(settleEnding(ctx, { victoryFlags: ['boss_brakk'], aliveDeployed: ['heros'] })).toBeNull();
    const first = settleEnding(ctx, { victoryFlags: ['boss_orvane'], aliveDeployed: ['heros', 'rhyel'] });
    expect(first?.id).toBe('lanterne');
    expect(ctx.flags).toContain('fin_lanterne');
    expect(endingReached(data, ctx.flags)?.id).toBe('lanterne');
    expect(settleEnding(ctx, { victoryFlags: ['boss_orvane'], aliveDeployed: [] })).toBeNull();
  });

  it('les fins sont des données : le drapeau final est celui de la rencontre d’Orvane, la dernière fin est la fin par défaut', () => {
    expect(data.endings.finalFlag).toBe('boss_orvane');
    expect(findEncounter(data, 'roi_maree_brise').victoryFlags).toContain(data.endings.finalFlag);
    expect(data.endings.endings.map((e) => e.id)).toEqual(['lanterne', 'digue', 'nuit_basse']);
    expect(data.endings.endings[2]?.when).toBeUndefined();
  });
});

describe('saluts de village selon l’arc des recrues (n°201)', () => {
  const npc = (id: string) => data.locations.flatMap((l) => l.npcs).find((n) => n.id === id) as NonNullable<ReturnType<typeof data.locations.flatMap<(typeof data.locations)[number]['npcs'][number]>>[number]>;

  it('chaque PNJ qui a un lien avec un nommé ou un boss change de salut après l’événement', () => {
    const withVariants = data.locations.flatMap((l) => l.npcs).filter((n) => (n.greetings ?? []).length > 0).map((n) => n.id);
    expect(withVariants.length).toBeGreaterThanOrEqual(20);
    for (const id of ['maelys', 'thom', 'ilar', 'sylve', 'orin', 'dorn', 'marthe', 'hild', 'voss', 'dax', 'ysmene']) expect(withVariants).toContain(id);
  });

  it('Marthe salue selon le sort de Hobb ; Ilar selon celui de Rik ; Thom après Gorm', () => {
    const ctx = makeCtx();
    const base = greetingFor(ctx, npc('marthe')).pages[0];
    ctx.progress.named['hobb'] = 'recruited';
    const back = greetingFor(ctx, npc('marthe'));
    expect(back.pages[0]).not.toBe(base);
    expect(back.pages[0]).toContain('Hobb');
    expect(back.expression).toBe('content');
    ctx.progress.named['hobb'] = 'lost';
    expect(greetingFor(ctx, npc('marthe')).expression).toBe('triste');
    expect(greetingFor(makeCtx(), npc('ilar')).pages[0]).not.toContain('Rik');
    ctx.progress.named['rik'] = 'recruited';
    expect(greetingFor(ctx, npc('ilar')).pages[0]).toContain('Rik');
    ctx.progress.named['gorm'] = 'defeated';
    expect(greetingFor(ctx, npc('thom')).pages[0]).toContain('Gorm');
  });

  it('les drapeaux de boss et de fin changent les saluts ; le premier salut vrai l’emporte', () => {
    const ctx = makeCtx();
    ctx.flags.push('boss_brakk');
    expect(greetingFor(ctx, npc('maelys')).pages[0]).toContain('Brakk');
    ctx.flags.push('fin_lanterne');
    expect(greetingFor(ctx, npc('maelys')).pages[0]).toContain('lanterne');
    expect(greetingFor(ctx, npc('ysmene')).pages[0]).toContain('pacte');
    expect(conditionMet(ctx, { named: { id: 'hobb', status: 'pending' } }, 'neutre')).toBe(true);
    ctx.progress.named['hobb'] = 'defeated';
    expect(conditionMet(ctx, { named: { id: 'hobb', status: 'pending' } }, 'neutre')).toBe(false);
  });
});
