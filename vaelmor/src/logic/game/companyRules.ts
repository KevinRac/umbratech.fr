/**
 * La compagnie de la partie (jalon M6, GDD §5.7). Module pur.
 *
 * - Nouvelle partie : le héros, dans la classe choisie (n°133), et les
 *   compagnons du départ de `company.json`, au même niveau (n°134).
 * - Recrue : elle arrive au plus haut de son niveau fixé et de la moyenne de la
 *   compagnie moins `catchUpGap`, stats à la croissance moyenne (n°135).
 * - Recrues de boss : elles rejoignent d'office après la victoire qui lève
 *   leur drapeau (Rhyel, n°136).
 * - Compagnie d'essai : pour le debug (`?debug&party=test`, n°137).
 */
import type { UnitRef } from '../../data/companySchemas';
import type { GameData } from '../../data/validate';
import { createMember, type Member } from '../units/company';
import { testPartyAt } from './foeRules';
import type { Progress } from './progress';

/** Classe du héros quand la partie n'a pas été lancée par l'écran de choix (debug). */
export const DEFAULT_HERO_CLASS = 'lame_du_serment';

/** Identifiant d'un membre tiré de son nom (« Ilmëa » → « ilmea »). */
export function memberId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Compagnie d'une nouvelle partie : le héros (classe choisie) et les compagnons du départ. */
export function startingCompany(data: GameData, heroClass: string): Member[] {
  const { hero, start } = data.company;
  return [createMember(data, { id: hero.id, name: hero.name, class: heroClass, level: hero.level, hero: true }), ...start.map((u) => createMember(data, { ...u, level: hero.level }))];
}

/** Compagnie d'essai (une unité par classe), au niveau imposé s'il y en a un. */
export function testCompany(data: GameData, level?: number): Member[] {
  return testPartyAt(data, level).map((def) => createMember(data, { id: def.hero ? data.company.hero.id : memberId(def.name), name: def.name, class: def.class, level: def.level, hero: def.hero }));
}

/** Crée la compagnie si la partie n'en a pas encore (partie lancée sans l'écran de choix) ; la renvoie. */
export function ensureCompany(data: GameData, progress: Progress, heroClass: string = DEFAULT_HERO_CLASS): Member[] {
  if (progress.company.length === 0) progress.company = startingCompany(data, heroClass);
  return progress.company;
}

/** Niveau d'arrivée d'une recrue (n°135). */
export function recruitLevel(data: GameData, company: readonly Member[], id: string): number {
  const fixed = data.company.recruitLevels[id] ?? 1;
  const average = company.length > 0 ? company.reduce((n, m) => n + m.level, 0) / company.length : 1;
  return Math.max(fixed, Math.round(average) - data.company.catchUpGap);
}

/**
 * Une recrue rejoint la compagnie (une seule fois). Renvoie le nouveau membre,
 * ou null s'il y était déjà ou s'il est tombé en mode Classique (n°167).
 */
export function joinCompany(data: GameData, progress: Progress, unit: UnitRef): Member | null {
  if (progress.company.some((m) => m.id === unit.id) || progress.fallen.includes(unit.id)) return null;
  const member = createMember(data, { ...unit, level: recruitLevel(data, progress.company, unit.id) });
  progress.company.push(member);
  if (!progress.recruited.includes(unit.id)) progress.recruited.push(unit.id);
  return member;
}

/** Recrues de boss dont le drapeau vient d'être levé (n°136) : elles rejoignent la compagnie. */
export function joinBossRecruits(data: GameData, progress: Progress, flags: readonly string[]): Member[] {
  const joined: Member[] = [];
  for (const r of data.company.bossRecruits) {
    if (!flags.includes(r.flag)) continue;
    const member = joinCompany(data, progress, r.unit);
    if (member) joined.push(member);
  }
  return joined;
}
