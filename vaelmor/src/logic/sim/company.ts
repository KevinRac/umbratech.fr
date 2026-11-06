/**
 * Compagnies simulées (jalon M10, lot F, décision n°263).
 *
 * Le simulateur ne rejoue pas une partie : il pose, pour chaque rencontre, la
 * compagnie qu'un joueur attentif aurait **au niveau de la rencontre** avec ce
 * que la zone permet : recrues déjà rencontrées (`company.json`, GDD §5.7),
 * Sceaux de Maîtrise et évolutions, accessoires, objets de soin du sac. Les
 * hypothèses sont ici, en clair, et se retouchent sans toucher au moteur.
 *
 * Module pur : ni DOM ni Phaser.
 */
import type { GameData } from '../../data/validate';
import { applyEvolutionBonus } from './evolve';
import { createMember, type Member } from '../units/company';
import { emptyLoadout, type Loadout } from '../tactics/units';
import type { ItemStack } from '../tactics/types';

/** Un compagnon qui peut être dans la compagnie. */
export interface Companion {
  readonly id: string;
  readonly name: string;
  readonly class: string;
}

/** Compagnons cumulés, zone par zone, d'après les recrutements du jeu (`locations.json`, `company.json`). */
export const COMPANIONS_BY_ZONE: Readonly<Record<string, readonly Companion[]>> = (() => {
  const odran = { id: 'odran', name: 'Odran', class: 'gardien_des_marees' };
  const aurele = { id: 'aurele', name: 'Aurèle', class: 'heritier_des_cendres' };
  const nessa = { id: 'nessa', name: 'Nessa', class: 'danseur_des_courants' };
  const ysolde = { id: 'ysolde', name: 'Ysolde', class: 'veilleur_des_falaises' };
  const mousse = { id: 'mousse', name: 'Mousse', class: 'faconneur_de_racines' };
  const corbin = { id: 'corbin', name: 'Corbin', class: 'chasseur_de_serpents_de_mer' };
  const tiphaine = { id: 'tiphaine', name: 'Tiphaine', class: 'gardien_des_marees' };
  const alden = { id: 'alden', name: 'Alden', class: 'lame_du_serment' };
  const cendrine = { id: 'cendrine', name: 'Cendrine', class: 'heraut_des_bannieres' };
  const zephyrin = { id: 'zephyrin', name: 'Zéphyrin', class: 'alchimiste_des_saisons' };
  const gerard = { id: 'gerard', name: 'Gérard', class: 'invocateur_de_pierres_anciennes' };
  const ilmea = { id: 'ilmea', name: 'Ilmëa', class: 'porte_lanterne' };
  const tobias = { id: 'tobias', name: 'Tobias', class: 'ingenieur_des_ruines' };
  const rhyel = { id: 'rhyel', name: 'Rhyel', class: 'heritier_des_cendres' };
  const z1 = [odran, aurele, nessa];
  const z2 = [...z1, ysolde, mousse];
  const z3 = [...z2, corbin, tiphaine, alden, cendrine];
  const z4 = [...z3, zephyrin, gerard, ilmea, tobias];
  return { z1, z2, z3, z4, z5: [...z4, rhyel] };
})();

/** Ce que la compagnie a gagné à l'entrée d'une zone. */
export interface StageKit {
  /** Membres évolués (niveau 10 au moins ; Sceaux de Maîtrise : un par boss de zone, GDD §10.1). */
  readonly evolved: number;
  /** Membres qui portent un accessoire (achats et butins). */
  readonly accessories: number;
  /** Objets de soin du sac, répartis entre les déployés (5 objets au plus chacun, `balance.prep.maxItems`). */
  readonly convoy: readonly ItemStack[];
}

export const KIT_BY_ZONE: Readonly<Record<string, StageKit>> = {
  z1: { evolved: 0, accessories: 0, convoy: [{ item: 'potion', qty: 3 }, { item: 'pain_dore', qty: 2 }] },
  z2: { evolved: 0, accessories: 1, convoy: [{ item: 'potion', qty: 4 }, { item: 'hyper_potion', qty: 2 }, { item: 'antidote', qty: 1 }] },
  z3: { evolved: 1, accessories: 2, convoy: [{ item: 'potion', qty: 4 }, { item: 'hyper_potion', qty: 3 }, { item: 'antidote', qty: 2 }, { item: 'eclat_de_lanterne', qty: 1 }] },
  z4: { evolved: 2, accessories: 3, convoy: [{ item: 'potion', qty: 4 }, { item: 'hyper_potion', qty: 4 }, { item: 'antidote', qty: 2 }, { item: 'eclat_de_lanterne', qty: 2 }] },
  z5: { evolved: 3, accessories: 4, convoy: [{ item: 'potion', qty: 4 }, { item: 'hyper_potion', qty: 6 }, { item: 'antidote', qty: 3 }, { item: 'eclat_de_lanterne', qty: 3 }] },
};

