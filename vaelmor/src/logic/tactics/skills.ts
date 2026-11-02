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
import { EVO, healBonus, LINEAGE, oathHolds, PASSIVE, resonanceCost } from '../progression/traits';
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

/** Résonance que coûte la compétence à cette unité, ce tour-ci (Fiole du Gel en hiver, n°125). */
export function skillResonance(state: BattleState, unit: BattleUnit, skill: SkillDef): number | undefined {
  const base = skill.cost.resonance;
  if (base === undefined) return undefined;
  return resonanceCost(state, unit, skill.owner, base);
}

/** Ce qui manque pour lancer la compétence (null : elle est prête). */
export function skillBlocker(state: BattleState, unit: BattleUnit, skill: SkillDef): string | null {
  const cost = skill.cost;
  const resonance = skillResonance(state, unit, skill);
  if (resonance !== undefined && unit.resonance < resonance) return `Résonance ${unit.resonance}/${resonance}`;
  if (cost.resource && (unit.resources[cost.resource.id] ?? 0) < cost.resource.amount) return 'Plus de réserve';
  if (cost.cooldown !== undefined && state.turn < (unit.cooldowns[skill.id] ?? 0)) return `Prête au tour ${unit.cooldowns[skill.id]}`;
  return null;
}

/** Libellé du coût (« 40 Rés. », « 1 Pierre ») ; `resonance` : coût du moment s'il diffère (hiver). */
export function costLabel(skill: SkillDef, resourceName?: string, resonance?: number): string {
  if (skill.cost.resonance !== undefined) return `${resonance ?? skill.cost.resonance} Rés.`;
  if (skill.cost.resource) return `${skill.cost.resource.amount} ${resourceName ?? skill.cost.resource.id}`;
  return `${skill.cost.cooldown ?? 0} t.`;
}

const firstEffect = (skill: SkillDef): SkillEffect => skill.effects[0] as SkillEffect;

/**
 * Zone d'une compétence pour ce lanceur (évolutions, n°144) : Nuée de braises
 * en 5×5 pour le Maître de Braise, Halo et Fiole du Gel en 3×3 pour
 * l'Archi-Lanterne et le Grand Alchimiste du Gel.
 */
export function areaOf(caster: { readonly evolution?: string | null }, skill: SkillDef): SkillDef['area'] {
  const evo = caster.evolution ?? null;
  if (evo === 'maitre_de_braise' && skill.owner === 'heritier_des_cendres' && skill.area) return { ...skill.area, size: skill.area.size + 1 };
  if ((evo === 'archi_lanterne' && skill.owner === 'porte_lanterne') || (evo === 'grand_alchimiste_du_gel' && skill.owner === 'alchimiste_des_saisons')) return { shape: 'carre', size: 1 };
  return skill.area;
}

/** Qui une compétence touche dans sa zone. */
export function skillAffects(skill: SkillDef, caster: { readonly evolution?: string | null } | null = null): 'ennemis' | 'allies' | 'tous' {
  // Maître de Braise : la Nuée épargne les alliés.
  if (caster?.evolution === 'maitre_de_braise' && skill.owner === 'heritier_des_cendres') return 'ennemis';
  if (skill.affects) return skill.affects;
  if (skill.target === 'ennemi') return 'ennemis';
  if (skill.target === 'allie' || skill.target === 'soi') return 'allies';
  return 'ennemis';
}

/** Cases touchées par la compétence visant `target` depuis la case de l'unité. */
export function skillArea(state: BattleState, unit: Cell & { readonly passive?: string | null; readonly evolution?: string | null }, skill: SkillDef, target: Cell): Cell[] {
  const { map } = state;
  const out: Cell[] = [];
  const add = (x: number, y: number): void => {
    if (inBounds(map, x, y)) out.push({ x, y });
  };
  const area = areaOf(unit, skill);
  if (!area) {
    add(target.x, target.y);
    return out;
  }
  // Racines profondes (n°93) : le mur de ronces gagne une case.
  const r = area.size + (unit.passive === 'racines_profondes' && skill.effects.some((e) => e.kind === 'terrain') ? 1 : 0);
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
  const affects = skillAffects(skill, caster);
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
    skill: true,
  };
}

/**
 * Frappe de compétence d'une unité : Estocade jurée vaut ×1,5 si le Serment
 * tient, ×1,2 s'il est brisé (n°123).
 */
export function frappeMods(state: BattleState, caster: BattleUnit, skill: SkillDef, effect: SkillEffect): StrikeMods {
  const mods = strikeModsOf(effect);
  if (skill.owner !== LINEAGE.lame || caster.oath === null) return mods;
  const o = state.mechanics.oath;
  return { ...mods, damageMult: oathHolds(caster) ? o.estocadeKept : o.estocadeBroken };
}

