/**
 * IA des alliés verts (jalon M5, GDD §7.8). Les alliés ne sont **jamais**
 * commandés par le joueur : ils jouent leur propre phase, entre celle du
 * joueur et celle des ennemis, avec les mêmes estimations que l'IA ennemie.
 *
 * Priorités :
 * 1. protéger le héros et les blessés — soigner d'abord (bâton), frapper en
 *    priorité un ennemi qui menace le héros ou un membre blessé ;
 * 2. attaquer l'ennemi le plus menaçant à portée (celui qui ferait le plus de
 *    mal au héros) ;
 * 3. s'avancer vers l'ennemi le plus proche sans s'éloigner de la compagnie
 *    de plus de `balance.allies.leash` cases (4).
 *
 * Module pur, déterministe.
 */
import { strikeOdds } from '../combat/combat';
import { distance, getUnit, inBounds, reachable } from '../tactics/grid';
import { talkRefusal, talkTargets, talkableEnemies } from '../tactics/talk';
import { hostile, type BattleRules, type BattleState, type BattleUnit, type Cell } from '../tactics/types';
import { approach, bestAction, healScore, threatReach, type AiPlan } from './enemyAi';

/** Poids propres aux alliés. */
export const ALLY_W = { protectHero: 14, protectWounded: 9, menace: 0.5 } as const;

/** Membres de la compagnie (hors invocations), que les alliés protègent et ne quittent pas. */
function members(state: BattleState): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && u.team === 'player' && u.summonUntil === null);
}

/**
 * Bonus de protection d'une cible ennemie : elle peut atteindre le héros (ou un
 * membre blessé) au prochain tour ; plus elle lui ferait de mal, plus elle est menaçante.
 */
export function menaceBonus(state: BattleState, enemy: BattleUnit, rules: BattleRules): number {
  let bonus = 0;
  for (const m of members(state)) {
    if (distance(enemy, m) > threatReach(enemy)) continue;
    if (m.isHero) {
      const harm = strikeOdds(state, enemy, m, m, rules).damage;
      bonus = Math.max(bonus, ALLY_W.protectHero + ALLY_W.menace * harm);
    } else if (m.hp < m.stats.pv / 2) bonus = Math.max(bonus, ALLY_W.protectWounded);
  }
  return bonus;
}

/** Choisit l'action d'un allié vert (ne modifie pas l'état). */
export function planAllyAction(state: BattleState, unitId: string, rules: BattleRules): AiPlan {
  const unit = getUnit(state, unitId);
  const here: Cell = { x: unit.x, y: unit.y };
  const stops = reachable(state, unit).stops.filter((c) => inBounds(state.map, c.x, c.y));
  // Allié vert nommé : parler d'abord à un nommé recrutable qui l'écouterait (n°184).
  const talk = talkPlan(state, unit, [here, ...stops], rules);
  if (talk) return talk;
  const best = bestAction(state, unit, stops, rules, (target) => (hostile(target.team, unit.team) ? menaceBonus(state, target, rules) : 0));
  if (best && best.score > -Infinity) return best.plan;
  // Rester à `leash` cases au plus d'un membre de la compagnie.
  const leash = rules.allies.leash;
  const party = members(state);
  const near = (c: Cell): boolean => party.length === 0 || party.some((m) => distance(m, c) <= leash);
  const to = approach(state, unit, stops, near);
  if (to.x !== here.x || to.y !== here.y || near(here)) return { unitId, to, targetId: null };
  // Trop loin de la compagnie : la rejoindre.
  let rejoin = here;
  let bestD = Infinity;
  for (const stop of stops) {
    const d = Math.min(...party.map((m) => distance(m, stop)));
    if (d < bestD) {
      bestD = d;
      rejoin = stop;
    }
  }
  return { unitId, to: rejoin, targetId: null };
}

/**
 * Allié vert nommé interlocuteur d'un nommé recrutable : il va lui parler s'il
 * peut se coller à lui ce tour-ci et si le nommé accepterait (pas de refus
 * inutile). La première case d'arrêt qui convient l'emporte (déterministe).
 */
function talkPlan(state: BattleState, unit: BattleUnit, stops: readonly Cell[], rules: BattleRules): AiPlan | null {
  if (unit.charId === null) return null;
  const willing = talkableEnemies(state, unit, rules).filter((e) => talkRefusal(state, e, rules) === null);
  if (willing.length === 0) return null;
  for (const stop of stops) {
    const occupied = state.units.some((u) => u !== unit && u.hp > 0 && u.x === stop.x && u.y === stop.y);
    if (occupied) continue;
    const target = talkTargets(state, unit, rules, stop).find((e) => willing.includes(e));
    if (target) return { unitId: unit.id, to: stop, targetId: null, talkId: target.id };
  }
  return null;
}

export { healScore };
