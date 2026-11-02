/**
 * La compagnie de la partie (jalon M6). Module pur.
 *
 * Tant que la compagnie de départ n'existe pas (étape 2 du jalon), une partie
 * commence avec la compagnie d'essai, au niveau imposé par `?lvl` s'il y en a un.
 */
import type { GameData } from '../../data/validate';
import { createMember, type Member } from '../units/company';
import { testPartyAt } from './foeRules';
import type { Progress } from './progress';

/** Identifiant d'un membre tiré de son nom (« Ilmëa » → « ilmea »). */
export function memberId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Crée la compagnie si la partie n'en a pas encore ; la renvoie. */
export function ensureCompany(data: GameData, progress: Progress, testLevel?: number): Member[] {
  if (progress.company.length === 0) {
    progress.company = testPartyAt(data, testLevel).map((def) => createMember(data, { id: def.hero ? 'heros' : memberId(def.name), name: def.name, class: def.class, level: def.level, hero: def.hero }));
  }
  return progress.company;
}