/** Rôles dans l'ordre où un joueur attentif complète sa compagnie. */
const ROLE_ORDER = ['tank', 'soin', 'degats_distance', 'magie_offensive', 'degats_melee', 'soutien', 'controle', 'anti_armure', 'tueur_de_boss', 'mobilite', 'invocation', 'terrain'] as const;

/** Accessoire qui convient le mieux à un rôle. */
const ACCESSORY_BY_ROLE: Readonly<Record<string, string>> = {
  tank: 'amulette_de_pierre',
  degats_melee: 'collier_d_ecume',
  degats_distance: 'collier_d_ecume',
  mobilite: 'collier_d_ecume',
  tueur_de_boss: 'amulette_de_pierre',
  anti_armure: 'amulette_de_pierre',
  magie_offensive: 'bague_de_cendre',
  controle: 'bague_de_cendre',
  invocation: 'bague_de_cendre',
  terrain: 'broche_des_racines',
  soin: 'broche_des_racines',
  soutien: 'broche_des_racines',
};

/** La compagnie simulée : membres, équipement, et qui est déployé. */
export interface SimCompany {
  readonly members: readonly Member[];
  readonly loadouts: readonly Loadout[];
}

const roleOf = (data: GameData, classId: string): string => data.classes.find((c) => c.id === classId)?.role ?? 'soutien';

/**
 * Compose la compagnie d'une rencontre : le héros (classe donnée), puis les
 * compagnons de la zone choisis par rôle (tank, soin, tir, magie, mêlée…) ;
 * `size` membres au plus (le déploiement maximal de la rencontre).
 */
export function composeCompany(data: GameData, heroClass: string, zone: string, level: number, size: number): SimCompany {
  const pool = [...(COMPANIONS_BY_ZONE[zone] ?? COMPANIONS_BY_ZONE.z1 ?? [])];
  const hero = createMember(data, { id: data.company.hero.id, name: data.company.hero.name, class: heroClass, level, hero: true });
  const picked: Member[] = [hero];
  const takeFor = (role: string): void => {
    if (picked.length >= size || picked.some((m) => roleOf(data, m.class) === role)) return;
    const i = pool.findIndex((c) => roleOf(data, c.class) === role);
    if (i < 0) return;
    const c = pool.splice(i, 1)[0] as Companion;
    picked.push(createMember(data, { id: c.id, name: c.name, class: c.class, level }));
  };
  for (const role of ROLE_ORDER) takeFor(role);
  while (picked.length < size && pool.length > 0) {
    const c = pool.shift() as Companion;
    picked.push(createMember(data, { id: c.id, name: c.name, class: c.class, level }));
  }

  const kit = KIT_BY_ZONE[zone] ?? KIT_BY_ZONE.z1;
  const loadouts = picked.map(() => emptyLoadout());

  // Évolutions : les premiers membres de rang, à partir du niveau d'évolution, branche A.
  if (kit && level >= data.balance.levels.promotionMinLevel) {
    let left = kit.evolved;
    for (const m of picked) {
      if (left <= 0) break;
      const evo = data.classes.find((c) => c.id === m.class)?.evolutions[0];
      if (!evo) continue;
      applyEvolutionBonus(data, m, evo.id);
      left -= 1;
    }
  }
  // Accessoires : dans l'ordre de la compagnie, selon le rôle.
  picked.slice(0, kit?.accessories ?? 0).forEach((m, i) => {
    const wanted = ACCESSORY_BY_ROLE[roleOf(data, m.class)];
    if (wanted && data.accessories.some((a) => a.id === wanted)) (loadouts[i] as Loadout).accessory = wanted;
  });
  // Objets : un à la fois, de membre en membre, sans dépasser le maximum de la préparation.
  const max = data.balance.prep.maxItems;
  const queue: string[] = [];
  for (const s of kit?.convoy ?? []) for (let k = 0; k < s.qty; k++) queue.push(s.item);
  let turn = 0;
  for (const item of queue) {
    for (let tries = 0; tries < picked.length; tries++) {
      const l = loadouts[(turn + tries) % picked.length] as Loadout;
      const held = l.items.reduce((n, s) => n + s.qty, 0);
      if (held >= max) continue;
      const stack = l.items.find((s) => s.item === item);
      if (stack) stack.qty += 1;
      else l.items.push({ item, qty: 1 });
      turn = (turn + tries + 1) % picked.length;
      break;
    }
  }
  return { members: picked, loadouts };
}
