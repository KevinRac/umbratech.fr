/**
 * Écran de préparation (jalon M5, GDD §9.3, §13.4), en logique pure :
 * - qui est déployé (au plus `maxDeploy`, le héros toujours) et sur quelle
 *   case bleue (échange de deux cases) ;
 * - formation « Auto » : les unités de front (tank, mêlée) vers l'ennemi, les
 *   soigneurs et tireurs derrière ;
 * - équipement : arme (du type de la classe), accessoire (un emplacement),
 *   objets (5 au plus par unité), pris dans le sac de la compagnie ;
 * - application au combat : les unités de la compagnie sont reconstruites.
 *
 * En embuscade (GDD §7.4), les positions sont imposées : la formation est
 * verrouillée, l'équipement reste libre.
 */
import type { ClassDef, PartyMemberDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { distance } from './grid';
import type { BattleRules, BattleState, BattleUnit, Cell, ItemStack } from './types';
import { memberUnit, type Loadout } from './units';

export interface PrepPlan {
  /** Membre (rang dans la compagnie) posé sur chaque case bleue, ou null. */
  readonly slots: (number | null)[];
  readonly cells: readonly Cell[];
  readonly maxDeploy: number;
  /** Positions imposées (embuscade). */
  readonly locked: boolean;
}

/** Plan tiré du combat construit (déploiement par défaut). */
export function planFromState(state: BattleState, locked = false): PrepPlan {
  const slots = state.deploySlots.map((c) => state.units.find((u) => u.team === 'player' && u.memberIndex !== null && u.x === c.x && u.y === c.y)?.memberIndex ?? null);
  return { slots, cells: state.deploySlots, maxDeploy: state.maxDeploy, locked };
}

export function deployedMembers(plan: PrepPlan): number[] {
  return plan.slots.filter((m): m is number => m !== null);
}

export function slotOf(plan: PrepPlan, member: number): number {
  return plan.slots.indexOf(member);
}

/**
 * Déploie ou retire un membre. Le héros reste toujours ; on ne dépasse pas
 * `maxDeploy`. Renvoie la raison d'un refus, ou null.
 */
export function toggleMember(plan: PrepPlan, party: readonly PartyMemberDef[], member: number): string | null {
  if (plan.locked) return 'Embuscade : la compagnie ne peut pas se replacer.';
  const at = slotOf(plan, member);
  if (at >= 0) {
    if (party[member]?.hero) return 'Le héros mène toujours la compagnie.';
    plan.slots[at] = null;
    return null;
  }
  if (deployedMembers(plan).length >= plan.maxDeploy) return `Déploiement complet (${plan.maxDeploy} unités au plus).`;
  const free = plan.slots.indexOf(null);
  if (free < 0) return 'Aucune case libre.';
  plan.slots[free] = member;
  return null;
}

/** Échange le contenu de deux cases bleues (une case vide déplace l'unité). */
export function swapSlots(plan: PrepPlan, a: number, b: number): string | null {
  if (plan.locked) return 'Embuscade : la compagnie ne peut pas se replacer.';
  if (a < 0 || b < 0 || a >= plan.slots.length || b >= plan.slots.length) return 'Case inconnue.';
  const tmp = plan.slots[a] ?? null;
  plan.slots[a] = plan.slots[b] ?? null;
  plan.slots[b] = tmp;
  return null;
}

/** Plus une unité est « de front », plus elle se place près de l'ennemi (formation Auto). */
const FRONT: Readonly<Record<ClassDef['role'], number>> = {
  tank: 6,
  degats_melee: 5,
  tueur_de_boss: 4,
  mobilite: 4,
  soutien: 3,
  terrain: 3,
  controle: 2,
  anti_armure: 2,
  invocation: 2,
  degats_distance: 1,
  magie_offensive: 1,
  soin: 0,
};

/**
 * Formation « Auto » (GDD §9.3) : les cases bleues les plus proches de
 * l'ennemi reçoivent les unités de front (tank devant), les plus éloignées les
 * soigneurs. Le héros n'est jamais en première ligne (front plafonné à 3).
 */
export function autoFormation(plan: PrepPlan, state: BattleState, party: readonly PartyMemberDef[], data: GameData): void {
  if (plan.locked) return;
  const enemies = state.units.filter((u) => u.team === 'enemy' && u.hp > 0);
  const nearest = (c: Cell): number => (enemies.length === 0 ? 0 : Math.min(...enemies.map((e) => distance(e, c))));
  const order = plan.cells.map((c, i) => ({ i, d: nearest(c) })).sort((a, b) => a.d - b.d || a.i - b.i);
  const front = (m: number): number => {
    const member = party[m] as PartyMemberDef;
    const role = data.classes.find((c) => c.id === member.class)?.role ?? 'soutien';
    return member.hero ? Math.min(3, FRONT[role]) : FRONT[role];
  };
  const members = deployedMembers(plan).sort((a, b) => front(b) - front(a) || a - b);
  plan.slots.fill(null);
  members.forEach((m, k) => {
    plan.slots[(order[k] as { i: number }).i] = m;
  });
}

/* ---------- Équipement et objets ---------- */

/** Quantité d'un objet du sac encore libre (non portée par une unité de la compagnie). */
export function convoyLeft(convoy: readonly ItemStack[], loadouts: readonly Loadout[], item: string, except: number | null = null): number {
  const owned = convoy.reduce((n, s) => (s.item === item ? n + s.qty : n), 0);
  let used = 0;
  loadouts.forEach((l, i) => {
    if (i === except) return;
    if (l.weapon === item) used += 1;
    if (l.accessory === item) used += 1;
    for (const s of l.items) if (s.item === item) used += s.qty;
  });
  return owned - used;
}

/** Objets portés au total par une unité. */
export const carried = (l: Loadout): number => l.items.reduce((n, s) => n + s.qty, 0);

/** Ajoute un objet du sac à une unité (5 au plus). */
export function giveItem(loadouts: Loadout[], convoy: readonly ItemStack[], member: number, item: string, maxItems: number): string | null {
  const l = loadouts[member];
  if (!l) return 'Unité inconnue.';
  if (carried(l) >= maxItems) return `${maxItems} objets au plus par unité.`;
  if (convoyLeft(convoy, loadouts, item) <= 0) return 'Plus aucun dans le sac.';
  const stack = l.items.find((s) => s.item === item);
  if (stack) stack.qty += 1;
  else l.items.push({ item, qty: 1 });
  return null;
}

/** Rend un objet au sac. */
export function takeItem(loadouts: Loadout[], member: number, item: string): void {
  const l = loadouts[member];
  const stack = l?.items.find((s) => s.item === item);
  if (!l || !stack) return;
  stack.qty -= 1;
  if (stack.qty <= 0) l.items.splice(l.items.indexOf(stack), 1);
}

/** Armes du sac que la classe peut manier (même type, même nature de dégâts), arme de départ en tête. */
export function weaponChoices(data: GameData, cls: ClassDef, convoy: readonly ItemStack[], loadouts: readonly Loadout[], member: number): string[] {
  const out = [cls.startingWeapon];
  for (const w of data.weapons) {
    if (w.id === cls.startingWeapon || w.type !== cls.weapon.type || w.damage !== cls.weapon.damage) continue;
    if (convoyLeft(convoy, loadouts, w.id, member) > 0) out.push(w.id);
  }
  return out;
}

/** Accessoires du sac disponibles pour l'unité (null : aucun). */
export function accessoryChoices(data: GameData, convoy: readonly ItemStack[], loadouts: readonly Loadout[], member: number): (string | null)[] {
  return [null, ...data.accessories.filter((a) => convoyLeft(convoy, loadouts, a.id, member) > 0).map((a) => a.id)];
}

/** Retire de l'équipement ce que le sac ne contient plus (objets vendus ou consommés depuis). */
export function reconcileLoadouts(loadouts: Loadout[], convoy: readonly ItemStack[]): void {
  loadouts.forEach((l, i) => {
    if (l.weapon !== null && convoyLeft(convoy, loadouts, l.weapon, i) < 1) l.weapon = null;
    if (l.accessory !== null && convoyLeft(convoy, loadouts, l.accessory, i) < 1) l.accessory = null;
    for (const s of [...l.items]) {
      const left = convoyLeft(convoy, loadouts, s.item);
      if (left < 0) {
        s.qty = Math.max(0, s.qty + left);
        if (s.qty === 0) l.items.splice(l.items.indexOf(s), 1);
      }
    }
  });
}

/* ---------- Application au combat ---------- */

/**
 * Remplace les unités de la compagnie par celles du plan (cases, équipement,
 * objets). Les ennemis et les renforts restent tels quels.
 */
export function applyPlan(state: BattleState, plan: PrepPlan, party: readonly PartyMemberDef[], loadouts: readonly Loadout[], data: GameData, rules: BattleRules): void {
  for (let i = state.units.length - 1; i >= 0; i--) {
    const u = state.units[i] as BattleUnit;
    if (u.team === 'player' && u.memberIndex !== null) state.units.splice(i, 1);
  }
  const fresh: BattleUnit[] = [];
  let k = 0;
  // Héros d'abord (ordre d'affichage), puis dans l'ordre des cases.
  const order = plan.slots.map((m, i) => ({ m, i })).filter((e): e is { m: number; i: number } => e.m !== null);
  order.sort((a, b) => Number(party[b.m]?.hero) - Number(party[a.m]?.hero) || a.i - b.i);
  for (const { m, i } of order) {
    const cell = plan.cells[i] as Cell;
    fresh.push(memberUnit(data, rules, party[m] as PartyMemberDef, loadouts[m] ?? { weapon: null, accessory: null, items: [] }, `p${k++}`, m, cell.x, cell.y));
  }
  state.units.unshift(...fresh);
}
