/**
 * Jalon M5 : écran de préparation (GDD §9.3) en logique pure — déploiement,
 * cases bleues, formation Auto, équipement et objets (5 au plus).
 */
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { buildBattle, findEncounter } from '../src/logic/tactics/encounter';
import { distance } from '../src/logic/tactics/grid';
import { accessoryChoices, applyPlan, autoFormation, carried, convoyLeft, deployedMembers, giveItem, planFromState, reconcileLoadouts, swapSlots, takeItem, toggleMember, weaponChoices } from '../src/logic/tactics/prep';
import { emptyLoadout, type Loadout } from '../src/logic/tactics/units';
import { rules } from './helpers/battle';
import { testWorld } from './helpers/world';

const data = loadGameData();
const R = rules();
const party = data.encounters.testParty;

function battle(id = 'embuscade_du_gue', ambush = false) {
  return buildBattle(findEncounter(data, id), party, data, { seed: 'prep', world: testWorld().source, ambush });
}

describe('déploiement', () => {
  it('cases bleues : déploiement maximal + 3 cases de choix ; par défaut, le héros puis la compagnie dans l’ordre', () => {
    const s = battle();
    expect(s.maxDeploy).toBe(5);
    expect(s.deploySlots).toHaveLength(5 + data.balance.prep.extraSlots);
    const plan = planFromState(s);
    expect(deployedMembers(plan)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.slots.slice(5)).toEqual([null, null, null]);
  });

  it('déployer, retirer, échanger ; le héros reste ; jamais plus que le maximum', () => {
    const s = battle();
    const plan = planFromState(s);
    expect(toggleMember(plan, party, 7)).toMatch(/Déploiement complet/);
    expect(toggleMember(plan, party, 0)).toMatch(/héros/);
    expect(toggleMember(plan, party, 4)).toBeNull();
    expect(deployedMembers(plan)).toHaveLength(4);
    expect(toggleMember(plan, party, 7)).toBeNull();
    expect(deployedMembers(plan)).toContain(7);
    const a = plan.slots.indexOf(7);
    expect(swapSlots(plan, a, 6)).toBeNull();
    expect(plan.slots[6]).toBe(7);
  });

  it('formation Auto : le tank au plus près de l’ennemi, la soigneuse au plus loin, le héros jamais devant', () => {
    const s = battle();
    const plan = planFromState(s);
    toggleMember(plan, party, 4);
    toggleMember(plan, party, 5); // Ilmëa, Porte-Lanterne
    autoFormation(plan, s, party, data);
    const enemies = s.units.filter((u) => u.team === 'enemy');
    const near = (member: number) => {
      const cell = plan.cells[plan.slots.indexOf(member)];
      if (!cell) throw new Error('non déployé');
      return Math.min(...enemies.map((e) => distance(e, cell)));
    };
    const deployed = deployedMembers(plan);
    expect(deployed).toHaveLength(5);
    const odran = near(1); // Gardien
    const ilmea = near(5); // Porte-Lanterne
    for (const m of deployed) {
      expect(near(m)).toBeGreaterThanOrEqual(odran);
      expect(near(m)).toBeLessThanOrEqual(ilmea);
    }
    expect(near(0)).toBeGreaterThanOrEqual(odran);
    expect(plan.slots.indexOf(1)).toBe(plan.cells.map((c, i) => ({ i, d: Math.min(...enemies.map((e) => distance(e, c))) })).sort((a, b) => a.d - b.d || a.i - b.i)[0]?.i);
  });

  it('embuscade : positions imposées', () => {
    const s = battle('embuscade_roseaux', true);
    const plan = planFromState(s, true);
    const before = [...plan.slots];
    expect(toggleMember(plan, party, 6)).toMatch(/Embuscade/);
    expect(swapSlots(plan, 0, 1)).toMatch(/Embuscade/);
    autoFormation(plan, s, party, data);
    expect(plan.slots).toEqual(before);
  });

  it('appliquer le plan reconstruit la compagnie (cases, arme, accessoire, objets) sans toucher aux ennemis', () => {
    const s = battle();
    const enemies = s.units.filter((u) => u.team === 'enemy').map((u) => u.id);
    const plan = planFromState(s);
    toggleMember(plan, party, 3);
    toggleMember(plan, party, 5);
    swapSlots(plan, plan.slots.indexOf(5), 7);
    const loadouts: Loadout[] = party.map(() => emptyLoadout());
    loadouts[1] = { weapon: 'javeline', accessory: 'amulette_de_pierre', items: [{ item: 'potion', qty: 2 }] };
    applyPlan(s, plan, party, loadouts, data, R);
    const members = s.units.filter((u) => u.team === 'player');
    expect(members).toHaveLength(5);
    expect(members[0]?.isHero).toBe(true);
    expect(members.map((u) => u.memberIndex).sort()).toEqual([0, 1, 2, 4, 5]);
    const ilmea = members.find((u) => u.memberIndex === 5);
    expect(ilmea).toMatchObject({ x: plan.cells[7]?.x, y: plan.cells[7]?.y });
    const odran = members.find((u) => u.memberIndex === 1);
    const gardien = data.classes.find((c) => c.id === 'gardien_des_marees');
    expect(odran?.weapon.id).toBe('javeline');
    expect(odran?.accessory).toBe('amulette_de_pierre');
    expect(odran?.items).toEqual([{ item: 'potion', qty: 2 }]);
    expect(odran?.stats.def).toBe((gardien?.baseStats.def ?? 0) + Math.round(((gardien?.growths.def ?? 0) * 2) / 100) + 1);
    expect(s.units.filter((u) => u.team === 'enemy').map((u) => u.id)).toEqual(enemies);
  });
});

