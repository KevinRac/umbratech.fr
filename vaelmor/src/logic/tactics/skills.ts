/**
 * Compétences (jalon M5, GDD §9.9, §10.5) : la compétence signature de chaque
 * classe et celles des boss, décrites par les données (skills.json).
 *
 * Coût : Résonance (jauge 0-100 : +20 par coup porté, +10 par coup reçu),
 * ressource de classe (Pierres de l'Invocateur, Charges de l'Ingénieur) ou délai
 * entre deux usages (boss). Une compétence est une action : elle termine le tour
 * de l'unité (sauf « Pas de marée », qui laisse encore marcher).
 *
 * Effets (registre de types, GDD §16.5) : frappe (attaque modifiée), dégâts sans
 * jet, soin, statut, invocation, terrain temporaire. Module pur.
 */
import type { SkillDef, SkillEffect } from '../../data/schemas';
import { forecast, resolveExchange, type Forecast, type StrikeMods } from '../combat/combat';
import { BattleError, assertCanAction, finishUnit, hurt, mend } from './battleCore';
import { cellIndex, distance, getUnit, inBounds, isFreeCell, terrainAt, unitAt } from './grid';
import { applyStatus, cleanse, damageTakenOf, guardOf, nextPhaseTurn } from './status';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type Cell, type EffectResult } from './types';
import { enemyUnit } from './units';

export function skillDef(rules: BattleRules, id: string): SkillDef {
  const skill = rules.skills.get(id);
  if (!skill) throw new Error(`Compétence inconnue : « ${id} »`);
  return skill;
}

/** Ce qui manque pour lancer la compétence (null : elle est prête). */
export function skillBlocker(state: BattleState, unit: BattleUnit, skill: SkillDef): string | null {
  const cost = skill.cost;
  if (cost.resonance !== undefined && unit.resonance < cost.resonance) return `Résonance ${unit.resonance}/${cost.resonance}`;
  if (cost.resource && (unit.resources[cost.resource.id] ?? 0) < cost.resource.amount) return 'Plus de réserve';
  if (cost.cooldown !== undefined && state.turn < (unit.cooldowns[skill.id] ?? 0)) return `Prête au tour ${unit.cooldowns[skill.id]}`;
  return null;
}

/** Libellé du coût (« 40 Rés. », « 1 Pierre »). */
export function costLabel(skill: SkillDef, resourceName?: string): string {
  if (skill.cost.resonance !== undefined) return `${skill.cost.resonance} Rés.`;
  if (skill.cost.resource) return `${skill.cost.resource.amount} ${resourceName ?? skill.cost.resource.id}`;
  return `${skill.cost.cooldown ?? 0} t.`;
}

const firstEffect = (skill: SkillDef): SkillEffect => skill.effects[0] as SkillEffect;

/** Qui une compétence touche dans sa zone. */
export function skillAffects(skill: SkillDef): 'ennemis' | 'allies' | 'tous' {
  if (skill.affects) return skill.affects;
  if (skill.target === 'ennemi') return 'ennemis';
  if (skill.target === 'allie' || skill.target === 'soi') return 'allies';
  return 'ennemis';
}

/** Cases touchées par la compétence visant `target` depuis la case de l'unité. */
export function skillArea(state: BattleState, unit: Cell, skill: SkillDef, target: Cell): Cell[] {
  const { map } = state;
  const out: Cell[] = [];
  const add = (x: number, y: number): void => {
    if (inBounds(map, x, y)) out.push({ x, y });
  };
  const area = skill.area;
  if (!area) {
    add(target.x, target.y);
    return out;
  }
  const r = area.size;
  if (area.shape === 'carre') {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) add(target.x + dx, target.y + dy);
  } else if (area.shape === 'losange') {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) add(target.x + dx, target.y + dy);
  } else {
    // Ligne perpendiculaire à la direction lanceur → case visée, centrée sur la case visée.
    const vertical = Math.abs(target.x - unit.x) >= Math.abs(target.y - unit.y);
    const half = Math.floor((r - 1) / 2);
    for (let k = -half; k < r - half; k++) add(vertical ? target.x : target.x + k, vertical ? target.y + k : target.y);
  }
  return out;
}

