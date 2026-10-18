/**
 * Boss à deux phases (jalon M5, GDD §9.11) : quand les PV d'un boss passent
 * sous le seuil de sa fiche (50 %), il change de visage — réplique, nouvelles
 * compétences, nouveau profil d'IA (Brakk quitte son trône), stats gagnées, et
 * parfois un cri lancé aussitôt, sans coût (Cri de pillage).
 *
 * Immunités (fiche `immune`) : les statuts listés sont sans effet sur lui
 * (Gelé : immunité à l'étourdissement). Sa vulnérabilité aux classes anti-boss
 * passe par les armes « efficaces contre les boss » (harpon du Chasseur).
 * Module pur.
 */
import { castSkill, skillDef } from './skills';
import { refreshStats } from './status';
import type { BattleEvent, BattleRules, BattleState, BattleUnit } from './types';

/** PV sous lesquels le boss passe en seconde phase. */
export function phaseThreshold(unit: BattleUnit): number | null {
  if (!unit.boss) return null;
  return Math.floor(unit.stats.pv * unit.boss.def.phase2.threshold);
}

function enterPhase2(state: BattleState, unit: BattleUnit, rules: BattleRules): BattleEvent[] {
  const boss = unit.boss;
  if (!boss) return [];
  const p2 = boss.def.phase2;
  boss.phase = 2;
  unit.skills = [...p2.skills];
  unit.ai = p2.ai;
  unit.alerted = true;
  if (p2.stats) {
    const base: Record<string, number> = { ...unit.base };
    for (const [k, v] of Object.entries(p2.stats)) base[k] = (base[k] ?? 0) + v;
    unit.base = base as BattleUnit['base'];
    refreshStats(unit, rules);
  }
  const events: BattleEvent[] = [{ type: 'bossPhase', unitId: unit.id, line: p2.line }];
  if (p2.onEnter) {
    const skill = skillDef(rules, p2.onEnter);
    events.push(...castSkill(state, unit, skill, { x: unit.x, y: unit.y }, rules));
    if (skill.cost.cooldown !== undefined) unit.cooldowns[skill.id] = state.turn + skill.cost.cooldown;
  }
  return events;
}

/** À appeler après tout ce qui blesse : fait passer en seconde phase les boss sous leur seuil. */
export function checkBossPhases(state: BattleState, rules: BattleRules): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (state.outcome !== 'ongoing') return events;
  for (const unit of state.units) {
    if (!unit.boss || unit.boss.phase !== 1 || unit.hp <= 0) continue;
    const threshold = phaseThreshold(unit);
    if (threshold !== null && unit.hp <= threshold) events.push(...enterPhase2(state, unit, rules));
  }
  return events;
}
