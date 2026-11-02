/**
 * XP et montée de niveau (GDD §9.12, §8.2 ; jalon M6, décisions n°128 à n°132).
 * Module pur.
 *
 * Après chaque commande du combat, `grantXp` lit les événements produits et
 * verse l'XP aux unités qui en gagnent (la compagnie et les alliés errants) :
 * - échange de coups (attaque ou compétence de frappe) : coup fatal ou coup non létal ;
 * - compétence ou objet sans frappe : dégâts comme une attaque, sinon soin (15)
 *   ou soutien (10) ; un objet sur un allié compte toujours comme soutien ;
 * - soin au bâton : soin (15) ;
 * - ennemi achevé par un statut (Brûlure, Poison) : coup fatal pour celui qui l'a posé ;
 * - l'XP d'une invocation va à son invocateur ;
 * - victoire : bonus à tous les membres déployés, KO compris.
 *
 * La montée de niveau est immédiate (décision n°129) : chaque stat monte si un
 * dé de 0 à 99 est sous sa croissance (une croissance de 100 % ou plus donne
 * un point sûr par centaine) ; si rien ne monte, la stat qui a raté de plus
 * près monte. Le tirage utilise un hasard séparé (`state.growthRng`) pour ne
 * pas changer les jets du combat. Les alliés errants suivent la croissance
 * moyenne (n°52, n°132) : leurs stats ne dépendent que du niveau.
 */
import { GROWTH_KEYS, type GrowthBlock } from '../../data/schemas';
import { Rng } from '../rng';
import { isMember } from '../tactics/battleCore';
import { getUnit } from '../tactics/grid';
import { refreshStats } from '../tactics/status';
import { hostile, type BattleEvent, type BattleRules, type BattleState, type BattleUnit, type GrowthKey, type LevelUp, type StatGains } from '../tactics/types';
import { statsAtLevel } from '../units/stats';

/** Hasard des montées de niveau, dérivé de l'état du combat la première fois. */
export function growthRng(state: BattleState): Rng {
  state.growthRng ??= Rng.fromSeed(`${state.rng.getState().join(':')}#croissances`);
  return state.growthRng;
}

/** Tire une montée de niveau (décision n°129). */
export function rollLevelUp(growths: GrowthBlock, rng: Rng): StatGains {
  const gains: StatGains = {};
  let total = 0;
  let closest: GrowthKey | null = null;
  let closestMiss = Infinity;
  for (const key of GROWTH_KEYS) {
    const growth = growths[key];
    const sure = Math.floor(growth / 100);
    const chance = growth % 100;
    const roll = rng.int(0, 99);
    const gain = sure + (roll < chance ? 1 : 0);
    if (gain > 0) {
      gains[key] = gain;
      total += gain;
    } else if (chance > 0 && roll - chance < closestMiss) {
      closestMiss = roll - chance;
      closest = key;
    }
  }
  if (total === 0) {
    // Garantie : au moins une stat monte. Sans croissance du tout, les PV.
    const key = closest ?? GROWTH_KEYS.reduce<GrowthKey>((best, k) => (growths[k] > growths[best] ? k : best), 'pv');
    gains[key] = 1;
  }
  return gains;
}

/** Stats gagnées par un allié errant qui passe au niveau `level` (croissance moyenne). */
function averageGains(rules: BattleRules, unit: BattleUnit, level: number): StatGains {
  const cls = rules.data.classes.find((c) => c.id === unit.kindId);
  if (!cls) return {};
  const before = statsAtLevel(cls.baseStats, cls.growths, level - 1);
  const after = statsAtLevel(cls.baseStats, cls.growths, level);
  const gains: StatGains = {};
  for (const key of GROWTH_KEYS) if (after[key] > before[key]) gains[key] = after[key] - before[key];
  return gains;
}