/** Unités vivantes touchées dans la zone, selon `affects`. */
export function unitsInArea(state: BattleState, caster: BattleUnit, skill: SkillDef, cells: readonly Cell[]): BattleUnit[] {
  const affects = skillAffects(skill);
  const out: BattleUnit[] = [];
  for (const c of cells) {
    const u = unitAt(state, c.x, c.y);
    if (!u) continue;
    const foe = hostile(u.team, caster.team);
    if (affects === 'tous' || (affects === 'ennemis' && foe) || (affects === 'allies' && !foe)) out.push(u);
  }
  return out;
}

/** Une case est-elle une cible valable pour la compétence, depuis `from` ? */
export function isSkillTarget(state: BattleState, caster: BattleUnit, skill: SkillDef, cell: Cell, from: Cell = caster): boolean {
  if (!inBounds(state.map, cell.x, cell.y)) return false;
  const d = distance(from, cell);
  if (d < skill.range[0] || d > skill.range[1]) return false;
  const effect = firstEffect(skill);
  const occupant = unitAt(state, cell.x, cell.y);
  switch (skill.target) {
    case 'soi':
      return cell.x === from.x && cell.y === from.y;
    case 'ennemi':
      return occupant !== null && occupant !== caster && hostile(occupant.team, caster.team);
    case 'allie':
      return occupant !== null && occupant !== caster && !hostile(occupant.team, caster.team) && (effect.kind !== 'soin' || occupant.hp < occupant.stats.pv || occupant.mods.length > 0);
    case 'case': {
      if (effect.kind === 'invocation') return isFreeCell(state, cell.x, cell.y);
      if (effect.kind === 'terrain') return terrainCells(state, caster, skill, cell).length > 0;
      return true;
    }
  }
}

/** Cases visables par une compétence depuis `from` (la case de l'unité par défaut). */
export function skillTargets(state: BattleState, caster: BattleUnit, skill: SkillDef, from: Cell = caster): Cell[] {
  const out: Cell[] = [];
  const [, max] = skill.range;
  for (let dy = -max; dy <= max; dy++) {
    for (let dx = -max; dx <= max; dx++) {
      const c = { x: from.x + dx, y: from.y + dy };
      if (isSkillTarget(state, caster, skill, c, from)) out.push(c);
    }
  }
  return out;
}

/** Cases du mur de ronces : franchissables et libres. */
function terrainCells(state: BattleState, caster: BattleUnit, skill: SkillDef, target: Cell): Cell[] {
  return skillArea(state, caster, skill, target).filter((c) => isFreeCell(state, c.x, c.y));
}

/** Modificateurs de frappe d'un effet « frappe ». */
export function strikeModsOf(effect: SkillEffect): StrikeMods {
  if (effect.kind !== 'frappe') return {};
  return {
    ...(effect.sureHit !== undefined ? { sureHit: effect.sureHit } : {}),
    ...(effect.damageMult !== undefined ? { damageMult: effect.damageMult } : {}),
    ...(effect.ignoreDef !== undefined ? { ignoreDef: effect.ignoreDef } : {}),
    ...(effect.bonusVs !== undefined ? { bonusVs: effect.bonusVs } : {}),
    ...(effect.bonusMult !== undefined ? { bonusMult: effect.bonusMult } : {}),
    // Frapper puis glisser : la cible n'a pas le temps de riposter.
    ...(effect.noCounter !== undefined || effect.canto !== undefined ? { noCounter: true } : {}),
  };
}

/** Prévision d'une frappe de compétence (même fenêtre que l'attaque). */
export function skillForecast(state: BattleState, caster: BattleUnit, skill: SkillDef, target: BattleUnit, rules: BattleRules): Forecast | null {
  const effect = skill.effects.find((e) => e.kind === 'frappe');
  if (!effect) return null;
  return forecast(state, caster, target, rules, caster, strikeModsOf(effect));
}

/** Dégâts d'un effet « dégâts » (sans jet) sur une unité. */
export function directDamage(state: BattleState, caster: BattleUnit, target: BattleUnit, power: number, kind: 'physique' | 'magique', rules: BattleRules): number {
  const physical = kind === 'physique';
  const terrain = terrainAt(state.map, target.x, target.y);
  let damage = (physical ? caster.stats.fo : caster.stats.mag) + power - (physical ? target.stats.def + terrain.defense : target.stats.res);
  damage = Math.max(0, damage);
  if (physical) damage = Math.max(0, damage - guardOf(target, rules));
  return Math.floor(damage * damageTakenOf(target, rules));
}

