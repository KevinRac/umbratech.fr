/**
 * Statuts et renforts posés sur les unités (jalon M5, GDD §9.9) : Gelé,
 * Brûlure, Harponné, Rempart, Appel aux armes… Ils sont décrits par les données
 * (skills.json › statuses) ; ce module les pose, calcule leurs effets et les
 * retire à temps.
 *
 * Durée : un statut de N tours couvre N phases du camp de l'unité touchée, la
 * phase en cours comprise si c'est la sienne. Il est retiré au début de la
 * phase de son camp dont le tour atteint `until`. Exemples : Rempart (1 tour)
 * posé en phase du joueur couvre la phase ennemie qui suit et disparaît à la
 * phase du joueur suivante ; Gelé (1 tour) posé sur un ennemi lui fait perdre
 * sa prochaine phase.
 */
import type { StatBlock, StatusDef } from '../../data/schemas';
import { PHASE_ORDER, type BattleRules, type BattleState, type BattleUnit, type Modifier, type Team } from './types';

export function statusDef(rules: BattleRules, id: string): StatusDef {
  const def = rules.statuses.get(id);
  if (!def) throw new Error(`Statut inconnu : « ${id} »`);
  return def;
}

/** Tour de la prochaine phase du camp `team` (la phase en cours si c'est la sienne). */
export function nextPhaseTurn(state: BattleState, team: Team): number {
  if (state.phase === team) return state.turn;
  return PHASE_ORDER.indexOf(team) > PHASE_ORDER.indexOf(state.phase) ? state.turn : state.turn + 1;
}

/** Recalcule les stats effectives : base + statuts (jamais négatives, Mob ≥ 1, PV max inchangés). */
export function refreshStats(unit: BattleUnit, rules: BattleRules): void {
  const s: Record<keyof StatBlock, number> = { ...unit.base };
  for (const mod of unit.mods) {
    const bonus = rules.statuses.get(mod.status)?.stats;
    if (!bonus) continue;
    for (const [key, value] of Object.entries(bonus) as [keyof StatBlock, number][]) s[key] += value;
  }
  for (const key of Object.keys(s) as (keyof StatBlock)[]) s[key] = Math.max(key === 'mob' || key === 'pv' ? 1 : 0, s[key]);
  s.pv = unit.base.pv;
  unit.stats = s;
  unit.hp = Math.min(unit.hp, unit.stats.pv);
  unit.moveCap = maxMoveOf(unit, rules);
}

export function hasStatus(unit: BattleUnit, id: string): boolean {
  return unit.mods.some((m) => m.status === id);
}

/** Le statut est sans effet sur un boss qui y est immunisé (GDD §9.11). */
export function isImmune(unit: BattleUnit, id: string): boolean {
  return unit.boss?.def.immune.includes(id) === true;
}

/**
 * Pose un statut pour `turns` tours (le même statut est prolongé, jamais
 * cumulé). Renvoie faux si l'unité y est immunisée.
 */
export function applyStatus(state: BattleState, unit: BattleUnit, id: string, turns: number, sourceId: string, rules: BattleRules): boolean {
  statusDef(rules, id);
  if (isImmune(unit, id)) return false;
  const until = nextPhaseTurn(state, unit.team) + turns;
  const existing = unit.mods.findIndex((m) => m.status === id);
  const mod: Modifier = { status: id, until, sourceId };
  if (existing >= 0) {
    const old = unit.mods[existing] as Modifier;
    unit.mods[existing] = old.until >= until ? old : mod;
  } else unit.mods.push(mod);
  refreshStats(unit, rules);
  return true;
}

/** Retire les affaiblissements (objets de soin, Halo). Renvoie vrai si quelque chose a été retiré. */
export function cleanse(unit: BattleUnit, rules: BattleRules): boolean {
  const before = unit.mods.length;
  unit.mods = unit.mods.filter((m) => rules.statuses.get(m.status)?.kind !== 'debuff');
  if (unit.mods.length === before) return false;
  refreshStats(unit, rules);
  return true;
}

const sum = (unit: BattleUnit, rules: BattleRules, pick: (s: StatusDef) => number | undefined): number =>
  unit.mods.reduce((n, m) => n + (pick(statusDef(rules, m.status)) ?? 0), 0);

/** Dégâts physiques retirés (Rempart de Marée). */
export const guardOf = (unit: BattleUnit, rules: BattleRules): number => sum(unit, rules, (s) => s.guard);
/** Esquive ajoutée (Voile de brume). */
export const avoidBonusOf = (unit: BattleUnit, rules: BattleRules): number => sum(unit, rules, (s) => s.avoid);

/** Multiplicateur des dégâts reçus (Harponné : ×1,25). */
export function damageTakenOf(unit: BattleUnit, rules: BattleRules): number {
  return unit.mods.reduce((n, m) => n * (statusDef(rules, m.status).damageTaken ?? 1), 1);
}

/** Déplacement maximal imposé par un statut (Entravé : 0, Harponné : 2), ou null. */
export function maxMoveOf(unit: BattleUnit, rules: BattleRules): number | null {
  let max: number | null = null;
  for (const m of unit.mods) {
    const v = statusDef(rules, m.status).maxMove;
    if (v !== undefined) max = max === null ? v : Math.min(max, v);
  }
  return max;
}

export function isStunned(unit: BattleUnit, rules: BattleRules): boolean {
  return unit.mods.some((m) => statusDef(rules, m.status).stun === true);
}

/** Statuts expirés au début d'une phase du camp de l'unité : retirés, renvoyés. */
export function expireStatuses(state: BattleState, unit: BattleUnit, rules: BattleRules): string[] {
  const gone = unit.mods.filter((m) => state.turn >= m.until).map((m) => m.status);
  if (gone.length === 0) return [];
  unit.mods = unit.mods.filter((m) => state.turn < m.until);
  refreshStats(unit, rules);
  return gone;
}
