import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { checkTownsOnMap } from '../src/data/townMap';
import { loadWorldMap } from '../src/data/worldMap';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addItem,
  answer,
  buildTownIndex,
  buy,
  changeReputation,
  collectFlagRewards,
  completeQuest,
  countItem,
  enterLocation,
  newProgress,
  npcPresent,
  pickLines,
  questStatus,
  removeItem,
  sell,
  selectOption,
  shopStock,
  visibleOptions,
  type GameCtx,
} from '../src/logic/game';

const data = loadGameData();
const index = buildTownIndex(data);

function makeCtx(): GameCtx {
  return {
    data,
    index,
    progress: newProgress({ balance: data.balance, locations: data.locations, factions: data.factions }),
    flags: [],
    discovered: [],
  };
}
const npcOf = (id: string) => (index.npcs.get(id) as NonNullable<ReturnType<typeof index.npcs.get>>).npc;
const optionIndex = (npcId: string, kind: string, extra?: (o: { kind: string }) => boolean) =>
  npcOf(npcId).options.findIndex((o) => o.kind === kind && (!extra || extra(o)));

describe('données de village', () => {
  it('collent à la carte du monde', () => {
    const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'assets', 'maps', 'world.json'), 'utf8')) as unknown;
    const map = loadWorldMap(raw, { zones: data.zones, terrains: data.terrains, tileSize: data.balance.exploration.tileSize });
    expect(checkTownsOnMap(data, map)).toEqual([]);
  });

  it('décrivent 22 lieux, 5 avec réputation et au moins 30 PNJ', () => {
    expect(data.locations).toHaveLength(22);
    expect(data.locations.filter((l) => l.reputation !== null)).toHaveLength(5);
    expect(index.npcs.size).toBeGreaterThanOrEqual(30);
  });

  it('donnent à chaque village ses 5 à 14 PNJ', () => {
    for (const l of data.locations.filter((l) => l.reputation !== null)) {
      expect(l.npcs.length, l.id).toBeGreaterThanOrEqual(5);
      expect(l.npcs.length, l.id).toBeLessThanOrEqual(14);
    }
  });
});

describe('paroles par palier', () => {
  it('retombent vers le palier neutre quand un palier manque', () => {
    const lines = { neutre: ['n'], amical: ['a'] };
    expect(pickLines(lines, 'hostile')).toEqual(['n']);
    expect(pickLines(lines, 'mefiant')).toEqual(['n']);
    expect(pickLines(lines, 'allie')).toEqual(['a']);
    expect(pickLines(lines, 'heros_local')).toEqual(['a']);
    expect(pickLines(['x'], 'hostile')).toEqual(['x']);
  });
});

describe('sac', () => {
  it('empile jusqu’au maximum puis ouvre une nouvelle pile', () => {
    const ctx = makeCtx();
    const { maxStack } = data.balance.economy;
    expect(addItem(ctx.progress, 'torche', maxStack + 5, data.balance)).toBe(maxStack + 5);
    expect(ctx.progress.inventory.filter((s) => s.item === 'torche')).toHaveLength(2);
    expect(removeItem(ctx.progress, 'torche', maxStack + 5)).toBe(true);
    expect(countItem(ctx.progress, 'torche')).toBe(0);
    expect(removeItem(ctx.progress, 'torche', 1)).toBe(false);
  });

  it('refuse de déborder de la capacité', () => {
    const ctx = makeCtx();
    ctx.progress.inventory = [];
    const { inventoryCapacity, maxStack } = data.balance.economy;
    expect(addItem(ctx.progress, 'torche', inventoryCapacity * maxStack + 10, data.balance)).toBe(inventoryCapacity * maxStack);
  });
});

describe('réputation de village', () => {
  it('commence aux valeurs des données', () => {
    const { progress } = makeCtx();
    expect(progress.reputation['haut_gue']).toBe(10);
    expect(progress.reputation['port_brume']).toBe(-10);
    expect(progress.reputation['marees']).toBe(0);
  });

  it('signale un changement de palier', () => {
    const { progress } = makeCtx();
    const change = changeReputation(progress, 'haut_gue', 20, data.reputation);
    expect(change.tierBefore).toBe('neutre');
    expect(change.tierAfter).toBe('amical');
  });

  it('décroît à l’entrée seulement si rien n’a bougé depuis la dernière visite', () => {
    const { progress } = makeCtx();
    progress.reputation['haut_gue'] = 80;
    changeReputation(progress, 'haut_gue', 5, data.reputation);
    expect(enterLocation(progress, 'haut_gue', data.reputation)).toBeNull();
    expect(progress.reputation['haut_gue']).toBe(85);
    const decay = enterLocation(progress, 'haut_gue', data.reputation);
    expect(decay?.after).toBe(84);
  });
});

