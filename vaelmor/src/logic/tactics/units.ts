/**
 * Fabrique des unités de combat (jalon M5) : membres de la compagnie (classe,
 * équipement, accessoire, objets), ennemis (et boss à deux phases), alliés
 * verts (modèles d'allies.json), invocations.
 *
 * Module pur : les définitions viennent des données validées.
 */
import { memberSprite } from '../skinFrames';
import type { AllyTemplateDef } from '../../data/allySchemas';
import type { BossDef, ClassDef, EnemyDef, PartyMemberDef, StatBlock, WeaponDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { evolvedGrowths } from '../progression/evolutions';
import { equippedPassive, LINEAGE, PASSIVE, type OathKind } from '../progression/traits';
import { statsAtLevel } from '../units/stats';
import { refreshStats } from './status';
import type { AllySource, BattleRules, BattleUnit, ItemStack, Team } from './types';

/**
 * Un membre de la compagnie tel que le combat le lit : la fiche de données
 * (compagnie d'essai) ou un membre persistant (`logic/units/company.ts`) qui
 * porte en plus ses stats tirées au sort, son XP et son plafond de niveau.
 */
export type MemberLike = PartyMemberDef & {
  /** Identifiant de personnage (« heros », « nessa »…), pour les scènes de combat (GDD §7.9). */
  readonly id?: string;
  /** Stats propres (sans accessoire) ; absentes : croissance moyenne du niveau (n°52). */
  readonly stats?: StatBlock;
  readonly xp?: number;
  readonly levelCap?: number;
  /** Blessé (GDD §9.13, n°138) : −10 % sur chaque stat (au moins 1 point), −2 Mob. */
  readonly wounded?: boolean;
  /** Passive choisie (n°93) ; absente : la dernière apprise. */
  readonly passive?: string | null;
  /** Serment choisi à la préparation (Lame du Serment, n°123) ; absent : « Protéger ». */
  readonly oath?: OathKind | null;
  /** Lignée (classe de base) d'une unité évoluée ; absente : sa classe. */
  readonly lineage?: string;
  /** Évolution (jalon M6) : la classe reste la classe de base. */
  readonly evolution?: string | null;
};

/** Stats d'un membre blessé (décision n°138). */
export function woundedStats(stats: StatBlock): StatBlock {
  const out: Record<keyof StatBlock, number> = { ...stats };
  for (const key of Object.keys(out) as (keyof StatBlock)[]) {
    if (key === 'mob') out.mob = Math.max(1, out.mob - 2);
    else if (out[key] > 0) out[key] = Math.max(key === 'pv' ? 1 : 0, out[key] - Math.ceil(out[key] / 10));
  }
  return out;
}

/** Équipement choisi à la préparation (GDD §9.3) : arme (du type de la classe), accessoire, objets (5 au plus). */
export interface Loadout {
  weapon: string | null;
  accessory: string | null;
  items: ItemStack[];
}

export const emptyLoadout = (): Loadout => ({ weapon: null, accessory: null, items: [] });

type Fresh = Pick<
  BattleUnit,
  'moved' | 'acted' | 'moveOrigin' | 'resonance' | 'bogPending' | 'bogged' | 'alerted' | 'cooldowns' | 'mods' | 'cantoLeft' | 'moveCap' | 'summonUntil' | 'gains' | 'ownerId' | 'extraMob' | 'tally'
>;

function fresh(): Fresh {
  return { moved: false, acted: false, moveOrigin: null, resonance: 0, bogPending: false, bogged: false, alerted: false, cooldowns: {}, mods: [], cantoLeft: 0, moveCap: null, summonUntil: null, gains: {}, ownerId: null, extraMob: 0, tally: {} };
}

function weaponOf(data: GameData, id: string): WeaponDef {
  const w = data.weapons.find((x) => x.id === id);
  if (!w) throw new Error(`Arme inconnue : « ${id} »`);
  return w;
}

function classOf(data: GameData, id: string): ClassDef {
  const cls = data.classes.find((c) => c.id === id);
  if (!cls) throw new Error(`Classe inconnue : « ${id} »`);
  return cls;
}

function withBonus(stats: StatBlock, bonus: Partial<Record<keyof StatBlock, number>> | undefined): StatBlock {
  if (!bonus) return stats;
  const out: Record<keyof StatBlock, number> = { ...stats };
  for (const [k, v] of Object.entries(bonus) as [keyof StatBlock, number][]) out[k] += v;
  return out;
}

/** Compétence signature d'une classe (skills.json, `owner`). */
export function signatureSkill(data: GameData, classId: string): string | null {
  return data.skills.find((s) => s.owner === classId)?.id ?? null;
}

/** Ressources de classe pour un combat (Pierres 3, Charges 4… ; +1 avec Pierre de plus ou Charge de plus). */
function classResources(cls: ClassDef, passive: string | null = null): Record<string, number> {
  if (cls.resource?.perBattle === undefined) return {};
  const extra = passive === 'pierre_de_plus' || passive === 'charge_de_plus' ? 1 : 0;
  return { [cls.resource.id]: cls.resource.perBattle + extra };
}

/** Fil d'eau du Danseur des Courants (n°126) ; Fil-de-Vent (tout à 1) ; Sentinelle des Abysses (eau profonde). */
function waterThreadOf(data: GameData, lineage: string, evolution: string | null = null): BattleUnit['waterThread'] {
  const w = data.balance.classMechanics.waterThread;
  if (evolution === 'fil_de_vent') return { shallow: 1, deep: 1, flat: true };
  if (evolution === 'sentinelle_des_abysses') return { shallow: null, deep: w.deepCost };
  if (lineage !== LINEAGE.danseur) return null;
  return { shallow: w.shallowCost, deep: w.deepCost };
}

/** Arme portée : celle de l'équipement si elle convient à la classe, sinon l'arme de départ. */
export function weaponFor(data: GameData, cls: ClassDef, wanted: string | null): WeaponDef {
  if (wanted) {
    const w = data.weapons.find((x) => x.id === wanted);
    if (w && w.type === cls.weapon.type && w.damage === cls.weapon.damage) return w;
  }
  return weaponOf(data, cls.startingWeapon);
}

/** Un membre de la compagnie. */
export function memberUnit(data: GameData, rules: BattleRules, member: MemberLike, loadout: Loadout, id: string, memberIndex: number, x: number, y: number, variant = 0): BattleUnit {
  const cls = classOf(data, member.class);
  const accessory = loadout.accessory ? data.accessories.find((a) => a.id === loadout.accessory) ?? null : null;
  const own = member.stats ? { ...member.stats } : statsAtLevel(cls.baseStats, cls.growths, member.level);
  const passive = equippedPassive(cls, member.level, member.passive);
  const lineage = member.lineage ?? cls.id;
  const evo = member.evolution ? (cls.evolutions.find((e) => e.id === member.evolution) ?? null) : null;
  const base = withBonus(member.wounded ? woundedStats(own) : own, { ...(accessory?.bonus ?? {}), ...(passive === 'inebranlable' ? { pv: (accessory?.bonus.pv ?? 0) + PASSIVE.steadyHp } : {}) });
  const levelCap = member.levelCap ?? data.balance.levels.baseClassCap;
  const skill = signatureSkill(data, cls.id);
  const unit: BattleUnit = {
    id,
    charId: member.id ?? null,
    name: member.name,
    team: 'player',
    kindId: cls.id,
    kindName: evo?.name ?? cls.name,
    sprite: member.hero ? 'heros' : memberSprite(cls.id, variant),
    level: member.level,
    lineage,
    passive,
    evolution: evo?.id ?? null,
    oath: lineage === LINEAGE.lame ? { kind: member.oath ?? 'proteger', broken: false, kills: 0 } : null,
    waterThread: waterThreadOf(data, lineage, evo?.id ?? null),
    wounded: member.wounded === true,
    xp: member.level >= levelCap ? 0 : (member.xp ?? 0),
    growths: evolvedGrowths(cls, evo),
    levelCap,
    base,
    stats: base,
    weapon: weaponFor(data, cls, loadout.weapon),
    accessory: accessory?.id ?? null,
    element: cls.element,
    armor: cls.armor,
    isHero: member.hero,
    isBoss: false,
    ai: null,
    hp: base.pv,
    x,
    y,
    skills: skill ? [skill] : [],
    resources: classResources(cls, passive),
    items: loadout.items.filter((s) => s.qty > 0).map((s) => ({ ...s })),
    boss: null,
    allySource: null,
    errantId: null,
    memberIndex,
    ...fresh(),
  };
  refreshStats(unit, rules);
  return unit;
}

/** Un ennemi (et sa fiche de boss s'il en a une). */
export function enemyUnit(data: GameData, rules: BattleRules, placed: { enemy: string; level: number; boss?: boolean; ai?: BattleUnit['ai'] }, id: string, x: number, y: number, team: Team = 'enemy'): BattleUnit {
  const def: EnemyDef | undefined = data.enemies.find((e) => e.id === placed.enemy);
  if (!def) throw new Error(`Ennemi inconnu : « ${placed.enemy} »`);
  const base = statsAtLevel(def.baseStats, def.growths, placed.level);
  const bossDef: BossDef | null = placed.boss === true ? (data.bosses.find((b) => b.enemy === def.id) ?? null) : null;
  const unit: BattleUnit = {
    id,
    charId: def.id,
    name: def.name,
    team,
    kindId: def.id,
    kindName: def.title ?? def.name,
    sprite: def.sprite,
    level: placed.level,
    evolution: null,
    lineage: def.id,
    passive: null,
    oath: null,
    waterThread: null,
    wounded: false,
    xp: null,
    growths: null,
    levelCap: placed.level,
    base,
    stats: base,
    weapon: weaponOf(data, def.weapon),
    accessory: null,
    element: def.element,
    armor: def.armor,
    isHero: false,
    isBoss: placed.boss === true,
    ai: placed.ai ?? def.ai,
    hp: base.pv,
    x,
    y,
    skills: bossDef ? [...bossDef.skills] : [],
    resources: {},
    items: [],
    boss: bossDef ? { def: bossDef, phase: 1 } : null,
    allySource: null,
    errantId: null,
    memberIndex: null,
    ...fresh(),
  };
  refreshStats(unit, rules);
  return unit;
}

/**
 * Un allié vert (GDD §7.8) : toujours mené par l'IA. Seuls les errants gagnent
 * de l'XP (décision n°132) : `xp` est alors leur XP gardée d'un combat à l'autre.
 */
export function allyUnit(data: GameData, rules: BattleRules, template: AllyTemplateDef, level: number, source: AllySource, errantId: string | null, id: string, xp = 0): BattleUnit {
  const cls = classOf(data, template.class);
  const lvl = Math.max(1, level);
  const base = statsAtLevel(cls.baseStats, cls.growths, lvl);
  const levelCap = data.balance.levels.baseClassCap;
  const learns = source === 'errant';
  const unit: BattleUnit = {
    id,
    charId: template.named === true ? template.id : null,
    name: template.name,
    team: 'ally',
    kindId: cls.id,
    kindName: cls.name,
    sprite: template.sprite,
    level: lvl,
    evolution: null,
    lineage: cls.id,
    passive: null,
    oath: null,
    waterThread: waterThreadOf(data, cls.id),
    wounded: false,
    xp: learns ? (lvl >= levelCap ? 0 : xp) : null,
    growths: learns ? cls.growths : null,
    levelCap: learns ? levelCap : lvl,
    base,
    stats: base,
    weapon: weaponOf(data, cls.startingWeapon),
    accessory: null,
    element: cls.element,
    armor: cls.armor,
    isHero: false,
    isBoss: false,
    ai: null,
    hp: base.pv,
    x: -1,
    y: -1,
    skills: [],
    resources: {},
    items: [],
    boss: null,
    allySource: source,
    errantId,
    memberIndex: null,
    ...fresh(),
  };
  refreshStats(unit, rules);
  return unit;
}
