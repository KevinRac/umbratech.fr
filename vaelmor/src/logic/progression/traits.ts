/**
 * Passives des niveaux 5 et 15 (décision n°93) et mécaniques de classe
 * (décisions n°123 à n°127). Module pur : le combat, les statuts, la grille et
 * les soins appellent ces fonctions aux bons endroits ; aucun n'en connaît le
 * détail.
 *
 * - Une passive est **équipée** (une seule) : `unit.passive`. Les données
 *   (nom, niveau, description) sont dans `classes.json › passives` ; leurs
 *   effets sont ici, rangés par identifiant (`PASSIVE_IDS`).
 * - Une mécanique dépend de la **lignée** de l'unité (`unit.lineage` : sa classe
 *   de base, qu'elle garde après une évolution) :
 *   - Serment (Lame du Serment) : choisi à la préparation ; +10 % de dégâts tant
 *     qu'il tient ; Estocade jurée ×1,5 s'il tient, ×1,2 sinon.
 *   - Hauteur (Veilleur des Falaises) : +10 précision depuis forêt, montagne, ruines.
 *   - Saisons (Alchimiste des Saisons) : une par tour (hiver, printemps, été, automne).
 *   - Fil d'eau (Danseur des Courants) : gués et marais à 1, eau franchissable à 2,
 *     ni enlisement ni malus d'esquive.
 *   - Fanfare (Héraut des Bannières) : les alliés à 2 cases gagnent +5 Résonance par coup porté.
 */
import type { ClassDef, TerrainDef } from '../../data/schemas';
import { hostile, type BattleEvent, type BattleMap, type BattleRules, type BattleState, type BattleUnit, type Cell } from '../tactics/types';

/** Identifiants des passives dont l'effet est codé ici (un test vérifie qu'elles couvrent les données). */
export const PASSIVE_IDS = [
  'garde_rapprochee',
  'inebranlable',
  'fil_tranchant',
  'lame_d_honneur',
  'oeil_de_faucon',
  'tir_couvert',
  'braises_vives',
  'cendre_ardente',
  'lumiere_douce',
  'veille',
  'etendard',
  'hymne',
  'mains_sures',
  'distillation',
  'pas_leger',
  'contre_courant',
  'pierre_de_plus',
  'golem_ancien',
  'epines',
  'racines_profondes',
  'charge_de_plus',
  'mecanique_precise',
  'instinct_de_chasse',
  'prise_ferme',
] as const;

/** Valeurs fixes des passives (n°93). */
export const PASSIVE = {
  guardDef: 2,
  steadyHp: 5,
  edgeCrit: 10,
  honorDamage: 3,
  hawkHit: 10,
  emberMag: 2,
  lightHeal: 3,
  vigilHeal: 3,
  bannerAvoid: 10,
  bannerRange: 2,
  handsHeal: 5,
  lightStepAvoid: 15,
  undertowResonance: 10,
  ancientGolemHp: 5,
  ancientGolemFo: 2,
  thornsDamage: 3,
  preciseMult: 1.2,
  huntHit: 10,
} as const;

/* ---------- Passives apprises et équipée ---------- */

export type PassiveDef = ClassDef['passives'][number];

/** Passives apprises à ce niveau, dans l'ordre d'apprentissage. */
export function learnedPassives(cls: ClassDef, level: number): PassiveDef[] {
  return cls.passives.filter((p) => p.level <= level).sort((a, b) => a.level - b.level);
}

/** Passive équipée : le choix du joueur s'il est appris, sinon la dernière apprise (n°93). */
export function equippedPassive(cls: ClassDef, level: number, chosen: string | null | undefined): string | null {
  const learned = learnedPassives(cls, level);
  if (chosen && learned.some((p) => p.id === chosen)) return chosen;
  return learned[learned.length - 1]?.id ?? null;
}

/** Passive apprise en passant exactement au niveau `level` (fenêtre de montée de niveau). */
export function passiveLearnedAt(cls: ClassDef, level: number): PassiveDef | null {
  return cls.passives.find((p) => p.level === level) ?? null;
}