/** Soin d'un effet « soin » sur une unité. */
export function healAmount(caster: BattleUnit, target: BattleUnit, effect: Extract<SkillEffect, { kind: 'soin' }>): number {
  if (effect.ratio !== undefined) return Math.max(1, Math.floor(target.stats.pv * effect.ratio));
  return (effect.amount ?? 0) + Math.floor(caster.stats.mag / 2);
}

/** Aperçu d'une compétence sur une case : qui est touché et comment (fenêtre de prévision). */
export interface SkillPreviewLine {
  readonly unit: BattleUnit;
  readonly damage?: number;
  readonly heal?: number;
  readonly status?: string;
  readonly immune?: boolean;
}

export function previewSkill(state: BattleState, caster: BattleUnit, skill: SkillDef, target: Cell, rules: BattleRules): SkillPreviewLine[] {
  const cells = skillArea(state, caster, skill, target);
  const lines: SkillPreviewLine[] = [];
  for (const u of unitsInArea(state, caster, skill, cells)) {
    let line: { unit: BattleUnit; damage?: number; heal?: number; status?: string; immune?: boolean } = { unit: u };
    for (const effect of skill.effects) {
      if (effect.kind === 'degats') {
        line = { ...line, damage: directDamage(state, caster, u, effect.power, effect.damage, rules) };
        if (effect.status) line = { ...line, status: effect.status.id, immune: u.boss?.def.immune.includes(effect.status.id) === true };
      } else if (effect.kind === 'soin') line = { ...line, heal: Math.min(u.stats.pv - u.hp, healAmount(caster, u, effect)) };
      else if (effect.kind === 'statut') line = { ...line, status: effect.id, immune: u.boss?.def.immune.includes(effect.id) === true };
      else if (effect.kind === 'frappe') {
        const f = forecast(state, caster, u, rules, caster, strikeModsOf(effect));
        line = { ...line, damage: f.attacker.odds.damage * (f.attacker.doubles ? 2 : 1) };
        if (effect.status) line = { ...line, status: effect.status.id, immune: u.boss?.def.immune.includes(effect.status.id) === true };
      }
    }
    lines.push(line);
  }
  return lines;
}

function payCost(state: BattleState, unit: BattleUnit, skill: SkillDef): void {
  const cost = skill.cost;
  if (cost.resonance !== undefined) unit.resonance -= cost.resonance;
  if (cost.resource) unit.resources[cost.resource.id] = (unit.resources[cost.resource.id] ?? 0) - cost.resource.amount;
  if (cost.cooldown !== undefined) unit.cooldowns[skill.id] = state.turn + cost.cooldown;
}

/**
 * Applique les effets d'une compétence (sans coût ni vérification) : sert à la
 * commande `useSkill` et au cri lancé d'office par un boss qui change de phase.
 */
