/**
 * Parcours principal Z1 → Z5 en logique pure (jalon M7, décision n°202) : la
 * chaîne des boss ouvre les passages, les quêtes principales se bouclent, la
 * Citadelle demande la barque de Dorn et la confiance de Pierre-Haute, Ser
 * Maëlis garde la chaussée, Orvane tombe et une fin est réglée. C'est le critère
 * de validation de M7 : « parcours sans bug bloquant ».
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { answer, selectOption, visibleOptions } from '../src/logic/game/dialogue';
import { chooseEnding, endingReached, settleEnding } from '../src/logic/game/ending';
import { foePresent, settleBattle } from '../src/logic/game/foeRules';
import { completeQuest, questStatus } from '../src/logic/game/quests';
import { newProgress } from '../src/logic/game/progress';
import { buildTownIndex, type GameCtx } from '../src/logic/game';
import { findEncounter } from '../src/logic/tactics/encounter';
import { gateRequirements, isGateOpen } from '../src/logic/world/collision';
import type { EncounterDef } from '../src/data/schemas';

const data = loadGameData();
const index = buildTownIndex(data);
const requirements = gateRequirements(data.zones);

const npc = (id: string) => data.locations.flatMap((l) => l.npcs).find((n) => n.id === id) as NonNullable<ReturnType<typeof data.locations.flatMap<(typeof data.locations)[number]['npcs'][number]>>[number]>;
const foe = (id: string) => data.worldFoes.find((f) => f.id === id) as (typeof data.worldFoes)[number];
const zone = (id: string) => data.zones.find((z) => z.id === id) as (typeof data.zones)[number];
const gateOpen = (ctx: GameCtx, zoneId: string): boolean => {
  const flag = zone(zoneId).unlockFlag;
  return flag === null || isGateOpen(flag, new Set(ctx.flags), requirements);
};

/** Victoire totale sur une rencontre : tous les ennemis tombés, le boss compris. */
const win = (ctx: GameCtx, encounter: EncounterDef, foeId: string | null): void => {
  const settled = settleBattle(ctx, { end: 'victory', encounter, foeId, enemiesDefeated: encounter.enemies.length, bossDown: encounter.objective.type === 'boss', seed: `parcours-${encounter.id}` });
  expect(settled.wakeAt).toBeNull();
};

/** Parle à un PNJ : choisit l'option dont le libellé contient `label`. */
const talk = (ctx: GameCtx, npcId: string, label: string): void => {
  const options = visibleOptions(ctx, npc(npcId));
  const found = options.find((o) => o.label.toLowerCase().includes(label.toLowerCase()));
  expect(found, `${npcId} : option « ${label} » (visibles : ${options.map((o) => o.label).join(' / ')})`).toBeDefined();
  const outcome = selectOption(ctx, npc(npcId), found?.index ?? 0);
  // Une question (accepter une quête) : la première réponse.
  if (outcome.type === 'ask') answer(ctx, npc(npcId), found?.index ?? 0, 0);
};

