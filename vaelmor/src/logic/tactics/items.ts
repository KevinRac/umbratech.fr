/**
 * Objets et soins en combat (jalon M5, GDD §9.8, §9.5).
 *
 * - « Objet » : une unité utilise un objet qu'elle porte (5 au plus, choisis à
 *   la préparation), sur elle, sur un allié à portée ou sur un ennemi selon
 *   l'objet (items.json › battle). Une action : son tour se termine.
 * - « Soigner » : une unité armée d'un bâton de soin (`heals`) rend
 *   `heals` + Mag/2 PV à un allié à portée de son arme.
 * Pas de durabilité (décision n°12) ; les objets consommés sont comptés dans
 * `state.itemsUsed` et retirés du sac à la fin du combat. Module pur.
 */
import type { ConsumableDef } from '../../data/schemas';
import { BattleError, assertCanAction, finishUnit, hurt, mend } from './battleCore';
import { distance, getUnit } from './grid';
import { applyStatus, cleanse } from './status';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type EffectResult } from './types';

export function itemDef(rules: BattleRules, id: string): ConsumableDef {
  const def = rules.consumables.get(id);
  if (!def?.battle) throw new Error(`Objet inutilisable en combat : « ${id} »`);
  return def;
}

/** Objets de l'unité utilisables en combat (avec au moins une cible). */
export function usableItems(state: BattleState, unit: BattleUnit, rules: BattleRules): { item: string; qty: number; targets: BattleUnit[] }[] {
  return unit.items
    .filter((s) => s.qty > 0 && rules.consumables.get(s.item)?.battle !== undefined)
    .map((s) => ({ item: s.item, qty: s.qty, targets: itemTargets(state, unit, s.item, rules) }));
}

/** Cibles valables d'un objet. */
export function itemTargets(state: BattleState, unit: BattleUnit, item: string, rules: BattleRules): BattleUnit[] {
  const b = itemDef(rules, item).battle;
  if (!b) return [];
  const inRange = (u: BattleUnit): boolean => {
    const d = distance(unit, u);
    return d >= b.range[0] && d <= b.range[1];
  };
  if (b.target === 'soi') return [unit];
  if (b.target === 'ennemi') return state.units.filter((u) => u.hp > 0 && hostile(u.team, unit.team) && inRange(u));
  // Soin : seulement si l'unité est blessée ou affaiblie (purge).
  return state.units.filter((u) => {
    if (u.hp <= 0 || hostile(u.team, unit.team) || !inRange(u)) return false;
    const wounded = b.heal !== undefined && u.hp < u.stats.pv;
    const sick = b.cleanse === true && u.mods.some((m) => rules.statuses.get(m.status)?.kind === 'debuff');
    return wounded || sick || (b.heal === undefined && b.cleanse !== true);
  });
}

/** Commande : utiliser un objet porté sur une cible. */
export function useItem(state: BattleState, unitId: string, item: string, targetId: string, rules: BattleRules): BattleEvent[] {
  const unit = getUnit(state, unitId);
  const target = getUnit(state, targetId);
  assertCanAction(state, unit);
  const stack = unit.items.find((s) => s.item === item && s.qty > 0);
  if (!stack) throw new BattleError(`${unit.name} ne porte pas cet objet.`);
  const def = itemDef(rules, item);
  const b = def.battle;
  if (!b || !itemTargets(state, unit, item, rules).includes(target)) throw new BattleError(`${def.name} : cible non valable.`);
  stack.qty -= 1;
  if (stack.qty === 0) unit.items.splice(unit.items.indexOf(stack), 1);
  state.itemsUsed[item] = (state.itemsUsed[item] ?? 0) + 1;

  const events: BattleEvent[] = [{ type: 'item', unitId, item, targetId }];
  let result: EffectResult = { unitId: target.id, hp: target.hp };
  if (b.damage !== undefined) {
    const dealt = hurt(target, b.damage);
    target.alerted = true;
    result = { ...result, damage: dealt, hp: target.hp };
  }
  if (b.heal !== undefined) result = { ...result, heal: mend(target, b.heal), hp: target.hp };
  if (b.cleanse === true && cleanse(target, rules)) result = { ...result, cleansed: true };
  if (b.status && target.hp > 0) {
    const ok = applyStatus(state, target, b.status.id, b.status.turns, unit.id, rules);
    result = ok ? { ...result, status: b.status.id } : { ...result, immune: b.status.id };
  }
  events.push({ type: 'effects', sourceId: unitId, element: null, results: [result] });
  if (target.hp <= 0) events.push({ type: 'ko', unitId: target.id });
  finishUnit(state, unit);
  return events;
}

/** PV rendus par « Soigner » (bâton de soin). */
export function staffHealAmount(unit: BattleUnit): number {
  return unit.weapon.heals === undefined ? 0 : unit.weapon.heals + Math.floor(unit.stats.mag / 2);
}

/** Alliés blessés à portée du bâton de soin. */
export function healTargets(state: BattleState, unit: BattleUnit, from: { x: number; y: number } = unit): BattleUnit[] {
  if (unit.weapon.heals === undefined) return [];
  return state.units.filter((u) => {
    if (u === unit || u.hp <= 0 || hostile(u.team, unit.team) || u.hp >= u.stats.pv) return false;
    const d = distance(from, u);
    return d >= unit.weapon.range[0] && d <= unit.weapon.range[1];
  });
}

/** Commande : soigner un allié avec un bâton (GDD §9.5, portée de l'arme). */
export function healUnit(state: BattleState, unitId: string, targetId: string): BattleEvent[] {
  const unit = getUnit(state, unitId);
  const target = getUnit(state, targetId);
  assertCanAction(state, unit);
  if (!healTargets(state, unit).includes(target)) throw new BattleError(`${unit.name} ne peut pas soigner ${target.name}.`);
  const amount = mend(target, staffHealAmount(unit));
  finishUnit(state, unit);
  return [{ type: 'heal', unitId: target.id, amount, sourceId: unit.id }];
}