/** Prévision d'une frappe de compétence (même fenêtre que l'attaque). */
export function skillForecast(state: BattleState, caster: BattleUnit, skill: SkillDef, target: BattleUnit, rules: BattleRules): Forecast | null {
  const effect = skill.effects.find((e) => e.kind === 'frappe');
  if (!effect) return null;
  return forecast(state, caster, target, rules, caster, frappeMods(state, caster, skill, effect));
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
  if (effect.ratio !== undefined) return Math.max(1, Math.floor(target.stats.pv * effect.ratio)) + healBonus(caster);
  return (effect.amount ?? 0) + Math.floor(caster.stats.mag / 2) + healBonus(caster);
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
        const f = forecast(state, caster, u, rules, caster, frappeMods(state, caster, skill, effect));
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
  const resonance = skillResonance(state, unit, skill);
  if (resonance !== undefined) unit.resonance -= resonance;
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
        const strikes = resolveExchange(state, caster, defender, rules, frappeMods(state, caster, skill, effect));
        events.push({ type: 'combat', attackerId: caster.id, defenderId: defender.id, strikes, skillId: skill.id });
        events.push(...evolutionStrikeEffects(state, caster, defender, skill, strikes.some((x) => x.attackerId === caster.id && x.hit), rules, ko));
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
        // Maréchal de Cendre : une fois par combat, l'Appel rend leur action aux alliés touchés.
        if (caster.evolution === 'marechal_de_cendre' && skill.owner === 'heraut_des_bannieres' && !caster.tally['rally']) {
          caster.tally['rally'] = 1;
          for (const u of touched) {
            if (u === caster || hostile(u.team, caster.team) || !u.acted) continue;
            u.acted = false;
            u.moved = false;
          }
        }
        break;
      case 'invocation': {
        // Chuchoteur de Menhirs : un menhir-tour qui tire à 2 cases au lieu du golem.
        const def = rules.enemies.get(caster.evolution === 'chuchoteur_de_menhirs' ? 'menhir_tour' : effect.enemy);
        if (!def || !isFreeCell(state, target.x, target.y)) break;
        const summon = enemyUnit(rules.data, rules, { enemy: def.id, level: caster.level }, `s${state.nextId++}`, target.x, target.y, caster.team);
        summon.summonUntil = nextPhaseTurn(state, caster.team) + effect.turns;
        summon.ownerId = caster.id;
        // Golem ancien (n°93) : +5 PV, +2 Fo ; Éveilleur de Colosse : +15 PV, +3 Fo.
        const extraHp = (caster.passive === 'golem_ancien' ? PASSIVE.ancientGolemHp : 0) + (caster.evolution === 'eveilleur_de_colosse' ? EVO.colossusHp : 0);
        const extraFo = (caster.passive === 'golem_ancien' ? PASSIVE.ancientGolemFo : 0) + (caster.evolution === 'eveilleur_de_colosse' ? EVO.colossusFo : 0);
        if (extraHp > 0 || extraFo > 0) {
          summon.base = { ...summon.base, pv: summon.base.pv + extraHp, fo: summon.base.fo + extraFo };
          summon.stats = { ...summon.base };
          summon.hp = summon.base.pv;
        }
        // Elle vient d'apparaître : elle agira à la prochaine phase de son camp.
        summon.acted = state.phase === caster.team;
        summon.moved = summon.acted;
        state.units.push(summon);
        events.push({ type: 'summon', unitId: summon.id, sourceId: caster.id });
        break;
      }
      case 'terrain': {
        // Sylvarque : le mur devient un bosquet (forêt), où ses alliés se soignent.
        const terrain = rules.terrains.get(caster.evolution === 'sylvarque' ? 'foret' : effect.terrain);
        if (!terrain) break;
        const placed = terrainCells(state, caster, skill, target);
        for (const c of placed) {
          const index = cellIndex(state.map, c.x, c.y);
          // Racines profondes (n°93) : un tour de plus.
          const turns = effect.turns + (caster.passive === 'racines_profondes' ? 1 : 0);
          state.overlays.push({ index, original: state.map.terrains[index] as typeof terrain, team: caster.team, until: nextPhaseTurn(state, caster.team) + turns, sourceId: caster.id });
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
 * Effets d'évolution d'une frappe de compétence (n°144) : Harponneur Abyssal
 * (attire la cible de 2 cases), Artificier Sapeur (Perce-armure blesse les
 * ennemis collés à la cible).
 */
function evolutionStrikeEffects(state: BattleState, caster: BattleUnit, defender: BattleUnit, skill: SkillDef, landed: boolean, rules: BattleRules, ko: string[]): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (!landed || caster.hp <= 0) return events;
  if (caster.evolution === 'harponneur_abyssal' && skill.owner === 'chasseur_de_serpents_de_mer' && defender.hp > 0) {
    const path = [{ x: defender.x, y: defender.y }];
    for (let i = 0; i < EVO.harpoonPull; i++) {
      const cur = path[path.length - 1] as Cell;
      const dx = Math.sign(caster.x - cur.x);
      const dy = dx !== 0 ? 0 : Math.sign(caster.y - cur.y);
      const next = { x: cur.x + dx, y: cur.y + dy };
      if ((next.x === caster.x && next.y === caster.y) || !isFreeCell(state, next.x, next.y)) break;
      path.push(next);
    }
    if (path.length > 1) {
      const end = path[path.length - 1] as Cell;
      defender.x = end.x;
      defender.y = end.y;
      events.push({ type: 'move', unitId: defender.id, path });
    }
  }
  if (caster.evolution === 'artificier_sapeur' && skill.owner === 'ingenieur_des_ruines') {
    const results: EffectResult[] = [];
    for (const u of state.units) {
      if (u === defender || u.hp <= 0 || !hostile(u.team, caster.team) || Math.abs(u.x - defender.x) + Math.abs(u.y - defender.y) !== 1) continue;
      const dealt = hurt(u, EVO.sapperBlast);
      results.push({ unitId: u.id, damage: dealt, hp: u.hp });
      if (u.hp <= 0) ko.push(u.id);
    }
    if (results.length > 0) events.push({ type: 'effects', sourceId: caster.id, element: 'pierre', results });
  }
  void rules;
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