describe('boutique', () => {
  it('module les prix selon le palier et masque les objets rares', () => {
    const ctx = makeCtx();
    const base = index.catalog.get('epee_de_fer')?.price as number;
    ctx.progress.reputation['haut_gue'] = 0;
    const neutral = shopStock(ctx, 'forge_de_bran');
    expect(neutral.find((e) => e.info.id === 'epee_de_fer')?.price).toBe(base);
    expect(neutral.some((e) => e.info.id === 'lance_d_estoc')).toBe(false);
    ctx.progress.reputation['haut_gue'] = 60;
    const allied = shopStock(ctx, 'forge_de_bran');
    expect(allied.find((e) => e.info.id === 'epee_de_fer')?.price).toBe(Math.round(base * 0.85));
    expect(allied.some((e) => e.info.id === 'lance_d_estoc')).toBe(true);
    ctx.progress.reputation['haut_gue'] = -30;
    expect(shopStock(ctx, 'forge_de_bran').find((e) => e.info.id === 'epee_de_fer')?.price).toBe(Math.round(base * 1.2));
  });

  it('refuse de commercer avec un ennemi du village', () => {
    const ctx = makeCtx();
    ctx.progress.reputation['haut_gue'] = -80;
    expect(shopStock(ctx, 'forge_de_bran')).toEqual([]);
    expect(buy(ctx, 'forge_de_bran', 'hachette')).toEqual({ ok: false, reason: 'refus' });
  });

  it('achète, vend à 40 % et vérifie l’or', () => {
    const ctx = makeCtx();
    ctx.progress.reputation['haut_gue'] = 0;
    const price = index.catalog.get('hachette')?.price as number;
    ctx.progress.gold = price - 1;
    expect(buy(ctx, 'forge_de_bran', 'hachette')).toEqual({ ok: false, reason: 'or' });
    ctx.progress.gold = price;
    expect(buy(ctx, 'forge_de_bran', 'hachette').ok).toBe(true);
    expect(ctx.progress.gold).toBe(0);
    expect(countItem(ctx.progress, 'hachette')).toBe(1);
    expect(sell(ctx, 'forge_de_bran', 'hachette').ok).toBe(true);
    expect(ctx.progress.gold).toBe(Math.floor(price * 0.4));
    expect(countItem(ctx.progress, 'hachette')).toBe(0);
  });

  it('n’achète pas les objets de quête', () => {
    const ctx = makeCtx();
    addItem(ctx.progress, 'carte_des_brumes', 1, data.balance);
    expect(sell(ctx, 'forge_de_bran', 'carte_des_brumes')).toEqual({ ok: false, reason: 'stock' });
  });
});

describe('dialogue et services', () => {
  it('ferme le menu d’un PNJ qui refuse les hostiles', () => {
    const ctx = makeCtx();
    expect(visibleOptions(ctx, npcOf('bran')).length).toBeGreaterThan(0);
    ctx.progress.reputation['haut_gue'] = -90;
    expect(visibleOptions(ctx, npcOf('bran'))).toEqual([]);
    expect(visibleOptions(ctx, npcOf('garrec')).length).toBeGreaterThan(0);
  });

  it('fait payer le repos puis le rend gratuit aux alliés', () => {
    const ctx = makeCtx();
    const maelys = npcOf('maelys');
    const inn = optionIndex('maelys', 'inn');
    ctx.progress.gold = 100;
    selectOption(ctx, maelys, inn);
    expect(ctx.progress.gold).toBe(80);
    expect(ctx.progress.day).toBe(2);
    ctx.progress.reputation['haut_gue'] = 60;
    selectOption(ctx, maelys, inn);
    expect(ctx.progress.gold).toBe(80);
    expect(ctx.progress.day).toBe(3);
    ctx.progress.reputation['haut_gue'] = 0;
    ctx.progress.gold = 5;
    selectOption(ctx, maelys, inn);
    expect(ctx.progress.day).toBe(3);
  });

  it('plafonne les dons à 15 points de réputation par jour', () => {
    const ctx = makeCtx();
    const yvonne = npcOf('yvonne');
    const donate = optionIndex('yvonne', 'donate');
    ctx.progress.gold = 1000;
    for (let i = 0; i < 5; i++) selectOption(ctx, yvonne, donate);
    expect(ctx.progress.reputation['valcendre']).toBe(15);
    expect(ctx.progress.gold).toBe(500);
    const refused = selectOption(ctx, yvonne, donate);
    expect(refused.type).toBe('say');
    expect(ctx.progress.reputation['valcendre']).toBe(15);
    ctx.progress.day += 1;
    selectOption(ctx, yvonne, donate);
    expect(ctx.progress.reputation['valcendre']).toBe(18);
  });

  it('applique les conséquences d’un choix de dialogue, une seule fois', () => {
    const ctx = makeCtx();
    const ilar = npcOf('ilar');
    const choice = optionIndex('ilar', 'choice');
    const ask = selectOption(ctx, ilar, choice);
    expect(ask.type).toBe('ask');
    answer(ctx, ilar, choice, 1);
    expect(ctx.progress.reputation['haut_gue']).toBe(2);
    expect(visibleOptions(ctx, ilar).some((o) => o.index === choice)).toBe(false);
  });
});