/* ---------- Serment (n°123) ---------- */

export const OATH_KINDS = ['proteger', 'abattre', 'intouchable'] as const;
export type OathKind = (typeof OATH_KINDS)[number];

export const OATH_INFO: Readonly<Record<OathKind, { readonly name: string; readonly rule: string }>> = {
  proteger: { name: 'Protéger', rule: 'aucun allié ne tombe' },
  abattre: { name: 'Abattre', rule: 'le boss tombe ; sans boss, elle abat 3 ennemis' },
  intouchable: { name: 'Intouchable', rule: 'elle n’est jamais touchée' },
};

export interface OathState {
  readonly kind: OathKind;
  broken: boolean;
  /** Ennemis abattus par la Lame pendant ce combat. */
  kills: number;
}

export const LINEAGE = {
  lame: 'lame_du_serment',
  veilleur: 'veilleur_des_falaises',
  alchimiste: 'alchimiste_des_saisons',
  danseur: 'danseur_des_courants',
  heraut: 'heraut_des_bannieres',
} as const;

/** Le serment tient-il encore ? (Le bonus de dégâts ne joue que dans ce cas.) */
export const oathHolds = (unit: BattleUnit): boolean => unit.oath !== null && !unit.oath.broken;

/** Serment rempli à la fin d'une victoire. */
export function oathKept(state: BattleState, unit: BattleUnit, rules: BattleRules): boolean {
  const oath = unit.oath;
  if (!oath || oath.broken || state.outcome !== 'victory') return false;
  if (oath.kind !== 'abattre') return true;
  const bossDown = state.units.some((u) => u.team === 'enemy' && u.isBoss && u.hp <= 0);
  const hasBoss = state.units.some((u) => u.team === 'enemy' && u.isBoss);
  return hasBoss ? bossDown : oath.kills >= rules.data.balance.classMechanics.oath.slayCount;
}

/**
 * Suit les serments après une commande : « Protéger » se brise quand un membre
 * de la compagnie tombe, « Intouchable » quand la Lame est touchée ; les
 * ennemis qu'elle abat sont comptés (« Abattre »). Renvoie les serments brisés.
 */
export function trackOaths(state: BattleState, events: readonly BattleEvent[]): BattleEvent[] {
  const sworn = state.units.filter((u) => u.oath !== null);
  if (sworn.length === 0) return [];
  const out: BattleEvent[] = [];
  const breakOath = (u: BattleUnit): void => {
    if (!u.oath || u.oath.broken) return;
    u.oath.broken = true;
    out.push({ type: 'oath', unitId: u.id, broken: true });
  };
  const find = (id: string): BattleUnit | undefined => state.units.find((u) => u.id === id);
  for (const event of events) {
    if (event.type === 'ko') {
      const fallen = find(event.unitId);
      if (fallen && fallen.team === 'player' && fallen.summonUntil === null) for (const u of sworn) if (u.oath?.kind === 'proteger' && !hostile(u.team, fallen.team)) breakOath(u);
    } else if (event.type === 'combat') {
      for (const s of event.strikes) {
        const target = find(s.targetId);
        const striker = find(s.attackerId);
        if (s.hit && target?.oath?.kind === 'intouchable') breakOath(target);
        if (s.hit && s.targetHp <= 0 && striker?.oath) striker.oath.kills += 1;
      }
    } else if (event.type === 'effects') {
      const source = find(event.sourceId);
      for (const r of event.results) {
        const target = find(r.unitId);
        if ((r.damage ?? 0) > 0 && target?.oath?.kind === 'intouchable' && source && hostile(source.team, target.team)) breakOath(target);
        if ((r.damage ?? 0) > 0 && r.hp <= 0 && source?.oath && target && hostile(source.team, target.team)) source.oath.kills += 1;
      }
    } else if (event.type === 'dot') {
      const target = find(event.unitId);
      if (event.damage > 0 && target?.oath?.kind === 'intouchable') breakOath(target);
    }
  }
  return out;
}

/* ---------- Saisons (n°125) ---------- */