export function castSkill(state: BattleState, caster: BattleUnit, skill: SkillDef, target: Cell, rules: BattleRules): BattleEvent[] {
  const cells = skillArea(state, caster, skill, target);
  const events: BattleEvent[] = [{ type: 'skill', unitId: caster.id, skillId: skill.id, target, cells }];
  const results: EffectResult[] = [];
  const ko: string[] = [];
  const touched = unitsInArea(state, caster, skill, cells);
  for (const effect of skill.effects) {
    switch (effect.kind) {
      case 'frappe': {
        const defender = unitAt(state, target.x, target.y);
        if (!defender) break;
        const strikes = resolveExchange(state, caster, defender, rules, strikeModsOf(effect));
        events.push({ type: 'combat', attackerId: caster.id, defenderId: defender.id, strikes, skillId: skill.id });
        for (const u of [defender, caster]) if (u.hp <= 0) ko.push(u.id);
        const landed = strikes.some((s) => s.attackerId === caster.id && s.hit);
        if (effect.status && landed && defender.hp > 0) {
          const ok = applyStatus(state, defender, effect.status.id, effect.status.turns, caster.id, rules);
          results.push(ok ? { unitId: defender.id, status: effect.status.id, hp: defender.hp } : { unitId: defender.id, immune: effect.status.id, hp: defender.hp });
        }
        if (effect.canto && caster.hp > 0) caster.cantoLeft = effect.canto;
        break;
      }
      case 'degats':
        for (const u of touched) {
          if (u.hp <= 0) continue;
          const dealt = hurt(u, directDamage(state, caster, u, effect.power, effect.damage, rules));
          let result: EffectResult = { unitId: u.id, damage: dealt, hp: u.hp };
          if (u.hp > 0 && effect.status) {
            const ok = applyStatus(state, u, effect.status.id, effect.status.turns, caster.id, rules);
            result = ok ? { ...result, status: effect.status.id } : { ...result, immune: effect.status.id };
          }
          if (dealt > 0 && u !== caster) u.alerted = true;
          results.push(result);
          if (u.hp <= 0) ko.push(u.id);
        }
        break;
      case 'soin':
        for (const u of touched) {
          const healed = mend(u, healAmount(caster, u, effect));
          const cleansed = effect.cleanse === true && cleanse(u, rules);
          results.push({ unitId: u.id, heal: healed, ...(cleansed ? { cleansed: true } : {}), hp: u.hp });
        }
        break;
      case 'statut':
        for (const u of touched) {
          const ok = applyStatus(state, u, effect.id, effect.turns, caster.id, rules);
          results.push(ok ? { unitId: u.id, status: effect.id, hp: u.hp } : { unitId: u.id, immune: effect.id, hp: u.hp });
          if (ok && u.team !== caster.team && hostile(u.team, caster.team)) u.alerted = true;
        }
        break;
      case 'invocation': {
        const def = rules.enemies.get(effect.enemy);
        if (!def || !isFreeCell(state, target.x, target.y)) break;
        const summon = enemyUnit(rules.data, rules, { enemy: def.id, level: caster.level }, `s${state.nextId++}`, target.x, target.y, caster.team);
        summon.summonUntil = nextPhaseTurn(state, caster.team) + effect.turns;
        // Elle vient d'apparaître : elle agira à la prochaine phase de son camp.
        summon.acted = state.phase === caster.team;
        summon.moved = summon.acted;
        state.units.push(summon);
        events.push({ type: 'summon', unitId: summon.id, sourceId: caster.id });
        break;
      }
      case 'terrain': {
        const terrain = rules.terrains.get(effect.terrain);
        if (!terrain) break;
        const placed = terrainCells(state, caster, skill, target);
        for (const c of placed) {
          const index = cellIndex(state.map, c.x, c.y);
          state.overlays.push({ index, original: state.map.terrains[index] as typeof terrain, team: caster.team, until: nextPhaseTurn(state, caster.team) + effect.turns });
          state.map.terrains[index] = terrain;
        }
        if (placed.length > 0) events.push({ type: 'terrain', cells: placed, terrain: terrain.id, on: true });
        break;
      }
    }
  }
  if (results.length > 0) events.push({ type: 'effects', sourceId: caster.id, element: skill.element, results });
  for (const id of ko) if (!events.some((e) => e.type === 'ko' && e.unitId === id)) events.push({ type: 'ko', unitId: id });
  return events;
}

/**
 * Commande : lancer une compétence sur une case (`target`). Paie le coût,
 * applique les effets, termine le tour de l'unité (ou lui laisse son
 * déplacement offert après « Pas de marée »).
 */
export function useSkill(state: BattleState, unitId: string, skillId: string, target: Cell, rules: BattleRules): BattleEvent[] {
  const unit = getUnit(state, unitId);
  assertCanAction(state, unit);
  if (!unit.skills.includes(skillId)) throw new BattleError(`${unit.name} ne connaît pas cette compétence.`);
  const skill = skillDef(rules, skillId);
  const blocker = skillBlocker(state, unit, skill);
  if (blocker) throw new BattleError(`${skill.name} n'est pas prête (${blocker}).`);
  if (!isSkillTarget(state, unit, skill, target)) throw new BattleError(`${skill.name} : cible non valable.`);
  payCost(state, unit, skill);
  const events = castSkill(state, unit, skill, target, rules);
  if (unit.cantoLeft > 0 && unit.hp > 0) {
    unit.moved = false;
    unit.moveOrigin = null;
    events.push({ type: 'canto', unitId: unit.id, range: unit.cantoLeft });
  } else finishUnit(state, unit);
  return events;
}
