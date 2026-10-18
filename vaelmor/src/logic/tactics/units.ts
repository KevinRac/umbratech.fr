/**
 * Fabrique des unités de combat (jalon M5) : membres de la compagnie (classe,
 * équipement, accessoire, objets), ennemis (et boss à deux phases), alliés
 * verts (modèles d'allies.json), invocations.
 *
 * Module pur : les définitions viennent des données validées.
 */
import type { AllyTemplateDef } from '../../data/allySchemas';
import type { BossDef, ClassDef, EnemyDef, PartyMemberDef, StatBlock, WeaponDef } from '../../data/schemas';
import type { GameData } from '../../data/validate';
import { statsAtLevel } from '../units/stats';
import { refreshStats } from './status';
import type { AllySource, BattleRules, BattleUnit, ItemStack, Team } from './types';

/** Équipement choisi à la préparation (GDD §9.3) : arme (du type de la classe), accessoire, objets (5 au plus). */
export interface Loadout {
  weapon: string | null;
  accessory: string | null;
  items: ItemStack[];
}

export const emptyLoadout = (): Loadout => ({ weapon: null, accessory: null, items: [] });

type Fresh = Pick<
  BattleUnit,
  'moved' | 'acted' | 'moveOrigin' | 'resonance' | 'bogPending' | 'bogged' | 'alerted' | 'cooldowns' | 'mods' | 'cantoLeft' | 'moveCap' | 'summonUntil'
>;

function fresh(): Fresh {
  return { moved: false, acted: false, moveOrigin: null, resonance: 0, bogPending: false, bogged: false, alerted: false, cooldowns: {}, mods: [], cantoLeft: 0, moveCap: null, summonUntil: null };
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

/** Ressources de classe pour un combat (Pierres 3, Charges 4…). */
function classResources(cls: ClassDef): Record<string, number> {
  return cls.resource?.perBattle !== undefined ? { [cls.resource.id]: cls.resource.perBattle } : {};
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
export function memberUnit(data: GameData, rules: BattleRules, member: PartyMemberDef, loadout: Loadout, id: string, memberIndex: number, x: number, y: number): BattleUnit {
  const cls = classOf(data, member.class);
  const accessory = loadout.accessory ? data.accessories.find((a) => a.id === loadout.accessory) ?? null : null;
  const base = withBonus(statsAtLevel(cls.baseStats, cls.growths, member.level), accessory?.bonus);
  const skill = signatureSkill(data, cls.id);
  const unit: BattleUnit = {
    id,
    name: member.name,
    team: 'player',
    kindId: cls.id,
    kindName: cls.name,
    sprite: member.hero ? 'heros' : cls.id,
    level: member.level,
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
    resources: classResources(cls),
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
    name: def.name,
    team,
    kindId: def.id,
    kindName: def.title ?? def.name,
    sprite: def.sprite,
    level: placed.level,
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

/** Un allié vert (GDD §7.8) : toujours mené par l'IA. */
export function allyUnit(data: GameData, rules: BattleRules, template: AllyTemplateDef, level: number, source: AllySource, errantId: string | null, id: string): BattleUnit {
  const cls = classOf(data, template.class);
  const base = statsAtLevel(cls.baseStats, cls.growths, Math.max(1, level));
  const unit: BattleUnit = {
    id,
    name: template.name,
    team: 'ally',
    kindId: cls.id,
    kindName: cls.name,
    sprite: template.sprite,
    level: Math.max(1, level),
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