export const SEASONS = ['hiver', 'printemps', 'ete', 'automne'] as const;
export type Season = (typeof SEASONS)[number];
export const SEASON_NAMES: Readonly<Record<Season, string>> = { hiver: 'Hiver', printemps: 'Printemps', ete: 'Été', automne: 'Automne' };

export const seasonOf = (turn: number): Season => SEASONS[(Math.max(1, turn) - 1) % SEASONS.length] as Season;

const isAlchemist = (u: BattleUnit): boolean => u.lineage === LINEAGE.alchimiste;

/** Mobilité en plus à l'automne (posée au début de chaque phase de son camp). */
export function seasonMob(state: BattleState, unit: BattleUnit, rules: BattleRules): number {
  return isAlchemist(unit) && seasonOf(state.turn) === 'automne' ? rules.data.balance.classMechanics.seasons.autumnMob : 0;
}

/** Coût en Résonance d'une compétence (Fiole du Gel moins chère en hiver). */
export function resonanceCost(state: BattleState, unit: BattleUnit, skillOwner: string | null, base: number): number {
  if (isAlchemist(unit) && skillOwner === LINEAGE.alchimiste && seasonOf(state.turn) === 'hiver') return Math.min(base, state.mechanics.seasons.winterGelCost);
  return base;
}

/* ---------- Combat : précision, esquive, défense, dégâts ---------- */

const terrainOf = (map: BattleMap, c: Cell): TerrainDef | null => {
  if (c.x < 0 || c.y < 0 || c.x >= map.width || c.y >= map.height) return null;
  return map.terrains[c.y * map.width + c.x] ?? null;
};
const manhattan = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const alive = (state: BattleState): BattleUnit[] => state.units.filter((u) => u.hp > 0);

/** Précision en plus pour `attacker` qui frappe depuis `from`. */
export function hitBonus(state: BattleState, attacker: BattleUnit, from: Cell, target: BattleUnit, rules: BattleRules): number {
  let bonus = 0;
  if (attacker.passive === 'oeil_de_faucon') bonus += PASSIVE.hawkHit;
  if (attacker.passive === 'instinct_de_chasse' && target.isBoss) bonus += PASSIVE.huntHit;
  if (attacker.lineage === LINEAGE.veilleur && terrainOf(state.map, from)?.tags.includes('hauteur')) bonus += rules.data.balance.classMechanics.height.hit;
  return bonus;
}

export function critBonus(attacker: BattleUnit): number {
  return attacker.passive === 'fil_tranchant' ? PASSIVE.edgeCrit : 0;
}

/** Dégâts ajoutés avant la réduction (Lame d'honneur, Cendre ardente). */
export function damageBonus(attacker: BattleUnit, target: BattleUnit, physical: boolean): number {
  let bonus = 0;
  if (attacker.passive === 'lame_d_honneur' && (target.isBoss || target.level > attacker.level)) bonus += PASSIVE.honorDamage;
  if (attacker.passive === 'cendre_ardente' && !physical && attacker.hp * 2 < attacker.stats.pv) bonus += PASSIVE.emberMag;
  return bonus;
}

/** Multiplicateur des dégâts d'un coup (Serment, Été, Mécanique précise). `skill` : frappe de compétence. */
export function damageMultiplier(state: BattleState, attacker: BattleUnit, target: BattleUnit, skill: boolean, rules: BattleRules): number {
  const m = rules.data.balance.classMechanics;
  let mult = 1;
  if (oathHolds(attacker)) mult *= 1 + m.oath.damageBonus;
  if (isAlchemist(attacker) && seasonOf(state.turn) === 'ete') mult *= m.seasons.summerDamage;
  if (!skill && attacker.passive === 'mecanique_precise' && (target.armor === 'lourde' || target.armor === 'monstre')) mult *= PASSIVE.preciseMult;
  return mult;
}

/** Défense en plus de `target` posée sur `at` (Garde rapprochée : un allié adjacent). */
export function defenseBonus(state: BattleState, target: BattleUnit, at: Cell): number {
  if (target.passive !== 'garde_rapprochee') return 0;
  const near = alive(state).some((u) => u !== target && !hostile(u.team, target.team) && manhattan(u, at) === 1);
  return near ? PASSIVE.guardDef : 0;
}