describe('quêtes', () => {
  it('suivent leur cycle : proposée, acceptée, prête, rendue', () => {
    const ctx = makeCtx();
    const nessa = npcOf('nessa');
    const quest = optionIndex('nessa', 'quest');
    expect(questStatus(ctx, 'colporteur_perdu')).toBe('available');
    const ask = selectOption(ctx, nessa, quest);
    expect(ask.type).toBe('ask');
    answer(ctx, nessa, quest, 0);
    expect(questStatus(ctx, 'colporteur_perdu')).toBe('active');
    expect(completeQuest(ctx, 'colporteur_perdu')).toEqual([]);
    (ctx.discovered as string[]).push('pont_trois_arches');
    expect(questStatus(ctx, 'colporteur_perdu')).toBe('ready');
    const gold = ctx.progress.gold;
    const rep = ctx.progress.reputation['haut_gue'] as number;
    const out = selectOption(ctx, nessa, quest);
    expect(out.type).toBe('say');
    expect(questStatus(ctx, 'colporteur_perdu')).toBe('done');
    expect(ctx.progress.gold).toBe(gold + 50);
    expect(ctx.progress.reputation['haut_gue']).toBe(rep + 15);
  });

  it('ouvrent le recrutement après la quête et retirent la recrue du village', () => {
    const ctx = makeCtx();
    const nessa = npcOf('nessa');
    const recruit = optionIndex('nessa', 'recruit');
    const locked = selectOption(ctx, nessa, recruit);
    expect(locked.type === 'say' && ctx.progress.recruited.length).toBe(0);
    ctx.progress.quests['colporteur_perdu'] = 'done';
    selectOption(ctx, nessa, recruit);
    expect(ctx.progress.recruited).toEqual(['nessa']);
    expect(npcPresent(ctx, nessa)).toBe(false);
  });

  it('réclament un palier minimal et pénalisent un refus', () => {
    const ctx = makeCtx();
    const ysmene = npcOf('ysmene');
    const quest = optionIndex('ysmene', 'quest');
    const locked = selectOption(ctx, ysmene, quest);
    expect(locked.type).toBe('say');
    expect(questStatus(ctx, 'conspiration_au_marche')).toBe('available');
    ctx.progress.reputation['valcendre'] = 30;
    const ask = selectOption(ctx, ysmene, quest);
    expect(ask.type === 'ask' && ask.choices.map((c) => c.label)).toEqual(['Accepter', 'Refuser', 'Plus tard']);
    answer(ctx, ysmene, quest, 1);
    expect(ctx.progress.reputation['valcendre']).toBe(25);
  });

  it('versent la récompense d’un boss une seule fois', () => {
    const ctx = makeCtx();
    ctx.flags.push('boss_brakk');
    const gold = ctx.progress.gold;
    expect(collectFlagRewards(ctx).length).toBeGreaterThan(0);
    expect(ctx.progress.reputation['haut_gue']).toBe(22);
    expect(ctx.progress.gold).toBe(gold + 100);
    expect(collectFlagRewards(ctx)).toEqual([]);
  });
});