describe('parcours principal Z1 → Z5 (n°202)', () => {
  const discovered: string[] = [];
  const ctx: GameCtx = { data, index, progress: newProgress({ balance: data.balance, locations: data.locations, factions: data.factions }), flags: [], discovered };
  const p = ctx.progress;

  it('Z1 : Brakk ouvre la Forêt-Racine ; la farine de Thom et l’éclaireur d’Ilar avancent', () => {
    expect(gateOpen(ctx, 'z1')).toBe(true);
    expect(gateOpen(ctx, 'z2')).toBe(false);
    talk(ctx, 'thom', 'farine');
    talk(ctx, 'ilar', 'éclaireur');
    expect(questStatus(ctx, 'farine_volee')).toBe('active');
    expect(questStatus(ctx, 'eclaireur_de_la_brume')).toBe('active');
    // Les postes des nommés de Z1 : Gorm tient la vigie nord, Rik attend la fin du colporteur.
    expect(foePresent(ctx, foe('z1_sentinelle_camp_nord'))).toBe(true);
    expect(foePresent(ctx, foe('z1_poste_rik'))).toBe(false);
    win(ctx, findEncounter(data, 'camp_des_ecumeurs'), 'z1_brakk');
    expect(ctx.flags).toContain('boss_brakk');
    expect(gateOpen(ctx, 'z2')).toBe(true);
    expect(questStatus(ctx, 'farine_volee')).toBe('ready');
    completeQuest(ctx, 'farine_volee');
    expect(questStatus(ctx, 'farine_volee')).toBe('done');
    expect(foePresent(ctx, foe('z1_brakk'))).toBe(false);
  });

  it('Z2 : le Roi-Cerf ouvre la Côte des Brumes ; les deux quêtes principales se bouclent', () => {
    discovered.push('pont_vieux', 'bosquet_roi_cerf');
    talk(ctx, 'sylve', 'Roi-Cerf');
    expect(questStatus(ctx, 'roi_cerf_souffre')).toBe('active');
    expect(gateOpen(ctx, 'z3')).toBe(false);
    win(ctx, findEncounter(data, 'roi_cerf_corrompu'), 'z2_roi_cerf');
    expect(ctx.flags).toContain('boss_roi_cerf');
    expect(gateOpen(ctx, 'z3')).toBe(true);
    expect(questStatus(ctx, 'eclaireur_de_la_brume')).toBe('ready');
    expect(questStatus(ctx, 'roi_cerf_souffre')).toBe('ready');
    completeQuest(ctx, 'eclaireur_de_la_brume');
    completeQuest(ctx, 'roi_cerf_souffre');
  });

  it('Z3 : Sœur Mérrow ouvre les Monts de Cendre et Dorn prête sa barque', () => {
    talk(ctx, 'dorn', 'Mérrow');
    expect(questStatus(ctx, 'soeur_merrow')).toBe('active');
    expect(gateOpen(ctx, 'z4')).toBe(false);
    win(ctx, findEncounter(data, 'soeur_merrow'), 'z3_merrow');
    expect(gateOpen(ctx, 'z4')).toBe(true);
    expect(questStatus(ctx, 'soeur_merrow')).toBe('ready');
    completeQuest(ctx, 'soeur_merrow');
    expect(ctx.flags).toContain('barque_de_dorn');
  });

  it('Z4 : le Gardien de Cendre fait venir Rhyel ; la Citadelle attend encore la confiance de Pierre-Haute', () => {
    win(ctx, findEncounter(data, 'mere_harpie'), 'z4_mere_harpie');
    expect(ctx.flags).toContain('boss_aiguille');
    win(ctx, findEncounter(data, 'gardien_de_cendre'), 'z4_gardien_de_cendre');
    expect(ctx.flags).toContain('boss_gardien_cendre');
    expect(p.company.some((m) => m.id === 'rhyel')).toBe(true);
    // Le passage de Z5 demande la barque ET l'accès accordé par Yrsa (amical à Pierre-Haute).
    expect(gateOpen(ctx, 'z5')).toBe(false);
    expect(visibleOptions(ctx, npc('yrsa')).some((o) => o.label.includes('Citadelle'))).toBe(true);
    talk(ctx, 'yrsa', 'Citadelle');
    expect(ctx.flags).not.toContain('acces_citadelle');
    p.reputation['pierre_haute'] = 40;
    talk(ctx, 'yrsa', 'Citadelle');
    expect(ctx.flags).toContain('acces_citadelle');
    expect(gateOpen(ctx, 'z5')).toBe(true);
  });

  it('Z5 : Ser Maëlis garde la chaussée, puis Orvane attend au trône ; sa chute règle une fin', () => {
    expect(foePresent(ctx, foe('z5_poste_maelis'))).toBe(true);
    expect(foePresent(ctx, foe('z5_orvane'))).toBe(false);
    p.named['maelis'] = 'defeated';
    expect(foePresent(ctx, foe('z5_poste_maelis'))).toBe(false);
    expect(foePresent(ctx, foe('z5_orvane'))).toBe(true);
    const finale = findEncounter(data, 'roi_maree_brise');
    p.reputation['marees'] = 35;
    expect(chooseEnding(ctx, ['heros', 'rhyel']).id).toBe('lanterne');
    win(ctx, finale, 'z5_orvane');
    const ending = settleEnding(ctx, { victoryFlags: finale.victoryFlags, aliveDeployed: ['heros', 'rhyel'] });
    expect(ending?.id).toBe('lanterne');
    expect(endingReached(data, ctx.flags)?.id).toBe('lanterne');
    // Le jeu continue : Orvane ne revient pas, les villages parlent de la fin.
    expect(foePresent(ctx, foe('z5_orvane'))).toBe(false);
    expect(settleEnding(ctx, { victoryFlags: finale.victoryFlags, aliveDeployed: [] })).toBeNull();
  });

  it('à côté : l’Arène des Cendres (Dax) rend Gérard recrutable (n°200)', () => {
    const dax = visibleOptions(ctx, npc('dax'));
    const quest = dax.find((o) => o.option.kind === 'quest');
    expect(quest).toBeDefined();
    const asked = selectOption(ctx, npc('dax'), quest?.index ?? 0);
    if (asked.type === 'ask') answer(ctx, npc('dax'), quest?.index ?? 0, 0);
    expect(questStatus(ctx, 'arene_des_cendres')).toBe('active');
    const fight = selectOption(ctx, npc('dax'), visibleOptions(ctx, npc('dax')).find((o) => o.label.includes('première'))?.index ?? -1);
    expect(fight.type).toBe('battle');
    win(ctx, findEncounter(data, 'arene_serie_1'), null);
    completeQuest(ctx, 'arene_des_cendres');
    talk(ctx, 'gerard', 'rejoindre');
    expect(p.company.some((m) => m.id === 'gerard')).toBe(true);
  });

  it('toutes les quêtes principales sont faites et aucun drapeau de boss ne manque', () => {
    for (const q of data.quests.filter((q) => q.principal)) expect(questStatus(ctx, q.id), q.id).toBe('done');
    for (const flag of ['boss_brakk', 'boss_roi_cerf', 'boss_merrow', 'boss_aiguille', 'boss_gardien_cendre', 'boss_orvane']) expect(ctx.flags).toContain(flag);
  });
});