function applyGains(unit: BattleUnit, gains: StatGains): void {
  for (const [key, value] of Object.entries(gains) as [GrowthKey, number][]) {
    unit.base[key] += value;
    unit.gains[key] = (unit.gains[key] ?? 0) + value;
    if (key === 'pv' && unit.hp > 0) unit.hp += value;
  }
}

/**
 * Ajoute de l'XP à une unité et applique les montées de niveau. Au plafond
 * (décision n°131), l'XP en trop est perdue et la barre reste à 0 (« MAX »).
 */
export function addXp(state: BattleState, rules: BattleRules, unit: BattleUnit, amount: number): LevelUp[] {
  const perLevel = rules.data.balance.xp.perLevel;
  const levelUps: LevelUp[] = [];
  if (unit.xp === null || unit.growths === null || amount <= 0 || unit.level >= unit.levelCap) return levelUps;
  unit.xp += amount;
  while (unit.xp >= perLevel && unit.level < unit.levelCap) {
    unit.xp -= perLevel;
    unit.level += 1;
    const gains = unit.allySource === 'errant' ? averageGains(rules, unit, unit.level) : rollLevelUp(unit.growths, growthRng(state));
    applyGains(unit, gains);
    levelUps.push({ level: unit.level, gains });
  }
  if (unit.level >= unit.levelCap) unit.xp = 0;
  if (levelUps.length > 0) refreshStats(unit, rules);
  return levelUps;
}

/* ---------- Barème (GDD §9.12) ---------- */

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export function nonLethalXp(rules: BattleRules, unitLevel: number, targetLevel: number): number {
  const c = rules.data.balance.xp.nonLethal;
  return clamp(c.base + c.perLevelGap * (targetLevel - unitLevel), c.min, c.max);
}

export function killXp(rules: BattleRules, unitLevel: number, targetLevel: number, boss: boolean): number {
  const c = rules.data.balance.xp;
  return clamp(c.kill.base + c.kill.perLevelGap * (targetLevel - unitLevel), c.kill.min, c.kill.max) + (boss ? c.bossKillBonus : 0);
}

/** Qui reçoit l'XP d'une unité : elle-même, ou son invocateur. */
function earnerOf(state: BattleState, unit: BattleUnit): BattleUnit | null {
  const earner = unit.ownerId ? state.units.find((u) => u.id === unit.ownerId) ?? null : unit;
  return earner && earner.xp !== null && earner.hp > 0 ? earner : null;
}

/**
 * Multiplicateur de l'XP d'action (GDD §8.2) : rattrapage ×1,25 pour une unité
 * 3 niveaux sous la moyenne des membres déployés, ×0,5 quand cette moyenne
 * dépasse de 5 niveaux le plafond de la zone.
 */
export function xpMultiplier(state: BattleState, rules: BattleRules, unit: BattleUnit): number {
  const c = rules.data.balance.xp;
  const members = state.units.filter(isMember);
  if (members.length === 0) return 1;
  const average = members.reduce((n, u) => n + u.level, 0) / members.length;
  let factor = 1;
  if (unit.level <= average - c.catchUp.levelsBelowTeamAverage) factor *= c.catchUp.multiplier;
  const zone = rules.data.zones.find((z) => z.id === state.zone);
  if (zone && average >= zone.levelMax + c.overLevel.levelsAboveZone) factor *= c.overLevel.multiplier;
  return factor;
}

/**
 * XP gagnée par les événements d'une commande (voir l'en-tête). Renvoie les
 * événements `xp`, déjà appliqués aux unités, à jouer après les autres.
 */