describe('équipement et objets', () => {
  const convoy = [
    { item: 'potion', qty: 3 },
    { item: 'amulette_de_pierre', qty: 1 },
    { item: 'javeline', qty: 1 },
    { item: 'epee_de_fer', qty: 1 },
  ];

  it('5 objets au plus par unité, pris dans le sac sans en créer', () => {
    const loadouts = party.map(() => emptyLoadout());
    for (let i = 0; i < 3; i++) expect(giveItem(loadouts, convoy, 0, 'potion', 5)).toBeNull();
    expect(giveItem(loadouts, convoy, 1, 'potion', 5)).toMatch(/Plus aucun/);
    expect(convoyLeft(convoy, loadouts, 'potion')).toBe(0);
    takeItem(loadouts, 0, 'potion');
    expect(giveItem(loadouts, convoy, 1, 'potion', 5)).toBeNull();
    const many = [{ item: 'potion', qty: 9 }];
    const l2 = party.map(() => emptyLoadout());
    for (let i = 0; i < 5; i++) giveItem(l2, many, 0, 'potion', 5);
    expect(carried(l2[0] as Loadout)).toBe(5);
    expect(giveItem(l2, many, 0, 'potion', 5)).toMatch(/5 objets/);
  });

  it('armes du type de la classe, accessoire unique, équipement retiré si le sac ne le contient plus', () => {
    const loadouts = party.map(() => emptyLoadout());
    const gardien = data.classes.find((c) => c.id === 'gardien_des_marees');
    const lame = data.classes.find((c) => c.id === 'lame_du_serment');
    if (!gardien || !lame) throw new Error('classes');
    expect(weaponChoices(data, gardien, convoy, loadouts, 1)).toEqual(['lance_d_estoc', 'javeline']);
    expect(weaponChoices(data, lame, convoy, loadouts, 0)).toEqual(['epee_de_fer']);
    expect(accessoryChoices(data, convoy, loadouts, 1)).toEqual([null, 'amulette_de_pierre']);
    (loadouts[1] as Loadout).accessory = 'amulette_de_pierre';
    expect(accessoryChoices(data, convoy, loadouts, 2)).toEqual([null]);
    (loadouts[1] as Loadout).weapon = 'javeline';
    reconcileLoadouts(loadouts, [{ item: 'potion', qty: 1 }]);
    expect(loadouts[1]).toMatchObject({ weapon: null, accessory: null });
  });
});
