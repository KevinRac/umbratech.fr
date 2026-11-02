/**
 * Jalon M9 : sauvegarde (GDD §14, décisions n°151 à n°169).
 *
 * Le cœur de ce fichier est l'aller-retour sauvegarde → chargement après
 * chaque type d'événement : tout l'état (`WorldState`, `Progress`, session)
 * doit revenir à l'identique.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { getLastDeployed, getLoadouts, getSessionState, setLastDeployed, setSessionState } from '../src/core/session';
import { localStore, deleteSlot, latestSlot, listSlots, readSlot, writeSlot, type SaveStore } from '../src/core/saves';
import type { StorageWriteResult } from '../src/core/storage';
import {
  acceptQuest,
  applyClassicLosses,
  buildTownIndex,
  buy,
  changeReputation,
  completeQuest,
  enterLocation,
  joinCompany,
  newProgress,
  selectOption,
  startingCompany,
  visibleOptions,
  type GameCtx,
} from '../src/logic/game';
import { evolveMember, SEAL_ITEM } from '../src/logic/progression/evolutions';
import {
  backupKey,
  buildEnvelope,
  canonicalJson,
  checksumOf,
  decodeSave,
  encodeEnvelope,
  envelopeChecksum,
  fnv1a32,
  formatPlayTime,
  migrate,
  MigrationError,
  restoreGame,
  SAVE_KEYS,
  SAVE_VERSION,
  snapshotGame,
  summarize,
  type RawEnvelope,
  type SaveEnvelope,
  type SessionState,
} from '../src/logic/save';
import { applyBattleProgress, applyErrantProgress } from '../src/logic/units/company';
import type { WorldState } from '../src/logic/world/worldState';
import { makeBattle, plains, unit } from './helpers/battle';

const data = loadGameData();
const index = buildTownIndex(data);
const NOW = '2026-11-02T21:30:00.000Z';

/* ---------- Une partie d'essai ---------- */

function newGame(mode: 'blessure' | 'classique' = 'blessure'): { world: WorldState; session: SessionState; ctx: GameCtx } {
  const progress = newProgress({ balance: data.balance, locations: data.locations, factions: data.factions, mode });
  progress.company = startingCompany(data, 'lame_du_serment');
  const world: WorldState = { player: { x: 520.5, y: 812, facing: 's' }, openFlags: [], discoveredZones: ['z1'], discoveredLocations: [], progress, gameId: 'partie-essai', playMs: 0 };
  const session: SessionState = { loadouts: {}, lastDeployed: null };
  const ctx: GameCtx = { data, index, progress, flags: world.openFlags, discovered: world.discoveredLocations };
  return { world, session, ctx };
}

function envelopeOf(world: WorldState, session: SessionState, savedAt = NOW): SaveEnvelope {
  return buildEnvelope(snapshotGame(world, session), summarize(world, data, 'Haut-Gué'), savedAt);
}

/** Sauvegarde, texte, relecture, restauration : l'état revenu doit être identique à l'original. */
function roundTrip(world: WorldState, session: SessionState): { world: WorldState; session: SessionState } {
  const text = encodeEnvelope(envelopeOf(world, session));
  const decoded = decodeSave(text, data);
  if (!decoded.ok) throw new Error(`${decoded.kind} : ${decoded.message}`);
  expect(decoded.warnings).toEqual([]);
  const back = restoreGame(decoded.save.data);
  const { testLevel: _ignored, ...expected } = world;
  expect(back.world).toEqual(expected);
  const members = new Set(world.progress.company.map((m) => m.id));
  expect(back.session.loadouts).toEqual(Object.fromEntries(Object.entries(session.loadouts).filter(([id]) => members.has(id))));
  expect(back.session.lastDeployed).toEqual(session.lastDeployed);
  return back;
}

/* ---------- Magasin en mémoire (localStorage simulé, avec quota) ---------- */

function memoryStore(quotaChars = Infinity): SaveStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    read: (key) => map.get(key) ?? null,
    write: (key, text): StorageWriteResult => {
      const used = [...map].reduce((n, [k, v]) => n + (k === key ? 0 : v.length), 0);
      if (used + text.length > quotaChars) return { ok: false, reason: 'quota', message: 'quota' };
      map.set(key, text);
      return { ok: true };
    },
    remove: (key) => void map.delete(key),
  };
}