/** Esquive en plus de `target` posée sur `at` (Étendard, Pas léger, Fil d'eau). */
export function avoidBonus(state: BattleState, target: BattleUnit, at: Cell): number {
  let bonus = 0;
  const terrain = terrainOf(state.map, at);
  const banner = alive(state).some((u) => u !== target && u.passive === 'etendard' && !hostile(u.team, target.team) && manhattan(u, at) <= PASSIVE.bannerRange);
  if (banner) bonus += PASSIVE.bannerAvoid;
  const wet = terrain !== null && (terrain.tags.includes('eau') || terrain.tags.includes('enlise'));
  if (target.passive === 'pas_leger' && wet) bonus += PASSIVE.lightStepAvoid;
  // Fil d'eau : le gué et le marais ne lui retirent pas d'esquive.
  if (target.lineage === LINEAGE.danseur && wet && terrain.avoid < 0) bonus -= terrain.avoid;
  return bonus;
}

/** Résonance en plus d'un coup porté (Fanfare : un Héraut allié à 2 cases ou moins). */
export function fanfareBonus(state: BattleState, striker: BattleUnit, rules: BattleRules): number {
  const f = rules.data.balance.classMechanics.fanfare;
  const near = alive(state).some((u) => u !== striker && u.lineage === LINEAGE.heraut && !hostile(u.team, striker.team) && manhattan(u, striker) <= f.range);
  return near ? f.resonance : 0;
}

/** Résonance gagnée en esquivant (Contre-courant). */
export const dodgeResonance = (unit: BattleUnit): number => (unit.passive === 'contre_courant' ? PASSIVE.undertowResonance : 0);

/* ---------- Statuts ---------- */

/** Tours en plus d'un statut posé par `source` sur `target`. */
export function statusTurnBonus(source: BattleUnit | null, target: BattleUnit, status: string): number {
  if (!source) return 0;
  let bonus = 0;
  if (source.passive === 'braises_vives' && status === 'brulure') bonus += 1;
  if (source.passive === 'hymne' && status === 'appel_aux_armes') bonus += 1;
  if (source.passive === 'prise_ferme' && status === 'harponne') bonus += 1;
  if (source.passive === 'distillation' && hostile(source.team, target.team)) bonus += 1;
  return bonus;
}

/** Statut sans effet sur l'unité du fait de sa passive (Inébranlable : Entravé). */
export const passiveImmune = (unit: BattleUnit, status: string): boolean => unit.passive === 'inebranlable' && status === 'entrave';

/* ---------- Déplacement et portée ---------- */

/** L'unité s'enlise-t-elle dans ce terrain ? (Pas le Danseur.) */
export const bogs = (unit: BattleUnit, terrain: TerrainDef): boolean => terrain.tags.includes('enlise') && unit.lineage !== LINEAGE.danseur;

/** Portée de l'arme depuis une case (Tir couvert : +1 depuis une case « hauteur »). */
export function rangeFrom(map: BattleMap | null, unit: BattleUnit, from: Cell): readonly [number, number] {
  const [min, max] = unit.weapon.range;
  if (map && unit.passive === 'tir_couvert' && terrainOf(map, from)?.tags.includes('hauteur')) return [min, max + 1];
  return unit.weapon.range;
}

/* ---------- Soins ---------- */

/** Soin en plus d'un soin de bâton ou de compétence (Lumière douce). */
export const healBonus = (healer: BattleUnit): number => (healer.passive === 'lumiere_douce' ? PASSIVE.lightHeal : 0);

/** Soin d'un objet utilisé par `user` (Mains sûres, Printemps). */
export function itemHeal(state: BattleState, user: BattleUnit, base: number, rules: BattleRules): number {
  let amount = base + (user.passive === 'mains_sures' ? PASSIVE.handsHeal : 0);
  if (isAlchemist(user) && seasonOf(state.turn) === 'printemps') amount = Math.floor(amount * rules.data.balance.classMechanics.seasons.springHeal);
  return amount;
}