export function grantXp(state: BattleState, rules: BattleRules, events: readonly BattleEvent[]): BattleEvent[] {
  const c = rules.data.balance.xp;
  const earned = new Map<BattleUnit, number>();
  const add = (unit: BattleUnit | null, amount: number): void => {
    if (!unit || amount <= 0) return;
    earned.set(unit, (earned.get(unit) ?? 0) + amount);
  };
  const find = (id: string): BattleUnit | null => state.units.find((u) => u.id === id) ?? null;
  let itemUser: string | null = null;
  let victory = false;

  for (const event of events) {
    switch (event.type) {
      case 'combat': {
        const a = getUnit(state, event.attackerId);
        const d = getUnit(state, event.defenderId);
        for (const [me, other] of [
          [a, d],
          [d, a],
        ] as const) {
          const mine = event.strikes.filter((s) => s.attackerId === me.id);
          if (mine.length === 0) continue;
          const earner = earnerOf(state, me);
          if (!earner) continue;
          const killed = mine.some((s) => s.hit && s.targetHp <= 0);
          add(earner, killed ? killXp(rules, earner.level, other.level, other.isBoss) : nonLethalXp(rules, earner.level, other.level));
        }
        break;
      }
      case 'item':
        itemUser = event.unitId;
        break;
      case 'effects': {
        const source = find(event.sourceId);
        const fromItem = itemUser === event.sourceId;
        itemUser = null;
        const earner = source ? earnerOf(state, source) : null;
        if (!source || !earner) break;
        let kills = 0;
        let hit = 0;
        let healed = false;
        let helped = false;
        for (const r of event.results) {
          const target = find(r.unitId);
          if (!target) continue;
          if (hostile(source.team, target.team)) {
            if ((r.damage ?? 0) > 0) {
              if (target.hp <= 0) kills += killXp(rules, earner.level, target.level, target.isBoss);
              else hit = Math.max(hit, nonLethalXp(rules, earner.level, target.level));
            } else if (r.status) helped = true;
          } else {
            if ((r.heal ?? 0) > 0) healed = true;
            if (r.status || r.cleansed) helped = true;
          }
        }
        const fight = Math.min(c.kill.max + c.bossKillBonus, kills + hit);
        if (fight > 0) add(earner, fight);
        else if (healed && !fromItem) add(earner, c.heal);
        else if (healed || helped) add(earner, c.support);
        break;
      }
      case 'heal':
        if (event.sourceId) {
          const source = find(event.sourceId);
          add(source ? earnerOf(state, source) : null, c.heal);
        }
        break;
      case 'dot': {
        if (event.hp > 0) break;
        const victim = find(event.unitId);
        const mod = victim?.mods.find((m) => m.status === event.status);
        const source = mod ? find(mod.sourceId) : null;
        if (!victim || !source || !hostile(source.team, victim.team)) break;
        const earner = earnerOf(state, source);
        if (earner) add(earner, killXp(rules, earner.level, victim.level, victim.isBoss));
        break;
      }
      case 'thorns': {
        if (event.hp > 0) break;
        const victim = find(event.unitId);
        const source = find(event.sourceId);
        const earner = source ? earnerOf(state, source) : null;
        if (victim && earner) add(earner, killXp(rules, earner.level, victim.level, victim.isBoss));
        break;
      }
      case 'outcome':
        if (event.outcome === 'victory') victory = true;
        break;
      default:
        break;
    }
  }

  // Montant de chaque unité : XP d'action multipliée, puis bonus de victoire.
  const totals = new Map<BattleUnit, { amount: number; bonus: number }>();
  for (const [unit, raw] of earned) totals.set(unit, { amount: Math.max(1, Math.round(raw * xpMultiplier(state, rules, unit))), bonus: 0 });
  if (victory) {
    for (const unit of state.units) {
      if (!isMember(unit) || unit.xp === null) continue;
      const entry = totals.get(unit) ?? { amount: 0, bonus: 0 };
      entry.bonus = c.victoryBonus;
      totals.set(unit, entry);
    }
  }

  const out: BattleEvent[] = [];
  for (const [unit, { amount, bonus }] of totals) {
    if (unit.xp === null || unit.level >= unit.levelCap) continue;
    const before = { level: unit.level, xp: unit.xp };
    const levelUps = addXp(state, rules, unit, amount + bonus);
    out.push({ type: 'xp', unitId: unit.id, amount, bonus, before, after: { level: unit.level, xp: unit.xp ?? 0 }, levelUps });
  }
  return out;
}