/* ---------- Tests ---------- */

describe('somme de contrôle (n°151)', () => {
  it('ne dépend pas de l’ordre des clés et change au moindre octet', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { f: 1, e: 2 }], c: 2 } })).toBe('{"a":{"c":2,"d":[3,{"e":2,"f":1}]},"b":1}');
    expect(checksumOf({ a: 1, b: 2 })).toBe(checksumOf({ b: 2, a: 1 }));
    expect(checksumOf({ a: 1 })).not.toBe(checksumOf({ a: 2 }));
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
  });
});

describe('aller-retour sauvegarde → chargement, après chaque type d’événement', () => {
  it('nouvelle partie', () => {
    const { world, session } = newGame();
    roundTrip(world, session);
  });

  it('combat gagné : niveaux, XP, stats tirées, errants, ennemi vaincu, drapeau, or', () => {
    const { world, session } = newGame();
    const p = world.progress;
    const s = makeBattle(plains(6, 2), p.company.map((m, i) => ({ class: m.class, at: [i, 0] as [number, number], level: m.level, hero: m.hero })), [{ enemy: 'ecumeur_sabreur', at: [5, 1] }]);
    s.units.filter((u) => u.team === 'player').forEach((u, i) => Object.assign(u, { memberIndex: i, xp: 40 + i, level: u.level + 1, gains: { pv: 1, fo: 1, vit: i } }));
    applyBattleProgress(p.company, s.units, p.day);
    p.errants['aldric'] = { level: 4, xp: 55 };
    p.foes['z1_rodeur_plaine'] = { day: 1, clock: 120000.5, visits: 2 };
    world.openFlags.push('boss_brakk');
    p.gold += 137;
    p.company[0]!.counters['oathsKept'] = 3;
    world.playMs = 754321;
    session.lastDeployed = p.company.map((m) => m.id);
    session.loadouts[p.company[0]!.id] = { weapon: 'epee_de_fer', accessory: null, items: [{ item: 'potion', qty: 2 }] };
    expect(applyErrantProgress).toBeTypeOf('function');
    roundTrip(world, session);
  });

  it('défaite : réveil au dernier village, or perdu, blessés', () => {
    const { world, session } = newGame();
    const p = world.progress;
    p.lastVillage = 'haut_gue';
    p.gold = Math.floor(p.gold * 0.9);
    p.company[1]!.woundedDay = p.day;
    p.wounded = { brune: 1 };
    world.player.x = 300;
    world.player.y = 410;
    world.player.facing = 'nw';
    roundTrip(world, session);
  });

  it('entrée et sortie d’un village : décroissance, lieux et zones découverts', () => {
    const { world, session, ctx } = newGame();
    changeReputation(ctx.progress, 'haut_gue', 60, data.reputation);
    enterLocation(ctx.progress, 'haut_gue', data.reputation);
    enterLocation(ctx.progress, 'haut_gue', data.reputation);
    world.discoveredLocations.push('haut_gue', 'autel_aubemer');
    world.discoveredZones.push('z2');
    world.progress.zoneVisits = 3;
    world.progress.clock = 98765.25;
    roundTrip(world, session);
  });

  it('fin d’une quête : récompenses, quêtes, réputation, sujets entendus', () => {
    const { world, session, ctx } = newGame();
    acceptQuest(ctx, 'farine_volee');
    world.openFlags.push('boss_brakk');
    completeQuest(ctx, 'farine_volee');
    expect(world.progress.quests['farine_volee']).toBe('done');
    world.progress.heard.push('maelys#2');
    world.progress.rewarded.push('haut_gue:boss_brakk');
    roundTrip(world, session);
  });

  it('repos à l’auberge : jour suivant, dons du jour', () => {
    const { world, session } = newGame();
    world.progress.day += 2;
    world.progress.donated['valcendre'] = { day: 3, total: 9 };
    roundTrip(world, session);
  });

  it('achat limité, recrue, évolution, passive et serment', () => {
    const { world, session, ctx } = newGame();
    const p = world.progress;
    p.gold = 5000;
    expect(buy(ctx, 'raretes_de_lorn', SEAL_ITEM).ok).toBe(true);
    expect(p.bought).toEqual({ 'raretes_de_lorn:sceau_de_maitrise': 1 });
    joinCompany(data, p, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' });
    const hero = p.company[0]!;
    hero.level = 10;
    hero.counters['oathsKept'] = 5;
    expect(evolveMember({ data, progress: p, discovered: [] }, hero, 'champion_du_serment')).toBeNull();
    hero.oath = 'intouchable';
    hero.passive = data.classes.find((c) => c.id === hero.class)!.passives[1]!.id;
    const back = roundTrip(world, session);
    expect(back.world.progress.company[0]).toMatchObject({ evolution: 'champion_du_serment', levelCap: 30, oath: 'intouchable' });
  });

  it('mode Classique : unités perdues', () => {
    const { world, session } = newGame('classique');
    const p = world.progress;
    p.fallen.push('nessa');
    const back = roundTrip(world, session);
    expect(back.world.progress).toMatchObject({ mode: 'classique', fallen: ['nessa'] });
  });

  it('le niveau d’essai du debug n’est pas sauvé', () => {
    const { world, session } = newGame();
    world.testLevel = 9;
    const back = restoreGame(snapshotGame(world, session));
    expect(back.world.testLevel).toBeUndefined();
  });

  it('une partie à 30 membres pèse bien moins de 200 Ko (GDD §14.2)', () => {
    const { world, session } = newGame();
    for (let i = 0; i < 27; i++) world.progress.company.push({ ...structuredClone(world.progress.company[1]!), id: `recrue_${i}`, name: `Recrue ${i}` });
    for (const m of world.progress.company) session.loadouts[m.id] = { weapon: 'epee_de_fer', accessory: 'amulette_de_pierre', items: [{ item: 'potion', qty: 3 }] };
    for (const f of data.worldFoes) world.progress.foes[f.id] = { day: 12, clock: 3600000, visits: 40 };
    const size = encodeEnvelope(envelopeOf(world, session)).length;
    expect(size).toBeLessThan(200 * 1024);
    expect(size).toBeLessThan(80 * 1024);
  });
});

describe('contrôles du chargement (n°156)', () => {
  const good = (): SaveEnvelope => envelopeOf(newGame().world, newGame().session);

  it('JSON coupé, autre jeu, somme fausse, version future, champ manquant', () => {
    const text = encodeEnvelope(good());
    expect(decodeSave(text.slice(0, 200), data)).toMatchObject({ ok: false, kind: 'json' });
    expect(decodeSave('[]', data)).toMatchObject({ ok: false, kind: 'json' });
    expect(decodeSave(JSON.stringify({ ...good(), game: 'autre' }), data)).toMatchObject({ ok: false, kind: 'game' });

    const tampered = good();
    tampered.data.world.progress.gold = 999999;
    expect(decodeSave(encodeEnvelope(tampered), data)).toMatchObject({ ok: false, kind: 'checksum' });

    const future = good() as unknown as Record<string, unknown>;
    future['saveVersion'] = SAVE_VERSION + 1;
    future['checksum'] = envelopeChecksum(future);
    const res = decodeSave(JSON.stringify(future), data);
    expect(res).toMatchObject({ ok: false, kind: 'future' });
    expect(!res.ok && res.message).toMatch(/plus récente/);

    const broken = good() as unknown as { data: { world: { progress: Record<string, unknown> } }; checksum: string };
    delete broken.data.world.progress['gold'];
    broken.checksum = envelopeChecksum(broken as unknown as Record<string, unknown>);
    const missing = decodeSave(JSON.stringify(broken), data);
    expect(missing).toMatchObject({ ok: false, kind: 'schema' });
    expect(!missing.ok && missing.message).toMatch(/progress\.gold/);
  });

  it('une référence inconnue est ignorée avec un avertissement, la somme suit', () => {
    const { world, session } = newGame();
    world.progress.inventory.push({ item: 'objet_disparu', qty: 2 });
    world.progress.quests['quete_disparue'] = 'active';
    world.progress.company[1]!.evolution = 'evolution_disparue';
    session.loadouts['heros'] = { weapon: 'arme_disparue', accessory: null, items: [{ item: 'potion', qty: 1 }] };
    session.loadouts['parti'] = { weapon: null, accessory: null, items: [] };
    const res = decodeSave(encodeEnvelope(envelopeOf(world, session)), data);
    if (!res.ok) throw new Error(res.message);
    expect(res.warnings.length).toBe(3);
    expect(res.save.data.world.progress.inventory.some((s) => s.item === 'objet_disparu')).toBe(false);
    expect(res.save.data.world.progress.quests['quete_disparue']).toBeUndefined();
    expect(res.save.data.world.progress.company[1]!.evolution).toBeNull();
    expect(res.save.data.session.loadouts['heros']!.weapon).toBeNull();
    expect(res.save.data.session.loadouts['parti']).toBeUndefined();
    // Réécrite telle quelle, elle se relit sans erreur.
    expect(decodeSave(encodeEnvelope(res.save), data).ok).toBe(true);
  });

  it('un héros de classe inconnue rend la partie inchargeable', () => {
    const { world, session } = newGame();
    world.progress.company[0]!.class = 'classe_disparue';
    expect(decodeSave(encodeEnvelope(envelopeOf(world, session)), data)).toMatchObject({ ok: false, kind: 'content' });
  });
});

describe('migrations successives (n°158)', () => {
  const v1 = (): RawEnvelope => ({ saveVersion: 1, meta: { a: 1 }, data: { list: [] as number[] } });
  const registry = {
    1: (e: RawEnvelope): RawEnvelope => ({ ...e, saveVersion: 2, data: { ...(e.data as object), deux: true } }),
    2: (e: RawEnvelope): RawEnvelope => ({ ...e, saveVersion: 3, meta: { ...(e.meta as object), b: 2 } }),
  };

  it('portent une v1 jusqu’à la version visée, pas à pas, sans toucher à l’original', () => {
    const original = v1();
    const out = migrate(original, 3, registry);
    expect(out).toEqual({ saveVersion: 3, meta: { a: 1, b: 2 }, data: { list: [], deux: true } });
    expect(original.saveVersion).toBe(1);
    expect(migrate(original, 1, registry)).toEqual(original);
  });

  it('une marche manquante ou fausse est une erreur claire', () => {
    expect(() => migrate(v1(), 3, { 1: registry[1] })).toThrow(MigrationError);
    expect(() => migrate(v1(), 2, { 1: (e) => ({ ...e, saveVersion: 5 }) })).toThrow(/version 2/);
  });

  it('decodeSave applique les migrations puis contrôle le résultat', () => {
    const env = envelopeOf(newGame().world, newGame().session) as unknown as RawEnvelope;
    const next = SAVE_VERSION + 1;
    const res = decodeSave(JSON.stringify(env), data, { version: next, migrations: { [SAVE_VERSION]: (e) => ({ ...e, saveVersion: next }) } });
    expect(res).toMatchObject({ ok: true, migratedFrom: SAVE_VERSION });
    expect(decodeSave(JSON.stringify(env), data, { version: next, migrations: {} })).toMatchObject({ ok: false, kind: 'migration' });
  });

  it('la sauvegarde v1 figée se charge toujours (tests/fixtures/save-v1.json)', () => {
    const text = readFileSync(resolve(import.meta.dirname, 'fixtures', 'save-v1.json'), 'utf8');
    const res = decodeSave(text, data);
    if (!res.ok) throw new Error(`${res.kind} : ${res.message}`);
    expect(res.save.data.world.progress.company.length).toBeGreaterThan(0);
    expect(res.save.meta.heroName).toBeTruthy();
    // v1 → v2 (dialogues de combat, n°189) : champs vides ajoutés.
    expect(res.migratedFrom).toBe(1);
    expect(res.save.saveVersion).toBe(2);
    expect(res.save.data.world.progress).toMatchObject({ scenesSeen: [], named: {}, namedPity: 0 });
  });

  it('les scènes vues et le sort des nommés font l’aller-retour ; ceux qui ont disparu sont oubliés', () => {
    const g = newGame();
    Object.assign(g.world.progress, { scenesSeen: ['gorm_nessa', 'scene_disparue'], named: { rik: 'recruited', gorm: 'defeated', fantome: 'lost' }, namedPity: 5 });
    const res = decodeSave(encodeEnvelope(envelopeOf(g.world, g.session)), data);
    if (!res.ok) throw new Error(res.message);
    expect(res.save.data.world.progress).toMatchObject({ scenesSeen: ['gorm_nessa'], named: { rik: 'recruited', gorm: 'defeated' }, namedPity: 5 });
  });
});

describe('emplacements : copie de secours et quota (n°157)', () => {
  it('l’ancienne version passe en copie de secours ; une principale abîmée est remplacée par la copie', () => {
    const store = memoryStore();
    const g = newGame();
    expect(writeSlot(SAVE_KEYS.slot1, envelopeOf(g.world, g.session, '2026-11-02T10:00:00.000Z'), data, store).ok).toBe(true);
    expect(store.map.has(backupKey(SAVE_KEYS.slot1))).toBe(false);
    g.world.progress.gold = 4321;
    writeSlot(SAVE_KEYS.slot1, envelopeOf(g.world, g.session, '2026-11-02T11:00:00.000Z'), data, store);
    expect(JSON.parse(store.map.get(backupKey(SAVE_KEYS.slot1))!).savedAt).toBe('2026-11-02T10:00:00.000Z');

    store.map.set(SAVE_KEYS.slot1, store.map.get(SAVE_KEYS.slot1)!.slice(0, 300));
    const entry = readSlot(SAVE_KEYS.slot1, data, store);
    expect(entry.state).toBe('restored');
    expect(entry.state === 'restored' && entry.message).toMatch(/copie précédente/);
    expect(JSON.parse(store.map.get(SAVE_KEYS.slot1)!).savedAt).toBe('2026-11-02T10:00:00.000Z');
  });

  it('principale et copie abîmées : emplacement illisible, à supprimer', () => {
    const store = memoryStore();
    store.map.set(SAVE_KEYS.slot2, '{oups');
    store.map.set(backupKey(SAVE_KEYS.slot2), '{oups');
    const entry = readSlot(SAVE_KEYS.slot2, data, store);
    expect(entry).toMatchObject({ state: 'broken' });
    expect(entry.state === 'broken' && entry.message).toMatch(/illisible/);
    deleteSlot(SAVE_KEYS.slot2, store);
    expect(store.map.size).toBe(0);
    expect(readSlot(SAVE_KEYS.slot2, data, store).state).toBe('empty');
  });

  it('quota dépassé : rien n’est écrasé et le message le dit', () => {
    const g = newGame();
    const first = envelopeOf(g.world, g.session, '2026-11-02T10:00:00.000Z');
    const store = memoryStore(encodeEnvelope(first).length * 2 + 10);
    expect(writeSlot(SAVE_KEYS.slot1, first, data, store).ok).toBe(true);
    for (let i = 0; i < 30; i++) g.world.progress.heard.push(`sujet_long_numero_${i}_pour_grossir_la_sauvegarde`);
    const res = writeSlot(SAVE_KEYS.slot1, envelopeOf(g.world, g.session, '2026-11-02T11:00:00.000Z'), data, store);
    expect(res).toMatchObject({ ok: false });
    expect(!res.ok && res.message).toMatch(/Espace de stockage plein/);
    expect(JSON.parse(store.map.get(SAVE_KEYS.slot1)!).savedAt).toBe('2026-11-02T10:00:00.000Z');
  });

  it('« Continuer » prend la plus récente des sauvegardes lisibles', () => {
    const store = memoryStore();
    const g = newGame();
    writeSlot(SAVE_KEYS.slot1, envelopeOf(g.world, g.session, '2026-11-02T09:00:00.000Z'), data, store);
    writeSlot(SAVE_KEYS.auto, envelopeOf(g.world, g.session, '2026-11-02T12:00:00.000Z'), data, store);
    writeSlot(SAVE_KEYS.slot3, envelopeOf(g.world, g.session, '2026-11-02T11:00:00.000Z'), data, store);
    store.map.set(SAVE_KEYS.slot2, 'abîmé');
    expect(latestSlot(data, store)?.key).toBe(SAVE_KEYS.auto);
    expect(listSlots(data, store).map((s) => s.state)).toEqual(['ok', 'ok', 'broken', 'ok']);
  });

  it('sans localStorage (Node), rien ne lève', () => {
    expect(readSlot(SAVE_KEYS.slot1, data, localStore).state).toBe('empty');
  });
});

describe('résumé des emplacements', () => {
  it('héros, classe, niveau, lieu, mode et temps de jeu', () => {
    const { world } = newGame('classique');
    world.playMs = 2 * 3600000 + 14 * 60000 + 5000;
    expect(summarize(world, data, 'Forêt-Racine')).toMatchObject({ heroName: data.company.hero.name, heroClass: 'Lame du Serment', evolution: null, heroLevel: 2, place: 'Forêt-Racine', mode: 'classique', companySize: 3 });
    expect(formatPlayTime(world.playMs)).toBe('2 h 14');
    expect(formatPlayTime(37 * 60000)).toBe('37 min');
  });
});

describe('mode Classique (n°167)', () => {
  function battleWithCompany(world: WorldState) {
    const p = world.progress;
    const s = makeBattle(plains(8, 2), p.company.map((m, i) => ({ class: m.class, at: [i, 0] as [number, number], level: m.level, hero: m.hero })), [{ enemy: 'ecumeur_sabreur', at: [7, 1] }]);
    s.units.filter((u) => u.team === 'player').forEach((u, i) => Object.assign(u, { memberIndex: i }));
    return s;
  }

  it('un membre tombé est perdu, son équipement oublié, son village perd 3 de réputation ; le héros reste', () => {
    const { world, session } = newGame('classique');
    const p = world.progress;
    joinCompany(data, p, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' });
    session.loadouts['nessa'] = { weapon: 'dagues_jumelles', accessory: null, items: [] };
    const s = battleWithCompany(world);
    unit(s, 'p0').hp = 0; // le héros : défaite, mais jamais perdu
    unit(s, 'p3').hp = 0; // Nessa
    const repBefore = p.reputation['haut_gue']!;
    applyBattleProgress(p.company, s.units, p.day);
    const losses = applyClassicLosses(data, p, s.units, session.loadouts);
    expect(losses.map((l) => l.member.id)).toEqual(['nessa']);
    expect(losses[0]!.reputation).toMatchObject({ target: 'haut_gue', before: repBefore, after: repBefore - 3 });
    expect(p.company.map((m) => m.id)).not.toContain('nessa');
    expect(p.company[0]!.hero).toBe(true);
    expect(p.fallen).toEqual(['nessa']);
    expect(session.loadouts['nessa']).toBeUndefined();
    // Elle ne peut pas revenir.
    expect(joinCompany(data, p, { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' })).toBeNull();
    roundTrip(world, session);
  });

  it('en mode « blessure », rien n’est perdu', () => {
    const { world, session } = newGame('blessure');
    const s = battleWithCompany(world);
    unit(s, 'p1').hp = 0;
    expect(applyClassicLosses(data, world.progress, s.units, session.loadouts)).toEqual([]);
    expect(world.progress.company.length).toBe(3);
  });
});

describe('sauvegarde chez l’aubergiste (n°161)', () => {
  it('les trois aubergistes proposent « Sauvegarder la partie », qui ouvre les emplacements', () => {
    const { ctx } = newGame();
    for (const id of ['maelys', 'hild', 'rosalind']) {
      const npc = index.npcs.get(id)!.npc;
      const option = visibleOptions(ctx, npc).find((o) => o.option.kind === 'save');
      expect(option?.label).toBe('Sauvegarder la partie');
      const outcome = selectOption(ctx, npc, option!.index);
      expect(outcome.type).toBe('save');
      expect(outcome.type === 'save' && outcome.pages.length).toBeGreaterThan(0);
    }
  });
});

describe('session indexée par membre (n°154)', () => {
  it('l’équipement suit le membre, pas son rang ; la session se sauve et se restaure', () => {
    setSessionState(null);
    const [a, b] = getLoadouts(['heros', 'odran']);
    a!.weapon = 'epee_de_fer';
    b!.accessory = 'amulette_de_pierre';
    // Une recrue arrive, l'ordre change : rien n'est perdu.
    const [n, h, o] = getLoadouts(['nessa', 'heros', 'odran']);
    expect(n).toEqual({ weapon: null, accessory: null, items: [] });
    expect(h!.weapon).toBe('epee_de_fer');
    expect(o!.accessory).toBe('amulette_de_pierre');
    setLastDeployed(['odran', 'heros']);
    const snap = snapshotGame(newGame().world, getSessionState());
    expect(snap.session.lastDeployed).toEqual(['odran', 'heros']);
    expect(snap.session.loadouts['heros']!.weapon).toBe('epee_de_fer');
    expect(snap.session.loadouts['nessa']).toBeUndefined(); // pas dans la compagnie de cette partie
    setSessionState(null);
    expect(getLastDeployed()).toBeNull();
    setSessionState(restoreGame(snap).session);
    expect(getLoadouts(['heros'])[0]!.weapon).toBe('epee_de_fer');
    setSessionState(null);
  });
});
